import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  FileCheck,
  Gauge,
  History,
  Home,
  Inbox,
  Map,
  PlusCircle,
  Send,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { ROLE, type Role } from "@/types/role";
import { ROUTES } from "./routes";

/**
 * NavItem — one row in the sidebar / drawer / future command palette.
 *
 * Kept as data (label + href + icon component reference) rather than
 * JSX so the same configuration can drive multiple surfaces without
 * duplicating markup.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Role-keyed navigation configuration.
 *
 * Each role gets its OWN distinct list — including its own Dashboard
 * entry pointing at the role's overview page (/admin, /owner, /buyer).
 * Cross-role merging is intentionally not done here: a dual-role user
 * would otherwise see two "Dashboard" rows pointing at different URLs,
 * which is worse UX than the role-appropriate single dashboard.
 *
 * Owners can still reach the marketplace via the public top-level
 * route; buyers can still reach owner surfaces once they acquire land
 * (the backend's dual-role gate on /api/owner/* is the authority).
 */
export const navigationConfig: Record<Role, NavItem[]> = {
  [ROLE.ADMIN]: [
    { label: "Dashboard", href: ROUTES.ADMIN, icon: Gauge },
    { label: "Pending Lands", href: ROUTES.ADMIN_LANDS, icon: FileCheck },
    { label: "Transfer Requests", href: ROUTES.ADMIN_TRANSFERS, icon: ArrowLeftRight },
    { label: "Users", href: ROUTES.ADMIN_USERS, icon: Users },
  ],
  [ROLE.OWNER]: [
    { label: "Dashboard", href: ROUTES.OWNER, icon: Gauge },
    { label: "My Lands", href: ROUTES.OWNER_LANDS, icon: Map },
    { label: "Submit Land", href: ROUTES.OWNER_LAND_NEW, icon: PlusCircle },
    { label: "Sale Listings", href: ROUTES.OWNER_LISTINGS, icon: Tag },
    { label: "Requests", href: ROUTES.OWNER_REQUESTS, icon: Inbox },
    { label: "Ownership History", href: ROUTES.OWNER_HISTORY, icon: History },
  ],
  [ROLE.BUYER]: [
    { label: "Dashboard", href: ROUTES.BUYER, icon: Gauge },
    { label: "Marketplace", href: ROUTES.MARKETPLACE, icon: Store },
    { label: "My Requests", href: ROUTES.BUYER_REQUESTS, icon: Send },
    { label: "My Properties", href: ROUTES.BUYER_PROPERTIES, icon: Home },
    { label: "Ownership History", href: ROUTES.BUYER_HISTORY, icon: History },
  ],
};

/**
 * Return the sidebar entries for the given role.
 *
 * One role → one list. No merging. Keep this trivial so the lookup is
 * predictable from any caller (sidebar, future palette, breadcrumbs).
 */
export function navForRole(role: Role): NavItem[] {
  return navigationConfig[role];
}
