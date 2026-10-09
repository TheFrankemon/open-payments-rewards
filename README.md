# Open Payments Rewards

Learning project: pay a wallet address via Open Payments, then evolve into 2% cashback rewards.

## Milestone 2 (current)

React pay form + **Express API scaffold** (no Open Payments calls yet). Vite proxies `/api` → `http://localhost:3001`.

### Prerequisites

Node **20+** (see `web/.nvmrc`). The repo pins **20.15.0** in `package.json` for [Volta](https://volta.sh/).

If `npm run dev` fails with `crypto.getRandomValues is not a function`, your shell is still on Node 16 — run `node -v`, then switch:

```bash
volta install node@20   # recommended if you use Volta
# or: nvm use / fnm use   (from repo root or web/)
```

### Install and run (web + API)

```bash
npm install          # root (concurrently)
cd web && npm install && cd ..
cd server && npm install && cd ..

npm run dev          # from repo root — Vite + API together
```

Web only: `npm run dev:web` or `cd web && npm run dev`.

### HALT — secrets before M3

The server starts **without** Open Payments credentials. Before **M3** (real SDK calls), you must:

1. Copy `.env.example` → `.env` in the repo root.
2. Create a [test wallet](https://wallet.interledger-test.dev/) and [developer keys](https://openpayments.dev/sdk/before-you-begin/).
3. Set `OP_WALLET_ADDRESS_URL` (HTTPS, no trailing slash), `OP_KEY_ID`, and save the PEM as `private.key` (or set `OP_PRIVATE_KEY_PATH`).

Verify (with `npm run dev` running):

```bash
curl -s http://localhost:5173/api/open-payments/readiness | jq
```

When `"ready": true`, say **implement M3**. Do **not** commit `.env` or `private.key`.

Optional: `VITE_DEFAULT_RECEIVER_URL` in `web/.env` to prefill the receiver field.

## Next steps

- **M3:** `POST /api/payments` — incoming payment on receiver wallet.
- **M4–M6:** Quote, wallet redirect, complete transfer, success UI.

## References

- [Open Payments test wallet](https://wallet.interledger-test.dev/)
- [SDK setup](https://openpayments.dev/sdk/before-you-begin/)
- [Payment example flow](https://github.com/interledger/open-payments-example/blob/main/index.js)
