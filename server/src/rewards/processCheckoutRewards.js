import { OpenPaymentsClientError } from "@interledger/open-payments";
import { majorToMinorString } from "../amount.js";
import { getRewardsReadiness, getConfig } from "../config.js";
import {
  getCashbackForOrder,
  insertCashbackEntry,
  recordPaidOrder,
  updateCashbackEntry,
} from "../db/rewards.js";
import {
  completeCashbackPayout,
  startCashbackPayout,
} from "../op/cashbackPayout.js";
import { getRewardsOpenPaymentsClient } from "../op/rewardsClient.js";
import { computeCashbackMinor, minorToMajorString } from "./cashbackMath.js";

const CASHBACK_APPROVE_MSG =
  "Approve sending SGD cashback from the rewards wallet (one extra wallet step on testnet).";

function opErrorMessage(err) {
  if (err instanceof OpenPaymentsClientError) {
    return err.description || err.message;
  }
  return err instanceof Error ? err.message : "Cashback payout failed.";
}

function rowToClientPayload(row) {
  return {
    ledgerId: row.id,
    status: row.status,
    cashbackMajor: minorToMajorString(row.cashback_minor, row.asset_scale),
    assetCode: row.asset_code,
    outgoingPaymentId: row.payout_outgoing_payment_id ?? undefined,
    interactRedirect: row.interact_redirect ?? undefined,
    message:
      row.status === "awaiting_approval" && row.interact_redirect
        ? CASHBACK_APPROVE_MSG
        : (row.error_message ?? undefined),
  };
}

export async function processCheckoutRewards(session, outgoingPaymentId) {
  const existing = getCashbackForOrder(session.id);
  if (existing) return rowToClientPayload(existing);

  const debit = session.debitAmount?.value
    ? {
        minor: String(session.debitAmount.value),
        assetCode: session.debitAmount.assetCode,
        assetScale: session.debitAmount.assetScale,
      }
    : {
        minor: session.amountMinor,
        assetCode: session.assetCode,
        assetScale: session.assetScale,
      };

  recordPaidOrder({
    sessionId: session.id,
    payerWalletUrl: session.payerWalletUrl,
    receiverWalletUrl: session.receiverWalletUrl,
    paidMinor: session.amountMinor,
    paidAssetCode: session.assetCode,
    paidAssetScale: session.assetScale,
    debitMinor: debit.minor,
    debitAssetCode: debit.assetCode,
    debitAssetScale: debit.assetScale,
    outgoingPaymentId,
  });

  const readiness = getRewardsReadiness();
  if (!readiness.ready) {
    return {
      status: "pending",
      assetCode: "SGD",
      message: readiness.message,
    };
  }

  let ledgerId;
  try {
    const rewardsClient = await getRewardsOpenPaymentsClient();
    const { rewards } = getConfig();
    const wa = await rewardsClient.walletAddress.get({
      url: rewards.walletAddressUrl,
    });
    const purchaseMinor = majorToMinorString(
      session.amountMajor,
      wa.assetScale,
    );
    const cashbackMinor = computeCashbackMinor(
      purchaseMinor,
      rewards.cashbackRateBps,
    );

    if (cashbackMinor === "0") {
      insertCashbackEntry({
        orderId: session.id,
        buyerWalletUrl: session.payerWalletUrl,
        cashbackMinor: "0",
        assetCode: wa.assetCode,
        assetScale: wa.assetScale,
        status: "skipped",
        errorMessage: "Purchase too small for 2% cashback (rounds to zero).",
      });
      return {
        status: "skipped",
        cashbackMajor: "0.00",
        assetCode: wa.assetCode,
        message: "Purchase too small for 2% cashback (rounds to zero).",
      };
    }

    ledgerId = insertCashbackEntry({
      orderId: session.id,
      buyerWalletUrl: session.payerWalletUrl,
      cashbackMinor,
      assetCode: wa.assetCode,
      assetScale: wa.assetScale,
      status: "pending",
    });

    const payout = await startCashbackPayout(
      rewardsClient,
      session.id,
      session.payerWalletUrl,
      cashbackMinor,
      wa.assetCode,
      wa.assetScale,
    );

    if (payout.status === "awaiting_approval") {
      updateCashbackEntry(ledgerId, {
        status: "awaiting_approval",
        quote_id: payout.quoteId,
        grant_continue_uri: payout.grantContinueUri,
        grant_continue_access_token: payout.grantContinueAccessToken,
        interact_redirect: payout.interactRedirect,
        error_message: null,
      });
      return {
        ...rowToClientPayload(getCashbackForOrder(session.id)),
        cashbackMajor: payout.cashbackMajor,
        assetCode: payout.assetCode,
      };
    }

    updateCashbackEntry(ledgerId, {
      status: payout.status === "skipped" ? "skipped" : "pending",
      error_message: payout.message ?? null,
    });
    return {
      status: payout.status,
      cashbackMajor: minorToMajorString(cashbackMinor, wa.assetScale),
      assetCode: wa.assetCode,
      message: payout.message,
    };
  } catch (err) {
    const message = opErrorMessage(err);
    console.error("Cashback payout error:", message);
    const row = ledgerId ? getCashbackForOrder(session.id) : null;
    if (row) updateCashbackEntry(row.id, { status: "failed", error_message: message });
    return {
      status: "failed",
      assetCode: row?.asset_code ?? "SGD",
      cashbackMajor: row
        ? minorToMajorString(row.cashback_minor, row.asset_scale)
        : undefined,
      message,
    };
  }
}

export async function completeOrderCashback(orderId, interactRef) {
  const row = getCashbackForOrder(orderId);
  if (!row) {
    const err = new Error("Cashback record not found for this order.");
    err.name = "NotFoundError";
    throw err;
  }
  if (row.status === "paid") return rowToClientPayload(row);
  if (row.status !== "awaiting_approval") {
    throw new Error(`Cashback status is "${row.status}", cannot complete.`);
  }

  const result = await completeCashbackPayout(
    await getRewardsOpenPaymentsClient(),
    row,
    interactRef,
  );

  updateCashbackEntry(row.id, {
    status: "paid",
    payout_outgoing_payment_id: result.outgoingPaymentId,
    error_message: null,
  });

  return rowToClientPayload(getCashbackForOrder(orderId));
}
