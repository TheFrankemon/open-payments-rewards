# Open Payments Rewards

Learning project: pay a wallet address via Open Payments (**SGD** on [interledger-test.dev](https://wallet.interledger-test.dev/) ), then evolve into 2% cashback rewards.

## Milestone 1 complete (M6)

End-to-end SGD pay flow:

1. **Pay** — incoming payment + quote + redirect to wallet
2. Approve outgoing grant in the test wallet
3. **Callback** — completes transfer and shows receipt (amount, receiver, outgoing payment id)

Errors show actionable hints (grant not approved, session expired, OP misconfiguration, etc.).

### Run

```bash
npm install && cd web && npm install && cd ../server && npm install && cd ..
npm run dev
```

### Next (Milestone 2 — rewards)

- **R1:** Product catalog + checkout
- **R2:** 2% SGD rewards ledger
- **R3:** Rewards UI

## References

- [SDK setup](https://openpayments.dev/sdk/before-you-begin/)
- [Example payment flow](https://github.com/interledger/open-payments-example/blob/main/index.js)
