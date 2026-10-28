// components/units/UnitCard.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  Store,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Eye,
  MessageSquare,
  ArrowRight,
  Star,
  TrendingDown,
  Tag,
  Car,
  Layers,
  Building2,
  CheckCircle2,
  Clock,
  Lock,
  Ban,
  Pause,
  CornerDownRight,
} from 'lucide-react';
import UnitAvailabilityBadge from '@/components/units/UnitAvailabilityBadge';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

export type UnitStatus =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'on_hold'
  | 'cancelled';

export type UnitCategory = 'residential' | 'commercial';

export interface UnitCardData {
  _id:             string;
  unitNumber:      string;
  slug?:           string;
  title?:          string;
  status:          UnitStatus;
  category:        UnitCategory;
  unitType:        string;
  unitTypeName?:   string;

  // Size
  area:            number;
  areaUnit?:       string;

  // Price
  price:           number;
  pricePerUnit?:   number;
  priceNegotiable?: boolean;
  previousPrice?:  number;
  isPriceDropped?: boolean;

  // Features (residential)
  bedrooms?:       number;
  bathrooms?:      number;

  // Position
  floorNumber?:    number;
  floorName?:      string;
  tower?:          string;
  isCorner?:       boolean;
  facing?:         string;
  view?:           string;

  // Parking
  parkingIncluded?: boolean;
  parkingSpaces?:  number;

  // Media
  images?:         Array<{ url: string; isPrimary?: boolean }>;

  // Meta
  isVerified?:     boolean;
  isFeatured?:     boolean;
  isHotDeal?:      boolean;
  isPublished?:    boolean;

  // Analytics
  views?:          number;
  inquiryCount?:   number;

  // Project reference
  projectId?:      string;
  projectName?:    string;
  projectSlug?:    string;
  city?:           string;
  areaName?:       string;

  // Listing
  listingType?:    string;
  finishingLevel?: string;

  // Dates
  createdAt?:      string;
}

export type UnitCardVariant = 'grid' | 'list' | 'compact' | 'floor-map';

