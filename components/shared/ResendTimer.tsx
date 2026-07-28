// components/shared/ResendTimer.tsx
// ═══════════════════════════════════════════════════════════════
// RESEND TIMER COMPONENT — Highrise.pk V6.4.5+
// Cooldown timer for OTP resend button
// ═══════════════════════════════════════════════════════════════
// ✅ Counts down from cooldownSeconds (default 60)
// ✅ Shows "Resend in Xs" while counting (disabled)
// ✅ Shows "Resend Code →" after countdown (clickable)
// ✅ Resets + restarts on click
// ✅ Accessible via aria-live
// ✅ No banned patterns, strict TypeScript
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from "react";
import { RotateCcw, Loader2 } from "lucide-react";

// ============================================
// TYPES
// ============================================

interface ResendTimerProps {
  /** Cooldown in seconds before resend is allowed (default 60) */
  cooldownSeconds?: number;
  /** Called when user clicks Resend */
  onResend:         () => void;
  /** Disable the resend button (e.g. while sending) */
  disabled?:        boolean;
  /** Show loading spinner instead of icon (e.g. while resending) */
  isResending?:     boolean;
}

// ============================================
// COMPONENT
// ============================================

export default function ResendTimer({
  cooldownSeconds = 60,
  onResend,
  disabled    = false,
  isResending = false,
}: ResendTimerProps): React.ReactElement {
  const [secondsLeft, setSecondsLeft] = useState<number>(cooldownSeconds);
  const [isActive, setIsActive]       = useState<boolean>(true);

  // ── Countdown effect ──────────────────────────────────────
  useEffect(() => {
    if (!isActive || secondsLeft <= 0) {
      if (secondsLeft <= 0) setIsActive(false);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, secondsLeft]);

  // ── Handle resend click ───────────────────────────────────
  const handleResend = useCallback((): void => {
    if (disabled || isResending || isActive) return;

    // Restart cooldown
    setSecondsLeft(cooldownSeconds);
    setIsActive(true);

    // Notify parent
    onResend();
  }, [disabled, isResending, isActive, cooldownSeconds, onResend]);

  // ── Render ────────────────────────────────────────────────
  const canResend = !isActive && !disabled && !isResending;

  // Progress as percentage (for visual indicator)
  const progressPct = Math.round(
    ((cooldownSeconds - secondsLeft) / cooldownSeconds) * 100
  );

  return (
    <div
      className="flex flex-col items-center gap-1.5"
      aria-live="polite"
      aria-atomic="true"
    >
      {isActive ? (
        // ── Counting down ─────────────────────────────────────
        <div className="flex items-center gap-2">
          {/* Circular progress ring */}
          <div className="relative w-5 h-5 shrink-0">
            <svg
              className="w-5 h-5 -rotate-90"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              {/* Background track */}
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              {/* Progress arc */}
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="#029bba"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 8}`}
                strokeDashoffset={`${
                  2 * Math.PI * 8 * (1 - progressPct / 100)
                }`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#029bba]" />
            </div>
          </div>

          <p className="text-sm text-gray-400" aria-label={`Resend available in ${secondsLeft} seconds`}>
            Resend in{" "}
            <span className="font-semibold text-gray-500 tabular-nums">
              {secondsLeft}s
            </span>
          </p>
        </div>
      ) : (
        // ── Ready to resend ───────────────────────────────────
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend}
          className={[
            "inline-flex items-center gap-1.5",
            "text-sm font-semibold transition-all duration-200",
            canResend
              ? "text-[#029bba] hover:text-[#027a94] hover:underline underline-offset-2 cursor-pointer"
              : "text-gray-300 cursor-not-allowed",
          ].join(" ")}
          aria-label="Resend verification code"
        >
          {isResending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              Resend Code
            </>
          )}
        </button>
      )}

      {/* Helper text */}
      {isActive && (
        <p className="text-xs text-gray-400">
          Didn&apos;t receive it? Check your spam folder.
        </p>
      )}
    </div>
  );
}