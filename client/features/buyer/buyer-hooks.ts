"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { buyerApi } from "@/features/buyer/buyer-api";
import { ownerLandsService } from "@/features/owner/services/owner-lands.service";
import {
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE } from "@/types/role";
import type { OwnerHistoryResponse } from "@/types/owner";
import type {
  BuyerPropertiesResponse,
  BuyerTransferRequestsResponse,
  CreateTransferRequestResponse,
  MarketplaceLand,
  MarketplaceResponse,
  TransferRequestPayload,
} from "@/features/buyer/buyer-types";

/**
 * Buyer React Query hooks — the binding layer between `buyerApi`
 * (`features/buyer/buyer-api.ts`) and the buyer UI.
 *
 * Architecture is identical to the owner/admin hook files
 * (`features/owner/hooks/*`, `features/admin/hooks/*`):
 *   • Each query is gated `enabled: isAuthenticated && role === BUYER`,
 *     so a pre-redirect render never fires a request that would 403.
 *   • Loading / error / empty states are NOT bespoke — consumers read
 *     the standard React Query flags (`isPending`, `isError`, `error`,
 *     `isFetching`) plus the envelope `count` field.
 *   • Errors are already classified into typed `ApiError` subclasses by
 *     the axios interceptor (see `lib/api/client.ts`), so nothing is
 *     caught here; the page decides toast-vs-inline via
 *     `getDisplayMessage`.
 *   • Cache keys come from the centralized `qk` factory — never inlined.
 *
 * Query-key note: there is no `qk.buyer.*` namespace yet (adding one
 * would require editing `config/query-keys.ts`, out of scope for this
 * file). We reuse the keys already reserved for exactly these surfaces:
 *   • marketplace      → `qk.listings.marketplace`
 *   • transfer requests→ `qk.transfers.mine`
 *   • ownership history→ `qk.owner.history` (the SAME user-scoped
 *     `/api/history/my-history` endpoint the owner hook reads; sharing
 *     the cache is correct because the data is identical per user).
 * Follow-up: promote these to a dedicated `qk.buyer` namespace.
 */

/* ====================================================================== */
/*  Queries                                                               */
/* ====================================================================== */

/**
 * `useMarketplaceLands` — every approved, actively-listed land the
 * caller could request (their own lands are excluded server-side).
 *
 * Caching: `staleTime: 30s` — the marketplace shifts as owners list /
 * admins approve, but not second-by-second; 30s dedupes re-mounts and
 * grid ↔ detail navigation without showing a stale catalogue.
 */
export function useMarketplaceLands(): UseQueryResult<
  MarketplaceResponse,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const isBuyer = role === ROLE.BUYER;

  return useQuery<MarketplaceResponse, Error>({
    queryKey: qk.listings.marketplace,
    queryFn: () => buyerApi.getApprovedLands(),
    enabled: isAuthenticated && isBuyer,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * `useMarketplaceLand` — a single marketplace land by id.
 *
 * There is NO dedicated `GET /api/buyer/lands/:id` endpoint, so this
 * hook shares the marketplace LIST query (same `queryKey` + `queryFn`)
 * and narrows to one row via `select`. Benefits:
 *   • a warm list cache resolves the detail instantly (no extra round
 *     trip when navigating grid → detail);
 *   • a cold cache (deep-link straight to `/lands/[id]`) fetches the
 *     list once and selects from it.
 *
 * `select` runs on every cache change, so it's memo-stable here (a
 * cheap `find`). Returns `MarketplaceLand | undefined`; `undefined`
 * after a successful fetch means the land isn't currently listed (sold,
 * delisted, or never existed) — the page renders a not-found state.
 */
