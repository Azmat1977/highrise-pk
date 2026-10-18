/**
 * lib/loanRates.ts
 *
 * Pakistani Home Loan / Mortgage Rate Database
 *
 * Sources (2026 — admin can override via future DB integration):
 *   - State Bank of Pakistan (SBP) policy rate: 16.5%
 *   - 6M KIBOR: 16.25%
 *   - Individual bank advertised rates (2026)
 *   - Meezan Bank Diminishing Musharakah rates
 *   - HBL, MCB, UBL, ABL, Bank Alfalah, NBP, Askari conventional rates
 *   - Wazir-e-Azam Apna Ghar Program (Govt subsidized)
 *
 * Supports:
 *   - Conventional (interest-based) financing
 *   - Islamic (Diminishing Musharakah) financing
 *   - Variable rate (KIBOR + spread)
 *   - Fixed rate periods
 *
 * V5.8.0 — 2026 Rate Update
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type FinancingType = 'conventional' | 'islamic';
export type RateType = 'fixed' | 'variable';
export type LoanPurpose =
  | 'purchase'       // Buy a property
  | 'construction'   // Build on owned land
  | 'renovation'     // Improve existing property
  | 'balance_transfer'; // Transfer from another bank

export type RepaymentFrequency = 'monthly' | 'quarterly';

export interface BankRate {
  bankId: string;
  bankName: string;
  bankShortName: string;
  logoPlaceholder: string;    // Icon letter(s) for UI
  financingType: FinancingType;
  rateType: RateType;

  // Rate details
  annualRatePercent: number;  // Effective annual rate
  kibor6Month?: number;       // Current KIBOR 6M (for variable display)
  kibor12Month?: number;      // Current KIBOR 12M (for 1Y KIBOR products)
  spreadPercent?: number;     // Bank spread over KIBOR

  // Loan parameters
  minLoanPKR: number;
  maxLoanPKR: number;
  minTenureYears: number;
  maxTenureYears: number;
  minPropertyValuePKR: number;

  // LTV (Loan to Value) ratio
  maxLtvPercent: number;      // Max % of property value financed

  // Fees
  processingFeePercent: number;  // % of loan amount
  processingFeeMin: number;      // PKR minimum
  processingFeeMax: number;      // PKR maximum (0 = no cap)
  insuranceRatePercent: number;  // Annual property + life insurance

  // Features
  purposes: LoanPurpose[];
  hasEarlyPaymentPenalty: boolean;
  earlyPaymentPenaltyPercent: number;
  gracePeriodMonths: number;
  minPropertyAgeDays: number;   // Min age of property title

  // Display
  badge?: string;               // "Most Popular" | "Lowest Rate" | "Best Islamic" | "Govt Subsidized"
  isActive: boolean;
  lastUpdated: string;          // ISO date — shown to user for transparency
  disclaimer: string;
}

export interface LoanCalculationInput {
  bankId: string;
  propertyValuePKR: number;
  downPaymentPercent: number;     // % of property value
  tenureYears: number;
  purpose: LoanPurpose;
  repaymentFrequency: RepaymentFrequency;
  includeInsurance: boolean;
  includeProcessingFee: boolean;
}

export interface MonthlyBreakdown {
  month: number;
  year: number;
  payment: number;             // Total payment this period
  principalComponent: number; // Principal paid
  profitComponent: number;    // Interest/profit paid
  balance: number;            // Remaining balance
  cumulativePaid: number;     // Total paid so far
  cumulativePrincipal: number;
  cumulativeProfit: number;
}

export interface LoanCalculationResult {
  // Input echo
  bankId: string;
  bankName: string;
  financingType: FinancingType;
  propertyValuePKR: number;
  loanAmountPKR: number;
  downPaymentPKR: number;
  downPaymentPercent: number;
  annualRatePercent: number;
  tenureYears: number;
  tenureMonths: number;
  purpose: LoanPurpose;

  // Monthly payment
  monthlyPayment: number;
  monthlyInsurance: number;
  monthlyTotal: number;        // Payment + insurance

  // Total cost summary
  totalPayment: number;        // Sum of all payments
  totalPrincipal: number;      // = loanAmount
  totalProfit: number;         // Total interest/profit paid
  totalCostOfFinancing: number; // profit / loanAmount * 100

  // One-time fees
  processingFee: number;
  insuranceAnnual: number;
  totalUpfrontCost: number;    // downPayment + processingFee + first insurance

  // Affordability metrics
  recommendedMonthlyIncome: number;  // monthlyTotal / 0.40 (40% rule)
  ltvPercent: number;
  isLtvCompliant: boolean;

  // Amortization (first 12 months + last 12 months + yearly summary)
  amortizationSchedule: MonthlyBreakdown[];  // Full schedule (capped at 360)
  yearlyAmortization: YearlySummary[];

  // Comparison helpers
  effectiveCostPercent: number;  // True cost including fees
}

export interface YearlySummary {
  year: number;
  totalPayment: number;
  principalPaid: number;
  profitPaid: number;
  closingBalance: number;
}

export interface ComparisonResult {
  bankA: LoanCalculationResult;
  bankB: LoanCalculationResult;
  winner: {
    lowestMonthly: string;      // bankId
    lowestTotalCost: string;    // bankId
    lowestProcessingFee: string;
    recommendation: string;     // Human-readable recommendation
  };
  monthlySaving: number;        // |bankA.monthly - bankB.monthly|
  totalSaving: number;          // |bankA.total - bankB.total|
}

// ═══════════════════════════════════════════════════════════════
// SBP POLICY RATE & KIBOR (Updated Jan 2026)
// ═══════════════════════════════════════════════════════════════

export const SBP_POLICY_RATE = 16.5;    // % as of Jan 2026
export const KIBOR_6M = 16.25;          // 6-month KIBOR
export const KIBOR_12M = 16.5;          // 12-month KIBOR

// ═══════════════════════════════════════════════════════════════
// BANK DATABASE — 2026 Rates
// ═══════════════════════════════════════════════════════════════

export const BANKS: BankRate[] = [
  // ── ISLAMIC BANKS ──────────────────────────────────────────

  {
    bankId: 'meezan',
    bankName: 'Meezan Bank',
    bankShortName: 'Meezan',
    logoPlaceholder: 'MB',
    financingType: 'islamic',
    rateType: 'variable',
    annualRatePercent: 22.5,           // KIBOR 12M (16.5%) + 6% spread ≈ 22.5%
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 6.0,
    minLoanPKR: 500_000,
    maxLoanPKR: 100_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 85,
    processingFeePercent: 0.5,
    processingFeeMin: 10_000,
    processingFeeMax: 200_000,
    insuranceRatePercent: 0.35,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: false,
    earlyPaymentPenaltyPercent: 0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    badge: 'Best Islamic',
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Diminishing Musharakah — Shariah compliant. Rate linked to 12M KIBOR + 3.0% (salaried) / +4.0% (self-employed). Floor 8%, Cap 30%.',
  },

  {
    bankId: 'hbl_islamic',
    bankName: 'HBL Islamic Banking',
    bankShortName: 'HBL Islamic',
    logoPlaceholder: 'HI',
    financingType: 'islamic',
    rateType: 'variable',
    annualRatePercent: 22.7,           // KIBOR 12M (16.5%) + 6.2% spread
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 6.2,
    minLoanPKR: 500_000,
    maxLoanPKR: 75_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 80,
    processingFeePercent: 0.5,
    processingFeeMin: 15_000,
    processingFeeMax: 150_000,
    insuranceRatePercent: 0.40,
    purposes: ['purchase', 'construction', 'renovation'],
    hasEarlyPaymentPenalty: false,
    earlyPaymentPenaltyPercent: 0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Islamic financing under Diminishing Musharakah. Salaried: 1Y KIBOR + 3.2% (new), +3.0% (existing). Self-employed: +4.2% (new), +4.0% (existing). Subject to SBP guidelines.',
  },

  {
    bankId: 'mcb_islamic',
    bankName: 'MCB Islamic Banking',
    bankShortName: 'MCB Islamic',
    logoPlaceholder: 'MI',
    financingType: 'islamic',
    rateType: 'variable',
    annualRatePercent: 23.0,           // KIBOR 12M + 6.5%
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 6.5,
    minLoanPKR: 500_000,
    maxLoanPKR: 50_000_000,
    minTenureYears: 3,
    maxTenureYears: 15,
    minPropertyValuePKR: 1_500_000,
    maxLtvPercent: 75,
    processingFeePercent: 0.5,
    processingFeeMin: 10_000,
    processingFeeMax: 100_000,
    insuranceRatePercent: 0.40,
    purposes: ['purchase', 'construction'],
    hasEarlyPaymentPenalty: false,
    earlyPaymentPenaltyPercent: 0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Shariah compliant home financing. Rate subject to periodic revision. Spread varies by equity % (2.5-3.5% over 1Y KIBOR for conventional equivalent).',
  },

  {
    bankId: 'bank_islami',
    bankName: 'BankIslami Pakistan',
    bankShortName: 'BankIslami',
    logoPlaceholder: 'BI',
    financingType: 'islamic',
    rateType: 'variable',
    annualRatePercent: 22.75,          // KIBOR 12M + 6.25%
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 6.25,
    minLoanPKR: 300_000,
    maxLoanPKR: 50_000_000,
    minTenureYears: 2,
    maxTenureYears: 20,
    minPropertyValuePKR: 800_000,
    maxLtvPercent: 80,
    processingFeePercent: 0.5,
    processingFeeMin: 8_000,
    processingFeeMax: 120_000,
    insuranceRatePercent: 0.38,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: false,
    earlyPaymentPenaltyPercent: 0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Diminishing Musharakah home finance. Fully Shariah-compliant. Rate linked to 12M KIBOR + spread.',
  },

  // ── CONVENTIONAL BANKS ─────────────────────────────────────

  {
    bankId: 'hbl',
    bankName: 'Habib Bank Limited',
    bankShortName: 'HBL',
    logoPlaceholder: 'HB',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 23.0,           // 1Y KIBOR (16.5%) + 6.5%
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 6.5,
    minLoanPKR: 500_000,
    maxLoanPKR: 100_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 85,
    processingFeePercent: 0.5,
    processingFeeMin: 10_000,
    processingFeeMax: 200_000,
    insuranceRatePercent: 0.35,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 2.0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    badge: 'Highest Limit',
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Rate: 1-Year KIBOR + 3.50%. Variable rate revised annually. Subject to credit assessment and SBP prudential regulations.',
  },

  {
    bankId: 'mcb',
    bankName: 'MCB Bank',
    bankShortName: 'MCB',
    logoPlaceholder: 'MC',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 21.5,           // 6M KIBOR (16.25%) + 5.25% (best tier with ≥50% equity)
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 5.25,
    minLoanPKR: 500_000,
    maxLoanPKR: 100_000_000,
    minTenureYears: 3,
    maxTenureYears: 25,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 85,
    processingFeePercent: 0.4,
    processingFeeMin: 8_000,
    processingFeeMax: 150_000,
    insuranceRatePercent: 0.35,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 1.5,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    badge: 'Lowest Spread',
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Rate: 6M KIBOR + 2.00% to 3.00% (salaried, depends on equity ≥50%). Self-employed: 6M KIBOR + 2.50% to 3.50%. Subject to credit assessment.',
  },

  {
    bankId: 'ubl',
    bankName: 'United Bank Limited',
    bankShortName: 'UBL',
    logoPlaceholder: 'UB',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 23.5,           // 1Y KIBOR + 7.0%
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 7.0,
    minLoanPKR: 500_000,
    maxLoanPKR: 100_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 85,
    processingFeePercent: 0.5,
    processingFeeMin: 10_000,
    processingFeeMax: 200_000,
    insuranceRatePercent: 0.38,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 2.0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Rate: 1-Year KIBOR + 3.50%. Loans up to PKR 100M. Annual rate revision. Subject to approval.',
  },

  {
    bankId: 'abl',
    bankName: 'Allied Bank Limited',
    bankShortName: 'ABL',
    logoPlaceholder: 'AB',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 22.0,           // 1Y KIBOR + 5.5% (mid-range)
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 5.5,
    minLoanPKR: 1_500_000,
    maxLoanPKR: 75_000_000,
    minTenureYears: 3,
    maxTenureYears: 25,
    minPropertyValuePKR: 1_500_000,
    maxLtvPercent: 80,
    processingFeePercent: 0.5,
    processingFeeMin: 7_500,
    processingFeeMax: 125_000,
    insuranceRatePercent: 0.35,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 1.5,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Rate: 1-Year KIBOR + 1.75% to 5.00% (varies by profile). Financed amounts PKR 1.5M–75M. Up to 25-year tenure.',
  },

  {
    bankId: 'bank_alfalah',
    bankName: 'Bank Alfalah',
    bankShortName: 'Alfalah',
    logoPlaceholder: 'BA',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 22.75,          // 1Y KIBOR + 6.25%
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 6.25,
    minLoanPKR: 500_000,
    maxLoanPKR: 75_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 85,
    processingFeePercent: 0.5,
    processingFeeMin: 12_000,
    processingFeeMax: 180_000,
    insuranceRatePercent: 0.38,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 2.0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Rate: 1-Year KIBOR + 3.00% (salaried), +4.00% (self-employed/NRP). Home finance subject to approval. Variable rate revised annually.',
  },

  {
    bankId: 'nbc',
    bankName: 'National Bank of Pakistan',
    bankShortName: 'NBP',
    logoPlaceholder: 'NB',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 22.0,           // 1Y KIBOR + 5.5%
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 5.5,
    minLoanPKR: 300_000,
    maxLoanPKR: 100_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 700_000,
    maxLtvPercent: 85,
    processingFeePercent: 0.35,
    processingFeeMin: 5_000,
    processingFeeMax: 100_000,
    insuranceRatePercent: 0.35,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: false,
    earlyPaymentPenaltyPercent: 0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    badge: 'Govt Bank / No Penalty',
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Government bank. Rate: 1-Year KIBOR + 3.00%. Subject to SBP housing finance prudential regulations.',
  },

  {
    bankId: 'askari',
    bankName: 'Askari Bank',
    bankShortName: 'Askari',
    logoPlaceholder: 'AK',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 23.0,           // 1Y KIBOR + 6.5%
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 6.5,
    minLoanPKR: 500_000,
    maxLoanPKR: 50_000_000,
    minTenureYears: 3,
    maxTenureYears: 15,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 80,
    processingFeePercent: 0.5,
    processingFeeMin: 10_000,
    processingFeeMax: 150_000,
    insuranceRatePercent: 0.40,
    purposes: ['purchase', 'construction'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 2.0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Askari Home Finance. Subject to credit assessment and approval. Rate: 1-Year KIBOR + spread.',
  },

  {
    bankId: 'bank_al_habib',
    bankName: 'Bank AL Habib',
    bankShortName: 'AL Habib',
    logoPlaceholder: 'AH',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 22.5,           // 1Y KIBOR + 6.0% (fixed spread)
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 6.0,
    minLoanPKR: 500_000,
    maxLoanPKR: 75_000_000,
    minTenureYears: 1,
    maxTenureYears: 25,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 85,
    processingFeePercent: 0.5,
    processingFeeMin: 10_000,
    processingFeeMax: 150_000,
    insuranceRatePercent: 0.35,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 1.5,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    badge: 'Fixed Spread',
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'Rate: 1-Year KIBOR + Fixed Spread (remains fixed through full tenure 1-25 years). Subject to credit approval.',
  },

  // ── GOVERNMENT SUBSIDIZED PROGRAM ──────────────────────────

  {
    bankId: 'wazir_e_azam_apna_ghar',
    bankName: 'Wazir-e-Azam Apna Ghar Program',
    bankShortName: 'Apna Ghar',
    logoPlaceholder: 'AG',
    financingType: 'conventional',  // Available at both conventional & Islamic banks
    rateType: 'fixed',
    annualRatePercent: 5.0,            // Years 1-10 fixed at 5%
    kibor6Month: KIBOR_6M,
    kibor12Month: KIBOR_12M,
    spreadPercent: 0,
    minLoanPKR: 1_000_000,
    maxLoanPKR: 10_000_000,            // Up to 10M for 10 marla / 1500 sqft
    minTenureYears: 10,
    maxTenureYears: 20,
    minPropertyValuePKR: 1_500_000,
    maxLtvPercent: 90,
    processingFeePercent: 0,
    processingFeeMin: 0,
    processingFeeMax: 0,
    insuranceRatePercent: 0,
    purposes: ['purchase', 'construction'],
    hasEarlyPaymentPenalty: false,
    earlyPaymentPenaltyPercent: 0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    badge: 'Govt Subsidized',
    isActive: true,
    lastUpdated: '2026-01-15',
    disclaimer: 'First-time homeowners only. Property ≤10 marla (house) or ≤1500 sq ft (apartment). Years 1-10: 5% fixed. Years 11-20: reverts to bank\'s commercial rate capped at 1Y KIBOR + 3%. Zero processing fee & no prepayment penalty. Offered via NBP, HBL, BOP, Askari, other partner banks.',
  },
];

// ═══════════════════════════════════════════════════════════════
// LOOKUP HELPERS
// ═══════════════════════════════════════════════════════════════

export function getBankById(bankId: string): BankRate | undefined {
  return BANKS.find((b) => b.bankId === bankId && b.isActive);
}

export function getBanksByType(type: FinancingType): BankRate[] {
  return BANKS.filter((b) => b.financingType === type && b.isActive);
}

export function getAllActiveBanks(): BankRate[] {
  return BANKS.filter((b) => b.isActive);
}

export function getCommercialBanks(): BankRate[] {
  return BANKS.filter((b) => b.bankId !== 'wazir_e_azam_apna_ghar' && b.isActive);
}

export function getSubsidizedProgram(): BankRate | undefined {
  return BANKS.find((b) => b.bankId === 'wazir_e_azam_apna_ghar' && b.isActive);
}

export const ALL_BANK_IDS = BANKS.map((b) => b.bankId) as [string, ...string[]];

// ═══════════════════════════════════════════════════════════════
// PURE CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate monthly EMI using standard amortization formula.
 * Works for both conventional (interest) and Islamic (profit rate).
 *
 * Formula: M = P × r(1+r)^n / ((1+r)^n - 1)
 * Where:
 *   P = principal (loan amount)
 *   r = monthly rate (annual / 12 / 100)
 *   n = total months
 */
