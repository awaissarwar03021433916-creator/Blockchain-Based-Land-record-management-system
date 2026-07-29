import type { NextConfig } from "next";

/**
 * Next.js config.
 *
 * wagmi v2's connector barrel statically references a handful of optional
 * dependencies (React-Native / Node-only) that a browser-only dapp never
 * runs. They must be aliased away or the compiler errors with
 * "Module not found: @react-native-async-storage/…". We do this for BOTH
 * bundlers so `next dev --turbopack` (development) and `next build`
 * (webpack, production) behave identically:
 *
 *   • Turbopack → `turbopack.resolveAlias` maps them to `lib/empty-module.ts`
 *     (Turbopack can't alias to `false`, so it needs a real empty module).
 *   • Webpack   → `webpack.resolve.alias` maps them to `false` (treated as
 *     an empty module).
 *
 * Aliased modules:
 *   • @react-native-async-storage/async-storage — RN storage shim (@metamask/sdk).
 *   • pino-pretty — optional log formatter pulled by wagmi/viem deps.
 *   • encoding — optional charset library pulled by node-fetch.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  /**
   * Barrel-file optimization. Packages like framer-motion, wagmi/viem and the
   * icon set re-export hundreds of symbols from a single entry point; without
   * this, importing one icon forces Webpack to walk the entire barrel on every
   * dev compile. `optimizePackageImports` rewrites those imports to their exact
   * submodules, cutting per-route dev-compile module counts (and cold-start
   * time) substantially. It is transparent — no functional or API change.
   */
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "wagmi",
      "viem",
      "@tanstack/react-query",
      "@tanstack/react-query-devtools",
      "sonner",
    ],
  },
  // Turbopack (dev): alias the optional deps to an empty module.
  turbopack: {
    // Pin the workspace root to this `client/` dir. Without it Turbopack sees
    // both the repo-root and client lockfiles and warns about an inferred root.
    root: import.meta.dirname,
    resolveAlias: {
      "@react-native-async-storage/async-storage": "./lib/empty-module.ts",
      "pino-pretty": "./lib/empty-module.ts",
      encoding: "./lib/empty-module.ts",
    },
  },
  // Webpack (production build): alias the same optional deps to `false`.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | false | string[]>),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      encoding: false,
    };
    return config;
  },
};

export default nextConfig;
