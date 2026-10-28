// File: components/property-detail/PropertyHighlights.tsx
// Trulia-style highlights card (Type, Area, Beds, Baths, Parking, Possession)

import React from "react";
import {
  Sparkles,
  Building,
  Maximize,
  Bed,
  Bath,
  Car,
  Key,
} from "lucide-react";
import { formatParking, formatPossession } from "./propertyDetailUtils";

interface PropertyHighlightsProps {
  propertyType: string;
  area: number;
  unit: string;
  bedrooms?: number;
  bathrooms?: number;
  parking?: string | number;
  possessionStatus?: string;
}

export default function PropertyHighlights({
  propertyType,
  area,
  unit,
  bedrooms,
  bathrooms,
  parking,
  possessionStatus,
}: PropertyHighlightsProps): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <h2 className="text-lg font-bold text-[#004063] flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[#029bba]" />
        Property Highlights
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Type
            </p>
            <p className="text-xs font-bold text-gray-900 truncate">
              {propertyType}
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
            <Maximize className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Area
            </p>
            <p className="text-xs font-bold text-gray-900 truncate">
              {area} {unit}
            </p>
          </div>
        </div>

        {bedrooms !== undefined && bedrooms > 0 && (
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Bedrooms
              </p>
              <p className="text-xs font-bold text-gray-900 truncate">
                {bedrooms} Bed{bedrooms > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        {bathrooms !== undefined && bathrooms > 0 && (
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
              <Bath className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Bathrooms
              </p>
              <p className="text-xs font-bold text-gray-900 truncate">
                {bathrooms} Bath{bathrooms > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Parking
            </p>
            <p className="text-xs font-bold text-gray-900 truncate">
              {formatParking(parking)}
            </p>
          </div>
        </div>

        {possessionStatus && (
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Possession
              </p>
              <p className="text-xs font-bold text-gray-900 truncate">
                {formatPossession(possessionStatus)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}