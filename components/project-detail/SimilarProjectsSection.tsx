/**
 * components/project-detail/SimilarProjectsSection.tsx
 *
 * Highrise.pk — Similar Projects Section (Enterprise Redesign)
 *
 * Features:
 *   → Parallel Single-Shot Querying (Zero loading latency on tab toggle)
 *   → Horizontal Mobile Scroll-Snap Carousel (Native UX peek track on 375px)
 *   → Brand loyalty focus (Same Developer Tab)
 *   → Strict adherence to the 1120px layout lock
 *   → Pure Tailwind + Lucide Icons only (No heavy dependencies)
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, 
  Building2, 
  MapPin, 
  Award, 
  Coins, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { formatDetailPrice } from '@/types/projectDetail';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

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
  developerId?:     string;
  createdAt?:       string;
}

type SimilarTab = 'similar' | 'same_city' | 'developer' | 'budget' | 'trusted';

export interface SimilarProjectsSectionProps {
  currentProjectId: string;
  currentCity:      string;
  currentCategory:  string;
  currentMinPrice?: number;
  currentMaxPrice?: number;
  currentDeveloperId?: string;
}

// -----------------------------------------------------------------------------
// TAB CONFIG
// -----------------------------------------------------------------------------

const TAB_META = {
  similar: {
    label: 'Highly Similar',
    desc: 'Same city and category segment',
    icon: Sparkles,
  },
  same_city: {
    label: 'Same City',
    desc: 'Browse other options in this locality',
    icon: MapPin,
  },
  developer: {
    label: 'Same Builder',
    desc: 'Portfolio by this developer',
    icon: Building2,
  },
  budget: {
    label: 'Similar Budget',
    desc: 'Matching price range profiles',
    icon: Coins,
  },
  trusted: {
    label: 'Top Rated',
    desc: 'Highest verified platform trust scores',
    icon: Award,
  },
};

// -----------------------------------------------------------------------------
// SKELETON LOADERS
// -----------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex-shrink-0 w-[290px] sm:w-auto">
      <div className="h-40 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="space-y-1 pt-2">
          <div className="h-2 bg-gray-100 rounded w-1/4" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ENTERPRISE PROJECT CARD
// -----------------------------------------------------------------------------

function SimilarProjectCard({ project }: { project: SimilarProject }) {
  // Score styling logic
  const score = project.highriseScore ?? 0;
  const scoreColor = score >= 80 
    ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20' 
    : score >= 60 
    ? 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20' 
    : 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20';

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group bg-white hover:bg-white border border-gray-200/90
                 hover:border-[#029bba]/30 hover:shadow-lg rounded-2xl
                 overflow-hidden transition-all duration-300 hover:-translate-y-1 flex-shrink-0 
                 w-[290px] sm:w-auto snap-start flex flex-col justify-between"
    >
      <div>
        {/* Media Zone */}
        <div className="relative h-40 bg-gray-100 overflow-hidden">
          {project.primaryImage ? (
            <Image
              src={project.primaryImage}
              alt={`${project.projectName} in ${project.city}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <Building2 className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
            </div>
          )}

          {/* Verification Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            {project.isVerified && (
              <span className="px-2 py-0.5 bg-[#10b981] text-white text-[9px] font-bold rounded-lg flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
              </span>
            )}
            {project.isTrustedBuilder && (
              <span className="px-2 py-0.5 bg-[#004063] text-white text-[9px] font-bold rounded-lg shadow-sm">
                TRUSTED
              </span>
            )}
          </div>

          {/* Highrise Score Ring */}
          {score > 0 && (
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg border font-black text-xs shadow-sm flex items-center gap-1 bg-white backdrop-blur-sm ${scoreColor}`}>
              <Award className="w-3 h-3" />
              <span>{score}</span>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#029bba] bg-[#029bba]/10 px-2 py-0.5 rounded-md">
            {project.projectCategory}
          </span>
          <h3 className="font-bold text-gray-900 text-sm mt-2 mb-1 line-clamp-1
                         group-hover:text-[#029bba] transition-colors">
            {project.projectName}
          </h3>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span className="line-clamp-1 font-medium">{project.area}, {project.city}</span>
          </p>
        </div>
      </div>

      {/* Footer Interactive strip */}
      <div className="p-4 pt-0 border-t border-gray-50 mt-auto">
        <div className="flex items-center justify-between pt-3">
          {project.minPrice ? (
            <div>
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider">Prices From</p>
              <p className="text-sm font-black text-[#004063]">
                PKR {formatDetailPrice(project.minPrice)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 font-bold">Contact for price</p>
          )}
          <div className="w-7 h-7 rounded-lg bg-gray-50 group-hover:bg-[#029bba]/10 flex items-center justify-center transition-colors">
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#029bba] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// -----------------------------------------------------------------------------
// MAIN SECTION MODULE
// -----------------------------------------------------------------------------

export default function SimilarProjectsSection({
  currentProjectId,
  currentCity,
  currentCategory,
  currentMinPrice,
  currentMaxPrice,
  currentDeveloperId,
}: SimilarProjectsSectionProps) {
  const [candidates, setCandidates] = useState<SimilarProject[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<SimilarTab>('similar');

  // Single-shot parallel fetch on component mount
  useEffect(() => {
    let active = true;

    const mapProject = (p: Record<string, any>): SimilarProject => {
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') primaryImage = p.featureImageUrl;
      else if (typeof p.primaryImage === 'string') primaryImage = p.primaryImage;
      
      return {
        _id:              String(p._id ?? ''),
        slug:             String(p.slug ?? ''),
        projectName:      String(p.projectName ?? ''),
        city:             String(p.city ?? ''),
        area:             String(p.areaName ?? p.area ?? ''),
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
        developerId:      typeof p.developerId === 'string' ? p.developerId : undefined,
        createdAt:        typeof p.createdAt === 'string' ? p.createdAt : undefined,
      };
    };

    const runSingleShotFetch = async () => {
      setLoading(true);
      try {
        const cityParams = new URLSearchParams({ city: currentCity, limit: '20' });
        const catParams = new URLSearchParams({ projectCategory: currentCategory, limit: '20' });
        
        let devParams = null;
        if (currentDeveloperId) {
          devParams = new URLSearchParams({ developer: currentDeveloperId, limit: '10' });
        }

        // Fire single parallel call
        const fetchers = [
          fetch(`/api/projects?${cityParams.toString()}`).then(r => r.json()),
          fetch(`/api/projects?${catParams.toString()}`).then(r => r.json())
        ];

        if (devParams) {
          fetchers.push(fetch(`/api/projects?${devParams.toString()}`).then(r => r.json()));
        }

        const responses = await Promise.all(fetchers);
        
        // Merge & deduplicate responses on client side
        const mergedMap = new Map<string, SimilarProject>();
        responses.forEach(res => {
          if (res?.success && Array.isArray(res.projects)) {
            res.projects.forEach((item: any) => {
              if (String(item._id) !== currentProjectId) {
                mergedMap.set(String(item._id), mapProject(item));
              }
            });
          }
        });

        if (active) {
          setCandidates(Array.from(mergedMap.values()));
        }
      } catch (err) {
        console.error('Failed to parallel-load similar listings:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void runSingleShotFetch();
    return () => { active = false; };
  }, [currentProjectId, currentCity, currentCategory, currentDeveloperId]);

  // Client-Side Tab Filtering (Instant switching, zero network lag)
  const getFilteredListings = () => {
    switch (activeTab) {
      case 'same_city':
        return candidates.filter(p => p.city.toLowerCase() === currentCity.toLowerCase());

      case 'developer':
        if (!currentDeveloperId) return [];
        return candidates.filter(p => p.developerId === currentDeveloperId);

      case 'budget':
        return candidates.filter(p => {
          if (!currentMinPrice) return true;
          const pPrice = p.minPrice ?? 0;
          if (pPrice === 0) return false;
          // Matching +/- 35% margin threshold rules
          return pPrice >= currentMinPrice * 0.65 && pPrice <= (currentMaxPrice ?? currentMinPrice) * 1.35;
        });

      case 'trusted':
        return [...candidates].sort((a, b) => (b.highriseScore ?? 0) - (a.highriseScore ?? 0));

      case 'similar':
      default:
        // Filter: exact city AND category matches
        return candidates.filter(p => 
          p.city.toLowerCase() === currentCity.toLowerCase() && 
          p.projectCategory.toLowerCase() === currentCategory.toLowerCase()
        );
    }
  };

  const displayList = getFilteredListings().slice(0, 6);

  // Silent fail: Section hides dynamically if zero metadata returned and not loading
  if (!loading && candidates.length === 0) return null;

  return (
    <section id="similar-projects" className="scroll-mt-24 max-w-[1120px] mx-auto px-4 sm:px-6 mt-8 lg:mt-16">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Section Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#029bba]" />
              </div>
              Similar Projects You May Like
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Handpicked projects matched automatically with your context parameters
            </p>
          </div>
        </div>

        {/* Tab Toggle Strip */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {(Object.keys(TAB_META) as SimilarTab[]).map(key => {
              if (key === 'developer' && !currentDeveloperId) return null;
              const meta = TAB_META[key];
              const IconComp = meta.icon;
              const isActive = activeTab === key;

              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#029bba] text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  {meta.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#029bba]" />
            {TAB_META[activeTab]?.desc}
          </p>
        </div>

        {/* Display Container Grid/Carousel */}
        <div className="p-6">
          {loading ? (
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto sm:overflow-visible scrollbar-none pb-4 sm:pb-0">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-gray-700">No properties in this category tab</p>
              <p className="text-xs text-gray-400 mt-1">Switch tabs to explore alternatives</p>
            </div>
          ) : (
            // Flex row with scroll-snap peek for mobile, native grid fallback for desktop
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-none pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
              {displayList.map(p => (
                <SimilarProjectCard key={p._id} project={p} />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}