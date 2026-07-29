import { api } from "@/lib/api/client";
import type { AdminDashboardStats } from "@/types/admin";

/**
 * Admin service — thin, typed wrapper over the backend's `/api/admin/*`
 * endpoints. Pure async functions, no React.
 *
 * Backend reference: `server/controllers/admin.controller.js` +
 * `server/routes/admin.routes.js`. Every call routes through the api
 * client's response interceptor (`lib/api/client.ts`), which throws a
 * typed `ApiError` subclass on failure — callers branch on
 * `instanceof PermissionError` etc., never on raw HTTP codes.
 *
 * All endpoints under this prefix require the admin role. The 403
 * (PermissionError) path is handled centrally by the api client; the
 * service doesn't pre-check the role because the JWT is the authority.
 */

const ADMIN_BASE = "/api/admin";

export const adminService = {
  /**
   * `GET /api/admin/stats`
   *
   * Aggregated dashboard counts — totalUsers, pendingLands,
   * pendingTransfers, approvedLands. Computed server-side via parallel
   * countDocuments queries so the dashboard renders after one round-trip.
   *
   * Throws `AuthError` (401) when the token is missing/expired and
   * `PermissionError` (403) when the caller is not an admin.
   */
  getDashboardStats: (): Promise<AdminDashboardStats> =>
    api.get<AdminDashboardStats>(`${ADMIN_BASE}/stats`),
};

export type AdminService = typeof adminService;
