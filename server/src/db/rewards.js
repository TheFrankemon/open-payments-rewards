import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getConfig } from "../config.js";

let db;

function dbPath() {
  return resolve(getConfig().repoRoot, "rewards.sqlite");
}

export function initRewardsDb() {
  if (db) return db;
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      payer_wallet_url TEXT NOT NULL,
      receiver_wallet_url TEXT NOT NULL,
      paid_minor TEXT NOT NULL,
      paid_asset_code TEXT NOT NULL,
      paid_asset_scale INTEGER NOT NULL,
      debit_minor TEXT,
      debit_asset_code TEXT,
      debit_asset_scale INTEGER,
      outgoing_payment_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cashback_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL REFERENCES orders(id),
      buyer_wallet_url TEXT NOT NULL,
      cashback_minor TEXT NOT NULL,
      asset_code TEXT NOT NULL,
      asset_scale INTEGER NOT NULL,
      status TEXT NOT NULL,
      payout_outgoing_payment_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cashback_buyer ON cashback_ledger(buyer_wallet_url);
  `);
  migrateCashbackLedger(db);
  return db;
}

function migrateCashbackLedger(database) {
  const cols = database.prepare("PRAGMA table_info(cashback_ledger)").all();
  const names = new Set(cols.map((c) => c.name));
  const addCol = (name, type) => {
    if (!names.has(name)) {
      database.exec(`ALTER TABLE cashback_ledger ADD COLUMN ${name} ${type}`);
    }
  };
  addCol("quote_id", "TEXT");
  addCol("grant_continue_uri", "TEXT");
  addCol("grant_continue_access_token", "TEXT");
  addCol("interact_redirect", "TEXT");
}

export function getRewardsDb() {
  return db ?? initRewardsDb();
}

export function getCashbackForOrder(orderId) {
  const database = getRewardsDb();
  return database
    .prepare(`SELECT * FROM cashback_ledger WHERE order_id = ?`)
    .get(orderId);
}

export function recordPaidOrder({
  sessionId,
  payerWalletUrl,
  receiverWalletUrl,
  paidMinor,
  paidAssetCode,
  paidAssetScale,
  debitMinor,
  debitAssetCode,
  debitAssetScale,
  outgoingPaymentId,
}) {
  const database = getRewardsDb();
  database
    .prepare(
      `INSERT INTO orders (
        id, session_id, payer_wallet_url, receiver_wallet_url,
        paid_minor, paid_asset_code, paid_asset_scale,
        debit_minor, debit_asset_code, debit_asset_scale,
        outgoing_payment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      sessionId,
      sessionId,
      payerWalletUrl,
      receiverWalletUrl,
      paidMinor,
      paidAssetCode,
      paidAssetScale,
      debitMinor ?? null,
      debitAssetCode ?? null,
      debitAssetScale ?? null,
      outgoingPaymentId,
    );
}

export function insertCashbackEntry({
  orderId,
  buyerWalletUrl,
  cashbackMinor,
  assetCode,
  assetScale,
  status,
  payoutOutgoingPaymentId,
  errorMessage,
}) {
  const database = getRewardsDb();
  const result = database
    .prepare(
      `INSERT INTO cashback_ledger (
        order_id, buyer_wallet_url, cashback_minor,
        asset_code, asset_scale, status,
        payout_outgoing_payment_id, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      orderId,
      buyerWalletUrl,
      cashbackMinor,
      assetCode,
      assetScale,
      status,
      payoutOutgoingPaymentId ?? null,
      errorMessage ?? null,
    );
  return result.lastInsertRowid;
}

export function updateCashbackEntry(id, patch) {
  const database = getRewardsDb();
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(patch)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return;
  values.push(id);
  database
    .prepare(`UPDATE cashback_ledger SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);
}

export function getBuyerRewardsSummary(buyerWalletUrl) {
  const database = getRewardsDb();
  const normalized = buyerWalletUrl.replace(/\/$/, "");
  const rows = database
    .prepare(
      `SELECT cashback_minor, asset_code, asset_scale, status
       FROM cashback_ledger
       WHERE buyer_wallet_url = ?`,
    )
    .all(normalized);

  const byAsset = new Map();
  for (const row of rows) {
    const key = `${row.asset_code}:${row.asset_scale}`;
    if (!byAsset.has(key)) {
      byAsset.set(key, {
        assetCode: row.asset_code,
        assetScale: row.asset_scale,
        earnedMinor: 0n,
        paidMinor: 0n,
        pendingMinor: 0n,
      });
    }
    const bucket = byAsset.get(key);
    const minor = BigInt(row.cashback_minor);
    bucket.earnedMinor += minor;
    if (row.status === "paid") bucket.paidMinor += minor;
    else if (
      row.status === "pending" ||
      row.status === "awaiting_approval" ||
      row.status === "failed"
    ) {
      bucket.pendingMinor += minor;
    }
  }

  return {
    buyerWalletUrl: normalized,
    totals: [...byAsset.values()].map((b) => ({
      assetCode: b.assetCode,
      assetScale: b.assetScale,
      earnedMinor: String(b.earnedMinor),
      paidMinor: String(b.paidMinor),
      pendingMinor: String(b.pendingMinor),
    })),
  };
}

export function getBuyerCashbackHistory(buyerWalletUrl, limit = 50) {
  const database = getRewardsDb();
  const normalized = buyerWalletUrl.replace(/\/$/, "");
  return database
    .prepare(
      `SELECT id, order_id, cashback_minor, asset_code, asset_scale,
              status, payout_outgoing_payment_id, error_message, created_at
       FROM cashback_ledger
       WHERE buyer_wallet_url = ?
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(normalized, limit);
}

export function rewardsDbExists() {
  return existsSync(dbPath());
}
