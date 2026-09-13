import React from 'react';
import Link from 'next/link';
import { Home, Building2, Maximize, Store, ArrowRight } from 'lucide-react';

export default function ExplorePropertyTypes() {
  const types = [
    {
      id: 'House',
      name: 'Houses',
      count: 'Residential',
      icon: <Home className="w-6 h-6" />,
      color: 'from-blue-500 to-[#029bba]',
      link: '/properties?propertyType=House',
    },
    {
      id: 'Apartment',
      name: 'Flats & Apartments',
      count: 'Residential',
      icon: <Building2 className="w-6 h-6" />,
      color: 'from-[#029bba] to-[#027a94]',
      link: '/properties?propertyType=Apartment',
    },
    {
      id: 'Commercial',
      name: 'Commercial Spaces',
      count: 'Offices & Shops',
      icon: <Store className="w-6 h-6" />,
      color: 'from-[#027a94] to-[#004063]',
      link: '/properties?propertyCategory=commercial',
    },
    {
      id: 'Plot',
      name: 'Plots & Land',
      count: 'Res & Comm',
      icon: <Maximize className="w-6 h-6" />,
      color: 'from-[#004063] to-[#001f2b]',
      link: '/properties?propertyCategory=plots',
    },
  ];

  return (
    <section className="py-12 bg-white relative z-10 border-b border-gray-100">
      <div className="container mx-auto px-4">
        
        {/* Standardized Centered Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#001f2b] mb-4 tracking-tight">
            Explore by <span className="text-[#029bba]">Property Type</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Quick links to the most popular real estate categories in Pakistan.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {types.map((type) => (
            <Link key={type.id} href={type.link}>
              <div className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-[#029bba]/30 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 relative overflow-hidden flex items-center gap-4">
                {/* Subtle Background Glow on Hover */}
                <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${type.color} opacity-0 group-hover:opacity-5 rounded-full transition-opacity duration-500 blur-2xl`} />
                
                {/* Icon Container */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                  {type.icon}
                </div>
                
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm md:text-base truncate group-hover:text-[#029bba] transition-colors">
                    {type.name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {type.count}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Centered CTA Button */}
        <div className="text-center mt-10">
          <Link href="/properties">
            <button className="px-8 py-4 rounded-xl bg-white border-2 border-[#029bba] text-[#029bba] font-bold inline-flex items-center gap-2 hover:bg-[#029bba] hover:text-white transition-all shadow-sm hover:shadow-lg">
              View All Inventory <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>

      </div>
    </section>
  );
}