import { useEffect, useRef, useState } from "react";
import PaymentReceipt from "./PaymentReceipt";
import StatusPanel from "./StatusPanel";
import { parseApiError } from "./paymentUi";

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

export default function PayCallback() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("sessionId");
  const interactRef = params.get("interact_ref");
  const started = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReturnType<typeof parseApiError> | null>(
    null,
  );
  const [paid, setPaid] = useState<CompleteResponse | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!sessionId) {
      setError(
        parseApiError(
          { error: "missing_interact_ref", message: "Missing sessionId in URL." },
          "Missing sessionId in URL.",
        ),
      );
      setLoading(false);
      return;
    }
    if (!interactRef) {
      setError(
        parseApiError(
          {
            error: "missing_interact_ref",
            message: "Missing interact_ref from wallet redirect.",
          },
          "Missing interact_ref from wallet redirect.",
        ),
      );
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
        const body = await res.json();
        if (!res.ok) {
          setError(parseApiError(body, "Could not complete payment."));
          return;
        }
        setPaid(body as CompleteResponse);
      } catch {
        setError({
          title: "Cannot reach API",
          message: "Could not call complete payment on the server.",
          hint: "Ensure npm run dev is still running, then use Make another payment.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, interactRef]);

  if (loading) {
    return (
      <div className="pay-layout">
        <header className="pay-header">
          <h1>Almost done</h1>
        </header>
        <StatusPanel
          variant="loading"
          title="Completing payment"
          message="Continuing grant and creating outgoing payment in SGD…"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pay-layout">
        <header className="pay-header">
          <h1>Payment not completed</h1>
        </header>
        <StatusPanel variant="error" {...error} />
        <a className="secondary-button secondary-button-block" href="/">
          Back to Pay
        </a>
      </div>
    );
  }

  if (!paid) return null;

  return (
    <div className="pay-layout">
      <header className="pay-header">
        <h1>Success</h1>
        <p className="lede">Milestone 1 complete — full Open Payments transfer.</p>
      </header>
      <PaymentReceipt
        amountMajor={paid.amount.major}
        assetCode={paid.amount.assetCode}
        receiverWalletUrl={paid.receiverWalletUrl}
        outgoingPaymentId={paid.outgoingPaymentId}
      />
    </div>
  );
}
