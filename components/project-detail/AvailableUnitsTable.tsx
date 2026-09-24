// components/project-detail/AvailableUnitsTable.tsx
// ============================================================================
// HIGHRISE.PK — AVAILABLE UNITS FILTER TABLE (Enterprise Accordion V4.2)
// Flat Inventory Architecture · Highrise Layout Explorer · Highrise Contact Modal
// ============================================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Bed,
  Bath,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Send,
  Loader2,
  CheckCircle,
  X,
  Store,
  ChevronsUpDown,
  ChevronsDownUp,
  BadgeCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import type {
  ProjectDetailData,
  UnitTypeOffering,
  UnitRow,
  InstallmentPlan,
} from '@/types/projectDetail';
import { formatDetailPrice } from '@/types/projectDetail';
import PriceWithConverter from '@/components/shared/CurrencyConverter';

// ============================================
// TYPES & CONSTANTS
// ============================================

interface AvailableUnitsTableProps {
  project: ProjectDetailData;
  units?: UnitRow[];
}

type SizeUnit = 'sqft' | 'marla' | 'kanal' | 'sqyd';
type SortKey = 'price-asc' | 'price-desc' | 'avail';
type PayFrequency = 'monthly' | 'quarterly' | 'half_yearly';

export interface GroupData {
  id: string;
  title: string;
  short: string;
  layouts: UnitTypeOffering[];
  totalUnits: number;
  minPrice: number;
  maxPrice: number;
}

const SIZE_UNITS: { value: SizeUnit; label: string; sqftFactor: number }[] = [
  { value: 'sqft', label: 'Sq Ft', sqftFactor: 1 },
  { value: 'marla', label: 'Marla', sqftFactor: 272.25 },
  { value: 'kanal', label: 'Kanal', sqftFactor: 5445 },
  { value: 'sqyd', label: 'Sq Yd', sqftFactor: 9 },
];

const SOURCE_TO_SQFT: Record<string, number> = {
  sqft: 1, 'sq.ft': 1, 'sq ft': 1, 'sq. ft': 1,
  sqyd: 9, 'sq.yd': 9, 'sq yd': 9, 'sq. yd': 9,
  marla: 272.25,
  kanal: 5445,
};

// ============================================
// HELPERS
// ============================================

function toSqft(value: number, unit: string): number {
  const factor = SOURCE_TO_SQFT[(unit ?? '').trim().toLowerCase()] ?? 1;
  return value * factor;
}

function formatConvertedArea(sqft: number, target: SizeUnit): string {
  const factor = SIZE_UNITS.find((u) => u.value === target)?.sqftFactor ?? 1;
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
  return min > max && max > 0 ? { minSqft: max, maxSqft: min } : { minSqft: min, maxSqft: max };
}

function getGroupSqftRange(layouts: UnitTypeOffering[]): { minSqft: number; maxSqft: number } {
  let minSqft = Infinity;
  let maxSqft = -Infinity;
  layouts.forEach((ut) => {
    const { minSqft: min, maxSqft: max } = getUnitSqftRange(ut);
    if (min > 0 && min < minSqft) minSqft = min;
    if (max > 0 && max > maxSqft) maxSqft = max;
    if (min > 0 && min > maxSqft) maxSqft = min;
  });
  if (minSqft === Infinity) minSqft = 0;
  if (maxSqft === -Infinity) maxSqft = 0;
  return { minSqft, maxSqft };
}

function getAreaDisplay(minSqft: number, maxSqft: number, target: SizeUnit): string {
  const label = SIZE_UNITS.find((u) => u.value === target)?.label ?? 'Sq Ft';
  if (minSqft <= 0 && maxSqft <= 0) return '—';
  if (minSqft <= 0 || maxSqft <= 0) {
    return `${formatConvertedArea(Math.max(minSqft, maxSqft), target)} ${label}`;
  }
  if (minSqft === maxSqft) {
    return `${formatConvertedArea(minSqft, target)} ${label}`;
  }
  return `${formatConvertedArea(minSqft, target)} – ${formatConvertedArea(maxSqft, target)} ${label}`;
}

/** Row-level area only — always a single value (never min–max range). */
function getExactAreaDisplay(
  u: UnitRow | null,
  ut: UnitTypeOffering,
  target: SizeUnit
): string {
  const label = SIZE_UNITS.find((x) => x.value === target)?.label ?? 'Sq Ft';

  if (u) {
    let sqft = 0;
    if (typeof u.areaSqft === 'number' && u.areaSqft > 0) {
      sqft = u.areaSqft;
    } else if (typeof u.area === 'number' && u.area > 0) {
      sqft = toSqft(u.area, u.areaUnit || 'sqft');
    } else if (typeof u.areaMarla === 'number' && u.areaMarla > 0) {
      sqft = u.areaMarla * 272.25;
    }
    if (sqft > 0) {
      return `${formatConvertedArea(sqft, target)} ${label}`;
    }
  }

  const { minSqft, maxSqft } = getUnitSqftRange(ut);
  if (minSqft <= 0 && maxSqft <= 0) return '—';
  if (minSqft > 0 && maxSqft > 0 && minSqft === maxSqft) {
    return `${formatConvertedArea(minSqft, target)} ${label}`;
  }
  if (minSqft > 0) {
    return `${formatConvertedArea(minSqft, target)} ${label}`;
  }
  return `${formatConvertedArea(maxSqft, target)} ${label}`;
}

function getLayoutMinPrice(ut: UnitTypeOffering): number {
  const candidates = [
    ut.minPrice,
    ut.priceRange?.min,
    ut.maxPrice,
    ut.priceRange?.max,
    (ut as { price?: number }).price,
    (ut as { startingPrice?: number }).startingPrice,
    (ut as { totalPrice?: number }).totalPrice,
  ];
  for (const v of candidates) {
    if (typeof v === 'number' && v > 0) return v;
  }
  return 0;
}

