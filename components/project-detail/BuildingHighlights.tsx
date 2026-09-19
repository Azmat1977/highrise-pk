// components/project-detail/BuildingHighlights.tsx
// ============================================================================
// HIGHRISE.PK — Enterprise Building Highlights & Amenities (Section 3)
// Auto-categorizes amenities with Pakistani market awareness.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  HeartPulse, 
  Users, 
  Building, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles
} from 'lucide-react';
import type { AmenityItem } from '@/types/projectDetail';

interface BuildingHighlightsProps {
  /** Accepts either string arrays (legacy) or structured AmenityItem arrays */
  amenities?: (string | AmenityItem)[];
  /** When true, renders a clean empty state instead of returning null */
  showEmptyState?: boolean;
}

// ─── Categorization Engine ───
const CATEGORIES = [
  {
    id: 'security',
    title: 'Security & Infrastructure',
    icon: ShieldCheck,
    color: 'text-[#029bba]',
    bg: 'bg-[#029bba]/10',
    keywords: ['security', 'cctv', 'guard', 'gated', 'generator', 'backup', 'power', 'earthquake', 'lift', 'elevator', 'gas', 'water', 'solar', 'cabling'],
  },
  {
    id: 'wellness',
    title: 'Wellness & Fitness',
    icon: HeartPulse,
    color: 'text-[#10b981]',
    bg: 'bg-[#10b981]/10',
    keywords: ['gym', 'pool', 'sauna', 'jogging', 'track', 'fitness', 'spa', 'health', 'sports', 'swimming'],
  },
  {
    id: 'community',
    title: 'Community & Lifestyle',
    icon: Users,
    color: 'text-[#f59e0b]',
    bg: 'bg-[#f59e0b]/10',
    keywords: ['mosque', 'masjid', 'prayer', 'community', 'hall', 'kids', 'play', 'park', 'garden', 'cafe', 'restaurant', 'club', 'daycare'],
  },
  {
    id: 'convenience',
    title: 'Business & Convenience',
    icon: Building,
    color: 'text-[#004063]',
    bg: 'bg-[#004063]/10',
    keywords: ['business', 'meeting', 'ev', 'charging', 'parking', 'maintenance', 'laundry', 'broadband', 'internet', 'wifi', 'commercial', 'reception', 'lobby'],
  }
];

export default function BuildingHighlights({
  amenities = [],
  showEmptyState = false,
}: BuildingHighlightsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ─── Data Processing & Grouping ───
  const groupedAmenities = useMemo(() => {
    // 1. Normalize input
    const normalized: AmenityItem[] = amenities
      .filter(Boolean)
      .map((item) => {
        if (typeof item === 'string') {
          return { name: item, category: 'General' } as AmenityItem;
        }
        return item as AmenityItem;
      });

    if (normalized.length === 0) return null;

    // 2. Setup buckets
    const groups: Record<string, AmenityItem[]> = {
      security: [],
      wellness: [],
      community: [],
      convenience: [],
      other: []
    };

    // 3. Sort into buckets (prefer backend taxonomy, fallback to keyword matching)
    normalized.forEach((item) => {
      const rawCat = String(item.category || '').trim().toLowerCase();

      const mappedByTaxonomy =
        rawCat === 'security' ? 'security' :
        rawCat === 'recreation' ? 'wellness' :
        rawCat === 'lifestyle' || rawCat === 'spiritual' ? 'community' :
        rawCat === 'business' || rawCat === 'convenience' ? 'convenience' :
        null;

      if (mappedByTaxonomy) {
        groups[mappedByTaxonomy].push(item);
        return;
      }

      const lowerName = item.name.toLowerCase();

      for (const cat of CATEGORIES) {
        if (cat.keywords.some((kw) => lowerName.includes(kw))) {
          groups[cat.id].push(item);
          return;
        }
      }

      groups.other.push(item);
    });

    return groups;
  }, [amenities]);

  if (!groupedAmenities) {
    if (!showEmptyState) return null;

    return (
      <section id="features" className="scroll-mt-24" aria-label="Building highlights and amenities">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#029bba]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Building Highlights &amp; Amenities</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="font-bold text-gray-900">Amenities not listed yet.</span>{' '}
              Detail abhi update nahi hui — parking, backup power, Masjid/Prayer Area, security, etc.
              ke liye <span className="font-bold text-[#029bba]">Contact</span> karein, Highrise team guide karegi.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Check if we need to show the "Other" category dynamically
  const activeCategories = CATEGORIES.filter(cat => groupedAmenities[cat.id].length > 0);
  if (groupedAmenities.other.length > 0) {
    activeCategories.push({
      id: 'other',
      title: 'Additional Features',
      icon: Sparkles,
      color: 'text-[#004063]',
      bg: 'bg-[#004063]/10',
      keywords: [],
    });
  }

  // Count total features for the expander button
  const totalFeatures = Object.values(groupedAmenities).reduce((acc, arr) => acc + arr.length, 0);
  
  // Decide how many categories to show initially (first 2 rows ideally)
  const initialCategoryLimit = 4;
  const hasMore = activeCategories.length > initialCategoryLimit;
  
  const displayedCategories = isExpanded 
    ? activeCategories 
    : activeCategories.slice(0, initialCategoryLimit);

  return (
    <section id="features" className="scroll-mt-24" aria-label="Building highlights and amenities">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header — matches ProjectOverview */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#029bba]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                Building Highlights &amp; Amenities
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Premium facilities for modern Pakistani living
              </p>
            </div>
          </div>
          {totalFeatures > 0 && (
            <span className="shrink-0 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
              {totalFeatures} features
            </span>
          )}
        </div>

        <div className="p-6">
          {/* 2-col inside left column — avoids crush at ~700px */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayedCategories.map((cat) => (
              <div
                key={cat.id}
                className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cat.bg}`}>
                    <cat.icon className={`w-4 h-4 ${cat.color}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">
                    {cat.title}
                  </h3>
                </div>

                <ul className="space-y-2.5">
                  {groupedAmenities[cat.id].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#029bba] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">
                          {item.name}
                        </span>
                        {item.description && (
                          <span className="text-[12px] text-gray-500 block leading-snug mt-0.5">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-[#029bba]
                           bg-white border border-[#029bba]/25 rounded-xl
                           hover:bg-[#029bba]/5 hover:border-[#029bba] transition-all"
              >
                {isExpanded ? (
                  <>
                    Show Less <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show All {totalFeatures} Amenities <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}