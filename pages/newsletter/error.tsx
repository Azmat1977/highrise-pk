// pages/newsletter/error.tsx
// 🏗️ EMAIL VERIFICATION ERROR PAGE — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   User lands here when email verification fails.
//
// QUERY PARAMS:
//   ?reason=missing_token  → Link incomplete
//   ?reason=invalid_token  → Bad/malformed token
//   ?reason=expired_token  → Token expired (24h limit)
//   ?reason=rate_limit     → Too many attempts
//   ?reason=server_error   → Something went wrong
//   ?email=xxx@xxx.com     → Pre-fill email (from expired_token)
//
// DESIGN:
//   ✅ Matches unsubscribed.tsx + verified.tsx layout exactly
//   ✅ No framer-motion — Tailwind CSS only
//   ✅ Brand consistent (teal + navy)
//   ✅ Mobile responsive
//   ✅ Urdu subtitles
//   ✅ Email partially masked (privacy safe)
//   ✅ Context-aware CTAs per error reason
//   ✅ Re-subscribe option for expired tokens
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import Head                            from 'next/head';
import Link                            from 'next/link';
import { useRouter }                   from 'next/router';
import {
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  ServerCrash,
  Home,
  ArrowRight,
  Mail,
  RefreshCw,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

type ErrorReason =
  | 'missing_token'
  | 'invalid_token'
  | 'expired_token'
  | 'rate_limit'
  | 'server_error';

interface ErrorConfig {
  icon:            React.ReactNode;
  iconBg:          string;
  badge:           string;
  badgeColor:      string;
  title:           string;
  urduSubtitle:    string;
  description:     string;
  hint:            string;
  showResubscribe: boolean;
  showContact:     boolean;
  accentColor:     string;
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ ERROR CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

const ERROR_CONFIGS: Record<ErrorReason, ErrorConfig> = {
  missing_token: {
    icon:            <AlertTriangle className="w-10 h-10 text-amber-500" />,
    iconBg:          'bg-amber-50',
    badge:           'Incomplete Link',
    badgeColor:      'bg-amber-50 text-amber-700 border-amber-200',
    title:           'Verification link is incomplete',
    urduSubtitle:    'Link adhoora hai',
    description:     'The verification link appears to be missing the required security token. This can happen if your email client broke the link across multiple lines.',
    hint:            'Please click the full link directly from your email. If the problem continues, subscribe again to receive a fresh verification email.',
    showResubscribe: true,
    showContact:     false,
    accentColor:     'from-amber-400 to-amber-500',
  },

  invalid_token: {
    icon:            <XCircle className="w-10 h-10 text-red-500" />,
    iconBg:          'bg-red-50',
    badge:           'Invalid Link',
    badgeColor:      'bg-red-50 text-red-700 border-red-200',
    title:           'This verification link is invalid',
    urduSubtitle:    'Yeh link sahi nahi hai',
    description:     'We could not validate this email verification link. It may have been copied incorrectly, already used, or tampered with.',
    hint:            'Please use the most recent verification email in your inbox. Older verification emails become invalid when a new one is sent.',
    showResubscribe: true,
    showContact:     false,
    accentColor:     'from-red-400 to-red-500',
  },

  expired_token: {
    icon:            <Clock className="w-10 h-10 text-orange-500" />,
    iconBg:          'bg-orange-50',
    badge:           'Link Expired',
    badgeColor:      'bg-orange-50 text-orange-700 border-orange-200',
    title:           'Verification link has expired',
    urduSubtitle:    'Link ki meyyad khatam ho gayi',
    description:     'For security, email verification links expire after 24 hours. Your link has passed this time limit.',
    hint:            'Subscribe again using the form on our website and we will send you a fresh verification email right away.',
    showResubscribe: true,
    showContact:     false,
    accentColor:     'from-orange-400 to-orange-500',
  },

  rate_limit: {
    icon:            <ShieldAlert className="w-10 h-10 text-[#029bba]" />,
    iconBg:          'bg-[#029bba]/10',
    badge:           'Too Many Attempts',
    badgeColor:      'bg-[#029bba]/10 text-[#029bba] border-[#029bba]/20',
    title:           'Too many verification attempts',
    urduSubtitle:    'Bahut zyada koshishein ho gayi',
    description:     'We temporarily limited verification requests from your network to protect against automated abuse. This is a security measure.',
    hint:            'Please wait 5–10 minutes and try clicking your verification link again. Your link is still valid.',
    showResubscribe: false,
    showContact:     false,
    accentColor:     'from-[#029bba] to-[#004063]',
  },

  server_error: {
    icon:            <ServerCrash className="w-10 h-10 text-red-500" />,
    iconBg:          'bg-red-50',
    badge:           'Server Error',
    badgeColor:      'bg-red-50 text-red-700 border-red-200',
    title:           'Something went wrong',
    urduSubtitle:    'Kuch masla aa gaya',
    description:     'We encountered an unexpected error while trying to verify your email. Our team has been notified.',
    hint:            'Please try clicking your verification link again in a few minutes. If the issue continues, contact our support team.',
    showResubscribe: false,
    showContact:     true,
    accentColor:     'from-red-400 to-red-600',
  },
};

// Fallback for unknown reasons
const DEFAULT_REASON: ErrorReason = 'invalid_token';

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Partially mask email for privacy-safe display.
 * ahmed.khan@gmail.com → ah***@gmail.com
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

/**
 * Validate error reason from query param.
 */
function parseReason(raw: string | string[] | undefined): ErrorReason {
  if (typeof raw !== 'string') return DEFAULT_REASON;
  if (raw in ERROR_CONFIGS) return raw as ErrorReason;
  return DEFAULT_REASON;
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function NewsletterErrorPage() {
  const router = useRouter();

  const [isReady,    setIsReady]    = useState(false);
  const [reason,     setReason]     = useState<ErrorReason>(DEFAULT_REASON);
  const [maskedEmail, setMaskedEmail] = useState('');

  // ─── Parse query params ───────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;

    const parsedReason = parseReason(router.query.reason);
    setReason(parsedReason);

    // Mask email for privacy-safe display
    const rawEmail = typeof router.query.email === 'string'
      ? router.query.email.trim().toLowerCase()
      : '';
    if (rawEmail) {
      setMaskedEmail(maskEmail(rawEmail));
    }

    setIsReady(true);
  }, [router.isReady, router.query]);

  const config = ERROR_CONFIGS[reason];

  // ═════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>Verification Error — Highrise.pk Newsletter</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta
          name="description"
          content="There was an issue verifying your email for the Highrise.pk newsletter."
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#029bba]/5 flex flex-col">

        {/* ── Top brand bar ── */}
        <header className="w-full py-4 px-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-black text-[#004063] text-lg leading-none">
                  Highrise.pk
                </span>
                <p className="text-xs text-gray-400 leading-none">
                  Pakistan&apos;s Real Estate Platform
                </p>
              </div>
            </Link>

            <Link
              href="/"
              className="text-sm font-semibold text-[#029bba] hover:text-[#004063] transition-colors flex items-center gap-1"
            >
              Visit Website
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

              {/* Top accent bar — color matches error type */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${config.accentColor}`} />

              <div className="px-8 py-10">

                {/* Icon */}
                <div
                  className={`
                    w-20 h-20 rounded-2xl flex items-center justify-center
                    mx-auto mb-6 transition-all duration-500
                    ${isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                    ${config.iconBg}
                  `}
                >
                  {config.icon}
                </div>

                {/* Badge */}
                <div className="flex justify-center mb-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${config.badgeColor}`}
                  >
                    {config.badge}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black text-[#004063] text-center mb-1">
                  {config.title}
                </h1>

                {/* Urdu subtitle */}
                <p className="text-sm text-gray-400 text-center mb-5 font-medium">
                  {config.urduSubtitle}
                </p>

                {/* Divider */}
                <div className="border-t border-gray-100 mb-5" />

                {/* Description */}
                <p className="text-sm text-gray-600 text-center leading-relaxed mb-4">
                  {config.description}
                </p>

                {/* Hint box */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
                  <p className="text-xs text-gray-500 leading-relaxed text-center">
                    💡 {config.hint}
                  </p>
                </div>

                {/* Masked email (expired_token only) */}
                {maskedEmail && reason === 'expired_token' && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
                    <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                    <p className="text-xs text-blue-700">
                      <span className="font-bold">Email: </span>
                      {maskedEmail}
                    </p>
                  </div>
                )}

                {/* Rate limit countdown hint */}
                {reason === 'rate_limit' && (
                  <div className="flex items-center gap-2 bg-[#029bba]/5 border border-[#029bba]/20 rounded-xl px-4 py-3 mb-6">
                    <RefreshCw className="w-4 h-4 text-[#029bba] shrink-0" />
                    <p className="text-xs text-[#029bba] font-semibold">
                      Your verification link is still valid — just wait a few minutes before retrying.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">

                  {/* Primary — Re-subscribe (for token errors) */}
                  {config.showResubscribe && (
                    <Link
                      href="/#newsletter"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#029bba] hover:bg-[#0289a5] text-white text-sm font-bold transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Subscribe Again
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}

                  {/* Primary — Back home (for rate_limit / server_error) */}
                  {!config.showResubscribe && (
                    <Link
                      href="/"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#004063] hover:bg-[#003050] text-white text-sm font-bold transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      Back to Highrise.pk
                    </Link>
                  )}

                  {/* Secondary — Back to home (for token errors) */}
                  {config.showResubscribe && (
                    <Link
                      href="/"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      Back to Highrise.pk
                    </Link>
                  )}

                  {/* Contact support (server_error only) */}
                  {config.showContact && (
                    <a
                      href="mailto:info@highrise.pk"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Contact Support
                    </a>
                  )}

                </div>

              </div>

              {/* Footer note */}
              <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  {reason === 'expired_token'
                    ? 'Verification links expire after 24 hours for your security. Subscribing again is quick and free.'
                    : reason === 'rate_limit'
                    ? 'This limit is temporary and will reset automatically in a few minutes.'
                    : 'If you keep experiencing issues, please contact us at info@highrise.pk'
                  }
                </p>
              </div>

            </div>

            {/* Error code — helps support diagnose issues */}
            <p className="text-center text-xs text-gray-300 mt-4">
              Error: {reason.replace(/_/g, '-')} ·{' '}
              © {new Date().getFullYear()} Highrise.pk
            </p>

          </div>
        </main>

      </div>
    </>
  );
}