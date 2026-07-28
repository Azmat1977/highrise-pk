/**
 * components/projects/HeroSection.tsx
 *
 * Unified Hero — Sections 1B + 1C + 2 merged into ONE cohesive block.
 * Replaces: Breadcrumb.tsx + PageHeader.tsx + HeroSearch.tsx
 *
 * Design pattern (locked):
 *   ✅ Centered layout throughout
 *   ✅ bg-[#001a2e] base + gradient orbs (teal + purple blur)
 *   ✅ Radial dot pattern overlay
 *   ✅ ONE trust badge pill above H1
 *   ✅ Gradient text on city/keyword in H1 (from-[#029bba] to-[#4dd6f5])
 *   ✅ Roman Urdu subtitle with bold accent words
 *   ✅ 4 inline color-coded trust chips (emerald / teal / amber / purple)
 *   ✅ Glassmorphism search panel (bg-white/[0.07] backdrop-blur-xl)
 *   ✅ White search bar + gradient teal CTA button
 *   ✅ 4 primary filters visible (City / Category / Nature / Budget Tier)
 *   ✅ "More Filters" toggle → Property Type / Area / Possession / NOC /
 *      Developer / Locality / Min-Max Budget (precision)
 *   ✅ Stats bar with circular icon backgrounds
 *   ✅ JSON-LD BreadcrumbList schema
 *   ✅ URL-synced filters (V2 architecture preserved)
 *   ✅ Debounced developer/locality inputs (no URL thrash)
 */

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  Home,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  MapPin,
  Building2,
  Layers,
  Banknote,
  Ruler,
  CalendarCheck,
  ShieldCheck,
  BadgeCheck,
  Shield,
  Sparkles,
  CheckCircle2,
  Users,
  RotateCcw,
} from 'lucide-react';

import { FilterDropdown }        from '@/components/projects/FilterDropdown';
import type { FilterOption, FilterOptionGroup }
  from '@/components/projects/FilterDropdown';

import type {
  FilterState,
  CityCount,
  ProjectCategoryCount,
  PropertyType,
  PossessionStatus,
  PlatformStats,
  ProjectCategory,
  ProjectNature,
  BudgetTierKey,
} from '@/types/projects';

import {
  PROPERTY_TYPE_LABELS,
  PROJECT_CATEGORY_LABELS,
  PROJECT_NATURE_LABELS,
  PKR_BUDGET_STEPS,
  MARLA_STEPS,
  BUDGET_TIERS,
  DEFAULT_FILTERS,
  formatPKR,
  formatAreaMarla,
  getMatchingBudgetTier,
  budgetTierToRange,
} from '@/types/projects';

// ─── FALLBACK CITY LIST ──────────────────────────────────────────────────────
// Used when SSR aggregation returns empty (fresh DB, cache miss, etc.)

const PAKISTAN_CITIES = [
  'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Multan', 'Peshawar',
  'Faisalabad', 'Sialkot', 'Gujranwala', 'Bahawalpur', 'Sargodha',
  'Hyderabad', 'Quetta', 'Sukkur', 'Larkana', 'Sheikhupura', 'Jhelum',
  'Mardan', 'Mirpur', 'Abbottabad', 'Kasur', 'Okara', 'Sahiwal',
];

// ─── PROPERTY TYPE GROUPS (Advanced filter) ──────────────────────────────────

const TYPE_GROUPS: Array<{
  group: string;
  types: PropertyType[];
}> = [
  { group: 'Residential', types: ['flats', 'houses', 'penthouse', 'farm_houses'] },
  { group: 'Plots',       types: ['plots', 'commercial_plots', 'agricultural_land', 'industrial_land'] },
  { group: 'Commercial',  types: ['shops', 'offices', 'buildings', 'warehouses'] },
];

