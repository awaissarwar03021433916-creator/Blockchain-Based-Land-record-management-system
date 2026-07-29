import express from "express";
import {
  registerNewLand,
  listLandForSale,
  getLandHistory,
} from "../controllers/land.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  validateLandSubmission,
  validateLandListing,
  validateObjectId,
} from "../middlewares/validate.middleware.js";

const router = express.Router();

// New /submit semantics: VERIFIED SALE LISTING. The caller declares
// ownership of an already-registered land and asks for it to be listed
// in the marketplace; the controller cross-checks JWT + MongoDB + chain
// before flipping listedForSale=true.
router.post("/submit", protect, validateLandListing, listLandForSale);

// Original /submit semantics (new-land registration → pending → admin
// approves → on-chain registerLand) moved to /register. Same controller
// logic, same auth chain, same body shape — only the path changed.
router.post("/register", protect, validateLandSubmission, registerNewLand);

// Provenance: any authenticated user can read the full ownership chain
// for a land. Audit data is shared across roles by design.
router.get("/:id/history", protect, validateObjectId("id"), getLandHistory);

export default router;
