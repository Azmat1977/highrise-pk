/**
 * components/projects/BrowseByCity.tsx
 *
 * Section 8 — Browse by City
 *
 * BUSINESS PURPOSE:
 *   The macro entry point for city-based discovery. Users pick a city
 *   here first (Karachi / Lahore / Islamabad / etc.), which then narrows:
 *     → Section 7 (Hotspots) — shows areas WITHIN chosen city
 *     → Section 10 (Grid)    — shows projects in chosen city
 *
 * DESIGN:
 *   → 8 fixed major Pakistani cities (always visible)
 *   → Card design: background image + dark gradient overlay
 *   → Live project count + verified % badge per city
 *   → Selected: teal ring + check badge + slight scale
 *   → Empty cities: "Coming Soon" state (still visible)
 *   → Clicking selected city clears the filter
 *
 * BEHAVIOUR:
 *   → Click city → updates ?city=[City] → scrolls to top of Hotspots
 *   → Same-city click → clears filter → scrolls to top of page
 *   → Full page context change (unlike Section 7 which just narrows locality)
 *
 * RULES:
 *   → Locked typography for section header
 *   → Tailwind only (except image URLs on inline style — required for
 *     bg-image with dynamic URL. Next/Image is the alternative and used.)
 *   → Lucide icons only
 *   → Mobile-first at 375px
 *   → next/image for optimal loading
 *   → aria-pressed for accessibility
 */

import { useMemo } from 'react';
import Image from 'next/image';
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

import type { CityCount, FilterState } from '@/types/projects';

// ─── CITY CONFIG ──────────────────────────────────────────────────────────────
// Fixed list of 8 major Pakistani cities always shown in Section 8.
// Order matters — this is the DEFAULT display order when no data available.
// Once real counts arrive, empty cities move to end automatically.
//
// Images: high-quality Unsplash URLs (free, no upload workflow).
// Each URL includes ?w=800&q=80 for optimal size.

interface CityConfig {
  name:     string;      // Must match DB city name exactly
  province: string;      // "Punjab" | "Sindh" | "KPK" | "Balochistan" | "ICT"
  image:    string;      // Skyline / landmark photo URL
  tagline:  string;      // Short descriptor
}

const CITY_CONFIG: readonly CityConfig[] = [
  {
    name:     'Karachi',
    province: 'Sindh',
    // Locally hosted image — public/images/cities/karachi.webp
    image:    '/images/cities/karachi.webp',
    tagline:  'Business Capital',
  },
  {
    name:     'Lahore',
    province: 'Punjab',
    image:    '/images/cities/lahore.webp',
    tagline:  'Cultural Hub',
  },
  {
    name:     'Islamabad',
    province: 'ICT',
    image:    '/images/cities/islamabad.webp',
    tagline:  'Federal Capital',
  },
  {
    name:     'Rawalpindi',
    province: 'Punjab',
    image:    '/images/cities/rawalpindi.webp',
    tagline:  'Twin City',
  },
  {
    name:     'Faisalabad',
    province: 'Punjab',
    image:    '/images/cities/faisalabad.webp',
    tagline:  'Textile Hub',
  },
  {
    name:     'Multan',
    province: 'Punjab',
    image:    '/images/cities/multan.webp',
    tagline:  'City of Saints',
  },
  {
    name:     'Peshawar',
    province: 'KPK',
    image:    '/images/cities/peshawar.webp',
    tagline:  'KPK Gateway',
  },
  {
    name:     'Gujranwala',
    province: 'Punjab',
    image:    '/images/cities/gujranwala.webp',
    tagline:  'Industrial City',
  },
] as const;

// ─── VERIFIED % TIER ──────────────────────────────────────────────────────────

interface VerifiedTierConfig {
  label: string;
  bg:    string;
  text:  string;
  icon:  React.ElementType;
}

