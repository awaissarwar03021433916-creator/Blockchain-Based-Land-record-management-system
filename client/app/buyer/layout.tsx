import * as React from "react";
import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROLE } from "@/types/role";

/**
 * Segment metadata for every page under `/buyer/*`. The pages themselves
 * are client components (they use React Query hooks) and can't export
 * `metadata`, so the title lives here on the server-component layout.
 */
export const metadata: Metadata = {
  title: "Buyer Dashboard · Land Registry",
};

/**
 * Buyer segment layout — gates every page under `/buyer/*` behind the
 * buyer role and wraps it in the shared dashboard chrome.
 *
 * Role policy: buyer-only. A buyer who later acquires land becomes an
 * owner of those plots and operates them through `/owner/*`; the
 * buyer surface stays focused on browsing, requests, and acquired
 * holdings.
 */
export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute roles={[ROLE.BUYER]}>
      <DashboardShell pageLabel="Buyer">{children}</DashboardShell>
    </ProtectedRoute>
  );
}
