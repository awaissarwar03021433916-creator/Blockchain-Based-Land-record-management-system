"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  FileX,
  Hash,
  History as HistoryIcon,
  MoveRight,
  RefreshCw,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { useBuyerHistory } from "@/features/buyer/buyer-hooks";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";
import type { HistoryParticipant, OwnershipHistoryEntry } from "@/types/owner";

/**
 * Buyer · Ownership History — the caller's personal, immutable on-chain
 * ledger: every transfer they were a party to (as previous or new owner),
 * newest first.
 *
 * Read-only audit surface. Each row shows the plot, the From → To parties,
 * the transfer date, and the on-chain receipt (tx hash + block). Direction
 * is rendered explicitly (previous → new owner) rather than inferred as
 * "bought/sold", because the persisted session doesn't carry the caller's
 * user id to compare against.
 *
 * Composition mirrors the buyer requests + owner/admin surfaces:
 *   • PageHeader   — title + subtitle + Refresh + count
 *   • HistoryCard  — table with loading / empty / error states; chrome
 *                    stays mounted so the layout never reflows
 *
 * The route is wrapped by `app/buyer/layout.tsx` (ProtectedRoute
 * roles=[BUYER] + DashboardShell) — no page chrome needed here.
 */

export default function BuyerHistoryPage() {
  const query = useBuyerHistory();
  const history = query.data?.history ?? [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        count={query.data?.count ?? 0}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
      />
      <HistoryCard query={query} history={history} />
    </div>
  );
}

/* ------------------------------ page header ------------------------------ */

interface PageHeaderProps {
  count: number;
  isFetching: boolean;
  onRefresh: () => void;
}

function PageHeader({ count, isFetching, onRefresh }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Provenance</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          Ownership history
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every on-chain transfer you’ve been a party to. This ledger is
          immutable — each entry carries the transaction hash recorded on the
          blockchain.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "entry" : "entries"}
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

/* ------------------------------ card + table ----------------------------- */

interface HistoryCardProps {
  query: ReturnType<typeof useBuyerHistory>;
  history: readonly OwnershipHistoryEntry[];
}

function HistoryCard({ query, history }: HistoryCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col">
          <span className="eyebrow">Ledger</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            Transfer record
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
      {query.isSuccess && history.length === 0 ? <EmptyState /> : null}
      {query.isSuccess && history.length > 0 ? (
        <HistoryTable history={history} />
      ) : null}
    </div>
  );
}

function HistoryTable({
  history,
}: {
  history: readonly OwnershipHistoryEntry[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
            <Th>Plot</Th>
            <Th>Location</Th>
            <Th>Transfer</Th>
            <Th>Date</Th>
            <Th>Tx hash</Th>
            <Th>Block</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {history.map((entry) => (
            <HistoryRow key={entry._id} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryRow({ entry }: { entry: OwnershipHistoryEntry }) {
  return (
    <tr className="transition-colors duration-hover hover:bg-brand-100/40">
      <Td className="font-chain text-foreground">{entry.land.plotNumber}</Td>
      <Td
        className="max-w-[220px] truncate text-foreground"
        title={entry.land.location}
      >
        {entry.land.location}
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <Party participant={entry.previousOwner} />
          <MoveRight
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-label="transferred to"
          />
          <Party participant={entry.newOwner} />
        </div>
      </Td>
      <Td className="whitespace-nowrap text-muted-foreground">
        {formatDate(entry.transferDate)}
      </Td>
      <Td>
        <TxCell hash={entry.transactionHash} />
      </Td>
      <Td className="font-chain text-xs text-muted-foreground">
        {entry.blockNumber != null ? (
          <span className="inline-flex items-center gap-1">
            <Hash className="h-3 w-3" aria-hidden />
            {entry.blockNumber}
          </span>
        ) : (
          "—"
        )}
      </Td>
    </tr>
  );
}

/* ------------------------------- sub-cells ------------------------------- */

function Party({ participant }: { participant: HistoryParticipant }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate font-medium text-foreground" title={participant.name}>
        {participant.name}
      </span>
      {participant.walletAddress ? (
        <span
          className="font-chain text-[11px] text-muted-foreground"
          title={participant.walletAddress}
        >
          {shortAddress(participant.walletAddress)}
        </span>
      ) : (
        <span className="truncate text-[11px] text-muted-foreground" title={participant.email}>
          {participant.email}
        </span>
      )}
    </div>
  );
}

function TxCell({ hash }: { hash: string }) {
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

/* -------------------------- state sub-components ------------------------- */

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading history" className="p-5">
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
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 w-16" />
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
        <HistoryIcon className="h-5 w-5 text-brand-700" />
      </span>
      <h3 className="text-base font-semibold text-foreground">
        No ownership history yet
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Once a transfer you’re part of completes on-chain, it’ll appear here as a
        permanent ledger entry.
      </p>
      <Button asChild size="sm" className="mt-2 gap-1.5">
        <Link href={ROUTES.MARKETPLACE}>
          <Store className="h-3.5 w-3.5" aria-hidden />
          Browse marketplace
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
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
          Couldn’t load your history
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
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
