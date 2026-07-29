"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";
import { ROLE, type Role } from "@/types/role";
import {
  selectHasHydrated,
  selectIsAuthenticated,
  selectRole,
  useAuthStore,
} from "@/stores/auth.store";

const ANCHORS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#roles", label: "For you" },
  { href: "#marketplace", label: "Marketplace" },
] as const;

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

export function HomeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasHydrated = useAuthStore(selectHasHydrated);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectRole);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showAuthedCta = hasHydrated && isAuthenticated && role !== null;
  const dashboardHref = showAuthedCta ? dashboardForRole(role) : ROUTES.LOGIN;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-ui ease-out-soft",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href={ROUTES.HOME}
          className="group flex items-center gap-2"
          aria-label="Land Registry — home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition-transform duration-hover group-hover:-rotate-3 group-hover:scale-105">
            <Shield className="h-5 w-5" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">
            Land<span className="text-primary">Chain</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {ANCHORS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-hover hover:bg-brand-100 hover:text-brand-900"
            >
              {a.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {showAuthedCta ? (
            <Button asChild>
              <Link href={dashboardHref}>Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href={ROUTES.LOGIN}>Log in</Link>
              </Button>
              <Button asChild>
                <Link href={ROUTES.REGISTER}>Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input text-foreground transition-colors duration-hover hover:bg-brand-100 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="border-t border-border bg-background md:hidden"
          >
            <div className="container flex flex-col gap-1 py-4">
              {ANCHORS.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-hover hover:bg-brand-100 hover:text-brand-900"
                >
                  {a.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                {showAuthedCta ? (
                  <Button asChild className="w-full">
                    <Link href={dashboardHref}>Go to dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={ROUTES.LOGIN}>Log in</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href={ROUTES.REGISTER}>Get started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
