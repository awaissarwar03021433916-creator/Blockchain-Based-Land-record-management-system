"use client";

import { useCallback, useMemo } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import type { Address } from "viem";
import { defaultChain, isSupportedChainId } from "@/lib/blockchain/chains";

/**
 * Composite wallet hook.
 *
 * Most components only need a small slice of wagmi's surface — "am I
 * connected, what's my address, what chain am I on, how do I connect or
 * disconnect." This hook bundles those into one object so connect-wallet
 * buttons and chain-warning badges don't each import six wagmi hooks.
 *
 * Specialized flows (signing messages, writing contracts, waiting for
 * receipts) should still reach for the dedicated wagmi hooks directly —
 * the goal here is convenience, not abstraction.
 */
export interface UseWalletReturn {
  /** Connected EOA. `null` when no wallet is connected. */
  address: Address | null;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  isDisconnected: boolean;

  /** Currently selected chain id from the wallet. */
  chainId: number;
  /** True when the connected chain is one the dapp supports. */
  isOnSupportedChain: boolean;

  /**
   * Trigger a connect attempt. Prefers an injected (MetaMask / browser)
   * wallet. Resolves when the user accepts the prompt or rejects it.
   */
  connect: () => void;
  /** True while a connect attempt is in flight. */
  isConnectPending: boolean;
  /** The error from the last connect attempt, if any. */
  connectError: Error | null;

  /** Drop the current wallet connection. */
  disconnect: () => void;
  isDisconnectPending: boolean;

  /** Switch the wallet to the dapp's default chain. */
  switchToDefaultChain: () => void;
  isSwitchPending: boolean;

  /** True iff `window.ethereum` (or any injected provider) is detected. */
  hasInjectedWallet: boolean;
}

export function useWallet(): UseWalletReturn {
  const account = useAccount();
  const chainId = useChainId();

  const connectors = useConnectors();
  const injectedConnector = useMemo(
    () => connectors.find((c) => c.type === "injected"),
    [connectors],
  );

  const {
    connect: wagmiConnect,
    isPending: isConnectPending,
    error: connectError,
  } = useConnect();
  const { disconnect: wagmiDisconnect, isPending: isDisconnectPending } =
    useDisconnect();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();

  const hasInjectedWallet = injectedConnector !== undefined;

  // Stable callback identities — without these, every render hands consumers
  // brand-new function references, defeating `React.memo`/effect-dep checks in
  // connect buttons and chain badges and forcing needless re-renders.
  const connect = useCallback(() => {
    if (!injectedConnector) return;
    wagmiConnect({ connector: injectedConnector });
  }, [injectedConnector, wagmiConnect]);

  const disconnect = useCallback(() => wagmiDisconnect(), [wagmiDisconnect]);

  const switchToDefaultChain = useCallback(
    () => switchChain({ chainId: defaultChain.id }),
    [switchChain],
  );

  // Memoize the returned bag so its identity only changes when a real input
  // changes — a component that spreads/passes this object down doesn't
  // re-render on unrelated parent renders.
  return useMemo<UseWalletReturn>(
    () => ({
      address: (account.address ?? null) as Address | null,
      isConnected: account.isConnected,
      isConnecting: account.isConnecting,
      isReconnecting: account.isReconnecting,
      isDisconnected: account.isDisconnected,

      chainId,
      isOnSupportedChain: isSupportedChainId(chainId),

      connect,
      isConnectPending,
      connectError: connectError ?? null,

      disconnect,
      isDisconnectPending,

      switchToDefaultChain,
      isSwitchPending,

      hasInjectedWallet,
    }),
    [
      account.address,
      account.isConnected,
      account.isConnecting,
      account.isReconnecting,
      account.isDisconnected,
      chainId,
      connect,
      isConnectPending,
      connectError,
      disconnect,
      isDisconnectPending,
      switchToDefaultChain,
      isSwitchPending,
      hasInjectedWallet,
    ],
  );
}
