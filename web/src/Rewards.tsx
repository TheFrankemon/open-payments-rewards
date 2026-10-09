import { useEffect, useState } from "react";
import { onSpaLinkClick } from "./nav";
import { parseApiError } from "./paymentUi";
import StatusPanel from "./StatusPanel";
import StoreNav from "./StoreNav";

type AssetTotals = {
  assetCode: string;
  assetScale: number;
  earnedMinor: string;
  paidMinor: string;
  pendingMinor: string;
};

type HistoryEntry = {
  id: number;
  order_id: string;
  cashback_minor: string;
  asset_code: string;
  asset_scale: number;
  status: string;
  error_message: string | null;
  interact_redirect: string | null;
  created_at: string;
};

type StandingGrantStatus = {
  configured: boolean;
  source: "env" | "database" | null;
};

type RewardsPayload = {
  buyerWalletUrl: string;
  totals: AssetTotals[];
  standingGrant?: StandingGrantStatus;
  entries: HistoryEntry[];
};

function minorToMajor(minorStr: string, scale: number) {
  const minor = BigInt(minorStr);
  if (scale <= 0) return String(minor);
  const factor = 10n ** BigInt(scale);
  return `${minor / factor}.${(minor % factor).toString().padStart(scale, "0")}`;
}

const TOTAL_LABELS: [string, keyof AssetTotals][] = [
  ["Paid out", "paidMinor"],
  ["Pending", "pendingMinor"],
  ["Lifetime earned", "earnedMinor"],
];

export default function Rewards() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReturnType<typeof parseApiError> | null>(
    null,
  );
  const [data, setData] = useState<RewardsPayload | null>(null);
  const [grantSetupError, setGrantSetupError] = useState<string | null>(null);
  const [grantSetupLoading, setGrantSetupLoading] = useState(false);

  useEffect(() => {
    fetch("/api/rewards")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw body;
        setData(body as RewardsPayload);
      })
      .catch((body: unknown) => {
        setError(
          body && typeof body === "object"
            ? parseApiError(body, "Could not load rewards.")
            : {
                title: "Cannot reach API",
                message: "Run npm run dev from the repo root.",
              },
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="pay-layout store-layout">
        <StatusPanel
          variant="loading"
          title="Loading rewards"
          message="Reading your cashback ledger…"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pay-layout store-layout">
        <StatusPanel variant="error" {...error} />
        <a className="secondary-button" href="/" onClick={onSpaLinkClick}>
          Back to store
        </a>
      </div>
    );
  }

  const primary = data?.totals[0];
  const standingGrant = data?.standingGrant;

  async function enableAutoCashback() {
    setGrantSetupError(null);
    setGrantSetupLoading(true);
    try {
      const res = await fetch("/api/rewards/standing-grant", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setGrantSetupError(
          typeof body.message === "string"
            ? body.message
            : "Could not start rewards-wallet setup.",
        );
        return;
      }
      if (typeof body.interactRedirect === "string") {
        window.location.assign(body.interactRedirect);
      }
    } catch {
      setGrantSetupError("Could not reach the API.");
    } finally {
      setGrantSetupLoading(false);
    }
  }

  return (
    <div className="pay-layout store-layout">
      <header className="pay-header store-header">
        <div>
          <p className="eyebrow">Open Payments Rewards</p>
          <h1>Your rewards</h1>
          <p className="lede">2% SGD cashback on checkout.</p>
        </div>
        <StoreNav active="rewards" />
      </header>

      {data?.buyerWalletUrl ? (
        <p className="status-hint checkout-receiver">
          Buyer wallet: <span className="mono">{data.buyerWalletUrl}</span>
        </p>
      ) : null}

      {standingGrant?.configured ? (
        <p className="status-hint checkout-receiver">
          Auto cashback: on
          {standingGrant.source === "env" ? " (token from .env)" : ""}.
        </p>
      ) : (
        <section className="status-panel" aria-label="Auto cashback setup">
          <h2 className="checkout-total">Auto cashback (R4)</h2>
          <p className="product-desc">
            Testnet requires wallet consent for outgoing payments. Approve once
            for the rewards pool wallet; later checkouts send 2% SGD without a
            second approval.
          </p>
          {grantSetupError ? (
            <p className="product-desc">{grantSetupError}</p>
          ) : null}
          <button
            type="button"
            className="pay-button"
            disabled={grantSetupLoading}
            onClick={() => void enableAutoCashback()}
          >
            {grantSetupLoading
              ? "Opening wallet…"
              : "Enable auto cashback (rewards wallet)"}
          </button>
        </section>
      )}

      {primary ? (
        <section className="rewards-totals" aria-label="Cashback totals">
          {TOTAL_LABELS.map(([label, key]) => (
            <div key={key} className="rewards-total-card">
              <p className="rewards-total-label">{label}</p>
              <p className="rewards-total-value">
                {minorToMajor(String(primary[key]), primary.assetScale)}{" "}
                {primary.assetCode}
              </p>
            </div>
          ))}
        </section>
      ) : (
        <StatusPanel
          variant="loading"
          title="No cashback yet"
          message="Complete a checkout to earn 2% SGD cashback."
        />
      )}

      <h2 className="checkout-total">History</h2>
      {!data?.entries.length ? (
        <p className="product-desc">No ledger entries yet.</p>
      ) : (
        <ul className="product-list">
          {data.entries.map((entry) => (
            <li key={entry.id} className="product-card">
              <div className="rewards-history-main">
                <strong>
                  +{minorToMajor(entry.cashback_minor, entry.asset_scale)}{" "}
                  {entry.asset_code}
                </strong>
                <span
                  className={`rewards-status rewards-status-${entry.status}`}
                >
                  {entry.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="product-desc">
                Order {entry.order_id.slice(0, 8)}… · {entry.created_at}
              </p>
              {entry.status === "failed" && entry.error_message ? (
                <p className="product-desc">{entry.error_message}</p>
              ) : null}
              {entry.status === "awaiting_approval" && entry.interact_redirect ? (
                <a
                  className="secondary-button"
                  href={entry.interact_redirect}
                >
                  Approve cashback
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <a className="secondary-button" href="/" onClick={onSpaLinkClick}>
        Continue shopping
      </a>
    </div>
  );
}
