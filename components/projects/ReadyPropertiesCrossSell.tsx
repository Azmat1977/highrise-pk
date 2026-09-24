/**
 * components/projects/ReadyPropertiesCrossSell.tsx
 *
 * Exit-intent cross-sell section for resale properties.
 * Refined Enterprise Design: Primary Teal used for pricing and CTAs.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Key, ArrowRight, Building2, MapPin, Bed, Ruler, ChevronRight } from 'lucide-react';
import { ReadyPropertyItem, formatPKR } from '@/types/projects';

interface ReadyPropertiesCrossSellProps {
  properties: ReadyPropertyItem[];
  city?: string | null;
}

export function ReadyPropertiesCrossSell({ properties, city }: ReadyPropertiesCrossSellProps) {
  const cityName = city || 'Pakistan';

  // Fallback ready properties for fresh local databases
  const FALLBACK_PROPERTIES: ReadyPropertyItem[] = [
    {
      _id: 'prop-1',
      slug: 'ready-2-bed-apartment-f11-islamabad',
      title: 'Ready 2 Bed Luxury Apartment',
      price: 18500000,
      city: city || 'Islamabad',
      location: 'F-11 Markaz',
      propertyType: 'apartment',
      purpose: 'sale',
      bedrooms: 2,
      areaSize: 6,
      areaUnit: 'Marla',
      primaryImage: null,
    },
    {
      _id: 'prop-2',
      slug: 'commercial-shop-gulberg-greens-islamabad',
      title: 'Ground Floor Retail Shop',
      price: 12500000,
      city: city || 'Islamabad',
      location: 'Gulberg Greens',
      propertyType: 'shop',
      purpose: 'sale',
      bedrooms: null,
      areaSize: 3,
      areaUnit: 'Marla',
      primaryImage: null,
    },
    {
      _id: 'prop-3',
      slug: 'executive-office-space-dha-phase-2',
      title: 'Executive Corporate Office',
      price: 24000000,
      city: city || 'Islamabad',
      location: 'DHA Phase 2',
      propertyType: 'office',
      purpose: 'sale',
      bedrooms: null,
      areaSize: 8,
      areaUnit: 'Marla',
      primaryImage: null,
    },
    {
      _id: 'prop-4',
      slug: '3-bed-penthouse-bahria-town-phase-8',
      title: 'Fully Furnished 3 Bed Penthouse',
      price: 32000000,
      city: city || 'Rawalpindi',
      location: 'Bahria Town Phase 8',
      propertyType: 'penthouse',
      purpose: 'sale',
      bedrooms: 3,
      areaSize: 10,
      areaUnit: 'Marla',
      primaryImage: null,
    },
  ];

  const displayProperties = properties && properties.length > 0 ? properties : FALLBACK_PROPERTIES;

  return (
    <section className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 md:p-8 my-6">
      {/* Header Zone */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-black rounded-full mb-3 border border-[#029bba]/20">
            <Key className="w-3.5 h-3.5" />
            <span>IMMEDIATE POSSESSION</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-[#004063] tracking-tight">
            Looking for Ready-to-Move Properties in {cityName}?
          </h3>
          <p className="text-sm text-gray-500 font-semibold mt-1">
            Explore resale apartments, shops, & offices available for immediate key handover.
          </p>
        </div>

        <Link
          href={city ? `/properties?city=${encodeURIComponent(city)}` : '/properties'}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border-2 border-gray-200 text-gray-700 hover:text-[#029bba] hover:border-[#029bba]/40 text-sm font-bold transition-all shadow-sm self-start md:self-auto whitespace-nowrap"
        >
          <span>Browse All Properties</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {displayProperties.map((prop) => {
          const priceFormatted = prop.price ? `PKR ${formatPKR(prop.price)}` : 'Contact for Price';

          return (
            <div
              key={prop._id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#029bba]/20 transition-all duration-300 flex flex-col group"
            >
              {/* Image Container */}
              <Link href={`/properties/${prop.slug}`} className="relative aspect-[16/10] bg-gray-100 overflow-hidden block">
                {prop.primaryImage ? (
                  <Image
                    src={prop.primaryImage}
                    alt={prop.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#004063]/5 to-[#029bba]/5 text-gray-400">
                    <Building2 className="w-8 h-8 text-[#029bba]/30" />
                    <span className="text-[10px] font-bold mt-1 tracking-widest uppercase">No Image</span>
                  </div>
                )}

                {/* Purpose Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full bg-[#029bba] text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                    {prop.purpose === 'rent' ? 'For Rent' : 'For Sale'}
                  </span>
                </div>
              </Link>

              {/* Card Details */}
              <div className="p-4 flex flex-col flex-1">
                {/* Price (Now Prominent in Teal) */}
                <p className="text-lg font-black text-[#029bba] mb-1">
                  {priceFormatted}
                </p>

                <Link href={`/properties/${prop.slug}`}>
                  <h4 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-[#029bba] transition-colors mb-1.5">
                    {prop.title}
                  </h4>
                </Link>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate font-medium">{[prop.location, prop.city].filter(Boolean).join(', ')}</span>
                </div>

                {/* Specs (Pill Design) */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-700 font-bold mb-4 pt-3 border-t border-gray-100">
                  {prop.bedrooms !== null && (
                    <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                      <Bed className="w-3.5 h-3.5 text-[#029bba]" />
                      {prop.bedrooms} Bed
                    </span>
                  )}
                  {prop.areaSize !== null && (
                    <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                      <Ruler className="w-3.5 h-3.5 text-[#029bba]" />
                      {prop.areaSize} {prop.areaUnit || 'Marla'}
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-1">
                  <Link
                    href={`/properties/${prop.slug}`}
                    className="w-full py-2.5 rounded-xl bg-[#029bba]/10 hover:bg-[#029bba] text-[#029bba] hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200"
                  >
                    <span>View Property</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}