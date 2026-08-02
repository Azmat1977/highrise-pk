/**
 * lib/auth/passwordPolicy.ts
 *
 * Sprint 3 Batch A — Password Policy Service
 *
 * ONE canonical location for all password validation rules.
 * Import validatePassword() from here — never redefine rules elsewhere.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   import { validatePassword } from "@/lib/auth/passwordPolicy";
 *
 *   const result = validatePassword(plainTextPassword);
 *   if (!result.valid) {
 *     return sendError(res, 400, result.reason, requestId, "WEAK_PASSWORD");
 *   }
 *
 * ─── Where This Is Used ──────────────────────────────────────────────────────
 *
 *   pages/api/auth/send-signup-code.ts   — validate at send time (Sprint 3B)
 *   pages/api/auth/verify-signup-code.ts — removed (validated at send time)
 *   pages/api/auth/reset-password.ts     — validate new password (Sprint 4)
 *   pages/api/admin/users/[id]/index.ts  — admin force-change (Sprint 4)
 *
 * ─── Policy (Enterprise) ─────────────────────────────────────────────────────
 *
 *   Minimum length : 12 characters
 *   Required chars : lowercase + uppercase + digit + special
 *   Blocked        : common/well-known passwords
 *
 *   NOTE: Breach-check (HaveIBeenPwned API) is intentionally NOT done here.
 *   Breach-check is a network call and belongs in the registration API only,
 *   not in this synchronous policy module. Add it as a separate async helper
 *   in the registration flow when needed.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Common/well-known passwords blocked regardless of meeting complexity rules.
 * Keep this list small and focused — it is not a substitute for breach-check.
 * Extend via BLOCKED_PASSWORDS env var (comma-separated) for site-specific blocks.
 */
const BUILT_IN_BLOCKED_PASSWORDS: readonly string[] = [
  "password123456",
  "password123!",
  "pakistan123!",
  "pakistan123456",
  "highrise123!",
  "highrise123456",
  "admin123456!",
  "admin123456",
  "qwerty123456!",
  "qwerty123456",
  "12345678901!",
  "123456789012",
  "abcdefghij1!",
  "letmein123456",
  "welcome123456",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PasswordValidationResult {
  valid: boolean;
  reason?: string;
  /** Machine-readable code for the failure reason */
  code?:
    | "TOO_SHORT"
    | "TOO_LONG"
    | "MISSING_LOWERCASE"
    | "MISSING_UPPERCASE"
    | "MISSING_DIGIT"
    | "MISSING_SPECIAL"
    | "COMMON_PASSWORD";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Load site-specific blocked passwords from environment variable.
 * BLOCKED_PASSWORDS=secretword,companyname123! (comma-separated, case-insensitive)
 */
function getEnvBlockedPasswords(): string[] {
  const raw = process.env.BLOCKED_PASSWORDS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Check if a password matches any blocked entry.
 * Uses case-insensitive substring match so "Pakistan123!" is caught
 * even if the user wraps it with other characters.
 */
function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  const allBlocked = [
    ...BUILT_IN_BLOCKED_PASSWORDS,
    ...getEnvBlockedPasswords(),
  ];
  return allBlocked.some((blocked) => lower.includes(blocked));
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Validate a plaintext password against the Highrise.pk enterprise policy.
 *
 * This function is SYNCHRONOUS and PURE — no DB calls, no network calls.
 * Call it before hashing. Never call it on a hash.
 *
 * @param password - The plaintext password to validate
 * @returns PasswordValidationResult with valid flag, human reason, and machine code
 */
export function validatePassword(password: string): PasswordValidationResult {
  const pw = String(password ?? "");

  if (pw.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      code: "TOO_SHORT",
    };
  }

  if (pw.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      reason: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`,
      code: "TOO_LONG",
    };
  }

  if (!/[a-z]/.test(pw)) {
    return {
      valid: false,
      reason: "Password must contain at least one lowercase letter",
      code: "MISSING_LOWERCASE",
    };
  }

  if (!/[A-Z]/.test(pw)) {
    return {
      valid: false,
      reason: "Password must contain at least one uppercase letter",
      code: "MISSING_UPPERCASE",
    };
  }

  if (!/[0-9]/.test(pw)) {
    return {
      valid: false,
      reason: "Password must contain at least one number",
      code: "MISSING_DIGIT",
    };
  }

  if (!/[^a-zA-Z0-9]/.test(pw)) {
    return {
      valid: false,
      reason: "Password must contain at least one special character",
      code: "MISSING_SPECIAL",
    };
  }

  if (isCommonPassword(pw)) {
    return {
      valid: false,
      reason: "Password is too common. Please choose a more unique password.",
      code: "COMMON_PASSWORD",
    };
  }

  return { valid: true };
}

/**
 * Assert password is valid or throw.
 * Use in server-side flows where a throw is the right pattern.
 *
 * @throws Error with human-readable message if password is invalid
 */
export function assertValidPassword(password: string): void {
  const result = validatePassword(password);
  if (!result.valid) {
    throw new Error(result.reason ?? "Password does not meet security requirements");
  }
}