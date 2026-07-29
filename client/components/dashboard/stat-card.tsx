import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StatCard — the "headline number" tile used at the top of every
 * dashboard overview.
 *
 * Anatomy:
 *   ┌───────────────────────────────────────┐
 *   │ eyebrow label              [icon chip]│
 *   │ 1,284                                 │
 *   │ ↗ +12.4% vs last month                │
 *   └───────────────────────────────────────┘
 *
 * The component is intentionally dumb: it renders whatever value it's
 * given. Formatting (locale, currency, units) and data-fetching live
 * upstream so the same tile renders identically against live API data
 * and the dummy values used while the surface is still being built.
 */

export type StatTone = "neutral" | "positive" | "warning";

export interface StatCardProps {
  label: string;
  /** The headline value. Already-formatted string (e.g. "1,284", "₨ 12,500"). */
  value: string | number;
  icon: LucideIcon;
  /** Optional supporting line under the value. */
  hint?: string;
  /** Optional trend chip: +12.4% or -3 etc. */
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  /**
   * Tone drives the icon chip color. Use:
   *  • "neutral"  — informational (default)
   *  • "positive" — success / verified-flavored stat
   *  • "warning"  — attention-required stat (e.g. pending queue size)
   */
  tone?: StatTone;
  className?: string;
}

const toneClasses: Record<StatTone, { chip: string; chipIcon: string }> = {
  neutral: {
    chip: "bg-brand-100",
    chipIcon: "text-brand-700",
  },
  positive: {
    chip: "bg-brand-500/15",
    chipIcon: "text-brand-700",
  },
  warning: {
    chip: "bg-warning/15",
    chipIcon: "text-warning",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "neutral",
  className,
}: StatCardProps) {
  const tones = toneClasses[tone];
  const TrendIcon = trend?.direction === "down" ? ArrowDownRight : ArrowUpRight;
  const trendColor =
    trend?.direction === "down"
      ? "text-destructive bg-destructive/10"
      : "text-brand-700 bg-brand-100";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card p-5",
        "shadow-sm transition-shadow duration-hover hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">{label}</span>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            tones.chip,
          )}
          aria-hidden
        >
          <Icon className={cn("h-4 w-4", tones.chipIcon)} />
        </span>
      </div>

      <div className="mt-3 font-serif text-3xl font-semibold tracking-tight text-brand-900">
        {value}
      </div>

      {(hint || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                trendColor,
              )}
            >
              <TrendIcon className="h-3 w-3" aria-hidden />
              {trend.value}
            </span>
          ) : null}
          {hint ? <span className="truncate">{hint}</span> : null}
        </div>
      )}

      {/* Decorative bottom accent — only on the positive tone, signals
          "this stat reflects something verified." */}
      {tone === "positive" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-brand-500/0 via-brand-500 to-brand-500/0"
        />
      ) : null}
    </div>
  );
}

/* ----------------------------- Skeleton ---------------------------------- */

/**
 * Skeleton variant — same outer dimensions and rhythm as `StatCard` so
 * the layout doesn't reflow when real data arrives.
 *
 * Uses the `.skeleton` utility from globals.css (shimmer animation +
 * brand-tinted gradient) on each placeholder block.
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading metric"
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="skeleton h-3 w-24" />
        <span className="skeleton h-9 w-9 rounded-md" />
      </div>
      <div className="mt-3 skeleton h-8 w-20" />
      <div className="mt-2 skeleton h-3 w-32" />
    </div>
  );
}

/* --------------------------- Error variant ------------------------------- */

/**
 * Error variant — drop-in replacement when the stats query fails. Keeps
 * the dashboard grid intact instead of leaving a hole, while making the
 * failure visible. The caller passes a retry handler (typically
 * `query.refetch`) and an optional message.
 */
export interface StatCardErrorProps {
  label: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function StatCardError({
  label,
  message = "Failed to load",
  onRetry,
  className,
}: StatCardErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-5",
        "shadow-sm",
        className,
      )}
    >
      <span className="eyebrow text-destructive/80">{label}</span>
      <div className="font-serif text-base font-semibold leading-snug text-destructive">
        {message}
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "mt-1 inline-flex w-fit items-center text-xs font-medium text-destructive underline-offset-2",
            "hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
          )}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
