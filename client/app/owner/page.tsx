"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  ExternalLink,
  FileX,
  Inbox,
  Map as MapIcon,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Tag,
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
import { useOwnerHistory } from "@/features/owner/hooks/use-owner-history";
import { useOwnerLands } from "@/features/owner/hooks/use-owner-lands";
import { useOwnerListings } from "@/features/owner/hooks/use-owner-listings";
import { useOwnerTransferRequests } from "@/features/owner/hooks/use-owner-requests";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";
import type {
  OwnerLand,
  OwnerListing,
  OwnershipHistoryEntry,
  SaleListingState,
} from "@/types/owner";

/**
 * Owner Dashboard — overview surface for the landowner role.
 *
 * Every figure and list is derived from live queries (no dummy data). KPIs
 * are computed CLIENT-SIDE from the owner queries this surface owns:
 *   • useOwnerLands()            → My Lands + ownership summary
 *   • useOwnerListings()         → Active Listings + recent listings
 *   • useOwnerTransferRequests() → Pending Transfer Requests / Completed
 *   • useOwnerHistory()          → recent on-chain transfer activity
 *
 * Each card owns its own loading / error / empty state keyed on its source
 * query, so one slow/failed section never blocks the board. Layout grammar
 * matches the admin/buyer dashboards. Wrapped by `app/owner/layout.tsx`
 * (ProtectedRoute roles=[OWNER, BUYER] + DashboardShell) — the owner
 * surface is open to buyer-role landowners too, matching the backend's
 * `authorizeRoles("owner","buyer")` gate.
 */

const RECENT_LIMIT = 5;

/* -------------------------------- page ----------------------------------- */

export default function OwnerDashboardPage() {
  const landsQuery = useOwnerLands();
  const listingsQuery = useOwnerListings();
  const requestsQuery = useOwnerTransferRequests();
  const historyQuery = useOwnerHistory();

  const lands = React.useMemo(
    () => landsQuery.data?.lands ?? [],
    [landsQuery.data],
  );
  const listings = React.useMemo(
    () => listingsQuery.data?.listings ?? [],
    [listingsQuery.data],
  );
  const requests = React.useMemo(
    () => requestsQuery.data?.requests ?? [],
    [requestsQuery.data],
  );

  const stats = React.useMemo(
    () => ({
      myLands: lands.length,
      activeListings: listings.filter((l) => l.state === "listed_for_sale")
        .length,
      pendingRequests: requests.filter((r) => r.status === "buyer_requested")
        .length,
      completedTransfers: requests.filter((r) => r.status === "completed")
        .length,
    }),
    [lands, listings, requests],
  );

  const isAnyFetching =
    landsQuery.isFetching ||
    listingsQuery.isFetching ||
    requestsQuery.isFetching ||
    historyQuery.isFetching;

  function refreshAll() {
    void landsQuery.refetch();
    void listingsQuery.refetch();
    void requestsQuery.refetch();
    void historyQuery.refetch();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <PageHeader isFetching={isAnyFetching} onRefresh={refreshAll} />

      <StatsRow
        stats={stats}
        landsQuery={landsQuery}
        listingsQuery={listingsQuery}
        requestsQuery={requestsQuery}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentListingsCard listingsQuery={listingsQuery} listings={listings} />
        <OwnershipSummaryCard landsQuery={landsQuery} lands={lands} />
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
        <span className="eyebrow">Owner</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          Your portfolio at a glance
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track your portfolio, keep an eye on incoming transfer requests, and
          manage what you have listed for sale.
        </p>
      </div>
      <div className="flex items-center gap-3 self-start sm:self-auto">
        <Button asChild size="sm" className="gap-1.5">
          <Link href={ROUTES.OWNER_LAND_NEW}>
            <PlusCircle className="h-3.5 w-3.5" aria-hidden />
            Submit land
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
            aria-hidden
          />
          Refresh
        </Button>
      </div>
    </header>
  );
}

/* ------------------------------- stats row ------------------------------- */

interface StatsRowProps {
  stats: {
    myLands: number;
    activeListings: number;
    pendingRequests: number;
    completedTransfers: number;
  };
  landsQuery: ReturnType<typeof useOwnerLands>;
  listingsQuery: ReturnType<typeof useOwnerListings>;
  requestsQuery: ReturnType<typeof useOwnerTransferRequests>;
}

function StatsRow({
  stats,
  landsQuery,
  listingsQuery,
  requestsQuery,
}: StatsRowProps) {
  return (
    <section
      aria-label="Portfolio metrics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatTile
        state={tileState(landsQuery)}
        label="My Lands"
        value={stats.myLands}
        icon={MapIcon}
        tone="neutral"
        hint="Across all statuses"
      />
      <StatTile
        state={tileState(listingsQuery)}
        label="Active Listings"
        value={stats.activeListings}
        icon={Tag}
        tone="neutral"
        hint="Visible on the marketplace"
      />
      <StatTile
        state={tileState(requestsQuery)}
        label="Pending Transfer Requests"
        value={stats.pendingRequests}
        icon={Inbox}
        tone="warning"
        hint="Awaiting your response"
      />
      <StatTile
        state={tileState(requestsQuery)}
        label="Completed Transfers"
        value={stats.completedTransfers}
        icon={ShieldCheck}
        tone="positive"
        hint="Recorded on-chain"
      />
    </section>
  );
}

