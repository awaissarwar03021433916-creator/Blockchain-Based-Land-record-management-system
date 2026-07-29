"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  FileX,
  Landmark,
  Link2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  PackageSearch,
  Ruler,
  Send,
  ShieldCheck,
  Tag,
  User as UserIcon,
  Wallet,
} from "lucide-react";
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
import { ROUTES } from "@/config/routes";
import {
  useMarketplaceLand,
  useRequestTransfer,
} from "@/features/buyer/buyer-hooks";
import type { MarketplaceLand } from "@/features/buyer/buyer-types";
import type { SaleListingState } from "@/types/owner";
import { getDisplayMessage } from "@/lib/api/error";
import { shortAddress } from "@/lib/blockchain/address";
import { cn } from "@/lib/utils";

/**
 * Marketplace · Land detail — the per-property page (`/marketplace/[id]`).
 *
 * Reads a single land out of the marketplace cache via `useMarketplaceLand`
 * (there is no dedicated detail endpoint — the hook shares the list query
 * and `select`s by land id). The page surfaces the full registry record,
 * the verified owner, the on-chain receipt, and the listing metadata, and
 * lets a buyer file a transfer request via `useRequestTransfer`.
 *
 * This route has no dashboard shell, so the page carries its own chrome
 * (back link + container). It is the only buyer surface implemented here —
 * the buyer dashboard and "my requests" pages are built separately.
 *
 * State matrix mirrors the listing page:
 *   waiting-for-buyer · loading · error · not-found · detail
 */

export default function MarketplaceLandPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const query = useMarketplaceLand(id);
  const land = query.data;

  // The query is gated to the buyer role; a disabled query stays
  // `pending` + `idle` forever, so we show a sign-in notice rather than a
  // perpetual skeleton (same guard as the listing page).
  const isWaitingForBuyer = query.isPending && query.fetchStatus === "idle";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <BackLink />

      {isWaitingForBuyer ? (
        <UnavailableState />
      ) : query.isPending ? (
        <DetailSkeleton />
      ) : query.isError ? (
        <ErrorState
          message={getDisplayMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : !land ? (
        <NotFoundState />
      ) : (
        <LandDetail land={land} />
      )}
    </main>
  );
}

/* -------------------------------- chrome --------------------------------- */

function BackLink() {
  return (
    <Link
      href={ROUTES.MARKETPLACE}
      className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back to marketplace
    </Link>
  );
}

/* ------------------------------ detail body ------------------------------ */

