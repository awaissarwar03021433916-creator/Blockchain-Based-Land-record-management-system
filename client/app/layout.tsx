import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { cn } from "@/lib/utils";
import "./globals.css";

/**
 * Font loading:
 *   - Inter      — UI body sans
 *   - Fraunces   — editorial serif for H1–H3 (the "official document" weight)
 *   - JetBrains Mono — tabular mono for chain primitives (tx hashes, addresses)
 *
 * Each font is exposed as a CSS variable consumed by `tailwind.config.ts`
 * (`fontFamily.sans` / `serif` / `mono`). This keeps font wiring out of every
 * component and lets the design system reference a single name.
 */
const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontSerif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Land Registry — Blockchain Property Marketplace",
    template: "%s · Land Registry",
  },
  description:
    "Verified on-chain land ownership records and marketplace.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground",
          fontSans.variable,
          fontSerif.variable,
          fontMono.variable,
        )}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
