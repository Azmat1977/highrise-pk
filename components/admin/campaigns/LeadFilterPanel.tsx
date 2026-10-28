// ========== FILE: components/admin/campaigns/LeadFilterPanel.tsx ==========
// 🎯 ENTERPRISE LEAD FILTER PANEL — HIGHRISE.PK
// 10-dimensional filter UI with live recipient count updates
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ 10 filter dimensions (city, status, temperature, etc.)
//   ✅ Multi-select chips with visual feedback
//   ✅ Score range slider (0-100)
//   ✅ Date range picker
//   ✅ Assigned agent email input
//   ✅ Live recipient count (debounced API call)
//   ✅ Filter summary badge
//   ✅ Clear all filters button
//   ✅ Collapsible sections
//   ✅ Mobile responsive
//   ✅ Empty state warnings
//   ✅ Preset date shortcuts (Last 7/30/90 days)
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  Flame,
  DollarSign,
  Filter,
  Users,
  Calendar,
  Award,
  Target,
  Radio,
  UserCheck,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Eye,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

export interface LeadFilters {
  cities:       string[];
  statuses:     string[];
  temperatures: string[];
  budgetTiers:  string[];
  sources:      string[];
  leadTypes:    string[];
  priorities:   string[];
  minScore:     number;
  maxScore:     number;
  dateFrom:     string;  // ISO date string
  dateTo:       string;
  assignedTo:   string;
}

interface LeadFilterPanelProps {
  filters:  LeadFilters;
  onChange: (filters: LeadFilters) => void;
  source:   'subscribers' | 'leads' | 'both';
  onPreviewClick?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 FILTER OPTIONS
// ═══════════════════════════════════════════════════════════════

const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi',
  'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
  'Sialkot', 'Gujranwala', 'Hyderabad', 'Bahawalpur',
];

