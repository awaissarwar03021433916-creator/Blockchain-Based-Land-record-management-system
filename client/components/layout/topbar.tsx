"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/hooks/use-auth";
import { useUiStore } from "@/stores/ui.store";
import { useWallet } from "@/hooks/use-wallet";
import { useLogoutMutation } from "@/features/auth/auth.mutations";
import { roleLabel } from "@/types/role";
import { shortAddress } from "@/lib/blockchain/address";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Topbar — the sticky 64px utility bar that crowns every dashboard page.
 *
 * Layout (left → right):
 *   • hamburger button (md:hidden) — opens the mobile sidebar drawer
 *   • optional page label (small, sans, muted) — the breadcrumb-style
 *     "you are here" indicator; the page itself renders the large H1
 *   • spacer
 *   • wallet badge — connect button OR connected address pill
 *   • user dropdown — name + email, profile link, sign out
 *
 * No business logic. Pure presentation, plus the click handlers for
 * logout and wallet connect that delegate to the existing hooks.
 */

export interface TopbarProps {
  /** Small text shown on the left, like a breadcrumb. */
  pageLabel?: string;
  className?: string;
}

export function Topbar({ pageLabel, className }: TopbarProps) {
  const openMobileNav = useUiStore((s) => s.openMobileNav);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border",
        "bg-card/95 px-4 backdrop-blur-sm sm:px-6",
        className,
      )}
    >
      <button
        type="button"
        onClick={openMobileNav}
        aria-label="Open navigation menu"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md md:hidden",
          "text-foreground transition-colors duration-hover hover:bg-brand-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {pageLabel ? (
        <div className="text-sm font-medium text-muted-foreground">
          {pageLabel}
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <WalletBadge />
        <UserDropdown />
      </div>
    </header>
  );
}

/* ------------------------ private: wallet badge -------------------------- */

function WalletBadge() {
  const wallet = useWallet();

  // No injected provider — keep the topbar clean. The register flow has
  // its own "Install MetaMask" prompt; surfacing it again here would just
  // be visual noise on every page.
  if (!wallet.hasInjectedWallet) {
    return null;
  }

  if (!wallet.isConnected || !wallet.address) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={wallet.connect}
        disabled={wallet.isConnectPending}
        className="gap-1.5"
      >
        <Wallet className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">
          {wallet.isConnectPending ? "Connecting…" : "Connect"}
        </span>
      </Button>
    );
  }

  // Wrong-chain warning takes priority over the address display so the
  // user can't miss it before signing a tx.
  if (!wallet.isOnSupportedChain) {
    return (
      <button
        type="button"
        onClick={wallet.switchToDefaultChain}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
          "border-warning/50 bg-warning/10 text-warning",
          "hover:bg-warning/15 transition-colors duration-hover",
        )}
        title="Switch to the supported chain"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
        Wrong network
      </button>
    );
  }

  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-full border border-brand-200 bg-brand-100",
        "px-2.5 py-1 text-xs font-medium text-brand-900 sm:inline-flex",
      )}
      title={wallet.address}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-brand-500"
        aria-hidden
      />
      <span className="font-chain">{shortAddress(wallet.address)}</span>
    </span>
  );
}

/* ------------------------ private: user dropdown ------------------------- */

function UserDropdown() {
  const router = useRouter();
  const { user, role, hasHydrated } = useAuth();
  const logout = useLogoutMutation();

  async function handleSignOut() {
    try {
      await logout.mutateAsync();
      toast.success("Signed out", { description: "See you again soon." });
    } catch {
      // Logout has no backend call today (JWTs are stateless), so an error
      // here would be a programming bug, not a runtime failure. The hook's
      // onSuccess already cleared the persisted session.
    }
    // Use `replace` so the back button doesn't return to a now-protected
    // dashboard surface.
    router.replace(ROUTES.LOGIN);
  }

  // Pre-hydration: render a neutral placeholder rather than blank — the
  // bar would look broken with a missing trailing element on every reload.
  const displayName =
    hasHydrated && user?.name
      ? user.name
      : hasHydrated && user?.email
        ? user.email
        : "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          className={cn(
            "flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5",
            "text-sm font-medium text-foreground",
            "transition-colors duration-hover hover:bg-brand-100/60 hover:text-brand-900",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              "bg-brand-700 text-[10px] font-semibold text-white",
            )}
            aria-hidden
          >
            {initialsOf(user?.name) ?? "·"}
          </span>
          <span className="hidden max-w-[12ch] truncate sm:inline">
            {displayName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {user?.name ?? (hasHydrated ? "Welcome" : "Loading…")}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user?.email ?? roleLabel(role)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push(ROUTES.PROFILE)}>
          <User aria-hidden />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            // Radix calls onSelect synchronously; defer the async logout so
            // the menu closes before the navigation kicks in.
            event.preventDefault();
            void handleSignOut();
          }}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------- helpers -------------------------------- */

function initialsOf(name: string | undefined | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  const result = `${first}${last}`.toUpperCase();
  return result || null;
}
