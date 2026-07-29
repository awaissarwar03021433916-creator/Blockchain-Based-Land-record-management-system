"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileX,
  Loader2,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { qk } from "@/config/query-keys";
import { ROUTES } from "@/config/routes";
import { useOwnerLands } from "@/features/owner/hooks/use-owner-lands";
import { api } from "@/lib/api/client";
import {
  ChainError,
  ConflictError,
  NotFoundError,
  PermissionError,
  ValidationError,
  getDisplayMessage,
} from "@/lib/api/error";
import { cn } from "@/lib/utils";
import type { OwnerLand, OwnerListing } from "@/types/owner";

/**
 * Owner · List Land For Sale — confirmation surface that turns an
 * already-registered Land into a submitted SaleListing.
 *
 * The page loads the land via the existing `useOwnerLands` cache (the
 * user typically arrives here from /owner/lands, so the data is
 * usually already in memory). The submit handler calls the verified
 * sale-listing endpoint, which cross-checks JWT + MongoDB + chain
 * ownership before flipping the row into `pending_sale_approval`.
 *
 * The data layer is intentionally co-located in this file rather than
 * lifted into the standard `features/owner/services/...` + hooks
 * pattern — this prompt scoped the work to "the missing page". If a
 * second consumer of the listing mutation appears later, extracting
 * `useListLandForSaleMutation` and the underlying service into the
 * established locations is mechanical.
 *
 * The route is wrapped by `app/owner/layout.tsx` (ProtectedRoute
 * roles=[OWNER] + DashboardShell).
 */

/* ----------------------------- types / api ------------------------------- */

interface SubmitListingResponse {
  message: string;
  listing: OwnerListing;
}

/**
 * `POST /api/land/submit` — VERIFIED SALE LISTING endpoint.
 *
 * Body shape mirrors `validateLandListing`: only plotNumber + location
 * (no area). The backend identifies the land by its (plot, location)
 * coordinates and rejects if the caller doesn't own it on all three
 * sources of truth (JWT / Mongo / chain).
 */
async function submitListing(args: {
  plotNumber: string;
  location: string;
}): Promise<SubmitListingResponse> {
  return api.post<SubmitListingResponse>("/api/land/submit", args);
}

/* ------------------------------- page root ------------------------------- */

