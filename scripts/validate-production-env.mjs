#!/usr/bin/env node
/**
 * Highrise.pk production environment validator.
 * - Reads variable names/values locally only.
 * - Never prints secret values.
 * - Detects duplicate keys, placeholders, weak/malformed secrets, unsafe production toggles.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
const envFileName = isProduction ? '.env.production.local' : '.env.local';
const envPath = path.join(root, envFileName);

const failures = [];
const warnings = [];

function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }

function parseEnvFile(file) {
  const values = new Map();
  const counts = new Map();
  if (!fs.existsSync(file)) return { values, counts };

  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
    values.set(key, value);
  }
  return { values, counts };
}

const parsed = parseEnvFile(envPath);
const env = new Map(parsed.values);
for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === 'string' && value.length > 0) env.set(key, value);
}

if (!fs.existsSync(envPath)) {
  fail(`${envFileName} is missing on this machine. Keep it local and never commit it.`);
}

for (const [key, count] of parsed.counts) {
  if (count > 1) fail(`Duplicate environment variable definition: ${key} (${count} entries).`);
}

const REQUIRED = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
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
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'EMAIL_FROM',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'ADMIN_EMAIL',
  'SALES_EMAIL',
  'WHATSAPP_NUMBER',
];

const RECOMMENDED = [
  'ADMIN_QUOTA_ALERT_EMAIL',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
];

const DEPRECATED = [
  'EMAIL_PASS',
  'CLOUDINARY_UPLOAD_PRESET',
  'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
];

const SECRET_KEYS = [
  'NEXTAUTH_SECRET',
  'OTP_PEPPER',
  'SIGNUP_TEMP_SECRET',
  'RATE_LIMIT_KEY_SECRET',
  'SECURITY_LOG_HASH_SECRET',
  'SECURITY_LOG_HMAC_SECRET',
  'CRON_SECRET',
  'KYC_HASH_SECRET',
  'PROPERTY_HASH_SECRET',
  'PROPERTY_ENCRYPTION_KEY',
];

const placeholderPattern = /(?:replace[_ -]?with|change[_ -]?me|your[_ -]?(?:secret|key|token|password|uri)|example|placeholder|dummy|test[_ -]?secret)/i;
const valueOf = (name) => (env.get(name) ?? '').trim();

for (const name of REQUIRED) {
  const value = valueOf(name);
  if (!value) fail(`Required environment variable is missing/empty: ${name}.`);
  else if (placeholderPattern.test(value)) fail(`Placeholder value must be replaced: ${name}.`);
}

for (const name of RECOMMENDED) {
  if (!valueOf(name)) warn(`Recommended integration variable is not configured: ${name}.`);
}

for (const name of DEPRECATED) {
  if (parsed.counts.has(name) || process.env[name]) warn(`Deprecated environment variable is still present: ${name}. Remove it after confirming no external deployment setting depends on it.`);
}

for (const name of SECRET_KEYS) {
  const value = valueOf(name);
  if (value && value.length < 32) fail(`${name} must be at least 32 characters of high-entropy secret material.`);
}

const kycKey = valueOf('KYC_ENC_KEY');
if (kycKey) {
  let decoded;
  try {
    decoded = Buffer.from(kycKey, 'base64');
  } catch {
    decoded = null;
  }
  const canonical = decoded && decoded.length > 0 ? decoded.toString('base64').replace(/=+$/g, '') : '';
  if (!decoded || decoded.length !== 32 || canonical !== kycKey.replace(/=+$/g, '')) {
    fail('KYC_ENC_KEY must be valid Base64 representing exactly 32 random bytes.');
  }
}

function validateHttpsUrl(name) {
  const value = valueOf(name);
  if (!value) return;
  try {
    const url = new URL(value);
    if (isProduction && url.protocol !== 'https:') fail(`${name} must use https:// for production.`);
    if (!isProduction && url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      fail(`${name} must use https://, or http://localhost/127.0.0.1 for local development.`);
    }
    if (url.username || url.password) fail(`${name} must not embed credentials.`);
    if (url.pathname !== '/' && url.pathname !== '') warn(`${name} normally should be an origin without a path.`);
  } catch {
    fail(`${name} is not a valid absolute URL.`);
  }
}

for (const name of ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'NEXTAUTH_URL']) validateHttpsUrl(name);

const canonicalOrigins = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'NEXTAUTH_URL']
  .map((name) => {
    try { return new URL(valueOf(name)).origin.toLowerCase(); } catch { return null; }
  })
  .filter(Boolean);
if (new Set(canonicalOrigins).size > 1) {
  warn('NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL and NEXTAUTH_URL use different origins. Confirm this is intentional.');
}

const mongoUri = valueOf('MONGODB_URI');
if (mongoUri && !/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) fail('MONGODB_URI must begin with mongodb:// or mongodb+srv://.');

const redisUrl = valueOf('UPSTASH_REDIS_REST_URL');
if (redisUrl && !/^https:\/\//i.test(redisUrl)) fail('UPSTASH_REDIS_REST_URL must use HTTPS.');

const emailPort = Number(valueOf('EMAIL_PORT'));
if (!Number.isInteger(emailPort) || emailPort < 1 || emailPort > 65535) fail('EMAIL_PORT must be an integer from 1 to 65535.');
const emailSecure = valueOf('EMAIL_SECURE').toLowerCase();
if (emailSecure && !['true', 'false', '1', '0'].includes(emailSecure)) fail('EMAIL_SECURE must be true, false, 1, or 0.');

const rateLimitDisabled = valueOf('RATE_LIMIT_DISABLED').toLowerCase();
if (['true', '1', 'yes', 'on'].includes(rateLimitDisabled)) fail('RATE_LIMIT_DISABLED must not be enabled for production certification.');

const authDebug = valueOf('AUTH_DEBUG').toLowerCase();
if (['true', '1', 'yes', 'on'].includes(authDebug)) fail('AUTH_DEBUG must be disabled for production certification.');

const admin2fa = valueOf('REQUIRE_ADMIN_2FA').toLowerCase();
if (!['true', '1'].includes(admin2fa)) warn('REQUIRE_ADMIN_2FA is not enabled. Enable it before final privileged-admin launch if the admin flow supports it end-to-end.');

if (isProduction && valueOf('NEXTAUTH_URL') && /localhost|127\.0\.0\.1/i.test(valueOf('NEXTAUTH_URL'))) {
  fail('NEXTAUTH_URL points to localhost while production validation is active.');
}

console.log('=== Highrise.pk Environment Validation ===');
console.log(`Checked ${parsed.counts.size} environment variable names from ${envFileName} (values are never printed).`);

for (const message of warnings) console.warn(`WARN: ${message}`);
for (const message of failures) console.error(`FAIL: ${message}`);

if (failures.length > 0) {
  console.error(`\nEnvironment validation FAILED with ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log(`\nPASS: Environment validation completed with ${warnings.length} warning(s).`);
