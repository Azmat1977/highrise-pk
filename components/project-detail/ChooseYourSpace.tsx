// components/project-detail/ChooseYourSpace.tsx
// ═══════════════════════════════════════════════════════════════
// CHOOSE YOUR SPACE — Highrise.pk Signature Section V3.2
// Clean row design — no column labels, unified pricing, perfect alignment
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  Home,
  Store,
  Building2,
  Hotel,
  Bed,
  Bath,
  Ruler,
  TrendingUp,
  Flame,
  Zap,
  Shield,
  BadgeCheck,
  ArrowRight,
  Sparkles,
  DollarSign,
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
  onInquire: (unitTypeName?: string) => void;
}

type CategoryFilter = 'all' | 'residential' | 'commercial' | 'hotel';

interface CategoryInfo {
  key: CategoryFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ============================================
// HELPERS
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

function marlaToSqft(marla: number): number {
  return Math.round(marla * 272.25);
}

function sqftToMarla(sqft: number): number {
  return Math.round((sqft / 272.25) * 100) / 100;
}

function getDualSizeDisplay(ut: UnitTypeOffering): {
  primary: string;
  secondary: string;
} {
  const minArea = ut.areaRange?.min ?? ut.minArea ?? 0;
  const maxArea = ut.areaRange?.max ?? ut.maxArea ?? 0;
  const areaUnit = (ut.areaRange?.unit ?? ut.areaUnit ?? 'sqft').toLowerCase();

  if (minArea === 0 || maxArea === 0) {
    return { primary: '—', secondary: '' };
  }

  const isMarla = areaUnit.includes('marla');
  const isSqft = areaUnit.includes('sq') || areaUnit === 'sqft';

  if (isMarla) {
    const minSqft = marlaToSqft(minArea);
    const maxSqft = marlaToSqft(maxArea);
    return {
      primary: `${minArea} - ${maxArea} Marla`,
      secondary: `${minSqft.toLocaleString()} - ${maxSqft.toLocaleString()} sqft`,
    };
  }

  if (isSqft) {
    const minMarla = sqftToMarla(minArea);
    const maxMarla = sqftToMarla(maxArea);
    return {
      primary: `${minArea.toLocaleString()} - ${maxArea.toLocaleString()} sqft`,
      secondary: `${minMarla} - ${maxMarla} Marla`,
    };
  }

  return {
    primary: `${minArea} - ${maxArea} ${areaUnit}`,
    secondary: '',
  };
}

function getPriceRange(ut: UnitTypeOffering): { min: number; max: number } {
  const min = ut.priceRange?.min ?? ut.minPrice ?? 0;
  const max = ut.priceRange?.max ?? ut.maxPrice ?? 0;
  return { min, max };
}

// ============================================
// SUB-COMPONENTS
// ============================================

function VerificationBadge({ project }: { project: ProjectDetailData }): React.ReactElement | null {
  if (!project.isVerified) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
      <BadgeCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
      <span className="text-[11px] font-black text-white uppercase tracking-wider whitespace-nowrap">
        Highrise Verified
      </span>
    </div>
  );
}

function ProjectIdChip({ project }: { project: ProjectDetailData }): React.ReactElement | null {
  const projectId = (project as unknown as { projectId?: string }).projectId;
  if (!projectId) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
      <Shield className="w-3 h-3 text-white/80" />
      <span className="text-[10px] font-mono font-bold text-white/90 tracking-wider">
        {projectId}
      </span>
    </div>
  );
}

/**
 * Unit Type ROW — Clean, aligned, no column labels
 * Uses 12-col grid with balanced weights
 */
