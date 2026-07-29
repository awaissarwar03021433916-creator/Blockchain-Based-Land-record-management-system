import { api } from "@/lib/api/client";
import type { OwnerLandsResponse } from "@/types/owner";

/**
 * Owner lands service — typed wrapper over `/api/owner/my-lands`.
 *
 * Pure async functions; React Query bindings live in
 * `features/owner/hooks/`. Errors flow through the api client's
 * response interceptor — every method here either resolves with the
 * typed body or rejects with a typed `ApiError` subclass.
 *
 * Backend reference:
 *   • `server/controllers/owner.controller.js#getOwnerLands`
 *   • `server/routes/owner.route.js`
 *
 * Authorization: the backend's `authorizeRoles("owner", "buyer")` gate
 * accepts both roles (dual-role architecture — a buyer becomes a real
 * owner once they acquire land). The frontend's owner page is
 * owner-only at the route level, so the hook narrows further.
 */

const OWNER_BASE = "/api/owner";

export const ownerLandsService = {
  /**
   * `GET /api/owner/my-lands`
   *
   * Every land the caller owns, across pending / approved / rejected
   * lifecycle states. Sorted server-side newest-first.
   */
  listMyLands: (): Promise<OwnerLandsResponse> =>
    api.get<OwnerLandsResponse>(`${OWNER_BASE}/my-lands`),
};

export type OwnerLandsService = typeof ownerLandsService;