interface UnitCardProps {
  unit:        UnitCardData;
  variant?:    UnitCardVariant;
  showProject?: boolean;
  showStatus?:  boolean;
  onClick?:    (unit: UnitCardData) => void;
  href?:       string;
  className?:  string;
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatPrice(price: number): string {
  if (!price || price <= 0) return '';
  if (price >= 10_000_000) {
    const crore = price / 10_000_000;
    return `${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }
  if (price >= 100_000) {
    const lac = price / 100_000;
    return `${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(1)} Lac`;
  }
  return `PKR ${price.toLocaleString()}`;
}

function formatNumber(num: number): string {
  if (!num) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function getPrimaryImage(unit: UnitCardData): string {
  if (unit.images && unit.images.length > 0) {
    const primary = unit.images.find((img) => img.isPrimary);
    return primary?.url ?? unit.images[0].url;
  }
  return '/images/placeholder-unit.webp';
}

function getUnitUrl(unit: UnitCardData, customHref?: string): string {
  if (customHref) return customHref;
  if (unit.projectSlug && unit.slug) {
    return `/projects/${unit.projectSlug}/units/${unit.slug}`;
  }
  if (unit.projectSlug && unit._id) {
    return `/projects/${unit.projectSlug}/units/${unit._id}`;
  }
  return '#';
}

function getTypeIcon(category: UnitCategory): React.ReactElement {
  return category === 'commercial'
    ? <Store className="w-3.5 h-3.5" />
    : <Home className="w-3.5 h-3.5" />;
}

function getTypeLabel(unitType: string, unitTypeName?: string): string {
  if (unitTypeName) return unitTypeName;
  return unitType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getFinishingLabel(level?: string): string {
  const labels: Record<string, string> = {
    grey_structure: 'Grey Structure',
    standard:       'Standard',
    premium:        'Premium',
    luxury:         'Luxury',
  };
  return level ? labels[level] ?? level : '';
}

function getFinishingColor(level?: string): string {
  const colors: Record<string, string> = {
    grey_structure: 'bg-gray-100 text-gray-600',
    standard:       'bg-blue-50 text-blue-600',
    premium:        'bg-purple-50 text-purple-600',
    luxury:         'bg-amber-50 text-amber-700',
  };
  return level ? colors[level] ?? 'bg-gray-100 text-gray-600' : '';
}

function getPriceDropPercent(current: number, previous?: number): number {
  if (!previous || previous <= current) return 0;
  return Math.round(((previous - current) / previous) * 100);
}

// ════════════════════════════════════════════════════
// FEATURE CHIPS
// ════════════════════════════════════════════════════

function FeatureChips({ unit }: { unit: UnitCardData }): React.ReactElement {
  const chips: Array<{
    icon:  React.ReactElement;
    label: string;
  }> = [];

  if (unit.bedrooms !== undefined && unit.bedrooms > 0) {
    chips.push({
      icon:  <Bed className="w-3 h-3" />,
      label: `${unit.bedrooms} Bed`,
    });
  }

  if (unit.bathrooms !== undefined && unit.bathrooms > 0) {
    chips.push({
      icon:  <Bath className="w-3 h-3" />,
      label: `${unit.bathrooms} Bath`,
    });
  }

  chips.push({
    icon:  <Maximize2 className="w-3 h-3" />,
    label: `${unit.area.toLocaleString()} ${unit.areaUnit ?? 'Sq.Ft'}`,
  });

  if (unit.isCorner) {
    chips.push({
      icon:  <CornerDownRight className="w-3 h-3" />,
      label: 'Corner',
    });
  }

  if (unit.parkingIncluded) {
    chips.push({
      icon:  <Car className="w-3 h-3" />,
      label: unit.parkingSpaces ? `${unit.parkingSpaces} Parking` : 'Parking',
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                     bg-gray-100 text-gray-600 text-[10px] font-semibold"
        >
          {chip.icon}
          {chip.label}
        </span>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════
// GRID VARIANT (DEFAULT)
// ════════════════════════════════════════════════════

function GridUnitCard({
  unit,
  showProject,
  showStatus,
  onClick,
  href,
}: {
  unit:        UnitCardData;
  showProject: boolean;
  showStatus:  boolean;
  onClick?:    (unit: UnitCardData) => void;
  href?:       string;
}): React.ReactElement {
  const priceDrop   = getPriceDropPercent(unit.price, unit.previousPrice);
  const isSoldOut   = unit.status === 'sold';
  const isReserved  = unit.status === 'reserved';
  const unitUrl     = getUnitUrl(unit, href);

  const cardContent = (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden
                     transition-all duration-300
                     ${isSoldOut
                       ? 'opacity-75'
                       : 'hover:shadow-xl hover:border-[#029bba]/20'
                     }
                     group`}>

      {/* ── Image ── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          src={getPrimaryImage(unit)}
          alt={unit.title ?? `Unit ${unit.unitNumber}`}
          fill
          className={`object-cover transition-transform duration-500
                      ${isSoldOut ? '' : 'group-hover:scale-105'}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {unit.isFeatured && (
            <span className="px-2 py-0.5 rounded-full bg-[#029bba] text-white
                             text-[10px] font-bold flex items-center gap-0.5">
              <Star className="w-3 h-3" /> Featured
            </span>
          )}
          {unit.isHotDeal && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white
                             text-[10px] font-bold flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" /> Hot Deal
            </span>
          )}
          {unit.isPriceDropped && priceDrop > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-green-500 text-white
                             text-[10px] font-bold">
              {priceDrop}% OFF
            </span>
          )}
        </div>

        {/* Status badge */}
        <div className="absolute top-2.5 right-2.5">
          <UnitAvailabilityBadge status={unit.status} size="sm" />
        </div>

        {/* Floor badge */}
        {unit.floorNumber !== undefined && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-full bg-black/60 text-white
                             text-[10px] font-bold backdrop-blur-sm flex items-center gap-0.5">
              <Layers className="w-3 h-3" />
              {unit.floorName ?? `Floor ${unit.floorNumber}`}
            </span>
          </div>
        )}

