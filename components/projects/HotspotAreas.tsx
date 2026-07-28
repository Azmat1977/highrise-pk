/**
 * components/projects/HotspotAreas.tsx
 *
 * Section 7 — Hotspot Areas
 * Top locality-level neighbourhoods with verified projects.
 *
 * BUSINESS PURPOSE:
 *   After a user picks a city, they want the BEST areas within that city.
 *   Example: Islamabad selected → shows DHA Ph 2, Bahria Enclave, F-11, etc.
 *   One click narrows the project grid to that specific neighbourhood.
 *
 * DESIGN LANGUAGE:
 *   Mirrors BrowseByCategory.tsx card pattern for visual consistency.
 *   Text-only cards (no images — no area photos in DB yet).
 *   Color-coded verified % badge (emerald / teal / amber / gray).
 *   Left accent strip on hover/active.
 *
 * BEHAVIOUR:
 *   → If filters.city is set → shows hotspots ONLY in that city
 *   → If no city selected → shows top 8 hotspots across Pakistan
 *   → Click card → updates ?locality=[area] → scrolls to #project-grid
 *   → Empty state: friendly message + CTA (never dead end)
 *   → Active filter pill shows current locality with X to clear
 *
 * RULES ENFORCED:
 *   → Tailwind only (zero inline styles)
 *   → Lucide React icons only
 *   → No framer-motion
 *   → Locked typography standard for section header
 *   → Mobile-first at 375px
 *   → aria-pressed + focus rings for a11y
 */

