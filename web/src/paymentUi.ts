export type ApiErrorPayload = {
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

export type UserFacingError = {
  title: string;
  message: string;
  hint?: string;
};

export function parseApiError(
  body: unknown,
  fallbackMessage: string,
): UserFacingError {
  const payload = (body ?? {}) as ApiErrorPayload;
  const message = payload.message ?? fallbackMessage;
  const code = payload.error;

  switch (code) {
    case "grant_not_finalized":
      return {
        title: "Wallet approval required",
        message,
        hint: "Open the wallet link from Pay, approve the outgoing grant, then return here. If the link expired, start a new payment.",
      };
    case "missing_interact_ref":
      return {
        title: "Incomplete wallet return",
        message,
        hint: "Finish approval in your test wallet so the redirect includes interact_ref.",
      };
    case "open_payments_error":
      return {
        title: "Open Payments error",
        message,
        hint: "Check OP_WALLET_ADDRESS_URL, keyId, and private.key. On testnet, ensure the payer wallet has SGD balance.",
      };
    case "open_payments_not_configured":
      return {
        title: "Server not configured",
        message,
        hint: "Copy .env.example to .env and add your test wallet credentials.",
      };
    case "catalog_not_configured":
      return {
        title: "Catalog missing",
        message,
        hint: "Add catalog.json at the repo root with a products array.",
      };
    case "catalog_invalid":
      return {
        title: "Invalid catalog",
        message,
        hint: "Fix catalog.json at the repo root (currency + products).",
      };
    case "store_not_configured":
      return {
        title: "Store not configured",
        message,
        hint: "Set OP_STORE_RECEIVER_WALLET_URL in .env to your merchant receiving wallet.",
      };
    case "session_not_found":
    case "invalid_session_state":
      return {
        title: "Session expired",
        message,
        hint: "In-memory sessions reset when the API restarts. Submit Pay again.",
      };
    case "validation_error":
      return {
        title: "Invalid input",
        message,
      };
    default:
      return {
        title: "Payment failed",
        message,
      };
  }
}
