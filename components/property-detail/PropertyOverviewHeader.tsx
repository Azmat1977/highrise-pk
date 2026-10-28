// File: components/property-detail/PropertyOverviewHeader.tsx
// Unboxed Price, Title, Location, and Project verification status header

import React from "react";
import { MapPin, CheckCircle } from "lucide-react";
import VerifiedOwnerBadge from "@/components/badges/VerifiedOwnerBadge";
import { formatPrice } from "./propertyDetailUtils";

interface PropertyOverviewHeaderProps {
  title: string;
  price: number;
  totalPrice?: number;
  pricePerUnit?: number;
  priceNegotiable?: boolean;
  unit: string;
  isRent: boolean;
  fullLocation: string;
  projectId?: string;
  listingActor?: {
    role: string;
    label: string;
    displayName: string;
    verified?: boolean;
  } | null;
}

export default function PropertyOverviewHeader({
  title,
  price,
  totalPrice,
  pricePerUnit,
  priceNegotiable,
  unit,
  isRent,
  fullLocation,
  projectId,
  listingActor,
}: PropertyOverviewHeaderProps): React.ReactElement {
  return (
    <div id="overview" className="pb-2 border-b border-gray-200 mb-6">
      <div className="flex flex-col gap-4 mb-4">
        {/* Price (Top, massive and dark, matching Project page) */}
        <div>
          <p className="text-3xl md:text-[32px] font-black text-[#004063] tracking-tight">
            {isRent ? (
              <>
                PKR {formatPrice(price)}
                <span className="text-lg font-bold text-gray-500 ml-1">
                  / month
                </span>
              </>
            ) : (
              <>PKR {formatPrice(totalPrice ?? price)}</>
            )}
          </p>
          {!isRent && pricePerUnit && (
            <p className="text-sm text-gray-500 mt-1 font-medium">
              PKR {formatPrice(pricePerUnit)} per {unit}
            </p>
          )}
          {priceNegotiable && (
            <span className="inline-block mt-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider rounded-full border border-emerald-100">
              Price Negotiable
            </span>
          )}
        </div>

        {/* Title & Location */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
              {title}
            </h1>
            {listingActor?.verified && (
              <VerifiedOwnerBadge size="sm" showTooltip />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center text-[#666666]">
              <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 text-[#029bba]" />
              <span className="text-sm font-medium">{fullLocation}</span>
            </div>
            {projectId && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#029bba] to-[#017a8a] text-white text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified Project Unit
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}