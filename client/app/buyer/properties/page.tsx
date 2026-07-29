"use client";

import * as React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ArrowUpDown,
  Building2,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  FileX,
  Home,
  Landmark,
  MapPin,
  PackageSearch,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import {
  useBuyerHistory,
  useBuyerProperties,
} from "@/features/buyer/buyer-hooks";
import type { BuyerProperty } from "@/features/buyer/buyer-types";
import { useDebounce } from "@/hooks/use-debounce";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";

/**
 * Buyer · My Properties — the lands the caller currently owns.
 *
 * Primary source: `useBuyerProperties()` → `ownerLandsService.listMyLands()`
 * (`GET /api/owner/my-lands`). `Land.owner` is the live ownership pointer, so
 * this is the authoritative current-holdings snapshot (per the audit — NOT
 * derived from the history ledger).
 *
 * Acquisition date is ENRICHED from `useBuyerHistory()`: for a land the buyer
 * currently owns, the most recent transfer on that land is necessarily the
 * one that made them the owner, so its `transferDate` is the true acquisition
 * date. Lands never transferred (e.g. self-registered) fall back to the
 * land's `createdAt`. History is non-blocking — a slow/failed history fetch
 * just means the fallback date is used.
 *
 * Read-only portfolio, rendered as a responsive card grid that reuses the
 * marketplace toolbar (search + sort) and card grammar. Government-enterprise
 * styling via the shared brand palette.
 *
 * The route is wrapped by `app/buyer/layout.tsx` (ProtectedRoute
 * roles=[BUYER] + DashboardShell) — no page chrome needed here.
 */

// The registry's single asset class — there is no `propertyType` field on the
// Land model, so every holding is a land parcel. Surfaced as a constant.
const PROPERTY_TYPE = "Land parcel";

/* ------------------------------- animation ------------------------------- */

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.2, 0, 0, 1] },
  },
};

/* -------------------------------- sorting -------------------------------- */

type SortBy = "recent" | "oldest" | "plot" | "location";

const SORT_OPTIONS: ReadonlyArray<{ value: SortBy; label: string }> = [
  { value: "recent", label: "Recently acquired" },
  { value: "oldest", label: "Oldest first" },
  { value: "plot", label: "Plot number (A–Z)" },
  { value: "location", label: "Location (A–Z)" },
];

function sortLabel(value: SortBy): string {
  return SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Sort";
}

/** A property paired with its resolved acquisition date (history-enriched). */
interface PropertyView {
  land: BuyerProperty;
  acquiredAt: string;
}

function applyFilters(
  rows: readonly PropertyView[],
  search: string,
  sortBy: SortBy,
): PropertyView[] {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.land.plotNumber.toLowerCase().includes(q) ||
          r.land.location.toLowerCase().includes(q),
      )
    : [...rows];

  const time = (r: PropertyView) => new Date(r.acquiredAt).getTime();

  switch (sortBy) {
    case "recent":
      return filtered.sort((a, b) => time(b) - time(a));
    case "oldest":
      return filtered.sort((a, b) => time(a) - time(b));
    case "plot":
      return filtered.sort((a, b) =>
        a.land.plotNumber.localeCompare(b.land.plotNumber, undefined, {
          numeric: true,
        }),
      );
    case "location":
      return filtered.sort((a, b) =>
        a.land.location.localeCompare(b.land.location),
      );
    default:
      return filtered;
  }
}

/* -------------------------------- page ----------------------------------- */

export default function BuyerPropertiesPage() {
  const query = useBuyerProperties();
  const historyQuery = useBuyerHistory();

  const lands = query.data?.lands ?? [];

  // landId → latest transfer date. The latest transfer of a land you still
  // own is the one that made you the owner → your acquisition date.
  const acquiredByLand = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const h of historyQuery.data?.history ?? []) {
      const current = map.get(h.land._id);
      if (!current || new Date(h.transferDate) > new Date(current)) {
        map.set(h.land._id, h.transferDate);
      }
    }
    return map;
  }, [historyQuery.data]);

  const rows = React.useMemo<PropertyView[]>(
    () =>
      lands.map((land) => ({
        land,
        acquiredAt: acquiredByLand.get(land._id) ?? land.createdAt,
      })),
    [lands, acquiredByLand],
  );

  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortBy>("recent");
  const debouncedSearch = useDebounce(search, 250);

  const visible = React.useMemo(
    () => applyFilters(rows, debouncedSearch, sortBy),
    [rows, debouncedSearch, sortBy],
  );

  const hasData = query.isSuccess && lands.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        count={hasData ? visible.length : 0}
        total={lands.length}
        showCount={hasData}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      {hasData ? (
        <Toolbar
          search={search}
          onSearch={setSearch}
          sortBy={sortBy}
          onSort={setSortBy}
        />
      ) : null}

      {query.isPending ? (
        <CardGridSkeleton />
      ) : query.isError ? (
        <ErrorState
          message={getDisplayMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : lands.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <NoResultsState onClear={() => setSearch("")} />
      ) : (
        <PropertyGrid rows={visible} />
      )}
    </div>
  );
}

/* ------------------------------ page header ------------------------------ */

interface PageHeaderProps {
  count: number;
  total: number;
  showCount: boolean;
  isFetching: boolean;
  onRefresh: () => void;
}

