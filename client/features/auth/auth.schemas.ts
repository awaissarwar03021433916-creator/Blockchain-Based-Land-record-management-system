import { z } from "zod";
import { ROLE } from "@/types/role";

/**
 * Zod schemas for auth forms.
 *
 * Mirror the backend's `server/middlewares/validate.middleware.js` rules
 * exactly so that client-side validation rejects the same inputs the
 * server would. Server is still the authority — these are UX, not security.
 *
 * Constraints kept in lockstep:
 *   - name:             min 2 chars
 *   - email:            valid email
 *   - password:         min 6 chars
 *   - role at signup:   "owner" or "buyer" only (admin is reserved by ADMIN_EMAIL)
 *
 * `confirmPassword` is a client-only field, so it has no server analogue;
 * the matching check is enforced via `.refine(...)`.
 */

/* ---------------------------- login schema ------------------------------ */

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/* --------------------------- register schema ---------------------------- */

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

/**
 * Ethereum address regex — mirrors `ETH_ADDRESS_REGEX` in
 * `server/middlewares/validate.middleware.js`. EIP-55 checksum is not
 * enforced here; viem handles that at the chain-read boundary.
 */
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(120, "Name is too long")
      .trim(),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum([ROLE.OWNER, ROLE.BUYER], {
      required_error: "Choose how you'll use the platform",
    }),
    // Optional — populated by the MetaMask connect flow. Empty string is
    // treated as "not provided"; the connected wrapper omits the field
    // from the API payload rather than sending "".
    walletAddress: z
      .string()
      .optional()
      .refine(
        (value) => !value || ETH_ADDRESS_REGEX.test(value),
        "Invalid Ethereum address",
      ),
  })
  // Cross-field check — runs after the per-field checks. We path the error
  // onto `confirmPassword` so it lights up that field, not the whole form.
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
