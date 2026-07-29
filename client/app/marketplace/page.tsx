"use client";

import * as React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ArrowUpDown,
  CalendarClock,
  ChevronDown,
  FileX,
  Landmark,
  Lock,
  MapPin,
  PackageSearch,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useMarketplaceLands } from "@/features/buyer/buyer-hooks";
import {
  DEFAULT_MARKETPLACE_FILTERS,
  type MarketplaceLand,
  type MarketplaceSortBy,
} from "@/features/buyer/buyer-types";
import { useDebounce } from "@/hooks/use-debounce";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";

/**
 * Marketplace · Listing — the public land catalogue (canonical route
 * `/marketplace`). Lists every approved land with an active
 * `listed_for_sale` listing, driven by `useMarketplaceLands`.
 *
 * This route is NOT wrapped by a dashboard shell, so the page brings its
 * own page-level chrome (container, header, toolbar). It is read-only:
 * the per-property detail page and the transfer-request flow are built
 * separately — cards link to the detail route but take no mutating action.
 *
 * State matrix (mirrors the owner/admin surfaces):
 *   • waiting-for-buyer  — the query is gated to the buyer role; a
 *                          non-buyer / signed-out visitor gets a clear
 *                          notice instead of an infinite skeleton.
 *   • loading            — skeleton card grid
 *   • error              — ret[ry]able error panel
 *   • empty              — no live listings at all
 *   • no-results         — listings exist but none match the filters
 *   • data               — responsive, animated card grid
 *
 * Search + sort are CLIENT-SIDE (the endpoint returns the full catalogue);
 * search is debounced to keep typing smooth.
 */

/* ------------------------------ animation -------------------------------- */

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

const SORT_OPTIONS: ReadonlyArray<{ value: MarketplaceSortBy; label: string }> = [
  { value: "recent", label: "Recently listed" },
  { value: "oldest", label: "Oldest first" },
  { value: "plot", label: "Plot number (A–Z)" },
  { value: "location", label: "Location (A–Z)" },
];

function sortLabel(value: MarketplaceSortBy): string {
  return SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Sort";
}

function applyFilters(
  lands: readonly MarketplaceLand[],
  search: string,
  sortBy: MarketplaceSortBy,
): MarketplaceLand[] {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? lands.filter(
        (l) =>
          l.plotNumber.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q),
      )
    : [...lands];

  // `listedAt` is the listing's updatedAt; falls back to land createdAt.
  const listedTime = (l: MarketplaceLand) =>
    new Date(l.listing.listedAt ?? l.createdAt).getTime();

  switch (sortBy) {
    case "recent":
      return filtered.sort((a, b) => listedTime(b) - listedTime(a));
    case "oldest":
      return filtered.sort((a, b) => listedTime(a) - listedTime(b));
    case "plot":
      return filtered.sort((a, b) =>
        a.plotNumber.localeCompare(b.plotNumber, undefined, { numeric: true }),
      );
    case "location":
      return filtered.sort((a, b) => a.location.localeCompare(b.location));
    default:
      return filtered;
  }
}

/* --------------------------------- page ---------------------------------- */

