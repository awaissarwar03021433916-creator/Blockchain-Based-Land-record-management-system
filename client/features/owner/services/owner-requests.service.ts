import { api } from "@/lib/api/client";
import type {
  ApproveOwnerTransferResponse,
  OwnerTransferRequestsResponse,
  RejectOwnerTransferRequest,
  RejectOwnerTransferResponse,
} from "@/types/owner";

/**
 * Owner transfer-requests service — typed wrapper over the
 * `/api/owner/*` transfer slice. Pure async functions; React Query
 * bindings live in `features/owner/hooks/`.
 *
 * Lifecycle position: the OWNER is the first approval gate in the
 * two-tier transfer flow.
 *
 *     buyer_requested -> owner_approved -> admin_approved -> completed
 *                             |                  |
 *                             v                  v
 *                          rejected           rejected
 *
 * Owners only act on requests in `buyer_requested`; everything else
 * is read-only history on this surface.
 *
 * Backend reference: `server/controllers/owner.controller.js`.
 */

const OWNER_BASE = "/api/owner";

export const ownerRequestsService = {
  /**
   * `GET /api/owner/transfer-requests`
   *
   * Every TransferRequest whose snapshotted seller is the caller —
   * includes the actionable queue (`buyer_requested`) as well as
   * historical rows the owner has already touched, so the dashboard
   * can show a full lifecycle view. The frontend filters by status
   * as needed.
   */
  listMine: (): Promise<OwnerTransferRequestsResponse> =>
    api.get<OwnerTransferRequestsResponse>(`${OWNER_BASE}/transfer-requests`),

  /**
   * `PUT /api/owner/approve-transfer/:id`
   *
   * Transitions `buyer_requested` → `owner_approved`. Does NOT touch
   * the chain — that's the admin's job in the next stage. Side-effects:
   *   • per-row scoped to the caller (the snapshotted seller)
   *   • atomic conditional update against the previous state, so a
   *     double-click / race can't double-approve
   *
   * Failure modes:
   *   • 400 — request not in `buyer_requested` state
   *   • 403 — caller is not the snapshotted owner
   *   • 404 — request (or linked land) not found
   *   • 409 — owner no longer owns the land OR concurrent action
   */
  approve: (requestId: string): Promise<ApproveOwnerTransferResponse> =>
    api.put<ApproveOwnerTransferResponse>(
      `${OWNER_BASE}/approve-transfer/${requestId}`,
    ),

  /**
   * `PUT /api/owner/reject-transfer/:id`
   *
   * Transitions `buyer_requested` → `rejected` (terminal). `reason`
   * is required by the backend's `validateRejectReason` middleware
   * (non-empty after trim) and is shown to the buyer.
   */
  reject: (
    requestId: string,
    body: RejectOwnerTransferRequest,
  ): Promise<RejectOwnerTransferResponse> =>
    api.put<RejectOwnerTransferResponse>(
      `${OWNER_BASE}/reject-transfer/${requestId}`,
      body,
    ),
};

export type OwnerRequestsService = typeof ownerRequestsService;
