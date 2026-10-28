// components/shared/CurrencyConverter.tsx
// ═══════════════════════════════════════════════════════════════
// HIGHRISE GLOBAL CURRENCY CONVERTER — UI Component
// Hover tooltip + Click modal for global currency conversion.
// Overseas Pakistanis' best friend! 🌍
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Coins,
  X,
  Shield,
  Clock,
  Globe,
  ChevronRight,
} from 'lucide-react';
import {
  getSortedCurrencies,
  convertRangeToCurrency,
  getRateFreshnessLabel,
  RATE_SOURCE,
} from '@/lib/currency/exchangeRates';

// ============================================
// HD FLAG ICON (Cross-Platform Windows/Mac Fix)
// ============================================

function FlagIcon({ flagCode, name }: { flagCode: string; name?: string }) {
  const code = (flagCode || 'un').toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width="20"
      height="14"
      alt={name || flagCode}
      className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm shrink-0 border border-white/20"
      loading="lazy"
    />
  );
}

// ============================================
// TYPES
// ============================================

interface PriceWithConverterProps {
  minPKR: number;
  maxPKR?: number;
  displayText?: string;      // Optional — omit for icon-only usage (e.g. ChooseYourSpace rows)
  size?: 'sm' | 'md' | 'lg'; // Icon size
  align?: 'left' | 'right';  // Tooltip alignment
  className?: string;
}

interface CurrencyConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  minPKR: number;
  maxPKR?: number;
  displayText?: string;
  projectName?: string;
}

// ============================================
// QUICK HOVER TOOLTIP
// ============================================

