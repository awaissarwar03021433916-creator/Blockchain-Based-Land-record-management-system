import SaleListing from "../models/SaleListing.model.js";
import Land from "../models/Land.model.js";

/**
 * Admin moderation of marketplace listings.
 *
 * A listing arrives at this layer in state `pending_sale_approval` after
 * the owner has already cleared the triple-source verification in
 * land.controller.js → listLandForSale (JWT + MongoDB + on-chain).
 * Admin's job here is moderation, not re-verification — but a stale-listing
 * guard (snapshotted owner vs current Land.owner) is enforced at approval
 * time to catch the case where ownership has transferred since submission.
 */

// ================= GET PENDING LISTINGS =================
export const getPendingListings = async (req, res) => {
  try {
    const listings = await SaleListing.find({ state: "pending_sale_approval" })
      .populate("land", "plotNumber location area status owner")
      .populate("owner", "name email walletAddress")
      .sort({ createdAt: 1 }) // FIFO review
      .lean();

    res.status(200).json({ count: listings.length, listings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= APPROVE LISTING =================
// Transitions pending_sale_approval -> listed_for_sale. Atomic. Defends
// against stale listings (ownership transferred between submission and
// admin review).
export const approveListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await SaleListing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    if (listing.state !== "pending_sale_approval") {
      return res.status(400).json({
        message: `Cannot approve a listing in state '${listing.state}' — admin can only approve pending listings`,
      });
    }

    // Stale-listing guard — the snapshotted owner must still own the land.
    const land = await Land.findById(listing.land);
    if (!land) {
      return res.status(404).json({ message: "Linked land no longer exists" });
    }
    if (land.owner.toString() !== listing.owner.toString()) {
      return res.status(409).json({
        message:
          "Land ownership has changed since this listing was submitted — listing is stale",
      });
    }

    // Atomic transition: pending_sale_approval -> listed_for_sale. Guards
    // against double-click / concurrent admin action.
    const approved = await SaleListing.findOneAndUpdate(
      { _id: id, state: "pending_sale_approval" },
      {
        $set: {
          state: "listed_for_sale",
          approvedBy: req.user.id,
          approvedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate("land", "plotNumber location area status")
      .populate("owner", "name email walletAddress");

    if (!approved) {
      return res.status(409).json({
        message: "Listing was just updated by another action — please refresh",
      });
    }

    res.status(200).json({
      message: "Listing approved ✅ Land is now visible in the marketplace",
      listing: approved,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= REJECT LISTING =================
// Transitions pending_sale_approval -> not_for_sale (terminal). Captures
// the admin's reason so the owner can see why their listing was declined.
export const rejectListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const listing = await SaleListing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    if (listing.state !== "pending_sale_approval") {
      return res.status(400).json({
        message: `Cannot reject a listing in state '${listing.state}' — admin can only reject pending listings`,
      });
    }

    const rejected = await SaleListing.findOneAndUpdate(
      { _id: id, state: "pending_sale_approval" },
      {
        $set: {
          state: "not_for_sale",
          rejectionReason: reason?.trim() || "Rejected by admin",
        },
      },
      { new: true }
    );

    if (!rejected) {
      return res.status(409).json({
        message: "Listing was just updated by another action — please refresh",
      });
    }

    res.status(200).json({
      message: "Listing rejected ❌",
      listing: rejected,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
