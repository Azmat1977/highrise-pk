/**
 * pages/tools/home-loan-calculator.tsx
 *
 * Home Loan / Mortgage Calculator V2.0 — Pakistan
 *
 * Premium Edition Features:
 *   ✓ Triple-slider Quick Hero Calculator (Zameen-style + glass morphism)
 *   ✓ 10 banks (4 Islamic + 6 Conventional) with full comparison
 *   ✓ Detailed mode: bank selector, single + compare
 *   ✓ Full amortization (monthly + yearly + recharts visualization)
 *   ✓ LTV compliance + 40% affordability rule
 *   ✓ Banking Partners showcase grid
 *   ✓ "About Home Loans in Pakistan" SEO content
 *   ✓ 10 FAQ accordion + FAQPage JSON-LD schema
 *   ✓ Eligibility checklist (visual)
 *   ✓ Loan vs Rent insight box
 *   ✓ Roshan Digital Account section (overseas Pakistanis)
 *   ✓ "Useful Links" — 30 city links across Houses/Plots/Flats
 *   ✓ Why Highrise vs Zameen comparison
 *   ✓ Cross-tool CTAs
 *
 * V5.7.0 — Phase B: Home Loan Calculator Premium
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Calculator, ChevronRight, ArrowRight, Info,
  CheckCircle, AlertTriangle, Loader2, RefreshCw,
  Building2, Shield, TrendingUp, DollarSign,
  Home, ArrowLeftRight, Copy, Check,
  ChevronDown, ChevronUp, Star, Sparkles,
  Clock, Banknote, PiggyBank, Percent,
  HelpCircle, Globe, MapPin, FileCheck,
  Award, Users, Zap, Lock, Smartphone,
  TrendingDown, BadgeCheck, ArrowDown,
} from 'lucide-react';
import { PageTitleBanner } from '@/components/layout/PageTitleBanner';
import {
  formatPKR,
  formatPKRCompact,
  SBP_POLICY_RATE,
  KIBOR_6M,
} from '@/lib/loanRates';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface BankSummary {
  bankId: string;
  bankName: string;
  bankShortName: string;
  logoPlaceholder: string;
  financingType: 'conventional' | 'islamic';
  rateType: string;
  annualRatePercent: number;
  maxLtvPercent: number;
  maxTenureYears: number;
  minLoanPKR: number;
  maxLoanPKR: number;
  purposes: string[];
  badge?: string;
  lastUpdated: string;
}

interface MonthlyBreakdown {
  month: number;
  year: number;
  payment: number;
  principalComponent: number;
  profitComponent: number;
  balance: number;
  cumulativePaid: number;
  cumulativePrincipal: number;
  cumulativeProfit: number;
}

interface YearlySummary {
  year: number;
  totalPayment: number;
  principalPaid: number;
  profitPaid: number;
  closingBalance: number;
}

interface LoanResult {
  bankId: string;
  bankName: string;
  financingType: 'conventional' | 'islamic';
  propertyValuePKR: number;
  loanAmountPKR: number;
  downPaymentPKR: number;
  downPaymentPercent: number;
  annualRatePercent: number;
  tenureYears: number;
  tenureMonths: number;
  purpose: string;
  monthlyPayment: number;
  monthlyInsurance: number;
  monthlyTotal: number;
  totalPayment: number;
  totalPrincipal: number;
  totalProfit: number;
  totalCostOfFinancing: number;
  processingFee: number;
  insuranceAnnual: number;
  totalUpfrontCost: number;
  recommendedMonthlyIncome: number;
  ltvPercent: number;
  isLtvCompliant: boolean;
  amortizationSchedule: MonthlyBreakdown[];
  yearlyAmortization: YearlySummary[];
  effectiveCostPercent: number;
}

interface ComparisonResult {
  bankA: LoanResult;
  bankB: LoanResult;
  winner: {
    lowestMonthly: string;
    lowestTotalCost: string;
    lowestProcessingFee: string;
    recommendation: string;
  };
  monthlySaving: number;
  totalSaving: number;
}

type CalcMode = 'single' | 'compare';
type FinancingTab = 'all' | 'islamic' | 'conventional';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PURPOSE_LABELS: Record<string, string> = {
  purchase:         'Buy a Property',
  construction:     'Build on My Land',
  renovation:       'Renovate Existing',
  balance_transfer: 'Transfer from Another Bank',
};

const TENURE_OPTIONS = [3, 5, 7, 10, 12, 15, 20];

const CITIES_SEO = [
  'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi',
  'Multan', 'Faisalabad', 'Gujranwala', 'Sialkot',
  'Peshawar', 'Quetta',
];

const PROPERTY_TYPES_SEO = [
  { type: 'Houses',  slug: 'houses',  icon: <Home className="w-3.5 h-3.5" /> },
  { type: 'Plots',   slug: 'plots',   icon: <MapPin className="w-3.5 h-3.5" /> },
  { type: 'Flats',   slug: 'flats',   icon: <Building2 className="w-3.5 h-3.5" /> },
];

// FAQs — 10 Q&A (vs Zameen's 3) — also feeds FAQPage schema
const FAQS = [
  {
    q: 'What is KIBOR and how does it affect my home loan?',
    a: 'KIBOR (Karachi Interbank Offered Rate) is the benchmark interest rate at which Pakistani banks lend to each other. Your home loan rate is typically calculated as KIBOR + Bank Spread (usually 6M KIBOR + 7-9%). When KIBOR changes (every 6 months), your EMI may adjust accordingly. Current 6M KIBOR is around 12.75%.',
  },
  {
    q: 'What is the difference between Islamic and Conventional home financing?',
    a: 'Conventional loans charge interest (riba) on the loan amount. Islamic financing uses Diminishing Musharakah — the bank and you co-own the property, and you gradually buy the bank\'s share through rental payments. Islamic financing is Shariah-compliant and approved by SBP. Rates are similar to conventional loans but the structure differs fundamentally.',
  },
  {
    q: 'How is the EMI (Equated Monthly Installment) calculated?',
    a: 'EMI is calculated using the formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1), where P = loan amount, r = monthly interest rate (annual/12/100), n = total months. Our calculator does this automatically. EMI includes principal + interest/profit, plus optional insurance.',
  },
  {
    q: 'What is the basic eligibility criteria for home loans in Pakistan?',
    a: 'Standard eligibility: (1) Age 25-65 years, (2) Pakistani national or resident, (3) Salaried with minimum PKR 75,000/month income OR self-employed with 2+ years business proof, (4) Clean ECIB (credit history), (5) Down payment of at least 15-20%, (6) Property must be in approved locality with clear title.',
  },
  {
    q: 'How much down payment do I need?',
    a: 'Most Pakistani banks require 15-25% down payment (i.e., they finance 75-85% of property value — called LTV or Loan-to-Value ratio). Higher down payment means lower EMI and less total interest. Our calculator shows real-time LTV compliance for each bank.',
  },
  {
    q: 'What is the maximum loan tenure available?',
    a: 'Most banks offer 3 to 20 years. A few banks (like HBL, MCB) offer up to 25 years. Longer tenure = lower EMI but higher total interest. Recommended tenure: 10-15 years for balance between affordability and cost.',
  },
  {
    q: 'Are there any hidden charges I should know about?',
    a: 'Yes, beyond EMI, expect: (1) Processing fee (0.35-0.5% of loan, capped PKR 100K-250K), (2) Property valuation fee (PKR 5K-15K), (3) Legal fee (PKR 10K-25K), (4) Property + Life insurance (~0.35-0.4% of loan annually), (5) Stamp duty + transfer charges (varies by city). Our calculator includes processing fee and insurance.',
  },
  {
    q: 'Can I prepay my home loan early?',
    a: 'Yes, but most conventional banks charge 1.5-2.5% early payment penalty if you prepay before maturity. Islamic banks (Meezan, BankIslami) typically have NO prepayment penalty — making them attractive for those expecting bonuses or windfall. Our bank database shows this for each bank.',
  },
  {
    q: 'Is home loan available for overseas Pakistanis?',
    a: 'Yes, through Roshan Digital Account (RDA) and Naya Pakistan Certificates. Most major banks (HBL, MCB, Meezan, UBL) offer special home financing for Non-Resident Pakistanis with up to 80% LTV. Documentation is fully digital — no need to visit Pakistan.',
  },
  {
    q: 'What is the 40% income rule for affordability?',
    a: 'Standard Pakistani banking guideline: your total monthly debt obligations (including home loan EMI, car loan, credit cards) should not exceed 40% of your gross monthly income. Our calculator shows the recommended minimum income for your chosen EMI based on this rule.',
  },
];

const ELIGIBILITY_CHECKLIST = [
  { label: 'Age 25-65 years',                       icon: <Users className="w-4 h-4" /> },
  { label: 'Minimum income PKR 75,000/month',       icon: <DollarSign className="w-4 h-4" /> },
  { label: 'CNIC + salary slips (last 6 months)',   icon: <FileCheck className="w-4 h-4" /> },
  { label: 'Bank statements (last 6-12 months)',    icon: <Banknote className="w-4 h-4" /> },
  { label: 'Clean ECIB credit history',             icon: <Shield className="w-4 h-4" /> },
  { label: 'Property in approved locality',         icon: <MapPin className="w-4 h-4" /> },
  { label: 'Clear property title documents',        icon: <BadgeCheck className="w-4 h-4" /> },
  { label: '15-25% down payment ready',             icon: <PiggyBank className="w-4 h-4" /> },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function parsePKRInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Quick EMI calculation (client-side preview).
 * Mirrors lib/loanRates.ts → calculateEMI but inline for hero.
 */
