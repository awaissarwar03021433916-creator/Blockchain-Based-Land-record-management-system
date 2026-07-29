import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ActivityFeed — vertical timeline of recent events shown on every
 * dashboard overview (admin, owner, buyer).
 *
 * Built as a presentational primitive: the consumer hands it a list of
 * already-shaped `ActivityItem` records (icon, title, meta, timestamp,
 * tone). No API calls, no data shaping, no relative-time logic — that
 * lives upstream so the same component renders identically against
 * dummy data, paginated history, and the live feed once it's wired up.
 */

export type ActivityTone = "neutral" | "success" | "warning" | "info";

export interface ActivityItem {
  id: string;
  title: string;
  /** Short context line under the title (e.g. "Plot LR-2031 · Karachi"). */
  meta?: string;
  /**
   * Human-readable timestamp (e.g. "2h ago", "Mar 4"). Already formatted —
   * the feed doesn't know about time zones.
   */
  timestamp: string;
  icon: LucideIcon;
  tone?: ActivityTone;
}

export interface ActivityFeedProps {
  items: readonly ActivityItem[];
  /** Rendered when items is empty. Defaults to a neutral placeholder. */
  emptyState?: React.ReactNode;
  className?: string;
}

const toneClasses: Record<ActivityTone, { chip: string; icon: string }> = {
  neutral: { chip: "bg-muted", icon: "text-muted-foreground" },
  success: { chip: "bg-brand-500/15", icon: "text-brand-700" },
  warning: { chip: "bg-warning/15", icon: "text-warning" },
  info: { chip: "bg-brand-100", icon: "text-brand-700" },
};

export function ActivityFeed({
  items,
  emptyState,
  className,
}: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-10 text-center",
          className,
        )}
      >
        {emptyState ?? <DefaultEmpty />}
      </div>
    );
  }

  return (
    <ol className={cn("space-y-1", className)}>
      {items.map((item) => (
        <li key={item.id}>
          <ActivityRow item={item} />
        </li>
      ))}
    </ol>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.icon;
  const tones = toneClasses[item.tone ?? "neutral"];

  return (
    <div className="flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors duration-hover hover:bg-brand-100/40">
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          tones.chip,
        )}
        aria-hidden
      >
        <Icon className={cn("h-4 w-4", tones.icon)} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {item.title}
        </div>
        {item.meta ? (
          <div className="truncate text-xs text-muted-foreground">
            {item.meta}
          </div>
        ) : null}
      </div>

      <time className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        {item.timestamp}
      </time>
    </div>
  );
}

function DefaultEmpty() {
  return (
    <>
      <Clock className="h-5 w-5 text-muted-foreground" aria-hidden />
      <span className="text-sm font-medium text-foreground">
        No recent activity
      </span>
      <span className="text-xs text-muted-foreground">
        New events will appear here as they happen.
      </span>
    </>
  );
}
