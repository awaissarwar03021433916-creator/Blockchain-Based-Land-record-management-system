"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

export function HomeCta() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
          className="relative overflow-hidden rounded-3xl border border-brand-700/30 bg-primary px-6 py-14 text-primary-foreground shadow-xl md:px-16 md:py-20"
        >
          <div
            aria-hidden
            className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-200/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
                Free for owners and buyers
              </span>
              <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight text-white md:text-4xl lg:text-5xl">
                Stop trusting paper. Start trusting the chain.
              </h2>
              <p className="mt-4 max-w-xl text-white/80">
                Create an account in under a minute, connect MetaMask, and
                register your first parcel today. We handle the registry —
                you keep the keys.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-end">
              <Button asChild size="lg" variant="accent" className="group w-full sm:w-auto md:w-full">
                <Link href={ROUTES.REGISTER}>
                  Get started — it's free
                  <ArrowRight className="transition-transform duration-hover group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto md:w-full"
              >
                <Link href={ROUTES.MARKETPLACE}>Explore marketplace</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
