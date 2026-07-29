"use client";

import * as React from "react";
import Link from "next/link";
import {
  ExternalLink,
  Eye,
  FileX,
  Map as MapIcon,
  PlusCircle,
  RefreshCw,
  Tag,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { useOwnerLands } from "@/features/owner/hooks/use-owner-lands";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";
import type { OwnerLand } from "@/types/owner";

/**
 * Owner · My Lands — the caller's land portfolio.
 *
 * Page composition mirrors the admin moderation surfaces so the visual
 * language is consistent:
 *   • PageHeader   — title + subtitle + Submit Land CTA + Refresh
 *   • LandsCard    — table with loading / empty / error states; chrome
 *                    stays mounted so the layout never reflows
 *
 * No mutations on this surface — read-only portfolio view. "Submit
 * For Sale" navigates to the dedicated listing form; "View Details"
 * navigates to the shared land detail page.
 *
 * The route is wrapped by `app/owner/layout.tsx` (ProtectedRoute
 * roles=[OWNER] + DashboardShell) — no chrome needed here.
 */

export default function OwnerMyLandsPage() {
  const query = useOwnerLands();
  const lands = query.data?.lands ?? [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        count={query.data?.count ?? 0}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      <LandsCard query={query} lands={lands} />
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
        <span className="eyebrow">Portfolio</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          My lands
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every plot you have registered with the registry, across pending,
          on-chain, and rejected submissions. Approved lands can be listed
          on the marketplace.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "land" : "lands"}
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
        <Button asChild size="sm" className="gap-1.5">
          <Link href={ROUTES.OWNER_LAND_NEW}>
            <PlusCircle className="h-3.5 w-3.5" aria-hidden />
            Submit land
          </Link>
        </Button>
      </div>
    </header>
  );
}

/* ------------------------------ Card + table ----------------------------- */

interface LandsCardProps {
  query: ReturnType<typeof useOwnerLands>;
  lands: readonly OwnerLand[];
}

function LandsCard({ query, lands }: LandsCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col">
          <span className="eyebrow">Holdings</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            All registered plots
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
      {query.isSuccess && lands.length === 0 ? <EmptyState /> : null}
      {query.isSuccess && lands.length > 0 ? (
        <LandsTable lands={lands} />
      ) : null}
    </div>
  );
}

/* --------------------------------- Table --------------------------------- */

function LandsTable({ lands }: { lands: readonly OwnerLand[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
            <Th>Plot</Th>
            <Th>Location</Th>
            <Th>Area</Th>
            <Th>Status</Th>
            <Th>Tx hash</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lands.map((land) => (
            <LandRow key={land._id} land={land} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LandRow({ land }: { land: OwnerLand }) {
  const isApproved = land.status === "approved";
  return (
    <tr className="transition-colors duration-hover hover:bg-brand-100/40">
      <Td className="font-chain text-foreground">{land.plotNumber}</Td>
      <Td
        className="max-w-[260px] truncate text-foreground"
        title={land.location}
      >
        {land.location}
      </Td>
      <Td className="text-foreground">{land.area}</Td>
      <Td>
        <StatusBadge status={land.status} reason={land.rejectionReason} />
      </Td>
      <Td>
        <TxCell hash={land.transactionHash} />
      </Td>
      <Td className="text-right">
        <div className="inline-flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href={ROUTES.MARKETPLACE_LAND(land._id)}>
              <Eye className="h-3.5 w-3.5" aria-hidden />
              View
            </Link>
          </Button>
          {/* "Submit For Sale" only makes sense for an on-chain land — the
              backend's listing controller cross-checks Land.status === "approved"
              before flipping listedForSale. Disabling here mirrors that policy
              so the user doesn't hit a 400 after a click. */}
          <Button
            asChild={isApproved}
            size="sm"
            variant="accent"
            disabled={!isApproved}
            className="gap-1.5"
            title={
              isApproved
                ? undefined
                : "Land must be approved before it can be listed for sale"
            }
          >
            {isApproved ? (
              <Link href={ROUTES.OWNER_LAND_LIST(land._id)}>
                <Tag className="h-3.5 w-3.5" aria-hidden />
                List for sale
              </Link>
            ) : (
              <span>
                <Tag className="h-3.5 w-3.5" aria-hidden />
                List for sale
              </span>
            )}
          </Button>
        </div>
      </Td>
    </tr>
  );
}

/* ------------------------------- Sub-cells ------------------------------- */

const STATUS_VARIANT: Record<OwnerLand["status"], BadgeProps["variant"]> = {
  pending: "pending",
  approved: "success",
  rejected: "destructive",
};

const STATUS_LABEL: Record<OwnerLand["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function StatusBadge({
  status,
  reason,
}: {
  status: OwnerLand["status"];
  reason: string | null;
}) {
  // The rejection reason is the only piece of context the owner can't see
  // anywhere else, so surface it via title-tooltip on the badge itself.
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      title={status === "rejected" && reason ? reason : undefined}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function TxCell({ hash }: { hash: string | null }) {
  if (!hash) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  // No external explorer for Ganache; render the short hash with a hover
  // title that reveals the full value so the owner can copy it manually.
  return (
    <span
      className="inline-flex items-center gap-1.5 font-chain text-xs text-foreground"
      title={hash}
    >
      <ExternalLink
        className="h-3 w-3 text-muted-foreground"
        aria-hidden
      />
      {shortAddress(hash)}
    </span>
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
    <div role="status" aria-label="Loading lands" className="p-5">
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
        <MapIcon className="h-5 w-5 text-brand-700" />
      </span>
      <h3 className="text-base font-semibold text-foreground">
        No lands yet
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Submit a land for verification to start building your portfolio.
        Approved submissions are recorded on-chain.
      </p>
      <Button asChild size="sm" className="mt-2 gap-1.5">
        <Link href={ROUTES.OWNER_LAND_NEW}>
          <PlusCircle className="h-3.5 w-3.5" aria-hidden />
          Submit your first land
        </Link>
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
          Couldn’t load your portfolio
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
