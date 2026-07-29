"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  ExternalLink,
  FileX,
  Home,
  Inbox,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  StatCard,
  StatCardError,
  StatCardSkeleton,
  type StatCardProps,
} from "@/components/dashboard";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import {
  useBuyerHistory,
  useBuyerTransferRequests,
  useMarketplaceLands,
} from "@/features/buyer/buyer-hooks";
import type { BuyerTransferRequest } from "@/features/buyer/buyer-types";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";
import type { OwnershipHistoryEntry, TransferRequestStatus } from "@/types/owner";

/**
 * Buyer Dashboard — overview surface for the buyer role.
 *
 * Every figure and list is derived from live queries; there is no
 * `/api/buyer/stats` endpoint, so the KPIs are computed CLIENT-SIDE from the
 * three queries the buyer surface owns:
 *   • useMarketplaceLands()      → Available Lands + marketplace summary
 *   • useBuyerTransferRequests() → Active Requests / Completed Transfers /
 *                                  Owned Properties + recent requests
 *   • useBuyerHistory()          → recent on-chain transfer activity
 *
 * Each card owns its own loading / error / empty state keyed on its source
 * query, so a slow or failed section never blocks the rest of the board.
 * Layout grammar matches the admin/owner dashboards. Wrapped by
 * `app/buyer/layout.tsx` (ProtectedRoute roles=[BUYER] + DashboardShell).
 */

const ACTIVE_STATUSES: readonly TransferRequestStatus[] = [
  "buyer_requested",
  "owner_approved",
  "admin_approved",
];

const RECENT_LIMIT = 5;

/* -------------------------------- page ----------------------------------- */

export default function BuyerDashboardPage() {
  const marketplace = useMarketplaceLands();
  const requestsQuery = useBuyerTransferRequests();
  const historyQuery = useBuyerHistory();

  const requests = React.useMemo(
    () => requestsQuery.data?.requests ?? [],
    [requestsQuery.data],
  );

  const stats = React.useMemo(() => {
    const completed = requests.filter((r) => r.status === "completed");
    return {
      availableLands: marketplace.data?.count ?? 0,
      activeRequests: requests.filter((r) => ACTIVE_STATUSES.includes(r.status))
        .length,
      completedTransfers: completed.length,
      ownedProperties: new Set(completed.map((r) => r.land._id)).size,
    };
  }, [marketplace.data, requests]);

  const isAnyFetching =
    marketplace.isFetching || requestsQuery.isFetching || historyQuery.isFetching;

  function refreshAll() {
    void marketplace.refetch();
    void requestsQuery.refetch();
    void historyQuery.refetch();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <PageHeader isFetching={isAnyFetching} onRefresh={refreshAll} />

      <StatsRow
        stats={stats}
        marketplace={marketplace}
        requestsQuery={requestsQuery}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentRequestsCard requestsQuery={requestsQuery} requests={requests} />
        <MarketplaceSummaryCard marketplace={marketplace} />
      </div>

      <RecentActivityCard historyQuery={historyQuery} />
    </div>
  );
}

/* ------------------------------- header ---------------------------------- */

function PageHeader({
  isFetching,
  onRefresh,
}: {
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Buyer</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          Find your next plot
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track your open requests, watch transfers move through verification,
          and jump back into the marketplace.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isFetching}
        className="gap-1.5 self-start sm:self-auto"
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
          aria-hidden
        />
        Refresh
      </Button>
    </header>
  );
}

/* ------------------------------- stats row ------------------------------- */

interface StatsRowProps {
  stats: {
    availableLands: number;
    activeRequests: number;
    completedTransfers: number;
    ownedProperties: number;
  };
  marketplace: ReturnType<typeof useMarketplaceLands>;
  requestsQuery: ReturnType<typeof useBuyerTransferRequests>;
}

