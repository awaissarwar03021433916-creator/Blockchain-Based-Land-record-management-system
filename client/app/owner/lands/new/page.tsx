"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  FileText,
  Loader2,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { useSubmitLandMutation } from "@/features/owner/hooks/use-submit-land";
import {
  ConflictError,
  NetworkError,
  ValidationError,
  getDisplayMessage,
} from "@/lib/api/error";

/**
 * Owner · Submit Land — register a new plot for admin verification.
 *
 * The form is small and single-purpose, so the schema, the form, and
 * the submit handler all live in this one file. The reusable bits
 * (service, mutation hook) live under `features/owner/` and are the
 * only swap points for a future redesign.
 *
 * After a successful submission:
 *   • the mutation invalidates `qk.owner.myLands` (the portfolio refetches)
 *   • a sonner success toast confirms the pending state
 *   • the user is redirected to /owner/lands so they see their new row
 *
 * The route is wrapped by `app/owner/layout.tsx` (ProtectedRoute
 * roles=[OWNER] + DashboardShell) — no chrome needed here.
 */

/* ----------------------------- Zod schema -------------------------------- */

/**
 * Mirrors `validateLandSubmission` in
 * `server/middlewares/validate.middleware.js` (max lengths 64/200/64).
 * Server stays the authority — this is UX, not security.
 */
const submitLandSchema = z.object({
  plotNumber: z
    .string()
    .trim()
    .min(1, "Plot number is required")
    .max(64, "Plot number cannot exceed 64 characters"),
  location: z
    .string()
    .trim()
    .min(1, "Location is required")
    .max(200, "Location cannot exceed 200 characters"),
  area: z
    .string()
    .trim()
    .min(1, "Area is required")
    .max(64, "Area cannot exceed 64 characters"),
});

type SubmitLandFormValues = z.infer<typeof submitLandSchema>;

/* --------------------------------- page ---------------------------------- */

export default function OwnerSubmitLandPage() {
  const router = useRouter();
  const mutation = useSubmitLandMutation();

  const form = useForm<SubmitLandFormValues>({
    resolver: zodResolver(submitLandSchema),
    mode: "onTouched",
    defaultValues: {
      plotNumber: "",
      location: "",
      area: "",
    },
  });

  async function handleSubmit(values: SubmitLandFormValues) {
    try {
      await mutation.mutateAsync(values);
      toast.success("Land submitted", {
        description: "Pending admin verification — you’ll see it in your portfolio.",
      });
      router.push(ROUTES.OWNER_LANDS);
    } catch (err) {
      handleSubmitError(err);
    }
  }

  const isSubmitting = form.formState.isSubmitting || mutation.isPending;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader />

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <span className="eyebrow">Submission</span>
          <h2 className="text-lg font-semibold tracking-tight text-brand-900">
            Plot details
          </h2>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
            className="space-y-5 p-5"
          >
            <FormField
              control={form.control}
              name="plotNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plot number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. LR-2031"
                      autoComplete="off"
                      disabled={isSubmitting}
                      maxLength={64}
                      className="font-chain"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The identifier on your ownership document. Must be
                    unique at this location.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Block 5, Gulshan-e-Iqbal, Karachi"
                      autoComplete="off"
                      disabled={isSubmitting}
                      maxLength={200}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    City, sector, and any sub-locator that uniquely
                    identifies the plot on the ground.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 240 sq.yd"
                      autoComplete="off"
                      disabled={isSubmitting}
                      maxLength={64}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include the unit. The registry stores this verbatim.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SubmissionNotice />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isSubmitting}
                asChild
              >
                <Link href={ROUTES.OWNER_LANDS}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" aria-hidden />
                    Submit for verification
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

/* ------------------------------- subviews -------------------------------- */

function PageHeader() {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={ROUTES.OWNER_LANDS}
          className="inline-flex items-center gap-1 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          My lands
        </Link>
      </div>
      <span className="eyebrow">Registry</span>
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900 md:text-4xl">
        Submit a new land
      </h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Provide the plot identifier, location, and area. Once submitted, an
        administrator verifies the document and records ownership on-chain.
      </p>
    </header>
  );
}

function SubmissionNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-brand-200 bg-brand-100/60 p-3 text-xs text-brand-900">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
      <div className="space-y-0.5">
        <div className="font-medium">
          What happens after you submit?
        </div>
        <p className="text-brand-900/80 leading-relaxed">
          Your land enters the verification queue with status{" "}
          <span className="font-medium">Pending</span>. An admin reviews
          the submission, then records it on-chain — at which point the
          status flips to <span className="font-medium">Approved</span>{" "}
          and the transaction hash appears in your portfolio.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ error map -------------------------------- */

/**
 * Map an `ApiError` (or anything thrown by the mutation) onto the most
 * actionable user-facing toast. Branches on TYPE, never on raw HTTP
 * status — that classification lives in `lib/api/error.ts`.
 */
function handleSubmitError(err: unknown): void {
  if (err instanceof ValidationError) {
    // The backend's `validateLandSubmission` 400 OR the controller's
    // "Plot already exists at this location" 400. Both land here.
    const detail =
      err.errors[0] ?? err.message ?? "Please check the form and try again.";
    toast.error("Couldn’t submit land", { description: detail });
    return;
  }
  if (err instanceof ConflictError) {
    // Defence in depth in case the backend later moves the duplicate
    // check to a 409.
    toast.error("Plot already registered", {
      description: "A land with this plot + location is already on the registry.",
    });
    return;
  }
  if (err instanceof NetworkError) {
    toast.error("Couldn’t reach the server", {
      description: "Check your connection and try again.",
    });
    return;
  }
  toast.error("Submission failed", { description: getDisplayMessage(err) });
}
