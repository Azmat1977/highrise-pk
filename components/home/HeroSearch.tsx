import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Search,
  MapPin,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { saveRecentSearch, type RecentSearchPurpose } from '@/utils/recentSearches';
import { POPULAR_CITIES } from '@/lib/pakistanCities';

interface CityItem {
  name: string;
}

type SearchTab = 'buy' | 'rent' | 'installment';

const PROPERTY_TYPES = [
  { value: '', label: 'All Property Types' },
  { value: 'House', label: 'House' },
  { value: 'Apartment', label: 'Apartment / Flat' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Penthouse', label: 'Penthouse' },
  { value: 'Farm House', label: 'Farm House' },
  { value: 'Upper Portion', label: 'Upper Portion' },
  { value: 'Lower Portion', label: 'Lower Portion' },
  { value: 'Residential Plot', label: 'Residential Plot' },
  { value: 'Commercial Plot', label: 'Commercial Plot' },
  { value: 'Plot File', label: 'Plot File' },
  { value: 'Shop', label: 'Shop' },
  { value: 'Office', label: 'Office' },
  { value: 'Warehouse', label: 'Warehouse' },
  { value: 'Building', label: 'Building' },
  { value: 'Plaza', label: 'Plaza' },
];

const BUDGETS: Record<SearchTab, Array<{ value: string; label: string }>> = {
  buy: [
    { value: '', label: 'Any Budget' },
    { value: '5000000', label: 'Up to 50 Lac' },
    { value: '10000000', label: 'Up to 1 Crore' },
    { value: '30000000', label: 'Up to 3 Crore' },
    { value: '50000000', label: 'Up to 5 Crore' },
    { value: '100000000', label: 'Up to 10 Crore' },
    { value: '200000000', label: 'Up to 20 Crore' },
  ],
  installment: [
    { value: '', label: 'Any Budget' },
    { value: '5000000', label: 'Up to 50 Lac' },
    { value: '10000000', label: 'Up to 1 Crore' },
    { value: '30000000', label: 'Up to 3 Crore' },
    { value: '50000000', label: 'Up to 5 Crore' },
    { value: '100000000', label: 'Up to 10 Crore' },
  ],
  rent: [
    { value: '', label: 'Any Rent' },
    { value: '50000', label: 'Up to 50,000 / mo' },
    { value: '100000', label: 'Up to 1 Lac / mo' },
    { value: '200000', label: 'Up to 2 Lac / mo' },
    { value: '350000', label: 'Up to 3.5 Lac / mo' },
    { value: '500000', label: 'Up to 5 Lac / mo' },
  ],
};

const LISTING_TYPE_BY_TAB: Record<SearchTab, string> = {
  buy: 'full_payment',
  rent: 'rent',
  installment: 'installment',
};

const TAB_LABELS: Array<{ id: SearchTab; label: string }> = [
  { id: 'buy', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'installment', label: 'Installments' },
];

// Shared field affordances — one control tier across the whole panel
const FIELD_LABEL_CLASS =
  'mb-1 flex items-center gap-1.5 text-[11px] font-medium leading-4 text-slate-500';
const FIELD_CELL_CLASS =
  'rounded-xl border border-slate-200 px-3.5 py-2 focus-within:ring-2 focus-within:ring-[#029bba]/40 focus-within:ring-offset-0 lg:rounded-none lg:border-0 lg:px-4 lg:py-2.5';
const FIELD_CONTROL_CLASS =
  'w-full appearance-none truncate bg-transparent text-sm font-medium leading-6 text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none';

function buildSearchHref(params: {
  tab: SearchTab;
  city: string;
  area: string;
  propertyType: string;
  maxPrice: string;
}): string {
  const query = new URLSearchParams();
  query.set('listingType', LISTING_TYPE_BY_TAB[params.tab]);
  if (params.city) query.set('city', params.city);
  if (params.area.trim()) query.set('search', params.area.trim());
  if (params.propertyType) query.set('propertyType', params.propertyType);
  if (params.maxPrice) query.set('maxPrice', params.maxPrice);
  return `/properties?${query.toString()}`;
}

export default function HeroSearch({ cities }: { cities: CityItem[] }) {
  const router = useRouter();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionsListNodeRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<SearchTab>('buy');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const cityOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of cities) {
      const name = (item?.name || '').trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      list.push(name);
    }
    if (list.length === 0) return POPULAR_CITIES;
    return list;
  }, [cities]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        suggestionsListNodeRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !suggestionsListNodeRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const suggestions = useMemo(() => {
    const term = area.trim().toLowerCase();
    if (!term) return cityOptions.slice(0, 8);
    return cityOptions.filter((name) => name.toLowerCase().includes(term)).slice(0, 8);
  }, [area, cityOptions]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const href = buildSearchHref({ tab: activeTab, city, area, propertyType, maxPrice });
    const budgetLabel = BUDGETS[activeTab].find((option) => option.value === maxPrice)?.label;
    const typeLabel = PROPERTY_TYPES.find((option) => option.value === propertyType)?.label;

    saveRecentSearch({
      purpose: activeTab as RecentSearchPurpose,
      city: city || 'All Cities',
      area: area.trim() || undefined,
      categoryLabel: typeLabel && propertyType ? typeLabel : undefined,
      maxPriceLabel: maxPrice && budgetLabel && maxPrice ? budgetLabel : undefined,
      url: href,
    });

    void router.push(href);
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div
          role="tablist"
          aria-label="Property search intent"
          className="inline-flex rounded-2xl border border-white/20 bg-white/15 p-1 shadow-md backdrop-blur-md"
        >
          {TAB_LABELS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMaxPrice('');
                }}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors sm:px-5 sm:text-sm ${
                  isActive
                    ? 'bg-white text-[#004063] shadow-sm'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <Link
            href="/projects"
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:px-5 sm:text-sm"
          >
            New Projects
          </Link>
        </div>

        <Link
          href="/tools/price-estimator"
          className="hidden items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:inline-flex"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#8fc2d0]" />
          <span>Free Price Estimate</span>
          <ArrowRight className="h-3 w-3 text-white/70" />
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-white/60 bg-white p-2.5 text-slate-800 shadow-2xl sm:rounded-3xl sm:p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-0 lg:divide-x lg:divide-slate-200/70">
            {/* City */}
            <div className={`${FIELD_CELL_CLASS} lg:col-span-3`}>
              <label htmlFor="hero-city" className={FIELD_LABEL_CLASS}>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#029bba]" aria-hidden="true" />
                <span>City</span>
              </label>
              <div className="relative mt-0.5">
                <select
                  id="hero-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className={`${FIELD_CONTROL_CLASS} cursor-pointer pr-6`}
                >
                  <option value="">All Cities</option>
                  {cityOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Location or Society */}
            <div
              ref={suggestionsRef}
              className={`${FIELD_CELL_CLASS} relative sm:col-span-2 lg:col-span-3`}
            >
              <label htmlFor="hero-location" className={FIELD_LABEL_CLASS}>
                <span>Location or Society</span>
              </label>
              <input
                id="hero-location"
                type="text"
                value={area}
                onChange={(event) => {
                  setArea(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setShowSuggestions(false);
                }}
                autoComplete="off"
                placeholder="e.g. DHA, Bahria, F-11"
                className={`${FIELD_CONTROL_CLASS} pr-6`}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsListNodeRef}
                  className="absolute inset-x-0 top-full z-50 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                  <span className="mb-1.5 block px-1 text-[11px] font-medium text-slate-500">
                    Popular cities
                  </span>
                  <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                    {suggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setArea(name);
                          setShowSuggestions(false);
                        }}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-[#029bba]/60 hover:bg-[#029bba]/5 hover:text-[#029bba]"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Property Type */}
            <div className={`${FIELD_CELL_CLASS} lg:col-span-2`}>
              <label htmlFor="hero-type" className={FIELD_LABEL_CLASS}>
                <span>Property Type</span>
              </label>
              <div className="relative mt-0.5">
                <select
                  id="hero-type"
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value)}
                  className={`${FIELD_CONTROL_CLASS} cursor-pointer pr-6`}
                >
                  {PROPERTY_TYPES.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Budget */}
            <div className={`${FIELD_CELL_CLASS} lg:col-span-2`}>
              <label htmlFor="hero-budget" className={FIELD_LABEL_CLASS}>
                <Wallet className="h-3.5 w-3.5 shrink-0 text-[#029bba]" aria-hidden="true" />
                <span>Budget</span>
              </label>
              <div className="relative mt-0.5">
                <select
                  id="hero-budget"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  className={`${FIELD_CONTROL_CLASS} cursor-pointer pr-6`}
                >
                  {BUDGETS[activeTab].map((option) => (
                    <option key={option.value || 'any'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-2 lg:pl-3">
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[#004063] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#029bba] focus:outline-none focus:ring-2 focus:ring-[#029bba]/50 active:scale-[0.98] lg:h-[46px]"
              >
                <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                <span>Find</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
