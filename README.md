# Open Payments Rewards

Demo store with Open Payments checkout in **SGD** ([interledger-test.dev](https://wallet.interledger-test.dev/)), evolving toward 2% cashback rewards.

## Milestone 2 — R1 (current)

- **Store** (`/`) — products from [`catalog.json`](catalog.json), cart
- **Checkout** (`/checkout`) — cart total → same `/api/payments` flow as Milestone 1
- **Merchant receiver** — `OP_STORE_RECEIVER_WALLET_URL` in `.env` (not entered in the UI)

### Catalog

Edit **[`catalog.json`](catalog.json)** at the repo root to add or change products. Served at `GET /api/store` (re-read on each request — refresh the store page after edits).

### Env

```bash
OP_WALLET_ADDRESS_URL=...      # payer / signing client
OP_STORE_RECEIVER_WALLET_URL=... # required — merchant receives checkout payments
OP_KEY_ID=...
# private.key
```

### Run

```bash
npm install && cd web && npm install && cd ../server && npm install && cd ..
npm run dev
```

### Next

- **R2:** 2% SGD rewards ledger after paid checkout
- **R3:** Rewards UI

## References

- [SDK setup](https://openpayments.dev/sdk/before-you-begin/)
- [Example payment flow](https://github.com/interledger/open-payments-example/blob/main/index.js)
