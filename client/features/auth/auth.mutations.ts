"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/config/query-keys";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "@/types/auth";

/**
 * Auth mutations.
 *
 * Each hook composes three concerns that the rest of the codebase shouldn't
 * have to coordinate manually:
 *   • the HTTP call (delegated to `authService`),
 *   • the persisted session in `auth.store`,
 *   • the React Query cache (invalidation on success).
 *
 * Errors are NOT caught here — the api client's response interceptor has
 * already classified them into typed `ApiError` subclasses, and callers
 * (forms, providers) decide how to display them. Adding swallow-and-toast
 * here would steal that control from the call site.
 */

/* --------------------------- useLoginMutation --------------------------- */

/**
 * `POST /api/auth/login`
 *
 * On success:
 *   1. write `{token, role}` to `auth.store` — `user` stays null until
 *      `useMeQuery` resolves the full profile (or until the backend's
 *      /api/auth/me endpoint lands).
 *   2. invalidate `qk.auth.me` so any mounted `useMeQuery` refetches with
 *      the new Bearer token attached.
 *
 * The mutation does NOT redirect — routing is a UI concern; the calling
 * form (login page) chooses where to send the user post-login.
 */
export function useLoginMutation() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (body) => authService.login(body),
    onSuccess: (data) => {
      setSession({ token: data.token, role: data.role });
      void qc.invalidateQueries({ queryKey: qk.auth.me });
    },
  });
}

/* -------------------------- useRegisterMutation ------------------------- */

/**
 * `POST /api/auth/register`
 *
 * No session side-effect — the backend does not issue a token at
 * registration time (see `server/controllers/auth.controller.js`). The
 * caller typically chains a login call afterwards, or redirects to the
 * login page.
 */
export function useRegisterMutation() {
  return useMutation<RegisterResponse, Error, RegisterRequest>({
    mutationFn: (body) => authService.register(body),
  });
}

/* --------------------------- useLogoutMutation -------------------------- */

/**
 * Logout.
 *
 * The backend has no `/api/auth/logout` route — JWTs are stateless, so
 * the server has nothing to revoke. Logout is a purely client-side cleanup:
 *   1. clear the persisted session (token / role / user → null).
 *   2. `qc.clear()` — nuke every cached query so a subsequent re-login
 *      under a different identity never sees the previous user's data
 *      cached under the same key.
 *
 * Exposed as a mutation (rather than a plain function) so consumers get
 * the same `mutate` / `isPending` ergonomics as login & register, and so
 * future server-side revocation (token denylist, refresh-rotation, …)
 * can slot into `mutationFn` without changing call sites.
 */
export function useLogoutMutation() {
  const qc = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      // No HTTP call today. If a /api/auth/logout endpoint is ever added
      // for token denylisting, the call lands here.
    },
    onSuccess: () => {
      clearSession();
      qc.clear();
    },
  });
}
