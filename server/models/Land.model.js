import mongoose from "mongoose";

const landSchema = new mongoose.Schema(
  {
    // Length caps protect against (a) MongoDB doc bloat and (b) on-chain gas
    // explosions — registerLand() stores these strings on-chain, where length
    // directly affects gas cost.
    plotNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: [64, "plotNumber cannot exceed 64 characters"],
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "location cannot exceed 200 characters"],
    },
    area: {
      type: String,
      required: true,
      trim: true,
      maxlength: [64, "area cannot exceed 64 characters"],
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Ethereum transaction hash of the on-chain registerLand() call.
    // Populated by the admin approval flow. Previously assigned in the
    // controller but silently discarded because the field did not exist
    // on the schema (Mongoose strict mode drops unknown fields).
    transactionHash: {
      type: String,
      default: null,
    },

    // Reason recorded by the admin when a land submission is rejected.
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/* -------------------------------- Indexes -------------------------------- */
// Land previously had NO indexes, yet every hot read filters on one of these
// fields — so each query was a full collection scan. These cover the actual
// access patterns in the controllers:

// Owner dashboard: `Land.find({ owner }).sort({ createdAt: -1 })`.
landSchema.index({ owner: 1, createdAt: -1 });

// Admin queues + dashboard stats: `find/countDocuments({ status })`.
landSchema.index({ status: 1 });

// Duplicate guard + sale-listing lookup, run on EVERY register/list:
// `Land.findOne({ plotNumber, location })`. Non-unique on purpose — the
// existing controller-level normalization + check stays the source of the
// friendly error; this just makes the lookup an index hit, and avoids the
// migration risk a unique index would carry on any pre-existing data.
landSchema.index({ plotNumber: 1, location: 1 });

export default mongoose.model("Land", landSchema);
