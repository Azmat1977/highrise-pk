/**
 * Calculators for Property Area Conversion, Construction Cost, and Payment Plans.
 * Based on Pakistani real estate benchmarks.
 */

export type AreaUnit = 'Marla' | 'Kanal' | 'Sq. Ft.' | 'Sq. Yds.';

// Standard conversion factors to Square Feet (1 Marla = 225 Sq. Ft., 1 Kanal = 4500 Sq. Ft., 1 Sq. Yd = 9 Sq. Ft.)
const SQFT_FACTORS: Record<AreaUnit, number> = {
  'Sq. Ft.': 1,
  'Sq. Yds.': 9,
  'Marla': 225,
  'Kanal': 4500,
};

export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  if (isNaN(value) || value <= 0) return 0;
  const sqft = value * SQFT_FACTORS[from];
  const converted = sqft / SQFT_FACTORS[to];
  return Math.round(converted * 100) / 100;
}

export interface PaymentPlanResult {
  totalPrice: number;
  downPayment: number;
  possessionPayment: number;
  remainingForInstallments: number;
  numberOfInstallments: number;
  installmentAmount: number;
}

export function calculateInstallmentPlan(
  totalPrice: number,
  downPaymentPercent: number = 20,
  durationMonths: number = 36,
  frequency: 'monthly' | 'quarterly' = 'monthly',
  possessionPercent: number = 10
): PaymentPlanResult {
  if (isNaN(totalPrice) || totalPrice <= 0) {
    return {
      totalPrice: 0,
      downPayment: 0,
      possessionPayment: 0,
      remainingForInstallments: 0,
      numberOfInstallments: 0,
      installmentAmount: 0,
    };
  }

  const downPayment = Math.round((totalPrice * downPaymentPercent) / 100);
  const possessionPayment = Math.round((totalPrice * possessionPercent) / 100);
  const remainingForInstallments = Math.max(0, totalPrice - downPayment - possessionPayment);

  const monthsPerInstallment = frequency === 'quarterly' ? 3 : 1;
  const numberOfInstallments = Math.max(1, Math.floor(durationMonths / monthsPerInstallment));
  const installmentAmount = Math.round(remainingForInstallments / numberOfInstallments);

  return {
    totalPrice,
    downPayment,
    possessionPayment,
    remainingForInstallments,
    numberOfInstallments,
    installmentAmount,
  };
}

export interface ConstructionCostEstimate {
  coveredAreaSqFt: number;
  qualityGrade: 'grey' | 'standard' | 'premium';
  ratePerSqFt: number;
  greyStructureCost: number;
  finishingCost: number;
  totalCost: number;
}

export function calculateConstructionCost(
  coveredAreaSqFt: number,
  qualityGrade: 'grey' | 'standard' | 'premium' = 'standard'
): ConstructionCostEstimate {
  if (isNaN(coveredAreaSqFt) || coveredAreaSqFt <= 0) {
    return {
      coveredAreaSqFt: 0,
      qualityGrade,
      ratePerSqFt: 0,
      greyStructureCost: 0,
      finishingCost: 0,
      totalCost: 0,
    };
  }

  // Realistic Pakistani 2026 construction cost benchmarks (PKR / sq ft)
  let greyRate = 2800;
  let finishingRate = 2200;

  if (qualityGrade === 'grey') {
    finishingRate = 0;
  } else if (qualityGrade === 'standard') {
    finishingRate = 2500;
  } else if (qualityGrade === 'premium') {
    greyRate = 3200;
    finishingRate = 4200;
  }

  const greyStructureCost = Math.round(coveredAreaSqFt * greyRate);
  const finishingCost = Math.round(coveredAreaSqFt * finishingRate);
  const totalCost = greyStructureCost + finishingCost;
  const ratePerSqFt = greyRate + finishingRate;

  return {
    coveredAreaSqFt,
    qualityGrade,
    ratePerSqFt,
    greyStructureCost,
    finishingCost,
    totalCost,
  };
}

// 4. EMI Calculator
export interface EmiResult {
  loanAmount: number;
  monthlyEmi: number;
  totalInterest: number;
  totalAmountPayable: number;
  interestToPrincipalRatio: number;
}

export function calculateEMI(
  loanAmount: number,
  annualInterestRate: number = 14.5, // Realistic Pakistani mortgage rate (KIBOR + bank spread)
  tenureYears: number = 15
): EmiResult {
  if (isNaN(loanAmount) || loanAmount <= 0 || tenureYears <= 0) {
    return {
      loanAmount: 0,
      monthlyEmi: 0,
      totalInterest: 0,
      totalAmountPayable: 0,
      interestToPrincipalRatio: 0,
    };
  }

  const monthlyRate = (annualInterestRate / 12) / 100;
  const totalMonths = tenureYears * 12;

  // Formula: EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
  const emi = 
    monthlyRate === 0
      ? loanAmount / totalMonths
      : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1);

  const totalAmountPayable = Math.round(emi * totalMonths);
  const totalInterest = Math.max(0, totalAmountPayable - loanAmount);
  const interestToPrincipalRatio = loanAmount > 0 ? Math.round((totalInterest / loanAmount) * 100) : 0;

  return {
    loanAmount,
    monthlyEmi: Math.round(emi),
    totalInterest,
    totalAmountPayable,
    interestToPrincipalRatio,
  };
}

