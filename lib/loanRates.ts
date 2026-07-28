/**
 * lib/loanRates.ts
 *
 * Pakistani Home Loan / Mortgage Rate Database
 *
 * Sources (approximate — admin can override via future DB integration):
 *   - State Bank of Pakistan (SBP) policy rate
 *   - Individual bank advertised rates (2024-25)
 *   - Meezan Bank Diminishing Musharakah rates
 *   - HBL, MCB, UBL, ABL, Bank Alfalah conventional rates
 *
 * Supports:
 *   - Conventional (interest-based) financing
 *   - Islamic (Diminishing Musharakah) financing
 *   - Variable rate (KIBOR + spread)
 *   - Fixed rate periods
 *
 * V5.7.0 — Phase B: Home Loan Calculator
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
  badge?: string;               // "Most Popular" | "Lowest Rate" | "Best Islamic"
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
// SBP POLICY RATE (Updated periodically)
// ═══════════════════════════════════════════════════════════════

export const SBP_POLICY_RATE = 13.0;    // % as of early 2025
export const KIBOR_6M = 12.75;          // 6-month KIBOR

// ═══════════════════════════════════════════════════════════════
// BANK DATABASE
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
    annualRatePercent: 20.5,
    kibor6Month: KIBOR_6M,
    spreadPercent: 7.75,
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
    lastUpdated: '2025-01-01',
    disclaimer: 'Diminishing Musharakah — Shariah compliant. Rate linked to 6M KIBOR.',
  },

  {
    bankId: 'hbl_islamic',
    bankName: 'HBL Islamic Banking',
    bankShortName: 'HBL Islamic',
    logoPlaceholder: 'HI',
    financingType: 'islamic',
    rateType: 'variable',
    annualRatePercent: 21.0,
    kibor6Month: KIBOR_6M,
    spreadPercent: 8.25,
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
    lastUpdated: '2025-01-01',
    disclaimer: 'Islamic financing under Diminishing Musharakah. Subject to SBP guidelines.',
  },

  {
    bankId: 'mcb_islamic',
    bankName: 'MCB Islamic Banking',
    bankShortName: 'MCB Islamic',
    logoPlaceholder: 'MI',
    financingType: 'islamic',
    rateType: 'variable',
    annualRatePercent: 21.5,
    kibor6Month: KIBOR_6M,
    spreadPercent: 8.75,
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
    lastUpdated: '2025-01-01',
    disclaimer: 'Shariah compliant home financing. Rate subject to periodic revision.',
  },

  {
    bankId: 'bank_islami',
    bankName: 'BankIslami Pakistan',
    bankShortName: 'BankIslami',
    logoPlaceholder: 'BI',
    financingType: 'islamic',
    rateType: 'variable',
    annualRatePercent: 21.25,
    kibor6Month: KIBOR_6M,
    spreadPercent: 8.50,
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
    lastUpdated: '2025-01-01',
    disclaimer: 'Diminishing Musharakah home finance. Fully Shariah-compliant.',
  },

  // ── CONVENTIONAL BANKS ─────────────────────────────────────

  {
    bankId: 'hbl',
    bankName: 'Habib Bank Limited',
    bankShortName: 'HBL',
    logoPlaceholder: 'HB',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 20.75,
    kibor6Month: KIBOR_6M,
    spreadPercent: 8.0,
    minLoanPKR: 500_000,
    maxLoanPKR: 100_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 85,
    processingFeePercent: 0.5,
    processingFeeMin: 15_000,
    processingFeeMax: 250_000,
    insuranceRatePercent: 0.40,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 2.0,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    badge: 'Most Popular',
    isActive: true,
    lastUpdated: '2025-01-01',
    disclaimer: 'Conventional mortgage. Interest-based financing. Rate linked to 6M KIBOR.',
  },

  {
    bankId: 'mcb',
    bankName: 'MCB Bank Limited',
    bankShortName: 'MCB',
    logoPlaceholder: 'MC',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 20.5,
    kibor6Month: KIBOR_6M,
    spreadPercent: 7.75,
    minLoanPKR: 500_000,
    maxLoanPKR: 75_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 1_200_000,
    maxLtvPercent: 80,
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
    lastUpdated: '2025-01-01',
    disclaimer: 'Variable rate mortgage linked to 6M KIBOR. Rate revised bi-annually.',
  },

  {
    bankId: 'ubl',
    bankName: 'United Bank Limited',
    bankShortName: 'UBL',
    logoPlaceholder: 'UB',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 21.0,
    kibor6Month: KIBOR_6M,
    spreadPercent: 8.25,
    minLoanPKR: 500_000,
    maxLoanPKR: 50_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 1_000_000,
    maxLtvPercent: 80,
    processingFeePercent: 0.5,
    processingFeeMin: 12_000,
    processingFeeMax: 150_000,
    insuranceRatePercent: 0.40,
    purposes: ['purchase', 'construction', 'renovation'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 2.5,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    isActive: true,
    lastUpdated: '2025-01-01',
    disclaimer: 'Home mortgage subject to credit approval. Rate linked to KIBOR.',
  },

  {
    bankId: 'abl',
    bankName: 'Allied Bank Limited',
    bankShortName: 'ABL',
    logoPlaceholder: 'AB',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 20.25,
    kibor6Month: KIBOR_6M,
    spreadPercent: 7.50,
    minLoanPKR: 300_000,
    maxLoanPKR: 50_000_000,
    minTenureYears: 3,
    maxTenureYears: 20,
    minPropertyValuePKR: 800_000,
    maxLtvPercent: 80,
    processingFeePercent: 0.4,
    processingFeeMin: 8_000,
    processingFeeMax: 120_000,
    insuranceRatePercent: 0.35,
    purposes: ['purchase', 'construction', 'renovation', 'balance_transfer'],
    hasEarlyPaymentPenalty: true,
    earlyPaymentPenaltyPercent: 1.5,
    gracePeriodMonths: 0,
    minPropertyAgeDays: 0,
    badge: 'Lowest Rate',
    isActive: true,
    lastUpdated: '2025-01-01',
    disclaimer: 'Subject to credit assessment and SBP prudential regulations.',
  },

  {
    bankId: 'bank_alfalah',
    bankName: 'Bank Alfalah',
    bankShortName: 'Alfalah',
    logoPlaceholder: 'BA',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 20.75,
    kibor6Month: KIBOR_6M,
    spreadPercent: 8.0,
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
    lastUpdated: '2025-01-01',
    disclaimer: 'Home finance subject to approval. Variable rate revised every 6 months.',
  },

  {
    bankId: 'nbc',
    bankName: 'National Bank of Pakistan',
    bankShortName: 'NBP',
    logoPlaceholder: 'NB',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 20.0,
    kibor6Month: KIBOR_6M,
    spreadPercent: 7.25,
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
    isActive: true,
    lastUpdated: '2025-01-01',
    disclaimer: 'Government bank. Subject to SBP housing finance prudential regulations.',
  },

  {
    bankId: 'askari',
    bankName: 'Askari Bank',
    bankShortName: 'Askari',
    logoPlaceholder: 'AK',
    financingType: 'conventional',
    rateType: 'variable',
    annualRatePercent: 21.25,
    kibor6Month: KIBOR_6M,
    spreadPercent: 8.5,
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
    lastUpdated: '2025-01-01',
    disclaimer: 'Askari Home Finance. Subject to credit assessment and approval.',
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
  if (annualRatePercent === 0) return principal / tenureMonths;
  const r = annualRatePercent / 12 / 100;
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

/**
 * Generate full amortization schedule.
 * Returns month-by-month breakdown.
 */
