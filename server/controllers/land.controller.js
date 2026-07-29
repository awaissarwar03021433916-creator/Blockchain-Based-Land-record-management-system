import Land from "../models/Land.model.js";
import User from "../models/User.model.js";
import OwnershipHistory from "../models/OwnershipHistory.model.js";
import SaleListing from "../models/SaleListing.model.js";
import { readLandOnChain } from "../services/blockchain.service.js";

// ================= REGISTER NEW LAND (admin-approval pending) =================
// Original behaviour previously served at POST /api/land/submit. Now exposed
// at POST /api/land/register so the new sale-listing endpoint can take over
// /submit. Creates a Land doc in status:"pending"; an admin then calls
// PUT /api/admin/approve-land/:landId which executes registerLand() on-chain.
export const registerNewLand = async (req, res) => {
  try {
    let { plotNumber, location, area } = req.body;

    // 🔐 NORMALIZE CASING
    // WHY: To avoid duplicates due to capital/small letters
    plotNumber = plotNumber?.toString().trim();
    location = location?.trim().toLowerCase();

    // ✅ Combined Duplicate Check
    const existing = await Land.findOne({
      plotNumber: plotNumber,
      location: location,
    });

    if (existing) {
      return res.status(400).json({
        message: "❌ Plot already exists at this location",
      });
    }

    const land = await Land.create({
      plotNumber,
      location, // stored normalized
      area,
      owner: req.user.id,
    });

    // WHERE DATA GO: MongoDB → lands collection
    res.status(201).json({
      message: "Land submitted successfully ⏳ Pending approval",
      land,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// ================= LIST LAND FOR SALE (verified ownership) =================
// New POST /api/land/submit semantics: the caller declares "I own this land
// and want to put it on the market." Before flipping listedForSale=true the
// system cross-checks ownership against THREE sources of truth:
//   1. JWT identity     — the authenticated user.
//   2. MongoDB          — Land.owner equals the JWT user.
//   3. LandRegistry.sol — lands[plot][location].owner equals the user's
//                         walletAddress (case-insensitive).
// All three must agree; otherwise the listing is blocked.
export const listLandForSale = async (req, res) => {
  try {
    let { plotNumber, location } = req.body;
    plotNumber = plotNumber?.toString().trim();
    location = location?.trim().toLowerCase();

    // The JWT only carries id + role; fetch the full user for walletAddress.
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "Authenticated user not found" });
    }
    if (!user.walletAddress) {
      return res.status(400).json({
        message:
          "You must have a wallet address on your profile to list a land",
      });
    }

    // Plot identification — normalized lookup to avoid casing duplicates.
    const land = await Land.findOne({ plotNumber, location });
    if (!land) {
      return res.status(404).json({
        message:
          "Land not found — register it first via POST /api/land/register",
      });
    }

    // Source-of-truth 1: the land must be on-chain registered (status approved).
    if (land.status !== "approved") {
      return res.status(400).json({
        message: `Land is in status '${land.status}' — only approved (on-chain registered) lands can be listed for sale`,
      });
    }

    // Source-of-truth 2: MongoDB ownership.
    if (land.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message:
          "Ownership verification failed — you are not the current owner of this land (database)",
      });
    }

    // Source-of-truth 3: LandRegistry contract ownership.
    let onChain;
    try {
      onChain = await readLandOnChain({
        plotNumber: land.plotNumber,
        location: land.location,
      });
    } catch (chainErr) {
      console.error("[listing] on-chain read failed:", chainErr);
      return res.status(502).json({
        message: "Could not verify ownership on-chain — try again later",
      });
    }
    if (!onChain.registered) {
      return res.status(409).json({
        message:
          "Land is approved in the database but missing on-chain — manual reconciliation required",
      });
    }
    if (onChain.owner.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(409).json({
        message:
          "Ownership verification failed — on-chain owner does not match your wallet address",
        chainOwner: onChain.owner,
        yourWallet: user.walletAddress,
      });
    }

    // Duplicate-prevention — at most one active SaleListing per land. The
    // partial unique index on SaleListing is the race-safe backstop; this
    // check is the friendly preflight.
    const activeListing = await SaleListing.findOne({
      land: land._id,
      state: { $in: ["pending_sale_approval", "listed_for_sale"] },
    });
    if (activeListing) {
      return res.status(409).json({
        message: `An active listing already exists for this land (state: ${activeListing.state})`,
        listing: activeListing,
      });
    }

    // Create the SaleListing row in pending_sale_approval. Admin moderation
    // is the next step (PUT /api/admin/approve-listing/:id).
    let listing;
    try {
      listing = await SaleListing.create({
        land: land._id,
        owner: user._id,
        ownerWalletAddress: user.walletAddress,
      });
    } catch (err) {
      // Backstop for the partial unique index — concurrent submission race.
      if (err.code === 11000) {
        return res.status(409).json({
          message: "An active listing already exists for this land",
        });
      }
      throw err;
    }

    res.status(201).json({
      message: "Ownership verified. Land submitted for sale listing.",
      listing,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= GET LAND HISTORY (provenance chain) =================
// Returns the complete provenance for a land: the on-chain registration
// (implied by the original owner = the previousOwner of the FIRST ledger
// row, or — if no transfers have happened yet — Land.owner itself), then
// every successful transfer in chronological order. The `ownershipChain`
// field is a derived convenience list of just the owners, oldest first.
export const getLandHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const land = await Land.findById(id)
      .populate("owner", "name email walletAddress")
      .lean();
    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }

    const ledger = await OwnershipHistory.find({ land: id })
      .populate("previousOwner", "name email walletAddress")
      .populate("newOwner", "name email walletAddress")
      .sort({ transferDate: 1 }) // oldest -> newest
      .lean();

    // Derive the full owner chain. If no transfers have happened, the
    // chain is just the current (and original) owner.
    const ownershipChain =
      ledger.length === 0
        ? [land.owner]
        : [ledger[0].previousOwner, ...ledger.map((row) => row.newOwner)];

    res.status(200).json({
      land: {
        _id: land._id,
        plotNumber: land.plotNumber,
        location: land.location,
        area: land.area,
        status: land.status,
        currentOwner: land.owner,
        registrationTransactionHash: land.transactionHash,
      },
      transferCount: ledger.length,
      history: ledger,
      ownershipChain,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
