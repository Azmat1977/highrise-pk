import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Building2, MapPin, ArrowRight, Loader2, TrendingUp, 
  ChevronLeft, ChevronRight, Home, Maximize 
} from 'lucide-react';

interface ProjectItem {
  _id: string;
  projectName: string;
  slug?: string;
  city?: string;
  areaName?: string;
  area?: string;
  projectStatus?: string;
  projectCategory?: string;
  projectNature?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  areaUnit?: string;
  marketingBadge?: string; 
  priceRangeText?: string;
  startingPriceFormatted?: string;
  unitTypeBreakdown?: Array<{
    type?: string;
    category?: string;
    areaRange?: { min?: number; max?: number; unit?: string };
    areaRangeSqft?: { min?: number; max?: number };
  }>;
  primaryImage?: string | null;
  featureImageUrl?: string;
  coverImage?: { url: string };
  images?: { url: string }[];
}

function formatPKR(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(2)} Crore`;
  if (price >= 100_000) return `${(price / 100_000).toFixed(2)} Lac`;
  return price.toLocaleString();
}

function getProjectImage(project: ProjectItem): string {
  return (
    project.primaryImage ||
    project.featureImageUrl ||
    project.images?.[0]?.url ||
    project.coverImage?.url ||
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'
  );
}

function getPriceString(p: ProjectItem): string {
  if (p.priceRangeText) return p.priceRangeText;
  if (p.minPrice && p.maxPrice && p.minPrice !== p.maxPrice) {
    return `PKR ${formatPKR(p.minPrice)} to ${formatPKR(p.maxPrice)}`;
  }
  if (p.minPrice) return `PKR ${formatPKR(p.minPrice)}`;
  if (p.startingPriceFormatted) return p.startingPriceFormatted;
  return 'Contact for Price';
}

function getUnitTypes(p: ProjectItem): string {
  // If unitTypeBreakdown exists, extract unique types dynamically
  if (p.unitTypeBreakdown && p.unitTypeBreakdown.length > 0) {
    const rawTypes = p.unitTypeBreakdown.map((u) => u.type).filter(Boolean);
    const unique = Array.from(new Set(rawTypes));
    if (unique.length > 0) return unique.join(', ');
  }
  
  // Smart fallback based on project classification
  const nature = (p.projectNature || '').toLowerCase();
  const category = (p.projectCategory || '').toLowerCase();
  
  if (nature === 'mixed' || category === 'mixed_use') return 'Shops, Commercial, Offices, Buildings, Flats';
  if (nature === 'commercial' || category === 'commercial_plaza') return 'Shops, Offices, Commercial Spaces';
  if (category === 'highrise' || category === 'high_rise') return 'Flats, Penthouses, Apartments';
  
  return 'Residential & Commercial Units';
}

function getSizeRange(p: ProjectItem): string {
  const unit = p.areaUnit || 'sqft';
  
  if (typeof p.minArea === 'number' && typeof p.maxArea === 'number' && p.minArea > 0 && p.maxArea > 0) {
    if (p.minArea === p.maxArea) return `${p.minArea} ${unit}`;
    return `${p.minArea} ${unit} to ${p.maxArea} ${unit}`;
  }

  // Attempt derive directly from unitTypeBreakdown if available on client
  if (p.unitTypeBreakdown && p.unitTypeBreakdown.length > 0) {
    const areas: number[] = [];
    for (const ut of p.unitTypeBreakdown) {
      if (ut.areaRangeSqft?.min) areas.push(ut.areaRangeSqft.min);
      if (ut.areaRangeSqft?.max) areas.push(ut.areaRangeSqft.max);
      if (ut.areaRange?.min) areas.push(ut.areaRange.min);
      if (ut.areaRange?.max) areas.push(ut.areaRange.max);
    }
    if (areas.length > 0) {
      const min = Math.min(...areas);
      const max = Math.max(...areas);
      return min === max ? `${min} ${unit}` : `${min} ${unit} to ${max} ${unit}`;
    }
  }

  return 'Various Sizes Available';
}

function getBadgeStyle(badge?: string): { text: string; bg: string } {
  if (!badge) return { text: 'FEATURED', bg: 'bg-[#029bba]' };
  const b = badge.toLowerCase();
  if (b === 'hot') return { text: 'HOT', bg: 'bg-red-600' };
  if (b === 'trending') return { text: 'TRENDING', bg: 'bg-rose-500' };
  if (b === 'luxury') return { text: 'LUXURY', bg: 'bg-amber-500 text-black' };
  if (b === 'premium') return { text: 'PREMIUM', bg: 'bg-purple-600' };
  if (b === 'pre_launch' || b === 'pre-launch') return { text: 'PRE-LAUNCH', bg: 'bg-emerald-600' };
  return { text: badge.toUpperCase(), bg: 'bg-[#029bba]' };
}

export default function DeveloperProjects({
  projects, loading
}: {
  projects: ProjectItem[]; loading: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const clientWidth = scrollRef.current.clientWidth;
      const scrollAmount = clientWidth > 768 ? clientWidth / 2 : clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        
        <div className="bg-[#f4f9fb] rounded-[2rem] p-5 md:p-8 lg:p-10 relative border border-[#029bba]/10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#001f2b] tracking-tight">
                Verified Projects
              </h2>
              <span className="bg-gradient-to-r from-rose-500 to-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                <TrendingUp className="w-3 h-3" /> Trending
              </span>
            </div>
            
            <Link href="/projects" className="text-[#029bba] text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative group">
            
            <button 
              onClick={() => scroll('left')}
              className="absolute -left-4 top-1/3 z-20 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg hidden md:flex items-center justify-center text-gray-600 hover:text-[#029bba] opacity-0 group-hover:opacity-100 transition-all duration-300 disabled:opacity-0"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div 
              ref={scrollRef}
              className="flex overflow-x-auto gap-5 snap-x snap-mandatory scroll-smooth pb-4 pt-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style dangerouslySetInnerHTML={{__html: `div::-webkit-scrollbar { display: none; }`}} />

              {loading ? (
                <div className="w-full flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
                </div>
              ) : projects.length > 0 ? (
                projects.map((project, idx) => {
                  const badgeInfo = getBadgeStyle(project.marketingBadge || (idx === 0 ? 'hot' : undefined));
                  
                  return (
                    <Link key={project._id} href={`/projects/${project.slug || project._id}`} className="snap-start flex-shrink-0">
                      <div className="w-[280px] md:w-[330px] bg-transparent group/card cursor-pointer flex flex-col h-full">
                        
                        {/* Image Container — Padding & Inset Badging so top-left never cuts off */}
                        <div className="h-[185px] rounded-2xl overflow-hidden relative bg-gray-100 mb-3 border border-black/5 shadow-sm group-hover/card:shadow-md transition-all">
                          <Image
                            src={getProjectImage(project)}
                            alt={project.projectName} fill className="object-cover group-hover/card:scale-105 transition-transform duration-700"
                            sizes="(max-width: 768px) 280px, 330px"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                          
                          {/* Inset Badge — Never cuts off at top corner */}
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <span className={`inline-block ${badgeInfo.bg} text-white text-[10px] font-black px-2.5 py-1 rounded-md tracking-wider uppercase shadow-md`}>
                              {badgeInfo.text}
                            </span>
                          </div>

                          {/* Launch Status Badge */}
                          <div className="absolute bottom-2.5 right-2.5">
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm bg-white/95 text-[#029bba] backdrop-blur-md border border-white/50">
                              {project.projectStatus || 'Launched'}
                            </span>
                          </div>
                        </div>

                        {/* Zameen-Style Data Breakdown */}
                        <div className="flex flex-col px-1">
                          {/* Price Range */}
                          <h4 className="font-extrabold text-gray-900 text-[15px] mb-1 leading-tight tracking-tight group-hover/card:text-[#029bba] transition-colors">
                            {getPriceString(project)}
                          </h4>
                          
                          {/* Title */}
                          <h3 className="font-bold text-gray-800 text-[13px] mb-0.5 truncate">
                            {project.projectName}
                          </h3>

                          {/* Location with MapPin Icon */}
                          <p className="text-gray-500 text-[12px] mb-3 truncate flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{[project.area || project.areaName, project.city].filter(Boolean).join(', ')}</span>
                          </p>
                          
                          {/* Unit Types & Size Breakdown */}
                          <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-gray-100">
                            
                            {/* Offered Types (Flats, Shops, Offices, etc.) */}
                            <div className="flex items-start gap-2 text-gray-600 text-[12px]">
                              <Home className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                              <span className="line-clamp-1 capitalize leading-snug">
                                {getUnitTypes(project)}
                              </span>
                            </div>
                            
                            {/* Min to Max Size Range */}
                            <div className="flex items-center gap-2 text-gray-600 text-[12px]">
                              <Maximize className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                              <span className="truncate">
                                {getSizeRange(project)}
                              </span>
                            </div>

                          </div>
                        </div>

                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="w-full text-center py-12">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-[#001f2b]">No Projects Listed Yet</h3>
                </div>
              )}
            </div>

            <button 
              onClick={() => scroll('right')}
              className="absolute -right-4 top-1/3 z-20 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg hidden md:flex items-center justify-center text-gray-600 hover:text-[#029bba] opacity-0 group-hover:opacity-100 transition-all duration-300 disabled:opacity-0"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

          </div>
        </div>
      </div>
    </section>
  );
}