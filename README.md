# Open Payments Rewards

Learning project: pay a wallet address via Open Payments, then evolve into 2% cashback rewards.

## Milestone 3 (current)

**Incoming payment on the receiver wallet** — `POST /api/payments` runs Open Payments grant + `incomingPayment.create` (example steps 1–2). Sessions are stored in memory until M4 adds quote and outgoing grant.

### Prerequisites

Node **20+** (see `web/.nvmrc`). Volta pins **20.15.0** in `package.json`.

Open Payments credentials in repo-root `.env` (see `.env.example`). Readiness:

```bash
curl -s http://localhost:5173/api/open-payments/readiness
```

### Install and run

```bash
npm install && cd web && npm install && cd ../server && npm install && cd ..
npm run dev
```

Submit the pay form or:

```bash
curl -s -X POST http://localhost:5173/api/payments \
  -H 'Content-Type: application/json' \
  -d '{"amount":"1.00","receiverWalletUrl":"https://wallet.interledger-test.dev/YOUR_USER"}'
```

Expect `201` with `sessionId` and `incomingPaymentId`.

### Next steps

- **M4:** Quote + interactive outgoing grant; return `interact.redirect` (**halt** — approve in wallet).
- **M5–M6:** Callback, complete payment, success UI.

## References

- [Open Payments test wallet](https://wallet.interledger-test.dev/)
- [SDK setup](https://openpayments.dev/sdk/before-you-begin/)
- [Payment example flow](https://github.com/interledger/open-payments-example/blob/main/index.js)
