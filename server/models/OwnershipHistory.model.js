import mongoose from "mongoose";

/**
 * OwnershipHistory
 * ----------------
 * Append-only ledger of every successful on-chain ownership transfer.
 *
 * One row per `transferOwnership()` tx that landed on-chain. Together with
 * the original Land.owner at registration time, the rows for a given land
 * reconstruct its complete provenance chain:
 *
 *   originalOwner (Land.owner at registration, or first row's previousOwner)
 *     -> row1.newOwner
 *     -> row2.newOwner
 *     -> ... = current Land.owner.
 *
 * Immutability: every business field is `immutable: true` so that even an
 * authenticated admin path cannot rewrite history through Mongoose. The
 * unique index on `transactionHash` is the race-safe backstop against
 * duplicate ledger rows for the same chain event.
 */
const ownershipHistorySchema = new mongoose.Schema(
  {
    land: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Land",
      required: [true, "Land reference is required"],
      immutable: true,
    },

    // The owner WHEN this transfer executed — the seller at the time.
    previousOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Previous owner reference is required"],
      immutable: true,
    },

    // The owner AFTER this transfer executed — the buyer at the time.
    newOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "New owner reference is required"],
      immutable: true,
    },

    // The TransferRequest that drove this transition. Kept for audit / drill-
    // down. Optional (nullable) so a future direct-registrar transfer path
    // — if one is ever added — can still produce a ledger row.
    transferRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransferRequest",
      default: null,
      immutable: true,
    },

    // Ethereum tx hash of the transferOwnership() call. Unique across the
    // collection — one chain event maps to exactly one ledger row.
    transactionHash: {
      type: String,
      required: [true, "Transaction hash is required"],
      trim: true,
      immutable: true,
    },

    // Block number the tx was mined in. Stored as Number (web3 v4 returns
    // BigInt; the service converts before passing it through).
    blockNumber: {
      type: Number,
      default: null,
      immutable: true,
    },

    // When the transfer was committed. Defaults to record creation time,
    // which closely tracks the on-chain mine time (commit happens immediately
    // after the receipt resolves on the same request).
    transferDate: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { timestamps: true }
);

/* -------------------------------- Indexes -------------------------------- */

// HARD GUARANTEE: at most one ledger row per on-chain tx. Defense-in-depth
// against retries — the control flow already prevents this via the atomic
// claim in the admin approval path, but a DB-level constraint makes the
// invariant explicit.
ownershipHistorySchema.index(
  { transactionHash: 1 },
  { unique: true, name: "uniq_history_per_tx_hash" }
);

// Timeline lookup: every transfer for a given land, oldest first.
ownershipHistorySchema.index({ land: 1, transferDate: 1 });

// User dashboards: "lands I've ever owned" (as buyer or seller).
ownershipHistorySchema.index({ newOwner: 1, transferDate: -1 });
ownershipHistorySchema.index({ previousOwner: 1, transferDate: -1 });

export default mongoose.model("OwnershipHistory", ownershipHistorySchema);