function matchesUnitType(row: UnitRow, ut: UnitTypeOffering): boolean {
  const a = (row.unitType || '').trim().toLowerCase();
  const b = (ut.name || ut.type || '').trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function isAvailableStatus(status: string | undefined): boolean {
  const s = (status || '').toLowerCase();
  return s === 'available' || s === 'open' || s === 'vacant' || s === 'in_stock' || s === 'instock';
}

function calcInstallmentForLayout(
  layoutPrice: number,
  plan: InstallmentPlan | undefined,
  freq: PayFrequency
): {
  bookingPercent: number;
  bookingAmount: number;
  installmentAmount: number;
  installmentCount: number;
  freqLabel: string;
} {
  const bookingPercent =
    (plan?.bookingPercent && plan.bookingPercent > 0
      ? plan.bookingPercent
      : null) ??
    (plan?.downPaymentPercent && plan.downPaymentPercent > 0
      ? plan.downPaymentPercent
      : null) ??
    15;

  const explicitBooking =
    (plan?.bookingAmount && plan.bookingAmount > 0 ? plan.bookingAmount : null) ??
    (plan?.downPayment && plan.downPayment > 0 ? plan.downPayment : null);

  const bookingAmount =
    explicitBooking ??
    (layoutPrice > 0 ? Math.round(layoutPrice * (bookingPercent / 100)) : 0);

  const remaining = Math.max(layoutPrice - bookingAmount, 0);

  if (freq === 'quarterly') {
    const count = plan?.quarterlyDuration ?? Math.max(1, Math.round((plan?.monthlyDuration ?? 24) / 3));
    const amount = plan?.quarterlyAmount ?? Math.round(remaining / count);
    return { bookingPercent, bookingAmount, installmentAmount: amount, installmentCount: count, freqLabel: 'Quarterly' };
  }
  if (freq === 'half_yearly') {
    const count = plan?.halfYearlyDuration ?? Math.max(1, Math.round((plan?.monthlyDuration ?? 24) / 6));
    const amount = plan?.halfYearlyAmount ?? Math.round(remaining / count);
    return { bookingPercent, bookingAmount, installmentAmount: amount, installmentCount: count, freqLabel: 'Half-Yearly' };
  }

  const count = plan?.monthlyDuration ?? 24;
  const amount = plan?.monthlyAmount ?? Math.round(remaining / Math.max(count, 1));
  return { bookingPercent, bookingAmount, installmentAmount: amount, installmentCount: count, freqLabel: 'Monthly' };
}

function formatFloorLabel(unit: UnitRow | null | undefined): string {
  if (!unit) return '';
  if (unit.floorName && String(unit.floorName).trim()) {
    return String(unit.floorName).trim();
  }
  const n = typeof unit.floorNumber === 'number' ? unit.floorNumber : Number(unit.floorNumber);
  if (!Number.isFinite(n)) return '';
  const ordinals: Record<number, string> = {
    0: 'Ground Floor',
    1: 'First Floor',
    2: 'Second Floor',
    3: 'Third Floor',
    4: 'Fourth Floor',
    5: 'Fifth Floor',
    6: 'Sixth Floor',
    7: 'Seventh Floor',
    8: 'Eighth Floor',
    9: 'Ninth Floor',
    10: 'Tenth Floor',
  };
  if (ordinals[n]) return ordinals[n];
  return `Floor ${n}`;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AvailableUnitsTable({
  project,
  units = [],
}: AvailableUnitsTableProps): React.ReactElement | null {
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('sqft');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('price-asc');
  const [payFreq, setPayFreq] = useState<PayFrequency>('monthly');
  const [selectedUnitModal, setSelectedUnitModal] = useState<{ layout: UnitTypeOffering; unit?: UnitRow | null } | null>(null);
  const [explorerGroup, setExplorerGroup] = useState<GroupData | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleCloseModal = useCallback(() => {
    setSelectedUnitModal(null);
  }, []);

  const handleCloseExplorer = useCallback(() => {
    setExplorerGroup(null);
  }, []);

  const offerings = project.unitTypeBreakdown ?? [];
  const saleMode = (project.saleMode || 'Sale').toString();
  const isInstallment = saleMode.toLowerCase() === 'installment';
  const isRent = saleMode.toLowerCase() === 'rent';
  const plan = project.installmentPlan;

  const groupedOfferings = useMemo(() => {
    const groups: Record<string, { title: string; order: number; short: string; layouts: UnitTypeOffering[] }> = {
      studio: { title: 'Studio Apartments', short: 'Studio', order: 0, layouts: [] },
      '1-bed': { title: '1-Bedroom Layouts', short: '1-Bedroom', order: 1, layouts: [] },
      '2-bed': { title: '2-Bedroom Layouts', short: '2-Bedroom', order: 2, layouts: [] },
      '3-bed': { title: '3-Bedroom Layouts', short: '3-Bedroom', order: 3, layouts: [] },
      '4-bed': { title: '4+ Bedroom Layouts', short: '4+ Bedroom', order: 4, layouts: [] },
      commercial: { title: 'Commercial Spaces', short: 'Commercial', order: 5, layouts: [] },
    };

    offerings.forEach((ut) => {
      const isComm =
        ut.category === 'commercial' ||
        ['shop', 'office', 'showroom', 'commercial'].some((kw) =>
          (ut.name || ut.type || '').toLowerCase().includes(kw)
        );
      const isStudio =
        (ut.bedrooms === 0 || (ut.name || '').toLowerCase().includes('studio')) && !isComm;

      let key = 'commercial';
      if (!isComm) {
        if (isStudio) key = 'studio';
        else if (ut.bedrooms === 1) key = '1-bed';
        else if (ut.bedrooms === 2) key = '2-bed';
        else if (ut.bedrooms === 3) key = '3-bed';
        else if ((ut.bedrooms ?? 0) >= 4) key = '4-bed';
      }
      groups[key].layouts.push(ut);
    });

    return Object.entries(groups)
      .filter(([, data]) => data.layouts.length > 0)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([id, data]) => {
        const layouts = [...data.layouts].sort((a, b) => {
          const pa = getLayoutMinPrice(a);
          const pb = getLayoutMinPrice(b);
          const aa = a.availableUnits ?? 0;
          const ab = b.availableUnits ?? 0;
          if (sortBy === 'price-asc') return pa - pb;
          if (sortBy === 'price-desc') return pb - pa;
          return ab - aa;
        });

        const totalUnits = layouts.reduce((sum, l) => sum + (l.availableUnits ?? 0), 0);
        const allPrices = layouts
          .flatMap((l) => {
            const p: number[] = [];
            if (l.minPrice) p.push(l.minPrice);
            if (l.maxPrice) p.push(l.maxPrice);
            if (l.priceRange?.min) p.push(l.priceRange.min);
            if (l.priceRange?.max) p.push(l.priceRange.max);
            return p;
          })
          .filter((p) => p > 0);

        return {
          id,
          title: data.title,
          short: data.short,
          layouts,
          totalUnits,
          minPrice: allPrices.length ? Math.min(...allPrices) : 0,
          maxPrice: allPrices.length ? Math.max(...allPrices) : 0,
        };
      });
  }, [offerings, sortBy]);

  // Groups start collapsed by default — user clicks to expand

  const allGroupIds = groupedOfferings.map((g) => g.id);
  const isAllExpanded = expandedGroups.length === allGroupIds.length && allGroupIds.length > 0;

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleAllGroups = () => {
    setExpandedGroups(isAllExpanded ? [] : allGroupIds);
  };

  const jumpToGroup = (id: string) => {
    setActiveTab('all');
    setExpandedGroups((prev) => (prev.includes(id) ? prev : [...prev, id]));
    requestAnimationFrame(() => {
      groupRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const unitsForLayout = (ut: UnitTypeOffering): UnitRow[] => {
    if (!units.length) return [];
    return units.filter(
      (u) => matchesUnitType(u, ut) && isAvailableStatus(String(u.status))
    );
  };

  if (offerings.length === 0) return null;

  const totalAvailable = groupedOfferings.reduce((sum, g) => sum + g.totalUnits, 0);

  return (
    <section
      id="units"
      className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden scroll-mt-24 font-sans"
    >
      {/* ── HEADER ── */}
      <div className="px-5 py-6 md:px-8 border-b border-gray-100 bg-[#f4f9fb]">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-black text-[#001f2b] tracking-tight leading-tight">
            {totalAvailable} Units Available at {project.projectName}
          </h2>
          <p className="mt-2 text-sm text-gray-600 font-medium flex flex-wrap items-center gap-x-1 gap-y-1">
            {groupedOfferings.map((g, i) => (
              <React.Fragment key={g.id}>
                {i > 0 && <span className="text-gray-300 mx-1">·</span>}
                <button
                  type="button"
                  onClick={() => jumpToGroup(g.id)}
                  className="text-[#029bba] hover:text-[#027a94] hover:underline underline-offset-2 font-semibold transition-colors text-left"
                >
                  {g.short}
                  {g.minPrice > 0 ? ` from PKR ${formatDetailPrice(g.minPrice)}` : ''}
                </button>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="px-5 pt-3 md:px-8 bg-white">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-[#029bba] text-white shadow-sm'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-[#029bba]'
            }`}
          >
            All ({totalAvailable})
          </button>
          {groupedOfferings.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setActiveTab(g.id);
                if (!expandedGroups.includes(g.id)) toggleGroup(g.id);
              }}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === g.id
                  ? 'bg-[#029bba] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-[#029bba]'
              }`}
            >
              {g.short} ({g.totalUnits})
            </button>
          ))}
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="px-5 py-3 md:px-8 border-b border-gray-100 bg-white flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={sizeUnit}
            onChange={(e) => setSizeUnit(e.target.value as SizeUnit)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
          >
            {SIZE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                Size: {u.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {isInstallment && (
          <div className="relative">
            <select
              value={payFreq}
              onChange={(e) => setPayFreq(e.target.value as PayFrequency)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        )}

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
          >
            <option value="price-asc">Sort: Price (low to high)</option>
            <option value="price-desc">Sort: Price (high to low)</option>
            <option value="avail">Sort: Availability</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={toggleAllGroups}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#029bba] transition-colors whitespace-nowrap bg-gray-50 hover:bg-[#029bba]/10 px-3 py-1.5 rounded-lg border border-gray-200"
        >
          {isAllExpanded ? (
            <>
              <ChevronsDownUp className="w-3.5 h-3.5" /> Collapse all
            </>
          ) : (
            <>
              <ChevronsUpDown className="w-3.5 h-3.5" /> Expand all
            </>
          )}
        </button>
      </div>

      {/* ── ACCORDION GROUPS ── */}
      <div className="divide-y divide-gray-100">
        {groupedOfferings
          .filter((g) => activeTab === 'all' || activeTab === g.id)
          .map((group) => {
            const isExpanded = expandedGroups.includes(group.id);

            let priceRangeLabel = 'Contact for price';
            if (group.minPrice > 0) {
              priceRangeLabel =
                group.minPrice === group.maxPrice
                  ? `PKR ${formatDetailPrice(group.minPrice)}`
                  : `PKR ${formatDetailPrice(group.minPrice)} – ${formatDetailPrice(group.maxPrice)}`;
            }

            const groupSqft = getGroupSqftRange(group.layouts);
            const groupAreaStr = getAreaDisplay(groupSqft.minSqft, groupSqft.maxSqft, sizeUnit);

            return (
              <div
                key={group.id}
                id={`units-group-${group.id}`}
                ref={(el) => {
                  groupRefs.current[group.id] = el;
                }}
                className="bg-white scroll-mt-28"
              >
                {/* Category Header (Thumbnail Removed) */}
                <div className="w-full px-5 py-4 md:px-8 flex items-center justify-between hover:bg-gray-50/80 transition-colors group">
                  <div className="flex items-center gap-4 min-w-0 pr-4">
                    <div className="text-left min-w-0 cursor-pointer" onClick={() => toggleGroup(group.id)}>
                      <h3 className="text-lg md:text-xl font-black text-[#001f2b] group-hover:text-[#029bba] transition-colors">
                        {group.title}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 mt-0.5 font-medium flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroup(group.id);
                          }}
                          className="text-[#029bba] font-bold hover:underline underline-offset-2 transition-all"
                        >
                          {group.totalUnits} available unit{group.totalUnits === 1 ? '' : 's'}
                        </button>
                        {groupAreaStr !== '—' && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="font-semibold text-gray-700">{groupAreaStr}</span>
                          </>
                        )}
                        {group.minPrice > 0 && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span onClick={(e) => e.stopPropagation()}>
                              <PriceWithConverter
                                minPKR={group.minPrice}
                                maxPKR={group.maxPrice > group.minPrice ? group.maxPrice : undefined}
                                displayText={priceRangeLabel}
                                size="sm"
                                align="left"
                                className="font-bold text-[#029bba]"
                              />
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-10 h-10 shrink-0 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-[#029bba]/10 group-hover:border-[#029bba]/30 group-hover:text-[#029bba] transition-all"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {/* Expanded Table Content */}
                {isExpanded && (
                  <div className="px-5 pb-6 md:px-8">

                    {/* Desktop View */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      <table className="w-full text-left border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: '28%' }} /> {/* Thumbnail + Details */}
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '15%' }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-[#f8fcfd] border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <th className="py-3.5 px-5 text-left">Layout / Details</th>
                            <th className="py-3.5 px-5 text-left">Floor</th>
                            <th className="py-3.5 px-5 text-left">Unit #</th>
                            <th className="py-3.5 px-5 text-left">Area</th>
                            <th className="py-3.5 px-5 text-left">Pricing</th>
                            <th className="py-3.5 px-5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {group.layouts.flatMap((ut, idx) => {
                            const matchedUnits = unitsForLayout(ut);

                            const renderRow = (u: UnitRow | null, rowKey: string) => {
                              const activePrice = u && u.price ? u.price : getLayoutMinPrice(ut);
                              const available = u ? 1 : (ut.availableUnits ?? 0);
                              const isSoldOut = u ? (u.status === 'sold') : ((ut.totalUnits ?? 0) > 0 && available === 0);
                              const activeArea = getExactAreaDisplay(u, ut, sizeUnit);
                              const inst = isInstallment ? calcInstallmentForLayout(activePrice, plan, payFreq) : null;
                              
                              // Specific unit thumbnail logic
                              const rowImageUrl = (u && (u as any).imageUrl) || ut.image || ut.imageUrl;

                              return (
                                <tr
                                  key={rowKey}
                                  className={`transition-colors group ${
                                    isSoldOut ? 'bg-gray-50 opacity-75' : 'hover:bg-[#f4f9fb]/50 bg-white'
                                  }`}
                                >
                                  {/* Type / Details with Thumbnail */}
                                  <td className="py-4 px-5 align-middle">
                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                      {/* Thumbnail Click-to-Explore */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setExplorerGroup(group);
                                        }}
                                        title="View floor plan details"
                                        className="relative w-12 h-12 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-[#029bba] flex items-center justify-center shadow-sm hover:shadow transition-all group/thumb"
                                      >
                                        {rowImageUrl && !String(rowImageUrl).toLowerCase().endsWith('.pdf') ? (
                                          <img
                                            src={rowImageUrl}
                                            alt={ut.name || ut.type || 'Layout'}
                                            className="absolute inset-0 w-full h-full object-cover z-10"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                          />
                                        ) : null}
                                        <ImageIcon
                                          className={`w-5 h-5 text-gray-300 ${
                                            rowImageUrl && !String(rowImageUrl).toLowerCase().endsWith('.pdf') ? 'hidden' : ''
                                          }`}
                                        />
                                        <div className="absolute inset-0 bg-[#001f2b]/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity z-20 flex items-center justify-center text-white">
                                          <ZoomIn className="w-4 h-4" />
                                        </div>
                                      </button>

                                      <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-gray-900 text-[13px] leading-tight line-clamp-2">
                                          {ut.name || ut.type || 'Standard Layout'}
                                        </h4>
                                        {group.id === 'commercial' ? (
                                          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
                                            <Store className="w-3.5 h-3.5 text-[#029bba]" /> Commercial
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] font-bold text-gray-600">
                                            <span className="flex items-center gap-1 text-gray-700">
                                              <Bed className="w-3.5 h-3.5 text-[#029bba]" /> {ut.bedrooms ?? 0} Bed
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-700">
                                              <Bath className="w-3.5 h-3.5 text-gray-400" /> {ut.bathrooms ?? 0} Bath
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Floor */}
                                  <td className="py-4 px-5 align-middle">
                                    <span className="text-[12px] font-bold text-gray-700">
                                      {u ? (u.floorName || u.floorNumber || '—') : '—'}
                                    </span>
                                  </td>

                                  {/* Unit Number */}
                                  <td className="py-4 px-5 align-middle">
                                    <span className="text-[12px] font-bold text-gray-700">
                                      {u ? (u.unitNumber || '—') : '—'}
                                    </span>
                                  </td>

                                  {/* Area */}
                                  <td className="py-4 px-5 align-middle">
                                    <span className="text-[13px] font-bold text-gray-700 whitespace-nowrap tabular-nums">
                                      {activeArea}
                                    </span>
                                  </td>

                                  {/* Pricing Base */}
                                  <td className="py-4 px-5 align-middle">
                                    {activePrice <= 0 && !isInstallment ? (
                                      <span className="text-[11px] text-gray-400 italic">Contact for price</span>
                                    ) : isRent ? (
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                                          Monthly Rent
                                        </span>
                                        <span className="text-[13px] font-bold text-[#001f2b] leading-tight">
                                          PKR {formatDetailPrice(activePrice)}<span className="text-[9px] font-medium text-gray-400 ml-0.5">/mo</span>
                                        </span>
                                      </div>
                                    ) : isInstallment && inst && inst.bookingAmount > 0 ? (
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                                          Booking ({inst.bookingPercent}%)
                                        </span>
                                        <span className="text-[13px] font-bold text-[#001f2b] leading-tight">
                                          PKR {formatDetailPrice(inst.bookingAmount)}
                                        </span>
                                        <span className="text-[10px] font-medium text-gray-500 leading-snug mt-0.5">
                                          + {inst.installmentCount} {inst.freqLabel.toLowerCase()} @ <br className="hidden lg:block" />
                                          <span className="font-bold text-gray-700">PKR {formatDetailPrice(inst.installmentAmount)}</span>
                                        </span>
                                      </div>
                                    ) : isInstallment && activePrice > 0 ? (
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                                          Starting From
                                        </span>
                                        <span className="text-[13px] font-bold text-[#001f2b] leading-tight">
                                          PKR {formatDetailPrice(activePrice)}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                                          Full Payment
                                        </span>
                                        <span className="text-[13px] font-bold text-[#001f2b] leading-tight">
                                          PKR {formatDetailPrice(activePrice)}
                                        </span>
                                      </div>
                                    )}
                                  </td>

                                  {/* Action */}
                                  <td className="py-4 px-3 align-middle text-center pr-5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedUnitModal({ layout: ut, unit: u });
                                      }}
                                      disabled={isSoldOut}
                                      className={`inline-block w-full max-w-[140px] px-2 py-2 text-[10px] sm:text-[9px] lg:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all whitespace-normal leading-tight ${
                                        isSoldOut
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-[#029bba] hover:bg-[#027a94] text-white shadow-sm hover:shadow-md'
                                      }`}
                                    >
                                      {isSoldOut ? 'Sold Out' : 'Check Availability'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            };

                            if (matchedUnits.length > 0) {
                              return matchedUnits.map((u) => renderRow(u, `${group.id}-${idx}-${u._id}`));
                            }
                            return renderRow(null, `${group.id}-${idx}-fallback`);
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-3">
                      {group.layouts.flatMap((ut, idx) => {
                        const matchedUnits = unitsForLayout(ut);

                        const renderMobileCard = (u: UnitRow | null, key: string) => {
                          const activePrice = u && u.price ? u.price : getLayoutMinPrice(ut);
                          const available = u ? 1 : (ut.availableUnits ?? 0);
                          const isSoldOut = u ? (u.status === 'sold') : ((ut.totalUnits ?? 0) > 0 && available === 0);
                          const activeArea = getExactAreaDisplay(u, ut, sizeUnit);
                          const inst = isInstallment ? calcInstallmentForLayout(activePrice, plan, payFreq) : null;
                          
                          const rowImageUrl = (u && (u as any).imageUrl) || ut.image || ut.imageUrl;

                          return (
                            <div
                              key={key}
                              className={`flex flex-col gap-3 p-4 border border-gray-100 rounded-xl ${
                                isSoldOut ? 'bg-gray-50 opacity-75' : 'bg-white shadow-sm'
                              }`}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExplorerGroup(group);
                                  }}
                                  className="relative w-14 h-14 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center shadow-sm transition-all"
                                >
                                  {rowImageUrl && !String(rowImageUrl).toLowerCase().endsWith('.pdf') ? (
                                    <img
                                      src={rowImageUrl}
                                      alt={ut.name || ut.type || 'Layout'}
                                      className="absolute inset-0 w-full h-full object-cover z-10"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <ImageIcon className={`w-5 h-5 text-gray-300 ${rowImageUrl && !String(rowImageUrl).toLowerCase().endsWith('.pdf') ? 'hidden' : ''}`} />
                                  <div className="absolute inset-0 bg-[#001f2b]/40 opacity-0 hover:opacity-100 transition-opacity z-20 flex items-center justify-center text-white">
                                    <ZoomIn className="w-4 h-4" />
                                  </div>
                                </button>
                                
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-gray-900 text-sm truncate">
                                    {ut.name || ut.type || 'Standard Layout'}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <div className="text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                      {u ? `Floor ${u.floorName || u.floorNumber || '—'}` : 'Multiple Floors'}
                                    </div>
                                    <div className="text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                      {u ? `Unit ${u.unitNumber || '—'}` : 'Multiple Units'}
                                    </div>
                                  </div>
                                  <div className="text-[12px] font-bold text-gray-800 mt-2 whitespace-nowrap tabular-nums">
                                    Area: {activeArea}
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-gray-50 pt-3 space-y-2">
                                {activePrice > 0 && isInstallment && inst && inst.bookingAmount > 0 ? (
                                  <>
                                    <p className="text-[10px] font-black uppercase text-gray-400">
                                      Booking from {inst.bookingPercent}%
                                    </p>
                                    <p className="text-sm font-bold text-[#001f2b]">
                                      PKR {formatDetailPrice(inst.bookingAmount)}
                                    </p>
                                    <p className="text-[11px] text-gray-500 font-semibold">
                                      + {inst.installmentCount} {inst.freqLabel.toLowerCase()} × PKR{' '}
                                      {formatDetailPrice(inst.installmentAmount)}
                                    </p>
                                  </>
                                ) : activePrice > 0 ? (
                                  <>
                                    <p className="text-[10px] font-black uppercase text-gray-400">
                                      {isRent ? 'Monthly Rent' : 'Full Payment'}
                                    </p>
                                    <p className="text-sm font-bold text-[#001f2b]">
                                      PKR {formatDetailPrice(activePrice)}
                                      {isRent ? '/mo' : ''}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">Contact for price</p>
                                )}

                                <button
                                  type="button"
                                  disabled={isSoldOut}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedUnitModal({ layout: ut, unit: u });
                                  }}
                                  className={`w-full py-2.5 mt-2 text-[11px] font-black uppercase tracking-wider rounded-xl ${
                                    isSoldOut
                                      ? 'bg-gray-100 text-gray-400'
                                      : 'bg-[#029bba] text-white shadow-sm'
                                  }`}
                                >
                                  {isSoldOut ? 'Sold Out' : 'Check Availability'}
                                </button>
                              </div>
                            </div>
                          );
                        };

                        if (matchedUnits.length > 0) {
                          return matchedUnits.map((u) => renderMobileCard(u, `m-${group.id}-${idx}-${u._id}`));
                        }
                        return renderMobileCard(null, `m-${group.id}-${idx}-fallback`);
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {explorerGroup && typeof document !== 'undefined' && (
        <LayoutExplorerModal
          group={explorerGroup as GroupData}
          project={project}
          units={units}
          sizeUnit={sizeUnit}
          payFreq={payFreq}
          onClose={handleCloseExplorer}
          onInquire={(layout, unit) => {
            setExplorerGroup(null);
            setTimeout(() => setSelectedUnitModal({ layout, unit }), 50);
          }}
        />
      )}

      {selectedUnitModal && (
        <UnifiedUnitModal
          layout={selectedUnitModal.layout}
          unit={selectedUnitModal.unit ?? null}
          project={project}
          onClose={handleCloseModal}
          sizeUnit={sizeUnit}
        />
      )}
    </section>
  );
}

// ============================================
// MODAL — LAYOUT EXPLORER
// ============================================

interface LayoutExplorerModalProps {
  group: GroupData;
  project: ProjectDetailData;
  units: UnitRow[];
  sizeUnit: SizeUnit;
  payFreq: PayFrequency;
  onClose: () => void;
  onInquire: (layout: UnitTypeOffering, unit?: UnitRow | null) => void;
}

function LayoutExplorerModal({ group, project, units, sizeUnit, payFreq, onClose, onInquire }: LayoutExplorerModalProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const layout = group.layouts[activeIdx] || group.layouts[0];
  const plan = project.installmentPlan;
  const [zoomLevel, setZoomLevel] = useState(1);

  // Pan & Zoom States
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Dynamic Calculator State
  const [dpPct, setDpPct] = useState(25);

  const backdropPointerDown = useRef(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const matchedUnits = useMemo(() => {
    return units.filter(u => matchesUnitType(u, layout) && isAvailableStatus(String(u.status)));
  }, [units, layout]);

  const activePrice = getLayoutMinPrice(layout);
  const priceStr = activePrice > 0 ? `PKR ${formatDetailPrice(activePrice)}` : 'Price on Request';
  const areaStr = getExactAreaDisplay(null, layout, sizeUnit);
  const imageUrl = layout.image || layout.imageUrl || layout.floorPlanPdfUrl;

  // Dynamic Calculator Pre-computes
  const durationMonths = plan?.monthlyDuration || 36;
  const dpAmount = Math.round(activePrice * (dpPct / 100));
  const possessionPct = Math.min(10, 100 - dpPct);
  const possessionAmount = Math.round(activePrice * (possessionPct / 100));
  const remaining = Math.max(0, activePrice - dpAmount - possessionAmount);

  const qDuration = Math.max(1, Math.round(durationMonths / 3));
  const hyDuration = Math.max(1, Math.round(durationMonths / 6));

  const monthlyAmount = Math.round(remaining / Math.max(1, durationMonths));
  const quarterlyAmount = Math.round(remaining / qDuration);
  const halfYearlyAmount = Math.round(remaining / hyDuration);

  // Pan & Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x) / zoomLevel,
      y: dragStart.current.panY + (e.clientY - dragStart.current.y) / zoomLevel
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

    if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 font-sans animate-fadeIn">
      {/* Backdrop Layer — STRICT origin check. Only closes if touch/click STARTS on the backdrop */}
      <div
        className="absolute inset-0 z-0 cursor-pointer"
        onPointerDown={() => { backdropPointerDown.current = true; }}
        onPointerUp={() => {
          if (backdropPointerDown.current) onClose();
          backdropPointerDown.current = false;
        }}
      />

      {/* Modal Content Layer */}
      <div
        role="dialog"
        onPointerDown={(e) => e.stopPropagation()}
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-[1000px] max-h-[90vh] flex flex-col overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-[#f8fcfd] flex items-center justify-between shrink-0">
          {group.layouts.length > 1 ? (
            <select
              value={activeIdx}
              onChange={(e) => setActiveIdx(Number(e.target.value))}
              className="appearance-none font-black text-lg text-[#001f2b] bg-transparent cursor-pointer hover:text-[#029bba] transition-colors pr-8 focus:outline-none"
              style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23029bba" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>')`, backgroundPosition: 'right center', backgroundRepeat: 'no-repeat' }}
            >
              {group.layouts.map((l, i) => (
                <option key={i} value={i}>
                  {l.name || l.type} ({l.availableUnits || 0} Available)
                </option>
              ))}
            </select>
          ) : (
            <div className="font-black text-lg text-[#001f2b]">
              {layout.name || layout.type} <span className="text-sm text-gray-500 font-medium ml-1">({layout.availableUnits || 0} Available)</span>
            </div>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto min-h-0">

          {/* LEFT: Property & Units */}
          <div className="w-full md:w-[45%] p-6 md:p-8 border-r border-gray-100 bg-white overflow-y-auto">
            <h2 className="text-2xl font-black text-[#001f2b] leading-tight">{layout.name || layout.type}</h2>

            {activePrice > 0 ? (
              <PriceWithConverter minPKR={activePrice} displayText={priceStr} size="md" align="left" className="text-xl font-bold text-[#029bba] mt-1" />
            ) : (
              <div className="text-xl font-bold text-gray-500 mt-1">Price on Request</div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-bold text-gray-600 mt-4">
              {layout.bedrooms !== undefined && <span className="flex items-center gap-1"><Bed className="w-4 h-4 text-[#029bba]"/> {layout.bedrooms} Bed</span>}
              {layout.bathrooms !== undefined && <span className="flex items-center gap-1"><Bath className="w-4 h-4 text-gray-400"/> {layout.bathrooms} Bath</span>}
              <span className="text-gray-300">|</span>
              <span>{areaStr}</span>
            </div>

            <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#f8fcfd] px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#004063]">Available Inventory</span>
                <span className="text-[11px] font-bold text-[#029bba]">{matchedUnits.length} Units</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr className="border-b border-gray-100 text-[9px] font-black uppercase text-gray-400">
                    <th className="py-2.5 px-4 w-[30%]">Unit</th>
                    <th className="py-2.5 px-4 w-[40%] text-right">Price</th>
                    <th className="py-2.5 px-4 w-[30%] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {matchedUnits.length > 0 ? matchedUnits.map(u => (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-[12px] font-bold text-gray-900">Unit {u.unitNumber}</div>
                        <div className="text-[10px] text-gray-500">{formatFloorLabel(u) || '—'}</div>
                      </td>
                      <td className="py-3 px-4 text-[12px] font-bold text-gray-700 text-right">
                        {u.price ? `PKR ${formatDetailPrice(u.price)}` : '—'}
                      </td>
                      <td className="py-3 px-4 flex justify-center">
                        <button
                          onClick={() => onInquire(layout, u)}
                          className="px-3 py-1.5 w-full bg-white border border-[#029bba] text-[#029bba] hover:bg-[#029bba] hover:text-white rounded-lg text-[9px] font-black uppercase transition-colors"
                        >
                          Inquire
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="py-8 px-4 text-center">
                        <p className="text-sm text-gray-500 font-medium">Inventory list coming soon.</p>
                        <button onClick={() => onInquire(layout, null)} className="mt-3 px-4 py-2 bg-[#029bba] text-white rounded-lg text-[11px] font-black uppercase shadow-sm hover:bg-[#017a94] transition-colors">
                          Check Availability
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Media & Financials */}
          <div className="w-full md:w-[55%] p-6 md:p-8 bg-gray-50 overflow-y-auto">
                        {/* Media Viewer */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 relative min-h-[300px] flex items-center justify-center mb-6 overflow-hidden">
              {imageUrl && !String(imageUrl).toLowerCase().endsWith('.pdf') && (
                <div className="absolute top-2 right-2 z-20 flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-100">
                  <button onClick={() => setZoomLevel(z => Math.min(z + 0.2, 3))} className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-[#029bba]"><ZoomIn className="w-4 h-4"/></button>
                  <button onClick={() => {
                    setZoomLevel(z => {
                      const newZ = Math.max(z - 0.2, 1);
                      if (newZ === 1) setPan({ x: 0, y: 0 });
                      return newZ;
                    });
                  }} className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-[#029bba]"><ZoomOut className="w-4 h-4"/></button>
                  <button onClick={() => { setZoomLevel(1); setPan({ x: 0, y: 0 }); }} className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-[#029bba]"><RotateCcw className="w-4 h-4"/></button>
                </div>
              )}

              {imageUrl ? (
                String(imageUrl).toLowerCase().endsWith('.pdf') ? (
                  <iframe src={imageUrl} className="w-full h-full min-h-[300px]" />
                ) : (
                  <img
                    src={imageUrl}
                    alt="Floor Plan"
                    draggable={false}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                      transform: `scale(${zoomLevel}) translate(${pan.x}px, ${pan.y}px)`,
                      transition: isDragging ? 'none' : 'transform 0.2s ease-in-out',
                      cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                      touchAction: 'none'
                    }}
                    className="max-w-full max-h-[40vh] object-contain select-none"
                  />
                )
              ) : (
                <div className="text-gray-400 flex flex-col items-center"><ImageIcon className="w-12 h-12 mb-2 opacity-30"/><span className="text-xs font-bold uppercase tracking-wider">No Layout Image</span></div>
              )}
            </div>

            {/* Payment Plan Calculator */}
            {activePrice > 0 && (
              <div className="bg-white border border-[#029bba]/20 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-[#f4f9fb] border-b border-[#029bba]/10 px-5 py-3">
                  <h4 className="text-[13px] font-black text-[#004063]">Payment Plan Calculator</h4>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-500">Base Price</span>
                    <span className="font-black text-gray-900">PKR {formatDetailPrice(activePrice)}</span>
                  </div>

                  {/* Down Payment Row */}
                  <div className="flex justify-between items-center text-sm border-t border-dashed border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-500">Down Payment</span>
                      <select
                        value={dpPct}
                        onChange={(e) => setDpPct(Number(e.target.value))}
                        className="text-xs font-bold text-[#029bba] bg-[#029bba]/10 border border-[#029bba]/20 rounded px-2 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-[#029bba]/50"
                      >
                        {Array.from({ length: 19 }, (_, i) => 10 + i * 5).map((val) => (
                          <option key={val} value={val}>{val}%</option>
                        ))}
                      </select>
                    </div>
                    <span className="font-black text-gray-900">PKR {formatDetailPrice(dpAmount)}</span>
                  </div>

                  {/* Possession Charges */}
                  <div className="flex justify-between items-center text-sm border-t border-dashed border-gray-100 pt-3">
                    <span className="font-semibold text-gray-500">Possession ({possessionPct}%)</span>
                    <span className="font-black text-gray-900">PKR {formatDetailPrice(possessionAmount)}</span>
                  </div>

                  {/* Installments Breakdown */}
                  {remaining > 0 && (
                    <div className="mt-4 border border-[#029bba]/20 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="bg-[#029bba]/10 px-3 py-2.5 text-center border-b border-[#029bba]/20">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#004063]">
                          Remaining Balance: PKR {formatDetailPrice(remaining)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
                        <div className="py-3 px-2">
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Monthly</div>
                          <div className="text-[12px] font-black text-[#029bba] mt-0.5">{durationMonths}x</div>
                          <div className="text-[11px] font-bold text-gray-700 mt-1">PKR {formatDetailPrice(monthlyAmount)}</div>
                        </div>
                        <div className="py-3 px-2">
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quarterly</div>
                          <div className="text-[12px] font-black text-[#029bba] mt-0.5">{qDuration}x</div>
                          <div className="text-[11px] font-bold text-gray-700 mt-1">PKR {formatDetailPrice(quarterlyAmount)}</div>
                        </div>
                        <div className="py-3 px-2">
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Half-Yearly</div>
                          <div className="text-[12px] font-black text-[#029bba] mt-0.5">{hyDuration}x</div>
                          <div className="text-[11px] font-bold text-gray-700 mt-1">PKR {formatDetailPrice(halfYearlyAmount)}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 leading-tight">
                      * Interactive estimates based on standard {durationMonths}-month duration. Final pricing, schedules, and unit premiums (corner, park-facing) are subject to developer confirmation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================
// MODAL — ENTERPRISE CONTACT
// ============================================

interface UnifiedUnitModalProps {
  layout: UnitTypeOffering;
  unit?: UnitRow | null;
  project: ProjectDetailData;
  onClose: () => void;
  sizeUnit: SizeUnit;
}

function UnifiedUnitModal({ layout, unit, project, onClose, sizeUnit }: UnifiedUnitModalProps) {
  const typeName = layout.name || layout.type || 'Property';
  const activePrice = unit?.price || getLayoutMinPrice(layout);
  const priceStr = activePrice > 0 ? `PKR ${formatDetailPrice(activePrice)}` : 'Price on Request';
  const sizeStr = getExactAreaDisplay(unit ?? null, layout, sizeUnit);
  const floorStr = formatFloorLabel(unit);

  const initialMessage = unit
    ? `I am inquiring about the ${typeName} # ${unit.unitNumber || '—'}, Size ${sizeStr}${floorStr ? `, ${floorStr}` : ''}, at ${project.projectName}. Please share current availability, exact unit numbers, and pricing details.`
    : `I am inquiring about the ${typeName} at ${project.projectName}. Please share current availability, exact unit numbers, and pricing details.`;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: initialMessage,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const backdropPointerDown = useRef(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const scriptId = 'turnstile-embed-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    (window as any).onTurnstileSuccess = (token: string) => setTurnstileToken(token);
    return () => {
      delete (window as any).onTurnstileSuccess;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    if (!turnstileToken && process.env.NODE_ENV !== 'development') {
      setErrorMsg('Please complete the verification check first.');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: project._id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          turnstileToken,
          source: 'unit_modal',
          propertyTitle: project.projectName,
          propertySlug: project.slug,
          unitType: typeName,
          unitNumber: unit?.unitNumber || null,
          floorNumber: unit?.floorNumber ?? null,
          floorName: floorStr || unit?.floorName || null,
          unitArea: sizeStr !== '—' ? sizeStr : null,
          unitPrice: activePrice > 0 ? activePrice : null,
          unitPriceLabel: priceStr,
          unitId: unit?._id || null,
        }),
      });
      const resData = await response.json();
      if (!resData.success) throw new Error(resData.error || 'Submission failed');
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const developerName = project.developerProfile?.companyName || project.developerProfile?.name || 'Authorized Developer';

    if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 font-sans animate-fadeIn">
      {/* Backdrop Layer — STRICT origin check. Only closes if touch/click STARTS on the backdrop */}
      <div
        className="absolute inset-0 z-0 cursor-pointer"
        onPointerDown={() => { backdropPointerDown.current = true; }}
        onPointerUp={() => {
          if (backdropPointerDown.current) onClose();
          backdropPointerDown.current = false;
        }}
      />

      {/* Modal Content Layer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Check unit availability"
        onPointerDown={(e) => e.stopPropagation()}
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-[500px] flex flex-col overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-[#f8fcfd]">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-4">
              <h3 className="text-xl font-black text-[#001f2b] flex items-center gap-1.5 truncate">
                {project.projectName}
                {project.isVerified && <BadgeCheck className="w-5 h-5 text-[#10b981] shrink-0" />}
              </h3>
              <p className="text-sm text-gray-500 font-medium mt-1 truncate">
                {unit
                  ? `${typeName} # ${unit.unitNumber || '—'} · ${sizeStr}${floorStr ? ` · ${floorStr}` : ''} · ${priceStr}`
                  : `${typeName} · General Inquiry`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors shrink-0 -mt-1 -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 bg-white">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-14 h-14 text-[#10b981] mx-auto mb-4" />
              <h4 className="text-xl font-black text-[#001f2b]">Request Sent Successfully</h4>
              <p className="text-sm text-gray-500 mt-2 font-medium">
                The property manager has been notified and will contact you shortly regarding this unit.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              <h4 className="font-bold text-gray-900 mb-4 text-[15px]">Contact This Property</h4>

              {/* Property Verified Info */}
              <div className="flex items-center gap-2 mb-6">
                <span className="font-bold text-gray-900 text-sm truncate max-w-[200px]">
                  {developerName}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded">
                  <BadgeCheck className="w-3 h-3" />
                  Verified
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="text-[11px] text-red-600 bg-red-50 p-3 rounded-xl font-bold border border-red-100">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Name"
                    className="w-full px-4 py-3 text-sm font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba] placeholder-gray-400"
                  />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone"
                    className="w-full px-4 py-3 text-sm font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba] placeholder-gray-400"
                  />
                </div>

                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email"
                  className="w-full px-4 py-3 text-sm font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba] placeholder-gray-400"
                />

                <textarea
                  required
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 text-sm font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba] placeholder-gray-600 resize-none"
                />

                <div className="flex justify-center pt-1 pb-2">
                  <div
                    className="cf-turnstile"
                    data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                    data-callback="onTurnstileSuccess"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#029bba] hover:bg-[#017a94] text-white py-3.5 rounded-xl font-black uppercase text-[13px] tracking-wider transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Check Availability'}
                </button>

                <p className="text-[10.5px] text-gray-400 leading-relaxed text-center mt-4 px-2 font-medium">
                  By clicking Check Availability, you agree to Highrise.pk's Terms of Use &amp; Privacy Policy. Your inquiry will be sent directly to the verified property manager.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}