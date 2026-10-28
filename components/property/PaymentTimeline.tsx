// components/property/PaymentTimeline.tsx

import React from 'react';
import {
  Wallet,
  CreditCard,
  CalendarClock,
  Home,
  CheckCircle2,
  Clock,
  Banknote,
} from 'lucide-react';

interface PaymentStep {
  id: string;
  title: string;
  amount: number;
  percent?: number;
  subtitle?: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: React.ElementType;
  details?: string[];
}

interface PaymentTimelineProps {
  booking?: {
    amount?: number;
    percent?: number;
    status?: string;
  };
  downPayment?: {
    amount?: number;
    percent?: number;
    dueWithin?: string;
    inInstallments?: boolean;
    installmentCount?: number;
  };
  installmentPlan?: {
    hasMonthly?: boolean;
    monthlyAmount?: number;
    monthlyCount?: number;
    hasQuarterly?: boolean;
    quarterlyAmount?: number;
    quarterlyCount?: number;
    hasHalfYearly?: boolean;
    halfYearlyAmount?: number;
    halfYearlyCount?: number;
    hasYearly?: boolean;
    yearlyAmount?: number;
    yearlyCount?: number;
    planDuration?: number;
    planDurationUnit?: string;
  };
  possession?: {
    amount?: number;
    percent?: number;
    dueOn?: string;
    expectedDate?: string;
  };
  totalPrice: number;
  formatPrice: (price: number) => string;
}

