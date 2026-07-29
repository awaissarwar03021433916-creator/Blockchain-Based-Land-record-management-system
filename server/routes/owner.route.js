import express from "express";
import {
  getOwnerLands,
  getOwnerListings,
  removeOwnerListing,
  getOwnerTransferRequests,
  approveOwnerTransferRequest,
  rejectOwnerTransferRequest,
} from "../controllers/owner.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  validateObjectId,
  validateRejectReason,
} from "../middlewares/validate.middleware.js";

const router = express.Router();

// Every owner route requires an authenticated non-admin user. Role at
// signup is INTENT (am I primarily here to sell or to buy?), not a hard
// cap on capability: once a "buyer" successfully acquires land they
// become its real owner and need to be able to manage incoming transfer
// requests on it. The actual security guarantee is per-row data-level
// scoping inside each controller — `request.currentOwner === req.user.id`
// — which the role check alone cannot provide.
router.use(protect, authorizeRoles("owner", "buyer"));

// Owner's land portfolio — every land they currently own, across
// pending / approved / rejected lifecycle states.
router.get("/my-lands", getOwnerLands);

// Owner's marketplace listings — every SaleListing they have submitted,
// across all states (pending / listed / sold / not_for_sale).
router.get("/listings", getOwnerListings);

// Owner-initiated delist. Only valid on active listings; the controller
// scopes by owner so callers can't touch other owners' rows.
router.put(
  "/listings/:id/remove",
  validateObjectId("id"),
  removeOwnerListing,
);

router.get("/transfer-requests", getOwnerTransferRequests);

router.put(
  "/approve-transfer/:id",
  validateObjectId("id"),
  approveOwnerTransferRequest
);

router.put(
  "/reject-transfer/:id",
  validateObjectId("id"),
  validateRejectReason,
  rejectOwnerTransferRequest
);

export default router;
