import type { UserFacingError } from "./paymentUi";

type Props = UserFacingError & {
  variant: "error" | "loading";
  onRetry?: () => void;
};

export default function StatusPanel({
  variant,
  title,
  message,
  hint,
  onRetry,
}: Props) {
  if (variant === "loading") {
    return (
      <section className="status-panel status-loading" aria-live="polite">
        <h2>{title}</h2>
        <p className="status-lede">{message}</p>
        <div className="spinner" aria-hidden="true" />
      </section>
    );
  }

  return (
    <section className="status-panel status-error" aria-live="polite">
      <h2>{title}</h2>
      <p className="status-lede">{message}</p>
      {hint ? <p className="status-hint">{hint}</p> : null}
      {onRetry ? (
        <button type="button" className="secondary-button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </section>
  );
}