function StatsRow({ stats, marketplace, requestsQuery }: StatsRowProps) {
  const marketState: TileState = {
    isPending: marketplace.isPending,
    isError: marketplace.isError,
    onRetry: () => void marketplace.refetch(),
  };
  const reqState: TileState = {
    isPending: requestsQuery.isPending,
    isError: requestsQuery.isError,
    onRetry: () => void requestsQuery.refetch(),
  };

  return (
    <section
      aria-label="Buyer metrics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatTile
        state={marketState}
        label="Available Lands"
        value={stats.availableLands}
        icon={Store}
        tone="neutral"
        hint="Listed across the marketplace"
      />
      <StatTile
        state={reqState}
        label="Active Requests"
        value={stats.activeRequests}
        icon={Send}
        tone="warning"
        hint="Awaiting owner or registrar"
      />
      <StatTile
        state={reqState}
        label="Completed Transfers"
        value={stats.completedTransfers}
        icon={ShieldCheck}
        tone="positive"
        hint="Recorded on-chain"
      />
      <StatTile
        state={reqState}
        label="Owned Properties"
        value={stats.ownedProperties}
        icon={Home}
        tone="neutral"
        hint="Acquired and verified"
      />
    </section>
  );
}

interface TileState {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}

function StatTile({ state, ...props }: { state: TileState } & StatCardProps) {
  if (state.isPending) return <StatCardSkeleton />;
  if (state.isError) {
    return <StatCardError label={props.label} onRetry={state.onRetry} />;
  }
  return <StatCard {...props} />;
}

/* ---------------------------- panel primitive ---------------------------- */

