"use client";

import * as React from "react";
import {
  CheckCircle2,
  FileX,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminListings,
  useApproveListingMutation,
} from "@/features/admin/hooks/use-admin-listings";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";
import type { PendingListing } from "@/types/admin";

/**
 * Admin · Pending Listings — moderation queue for the marketplace.
 *
 * Page composition mirrors the other admin moderation surfaces
 * intentionally — same table chrome, same dialog grammar — so admins
 * switch between the lands / transfers / listings queues without
 * retraining their eyes.
 *
 * Approval is optimistic (`use-admin-listings.ts`): the row leaves
 * the table the instant the user confirms. A 409 stale-listing failure
 * rolls back and surfaces a toast.
 *
 * Reject is NOT exposed on this surface; the spec scoped this page
 * to the approval flow. The backend's `rejectListing` controller
 * still exists and can be wired in later if needed.
 *
 * The layout is wrapped by `app/admin/layout.tsx` (ProtectedRoute +
 * DashboardShell) — no chrome needed here.
 */

/* ------------------------------- page root ------------------------------- */

export default function AdminPendingListingsPage() {
  const query = useAdminListings();
  const listings = query.data?.listings ?? [];
  const [pending, setPending] = React.useState<PendingListing | null>(null);

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
        onApprove={(listing) => setPending(listing)}
      />

      <ApproveListingDialog
        pending={pending}
        onClose={() => setPending(null)}
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
        <span className="eyebrow">Moderation</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          Pending listings
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Sale submissions awaiting marketplace approval. Approving a
          listing makes it visible to buyers; it cannot be undone from
          this surface.
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
  query: ReturnType<typeof useAdminListings>;
  listings: readonly PendingListing[];
  onApprove: (listing: PendingListing) => void;
}

function ListingsCard({ query, listings, onApprove }: ListingsCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col">
          <span className="eyebrow">Queue</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            Awaiting marketplace approval
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
        <ListingsTable listings={listings} onApprove={onApprove} />
      ) : null}
    </div>
  );
}

/* --------------------------------- Table --------------------------------- */

interface ListingsTableProps {
  listings: readonly PendingListing[];
  onApprove: (listing: PendingListing) => void;
}

function ListingsTable({ listings, onApprove }: ListingsTableProps) {
  // Server sends FIFO (oldest first). Flip to newest first for the table
  // so admins see freshest submissions at the top.
  const sorted = React.useMemo(
    () =>
      [...listings].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [listings],
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
            <Th>Plot</Th>
            <Th>Location</Th>
            <Th>Area</Th>
            <Th>Owner</Th>
            <Th>Email</Th>
            <Th>Submitted</Th>
            <Th>State</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((listing) => (
            <ListingRow
              key={listing._id}
              listing={listing}
              onApprove={() => onApprove(listing)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingRow({
  listing,
  onApprove,
}: {
  listing: PendingListing;
  onApprove: () => void;
}) {
  return (
    <tr className="transition-colors duration-hover hover:bg-brand-100/40">
      <Td className="font-chain text-foreground">{listing.land.plotNumber}</Td>
      <Td
        className="max-w-[220px] truncate text-foreground"
        title={listing.land.location}
      >
        {listing.land.location}
      </Td>
      <Td className="text-foreground">{listing.land.area}</Td>
      <Td>
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {listing.owner.name}
          </span>
          {listing.ownerWalletAddress ? (
            <span className="font-chain text-[11px] text-muted-foreground">
              {shortAddress(listing.ownerWalletAddress)}
            </span>
          ) : null}
        </div>
      </Td>
      <Td className="text-foreground">{listing.owner.email}</Td>
      <Td className="whitespace-nowrap text-muted-foreground">
        {formatDate(listing.createdAt)}
      </Td>
      <Td>
        <Badge variant="pending">Pending</Badge>
      </Td>
      <Td className="text-right">
        <Button
          size="sm"
          variant="accent"
          onClick={onApprove}
          className="gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Approve
        </Button>
      </Td>
    </tr>
  );
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
        <Inbox className="h-5 w-5 text-brand-700" />
      </span>
      <h3 className="text-base font-semibold text-foreground">
        Queue is empty
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Every submitted listing has been actioned. New owner submissions
        appear here automatically.
      </p>
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
          Couldn’t load the queue
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/* ---------------------------- Action dialog ------------------------------ */

interface ApproveListingDialogProps {
  pending: PendingListing | null;
  onClose: () => void;
}

function ApproveListingDialog({ pending, onClose }: ApproveListingDialogProps) {
  const approve = useApproveListingMutation();

  if (!pending) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const isPending = approve.isPending;

  async function handleConfirm() {
    if (!pending) return;
    try {
      await approve.mutateAsync(pending._id);
      toast.success("Listing approved", {
        description: `Plot ${pending.land.plotNumber} is now visible on the marketplace.`,
      });
      onClose();
    } catch (err) {
      toast.error("Couldn’t approve listing", {
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
          <DialogTitle>Approve this listing?</DialogTitle>
          <DialogDescription>
            The land becomes immediately visible on the marketplace.
            Buyers can submit transfer requests against it.
          </DialogDescription>
        </DialogHeader>

        <SummaryCard listing={pending} />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={() => void handleConfirm()}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {isPending ? "Approving…" : "Approve listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ listing }: { listing: PendingListing }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Plot</dt>
        <dd className="font-chain text-foreground">
          {listing.land.plotNumber}
        </dd>

        <dt className="text-muted-foreground">Location</dt>
        <dd className="truncate text-foreground" title={listing.land.location}>
          {listing.land.location}
        </dd>

        <dt className="text-muted-foreground">Area</dt>
        <dd className="text-foreground">{listing.land.area}</dd>

        <dt className="text-muted-foreground">Owner</dt>
        <dd className="text-foreground">
          {listing.owner.name}
          <span className="ml-1 text-muted-foreground">
            ({listing.owner.email})
          </span>
        </dd>

        <dt className="text-muted-foreground">Owner wallet</dt>
        <dd
          className="font-chain text-foreground"
          title={listing.ownerWalletAddress}
        >
          {shortAddress(listing.ownerWalletAddress)}
        </dd>

        <dt className="text-muted-foreground">Submitted</dt>
        <dd className="text-foreground">{formatDate(listing.createdAt)}</dd>
      </dl>
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
