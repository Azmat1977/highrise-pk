import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Building2, 
  Home, 
  Sparkles, 
  ArrowRight, 
  ChevronDown, 
  Tag
} from 'lucide-react';
import { saveRecentSearch, formatPakistaniPrice } from '../utils/recentSearches.ts';

type SearchTab = 'buy' | 'rent' | 'projects';

const CITIES = [
  'All Cities',
  'Islamabad',
  'Lahore',
  'Karachi',
  'Rawalpindi',
  'Peshawar',
  'Multan',
  'Faisalabad',
];

const POPULAR_AREAS_BY_CITY: Record<string, string[]> = {
  Islamabad: ['DHA Phase 2', 'Sector F-7', 'Sector F-10', 'Sector F-11', 'Sector G-11', 'Gulberg Greens', 'Bahria Town'],
  Lahore: ['DHA Phase 6', 'DHA Phase 5', 'DHA Phase 7', 'Gulberg III', 'Model Town', 'Bahria Town', 'Johar Town'],
  Karachi: ['Clifton Block 4', 'DHA Phase 8', 'DHA Phase 6', 'DHA Phase 5', 'Bahria Town', 'Gulshan-e-Iqbal'],
  Rawalpindi: ['Bahria Town Phase 7', 'Bahria Town Phase 8', 'DHA Phase 1', 'Satellite Town'],
  'All Cities': ['DHA Phase 2', 'DHA Phase 6', 'Bahria Town', 'Sector F-11', 'Clifton Block 4', 'Gulberg III'],
};

const CATEGORIES = [
  { id: 'all', label: 'All Property Types' },
  { id: 'house', label: 'Houses & Villas' },
  { id: 'apartment', label: 'Apartments & Flats' },
  { id: 'residential-plot', label: 'Residential Plots' },
  { id: 'commercial-plot', label: 'Commercial Plots' },
  { id: 'shop-office', label: 'Offices & Shops' },
  { id: 'farmhouse', label: 'Farmhouses' },
];

const BUDGET_PRESETS = [
  { id: 'all', label: 'Any Budget' },
  { id: '10000000', label: 'Up to PKR 1 Crore' },
  { id: '25000000', label: 'Up to PKR 2.5 Crore' },
  { id: '50000000', label: 'Up to PKR 5 Crore' },
  { id: '100000000', label: 'Up to PKR 10 Crore' },
  { id: '200000000', label: 'Up to PKR 20 Crore' },
];

const RENT_BUDGET_PRESETS = [
  { id: 'all', label: 'Any Rent' },
  { id: '50000', label: 'Up to PKR 50,000 / mo' },
  { id: '100000', label: 'Up to PKR 1 Lac / mo' },
  { id: '200000', label: 'Up to PKR 2 Lac / mo' },
  { id: '350000', label: 'Up to PKR 3.5 Lac / mo' },
  { id: '500000', label: 'Up to PKR 5 Lac+ / mo' },
];

const POPULAR_SEARCH_CHIPS = [
  { city: 'Lahore', area: 'DHA Phase 6', label: 'DHA Lahore' },
  { city: 'Rawalpindi', area: 'Bahria Town Phase 7', label: 'Bahria Town' },
  { city: 'Islamabad', area: 'Sector F-11', label: 'Sector F-11' },
  { city: 'Karachi', area: 'Clifton Block 4', label: 'Clifton Karachi' },
];

