"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { adminService } from "@/features/admin/services/admin.service";
import {
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE } from "@/types/role";
import type { AdminDashboardStats } from "@/types/admin";

/**
 * `useAdminDashboard` — admin overview KPI counts.
 *
 * Reads `GET /api/admin/stats` through React Query. The dashboard surface
 * imports this hook; everything else (skeletons, error fallback,
 * card-by-card mapping) is presentation.
 *
 * Behaviour:
 *   • `enabled` — gated on the persisted session AND on the user
 *     actually being an admin. Without this check the layout's
 *     ProtectedRoute would still let a momentary pre-redirect render
 *     fire the request and get a 403 back, polluting devtools.
 *   • `staleTime: 30s` — pending queues turn over fast; a short window
 *     is enough to dedupe re-mounts (e.g. switching tabs) without
 *     showing 5-minute-stale numbers on a moderation surface.
 *   • errors are normalized by the api client (`lib/api/client.ts`).
 *     The consumer reads `query.error` directly — it is an
 *     `ApiError` subclass, never a raw axios error.
 */
export function useAdminDashboard(): UseQueryResult<
  AdminDashboardStats,
  Error
> {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);
  const isAdmin = role === ROLE.ADMIN;

  return useQuery<AdminDashboardStats, Error>({
    queryKey: qk.admin.dashboard,
    queryFn: () => adminService.getDashboardStats(),
    enabled: isAuthenticated && isAdmin,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    // Single retry is enough for a transient network hiccup. We don't
    // want to retry on 401/403 — but the api client's interceptor
    // already clears the session on 401, and React Query's default
    // behavior of NOT retrying after onError firing once is fine here.
    retry: 1,
  });
}
