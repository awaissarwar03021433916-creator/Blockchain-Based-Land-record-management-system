import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Role } from "@/types/role";
import type { User } from "@/types/user";

/**
 * Auth session container.
 *
 * Owns the PERSISTED handle to the user's session: token + role + user.
 * `role` is a FIRST-CLASS field (not derived from `user`) because the
 * backend's `POST /api/auth/login` response carries the role on the
 * envelope but does not return a full `User` object — the full profile
 * is only available via the (not-yet-implemented) `GET /api/auth/me`.
 * Keeping `role` independent means role-gated UI works immediately after
 * login even while `user` is still null and the `/me` query is pending.
 *
 * SSR safety: `onRehydrateStorage` flips `_hasHydrated` once localStorage
 * has been read. Components should gate redirects on `hasHydrated && !isAuth`
 * to avoid the "redirect to /login on every refresh" flicker that comes
 * from trusting an un-hydrated `token === null`.
 */

export interface SetSessionPayload {
  token: string;
  role: Role;
  /** Optional — populated later by `useMeQuery` once /api/auth/me lands. */
  user?: User | null;
}

interface AuthState {
  token: string | null;
  role: Role | null;
  user: User | null;
  _hasHydrated: boolean;

  /**
   * Set the persisted session. Typically called from `useLoginMutation`
   * with `{token, role}` (user pending) and from `useMeQuery.onSuccess`
   * to fill in `{user}` once the profile fetch resolves.
   */
  setSession: (payload: SetSessionPayload) => void;

  /** Update only the user profile (token + role unchanged). */
  setUser: (user: User | null) => void;

  /** Drop everything — called by `useLogoutMutation` and on 401 interception. */
  clearSession: () => void;

  /** Internal — called by the persist middleware after rehydration. */
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      user: null,
      _hasHydrated: false,

      setSession: ({ token, role, user }) =>
        set({ token, role, user: user ?? null }),

      setUser: (user) => set({ user }),

      clearSession: () => set({ token: null, role: null, user: null }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "land-registry:auth",
      storage: createJSONStorage(() => localStorage),
      // Persist credentials + role + identity snapshot — never the hydration flag.
      partialize: (state) => ({
        token: state.token,
        role: state.role,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/* ----------------------------- Selectors --------------------------------- */
/* Selectors are exported so components only re-render on the slice they
 * actually read, instead of pulling the whole store on every action.
 *
 * `selectRole` now reads `state.role` directly (not via `user?.role`) so
 * a freshly-logged-in user — token + role set, user still pending — passes
 * role-gates immediately. */

export const selectToken = (s: AuthState) => s.token;
export const selectRole = (s: AuthState) => s.role;
export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => s.token != null;
export const selectHasHydrated = (s: AuthState) => s._hasHydrated;
