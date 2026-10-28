// components/property/forms/tabs/TabPricing.tsx

import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Home, Rocket, Calculator,
  Users, Lock, Sparkles, RefreshCw,
} from 'lucide-react';
import FormSection from '../shared/FormSection';
import {
  PropertyFormState,
  ListingType,
  LISTING_TYPE_LABELS,
  LISTING_TYPE_COLORS,
  InstallmentPlan,
  RentalDetails,
  TabErrors,
  UsePropertyFormReturn,
  FieldConfig,
  formatPKR,
  formatPKRNumeric,
} from '../shared/usePropertyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabPricingProps {
  form:                PropertyFormState;
  errors:              TabErrors;
  setField:            UsePropertyFormReturn['setField'];
  setInstallmentField: UsePropertyFormReturn['setInstallmentField'];
  setRentalField:      UsePropertyFormReturn['setRentalField'];
  setListingType:      UsePropertyFormReturn['setListingType'];
  fieldConfig:         FieldConfig;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(val: number | '' | undefined): number {
  if (val === '' || val === undefined || val === null) return 0;
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

function pct(part: number, total: number): string {
  if (total <= 0) return '0.0';
  return ((part / total) * 100).toFixed(1);
}

// ─── Reusable: Error Label ────────────────────────────────────────────────────

function FieldError({ error }: { error?: string }): React.ReactElement | null {
  if (!error) return null;
  return (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
      <span>⚠</span>
      <span>{error}</span>
    </p>
  );
}

// ─── Reusable: Price Input ────────────────────────────────────────────────────

interface PriceInputProps {
  id:           string;
  label:        string;
  value:        number | '';
  onChange:     (val: number | '') => void;
  error?:       string;
  required?:    boolean;
  placeholder?: string;
  hint?:        string;
  showWords?:   boolean;
}

function PriceInput({
  id, label, value, onChange,
  error, required = false,
  placeholder = 'e.g. 10000000',
  hint, showWords = true,
}: PriceInputProps): React.ReactElement {
  const numVal = safeNum(value);
  return (
    <div>
      <label htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2
          text-gray-400 text-sm font-medium pointer-events-none">
          Rs.
        </span>
        <input
          id={id} type="number" min="0" step="1"
          placeholder={placeholder}
          value={value === '' ? '' : value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') { onChange(''); return; }
            const n = parseFloat(raw);
            if (!isNaN(n) && n >= 0) onChange(n);
          }}
          className={`w-full border rounded-lg pl-10 pr-4 py-2.5
            focus:ring-2 focus:ring-[#029bba] focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
      </div>
      {showWords && numVal > 0 && (
        <p className="mt-1 text-xs text-[#029bba] font-medium">
          {formatPKR(numVal)}
        </p>
      )}
      {numVal > 0 && (
        <p className="text-xs text-gray-400">
          Rs. {formatPKRNumeric(numVal)}
        </p>
      )}
      <FieldError error={error} />
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}

// ─── Reusable: Toggle Switch ──────────────────────────────────────────────────

interface ToggleProps {
  label:        string;
  checked:      boolean;
  onChange:     (val: boolean) => void;
  description?: string;
}

function Toggle({ label, checked, onChange, description }: ToggleProps): React.ReactElement {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-700
          group-hover:text-[#029bba] transition-colors duration-150">
          {label}
        </span>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        <div
          role="switch" aria-checked={checked} tabIndex={0}
          onClick={() => onChange(!checked)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault(); onChange(!checked);
            }
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-200 cursor-pointer
            ${checked ? 'bg-[#029bba]' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm
            transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </div>
      </div>
    </label>
  );
}

// ─── Listing Type Icons ───────────────────────────────────────────────────────

const LISTING_TYPE_ICONS: Record<ListingType, React.ReactElement> = {
  full_payment: <DollarSign  className="w-5 h-5" />,
  installment:  <TrendingUp  className="w-5 h-5" />,
  rent:         <Home        className="w-5 h-5" />,
  pre_launch:   <Rocket      className="w-5 h-5" />,
};

// ─── Furnishing Options ───────────────────────────────────────────────────────

const FURNISHING_OPTIONS: { value: RentalDetails['furnishingStatus']; label: string }[] = [
  { value: 'unfurnished',     label: 'Unfurnished'     },
  { value: 'semi-furnished',  label: 'Semi Furnished'  },
  { value: 'fully-furnished', label: 'Fully Furnished' },
];

// ─── Tenant Type Options ──────────────────────────────────────────────────────

const TENANT_TYPE_OPTIONS: {
  value: RentalDetails['preferredTenantType']; label: string; icon: string;
}[] = [
  { value: 'any',     label: 'Anyone',  icon: '👥' },
  { value: 'family',  label: 'Family',  icon: '👨‍👩‍👧' },
  { value: 'bachelor',label: 'Bachelor',icon: '🧑' },
  { value: 'couple',  label: 'Couple',  icon: '💑' },
  { value: 'company', label: 'Company / Corporate', icon: '🏢' },
];

// ─── Agreement Type Options ───────────────────────────────────────────────────

const AGREEMENT_TYPE_OPTIONS: { value: RentalDetails['agreementType']; label: string }[] = [
  { value: 'standard',  label: 'Standard Lease'   },
  { value: 'notarized', label: 'Notarized Deed'   },
  { value: 'verbal',    label: 'Verbal Agreement' },
];

// ═══════════════════════════════════════════════════════════════
// FULL PAYMENT SECTION
// ═══════════════════════════════════════════════════════════════

interface FullPaymentFieldsProps {
  form:     PropertyFormState;
  errors:   TabErrors;
  setField: UsePropertyFormReturn['setField'];
}

function FullPaymentFields({
  form, errors, setField,
}: FullPaymentFieldsProps): React.ReactElement {
  return (
    <FormSection
      id="pricing-full-payment"
      title="Sale Price"
      icon={<DollarSign className="w-5 h-5" />}
      defaultOpen={true}
      required
      completionStatus={
        form.price !== '' && safeNum(form.price) > 0
          ? 'complete' : 'incomplete'
      }
    >
      <div className="space-y-4">
        <PriceInput
          id="price-full"
          label="Asking Price"
          value={form.price}
          onChange={(val) => setField('price', val)}
          error={errors.price}
          required
          placeholder="e.g. 15000000"
        />

        <PriceInput
          id="price-per-unit"
          label="Price Per Unit (sq ft / Marla)"
          value={form.pricePerUnit}
          onChange={(val) => setField('pricePerUnit', val)}
          placeholder="Auto-calculated or enter manually"
          hint="Helps buyers compare — will auto-calculate if left empty"
          showWords={false}
        />

        <Toggle
          label="Price is Negotiable"
          checked={form.isNegotiable}
          onChange={(val) => setField('isNegotiable', val)}
          description="Allow buyers to make offers below asking price"
        />
      </div>
    </FormSection>
  );
}

// ═══════════════════════════════════════════════════════════════
// INSTALLMENT PLAN SECTION
// ═══════════════════════════════════════════════════════════════

interface InstallmentFieldsProps {
  form:                PropertyFormState;
  errors:              TabErrors;
  setInstallmentField: UsePropertyFormReturn['setInstallmentField'];
}

// ─── Frequency keys ───────────────────────────────────────────────────────────

type FreqKey = 'monthly' | 'quarterly' | 'halfYearly' | 'yearly';

const FREQ_CONFIG: Record<FreqKey, {
  label: string;
  description: string;
  divisor: number;
  unit: string;
  flagKey: 'hasMonthly' | 'hasQuarterly' | 'hasHalfYearly' | 'hasYearly';
  amountKey: 'monthlyAmount' | 'quarterlyAmount' | 'halfYearlyAmount' | 'yearlyAmount';
  countKey: 'monthlyCount' | 'quarterlyCount' | 'halfYearlyCount' | 'yearlyCount';
}> = {
  monthly: {
    label: 'Monthly',
    description: 'Every month',
    divisor: 1,
    unit: 'month',
    flagKey: 'hasMonthly',
    amountKey: 'monthlyAmount',
    countKey: 'monthlyCount',
  },
  quarterly: {
    label: 'Quarterly',
    description: 'Every 3 months',
    divisor: 3,
    unit: 'quarter',
    flagKey: 'hasQuarterly',
    amountKey: 'quarterlyAmount',
    countKey: 'quarterlyCount',
  },
  halfYearly: {
    label: 'Half-Yearly',
    description: 'Every 6 months',
    divisor: 6,
    unit: 'half-year',
    flagKey: 'hasHalfYearly',
    amountKey: 'halfYearlyAmount',
    countKey: 'halfYearlyCount',
  },
  yearly: {
    label: 'Yearly',
    description: 'Once per year (bonus payment)',
    divisor: 12,
    unit: 'year',
    flagKey: 'hasYearly',
    amountKey: 'yearlyAmount',
    countKey: 'yearlyCount',
  },
};

// ─── Quick Preset Plans (Pakistani market) ───────────────────────────────────

interface PresetPlan {
  label:        string;
  description:  string;
  booking:      number;
  downPayment:  number;
  possession:   number;
  duration:     number;
  frequencies:  Partial<Record<FreqKey, number>>;
}

const PRESET_PLANS: PresetPlan[] = [
  {
    label:        'DHA Standard',
    description:  '10% + 10% + 36 monthly + 10% possession',
    booking:      10,
    downPayment:  10,
    possession:   10,
    duration:     36,
    frequencies:  { monthly: 100 },
  },
  {
    label:        'Bahria Easy 3-Year',
    description:  '15% booking + 15% DP + monthly & yearly mix',
    booking:      15,
    downPayment:  15,
    possession:   10,
    duration:     36,
    frequencies:  { monthly: 70, yearly: 30 },
  },
  {
    label:        '5-Year Long Plan',
    description:  '10% + 10% + 60 monthly + 10% possession',
    booking:      10,
    downPayment:  10,
    possession:   10,
    duration:     60,
    frequencies:  { monthly: 100 },
  },
  {
    label:        'Quick 2-Year',
    description:  '20% + 20% + 24 monthly + 10% possession',
    booking:      20,
    downPayment:  20,
    possession:   10,
    duration:     24,
    frequencies:  { monthly: 100 },
  },
];

interface InstallmentFieldsProps {
  form:                PropertyFormState;
  errors:              TabErrors;
  setInstallmentField: UsePropertyFormReturn['setInstallmentField'];
}

function InstallmentFields({
  form, errors, setInstallmentField,
}: InstallmentFieldsProps): React.ReactElement {

  const plan  = form.installmentPlan;
  const total = safeNum(plan.totalPrice);

  // ─── Live computed amounts from percentages ────────────────────
  const bookingAmt = total > 0 ? Math.round((total * safeNum(plan.bookingPercent)) / 100) : 0;
  const dpAmt      = total > 0 ? Math.round((total * safeNum(plan.downPaymentPercent)) / 100) : 0;
  const possAmt    = total > 0 ? Math.round((total * safeNum(plan.possessionPercent)) / 100) : 0;
  const remaining  = Math.max(0, total - bookingAmt - dpAmt - possAmt);

  const usedPercent = safeNum(plan.bookingPercent) +
                      safeNum(plan.downPaymentPercent) +
                      safeNum(plan.possessionPercent);
  const remainingPercent = Math.max(0, 100 - usedPercent);
  const isMilestoneOverflow = usedPercent > 100;

  // Sync derived amounts to form state
  useEffect(() => {
    if (plan.bookingAmount !== bookingAmt)
      setInstallmentField('bookingAmount', bookingAmt);
    if (plan.downPaymentAmount !== dpAmt)
      setInstallmentField('downPaymentAmount', dpAmt);
    if (plan.possessionAmount !== possAmt)
      setInstallmentField('possessionAmount', possAmt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, plan.bookingPercent, plan.downPaymentPercent, plan.possessionPercent]);

  // ─── Frequency counts (auto from duration) ─────────────────────
  const dur = safeNum(plan.durationMonths);
  const counts: Record<FreqKey, number> = {
    monthly:    dur,
    quarterly:  Math.floor(dur / 3),
    halfYearly: Math.floor(dur / 6),
    yearly:     Math.floor(dur / 12),
  };

  const enabled: Record<FreqKey, boolean> = {
    monthly:    plan.hasMonthly,
    quarterly:  plan.hasQuarterly,
    halfYearly: plan.hasHalfYearly,
    yearly:     plan.hasYearly,
  };

  // ─── Allocation % per frequency (local state) ─────────────────
  const [alloc, setAlloc] = useState<Record<FreqKey, number>>(() => {
    if (remaining <= 0) return { monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0 };
    const calc = (amt: number, cnt: number) =>
      Math.round(((amt * cnt) / remaining) * 100);
    return {
      monthly:    calc(safeNum(plan.monthlyAmount),    safeNum(plan.monthlyCount)),
      quarterly:  calc(safeNum(plan.quarterlyAmount),  safeNum(plan.quarterlyCount)),
      halfYearly: calc(safeNum(plan.halfYearlyAmount), safeNum(plan.halfYearlyCount)),
      yearly:     calc(safeNum(plan.yearlyAmount),     safeNum(plan.yearlyCount)),
    };
  });

  // Sum of enabled allocations
  const enabledKeys = (Object.keys(enabled) as FreqKey[]).filter((k) => enabled[k]);
  const totalAllocPercent = enabledKeys.reduce((sum, k) => sum + alloc[k], 0);
  const allocIsBalanced = enabledKeys.length === 0 || Math.abs(totalAllocPercent - 100) < 0.5;

  // ─── Recompute installment amounts when alloc/remaining/duration changes ──
  useEffect(() => {
    (Object.keys(FREQ_CONFIG) as FreqKey[]).forEach((k) => {
      const cfg = FREQ_CONFIG[k];
      if (enabled[k]) {
        const portionTotal = (remaining * alloc[k]) / 100;
        const count = counts[k];
        const amount = count > 0 ? Math.round(portionTotal / count) : 0;
        setInstallmentField(cfg.amountKey, amount);
        setInstallmentField(cfg.countKey, count);
      } else {
        setInstallmentField(cfg.amountKey, 0);
        setInstallmentField(cfg.countKey, 0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alloc.monthly, alloc.quarterly, alloc.halfYearly, alloc.yearly,
      remaining, dur,
      enabled.monthly, enabled.quarterly, enabled.halfYearly, enabled.yearly]);

  // ─── Handlers ──────────────────────────────────────────────────

  // Auto-redistribute allocations when toggling a frequency
  const handleFreqToggle = (freq: FreqKey, val: boolean) => {
    setInstallmentField(FREQ_CONFIG[freq].flagKey, val);
    const futureEnabled = { ...enabled, [freq]: val };
    const futureKeys = (Object.keys(futureEnabled) as FreqKey[]).filter((k) => futureEnabled[k]);

    if (futureKeys.length === 0) {
      setAlloc({ monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0 });
      return;
    }

    const equalShare = Math.floor(100 / futureKeys.length);
    const newAlloc: Record<FreqKey, number> = {
      monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0,
    };
    futureKeys.forEach((k, i) => {
      newAlloc[k] = i === futureKeys.length - 1
        ? 100 - equalShare * (futureKeys.length - 1)
        : equalShare;
    });
    setAlloc(newAlloc);
  };

  const handleAllocChange = (freq: FreqKey, newPercent: number) => {
    const clamped = Math.max(0, Math.min(100, newPercent));
    setAlloc((prev) => ({ ...prev, [freq]: clamped }));
  };

  // Apply preset plan
  const applyPreset = (preset: PresetPlan) => {
    setInstallmentField('bookingPercent', preset.booking);
    setInstallmentField('downPaymentPercent', preset.downPayment);
    setInstallmentField('possessionPercent', preset.possession);
    setInstallmentField('durationMonths', preset.duration);

    // Toggle frequencies
    (Object.keys(FREQ_CONFIG) as FreqKey[]).forEach((k) => {
      const shouldEnable = preset.frequencies[k] !== undefined;
      setInstallmentField(FREQ_CONFIG[k].flagKey, shouldEnable);
    });

    // Set allocations
    const newAlloc: Record<FreqKey, number> = {
      monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0,
    };
    (Object.keys(preset.frequencies) as FreqKey[]).forEach((k) => {
      newAlloc[k] = preset.frequencies[k] ?? 0;
    });
    setAlloc(newAlloc);
  };

  // Balance calculation
  const installmentsTotal = enabledKeys.reduce((sum, k) => {
    const cfg = FREQ_CONFIG[k];
    return sum + safeNum(plan[cfg.amountKey]) * safeNum(plan[cfg.countKey]);
  }, 0);

  const grandTotal = bookingAmt + dpAmt + installmentsTotal + possAmt;
  const balanceDiff = total - grandTotal;
  const isBalanced = total > 0 && Math.abs(balanceDiff) < 100;

  return (
    <>
      {/* ─── Total Price ──────────────────────────────────────────── */}
      <FormSection
        id="pricing-installment-total"
        title="Total Property Price"
        icon={<DollarSign className="w-5 h-5" />}
        defaultOpen={true}
        required
        badge="Installment"
        badgeColor="purple"
        completionStatus={total > 0 ? 'complete' : 'incomplete'}
      >
        <div className="space-y-4">
          <PriceInput
            id="inst-total"
            label="Total Price"
            value={plan.totalPrice}
            onChange={(val) => setInstallmentField('totalPrice', val === '' ? 0 : val)}
            error={errors['installmentPlan.totalPrice']}
            required
            placeholder="e.g. 10000000"
            hint="Enter the total property price — all other amounts auto-calculate from percentages below"
          />

          {/* Quick Preset Plans */}
          {total > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                <p className="text-sm font-medium text-gray-700">
                  Quick Preset Plans
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_PLANS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="text-left p-3 rounded-xl border-2 border-gray-200
                      hover:border-[#7c3aed] hover:bg-[#7c3aed] hover:bg-opacity-5
                      transition-all duration-150 group"
                  >
                    <p className="text-sm font-semibold text-[#004063]
                      group-hover:text-[#7c3aed]">
                      {preset.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 Click a preset to auto-fill, then adjust as needed
              </p>
            </div>
          )}
        </div>
      </FormSection>

      {/* ─── Payment Breakdown (%) ────────────────────────────────── */}
      <FormSection
        id="pricing-installment-breakdown"
        title="Payment Breakdown"
        icon={<Calculator className="w-5 h-5" />}
        defaultOpen={true}
        required
        badge={`${usedPercent.toFixed(1)}% allocated`}
        badgeColor="purple"
        completionStatus={
          safeNum(plan.bookingPercent) > 0 ? 'complete' : 'incomplete'
        }
      >
        <div className="space-y-4">
          {/* Three percentage inputs in a grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Booking */}
            <div className="bg-[#029bba] bg-opacity-5 border border-[#029bba]
              border-opacity-30 rounded-xl p-3">
              <label htmlFor="inst-booking-pct"
                className="block text-xs font-semibold text-[#029bba] mb-1.5">
                BOOKING %
              </label>
              <div className="relative">
                <input
                  id="inst-booking-pct"
                  type="number" min="0" max="100" step="0.5"
                  placeholder="e.g. 10"
                  value={plan.bookingPercent || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setInstallmentField('bookingPercent', 0); return; }
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n >= 0 && n <= 100)
                      setInstallmentField('bookingPercent', n);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7
                    text-lg font-bold text-[#029bba]
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2
                  text-sm font-bold text-[#029bba]">%</span>
              </div>
              {bookingAmt > 0 && (
                <p className="text-xs font-medium text-[#004063] mt-2">
                  Rs. {formatPKRNumeric(bookingAmt)}
                </p>
              )}
              {bookingAmt > 0 && (
                <p className="text-xs text-gray-500">
                  {formatPKR(bookingAmt)}
                </p>
              )}
            </div>

            {/* Down Payment */}
            <div className="bg-[#004063] bg-opacity-5 border border-[#004063]
              border-opacity-30 rounded-xl p-3">
              <label htmlFor="inst-dp-pct"
                className="block text-xs font-semibold text-[#004063] mb-1.5">
                DOWN PAYMENT %
              </label>
              <div className="relative">
                <input
                  id="inst-dp-pct"
                  type="number" min="0" max="100" step="0.5"
                  placeholder="e.g. 20"
                  value={plan.downPaymentPercent || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setInstallmentField('downPaymentPercent', 0); return; }
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n >= 0 && n <= 100)
                      setInstallmentField('downPaymentPercent', n);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7
                    text-lg font-bold text-[#004063]
                    focus:ring-2 focus:ring-[#004063] focus:border-transparent"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2
                  text-sm font-bold text-[#004063]">%</span>
              </div>
              {dpAmt > 0 && (
                <p className="text-xs font-medium text-[#004063] mt-2">
                  Rs. {formatPKRNumeric(dpAmt)}
                </p>
              )}
              {dpAmt > 0 && (
                <p className="text-xs text-gray-500">
                  {formatPKR(dpAmt)}
                </p>
              )}
            </div>

            {/* Possession */}
            <div className="bg-[#0d9488] bg-opacity-5 border border-[#0d9488]
              border-opacity-30 rounded-xl p-3">
              <label htmlFor="inst-poss-pct"
                className="block text-xs font-semibold text-[#0d9488] mb-1.5">
                ON POSSESSION %
              </label>
              <div className="relative">
                <input
                  id="inst-poss-pct"
                  type="number" min="0" max="100" step="0.5"
                  placeholder="e.g. 10"
                  value={plan.possessionPercent || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setInstallmentField('possessionPercent', 0); return; }
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n >= 0 && n <= 100)
                      setInstallmentField('possessionPercent', n);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7
                    text-lg font-bold text-[#0d9488]
                    focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2
                  text-sm font-bold text-[#0d9488]">%</span>
              </div>
              {possAmt > 0 && (
                <p className="text-xs font-medium text-[#004063] mt-2">
                  Rs. {formatPKRNumeric(possAmt)}
                </p>
              )}
              {possAmt > 0 && (
                <p className="text-xs text-gray-500">
                  {formatPKR(possAmt)}
                </p>
              )}
            </div>
          </div>

          {/* Remaining for installments banner */}
          {total > 0 && (
            <div className={`rounded-xl p-4 border-2 ${
              isMilestoneOverflow
                ? 'bg-[#fef2f2] border-[#ef4444]'
                : 'bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] border-transparent text-white'
            }`}>
              {isMilestoneOverflow ? (
                <>
                  <p className="text-sm font-bold text-[#ef4444]">
                    ⚠ Milestones exceed 100%
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Booking + DP + Possession = {usedPercent.toFixed(1)}% — please reduce
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80 uppercase tracking-wider">
                      Remaining for Installments
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      Rs. {formatPKRNumeric(remaining)}
                    </p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {formatPKR(remaining)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-80 uppercase tracking-wider">
                      % of Total
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {remainingPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </FormSection>

      {/* ─── Duration ───────────────────────────────────────────── */}
      <FormSection
        id="pricing-installment-duration"
        title="Plan Duration"
        icon={<span className="text-lg">📅</span>}
        defaultOpen={true}
        required
        badge="Months"
        badgeColor="purple"
        completionStatus={dur > 0 ? 'complete' : 'incomplete'}
      >
        <div className="space-y-4">
          {/* Quick presets */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Quick Select
            </p>
            <div className="flex flex-wrap gap-2">
              {[12, 24, 36, 48, 60, 84, 120].map((months) => {
                const isActive = dur === months;
                return (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setInstallmentField('durationMonths', months)}
                    className={`px-4 py-2 rounded-full text-sm font-medium
                      transition-all duration-150
                      ${isActive
                        ? 'bg-[#7c3aed] text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {months / 12 >= 1 ? `${months / 12}y` : `${months}m`}
                    <span className="text-xs ml-1 opacity-70">
                      ({months}m)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom input */}
          <div>
            <label htmlFor="inst-duration"
              className="block text-sm font-medium text-gray-700 mb-1.5">
              Custom Duration (months) <span className="text-red-500">*</span>
            </label>
            <input
              id="inst-duration" type="number" min="1" max="360"
              placeholder="e.g. 36"
              value={plan.durationMonths || ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') { setInstallmentField('durationMonths', 0); return; }
                const n = parseInt(raw, 10);
                if (!isNaN(n) && n >= 0 && n <= 360)
                  setInstallmentField('durationMonths', n);
              }}
              className={`w-full border rounded-lg px-4 py-2.5
                focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent
                ${errors['installmentPlan.durationMonths']
                  ? 'border-red-500' : 'border-gray-300'}`}
            />
            <FieldError error={errors['installmentPlan.durationMonths']} />
            {dur > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                = {Math.floor(dur / 12)} year{Math.floor(dur / 12) !== 1 ? 's' : ''}
                {dur % 12 > 0 ? ` ${dur % 12} month${dur % 12 !== 1 ? 's' : ''}` : ''}
              </p>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label htmlFor="inst-start"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Date
              </label>
              <input
                id="inst-start" type="date"
                value={plan.startDate}
                onChange={(e) => setInstallmentField('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="inst-end"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                End Date
              </label>
              <input
                id="inst-end" type="date"
                value={plan.endDate}
                onChange={(e) => setInstallmentField('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </FormSection>

      {/* ─── Installment Frequency (Auto-Calculator) ────────────── */}
      <FormSection
        id="pricing-installment-frequency"
        title="Installment Frequency"
        icon={<RefreshCw className="w-5 h-5" />}
        defaultOpen={true}
        required
        badge={enabledKeys.length === 0 ? 'Select at least one' :
               `${enabledKeys.length} frequency${enabledKeys.length > 1 ? 'ies' : ''}`}
        badgeColor="purple"
        completionStatus={
          enabledKeys.length > 0 && allocIsBalanced ? 'complete' : 'incomplete'
        }
      >
        <div className="space-y-4">
          {total === 0 || dur === 0 ? (
            <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b]
              px-4 py-3 rounded-r-lg">
              <p className="text-sm text-amber-800 font-medium">
                ⚠ Enter Total Price and Duration first
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Installment amounts will auto-calculate once those are set
              </p>
            </div>
          ) : remaining <= 0 ? (
            <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b]
              px-4 py-3 rounded-r-lg">
              <p className="text-sm text-amber-800 font-medium">
                ⚠ No amount remaining for installments
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Booking + DP + Possession = 100%. Reduce one to add installments.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Toggle one or more payment frequencies. Amounts auto-calculate
                from your allocation.
              </p>

              {/* Frequency cards */}
              {(Object.keys(FREQ_CONFIG) as FreqKey[]).map((freq) => {
                const cfg          = FREQ_CONFIG[freq];
                const isEnabled    = enabled[freq];
                const count        = counts[freq];
                const allocPercent = alloc[freq];
                const portionTotal = (remaining * allocPercent) / 100;
                const amountPerInst = count > 0 ? Math.round(portionTotal / count) : 0;

                return (
                  <div
                    key={freq}
                    className={`border-2 rounded-xl p-4 transition-all duration-150
                      ${isEnabled
                        ? 'border-[#7c3aed] bg-[#7c3aed] bg-opacity-5'
                        : 'border-gray-200 bg-white'}`}
                  >
                    <Toggle
                      label={cfg.label}
                      checked={isEnabled}
                      onChange={(val) => handleFreqToggle(freq, val)}
                      description={cfg.description}
                    />

                    {isEnabled && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        {count === 0 ? (
                          <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b]
                            px-3 py-2 rounded-r-lg">
                            <p className="text-xs text-amber-800">
                              ⚠ Duration too short — need at least {cfg.divisor} months
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Allocation slider/input */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                  Allocation: {allocPercent.toFixed(0)}% of installments
                                </label>
                                <span className="text-xs text-[#7c3aed] font-semibold">
                                  Rs. {formatPKRNumeric(portionTotal)}
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0" max="100" step="5"
                                value={allocPercent}
                                onChange={(e) =>
                                  handleAllocChange(freq, parseFloat(e.target.value))
                                }
                                className="w-full h-2 bg-gray-200 rounded-full appearance-none
                                  cursor-pointer accent-[#7c3aed]"
                              />
                              <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>0%</span>
                                <span>25%</span>
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                              </div>
                            </div>

                            {/* Manual % input */}
                            <div className="grid grid-cols-3 gap-3 items-end">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Allocation %
                                </label>
                                <div className="relative">
                                  <input
                                    type="number" min="0" max="100" step="1"
                                    value={Math.round(allocPercent)}
                                    onChange={(e) => {
                                      const n = parseFloat(e.target.value);
                                      if (!isNaN(n)) handleAllocChange(freq, n);
                                    }}
                                    className="w-full border border-gray-300 rounded-lg
                                      px-3 py-2 pr-7 text-sm font-semibold
                                      focus:ring-2 focus:ring-[#7c3aed]
                                      focus:border-transparent"
                                  />
                                  <span className="absolute right-2.5 top-1/2
                                    -translate-y-1/2 text-xs text-gray-400">%</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Count
                                </label>
                                <div className="w-full bg-gray-50 rounded-lg px-3 py-2
                                  border border-gray-200 text-sm font-semibold text-center">
                                  {count} {cfg.unit}{count !== 1 ? 's' : ''}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Per Installment
                                </label>
                                <div className="w-full bg-[#7c3aed] bg-opacity-10
                                  rounded-lg px-3 py-2 border border-[#7c3aed]
                                  border-opacity-30 text-sm font-bold text-[#7c3aed]
                                  text-center">
                                  Rs. {formatPKRNumeric(amountPerInst)}
                                </div>
                              </div>
                            </div>

                            <div className="text-xs text-gray-500 text-center pt-1">
                              <strong>{count}</strong> × Rs. {formatPKRNumeric(amountPerInst)} ={' '}
                              <strong className="text-[#7c3aed]">
                                Rs. {formatPKRNumeric(amountPerInst * count)}
                              </strong>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Allocation balance check */}
              {enabledKeys.length > 1 && (
                <div className={`p-3 rounded-lg border-2 ${
                  allocIsBalanced
                    ? 'bg-[#f0fdf4] border-[#10b981]'
                    : 'bg-[#fef3c7] border-[#f59e0b]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${
                      allocIsBalanced ? 'text-[#10b981]' : 'text-[#f59e0b]'
                    }`}>
                      {allocIsBalanced
                        ? '✓ Allocations balanced'
                        : `⚠ Allocations sum to ${totalAllocPercent.toFixed(0)}% (should be 100%)`}
                    </span>
                    <span className="text-xs text-gray-600">
                      Total: {totalAllocPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Frequency mix tip */}
              {enabledKeys.length === 1 && enabledKeys[0] === 'monthly' && (
                <div className="bg-[#eff6ff] border-l-4 border-[#029bba]
                  px-4 py-3 rounded-r-lg">
                  <p className="text-xs text-[#004063]">
                    💡 <strong>Pro tip:</strong> Many Pakistani developers offer
                    <strong> Monthly + Yearly bonus</strong> payments. Enable Yearly
                    frequency to split (e.g. 70% monthly + 30% yearly bonus).
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </FormSection>

      {/* ─── Plan Branding (collapsible — optional) ────────────── */}
      <FormSection
        id="pricing-installment-branding"
        title="Plan Details (Optional)"
        icon={<span className="text-lg">🏷️</span>}
        defaultOpen={false}
        description="Developer name, plan name — leave empty if reselling"
        completionStatus="optional"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inst-plan-name"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Plan Name
              </label>
              <input
                id="inst-plan-name" type="text"
                placeholder="e.g. 3 Year Easy Plan"
                value={plan.planName}
                onChange={(e) => setInstallmentField('planName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="inst-dev-name"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Developer Name
              </label>
              <input
                id="inst-dev-name" type="text"
                placeholder="e.g. Bahria Town / Leave empty if reselling"
                value={plan.developerName}
                onChange={(e) => setInstallmentField('developerName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2
            border-t border-gray-100 pt-3">
            <Toggle
              label="Price Negotiable"
              checked={plan.isNegotiable}
              onChange={(val) => setInstallmentField('isNegotiable', val)}
            />
            <Toggle
              label="Bank Financing Available"
              checked={plan.bankFinancingAvailable}
              onChange={(val) => setInstallmentField('bankFinancingAvailable', val)}
            />
          </div>
        </div>
      </FormSection>

      {/* ─── Penalties & Policies ────────────────────────────── */}
      <FormSection
        id="pricing-installment-policies"
        title="Penalties & Policies"
        icon={<Lock className="w-5 h-5" />}
        defaultOpen={false}
        badge="Optional"
        badgeColor="purple"
        completionStatus="optional"
      >
        <div className="space-y-4">
          <PriceInput
            id="inst-confirmation"
            label="Refundable Confirmation Deposit"
            value={plan.confirmationDeposit}
            onChange={(val) => setInstallmentField('confirmationDeposit', val === '' ? 0 : val)}
            hint="Refundable deposit at booking — returned at possession"
            placeholder="e.g. 100000"
          />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="inst-late-penalty"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Late Payment Penalty
              </label>
              <div className="relative">
                <input
                  id="inst-late-penalty"
                  type="number" min="0" max="50" step="0.1"
                  placeholder="e.g. 2"
                  value={plan.latePaymentPenalty || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setInstallmentField('latePaymentPenalty', 0); return; }
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n >= 0 && n <= 50)
                      setInstallmentField('latePaymentPenalty', n);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-8
                    focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2
                  text-sm text-gray-400 font-medium">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">% per month late</p>
            </div>

            <div>
              <label htmlFor="inst-discount"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Payment Discount
              </label>
              <div className="relative">
                <input
                  id="inst-discount"
                  type="number" min="0" max="50" step="0.1"
                  placeholder="e.g. 5"
                  value={plan.discountOnFullPayment || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setInstallmentField('discountOnFullPayment', 0); return; }
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n >= 0 && n <= 50)
                      setInstallmentField('discountOnFullPayment', n);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-8
                    focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2
                  text-sm text-gray-400 font-medium">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">If paid upfront</p>
            </div>

            <div>
              <label htmlFor="inst-transfer-pct"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Transfer Charges
              </label>
              <div className="relative">
                <input
                  id="inst-transfer-pct"
                  type="number" min="0" max="20" step="0.1"
                  placeholder="e.g. 2"
                  value={plan.transferChargePercent || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setInstallmentField('transferChargePercent', 0); return; }
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n >= 0 && n <= 20)
                      setInstallmentField('transferChargePercent', n);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-8
                    focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2
                  text-sm text-gray-400 font-medium">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">On file transfer</p>
            </div>
          </div>

          <div>
            <label htmlFor="inst-cancel"
              className="block text-sm font-medium text-gray-700 mb-1.5">
              Cancellation Policy
            </label>
            <textarea
              id="inst-cancel"
              placeholder="e.g. Booking amount non-refundable. Down payment refundable minus 10% deduction. Cancellation request must be in writing..."
              value={plan.cancellationPolicy}
              onChange={(e) => setInstallmentField('cancellationPolicy', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 resize-y
                focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Clearly state refund / cancellation rules for the buyer
            </p>
          </div>
        </div>
      </FormSection>

      {/* ─── Final Balance Summary ────────────────────────────── */}
      {total > 0 && (
        <div className={`rounded-xl p-4 border-2 ${
          isBalanced
            ? 'bg-[#f0fdf4] border-[#10b981]'
            : 'bg-[#fef3c7] border-[#f59e0b]'
        }`}>
          <div className="flex items-start gap-3">
            <span className={`text-2xl ${isBalanced ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
              {isBalanced ? '✓' : '⚠'}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-bold ${
                isBalanced ? 'text-[#10b981]' : 'text-[#f59e0b]'
              }`}>
                {isBalanced
                  ? 'Payment plan is balanced'
                  : `Off by Rs. ${formatPKRNumeric(Math.abs(balanceDiff))} ${balanceDiff > 0 ? '(short)' : '(over)'}`}
              </p>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Booking</span>
                  <p className="font-semibold text-[#029bba]">
                    Rs. {formatPKRNumeric(bookingAmt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Down Payment</span>
                  <p className="font-semibold text-[#004063]">
                    Rs. {formatPKRNumeric(dpAmt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Installments</span>
                  <p className="font-semibold text-[#7c3aed]">
                    Rs. {formatPKRNumeric(installmentsTotal)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Possession</span>
                  <p className="font-semibold text-[#0d9488]">
                    Rs. {formatPKRNumeric(possAmt)}
                  </p>
                </div>
              </div>

              {/* Visual breakdown bar */}
              <div className="mt-3 h-3 rounded-full overflow-hidden flex bg-gray-200">
                {bookingAmt > 0 && (
                  <div className="bg-[#029bba] h-full"
                    style={{ width: `${(bookingAmt / total) * 100}%` }}
                    title={`Booking: ${pct(bookingAmt, total)}%`}
                  />
                )}
                {dpAmt > 0 && (
                  <div className="bg-[#004063] h-full"
                    style={{ width: `${(dpAmt / total) * 100}%` }}
                    title={`Down Payment: ${pct(dpAmt, total)}%`}
                  />
                )}
                {installmentsTotal > 0 && (
                  <div className="bg-[#7c3aed] h-full"
                    style={{ width: `${(installmentsTotal / total) * 100}%` }}
                    title={`Installments: ${pct(installmentsTotal, total)}%`}
                  />
                )}
                {possAmt > 0 && (
                  <div className="bg-[#0d9488] h-full"
                    style={{ width: `${(possAmt / total) * 100}%` }}
                    title={`Possession: ${pct(possAmt, total)}%`}
                  />
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-300 border-opacity-50">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600">
                    Total Plan Value
                  </span>
                  <span className="font-bold text-[#004063]">
                    Rs. {formatPKRNumeric(grandTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-500">Expected</span>
                  <span className="text-gray-500">
                    Rs. {formatPKRNumeric(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// RENT SECTION (Enterprise Grade)
// ═══════════════════════════════════════════════════════════════

interface RentFieldsProps {
  form:           PropertyFormState;
  errors:         TabErrors;
  setRentalField: UsePropertyFormReturn['setRentalField'];
  fieldConfig:    FieldConfig;
}

function RentFields({
  form, errors, setRentalField, fieldConfig: cfg,
}: RentFieldsProps): React.ReactElement {
  const rental = form.rentalDetails;

  // Auto-calc security deposit + advance amounts
  const monthlyRent       = safeNum(rental.monthlyRent);
  const autoSecurity      = monthlyRent * safeNum(rental.securityDepositMonths);
  const autoAdvance       = monthlyRent * safeNum(rental.advanceMonths);
  const totalMoveInCost   =
    (rental.securityDepositAmount > 0 ? rental.securityDepositAmount : autoSecurity) +
    (autoAdvance) +
    monthlyRent;

  return (
    <>
      {/* ── Core Rent ── */}
      <FormSection
        id="pricing-rent-core"
        title="Monthly Rent"
        icon={<Home className="w-5 h-5" />}
        defaultOpen={true}
        required
        badge="Rent"
        badgeColor="green"
        completionStatus={monthlyRent > 0 ? 'complete' : 'incomplete'}
      >
        <div className="space-y-4">
          {/* Monthly Rent */}
          <PriceInput
            id="rent-monthly"
            label="Monthly Rent"
            value={rental.monthlyRent}
            onChange={(val) => setRentalField('monthlyRent', val === '' ? 0 : val)}
            error={errors['rentalDetails.monthlyRent']}
            required
            placeholder="e.g. 50000"
          />

          {/* Weekly rent (room/short-term) */}
          {cfg.showWeeklyRent && (
            <PriceInput
              id="rent-weekly"
              label="Weekly Rent"
              value={rental.weeklyRent}
              onChange={(val) => setRentalField('weeklyRent', val === '' ? 0 : val)}
              hint="Optional — for short-term / weekly stays"
              placeholder="e.g. 15000"
            />
          )}

          <Toggle
            label="Rent is Negotiable"
            checked={rental.isNegotiable}
            onChange={(val) => setRentalField('isNegotiable', val)}
            description="Allow tenants to negotiate the rent"
          />
        </div>
      </FormSection>

      {/* ── Security Deposit & Advance ── */}
      <FormSection
        id="pricing-rent-deposit"
        title="Security Deposit & Advance"
        icon={<Lock className="w-5 h-5" />}
        defaultOpen={true}
        required
        badge="Upfront Cost"
        badgeColor="green"
        completionStatus={
          safeNum(rental.securityDepositMonths) > 0 ||
          safeNum(rental.securityDepositAmount) > 0
            ? 'complete' : 'optional'
        }
      >
        <div className="space-y-4">
          {/* Security Deposit */}
          <div className="bg-[#0d9488] bg-opacity-5 border border-[#0d9488]
            border-opacity-20 rounded-xl p-4">
            <p className="text-sm font-semibold text-[#0d9488] mb-3">
              🔒 Security Deposit (Refundable)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Months */}
              <div>
                <label htmlFor="rent-security-months"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Number of Months
                </label>
                <input
                  id="rent-security-months"
                  type="number" min="0" max="24" step="1"
                  placeholder="e.g. 2"
                  value={rental.securityDepositMonths || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = raw === '' ? 0 : parseInt(raw, 10);
                    if (!isNaN(n) && n >= 0 && n <= 24) {
                      setRentalField('securityDepositMonths', n);
                      // Auto-update amount
                      if (monthlyRent > 0) {
                        setRentalField('securityDepositAmount', n * monthlyRent);
                      }
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pakistani standard: 1-2 months rent
                </p>
              </div>

              {/* Or amount */}
              <div>
                <label htmlFor="rent-security-amount"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Total Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2
                    text-gray-400 text-sm font-medium pointer-events-none">
                    Rs.
                  </span>
                  <input
                    id="rent-security-amount"
                    type="number" min="0"
                    placeholder={autoSecurity > 0 ? formatPKRNumeric(autoSecurity) : 'e.g. 100000'}
                    value={rental.securityDepositAmount || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const n = raw === '' ? 0 : parseFloat(raw);
                      if (!isNaN(n) && n >= 0)
                        setRentalField('securityDepositAmount', n);
                    }}
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5
                      focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                  />
                </div>
                {autoSecurity > 0 && rental.securityDepositAmount === 0 && (
                  <p className="text-xs text-[#0d9488] mt-1">
                    Auto: Rs. {formatPKRNumeric(autoSecurity)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Advance Rent */}
          <div className="bg-[#7c3aed] bg-opacity-5 border border-[#7c3aed]
            border-opacity-20 rounded-xl p-4">
            <p className="text-sm font-semibold text-[#7c3aed] mb-3">
              💰 Advance Rent (Upfront)
            </p>
            <div>
              <label htmlFor="rent-advance"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Number of Months Paid in Advance
              </label>
              <input
                id="rent-advance"
                type="number" min="0" max="24"
                placeholder="e.g. 1"
                value={rental.advanceMonths || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = raw === '' ? 0 : parseInt(raw, 10);
                  if (!isNaN(n) && n >= 0 && n <= 24) {
                    setRentalField('advanceMonths', n);
                    setRentalField('advanceAmount', n * monthlyRent);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
              />
              {autoAdvance > 0 && (
                <p className="text-xs text-[#7c3aed] mt-1 font-medium">
                  Advance amount: Rs. {formatPKRNumeric(autoAdvance)}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Common: 1 month advance paid at move-in
              </p>
            </div>
          </div>

          {/* Move-in Cost Summary */}
          {monthlyRent > 0 && (
            <div className="bg-gradient-to-r from-[#0d9488] to-[#065f46]
              rounded-xl p-4 text-white">
              <h4 className="text-sm font-bold mb-3 opacity-90">
                💵 Total Move-in Cost Estimate
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-80">Security Deposit</span>
                  <span className="font-medium">
                    Rs. {formatPKRNumeric(
                      rental.securityDepositAmount > 0
                        ? rental.securityDepositAmount : autoSecurity
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">
                    Advance ({rental.advanceMonths || 0} months)
                  </span>
                  <span className="font-medium">
                    Rs. {formatPKRNumeric(autoAdvance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">First Month Rent</span>
                  <span className="font-medium">
                    Rs. {formatPKRNumeric(monthlyRent)}
                  </span>
                </div>
                <div className="border-t border-white border-opacity-30 pt-2 mt-2">
                  <div className="flex justify-between text-base">
                    <span className="font-bold">Total Upfront</span>
                    <span className="font-bold">
                      Rs. {formatPKRNumeric(totalMoveInCost)}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    {formatPKR(totalMoveInCost)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* ── Lease Terms ── */}
      <FormSection
        id="pricing-rent-lease"
        title="Lease Terms"
        icon={<span className="text-lg">📜</span>}
        defaultOpen={false}
        completionStatus={
          safeNum(rental.minimumLeasePeriod) > 0 ? 'complete' : 'optional'
        }
      >
        <div className="space-y-4">
          {/* Lease Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rent-min-lease"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Minimum Lease (months)
              </label>
              <input
                id="rent-min-lease" type="number" min="1" max="120"
                placeholder="e.g. 12"
                value={rental.minimumLeasePeriod || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = raw === '' ? 0 : parseInt(raw, 10);
                  if (!isNaN(n) && n >= 0) setRentalField('minimumLeasePeriod', n);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Common: 11-12 months in Pakistan
              </p>
            </div>
            <div>
              <label htmlFor="rent-max-lease"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Maximum Lease (months)
              </label>
              <input
                id="rent-max-lease" type="number" min="1" max="120"
                placeholder="e.g. 36"
                value={rental.maximumLeasePeriod || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = raw === '' ? 0 : parseInt(raw, 10);
                  if (!isNaN(n) && n >= 0) setRentalField('maximumLeasePeriod', n);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
          </div>

          <Toggle
            label="Lease Period is Flexible"
            checked={rental.leaseFlexible}
            onChange={(val) => setRentalField('leaseFlexible', val)}
            description="Open to negotiating shorter or longer terms"
          />

          {/* Available From */}
          <div>
            <label htmlFor="rent-available"
              className="block text-sm font-medium text-gray-700 mb-1.5">
              Available From
            </label>
            <input
              id="rent-available" type="date"
              value={rental.availableFrom}
              onChange={(e) => setRentalField('availableFrom', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1
            border-t border-gray-100 pt-3">
            <Toggle
              label="Immediate Availability"
              checked={rental.immediateAvailable}
              onChange={(val) => setRentalField('immediateAvailable', val)}
              description="Ready to move in immediately"
            />
            <Toggle
              label="Short-Term Allowed"
              checked={rental.shortTermAllowed}
              onChange={(val) => setRentalField('shortTermAllowed', val)}
              description="Less than 6 month stays accepted"
            />
          </div>

          {/* Agreement Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agreement Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {AGREEMENT_TYPE_OPTIONS.map((opt) => {
                const isActive = rental.agreementType === opt.value;
                return (
                  <button
                    key={opt.value ?? 'standard'}
                    type="button"
                    onClick={() => setRentalField('agreementType', opt.value)}
                    className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium
                      transition-all duration-150 text-center
                      ${isActive
                        ? 'border-[#0d9488] bg-[#0d9488] bg-opacity-5 text-[#0d9488]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FormSection>

      {/* ── Furnishing & Inclusions ── */}
      {cfg.showFurnishingStatus && (
        <FormSection
          id="pricing-rent-furnishing"
          title="Furnishing & Inclusions"
          icon={<span className="text-lg">🛋️</span>}
          defaultOpen={false}
          completionStatus="optional"
        >
          <div className="space-y-4">
            {/* Furnishing Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Furnishing Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {FURNISHING_OPTIONS.map((opt) => {
                  const isActive = rental.furnishingStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRentalField('furnishingStatus', opt.value)}
                      className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium
                        transition-all duration-150 text-center
                        ${isActive
                          ? 'border-[#0d9488] bg-[#0d9488] bg-opacity-5 text-[#0d9488]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Maintenance */}
            <div className="border-t border-gray-100 pt-3">
              <Toggle
                label="Maintenance Included"
                checked={rental.maintenanceIncluded}
                onChange={(val) => setRentalField('maintenanceIncluded', val)}
                description="Monthly maintenance charges included in rent"
              />
              {!rental.maintenanceIncluded && (
                <div className="mt-3">
                  <PriceInput
                    id="rent-maintenance"
                    label="Separate Maintenance Charges (per month)"
                    value={rental.maintenanceAmount}
                    onChange={(val) =>
                      setRentalField('maintenanceAmount', val === '' ? 0 : val)
                    }
                    placeholder="e.g. 5000"
                    hint="Building / society maintenance fee"
                    showWords={false}
                  />
                </div>
              )}
            </div>

            {/* Utilities Inclusions */}
            <div className="border-t border-gray-100 pt-3">
              <Toggle
                label="All Utilities Included"
                checked={rental.utilitiesIncluded}
                onChange={(val) => {
                  setRentalField('utilitiesIncluded', val);
                  if (val) {
                    setRentalField('electricityIncluded', true);
                    setRentalField('gasIncluded',         true);
                    setRentalField('waterIncluded',       true);
                    setRentalField('internetIncluded',    true);
                  }
                }}
                description="Electricity, gas, water, internet all included"
              />
              {!rental.utilitiesIncluded && (
                <div className="grid grid-cols-2 gap-1 mt-3">
                  <Toggle
                    label="⚡ Electricity Included"
                    checked={rental.electricityIncluded}
                    onChange={(val) => setRentalField('electricityIncluded', val)}
                  />
                  <Toggle
                    label="🔥 Gas Included"
                    checked={rental.gasIncluded}
                    onChange={(val) => setRentalField('gasIncluded', val)}
                  />
                  <Toggle
                    label="💧 Water Included"
                    checked={rental.waterIncluded}
                    onChange={(val) => setRentalField('waterIncluded', val)}
                  />
                  <Toggle
                    label="🌐 Internet Included"
                    checked={rental.internetIncluded}
                    onChange={(val) => setRentalField('internetIncluded', val)}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3">
              <Toggle
                label="Parking Included"
                checked={rental.parkingIncluded}
                onChange={(val) => setRentalField('parkingIncluded', val)}
                description="Parking space included in monthly rent"
              />
            </div>

            {/* Rent Increment */}
            <div className="border-t border-gray-100 pt-3">
              <Toggle
                label="Annual Rent Increment"
                checked={rental.rentIncrementYearly}
                onChange={(val) => setRentalField('rentIncrementYearly', val)}
                description="Rent will increase each year (Pakistani market norm)"
              />
              {rental.rentIncrementYearly && (
                <div className="mt-3">
                  <label htmlFor="rent-increment"
                    className="block text-sm font-medium text-gray-700 mb-1.5">
                    Annual Increment (%)
                  </label>
                  <div className="relative">
                    <input
                      id="rent-increment"
                      type="number" min="0" max="50" step="0.5"
                      placeholder="e.g. 10"
                      value={rental.rentIncrementPercent || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const n = raw === '' ? 0 : parseFloat(raw);
                        if (!isNaN(n) && n >= 0 && n <= 50)
                          setRentalField('rentIncrementPercent', n);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-8
                        focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2
                      text-sm text-gray-400 font-medium pointer-events-none">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Pakistani standard: 8-10% annual increment
                  </p>
                </div>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* ── Tenant Preferences ── */}
      {cfg.showPreferredTenant && (
        <FormSection
          id="pricing-rent-tenant"
          title="Tenant Preferences"
          icon={<Users className="w-5 h-5" />}
          defaultOpen={false}
          completionStatus={
            rental.preferredTenantType && rental.preferredTenantType !== 'any'
              ? 'complete' : 'optional'
          }
        >
          <div className="space-y-4">
            {/* Tenant Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Tenant Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TENANT_TYPE_OPTIONS.map((opt) => {
                  const isActive = rental.preferredTenantType === opt.value;
                  return (
                    <button
                      key={opt.value ?? 'any'}
                      type="button"
                      onClick={() =>
                        setRentalField('preferredTenantType', opt.value)
                      }
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2
                        transition-all duration-150 text-center
                        ${isActive
                          ? 'border-[#0d9488] bg-[#0d9488] bg-opacity-5 text-[#0d9488]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Max Occupants */}
            <div>
              <label htmlFor="rent-max-occupants"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Maximum Occupants
              </label>
              <input
                id="rent-max-occupants"
                type="number" min="0" max="50"
                placeholder="e.g. 4"
                value={rental.maxOccupants || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = raw === '' ? 0 : parseInt(raw, 10);
                  if (!isNaN(n) && n >= 0) setRentalField('maxOccupants', n);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Maximum number of people allowed (0 = unrestricted)
              </p>
            </div>

            {/* Permissions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1
              border-t border-gray-100 pt-3">
              <Toggle
                label="Pets Allowed"
                checked={rental.petsAllowed}
                onChange={(val) => setRentalField('petsAllowed', val)}
                description="Dogs, cats, birds etc."
              />
              <Toggle
                label="Smoking Allowed"
                checked={rental.smokingAllowed}
                onChange={(val) => setRentalField('smokingAllowed', val)}
              />
              <Toggle
                label="Commercial Use Allowed"
                checked={rental.commercialUseAllowed}
                onChange={(val) => setRentalField('commercialUseAllowed', val)}
                description="Running a business from the property"
              />
            </div>
          </div>
        </FormSection>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRE-LAUNCH SECTION
// ═══════════════════════════════════════════════════════════════

interface PreLaunchFieldsProps {
  form:     PropertyFormState;
  errors:   TabErrors;
  setField: UsePropertyFormReturn['setField'];
}

function PreLaunchFields({
  form, errors, setField,
}: PreLaunchFieldsProps): React.ReactElement {
  return (
    <FormSection
      id="pricing-pre-launch"
      title="Pre-Launch Pricing"
      icon={<Rocket className="w-5 h-5" />}
      defaultOpen={true}
      required
      badge="Pre-Launch"
      badgeColor="blue"
      completionStatus={safeNum(form.price) > 0 ? 'complete' : 'incomplete'}
    >
      <div className="space-y-4">
        <div className="bg-[#eff6ff] border-l-4 border-[#4f46e5] px-4 py-3 rounded-r-lg">
          <p className="text-sm text-[#004063]">
            <strong>Pre-Launch / Token Booking:</strong> Set the expected launch
            price and token amount required to secure this property before
            official launch.
          </p>
        </div>

        <PriceInput
          id="price-pre-launch"
          label="Expected Price"
          value={form.price}
          onChange={(val) => setField('price', val)}
          error={errors.price}
          required
          placeholder="e.g. 8000000"
          hint="Price may change at launch — this is the expected/indicative price"
        />

        <PriceInput
          id="price-token"
          label="Token / Booking Amount"
          value={form.tokenAmount}
          onChange={(val) => setField('tokenAmount', val)}
          placeholder="e.g. 500000"
          hint="Amount required to secure booking before launch"
        />

        {/* Balance */}
        {safeNum(form.price) > 0 && safeNum(form.tokenAmount) > 0 && (
          <div className="bg-[#4f46e5] bg-opacity-5 border border-[#4f46e5]
            rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Balance on Launch</span>
              <span className="font-semibold text-[#4f46e5]">
                Rs. {formatPKRNumeric(safeNum(form.price) - safeNum(form.tokenAmount))}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {formatPKR(safeNum(form.price) - safeNum(form.tokenAmount))}
            </p>
          </div>
        )}

        {/* Expected Completion */}
        <div>
          <label htmlFor="price-completion"
            className="block text-sm font-medium text-gray-700 mb-1.5">
            Expected Launch / Completion Date
          </label>
          <input
            id="price-completion" type="date"
            value={form.expectedCompletionDate}
            onChange={(e) => setField('expectedCompletionDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5
              focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          />
        </div>

        <Toggle
          label="Price is Negotiable"
          checked={form.isNegotiable}
          onChange={(val) => setField('isNegotiable', val)}
        />
      </div>
    </FormSection>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function TabPricing({
  form,
  errors,
  setField,
  setInstallmentField,
  setRentalField,
  setListingType,
  fieldConfig: cfg,
}: TabPricingProps): React.ReactElement {

  // Safety guard
  if (!cfg) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-400 text-sm">
          Loading form...
        </div>
      </div>
    );
  }

  // Get allowed listing types for this property type
  const allowedTypes = cfg.allowedListingTypes;
  const isLocked     = allowedTypes.length === 1;

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════
          LISTING TYPE SELECTOR
         ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#004063]">
            Listing Type
          </h3>
          {isLocked && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1
              rounded-full bg-amber-50 text-[#f59e0b] text-xs font-medium">
              <Lock className="w-3 h-3" />
              Locked for this type
            </span>
          )}
        </div>

        {/* Show all 4 types, but disable non-allowed ones */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(LISTING_TYPE_LABELS) as [ListingType, string][])
            .map(([type, label]) => {
              const isActive   = form.listingType === type;
              const isAllowed  = allowedTypes.includes(type);
              const colors     = LISTING_TYPE_COLORS[type];

              return (
                <button
                  key={type}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => isAllowed && setListingType(type)}
                  title={!isAllowed
                    ? `Not available for ${form.propertyType || 'this property type'}`
                    : ''}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2
                    transition-all duration-150
                    ${!isAllowed
                      ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                      : isActive
                        ? `${colors.border} ${colors.bg} shadow-md`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <span className={
                    !isAllowed
                      ? 'text-gray-300'
                      : isActive ? colors.text : 'text-gray-400'
                  }>
                    {LISTING_TYPE_ICONS[type]}
                  </span>
                  <span className={`text-xs font-medium text-center leading-tight
                    ${!isAllowed
                      ? 'text-gray-400'
                      : isActive ? colors.text : 'text-gray-600'
                    }`}>
                    {label}
                  </span>
                  {!isAllowed && (
                    <Lock className="w-3 h-3 text-gray-300" />
                  )}
                </button>
              );
            })}
        </div>

        {/* Reset notice / restriction notice */}
        {!isLocked && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            ⚠ Changing listing type resets pricing fields
          </p>
        )}
        {isLocked && form.propertyType === 'room' && (
          <p className="text-xs text-[#f59e0b] mt-3 text-center font-medium">
            🛏️ Rooms are typically only for rent in Pakistani market
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          DYNAMIC PRICING FIELDS
         ══════════════════════════════════════════════════════ */}
      {form.listingType === 'full_payment' && (
        <FullPaymentFields
          form={form}
          errors={errors}
          setField={setField}
        />
      )}

      {form.listingType === 'installment' && (
        <InstallmentFields
          form={form}
          errors={errors}
          setInstallmentField={setInstallmentField}
        />
      )}

      {form.listingType === 'rent' && (
        <RentFields
          form={form}
          errors={errors}
          setRentalField={setRentalField}
          fieldConfig={cfg}
        />
      )}

      {form.listingType === 'pre_launch' && (
        <PreLaunchFields
          form={form}
          errors={errors}
          setField={setField}
        />
      )}

    </div>
  );
}