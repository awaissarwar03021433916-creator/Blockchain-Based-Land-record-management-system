import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConnectedLoginForm } from "@/features/auth/components/connected-login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to the Land Registry to manage your listings, transfer requests, and on-chain property records.",
};

export default function LoginPage() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to manage your lands, listings, and on-chain transfers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/*
          The page stays a Server Component for `metadata`. All
          interactivity — RHF + zod, useLoginMutation, toast, router push
          — lives inside the `"use client"` ConnectedLoginForm.
        */}
        <ConnectedLoginForm />
      </CardContent>
    </Card>
  );
}
