import { parseApiError } from "./paymentUi";

export type PayPhase = "idle" | "incoming" | "grant" | "redirect";

export async function runCheckoutPayment(
  amountMajor: string,
  onPhase?: (phase: PayPhase) => void,
  receiverWalletUrl?: string,
): Promise<{ phase: PayPhase; error?: ReturnType<typeof parseApiError> }> {
  const body: Record<string, string> = { amount: amountMajor };
  if (receiverWalletUrl?.trim()) {
    body.receiverWalletUrl = receiverWalletUrl.trim();
  }

  onPhase?.("incoming");
  const createRes = await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const createBody = await createRes.json();
  if (!createRes.ok) {
    return {
      phase: "idle",
      error: parseApiError(createBody, "Could not create incoming payment."),
    };
  }

  onPhase?.("grant");
  const grantRes = await fetch(
    `/api/payments/${createBody.sessionId}/outgoing-grant`,
    { method: "POST" },
  );
  const grantBody = await grantRes.json();
  if (!grantRes.ok) {
    return {
      phase: "idle",
      error: parseApiError(grantBody, "Could not start wallet approval."),
    };
  }

  onPhase?.("redirect");
  window.location.assign(grantBody.interactRedirect);
  return { phase: "redirect" };
}

export function loadingCopyForPhase(phase: PayPhase) {
  if (phase === "incoming") {
    return {
      title: "Step 1 of 2",
      message: "Creating incoming payment on the store wallet…",
    };
  }
  if (phase === "grant") {
    return {
      title: "Step 2 of 2",
      message: "Quoting SGD debit and preparing wallet approval…",
    };
  }
  return {
    title: "Redirecting",
    message: "Opening your wallet to approve the grant…",
  };
}
