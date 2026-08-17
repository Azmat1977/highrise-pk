// components/property/forms/shared/PaymentSummaryCard.tsx

import { useMemo } from 'react';
import { Calculator, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import {
  ListingType,
  InstallmentPlan,
  RentalDetails,
  formatPKR,
  formatPKRNumeric,
} from './usePropertyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtraCharges {
  cornerCharges?: number | '';
  developmentCharges?: number | '';
  electricityConnectionCharges?: number | '';
  gasConnectionCharges?: number | '';
  waterConnectionCharges?: number | '';
  parkingCharges?: number | '';
  floorPremium?: number | '';
  viewPremium?: number | '';
  otherCharges?: number | '';
}

interface PossessionCharges {
  total?: number | '';
}

interface PaymentSummaryCardProps {
  listingType: ListingType;

  // full_payment / pre_launch
  price: number | '';
  tokenAmount?: number | '';

  // installment
  installmentPlan: InstallmentPlan;

  // rent
  rentalDetails: RentalDetails;

  // charges (all types)
  extraCharges: ExtraCharges;
  possessionCharges: PossessionCharges;

  // display mode
  compact?: boolean; // true = sidebar card, false = inline full
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(val: number | '' | undefined): number {
  if (val === '' || val === undefined || val === null) return 0;
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

function sumExtraCharges(extra: ExtraCharges): number {
  return (
    safeNum(extra.cornerCharges) +
    safeNum(extra.developmentCharges) +
    safeNum(extra.electricityConnectionCharges) +
    safeNum(extra.gasConnectionCharges) +
    safeNum(extra.waterConnectionCharges) +
    safeNum(extra.parkingCharges) +
    safeNum(extra.floorPremium) +
    safeNum(extra.viewPremium) +
    safeNum(extra.otherCharges)
  );
}

function pct(part: number, total: number): string {
  if (total <= 0) return '0';
  return ((part / total) * 100).toFixed(1);
}

// ─── Row Component ────────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  value: number;
  percent?: string;
  indent?: boolean;
  bold?: boolean;
  color?: string;
}

function Row({
  label,
  value,
  percent,
  indent = false,
  bold = false,
  color = 'text-gray-800',
}: RowProps): React.ReactElement {
  return (
    <div
      className={`flex justify-between items-center py-1 ${
        indent ? 'pl-4 text-xs text-gray-500' : 'text-sm'
      }`}
    >
      <span className={bold ? 'font-semibold text-gray-700' : 'text-gray-600'}>
        {label}
        {percent && (
          <span className="ml-1 text-xs text-gray-400">({percent}%)</span>
        )}
      </span>
      <span className={`font-medium ${color} ${bold ? 'font-bold text-base' : ''}`}>
        Rs. {formatPKRNumeric(value)}
      </span>
    </div>
  );
}

// ─── Installment Summary ──────────────────────────────────────────────────────

interface InstallmentSummaryProps {
  plan: InstallmentPlan;
  extraTotal: number;
  possessionTotal: number;
}

function InstallmentSummary({
  plan,
  extraTotal,
  possessionTotal,
}: InstallmentSummaryProps): React.ReactElement {
  const total = safeNum(plan.totalPrice);
  const booking = safeNum(plan.bookingAmount);
  const downPayment = safeNum(plan.downPaymentAmount);
  const possession = safeNum(plan.possessionAmount);

  const monthlyTotal = plan.hasMonthly
    ? safeNum(plan.monthlyAmount) * safeNum(plan.monthlyCount)
    : 0;
  const quarterlyTotal = plan.hasQuarterly
    ? safeNum(plan.quarterlyAmount) * safeNum(plan.quarterlyCount)
    : 0;
  const halfYearlyTotal = plan.hasHalfYearly
    ? safeNum(plan.halfYearlyAmount) * safeNum(plan.halfYearlyCount)
    : 0;
  const yearlyTotal = plan.hasYearly
    ? safeNum(plan.yearlyAmount) * safeNum(plan.yearlyCount)
    : 0;

  const installmentsTotal =
    monthlyTotal + quarterlyTotal + halfYearlyTotal + yearlyTotal;

  const calculatedTotal =
    booking + downPayment + installmentsTotal + possession;

  const difference = total - calculatedTotal;
  const isBalanced = Math.abs(difference) < 2;

  const grandTotal = total + extraTotal + possessionTotal;

  if (total === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        Enter total price to see breakdown
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Total */}
      <Row label="Total Price" value={total} bold />

      {/* Divider */}
      <div className="border-t border-gray-100 my-1" />

      {/* Booking */}
      {booking > 0 && (
        <Row
          label="Booking"
          value={booking}
          percent={pct(booking, total)}
        />
      )}

      {/* Down Payment */}
      {downPayment > 0 && (
        <Row
          label="Down Payment"
          value={downPayment}
          percent={pct(downPayment, total)}
        />
      )}

      {/* Installments group */}
      {installmentsTotal > 0 && (
        <>
          <Row
            label="Installments"
            value={installmentsTotal}
            percent={pct(installmentsTotal, total)}
          />
          {plan.hasMonthly && monthlyTotal > 0 && (
            <div className="flex justify-between items-center pl-4 text-xs text-gray-500 py-0.5">
              <span>
                └ Monthly ({plan.monthlyCount}×{' '}
                Rs.{formatPKRNumeric(plan.monthlyAmount)})
              </span>
              <span>Rs. {formatPKRNumeric(monthlyTotal)}</span>
            </div>
          )}
          {plan.hasQuarterly && quarterlyTotal > 0 && (
            <div className="flex justify-between items-center pl-4 text-xs text-gray-500 py-0.5">
              <span>
                └ Quarterly ({plan.quarterlyCount}×{' '}
                Rs.{formatPKRNumeric(plan.quarterlyAmount)})
              </span>
              <span>Rs. {formatPKRNumeric(quarterlyTotal)}</span>
            </div>
          )}
          {plan.hasHalfYearly && halfYearlyTotal > 0 && (
            <div className="flex justify-between items-center pl-4 text-xs text-gray-500 py-0.5">
              <span>
                └ Half-Yearly ({plan.halfYearlyCount}×{' '}
                Rs.{formatPKRNumeric(plan.halfYearlyAmount)})
              </span>
              <span>Rs. {formatPKRNumeric(halfYearlyTotal)}</span>
            </div>
          )}
          {plan.hasYearly && yearlyTotal > 0 && (
            <div className="flex justify-between items-center pl-4 text-xs text-gray-500 py-0.5">
              <span>
                └ Yearly ({plan.yearlyCount}×{' '}
                Rs.{formatPKRNumeric(plan.yearlyAmount)})
              </span>
              <span>Rs. {formatPKRNumeric(yearlyTotal)}</span>
            </div>
          )}
        </>
      )}

      {/* Possession */}
      {possession > 0 && (
        <Row
          label="On Possession"
          value={possession}
          percent={pct(possession, total)}
        />
      )}

      {/* Balance check */}
      <div className="border-t border-gray-100 my-1" />
      <div
        className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
          isBalanced
            ? 'bg-[#f0fdf4] border border-[#10b981]'
            : 'bg-[#fef3c7] border border-[#f59e0b]'
        }`}
      >
        {isBalanced ? (
          <>
            <CheckCircle className="w-4 h-4 text-[#10b981] flex-shrink-0" />
            <span className="text-[#10b981] font-medium">
              Plan is balanced ✓
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
            <span className="text-[#f59e0b] font-medium">
              Difference: Rs.{formatPKRNumeric(Math.abs(difference))}
              {difference > 0 ? ' (Short)' : ' (Extra)'}
            </span>
          </>
        )}
      </div>

      {/* Extra charges */}
      {(extraTotal > 0 || possessionTotal > 0) && (
        <>
          <div className="border-t border-gray-100 my-1" />
          {extraTotal > 0 && (
            <Row label="Extra Charges" value={extraTotal} />
          )}
          {possessionTotal > 0 && (
            <Row label="Possession Charges" value={possessionTotal} />
          )}
          <div className="border-t border-gray-200 my-1" />
          <Row
            label="Grand Total"
            value={grandTotal}
            bold
            color="text-[#029bba]"
          />
        </>
      )}

      {/* Words format */}
      {grandTotal > 0 && (
        <div className="mt-2 text-center text-xs text-gray-400 italic">
          {formatPKR(grandTotal)}
        </div>
      )}
    </div>
  );
}

// ─── Full Payment Summary ─────────────────────────────────────────────────────

interface FullPaymentSummaryProps {
  price: number | '';
  tokenAmount: number | '';
  extraTotal: number;
  possessionTotal: number;
  isPreLaunch?: boolean;
}

function FullPaymentSummary({
  price,
  tokenAmount,
  extraTotal,
  possessionTotal,
  isPreLaunch = false,
}: FullPaymentSummaryProps): React.ReactElement {
  const priceNum = safeNum(price);
  const tokenNum = safeNum(tokenAmount);
  const grandTotal = priceNum + extraTotal + possessionTotal;

  if (priceNum === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        {isPreLaunch
          ? 'Enter expected price to see summary'
          : 'Enter price to see summary'}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Row
        label={isPreLaunch ? 'Expected Price' : 'Sale Price'}
        value={priceNum}
        bold
      />

      {isPreLaunch && tokenNum > 0 && (
        <>
          <div className="border-t border-gray-100 my-1" />
          <Row label="Token Amount" value={tokenNum} />
          <Row
            label="Balance on Launch"
            value={priceNum - tokenNum}
            color="text-[#7c3aed]"
          />
        </>
      )}

      {(extraTotal > 0 || possessionTotal > 0) && (
        <>
          <div className="border-t border-gray-100 my-1" />
          {extraTotal > 0 && (
            <Row label="Extra Charges" value={extraTotal} />
          )}
          {possessionTotal > 0 && (
            <Row label="Possession Charges" value={possessionTotal} />
          )}
          <div className="border-t border-gray-200 my-1" />
          <Row
            label="Total Cost"
            value={grandTotal}
            bold
            color="text-[#029bba]"
          />
        </>
      )}

      <div className="mt-2 text-center text-xs text-gray-400 italic">
        {formatPKR(grandTotal || priceNum)}
      </div>
    </div>
  );
}

// ─── Rent Summary ─────────────────────────────────────────────────────────────

interface RentSummaryProps {
  rental: RentalDetails;
}

function RentSummary({ rental }: RentSummaryProps): React.ReactElement {
  const monthly = safeNum(rental.monthlyRent);
  const deposit = safeNum(rental.securityDepositAmount);
  const advance = safeNum(rental.advanceMonths);
  const advanceTotal = monthly * advance;
  const moveInCost = deposit + advanceTotal;
  const annualCost = monthly * 12;

  if (monthly === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        Enter monthly rent to see summary
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Row label="Monthly Rent" value={monthly} bold />

      <div className="border-t border-gray-100 my-1" />

      {deposit > 0 && <Row label="Security Deposit" value={deposit} />}
      {advance > 0 && (
        <Row
          label={`Advance (${advance} months)`}
          value={advanceTotal}
        />
      )}

      {moveInCost > 0 && (
        <>
          <div className="border-t border-gray-200 my-1" />
          <Row
            label="Move-in Cost"
            value={moveInCost}
            bold
            color="text-[#029bba]"
          />
        </>
      )}

      <div className="border-t border-gray-100 my-1" />
      <Row label="Annual Cost" value={annualCost} color="text-gray-500" />

      <div className="mt-2 text-center text-xs text-gray-400 italic">
        {formatPKR(monthly)} / month
      </div>

      {/* Furnished status badge */}
      {rental.furnishingStatus && (
        <div className="mt-2 flex justify-center">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              rental.furnishingStatus === 'fully-furnished'
                ? 'bg-green-100 text-green-700'
                : rental.furnishingStatus === 'semi-furnished'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {rental.furnishingStatus === 'fully-furnished'
              ? 'Fully Furnished'
              : rental.furnishingStatus === 'semi-furnished'
              ? 'Semi Furnished'
              : 'Unfurnished'}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentSummaryCard({
  listingType,
  price,
  tokenAmount = '',
  installmentPlan,
  rentalDetails,
  extraCharges,
  possessionCharges,
  compact = true,
}: PaymentSummaryCardProps): React.ReactElement {
  const extraTotal = useMemo(
    () => sumExtraCharges(extraCharges),
    [extraCharges]
  );

  const possessionTotal = useMemo(
    () => safeNum(possessionCharges.total),
    [possessionCharges]
  );

  // Header label by listing type
  const headerLabel: Record<ListingType, string> = {
    full_payment: 'Payment Summary',
    installment: 'Payment Breakdown',
    rent: 'Rental Summary',
    pre_launch: 'Pre-Launch Summary',
  };

  const headerIcon: Record<ListingType, React.ReactElement> = {
    full_payment: <Calculator className="w-4 h-4 text-[#029bba]" />,
    installment: <TrendingUp className="w-4 h-4 text-[#7c3aed]" />,
    rent: <Calculator className="w-4 h-4 text-[#0d9488]" />,
    pre_launch: <TrendingUp className="w-4 h-4 text-[#4f46e5]" />,
  };

  const headerAccent: Record<ListingType, string> = {
    full_payment: 'from-[#029bba] to-[#004063]',
    installment: 'from-[#7c3aed] to-[#4f46e5]',
    rent: 'from-[#0d9488] to-[#065f46]',
    pre_launch: 'from-[#4f46e5] to-[#7c3aed]',
  };

  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden
        ${compact ? 'sticky top-[80px]' : ''}
      `}
    >
      {/* Header */}
      <div
        className={`bg-gradient-to-r ${headerAccent[listingType]} px-4 py-3 flex items-center gap-2`}
      >
        {headerIcon[listingType]}
        <h3 className="font-semibold text-white text-sm">
          {headerLabel[listingType]}
        </h3>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {listingType === 'installment' && (
          <InstallmentSummary
            plan={installmentPlan}
            extraTotal={extraTotal}
            possessionTotal={possessionTotal}
          />
        )}

        {(listingType === 'full_payment' || listingType === 'pre_launch') && (
          <FullPaymentSummary
            price={price}
            tokenAmount={tokenAmount}
            extraTotal={extraTotal}
            possessionTotal={possessionTotal}
            isPreLaunch={listingType === 'pre_launch'}
          />
        )}

        {listingType === 'rent' && (
          <RentSummary rental={rentalDetails} />
        )}
      </div>

      {/* Footer trust note */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          ℹ️ Amounts are indicative. Final costs may vary.
        </p>
      </div>
    </div>
  );
}