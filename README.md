# Open Payments Rewards

Learning project: pay a wallet address via Open Payments ( **SGD** on [interledger-test.dev](https://wallet.interledger-test.dev/) ), then evolve into 2% cashback rewards.

## Milestone 5 (current)

After wallet approval, **`/pay/callback`** calls `POST /api/payments/:sessionId/complete` with `interact_ref` → `grant.continue` + `outgoingPayment.create`.

1. Pay form → incoming payment → quote → wallet redirect (M3–M4)
2. Approve grant in test wallet (**HALT** if you skip this — complete returns `grant_not_finalized`)
3. Callback auto-completes transfer; success shows amount in **SGD**

### Run

```bash
npm install && cd web && npm install && cd ../server && npm install && cd ..
npm run dev
```

### Next

- **M6:** Polish success/error states on pay + callback flows

## References

- [SDK setup](https://openpayments.dev/sdk/before-you-begin/)
- [Example payment flow](https://github.com/interledger/open-payments-example/blob/main/index.js)
