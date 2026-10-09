# Open Payments Rewards

Learning project: pay a wallet address via Open Payments, then evolve into 2% cashback rewards.

## Milestone 4 (current)

Pay flow through **quote + interactive outgoing grant**:

1. `POST /api/payments` — incoming payment on receiver (payer = `OP_WALLET_ADDRESS_URL` on the server)
2. `POST /api/payments/:sessionId/outgoing-grant` — quote on payer wallet, pending outgoing grant
3. Browser redirects to **`interactRedirect`** — **HALT:** approve in your [test wallet](https://wallet.interledger-test.dev/) (payer account must be funded)

Grant finish URL: `{WEB_PUBLIC_URL}/pay/callback?sessionId=…` (M5 will call `grant.continue` + outgoing payment there).

### Run

```bash
npm install && cd web && npm install && cd ../server && npm install && cd ..
npm run dev
```

### Next

- **M5:** `POST /api/payments/:sessionId/complete` after wallet callback
- **M6:** Success and error UI

## References

- [SDK setup](https://openpayments.dev/sdk/before-you-begin/)
- [Example payment flow](https://github.com/interledger/open-payments-example/blob/main/index.js)
