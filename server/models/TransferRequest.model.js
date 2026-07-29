import mongoose from "mongoose";

// EIP-55 checksums are PRESERVED (we never lowercase) so the stored value
// stays a faithful snapshot of the wallet address agreed at request time.
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * TransferRequest
 * ----------------
 * Off-chain workflow + audit entity for the land ownership transfer process.
 *
 * A transfer is asynchronous and multi-actor:
 *   buyer requests  ->  admin reviews  ->  smart contract transferOwnership()
 *
 * The blockchain stores only FINAL ownership and has no concept of a
 * "pending request". This collection owns that intermediate state, carries
 * the data the on-chain call needs, and records the on-chain result.
 */
const transferRequestSchema = new mongoose.Schema(
  {
    // The land whose ownership is being requested.
    land: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Land",
      required: [true, "Land reference is required"],
    },

    // Owner of the land WHEN the request was created (the seller).
    // Snapshotted so a stale request can be detected if ownership changes
    // before the admin reviews it.
    currentOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Current owner reference is required"],
    },

    // The user requesting to acquire the land.
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer reference is required"],
    },

    // Ethereum address that will receive ownership on-chain.
    // Snapshotted from the buyer's wallet at request time: the buyer could
    // later change their User.walletAddress, but the transfer must execute
    // to the address agreed when the request was filed.
    buyerWalletAddress: {
      type: String,
      required: [true, "Buyer wallet address is required"],
      trim: true,
      match: [ETH_ADDRESS_REGEX, "Invalid Ethereum wallet address"],
    },

    // Optional note from the buyer to the admin / seller.
    requestMessage: {
      type: String,
      trim: true,
      maxlength: [500, "Request message cannot exceed 500 characters"],
      default: "",
    },

    // Lifecycle state — 5-state machine for an asynchronous transfer with
    // a real-world two-tier approval (owner consents, then admin executes):
    //   buyer_requested -> buyer submitted; awaiting owner review
    //   owner_approved  -> current owner consented; awaiting admin review
    //   admin_approved  -> admin claimed it for processing: on-chain tx in
    //                      flight, or chain succeeded but DB commit failed
    //                      (needs reconciliation)
    //   completed       -> on-chain transfer executed, ownership finalized (terminal)
    //   rejected        -> owner or admin declined (terminal)
    status: {
      type: String,
      enum: {
        values: [
          "buyer_requested",
          "owner_approved",
          "admin_approved",
          "rejected",
          "completed",
        ],
        message: "{VALUE} is not a valid transfer request status",
      },
      default: "buyer_requested",
    },

    // Reason recorded by the admin when a request is rejected.
    // Added for consistency with Land.model.js (Phase 0 reject flow).
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
      default: null,
    },

    // Ethereum tx hash of the on-chain transferOwnership() call.
    // Populated only after an approved request is mined on Ganache.
    transactionHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/* -------------------------------- Indexes -------------------------------- */

// HARD GUARANTEE: a buyer may have at most ONE active request per land,
// where "active" means anywhere in the approval workflow — buyer_requested
// or owner_approved. Once the admin claims it (admin_approved) it can no
// longer be duplicated by the buyer anyway because rejection/completion
// will terminate it. A partial unique index enforces this at the database
// level, which is race-condition-safe -- an application-level findOne()
// check alone is not, because two concurrent requests can both pass the
// check before either saves.
transferRequestSchema.index(
  { buyer: 1, land: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["buyer_requested", "owner_approved"] },
    },
    name: "uniq_active_request_per_buyer_land",
  }
);

// Admin: all requests targeting a given land, filtered by status.
// Also serves land-only queries (compound index prefix).
transferRequestSchema.index({ land: 1, status: 1 });

// Buyer dashboard: "my transfer requests", filtered by status.
transferRequestSchema.index({ buyer: 1, status: 1 });

// Owner dashboard: incoming requests on lands I currently own.
transferRequestSchema.index({ currentOwner: 1, status: 1 });

// Admin queue: all pending requests across the system, newest first.
transferRequestSchema.index({ status: 1, createdAt: -1 });

/* ------------------------------ Validation ------------------------------- */

// A user cannot buy land from themselves.
// Mongoose 9 dropped the callback-style `next` from middleware hooks — hooks
// must throw (or return a rejected Promise) to fail validation. Calling the
// old `next()` here threw "TypeError: next is not a function" on every create.
transferRequestSchema.pre("validate", function () {
  if (this.buyer && this.currentOwner && this.buyer.equals(this.currentOwner)) {
    throw new Error("Buyer and current owner cannot be the same user");
  }
});

export default mongoose.model("TransferRequest", transferRequestSchema);
