import {
  isFinalizedGrant,
  isPendingGrant,
  OpenPaymentsClientError,
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

function outgoingPaymentGrantAccess(sendingWalletAddress, quote) {
  return {
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
  };
}

function outgoingGrantNeedsInteraction(err) {
  if (!(err instanceof OpenPaymentsClientError)) return false;
  const text = `${err.description ?? ""} ${err.message ?? ""}`.toLowerCase();
  return text.includes("interact");
}

/** Non-interactive grant when the auth server auto-approves (R4). Returns null if interaction is required. */
export async function requestNonInteractiveOutgoingGrant(
  client,
  sendingWalletAddress,
  quote,
) {
  let outgoingPaymentGrant;
  try {
    outgoingPaymentGrant = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      outgoingPaymentGrantAccess(sendingWalletAddress, quote),
    );
  } catch (err) {
    if (outgoingGrantNeedsInteraction(err)) return null;
    throw err;
  }

  if (!isFinalizedGrant(outgoingPaymentGrant)) {
    return null;
  }

  return outgoingPaymentGrant.access_token.value;
}

export async function createOutgoingPaymentFromGrant(
  client,
  sendingWalletAddress,
  quoteId,
  accessToken,
) {
  return client.outgoingPayment.create(
    {
      url: sendingWalletAddress.resourceServer,
      accessToken,
    },
    {
      walletAddress: sendingWalletAddress.id,
      quoteId,
    },
  );
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
      ...outgoingPaymentGrantAccess(sendingWalletAddress, quote),
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

/** One-time interactive grant with interval + debit cap (reuse token for many cashbacks). */
export async function requestStandingInteractiveOutgoingGrant(
  client,
  sendingWalletAddress,
  limits,
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
            limits,
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
    throw new Error("Expected pending standing grant with interact.redirect.");
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
