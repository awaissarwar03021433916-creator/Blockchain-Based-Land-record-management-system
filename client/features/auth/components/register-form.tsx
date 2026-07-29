"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Home,
  Loader2,
  LogOut,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";
import { ROLE } from "@/types/role";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/auth.schemas";
import { useWallet } from "@/hooks/use-wallet";
import { shortAddress } from "@/lib/blockchain/address";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup } from "@/components/ui/radio-group";

/**
 * RegisterForm — RHF + Zod, design-system-themed.
 *
 * The form OWNS layout + validation + loading state. It DOES NOT own the
 * submission target — `onSubmit` is an optional prop so the page wires
 * `useRegisterMutation` later without touching this file. If `onSubmit`
 * is omitted, the handler still simulates a short latency so the loading
 * state is visible during UI development.
 *
 * Role is rendered as TWO LARGE CHOICE CARDS instead of plain radios
 * because the choice is identity-shaping (it changes the user's primary
 * dashboard) and deserves the visual weight.
 *
 * MetaMask integration: this component owns the connect / disconnect /
 * not-installed UX for the walletAddress field. It reads `useWallet()`
 * and mirrors the connected address into the form via `setValue`, so
 * downstream submission code just receives `values.walletAddress`.
 */
export interface RegisterFormProps {
  onSubmit?: (values: RegisterFormValues) => Promise<void> | void;
  className?: string;
}

export function RegisterForm({ onSubmit, className }: RegisterFormProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const wallet = useWallet();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      // Sentinel undefined so the schema's required_error fires until the
      // user actively picks a role — better UX than a default selection
      // they may not have intended.
      role: undefined as unknown as RegisterFormValues["role"],
      walletAddress: "",
    },
  });

  // Mirror wagmi's account state into the form field so RHF + Zod see the
  // connected address as if the user typed it. Setting `shouldValidate`
  // means the new value is checked against the regex immediately.
  const walletAddressFromForm = form.getValues("walletAddress");
  React.useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      if (walletAddressFromForm !== wallet.address) {
        form.setValue("walletAddress", wallet.address, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    } else if (walletAddressFromForm) {
      form.setValue("walletAddress", "", {
        shouldValidate: false,
        shouldDirty: true,
      });
    }
  }, [wallet.isConnected, wallet.address, walletAddressFromForm, form]);

  async function handleSubmit(values: RegisterFormValues) {
    if (onSubmit) {
      await onSubmit(values);
      return;
    }
    // Demo path — visible loading state during UI dev. Removed by the
    // connected wrapper which provides its own `onSubmit`.
    // eslint-disable-next-line no-console
    console.log("[register-form] submit (no handler wired):", values);
    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-5", className)}
        noValidate
      >
        {/* --- Full name --- */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="Awais Sarwar"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
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

        {/* --- Confirm password --- */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Type it again"
                    disabled={isSubmitting}
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5",
                      "text-muted-foreground hover:bg-brand-100 hover:text-brand-900",
                      "transition-colors",
                    )}
                  >
                    {showConfirm ? (
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

        {/* --- Role: visual choice cards --- */}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How will you use the platform?</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                  disabled={isSubmitting}
                >
                  <RoleCard
                    value={ROLE.OWNER}
                    selected={field.value === ROLE.OWNER}
                    icon={Home}
                    title="Owner"
                    description="I own land and want to register or sell it."
                  />
                  <RoleCard
                    value={ROLE.BUYER}
                    selected={field.value === ROLE.BUYER}
                    icon={Search}
                    title="Buyer"
                    description="I want to browse the marketplace and acquire land."
                  />
                </RadioGroup>
              </FormControl>
              <FormDescription>
                You can switch perspectives later — buyers who acquire land
                automatically gain seller capabilities.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Wallet: MetaMask connect + readonly address --- */}
        <FormField
          control={form.control}
          name="walletAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wallet (optional)</FormLabel>

              {/* Render different control surfaces by wallet state.
                  We don't wrap in FormControl/Slot because the visible
                  control differs per state — there's no single child to
                  forward the field id onto. The Input that renders when
                  connected is still focusable via its own id chain. */}
              {!wallet.hasInjectedWallet ? (
                <WalletNotInstalled disabled={isSubmitting} />
              ) : wallet.isConnected && field.value ? (
                <WalletConnected
                  address={field.value}
                  isDisconnecting={wallet.isDisconnectPending}
                  onDisconnect={wallet.disconnect}
                  disabled={isSubmitting}
                />
              ) : (
                <WalletConnectPrompt
                  onConnect={wallet.connect}
                  isPending={wallet.isConnectPending}
                  error={wallet.connectError}
                  disabled={isSubmitting}
                />
              )}

              <FormDescription>
                Optional. Lands you acquire transfer on-chain to this
                wallet. You can also link one later from your profile.
              </FormDescription>
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
              Creating your account…
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Create account
            </>
          )}
        </Button>

        {/* --- Already have an account --- */}
        <p className="pt-1 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={ROUTES.LOGIN}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}

