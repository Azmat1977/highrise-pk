import { describe, expect, it } from 'vitest';
import {
  sanitizeCallbackUrl,
  DEFAULT_AUTH_REDIRECT,
} from '@/lib/auth/safeRedirect';

/**
 * Phase 2B · open-redirect protection for post-login destinations.
 *
 * `sanitizeCallbackUrl` is the single validator used by both `pages/login.tsx`
 * and `components/auth/LoginOrSignupForm.tsx`.
 */
describe('Phase 2B · sanitizeCallbackUrl (login redirect safety)', () => {
  it('keeps safe, same-origin absolute paths (incl. query + hash)', () => {
    expect(sanitizeCallbackUrl('/dashboard')).toBe('/dashboard');
    expect(sanitizeCallbackUrl('/admin/aleem?tab=leads')).toBe('/admin/aleem?tab=leads');
    expect(sanitizeCallbackUrl('/projects/My-Slug/units/abc#gallery')).toBe(
      '/projects/My-Slug/units/abc#gallery',
    );
    // Case must be preserved (paths are case-sensitive).
    expect(sanitizeCallbackUrl('/projects/MyCamelSlug')).toBe('/projects/MyCamelSlug');
  });

  it('trims surrounding whitespace on otherwise-safe values', () => {
    expect(sanitizeCallbackUrl('  /dashboard  ')).toBe('/dashboard');
  });

  it('falls back for missing / non-string / empty input', () => {
    expect(sanitizeCallbackUrl(undefined)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeCallbackUrl(null)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeCallbackUrl(123)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeCallbackUrl({})).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeCallbackUrl('')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeCallbackUrl('   ')).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('honours a custom fallback', () => {
    expect(sanitizeCallbackUrl(undefined, '/')).toBe('/');
    expect(sanitizeCallbackUrl('https://evil.example', '/')).toBe('/');
    expect(sanitizeCallbackUrl('/ok', '/')).toBe('/ok');
  });

  it('rejects external origins / schemes', () => {
    for (const value of [
      'https://evil.example/phish',
      'http://evil.example',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'ftp://evil.example',
      'HTTPS://evil.example',
    ]) {
      expect(sanitizeCallbackUrl(value)).toBe(DEFAULT_AUTH_REDIRECT);
    }
  });

  it('rejects protocol-relative and backslash variants', () => {
    for (const value of [
      '//evil.example',
      '//evil.example/path',
      '/\\evil.example',
      '\\/evil.example',
      '/dash\\board',
      '\\\\evil.example',
    ]) {
      expect(sanitizeCallbackUrl(value)).toBe(DEFAULT_AUTH_REDIRECT);
    }
  });

  it('rejects relative paths and control-character smuggling', () => {
    expect(sanitizeCallbackUrl('dashboard')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeCallbackUrl('./dashboard')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeCallbackUrl('/dash\u0000board')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeCallbackUrl('/dash\nboard')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeCallbackUrl('/dash\tboard')).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('rejects auth pages and the API namespace (loop guard)', () => {
    for (const value of [
      '/login',
      '/login?mode=signup',
      '/login/extra',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/api',
      '/api/users',
    ]) {
      expect(sanitizeCallbackUrl(value)).toBe(DEFAULT_AUTH_REDIRECT);
    }
  });

  it('still allows ordinary pages that merely share a prefix', () => {
    expect(sanitizeCallbackUrl('/login-history')).toBe('/login-history');
    expect(sanitizeCallbackUrl('/registration')).toBe('/registration');
    expect(sanitizeCallbackUrl('/apiary')).toBe('/apiary');
  });
});
