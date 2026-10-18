'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  MapPin,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { formatPriceRange } from '@/types/projects';

interface TrendingProjectItem {
  _id: string;
  slug: string;
  projectName: string;
  tagline?: string;
  city: string;
  area: string;
  projectStatus: string;
  isVerified: boolean;
  isTrustedBuilder: boolean;
  developerBadge?: string;
  badgeLabel?: string;
  minPrice?: number;
  maxPrice?: number;
  highriseScore?: number;
  primaryImage: string | null;
  developerName: string;
  trendingScore: number;
}

interface TrendingProjectsRailProps {
  city?: string;
}

function TrendingSkeleton(): React.ReactElement {
  return (
    <div role="listitem" className="w-[280px] shrink-0 snap-start sm:w-[320px]">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
        <div className="aspect-[16/10] bg-gray-200" />
        <div className="p-4 space-y-3">
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
          <div className="h-5 bg-gray-200 rounded w-1/3 mt-3" />
        </div>
      </div>
    </div>
  );
}

function TrendingCard({
  project,
  rank,
}: {
  project: TrendingProjectItem;
  rank: number;
}): React.ReactElement {
  const priceLabel = formatPriceRange(
    typeof project.minPrice === 'number' ? project.minPrice : null,
    typeof project.maxPrice === 'number' ? project.maxPrice : null,
    typeof project.minPrice !== 'number' && typeof project.maxPrice !== 'number'
  );
  const locationLabel = [project.area, project.city].filter(Boolean).join(', ');

  return (
    <div role="listitem" className="w-[280px] shrink-0 snap-start sm:w-[320px]">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#029bba]/20 transition-all duration-300 flex flex-col h-full group">
        <Link
          href={`/projects/${project.slug}`}
          className="relative aspect-[16/10] bg-gray-100 overflow-hidden block"
          aria-label={`View ${project.projectName}`}
        >
          {project.primaryImage ? (
            <Image
              src={project.primaryImage}
              alt={project.projectName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 280px, 320px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Building2 className="w-10 h-10 stroke-[1.5]" />
            </div>
          )}

          <span className="absolute top-3 left-3 z-10 inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg bg-[#004063]/90 backdrop-blur-sm text-white text-xs font-black">
            #{rank}
          </span>

          {typeof project.highriseScore === 'number' && (
            <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[#004063] text-[10px] font-black border border-gray-200">
              Score {Math.round(project.highriseScore)}
            </span>
          )}

          {project.projectStatus && (
            <span className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-bold uppercase tracking-wider">
              {project.projectStatus}
            </span>
          )}
        </Link>

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1 min-h-[18px]">
            {project.developerName && (
              <span className="text-[11px] font-bold text-gray-500 truncate">
                {project.developerName}
              </span>
            )}
            {project.badgeLabel && (
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#029bba]/10 text-[#029bba] text-[9px] font-black uppercase tracking-wide">
                {project.badgeLabel}
              </span>
            )}
          </div>

          <Link href={`/projects/${project.slug}`}>
            <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-[#029bba] transition-colors mb-1">
              {project.projectName}
            </h3>
          </Link>

          {locationLabel && (
            <p className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <MapPin className="w-3.5 h-3.5 text-[#029bba] shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </p>
          )}

          <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
            <span className="text-sm font-black text-[#004063] truncate">
              {priceLabel}
            </span>
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-[#029bba]">
              View
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrendingProjectsRail({
  city,
}: TrendingProjectsRailProps): React.ReactElement | null {
  const [projects, setProjects] = useState<TrendingProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const params = new URLSearchParams({ limit: '8' });
    if (city && city.trim().length >= 2) params.set('city', city);

    setLoading(true);
    setError(false);

    (async () => {
      try {
        const response = await fetch(
          `/api/projects/trending?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = (await response.json()) as {
          success?: boolean;
          projects?: TrendingProjectItem[];
        };

        if (!cancelled) {
          setProjects(Array.isArray(data.projects) ? data.projects : []);
        }
      } catch (err) {
        if (!cancelled && !(err instanceof DOMException)) {
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [city, reloadKey]);

  const scroll = (direction: -1 | 1) => {
    carouselRef.current?.scrollBy({
      left: direction * 340,
      behavior: 'smooth',
    });
  };

  if (!loading && !error && projects.length === 0) return null;

  const showControls = !loading && !error && projects.length > 1;

  return (
    <section aria-labelledby="trending-projects-heading" className="min-w-0 py-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba]">
            <Flame className="h-3.5 w-3.5" />
            TRENDING NOW
          </p>
          <h2
            id="trending-projects-heading"
            className="text-xl font-black leading-tight text-[#004063] md:text-2xl"
          >
            Trending Projects
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {city
              ? `What buyers in ${city} are exploring right now`
              : 'What buyers across Pakistan are exploring right now'}{' '}
            — ranked by Highrise Score, views and inquiries.
          </p>
        </div>

        {showControls && (
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Scroll trending projects left"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#029bba] transition hover:border-[#029bba] hover:bg-[#029bba]/5 focus:outline-none focus:ring-2 focus:ring-[#029bba]/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Scroll trending projects right"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#029bba] transition hover:border-[#029bba] hover:bg-[#029bba]/5 focus:outline-none focus:ring-2 focus:ring-[#029bba]/30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {error ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Unable to load trending projects right now.
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#029bba] text-white text-xs font-bold hover:bg-[#017a94] transition-colors focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      ) : (
        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label="Trending verified projects"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <TrendingSkeleton key={`trending-skeleton-${index}`} />
              ))
            : projects.map((project, index) => (
                <TrendingCard
                  key={project._id}
                  project={project}
                  rank={index + 1}
                />
              ))}
        </div>
      )}
    </section>
  );
}

export default TrendingProjectsRail;
