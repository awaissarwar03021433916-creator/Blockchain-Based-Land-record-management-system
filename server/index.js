// Load environment variables BEFORE any other import is evaluated.
// ES module imports run before the module body, so `dotenv.config()` placed
// in the body would execute too late — env vars read at import time (e.g. in
// the blockchain modules) would be undefined. `import "dotenv/config"` runs
// during the import phase, ahead of the rest of the import graph.
import "dotenv/config";

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import landRoutes from "./routes/land.route.js";
import adminRoutes from "./routes/admin.routes.js";
import buyerRoutes from "./routes/buyer.route.js";
import ownerRoutes from "./routes/owner.route.js";
import historyRoutes from "./routes/history.route.js";
import { requestLogger } from "./middlewares/logger.middleware.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";
import { verifyContractDeployment } from "../blockchain/landContract.js";

connectDB();

// The on-chain deployment check hits Ganache on every boot. During active
// backend development (frequent nodemon restarts) that's a repeated RPC call
// — and a multi-second wait if Ganache is down. Set SKIP_CHAIN_VERIFY=true in
// server/.env to skip it while iterating on non-blockchain code; it always
// runs otherwise so a stale CONTRACT_ADDRESS is still caught at startup.
if (process.env.SKIP_CHAIN_VERIFY !== "true") {
  verifyContractDeployment();
}

const app = express();

// ---- Global middleware ----
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// ---- Health check ----
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// ---- API routes ----
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/land", landRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/history", historyRoutes);

// ---- Error handling (must be registered AFTER all routes) ----
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
