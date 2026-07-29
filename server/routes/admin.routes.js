import express from "express";
import {
  getAdminStats,
  getPendingLands,
  approveLand,
  rejectLand,
} from "../controllers/admin.controller.js";
import {
  getPendingTransferRequests,
  approveTransferRequest,
  rejectTransferRequest,
} from "../controllers/adminTransfer.controller.js";
import {
  getPendingListings,
  approveListing,
  rejectListing,
} from "../controllers/adminListing.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import {
  validateObjectId,
  validateRejectReason,
} from "../middlewares/validate.middleware.js";

const router = express.Router();

// Every admin route requires an authenticated user with the "admin" role.
router.use(protect, isAdmin);

/* ------------------------------ Dashboard ------------------------------- */
// Aggregated counts for the admin overview surface — one round-trip.
router.get("/stats", getAdminStats);

/* ----------------------- Land registration management ------------------- */
router.get("/pending-lands", getPendingLands);
router.put("/approve-land/:landId", validateObjectId("landId"), approveLand);
router.put("/reject-land/:landId", validateObjectId("landId"), rejectLand);

/* ------------------------ Transfer request management -------------------- */
// `/pending-transfer-requests` is the original path; `/transfer-requests`
// is the canonical name used by the frontend / API spec. Both list the
// admin's pending-review queue via the same controller.
router.get("/pending-transfer-requests", getPendingTransferRequests);
router.get("/transfer-requests", getPendingTransferRequests);

router.put(
  "/approve-transfer-request/:requestId",
  validateObjectId("requestId"),
  approveTransferRequest
);
// Spec form uses `:id`; the controller reads `req.params.requestId`, so we
// alias the param in a one-line shim rather than fork the controller.
router.put(
  "/approve-transfer/:id",
  validateObjectId("id"),
  (req, _res, next) => {
    req.params.requestId = req.params.id;
    next();
  },
  approveTransferRequest
);

router.put(
  "/reject-transfer-request/:requestId",
  validateObjectId("requestId"),
  validateRejectReason,
  rejectTransferRequest
);
// Spec form mirrors the approve alias: `/reject-transfer/:id` shims onto
// the same controller, which reads `req.params.requestId`.
router.put(
  "/reject-transfer/:id",
  validateObjectId("id"),
  validateRejectReason,
  (req, _res, next) => {
    req.params.requestId = req.params.id;
    next();
  },
  rejectTransferRequest
);

/* ------------------------- Sale-listing moderation ----------------------- */
router.get("/pending-listings", getPendingListings);
router.put(
  "/approve-listing/:id",
  validateObjectId("id"),
  approveListing
);
router.put(
  "/reject-listing/:id",
  validateObjectId("id"),
  validateRejectReason,
  rejectListing
);

export default router;
