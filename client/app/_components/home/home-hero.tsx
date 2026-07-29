"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import {
  selectHasHydrated,
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";
import { ROLE, type Role } from "@/types/role";

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

const trustItems = [
  "Immutable on-chain ledger",
  "Government-grade verification",
  "MetaMask-signed transfers",
];

export function HomeHero() {
  const hasHydrated = useAuthStore(selectHasHydrated);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);

  const authedReady = hasHydrated && isAuthenticated && role !== null;
  const primaryHref = authedReady ? dashboardForRole(role) : ROUTES.REGISTER;
  const primaryLabel = authedReady ? "Go to dashboard" : "Get started free";

  return (
    <section className="relative isolate overflow-hidden pt-28 lg:pt-32">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--secondary))_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute -top-32 right-[-10%] -z-10 h-[420px] w-[420px] rounded-full bg-brand-200/60 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 left-[-8%] -z-10 h-[360px] w-[360px] rounded-full bg-brand-100/70 blur-3xl"
      />

      <div className="container grid gap-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pb-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-card px-3 py-1 text-xs font-medium text-brand-900 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Tamper-proof title deeds, settled on-chain
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.2, 0, 0, 1] }}
            className="mt-5 max-w-2xl text-4xl leading-[1.05] md:text-5xl lg:text-6xl"
          >
            The honest way to own,{" "}
            <span className="relative whitespace-nowrap text-primary">
              verify
              <svg
                aria-hidden
                viewBox="0 0 220 14"
                className="absolute inset-x-0 -bottom-2 h-3 w-full text-accent"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 9 C 60 1, 140 1, 218 9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
            , and transfer land.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.2, 0, 0, 1] }}
            className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg"
          >
            A blockchain-backed land registry that replaces a stack of paperwork
            with a single verifiable record. Owners list, buyers request,
            admins moderate — every transfer settles on-chain in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: [0.2, 0, 0, 1] }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg" className="group">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="transition-transform duration-hover group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={ROUTES.MARKETPLACE}>Explore marketplace</Link>
            </Button>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32, ease: [0.2, 0, 0, 1] }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            {trustItems.map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0, 0, 1] }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="relative aspect-[5/4] w-full">
              <Image
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
                alt="Aerial view of farmland parcels at sunset"
                fill
                priority
                sizes="(min-width: 1024px) 540px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-900/40 via-transparent to-transparent" />
            </div>

            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-brand-900 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-accent" />
              </span>
              Verified parcel · Block #1,284,902
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -16, y: 16 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.2, 0, 0, 1] }}
            className="absolute -bottom-6 -left-4 hidden w-64 rounded-xl border border-border bg-card p-4 shadow-lg sm:block"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Transfer settled
                </p>
                <p className="font-chain text-[11px] text-muted-foreground">
                  0x9a3f…ed21
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Owner verified, admin signed, chain confirmed — under 90 seconds.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
