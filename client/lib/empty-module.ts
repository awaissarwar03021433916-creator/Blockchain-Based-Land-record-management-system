/**
 * Intentionally-empty module.
 *
 * Turbopack's `resolveAlias` (unlike Webpack's `alias`) can't map a request to
 * `false`, so the optional React-Native / logging deps that wagmi's connector
 * barrel statically references — but that a browser-only dapp never runs — are
 * aliased to THIS module instead. Importing it yields an empty object, which is
 * the correct behavior for those never-executed code paths. See `next.config.ts`.
 */
export default {};
