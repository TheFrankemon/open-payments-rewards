import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const serverSrcDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(serverSrcDir, "../..");

dotenv.config({ path: resolve(repoRoot, ".env") });

function resolvePrivateKeyPath(rawPath) {
  const pathValue = rawPath?.trim() || "./private.key";
  return isAbsolute(pathValue) ? pathValue : resolve(repoRoot, pathValue);
}

function trimUrl(value) {
  return (value ?? "").replace(/\/$/, "");
}

export function getConfig() {
  const openPayments = {
    walletAddressUrl: trimUrl(process.env.OP_WALLET_ADDRESS_URL),
    storeReceiverWalletUrl: trimUrl(process.env.OP_STORE_RECEIVER_WALLET_URL),
    keyId: (process.env.OP_KEY_ID ?? "").trim(),
    privateKeyPath: resolvePrivateKeyPath(process.env.OP_PRIVATE_KEY_PATH),
  };

  const rewardsWalletUrl = trimUrl(process.env.OP_REWARDS_WALLET_URL ?? "");
  const rewardsKeyId = (
    process.env.OP_REWARDS_KEY_ID ??
    (rewardsWalletUrl ? openPayments.keyId : "")
  ).trim();
  const rewardsPrivateKeyPath = rewardsWalletUrl
    ? resolvePrivateKeyPath(
        process.env.OP_REWARDS_PRIVATE_KEY_PATH ??
          process.env.OP_PRIVATE_KEY_PATH,
      )
    : resolvePrivateKeyPath(process.env.OP_REWARDS_PRIVATE_KEY_PATH);

  return {
    port: Number(process.env.PORT ?? 3001),
    webPublicUrl: trimUrl(
      process.env.WEB_PUBLIC_URL ?? "http://localhost:5173",
    ),
    openPayments,
    rewards: {
      walletAddressUrl: rewardsWalletUrl,
      keyId: rewardsKeyId,
      privateKeyPath: rewardsPrivateKeyPath,
      cashbackRateBps: Number(process.env.OP_CASHBACK_RATE_BPS ?? 200),
    },
    repoRoot,
  };
}

/** Repo-root catalog.json (edit this file to change store products). */
export function getCatalogPath() {
  return resolve(getConfig().repoRoot, "catalog.json");
}

export function getCatalogReadiness() {
  const catalogPath = getCatalogPath();
  const catalogFile = existsSync(catalogPath);
  return {
    ready: catalogFile,
    checks: { catalogFile },
    catalogPath,
    message: catalogFile
      ? "catalog.json found."
      : `Add catalog.json at repo root. Missing: ${catalogPath}`,
  };
}

/** True when M3+ can use the Open Payments SDK (secrets present on disk). */
export function getOpenPaymentsReadiness() {
  const { openPayments } = getConfig();
  const checks = {
    OP_WALLET_ADDRESS_URL: Boolean(openPayments.walletAddressUrl),
    OP_KEY_ID: Boolean(openPayments.keyId),
    privateKeyFile: existsSync(openPayments.privateKeyPath),
  };

  return {
    ready: Object.values(checks).every(Boolean),
    checks,
    privateKeyPath: openPayments.privateKeyPath,
  };
}

/** SGD cashback wallet (fkmn-rewards) — signs outgoing reward payments. */
export function getRewardsReadiness() {
  const { rewards } = getConfig();
  const checks = {
    OP_REWARDS_WALLET_URL: Boolean(rewards.walletAddressUrl),
    OP_REWARDS_KEY_ID: Boolean(rewards.keyId),
    rewardsPrivateKeyFile: existsSync(rewards.privateKeyPath),
  };
  const ready = Object.values(checks).every(Boolean);
  return {
    ready,
    checks,
    message: ready
      ? "Rewards wallet configured for SGD cashback payout."
      : "Set OP_REWARDS_WALLET_URL and OP_REWARDS_KEY_ID (and key file) for cashback payout.",
  };
}
