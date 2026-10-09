import { ValidationError } from "./amount.js";

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
  } else {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      fields.amount = "Amount must be a number greater than zero.";
    }
  }

  const receiverWalletUrl =
    typeof body?.receiverWalletUrl === "string"
      ? body.receiverWalletUrl.trim()
      : "";

  if (!receiverWalletUrl) {
    fields.receiverWalletUrl = "Enter a receiver wallet URL.";
  } else {
    let parsed;
    try {
      parsed = new URL(receiverWalletUrl);
      if (parsed.protocol !== "https:") {
        fields.receiverWalletUrl =
          "Wallet URL must start with https:// (not $).";
      } else if (parsed.pathname.endsWith("/")) {
        fields.receiverWalletUrl = "Remove the trailing slash from the URL.";
      }
    } catch {
      fields.receiverWalletUrl = "Use a valid URL (https://…).";
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError("Invalid payment request.", fields);
  }

  return { amount, receiverWalletUrl };
}
