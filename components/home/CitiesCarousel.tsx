import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, Landmark, MapPin } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import {
  CURATED_CITY_NAMES,
  HOMEPAGE_CITY_NAMES,
  PAKISTAN_CITIES_META,
  getCityMeta,
  type PakistaniCityMeta,
} from '@/lib/pakistanCities';
import { CityLandmarkArt } from '@/components/home/CityLandmarkArt';
import { nearbyIcons, amenityIcons } from '@/lib/design-system/icons';
import CityCard from '@/components/cities/CityCard';

interface CityItem {
  name: string;
  propertyCount?: number;
  imageUrl?: string;
  image?: string;
  isActive?: boolean;
  isFeaturedOnHomepage?: boolean;
  displayOrder?: number;
  province?: string;
  tagline?: string | null;
  description?: string | null;
  landmarkTitle?: string | null;
  landmarkKicker?: string | null;
}

const CURATED_META_BY_NAME = new Map<string, PakistaniCityMeta>(
  PAKISTAN_CITIES_META.map((meta) => [meta.name, meta])
);

function isUsableImage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const clean = value.trim().toLowerCase();
  return Boolean(clean) && clean !== 'undefined' && clean !== 'null' && clean !== 'n/a';
}

function getViewportCards(): number {
  if (typeof window === 'undefined') return 4;
  if (window.innerWidth >= 1280) return 4;
  if (window.innerWidth >= 640) return 2;
  return 1;
}

export default function CitiesCarousel({ cities, loading }: { cities: CityItem[]; loading: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const pickedCities = useMemo<CityItem[]>(() => {
    const fromDb = cities.filter((city) => city.name && city.isActive !== false);
    const majorCityNames = HOMEPAGE_CITY_NAMES;

    return majorCityNames.map((name) => {
      const match = fromDb.find((city) => city.name.trim().toLowerCase() === name.toLowerCase());
      const meta = CURATED_META_BY_NAME.get(name);

      return {
        name,
        propertyCount: match?.propertyCount ?? 0,
        imageUrl: match?.imageUrl ?? match?.image ?? meta?.landmark?.image,
        province: meta?.province,
        tagline: meta?.tagline,
        description: meta?.description,
        landmarkTitle: meta?.landmark?.title,
        landmarkKicker: meta?.landmark?.kicker,
        isActive: true,
      } as CityItem;
    });
  }, [cities]);

  const checkScrollBoundary = () => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
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
  }, [pickedCities]);

  const handleScroll = (direction: 'left' | 'right') => {
    const track = trackRef.current;
    if (!track) return;
    const scrollAmount = track.clientWidth * 0.75;
    track.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section
      className="bg-[#f8fafc] py-12 sm:py-16"
      aria-labelledby="cities-carousel-heading"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#029bba]/10 px-3 py-1 text-xs font-bold text-[#029bba]">
              <Landmark className="h-3.5 w-3.5" />
              <span>Regional Discovery</span>
            </div>
            <h2 id="cities-carousel-heading" className="text-3xl font-black tracking-tight text-[#004063] sm:text-4xl">
              Explore Properties by <span className="text-[#029bba]">Major Cities</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 sm:text-base">
              Discover verified homes, towers, and plots across Pakistan&apos;s architectural capitals. Click any city to view active listings.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Previous cities"
              aria-controls="cities-carousel-track"
              className="rounded-full border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition-all hover:border-[#029bba] hover:text-[#004063] focus:outline-none focus:ring-2 focus:ring-[#029bba]/40 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              aria-label="Next cities"
              aria-controls="cities-carousel-track"
              className="rounded-full border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition-all hover:border-[#029bba] hover:text-[#004063] focus:outline-none focus:ring-2 focus:ring-[#029bba]/40 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-6 overflow-hidden">
            {Array.from({ length: 4 }).map((_, slot) => (
              <div
                key={slot}
                className="w-[280px] shrink-0 sm:w-[320px] lg:w-[340px]"
              >
                <div className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  <div className="aspect-[4/3] w-full bg-slate-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pickedCities.length > 0 ? (
          <div className="relative">
            <div
              ref={trackRef}
              id="cities-carousel-track"
              className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {pickedCities.map((city) => {
                const count = city.propertyCount ?? 0;
                const curated = CURATED_META_BY_NAME.get(city.name);
                const kicker = (city.landmarkKicker ?? city.tagline ?? curated?.tagline ?? city.province ?? 'Pakistan') as string;
                const title = city.landmarkTitle ?? curated?.landmark?.title ?? `Properties in ${city.name}`;
                const description =
                  city.description ??
                  curated?.description ??
                  (city.province ? `Verified listings across ${city.province}.` : 'Browse verified listings.');
                const image = city.imageUrl ?? city.image ?? curated?.landmark?.image;
                return (
                  <article
                    key={city.name}
                    className="group w-[280px] shrink-0 snap-start sm:w-[320px] lg:w-[340px]"
                  >
                    <Link
                      href={`/properties?city=${encodeURIComponent(city.name)}`}
                      aria-label={`View ${city.name} properties`}
                      className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:border-[#029bba]/50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/40 motion-reduce:transition-none"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                        {isUsableImage(image) ? (
                          <div className="relative h-full w-full">
                            <Image
                              src={image}
                              alt={`${title || city.name} landmark`}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                              className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
                            />
                            <div className="absolute inset-0 bg-black/40" />
                          </div>
                        ) : (
                          <CityLandmarkArt
                            city={city.name}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

                        <div className="absolute left-3 top-3">
                          <span className="rounded-md bg-[#004063]/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                            {city.name}
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8fc2d0]">
                            {kicker}
                          </p>
                          <h3 className="truncate font-heading text-lg font-bold text-white">
                            {title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="flex items-center gap-1.5 text-sm font-bold text-[#001f2b]">
                            <MapPin className="h-4 w-4 shrink-0 text-[#029bba]" />
                            <span className="truncate">{city.name}</span>
                          </h4>
                          <span
                            className={
                              count > 0
                                ? 'inline-flex shrink-0 items-center rounded-full bg-[#029bba]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#007196]'
                                : 'inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500'
                            }
                          >
                            {count > 0 ? `${count.toLocaleString()} active listing${count === 1 ? '' : 's'}` : 'Ready to explore'}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-slate-500">
                          {description}
                        </p>
                        <div className="mt-auto pt-4">
                          <div className="mb-3 h-px bg-slate-100" />
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba] transition-colors group-hover:text-[#007196]">
                            View {city.name} Properties
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white py-14 text-center">
            <MapPin className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <h3 className="text-base font-bold text-[#001f2b]">City directory is being prepared</h3>
            <p className="mt-1 text-sm text-slate-500">
              Browse all available listings while we finish mapping cities.
            </p>
            <Link
              href="/properties"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#004063] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#029bba]"
            >
              Browse Properties
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
