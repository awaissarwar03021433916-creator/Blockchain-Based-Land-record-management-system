"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileX,
  Inbox,
  MessageSquare,
  RefreshCw,
  Store,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { useBuyerTransferRequests } from "@/features/buyer/buyer-hooks";
import type { BuyerTransferRequest } from "@/features/buyer/buyer-types";
import { getDisplayMessage } from "@/lib/api/error";
import { cn } from "@/lib/utils";
import type { TransferRequestStatus } from "@/types/owner";

/**
 * Buyer · My Requests — every transfer request the caller has filed, across
 * the full 5-state lifecycle, filterable by status.
 *
 * Read-only surface: a buyer can't action their own requests (the owner and
 * registrar drive the transitions), so there's no action column — just a
 * filterable lifecycle view.
 *
 * Responsive: a full table on md+, and a stacked card list on mobile (the
 * same data, reshaped) so the surface never relies on horizontal scrolling
 * on small screens.
 *
 * Composition mirrors the owner/admin moderation surfaces + the buyer
 * history page for a consistent visual language:
 *   • PageHeader   — title + subtitle + Refresh + count
 *   • FilterTabs   — one chip per lifecycle status (+ All) with live counts
 *   • RequestsCard — table / mobile list with loading / empty / error states
 *
 * The route is wrapped by `app/buyer/layout.tsx` (ProtectedRoute
 * roles=[BUYER] + DashboardShell) — no page chrome needed here.
 */

/* --------------------------- status presentation ------------------------- */

const STATUS_VARIANT: Record<TransferRequestStatus, BadgeProps["variant"]> = {
  buyer_requested: "pending",
  owner_approved: "info",
  admin_approved: "info",
  rejected: "destructive",
  completed: "success",
};

const STATUS_LABEL: Record<TransferRequestStatus, string> = {
  buyer_requested: "Pending",
  owner_approved: "Owner Approved",
  admin_approved: "Admin Approved",
  rejected: "Rejected",
  completed: "Completed",
};

/* ------------------------------- filtering ------------------------------- */

type Filter = "all" | TransferRequestStatus;

// One tab per lifecycle status (+ All), in the order a request moves through
// the flow. Maps 1:1 to the requested groups (Pending Requests · Owner
// Approved · Owner Rejected · Admin Approved · Completed Transfers).
const FILTER_ORDER: readonly Filter[] = [
  "all",
  "buyer_requested",
  "owner_approved",
  "rejected",
  "admin_approved",
  "completed",
];

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  ...STATUS_LABEL,
};

/* -------------------------------- page ----------------------------------- */

