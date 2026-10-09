import { useEffect, useRef, useState } from "react";

type CompleteResponse = {
  status: string;
  outgoingPaymentId: string;
  amount: {
    major: string;
    minor: string;
    assetCode: string;
    assetScale: number;
  };
  receiverWalletUrl: string;
};

type CompleteError = {
  message?: string;
};

export default function PayCallback() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("sessionId");
  const interactRef = params.get("interact_ref");
  const started = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState<CompleteResponse | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!sessionId) {
      setError("Missing sessionId in callback URL.");
      setLoading(false);
      return;
    }
    if (!interactRef) {
      setError("Missing interact_ref from wallet. Approve the grant and retry.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/payments/${sessionId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interactRef }),
        });
        const body = (await res.json()) as CompleteResponse | CompleteError;
        if (!res.ok) {
          setError(
            (body as CompleteError).message ?? "Could not complete payment.",
          );
          return;
        }
        setPaid(body as CompleteResponse);
      } catch {
        setError("Could not reach the API to complete payment.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, interactRef]);

  if (loading) {
    return (
      <div className="pay-layout">
        <header className="pay-header">
          <h1>Completing payment…</h1>
          <p className="lede">Finalizing your Open Payments transfer.</p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pay-layout">
        <header className="pay-header">
          <h1>Payment not completed</h1>
        </header>
        <section className="preview preview-error">
          <p className="hint">{error}</p>
        </section>
      </div>
    );
  }

  if (!paid) return null;

  return (
    <div className="pay-layout">
      <header className="pay-header">
        <p className="eyebrow">Milestone 5</p>
        <h1>Payment sent</h1>
        <p className="lede">
          Outgoing payment created; funds should settle over ILP shortly.
        </p>
      </header>
      <section className="preview">
        <dl>
          <div>
            <dt>Amount</dt>
            <dd>
              {paid.amount.major} {paid.amount.assetCode}
            </dd>
          </div>
          <div>
            <dt>Receiver</dt>
            <dd className="mono">{paid.receiverWalletUrl}</dd>
          </div>
          <div>
            <dt>Outgoing payment</dt>
            <dd className="mono">{paid.outgoingPaymentId}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
