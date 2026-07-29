import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConnectedRegisterForm } from "@/features/auth/components/connected-register-form";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Register for the Land Registry to list, browse, or transfer on-chain-verified property.",
};

export default function RegisterPage() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Join the registry to list lands, browse verified properties, and
          transfer ownership on-chain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/*
          The page stays a Server Component for `metadata`. All
          interactivity — RHF + zod, wagmi wallet wiring, the
          useRegisterMutation call, toast, router.push — lives inside the
          `"use client"` ConnectedRegisterForm.
        */}
        <ConnectedRegisterForm />
      </CardContent>
    </Card>
  );
}
