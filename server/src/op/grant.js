import {
  isFinalizedGrant,
  isPendingGrant,
} from "@interledger/open-payments";

export async function createQuoteForIncomingPayment(
  client,
  payerWalletUrl,
  incomingPaymentId,
  debitAmount,
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

  const quoteBody = {
    walletAddress: sendingWalletAddress.id,
    receiver: incomingPaymentId,
    method: "ilp",
  };
  if (debitAmount) quoteBody.debitAmount = debitAmount;

  const quote = await client.quote.create(
    {
      url: sendingWalletAddress.resourceServer,
      accessToken: quoteGrant.access_token.value,
    },
    quoteBody,
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

export async function finalizeOutgoingPayment(
  client,
  { walletUrl, grantContinueUri, grantContinueAccessToken, quoteId },
  interactRef,
  notFinalizedMessage = "Outgoing grant was not finalized. Approve the grant in your wallet first.",
) {
  if (!interactRef) {
    throw new Error("Missing interact_ref from wallet redirect.");
  }

  const finalizedGrant = await client.grant.continue(
    {
      url: grantContinueUri,
      accessToken: grantContinueAccessToken,
    },
    { interact_ref: interactRef },
  );

  if (!isFinalizedGrant(finalizedGrant)) {
    const err = new Error(notFinalizedMessage);
    err.name = "GrantNotFinalizedError";
    throw err;
  }

  const wallet = await client.walletAddress.get({ url: walletUrl });

  return client.outgoingPayment.create(
    {
      url: wallet.resourceServer,
      accessToken: finalizedGrant.access_token.value,
    },
    {
      walletAddress: wallet.id,
      quoteId,
    },
  );
}

export async function completeOutgoingPayment(client, session, interactRef) {
  return finalizeOutgoingPayment(
    client,
    {
      walletUrl: session.payerWalletUrl,
      grantContinueUri: session.grantContinueUri,
      grantContinueAccessToken: session.grantContinueAccessToken,
      quoteId: session.quoteId,
    },
    interactRef,
  );
}