const LEAD_STATUSES = [
  { value: 'new',                   label: 'New',                  color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted',             label: 'Contacted',            color: 'bg-cyan-100 text-cyan-700' },
  { value: 'qualified',             label: 'Qualified',            color: 'bg-emerald-100 text-emerald-700' },
  { value: 'site_visit_scheduled',  label: 'Site Visit Scheduled', color: 'bg-purple-100 text-purple-700' },
  { value: 'proposal_sent',         label: 'Proposal Sent',        color: 'bg-indigo-100 text-indigo-700' },
  { value: 'negotiation',           label: 'Negotiation',          color: 'bg-amber-100 text-amber-700' },
  { value: 'won',                   label: 'Won',                  color: 'bg-green-100 text-green-700' },
  { value: 'lost',                  label: 'Lost',                 color: 'bg-gray-100 text-gray-700' },
  { value: 'nurture',               label: 'Nurture',              color: 'bg-pink-100 text-pink-700' },
];

const TEMPERATURES = [
  { value: 'cold',    label: '❄️ Cold',    color: 'bg-blue-100 text-blue-700' },
  { value: 'warm',    label: '☀️ Warm',    color: 'bg-yellow-100 text-yellow-700' },
  { value: 'hot',     label: '🔥 Hot',     color: 'bg-orange-100 text-orange-700' },
  { value: 'burning', label: '🌋 Burning', color: 'bg-red-100 text-red-700' },
];

const BUDGET_TIERS = [
  { value: 'under_50L',  label: 'Under 50 Lakh' },
  { value: '50L_1Cr',    label: '50 Lakh - 1 Cr' },
  { value: '1Cr_3Cr',    label: '1 Cr - 3 Cr' },
  { value: '3Cr_5Cr',    label: '3 Cr - 5 Cr' },
  { value: 'above_5Cr',  label: 'Above 5 Cr' },
];

const LEAD_SOURCES = [
  { value: 'project_page',       label: 'Project Page' },
  { value: 'property_page',      label: 'Property Page' },
  { value: 'listing_page',       label: 'Listing Page' },
  { value: 'search_results',     label: 'Search Results' },
  { value: 'developer_profile',  label: 'Developer Profile' },
  { value: 'agent_profile',      label: 'Agent Profile' },
  { value: 'direct',             label: 'Direct' },
  { value: 'referral',           label: 'Referral' },
  { value: 'whatsapp',           label: 'WhatsApp' },
  { value: 'call',               label: 'Phone Call' },
];

const LEAD_TYPES = [
  { value: 'project_interest',    label: 'Project Interest' },
  { value: 'property_inquiry',    label: 'Property Inquiry' },
  { value: 'property_viewing',    label: 'Property Viewing' },
  { value: 'site_visit',          label: 'Site Visit' },
  { value: 'make_offer',          label: 'Make Offer' },
  { value: 'rent_inquiry',        label: 'Rent Inquiry' },
  { value: 'call_back',           label: 'Call Back Request' },
  { value: 'brochure_download',   label: 'Brochure Download' },
  { value: 'payment_plan',        label: 'Payment Plan Inquiry' },
  { value: 'general_inquiry',     label: 'General Inquiry' },
];

const PRIORITIES = [
  { value: 'low',     label: 'Low',     color: 'bg-gray-100 text-gray-700' },
  { value: 'medium',  label: 'Medium',  color: 'bg-blue-100 text-blue-700' },
  { value: 'high',    label: 'High',    color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent',  label: 'Urgent',  color: 'bg-red-100 text-red-700' },
];

const DATE_PRESETS = [
  { label: 'Last 7 days',  days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Toggle a value in a string array.
 */
function toggleArrayValue(arr: string[], value: string): string[] {
  return arr.includes(value)
    ? arr.filter((v) => v !== value)
    : [...arr, value];
}

/**
 * Count active filters.
 */
function countActiveFilters(filters: LeadFilters): number {
  let count = 0;
  if (filters.cities.length > 0)       count++;
  if (filters.statuses.length > 0)     count++;
  if (filters.temperatures.length > 0) count++;
  if (filters.budgetTiers.length > 0)  count++;
  if (filters.sources.length > 0)      count++;
  if (filters.leadTypes.length > 0)    count++;
  if (filters.priorities.length > 0)   count++;
  if (filters.minScore > 0 || filters.maxScore < 100) count++;
  if (filters.dateFrom || filters.dateTo) count++;
  if (filters.assignedTo)              count++;
  return count;
}

/**
 * Get default filters.
 */
export function getDefaultFilters(): LeadFilters {
  return {
    cities:       [],
    statuses:     [],
    temperatures: [],
    budgetTiers:  [],
    sources:      [],
    leadTypes:    [],
    priorities:   [],
    minScore:     0,
    maxScore:     100,
    dateFrom:     '',
    dateTo:       '',
    assignedTo:   '',
  };
}

// ═══════════════════════════════════════════════════════════════
// 🎨 COLLAPSIBLE SECTION
// ═══════════════════════════════════════════════════════════════

const FilterSection: React.FC<{
  title:      string;
  icon:       React.ReactNode;
  count?:     number;
  defaultOpen?: boolean;
  children:   React.ReactNode;
}> = ({ title, icon, count, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 
                   hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="text-[#029bba]">{icon}</div>
          <span className="text-sm font-black text-[#004063]">
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#029bba] 
                             text-white text-xs font-black">
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎨 FILTER CHIP
// ═══════════════════════════════════════════════════════════════

const FilterChip: React.FC<{
  label:      string;
  active:     boolean;
  color?:     string;
  onClick:    () => void;
}> = ({ label, active, color, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      inline-flex items-center gap-1 px-3 py-1.5 rounded-xl 
      text-xs font-bold transition-all
      ${active
        ? `${color || 'bg-[#029bba] text-white'} shadow-sm ring-2 ring-[#029bba]/20`
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }
    `}
  >
    {active && <Check className="w-3 h-3" strokeWidth={3} />}
    {label}
  </button>
);

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const LeadFilterPanel: React.FC<LeadFilterPanelProps> = ({
  filters,
  onChange,
  source,
  onPreviewClick,
}) => {

  // Live count state
  const [liveCount,     setLiveCount]     = useState<number | null>(null);
  const [countLoading,  setCountLoading]  = useState(false);
  const [countWarning,  setCountWarning]  = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ═══════════════════════════════════════════════════════════
  // FIELD UPDATERS
  // ═══════════════════════════════════════════════════════════

  const updateField = useCallback(<K extends keyof LeadFilters>(
    field: K,
    value: LeadFilters[K]
  ) => {
    onChange({ ...filters, [field]: value });
  }, [filters, onChange]);

  const toggleArrayField = useCallback((
    field: 'cities' | 'statuses' | 'temperatures' | 'budgetTiers' | 'sources' | 'leadTypes' | 'priorities',
    value: string
  ) => {
    onChange({ ...filters, [field]: toggleArrayValue(filters[field], value) });
  }, [filters, onChange]);

  const clearAllFilters = useCallback(() => {
    onChange(getDefaultFilters());
  }, [onChange]);

  const applyDatePreset = useCallback((days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    onChange({
      ...filters,
      dateFrom: start.toISOString().split('T')[0],
      dateTo:   end.toISOString().split('T')[0],
    });
  }, [filters, onChange]);

  // ═══════════════════════════════════════════════════════════
  // LIVE COUNT FETCHER (Debounced)
  // ═══════════════════════════════════════════════════════════

  const fetchLiveCount = useCallback(async () => {
    // Only fetch if source includes leads
    if (source === 'subscribers') {
      setLiveCount(null);
      return;
    }

    setCountLoading(true);
    setCountWarning(null);

    try {
      const res = await fetch('/api/newsletter/campaigns/recipients-preview', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          leadFilters: filters,
          countOnly:   true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setLiveCount(data.counts?.total || 0);
        if (data.warnings && data.warnings.length > 0) {
          setCountWarning(data.warnings[0]);
        }
      } else {
        setLiveCount(0);
      }
    } catch {
      setLiveCount(null);
    } finally {
      setCountLoading(false);
    }
  }, [filters, source]);

  // Debounce filter changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchLiveCount();
    }, 500);  // 500ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters, source, fetchLiveCount]);

  // ═══════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );

  // Don't render for subscribers-only source
  if (source === 'subscribers') {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

      {/* ═══════════════════════════════════════════
          HEADER — Filter Summary + Actions
          ═══════════════════════════════════════════ */}
      <div className="px-4 py-3 bg-gradient-to-br from-white to-gray-50 
                      border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#029bba]" />
            <h3 className="text-sm font-black text-[#004063]">
              Lead Filters
            </h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#029bba] 
                               text-white text-xs font-black">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-bold text-gray-500 hover:text-red-600 
                         flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear All
            </button>
          )}
        </div>

        {/* Live Count Display */}
        <div className="flex items-center justify-between p-3 
                        bg-gradient-to-br from-[#029bba]/5 to-[#004063]/5 
                        rounded-xl">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#029bba]" />
            <div>
              <p className="text-xs text-gray-600 font-semibold">
                Matching Recipients
              </p>
              <p className="text-2xl font-black text-[#029bba]">
                {countLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin inline" />
                ) : liveCount !== null ? (
                  liveCount.toLocaleString()
                ) : (
                  '—'
                )}
              </p>
            </div>
          </div>
          {onPreviewClick && liveCount !== null && liveCount > 0 && (
            <button
              type="button"
              onClick={onPreviewClick}
              className="flex items-center gap-1 px-3 py-2 rounded-xl 
                         bg-[#029bba] hover:bg-[#027a94] text-white 
                         font-semibold text-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          )}
        </div>

        {countWarning && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 
                          rounded-lg flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{countWarning}</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          FILTER SECTIONS
          ═══════════════════════════════════════════ */}
      <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">

        {/* Cities */}
        <FilterSection
          title="Cities"
          icon={<MapPin className="w-4 h-4" />}
          count={filters.cities.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {PAKISTAN_CITIES.map((city) => (
              <FilterChip
                key={city}
                label={city}
                active={filters.cities.includes(city)}
                onClick={() => toggleArrayField('cities', city)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Lead Status */}
        <FilterSection
          title="Lead Status"
          icon={<Radio className="w-4 h-4" />}
          count={filters.statuses.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {LEAD_STATUSES.map((s) => (
              <FilterChip
                key={s.value}
                label={s.label}
                active={filters.statuses.includes(s.value)}
                color={s.color}
                onClick={() => toggleArrayField('statuses', s.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Temperature */}
        <FilterSection
          title="Temperature"
          icon={<Flame className="w-4 h-4" />}
          count={filters.temperatures.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {TEMPERATURES.map((t) => (
              <FilterChip
                key={t.value}
                label={t.label}
                active={filters.temperatures.includes(t.value)}
                color={t.color}
                onClick={() => toggleArrayField('temperatures', t.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Budget */}
        <FilterSection
          title="Budget Range"
          icon={<DollarSign className="w-4 h-4" />}
          count={filters.budgetTiers.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {BUDGET_TIERS.map((b) => (
              <FilterChip
                key={b.value}
                label={b.label}
                active={filters.budgetTiers.includes(b.value)}
                onClick={() => toggleArrayField('budgetTiers', b.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Priority */}
        <FilterSection
          title="Priority"
          icon={<Sparkles className="w-4 h-4" />}
          count={filters.priorities.length}
          defaultOpen={false}
        >
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map((p) => (
              <FilterChip
                key={p.value}
                label={p.label}
                active={filters.priorities.includes(p.value)}
                color={p.color}
                onClick={() => toggleArrayField('priorities', p.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Lead Source */}
        <FilterSection
          title="Lead Source"
          icon={<Target className="w-4 h-4" />}
          count={filters.sources.length}
          defaultOpen={false}
        >
          <div className="flex flex-wrap gap-1.5">
            {LEAD_SOURCES.map((s) => (
              <FilterChip
                key={s.value}
                label={s.label}
                active={filters.sources.includes(s.value)}
                onClick={() => toggleArrayField('sources', s.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Lead Type */}
        <FilterSection
          title="Inquiry Type"
          icon={<UserCheck className="w-4 h-4" />}
          count={filters.leadTypes.length}
          defaultOpen={false}
        >
          <div className="flex flex-wrap gap-1.5">
            {LEAD_TYPES.map((t) => (
              <FilterChip
                key={t.value}
                label={t.label}
                active={filters.leadTypes.includes(t.value)}
                onClick={() => toggleArrayField('leadTypes', t.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Score Range */}
        <FilterSection
          title="Lead Score"
          icon={<Award className="w-4 h-4" />}
          count={(filters.minScore > 0 || filters.maxScore < 100) ? 1 : 0}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Min: <strong className="text-[#029bba]">{filters.minScore}</strong></span>
              <span>Max: <strong className="text-[#029bba]">{filters.maxScore}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Min Score</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filters.minScore}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateField('minScore', Math.min(val, filters.maxScore));
                  }}
                  className="w-full accent-[#029bba]"
                />
              </label>
              <label className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Max Score</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filters.maxScore}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateField('maxScore', Math.max(val, filters.minScore));
                  }}
                  className="w-full accent-[#029bba]"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">
              💡 Higher scores = more engaged leads
            </p>
          </div>
        </FilterSection>

        {/* Date Range */}
        <FilterSection
          title="Inquiry Date"
          icon={<Calendar className="w-4 h-4" />}
          count={filters.dateFrom || filters.dateTo ? 1 : 0}
          defaultOpen={false}
        >
          <div className="space-y-3">
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => applyDatePreset(preset.days)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 
                             hover:bg-[#029bba]/10 hover:text-[#029bba] 
                             text-xs font-semibold text-gray-600 
                             transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              {(filters.dateFrom || filters.dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    updateField('dateFrom', '');
                    updateField('dateTo', '');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 
                             hover:bg-red-100 text-xs font-semibold 
                             transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Custom Dates */}
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="text-xs text-gray-500 mb-1 block">From</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateField('dateFrom', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-300 
                             focus:ring-2 focus:ring-[#029bba]/20 
                             focus:border-[#029bba] outline-none text-xs"
                />
              </label>
              <label>
                <span className="text-xs text-gray-500 mb-1 block">To</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateField('dateTo', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-300 
                             focus:ring-2 focus:ring-[#029bba]/20 
                             focus:border-[#029bba] outline-none text-xs"
                />
              </label>
            </div>
          </div>
        </FilterSection>

        {/* Assigned Agent */}
        <FilterSection
          title="Assigned To"
          icon={<UserCheck className="w-4 h-4" />}
          count={filters.assignedTo ? 1 : 0}
          defaultOpen={false}
        >
          <input
            type="email"
            value={filters.assignedTo}
            onChange={(e) => updateField('assignedTo', e.target.value.toLowerCase())}
            placeholder="agent@highrise.pk"
            className="w-full px-3 py-2 rounded-xl border border-gray-300 
                       focus:ring-2 focus:ring-[#029bba]/20 
                       focus:border-[#029bba] outline-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Filter leads assigned to specific agent/developer
          </p>
        </FilterSection>
      </div>

      {/* ═══════════════════════════════════════════
          FOOTER — Refresh Button
          ═══════════════════════════════════════════ */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 
                      flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {activeFilterCount === 0 ? 'No filters applied' : `${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active`}
        </p>
        <button
          type="button"
          onClick={fetchLiveCount}
          disabled={countLoading}
          className="text-xs font-bold text-[#029bba] hover:text-[#027a94] 
                     flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${countLoading ? 'animate-spin' : ''}`} />
          Refresh Count
        </button>
      </div>
    </div>
  );
};

export default LeadFilterPanel;
// ========== END OF FILE ==========