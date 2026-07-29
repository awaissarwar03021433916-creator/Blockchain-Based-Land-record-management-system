"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileX,
  Inbox,
  Loader2,
  RefreshCw,
  XCircle,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useApproveLandMutation,
  usePendingLands,
  useRejectLandMutation,
} from "@/features/admin/hooks/use-pending-lands";
import { ChainError, getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";
import type { PendingLand } from "@/types/admin";

/**
 * Admin · Pending Lands — moderation queue.
 *
 * Page composition:
 *   • PageHeader              — title + subtitle + refresh button
 *   • PendingLandsCard        — the table with its own loading / empty /
 *                                error states (table chrome stays mounted
 *                                so the layout doesn't reflow)
 *   • LandActionDialog        — one dialog driven by `pending` state,
 *                                handles both approve and reject
 *
 * Mutations are optimistic (see `use-pending-lands.ts`) — the row
 * disappears from the table the moment the user confirms. A 502 chain
 * failure rolls back and surfaces a toast so the admin can retry.
 *
 * The layout is wrapped by `app/admin/layout.tsx` (ProtectedRoute +
 * DashboardShell) — no chrome needed here.
 */

/* ------------------------------- page root ------------------------------- */

type ActionMode = "approve" | "reject";

interface PendingAction {
  mode: ActionMode;
  land: PendingLand;
}

export default function AdminPendingLandsPage() {
  const query = usePendingLands();
  const [pending, setPending] = React.useState<PendingAction | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        count={query.data?.length ?? 0}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      <PendingLandsCard
        query={query}
        onApprove={(land) => setPending({ mode: "approve", land })}
        onReject={(land) => setPending({ mode: "reject", land })}
      />

      <LandActionDialog
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
          Pending lands
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Verify ownership documents and approve submissions to record them
          on-chain. Rejections require a reason that is shared with the owner.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "submission" : "submissions"}
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

interface PendingLandsCardProps {
  query: ReturnType<typeof usePendingLands>;
  onApprove: (land: PendingLand) => void;
  onReject: (land: PendingLand) => void;
}

function PendingLandsCard({
  query,
  onApprove,
  onReject,
}: PendingLandsCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col">
          <span className="eyebrow">Queue</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            Awaiting verification
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
      {query.isSuccess && query.data.length === 0 ? <EmptyState /> : null}
      {query.isSuccess && query.data.length > 0 ? (
        <LandsTable
          lands={query.data}
          onApprove={onApprove}
          onReject={onReject}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------- Table --------------------------------- */

interface LandsTableProps {
  lands: readonly PendingLand[];
  onApprove: (land: PendingLand) => void;
  onReject: (land: PendingLand) => void;
}

function LandsTable({ lands, onApprove, onReject }: LandsTableProps) {
  // Newest first — the queue order from MongoDB is insertion-order,
  // which puts the oldest at the top; admins want the freshest items.
  const sorted = React.useMemo(
    () =>
      [...lands].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [lands],
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
            <Th>Owner</Th>
            <Th>Plot</Th>
            <Th>Location</Th>
            <Th>Area</Th>
            <Th>Submitted</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((land) => (
            <LandRow
              key={land._id}
              land={land}
              onApprove={() => onApprove(land)}
              onReject={() => onReject(land)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LandRow({
  land,
  onApprove,
  onReject,
}: {
  land: PendingLand;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <tr className="transition-colors duration-hover hover:bg-brand-100/40">
      <Td>
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {land.owner.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {land.owner.email}
          </span>
          {land.owner.walletAddress ? (
            <span className="font-chain text-[11px] text-muted-foreground">
              {shortAddress(land.owner.walletAddress)}
            </span>
          ) : (
            <span className="text-[11px] italic text-warning">
              no wallet
            </span>
          )}
        </div>
      </Td>
      <Td className="font-chain text-foreground">{land.plotNumber}</Td>
      <Td className="max-w-[220px] truncate text-foreground" title={land.location}>
        {land.location}
      </Td>
      <Td className="text-foreground">{land.area}</Td>
      <Td className="whitespace-nowrap text-muted-foreground">
        {formatDate(land.createdAt)}
      </Td>
      <Td>
        <Badge variant="pending">Pending</Badge>
      </Td>
      <Td className="text-right">
        <div className="inline-flex items-center gap-2">
          <Button
            size="sm"
            variant="accent"
            onClick={onApprove}
            disabled={!land.owner.walletAddress}
            title={
              land.owner.walletAddress
                ? undefined
                : "Owner has no wallet address — cannot record on-chain"
            }
            className="gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            Reject
          </Button>
        </div>
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
    <div role="status" aria-label="Loading submissions" className="p-5">
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-md border border-border bg-card p-3"
          >
            <div className="skeleton h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
            <div className="skeleton h-8 w-20 rounded-md" />
            <div className="skeleton h-8 w-20 rounded-md" />
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
        Every pending submission has been actioned. New land submissions
        will appear here automatically.
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

interface LandActionDialogProps {
  pending: PendingAction | null;
  onClose: () => void;
}

/**
 * Single dialog driven by `pending` state — `mode === "reject"` shows
 * the reason field; both modes share the structural chrome so the
 * transition between them isn't jarring.
 */
function LandActionDialog({ pending, onClose }: LandActionDialogProps) {
  const approve = useApproveLandMutation();
  const reject = useRejectLandMutation();
  const [reason, setReason] = React.useState("");

  // Reset the reason whenever a fresh pending action arrives.
  React.useEffect(() => {
    setReason("");
  }, [pending]);

  if (!pending) {
    // Render the closed dialog so the unmount animation can play.
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const { mode, land } = pending;
  const isApprove = mode === "approve";
  const isPending = isApprove ? approve.isPending : reject.isPending;
  const reasonRequired = !isApprove && reason.trim().length === 0;

  async function handleConfirm() {
    try {
      if (isApprove) {
        const result = await approve.mutateAsync(land._id);
        toast.success("Land approved", {
          description: `Recorded on-chain — tx ${shortAddress(
            result.transactionHash,
          )}`,
        });
      } else {
        await reject.mutateAsync({ landId: land._id, reason: reason.trim() });
        toast.success("Submission rejected", {
          description: `${land.plotNumber} marked rejected.`,
        });
      }
      onClose();
    } catch (err) {
      // Chain failure is the loudest case — surface its specific reason.
      const description =
        err instanceof ChainError && err.reason
          ? `On-chain: ${err.reason}`
          : getDisplayMessage(err);
      toast.error(
        isApprove ? "Approval failed" : "Rejection failed",
        { description },
      );
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
          <DialogTitle>
            {isApprove ? "Approve land submission" : "Reject land submission"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "This will record the land on-chain and assign it to the owner. The action cannot be undone."
              : "The owner will be notified with the reason you provide below."}
          </DialogDescription>
        </DialogHeader>

        <SummaryCard land={land} />

        {!isApprove ? (
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. plot number doesn't match the ownership document"
              maxLength={500}
              disabled={isPending}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/500 — required, visible to the owner.
            </p>
          </div>
        ) : land.owner.walletAddress == null ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              Owner has no wallet address — the chain call will fail. Ask
              the owner to add a wallet first.
            </span>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={isApprove ? "accent" : "destructive"}
            onClick={() => void handleConfirm()}
            disabled={
              isPending ||
              reasonRequired ||
              (isApprove && !land.owner.walletAddress)
            }
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : isApprove ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <XCircle className="h-3.5 w-3.5" aria-hidden />
            )}
            {isApprove
              ? isPending
                ? "Approving…"
                : "Approve & record"
              : isPending
                ? "Rejecting…"
                : "Reject submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ land }: { land: PendingLand }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Owner</dt>
        <dd className="font-medium text-foreground">{land.owner.name}</dd>

        <dt className="text-muted-foreground">Email</dt>
        <dd className="truncate text-foreground">{land.owner.email}</dd>

        <dt className="text-muted-foreground">Plot</dt>
        <dd className="font-chain text-foreground">{land.plotNumber}</dd>

        <dt className="text-muted-foreground">Location</dt>
        <dd className="truncate text-foreground" title={land.location}>
          {land.location}
        </dd>

        <dt className="text-muted-foreground">Area</dt>
        <dd className="text-foreground">{land.area}</dd>

        <dt className="text-muted-foreground">Submitted</dt>
        <dd className="text-foreground">{formatDate(land.createdAt)}</dd>
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
