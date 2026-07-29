"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  FileCheck,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  StatCard,
  StatCardError,
  StatCardSkeleton,
  type StatTone,
} from "@/components/dashboard";
import { useAdminDashboard } from "@/features/admin/hooks/use-admin-dashboard";
import { getDisplayMessage } from "@/lib/api/error";
import type { AdminDashboardStats } from "@/types/admin";

/**
 * AdminStats — the four KPI tiles at the top of the admin dashboard.
 *
 * The visual contract (label, icon, tone, hint) is declared once below
 * and mapped over to render. When the query is loading or errors out,
 * the same four-slot grid is preserved so the dashboard doesn't reflow
 * underneath the user.
 */

interface StatField {
  key: keyof AdminDashboardStats;
  label: string;
  icon: LucideIcon;
  tone: StatTone;
  hint: string;
}

const FIELDS: readonly StatField[] = [
  {
    key: "totalUsers",
    label: "Total Users",
    icon: Users,
    tone: "neutral",
    hint: "Across all roles",
  },
  {
    key: "pendingLands",
    label: "Pending Lands",
    icon: FileCheck,
    tone: "warning",
    hint: "Awaiting verification",
  },
  {
    key: "pendingTransfers",
    label: "Pending Transfers",
    icon: ArrowLeftRight,
    tone: "warning",
    hint: "Awaiting admin action",
  },
  {
    key: "approvedLands",
    label: "Approved Lands",
    icon: ShieldCheck,
    tone: "positive",
    hint: "Recorded on-chain",
  },
];

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

export function AdminStats() {
  const query = useAdminDashboard();

  // Loading — show four skeleton tiles in the same grid slots.
  if (query.isPending) {
    return (
      <Grid>
        {FIELDS.map((f) => (
          <StatCardSkeleton key={f.key} />
        ))}
      </Grid>
    );
  }

  // Error — show four error tiles wired to the same refetch handler.
  // (Tiling the error keeps the grid intact instead of leaving a hole.)
  if (query.isError) {
    const message = getDisplayMessage(query.error);
    return (
      <Grid>
        {FIELDS.map((f) => (
          <StatCardError
            key={f.key}
            label={f.label}
            message={message}
            onRetry={() => void query.refetch()}
          />
        ))}
      </Grid>
    );
  }

  // Success — map the response keys onto the visual config.
  const data = query.data;
  return (
    <Grid>
      {FIELDS.map((f) => (
        <StatCard
          key={f.key}
          label={f.label}
          value={NUMBER_FORMAT.format(data[f.key])}
          icon={f.icon}
          tone={f.tone}
          hint={f.hint}
        />
      ))}
    </Grid>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Key metrics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {children}
    </section>
  );
}
