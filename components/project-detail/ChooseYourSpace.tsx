// components/project-detail/ChooseYourSpace.tsx
// ═══════════════════════════════════════════════════════════════
// CHOOSE YOUR SPACE — Highrise.pk Signature Section
// Modern, elegant, trust-first mixed-use offerings display
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
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
  CheckCircle2,
  Shield,
  BadgeCheck,
  ChevronRight,
  Square,
  ArrowRight,
  Sparkles,
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
  color: string;
  bgActive: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Categorize unit type by name/category field
 * Handles residential (apartments), commercial (shops/offices), hotel suites
 */
function getUnitCategory(ut: UnitTypeOffering): 'residential' | 'commercial' | 'hotel' {
  if (ut.category === 'commercial') return 'commercial';
  if (ut.category === 'residential') {
    const name = (ut.name || ut.type || '').toLowerCase();
    if (name.includes('hotel') || name.includes('suite')) return 'hotel';
    return 'residential';
  }
  // Auto-detect from name
  const name = (ut.name || ut.type || '').toLowerCase();
  if (['shop', 'office', 'food', 'commercial', 'showroom', 'warehouse', 'retail'].some(t => name.includes(t))) {
    return 'commercial';
  }
  if (['hotel', 'suite'].some(t => name.includes(t))) {
    return 'hotel';
  }
  return 'residential';
}

/**
 * Get category icon component
 */
function getCategoryIcon(category: 'residential' | 'commercial' | 'hotel') {
  if (category === 'commercial') return Store;
  if (category === 'hotel') return Hotel;
  return Home;
}

/**
 * Convert Marla to Sqft (1 Marla = 272.25 sqft, Lahore standard)
 */
function marlaToSqft(marla: number): number {
  return Math.round(marla * 272.25);
}

/**
 * Convert Sqft to Marla
 */
function sqftToMarla(sqft: number): number {
  return Math.round((sqft / 272.25) * 100) / 100;
}

/**
 * Get dual size display (Marla + Sqft)
 */
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

/**
 * Get price range for a unit type
 */
function getPriceRange(ut: UnitTypeOffering): { min: number; max: number } {
  const min = ut.priceRange?.min ?? ut.minPrice ?? 0;
  const max = ut.priceRange?.max ?? ut.maxPrice ?? 0;
  return { min, max };
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Highrise Verification Badge — signature trust signal
 */
function VerificationBadge({ project }: { project: ProjectDetailData }): React.ReactElement | null {
  if (!project.isVerified) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#029bba] to-[#017a94] rounded-full shadow-md shadow-[#029bba]/20">
      <BadgeCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
      <span className="text-xs font-black text-white uppercase tracking-wide">
        Highrise Verified
      </span>
    </div>
  );
}

/**
 * Project ID chip — HR-PRJ-XXXXX
 */
function ProjectIdChip({ project }: { project: ProjectDetailData }): React.ReactElement | null {
  const projectId = (project as unknown as { projectId?: string }).projectId;
  if (!projectId) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg border border-gray-200">
      <Shield className="w-3 h-3 text-gray-500" />
      <span className="text-[10px] font-mono font-bold text-gray-600 tracking-wider">
        {projectId}
      </span>
    </div>
  );
}

/**
 * Inventory Badge — Available / Reserved / Sold counts
 */
function InventoryBadges({ ut }: { ut: UnitTypeOffering }): React.ReactElement {
  const available = ut.availableUnits ?? 0;
  const sold = ut.soldUnits ?? 0;
  const total = ut.totalUnits ?? 0;
  const soldPercent = total > 0 ? Math.round((sold / total) * 100) : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {available > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-[10px] font-bold text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {available} Available
        </span>
      )}
      {sold > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-[10px] font-bold text-red-700">
          {soldPercent}% Sold
        </span>
      )}
      {available === 0 && sold === 0 && total > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-full text-[10px] font-bold text-gray-600">
          {total} Total
        </span>
      )}
    </div>
  );
}

/**
 * Investment Signal Chips — yield, fast selling, hot deal
 */
