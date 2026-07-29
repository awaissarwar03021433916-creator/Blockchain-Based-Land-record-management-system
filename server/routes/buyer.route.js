import express from "express";
import {
  getApprovedLands,
  createTransferRequest,
  getMyTransferRequests,
} from "../controllers/buyer.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validateTransferRequest } from "../middlewares/validate.middleware.js";

const router = express.Router();

// Every buyer route requires an authenticated user with the "buyer" role.
router.use(protect, authorizeRoles("buyer"));

// Marketplace — approved lands available to request.
// Two aliases kept in lockstep: `/lands` (original) and `/approved-lands`
// (the canonical name used by the frontend / API spec).
router.get("/lands", getApprovedLands);
router.get("/approved-lands", getApprovedLands);

// Transfer requests — create one, and list the buyer's own history.
// `/transfer-requests` (POST) and `/request-transfer` are aliases of the
// same create handler; the spec uses the verb form while the original used
// the resource form. Both share the same validator + controller.
router.post("/transfer-requests", validateTransferRequest, createTransferRequest);
router.post("/request-transfer", validateTransferRequest, createTransferRequest);
router.get("/transfer-requests", getMyTransferRequests);

export default router;