export const SearchTabs: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SearchTab>('buy');

  // Form State
  const [city, setCity] = useState('All Cities');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState('all');
  const [budgetMax, setBudgetMax] = useState('all');

  // Auto-suggest state
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const areaInputRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (areaInputRef.current && !areaInputRef.current.contains(e.target as Node)) {
        setShowAreaSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableSocieties = POPULAR_AREAS_BY_CITY[city] || POPULAR_AREAS_BY_CITY['All Cities'];

  const handlePropertySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const purpose = activeTab === 'rent' ? 'rent' : 'buy';
    params.set('purpose', purpose);
    
    if (city !== 'All Cities') params.set('city', city);
    if (area.trim()) params.set('area', area.trim());
    if (category !== 'all') params.set('category', category);
    if (budgetMax !== 'all') params.set('maxPrice', budgetMax);

    const targetUrl = `/properties?${params.toString()}`;

    // Save search history
    saveRecentSearch({
      purpose,
      city,
      area: area.trim() || undefined,
      category: category !== 'all' ? category : undefined,
      categoryLabel: CATEGORIES.find(c => c.id === category)?.label,
      maxPrice: budgetMax !== 'all' ? budgetMax : undefined,
      maxPriceLabel: budgetMax !== 'all' ? `Up to ${formatPakistaniPrice(budgetMax)}` : undefined,
      url: targetUrl,
      label: '',
    });

    navigate(targetUrl);
  };

  const handleChipClick = (chip: { city: string; area: string }) => {
    setCity(chip.city);
    setArea(chip.area);
    const purpose = activeTab === 'rent' ? 'rent' : 'buy';
    navigate(`/properties?purpose=${purpose}&city=${encodeURIComponent(chip.city)}&area=${encodeURIComponent(chip.area)}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 1. TOP MINIMALIST TABS */}
      <div className="flex items-center justify-between mb-3 px-1 sm:px-2">
        {/* Simple Pill Switcher */}
        <div className="inline-flex p-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-md">
          <button
            type="button"
            onClick={() => setActiveTab('buy')}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'buy'
                ? 'bg-white text-[#004063] shadow-xs'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            }`}
          >
            Buy
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rent')}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'rent'
                ? 'bg-white text-[#004063] shadow-xs'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            }`}
          >
            Rent
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('projects');
              navigate('/projects');
            }}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-white text-[#004063] shadow-xs'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            }`}
          >
            New Projects
          </button>
        </div>

        {/* Understated Valuation Shortcut */}
        <Link
          to="/valuation"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#38aec7]" />
          <span>Free Property Valuation</span>
          <ArrowRight className="w-3 h-3 text-white/70" />
        </Link>
      </div>

      {/* 2. CLEAN MINIMALIST SEARCH BAR */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/80 p-2 sm:p-2.5 text-slate-800">
        <form onSubmit={handlePropertySearch}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-0 items-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* Field 1: City Dropdown (col 3) */}
            <div className="lg:col-span-3 px-3 py-1.5 sm:py-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#029bba]" />
                <span>City</span>
              </label>
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setArea('');
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer pr-5 truncate"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All Cities' ? 'All Cities' : c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1 pointer-events-none" />
              </div>
            </div>

            {/* Field 2: Location / Society Autocomplete (col 4) */}
            <div ref={areaInputRef} className="lg:col-span-4 px-3 py-1.5 sm:py-2 relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                Location or Society
              </label>
              <input
                type="text"
                value={area}
                onFocus={() => setShowAreaSuggestions(true)}
                onChange={(e) => {
                  setArea(e.target.value);
                  setShowAreaSuggestions(true);
                }}
                placeholder="e.g. DHA, Bahria, F-11..."
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none truncate"
              />

              {/* Suggestions Popup */}
              {showAreaSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Suggested Sectors in {city}
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {availableSocieties.map((soc) => (
                      <button
                        key={soc}
                        type="button"
                        onClick={() => {
                          setArea(soc);
                          setShowAreaSuggestions(false);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 hover:bg-[#004063] text-slate-700 hover:text-white transition-colors cursor-pointer"
                      >
                        {soc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Field 3: Property Type (col 3) */}
            <div className="lg:col-span-3 px-3 py-1.5 sm:py-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">
                <Home className="w-3 h-3 text-[#029bba]" />
                <span>Property Type</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer pr-5 truncate"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1 pointer-events-none" />
              </div>
            </div>

            {/* Field 4: Clean Search Button (col 2) */}
            <div className="lg:col-span-2 pt-2 sm:pt-0 sm:pl-2">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
                <span>Find</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. MINIMALIST HELPER CHIPS (Single clean line) */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs text-white/80">
        <span className="text-[11px] font-medium text-white/60">Popular:</span>
        {POPULAR_SEARCH_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="hover:text-white hover:underline transition-colors cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
        <span className="text-white/40">•</span>
        <Link
          to="/properties?ownerOnly=true"
          className="text-[#8fc2d0] hover:text-white font-medium flex items-center gap-1 transition-colors"
        >
          <Tag className="w-3 h-3" />
          <span>0% Broker Listings</span>
        </Link>
      </div>
    </div>
  );
};
