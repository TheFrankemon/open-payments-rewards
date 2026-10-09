import { useEffect, useRef, useState } from "react";
import PaymentReceipt from "./PaymentReceipt";
import StatusPanel from "./StatusPanel";
import { parseApiError } from "./paymentUi";

type CompletePaymentResponse = {
  status: string;
  outgoingPaymentId: string;
  amount: {
    major: string;
    minor: string;
    assetCode: string;
    assetScale: number;
  };
  receiverWalletUrl: string;
  buyerWalletUrl?: string;
  rewards?: {
    status: string;
    cashbackMajor?: string;
    assetCode?: string;
    outgoingPaymentId?: string;
    interactRedirect?: string;
    message?: string;
  };
};

type CompleteRewardsResponse = {
  rewards: {
    status: string;
    cashbackMajor?: string;
    assetCode?: string;
    outgoingPaymentId?: string;
  };
};

export default function PayCallback() {
  const pathname = window.location.pathname;
  const isGrantSetup = pathname.includes("rewards-grant-setup");
  const isRewards = pathname.includes("rewards-callback");
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("sessionId");
  const orderId = params.get("orderId");
  const interactRef = params.get("interact_ref");
  const started = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReturnType<typeof parseApiError> | null>(
    null,
  );
  const [paid, setPaid] = useState<CompletePaymentResponse | null>(null);
  const [cashback, setCashback] = useState<
    CompleteRewardsResponse["rewards"] | null
  >(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!isGrantSetup) {
      const idMissing = isRewards ? !orderId : !sessionId;
      if (idMissing) {
        setError(
          parseApiError(
            {
              message: isRewards
                ? "Missing orderId in URL."
                : "Missing sessionId in URL.",
            },
            isRewards ? "Missing orderId in URL." : "Missing sessionId in URL.",
          ),
        );
        setLoading(false);
        return;
      }
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
        const url = isGrantSetup
          ? "/api/rewards/standing-grant/complete"
          : isRewards
            ? `/api/rewards/orders/${orderId}/complete-cashback`
            : `/api/payments/${sessionId}/complete`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interactRef }),
        });
        const body = await res.json();
        if (!res.ok) {
          setError(
            parseApiError(
              body,
              isGrantSetup
                ? "Could not save auto-cashback grant."
                : isRewards
                  ? "Could not complete cashback."
                  : "Could not complete payment.",
            ),
          );
          return;
        }
        if (isGrantSetup) {
          setCashback({ status: "paid", assetCode: "SGD" });
        } else if (isRewards) {
          setCashback((body as CompleteRewardsResponse).rewards);
        } else {
          setPaid(body as CompletePaymentResponse);
        }
      } catch {
        setError({
          title: "Cannot reach API",
          message: isGrantSetup
            ? "Could not save auto-cashback grant on the server."
            : isRewards
              ? "Could not complete cashback on the server."
              : "Could not call complete payment on the server.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [isGrantSetup, isRewards, sessionId, orderId, interactRef]);

  if (loading) {
    return (
      <div className="pay-layout">
        {!isRewards && !isGrantSetup ? (
          <header className="pay-header">
            <h1>Almost done</h1>
          </header>
        ) : null}
        <StatusPanel
          variant="loading"
          title={
            isGrantSetup
              ? "Saving auto-cashback grant"
              : isRewards
                ? "Sending cashback"
                : "Completing payment"
          }
          message={
            isGrantSetup
              ? "Finalizing standing grant on the rewards wallet…"
              : isRewards
                ? "Creating outgoing payment from the rewards wallet…"
                : "Continuing grant and creating outgoing payment…"
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pay-layout">
        {!isRewards ? (
          <header className="pay-header">
            <h1>Payment not completed</h1>
          </header>
        ) : null}
        <StatusPanel variant="error" {...error} />
        <a className="secondary-button secondary-button-block" href="/">
          Back to store
        </a>
      </div>
    );
  }

  if ((isRewards || isGrantSetup) && cashback) {
    return (
      <div className="pay-layout">
        <section className="status-panel status-success">
          <h2>{isGrantSetup ? "Auto cashback enabled" : "Cashback sent"}</h2>
          <p className="status-lede">
            {isGrantSetup
              ? "Future checkouts will pay 2% SGD cashback without a second wallet approval (within grant limits)."
              : `${cashback.cashbackMajor} ${cashback.assetCode ?? "SGD"} from the rewards pool is on its way to your wallet.`}
          </p>
          {cashback.outgoingPaymentId ? (
            <p className="mono status-hint">{cashback.outgoingPaymentId}</p>
          ) : null}
          <a className="secondary-button" href={isGrantSetup ? "/rewards" : "/"}>
            {isGrantSetup ? "Back to rewards" : "Back to store"}
          </a>
        </section>
      </div>
    );
  }

  if (!paid) return null;

  return (
    <div className="pay-layout">
      <header className="pay-header">
        <h1>Success</h1>
        <p className="lede">Checkout complete — purchase plus 2% SGD rewards.</p>
      </header>
      <PaymentReceipt
        amountMajor={paid.amount.major}
        assetCode={paid.amount.assetCode}
        receiverWalletUrl={paid.receiverWalletUrl}
        outgoingPaymentId={paid.outgoingPaymentId}
        buyerWalletUrl={paid.buyerWalletUrl}
        rewards={paid.rewards}
      />
    </div>
  );
}
