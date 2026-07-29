/**
 * Buyer domain types.
 *
 * Mirrors the backend payloads under `/api/buyer/*` (plus the two
 * endpoints the buyer surface REUSES: `/api/owner/my-lands` for
 * acquired properties and `/api/history/my-history` for the audit
 * feed — see the dual-role architecture note below). Kept alongside
 * the buyer feature slice the same way `features/land/land-types.ts`
 * sits with its feature, and following the exact conventions of
 * `types/owner.ts` / `types/admin.ts`:
 *
 *   • one interface per wire shape, named after the resource;
 *   • populated subdocuments carry `_id` (Mongo) — NOT the auth-store
 *     `User.id` shape, which is a different projection;
 *   • list endpoints return a `{ count, items[] }` envelope;
 *   • dates are ISO strings off the wire.
 *
 * Reuse policy (per the "no duplicate types" rule): the drift-prone,
 * cross-slice shapes already canonicalised in `types/owner.ts` are
 * IMPORTED, not re-declared —
 *   • `TransferRequestStatus` — the 5-state transfer machine; the one
 *     place this must never silently diverge between slices;
 *   • `SaleListingState`      — the sale-listing state machine;
 *   • `OwnerLand` (+ response) — a buyer's acquired land IS an owner
 *     land (a buyer becomes the real owner once a transfer completes,
 *     and "My Properties" is literally served by `/api/owner/my-lands`).
 * Trivial populated subdocuments (owner/seller snapshots) are declared
 * locally with buyer-semantic names, matching how every other slice
 * self-contains those tiny shapes.
 *
 * Backend reference: `server/controllers/buyer.controller.js`.
 */

import type {
  OwnerLand,
  OwnerLandsResponse,
  SaleListingState,
  TransferRequestStatus,
} from "@/types/owner";

/* ====================================================================== */
/*  Dashboard                                                             */
/* ====================================================================== */

/**
 * Buyer dashboard KPIs.
 *
 * NOTE: there is NO `/api/buyer/stats` endpoint (unlike the admin's
 * `/api/admin/stats`). These figures are DERIVED CLIENT-SIDE by
 * aggregating the marketplace, transfer-requests, and properties
 * queries — this interface is the shape the dashboard hook produces,
 * not a wire envelope.
 *
 *  • availableLands      — lands currently listed in the marketplace
 *  • activeRequests      — the caller's requests still in flight
 *                          (buyer_requested / owner_approved / admin_approved)
 *  • myProperties        — lands the caller has acquired
 *  • completedPurchases  — the caller's requests in status "completed"
 */
export interface BuyerDashboardStats {
  availableLands: number;
  activeRequests: number;
  myProperties: number;
  completedPurchases: number;
}

/* ====================================================================== */
/*  Marketplace — GET /api/buyer/approved-lands                           */
/* ====================================================================== */

/**
 * Owner snapshot embedded on a marketplace land. The endpoint
 * populates the seller with `name email walletAddress`. walletAddress
 * is required when a land is first registered, so it should always be
 * present here; kept optional defensively because it comes off the wire.
 */
export interface MarketplaceLandOwner {
  _id: string;
  name: string;
  email: string;
  walletAddress?: string;
}

/**
 * The SaleListing handle attached to each marketplace land so the UI
 * can show "listed at" and link a transfer request back to a listing.
 * The marketplace query filters on `state: "listed_for_sale"`, so in
 * practice `state` is always that value — typed as the full union for
 * forward-compatibility.
 */
export interface MarketplaceListingHandle {
  _id: string;
  state: SaleListingState;
  /** When the admin approved the listing; null on legacy rows. */
  approvedAt: string | null;
  /** The listing's `updatedAt` — used as the "listed at" timestamp. */
  listedAt: string;
}

/**
 * One approved, actively-listed land as returned by
 * `GET /api/buyer/approved-lands`. Fields mirror `Land.model.js`
 * (status is narrowed to "approved" — only on-chain land is listable)
 * with the populated `owner` and the `listing` handle spread on by the
 * controller. Lands the caller already owns are excluded server-side.
 */
export interface MarketplaceLand {
  _id: string;
  plotNumber: string;
  location: string;
  area: string;
  status: "approved";
  owner: MarketplaceLandOwner;
  transactionHash: string | null;
  listing: MarketplaceListingHandle;
  createdAt: string;
  updatedAt: string;
}

