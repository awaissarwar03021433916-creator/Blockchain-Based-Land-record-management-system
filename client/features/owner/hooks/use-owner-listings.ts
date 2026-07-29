"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { ownerListingsService } from "@/features/owner/services/owner-listings.service";
import {
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE, hasRole } from "@/types/role";
import type {
  OwnerListingsResponse,
  RemoveOwnerListingResponse,
} from "@/types/owner";

/**
 * `useOwnerListings` — the caller's marketplace listings.
 *
 * Reads `GET /api/owner/listings` through React Query. The page
 * consumer reads `query.data?.listings`; loading, error, and empty
 * states are derived from the standard query flags plus the envelope
 * `count` field.
 *
 * Behaviour mirrors `useOwnerLands`:
 *   • role-gated to OWNER or BUYER, matching the backend's dual-role
 *     gate — a buyer who acquired land can list it for sale too.
 *   • `staleTime: 30s` — listings don't churn minute-by-minute, but
 *     admin moderation can flip pending → listed/not_for_sale during a
 *     session; a 30-second window dedupes re-mounts without showing
 *     hours-stale state badges.
 */
export function useOwnerListings(): UseQueryResult<
  OwnerListingsResponse,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const canAccess = hasRole(role, [ROLE.OWNER, ROLE.BUYER]);

  return useQuery<OwnerListingsResponse, Error>({
    queryKey: qk.owner.myListings,
    queryFn: () => ownerListingsService.listMine(),
    enabled: isAuthenticated && canAccess,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * `useRemoveOwnerListingMutation` — delist an active listing.
 *
 * Optimistic update: we don't remove the row — the listing should
 * stay visible with its new `not_for_sale` badge, so the owner gets
 * visual confirmation that the action took effect. Rolls back the
 * state change on failure.
 */
export function useRemoveOwnerListingMutation(): UseMutationResult<
  RemoveOwnerListingResponse,
  Error,
  string,
  { previous: OwnerListingsResponse | undefined }
> {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ownerListingsService.remove(id),

    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: qk.owner.myListings });
      const previous = qc.getQueryData<OwnerListingsResponse>(
        qk.owner.myListings,
      );
      if (previous) {
        qc.setQueryData<OwnerListingsResponse>(qk.owner.myListings, {
          ...previous,
          listings: previous.listings.map((l) =>
            l._id === id ? { ...l, state: "not_for_sale" as const } : l,
          ),
        });
      }
      return { previous };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.owner.myListings, ctx.previous);
      }
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.owner.myListings });
    },
  });
}
