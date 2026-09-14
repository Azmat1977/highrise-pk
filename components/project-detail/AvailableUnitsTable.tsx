// components/project-detail/AvailableUnitsTable.tsx
// ============================================================================
// HIGHRISE.PK — AVAILABLE UNITS FILTER TABLE (Inventory Grid V3)
// Fully adaptive to Sale / Rent / Installment modes & Commercial spaces.
// Includes size conversion, dynamic summary, sorting, & Turnstile inline forms.
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Home,
  Store,
  Building2,
  ChevronDown,
  Sparkles,
  Maximize2,
  Send,
  Loader2,
  CheckCircle,
  X,
} from 'lucide-react';
import type { ProjectDetailData, UnitTypeOffering } from '@/types/projectDetail';
import { formatDetailPrice } from '@/types/projectDetail';
import PriceWithConverter from '@/components/shared/CurrencyConverter';

interface AvailableUnitsTableProps {
  project: ProjectDetailData;
}

type BedFilter = 'all' | '1' | '2' | '3' | '4+' | 'commercial';
type SizeUnit = 'sqft' | 'marla' | 'kanal' | 'sqyd';

const SIZE_UNITS: { value: SizeUnit; label: string; sqftFactor: number }[] = [
  { value: 'sqft',  label: 'Sq Ft', sqftFactor: 1 },
  { value: 'marla', label: 'Marla', sqftFactor: 272.25 },
  { value: 'kanal', label: 'Kanal', sqftFactor: 5445 },
  { value: 'sqyd',  label: 'Sq Yd', sqftFactor: 9 },
];

const SOURCE_TO_SQFT: Record<string, number> = {
  sqft: 1, 'sq.ft': 1, 'sq ft': 1, 'sq. ft': 1,
  sqyd: 9, 'sq.yd': 9, 'sq yd': 9, 'sq. yd': 9,
  marla: 272.25,
  kanal: 5445,
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
  return min > max && max > 0 ? { minSqft: max, maxSqft: min } : { minSqft: min, maxSqft: max };
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
  return `${formatConvertedArea(minSqft, target)} - ${formatConvertedArea(maxSqft, target)} ${label}`;
}