function PageHeader({
  count,
  total,
  showCount,
  isFetching,
  onRefresh,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Portfolio</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          My properties
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every plot you currently own. Each card carries its acquisition date
          and on-chain registration receipt.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {showCount ? (
          <span className="text-xs text-muted-foreground">
            Showing {count} of {total}
          </span>
        ) : null}
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

/* -------------------------------- toolbar -------------------------------- */

interface ToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  sortBy: SortBy;
  onSort: (value: SortBy) => void;
}

function Toolbar({ search, onSearch, sortBy, onSort }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by plot number or location…"
          aria-label="Search properties"
          className="pl-9 pr-9"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 sm:w-auto">
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
            <span className="text-muted-foreground">Sort:</span>
            {sortLabel(sortBy)}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuLabel>Sort properties</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={(v) => onSort(v as SortBy)}
          >
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* --------------------------------- grid ---------------------------------- */

function PropertyGrid({ rows }: { rows: readonly PropertyView[] }) {
  return (
    <motion.section
      aria-label="Owned properties"
      key={rows.length}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {rows.map((row) => (
        <PropertyCard key={row.land._id} row={row} />
      ))}
    </motion.section>
  );
}

function PropertyCard({ row }: { row: PropertyView }) {
  const { land, acquiredAt } = row;
  return (
    <motion.article
      variants={cardVariants}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-ui hover:shadow-md"
    >
      {/* Crest band — branded plate carrying the plot number + ownership. */}
      <div className="relative flex h-24 items-end overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-4">
        <Landmark
          className="absolute -right-3 -top-3 h-20 w-20 text-white/10"
          aria-hidden
        />
        <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 font-chain text-xs font-medium text-brand-900 shadow-sm backdrop-blur">
          {land.plotNumber}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-brand-900 shadow-sm backdrop-blur">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden />
          Owned
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3
          className="truncate text-lg font-semibold text-brand-900"
          title={land.location}
        >
          {land.location}
        </h3>

        <dl className="mt-4 flex flex-col gap-2.5 text-sm">
          <Row icon={<Building2 className="h-4 w-4" />} label="Type">
            {PROPERTY_TYPE}
          </Row>
          <Row icon={<MapPin className="h-4 w-4" />} label="Location">
            <span className="truncate" title={land.location}>
              {land.location.split(",")[0]}
            </span>
          </Row>
          <Row icon={<Ruler className="h-4 w-4" />} label="Area">
            {land.area}
          </Row>
          <Row icon={<CalendarClock className="h-4 w-4" />} label="Acquired">
            {formatDate(acquiredAt)}
          </Row>
        </dl>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
          <RegistrationBadge
            status={land.status}
            reason={land.rejectionReason}
          />
          <TxValue hash={land.transactionHash} />
        </div>
      </div>
    </motion.article>
  );
}

/* ------------------------------- sub-cells ------------------------------- */

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="shrink-0 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 truncate text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Blockchain registration status — derived from the Land lifecycle status.
 * "approved" means the registerLand() tx is on-chain (receipt in
 * `transactionHash`); "pending" is awaiting the registrar; "rejected" is a
 * declined registration (reason surfaced via tooltip).
 */
const REG_VARIANT: Record<BuyerProperty["status"], BadgeProps["variant"]> = {
  pending: "pending",
  approved: "success",
  rejected: "destructive",
};

const REG_LABEL: Record<BuyerProperty["status"], string> = {
  pending: "Pending registration",
  approved: "Registered on-chain",
  rejected: "Registration rejected",
};

function RegistrationBadge({
  status,
  reason,
}: {
  status: BuyerProperty["status"];
  reason: string | null;
}) {
  return (
    <Badge
      variant={REG_VARIANT[status]}
      title={status === "rejected" && reason ? reason : undefined}
    >
      {REG_LABEL[status]}
    </Badge>
  );
}

function TxValue({ hash }: { hash: string | null }) {
  if (!hash) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  // No external explorer for Ganache; render the short hash with a hover
  // title revealing the full value for manual copy.
  return (
    <span
      className="inline-flex items-center gap-1.5 font-chain text-xs text-foreground"
      title={hash}
    >
      <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden />
      {shortAddress(hash)}
    </span>
  );
}

/* -------------------------- state sub-components ------------------------- */

function CardGridSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading properties"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <div className="skeleton h-24 w-full rounded-none" />
          <div className="flex flex-col gap-3 p-5">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-3 w-2/5" />
            <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
              <div className="skeleton h-5 w-28 rounded-full" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatePanel({
  icon,
  tone = "brand",
  title,
  children,
}: {
  icon: React.ReactNode;
  tone?: "brand" | "destructive";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "destructive" ? "alert" : "status"}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card py-16 text-center shadow-sm"
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          tone === "destructive"
            ? "bg-destructive/10 text-destructive"
            : "bg-brand-100 text-brand-700",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <div className="mx-auto max-w-sm text-sm text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <StatePanel icon={<Home className="h-5 w-5" />} title="No properties yet">
      <p>
        Lands you acquire through completed transfers will appear here. Start by
        finding a plot in the marketplace.
      </p>
      <Button asChild size="sm" className="mt-4 gap-1.5">
        <Link href={ROUTES.MARKETPLACE}>
          <Store className="h-3.5 w-3.5" aria-hidden />
          Browse marketplace
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </Button>
    </StatePanel>
  );
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <StatePanel
      icon={<PackageSearch className="h-5 w-5" />}
      title="No matching properties"
    >
      <p>No properties match your search. Try a different term.</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        className="mt-4 gap-1.5"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Clear search
      </Button>
    </StatePanel>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <StatePanel
      icon={<FileX className="h-5 w-5" />}
      tone="destructive"
      title="Couldn’t load your properties"
    >
      <p>{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
        Try again
      </Button>
    </StatePanel>
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