export function calculateEMI(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePercent <= 0) return principal / tenureMonths;

  const monthlyRate = annualRatePercent / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return principal * (monthlyRate * factor) / (factor - 1);
}

/**
 * Generate full amortization schedule.
 * Returns monthly breakdown for all months (capped at 360 for performance).
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): MonthlyBreakdown[] {
  const monthlyPayment = calculateEMI(principal, annualRatePercent, tenureMonths);
  const monthlyRate = annualRatePercent / 12 / 100;
  const schedule: MonthlyBreakdown[] = [];

  let balance = principal;
  let cumulativePaid = 0;
  let cumulativePrincipal = 0;
  let cumulativeProfit = 0;

  const maxMonths = Math.min(tenureMonths, 360);

  for (let month = 1; month <= maxMonths; month++) {
    const profitComponent = balance * monthlyRate;
    const principalComponent = monthlyPayment - profitComponent;
    balance -= principalComponent;
    cumulativePaid += monthlyPayment;
    cumulativePrincipal += principalComponent;
    cumulativeProfit += profitComponent;

    schedule.push({
      month,
      year: Math.ceil(month / 12),
      payment: monthlyPayment,
      principalComponent: Math.max(0, principalComponent),
      profitComponent: Math.max(0, profitComponent),
      balance: Math.max(0, balance),
      cumulativePaid,
      cumulativePrincipal,
      cumulativeProfit,
    });

    if (balance <= 0.01) break;
  }

  return schedule;
}

/**
 * Generate yearly summary from monthly schedule.
 */
