// ========== FILE: components/leads/PhoneCaptureModal.tsx ==========
// Highrise.pk — Phone Capture Modal (Inline OTP Flow)
// V6.9.0 — Social Login Lead Capture
// ═══════════════════════════════════════════════════════════════
// Reusable modal for capturing phone number without page redirect.
// Used inside QuickInquiryButton when logged-in user has no phone.
//
// Flow:
//   Step 1 → Enter phone → sends OTP
//   Step 2 → Enter 6-digit OTP → verifies
//   Step 3 → Success callback fires → parent creates lead
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Phone, Shield, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, ArrowLeft, Bot, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type Step = 'phone' | 'otp' | 'success';

interface PhoneCaptureModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  onSuccess:   () => void;               // fires after OTP verified
  title?:      string;                    // optional custom title
  subtitle?:   string;                    // optional custom subtitle
}

// ─── Component ────────────────────────────────────────────────

export default function PhoneCaptureModal({
  isOpen,
  onClose,
  onSuccess,
  title    = 'Verify Your Phone',
  subtitle = 'One-time step to send inquiries with a single click.',
}: PhoneCaptureModalProps): React.ReactElement | null {

  const { data: session, update } = useSession();

  // ── State ────────────────────────────────────────────────
  const [step, setStep]         = useState<Step>('phone');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [resendIn, setResendIn] = useState(0);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Body scroll lock ─────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Reset on close ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      // Small delay so user sees success state before reset
      const t = setTimeout(() => {
        setStep('phone');
        setPhone('');
        setOtp('');
        setError('');
        setLoading(false);
        setResendIn(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Close on Escape ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen, loading, onClose]);

  // ── Resend cooldown ──────────────────────────────────────
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // ── Step 1: Request OTP ──────────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/request-phone-otp', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep('otp');
        setResendIn(60);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        if (data.retryAfter) setResendIn(data.retryAfter);
        setError(data.message || 'Failed to send OTP.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/verify-phone-otp', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ otp }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep('success');

        // Refresh session so isPhoneVerified flag updates
        await update();

        // Fire success callback after 1.5s (lets user see success state)
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(data.message || 'Invalid code.');
        setOtp('');
        otpInputRefs.current[0]?.focus();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Input Handlers ───────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) value = value.slice(-1);

    const newOtp = otp.split('');
    newOtp[index] = value;
    const joined = newOtp.join('').slice(0, 6);
    setOtp(joined);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
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

  // ── Don't render if closed ───────────────────────────────
  if (!isOpen) return null;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10
        border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-[#029bba] to-[#004063] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold truncate">
                {step === 'success' ? '✅ Verified!' : title}
              </h3>
              <p className="text-xs text-white/80 truncate">
                {step === 'success'
                  ? 'Your phone is verified'
                  : subtitle}
              </p>
            </div>
            {!loading && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-semibold flex-1">{error}</p>
            </div>
          )}

          {/* ── STEP 1: Phone Entry ─────────────────────── */}
          {step === 'phone' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">

              {/* Greeting */}
              {session?.user?.name && (
                <p className="text-sm text-gray-600">
                  Assalam-u-Alaikum, <strong className="text-gray-900">
                    {session.user.name.split(' ')[0]}
                  </strong>! 👋
                </p>
              )}

              {/* Phone Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
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
                <p className="text-[11px] text-gray-500 mt-1">
                  Pakistani mobile only (e.g. 0300-1234567)
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                <Bot className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  Your number stays private. Only verified developers and agents
                  will contact you about this inquiry.
                </p>
              </div>

              {/* Submit */}
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

              {/* Back button */}
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="flex items-center gap-1 text-xs font-semibold text-gray-500
                  hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change phone number
              </button>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                  Enter 6-Digit Code
                </label>
                <p className="text-xs text-gray-500 mb-4">
                  Sent to <strong className="text-gray-900">{phone}</strong>
                </p>

                {/* 6 OTP boxes */}
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
                      className="w-11 h-13 text-center text-lg font-black
                        border-2 border-gray-200 rounded-xl bg-white
                        focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]
                        transition-colors disabled:opacity-50"
                      style={{ height: '52px' }}
                    />
                  ))}
                </div>
              </div>

              {/* Submit */}
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
                    Verify &amp; Send Inquiry
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
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h4 className="text-base font-black text-gray-900 mb-1">
                Phone Verified!
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Sending your inquiry now...
              </p>
              <Loader2 className="w-4 h-4 text-[#029bba] animate-spin mx-auto" />
            </div>
          )}

        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Secure &amp; private — number never shown publicly
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
// ========== END OF FILE ==========