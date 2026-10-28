// components/projects/InstallmentEstimatorModal.tsx
// --- INTERACTIVE INSTALLMENT & DOWN PAYMENT ESTIMATOR ---
// Client-Side Only | No API Calls | PKR Formatted | Lead Attribution Ready

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Calculator,
  CreditCard,
  Calendar,
  Building2,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatPKR } from '@/types/projects';
import UniversalInquiryModal from '@/components/UniversalInquiryModal';

interface InstallmentEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  minPrice: number | null;
  maxPrice: number | null;
  developerId: string | null;
  developerName: string;
  city: string;
  area: string;
  primaryImage: string | null;
  isSponsored?: boolean;
  campaignSource?: string;
}

const DOWN_PAYMENT_OPTIONS = [10, 15, 20, 25, 30];
const DURATION_OPTIONS = [
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 },
  { label: '4 Years', months: 48 },
  { label: '5 Years', months: 60 },
];

export default function InstallmentEstimatorModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  minPrice,
  maxPrice,
  developerId,
  developerName,
  city,
  area,
  primaryImage,
  isSponsored = false,
  campaignSource,
}: InstallmentEstimatorModalProps): React.ReactElement | null {
  const [downPct, setDownPct] = useState(20);
  const [durationMonths, setDurationMonths] = useState(36);
  const [balloonPct, setBalloonPct] = useState(0);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  // Use midpoint of price range as estimated unit price
  const estimatedPrice = useMemo(() => {
    if (minPrice && maxPrice) return Math.round((minPrice + maxPrice) / 2);
    if (minPrice) return minPrice;
    if (maxPrice) return maxPrice;
    return 0;
  }, [minPrice, maxPrice]);

  // Real-time calculation
  const calculation = useMemo(() => {
    if (estimatedPrice <= 0) return null;

    const downPayment = Math.round(estimatedPrice * (downPct / 100));
    const balloonPayment = Math.round(estimatedPrice * (balloonPct / 100));
    const financedAmount = estimatedPrice - downPayment - balloonPayment;
    const monthlyInstallment = Math.round(financedAmount / durationMonths);
    const quarterlyInstallment = Math.round(financedAmount / (durationMonths / 3));

    return {
      estimatedPrice,
      downPayment,
      balloonPayment,
      financedAmount,
      monthlyInstallment,
      quarterlyInstallment,
    };
  }, [estimatedPrice, downPct, durationMonths, balloonPct]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || estimatedPrice <= 0) return null;

  const preFilledMessage = calculation
    ? `I am interested in ${projectName} (${city}, ${area}).\n\nBased on your installment plan, my estimated breakdown is:\n- Estimated Price: PKR ${formatPKR(calculation.estimatedPrice)}\n- Down Payment (${downPct}%): PKR ${formatPKR(calculation.downPayment)}\n- Monthly Installment (${durationMonths} months): PKR ${formatPKR(calculation.monthlyInstallment)}\n- Quarterly Installment: PKR ${formatPKR(calculation.quarterlyInstallment)}${calculation.balloonPayment > 0 ? `\n- Balloon on Possession (${balloonPct}%): PKR ${formatPKR(calculation.balloonPayment)}` : ''}\n\nPlease confirm availability and share the exact payment schedule.`
    : `I am interested in ${projectName}. Please share installment plan details.`;

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emi-modal-title"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Panel */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#029bba]/5 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                <Calculator className="w-4.5 h-4.5 text-[#029bba]" />
              </div>
              <div>
                <h2 id="emi-modal-title" className="text-sm font-black text-[#004063]">
                  Installment Calculator
                </h2>
                <p className="text-[10px] text-gray-400 font-semibold truncate max-w-[200px]">
                  {projectName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
              aria-label="Close calculator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-5">
            {/* Estimated Price Display */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Estimated Unit Price
              </p>
              <p className="text-xl font-black text-[#029bba] mt-1">
                PKR {formatPKR(estimatedPrice)}
              </p>
              {minPrice && maxPrice && minPrice !== maxPrice && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Range: PKR {formatPKR(minPrice)} - {formatPKR(maxPrice)}
                </p>
              )}
            </div>

            {/* Down Payment Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                <CreditCard className="w-3.5 h-3.5 text-[#029bba]" />
                Down Payment
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {DOWN_PAYMENT_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDownPct(pct)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      downPct === pct
                        ? 'bg-[#029bba] border-[#029bba] text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-[#029bba]/40'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                <Calendar className="w-3.5 h-3.5 text-[#029bba]" />
                Payment Duration
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.months}
                    type="button"
                    onClick={() => setDurationMonths(opt.months)}
                    className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                      durationMonths === opt.months
                        ? 'bg-[#004063] border-[#004063] text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-[#004063]/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Balloon Payment Toggle */}
            <div className="flex items-center justify-between p-3 border border-dashed border-gray-200 rounded-xl">
              <div>
                <p className="text-xs font-bold text-gray-700">Balloon on Possession</p>
                <p className="text-[10px] text-gray-400">Pay 10% at handover</p>
              </div>
              <button
                type="button"
                onClick={() => setBalloonPct(balloonPct === 0 ? 10 : 0)}
                className={`w-10 h-5 rounded-full transition-colors relative flex items-center ${
                  balloonPct > 0 ? 'bg-[#029bba]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white shadow absolute transition-transform ${
                    balloonPct > 0 ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Results */}
            {calculation && (
              <div className="bg-gradient-to-br from-[#029bba]/5 to-[#004063]/5 rounded-xl border border-[#029bba]/15 p-4 space-y-3">
                <p className="text-[10px] font-bold text-[#004063] uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Your Estimated Breakdown
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Down Payment</p>
                    <p className="text-sm font-black text-gray-900 mt-0.5">
                      PKR {formatPKR(calculation.downPayment)}
                    </p>
                    <p className="text-[9px] text-gray-400">{downPct}% upfront</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Financed</p>
                    <p className="text-sm font-black text-gray-900 mt-0.5">
                      PKR {formatPKR(calculation.financedAmount)}
                    </p>
                    <p className="text-[9px] text-gray-400">Over {durationMonths} months</p>
                  </div>

                  <div className="p-2.5 bg-[#029bba]/10 rounded-lg border border-[#029bba]/20">
                    <p className="text-[9px] font-bold text-[#029bba] uppercase">Monthly EMI</p>
                    <p className="text-sm font-black text-[#029bba] mt-0.5">
                      PKR {formatPKR(calculation.monthlyInstallment)}
                    </p>
                    <p className="text-[9px] text-[#029bba]/70">Per month</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Quarterly</p>
                    <p className="text-sm font-black text-gray-900 mt-0.5">
                      PKR {formatPKR(calculation.quarterlyInstallment)}
                    </p>
                    <p className="text-[9px] text-gray-400">Every 3 months</p>
                  </div>
                </div>

                {calculation.balloonPayment > 0 && (
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-700">
                      Balloon on Possession ({balloonPct}%)
                    </span>
                    <span className="text-xs font-black text-amber-700">
                      PKR {formatPKR(calculation.balloonPayment)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-[9px] text-gray-400 leading-relaxed text-center">
              This is an estimate based on listed price ranges. Actual payment plans
              may vary. Contact the developer for confirmed schedules.
            </p>
          </div>

          {/* Footer CTA */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={() => setInquiryOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#029bba] hover:bg-[#017a94] text-white text-sm font-bold transition-colors shadow-md shadow-[#029bba]/20"
            >
              <MessageSquare className="w-4 h-4" />
              Inquire on This Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return (
    <>
      {ReactDOM.createPortal(modalContent, document.body)}

      {/* Nested Inquiry Modal with pre-filled installment breakdown */}
      <UniversalInquiryModal
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        entityType="project"
        entityId={projectId}
        entityTitle={projectName}
        entityPrice={estimatedPrice}
        entityLocation={[area, city].filter(Boolean).join(', ')}
        entityImage={primaryImage ?? undefined}
        developerId={developerId ?? undefined}
        developerName={developerName}
        leadType="payment_plan"
        buttonText="Send Payment Plan Inquiry"
        isSponsored={isSponsored}
        campaignSource={campaignSource}
      />
    </>
  );
}