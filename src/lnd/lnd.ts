import { AuthenticatedLnd, authenticatedLndGrpc } from 'lightning';

import { auto } from 'async';
import { readFileSync } from 'fs';

type Tasks = {
  validate: undefined;
  getCert: {
    cert: string;
  };
  getMacaroon: {
    macaroon: string;
  };
  authenticatedLnd: {
    lnd: AuthenticatedLnd;
  };
};
export default async function authenticatedLnd({}) {
  return (
    await auto<Tasks>({
      validate: (cbk: any) => {
        if (!process.env.BASE64_CERT && !process.env.CERT_PATH) {
          return cbk([400, 'ExpectedTlsCertToGetAuthenticatedLnd']);
        }

        if (!process.env.BASE64_MACAROON && !process.env.MACAROON_PATH) {
          return cbk([400, 'ExpectedMacaroonToGetAuthenticatedLnd']);
        }

        if (!process.env.SOCKET) {
          return cbk([400, 'ExpectedSocketToGetAuthenticatedLnd']);
        }

        return cbk();
      },

      getCert: [
        'validate',
        async () => {
          if (!!process.env.BASE64_CERT) {
            return { cert: process.env.BASE64_CERT };
          }

          const cert = readFileSync(process.env.CERT_PATH, {
            encoding: 'base64',
          });

          return { cert };
        },
      ],

      getMacaroon: [
        'validate',
        async () => {
          if (!!process.env.BASE64_MACAROON) {
            return { macaroon: process.env.BASE64_MACAROON };
          }

          const macaroon = readFileSync(process.env.MACAROON_PATH, {
            encoding: 'base64',
          });

          return { macaroon };
        },
      ],

      authenticatedLnd: [
        'getCert',
        'getMacaroon',
        'validate',
        async ({ getCert, getMacaroon }) => {
          const { lnd } = authenticatedLndGrpc({
            cert: getCert.cert,
            macaroon: getMacaroon.macaroon,
            socket: process.env.SOCKET,
          });

          return { lnd };
        },
      ],
    })
  ).authenticatedLnd;
}
