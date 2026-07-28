// components/projects/PaymentPlanCard.tsx
import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  BadgeCheck,
  Percent,
  Banknote,
  CreditCard,
  Building2,
  Info,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Tag,
  TrendingDown,
} from 'lucide-react';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

export type PlanType =
  | 'standard'
  | 'easy_installment'
  | 'flexi'
  | 'down_payment'
  | 'full_payment'
  | 'custom';

export type ApplicableTo =
  | 'all_units'
  | 'residential'
  | 'commercial'
  | 'specific_types';

export interface InstallmentBreakdown {
  label:       string;
  amount:      number;
  percentage?: number;
  dueDate?:    string;
  dueAfter?:   string;
  frequency?:  string;
  count?:      number;
  notes?:      string;
}

export interface PaymentPlanData {
  _id?:                  string;
  name:                  string;
  description?:          string;
  planType:              PlanType;
  applicableTo?:         ApplicableTo;
  unitTypes?:            string[];
  totalPrice?:           number;
  currency?:             string;
  bookingAmount?:        number;
  bookingPercent?:       number;
  downPayment?:          number;
  downPaymentPercent?:   number;
  downPaymentDueIn?:     string;
  installments?:         InstallmentBreakdown[];
  possessionAmount?:     number;
  possessionPercent?:    number;
  planDuration?:         number;
  planDurationUnit?:     string;
  earlyPaymentDiscount?: number;
  fullPaymentDiscount?:  number;
  bulkBookingDiscount?:  number;
  validFrom?:            string;
  validUntil?:           string;
  isActive?:             boolean;
  isDefault?:            boolean;
  isFeatured?:           boolean;
  termsAndConditions?:   string;
  disclaimers?:          string;
}

export type PaymentPlanCardVariant = 'full' | 'compact' | 'comparison';

