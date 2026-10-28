// components/property/forms/listing/StepPricing.tsx
//
// Step 3: Pricing (listing-type conditional) + Utilities
// Full: price + negotiable
// Installment: Smart Calculator (%-based auto-calc)
// Rent: monthly + security + advance + utilities-included
// Pre-Launch: booking price + launch date
// Utilities: 8 fields (API contract)

'use client';

import React, { useMemo } from 'react';
import {
  TrendingUp, Calendar, Home, Zap, Droplets,
  Flame, Wifi, Camera, Lightbulb, Shield, CreditCard,
} from 'lucide-react';

import type { ListingFormState } from './types';

interface StepPricingProps {
  form: ListingFormState;
  setField: <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => void;
  errors: Record<string, string>;
}

const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

// Utility toggle component
function UtilityToggle({ icon, label, value, onChange }: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        value ? 'border-[#029bba] bg-[#029bba]/5' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span className={value ? 'text-[#029bba]' : 'text-gray-400'}>{icon}</span>
      <div className="flex-1 text-left">
        <p className={`text-sm font-semibold ${value ? 'text-[#029bba]' : 'text-gray-600'}`}>
          {label}
        </p>
      </div>
      <div className={`w-10 h-5 rounded-full transition-colors relative ${
        value ? 'bg-[#029bba]' : 'bg-gray-300'
      }`}>
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
            value ? 'left-5' : 'left-0.5'
          }`}
        />
      </div>
    </button>
  );
}

// Utility status select (electricity/gas/water/sewerage — 3 states)
const UTILITY_STATUS = ['available', 'applied', 'not_available'] as const;

function UtilityStatusSelect({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="">Select status</option>
        {UTILITY_STATUS.map((s) => (
          <option key={s} value={s}>
            {s === 'available' ? 'Available' : s === 'applied' ? 'Applied (pending)' : 'Not Available'}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function StepPricing({ form, setField, errors }: StepPricingProps): React.ReactElement {
  const lt = form.listingType;

  // ── Smart Installment Calculator (project-form wala pattern) ──
  const instCalc = useMemo(() => {
    const total = Number(form.instTotalPrice) || 0;
    const bPct = Number(form.bookingPercent) || 0;
    const dPct = Number(form.downPercent) || 0;
    const pPct = Number(form.possessionPercent) || 0;
    const count = Number(form.installmentCount) || 0;

    const bookingAmount = Math.round((total * bPct) / 100);
    const downAmount = Math.round((total * dPct) / 100);
    const possessionAmount = Math.round((total * pPct) / 100);
    const upfrontPct = bPct + dPct + pPct;
    const remaining = Math.max(total - bookingAmount - downAmount - possessionAmount, 0);
    const perInstallment = count > 0 ? Math.round(remaining / count) : 0;

    return { total, bookingAmount, downAmount, possessionAmount, upfrontPct, remaining, perInstallment, count };
  }, [form.instTotalPrice, form.bookingPercent, form.downPercent, form.possessionPercent, form.installmentCount]);

  return (
    <div className="space-y-8">
      {/* ═══ PRICING (listing-type conditional) ═══ */}

      {/* FULL PAYMENT / PRE-LAUNCH */}
      {(lt === 'full_payment' || lt === 'pre_launch') && (
        <div className="rounded-xl border border-[#029bba]/20 bg-[#029bba]/[0.02] p-5">
          <h4 className="font-semibold text-[#004063] mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#029bba]" />
            {lt === 'full_payment' ? 'Asking Price' : 'Pre-Launch Price'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Price (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="e.g. 12500000"
                min={0}
                className={inputCls}
              />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>
            <div className="flex items-center gap-3">
              <UtilityToggle
                icon={<TrendingUp className="w-5 h-5" />}
                label="Price Negotiable"
                value={form.priceNegotiable}
                onChange={(v) => setField('priceNegotiable', v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* RENT */}
      {lt === 'rent' && (
        <div className="rounded-xl border border-[#029bba]/20 bg-[#029bba]/[0.02] p-5">
          <h4 className="font-semibold text-[#004063] mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-[#029bba]" />
            Rental Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>
                Monthly Rent (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.monthlyRent}
                onChange={(e) => setField('monthlyRent', e.target.value)}
                placeholder="e.g. 45000"
                min={0}
                className={inputCls}
              />
              {errors.monthlyRent && <p className="text-xs text-red-500 mt-1">{errors.monthlyRent}</p>}
            </div>
            <div>
              <label className={labelCls}>Security Deposit (PKR)</label>
              <input
                type="number"
                value={form.securityDeposit}
                onChange={(e) => setField('securityDeposit', e.target.value)}
                placeholder="e.g. 90000"
                min={0}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Advance (months)</label>
              <input
                type="number"
                value={form.advanceMonths}
                onChange={(e) => setField('advanceMonths', e.target.value)}
                placeholder="e.g. 2"
                min={0}
                max={12}
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-4">
            <UtilityToggle
              icon={<Zap className="w-5 h-5" />}
              label="Utilities Included in Rent"
              value={form.utilitiesIncluded}
              onChange={(v) => setField('utilitiesIncluded', v)}
            />
          </div>
        </div>
      )}

      {/* INSTALLMENT — Smart Calculator */}
      {lt === 'installment' && (
        <div className="rounded-xl border border-[#029bba]/20 bg-[#eff6ff]/50 p-5">
          <h4 className="font-semibold text-[#004063] mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#029bba]" />
            Installment Plan (Smart Calculator)
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Enter total price + percentages — installments auto-calculated
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>
                Total Price (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.instTotalPrice}
                onChange={(e) => setField('instTotalPrice', e.target.value)}
                placeholder="e.g. 12000000"
                min={0}
                className={inputCls}
              />
              {errors.instTotalPrice && <p className="text-xs text-red-500 mt-1">{errors.instTotalPrice}</p>}
            </div>
            <div>
              <label className={labelCls}>Booking (%)</label>
              <input
                type="number"
                value={form.bookingPercent}
                onChange={(e) => setField('bookingPercent', e.target.value)}
                placeholder="e.g. 10"
                min={0}
                max={100}
                className={inputCls}
              />
              {instCalc.bookingAmount > 0 && (
                <p className="text-xs text-[#029bba] font-semibold mt-1 tabular-nums">
                  = PKR {instCalc.bookingAmount.toLocaleString('en-PK')}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Down Payment (%)</label>
              <input
                type="number"
                value={form.downPercent}
                onChange={(e) => setField('downPercent', e.target.value)}
                placeholder="e.g. 20"
                min={0}
                max={100}
                className={inputCls}
              />
              {instCalc.downAmount > 0 && (
                <p className="text-xs text-[#029bba] font-semibold mt-1 tabular-nums">
                  = PKR {instCalc.downAmount.toLocaleString('en-PK')}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Possession (%)</label>
              <input
                type="number"
                value={form.possessionPercent}
                onChange={(e) => setField('possessionPercent', e.target.value)}
                placeholder="e.g. 10"
                min={0}
                max={100}
                className={inputCls}
              />
              {instCalc.possessionAmount > 0 && (
                <p className="text-xs text-[#029bba] font-semibold mt-1 tabular-nums">
                  = PKR {instCalc.possessionAmount.toLocaleString('en-PK')}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Number of Installments</label>
              <input
                type="number"
                value={form.installmentCount}
                onChange={(e) => setField('installmentCount', e.target.value)}
                placeholder="e.g. 12"
                min={1}
                max={120}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => {
                  const newFreq = e.target.value as typeof form.frequency;
                  // Preserve plan duration — convert count (kal wala fix):
                  // 12 quarters = 36 months → 36 monthly / 6 half-yearly
                  const currentMonths =
                    form.frequency === 'monthly' ? Number(form.installmentCount) || 0
                    : form.frequency === 'quarterly' ? (Number(form.installmentCount) || 0) * 3
                    : (Number(form.installmentCount) || 0) * 6;
                  if (currentMonths > 0) {
                    const newCount =
                      newFreq === 'monthly' ? currentMonths
                      : newFreq === 'quarterly' ? Math.round(currentMonths / 3)
                      : Math.round(currentMonths / 6);
                    setField('installmentCount', String(Math.max(newCount, 1)));
                  }
                  setField('frequency', newFreq);
                }}
                className={inputCls}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (every 3 months)</option>
                <option value="half-yearly">Half-Yearly (every 6 months)</option>
              </select>
            </div>
          </div>

          {/* Auto-calculated summary */}
          {instCalc.total > 0 && instCalc.count > 0 && (
            <div className="mt-4 rounded-xl bg-white border border-[#029bba]/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#004063] uppercase tracking-wide">
                  Auto-Calculated Plan
                </p>
                <span className="text-xs text-gray-400 tabular-nums">
                  {instCalc.upfrontPct}% upfront
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Booking</p>
                  <p className="font-bold text-gray-900 tabular-nums">
                    PKR {instCalc.bookingAmount.toLocaleString('en-PK')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Down Payment</p>
                  <p className="font-bold text-gray-900 tabular-nums">
                    PKR {instCalc.downAmount.toLocaleString('en-PK')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Possession</p>
                  <p className="font-bold text-gray-900 tabular-nums">
                    PKR {instCalc.possessionAmount.toLocaleString('en-PK')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Remaining</p>
                  <p className="font-bold text-gray-900 tabular-nums">
                    PKR {instCalc.remaining.toLocaleString('en-PK')}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-600">Each installment</p>
                <p className="text-lg font-black text-[#029bba] tabular-nums">
                  PKR {instCalc.perInstallment.toLocaleString('en-PK')}
                  <span className="text-xs text-gray-400 font-semibold ml-1">
                    × {instCalc.count}
                  </span>
                </p>
              </div>

              {instCalc.upfrontPct > 100 && (
                <p className="text-xs text-red-500 font-bold mt-2">
                  Warning: percentages exceed 100%!
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ UTILITIES (sab types — API contract) ═══ */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-[#004063] mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#029bba]" />
          Utilities & Infrastructure
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <UtilityStatusSelect
            label="Electricity"
            value={form.electricityStatus}
            onChange={(v) => setField('electricityStatus', v)}
          />
          <UtilityStatusSelect
            label="Sui Gas"
            value={form.suiGasStatus}
            onChange={(v) => setField('suiGasStatus', v)}
          />
          <UtilityStatusSelect
            label="Water Supply"
            value={form.waterStatus}
            onChange={(v) => setField('waterStatus', v)}
          />
          <UtilityStatusSelect
            label="Sewerage"
            value={form.sewerageStatus}
            onChange={(v) => setField('sewerageStatus', v)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <UtilityToggle
            icon={<Wifi className="w-5 h-5" />}
            label="Internet"
            value={form.internetReady}
            onChange={(v) => setField('internetReady', v)}
          />
          <UtilityToggle
            icon={<Camera className="w-5 h-5" />}
            label="CCTV"
            value={form.cctvCoverage}
            onChange={(v) => setField('cctvCoverage', v)}
          />
          <UtilityToggle
            icon={<Lightbulb className="w-5 h-5" />}
            label="Street Lights"
            value={form.streetLights}
            onChange={(v) => setField('streetLights', v)}
          />
          <UtilityToggle
            icon={<Shield className="w-5 h-5" />}
            label="Gated"
            value={form.gatedCommunity}
            onChange={(v) => setField('gatedCommunity', v)}
          />
        </div>

        <div className="mt-4">
          <label className={labelCls}>Road Condition</label>
          <select
            value={form.roadCondition}
            onChange={(e) => setField('roadCondition', e.target.value)}
            className={inputCls}
          >
            <option value="">Select condition</option>
            <option value="carpeted">Carpeted</option>
            <option value="metalled">Metalled</option>
            <option value="kacha">Kacha (unpaved)</option>
            <option value="under_construction">Under Construction</option>
          </select>
        </div>
      </div>
    </div>
  );
}