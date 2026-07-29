import TransferRequest from "../models/TransferRequest.model.js";
import Land from "../models/Land.model.js";
import SaleListing from "../models/SaleListing.model.js";

// ================= GET LANDS I OWN =================
/**
 * GET /api/owner/my-lands
 *
 * Every land whose `owner` is the caller, regardless of lifecycle status.
 * Owners need visibility into their full pipeline: the pending
 * submissions awaiting admin verification, the approved registrations
 * now on-chain, and the rejected ones (with their rejection reason).
 * The frontend filters / groups by `status` as needed.
 *
 * Sort: newest first by `createdAt` — the freshest submissions are the
 * ones owners care about most.
 */
export const getOwnerLands = async (req, res) => {
  try {
    const lands = await Land.find({ owner: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      count: lands.length,
      lands,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= GET MY SALE LISTINGS =================
/**
 * GET /api/owner/listings
 *
 * Every SaleListing where the snapshotted owner is the caller — across
 * all lifecycle states (pending_sale_approval, listed_for_sale, sold,
 * not_for_sale). Owners need full lifecycle visibility on their own
 * dashboard, not just the active rows; rejected/sold history is useful
 * context. The frontend filters / groups by `state` as needed.
 *
 * Sort: newest first.
 */
export const getOwnerListings = async (req, res) => {
  try {
    const listings = await SaleListing.find({ owner: req.user.id })
      .populate("land", "plotNumber location area status")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= REMOVE (DELIST) MY SALE LISTING =================
/**
 * PUT /api/owner/listings/:id/remove
 *
 * Owner-initiated delisting. Transitions an ACTIVE listing
 * (pending_sale_approval | listed_for_sale) → not_for_sale (terminal).
 * Per `SaleListing.model.js`, not_for_sale is a dead-end state — once
 * delisted, the owner must create a NEW SaleListing to put the land
 * back on the market.
 *
 * Refuses to act on terminal states (`sold`, `not_for_sale`) and on
 * listings owned by other accounts (per-row scoping). The atomic
 * conditional update means a double-click can't double-process.
 */
export const removeOwnerListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await SaleListing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Data-level scoping — the caller must own the listing.
    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can only delist your own listings",
      });
    }

    const ACTIVE = ["pending_sale_approval", "listed_for_sale"];
    if (!ACTIVE.includes(listing.state)) {
      return res.status(400).json({
        message: `Cannot delist a listing in state '${listing.state}' — only active listings can be removed`,
      });
    }

    const removed = await SaleListing.findOneAndUpdate(
      { _id: id, state: { $in: ACTIVE } },
      { $set: { state: "not_for_sale" } },
      { new: true }
    ).populate("land", "plotNumber location area status");

    if (!removed) {
      return res.status(409).json({
        message: "Listing was just updated by another action — please refresh",
      });
    }

    res.status(200).json({
      message: "Listing removed from the marketplace",
      listing: removed,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Owner-side transfer controllers.
 *
 * The owner is the FIRST approval gate in the two-tier flow:
 *   buyer_requested  -->  owner_approved  -->  admin_approved  -->  completed
 *
 * Every handler in this file is scoped to lands the caller CURRENTLY owns —
 * the request's snapshotted `currentOwner` is compared against `req.user.id`
 * so an owner can never see or act on another owner's pipeline, even if they
 * guess a valid requestId.
 */

// ================= GET TRANSFER REQUESTS ON MY LANDS =================
// Returns every transfer request whose snapshotted seller is the caller —
// includes the actionable queue (buyer_requested) as well as historical
// rows the owner has already touched, so the owner dashboard can show a
// full lifecycle view. The frontend filters by status as needed.
export const getOwnerTransferRequests = async (req, res) => {
  try {
    const requests = await TransferRequest.find({ currentOwner: req.user.id })
      .populate("land", "plotNumber location area status")
      .populate("buyer", "name email walletAddress")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= APPROVE TRANSFER REQUEST (owner consents) =================
// Transitions buyer_requested -> owner_approved. Does NOT touch the chain;
// that is the admin's job in the next stage.
export const approveOwnerTransferRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await TransferRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Transfer request not found" });
    }

    // Data-level scoping: the caller MUST be the snapshotted seller.
    if (request.currentOwner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can only manage requests for lands you own",
      });
    }

    if (request.status !== "buyer_requested") {
      return res.status(400).json({
        message: `Cannot approve a request in status '${request.status}' — owner can only approve buyer-requested requests`,
      });
    }

    // Stale-request guard — the land must still belong to this owner. If the
    // land was transferred via some other request between buyer submission
    // and owner review, the snapshot is no longer authoritative.
    const land = await Land.findById(request.land);
    if (!land) {
      return res.status(404).json({ message: "Linked land no longer exists" });
    }
    if (land.owner.toString() !== req.user.id) {
      return res.status(409).json({
        message:
          "You no longer own this land — request is stale and cannot be approved",
      });
    }

    // Atomic transition guards against a double-click / concurrent action.
    const approved = await TransferRequest.findOneAndUpdate(
      { _id: id, status: "buyer_requested" },
      { $set: { status: "owner_approved" } },
      { new: true }
    )
      .populate("land", "plotNumber location area status")
      .populate("buyer", "name email walletAddress");

    if (!approved) {
      return res.status(409).json({
        message: "Request was just updated by another action — please refresh",
      });
    }

    res.status(200).json({
      message: "Transfer request approved by owner ✅ Awaiting admin review",
      transferRequest: approved,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= REJECT TRANSFER REQUEST (owner declines) =================
// Transitions buyer_requested -> rejected (terminal). Captures an optional
// reason so the buyer can see why their request was declined.
export const rejectOwnerTransferRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await TransferRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Transfer request not found" });
    }

    if (request.currentOwner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can only manage requests for lands you own",
      });
    }

    if (request.status !== "buyer_requested") {
      return res.status(400).json({
        message: `Cannot reject a request in status '${request.status}' — owner can only reject buyer-requested requests`,
      });
    }

    const rejected = await TransferRequest.findOneAndUpdate(
      { _id: id, status: "buyer_requested" },
      {
        $set: {
          status: "rejected",
          rejectionReason: reason?.trim() || "Rejected by owner",
        },
      },
      { new: true }
    )
      .populate("land", "plotNumber location area status")
      .populate("buyer", "name email walletAddress");

    if (!rejected) {
      return res.status(409).json({
        message: "Request was just updated by another action — please refresh",
      });
    }

    res.status(200).json({
      message: "Transfer request rejected by owner ❌",
      transferRequest: rejected,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
