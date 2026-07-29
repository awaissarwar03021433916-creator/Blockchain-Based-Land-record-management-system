/**
 * Role — the single source of truth for user roles across the frontend.
 *
 * Values are kept in lockstep with the backend's User schema enum:
 *   ["admin", "owner", "buyer"]   (see server/models/User.model.js)
 *
 * Everything that branches on role (sidebar nav, route guards, role gates,
 * Zustand auth store, query keys) imports from here — no string literals.
 */
export const ROLE = {
  ADMIN: "admin",
  OWNER: "owner",
  BUYER: "buyer",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ALL_ROLES: readonly Role[] = [ROLE.ADMIN, ROLE.OWNER, ROLE.BUYER];

/**
 * Canonical human-readable label for each role — the SINGLE source of
 * truth for how a role is worded anywhere it's shown to the user
 * (sidebar identity chip, topbar account menu, dashboard headers, etc.).
 *
 * Standardized vocabulary: "Admin" / "Owner" / "Buyer". Render this
 * instead of the raw enum value or ad-hoc strings ("Landowner",
 * "Administrator") so every surface reads identically.
 */
export const ROLE_LABEL: Record<Role, string> = {
  [ROLE.ADMIN]: "Admin",
  [ROLE.OWNER]: "Owner",
  [ROLE.BUYER]: "Buyer",
};

/** Convenience for a possibly-null role (e.g. pre-hydration). */
export function roleLabel(role: Role | null | undefined): string {
  return role ? ROLE_LABEL[role] : "";
}

/**
 * Check whether a (possibly absent) role belongs to an allow-list.
 * Returns false for null/undefined so callers can use it as a single
 * guard without first checking presence.
 */
export function hasRole(
  role: Role | null | undefined,
  allowed: readonly Role[],
): role is Role {
  return role != null && allowed.includes(role);
}
