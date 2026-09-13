import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Search, MapPin, Building2, ChevronDown, CheckCircle,
  Home, TreePine, BedDouble, Crown, Store, Warehouse,
  Factory, FileText, Maximize, LayoutDashboard
} from 'lucide-react';

// ─── Types & Constants ────────────────────────────────────────────────────────
interface CityItem {
  name: string;
}

interface HeroSearchProps {
  cities: CityItem[];
}

const propertyCategories = [
  {
    id: 'residential',
    name: 'Residential',
    icon: <Home className="w-5 h-5" />,
    subtypes: [
      { id: 'House', name: 'House', icon: <Home className="w-4 h-4" /> },
      { id: 'Apartment', name: 'Flat / Apartment', icon: <Building2 className="w-4 h-4" /> },
      { id: 'Upper Portion', name: 'Upper Portion', icon: <ChevronDown className="w-4 h-4" /> },
      { id: 'Lower Portion', name: 'Lower Portion', icon: <ChevronDown className="w-4 h-4" /> },
      { id: 'Farm House', name: 'Farm House', icon: <TreePine className="w-4 h-4" /> },
      { id: 'Room', name: 'Room', icon: <BedDouble className="w-4 h-4" /> },
      { id: 'Penthouse', name: 'Penthouse', icon: <Crown className="w-4 h-4" /> },
      { id: 'Villa', name: 'Villa', icon: <Home className="w-4 h-4" /> },
    ],
  },
  {
    id: 'commercial',
    name: 'Commercial',
    icon: <Building2 className="w-5 h-5" />,
    subtypes: [
      { id: 'Office', name: 'Office', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'Shop', name: 'Shop', icon: <Store className="w-4 h-4" /> },
      { id: 'Warehouse', name: 'Warehouse', icon: <Warehouse className="w-4 h-4" /> },
      { id: 'Factory', name: 'Factory', icon: <Factory className="w-4 h-4" /> },
      { id: 'Building', name: 'Building', icon: <Building2 className="w-4 h-4" /> },
      { id: 'Plaza', name: 'Plaza', icon: <Building2 className="w-4 h-4" /> },
    ],
  },
  {
    id: 'plots',
    name: 'Plots',
    icon: <Maximize className="w-5 h-5" />,
    subtypes: [
      { id: 'Residential Plot', name: 'Residential Plot', icon: <Home className="w-4 h-4" /> },
      { id: 'Commercial Plot', name: 'Commercial Plot', icon: <Building2 className="w-4 h-4" /> },
      { id: 'Agricultural Land', name: 'Agricultural Land', icon: <TreePine className="w-4 h-4" /> },
      { id: 'Industrial Land', name: 'Industrial Land', icon: <Factory className="w-4 h-4" /> },
      { id: 'Plot File', name: 'Plot File', icon: <FileText className="w-4 h-4" /> },
    ],
  },
];

