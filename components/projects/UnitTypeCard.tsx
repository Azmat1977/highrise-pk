// components/projects/UnitTypeCard.tsx

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Home,
  Store,
  Briefcase,
  Car,
  Coffee,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Users,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface UnitTypeBreakdown {
  type: string;
  name?: string;
  totalUnits?: number;
  soldUnits?: number;
  availableUnits?: number;
  priceRange: {
    min: number;
    max: number;
  };
  areaRange?: {
    min: number;
    max: number;
    unit: string;
  };
  description?: string;
  features?: string[];
}

interface UnitTypeCardProps {
  unitType: UnitTypeBreakdown;
  projectId: string;
  projectSlug?: string;
}

// ============================================
// HELPERS
// ============================================

function getProjectUrl(
  projectSlug?: string,
  projectId?: string,
  unitType?: string
): string {
  const identifier = projectSlug || projectId;
  if (!identifier) return '#';
  const base = `/projects/${identifier}/units`;
  return unitType ? `${base}?type=${encodeURIComponent(unitType)}` : base;
}

function formatPrice(price: number): string {
  if (!price || price <= 0) return 'N/A';
  if (price >= 10_000_000) {
    const c = price / 10_000_000;
    return `PKR ${c % 1 === 0 ? c.toFixed(0) : c.toFixed(2)} Crore`;
  }
  if (price >= 100_000) {
    const l = price / 100_000;
    return `PKR ${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} Lac`;
  }
  return `PKR ${price.toLocaleString()}`;
}

function getIcon(type: string): React.ReactElement {
  switch (type.toLowerCase()) {
    case 'apartment':  return <Home      className="w-5 h-5" />;
    case 'shop':       return <Store     className="w-5 h-5" />;
    case 'office':     return <Briefcase className="w-5 h-5" />;
    case 'parking':    return <Car       className="w-5 h-5" />;
    case 'foodcourt':  return <Coffee    className="w-5 h-5" />;
    case 'penthouse':  return <Building2 className="w-5 h-5" />;
    default:           return <Home      className="w-5 h-5" />;
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    apartment: 'Apartments',
    shop:      'Shops',
    office:    'Offices',
    parking:   'Parking',
    foodcourt: 'Food Court',
    penthouse: 'Penthouses',
    studio:    'Studios',
    duplex:    'Duplexes',
    warehouse: 'Warehouses',
  };
  return labels[type.toLowerCase()] ?? (
    type.charAt(0).toUpperCase() + type.slice(1)
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function UnitTypeCard({
  unitType,
  projectId,
  projectSlug,
}: UnitTypeCardProps): React.ReactElement {
  const available = unitType.availableUnits ??
    ((unitType.totalUnits && unitType.soldUnits)
      ? unitType.totalUnits - unitType.soldUnits
      : 0);

  const isSoldOut    = available === 0;
  const isAvailable  = available > 0;

  const soldPercentage =
    unitType.totalUnits && unitType.soldUnits
      ? Math.min(Math.round((unitType.soldUnits / unitType.totalUnits) * 100), 100)
      : 0;

  const unitsPageUrl = getProjectUrl(projectSlug, projectId, unitType.type);

  const minPrice = unitType.priceRange?.min ?? 0;
  const maxPrice = unitType.priceRange?.max ?? 0;
  const hasPriceRange = minPrice > 0 && maxPrice > 0 && minPrice !== maxPrice;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:border-[#029bba]/30 flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#029bba]/10 text-[#029bba] flex-shrink-0">
            {getIcon(unitType.type)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight">
              {unitType.name || getTypeLabel(unitType.type)}
            </h3>
            {unitType.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                {unitType.description}
              </p>
            )}
          </div>
        </div>

        {/* Availability badge */}
        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
          isSoldOut
            ? 'bg-red-100 text-red-700'
            : isAvailable
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isSoldOut
            ? 'Sold Out'
            : isAvailable
            ? `${available} Available`
            : 'Limited'}
        </span>
      </div>

      {/* ── Price ── */}
      <div className="mb-5">
        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-1">
          Price Range
        </p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-black text-[#029bba]">
            {formatPrice(minPrice)}
          </span>
          {hasPriceRange && (
            <>
              <span className="text-gray-300 font-medium">–</span>
              <span className="text-xl font-bold text-[#029bba]">
                {formatPrice(maxPrice)}
              </span>
            </>
          )}
          <span className="text-gray-400 text-sm">per unit</span>
        </div>
      </div>

      {/* ── Area range ── */}
      {unitType.areaRange && unitType.areaRange.min > 0 && (
        <div className="mb-5">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-2">
            Size Range
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">S</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {unitType.areaRange.min.toLocaleString()} {unitType.areaRange.unit || 'sqft'}
                </p>
                <p className="text-[10px] text-gray-400">Minimum</p>
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <span className="text-green-600 text-xs font-bold">L</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {unitType.areaRange.max.toLocaleString()} {unitType.areaRange.unit || 'sqft'}
                </p>
                <p className="text-[10px] text-gray-400">Maximum</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sales progress ── */}
      {(unitType.totalUnits ?? 0) > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              {unitType.soldUnits ?? 0} Sold
            </span>
            <span className="font-semibold text-gray-700">
              {soldPercentage}% Booked
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
              style={{ width: `${soldPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Available: {available}</span>
            <span>Total: {unitType.totalUnits}</span>
          </div>
        </div>
      )}

      {/* ── Features ── */}
      {(unitType.features?.length ?? 0) > 0 && (
        <div className="mb-5">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-2">
            Key Features
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unitType.features!.slice(0, 3).map((feature, idx) => (
              <span key={idx}
                className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-100">
                {feature}
              </span>
            ))}
            {unitType.features!.length > 3 && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full text-xs">
                +{unitType.features!.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Spacer pushes CTA to bottom ── */}
      <div className="flex-1" />

      {/* ── CTA ── */}
      <Link
        href={unitsPageUrl}
        className="block w-full"
      >
        <div className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
          isSoldOut
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-[#029bba] to-[#027a94] text-white hover:shadow-lg hover:from-[#02a8c9] hover:to-[#028aaa]'
        }`}>
          <span>{isSoldOut ? 'View Sold Units' : 'Browse Available Units'}</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </Link>

      {/* ── Footer stats ── */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>
            {(unitType.totalUnits ?? 0) > 0
              ? `${unitType.totalUnits} Total Units`
              : 'Limited Units'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          <span>{isAvailable ? 'Available Now' : 'High Demand'}</span>
        </div>
      </div>

    </div>
  );
}