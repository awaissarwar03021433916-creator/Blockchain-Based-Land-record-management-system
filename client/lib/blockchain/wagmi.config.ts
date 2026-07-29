import { createConfig, createStorage, cookieStorage, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { env } from "@/config/env";
import { supportedChains } from "./chains";

/**
 * wagmi v2 configuration — the ONLY place wagmi is wired.
 *
 * Decisions:
 *   • `injected()` connector — MetaMask (and any other EIP-1193 wallet the
 *     user has). Adding WalletConnect later is a one-line `connectors:`
 *     append; the architecture doesn't change.
 *   • `transports` map keyed by chain id — each chain gets its own HTTP
 *     RPC. viem's `http()` autoselects a sensible polling interval.
 *   • `ssr: true` + `cookieStorage` — Next.js App Router renders server
 *     and client; without this, the wallet "connected" state would flicker
 *     on hydration. Cookie-backed storage lets server-render know the
 *     account ahead of the client hydration step.
 *
 * The result is the single Config object consumed by WalletProvider.
 * Every wagmi hook (`useAccount`, `useConnect`, `useChainId`, …) reads
 * from this config — there is no other source.
 */

// Build the `transports` object dynamically from the supported chains
// tuple so adding a new chain in `chains.ts` doesn't require editing
// two files. `Object.fromEntries` is fine here — the shape is small and
// fully determined at module load.
const transports = Object.fromEntries(
  supportedChains.map((chain) => [
    chain.id,
    http(chain.rpcUrls.default.http[0], {
      // In dev, don't burn time retrying a local Ganache that may be off —
      // fail fast (one attempt) instead of the default retry-with-backoff,
      // which otherwise stalls wallet hooks for seconds on every mount.
      retryCount: env.IS_DEVELOPMENT ? 0 : 3,
    }),
  ]),
);

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected({ shimDisconnect: true }),
  ],
  transports,
  // Block-watching poll interval. wagmi defaults to 4s; a local dev node
  // doesn't need that cadence, so we poll a third as often to cut the steady
  // stream of background `eth_blockNumber` RPC calls during development.
  pollingInterval: env.IS_DEVELOPMENT ? 12_000 : 4_000,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

/**
 * Module-augmented Register so `useAccount()` etc. infer the right
 * chain union (`SupportedChain['id']` instead of `number`). Removing
 * this would silently degrade type-safety in every wagmi hook.
 */
declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
