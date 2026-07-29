import mongoose from "mongoose";
import TransferRequest from "../models/TransferRequest.model.js";
import Land from "../models/Land.model.js";
import OwnershipHistory from "../models/OwnershipHistory.model.js";
import SaleListing from "../models/SaleListing.model.js";
import { transferLandOnChain } from "../services/blockchain.service.js";

// ================= GET PENDING TRANSFER REQUESTS =================
// In the two-tier flow, "pending for admin review" means the CURRENT OWNER has
// already consented — i.e. status === "owner_approved". Admins never see
// buyer_requested rows; those belong to the owner queue.
export const getPendingTransferRequests = async (req, res) => {
  try {
    const requests = await TransferRequest.find({ status: "owner_approved" })
      .populate("land", "plotNumber location area status owner")
      .populate("buyer", "name email walletAddress")
      .populate("currentOwner", "name email walletAddress")
      .sort({ createdAt: 1 }) // oldest first — FIFO review queue
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

// ================= REJECT TRANSFER REQUEST =================
export const rejectTransferRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await TransferRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Transfer request not found" });
    }

    // Admin rejection only makes sense AFTER the owner has consented.
    // Anything in buyer_requested belongs to the owner queue; anything
    // already admin_approved / completed / rejected is terminal/in-flight.
    if (request.status !== "owner_approved") {
      return res.status(400).json({
        message: `Cannot reject a request in status '${request.status}' — admin can only reject owner-approved requests`,
      });
    }

    request.status = "rejected";
    request.rejectionReason = reason?.trim() || "No reason provided";
    await request.save();

    res.status(200).json({
      message: "Transfer request rejected ❌",
      transferRequest: request,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ================= APPROVE TRANSFER REQUEST (on-chain) =================
// Executes the real ownership transfer:
//   validate -> claim (lock) -> blockchain tx -> atomic DB commit.
// See the consistency strategy: blockchain is executed FIRST, MongoDB second.
export const approveTransferRequest = async (req, res) => {
  const { requestId } = req.params;

  try {
    // ---- 1. Load + validate (read-only) ----
    const request = await TransferRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Transfer request not found" });
    }
    // Admin can only act on requests the OWNER has already consented to.
    // Anything in buyer_requested still needs owner action; admin_approved
    // is already in-flight; completed/rejected are terminal.
    if (request.status !== "owner_approved") {
      return res.status(400).json({
        message: `Cannot approve a request in status '${request.status}' — admin can only approve owner-approved requests`,
      });
    }

    const land = await Land.findById(request.land);
    if (!land) {
      return res.status(404).json({ message: "Linked land no longer exists" });
    }
    if (land.status !== "approved") {
      return res.status(400).json({
        message: "Linked land is not in an approved state — cannot transfer",
      });
    }
    // Stale-request guard — the snapshotted owner must still be the real owner.
    if (land.owner.toString() !== request.currentOwner.toString()) {
      return res.status(409).json({
        message:
          "Land ownership has changed since this request was filed — request is stale",
      });
    }

    // ---- 2. Atomic claim: owner_approved -> admin_approved (in-flight lock) ----
    // Guarantees only ONE transferOwnership() tx is ever sent per request,
    // even under a double-click or concurrent admin action.
    const claimed = await TransferRequest.findOneAndUpdate(
      { _id: requestId, status: "owner_approved" },
      { $set: { status: "admin_approved" } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({
        message: "Request is already being processed",
      });
    }

    // ---- 3. Blockchain transfer (source of truth — executed FIRST) ----
    let chainResult;
    try {
      chainResult = await transferLandOnChain({
        plotNumber: land.plotNumber,
        location: land.location,
        newOwnerAddress: request.buyerWalletAddress,
      });
    } catch (chainErr) {
      // Tx failed -> nothing changed on-chain or in DB ownership fields.
      // Release the lock back to owner_approved so the admin can retry.
      await TransferRequest.findByIdAndUpdate(requestId, {
        $set: { status: "owner_approved" },
      });
      const reason =
        chainErr?.reason ||
        chainErr?.cause?.message ||
        chainErr?.message ||
        "Unknown blockchain error";
      console.error(
        `[transfer] blockchain tx failed for request ${requestId}:`,
        chainErr
      );
      return res.status(502).json({
        message: "Blockchain transfer failed — no changes were applied",
        error: reason,
      });
    }

    // ---- 4. Chain succeeded -> commit DB changes atomically ----
    // Four writes, one transaction:
    //   a) Land.owner -> the buyer (the dynamic-ownership pivot).
    //   b) THIS TransferRequest -> completed (+ tx hash).
    //   c) Every OTHER active TransferRequest on this land -> rejected.
    //      The snapshotted currentOwner/buyerWalletAddress on those rows
    //      no longer reflects reality, so they cannot proceed; leaving
    //      them as buyer_requested/owner_approved would orphan them in
    //      the owner & admin queues. Auto-cancelling here keeps the
    //      lifecycle consistent: at most ONE completed request per land
    //      transition, and no stale rows pointing at the previous owner.
    //   d) OwnershipHistory ledger row — append-only audit of THIS chain
    //      event. The unique index on transactionHash makes the write
    //      idempotent at the DB level; the atomic claim in step 2 already
    //      makes the controller idempotent at the control-flow level.
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await Land.updateOne(
        { _id: land._id },
        { $set: { owner: request.buyer } },
        { session }
      );
      // Marketplace bookkeeping: the active listing that drove this sale
      // transitions to `sold` with audit metadata; any other competing
      // active listing on the same land (defensive — the partial unique
      // index already prevents this) is forced to not_for_sale so the
      // new owner inherits no stale market state. The new owner re-lists
      // explicitly via POST /api/land/submit.
      await SaleListing.updateOne(
        { land: land._id, state: "listed_for_sale" },
        {
          $set: {
            state: "sold",
            soldAt: new Date(),
            soldTo: request.buyer,
            soldTransactionHash: chainResult.transactionHash,
          },
        },
        { session }
      );
      await SaleListing.updateMany(
        {
          land: land._id,
          state: { $in: ["pending_sale_approval"] },
        },
        { $set: { state: "not_for_sale" } },
        { session }
      );
      await TransferRequest.updateOne(
        { _id: requestId },
        {
          $set: {
            status: "completed",
            transactionHash: chainResult.transactionHash,
          },
        },
        { session }
      );
      await TransferRequest.updateMany(
        {
          _id: { $ne: requestId },
          land: land._id,
          status: { $in: ["buyer_requested", "owner_approved"] },
        },
        {
          $set: {
            status: "rejected",
            rejectionReason:
              "Land was transferred to a different buyer — request auto-cancelled",
          },
        },
        { session }
      );
      await OwnershipHistory.create(
        [
          {
            land: land._id,
            previousOwner: request.currentOwner,
            newOwner: request.buyer,
            transferRequest: request._id,
            transactionHash: chainResult.transactionHash,
            blockNumber: chainResult.blockNumber,
          },
        ],
        { session }
      );
      await session.commitTransaction();
    } catch (dbErr) {
      try {
        await session.abortTransaction();
      } catch (_) {
        /* nothing to abort */
      }
      // CRITICAL: the on-chain transfer is IRREVERSIBLE and already done, but
      // the DB could not record it. Surface the tx hash for reconciliation.
      console.error(
        `[transfer] CRITICAL: on-chain transfer SUCCEEDED (tx ${chainResult.transactionHash}) ` +
          `but the DB commit FAILED for request ${requestId}. Manual reconciliation required.`,
        dbErr
      );
      return res.status(500).json({
        message:
          "Blockchain transfer succeeded but the database update failed — manual reconciliation required",
        transactionHash: chainResult.transactionHash,
        requestId,
      });
    } finally {
      session.endSession();
    }

    // ---- 5. Success ----
    const updated = await TransferRequest.findById(requestId)
      .populate("land", "plotNumber location area status owner")
      .populate("buyer", "name email walletAddress");

    return res.status(200).json({
      message: "Ownership transferred on-chain and recorded ✅",
      transactionHash: chainResult.transactionHash,
      blockNumber: chainResult.blockNumber,
      transferRequest: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
