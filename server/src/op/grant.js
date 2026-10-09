import {
  isFinalizedGrant,
  isPendingGrant,
} from "@interledger/open-payments";

export async function createQuoteForIncomingPayment(
  client,
  payerWalletUrl,
  incomingPaymentId,
) {
  const sendingWalletAddress = await client.walletAddress.get({
    url: payerWalletUrl,
  });

  const quoteGrant = await client.grant.request(
    { url: sendingWalletAddress.authServer },
    {
      access_token: {
        access: [{ type: "quote", actions: ["create", "read"] }],
      },
    },
  );

  if (!isFinalizedGrant(quoteGrant)) {
    throw new Error("Quote grant was not finalized (interaction required).");
  }

  const quote = await client.quote.create(
    {
      url: sendingWalletAddress.resourceServer,
      accessToken: quoteGrant.access_token.value,
    },
    {
      walletAddress: sendingWalletAddress.id,
      receiver: incomingPaymentId,
      method: "ilp",
    },
  );

  return { sendingWalletAddress, quote };
}

export async function requestInteractiveOutgoingGrant(
  client,
  sendingWalletAddress,
  quote,
  finishRedirectUri,
) {
  const interactNonce = crypto.randomUUID();

  const outgoingPaymentGrant = await client.grant.request(
    { url: sendingWalletAddress.authServer },
    {
      access_token: {
        access: [
          {
            type: "outgoing-payment",
            actions: ["read", "create"],
            limits: { debitAmount: quote.debitAmount },
            identifier: sendingWalletAddress.id,
          },
        ],
      },
      interact: {
        start: ["redirect"],
        finish: {
          method: "redirect",
          uri: finishRedirectUri,
          nonce: interactNonce,
        },
      },
    },
  );

  if (!isPendingGrant(outgoingPaymentGrant) || !outgoingPaymentGrant.interact?.redirect) {
    throw new Error("Expected pending outgoing grant with interact.redirect.");
  }

  return {
    interactRedirect: outgoingPaymentGrant.interact.redirect,
    interactNonce,
    continueUri: outgoingPaymentGrant.continue.uri,
    continueAccessToken: outgoingPaymentGrant.continue.access_token.value,
  };
}
