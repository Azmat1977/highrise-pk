// components/project-detail/ChooseYourSpace.tsx
// ═══════════════════════════════════════════════════════════════
// CHOOSE YOUR SPACE — Highrise.pk Signature Section V3.3
// Row-based layout · shared size-unit conversion · unified pricing
// Per-row CTAs removed — inquiry handled by sidebar + sticky bar.
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  Home,
  Store,
  Building2,
  Hotel,
  Sparkles,
  Shield,
  ChevronDown,
} from 'lucide-react';
import type {
  ProjectDetailData,
  UnitTypeOffering,
} from '@/types/projectDetail';
import { formatDetailPrice } from '@/types/projectDetail';
import PriceWithConverter from '@/components/shared/CurrencyConverter';

// ============================================
// TYPES
// ============================================

interface ChooseYourSpaceProps {
  project: ProjectDetailData;
}

type CategoryFilter = 'all' | 'residential' | 'commercial' | 'hotel';

interface CategoryInfo {
  key: CategoryFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

type SizeUnit = 'sqft' | 'marla' | 'kanal' | 'sqyd' | 'sqm' | 'acre';

// ============================================
// SIZE CONVERSION — Pakistani market units
// Flow: source unit (any) → sqft → shared target unit
// ============================================

const SIZE_UNITS: { value: SizeUnit; label: string; sqftFactor: number }[] = [
  { value: 'sqft',  label: 'Sq Ft', sqftFactor: 1 },
  { value: 'marla', label: 'Marla', sqftFactor: 272.25 },
  { value: 'kanal', label: 'Kanal', sqftFactor: 5445 },
  { value: 'sqyd',  label: 'Sq Yd', sqftFactor: 9 },
  { value: 'sqm',   label: 'Sq M',  sqftFactor: 10.7639 },
  { value: 'acre',  label: 'Acre',  sqftFactor: 43560 },
];

const SOURCE_TO_SQFT: Record<string, number> = {
  sqft: 1, 'sq.ft': 1, 'sq ft': 1, 'sq. ft': 1,
  sqyd: 9, 'sq.yd': 9, 'sq yd': 9, 'sq. yd': 9,
  sqyard: 9, 'sq.yard': 9, 'sq yard': 9, 'sq. yard': 9, gaz: 9,
  sqm: 10.7639, 'sq.m': 10.7639, 'sq m': 10.7639, 'sq. m': 10.7639,
  marla: 272.25,
  kanal: 5445,
  acre: 43560,
};

function toSqft(value: number, unit: string): number {
  const factor = SOURCE_TO_SQFT[(unit ?? '').trim().toLowerCase()] ?? 1;
  return value * factor;
}

function formatConvertedArea(sqft: number, target: SizeUnit): string {
  const factor = SIZE_UNITS.find(u => u.value === target)?.sqftFactor ?? 1;
  const value = sqft / factor;
  if (value >= 100) return Math.round(value).toLocaleString('en-US');
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function getUnitSqftRange(ut: UnitTypeOffering): { minSqft: number; maxSqft: number } {
  const rawMin = ut.areaRange?.min ?? ut.minArea ?? 0;
  const rawMax = ut.areaRange?.max ?? ut.maxArea ?? 0;
  const unit = ut.areaRange?.unit ?? ut.areaUnit ?? 'sqft';
  const min = rawMin > 0 ? toSqft(rawMin, unit) : 0;
  const max = rawMax > 0 ? toSqft(rawMax, unit) : 0;
  // Defensive: ensure ascending order on malformed data
  if (min > 0 && max > 0 && min > max) {
    return { minSqft: max, maxSqft: min };
  }
  return { minSqft: min, maxSqft: max };
}

function getAreaDisplay(minSqft: number, maxSqft: number, target: SizeUnit): string {
  const label = SIZE_UNITS.find(u => u.value === target)?.label ?? 'Sq Ft';
  if (minSqft <= 0 && maxSqft <= 0) return '—';
  if (minSqft <= 0 || maxSqft <= 0) {
    return `${formatConvertedArea(Math.max(minSqft, maxSqft), target)} ${label}`;
  }
  if (minSqft === maxSqft) {
    return `${formatConvertedArea(minSqft, target)} ${label}`;
  }
  return `${formatConvertedArea(minSqft, target)} — ${formatConvertedArea(maxSqft, target)} ${label}`;
}

// ============================================
// CATEGORY + PRICE HELPERS
// ============================================

function getUnitCategory(ut: UnitTypeOffering): 'residential' | 'commercial' | 'hotel' {
  if (ut.category === 'commercial') return 'commercial';
  if (ut.category === 'residential') {
    const name = (ut.name || ut.type || '').toLowerCase();
    if (name.includes('hotel') || name.includes('suite')) return 'hotel';
    return 'residential';
  }
  const name = (ut.name || ut.type || '').toLowerCase();
  if (['shop', 'office', 'food', 'commercial', 'showroom', 'warehouse', 'retail'].some(t => name.includes(t))) {
    return 'commercial';
  }
  if (['hotel', 'suite'].some(t => name.includes(t))) {
    return 'hotel';
  }
  return 'residential';
}

function getCategoryIcon(category: 'residential' | 'commercial' | 'hotel') {
  if (category === 'commercial') return Store;
  if (category === 'hotel') return Hotel;
  return Home;
}

function getPriceRange(ut: UnitTypeOffering): { min: number; max: number } {
  const min = ut.priceRange?.min ?? ut.minPrice ?? 0;
  const max = ut.priceRange?.max ?? ut.maxPrice ?? 0;
  return { min, max };
}

/**
 * getPerSqftRange
 * Auto-calculated per-sqft cost (min and max) — buyer value signal.
 * Formula: minPrice / minSqft → maxPrice / maxSqft.
 * Returns null unless BOTH price and area data exist (never invented).
 * Units: displays per Sq Ft (industry-standard comparison basis).
 */
function getPerSqftRange(
  minPrice: number,
  maxPrice: number,
  minSqft: number,
  maxSqft: number,
): { min: number; max: number } | null {
  if (minSqft <= 0 || minPrice <= 0) return null;
  // Pair by offer: the min-priced unit and the max-priced unit each get
  // their own per-sqft rate. In real estate, larger units typically carry
  // a lower per-sqft rate — so display order follows the price order
  // (cheapest unit's rate first), NOT ascending numeric order.
  //   e.g. 7.5M/750 = 10,000 (cheaper unit) · 9.5M/1,050 = 9,048 (pricier)
  const rateLowPriceUnit = Math.round(minPrice / minSqft);
  if (maxPrice > minPrice && maxSqft > minSqft) {
    const rateHighPriceUnit = Math.round(maxPrice / maxSqft);
    return { min: rateLowPriceUnit, max: rateHighPriceUnit };
  }
  return { min: rateLowPriceUnit, max: rateLowPriceUnit };
}

// ============================================
// SUB-COMPONENTS
// ============================================

function MicroLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
      {children}
    </p>
  );
}

