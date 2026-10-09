#!/usr/bin/env node
/**
 * Checks that OP_KEY_ID / OP_REWARDS_KEY_ID match the kid on each wallet's jwks.json
 * and that the local PEM public key matches that JWK.
 */
import { createPrivateKey, createPublicKey } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const path = resolve(repoRoot, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

function publicKeyBase64Url(pemPath) {
  const pub = createPublicKey(createPrivateKey(readFileSync(pemPath, "utf8")));
  const spki = pub.export({ type: "spki", format: "der" });
  return Buffer.from(spki.subarray(-32)).toString("base64url");
}

async function check(label, walletUrl, keyId, pemPath) {
  const wallet = walletUrl.replace(/\/$/, "");
  if (!wallet || !keyId || !existsSync(pemPath)) {
    console.log(`${label}: SKIP (missing wallet, key id, or ${pemPath})`);
    return false;
  }

  const res = await fetch(`${wallet}/jwks.json`);
  if (!res.ok) {
    console.log(`${label}: FAIL could not fetch ${wallet}/jwks.json (${res.status})`);
    return false;
  }
  const { keys } = await res.json();
  const localX = publicKeyBase64Url(pemPath);
  const byKid = keys.find((k) => k.kid === keyId);
  const byX = keys.find((k) => k.x === localX);

  if (byKid && byKid.x === localX) {
    console.log(`${label}: OK (kid matches PEM)`);
    return true;
  }
  if (byX) {
    console.log(
      `${label}: FAIL OP_KEY_ID is wrong — use kid ${byX.kid} (PEM matches jwks)`,
    );
    return false;
  }
  console.log(
    `${label}: FAIL key id ${keyId} not on jwks; PEM does not match any published key`,
  );
  console.log(`  Published kids: ${keys.map((k) => k.kid).join(", ")}`);
  return false;
}

const payerPem = resolve(
  repoRoot,
  process.env.OP_PRIVATE_KEY_PATH?.trim() || "private.key",
);
const rewardsPem = resolve(
  repoRoot,
  process.env.OP_REWARDS_PRIVATE_KEY_PATH?.trim() || "rewards.key",
);

const ok1 = await check(
  "Checkout (OP_WALLET)",
  process.env.OP_WALLET_ADDRESS_URL,
  process.env.OP_KEY_ID?.trim(),
  payerPem,
);
const ok2 = await check(
  "Rewards (OP_REWARDS)",
  process.env.OP_REWARDS_WALLET_URL,
  process.env.OP_REWARDS_KEY_ID?.trim(),
  rewardsPem,
);

process.exit(ok1 && ok2 ? 0 : 1);