export function generateAmortization(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): MonthlyBreakdown[] {
  const schedule: MonthlyBreakdown[] = [];
  const monthlyEMI = calculateEMI(principal, annualRatePercent, tenureMonths);
  const monthlyRate = annualRatePercent / 12 / 100;

  let balance = principal;
  let cumulativePaid = 0;
  let cumulativePrincipal = 0;
  let cumulativeProfit = 0;

  for (let month = 1; month <= tenureMonths; month++) {
    const profitComponent = Math.round(balance * monthlyRate);
    // Last month: pay exact remaining balance to avoid rounding drift
    const principalComponent =
      month === tenureMonths
        ? Math.round(balance)
        : Math.min(Math.round(monthlyEMI - profitComponent), Math.round(balance));

    const payment =
      month === tenureMonths
        ? principalComponent + profitComponent
        : monthlyEMI;

    balance = Math.max(0, Math.round(balance - principalComponent));
    cumulativePaid += payment;
    cumulativePrincipal += principalComponent;
    cumulativeProfit += profitComponent;

    schedule.push({
      month,
      year: Math.ceil(month / 12),
      payment,
      principalComponent,
      profitComponent,
      balance,
      cumulativePaid,
      cumulativePrincipal,
      cumulativeProfit,
    });
  }

  return schedule;
}

/**
 * Aggregate monthly schedule into yearly summaries.
 */
export function generateYearlySummary(
  schedule: MonthlyBreakdown[]
): YearlySummary[] {
  const yearMap = new Map<number, YearlySummary>();

  for (const row of schedule) {
    const existing = yearMap.get(row.year);
    if (existing) {
      existing.totalPayment    += row.payment;
      existing.principalPaid   += row.principalComponent;
      existing.profitPaid      += row.profitComponent;
      existing.closingBalance   = row.balance;
    } else {
      yearMap.set(row.year, {
        year:           row.year,
        totalPayment:   row.payment,
        principalPaid:  row.principalComponent,
        profitPaid:     row.profitComponent,
        closingBalance: row.balance,
      });
    }
  }

  return Array.from(yearMap.values());
}

/**
 * Main loan calculation function.
 * Returns complete result including amortization.
 */
