/**
 * components/projects/BrowseByCategory.tsx
 *
 * Section 3 — Browse by Project Type
 * Redesigned: balanced visual weight, premium cards, proper grid layout.
 */

import { useMemo } from 'react';
import {
  Building2,
  Building,
  Store,
  Layers,
  Home,
  Trees,
  Factory,
  MapPin,
  Check,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

import type {
  ProjectCategoryCount,
  ProjectNatureCount,
  ProjectCategory,
  ProjectNature,
  FilterState,
} from '@/types/projects';

import {
  PROJECT_CATEGORY_LABELS,
  PROJECT_NATURE_LABELS,
} from '@/types/projects';

// ─── CONFIGS ─────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ProjectCategory, {
  icon:        React.ElementType;
  description: string;
  gradient:    string;
  iconColor:   string;
}> = {
  high_rise: {
    icon:        Building2,
    description: 'Apartment towers & vertical living',
    gradient:    'from-blue-500 to-[#029bba]',
    iconColor:   'text-blue-500',
  },
  housing_society: {
    icon:        Home,
    description: 'Planned residential communities',
    gradient:    'from-emerald-500 to-teal-600',
    iconColor:   'text-emerald-500',
  },
  commercial_plaza: {
    icon:        Store,
    description: 'Shopping malls & business plazas',
    gradient:    'from-amber-500 to-orange-500',
    iconColor:   'text-amber-500',
  },
  mixed_use: {
    icon:        Layers,
    description: 'Retail + residential + office',
    gradient:    'from-purple-500 to-violet-600',
    iconColor:   'text-purple-500',
  },
  townhouse: {
    icon:        Home,
    description: 'Row houses & connected homes',
    gradient:    'from-pink-500 to-rose-500',
    iconColor:   'text-pink-500',
  },
  gated_community: {
    icon:        MapPin,
    description: 'Secure enclosed neighborhoods',
    gradient:    'from-[#029bba] to-cyan-600',
    iconColor:   'text-[#029bba]',
  },
  farmhouse_community: {
    icon:        Trees,
    description: 'Weekend homes & rural retreats',
    gradient:    'from-green-500 to-emerald-600',
    iconColor:   'text-green-500',
  },
  industrial_park: {
    icon:        Factory,
    description: 'Manufacturing & warehousing zones',
    gradient:    'from-gray-500 to-slate-600',
    iconColor:   'text-gray-500',
  },
};