export function generateYearlySummary(schedule: MonthlyBreakdown[]): YearlySummary[] {
  const yearlyMap = new Map<number, YearlySummary>();

  for (const m of schedule) {
    const existing = yearlyMap.get(m.year) || {
      year: m.year,
      totalPayment: 0,
      principalPaid: 0,
      profitPaid: 0,
      closingBalance: m.balance,
    };
    existing.totalPayment += m.payment;
    existing.principalPaid += m.principalComponent;
    existing.profitPaid += m.profitComponent;
    existing.closingBalance = m.balance;
    yearlyMap.set(m.year, existing);
  }

  return Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);
}

/**
 * Calculate processing fee with min/max bounds.
 */
export function calculateProcessingFee(
  loanAmount: number,
  feePercent: number,
  feeMin: number,
  feeMax: number
): number {
  const rawFee = loanAmount * (feePercent / 100);
  const bounded = Math.max(feeMin, Math.min(rawFee, feeMax || Infinity));
  return Math.round(bounded);
}

/**
 * Calculate annual insurance premium.
 */
export function calculateInsurance(propertyValue: number, insuranceRatePercent: number): number {
  return Math.round(propertyValue * (insuranceRatePercent / 100));
}

/**
 * Main loan calculation function.
 */
export function calculateLoan(input: LoanCalculationInput): LoanCalculationResult {
  const bank = getBankById(input.bankId);
  if (!bank) {
    throw new Error(`Bank not found or inactive: ${input.bankId}`);
  }

  // Validate input
  const errors = validateLoanInput(input, bank);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const downPaymentPKR = Math.round(input.propertyValuePKR * (input.downPaymentPercent / 100));
  const loanAmountPKR = input.propertyValuePKR - downPaymentPKR;
  const tenureMonths = input.tenureYears * 12;

  // Monthly payment
  const monthlyPayment = calculateEMI(loanAmountPKR, bank.annualRatePercent, tenureMonths);

  // Insurance
  const insuranceAnnual = input.includeInsurance
    ? calculateInsurance(input.propertyValuePKR, bank.insuranceRatePercent)
    : 0;
  const monthlyInsurance = insuranceAnnual / 12;
  const monthlyTotal = monthlyPayment + monthlyInsurance;

  // Processing fee
  const processingFee = input.includeProcessingFee
    ? calculateProcessingFee(
        loanAmountPKR,
        bank.processingFeePercent,
        bank.processingFeeMin,
        bank.processingFeeMax
      )
    : 0;

  // Amortization
  const amortizationSchedule = generateAmortizationSchedule(
    loanAmountPKR,
    bank.annualRatePercent,
    tenureMonths
  );
  const yearlyAmortization = generateYearlySummary(amortizationSchedule);

  // Totals
  const totalPayment = monthlyTotal * tenureMonths;
  const totalProfit = totalPayment - loanAmountPKR;
  const totalCostOfFinancing = (totalProfit / loanAmountPKR) * 100;
  const totalUpfrontCost = downPaymentPKR + processingFee + insuranceAnnual;

  // Affordability
  const recommendedMonthlyIncome = monthlyTotal / 0.4; // 40% debt-to-income rule
  const ltvPercent = (loanAmountPKR / input.propertyValuePKR) * 100;
  const isLtvCompliant = ltvPercent <= bank.maxLtvPercent;

  // Effective cost including fees
  const effectiveCostPercent = ((totalProfit + processingFee + insuranceAnnual * input.tenureYears) / loanAmountPKR) * 100;

  return {
    bankId: bank.bankId,
    bankName: bank.bankName,
    financingType: bank.financingType,
    propertyValuePKR: input.propertyValuePKR,
    loanAmountPKR,
    downPaymentPKR,
    downPaymentPercent: input.downPaymentPercent,
    annualRatePercent: bank.annualRatePercent,
    tenureYears: input.tenureYears,
    tenureMonths,
    purpose: input.purpose,
    monthlyPayment,
    monthlyInsurance,
    monthlyTotal,
    totalPayment,
    totalPrincipal: loanAmountPKR,
    totalProfit,
    totalCostOfFinancing,
    processingFee,
    insuranceAnnual,
    totalUpfrontCost,
    recommendedMonthlyIncome,
    ltvPercent,
    isLtvCompliant,
    amortizationSchedule,
    yearlyAmortization,
    effectiveCostPercent,
  };
}

