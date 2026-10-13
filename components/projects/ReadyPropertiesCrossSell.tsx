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
import { Key, Building2, MapPin, Bed, ChevronRight } from 'lucide-react';
import { ReadyPropertyItem, formatPKR } from '@/types/projects';

interface ReadyPropertiesCrossSellProps {
  properties: ReadyPropertyItem[];
  city?: string | null;
}

const HIGHRISE_READY_TYPES = new Set([
  'apartment',
  'apartments',
  'flat',
  'flats',
  'shop',
  'shops',
  'office',
  'offices',
  'penthouse',
  'penthouses',
  'commercial',
  'building',
  'buildings',
  'commercial_plaza',
  'unit',
  'units',
]);

function isHighriseReadyProperty(prop: ReadyPropertyItem): boolean {
  if (prop.purpose === 'rent') return false;
  const type = String(prop.propertyType || '').toLowerCase().trim();
  return HIGHRISE_READY_TYPES.has(type);
}

export function ReadyPropertiesCrossSell({ properties, city }: ReadyPropertiesCrossSellProps) {
  const cityName = city || 'Pakistan';
  const displayProperties = (properties ?? []).filter(isHighriseReadyProperty).slice(0, 4);

  if (displayProperties.length === 0) return null;

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
            Explore ready apartments, shops, offices, penthouses & commercial units for sale.
          </p>
        </div>

        <Link
          href={city
            ? `/properties?city=${encodeURIComponent(city)}&purpose=sale&type=apartment`
            : '/properties?purpose=sale&type=apartment'}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border-2 border-gray-200 text-gray-700 hover:text-[#029bba] hover:border-[#029bba]/40 text-sm font-bold transition-all shadow-sm self-start md:self-auto whitespace-nowrap"
        >
          <span>Browse Ready Units</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {displayProperties.map((prop) => {
          const priceDisplay = prop.price ? `PKR ${formatPKR(prop.price)}` : 'Contact for Price';
          const locationDisplay = [prop.location, prop.city].filter(Boolean).join(', ');
          const typeDisplay = prop.propertyType ? prop.propertyType.replace(/_/g, ' ') : 'Property';
          const areaDisplay = prop.areaSize && prop.areaUnit ? `${prop.areaSize} ${prop.areaUnit}` : null;

          return (
            <div
              key={prop._id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#029bba]/20 transition-all duration-300 flex flex-col group"
            >
              {/* Image Container */}
              <Link href={`/property/${prop.slug}`} className="relative aspect-[16/10] bg-gray-100 overflow-hidden block">
                {prop.primaryImage ? (
                  <Image
                    src={prop.primaryImage}
                    alt={prop.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Building2 className="w-10 h-10 stroke-[1.5]" />
                  </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                  <span className="px-2.5 py-1 rounded-full bg-[#004063]/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    {typeDisplay}
                  </span>
                </div>
              </Link>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col">
                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
                  <span className="truncate">{locationDisplay}</span>
                </div>

                {/* Title */}
                <Link href={`/property/${prop.slug}`}>
                  <h4 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-[#029bba] transition-colors mb-1.5">
                    {prop.title}
                  </h4>
                </Link>

                {/* Price */}
                <div className="text-base font-black text-[#004063] mb-3">
                  {priceDisplay}
                </div>

                {/* Specs Pill Grid */}
                {(prop.bedrooms !== null || areaDisplay) && (
                  <div className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-xl mb-4 mt-auto">
                    {prop.bedrooms !== null && prop.bedrooms !== undefined && (
                      <div className="flex items-center gap-1 font-semibold">
                        <Bed className="w-3.5 h-3.5 text-gray-400" />
                        <span>{prop.bedrooms} Bed</span>
                      </div>
                    )}
                    {areaDisplay && (
                      <div className="flex items-center gap-1 font-semibold ml-auto">
                        <span>{areaDisplay}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* View Details CTA */}
                <div className="mt-auto pt-1">
                  <Link
                    href={`/property/${prop.slug}`}
                    className="w-full py-2.5 rounded-xl bg-[#029bba]/10 hover:bg-[#029bba] text-[#029bba] hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200"
                  >
                    <span>View Property Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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