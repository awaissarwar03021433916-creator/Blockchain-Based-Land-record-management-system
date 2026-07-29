"use client";

import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  FileCheck2,
  History,
  LockKeyhole,
  ShieldCheck,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Immutable ownership ledger",
    body: "Every parcel is anchored to a smart contract. Once an admin verifies, the record is permanent — no quiet edits, no lost files.",
  },
  {
    icon: FileCheck2,
    title: "Government-grade verification",
    body: "A two-tier approval pipeline — owner attestation plus admin review — before any land or transfer ever touches the chain.",
  },
  {
    icon: LockKeyhole,
    title: "Wallet-signed transfers",
    body: "MetaMask signatures bind real identity to on-chain actions, so the address that owns a parcel is provably the person you talked to.",
  },
  {
    icon: Store,
    title: "Marketplace with provenance",
    body: "Buyers browse only verified listings. Every card shows live chain status, owner wallet, and the full registration trail.",
  },
  {
    icon: ArrowLeftRight,
    title: "Two-tier transfer requests",
    body: "Five-state machine routes a request from buyer → owner → admin → chain, with clear handoffs and reversible drafts.",
  },
  {
    icon: History,
    title: "Append-only history",
    body: "Every transfer writes a permanent row: previous owner, new owner, tx hash, block number. Audits are a single query.",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0, 0, 1] as const } },
};

export function HomeFeatures() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">What you get</p>
          <h2 className="mt-3 text-3xl md:text-4xl">
            Land records, finally fit for the way we move money.
          </h2>
          <p className="mt-4 text-muted-foreground">
            We rebuilt the registry from the contract up — provable origin,
            programmable transfer, and a UI that respects how heavy a deed
            really is.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.article
                key={f.title}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-6 transition-shadow duration-ui hover:shadow-md"
              >
                <span
                  aria-hidden
                  className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-100 opacity-0 transition-opacity duration-ui group-hover:opacity-60"
                />
                <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="relative mt-4 text-lg">{f.title}</h3>
                <p className="relative mt-2 text-sm text-muted-foreground">
                  {f.body}
                </p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
