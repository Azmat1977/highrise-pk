import React, { useState } from 'react';
import Link from 'next/link';
import { Home, MapPin, Building2, Layers, ArrowUpRight, ChevronRight, Compass, SlidersHorizontal } from 'lucide-react';

type SubTabKey = 'popular' | 'types' | 'more';

interface CategoryChip {
  title: string;
  subtitle: string;
  query: Record<string, string>;
}

interface CategoryGroup {
  id: string;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  browseCategory: string;
  subTabs: Array<{ key: SubTabKey; label: string; chips: CategoryChip[] }>;
}

const GROUPS: CategoryGroup[] = [
  {
    id: 'homes',
    name: 'Homes & Villas',
    tagline: 'Independent houses, villas and family portions',
    icon: Home,
    iconBg: 'bg-[#004063]/10',
    iconColor: 'text-[#004063]',
    browseCategory: 'residential',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: 'Houses', subtitle: 'All residential homes', query: { propertyType: 'House' } },
          { title: 'Villas', subtitle: 'Gated luxury homes', query: { propertyType: 'Villa' } },
          { title: 'Upper Portion', subtitle: 'Independent upper floors', query: { propertyType: 'Upper Portion' } },
          { title: 'Lower Portion', subtitle: 'Ground floor units', query: { propertyType: 'Lower Portion' } },
          { title: 'Farm House', subtitle: 'Country estates', query: { propertyType: 'Farm House' } },
          { title: 'Penthouse', subtitle: 'Top-floor living', query: { propertyType: 'Penthouse' } },
        ],
      },
      {
        key: 'types',
        label: 'Type',
        chips: [
          { title: 'House', subtitle: 'Standalone unit', query: { propertyType: 'House' } },
          { title: 'Room', subtitle: 'Single room listings', query: { propertyType: 'Room' } },
          { title: 'Villa', subtitle: 'Luxury detached', query: { propertyType: 'Villa' } },
          { title: 'Farm House', subtitle: 'Land + built area', query: { propertyType: 'Farm House' } },
          { title: 'Upper Portion', subtitle: 'Rental or sale', query: { propertyType: 'Upper Portion' } },
          { title: 'Lower Portion', subtitle: 'Independent entry', query: { propertyType: 'Lower Portion' } },
        ],
      },
      {
        key: 'more',
        label: 'Bedrooms',
        chips: [
          { title: '1 Bed', subtitle: 'Compact homes', query: { propertyType: 'House', bedrooms: '1' } },
          { title: '2 Beds', subtitle: 'Small families', query: { propertyType: 'House', bedrooms: '2' } },
          { title: '3 Beds', subtitle: 'Standard family home', query: { propertyType: 'House', bedrooms: '3' } },
          { title: '4 Beds', subtitle: 'Executive size', query: { propertyType: 'House', bedrooms: '4' } },
          { title: '5 Beds', subtitle: 'Large residences', query: { propertyType: 'House', bedrooms: '5' } },
          { title: 'For Rent', subtitle: 'Monthly rentals', query: { propertyType: 'House', listingType: 'rent' } },
        ],
      },
    ],
  },
  {
    id: 'plots',
    name: 'Plots & Land',
    tagline: 'Residential, commercial and investment plots',
    icon: MapPin,
    iconBg: 'bg-[#029bba]/10',
    iconColor: 'text-[#007196]',
    browseCategory: 'plots',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: 'Residential Plots', subtitle: 'Housing society plots', query: { propertyType: 'Residential Plot' } },
          { title: 'Commercial Plots', subtitle: 'Main boulevard land', query: { propertyType: 'Commercial Plot' } },
          { title: 'Plot Files', subtitle: 'Early-phase bookings', query: { propertyType: 'Plot File' } },
          { title: 'Agricultural Land', subtitle: 'Farm and rural land', query: { propertyType: 'Agricultural Land' } },
          { title: 'Industrial Land', subtitle: 'Warehouse and factory land', query: { propertyType: 'Industrial Land' } },
          { title: 'On Installments', subtitle: 'Payment plan plots', query: { propertyType: 'Residential Plot', listingType: 'installment' } },
        ],
      },
      {
        key: 'types',
        label: 'Type',
        chips: [
          { title: 'Residential Plot', subtitle: 'Township plots', query: { propertyType: 'Residential Plot' } },
          { title: 'Commercial Plot', subtitle: 'Retail frontage', query: { propertyType: 'Commercial Plot' } },
          { title: 'Plot File', subtitle: 'Pre-possession file', query: { propertyType: 'Plot File' } },
          { title: 'Agricultural Land', subtitle: 'Farm land', query: { propertyType: 'Agricultural Land' } },
          { title: 'Industrial Land', subtitle: 'Industrial estate', query: { propertyType: 'Industrial Land' } },
          { title: 'All Plots', subtitle: 'Browse every plot type', query: { propertyCategory: 'plots' } },
        ],
      },
      {
        key: 'more',
        label: 'Budget',
        chips: [
          { title: 'Under 50 Lac', subtitle: 'Entry budget', query: { propertyCategory: 'plots', maxPrice: '5000000' } },
          { title: '50 Lac - 1 Crore', subtitle: 'Mid budget', query: { propertyCategory: 'plots', minPrice: '5000000', maxPrice: '10000000' } },
          { title: '1 - 3 Crore', subtitle: 'Prime plots', query: { propertyCategory: 'plots', minPrice: '10000000', maxPrice: '30000000' } },
          { title: '3 - 5 Crore', subtitle: 'Premium land', query: { propertyCategory: 'plots', minPrice: '30000000', maxPrice: '50000000' } },
          { title: '5 - 10 Crore', subtitle: 'Investor grade', query: { propertyCategory: 'plots', minPrice: '50000000', maxPrice: '100000000' } },
          { title: '10 Crore+', subtitle: 'Large land parcels', query: { propertyCategory: 'plots', minPrice: '100000000' } },
        ],
      },
    ],
  },
  {
    id: 'commercial',
    name: 'Commercial & High-Rise',
    tagline: 'Offices, retail shops, warehouses and plazas',
    icon: Building2,
    iconBg: 'bg-[#004063]/10',
    iconColor: 'text-[#004063]',
    browseCategory: 'commercial',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: 'Shops', subtitle: 'Retail units', query: { propertyType: 'Shop' } },
          { title: 'Offices', subtitle: 'Corporate workspaces', query: { propertyType: 'Office' } },
          { title: 'Warehouses', subtitle: 'Storage and logistics', query: { propertyType: 'Warehouse' } },
          { title: 'Factories', subtitle: 'Industrial units', query: { propertyType: 'Factory' } },
          { title: 'Buildings', subtitle: 'Full buildings', query: { propertyType: 'Building' } },
          { title: 'Plazas', subtitle: 'Mixed commercial plazas', query: { propertyType: 'Plaza' } },
        ],
      },
      {
        key: 'types',
        label: 'Type',
        chips: [
          { title: 'Shop', subtitle: 'Mall and market unit', query: { propertyType: 'Shop' } },
          { title: 'Office', subtitle: 'Single office or floor', query: { propertyType: 'Office' } },
          { title: 'Warehouse', subtitle: 'Storage facility', query: { propertyType: 'Warehouse' } },
          { title: 'Factory', subtitle: 'Manufacturing unit', query: { propertyType: 'Factory' } },
          { title: 'Building', subtitle: 'Standalone building', query: { propertyType: 'Building' } },
          { title: 'Plaza', subtitle: 'Multi-floor commercial', query: { propertyType: 'Plaza' } },
        ],
      },
      {
        key: 'more',
        label: 'Budget',
        chips: [
          { title: 'Under 50 Lac', subtitle: 'Compact units', query: { propertyCategory: 'commercial', maxPrice: '5000000' } },
          { title: '50 Lac - 1 Crore', subtitle: 'Small offices', query: { propertyCategory: 'commercial', minPrice: '5000000', maxPrice: '10000000' } },
          { title: '1 - 3 Crore', subtitle: 'Retail / office', query: { propertyCategory: 'commercial', minPrice: '10000000', maxPrice: '30000000' } },
          { title: '3 - 5 Crore', subtitle: 'Prime commercial', query: { propertyCategory: 'commercial', minPrice: '30000000', maxPrice: '50000000' } },
          { title: '5 - 10 Crore', subtitle: 'Large floorplates', query: { propertyCategory: 'commercial', minPrice: '50000000', maxPrice: '100000000' } },
          { title: '10 Crore+', subtitle: 'Buildings and plazas', query: { propertyCategory: 'commercial', minPrice: '100000000' } },
        ],
      },
    ],
  },
  {
    id: 'apartments',
    name: 'Apartments & Flats',
    tagline: 'High-rise towers, flats and penthouses',
    icon: Layers,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-700',
    browseCategory: 'residential',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: 'Apartments', subtitle: 'All flats and apartments', query: { propertyType: 'Apartment' } },
          { title: 'Penthouse', subtitle: 'Top-floor units', query: { propertyType: 'Penthouse' } },
          { title: '2 Bed Flats', subtitle: 'Family apartments', query: { propertyType: 'Apartment', bedrooms: '2' } },
          { title: '3 Bed Flats', subtitle: 'Executive apartments', query: { propertyType: 'Apartment', bedrooms: '3' } },
          { title: 'On Installments', subtitle: 'Payment plan units', query: { propertyType: 'Apartment', listingType: 'installment' } },
          { title: 'For Rent', subtitle: 'Monthly rentals', query: { propertyType: 'Apartment', listingType: 'rent' } },
        ],
      },
      {
        key: 'types',
        label: 'Type',
        chips: [
          { title: 'Apartment', subtitle: 'Standard flat', query: { propertyType: 'Apartment' } },
          { title: 'Penthouse', subtitle: 'Top floor / duplex', query: { propertyType: 'Penthouse' } },
          { title: 'Villa', subtitle: 'Low-rise gated home', query: { propertyType: 'Villa' } },
          { title: 'Upper Portion', subtitle: 'Independent floor', query: { propertyType: 'Upper Portion' } },
          { title: 'Room', subtitle: 'Single room', query: { propertyType: 'Room' } },
          { title: 'All Residential', subtitle: 'Every home type', query: { propertyCategory: 'residential' } },
        ],
      },
      {
        key: 'more',
        label: 'Bedrooms',
        chips: [
          { title: '1 Bed', subtitle: 'Compact flat', query: { propertyType: 'Apartment', bedrooms: '1' } },
          { title: '2 Beds', subtitle: 'Standard family flat', query: { propertyType: 'Apartment', bedrooms: '2' } },
          { title: '3 Beds', subtitle: 'Executive flat', query: { propertyType: 'Apartment', bedrooms: '3' } },
          { title: '4 Beds', subtitle: 'Large apartment', query: { propertyType: 'Apartment', bedrooms: '4' } },
          { title: '5 Beds', subtitle: 'Sky villa scale', query: { propertyType: 'Apartment', bedrooms: '5' } },
          { title: 'All Apartments', subtitle: 'No bedroom filter', query: { propertyType: 'Apartment' } },
        ],
      },
    ],
  },
];

