import { api } from "@/lib/api/client";
import type { OwnerHistoryResponse } from "@/types/owner";
import type {
  BuyerTransferRequestsResponse,
  CreateTransferRequestResponse,
  MarketplaceResponse,
  TransferRequestPayload,
} from "@/features/buyer/buyer-types";

/**
 * Buyer API service — typed wrappers over the `/api/buyer/*` slice
 * (plus the user-scoped `/api/history/my-history`, which the buyer
 * surface reuses for its ownership-audit feed).
 *
 * Architecture (identical to `features/owner/services/*` and
 * `features/admin/services/*`):
 *   • Pure async functions — NO React. React Query bindings live in
 *     `features/buyer/hooks/`.
 *   • The single HTTP dependency is the `api` helper from
 *     `lib/api/client.ts`. That instance is where the cross-cutting
 *     concerns are centralised, so they are NOT re-implemented here:
 *       – TOKEN AUTH: a request interceptor injects
 *         `Authorization: Bearer <jwt>` from the zustand auth store on
 *         every call (anonymous calls simply omit it).
 *       – ERROR HANDLING: a response interceptor funnels every failure
 *         through `normalizeApiError`, so each method below either
 *         resolves with the typed body or REJECTS with a typed
 *         `ApiError` subclass (`ValidationError`, `ConflictError`,
 *         `ChainError`, …). Call sites branch on those classes via
 *         `instanceof` instead of shape-sniffing HTTP codes.
 *     (Note: `lib/axios.ts` is an unused "Not implemented" stub — the
 *     real configured instance is `lib/api/client.ts`.)
 *   • The `api.get<T>` / `api.post<T>` helpers already unwrap
 *     `response.data`, so methods return the body shape directly.
 *
 * Backend reference: `server/controllers/buyer.controller.js`,
 * `server/controllers/history.controller.js`.
 */

const BUYER_BASE = "/api/buyer";
const HISTORY_BASE = "/api/history";

export const buyerApi = {
  /**
   * `GET /api/buyer/approved-lands`
   *
   * The marketplace: every approved land with an active
   * `listed_for_sale` SaleListing, EXCLUDING lands the caller already
   * owns. Each land carries a populated `owner` and a `listing` handle.
   * Sorted server-side newest-listed-first.
   */
  getApprovedLands: (): Promise<MarketplaceResponse> =>
    api.get<MarketplaceResponse>(`${BUYER_BASE}/approved-lands`),

  /**
   * `GET /api/buyer/transfer-requests`
   *
   * Every TransferRequest the caller has filed, across all 5 lifecycle
   * states, newest-first. `land` and `currentOwner` are populated; the
   * `buyer` reference is omitted (the caller IS the buyer).
   */
  getMyTransferRequests: (): Promise<BuyerTransferRequestsResponse> =>
    api.get<BuyerTransferRequestsResponse>(`${BUYER_BASE}/transfer-requests`),

  /**
   * `POST /api/buyer/request-transfer`
   *
   * Files a transfer request on a listed land — the FIRST step of the
   * two-tier transfer flow (creates a `buyer_requested` row awaiting
   * owner consent). The on-chain destination is snapshotted from the
   * caller's wallet at creation time.
   *
   * Failure modes (all surfaced as typed `ApiError` subclasses):
   *   • 400 ValidationError — missing/invalid `landId`, oversized
   *     `requestMessage`, land not approved / not listed, no wallet on
   *     the caller's profile, or requesting a land they already own
   *   • 404 NotFoundError   — land does not exist
   *   • 409 ConflictError   — an active request already exists for this
   *     buyer + land (the partial unique index is the race-safe backstop)
   */
  requestTransfer: (
    payload: TransferRequestPayload,
  ): Promise<CreateTransferRequestResponse> =>
    api.post<CreateTransferRequestResponse>(
      `${BUYER_BASE}/request-transfer`,
      payload,
    ),

  /**
   * `GET /api/history/my-history`
   *
   * The caller's ownership-audit feed: every OwnershipHistory ledger
   * row where they are the previous OR new owner, newest transfer
   * first. Populated with land + both participants. Reuses the shared
   * `OwnerHistoryResponse` shape (the endpoint is role-agnostic and
   * scoped by `req.user.id`).
   */
  getMyHistory: (): Promise<OwnerHistoryResponse> =>
    api.get<OwnerHistoryResponse>(`${HISTORY_BASE}/my-history`),
};

export type BuyerApi = typeof buyerApi;
