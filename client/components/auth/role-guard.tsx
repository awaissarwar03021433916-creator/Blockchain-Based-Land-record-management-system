"use client";

import * as React from "react";
import { useRole } from "@/hooks/use-role";
import type { Role } from "@/types/role";

/**
 * RoleGuard — conditional rendering of in-page UI based on role.
 *
 * Distinct from `<ProtectedRoute>` (which redirects). `<RoleGuard>` is for
 * elements that are visible to SOME roles and hidden from others on the
 * same page — e.g. an "Approve" button visible only to admins, or a
 * "Sell this land" button visible only to owners.
 *
 * Pre-hydration the guard renders `fallback` (defaults to nothing) so
 * role-gated UI never flashes before the persisted role is known.
 *
 * Usage:
 *   <RoleGuard role={ROLE.ADMIN}><ApproveButton/></RoleGuard>
 *   <RoleGuard role={[ROLE.OWNER, ROLE.BUYER]}><MarketplaceLink/></RoleGuard>
 */
export interface RoleGuardProps {
  /** Single role or an allow-list of roles permitted to see `children`. */
  role: Role | readonly Role[];
  children: React.ReactNode;
  /** Rendered when the gate denies. Defaults to nothing. */
  fallback?: React.ReactNode;
}

export function RoleGuard({
  role,
  children,
  fallback = null,
}: RoleGuardProps) {
  const { has, hasHydrated } = useRole();

  // Avoid flashing role-gated UI while the persist middleware is reading
  // localStorage. A guard that decides on the still-null pre-hydration role
  // would briefly render the fallback even for users who actually qualify.
  if (!hasHydrated) return <>{fallback}</>;

  const allowed: readonly Role[] = Array.isArray(role) ? role : [role];
  if (!has(allowed)) return <>{fallback}</>;

  return <>{children}</>;
}
