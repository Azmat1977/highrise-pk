import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calculator, 
  ArrowRightLeft, 
  Landmark, 
  Check, 
  Percent, 
  Wallet, 
  ShieldCheck, 
  Scale, 
  TrendingUp,
  Building,
  DollarSign,
  Sparkles
} from 'lucide-react';
import { PropertyValuationTool } from './PropertyValuationTool.tsx';
import { 
  AreaUnit, 
  convertArea, 
  calculateInstallmentPlan, 
  calculateConstructionCost,
  calculateEMI,
  calculateLoanEligibility,
  calculateAffordability,
  calculateROI
} from '../utils/calculators.ts';
import { formatPKR } from '../utils/formatters.ts';
import { PropertyResearchTool } from '../types/index.ts';

interface ToolModalProps {
  tool: PropertyResearchTool | null;
  onClose: () => void;
}

export const ToolModals: React.FC<ToolModalProps> = ({ tool, onClose }) => {
  const [currentTool, setCurrentTool] = useState<PropertyResearchTool | null>(tool);

  useEffect(() => {
    setCurrentTool(tool);
  }, [tool]);

  // 1. Area Converter State
  const [areaVal, setAreaVal] = useState<number>(5);
  const [fromUnit, setFromUnit] = useState<AreaUnit>('Marla');
  const [toUnit, setToUnit] = useState<AreaUnit>('Sq. Ft.');

  // 2. Construction Calculator State
  const [coveredArea, setCoveredArea] = useState<number>(2250);
  const [qualityGrade, setQualityGrade] = useState<'grey' | 'standard' | 'premium'>('standard');

  // 3. Installment Calculator State
  const [propertyPrice, setPropertyPrice] = useState<number>(25000000);
  const [downPaymentPct, setDownPaymentPct] = useState<number>(20);
  const [durationMonths, setDurationMonths] = useState<number>(36);
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly'>('monthly');

  // 4. EMI Calculator State
  const [loanAmount, setLoanAmount] = useState<number>(15000000); // 1.5 Crore
  const [interestRate, setInterestRate] = useState<number>(14.5); // 14.5% KIBOR + spread
  const [tenureYears, setTenureYears] = useState<number>(15);

  // 5. Loan Eligibility State
  const [monthlyIncome, setMonthlyIncome] = useState<number>(350000); // 3.5 Lakh / month
  const [existingObligations, setExistingObligations] = useState<number>(40000);

  // 6. Affordability State
  const [cashSavings, setCashSavings] = useState<number>(6000000); // 60 Lakh cash
  const [affordIncome, setAffordIncome] = useState<number>(400000);

  // 7. ROI / Rental Yield State
  const [roiPurchasePrice, setRoiPurchasePrice] = useState<number>(22000000); // 2.2 Crore
  const [roiMonthlyRent, setRoiMonthlyRent] = useState<number>(130000); // 1.3 Lakh / month
  const [annualGrowthRate, setAnnualGrowthRate] = useState<number>(8.5);

  const handleClose = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentTool(null);
    onClose();
  };

  // Handle escape key to close modal
  useEffect(() => {
    if (!tool) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tool]);

  // If tool is not set, do not render modal
  if (!tool) return null;

  const activeToolKey = currentTool || tool || 'valuation';

  // Calculations
  const convertedResult = convertArea(areaVal, fromUnit, toUnit);
  const constructionResult = calculateConstructionCost(coveredArea, qualityGrade);
  const installmentResult = calculateInstallmentPlan(
    propertyPrice,
    downPaymentPct,
    durationMonths,
    frequency
  );
  const emiResult = calculateEMI(loanAmount, interestRate, tenureYears);
  const eligibilityResult = calculateLoanEligibility(monthlyIncome, existingObligations, interestRate, tenureYears);
  const affordabilityResult = calculateAffordability(affordIncome, cashSavings, tenureYears);
  const roiResult = calculateROI(roiPurchasePrice, roiMonthlyRent, annualGrowthRate);

  const tabs: Array<{ id: PropertyResearchTool; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'valuation', label: 'Property Valuation', icon: Sparkles },
    { id: 'emi', label: 'EMI Calculator', icon: Percent },
    { id: 'eligibility', label: 'Loan Eligibility', icon: ShieldCheck },
    { id: 'affordability', label: 'Affordability', icon: Wallet },
    { id: 'converter', label: 'Area Converter', icon: ArrowRightLeft },
    { id: 'construction', label: 'Construction Cost', icon: Building },
    { id: 'installment', label: 'Installments', icon: Landmark },
    { id: 'roi', label: 'Rental ROI', icon: TrendingUp },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose(e);
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl ${activeToolKey === 'valuation' ? 'max-w-4xl' : 'max-w-2xl'} w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto flex flex-col justify-between cursor-default`}
      >
        <div>
          {/* Header & Close */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/Highrise_824d53ac.png"
                alt="Highrise.pk"
                className="h-10 w-auto object-contain"
              />
              <div>
                <h3 className="font-heading font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                  Property Research & Financial Tools
                </h3>
                <p className="text-[11px] text-slate-500">
                  Calibrated for Pakistani real estate benchmarks & live market listings
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              data-testid="close-tool-modal-button"
              aria-label="Close dialog"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Tool Selector Ribbon */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-5 scrollbar-thin">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeToolKey === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCurrentTool(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#004063] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TOOL 0: PROPERTY VALUATION */}
          {activeToolKey === 'valuation' && (
            <div className="space-y-4">
              <PropertyValuationTool onNavigateProperty={handleClose} />
            </div>
          )}

          {/* TOOL 1: EMI CALCULATOR */}
          {activeToolKey === 'emi' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#004063]/5 rounded-xl border border-[#004063]/10">
                <span className="text-xs font-bold text-[#004063] block">
                  Home Loan EMI & Amortization Calculator
                </span>
                <p className="text-[11px] text-slate-600">
                  Estimate monthly repayments for standard Pakistani home financing (Meezan, HBL, Bank Alfalah).
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Loan Amount:</span>
                  <span className="font-bold text-[#004063]">{formatPKR(loanAmount)}</span>
                </div>
                <input
                  type="range"
                  min="1000000"
                  max="50000000"
                  step="500000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-[#004063]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Interest Rate (% p.a.):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max="30"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Avg KIBOR: 13.5% - 15.5%</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loan Tenure (Years):
                  </label>
                  <select
                    value={tenureYears}
                    onChange={(e) => setTenureYears(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                  >
                    <option value="5">5 Years (60 Months)</option>
                    <option value="10">10 Years (120 Months)</option>
                    <option value="15">15 Years (180 Months)</option>
                    <option value="20">20 Years (240 Months)</option>
                    <option value="25">25 Years (300 Months)</option>
                  </select>
                </div>
              </div>

              {/* Output Result Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00314d] to-[#004063] text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8fc2d0] font-bold">
                      Calculated Monthly EMI
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white">
                      {formatPKR(emiResult.monthlyEmi)}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <Percent className="w-5 h-5 text-[#38aec7]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-xs">
                  <div>
                    <span className="text-slate-300 text-[10px] block">Total Interest Payable:</span>
                    <strong className="text-white">{formatPKR(emiResult.totalInterest)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-300 text-[10px] block">Total Amount (Principal + Int):</span>
                    <strong className="text-white">{formatPKR(emiResult.totalAmountPayable)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOOL 2: LOAN ELIGIBILITY */}
          {activeToolKey === 'eligibility' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#029bba]/10 rounded-xl border border-[#029bba]/20">
                <span className="text-xs font-bold text-[#007196] block">
                  Income-Based Home Loan Eligibility
                </span>
                <p className="text-[11px] text-slate-600">
                  Calculated using Pakistani banking guidelines: 50% max Fixed Obligation to Income Ratio (FOIR).
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Net Monthly Household Income:</span>
                  <span className="font-bold text-[#004063]">{formatPKR(monthlyIncome)}</span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="2000000"
                  step="25000"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="w-full accent-[#004063]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Existing Monthly Obligations (Car loans, credit cards):</span>
                  <span className="font-bold text-slate-700">{formatPKR(existingObligations)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500000"
                  step="10000"
                  value={existingObligations}
                  onChange={(e) => setExistingObligations(Number(e.target.value))}
                  className="w-full accent-slate-600"
                />
              </div>

              {/* Output Result Card */}
              <div className="p-4 rounded-2xl bg-emerald-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                      Estimated Loan Sanction Limit
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white">
                      {formatPKR(eligibilityResult.estimatedLoanLimit)}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-700 text-emerald-100">
                    {eligibilityResult.affordabilityStatus} Feasibility
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-800 text-xs">
                  <div>
                    <span className="text-emerald-200 text-[10px] block">Max Permissible Monthly EMI:</span>
                    <strong className="text-white">{formatPKR(eligibilityResult.maxAffordableEmi)}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-200 text-[10px] block">Assumed Tenure:</span>
                    <strong className="text-white">{tenureYears} Years @ 14.5%</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOOL 3: AFFORDABILITY */}
          {activeToolKey === 'affordability' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#004063]/5 rounded-xl border border-[#004063]/10">
                <span className="text-xs font-bold text-[#004063] block">
                  Property Search Budget & Affordability
                </span>
                <p className="text-[11px] text-slate-600">
                  Combines available cash savings (for down payment) and monthly income to compute your realistic property purchasing ceiling.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cash in Hand / Savings:
                  </label>
                  <input
                    type="number"
                    step="500000"
                    value={cashSavings}
                    onChange={(e) => setCashSavings(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{formatPKR(cashSavings)}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Income:
                  </label>
                  <input
                    type="number"
                    step="50000"
                    value={affordIncome}
                    onChange={(e) => setAffordIncome(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{formatPKR(affordIncome)}</span>
                </div>
              </div>

              {/* Output Result Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#004063] to-[#007196] text-white space-y-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#8fc2d0] font-bold">
                    Maximum Recommended Property Price
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">
                    {formatPKR(affordabilityResult.totalBudget)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 text-xs">
                  <div>
                    <span className="text-slate-300 text-[10px] block">Down Payment (25%):</span>
                    <strong className="text-white">{formatPKR(affordabilityResult.cashDownPayment)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-300 text-[10px] block">Loan Required:</span>
                    <strong className="text-white">{formatPKR(affordabilityResult.maxLoanAmount)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-300 text-[10px] block">Transfer Tax Buffer:</span>
                    <strong className="text-white">{formatPKR(affordabilityResult.registrationReserve)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOOL 4: AREA CONVERTER */}
          {activeToolKey === 'converter' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#004063]/5 rounded-xl border border-[#004063]/10">
                <span className="text-xs font-bold text-[#004063] block">
                  Pakistani Property Area Converter
                </span>
                <p className="text-[11px] text-slate-600">
                  Accurate conversions for Marla, Kanal, Square Yards (Gaz), and Square Feet.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter Land Value:
                </label>
                <input
                  type="number"
                  min="0"
                  value={areaVal || ''}
                  onChange={(e) => setAreaVal(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-lg font-bold text-slate-800"
                  placeholder="e.g. 5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    From Unit:
                  </label>
                  <select
                    value={fromUnit}
                    onChange={(e) => setFromUnit(e.target.value as AreaUnit)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                  >
                    <option value="Marla">Marla (225 sq ft)</option>
                    <option value="Kanal">Kanal (20 Marla)</option>
                    <option value="Sq. Ft.">Square Feet</option>
                    <option value="Sq. Yds.">Square Yards (Gaz)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    To Unit:
                  </label>
                  <select
                    value={toUnit}
                    onChange={(e) => setToUnit(e.target.value as AreaUnit)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                  >
                    <option value="Sq. Ft.">Square Feet</option>
                    <option value="Marla">Marla</option>
                    <option value="Kanal">Kanal</option>
                    <option value="Sq. Yds.">Square Yards</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#004063] text-white text-center">
                <span className="text-[10px] uppercase tracking-wider text-[#8fc2d0] block mb-0.5">
                  Converted Output
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {convertedResult.toLocaleString()} {toUnit}
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Standard Pakistani benchmark: 1 Marla = 225 sq. ft., 1 Kanal = 20 Marla = 4,500 sq. ft.
                </p>
              </div>
            </div>
          )}

          {/* TOOL 5: CONSTRUCTION COST */}
          {activeToolKey === 'construction' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#004063]/5 rounded-xl border border-[#004063]/10">
                <span className="text-xs font-bold text-[#004063] block">
                  2026 Construction Cost Estimator
                </span>
                <p className="text-[11px] text-slate-600">
                  Estimates grey structure (bricks, steel, cement) and architectural finishing in Pakistan.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Covered Area (Sq. Ft.):</span>
                  <span className="font-bold text-[#004063]">{coveredArea.toLocaleString()} sqft</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={coveredArea}
                  onChange={(e) => setCoveredArea(Number(e.target.value))}
                  className="w-full accent-[#004063]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Finishing Quality:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'grey', label: 'Grey Structure', rate: 'PKR 2,800/sqft' },
                    { id: 'standard', label: 'Standard Finish', rate: 'PKR 5,300/sqft' },
                    { id: 'premium', label: 'A+ Luxury', rate: 'PKR 7,400/sqft' },
                  ].map((grade) => (
                    <button
                      key={grade.id}
                      type="button"
                      onClick={() => setQualityGrade(grade.id as any)}
                      className={`p-2 rounded-xl text-xs text-left border transition-all ${
                        qualityGrade === grade.id
                          ? 'border-[#004063] bg-[#004063]/10 text-[#004063] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block">{grade.label}</span>
                      <span className="text-[10px] text-slate-400 block">{grade.rate}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#004063] text-white space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-[#8fc2d0] uppercase tracking-wider block">Total Estimated Cost</span>
                    <span className="text-2xl font-black text-white">{formatPKR(constructionResult.totalCost)}</span>
                  </div>
                  <span className="text-xs bg-white/10 px-2 py-1 rounded-md text-[#38aec7]">
                    PKR {constructionResult.ratePerSqFt}/sqft
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-xs">
                  <div>
                    <span className="text-slate-300 text-[10px] block">Grey Structure:</span>
                    <strong>{formatPKR(constructionResult.greyStructureCost)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-300 text-[10px] block">Finishing & Fixtures:</span>
                    <strong>{formatPKR(constructionResult.finishingCost)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOOL 6: INSTALLMENT CALCULATOR */}
          {activeToolKey === 'installment' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#004063]/5 rounded-xl border border-[#004063]/10">
                <span className="text-xs font-bold text-[#004063] block">
                  Project Installment Schedule Planner
                </span>
                <p className="text-[11px] text-slate-600">
                  Break down down-payments, quarterly/monthly installments, and possession fees.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Project Price (PKR):
                </label>
                <input
                  type="number"
                  step="500000"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">{formatPKR(propertyPrice)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Down Payment (%):
                  </label>
                  <select
                    value={downPaymentPct}
                    onChange={(e) => setDownPaymentPct(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                  >
                    <option value="15">15% Booking</option>
                    <option value="20">20% Standard</option>
                    <option value="25">25% Advance</option>
                    <option value="30">30% Advance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration:
                  </label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                  >
                    <option value="12">1 Year (12 mo)</option>
                    <option value="24">2 Years (24 mo)</option>
                    <option value="36">3 Years (36 mo)</option>
                    <option value="48">4 Years (48 mo)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#004063] text-white space-y-2">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-[10px] text-[#8fc2d0] uppercase tracking-wider block">
                      {frequency === 'monthly' ? 'Monthly Payment' : 'Quarterly Payment'}
                    </span>
                    <span className="text-2xl font-black text-[#38aec7]">
                      {formatPKR(installmentResult.installmentAmount)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-300">
                    {installmentResult.numberOfInstallments} payments
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-xs">
                  <div>
                    <span className="text-slate-300 text-[10px] block">Down Payment ({downPaymentPct}%):</span>
                    <strong>{formatPKR(installmentResult.downPayment)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-300 text-[10px] block">Possession (10%):</span>
                    <strong>{formatPKR(installmentResult.possessionPayment)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOOL 7: RENTAL YIELD & ROI */}
          {activeToolKey === 'roi' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#004063]/5 rounded-xl border border-[#004063]/10">
                <span className="text-xs font-bold text-[#004063] block">
                  Rental Yield & Capital Appreciation Calculator
                </span>
                <p className="text-[11px] text-slate-600">
                  Compute annual cashflow yield and 5-year capital appreciation projection for luxury apartments and commercial units.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Price (PKR):
                  </label>
                  <input
                    type="number"
                    step="500000"
                    value={roiPurchasePrice}
                    onChange={(e) => setRoiPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{formatPKR(roiPurchasePrice)}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Monthly Rent (PKR):
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={roiMonthlyRent}
                    onChange={(e) => setRoiMonthlyRent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{formatPKR(roiMonthlyRent)}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00314d] to-[#004063] text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#8fc2d0] uppercase tracking-wider block">
                      Gross Rental Yield
                    </span>
                    <span className="text-3xl font-black text-emerald-400">
                      {roiResult.grossRentalYield}% <span className="text-xs text-white font-normal">p.a.</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-300 block">Annual Cash Rental:</span>
                    <strong className="text-base text-white">{formatPKR(roiResult.annualRent)}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-xs">
                  <div>
                    <span className="text-slate-300 text-[10px] block">Net Yield (After 15% reserve):</span>
                    <strong className="text-white">{roiResult.netRentalYield}% p.a.</strong>
                  </div>
                  <div>
                    <span className="text-slate-300 text-[10px] block">5-Yr Capital Gain (@8.5%):</span>
                    <strong className="text-emerald-300">+{formatPKR(roiResult.projectedFiveYearGain)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Highrise.pk Financial Intelligence Suite
          </span>
          <button
            type="button"
            onClick={handleClose}
            data-testid="done-tool-modal-button"
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#004063] hover:bg-[#029bba] text-white transition-colors shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
