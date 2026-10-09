import { OpenPaymentsClientError } from "@interledger/open-payments";
import { getConfig } from "../config.js";
import { minorToMajorString } from "../rewards/cashbackMath.js";
import {
  getStandingGrantAccessToken,
  invalidateStoredStandingGrant,
} from "../rewards/standingGrantSetup.js";
import {
  createOutgoingPaymentFromGrant,
  createQuoteForIncomingPayment,
  finalizeOutgoingPayment,
  requestInteractiveOutgoingGrant,
  requestNonInteractiveOutgoingGrant,
} from "./grant.js";
import { createOpenIncomingOnReceiver } from "./incomingPayment.js";

export async function startCashbackPayout(
  rewardsClient,
  orderId,
  buyerWalletUrl,
  cashbackMinor,
  assetCode,
  assetScale,
) {
  if (BigInt(cashbackMinor) <= 0n) {
    return { status: "skipped", message: "Cashback amount is zero." };
  }

  const { incomingPayment } = await createOpenIncomingOnReceiver(
    rewardsClient,
    buyerWalletUrl,
  );

  const { rewards, webPublicUrl } = getConfig();
  const { sendingWalletAddress, quote } = await createQuoteForIncomingPayment(
    rewardsClient,
    rewards.walletAddressUrl,
    incomingPayment.id,
    { value: cashbackMinor, assetCode, assetScale },
  );

  const autoAccessToken = await requestNonInteractiveOutgoingGrant(
    rewardsClient,
    sendingWalletAddress,
    quote,
  );

  if (autoAccessToken) {
    const outgoingPayment = await createOutgoingPaymentFromGrant(
      rewardsClient,
      sendingWalletAddress,
      quote.id,
      autoAccessToken,
    );
    return {
      status: "paid",
      outgoingPaymentId: outgoingPayment.id,
      cashbackMajor: minorToMajorString(cashbackMinor, assetScale),
      assetCode,
    };
  }

  const standingToken = getStandingGrantAccessToken();
  if (standingToken) {
    try {
      const outgoingPayment = await createOutgoingPaymentFromGrant(
        rewardsClient,
        sendingWalletAddress,
        quote.id,
        standingToken,
      );
      return {
        status: "paid",
        outgoingPaymentId: outgoingPayment.id,
        cashbackMajor: minorToMajorString(cashbackMinor, assetScale),
        assetCode,
      };
    } catch (err) {
      if (err instanceof OpenPaymentsClientError) {
        invalidateStoredStandingGrant();
      } else {
        throw err;
      }
    }
  }

  const grant = await requestInteractiveOutgoingGrant(
    rewardsClient,
    sendingWalletAddress,
    quote,
    `${webPublicUrl}/pay/rewards-callback?orderId=${orderId}`,
  );

  return {
    status: "awaiting_approval",
    cashbackMajor: minorToMajorString(cashbackMinor, assetScale),
    assetCode,
    quoteId: quote.id,
    interactRedirect: grant.interactRedirect,
    grantContinueUri: grant.continueUri,
    grantContinueAccessToken: grant.continueAccessToken,
  };
}

export async function completeCashbackPayout(rewardsClient, row, interactRef) {
  const { rewards } = getConfig();
  const outgoingPayment = await finalizeOutgoingPayment(
    rewardsClient,
    {
      walletUrl: rewards.walletAddressUrl,
      grantContinueUri: row.grant_continue_uri,
      grantContinueAccessToken: row.grant_continue_access_token,
      quoteId: row.quote_id,
    },
    interactRef,
    "Rewards grant was not finalized. Approve cashback in the rewards wallet first.",
  );

  return {
    status: "paid",
    outgoingPaymentId: outgoingPayment.id,
    cashbackMajor: minorToMajorString(row.cashback_minor, row.asset_scale),
    assetCode: row.asset_code,
  };
}
