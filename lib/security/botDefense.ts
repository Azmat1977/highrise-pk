// lib/security/botDefense.ts
// Highrise.pk — Anti-spam / bot defense (honeypot, velocity, phone, disposable email)
// No CAPTCHA. Fail closed on bot signals; generic client errors only.

export const BOT_MIN_FILL_MS = 1500;
export const BOT_MAX_FORM_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Common disposable / temporary email domains (lowercase, no subdomain match needed if we check registrable-ish suffix). */
const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.org',
  'guerrillamail.net',
  'sharklasers.com',
  'grr.la',
  'yopmail.com',
  'yopmail.fr',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'throwaway.email',
  '10minutemail.com',
  '10minutemail.net',
  'trashmail.com',
  'trashmail.me',
  'discard.email',
  'discardmail.com',
  'mailnesia.com',
  'maildrop.cc',
  'getnada.com',
  'emailondeck.com',
  'fakeinbox.com',
  'tmpmail.org',
  'tmpmail.net',
  'moakt.com',
  'mohmal.com',
  'mailcatch.com',
  'mytemp.email',
  'tempail.com',
  'dispostable.com',
  'mailnull.com',
  'spamgourmet.com',
  'mailforspam.com',
  'tempinbox.com',
  'minuteinbox.com',
  'anonymousemail.me',
  'burnermail.io',
  'inboxbear.com',
  'mailscrap.com',
  'tempr.email',
  'tmpbox.net',
  'corsaromail.com',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'bccto.me',
  'chutzpah.com',
  'getairmail.com',
  'yuzuma.com',
  'mail.tm',
  'mail.gw',
  'dropmail.me',
  'emailsensei.com',
  'tempmailo.com',
  'tmpeml.com',
]);

export type BotDefenseCode =
  | 'HONEYPOT'
  | 'VELOCITY'
  | 'FORM_EXPIRED'
  | 'INVALID_PHONE'
  | 'DISPOSABLE_EMAIL'
  | 'INVALID_INPUT';

export type BotDefenseInput = {
  /** Honeypot field value from client (must be empty for humans). */
  honeypot?: unknown;
  /** Client timestamp when the form UI was shown (ms since epoch). */
  formOpenedAt?: unknown;
  /** Optional phone to normalize + validate (Pakistani mobile). */
  phone?: unknown;
  /** Optional email; empty/undefined allowed. */
  email?: unknown;
  /** Minimum dwell time before submit (default BOT_MIN_FILL_MS). */
  minFillMs?: number;
  /** Max age of formOpenedAt (default BOT_MAX_FORM_AGE_MS). */
  maxFormAgeMs?: number;
  /** When false, skip phone checks (e.g. chat-only). Default true if phone provided. */
  requirePhone?: boolean;
};

export type BotDefenseResult =
  | { ok: true; phone?: string; email?: string }
  | { ok: false; code: BotDefenseCode };

/**
 * Honeypot: bots auto-fill hidden fields. Any non-empty value = bot.
 */
export function checkHoneypot(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  return value.trim().length === 0;
}

/**
 * Form velocity: humans need a moment; missing/invalid/future/too-fast/too-old = reject.
 */
export function checkFormVelocity(
  formOpenedAt: unknown,
  minFillMs: number = BOT_MIN_FILL_MS,
  maxFormAgeMs: number = BOT_MAX_FORM_AGE_MS,
): { ok: true } | { ok: false; code: 'VELOCITY' | 'FORM_EXPIRED' | 'INVALID_INPUT' } {
  if (formOpenedAt === undefined || formOpenedAt === null || formOpenedAt === '') {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  const opened =
    typeof formOpenedAt === 'number'
      ? formOpenedAt
      : typeof formOpenedAt === 'string' && /^\d{10,15}$/.test(formOpenedAt.trim())
        ? Number(formOpenedAt.trim())
        : NaN;

  if (!Number.isFinite(opened) || opened <= 0) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  const now = Date.now();
  // Allow small clock skew skew forward (5s)
  if (opened > now + 5000) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  const age = now - opened;
  if (age < minFillMs) {
    return { ok: false, code: 'VELOCITY' };
  }
  if (age > maxFormAgeMs) {
    return { ok: false, code: 'FORM_EXPIRED' };
  }

  return { ok: true };
}

/**
 * Strip to digits; map local 03xx / 3xx to 92xxxxxxxxxx canonical storage form.
 * Returns null if not a valid Pakistani mobile (03XXXXXXXXX / 92 3XX...).
 */
export function normalizePakistaniPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 20) return null;

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // 00392... rare
  if (digits.startsWith('00392')) digits = digits.slice(2);
  if (digits.startsWith('9203') && digits.length >= 12) {
    // 92 + 03... user mistake → 92 + 3...
    digits = '92' + digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '92' + digits.slice(1);
  } else if (digits.startsWith('3') && digits.length === 10) {
    digits = '92' + digits;
  } else if (digits.startsWith('92') && digits.length === 12) {
    // already canonical
  } else if (digits.startsWith('92') && digits.length === 13 && digits[2] === '0') {
    digits = '92' + digits.slice(3);
  } else {
    return null;
  }

  // Pakistan mobile: 923XXXXXXXXX (12 digits), second digit of national number is operator (3)
  if (!/^92[3][0-9]{9}$/.test(digits)) return null;
  return digits;
}

