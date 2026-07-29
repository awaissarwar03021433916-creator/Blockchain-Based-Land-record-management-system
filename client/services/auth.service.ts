import { api } from "@/lib/api/client";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from "@/types/auth";

/**
 * Auth service — thin, typed wrapper over the backend's `/api/auth/*`
 * endpoints. Pure async functions, no React. Service files are what the
 * future React Query bindings (`features/auth/auth.queries.ts`,
 * `auth.mutations.ts`) consume.
 *
 * Backend reference: `server/controllers/auth.controller.js` +
 * `server/routes/auth.route.js`.
 *
 * Errors: every call here routes through the api client's response
 * interceptor (`lib/api/client.ts`), which throws a typed `ApiError`
 * subclass on failure — callers branch on `instanceof ValidationError`
 * etc., never on raw HTTP codes.
 */

const AUTH_BASE = "/api/auth";

export const authService = {
  /**
   * `POST /api/auth/register`
   *
   * Backend validates: name ≥ 2 chars, valid email, password ≥ 6 chars,
   * walletAddress (if provided) is a valid Ethereum address, role (if
   * provided) is "owner" or "buyer". Returns `{ message }`.
   *
   * Throws `ValidationError` on 400 with the per-field reasons attached.
   */
  register: (body: RegisterRequest): Promise<RegisterResponse> =>
    api.post<RegisterResponse>(`${AUTH_BASE}/register`, body),

  /**
   * `POST /api/auth/login`
   *
   * Returns `{ message, token, role }`. The caller is responsible for
   * persisting the session — that responsibility lives in the
   * `useLoginMutation` hook (future) and ultimately in `auth.store.ts`,
   * not in this service.
   *
   * Throws `AuthError` (401) on bad credentials.
   */
  login: (body: LoginRequest): Promise<LoginResponse> =>
    api.post<LoginResponse>(`${AUTH_BASE}/login`, body),

  /**
   * `GET /api/auth/me`
   *
   * Returns the authenticated user's full profile (name, email, role,
   * walletAddress). The Bearer token is attached by the api client's
   * request interceptor — no need to pass it here.
   *
   * BACKEND GAP: this endpoint does not exist yet on the server. The
   * service-layer contract is defined here so the frontend integration
   * stays forward-compatible; the backend's `auth.controller.js` needs
   * a corresponding `export const me = (req, res) => res.json(...)` plus
   * a route in `auth.route.js`. Until it lands, calling this throws a
   * `NotFoundError`. A future turn either adds the endpoint or replaces
   * this with a client-side JWT decode (using `jose`).
   */
  getProfile: (): Promise<User> => api.get<User>(`${AUTH_BASE}/me`),
};

export type AuthService = typeof authService;
