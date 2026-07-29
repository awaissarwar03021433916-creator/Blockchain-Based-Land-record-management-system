import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — small status pill. Variants map to the three lifecycle states
 * Land and TransferRequest share (pending → approved/completed → rejected),
 * plus a neutral "info" for non-status labels.
 *
 * Pending = warning (action required)
 * Approved/Success = brand-500 tint (verified, on-chain)
 * Rejected/Destructive = red (terminal failure)
 * Info = brand-100 (informational, no action)
 */
const badgeVariants = cva(
  cn(
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
    "text-[11px] font-medium uppercase tracking-[0.04em] whitespace-nowrap",
  ),
  {
    variants: {
      variant: {
        pending:
          "border-warning/40 bg-warning/10 text-warning",
        success:
          "border-brand-200 bg-brand-100 text-brand-900",
        destructive:
          "border-destructive/40 bg-destructive/10 text-destructive",
        info:
          "border-brand-200/60 bg-brand-100/70 text-brand-700",
        neutral:
          "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
