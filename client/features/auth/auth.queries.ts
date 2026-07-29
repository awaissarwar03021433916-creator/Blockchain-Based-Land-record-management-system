"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { authService } from "@/services/auth.service";
import {
  selectIsAuthenticated,
  useAuthStore,
} from "@/stores/auth.store";
import type { User } from "@/types/auth";

/**
 * `useMeQuery` — the freshest copy of the authenticated user.
 *
 * Reads `GET /api/auth/me` through React Query and syncs successful
 * results into `auth.store` so any consumer reading the store (route
 * guards, sidebars, header avatars) sees up-to-date data without having
 * to subscribe to this query individually.
 *
 * Behaviour:
 *   • `enabled` — gated on the persisted token, so anonymous users never
 *     fire the request.
 *   • `retry: false` — `GET /api/auth/me` is not implemented on the
 *     backend yet (see `services/auth.service.ts` JSDoc). Retrying a 404
 *     wastes requests and clutters dev tools.
 *   • `staleTime: 5 min` — the user profile rarely changes; the auth
 *     mutations invalidate this key explicitly when they need fresh data.
 */
export function useMeQuery() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  const query = useQuery<User>({
    queryKey: qk.auth.me,
    queryFn: () => authService.getProfile(),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  // Mirror the query result into the persisted store so non-React-Query
  // consumers (axios interceptor, layout guards, sidebar) see fresh data
  // without each having to subscribe to this query themselves.
  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}