/**
 * Compare two banks side by side.
 */
export function compareBanks(
  inputA: LoanCalculationInput,
  inputB: LoanCalculationInput
): ComparisonResult {
  const resultA = calculateLoan(inputA);
  const resultB = calculateLoan(inputB);

  const lowestMonthly = resultA.monthlyTotal <= resultB.monthlyTotal ? resultA.bankId : resultB.bankId;
  const lowestTotalCost = resultA.totalPayment <= resultB.totalPayment ? resultA.bankId : resultB.bankId;
  const lowestProcessingFee = resultA.processingFee <= resultB.processingFee ? resultA.bankId : resultB.bankId;

  const monthlySaving = Math.abs(resultA.monthlyTotal - resultB.monthlyTotal);
  const totalSaving = Math.abs(resultA.totalPayment - resultB.totalPayment);

  const winnerName = lowestTotalCost === resultA.bankId ? resultA.bankName : resultB.bankName;
  const loserName = lowestTotalCost === resultA.bankId ? resultB.bankName : resultA.bankName;

  const recommendation =
    `${winnerName} saves you PKR ${formatPKRCompact(totalSaving)} in total ` +
    `financing cost compared to ${loserName}. ` +
    `Monthly saving: PKR ${formatPKRCompact(monthlySaving)}.`;

  return {
    bankA: resultA,
    bankB: resultB,
    winner: {
      lowestMonthly,
      lowestTotalCost,
      lowestProcessingFee,
      recommendation,
    },
    monthlySaving,
    totalSaving,
  };
}

