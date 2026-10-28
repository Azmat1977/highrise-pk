/**
 * components/projects/DiscoveryTabs.tsx
 *
 * Section 5 — Discovery Tabs (Card Design)
 *
 * 6 Pakistani-market intent cards. Each is a proper card with:
 *   - White bg + border + shadow
 *   - Hover: slight tilt-left + teal left accent border + lift
 *   - Active: full teal border + teal accents
 *   - Perfectly aligned icon + labels + count
 */

import { useEffect, useRef } from 'react';
import {
  Grid3x3,
  KeyRound,
  CalendarClock,
  Sparkles,
  Award,
  ShieldCheck,
} from 'lucide-react';

import type {
  DiscoveryTabKey,
  TabCount,
  FilterState,
} from '@/types/projects';

import {
  DISCOVERY_TABS,
  tabToFilterPatch,
} from '@/types/projects';

// ─── ICON MAP ────────────────────────────────────────────

const TAB_ICONS: Record<DiscoveryTabKey, React.ElementType> = {
  all_projects:  Grid3x3,
  ready_to_move: KeyRound,
  installments:  CalendarClock,
  new_launch:    Sparkles,
  top_rated:     Award,
  govt_approved: ShieldCheck,
};

// Per-tab accent colors (subtle)
const TAB_ACCENT: Record<DiscoveryTabKey, {
  text:    string;
  bg:      string;
  gradient: string;
}> = {
  all_projects: {
    text: 'text-[#029bba]',
    bg:   'bg-[#029bba]/10',
    gradient: 'from-[#029bba] to-[#017a94]',
  },
  ready_to_move: {
    text: 'text-emerald-600',
    bg:   'bg-emerald-500/10',
    gradient: 'from-emerald-500 to-teal-600',
  },
  installments: {
    text: 'text-purple-600',
    bg:   'bg-purple-500/10',
    gradient: 'from-purple-500 to-violet-600',
  },
  new_launch: {
    text: 'text-amber-600',
    bg:   'bg-amber-500/10',
    gradient: 'from-amber-500 to-orange-500',
  },
  top_rated: {
    text: 'text-orange-600',
    bg:   'bg-orange-500/10',
    gradient: 'from-orange-500 to-red-500',
  },
  govt_approved: {
    text: 'text-[#004063]',
    bg:   'bg-[#004063]/10',
    gradient: 'from-[#004063] to-[#029bba]',
  },
};

// ─── PROPS ───────────────────────────────────────────────

interface DiscoveryTabsProps {
  filters:       FilterState;
  updateFilters: (patch: Partial<FilterState>) => void;
  tabCounts:     TabCount[];
}

// ─── COMPONENT ───────────────────────────────────────────