function Panel({
  eyebrow,
  title,
  action,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* --------------------------- recent requests ----------------------------- */

function RecentRequestsCard({
  requestsQuery,
  requests,
}: {
  requestsQuery: ReturnType<typeof useBuyerTransferRequests>;
  requests: readonly BuyerTransferRequest[];
}) {
  const recent = React.useMemo(
    () =>
      [...requests]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, RECENT_LIMIT),
    [requests],
  );

  return (
    <Panel
      eyebrow="Activity"
      title="Recent requests"
      className="lg:col-span-2"
      action={
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={ROUTES.BUYER_REQUESTS}>
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      }
    >
      {requestsQuery.isPending ? (
        <ListSkeleton />
      ) : requestsQuery.isError ? (
        <InlineError
          message={getDisplayMessage(requestsQuery.error)}
          onRetry={() => void requestsQuery.refetch()}
        />
      ) : recent.length === 0 ? (
        <InlineEmpty
          icon={<Inbox className="h-5 w-5 text-brand-700" />}
          title="No requests yet"
          description="Request a land from the marketplace to get started."
        />
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((r) => (
            <li
              key={r._id}
              className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-hover hover:bg-brand-100/40"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-chain text-sm font-medium text-foreground">
                  {r.land.plotNumber}
                </span>
                <span
                  className="truncate text-xs text-muted-foreground"
                  title={r.land.location}
                >
                  {r.land.location}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <RequestStatusBadge
                  status={r.status}
                  reason={r.rejectionReason}
                />
                <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
                  {formatDate(r.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------- marketplace summary -------------------------- */

function MarketplaceSummaryCard({
  marketplace,
}: {
  marketplace: ReturnType<typeof useMarketplaceLands>;
}) {
  const lands = marketplace.data?.lands ?? [];
  const featured = lands.slice(0, 3);

  return (
    <Panel eyebrow="Marketplace" title="Available now">
      {marketplace.isPending ? (
        <ListSkeleton rows={3} />
      ) : marketplace.isError ? (
        <InlineError
          message={getDisplayMessage(marketplace.error)}
          onRetry={() => void marketplace.refetch()}
        />
      ) : (
        <div className="flex h-full flex-col">
          <div className="px-5 pt-5">
            <div className="font-serif text-3xl font-semibold tracking-tight text-brand-900">
              {marketplace.data?.count ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {lands.length === 1 ? "land listed" : "lands listed"} for sale
            </p>
          </div>

          {featured.length > 0 ? (
            <ul className="mt-3 divide-y divide-border border-t border-border">
              {featured.map((land) => (
                <li key={land._id} className="px-5 py-3">
                  <Link
                    href={ROUTES.MARKETPLACE_LAND(land._id)}
                    className="group flex items-center justify-between gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="font-chain text-sm text-foreground">
                        {land.plotNumber}
                      </span>
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        {land.location.split(",")[0]}
                      </span>
                    </div>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-hover group-hover:translate-x-0.5 group-hover:text-brand-700"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-6">
              <p className="text-sm text-muted-foreground">
                No listings are available right now.
              </p>
            </div>
          )}

          <div className="mt-auto border-t border-border p-4">
            <Button asChild size="sm" className="w-full gap-1.5">
              <Link href={ROUTES.MARKETPLACE}>
                <Store className="h-3.5 w-3.5" aria-hidden />
                Browse marketplace
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------- recent transfer activity ---------------------- */

function RecentActivityCard({
  historyQuery,
}: {
  historyQuery: ReturnType<typeof useBuyerHistory>;
}) {
  const history = historyQuery.data?.history ?? [];
  const recent = history.slice(0, 6); // server sorts newest-first

  return (
    <Panel
      eyebrow="Provenance"
      title="Recent transfer activity"
      action={
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={ROUTES.BUYER_HISTORY}>
            View ledger
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      }
    >
      {historyQuery.isPending ? (
        <ListSkeleton />
      ) : historyQuery.isError ? (
        <InlineError
          message={getDisplayMessage(historyQuery.error)}
          onRetry={() => void historyQuery.refetch()}
        />
      ) : recent.length === 0 ? (
        <InlineEmpty
          icon={<ArrowLeftRight className="h-5 w-5 text-brand-700" />}
          title="No transfers yet"
          description="Completed on-chain transfers you're part of will appear here."
        />
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((entry) => (
            <ActivityRow key={entry._id} entry={entry} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ActivityRow({ entry }: { entry: OwnershipHistoryEntry }) {
  return (
    <li className="flex items-start gap-3 px-5 py-3.5 transition-colors duration-hover hover:bg-brand-100/40">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-700"
        aria-hidden
      >
        <ArrowLeftRight className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          Plot {entry.land.plotNumber} transferred
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {entry.previousOwner.name} → {entry.newOwner.name}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <time className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(entry.transferDate)}
        </time>
        <span
          className="inline-flex items-center gap-1 font-chain text-[11px] text-muted-foreground"
          title={entry.transactionHash}
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          {shortAddress(entry.transactionHash)}
        </span>
      </div>
    </li>
  );
}

/* ------------------------------- sub-cells ------------------------------- */

const STATUS_VARIANT: Record<TransferRequestStatus, BadgeProps["variant"]> = {
  buyer_requested: "pending",
  owner_approved: "info",
  admin_approved: "info",
  rejected: "destructive",
  completed: "success",
};

const STATUS_LABEL: Record<TransferRequestStatus, string> = {
  buyer_requested: "Pending",
  owner_approved: "Owner approved",
  admin_approved: "Processing",
  rejected: "Rejected",
  completed: "Completed",
};

function RequestStatusBadge({
  status,
  reason,
}: {
  status: TransferRequestStatus;
  reason: string | null;
}) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      title={status === "rejected" && reason ? reason : undefined}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/* -------------------------- shared state views --------------------------- */

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          <span className="skeleton h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <span className="skeleton h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function InlineEmpty({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100"
        aria-hidden
      >
        {icon}
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10"
        aria-hidden
      >
        <FileX className="h-5 w-5 text-destructive" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">
        Couldn’t load this section
      </h3>
      <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry} className="mt-1">
        Try again
      </Button>
    </div>
  );
}

/* -------------------------------- helpers -------------------------------- */

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FORMAT.format(d);
}
