type RewardsInfo = {
  status: string;
  cashbackMajor?: string;
  assetCode?: string;
  outgoingPaymentId?: string;
  interactRedirect?: string;
  message?: string;
};

type Props = {
  amountMajor: string;
  assetCode: string;
  receiverWalletUrl: string;
  outgoingPaymentId: string;
  buyerWalletUrl?: string;
  rewards?: RewardsInfo | null;
};

function rewardsStatusCopy(rewards: RewardsInfo) {
  if (rewards.status === "paid") {
    return `Sent (${rewards.cashbackMajor} ${rewards.assetCode ?? "SGD"}).`;
  }
  if (rewards.status === "awaiting_approval") {
    return "Waiting for rewards-wallet approval (button below).";
  }
  if (rewards.status === "pending") {
    return `Recorded (${rewards.cashbackMajor} ${rewards.assetCode ?? "SGD"}). Payout pending.`;
  }
  if (rewards.status === "failed") {
    return rewards.message ?? "Payout failed.";
  }
  if (rewards.status === "skipped") {
    return rewards.message ?? "No cashback for this purchase.";
  }
  return rewards.message ?? "Cashback status unknown.";
}

export default function PaymentReceipt({
  amountMajor,
  assetCode,
  receiverWalletUrl,
  outgoingPaymentId,
  buyerWalletUrl,
  rewards,
}: Props) {
  return (
    <section className="status-panel status-success" aria-live="polite">
      <h2>Payment sent</h2>
      <p className="status-lede">
        Purchase payment created. Settlement over ILP may take a moment on
        testnet.
      </p>
      <dl className="receipt-dl">
        <div>
          <dt>Amount</dt>
          <dd>
            {amountMajor} {assetCode}
          </dd>
        </div>
        <div>
          <dt>Merchant wallet</dt>
          <dd className="mono">{receiverWalletUrl}</dd>
        </div>
        {buyerWalletUrl ? (
          <div>
            <dt>Your wallet</dt>
            <dd className="mono">{buyerWalletUrl}</dd>
          </div>
        ) : null}
        <div>
          <dt>Outgoing payment</dt>
          <dd className="mono">{outgoingPaymentId}</dd>
        </div>
        {rewards && rewards.status !== "skipped" && rewards.cashbackMajor ? (
          <div>
            <dt>Cashback (2% SGD)</dt>
            <dd>
              {rewards.cashbackMajor} {rewards.assetCode ?? "SGD"} —{" "}
              {rewardsStatusCopy(rewards)}
            </dd>
          </div>
        ) : null}
        {rewards?.outgoingPaymentId ? (
          <div>
            <dt>Cashback payment</dt>
            <dd className="mono">{rewards.outgoingPaymentId}</dd>
          </div>
        ) : null}
      </dl>
      {rewards?.status === "awaiting_approval" && rewards.interactRedirect ? (
        <a
          className="pay-button secondary-button-block"
          href={rewards.interactRedirect}
        >
          Approve SGD cashback in wallet
        </a>
      ) : null}
      <a className="secondary-button" href="/">
        Back to store
      </a>
    </section>
  );
}
