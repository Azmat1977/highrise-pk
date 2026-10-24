import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  MapPin, 
  Building2, 
  Layers, 
  ChevronRight, 
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Compass,
  SlidersHorizontal
} from 'lucide-react';

interface CategoryGroup {
  id: string;
  name: string;
  tagline: string;
  count: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  subTabs: {
    key: 'popular' | 'type' | 'size';
    label: string;
    chips: Array<{
      title: string;
      subtitle: string;
      category?: string;
      purpose?: 'sale' | 'rent';
      minSize?: string;
      maxPrice?: string;
    }>;
  }[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'homes',
    name: 'Homes & Villas',
    tagline: 'Independent houses, designer villas & family portions',
    count: '1,420+ Listings',
    icon: Home,
    iconBg: 'bg-[#004063]/10',
    iconColor: 'text-[#004063]',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: '5 Marla', subtitle: 'Houses', category: 'house', minSize: '5-marla' },
          { title: '10 Marla', subtitle: 'Houses', category: 'house', minSize: '10-marla' },
          { title: '3 Marla', subtitle: 'Houses', category: 'house', minSize: '3-marla' },
          { title: '1 Kanal', subtitle: 'Luxury Villas', category: 'house', minSize: '1-kanal' },
          { title: 'Brand New', subtitle: 'Houses', category: 'house' },
          { title: 'Low Price', subtitle: 'All Homes', category: 'house' },
        ],
      },
      {
        key: 'type',
        label: 'Type',
        chips: [
          { title: 'Single House', subtitle: 'Complete Unit', category: 'house' },
          { title: 'Luxury Villa', subtitle: 'Gated Enclave', category: 'house' },
          { title: 'Upper Portion', subtitle: 'Rental / Sale', category: 'house' },
          { title: 'Lower Portion', subtitle: 'Independent Entry', category: 'house' },
          { title: 'Farmhouse', subtitle: 'Country Estate', category: 'farmhouse' },
          { title: 'Corner House', subtitle: 'Prime Location', category: 'house' },
        ],
      },
      {
        key: 'size',
        label: 'Area Size',
        chips: [
          { title: 'Under 5 Marla', subtitle: 'Compact Family', category: 'house', minSize: '3-marla' },
          { title: '5 to 7 Marla', subtitle: 'Standard Plot', category: 'house', minSize: '5-marla' },
          { title: '10 Marla', subtitle: 'Executive Size', category: 'house', minSize: '10-marla' },
          { title: '1 Kanal', subtitle: '4500 Sq. Ft.', category: 'house', minSize: '1-kanal' },
          { title: '2 Kanal+', subtitle: 'Mansion Scale', category: 'house', minSize: '1-kanal' },
          { title: 'Custom Land', subtitle: 'Explore Sizes', category: 'house' },
        ],
      },
    ],
  },
  {
    id: 'plots',
    name: 'Plots & Land',
    tagline: 'Residential, commercial, and installment plot files',
    count: '2,580+ Plots',
    icon: MapPin,
    iconBg: 'bg-[#029bba]/10',
    iconColor: 'text-[#007196]',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: '5 Marla', subtitle: 'Residential Plots', category: 'residential-plot', minSize: '5-marla' },
          { title: '10 Marla', subtitle: 'Residential Plots', category: 'residential-plot', minSize: '10-marla' },
          { title: '1 Kanal', subtitle: 'Prime Plots', category: 'residential-plot', minSize: '1-kanal' },
          { title: 'On Installments', subtitle: 'Residential Plots', category: 'residential-plot' },
          { title: 'With Possession', subtitle: 'Commercial Plots', category: 'commercial-plot' },
          { title: 'Balloted', subtitle: 'Sector Files', category: 'residential-plot' },
        ],
      },
      {
        key: 'type',
        label: 'Type',
        chips: [
          { title: 'Residential', subtitle: 'Township Plots', category: 'residential-plot' },
          { title: 'Commercial', subtitle: 'Main Boulevard', category: 'commercial-plot' },
          { title: 'Plot File', subtitle: 'Early Phase Booking', category: 'residential-plot' },
          { title: 'Agricultural', subtitle: 'Farm Land', category: 'farmhouse' },
          { title: 'Industrial', subtitle: 'Warehouse Land', category: 'commercial-plot' },
          { title: 'Corner & Park', subtitle: 'Facing Premium', category: 'residential-plot' },
        ],
      },
      {
        key: 'size',
        label: 'Area Size',
        chips: [
          { title: '3 Marla', subtitle: '675 Sq. Ft.', category: 'residential-plot', minSize: '3-marla' },
          { title: '5 Marla', subtitle: '1,125 Sq. Ft.', category: 'residential-plot', minSize: '5-marla' },
          { title: '7 & 8 Marla', subtitle: 'Corner Plots', category: 'residential-plot' },
          { title: '10 Marla', subtitle: '2,250 Sq. Ft.', category: 'residential-plot', minSize: '10-marla' },
          { title: '1 Kanal', subtitle: '20 Marla Land', category: 'residential-plot', minSize: '1-kanal' },
          { title: '2 to 4 Kanal', subtitle: 'Farm & Estate', category: 'farmhouse' },
        ],
      },
    ],
  },
  {
    id: 'commercial',
    name: 'Commercial & High-Rise',
    tagline: 'Offices, retail shops, food courts & shopping malls',
    count: '940+ Units',
    icon: Building2,
    iconBg: 'bg-[#004063]/10',
    iconColor: 'text-[#004063]',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: 'Small Offices', subtitle: 'Corporate Workspaces', category: 'shop-office' },
          { title: 'New Offices', subtitle: 'Business Hubs', category: 'shop-office' },
          { title: 'On Installments', subtitle: 'Retail Shops', category: 'shop-office' },
          { title: 'Food Court', subtitle: 'High Footfall Units', category: 'shop-office' },
          { title: 'Ground Floor', subtitle: 'Main Boulevard Shops', category: 'shop-office' },
          { title: 'Running Tenanted', subtitle: 'Immediate Rental ROI', category: 'shop-office' },
        ],
      },
      {
        key: 'type',
        label: 'Type',
        chips: [
          { title: 'Corporate Office', subtitle: 'Executive Suite', category: 'shop-office' },
          { title: 'Retail Shop', subtitle: 'Mall & Market', category: 'shop-office' },
          { title: 'Food Court Unit', subtitle: 'Exhaust & Gas Ready', category: 'shop-office' },
          { title: 'Event Hall', subtitle: 'Banquet & Expo', category: 'shop-office' },
          { title: 'Penthouse Office', subtitle: 'Panoramic View', category: 'shop-office' },
          { title: 'Anchor Store', subtitle: 'Large Floorplate', category: 'shop-office' },
        ],
      },
      {
        key: 'size',
        label: 'Area Size',
        chips: [
          { title: 'Under 300 Sq. Ft.', subtitle: 'Kiosk & Micro Shop', category: 'shop-office' },
          { title: '300 - 800 Sq. Ft.', subtitle: 'Standard Boutique', category: 'shop-office' },
          { title: '1,000 - 2,500 Sq. Ft.', subtitle: 'Office Floor', category: 'shop-office' },
          { title: '3,000 - 5,000 Sq. Ft.', subtitle: 'Corporate HQ', category: 'shop-office' },
          { title: 'Full Floor Plate', subtitle: '10,000+ Sq. Ft.', category: 'shop-office' },
          { title: 'Multi-Floor', subtitle: 'Standalone Building', category: 'shop-office' },
        ],
      },
    ],
  },
  {
    id: 'apartments',
    name: 'Apartments & Flats',
    tagline: 'Modern high-rise towers, lofts & luxury penthouses',
    count: '980+ Units',
    icon: Layers,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-700',
    subTabs: [
      {
        key: 'popular',
        label: 'Popular',
        chips: [
          { title: 'Studio Flat', subtitle: 'Compact Urban Living', category: 'apartment' },
          { title: '2-Bed Luxury', subtitle: 'Centaurus & Gulberg', category: 'apartment' },
          { title: '3-Bed Executive', subtitle: 'Family High-Rise', category: 'apartment' },
          { title: 'Sky Penthouse', subtitle: 'Duplex Terraces', category: 'apartment' },
          { title: 'Installments', subtitle: 'Flexible Payment Plans', category: 'apartment' },
          { title: 'Furnished', subtitle: 'Turnkey Move-In', category: 'apartment' },
        ],
      },
      {
        key: 'type',
        label: 'Type',
        chips: [
          { title: 'Luxury Flat', subtitle: 'High Ceiling Suites', category: 'apartment' },
          { title: 'Duplex Penthouse', subtitle: 'Private Elevator', category: 'apartment' },
          { title: 'Serviced Suite', subtitle: 'Hotel Management', category: 'apartment' },
          { title: 'Studio Flat', subtitle: 'Rental Investment', category: 'apartment' },
          { title: 'Terrace Loft', subtitle: 'Open Deck View', category: 'apartment' },
          { title: 'Smart Home Flat', subtitle: 'Automated Controls', category: 'apartment' },
        ],
      },
      {
        key: 'size',
        label: 'Area Size',
        chips: [
          { title: '500 - 900 Sq. Ft.', subtitle: '1-Bed & Studio', category: 'apartment' },
          { title: '1,000 - 1,500 Sq. Ft.', subtitle: '2-Bed Standard', category: 'apartment' },
          { title: '1,800 - 2,500 Sq. Ft.', subtitle: '3 & 4 Bed Luxury', category: 'apartment' },
          { title: '3,000+ Sq. Ft.', subtitle: 'Sky Villa Penthouse', category: 'apartment' },
          { title: 'Corner Unit', subtitle: 'Cross Ventilation', category: 'apartment' },
          { title: 'Margalla / Sea View', subtitle: 'Premium Facing', category: 'apartment' },
        ],
      },
    ],
  },
];

