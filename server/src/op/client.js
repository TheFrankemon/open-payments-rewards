import { createAuthenticatedClient } from "@interledger/open-payments";
import { getConfig } from "../config.js";

let clientPromise;

export function getOpenPaymentsClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { openPayments } = getConfig();
      return createAuthenticatedClient({
        walletAddressUrl: openPayments.walletAddressUrl,
        keyId: openPayments.keyId,
        privateKey: openPayments.privateKeyPath,
        // Testnet resource servers may omit fields the OpenAPI schema requires.
        validateResponses: false,
      });
    })();
  }
  return clientPromise;
}