/** Envelope of `GET /api/buyer/approved-lands`. */
export interface MarketplaceResponse {
  count: number;
  lands: MarketplaceLand[];
}

/* ---------------------------- Client filters ---------------------------- */

/**
 * Sort options for the marketplace grid. Applied CLIENT-SIDE — the
 * endpoint returns every listed land (sorted newest-first) and the UI
 * re-sorts/filters in memory.
 */
export type MarketplaceSortBy = "recent" | "oldest" | "plot" | "location";

/**
 * Marketplace filter state. CLIENT-ONLY — there is no server-side
 * search/filter param on `/api/buyer/approved-lands`; `search` matches
 * against `plotNumber` or `location` in memory.
 */
export interface MarketplaceFilters {
  search: string;
  sortBy: MarketplaceSortBy;
}

/** Sensible defaults for a freshly-mounted marketplace view. */
export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  search: "",
  sortBy: "recent",
};

/* ====================================================================== */
/*  Transfer requests — POST + GET /api/buyer/transfer-requests           */
/* ====================================================================== */

/**
 * Seller snapshot on a buyer-side transfer request. The endpoint
 * populates `currentOwner` with `name email` ONLY (no walletAddress —
 * the buyer never needs the seller's wallet), which is why this is a
 * narrower shape than the admin-side `TransferParticipant`.
 */
export interface BuyerRequestSeller {
  _id: string;
  name: string;
  email: string;
}

/**
 * Land snapshot on a buyer-side transfer request — populated with
 * `plotNumber location area status`.
 */
export interface BuyerRequestLand {
  _id: string;
  plotNumber: string;
  location: string;
  area: string;
  status: "pending" | "approved" | "rejected";
}

/**
 * One TransferRequest the caller filed, as returned by
 * `GET /api/buyer/transfer-requests`. The `buyer` reference is dropped
 * — the caller IS the buyer. `status` uses the shared 5-state machine.
 *
 * `buyerWalletAddress` is the snapshot taken at request time (never
 * re-read from the User record), so the on-chain destination is fixed
 * even if the buyer later changes their wallet.
 */
export interface BuyerTransferRequest {
  _id: string;
  land: BuyerRequestLand;
  currentOwner: BuyerRequestSeller;
  buyerWalletAddress: string;
  requestMessage: string;
  status: TransferRequestStatus;
  rejectionReason: string | null;
  transactionHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Envelope of `GET /api/buyer/transfer-requests`. */
export interface BuyerTransferRequestsResponse {
  count: number;
  requests: BuyerTransferRequest[];
}

/* --------------------------- Create a request --------------------------- */

/**
 * Body of `POST /api/buyer/request-transfer`.
 *
 * `requestMessage` is optional (≤ 500 chars, enforced by
 * `validateTransferRequest`). `landId` must be a valid Mongo id for an
 * approved land that has an active `listed_for_sale` listing — the
 * controller rejects otherwise with 400 / 404 / 409.
 */
export interface TransferRequestPayload {
  landId: string;
  requestMessage?: string;
}

/**
 * The freshly-created TransferRequest doc returned by
 * `POST /api/buyer/request-transfer`. It is UNPOPULATED — `land`,
 * `currentOwner`, and `buyer` are raw ObjectId strings (the create
 * handler returns the bare document). `status` is always
 * "buyer_requested" at this point.
 */
export interface CreatedTransferRequest {
  _id: string;
  land: string;
  currentOwner: string;
  buyer: string;
  buyerWalletAddress: string;
  requestMessage: string;
  status: TransferRequestStatus;
  rejectionReason: string | null;
  transactionHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response of `POST /api/buyer/request-transfer`. */
export interface CreateTransferRequestResponse {
  message: string;
  transferRequest: CreatedTransferRequest;
}

/* ====================================================================== */
/*  My Properties — GET /api/owner/my-lands (reused)                      */
/* ====================================================================== */

/**
 * A land the buyer has acquired. Served by `GET /api/owner/my-lands`
 * (the backend's `authorizeRoles("owner","buyer")` gate accepts buyers
 * — a buyer becomes the real owner once a transfer completes), so the
 * shape is identical to `OwnerLand`. Aliased rather than duplicated to
 * keep the registry shape single-sourced.
 */
export type BuyerProperty = OwnerLand;

/** Envelope of the reused `GET /api/owner/my-lands` for the buyer. */
export type BuyerPropertiesResponse = OwnerLandsResponse;
