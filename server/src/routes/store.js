import { Router } from "express";
import { loadCatalog } from "../catalog.js";
import { getConfig } from "../config.js";

export const storeRouter = Router();

storeRouter.get("/", (_req, res) => {
  let catalog;
  try {
    catalog = loadCatalog();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load catalog.";
    const missing = message.includes("not found");
    return res.status(missing ? 503 : 500).json({
      error: missing ? "catalog_not_configured" : "catalog_invalid",
      message,
      halt: missing,
    });
  }

  const receiver = getConfig().openPayments.storeReceiverWalletUrl;
  return res.json({
    ...catalog,
    ...(receiver ? { receiverWalletUrl: receiver } : {}),
  });
});