export function calculateLoan(
  input: LoanCalculationInput
): LoanCalculationResult {
  const bank = getBankById(input.bankId);
  if (!bank) throw new Error(`Bank not found: ${input.bankId}`);

  // ── Derived amounts ──────────────────────────────────────────
  const downPaymentPKR = Math.round(
    input.propertyValuePKR * (input.downPaymentPercent / 100)
  );
  const loanAmountPKR = input.propertyValuePKR - downPaymentPKR;
  const tenureMonths  = input.tenureYears * 12;
  const ltvPercent    = Math.round((loanAmountPKR / input.propertyValuePKR) * 100);

  // ── EMI calculation ──────────────────────────────────────────
  const monthlyPayment = calculateEMI(
    loanAmountPKR,
    bank.annualRatePercent,
    tenureMonths
  );

  // ── Insurance ────────────────────────────────────────────────
  const insuranceAnnual = input.includeInsurance
    ? Math.round(loanAmountPKR * (bank.insuranceRatePercent / 100))
    : 0;
  const monthlyInsurance = Math.round(insuranceAnnual / 12);
  const monthlyTotal     = monthlyPayment + monthlyInsurance;

  // ── Processing fee ───────────────────────────────────────────
  let processingFee = 0;
  if (input.includeProcessingFee) {
    const calculated = Math.round(
      loanAmountPKR * (bank.processingFeePercent / 100)
    );
    processingFee = Math.max(bank.processingFeeMin, calculated);
    if (bank.processingFeeMax > 0) {
      processingFee = Math.min(processingFee, bank.processingFeeMax);
    }
  }

  // ── Total cost ───────────────────────────────────────────────
  const totalPayment     = monthlyPayment * tenureMonths;
  const totalPrincipal   = loanAmountPKR;
  const totalProfit      = totalPayment - totalPrincipal;
  const totalCostPercent = Math.round((totalProfit / loanAmountPKR) * 100 * 10) / 10;

  // ── Upfront cost ─────────────────────────────────────────────
  const totalUpfrontCost = downPaymentPKR + processingFee + insuranceAnnual;

  // ── Affordability ────────────────────────────────────────────
  // Standard Pakistani banking: EMI should not exceed 40% of income
  const recommendedMonthlyIncome = Math.round(monthlyTotal / 0.40);

  // ── Effective cost (including fees) ─────────────────────────
  const effectiveTotalCost =
    totalPayment + processingFee + insuranceAnnual * input.tenureYears;
  const effectiveCostPercent =
    Math.round(((effectiveTotalCost - loanAmountPKR) / loanAmountPKR) * 100 * 10) / 10;

  // ── Amortization ─────────────────────────────────────────────
  const fullSchedule    = generateAmortization(
    loanAmountPKR,
    bank.annualRatePercent,
    tenureMonths
  );
  const yearlyAmortization = generateYearlySummary(fullSchedule);

  return {
    bankId:              bank.bankId,
    bankName:            bank.bankName,
    financingType:       bank.financingType,
    propertyValuePKR:    input.propertyValuePKR,
    loanAmountPKR,
    downPaymentPKR,
    downPaymentPercent:  input.downPaymentPercent,
    annualRatePercent:   bank.annualRatePercent,
    tenureYears:         input.tenureYears,
    tenureMonths,
    purpose:             input.purpose,
    monthlyPayment,
    monthlyInsurance,
    monthlyTotal,
    totalPayment,
    totalPrincipal,
    totalProfit,
    totalCostOfFinancing: totalCostPercent,
    processingFee,
    insuranceAnnual,
    totalUpfrontCost,
    recommendedMonthlyIncome,
    ltvPercent,
    isLtvCompliant: ltvPercent <= bank.maxLtvPercent,
    amortizationSchedule: fullSchedule,
    yearlyAmortization,
    effectiveCostPercent,
  };
}

/**
 * Compare two loan calculations side by side.
 */
export function compareLoans(
  resultA: LoanCalculationResult,
  resultB: LoanCalculationResult
): ComparisonResult {
  const lowestMonthly = resultA.monthlyTotal <= resultB.monthlyTotal
    ? resultA.bankId
    : resultB.bankId;

  const lowestTotalCost = resultA.totalPayment <= resultB.totalPayment
    ? resultA.bankId
    : resultB.bankId;

  const lowestProcessingFee = resultA.processingFee <= resultB.processingFee
    ? resultA.bankId
    : resultB.bankId;

  const monthlySaving = Math.abs(resultA.monthlyTotal - resultB.monthlyTotal);
  const totalSaving   = Math.abs(resultA.totalPayment - resultB.totalPayment);

  // Human-readable recommendation
  const winnerName =
    lowestTotalCost === resultA.bankId ? resultA.bankName : resultB.bankName;
  const loserName =
    lowestTotalCost === resultA.bankId ? resultB.bankName : resultA.bankName;

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
// FORMATTING HELPERS (shared between API and UI)
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