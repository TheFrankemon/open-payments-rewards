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

export function getConfig() {
  return {
    port: Number(process.env.PORT ?? 3001),
    webPublicUrl: (process.env.WEB_PUBLIC_URL ?? "http://localhost:5173").replace(
      /\/$/,
      "",
    ),
    openPayments: {
      walletAddressUrl: (process.env.OP_WALLET_ADDRESS_URL ?? "").replace(
        /\/$/,
        "",
      ),
      keyId: (process.env.OP_KEY_ID ?? "").trim(),
      privateKeyPath: resolvePrivateKeyPath(process.env.OP_PRIVATE_KEY_PATH),
    },
    repoRoot,
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