// ─── Inline Property Type Dropdown ────────────────────────────────────────────
function PropertyTypeDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string, category: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSelectedLabel = () => {
    if (!value) return 'Property Type';
    for (const category of propertyCategories) {
      const subtype = category.subtypes.find((s) => s.id === value);
      if (subtype) return subtype.name;
    }
    return 'Property Type';
  };

  const activeCategory = propertyCategories.find((c) => c.id === expandedCategory);

  return (
    <div className="relative z-[160]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-[150] w-full h-14 pl-12 pr-4 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm focus:border-[#029bba] focus:ring-4 focus:ring-[#029bba]/10 outline-none text-left flex items-center justify-between transition-all hover:border-[#029bba]/50"
      >
        <span className={`block truncate pr-3 ${value ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'}`}>
          {getSelectedLabel()}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[200] overflow-hidden" style={{ minWidth: '320px' }}>
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h4 className="font-semibold text-gray-900 text-sm">Select Property Type</h4>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            <div className="p-2 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-2">
                {propertyCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    className={`px-3 py-3 rounded-xl text-center flex flex-col items-center justify-center gap-2 transition-all ${
                      expandedCategory === category.id
                        ? 'bg-[#029bba]/10 text-[#029bba] border border-[#029bba]/20'
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${expandedCategory === category.id ? 'bg-[#029bba] text-white' : 'bg-white text-[#029bba] border border-slate-200'}`}>
                      {category.icon}
                    </div>
                    <span className="text-xs font-semibold leading-tight">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {activeCategory && (
              <div className="p-2">
                <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">{activeCategory.name} Types</div>
                <div className="space-y-1">
                  {activeCategory.subtypes.map((subtype) => (
                    <button
                      key={subtype.id}
                      type="button"
                      onClick={() => { onChange(subtype.id, activeCategory.id); setIsOpen(false); }}
                      className={`w-full px-4 py-2.5 rounded-xl text-left text-sm flex items-center gap-3 transition-colors ${value === subtype.id ? 'bg-[#029bba] text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className={value === subtype.id ? 'text-white' : 'text-slate-400'}>{subtype.icon}</span>
                      <span className="flex-1 truncate">{subtype.name}</span>
                      {value === subtype.id && <CheckCircle className="w-4 h-4 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
type TabId = 'full_payment' | 'rent' | 'installment' | 'projects';

export default function HeroSearch({ cities }: HeroSearchProps) {
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // States
  const [activeTab, setActiveTab] = useState<TabId>('full_payment');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyCategory, setPropertyCategory] = useState('');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  // Close dropdown outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) setIsCityDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);

    if (activeTab === 'projects') {
      // For projects, just route to /projects with search
      router.push(`/projects?${params.toString()}`);
    } else {
      // For properties
      params.append('listingType', activeTab);
      if (propertyType) params.append('propertyType', propertyType);
      if (propertyCategory) params.append('propertyCategory', propertyCategory);
      router.push(`/properties?${params.toString()}`);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'full_payment', label: 'Buy' },
    { id: 'rent', label: 'Rent' },
    { id: 'installment', label: 'Installments' },
    { id: 'projects', label: 'Projects' },
  ];

  const showPropertyType = activeTab !== 'projects';

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 md:mt-8 pb-12 md:pb-14">
      {/* Attached Tabs */}
      <div className="flex bg-white/20 backdrop-blur-md rounded-t-2xl w-fit overflow-hidden border border-white/20 border-b-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-[#001f2b] shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Search Box */}
      <form onSubmit={handleSearch} className={`bg-white p-4 md:p-5 shadow-2xl rounded-b-3xl rounded-tr-3xl border-4 border-white/50 backdrop-blur-sm relative z-50`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Input (Dynamic Span based on Tab) */}
          <div className={`${showPropertyType ? 'md:col-span-7' : 'md:col-span-10'}`} ref={searchContainerRef}>
            <div className="relative w-full">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsCityDropdownOpen(true); }}
                onFocus={() => setIsCityDropdownOpen(true)}
                placeholder={activeTab === 'projects' ? "Search for projects by name or location..." : "Search by city, location or society..."}
                className="w-full h-14 pl-12 pr-4 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:border-[#029bba] focus:ring-4 focus:ring-[#029bba]/10 outline-none transition-all hover:border-[#029bba]/50 font-medium"
                autoComplete="off"
              />
              {isCityDropdownOpen && searchQuery.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 z-[170] overflow-hidden">
                  <div className="max-h-60 overflow-y-auto p-2">
                    {cities
                      .filter((city) => city.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 10)
                      .map((city) => (
                        <button
                          key={city.name}
                          type="button"
                          onClick={() => { setSearchQuery(city.name); setIsCityDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-800">{city.name}</span>
                        </button>
                      ))}
                    {cities.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <p className="text-center text-sm text-slate-500 px-3 py-4">No locations found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Property Type Dropdown (Hidden for Projects) */}
          {showPropertyType && (
            <div className="md:col-span-3">
              <PropertyTypeDropdown
                value={propertyType}
                onChange={(type, cat) => { setPropertyType(type); setPropertyCategory(cat); }}
              />
            </div>
          )}

          {/* Search Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full h-14 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              <Search className="w-5 h-5" />
              <span>Search</span>
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}