interface PaymentPlanCardProps {
  plan:        PaymentPlanData;
  variant?:    PaymentPlanCardVariant;
  onInquire?:  (planName: string) => void;
  className?:  string;
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatPKR(amount: number): string {
  if (!amount || amount <= 0) return 'N/A';
  if (amount >= 10_000_000) {
    const crore = amount / 10_000_000;
    return `PKR ${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }
  if (amount >= 100_000) {
    const lac = amount / 100_000;
    return `${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(1)} Lac`;
  }
  return `PKR ${amount.toLocaleString()}`;
}

function formatAmount(amount: number): string {
  if (!amount || amount <= 0) return '—';
  if (amount >= 10_000_000) {
    return `${(amount / 10_000_000).toFixed(2)} Cr`;
  }
  if (amount >= 100_000) {
    return `${(amount / 100_000).toFixed(1)} Lac`;
  }
  return amount.toLocaleString();
}

function getPlanTypeConfig(planType: PlanType): {
  label:    string;
  icon:     React.ReactElement;
  bg:       string;
  text:     string;
  border:   string;
} {
  const configs: Record<PlanType, {
    label:  string;
    icon:   React.ReactElement;
    bg:     string;
    text:   string;
    border: string;
  }> = {
    standard: {
      label:  'Standard Plan',
      icon:   <CreditCard className="w-4 h-4" />,
      bg:     'bg-blue-50',
      text:   'text-blue-700',
      border: 'border-blue-200',
    },
    easy_installment: {
      label:  'Easy Installment',
      icon:   <Calendar className="w-4 h-4" />,
      bg:     'bg-emerald-50',
      text:   'text-emerald-700',
      border: 'border-emerald-200',
    },
    flexi: {
      label:  'Flexi Plan',
      icon:   <TrendingDown className="w-4 h-4" />,
      bg:     'bg-purple-50',
      text:   'text-purple-700',
      border: 'border-purple-200',
    },
    down_payment: {
      label:  'Down Payment Plan',
      icon:   <Banknote className="w-4 h-4" />,
      bg:     'bg-amber-50',
      text:   'text-amber-700',
      border: 'border-amber-200',
    },
    full_payment: {
      label:  'Full Payment',
      icon:   <DollarSign className="w-4 h-4" />,
      bg:     'bg-green-50',
      text:   'text-green-700',
      border: 'border-green-200',
    },
    custom: {
      label:  'Custom Plan',
      icon:   <Building2 className="w-4 h-4" />,
      bg:     'bg-gray-50',
      text:   'text-gray-700',
      border: 'border-gray-200',
    },
  };

  return configs[planType] ?? configs.custom;
}

function getFrequencyLabel(frequency?: string): string {
  const labels: Record<string, string> = {
    one_time:      'One-Time',
    monthly:       'Monthly',
    quarterly:     'Quarterly',
    half_yearly:   'Half-Yearly',
    yearly:        'Yearly',
    on_possession: 'On Possession',
  };
  return frequency ? labels[frequency] ?? frequency : '';
}

function getApplicableLabel(applicableTo?: ApplicableTo): string {
  const labels: Record<ApplicableTo, string> = {
    all_units:       'All Units',
    residential:     'Residential Only',
    commercial:      'Commercial Only',
    specific_types:  'Specific Unit Types',
  };
  return applicableTo ? labels[applicableTo] ?? 'All Units' : 'All Units';
}

function hasDiscounts(plan: PaymentPlanData): boolean {
  return (
    (plan.earlyPaymentDiscount ?? 0) > 0 ||
    (plan.fullPaymentDiscount ?? 0) > 0 ||
    (plan.bulkBookingDiscount ?? 0) > 0
  );
}

// ════════════════════════════════════════════════════
// INSTALLMENT BREAKDOWN TABLE
// ════════════════════════════════════════════════════

function BreakdownTable({
  installments,
}: {
  installments: InstallmentBreakdown[];
}): React.ReactElement {
  return (
    <div className="mt-4 rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
              Payment
            </th>
            <th className="text-right px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
              Amount
            </th>
            <th className="text-right px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
              Frequency
            </th>
            <th className="text-right px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
              Duration
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {installments.map((inst, idx) => (
            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-3 py-2.5">
                <p className="font-semibold text-gray-700">{inst.label}</p>
                {inst.notes && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{inst.notes}</p>
                )}
                {inst.dueDate && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Due: {inst.dueDate}
                  </p>
                )}
                {inst.dueAfter && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Due after: {inst.dueAfter}
                  </p>
                )}
              </td>
              <td className="px-3 py-2.5 text-right">
                <p className="font-bold text-gray-900">{formatAmount(inst.amount)}</p>
                {inst.percentage !== undefined && inst.percentage > 0 && (
                  <p className="text-[10px] text-gray-400">{inst.percentage}%</p>
                )}
              </td>
              <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                <span className="text-gray-500 text-xs">
                  {getFrequencyLabel(inst.frequency)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                {inst.count && inst.count > 0 ? (
                  <span className="text-gray-500 text-xs">
                    {inst.count}x
                  </span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════
// DISCOUNT SECTION
// ════════════════════════════════════════════════════

function DiscountSection({
  plan,
}: {
  plan: PaymentPlanData;
}): React.ReactElement | null {
  if (!hasDiscounts(plan)) return null;

  return (
    <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-100">
      <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Percent className="w-3.5 h-3.5" />
        Available Discounts
      </p>
      <div className="space-y-1.5">
        {(plan.earlyPaymentDiscount ?? 0) > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-600">Early Payment Discount</span>
            <span className="text-xs font-bold text-green-700">
              {plan.earlyPaymentDiscount}% OFF
            </span>
          </div>
        )}
        {(plan.fullPaymentDiscount ?? 0) > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-600">Full Payment Discount</span>
            <span className="text-xs font-bold text-green-700">
              {plan.fullPaymentDiscount}% OFF
            </span>
          </div>
        )}
        {(plan.bulkBookingDiscount ?? 0) > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-600">Bulk Booking Discount</span>
            <span className="text-xs font-bold text-green-700">
              {plan.bulkBookingDiscount}% OFF
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// COMPACT VARIANT
// ════════════════════════════════════════════════════

function CompactPlanCard({
  plan,
  onInquire,
  className,
}: {
  plan:       PaymentPlanData;
  onInquire?: (planName: string) => void;
  className?: string;
}): React.ReactElement {
  const typeConfig = getPlanTypeConfig(plan.planType);

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4
                     hover:shadow-md hover:border-[#029bba]/20 transition-all duration-200
                     ${plan.isDefault ? 'ring-2 ring-[#029bba]/20' : ''}
                     ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${typeConfig.bg} ${typeConfig.text}`}>
            {typeConfig.icon}
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">{plan.name}</h4>
            <span className="text-[10px] text-gray-400">{typeConfig.label}</span>
          </div>
        </div>

        {plan.isDefault && (
          <span className="px-2 py-0.5 rounded-full bg-[#029bba] text-white
                           text-[10px] font-bold flex items-center gap-0.5">
            <Star className="w-3 h-3" /> Default
          </span>
        )}
      </div>

      {/* Key amounts */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {(plan.bookingAmount ?? 0) > 0 && (
          <div className="p-2 rounded-lg bg-gray-50">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Booking</p>
            <p className="text-sm font-bold text-gray-900">
              {formatAmount(plan.bookingAmount!)}
            </p>
          </div>
        )}
        {(plan.downPayment ?? 0) > 0 && (
          <div className="p-2 rounded-lg bg-gray-50">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Down Payment</p>
            <p className="text-sm font-bold text-gray-900">
              {formatAmount(plan.downPayment!)}
            </p>
          </div>
        )}
      </div>

      {/* Duration */}
      {plan.planDuration && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <Clock className="w-3 h-3" />
          {plan.planDuration} {plan.planDurationUnit ?? 'months'}
        </div>
      )}

      {/* CTA */}
      {onInquire && (
        <button
          onClick={() => onInquire(plan.name)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                     bg-gradient-to-r from-[#029bba] to-[#027a94]
                     text-white text-sm font-semibold
                     hover:from-[#02a8c9] hover:to-[#028aaa]
                     hover:shadow-lg transition-all duration-200"
        >
          Inquire About This Plan
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// FULL VARIANT (DEFAULT)
// ════════════════════════════════════════════════════

export default function PaymentPlanCard({
  plan,
  variant    = 'full',
  onInquire,
  className  = '',
}: PaymentPlanCardProps): React.ReactElement {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showTerms, setShowTerms]         = useState(false);

  const typeConfig = getPlanTypeConfig(plan.planType);

  // ── Compact variant ──
  if (variant === 'compact') {
    return <CompactPlanCard plan={plan} onInquire={onInquire} className={className} />;
  }

  // ── Comparison variant ──
  if (variant === 'comparison') {
    return <CompactPlanCard plan={plan} onInquire={onInquire} className={className} />;
  }

  // ── Full variant ──
  return (
    <div
      className={`
        bg-white rounded-2xl border shadow-sm overflow-hidden
        ${plan.isDefault
          ? 'border-[#029bba]/30 ring-2 ring-[#029bba]/10'
          : 'border-gray-100'
        }
        ${plan.isFeatured ? 'relative' : ''}
        ${className}
      `}
    >
      {/* Featured ribbon */}
      {plan.isFeatured && (
        <div className="absolute top-4 -right-8 z-10 rotate-45
                        bg-gradient-to-r from-[#029bba] to-[#004063]
                        text-white text-[9px] font-bold uppercase tracking-wider
                        px-10 py-1 shadow-md">
          Best Value
        </div>
      )}

      {/* ── Header ── */}
      <div className={`px-5 py-4 border-b ${typeConfig.border} ${typeConfig.bg}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${typeConfig.bg} ${typeConfig.text}
                             border ${typeConfig.border}`}>
              {typeConfig.icon}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold ${typeConfig.text}`}>
                  {typeConfig.label}
                </span>
                {plan.applicableTo && plan.applicableTo !== 'all_units' && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Tag className="w-3 h-3" />
                    {getApplicableLabel(plan.applicableTo)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {plan.isDefault && (
              <span className="px-2.5 py-1 rounded-full bg-[#029bba] text-white
                               text-[10px] font-bold flex items-center gap-1">
                <Star className="w-3 h-3" /> Recommended
              </span>
            )}
          </div>
        </div>

        {plan.description && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{plan.description}</p>
        )}
      </div>

      {/* ── Key figures ── */}
      <div className="px-5 py-4">
        {/* Total price */}
        {(plan.totalPrice ?? 0) > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
              Total Price
            </p>
            <p className="text-2xl font-black text-[#029bba]">
              {formatPKR(plan.totalPrice!)}
            </p>
          </div>
        )}

        {/* Payment breakdown grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {/* Booking */}
          {(plan.bookingAmount ?? 0) > 0 && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                  Booking
                </span>
              </div>
              <p className="text-lg font-black text-blue-700">
                {formatAmount(plan.bookingAmount!)}
              </p>
              {(plan.bookingPercent ?? 0) > 0 && (
                <p className="text-[10px] text-blue-400 mt-0.5">
                  {plan.bookingPercent}% of total
                </p>
              )}
            </div>
          )}

          {/* Down payment */}
          {(plan.downPayment ?? 0) > 0 && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">
                  Down Payment
                </span>
              </div>
              <p className="text-lg font-black text-purple-700">
                {formatAmount(plan.downPayment!)}
              </p>
              {(plan.downPaymentPercent ?? 0) > 0 && (
                <p className="text-[10px] text-purple-400 mt-0.5">
                  {plan.downPaymentPercent}% of total
                </p>
              )}
              {plan.downPaymentDueIn && (
                <p className="text-[10px] text-purple-400 mt-0.5">
                  Due in {plan.downPaymentDueIn}
                </p>
              )}
            </div>
          )}

          {/* Possession */}
          {(plan.possessionAmount ?? 0) > 0 && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">
                  On Possession
                </span>
              </div>
              <p className="text-lg font-black text-green-700">
                {formatAmount(plan.possessionAmount!)}
              </p>
              {(plan.possessionPercent ?? 0) > 0 && (
                <p className="text-[10px] text-green-400 mt-0.5">
                  {plan.possessionPercent}% of total
                </p>
              )}
            </div>
          )}
        </div>

        {/* Duration + Validity */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {plan.planDuration && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                             bg-gray-100 text-gray-600 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {plan.planDuration} {plan.planDurationUnit ?? 'months'} plan
            </span>
          )}
          {plan.validUntil && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                             bg-amber-50 text-amber-600 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              Valid until {new Date(plan.validUntil).toLocaleDateString('en-PK', {
                day:   'numeric',
                month: 'short',
                year:  'numeric',
              })}
            </span>
          )}
          {plan.unitTypes && plan.unitTypes.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                             bg-gray-100 text-gray-600 text-xs font-semibold">
              <Tag className="w-3.5 h-3.5" />
              {plan.unitTypes.slice(0, 3).join(', ')}
              {plan.unitTypes.length > 3 && ` +${plan.unitTypes.length - 3} more`}
            </span>
          )}
        </div>

        {/* Discounts */}
        <DiscountSection plan={plan} />

        {/* Installment breakdown toggle */}
        {plan.installments && plan.installments.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center justify-between w-full px-3 py-2.5
                         rounded-xl bg-gray-50 hover:bg-gray-100
                         transition-colors text-sm font-semibold text-gray-700"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#029bba]" />
                Payment Breakdown ({plan.installments.length} items)
              </span>
              {showBreakdown
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </button>

            {showBreakdown && (
              <BreakdownTable installments={plan.installments} />
            )}
          </div>
        )}

        {/* Terms toggle */}
        {plan.termsAndConditions && (
          <div className="mt-3">
            <button
              onClick={() => setShowTerms(!showTerms)}
              className="flex items-center gap-2 text-xs text-gray-400
                         hover:text-gray-600 transition-colors font-medium"
            >
              <Info className="w-3.5 h-3.5" />
              {showTerms ? 'Hide' : 'View'} Terms & Conditions
              {showTerms
                ? <ChevronUp className="w-3 h-3" />
                : <ChevronDown className="w-3 h-3" />
              }
            </button>

            {showTerms && (
              <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">
                  {plan.termsAndConditions}
                </p>
                {plan.disclaimers && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {plan.disclaimers}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CTA ── */}
      {onInquire && (
        <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100">
          <button
            onClick={() => onInquire(plan.name)}
            className={`
              w-full flex items-center justify-center gap-2 py-3 rounded-xl
              font-semibold text-sm transition-all duration-200
              ${plan.isDefault || plan.isFeatured
                ? 'bg-gradient-to-r from-[#029bba] to-[#027a94] text-white hover:from-[#02a8c9] hover:to-[#028aaa] hover:shadow-lg'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }
            `}
          >
            <DollarSign className="w-4 h-4" />
            Inquire About This Plan
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// PAYMENT PLAN LIST COMPONENT
// ════════════════════════════════════════════════════

interface PaymentPlanListProps {
  plans:       PaymentPlanData[];
  onInquire?:  (planName: string) => void;
  className?:  string;
}

export function PaymentPlanList({
  plans,
  onInquire,
  className = '',
}: PaymentPlanListProps): React.ReactElement {
  if (!plans || plans.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400 font-medium">
          No payment plans available yet
        </p>
        <p className="text-xs text-gray-300 mt-1">
          Payment plan information will be updated soon
        </p>
      </div>
    );
  }

  // Sort: default first, then featured, then by order
  const sorted = [...plans].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return 0;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {sorted.map((plan, idx) => (
        <PaymentPlanCard
          key={plan._id ?? idx}
          plan={plan}
          variant={plans.length === 1 ? 'full' : 'full'}
          onInquire={onInquire}
        />
      ))}
    </div>
  );
}