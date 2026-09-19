// components/project-detail/AvailableUnitsTable.tsx
// ============================================================================
// HIGHRISE.PK — AVAILABLE UNITS FILTER TABLE (Enterprise Accordion V3.4)
// Hyperlink summary · sort · expand/collapse all · installment frequency
// calculator · per-layout unit list · strict brand colors · no wrap drift
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import type {
  ProjectDetailData,
  UnitTypeOffering,
  UnitRow,
  InstallmentPlan,
} from '@/types/projectDetail';
import { formatDetailPrice } from '@/types/projectDetail';

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

function getLayoutMaxPrice(ut: UnitTypeOffering): number {
  const candidates = [
    ut.maxPrice,
    ut.priceRange?.max,
    ut.minPrice,
    ut.priceRange?.min,
    (ut as { price?: number }).price,
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

/** Live installment math from project.installmentPlan + layout price */
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

  // Prefer explicit plan booking only when > 0; else derive from layout price
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
  // monthly default
  const count = plan?.monthlyDuration ?? 24;
  const amount = plan?.monthlyAmount ?? Math.round(remaining / Math.max(count, 1));
  return { bookingPercent, bookingAmount, installmentAmount: amount, installmentCount: count, freqLabel: 'Monthly' };
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
  const [expandedUnitLists, setExpandedUnitLists] = useState<Record<string, boolean>>({});
  const [selectedUnitModal, setSelectedUnitModal] = useState<UnitTypeOffering | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  useEffect(() => {
    if (groupedOfferings.length > 0 && expandedGroups.length === 0) {
      setExpandedGroups([groupedOfferings[0].id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedOfferings.length]);

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
          {/* Hyperlink summary line — Trulia style */}
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

      {/* ── TABS (full width, no scrollbar) ── */}
      <div className="px-5 pt-3 md:px-8 bg-white">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-[#004063] text-white shadow-sm'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
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
                  ? 'bg-[#004063] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {g.short} ({g.totalUnits})
            </button>
          ))}
        </div>
      </div>

      {/* ── TOOLBAR: Size · Frequency · Sort · Expand (no tab collision) ── */}
      <div className="px-5 py-3 md:px-8 border-b border-gray-100 bg-white flex flex-wrap items-center gap-2">
        {/* Size unit dropdown */}
        <div className="relative">
          <select
            value={sizeUnit}
            onChange={(e) => setSizeUnit(e.target.value as SizeUnit)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
            aria-label="Size unit"
          >
            {SIZE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                Size: {u.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Installment frequency — one control for all rows */}
        {isInstallment && (
          <div className="relative">
            <select
              value={payFreq}
              onChange={(e) => setPayFreq(e.target.value as PayFrequency)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
              aria-label="Installment frequency"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* Sort */}
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

            return (
              <div
                key={group.id}
                id={`units-group-${group.id}`}
                ref={(el) => {
                  groupRefs.current[group.id] = el;
                }}
                className="bg-white scroll-mt-28"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full px-5 py-5 md:px-8 flex items-center justify-between hover:bg-gray-50 transition-colors group focus:outline-none"
                >
                  <div className="text-left min-w-0 pr-4">
                    <h3 className="text-lg md:text-xl font-black text-[#001f2b] group-hover:text-[#029bba] transition-colors">
                      {group.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                      {group.layouts.length} floor plan{group.layouts.length === 1 ? '' : 's'}
                      {' · '}
                      {group.totalUnits} available unit{group.totalUnits === 1 ? '' : 's'}
                      {' · '}
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          jumpToGroup(group.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            jumpToGroup(group.id);
                          }
                        }}
                        className="text-[#029bba] hover:underline underline-offset-2 font-semibold"
                      >
                        {priceRangeLabel}
                      </span>
                    </p>
                  </div>
                  <div className="w-10 h-10 shrink-0 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-[#029bba]/10 group-hover:border-[#029bba]/30 group-hover:text-[#029bba] transition-all">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-6 md:px-8">
                    {/* Desktop table */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm">
                      <table className="w-full text-left border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: '40%' }} />
                          <col style={{ width: '17%' }} />
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '18%' }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-[#f8fcfd] border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <th className="py-3.5 px-5 text-left">Layout &amp; Variations</th>
                            <th className="py-3.5 px-5 text-left">Area</th>
                            <th className="py-3.5 px-5 text-left">Pricing Base</th>
                            <th className="py-3.5 px-5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {group.layouts.map((ut, idx) => {
                            const { minSqft, maxSqft } = getUnitSqftRange(ut);
                            const areaStr = getAreaDisplay(minSqft, maxSqft, sizeUnit);
                            const minPrice = getLayoutMinPrice(ut);
                            const available = ut.availableUnits ?? 0;
                            const isSoldOut = (ut.totalUnits ?? 0) > 0 && available === 0;
                            const imageUrl = ut.image || ut.imageUrl || ut.floorPlanPdfUrl;
                            const layoutKey = `${group.id}-${idx}`;
                            const matchedUnits = unitsForLayout(ut);
                            const listOpen = !!expandedUnitLists[layoutKey];
                            const inst = isInstallment
                              ? calcInstallmentForLayout(minPrice, plan, payFreq)
                              : null;

                            return (
                              <React.Fragment key={layoutKey}>
                                <tr
                                  className={`transition-colors group ${
                                    isSoldOut
                                      ? 'bg-gray-50 opacity-75'
                                      : 'hover:bg-[#f4f9fb]/50 bg-white'
                                  }`}
                                >
                                  {/* Layout */}
                                  <td className="py-4 px-5 align-middle">
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div className="relative w-[72px] h-[72px] shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                                        {imageUrl && !String(imageUrl).toLowerCase().endsWith('.pdf') ? (
                                          <img
                                            src={imageUrl}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover z-10 text-transparent"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                          />
                                        ) : null}
                                        <ImageIcon
                                          className={`w-6 h-6 text-gray-300 ${
                                            imageUrl && !String(imageUrl).toLowerCase().endsWith('.pdf')
                                              ? 'hidden'
                                              : ''
                                          }`}
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="font-bold text-gray-900 text-[15px] truncate">
                                          {ut.name || ut.type || 'Standard Layout'}
                                        </h4>
                                        {group.id === 'commercial' ? (
                                          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-600">
                                            <Store className="w-4 h-4 text-[#029bba]" /> Commercial
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3 mt-1.5 text-xs font-bold">
                                            <span className="flex items-center gap-1.5 text-gray-700">
                                              <Bed className="w-4 h-4 text-[#029bba]" /> {ut.bedrooms ?? 0} Bed
                                            </span>
                                            <span className="flex items-center gap-1.5 text-gray-700">
                                              <Bath className="w-4 h-4 text-gray-500" /> {ut.bathrooms ?? 0} Bath
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Area — single line */}
                                  <td className="py-4 px-5 align-middle">
                                    <span className="text-[13px] font-bold text-gray-700 whitespace-nowrap tabular-nums">
                                      {areaStr}
                                    </span>
                                  </td>

                                  {/* Pricing Base */}
                                  <td className="py-4 px-5 align-middle">
                                    {minPrice <= 0 && !isInstallment ? (
                                      <span className="text-xs text-gray-400 italic">Contact for price</span>
                                    ) : isRent ? (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                          Monthly Rent
                                        </span>
                                        <span className="text-sm font-bold text-[#001f2b]">
                                          PKR {formatDetailPrice(minPrice)}
                                          <span className="text-[10px] text-gray-400 font-medium">/mo</span>
                                        </span>
                                      </div>
                                    ) : isInstallment && inst && inst.bookingAmount > 0 ? (
                                      <div className="flex flex-col gap-0.5 max-w-[220px]">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                          Booking from {inst.bookingPercent}%
                                        </span>
                                        <span className="text-sm font-bold text-[#001f2b]">
                                          PKR {formatDetailPrice(inst.bookingAmount)}
                                        </span>
                                        <span className="text-[11px] font-semibold text-gray-500">
                                          + {inst.installmentCount} {inst.freqLabel.toLowerCase()} × PKR{' '}
                                          {formatDetailPrice(inst.installmentAmount)}
                                        </span>
                                      </div>
                                    ) : isInstallment && minPrice > 0 ? (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                          Starting From
                                        </span>
                                        <span className="text-sm font-bold text-[#001f2b]">
                                          PKR {formatDetailPrice(minPrice)}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                          Full Payment
                                        </span>
                                        <span className="text-sm font-bold text-[#001f2b]">
                                          PKR {formatDetailPrice(minPrice)}
                                        </span>
                                      </div>
                                    )}

                                    {available > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedUnitLists((prev) => ({
                                            ...prev,
                                            [layoutKey]: !prev[layoutKey],
                                          }));
                                        }}
                                        className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-[#029bba] hover:text-[#027a94] hover:underline underline-offset-2"
                                      >
                                        {available} Units Left
                                        {listOpen ? ' · hide' : ' · view'}
                                      </button>
                                    )}
                                  </td>

                                  {/* Action — centered with header */}
                                  <td className="py-4 px-3 align-middle text-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedUnitModal(ut)}
                                      disabled={isSoldOut}
                                      className={`inline-block px-3 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap ${
                                        isSoldOut
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-[#029bba] hover:bg-[#027a94] text-white shadow-sm hover:shadow-md'
                                      }`}
                                    >
                                      {isSoldOut ? 'Sold Out' : 'Check Availability'}
                                    </button>
                                  </td>
                                </tr>

                                {/* Expanded unit numbers row */}
                                {listOpen && (
                                  <tr className="bg-[#f8fcfd]">
                                    <td colSpan={4} className="px-5 py-3">
                                      {matchedUnits.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {matchedUnits.map((u) => (
                                            <button
                                              key={u._id}
                                              type="button"
                                              onClick={() => setSelectedUnitModal(ut)}
                                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#029bba]/20 bg-white text-[#004063] hover:border-[#029bba] hover:text-[#029bba] transition-colors"
                                            >
                                              Unit {u.unitNumber}
                                              {u.floorName || u.floorNumber
                                                ? ` · Fl. ${u.floorName || u.floorNumber}`
                                                : ''}
                                              {u.price
                                                ? ` · PKR ${formatDetailPrice(u.price)}`
                                                : ''}
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-500 font-medium">
                                          {available} unit{available === 1 ? '' : 's'} available for this layout.
                                          Individual unit numbers will appear here when inventory is linked.
                                          <button
                                            type="button"
                                            onClick={() => setSelectedUnitModal(ut)}
                                            className="ml-2 text-[#029bba] font-bold hover:underline"
                                          >
                                            Check availability
                                          </button>
                                        </p>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                      {group.layouts.map((ut, idx) => {
                        const { minSqft, maxSqft } = getUnitSqftRange(ut);
                        const areaStr = getAreaDisplay(minSqft, maxSqft, sizeUnit);
                        const minPrice = getLayoutMinPrice(ut);
                        const available = ut.availableUnits ?? 0;
                        const isSoldOut = (ut.totalUnits ?? 0) > 0 && available === 0;
                        const imageUrl = ut.image || ut.imageUrl || ut.floorPlanPdfUrl;
                        const layoutKey = `m-${group.id}-${idx}`;
                        const matchedUnits = unitsForLayout(ut);
                        const listOpen = !!expandedUnitLists[layoutKey];
                        const inst = isInstallment
                          ? calcInstallmentForLayout(minPrice, plan, payFreq)
                          : null;

                        return (
                          <div
                            key={layoutKey}
                            className={`flex flex-col gap-3 p-4 border border-gray-100 rounded-xl ${
                              isSoldOut ? 'bg-gray-50 opacity-75' : 'bg-white shadow-sm'
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="relative w-14 h-14 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                                {imageUrl && !String(imageUrl).toLowerCase().endsWith('.pdf') ? (
                                  <img
                                    src={imageUrl}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover z-10 text-transparent"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <ImageIcon
                                  className={`w-5 h-5 text-gray-300 ${
                                    imageUrl && !String(imageUrl).toLowerCase().endsWith('.pdf')
                                      ? 'hidden'
                                      : ''
                                  }`}
                                />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 text-sm truncate">
                                  {ut.name || ut.type || 'Standard Layout'}
                                </h4>
                                <div className="text-[11px] font-bold text-gray-600 mt-1 whitespace-nowrap tabular-nums">
                                  {areaStr}
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-gray-50 pt-3 space-y-2">
                              {minPrice > 0 && isInstallment && inst && inst.bookingAmount > 0 ? (
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
                              ) : minPrice > 0 ? (
                                <>
                                  <p className="text-[10px] font-black uppercase text-gray-400">
                                    {isRent ? 'Monthly Rent' : 'Full Payment'}
                                  </p>
                                  <p className="text-sm font-bold text-[#001f2b]">
                                    PKR {formatDetailPrice(minPrice)}
                                    {isRent ? '/mo' : ''}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-gray-400 italic">Contact for price</p>
                              )}

                              {available > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedUnitLists((prev) => ({
                                      ...prev,
                                      [layoutKey]: !prev[layoutKey],
                                    }))
                                  }
                                  className="text-[10px] font-black uppercase tracking-wider text-[#029bba]"
                                >
                                  {available} Units Left
                                </button>
                              )}

                              {listOpen && matchedUnits.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {matchedUnits.map((u) => (
                                    <span
                                      key={u._id}
                                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#f4f9fb] text-[#004063] border border-[#029bba]/15"
                                    >
                                      {u.unitNumber}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <button
                                type="button"
                                disabled={isSoldOut}
                                onClick={() => setSelectedUnitModal(ut)}
                                className={`w-full py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl ${
                                  isSoldOut
                                    ? 'bg-gray-100 text-gray-400'
                                    : 'bg-[#029bba] text-white'
                                }`}
                              >
                                {isSoldOut ? 'Sold Out' : 'Check Availability'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {selectedUnitModal && (
        <UnifiedUnitModal
          unit={selectedUnitModal}
          project={project}
          onClose={() => setSelectedUnitModal(null)}
          sizeUnit={sizeUnit}
        />
      )}
    </section>
  );
}

// ============================================
// MODAL
// ============================================

interface UnifiedUnitModalProps {
  unit: UnitTypeOffering;
  project: ProjectDetailData;
  onClose: () => void;
  sizeUnit: SizeUnit;
}

function UnifiedUnitModal({ unit, project, onClose, sizeUnit }: UnifiedUnitModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: `Assalam-o-Alaikum, I am interested in the ${unit.name || unit.type || 'Unit'} layout at ${project.projectName}. Please share viewing schedule and availability.`,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

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

  const { minSqft, maxSqft } = getUnitSqftRange(unit);
  const areaStr = getAreaDisplay(minSqft, maxSqft, sizeUnit);
  const minPrice = getLayoutMinPrice(unit);
  const imageUrl = unit.image || unit.imageUrl || unit.floorPlanPdfUrl;

  return (
    <div className="fixed inset-0 z-[130] bg-[#001f2b]/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 bg-[#f8fcfd]">
          <h3 className="text-lg md:text-xl font-black text-[#001f2b]">
            {unit.name || unit.type || 'Layout Details'}
            <span className="text-sm text-gray-400 font-bold ml-2">
              ({unit.availableUnits || 0} Available)
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
          <div className="w-full md:w-[45%] p-6 md:p-8 border-r border-gray-100 overflow-y-auto bg-white">
            <div className="mb-8">
              <div className="text-3xl font-black text-[#001f2b]">
                {minPrice > 0 ? `PKR ${formatDetailPrice(minPrice)}` : 'Price on Request'}
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm font-bold text-gray-600">
                {unit.bedrooms !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Bed className="w-4 h-4 text-[#029bba]" /> {unit.bedrooms} Bed
                  </span>
                )}
                {unit.bathrooms !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Bath className="w-4 h-4 text-gray-500" /> {unit.bathrooms} Bath
                  </span>
                )}
                <span className="text-gray-300">|</span>
                <span className="font-semibold tabular-nums whitespace-nowrap">{areaStr}</span>
              </div>
            </div>

            <div className="bg-[#f8fcfd] p-6 rounded-2xl border border-[#029bba]/10 shadow-sm">
              {success ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h4 className="text-lg font-black text-[#001f2b]">Inquiry Sent Successfully</h4>
                  <p className="text-sm text-gray-500 mt-2 font-medium">
                    We will contact you shortly about this layout.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h4 className="font-black text-base text-[#001f2b] mb-2">Check Availability</h4>
                  {errorMsg && (
                    <div className="text-[11px] text-red-600 bg-red-50 p-3 rounded-xl font-bold border border-red-100">
                      {errorMsg}
                    </div>
                  )}
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your Name"
                    className="w-full px-4 py-3 text-sm font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]"
                  />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email Address"
                    className="w-full px-4 py-3 text-sm font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]"
                  />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone Number"
                    className="w-full px-4 py-3 text-sm font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]"
                  />
                  <div className="flex justify-center py-1">
                    <div
                      className="cf-turnstile"
                      data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                      data-callback="onTurnstileSuccess"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#029bba] hover:bg-[#027a94] text-white font-black text-[13px] uppercase tracking-wider rounded-xl transition-all flex justify-center items-center gap-2 shadow-md"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Check Availability
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="w-full md:w-[55%] bg-gray-50 p-6 md:p-10 flex flex-col items-center justify-center min-h-[400px]">
            {imageUrl ? (
              String(imageUrl).toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={imageUrl}
                  className="w-full h-full min-h-[500px] rounded-xl border border-gray-200 shadow-sm bg-white"
                />
              ) : (
                <img
                  src={imageUrl}
                  alt=""
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-sm border border-gray-200 bg-white p-2 text-transparent"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              )
            ) : null}
            <div
              className={`flex-col items-center text-gray-400 ${
                imageUrl && !String(imageUrl).toLowerCase().endsWith('.pdf') ? 'hidden' : 'flex'
              }`}
            >
              <ImageIcon className="w-20 h-20 mb-3 opacity-30" />
              <p className="text-sm font-bold">No floor plan image provided</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}