export default function AvailableUnitsTable({
  project,
}: AvailableUnitsTableProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<BedFilter>('all');
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('sqft');
  const [sortBy, setSortBy] = useState<string>('price-asc');
  
  const [activeFloorPlan, setActiveFloorPlan] = useState<string | null>(null);
  const [inquiryUnit, setInquiryUnit] = useState<UnitTypeOffering | null>(null);

  const offerings = project.unitTypeBreakdown ?? [];
  const saleMode = project.saleMode || 'Sale';

  // Dynamic copywriting summary line
  const summaryLine = useMemo(() => {
    if (offerings.length === 0) return '';
    const summaries: string[] = [];
    const bedGroups: Record<number, number[]> = {};
    let hasCommercial = false;
    let commercialMin = Infinity;

    offerings.forEach((ut) => {
      const isComm = ut.category === 'commercial' || 
        ['shop', 'office', 'showroom', 'commercial'].some(kw => (ut.name || ut.type || '').toLowerCase().includes(kw));
      
      if (isComm) {
        hasCommercial = true;
        const minP = ut.minPrice ?? ut.priceRange?.min ?? 0;
        if (minP > 0 && minP < commercialMin) commercialMin = minP;
      } else {
        const beds = ut.bedrooms ?? 0;
        if (beds > 0) {
          const minP = ut.minPrice ?? ut.priceRange?.min ?? 0;
          if (minP > 0) {
            if (!bedGroups[beds]) bedGroups[beds] = [];
            bedGroups[beds].push(minP);
          }
        }
      }
    });

    Object.keys(bedGroups).sort().forEach((bedStr) => {
      const bedCount = parseInt(bedStr);
      const minPrice = Math.min(...bedGroups[bedCount]);
      summaries.push(`${bedCount}-Bed from PKR ${formatDetailPrice(minPrice)}`);
    });

    if (hasCommercial && commercialMin !== Infinity) {
      summaries.push(`Commercial from PKR ${formatDetailPrice(commercialMin)}`);
    }

    return summaries.join('  ·  ');
  }, [offerings]);

  const availableTabs = useMemo(() => {
    const tabs: { key: BedFilter; label: string }[] = [{ key: 'all', label: 'All Spaces' }];
    const bedsExist = new Set<number>();
    let commExists = false;

    offerings.forEach((ut) => {
      const isComm = ut.category === 'commercial' || 
        ['shop', 'office', 'showroom', 'commercial'].some(kw => (ut.name || ut.type || '').toLowerCase().includes(kw));
      if (isComm) {
        commExists = true;
      } else if (ut.bedrooms && ut.bedrooms > 0) {
        bedsExist.add(ut.bedrooms);
      }
    });

    Array.from(bedsExist).sort((a, b) => a - b).forEach((bed) => {
      if (bed < 4) {
        tabs.push({ key: String(bed) as BedFilter, label: `${bed} Bed` });
      }
    });

    if (Array.from(bedsExist).some(b => b >= 4)) {
      tabs.push({ key: '4+', label: '4+ Bed' });
    }

    if (commExists) {
      tabs.push({ key: 'commercial', label: 'Commercial' });
    }

    return tabs;
  }, [offerings]);

  const processedOfferings = useMemo(() => {
    let list = [...offerings];

    if (activeTab !== 'all') {
      if (activeTab === 'commercial') {
        list = list.filter(ut => ut.category === 'commercial' || 
          ['shop', 'office', 'showroom', 'commercial'].some(kw => (ut.name || ut.type || '').toLowerCase().includes(kw)));
      } else if (activeTab === '4+') {
        list = list.filter(ut => (ut.bedrooms ?? 0) >= 4);
      } else {
        const beds = parseInt(activeTab);
        list = list.filter(ut => ut.bedrooms === beds);
      }
    }

    list.sort((a, b) => {
      const priceA = a.minPrice ?? a.priceRange?.min ?? 0;
      const priceB = b.minPrice ?? b.priceRange?.min ?? 0;
      const { minSqft: sizeA } = getUnitSqftRange(a);
      const { minSqft: sizeB } = getUnitSqftRange(b);

      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'size-asc') return sizeA - sizeB;
      if (sortBy === 'size-desc') return sizeB - sizeA;
      
      const availA = a.availableUnits ?? 0;
      const availB = b.availableUnits ?? 0;
      return availB - availA;
    });

    return list;
  }, [offerings, activeTab, sortBy]);

  if (offerings.length === 0) return null;

  return (
    <section
      id="units"
      className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden scroll-mt-24"
    >
      {/* HEADER */}
      <div className="px-6 py-6 border-b border-gray-100 bg-[#f4f9fb]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-[#029bba]/10 text-[#029bba] rounded-full">
                Inventory Layouts
              </span>
              <span className="text-xs text-gray-400 font-bold font-mono">
                {project.projectId || 'HR-PRJ'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#001f2b] tracking-tight mt-1.5">
              Available Units & Pricing
            </h2>
            {summaryLine && (
              <p className="text-xs text-gray-500 font-medium mt-1">
                {summaryLine}
              </p>
            )}
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Sizes in:
            </span>
            <div className="flex bg-white rounded-xl border border-gray-200 p-0.5 shadow-sm">
              {SIZE_UNITS.map(u => (
                <button
                  key={u.value}
                  onClick={() => setSizeUnit(u.value)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    sizeUnit === u.value
                      ? 'bg-[#029bba] text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH/TABS BAR */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div className="flex gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#004063] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sort option */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">Sort by:</span>
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
            >
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="size-asc">Size: Small to Large</option>
              <option value="size-desc">Size: Large to Small</option>
              <option value="avail">Availability Status</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black uppercase tracking-wider text-gray-400">
              <th className="px-6 py-3.5">Unit Structure</th>
              <th className="px-6 py-3.5">Category</th>
              <th className="px-6 py-3.5">Area Range</th>
              <th className="px-6 py-3.5">
                {saleMode === 'Rent' ? 'Monthly Rent' : saleMode === 'Installment' ? 'Down Payment' : 'Pricing'}
              </th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {processedOfferings.map((ut, idx) => {
              const isComm = ut.category === 'commercial' || 
                ['shop', 'office', 'showroom', 'commercial'].some(kw => (ut.name || ut.type || '').toLowerCase().includes(kw));

              const { minSqft, maxSqft } = getUnitSqftRange(ut);
              const areaStr = getAreaDisplay(minSqft, maxSqft, sizeUnit);

              const minPrice = ut.minPrice ?? ut.priceRange?.min ?? 0;
              const maxPrice = ut.maxPrice ?? ut.priceRange?.max ?? 0;
              const hasPrice = minPrice > 0;

              const available = ut.availableUnits ?? 0;
              const total = ut.totalUnits ?? 0;
              const isSoldOut = total > 0 && available === 0;

              return (
                <tr key={idx} className="hover:bg-[#f8fcfd]/60 transition-colors group">
                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
                        {isComm ? (
                          <Store className="w-4.5 h-4.5 text-[#029bba]" />
                        ) : (
                          <Home className="w-4.5 h-4.5 text-[#029bba]" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-[#029bba] transition-colors">
                          {ut.name || ut.type || 'Unit Type'}
                        </p>
                        {ut.description && (
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 max-w-[200px]">
                            {ut.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4.5 font-semibold text-gray-700">
                    {isComm ? (
                      <span className="px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 rounded-md uppercase tracking-wider font-extrabold">
                        Commercial
                      </span>
                    ) : (
                      <div className="flex gap-2 text-xs">
                        {ut.bedrooms && <span>{ut.bedrooms} Bed</span>}
                        {ut.bathrooms && <span className="text-gray-300">|</span>}
                        {ut.bathrooms && <span className="text-gray-500">{ut.bathrooms} Bath</span>}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4.5 font-mono text-xs text-gray-600 font-bold tabular-nums">
                    {areaStr}
                  </td>

                  <td className="px-6 py-4.5">
                    {hasPrice ? (
                      <div className="space-y-0.5">
                        {saleMode === 'Rent' ? (
                          <p className="font-extrabold text-gray-900">
                            PKR {formatDetailPrice(minPrice)} <span className="text-xs text-gray-400 font-normal">/ month</span>
                          </p>
                        ) : saleMode === 'Installment' ? (
                          <>
                            <p className="font-extrabold text-[#029bba]">
                              Down: PKR {formatDetailPrice(Math.round(minPrice * 0.15))}
                            </p>
                            <p className="text-[10px] font-semibold text-gray-500">
                              Based on 15% booking
                            </p>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <p className="font-extrabold text-gray-900">
                              PKR {formatDetailPrice(minPrice)}
                              {maxPrice > minPrice && ` - ${formatDetailPrice(maxPrice)}`}
                            </p>
                            <PriceWithConverter minPKR={minPrice} maxPKR={maxPrice > minPrice ? maxPrice : undefined} size="sm" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Contact for Price</span>
                    )}
                  </td>

                  <td className="px-6 py-4.5">
                    {isSoldOut ? (
                      <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-600 rounded-lg">
                        Sold Out
                      </span>
                    ) : available > 0 && available < 3 ? (
                      <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 rounded-lg animate-pulse">
                        Only {available} Left
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-green-50 text-green-700 rounded-lg">
                        In Stock
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {ut.image || ut.imageUrl || ut.floorPlanPdfUrl ? (
                        <button
                          onClick={() => setActiveFloorPlan(ut.image || ut.imageUrl || ut.floorPlanPdfUrl || null)}
                          className="p-1.5 hover:bg-[#029bba]/10 text-gray-500 hover:text-[#029bba] rounded-lg transition-all"
                          title="View Floor Plan"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => setInquiryUnit(ut)}
                        disabled={isSoldOut}
                        className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                          isSoldOut
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#029bba] to-[#027a94] text-white hover:shadow-md'
                        }`}
                      >
                        Inquire
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FLOOR PLAN POPUP LIGHTBOX */}
      {activeFloorPlan && (
        <div className="fixed inset-0 z-[120] bg-black/90 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setActiveFloorPlan(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden bg-white rounded-2xl p-2 shadow-2xl relative">
            {activeFloorPlan.toLowerCase().endsWith('.pdf') ? (
              <iframe src={activeFloorPlan} className="w-[80vw] h-[80vh] rounded-xl border-0" />
            ) : (
              <img
                src={activeFloorPlan}
                alt="Floor Plan Layout Preview"
                className="max-h-[80vh] max-w-full object-contain rounded-xl"
              />
            )}
          </div>
        </div>
      )}

      {/* INQUIRY MODAL OVERLAY */}
      {inquiryUnit && (
        <UnitInquiryModal
          unit={inquiryUnit}
          project={project}
          onClose={() => setInquiryUnit(null)}
        />
      )}
    </section>
  );
}

// ============================================================================
// MODAL INNER FORM
// ============================================================================

interface UnitInquiryModalProps {
  unit: UnitTypeOffering;
  project: ProjectDetailData;
  onClose: () => void;
}

function UnitInquiryModal({ unit, project, onClose }: UnitInquiryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: `Assalam-o-Alaikum, I am interested in the ${unit.name || unit.type || 'Unit'} space layout at ${project.projectName}. Please share booking steps.`,
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

    (window as any).onTurnstileSuccess = (token: string) => {
      setTurnstileToken(token);
    };

    return () => {
      delete (window as any).onTurnstileSuccess;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (!turnstileToken && process.env.NODE_ENV !== 'development') {
      setErrorMsg('Please complete verification check first.');
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
          source: 'unit_table',
          propertyTitle: project.projectName,
          propertySlug: project.slug,
        }),
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Submission failed');
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-[#001f2b]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-base font-black text-[#001f2b]">Request Saved!</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Your inquiry for <strong className="text-gray-700">{unit.name || unit.type}</strong> has been logged. Our intelligence desk will reach out shortly.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2 bg-[#029bba] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:bg-[#027a94]"
            >
              OK
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-[#029bba]/10 text-[#029bba] rounded">
                Unit Match
              </span>
              <h3 className="text-lg font-black text-[#001f2b] tracking-tight mt-1">
                Inquire About Layout
              </h3>
              <p className="text-xs text-gray-400">
                Unit Type: <span className="font-bold text-gray-700">{unit.name || unit.type}</span>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Hammad Azeem"
                  className="w-full px-4 py-2.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@domain.com"
                    className="w-full px-4 py-2.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full px-4 py-2.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  Message
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
                />
              </div>
            </div>

            {/* Cloudflare Turnstile */}
            <div className="flex justify-center py-0.5">
              <div
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                data-callback="onTurnstileSuccess"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#029bba] hover:bg-[#027a94] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#029bba]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                'Secure Submission'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}