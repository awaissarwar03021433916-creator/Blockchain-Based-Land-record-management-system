"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { FileSignature, Landmark, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    icon: FileSignature,
    title: "Submit your parcel",
    body: "Register a plot with documents and your wallet address. We snapshot identity at submission so future disputes stay clean.",
  },
  {
    icon: ShieldCheck,
    title: "Admin verifies on-chain",
    body: "An authorized admin signs off after document review. The land is minted to your wallet — chain first, database second.",
  },
  {
    icon: Landmark,
    title: "Sell, transfer, or hold",
    body: "List for sale, accept a buyer's request, or just hold. Every state change writes an immutable history row.",
  },
];

export function HomeHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-y border-border bg-secondary/40 py-20 lg:py-28"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_0%,hsl(var(--background))_0%,transparent_60%)]"
      />
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl md:text-4xl">
            Three steps from signed PDF to sovereign deed.
          </h2>
          <p className="mt-4 text-muted-foreground">
            The pipeline is built around a single, simple promise — the chain
            is the source of truth, and the UI never lets you forget it.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
          <ol className="space-y-5">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.1,
                    ease: [0.2, 0, 0, 1],
                  }}
                  className="group relative flex gap-5 rounded-xl border border-border bg-card p-5 shadow-sm transition-transform duration-hover hover:-translate-y-0.5"
                >
                  <div className="relative">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground shadow-sm">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="relative aspect-[5/4] w-full">
                <Image
                  src="https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80"
                  alt="A pen signing a property document on a desk"
                  fill
                  sizes="(min-width: 1024px) 540px, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/40 via-transparent to-transparent" />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.2, 0, 0, 1] }}
              className="absolute -bottom-6 -right-4 hidden w-64 rounded-xl border border-border bg-card p-4 shadow-lg sm:block"
            >
              <p className="eyebrow">Latest block</p>
              <p className="mt-2 font-chain text-sm text-foreground">
                0xb19f…a4c1
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-2 w-2 rounded-full bg-accent" />
                Confirmed · 12s ago
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
