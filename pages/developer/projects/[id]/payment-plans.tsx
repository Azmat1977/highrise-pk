// pages/developer/projects/[id]/payment-plans.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  DollarSign,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Star,
  CreditCard,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Percent,
  Building2,
  Banknote,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface InstallmentBreakdown {
  label:       string;
  amount:      number;
  percentage?: number;
  dueDate?:    string;
  dueAfter?:   string;
  frequency?:  string;
  count?:      number;
  notes?:      string;
}

interface PaymentPlanData {
  _id?:                  string;
  name:                  string;
  description?:          string;
  planType:              string;
  applicableTo?:         string;
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
  order?:                number;
  termsAndConditions?:   string;
  disclaimers?:          string;
}

const PLAN_TYPES = [
  { value: 'standard',         label: 'Standard Plan' },
  { value: 'easy_installment', label: 'Easy Installment' },
  { value: 'flexi',            label: 'Flexi Plan' },
  { value: 'down_payment',     label: 'Down Payment Plan' },
  { value: 'full_payment',     label: 'Full Payment' },
  { value: 'custom',           label: 'Custom Plan' },
];

const APPLICABLE_TO = [
  { value: 'all_units',       label: 'All Units' },
  { value: 'residential',     label: 'Residential Only' },
  { value: 'commercial',      label: 'Commercial Only' },
  { value: 'specific_types',  label: 'Specific Unit Types' },
];

const FREQUENCY_OPTIONS = [
  { value: 'one_time',       label: 'One-Time' },
  { value: 'monthly',        label: 'Monthly' },
  { value: 'quarterly',      label: 'Quarterly' },
  { value: 'half_yearly',    label: 'Half-Yearly' },
  { value: 'yearly',         label: 'Yearly' },
  { value: 'on_possession',  label: 'On Possession' },
];

