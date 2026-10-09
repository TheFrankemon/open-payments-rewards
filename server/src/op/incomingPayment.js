import { isFinalizedGrant } from "@interledger/open-payments";
import { majorToMinorString } from "../amount.js";

export async function createIncomingPaymentOnReceiver(
  client,
  receiverWalletUrl,
  amountMajor,
) {
  const receivingWalletAddress = await client.walletAddress.get({
    url: receiverWalletUrl,
  });
  const incomingAmountValue = majorToMinorString(
    amountMajor,
    receivingWalletAddress.assetScale,
  );

  const incomingPaymentGrant = await client.grant.request(
    { url: receivingWalletAddress.authServer },
    {
      access_token: {
        access: [
          {
            type: "incoming-payment",
            actions: ["read", "complete", "create"],
          },
        ],
      },
    },
  );

  if (!isFinalizedGrant(incomingPaymentGrant)) {
    throw new Error(
      "Incoming payment grant was not finalized (interaction required).",
    );
  }

  const incomingPayment = await client.incomingPayment.create(
    {
      url: receivingWalletAddress.resourceServer,
      accessToken: incomingPaymentGrant.access_token.value,
    },
    {
      walletAddress: receivingWalletAddress.id,
      incomingAmount: {
        assetCode: receivingWalletAddress.assetCode,
        assetScale: receivingWalletAddress.assetScale,
        value: incomingAmountValue,
      },
    },
  );

  return { receivingWalletAddress, incomingPayment, amountMinor: incomingAmountValue };
}
