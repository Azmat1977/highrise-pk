import React from 'react';
import { PropertyValuationTool } from '../components/PropertyValuationTool.tsx';
import { Breadcrumbs } from '../components/Breadcrumbs.tsx';
import { ShieldCheck, Calculator, TrendingUp, Sparkles } from 'lucide-react';

export const ValuationPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Tools', path: '/#tools' },
          { label: 'Property Valuation' },
        ]}
      />

      {/* Hero Banner Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#002236] to-[#004063] text-white p-6 sm:p-10 overflow-hidden shadow-lg border border-[#004063]/30">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#029bba]/20 text-[#38aec7] border border-[#029bba]/40">
            <Sparkles className="w-3.5 h-3.5 text-[#38aec7]" />
            <span>Pakistani Market Intelligence 2026</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
            Instant Property Valuation Engine
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-light">
            Estimate the fair market price of any house, flat, residential plot, or commercial unit across Islamabad, Lahore, Karachi, and Rawalpindi based on real live listings.
          </p>
        </div>
      </div>

      {/* Main Tool */}
      <PropertyValuationTool />
    </div>
  );
};