function InvestmentSignals({ ut }: { ut: UnitTypeOffering }): React.ReactElement | null {
  const extendedUt = ut as unknown as {
    avgRentalYield?: number;
    isFastSelling?: boolean;
    hotDealsCount?: number;
    popularityScore?: number;
  };

  const signals: React.ReactElement[] = [];

  if (extendedUt.avgRentalYield && extendedUt.avgRentalYield > 0) {
    signals.push(
      <span
        key="yield"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#029bba]/10 border border-[#029bba]/20 rounded-full text-[10px] font-bold text-[#029bba]"
      >
        <TrendingUp className="w-2.5 h-2.5" />
        {extendedUt.avgRentalYield.toFixed(1)}% Yield
      </span>
    );
  }

  if (extendedUt.isFastSelling) {
    signals.push(
      <span
        key="fast"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700"
      >
        <Zap className="w-2.5 h-2.5" />
        Selling Fast
      </span>
    );
  }

  if (extendedUt.hotDealsCount && extendedUt.hotDealsCount > 0) {
    signals.push(
      <span
        key="hot"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-[10px] font-bold text-red-700"
      >
        <Flame className="w-2.5 h-2.5" />
        {extendedUt.hotDealsCount} Hot Deal{extendedUt.hotDealsCount > 1 ? 's' : ''}
      </span>
    );
  }

  if (signals.length === 0) return null;

  return <div className="flex flex-wrap gap-1.5">{signals}</div>;
}

/**
 * Unit Type Card — The main innovation
 */
