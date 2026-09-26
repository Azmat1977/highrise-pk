/**
 * components/projects/SeoLocalityGuide.tsx
 *
 * Dynamic SEO & Locality Guide for /projects page.
 * Provides indexable, high-relevance Pakistani real estate content for Google crawlers.
 * Dynamically adjusts authority, hotspots, and market advice based on selected city filter.
 *
 * Rules Enforced:
 *   - Tailwind CSS ONLY (rounded-2xl, 1120px container compliant)
 *   - Lucide React icons ONLY
 *   - 100% pure ASCII characters (no emoji, no em-dashes, no box-drawing)
 *   - Next.js Link tags for indexable internal navigation
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, TrendingUp, Building2, MapPin, ExternalLink } from 'lucide-react';

interface SeoLocalityGuideProps {
  city?: string;
}

interface CityMarketConfig {
  authority: string;
  hotspots: string[];
  priceGuidance: string;
  intro: string;
}

const CITY_MARKET_DATA: Record<string, CityMarketConfig> = {
  Islamabad: {
    authority: 'CDA (Capital Development Authority)',
    hotspots: ['F-11 Markaz', 'H-13', 'DHA Phase 2', 'Gulberg Greens', 'E-11', 'B-17'],
    priceGuidance: 'Apartment prices in Islamabad range from PKR 75 Lakh for executive 1-bed units in H-13 to PKR 4.5 Crore for 3-bed suites in F-11 and E-11.',
    intro: 'Islamabad real estate market is defined by high institutional demand, stringent CDA building codes, and steady capital appreciation across residential towers and commercial plazas.',
  },
  Lahore: {
    authority: 'LDA (Lahore Development Authority)',
    hotspots: ['Gulberg III', 'DHA Phase 5 & 6', 'Johar Town', 'Bahria Town', 'MM Alam Road'],
    priceGuidance: 'Commercial shop prices in Gulberg start at PKR 1.8 Crore, while 2-bed luxury residences in DHA Phase 5 range between PKR 2.2 Crore and PKR 3.8 Crore.',
    intro: 'Lahore vertical development is expanding rapidly in Gulberg and DHA, driven by commercial high-rises, mixed-use retail plazas, and luxury apartment towers.',
  },
  Karachi: {
    authority: 'SBCA (Sindh Building Control Authority) & KDA',
    hotspots: ['Clifton Phase 8', 'DHA Phase 5 & 6', 'PECHS', 'North Nazimabad', 'Scheme 33'],
    priceGuidance: 'Oceanfront luxury penthouses in Clifton Phase 8 range from PKR 4.5 Crore to PKR 18 Crore, while mid-tier residential flats in PECHS start at PKR 1.2 Crore.',
    intro: 'Karachi property directory covers coastal luxury developments, commercial office towers, and high-density residential plazas verified against SBCA master plans.',
  },
  Rawalpindi: {
    authority: 'RDA (Rawalpindi Development Authority)',
    hotspots: ['Bahria Town Phase 8', 'Saddar', 'Gulraiz', 'Adyala Road', 'DHA Phase 1'],
    priceGuidance: 'Apartment options in Bahria Town Phase 8 range from PKR 95 Lakh for 2-bed flats to PKR 2.4 Crore for 3-bed corner units with flexible 3-year installment plans.',
    intro: 'Rawalpindi is a high-yield commercial and residential hub connecting Islamabad via CPEC and GT Road routes, featuring master-planned communities and high-rise plazas.',
  },
};

const DEFAULT_MARKET_DATA: CityMarketConfig = {
  authority: 'relevant development authority (CDA, LDA, RDA, SBCA, or DHA)',
  hotspots: ['Islamabad F-11', 'Lahore Gulberg', 'Karachi Clifton', 'Rawalpindi Bahria Town'],
  priceGuidance: 'Project prices across major Pakistani cities start from PKR 35 Lakh for housing society plot files and PKR 75 Lakh for executive residential apartments.',
  intro: 'Highrise.pk directory indexes verified new real estate projects across Pakistan, offering direct developer pricing, transparent installment plans, and authority documentation.',
};

const POPULAR_CITIES = [
  { name: 'Islamabad', count: '12+ Projects' },
  { name: 'Lahore', count: '15+ Projects' },
  { name: 'Karachi', count: '10+ Projects' },
  { name: 'Rawalpindi', count: '8+ Projects' },
  { name: 'Peshawar', count: '5+ Projects' },
  { name: 'Multan', count: '4+ Projects' },
  { name: 'Faisalabad', count: '6+ Projects' },
  { name: 'Sialkot', count: '3+ Projects' },
];

export function SeoLocalityGuide({ city }: SeoLocalityGuideProps): React.ReactElement {
  const activeCity = city && CITY_MARKET_DATA[city] ? city : null;
  const config = activeCity ? CITY_MARKET_DATA[activeCity] : DEFAULT_MARKET_DATA;

  return (
    <section
      aria-labelledby="locality-guide-heading"
      className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-6 mt-10 shadow-sm"
    >
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-bold mb-2">
          <Building2 className="w-3.5 h-3.5" />
          <span>Real Estate Intelligence Guide</span>
        </div>
        <h2
          id="locality-guide-heading"
          className="text-xl md:text-2xl font-black text-[#004063] tracking-tight"
        >
          {activeCity
            ? `Property Investment & New Projects in ${activeCity}`
            : 'Explore Verified New Projects & Real Estate in Pakistan'}
        </h2>
        <p className="text-xs md:text-sm text-gray-600 leading-relaxed mt-2">
          {config.intro}
        </p>
      </div>

      {/* 3-Column Structured Market Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {/* Column 1: Authority & Legal Clearance */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>NOC &amp; Legal Approval</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Every project in {activeCity || 'Pakistan'} is cross-referenced against {config.authority} layout plans and registration records to protect buyers from illegal sub-divisions.
          </p>
        </div>

        {/* Column 2: Payment Plans & Pricing */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-[#029bba] font-bold text-sm">
            <TrendingUp className="w-4 h-4 text-[#029bba] flex-shrink-0" />
            <span>Installments &amp; Pricing</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {config.priceGuidance} Typical installment schedules span 3 to 4 years with 10% to 20% down payment requirements.
          </p>
        </div>

        {/* Column 3: Verification Protocol */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-[#004063] font-bold text-sm">
            <Building2 className="w-4 h-4 text-[#004063] flex-shrink-0" />
            <span>Physical Progress Audit</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Highrise Shield evaluates developer track records, ground excavation progress, and delivery timelines to assign objective trust scores from 0 to 100.
          </p>
        </div>
      </div>

      {/* Hotspots Bar */}
      {config.hotspots.length > 0 && (
        <div className="p-4 rounded-xl bg-[#029bba]/5 border border-[#029bba]/15 space-y-2">
          <p className="text-xs font-bold text-[#004063] uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
            <span>High-Demand Areas in {activeCity || 'Pakistan'}:</span>
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {config.hotspots.map((area, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-2xs"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Internal Navigation Link Hub for Google Crawlers */}
      <div className="pt-4 border-t border-gray-100 space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Browse Projects in Top Pakistani Cities
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {POPULAR_CITIES.map((c) => {
            const isSelected = activeCity === c.name;
            return (
              <Link
                key={c.name}
                href={`/projects/in/${encodeURIComponent(c.name.toLowerCase())}`}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#029bba] text-white border-[#029bba]'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#029bba] hover:text-[#029bba] hover:bg-white'
                }`}
              >
                <span>{c.name}</span>
                <ExternalLink className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default SeoLocalityGuide;