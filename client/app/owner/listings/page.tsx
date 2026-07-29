"use client";

import * as React from "react";
import Link from "next/link";
import {
  Eye,
  FileX,
  Loader2,
  RefreshCw,
  Tag,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROUTES } from "@/config/routes";
import {
  useOwnerListings,
  useRemoveOwnerListingMutation,
} from "@/features/owner/hooks/use-owner-listings";
import { getDisplayMessage } from "@/lib/api/error";
import { cn } from "@/lib/utils";
import type { OwnerListing, SaleListingState } from "@/types/owner";

/**
 * Owner · Sale Listings — every marketplace listing the caller has
 * submitted, across all lifecycle states.
 *
 * Page composition mirrors the other owner / admin moderation surfaces:
 *   • PageHeader        — title + subtitle + Refresh
 *   • ListingsCard      — table with loading / empty / error states;
 *                          chrome stays mounted so the layout never
 *                          reflows underneath the user
 *   • RemoveListingDialog — confirm-before-action for the delist flow
 *
 * The delist mutation is optimistic — the row's state badge flips to
 * "Removed" the instant the user confirms, with rollback on failure.
 *
 * The layout is wrapped by `app/owner/layout.tsx` (ProtectedRoute
 * roles=[OWNER] + DashboardShell) — no chrome needed here.
 */

export default function OwnerListingsPage() {
  const query = useOwnerListings();
  const listings = query.data?.listings ?? [];
  const [pendingRemoval, setPendingRemoval] = React.useState<OwnerListing | null>(
    null,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        count={query.data?.count ?? 0}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      <ListingsCard
        query={query}
        listings={listings}
        onRequestRemove={(listing) => setPendingRemoval(listing)}
      />

      <RemoveListingDialog
        pending={pendingRemoval}
        onClose={() => setPendingRemoval(null)}
      />
    </div>
  );
}

/* ------------------------------ Page header ------------------------------ */

interface PageHeaderProps {
  count: number;
  isFetching: boolean;
  onRefresh: () => void;
}

function PageHeader({ count, isFetching, onRefresh }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Marketplace</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          Sale listings
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every plot you have put up for sale, across pending review,
          live on the marketplace, sold, and delisted. Live listings can
          be removed at any time.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "listing" : "listings"}
        </span>
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

/* ------------------------------ Card + table ----------------------------- */

interface ListingsCardProps {
  query: ReturnType<typeof useOwnerListings>;
  listings: readonly OwnerListing[];
  onRequestRemove: (listing: OwnerListing) => void;
}

