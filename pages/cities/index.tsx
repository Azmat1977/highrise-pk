// pages/cities/index.tsx
// Public city directory — one card per canonical Pakistani city, grouped by
// province. Listings counts come live from /api/cities (verified + approved
// properties only); before they load we show a neutral dash, never a fake zero.

import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, Building2, Globe2, MapPin } from 'lucide-react';
import {
  CITY_PROVINCES,
  CURATED_CITY_NAMES,
  PAKISTAN_CITIES_META,
  POPULAR_CITIES,
  getCityMeta,
  type CityProvince,
  type PakistaniCityMeta,
} from '@/lib/pakistanCities';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://highrise.pk';

interface CitiesDirectory {
  cities: Array<{
    name: string;
    propertyCount: number;
    province?: string;
    tagline?: string | null;
    description?: string | null;
  }>;
  success?: boolean;
}

interface CountsMap {
  [cityName: string]: number;
}

const FEATURED_ROW_CURSOR = ['', 'from-[#029bba] via-[#007196] to-[#004063]', 'from-[#004063] via-[#02394f] to-[#001f2b]', 'from-[#026b80] via-[#029bba] to-[#004063]', 'from-[#014d69] via-[#007196] to-[#001f2b]'] as const;

function formatCount(count: number): string {
  return `${count.toLocaleString()} active listing${count === 1 ? '' : 's'}`;
}

function CityLinksRow({ city }: { city: string }) {
  const encoded = encodeURIComponent(city);
  const links = [
    { label: 'Properties', href: `/properties?city=${encoded}` },
    { label: 'Projects', href: `/projects?city=${encoded}` },
    { label: 'Societies', href: `/societies?city=${encoded}` },
    { label: 'Developers', href: `/developers?city=${encoded}` },
    { label: 'Agents', href: `/agents?city=${encoded}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="rounded px-1 py-0.5 transition-colors hover:text-[#007196] hover:underline focus:outline-none focus:ring-2 focus:ring-[#029bba]/40"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function getMeta(province: CityProvince): PakistaniCityMeta[] {
  return PAKISTAN_CITIES_META.filter((meta) => meta.province === province);
}

export default function CitiesDirectoryPage() {
  const [counts, setCounts] = useState<CountsMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/cities')
      .then((res) => (res.ok ? (res.json() as Promise<CitiesDirectory>) : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.cities)) return;
        const map: CountsMap = {};
        data.cities.forEach((entry) => {
          if (entry?.name) map[entry.name] = entry.propertyCount ?? 0;
        });
        setCounts(map);
      })
      .catch(() => {
        /* Directory still renders without counts. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const provinceSections = useMemo(
    () =>
      CITY_PROVINCES.map((province) => ({ province, cities: getMeta(province) })).filter(
        (section) => section.cities.length > 0
      ),
    []
  );

  const featured = useMemo(
    () =>
      CURATED_CITY_NAMES.map((name) => getCityMeta(name)).filter(
        (meta): meta is PakistaniCityMeta => meta !== null
      ),
    []
  );

  return (
    <>
      <Head>
        <title>Property &amp; Real Estate by Pakistani City | Highrise.pk</title>
        <meta
          name="description"
          content="Browse property for sale and rent across Pakistan's major cities — Islamabad, Lahore, Karachi, Rawalpindi and more. Homes, plots, projects, societies and agents in one directory."
        />
        <link rel="canonical" href={`${APP_URL}/cities`} />
      </Head>

      <main className="min-h-screen bg-[#f8fafc] pb-20">
        {/* Hero band */}
        <section className="bg-[#001f2b]">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#8fc2d0]">
              <Globe2 className="h-3.5 w-3.5" />
              City Directory
            </p>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Explore Property Across <span className="text-[#029bba]">Pakistan&apos;s Cities</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              One card for every city we serve. Jump straight into verified homes, plots,
              new projects, societies and agents — no scattered links, no dead ends.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {POPULAR_CITIES.map((name) => (
                <Link
                  key={name}
                  href={`/properties?city=${encodeURIComponent(name)}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-[#029bba] hover:ring-[#029bba] focus:outline-none focus:ring-2 focus:ring-[#029bba]"
                >
                  <MapPin className="h-3.5 w-3.5 text-[#029bba]" />
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured cities */}
        <section className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 lg:px-8" aria-labelledby="featured-cities-heading">
          <h2
            id="featured-cities-heading"
            className="mb-6 flex items-center gap-2 font-heading text-xl font-bold text-[#001f2b]"
          >
            <Building2 className="h-5 w-5 text-[#029bba]" />
            Major Cities
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((meta, index) => (
              <Link
                key={meta.name}
                href={`/properties?city=${encodeURIComponent(meta.name)}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#029bba]/40"
              >
                <div
                  className={`relative h-28 bg-gradient-to-br ${FEATURED_ROW_CURSOR[(index % (FEATURED_ROW_CURSOR.length - 1)) + 1]}`}
                  aria-hidden="true"
                >
                  <span className="absolute bottom-3 left-4 text-sm font-bold text-white">
                    {meta.landmark?.title ?? meta.tagline}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#001f2b]">
                      <MapPin className="h-4 w-4 text-[#029bba]" />
                      {meta.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {counts ? formatCount(counts[meta.name] ?? 0) : '—'}
                    </span>
                  </div>
                  {meta.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
                      {meta.description}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#029bba] transition-colors group-hover:text-[#007196]">
                    View Properties
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* All cities by province */}
        <div className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
          {provinceSections.map((section) => (
            <section
              key={section.province}
              className="mb-10"
              aria-labelledby={`province-${section.province.replace(/\s+/g, '-')}`}
            >
              <h2
                id={`province-${section.province.replace(/\s+/g, '-')}`}
                className="mb-4 font-heading text-lg font-bold text-[#001f2b]"
              >
                {section.province}
                <span className="ml-2 text-xs font-semibold text-slate-400">
                  {section.cities.length} cit{section.cities.length === 1 ? 'y' : 'ies'}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {section.cities.map((meta) => (
                  <article
                    key={meta.name}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#029bba]/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/properties?city=${encodeURIComponent(meta.name)}`}
                        className="flex items-center gap-1.5 text-sm font-bold text-[#001f2b] transition-colors hover:text-[#007196] focus:outline-none focus:ring-2 focus:ring-[#029bba]/40"
                      >
                        <MapPin className="h-4 w-4 shrink-0 text-[#029bba]" />
                        {meta.name}
                        {meta.provinceCapital && (
                          <span className="rounded bg-[#029bba]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#007196]">
                            Capital
                          </span>
                        )}
                      </Link>
                      <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                        {counts ? formatCount(counts[meta.name] ?? 0) : '—'}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <CityLinksRow city={meta.name} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500">
            Listing counts reflect publicly visible, verified and approved listings at the
            time of your visit — the same pool shown across Highrise.pk. Where a city has
            no published listings yet, we show the real number instead of inflating it.
          </p>
        </div>
      </main>
    </>
  );
}
