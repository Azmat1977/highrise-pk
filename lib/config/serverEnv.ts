/**
 * lib/config/serverEnv.ts
 *
 * Canonical server-side environment validation for Highrise.pk.
 *
 * RULES:
 *   → Import this file only in server-side code (API routes, lib/*)
 *   → Never import in pages/* components or client hooks
 *   → All secrets FAIL CLOSED — no fallback values ever
 *   → Call validateCriticalEnv() in long-running processes (not per-request)
 *
 * GAP-S11: Eliminates hardcoded fallback secrets across the codebase.
 */

// ─── Types ────────────────────────────────────────────────────

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

// ─── Required secrets (server startup must fail without these) ─

const CRITICAL_SECRETS: readonly string[] = [
  "NEXTAUTH_SECRET",
  "KYC_ENC_KEY",
  "KYC_HASH_SECRET",
  "OTP_PEPPER",
];

// ─── Required for email delivery ──────────────────────────────

const EMAIL_VARS: readonly string[] = [
  "EMAIL_HOST",
  "EMAIL_USER",
  "EMAIL_PASSWORD",
  "EMAIL_FROM",
];

// ─── Required for third-party services ───────────────────────

const SERVICE_VARS: readonly string[] = [
  "MONGODB_URI",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
];

// ─── Recommended (warn if missing, do not fail) ───────────────

const RECOMMENDED_VARS: readonly string[] = [
  "SIGNUP_TEMP_SECRET",
  "RATE_LIMIT_KEY_SECRET",
  "SECURITY_LOG_HASH_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TURNSTILE_SECRET_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

// ─── Validation ───────────────────────────────────────────────

/**
 * Validate all environment variables.
 * Returns a result object — does NOT throw.
 * Use validateCriticalEnv() when you want throwing behaviour.
 */
export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const name of [...CRITICAL_SECRETS, ...EMAIL_VARS, ...SERVICE_VARS]) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      missing.push(name);
    }
  }

  for (const name of RECOMMENDED_VARS) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      warnings.push(name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validate critical secrets and throw if any are missing.
 * Call once at application startup or in health-check routes.
 *
 * @throws {Error} If any critical secret is missing or empty.
 */
export function validateCriticalEnv(): void {
  const missing: string[] = [];

  for (const name of CRITICAL_SECRETS) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[Highrise.pk] Missing critical environment variables: ${missing.join(", ")}. ` +
        `Server cannot start safely. ` +
        `See .env.example for required configuration.`
    );
  }
}

/**
 * Read a required environment variable.
 * Throws immediately if missing — never returns undefined.
 *
 * @throws {Error} If the variable is missing or empty.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[Highrise.pk] Required environment variable "${name}" is not set. ` +
        `See .env.example for configuration instructions.`
    );
  }
  return value.trim();
}

/**
 * Read an optional environment variable.
 * Returns undefined if missing — never throws.
 */
export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Read a required integer environment variable.
 *
 * @throws {Error} If missing, empty, or not a valid integer.
 */
export function requireIntEnv(name: string): number {
  const raw = requireEnv(name);
  const parsed = parseInt(raw, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(
      `[Highrise.pk] Environment variable "${name}" must be an integer (got "${raw}").`
    );
  }
  return parsed;
}

/**
 * Read an optional integer environment variable with a default.
 * Returns the default if missing or invalid.
 */
export function optionalIntEnv(name: string, defaultValue: number): number {
  const value = optionalEnv(name);
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : defaultValue;
}

/**
 * Read a boolean environment variable.
 * "1", "true", "yes" → true. Everything else → false.
 */
export function boolEnv(name: string, defaultValue = false): boolean {
  const value = optionalEnv(name);
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes"].includes(value.toLowerCase());
}