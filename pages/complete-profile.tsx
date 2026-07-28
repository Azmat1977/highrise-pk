// ========== FILE: pages/complete-profile.tsx ==========
// Highrise.pk — Complete Profile (Phone Verification)
// V6.9.0 — Social Login Lead Capture
// ═══════════════════════════════════════════════════════════════
// Shown after Google/Facebook login when phone is missing
// Two-step flow:
//   Step 1 → Enter phone number
//   Step 2 → Enter 6-digit OTP received via SMS
// After success → redirects to original destination or dashboard
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import {
  Phone, Shield, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, ArrowLeft, Bot, X, MessageSquare,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type Step = 'phone' | 'otp' | 'success';

interface BannerState {
  type: 'success' | 'error' | 'warning';
  message: string;
}

// ─── Banner Component ─────────────────────────────────────────

function Banner({ banner, onClose }: {
  banner: BannerState;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500]
      flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border
      backdrop-blur-sm max-w-sm w-full mx-4
      ${banner.type === 'success'
        ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
        : banner.type === 'error'
        ? 'bg-red-50/95 border-red-200 text-red-800'
        : 'bg-amber-50/95 border-amber-200 text-amber-800'}`}>
      {banner.type === 'success'
        ? <CheckCircle2 className="w-5 h-5 shrink-0" />
        : <AlertCircle className="w-5 h-5 shrink-0" />}
      <span className="text-sm font-semibold flex-1">{banner.message}</span>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-lg">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function CompleteProfilePage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status: authStatus, update } = useSession();

  // ── State ────────────────────────────────────────────────
  const [step, setStep]         = useState<Step>('phone');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [banner, setBanner]     = useState<BannerState | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Show Banner Helper ───────────────────────────────────
  const showBanner = (type: BannerState['type'], message: string) => {
    setBanner({ type, message });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 5000);
  };

  // ── Redirect Guards ──────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'loading') return;

    // Not logged in → send to login
    if (!session) {
      void router.replace('/login');
      return;
    }

    // Already verified → send to dashboard
    if (session.user?.phoneNumber && session.user?.isPhoneVerified) {
      const redirect = (router.query.redirect as string) || '/dashboard';
      void router.replace(redirect);
    }
  }, [session, authStatus, router]);

  // ── Resend Cooldown Timer ────────────────────────────────
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // ── Step 1: Request OTP ──────────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      showBanner('error', 'Please enter your phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/request-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showBanner('success', data.message);
        setStep('otp');
        setResendIn(60);
        // Auto-focus first OTP input
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        if (data.retryAfter) setResendIn(data.retryAfter);
        showBanner('error', data.message || 'Failed to send OTP.');
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      showBanner('error', 'Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep('success');
        showBanner('success', 'Phone verified successfully!');

        // Refresh session to get updated isPhoneVerified flag
        await update();

        // Redirect after 2 seconds
        setTimeout(() => {
          const redirect = (router.query.redirect as string) || '/dashboard';
          void router.replace(redirect);
        }, 2000);
      } else {
        showBanner('error', data.message || 'Invalid code.');
        setOtp('');
        otpInputRefs.current[0]?.focus();
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Input Handler ────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) value = value.slice(-1);

    const newOtp = otp.split('');
    newOtp[index] = value;
    const joined = newOtp.join('').slice(0, 6);
    setOtp(joined);

    // Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtp(pasted);
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── Loading State ────────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
      </div>
    );
  }

  if (!session) return <></>;

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Complete Your Profile | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {banner && <Banner banner={banner} onClose={() => setBanner(null)} />}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* ── Card ────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-[#029bba] to-[#004063] text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Almost There!</h1>
                  <p className="text-xs text-white/80">
                    Assalam-u-Alaikum, {session.user?.name?.split(' ')[0] || 'User'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-white/90 mt-3">
                We need to verify your phone number for a smooth experience.
              </p>
            </div>

            {/* Body */}
            <div className="p-8">

              {/* ── STEP 1: Phone Entry ─────────────────────── */}
              {step === 'phone' && (
                <form onSubmit={handleRequestOtp} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0300-1234567"
                        disabled={loading}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl
                          focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]
                          text-sm transition-colors disabled:opacity-50"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Format: 0300-1234567 or +923001234567
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                    <Bot className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-900 leading-relaxed">
                      <strong>Why phone?</strong> Verified developers &amp; agents will
                      contact you directly on this number. Your number is never shown publicly.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2
                      px-4 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold
                      hover:bg-[#027a94] transition-colors disabled:opacity-60
                      shadow-sm shadow-[#029bba]/20"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Send Verification Code
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ── STEP 2: OTP Entry ───────────────────────── */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <button
                      type="button"
                      onClick={() => { setStep('phone'); setOtp(''); }}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500
                        hover:text-gray-700 mb-3 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Change phone number
                    </button>

                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Enter 6-Digit Code
                    </label>
                    <p className="text-xs text-gray-500 mb-4">
                      Sent to <strong>{phone}</strong>
                    </p>

                    {/* 6 individual OTP boxes */}
                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <input
                          key={i}
                          ref={(el) => { otpInputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={otp[i] || ''}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          disabled={loading}
                          className="w-12 h-14 text-center text-xl font-black
                            border-2 border-gray-200 rounded-xl bg-white
                            focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]
                            transition-colors disabled:opacity-50"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full flex items-center justify-center gap-2
                      px-4 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold
                      hover:bg-[#027a94] transition-colors disabled:opacity-60
                      shadow-sm shadow-[#029bba]/20"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Verify &amp; Continue
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Resend */}
                  <div className="text-center">
                    {resendIn > 0 ? (
                      <p className="text-xs text-gray-500">
                        Resend code in <strong>{resendIn}s</strong>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading}
                        className="text-xs font-bold text-[#029bba] hover:underline disabled:opacity-50"
                      >
                        Didn&apos;t receive code? Resend
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* ── STEP 3: Success ─────────────────────────── */}
              {step === 'success' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-black text-gray-900 mb-2">
                    Phone Verified!
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    You can now send property inquiries with just one click.
                  </p>
                  <Loader2 className="w-5 h-5 text-[#029bba] animate-spin mx-auto" />
                  <p className="text-xs text-gray-400 mt-2">Redirecting...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {step !== 'success' && (
              <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Secure &amp; private
                </p>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Having trouble?{' '}
            <a href="mailto:support@highrise.pk" className="text-[#029bba] hover:underline font-semibold">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
// ========== END OF FILE ==========