function getVerifiedTier(pct: number, hasProjects: boolean): VerifiedTierConfig {
  if (!hasProjects) {
    return {
      label: 'Coming Soon',
      bg:    'bg-gray-500/80',
      text:  'text-white',
      icon:  Sparkles,
    };
  }
  if (pct >= 100) {
    return {
      label: `${pct}% Verified`,
      bg:    'bg-emerald-500/90',
      text:  'text-white',
      icon:  BadgeCheck,
    };
  }
  if (pct >= 70) {
    return {
      label: `${pct}% Verified`,
      bg:    'bg-[#029bba]/90',
      text:  'text-white',
      icon:  ShieldCheck,
    };
  }
  if (pct >= 40) {
    return {
      label: `${pct}% Verified`,
      bg:    'bg-amber-500/90',
      text:  'text-white',
      icon:  TrendingUp,
    };
  }
  return {
    label: `${pct}% Verified`,
    bg:    'bg-gray-500/80',
    text:  'text-white',
    icon:  Sparkles,
  };
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface BrowseByCityProps {
  filters:       FilterState;
  updateFilters: (patch: Partial<FilterState>) => void;
  cityCounts:    CityCount[];
}

// ─── CITY CARD ────────────────────────────────────────────────────────────────

interface CityCardProps {
  config:        CityConfig;
  cityCount:     CityCount | null;
  isSelected:    boolean;
  onClick:       () => void;
}

function CityCard({
  config,
  cityCount,
  isSelected,
  onClick,
}: CityCardProps): React.ReactElement {
  const count       = cityCount?.count ?? 0;
  const verifiedPct = cityCount?.verifiedPct ?? 0;
  const hasProjects = count > 0;
  const tier        = getVerifiedTier(verifiedPct, hasProjects);
  const TierIcon    = tier.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Filter projects by ${config.name}, ${config.province}`}
      className={`group relative w-full aspect-[4/5] rounded-2xl
                  overflow-hidden shadow-sm cursor-pointer
                  border-2 transition-all duration-300 outline-none
                  focus:ring-2 focus:ring-[#029bba]/40 focus:ring-offset-2 ${
        isSelected
          ? 'border-[#029bba] shadow-xl shadow-[#029bba]/20 scale-[1.02]'
          : 'border-transparent hover:border-[#029bba]/30 hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      {/* ── Background image ─────────────────────────────── */}
      <Image
        src={config.image}
        alt={`${config.name} — ${config.tagline}, ${config.province}`}
        fill
        sizes="(max-width: 640px) 100vw,
               (max-width: 1024px) 50vw,
               25vw"
        className="object-cover transition-transform duration-500
                   group-hover:scale-110"
        priority={false}
      />

      {/* ── Gradient overlay for text readability ────────── */}
      <div
        className="absolute inset-0 bg-gradient-to-t
                   from-black/85 via-black/40 to-black/20"
        aria-hidden="true"
      />

      {/* ── Additional teal tint on hover/active ─────────── */}
      <div
        className={`absolute inset-0 bg-gradient-to-t
                    from-[#029bba]/40 to-transparent
                    transition-opacity duration-300 ${
          isSelected
            ? 'opacity-60'
            : 'opacity-0 group-hover:opacity-40'
        }`}
        aria-hidden="true"
      />

      {/* ── Selected badge — top right ───────────────────── */}
      {isSelected && (
        <div
          className="absolute top-3 right-3 z-10
                     w-7 h-7 rounded-full bg-[#029bba]
                     border-2 border-white shadow-lg
                     flex items-center justify-center
                     animate-in fade-in zoom-in duration-200"
          aria-hidden="true"
        >
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* ── Verified % badge — top left ──────────────────── */}
      <div className="absolute top-3 left-3 z-10">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full
                      text-[10px] font-black backdrop-blur-sm shadow-lg
                      ${tier.bg} ${tier.text}`}
        >
          <TierIcon className="w-3 h-3" />
          {tier.label}
        </span>
      </div>

      {/* ── Content bottom — city name + count ───────────── */}
      <div className="absolute inset-x-0 bottom-0 p-4 z-10">

        {/* Province label */}
        <p className="text-[10px] font-bold text-white/70
                      uppercase tracking-widest mb-1">
          {config.province}
        </p>

        {/* City name — big + bold */}
        <h3 className="text-2xl md:text-3xl font-black text-white
                       leading-tight tracking-tight mb-1
                       drop-shadow-lg">
          {config.name}
        </h3>

        {/* Tagline */}
        <p className="text-xs text-white/80 font-semibold mb-3
                      drop-shadow-md line-clamp-1">
          {config.tagline}
        </p>

        {/* Count + arrow row — HIGHLIGHTED for maximum visibility */}
        <div className="flex items-center justify-between pt-3
                        border-t border-white/25">

          {hasProjects ? (
            <div className="flex items-center gap-2">
              {/* Icon in tinted box for prominence */}
              <div className="w-8 h-8 rounded-lg bg-white/25 backdrop-blur-sm
                              border border-white/30 flex items-center
                              justify-center shadow-md">
                <Building2 className="w-4 h-4 text-white" />
              </div>

              {/* Count — MUCH bigger + bolder for emphasis */}
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black text-white
                                 drop-shadow-lg tracking-tight">
                  {count.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-white/80
                                 uppercase tracking-widest mt-0.5">
                  {count === 1 ? 'Project' : 'Projects'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm
                              border border-white/20 flex items-center
                              justify-center">
                <Sparkles className="w-4 h-4 text-white/70" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-black text-white/90
                                 drop-shadow-md">
                  Soon
                </span>
                <span className="text-[9px] font-bold text-white/70
                                 uppercase tracking-widest mt-0.5">
                  Coming
                </span>
              </div>
            </div>
          )}

          {hasProjects && (
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center
                          transition-all shadow-lg ${
                isSelected
                  ? 'bg-white text-[#029bba] scale-110'
                  : 'bg-white/25 backdrop-blur-sm border border-white/30 text-white group-hover:bg-white group-hover:text-[#029bba] group-hover:scale-110'
              }`}
            >
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function BrowseByCity({
  filters,
  updateFilters,
  cityCounts,
}: BrowseByCityProps): React.ReactElement {

  // Merge fixed CITY_CONFIG with live cityCounts data
  // For each configured city, find matching live count (case-insensitive)
  const cityCards = useMemo(() => {
    return CITY_CONFIG.map(config => {
      const liveMatch = cityCounts.find(
        c => c.city.toLowerCase() === config.name.toLowerCase(),
      );
      return {
        config,
        cityCount: liveMatch ?? null,
      };
    });
  }, [cityCounts]);

  // Total projects across all 8 shown cities (for subtitle)
  const totalProjects = useMemo(
    () => cityCards.reduce(
      (sum, c) => sum + (c.cityCount?.count ?? 0),
      0,
    ),
    [cityCards],
  );

  const totalVerified = useMemo(
    () => cityCards.reduce(
      (sum, c) => sum + (c.cityCount?.verifiedCount ?? 0),
      0,
    ),
    [cityCards],
  );

  const citiesWithProjects = cityCards.filter(
    c => (c.cityCount?.count ?? 0) > 0,
  ).length;

  // ── Click handler ──────────────────────────────────────────
  // Enterprise UX: BOTH select and clear scroll to TOP of page.
  // Why: City selection is a MAJOR context change. User must see
  // the hero update to confirm "yes, I'm now filtered by Islamabad."
  // Matches Zameen / MagicBricks / Zillow behaviour.
  // Neighbourhood selection (Section 7) is different — that's a
  // minor narrowing and scrolls to #project-grid (result-focused).
  const toggleCity = (cityName: string) => {
    const isSelected = filters.city === cityName;

    if (isSelected) {
      // Clear city → also clear locality (locality is city-scoped)
      updateFilters({ city: '', locality: '' });
    } else {
      // Set new city → clear locality (previous city's locality invalid)
      updateFilters({ city: cityName, locality: '' });
    }

    // Scroll to top of page — user sees hero context change
    // (either "New Projects in Islamabad" or default "Explore Verified Projects")
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  };

  // ─────────────────────────────────────────────────────────────

  return (
    <section
      aria-labelledby="browse-city-heading"
      className="relative bg-gradient-to-b from-white to-gray-50
                 py-16 md:py-20 border-b border-gray-100
                 overflow-hidden"
    >
      {/* Subtle background decoration */}
      <div className="absolute top-0 left-0 right-0 h-px
                      bg-gradient-to-r from-transparent via-[#029bba]/20
                      to-transparent" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96
                        bg-[#029bba]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80
                        bg-emerald-500/5 rounded-full blur-3xl" />
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
              Explore Pakistan
            </span>
            <span className="h-px w-8 bg-gradient-to-l
                             from-transparent to-[#029bba]" />
          </div>

          {/* H2 — locked: text-3xl md:text-4xl */}
          <h2
            id="browse-city-heading"
            className="text-3xl md:text-4xl font-black text-gray-900
                       mb-3 tracking-tight leading-tight"
          >
            Browse Projects by{' '}
            <span
              className="text-transparent bg-clip-text
                         bg-gradient-to-r from-[#029bba] to-[#017a94]"
            >
              City
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-base text-gray-500 leading-relaxed">
            {totalProjects > 0 ? (
              <>
                Verified projects across{' '}
                <span className="font-bold text-gray-700">
                  {citiesWithProjects}
                </span>{' '}
                Pakistani cities.{' '}
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
              'Pick your city to discover verified projects across Pakistan.'
            )}
          </p>
        </div>

        {/* ── ACTIVE CITY PILL ──────────────────────────────── */}
        {filters.city && (
          <div className="flex flex-wrap items-center justify-center
                          gap-2 mb-8">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5
                         rounded-full bg-[#029bba]/10
                         border border-[#029bba]/20
                         text-[#029bba] text-xs font-bold"
            >
              <MapPin className="w-3 h-3" />
              City: {filters.city}
              <button
                type="button"
                onClick={() => updateFilters({ city: '', locality: '' })}
                className="ml-1 hover:text-red-500 transition-colors
                           focus:outline-none focus:ring-1 focus:ring-red-300
                           rounded"
                aria-label={`Clear ${filters.city} filter`}
              >
                ✕
              </button>
            </span>
          </div>
        )}

        {/* ── CITY CARDS GRID ───────────────────────────────── */}
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          role="list"
          aria-label="Browse projects by city"
        >
          {cityCards.map(({ config, cityCount }) => (
            <div key={config.name} role="listitem">
              <CityCard
                config={config}
                cityCount={cityCount}
                isSelected={
                  filters.city.toLowerCase() === config.name.toLowerCase()
                }
                onClick={() => toggleCity(config.name)}
              />
            </div>
          ))}
        </div>

        {/* ── Footer note ─────────────────────────────────── */}
        <div className="text-center mt-10">
          <p className="text-xs text-gray-400 mb-2">
            Showing 8 major Pakistani cities
            {totalProjects > 0 && (
              <>
                {' '}·{' '}
                <span className="font-bold text-gray-600">
                  {totalProjects.toLocaleString()}
                </span>{' '}
                total projects
              </>
            )}
          </p>
          {filters.city && (
            <a
              href="#project-grid"
              className="inline-flex items-center gap-2 text-sm font-bold
                         text-[#029bba] hover:text-[#017a94]
                         transition-colors duration-200
                         focus:outline-none focus:ring-2
                         focus:ring-[#029bba]/50 rounded"
            >
              View {filters.city} projects
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export default BrowseByCity;