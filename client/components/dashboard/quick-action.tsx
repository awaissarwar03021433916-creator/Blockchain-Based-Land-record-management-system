import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * QuickAction — large clickable tile that links to a primary action
 * surface (e.g. "Review Lands" → /admin/lands).
 *
 * Designed to read as a *destination*, not a button: the whole card is
 * clickable, the icon chip carries the brand color, and the chevron
 * affords navigation. Wrap a row of these in `<QuickActionGroup>` for
 * the standard responsive 1/2/3-column grid.
 */

export interface QuickActionProps {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  className?: string;
}

export function QuickAction({
  label,
  description,
  href,
  icon: Icon,
  className,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-border bg-card p-4",
        "shadow-sm transition-all duration-hover",
        "hover:border-brand-200 hover:bg-brand-100/40 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-md",
          "bg-brand-100 text-brand-700 transition-colors duration-hover",
          "group-hover:bg-brand-500 group-hover:text-white",
        )}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-brand-900">{label}</div>
        <div className="truncate text-xs text-muted-foreground">
          {description}
        </div>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-hover group-hover:translate-x-0.5 group-hover:text-brand-700"
        aria-hidden
      />
    </Link>
  );
}

/**
 * Responsive grid for QuickAction tiles.
 * 1 column on mobile, 2 on sm, 3 on lg.
 */
export function QuickActionGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