// ═══════════════════════════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════════════════════════

export function formatPKR(amount: number): string {
  if (amount >= 10_000_000) {
    return `PKR ${(amount / 10_000_000).toFixed(2)} Crore`;
  }
  if (amount >= 100_000) {
    return `PKR ${(amount / 100_000).toFixed(2)} Lac`;
  }
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function formatPKRCompact(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(1)} Cr`;
  if (amount >= 100_000)    return `${(amount / 100_000).toFixed(1)} Lac`;
  if (amount >= 1_000)      return `${(amount / 1_000).toFixed(0)}K`;
  return String(Math.round(amount));
}

/**
 * Validate loan input against bank constraints.
 * Returns array of human-readable error messages.
 */
export function validateLoanInput(
  input: LoanCalculationInput,
  bank: BankRate
): string[] {
  const errors: string[] = [];
  const loanAmount = input.propertyValuePKR * (1 - input.downPaymentPercent / 100);
  const ltv = (loanAmount / input.propertyValuePKR) * 100;

  if (loanAmount < bank.minLoanPKR) {
    errors.push(
      `Minimum loan amount for ${bank.bankName} is ${formatPKR(bank.minLoanPKR)}.`
    );
  }
  if (loanAmount > bank.maxLoanPKR) {
    errors.push(
      `Maximum loan amount for ${bank.bankName} is ${formatPKR(bank.maxLoanPKR)}.`
    );
  }
  if (input.propertyValuePKR < bank.minPropertyValuePKR) {
    errors.push(
      `Minimum property value for ${bank.bankName} is ${formatPKR(bank.minPropertyValuePKR)}.`
    );
  }
  if (ltv > bank.maxLtvPercent) {
    errors.push(
      `${bank.bankName} finances maximum ${bank.maxLtvPercent}% of property value. ` +
      `Minimum down payment: ${100 - bank.maxLtvPercent}%.`
    );
  }
  if (input.tenureYears < bank.minTenureYears) {
    errors.push(
      `Minimum loan tenure for ${bank.bankName} is ${bank.minTenureYears} years.`
    );
  }
  if (input.tenureYears > bank.maxTenureYears) {
    errors.push(
      `Maximum loan tenure for ${bank.bankName} is ${bank.maxTenureYears} years.`
    );
  }
  if (!bank.purposes.includes(input.purpose)) {
    errors.push(
      `${bank.bankName} does not offer financing for "${input.purpose}" purpose.`
    );
  }

  return errors;
}
