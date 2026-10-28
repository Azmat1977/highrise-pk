/**
 * components/auth/AuthGateModal.tsx
 *
 * Highrise.pk — Enterprise Auth Gate Modal
 *
 * Purpose:
 *   Shown when a guest tries to perform a login-required action
 *   (inquiry, save, contact, book visit, etc.)
 *
 * Features:
 *   → 3 login options: Google, Facebook, Email
 *   → 1-click Google login (RECOMMENDED — highest conversion)
 *   → Email option redirects to /login with callbackUrl
 *   → Portal rendered (no z-index conflicts)
 *   → Body scroll lock
 *   → ESC key handling
 *   → Keyboard accessible
 *   → Mobile-first (375px min)
 *
 * SECURITY:
 *   → Uses NextAuth's signIn() — no custom OAuth code
 *   → callbackUrl auto-preserves current page + search params
 *   → No credentials handled directly
 *   → CSRF handled by NextAuth internally
 *
 * SEO:
 *   → No SEO impact (modal only, not indexed)
 *   → aria-modal="true" for screen readers
 *   → aria-label on all buttons
 *
 * Rules:
 *   → Tailwind only (zero inline styles)
 *   → Lucide React icons only
 *   → No framer-motion
 *   → Rounded-2xl (per brand)
 *   → Highrise teal #029bba primary
 */

