import {
  AuthenticatedLnd,
  CreateHodlInvoiceResult,
  DecodePaymentRequestResult,
  createHodlInvoice,
  decodePaymentRequest,
} from 'lightning';

import { auto } from 'async';
import subscribeToInvoices from './subscribe_to_invoices';

const dateDiff = (m: string, n: string) =>
  Math.abs((new Date(m).getTime() - new Date(n).getTime()) / 1000);
const defaultFeeRate = 3000;
const defaultBaseFee = 1000;
const defaultPremium = 2000;
const hodlExpiry = (m: string) =>
  new Date(new Date(m).getTime() + 3600 * 1000).toISOString();
const knownFeatures = [8, 9, 14, 15, 16, 17];
const lowCltvDelta = 10;
const maxCltvDelta = 2016;
const minDateDiffSec = 600;
const minTokens = 1;

type Args = {
  maxFeeRate: number;
  lnd: AuthenticatedLnd;
  request: string;
};
type Tasks = {
  validate: undefined;
  decodeInvoice: DecodePaymentRequestResult;
  hodlInvoice: CreateHodlInvoiceResult;
  subscribe: undefined;
};
export default async function ({ lnd, maxFeeRate, request }: Args) {
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

      decodeInvoice: [
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

      hodlInvoice: [
        'decodeInvoice',
        async ({ decodeInvoice }) => {
          const mTokens = Math.round(
            Number(decodeInvoice.mtokens) +
              (Number(decodeInvoice.mtokens) * (maxFeeRate || defaultFeeRate)) /
                1e6 +
              defaultBaseFee +
              defaultPremium,
          );

          return await createHodlInvoice({
            lnd,
            id: decodeInvoice.id,
            mtokens: String(mTokens),
            expires_at: hodlExpiry(decodeInvoice.expires_at),
          });
        },
      ],

      subscribe: [
        'decodeInvoice',
        'hodlInvoice',
        async ({ decodeInvoice }) => {
          const maxFee = Math.round(
            (Number(decodeInvoice.mtokens) * (maxFeeRate || defaultFeeRate)) /
              1e6,
          );

          subscribeToInvoices({
            lnd,
            maxFee,
            request,
            expiry: hodlExpiry(decodeInvoice.expires_at),
            id: decodeInvoice.id,
          });
        },
      ],
    })
  ).hodlInvoice;
}
