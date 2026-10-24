import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Filter, 
  RotateCcw, 
  Grid, 
  List, 
  Search, 
  X, 
  ChevronDown, 
  SlidersHorizontal,
  Home,
  AlertCircle,
  History,
  Sparkles
} from 'lucide-react';
import { SAMPLE_PROPERTIES } from '../data/mockData.ts';
import { Property, PropertyFilterState, PropertyPurpose } from '../types/index.ts';
import { filterProperties, sortProperties } from '../utils/filterLogic.ts';
import { PropertyCard } from '../components/PropertyCard.tsx';
import { Breadcrumbs } from '../components/Breadcrumbs.tsx';
import { 
  getRecentSearches, 
  saveRecentSearch, 
  formatPakistaniPrice, 
  RecentSearchCriteria, 
  RECENT_SEARCHES_EVENT 
} from '../utils/recentSearches.ts';

const CATEGORY_LABELS: Record<string, string> = {
  house: 'Houses & Villas',
  apartment: 'Apartments & Flats',
  'residential-plot': 'Residential Plots',
  'commercial-plot': 'Commercial Plots',
  'shop-office': 'Shops & Offices',
  farmhouse: 'Farmhouses',
  'food-court': 'Food Court Outlets',
  hall: 'Banquet & Event Halls',
};

