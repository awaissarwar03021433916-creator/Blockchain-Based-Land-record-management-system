"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { ownerRequestsService } from "@/features/owner/services/owner-requests.service";
import {
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE, hasRole } from "@/types/role";
import type {
  ApproveOwnerTransferResponse,
  OwnerTransferRequestsResponse,
  RejectOwnerTransferResponse,
} from "@/types/owner";

/**
 * `useOwnerTransferRequests` — every TransferRequest on a land the
 * caller owns, across all 5 lifecycle states. The page renders the
 * full history; only `buyer_requested` rows are actionable.
 *
 * Caching:
 *   • `staleTime: 15s` — buyers create requests continuously during
 *     business hours; a short window keeps the queue fresh without
 *     hammering the server on every re-mount.
 *   • role-gated to OWNER or BUYER, matching the backend's dual-role
 *     gate (`authorizeRoles("owner","buyer")`). A buyer who acquires a
 *     land becomes its real owner WITHOUT changing account role, so they
 *     must be able to see incoming requests on lands they own. Per-row
 *     `currentOwner === req.user.id` scoping on the server is the actual
 *     security guard, not the account role.
 */
export function useOwnerTransferRequests(): UseQueryResult<
  OwnerTransferRequestsResponse,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const canManageRequests = hasRole(role, [ROLE.OWNER, ROLE.BUYER]);

  return useQuery<OwnerTransferRequestsResponse, Error>({
    queryKey: qk.owner.transferRequests,
    queryFn: () => ownerRequestsService.listMine(),
    enabled: isAuthenticated && canManageRequests,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/* ----------------------------- Mutations --------------------------------- */

/**
 * Optimistically flip a single request's `status` in the cached
 * envelope. Returns the previous snapshot so the caller can roll
 * back from `onError`.
 *
 * We don't remove the row — the lifecycle table is the point of this
 * surface; the new status badge IS the success confirmation. Removing
 * would hide the action's effect and create a worse UX than waiting.
 */
function flipStatusInCache(
  qc: ReturnType<typeof useQueryClient>,
  requestId: string,
  nextStatus: "owner_approved" | "rejected",
  rejectionReason: string | null = null,
): OwnerTransferRequestsResponse | undefined {
  const previous = qc.getQueryData<OwnerTransferRequestsResponse>(
    qk.owner.transferRequests,
  );
  if (!previous) return undefined;

  qc.setQueryData<OwnerTransferRequestsResponse>(qk.owner.transferRequests, {
    ...previous,
    requests: previous.requests.map((r) =>
      r._id === requestId
        ? { ...r, status: nextStatus, rejectionReason }
        : r,
    ),
  });
  return previous;
}

/**
 * Approving a request doesn't directly change a Land row, but it DOES
 * affect downstream KPI surfaces (the admin queue gains a member; the
 * dashboard counts shift). Rather than enumerate every key, the
 * settle-step refetches the page-owned queue and the dashboard.
 */
function invalidateOwnerRequestSurfaces(
  qc: ReturnType<typeof useQueryClient>,
): void {
  void qc.invalidateQueries({ queryKey: qk.owner.transferRequests });
}

/**
 * `useApproveOwnerTransferMutation` — owner consents to a transfer.
 * Optimistic state flip to `owner_approved`; rollback on failure.
 */
export function useApproveOwnerTransferMutation(): UseMutationResult<
  ApproveOwnerTransferResponse,
  Error,
  string,
  { previous: OwnerTransferRequestsResponse | undefined }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => ownerRequestsService.approve(requestId),

    onMutate: async (requestId: string) => {
      await qc.cancelQueries({ queryKey: qk.owner.transferRequests });
      const previous = flipStatusInCache(qc, requestId, "owner_approved");
      return { previous };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.owner.transferRequests, ctx.previous);
      }
    },

    onSettled: () => {
      invalidateOwnerRequestSurfaces(qc);
    },
  });
}

/**
 * `useRejectOwnerTransferMutation` — owner declines a transfer with
 * a required reason. Same optimistic-flip + rollback pattern; the
 * cached row picks up the new reason for instant display.
 */
export function useRejectOwnerTransferMutation(): UseMutationResult<
  RejectOwnerTransferResponse,
  Error,
  { requestId: string; reason: string },
  { previous: OwnerTransferRequestsResponse | undefined }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }) =>
      ownerRequestsService.reject(requestId, { reason }),

    onMutate: async ({ requestId, reason }) => {
      await qc.cancelQueries({ queryKey: qk.owner.transferRequests });
      const previous = flipStatusInCache(qc, requestId, "rejected", reason);
      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.owner.transferRequests, ctx.previous);
      }
    },

    onSettled: () => {
      invalidateOwnerRequestSurfaces(qc);
    },
  });
}
