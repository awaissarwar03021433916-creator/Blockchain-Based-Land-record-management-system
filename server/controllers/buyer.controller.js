import Land from "../models/Land.model.js";
import User from "../models/User.model.js";
import TransferRequest from "../models/TransferRequest.model.js";
import SaleListing from "../models/SaleListing.model.js";

// ================= GET APPROVED LANDS (MARKETPLACE) =================
// Returns approved lands the buyer could actually acquire — excludes any
// land the buyer already owns (a buyer keeps role "buyer" after acquiring).
export const getApprovedLands = async (req, res) => {
  try {
    // Marketplace = lands with an active SaleListing in state listed_for_sale.
    // The marketplace store (SaleListing) is now SEPARATE from the registry
    // (Land); we drive the query from listings and join through to lands.
    const listings = await SaleListing.find({ state: "listed_for_sale" })
      .populate({
        path: "land",
        match: { status: "approved", owner: { $ne: req.user.id } },
        populate: { path: "owner", select: "name email walletAddress" },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Response shape preserved as {count, lands[]} for backward compatibility.
    // Each land carries its listing handle so the frontend can show the
    // "listed at" timestamp and link transfer requests back to a listing.
    // `.lean()` already yields plain objects, so `l.land` is spread directly
    // (no `.toObject()` — that method only exists on hydrated documents).
    const lands = listings
      .filter((l) => l.land) // populated-match misses become null
      .map((l) => {
        const landObj = l.land;
        return {
          ...landObj,
          listing: {
            _id: l._id,
            state: l.state,
            approvedAt: l.approvedAt,
            listedAt: l.updatedAt,
          },
        };
      });

    res.status(200).json({
      count: lands.length,
      lands,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= CREATE TRANSFER REQUEST =================
export const createTransferRequest = async (req, res) => {
  try {
    const { landId, requestMessage } = req.body;
    const buyerId = req.user.id;

    // 1. Land must exist.
    const land = await Land.findById(landId);
    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }

    // 2. Land must be approved — only on-chain-registered land is transferable.
    if (land.status !== "approved") {
      return res.status(400).json({
        message: "Only approved lands can be requested for transfer",
      });
    }

    // 2b. Land must be ACTIVELY LISTED for sale by its owner — i.e. there
    //     must be a SaleListing row in state listed_for_sale.
    const activeListing = await SaleListing.findOne({
      land: landId,
      state: "listed_for_sale",
    });
    if (!activeListing) {
      return res.status(400).json({
        message: "This land is not listed for sale",
      });
    }

    // 3. Buyer cannot request a land they already own.
    if (land.owner.toString() === buyerId) {
      return res.status(400).json({ message: "You already own this land" });
    }

    // 4. Buyer must have a wallet address — the on-chain transfer executes
    //    to it, so the request cannot proceed without one.
    const buyer = await User.findById(buyerId);
    if (!buyer?.walletAddress) {
      return res.status(400).json({
        message:
          "Add a wallet address to your profile before requesting a transfer",
      });
    }

    // 5. Duplicate prevention — one ACTIVE request per buyer+land. "Active"
    //    means anywhere in the approval workflow: buyer_requested (awaiting
    //    owner) or owner_approved (awaiting admin). The partial unique index
    //    on the same condition is the race-safe backstop (see catch block).
    const existing = await TransferRequest.findOne({
      buyer: buyerId,
      land: landId,
      status: { $in: ["buyer_requested", "owner_approved"] },
    });
    if (existing) {
      return res.status(409).json({
        message: "You already have an active request for this land",
      });
    }

    // Status defaults to "buyer_requested" via the schema default.
    const transferRequest = await TransferRequest.create({
      land: land._id,
      currentOwner: land.owner,
      buyer: buyerId,
      buyerWalletAddress: buyer.walletAddress,
      requestMessage,
    });

    res.status(201).json({
      message: "Transfer request submitted ⏳ Pending owner approval",
      transferRequest,
    });
  } catch (error) {
    // Backstop for the partial unique index (concurrent duplicate requests).
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You already have an active request for this land",
      });
    }
    // Schema-level validation (e.g. malformed wallet address).
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= GET BUYER'S OWN TRANSFER REQUESTS =================
export const getMyTransferRequests = async (req, res) => {
  try {
    const requests = await TransferRequest.find({ buyer: req.user.id })
      .populate("land", "plotNumber location area status")
      .populate("currentOwner", "name email")
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
