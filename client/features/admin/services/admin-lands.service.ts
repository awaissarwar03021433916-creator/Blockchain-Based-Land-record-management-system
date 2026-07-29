import { api } from "@/lib/api/client";
import type {
  ApproveLandResponse,
  PendingLand,
  RejectLandRequest,
  RejectLandResponse,
} from "@/types/admin";

/**
 * Admin lands service — typed wrapper over the land-moderation slice of
 * `/api/admin/*`. Lives alongside the other admin services in
 * `features/admin/services/`. Pure async functions; React Query bindings
 * live in `features/admin/hooks/`.
 *
 * Backend reference: `server/controllers/admin.controller.js` + routes
 * in `server/routes/admin.routes.js`.
 *
 * Errors flow through the api client's interceptor — every method here
 * either resolves with the typed body or rejects with a typed
 * `ApiError` subclass.
 */

const ADMIN_BASE = "/api/admin";

export const adminLandsService = {
  /**
   * `GET /api/admin/pending-lands`
   *
   * All Land docs with status === "pending", each populated with its
   * owner's `name`, `email`, `walletAddress`. Server-side sort is the
   * MongoDB default (insertion order) — the table re-sorts on the
   * client by `createdAt desc`.
   */
  listPending: (): Promise<PendingLand[]> =>
    api.get<PendingLand[]>(`${ADMIN_BASE}/pending-lands`),

  /**
   * `PUT /api/admin/approve-land/:landId`
   *
   * Side-effects on success:
   *   • on-chain `registerLand()` is called
   *   • `Land.status` flips to "approved"
   *   • `Land.transactionHash` is persisted with the receipt
   *
   * Failure modes the UI needs to distinguish:
   *   • 400 — land already processed OR owner has no wallet address
   *   • 404 — land not found (raced with another admin)
   *   • 502 — chain reverted
   */
  approve: (landId: string): Promise<ApproveLandResponse> =>
    api.put<ApproveLandResponse>(`${ADMIN_BASE}/approve-land/${landId}`),

  /**
   * `PUT /api/admin/reject-land/:landId`
   *
   * `reason` is required by the backend's `validateRejectReason`
   * middleware (non-empty string, trimmed). Rejected lands never
   * touch the chain.
   */
  reject: (
    landId: string,
    body: RejectLandRequest,
  ): Promise<RejectLandResponse> =>
    api.put<RejectLandResponse>(
      `${ADMIN_BASE}/reject-land/${landId}`,
      body,
    ),
};

export type AdminLandsService = typeof adminLandsService;
