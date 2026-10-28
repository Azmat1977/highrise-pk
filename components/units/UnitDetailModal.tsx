// components/units/UnitDetailModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Home,
  Store,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Building2,
  Layers,
  Car,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Star,
  TrendingDown,
  Tag,
  DollarSign,
  Calendar,
  Clock,
  CornerDownRight,
  Compass,
  Mountain,
  Sparkles,
  Shield,
  CreditCard,
  Send,
  Phone,
  ArrowRight,
  Info,
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

export interface UnitDetailData {
  _id:              string;
  unitNumber:       string;
  slug?:            string;
  title?:           string;
  status:           UnitStatus;
  category:         'residential' | 'commercial';
  unitType:         string;
  unitTypeName?:    string;

  // Size
  area:             number;
  areaUnit?:        string;
  coveredArea?:     number;
  carpetArea?:      number;
  balconyArea?:     number;
  terraceArea?:     number;

  // Price
  price:            number;
  pricePerUnit?:    number;
  priceNegotiable?: boolean;
  previousPrice?:   number;
  isPriceDropped?:  boolean;
  priceLabel?:      string;

  // Residential
  bedrooms?:        number;
  bathrooms?:       number;
  livingRooms?:     number;
  kitchens?:        number;
  balconies?:       number;
  servantQuarter?:  boolean;
  storeRoom?:       boolean;
  studyRoom?:       boolean;

  // Commercial
  cabins?:          number;
  seatingCapacity?: number;
  kitchenette?:     boolean;
  reception?:       boolean;
  washroom?:        string;

  // Position
  floorNumber?:     number;
  floorName?:       string;
  tower?:           string;
  wing?:            string;
  building?:        string;
  isCorner?:        boolean;
  facing?:          string;
  view?:            string;
  viewDescription?: string;
  isParkFacing?:    boolean;
  isRoadFacing?:    boolean;

  // Parking
  parkingIncluded?: boolean;
  parkingSpaces?:   number;
  parkingType?:     string;

  // Features
  features?:            string[];
  includedAppliances?:  string[];
  finishingLevel?:      string;
  finishingDetails?:    string;

  // Media
  images?:          Array<{ url: string; publicId?: string; caption?: string; isPrimary?: boolean }>;
  floorPlanImage?:  { url: string };
  layoutImage?:     { url: string };
  virtualTourUrl?:  string;
  videoUrl?:        string;

  // Description
  description?:      string;
  shortDescription?: string;
  highlights?:       string[];

  // Payment
  listingType?:      string;
  installmentPlan?:  {
    bookingAmount?:   number;
    bookingPercent?:  number;
    downPayment?:     number;
    monthlyAmount?:   number;
    monthlyCount?:    number;
    possessionAmount?: number;
    planDuration?:    number;
    planDurationUnit?: string;
  };

  // Investor
  investorIntelligence?: {
    expectedRentalYield?:  number;
    estimatedMonthlyRent?: number;
    investmentScore?:      string;
    capitalAppreciation?:  string;
  };

  // Meta
  isVerified?:      boolean;
  isFeatured?:      boolean;
  isHotDeal?:       boolean;
  views?:           number;
  inquiryCount?:    number;

  // Project
  projectName?:     string;
  projectSlug?:     string;
  city?:            string;
  areaName?:        string;

  // Dates
  availableFrom?:   string;
  createdAt?:       string;
}

