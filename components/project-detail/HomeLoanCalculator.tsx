/**
 * components/project-detail/HomeLoanCalculator.tsx
 *
 * Highrise.pk — Home Loan / Financing Calculator
 * Extracted from index.tsx (Wave 4 Task 2)
 *
 * Features:
 *   → Property price display (auto from project)
 *   → Down payment slider (10-50%)
 *   → Loan amount slider (dynamic)
 *   → Tenure slider (5-30 years)
 *   → Interest rate slider (10-20%)
 *   → EMI calculation with breakdown
 *   → 7 Pakistani bank options with Islamic filter
 *   → Total Cost of Ownership section (Wave 4 NEW)
 *     - Stamp duty estimate (2%)
 *     - Registration fee estimate (~1%)
 *     - Annual maintenance estimate
 *     - Agent fee (PKR 0 on Highrise — USP)
 *
 * Rules:
 *   → Tailwind only (zero inline styles except % widths)
 *   → Lucide React icons only
 *   → No framer-motion
 *   → Mobile-first (375px min)
 *   → Guest-first (no login needed)
 */

'use client';

import React, { useState } from 'react';
import { CreditCard, Info } from 'lucide-react';
import { formatDetailPrice } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface HomeLoanCalculatorProps {
  propertyPrice: number;
  projectName:   string;
  projectSlug?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PAKISTANI_BANKS = [
  { name: 'Meezan Bank',        rate: 12.5, type: 'Islamic',  badge: '🕌 Islamic'  },
  { name: 'HBL',                rate: 13.5, type: 'Standard', badge: '🏦 Standard' },
  { name: 'UBL',                rate: 14.0, type: 'Standard', badge: '🏦 Standard' },
  { name: 'MCB',                rate: 13.8, type: 'Standard', badge: '🏦 Standard' },
  { name: 'Standard Chartered', rate: 13.9, type: 'Standard', badge: '🏦 Standard' },
  { name: 'Islamic Bank',       rate: 13.0, type: 'Islamic',  badge: '🕌 Islamic'  },
  { name: 'Alfalah',            rate: 13.5, type: 'Both',     badge: '🏦 Both'     },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// EMI CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

function calcEMI(principal: number, annualRate: number, tenureYears: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const months      = tenureYears * 12;
  if (monthlyRate === 0) return Math.round(principal / months);
  return Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTAL COST OF OWNERSHIP SECTION (Wave 4 NEW)
// ─────────────────────────────────────────────────────────────────────────────

function TotalCostOwnership({ propertyPrice }: { propertyPrice: number }) {
  const stampDuty          = Math.round(propertyPrice * 0.02);
  const registrationFee    = Math.round(propertyPrice * 0.01);
  const annualMaintenance  = Math.round(propertyPrice * 0.005);
  const agentFee           = 0;
  const firstYearTotal     = propertyPrice + stampDuty + registrationFee + annualMaintenance;

  const rows = [
    {
      label:   'Property Price',
      value:   formatDetailPrice(propertyPrice),
      color:   'text-gray-900',
      bg:      'bg-white',
      note:    null,
    },
    {
      label:   'Stamp Duty',
      value:   `PKR ${formatDetailPrice(stampDuty)}`,
      color:   'text-orange-700',
      bg:      'bg-orange-50',
      note:    '~2% of property value (estimate)',
    },
    {
      label:   'Registration Fee',
      value:   `PKR ${formatDetailPrice(registrationFee)}`,
      color:   'text-blue-700',
      bg:      'bg-blue-50',
      note:    '~1% of property value (estimate)',
    },
    {
      label:   'Annual Maintenance',
      value:   `PKR ${formatDetailPrice(annualMaintenance)}/yr`,
      color:   'text-purple-700',
      bg:      'bg-purple-50',
      note:    '~0.5% estimate — varies by project',
    },
    {
      label:   'Agent Commission',
      value:   'PKR 0',
      color:   'text-emerald-700',
      bg:      'bg-emerald-50',
      note:    '✅ Zero on Highrise.pk — always free',
    },
  ];

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-[#029bba]" />
        <h3 className="font-bold text-gray-900 text-base">
          Total Cost of Ownership
        </h3>
        <span className="text-xs text-gray-400 font-medium">(First Year Estimate)</span>
      </div>

      {/* Cost rows */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 ${row.bg}`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-700">{row.label}</p>
              {row.note && (
                <p className="text-[10px] text-gray-400 mt-0.5">{row.note}</p>
              )}
            </div>
            <p className={`text-sm font-black ${row.color}`}>{row.value}</p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-3 flex items-center justify-between px-4 py-4 rounded-xl bg-gradient-to-r from-[#004063] to-[#029bba] text-white">
        <div>
          <p className="text-sm font-bold text-white/80">Estimated First Year Total</p>
          <p className="text-[10px] text-white/60 mt-0.5">
            Property + Stamp Duty + Registration + Maintenance
          </p>
        </div>
        <p className="text-xl font-black">PKR {formatDetailPrice(firstYearTotal)}</p>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-400 mt-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 leading-relaxed">
        ⚠️ All figures are estimates only. Stamp duty and registration fees vary by province, property type, and transaction value. Consult a legal expert for exact amounts.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeLoanCalculator({
  propertyPrice,
  projectName,
}: HomeLoanCalculatorProps) {
  const defaultPrice = propertyPrice > 0 ? propertyPrice : 10_000_000;

  const [downPercent,      setDownPercent]      = useState(20);
  const [loanAmount,       setLoanAmount]        = useState(Math.round(defaultPrice * 0.8));
  const [tenure,           setTenure]            = useState(20);
  const [rate,             setRate]              = useState(13.5);
  const [showIslamicOnly,  setShowIslamicOnly]   = useState(false);

  const months           = tenure * 12;
  const emi              = calcEMI(loanAmount, rate, tenure);
  const totalPayment     = emi * months;
  const totalInterest    = totalPayment - loanAmount;
  const principalPercent = Math.round((loanAmount / totalPayment) * 100);
  const interestPercent  = 100 - principalPercent;

  const handleDownPercent = (val: number) => {
    setDownPercent(val);
    setLoanAmount(Math.round(defaultPrice * (1 - val / 100)));
  };

  const displayBanks = showIslamicOnly
    ? PAKISTANI_BANKS.filter(b => b.type === 'Islamic')
    : PAKISTANI_BANKS;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
              <CreditCard className="w-4.5 h-4.5 text-[#029bba]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Home Loan / Financing Calculator
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Estimate your monthly payments for {projectName}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* ── Two column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* LEFT — Inputs */}
            <div className="space-y-6">

              {/* Property price display */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                  Property Price
                </p>
                <p className="text-2xl font-black text-gray-900">
                  PKR {formatDetailPrice(defaultPrice)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Based on starting price</p>
              </div>

              {/* Down Payment slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">
                    Down Payment
                  </label>
                  <span className="text-sm font-black text-[#029bba]">
                    {downPercent}% — PKR {formatDetailPrice(Math.round(defaultPrice * downPercent / 100))}
                  </span>
                </div>
                <input
                  type="range" min={10} max={50} step={5}
                  value={downPercent}
                  onChange={e => handleDownPercent(Number(e.target.value))}
                  aria-label="Down payment percentage"
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#029bba]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>10%</span><span>50%</span>
                </div>
              </div>

              {/* Loan Amount slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">
                    Loan Amount
                  </label>
                  <span className="text-sm font-black text-[#029bba]">
                    PKR {formatDetailPrice(loanAmount)}
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.round(defaultPrice * 0.5)}
                  max={Math.round(defaultPrice * 0.9)}
                  step={100_000}
                  value={loanAmount}
                  onChange={e => setLoanAmount(Number(e.target.value))}
                  aria-label="Loan amount"
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#029bba]"
                />
              </div>

              {/* Tenure slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">
                    Loan Tenure
                  </label>
                  <span className="text-sm font-black text-[#029bba]">
                    {tenure} Years
                  </span>
                </div>
                <input
                  type="range" min={5} max={30} step={5}
                  value={tenure}
                  onChange={e => setTenure(Number(e.target.value))}
                  aria-label="Loan tenure in years"
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#029bba]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>5 Years</span><span>30 Years</span>
                </div>
              </div>

              {/* Rate slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">
                    Interest / Profit Rate
                  </label>
                  <span className="text-sm font-black text-[#029bba]">
                    {rate}% per annum
                  </span>
                </div>
                <input
                  type="range" min={10} max={20} step={0.5}
                  value={rate}
                  onChange={e => setRate(Number(e.target.value))}
                  aria-label="Annual interest rate"
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#029bba]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>10%</span><span>20%</span>
                </div>
              </div>
            </div>

            {/* RIGHT — Results */}
            <div className="space-y-5">

              {/* EMI card */}
              <div className="bg-gradient-to-br from-[#029bba] to-[#017a94] rounded-2xl p-5 text-white">
                <p className="text-white/70 text-sm font-semibold mb-1">
                  Monthly Payment (EMI)
                </p>
                <p className="text-4xl font-black mb-1">
                  PKR {emi.toLocaleString()}
                </p>
                <p className="text-white/60 text-xs">
                  per month for {tenure} years
                </p>
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-xs mb-1">Total Payable</p>
                    <p className="font-bold text-sm">PKR {formatDetailPrice(totalPayment)}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs mb-1">Total Interest</p>
                    <p className="font-bold text-sm">PKR {formatDetailPrice(totalInterest)}</p>
                  </div>
                </div>
              </div>

              {/* Breakdown bar */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">
                  Payment Breakdown
                </p>
                <div className="h-4 rounded-full overflow-hidden flex mb-3">
                  <div
                    className="bg-[#029bba] h-full transition-all duration-500"
                    style={{ width: `${principalPercent}%` }}
                  />
                  <div
                    className="bg-orange-400 h-full transition-all duration-500"
                    style={{ width: `${interestPercent}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-[#029bba]" />
                  <span className="text-gray-600">Principal ({principalPercent}%)</span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-2">
                  <div className="w-3 h-3 rounded-full bg-orange-400" />
                  <span className="text-gray-600">Interest ({interestPercent}%)</span>
                </div>
              </div>

              {/* Estimate warning */}
              <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-xl p-3">
                ⚠️ Estimate only. Actual rates vary by bank and applicant profile.
              </p>
            </div>
          </div>

          {/* ── Pakistani Bank Options ── */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-base">
                Pakistani Bank Options
              </h3>
              <button
                onClick={() => setShowIslamicOnly(v => !v)}
                aria-pressed={showIslamicOnly}
                aria-label="Show Islamic banks only"
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  showIslamicOnly
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🕌 Islamic Only
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayBanks.map((bank) => {
                const bEmi       = calcEMI(loanAmount, bank.rate, tenure);
                const isSelected = rate === bank.rate;
                return (
                  <button
                    key={bank.name}
                    onClick={() => setRate(bank.rate)}
                    aria-pressed={isSelected}
                    aria-label={`Select ${bank.name} at ${bank.rate}% rate`}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[#029bba] bg-[#029bba]/5 shadow-md'
                        : 'border-gray-200 bg-gray-50 hover:border-[#029bba]/30 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-gray-900 text-sm">{bank.name}</p>
                      <span className="text-[9px] font-bold text-gray-400">{bank.badge}</span>
                    </div>
                    <p className={`text-lg font-black ${isSelected ? 'text-[#029bba]' : 'text-gray-700'}`}>
                      {bank.rate}%
                    </p>
                    <p className="text-xs text-gray-500">
                      EMI: PKR {bEmi.toLocaleString()}/mo
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Total Cost of Ownership (Wave 4 NEW) ── */}
          <TotalCostOwnership propertyPrice={defaultPrice} />
        </div>
      </div>
    </div>
  );
}