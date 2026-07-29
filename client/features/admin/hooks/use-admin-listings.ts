"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { adminListingsService } from "@/features/admin/services/admin-listings.service";
import {
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE } from "@/types/role";
import type {
  ApproveListingResponse,
  PendingListing,
  PendingListingsResponse,
} from "@/types/admin";

/**
 * `useAdminListings` — admin's listing-moderation queue.
 *
 * Reads `GET /api/admin/pending-listings` through React Query. The
 * page consumer reads `query.data?.listings`; loading, error, and
 * empty states are derived from the standard query flags plus the
 * envelope `count` field.
 *
 * Caching:
 *   • `staleTime: 15s` — owners submit continuously during business
 *     hours; a short window dedupes re-mounts but doesn't show
 *     genuinely stale queues on a moderation surface.
 *   • admin-only gate so a pre-redirect render never fires a 403.
 */
export function useAdminListings(): UseQueryResult<
  PendingListingsResponse,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const isAdmin = role === ROLE.ADMIN;

  return useQuery<PendingListingsResponse, Error>({
    queryKey: qk.admin.pendingListings,
    queryFn: () => adminListingsService.listPending(),
    enabled: isAuthenticated && isAdmin,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/* ----------------------------- Mutations --------------------------------- */

/**
 * Optimistically remove a listing from the cached envelope.
 *
 * The envelope shape (`{ count, listings }`) means we have to update
 * BOTH fields — leaving `count` stale would make the page header
 * disagree with the table for the duration of the round-trip.
 */
function removeListingFromCache(
  qc: ReturnType<typeof useQueryClient>,
  listingId: string,
): PendingListingsResponse | undefined {
  const previous = qc.getQueryData<PendingListingsResponse>(
    qk.admin.pendingListings,
  );
  if (!previous) return undefined;

  const nextListings = previous.listings.filter((l) => l._id !== listingId);
  qc.setQueryData<PendingListingsResponse>(qk.admin.pendingListings, {
    count: nextListings.length,
    listings: nextListings,
  });
  return previous;
}

/**
 * `useApproveListingMutation` — flip a pending listing into
 * `listed_for_sale`.
 *
 * The optimistic update is a remove because, in the success path, the
 * listing leaves the admin queue (state moves to `listed_for_sale`).
 * Rollback restores the cached envelope on failure (e.g. the 409
 * stale-listing path).
 *
 * The settle step invalidates the queue AND the admin dashboard
 * because the dashboard reads aggregate counts in the same screen;
 * approving a listing doesn't move any of the four headline KPIs
 * today, but invalidating is cheap and keeps the fan-out consistent
 * with the other admin mutations.
 */
export function useApproveListingMutation(): UseMutationResult<
  ApproveListingResponse,
  Error,
  string,
  { previous: PendingListingsResponse | undefined }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => adminListingsService.approve(listingId),

    onMutate: async (listingId: string) => {
      // Cancel any in-flight queue query so an out-of-order refetch
      // doesn't clobber our optimistic update.
      await qc.cancelQueries({ queryKey: qk.admin.pendingListings });
      const previous = removeListingFromCache(qc, listingId);
      return { previous };
    },

    onError: (_err, _id, ctx) => {
      // Restore the row — the server still has it pending.
      if (ctx?.previous) {
        qc.setQueryData(qk.admin.pendingListings, ctx.previous);
      }
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.pendingListings });
      void qc.invalidateQueries({ queryKey: qk.admin.dashboard });
    },
  });
}

/* ----------------------------- Re-exports -------------------------------- */
export type { PendingListing };