export default function BuyerRequestsPage() {
  const query = useBuyerTransferRequests();
  const requests = React.useMemo(() => query.data?.requests ?? [], [query.data]);

  const [filter, setFilter] = React.useState<Filter>("all");

  const counts = React.useMemo(() => {
    const base: Record<Filter, number> = {
      all: requests.length,
      buyer_requested: 0,
      owner_approved: 0,
      admin_approved: 0,
      rejected: 0,
      completed: 0,
    };
    for (const r of requests) base[r.status] += 1;
    return base;
  }, [requests]);

  const visible = React.useMemo(
    () =>
      filter === "all"
        ? requests
        : requests.filter((r) => r.status === filter),
    [requests, filter],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        count={query.data?.count ?? 0}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
      />

      {query.isSuccess && requests.length > 0 ? (
        <FilterTabs active={filter} counts={counts} onChange={setFilter} />
      ) : null}

      <RequestsCard
        query={query}
        requests={requests}
        visible={visible}
        filter={filter}
      />
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
        <span className="eyebrow">Activity</span>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
          My requests
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every transfer request you’ve filed, from the owner’s review through
          the registrar’s on-chain handoff. Follow each one as it moves through
          verification.
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

/* ------------------------------ filter tabs ------------------------------ */

interface FilterTabsProps {
  active: Filter;
  counts: Record<Filter, number>;
  onChange: (filter: Filter) => void;
}

function FilterTabs({ active, counts, onChange }: FilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter requests by status"
      className="flex flex-wrap items-center gap-2"
    >
      {FILTER_ORDER.map((f) => {
        const isActive = f === active;
        return (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(f)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "border-brand-700 bg-brand-700 text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-brand-100 hover:text-brand-900",
            )}
          >
            {FILTER_LABEL[f]}
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {counts[f]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ card wrapper ----------------------------- */

interface RequestsCardProps {
  query: ReturnType<typeof useBuyerTransferRequests>;
  requests: readonly BuyerTransferRequest[];
  visible: readonly BuyerTransferRequest[];
  filter: Filter;
}

function RequestsCard({ query, requests, visible, filter }: RequestsCardProps) {
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
      {query.isSuccess && requests.length > 0 && visible.length === 0 ? (
        <NoFilterState filter={filter} />
      ) : null}
      {query.isSuccess && visible.length > 0 ? (
        <>
          {/* Desktop / tablet: full table */}
          <RequestsTable requests={visible} />
          {/* Mobile: stacked cards */}
          <MobileList requests={visible} />
        </>
      ) : null}
    </div>
  );
}

/* --------------------------------- table --------------------------------- */

function RequestsTable({
  requests,
}: {
  requests: readonly BuyerTransferRequest[];
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
            <Th>Plot number</Th>
            <Th>Location</Th>
            <Th>Current owner</Th>
            <Th>Request date</Th>
            <Th>Status</Th>
            <Th>Last updated</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map((request) => (
            <RequestRow key={request._id} request={request} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestRow({ request }: { request: BuyerTransferRequest }) {
  return (
    <tr className="transition-colors duration-hover hover:bg-brand-100/40">
      <Td className="font-chain text-foreground">
        <span className="inline-flex items-center gap-1.5">
          {request.land.plotNumber}
          <MessageIndicator message={request.requestMessage} />
        </span>
      </Td>
      <Td
        className="max-w-[240px] truncate text-foreground"
        title={request.land.location}
      >
        {request.land.location}
      </Td>
      <Td>
        <OwnerCell request={request} />
      </Td>
      <Td className="whitespace-nowrap text-muted-foreground">
        {formatDate(request.createdAt)}
      </Td>
      <Td>
        <StatusBadge status={request.status} reason={request.rejectionReason} />
      </Td>
      <Td className="whitespace-nowrap text-muted-foreground">
        {formatDate(request.updatedAt)}
      </Td>
    </tr>
  );
}

/* ------------------------------ mobile list ------------------------------ */

function MobileList({
  requests,
}: {
  requests: readonly BuyerTransferRequest[];
}) {
  return (
    <ul className="divide-y divide-border md:hidden">
      {requests.map((request) => (
        <li key={request._id} className="p-4">
          <MobileCard request={request} />
        </li>
      ))}
    </ul>
  );
}

function MobileCard({ request }: { request: BuyerTransferRequest }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="inline-flex items-center gap-1.5 font-chain text-sm font-medium text-foreground">
            {request.land.plotNumber}
            <MessageIndicator message={request.requestMessage} />
          </span>
          <span
            className="truncate text-sm text-muted-foreground"
            title={request.land.location}
          >
            {request.land.location}
          </span>
        </div>
        <StatusBadge status={request.status} reason={request.rejectionReason} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <MobileField label="Current owner">
          <span className="text-foreground">{request.currentOwner.name}</span>
          <span className="block truncate text-muted-foreground">
            {request.currentOwner.email}
          </span>
        </MobileField>
        <MobileField label="Request date">
          {formatDate(request.createdAt)}
        </MobileField>
        <MobileField label="Last updated">
          {formatDate(request.updatedAt)}
        </MobileField>
      </dl>
    </div>
  );
}

function MobileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

/* ------------------------------- sub-cells ------------------------------- */

function OwnerCell({ request }: { request: BuyerTransferRequest }) {
  return (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">
        {request.currentOwner.name}
      </span>
      <span className="text-xs text-muted-foreground">
        {request.currentOwner.email}
      </span>
    </div>
  );
}

function MessageIndicator({ message }: { message: string }) {
  if (!message) return null;
  return (
    <span className="inline-flex" title={message} aria-label="You added a message">
      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
    </span>
  );
}

function StatusBadge({
  status,
  reason,
}: {
  status: TransferRequestStatus;
  reason: string | null;
}) {
  // The rejection reason is context the buyer can't see elsewhere — surface
  // it via a title-tooltip on the badge.
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

/* -------------------------- state sub-components ------------------------- */

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading requests" className="p-5">
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
            <div className="skeleton h-6 w-24 rounded-full" />
            <div className="skeleton h-3 w-20" />
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
        When you request a land from the marketplace, it’ll appear here so you
        can track its progress.
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

function NoFilterState({ filter }: { filter: Filter }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100"
        aria-hidden
      >
        <Inbox className="h-5 w-5 text-brand-700" />
      </span>
      <h3 className="text-base font-semibold text-foreground">
        No {FILTER_LABEL[filter].toLowerCase()} requests
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        You have no requests in this category right now.
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
