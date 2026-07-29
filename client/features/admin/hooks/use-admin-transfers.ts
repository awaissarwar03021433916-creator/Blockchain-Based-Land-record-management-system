"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { adminTransfersService } from "@/features/admin/services/admin-transfers.service";
import {
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE } from "@/types/role";
import type {
  ApproveTransferResponse,
  PendingTransferRequest,
  PendingTransfersResponse,
  RejectTransferResponse,
} from "@/types/admin";

/**
 * `useAdminTransfers` — admin's transfer-review queue.
 *
 * Reads `GET /api/admin/pending-transfer-requests` through React Query.
 * The page consumer reads `query.data?.requests` directly; loading,
 * error, and empty states are derived from the standard query flags
 * plus the `count` envelope field.
 *
 * Caching mirrors `usePendingLands`:
 *   • `staleTime: 15s` — the queue can churn during business hours.
 *   • admin-only gate so a pre-redirect render never fires a 403.
 */
export function useAdminTransfers(): UseQueryResult<
  PendingTransfersResponse,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const isAdmin = role === ROLE.ADMIN;

  return useQuery<PendingTransfersResponse, Error>({
    queryKey: qk.admin.pendingTransfers,
    queryFn: () => adminTransfersService.listPending(),
    enabled: isAuthenticated && isAdmin,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/* ----------------------------- Mutations --------------------------------- */

/**
 * Both mutations invalidate the same fan-out of surfaces:
 *   • the transfers queue itself
 *   • the dashboard KPI counts (pendingTransfers ↓; approvedLands is
 *     unchanged but other counts may shift via the cascade)
 *   • the pending-lands queue (the transfer cascade auto-rejects any
 *     other in-flight requests on the same land — that lands surface
 *     is unrelated but the dashboard *does* read approvedLands which
 *     does NOT change here; we still flush the dashboard to be safe)
 *
 * Centralised so a future fourth surface (e.g. ownership history) is a
 * one-line addition rather than a hunt across every mutation.
 */
function invalidateTransferSurfaces(
  qc: ReturnType<typeof useQueryClient>,
): void {
  void qc.invalidateQueries({ queryKey: qk.admin.pendingTransfers });
  void qc.invalidateQueries({ queryKey: qk.admin.dashboard });
}

/**
 * Optimistically remove a request from the cached envelope.
 *
 * The envelope shape (`{ count, requests }`) means we have to update
 * both fields — leaving `count` stale would make the page header
 * disagree with the table for the duration of the round-trip.
 */
function removeRequestFromCache(
  qc: ReturnType<typeof useQueryClient>,
  requestId: string,
): PendingTransfersResponse | undefined {
  const previous = qc.getQueryData<PendingTransfersResponse>(
    qk.admin.pendingTransfers,
  );
  if (!previous) return undefined;

  const nextRequests = previous.requests.filter((r) => r._id !== requestId);
  qc.setQueryData<PendingTransfersResponse>(qk.admin.pendingTransfers, {
    count: nextRequests.length,
    requests: nextRequests,
  });
  return previous;
}

/**
 * `useApproveTransferMutation` — fires the on-chain transfer.
 *
 * The optimistic update is a remove because, in the success path, the
 * request leaves the admin queue (status moves to "completed"). If the
 * chain reverts (502), the rollback restores the cached envelope so
 * the row reappears for retry.
 *
 * Note: the 500 path ("chain succeeded but DB commit failed") is rare
 * but real — see the controller. It surfaces as a `ServerError` here,
 * and the row will NOT be in the queue on the next refetch even though
 * the cached `data.transferRequest` still says "admin_approved". We
 * don't try to reconcile that here; the page surfaces the message and
 * the admin escalates per the controller's reconciliation note.
 */
export function useApproveTransferMutation(): UseMutationResult<
  ApproveTransferResponse,
  Error,
  string,
  { previous: PendingTransfersResponse | undefined }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      adminTransfersService.approve(requestId),

    onMutate: async (requestId: string) => {
      await qc.cancelQueries({ queryKey: qk.admin.pendingTransfers });
      const previous = removeRequestFromCache(qc, requestId);
      return { previous };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.admin.pendingTransfers, ctx.previous);
      }
    },

    onSettled: () => {
      invalidateTransferSurfaces(qc);
    },
  });
}

/**
 * `useRejectTransferMutation` — admin-side rejection. Same optimistic
 * remove + rollback + invalidate pattern as approve.
 */
export function useRejectTransferMutation(): UseMutationResult<
  RejectTransferResponse,
  Error,
  { requestId: string; reason: string },
  { previous: PendingTransfersResponse | undefined }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }) =>
      adminTransfersService.reject(requestId, { reason }),

    onMutate: async ({ requestId }) => {
      await qc.cancelQueries({ queryKey: qk.admin.pendingTransfers });
      const previous = removeRequestFromCache(qc, requestId);
      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.admin.pendingTransfers, ctx.previous);
      }
    },

    onSettled: () => {
      invalidateTransferSurfaces(qc);
    },
  });
}

/* ----------------------------- Re-exports -------------------------------- */
export type { PendingTransferRequest };
