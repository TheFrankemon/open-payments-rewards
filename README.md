# Open Payments Rewards

Learning project: pay a wallet address via Open Payments, then evolve into 2% cashback rewards.

## Milestone 1 (current)

React pay form only — amount + receiver wallet URL + Pay (client validation; API wired in later commits).

### Prerequisites

Node **20+** (see `web/.nvmrc`). The repo pins **20.15.0** in `package.json` for [Volta](https://volta.sh/).

If `npm run dev` fails with `crypto.getRandomValues is not a function`, your shell is still on Node 16 — run `node -v`, then switch:

```bash
volta install node@20   # recommended if you use Volta
# or: nvm use / fnm use   (from repo root or web/)
```

### Run the web app

```bash
cd web
npm install
npm run dev
```

Or from the repo root: `npm run dev` (after `npm install` in `web/`).

Optional: set `VITE_DEFAULT_RECEIVER_URL` in `web/.env` to prefill the receiver field.

## Next steps

- **M2:** Express API + `.env` for Open Payments keys (halt until you add secrets).
- **M3–M6:** Full transfer flow + wallet redirect.

See [Open Payments test wallet](https://wallet.interledger-test.dev/) and [SDK setup](https://openpayments.dev/sdk/before-you-begin/).
