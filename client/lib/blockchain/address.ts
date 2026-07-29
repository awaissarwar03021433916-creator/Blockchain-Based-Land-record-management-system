import { getAddress, isAddress as viemIsAddress, type Address } from "viem";

/**
 * Address helpers.
 *
 * Ethereum addresses are mixed-case in their EIP-55 checksummed form. They
 * are compared lowercased, displayed checksummed, and validated against a
 * strict regex (already implemented by viem). This module centralises all
 * of that so every component renders addresses the same way.
 */

const TRUNCATE_PREFIX = 6; // "0x" + 4 leading hex chars
const TRUNCATE_SUFFIX = 4;

/** Truthy strict check (uses viem's regex + checksum validation). */
export function isValidAddress(value: unknown): value is Address {
  return typeof value === "string" && viemIsAddress(value);
}

/**
 * Convert any address-shaped string to its EIP-55 checksum form. Throws
 * on invalid input — callers should isValidAddress() first if they can't
 * guarantee the source.
 */
export function toChecksum(address: string): Address {
  return getAddress(address);
}

/**
 * Compare two addresses case-insensitively. Returns false on any invalid
 * input so it's safe to pass user-supplied data.
 */
export function equalAddress(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (!viemIsAddress(a) || !viemIsAddress(b)) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export interface FormatAddressOptions {
  /** Number of hex characters AFTER `0x` to keep at the start. Default 4. */
  prefixChars?: number;
  /** Number of hex characters to keep at the end. Default 4. */
  suffixChars?: number;
  /**
   * If true (default), the address is checksummed before truncation so the
   * displayed prefix and suffix carry the proper mixed-case EIP-55 signal.
   */
  checksum?: boolean;
}

/**
 * Render an address as `0xAb12…cF34`. Mono UI primitives use this as their
 * default display. Pass full = true (via no prefix/suffix) for callers that
 * need the untruncated checksummed form.
 */
export function formatAddress(
  address: string | null | undefined,
  options: FormatAddressOptions = {},
): string {
  if (!address) return "";
  if (!viemIsAddress(address)) return address;

  const {
    prefixChars = TRUNCATE_PREFIX - 2, // exclude the "0x" from the count
    suffixChars = TRUNCATE_SUFFIX,
    checksum = true,
  } = options;

  const checksummed = checksum ? getAddress(address) : address;

  // 2 ("0x") + prefixChars + 4 (ellipsis padding) + suffixChars; under this
  // length truncation produces no visual gain — just return the full thing.
  if (checksummed.length <= 2 + prefixChars + suffixChars + 4) {
    return checksummed;
  }

  const head = checksummed.slice(0, 2 + prefixChars);
  const tail = checksummed.slice(-suffixChars);
  return `${head}…${tail}`;
}

/** Convenience — the common case (`0xAb12…cF34`). */
export function shortAddress(address: string | null | undefined): string {
  return formatAddress(address);
}
