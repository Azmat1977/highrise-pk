// components/property/forms/shared/PaymentSummary.tsx

'use client';

import { useMemo } from 'react';
import { CheckCircle, AlertCircle, Calculator } from 'lucide-react';

interface PaymentSummaryProps {
  totalPrice: string;
  bookingAmount: string;
  downPaymentAmount: string;
  monthlyAmount: string;
  monthlyCount: string;
  quarterlyAmount: string;
  quarterlyCount: string;
  halfYearlyAmount: string;
  halfYearlyCount: string;
  yearlyAmount: string;
  yearlyCount: string;
  possessionAmount: string;
  hasMonthly: boolean;
  hasQuarterly: boolean;
  hasHalfYearly: boolean;
  hasYearly: boolean;
  extraCharges?: {
    cornerCharges?: string;
    developmentCharges?: string;
    otherCharges?: string;
  };
  possessionCharges?: {
    total?: string;
  };
}

export default function PaymentSummary({
  totalPrice,
  bookingAmount,
  downPaymentAmount,
  monthlyAmount,
  monthlyCount,
  quarterlyAmount,
  quarterlyCount,
  halfYearlyAmount,
  halfYearlyCount,
  yearlyAmount,
  yearlyCount,
  possessionAmount,
  hasMonthly,
  hasQuarterly,
  hasHalfYearly,
  hasYearly,
  extraCharges,
  possessionCharges,
}: PaymentSummaryProps) {
  // Parse numbers
  const parseNum = (val: string) => {
    const num = parseFloat(val?.replace(/,/g, '') || '0');
    return isNaN(num) ? 0 : num;
  };

  // Format number with commas
  const formatNum = (num: number) => {
    return num.toLocaleString('en-PK');
  };

  // Calculate totals
  const calculations = useMemo(() => {
    const total = parseNum(totalPrice);
    const booking = parseNum(bookingAmount);
    const downPayment = parseNum(downPaymentAmount);
    const monthly = parseNum(monthlyAmount) * parseNum(monthlyCount);
    const quarterly = parseNum(quarterlyAmount) * parseNum(quarterlyCount);
    const halfYearly = parseNum(halfYearlyAmount) * parseNum(halfYearlyCount);
    const yearly = parseNum(yearlyAmount) * parseNum(yearlyCount);
    const possession = parseNum(possessionAmount);

    const installmentsTotal = 
      (hasMonthly ? monthly : 0) + 
      (hasQuarterly ? quarterly : 0) + 
      (hasHalfYearly ? halfYearly : 0) + 
      (hasYearly ? yearly : 0);

    const calculatedTotal = booking + downPayment + installmentsTotal + possession;
    const difference = total - calculatedTotal;
    const isBalanced = Math.abs(difference) < 1; // Allow 1 rupee tolerance

    // Percentages
    const bookingPercent = total > 0 ? (booking / total) * 100 : 0;
    const downPaymentPercent = total > 0 ? (downPayment / total) * 100 : 0;
    const installmentsPercent = total > 0 ? (installmentsTotal / total) * 100 : 0;
    const possessionPercent = total > 0 ? (possession / total) * 100 : 0;

    // Extra charges
    const corner = parseNum(extraCharges?.cornerCharges || '0');
    const development = parseNum(extraCharges?.developmentCharges || '0');
    const other = parseNum(extraCharges?.otherCharges || '0');
    const possessionCh = parseNum(possessionCharges?.total || '0');
    const totalExtra = corner + development + other + possessionCh;

    const grandTotal = total + totalExtra;

    return {
      total,
      booking,
      bookingPercent,
      downPayment,
      downPaymentPercent,
      monthly,
      quarterly,
      halfYearly,
      yearly,
      installmentsTotal,
      installmentsPercent,
      possession,
      possessionPercent,
      calculatedTotal,
      difference,
      isBalanced,
      totalExtra,
      grandTotal,
    };
  }, [
    totalPrice, bookingAmount, downPaymentAmount,
    monthlyAmount, monthlyCount, quarterlyAmount, quarterlyCount,
    halfYearlyAmount, halfYearlyCount, yearlyAmount, yearlyCount,
    possessionAmount, hasMonthly, hasQuarterly, hasHalfYearly, hasYearly,
    extraCharges, possessionCharges,
  ]);

  if (calculations.total === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-[#029bba]" />
        <h3 className="font-semibold text-gray-800">Payment Breakdown</h3>
      </div>

      {/* Total Price */}
      <div className="flex justify-between items-center py-2 border-b border-gray-300">
        <span className="font-medium text-gray-700">Total Price:</span>
        <span className="font-bold text-lg text-gray-900">
          Rs. {formatNum(calculations.total)}
        </span>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 mt-3">
        {/* Booking */}
        {calculations.booking > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Booking ({calculations.bookingPercent.toFixed(1)}%):
            </span>
            <span className="font-medium text-gray-800">
              Rs. {formatNum(calculations.booking)}
            </span>
          </div>
        )}

        {/* Down Payment */}
        {calculations.downPayment > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Down Payment ({calculations.downPaymentPercent.toFixed(1)}%):
            </span>
            <span className="font-medium text-gray-800">
              Rs. {formatNum(calculations.downPayment)}
            </span>
          </div>
        )}

        {/* Installments */}
        {calculations.installmentsTotal > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Installments ({calculations.installmentsPercent.toFixed(1)}%):
            </span>
            <span className="font-medium text-gray-800">
              Rs. {formatNum(calculations.installmentsTotal)}
            </span>
          </div>
        )}

        {/* Monthly breakdown */}
        {hasMonthly && calculations.monthly > 0 && (
          <div className="flex justify-between items-center text-xs text-gray-500 pl-4">
            <span>└ Monthly ({monthlyCount}x Rs. {formatNum(parseNum(monthlyAmount))}):</span>
            <span>Rs. {formatNum(calculations.monthly)}</span>
          </div>
        )}

        {/* Quarterly breakdown */}
        {hasQuarterly && calculations.quarterly > 0 && (
          <div className="flex justify-between items-center text-xs text-gray-500 pl-4">
            <span>└ Quarterly ({quarterlyCount}x Rs. {formatNum(parseNum(quarterlyAmount))}):</span>
            <span>Rs. {formatNum(calculations.quarterly)}</span>
          </div>
        )}

        {/* Half-Yearly breakdown */}
        {hasHalfYearly && calculations.halfYearly > 0 && (
          <div className="flex justify-between items-center text-xs text-gray-500 pl-4">
            <span>└ Half-Yearly ({halfYearlyCount}x Rs. {formatNum(parseNum(halfYearlyAmount))}):</span>
            <span>Rs. {formatNum(calculations.halfYearly)}</span>
          </div>
        )}

        {/* Yearly breakdown */}
        {hasYearly && calculations.yearly > 0 && (
          <div className="flex justify-between items-center text-xs text-gray-500 pl-4">
            <span>└ Yearly ({yearlyCount}x Rs. {formatNum(parseNum(yearlyAmount))}):</span>
            <span>Rs. {formatNum(calculations.yearly)}</span>
          </div>
        )}

        {/* Possession */}
        {calculations.possession > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Possession ({calculations.possessionPercent.toFixed(1)}%):
            </span>
            <span className="font-medium text-gray-800">
              Rs. {formatNum(calculations.possession)}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-300 my-3"></div>

      {/* Calculated Total */}
      <div className="flex justify-between items-center">
        <span className="font-medium text-gray-700">Calculated Total:</span>
        <span className={`font-bold ${calculations.isBalanced ? 'text-green-600' : 'text-orange-600'}`}>
          Rs. {formatNum(calculations.calculatedTotal)}
        </span>
      </div>

      {/* Balance Status */}
      <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
        calculations.isBalanced 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-orange-50 border border-orange-200'
      }`}>
        {calculations.isBalanced ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700">
              Payment plan is balanced ✓
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <span className="text-sm text-orange-700">
              Difference: Rs. {formatNum(Math.abs(calculations.difference))}
              {calculations.difference > 0 ? ' (Short)' : ' (Extra)'}
            </span>
          </>
        )}
      </div>

      {/* Extra Charges */}
      {calculations.totalExtra > 0 && (
        <>
          <div className="border-t border-gray-300 my-3"></div>
          <div className="text-sm text-gray-600 mb-2">Additional Charges:</div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Extra Charges:</span>
            <span className="font-medium text-gray-800">
              Rs. {formatNum(calculations.totalExtra)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
            <span className="font-bold text-gray-800">Grand Total:</span>
            <span className="font-bold text-lg text-[#029bba]">
              Rs. {formatNum(calculations.grandTotal)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
