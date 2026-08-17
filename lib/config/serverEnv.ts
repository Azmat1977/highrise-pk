/**
 * Canonical server-side environment validation for Highrise.pk.
 *
 * Server code should fail closed for cryptographic, authentication, database,
 * upload, anti-abuse and email configuration. This module never logs values.
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

const CRITICAL_SECRETS: readonly string[] = [
  'NEXTAUTH_SECRET',
  'KYC_ENC_KEY',
  'KYC_HASH_SECRET',
  'PROPERTY_HASH_SECRET',
  'PROPERTY_ENCRYPTION_KEY',
  'OTP_PEPPER',
  'SIGNUP_TEMP_SECRET',
  'RATE_LIMIT_KEY_SECRET',
  'SECURITY_LOG_HASH_SECRET',
  'SECURITY_LOG_HMAC_SECRET',
  'CRON_SECRET',
];

const EMAIL_VARS: readonly string[] = [
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'EMAIL_FROM',
];

const SERVICE_VARS: readonly string[] = [
  'MONGODB_URI',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
];

const RECOMMENDED_VARS: readonly string[] = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'RESEND_API_KEY',
  'ADMIN_EMAIL',
  'SALES_EMAIL',
  'WHATSAPP_NUMBER',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
];

export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const name of [...CRITICAL_SECRETS, ...EMAIL_VARS, ...SERVICE_VARS]) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) missing.push(name);
  }

  for (const name of RECOMMENDED_VARS) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) warnings.push(name);
  }

  return { valid: missing.length === 0, missing, warnings };
}

export function validateCriticalEnv(): void {
  const { missing } = validateEnv();
  if (missing.length > 0) {
    throw new Error(
      `[Highrise.pk] Missing required environment variables: ${missing.join(', ')}. ` +
        'Server cannot start safely. See .env.example.'
    );
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[Highrise.pk] Required environment variable "${name}" is not set. See .env.example.`
    );
  }
  return value.trim();
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function requireIntEnv(name: string): number {
  const raw = requireEnv(name);
  const parsed = parseInt(raw, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`[Highrise.pk] Environment variable "${name}" must be an integer.`);
  }
  return parsed;
}

export function optionalIntEnv(name: string, defaultValue: number): number {
  const value = optionalEnv(name);
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : defaultValue;
}

export function boolEnv(name: string, defaultValue = false): boolean {
  const value = optionalEnv(name);
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}
