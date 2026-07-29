import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class names with conflict resolution.
 *
 * `clsx` handles conditional inputs; `tailwind-merge` resolves conflicts so
 * that the LAST class wins (e.g. `cn("px-4", isLarge && "px-8")` → `"px-8"`).
 * Naive joiners that omit `twMerge` silently keep both classes and the order
 * of CSS in the stylesheet — not the call site — decides the winner.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
