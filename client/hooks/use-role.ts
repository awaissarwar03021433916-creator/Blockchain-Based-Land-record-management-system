"use client";

import {
  selectHasHydrated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE, hasRole, type Role } from "@/types/role";

/**
 * useRole — focused role-permission hook.
 *
 * A specialization of `useAuth` for the (very common) case where a
 * component only needs to know "which role is the user, and is that
 * role allowed here?" — sidebar menus, role-gated buttons, dashboard
 * shells, etc.
 *
 * The boolean shortcuts (`isAdmin` / `isOwner` / `isBuyer`) are cheap
 * derived flags. The `has(allowed)` helper wraps the canonical
 * `hasRole()` predicate from `types/role.ts`, so the allow-list shape
 * stays consistent across the codebase (and a future role addition
 * lights up every call site at compile time).
 *
 * SSR / hydration: same caveat as `useAuth`. Role is `null` pre-hydration
 * for authenticated users too — gate decisions on `hasHydrated`.
 */
export interface UseRoleReturn {
  role: Role | null;
  isAdmin: boolean;
  isOwner: boolean;
  isBuyer: boolean;
  /** True when the current role is in the allow-list. */
  has: (allowed: readonly Role[]) => boolean;
  /** See `useAuth` JSDoc — always gate auth decisions on this. */
  hasHydrated: boolean;
}

export function useRole(): UseRoleReturn {
  const role = useAuthStore(selectRole);
  const hasHydrated = useAuthStore(selectHasHydrated);

  return {
    role,
    isAdmin: role === ROLE.ADMIN,
    isOwner: role === ROLE.OWNER,
    isBuyer: role === ROLE.BUYER,
    has: (allowed) => hasRole(role, allowed),
    hasHydrated,
  };
}
