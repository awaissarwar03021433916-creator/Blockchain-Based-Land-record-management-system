/**
 * URL constants — the single source of truth for in-app navigation.
 *
 * Importing routes from here (instead of inlining string literals at call
 * sites) makes refactors grep-safe and prevents the kind of stale-link drift
 * that produced sidebar entries pointing at routes that never existed.
 *
 * Dynamic-segment helpers are functions, not template literals at call site —
 * this way the param types are checked.
 */
export const ROUTES = {
  /* --- Public --- */
  HOME: "/",
  // Auth pages live under /auth/* — the route-group "(auth)" was replaced
  // with a literal /auth segment earlier; these constants must match the
  // filesystem (`app/auth/login/page.tsx`, `app/auth/register/page.tsx`)
  // or every redirect that targets them 404s.
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",

  /* --- Authenticated shared --- */
  // The marketplace is the SINGLE canonical home for the land catalogue.
  // Browse lives at /marketplace; the per-property detail and its history
  // live under it, keyed by LAND id (not listing id) — a land has a stable
  // identity whereas listings come and go. There is intentionally no
  // separate /lands tree: it used to duplicate this surface.
  MARKETPLACE: "/marketplace",
  MARKETPLACE_LAND: (id: string) => `/marketplace/${id}`,
  MARKETPLACE_LAND_HISTORY: (id: string) => `/marketplace/${id}/history`,

  PROFILE: "/profile",

  /* --- Admin --- */
  ADMIN: "/admin",
  ADMIN_LANDS: "/admin/lands",
  ADMIN_LISTINGS: "/admin/listings",
  ADMIN_TRANSFERS: "/admin/transfers",
  ADMIN_USERS: "/admin/users",

  /* --- Owner --- */
  OWNER: "/owner",
  OWNER_LANDS: "/owner/lands",
  OWNER_LAND_NEW: "/owner/lands/new",
  OWNER_LAND_LIST: (id: string) => `/owner/lands/${id}/list`,
  OWNER_LISTINGS: "/owner/listings",
  OWNER_REQUESTS: "/owner/requests",
  OWNER_HISTORY: "/owner/history",

  /* --- Buyer --- */
  BUYER: "/buyer",
  BUYER_REQUESTS: "/buyer/requests",
  BUYER_PROPERTIES: "/buyer/properties",
  BUYER_HISTORY: "/buyer/history",
} as const;

/**
 * Path prefixes used by middleware + layout guards to gate routes by role.
 * Keep in lockstep with the folders under `app/(app)/`.
 */
export const ROUTE_PREFIX = {
  ADMIN: "/admin",
  OWNER: "/owner",
  BUYER: "/buyer",
} as const;

/** Public paths that bypass the auth gate in middleware. */
export const PUBLIC_PATHS: readonly string[] = [
  ROUTES.HOME,
  ROUTES.LOGIN,
  ROUTES.REGISTER,
];
