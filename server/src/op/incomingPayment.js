import { isFinalizedGrant } from "@interledger/open-payments";
import { majorToMinorString } from "../amount.js";

async function createIncomingOnReceiver(client, receiverWalletUrl, amountMajor) {
  const receivingWalletAddress = await client.walletAddress.get({
    url: receiverWalletUrl,
  });

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

  const body = { walletAddress: receivingWalletAddress.id };
  let amountMinor;
  if (amountMajor != null) {
    amountMinor = majorToMinorString(
      amountMajor,
      receivingWalletAddress.assetScale,
    );
    body.incomingAmount = {
      assetCode: receivingWalletAddress.assetCode,
      assetScale: receivingWalletAddress.assetScale,
      value: amountMinor,
    };
  }

  const incomingPayment = await client.incomingPayment.create(
    {
      url: receivingWalletAddress.resourceServer,
      accessToken: incomingPaymentGrant.access_token.value,
    },
    body,
  );

  return { receivingWalletAddress, incomingPayment, amountMinor };
}

export function createIncomingPaymentOnReceiver(
  client,
  receiverWalletUrl,
  amountMajor,
) {
  return createIncomingOnReceiver(client, receiverWalletUrl, amountMajor);
}

export function createOpenIncomingOnReceiver(client, receiverWalletUrl) {
  return createIncomingOnReceiver(client, receiverWalletUrl);
}
