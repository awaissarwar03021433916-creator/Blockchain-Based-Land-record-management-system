import { api } from "@/lib/api/client";
import type {
  ApproveTransferResponse,
  PendingTransfersResponse,
  RejectTransferRequest,
  RejectTransferResponse,
} from "@/types/admin";

/**
 * Admin transfers service — typed wrapper over the transfer-moderation
 * slice of `/api/admin/*`. Lives alongside the other admin services in
 * `features/admin/services/`. Pure async functions; React Query
 * bindings live in `features/admin/hooks/`.
 *
 * Backend reference:
 *   • `server/controllers/adminTransfer.controller.js`
 *   • `server/routes/admin.routes.js`
 *
 * Lifecycle context: the admin only ever acts on requests already
 * approved by the seller (status === "owner_approved"). See
 * `TransferRequest.model.js` for the full 5-state machine.
 *
 * Errors flow through the api client's interceptor — every method
 * here either resolves with the typed body or rejects with a typed
 * `ApiError` subclass. The approve path can return `ChainError` (502)
 * when the on-chain `transferOwnership()` reverts.
 */

const ADMIN_BASE = "/api/admin";

export const adminTransfersService = {
  /**
   * `GET /api/admin/pending-transfer-requests`
   *
   * Returns `{ count, requests }`. Each request is populated with
   * `land`, `buyer`, `currentOwner` (name / email / walletAddress).
   * Server-side sort is FIFO (oldest first); the page re-sorts on the
   * client by `createdAt desc` to surface the freshest items first.
   */
  listPending: (): Promise<PendingTransfersResponse> =>
    api.get<PendingTransfersResponse>(
      `${ADMIN_BASE}/pending-transfer-requests`,
    ),

  /**
   * `PUT /api/admin/approve-transfer/:requestId`
   *
   * Atomic claim → on-chain `transferOwnership()` → DB commit. Side
   * effects on the cascade:
   *   • Land.owner flips to the buyer
   *   • this TransferRequest → completed (+ tx hash)
   *   • other competing TransferRequests on the same land → rejected
   *   • active SaleListing → sold (+ tx hash)
   *   • OwnershipHistory ledger row appended (append-only audit)
   *
   * Failure modes the UI distinguishes:
   *   • 400 — request not in owner_approved state OR linked land stale
   *   • 404 — request or land not found
   *   • 409 — stale ownership (already transferred) OR claim race
   *   • 502 — chain reverted (rolls back to owner_approved on the server)
   *   • 500 — chain succeeded but DB commit failed — surfaces tx hash
   *           for manual reconciliation
   */
  approve: (requestId: string): Promise<ApproveTransferResponse> =>
    api.put<ApproveTransferResponse>(
      `${ADMIN_BASE}/approve-transfer/${requestId}`,
    ),

  /**
   * `PUT /api/admin/reject-transfer/:requestId`
   *
   * `reason` is required (non-empty after trim) by the backend's
   * `validateRejectReason` middleware. Reject never touches the chain;
   * the row is moved to `rejected` and the reason is stored.
   */
  reject: (
    requestId: string,
    body: RejectTransferRequest,
  ): Promise<RejectTransferResponse> =>
    api.put<RejectTransferResponse>(
      `${ADMIN_BASE}/reject-transfer/${requestId}`,
      body,
    ),
};

export type AdminTransfersService = typeof adminTransfersService;
