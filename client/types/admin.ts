/**
 * Admin domain types.
 *
 * Mirrored from the backend payloads under `/api/admin/*`. Kept in
 * `types/` rather than inline in the service so call sites (React Query
 * `select`, table columns, prop types) all reference the same shape.
 */

/**
 * Response of `GET /api/admin/stats`.
 *
 * Computed server-side via parallel `countDocuments` queries against the
 * User, Land, and TransferRequest collections — see
 * `server/controllers/admin.controller.js#getAdminStats`.
 *
 *  • totalUsers       — every account across all roles
 *  • pendingLands     — Land docs with status === "pending"
 *  • pendingTransfers — TransferRequest docs with status === "owner_approved"
 *                       (the admin's review queue; see the 5-state machine)
 *  • approvedLands    — Land docs with status === "approved"
 */
export interface AdminDashboardStats {
  totalUsers: number;
  pendingLands: number;
  pendingTransfers: number;
  approvedLands: number;
}

/* ----------------------------- Pending Lands ----------------------------- */

/**
 * Owner record as embedded inside a populated `PendingLand`.
 *
 * The admin endpoint populates only the fields admins actually need
 * (`name email walletAddress`) — see `getPendingLands` in
 * `server/controllers/admin.controller.js`. walletAddress can be
 * missing if the owner registered without one (rare but possible).
 */
export interface PendingLandOwner {
  _id: string;
  name: string;
  email: string;
  walletAddress?: string;
}

/**
 * One Land document with status === "pending", as returned by
 * `GET /api/admin/pending-lands`. Fields mirror `Land.model.js`; only
 * the runtime-relevant subset is typed here.
 */
export interface PendingLand {
  _id: string;
  plotNumber: string;
  location: string;
  area: string;
  status: "pending";
  owner: PendingLandOwner;
  transactionHash: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response of `PUT /api/admin/approve-land/:landId`. */
export interface ApproveLandResponse {
  message: string;
  transactionHash: string;
}

/** Body of `PUT /api/admin/reject-land/:landId`. */
export interface RejectLandRequest {
  reason: string;
}

/** Response of `PUT /api/admin/reject-land/:landId`. */
export interface RejectLandResponse {
  message: string;
  land: PendingLand;
}

/* -------------------------- Pending Transfers --------------------------- */

/**
 * User record as embedded inside a populated transfer request — the
 * admin endpoint populates buyer + currentOwner with `name email
 * walletAddress` only. Both sides of a transfer have a wallet by
 * construction (the buyer wallet is required at request creation,
 * the owner wallet was required when the land was first registered).
 */
export interface TransferParticipant {
  _id: string;
  name: string;
  email: string;
  walletAddress?: string;
}

/**
 * Land subdocument as populated on a transfer request — only the
 * fields the moderation surface needs (`plotNumber location area
 * status owner`). `status` should be "approved" for any transfer
 * that has reached owner_approved.
 */
export interface TransferLand {
  _id: string;
  plotNumber: string;
  location: string;
  area: string;
  status: "pending" | "approved" | "rejected";
  owner: string;
}

/**
 * A TransferRequest doc in the admin's review queue (status ===
 * "owner_approved"), as returned by `GET /api/admin/pending-transfer-requests`.
 *
 * Fields mirror `TransferRequest.model.js`. The 5-state machine and the
 * meaning of `buyerWalletAddress` (snapshot at request time, never
 * re-read from the buyer's User record) live in that model file.
 */
export interface PendingTransferRequest {
  _id: string;
  land: TransferLand;
  buyer: TransferParticipant;
  currentOwner: TransferParticipant;
  buyerWalletAddress: string;
  requestMessage: string;
  status:
    | "buyer_requested"
    | "owner_approved"
    | "admin_approved"
    | "rejected"
    | "completed";
  rejectionReason: string | null;
  transactionHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Envelope of `GET /api/admin/pending-transfer-requests`. */
export interface PendingTransfersResponse {
  count: number;
  requests: PendingTransferRequest[];
}

/** Response of `PUT /api/admin/approve-transfer/:requestId`. */
export interface ApproveTransferResponse {
  message: string;
  transactionHash: string;
  blockNumber: number;
  transferRequest: PendingTransferRequest;
}

/** Body of `PUT /api/admin/reject-transfer/:requestId`. */
export interface RejectTransferRequest {
  reason: string;
}

/** Response of `PUT /api/admin/reject-transfer/:requestId`. */
export interface RejectTransferResponse {
  message: string;
  transferRequest: PendingTransferRequest;
}

/* ---------------------------- Pending Listings -------------------------- */

/**
 * Owner participant on a pending listing — populated with the fields
 * the moderation surface needs (`name email walletAddress`). The
 * walletAddress is required at submission time (the backend enforces
 * an EIP-style regex), so it should always be present here; we keep
 * it optional defensively because the type comes off the wire.
 */
export interface PendingListingOwner {
  _id: string;
  name: string;
  email: string;
  walletAddress?: string;
}

/**
 * Land subdocument as populated on a pending listing — only the
 * fields the moderation queue table needs.
 */
export interface PendingListingLand {
  _id: string;
  plotNumber: string;
  location: string;
  area: string;
  status: "pending" | "approved" | "rejected";
  owner: string;
}

/**
 * SaleListing state machine — kept here as well (in addition to the
 * owner-side `SaleListingState`) so the admin feature can self-contain
 * its imports.
 */
export type AdminSaleListingState =
  | "pending_sale_approval"
  | "listed_for_sale"
  | "sold"
  | "not_for_sale";

/**
 * One SaleListing in the admin's review queue (state ===
 * "pending_sale_approval"), as returned by
 * `GET /api/admin/pending-listings`. Field names mirror
 * `SaleListing.model.js`; only the runtime-relevant subset is typed.
 */
export interface PendingListing {
  _id: string;
  land: PendingListingLand;
  owner: PendingListingOwner;
  ownerWalletAddress: string;
  state: AdminSaleListingState;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  soldAt: string | null;
  soldTransactionHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Envelope of `GET /api/admin/pending-listings`. */
export interface PendingListingsResponse {
  count: number;
  listings: PendingListing[];
}

/** Response of `PUT /api/admin/approve-listing/:id`. */
export interface ApproveListingResponse {
  message: string;
  listing: PendingListing;
}
