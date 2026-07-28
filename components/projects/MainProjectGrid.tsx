/**
 * components/projects/MainProjectGrid.tsx
 *
 * Section 10 — Main Project Grid (Enterprise Build)
 *
 * BUSINESS PURPOSE:
 *   The MAIN event. Where users see actual project listings.
 *   Answers the ultimate question: "Show me projects that match."
 *
 * FEATURES:
 *   ✅ Grid of 12 project cards initially (SSR-rendered)
 *   ✅ "Load More" button (up to 3 clicks = 48 projects)
 *   ✅ After 3 clicks → switches to numbered pagination
 *   ✅ Sort dropdown (Relevance / Price ↑↓ / Possession / Newest)
 *   ✅ Grid / List view toggle
 *   ✅ "Showing X of Y" counter
 *   ✅ Empty state with helpful CTAs
 *   ✅ Skeleton loaders during Load More
 *   ✅ URL-synced pagination (?page=2 bookmarkable)
 *   ✅ Reuses ProjectListingCard 'grid' variant
 *
 * ENTERPRISE PATTERNS (Zameen/MagicBricks standard):
 *   - Hybrid Load More → Pagination
 *   - SEO-friendly URLs (each page indexable)
 *   - Preserved filter context
 *   - Progressive disclosure
 *
 * RULES ENFORCED:
 *   → Tailwind only (no inline styles)
 *   → Lucide icons only
 *   → Locked typography for section header
 *   → Mobile-first at 375px
 *   → Full accessibility (aria labels, focus rings)
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Grid3x3,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUpToLine,
  Building2,
  Loader2,
  Filter,
  X,
  RotateCcw,
  MapPin,
} from 'lucide-react';

import type {
  FilterState,
  ProjectListing,
  ProjectListResponse,
  SortOption,
  GridViewMode,
} from '@/types/projects';

import {
  MAX_LOAD_MORE_CLICKS,
  PROJECTS_PER_PAGE,
  SORT_OPTIONS,
  buildQueryString,
} from '@/types/projects';

import ProjectListingCard from '@/components/projects/ProjectListingCard';

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface MainProjectGridProps {
  filters:         FilterState;
  updateFilters:   (patch: Partial<FilterState>) => void;
  initialProjects: ProjectListing[];
  totalCount:      number;
}

// ─── SKELETON CARD ────────────────────────────────────────────────────────────

function SkeletonCard(): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm
                    overflow-hidden animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-[16/10] bg-gray-200" />

      {/* Content placeholder */}
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-2 bg-gray-100 rounded w-full mt-3" />
        <div className="h-5 bg-gray-200 rounded w-1/3 mt-3" />
        <div className="flex gap-2 pt-3 border-t border-gray-50">
          <div className="flex-1 h-8 bg-gray-100 rounded-xl" />
          <div className="flex-1 h-8 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({
  filters,
  updateFilters,
}: {
  filters:       FilterState;
  updateFilters: (patch: Partial<FilterState>) => void;
}): React.ReactElement {
  const hasCity = Boolean(filters.city);

  // Detect what filters are active for helpful messaging
  const activeFilterLabels: string[] = [];
  if (filters.city)       activeFilterLabels.push(filters.city);
  if (filters.category)   activeFilterLabels.push(filters.category.replace(/_/g, ' '));
  if (filters.nature)     activeFilterLabels.push(filters.nature);
  if (filters.locality)   activeFilterLabels.push(filters.locality);
  if (filters.possession) activeFilterLabels.push(filters.possession.replace(/_/g, ' '));
  if (filters.noc)        activeFilterLabels.push('NOC Approved');
  if (filters.installments) activeFilterLabels.push('On Installments');

  const clearAll = () => {
    updateFilters({
      city:         '',
      category:     '',
      nature:       '',
      type:         '',
      minBudget:    null,
      maxBudget:    null,
      minArea:      null,
      maxArea:      null,
      possession:   '',
      noc:          false,
      installments: false,
      locality:     '',
      builder:      '',
      tab:          'all_projects',
    });
  };

  const clearCity = () => {
    updateFilters({ city: '', locality: '' });
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200
                    p-8 md:p-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br
                      from-[#029bba]/10 to-[#004063]/10
                      flex items-center justify-center mx-auto mb-6">
        <Building2 className="w-10 h-10 text-[#029bba]/40" />
      </div>

      <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2">
        {hasCity
          ? `No projects found in ${filters.city}`
          : 'No projects match your filters'}
      </h3>

      <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">
        {hasCity
          ? `We're actively verifying new projects in ${filters.city}. Try adjusting your filters or explore all Pakistan projects.`
          : 'Try adjusting your filters — remove some, expand your budget, or look in nearby cities.'}
      </p>

      {/* Active filter chips shown for context */}
      {activeFilterLabels.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Active filters:
          </span>
          {activeFilterLabels.map((label, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                         bg-gray-100 text-gray-700 text-xs font-semibold capitalize"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {hasCity && (
          <button
            type="button"
            onClick={clearCity}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-[#029bba] text-white text-sm font-bold
                       hover:bg-[#017a94] transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
          >
            <MapPin className="w-4 h-4" />
            Browse All Pakistan Projects
          </button>
        )}

        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                     border-2 border-gray-200 text-gray-700 text-sm font-bold
                     hover:border-[#029bba] hover:text-[#029bba]
                     transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
        >
          <RotateCcw className="w-4 h-4" />
          Clear All Filters
        </button>
      </div>
    </div>
  );
}

// ─── SORT DROPDOWN ────────────────────────────────────────────────────────────
// Enterprise pattern: uses onPointerDown listener with delayed activation
// to prevent race condition. The button's pointerdown is the SAME event that
// opens the dropdown, so listener must not activate on the same event tick.

function SortDropdown({
  value,
  onChange,
}: {
  value:    SortOption;
  onChange: (sort: SortOption) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef    = React.useRef<HTMLDivElement>(null);
  const activeLabel     = SORT_OPTIONS.find(o => o.value === value)?.label ?? 'Sort';

  // ── Close on outside click (delayed to prevent race condition) ──
  React.useEffect(() => {
    if (!open) return;

    // CRITICAL: Delay listener attachment by one animation frame.
    // Otherwise the pointerdown that OPENED the dropdown will
    // also trigger the outside-click handler in the same tick.
    let cleanupFn: (() => void) | undefined;

    const rafId = requestAnimationFrame(() => {
      const handlePointerDown = (e: PointerEvent) => {
        const target = e.target as Node;
        if (containerRef.current && !containerRef.current.contains(target)) {
          setOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };

      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleEscape);

      cleanupFn = () => {
        document.removeEventListener('pointerdown', handlePointerDown);
        document.removeEventListener('keydown', handleEscape);
      };
    });

    return () => {
      cancelAnimationFrame(rafId);
      cleanupFn?.();
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                   bg-white border-2 border-gray-200
                   text-sm font-semibold text-gray-700
                   hover:border-[#029bba]/40 hover:text-[#029bba]
                   transition-colors duration-200
                   focus:outline-none focus:ring-2 focus:ring-[#029bba]/30
                   min-w-[200px] justify-between"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Filter className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{activeLabel}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200
                     ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-2 z-[60] min-w-[240px]
                     bg-white rounded-xl border-2 border-gray-100
                     shadow-2xl p-1.5 animate-slide-down"
        >
          {SORT_OPTIONS.map(opt => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg
                           text-sm font-semibold transition-colors
                           flex items-center justify-between gap-2 ${
                  opt.value === value
                    ? 'bg-[#029bba]/10 text-[#029bba]'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{opt.label}</span>
                {opt.value === value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#029bba]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── VIEW MODE TOGGLE ─────────────────────────────────────────────────────────

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode:     GridViewMode;
  onChange: (mode: GridViewMode) => void;
}): React.ReactElement {
  return (
    <div
      className="inline-flex bg-white border-2 border-gray-200 rounded-xl p-1"
      role="tablist"
      aria-label="View mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'grid'}
        onClick={() => onChange('grid')}
        title="Grid view"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   text-xs font-bold transition-all duration-200 ${
          mode === 'grid'
            ? 'bg-[#029bba] text-white shadow-sm'
            : 'text-gray-500 hover:text-[#029bba] hover:bg-gray-50'
        }`}
      >
        <Grid3x3 className="w-4 h-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'list'}
        onClick={() => onChange('list')}
        title="List view"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   text-xs font-bold transition-all duration-200 ${
          mode === 'list'
            ? 'bg-[#029bba] text-white shadow-sm'
            : 'text-gray-500 hover:text-[#029bba] hover:bg-gray-50'
        }`}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage:  number;
  totalPages:   number;
  onPageChange: (page: number) => void;
}): React.ReactElement | null {
  if (totalPages <= 1) return null;

  // Show max 7 page numbers with smart truncation
  const getPageNumbers = (): (number | 'gap')[] => {
    const pages: (number | 'gap')[] = [];

    if (totalPages <= 7) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Always show first page
    pages.push(1);

    // Add gap before current if needed
    if (currentPage > 4) pages.push('gap');

    // Show current and neighbors
    const start = Math.max(2, currentPage - 1);
    const end   = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    // Add gap after current if needed
    if (currentPage < totalPages - 3) pages.push('gap');

    // Always show last page
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-8"
      aria-label="Pagination"
    >
      {/* Previous button */}
      <button
        type="button"
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl
                   text-sm font-bold border-2 border-gray-200
                   text-gray-600 hover:border-[#029bba] hover:text-[#029bba]
                   transition-colors duration-200
                   disabled:opacity-40 disabled:cursor-not-allowed
                   disabled:hover:border-gray-200 disabled:hover:text-gray-600
                   focus:outline-none focus:ring-2 focus:ring-[#029bba]/30"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page numbers */}
      {pageNumbers.map((page, i) => {
        if (page === 'gap') {
          return (
            <span
              key={`gap-${i}`}
              className="px-2 text-gray-400"
              aria-hidden="true"
            >
              …
            </span>
          );
        }

        const isActive = page === currentPage;

        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Page ${page}`}
            className={`min-w-[40px] h-10 rounded-xl text-sm font-bold
                       transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 ${
              isActive
                ? 'bg-[#029bba] text-white shadow-md scale-105'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#029bba] hover:text-[#029bba]'
            }`}
          >
            {page}
          </button>
        );
      })}

      {/* Next button */}
      <button
        type="button"
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl
                   text-sm font-bold border-2 border-gray-200
                   text-gray-600 hover:border-[#029bba] hover:text-[#029bba]
                   transition-colors duration-200
                   disabled:opacity-40 disabled:cursor-not-allowed
                   disabled:hover:border-gray-200 disabled:hover:text-gray-600
                   focus:outline-none focus:ring-2 focus:ring-[#029bba]/30"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function MainProjectGrid({
  filters,
  updateFilters,
  initialProjects,
  totalCount,
}: MainProjectGridProps): React.ReactElement {

  const router = useRouter();

  // ── State ──────────────────────────────────────────────────
  const [loadedProjects, setLoadedProjects] = useState<ProjectListing[]>(initialProjects);
  const [loadMoreCount, setLoadMoreCount]   = useState(0);
  const [loading, setLoading]                = useState(false);
  const [error, setError]                    = useState<string | null>(null);
  const [viewMode, setViewMode]              = useState<GridViewMode>('grid');

  // ── Derived state ──────────────────────────────────────────
  const currentPage    = filters.page || 1;
  const totalPages     = Math.ceil(totalCount / PROJECTS_PER_PAGE);
  const showingCount   = loadedProjects.length;
  const rangeStart     = totalCount > 0 ? (currentPage - 1) * PROJECTS_PER_PAGE + 1 : 0;
  const rangeEnd       = rangeStart + showingCount - 1;
  const remainingCount = totalCount - (rangeStart - 1 + showingCount);

  // Show pagination after 3 Load More clicks OR if starting on page 2+
  const showPagination = loadMoreCount >= MAX_LOAD_MORE_CLICKS
                          || currentPage > 1
                          || (totalPages > 1 && remainingCount === 0);

  // Show Load More if there are more results AND haven't hit max clicks
  const showLoadMore = !showPagination
                        && remainingCount > 0
                        && loadMoreCount < MAX_LOAD_MORE_CLICKS;

  // ── City-aware header ──────────────────────────────────────
  const cityLabel = filters.city ? ` in ${filters.city}` : ' Across Pakistan';

  // ── Sort change handler ────────────────────────────────────
  const handleSortChange = useCallback((sort: SortOption) => {
    updateFilters({ sort, page: 1 });
    setLoadMoreCount(0);
  }, [updateFilters]);

  // ── Page change handler (pagination) ───────────────────────
  const handlePageChange = useCallback((page: number) => {
    updateFilters({ page });
    setLoadMoreCount(0);
    // Scroll to top of grid
    setTimeout(() => {
      document.getElementById('main-project-grid')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }, [updateFilters]);

  // ── Load More handler ──────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextPage = currentPage + loadMoreCount + 1;

      const response = await fetch('/api/projects/list', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          city:         filters.city,
          category:     filters.category,
          nature:       filters.nature,
          type:         filters.type,
          minBudget:    filters.minBudget,
          maxBudget:    filters.maxBudget,
          minArea:      filters.minArea,
          maxArea:      filters.maxArea,
          possession:   filters.possession,
          noc:          filters.noc,
          installments: filters.installments,
          locality:     filters.locality,
          builder:      filters.builder,
          sort:         filters.sort,
          page:         nextPage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = (await response.json()) as ProjectListResponse;

      if (!data.success) {
        throw new Error(data.error ?? 'Failed to load more projects');
      }

      // Append new projects to loaded set
      setLoadedProjects(prev => [...prev, ...data.projects]);
      setLoadMoreCount(prev => prev + 1);

    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[MainProjectGrid] Load more failed:', err);
      setError('Unable to load more projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    filters.city, filters.category, filters.nature, filters.type,
    filters.minBudget, filters.maxBudget, filters.minArea, filters.maxArea,
    filters.possession, filters.noc, filters.installments,
    filters.locality, filters.builder, filters.sort,
    currentPage, loadMoreCount,
  ]);

  // ── Back to top handler ────────────────────────────────────
  const handleBackToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Reset loaded projects when filters change (SSR re-fetch) ─
  // The parent page does a full SSR re-run on filter change,
  // so initialProjects updates. But we need to sync local state.
  const initialIds = useMemo(
    () => initialProjects.map(p => p._id).join(','),
    [initialProjects],
  );

  React.useEffect(() => {
    setLoadedProjects(initialProjects);
    setLoadMoreCount(0);
    setError(null);
  }, [initialIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────

  return (
    <section
      id="main-project-grid"
      aria-labelledby="main-grid-heading"
      className="relative bg-gray-50 py-16 md:py-20 overflow-hidden"
    >
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96
                        bg-[#029bba]/[0.03] rounded-full blur-3xl" />
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
              All Verified Projects
            </span>
            <span className="h-px w-8 bg-gradient-to-l
                             from-transparent to-[#029bba]" />
          </div>

          {/* H2 — locked: text-3xl md:text-4xl */}
          <h2
            id="main-grid-heading"
            className="text-3xl md:text-4xl font-black text-gray-900
                       mb-3 tracking-tight leading-tight"
          >
            Every Verified{' '}
            <span
              className="text-transparent bg-clip-text
                         bg-gradient-to-r from-[#029bba] to-[#017a94]"
            >
              Project{cityLabel}
            </span>
          </h2>

          <p className="text-base text-gray-500 leading-relaxed">
            {totalCount > 0 ? (
              <>
                <span className="font-bold text-gray-700">
                  {totalCount.toLocaleString()}
                </span>
                {' '}shield-verified project{totalCount !== 1 ? 's' : ''} —
                every listing manually checked by our team.
              </>
            ) : (
              'No projects match your current filters — try adjusting to see more.'
            )}
          </p>
        </div>

        {/* ── CONTROLS BAR (sort + view + count) ─────────────── */}
        {totalCount > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100
                          shadow-sm p-4 mb-6
                          flex flex-col md:flex-row items-start md:items-center
                          justify-between gap-3">

            {/* Left: Showing count */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-semibold">Showing</span>
              <span className="font-black text-gray-900">
                {rangeStart}-{Math.min(rangeStart + showingCount - 1, totalCount)}
              </span>
              <span className="font-semibold">of</span>
              <span className="font-black text-[#029bba]">
                {totalCount.toLocaleString()}
              </span>
              <span className="font-semibold">
                project{totalCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Right: Sort + View Mode */}
            <div className="flex items-center gap-2 flex-wrap">
              <SortDropdown
                value={filters.sort}
                onChange={handleSortChange}
              />
              <ViewModeToggle
                mode={viewMode}
                onChange={setViewMode}
              />
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ────────────────────────────────────── */}
        {totalCount === 0 && (
          <EmptyState filters={filters} updateFilters={updateFilters} />
        )}

        {/* ── GRID ──────────────────────────────────────────── */}
        {loadedProjects.length > 0 && (
          <>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5'
                  : 'grid grid-cols-1 gap-4'
              }
              role="list"
              aria-label="Project listings"
            >
              {loadedProjects.map(project => (
                <div key={project._id} role="listitem">
                  <ProjectListingCard
                    project={project}
                    variant={viewMode === 'list' ? 'list' : 'grid'}
                  />
                </div>
              ))}

              {/* Skeleton loaders during Load More */}
              {loading && (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={`skeleton-${i}`} />
                  ))}
                </>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200
                              rounded-2xl text-center">
                <p className="text-sm text-red-700 font-semibold mb-2">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="text-sm text-red-600 font-bold underline
                             hover:text-red-800 focus:outline-none"
                >
                  Try again
                </button>
              </div>
            )}

            {/* ── LOAD MORE BUTTON ────────────────────────────── */}
            {showLoadMore && !loading && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl
                             bg-[#029bba] text-white text-sm font-black
                             hover:bg-[#017a94] hover:shadow-lg hover:-translate-y-0.5
                             transition-all duration-200
                             focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                >
                  <ArrowDown className="w-4 h-4" />
                  Load More Projects
                  <span className="opacity-80">
                    ({remainingCount.toLocaleString()} remaining)
                  </span>
                </button>

                <p className="text-xs text-gray-400 mt-3">
                  Showing {showingCount} of {totalCount} · {loadMoreCount + 1} of {MAX_LOAD_MORE_CLICKS} loads
                </p>
              </div>
            )}

            {/* Load More loading state */}
            {loading && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-6 py-3
                                text-sm font-bold text-[#029bba]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading more projects...
                </div>
              </div>
            )}

            {/* ── PAGINATION ──────────────────────────────────── */}
            {showPagination && (
              <>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />

                {/* Back to top button (after 2+ pages) */}
                {currentPage >= 2 && (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={handleBackToTop}
                      className="inline-flex items-center gap-1.5 text-xs font-bold
                                 text-gray-500 hover:text-[#029bba]
                                 transition-colors duration-200
                                 focus:outline-none focus:ring-2
                                 focus:ring-[#029bba]/30 rounded px-2 py-1"
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5" />
                      Back to top
                    </button>
                  </div>
                )}
              </>
            )}

            {/* End of results indicator (no more to load, no pagination) */}
            {!showLoadMore && !showPagination && totalCount > 0 && !loading && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2
                                text-xs font-bold text-gray-400
                                bg-white border border-gray-100 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  You&apos;ve seen all {totalCount} project{totalCount !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default MainProjectGrid;