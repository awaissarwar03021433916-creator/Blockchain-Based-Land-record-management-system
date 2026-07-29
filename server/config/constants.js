// Application-wide constants. Non-secret configuration is defined here once
// and imported wherever needed — never duplicated as inline literals.

// The single account provisioned as admin. The "admin" role is granted only
// to this email (at registration, re-affirmed at login) and can never be
// self-assigned via the request body. Overridable with the ADMIN_EMAIL env var.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "adminawais898@gmail.com";

// Roles a user is allowed to choose for themselves at registration.
export const SELF_ASSIGNABLE_ROLES = ["owner", "buyer"];

// bcrypt work factor. Hashing cost grows exponentially with the round count;
// 10 (~100ms/hash) is the right production security floor, but it makes every
// register — and every login compare — noticeably slow in local development.
// We drop to 8 (~4x faster) OUTSIDE production so the dev auth flow is snappy,
// while production stays at 10. Explicitly overridable via BCRYPT_ROUNDS.
// NOTE: a hash carries its own cost factor, so lowering this only affects
// hashes created afterwards — existing production hashes still verify.
export const BCRYPT_SALT_ROUNDS = Number(
  process.env.BCRYPT_ROUNDS ??
    (process.env.NODE_ENV === "production" ? 10 : 8)
);
