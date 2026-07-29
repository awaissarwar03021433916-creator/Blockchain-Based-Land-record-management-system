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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useApproveOwnerTransferMutation,
  useOwnerTransferRequests,
  useRejectOwnerTransferMutation,
} from "@/features/owner/hooks/use-owner-requests";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";
import type {
  OwnerTransferRequest,
  TransferRequestStatus,
} from "@/types/owner";

/**
 * Owner · Transfer Requests — manage incoming transfer requests on
 * lands the caller currently owns.
 *
 * Page composition mirrors the admin moderation surfaces so the
 * visual language stays consistent:
 *   • PageHeader              — title + subtitle + Refresh
 *   • RequestsCard            — table with loading / empty / error
 *                                states; chrome stays mounted so the
 *                                layout never reflows
 *   • RequestActionDialog     — one dialog driven by `pending` state,
 *                                handles both approve and reject
 *
 * Mutations are optimistic (`use-owner-requests.ts`): the status
 * badge flips the instant the owner confirms. Rollback on failure.
 *
 * The route is wrapped by `app/owner/layout.tsx` (ProtectedRoute
 * roles=[OWNER] + DashboardShell) — no chrome needed here.
 */

/* ------------------------------- page root ------------------------------- */

type ActionMode = "approve" | "reject";

interface PendingAction {
  mode: ActionMode;
  request: OwnerTransferRequest;
}

export default function OwnerTransferRequestsPage() {
  const query = useOwnerTransferRequests();
  const requests = query.data?.requests ?? [];
  const [pending, setPending] = React.useState<PendingAction | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        count={query.data?.count ?? 0}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      <RequestsCard
        query={query}
        requests={requests}
        onApprove={(request) => setPending({ mode: "approve", request })}
        onReject={(request) => setPending({ mode: "reject", request })}
      />

      <RequestActionDialog
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
        <span className="eyebrow">Inbox</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          Transfer requests
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every transfer request on your lands. Action the pending ones —
          approval forwards them to the registrar; rejection requires a
          reason that is shared with the buyer.
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

interface RequestsCardProps {
  query: ReturnType<typeof useOwnerTransferRequests>;
  requests: readonly OwnerTransferRequest[];
  onApprove: (request: OwnerTransferRequest) => void;
  onReject: (request: OwnerTransferRequest) => void;
}

function RequestsCard({
  query,
  requests,
  onApprove,
  onReject,
}: RequestsCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col">
          <span className="eyebrow">Requests</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            Lifecycle history
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
        <RequestsTable
          requests={requests}
          onApprove={onApprove}
          onReject={onReject}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------- Table --------------------------------- */

interface RequestsTableProps {
  requests: readonly OwnerTransferRequest[];
  onApprove: (request: OwnerTransferRequest) => void;
  onReject: (request: OwnerTransferRequest) => void;
}

function RequestsTable({
  requests,
  onApprove,
  onReject,
}: RequestsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
            <Th>Buyer</Th>
            <Th>Email</Th>
            <Th>Plot</Th>
            <Th>Location</Th>
            <Th>Requested</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map((request) => (
            <RequestRow
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

function RequestRow({
  request,
  onApprove,
  onReject,
}: {
  request: OwnerTransferRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  // Per the controller's enforcement, the owner can only act on rows
  // in `buyer_requested`. Everything else is read-only history on this
  // surface; gating the buttons here mirrors that policy so the user
  // never gets a 400 after a click.
  const isActionable = request.status === "buyer_requested";

  return (
    <tr className="transition-colors duration-hover hover:bg-brand-100/40">
      <Td>
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {request.buyer.name}
          </span>
          {request.buyerWalletAddress ? (
            <span className="font-chain text-[11px] text-muted-foreground">
              {shortAddress(request.buyerWalletAddress)}
            </span>
          ) : null}
        </div>
      </Td>
      <Td className="text-foreground">{request.buyer.email}</Td>
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
        <StatusBadge
          status={request.status}
          reason={request.rejectionReason}
        />
      </Td>
      <Td className="text-right">
        <div className="inline-flex items-center gap-2">
          <Button
            size="sm"
            variant="accent"
            onClick={onApprove}
            disabled={!isActionable}
            title={
              isActionable
                ? undefined
                : "Only pending requests can be approved"
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
            disabled={!isActionable}
            title={
              isActionable
                ? undefined
                : "Only pending requests can be rejected"
            }
            className={cn(
              "gap-1.5",
              isActionable &&
                "text-destructive hover:bg-destructive/10 hover:text-destructive",
            )}
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            Reject
          </Button>
        </div>
      </Td>
    </tr>
  );
}

/* ------------------------------- Sub-cells ------------------------------- */

const STATUS_VARIANT: Record<TransferRequestStatus, BadgeProps["variant"]> = {
  buyer_requested: "pending",
  owner_approved: "info",
  admin_approved: "info",
  rejected: "destructive",
  completed: "success",
};

const STATUS_LABEL: Record<TransferRequestStatus, string> = {
  buyer_requested: "Pending",
  owner_approved: "Owner approved",
  admin_approved: "Admin processing",
  rejected: "Rejected",
  completed: "Completed",
};

function StatusBadge({
  status,
  reason,
}: {
  status: TransferRequestStatus;
  reason: string | null;
}) {
  // Surface the rejection reason via title-tooltip so the owner can
  // recall WHY they (or the admin) rejected the request without leaving
  // the page.
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      title={status === "rejected" && reason ? reason : undefined}
    >
      {STATUS_LABEL[status]}
    </Badge>
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
            <div className="skeleton h-6 w-20 rounded-full" />
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
        No requests yet
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Once a buyer requests to acquire one of your lands, the request
        will appear here for your review.
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
          Couldn’t load your requests
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

interface RequestActionDialogProps {
  pending: PendingAction | null;
  onClose: () => void;
}

/**
 * Single dialog driven by `pending` state — `mode === "reject"` shows
 * the reason field; approve mode shows a short warning explaining the
 * downstream flow (admin still has to execute the chain leg).
 */
function RequestActionDialog({ pending, onClose }: RequestActionDialogProps) {
  const approve = useApproveOwnerTransferMutation();
  const reject = useRejectOwnerTransferMutation();
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
        await approve.mutateAsync(request._id);
        toast.success("Request approved", {
          description: `${request.buyer.name}'s request on plot ${request.land.plotNumber} is now with the registrar.`,
        });
      } else {
        await reject.mutateAsync({
          requestId: request._id,
          reason: reason.trim(),
        });
        toast.success("Request rejected", {
          description: `${request.buyer.name} will be notified.`,
        });
      }
      onClose();
    } catch (err) {
      toast.error(isApprove ? "Approval failed" : "Rejection failed", {
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
          <DialogTitle>
            {isApprove
              ? "Approve transfer request"
              : "Reject transfer request"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "Approving forwards the request to the registrar. They will execute the on-chain handoff."
              : "The buyer will be notified with the reason you provide below."}
          </DialogDescription>
        </DialogHeader>

        <SummaryCard request={request} />

        {!isApprove ? (
          <div className="space-y-2">
            <Label htmlFor="owner-reject-reason">Reason</Label>
            <Textarea
              id="owner-reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. land is no longer for sale"
              maxLength={500}
              disabled={isPending}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/500 — required, shared with the buyer.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              Approving here is your consent — the chain transfer doesn't
              happen until the registrar executes it. You can't revoke
              approval once the registrar acts.
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
                ? "Approving…"
                : "Approve request"
              : isPending
                ? "Rejecting…"
                : "Reject request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ request }: { request: OwnerTransferRequest }) {
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
