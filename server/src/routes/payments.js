import { Router } from "express";
import { OpenPaymentsClientError } from "@interledger/open-payments";
import { ValidationError } from "../amount.js";
import { getConfig, getOpenPaymentsReadiness } from "../config.js";
import {
  completeOutgoingPayment,
  createQuoteForIncomingPayment,
  requestInteractiveOutgoingGrant,
} from "../op/grant.js";
import { getOpenPaymentsClient } from "../op/client.js";
import { createIncomingPaymentOnReceiver } from "../op/incomingPayment.js";
import {
  createPaymentSession,
  getPaymentSession,
  updatePaymentSession,
} from "../sessions.js";
import { validatePaymentBody } from "../validatePaymentBody.js";

export const paymentsRouter = Router();

function sendPaymentError(res, err) {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: "validation_error",
      message: err.message,
      fields: err.fields,
    });
  }
  if (err instanceof OpenPaymentsClientError) {
    console.error("Open Payments error:", err.description || err.message);
    return res.status(502).json({
      error: "open_payments_error",
      message: err.description || err.message,
    });
  }
  console.error(err);
  return res.status(500).json({
    error: "internal_error",
    message: "Unexpected server error.",
  });
}

paymentsRouter.post("/", async (req, res) => {
  if (!getOpenPaymentsReadiness().ready) {
    return res.status(503).json({
      error: "open_payments_not_configured",
      message: "Configure Open Payments in .env before creating payments.",
    });
  }

  try {
    const { amount, receiverWalletUrl, payerWalletUrl } =
      validatePaymentBody(req.body);
    const client = await getOpenPaymentsClient();

    const { receivingWalletAddress, incomingPayment, amountMinor } =
      await createIncomingPaymentOnReceiver(client, receiverWalletUrl, amount);

    const session = createPaymentSession({
      amountMajor: amount,
      amountMinor,
      receiverWalletUrl,
      payerWalletUrl,
      assetCode: receivingWalletAddress.assetCode,
      assetScale: receivingWalletAddress.assetScale,
      incomingPaymentId: incomingPayment.id,
    });

    return res.status(201).json({
      sessionId: session.id,
      status: session.status,
      incomingPaymentId: session.incomingPaymentId,
    });
  } catch (err) {
    return sendPaymentError(res, err);
  }
});

paymentsRouter.post("/:sessionId/outgoing-grant", async (req, res) => {
  if (!getOpenPaymentsReadiness().ready) {
    return res.status(503).json({
      error: "open_payments_not_configured",
      message: "Configure Open Payments in .env before creating payments.",
    });
  }

  try {
    const session = getPaymentSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({
        error: "session_not_found",
        message: "Payment session not found or expired.",
      });
    }
    if (session.status !== "incoming_created") {
      return res.status(409).json({
        error: "invalid_session_state",
        message: `Session status is "${session.status}", expected "incoming_created".`,
      });
    }

    const client = await getOpenPaymentsClient();
    const { sendingWalletAddress, quote } =
      await createQuoteForIncomingPayment(
        client,
        session.payerWalletUrl,
        session.incomingPaymentId,
      );

    const { webPublicUrl } = getConfig();
    const grant = await requestInteractiveOutgoingGrant(
      client,
      sendingWalletAddress,
      quote,
      `${webPublicUrl}/pay/callback?sessionId=${session.id}`,
    );

    updatePaymentSession(session.id, {
      status: "pending_grant",
      quoteId: quote.id,
      debitAmount: quote.debitAmount,
      grantContinueUri: grant.continueUri,
      grantContinueAccessToken: grant.continueAccessToken,
      interactNonce: grant.interactNonce,
      interactRedirect: grant.interactRedirect,
    });

    return res.json({
      sessionId: session.id,
      interactRedirect: grant.interactRedirect,
    });
  } catch (err) {
    return sendPaymentError(res, err);
  }
});

paymentsRouter.post("/:sessionId/complete", async (req, res) => {
  if (!getOpenPaymentsReadiness().ready) {
    return res.status(503).json({
      error: "open_payments_not_configured",
      message: "Configure Open Payments in .env before creating payments.",
    });
  }

  try {
    const session = getPaymentSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({
        error: "session_not_found",
        message: "Payment session not found or expired.",
      });
    }
    if (session.status !== "pending_grant") {
      return res.status(409).json({
        error: "invalid_session_state",
        message: `Session status is "${session.status}", expected "pending_grant".`,
      });
    }

    const interactRef =
      typeof req.body?.interactRef === "string"
        ? req.body.interactRef
        : typeof req.query?.interact_ref === "string"
          ? req.query.interact_ref
          : "";

    const client = await getOpenPaymentsClient();
    const outgoingPayment = await completeOutgoingPayment(
      client,
      session,
      interactRef,
    );

    updatePaymentSession(session.id, {
      status: "paid",
      outgoingPaymentId: outgoingPayment.id,
    });

    return res.json({
      status: "paid",
      sessionId: session.id,
      outgoingPaymentId: outgoingPayment.id,
      amount: {
        major: session.amountMajor,
        minor: session.amountMinor,
        assetCode: session.assetCode,
        assetScale: session.assetScale,
      },
      receiverWalletUrl: session.receiverWalletUrl,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "GrantNotFinalizedError") {
      return res.status(409).json({
        error: "grant_not_finalized",
        message: err.message,
      });
    }
    if (err instanceof Error && err.message.includes("interact_ref")) {
      return res.status(400).json({
        error: "missing_interact_ref",
        message: err.message,
      });
    }
    return sendPaymentError(res, err);
  }
});
