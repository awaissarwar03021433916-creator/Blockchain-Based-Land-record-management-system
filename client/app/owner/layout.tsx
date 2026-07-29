import * as React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROLE } from "@/types/role";

/**
 * Segment metadata for every page under `/owner/*`. The pages themselves
 * are client components (they use React Query hooks) and can't export
 * `metadata`, so the title lives here on the server-component layout.
 */
export const metadata: Metadata = {
  title: "Owner Dashboard · Land Registry",
};

/**
 * Owner segment layout — gates every page under `/owner/*` and wraps it
 * in the shared dashboard chrome.
 *
 * Role policy: OWNER or BUYER, matching the backend's dual-role gate on
 * `/api/owner/*` (`authorizeRoles("owner","buyer")`). A buyer who
 * acquires land becomes its real owner WITHOUT changing account role, so
 * they must be able to reach owner functionality (e.g. incoming transfer
 * requests on lands they own). The server's per-row `currentOwner`
 * scoping is the actual security guard — the account role is not.
 */
export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute roles={[ROLE.OWNER, ROLE.BUYER]}>
      <DashboardShell pageLabel="Owner">{children}</DashboardShell>
    </ProtectedRoute>
  );
}
