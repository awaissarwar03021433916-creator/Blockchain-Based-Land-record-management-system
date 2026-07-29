import * as React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROLE } from "@/types/role";

/**
 * Segment metadata for every page under `/admin/*`. The pages themselves
 * are client components (they use React Query hooks) and can't export
 * `metadata`, so the title lives here on the server-component layout.
 */
export const metadata: Metadata = {
  title: "Admin Dashboard · Land Registry",
};

/**
 * Admin segment layout — gates every page under `/admin/*` behind the
 * admin role and wraps it in the shared dashboard chrome.
 *
 * Two layers, in order:
 *  1. ProtectedRoute  — bounces unauthenticated users to /auth/login
 *     and authenticated non-admins to their own dashboard.
 *  2. DashboardShell  — provides sidebar, topbar, and responsive
 *     mobile drawer. The shell itself is role-agnostic; the role-driven
 *     sidebar items come from `navigationConfig[ROLE.ADMIN]`.
 *
 * Each admin page sets its own `pageLabel` via the DashboardShell prop
 * — we don't try to derive it from the route here because nested pages
 * may want a more specific label (e.g. "Admin · Lands · Review").
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute roles={[ROLE.ADMIN]}>
      <DashboardShell pageLabel="Admin">{children}</DashboardShell>
    </ProtectedRoute>
  );
}
