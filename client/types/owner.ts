/**
 * Owner domain types.
 *
 * Mirrors the backend payloads under `/api/owner/*`. Kept in `types/`
 * rather than inline in the service so call sites (React Query
 * `select`, table columns, prop types) all reference the same shape.
 */

/**
 * One Land document the caller owns, as returned by
 * `GET /api/owner/my-lands`. Field names mirror `Land.model.js`; the
 * unpopulated `owner` reference is dropped because the caller IS the
 * owner — including it would be redundant.
 *
 * Status meanings:
 *   • "pending"  — awaiting admin verification, not yet on-chain
 *   • "approved" — recorded on-chain (transactionHash populated)
 *   • "rejected" — admin declined (rejectionReason populated)
 */
export interface OwnerLand {
  _id: string;
  plotNumber: string;
  location: string;
  area: string;
  status: "pending" | "approved" | "rejected";
  transactionHash: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Envelope of `GET /api/owner/my-lands`. */
export interface OwnerLandsResponse {
  count: number;
  lands: OwnerLand[];
}

/* ------------------------------ Listings -------------------------------- */

/**
 * Land subdocument as populated on an owner's sale listing — only the
 * fields the listings table needs (`plotNumber location area status`).
 */
export interface ListingLand {
  _id: string;
  plotNumber: string;
  location: string;
  area: string;
  status: "pending" | "approved" | "rejected";
}

/**
 * SaleListing state machine (see `server/models/SaleListing.model.js`):
 *   pending_sale_approval → listed_for_sale  (admin approves)
 *   pending_sale_approval → not_for_sale     (admin rejects)
 *   listed_for_sale       → sold             (a transfer completes)
 *   listed_for_sale       → not_for_sale     (owner delists)
 *
 *  `sold` and `not_for_sale` are terminal.
 */
export type SaleListingState =
  | "pending_sale_approval"
  | "listed_for_sale"
  | "sold"
  | "not_for_sale";

/**
 * One SaleListing the caller created, as returned by
 * `GET /api/owner/listings`. The owner reference is dropped because
 * the caller IS the owner (snapshot at submission time).
 */
export interface OwnerListing {
  _id: string;
  land: ListingLand;
  ownerWalletAddress: string;
  state: SaleListingState;
  rejectionReason: string | null;
  soldAt: string | null;
  soldTransactionHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Envelope of `GET /api/owner/listings`. */
export interface OwnerListingsResponse {
  count: number;
  listings: OwnerListing[];
}

/** Response of `PUT /api/owner/listings/:id/remove`. */
export interface RemoveOwnerListingResponse {
  message: string;
  listing: OwnerListing;
}

/* ------------------------- Owner Transfer Requests ----------------------- */

/**
 * Buyer subdocument as populated on an owner-side transfer request —
 * the endpoint populates `name email walletAddress` only.
 */
export interface TransferBuyer {
  _id: string;
  name: string;
  email: string;
  walletAddress?: string;
}

/**
 * Land subdocument as populated on an owner-side transfer request —
 * the endpoint populates `plotNumber location area status`.
 */
export interface TransferRequestLand {
  _id: string;
  plotNumber: string;
  location: string;
  area: string;
  status: "pending" | "approved" | "rejected";
}

/**
 * TransferRequest status — the 5-state machine documented in
 * `server/models/TransferRequest.model.js`. Reproduced here so the
 * frontend can branch on the same vocabulary without importing the
 * model module.
 */
export type TransferRequestStatus =
  | "buyer_requested"
  | "owner_approved"
  | "admin_approved"
  | "rejected"
  | "completed";

/**
 * One TransferRequest the caller owns the underlying land of, as
 * returned by `GET /api/owner/transfer-requests`. The `currentOwner`
 * reference is dropped — the caller IS the snapshotted seller.
 */
export interface OwnerTransferRequest {
  _id: string;
  land: TransferRequestLand;
  buyer: TransferBuyer;
  buyerWalletAddress: string;
  requestMessage: string;
  status: TransferRequestStatus;
  rejectionReason: string | null;
  transactionHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Envelope of `GET /api/owner/transfer-requests`. */
export interface OwnerTransferRequestsResponse {
  count: number;
  requests: OwnerTransferRequest[];
}

/** Response of `PUT /api/owner/approve-transfer/:id`. */
export interface ApproveOwnerTransferResponse {
  message: string;
  transferRequest: OwnerTransferRequest;
}

/** Body of `PUT /api/owner/reject-transfer/:id`. */
export interface RejectOwnerTransferRequest {
  reason: string;
}

/** Response of `PUT /api/owner/reject-transfer/:id`. */
export interface RejectOwnerTransferResponse {
  message: string;
  transferRequest: OwnerTransferRequest;
}

/* ----------------------- Ownership History (per-user) ------------------- */

/**
 * User participant on an OwnershipHistory row. Populated with the
 * fields a personal audit feed needs (`name email walletAddress`).
 * walletAddress can be missing if the user registered without one.
 */
export interface HistoryParticipant {
  _id: string;
  name: string;
  email: string;
  walletAddress?: string;
}

/**
 * Land subdocument as populated on a history row — only the fields
 * needed to render plot context inline.
 */
export interface HistoryLand {
  _id: string;
  plotNumber: string;
  location: string;
  area: string;
}

/**
 * One OwnershipHistory ledger row, as returned by
 * `GET /api/history/my-history`. Mirrors
 * `server/models/OwnershipHistory.model.js` — every business field is
 * immutable on the server.
 */
export interface OwnershipHistoryEntry {
  _id: string;
  land: HistoryLand;
  previousOwner: HistoryParticipant;
  newOwner: HistoryParticipant;
  transferRequest: string | null;
  transactionHash: string;
  blockNumber: number | null;
  transferDate: string;
  createdAt: string;
  updatedAt: string;
}

/** Envelope of `GET /api/history/my-history`. */
export interface OwnerHistoryResponse {
  count: number;
  history: OwnershipHistoryEntry[];
}