function toHref(query: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/properties?${qs}` : '/properties';
}

export default function BrowseCategories() {
  const [activeTabs, setActiveTabs] = useState<Record<string, SubTabKey>>({
    homes: 'popular',
    plots: 'popular',
    commercial: 'popular',
    apartments: 'popular',
  });

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#004063]/10 bg-[#004063]/5 px-3 py-1 text-xs font-semibold text-[#004063]">
            <Compass className="h-3.5 w-3.5 text-[#029bba]" />
            <span>Interactive Real Estate Directory</span>
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#001f2b] sm:text-3xl">
            Browse Properties by <span className="text-[#029bba]">Category</span>
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Jump straight to the property types and budgets buyers search for most across Pakistan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((group) => {
            const currentKey = activeTabs[group.id] || 'popular';
            const activeSubTab = group.subTabs.find((tab) => tab.key === currentKey) ?? group.subTabs[0];
            const Icon = group.icon;

            return (
              <div
                key={group.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
              >
                <div className="border-b border-slate-100 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 ${group.iconBg} ${group.iconColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold leading-tight text-slate-900">{group.name}</h3>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#029bba]">
                        Verified links only
                      </p>
                    </div>
                  </div>

                  <p className="line-clamp-1 text-xs text-slate-500">{group.tagline}</p>

                  <div
                    role="tablist"
                    aria-label={`${group.name} filters`}
                    className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3"
                  >
                    {group.subTabs.map((tab) => {
                      const isActive = currentKey === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setActiveTabs((prev) => ({ ...prev, [group.id]: tab.key }))}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-[#004063] text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between bg-slate-50/60 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {activeSubTab.chips.map((chip) => (
                      <Link
                        key={`${chip.title}-${chip.subtitle}`}
                        href={toHref(chip.query)}
                        className="group flex flex-col justify-center rounded-xl border border-slate-200/80 bg-white p-2.5 text-left transition-all duration-200 hover:border-[#004063] hover:shadow-sm"
                      >
                        <span className="flex items-center justify-between gap-1">
                          <span className="line-clamp-1 text-xs font-bold text-slate-900 transition-colors group-hover:text-[#004063]">
                            {chip.title}
                          </span>
                          <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                        <span className="mt-0.5 line-clamp-1 text-[10px] font-medium text-slate-500">
                          {chip.subtitle}
                        </span>
                      </Link>
                    ))}
                  </div>

                  <Link
                    href={`/properties?propertyCategory=${group.browseCategory}`}
                    className="mt-4 flex w-full items-center justify-between border-t border-slate-200/60 pt-3 text-[11px] font-semibold text-[#004063] transition-colors hover:text-[#029bba]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3 w-3" />
                      View all {group.name.toLowerCase()}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
