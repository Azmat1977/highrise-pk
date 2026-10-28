/**
 * components/projects/FeaturedShowcase.tsx
 *
 * Section 6 — Trending / Featured Showcase
 * Horizontal scroll carousel of 6–8 handpicked verified projects.
 *
 * Selection logic (done in SSR — this component is display-only):
 *   Tier 1: isFeatured === true  (paid/promoted)
 *   Tier 2: highriseScore >= 70  (best-rated, fills to 8)
 *   Tier 3: isVerified === true  (latest verified, fills remainder)
 *
 * Features:
 *   → Horizontal snap scroll carousel
 *   → Prev/Next arrow buttons (desktop only)
 *   → Dot indicators
 *   → Skip / Not Interested per card (session-only)
 *   → "Showing X of Y" live count
 *   → Empty state with CTA (never a dead end)
 *   → Section header per locked typography standard
 *   → Mobile-first: 1 card visible / 2 tablet / 3 desktop
 *   → Scroll shadow edges (left/right)
 *   → No framer-motion — Tailwind transitions only
 *   → Lucide React icons only
 */

'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  ArrowRight,
} from 'lucide-react';

import type { ProjectListing } from '@/types/projects';
import ProjectListingCard     from '@/components/projects/ProjectListingCard';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface FeaturedShowcaseProps {
  featuredProjects: ProjectListing[];
  /** Currently selected city (null = Pakistan-wide view) */
  selectedCity?:    string | null;
  /** Called when user clicks "Clear city" in empty state */
  onClearCity?:    () => void;
  /** Called when user shortlists — parent syncs to DB for logged-in users */
  onShortlist?: (id: string, next: boolean) => void;
}

// ─── EMPTY STATE (city-aware — enterprise) ───────────────────────────────────

