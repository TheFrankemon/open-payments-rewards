import { createAuthenticatedClient } from "@interledger/open-payments";
import { getConfig } from "../config.js";

let rewardsClientPromise;

export function getRewardsOpenPaymentsClient() {
  if (!rewardsClientPromise) {
    rewardsClientPromise = (async () => {
      const { rewards } = getConfig();
      return createAuthenticatedClient({
        walletAddressUrl: rewards.walletAddressUrl,
        keyId: rewards.keyId,
        privateKey: rewards.privateKeyPath,
        validateResponses: false,
      });
    })();
  }
  return rewardsClientPromise;
}
