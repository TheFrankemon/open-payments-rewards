import { ValidationError } from "./amount.js";
import { getConfig } from "./config.js";

function walletUrlError(url, label) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return `${label} is required.`;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return "Wallet URL must start with https:// (not $).";
    }
  } catch {
    return "Use a valid URL (https://…).";
  }
  return null;
}

export function validatePaymentBody(body) {
  const fields = {};
  const amount =
    typeof body?.amount === "number"
      ? String(body.amount)
      : typeof body?.amount === "string"
        ? body.amount.trim()
        : "";

  if (!amount) {
    fields.amount = "Enter an amount.";
  } else if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    fields.amount = "Amount must be a number greater than zero.";
  }

  const receiverFromBody =
    typeof body?.receiverWalletUrl === "string"
      ? body.receiverWalletUrl.trim().replace(/\/$/, "")
      : "";
  const receiverWalletUrl =
    receiverFromBody || getConfig().openPayments.storeReceiverWalletUrl;
  const receiverError = walletUrlError(receiverWalletUrl, "Receiver wallet URL");
  if (receiverError) {
    if (receiverFromBody) {
      fields.receiverWalletUrl = receiverError;
    } else {
      throw new ValidationError(
        "Store receiver wallet is not configured. Set OP_STORE_RECEIVER_WALLET_URL in .env.",
      );
    }
  }

  const payerWalletUrl = getConfig().openPayments.walletAddressUrl;
  if (walletUrlError(payerWalletUrl, "Payer wallet URL")) {
    throw new ValidationError(
      "Server payer wallet is not configured. Set OP_WALLET_ADDRESS_URL in .env.",
    );
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError("Invalid payment request.", fields);
  }

  return { amount, receiverWalletUrl, payerWalletUrl };
}