import { useMemo } from 'react';
import {
  MapPin,
  Building2,
  BadgeCheck,
  ShieldCheck,
  ArrowRight,
  Check,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

import type { HotspotArea, FilterState } from '@/types/projects';

// ─── VERIFIED % TIER SYSTEM ───────────────────────────────────────────────────

type VerifiedTier = 'full' | 'high' | 'medium' | 'new';

interface VerifiedTierConfig {
  label:    string;
  bg:       string;
  text:     string;
  border:   string;
  icon:     React.ElementType;
  gradient: string;
}

const VERIFIED_TIER_CONFIG: Record<VerifiedTier, VerifiedTierConfig> = {
  full: {
    label:    'Fully Verified',
    bg:       'bg-emerald-50',
    text:     'text-emerald-700',
    border:   'border-emerald-200',
    icon:     BadgeCheck,
    gradient: 'from-emerald-500 to-emerald-600',
  },
  high: {
    label:    'Mostly Verified',
    bg:       'bg-[#029bba]/10',
    text:     'text-[#029bba]',
    border:   'border-[#029bba]/20',
    icon:     ShieldCheck,
    gradient: 'from-[#029bba] to-[#017a94]',
  },
  medium: {
    label:    'Being Verified',
    bg:       'bg-amber-50',
    text:     'text-amber-700',
    border:   'border-amber-200',
    icon:     TrendingUp,
    gradient: 'from-amber-500 to-orange-500',
  },
  new: {
    label:    'New Area',
    bg:       'bg-gray-50',
    text:     'text-gray-600',
    border:   'border-gray-200',
    icon:     Sparkles,
    gradient: 'from-gray-400 to-gray-500',
  },
};

function getVerifiedTier(pct: number): VerifiedTier {
  if (pct >= 100) return 'full';
  if (pct >= 70)  return 'high';
  if (pct >= 40)  return 'medium';
  return 'new';
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface HotspotAreasProps {
  filters:       FilterState;
  updateFilters: (patch: Partial<FilterState>) => void;
  hotspots:      HotspotArea[];
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({
  city,
  onClearCity,
}: {
  city:        string;
  onClearCity: () => void;
}): React.ReactElement {
  return (
    <div className="text-center py-16 px-4">
      <div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br
                   from-[#029bba]/10 to-[#004063]/10
                   flex items-center justify-center mx-auto mb-4"
      >
        <MapPin className="w-8 h-8 text-[#029bba]/40" />
      </div>

      <p className="text-gray-900 font-black text-lg mb-1">
        {city
          ? `No hotspots yet in ${city}`
          : 'Hotspots coming soon'}
      </p>

      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        {city
          ? `We're actively verifying projects in ${city}. Explore hotspots across Pakistan instead.`
          : 'Our team is mapping the most active neighbourhoods. Check back soon.'}
      </p>

      {city && (
        <button
          type="button"
          onClick={onClearCity}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-[#029bba] text-white text-sm font-bold
                     hover:bg-[#017a94] transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
        >
          Show All Pakistan Hotspots
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── HOTSPOT CARD ─────────────────────────────────────────────────────────────

interface HotspotCardProps {
  hotspot:    HotspotArea;
  isSelected: boolean;
  onClick:    () => void;
}

function HotspotCard({
  hotspot,
  isSelected,
  onClick,
}: HotspotCardProps): React.ReactElement {
  const tier    = getVerifiedTier(hotspot.verifiedPct);
  const cfg     = VERIFIED_TIER_CONFIG[tier];
  const TierIcon = cfg.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Filter projects by ${hotspot.area}, ${hotspot.city}`}
      className={`group relative p-5 rounded-2xl text-left
                  border-2 transition-all duration-200 outline-none
                  focus:ring-2 focus:ring-[#029bba]/30 focus:ring-offset-2
                  bg-white shadow-sm cursor-pointer ${
        isSelected
          ? 'border-[#029bba] shadow-lg shadow-[#029bba]/10 scale-[1.02]'
          : 'border-gray-100 hover:border-[#029bba]/30 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Soft tinted overlay */}
      <div
        className={`absolute inset-0 rounded-2xl pointer-events-none
                    bg-gradient-to-br ${cfg.gradient}
                    transition-opacity duration-200 ${
          isSelected
            ? 'opacity-[0.08]'
            : 'opacity-0 group-hover:opacity-[0.05]'
        }`}
      />

      {/* Left accent strip */}
      <div
        className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl
                    pointer-events-none bg-gradient-to-b ${cfg.gradient}
                    transition-opacity duration-200 ${
          isSelected
            ? 'opacity-100'
            : 'opacity-60 group-hover:opacity-100'
        }`}
      />

      <div className="relative z-10">
        {/* Selected badge — top right */}
        {isSelected && (
          <div
            className="absolute -top-2.5 -right-2.5
                       w-6 h-6 rounded-full bg-[#029bba]
                       border-2 border-white shadow-md
                       flex items-center justify-center
                       animate-in fade-in zoom-in duration-200"
            aria-hidden="true"
          >
            <Check className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Icon circle top-left */}
        <div
          className={`w-11 h-11 rounded-xl mb-4
                      flex items-center justify-center
                      transition-all duration-200 ${
            isSelected
              ? `bg-gradient-to-br ${cfg.gradient} shadow-md`
              : 'bg-white border border-gray-100 group-hover:border-[#029bba]/20'
          }`}
        >
          <MapPin
            className={`w-5 h-5 transition-colors ${
              isSelected
                ? 'text-white'
                : `${cfg.text} group-hover:text-[#029bba]`
            }`}
          />
        </div>

        {/* Area name */}
        <h4
          className={`text-base font-black leading-tight mb-0.5
                      transition-colors line-clamp-2 ${
            isSelected
              ? 'text-[#029bba]'
              : 'text-gray-900 group-hover:text-[#029bba]'
          }`}
        >
          {hotspot.area}
        </h4>

        {/* City name */}
        <p className="text-xs text-gray-500 font-semibold mb-3 truncate">
          {hotspot.city}
        </p>

        {/* Verified % badge */}
        <div className="mb-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                        text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            <TierIcon className="w-3 h-3" />
            {hotspot.verifiedPct}% {cfg.label}
          </span>
        </div>

        {/* Count + arrow footer */}
        <div
          className={`flex items-center justify-between pt-3 border-t
                      transition-colors ${
            isSelected ? 'border-[#029bba]/20' : 'border-gray-100'
          }`}
        >
          <span
            className={`text-xs font-bold flex items-center gap-1 ${
              isSelected ? 'text-[#029bba]' : 'text-gray-600'
            }`}
          >
            <Building2 className="w-3 h-3" />
            {hotspot.projectCount.toLocaleString()}{' '}
            Project{hotspot.projectCount !== 1 ? 's' : ''}
          </span>

          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center
                        transition-all ${
              isSelected
                ? 'bg-[#029bba] text-white'
                : 'bg-gray-100 text-gray-400 group-hover:bg-[#029bba]/10 group-hover:text-[#029bba]'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function HotspotAreas({
  filters,
  updateFilters,
  hotspots,
}: HotspotAreasProps): React.ReactElement {

  // Totals for section subtitle
  const totalProjects = useMemo(
    () => hotspots.reduce((sum, h) => sum + h.projectCount, 0),
    [hotspots],
  );

  const totalVerified = useMemo(
    () => hotspots.reduce((sum, h) => sum + h.verifiedCount, 0),
    [hotspots],
  );

  const activeLocality = filters.locality;

  // ── Handlers ────────────────────────────────────────────────
  const toggleLocality = (area: string) => {
    const isSelected = activeLocality === area;
    updateFilters({ locality: isSelected ? '' : area });

    if (!isSelected) {
      setTimeout(() => {
        document.getElementById('project-grid')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  };

  const clearLocality = () => {
    updateFilters({ locality: '' });
  };

  const clearCity = () => {
    updateFilters({ city: '', locality: '' });
  };

  // ─────────────────────────────────────────────────────────────

  return (
    <section
      aria-labelledby="hotspot-heading"
      className="relative bg-white py-16 md:py-20 border-b border-gray-100
                 overflow-hidden"
    >
      {/* Subtle background decoration — matches BrowseByCategory */}
      <div className="absolute top-0 left-0 right-0 h-px
                      bg-gradient-to-r from-transparent via-[#029bba]/20
                      to-transparent" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72
                        bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64
                        bg-[#029bba]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4">

        {/* ── SECTION HEADER (locked typography) ────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-10">

          {/* Pill with divider lines */}
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-gradient-to-r
                             from-transparent to-[#029bba]" />
            <span
              className="text-xs font-black text-[#029bba]
                         uppercase tracking-[0.2em]"
            >
              Popular Neighbourhoods
            </span>
            <span className="h-px w-8 bg-gradient-to-l
                             from-transparent to-[#029bba]" />
          </div>

          {/* H2 — locked: text-3xl md:text-4xl */}
          <h2
            id="hotspot-heading"
            className="text-3xl md:text-4xl font-black text-gray-900
                       mb-3 tracking-tight leading-tight"
          >
            Hotspot Areas{filters.city ? ' in ' : ' Across '}
            <span
              className="text-transparent bg-clip-text
                         bg-gradient-to-r from-[#029bba] to-[#017a94]"
            >
              {filters.city || 'Pakistan'}
            </span>
          </h2>

          {/* Subtitle — dynamic based on data */}
          <p className="text-base text-gray-500 leading-relaxed">
            {hotspots.length > 0 ? (
              <>
                The most active neighbourhoods with{' '}
                <span className="font-bold text-gray-700">
                  {totalProjects.toLocaleString()}+
                </span>{' '}
                verified projects.{' '}
                {totalVerified > 0 && (
                  <>
                    <span className="font-bold text-emerald-600">
                      {totalVerified.toLocaleString()}
                    </span>{' '}
                    shield-verified by our team.
                  </>
                )}
              </>
            ) : (
              'Click any area to filter projects instantly.'
            )}
          </p>
        </div>

        {/* ── ACTIVE LOCALITY FILTER PILL ───────────────────── */}
        {activeLocality && (
          <div className="flex flex-wrap items-center justify-center
                          gap-2 mb-8">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5
                         rounded-full bg-[#029bba]/10
                         border border-[#029bba]/20
                         text-[#029bba] text-xs font-bold"
            >
              <Check className="w-3 h-3" />
              Area: {activeLocality}
              <button
                type="button"
                onClick={clearLocality}
                className="ml-1 hover:text-red-500 transition-colors
                           focus:outline-none focus:ring-1 focus:ring-red-300
                           rounded"
                aria-label={`Clear ${activeLocality} filter`}
              >
                ✕
              </button>
            </span>
          </div>
        )}

        {/* ── EMPTY STATE ───────────────────────────────────── */}
        {hotspots.length === 0 && (
          <EmptyState city={filters.city} onClearCity={clearCity} />
        )}

        {/* ── HOTSPOT CARDS GRID ────────────────────────────── */}
        {hotspots.length > 0 && (
          <>
            <div
              className="grid grid-cols-1 sm:grid-cols-2
                         lg:grid-cols-4 gap-4"
              role="list"
              aria-label="Hotspot areas"
            >
              {hotspots.map(hotspot => (
                <div key={`${hotspot.city}-${hotspot.area}`} role="listitem">
                  <HotspotCard
                    hotspot={hotspot}
                    isSelected={activeLocality === hotspot.area}
                    onClick={() => toggleLocality(hotspot.area)}
                  />
                </div>
              ))}
            </div>

            {/* Footer CTA */}
            <div className="text-center mt-10">
              <p className="text-xs text-gray-400 mb-2">
                {filters.city
                  ? `Showing top ${hotspots.length} areas in ${filters.city}`
                  : `Showing top ${hotspots.length} hotspots across Pakistan`}
              </p>
              <a
                href="#main-project-grid"
                className="inline-flex items-center gap-2 text-sm font-bold
                           text-[#029bba] hover:text-[#017a94]
                           transition-colors duration-200
                           focus:outline-none focus:ring-2
                           focus:ring-[#029bba]/50 rounded"
              >
                View all verified projects
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default HotspotAreas;