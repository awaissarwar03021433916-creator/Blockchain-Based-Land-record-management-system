import * as React from "react";
import type { Metadata } from "next";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Landmark,
  Users,
  UserPlus,
} from "lucide-react";
import {
  ActivityFeed,
  QuickAction,
  QuickActionGroup,
  type ActivityItem,
} from "@/components/dashboard";
import { ROUTES } from "@/config/routes";
import { AdminStats } from "./_components/admin-stats";

/**
 * Admin Dashboard — overview surface for the administrator role.
 *
 * Layout (top → bottom, responsive):
 *   1. Page header              — title + subtitle, full width
 *   2. Stats grid               — 4 KPI tiles (1 / 2 / 4 cols)
 *   3. Two-column content row   — Activity feed (2/3) + Quick actions (1/3)
 *                                 collapses to a single column on lg-down
 *
 * Composition:
 *   • Page itself is a server component (static markup, metadata export).
 *   • `<AdminStats />` is a client subtree that calls `useAdminDashboard`
 *     and handles loading / error / success states for the four KPI tiles.
 *   • Activity feed is still placeholder data — wired in a later turn.
 */
export const metadata: Metadata = {
  title: "Admin Dashboard · Land Registry",
};

/* ---------------- dummy data (activity only — stats are live) ------------ */

const recentActivity: readonly ActivityItem[] = [
  {
    id: "1",
    title: "New land submitted for verification",
    meta: "Plot LR-2031 · Karachi · Owner: Hira Mahmood",
    timestamp: "8m ago",
    icon: FileText,
    tone: "info",
  },
  {
    id: "2",
    title: "Transfer request approved by owner",
    meta: "Plot LR-1908 · Lahore",
    timestamp: "32m ago",
    icon: ArrowLeftRight,
    tone: "info",
  },
  {
    id: "3",
    title: "Land approved & recorded on-chain",
    meta: "Plot LR-2028 · Islamabad · Tx 0x8f3c…d21a",
    timestamp: "1h ago",
    icon: CheckCircle2,
    tone: "success",
  },
  {
    id: "4",
    title: "New buyer registered",
    meta: "ahmed.raza@example.com",
    timestamp: "2h ago",
    icon: UserPlus,
    tone: "neutral",
  },
  {
    id: "5",
    title: "Sale listing verified",
    meta: "Plot LR-2014 · Rawalpindi · ₨ 12,500,000",
    timestamp: "3h ago",
    icon: Landmark,
    tone: "success",
  },
  {
    id: "6",
    title: "Transfer awaiting admin action",
    meta: "Plot LR-1845 · Multan",
    timestamp: "5h ago",
    icon: Clock,
    tone: "warning",
  },
];

/* --------------------------------- page ---------------------------------- */

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <PageHeader />
      <AdminStats />
      <ContentRow />
    </div>
  );
}

/* ------------------------------- sections -------------------------------- */

function PageHeader() {
  return (
    <header className="flex flex-col gap-2">
      <span className="eyebrow">Admin</span>
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
        Welcome back
      </h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Review pending verifications, action transfer requests, and keep the
        ledger moving. Everything that needs your attention surfaces below.
      </p>
    </header>
  );
}

function ContentRow() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Activity column (2/3) ------------------------------------------- */}
      <section
        aria-labelledby="recent-activity-title"
        className="lg:col-span-2"
      >
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex flex-col">
              <span className="eyebrow">Activity</span>
              <h2
                id="recent-activity-title"
                className="text-lg font-semibold tracking-tight text-brand-900"
              >
                Recent activity
              </h2>
            </div>
            <span
              className="hidden items-center gap-1.5 rounded-full border border-brand-200 bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-900 sm:inline-flex"
              aria-hidden
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Live
            </span>
          </div>
          <div className="p-3 sm:p-4">
            <ActivityFeed items={recentActivity} />
          </div>
        </div>
      </section>

      {/* Quick actions column (1/3) -------------------------------------- */}
      <section aria-labelledby="quick-actions-title">
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <span className="eyebrow">Shortcuts</span>
            <h2
              id="quick-actions-title"
              className="text-lg font-semibold tracking-tight text-brand-900"
            >
              Quick actions
            </h2>
          </div>
          <div className="p-3 sm:p-4">
            <QuickActionGroup className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
              <QuickAction
                label="Review Lands"
                description="Verify and approve pending submissions"
                href={ROUTES.ADMIN_LANDS}
                icon={FileCheck}
              />
              <QuickAction
                label="Review Transfers"
                description="Action pending ownership transfers"
                href={ROUTES.ADMIN_TRANSFERS}
                icon={ArrowLeftRight}
              />
              <QuickAction
                label="Manage Users"
                description="Audit accounts and adjust roles"
                href={ROUTES.ADMIN_USERS}
                icon={Users}
              />
            </QuickActionGroup>
          </div>
        </div>
      </section>
    </div>
  );
}
