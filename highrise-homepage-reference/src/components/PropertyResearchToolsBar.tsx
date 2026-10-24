import React, { useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Calculator, 
  Landmark, 
  Scale, 
  Wallet, 
  Building, 
  TrendingUp, 
  ShieldCheck,
  CheckCircle2,
  PieChart,
  Sparkles,
  MapPin
} from 'lucide-react';
import { PropertyResearchTool } from '../types/index.ts';
import { RecentSearchesShelf } from './RecentSearchesShelf.tsx';

interface PropertyResearchToolsBarProps {
  onOpenTool: (tool: PropertyResearchTool) => void;
}

interface ToolCard {
  id: PropertyResearchTool;
  title: string;
  subtitle: string;
  tag: string;
  visualType: 'valuation' | 'emi' | 'eligibility' | 'affordability' | 'area' | 'construction' | 'roi';
}

const TOOLS_LIST: ToolCard[] = [
  {
    id: 'valuation',
    title: 'Property Valuation',
    subtitle: 'Instant market estimate based on current listings',
    tag: 'Live Pricing',
    visualType: 'valuation',
  },
  {
    id: 'emi',
    title: 'EMI Calculator',
    subtitle: 'Find your monthly mortgage & installment EMI',
    tag: 'Financing',
    visualType: 'emi',
  },
  {
    id: 'eligibility',
    title: 'Eligibility Calculator',
    subtitle: 'Find your home loan limit based on income',
    tag: 'Pre-Approval',
    visualType: 'eligibility',
  },
  {
    id: 'affordability',
    title: 'Affordability Calculator',
    subtitle: 'Find the best budget for your home search',
    tag: 'Budgeting',
    visualType: 'affordability',
  },
  {
    id: 'converter',
    title: 'Area Calculator',
    subtitle: 'Calculator for Pakistani land area conversion',
    tag: 'Marla & Kanal',
    visualType: 'area',
  },
  {
    id: 'construction',
    title: 'Construction Cost',
    subtitle: '2026 grey structure & finishing cost estimates',
    tag: 'Estimator',
    visualType: 'construction',
  },
  {
    id: 'roi',
    title: 'Rental Yield & ROI',
    subtitle: 'Calculate rental cashflow & projected returns',
    tag: 'Investment',
    visualType: 'roi',
  },
];

