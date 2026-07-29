import Land from "../models/Land.model.js";
import User from "../models/User.model.js";
import TransferRequest from "../models/TransferRequest.model.js";
import landContract from "../../blockchain/landContract.js";
import web3 from "../../blockchain/web3.js";

// ================= DASHBOARD STATS =================
/**
 * GET /api/admin/stats
 *
 * Aggregated counts for the admin overview. All four queries run in
 * parallel via Promise.all so the dashboard renders after one round-trip
 * instead of four. Uses `countDocuments` (estimatedDocumentCount would
 * be O(1) but ignores the status filter we need on lands).
 *
 * Response: { totalUsers, pendingLands, pendingTransfers, approvedLands }
 */
export const getAdminStats = async (_req, res) => {
  try {
    const [totalUsers, pendingLands, pendingTransfers, approvedLands] =
      await Promise.all([
        User.countDocuments({}),
        Land.countDocuments({ status: "pending" }),
        // Admin's pending queue is transfers the owner has already approved
        // and are now awaiting admin review. See adminTransfer.controller.js
        // — `getPendingTransferRequests` filters on the same status.
        TransferRequest.countDocuments({ status: "owner_approved" }),
        Land.countDocuments({ status: "approved" }),
      ]);

    res.status(200).json({
      totalUsers,
      pendingLands,
      pendingTransfers,
      approvedLands,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= VIEW PENDING =================
export const getPendingLands = async (req, res) => {
  try {
    const lands = await Land.find({ status: "pending" })
      .populate("owner", "name email walletAddress")
      .lean();

    res.status(200).json(lands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= APPROVE LAND =================
export const approveLand = async (req, res) => {
  try {
    const { landId } = req.params;

    const land = await Land.findById(landId).populate("owner");

    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }

    if (land.status !== "pending") {
      return res.status(400).json({ message: "Land already processed" });
    }

    // Guard: registerLand() needs a valid owner wallet address. Without this
    // check an empty walletAddress reaches the contract and fails with an
    // opaque Web3 error instead of a clear response.
    if (!land.owner?.walletAddress) {
      return res.status(400).json({
        message: "Owner has no wallet address — cannot record on blockchain",
      });
    }

    // Ganache account that signs the transaction. It must be an authorized
    // registrar on the contract (see LandRegistry.sol access control).
    const accounts = await web3.eth.getAccounts();

    // Call the smart contract to record ownership on-chain.
    const tx = await landContract.methods
      .registerLand(land.plotNumber, land.location, land.owner.walletAddress)
      .send({
        from: accounts[0],
        gas: 3000000,
      });

    // Persist the result. transactionHash is now a real schema field, so it
    // is actually saved (previously it was silently dropped).
    land.status = "approved";
    land.transactionHash = tx.transactionHash;
    await land.save();

    res.status(200).json({
      message: "Land approved and recorded on blockchain ✅",
      transactionHash: tx.transactionHash,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= REJECT LAND =================
export const rejectLand = async (req, res) => {
  try {
    const { landId } = req.params;
    const { reason } = req.body;

    const land = await Land.findById(landId);

    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }

    if (land.status !== "pending") {
      return res.status(400).json({ message: "Land already processed" });
    }

    // No blockchain call: rejected submissions never touch the chain.
    // The blockchain remains the source of truth for APPROVED ownership only.
    land.status = "rejected";
    land.rejectionReason = reason?.trim() || "No reason provided";
    await land.save();

    res.status(200).json({
      message: "Land submission rejected ❌",
      land,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
