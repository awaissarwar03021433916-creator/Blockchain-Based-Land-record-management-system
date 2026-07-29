"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { ownerLandsService } from "@/features/owner/services/owner-lands.service";
import {
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE, hasRole } from "@/types/role";
import type { OwnerLandsResponse } from "@/types/owner";

/**
 * `useOwnerLands` — the caller's land portfolio.
 *
 * Reads `GET /api/owner/my-lands` through React Query. The page
 * consumer reads `query.data?.lands`; loading, error, and empty
 * states are derived from the standard query flags + the envelope
 * `count` field.
 *
 * Behaviour:
 *   • `enabled` gated on the persisted session AND on the role being
 *     OWNER or BUYER, matching the backend's dual-role gate
 *     (`authorizeRoles("owner","buyer")`) — a buyer who acquires land
 *     becomes its real owner without changing account role, so they own
 *     a portfolio too. Per-row server scoping is the real guard.
 *   • `staleTime: 30s` — the portfolio doesn't change minute-by-minute;
 *     a 30-second window dedupes re-mounts without showing stale
 *     status badges after the admin approves a pending submission.
 */
export function useOwnerLands(): UseQueryResult<OwnerLandsResponse, Error> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const canAccess = hasRole(role, [ROLE.OWNER, ROLE.BUYER]);

  return useQuery<OwnerLandsResponse, Error>({
    queryKey: qk.owner.myLands,
    queryFn: () => ownerLandsService.listMyLands(),
    enabled: isAuthenticated && canAccess,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
