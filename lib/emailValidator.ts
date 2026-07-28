// lib/emailValidator.ts

import crypto from 'crypto';

/**
 * 🔐 ENTERPRISE EMAIL VALIDATION & NORMALIZATION
 * 
 * Features:
 * ├── Email normalization (handles gmail +aliases, dots)
 * ├── Disposable email detection
 * ├── Advanced format validation
 * ├── Domain validation
 * └── Secure token generation
 */

// ═══════════════════════════════════════════════════════════════
// 🚫 DISPOSABLE EMAIL DOMAINS (Top 100)
// ═══════════════════════════════════════════════════════════════

const DISPOSABLE_DOMAINS = new Set([
  // Popular disposable email services
  'tempmail.com', 'temp-mail.org', '10minutemail.com', 'guerrillamail.com',
  'mailinator.com', 'maildrop.cc', 'throwaway.email', 'getnada.com',
  'fakeinbox.com', 'trashmail.com', 'yopmail.com', 'mailnesia.com',
  'sharklasers.com', 'guerrillamail.info', 'grr.la', 'guerrillamail.biz',
  'spam4.me', 'guerrillamail.de', 'mintemail.com', 'tmpeml.info',

  // Additional known disposable services
  'dispostable.com', 'emailondeck.com', 'mytrashmail.com', 'mohmal.com',
  'getairmail.com', 'throwawaymail.com', 'emailsensei.com', 'binkmail.com',
  'spamgourmet.com', 'incognitomail.org', 'anonymbox.com', 'deadaddress.com',
  'mailcatch.com', 'mailexpire.com', 'tempemail.net',
  'guerrillamail.net', 'guerrillamail.org', 'spam.la',
  
  // Less common but still disposable
  'tempinbox.com', 'throwemail.com', 'zoemail.org', 'addcom.de',
  
  // New/emerging services
  'burnermail.io', 'temp-mail.io', 'emailfake.com', 'faketempmail.com',
  'tempmailo.com', 'tempmail.de', 'tempr.email', 'luxusmail.org',
  'anonbox.net', 'mailforspam.com', 'spambox.us', 'tempemailaddress.com',
  'emailtemporanea.com', 'correotemporal.org', 'emailtemporar.ro',
]);

// ═══════════════════════════════════════════════════════════════
// 📧 EMAIL NORMALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize email to detect duplicates
 * 
 * Examples:
 * - john.doe+spam@gmail.com → johndoe@gmail.com
 * - John.Doe@Gmail.COM → johndoe@gmail.com
 * - user+tag@yahoo.com → user@yahoo.com
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';

  let normalized = email.toLowerCase().trim();

  // Split email into local and domain parts
  const atIndex = normalized.indexOf('@');
  if (atIndex === -1) return ''; // No @ sign — invalid, return empty

  const localPart = normalized.substring(0, atIndex);
  const domain = normalized.substring(atIndex + 1);

  if (!localPart || !domain) return ''; // Empty local or domain — invalid

  let normalizedLocal = localPart;

  // Gmail-specific normalization
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Remove dots (Gmail ignores them)
    normalizedLocal = normalizedLocal.replace(/\./g, '');
    
    // Remove everything after + (Gmail aliases)
    const plusIndex = normalizedLocal.indexOf('+');
    if (plusIndex !== -1) {
      normalizedLocal = normalizedLocal.substring(0, plusIndex);
    }
    
    // Always use gmail.com (googlemail.com is alias)
    return `${normalizedLocal}@gmail.com`;
  }

  // Yahoo/Outlook/AOL normalization
  if (['yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'live.com'].includes(domain)) {
    // Remove everything after + (most providers support this)
    const plusIndex = normalizedLocal.indexOf('+');
    if (plusIndex !== -1) {
      normalizedLocal = normalizedLocal.substring(0, plusIndex);
    }
  }

  return `${normalizedLocal}@${domain}`;
}

// ═══════════════════════════════════════════════════════════════
// 🔍 EMAIL VALIDATION
// ═══════════════════════════════════════════════════════════════

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  normalizedEmail?: string;
}

/**
 * Validate email with advanced checks
 */
export function validateEmail(email: string): EmailValidationResult {
  // Basic null check
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  // Length check
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  // Format check (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // More strict format check
  const strictRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!strictRegex.test(trimmed)) {
    return { isValid: false, error: 'Email format is invalid' };
  }

  // Check for consecutive dots
  if (trimmed.includes('..')) {
    return { isValid: false, error: 'Email format is invalid' };
  }

  // Extract domain
  const domain = trimmed.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { isValid: false, error: 'Email domain is missing' };
  }

  // Check for disposable email
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { 
      isValid: false, 
      error: 'Temporary email addresses are not allowed. Please use a permanent email address.' 
    };
  }

  // Normalize email
  const normalizedEmail = normalizeEmail(trimmed);

  return {
    isValid: true,
    normalizedEmail,
  };
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURE TOKEN GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate cryptographically secure token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate verification token with expiry
 */
export function generateVerificationToken(): {
  token: string;
  expires: Date;
} {
  const token = generateSecureToken(32);
  // Use milliseconds arithmetic — immune to DST transitions
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return { token, expires };
}

/**
 * Generate permanent unsubscribe token
 */
export function generateUnsubscribeToken(): string {
  return generateSecureToken(32);
}

// ═══════════════════════════════════════════════════════════════
// 🛡️ SANITIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitize name input for storage.
 * Note: This is a light sanitization for data integrity only.
 * Full HTML escaping is applied at the template level (lib/email.ts escapeHtml).
 * Do not rely on this function alone for XSS prevention in rendered output.
 */
export function sanitizeName(name: string | undefined): string | undefined {
  if (!name || typeof name !== 'string') return undefined;

  return name
    .trim()
    .replace(/[<>]/g, '') // Strip angle brackets — prevents raw tag injection
    .slice(0, 100);        // Max 100 characters
}

/**
 * Sanitize source/UTM parameters
 */
export function sanitizeString(input: string | undefined, maxLength: number = 100): string | undefined {
  if (!input || typeof input !== 'string') return undefined;

  return input
    .trim()
    .replace(/[<>"']/g, '') // Remove quotes and brackets
    .slice(0, maxLength);
}
