import { getRewardsDb } from "./rewards.js";

export function initStandingGrantTables() {
  const database = getRewardsDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS rewards_standing_grant (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rewards_standing_grant_pending (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      grant_continue_uri TEXT NOT NULL,
      grant_continue_access_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getStoredStandingGrantAccessToken() {
  const database = getRewardsDb();
  const row = database
    .prepare(`SELECT access_token FROM rewards_standing_grant WHERE id = 1`)
    .get();
  return row?.access_token ?? null;
}

export function saveStandingGrantAccessToken(accessToken) {
  const database = getRewardsDb();
  database
    .prepare(
      `INSERT INTO rewards_standing_grant (id, access_token, updated_at)
       VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         access_token = excluded.access_token,
         updated_at = excluded.updated_at`,
    )
    .run(accessToken);
}

export function clearStandingGrantAccessToken() {
  const database = getRewardsDb();
  database.prepare(`DELETE FROM rewards_standing_grant WHERE id = 1`).run();
}

export function savePendingStandingGrant({ grantContinueUri, grantContinueAccessToken }) {
  const database = getRewardsDb();
  database
    .prepare(
      `INSERT INTO rewards_standing_grant_pending (
         id, grant_continue_uri, grant_continue_access_token
       ) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         grant_continue_uri = excluded.grant_continue_uri,
         grant_continue_access_token = excluded.grant_continue_access_token,
         created_at = datetime('now')`,
    )
    .run(grantContinueUri, grantContinueAccessToken);
}

export function getPendingStandingGrant() {
  const database = getRewardsDb();
  return database
    .prepare(
      `SELECT grant_continue_uri, grant_continue_access_token
       FROM rewards_standing_grant_pending WHERE id = 1`,
    )
    .get();
}

export function clearPendingStandingGrant() {
  const database = getRewardsDb();
  database.prepare(`DELETE FROM rewards_standing_grant_pending WHERE id = 1`).run();
}

export function hasStandingGrantConfigured() {
  return Boolean(getStoredStandingGrantAccessToken());
}
