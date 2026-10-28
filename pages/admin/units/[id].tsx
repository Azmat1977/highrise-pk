// pages/admin/units/[id].tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
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
  CheckCircle2,
  XCircle,
  Star,
  Shield,
  Loader2,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  RotateCcw,
  Save,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  EyeOff,
  TrendingDown,
  DollarSign,
  Calendar,
  Clock,
  CornerDownRight,
  Compass,
  Mountain,
  Sparkles,
  Tag,
  RefreshCw,
  AlertTriangle,
  FileText,
  Activity,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface AdminUnitDetail {
  _id:              string;
  unitNumber:       string;
  slug?:            string;
  title?:           string;
  status:           string;
  category:         string;
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
  parkingNumber?:   string;

  // Features
  features?:            string[];
  includedAppliances?:  string[];
  finishingLevel?:      string;
  finishingDetails?:    string;

  // Media
  images?:         Array<{ url: string; publicId: string; caption?: string; isPrimary?: boolean; order?: number }>;
  floorPlanImage?: { url: string; publicId: string };
  layoutImage?:    { url: string; publicId: string };
  virtualTourUrl?: string;
  videoUrl?:       string;

  // Description
  description?:      string;
  shortDescription?: string;
  highlights?:       string[];
  termsAndConditions?: string;

  // Payment
  listingType?:      string;
  installmentPlan?:  Record<string, unknown>;
  charges?:          Record<string, unknown>;

  // Investor
  investorIntelligence?: {
    expectedRentalYield?:  number;
    estimatedMonthlyRent?: number;
    investmentScore?:      string;
    capitalAppreciation?:  string;
    appreciationPercent?:  number;
  };

  // Booking/Sold
  bookingInfo?: {
    reservedByName?:    string;
    reservedByPhone?:   string;
    reservedByEmail?:   string;
    reservedOn?:        string;
    reservedUntil?:     string;
    reservationAmount?: number;
    reservationExpired?: boolean;
  };
  soldInfo?: {
    soldToName?:  string;
    soldToPhone?: string;
    soldOn?:      string;
    soldPrice?:   number;
    paymentMethod?: string;
    saleNotes?:   string;
  };

  // Admin
  isPublished:   boolean;
  isVerified:    boolean;
  isFeatured:    boolean;
  isHotDeal:     boolean;
  adminNotes?:   string;

  // Soft delete
  isDeleted:     boolean;
  deletedAt?:    string;

  // Analytics
  views:         number;
  inquiryCount:  number;
  favoriteCount?: number;

  // Audit
  lastStatusChangedAt?: string;
  lastPriceChangedAt?:  string;
  createdAt:            string;
  updatedAt:            string;

  // Populated
  projectId?: {
    _id:         string;
    projectName: string;
    slug:        string;
    city?:       string;
    area?:       string;
    status?:     string;
    developerId?: string;
  };
  developerId?: {
    _id?:        string;
    companyName: string;
    email:       string;
    slug?:       string;
    status?:     string;
  };
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatPKR(amount?: number): string {
  if (!amount || amount <= 0) return '—';
  if (amount >= 10_000_000) {
    const crore = amount / 10_000_000;
    return `PKR ${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }
  if (amount >= 100_000) {
    const lac = amount / 100_000;
    return `${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(1)} Lac`;
  }
  return `PKR ${amount.toLocaleString()}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getStatusConfig(status: string): {
  label: string; bg: string; text: string; icon: React.ReactElement;
} {
  const configs: Record<string, { label: string; bg: string; text: string; icon: React.ReactElement }> = {
    available: { label: 'Available', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 className="w-4 h-4" /> },
    reserved:  { label: 'Reserved',  bg: 'bg-amber-100',   text: 'text-amber-700',   icon: <Clock className="w-4 h-4" /> },
    sold:      { label: 'Sold',      bg: 'bg-red-100',     text: 'text-red-700',     icon: <XCircle className="w-4 h-4" /> },
    on_hold:   { label: 'On Hold',   bg: 'bg-gray-100',    text: 'text-gray-600',    icon: <AlertCircle className="w-4 h-4" /> },
    cancelled: { label: 'Cancelled', bg: 'bg-gray-50',     text: 'text-gray-400',    icon: <XCircle className="w-4 h-4" /> },
  };
  return configs[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600', icon: <AlertCircle className="w-4 h-4" /> };
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

// ════════════════════════════════════════════════════
// BANNER
// ════════════════════════════════════════════════════

function Banner({
  type, message, onDismiss,
}: {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}): React.ReactElement {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50
                     px-5 py-3 rounded-xl shadow-xl flex items-center gap-3
                     ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success'
        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        : <AlertCircle className="w-5 h-5 flex-shrink-0" />
      }
      <p className="text-sm font-semibold">{message}</p>
      <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
// IMAGE GALLERY
// ════════════════════════════════════════════════════

function ImageGallery({ images }: { images: AdminUnitDetail['images'] }): React.ReactElement {
  const [current, setCurrent] = useState(0);
  const allImages = images ?? [];

  if (allImages.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <Home className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No images</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
        <Image
          src={allImages[current].url}
          alt={allImages[current].caption ?? `Image ${current + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((p) => (p > 0 ? p - 1 : allImages.length - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full
                         bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrent((p) => (p < allImages.length - 1 ? p + 1 : 0))}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full
                         bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full
                            bg-black/50 text-white text-[10px] font-bold">
              {current + 1} / {allImages.length}
            </div>
          </>
        )}
        {allImages[current].isPrimary && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full bg-[#029bba] text-white
                             text-[10px] font-bold flex items-center gap-0.5">
              <Star className="w-3 h-3" /> Primary
            </span>
          </div>
        )}
      </div>
      {allImages.length > 1 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0
                          border-2 transition-all
                          ${idx === current ? 'border-[#029bba]' : 'border-transparent opacity-60'}`}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="48px" />
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

function DetailRow({ icon, label, value, highlight }: {
  icon:      React.ReactElement;
  label:     string;
  value:     string | number | React.ReactElement | null | undefined;
  highlight?: boolean;
}): React.ReactElement | null {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 flex-shrink-0">{icon}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <span className={`text-sm font-semibold text-right ${highlight ? 'text-[#029bba]' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════
// SECTION HEADER
// ════════════════════════════════════════════════════

function SectionHeader({ icon, title }: { icon: React.ReactElement; title: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6">
      <span className="text-[#029bba]">{icon}</span>
      <h4 className="font-bold text-sm text-[#004063] uppercase tracking-wide">{title}</h4>
    </div>
  );
}

// ════════════════════════════════════════════════════
// ADMIN ACTION PANEL
// ════════════════════════════════════════════════════

function AdminActionPanel({
  unit,
  onUpdate,
  onTrash,
  onRestore,
  saving,
}: {
  unit:      AdminUnitDetail;
  onUpdate:  (data: Record<string, unknown>) => Promise<void>;
  onTrash:   (reason: string) => Promise<void>;
  onRestore: () => Promise<void>;
  saving:    boolean;
}): React.ReactElement {
  const [adminNotes, setAdminNotes]   = useState(unit.adminNotes ?? '');
  const [priceOverride, setPriceOverride] = useState<string>(unit.price ? String(unit.price) : '');
  const [trashReason, setTrashReason] = useState('');
  const [showTrash, setShowTrash]     = useState(false);
  const [showRestore, setShowRestore] = useState(false);

  return (
    <div className="space-y-4">

      {/* ── Toggle flags ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-bold text-sm text-[#004063] mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#029bba]" />
          Unit Controls
        </h3>

        <div className="space-y-3">
          {/* Published */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Published</p>
                <p className="text-[10px] text-gray-400">Visible on public pages</p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ isPublished: !unit.isPublished })}
              disabled={saving}
              className={`relative w-12 h-6 rounded-full transition-colors
                          ${unit.isPublished ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow
                               transition-transform
                               ${unit.isPublished ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Verified */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Verified</p>
                <p className="text-[10px] text-gray-400">Admin-verified unit</p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ isVerified: !unit.isVerified, ...((!unit.isVerified && !unit.isPublished) ? { isPublished: true } : {}) })}
              disabled={saving}
              className={`relative w-12 h-6 rounded-full transition-colors
                          ${unit.isVerified ? 'bg-[#029bba]' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow
                               transition-transform
                               ${unit.isVerified ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Featured */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Featured</p>
                <p className="text-[10px] text-gray-400">Highlighted in listings</p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ isFeatured: !unit.isFeatured })}
              disabled={saving}
              className={`relative w-12 h-6 rounded-full transition-colors
                          ${unit.isFeatured ? 'bg-amber-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow
                               transition-transform
                               ${unit.isFeatured ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Hot Deal */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Hot Deal</p>
                <p className="text-[10px] text-gray-400">Show hot deal badge</p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ isHotDeal: !unit.isHotDeal })}
              disabled={saving}
              className={`relative w-12 h-6 rounded-full transition-colors
                          ${unit.isHotDeal ? 'bg-red-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow
                               transition-transform
                               ${unit.isHotDeal ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Status override ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-bold text-sm text-[#004063] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#029bba]" />
          Status Override
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {['available', 'reserved', 'sold', 'on_hold', 'cancelled'].map((s) => {
            const cfg = getStatusConfig(s);
            return (
              <button
                key={s}
                onClick={() => unit.status !== s && onUpdate({ status: s })}
                disabled={saving || unit.status === s}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all
                            ${unit.status === s
                              ? `${cfg.bg} ${cfg.text} ring-2 ring-offset-1 ring-current`
                              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Price override ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-bold text-sm text-[#004063] mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#029bba]" />
          Price Override
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priceOverride}
            onChange={(e) => setPriceOverride(e.target.value)}
            placeholder="Enter new price"
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200
                       text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                       outline-none transition-colors"
          />
          <button
            onClick={() => {
              const p = Number(priceOverride);
              if (p > 0) onUpdate({ price: p });
            }}
            disabled={saving || !priceOverride || Number(priceOverride) <= 0}
            className="px-4 py-2.5 rounded-xl bg-[#029bba] text-white text-sm
                       font-semibold hover:bg-[#027a94] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
        </div>
        {priceOverride && Number(priceOverride) > 0 && (
          <p className="text-[10px] text-[#029bba] mt-1 font-semibold">
            {formatPKR(Number(priceOverride))}
          </p>
        )}
      </div>

      {/* ── Admin notes ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-bold text-sm text-[#004063] mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#029bba]" />
          Admin Notes
        </h3>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Internal notes — not visible to developers or public..."
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                     text-sm resize-none focus:border-[#029bba] focus:ring-1
                     focus:ring-[#029bba] outline-none transition-colors"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-gray-400">{adminNotes.length}/2000</p>
          <button
            onClick={() => onUpdate({ adminNotes })}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-gray-100 hover:bg-gray-200 text-gray-700
                       text-xs font-semibold transition-colors"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Notes
          </button>
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
        <h3 className="font-bold text-sm text-red-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h3>

        {!unit.isDeleted ? (
          <>
            {!showTrash ? (
              <button
                onClick={() => setShowTrash(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                           rounded-xl border-2 border-red-300 text-red-600
                           text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Unit
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-600 font-medium">
                  Provide a reason for deletion:
                </p>
                <textarea
                  value={trashReason}
                  onChange={(e) => setTrashReason(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Reason for deletion (min 5 characters)..."
                  className="w-full px-3 py-2 rounded-xl border border-red-200
                             text-xs resize-none focus:border-red-400 outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowTrash(false); setTrashReason(''); }}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200
                               text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (trashReason.trim().length >= 5) {
                        onTrash(trashReason.trim());
                        setShowTrash(false);
                      }
                    }}
                    disabled={saving || trashReason.trim().length < 5}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                               rounded-xl bg-red-500 text-white text-xs font-semibold
                               hover:bg-red-600 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="p-3 rounded-xl bg-red-100 border border-red-200 mb-3">
              <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                This unit is deleted
              </p>
              {unit.deletedAt && (
                <p className="text-[10px] text-red-500 mt-0.5">
                  Deleted on {formatDate(unit.deletedAt)}
                </p>
              )}
            </div>

            {!showRestore ? (
              <button
                onClick={() => setShowRestore(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                           rounded-xl border-2 border-blue-300 text-blue-600
                           text-sm font-semibold hover:bg-blue-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Restore Unit
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-blue-600 font-medium">
                  Unit will be restored as unpublished. Confirm?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRestore(false)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200
                               text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { onRestore(); setShowRestore(false); }}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                               rounded-xl bg-blue-500 text-white text-xs font-semibold
                               hover:bg-blue-600 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Restore
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════

export default function AdminUnitDetailPage(): React.ReactElement {
  const router      = useRouter();
  const { id }      = router.query;

  const [unit, setUnit]       = useState<AdminUnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [banner, setBanner]   = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Fetch unit ──
  const fetchUnit = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/units/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data?.unit) {
        setUnit(data.data.unit as AdminUnitDetail);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Unit not found' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Failed to load unit. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUnit();
  }, [fetchUnit]);

  // ── Update unit ──
  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/units/${id}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setBanner({ type: 'success', message: 'Unit updated successfully' });
        // Update local state immediately
        setUnit((prev) => prev ? { ...prev, ...data } as AdminUnitDetail : prev);
      } else {
        setBanner({ type: 'error', message: result.message ?? 'Update failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Update failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [id]);

  // ── Trash unit ──
  const handleTrash = useCallback(async (reason: string) => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/units/${id}`, {
        method:      'DELETE',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ reason }),
      });
      const result = await res.json();
      if (result.success) {
        setBanner({ type: 'success', message: 'Unit deleted successfully' });
        setUnit((prev) => prev ? { ...prev, isDeleted: true, deletedAt: new Date().toISOString() } : prev);
      } else {
        setBanner({ type: 'error', message: result.message ?? 'Delete failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Delete failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [id]);

  // ── Restore unit ──
  const handleRestore = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/units/${id}`, {
        method:      'PUT',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ reason: 'Restored by admin' }),
      });
      const result = await res.json();
      if (result.success) {
        setBanner({ type: 'success', message: 'Unit restored successfully' });
        setUnit((prev) => prev
          ? { ...prev, isDeleted: false, deletedAt: undefined, isPublished: false }
          : prev
        );
      } else {
        setBanner({ type: 'error', message: result.message ?? 'Restore failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Restore failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [id]);

  // ── Loading ──
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  // ── Not found ──
  if (!unit) {
    return (
      <AdminLayout>
        <div className="text-center py-24">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Unit Not Found</h2>
          <p className="text-gray-400 mb-6">This unit does not exist or has been permanently deleted.</p>
          <Link
            href="/admin/units"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-[#029bba] text-white text-sm font-semibold
                       hover:bg-[#027a94] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Units
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const statusConfig = getStatusConfig(unit.status);

  return (
    <AdminLayout>
      <Head>
        <title>Unit #{unit.unitNumber} | Highrise.pk Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Banner */}
      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/admin/units"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500
                       hover:text-[#029bba] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Units
          </Link>
          {unit.projectId && (
            <>
              <span className="text-gray-300">/</span>
              <Link
                href={`/admin/projects/${unit.projectId._id}`}
                className="text-sm text-gray-500 hover:text-[#029bba] transition-colors truncate max-w-[200px]"
              >
                {unit.projectId.projectName}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            {/* Status + deleted badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
              {unit.isDeleted && (
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-700
                                 text-xs font-bold flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Deleted
                </span>
              )}
              {unit.isVerified && (
                <span className="px-2 py-0.5 rounded-full bg-[#029bba]/10 text-[#029bba]
                                 text-[10px] font-bold flex items-center gap-0.5">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
              {unit.isFeatured && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700
                                 text-[10px] font-bold flex items-center gap-0.5">
                  <Star className="w-3 h-3" /> Featured
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-[#004063]">
              Unit #{unit.unitNumber}
            </h1>
            {unit.title && unit.title !== `Unit ${unit.unitNumber}` && (
              <p className="text-sm text-gray-500 mt-0.5">{unit.title}</p>
            )}

            {/* Breadcrumb info */}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
              {unit.projectId && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {unit.projectId.projectName}
                </span>
              )}
              {unit.projectId?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {unit.projectId.city}
                </span>
              )}
              {unit.developerId && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {unit.developerId.companyName}
                </span>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUnit}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500
                         hover:text-[#029bba] hover:border-[#029bba]/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {unit.projectId?.slug && unit.slug && (
              <a
                href={`/projects/${unit.projectId.slug}/units/${unit.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                           border border-gray-200 text-gray-600 text-sm font-semibold
                           hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                View Live
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main grid — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column (details) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Gallery */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <ImageGallery images={unit.images} />

            {/* Floor plan + layout */}
            {(unit.floorPlanImage || unit.layoutImage) && (
              <div className="flex gap-3 mt-3">
                {unit.floorPlanImage && (
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Floor Plan</p>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                      <Image
                        src={unit.floorPlanImage.url}
                        alt="Floor Plan"
                        fill
                        className="object-contain"
                        sizes="50vw"
                      />
                    </div>
                  </div>
                )}
                {unit.layoutImage && (
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Layout</p>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                      <Image
                        src={unit.layoutImage.url}
                        alt="Layout"
                        fill
                        className="object-contain"
                        sizes="50vw"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-baseline gap-3 flex-wrap mb-3">
              <span className="text-3xl font-black text-[#029bba]">
                {formatPKR(unit.price)}
              </span>
              {unit.previousPrice && unit.previousPrice > unit.price && (
                <span className="text-xl text-gray-400 line-through">
                  {formatPKR(unit.previousPrice)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {unit.pricePerUnit && (
                <span className="text-xs text-gray-500">
                  {formatPKR(unit.pricePerUnit)} / {unit.areaUnit ?? 'sqft'}
                </span>
              )}
              {unit.priceNegotiable && (
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600
                                 text-[10px] font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Negotiable
                </span>
              )}
              {unit.isPriceDropped && (
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700
                                 text-[10px] font-bold flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> Price Dropped
                </span>
              )}
              {unit.listingType && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600
                                 text-[10px] font-bold flex items-center gap-0.5">
                  <Tag className="w-3 h-3" />
                  {unit.listingType === 'installment' ? 'Installment' :
                   unit.listingType === 'full_payment' ? 'Full Payment' :
                   unit.listingType === 'both' ? 'Cash + Installment' :
                   unit.listingType === 'pre_launch' ? 'Pre-Launch' :
                   unit.listingType}
                </span>
              )}
            </div>
          </div>

          {/* Core details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

            <SectionHeader icon={<Maximize2 className="w-4 h-4" />} title="Size & Location" />
            <div className="rounded-xl border border-gray-100 px-4">
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
              {unit.floorName && (
                <DetailRow icon={<Layers className="w-3.5 h-3.5" />} label="Floor"
                           value={unit.floorName} />
              )}
              {unit.floorNumber !== undefined && !unit.floorName && (
                <DetailRow icon={<Layers className="w-3.5 h-3.5" />} label="Floor Number"
                           value={`Floor ${unit.floorNumber}`} />
              )}
              {unit.tower && (
                <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Tower"
                           value={unit.tower} />
              )}
              {unit.wing && (
                <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Wing"
                           value={unit.wing} />
              )}
              {unit.isCorner && (
                <DetailRow icon={<CornerDownRight className="w-3.5 h-3.5" />} label="Corner Unit"
                           value="Yes" />
              )}
              {unit.facing && (
                <DetailRow icon={<Compass className="w-3.5 h-3.5" />} label="Facing"
                           value={unit.facing.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} />
              )}
              {unit.view && (
                <DetailRow icon={<Mountain className="w-3.5 h-3.5" />} label="View"
                           value={unit.view.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} />
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

            {/* Room config */}
            {(unit.bedrooms || unit.bathrooms || unit.livingRooms || unit.kitchens) && (
              <>
                <SectionHeader
                  icon={unit.category === 'commercial'
                    ? <Store className="w-4 h-4" />
                    : <Home className="w-4 h-4" />
                  }
                  title="Room Configuration"
                />
                <div className="rounded-xl border border-gray-100 px-4">
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
                  {unit.cabins !== undefined && unit.cabins > 0 && (
                    <DetailRow icon={<Store className="w-3.5 h-3.5" />} label="Cabins" value={unit.cabins} />
                  )}
                  {unit.seatingCapacity !== undefined && unit.seatingCapacity > 0 && (
                    <DetailRow icon={<Store className="w-3.5 h-3.5" />} label="Seating Capacity" value={unit.seatingCapacity} />
                  )}
                </div>
              </>
            )}

            {/* Parking */}
            {unit.parkingIncluded && (
              <>
                <SectionHeader icon={<Car className="w-4 h-4" />} title="Parking" />
                <div className="rounded-xl border border-gray-100 px-4">
                  <DetailRow icon={<Car className="w-3.5 h-3.5" />} label="Parking Spaces"
                             value={unit.parkingSpaces ? `${unit.parkingSpaces} Space(s)` : 'Included'} />
                  {unit.parkingType && (
                    <DetailRow icon={<Car className="w-3.5 h-3.5" />} label="Parking Type"
                               value={unit.parkingType.replace(/\b\w/g, (l) => l.toUpperCase())} />
                  )}
                </div>
              </>
            )}

            {/* Features */}
            {unit.features && unit.features.length > 0 && (
              <>
                <SectionHeader icon={<CheckCircle2 className="w-4 h-4" />} title="Features" />
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

            {/* Description */}
            {unit.description && (
              <>
                <SectionHeader icon={<FileText className="w-4 h-4" />} title="Description" />
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {unit.description}
                </p>
              </>
            )}
          </div>

          {/* Booking / Sold info */}
          {(unit.bookingInfo || unit.soldInfo) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {unit.bookingInfo && unit.status === 'reserved' && (
                <>
                  <SectionHeader icon={<Clock className="w-4 h-4" />} title="Booking Information" />
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4">
                    <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Reserved By"
                               value={unit.bookingInfo.reservedByName ?? '—'} />
                    <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Phone"
                               value={unit.bookingInfo.reservedByPhone ?? '—'} />
                    <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Reserved On"
                               value={formatDate(unit.bookingInfo.reservedOn)} />
                    <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Reserved Until"
                               value={formatDate(unit.bookingInfo.reservedUntil)} />
                    {unit.bookingInfo.reservationAmount && (
                      <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Booking Amount"
                                 value={formatPKR(unit.bookingInfo.reservationAmount)} highlight />
                    )}
                    {unit.bookingInfo.reservationExpired && (
                      <div className="py-2">
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600
                                         text-[10px] font-bold">
                          Reservation Expired
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {unit.soldInfo && unit.status === 'sold' && (
                <>
                  <SectionHeader icon={<CheckCircle2 className="w-4 h-4" />} title="Sale Information" />
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4">
                    <DetailRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Sold To"
                               value={unit.soldInfo.soldToName ?? '—'} />
                    <DetailRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Sold On"
                               value={formatDate(unit.soldInfo.soldOn)} />
                    <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Sold Price"
                               value={formatPKR(unit.soldInfo.soldPrice)} highlight />
                    {unit.soldInfo.paymentMethod && (
                      <DetailRow icon={<Tag className="w-3.5 h-3.5" />} label="Payment Method"
                                 value={unit.soldInfo.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} />
                    )}
                    {unit.soldInfo.saleNotes && (
                      <div className="py-2">
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Sale Notes</p>
                        <p className="text-sm text-gray-700">{unit.soldInfo.saleNotes}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Analytics */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader icon={<Activity className="w-4 h-4" />} title="Analytics & Audit" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-100 text-center">
                <Eye className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
                <p className="text-xl font-black text-cyan-700">{unit.views}</p>
                <p className="text-[10px] text-cyan-500 font-semibold">Views</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                <MessageSquare className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-xl font-black text-amber-700">{unit.inquiryCount}</p>
                <p className="text-[10px] text-amber-500 font-semibold">Inquiries</p>
              </div>
              <div className="p-3 rounded-xl bg-pink-50 border border-pink-100 text-center">
                <Star className="w-5 h-5 text-pink-600 mx-auto mb-1" />
                <p className="text-xl font-black text-pink-700">{unit.favoriteCount ?? 0}</p>
                <p className="text-[10px] text-pink-500 font-semibold">Favorites</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 px-4">
              <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created"
                         value={formatDate(unit.createdAt)} />
              <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Last Updated"
                         value={formatDate(unit.updatedAt)} />
              {unit.lastStatusChangedAt && (
                <DetailRow icon={<Activity className="w-3.5 h-3.5" />} label="Status Changed"
                           value={formatDate(unit.lastStatusChangedAt)} />
              )}
              {unit.lastPriceChangedAt && (
                <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Price Changed"
                           value={formatDate(unit.lastPriceChangedAt)} />
              )}
            </div>

            {/* Admin notes display */}
            {unit.adminNotes && (
              <div className="mt-4 p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                <p className="text-[10px] font-bold text-yellow-700 uppercase mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Admin Notes
                </p>
                <p className="text-xs text-yellow-800 whitespace-pre-line">{unit.adminNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column (admin controls) ── */}
        <div className="space-y-4">

          {/* Unit summary card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                {unit.category === 'commercial'
                  ? <Store className="w-5 h-5 text-[#029bba]" />
                  : <Home className="w-5 h-5 text-[#029bba]" />
                }
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">
                  {unit.unitTypeName ?? unit.unitType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">{unit.category}</p>
              </div>
            </div>

            {/* Published status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl
                             ${unit.isPublished
                               ? 'bg-emerald-50 border border-emerald-100'
                               : 'bg-gray-50 border border-gray-200'
                             }`}>
              {unit.isPublished
                ? <Eye className="w-4 h-4 text-emerald-600" />
                : <EyeOff className="w-4 h-4 text-gray-400" />
              }
              <span className={`text-xs font-bold
                                ${unit.isPublished ? 'text-emerald-700' : 'text-gray-500'}`}>
                {unit.isPublished ? 'Published — visible to public' : 'Unpublished — hidden from public'}
              </span>
            </div>
          </div>

          {/* Admin action panel */}
          <AdminActionPanel
            unit={unit}
            onUpdate={handleUpdate}
            onTrash={handleTrash}
            onRestore={handleRestore}
            saving={saving}
          />

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-bold text-sm text-[#004063] mb-3">Quick Links</h3>
            <div className="space-y-2">
              {unit.projectId && (
                <Link
                  href={`/admin/projects/${unit.projectId._id}`}
                  className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50
                             text-sm text-gray-700 hover:text-[#029bba] transition-colors"
                >
                  <Building2 className="w-4 h-4 text-gray-400" />
                  View Project
                </Link>
              )}
              {unit.developerId?.slug && (
                <Link
                  href={`/admin/developers/${unit.developerId._id ?? ''}`}
                  className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50
                             text-sm text-gray-700 hover:text-[#029bba] transition-colors"
                >
                  <Building2 className="w-4 h-4 text-gray-400" />
                  View Developer
                </Link>
              )}
              <Link
                href="/admin/units"
                className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50
                           text-sm text-gray-700 hover:text-[#029bba] transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-400" />
                Back to All Units
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}