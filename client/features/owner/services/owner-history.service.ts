import { api } from "@/lib/api/client";
import type { OwnerHistoryResponse } from "@/types/owner";

/**
 * Owner history service — typed wrapper over the user-scoped slice of
 * `/api/history/*`. Pure async functions; React Query bindings live in
 * `features/owner/hooks/`.
 *
 * Backend reference: `server/controllers/history.controller.js` +
 * `server/routes/history.route.js`.
 *
 * Errors flow through the api client's interceptor — every method
 * here resolves with the typed body or rejects with a typed
 * `ApiError` subclass.
 */

const HISTORY_BASE = "/api/history";

export const ownerHistoryService = {
  /**
   * `GET /api/history/my-history`
   *
   * Every OwnershipHistory row where the caller is the previous or
   * new owner. Server-side sort is newest transfer first; populated
   * with land + both participants (name / email / walletAddress).
   */
  listMine: (): Promise<OwnerHistoryResponse> =>
    api.get<OwnerHistoryResponse>(`${HISTORY_BASE}/my-history`),
};

export type OwnerHistoryService = typeof ownerHistoryService;
