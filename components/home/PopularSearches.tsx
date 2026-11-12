import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Flame } from 'lucide-react';

// Every entry is a plain search URL — no counts, no "verified" claims, so the
// section stays honest even when a city has no live stock. The list is long on
// purpose: these are the long-tail city + type + intent queries people actually
// search, and they give the homepage a dense, crawlable internal-link block.
const POPULAR_SEARCHES = [
  { label: 'Houses for sale in Lahore', href: '/properties?city=Lahore&propertyType=House' },
  { label: 'Apartments for rent in Karachi', href: '/properties?city=Karachi&propertyType=Apartment&listingType=rent' },
  { label: 'Installment plots in Islamabad', href: '/properties?city=Islamabad&propertyCategory=plots&listingType=installment' },
  { label: 'Shops for sale in Faisalabad', href: '/properties?city=Faisalabad&propertyType=Shop' },
  { label: 'Installment houses in Rawalpindi', href: '/properties?city=Rawalpindi&propertyType=House&listingType=installment' },
  { label: 'Farm houses for sale in Multan', href: '/properties?city=Multan&propertyType=Farm%20House' },
  { label: 'Offices for rent in Islamabad', href: '/properties?city=Islamabad&propertyType=Office&listingType=rent' },
  { label: 'Plots for sale in Peshawar', href: '/properties?city=Peshawar&propertyCategory=plots' },
  { label: 'Apartments for sale in Lahore', href: '/properties?city=Lahore&propertyType=Apartment' },
  { label: 'Commercial plots in Karachi', href: '/properties?city=Karachi&propertyCategory=commercial' },
  { label: 'Houses for sale in Islamabad', href: '/properties?city=Islamabad&propertyType=House' },
  { label: 'Plot files in Rawalpindi', href: '/properties?city=Rawalpindi&propertyType=Plot%20File' },
  { label: 'Flats for rent in Lahore', href: '/properties?city=Lahore&propertyType=Apartment&listingType=rent' },
  { label: 'Upper portions for rent in Karachi', href: '/properties?city=Karachi&propertyType=Upper%20Portion&listingType=rent' },
  { label: 'Villas for sale in Islamabad', href: '/properties?city=Islamabad&propertyType=Villa' },
  { label: 'Shops for rent in Lahore', href: '/properties?city=Lahore&propertyType=Shop&listingType=rent' },
  { label: 'Residential plots in Islamabad', href: '/properties?city=Islamabad&propertyType=Residential%20Plot' },
  { label: 'Houses for rent in Rawalpindi', href: '/properties?city=Rawalpindi&propertyType=House&listingType=rent' },
  { label: 'Offices for sale in Karachi', href: '/properties?city=Karachi&propertyType=Office' },
  { label: 'Houses for sale in Quetta', href: '/properties?city=Quetta&propertyType=House' },
  { label: 'Apartments for rent in Islamabad', href: '/properties?city=Islamabad&propertyType=Apartment&listingType=rent' },
  { label: 'Penthouses for sale in Karachi', href: '/properties?city=Karachi&propertyType=Penthouse' },
  { label: 'Houses for sale in Gujranwala', href: '/properties?city=Gujranwala&propertyType=House' },
  { label: 'Installment plots in Karachi', href: '/properties?city=Karachi&propertyCategory=plots&listingType=installment' },
  { label: 'Warehouses for rent in Karachi', href: '/properties?city=Karachi&propertyType=Warehouse&listingType=rent' },
  { label: 'Houses for sale in Sialkot', href: '/properties?city=Sialkot&propertyType=House' },
  { label: 'Commercial plots in Islamabad', href: '/properties?city=Islamabad&propertyType=Commercial%20Plot' },
  { label: 'Houses for sale in Hyderabad', href: '/properties?city=Hyderabad&propertyType=House' },
];

export default function PopularSearches() {
  return (
    <section className="border-t border-slate-200 bg-[#f8fafc] py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#029bba]/20 bg-[#029bba]/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007196]">
            <Flame className="h-3.5 w-3.5 text-[#029bba]" />
            <span>Search Directory</span>
          </span>
          <h2 className="text-3xl font-black tracking-tight text-[#004063] sm:text-4xl">
            Popular <span className="text-[#029bba]">Property Searches</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            Jump straight into the searches buyers and renters run most often on Highrise.pk.
          </p>
        </div>

        {/* Trending searches — full width, four dense columns on desktop. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
            Trending Searches
          </h3>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
            {POPULAR_SEARCHES.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-1.5 rounded-lg border-b border-transparent px-2 py-[7px] text-[13px] text-slate-700 transition-colors hover:bg-[#029bba]/5 hover:text-[#004063]"
                >
                  <span className="truncate">{item.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-[#029bba]" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
