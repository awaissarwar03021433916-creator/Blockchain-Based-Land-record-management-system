import type { Role } from "./role";
import type { User } from "./user";

/**
 * Auth flow types.
 *
 * Every request body and response shape here mirrors the backend exactly
 * (`server/controllers/auth.controller.js` + `server/middlewares/validate.middleware.js`).
 *
 * `User` is the canonical domain type and lives in `types/user.ts`; it is
 * re-exported below as a convenience so feature code can `import { User }
 * from "@/types/auth"` alongside the flow types it usually wants together.
 */

/* ----------------------------- Requests ---------------------------------- */

/**
 * `POST /api/auth/register`
 * Validated server-side: name ≥ 2 chars, valid email, password ≥ 6 chars,
 * walletAddress (if present) must match /^0x[a-fA-F0-9]{40}$/,
 * role (if present) must be one of "owner" | "buyer".
 * The admin role is reserved and assigned server-side by the hardcoded
 * ADMIN_EMAIL — never client-driven.
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  /** Optional at registration; users can link a wallet later via profile. */
  walletAddress?: string;
  /** Self-assignable roles only: "owner" or "buyer". */
  role?: Extract<Role, "owner" | "buyer">;
}

/**
 * `POST /api/auth/login`
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/* ----------------------------- Responses --------------------------------- */

/**
 * `POST /api/auth/register` → 201
 * Backend returns only a message; the client is expected to redirect to
 * the login flow afterwards. No token is issued at registration time.
 */
export interface RegisterResponse {
  message: string;
}

/**
 * `POST /api/auth/login` → 200
 * Note the backend currently returns the role on the envelope (alongside
 * the token) rather than nesting it under a `user` object — kept faithful
 * to that shape so the service doesn't lie about what the wire carries.
 */
export interface LoginResponse {
  message: string;
  token: string;
  role: Role;
}

/* ----------------------------- Session shape ----------------------------- */

/**
 * The persisted session as stored in `stores/auth.store.ts`.
 * Token + a `User` snapshot. Kept here (not inside the store) so other
 * layers (interceptors, guards, components) can consume the shape without
 * pulling in the Zustand store.
 */
export interface AuthSession {
  token: string;
  user: User;
}

/* ----------------------------- Re-export --------------------------------- */

export type { User };