const PaymentTimeline: React.FC<PaymentTimelineProps> = ({
  booking,
  downPayment,
  installmentPlan,
  possession,
  totalPrice,
  formatPrice,
}) => {
  // Build payment steps array
  const steps: PaymentStep[] = [];

  // 1. Booking
  if (booking?.amount) {
    steps.push({
      id: 'booking',
      title: 'Booking',
      amount: booking.amount,
      percent: booking.percent,
      subtitle: booking.status ? `Status: ${booking.status.replace(/_/g, ' ')}` : undefined,
      status: 'completed',
      icon: Wallet,
    });
  }

  // 2. Down Payment
  if (downPayment?.amount) {
    const details: string[] = [];
    if (downPayment.dueWithin) {
      details.push(`Due: ${downPayment.dueWithin}`);
    }
    if (downPayment.inInstallments && downPayment.installmentCount) {
      details.push(`Payable in ${downPayment.installmentCount} installments`);
    }

    steps.push({
      id: 'downPayment',
      title: 'Down Payment',
      amount: downPayment.amount,
      percent: downPayment.percent,
      status: 'current',
      icon: CreditCard,
      details: details.length > 0 ? details : undefined,
    });
  }

  // 3. Installments
  if (installmentPlan) {
    const installmentDetails: string[] = [];
    let totalInstallmentAmount = 0;

    if (installmentPlan.hasMonthly && installmentPlan.monthlyAmount && installmentPlan.monthlyCount) {
      const total = installmentPlan.monthlyAmount * installmentPlan.monthlyCount;
      totalInstallmentAmount += total;
      installmentDetails.push(
        `Monthly: ${formatPrice(installmentPlan.monthlyAmount)} × ${installmentPlan.monthlyCount}`
      );
    }

    if (installmentPlan.hasQuarterly && installmentPlan.quarterlyAmount && installmentPlan.quarterlyCount) {
      const total = installmentPlan.quarterlyAmount * installmentPlan.quarterlyCount;
      totalInstallmentAmount += total;
      installmentDetails.push(
        `Quarterly: ${formatPrice(installmentPlan.quarterlyAmount)} × ${installmentPlan.quarterlyCount}`
      );
    }

    if (installmentPlan.hasHalfYearly && installmentPlan.halfYearlyAmount && installmentPlan.halfYearlyCount) {
      const total = installmentPlan.halfYearlyAmount * installmentPlan.halfYearlyCount;
      totalInstallmentAmount += total;
      installmentDetails.push(
        `Half-Yearly: ${formatPrice(installmentPlan.halfYearlyAmount)} × ${installmentPlan.halfYearlyCount}`
      );
    }

    if (installmentPlan.hasYearly && installmentPlan.yearlyAmount && installmentPlan.yearlyCount) {
      const total = installmentPlan.yearlyAmount * installmentPlan.yearlyCount;
      totalInstallmentAmount += total;
      installmentDetails.push(
        `Yearly: ${formatPrice(installmentPlan.yearlyAmount)} × ${installmentPlan.yearlyCount}`
      );
    }

    if (installmentPlan.planDuration) {
      installmentDetails.push(
        `Duration: ${installmentPlan.planDuration} ${installmentPlan.planDurationUnit || 'years'}`
      );
    }

    if (totalInstallmentAmount > 0 || installmentDetails.length > 0) {
      const percent = totalPrice > 0 ? Math.round((totalInstallmentAmount / totalPrice) * 100) : undefined;
      
      steps.push({
        id: 'installments',
        title: 'Installments',
        amount: totalInstallmentAmount,
        percent: percent,
        status: 'upcoming',
        icon: CalendarClock,
        details: installmentDetails.length > 0 ? installmentDetails : undefined,
      });
    }
  }

  // 4. Possession
  if (possession?.amount) {
    const details: string[] = [];
    if (possession.dueOn) {
      details.push(`Due: ${possession.dueOn.replace(/_/g, ' ')}`);
    }
    if (possession.expectedDate) {
      const date = new Date(possession.expectedDate);
      details.push(`Expected: ${date.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}`);
    }

    steps.push({
      id: 'possession',
      title: 'On Possession',
      amount: possession.amount,
      percent: possession.percent,
      status: 'upcoming',
      icon: Home,
      details: details.length > 0 ? details : undefined,
    });
  }

  // If no steps, don't render anything
  if (steps.length === 0) {
    return null;
  }

  // Calculate total from steps
  const totalFromSteps = steps.reduce((sum, step) => sum + step.amount, 0);

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-[#029bba]" />
          Payment Timeline
        </h3>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-[#029bba]">
            PKR {formatPrice(totalPrice || totalFromSteps)}
          </p>
        </div>
      </div>

      {/* Desktop Timeline (Horizontal) */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-[#029bba] via-purple-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';

              return (
                <div key={step.id} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
                  {/* Icon Circle */}
                  <div
                    className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-[#029bba] to-[#027a94] text-white'
                        : isCurrent
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white ring-4 ring-purple-200'
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : isCurrent ? (
                      <Clock className="w-7 h-7 animate-pulse" />
                    ) : (
                      <IconComponent className="w-7 h-7" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="mt-4 text-center">
                    <p className={`font-semibold text-sm ${
                      isCompleted ? 'text-[#029bba]' : isCurrent ? 'text-purple-600' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-lg font-bold text-gray-800 mt-1">
                      PKR {formatPrice(step.amount)}
                    </p>
                    {step.percent && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isCompleted
                          ? 'bg-[#029bba]/10 text-[#029bba]'
                          : isCurrent
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {step.percent}%
                      </span>
                    )}
                    {step.details && step.details.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {step.details.slice(0, 2).map((detail, idx) => (
                          <p key={idx} className="text-xs text-gray-500">
                            {detail}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Timeline (Vertical) */}
      <div className="md:hidden">
        <div className="relative">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="relative flex gap-4">
                {/* Left side - Icon and Line */}
                <div className="flex flex-col items-center">
                  {/* Icon Circle */}
                  <div
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-[#029bba] to-[#027a94] text-white'
                        : isCurrent
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white ring-4 ring-purple-200'
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isCurrent ? (
                      <Clock className="w-5 h-5 animate-pulse" />
                    ) : (
                      <IconComponent className="w-5 h-5" />
                    )}
                  </div>

                  {/* Connecting Line */}
                  {!isLast && (
                    <div className={`w-0.5 flex-1 min-h-[60px] ${
                      isCompleted ? 'bg-[#029bba]' : 'bg-gray-200'
                    }`} />
                  )}
                </div>

                {/* Right side - Content */}
                <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                  <div className={`p-4 rounded-xl ${
                    isCompleted
                      ? 'bg-[#029bba]/5 border border-[#029bba]/20'
                      : isCurrent
                      ? 'bg-purple-50 border border-purple-200'
                      : 'bg-white border border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`font-semibold ${
                          isCompleted ? 'text-[#029bba]' : isCurrent ? 'text-purple-600' : 'text-gray-600'
                        }`}>
                          {step.title}
                        </p>
                        {step.subtitle && (
                          <p className="text-xs text-gray-500 mt-0.5">{step.subtitle}</p>
                        )}
                      </div>
                      {step.percent && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isCompleted
                            ? 'bg-[#029bba]/10 text-[#029bba]'
                            : isCurrent
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {step.percent}%
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xl font-bold text-gray-800 mt-2">
                      PKR {formatPrice(step.amount)}
                    </p>

                    {step.details && step.details.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                        {step.details.map((detail, idx) => (
                          <p key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-gray-400" />
                            {detail}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="mt-6 pt-4 border-t border-blue-200">
        <div className="flex flex-wrap gap-4 justify-center">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-sm">
              <span
                className={`w-3 h-3 rounded-full ${
                  step.status === 'completed'
                    ? 'bg-[#029bba]'
                    : step.status === 'current'
                    ? 'bg-purple-500'
                    : 'bg-gray-300'
                }`}
              />
              <span className="text-gray-600">{step.title}</span>
              <span className="font-semibold text-gray-800">
                {step.percent ? `${step.percent}%` : formatPrice(step.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentTimeline;
