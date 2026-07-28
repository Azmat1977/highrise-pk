// components/shared/EmailVerifyField.tsx
// ═══════════════════════════════════════════════════════════════
// EMAIL VERIFY FIELD — Highrise.pk V6.4.5+
// Complete email input + OTP verification flow in one component
// ═══════════════════════════════════════════════════════════════
// ✅ States: idle → sending → code_sent → verifying → verified
// ✅ Auto-checks verification status on mount
// ✅ OtpInput + ResendTimer integrated
// ✅ Verified → green pill, input locked
// ✅ Error handling with inline messages
// ✅ Works inside any form without conflicting submit
// ✅ No banned patterns, strict TypeScript
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  Mail,
  CheckCircle2,
  Send,
  Loader2,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";
import OtpInput from "@/components/shared/OtpInput";
import ResendTimer from "@/components/shared/ResendTimer";

// ============================================
// TYPES
// ============================================

type FieldState =
  | "idle"        // Email input + "Send Code" button
  | "sending"     // Sending OTP...
  | "code_sent"   // OTP input + verify button + resend timer
  | "verifying"   // Verifying code...
  | "verified";   // ✅ Verified — locked

type VerificationPurpose =
  | "company_email"
  | "authorized_person_email"
  | "agent_email"
  | "society_email"
  | "general";

interface EmailVerifyFieldProps {
  /** Label text above the input */
  label:        string;
  /** Current email value */
  email:        string;
  /** Verification purpose — determines OTP context */
  purpose:      VerificationPurpose;
  /** Called when email text changes */
  onEmailChange: (email: string) => void;
  /** Called when email is successfully verified */
  onVerified:    (email: string) => void;
  /** Show red asterisk */
  required?:    boolean;
  /** Help text below input */
  helpText?:    string;
  /** Disable all interactions */
  disabled?:    boolean;
  /** Initial verified state (skip check) */
  initialVerified?: boolean;
}

// ============================================
// STYLE HELPERS
// ============================================

const inputCls = [
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3",
  "text-sm text-[#333333] shadow-sm outline-none transition",
  "focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20",
  "placeholder:text-gray-400",
  "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
].join(" ");

const labelCls = "block text-sm font-semibold text-[#333333] mb-1.5";

// ============================================
// API RESPONSE TYPES
// ============================================

interface OtpSendResponse {
  success:          boolean;
  message:          string;
  alreadyVerified?: boolean;
  expiresInMinutes?: number;
  cooldownSeconds?:  number;
}

interface OtpVerifyResponse {
  success:            boolean;
  message:            string;
  verified?:          boolean;
  remainingAttempts?: number;
}

interface OtpStatusResponse {
  success: boolean;
  data?: {
    verified:    boolean;
    pending?:    boolean;
    expiresAt?:  string;
    attemptsRemaining?: number;
  };
}

