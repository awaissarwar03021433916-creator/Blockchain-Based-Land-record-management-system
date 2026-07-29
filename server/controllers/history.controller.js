import OwnershipHistory from "../models/OwnershipHistory.model.js";

/**
 * History controllers — user-scoped views over the OwnershipHistory
 * ledger. Per-land history lives in `land.controller.js#getLandHistory`;
 * this module covers "what transfers has THIS USER been a party to."
 */

// ================= GET MY OWNERSHIP HISTORY =================
/**
 * GET /api/history/my-history
 *
 * Every OwnershipHistory row where the caller is either the previous
 * owner (sold) or the new owner (acquired). The append-only ledger
 * doubles as the user's personal transfer audit — every chain event
 * they were a party to, in one feed.
 *
 * Populates both sides + the land (plotNumber/location/area) so the
 * client can render plot context inline without follow-up requests.
 *
 * Sort: most recent transfer first — users care about the freshest
 * activity at the top.
 */
export const getMyOwnershipHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const ledger = await OwnershipHistory.find({
      $or: [{ previousOwner: userId }, { newOwner: userId }],
    })
      .populate("land", "plotNumber location area")
      .populate("previousOwner", "name email walletAddress")
      .populate("newOwner", "name email walletAddress")
      .sort({ transferDate: -1 })
      .lean();

    res.status(200).json({
      count: ledger.length,
      history: ledger,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
