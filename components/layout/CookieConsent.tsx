// components/layout/CookieConsent.tsx
// GDPR / PECA 2016 cookie consent banner.
// No dark patterns: reject is as visible and easy as accept.
// Persists the decision in an Essential-only cookie (no third-party writes
// before consent).

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const CONSENT_COOKIE = 'hr_cookie_consent';
const CONSENT_VERSION = '1';

type ConsentChoice = 'all' | 'essential' | null;

function readCookie(): ConsentChoice {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (parsed && parsed.v === CONSENT_VERSION && (parsed.choice === 'all' || parsed.choice === 'essential')) {
      return parsed.choice;
    }
  } catch {
    // ignore malformed cookie
  }
  return null;
}

function writeCookie(choice: ConsentChoice) {
  if (typeof document === 'undefined') return;
  const payload = JSON.stringify({ v: CONSENT_VERSION, choice, ts: Date.now() });
  // Essential cookie only. SameSite=Lax so it survives top-level navigations
  // but is not sent on cross-site tracking requests.
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(payload)}; path=/; max-age=31536000; samesite=lax; secure`;
}

export default function CookieConsent(): React.ReactElement | null {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setChoice(readCookie());
  }, []);

  // Avoid hydration mismatch: render nothing until mounted.
  if (!mounted) return null;
  if (choice) return null;

  const acceptAll = () => {
    setChoice('all');
    writeCookie('all');
    // Signal to analytics hooks that optional cookies are now allowed.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hr:cookie-consent', { detail: { choice: 'all' } }));
    }
  };

  const rejectAll = () => {
    setChoice('essential');
    writeCookie('essential');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hr:cookie-consent', { detail: { choice: 'essential' } }));
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[9999] pointer-events-none"
    >
      <div className="mx-3 sm:mx-6 mb-3 pointer-events-auto">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f7fa]">
                <svg className="h-5 w-5 text-[#029bba]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c3 0 5 4 5 9s-2 9-5 9M12 3c-3 0-5 4-5 9s2 9 5 9" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 id="cookie-consent-title" className="text-sm font-black text-[#004063]">
                  We use cookies to improve your experience
                </h2>
                <p id="cookie-consent-desc" className="mt-1 text-xs text-gray-600 leading-relaxed">
                  Highrise.pk uses essential cookies so the site works (login, search, abuse prevention).
                  Optional analytics cookies help us understand how the site is used and improve it.
                  We do not sell your data.{' '}
                  <Link href="/privacy-policy#cookies" className="font-semibold text-[#029bba] hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={rejectAll}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-[#029bba] hover:text-[#029bba] transition-colors"
              >
                Reject optional
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#029bba] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#004063] transition-colors shadow-sm"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}