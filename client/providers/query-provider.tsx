"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";

/**
 * Devtools are a dev-only, non-critical overlay. Loading them via `dynamic`
 * with `ssr: false` keeps the (sizeable) devtools bundle out of the initial
 * module graph and off the server-render path — it's fetched lazily in the
 * browser only. In production the import below is never referenced, so it is
 * tree-shaken away entirely.
 */
const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then((m) => m.ReactQueryDevtools),
  { ssr: false },
);

/**
 * QueryClient defaults.
 *
 * Conservative server-state policy chosen for a registry/marketplace:
 *   • staleTime 30s — most lists tolerate light staleness.
 *   • gcTime 5m    — unused queries linger long enough for tab-switching.
 *   • refetchOnWindowFocus off — with a 30s staleTime, mutation-driven
 *     invalidation, and explicit refresh buttons, re-fetching every list on
 *     each tab focus was pure redundant traffic against the (remote) API.
 *   • retry only on 5xx, and only once — never re-attempt validation errors
 *     or 4xx auth/permission failures (those won't resolve themselves).
 *   • mutations never auto-retry — chain calls are non-idempotent.
 *
 * The QueryClient is created inside a `useState` initializer so each
 * browser session gets a single client, but server-rendered passes never
 * share one across requests (avoids cross-tenant cache bleeds).
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error: unknown) => {
          // Only auto-retry transient server errors, once.
          if (failureCount >= 1) return false;
          const status = (error as { status?: number } | null)?.status;
          return typeof status === "number" && status >= 500;
        },
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // `useState` initializer ensures one client per mount, not one per render.
  const [client] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      ) : null}
    </QueryClientProvider>
  );
}