const NATURE_CONFIG: Record<ProjectNature, {
  icon:        React.ElementType;
  description: string;
  gradient:    string;
  bgGradient:  string;
}> = {
  residential: {
    icon:        Home,
    description: 'Homes, apartments & housing societies',
    gradient:    'from-emerald-500 to-teal-600',
    bgGradient:  'from-emerald-50 to-teal-50',
  },
  commercial: {
    icon:        Building,
    description: 'Shops, offices & commercial plazas',
    gradient:    'from-amber-500 to-orange-500',
    bgGradient:  'from-amber-50 to-orange-50',
  },
  mixed: {
    icon:        Layers,
    description: 'Residential + commercial combined',
    gradient:    'from-purple-500 to-violet-600',
    bgGradient:  'from-purple-50 to-violet-50',
  },
};

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface BrowseByCategoryProps {
  filters:        FilterState;
  updateFilters:  (patch: Partial<FilterState>) => void;
  categoryCounts: ProjectCategoryCount[];
  natureCounts:   ProjectNatureCount[];
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function BrowseByCategory({
  filters,
  updateFilters,
  categoryCounts,
  natureCounts,
}: BrowseByCategoryProps) {

  const totalProjects = useMemo(
    () => categoryCounts.reduce((sum, c) => sum + c.count, 0),
    [categoryCounts]
  );

  const toggleCategory = (category: ProjectCategory) => {
    const isSelected = filters.category === category;
    updateFilters({ category: isSelected ? '' : category });
    if (!isSelected) {
      setTimeout(() => {
        document.getElementById('project-grid')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  };

  const toggleNature = (nature: ProjectNature) => {
    const isSelected = filters.nature === nature;
    updateFilters({ nature: isSelected ? '' : nature });
    if (!isSelected) {
      setTimeout(() => {
        document.getElementById('project-grid')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-gray-50 to-white
                        py-16 md:py-20 overflow-hidden">

      {/* Subtle background decoration */}
      <div className="absolute top-0 left-0 right-0 h-px
                      bg-gradient-to-r from-transparent via-[#029bba]/20
                      to-transparent" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72
                        bg-[#029bba]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-64 h-64
                        bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4">

        {/* ── SECTION HEADER ──────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-gradient-to-r
                             from-transparent to-[#029bba]" />
            <span className="text-xs font-black text-[#029bba]
                             uppercase tracking-[0.2em]">
              Browse by Project Type
            </span>
            <span className="h-px w-8 bg-gradient-to-l
                             from-transparent to-[#029bba]" />
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-gray-900
                         mb-3 tracking-tight leading-tight">
            Find Your Ideal{' '}
            <span className="text-transparent bg-clip-text
                             bg-gradient-to-r from-[#029bba] to-[#017a94]">
              Development
            </span>
          </h2>

          <p className="text-gray-500 text-base leading-relaxed">
            {totalProjects > 0 ? (
              <>
                Explore{' '}
                <span className="font-bold text-gray-700">
                  {totalProjects.toLocaleString()}+
                </span>
                {' '}verified projects across{' '}
                <span className="font-bold text-gray-700">
                  {categoryCounts.length}
                </span>
                {' '}development categories.
              </>
            ) : (
              'Browse verified real estate projects by development type across Pakistan.'
            )}
          </p>
        </div>

        {/* ── ACTIVE FILTER PILLS ─────────────────────────── */}
        {(filters.category || filters.nature) && (
          <div className="flex flex-wrap items-center justify-center
                          gap-2 mb-8">
            {filters.category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5
                               rounded-full bg-[#029bba]/10
                               border border-[#029bba]/20
                               text-[#029bba] text-xs font-bold">
                <Check className="w-3 h-3" />
                Type:{' '}
                {categoryCounts.find(c => c.category === filters.category)?.label
                  ?? PROJECT_CATEGORY_LABELS[filters.category as ProjectCategory]
                  ?? filters.category}
                <button
                  type="button"
                  onClick={() => updateFilters({ category: '' })}
                  className="ml-1 hover:text-red-500 transition-colors"
                  aria-label="Clear category filter"
                >
                  ✕
                </button>
              </span>
            )}
            {filters.nature && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5
                               rounded-full bg-[#029bba]/10
                               border border-[#029bba]/20
                               text-[#029bba] text-xs font-bold">
                <Check className="w-3 h-3" />
                Nature:{' '}
                {natureCounts.find(n => n.nature === filters.nature)?.label
                  ?? PROJECT_NATURE_LABELS[filters.nature as ProjectNature]
                  ?? filters.nature}
                <button
                  type="button"
                  onClick={() => updateFilters({ nature: '' })}
                  className="ml-1 hover:text-red-500 transition-colors"
                  aria-label="Clear nature filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            SECTION A — BY DEVELOPMENT TYPE
        ══════════════════════════════════════════════════ */}
        <div className="mb-14">

          {/* Sub-heading */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#029bba]/10
                            border border-[#029bba]/20
                            flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-[#029bba]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900
                             uppercase tracking-widest">
                By Development Type
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                What kind of development is it?
              </p>
            </div>
          </div>

          {/* Always show ALL 8 categories — merge live counts with static list.
              0-count categories render as muted "Coming Soon" — still shows
              the full scope of what Highrise offers. */}
          <div className="grid grid-cols-1 sm:grid-cols-2
                          lg:grid-cols-4 gap-4">
            {(Object.keys(CATEGORY_CONFIG) as ProjectCategory[]).map(category => {
              const cfg          = CATEGORY_CONFIG[category];
              const label        = PROJECT_CATEGORY_LABELS[category];
              const liveCount    = categoryCounts.find(c => c.category === category)?.count ?? 0;
              const isSelected   = filters.category === category;
              const isAvailable  = liveCount > 0;
              const Icon         = cfg.icon;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => isAvailable && toggleCategory(category)}
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  className={`group relative p-5 rounded-2xl text-left
                             border-2 transition-all duration-200 outline-none
                             focus:ring-2 focus:ring-[#029bba]/30
                             focus:ring-offset-2 bg-white shadow-sm ${
                    isSelected
                      ? 'border-[#029bba] shadow-lg shadow-[#029bba]/10 scale-[1.02]'
                      : isAvailable
                        ? 'border-gray-100 hover:border-[#029bba]/30 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                        : 'border-gray-100 cursor-not-allowed opacity-80'
                  }`}
                >
                  {/* Soft tinted overlay (adds elegance without heaviness) */}
                  <div
                    className={`absolute inset-0 rounded-2xl pointer-events-none
                                bg-gradient-to-br ${cfg.gradient}
                                transition-opacity duration-200 ${
                      isSelected
                        ? 'opacity-[0.10]'
                        : isAvailable
                          ? 'opacity-0 group-hover:opacity-[0.06]'
                          : 'opacity-[0.04]'
                    }`}
                  />

                  {/* Left accent strip */}
                  <div
                    className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl
                                pointer-events-none bg-gradient-to-b ${cfg.gradient}
                                transition-opacity duration-200 ${
                      isSelected
                        ? 'opacity-100'
                        : isAvailable
                          ? 'opacity-70 group-hover:opacity-100'
                          : 'opacity-25'
                    }`}
                  />

                  <div className="relative z-10">
                    {/* Selected badge */}
                    {isSelected && (
                      <div className="absolute -top-2.5 -right-2.5
                                      w-6 h-6 rounded-full bg-[#029bba]
                                      border-2 border-white shadow-md
                                      flex items-center justify-center
                                      animate-in fade-in zoom-in duration-200">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* "Soon" badge for unavailable */}
                    {!isAvailable && (
                      <span className="absolute top-3 right-3 px-2 py-0.5
                                       rounded-full bg-[#029bba]/10
                                       border border-[#029bba]/20
                                       text-[#004063] text-[9px]
                                       font-black uppercase tracking-wider">
                        Soon
                      </span>
                    )}

                    {/* Icon circle */}
                    <div
                      className={`w-12 h-12 rounded-xl mb-4
                                  flex items-center justify-center
                                  transition-all duration-200 ${
                        isSelected
                          ? `bg-gradient-to-br ${cfg.gradient} shadow-md`
                          : 'bg-white border border-gray-100 group-hover:border-[#029bba]/20'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 transition-colors ${
                          isSelected
                            ? 'text-white'
                            : isAvailable
                              ? `${cfg.iconColor} group-hover:text-[#029bba]`
                              : `${cfg.iconColor} opacity-50`
                        }`}
                      />
                    </div>

                    {/* Label */}
                    <p className={`text-sm font-black leading-tight mb-1
                                   transition-colors ${
                      isSelected
                        ? 'text-[#029bba]'
                        : isAvailable
                          ? 'text-gray-900 group-hover:text-[#029bba]'
                          : 'text-gray-600'
                    }`}>
                      {label}
                    </p>

                    {/* Description */}
                    <p className="text-[11px] text-gray-400 leading-snug
                                   mb-3 line-clamp-2 font-medium">
                      {cfg.description}
                    </p>

                    {/* Count + arrow */}
                    <div className={`flex items-center justify-between
                                    pt-3 border-t transition-colors ${
                      isSelected ? 'border-[#029bba]/20' : 'border-gray-100'
                    }`}>
                      <span className={`text-xs font-bold ${
                        isSelected
                          ? 'text-[#029bba]'
                          : isAvailable
                            ? 'text-gray-600'
                            : 'text-gray-400'
                      }`}>
                        {isAvailable
                          ? `${liveCount.toLocaleString()} Project${liveCount !== 1 ? 's' : ''}`
                          : 'Coming soon'}
                      </span>

                      {isAvailable && (
                        <div className={`w-6 h-6 rounded-lg flex items-center
                                        justify-center transition-all ${
                          isSelected
                            ? 'bg-[#029bba] text-white'
                            : 'bg-gray-100 text-gray-400 group-hover:bg-[#029bba]/10 group-hover:text-[#029bba]'
                        }`}>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION B — BY NATURE
        ══════════════════════════════════════════════════ */}
        <div>

          {/* Sub-heading */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#029bba]/10
                            border border-[#029bba]/20
                            flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-[#029bba]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900
                             uppercase tracking-widest">
                By Nature
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Residential, commercial, or both?
              </p>
            </div>
          </div>

          {/* Always render all 3 nature cards — muted state for 0-count */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(NATURE_CONFIG) as ProjectNature[]).map(nature => {
              const cfg         = NATURE_CONFIG[nature];
              const label       = PROJECT_NATURE_LABELS[nature];
              const liveCount   = natureCounts.find(n => n.nature === nature)?.count ?? 0;
              const isSelected  = filters.nature === nature;
              const isAvailable = liveCount > 0;
              const Icon        = cfg.icon;

              return (
                <button
                  key={nature}
                  type="button"
                  onClick={() => isAvailable && toggleNature(nature)}
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  className={`group relative p-5 rounded-2xl text-left
                             border-2 transition-all duration-200 outline-none
                             focus:ring-2 focus:ring-[#029bba]/30
                             focus:ring-offset-2 shadow-sm ${
                    isSelected
                      ? 'border-[#029bba] shadow-lg shadow-[#029bba]/10 scale-[1.01]'
                      : isAvailable
                        ? 'border-gray-100 hover:border-[#029bba]/30 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                        : 'border-gray-100 cursor-not-allowed opacity-80'
                  } bg-gradient-to-br ${
                    isSelected ? cfg.bgGradient : 'from-white to-gray-50/50'
                  }`}
                >
                  {/* Soft tinted overlay */}
                  <div
                    className={`absolute inset-0 rounded-2xl pointer-events-none
                                bg-gradient-to-br ${cfg.gradient}
                                transition-opacity duration-200 ${
                      isSelected
                        ? 'opacity-[0.10]'
                        : isAvailable
                          ? 'opacity-0 group-hover:opacity-[0.06]'
                          : 'opacity-[0.04]'
                    }`}
                  />
                  {/* Left accent strip */}
                  <div
                    className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl
                                pointer-events-none bg-gradient-to-b ${cfg.gradient}
                                transition-opacity duration-200 ${
                      isSelected
                        ? 'opacity-100'
                        : isAvailable
                          ? 'opacity-70 group-hover:opacity-100'
                          : 'opacity-25'
                    }`}
                  />
                  <div className="relative z-10">
                  {isSelected && (
                    <div className="absolute -top-2.5 -right-2.5
                                    w-6 h-6 rounded-full bg-[#029bba]
                                    border-2 border-white shadow-md
                                    flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {!isAvailable && (
                    <span className="absolute top-3 right-3 px-1.5 py-0.5
                                     rounded-md bg-gray-200 text-gray-500
                                     text-[9px] font-black uppercase
                                     tracking-wider">
                      Soon
                    </span>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex-shrink-0
                                      flex items-center justify-center
                                      transition-all bg-gradient-to-br ${
                        isSelected
                          ? cfg.gradient
                          : isAvailable
                            ? 'from-gray-100 to-gray-50 group-hover:from-[#029bba]/10 group-hover:to-[#029bba]/5'
                            : 'from-gray-100 to-gray-50'
                      }`}>
                        <Icon className={`w-5 h-5 transition-colors ${
                          isSelected
                            ? 'text-white'
                            : isAvailable
                              ? 'text-gray-500 group-hover:text-[#029bba]'
                              : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-black leading-tight
                                       transition-colors ${
                          isSelected
                            ? 'text-[#029bba]'
                            : isAvailable
                              ? 'text-gray-900 group-hover:text-[#029bba]'
                              : 'text-gray-500'
                        }`}>
                          {label}
                        </p>
                        <p className="text-[11px] text-gray-400
                                       font-medium mt-0.5 leading-snug">
                          {cfg.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {isAvailable ? (
                        <>
                          <div className={`flex items-center gap-1
                                           justify-end mb-0.5 ${
                            isSelected ? 'text-[#029bba]' : 'text-gray-900'
                          }`}>
                            <TrendingUp className="w-3 h-3 opacity-60" />
                            <p className="text-2xl font-black leading-none">
                              {liveCount.toLocaleString()}
                            </p>
                          </div>
                          <p className="text-[10px] text-gray-400
                                         font-bold uppercase tracking-wider">
                            Projects
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-gray-400
                                       font-bold uppercase tracking-wider mt-2">
                          Coming soon
                        </p>
                      )}
                    </div>
                  </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}