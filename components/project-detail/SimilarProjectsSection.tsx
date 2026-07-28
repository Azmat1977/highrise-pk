/**
 * components/project-detail/SimilarProjectsSection.tsx
 *
 * Highrise.pk — Similar Projects Section
 * Extracted from index.tsx (Wave 4 Task 3)
 *
 * Features:
 *   → 4 tabs: Highly Similar / Same City / Higher Trust / Similar Budget
 *   → Client-side fetch from /api/projects
 *   → Skeleton loading state (no CLS)
 *   → Empty state per tab
 *   → Trust score badge per card
 *   → Verified + Trusted Builder badges
 *   → Guest-first (no login needed)
 *
 * Rules:
 *   → Tailwind only (zero inline styles)
 *   → Lucide React icons only
 *   → No framer-motion
 *   → Mobile-first (375px min)
 *   → next/image with sizes + alt (SEO Rule Set C)
 *   → External fetch: credentials include + Accept header
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { formatDetailPrice } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SimilarProject {
  _id:              string;
  slug:             string;
  projectName:      string;
  city:             string;
  area:             string;
  projectCategory:  string;
  minPrice?:        number;
  maxPrice?:        number;
  highriseScore?:   number;
  riskLevel?:       string;
  isVerified?:      boolean;
  isTrustedBuilder?: boolean;
  developerBadge?:  string;
  primaryImage:     string | null;
  developerName?:   string;
  createdAt?:       string;
}

type SimilarTab = 'similar' | 'same_city' | 'trusted' | 'budget';

export interface SimilarProjectsSectionProps {
  currentProjectId: string;
  currentCity:      string;
  currentCategory:  string;
  currentMinPrice?: number;
  currentMaxPrice?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { key: SimilarTab; label: string; desc: string }[] = [
  { key: 'similar',   label: '🎯 Highly Similar',    desc: 'Same city, category & budget'  },
  { key: 'same_city', label: '📍 Same City',          desc: 'All projects in this city'     },
  { key: 'trusted',   label: '🏆 Higher Trust Score', desc: 'Top rated projects'            },
  { key: 'budget',    label: '💰 Similar Budget',     desc: 'Same price range'              },
];

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-100 rounded-2xl overflow-hidden">
      <div className="h-36 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-2" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT CARD
// ─────────────────────────────────────────────────────────────────────────────

function SimilarProjectCard({ project }: { project: SimilarProject }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group bg-gray-50 hover:bg-white border border-gray-200
                 hover:border-[#029bba]/30 hover:shadow-lg rounded-2xl
                 overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative h-36 bg-gray-200 overflow-hidden">
        {project.primaryImage ? (
          <Image
            src={project.primaryImage}
            alt={`${project.projectName} in ${project.city}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Building2 className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {project.isVerified && (
            <span className="px-2 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-full">
              ✓ VERIFIED
            </span>
          )}
          {project.isTrustedBuilder && (
            <span className="px-2 py-0.5 bg-[#029bba] text-white text-[9px] font-bold rounded-full">
              🏆 TRUSTED
            </span>
          )}
        </div>

        {/* Trust score */}
        {project.highriseScore !== undefined && (
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow
                          flex items-center justify-center">
            <span className={`text-[10px] font-black leading-none ${
              project.highriseScore >= 80
                ? 'text-green-600'
                : project.highriseScore >= 60
                ? 'text-amber-600'
                : 'text-red-600'
            }`}>
              {project.highriseScore}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1
                       group-hover:text-[#029bba] transition-colors">
          {project.projectName}
        </h3>
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{project.area}, {project.city}</span>
        </p>
        <div className="flex items-center justify-between">
          {project.minPrice ? (
            <div>
              <p className="text-[9px] text-gray-400 uppercase font-bold">From</p>
              <p className="text-sm font-black text-[#029bba]">
                PKR {formatDetailPrice(project.minPrice)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Contact for price</p>
          )}
          <ArrowRight className="w-4 h-4 text-[#029bba] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SimilarProjectsSection({
  currentProjectId,
  currentCity,
  currentCategory,
  currentMinPrice,
  currentMaxPrice,
}: SimilarProjectsSectionProps) {
  const [projects,   setProjects]   = useState<SimilarProject[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<SimilarTab>('similar');

  // ── Fetch similar projects with progressive fallback ──
  // Strategy: strict match → relaxed (city only) → broadest (category only)
  // Ensures we always show similar options when possible.
  useEffect(() => {
    let cancelled = false;

    const mapProject = (p: Record<string, unknown>): SimilarProject => {
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') primaryImage = p.featureImageUrl;
      else if (typeof p.primaryImage === 'string') primaryImage = p.primaryImage;
      return {
        _id:              String(p._id ?? ''),
        slug:             String(p.slug ?? ''),
        projectName:      String(p.projectName ?? ''),
        city:             String(p.city ?? ''),
        area:             String(p.area ?? ''),
        projectCategory:  String(p.projectCategory ?? ''),
        minPrice:         typeof p.minPrice === 'number' ? p.minPrice : undefined,
        maxPrice:         typeof p.maxPrice === 'number' ? p.maxPrice : undefined,
        highriseScore:    typeof p.highriseScore === 'number' ? p.highriseScore : undefined,
        riskLevel:        typeof p.riskLevel === 'string' ? p.riskLevel : undefined,
        isVerified:       Boolean(p.isVerified),
        isTrustedBuilder: Boolean(p.isTrustedBuilder),
        developerBadge:   typeof p.developerBadge === 'string' ? p.developerBadge : undefined,
        primaryImage,
        developerName:    typeof p.developerName === 'string' ? p.developerName : undefined,
        createdAt:        typeof p.createdAt === 'string' ? p.createdAt : undefined,
      };
    };

    const fetchWithParams = async (queryParams: URLSearchParams): Promise<SimilarProject[]> => {
      try {
        const res = await fetch(`/api/projects?${queryParams.toString()}`, {
          credentials: 'include',
          headers:     { Accept: 'application/json' },
        });

        // Silent fail on auth errors (guest users can browse)
        // or any non-2xx response — section auto-hides if no data
        if (!res.ok) return [];

        const data = await res.json() as {
          success:   boolean;
          projects?: Record<string, unknown>[];
        };
        if (!data.success) return [];

        return (data.projects ?? [])
          .filter((p) => String(p._id) !== currentProjectId)
          .map(mapProject);
      } catch {
        // Network error or JSON parse fail — silent
        return [];
      }
    };

    const fetchSimilar = async () => {
      setLoading(true);
      try {
        // ── ATTEMPT 1: Strict match (same city + same category) ──
        const strict = new URLSearchParams();
        strict.append('city',            currentCity);
        strict.append('projectCategory', currentCategory);
        strict.append('limit',           '12');
        let results = await fetchWithParams(strict);

        // ── ATTEMPT 2: Same city, any category ──
        if (results.length < 3) {
          const cityOnly = new URLSearchParams();
          cityOnly.append('city',  currentCity);
          cityOnly.append('limit', '12');
          const cityResults = await fetchWithParams(cityOnly);
          // Merge without duplicates
          const seen = new Set(results.map(r => r._id));
          for (const p of cityResults) {
            if (!seen.has(p._id)) {
              results.push(p);
              seen.add(p._id);
            }
          }
        }

        // ── ATTEMPT 3: Same category, any city (broadest) ──
        if (results.length < 3) {
          const categoryOnly = new URLSearchParams();
          categoryOnly.append('projectCategory', currentCategory);
          categoryOnly.append('limit',           '12');
          const categoryResults = await fetchWithParams(categoryOnly);
          const seen = new Set(results.map(r => r._id));
          for (const p of categoryResults) {
            if (!seen.has(p._id)) {
              results.push(p);
              seen.add(p._id);
            }
          }
        }

        // Cap at 6 for display
        if (!cancelled) {
          setProjects(results.slice(0, 6));
        }
      } catch {
        // keep empty — silent fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchSimilar();
    return () => { cancelled = true; };
  }, [currentProjectId, currentCity, currentCategory]);

  // ── Tab filtering ──
  const displayProjects = activeTab === 'trusted'
    ? [...projects].sort((a, b) => (b.highriseScore ?? 0) - (a.highriseScore ?? 0))
    : activeTab === 'budget'
    ? projects.filter(p => {
        if (!currentMinPrice || !currentMaxPrice) return true;
        const pMin = p.minPrice ?? 0;
        const pMax = p.maxPrice ?? 0;
        return pMin >= currentMinPrice * 0.5 && pMax <= currentMaxPrice * 1.5;
      })
    : projects;

  // Hide section if no results and not loading
  if (!loading && projects.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-[#029bba]" />
            You May Also Like
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Projects similar to this one
          </p>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-100 overflow-x-auto scrollbar-none">
          <div className="flex gap-2">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
                aria-label={tab.label}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#029bba] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 pb-1">
            {TABS.find(t => t.key === activeTab)?.desc}
          </p>
        </div>

        {/* Grid */}
        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : displayProjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm">No similar projects found for this tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayProjects.map(p => (
                <SimilarProjectCard key={p._id} project={p} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}