export function isValidPakistaniMobile(raw: unknown): boolean {
  return normalizePakistaniPhone(raw) !== null;
}

/**
 * Format canonical 923XXXXXXXXX → 03XX-XXXXXXX for display/storage preference if needed.
 */
export function formatPakistaniMobileDisplay(canonical92: string): string {
  const d = canonical92.replace(/\D/g, '');
  if (/^92[3][0-9]{9}$/.test(d)) {
    const local = '0' + d.slice(2);
    return `${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return canonical92;
}

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase().replace(/\.+$/, '');
}

/**
 * True if domain (or parent domain) is on the disposable list.
 */
export function isDisposableEmail(raw: unknown): boolean {
  if (raw === undefined || raw === null || raw === '') return false;
  if (typeof raw !== 'string') return true;

  const email = raw.trim().toLowerCase();
  if (!email) return false;
  if (email.length > 254 || !email.includes('@')) return true;

  const domain = emailDomain(email);
  if (!domain || domain.length < 3) return true;

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;

  // subdomain of a disposable domain (e.g. foo.mailinator.com)
  for (const blocked of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith('.' + blocked)) return true;
  }
  return false;
}

/**
 * Single gate for public lead / inquiry endpoints.
 * Phone is validated when `phone` is present or requirePhone is true.
 */
export function evaluateBotDefense(input: BotDefenseInput): BotDefenseResult {
  if (!checkHoneypot(input.honeypot)) {
    return { ok: false, code: 'HONEYPOT' };
  }

  const velocity = checkFormVelocity(
    input.formOpenedAt,
    input.minFillMs ?? BOT_MIN_FILL_MS,
    input.maxFormAgeMs ?? BOT_MAX_FORM_AGE_MS,
  );
  if (!velocity.ok) {
    return { ok: false, code: velocity.code };
  }

  const requirePhone = input.requirePhone !== false && input.phone !== undefined && input.phone !== null && String(input.phone).trim() !== '';
  // Lead forms always send phone — validate when provided
  let phone: string | undefined;
  if (input.phone !== undefined && input.phone !== null && String(input.phone).trim() !== '') {
    const normalized = normalizePakistaniPhone(input.phone);
    if (!normalized) return { ok: false, code: 'INVALID_PHONE' };
    phone = normalized;
  } else if (input.requirePhone === true) {
    return { ok: false, code: 'INVALID_PHONE' };
  }

  let email: string | undefined;
  if (input.email !== undefined && input.email !== null && String(input.email).trim() !== '') {
    if (typeof input.email !== 'string') return { ok: false, code: 'INVALID_INPUT' };
    const trimmed = input.email.trim().toLowerCase();
    if (trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { ok: false, code: 'INVALID_INPUT' };
    }
    if (isDisposableEmail(trimmed)) {
      return { ok: false, code: 'DISPOSABLE_EMAIL' };
    }
    email = trimmed;
  }

  // silence unused when phone optional path
  void requirePhone;

  return { ok: true, phone, email };
}

/** Generic user-facing message — never reveal which bot check failed. */
export function botDefenseClientMessage(code: BotDefenseCode): string {
  switch (code) {
    case 'INVALID_PHONE':
      return 'Please enter a valid Pakistani mobile number, for example 0300-1234567.';
    case 'DISPOSABLE_EMAIL':
      return 'Please use a permanent email address (temporary emails are not allowed).';
    case 'FORM_EXPIRED':
      return 'This form expired. Please close it, open again, and resubmit.';
    case 'VELOCITY':
    case 'HONEYPOT':
    case 'INVALID_INPUT':
    default:
      return 'Unable to submit right now. Please try again in a moment.';
  }
}