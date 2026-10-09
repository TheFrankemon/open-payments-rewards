import { FormEvent, useMemo, useState } from "react";
import {
  isValidPayForm,
  PayFormValues,
  validatePayForm,
} from "./validation";

export default function PayForm() {
  const [amount, setAmount] = useState("");
  const [receiverWalletUrl, setReceiverWalletUrl] = useState("");
  const [touched, setTouched] = useState<
    Partial<Record<keyof PayFormValues, boolean>>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const values: PayFormValues = useMemo(
    () => ({ amount, receiverWalletUrl }),
    [amount, receiverWalletUrl],
  );

  const errors = useMemo(() => validatePayForm(values), [values]);

  function showError(field: keyof PayFormValues): string | undefined {
    if (!submitAttempted && !touched[field]) return undefined;
    return errors[field];
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitAttempted(true);
    setApiError(null);

    const nextErrors = validatePayForm(values);
    if (!isValidPayForm(nextErrors)) return;

    setLoading(true);
    try {
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
        setApiError(createBody.message ?? "Could not create incoming payment.");
        return;
      }

      const grantRes = await fetch(
        `/api/payments/${createBody.sessionId}/outgoing-grant`,
        { method: "POST" },
      );
      const grantBody = await grantRes.json();
      if (!grantRes.ok) {
        setApiError(grantBody.message ?? "Could not start wallet approval.");
        return;
      }

      window.location.assign(grantBody.interactRedirect);
    } catch {
      setApiError(
        "Could not reach the API. Run npm run dev from the repo root (web + server).",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pay-layout">
      <header className="pay-header">
        <p className="eyebrow">Milestone 4</p>
        <h1>Pay with Open Payments</h1>
        <p className="lede">
          Creates an incoming payment, quotes the debit from this app&apos;s
          wallet, then redirects you to approve the outgoing grant.
        </p>
      </header>

      <form className="pay-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Amount</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="10.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
            aria-invalid={Boolean(showError("amount"))}
            aria-describedby={showError("amount") ? "amount-error" : undefined}
            disabled={loading}
          />
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
          {loading ? "Working…" : "Pay"}
        </button>
      </form>

      {apiError ? (
        <section className="preview preview-error" aria-live="polite">
          <h2>Could not start payment</h2>
          <p className="hint">{apiError}</p>
        </section>
      ) : null}
    </div>
  );
}
