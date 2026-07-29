import type { Role } from "./role";

/**
 * Authenticated user — shape returned to the frontend.
 * Mirrors `server/models/User.model.js` minus the password hash.
 * `walletAddress` is optional because users may register without one and
 * link a wallet later via the profile flow.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  walletAddress?: string;
}