export const PropertiesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query State sync
  const initialPurpose = (searchParams.get('purpose') as PropertyPurpose) || 'buy';
  const initialCity = searchParams.get('city') || 'All Cities';
  const initialArea = searchParams.get('area') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialMinPrice = searchParams.get('minPrice') || '';
  const initialMaxPrice = searchParams.get('maxPrice') || '';
  const initialMinSize = searchParams.get('minSize') || '';
  const initialMaxSize = searchParams.get('maxSize') || '';
  const initialBedrooms = searchParams.get('bedrooms') || 'all';
  const initialSortBy = (searchParams.get('sortBy') as PropertyFilterState['sortBy']) || 'relevance';
  const initialOwnerOnly = searchParams.get('ownerOnly') === 'true';

  const [purpose, setPurpose] = useState<PropertyPurpose>(initialPurpose);
  const [city, setCity] = useState(initialCity);
  const [area, setArea] = useState(initialArea);
  const [category, setCategory] = useState(initialCategory);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [minSize, setMinSize] = useState(initialMinSize);
  const [maxSize, setMaxSize] = useState(initialMaxSize);
  const [bedrooms, setBedrooms] = useState(initialBedrooms);
  const [sortBy, setSortBy] = useState<PropertyFilterState['sortBy']>(initialSortBy);
  const [ownerOnly, setOwnerOnly] = useState<boolean>(initialOwnerOnly);

  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Keep state synced when searchParams change externally
  useEffect(() => {
    const p = searchParams.get('purpose') as PropertyPurpose;
    if (p && (p === 'buy' || p === 'rent')) setPurpose(p);
    const c = searchParams.get('city');
    if (c) setCity(c);
    const a = searchParams.get('area');
    if (a !== null) setArea(a);
    const cat = searchParams.get('category');
    if (cat) setCategory(cat);
    const oo = searchParams.get('ownerOnly');
    setOwnerOnly(oo === 'true');
  }, [searchParams]);

  const [recentSearches, setRecentSearches] = useState<RecentSearchCriteria[]>([]);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
    const handleUpdate = () => setRecentSearches(getRecentSearches());
    window.addEventListener(RECENT_SEARCHES_EVENT, handleUpdate);
    return () => window.removeEventListener(RECENT_SEARCHES_EVENT, handleUpdate);
  }, []);

  // Sync state back to URL
  const updateUrlParams = (newFilters: Partial<PropertyFilterState>) => {
    const params = new URLSearchParams(searchParams);
    if (newFilters.purpose) params.set('purpose', newFilters.purpose);
    if (newFilters.city) {
      if (newFilters.city === 'All Cities') params.delete('city');
      else params.set('city', newFilters.city);
    }
    if (newFilters.area !== undefined) {
      if (!newFilters.area) params.delete('area');
      else params.set('area', newFilters.area);
    }
    if (newFilters.category !== undefined) {
      if (newFilters.category === 'all') params.delete('category');
      else params.set('category', newFilters.category);
    }
    if (newFilters.maxPrice !== undefined) {
      if (!newFilters.maxPrice || newFilters.maxPrice === 'all') params.delete('maxPrice');
      else params.set('maxPrice', newFilters.maxPrice);
    }
    if (newFilters.bedrooms !== undefined) {
      if (newFilters.bedrooms === 'all') params.delete('bedrooms');
      else params.set('bedrooms', newFilters.bedrooms);
    }
    if (newFilters.ownerOnly !== undefined) {
      if (!newFilters.ownerOnly) params.delete('ownerOnly');
      else params.set('ownerOnly', 'true');
    }
    if (newFilters.sortBy) params.set('sortBy', newFilters.sortBy);

    setSearchParams(params);
    setPage(1);

    // Save to Recent Searches if active search criteria exist
    const effPurpose = newFilters.purpose || purpose;
    const effCity = newFilters.city !== undefined ? newFilters.city : city;
    const effArea = newFilters.area !== undefined ? newFilters.area : area;
    const effCat = newFilters.category !== undefined ? newFilters.category : category;
    const effMax = newFilters.maxPrice !== undefined ? newFilters.maxPrice : maxPrice;
    const effBeds = newFilters.bedrooms !== undefined ? newFilters.bedrooms : bedrooms;

    if (effCity !== 'All Cities' || effArea.trim() || effCat !== 'all' || (effMax && effMax !== 'all')) {
      saveRecentSearch({
        purpose: effPurpose,
        city: effCity,
        area: effArea.trim() || undefined,
        category: effCat !== 'all' ? effCat : undefined,
        categoryLabel: effCat !== 'all' ? CATEGORY_LABELS[effCat] : undefined,
        maxPrice: effMax && effMax !== 'all' ? effMax : undefined,
        maxPriceLabel: effMax && effMax !== 'all' ? `Up to ${formatPakistaniPrice(effMax)}` : undefined,
        bedrooms: effBeds !== 'all' ? effBeds : undefined,
        url: `/properties?${params.toString()}`,
        label: '',
      });
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleReset = () => {
    setPurpose('buy');
    setCity('All Cities');
    setArea('');
    setCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setMinSize('');
    setMaxSize('');
    setBedrooms('all');
    setSortBy('relevance');
    setOwnerOnly(false);
    setSearchParams(new URLSearchParams({ purpose: 'buy' }));
    setPage(1);
  };

  // Compute filtered & sorted properties
  const filteredList = useMemo(() => {
    const filtered = filterProperties(SAMPLE_PROPERTIES, {
      purpose,
      city,
      area,
      category,
      minPrice,
      maxPrice,
      minSize,
      maxSize,
      bedrooms,
      ownerOnly,
    });
    return sortProperties(filtered, sortBy);
  }, [purpose, city, area, category, minPrice, maxPrice, minSize, maxSize, bedrooms, sortBy, ownerOnly]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = filteredList.slice(0, page * pageSize);

  // Active filter count
  const activeFilterCount = [
    city !== 'All Cities',
    area !== '',
    category !== 'all',
    minPrice !== '',
    maxPrice !== '',
    minSize !== '',
    maxSize !== '',
    bedrooms !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Properties', path: '/properties' },
          { label: purpose === 'buy' ? 'Properties for Sale' : 'Properties for Rent' },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Explore Properties in Pakistan
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Browse verified homes, luxury apartments, and plots with transparent title and size information.
          </p>
        </div>

        {/* Buy / Rent / Direct Owner Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex p-1 rounded-xl bg-slate-200/80" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={purpose === 'buy'}
              onClick={() => {
                setPurpose('buy');
                updateUrlParams({ purpose: 'buy' });
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                purpose === 'buy'
                  ? 'bg-[#004063] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Buy Properties
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={purpose === 'rent'}
              onClick={() => {
                setPurpose('rent');
                updateUrlParams({ purpose: 'rent' });
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                purpose === 'rent'
                  ? 'bg-[#029bba] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Rent Properties
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextVal = !ownerOnly;
              setOwnerOnly(nextVal);
              updateUrlParams({ ownerOnly: nextVal });
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              ownerOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span>Direct Owner (0% Fee)</span>
            {ownerOnly && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </button>
        </div>
      </div>

      {/* QUICK REVISIT RECENT SEARCHES RIBBON */}
      {recentSearches.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 text-xs scrollbar-none">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold shrink-0">
            <History className="w-3.5 h-3.5 text-[#029bba]" />
            <span className="text-[11px] uppercase tracking-wider">Recent Searches:</span>
          </div>
          <div className="flex items-center gap-2 flex-nowrap">
            {recentSearches.slice(0, 5).map((rs) => (
              <a
                key={rs.id}
                href={rs.url}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-[#004063] hover:text-white text-slate-700 transition-colors text-xs font-semibold shrink-0 border border-slate-200/80 shadow-2xs group"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${rs.purpose === 'rent' ? 'bg-[#029bba]' : 'bg-[#004063] group-hover:bg-[#38aec7]'}`} />
                <span className="truncate max-w-[220px]">{rs.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* FILTER SEARCH PANEL */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* City */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              City
            </label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                updateUrlParams({ city: e.target.value });
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
            >
              <option value="All Cities">All Pakistan</option>
              <option value="Islamabad">Islamabad</option>
              <option value="Rawalpindi">Rawalpindi</option>
              <option value="Lahore">Lahore</option>
              <option value="Karachi">Karachi</option>
              <option value="Peshawar">Peshawar</option>
              <option value="Faisalabad">Faisalabad</option>
              <option value="Multan">Multan</option>
            </select>
          </div>

          {/* Area / Society search */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Area or Society
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  updateUrlParams({ area: e.target.value });
                }}
                placeholder="e.g. DHA, Gulberg, Clifton"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Property Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                updateUrlParams({ category: e.target.value });
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
            >
              <option value="all">All Categories</option>
              <option value="house">Houses & Villas</option>
              <option value="apartment">Apartments & Flats</option>
              <option value="residential-plot">Residential Plots</option>
              <option value="commercial-plot">Commercial Plots</option>
              <option value="shop-office">Shops & Offices</option>
              <option value="farmhouse">Farmhouses</option>
              <option value="food-court">Food Court Outlets</option>
              <option value="hall">Banquet & Event Halls</option>
            </select>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Min Bedrooms
            </label>
            <select
              value={bedrooms}
              onChange={(e) => {
                setBedrooms(e.target.value);
                updateUrlParams({ bedrooms: e.target.value });
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
            >
              <option value="all">Any Bedrooms</option>
              <option value="1">1+ Bedroom</option>
              <option value="2">2+ Bedrooms</option>
              <option value="3">3+ Bedrooms</option>
              <option value="4">4+ Bedrooms</option>
              <option value="5">5+ Bedrooms</option>
            </select>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvanced && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Min Price (PKR)
              </label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="e.g. 5000000"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Max Price (PKR)
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 50000000"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Min Size
              </label>
              <input
                type="number"
                value={minSize}
                onChange={(e) => setMinSize(e.target.value)}
                placeholder="Min unit number"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Max Size
              </label>
              <input
                type="number"
                value={maxSize}
                onChange={(e) => setMaxSize(e.target.value)}
                placeholder="Max unit number"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Filters Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#007196] hover:bg-slate-100 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Additional Filters' : 'More Filters (Price & Size)'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}
          </div>

          {/* Active Filter Chips */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {city !== 'All Cities' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#029bba]/10 text-[#007196] text-[11px] font-medium">
                {city}
                <button type="button" onClick={() => { setCity('All Cities'); updateUrlParams({ city: 'All Cities' }); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {category !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#004063]/10 text-[#004063] text-[11px] font-medium">
                {category}
                <button type="button" onClick={() => { setCategory('all'); updateUrlParams({ category: 'all' }); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {bedrooms !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                {bedrooms}+ Beds
                <button type="button" onClick={() => { setBedrooms('all'); updateUrlParams({ bedrooms: 'all' }); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RESULTS HEADER & SORTING */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="text-xs text-slate-600">
          Showing <strong className="text-slate-900">{Math.min(paginatedList.length, filteredList.length)}</strong> of{' '}
          <strong className="text-slate-900">{filteredList.length}</strong> matching sample properties
        </div>

        <div className="flex items-center gap-3">
          {/* Sorting */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                const val = e.target.value as PropertyFilterState['sortBy'];
                setSortBy(val);
                updateUrlParams({ sortBy: val });
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white"
            >
              <option value="relevance">Most Relevant</option>
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {/* Grid / List toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white">
            <button
              type="button"
              onClick={() => setLayout('grid')}
              aria-label="Grid layout"
              className={`p-1.5 rounded-md transition-colors ${
                layout === 'grid' ? 'bg-[#004063] text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayout('list')}
              aria-label="List layout"
              className={`p-1.5 rounded-md transition-colors ${
                layout === 'list' ? 'bg-[#004063] text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS CARDS OR EMPTY STATE */}
      {filteredList.length > 0 ? (
        <div
          className={`grid gap-6 ${
            layout === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          }`}
        >
          {paginatedList.map((prop) => (
            <PropertyCard
              key={prop.id}
              property={prop}
              layout={layout}
              isFavorite={favorites.includes(prop.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-heading font-bold text-slate-900 text-xl">
            No Properties Match Your Search
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            We couldn't find any listings matching your active filters. Try broadening your location, removing price constraints, or switching purpose.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2.5 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Load More / Pagination */}
      {paginatedList.length < filteredList.length && (
        <div className="pt-6 text-center">
          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            className="px-8 py-3 rounded-xl bg-white border border-slate-300 hover:border-[#029bba] text-[#004063] hover:text-[#029bba] text-xs font-semibold shadow-xs transition-all"
          >
            Load More Properties ({filteredList.length - paginatedList.length} Remaining)
          </button>
        </div>
      )}
    </div>
  );
};
