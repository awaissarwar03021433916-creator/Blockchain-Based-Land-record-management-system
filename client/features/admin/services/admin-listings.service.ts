import { api } from "@/lib/api/client";
import type {
  ApproveListingResponse,
  PendingListingsResponse,
} from "@/types/admin";

/**
 * Admin listings service — typed wrapper over the listing-moderation
 * slice of `/api/admin/*`. Lives alongside the other admin services in
 * `features/admin/services/`. Pure async functions; React Query
 * bindings live in `features/admin/hooks/`.
 *
 * Backend reference:
 *   • `server/controllers/adminListing.controller.js`
 *   • `server/routes/admin.routes.js`
 *
 * Lifecycle context: listings arrive at the admin layer in
 * `pending_sale_approval` after the owner has already cleared the
 * triple-source verification in `land.controller.js#listLandForSale`
 * (JWT + MongoDB + on-chain ownership). The admin's job here is
 * moderation, not re-verification.
 *
 * Errors flow through the api client's interceptor — every method
 * here either resolves with the typed body or rejects with a typed
 * `ApiError` subclass.
 */

const ADMIN_BASE = "/api/admin";

export const adminListingsService = {
  /**
   * `GET /api/admin/pending-listings`
   *
   * Returns `{ count, listings }`. Each listing is populated with
   * `land` (plotNumber/location/area/status/owner) and `owner`
   * (name/email/walletAddress). Server-side sort is FIFO (oldest
   * first); the page re-sorts on the client to newest-first to
   * surface the freshest items at the top.
   */
  listPending: (): Promise<PendingListingsResponse> =>
    api.get<PendingListingsResponse>(`${ADMIN_BASE}/pending-listings`),

  /**
   * `PUT /api/admin/approve-listing/:id`
   *
   * Transitions `pending_sale_approval` → `listed_for_sale`. The
   * controller enforces a stale-listing guard: if the snapshotted
   * owner no longer matches `Land.owner` (i.e. the land was
   * transferred between submission and review), the request fails
   * with 409. The atomic `findOneAndUpdate` also protects against
   * double-click / concurrent admin actions.
   *
   * Failure modes the UI distinguishes:
   *   • 400 — listing not in `pending_sale_approval` state
   *   • 404 — listing or linked land not found
   *   • 409 — ownership changed since submission OR concurrent action
   */
  approve: (listingId: string): Promise<ApproveListingResponse> =>
    api.put<ApproveListingResponse>(
      `${ADMIN_BASE}/approve-listing/${listingId}`,
    ),
};

export type AdminListingsService = typeof adminListingsService;