export default function MarketplacePage() {
  const query = useMarketplaceLands();
  const lands = query.data?.lands ?? [];

  const [search, setSearch] = React.useState(DEFAULT_MARKETPLACE_FILTERS.search);
  const [sortBy, setSortBy] = React.useState<MarketplaceSortBy>(
    DEFAULT_MARKETPLACE_FILTERS.sortBy,
  );
  const debouncedSearch = useDebounce(search, 250);

  const visible = React.useMemo(
    () => applyFilters(lands, debouncedSearch, sortBy),
    [lands, debouncedSearch, sortBy],
  );

  // The query is role-gated (enabled only for an authenticated buyer). A
  // disabled query stays `pending` with an `idle` fetchStatus forever — we
  // detect that and show a sign-in notice rather than a perpetual skeleton.
  const isWaitingForBuyer =
    query.isPending && query.fetchStatus === "idle";

  const hasData = query.isSuccess && lands.length > 0;
  const isFiltering = debouncedSearch.trim().length > 0;

  function clearFilters() {
    setSearch("");
    setSortBy(DEFAULT_MARKETPLACE_FILTERS.sortBy);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        count={hasData ? visible.length : 0}
        total={lands.length}
        isFetching={query.isFetching}
        showCount={hasData}
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

      {isWaitingForBuyer ? (
        <UnavailableState />
      ) : query.isPending ? (
        <CardGridSkeleton />
      ) : query.isError ? (
        <ErrorState
          message={getDisplayMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : lands.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <NoResultsState onClear={clearFilters} />
      ) : (
        <ListingGrid lands={visible} isFiltering={isFiltering} />
      )}
    </main>
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
        <span className="eyebrow inline-flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5" aria-hidden />
          Marketplace
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          Verified land, listed for sale
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every plot here is registered on-chain and listed by its verified
          owner. Browse the catalogue, then open a listing to review its
          provenance.
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
  sortBy: MarketplaceSortBy;
  onSort: (value: MarketplaceSortBy) => void;
}

function Toolbar({ search, onSearch, sortBy, onSort }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Search ----------------------------------------------------------- */}
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
          aria-label="Search listings"
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

      {/* Sort ------------------------------------------------------------- */}
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
          <DropdownMenuLabel>Sort listings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={(v) => onSort(v as MarketplaceSortBy)}
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

function ListingGrid({
  lands,
  isFiltering,
}: {
  lands: readonly MarketplaceLand[];
  isFiltering: boolean;
}) {
  return (
    <motion.section
      aria-label="Land listings"
      // Re-key on the filter signature so the stagger replays when the
      // visible set changes (search/sort), giving a polished transition.
      key={`${isFiltering}:${lands.length}`}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {lands.map((land) => (
        <ListingCard key={land._id} land={land} />
      ))}
    </motion.section>
  );
}

function ListingCard({ land }: { land: MarketplaceLand }) {
  return (
    <motion.article
      variants={cardVariants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-ui hover:shadow-lg"
    >
      {/* Crest band — no listing imagery in the registry, so we use a
          branded plate carrying the plot number + verification stamp. */}
      <div className="relative flex h-28 items-end overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-4">
        <Landmark
          className="absolute -right-3 -top-3 h-24 w-24 text-white/10"
          aria-hidden
        />
        <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 font-chain text-xs font-medium text-brand-900 shadow-sm backdrop-blur">
          {land.plotNumber}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-brand-900 shadow-sm backdrop-blur">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden />
          Verified
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <dt className="sr-only">Location</dt>
            <dd className="truncate" title={land.location}>
              {land.location.split(",")[0]}
            </dd>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Ruler className="h-4 w-4 shrink-0" aria-hidden />
            <dt className="sr-only">Area</dt>
            <dd>{land.area}</dd>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4 shrink-0" aria-hidden />
            <dt className="sr-only">Owner wallet</dt>
            <dd className="font-chain text-xs" title={land.owner.walletAddress}>
              {land.owner.walletAddress
                ? shortAddress(land.owner.walletAddress)
                : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Listed {formatDate(land.listing.listedAt)}
          </span>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href={ROUTES.MARKETPLACE_LAND(land._id)}>
              View
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

/* --------------------------- state components ---------------------------- */

function CardGridSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading listings"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <div className="skeleton h-28 w-full rounded-none" />
          <div className="flex flex-col gap-3 p-5">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-3 w-1/3" />
            <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-8 w-20 rounded-md" />
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
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card py-16 text-center shadow-sm",
      )}
      role={tone === "destructive" ? "alert" : "status"}
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

function UnavailableState() {
  return (
    <StatePanel icon={<Lock className="h-5 w-5" />} title="Buyer access required">
      <p>
        Sign in with a buyer account to browse the marketplace and request
        transfers.
      </p>
      <Button asChild size="sm" className="mt-4 gap-1.5">
        <Link href={ROUTES.LOGIN}>
          Sign in
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </Button>
    </StatePanel>
  );
}

function EmptyState() {
  return (
    <StatePanel
      icon={<Store className="h-5 w-5" />}
      title="No listings available yet"
    >
      <p>
        There are no lands listed for sale right now. Check back soon — new
        verified listings appear here as owners put them on the market.
      </p>
    </StatePanel>
  );
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <StatePanel
      icon={<PackageSearch className="h-5 w-5" />}
      title="No matching listings"
    >
      <p>No listings match your search. Try a different term or clear the filters.</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        className="mt-4 gap-1.5"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Clear filters
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
      title="Couldn’t load the marketplace"
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FORMAT.format(d);
}