// 5. Home Loan Eligibility Calculator
export interface LoanEligibilityResult {
  monthlyIncome: number;
  existingEmi: number;
  maxAffordableEmi: number;
  estimatedLoanLimit: number;
  affordabilityStatus: 'High' | 'Moderate' | 'Stretched';
}

export function calculateLoanEligibility(
  monthlyIncome: number,
  existingEmi: number = 0,
  annualInterestRate: number = 14.5,
  tenureYears: number = 15,
  foirPercent: number = 50 // Fixed Obligation to Income Ratio standard in Pakistani commercial banks (e.g. Meezan, HBL)
): LoanEligibilityResult {
  if (isNaN(monthlyIncome) || monthlyIncome <= 0) {
    return {
      monthlyIncome: 0,
      existingEmi: 0,
      maxAffordableEmi: 0,
      estimatedLoanLimit: 0,
      affordabilityStatus: 'Moderate',
    };
  }

  const maxPermittedObligation = (monthlyIncome * foirPercent) / 100;
  const maxAffordableEmi = Math.max(0, maxPermittedObligation - existingEmi);

  const monthlyRate = (annualInterestRate / 12) / 100;
  const totalMonths = tenureYears * 12;

  // Reverse calculate loan limit from EMI: P = EMI * ((1+R)^N - 1) / (R * (1+R)^N)
  let estimatedLoanLimit = 0;
  if (monthlyRate > 0 && maxAffordableEmi > 0) {
    estimatedLoanLimit = Math.round(
      (maxAffordableEmi * (Math.pow(1 + monthlyRate, totalMonths) - 1)) /
      (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))
    );
  }

  let affordabilityStatus: 'High' | 'Moderate' | 'Stretched' = 'Moderate';
  const ratio = (existingEmi + maxAffordableEmi) / monthlyIncome;
  if (ratio <= 0.35) affordabilityStatus = 'High';
  else if (ratio > 0.5) affordabilityStatus = 'Stretched';

  return {
    monthlyIncome,
    existingEmi,
    maxAffordableEmi: Math.round(maxAffordableEmi),
    estimatedLoanLimit,
    affordabilityStatus,
  };
}

// 6. Home Affordability Calculator
export interface AffordabilityResult {
  totalBudget: number;
  maxLoanAmount: number;
  cashDownPayment: number;
  monthlyEmi: number;
  registrationReserve: number; // ~5% stamp duty, registration & transfer taxes in Pakistan
}

export function calculateAffordability(
  monthlyIncome: number,
  cashSavings: number,
  tenureYears: number = 15,
  downPaymentPercent: number = 25
): AffordabilityResult {
  const eligibility = calculateLoanEligibility(monthlyIncome, 0, 14.5, tenureYears);
  const maxLoanAmount = eligibility.estimatedLoanLimit;

  // If cashSavings represents downPaymentPercent of property:
  // Property Price = CashSavings / (downPaymentPercent / 100)
  // But also capped by loan limit:
  const budgetFromCash = Math.round(cashSavings / (downPaymentPercent / 100));
  const budgetFromLoan = Math.round(maxLoanAmount / (1 - downPaymentPercent / 100));
  const totalBudget = Math.min(budgetFromCash, budgetFromLoan > 0 ? budgetFromLoan : budgetFromCash);

  const cashDownPayment = Math.round(totalBudget * (downPaymentPercent / 100));
  const loanRequired = Math.max(0, totalBudget - cashDownPayment);
  const emi = calculateEMI(loanRequired, 14.5, tenureYears);
  const registrationReserve = Math.round(totalBudget * 0.05);

  return {
    totalBudget,
    maxLoanAmount: loanRequired,
    cashDownPayment,
    monthlyEmi: emi.monthlyEmi,
    registrationReserve,
  };
}

// 7. Rental Yield & ROI Calculator
export interface RoiResult {
  purchasePrice: number;
  monthlyRent: number;
  annualRent: number;
  grossRentalYield: number;
  netRentalYield: number; // after 15% maintenance & vacancy reserve
  projectedFiveYearGain: number;
}

export function calculateROI(
  purchasePrice: number,
  monthlyRent: number,
  annualCapitalGrowthRate: number = 8.5
): RoiResult {
  if (isNaN(purchasePrice) || purchasePrice <= 0 || isNaN(monthlyRent) || monthlyRent <= 0) {
    return {
      purchasePrice: 0,
      monthlyRent: 0,
      annualRent: 0,
      grossRentalYield: 0,
      netRentalYield: 0,
      projectedFiveYearGain: 0,
    };
  }

  const annualRent = monthlyRent * 12;
  const grossRentalYield = Math.round((annualRent / purchasePrice) * 1000) / 10;
  const netRentalYield = Math.round((annualRent * 0.85 / purchasePrice) * 1000) / 10;
  const projectedFutureValue = purchasePrice * Math.pow(1 + (annualCapitalGrowthRate / 100), 5);
  const projectedFiveYearGain = Math.round(projectedFutureValue - purchasePrice);

  return {
    purchasePrice,
    monthlyRent,
    annualRent,
    grossRentalYield,
    netRentalYield,
    projectedFiveYearGain,
  };
}