function CurrencyTooltip({
  minPKR,
  maxPKR,
  align = 'right',
  onOpenModal,
  onMouseEnter,
  onMouseLeave,
  style,
}: {
  minPKR: number;
  maxPKR?: number;
  align?: 'left' | 'right';
  onOpenModal: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  style?: React.CSSProperties;
}): React.ReactElement {  const topCurrencies = getSortedCurrencies(5);
  const effectiveMax = maxPKR ?? minPKR;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      className="fixed z-[300] w-[22rem] sm:w-96 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#029bba] to-[#017a94] flex items-center gap-2">
        <Globe className="w-4 h-4 text-white shrink-0" />
        <p className="text-xs font-black text-white uppercase tracking-wide">
          Price in Global Currencies
        </p>
      </div>

      {/* Currency List — left aligned flag + code + full price */}
      <div className="p-3 space-y-1">
        {topCurrencies.map((currency) => (
          <div
            key={currency.code}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2.5 w-[4.75rem] shrink-0">
              <FlagIcon flagCode={currency.flagCode} name={currency.country} />
              <span className="text-[11px] font-black tracking-wider text-gray-300">
                {currency.code}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-700 shrink-0" />
            <span className="text-[12px] sm:text-[13px] font-mono font-bold text-white text-left leading-snug break-words min-w-0 flex-1">
              {convertRangeToCurrency(minPKR, effectiveMax, currency.code)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-950 border-t border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Shield className="w-3 h-3 text-green-400 shrink-0" />
            <span className="text-[10px] text-gray-400 truncate">
              {getRateFreshnessLabel()}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal();
            }}
            className="flex items-center gap-0.5 text-[10px] font-bold text-[#029bba] hover:text-white transition-colors shrink-0"
          >
            View All
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

     {/* Arrow pointer */}
      <div className={`absolute -top-1.5 ${align === 'left' ? 'left-4' : 'right-4'} w-3 h-3 bg-[#029bba] rotate-45`} />    </div>
  );
}

// ============================================
// FULL MODAL
// ============================================

function CurrencyConverterModal({
  isOpen,
  onClose,
  minPKR,
  maxPKR,
  displayText,
  projectName,
}: CurrencyConverterModalProps): React.ReactElement | null {
  const allCurrencies = getSortedCurrencies();
  const effectiveMax = maxPKR ?? minPKR;

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Currency converter"
        className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#029bba] to-[#017a94] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Global Currency Converter
              </h3>
              {projectName && (
                <p className="text-xs text-white/70 mt-0.5">{projectName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            autoFocus
            aria-label="Close"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Original Price Display */}
        {displayText && (
          <div className="px-6 py-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 shrink-0">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
              Original Price (Pakistani Rupees)
            </p>
            <p className="text-xl font-black text-gray-900">{displayText}</p>
          </div>
        )}

        {/* Currency List — Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {allCurrencies.map((currency, idx) => {
            const converted = convertRangeToCurrency(
              minPKR,
              effectiveMax,
              currency.code
            );

            return (
              <div
                key={currency.code}
                className={`group flex items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  idx < 4
                    ? 'bg-gradient-to-r from-[#029bba]/5 to-white border-[#029bba]/20 hover:border-[#029bba]/40 hover:shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Left: Flag + Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FlagIcon flagCode={currency.flagCode} name={currency.country} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-gray-900">
                        {currency.code}
                      </span>
                      {idx < 4 && (
                        <span className="px-1.5 py-0.5 bg-[#029bba]/10 text-[#029bba] text-[9px] font-black rounded uppercase">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">
                      {currency.name} · {currency.country}
                    </p>
                  </div>
                </div>

                {/* Right: Converted Amount */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-black text-[#029bba]">
                    {converted}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer — Trust Signal */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-black text-gray-900">
                  Trusted Exchange Rates
                </p>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 rounded text-[9px] font-black text-green-700 uppercase">
                  <Clock className="w-2.5 h-2.5" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {getRateFreshnessLabel()} · Source: {RATE_SOURCE}
              </p>
              <p className="text-[10px] text-gray-400 italic mt-1.5 leading-relaxed">
                Displayed for reference only. Actual transaction rates may vary. Consult your bank for final rates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT — Price + Converter Icon
// ============================================

export default function PriceWithConverter({
  minPKR,
  maxPKR,
  displayText,
  size = 'md',
  align = 'right',
  className = '',
}: PriceWithConverterProps): React.ReactElement {
  const [isHovering, setIsHovering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipPos, setTooltipPos] = useState<React.CSSProperties | null>(null);

  // Clear pending hover timeout on unmount
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const buttonSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-8 h-8' : 'w-7 h-7';
  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Portal positioning — fixed coords from trigger rect (escapes
    // overflow-hidden ancestors that clipped the old absolute tooltip)
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 384; // w-96 — fits full FX ranges without truncation
      let left = align === 'left' ? rect.left : rect.right - width;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      setTooltipPos({ top: rect.bottom + 10, left });
    }
    setIsHovering(true);
  }, [align]);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 200); // 200ms delay to allow moving to tooltip
  }, []);

  const openModal = useCallback(() => {
    lastActiveElementRef.current =
      typeof document !== 'undefined'
        ? (document.activeElement as HTMLElement | null)
        : null;
    setIsHovering(false);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    lastActiveElementRef.current?.focus();
  }, []);
  // Don't show converter if no valid price
  if (!minPKR || minPKR <= 0) {
    return <>{displayText ?? null}</>;
  }

  return (
    <>
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        {displayText && <span>{displayText}</span>}
        {/* Converter Icon */}
        <span
          className="relative inline-block"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            ref={buttonRef}
            type="button"
            onClick={openModal}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
            aria-label="View price in other currencies"
            title="Convert currency"
            className={`${buttonSize} rounded-full flex items-center justify-center
                        text-[#029bba]/70 hover:text-[#029bba]
                        hover:bg-[#029bba]/10
                        transition-colors duration-150`}
          >
            <Coins className={iconSize} strokeWidth={2} />
          </button>
          {/* Hover Tooltip — portal to body (topmost, never clipped) */}
          {isHovering && tooltipPos && typeof document !== 'undefined' && createPortal(
            <CurrencyTooltip
              minPKR={minPKR}
              maxPKR={maxPKR}
              align={align}
              onOpenModal={openModal}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={tooltipPos}
            />,
            document.body,
          )}
        </span>
      </span>

      {/* Full Modal */}
      <CurrencyConverterModal
        isOpen={isModalOpen}
        onClose={closeModal}
        minPKR={minPKR}
        maxPKR={maxPKR}
        displayText={displayText}
      />
    </>
  );
}