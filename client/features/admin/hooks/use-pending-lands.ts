"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { adminLandsService } from "@/features/admin/services/admin-lands.service";
import {
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE } from "@/types/role";
import type {
  ApproveLandResponse,
  PendingLand,
  RejectLandResponse,
} from "@/types/admin";

/**
 * `usePendingLands` — admin's moderation queue.
 *
 * Reads `GET /api/admin/pending-lands` through React Query. The page
 * consumer renders the table directly off `query.data`; loading,
 * error, and empty states are derived from `query.isPending`,
 * `query.isError`, and `data.length === 0` respectively.
 *
 * Caching:
 *   • `staleTime: 15s` — the queue can turn over fast (multiple admins
 *     working in parallel; new submissions arriving continuously). A
 *     short window dedupes re-mounts but doesn't show 5-minute-stale
 *     queues on a moderation surface.
 *   • The query is enabled only for authenticated admins so a momentary
 *     pre-redirect render never fires a 403.
 */
export function usePendingLands(): UseQueryResult<PendingLand[], Error> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const isAdmin = role === ROLE.ADMIN;

  return useQuery<PendingLand[], Error>({
    queryKey: qk.admin.pendingLands,
    queryFn: () => adminLandsService.listPending(),
    enabled: isAuthenticated && isAdmin,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/* ----------------------------- Mutations --------------------------------- */

/**
 * Internal helper: invalidate the dashboard + the queue together.
 *
 * Approving or rejecting a land changes BOTH:
 *  • the queue itself (the land leaves it)
 *  • the dashboard KPI counts (pendingLands ↓; approvedLands ↑ on approve)
 *
 * Centralising the invalidation here means a new mutation in this file
 * doesn't have to remember every surface to refresh.
 */
function invalidateLandSurfaces(
  qc: ReturnType<typeof useQueryClient>,
): void {
  void qc.invalidateQueries({ queryKey: qk.admin.pendingLands });
  void qc.invalidateQueries({ queryKey: qk.admin.dashboard });
}

/**
 * `useApproveLandMutation` — approves a pending land submission.
 *
 * Side-effects on success:
 *  • optimistically removes the land from the cached queue so the row
 *    disappears immediately; the next refetch confirms.
 *  • invalidates the dashboard KPI query so the counts move.
 *
 * Rollback: if the mutation rejects we restore the previous queue
 * snapshot so a chain failure (502 ChainError) doesn't leave the row
 * permanently missing from the UI while still queued on the server.
 */
export function useApproveLandMutation(): UseMutationResult<
  ApproveLandResponse,
  Error,
  string,
  { previous: PendingLand[] | undefined }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (landId: string) => adminLandsService.approve(landId),

    onMutate: async (landId: string) => {
      // Cancel any in-flight queue query so an out-of-order refetch
      // doesn't clobber our optimistic update.
      await qc.cancelQueries({ queryKey: qk.admin.pendingLands });
      const previous = qc.getQueryData<PendingLand[]>(qk.admin.pendingLands);
      if (previous) {
        qc.setQueryData<PendingLand[]>(
          qk.admin.pendingLands,
          previous.filter((l) => l._id !== landId),
        );
      }
      return { previous };
    },

    onError: (_err, _landId, ctx) => {
      // Restore the row — the server still has it pending.
      if (ctx?.previous) {
        qc.setQueryData(qk.admin.pendingLands, ctx.previous);
      }
    },

    onSettled: () => {
      invalidateLandSurfaces(qc);
    },
  });
}

/**
 * `useRejectLandMutation` — rejects a pending land submission with a
 * required reason. Same optimistic-remove / rollback / invalidate
 * pattern as approve.
 */
export function useRejectLandMutation(): UseMutationResult<
  RejectLandResponse,
  Error,
  { landId: string; reason: string },
  { previous: PendingLand[] | undefined }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ landId, reason }) =>
      adminLandsService.reject(landId, { reason }),

    onMutate: async ({ landId }) => {
      await qc.cancelQueries({ queryKey: qk.admin.pendingLands });
      const previous = qc.getQueryData<PendingLand[]>(qk.admin.pendingLands);
      if (previous) {
        qc.setQueryData<PendingLand[]>(
          qk.admin.pendingLands,
          previous.filter((l) => l._id !== landId),
        );
      }
      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.admin.pendingLands, ctx.previous);
      }
    },

    onSettled: () => {
      invalidateLandSurfaces(qc);
    },
  });
}
