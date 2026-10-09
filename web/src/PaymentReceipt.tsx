import { formatMajorAmount } from "./paymentUi";

type Props = {
  amountMajor: string;
  assetCode: string;
  receiverWalletUrl: string;
  outgoingPaymentId: string;
};

export default function PaymentReceipt({
  amountMajor,
  assetCode,
  receiverWalletUrl,
  outgoingPaymentId,
}: Props) {
  return (
    <section className="status-panel status-success" aria-live="polite">
      <h2>Payment sent</h2>
      <p className="status-lede">
        Outgoing payment created in SGD. Settlement over ILP may take a moment on
        testnet.
      </p>
      <dl className="receipt-dl">
        <div>
          <dt>Amount</dt>
          <dd>{formatMajorAmount(amountMajor, assetCode)}</dd>
        </div>
        <div>
          <dt>Receiver</dt>
          <dd className="mono">{receiverWalletUrl}</dd>
        </div>
        <div>
          <dt>Outgoing payment</dt>
          <dd className="mono">{outgoingPaymentId}</dd>
        </div>
      </dl>
      <a className="secondary-button" href="/">
        Make another payment
      </a>
    </section>
  );
}