function UnitTypeRow({
  ut,
  onInquire,
}: {
  ut: UnitTypeOffering;
  onInquire: (name?: string) => void;
}): React.ReactElement {
  const category = getUnitCategory(ut);
  const CategoryIcon = getCategoryIcon(category);
  const { min: minPrice, max: maxPrice } = getPriceRange(ut);
  const { primary: sizePrimary, secondary: sizeSecondary } = getDualSizeDisplay(ut);
  const unitName = ut.name ?? ut.type ?? 'Unit Type';

  const available = ut.availableUnits ?? 0;
  const total = ut.totalUnits ?? 0;

  const extendedUt = ut as unknown as {
    avgRentalYield?: number;
    isFastSelling?: boolean;
    hotDealsCount?: number;
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 hover:border-[#029bba]/40 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Left accent bar with brand gradient */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#029bba] to-[#004063]" />

      <div className="p-5 pl-6">
        {/* ══════════════════════════════════════════
            MAIN ROW — 12-col grid, no headers
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-4 items-center">

          {/* ── Column 1: Icon + Name (3 cols) ── */}
          <div className="flex items-center gap-3 lg:col-span-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center shrink-0 shadow-md shadow-[#029bba]/20">
              <CategoryIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-gray-900 leading-tight truncate" title={unitName}>
                {unitName}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mt-1">
                {category === 'hotel' ? 'Hotel Suite' : category}
              </p>
            </div>
          </div>

          {/* ── Column 2: Price (Unified Style) (3 cols) ── */}
          <div className="lg:col-span-3 min-w-0 lg:border-l lg:border-gray-200 lg:pl-4">
            {(minPrice > 0 || maxPrice > 0) ? (
              <>
                <div className="flex items-center gap-2">
                  {/* Both prices — SAME size, SAME gray color */}
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-base font-bold text-gray-800 whitespace-nowrap">
                      PKR {formatDetailPrice(minPrice)}
                    </span>
                    {maxPrice > minPrice && (
                      <>
                        <span className="text-gray-400 text-sm">—</span>
                        <span className="text-base font-bold text-gray-800 whitespace-nowrap">
                          {formatDetailPrice(maxPrice)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Currency Converter Icon */}
                  <PriceWithConverter
                    minPKR={minPrice}
                    maxPKR={maxPrice > minPrice ? maxPrice : undefined}
                    displayText=""
                    size="sm"
                    align="right"
                  />
                </div>
              </>
            ) : (
              <span className="text-sm font-bold text-gray-400">Contact for Price</span>
            )}
          </div>

          {/* ── Column 3: Size (3 cols — WIDER to prevent overflow) ── */}
          <div className="lg:col-span-3 min-w-0 lg:border-l lg:border-gray-200 lg:pl-4">
            {sizePrimary !== '—' ? (
              <div className="flex items-start gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-[#029bba] shrink-0 mt-1" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 leading-tight whitespace-nowrap">
                    {sizePrimary}
                  </p>
                  {sizeSecondary && (
                    <p className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                      {sizeSecondary}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>

          {/* ── Column 4: Layout (Beds/Baths) (2 cols) ── */}
          <div className="lg:col-span-2 min-w-0 lg:border-l lg:border-gray-200 lg:pl-4">
            {((ut.bedrooms ?? 0) > 0 || (ut.bathrooms ?? 0) > 0) ? (
              <div className="flex flex-wrap gap-1.5">
                {(ut.bedrooms ?? 0) > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-br from-[#029bba]/10 to-[#004063]/5 rounded-lg border border-[#029bba]/20 whitespace-nowrap">
                    <Bed className="w-3 h-3 text-[#029bba]" />
                    <span className="text-xs font-black text-[#004063]">
                      {ut.bedrooms} {(ut.bedrooms ?? 0) === 1 ? 'Bed' : 'Beds'}
                    </span>
                  </div>
                )}
                {(ut.bathrooms ?? 0) > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-br from-[#029bba]/10 to-[#004063]/5 rounded-lg border border-[#029bba]/20 whitespace-nowrap">
                    <Bath className="w-3 h-3 text-[#029bba]" />
                    <span className="text-xs font-black text-[#004063]">
                      {ut.bathrooms} {(ut.bathrooms ?? 0) === 1 ? 'Bath' : 'Baths'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>

          {/* ── Column 5: Availability + Signals (1 col) ── */}
          <div className="lg:col-span-1 min-w-0 lg:border-l lg:border-gray-200 lg:pl-4">
            <div className="space-y-1.5">
              {available > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full text-[10px] font-black text-green-700 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                  {available}
                </span>
              ) : total > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-full text-[10px] font-black text-red-700 whitespace-nowrap">
                  Sold Out
                </span>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}

              {/* Compact investment signals */}
              <div className="flex flex-wrap gap-1">
                {extendedUt.avgRentalYield && extendedUt.avgRentalYield > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#029bba]/10 border border-[#029bba]/20 rounded text-[9px] font-black text-[#029bba]"
                    title={`Rental Yield: ${extendedUt.avgRentalYield.toFixed(1)}%`}
                  >
                    <TrendingUp className="w-2 h-2" />
                    {extendedUt.avgRentalYield.toFixed(1)}%
                  </span>
                )}
                {extendedUt.isFastSelling && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[9px] font-black text-amber-700"
                    title="Selling Fast"
                  >
                    <Zap className="w-2 h-2" />
                  </span>
                )}
                {extendedUt.hotDealsCount && extendedUt.hotDealsCount > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-[9px] font-black text-red-700"
                    title={`${extendedUt.hotDealsCount} Hot Deals`}
                  >
                    <Flame className="w-2 h-2" />
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════
            BOTTOM CTA BAR
        ══════════════════════════════════════════ */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={() => onInquire(unitName)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#02a8c9] hover:to-[#00507a] text-white font-bold text-sm rounded-xl shadow-md shadow-[#029bba]/20 hover:shadow-lg hover:shadow-[#029bba]/30 transition-all duration-200 group/btn whitespace-nowrap w-full sm:w-auto"
          >
            <span>Inquire About {unitName}</span>
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChooseYourSpace({
  project,
  onInquire,
}: ChooseYourSpaceProps): React.ReactElement | null {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

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

    const totalUnits = allOfferings.reduce((sum, ut) => sum + (ut.totalUnits ?? 0), 0);
    const availableUnits = allOfferings.reduce((sum, ut) => sum + (ut.availableUnits ?? 0), 0);

    return { minPrice, maxPrice, totalUnits, availableUnits };
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
      {/* ══════════════════════════════════════
          HEADER — Beautiful Brand Gradient
      ══════════════════════════════════════ */}
      <div className="relative px-6 py-6 bg-gradient-to-br from-[#029bba] via-[#017a94] to-[#004063] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white leading-tight">
                Choose Your Space
              </h2>
              <p className="text-sm text-white/80 mt-1">
                {allOfferings.length} unit {allOfferings.length === 1 ? 'type' : 'types'} available
                {stats.minPrice > 0 && (
                  <>
                    {' '}·{' '}
                    <span className="font-bold text-white">
                      From PKR {formatDetailPrice(stats.minPrice)}
                    </span>
                  </>
                )}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <ProjectIdChip project={project} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <VerificationBadge project={project} />
            {stats.availableUnits > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 backdrop-blur-md rounded-full border border-green-300/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                <span className="text-[11px] font-black text-white whitespace-nowrap">
                  {stats.availableUnits} unit{stats.availableUnits > 1 ? 's' : ''} available
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CATEGORY TABS
      ══════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════
          UNIT TYPE ROWS
      ══════════════════════════════════════ */}
      <div className="p-4 sm:p-6 space-y-3 bg-gradient-to-b from-gray-50/50 to-white">
        {filteredOfferings.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No units in this category</p>
          </div>
        ) : (
          filteredOfferings.map((ut, idx) => (
            <UnitTypeRow
              key={`${ut.type}-${idx}`}
              ut={ut}
              onInquire={onInquire}
            />
          ))
        )}
      </div>

      {/* ══════════════════════════════════════
          BOTTOM SUMMARY BAR
      ══════════════════════════════════════ */}
      {allOfferings.length > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-[#029bba]/5 via-white to-[#004063]/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                Unit Types
              </p>
              <p className="text-lg font-black bg-gradient-to-r from-[#029bba] to-[#004063] bg-clip-text text-transparent">
                {allOfferings.length}
              </p>
            </div>
            {stats.totalUnits > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                  Total Units
                </p>
                <p className="text-lg font-black text-gray-900">
                  {stats.totalUnits}
                </p>
              </div>
            )}
            {stats.availableUnits > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                  Available
                </p>
                <p className="text-lg font-black text-green-600">
                  {stats.availableUnits}
                </p>
              </div>
            )}
            {stats.minPrice > 0 && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                    From
                  </p>
                  <PriceWithConverter
                    minPKR={stats.minPrice}
                    maxPKR={stats.maxPrice > stats.minPrice ? stats.maxPrice : undefined}
                    displayText=""
                    size="sm"
                    align="right"
                  />
                </div>
                <p className="text-sm font-bold text-gray-800">
                  PKR {formatDetailPrice(stats.minPrice)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}