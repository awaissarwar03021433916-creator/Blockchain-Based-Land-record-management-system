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
  useAdminTransfers,
  useApproveTransferMutation,
  useRejectTransferMutation,
} from "@/features/admin/hooks/use-admin-transfers";
import { ChainError, getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";
import type { PendingTransferRequest } from "@/types/admin";

/**
 * Admin · Pending Transfers — moderation queue for the second leg of
 * the two-tier transfer flow (owner has approved; admin executes the
 * on-chain transfer or rejects with reason).
 *
 * Page composition mirrors the Pending Lands surface intentionally —
 * same table chrome, same dialog grammar — so admins switch surfaces
 * without retraining their eyes.
 *
 * The mutations are optimistic (`use-admin-transfers.ts`): rows
 * disappear the instant the user confirms. A 502 ChainError rolls back
 * and surfaces a toast with the chain reason; a 500 reconciliation
 * error surfaces the tx hash for manual follow-up.
 *
 * The layout is wrapped by `app/admin/layout.tsx` (ProtectedRoute +
 * DashboardShell) — no chrome needed here.
 */

/* ------------------------------- page root ------------------------------- */

type ActionMode = "approve" | "reject";

interface PendingAction {
  mode: ActionMode;
  request: PendingTransferRequest;
}

export default function AdminTransferRequestsPage() {
  const query = useAdminTransfers();
  const [pending, setPending] = React.useState<PendingAction | null>(null);

  const count = query.data?.count ?? 0;
  const requests = query.data?.requests ?? [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        count={count}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      <TransfersCard
        query={query}
        requests={requests}
        onApprove={(request) => setPending({ mode: "approve", request })}
        onReject={(request) => setPending({ mode: "reject", request })}
      />

      <TransferActionDialog
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
          Transfer requests
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The owner has consented to these transfers. Approve to execute the
          on-chain handoff, or reject with a reason — both actions are
          final and recorded.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "request" : "requests"}
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

interface TransfersCardProps {
  query: ReturnType<typeof useAdminTransfers>;
  requests: readonly PendingTransferRequest[];
  onApprove: (request: PendingTransferRequest) => void;
  onReject: (request: PendingTransferRequest) => void;
}

function TransfersCard({
  query,
  requests,
  onApprove,
  onReject,
}: TransfersCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col">
          <span className="eyebrow">Queue</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            Awaiting admin action
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
      {query.isSuccess && requests.length === 0 ? <EmptyState /> : null}
      {query.isSuccess && requests.length > 0 ? (
        <TransfersTable
          requests={requests}
          onApprove={onApprove}
          onReject={onReject}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------- Table --------------------------------- */

interface TransfersTableProps {
  requests: readonly PendingTransferRequest[];
  onApprove: (request: PendingTransferRequest) => void;
  onReject: (request: PendingTransferRequest) => void;
}

function TransfersTable({
  requests,
  onApprove,
  onReject,
}: TransfersTableProps) {
  // Server sends FIFO (oldest first). Flip to newest first for the table —
  // admins want to see what just arrived without scrolling.
  const sorted = React.useMemo(
    () =>
      [...requests].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [requests],
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
            <Th>Buyer</Th>
            <Th>Seller</Th>
            <Th>Plot</Th>
            <Th>Location</Th>
            <Th>Requested</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((request) => (
            <TransferRow
              key={request._id}
              request={request}
              onApprove={() => onApprove(request)}
              onReject={() => onReject(request)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransferRow({
  request,
  onApprove,
  onReject,
}: {
  request: PendingTransferRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <tr className="transition-colors duration-hover hover:bg-brand-100/40">
      <Td>
        <ParticipantCell
          name={request.buyer.name}
          email={request.buyer.email}
          wallet={request.buyerWalletAddress}
        />
      </Td>
      <Td>
        <ParticipantCell
          name={request.currentOwner.name}
          email={request.currentOwner.email}
          wallet={request.currentOwner.walletAddress}
        />
      </Td>
      <Td className="font-chain text-foreground">{request.land.plotNumber}</Td>
      <Td
        className="max-w-[220px] truncate text-foreground"
        title={request.land.location}
      >
        {request.land.location}
      </Td>
      <Td className="whitespace-nowrap text-muted-foreground">
        {formatDate(request.createdAt)}
      </Td>
      <Td>
        <Badge variant="info">Owner approved</Badge>
      </Td>
      <Td className="text-right">
        <div className="inline-flex items-center gap-2">
          <Button
            size="sm"
            variant="accent"
            onClick={onApprove}
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

function ParticipantCell({
  name,
  email,
  wallet,
}: {
  name: string;
  email: string;
  wallet: string | undefined;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">{name}</span>
      <span className="text-xs text-muted-foreground">{email}</span>
      {wallet ? (
        <span className="font-chain text-[11px] text-muted-foreground">
          {shortAddress(wallet)}
        </span>
      ) : (
        <span className="text-[11px] italic text-warning">no wallet</span>
      )}
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
    <div role="status" aria-label="Loading requests" className="p-5">
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
        Nothing to review
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        All consented transfers have been actioned. New requests will appear
        here once owners approve them.
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

interface TransferActionDialogProps {
  pending: PendingAction | null;
  onClose: () => void;
}

function TransferActionDialog({
  pending,
  onClose,
}: TransferActionDialogProps) {
  const approve = useApproveTransferMutation();
  const reject = useRejectTransferMutation();
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    setReason("");
  }, [pending]);

  if (!pending) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const { mode, request } = pending;
  const isApprove = mode === "approve";
  const isPending = isApprove ? approve.isPending : reject.isPending;
  const reasonRequired = !isApprove && reason.trim().length === 0;

  async function handleConfirm() {
    try {
      if (isApprove) {
        const result = await approve.mutateAsync(request._id);
        toast.success("Transfer completed", {
          description: `Recorded on-chain — tx ${shortAddress(
            result.transactionHash,
          )}`,
        });
      } else {
        await reject.mutateAsync({
          requestId: request._id,
          reason: reason.trim(),
        });
        toast.success("Request rejected", {
          description: `Plot ${request.land.plotNumber} marked rejected.`,
        });
      }
      onClose();
    } catch (err) {
      // ChainError carries the on-chain revert reason explicitly — surface
      // it inline so the admin can decide whether to retry or escalate.
      const description =
        err instanceof ChainError && err.reason
          ? `On-chain: ${err.reason}`
          : getDisplayMessage(err);
      toast.error(isApprove ? "Approval failed" : "Rejection failed", {
        description,
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
          <DialogTitle>
            {isApprove
              ? "Execute on-chain transfer"
              : "Reject transfer request"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "This will move ownership on the blockchain and update the registry. The action cannot be undone."
              : "The buyer and seller will both be notified with the reason you provide below."}
          </DialogDescription>
        </DialogHeader>

        <SummaryCard request={request} />

        {!isApprove ? (
          <div className="space-y-2">
            <Label htmlFor="reject-transfer-reason">Reason</Label>
            <Textarea
              id="reject-transfer-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. buyer wallet address could not be verified"
              maxLength={500}
              disabled={isPending}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/500 — required, shared with both parties.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              The chain call is irreversible. If it reverts, no state
              changes — but a confirmed transfer cannot be rolled back.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? "accent" : "destructive"}
            onClick={() => void handleConfirm()}
            disabled={isPending || reasonRequired}
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
                ? "Transferring…"
                : "Execute transfer"
              : isPending
                ? "Rejecting…"
                : "Reject request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ request }: { request: PendingTransferRequest }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Plot</dt>
        <dd className="font-chain text-foreground">
          {request.land.plotNumber}
        </dd>

        <dt className="text-muted-foreground">Location</dt>
        <dd className="truncate text-foreground" title={request.land.location}>
          {request.land.location}
        </dd>

        <dt className="text-muted-foreground">Area</dt>
        <dd className="text-foreground">{request.land.area}</dd>

        <dt className="text-muted-foreground">Seller</dt>
        <dd className="text-foreground">
          {request.currentOwner.name}
          <span className="ml-1 text-muted-foreground">
            ({request.currentOwner.email})
          </span>
        </dd>

        <dt className="text-muted-foreground">Buyer</dt>
        <dd className="text-foreground">
          {request.buyer.name}
          <span className="ml-1 text-muted-foreground">
            ({request.buyer.email})
          </span>
        </dd>

        <dt className="text-muted-foreground">Buyer wallet</dt>
        <dd
          className="font-chain text-foreground"
          title={request.buyerWalletAddress}
        >
          {shortAddress(request.buyerWalletAddress)}
        </dd>

        <dt className="text-muted-foreground">Requested</dt>
        <dd className="text-foreground">{formatDate(request.createdAt)}</dd>

        {request.requestMessage ? (
          <>
            <dt className="text-muted-foreground">Message</dt>
            <dd className="text-foreground">{request.requestMessage}</dd>
          </>
        ) : null}
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