export function useMarketplaceLand(
  id: string,
): UseQueryResult<MarketplaceLand | undefined, Error> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const isBuyer = role === ROLE.BUYER;

  return useQuery<
    MarketplaceResponse,
    Error,
    MarketplaceLand | undefined
  >({
    queryKey: qk.listings.marketplace,
    queryFn: () => buyerApi.getApprovedLands(),
    enabled: isAuthenticated && isBuyer && Boolean(id),
    select: (data) => data.lands.find((land) => land._id === id),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * `useBuyerTransferRequests` — every transfer request the caller has
 * filed, across all 5 lifecycle states (newest first).
 *
 * Caching: `staleTime: 15s` — the status advances as owners/admins act
 * on a request; a short window keeps the buyer's "my requests" view
 * current without hammering the server on every re-mount.
 */
export function useBuyerTransferRequests(): UseQueryResult<
  BuyerTransferRequestsResponse,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const isBuyer = role === ROLE.BUYER;

  return useQuery<BuyerTransferRequestsResponse, Error>({
    queryKey: qk.transfers.mine,
    queryFn: () => buyerApi.getMyTransferRequests(),
    enabled: isAuthenticated && isBuyer,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * `useBuyerHistory` — the caller's personal ownership ledger
 * (`GET /api/history/my-history`).
 *
 * Caching: `staleTime: 60s` — the ledger is append-only and slow-moving
 * (one row per on-chain transfer the user was a party to), so a full
 * minute keeps the surface snappy on revisit without showing stale data.
 */
export function useBuyerHistory(): UseQueryResult<
  OwnerHistoryResponse,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const isBuyer = role === ROLE.BUYER;

  return useQuery<OwnerHistoryResponse, Error>({
    queryKey: qk.owner.history,
    queryFn: () => buyerApi.getMyHistory(),
    enabled: isAuthenticated && isBuyer,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * `useBuyerProperties` — the lands the caller currently owns.
 *
 * Sourced from `ownerLandsService.listMyLands()` (`GET /api/owner/my-lands`):
 * a buyer keeps role "buyer" after acquiring land, but the backend's
 * `authorizeRoles("owner","buyer")` gate accepts them — `Land.owner` is the
 * live ownership pointer, so this endpoint is the authoritative "what I own
 * right now" snapshot (current holdings, NOT the history ledger).
 *
 * The shared `useOwnerLands` hook is gated to `role === OWNER` and never runs
 * for a buyer, hence this buyer-gated binding. It reuses the
 * `qk.owner.myLands` cache key because it's the same endpoint + data; the
 * response shape is `BuyerPropertiesResponse` (alias of `OwnerLandsResponse`).
 */
export function useBuyerProperties(): UseQueryResult<
  BuyerPropertiesResponse,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const isBuyer = role === ROLE.BUYER;

  return useQuery<BuyerPropertiesResponse, Error>({
    queryKey: qk.owner.myLands,
    queryFn: () => ownerLandsService.listMyLands(),
    enabled: isAuthenticated && isBuyer,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/* ====================================================================== */
/*  Mutations                                                             */
/* ====================================================================== */

/**
 * `useRequestTransfer` — file a transfer request on a listed land
 * (`POST /api/buyer/request-transfer`).
 *
 * NOT optimistic, by design. The POST returns an UNPOPULATED request
 * (`land`/`currentOwner` as raw ids), whereas the list query returns
 * fully populated rows — optimistically inserting the bare doc would
 * render a row with blank plot/location until the refetch settled,
 * which is worse than a brief spinner. So we follow the create-mutation
 * pattern from `use-submit-land.ts`: invalidate on success and let the
 * list refetch the canonical, populated row.
 *
 * Cache invalidation on success:
 *   • `qk.transfers.mine`      — the new request must appear in the
 *     buyer's "my requests" list.
 *   • `qk.listings.marketplace`— so any "already requested" affordance
 *     the marketplace derives by cross-referencing requests stays
 *     accurate (cheap; the listing row itself is unchanged).
 *
 * Errors propagate as typed `ApiError` subclasses — the caller handles
 * the common ones (`ConflictError` 409 = duplicate active request,
 * `ValidationError` 400 = not listed / no wallet / already owned).
 */
export function useRequestTransfer(): UseMutationResult<
  CreateTransferRequestResponse,
  Error,
  TransferRequestPayload
> {
  const qc = useQueryClient();
  return useMutation<
    CreateTransferRequestResponse,
    Error,
    TransferRequestPayload
  >({
    mutationFn: (payload) => buyerApi.requestTransfer(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.transfers.mine });
      void qc.invalidateQueries({ queryKey: qk.listings.marketplace });
    },
  });
}
