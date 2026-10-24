import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, Landmark, MapPin } from 'lucide-react';
import {
  CURATED_CITY_NAMES,
  PAKISTAN_CITIES_META,
  type PakistaniCityMeta,
} from '@/lib/pakistanCities';

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
  CURATED_CITY_NAMES.map((name) => [
    name,
    PAKISTAN_CITIES_META.find((meta) => meta.name === name)!,
  ])
);

const GRADIENT_TILES = [
  'bg-gradient-to-br from-[#029bba] via-[#007196] to-[#004063]',
  'bg-gradient-to-br from-[#004063] via-[#02394f] to-[#001f2b]',
  'bg-gradient-to-br from-[#026b80] via-[#029bba] to-[#004063]',
  'bg-gradient-to-br from-[#014d69] via-[#007196] to-[#001f2b]',
];

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
  const [cards, setCards] = useState(4);
  const [index, setIndex] = useState(0);

  const pickedCities = cities.filter((city) => city.name && city.isActive !== false);

  useEffect(() => {
    setCards(getViewportCards());
    const handler = () => setCards(getViewportCards());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const maxIndex = Math.max(0, pickedCities.length - cards);
  const clampedIndex = Math.min(index, maxIndex);

  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    if (!first) {
      track.style.transform = 'translateX(0)';
      return;
    }
    const computed = window.getComputedStyle(track);
    const gap = parseFloat(computed.columnGap || computed.gap || '0') || 0;
    const step = first.getBoundingClientRect().width + gap;
    track.style.transform = `translateX(${-clampedIndex * step}px)`;
  }, [clampedIndex, cards, loading, pickedCities.length]);

  const go = (direction: 'prev' | 'next') => {
    setIndex((current) => {
      const base = Math.min(current, maxIndex);
      const next = direction === 'prev' ? base - cards : base + cards;
      return Math.max(0, Math.min(maxIndex, next));
    });
  };

  const canPrev = clampedIndex > 0;
  const canNext = clampedIndex < maxIndex;

  return (
    <section
      className="bg-[#f8fafc] py-16 sm:py-20"
      aria-labelledby="cities-carousel-heading"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-5 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div className="mx-auto max-w-2xl sm:mx-0">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#029bba]/10 px-3 py-1 text-xs font-semibold text-[#007196]">
              <Landmark className="h-3.5 w-3.5 text-[#029bba]" />
              <span>City Directory</span>
            </span>
            <h2
              id="cities-carousel-heading"
              className="text-2xl font-extrabold tracking-tight text-[#001f2b] sm:text-3xl"
            >
              Explore Properties by <span className="text-[#029bba]">Major Cities</span>
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-[15px]">
              Discover verified homes, towers, and plots across Pakistan&apos;s architectural capitals.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => go('prev')}
              disabled={!canPrev}
              aria-label="Previous cities"
              aria-controls="cities-carousel-track"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition-colors hover:border-[#029bba] hover:text-[#004063] focus:outline-none focus:ring-2 focus:ring-[#029bba]/40 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:border-slate-100 disabled:hover:text-slate-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go('next')}
              disabled={!canNext}
              aria-label="Next cities"
              aria-controls="cities-carousel-track"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition-colors hover:border-[#029bba] hover:text-[#004063] focus:outline-none focus:ring-2 focus:ring-[#029bba]/40 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:border-slate-100 disabled:hover:text-slate-300"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-6">
            {Array.from({ length: 4 }).map((_, slot) => (
              <div
                key={slot}
                className="w-full sm:w-[calc((100%-1.5rem)/2)] xl:w-[calc((100%-4.5rem)/4)] shrink-0"
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
          <div className="overflow-hidden">
            <div
              ref={trackRef}
              id="cities-carousel-track"
              className="flex min-w-0 gap-6 transition-transform duration-500 ease-out motion-reduce:transition-none"
            >
              {pickedCities.map((city, slot) => {
                const count = city.propertyCount ?? 0;
                const curated = CURATED_META_BY_NAME.get(city.name);
                const kicker = (city.tagline ?? curated?.tagline ?? city.province ?? 'Pakistan') as string;
                const title = city.landmarkTitle ?? curated?.landmark?.title ?? `Properties in ${city.name}`;
                const description =
                  city.description ??
                  curated?.description ??
                  (city.province ? `Verified listings across ${city.province}.` : 'Browse verified listings.');
                const image = city.imageUrl ?? city.image;
                const gradient = GRADIENT_TILES[slot % GRADIENT_TILES.length];
                return (
                  <article
                    key={city.name}
                    className="group w-full shrink-0 sm:w-[calc((100%-1.5rem)/2)] xl:w-[calc((100%-4.5rem)/4)]"
                  >
                    <Link
                      href={`/properties?city=${encodeURIComponent(city.name)}`}
                      aria-label={`View ${city.name} properties`}
                      className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:border-[#029bba]/50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/40 motion-reduce:transition-none"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                        {isUsableImage(image) ? (
                          <Image
                            src={image}
                            alt={`${city.name} skyline`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
                          />
                        ) : (
                          <div className={`${gradient} absolute inset-0 flex flex-col items-center justify-center gap-3`} aria-hidden="true">
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                              <Landmark className="h-7 w-7 text-white/70" />
                            </span>
                            <span className="font-heading text-lg font-black uppercase tracking-[0.25em] text-white/30">
                              {city.name.slice(0, 2)}
                            </span>
                          </div>
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
