import { Router } from "express";
import { OpenPaymentsClientError } from "@interledger/open-payments";
import { getConfig } from "../config.js";
import {
  getBuyerCashbackHistory,
  getBuyerRewardsSummary,
} from "../db/rewards.js";
import { parseInteractRef } from "../interactRef.js";
import { completeOrderCashback } from "../rewards/processCheckoutRewards.js";

export const rewardsRouter = Router();

function buyerWallet(req) {
  const wallet =
    (typeof req.query.wallet === "string" ? req.query.wallet.trim() : "") ||
    getConfig().openPayments.walletAddressUrl;
  return wallet ? wallet.replace(/\/$/, "") : "";
}

function requireBuyerWallet(req, res) {
  const wallet = buyerWallet(req);
  if (!wallet) {
    res.status(400).json({
      error: "validation_error",
      message: "Pass ?wallet= or set OP_WALLET_ADDRESS_URL (buyer wallet).",
    });
    return "";
  }
  return wallet;
}

rewardsRouter.get("/", (req, res) => {
  const wallet = requireBuyerWallet(req, res);
  if (!wallet) return;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  return res.json({
    ...getBuyerRewardsSummary(wallet),
    entries: getBuyerCashbackHistory(wallet, limit).filter(
      (e) => e.status !== "skipped",
    ),
  });
});

rewardsRouter.get("/summary", (req, res) => {
  const wallet = requireBuyerWallet(req, res);
  if (!wallet) return;
  return res.json(getBuyerRewardsSummary(wallet));
});

rewardsRouter.post("/orders/:orderId/complete-cashback", async (req, res) => {
  const interactRef = parseInteractRef(req.body, req.query);
  if (!interactRef) {
    return res.status(400).json({
      error: "missing_interact_ref",
      message: "Missing interact_ref from wallet redirect.",
    });
  }

  try {
    const rewards = await completeOrderCashback(req.params.orderId, interactRef);
    return res.json({ rewards });
  } catch (err) {
    if (err instanceof Error && err.name === "NotFoundError") {
      return res.status(404).json({
        error: "cashback_not_found",
        message: err.message,
      });
    }
    if (err instanceof Error && err.name === "GrantNotFinalizedError") {
      return res.status(409).json({
        error: "grant_not_finalized",
        message: err.message,
      });
    }
    if (err instanceof OpenPaymentsClientError) {
      return res.status(502).json({
        error: "open_payments_error",
        message: err.description || err.message,
      });
    }
    console.error(err);
    return res.status(500).json({
      error: "internal_error",
      message: err instanceof Error ? err.message : "Unexpected error.",
    });
  }
});

rewardsRouter.get("/history", (req, res) => {
  const wallet = requireBuyerWallet(req, res);
  if (!wallet) return;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  return res.json({
    buyerWalletUrl: wallet,
    entries: getBuyerCashbackHistory(wallet, limit),
  });
});
