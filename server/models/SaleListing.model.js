import mongoose from "mongoose";

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * SaleListing — the MARKETPLACE store.
 *
 * Separates "who owns what" (Land — the official registry) from "what's
 * for sale" (this collection). One row tracks one listing attempt across
 * its lifecycle. The current ownership state lives on Land; this model
 * lives alongside it, never inside it.
 *
 * State machine:
 *   pending_sale_approval -> listed_for_sale  (admin approves)
 *   pending_sale_approval -> not_for_sale     (admin rejects)
 *   listed_for_sale       -> sold             (a transfer completes)
 *   listed_for_sale       -> not_for_sale     (owner delists — not exposed
 *                                              as an endpoint here, but the
 *                                              state is reachable via direct
 *                                              update should it be added)
 *
 *  `not_for_sale` and `sold` are terminal — a new SaleListing must be
 *  created if the (new) owner wants to re-list. This keeps the lifecycle
 *  append-only at the listing-row level.
 */
const saleListingSchema = new mongoose.Schema(
  {
    // The Land being offered for sale.
    land: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Land",
      required: [true, "Land reference is required"],
    },

    // The owner WHEN the listing was submitted. Snapshotted so admin
    // approval can detect "land has been transferred since submission".
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner reference is required"],
    },

    // Owner's wallet at submission time — snapshotted for the same reason.
    // The chain-side verification done at submission time compared the
    // on-chain owner against THIS value.
    ownerWalletAddress: {
      type: String,
      required: [true, "Owner wallet address is required"],
      trim: true,
      match: [ETH_ADDRESS_REGEX, "Invalid Ethereum wallet address"],
    },

    state: {
      type: String,
      enum: {
        values: [
          "not_for_sale",
          "pending_sale_approval",
          "listed_for_sale",
          "sold",
        ],
        message: "{VALUE} is not a valid sale listing state",
      },
      default: "pending_sale_approval",
    },

    // Moderation metadata.
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
      default: null,
    },

    // Sale-completion metadata (set inside the admin-transfer atomic commit).
    soldAt: { type: Date, default: null },
    soldTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    soldTransactionHash: { type: String, default: null },
  },
  { timestamps: true }
);

/* -------------------------------- Indexes -------------------------------- */

// HARD GUARANTEE: at most ONE active listing per land. Active means
// pending_sale_approval or listed_for_sale. Once a listing transitions
// to sold or not_for_sale, the slot is free and a fresh listing can be
// created (the next owner re-lists with their own row).
saleListingSchema.index(
  { land: 1 },
  {
    unique: true,
    partialFilterExpression: {
      state: { $in: ["pending_sale_approval", "listed_for_sale"] },
    },
    name: "uniq_active_listing_per_land",
  }
);

// Admin queue: pending listings, oldest first (FIFO review).
saleListingSchema.index({ state: 1, createdAt: 1 });

// Marketplace: listed lands, newest first.
saleListingSchema.index({ state: 1, updatedAt: -1 });

// Owner dashboard: my listings.
saleListingSchema.index({ owner: 1, state: 1 });

export default mongoose.model("SaleListing", saleListingSchema);