function ListingsCard({
  query,
  listings,
  onRequestRemove,
}: ListingsCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col">
          <span className="eyebrow">Listings</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            All sale submissions
          </h2>
        </div>
      </div>

      {query.isPending ? <TableSkeleton /> : null}
      {query.isError ? (
        <ErrorState
          message={getDisplayMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && listings.length === 0 ? <EmptyState /> : null}
      {query.isSuccess && listings.length > 0 ? (
        <ListingsTable
          listings={listings}
          onRequestRemove={onRequestRemove}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------- Table --------------------------------- */

interface ListingsTableProps {
  listings: readonly OwnerListing[];
  onRequestRemove: (listing: OwnerListing) => void;
}

function ListingsTable({ listings, onRequestRemove }: ListingsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
            <Th>Plot</Th>
            <Th>Location</Th>
            <Th>Area</Th>
            <Th>Status</Th>
            <Th>Listed</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {listings.map((listing) => (
            <ListingRow
              key={listing._id}
              listing={listing}
              onRequestRemove={() => onRequestRemove(listing)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingRow({
  listing,
  onRequestRemove,
}: {
  listing: OwnerListing;
  onRequestRemove: () => void;
}) {
  // Only listings actually visible in the marketplace are viewable from
  // the public listing detail surface — pending review, sold, and
  // removed don't have a public page.
  const isViewable = listing.state === "listed_for_sale";
  const isRemovable = isActiveState(listing.state);

  return (
    <tr className="transition-colors duration-hover hover:bg-brand-100/40">
      <Td className="font-chain text-foreground">{listing.land.plotNumber}</Td>
      <Td
        className="max-w-[260px] truncate text-foreground"
        title={listing.land.location}
      >
        {listing.land.location}
      </Td>
      <Td className="text-foreground">{listing.land.area}</Td>
      <Td>
        <StatusBadge state={listing.state} reason={listing.rejectionReason} />
      </Td>
      <Td className="whitespace-nowrap text-muted-foreground">
        {formatDate(listing.createdAt)}
      </Td>
      <Td className="text-right">
        <div className="inline-flex items-center gap-2">
          <Button
            asChild={isViewable}
            size="sm"
            variant="outline"
            disabled={!isViewable}
            title={
              isViewable
                ? undefined
                : "Only live listings have a public marketplace page"
            }
            className="gap-1.5"
          >
            {isViewable ? (
              <Link href={ROUTES.MARKETPLACE_LAND(listing.land._id)}>
                <Eye className="h-3.5 w-3.5" aria-hidden />
                View listing
              </Link>
            ) : (
              <span>
                <Eye className="h-3.5 w-3.5" aria-hidden />
                View listing
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRequestRemove}
            disabled={!isRemovable}
            title={
              isRemovable
                ? undefined
                : "This listing is no longer active"
            }
            className={cn(
              "gap-1.5",
              isRemovable && "text-destructive hover:bg-destructive/10 hover:text-destructive",
            )}
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            Remove
          </Button>
        </div>
      </Td>
    </tr>
  );
}

/* ------------------------------- Sub-cells ------------------------------- */

const STATE_VARIANT: Record<SaleListingState, BadgeProps["variant"]> = {
  pending_sale_approval: "pending",
  listed_for_sale: "success",
  sold: "info",
  not_for_sale: "neutral",
};

const STATE_LABEL: Record<SaleListingState, string> = {
  pending_sale_approval: "Pending",
  listed_for_sale: "Listed",
  sold: "Sold",
  not_for_sale: "Removed",
};

function StatusBadge({
  state,
  reason,
}: {
  state: SaleListingState;
  reason: string | null;
}) {
  // Surface the admin's rejection reason via title-tooltip on the
  // Removed badge so the owner can see why their listing isn't live.
  return (
    <Badge
      variant={STATE_VARIANT[state]}
      title={state === "not_for_sale" && reason ? reason : undefined}
    >
      {STATE_LABEL[state]}
    </Badge>
  );
}

function isActiveState(state: SaleListingState): boolean {
  return state === "pending_sale_approval" || state === "listed_for_sale";
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn("whitespace-nowrap px-5 py-3 font-medium", className)}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={cn("px-5 py-4 align-top", className)} title={title}>
      {children}
    </td>
  );
}

/* -------------------------- State sub-components ------------------------- */

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading listings" className="p-5">
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-md border border-border bg-card p-3"
          >
            <div className="skeleton h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100"
        aria-hidden
      >
        <Tag className="h-5 w-5 text-brand-700" />
      </span>
      <h3 className="text-base font-semibold text-foreground">
        No listings yet
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Approved lands can be put on the marketplace from your portfolio.
        Listings appear here once you submit them.
      </p>
      <Button asChild size="sm" variant="outline" className="mt-2">
        <Link href={ROUTES.OWNER_LANDS}>Go to my lands</Link>
      </Button>
    </div>
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
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"
        aria-hidden
      >
        <FileX className="h-5 w-5 text-destructive" />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          Couldn’t load your listings
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/* -------------------------- Remove confirmation -------------------------- */

interface RemoveListingDialogProps {
  pending: OwnerListing | null;
  onClose: () => void;
}

function RemoveListingDialog({ pending, onClose }: RemoveListingDialogProps) {
  const remove = useRemoveOwnerListingMutation();

  if (!pending) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const { isPending } = remove;

  async function handleConfirm() {
    if (!pending) return;
    try {
      await remove.mutateAsync(pending._id);
      toast.success("Listing removed", {
        description: `Plot ${pending.land.plotNumber} is no longer on the marketplace.`,
      });
      onClose();
    } catch (err) {
      toast.error("Couldn’t remove listing", {
        description: getDisplayMessage(err),
      });
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove this listing?</DialogTitle>
          <DialogDescription>
            The land will be taken off the marketplace. You can list it
            again later by submitting a new sale request — removals are
            permanent for this listing row.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
            <dt className="text-muted-foreground">Plot</dt>
            <dd className="font-chain text-foreground">
              {pending.land.plotNumber}
            </dd>

            <dt className="text-muted-foreground">Location</dt>
            <dd
              className="truncate text-foreground"
              title={pending.land.location}
            >
              {pending.land.location}
            </dd>

            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge state={pending.state} reason={null} />
            </dd>

            <dt className="text-muted-foreground">Listed</dt>
            <dd className="text-foreground">{formatDate(pending.createdAt)}</dd>
          </dl>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <XCircle className="h-3.5 w-3.5" aria-hidden />
            )}
            {isPending ? "Removing…" : "Remove listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
