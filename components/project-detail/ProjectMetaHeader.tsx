import React from 'react';
import { MapPin, ArrowRight, Tag, BedDouble, Bath, Maximize, Building2, CheckCircle } from 'lucide-react';
import { formatDetailPrice } from '@/types/projectDetail';
import DOMPurify from 'isomorphic-dompurify';

interface TruliaHeaderProps {
  project: any;
  minPrice?: number;
  maxPrice?: number;
  minAreaSqft?: number;
  maxAreaSqft?: number;
}

export default function TruliaHeader({ project, minPrice, maxPrice, minAreaSqft, maxAreaSqft }: TruliaHeaderProps) {
  const areaDisplay = project.areaName || project.area || '';
  
  // Calculate Bed/Bath Ranges
  let minBeds = 99, maxBeds = 0, minBaths = 99, maxBaths = 0;
  if (project.unitTypeBreakdown) {
    project.unitTypeBreakdown.forEach((ut: any) => {
      if (ut.bedrooms) {
        if (ut.bedrooms < minBeds) minBeds = ut.bedrooms;
        if (ut.bedrooms > maxBeds) maxBeds = ut.bedrooms;
      }
      if (ut.bathrooms) {
        if (ut.bathrooms < minBaths) minBaths = ut.bathrooms;
        if (ut.bathrooms > maxBaths) maxBaths = ut.bathrooms;
      }
    });
  }
  const hasBeds = minBeds !== 99;
  const hasBaths = minBaths !== 99;

  // Extract Top 6 Amenities for Highlights
  const highlights = project.amenitiesDetailed?.slice(0, 6) || [];

  // Extract Special Offer (Early Bird or First Custom Offer)
  const offer = project.discountOffers?.earlyBirdOffer?.enabled 
    ? project.discountOffers.earlyBirdOffer 
    : project.discountOffers?.customOffers?.find((o: any) => o.isActive);

  return (
    <div className="space-y-6 mb-8">
      
      {/* 1. Meta Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2 flex items-center gap-3">
          {typeof minPrice === 'number' && minPrice > 0
            ? `PKR ${formatDetailPrice(minPrice)}`
            : 'Contact for Price'}
          {typeof minPrice === 'number' && typeof maxPrice === 'number' && maxPrice > minPrice
            ? ` - ${formatDetailPrice(maxPrice)}`
            : ''}
          {project.saleMode === 'Installment' && (
            <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              Total Price
            </span>
          )}
        </h2>
        
        <h1 className="text-2xl font-bold text-[#001f2b] mb-3 flex items-center gap-2">
          {project.projectName}
          {project.isVerified && <CheckCircle className="w-5 h-5 text-[#029bba]" />}
        </h1>

        {/* Trulia Meta Strip */}
        <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm font-medium mb-3">
          {hasBeds && (
            <div className="flex items-center gap-1.5 border-r border-gray-200 pr-4">
              <BedDouble className="w-4 h-4" /> 
              {minBeds === maxBeds ? minBeds : `${minBeds}-${maxBeds}`} Beds
            </div>
          )}
          {hasBaths && (
            <div className="flex items-center gap-1.5 border-r border-gray-200 pr-4">
              <Bath className="w-4 h-4" /> 
              {minBaths === maxBaths ? minBaths : `${minBaths}-${maxBaths}`} Baths
            </div>
          )}
          {minAreaSqft! > 0 && (
            <div className="flex items-center gap-1.5 border-r border-gray-200 pr-4">
              <Maximize className="w-4 h-4" /> 
              {minAreaSqft === maxAreaSqft ? minAreaSqft?.toLocaleString() : `${minAreaSqft?.toLocaleString()}-${maxAreaSqft?.toLocaleString()}`} sqft
            </div>
          )}
          {(!hasBeds && !hasBaths) && (
            <div className="flex items-center gap-1.5 border-r border-gray-200 pr-4">
              <Building2 className="w-4 h-4" /> Commercial & Retail
            </div>
          )}
        </div>

        <p className="text-gray-500 text-sm flex items-center gap-1.5 mb-3">
          <MapPin className="w-4 h-4" /> {project.specificLocation ? `${project.specificLocation}, ` : ''}{areaDisplay}, {project.city}
        </p>

        <button 
          onClick={() => {
            const el = document.getElementById('units');
            if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' });
          }}
          className="text-[#029bba] font-bold text-sm flex items-center gap-1 hover:underline"
        >
          See available units <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Home Highlights Box */}
      {highlights.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Project Highlights</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Building2 className="w-5 h-5 text-[#029bba]" />
              <span className="capitalize">{project.projectNature || 'Mixed Use'} {project.projectCategory?.replace('_', ' ')}</span>
            </div>
            {highlights.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CheckCircle className="w-5 h-5 text-[#029bba]" />
                {h.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Special Offer Box */}
      {offer && (
        <div className="bg-[#f4f9fb] rounded-2xl border border-[#029bba]/20 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#001f2b] flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-[#029bba]" /> 
            {offer.title || 'Special Offer'}
          </h3>
          <p className="text-gray-700 text-sm font-medium mb-3">
            {offer.discountPercent ? `Get ${offer.discountPercent}% Off!` : ''}
          </p>
          <div 
            className="text-gray-600 text-xs leading-relaxed mb-3"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(offer.description || '') }}
          />
          <button className="text-[#029bba] font-bold text-sm hover:underline">
            See If You Qualify
          </button>
        </div>
      )}

    </div>
  );
}