export default function OwnerListLandForSalePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const landId = params.id;

  const query = useOwnerLands();
  const land = React.useMemo(
    () => query.data?.lands.find((l) => l._id === landId) ?? null,
    [query.data, landId],
  );

  const mutation = useMutation<
    SubmitListingResponse,
    Error,
    { plotNumber: string; location: string }
  >({
    mutationFn: submitListing,
    onSuccess: () => {
      // The new pending listing belongs on the listings page; refresh
      // it so the row is present the moment the redirect lands.
      void qc.invalidateQueries({ queryKey: qk.owner.myListings });
    },
  });

  async function handleSubmit() {
    if (!land) return;
    try {
      await mutation.mutateAsync({
        plotNumber: land.plotNumber,
        location: land.location,
      });
      toast.success("Submitted for sale", {
        description:
          "Awaiting admin moderation — track its progress in Sale listings.",
      });
      router.push(ROUTES.OWNER_LISTINGS);
    } catch (err) {
      handleSubmitError(err);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader landId={landId} />

      {query.isPending ? <LoadingCard /> : null}
      {query.isError ? (
        <ErrorCard
          message={getDisplayMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && !land ? <NotFoundCard /> : null}
      {query.isSuccess && land ? (
        <ConfirmationCard
          land={land}
          isSubmitting={mutation.isPending}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

/* ----------------------------- subviews --------------------------------- */

function PageHeader({ landId }: { landId: string | undefined }) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={landId ? ROUTES.MARKETPLACE_LAND(landId) : ROUTES.OWNER_LANDS}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm transition-colors",
            "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to land
        </Link>
      </div>
      <span className="eyebrow">Marketplace</span>
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
        List this land for sale
      </h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Confirm the plot you want to put on the marketplace. The
        submission goes through admin moderation before it goes live.
      </p>
    </header>
  );
}

interface ConfirmationCardProps {
  land: OwnerLand;
  isSubmitting: boolean;
  onSubmit: () => void;
}

function ConfirmationCard({
  land,
  isSubmitting,
  onSubmit,
}: ConfirmationCardProps) {
  // Backend's `listLandForSale` controller rejects anything that isn't
  // in `approved` state. Mirroring that here prevents a 400 after a
  // click and clarifies WHY the submit is disabled.
  const isEligible = land.status === "approved";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <span className="eyebrow">Confirm</span>
        <h2 className="text-lg font-semibold tracking-tight text-brand-900">
          Submit for sale
        </h2>
      </div>

      <div className="space-y-5 p-5">
        <LandSummary land={land} />

        {isEligible ? (
          <SubmissionNotice />
        ) : (
          <IneligibleNotice land={land} />
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isSubmitting}
            asChild
          >
            <Link href={ROUTES.OWNER_LANDS}>Cancel</Link>
          </Button>
          <Button
            type="button"
            variant="accent"
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting || !isEligible}
            className="gap-2"
            title={
              isEligible
                ? undefined
                : "Only approved (on-chain) lands can be listed for sale"
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Submitting…
              </>
            ) : (
              <>
                <Tag className="h-4 w-4" aria-hidden />
                Submit for sale
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LandSummary({ land }: { land: OwnerLand }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Plot</dt>
        <dd className="font-chain text-foreground">{land.plotNumber}</dd>

        <dt className="text-muted-foreground">Location</dt>
        <dd className="truncate text-foreground" title={land.location}>
          {land.location}
        </dd>

        <dt className="text-muted-foreground">Area</dt>
        <dd className="text-foreground">{land.area}</dd>

        <dt className="text-muted-foreground">Status</dt>
        <dd>
          <StatusBadge status={land.status} />
        </dd>
      </dl>
    </div>
  );
}

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

function StatusBadge({ status }: { status: OwnerLand["status"] }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

function SubmissionNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-brand-200 bg-brand-100/60 p-3 text-xs text-brand-900">
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
        aria-hidden
      />
      <div className="space-y-0.5">
        <div className="font-medium">What happens next?</div>
        <p className="leading-relaxed text-brand-900/80">
          The land enters the marketplace queue with state{" "}
          <span className="font-medium">Pending</span>. An administrator
          verifies your ownership against the chain. Once approved, the
          listing becomes <span className="font-medium">Listed</span> and
          buyers can submit transfer requests against it.
        </p>
      </div>
    </div>
  );
}

function IneligibleNotice({ land }: { land: OwnerLand }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden
      />
      <div className="space-y-0.5">
        <div className="font-medium">
          This land can’t be listed yet
        </div>
        <p className="leading-relaxed">
          Only <span className="font-medium">Approved</span> lands (the
          ones already recorded on-chain) can go on the marketplace. This
          land is in status{" "}
          <span className="font-medium">{STATUS_LABEL[land.status]}</span>
          {land.status === "pending"
            ? " — wait for an admin to verify it first."
            : "."}
        </p>
      </div>
    </div>
  );
}

/* -------------------------- State sub-components ------------------------- */

function LoadingCard() {
  return (
    <div
      role="status"
      aria-label="Loading land"
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="space-y-3">
        <div className="skeleton h-4 w-1/4" />
        <div className="skeleton h-32 w-full rounded-md" />
        <div className="flex justify-end gap-2">
          <div className="skeleton h-10 w-24 rounded-md" />
          <div className="skeleton h-10 w-40 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-8 text-center shadow-sm"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"
        aria-hidden
      >
        <FileX className="h-5 w-5 text-destructive" />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          Couldn’t load this land
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function NotFoundCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"
        aria-hidden
      >
        <FileX className="h-5 w-5 text-muted-foreground" />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          Land not found
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This land isn’t in your portfolio. It may have been transferred
          to a new owner, or the link may be stale.
        </p>
      </div>
      <Button size="sm" variant="outline" asChild>
        <Link href={ROUTES.OWNER_LANDS}>Back to my lands</Link>
      </Button>
    </div>
  );
}

/* ------------------------------ error map -------------------------------- */

/**
 * Map an ApiError (or anything thrown by the mutation) onto the most
 * actionable user-facing toast. The classifier in `lib/api/error.ts`
 * has already converted the wire shape into typed subclasses, so this
 * branches on TYPE rather than raw HTTP status.
 */
function handleSubmitError(err: unknown): void {
  if (err instanceof ConflictError) {
    // Backend's "active listing already exists" 409 (also the partial
    // unique index backstop on SaleListing).
    toast.error("Already listed", {
      description:
        "An active listing already exists for this land. Check your listings page.",
    });
    return;
  }
  if (err instanceof PermissionError) {
    // 403 — Mongo-level ownership mismatch.
    toast.error("Ownership check failed", {
      description: err.message,
    });
    return;
  }
  if (err instanceof NotFoundError) {
    // 404 — backend couldn't find the land at plot+location.
    toast.error("Land not found", {
      description:
        "We couldn’t identify this land on the registry — please refresh and try again.",
    });
    return;
  }
  if (err instanceof ChainError) {
    // 502 — on-chain read failed during ownership verification.
    toast.error("Chain verification failed", {
      description:
        err.reason ?? "Couldn’t verify ownership on-chain — try again in a moment.",
    });
    return;
  }
  if (err instanceof ValidationError) {
    // 400 — missing wallet, wrong status, validation array.
    const detail =
      err.errors[0] ?? err.message ?? "Please check the form and try again.";
    toast.error("Couldn’t submit listing", { description: detail });
    return;
  }
  toast.error("Submission failed", { description: getDisplayMessage(err) });
}
