// lib/auth/safeRedirect.ts
// Highrise.pk — canonical post-login / callback redirect sanitiser.
//
// Single source of truth for validating a user-controlled redirect target.
// Accepts only same-origin, absolute *paths* and rejects every known
// open-redirect vector:
//   - external origins ("https://evil.com", "//evil.com")
//   - protocol-relative URLs ("//evil.com", "/\evil.com", "\/evil.com")
//   - any backslash (browsers normalise "\" to "/" when resolving URLs)
//   - control characters / whitespace smuggling
//   - absolute schemes ("javascript:", "data:", "http:")
//   - the app's own auth surfaces and the API namespace (redirect loops)
//
// This module is dependency-free so it can be imported from both client pages
// and the in-place auth form without pulling in frameworks.

/** Default destination when a candidate redirect is missing or unsafe. */
export const DEFAULT_AUTH_REDIRECT = '/dashboard';

/** Auth surfaces that must never be a post-login destination (loop guard). */
const AUTH_PAGE_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
] as const;

function isAuthPath(path: string): boolean {
  return AUTH_PAGE_PREFIXES.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.startsWith(`${prefix}?`) ||
      path.startsWith(`${prefix}#`),
  );
}

/**
 * Return a safe, same-origin path derived from `raw`, or `fallback`.
 *
 * @param raw      Untrusted candidate (usually `router.query.callbackUrl`).
 * @param fallback Destination returned when `raw` is missing or unsafe.
 */
export function sanitizeCallbackUrl(
  raw: unknown,
  fallback: string = DEFAULT_AUTH_REDIRECT,
): string {
  if (typeof raw !== 'string') return fallback;

  const value = raw.trim();
  if (!value) return fallback;

  // Must be an absolute local path — relative ("foo") and absolute URLs
  // ("https://…") are both rejected here.
  if (!value.startsWith('/')) return fallback;

  // Protocol-relative ("//host") and any backslash usage.
  if (value.startsWith('//')) return fallback;
  if (value.includes('\\')) return fallback;

  // Control characters (incl. tab/newline/NUL) anywhere in the value.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  // Defence in depth: a leading "/" already excludes schemes, but reject any
  // scheme-looking token regardless.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return fallback;

  // Never loop back into the auth flow or the API namespace.
  if (isAuthPath(value)) return fallback;
  if (value === '/api' || value.startsWith('/api/')) return fallback;

  return value;
}
