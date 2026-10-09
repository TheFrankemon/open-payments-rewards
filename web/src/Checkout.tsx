import { FormEvent, useState } from "react";
import {
  loadingCopyForPhase,
  PayPhase,
  runCheckoutPayment,
} from "./checkoutPayment";
import { onSpaLinkClick } from "./nav";
import { parseApiError } from "./paymentUi";
import { useStore } from "./storeContext";
import StatusPanel from "./StatusPanel";
import StoreNav from "./StoreNav";

export default function Checkout() {
  const {
    currency,
    lines,
    totalMajor,
    itemCount,
    cartSyncing,
    storeLoading,
    error: storeLoadError,
    setQuantity,
    receiverWalletUrl,
  } = useStore();
  const [phase, setPhase] = useState<PayPhase>("idle");
  const [flowError, setFlowError] = useState<ReturnType<
    typeof parseApiError
  > | null>(null);

  const loading = phase !== "idle";
  const storeError = receiverWalletUrl
    ? null
    : parseApiError(
        {
          error: "store_not_configured",
          message:
            "Set OP_STORE_RECEIVER_WALLET_URL in .env to the merchant receiving wallet.",
        },
        "Store is not configured.",
      );

  async function handlePay(event: FormEvent) {
    event.preventDefault();
    if (itemCount === 0 || !receiverWalletUrl) return;
    setFlowError(null);

    try {
      const result = await runCheckoutPayment(
        totalMajor,
        setPhase,
        receiverWalletUrl,
      );
      if (result.error) {
        setFlowError(result.error);
        setPhase("idle");
      }
    } catch {
      setFlowError({
        title: "Cannot reach API",
        message: "Run npm run dev from the repo root (web + server).",
      });
      setPhase("idle");
    }
  }

  if (cartSyncing || (storeLoading && itemCount > 0)) {
    return (
      <div className="pay-layout">
        <StatusPanel
          variant="loading"
          title="Loading checkout"
          message="Restoring your cart…"
        />
      </div>
    );
  }

  if (storeLoadError && itemCount > 0) {
    return (
      <div className="pay-layout">
        <header className="pay-header">
          <h1>Checkout</h1>
        </header>
        <StatusPanel variant="error" {...storeLoadError} />
        <a className="secondary-button" href="/" onClick={onSpaLinkClick}>
          Back to store
        </a>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="pay-layout">
        <header className="pay-header">
          <h1>Checkout</h1>
          <p className="lede">Your cart is empty.</p>
        </header>
        <a className="secondary-button" href="/" onClick={onSpaLinkClick}>
          Back to store
        </a>
      </div>
    );
  }

  return (
    <div className="pay-layout">
      <header className="pay-header store-header">
        <div>
          <h1>Checkout</h1>
          <p className="lede">
            Pay {totalMajor} {currency} to the merchant via Open Payments.
          </p>
        </div>
        <StoreNav active="store" itemCount={itemCount} />
      </header>

      <section className="pay-form checkout-summary">
        <ul className="checkout-lines">
          {lines.map((line) => (
            <li key={line.product.id} className="checkout-line">
              <div>
                <strong>{line.product.name}</strong>
                <p className="product-desc">
                  {line.product.priceMajor} {currency} each
                </p>
              </div>
              <label className="qty-field">
                <span className="sr-only">Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={line.quantity}
                  disabled={loading}
                  onChange={(e) =>
                    setQuantity(line.product.id, Number(e.target.value))
                  }
                />
              </label>
            </li>
          ))}
        </ul>
        <p className="checkout-total">
          Total <strong>{totalMajor} {currency}</strong>
        </p>
        {receiverWalletUrl ? (
          <p className="status-hint checkout-receiver">
            Merchant wallet:{" "}
            <span className="mono">{receiverWalletUrl}</span>
          </p>
        ) : null}
        <form onSubmit={handlePay}>
          <button
            type="submit"
            className="pay-button"
            disabled={loading || Boolean(storeError)}
          >
            {loading ? "Processing…" : "Pay with Open Payments"}
          </button>
        </form>
        <a
          className="secondary-button secondary-button-inline"
          href="/"
          onClick={onSpaLinkClick}
        >
          Continue shopping
        </a>
      </section>

      {storeError ? (
        <StatusPanel variant="error" {...storeError} />
      ) : null}

      {loading ? (
        <StatusPanel variant="loading" {...loadingCopyForPhase(phase)} />
      ) : null}

      {flowError ? (
        <StatusPanel
          variant="error"
          {...flowError}
          onRetry={() => {
            setFlowError(null);
            setPhase("idle");
          }}
        />
      ) : null}
    </div>
  );
}
