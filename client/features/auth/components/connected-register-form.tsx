"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/config/routes";
import { useRegisterMutation } from "@/features/auth/auth.mutations";
import { RegisterForm } from "@/features/auth/components/register-form";
import type { RegisterFormValues } from "@/features/auth/auth.schemas";
import {
  ConflictError,
  NetworkError,
  ValidationError,
  getDisplayMessage,
} from "@/lib/api/error";
import type { RegisterRequest } from "@/types/auth";

/**
 * Connected wrapper around <RegisterForm/>.
 *
 * Owns the three concerns the reusable form deliberately doesn't:
 *   1. HTTP call (via `useRegisterMutation`)
 *   2. Toast feedback (via the global Sonner toaster)
 *   3. Routing on success
 *
 * The form remains a pure UI/validation/loading component; this file is
 * the only place "what happens when the user clicks Create account" is
 * wired up, so a future flow change (post-register auto-login, MetaMask
 * signature step, etc.) is a one-file edit.
 */
export function ConnectedRegisterForm() {
  const router = useRouter();
  const mutation = useRegisterMutation();

  async function handleSubmit(values: RegisterFormValues) {
    // Shape the payload for the backend:
    //   - drop the client-only `confirmPassword` field
    //   - omit `walletAddress` entirely when empty (the backend tolerates
    //     "" but undefined is the cleaner wire shape).
    const { confirmPassword: _confirm, walletAddress, ...rest } = values;
    const payload: RegisterRequest =
      walletAddress && walletAddress.length > 0
        ? { ...rest, walletAddress }
        : rest;

    try {
      await mutation.mutateAsync(payload);
      toast.success("Account created. Please sign in.", {
        description: "Your registration was accepted.",
      });
      router.push(ROUTES.LOGIN);
    } catch (err) {
      handleRegisterError(err);
    }
  }

  return <RegisterForm onSubmit={handleSubmit} />;
}

/**
 * Map an `ApiError` (or anything thrown by the mutation) onto the most
 * actionable user-facing toast. The classification is by error TYPE,
 * never by raw HTTP status — that lives in `lib/api/error.ts`.
 */
function handleRegisterError(err: unknown): void {
  if (err instanceof ValidationError) {
    // Backend's `validate.middleware.js` 400 OR the controller's "User
    // already exists" 400. Both end up here. Prefer the first specific
    // error message if the validation array is populated.
    const detail =
      err.errors[0] ?? err.message ?? "Please check the form and try again.";
    toast.error("Could not create account", { description: detail });
    return;
  }
  if (err instanceof ConflictError) {
    // Defence in depth for the day the backend moves duplicate-email to 409.
    toast.error("That email is already registered", {
      description: "Try signing in instead.",
    });
    return;
  }
  if (err instanceof NetworkError) {
    toast.error("Couldn't reach the server", {
      description: "Check your connection and try again.",
    });
    return;
  }
  toast.error("Registration failed", {
    description: getDisplayMessage(err),
  });
}
