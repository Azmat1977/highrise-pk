// pages/projects/[slug]/units/index.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Search,
  Grid3x3,
  List,
  Home,
  Store,
  Briefcase,
  Car,
  Coffee,
  Building2,
  CheckCircle,
  ChevronRight,
  MapPin,
  SlidersHorizontal,
  X,
  TrendingUp,
  Filter,
  ArrowUpDown,
  Bed,
  Bath,
  Maximize2,
  Tag,
  AlertCircle,
  Clock,
  Ban,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface UnitItem {
  _id: string;
  unitNumber: string;
  floorNumber: number;
  floorName?: string;
  unitType: string;
  listingType?: 'full_payment' | 'installment' | 'both' | 'pre_launch';
  price: number;
  areaSqft?: number;
  areaMarla?: number;
  status: 'available' | 'reserved' | 'sold' | 'on_hold' | 'cancelled';
  bedrooms?: number;
  bathrooms?: number;
  facing?: string;
  view?: string;
  images?: { url: string; caption?: string }[];
  projectSlug?: string;
  projectName?: string;
  city?: string;
  areaName?: string;
}

interface ProjectMeta {
  _id: string;
  slug: string;
  projectName: string;
  city: string;
  areaName: string;
  featureImageUrl?: string;
}

interface ApiResponse {
  success: boolean;
  units?: UnitItem[];
  pagination?: {
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  message?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'price_asc' | 'price_desc' | 'floor_asc' | 'floor_desc' | 'area_asc' | 'area_desc';

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: React.ReactElement;
  dot: string;
}> = {
  available: {
    label: 'Available',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  reserved: {
    label: 'Reserved',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  sold: {
    label: 'Sold',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    icon: <Ban className="w-3.5 h-3.5" />,
  },
  on_hold: {
    label: 'On Hold',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-gray-100',
    text: 'text-gray-400',
    border: 'border-gray-200',
    dot: 'bg-gray-300',
    icon: <X className="w-3.5 h-3.5" />,
  },
};

const LISTING_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  full_payment: { label: 'Full Payment', bg: 'bg-[#029bba]/10', text: 'text-[#029bba]' },
  installment:  { label: 'Installment',  bg: 'bg-purple-100',   text: 'text-purple-700' },
  both:         { label: 'Flexible',     bg: 'bg-teal-100',     text: 'text-teal-700' },
  pre_launch:   { label: 'Pre-Launch',   bg: 'bg-indigo-100',   text: 'text-indigo-700' },
};

const UNIT_TYPE_ICONS: Record<string, React.ReactElement> = {
  apartment: <Home className="w-4 h-4" />,
  shop:      <Store className="w-4 h-4" />,
  office:    <Briefcase className="w-4 h-4" />,
  parking:   <Car className="w-4 h-4" />,
  penthouse: <Building2 className="w-4 h-4" />,
  foodcourt: <Coffee className="w-4 h-4" />,
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'price_asc',   label: 'Price: Low to High' },
  { value: 'price_desc',  label: 'Price: High to Low' },
  { value: 'floor_asc',   label: 'Floor: Low to High' },
  { value: 'floor_desc',  label: 'Floor: High to Low' },
  { value: 'area_asc',    label: 'Area: Small to Large' },
  { value: 'area_desc',   label: 'Area: Large to Small' },
];

// ============================================
// HELPERS
// ============================================

function formatPrice(price: number): string {
  if (!price) return 'Contact for Price';
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

function getUnitTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    apartment: 'Apartment',
    shop:      'Shop',
    office:    'Office',
    parking:   'Parking',
    penthouse: 'Penthouse',
    foodcourt: 'Food Court',
    studio:    'Studio',
    duplex:    'Duplex',
    warehouse: 'Warehouse',
  };
  return labels[type?.toLowerCase()] ?? (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unit');
}

function sortUnits(units: UnitItem[], sort: SortOption): UnitItem[] {
  return [...units].sort((a, b) => {
    switch (sort) {
      case 'price_asc':   return (a.price ?? 0) - (b.price ?? 0);
      case 'price_desc':  return (b.price ?? 0) - (a.price ?? 0);
      case 'floor_asc':   return (a.floorNumber ?? 0) - (b.floorNumber ?? 0);
      case 'floor_desc':  return (b.floorNumber ?? 0) - (a.floorNumber ?? 0);
      case 'area_asc':    return (a.areaSqft ?? 0) - (b.areaSqft ?? 0);
      case 'area_desc':   return (b.areaSqft ?? 0) - (a.areaSqft ?? 0);
      default:            return 0;
    }
  });
}

// ============================================
// UNIT CARD — GRID VIEW
// ============================================

function UnitCardGrid({
  unit,
  projectSlug,
}: {
  unit: UnitItem;
  projectSlug: string;
}): React.ReactElement {
  const status   = STATUS_CONFIG[unit.status] ?? STATUS_CONFIG.available;
  const listing  = unit.listingType ? LISTING_TYPE_CONFIG[unit.listingType] : null;
  const typeIcon = UNIT_TYPE_ICONS[unit.unitType?.toLowerCase()] ?? <Building2 className="w-4 h-4" />;
  const isAvailable = unit.status === 'available';
  const image = unit.images?.[0]?.url;

  return (
    <Link
      href={`/projects/${projectSlug}/units/${unit._id}`}
      className={`group block bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300
        hover:-translate-y-1 hover:shadow-xl
        ${isAvailable ? 'border-gray-200 hover:border-[#029bba]/40' : 'border-gray-200 opacity-80'}`}
    >
      {/* Image / placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={`Unit ${unit.unitNumber}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center mx-auto mb-2 text-gray-400">
                {typeIcon}
              </div>
              <p className="text-xs text-gray-400">No Image</p>
            </div>
          </div>
        )}

        {/* Status badge — top left */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${status.bg} ${status.text} ${status.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* Listing type — top right */}
        {listing && (
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${listing.bg} ${listing.text}`}>
              {listing.label}
            </span>
          </div>
        )}

        {/* Floor badge — bottom left */}
        <div className="absolute bottom-3 left-3">
          <span className="px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-lg">
            {unit.floorName ?? `Floor ${unit.floorNumber}`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Unit number + type */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base group-hover:text-[#029bba] transition-colors">
              Unit {unit.unitNumber}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-gray-500 text-xs">
              <span className="text-gray-400">{typeIcon}</span>
              {getUnitTypeLabel(unit.unitType)}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] mt-1 transition-colors flex-shrink-0" />
        </div>

        {/* Specs row */}
        <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-600">
          {unit.areaSqft && (
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
              {unit.areaSqft.toLocaleString()} sqft
            </span>
          )}
          {unit.areaMarla && !unit.areaSqft && (
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
              {unit.areaMarla} Marla
            </span>
          )}
          {(unit.bedrooms ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-gray-400" />
              {unit.bedrooms} Bed
            </span>
          )}
          {(unit.bathrooms ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5 text-gray-400" />
              {unit.bathrooms} Bath
            </span>
          )}
          {unit.facing && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
              {unit.facing}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[#029bba] font-black text-lg">
            {formatPrice(unit.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// UNIT CARD — LIST VIEW
// ============================================

function UnitCardList({
  unit,
  projectSlug,
}: {
  unit: UnitItem;
  projectSlug: string;
}): React.ReactElement {
  const status   = STATUS_CONFIG[unit.status] ?? STATUS_CONFIG.available;
  const listing  = unit.listingType ? LISTING_TYPE_CONFIG[unit.listingType] : null;
  const typeIcon = UNIT_TYPE_ICONS[unit.unitType?.toLowerCase()] ?? <Building2 className="w-4 h-4" />;
  const image    = unit.images?.[0]?.url;

  return (
    <Link
      href={`/projects/${projectSlug}/units/${unit._id}`}
      className="group flex gap-4 bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg hover:border-[#029bba]/30 transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
        {image ? (
          <Image src={image} alt={`Unit ${unit.unitNumber}`} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            {typeIcon}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-[#029bba] transition-colors">
              Unit {unit.unitNumber}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {getUnitTypeLabel(unit.unitType)} • {unit.floorName ?? `Floor ${unit.floorNumber}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${status.bg} ${status.text} ${status.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {listing && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${listing.bg} ${listing.text}`}>
                {listing.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
          {unit.areaSqft && (
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />{unit.areaSqft.toLocaleString()} sqft
            </span>
          )}
          {(unit.bedrooms ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="w-3 h-3" />{unit.bedrooms} Bed
            </span>
          )}
          {(unit.bathrooms ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="w-3 h-3" />{unit.bathrooms} Bath
            </span>
          )}
          {unit.facing && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />{unit.facing}
            </span>
          )}
        </div>
      </div>

      {/* Price + arrow */}
      <div className="flex flex-col items-end justify-between flex-shrink-0">
        <p className="font-black text-[#029bba] text-base">
          {formatPrice(unit.price)}
        </p>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] transition-colors" />
      </div>
    </Link>
  );
}

// ============================================
// SKELETON LOADER
// ============================================

function UnitSkeleton({ view }: { view: ViewMode }): React.ReactElement {
  if (view === 'list') {
    return (
      <div className="flex gap-4 bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
        <div className="w-24 h-20 rounded-xl bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-24 space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function ProjectUnitsPage(): React.ReactElement {
  const router = useRouter();
  const { slug } = router.query;

  // Data
  const [project, setProject]   = useState<ProjectMeta | null>(null);
  const [allUnits, setAllUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Filters
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('available');
  const [typeFilter, setTypeFilter]   = useState<string>('');
  const [floorFilter, setFloorFilter] = useState<string>('');
  const [maxPrice, setMaxPrice]       = useState<number>(0);

  // Sort + view
  const [sortBy, setSortBy]     = useState<SortOption>('floor_asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // ── Fetch project + units ──
  useEffect(() => {
    if (!slug || typeof slug !== 'string') return;

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        // Step 1: resolve slug → project
        const projRes = await fetch(`/api/projects/${slug}`);
        const projData: { success: boolean; project?: ProjectMeta; message?: string } =
          await projRes.json();

        if (!projRes.ok || !projData.success || !projData.project) {
          if (!cancelled) setError(projData.message || 'Project not found.');
          return;
        }

        if (!cancelled) setProject(projData.project);

        // Step 2: fetch units using project _id
        const unitsRes = await fetch(
          `/api/projects/${projData.project._id}/units?limit=200`
        );
        const unitsData: {
          success: boolean;
          data?: {
            units?: UnitItem[];
            stats?: { count: number; total: number };
            pagination?: { total: number; hasMore: boolean };
          };
          units?: UnitItem[];
          message?: string;
        } = await unitsRes.json();

        // API returns data.units (V5.0.0) — with fallback for older shape
        const loadedUnits =
          unitsData.data?.units ??
          unitsData.units ??
          [];

        if (!cancelled) {
          setAllUnits(loadedUnits);
          const prices = loadedUnits.map((u: UnitItem) => u.price).filter(Boolean);
          if (prices.length > 0) setMaxPrice(Math.max(...prices));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load units.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [slug]);

  // ── Derived filter options ──
  const unitTypes  = Array.from(new Set(allUnits.map(u => u.unitType).filter(Boolean)));
  const floors     = Array.from(new Set(allUnits.map(u => u.floorNumber))).sort((a, b) => a - b);
  const priceMax   = maxPrice || Math.max(...allUnits.map(u => u.price), 0);
  const [priceFilter, setPriceFilter] = useState(0);

  // Set price filter ceiling when data loads
  useEffect(() => {
    if (priceMax > 0 && priceFilter === 0) setPriceFilter(priceMax);
  }, [priceMax]);

  // ── Filtered + sorted units ──
  const filteredUnits = sortUnits(
    allUnits.filter(u => {
      if (statusFilter && statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (typeFilter   && u.unitType !== typeFilter) return false;
      if (floorFilter  && String(u.floorNumber) !== floorFilter) return false;
      if (priceFilter  && priceFilter < priceMax && u.price > priceFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          u.unitNumber?.toLowerCase().includes(q) ||
          u.unitType?.toLowerCase().includes(q) ||
          u.floorName?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    }),
    sortBy
  );

  // ── Stats ──
  const stats = {
    total:     allUnits.length,
    available: allUnits.filter(u => u.status === 'available').length,
    reserved:  allUnits.filter(u => u.status === 'reserved').length,
    sold:      allUnits.filter(u => u.status === 'sold').length,
  };

  const hasActiveFilters =
    statusFilter !== 'available' || !!typeFilter || !!floorFilter ||
    !!search.trim() || (priceFilter > 0 && priceFilter < priceMax);

  function clearFilters() {
    setSearch('');
    setStatusFilter('available');
    setTypeFilter('');
    setFloorFilter('');
    setPriceFilter(priceMax);
  }

  const projectSlug = typeof slug === 'string' ? slug : (project?.slug ?? '');

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-gradient-to-r from-[#029bba] to-[#004063] text-white py-4 px-4">
          <div className="max-w-7xl mx-auto animate-pulse">
            <div className="h-7 bg-white/20 rounded w-1/3" />
            <div className="h-4 bg-white/10 rounded w-1/4 mt-2" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <UnitSkeleton key={i} view="grid" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not found ──
  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Units Not Found</h2>
          <p className="text-gray-500 mb-6">{error || 'The project you are looking for does not exist.'}</p>
          <Link href="/projects"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl font-medium hover:bg-[#027a94] transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{project.projectName} — Units & Inventory | Highrise.pk</title>
        <meta
          name="description"
          content={`Browse available units in ${project.projectName}, ${project.areaName}, ${project.city}. View prices, floor plans and availability on Highrise.pk.`}
        />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk'}/projects/${project.slug}/units`} />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ═══════════ STICKY HEADER ═══════════ */}
        <div className="bg-gradient-to-r from-[#029bba] to-[#004063] text-white sticky top-0 z-30 shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${projectSlug}`}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Back to Project</span>
              </Link>
              <div className="w-px h-6 bg-white/20" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold leading-none truncate">
                  {project.projectName}
                </h1>
                <div className="flex items-center gap-1.5 mt-1 text-white/70 text-xs">
                  <MapPin className="w-3 h-3" />
                  {project.areaName}, {project.city}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ BREADCRUMB ═══════════ */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            <nav className="flex items-center gap-2 text-xs text-gray-500">
              <Link href="/" className="hover:text-[#029bba] transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/projects" className="hover:text-[#029bba] transition-colors">Projects</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/projects/${projectSlug}`} className="hover:text-[#029bba] transition-colors truncate max-w-[150px]">
                {project.projectName}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-900 font-medium">Units</span>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* ═══════════ STATS BAR ═══════════ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Units',      value: stats.total,     bg: 'bg-[#029bba]/10', text: 'text-[#029bba]',  icon: <Building2 className="w-5 h-5" /> },
              { label: 'Available',        value: stats.available, bg: 'bg-green-100',    text: 'text-green-700', icon: <CheckCircle className="w-5 h-5" /> },
              { label: 'Reserved',         value: stats.reserved,  bg: 'bg-amber-100',    text: 'text-amber-700', icon: <Clock className="w-5 h-5" /> },
              { label: 'Sold',             value: stats.sold,      bg: 'bg-red-100',      text: 'text-red-700',   icon: <Ban className="w-5 h-5" /> },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg} ${stat.text}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className={`text-2xl font-black ${stat.text}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ═══════════ TOOLBAR ═══════════ */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search unit number, type, floor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent outline-none transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent outline-none bg-white"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Filter toggle (mobile) */}
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  showFilters ? 'bg-[#029bba] text-white border-[#029bba]' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>

              {/* View toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl flex-shrink-0">
                <button onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#029bba]' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Grid view">
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#029bba]' : 'text-gray-400 hover:text-gray-600'}`}
                  title="List view">
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Quick filter pills ── */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              {/* Status pills */}
              {['all', 'available', 'reserved', 'sold', 'on_hold'].map(s => {
                const cfg = s === 'all'
                  ? { label: 'All Status', bg: 'bg-gray-100', text: 'text-gray-700', activeBg: 'bg-gray-900', activeText: 'text-white' }
                  : { label: STATUS_CONFIG[s]?.label, bg: STATUS_CONFIG[s]?.bg, text: STATUS_CONFIG[s]?.text, activeBg: STATUS_CONFIG[s]?.bg, activeText: STATUS_CONFIG[s]?.text };
                const isActive = statusFilter === s;
                return (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isActive
                        ? s === 'all'
                          ? 'bg-gray-900 text-white border-gray-900'
                          : `${STATUS_CONFIG[s]?.bg} ${STATUS_CONFIG[s]?.text} ${STATUS_CONFIG[s]?.border} ring-2 ring-offset-1 ring-current`
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}>
                    {cfg.label}
                  </button>
                );
              })}

              {/* Divider */}
              {unitTypes.length > 0 && <div className="w-px h-6 bg-gray-200 self-center" />}

              {/* Unit type pills */}
              {unitTypes.map(type => (
                <button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    typeFilter === type
                      ? 'bg-[#029bba] text-white border-[#029bba]'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {getUnitTypeLabel(type)}
                </button>
              ))}

              {/* Clear */}
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" />Clear All
                </button>
              )}
            </div>

            {/* ── Advanced filters (mobile accordion / always visible desktop) ── */}
            <div className={`mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 ${showFilters ? 'block' : 'hidden sm:grid'}`}>
              {/* Floor filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Floor</label>
                <select value={floorFilter} onChange={e => setFloorFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#029bba] outline-none bg-white">
                  <option value="">All Floors</option>
                  {floors.map(f => (
                    <option key={f} value={String(f)}>Floor {f}</option>
                  ))}
                </select>
              </div>

              {/* Price range */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Max Price: {priceFilter > 0 ? formatPrice(priceFilter) : 'Any'}
                </label>
                <input
                  type="range"
                  min={0}
                  max={priceMax || 100_000_000}
                  step={500_000}
                  value={priceFilter || priceMax}
                  onChange={e => setPriceFilter(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#029bba]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>{formatPrice(priceMax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ RESULTS HEADER ═══════════ */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredUnits.length}</span> of{' '}
              <span className="font-bold text-gray-900">{allUnits.length}</span> units
            </p>
            {hasActiveFilters && (
              <p className="text-xs text-[#029bba] font-medium">Filters active</p>
            )}
          </div>

          {/* ═══════════ UNIT GRID / LIST ═══════════ */}
          {filteredUnits.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Units Found</h3>
              <p className="text-gray-500 mb-6">
                {allUnits.length === 0
                  ? 'No units have been added to this project yet.'
                  : 'Try adjusting your filters to see more units.'}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  className="px-6 py-2.5 bg-[#029bba] text-white rounded-xl font-medium hover:bg-[#027a94] transition-colors">
                  Clear All Filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUnits.map(unit => (
                <UnitCardGrid key={unit._id} unit={unit} projectSlug={projectSlug} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUnits.map(unit => (
                <UnitCardList key={unit._id} unit={unit} projectSlug={projectSlug} />
              ))}
            </div>
          )}

          {/* ═══════════ BACK LINK ═══════════ */}
          <div className="mt-12 text-center">
            <Link href={`/projects/${projectSlug}`}
              className="inline-flex items-center gap-2 text-[#029bba] font-medium hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to {project.projectName}
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}