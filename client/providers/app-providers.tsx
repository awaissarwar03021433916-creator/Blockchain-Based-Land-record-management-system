"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { WalletProvider } from "./wallet-provider";
import { QueryProvider } from "./query-provider";
import { ToastProvider } from "./toast-provider";

/**
 * AppProviders — the composition root.
 *
 * Composition order matters:
 *   ThemeProvider     (outermost — class lands on <html> before anything paints)
 *     └─ WalletProvider  (wagmi MUST sit outside QueryClientProvider in v2)
 *          └─ QueryProvider  (devtools mount inside the themed + wagmi surface)
 *               └─ children  (the actual app)
 *                    └─ ToastProvider  (portal — sibling, NOT wrapping, so it
 *                                       never blocks tree-level providers from
 *                                       rendering when the toaster errors out)
 *
 * This file is the ONLY place provider order is decided. Future providers
 * (e.g. AuthProvider for session bootstrap) plug in here and nowhere else.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>
        <QueryProvider>
          {children}
          <ToastProvider />
        </QueryProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
