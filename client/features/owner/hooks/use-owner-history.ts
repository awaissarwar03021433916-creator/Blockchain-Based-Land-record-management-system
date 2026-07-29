"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { ownerHistoryService } from "@/features/owner/services/owner-history.service";
import {
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE, hasRole } from "@/types/role";
import type { OwnerHistoryResponse } from "@/types/owner";

/**
 * `useOwnerHistory` — the caller's personal ownership ledger.
 *
 * Reads `GET /api/history/my-history` through React Query. The page
 * consumer reads `query.data?.history`; loading, error, and empty
 * states are derived from the standard query flags plus the
 * envelope's `count` field.
 *
 * Caching:
 *   • `staleTime: 60s` — the ledger is append-only and slow-moving
 *     (one row per on-chain transfer the user was a party to). A
 *     full minute keeps the surface snappy on revisit without
 *     showing genuinely stale history.
 *   • role-gated to OWNER or BUYER, matching the backend's dual-role
 *     gate — both can be parties to an on-chain transfer.
 */
export function useOwnerHistory(): UseQueryResult<
  OwnerHistoryResponse,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const canAccess = hasRole(role, [ROLE.OWNER, ROLE.BUYER]);

  return useQuery<OwnerHistoryResponse, Error>({
    queryKey: qk.owner.history,
    queryFn: () => ownerHistoryService.listMine(),
    enabled: isAuthenticated && canAccess,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
