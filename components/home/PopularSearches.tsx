import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Building2, Flame, MapPin } from 'lucide-react';

interface PopularSearchesProps {
  cities?: string[];
}

const POPULAR_SEARCHES = [
  { label: 'Houses for sale in Lahore', href: '/properties?city=Lahore&propertyType=House' },
  { label: 'Apartments for rent in Karachi', href: '/properties?city=Karachi&propertyType=Apartment&listingType=rent' },
  { label: 'Installment plots in Islamabad', href: '/properties?city=Islamabad&propertyCategory=plots&listingType=installment' },
  { label: 'Shops for sale in Faisalabad', href: '/properties?city=Faisalabad&propertyType=Shop' },
  { label: 'Houses on installments in Rawalpindi', href: '/properties?city=Rawalpindi&propertyType=House&listingType=installment' },
  { label: 'Farms for sale in Multan', href: '/properties?city=Multan&propertyType=Farm%20House' },
  { label: 'Offices for rent in Islamabad', href: '/properties?city=Islamabad&propertyType=Office&listingType=rent' },
  { label: 'Plots for sale in Peshawar', href: '/properties?city=Peshawar&propertyCategory=plots' },
];

const PROPERTY_TYPES = [
  { label: 'Houses', href: '/properties?propertyType=House' },
  { label: 'Apartments', href: '/properties?propertyType=Apartment' },
  { label: 'Upper Portions', href: '/properties?propertyType=Upper%20Portion' },
  { label: 'Residential Plots', href: '/properties?propertyType=Residential%20Plot' },
  { label: 'Commercial Plots', href: '/properties?propertyType=Commercial%20Plot' },
  { label: 'Shops', href: '/properties?propertyType=Shop' },
  { label: 'Offices', href: '/properties?propertyType=Office' },
  { label: 'Plot Files', href: '/properties?propertyType=Plot%20File' },
];

const FALLBACK_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Gujranwala'];

export default function PopularSearches({ cities }: PopularSearchesProps) {
  const cityNames = (cities && cities.length > 0 ? cities : FALLBACK_CITIES).slice(0, 8);

  return (
    <section className="border-t border-slate-200 bg-[#f8fafc] py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#029bba]/10 px-3 py-1 text-xs font-semibold text-[#007196]">
            <Flame className="h-3.5 w-3.5 text-[#029bba]" />
            <span>Search Directory</span>
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#001f2b] sm:text-3xl">
            Popular Property Searches
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            Jump straight into the searches buyers and renters run most often on Highrise.pk.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Trending Searches
            </h3>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {POPULAR_SEARCHES.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-[#029bba]/5 hover:text-[#004063]"
                  >
                    <span className="line-clamp-1">{item.label}</span>
                    <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-[#029bba]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-[#029bba]" /> Browse by City
              </h3>
              <div className="flex flex-wrap gap-2">
                {cityNames.map((city) => (
                  <Link
                    key={city}
                    href={`/properties?city=${encodeURIComponent(city)}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-[#029bba] hover:bg-white hover:text-[#004063]"
                  >
                    {city}
                  </Link>
                ))}
                <Link
                  href="/properties"
                  className="rounded-lg border border-[#029bba]/30 bg-[#029bba]/10 px-2.5 py-1 text-xs font-semibold text-[#007196] transition-colors hover:bg-[#029bba] hover:text-white"
                >
                  All cities
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Building2 className="h-3.5 w-3.5 text-[#029bba]" /> Browse by Type
              </h3>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((type) => (
                  <Link
                    key={type.href}
                    href={type.href}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-[#029bba] hover:bg-white hover:text-[#004063]"
                  >
                    {type.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