'use client';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import LoginOrSignupForm from '@/components/auth/LoginOrSignupForm';
import {
  X,
  Mail,
  Shield,
  Loader2,
  Sparkles,
  Lock,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthGateModalProps {
  isOpen:              boolean;
  onClose:             () => void;
  /** Description of the action (e.g. "book a site visit") */
  actionDescription?:  string;
  /** Entity title for context (e.g. "Al Rehman Arcade") */
  entityTitle?:        string;
  /** Custom title (overrides default) */
  title?:              string;
  /** Custom subtitle (overrides default) */
  subtitle?:           string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN PROVIDER CONFIG
// ─────────────────────────────────────────────────────────────────────────────

type ProviderKey = 'google' | 'facebook' | 'email';

// ─────────────────────────────────────────────────────────────────────────────
// SVG PROVIDER ICONS (inline — no external dependency)
// Google and Facebook require brand-accurate multi-color SVGs
// ─────────────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthGateModal({
  isOpen,
  onClose,
  actionDescription = 'continue',
  entityTitle,
  title,
  subtitle,
}: AuthGateModalProps): React.ReactElement | null {

  const router = useRouter();

  const [loadingProvider, setLoadingProvider] = useState<ProviderKey | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [viewMode,        setViewMode]        = useState<'gate' | 'form'>('gate');
  const [formDefaultMode, setFormDefaultMode] = useState<'login' | 'signup'>('login');

  // ─── Body scroll lock ───
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setLoadingProvider(null);
      setError(null);
      setViewMode('gate');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ─── ESC key handling ───
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingProvider) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, loadingProvider]);

  // ─── Get current URL for callbackUrl (preserves query params) ───
  const getCurrentUrl = (): string => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname + window.location.search;
  };

  // ─── OAuth login handler (Google / Facebook) ───
  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    if (loadingProvider) return;
    setLoadingProvider(provider);
    setError(null);

    try {
      const callbackUrl = getCurrentUrl();

      // NextAuth handles the OAuth redirect + returns to same page
      await signIn(provider, {
        callbackUrl,
        redirect: true, // Full redirect for OAuth
      });
      // Note: page will redirect, no further code runs here
    } catch (err) {
      setLoadingProvider(null);
      setError('Login failed. Please try again.');
    }
  };

  // ─── Email login handler (In-place modal switch) ───
  const handleEmailLogin = () => {
    if (loadingProvider) return;
    setFormDefaultMode('login');
    setViewMode('form');
  };

  // ─── Register handler (In-place modal switch) ───
  const handleRegister = () => {
    if (loadingProvider) return;
    setFormDefaultMode('signup');
    setViewMode('form');
  };

  if (!isOpen) return null;

  // ─── Build display texts ───
  const displayTitle = title || 'Almost there!';
  const displaySubtitle = subtitle || (
    entityTitle
      ? `To ${actionDescription} for ${entityTitle}, please sign in first.`
      : `To ${actionDescription}, please sign in first.`
  );

  // ─── Modal Content ───
  const modalContent = (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-full items-center justify-center p-4">

        {/* ─── Backdrop ─── */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            if (!loadingProvider) onClose();
          }}
          aria-hidden="true"
        />

        {/* ─── Modal Panel ─── */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {viewMode === 'form' ? (
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              {/* Back to Options Bar */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewMode('gate')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba] hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to 1-Click Options
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Embedded Login / Signup Form */}
              <LoginOrSignupForm
                isModal={true}
                defaultMode={formDefaultMode}
                context="contact"
                onSuccess={() => {
                  onClose();
                }}
              />
            </div>
          ) : (
            <>

          {/* ── Header with gradient ── */}
          <div className="relative bg-gradient-to-br from-[#029bba] to-[#004063] p-6 text-white">

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={!!loadingProvider}
              aria-label="Close login modal"
              className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white
                         hover:bg-white/10 rounded-lg transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Lock icon */}
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm
                            flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-white" />
            </div>

            {/* Title */}
            <h2
              id="auth-gate-title"
              className="text-2xl font-black mb-1"
            >
              {displayTitle}
            </h2>

            {/* Subtitle */}
            <p className="text-white/85 text-sm leading-relaxed">
              {displaySubtitle}
            </p>
          </div>

          {/* ── Body ── */}
          <div className="p-6 space-y-3">

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700
                              px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* ── PRIMARY: Google Login (1-click, highest conversion) ── */}
            <button
              type="button"
              onClick={() => void handleOAuthLogin('google')}
              disabled={!!loadingProvider}
              aria-label="Continue with Google"
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5
                         bg-white border-2 border-gray-200 rounded-xl
                         text-gray-800 font-bold text-sm
                         hover:border-[#029bba]/40 hover:bg-gray-50
                         transition-all duration-200
                         disabled:opacity-60 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-[#029bba]/40"
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#029bba]" />
              ) : (
                <GoogleIcon />
              )}
              <span>
                {loadingProvider === 'google'
                  ? 'Connecting to Google...'
                  : 'Continue with Google'}
              </span>
              {!loadingProvider && (
                <span className="ml-auto text-[10px] font-black text-[#029bba]
                                bg-[#029bba]/10 px-2 py-0.5 rounded-full">
                  1-CLICK
                </span>
              )}
            </button>

            {/* ── SECONDARY: Facebook Login ── */}
            <button
              type="button"
              onClick={() => void handleOAuthLogin('facebook')}
              disabled={!!loadingProvider}
              aria-label="Continue with Facebook"
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5
                         bg-white border-2 border-gray-200 rounded-xl
                         text-gray-800 font-bold text-sm
                         hover:border-[#029bba]/40 hover:bg-gray-50
                         transition-all duration-200
                         disabled:opacity-60 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-[#029bba]/40"
            >
              {loadingProvider === 'facebook' ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#029bba]" />
              ) : (
                <FacebookIcon />
              )}
              <span>
                {loadingProvider === 'facebook'
                  ? 'Connecting to Facebook...'
                  : 'Continue with Facebook'}
              </span>
            </button>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-200" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                Or
              </p>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ── TERTIARY: Email Login (redirects to /login) ── */}
            <button
              type="button"
              onClick={handleEmailLogin}
              disabled={!!loadingProvider}
              aria-label="Continue with email"
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5
                         bg-gradient-to-r from-[#029bba] to-[#017a94]
                         hover:from-[#02a8c9] hover:to-[#018a9a]
                         text-white font-bold text-sm rounded-xl
                         transition-all duration-200 shadow-lg shadow-[#029bba]/20
                         disabled:opacity-60 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
            >
              {loadingProvider === 'email' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              <span>
                {loadingProvider === 'email'
                  ? 'Loading...'
                  : 'Continue with Email'}
              </span>
            </button>

            {/* ── Register link ── */}
            <div className="pt-2 text-center">
              <p className="text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={!!loadingProvider}
                  className="font-bold text-[#029bba] hover:text-[#017a94]
                             hover:underline transition-colors
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Register free
                </button>
              </p>
            </div>

            {/* ── Trust signals ── */}
            <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
                <span>Your data is 100% secure and encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>We never share your info with third parties</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>Save projects, get alerts, and track inquiries</span>
              </div>
            </div>

             {/* ─── Highrise branding ─── */}
            <div className="flex items-center justify-center gap-1.5 pt-3
                            border-t border-gray-100">
              <Shield className="w-3 h-3 text-[#029bba]" />
              <p className="text-[10px] text-gray-400 font-semibold">
                Powered by{' '}
                <span className="text-[#029bba] font-black">Highrise.pk</span>
                {' '}— Pakistan&apos;s most trusted property platform
              </p>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(modalContent, document.body);
}