"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, PanelLeftClose, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";
import { navForRole, type NavItem } from "@/config/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useUiStore } from "@/stores/ui.store";
import { ROLE_LABEL } from "@/types/role";

/**
 * Sidebar — dashboard navigation chrome.
 *
 * Role-driven: the items rendered come from `navForRole(role)` in
 * `config/navigation.ts`. Each role has its own distinct list; dual-role
 * users navigate via their primary role (the backend's dual-role gate on
 * /api/owner/* still authorizes the underlying actions).
 *
 * Two rendering modes:
 *   • Desktop (`mobile=false`)  — collapsible between 256px and 64px.
 *     The collapse preference lives in the persisted UI store so it
 *     survives reload.
 *   • Mobile (`mobile=true`)    — full-width inside a Sheet drawer;
 *     no collapse toggle, no max-width clamp.
 *
 * Active-state detection uses LONGEST-PREFIX-MATCH so an item like
 * "/admin" doesn't light up while the user is on "/admin/listings".
 */

export interface SidebarProps {
  /** When true, render the mobile/drawer variant (no collapse). */
  mobile?: boolean;
  className?: string;
}

const EXPANDED_WIDTH = "w-64";
const COLLAPSED_WIDTH = "w-16";

export function Sidebar({ mobile = false, className }: SidebarProps) {
  const { role, user, hasHydrated } = useAuth();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const pathname = usePathname();

  // Mobile drawer is always expanded; ignore the collapsed preference.
  const collapsed = mobile ? false : sidebarCollapsed;

  // Pre-hydration the role is null; render an empty nav rather than
  // flashing a buyer/owner menu to an admin or vice-versa.
  const items: NavItem[] = hasHydrated && role ? navForRole(role) : [];
  const activeHref = getActiveHref(pathname, items);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-brand-900 text-white",
        "transition-[width] duration-ui ease-out",
        mobile ? "h-full w-full" : collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        className,
      )}
      aria-label="Primary navigation"
    >
      {/* --- Header: brand + collapse toggle --- */}
      <div
        className={cn(
          "flex h-16 items-center gap-2 border-b border-white/10",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Link
          href={ROUTES.HOME}
          className={cn(
            "flex items-center gap-2.5 text-white",
            "rounded-md focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-brand-500 focus-visible:ring-offset-2",
            "focus-visible:ring-offset-brand-900",
          )}
          title={collapsed ? "Land Registry" : undefined}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              "bg-brand-100 text-brand-900 shadow-sm",
            )}
            aria-hidden
          >
            <ShieldCheck className="h-4 w-4" />
          </span>
          {!collapsed ? (
            <span className="flex flex-col leading-tight">
              <span className="font-serif text-base font-semibold tracking-tight">
                Land Registry
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-white/60">
                Verified on-chain
              </span>
            </span>
          ) : null}
        </Link>

        {!mobile ? (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "rounded-md p-1.5 text-white/60 transition-colors duration-hover",
              "hover:bg-white/10 hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              collapsed && "hidden",
            )}
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Collapsed-only floating expand toggle (positioned under brand) */}
      {!mobile && collapsed ? (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          className={cn(
            "mx-auto mt-2 rounded-md p-1.5 text-white/60",
            "transition-colors duration-hover hover:bg-white/10 hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          )}
        >
          <PanelLeft className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      {/* --- Nav items --- */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto",
          collapsed ? "px-2 py-3" : "px-3 py-4",
        )}
      >
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <SidebarItem
                item={item}
                active={item.href === activeHref}
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* --- Footer: user identity chip --- */}
      <div
        className={cn(
          "border-t border-white/10",
          collapsed ? "p-2" : "p-3",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-md",
            collapsed ? "justify-center" : "px-2 py-1.5",
          )}
          title={collapsed && user?.email ? user.email : undefined}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              "bg-brand-700 text-xs font-semibold text-white",
            )}
            aria-hidden
          >
            {initialsOf(user?.name) ?? <span className="opacity-70">·</span>}
          </span>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">
                {user?.name ?? (hasHydrated ? "Signed in" : "")}
              </div>
              <div className="truncate text-[11px] uppercase tracking-[0.1em] text-white/55">
                {role ? ROLE_LABEL[role] : hasHydrated ? "—" : ""}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

/* ----------------------- internal: nav-item row -------------------------- */

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

function SidebarItem({ item, active, collapsed }: SidebarItemProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-md text-sm font-medium",
        "transition-colors duration-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900",
        active
          ? "bg-brand-700 text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white",
        collapsed
          ? "h-10 w-10 justify-center"
          : "gap-3 px-3 py-2",
      )}
    >
      {active && !collapsed ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-brand-500"
        />
      ) : null}
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

/* ------------------------- helpers (pure) ------------------------------- */

/**
 * Longest-prefix-match: pick the item whose href is the longest valid
 * prefix of the current pathname. Without this, an overview item at
 * "/admin" lights up at the same time as "/admin/lands" — both are
 * prefix matches of "/admin/lands/123", but only the longest is correct.
 *
 * Pathname is matched against `item.href` exactly OR `item.href + "/"` so
 * "/admin" only matches itself, not "/administrator".
 */
function getActiveHref(pathname: string, items: NavItem[]): string | null {
  let bestHref: string | null = null;
  let bestLength = -1;
  for (const item of items) {
    const isMatch =
      pathname === item.href || pathname.startsWith(item.href + "/");
    if (isMatch && item.href.length > bestLength) {
      bestHref = item.href;
      bestLength = item.href.length;
    }
  }
  return bestHref;
}

/** Two-letter initials for the avatar chip. Handles unicode / falsy input. */
function initialsOf(name: string | undefined | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  const result = `${first}${last}`.toUpperCase();
  return result || null;
}

/**
 * Default export — alias for `Sidebar`. Exists ONLY so the legacy
 * `components/layout/dashboard-layout.tsx` stub (which the unmigrated
 * `/dashboard/*` route group still uses) keeps compiling. Prefer the
 * named import (`{ Sidebar }`) everywhere else.
 */
export default Sidebar;
