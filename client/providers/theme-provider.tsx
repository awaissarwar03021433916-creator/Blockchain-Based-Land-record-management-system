"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme provider — wraps `next-themes` with project defaults.
 *
 * Light-first by design: the registry is intended to feel like a calm
 * institutional surface, not a developer console. `enableSystem={false}`
 * locks it to light for now; flipping these flags later is a one-line
 * change that opens dark-mode support without rewriting any component.
 *
 * `suppressHydrationWarning` is set on <html> in `app/layout.tsx`, which
 * `next-themes` requires to apply the class before hydration without
 * triggering a React warning.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