        {/* Sold overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="px-4 py-2 bg-red-500/90 text-white font-bold
                             text-sm rounded-full backdrop-blur-sm">
              SOLD
            </span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="p-4">
        {/* Project reference */}
        {showProject && unit.projectName && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">
              {unit.projectName}
            </span>
          </div>
        )}

        {/* Unit type + number */}
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1 text-xs font-semibold text-[#029bba]">
            {getTypeIcon(unit.category)}
            {getTypeLabel(unit.unitType, unit.unitTypeName)}
          </span>
          {unit.isVerified && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-gray-900 leading-tight mb-1.5
                       group-hover:text-[#029bba] transition-colors line-clamp-1">
          {unit.title ?? `Unit ${unit.unitNumber}`}
        </h3>

        {/* Location */}
        {(unit.areaName || unit.city) && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {unit.areaName}
              {unit.city ? `, ${unit.city}` : ''}
            </span>
          </div>
        )}

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-black text-[#029bba]">
              {formatPrice(unit.price)}
            </span>
            {unit.previousPrice && unit.previousPrice > unit.price && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(unit.previousPrice)}
              </span>
            )}
          </div>
          {unit.pricePerUnit && unit.pricePerUnit > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              PKR {unit.pricePerUnit.toLocaleString()} / {unit.areaUnit ?? 'Sq.Ft'}
            </p>
          )}
          {unit.priceNegotiable && (
            <span className="text-[10px] font-semibold text-green-600">
              Negotiable
            </span>
          )}
        </div>

        {/* Features */}
        <FeatureChips unit={unit} />

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {unit.tower && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600
                             text-[10px] font-semibold">
              {unit.tower}
            </span>
          )}
          {unit.finishingLevel && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                              ${getFinishingColor(unit.finishingLevel)}`}>
              {getFinishingLabel(unit.finishingLevel)}
            </span>
          )}
          {unit.listingType && unit.listingType !== 'both' && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500
                             text-[10px] font-semibold flex items-center gap-0.5">
              <Tag className="w-3 h-3" />
              {unit.listingType === 'installment' ? 'Installment' :
               unit.listingType === 'full_payment' ? 'Full Payment' :
               unit.listingType === 'pre_launch' ? 'Pre-Launch' :
               unit.listingType}
            </span>
          )}
          {unit.view && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600
                             text-[10px] font-semibold">
              {unit.view.replace(/_/g, ' ')} view
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {(unit.views ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" /> {formatNumber(unit.views!)}
              </span>
            )}
            {(unit.inquiryCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" /> {formatNumber(unit.inquiryCount!)}
              </span>
            )}
          </div>

          {!isSoldOut && (
            <span className="text-xs font-semibold text-[#029bba]
                             group-hover:underline flex items-center gap-1">
              View Details <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={() => onClick(unit)} className="block w-full text-left">
        {cardContent}
      </button>
    );
  }

  return (
    <Link href={unitUrl} className="block">
      {cardContent}
    </Link>
  );
}

// ════════════════════════════════════════════════════
// LIST VARIANT
// ════════════════════════════════════════════════════

function ListUnitCard({
  unit,
  showProject,
  onClick,
  href,
}: {
  unit:        UnitCardData;
  showProject: boolean;
  onClick?:    (unit: UnitCardData) => void;
  href?:       string;
}): React.ReactElement {
  const isSoldOut = unit.status === 'sold';
  const unitUrl   = getUnitUrl(unit, href);

  const cardContent = (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden
                     flex flex-col sm:flex-row transition-all duration-300
                     ${isSoldOut ? 'opacity-75' : 'hover:shadow-lg hover:border-[#029bba]/20'}
                     group`}>

      {/* Image */}
      <div className="relative w-full sm:w-48 aspect-[4/3] sm:aspect-auto
                      overflow-hidden bg-gray-100 flex-shrink-0">
        <Image
          src={getPrimaryImage(unit)}
          alt={unit.title ?? `Unit ${unit.unitNumber}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 192px"
        />
        <div className="absolute top-2 right-2">
          <UnitAvailabilityBadge status={unit.status} size="sm" />
        </div>
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="px-3 py-1 bg-red-500/90 text-white font-bold text-xs rounded-full">
              SOLD
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          {/* Project */}
          {showProject && unit.projectName && (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {unit.projectName}
            </p>
          )}

          {/* Type + title */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#029bba] flex items-center gap-1">
              {getTypeIcon(unit.category)}
              {getTypeLabel(unit.unitType, unit.unitTypeName)}
            </span>
            {unit.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </div>

          <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#029bba]
                         transition-colors line-clamp-1">
            {unit.title ?? `Unit ${unit.unitNumber}`}
          </h3>

          {/* Features inline */}
          <div className="mt-2">
            <FeatureChips unit={unit} />
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="text-lg font-black text-[#029bba]">
              {formatPrice(unit.price)}
            </p>
            {unit.floorName && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {unit.floorName}{unit.tower ? ` · ${unit.tower}` : ''}
              </p>
            )}
          </div>

          {!isSoldOut && (
            <span className="text-xs font-semibold text-[#029bba] flex items-center gap-1">
              Details <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={() => onClick(unit)} className="block w-full text-left">
        {cardContent}
      </button>
    );
  }

  return (
    <Link href={unitUrl} className="block">
      {cardContent}
    </Link>
  );
}

// ════════════════════════════════════════════════════
// COMPACT VARIANT
// ════════════════════════════════════════════════════

function CompactUnitCard({
  unit,
  onClick,
  href,
}: {
  unit:     UnitCardData;
  onClick?: (unit: UnitCardData) => void;
  href?:    string;
}): React.ReactElement {
  const isSoldOut = unit.status === 'sold';
  const unitUrl   = getUnitUrl(unit, href);

  const cardContent = (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100
                     transition-all duration-200
                     ${isSoldOut
                       ? 'opacity-60'
                       : 'hover:border-[#029bba]/20 hover:shadow-sm'
                     } group`}>

      {/* Status dot */}
      <UnitAvailabilityBadge status={unit.status} size="xs" variant="dot" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-gray-900 truncate
                           group-hover:text-[#029bba] transition-colors">
            {unit.unitNumber}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            {getTypeLabel(unit.unitType, unit.unitTypeName)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
          {unit.bedrooms !== undefined && unit.bedrooms > 0 && (
            <span>{unit.bedrooms}B</span>
          )}
          <span>{unit.area} {unit.areaUnit ?? 'sqft'}</span>
          {unit.floorName && <span>{unit.floorName}</span>}
        </div>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-[#029bba]">
          {formatPrice(unit.price)}
        </p>
      </div>

      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba]
                             transition-colors flex-shrink-0" />
    </div>
  );

  if (onClick) {
    return (
      <button onClick={() => onClick(unit)} className="block w-full text-left">
        {cardContent}
      </button>
    );
  }

  return (
    <Link href={unitUrl} className="block">
      {cardContent}
    </Link>
  );
}

