import React, { useState, useEffect, useRef, useMemo } from 'react';
import CityCard from './CityCard';
import { MapPin, Landmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { cities as staticCities } from '@/data/cities';

interface ApiCityItem {
  name: string;
  propertyCount?: number;
  imageUrl?: string;
  description?: string | null;
  landmarkTitle?: string | null;
  landmarkKicker?: string | null;
}

interface CityExplorerProps {
  isHomepage?: boolean;
  cities?: ApiCityItem[];
  loading?: boolean;
}

export default function CityExplorer({
  isHomepage = false,
  cities: apiCities = [],
  loading = false,
}: CityExplorerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(true);

  // Merge live API property counts with static landmark metadata
  const cities = useMemo(() => {
    if (!apiCities || apiCities.length === 0) {
      return staticCities.map((c) => ({
        ...c,
        count: '0',
      }));
    }

    const apiMap = new Map<string, ApiCityItem>();
    for (const item of apiCities) {
      if (item.name) apiMap.set(item.name.toLowerCase().trim(), item);
    }

    return staticCities.map((staticCity) => {
      const match = apiMap.get(staticCity.name.toLowerCase().trim());
      const realCount = match?.propertyCount ?? 0;

      return {
        ...staticCity,
        count: realCount > 0 ? String(realCount) : '0',
      };
    });
  }, [apiCities]);

  const checkScrollBoundary = () => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanPrevious(scrollLeft > 10);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    checkScrollBoundary();
    track.addEventListener('scroll', checkScrollBoundary, { passive: true });
    window.addEventListener('resize', checkScrollBoundary);

    return () => {
      track.removeEventListener('scroll', checkScrollBoundary);
      window.removeEventListener('resize', checkScrollBoundary);
    };
  }, [cities]);

  const handleScroll = (direction: 'left' | 'right') => {
    const track = trackRef.current;
    if (!track) return;
    const scrollAmount = track.clientWidth;
    track.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section
      className="bg-[#f8f9fa] py-12 sm:py-16"
      aria-labelledby="city-explorer-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Centered Text and Right-Aligned Arrows */}
        <div className="relative mb-8 flex flex-col items-center justify-center text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#029bba]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007196]">
              <Landmark className="h-3.5 w-3.5" />
              <span>Regional Discovery</span>
            </div>
            <h2 id="city-explorer-heading" className="text-3xl font-black tracking-tight text-[#004063] sm:text-4xl">
              Explore Properties by <span className="text-[#029bba]">Major Cities</span>
            </h2>
            <p className="mt-3 text-sm font-medium text-[#3c6c85] sm:text-base">
              Discover verified homes, towers, and plots across Pakistan&apos;s architectural capitals. Click any city to view active listings.
            </p>
          </div>

          {/* Navigation Arrows positioned on the far right */}
          <div className="mt-4 flex shrink-0 items-center gap-2 sm:absolute sm:bottom-0 sm:right-0 sm:mt-0">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canPrevious}
              aria-label="Previous cities"
              aria-controls="city-explorer-track"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#029bba] hover:text-[#004063] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#029bba]/40 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canNext}
              aria-label="Next cities"
              aria-controls="city-explorer-track"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#029bba] hover:text-[#004063] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#029bba]/40 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carousel Track */}
        {loading ? (
          <div className="flex gap-6 overflow-hidden">
            {Array.from({ length: 4 }).map((_, slot) => (
              <div
                key={slot}
                className="w-full shrink-0 sm:w-[calc((100%-1.5rem)/2)] xl:w-[calc((100%-4.5rem)/4)]"
              >
                <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="aspect-[16/10] w-full rounded-xl bg-slate-100" />
                  <div className="mt-4 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-slate-100" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={trackRef}
            id="city-explorer-track"
            className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory px-1 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {cities.map((city) => (
              <div
                key={city.slug}
                className="w-full shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] xl:w-[calc((100%-4.5rem)/4)]"
              >
                <CityCard city={city} isCarousel={true} />
              </div>
            ))}
          </div>
        )}

        {/* Fallback */}
        {!loading && cities.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white py-14 text-center">
            <MapPin className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <h3 className="text-base font-bold text-[#001f2b]">City directory is being prepared</h3>
            <p className="mt-1 text-sm text-slate-500">
              Browse all available listings while we finish mapping cities.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}