function EmptyState({
  selectedCity,
  onClearCity,
}: {
  selectedCity?: string | null;
  onClearCity?:  () => void;
}): React.ReactElement {
  const hasCity = Boolean(selectedCity);

  return (
    <div className="text-center py-16 px-4">
      <div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br
                   from-[#029bba]/10 to-[#004063]/10
                   flex items-center justify-center mx-auto mb-4"
      >
        <Building2 className="w-8 h-8 text-[#029bba]/40" />
      </div>

      {hasCity ? (
        <>
          <p className="text-gray-900 font-black text-lg mb-1">
            No featured projects in {selectedCity} yet
          </p>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            We&apos;re actively verifying new projects in {selectedCity}.
            Explore featured projects across Pakistan or browse all
            {' '}{selectedCity} listings below.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {onClearCity && (
              <button
                type="button"
                onClick={onClearCity}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-[#029bba] text-white text-sm font-bold
                           hover:bg-[#017a94] transition-colors duration-200
                           focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
              >
                See Featured Across Pakistan
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <Link
              href="#project-grid"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                         border-2 border-[#029bba] text-[#029bba] text-sm font-bold
                         hover:bg-[#029bba]/5 transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
            >
              Browse {selectedCity} Projects
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-500 font-semibold mb-1">
            No featured projects right now
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Our team verifies new projects daily — check back soon.
          </p>
          <Link
            href="#project-grid"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-[#029bba] text-white text-sm font-bold
                       hover:bg-[#017a94] transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
          >
            Browse All Projects
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
    </div>
  );
}

// AllSkippedState removed — no skip mechanic in enterprise design

// ─── DOT INDICATORS ───────────────────────────────────────────────────────────

function DotIndicators({
  total,
  active,
  onDotClick,
}: {
  total:      number;
  active:     number;
  onDotClick: (i: number) => void;
}): React.ReactElement | null {
  if (total <= 1) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 mt-6"
      role="tablist"
      aria-label="Featured projects navigation"
    >
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={i === active}
          aria-label={`Go to project ${i + 1}`}
          onClick={() => onDotClick(i)}
          className={`rounded-full transition-all duration-300 focus:outline-none
                      focus:ring-2 focus:ring-[#029bba]/50
                      ${
                        i === active
                          ? 'w-6 h-2 bg-[#029bba]'
                          : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                      }`}
        />
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function FeaturedShowcase({
  featuredProjects,
  selectedCity = null,
  onClearCity,
  onShortlist,
}: FeaturedShowcaseProps): React.ReactElement {

  const [activeDot, setActiveDot] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = featuredProjects;
  const total   = featuredProjects.length;

  // ── Scroll tracking for dot sync ──────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 320;
    const gap       = 16; // gap-4 = 16px
    const index     = Math.round(el.scrollLeft / (cardWidth + gap));
    setActiveDot(Math.min(index, visible.length - 1));
  }, [visible.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ── Arrow navigation ───────────────────────────────────────────
  const scrollTo = useCallback((direction: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 320;
    const gap       = 16;
    const step      = cardWidth + gap;
    el.scrollBy({
      left:     direction === 'next' ? step : -step,
      behavior: 'smooth',
    });
  }, []);

  // ── Dot click navigation ───────────────────────────────────────
  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 320;
    const gap       = 16;
    el.scrollTo({
      left:     index * (cardWidth + gap),
      behavior: 'smooth',
    });
    setActiveDot(index);
  }, []);

  // No skip logic — users scroll past unwanted cards manually

  // ─────────────────────────────────────────────────────────────

  return (
    <section
      aria-labelledby="featured-heading"
      className="py-14 bg-white border-b border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-4">

        {/* ── Section Header (locked typography standard) ── */}
        <div className="text-center max-w-2xl mx-auto mb-10">

          {/* Pill with divider lines */}
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-gradient-to-r
                             from-transparent to-[#029bba]" />
            <span
              className="text-xs font-black text-[#029bba]
                         uppercase tracking-[0.2em]"
            >
              EDITOR&apos;S PICK
            </span>
            <span className="h-px w-8 bg-gradient-to-l
                             from-transparent to-[#029bba]" />
          </div>

          {/* H2 — city-aware dynamic accent */}
          <h2
            id="featured-heading"
            className="text-3xl md:text-4xl font-black text-gray-900
                       mb-3 tracking-tight leading-tight"
          >
            Handpicked Verified{' '}
            <span
              className="text-transparent bg-clip-text
                         bg-gradient-to-r from-[#029bba] to-[#017a94]"
            >
              {selectedCity ? `${selectedCity} Projects` : 'Projects'}
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-base text-gray-500 leading-relaxed">
            {selectedCity ? (
              <>
                Every {selectedCity} project shield-verified by our team —
                so you invest with certainty, not hope.
              </>
            ) : (
              <>
                Updated daily. Every project shield-verified by our team —
                so you invest with certainty, not hope.
              </>
            )}
          </p>
        </div>

        {/* ── City-aware empty state ── */}
        {total === 0 && (
          <EmptyState
            selectedCity={selectedCity}
            onClearCity={onClearCity}
          />
        )}

        {/* No skip mechanic — all projects always visible */}

        {/* ── Carousel ── */}
        {visible.length > 0 && (
          <>
            {/* Count + arrows row */}
            <div className="flex items-center justify-between mb-4 px-1">
              {/* Live count */}
              <p className="text-sm text-gray-500 font-semibold">
                Showing{' '}
                <span className="text-gray-900 font-black">
                  {total}
                </span>{' '}
                featured project{total !== 1 ? 's' : ''}
              </p>

              {/* Desktop prev/next arrows — only useful with 2+ projects */}
              {visible.length > 1 && (
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => scrollTo('prev')}
                    aria-label="Previous featured projects"
                    className="w-9 h-9 rounded-xl border border-gray-200
                               flex items-center justify-center
                               text-gray-500 hover:border-[#029bba]
                               hover:text-[#029bba] hover:bg-[#029bba]/5
                               transition-all duration-200
                               focus:outline-none focus:ring-2
                               focus:ring-[#029bba]/50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollTo('next')}
                    aria-label="Next featured projects"
                    className="w-9 h-9 rounded-xl border border-gray-200
                               flex items-center justify-center
                               text-gray-500 hover:border-[#029bba]
                               hover:text-[#029bba] hover:bg-[#029bba]/5
                               transition-all duration-200
                               focus:outline-none focus:ring-2
                               focus:ring-[#029bba]/50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Scroll container with edge shadows */}
            <div className="relative">

              {/* Edge shadows — only when carousel has overflow */}
              {visible.length > 1 && (
                <>
                  <div
                    className="absolute left-0 top-0 bottom-0 w-8 z-10
                               bg-gradient-to-r from-white to-transparent
                               pointer-events-none"
                    aria-hidden="true"
                  />

                  <div
                    className="absolute right-0 top-0 bottom-0 w-8 z-10
                               bg-gradient-to-l from-white to-transparent
                               pointer-events-none"
                    aria-hidden="true"
                  />
                </>
              )}

              {/* Scroll track */}
              <div
                ref={scrollRef}
                className={`flex gap-4 overflow-x-auto pb-4
                            scroll-smooth snap-x snap-mandatory
                            scrollbar-hide
                            [-webkit-overflow-scrolling:touch]
                            ${visible.length === 1 ? 'justify-center' : ''}`}
                role="list"
                aria-label="Featured projects carousel"
              >
                {visible.map(project => (
                  <div
                    key={project._id}
                    role="listitem"
                    className="snap-start flex-shrink-0"
                  >
                    <ProjectListingCard
                      project={project}
                      variant="featured"
                      onShortlist={onShortlist}
                    />
                  </div>
                ))}

                {/* Trailing spacer so last card isn't flush to edge */}
                <div className="w-4 flex-shrink-0" aria-hidden="true" />
              </div>
            </div>

            {/* Dot indicators */}
            <DotIndicators
              total={visible.length}
              active={activeDot}
              onDotClick={scrollToIndex}
            />

            {/* "View all verified projects" CTA
                Points to Section 10 (MainProjectGrid) — the full listing */}
            <div className="text-center mt-8">
              <Link
                href="#main-project-grid"
                className="inline-flex items-center gap-2 text-sm font-bold
                           text-[#029bba] hover:text-[#017a94]
                           transition-colors duration-200
                           focus:outline-none focus:ring-2
                           focus:ring-[#029bba]/50 rounded"
              >
                View all verified projects
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default FeaturedShowcase;