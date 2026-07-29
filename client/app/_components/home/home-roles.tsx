"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Gavel,
  Map as MapIcon,
  Search,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

interface Bullet {
  icon: LucideIcon;
  title: string;
  body: string;
}

interface RolePanel {
  id: "owner" | "buyer" | "admin";
  label: string;
  eyebrow: string;
  headline: string;
  description: string;
  cta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
  bullets: Bullet[];
}

const panels: RolePanel[] = [
  {
    id: "owner",
    label: "For Owners",
    eyebrow: "Own with proof",
    headline: "Anchor your title, list when you're ready.",
    description:
      "Submit a parcel once, watch it mint to your wallet, and decide whether to hold or list. Buyer requests land in your inbox with the request snapshot already verified.",
    cta: { href: ROUTES.REGISTER, label: "Register as owner" },
    secondaryCta: { href: ROUTES.OWNER, label: "Owner dashboard" },
    bullets: [
      {
        icon: MapIcon,
        title: "One source of truth",
        body: "Your portfolio reads the chain, not a spreadsheet.",
      },
      {
        icon: ShieldCheck,
        title: "Approve transfers in one click",
        body: "Sign off on a request and the admin queue picks it up.",
      },
      {
        icon: Store,
        title: "List for sale with no fees",
        body: "The marketplace is included — no listing markup, no escrow gymnastics.",
      },
    ],
  },
  {
    id: "buyer",
    label: "For Buyers",
    eyebrow: "Buy without doubt",
    headline: "Every listing comes with a chain receipt.",
    description:
      "Browse verified parcels with full provenance — owner wallet, registration block, transfer history. Request a purchase, and the seller plus admin handle the handoff.",
    cta: { href: ROUTES.REGISTER, label: "Create buyer account" },
    secondaryCta: { href: ROUTES.MARKETPLACE, label: "Open marketplace" },
    bullets: [
      {
        icon: Search,
        title: "Filter by what matters",
        body: "Location, area, verified-only — the search respects how property is actually shopped.",
      },
      {
        icon: ShieldCheck,
        title: "Provenance on every card",
        body: "See the chain of ownership before you ever message the seller.",
      },
      {
        icon: ArrowRight,
        title: "Track your requests",
        body: "Five-state pipeline shows exactly where each request is — including the tx hash when it settles.",
      },
    ],
  },
  {
    id: "admin",
    label: "For Admins",
    eyebrow: "Govern with confidence",
    headline: "Moderate a registry, not a database.",
    description:
      "Approve new lands, review owner-approved transfers, moderate sale listings — all from one console. Every action is logged, signed, and on-chain.",
    cta: { href: ROUTES.LOGIN, label: "Admin sign in" },
    secondaryCta: { href: ROUTES.ADMIN, label: "Admin console" },
    bullets: [
      {
        icon: Gavel,
        title: "Two-tier review",
        body: "Owner approves first, you approve second — the chain is the third checkpoint.",
      },
      {
        icon: Users,
        title: "Full user oversight",
        body: "Identity, role, wallet, and activity in a single moderation surface.",
      },
      {
        icon: ShieldCheck,
        title: "Tamper-evident actions",
        body: "Approvals write tx hashes you can verify on any chain explorer.",
      },
    ],
  },
];

export function HomeRoles() {
  const [activeId, setActiveId] = useState<RolePanel["id"]>("owner");
  const active =
    panels.find((p) => p.id === activeId) ?? (panels[0] as RolePanel);

  return (
    <section id="roles" className="py-20 lg:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Built for everyone in the room</p>
          <h2 className="mt-3 text-3xl md:text-4xl">
            Pick your role — the dashboard adjusts.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Owners, buyers, and admins each get a surface that matches their
            job. No feature bloat, no role confusion.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div
            role="tablist"
            className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm"
          >
            {panels.map((p) => {
              const isActive = p.id === activeId;
              return (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveId(p.id)}
                  className="relative rounded-full px-5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-hover hover:text-foreground"
                >
                  {isActive && (
                    <motion.span
                      layoutId="role-pill"
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                      }}
                      className="absolute inset-0 -z-10 rounded-full bg-primary"
                    />
                  )}
                  <span
                    className={
                      isActive ? "text-primary-foreground" : "text-foreground"
                    }
                  >
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mt-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              className="grid gap-8 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-10 lg:grid-cols-[1fr_1fr] lg:gap-12"
            >
              <div>
                <p className="eyebrow">{active.eyebrow}</p>
                <h3 className="mt-3 text-2xl md:text-3xl">{active.headline}</h3>
                <p className="mt-4 text-muted-foreground">{active.description}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={active.cta.href}>
                      {active.cta.label}
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={active.secondaryCta.href}>
                      {active.secondaryCta.label}
                    </Link>
                  </Button>
                </div>
              </div>

              <ul className="grid gap-4">
                {active.bullets.map((b) => {
                  const Icon = b.icon;
                  return (
                    <li
                      key={b.title}
                      className="flex gap-4 rounded-xl border border-border bg-background p-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">
                          {b.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {b.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
