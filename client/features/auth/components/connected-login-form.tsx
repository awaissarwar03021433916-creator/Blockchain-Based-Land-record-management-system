"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/config/routes";
import { useLoginMutation } from "@/features/auth/auth.mutations";
import { LoginForm } from "@/features/auth/components/login-form";
import type { LoginFormValues } from "@/features/auth/auth.schemas";
import {
  AuthError,
  NetworkError,
  NotFoundError,
  ValidationError,
  getDisplayMessage,
} from "@/lib/api/error";
import { ROLE, type Role } from "@/types/role";

/**
 * Connected wrapper around <LoginForm/>.
 *
 * Mirrors the register flow's separation of concerns: <LoginForm/> stays
 * a pure presentational component (RHF + Zod + design tokens), and this
 * file owns the three concerns the form deliberately doesn't:
 *   1. HTTP call (via `useLoginMutation`)
 *   2. Toast feedback (via the global Sonner toaster)
 *   3. Routing on success — role-aware
 *
 * Session persistence is handled inside `useLoginMutation.onSuccess`,
 * which calls `auth.store.setSession({token, role})` and invalidates
 * `qk.auth.me`. We don't duplicate that here.
 */
export function ConnectedLoginForm() {
  const router = useRouter();
  const mutation = useLoginMutation();

  async function handleSubmit(values: LoginFormValues) {
    try {
      const data = await mutation.mutateAsync(values);
      // useLoginMutation has already written {token, role} to auth.store
      // and invalidated qk.auth.me. Confirm to the user and route.
      toast.success("Signed in", { description: "Welcome back." });
      // `replace` (not `push`) so the back button doesn't return the
      // signed-in user to the login form.
      router.replace(dashboardForRole(data.role));
    } catch (err) {
      handleLoginError(err);
    }
  }

  return <LoginForm onSubmit={handleSubmit} />;
}

/* ---------------------------- role → route ------------------------------ */

/**
 * Each role lands on its own dashboard. The switch is exhaustive over
 * `Role` — adding a new role anywhere in the codebase produces a TS error
 * here until a corresponding route is wired in.
 */
function dashboardForRole(role: Role): string {
  switch (role) {
    case ROLE.ADMIN:
      return ROUTES.ADMIN;
    case ROLE.OWNER:
      return ROUTES.OWNER;
    case ROLE.BUYER:
      return ROUTES.BUYER;
  }
}

/* ----------------------------- error mapping ---------------------------- */

/**
 * Map any thrown error onto the most actionable user-facing toast.
 * Classification is by ApiError TYPE, never by HTTP status — that
 * mapping lives once in `lib/api/error.ts`.
 *
 * Backend semantics:
 *   • 404 "User not found"      — email isn't registered
 *   • 400 "Invalid credentials" — password mismatch
 * Both collapse to a single "Invalid email or password" toast to avoid
 * user-enumeration via response messages.
 */
function handleLoginError(err: unknown): void {
  if (err instanceof NetworkError) {
    toast.error("Couldn't reach the server", {
      description: "Check your connection and try again.",
    });
    return;
  }

  // Per-field validation array (the validate.middleware shape) — surface
  // the first specific reason. This only fires on bad email FORMAT etc.,
  // since our client-side Zod schema already covers that — defence in
  // depth for the case where backend rules tighten ahead of the client.
  if (err instanceof ValidationError && err.errors.length > 0) {
    toast.error("Could not sign in", { description: err.errors[0] });
    return;
  }

  if (
    err instanceof AuthError ||
    err instanceof NotFoundError ||
    err instanceof ValidationError
  ) {
    toast.error("Invalid email or password", {
      description: "Check your credentials and try again.",
    });
    return;
  }

  // Unknown / 5xx fallthrough — the message has already been normalized
  // by the api client's interceptor; surface whatever we have.
  toast.error("Sign in failed", {
    description: getDisplayMessage(err),
  });
}
