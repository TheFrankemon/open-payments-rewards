import { Router } from "express";
import { OpenPaymentsClientError } from "@interledger/open-payments";
import { ValidationError } from "../amount.js";
import { getOpenPaymentsReadiness } from "../config.js";
import { getOpenPaymentsClient } from "../op/client.js";
import { createIncomingPaymentOnReceiver } from "../op/incomingPayment.js";
import { createPaymentSession } from "../sessions.js";
import { validatePaymentBody } from "../validatePaymentBody.js";

export const paymentsRouter = Router();

paymentsRouter.post("/", async (req, res) => {
  const readiness = getOpenPaymentsReadiness();
  if (!readiness.ready) {
    return res.status(503).json({
      error: "open_payments_not_configured",
      message:
        "Open Payments credentials missing. Configure .env before creating payments.",
      halt: true,
    });
  }

  try {
    const { amount, receiverWalletUrl } = validatePaymentBody(req.body);
    const client = await getOpenPaymentsClient();

    const { receivingWalletAddress, incomingPayment, amountMinor } =
      await createIncomingPaymentOnReceiver(client, receiverWalletUrl, amount);

    const session = createPaymentSession({
      amountMajor: amount,
      amountMinor,
      receiverWalletUrl,
      assetCode: receivingWalletAddress.assetCode,
      assetScale: receivingWalletAddress.assetScale,
      incomingPaymentId: incomingPayment.id,
      incomingPaymentUrl: incomingPayment.id,
    });

    return res.status(201).json({
      sessionId: session.id,
      status: session.status,
      amount: {
        major: session.amountMajor,
        minor: session.amountMinor,
        assetCode: session.assetCode,
        assetScale: session.assetScale,
      },
      receiverWalletUrl: session.receiverWalletUrl,
      incomingPaymentId: session.incomingPaymentId,
    });
  } catch (err) {
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
        code: err.code,
        httpStatus: err.status,
      });
    }
    console.error(err);
    return res.status(500).json({
      error: "internal_error",
      message: "Unexpected server error.",
    });
  }
});