function UnitTypeCard({
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
  const imgUrl = ut.interiorImages?.[0]?.url ?? ut.image ?? ut.imageUrl ?? null;
  const unitName = ut.name ?? ut.type ?? 'Unit Type';

  // Category-specific accent color
  const categoryColors = {
    residential: 'from-blue-500 to-blue-600',
    commercial: 'from-purple-500 to-purple-600',
    hotel: 'from-amber-500 to-amber-600',
  };

  const categoryBg = {
    residential: 'bg-blue-50 text-blue-700 border-blue-200',
    commercial: 'bg-purple-50 text-purple-700 border-purple-200',
    hotel: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 hover:border-[#029bba]/40 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Top accent bar */}
      <div className={`h-1 bg-gradient-to-r ${categoryColors[category]}`} />

      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Category icon */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${categoryBg[category]}`}>
              <CategoryIcon className="w-5 h-5" />
            </div>

            {/* Name + category label */}
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-gray-900 truncate">
                {unitName}
              </h3>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${categoryBg[category].split(' ')[1]}`}>
                {category === 'hotel' ? 'Hotel Suite' : category}
              </p>
            </div>
          </div>

          {/* Inventory badges */}
          <div className="shrink-0">
            <InventoryBadges ut={ut} />
          </div>
        </div>

        {/* Price Section — Hero with Currency Converter */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          {minPrice > 0 || maxPrice > 0 ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  Price Range
                </p>
                <PriceWithConverter
                  minPKR={minPrice}
                  maxPKR={maxPrice > minPrice ? maxPrice : undefined}
                  displayText=""
                  size="sm"
                  align="right"
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#029bba]">
                  {formatDetailPrice(minPrice)}
                </span>
                {maxPrice > minPrice && (
                  <>
                    <span className="text-gray-400 text-sm">to</span>
                    <span className="text-lg font-bold text-gray-700">
                      {formatDetailPrice(maxPrice)}
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                Price
              </p>
              <span className="text-lg font-bold text-gray-500">Contact for Price</span>
            </>
          )}
        </div>

        {/* Size Section — Dual Display */}
        {sizePrimary !== '—' && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1.5">
              Size Range
            </p>
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-base font-bold text-gray-900">{sizePrimary}</p>
                {sizeSecondary && (
                  <p className="text-xs text-gray-500 mt-0.5">{sizeSecondary}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Beds/Baths chips (if residential) */}
        {((ut.bedrooms ?? 0) > 0 || (ut.bathrooms ?? 0) > 0) && (
          <div className="flex gap-2 mb-4">
            {(ut.bedrooms ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <Bed className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-xs font-bold text-gray-700">
                  {ut.bedrooms} {ut.bedrooms === 1 ? 'Bed' : 'Beds'}
                </span>
              </div>
            )}
            {(ut.bathrooms ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <Bath className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-xs font-bold text-gray-700">
                  {ut.bathrooms} {ut.bathrooms === 1 ? 'Bath' : 'Baths'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Investment Signals */}
        <div className="mb-4">
          <InvestmentSignals ut={ut} />
        </div>

        {/* CTA Button */}
        <button
          onClick={() => onInquire(unitName)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#029bba]/5 hover:bg-[#029bba] text-[#029bba] hover:text-white font-bold text-sm rounded-xl border border-[#029bba]/20 hover:border-[#029bba] transition-all duration-200 group/btn"
        >
          <span>Inquire About {unitName}</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Optional image preview (if available) */}
      {imgUrl && (
        <div className="absolute top-4 right-4 w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden lg:block">
          <Image
            src={imgUrl}
            alt={unitName}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      )}
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

  // Categorize all offerings
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

  // Filter based on active category
  const filteredOfferings = useMemo(() => {
    if (activeCategory === 'all') return allOfferings;
    if (activeCategory === 'residential') return categorized.residential;
    if (activeCategory === 'commercial') return categorized.commercial;
    if (activeCategory === 'hotel') return categorized.hotel;
    return allOfferings;
  }, [activeCategory, allOfferings, categorized]);

  // Overall stats
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

  // Category tabs config
  const categoryTabs: CategoryInfo[] = [
    {
      key: 'all',
      label: 'All Types',
      icon: Building2,
      color: 'text-gray-700',
      bgActive: 'bg-gray-900 text-white',
    },
    {
      key: 'residential',
      label: 'Residential',
      icon: Home,
      color: 'text-blue-700',
      bgActive: 'bg-blue-600 text-white',
    },
    {
      key: 'commercial',
      label: 'Commercial',
      icon: Store,
      color: 'text-purple-700',
      bgActive: 'bg-purple-600 text-white',
    },
    {
      key: 'hotel',
      label: 'Hotel Suites',
      icon: Hotel,
      color: 'text-amber-700',
      bgActive: 'bg-amber-600 text-white',
    },
  ];

  // Show only tabs that have offerings
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
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* ══════════════════════════════════════
          HEADER — Title + Verification + Project ID
      ══════════════════════════════════════ */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-br from-white to-[#029bba]/5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left: Title */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#029bba] to-[#017a94] flex items-center justify-center shrink-0 shadow-md shadow-[#029bba]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">
                Choose Your Space
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {allOfferings.length} unit {allOfferings.length === 1 ? 'type' : 'types'} available
                {stats.minPrice > 0 && (
                  <>
                    {' '}·{' '}
                    <span className="font-semibold text-gray-700">
                      Starting from PKR {formatDetailPrice(stats.minPrice)}
                    </span>
                  </>
                )}
              </p>
              {/* Project ID chip */}
              <div className="mt-2">
                <ProjectIdChip project={project} />
              </div>
            </div>
          </div>

          {/* Right: Verification Badge */}
          <div className="flex flex-col items-start sm:items-end gap-2">
            <VerificationBadge project={project} />
            {stats.availableUnits > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold text-green-700">
                  {stats.availableUnits} unit{stats.availableUnits > 1 ? 's' : ''} available now
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
        <div className="px-6 py-4 border-b border-gray-100 overflow-x-auto scrollbar-none">
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
                      ? `${tab.bgActive} shadow-md`
                      : `bg-gray-100 ${tab.color} hover:bg-gray-200`
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-gray-600'
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
          UNIT TYPE CARDS GRID
      ══════════════════════════════════════ */}
      <div className="p-6">
        {filteredOfferings.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No units in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOfferings.map((ut, idx) => (
              <UnitTypeCard
                key={`${ut.type}-${idx}`}
                ut={ut}
                onInquire={onInquire}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          BOTTOM SUMMARY BAR
      ══════════════════════════════════════ */}
      {allOfferings.length > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                Total Unit Types
              </p>
              <p className="text-base font-black text-gray-900">
                {allOfferings.length}
              </p>
            </div>
            {stats.totalUnits > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                  Total Units
                </p>
                <p className="text-base font-black text-gray-900">
                  {stats.totalUnits}
                </p>
              </div>
            )}
            {stats.availableUnits > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                  Available
                </p>
                <p className="text-base font-black text-green-600">
                  {stats.availableUnits}
                </p>
              </div>
            )}
            {stats.minPrice > 0 && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                    Price Range
                  </p>
                  <PriceWithConverter
                    minPKR={stats.minPrice}
                    maxPKR={stats.maxPrice > stats.minPrice ? stats.maxPrice : undefined}
                    displayText=""
                    size="sm"
                    align="right"
                  />
                </div>
                <p className="text-sm font-black text-[#029bba]">
                  {formatDetailPrice(stats.minPrice)}
                  {stats.maxPrice > stats.minPrice && (
                    <span className="text-gray-400"> - {formatDetailPrice(stats.maxPrice)}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}