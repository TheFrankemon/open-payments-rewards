import { FormEvent, useMemo, useState } from "react";
import StatusPanel from "./StatusPanel";
import { parseApiError } from "./paymentUi";
import {
  isValidPayForm,
  PayFormValues,
  validatePayForm,
} from "./validation";

type PayPhase = "idle" | "incoming" | "grant" | "redirect";

export default function PayForm() {
  const [amount, setAmount] = useState("");
  const [receiverWalletUrl, setReceiverWalletUrl] = useState("");
  const [touched, setTouched] = useState<
    Partial<Record<keyof PayFormValues, boolean>>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [phase, setPhase] = useState<PayPhase>("idle");
  const [flowError, setFlowError] = useState<ReturnType<
    typeof parseApiError
  > | null>(null);

  const loading = phase !== "idle";

  const values: PayFormValues = useMemo(
    () => ({ amount, receiverWalletUrl }),
    [amount, receiverWalletUrl],
  );

  const errors = useMemo(() => validatePayForm(values), [values]);

  function showError(field: keyof PayFormValues): string | undefined {
    if (!submitAttempted && !touched[field]) return undefined;
    return errors[field];
  }

  function clearFlowError() {
    setFlowError(null);
    setPhase("idle");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitAttempted(true);
    setFlowError(null);

    const nextErrors = validatePayForm(values);
    if (!isValidPayForm(nextErrors)) return;

    try {
      setPhase("incoming");
      const createRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: values.amount.trim(),
          receiverWalletUrl: values.receiverWalletUrl.trim(),
        }),
      });
      const createBody = await createRes.json();
      if (!createRes.ok) {
        setFlowError(
          parseApiError(createBody, "Could not create incoming payment."),
        );
        setPhase("idle");
        return;
      }

      setPhase("grant");
      const grantRes = await fetch(
        `/api/payments/${createBody.sessionId}/outgoing-grant`,
        { method: "POST" },
      );
      const grantBody = await grantRes.json();
      if (!grantRes.ok) {
        setFlowError(
          parseApiError(grantBody, "Could not start wallet approval."),
        );
        setPhase("idle");
        return;
      }

      setPhase("redirect");
      window.location.assign(grantBody.interactRedirect);
    } catch {
      setFlowError({
        title: "Cannot reach API",
        message: "Run npm run dev from the repo root (web + server).",
        hint: "Both Vite and Express must be running for Pay to work.",
      });
      setPhase("idle");
    }
  }

  const loadingCopy =
    phase === "incoming"
      ? {
          title: "Step 1 of 2",
          message: "Creating incoming payment on the receiver wallet…",
        }
      : phase === "grant"
        ? {
            title: "Step 2 of 2",
            message: "Quoting SGD debit and preparing wallet approval…",
          }
        : {
            title: "Redirecting",
            message: "Opening your wallet to approve the grant…",
          };

  return (
    <div className="pay-layout">
      <header className="pay-header">
        <h1>Pay with Open Payments</h1>
        <p className="lede">
          Send SGD to any receiver wallet address. You will approve the outgoing
          payment in this app&apos;s test wallet.
        </p>
      </header>

      <form className="pay-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Amount</span>
          <div className="amount-input-wrap">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
              aria-invalid={Boolean(showError("amount"))}
              aria-describedby={
                showError("amount") ? "amount-error" : undefined
              }
              disabled={loading}
            />
            <span className="amount-suffix" aria-hidden="true">
              SGD
            </span>
          </div>
          {showError("amount") ? (
            <p id="amount-error" className="field-error" role="alert">
              {showError("amount")}
            </p>
          ) : null}
        </label>

        <label className="field">
          <span>Receiver wallet URL</span>
          <input
            type="url"
            autoComplete="off"
            placeholder="https://wallet.interledger-test.dev/merchant"
            value={receiverWalletUrl}
            onChange={(e) => setReceiverWalletUrl(e.target.value)}
            onBlur={() =>
              setTouched((t) => ({ ...t, receiverWalletUrl: true }))
            }
            aria-invalid={Boolean(showError("receiverWalletUrl"))}
            aria-describedby={
              showError("receiverWalletUrl") ? "receiver-error" : undefined
            }
            disabled={loading}
          />
          {showError("receiverWalletUrl") ? (
            <p id="receiver-error" className="field-error" role="alert">
              {showError("receiverWalletUrl")}
            </p>
          ) : null}
        </label>

        <button type="submit" className="pay-button" disabled={loading}>
          {loading ? "Processing…" : "Pay"}
        </button>
      </form>

      {loading ? (
        <StatusPanel variant="loading" {...loadingCopy} />
      ) : null}

      {flowError ? (
        <StatusPanel
          variant="error"
          {...flowError}
          onRetry={clearFlowError}
        />
      ) : null}
    </div>
  );
}