const POSSESSION_OPTIONS: Array<{
  value: PossessionStatus;
  label: string;
}> = [
  { value: 'ready_to_move',      label: 'Ready to Move' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'new_launch',         label: 'New Launch' },
  { value: 'pre_launch',         label: 'Pre-Launch' },
];

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface HeroSectionProps {
  filters:        FilterState;
  updateFilters:  (patch: Partial<FilterState>) => void;
  cityCounts:     CityCount[];
  categoryCounts: ProjectCategoryCount[];
  totalCount:     number;
  platformStats:  PlatformStats;
  loading?:       boolean;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function HeroSection({
  filters,
  updateFilters,
  cityCounts,
  totalCount,
  platformStats,
  loading = false,
}: HeroSectionProps) {

  // ── Local buffers for debounced text inputs ──────────────
  const [searchBuffer,   setSearchBuffer]   = useState('');
  const [builderBuffer,  setBuilderBuffer]  = useState(filters.builder);
  const [localityBuffer, setLocalityBuffer] = useState(filters.locality);
  const [showAdvanced,   setShowAdvanced]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync buffers when filters change externally (back/forward nav)
  useEffect(() => {
    setBuilderBuffer(filters.builder);
    setLocalityBuffer(filters.locality);
  }, [filters.builder, filters.locality]);

  // Debounced update for text inputs
  const debouncedUpdate = (patch: Partial<FilterState>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilters(patch);
    }, 500);
  };

  const handleSearch = () => {
    if (searchBuffer.trim()) {
      updateFilters({ locality: searchBuffer.trim() });
    }
  };

  // ── Cities to show — MERGE static list + live counts ──────
  // Enterprise pattern: Always show all major Pakistani cities.
  // Live count overlaid where data exists, "Soon" indicator for empty.
  // Matches Section 8 (BrowseByCity) UX consistency.
  //
  // Sort order: cities with data first (by count DESC), then empty
  // cities alphabetically. Ensures active cities are always visible.
  const citiesToShow = (() => {
    // Build a lookup map for O(1) count access
    const countMap = new Map<string, number>();
    cityCounts.forEach(c => {
      countMap.set(c.city.toLowerCase(), c.count);
    });

    // Merge: for each city in PAKISTAN_CITIES, attach its live count (or 0)
    const merged = PAKISTAN_CITIES.map(cityName => ({
      city:  cityName,
      count: countMap.get(cityName.toLowerCase()) ?? 0,
    }));

    // Also include any cities from cityCounts that aren't in PAKISTAN_CITIES
    // (edge case: DB has a city not in our static list)
    const staticSet = new Set(PAKISTAN_CITIES.map(c => c.toLowerCase()));
    cityCounts.forEach(c => {
      if (!staticSet.has(c.city.toLowerCase())) {
        merged.push({ city: c.city, count: c.count });
      }
    });

    // Sort: cities with projects first (count DESC), then alphabetical
    return merged.sort((a, b) => {
      if (a.count > 0 && b.count === 0) return -1;
      if (a.count === 0 && b.count > 0) return 1;
      if (a.count !== b.count) return b.count - a.count;
      return a.city.localeCompare(b.city);
    });
  })();

  // Active filter count
  const activeCount = [
    filters.city, filters.type, filters.category, filters.nature,
    filters.minBudget, filters.maxBudget, filters.minArea, filters.maxArea,
    filters.possession, filters.noc ? 'noc' : '',
    filters.builder, filters.locality,
  ].filter(Boolean).length;

  const resetAll = () => {
    updateFilters({ ...DEFAULT_FILTERS });
    setSearchBuffer('');
    setBuilderBuffer('');
    setLocalityBuffer('');
    setShowAdvanced(false);
  };

  // Current budget tier (matches URL state or empty = custom range)
  const currentBudgetTier = getMatchingBudgetTier(
    filters.minBudget, filters.maxBudget
  );

  // ── JSON-LD Breadcrumb schema ─────────────────────────────
  const schemaItems: Array<Record<string, string | number>> = [
    { '@type': 'ListItem', position: 1, name: 'Home',
      item: 'https://highrise.pk/' },
    { '@type': 'ListItem', position: 2, name: 'New Projects',
      item: 'https://highrise.pk/projects' },
  ];
  if (filters.city) {
    schemaItems.push({
      '@type': 'ListItem', position: 3,
      name: `New Projects in ${filters.city}`,
      item: `https://highrise.pk/projects?city=${encodeURIComponent(filters.city)}`,
    });
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <>
      {/* JSON-LD BreadcrumbList schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context':      'https://schema.org',
            '@type':         'BreadcrumbList',
            itemListElement: schemaItems,
          }),
        }}
      />

      <div className="relative bg-[#001a2e] text-white overflow-hidden">

        {/* ── Decorative background layers ───────────────────── */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br
                          from-[#001a2e] via-[#002d4a] to-[#001a2e]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(#029bba 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
        </div>

        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px]
                          bg-[#029bba] rounded-full blur-[150px]
                          opacity-15 translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px]
                          bg-purple-500 rounded-full blur-[120px]
                          opacity-10 -translate-x-1/3 translate-y-1/3" />
        </div>

        {/* ── Main content ────────────────────────────────────── */}
        <div className="relative z-10 pt-8 pb-16 md:pt-12 md:pb-20">
          <div className="max-w-6xl mx-auto px-4 text-center">

            {/* ── Breadcrumb ──────────────────────────────────── */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center justify-center gap-2
                         text-sm text-white/50 mb-6 md:mb-8"
            >
              <Link
                href="/"
                className="hover:text-white transition-colors
                           flex items-center gap-1 font-medium"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-white/30" />
              {filters.city ? (
                <>
                  <Link
                    href="/projects"
                    className="hover:text-white transition-colors font-medium"
                  >
                    New Projects
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-white/90 font-semibold">
                    {filters.city}
                  </span>
                </>
              ) : (
                <span className="text-white/90 font-semibold">
                  New Projects
                </span>
              )}
            </nav>

            {/* ── Trust badge pill ────────────────────────────── */}
            <div className="inline-flex items-center gap-2 px-4 py-2
                            rounded-full bg-white/10 border border-white/20
                            text-sm font-semibold text-[#4dd6f5] mb-6
                            backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4" />
              Pakistan&apos;s Most Trusted Real Estate Platform
            </div>

            {/* ── H1 Headline ─────────────────────────────────── */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black
                           mb-4 tracking-tight leading-[1.1]">
              {filters.city ? (
                <>
                  New Projects in{' '}
                  <span className="text-transparent bg-clip-text
                                   bg-gradient-to-r from-[#029bba]
                                   to-[#4dd6f5]">
                    {filters.city}
                  </span>
                </>
              ) : (
                <>
                  Explore Verified{' '}
                  <span className="text-transparent bg-clip-text
                                   bg-gradient-to-r from-[#029bba]
                                   to-[#4dd6f5]">
                    Projects in Pakistan
                  </span>
                </>
              )}
            </h1>

            {/* (Roman Urdu tagline removed — trust chips carry the message) */}

            {/* ── Subtitle with bold accents + live count ─────── */}
            <div className="max-w-3xl mx-auto mb-8">
              {loading ? (
                <div className="h-6 w-96 mx-auto rounded-full
                                bg-white/10 animate-pulse" />
              ) : (
                <p className="text-base md:text-lg text-gray-200
                              leading-relaxed mb-6 font-light">
                  {filters.city ? (
                    <>
                      <span className="font-bold text-white">
                        {totalCount > 0
                          ? `${totalCount.toLocaleString()}+ verified projects`
                          : 'Verified projects'}
                      </span>
                      {' '}waiting for you in{' '}
                      <span className="font-bold text-[#4dd6f5]">
                        {filters.city}
                      </span>
                      . Har project verified, har developer approved.
                    </>
                  ) : (
                    <>
                      Pakistan ka{' '}
                      <span className="font-bold text-[#4dd6f5]">
                        sabse trusted
                      </span>{' '}
                      real estate platform. Har project verified, har
                      developer approved,{' '}
                      <span className="font-bold text-white">
                        zero fake listings
                      </span>.
                    </>
                  )}
                </p>
              )}

              {/* Trust chips — single line, no wrap */}
              <div className="flex items-center justify-center
                              gap-1.5 md:gap-3 overflow-x-auto">
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5
                                 md:px-3 rounded-full bg-emerald-500/10
                                 border border-emerald-500/30
                                 text-emerald-300 text-[11px] md:text-sm
                                 font-semibold backdrop-blur-sm whitespace-nowrap
                                 flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  NOC Verified
                </span>
                <span className="text-white/20 flex-shrink-0">•</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5
                                 md:px-3 rounded-full bg-[#029bba]/10
                                 border border-[#029bba]/30
                                 text-[#4dd6f5] text-[11px] md:text-sm
                                 font-semibold backdrop-blur-sm whitespace-nowrap
                                 flex-shrink-0">
                  <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  Approved Developers
                </span>
                <span className="text-white/20 flex-shrink-0">•</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5
                                 md:px-3 rounded-full bg-amber-500/10
                                 border border-amber-500/30
                                 text-amber-300 text-[11px] md:text-sm
                                 font-semibold backdrop-blur-sm whitespace-nowrap
                                 flex-shrink-0">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                  Zero Fake Listings
                </span>
                <span className="text-white/20 flex-shrink-0">•</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5
                                 md:px-3 rounded-full bg-purple-500/10
                                 border border-purple-500/30
                                 text-purple-300 text-[11px] md:text-sm
                                 font-semibold backdrop-blur-sm whitespace-nowrap
                                 flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                  100% Transparent
                </span>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                SEARCH + FILTER PANEL (glassmorphism)
            ══════════════════════════════════════════════════ */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl
                              border border-white/10 p-4 md:p-6 shadow-2xl
                              text-left">

                {/* ── Search input + CTA button ────────────────── */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2
                                       -translate-y-1/2 w-5 h-5
                                       text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchBuffer}
                      onChange={e => setSearchBuffer(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                      placeholder="Search by project name, developer, or area..."
                      className="block w-full h-14 pl-12 pr-4 bg-white
                                 rounded-xl text-gray-900 placeholder-gray-400
                                 border-0 focus:ring-2 focus:ring-[#029bba]
                                 focus:outline-none transition-all
                                 text-base font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="h-14 bg-gradient-to-r from-[#029bba]
                               to-[#017a94] hover:from-[#02a8c9]
                               hover:to-[#018a9a] text-white px-8
                               rounded-xl font-bold transition-all
                               shadow-lg shadow-[#029bba]/30
                               flex items-center justify-center gap-2
                               whitespace-nowrap active:scale-95"
                  >
                    <Search className="w-5 h-5" />
                    Search Projects
                  </button>
                </div>

                {/* ── Primary filter row: 4 dropdowns ──────────── */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">

                  {/* City — searchable (23+ cities from PAKISTAN_CITIES) */}
                  {/* Cities with projects show count badge. Empty cities show */}
                  {/* clean name only — empty state messaging happens on filtered page. */}
                  <FilterDropdown
                    icon={MapPin}
                    placeholder="All Cities"
                    value={filters.city}
                    onChange={v => updateFilters({ city: v })}
                    searchable
                    searchPlaceholder="Search city..."
                    options={[
                      { value: '', label: 'All Cities' },
                      ...citiesToShow.map(c => ({
                        value: c.city,
                        label: c.city,
                        // Count badge shows only when city has projects
                        // Enterprise pattern: no "Soon" clutter in dropdown,
                        // empty state on filtered page handles messaging
                        count: c.count > 0 ? c.count : undefined,
                      })),
                    ]}
                  />

                  {/* Project Category */}
                  <FilterDropdown
                    icon={Building2}
                    placeholder="All Categories"
                    value={filters.category}
                    onChange={v => updateFilters({
                      category: v as ProjectCategory | '',
                    })}
                    options={[
                      { value: '', label: 'All Categories' },
                      ...(Object.keys(PROJECT_CATEGORY_LABELS) as ProjectCategory[])
                        .map(key => ({
                          value: key,
                          label: PROJECT_CATEGORY_LABELS[key],
                        })),
                    ]}
                  />

                  {/* Project Nature */}
                  <FilterDropdown
                    icon={Layers}
                    placeholder="All Types"
                    value={filters.nature}
                    onChange={v => updateFilters({
                      nature: v as ProjectNature | '',
                    })}
                    options={[
                      { value: '', label: 'All Types' },
                      ...(Object.keys(PROJECT_NATURE_LABELS) as ProjectNature[])
                        .map(key => ({
                          value: key,
                          label: PROJECT_NATURE_LABELS[key],
                        })),
                    ]}
                  />

                  {/* Budget Tier */}
                  <FilterDropdown
                    icon={Banknote}
                    placeholder="Any Budget"
                    value={currentBudgetTier}
                    onChange={v => {
                      const patch = budgetTierToRange(
                        v as BudgetTierKey | '',
                      );
                      updateFilters(patch);
                    }}
                    options={[
                      { value: '', label: 'Any Budget' },
                      ...BUDGET_TIERS.map(t => ({
                        value: t.key,
                        label: t.label,
                      })),
                    ]}
                  />
                </div>

                {/* ── More Filters toggle + Active count + Reset ─ */}
                <div className="mt-4 flex items-center justify-between
                                flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(prev => !prev)}
                    className="inline-flex items-center gap-2 text-white/70
                               hover:text-white text-xs font-semibold
                               transition-colors"
                  >
                    {showAdvanced ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Hide Advanced Filters
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        More Filters
                      </>
                    )}
                    {activeCount > 0 && (
                      <span className="inline-flex items-center
                                       justify-center min-w-5 h-5 px-1.5
                                       rounded-full bg-[#029bba]
                                       text-white text-[10px] font-black">
                        {activeCount}
                      </span>
                    )}
                  </button>

                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={resetAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5
                                 text-xs font-semibold text-red-400
                                 hover:text-red-300 hover:bg-red-500/10
                                 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset All
                    </button>
                  )}
                </div>

                {/* ══════════════════════════════════════════════
                    ADVANCED FILTERS (collapsible)
                ══════════════════════════════════════════════ */}
                {showAdvanced && (
                  <div className="mt-5 pt-5 border-t border-white/10 space-y-3">

                    {/* Row A: Property Type + Possession */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Property Type (grouped: Residential/Plots/Commercial) */}
                      <FilterDropdown
                        icon={Building2}
                        placeholder="All Property Types (units)"
                        value={filters.type}
                        onChange={v => updateFilters({
                          type: v as PropertyType | '',
                        })}
                        groups={[
                          {
                            group: 'All',
                            options: [{ value: '', label: 'All Property Types' }],
                          } as FilterOptionGroup,
                          ...TYPE_GROUPS.map<FilterOptionGroup>(g => ({
                            group:   g.group,
                            options: g.types.map<FilterOption>(t => ({
                              value: t,
                              label: PROPERTY_TYPE_LABELS[t],
                            })),
                          })),
                        ]}
                      />

                      {/* Possession */}
                      <FilterDropdown
                        icon={CalendarCheck}
                        placeholder="Any Possession"
                        value={filters.possession}
                        onChange={v => updateFilters({
                          possession: v as PossessionStatus | '',
                        })}
                        options={[
                          { value: '', label: 'Any Possession' },
                          ...POSSESSION_OPTIONS.map(o => ({
                            value: o.value,
                            label: o.label,
                          })),
                        ]}
                      />
                    </div>

                    {/* Row B: Min/Max Area */}
                    <div className="grid grid-cols-2 gap-3">
                      <FilterDropdown
                        icon={Ruler}
                        placeholder="Min Area"
                        value={filters.minArea != null ? String(filters.minArea) : ''}
                        onChange={v => updateFilters({
                          minArea: v ? Number(v) : null,
                        })}
                        options={[
                          { value: '', label: 'Any' },
                          ...MARLA_STEPS.map(s => ({
                            value: String(s),
                            label: formatAreaMarla(s),
                          })),
                        ]}
                      />
                      <FilterDropdown
                        icon={Ruler}
                        placeholder="Max Area"
                        value={filters.maxArea != null ? String(filters.maxArea) : ''}
                        onChange={v => updateFilters({
                          maxArea: v ? Number(v) : null,
                        })}
                        options={[
                          { value: '', label: 'Any' },
                          ...MARLA_STEPS
                            .filter(s => !filters.minArea || s > filters.minArea)
                            .map(s => ({
                              value: String(s),
                              label: formatAreaMarla(s),
                            })),
                        ]}
                      />
                    </div>

                    {/* Row C: Precise Min/Max Budget */}
                    <div className="grid grid-cols-2 gap-3">
                      <FilterDropdown
                        icon={Banknote}
                        placeholder="Min Budget (precise)"
                        value={filters.minBudget != null ? String(filters.minBudget) : ''}
                        onChange={v => updateFilters({
                          minBudget: v ? Number(v) : null,
                        })}
                        options={[
                          { value: '', label: 'Any' },
                          ...PKR_BUDGET_STEPS.map(s => ({
                            value: String(s),
                            label: formatPKR(s),
                          })),
                        ]}
                      />
                      <FilterDropdown
                        icon={Banknote}
                        placeholder="Max Budget (precise)"
                        value={filters.maxBudget != null ? String(filters.maxBudget) : ''}
                        onChange={v => updateFilters({
                          maxBudget: v ? Number(v) : null,
                        })}
                        options={[
                          { value: '', label: 'Any' },
                          ...PKR_BUDGET_STEPS
                            .filter(s => !filters.minBudget || s > filters.minBudget)
                            .map(s => ({
                              value: String(s),
                              label: formatPKR(s),
                            })),
                        ]}
                      />
                    </div>

                    {/* Row D: Developer + Locality (debounced) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2
                                              -translate-y-1/2 w-4 h-4
                                              text-gray-400 z-10
                                              pointer-events-none" />
                        <input
                          type="text"
                          value={builderBuffer}
                          onChange={e => {
                            setBuilderBuffer(e.target.value);
                            debouncedUpdate({ builder: e.target.value });
                          }}
                          placeholder="Search by developer name..."
                          className="w-full h-12 pl-9 pr-4 bg-white
                                     border border-gray-200 rounded-xl
                                     text-gray-700 placeholder-gray-400
                                     text-sm font-medium
                                     focus:ring-2 focus:ring-[#029bba]
                                     focus:outline-none
                                     hover:border-[#029bba]/40
                                     transition-colors"
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2
                                           -translate-y-1/2 w-4 h-4
                                           text-gray-400 z-10
                                           pointer-events-none" />
                        <input
                          type="text"
                          value={localityBuffer}
                          onChange={e => {
                            setLocalityBuffer(e.target.value);
                            debouncedUpdate({ locality: e.target.value });
                          }}
                          placeholder="Search by locality or area..."
                          className="w-full h-12 pl-9 pr-4 bg-white
                                     border border-gray-200 rounded-xl
                                     text-gray-700 placeholder-gray-400
                                     text-sm font-medium
                                     focus:ring-2 focus:ring-[#029bba]
                                     focus:outline-none
                                     hover:border-[#029bba]/40
                                     transition-colors"
                        />
                      </div>
                    </div>

                    {/* Row E: NOC Verified toggle */}
                    <button
                      type="button"
                      onClick={() => updateFilters({ noc: !filters.noc })}
                      className={`w-full h-12 rounded-xl border text-sm
                                 font-semibold flex items-center
                                 justify-center gap-2 transition-all
                                 duration-200 ${
                        filters.noc
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-[#029bba]/40 hover:text-[#029bba]'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Show only NOC Verified projects
                      {filters.noc && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>

                  </div>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                STATS BAR
            ══════════════════════════════════════════════════ */}
            <div className="mt-10 flex flex-wrap items-center justify-center
                            gap-6 md:gap-10">
              {[
                { icon: Building2,   value: platformStats.totalProjects,   label: 'Verified Projects' },
                { icon: Users,       value: platformStats.totalDevelopers, label: 'Trusted Developers' },
                { icon: MapPin,      value: platformStats.totalCities,     label: 'Cities Covered' },
                { icon: ShieldCheck, value: platformStats.totalVerified,   label: 'Verified Listings' },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-white/10
                                  flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-[#4dd6f5]" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-black text-white">
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-white/50 uppercase
                                   tracking-wider font-semibold">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}