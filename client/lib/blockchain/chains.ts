import { defineChain } from "viem";
import { env } from "@/config/env";

/**
 * Chain definitions.
 *
 * Single source of truth for every chain the dapp talks to. The wagmi
 * config in `wagmi.config.ts` consumes `supportedChains` and the address
 * helpers in `address.ts` reach for `defaultChain` when they need a chain
 * id (e.g. to build a block-explorer URL).
 *
 * Today we only ship one chain — local Ganache, env-driven so a one-line
 * `.env.local` change switches the dapp to Sepolia / mainnet. Adding a
 * new chain is one `defineChain` + one entry in `supportedChains`.
 */

/** Local Ganache, driven entirely by env.CHAIN_ID + env.CHAIN_RPC_URL. */
export const localGanache = defineChain({
  id: env.CHAIN_ID,
  name: "Ganache",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [env.CHAIN_RPC_URL] },
  },
  // No public block explorer for a local node; UI components fall back
  // to a "view raw tx" affordance when `blockExplorers` is absent.
  testnet: true,
});

/**
 * The tuple of chains the dapp supports.
 *
 * Typed as a non-empty readonly tuple `[Chain, ...Chain[]]` so wagmi's
 * `createConfig` is happy with the type and so a future add doesn't lose
 * type-info from the rest of the tuple.
 */
export const supportedChains = [localGanache] as const;

export type SupportedChain = (typeof supportedChains)[number];

/** The chain the dapp prefers when no specific one is in context. */
export const defaultChain: SupportedChain = localGanache;

/**
 * Predicate — is the given chain id one the dapp supports? Used by
 * components that need to warn "wrong network" before letting the user
 * sign a tx that would land on the wrong chain.
 */
export function isSupportedChainId(chainId: number | undefined): boolean {
  if (chainId === undefined) return false;
  return supportedChains.some((c) => c.id === chainId);
}