export function DiscoveryTabs({
  filters,
  updateFilters,
  tabCounts,
}: DiscoveryTabsProps) {

  const activeTab   = (filters.tab ?? 'all_projects') as DiscoveryTabKey;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef   = useRef<HTMLButtonElement>(null);
  const isMountedRef = useRef(false);

  // ── Horizontal scroll active tab into view (mobile only) ──
  // FIXED: Only fires AFTER user interaction, never on mount.
  // Uses manual scroll math instead of scrollIntoView to prevent
  // browser from ALSO scrolling the page vertically.
  //
  // Root cause of old bug: scrollIntoView with block:'nearest'
  // was scrolling the whole page vertically on mount, jumping
  // users to the middle of the page instead of hero section.
  useEffect(() => {
    // Skip first render (mount) — only scroll on user tab change
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    if (!activeRef.current || !scrollerRef.current) return;

    // Manual horizontal scroll — NEVER touches vertical scroll
    const scroller = scrollerRef.current;
    const tab      = activeRef.current;

    const scrollerRect = scroller.getBoundingClientRect();
    const tabRect      = tab.getBoundingClientRect();

    // Calculate target scroll position (center the active tab)
    const targetScrollLeft =
      scroller.scrollLeft
      + (tabRect.left - scrollerRect.left)
      - (scrollerRect.width / 2)
      + (tabRect.width / 2);

    scroller.scrollTo({
      left:     targetScrollLeft,
      behavior: 'smooth',
    });
  }, [activeTab]);

  const handleTabClick = (tabKey: DiscoveryTabKey) => {
    if (tabKey === activeTab) return;
    updateFilters(tabToFilterPatch(tabKey));

    setTimeout(() => {
      document.getElementById('project-grid')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const getCount = (key: DiscoveryTabKey): number =>
    tabCounts.find(t => t.key === key)?.count ?? 0;

  return (
    <section
      aria-label="Discovery tabs"
      className="relative bg-gradient-to-b from-gray-50 via-white
                 to-gray-50 py-12 md:py-14 overflow-hidden"
    >
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96
                        bg-[#029bba]/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4">

        {/* ── SECTION HEADER (matches page-wide typography standard) ── */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-gradient-to-r
                             from-transparent to-[#029bba]" />
            <span className="text-xs font-black text-[#029bba]
                             uppercase tracking-[0.2em]">
              Discover by Intent
            </span>
            <span className="h-px w-8 bg-gradient-to-l
                             from-transparent to-[#029bba]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900
                         mb-3 tracking-tight leading-tight">
            What are you{' '}
            <span className="text-transparent bg-clip-text
                             bg-gradient-to-r from-[#029bba] to-[#017a94]">
              looking for?
            </span>
          </h2>
          <p className="text-base text-gray-500 leading-relaxed">
            One click to filter by exactly what matters to you.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════
            TAB CARDS — Grid on desktop, scroll on mobile
        ══════════════════════════════════════════════════ */}
        <div
          ref={scrollerRef}
          role="tablist"
          className="flex md:grid md:grid-cols-3 lg:grid-cols-6
                     gap-3 md:gap-4
                     overflow-x-auto md:overflow-visible
                     scroll-smooth snap-x snap-mandatory
                     pb-2 md:pb-0 scrollbar-hide"
        >
          {DISCOVERY_TABS.map(tab => {
            const Icon     = TAB_ICONS[tab.key];
            const isActive = activeTab === tab.key;
            const count    = getCount(tab.key);
            const accent   = TAB_ACCENT[tab.key];

            return (
              <button
                key={tab.key}
                ref={isActive ? activeRef : null}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="project-grid"
                onClick={() => handleTabClick(tab.key)}
                title={tab.description}
                className={`group relative flex-shrink-0
                           w-[160px] md:w-auto snap-start
                           bg-white rounded-2xl border-2
                           p-4 md:p-5 text-center
                           transition-all duration-300 ease-out
                           outline-none overflow-hidden
                           focus:ring-2 focus:ring-[#029bba]/30
                           focus:ring-offset-2 ${
                  isActive
                    ? 'border-[#029bba] shadow-lg shadow-[#029bba]/10 scale-[1.02]'
                    : 'border-gray-100 shadow-sm hover:border-[#029bba]/40 hover:shadow-lg hover:-translate-y-1 hover:-rotate-[1.5deg]'
                }`}
              >
                {/* Left accent strip — only shows on hover/active */}
                <div className={`absolute left-0 top-4 bottom-4 w-1
                                rounded-r-full transition-all duration-300
                                bg-gradient-to-b ${accent.gradient} ${
                  isActive
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`} />

                {/* Soft tint on hover */}
                <div className={`absolute inset-0 rounded-2xl
                                pointer-events-none transition-opacity
                                duration-300 bg-gradient-to-br
                                ${accent.gradient} ${
                  isActive
                    ? 'opacity-[0.04]'
                    : 'opacity-0 group-hover:opacity-[0.04]'
                }`} />

                <div className="relative z-10 flex flex-col items-center">

                  {/* Icon circle */}
                  <div className={`w-11 h-11 rounded-xl mb-3
                                  flex items-center justify-center
                                  transition-all duration-300 ${
                    isActive
                      ? `bg-gradient-to-br ${accent.gradient} shadow-md`
                      : `${accent.bg} group-hover:scale-110`
                  }`}>
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive
                          ? 'text-white'
                          : accent.text
                      }`}
                      strokeWidth={2.25}
                    />
                  </div>

                  {/* English label */}
                  <p className={`text-sm font-black leading-tight
                                 transition-colors ${
                    isActive
                      ? 'text-gray-900'
                      : 'text-gray-800 group-hover:text-gray-900'
                  }`}>
                    {tab.label}
                  </p>

                  {/* Urdu subtitle */}
                  <p className={`text-[11px] font-semibold leading-tight
                                 mt-1 transition-colors ${
                    isActive ? accent.text : 'text-gray-400'
                  }`}>
                    {tab.urduLabel}
                  </p>

                  {/* Live count badge */}
                  {count > 0 ? (
                    <span className={`mt-3 inline-flex items-center
                                     justify-center min-w-[28px] h-5
                                     px-2 rounded-full text-[10px]
                                     font-black transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${accent.gradient} text-white shadow-sm`
                        : `${accent.bg} ${accent.text}`
                    }`}>
                      {count.toLocaleString()}
                    </span>
                  ) : (
                    <span className="mt-3 inline-flex items-center
                                     justify-center min-w-[28px] h-5
                                     px-2 rounded-full text-[10px]
                                     font-black bg-gray-100 text-gray-400">
                      —
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}