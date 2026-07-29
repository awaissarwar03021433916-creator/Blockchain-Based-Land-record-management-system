import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { GuestOnly } from "@/components/auth/protected-route";

/**
 * Auth shell — the centered, chrome-less surface that hosts /auth/login
 * and /auth/register.
 *
 * Design intent: a calm institutional "lobby." Single brand mark up top,
 * a soft brand-tinted background, a hard-edged card on white. No sidebar,
 * no navbar — the form is the only thing competing for attention.
 *
 * The mint-tinted radial gradient is the design system's "watermark"
 * pattern (brand-100 → brand-200) and is the only place greens appear at
 * surface scale; it sets the institutional tone without coloring the form.
 *
 * The {children} slot is wrapped in <GuestOnly>, so an already-authenticated
 * user who navigates to /auth/login or /auth/register is bounced to their
 * role's dashboard. The brand chrome (mark + footer + atmospheric gradient)
 * stays server-rendered and remains visible during the brief redirect
 * window — a calmer transition than gating the whole page.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center px-4 py-10 sm:px-6",
        // Subtle mint atmospheric gradient — large radial in brand-100,
        // fading into the warm-white surface. Pure decoration; sits below
        // all content via z-0 / pointer-events-none.
        "bg-background",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-100 blur-3xl opacity-70" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[480px] translate-x-1/3 translate-y-1/3 rounded-full bg-brand-200 blur-3xl opacity-50" />
      </div>

      {/* Brand mark */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2.5 text-brand-900"
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            "bg-brand-900 text-brand-100 shadow-sm",
          )}
          aria-hidden
        >
          <ShieldCheck className="h-5 w-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-serif text-lg font-semibold tracking-tight">
            Land Registry
          </span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Verified on-chain
          </span>
        </span>
      </Link>

      <main className="w-full max-w-md">
        <GuestOnly>{children}</GuestOnly>
      </main>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Land Registry · Blockchain-verified
        property records
      </footer>
    </div>
  );
}