/* ----------------------- internal: role choice card ---------------------- */

interface RoleCardProps {
  value: "owner" | "buyer";
  selected: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function RoleCard({
  value,
  selected,
  icon: Icon,
  title,
  description,
}: RoleCardProps) {
  return (
    <label
      htmlFor={`role-${value}`}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-4",
        "transition-all duration-hover ease-out",
        "hover:border-brand-200 hover:bg-brand-100/40",
        selected
          ? "border-brand-700 bg-brand-100/60 ring-2 ring-brand-700/30 shadow-sm"
          : "border-border",
      )}
    >
      <RadioGroupPrimitive.Item
        value={value}
        id={`role-${value}`}
        className="sr-only"
      />
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
            selected
              ? "bg-brand-700 text-primary-foreground"
              : "bg-brand-100 text-brand-700 group-hover:bg-brand-200",
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </div>
        <div
          className={cn(
            "h-4 w-4 rounded-full border-2 transition-colors",
            selected
              ? "border-brand-700 bg-brand-500"
              : "border-border bg-card",
          )}
          aria-hidden
        />
      </div>
      <div>
        <div className="font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

/* ----------------------- internal: wallet surfaces ----------------------- */

function WalletNotInstalled({ disabled }: { disabled?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/5 p-3 sm:flex-row sm:items-center sm:justify-between",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2.5 text-sm">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-warning"
          aria-hidden
        />
        <div>
          <div className="font-medium text-foreground">
            MetaMask not detected
          </div>
          <div className="text-xs text-muted-foreground">
            Install it to receive on-chain land transfers, or skip and link a
            wallet later.
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        asChild
        disabled={disabled}
      >
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer noopener"
          className="gap-1.5"
        >
          Install MetaMask
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  );
}

interface WalletConnectPromptProps {
  onConnect: () => void;
  isPending: boolean;
  error: Error | null;
  disabled?: boolean;
}

function WalletConnectPrompt({
  onConnect,
  isPending,
  error,
  disabled,
}: WalletConnectPromptProps) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onConnect}
        disabled={disabled || isPending}
        className="w-full justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for MetaMask…
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4" />
            Connect MetaMask Wallet
          </>
        )}
      </Button>
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {/* Most common case is "User rejected the request" — the wagmi
              error already reads cleanly; surface it as-is. */}
          {error.message || "Wallet connection failed"}
        </p>
      ) : null}
    </div>
  );
}

interface WalletConnectedProps {
  address: string;
  isDisconnecting: boolean;
  onDisconnect: () => void;
  disabled?: boolean;
}

function WalletConnected({
  address,
  isDisconnecting,
  onDisconnect,
  disabled,
}: WalletConnectedProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          readOnly
          value={address}
          aria-label="Connected wallet address"
          className="font-chain pr-32 text-foreground"
        />
        <span
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full",
            "border border-brand-200 bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-900",
          )}
        >
          <CheckCircle2 className="h-3 w-3 text-brand-700" aria-hidden />
          Connected
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Linked to{" "}
          <span className="font-chain text-foreground">
            {shortAddress(address)}
          </span>
        </span>
        <button
          type="button"
          onClick={onDisconnect}
          disabled={disabled || isDisconnecting}
          className={cn(
            "inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors",
            "hover:text-destructive",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {isDisconnecting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <LogOut className="h-3 w-3" />
          )}
          Disconnect
        </button>
      </div>
    </div>
  );
}
