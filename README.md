# Open Payments Rewards

Demo store with Open Payments checkout and **2% SGD cashback** on [interledger-test.dev](https://wallet.interledger-test.dev/).

## Wallets (testnet)

| Role | Example URL |
|------|-------------|
| **Buyer** (pays at checkout) | `https://ilp.interledger-test.dev/fkmnrw-2` → `OP_WALLET_ADDRESS_URL` |
| **Merchant** (EUR, receives purchase) | `https://ilp.interledger-test.dev/e21287fb` → `OP_STORE_RECEIVER_WALLET_URL` |
| **Rewards pool** (SGD, sends cashback) | `https://ilp.interledger-test.dev/fkmn-rewards` → `OP_REWARDS_WALLET_URL` |

Use the **buyer** key for `OP_KEY_ID` / `private.key`. Use the **rewards pool** key for `OP_REWARDS_KEY_ID` (and `OP_REWARDS_PRIVATE_KEY_PATH` if different).

## Store

- **Store** (`/`) — products from [`catalog.json`](catalog.json), cart
- **Checkout** (`/checkout`) — cart total → Open Payments purchase to the merchant wallet
- **Callback** — completes payment, records order in SQLite, pays **2% SGD cashback** from the rewards wallet to the buyer wallet

### Catalog

Edit **[`catalog.json`](catalog.json)** at the repo root. Served at `GET /api/store`.

### Rewards API (R2)

- `GET /api/rewards/summary?wallet=` — earned / paid / pending cashback totals
- `GET /api/rewards/history?wallet=` — ledger entries  
- Ledger file: `rewards.sqlite` at repo root (gitignored)

Cashback is **2% of the cart total in SGD**, paid from `fkmn-rewards`. On testnet the rewards wallet needs a **second wallet approval** after checkout — use **Approve SGD cashback in wallet** on the receipt, then return via `/pay/rewards-callback`.

### Run

```bash
npm install && cd web && npm install && cd ../server && npm install && cd ..
npm run dev
```

Copy `.env.example` → `.env` and fill wallet URLs and keys.

**`OP_KEY_ID` must be the `kid` from JWKS**, not an arbitrary id from an old key:

```bash
curl -s "https://ilp.interledger-test.dev/fkmnrw-2/jwks.json"   # → kid for private.key
curl -s "https://ilp.interledger-test.dev/fkmn-rewards/jwks.json"
node scripts/verify-op-keys.mjs   # compares PEM ↔ jwks ↔ .env
```

Errors like **invalid signature** or **could not determine client** almost always mean `keyId` ≠ `kid` on that wallet’s `jwks.json`, or the wrong PEM file.

Note: `fkmnrw-2` is **USD** on testnet; `fkmn-rewards` is **SGD** (cashback). The merchant wallet `e21287fb` is **EUR**.

### Next

- **R3:** Rewards balance/history UI

## References

- [SDK setup](https://openpayments.dev/sdk/before-you-begin/)
- [Example payment flow](https://github.com/interledger/open-payments-example/blob/main/index.js)
