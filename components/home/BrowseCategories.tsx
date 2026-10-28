import React, { useId, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  ChevronRight,
  Compass,
  Home,
  LandPlot,
} from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';

type SubTabKey = 'popular' | 'types' | 'more';

interface CategoryChip {
  title: string;
  subtitle: string;
  query: Record<string, string>;
}

interface CategoryGroup {
  id: string;
  /** Card title — kept to the three primary discovery buckets. */
  name: string;
  /** Short label used by the "Explore all …" link. */
  shortName: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  browseCategory: string;
  subTabs: Array<{ key: SubTabKey; label: string; chips: CategoryChip[] }>;
}

/** One icon treatment for all three cards, so the trio reads as a set. */
const ICON_TILE = 'bg-[#029bba]/[0.10] text-[#007196]';

// Three primary buckets, matching how buyers actually start a search.
// Everything else (apartments, portions, plot files, warehouses…) stays
// reachable through the tabs below and the full filter panel on /properties.
const GROUPS: CategoryGroup[] = [
  {
    id: 'homes',
    name: 'Homes',
    shortName: 'homes',
    tagline: 'Houses, apartments, villas and family portions across Pakistan.',
    icon: Home,
    browseCategory: 'residential',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: 'Houses', subtitle: 'All residential homes', query: { propertyType: 'House' } },
          { title: 'Apartments', subtitle: 'Flats in towers', query: { propertyType: 'Apartment' } },
          { title: 'Villas', subtitle: 'Gated luxury homes', query: { propertyType: 'Villa' } },
          { title: 'Upper Portions', subtitle: 'Independent upper floors', query: { propertyType: 'Upper Portion' } },
          { title: 'Farm Houses', subtitle: 'Country estates', query: { propertyType: 'Farm House' } },
          { title: 'Penthouses', subtitle: 'Top-floor living', query: { propertyType: 'Penthouse' } },
        ],
      },
      {
        key: 'types',
        label: 'Type',
        chips: [
          { title: 'House', subtitle: 'Standalone unit', query: { propertyType: 'House' } },
          { title: 'Apartment', subtitle: 'Standard flat', query: { propertyType: 'Apartment' } },
          { title: 'Upper Portion', subtitle: 'Rental or sale', query: { propertyType: 'Upper Portion' } },
          { title: 'Lower Portion', subtitle: 'Independent entry', query: { propertyType: 'Lower Portion' } },
          { title: 'Room', subtitle: 'Single room listings', query: { propertyType: 'Room' } },
          { title: 'Farm House', subtitle: 'Land + built area', query: { propertyType: 'Farm House' } },
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
          { title: 'Homes for Rent', subtitle: 'Monthly rentals', query: { propertyCategory: 'residential', listingType: 'rent' } },
        ],
      },
    ],
  },
  {
    id: 'plots',
    name: 'Plots',
    shortName: 'plots',
    tagline: 'Residential and commercial plots, files and land for investment.',
    icon: LandPlot,
    browseCategory: 'plots',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: 'Residential Plots', subtitle: 'Housing society plots', query: { propertyType: 'Residential Plot' } },
          { title: 'Commercial Plots', subtitle: 'Main boulevard land', query: { propertyType: 'Commercial Plot' } },
          { title: 'Plot Files', subtitle: 'Early-phase bookings', query: { propertyType: 'Plot File' } },
          { title: 'On Installments', subtitle: 'Payment plan plots', query: { propertyType: 'Residential Plot', listingType: 'installment' } },
          { title: 'Agricultural Land', subtitle: 'Farm and rural land', query: { propertyType: 'Agricultural Land' } },
          { title: 'Industrial Land', subtitle: 'Warehouse and factory land', query: { propertyType: 'Industrial Land' } },
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
    name: 'Commercial',
    shortName: 'commercial',
    tagline: 'Shops, offices, plazas and industrial units built for business.',
    icon: Building2,
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
          { title: 'On Installments', subtitle: 'Payment plan units', query: { propertyCategory: 'commercial', listingType: 'installment' } },
          { title: 'Commercial for Rent', subtitle: 'Monthly rentals', query: { propertyCategory: 'commercial', listingType: 'rent' } },
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
  const baseId = useId();
  const [activeTabs, setActiveTabs] = useState<Record<string, SubTabKey>>({
    homes: 'popular',
    plots: 'popular',
    commercial: 'popular',
  });

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          className="mb-12"
          eyebrow="Interactive Real Estate Directory"
          eyebrowIcon={<Compass className="h-3.5 w-3.5 text-[#029bba]" />}
          title={
            <>
              Browse Properties by <span className="text-[#029bba]">Category</span>
            </>
          }
          subtitle="Start with what you are buying — a home, a plot, or commercial space — then narrow it down by type and budget."
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => {
            const currentKey = activeTabs[group.id] || 'popular';
            const activeSubTab =
              group.subTabs.find((tab) => tab.key === currentKey) ?? group.subTabs[0];
            const Icon = group.icon;
            const tablistId = `${baseId}-${group.id}-tablist`;
            const panelId = `${baseId}-${group.id}-panel`;

            return (
              <div
                key={group.id}
                className="group/card flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#029bba]/40 hover:shadow-lg focus-within:border-[#029bba]/40 focus-within:ring-2 focus-within:ring-[#029bba]/20 motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ICON_TILE}`}
                      aria-hidden="true"
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-extrabold leading-tight tracking-tight text-[#001f2b]">
                        {group.name}
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                        {group.tagline}
                      </p>
                    </div>
                  </div>

                  <div
                    id={tablistId}
                    role="tablist"
                    aria-label={`${group.name} filters`}
                    className="mt-5 inline-flex w-full items-center gap-1 rounded-xl bg-slate-50 p-1"
                  >
                    {group.subTabs.map((tab) => {
                      const isActive = currentKey === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          role="tab"
                          id={`${tablistId}-${tab.key}`}
                          aria-selected={isActive}
                          aria-controls={panelId}
                          onClick={() =>
                            setActiveTabs((prev) => ({ ...prev, [group.id]: tab.key }))
                          }
                          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40 ${
                            isActive
                              ? 'bg-white text-[#004063] shadow-sm'
                              : 'text-slate-500 hover:text-[#004063]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  id={panelId}
                  role="tabpanel"
                  aria-labelledby={`${tablistId}-${activeSubTab.key}`}
                  className="flex flex-1 flex-col border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5"
                >
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    {activeSubTab.chips.map((chip) => (
                      <Link
                        key={`${chip.title}-${chip.subtitle}`}
                        href={toHref(chip.query)}
                        className="group/chip flex min-h-[62px] flex-col justify-center rounded-xl border border-slate-200/80 bg-white p-3 text-left transition-all duration-200 hover:border-[#029bba] hover:shadow-sm focus-visible:border-[#029bba] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                      >
                        <span className="flex items-start justify-between gap-1">
                          <span className="line-clamp-1 text-[12.5px] font-bold text-[#001f2b] transition-colors group-hover/chip:text-[#004063]">
                            {chip.title}
                          </span>
                          <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-300 transition-colors group-hover/chip:text-[#029bba]" />
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[10.5px] font-medium leading-snug text-slate-500">
                          {chip.subtitle}
                        </span>
                      </Link>
                    ))}
                  </div>

                  <Link
                    href={`/properties?propertyCategory=${group.browseCategory}`}
                    className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-[#004063] transition-colors hover:border-[#029bba] hover:text-[#007196] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                  >
                    <span>Explore all {group.shortName}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
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
