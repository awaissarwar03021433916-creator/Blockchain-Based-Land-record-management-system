import { AxiosError } from "axios";

/**
 * Typed error hierarchy for HTTP failures.
 *
 * The backend emits several response shapes:
 *   • 400 validation : { message: "Validation failed", errors: string[] }
 *   • 4xx / 404 / 409: { message: string }
 *   • 5xx controller : { error: string }          (legacy catch-block shape)
 *   • 502 chain      : { message, error?: string} (transferLandOnChain failure)
 *
 * This module classifies them into named subclasses so feature code can
 * `if (err instanceof ConflictError) ...` instead of branching on numbers
 * and shape-sniffing.
 *
 * Every class carries:
 *   • `status`   — the HTTP status (or 0 for transport-level failures)
 *   • `code`     — a stable string ("VALIDATION" / "CONFLICT" / …) so logs
 *                  and analytics can pivot on it
 *   • `data`     — the raw response body, kept for debugging
 */

export type ApiErrorCode =
  | "VALIDATION"
  | "AUTH"
  | "PERMISSION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "CHAIN"
  | "SERVER"
  | "NETWORK"
  | "UNKNOWN";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly data: unknown;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    data?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

/** 400 — the boundary validation middleware. Carries the `errors` array. */
export class ValidationError extends ApiError {
  public readonly errors: string[];

  constructor(message: string, errors: string[], data?: unknown) {
    super("VALIDATION", 400, message, data);
    this.errors = errors;
  }
}

/** 401 — missing/expired/invalid JWT. The client should drop the session. */
export class AuthError extends ApiError {
  constructor(message = "Not authenticated", data?: unknown) {
    super("AUTH", 401, message, data);
  }
}

/** 403 — authenticated but not allowed (role gate / data-level scoping). */
export class PermissionError extends ApiError {
  constructor(message = "You do not have permission to perform this action", data?: unknown) {
    super("PERMISSION", 403, message, data);
  }
}

/** 404 — resource not found. */
export class NotFoundError extends ApiError {
  constructor(message = "Resource not found", data?: unknown) {
    super("NOT_FOUND", 404, message, data);
  }
}

/** 409 — stale state / duplicate / atomic-claim races. */
export class ConflictError extends ApiError {
  constructor(message = "Conflict", data?: unknown) {
    super("CONFLICT", 409, message, data);
  }
}

/** 502 — backend tried a blockchain tx and it failed/reverted. */
export class ChainError extends ApiError {
  public readonly reason: string | undefined;
  constructor(message: string, reason: string | undefined, data?: unknown) {
    super("CHAIN", 502, message, data);
    this.reason = reason;
  }
}

/** 5xx — any non-502 server error. */
export class ServerError extends ApiError {
  constructor(status: number, message = "Internal server error", data?: unknown) {
    super("SERVER", status, message, data);
  }
}

/** No HTTP response at all — DNS, offline, timeout, CORS, request cancel. */
export class NetworkError extends ApiError {
  constructor(message = "Unable to reach the server") {
    super("NETWORK", 0, message);
  }
}

/* ------------------------------------------------------------------ */
/*  normalizeApiError                                                  */
/* ------------------------------------------------------------------ */

interface BackendShape {
  message?: string;
  error?: string;
  errors?: string[];
}

/**
 * Map an arbitrary thrown value (almost always an AxiosError) onto the
 * appropriate ApiError subclass. Safe to call with anything — returns an
 * UNKNOWN-coded ApiError as a last resort so callers can always rely on
 * `err instanceof ApiError`.
 */
export function normalizeApiError(thrown: unknown): ApiError {
  if (thrown instanceof ApiError) return thrown;

  if (thrown instanceof AxiosError) {
    // Transport-level: request made but no response received.
    if (!thrown.response) {
      // Distinguish cancel (axios sets code "ERR_CANCELED") for callers
      // that want to ignore aborts, but still surface as NetworkError.
      const message =
        thrown.code === "ERR_CANCELED"
          ? "Request was cancelled"
          : thrown.message || "Unable to reach the server";
      return new NetworkError(message);
    }

    const { status, data } = thrown.response;
    const body = (data ?? {}) as BackendShape;

    // Backend uses both {message} and {error}; pick whichever is present.
    const message =
      (typeof body.message === "string" && body.message) ||
      (typeof body.error === "string" && body.error) ||
      thrown.message ||
      "Request failed";

    switch (status) {
      case 400:
        return new ValidationError(
          message,
          Array.isArray(body.errors) ? body.errors : [],
          data,
        );
      case 401:
        return new AuthError(message, data);
      case 403:
        return new PermissionError(message, data);
      case 404:
        return new NotFoundError(message, data);
      case 409:
        return new ConflictError(message, data);
      case 502:
        // The backend's transferLandOnChain failure path returns
        // { message, error: <chainReason> }. Surface the chain reason
        // explicitly so UIs can show it inline.
        return new ChainError(
          message,
          typeof body.error === "string" ? body.error : undefined,
          data,
        );
      default:
        if (status >= 500) return new ServerError(status, message, data);
        // Other 4xx — generic ApiError.
        return new ApiError("UNKNOWN", status, message, data);
    }
  }

  // Anything else (TypeError, bare string thrown, etc.)
  const message = thrown instanceof Error ? thrown.message : String(thrown);
  return new ApiError("UNKNOWN", 0, message);
}

/**
 * Convenience for components: turn an ApiError (or anything) into the single
 * user-facing string that should appear in a toast. Validation errors get
 * their first specific message instead of the generic "Validation failed"
 * envelope, because the specific reason is what the user needs to act on.
 */
export function getDisplayMessage(err: unknown): string {
  const normalized = normalizeApiError(err);
  if (normalized instanceof ValidationError && normalized.errors[0]) {
    return normalized.errors[0];
  }
  return normalized.message;
}