function LandDetail({ land }: { land: MarketplaceLand }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col gap-6"
    >
      <DetailHeader land={land} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column ---------------------------------------------------- */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <LandInfoCard land={land} />
          <BlockchainCard land={land} />
          <ListingCard land={land} />
        </div>

        {/* Action aside (sticky on desktop) ------------------------------ */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-8">
            <ActionCard land={land} />
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function DetailHeader({ land }: { land: MarketplaceLand }) {
  return (
    <header className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white shadow-sm sm:p-8">
      <Landmark
        className="absolute -right-6 -top-6 h-40 w-40 text-white/10"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 font-chain text-xs font-medium text-brand-900 shadow-sm backdrop-blur">
          {land.plotNumber}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {land.location}
        </h1>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-brand-900 shadow-sm backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden />
            Verified on-chain
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-brand-900 shadow-sm backdrop-blur">
            <Tag className="h-3.5 w-3.5" aria-hidden />
            Listed for sale
          </span>
        </div>
      </div>
    </header>
  );
}

/* --------------------------------- cards --------------------------------- */

function SectionCard({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-100 text-brand-700"
          aria-hidden
        >
          {icon}
        </span>
        <div className="flex flex-col">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            {title}
          </h2>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function LandInfoCard({ land }: { land: MarketplaceLand }) {
  return (
    <SectionCard
      eyebrow="Registry record"
      title="Land information"
      icon={<MapPin className="h-5 w-5" />}
    >
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <DefRow icon={<Landmark className="h-4 w-4" />} label="Plot number">
          <span className="font-chain text-foreground">{land.plotNumber}</span>
        </DefRow>
        <DefRow icon={<Ruler className="h-4 w-4" />} label="Area">
          {land.area}
        </DefRow>
        <DefRow
          icon={<MapPin className="h-4 w-4" />}
          label="Location"
          className="sm:col-span-2"
        >
          {land.location}
        </DefRow>
        <DefRow icon={<ShieldCheck className="h-4 w-4" />} label="Registry status">
          <Badge variant="success">Approved</Badge>
        </DefRow>
        <DefRow icon={<CalendarClock className="h-4 w-4" />} label="Registered">
          {formatDate(land.createdAt)}
        </DefRow>
      </dl>
    </SectionCard>
  );
}

function BlockchainCard({ land }: { land: MarketplaceLand }) {
  return (
    <SectionCard
      eyebrow="Provenance"
      title="Blockchain record"
      icon={<Link2 className="h-5 w-5" />}
    >
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4">
        <DefRow icon={<FileText className="h-4 w-4" />} label="Registration tx hash">
          {land.transactionHash ? (
            <span
              className="font-chain text-sm text-foreground"
              title={land.transactionHash}
            >
              {shortAddress(land.transactionHash)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              Not yet recorded
            </span>
          )}
        </DefRow>
      </dl>
      <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        This plot was registered on-chain by the land registry. The transaction
        hash above is the immutable receipt of that registration.
      </p>
    </SectionCard>
  );
}

function ListingCard({ land }: { land: MarketplaceLand }) {
  return (
    <SectionCard
      eyebrow="Marketplace"
      title="Listing information"
      icon={<Tag className="h-5 w-5" />}
    >
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <DefRow icon={<Tag className="h-4 w-4" />} label="Listing status">
          <ListingStateBadge state={land.listing.state} />
        </DefRow>
        <DefRow icon={<CalendarClock className="h-4 w-4" />} label="Listed on">
          {formatDate(land.listing.listedAt)}
        </DefRow>
        {land.listing.approvedAt ? (
          <DefRow
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Approved on"
          >
            {formatDate(land.listing.approvedAt)}
          </DefRow>
        ) : null}
      </dl>
    </SectionCard>
  );
}

/* ------------------------------ action aside ----------------------------- */

function ActionCard({ land }: { land: MarketplaceLand }) {
  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 shadow-sm">
      {/* Owner ----------------------------------------------------------- */}
      <div className="flex flex-col gap-3">
        <span className="eyebrow">Listed by</span>
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"
            aria-hidden
          >
            <UserIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground" title={land.owner.name}>
              {land.owner.name}
            </p>
            <p
              className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"
              title={land.owner.email}
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {land.owner.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2">
          <Wallet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span
            className="truncate font-chain text-xs text-foreground"
            title={land.owner.walletAddress}
          >
            {land.owner.walletAddress
              ? shortAddress(land.owner.walletAddress)
              : "No wallet on file"}
          </span>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Request transfer ------------------------------------------------ */}
      <RequestTransferControl land={land} />
    </div>
  );
}

/**
 * Owns the request-transfer mutation + dialog. Kept self-contained so the
 * surrounding detail layout stays presentational.
 *
 * `done` flips to true on a successful submission so the buyer gets a
 * persistent confirmation within the session (the request now lives on the
 * "My Requests" surface). A page refetch / remount resets it — the source
 * of truth is the server, not this flag.
 */
function RequestTransferControl({ land }: { land: MarketplaceLand }) {
  const mutation = useRequestTransfer();
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [done, setDone] = React.useState(false);

  const isListed = land.listing.state === "listed_for_sale";

  React.useEffect(() => {
    if (open) setMessage("");
  }, [open]);

  async function handleConfirm() {
    try {
      await mutation.mutateAsync({
        landId: land._id,
        requestMessage: message.trim() || undefined,
      });
      setDone(true);
      setOpen(false);
      toast.success("Transfer request submitted", {
        description: `Your request for plot ${land.plotNumber} is now awaiting the owner's review.`,
      });
    } catch (err) {
      toast.error("Couldn’t submit request", {
        description: getDisplayMessage(err),
      });
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-brand-200 bg-brand-100/60 p-4 text-center">
        <CheckCircle2 className="h-6 w-6 text-brand-700" aria-hidden />
        <p className="text-sm font-medium text-brand-900">Request submitted</p>
        <p className="text-xs text-muted-foreground">
          Track its progress on your requests page.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-1 gap-1.5">
          <Link href={ROUTES.BUYER_REQUESTS}>
            View my requests
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        className="w-full gap-2"
        disabled={!isListed}
        onClick={() => setOpen(true)}
        title={isListed ? undefined : "This land is not currently listed for sale"}
      >
        <Send className="h-4 w-4" aria-hidden />
        Request transfer
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        The owner reviews your request before the registrar executes the
        on-chain transfer.
      </p>

      <RequestDialog
        land={land}
        open={open}
        onOpenChange={(next) => {
          if (!mutation.isPending) setOpen(next);
        }}
        message={message}
        onMessageChange={setMessage}
        isPending={mutation.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function RequestDialog({
  land,
  open,
  onOpenChange,
  message,
  onMessageChange,
  isPending,
  onConfirm,
}: {
  land: MarketplaceLand;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  onMessageChange: (value: string) => void;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request this land</DialogTitle>
          <DialogDescription>
            You’re requesting plot {land.plotNumber} in {land.location}. Add an
            optional note for the owner — they’ll see it with your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="request-message">Message (optional)</Label>
          <Textarea
            id="request-message"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="e.g. I'm a serious buyer and can complete quickly."
            maxLength={500}
            disabled={isPending}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            {message.trim().length}/500
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-brand-200 bg-brand-100/50 p-3 text-xs text-brand-900">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
          <span>
            The transfer executes to the wallet on your profile. Make sure it’s
            correct before requesting — it’s snapshotted when you submit.
          </span>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending} className="gap-1.5">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            {isPending ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- sub-cells ------------------------------- */

function DefRow({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
        <span className="text-muted-foreground/80" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

const LISTING_STATE_VARIANT: Record<SaleListingState, BadgeProps["variant"]> = {
  pending_sale_approval: "pending",
  listed_for_sale: "success",
  sold: "info",
  not_for_sale: "neutral",
};

const LISTING_STATE_LABEL: Record<SaleListingState, string> = {
  pending_sale_approval: "Pending approval",
  listed_for_sale: "Listed for sale",
  sold: "Sold",
  not_for_sale: "Not for sale",
};

function ListingStateBadge({ state }: { state: SaleListingState }) {
  return (
    <Badge variant={LISTING_STATE_VARIANT[state]}>
      {LISTING_STATE_LABEL[state]}
    </Badge>
  );
}

/* ---------------------------- state components --------------------------- */

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading land" className="flex flex-col gap-6">
      <div className="skeleton h-40 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm"
            >
              <div className="skeleton h-4 w-1/3" />
              <div className="grid grid-cols-2 gap-4">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton h-11 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

function StatePanel({
  icon,
  tone = "brand",
  title,
  children,
}: {
  icon: React.ReactNode;
  tone?: "brand" | "destructive";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "destructive" ? "alert" : "status"}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card py-16 text-center shadow-sm"
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          tone === "destructive"
            ? "bg-destructive/10 text-destructive"
            : "bg-brand-100 text-brand-700",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <div className="mx-auto max-w-sm text-sm text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function UnavailableState() {
  return (
    <StatePanel icon={<Lock className="h-5 w-5" />} title="Buyer access required">
      <p>Sign in with a buyer account to view this listing and request a transfer.</p>
      <Button asChild size="sm" className="mt-4 gap-1.5">
        <Link href={ROUTES.LOGIN}>
          Sign in
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </Button>
    </StatePanel>
  );
}

function NotFoundState() {
  return (
    <StatePanel
      icon={<PackageSearch className="h-5 w-5" />}
      title="Listing not available"
    >
      <p>
        This land isn’t currently listed for sale. It may have been sold,
        delisted, or never existed.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-4 gap-1.5">
        <Link href={ROUTES.MARKETPLACE}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to marketplace
        </Link>
      </Button>
    </StatePanel>
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
    <StatePanel
      icon={<FileX className="h-5 w-5" />}
      tone="destructive"
      title="Couldn’t load this listing"
    >
      <p>{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
        Try again
      </Button>
    </StatePanel>
  );
}

/* -------------------------------- helpers -------------------------------- */

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FORMAT.format(d);
}