// VerificationBadge removed — hero verification tick is the single owner

function ProjectIdChip({ project }: { project: ProjectDetailData }): React.ReactElement | null {
  if (!project.projectId) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
      <Shield className="w-3 h-3 text-white/80" />
      <span className="text-[10px] font-mono font-bold text-white/90 tracking-wider">
        {project.projectId}
      </span>
    </div>
  );
}

/**
 * Unit Type ROW — aligned triple: Category | Area | Price
 * No per-row CTA (inquiry via sidebar + sticky bar).
 * Shared sizeUnit keeps every row in the same unit.
 */
function UnitTypeRow({
  ut,
  sizeUnit,
}: {
  ut: UnitTypeOffering;
  sizeUnit: SizeUnit;
}): React.ReactElement {
  const category = getUnitCategory(ut);
  const CategoryIcon = getCategoryIcon(category);
  const { min: minPrice, max: maxPrice } = getPriceRange(ut);
  const { minSqft, maxSqft } = getUnitSqftRange(ut);
  const areaDisplay = getAreaDisplay(minSqft, maxSqft, sizeUnit);

  const unitName = ut.name ?? ut.type ?? 'Unit Type';
  const available = ut.availableUnits ?? 0;
  const total = ut.totalUnits ?? 0;
  const soldOut = total > 0 && available === 0;

  // Meta line: 3 Bed · 2 Bath · 12 Available
  const metaParts: string[] = [];
  if ((ut.bedrooms ?? 0) > 0) metaParts.push(`${ut.bedrooms} Bed`);
  if ((ut.bathrooms ?? 0) > 0) metaParts.push(`${ut.bathrooms} Bath`);

  const hasPrice = minPrice > 0 || maxPrice > 0;
  const displayMin = minPrice > 0 ? minPrice : maxPrice;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 items-center py-4">

      {/* Col 1: Icon + Name + Meta (5 cols) */}
      <div className="lg:col-span-5 flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
          <CategoryIcon className="w-5 h-5 text-[#029bba]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-900 leading-tight truncate" title={unitName}>
            {unitName}
          </h3>
          {(metaParts.length > 0 || total > 0) && (
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-gray-500">
              {metaParts.length > 0 && (
                <span className="truncate">{metaParts.join(' · ')}</span>
              )}
              {total > 0 && !soldOut && (
                <span className="font-bold text-gray-700 whitespace-nowrap">
                  {total} {total === 1 ? 'Unit' : 'Units'}
                </span>
              )}
              {soldOut && (
                <span className="font-bold text-red-600 whitespace-nowrap">Sold Out</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Col 2: Area (3 cols) */}
      <div className="lg:col-span-3 lg:border-l lg:border-gray-100 lg:pl-4 min-w-0">
        <MicroLabel>Area</MicroLabel>
        <p className="text-sm font-bold text-gray-800 tabular-nums">
          {areaDisplay}
        </p>
      </div>

      {/* Col 3: Price + per-sqft + Currency Converter (4 cols) */}
      <div className="lg:col-span-4 lg:border-l lg:border-gray-100 lg:pl-4 min-w-0">
        <MicroLabel>Price</MicroLabel>
        {hasPrice && displayMin > 0 ? (
          <>
            {/* Price row — converter icon right-aligned, single baseline
                across every row (identical flex structure per row) */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-gray-800 tabular-nums whitespace-nowrap">
                PKR {formatDetailPrice(displayMin)}
                {maxPrice > displayMin && (
                  <span> — {formatDetailPrice(maxPrice)}</span>
                )}
              </p>
              <PriceWithConverter
                minPKR={displayMin}
                maxPKR={maxPrice > displayMin ? maxPrice : undefined}
                size="sm"
                align="right"
              />
            </div>

            {/* Auto-calculated per-sqft cost — value signal for buyers
                (residential / commercial / mixed — universal formula) */}
            {(() => {
              const per = getPerSqftRange(displayMin, maxPrice, minSqft, maxSqft);
              if (!per) return null;
              const fmt = (n: number) => n.toLocaleString('en-PK');
              return (
                <p className="text-[11px] font-semibold text-gray-500 tabular-nums mt-0.5 whitespace-nowrap">
                  ~ PKR {fmt(per.min)}
                  {per.max !== per.min && ` — ${fmt(per.max)}`}
                  {' '}/ sqft
                </p>
              );
            })()}
          </>
        ) : (
          <p className="text-sm font-bold text-gray-400">Contact for Price</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChooseYourSpace({
  project,
}: ChooseYourSpaceProps): React.ReactElement | null {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('sqft');

  const allOfferings = project.unitTypeBreakdown ?? [];

  const categorized = useMemo(() => {
    const residential: UnitTypeOffering[] = [];
    const commercial: UnitTypeOffering[] = [];
    const hotel: UnitTypeOffering[] = [];

    allOfferings.forEach((ut) => {
      const cat = getUnitCategory(ut);
      if (cat === 'commercial') commercial.push(ut);
      else if (cat === 'hotel') hotel.push(ut);
      else residential.push(ut);
    });

    return { residential, commercial, hotel };
  }, [allOfferings]);

  const filteredOfferings = useMemo(() => {
    if (activeCategory === 'all') return allOfferings;
    if (activeCategory === 'residential') return categorized.residential;
    if (activeCategory === 'commercial') return categorized.commercial;
    if (activeCategory === 'hotel') return categorized.hotel;
    return allOfferings;
  }, [activeCategory, allOfferings, categorized]);

  const stats = useMemo(() => {
    const allPrices = allOfferings.flatMap((ut) => {
      const { min, max } = getPriceRange(ut);
      return [min, max].filter((p) => p > 0);
    });

    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
    const totalUnits = allOfferings.reduce(
      (sum, ut) => sum + (ut.totalUnits ?? 0), 0
    );
    const availableUnits = allOfferings.reduce(
      (sum, ut) => sum + (ut.availableUnits ?? 0), 0
    );

    return { minPrice, maxPrice, totalUnits, availableUnits };
  }, [allOfferings]);

  // Category-aware aggregate label — synchronized with actual unit data:
  // all residential apartments → "Apartments" · plots → "Plots" ·
  // all commercial → "Shops & Offices" · hotel → "Hotel Suites" · mixed → "Units"
  const unitsLabel = useMemo(() => {
    if (allOfferings.length === 0) return 'Units';
    const cats = new Set(allOfferings.map(ut => getUnitCategory(ut)));
    if (cats.size !== 1) return 'Units';
    const only = [...cats][0] ?? 'residential';
    if (only === 'hotel') return 'Hotel Suites';
    if (only === 'commercial') return 'Shops & Offices';
    const names = allOfferings.map(ut => (ut.name ?? ut.type ?? '').toLowerCase());
    if (names.some(n => n.includes('plot') || n.includes('marla') || n.includes('kanal'))) {
      return 'Plots';
    }
    return 'Apartments';
  }, [allOfferings]);

  const categoryTabs: CategoryInfo[] = [
    { key: 'all', label: 'All Types', icon: Building2 },
    { key: 'residential', label: 'Residential', icon: Home },
    { key: 'commercial', label: 'Commercial', icon: Store },
    { key: 'hotel', label: 'Hotel Suites', icon: Hotel },
  ];

  const visibleTabs = categoryTabs.filter((tab) => {
    if (tab.key === 'all') return allOfferings.length > 0;
    if (tab.key === 'residential') return categorized.residential.length > 0;
    if (tab.key === 'commercial') return categorized.commercial.length > 0;
    if (tab.key === 'hotel') return categorized.hotel.length > 0;
    return false;
  });

  if (allOfferings.length === 0) return null;

  return (
    <section
      id="units"
      className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
    >
      {/* HEADER — brand gradient (signature) */}
      <div className="px-6 py-6 bg-gradient-to-br from-[#029bba] via-[#017a94] to-[#004063]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white leading-tight">
                Choose Your Space
              </h2>
              {stats.minPrice > 0 && (
                <p className="text-sm text-white/80 mt-1">
                  <span className="font-bold text-white">
                    PKR {formatDetailPrice(stats.minPrice)}
                    {stats.maxPrice > stats.minPrice && (
                      <span> — {formatDetailPrice(stats.maxPrice)}</span>
                    )}
                  </span>
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <ProjectIdChip project={project} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            {stats.totalUnits > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <span className="text-[11px] font-black text-white whitespace-nowrap">
                  Total {unitsLabel} {stats.totalUnits}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CATEGORY TABS */}
      {visibleTabs.length > 1 && (
        <div className="px-6 py-4 border-b border-gray-100 overflow-x-auto scrollbar-none bg-gradient-to-b from-gray-50 to-white">
          <div className="flex gap-2">
            {visibleTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeCategory === tab.key;
              const count =
                tab.key === 'all'
                  ? allOfferings.length
                  : tab.key === 'residential'
                  ? categorized.residential.length
                  : tab.key === 'commercial'
                  ? categorized.commercial.length
                  : categorized.hotel.length;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-[#029bba] to-[#004063] text-white shadow-md shadow-[#029bba]/20'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SIZE UNIT SELECTOR — shared across all rows */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {filteredOfferings.length} {filteredOfferings.length === 1 ? 'type' : 'types'}
        </p>
        <div className="flex items-center gap-2">
          <label
            htmlFor="size-unit-select"
            className="text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap"
          >
            Sizes in
          </label>
          <div className="relative">
            <select
              id="size-unit-select"
              value={sizeUnit}
              onChange={(e) => setSizeUnit(e.target.value as SizeUnit)}
              aria-label="Select size unit"
              className="appearance-none pl-3 pr-8 py-1.5 text-sm font-bold text-gray-800 bg-white border border-gray-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
            >
              {SIZE_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ROWS — divide-y list, no card chrome */}
      <div className="bg-white px-4 sm:px-6 divide-y divide-gray-100">
        {filteredOfferings.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No units in this category</p>
          </div>
        ) : (
          filteredOfferings.map((ut, idx) => (
            <UnitTypeRow
              key={`${ut.name ?? ut.type ?? 'unit'}-${idx}`}
              ut={ut}
              sizeUnit={sizeUnit}
            />
          ))
        )}
      </div>
    </section>
  );
}