// ════════════════════════════════════════════════════
// FLOOR MAP VARIANT
// ════════════════════════════════════════════════════

function FloorMapUnitCard({
  unit,
  onClick,
}: {
  unit:     UnitCardData;
  onClick?: (unit: UnitCardData) => void;
}): React.ReactElement {
  const statusColors: Record<UnitStatus, string> = {
    available: 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200',
    reserved:  'bg-amber-100 border-amber-300 hover:bg-amber-200',
    sold:      'bg-red-100 border-red-300 cursor-not-allowed',
    on_hold:   'bg-gray-100 border-gray-300',
    cancelled: 'bg-gray-50 border-gray-200 cursor-not-allowed',
  };

  const statusTextColors: Record<UnitStatus, string> = {
    available: 'text-emerald-800',
    reserved:  'text-amber-800',
    sold:      'text-red-700',
    on_hold:   'text-gray-600',
    cancelled: 'text-gray-400',
  };

  return (
    <button
      onClick={() => onClick?.(unit)}
      disabled={unit.status === 'sold' || unit.status === 'cancelled'}
      className={`
        p-2 rounded-xl border-2 text-center transition-all duration-200
        ${statusColors[unit.status]}
        ${unit.status !== 'sold' && unit.status !== 'cancelled' ? 'cursor-pointer' : ''}
      `}
    >
      <p className={`text-xs font-bold ${statusTextColors[unit.status]}`}>
        {unit.unitNumber}
      </p>
      <p className="text-[9px] text-gray-500 mt-0.5">
        {unit.area} {unit.areaUnit ?? 'sqft'}
      </p>
      <p className={`text-[10px] font-bold mt-0.5 ${statusTextColors[unit.status]}`}>
        {formatPrice(unit.price)}
      </p>
    </button>
  );
}

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════

export default function UnitCard({
  unit,
  variant     = 'grid',
  showProject = false,
  showStatus  = true,
  onClick,
  href,
  className   = '',
}: UnitCardProps): React.ReactElement {
  if (variant === 'list') {
    return (
      <div className={className}>
        <ListUnitCard
          unit={unit}
          showProject={showProject}
          onClick={onClick}
          href={href}
        />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={className}>
        <CompactUnitCard unit={unit} onClick={onClick} href={href} />
      </div>
    );
  }

  if (variant === 'floor-map') {
    return (
      <div className={className}>
        <FloorMapUnitCard unit={unit} onClick={onClick} />
      </div>
    );
  }

  // Default: grid
  return (
    <div className={className}>
      <GridUnitCard
        unit={unit}
        showProject={showProject}
        showStatus={showStatus}
        onClick={onClick}
        href={href}
      />
    </div>
  );
}