interface UnitDetailModalProps {
  unit:        UnitDetailData;
  isOpen:      boolean;
  onClose:     () => void;
  onInquire?:  (unitId: string, unitNumber: string) => void;
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatPrice(price: number): string {
  if (!price || price <= 0) return 'N/A';
  if (price >= 10_000_000) {
    const crore = price / 10_000_000;
    return `PKR ${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }
  if (price >= 100_000) {
    const lac = price / 100_000;
    return `PKR ${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(1)} Lac`;
  }
  return `PKR ${price.toLocaleString()}`;
}

function formatAmount(amount: number): string {
  if (!amount || amount <= 0) return '—';
  if (amount >= 100_000) {
    return `${(amount / 100_000).toFixed(1)} Lac`;
  }
  return amount.toLocaleString();
}

function getFinishingLabel(level?: string): string {
  const labels: Record<string, string> = {
    grey_structure: 'Grey Structure',
    standard:       'Standard Finishing',
    premium:        'Premium Finishing',
    luxury:         'Luxury Finishing',
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

function getFacingLabel(facing?: string): string {
  if (!facing) return '';
  return facing.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getViewLabel(view?: string): string {
  if (!view) return '';
  return view.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getInvestmentScoreColor(score?: string): string {
  const colors: Record<string, string> = {
    low:       'bg-gray-100 text-gray-600',
    medium:    'bg-blue-50 text-blue-600',
    high:      'bg-green-50 text-green-600',
    excellent: 'bg-emerald-50 text-emerald-700',
  };
  return score ? colors[score] ?? 'bg-gray-100 text-gray-600' : '';
}

function getPriceDropPercent(current: number, previous?: number): number {
  if (!previous || previous <= current) return 0;
  return Math.round(((previous - current) / previous) * 100);
}

// ════════════════════════════════════════════════════
// IMAGE GALLERY SECTION
// ════════════════════════════════════════════════════

function ImageGallery({
  images,
  title,
}: {
  images: Array<{ url: string; caption?: string }>;
  title:  string;
}): React.ReactElement {
  const [current, setCurrent] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[16/10] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <Home className="w-10 h-10 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gray-100">
        <Image
          src={images[current].url}
          alt={images[current].caption ?? `${title} — Image ${current + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((p) => (p > 0 ? p - 1 : images.length - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full
                         bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrent((p) => (p < images.length - 1 ? p + 1 : 0))}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full
                         bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Counter */}
            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full
                            bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm">
              {current + 1} / {images.length}
            </div>
          </>
        )}

        {/* Caption */}
        {images[current].caption && (
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2
                          bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-white text-xs">{images[current].caption}</p>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0
                          border-2 transition-all duration-200
                          ${idx === current
                            ? 'border-[#029bba] opacity-100'
                            : 'border-transparent opacity-60 hover:opacity-90'
                          }`}
            >
              <Image
                src={img.url}
                alt={`Thumb ${idx + 1}`}
                fill
                className="object-cover"
                sizes="48px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// DETAIL ROW
// ════════════════════════════════════════════════════

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon:       React.ReactElement;
  label:      string;
  value:      string | number | React.ReactElement;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${highlight ? 'text-[#029bba]' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════
// SECTION HEADER
// ════════════════════════════════════════════════════

function SectionHeader({
  icon,
  title,
}: {
  icon:  React.ReactElement;
  title: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <span className="text-[#029bba]">{icon}</span>
      <h4 className="font-bold text-sm text-[#004063] uppercase tracking-wide">
        {title}
      </h4>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════

export default function UnitDetailModal({
  unit,
  isOpen,
  onClose,
  onInquire,
}: UnitDetailModalProps): React.ReactElement | null {
  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const priceDrop  = getPriceDropPercent(unit.price, unit.previousPrice);
  const isSoldOut  = unit.status === 'sold';
  const hasImages  = (unit.images?.length ?? 0) > 0;
  const hasInstallment = unit.installmentPlan &&
    ((unit.installmentPlan.bookingAmount ?? 0) > 0 ||
     (unit.installmentPlan.monthlyAmount ?? 0) > 0);
  const hasInvestor = unit.investorIntelligence &&
    ((unit.investorIntelligence.expectedRentalYield ?? 0) > 0 ||
     unit.investorIntelligence.investmentScore);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center
                 bg-black/50 backdrop-blur-sm overflow-y-auto py-4 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl
                   my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full
                     bg-white/90 hover:bg-white shadow-md
                     text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Content ── */}
        <div className="max-h-[90vh] overflow-y-auto">

          {/* ── Image gallery ── */}
          <div className="p-5 pb-0">
            <ImageGallery
              images={unit.images ?? []}
              title={unit.title ?? `Unit ${unit.unitNumber}`}
            />
          </div>

          {/* ── Main content ── */}
          <div className="p-5">

            {/* Status + badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <UnitAvailabilityBadge status={unit.status} size="md" variant="full" />
              {unit.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                 bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
              {unit.isFeatured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                 bg-[#029bba]/10 text-[#029bba] text-[10px] font-bold">
                  <Star className="w-3 h-3" /> Featured
                </span>
              )}
              {unit.isHotDeal && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                 bg-red-50 text-red-600 text-[10px] font-bold">
                  <TrendingDown className="w-3 h-3" /> Hot Deal
                </span>
              )}
              {unit.isPriceDropped && priceDrop > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                 bg-green-50 text-green-600 text-[10px] font-bold">
                  <TrendingDown className="w-3 h-3" /> {priceDrop}% Price Drop
                </span>
              )}
            </div>

            {/* Unit type */}
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-[#029bba]">
                {unit.category === 'commercial'
                  ? <Store className="w-4 h-4" />
                  : <Home className="w-4 h-4" />
                }
                {unit.unitTypeName ?? unit.unitType?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
              <span className="text-xs text-gray-400">#{unit.unitNumber}</span>
            </div>

            {/* Title */}
            <h2 className="font-black text-xl text-[#004063] mb-1">
              {unit.title ?? `Unit ${unit.unitNumber}`}
            </h2>

            {/* Location */}
            {(unit.areaName || unit.city || unit.projectName) && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  {unit.projectName && `${unit.projectName} · `}
                  {unit.areaName}
                  {unit.city ? `, ${unit.city}` : ''}
                </span>
              </div>
            )}

            {/* ── Price section ── */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 mb-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-black text-[#029bba]">
                  {formatPrice(unit.price)}
                </span>
                {unit.previousPrice && unit.previousPrice > unit.price && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(unit.previousPrice)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                {unit.pricePerUnit && unit.pricePerUnit > 0 && (
                  <span className="text-xs text-gray-500">
                    PKR {unit.pricePerUnit.toLocaleString()} / {unit.areaUnit ?? 'Sq.Ft'}
                  </span>
                )}
                {unit.priceNegotiable && (
                  <span className="text-xs font-semibold text-green-600 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Negotiable
                  </span>
                )}
                {unit.priceLabel && (
                  <span className="text-xs text-gray-400">{unit.priceLabel}</span>
                )}
                {unit.listingType && (
                  <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200
                                   text-[10px] font-semibold text-gray-500 flex items-center gap-0.5">
                    <Tag className="w-3 h-3" />
                    {unit.listingType === 'installment' ? 'Installment' :
                     unit.listingType === 'full_payment' ? 'Full Payment' :
                     unit.listingType === 'pre_launch' ? 'Pre-Launch' :
                     unit.listingType === 'both' ? 'Cash + Installment' :
                     unit.listingType}
                  </span>
                )}
              </div>
            </div>

            {/* ── Size & measurements ── */}
            <SectionHeader icon={<Maximize2 className="w-4 h-4" />} title="Size & Measurements" />
            <div className="rounded-xl border border-gray-100 px-3">
              <DetailRow icon={<Maximize2 className="w-3.5 h-3.5" />} label="Total Area"
                         value={`${unit.area.toLocaleString()} ${unit.areaUnit ?? 'Sq.Ft'}`} highlight />
              {unit.coveredArea && (
                <DetailRow icon={<Maximize2 className="w-3.5 h-3.5" />} label="Covered Area"
                           value={`${unit.coveredArea.toLocaleString()} ${unit.areaUnit ?? 'Sq.Ft'}`} />
              )}
              {unit.carpetArea && (
                <DetailRow icon={<Maximize2 className="w-3.5 h-3.5" />} label="Carpet Area"
                           value={`${unit.carpetArea.toLocaleString()} ${unit.areaUnit ?? 'Sq.Ft'}`} />
              )}
              {unit.balconyArea && (
                <DetailRow icon={<Maximize2 className="w-3.5 h-3.5" />} label="Balcony Area"
                           value={`${unit.balconyArea.toLocaleString()} ${unit.areaUnit ?? 'Sq.Ft'}`} />
              )}
              {unit.terraceArea && (
                <DetailRow icon={<Maximize2 className="w-3.5 h-3.5" />} label="Terrace Area"
                           value={`${unit.terraceArea.toLocaleString()} ${unit.areaUnit ?? 'Sq.Ft'}`} />
              )}
            </div>

            {/* ── Features ── */}
            <SectionHeader
              icon={unit.category === 'commercial' ? <Store className="w-4 h-4" /> : <Home className="w-4 h-4" />}
              title={unit.category === 'commercial' ? 'Commercial Features' : 'Room Configuration'}
            />
            <div className="rounded-xl border border-gray-100 px-3">
              {unit.bedrooms !== undefined && unit.bedrooms > 0 && (
                <DetailRow icon={<Bed className="w-3.5 h-3.5" />} label="Bedrooms" value={unit.bedrooms} />
              )}
              {unit.bathrooms !== undefined && unit.bathrooms > 0 && (
                <DetailRow icon={<Bath className="w-3.5 h-3.5" />} label="Bathrooms" value={unit.bathrooms} />
              )}
              {unit.livingRooms !== undefined && unit.livingRooms > 0 && (
                <DetailRow icon={<Home className="w-3.5 h-3.5" />} label="Living Rooms" value={unit.livingRooms} />
              )}
              {unit.kitchens !== undefined && unit.kitchens > 0 && (
                <DetailRow icon={<Home className="w-3.5 h-3.5" />} label="Kitchens" value={unit.kitchens} />
              )}
              {unit.servantQuarter && (
                <DetailRow icon={<Home className="w-3.5 h-3.5" />} label="Servant Quarter" value="Yes" />
              )}
              {unit.storeRoom && (
                <DetailRow icon={<Home className="w-3.5 h-3.5" />} label="Store Room" value="Yes" />
              )}
              {unit.studyRoom && (
                <DetailRow icon={<Home className="w-3.5 h-3.5" />} label="Study Room" value="Yes" />
              )}
              {unit.cabins !== undefined && unit.cabins > 0 && (
                <DetailRow icon={<Store className="w-3.5 h-3.5" />} label="Cabins" value={unit.cabins} />
              )}
              {unit.seatingCapacity !== undefined && unit.seatingCapacity > 0 && (
                <DetailRow icon={<Store className="w-3.5 h-3.5" />} label="Seating Capacity" value={unit.seatingCapacity} />
              )}
              {unit.reception && (
                <DetailRow icon={<Store className="w-3.5 h-3.5" />} label="Reception" value="Yes" />
              )}
              {unit.washroom && (
                <DetailRow icon={<Store className="w-3.5 h-3.5" />} label="Washroom"
                           value={unit.washroom.replace(/\b\w/g, (l) => l.toUpperCase())} />
              )}
            </div>

            {/* ── Position ── */}
            <SectionHeader icon={<Compass className="w-4 h-4" />} title="Position & Attributes" />
            <div className="rounded-xl border border-gray-100 px-3">
              {unit.floorName && (
                <DetailRow icon={<Layers className="w-3.5 h-3.5" />} label="Floor" value={unit.floorName} />
              )}
              {unit.floorNumber !== undefined && !unit.floorName && (
                <DetailRow icon={<Layers className="w-3.5 h-3.5" />} label="Floor" value={`Floor ${unit.floorNumber}`} />
              )}
              {unit.tower && (
                <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Tower" value={unit.tower} />
              )}
              {unit.wing && (
                <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Wing" value={unit.wing} />
              )}
              {unit.isCorner && (
                <DetailRow icon={<CornerDownRight className="w-3.5 h-3.5" />} label="Corner Unit" value="Yes" />
              )}
              {unit.facing && (
                <DetailRow icon={<Compass className="w-3.5 h-3.5" />} label="Facing" value={getFacingLabel(unit.facing)} />
              )}
              {unit.view && (
                <DetailRow icon={<Mountain className="w-3.5 h-3.5" />} label="View"
                           value={getViewLabel(unit.view)} />
              )}
              {unit.finishingLevel && (
                <DetailRow icon={<Sparkles className="w-3.5 h-3.5" />} label="Finishing"
                           value={
                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                               ${getFinishingColor(unit.finishingLevel)}`}>
                               {getFinishingLabel(unit.finishingLevel)}
                             </span>
                           } />
              )}
            </div>

            {/* ── Parking ── */}
            {unit.parkingIncluded && (
              <>
                <SectionHeader icon={<Car className="w-4 h-4" />} title="Parking" />
                <div className="rounded-xl border border-gray-100 px-3">
                  <DetailRow icon={<Car className="w-3.5 h-3.5" />} label="Parking"
                             value={unit.parkingSpaces ? `${unit.parkingSpaces} Space(s)` : 'Included'} />
                  {unit.parkingType && (
                    <DetailRow icon={<Car className="w-3.5 h-3.5" />} label="Type"
                               value={unit.parkingType.replace(/\b\w/g, (l) => l.toUpperCase())} />
                  )}
                </div>
              </>
            )}

            {/* ── Installment plan ── */}
            {hasInstallment && (
              <>
                <SectionHeader icon={<CreditCard className="w-4 h-4" />} title="Payment Plan" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(unit.installmentPlan?.bookingAmount ?? 0) > 0 && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-600 uppercase">Booking</p>
                      <p className="text-sm font-black text-blue-700 mt-0.5">
                        {formatAmount(unit.installmentPlan!.bookingAmount!)}
                      </p>
                    </div>
                  )}
                  {(unit.installmentPlan?.downPayment ?? 0) > 0 && (
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                      <p className="text-[10px] font-bold text-purple-600 uppercase">Down Payment</p>
                      <p className="text-sm font-black text-purple-700 mt-0.5">
                        {formatAmount(unit.installmentPlan!.downPayment!)}
                      </p>
                    </div>
                  )}
                  {(unit.installmentPlan?.monthlyAmount ?? 0) > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Monthly</p>
                      <p className="text-sm font-black text-emerald-700 mt-0.5">
                        {formatAmount(unit.installmentPlan!.monthlyAmount!)}
                      </p>
                      {unit.installmentPlan!.monthlyCount && (
                        <p className="text-[10px] text-emerald-500 mt-0.5">
                          × {unit.installmentPlan!.monthlyCount} months
                        </p>
                      )}
                    </div>
                  )}
                  {(unit.installmentPlan?.possessionAmount ?? 0) > 0 && (
                    <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                      <p className="text-[10px] font-bold text-green-600 uppercase">On Possession</p>
                      <p className="text-sm font-black text-green-700 mt-0.5">
                        {formatAmount(unit.installmentPlan!.possessionAmount!)}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Investor intelligence ── */}
            {hasInvestor && (
              <>
                <SectionHeader icon={<TrendingDown className="w-4 h-4" />} title="Investor Intelligence" />
                <div className="rounded-xl border border-gray-100 px-3">
                  {(unit.investorIntelligence?.expectedRentalYield ?? 0) > 0 && (
                    <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Expected Rental Yield"
                               value={`${unit.investorIntelligence!.expectedRentalYield!.toFixed(1)}%`} highlight />
                  )}
                  {(unit.investorIntelligence?.estimatedMonthlyRent ?? 0) > 0 && (
                    <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Est. Monthly Rent"
                               value={formatPrice(unit.investorIntelligence!.estimatedMonthlyRent!)} />
                  )}
                  {unit.investorIntelligence?.capitalAppreciation && (
                    <DetailRow icon={<TrendingDown className="w-3.5 h-3.5" />} label="Capital Appreciation"
                               value={unit.investorIntelligence.capitalAppreciation} />
                  )}
                  {unit.investorIntelligence?.investmentScore && (
                    <DetailRow icon={<Shield className="w-3.5 h-3.5" />} label="Investment Score"
                               value={
                                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                                   ${getInvestmentScoreColor(unit.investorIntelligence.investmentScore)}`}>
                                   {unit.investorIntelligence.investmentScore.replace(/\b\w/g, (l) => l.toUpperCase())}
                                 </span>
                               } />
                  )}
                </div>
              </>
            )}

            {/* ── Features list ── */}
            {unit.features && unit.features.length > 0 && (
              <>
                <SectionHeader icon={<CheckCircle2 className="w-4 h-4" />} title="Features & Amenities" />
                <div className="flex flex-wrap gap-1.5">
                  {unit.features.map((f, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100
                                                text-xs text-gray-600 font-medium">
                      {f}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* ── Highlights ── */}
            {unit.highlights && unit.highlights.length > 0 && (
              <>
                <SectionHeader icon={<Star className="w-4 h-4" />} title="Highlights" />
                <ul className="space-y-1.5">
                  {unit.highlights.map((h, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{h}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* ── Description ── */}
            {unit.description && (
              <>
                <SectionHeader icon={<Info className="w-4 h-4" />} title="Description" />
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {unit.description}
                </div>
              </>
            )}

            {/* ── Engagement ── */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
              {(unit.views ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {unit.views?.toLocaleString()} views
                </span>
              )}
              {(unit.inquiryCount ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> {unit.inquiryCount} inquiries
                </span>
              )}
              {unit.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Listed {new Date(unit.createdAt).toLocaleDateString('en-PK', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>

          {/* ── CTA footer ── */}
          {!isSoldOut && onInquire && (
            <div className="sticky bottom-0 px-5 py-4 bg-white border-t border-gray-100
                            flex items-center gap-3">
              <button
                onClick={() => onInquire(unit._id, unit.unitNumber)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                           bg-gradient-to-r from-[#029bba] to-[#027a94]
                           text-white font-semibold text-sm
                           hover:from-[#02a8c9] hover:to-[#028aaa]
                           hover:shadow-lg transition-all duration-200"
              >
                <Send className="w-4 h-4" />
                Inquire About This Unit
              </button>

              <a
                href="tel:+923335877106"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                           border border-gray-200 bg-white text-gray-700
                           font-semibold text-sm hover:bg-gray-50
                           hover:border-gray-300 transition-all duration-200"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}