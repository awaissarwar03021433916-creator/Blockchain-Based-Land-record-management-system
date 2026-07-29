"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Eye,
  FileX,
  History as HistoryIcon,
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
import { useOwnerHistory } from "@/features/owner/hooks/use-owner-history";
import { useAuthStore } from "@/stores/auth.store";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";
import type { OwnershipHistoryEntry } from "@/types/owner";

/**
 * Owner · Ownership History — every on-chain transfer the caller
 * has been a party to (either as seller or buyer), oldest first.
 *
 * Page composition mirrors the other owner / admin surfaces:
 *   • PageHeader              — title + subtitle + Refresh
 *   • HistoryCard             — table with loading / empty / error
 *                                states; chrome stays mounted
 *   • TransactionDetailsDialog — surfaces the full tx hash + block
 *                                + participants on demand, with a
 *                                copy-to-clipboard for the hash
 *
 * Read-only surface. No mutations. The ledger is append-only on the
 * server (`OwnershipHistory.model.js` marks every field immutable).
 *
 * The route is wrapped by `app/owner/layout.tsx` (ProtectedRoute
 * roles=[OWNER] + DashboardShell) — no chrome needed here.
 */

/* ------------------------------- page root ------------------------------- */

export default function OwnerHistoryPage() {
  const query = useOwnerHistory();
  const history = query.data?.history ?? [];
  const [selected, setSelected] =
    React.useState<OwnershipHistoryEntry | null>(null);
  // Auth store's User snapshot uses `id` (the JWT-signed shape); the
  // populated entities on history rows use `_id` (raw Mongo). Both
  // strings represent the same ObjectId, so a string compare is safe.
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        count={query.data?.count ?? 0}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      <HistoryCard
        query={query}
        history={history}
        currentUserId={currentUserId}
        onView={(entry) => setSelected(entry)}
      />

      <TransactionDetailsDialog
        entry={selected}
        currentUserId={currentUserId}
        onClose={() => setSelected(null)}
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
        <span className="eyebrow">Ledger</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          Ownership history
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          An append-only record of every on-chain transfer you have been
          a party to. Each row corresponds to one mined transaction on the
          registry contract.
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

/* ------------------------------ Card + table ----------------------------- */

interface HistoryCardProps {
  query: ReturnType<typeof useOwnerHistory>;
  history: readonly OwnershipHistoryEntry[];
  currentUserId: string | null;
  onView: (entry: OwnershipHistoryEntry) => void;
}

function HistoryCard({
  query,
  history,
  currentUserId,
  onView,
}: HistoryCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col">
          <span className="eyebrow">Provenance</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            Transfer ledger
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
        <HistoryTable
          history={history}
          currentUserId={currentUserId}
          onView={onView}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------- Table --------------------------------- */

interface HistoryTableProps {
  history: readonly OwnershipHistoryEntry[];
  currentUserId: string | null;
  onView: (entry: OwnershipHistoryEntry) => void;
}

function HistoryTable({
  history,
  currentUserId,
  onView,
}: HistoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
            <Th>Plot</Th>
            <Th>Previous owner</Th>
            <Th>New owner</Th>
            <Th>Transferred</Th>
            <Th>Tx hash</Th>
            <Th>Block</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {history.map((entry) => (
            <HistoryRow
              key={entry._id}
              entry={entry}
              currentUserId={currentUserId}
              onView={() => onView(entry)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryRow({
  entry,
  currentUserId,
  onView,
}: {
  entry: OwnershipHistoryEntry;
  currentUserId: string | null;
  onView: () => void;
}) {
  return (
    <tr className="transition-colors duration-hover hover:bg-brand-100/40">
      <Td className="font-chain text-foreground">{entry.land.plotNumber}</Td>
      <Td>
        <ParticipantCell
          participant={entry.previousOwner}
          isYou={
            currentUserId !== null &&
            entry.previousOwner._id === currentUserId
          }
        />
      </Td>
      <Td>
        <ParticipantCell
          participant={entry.newOwner}
          isYou={
            currentUserId !== null && entry.newOwner._id === currentUserId
          }
        />
      </Td>
      <Td className="whitespace-nowrap text-muted-foreground">
        {formatDate(entry.transferDate)}
      </Td>
      <Td>
        <span
          className="font-chain text-xs text-foreground"
          title={entry.transactionHash}
        >
          {shortAddress(entry.transactionHash)}
        </span>
      </Td>
      <Td className="whitespace-nowrap font-chain text-foreground">
        {entry.blockNumber != null ? `#${entry.blockNumber}` : "—"}
      </Td>
      <Td className="text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={onView}
          className="gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Details
        </Button>
      </Td>
    </tr>
  );
}

/* ------------------------------- Sub-cells ------------------------------- */

function ParticipantCell({
  participant,
  isYou,
}: {
  participant: OwnershipHistoryEntry["previousOwner"];
  isYou: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">{participant.name}</span>
        {isYou ? <Badge variant="info">You</Badge> : null}
      </div>
      <span className="text-xs text-muted-foreground">{participant.email}</span>
      {participant.walletAddress ? (
        <span className="font-chain text-[11px] text-muted-foreground">
          {shortAddress(participant.walletAddress)}
        </span>
      ) : null}
    </div>
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
        <HistoryIcon className="h-5 w-5 text-brand-700" />
      </span>
      <h3 className="text-base font-semibold text-foreground">
        No transfers yet
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Once an on-chain transfer involves you — as buyer or seller — it
        will appear here as a permanent ledger entry.
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

/* ------------------------ Transaction details dialog -------------------- */

interface TransactionDetailsDialogProps {
  entry: OwnershipHistoryEntry | null;
  currentUserId: string | null;
  onClose: () => void;
}

function TransactionDetailsDialog({
  entry,
  currentUserId,
  onClose,
}: TransactionDetailsDialogProps) {
  if (!entry) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Transaction details</DialogTitle>
          <DialogDescription>
            On-chain handoff recorded on the registry contract.
          </DialogDescription>
        </DialogHeader>

        <PlotSummary entry={entry} />
        <ParticipantsBlock entry={entry} currentUserId={currentUserId} />
        <ChainBlock entry={entry} />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlotSummary({ entry }: { entry: OwnershipHistoryEntry }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Plot</dt>
        <dd className="font-chain text-foreground">
          {entry.land.plotNumber}
        </dd>

        <dt className="text-muted-foreground">Location</dt>
        <dd className="truncate text-foreground" title={entry.land.location}>
          {entry.land.location}
        </dd>

        <dt className="text-muted-foreground">Area</dt>
        <dd className="text-foreground">{entry.land.area}</dd>

        <dt className="text-muted-foreground">Transferred</dt>
        <dd className="text-foreground">
          {formatDateTime(entry.transferDate)}
        </dd>
      </dl>
    </div>
  );
}

function ParticipantsBlock({
  entry,
  currentUserId,
}: {
  entry: OwnershipHistoryEntry;
  currentUserId: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
      <ParticipantPanel
        title="Previous owner"
        participant={entry.previousOwner}
        isYou={
          currentUserId !== null &&
          entry.previousOwner._id === currentUserId
        }
      />
      <span
        className="hidden h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 sm:flex"
        aria-hidden
      >
        <ArrowRight className="h-4 w-4" />
      </span>
      <ParticipantPanel
        title="New owner"
        participant={entry.newOwner}
        isYou={
          currentUserId !== null && entry.newOwner._id === currentUserId
        }
      />
    </div>
  );
}

function ParticipantPanel({
  title,
  participant,
  isYou,
}: {
  title: string;
  participant: OwnershipHistoryEntry["previousOwner"];
  isYou: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{title}</span>
        {isYou ? <Badge variant="info">You</Badge> : null}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">
        {participant.name}
      </div>
      <div className="text-xs text-muted-foreground">{participant.email}</div>
      {participant.walletAddress ? (
        <div
          className="mt-1 font-chain text-[11px] text-muted-foreground"
          title={participant.walletAddress}
        >
          {shortAddress(participant.walletAddress)}
        </div>
      ) : null}
    </div>
  );
}

function ChainBlock({ entry }: { entry: OwnershipHistoryEntry }) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <span className="eyebrow">Transaction hash</span>
        <div className="flex items-stretch gap-2">
          <div
            className={cn(
              "flex-1 rounded-md border border-border bg-card px-3 py-2",
              "font-chain text-xs text-foreground break-all leading-relaxed",
            )}
          >
            {entry.transactionHash}
          </div>
          <CopyButton value={entry.transactionHash} label="transaction hash" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-md border border-border bg-card p-2.5">
          <div className="eyebrow">Block</div>
          <div className="mt-0.5 font-chain text-sm text-foreground">
            {entry.blockNumber != null ? `#${entry.blockNumber}` : "—"}
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-2.5">
          <div className="eyebrow">Record id</div>
          <div
            className="mt-0.5 truncate font-chain text-sm text-foreground"
            title={entry._id}
          >
            {entry._id}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Copy button ------------------------------- */

interface CopyButtonProps {
  value: string;
  label: string;
}

/**
 * Small reusable copy-to-clipboard control. Lives in this file because
 * it is currently only used here; promote to `components/ui/` if a
 * second consumer arrives.
 */
function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard is unavailable in this browser");
      }
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied", { description: `The ${label} is on your clipboard.` });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      toast.error("Couldn’t copy", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleCopy()}
      aria-label={`Copy ${label} to clipboard`}
      className={cn("gap-1.5", copied && "text-brand-700")}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

/* -------------------------------- helpers -------------------------------- */

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FORMAT.format(d);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_FORMAT.format(d);
}
