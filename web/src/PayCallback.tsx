export default function PayCallback() {
  const sessionId = new URLSearchParams(window.location.search).get("sessionId");

  return (
    <div className="pay-layout">
      <header className="pay-header">
        <h1>Wallet return</h1>
        <p className="lede">
          M5 will finalize the payment here after grant approval.
          {sessionId ? ` Session ${sessionId}.` : null}
        </p>
      </header>
    </div>
  );
}
