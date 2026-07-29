"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

/**
 * DashboardShell — the reusable chrome that wraps every authenticated
 * dashboard page (admin / owner / buyer).
 *
 * Composition:
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │ Sidebar (md+)│              Topbar                            │
 *  │              ├─────────────────────────────────────────────── │
 *  │   role-      │                                                │
 *  │   driven     │                children                        │
 *  │   nav        │                                                │
 *  └──────────────┴──────────────────────────────────────────────── ┘
 *
 *  • On `< md` the sidebar disappears; a hamburger in the topbar opens
 *    the same Sidebar as a Sheet drawer.
 *  • Mobile-drawer open/close state lives in `useUiStore.mobileNavOpen`
 *    (never persisted — a refresh closes the drawer).
 *  • Sidebar-collapsed preference lives in `useUiStore.sidebarCollapsed`
 *    (persisted — survives reload).
 *
 * The shell has no role-awareness, no business logic, and no API calls.
 * It composes the existing Sidebar + Topbar + a content area, and that
 * is everything. Wiring it into a role-specific layout looks like:
 *
 *     <ProtectedRoute roles={[ROLE.ADMIN]}>
 *       <DashboardShell pageLabel="Admin · Overview">
 *         {children}
 *       </DashboardShell>
 *     </ProtectedRoute>
 */
export interface DashboardShellProps {
  children: React.ReactNode;
  /** Optional breadcrumb-style label rendered on the left of the topbar. */
  pageLabel?: string;
  /** Extra classes applied to the `<main>` content wrapper. */
  contentClassName?: string;
}

export function DashboardShell({
  children,
  pageLabel,
  contentClassName,
}: DashboardShellProps) {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const closeMobileNav = useUiStore((s) => s.closeMobileNav);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop / tablet sidebar — hidden on mobile, where the drawer
          takes over. Tablet (md) still shows the icon-collapsed variant
          when the user has chosen it. */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile drawer — same Sidebar component, `mobile` mode. The Sheet
          handles backdrop / outside-click / Esc-to-close automatically. */}
      <Sheet
        open={mobileNavOpen}
        onOpenChange={(open) => {
          if (!open) closeMobileNav();
        }}
      >
        <SheetContent
          side="left"
          className={cn(
            "w-72 max-w-[80vw] border-r-0 bg-brand-900 p-0 text-white",
            "md:hidden",
          )}
        >
          {/* Radix Dialog needs an accessible title; we hide it visually
              because the sidebar carries its own visible brand mark. */}
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Sections of the Land Registry dashboard.
          </SheetDescription>
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main column — topbar at top, page content below. `min-w-0` is
          essential here so flex children can shrink (text-truncate +
          tables would otherwise force the column to expand off-screen). */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar pageLabel={pageLabel} />
        <main
          className={cn(
            "flex-1 px-4 py-6 sm:px-6 lg:px-8",
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
