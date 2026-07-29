"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/hooks/use-auth";
import { ROLE, type Role } from "@/types/role";

/**
 * Route-protection components.
 *
 * Both live in the same file because they are mirror images: one requires
 * authentication, the other requires its ABSENCE. Sharing this file keeps
 * the redirect logic, the hydration gate, and the loading fallback in
 * lockstep — any change to "what does a guarded page look like while
 * the store is hydrating?" lands here and propagates to both flows.
 *
 * Three principles:
 *   1. Never trust the store before it has hydrated. Both components
 *      render the fallback (loading state) until `hasHydrated` is true.
 *      Without this, a refresh on an authenticated page would briefly
 *      see `isAuthenticated === false` and kick the user to /auth/login.
 *   2. Redirects fire from an effect (a side effect), never inline during
 *      render. Calling `router.replace()` during render throws a Next.js
 *      warning and can produce duplicate navigations.
 *   3. Even after a redirect is queued, the matching render still happens
 *      one more time before unmount — so the JSX still has to fall through
 *      to the fallback when the auth state doesn't match. We do that with
 *      explicit guards, not by hoping the redirect happens fast enough.
 */

/* ----------------------------- Fallback --------------------------------- */

/**
 * Default loading surface — centered spinner with a muted "Loading…" line.
 * Components may override via the `fallback` prop (e.g. a role-specific
 * skeleton or `null` for a silent gate).
 */
function DefaultFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading…
      </div>
    </div>
  );
}

/* --------------------- helper: role → dashboard route -------------------- */

/**
 * Map a Role to the route the user should land on when authenticated.
 * Exhaustive over the Role union — adding a new Role somewhere in the
 * codebase produces a TS error here until a corresponding route lands.
 */
function dashboardForRole(role: Role): string {
  switch (role) {
    case ROLE.ADMIN:
      return ROUTES.ADMIN;
    case ROLE.OWNER:
      return ROUTES.OWNER;
    case ROLE.BUYER:
      return ROUTES.BUYER;
  }
}

/* ----------------------------- ProtectedRoute ---------------------------- */

export interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional role allow-list. If provided, the user must (a) be
   * authenticated AND (b) have a role in this list. If omitted, only
   * authentication is required.
   */
  roles?: readonly Role[];
  /**
   * Where to send unauthenticated users. Defaults to /auth/login.
   * Same target is used for authenticated users who fail the role check
   * — they get bounced to their own dashboard rather than seeing a
   * page they aren't allowed on.
   */
  redirectTo?: string;
  /** Override the hydration / redirecting fallback UI. */
  fallback?: React.ReactNode;
}

/**
 * Gate a subtree on authentication (and optionally a role allow-list).
 *
 * Usage:
 *   <ProtectedRoute>...</ProtectedRoute>                     // any role
 *   <ProtectedRoute roles={[ROLE.ADMIN]}>...</ProtectedRoute> // admin only
 */
export function ProtectedRoute({
  children,
  roles,
  redirectTo = ROUTES.LOGIN,
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, role, hasHydrated } = useAuth();

  // Pre-compute whether the role check passes (if a list was supplied).
  const roleAllowed =
    roles === undefined ? true : role !== null && roles.includes(role);

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }
    if (!roleAllowed) {
      // Authenticated but wrong role — bounce to the user's own dashboard
      // (or the public root if the role somehow isn't known).
      router.replace(role ? dashboardForRole(role) : ROUTES.HOME);
    }
  }, [hasHydrated, isAuthenticated, roleAllowed, role, redirectTo, router]);

  // Three render gates, in order:
  //  • not hydrated yet → loading fallback
  //  • not authenticated → fallback while the effect navigates away
  //  • wrong role → fallback while the effect navigates away
  if (!hasHydrated || !isAuthenticated || !roleAllowed) {
    return <>{fallback ?? <DefaultFallback />}</>;
  }

  return <>{children}</>;
}

/* -------------------------------- GuestOnly ------------------------------ */

export interface GuestOnlyProps {
  children: React.ReactNode;
  /**
   * Where to send already-authenticated users. Defaults to the role's
   * dashboard (`dashboardForRole(role)`); pass a string to override.
   */
  redirectTo?: string;
  /** Override the hydration / redirecting fallback UI. */
  fallback?: React.ReactNode;
}

/**
 * The inverse of `ProtectedRoute` — gate a subtree on the user being
 * NOT authenticated. Wrap the login / register pages so a signed-in
 * user landing there is sent to their own dashboard instead of seeing
 * a form they can't actually submit.
 */
export function GuestOnly({ children, redirectTo, fallback }: GuestOnlyProps) {
  const router = useRouter();
  const { isAuthenticated, role, hasHydrated } = useAuth();

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) return;
    const target = redirectTo ?? (role ? dashboardForRole(role) : ROUTES.HOME);
    router.replace(target);
  }, [hasHydrated, isAuthenticated, role, redirectTo, router]);

  if (!hasHydrated || isAuthenticated) {
    return <>{fallback ?? <DefaultFallback />}</>;
  }

  return <>{children}</>;
}
