"use client";

import {
  selectHasHydrated,
  selectIsAuthenticated,
  selectRole,
  selectToken,
  selectUser,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE, type Role } from "@/types/role";
import type { User } from "@/types/user";

/**
 * useAuth — the single read-side entry point for authentication state.
 *
 * Returns the persisted session (`token`, `role`, `user`), the derived
 * `isAuthenticated` flag, three role booleans, and — critically —
 * `hasHydrated`. Components that branch on auth state MUST gate their
 * decision on `hasHydrated`, because the Zustand persist middleware
 * reads localStorage asynchronously after mount. Without that gate:
 *
 *   • On the FIRST client render, `token` is null even for an authenticated
 *     user, so a naive `if (!isAuthenticated) redirect("/auth/login")`
 *     would kick out signed-in users on every page reload.
 *   • Server-rendered HTML always shows unauthenticated state; the client
 *     then re-renders with the real values once the store hydrates.
 *
 * The recommended pattern:
 *
 *   const { isAuthenticated, hasHydrated } = useAuth();
 *   if (!hasHydrated) return <PageSkeleton />;
 *   if (!isAuthenticated) router.replace("/auth/login");
 *
 * Each property is read via its individual selector so a component that
 * only consumes (say) `role` does not re-render when `user` changes.
 */
export interface UseAuthReturn {
  /** Persisted JWT. `null` when not authenticated or pre-hydration. */
  token: string | null;
  /**
   * Full user profile. Populated by `useMeQuery` after login; `null`
   * until that query resolves (and currently always `null` until the
   * backend ships `GET /api/auth/me`).
   */
  user: User | null;
  /**
   * Role from the login response — available immediately after login,
   * even before `user` is populated.
   */
  role: Role | null;
  /** True when a token is present. False pre-hydration. */
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isBuyer: boolean;
  /**
   * True once the Zustand persist middleware has rehydrated the store
   * from localStorage. Always check this before acting on
   * `isAuthenticated === false`.
   */
  hasHydrated: boolean;
}

export function useAuth(): UseAuthReturn {
  const token = useAuthStore(selectToken);
  const user = useAuthStore(selectUser);
  const role = useAuthStore(selectRole);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const hasHydrated = useAuthStore(selectHasHydrated);

  return {
    token,
    user,
    role,
    isAuthenticated,
    isAdmin: role === ROLE.ADMIN,
    isOwner: role === ROLE.OWNER,
    isBuyer: role === ROLE.BUYER,
    hasHydrated,
  };
}
