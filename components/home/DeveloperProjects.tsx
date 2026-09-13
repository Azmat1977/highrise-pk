import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Building2, MapPin, ArrowRight, Loader2, Sparkles, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface ProjectItem {
  _id: string;
  projectName: string;
  slug?: string;
  city?: string;
  areaName?: string;
  projectStatus?: string;
  projectCategory?: string;
  projectNature?: string;
  startingPrice?: number;
  possessionDate?: string;
  coverImage?: { url: string };
  images?: { url: string }[];
}

function formatPKR(price: number): string {
  if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(2)} Crore`;
  if (price >= 100_000) return `PKR ${(price / 100_000).toFixed(2)} Lac`;
  return `PKR ${price.toLocaleString()}`;
}

export default function DeveloperProjects({
  projects, loading
}: {
  projects: ProjectItem[]; loading: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  // The Sleek Pill Carousel Categories
  const categories = [
    'All', 'High-Rise Apartments', 'Gated Communities', 
    'Commercial Plazas', 'Mixed-Use', 'Villas'
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 bg-white border-t border-gray-100 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-bold tracking-wide mb-4">
            <Building2 className="w-4 h-4" />
            Developer Network
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#001f2b] mb-4 tracking-tight">
            Explore <span className="text-[#029bba]">Verified Projects</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Latest residential and commercial projects directly from trusted Pakistani developers.
          </p>
        </div>

        {/* The Sleek "Explore Project Types" Pill Carousel */}
        <div className="relative mb-10 group">
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-[#029bba] opacity-0 group-hover:opacity-100 transition-opacity -ml-4"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div 
            ref={scrollRef}
            className="flex overflow-x-auto gap-3 snap-x scroll-smooth pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`snap-start whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all border ${
                  activeCategory === cat 
                    ? 'bg-[#029bba] border-[#029bba] text-white shadow-md' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#029bba]/50 hover:bg-gray-50'
                }`}
              >
                {cat === 'All' && <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />}
                {cat}
              </button>
            ))}
          </div>

          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-[#029bba] opacity-0 group-hover:opacity-100 transition-opacity -mr-4"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Project Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-gray-50 rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
            <span className="ml-3 text-gray-600 font-medium">Loading projects...</span>
          </div>
        ) : projects.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.slice(0, 6).map((project) => (
                <Link key={project._id} href={`/projects/${project.slug || project._id}`}>
                  <div className="bg-white border border-gray-200 hover:border-[#029bba]/40 rounded-3xl transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-xl flex flex-col h-full overflow-hidden">
                    <div className="h-56 overflow-hidden relative">
                      <Image
                        src={project.images?.[0]?.url || project.coverImage?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'}
                        alt={project.projectName} fill className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#001f2b]/80 via-[#001f2b]/20 to-transparent" />
                      
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-bold text-xl mb-1 line-clamp-1 group-hover:text-[#06b6d4] transition-colors">
                          {project.projectName}
                        </h3>
                        <p className="text-white/80 text-sm flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" /> {project.areaName}, {project.city}
                        </p>
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1.5 text-xs font-bold rounded-lg shadow-lg bg-white/95 text-[#029bba] backdrop-blur-md">
                          {project.projectStatus || 'New Launch'}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 flex-grow flex flex-col">
                      <div className="flex items-center gap-2 mb-5">
                        <span className="px-3 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-bold rounded-full">
                          {project.projectCategory === 'highrise' ? 'High-rise' : 'Housing Society'}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                          {project.projectNature || 'Mixed Use'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-5 border-t border-gray-100 pt-5">
                        <div>
                          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Starts From</p>
                          <p className="font-extrabold text-[#001f2b] text-sm">
                            {project.startingPrice ? formatPKR(project.startingPrice) : 'Contact'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Possession</p>
                          <p className="font-extrabold text-[#001f2b] text-sm">{project.possessionDate || 'TBA'}</p>
                        </div>
                      </div>

                      <button className="mt-auto w-full py-3.5 rounded-xl bg-[#f8fcfd] border border-[#029bba]/20 text-[#029bba] font-bold group-hover:bg-[#029bba] group-hover:text-white transition-all flex items-center justify-center gap-2">
                        Explore Project <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href={activeCategory === 'All' ? '/projects' : `/projects?category=${activeCategory}`}>
                <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-bold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                  View All {activeCategory !== 'All' ? activeCategory : 'Projects'} <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-3xl">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#001f2b] mb-2">No Projects Listed Yet</h3>
          </div>
        )}
      </div>
    </section>
  );
}