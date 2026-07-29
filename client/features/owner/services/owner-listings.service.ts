import { api } from "@/lib/api/client";
import type {
  OwnerListingsResponse,
  RemoveOwnerListingResponse,
} from "@/types/owner";

/**
 * Owner listings service — typed wrapper over the marketplace-listing
 * slice of `/api/owner/*`. Pure async functions; React Query bindings
 * live in `features/owner/hooks/`.
 *
 * Backend reference: `server/controllers/owner.controller.js` +
 * `server/routes/owner.route.js`.
 *
 * Errors flow through the api client's interceptor — every method
 * here resolves with the typed body or rejects with a typed
 * `ApiError` subclass.
 */

const OWNER_BASE = "/api/owner";

export const ownerListingsService = {
  /**
   * `GET /api/owner/listings`
   *
   * Every SaleListing owned by the caller, across all lifecycle
   * states (pending_sale_approval, listed_for_sale, sold, not_for_sale).
   * Server-side sort is newest-first.
   */
  listMine: (): Promise<OwnerListingsResponse> =>
    api.get<OwnerListingsResponse>(`${OWNER_BASE}/listings`),

  /**
   * `PUT /api/owner/listings/:id/remove`
   *
   * Owner-initiated delisting. The backend refuses to act on terminal
   * states (`sold`, `not_for_sale`) — callers should disable the
   * action in the UI for those rows so the user doesn't hit a 400.
   *
   * Failure modes:
   *   • 400 — listing is in a terminal state
   *   • 403 — listing belongs to a different owner
   *   • 404 — listing not found
   *   • 409 — race against another concurrent action
   */
  remove: (id: string): Promise<RemoveOwnerListingResponse> =>
    api.put<RemoveOwnerListingResponse>(
      `${OWNER_BASE}/listings/${id}/remove`,
    ),
};

export type OwnerListingsService = typeof ownerListingsService;