const MAX_PLANS = 10;

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatPKR(amount?: number): string {
  if (!amount || amount <= 0) return '—';
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

function getPlanTypeLabel(type: string): string {
  return PLAN_TYPES.find((p) => p.value === type)?.label ?? type;
}

function getEmptyPlan(): PaymentPlanData {
  return {
    name:             '',
    planType:         'standard',
    applicableTo:     'all_units',
    totalPrice:       undefined,
    bookingAmount:    undefined,
    bookingPercent:   undefined,
    downPayment:      undefined,
    downPaymentPercent: undefined,
    downPaymentDueIn: '',
    installments:     [],
    possessionAmount: undefined,
    possessionPercent: undefined,
    planDuration:     undefined,
    planDurationUnit: 'months',
    earlyPaymentDiscount: undefined,
    fullPaymentDiscount:  undefined,
    bulkBookingDiscount:  undefined,
    isActive:         true,
    isDefault:        false,
    isFeatured:       false,
    termsAndConditions: '',
    disclaimers:        '',
  };
}

function getEmptyInstallment(): InstallmentBreakdown {
  return {
    label:     '',
    amount:    0,
    frequency: 'monthly',
    count:     1,
  };
}

// ════════════════════════════════════════════════════
// BANNER COMPONENT
// ════════════════════════════════════════════════════

function Banner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error' | 'warning';
  message: string;
  onDismiss: () => void;
}): React.ReactElement {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const colors = {
    success: 'bg-emerald-600',
    error:   'bg-red-600',
    warning: 'bg-amber-600',
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
    error:   <AlertCircle className="w-5 h-5 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
  };

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50
                     px-5 py-3 rounded-xl shadow-xl flex items-center gap-3
                     text-white ${colors[type]}`}>
      {icons[type]}
      <p className="text-sm font-semibold">{message}</p>
      <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
// INSTALLMENT ROW
// ════════════════════════════════════════════════════

function InstallmentRow({
  installment,
  index,
  onChange,
  onRemove,
}: {
  installment: InstallmentBreakdown;
  index:       number;
  onChange:     (index: number, field: string, value: unknown) => void;
  onRemove:    (index: number) => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-2 p-3 rounded-xl bg-gray-50
                    border border-gray-100">
      {/* Label */}
      <input
        type="text"
        value={installment.label}
        onChange={(e) => onChange(index, 'label', e.target.value)}
        placeholder="e.g., Monthly Installment"
        maxLength={100}
        className="flex-1 w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200
                   text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                   outline-none transition-colors"
      />

      {/* Amount */}
      <input
        type="number"
        value={installment.amount || ''}
        onChange={(e) => onChange(index, 'amount', Number(e.target.value))}
        placeholder="Amount"
        min={0}
        className="w-full sm:w-32 px-3 py-2 rounded-xl border border-gray-200
                   text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                   outline-none transition-colors"
      />

      {/* Frequency */}
      <div className="relative w-full sm:w-36">
        <select
          value={installment.frequency ?? 'monthly'}
          onChange={(e) => onChange(index, 'frequency', e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-gray-200
                     text-sm appearance-none bg-white
                     focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                     outline-none transition-colors"
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>

      {/* Count */}
      <input
        type="number"
        value={installment.count ?? ''}
        onChange={(e) => onChange(index, 'count', Number(e.target.value))}
        placeholder="Count"
        min={0}
        max={600}
        className="w-full sm:w-20 px-3 py-2 rounded-xl border border-gray-200
                   text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                   outline-none transition-colors"
      />

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        className="p-2 rounded-lg hover:bg-red-50 text-gray-400
                   hover:text-red-500 transition-colors flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
// PLAN FORM MODAL
// ════════════════════════════════════════════════════

function PlanFormModal({
  plan,
  isEdit,
  onSave,
  onClose,
  saving,
}: {
  plan:    PaymentPlanData;
  isEdit:  boolean;
  onSave:  (plan: PaymentPlanData) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}): React.ReactElement {
  const [form, setForm] = useState<PaymentPlanData>({ ...plan });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleInstallmentChange = (index: number, field: string, value: unknown) => {
    setForm((prev) => {
      const updated = [...(prev.installments ?? [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, installments: updated };
    });
  };

  const addInstallment = () => {
    setForm((prev) => ({
      ...prev,
      installments: [...(prev.installments ?? []), getEmptyInstallment()],
    }));
  };

  const removeInstallment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      installments: (prev.installments ?? []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center
                 bg-black/50 backdrop-blur-sm overflow-y-auto py-4 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-[#004063]">
            {isEdit ? 'Edit Payment Plan' : 'Add Payment Plan'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5">

          {/* Name + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Plan Name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                maxLength={200}
                placeholder="e.g., 3 Year Easy Installment"
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200
                           text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                           outline-none transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Plan Type <span className="text-red-500">*</span>
              </span>
              <div className="relative mt-1">
                <select
                  value={form.planType}
                  onChange={(e) => updateField('planType', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                             text-sm appearance-none bg-white
                             focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                             outline-none transition-colors"
                >
                  {PLAN_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                        w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </label>
          </div>

          {/* Description */}
          <label className="block">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Description
            </span>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => updateField('description', e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Brief description of this plan..."
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200
                         text-sm resize-none focus:border-[#029bba] focus:ring-1
                         focus:ring-[#029bba] outline-none transition-colors"
            />
          </label>

          {/* Total Price */}
          <label className="block">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Total Unit Price (PKR)
            </span>
            <input
              type="number"
              value={form.totalPrice ?? ''}
              onChange={(e) => updateField('totalPrice', Number(e.target.value) || undefined)}
              min={0}
              placeholder="e.g., 8500000"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200
                         text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                         outline-none transition-colors"
            />
            {form.totalPrice && form.totalPrice > 0 && (
              <p className="text-[10px] text-[#029bba] mt-1 font-semibold">
                {formatPKR(form.totalPrice)}
              </p>
            )}
          </label>

          {/* Key amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Booking */}
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                Booking Amount
              </span>
              <input
                type="number"
                value={form.bookingAmount ?? ''}
                onChange={(e) => updateField('bookingAmount', Number(e.target.value) || undefined)}
                min={0}
                placeholder="Amount"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                           text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                           outline-none transition-colors"
              />
              <input
                type="number"
                value={form.bookingPercent ?? ''}
                onChange={(e) => updateField('bookingPercent', Number(e.target.value) || undefined)}
                min={0}
                max={100}
                placeholder="%"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200
                           text-xs focus:border-[#029bba] outline-none transition-colors"
              />
            </div>

            {/* Down Payment */}
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                Down Payment
              </span>
              <input
                type="number"
                value={form.downPayment ?? ''}
                onChange={(e) => updateField('downPayment', Number(e.target.value) || undefined)}
                min={0}
                placeholder="Amount"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                           text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                           outline-none transition-colors"
              />
              <input
                type="text"
                value={form.downPaymentDueIn ?? ''}
                onChange={(e) => updateField('downPaymentDueIn', e.target.value)}
                placeholder="Due in (e.g., 30 days)"
                maxLength={60}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200
                           text-xs focus:border-[#029bba] outline-none transition-colors"
              />
            </div>

            {/* Possession */}
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                On Possession
              </span>
              <input
                type="number"
                value={form.possessionAmount ?? ''}
                onChange={(e) => updateField('possessionAmount', Number(e.target.value) || undefined)}
                min={0}
                placeholder="Amount"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                           text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                           outline-none transition-colors"
              />
              <input
                type="number"
                value={form.possessionPercent ?? ''}
                onChange={(e) => updateField('possessionPercent', Number(e.target.value) || undefined)}
                min={0}
                max={100}
                placeholder="%"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200
                           text-xs focus:border-[#029bba] outline-none transition-colors"
              />
            </div>
          </div>

          {/* Plan duration */}
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Plan Duration
              </span>
              <input
                type="number"
                value={form.planDuration ?? ''}
                onChange={(e) => updateField('planDuration', Number(e.target.value) || undefined)}
                min={0}
                max={600}
                placeholder="e.g., 36"
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200
                           text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                           outline-none transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Duration Unit
              </span>
              <div className="relative mt-1">
                <select
                  value={form.planDurationUnit ?? 'months'}
                  onChange={(e) => updateField('planDurationUnit', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                             text-sm appearance-none bg-white
                             focus:border-[#029bba] outline-none transition-colors"
                >
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                        w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </label>
          </div>

          {/* Installment breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Installment Breakdown
              </span>
              <button
                onClick={addInstallment}
                disabled={(form.installments?.length ?? 0) >= 30}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg
                           text-xs font-semibold text-[#029bba] bg-[#029bba]/10
                           hover:bg-[#029bba]/20 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Row
              </button>
            </div>

            {(form.installments?.length ?? 0) === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">
                  No installment breakdown added yet
                </p>
                <button
                  onClick={addInstallment}
                  className="mt-2 text-xs font-semibold text-[#029bba] hover:underline"
                >
                  + Add first installment row
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {form.installments!.map((inst, idx) => (
                  <InstallmentRow
                    key={idx}
                    installment={inst}
                    index={idx}
                    onChange={handleInstallmentChange}
                    onRemove={removeInstallment}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500
                       hover:text-[#029bba] transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              {/* Discounts */}
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Early Payment %
                  </span>
                  <input
                    type="number"
                    value={form.earlyPaymentDiscount ?? ''}
                    onChange={(e) => updateField('earlyPaymentDiscount', Number(e.target.value) || undefined)}
                    min={0}
                    max={100}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200
                               text-sm focus:border-[#029bba] outline-none transition-colors"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Full Payment %
                  </span>
                  <input
                    type="number"
                    value={form.fullPaymentDiscount ?? ''}
                    onChange={(e) => updateField('fullPaymentDiscount', Number(e.target.value) || undefined)}
                    min={0}
                    max={100}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200
                               text-sm focus:border-[#029bba] outline-none transition-colors"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Bulk Booking %
                  </span>
                  <input
                    type="number"
                    value={form.bulkBookingDiscount ?? ''}
                    onChange={(e) => updateField('bulkBookingDiscount', Number(e.target.value) || undefined)}
                    min={0}
                    max={100}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200
                               text-sm focus:border-[#029bba] outline-none transition-colors"
                  />
                </label>
              </div>

              {/* Applicable to */}
              <label className="block">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Applicable To</span>
                <div className="relative mt-1">
                  <select
                    value={form.applicableTo ?? 'all_units'}
                    onChange={(e) => updateField('applicableTo', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200
                               text-sm appearance-none bg-white
                               focus:border-[#029bba] outline-none transition-colors"
                  >
                    {APPLICABLE_TO.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                          w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </label>

              {/* Validity dates */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Valid From</span>
                  <input
                    type="date"
                    value={form.validFrom ? form.validFrom.split('T')[0] : ''}
                    onChange={(e) => updateField('validFrom', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200
                               text-sm focus:border-[#029bba] outline-none transition-colors"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Valid Until</span>
                  <input
                    type="date"
                    value={form.validUntil ? form.validUntil.split('T')[0] : ''}
                    onChange={(e) => updateField('validUntil', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200
                               text-sm focus:border-[#029bba] outline-none transition-colors"
                  />
                </label>
              </div>

              {/* T&C */}
              <label className="block">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Terms & Conditions</span>
                <textarea
                  value={form.termsAndConditions ?? ''}
                  onChange={(e) => updateField('termsAndConditions', e.target.value)}
                  maxLength={5000}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200
                             text-xs resize-none focus:border-[#029bba] outline-none transition-colors"
                />
              </label>

              {/* Flags */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDefault ?? false}
                    onChange={(e) => updateField('isDefault', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba]
                               focus:ring-[#029bba]"
                  />
                  <span className="text-xs font-semibold text-gray-600">Default Plan</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured ?? false}
                    onChange={(e) => updateField('isFeatured', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba]
                               focus:ring-[#029bba]"
                  />
                  <span className="text-xs font-semibold text-gray-600">Featured (Best Value)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive ?? true}
                    onChange={(e) => updateField('isActive', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba]
                               focus:ring-[#029bba]"
                  />
                  <span className="text-xs font-semibold text-gray-600">Active</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                       text-sm font-semibold text-gray-700 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-sm font-semibold text-white
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// PLAN CARD (list view)
// ════════════════════════════════════════════════════

function PlanListCard({
  plan,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  plan:           PaymentPlanData;
  onEdit:         () => void;
  onDelete:       () => void;
  onToggleActive: () => void;
}): React.ReactElement {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden
                     ${plan.isDefault
                       ? 'border-[#029bba]/30 ring-2 ring-[#029bba]/10'
                       : 'border-gray-100'
                     }
                     ${!plan.isActive ? 'opacity-60' : ''}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#029bba]/10 text-[#029bba]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-gray-900">{plan.name}</h3>
                {plan.isDefault && (
                  <span className="px-2 py-0.5 rounded-full bg-[#029bba] text-white
                                   text-[9px] font-bold flex items-center gap-0.5">
                    <Star className="w-3 h-3" /> Default
                  </span>
                )}
                {plan.isFeatured && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700
                                   text-[9px] font-bold">
                    Best Value
                  </span>
                )}
                {!plan.isActive && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500
                                   text-[9px] font-bold flex items-center gap-0.5">
                    <EyeOff className="w-3 h-3" /> Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {getPlanTypeLabel(plan.planType)}
                {plan.planDuration ? ` · ${plan.planDuration} ${plan.planDurationUnit ?? 'months'}` : ''}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleActive}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400
                         hover:text-gray-600 transition-colors"
              title={plan.isActive ? 'Deactivate' : 'Activate'}
            >
              {plan.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={onEdit}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400
                         hover:text-[#029bba] transition-colors"
              title="Edit"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-400
                         hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Key amounts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {(plan.totalPrice ?? 0) > 0 && (
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[9px] font-bold text-gray-400 uppercase">Total Price</p>
              <p className="text-sm font-black text-[#029bba] mt-0.5">
                {formatPKR(plan.totalPrice)}
              </p>
            </div>
          )}
          {(plan.bookingAmount ?? 0) > 0 && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-[9px] font-bold text-blue-500 uppercase">Booking</p>
              <p className="text-sm font-black text-blue-700 mt-0.5">
                {formatPKR(plan.bookingAmount)}
              </p>
            </div>
          )}
          {(plan.downPayment ?? 0) > 0 && (
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
              <p className="text-[9px] font-bold text-purple-500 uppercase">Down Payment</p>
              <p className="text-sm font-black text-purple-700 mt-0.5">
                {formatPKR(plan.downPayment)}
              </p>
            </div>
          )}
          {(plan.possessionAmount ?? 0) > 0 && (
            <div className="p-2.5 rounded-xl bg-green-50 border border-green-100">
              <p className="text-[9px] font-bold text-green-500 uppercase">Possession</p>
              <p className="text-sm font-black text-green-700 mt-0.5">
                {formatPKR(plan.possessionAmount)}
              </p>
            </div>
          )}
        </div>

        {/* Installment breakdown toggle */}
        {(plan.installments?.length ?? 0) > 0 && (
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500
                       hover:text-[#029bba] transition-colors"
          >
            {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {plan.installments!.length} installment breakdown{plan.installments!.length > 1 ? 's' : ''}
          </button>
        )}

        {showBreakdown && plan.installments && (
          <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-1.5 text-left font-bold text-gray-500">Payment</th>
                  <th className="px-3 py-1.5 text-right font-bold text-gray-500">Amount</th>
                  <th className="px-3 py-1.5 text-right font-bold text-gray-500 hidden sm:table-cell">Frequency</th>
                  <th className="px-3 py-1.5 text-right font-bold text-gray-500 hidden sm:table-cell">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plan.installments.map((inst, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-1.5 font-semibold text-gray-700">{inst.label}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-gray-900">
                      {formatPKR(inst.amount)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-500 hidden sm:table-cell">
                      {FREQUENCY_OPTIONS.find((f) => f.value === inst.frequency)?.label ?? inst.frequency}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-500 hidden sm:table-cell">
                      {inst.count ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Discounts */}
        {((plan.earlyPaymentDiscount ?? 0) > 0 ||
          (plan.fullPaymentDiscount ?? 0) > 0 ||
          (plan.bulkBookingDiscount ?? 0) > 0) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {(plan.earlyPaymentDiscount ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600
                               text-[10px] font-bold flex items-center gap-0.5">
                <Percent className="w-3 h-3" />
                {plan.earlyPaymentDiscount}% Early Payment
              </span>
            )}
            {(plan.fullPaymentDiscount ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600
                               text-[10px] font-bold flex items-center gap-0.5">
                <Percent className="w-3 h-3" />
                {plan.fullPaymentDiscount}% Full Payment
              </span>
            )}
            {(plan.bulkBookingDiscount ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600
                               text-[10px] font-bold flex items-center gap-0.5">
                <Percent className="w-3 h-3" />
                {plan.bulkBookingDiscount}% Bulk Booking
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════

export default function ProjectPaymentPlansPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;

  // State
  const [plans, setPlans]             = useState<PaymentPlanData[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  // Modals
  const [formPlan, setFormPlan]       = useState<PaymentPlanData | null>(null);
  const [isEditMode, setIsEditMode]   = useState(false);
  const [deletePlan, setDeletePlan]   = useState<PaymentPlanData | null>(null);

  // Banner
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // ── Fetch plans ──
  const fetchPlans = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/projects/${id}/payment-plans`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) {
        setPlans(data.data.paymentPlans ?? []);
      }
    } catch {
      setBanner({ type: 'error', message: 'Payment plans load nahi ho sake.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Fetch project name ──
  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProjectName(
            (data.data?.project?.projectName ?? data.project?.projectName) ?? 'Project'
          );
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // ── Create plan ──
  const handleCreate = useCallback(async (plan: PaymentPlanData) => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/payment-plans`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(plan),
      });
      const data = await res.json();
      if (data.success) {
        setBanner({ type: 'success', message: 'Payment plan created successfully' });
        if (data.data?.warning) {
          setTimeout(() => setBanner({ type: 'warning', message: data.data.warning }), 1500);
        }
        setFormPlan(null);
        fetchPlans();
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Creation failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [id, fetchPlans]);

  // ── Update plan ──
  const handleUpdate = useCallback(async (plan: PaymentPlanData) => {
    if (!id || !plan._id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/payment-plans`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ ...plan, planId: plan._id }),
      });
      const data = await res.json();
      if (data.success) {
        setBanner({ type: 'success', message: 'Payment plan updated' });
        setFormPlan(null);
        fetchPlans();
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Update failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [id, fetchPlans]);

  // ── Delete plan ──
  const handleDelete = useCallback(async () => {
    if (!id || !deletePlan?._id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/payment-plans`, {
        method:      'DELETE',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ planId: deletePlan._id }),
      });
      const data = await res.json();
      if (data.success) {
        setBanner({ type: 'success', message: 'Payment plan deleted' });
        setDeletePlan(null);
        fetchPlans();
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Delete failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [id, deletePlan, fetchPlans]);

  // ── Toggle active ──
  const handleToggleActive = useCallback(async (plan: PaymentPlanData) => {
    if (!id || !plan._id) return;
    try {
      const res = await fetch(`/api/projects/${id}/payment-plans`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          planId:   plan._id,
          isActive: !plan.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPlans();
      }
    } catch {
      // Silent
    }
  }, [id, fetchPlans]);

  return (
    <DeveloperLayout>
      <Head>
        <title>Payment Plans — {projectName} | Highrise.pk Developer</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Banner */}
      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/developer/projects/${id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500
                     hover:text-[#029bba] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#004063]">
              Payment Plans
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {projectName} — {plans.length}/{MAX_PLANS} plans
            </p>
          </div>

          <button
            onClick={() => { setFormPlan(getEmptyPlan()); setIsEditMode(false); }}
            disabled={plans.length >= MAX_PLANS}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-white text-sm font-semibold
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       hover:shadow-lg disabled:opacity-50
                       transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && plans.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-1">
            Koi Payment Plan Nahi Hai
          </h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Payment plan add karein — Pakistan mein buyers ka sabse pehla sawal installment plan hota hai.
          </p>
          <button
            onClick={() => { setFormPlan(getEmptyPlan()); setIsEditMode(false); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-white text-sm font-semibold
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add First Payment Plan
          </button>
        </div>
      )}

      {/* Plans list */}
      {!loading && plans.length > 0 && (
        <div className="space-y-4">
          {plans.map((plan, idx) => (
            <PlanListCard
              key={plan._id ?? idx}
              plan={plan}
              onEdit={() => { setFormPlan(plan); setIsEditMode(true); }}
              onDelete={() => setDeletePlan(plan)}
              onToggleActive={() => handleToggleActive(plan)}
            />
          ))}
        </div>
      )}

      {/* Plan form modal */}
      {formPlan && (
        <PlanFormModal
          plan={formPlan}
          isEdit={isEditMode}
          onSave={isEditMode ? handleUpdate : handleCreate}
          onClose={() => setFormPlan(null)}
          saving={saving}
        />
      )}

      {/* Delete confirmation */}
      {deletePlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setDeletePlan(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base text-gray-800 mb-1">
              Delete &quot;{deletePlan.name}&quot;?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Yeh payment plan permanently delete ho jaye ga. Agar yeh default plan hai toh
              next plan automatically default ban jaye ga.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeletePlan(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                           text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-red-500 text-white text-sm font-semibold
                           hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DeveloperLayout>
  );
}