export const PropertyResearchToolsBar: React.FC<PropertyResearchToolsBarProps> = ({
  onOpenTool,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Render authentic vector graphics utilizing primary color #004063 instead of Housing.com's yellow
  const renderVisual = (type: ToolCard['visualType']) => {
    switch (type) {
      case 'valuation':
        return (
          <div className="relative w-full h-36 bg-gradient-to-br from-[#00314d]/15 via-[#004063]/20 to-[#029bba]/15 rounded-2xl flex items-center justify-center overflow-hidden border border-[#004063]/20">
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-[#029bba]/20 blur-lg" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-[#004063]/15 blur-md" />

            {/* Simulated Live Valuation Meter Card */}
            <div className="relative z-10 w-32 bg-[#004063] rounded-xl p-2.5 shadow-md border border-[#004063]/30 text-white">
              <div className="flex items-center justify-between text-[8px] text-[#8fc2d0] font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-[#38aec7]" />
                  <span>DHA Phase 2</span>
                </span>
                <span className="px-1 py-0.2 bg-[#38aec7]/20 rounded text-[7px] text-[#38aec7] font-bold">
                  94% Match
                </span>
              </div>
              <div className="text-xs font-black text-white mb-1.5">
                PKR 4.85 Crore
              </div>

              {/* Mini Range Bar */}
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden flex">
                  <div className="w-1/4 bg-amber-400 h-full" />
                  <div className="w-2/4 bg-emerald-400 h-full" />
                  <div className="w-1/4 bg-[#38aec7] h-full" />
                </div>
                <div className="flex justify-between text-[7px] text-slate-300">
                  <span>Low</span>
                  <span className="text-emerald-300 font-bold">FMV</span>
                  <span>High</span>
                </div>
              </div>
            </div>

            {/* Floating Sparkle Pin */}
            <div className="absolute right-3.5 bottom-2.5 w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#004063]">
              <Sparkles className="w-4 h-4 text-[#029bba]" />
            </div>
          </div>
        );

      case 'emi':
        return (
          <div className="relative w-full h-36 bg-gradient-to-br from-[#00314d]/10 via-[#004063]/15 to-[#029bba]/10 rounded-2xl flex items-center justify-center overflow-hidden border border-[#004063]/15">
            {/* Background geometric accents */}
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-[#004063]/10 blur-lg" />
            <div className="absolute bottom-1 left-2 w-16 h-16 rounded-full bg-[#029bba]/15" />
            
            {/* Simulated Smartphone with EMI Breakdown in Primary Palette */}
            <div className="relative z-10 w-28 bg-[#004063] rounded-xl p-2.5 shadow-md border border-[#004063]/20 text-white">
              <div className="w-6 h-1 bg-white/40 rounded-full mx-auto mb-2" />
              <div className="flex items-center justify-between text-[8px] text-[#8fc2d0] font-semibold mb-1">
                <span>Monthly EMI</span>
                <Calculator className="w-2.5 h-2.5 text-[#38aec7]" />
              </div>
              <div className="text-xs font-extrabold text-white mb-2">
                PKR 145,000
              </div>
              {/* Mini bar chart */}
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden flex">
                  <div className="w-2/3 bg-[#38aec7] h-full" />
                  <div className="w-1/3 bg-emerald-400 h-full" />
                </div>
                <div className="flex justify-between text-[7px] text-slate-300">
                  <span>Principal</span>
                  <span>Interest</span>
                </div>
              </div>
            </div>

            {/* Floating House Icon */}
            <div className="absolute right-4 bottom-3 w-10 h-10 rounded-xl bg-white border border-[#004063]/20 shadow-sm flex items-center justify-center text-[#004063]">
              <Landmark className="w-5 h-5 text-[#004063]" />
            </div>
          </div>
        );

      case 'eligibility':
        return (
          <div className="relative w-full h-36 bg-gradient-to-br from-[#00314d]/10 via-[#004063]/15 to-[#029bba]/10 rounded-2xl flex items-center justify-center overflow-hidden border border-[#004063]/15">
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-[#029bba]/15 blur-lg" />
            
            {/* Document Checklist Graphic */}
            <div className="relative z-10 w-32 bg-white rounded-xl p-3 shadow-md border border-slate-200">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
                <span className="text-[9px] font-bold text-[#004063]">Bank Pre-Check</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#029bba]" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[8px] text-slate-700">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  <span>Salary Limit: Approved</span>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] text-slate-700">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  <span>50% FOIR Compliant</span>
                </div>
                <div className="mt-1 px-1.5 py-0.5 rounded bg-[#004063]/10 text-[8px] font-bold text-[#004063] text-center">
                  Limit: PKR 2.5 Crore
                </div>
              </div>
            </div>

            {/* Little Stamp */}
            <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-[#004063] text-white flex items-center justify-center text-[8px] font-black shadow-sm">
              99%
            </div>
          </div>
        );

      case 'affordability':
        return (
          <div className="relative w-full h-36 bg-gradient-to-br from-[#00314d]/10 via-[#004063]/15 to-[#029bba]/10 rounded-2xl flex items-center justify-center overflow-hidden border border-[#004063]/15">
            <div className="absolute -top-3 -left-3 w-20 h-20 rounded-full bg-[#004063]/10 blur-md" />
            
            {/* Wallet & Savings Card in Primary Color */}
            <div className="relative z-10 w-28 bg-[#004063] text-white rounded-xl p-3 shadow-md border border-[#004063]/30">
              <div className="flex items-center justify-between mb-1.5">
                <Wallet className="w-4 h-4 text-[#38aec7]" />
                <span className="text-[8px] uppercase tracking-wider text-slate-300 font-bold">Max Budget</span>
              </div>
              <div className="text-xs font-extrabold text-white mb-2">
                PKR 3.2 Cr
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="w-3/4 bg-emerald-400 h-full" />
              </div>
              <p className="text-[7px] text-slate-300 mt-1">25% Cash + Bank Financing</p>
            </div>

            {/* Floating Coins/Badge */}
            <div className="absolute right-5 bottom-3 w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#007196]">
              <PieChart className="w-5 h-5 text-[#004063]" />
            </div>
          </div>
        );

      case 'area':
        return (
          <div className="relative w-full h-36 bg-gradient-to-br from-[#00314d]/10 via-[#004063]/15 to-[#029bba]/10 rounded-2xl flex items-center justify-center overflow-hidden border border-[#004063]/15">
            <div className="absolute -bottom-3 -right-3 w-20 h-20 rounded-full bg-[#029bba]/15 blur-md" />
            
            {/* Land Area Blueprint */}
            <div className="relative z-10 w-32 bg-white rounded-xl p-2.5 shadow-md border border-slate-200">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1.5">
                <span className="text-[9px] font-bold text-[#004063]">1 Kanal Land</span>
                <Scale className="w-3 h-3 text-[#029bba]" />
              </div>
              <div className="grid grid-cols-2 gap-1 text-[8px]">
                <div className="p-1 rounded bg-slate-50 border border-slate-100 text-center">
                  <span className="text-slate-400 block text-[7px]">Marla</span>
                  <strong className="text-slate-800">20</strong>
                </div>
                <div className="p-1 rounded bg-[#004063]/10 text-center">
                  <span className="text-slate-500 block text-[7px]">Sq. Ft.</span>
                  <strong className="text-[#004063]">4,500</strong>
                </div>
              </div>
              <div className="mt-1.5 text-center text-[7px] text-slate-500">
                500 Sq. Yards (Gaz)
              </div>
            </div>

            {/* Corner Measuring Badge */}
            <div className="absolute left-4 top-3 px-2 py-0.5 rounded-full bg-[#004063] text-white text-[8px] font-bold">
              Pakistani Standards
            </div>
          </div>
        );

      case 'construction':
        return (
          <div className="relative w-full h-36 bg-gradient-to-br from-[#00314d]/10 via-[#004063]/15 to-[#029bba]/10 rounded-2xl flex items-center justify-center overflow-hidden border border-[#004063]/15">
            <div className="relative z-10 w-32 bg-white rounded-xl p-2.5 shadow-md border border-slate-200">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1.5">
                <span className="text-[9px] font-bold text-[#004063]">Grey + Finishing</span>
                <Building className="w-3 h-3 text-[#029bba]" />
              </div>
              <div className="space-y-1 text-[8px]">
                <div className="flex justify-between text-slate-600">
                  <span>Covered Area:</span>
                  <strong>2,250 sqft</strong>
                </div>
                <div className="flex justify-between text-[#004063] font-bold">
                  <span>Standard Rate:</span>
                  <span>PKR 5,300/sqft</span>
                </div>
                <div className="pt-1 border-t border-slate-100 text-center font-black text-[#004063] text-[9px]">
                  Est: PKR 1.19 Cr
                </div>
              </div>
            </div>

            <div className="absolute right-4 top-3 w-8 h-8 rounded-full bg-[#029bba] text-white flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
        );

      case 'roi':
        return (
          <div className="relative w-full h-36 bg-gradient-to-br from-[#00314d]/10 via-[#004063]/15 to-[#029bba]/10 rounded-2xl flex items-center justify-center overflow-hidden border border-[#004063]/15">
            <div className="relative z-10 w-32 bg-[#004063] text-white rounded-xl p-2.5 shadow-md border border-[#004063]/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] uppercase tracking-wider text-[#8fc2d0] font-bold">Rental Yield</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-base font-black text-emerald-400">
                7.2% <span className="text-[8px] font-normal text-slate-200">p.a.</span>
              </div>
              <div className="mt-1 pt-1 border-t border-white/20 text-[7px] text-slate-300 flex justify-between">
                <span>5-Yr Capital Gain:</span>
                <span className="font-bold text-white">+52%</span>
              </div>
            </div>

            <div className="absolute right-4 bottom-3 w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#004063]">
              <PieChart className="w-4 h-4 text-[#004063]" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. RECENT PROPERTY SEARCH CRITERIA SHELF */}
      <RecentSearchesShelf />

      {/* 2. RESEARCH & FINANCIAL TOOLS CAROUSEL */}
      <div className="space-y-6">
        {/* Header with Navigation Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#004063]/5 text-[#004063] border border-[#004063]/10 mb-2">
              <Calculator className="w-3.5 h-3.5 text-[#029bba]" />
              <span>Interactive Financial Planning</span>
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Property Research & Financial Tools
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Calculate your borrowing power, monthly installment EMIs, area conversions, and transparent financial options in Pakistan.
            </p>
          </div>

        {/* Carousel Prev/Next Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-end">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Previous tools"
            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:border-[#004063] hover:bg-[#004063] text-slate-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Next tools"
            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:border-[#004063] hover:bg-[#004063] text-slate-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-slate-300"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {TOOLS_LIST.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onOpenTool(tool.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenTool(tool.id);
              }
            }}
            className="group shrink-0 w-[270px] sm:w-[290px] snap-start bg-white rounded-2xl border border-slate-200/90 hover:border-[#004063] shadow-xs hover:shadow-lg transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between cursor-pointer text-left"
          >
            <div>
              {/* Top Text & Tag */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#004063]/5 text-[#004063] border border-[#004063]/10">
                  {tool.tag}
                </span>
              </div>

              <h3 className="font-heading font-extrabold text-slate-900 text-base sm:text-lg leading-tight group-hover:text-[#004063] transition-colors">
                {tool.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4 line-clamp-2 leading-relaxed">
                {tool.subtitle}
              </p>

              {/* Vector Visual in Primary #004063 Palette */}
              <div className="mb-4 group-hover:scale-[1.02] transition-transform duration-300">
                {renderVisual(tool.visualType)}
              </div>
            </div>

            {/* Bottom Row with Primary Button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-[#004063] group-hover:text-[#029bba] transition-colors">
                Calculate Now
              </span>
              <div className="w-9 h-9 rounded-full bg-[#004063] text-white flex items-center justify-center group-hover:bg-[#029bba] group-hover:translate-x-1 transition-all shadow-xs">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
};