interface TileState {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}

function tileState(query: {
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}): TileState {
  return {
    isPending: query.isPending,
    isError: query.isError,
    onRetry: () => void query.refetch(),
  };
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

/* --------------------------- recent listings ----------------------------- */

function RecentListingsCard({
  listingsQuery,
  listings,
}: {
  listingsQuery: ReturnType<typeof useOwnerListings>;
  listings: readonly OwnerListing[];
}) {
  const recent = React.useMemo(
    () =>
      [...listings]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, RECENT_LIMIT),
    [listings],
  );

  return (
    <Panel
      eyebrow="Marketplace"
      title="Recent listings"
      className="lg:col-span-2"
      action={
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={ROUTES.OWNER_LISTINGS}>
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      }
    >
      {listingsQuery.isPending ? (
        <ListSkeleton />
      ) : listingsQuery.isError ? (
        <InlineError
          message={getDisplayMessage(listingsQuery.error)}
          onRetry={() => void listingsQuery.refetch()}
        />
      ) : recent.length === 0 ? (
        <InlineEmpty
          icon={<Tag className="h-5 w-5 text-brand-700" />}
          title="No listings yet"
          description="List an approved land for sale to see it here."
        />
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((listing) => (
            <li
              key={listing._id}
              className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-hover hover:bg-brand-100/40"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-chain text-sm font-medium text-foreground">
                  {listing.land.plotNumber}
                </span>
                <span
                  className="truncate text-xs text-muted-foreground"
                  title={listing.land.location}
                >
                  {listing.land.location}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <ListingStateBadge state={listing.state} />
                <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
                  {formatDate(listing.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------- ownership summary ---------------------------- */

function OwnershipSummaryCard({
  landsQuery,
  lands,
}: {
  landsQuery: ReturnType<typeof useOwnerLands>;
  lands: readonly OwnerLand[];
}) {
  const breakdown = React.useMemo(() => {
    const base = { approved: 0, pending: 0, rejected: 0 };
    for (const l of lands) base[l.status] += 1;
    return base;
  }, [lands]);

  return (
    <Panel eyebrow="Portfolio" title="Land ownership">
      {landsQuery.isPending ? (
        <ListSkeleton rows={3} />
      ) : landsQuery.isError ? (
        <InlineError
          message={getDisplayMessage(landsQuery.error)}
          onRetry={() => void landsQuery.refetch()}
        />
      ) : (
        <div className="flex h-full flex-col">
          <div className="px-5 pt-5">
            <div className="font-serif text-3xl font-semibold tracking-tight text-brand-900">
              {lands.length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {lands.length === 1 ? "registered plot" : "registered plots"}
            </p>
          </div>

          <dl className="mt-3 divide-y divide-border border-t border-border">
            <SummaryRow
              label="On-chain (approved)"
              value={breakdown.approved}
              variant="success"
            />
            <SummaryRow
              label="Pending verification"
              value={breakdown.pending}
              variant="pending"
            />
            <SummaryRow
              label="Rejected"
              value={breakdown.rejected}
              variant="destructive"
            />
          </dl>

          <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
            <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
              <Link href={ROUTES.OWNER_LANDS}>
                <MapIcon className="h-3.5 w-3.5" aria-hidden />
                View my lands
              </Link>
            </Button>
            <Button asChild size="sm" className="w-full gap-1.5">
              <Link href={ROUTES.OWNER_LAND_NEW}>
                <PlusCircle className="h-3.5 w-3.5" aria-hidden />
                Submit a new land
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function SummaryRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: BadgeProps["variant"];
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>
        <Badge variant={variant}>{value}</Badge>
      </dd>
    </div>
  );
}

/* ------------------------- recent transfer activity ---------------------- */

function RecentActivityCard({
  historyQuery,
}: {
  historyQuery: ReturnType<typeof useOwnerHistory>;
}) {
  const history = historyQuery.data?.history ?? [];
  const recent = history.slice(0, 6); // server sorts newest-first

  return (
    <Panel
      eyebrow="Provenance"
      title="Recent transfer activity"
      action={
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={ROUTES.OWNER_HISTORY}>
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
          description="Completed on-chain transfers on your lands will appear here."
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

const LISTING_STATE_VARIANT: Record<SaleListingState, BadgeProps["variant"]> = {
  pending_sale_approval: "pending",
  listed_for_sale: "success",
  sold: "info",
  not_for_sale: "neutral",
};

const LISTING_STATE_LABEL: Record<SaleListingState, string> = {
  pending_sale_approval: "Pending approval",
  listed_for_sale: "Listed",
  sold: "Sold",
  not_for_sale: "Not for sale",
};

function ListingStateBadge({ state }: { state: SaleListingState }) {
  return (
    <Badge variant={LISTING_STATE_VARIANT[state]}>
      {LISTING_STATE_LABEL[state]}
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
