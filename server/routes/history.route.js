import express from "express";
import { getMyOwnershipHistory } from "../controllers/history.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

/**
 * History routes — user-scoped reads against the OwnershipHistory
 * ledger. Per-land history lives under `/api/land/:id/history`.
 */
const router = express.Router();

// Every history route requires authentication; data-level scoping is
// the controller's responsibility (filters by req.user.id).
router.use(protect);

// "Lands I have ever owned" feed — every chain event the caller was a
// party to, newest first.
router.get("/my-history", getMyOwnershipHistory);

export default router;
