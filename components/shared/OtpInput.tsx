// components/shared/OtpInput.tsx
// ═══════════════════════════════════════════════════════════════
// OTP INPUT COMPONENT — Highrise.pk V6.4.5+
// 6-digit verification code input with auto-advance
// ═══════════════════════════════════════════════════════════════
// ✅ 6 individual digit boxes
// ✅ Auto-advance on digit entry
// ✅ Backspace goes to previous box
// ✅ Full paste support (6-digit paste)
// ✅ Only digits (0-9) accepted
// ✅ Brand-colored focus ring (#029bba)
// ✅ Disabled + error states
// ✅ Auto-focus first box on mount (optional)
// ✅ No banned patterns, strict TypeScript
// ═══════════════════════════════════════════════════════════════

import React, {
  useRef,
  useCallback,
  useEffect,
} from "react";

// ============================================
// TYPES
// ============================================

interface OtpInputProps {
  /** Number of OTP digits (default 6) */
  length?:    number;
  /** Current OTP value as string */
  value:      string;
  /** Called when OTP changes */
  onChange:   (value: string) => void;
  /** Disable all inputs */
  disabled?:  boolean;
  /** Auto-focus first input on mount */
  autoFocus?: boolean;
  /** Show error styling */
  hasError?:  boolean;
  /** Accessible label */
  ariaLabel?: string;
}

// ============================================
// COMPONENT
// ============================================

export default function OtpInput({
  length    = 6,
  value,
  onChange,
  disabled  = false,
  autoFocus = true,
  hasError  = false,
  ariaLabel = "Verification code",
}: OtpInputProps): React.ReactElement {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Split value into individual characters ────────────────
  const digits = value.split("").slice(0, length);
  while (digits.length < length) {
    digits.push("");
  }

  // ── Auto-focus first input on mount ───────────────────────
  useEffect(() => {
    if (autoFocus && !disabled && inputRefs.current[0]) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  // ── Focus specific index ──────────────────────────────────
  const focusIndex = useCallback(
    (index: number): void => {
      const clamped = Math.max(0, Math.min(index, length - 1));
      inputRefs.current[clamped]?.focus();
      // Select text in the input so typing replaces it
      inputRefs.current[clamped]?.select();
    },
    [length]
  );

  // ── Build new value and emit ──────────────────────────────
  const updateValue = useCallback(
    (index: number, digit: string): void => {
      const newDigits = [...digits];
      newDigits[index] = digit;
      const newValue  = newDigits.join("").slice(0, length);
      onChange(newValue);
    },
    [digits, length, onChange]
  );

  // ── Handle single character input ─────────────────────────
  const handleInput = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>): void => {
      const inputValue = e.target.value;

      // Extract only digits
      const digitsOnly = inputValue.replace(/\D/g, "");

      if (!digitsOnly) {
        // Cleared — set empty
        updateValue(index, "");
        return;
      }

      // Handle multi-character input (e.g., autocomplete fills 1 char)
      if (digitsOnly.length === 1) {
        updateValue(index, digitsOnly);
        // Auto-advance to next box
        if (index < length - 1) {
          focusIndex(index + 1);
        }
        return;
      }

      // Multiple digits typed/autocompleted — fill sequentially
      const chars  = digitsOnly.slice(0, length - index);
      const newDig = [...digits];
      for (let i = 0; i < chars.length; i++) {
        if (index + i < length) {
          newDig[index + i] = chars[i];
        }
      }
      onChange(newDig.join("").slice(0, length));

      // Focus the next empty box or last
      const nextEmpty = newDig.findIndex((d, idx) => idx >= index && !d);
      focusIndex(nextEmpty >= 0 ? nextEmpty : length - 1);
    },
    [digits, length, onChange, updateValue, focusIndex]
  );

  // ── Handle paste ──────────────────────────────────────────
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>): void => {
      e.preventDefault();
      const pasteData = e.clipboardData.getData("text/plain").trim();
      const digitsOnly = pasteData.replace(/\D/g, "").slice(0, length);

      if (!digitsOnly) return;

      onChange(digitsOnly);

      // Focus the next empty box or last
      const nextIndex = Math.min(digitsOnly.length, length - 1);
      focusIndex(nextIndex);
    },
    [length, onChange, focusIndex]
  );

  // ── Handle keyboard navigation ────────────────────────────
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
      switch (e.key) {
        case "Backspace": {
          e.preventDefault();
          if (digits[index]) {
            // Clear current digit
            updateValue(index, "");
          } else if (index > 0) {
            // Move to previous and clear it
            updateValue(index - 1, "");
            focusIndex(index - 1);
          }
          break;
        }

        case "Delete": {
          e.preventDefault();
          updateValue(index, "");
          break;
        }

        case "ArrowLeft": {
          e.preventDefault();
          if (index > 0) {
            focusIndex(index - 1);
          }
          break;
        }

        case "ArrowRight": {
          e.preventDefault();
          if (index < length - 1) {
            focusIndex(index + 1);
          }
          break;
        }

        case "Home": {
          e.preventDefault();
          focusIndex(0);
          break;
        }

        case "End": {
          e.preventDefault();
          focusIndex(length - 1);
          break;
        }

        default: {
          // Only allow digits — block everything else
          // (Letters, symbols, etc. are blocked)
          if (e.key.length === 1 && !/^\d$/.test(e.key)) {
            e.preventDefault();
          }
          break;
        }
      }
    },
    [digits, length, updateValue, focusIndex]
  );

  // ── Handle click — select the digit ───────────────────────
  const handleClick = useCallback(
    (index: number): void => {
      // If clicking a box beyond the current filled position,
      // focus the first empty box instead
      const firstEmpty = digits.findIndex((d) => !d);
      if (firstEmpty >= 0 && index > firstEmpty) {
        focusIndex(firstEmpty);
      } else {
        focusIndex(index);
      }
    },
    [digits, focusIndex]
  );

  // ── Handle focus — select text ────────────────────────────
  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>): void => {
      e.target.select();
    },
    []
  );

  // ── Derive border color ───────────────────────────────────
  const getBorderClass = (index: number): string => {
    if (hasError) return "border-[#ef4444] ring-[#ef4444]/20";
    if (digits[index]) return "border-[#029bba] ring-[#029bba]/20";
    return "border-gray-300";
  };

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3"
      role="group"
      aria-label={ariaLabel}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          onChange={(e) => handleInput(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onClick={() => handleClick(index)}
          onFocus={handleFocus}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={[
            "w-11 h-13 sm:w-12 sm:h-14",
            "rounded-xl border-2 bg-white",
            "text-center text-xl sm:text-2xl font-bold text-[#004063]",
            "outline-none transition-all duration-200",
            "focus:ring-2",
            getBorderClass(index),
            disabled
              ? "bg-gray-50 text-gray-400 cursor-not-allowed opacity-60"
              : "hover:border-[#029bba]/50",
            // Filled state — subtle background
            digit && !hasError ? "bg-[#029bba]/5" : "",
          ].join(" ")}
        />
      ))}
    </div>
  );
}