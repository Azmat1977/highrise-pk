// pages/unsubscribed.tsx
// 🏗️ ENTERPRISE UNSUBSCRIBE CONFIRMATION PAGE — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   User lands here after clicking unsubscribe link in email.
//   Handles all states:
//   - success=true         → Successfully unsubscribed
//   - success=true&already → Was already unsubscribed
//   - error=rate_limit     → Too many attempts
//   - error=missing_token  → No token in URL
//   - error=invalid_token  → Bad/expired token
//   - error=not_found      → Token not in DB
//   - error=server_error   → Something went wrong
//
// DESIGN:
//   ✅ No auth required — public page
//   ✅ Tailwind CSS only
//   ✅ Lucide React icons
//   ✅ Mobile responsive
//   ✅ Brand consistent (teal + navy)
//   ✅ Re-subscribe option
//   ✅ Link back to homepage
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import Head                            from 'next/head';
import Link                            from 'next/link';
import { useRouter }                   from 'next/router';
import {
  CheckCircle,
  UserMinus,
  AlertCircle,
  XCircle,
  Home,
  Mail,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

type PageState =
  | 'success'
  | 'already'
  | 'error_rate_limit'
  | 'error_missing_token'
  | 'error_invalid_token'
  | 'error_not_found'
  | 'error_server'
  | 'loading';

interface StateConfig {
  icon:        React.ReactNode;
  iconBg:      string;
  badge:       string;
  badgeColor:  string;
  title:       string;
  subtitle:    string;
  description: string;
  showResubscribe: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ STATE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

function getStateConfig(state: PageState): StateConfig {
  switch (state) {
    case 'success':
      return {
        icon:        <UserMinus className="w-10 h-10 text-[#029bba]" />,
        iconBg:      'bg-[#029bba]/10',
        badge:       'Unsubscribed',
        badgeColor:  'bg-[#029bba]/10 text-[#029bba] border-[#029bba]/20',
        title:       'You have been unsubscribed',
        subtitle:    'Aap ka subscription cancel ho gaya',
        description: 'We have removed your email address from our newsletter list. You will no longer receive marketing emails from Highrise.pk.',
        showResubscribe: true,
      };

    case 'already':
      return {
        icon:        <CheckCircle className="w-10 h-10 text-emerald-500" />,
        iconBg:      'bg-emerald-50',
        badge:       'Already Unsubscribed',
        badgeColor:  'bg-emerald-50 text-emerald-700 border-emerald-200',
        title:       'Already unsubscribed',
        subtitle:    'Aap pehle se unsubscribe hain',
        description: 'Your email address was already removed from our newsletter list. No further action is needed.',
        showResubscribe: true,
      };

    case 'error_rate_limit':
      return {
        icon:        <AlertCircle className="w-10 h-10 text-amber-500" />,
        iconBg:      'bg-amber-50',
        badge:       'Too Many Attempts',
        badgeColor:  'bg-amber-50 text-amber-700 border-amber-200',
        title:       'Too many requests',
        subtitle:    'Bahut zyada requests aa gayi',
        description: 'You have made too many unsubscribe attempts. Please wait a few minutes and try clicking the link in your email again.',
        showResubscribe: false,
      };

    case 'error_missing_token':
    case 'error_invalid_token':
      return {
        icon:        <XCircle className="w-10 h-10 text-red-500" />,
        iconBg:      'bg-red-50',
        badge:       'Invalid Link',
        badgeColor:  'bg-red-50 text-red-700 border-red-200',
        title:       'Invalid unsubscribe link',
        subtitle:    'Link sahi nahi hai',
        description: 'This unsubscribe link is invalid or has expired. Please use the unsubscribe link from your most recent email from Highrise.pk.',
        showResubscribe: false,
      };

    case 'error_not_found':
      return {
        icon:        <XCircle className="w-10 h-10 text-red-500" />,
        iconBg:      'bg-red-50',
        badge:       'Not Found',
        badgeColor:  'bg-red-50 text-red-700 border-red-200',
        title:       'Subscription not found',
        subtitle:    'Subscription nahi mili',
        description: 'We could not find a subscription matching this link. You may have already been removed from our list.',
        showResubscribe: false,
      };

    case 'error_server':
      return {
        icon:        <AlertCircle className="w-10 h-10 text-red-500" />,
        iconBg:      'bg-red-50',
        badge:       'Server Error',
        badgeColor:  'bg-red-50 text-red-700 border-red-200',
        title:       'Something went wrong',
        subtitle:    'Kuch masla aa gaya',
        description: 'We encountered an error processing your unsubscribe request. Please try again or contact us at info@highrise.pk.',
        showResubscribe: false,
      };

    case 'loading':
    default:
      return {
        icon:        <RefreshCw className="w-10 h-10 text-[#029bba] animate-spin" />,
        iconBg:      'bg-[#029bba]/10',
        badge:       'Processing',
        badgeColor:  'bg-[#029bba]/10 text-[#029bba] border-[#029bba]/20',
        title:       'Processing your request...',
        subtitle:    'Thoda intezaar karein',
        description: 'Please wait while we process your unsubscribe request.',
        showResubscribe: false,
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function UnsubscribedPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');

  // ─── Parse query params on load ──────────────────────────
  useEffect(() => {
    if (!router.isReady) return;

    const { success, already, error } = router.query;

    if (success === 'true' && already === 'true') {
      setPageState('already');
    } else if (success === 'true') {
      setPageState('success');
    } else if (error === 'rate_limit') {
      setPageState('error_rate_limit');
    } else if (error === 'missing_token') {
      setPageState('error_missing_token');
    } else if (error === 'invalid_token') {
      setPageState('error_invalid_token');
    } else if (error === 'not_found') {
      setPageState('error_not_found');
    } else if (error === 'server_error') {
      setPageState('error_server');
    } else {
      // Default — no params (direct visit)
      setPageState('success');
    }
  }, [router.isReady, router.query]);

  const config = getStateConfig(pageState);

  const isError = pageState.startsWith('error_');

  // ═════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>Unsubscribed — Highrise.pk</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="You have been unsubscribed from Highrise.pk newsletter." />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#029bba]/5 flex flex-col">

        {/* ── Top brand bar ── */}
        <header className="w-full py-4 px-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 group"
            >
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
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md">

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

              {/* Top accent bar */}
              <div className={`h-1.5 w-full ${isError ? 'bg-red-400' : 'bg-gradient-to-r from-[#029bba] to-[#004063]'}`} />

              <div className="px-8 py-10">

                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl ${config.iconBg} flex items-center justify-center mx-auto mb-6`}>
                  {config.icon}
                </div>

                {/* Badge */}
                <div className="flex justify-center mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${config.badgeColor}`}>
                    {config.badge}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black text-[#004063] text-center mb-1">
                  {config.title}
                </h1>

                {/* Urdu subtitle */}
                <p className="text-sm text-gray-400 text-center mb-5 font-medium">
                  {config.subtitle}
                </p>

                {/* Divider */}
                <div className="border-t border-gray-100 mb-5" />

                {/* Description */}
                <p className="text-sm text-gray-600 text-center leading-relaxed mb-8">
                  {config.description}
                </p>

                {/* Actions */}
                <div className="space-y-3">

                  {/* Primary — Go Home */}
                  <Link
                    href="/"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#004063] hover:bg-[#003050] text-white text-sm font-bold transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Back to Highrise.pk
                  </Link>

                  {/* Secondary — Re-subscribe (only on success/already states) */}
                  {config.showResubscribe && (
                    <Link
                      href="/#newsletter"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#029bba] text-[#029bba] hover:bg-[#029bba]/5 text-sm font-semibold transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Re-subscribe to Newsletter
                    </Link>
                  )}

                  {/* Contact us (error states) */}
                  {isError && pageState !== 'error_rate_limit' && (
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
                  {pageState === 'success' || pageState === 'already'
                    ? 'You will no longer receive marketing emails from us. Transactional emails may still be sent if you have an active account.'
                    : 'If you continue to experience issues, please contact us at info@highrise.pk'
                  }
                </p>
              </div>

            </div>

            {/* Below card note */}
            <p className="text-center text-xs text-gray-400 mt-6">
              © {new Date().getFullYear()} Highrise.pk · Pakistan&apos;s Premier Real Estate Platform
            </p>

          </div>
        </main>

      </div>
    </>
  );
}