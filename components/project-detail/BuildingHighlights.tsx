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
      <section id="features" className="py-10 border-t border-gray-100 scroll-mt-24">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-[#001f2b] tracking-tight">
            Building Highlights &amp; Amenities
          </h2>
          <p className="text-gray-500 mt-2 text-sm md:text-base">
            Amenities detail abhi update nahi hui — but no tension, Highrise team can help you verify full feature list.
          </p>
        </div>

        <div className="bg-[#f8fcfd] rounded-2xl p-6 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-bold text-gray-900">Amenities not listed yet.</span>{' '}
            For the complete list (parking, backup power, Masjid/Prayer Area, security, etc.),
            click <span className="font-bold text-[#029bba]">Contact</span> and we’ll guide you.
          </p>
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
    <section id="features" className="py-10 border-t border-gray-100 scroll-mt-24">
      {/* Enterprise Heading (Rule Set A) */}
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-[#001f2b] tracking-tight">
          Building Highlights &amp; Amenities
        </h2>
        <p className="text-gray-500 mt-2 text-sm md:text-base">
          Premium facilities and infrastructure designed for modern living.
        </p>
      </div>

      {/* Categories Grid (2 cols tablet, 3 cols desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedCategories.map((cat) => (
          <div 
            key={cat.id} 
            className="bg-[#f8fcfd] rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Category Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.bg}`}>
                <cat.icon className={`w-5 h-5 ${cat.color}`} />
              </div>
              <h3 className="font-bold text-gray-900 leading-tight">
                {cat.title}
              </h3>
            </div>

            {/* Amenities List */}
            <ul className="space-y-3">
              {groupedAmenities[cat.id].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#029bba] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-gray-700 block">
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

      {/* Show More Expander */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-[#029bba] bg-white border-2 border-[#029bba]/20 rounded-full hover:bg-[#029bba]/5 hover:border-[#029bba] transition-all"
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
    </section>
  );
}