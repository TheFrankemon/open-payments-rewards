import { isFinalizedGrant } from "@interledger/open-payments";
import { majorToMinorString } from "../amount.js";
import { getConfig } from "../config.js";
import {
  clearPendingStandingGrant,
  clearStandingGrantAccessToken,
  getPendingStandingGrant,
  getStoredStandingGrantAccessToken,
  hasStandingGrantConfigured,
  savePendingStandingGrant,
  saveStandingGrantAccessToken,
} from "../db/standingGrant.js";
import { requestStandingInteractiveOutgoingGrant } from "../op/grant.js";
import { getRewardsOpenPaymentsClient } from "../op/rewardsClient.js";

function standingGrantAccessTokenFromEnv() {
  const raw = (process.env.OP_REWARDS_STANDING_GRANT_ACCESS_TOKEN ?? "").trim();
  return raw || null;
}

/** Active token: env override, else SQLite from one-time wallet setup. */
export function getStandingGrantAccessToken() {
  return standingGrantAccessTokenFromEnv() ?? getStoredStandingGrantAccessToken();
}

export function getStandingGrantStatus() {
  const fromEnv = Boolean(standingGrantAccessTokenFromEnv());
  const fromDb = hasStandingGrantConfigured();
  return {
    configured: Boolean(getStandingGrantAccessToken()),
    source: fromEnv ? "env" : fromDb ? "database" : null,
  };
}

function standingGrantLimits(walletAddress) {
  const { rewards } = getConfig();
  const debitMajor =
    process.env.OP_REWARDS_STANDING_DEBIT_MAJOR?.trim() || "5000";
  const interval =
    process.env.OP_REWARDS_STANDING_INTERVAL?.trim() ||
    `R/${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}/P1D`;

  return {
    interval,
    debitAmount: {
      value: majorToMinorString(debitMajor, walletAddress.assetScale),
      assetCode: walletAddress.assetCode,
      assetScale: walletAddress.assetScale,
    },
  };
}

export async function startStandingGrantSetup() {
  const client = await getRewardsOpenPaymentsClient();
  const { rewards, webPublicUrl } = getConfig();
  const walletAddress = await client.walletAddress.get({
    url: rewards.walletAddressUrl,
  });

  const grant = await requestStandingInteractiveOutgoingGrant(
    client,
    walletAddress,
    standingGrantLimits(walletAddress),
    `${webPublicUrl}/pay/rewards-grant-setup`,
  );

  savePendingStandingGrant({
    grantContinueUri: grant.continueUri,
    grantContinueAccessToken: grant.continueAccessToken,
  });

  return { interactRedirect: grant.interactRedirect };
}

export async function completeStandingGrantSetup(interactRef) {
  const pending = getPendingStandingGrant();
  if (!pending) {
    const err = new Error("No standing grant setup in progress.");
    err.name = "NotFoundError";
    throw err;
  }

  const client = await getRewardsOpenPaymentsClient();
  const finalizedGrant = await client.grant.continue(
    {
      url: pending.grant_continue_uri,
      accessToken: pending.grant_continue_access_token,
    },
    { interact_ref: interactRef },
  );

  if (!isFinalizedGrant(finalizedGrant)) {
    const err = new Error(
      "Rewards wallet did not approve the standing grant. Try again.",
    );
    err.name = "GrantNotFinalizedError";
    throw err;
  }

  saveStandingGrantAccessToken(finalizedGrant.access_token.value);
  clearPendingStandingGrant();
  return getStandingGrantStatus();
}

export function invalidateStoredStandingGrant() {
  if (!standingGrantAccessTokenFromEnv()) {
    clearStandingGrantAccessToken();
  }
}
