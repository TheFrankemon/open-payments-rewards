import { FormEvent, useMemo, useState } from "react";
import {
  isValidPayForm,
  PayFormValues,
  validatePayForm,
} from "./validation";

const defaultReceiver =
  import.meta.env.VITE_DEFAULT_RECEIVER_URL?.trim() ?? "";

type PaymentSessionResponse = {
  sessionId: string;
  status: string;
  amount: {
    major: string;
    minor: string;
    assetCode: string;
    assetScale: number;
  };
  receiverWalletUrl: string;
  incomingPaymentId: string;
};

type ApiErrorBody = {
  error?: string;
  message?: string;
  fields?: Partial<Record<keyof PayFormValues, string>>;
};

export default function PayForm() {
  const [amount, setAmount] = useState("");
  const [receiverWalletUrl, setReceiverWalletUrl] = useState(defaultReceiver);
  const [touched, setTouched] = useState<
    Partial<Record<keyof PayFormValues, boolean>>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [session, setSession] = useState<PaymentSessionResponse | null>(null);

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
    setSession(null);

    const nextErrors = validatePayForm(values);
    if (!isValidPayForm(nextErrors)) return;

    setLoading(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: values.amount.trim(),
          receiverWalletUrl: values.receiverWalletUrl.trim(),
        }),
      });

      const body = (await response.json()) as
        | PaymentSessionResponse
        | ApiErrorBody;

      if (!response.ok) {
        const err = body as ApiErrorBody;
        setApiError(err.message ?? "Payment request failed.");
        return;
      }

      setSession(body as PaymentSessionResponse);
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
        <p className="eyebrow">Milestone 3</p>
        <h1>Pay with Open Payments</h1>
        <p className="lede">
          Creates an incoming payment on the receiver wallet (Open Payments
          steps 1–2). Quote and wallet approval come in M4–M5.
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
            placeholder="https://wallet.interledger-test.dev/username"
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
          {loading ? "Creating incoming payment…" : "Pay"}
        </button>
      </form>

      {apiError ? (
        <section className="preview preview-error" aria-live="polite">
          <h2>Could not start payment</h2>
          <p className="hint">{apiError}</p>
        </section>
      ) : null}

      {session ? (
        <section className="preview" aria-live="polite">
          <h2>Incoming payment created</h2>
          <dl>
            <div>
              <dt>Session</dt>
              <dd className="mono">{session.sessionId}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>
                {session.amount.major} {session.amount.assetCode} (
                {session.amount.minor} minor units)
              </dd>
            </div>
            <div>
              <dt>Receiver</dt>
              <dd className="mono">{session.receiverWalletUrl}</dd>
            </div>
            <div>
              <dt>Incoming payment</dt>
              <dd className="mono">{session.incomingPaymentId}</dd>
            </div>
          </dl>
          <p className="hint">
            M4 will add quote + wallet redirect using this session.
          </p>
        </section>
      ) : null}
    </div>
  );
}
