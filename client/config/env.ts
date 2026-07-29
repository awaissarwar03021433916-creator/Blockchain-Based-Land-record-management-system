/**
 * Typed environment access — the ONLY place `process.env` is read.
 *
 * Two rules enforced by this module:
 *   1. Every consumed variable is checked at boot. A missing or malformed
 *      var fails loudly with a precise message rather than producing a
 *      mysterious runtime error 30 minutes into a feature build.
 *   2. Consumers import strongly-typed properties (`env.API_BASE_URL`),
 *      not raw `process.env.NEXT_PUBLIC_*` access — so a rename or a
 *      validation tightening is a one-file edit.
 *
 * In Next.js, only variables prefixed `NEXT_PUBLIC_` are inlined into the
 * client bundle. Anything secret must NOT be added here.
 */

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to client/.env.local (see .env.example).`,
    );
  }
  return value.trim();
}

function url(name: string, value: string): string {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    throw new Error(
      `Environment variable ${name} must be a valid absolute URL — got "${value}".`,
    );
  }
  // Trim a trailing slash so callers can safely concatenate `${base}/api/...`.
  return value.replace(/\/+$/, "");
}

/**
 * Variant of `url()` for the API base — additionally enforces that the
 * URL has NO PATH COMPONENT. The architecture's convention is:
 *
 *   env.API_BASE_URL   = the host root (e.g. "http://localhost:5000")
 *   services           = paths starting with "/api/<resource>/..." matching
 *                        Express's app.use("/api/auth", ...) mounts
 *
 * Setting `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api` would silently
 * produce duplicate-prefix URLs like /api/api/auth/register — easy to miss
 * because Axios just concatenates strings. We fail loudly here instead.
 */
function hostUrl(name: string, value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `Environment variable ${name} must be a valid absolute URL — got "${value}".`,
    );
  }
  const path = parsed.pathname;
  if (path !== "" && path !== "/") {
    throw new Error(
      `Environment variable ${name} must be a host root WITHOUT a path — got "${value}" ` +
        `(path: "${path}"). Services include the "/api/<resource>" prefix themselves; ` +
        `setting this URL with "/api" produces "/api/api/..." requests. ` +
        `Use "${parsed.origin}" instead.`,
    );
  }
  return parsed.origin; // canonical host root, no trailing slash
}

function optional(value: string | undefined, fallback: string): string {
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim();
}

function intInRange(
  name: string,
  value: string,
  min: number,
  max: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(
      `Environment variable ${name} must be an integer between ${min} and ${max} — got "${value}".`,
    );
  }
  return parsed;
}

/* --------------------------------------------------------------------- */
/*  Defaults                                                              */
/* --------------------------------------------------------------------- */
// Sensible Ganache defaults so the dapp works out of the box. To switch
// to Sepolia / mainnet, override these in `.env.local`.
const DEFAULT_CHAIN_ID = "1337";
const DEFAULT_CHAIN_RPC_URL = "http://127.0.0.1:7545";

/**
 * Validated env object. Eager evaluation so misconfiguration surfaces at
 * module load (which in Next.js means at the start of the request the
 * importing module is first used, not deep inside an API call).
 */
export const env = {
  /**
   * Backend host root, e.g. "http://localhost:5000".
   * MUST NOT include a path — services prepend "/api/<resource>" themselves.
   */
  API_BASE_URL: hostUrl(
    "NEXT_PUBLIC_API_BASE_URL",
    required("NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL),
  ),

  /** EVM chain ID the dapp expects to interact with (1337 = local Ganache). */
  CHAIN_ID: intInRange(
    "NEXT_PUBLIC_CHAIN_ID",
    optional(process.env.NEXT_PUBLIC_CHAIN_ID, DEFAULT_CHAIN_ID),
    1,
    Number.MAX_SAFE_INTEGER,
  ),

  /** JSON-RPC endpoint for that chain. */
  CHAIN_RPC_URL: url(
    "NEXT_PUBLIC_CHAIN_RPC_URL",
    optional(process.env.NEXT_PUBLIC_CHAIN_RPC_URL, DEFAULT_CHAIN_RPC_URL),
  ),

  /** Convenience flags — `process.env.NODE_ENV` is set by Next itself. */
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
} as const;

export type Env = typeof env;
