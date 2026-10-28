/**
 * components/compare/CompareSuggestions.tsx
 *
 * "Smart Suggestions" section on /compare page.
 * Shows similar projects the user might want to add to comparison.
 *
 * FEATURES:
 *   ✅ Fetches from /api/compare/suggestions
 *   ✅ Uses ProjectListingCard (grid variant) for consistency
 *   ✅ Shows matching context ("Because you're comparing X + Y...")
 *   ✅ Auto-refreshes when compare items change
 *   ✅ Empty state if no matches
 *   ✅ Skeleton loading
 *   ✅ Hides when compare is full (4 items)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  MapPin,
  Building2,
  TrendingUp,
  Loader2,
  ArrowRight,
} from 'lucide-react';

import ProjectListingCard from '@/components/projects/ProjectListingCard';
import { MAX_COMPARE_ITEMS, type ProjectListing } from '@/types/projects';
import type { CompareEntity } from '@/components/compare/CompareTable';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface CompareSuggestionsProps {
  entities: CompareEntity[];
}

interface SuggestionsResponse {
  success:  boolean;
  projects: ProjectListing[];
  context?: {
    cities:     string[];
    categories: string[];
    natures:    string[];
    priceRange: { min: number | null; max: number | null };
    totalMatches: number;
    tierBreakdown: {
      tier1: number;
      tier2: number;
      tier3: number;
      tier4: number;
    };
  };
  error?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function extractSuggestionCriteria(entities: CompareEntity[]) {
  const cities:     Set<string> = new Set();
  const categories: Set<string> = new Set();
  const natures:    Set<string> = new Set();
  const projectIds: string[]    = [];
  let minPrice: number | null = null;
  let maxPrice: number | null = null;

  for (const entity of entities) {
    const d = entity.data;

    if (d._id) projectIds.push(String(d._id));

    if (typeof d.city === 'string' && d.city) cities.add(d.city);

    if (entity.entityType === 'project') {
      if (typeof d.projectCategory === 'string' && d.projectCategory) {
        categories.add(d.projectCategory);
      }
      if (typeof d.projectNature === 'string' && d.projectNature) {
        natures.add(d.projectNature);
      }
      if (typeof d.minPrice === 'number' && d.minPrice > 0) {
        minPrice = minPrice === null ? d.minPrice : Math.min(minPrice, d.minPrice);
      }
      if (typeof d.maxPrice === 'number' && d.maxPrice > 0) {
        maxPrice = maxPrice === null ? d.maxPrice : Math.max(maxPrice, d.maxPrice);
      }
    } else {
      // Property: use price directly
      if (typeof d.price === 'number' && d.price > 0) {
        if (minPrice === null || d.price < minPrice) minPrice = d.price;
        if (maxPrice === null || d.price > maxPrice) maxPrice = d.price;
      }
    }
  }

  return {
    projectIds,
    cities:     Array.from(cities),
    categories: Array.from(categories),
    natures:    Array.from(natures),
    minPrice,
    maxPrice,
  };
}

// ─── SKELETON LOADER ─────────────────────────────────────────────────────────

function SuggestionSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i}
             className="bg-white rounded-2xl border border-gray-100
                        shadow-sm overflow-hidden animate-pulse">
          <div className="aspect-[16/10] bg-gray-100" />
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CONTEXT BADGES ──────────────────────────────────────────────────────────

function ContextBadges({
  cities,
  categories,
  natures,
}: {
  cities:     string[];
  categories: string[];
  natures:    string[];
}): React.ReactElement | null {

  const hasAny = cities.length > 0 || categories.length > 0 || natures.length > 0;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
        🎯 Based on:
      </span>

      {natures.map(n => (
        <span key={`n-${n}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                         bg-purple-50 border border-purple-200 text-purple-700
                         text-xs font-bold capitalize">
          <Building2 className="w-3 h-3" />
          {n.replace(/_/g, ' ')}
        </span>
      ))}

      {cities.map(c => (
        <span key={`c-${c}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                         bg-[#029bba]/10 border border-[#029bba]/20 text-[#029bba]
                         text-xs font-bold">
          <MapPin className="w-3 h-3" />
          {c}
        </span>
      ))}

      {categories.slice(0, 2).map(cat => (
        <span key={`cat-${cat}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                         bg-emerald-50 border border-emerald-200 text-emerald-700
                         text-xs font-bold capitalize">
          {cat.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function CompareSuggestions({
  entities,
}: CompareSuggestionsProps): React.ReactElement | null {

  const [suggestions, setSuggestions] = useState<ProjectListing[]>([]);
  const [context,     setContext]     = useState<SuggestionsResponse['context']>();
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Fetch suggestions ─────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async () => {
    if (entities.length === 0) {
      setSuggestions([]);
      setContext(undefined);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const criteria = extractSuggestionCriteria(entities);

      const res = await fetch('/api/compare/suggestions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...criteria,
          limit: 6,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as SuggestionsResponse;

      if (data.success && Array.isArray(data.projects)) {
        setSuggestions(data.projects);
        setContext(data.context);
      } else {
        setSuggestions([]);
        setError(data.error || 'Failed to load suggestions');
      }
    } catch (err) {
      console.error('[CompareSuggestions] Fetch failed:', err);
      setSuggestions([]);
      setError('Unable to load suggestions right now');
    } finally {
      setLoading(false);
    }
  }, [entities]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  // ─── DON'T RENDER conditions ─────────────────────────────────────────────
  // Hide when compare is full (user can't add more)
  if (entities.length >= MAX_COMPARE_ITEMS) return null;

  // Hide when compare is empty (nothing to base suggestions on)
  if (entities.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="suggestions-heading">

      {/* ═══ Header ═══ */}
      <div className="bg-gradient-to-br from-[#029bba]/5 to-emerald-50
                      rounded-2xl border border-[#029bba]/20 p-5 md:p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white shadow-sm
                              flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#029bba]" />
              </div>
              <h2 id="suggestions-heading"
                  className="text-lg md:text-xl font-black text-gray-900">
                Smart Suggestions
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5
                               rounded-full bg-emerald-500 text-white
                               text-[9px] font-black uppercase tracking-wider">
                <TrendingUp className="w-2.5 h-2.5" />
                AI Powered
              </span>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Similar top-rated projects that match your comparison criteria.
              Add any to instantly include in your comparison.
            </p>

            {context && !loading && (
              <ContextBadges
                cities={context.cities}
                categories={context.categories}
                natures={context.natures}
              />
            )}
          </div>

          {suggestions.length > 0 && !loading && (
            <div className="hidden md:flex items-center gap-1 text-xs
                            font-bold text-gray-500">
              <span>{suggestions.length}</span>
              <span>match{suggestions.length > 1 ? 'es' : ''} found</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Loading Skeleton ═══ */}
      {loading && <SuggestionSkeleton />}

      {/* ═══ Error State ═══ */}
      {!loading && error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl
                        p-6 text-center">
          <p className="text-sm font-bold text-amber-700 mb-2">
            ⚠️ {error}
          </p>
          <button
            type="button"
            onClick={() => void fetchSuggestions()}
            className="text-xs font-black text-amber-800 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* ═══ Empty State (no matches) ═══ */}
      {!loading && !error && suggestions.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl
                        p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-50
                          flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">
            No perfect matches yet
          </p>
          <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
            We couldn&apos;t find projects that closely match your comparison criteria.
            Try browsing more projects.
          </p>
          <a
            href="/projects"
            className="inline-flex items-center gap-1.5 px-4 py-2
                       rounded-xl bg-[#029bba] text-white
                       text-xs font-black hover:bg-[#017a94]
                       transition-colors"
          >
            Browse All Projects
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* ═══ Suggestions Grid ═══ */}
      {!loading && !error && suggestions.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map(project => (
              <ProjectListingCard
                key={project._id}
                project={project}
                variant="grid"
              />
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-6 text-center">
            <a
              href="/projects"
              className="inline-flex items-center gap-2 px-6 py-3
                         rounded-xl bg-white border-2 border-[#029bba]
                         text-[#029bba] text-sm font-black
                         hover:bg-[#029bba]/5 hover:shadow-md
                         transition-all"
            >
              <Building2 className="w-4 h-4" />
              Explore More Projects
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </>
      )}

      {/* ═══ Loading indicator (subtle, non-blocking) ═══ */}
      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs
                          font-semibold text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#029bba]" />
            Finding similar projects...
          </div>
        </div>
      )}
    </section>
  );
}