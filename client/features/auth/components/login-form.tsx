"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/auth.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/**
 * LoginForm — RHF + Zod, themed against the design system.
 *
 * Mirrors `RegisterForm`'s architecture: the form OWNS layout, validation,
 * and loading state but does NOT own the submission target. `onSubmit` is
 * an optional prop so the page can wire `useLoginMutation` in a future
 * turn without touching this file. When omitted, the handler simulates a
 * short latency so the loading state remains visible during UI dev.
 *
 * Only two fields — Email + Password — keep the form deliberately small.
 * The auth layout's centered card chrome carries the brand and trust
 * signalling; the form's job is just the credentials.
 */
export interface LoginFormProps {
  onSubmit?: (values: LoginFormValues) => Promise<void> | void;
  className?: string;
}

export function LoginForm({ onSubmit, className }: LoginFormProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleSubmit(values: LoginFormValues) {
    if (onSubmit) {
      await onSubmit(values);
      return;
    }
    // Demo path — visible loading state during UI dev. Removed by the
    // connected wrapper which provides its own `onSubmit`.
    // eslint-disable-next-line no-console
    console.log("[login-form] submit (no handler wired):", values);
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-5", className)}
        noValidate
      >
        {/* --- Email --- */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Password --- */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Your password"
                    disabled={isSubmitting}
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5",
                      "text-muted-foreground hover:bg-brand-100 hover:text-brand-900",
                      "transition-colors",
                    )}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Submit --- */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign in
            </>
          )}
        </Button>

        {/* --- Don't have an account --- */}
        <p className="pt-1 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={ROUTES.REGISTER}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
    </Form>
  );
}
