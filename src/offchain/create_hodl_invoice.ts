import {
  AuthenticatedLnd,
  CreateHodlInvoiceResult,
  DecodePaymentRequestResult,
  GetFeeRatesResult,
  GetHeightResult,
  ProbeForRouteResult,
  createHodlInvoice,
  decodePaymentRequest,
  getFeeRates,
  getHeight,
  getInvoice,
  probeForRoute,
} from 'lightning';

import { auto } from 'async';
import subscribeToInvoices from './subscribe_to_invoices';

const dateDiff = (m: string, n: string) =>
  Math.abs((new Date(m).getTime() - new Date(n).getTime()) / 1000);
const defaultBaseFee = 1000;
const defaultFeeRate = 2500;
const defaultCltvDelta = 80;
const defaultPremium = 2000;
const defaultProbeTimeoutMs = 1000 * 60 * 5;
const hodlExpiry = (m: string) =>
  new Date(new Date(m).getTime() + 3600 * 1000).toISOString();
const knownFeatures = [8, 9, 14, 15, 16, 17];
const lowCltvDelta = 10;
const maxCltvDelta = 2016;
const minDateDiffSec = 600;
const minTokens = 1;
const rateDivisor = BigInt(1e6);

type Args = {
  lnd: AuthenticatedLnd;
  request: string;
};
type Tasks = {
  validate: undefined;
  getFees: GetFeeRatesResult;
  details: DecodePaymentRequestResult;
  getExisting: undefined;
  probe: ProbeForRouteResult;
  getHeight: GetHeightResult;
  fee: {
    mtokens: string;
  };
  hodlInvoice: CreateHodlInvoiceResult;
  subscribe: undefined;
};
export default async function ({ lnd, request }: Args) {
  return (
    await auto<Tasks>({
      validate: (cbk: any) => {
        if (!lnd) {
          return cbk([400, 'ExpectedAuthenticatedLndToCreateHodlInvoice']);
        }

        if (!request) {
          return cbk([400, 'ExpectedBolt11PaymentRequestToCreateHodlInvoice']);
        }

        return cbk();
      },

      // Get the fee rates to find the fee for the relay
      getFees: ['validate', ({}, cbk: any) => getFeeRates({ lnd }, cbk)],

      details: [
        'validate',
        async () => {
          const result = await decodePaymentRequest({ lnd, request });

          if (!result.cltv_delta) {
            throw new Error('ExpectedCltvDeltaInThePaymentRequest');
          }

          if (result.cltv_delta < lowCltvDelta) {
            throw new Error('ExpectedHigherCltvDeltaInThePaymentRequest');
          }

          if (result.expires_at < new Date().toISOString()) {
            throw new Error('ExpectedUnexpiredPaymentRequest');
          }

          if (
            dateDiff(result.expires_at, new Date().toISOString()) <
            minDateDiffSec
          ) {
            throw new Error('PaymentRequestExpiresSoon');
          }

          if (result.tokens < minTokens) {
            throw new Error('ZeroAmountPaymentRequestAreNotAccepted');
          }

          if (!result.features.length) {
            throw new Error('ExpectedFeatureBitsInPaymentRequest');
          }

          if (result.cltv_delta > maxCltvDelta) {
            throw new Error('ExpectedLowerCltvDeltaInPaymentReqest');
          }

          result.features.forEach((n) => {
            if (!knownFeatures.includes(n.bit) || !n.is_known) {
              throw new Error(`UnExpectedFeatureBitInPaymentRequest ${n.type}`);
            }
          });

          return result;
        },
      ],

      // Get the invoice to make sure it doesn't exist
      getExisting: [
        'details',
        'validate',
        ({ details }, cbk: any) => {
          return getInvoice({ lnd, id: details.id }, (err) => {
            if (!err) {
              return cbk([409, 'InvoiceWithPaymentHashAlreadyExists']);
            }

            return cbk();
          });
        },
      ],

      // Probe to confirm a path to the destination
      probe: [
        'details',
        'getExisting',
        ({ details }, cbk: any) => {
          return probeForRoute(
            {
              lnd,
              cltv_delta: details.cltv_delta,
              destination: details.destination,
              features: details.features,
              mtokens: details.mtokens,
              payment: details.payment,
              probe_timeout_ms: defaultProbeTimeoutMs,
              routes: details.routes.map((n) =>
                n.map((n) => {
                  return {
                    base_fee_mtokens: Number(n.base_fee_mtokens),
                    channel: n.channel,
                    cltv_delta: n.cltv_delta,
                    fee_rate: n.fee_rate,
                    public_key: n.public_key,
                  };
                }),
              ),
              total_mtokens: details.mtokens,
              tokens: details.tokens,
            },
            cbk,
          );
        },
      ],

      // Get the current height
      getHeight: ['probe', ({}, cbk: any) => getHeight({ lnd }, cbk)],

      // Calculate the fee to charge for the relay
      fee: [
        'getFees',
        'probe',
        ({ getFees, probe }, cbk: any) => {
          const { route } = probe;

          if (!route) {
            return cbk([503, 'FailedToFindRouteToPayRequest']);
          }

          const [{ channel }] = route.hops;

          // The fee policy for the relay will be the fee rate for the channel
          const policyForChannel: any = getFees.channels.find(
            (n) => n.id === channel,
          );

          const baseFeeMtokens = BigInt(
            !!policyForChannel
              ? policyForChannel.base_fee_mtokens
              : defaultBaseFee,
          );

          const feeRate = BigInt(
            !!policyForChannel
              ? policyForChannel.base_fee_mtokens
              : defaultFeeRate,
          );

          const forwardMtokens = BigInt(probe.route.mtokens);

          const fee = baseFeeMtokens + (forwardMtokens * feeRate) / rateDivisor;

          return cbk(null, { mtokens: fee.toString() });
        },
      ],

      hodlInvoice: [
        'details',
        'fee',
        'getHeight',
        'getExisting',
        'probe',
        async ({ details, fee, getHeight, probe }) => {
          const cltvDelta =
            probe.route.timeout - getHeight.current_block_height;

          const amounts = [details.mtokens, fee.mtokens].map((n) => BigInt(n));

          const mtokens =
            amounts.reduce((sum, n) => sum + n, BigInt(Number())) +
            BigInt(defaultPremium);

          return await createHodlInvoice({
            lnd,
            cltv_delta: cltvDelta + defaultCltvDelta,
            description: details.description,
            description_hash: details.description_hash,
            id: details.id,
            mtokens: String(mtokens),
            expires_at: hodlExpiry(details.expires_at),
          });
        },
      ],

      subscribe: [
        'details',
        'fee',
        'hodlInvoice',
        async ({ details, fee }) => {
          subscribeToInvoices({
            lnd,
            maxFee: Number(fee.mtokens),
            request,
            expiry: hodlExpiry(details.expires_at),
            id: details.id,
          });
        },
      ],
    })
  ).hodlInvoice;
}
