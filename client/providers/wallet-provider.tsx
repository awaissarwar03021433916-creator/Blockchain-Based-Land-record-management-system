"use client";

import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/blockchain/wagmi.config";

/**
 * WalletProvider — wraps the tree in wagmi's WagmiProvider so every
 * descendant can call `useAccount`, `useConnect`, `useDisconnect`, etc.
 *
 * Composition note:
 *   WagmiProvider MUST sit OUTSIDE QueryClientProvider — wagmi v2's
 *   internals (account caching, RPC batching) rely on the React Query
 *   client, but its own provider must establish the wagmi context first.
 *   The composition is enforced by `providers/app-providers.tsx`:
 *
 *     <ThemeProvider>
 *       <WalletProvider>          ← here
 *         <QueryProvider>
 *           {children}
 *           <ToastProvider />
 *         </QueryProvider>
 *       </WalletProvider>
 *     </ThemeProvider>
 *
 * Server-render safety: the config is built with `ssr: true` and
 * `cookieStorage`, so this provider can render on the server without a
 * hydration flicker on the wallet-connected state.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