export const BrowseCategories: React.FC = () => {
  const navigate = useNavigate();
  // Keep active sub-tab for each category card
  const [activeTabs, setActiveTabs] = useState<Record<string, 'popular' | 'type' | 'size'>>({
    homes: 'popular',
    plots: 'popular',
    commercial: 'popular',
    apartments: 'popular',
  });

  const handleTabChange = (categoryId: string, tab: 'popular' | 'type' | 'size') => {
    setActiveTabs((prev) => ({ ...prev, [categoryId]: tab }));
  };

  const handleChipClick = (chip: {
    title: string;
    category?: string;
    purpose?: 'sale' | 'rent';
    minSize?: string;
    maxPrice?: string;
  }) => {
    const params = new URLSearchParams();
    if (chip.category) params.set('category', chip.category);
    if (chip.purpose) params.set('purpose', chip.purpose);
    if (chip.minSize) params.set('minSize', chip.minSize);
    if (chip.maxPrice) params.set('maxPrice', chip.maxPrice);

    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#004063]/5 text-[#004063] border border-[#004063]/10 mb-2">
            <Compass className="w-3.5 h-3.5 text-[#029bba]" />
            <span>Interactive Real Estate Directory</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Browse Properties by Category
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Select high-demand property types, popular dimensions (Marla & Kanal), and verified commercial high-rises across Pakistan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/properties')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004063] hover:text-[#029bba] transition-colors self-start sm:self-end"
        >
          <span>Explore All 5,900+ Listings</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Grid: Modern, Elegant, Simple, Clean */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {CATEGORY_GROUPS.map((group) => {
          const currentTabKey = activeTabs[group.id] || 'popular';
          const activeSubTab = group.subTabs.find((t) => t.key === currentTabKey) || group.subTabs[0];
          const IconComp = group.icon;

          return (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Card Top / Header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${group.iconBg} ${group.iconColor} flex items-center justify-center shrink-0 border border-slate-100`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-slate-900 text-base leading-tight">
                        {group.name}
                      </h3>
                      <p className="text-[11px] text-[#029bba] font-semibold mt-0.5">
                        {group.count}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-1">
                  {group.tagline}
                </p>

                {/* Sub-Tabs: Popular / Type / Area Size */}
                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">
                  {group.subTabs.map((tab) => {
                    const isActive = currentTabKey === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => handleTabChange(group.id, tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                          isActive
                            ? 'bg-[#004063] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chips Grid: 2x3 layout */}
              <div className="p-4 bg-slate-50/60 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-2">
                  {activeSubTab.chips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className="group p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-[#004063] text-left hover:shadow-xs transition-all duration-200 flex flex-col justify-center"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#004063] transition-colors line-clamp-1">
                          {chip.title}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#029bba] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                        {chip.subtitle}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Card Footer Quick Link */}
                <button
                  type="button"
                  onClick={() => {
                    const sampleCat = activeSubTab.chips[0]?.category;
                    navigate(`/properties${sampleCat ? `?category=${sampleCat}` : ''}`);
                  }}
                  className="mt-4 pt-3 border-t border-slate-200/60 w-full flex items-center justify-between text-[11px] font-semibold text-[#004063] hover:text-[#029bba] transition-colors"
                >
                  <span>View all {group.name.toLowerCase()}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
