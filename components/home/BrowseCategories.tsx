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

/** One icon treatment for all three groups, so the trio reads as a set. */
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
  const [activeGroup, setActiveGroup] = useState<string>(GROUPS[0].id);
  const [activeTabs, setActiveTabs] = useState<Record<string, SubTabKey>>({
    homes: 'popular',
    plots: 'popular',
    commercial: 'popular',
  });

  const group = GROUPS.find((item) => item.id === activeGroup) ?? GROUPS[0];
  const currentKey = activeTabs[group.id] || 'popular';
  const activeSubTab =
    group.subTabs.find((tab) => tab.key === currentKey) ?? group.subTabs[0];
  const tablistId = `${baseId}-${group.id}-tablist`;
  const panelId = `${baseId}-${group.id}-panel`;

  return (
    <section className="relative overflow-hidden bg-[#f4fafb] py-16 sm:py-20">
      {/* Ambient brand glows */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#029bba]/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#004063]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          className="mx-auto max-w-3xl"
          eyebrow="Interactive Real Estate Directory"
          eyebrowIcon={<Compass className="h-3.5 w-3.5 text-[#029bba]" />}
          title={
            <>
              Browse Properties by <span className="text-[#029bba]">Category</span>
            </>
          }
          subtitle="Start with what you are buying — a home, a plot, or commercial space — then narrow it down by type and budget."
        />

        {/* Command panel */}
        <div className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(0,64,99,0.35)] lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Category rail */}
          <div
            role="tablist"
            aria-label="Property categories"
            className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/70 p-3 scrollbar-hide sm:p-4 lg:flex-col lg:gap-3 lg:border-b-0 lg:border-r lg:bg-white lg:p-5"
          >
            {GROUPS.map((item) => {
              const ItemIcon = item.icon;
              const isActive = item.id === activeGroup;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={panelId}
                  onClick={() => setActiveGroup(item.id)}
                  className={`flex min-w-[190px] items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50 lg:min-w-0 ${isActive
                      ? 'bg-[#004063] text-white shadow-lg shadow-[#004063]/25'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-[#029bba]/50 hover:bg-[#029bba]/[0.04]'
                    }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-white/15 text-[#38aec7]' : ICON_TILE
                      }`}
                    aria-hidden="true"
                  >
                    <ItemIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-extrabold tracking-tight ${isActive ? 'text-white' : 'text-[#001f2b]'
                        }`}
                    >
                      {item.name}
                    </span>
                    <span
                      className={`mt-0.5 hidden text-[11.5px] leading-snug lg:line-clamp-2 ${isActive ? 'text-white/70' : 'text-slate-500'
                        }`}
                    >
                      {item.tagline}
                    </span>
                  </span>
                  {isActive && (
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#38aec7]" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div id={panelId} role="tabpanel" className="bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#029bba]">
                  {group.shortName} quick filters
                </p>
                <h3 className="mt-1 text-lg font-extrabold tracking-tight text-[#001f2b]">
                  Explore {group.name}
                </h3>
              </div>

              <div
                id={tablistId}
                role="tablist"
                aria-label={`${group.name} filters`}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1"
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
                      onClick={() =>
                        setActiveTabs((prev) => ({ ...prev, [group.id]: tab.key }))
                      }
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40 ${isActive
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

            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {activeSubTab.chips.map((chip) => (
                <Link
                  key={`${chip.title}-${chip.subtitle}`}
                  href={toHref(chip.query)}
                  className="group/chip flex min-h-[58px] items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#029bba]/60 hover:bg-white hover:shadow-md focus-visible:border-[#029bba] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-[#001f2b] transition-colors group-hover/chip:text-[#017a8a]">
                      {chip.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">
                      {chip.subtitle}
                    </span>
                  </span>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all group-hover/chip:bg-[#029bba] group-hover/chip:text-white"
                    aria-hidden="true"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>

            <Link
              href={`/properties?propertyCategory=${group.browseCategory}`}
              className="group/cta mt-6 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#004063] to-[#007196] px-5 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/60 focus-visible:ring-offset-2"
            >
              <span>Explore all {group.shortName}</span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform group-hover/cta:translate-x-1"
                aria-hidden="true"
              >
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}