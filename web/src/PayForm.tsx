import { FormEvent, useMemo, useState } from "react";
import {
  isValidPayForm,
  PayFormValues,
  validatePayForm,
} from "./validation";

const defaultReceiver =
  import.meta.env.VITE_DEFAULT_RECEIVER_URL?.trim() ?? "";

type SubmitPreview = PayFormValues & { submittedAt: string };

export default function PayForm() {
  const [amount, setAmount] = useState("");
  const [receiverWalletUrl, setReceiverWalletUrl] = useState(defaultReceiver);
  const [touched, setTouched] = useState<
    Partial<Record<keyof PayFormValues, boolean>>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [preview, setPreview] = useState<SubmitPreview | null>(null);

  const values: PayFormValues = useMemo(
    () => ({ amount, receiverWalletUrl }),
    [amount, receiverWalletUrl],
  );

  const errors = useMemo(() => validatePayForm(values), [values]);

  function showError(field: keyof PayFormValues): string | undefined {
    if (!submitAttempted && !touched[field]) return undefined;
    return errors[field];
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitAttempted(true);

    const nextErrors = validatePayForm(values);
    if (!isValidPayForm(nextErrors)) return;

    setPreview({
      amount: values.amount.trim(),
      receiverWalletUrl: values.receiverWalletUrl.trim(),
      submittedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="pay-layout">
      <header className="pay-header">
        <p className="eyebrow">Milestone 1</p>
        <h1>Pay with Open Payments</h1>
        <p className="lede">
          Enter an amount and the receiver&apos;s wallet address. The server
          payment flow will connect in the next commit.
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
          />
          {showError("receiverWalletUrl") ? (
            <p id="receiver-error" className="field-error" role="alert">
              {showError("receiverWalletUrl")}
            </p>
          ) : null}
        </label>

        <button type="submit" className="pay-button">
          Pay
        </button>
      </form>

      {preview ? (
        <section className="preview" aria-live="polite">
          <h2>Ready to send (preview only)</h2>
          <dl>
            <div>
              <dt>Amount</dt>
              <dd>{preview.amount}</dd>
            </div>
            <div>
              <dt>Receiver</dt>
              <dd className="mono">{preview.receiverWalletUrl}</dd>
            </div>
          </dl>
          <p className="hint">
            Validation passed. After M2–M6 this will start an Open Payments
            transfer and open your wallet for approval.
          </p>
        </section>
      ) : null}
    </div>
  );
}
