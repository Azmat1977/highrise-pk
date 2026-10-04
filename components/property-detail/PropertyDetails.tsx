// File: components/property-detail/PropertyDetails.tsx
// Additional property details and specifications card

import React from "react";
import { Info } from "lucide-react";
import {
  formatFurnished,
  formatCondition,
  formatFacing,
  formatOwnership,
} from "./propertyDetailUtils";

interface PropertyDetailsProps {
  propertySubtype?: string;
  floorNumber?: number;
  totalFloors?: number;
  furnished?: string;
  condition?: string;
  facing?: string;
  ownershipType?: string;
  isCommercial?: boolean;
}

export default function PropertyDetails({
  propertySubtype,
  floorNumber,
  totalFloors,
  furnished,
  condition,
  facing,
  ownershipType,
  isCommercial,
}: PropertyDetailsProps): React.ReactElement | null {
  const hasDetails =
    floorNumber !== undefined ||
    propertySubtype ||
    furnished ||
    condition ||
    facing ||
    ownershipType;

  if (!hasDetails) return null;

  return (
    <div
      id="details"
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <h2 className="text-lg font-semibold text-[#004063] mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-[#029bba]" />
        Additional Details
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
        {propertySubtype && (
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">Subtype</span>
            <span className="text-sm font-semibold text-gray-900">
              {propertySubtype}
            </span>
          </div>
        )}
        {floorNumber !== undefined && (
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">Floor</span>
            <span className="text-sm font-semibold text-gray-900">
              {floorNumber} {totalFloors ? `of ${totalFloors}` : ""}
            </span>
          </div>
        )}
        {furnished && (
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">Furnishing</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatFurnished(furnished)}
            </span>
          </div>
        )}
        {condition && (
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">Condition</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCondition(condition)}
            </span>
          </div>
        )}
        {facing && (
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">Facing</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatFacing(facing)}
            </span>
          </div>
        )}
        {ownershipType && (
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">Ownership</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatOwnership(ownershipType)}
            </span>
          </div>
        )}
      </div>

      {isCommercial && (
        <div className="mt-4 pt-4">
          <p className="text-xs text-gray-500">
            * This is a commercial property. Contact the seller for exact
            frontage, signage rights, and loading dock availability.
          </p>
        </div>
      )}
    </div>
  );
}