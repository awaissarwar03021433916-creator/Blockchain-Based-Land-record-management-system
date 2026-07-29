/**
 * Centralized React Query key factory.
 *
 * Every cache key in the app is built from this object — never inline as
 * `["something"]` at a call site — so:
 *   • renames are a one-file edit;
 *   • invalidation can target prefixes (`qk.lands.all` invalidates every
 *     lands-* query) without string fragility;
 *   • TypeScript catches typos at compile time via `as const`.
 *
 * Convention: a leaf key is a tuple; a node that branches (with `byId(...)`)
 * is an object whose own keys are tuples or factories returning tuples.
 */
export const qk = {
  auth: {
    me: ["auth", "me"] as const,
  },
  lands: {
    all: ["lands"] as const,
    mine: ["lands", "mine"] as const,
    byId: (id: string) => ["lands", "by-id", id] as const,
    history: (id: string) => ["lands", "by-id", id, "history"] as const,
    adminQueue: ["lands", "admin-queue"] as const,
  },
  listings: {
    marketplace: ["listings", "marketplace"] as const,
    adminPending: ["listings", "admin-pending"] as const,
    mine: ["listings", "mine"] as const,
    byId: (id: string) => ["listings", "by-id", id] as const,
  },
  transfers: {
    mine: ["transfers", "mine"] as const,
    ownerInbox: ["transfers", "owner-inbox"] as const,
    adminQueue: ["transfers", "admin-queue"] as const,
  },
  admin: {
    dashboard: ["admin", "dashboard"] as const,
    pendingLands: ["admin", "pending-lands"] as const,
    pendingTransfers: ["admin", "pending-transfers"] as const,
    pendingListings: ["admin", "pending-listings"] as const,
  },
  owner: {
    myLands: ["owner", "my-lands"] as const,
    myListings: ["owner", "my-listings"] as const,
    transferRequests: ["owner", "transfer-requests"] as const,
    history: ["owner", "history"] as const,
  },
} as const;