// ============================================
// HELPERS
// ============================================

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EmailVerifyField({
  label,
  email,
  purpose,
  onEmailChange,
  onVerified,
  required     = false,
  helpText,
  disabled     = false,
  initialVerified = false,
}: EmailVerifyFieldProps): React.ReactElement {
  const [fieldState, setFieldState] = useState<FieldState>(
    initialVerified ? "verified" : "idle"
  );
  const [otpValue, setOtpValue]       = useState<string>("");
  const [error, setError]             = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [checkedEmail, setCheckedEmail] = useState<string>("");

  // ── Auto-check verification status on mount / email change ─
  useEffect(() => {
    if (
      !email.trim() ||
      !isValidEmailFormat(email) ||
      disabled ||
      initialVerified
    ) return;

    // Don't re-check same email
    if (email.trim().toLowerCase() === checkedEmail) return;

    const controller = new AbortController();
    let cancelled = false;

    const checkStatus = async (): Promise<void> => {
      try {
        const params = new URLSearchParams({
          email:   email.trim().toLowerCase(),
          purpose,
        });

        const res = await fetch(`/api/otp/status?${params.toString()}`, {
          credentials: "include",
          signal:      controller.signal,
        });

        if (cancelled) return;

        const data = (await res.json()) as OtpStatusResponse;

        if (data.success && data.data?.verified) {
          setFieldState("verified");
          setCheckedEmail(email.trim().toLowerCase());
          onVerified(email.trim().toLowerCase());
        } else if (data.success && data.data?.pending) {
          setFieldState("code_sent");
          setCheckedEmail(email.trim().toLowerCase());
        } else {
          setCheckedEmail(email.trim().toLowerCase());
        }
      } catch {
        // Silently fail — user can still manually verify
      }
    };

    void checkStatus();

    return () => {
      cancelled = true;
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, purpose, disabled, initialVerified]);

  // ── Send OTP ──────────────────────────────────────────────
  const handleSendCode = useCallback(async (): Promise<void> => {
    if (!email.trim() || !isValidEmailFormat(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setFieldState("sending");

    try {
      const res = await fetch("/api/otp/send", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email:   email.trim().toLowerCase(),
          purpose,
        }),
      });

      const data = (await res.json()) as OtpSendResponse;

      if (data.alreadyVerified) {
        setFieldState("verified");
        setSuccessMsg("Email already verified! ✅");
        onVerified(email.trim().toLowerCase());
        return;
      }

      if (!res.ok || !data.success) {
        setFieldState("idle");
        setError(data.message ?? "Failed to send verification code.");
        return;
      }

      setFieldState("code_sent");
      setOtpValue("");
      setSuccessMsg("Verification code sent! Check your email.");

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(null), 5000);

    } catch {
      setFieldState("idle");
      setError("Network error. Please check your connection.");
    }
  }, [email, purpose, onVerified]);

  // ── Verify OTP ────────────────────────────────────────────
  const handleVerifyCode = useCallback(async (): Promise<void> => {
    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setFieldState("verifying");

    try {
      const res = await fetch("/api/otp/verify", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email:   email.trim().toLowerCase(),
          purpose,
          code:    otpValue,
        }),
      });

      const data = (await res.json()) as OtpVerifyResponse;

      if (data.verified) {
        setFieldState("verified");
        setSuccessMsg("Email verified successfully! ✅");
        onVerified(email.trim().toLowerCase());
        return;
      }

      if (!res.ok || !data.success) {
        setFieldState("code_sent");

        // Show remaining attempts if available
        if (
          data.remainingAttempts !== undefined &&
          data.remainingAttempts <= 2
        ) {
          setError(data.message ?? "Incorrect code.");
        } else if (data.remainingAttempts === 0) {
          // Locked out — go back to idle to request new code
          setFieldState("idle");
          setError(
            "Too many wrong attempts. Please request a new code."
          );
          setOtpValue("");
        } else {
          setError(data.message ?? "Incorrect code. Please try again.");
        }
        return;
      }

    } catch {
      setFieldState("code_sent");
      setError("Network error. Please try again.");
    }
  }, [email, purpose, otpValue, onVerified]);

  // ── Auto-submit when all 6 digits entered ─────────────────
  useEffect(() => {
    if (
      otpValue.length === 6 &&
      fieldState === "code_sent"
    ) {
      void handleVerifyCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpValue]);

  // ── Resend OTP ────────────────────────────────────────────
  const handleResend = useCallback(async (): Promise<void> => {
    setIsResending(true);
    setError(null);

    try {
      const res = await fetch("/api/otp/send", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email:   email.trim().toLowerCase(),
          purpose,
        }),
      });

      const data = (await res.json()) as OtpSendResponse;

      if (data.alreadyVerified) {
        setFieldState("verified");
        onVerified(email.trim().toLowerCase());
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.message ?? "Failed to resend code.");
        return;
      }

      setOtpValue("");
      setSuccessMsg("New code sent! Check your email.");
      setTimeout(() => setSuccessMsg(null), 5000);

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsResending(false);
    }
  }, [email, purpose, onVerified]);

  // ── Cancel / change email ─────────────────────────────────
  const handleCancel = useCallback((): void => {
    setFieldState("idle");
    setOtpValue("");
    setError(null);
    setSuccessMsg(null);
  }, []);

  // ── Determine if email input should be locked ─────────────
  const isEmailLocked =
    fieldState === "code_sent" ||
    fieldState === "sending" ||
    fieldState === "verifying" ||
    fieldState === "verified";

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      {/* ── Label ────────────────────────────────────────────── */}
      <label className={labelCls}>
        {label}
        {required && <span className="text-[#ef4444] ml-0.5">*</span>}
      </label>

      {/* ── VERIFIED STATE ───────────────────────────────────── */}
      {fieldState === "verified" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700 flex-1 truncate">
              {email.trim().toLowerCase()}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </span>
          </div>
          {successMsg && (
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {successMsg}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* ── EMAIL INPUT + SEND BUTTON ─────────────────────── */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  onEmailChange(e.target.value);
                  setError(null);
                  // Reset verification state if email changes
                  if (fieldState !== "idle" && fieldState !== "sending") {
                    setFieldState("idle");
                    setOtpValue("");
                  }
                }}
                placeholder="e.g. info@company.com"
                className={`${inputCls} pl-10`}
                disabled={isEmailLocked || disabled}
                autoComplete="email"
              />
            </div>

            {/* Send / Change button */}
            {fieldState === "idle" && (
              <button
                type="button"
                onClick={() => { void handleSendCode(); }}
                disabled={
                  !email.trim() ||
                  !isValidEmailFormat(email) ||
                  disabled
                }
                className="px-4 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Send Code
              </button>
            )}

            {fieldState === "sending" && (
              <div className="px-4 py-2.5 rounded-xl bg-[#029bba]/80 text-white text-sm font-semibold flex items-center gap-1.5 shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending...
              </div>
            )}

            {(fieldState === "code_sent" || fieldState === "verifying") && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-2.5 rounded-xl border border-gray-300 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors shrink-0 flex items-center gap-1"
                title="Change email"
              >
                <X className="w-3.5 h-3.5" />
                Change
              </button>
            )}
          </div>

          {/* ── OTP ENTRY AREA (only when code_sent or verifying) ── */}
          {(fieldState === "code_sent" || fieldState === "verifying") && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
              {/* Instruction */}
              <p className="text-sm text-gray-600 text-center mb-4">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold text-[#004063]">
                  {email.trim().toLowerCase()}
                </span>
              </p>

              {/* OTP Input */}
              <div className="mb-4">
                <OtpInput
                  value={otpValue}
                  onChange={(val) => {
                    setOtpValue(val);
                    setError(null);
                  }}
                  disabled={fieldState === "verifying" || disabled}
                  hasError={Boolean(error)}
                  autoFocus
                />
              </div>

              {/* Verify button (manual — auto-submit also works) */}
              {fieldState === "verifying" ? (
                <div className="flex justify-center mb-4">
                  <div className="px-5 py-2.5 rounded-xl bg-[#029bba]/80 text-white text-sm font-semibold flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </div>
                </div>
              ) : (
                otpValue.length >= 1 && otpValue.length < 6 && (
                  <div className="flex justify-center mb-4">
                    <button
                      type="button"
                      onClick={() => { void handleVerifyCode(); }}
                      disabled={otpValue.length !== 6 || disabled}
                      className="px-5 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Verify Code
                    </button>
                  </div>
                )
              )}

              {/* Resend timer */}
              <ResendTimer
                cooldownSeconds={60}
                onResend={() => { void handleResend(); }}
                disabled={disabled}
                isResending={isResending}
              />
            </div>
          )}

          {/* ── Help text ──────────────────────────────────────── */}
          {helpText && fieldState === "idle" && (
            <p className="text-xs text-[#666666]">{helpText}</p>
          )}

          {/* ── Success message ────────────────────────────────── */}
          {successMsg && (
  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
    {successMsg}
  </p>
)}

          {/* ── Error message ──────────────────────────────────── */}
          {error && (
            <p className="text-xs text-[#ef4444] font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}