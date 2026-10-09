import cors from "cors";
import express from "express";
import { getConfig, getOpenPaymentsReadiness } from "./config.js";
import { paymentsRouter } from "./routes/payments.js";

const { port, webPublicUrl } = getConfig();
const app = express();

app.use(
  cors({
    origin: webPublicUrl,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/payments", paymentsRouter);

app.get("/api/open-payments/readiness", (_req, res) => {
  const readiness = getOpenPaymentsReadiness();
  res.json({
    ...readiness,
    halt: !readiness.ready,
    message: readiness.ready
      ? "Credentials look configured. Safe to proceed with M3 (incoming payment)."
      : "HALT: Copy .env.example to .env, set OP_WALLET_ADDRESS_URL and OP_KEY_ID, and place private.key before M3.",
  });
});

app.listen(port, () => {
  const readiness = getOpenPaymentsReadiness();
  console.log(`API http://localhost:${port}`);
  console.log(`CORS origin ${webPublicUrl}`);
  if (!readiness.ready) {
    console.log(
      "Open Payments: not configured yet (expected until you add secrets).",
    );
    console.log(`Check: GET http://localhost:${port}/api/open-payments/readiness`);
  }
});