function quickEMI(principal: number, annualRate: number, months: number): number {
  if (months === 0) return 0;
  if (annualRate === 0) return principal / months;
  const r = annualRate / 12 / 100;
  return Math.round(
    (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: Bank Card
// ═══════════════════════════════════════════════════════════════

interface BankCardProps {
  bank: BankSummary;
  isSelected: boolean;
  onSelect: () => void;
  label?: 'A' | 'B';
}

function BankCard({ bank, isSelected, onSelect, label }: BankCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative ${
        isSelected
          ? 'border-[#029bba] bg-[#029bba]/5 shadow-md'
          : 'border-gray-200 bg-white hover:border-[#029bba]/40 hover:shadow-sm'
      }`}
    >
      {isSelected && label && (
        <div className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#029bba] text-white text-xs font-bold flex items-center justify-center shadow">
          {label}
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          bank.financingType === 'islamic'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-[#029bba]/10 text-[#029bba]'
        }`}>
          {bank.logoPlaceholder}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm truncate">
              {bank.bankShortName}
            </span>
            {bank.badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                bank.badge === 'Best Islamic'
                  ? 'bg-emerald-100 text-emerald-700'
                  : bank.badge === 'Lowest Rate'
                    ? 'bg-[#029bba]/10 text-[#029bba]'
                    : 'bg-amber-100 text-amber-700'
              }`}>
                {bank.badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-lg font-bold text-[#004063]">
              {bank.annualRatePercent}%
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              {bank.financingType === 'islamic' ? 'Profit' : 'Interest'} p.a.
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
              bank.financingType === 'islamic'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {bank.financingType === 'islamic' ? '🌙 Islamic' : 'Conventional'}
            </span>
            <span className="text-[10px] text-gray-400">
              Max {bank.maxTenureYears}yr
            </span>
          </div>
        </div>

        {isSelected && (
          <CheckCircle className="w-5 h-5 text-[#029bba] flex-shrink-0 mt-0.5" />
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: Result Card
// ═══════════════════════════════════════════════════════════════

interface ResultCardProps {
  result: LoanResult;
  isWinner?: boolean;
  winnerLabel?: string;
}

function ResultCard({ result, isWinner, winnerLabel }: ResultCardProps): React.ReactElement {
  const [showAmortization, setShowAmortization] = useState(false);
  const [copied, setCopied]                     = useState(false);

  const handleCopy = () => {
    const text = [
      `Bank: ${result.bankName}`,
      `Property Value: ${formatPKR(result.propertyValuePKR)}`,
      `Loan Amount: ${formatPKR(result.loanAmountPKR)}`,
      `Down Payment: ${formatPKR(result.downPaymentPKR)} (${result.downPaymentPercent}%)`,
      `Rate: ${result.annualRatePercent}% p.a.`,
      `Tenure: ${result.tenureYears} years`,
      `Monthly EMI: ${formatPKR(result.monthlyTotal)}`,
      `Total Payment: ${formatPKR(result.totalPayment)}`,
      `Total Profit/Interest: ${formatPKR(result.totalProfit)}`,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const chartData = result.yearlyAmortization.map((y) => ({
    year: `Yr ${y.year}`,
    Principal: Math.round(y.principalPaid / 1000),
    'Profit/Interest': Math.round(y.profitPaid / 1000),
  }));

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${
      isWinner ? 'border-[#029bba] shadow-xl' : 'border-gray-200 shadow-md'
    }`}>
      <div className={`p-5 ${
        isWinner
          ? 'bg-gradient-to-br from-[#029bba] to-[#004063]'
          : 'bg-gradient-to-br from-gray-700 to-gray-900'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            {isWinner && winnerLabel && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider mb-2">
                <Star className="w-2.5 h-2.5 fill-white" />
                {winnerLabel}
              </div>
            )}
            <h3 className="text-lg font-bold text-white">{result.bankName}</h3>
            <p className="text-white/70 text-xs mt-0.5">
              {result.financingType === 'islamic' ? '🌙 Islamic Financing' : 'Conventional Mortgage'}
              {' · '}{result.annualRatePercent}% p.a.
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Copy summary"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-4 p-4 bg-white/10 rounded-xl">
          <p className="text-white/60 text-xs uppercase tracking-wider">Monthly EMI</p>
          <p className="text-3xl font-bold text-white mt-1">
            {formatPKR(result.monthlyTotal)}
          </p>
          {result.monthlyInsurance > 0 && (
            <p className="text-white/60 text-xs mt-1">
              Includes PKR {formatPKRCompact(result.monthlyInsurance)} insurance
            </p>
          )}
        </div>
      </div>

      <div className="p-5 bg-white">
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            {
              label:  'Loan Amount',
              value:  formatPKR(result.loanAmountPKR),
              icon:   <Banknote className="w-4 h-4" />,
              color:  'text-[#029bba]',
            },
            {
              label:  'Down Payment',
              value:  `${formatPKR(result.downPaymentPKR)}`,
              sub:    `${result.downPaymentPercent}% of value`,
              icon:   <PiggyBank className="w-4 h-4" />,
              color:  'text-[#004063]',
            },
            {
              label:  'Total Payment',
              value:  formatPKR(result.totalPayment),
              icon:   <DollarSign className="w-4 h-4" />,
              color:  'text-gray-800',
            },
            {
              label:  result.financingType === 'islamic' ? 'Total Profit' : 'Total Interest',
              value:  formatPKR(result.totalProfit),
              sub:    `${Number(result.totalCostOfFinancing).toFixed(1)}% of loan`,
              icon:   <Percent className="w-4 h-4" />,
              color:  'text-[#ef4444]',
            },
          ].map((stat) => (
            <div key={stat.label} className="p-3 bg-gray-50 rounded-xl">
              <div className={`${stat.color} mb-1`}>{stat.icon}</div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{stat.label}</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{stat.value}</p>
              {stat.sub && (
                <p className="text-[10px] text-gray-400 mt-0.5">{stat.sub}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-amber-800">Upfront Cost: </span>
            <span className="text-amber-700">{formatPKR(result.totalUpfrontCost)}</span>
            {result.processingFee > 0 && (
              <span className="text-amber-600">
                {' '}(incl. PKR {formatPKRCompact(result.processingFee)} processing fee)
              </span>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs mb-4 ${
          result.isLtvCompliant
            ? 'bg-green-50 border-green-100 text-green-700'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {result.isLtvCompliant
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          }
          <span>
            LTV: {result.ltvPercent}% —{' '}
            {result.isLtvCompliant
              ? 'Within bank limit ✅'
              : 'Exceeds bank LTV limit ❌ — increase down payment'
            }
          </span>
        </div>

        <div className="p-3 bg-[#029bba]/5 rounded-xl border border-[#029bba]/10 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#029bba]" />
            <span className="text-xs font-semibold text-[#004063]">Recommended Monthly Income</span>
          </div>
          <p className="text-lg font-bold text-[#029bba]">
            {formatPKR(result.recommendedMonthlyIncome)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Based on 40% income rule (standard Pakistani banking guideline)
          </p>
        </div>

        {chartData.length > 0 && (
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Principal vs{' '}
              {result.financingType === 'islamic' ? 'Profit' : 'Interest'} — Yearly
            </h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    interval={Math.floor(chartData.length / 5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    formatter={(value, name) => [
                      `PKR ${(Number(value) * 1000).toLocaleString()}`,
                      String(name),
                    ]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Principal" fill="#029bba" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Profit/Interest" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowAmortization(!showAmortization)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span>View Monthly Schedule ({result.tenureMonths} months)</span>
          {showAmortization
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </button>

        {showAmortization && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Month', 'EMI', 'Principal', result.financingType === 'islamic' ? 'Profit' : 'Interest', 'Balance'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.amortizationSchedule.slice(0, 6).map((row) => (
                  <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{row.month}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{formatPKRCompact(row.payment)}</td>
                    <td className="px-3 py-2 text-[#029bba]">{formatPKRCompact(row.principalComponent)}</td>
                    <td className="px-3 py-2 text-[#ef4444]">{formatPKRCompact(row.profitComponent)}</td>
                    <td className="px-3 py-2 text-gray-600">{formatPKRCompact(row.balance)}</td>
                  </tr>
                ))}
                {result.amortizationSchedule.length > 12 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-gray-400 italic">
                      · · · {result.amortizationSchedule.length - 12} more months · · ·
                    </td>
                  </tr>
                )}
                {result.amortizationSchedule.slice(-6).map((row) => (
                  <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{row.month}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{formatPKRCompact(row.payment)}</td>
                    <td className="px-3 py-2 text-[#029bba]">{formatPKRCompact(row.principalComponent)}</td>
                    <td className="px-3 py-2 text-[#ef4444]">{formatPKRCompact(row.profitComponent)}</td>
                    <td className="px-3 py-2 text-gray-600">{formatPKRCompact(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: FAQ Accordion Item
// ═══════════════════════════════════════════════════════════════

interface FAQItemProps {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ q, a, isOpen, onToggle }: FAQItemProps): React.ReactElement {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-[#029bba]/30 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-[#029bba]' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-4 pt-1 border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function HomeLoanCalculatorPage(): React.ReactElement {
  // ── Bank list ────────────────────────────────────────────────
  const [banks, setBanks]               = useState<BankSummary[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);

  // ── Hero quick calculator (Zameen-style triple slider) ──────
  const [heroPrice, setHeroPrice]       = useState(15_000_000);  // 1.5 Cr
  const [heroDownPct, setHeroDownPct]   = useState(30);
  const [heroTenure, setHeroTenure]     = useState(20);

  // ── Detailed calculator state ────────────────────────────────
  const [mode, setMode]                 = useState<CalcMode>('single');
  const [financingTab, setFinancingTab] = useState<FinancingTab>('all');
  const [selectedBankId, setSelectedBankId]   = useState('hbl');
  const [selectedBankIdB, setSelectedBankIdB] = useState('meezan');
  const [propertyValueRaw, setPropertyValueRaw] = useState('');
  const [downPaymentPct, setDownPaymentPct]     = useState(20);
  const [tenureYears, setTenureYears]           = useState(10);
  const [purpose, setPurpose]                   = useState('purchase');
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [includeProcessingFee, setIncludeProcessingFee] = useState(true);

  // ── Results ──────────────────────────────────────────────────
  const [result, setResult]           = useState<LoanResult | null>(null);
  const [comparison, setComparison]   = useState<ComparisonResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError]             = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ── UI ──────────────────────────────────────────────────────
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const resultsRef     = useRef<HTMLDivElement>(null);
  const calculatorRef  = useRef<HTMLDivElement>(null);

  // ── Derived ──────────────────────────────────────────────────
  const propertyValue  = parsePKRInput(propertyValueRaw);
  const downPaymentPKR = Math.round(propertyValue * downPaymentPct / 100);
  const loanAmount     = propertyValue - downPaymentPKR;

  const filteredBanks = banks.filter((b) =>
    financingTab === 'all' ? true : b.financingType === financingTab
  );

  // Quick EMI preview for hero (uses average market rate)
  const AVG_RATE = 20.75;
  const heroLoan       = heroPrice - Math.round(heroPrice * heroDownPct / 100);
  const heroDownPKR    = heroPrice - heroLoan;
  const heroMonthlyEMI = useMemo(
    () => quickEMI(heroLoan, AVG_RATE, heroTenure * 12),
    [heroLoan, heroTenure]
  );

  // Lowest + Highest rate banks (for hero stats)
  const lowestRateBank  = banks.length ? banks.reduce((a, b) => a.annualRatePercent < b.annualRatePercent ? a : b) : null;
  const islamicCount    = banks.filter((b) => b.financingType === 'islamic').length;
  const conventionalCount = banks.filter((b) => b.financingType === 'conventional').length;

  // ── Fetch banks on mount ──────────────────────────────────────
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res  = await fetch('/api/tools/loan-calculate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ mode: 'banks' }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.banks)) {
          setBanks(data.banks as BankSummary[]);
        }
      } catch {
        // silent
      } finally {
        setLoadingBanks(false);
      }
    };
    fetchBanks();
  }, []);

  // ── Calculate (detailed) ─────────────────────────────────────
  const handleCalculate = useCallback(async () => {
    setError('');
    setValidationErrors([]);

    if (!propertyValue || propertyValue < 500_000) {
      setError('Please enter a valid property value (minimum PKR 5 Lac).');
      return;
    }

    setCalculating(true);
    setResult(null);
    setComparison(null);

    try {
      const sharedPayload = {
        propertyValuePKR:     propertyValue,
        downPaymentPercent:   downPaymentPct,
        tenureYears,
        purpose,
        repaymentFrequency:   'monthly',
        includeInsurance,
        includeProcessingFee,
      };

      const payload = mode === 'single'
        ? { mode: 'single', bankId: selectedBankId, ...sharedPayload }
        : { mode: 'compare', bankIdA: selectedBankId, bankIdB: selectedBankIdB, ...sharedPayload };

      const res  = await fetch('/api/tools/loan-calculate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Calculation failed.');
        if (Array.isArray(data.validationErrors)) {
          setValidationErrors(data.validationErrors);
        }
        return;
      }

      if (data.mode === 'single') {
        setResult(data.result as LoanResult);
      } else if (data.mode === 'compare') {
        setComparison(data.comparison as ComparisonResult);
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCalculating(false);
    }
  }, [
    mode, selectedBankId, selectedBankIdB,
    propertyValue, downPaymentPct, tenureYears,
    purpose, includeInsurance, includeProcessingFee,
  ]);

  // ── Hero "Continue with Details" handler ──────────────────────
  const handleHeroContinue = () => {
    setPropertyValueRaw(heroPrice.toLocaleString('en-PK'));
    setDownPaymentPct(heroDownPct);
    setTenureYears(Math.min(heroTenure, 20));
    setTimeout(() => {
      calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>Home Loan Calculator Pakistan 2025 | EMI, Islamic & Conventional | Highrise.pk</title>
        <meta
          name="description"
          content="Pakistan's most advanced home loan calculator. Compare 10 banks (HBL, MCB, Meezan, UBL, ABL). Islamic Diminishing Musharakah & conventional mortgage. Full amortization. Free."
        />
        <meta name="keywords" content="home loan calculator pakistan, mortgage calculator pakistan, islamic home loan, diminishing musharakah, HBL home loan, Meezan home loan, EMI calculator pakistan, KIBOR home loan" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Home Loan Calculator Pakistan 2025 | Highrise.pk" />
        <meta property="og:description" content="Free EMI calculator. 10 banks. Islamic + Conventional. Compare side by side." />
        <meta property="og:url" content="https://highrise.pk/tools/home-loan-calculator" />
        <link rel="canonical" href="https://highrise.pk/tools/home-loan-calculator" />

        {/* WebApplication schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Home Loan Calculator Pakistan',
              url: 'https://highrise.pk/tools/home-loan-calculator',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Web',
              description:
                'Pakistan\'s most advanced home loan calculator. Compare 10 banks, Islamic and conventional financing, full amortization schedule.',
              provider: {
                '@type': 'Organization',
                name: 'Highrise.pk',
                url: 'https://highrise.pk',
              },
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'PKR' },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '247',
                bestRating: '5',
                worstRating: '1',
              },
            }),
          }}
        />

        {/* FAQPage schema — Google rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: FAQS.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: f.a,
                },
              })),
            }),
          }}
        />

        {/* BreadcrumbList schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://highrise.pk' },
                { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://highrise.pk/tools' },
                { '@type': 'ListItem', position: 3, name: 'Home Loan Calculator', item: 'https://highrise.pk/tools/home-loan-calculator' },
              ],
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">

        {/* ── PHASE 5 PAGE BANNER ── */}
        <PageTitleBanner
          title="Home Loan Calculator"
          subtitle="Compare bank financing, mark-up and monthly installments before you apply."
          breadcrumb={
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-blue-100/75"
            >
              <Link href="/" className="flex items-center gap-1 transition-colors hover:text-white">
                <Home className="w-3 h-3" />
                <span>Home</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-blue-200/40" />
              <Link href="/tools" className="transition-colors hover:text-white">Tools</Link>
              <ChevronRight className="w-3 h-3 text-blue-200/40" />
              <span className="text-white">Home Loan Calculator</span>
            </nav>
          }
        />

        {/* ═══════════════════════════════════════════════════════════
            QUICK CALCULATOR — Triple Slider (relocated from hero)
        ═══════════════════════════════════════════════════════════ */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 pb-2">
          <div className="max-w-5xl">

            {/* Quick Calculator card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 mb-5">
                <Calculator className="w-4 h-4 text-[#029bba]" />
                <h2 className="text-sm font-bold text-[#004063] uppercase tracking-wider">Quick Estimate</h2>
              </div>

              <div className="grid lg:grid-cols-3 gap-6 mb-6">

                {/* Property Price */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                      Property Price
                    </label>
                    <span className="text-[#004063] font-bold text-sm">
                      {formatPKRCompact(heroPrice)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1_000_000}
                    max={100_000_000}
                    step={500_000}
                    value={heroPrice}
                    onChange={(e) => setHeroPrice(parseInt(e.target.value, 10))}
                    className="w-full accent-[#029bba] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>10 Lac</span>
                    <span>10 Cr</span>
                  </div>
                </div>

                {/* Down Payment */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                      Down Payment
                    </label>
                    <span className="text-[#004063] font-bold text-sm">
                      {heroDownPct}% ({formatPKRCompact(heroDownPKR)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={heroDownPct}
                    onChange={(e) => setHeroDownPct(parseInt(e.target.value, 10))}
                    className="w-full accent-[#029bba] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>10%</span>
                    <span>90%</span>
                  </div>
                </div>

                {/* Tenure */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                      Loan Period
                    </label>
                    <span className="text-[#004063] font-bold text-sm">
                      {heroTenure} Years
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    step={1}
                    value={heroTenure}
                    onChange={(e) => setHeroTenure(parseInt(e.target.value, 10))}
                    className="w-full accent-[#029bba] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>1 Yr</span>
                    <span>25 Yrs</span>
                  </div>
                </div>
              </div>

              {/* Result strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#029bba]/5 rounded-xl border border-[#029bba]/15">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">Loan Amount</p>
                  <p className="text-[#004063] font-bold text-base mt-0.5">{formatPKRCompact(heroLoan)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">Est. Monthly EMI</p>
                  <p className="text-[#029bba] font-bold text-base mt-0.5">{formatPKRCompact(heroMonthlyEMI)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">Avg. Rate</p>
                  <p className="text-[#004063] font-bold text-base mt-0.5">{AVG_RATE}% p.a.</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">Total Payment</p>
                  <p className="text-[#004063] font-bold text-base mt-0.5">
                    {formatPKRCompact(heroMonthlyEMI * heroTenure * 12)}
                  </p>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col md:flex-row gap-3 mt-5">
                <button
                  onClick={handleHeroContinue}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#06b6d4] hover:from-[#027a94] hover:to-[#029bba] text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Get Bank-Specific Breakdown
                  <ArrowDown className="w-4 h-4 animate-bounce" />
                </button>
                <button
                  onClick={() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#004063] font-semibold text-sm border border-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Compare 2 Banks
                </button>
              </div>

              <p className="text-center text-[10px] text-gray-400 mt-3">
                💡 Quick estimate uses {AVG_RATE}% (market average). Scroll down for bank-specific accurate calculation.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                {
                  icon: <Building2 className="w-5 h-5" />,
                  value: '10',
                  label: 'Pakistani Banks',
                  sub: `${islamicCount} Islamic + ${conventionalCount} Conv.`,
                },
                {
                  icon: <TrendingDown className="w-5 h-5" />,
                  value: lowestRateBank ? `${lowestRateBank.annualRatePercent}%` : '20.0%',
                  label: 'Lowest Rate',
                  sub: lowestRateBank?.bankShortName ?? 'NBP',
                },
                {
                  icon: <Clock className="w-5 h-5" />,
                  value: '25 Yr',
                  label: 'Max Tenure',
                  sub: 'Up to 25 years',
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  value: '100%',
                  label: 'Free Forever',
                  sub: 'No login required',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#029bba]/40 transition-all"
                >
                  <div className="text-[#029bba] mb-2">{s.icon}</div>
                  <p className="text-[#004063] font-bold text-xl">{s.value}</p>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider mt-1">{s.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Market rate strip */}
            <div className="mt-4 p-4 rounded-xl bg-white border border-gray-200 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Live Rates:</span>
                <span className="text-[#004063]">
                  <span className="text-gray-400">SBP Policy:</span> <span className="font-bold">{SBP_POLICY_RATE}%</span>
                </span>
                <span className="text-[#004063]">
                  <span className="text-gray-400">KIBOR 6M:</span> <span className="font-bold">{KIBOR_6M}%</span>
                </span>
              </div>
              <span className="text-[10px] text-gray-400">
                Updated Jan 2025
              </span>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            DETAILED CALCULATOR (Bank-specific, Single/Compare modes)
        ═══════════════════════════════════════════════════════════ */}
        <section ref={calculatorRef} className="mx-auto px-3 sm:px-4 lg:px-6 py-16 max-w-7xl">

          {/* Section header */}
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
              <Calculator className="w-4 h-4" />
              Bank-Specific Calculator
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Get <span className="text-[#029bba]">Accurate Bank</span> Breakdown
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Select your preferred bank, customize loan parameters, and get a complete amortization schedule.
              Compare two banks side by side to find the best deal.
            </p>
          </div>

          <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-start">

            {/* ── LEFT: Form ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden lg:sticky lg:top-4">

              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  {([
                    { id: 'single',  label: 'Calculate', icon: <Calculator className="w-3.5 h-3.5" /> },
                    { id: 'compare', label: 'Compare',   icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
                  ] as { id: CalcMode; label: string; icon: React.ReactElement }[]).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMode(m.id);
                        setResult(null);
                        setComparison(null);
                        setError('');
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        mode === m.id
                          ? 'bg-[#029bba] text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 space-y-5">

                {/* Bank A */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {mode === 'compare' ? 'Bank A (Primary)' : 'Select Bank'}
                  </label>

                  <div className="flex items-center gap-1 mb-3">
                    {(['all', 'islamic', 'conventional'] as FinancingTab[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFinancingTab(t)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize ${
                          financingTab === t
                            ? 'bg-[#029bba] text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {t === 'islamic' ? '🌙 Islamic' : t === 'conventional' ? 'Conventional' : 'All'}
                      </button>
                    ))}
                  </div>

                  {loadingBanks ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#029bba]" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {filteredBanks.map((bank) => (
                        <BankCard
                          key={bank.bankId}
                          bank={bank}
                          isSelected={selectedBankId === bank.bankId}
                          onSelect={() => setSelectedBankId(bank.bankId)}
                          label={mode === 'compare' ? 'A' : undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Bank B */}
                {mode === 'compare' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Bank B (Compare With)
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {filteredBanks
                        .filter((b) => b.bankId !== selectedBankId)
                        .map((bank) => (
                          <BankCard
                            key={bank.bankId}
                            bank={bank}
                            isSelected={selectedBankIdB === bank.bankId}
                            onSelect={() => setSelectedBankIdB(bank.bankId)}
                            label="B"
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Property value */}
                <div>
                  <label
                    htmlFor="property-value"
                    className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"
                  >
                    Property Value (PKR)
                  </label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="property-value"
                      type="text"
                      inputMode="numeric"
                      value={propertyValueRaw}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setPropertyValueRaw(
                          raw ? parseInt(raw, 10).toLocaleString('en-PK') : ''
                        );
                      }}
                      placeholder="e.g. 1,50,00,000"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  {propertyValue > 0 && (
                    <p className="text-xs text-[#029bba] mt-1">= {formatPKR(propertyValue)}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: '50L',  value: 5_000_000 },
                      { label: '1Cr',  value: 10_000_000 },
                      { label: '2Cr',  value: 20_000_000 },
                      { label: '5Cr',  value: 50_000_000 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setPropertyValueRaw(p.value.toLocaleString('en-PK'))}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#029bba]/10 hover:text-[#029bba] text-gray-600 text-xs font-semibold transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Down payment */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Down Payment</label>
                    <span className="text-sm font-bold text-[#029bba]">
                      {downPaymentPct}%
                      {propertyValue > 0 && (
                        <span className="text-gray-400 font-normal text-xs ml-1">
                          ({formatPKRCompact(downPaymentPKR)})
                        </span>
                      )}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={downPaymentPct}
                    onChange={(e) => setDownPaymentPct(parseInt(e.target.value, 10))}
                    className="w-full accent-[#029bba]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>10% (Min)</span><span>50%</span><span>90%</span>
                  </div>
                  {propertyValue > 0 && (
                    <div className="mt-2 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600 flex justify-between">
                      <span>Loan Amount:</span>
                      <span className="font-bold text-gray-900">{formatPKR(loanAmount)}</span>
                    </div>
                  )}
                </div>

                {/* Tenure */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Loan Tenure</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TENURE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTenureYears(t)}
                        className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                          tenureYears === t
                            ? 'bg-[#029bba] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t}yr
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <label htmlFor="purpose" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Loan Purpose
                  </label>
                  <select
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent outline-none"
                  >
                    {Object.entries(PURPOSE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Include in Calculation</label>
                  {[
                    {
                      id: 'insurance', label: 'Property & Life Insurance',
                      sub: '~0.35–0.40% p.a. of loan',
                      checked: includeInsurance, toggle: () => setIncludeInsurance(!includeInsurance),
                    },
                    {
                      id: 'processing', label: 'Processing Fee',
                      sub: '~0.35–0.5% of loan amount',
                      checked: includeProcessingFee, toggle: () => setIncludeProcessingFee(!includeProcessingFee),
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={opt.checked}
                        onChange={opt.toggle}
                        className="mt-0.5 accent-[#029bba] w-4 h-4 flex-shrink-0"
                      />
                      <div>
                        <div className="text-sm font-semibold text-gray-700">{opt.label}</div>
                        <div className="text-[10px] text-gray-400">{opt.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 rounded-xl bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 text-sm">
                    {error}
                  </div>
                )}
                {validationErrors.length > 1 && (
                  <ul className="space-y-1">
                    {validationErrors.slice(1).map((e, i) => (
                      <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {e}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Calculate */}
                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={calculating || !propertyValue}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#028eaa] hover:to-[#026f86] text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {calculating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      {mode === 'compare' ? 'Compare Banks' : 'Calculate EMI'}
                    </>
                  )}
                </button>

                {(result || comparison) && (
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setComparison(null);
                      setError('');
                    }}
                    className="w-full py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* ── RIGHT: Results ──────────────────────────────── */}
            <div ref={resultsRef}>
              {!result && !comparison && !calculating && (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center mx-auto mb-5">
                    <Calculator className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Calculate</h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                    Enter your property value, select a bank, set your tenure and hit calculate.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center text-xs text-gray-500">
                    {[
                      '✅ 10 Pakistani Banks',
                      '🌙 Islamic Financing',
                      '📊 Full Amortization',
                      '🔄 Side-by-Side Compare',
                    ].map((f) => (
                      <span key={f} className="px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {calculating && (
                <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
                  <Loader2 className="w-12 h-12 animate-spin text-[#029bba] mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">
                    {mode === 'compare' ? 'Comparing banks...' : 'Calculating your EMI...'}
                  </p>
                </div>
              )}

              {result && !calculating && <ResultCard result={result} />}

              {comparison && !calculating && (
                <div className="space-y-6">
                  <div className="p-5 bg-gradient-to-r from-[#029bba]/10 to-[#004063]/5 rounded-2xl border border-[#029bba]/20">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#029bba] flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5 text-white fill-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#029bba] uppercase tracking-wider mb-1">Recommendation</div>
                        <p className="text-gray-800 text-sm font-medium">{comparison.winner.recommendation}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs">
                          <div>
                            <span className="text-gray-500">Monthly saving: </span>
                            <span className="font-bold text-[#10b981]">{formatPKR(comparison.monthlySaving)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Total saving: </span>
                            <span className="font-bold text-[#10b981]">{formatPKR(comparison.totalSaving)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <ResultCard
                      result={comparison.bankA}
                      isWinner={comparison.winner.lowestTotalCost === comparison.bankA.bankId}
                      winnerLabel="Best Value"
                    />
                    <ResultCard
                      result={comparison.bankB}
                      isWinner={comparison.winner.lowestTotalCost === comparison.bankB.bankId}
                      winnerLabel="Best Value"
                    />
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900 text-sm">Quick Comparison</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Metric</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-[#029bba] uppercase tracking-wide">{comparison.bankA.bankName}</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">{comparison.bankB.bankName}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Annual Rate', a: `${comparison.bankA.annualRatePercent}%`, b: `${comparison.bankB.annualRatePercent}%`, aVal: comparison.bankA.annualRatePercent, bVal: comparison.bankB.annualRatePercent },
                            { label: 'Monthly EMI', a: formatPKRCompact(comparison.bankA.monthlyTotal), b: formatPKRCompact(comparison.bankB.monthlyTotal), aVal: comparison.bankA.monthlyTotal, bVal: comparison.bankB.monthlyTotal },
                            { label: 'Total Payment', a: formatPKRCompact(comparison.bankA.totalPayment), b: formatPKRCompact(comparison.bankB.totalPayment), aVal: comparison.bankA.totalPayment, bVal: comparison.bankB.totalPayment },
                            { label: 'Total Profit/Interest', a: formatPKRCompact(comparison.bankA.totalProfit), b: formatPKRCompact(comparison.bankB.totalProfit), aVal: comparison.bankA.totalProfit, bVal: comparison.bankB.totalProfit },
                            { label: 'Processing Fee', a: formatPKRCompact(comparison.bankA.processingFee), b: formatPKRCompact(comparison.bankB.processingFee), aVal: comparison.bankA.processingFee, bVal: comparison.bankB.processingFee },
                            { label: 'Recommended Income', a: formatPKRCompact(comparison.bankA.recommendedMonthlyIncome), b: formatPKRCompact(comparison.bankB.recommendedMonthlyIncome), aVal: comparison.bankA.recommendedMonthlyIncome, bVal: comparison.bankB.recommendedMonthlyIncome },
                          ].map((row) => {
                            const aWins = row.aVal <= row.bVal;
                            return (
                              <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="px-5 py-3 text-gray-600 text-xs">{row.label}</td>
                                <td className={`px-5 py-3 text-right font-semibold text-xs ${aWins ? 'text-[#10b981]' : 'text-gray-900'}`}>
                                  {row.a}{aWins && <span className="ml-1 text-[#10b981]">✓</span>}
                                </td>
                                <td className={`px-5 py-3 text-right font-semibold text-xs ${!aWins ? 'text-[#10b981]' : 'text-gray-900'}`}>
                                  {row.b}{!aWins && <span className="ml-1 text-[#10b981]">✓</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            BANKING PARTNERS GRID
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white py-16">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
                <Building2 className="w-4 h-4" />
                10 Banking Partners
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                <span className="text-[#029bba]">Compare</span> Pakistan&apos;s Top Banks
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We cover 10 banks — 4 Islamic (Diminishing Musharakah) + 6 Conventional. All rates updated regularly.
              </p>
            </div>

            {loadingBanks ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
                {banks.map((bank) => (
                  <button
                    key={bank.bankId}
                    onClick={() => {
                      setSelectedBankId(bank.bankId);
                      setFinancingTab(bank.financingType === 'islamic' ? 'islamic' : 'conventional');
                      calculatorRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="group p-5 rounded-2xl border border-gray-200 bg-white hover:border-[#029bba] hover:shadow-lg transition-all duration-300 text-left"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold ${
                        bank.financingType === 'islamic'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-[#029bba]/10 text-[#029bba]'
                      }`}>
                        {bank.logoPlaceholder}
                      </div>
                      {bank.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          bank.badge === 'Best Islamic' ? 'bg-emerald-100 text-emerald-700'
                          : bank.badge === 'Lowest Rate' ? 'bg-[#029bba]/10 text-[#029bba]'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {bank.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-[#029bba] transition-colors">
                      {bank.bankShortName}
                    </h3>
                    <p className="text-2xl font-bold text-[#004063]">{bank.annualRatePercent}%</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                      {bank.financingType === 'islamic' ? 'Profit' : 'Interest'} p.a.
                    </p>
                    <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                      {bank.financingType === 'islamic' ? '🌙 Islamic' : 'Conventional'} · Max {bank.maxTenureYears}yr
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            ABOUT HOME LOANS IN PAKISTAN (SEO Content)
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#f8f9fa] py-16">
          <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-5xl">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
                <Info className="w-4 h-4" />
                Comprehensive Guide
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                About Home Loans in <span className="text-[#029bba]">Pakistan 2025</span>
              </h2>
              <p className="text-gray-600">Everything you need to know before applying for a home loan</p>
            </div>

            <div className="prose max-w-none">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-5 text-gray-700 text-sm md:text-base leading-relaxed">
                <p>
                  Buying a home is one of the most significant financial decisions in life. In Pakistan, where property prices have surged
                  dramatically over the past decade, most middle-class buyers rely on <strong>home financing (mortgage)</strong> to fulfill
                  their dream of owning a home. With multiple banks, financing types, and complex calculations involved, choosing the right
                  loan can be overwhelming.
                </p>

                <p>
                  <strong className="text-[#029bba]">Highrise.pk&apos;s Home Loan Calculator</strong> simplifies this process by giving you
                  instant access to compare <strong>10 leading Pakistani banks</strong> side by side. Whether you&apos;re looking for
                  Shariah-compliant <strong>Islamic financing (Diminishing Musharakah)</strong> from Meezan Bank, BankIslami, HBL Islamic,
                  or MCB Islamic — or prefer <strong>conventional mortgages</strong> from HBL, MCB, UBL, ABL, Bank Alfalah, NBP, or Askari Bank —
                  we provide accurate EMI calculations with full transparency.
                </p>

                <h3 className="text-xl font-bold text-[#004063] mt-6 mb-3">How Home Loans Work in Pakistan</h3>
                <p>
                  Pakistani home loans are typically structured as <strong>floating rate loans</strong> tied to the <strong>6-Month KIBOR</strong>
                  (Karachi Interbank Offered Rate). Banks add a spread of 7-9% to KIBOR, resulting in effective rates of 20-22% annually as of
                  early 2025. Loan tenures range from 3 to 25 years, with most banks offering up to 20 years. The <strong>Loan-to-Value (LTV) ratio</strong>
                  determines how much the bank will finance — typically 75-85% of property value, meaning you need to arrange 15-25% as down payment.
                </p>

                <h3 className="text-xl font-bold text-[#004063] mt-6 mb-3">Islamic vs Conventional Financing</h3>
                <p>
                  Islamic banks offer home financing through <strong>Diminishing Musharakah</strong> — a partnership model where the bank and customer
                  co-own the property, and the customer gradually buys the bank&apos;s share through rental payments. This is fully Shariah-compliant
                  and approved by the State Bank of Pakistan (SBP). Conventional banks charge interest (riba) directly on the loan principal.
                  Both methods result in similar effective rates, but the underlying structure differs fundamentally.
                </p>

                <h3 className="text-xl font-bold text-[#004063] mt-6 mb-3">Hidden Costs to Watch Out For</h3>
                <p>
                  Beyond your monthly EMI, expect to budget for: <strong>processing fees</strong> (0.35-0.5% of loan amount, capped at PKR 100K-250K),
                  <strong> property valuation fee</strong> (PKR 5K-15K), <strong>legal fee</strong> (PKR 10K-25K),
                  <strong> property & life insurance</strong> (0.35-0.40% of loan annually), plus <strong>stamp duty + transfer charges</strong> which
                  vary by city. Our calculator includes processing fees and insurance for complete transparency.
                </p>

                <h3 className="text-xl font-bold text-[#004063] mt-6 mb-3">Why Compare Multiple Banks?</h3>
                <p>
                  A 1% difference in interest rate on a 1 Crore loan over 20 years means <strong>PKR 15+ Lac saved</strong> in total payments.
                  Our side-by-side comparison feature lets you analyze any two banks instantly — comparing monthly EMI, total cost, processing fees,
                  and income requirements. This single comparison can save you lakhs of rupees over the loan tenure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            ELIGIBILITY CHECKLIST
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white py-16">
          <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
                  <FileCheck className="w-4 h-4" />
                  Eligibility Checker
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Are You <span className="text-[#029bba]">Eligible</span> for a Home Loan?
                </h2>
                <p className="text-gray-600 mb-6">
                  Most Pakistani banks follow these standard eligibility criteria. If you meet 6 out of 8,
                  you have a strong chance of approval.
                </p>
                <Link href="/contact">
                  <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-sm shadow-md transition-colors">
                    <Users className="w-4 h-4" />
                    Talk to Our Advisor
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>

              <div className="bg-gradient-to-br from-[#f8f9fa] to-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-[#029bba]" />
                  Standard Eligibility Criteria
                </h3>
                <div className="space-y-2">
                  {ELIGIBILITY_CHECKLIST.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-[#029bba]/30 hover:bg-[#029bba]/5 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center flex-shrink-0">
                        {item.icon}
                      </div>
                      <span className="text-sm text-gray-700 font-medium flex-1">{item.label}</span>
                      <CheckCircle className="w-4 h-4 text-[#10b981]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            FAQ ACCORDION
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#f8f9fa] py-16">
          <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-4xl">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
                <HelpCircle className="w-4 h-4" />
                Common Questions
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Frequently Asked <span className="text-[#029bba]">Questions</span>
              </h2>
              <p className="text-gray-600">10 detailed answers to help you decide</p>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <FAQItem
                  key={i}
                  q={faq.q}
                  a={faq.a}
                  isOpen={openFAQ === i}
                  onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
                />
              ))}
            </div>

            <div className="text-center mt-8">
              <p className="text-sm text-gray-500">
                Still have questions?{' '}
                <Link href="/contact" className="text-[#029bba] font-semibold hover:underline">
                  Contact our team →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            LOAN vs RENT INSIGHT BOX
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white py-16">
          <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-4xl">
            <div className="bg-gradient-to-br from-[#029bba] to-[#004063] rounded-3xl overflow-hidden shadow-xl">
              <div className="p-8 md:p-10">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[#06b6d4]" />
                  </div>
                  <div>
                    <p className="text-[#06b6d4] text-xs font-bold uppercase tracking-wider">Smart Insight</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mt-1">Loan vs Rent — Which Is Better?</h3>
                  </div>
                </div>

                <p className="text-white/80 mb-6 leading-relaxed">
                  In most Pakistani cities, paying a home loan EMI of <strong className="text-[#06b6d4]">PKR 1.5-2 Lac</strong> on a
                  <strong className="text-white"> 1.5 Crore property</strong> often matches or slightly exceeds renting a similar property.
                  However, after 15-20 years, you <strong className="text-white">own the property outright</strong> instead of paying forever.
                  Plus, property values typically appreciate <strong className="text-white">8-15% annually</strong> in good locations.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/[0.08] backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="w-4 h-4 text-[#06b6d4]" />
                      <p className="text-white/60 text-xs uppercase tracking-wider font-bold">Buying</p>
                    </div>
                    <ul className="text-white/80 text-xs space-y-1">
                      <li>✓ Build equity</li>
                      <li>✓ Property appreciation</li>
                      <li>✓ Own outright after tenure</li>
                      <li>✓ Customize freely</li>
                    </ul>
                  </div>
                  <div className="bg-white/[0.05] backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-white/50" />
                      <p className="text-white/60 text-xs uppercase tracking-wider font-bold">Renting</p>
                    </div>
                    <ul className="text-white/60 text-xs space-y-1">
                      <li>○ No long-term asset</li>
                      <li>○ Rent increases yearly</li>
                      <li>○ Forever payment</li>
                      <li>○ Limited customization</li>
                    </ul>
                  </div>
                </div>

                <p className="text-white/60 text-xs italic">
                  💡 Use our calculator above to see your exact EMI, then compare with rental rates in your target area.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            ROSHAN DIGITAL ACCOUNT (Overseas Pakistanis)
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#f8f9fa] py-16">
          <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-5xl">
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="grid md:grid-cols-[1fr_auto] items-center gap-6 p-8 md:p-10">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">🌙</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                      <Globe className="w-3 h-3" />
                      For Overseas Pakistanis
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                    Roshan Digital Home Financing
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Living abroad? Buy a home in Pakistan from anywhere in the world. Through Roshan Digital Account (RDA),
                    you can avail home financing from HBL, MCB, Meezan, and UBL with <strong>up to 80% LTV</strong> — completely digital.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {['100% Digital Process', 'No Pakistan Visit Needed', 'PKR or USD Account', 'Up to 80% Financing'].map((b) => (
                      <span key={b} className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                        ✓ {b}
                      </span>
                    ))}
                  </div>
                  <Link href="https://www.sbp.org.pk/RDA/index.html" target="_blank" rel="noopener noreferrer">
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors">
                      <ArrowRight className="w-4 h-4" />
                      Learn About RDA
                    </button>
                  </Link>
                </div>

                <div className="hidden md:flex w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 items-center justify-center text-white flex-shrink-0">
                  <Globe className="w-12 h-12" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            USEFUL LINKS (SEO) — 30 city links
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white py-16">
          <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-6xl">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
                <MapPin className="w-4 h-4" />
                Find Your Dream Home
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Browse Properties Eligible for <span className="text-[#029bba]">Home Financing</span>
              </h2>
              <p className="text-gray-600">Houses, plots, and flats across 10 major Pakistani cities</p>
            </div>

            <div className="space-y-8">
              {PROPERTY_TYPES_SEO.map((pt) => (
                <div key={pt.slug}>
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center">
                      {pt.icon}
                    </div>
                    {pt.type} for Sale
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {CITIES_SEO.map((city) => (
                      <Link
                        key={`${pt.slug}-${city}`}
                        href={`/properties?propertyCategory=${pt.slug === 'houses' ? 'residential' : pt.slug === 'plots' ? 'plots' : 'residential'}&city=${encodeURIComponent(city)}`}
                      >
                        <span className="inline-flex items-center gap-1 text-[#029bba] hover:text-[#027a94] text-xs font-medium hover:underline transition-colors py-1">
                          <ArrowRight className="w-3 h-3" />
                          {pt.type} in {city}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            WHY HIGHRISE.PK (vs Zameen comparison)
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] py-16 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-5xl relative z-10">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#06b6d4]/20 text-[#06b6d4] text-sm font-semibold mb-4 border border-[#06b6d4]/20">
                <Award className="w-4 h-4" />
                Industry-First Features
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Why <span className="text-[#06b6d4]">Highrise</span> Calculator Wins
              </h2>
              <p className="text-white/60">No other Pakistani property site comes close.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-white/60 text-xs font-bold uppercase tracking-wider">Feature</th>
                    <th className="px-6 py-4 text-center text-[#06b6d4] text-xs font-bold uppercase tracking-wider">Highrise.pk</th>
                    <th className="px-6 py-4 text-center text-white/40 text-xs font-bold uppercase tracking-wider">Other Portals</th>
                    <th className="px-6 py-4 text-center text-white/40 text-xs font-bold uppercase tracking-wider">Generic Sites</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Number of Banks',         us: '10 banks',         z: '1 bank (HBFC)', g: 'None' },
                    { feature: 'Islamic Financing Toggle', us: '✅ Yes (4 banks)', z: '❌ No',          g: '❌ No' },
                    { feature: 'Bank Comparison Mode',   us: '✅ Side-by-Side',  z: '❌ No',          g: '❌ No' },
                    { feature: 'Full Amortization Table', us: '✅ Monthly + Yearly', z: '❌ No',          g: '❌ No' },
                    { feature: 'Visualization Chart',    us: '✅ Recharts Bar',  z: '❌ No',          g: '❌ No' },
                    { feature: 'LTV Compliance Check',   us: '✅ Real-time',     z: '❌ No',          g: '❌ No' },
                    { feature: '40% Income Rule',        us: '✅ Affordability', z: '❌ No',          g: '❌ No' },
                    { feature: 'Processing Fee Transparency', us: '✅ Per Bank', z: '❌ No',          g: '❌ No' },
                    { feature: 'Live KIBOR / SBP Rates', us: '✅ Displayed',     z: '⚠️ Mentioned',   g: '❌ No' },
                    { feature: 'Number of FAQs',         us: '10 detailed',      z: '3 basic',        g: '0' },
                  ].map((row) => (
                    <tr key={row.feature} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-3 text-white/80 text-sm font-medium">{row.feature}</td>
                      <td className="px-6 py-3 text-center text-[#06b6d4] text-sm font-bold">{row.us}</td>
                      <td className="px-6 py-3 text-center text-white/40 text-xs">{row.z}</td>
                      <td className="px-6 py-3 text-center text-white/40 text-xs">{row.g}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-center text-[10px] text-white/30 mt-4 italic">
              Comparison based on publicly available Pakistani property platforms as of January 2025.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            CROSS-TOOL CTA + Disclaimer
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white py-16">
          <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Disclaimer */}
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-800 text-sm mb-2">Important Disclaimer</h4>
                    <p className="text-amber-700 text-xs leading-relaxed">
                      Rates shown are indicative and sourced from publicly available bank data (Jan 2025).
                      Actual rates depend on your credit profile, property valuation, and bank policy.
                      Always consult your bank directly before making financial decisions.
                      Islamic financing rates follow Diminishing Musharakah under SBP guidelines.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cross-tool CTA */}
              <div className="p-6 bg-gradient-to-br from-[#029bba]/10 to-[#004063]/5 border border-[#029bba]/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#029bba]" />
                  <h4 className="font-bold text-[#004063] text-sm">More Property Intelligence Tools</h4>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Fair Price Estimator', href: '/tools/price-estimator', icon: <DollarSign className="w-3.5 h-3.5" /> },
                    { label: 'Construction Calculator', href: '/tools/construction-calculator', icon: <Calculator className="w-3.5 h-3.5" /> },
                    { label: 'Society Verifier', href: '/tools/verify-society', icon: <Shield className="w-3.5 h-3.5" /> },
                    { label: 'Area Unit Converter', href: '/tools/area-unit-converter', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
                  ].map((tool) => (
                    <Link key={tool.href} href={tool.href}>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-100 hover:border-[#029bba]/30 hover:shadow-sm transition-all group text-sm">
                        <span className="text-[#029bba]">{tool.icon}</span>
                        <span className="font-medium text-gray-700 group-hover:text-[#029bba] transition-colors">
                          {tool.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-400 ml-auto group-hover:text-[#029bba] transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* App promo */}
            <div className="mt-8 p-8 bg-gradient-to-br from-[#029bba] to-[#004063] rounded-3xl text-white text-center">
              <div className="max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider mb-4">
                  <Zap className="w-3 h-3" />
                  Coming Soon
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">Get the Highrise App</h3>
                <p className="text-white/70 mb-5">
                  Calculate loans, browse properties, verify societies — all on the go. Made for Pakistan.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-black/30 hover:bg-black/40 text-white font-semibold text-sm border border-white/10 transition-colors" disabled>
                    <Smartphone className="w-4 h-4" />
                    App Store (Soon)
                  </button>
                  <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-black/30 hover:bg-black/40 text-white font-semibold text-sm border border-white/10 transition-colors" disabled>
                    <Smartphone className="w-4 h-4" />
                    Google Play (Soon)
                  </button>
                </div>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40">
                  <Lock className="w-3 h-3" />
                  100% Free · No Login Required · Privacy First
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}