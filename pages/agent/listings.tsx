// ========== FILE: pages/agent/listings.tsx ==========
// Agent Property Listings — Enterprise Redesign V6.4.3
// Features: grid/list toggle, filters, search, sort, pagination,
//           inline delete confirmation, click-to-filter stats
// ====================================================

import Image from "next/image";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import {
  Home, Plus, Search, Eye, Edit, Trash2, CheckCircle, Clock,
  XCircle, MapPin, Maximize, Bed, Bath, Grid, List, Loader2,
  RefreshCw, ExternalLink, Heart, MessageSquare, ChevronLeft,
  ChevronRight, AlertTriangle, Building2, Filter as FilterIcon,
  SlidersHorizontal,
} from "lucide-react";
import AgentLayout from "@/components/agent/AgentLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyImage {
  url:       string;
  publicId?: string;
  isPrimary?: boolean;
}

interface Property {
  _id:              string;
  title:            string;
  slug?:            string;
  price:            number;
  totalPrice?:      number;
  area:             number;
  unit:             string;
  city:             string;
  locality?:        string;
  society?:         string;
  propertyType:     string;
  listingType:      "full_payment" | "installment" | "rent";
  bedrooms?:        number;
  bathrooms?:       number;
  status:           string;
  verification?: {
    status?: string;
  };
  views:            number;
  favoriteCount?:   number;
  inquiryCount?:    number;
  images:           PropertyImage[];
  featureImageUrl?: string;
  createdAt:        string;
}

type FilterStatus = "all" | "approved" | "verified" | "pending" | "rejected" | "under_review";
type SortOption   = "newest" | "oldest" | "price_high" | "price_low" | "views";
type ViewMode     = "grid" | "list";

interface ListingStats {
  total:      number;
  active:     number;
  pending:    number;
  rejected:   number;
  totalViews: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000)    return `${(price / 100_000).toFixed(2)} Lac`;
  return price.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  });
}

function getStatusValue(property: Property): string {
  return property.verification?.status ?? property.status ?? "draft";
}

// ─── Config ───────────────────────────────────────────────────────────────────

type StatusKey = "approved" | "verified" | "pending" | "under_review" | "rejected" | "draft" | "flagged";

const STATUS_CONFIG: Record<StatusKey, {
  label:     string;
  icon:      React.ReactNode;
  className: string;
}> = {
  approved:      { label: "Active",     icon: <CheckCircle className="w-3 h-3" />, className: "bg-emerald-100 text-emerald-700" },
  verified:      { label: "Active",     icon: <CheckCircle className="w-3 h-3" />, className: "bg-emerald-100 text-emerald-700" },
  pending:       { label: "Pending",    icon: <Clock className="w-3 h-3" />,       className: "bg-amber-100 text-amber-700" },
  under_review:  { label: "In Review",  icon: <Clock className="w-3 h-3" />,       className: "bg-blue-100 text-blue-700" },
  rejected:      { label: "Rejected",   icon: <XCircle className="w-3 h-3" />,     className: "bg-red-100 text-red-700" },
  draft:         { label: "Draft",      icon: <Edit className="w-3 h-3" />,        className: "bg-gray-100 text-gray-700" },
  flagged:       { label: "Flagged",    icon: <AlertTriangle className="w-3 h-3" />, className: "bg-orange-100 text-orange-700" },
};

function StatusBadge({ status }: { status: string }): React.ReactElement | null {
  const cfg = STATUS_CONFIG[status as StatusKey];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

const LISTING_TYPE_CONFIG: Record<string, {
  label:     string;
  className: string;
}> = {
  full_payment: { label: "Sale",        className: "bg-[#029bba]/10 text-[#029bba]" },
  installment:  { label: "Installment", className: "bg-violet-100 text-violet-700" },
  rent:         { label: "Rent",        className: "bg-teal-100 text-teal-700" },
};

function ListingTypeBadge({ type }: { type: string }): React.ReactElement | null {
  const cfg = LISTING_TYPE_CONFIG[type];
  if (!cfg) return null;
  return (
    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

type StatColor = "teal" | "green" | "amber" | "red" | "blue";

const STAT_COLORS: Record<StatColor, {
  activeBorder: string;
  activeText:   string;
  iconBg:       string;
  iconColor:    string;
}> = {
  teal:  { activeBorder: "border-[#029bba] ring-2 ring-[#029bba]/20", activeText: "text-[#029bba]",  iconBg: "bg-[#029bba]/10", iconColor: "text-[#029bba]" },
  green: { activeBorder: "border-emerald-500 ring-2 ring-emerald-200",  activeText: "text-emerald-600", iconBg: "bg-emerald-100",  iconColor: "text-emerald-600" },
  amber: { activeBorder: "border-amber-500 ring-2 ring-amber-200",      activeText: "text-amber-600",   iconBg: "bg-amber-100",    iconColor: "text-amber-600" },
  red:   { activeBorder: "border-red-500 ring-2 ring-red-200",          activeText: "text-red-600",     iconBg: "bg-red-100",      iconColor: "text-red-600" },
  blue:  { activeBorder: "border-blue-500 ring-2 ring-blue-200",        activeText: "text-blue-600",    iconBg: "bg-blue-100",     iconColor: "text-blue-600" },
};

interface StatCardProps {
  label:   string;
  value:   number | string;
  color:   StatColor;
  icon:    React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

function StatCard({
  label, value, color, icon, active = false, onClick,
}: StatCardProps): React.ReactElement {
  const c = STAT_COLORS[color];
  const isClickable = Boolean(onClick);

  const content = (
    <div
      className={`w-full p-4 bg-white rounded-2xl border-2 text-left transition-all shadow-sm ${
        isClickable ? "hover:shadow-md cursor-pointer" : ""
      } ${
        active ? c.activeBorder : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg} ${c.iconColor}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`text-2xl font-black ${active ? c.activeText : "text-gray-800"}`}>
            {value}
          </p>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
            {label}
          </p>
        </div>
      </div>
    </div>
  );

  if (isClickable) {
    return <button type="button" onClick={onClick} className="w-full">{content}</button>;
  }
  return content;
}

// ─── Property Thumbnail ───────────────────────────────────────────────────────

function PropertyThumbnail({
  src, alt, className,
}: {
  src?:      string;
  alt:      string;
  className: string;
}): React.ReactElement {
  if (src) {
    return (
      <div className={`${className} relative`}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
    );
  }
  return (
    <div className={`${className} flex items-center justify-center bg-gray-100`}>
      <Home className="w-8 h-8 text-gray-300" />
    </div>
  );
}

// ─── Delete Confirmation Bar ──────────────────────────────────────────────────

interface DeleteConfirmProps {
  onConfirm: () => void;
  onCancel:  () => void;
  deleting:  boolean;
}

function DeleteConfirmBar({ onConfirm, onCancel, deleting }: DeleteConfirmProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
      <span className="text-sm text-red-700 font-semibold flex-1">
        Delete this property?
      </span>
      <button
        type="button"
        onClick={onCancel}
        disabled={deleting}
        className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={deleting}
        className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        {deleting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Trash2 className="w-3 h-3" />
        )}
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

interface PropertyCardProps {
  property:          Property;
  confirmingDelete:  string | null;
  deletingId:        string | null;
  onDeleteRequest:   (id: string) => void;
  onDeleteConfirm:   (id: string) => void;
  onDeleteCancel:    () => void;
}

function GridCard({
  property, confirmingDelete, deletingId,
  onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: PropertyCardProps): React.ReactElement {
  const isConfirming = confirmingDelete === property._id;
  const isDeleting   = deletingId === property._id;
  const primary      = property.images?.find((i) => i.isPrimary) ?? property.images?.[0];
  const img          = primary?.url ?? property.featureImageUrl;
  const status       = getStatusValue(property);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative h-48">
        <PropertyThumbnail
          src={img}
          alt={property.title}
          className="w-full h-full"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <StatusBadge status={status} />
        </div>
        <div className="absolute top-3 right-3">
          <ListingTypeBadge type={property.listingType} />
        </div>
        {/* Hover actions */}
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={`/property/${property.slug ?? property._id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
            title="View live"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-700" />
          </a>
          <Link
            href={`/edit-property/${property.slug ?? property._id}`}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
            title="Edit"
          >
            <Edit className="w-3.5 h-3.5 text-gray-700" />
          </Link>
          <button
            type="button"
            onClick={() => onDeleteRequest(property._id)}
            className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 truncate mb-1">
          {property.title}
        </h3>
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {property.society ?? property.locality ?? property.city}
          </span>
        </p>
        <p className="text-lg font-black text-[#029bba] mb-3">
          PKR {formatPrice(property.totalPrice ?? property.price)}
          {property.listingType === "rent" && (
            <span className="text-xs font-normal text-gray-500 ml-1">/mo</span>
          )}
        </p>

        {/* Property specs */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Maximize className="w-3 h-3" />
            {property.area} {property.unit}
          </span>
          {property.bedrooms && (
            <span className="flex items-center gap-1">
              <Bed className="w-3 h-3" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms && (
            <span className="flex items-center gap-1">
              <Bath className="w-3 h-3" />
              {property.bathrooms}
            </span>
          )}
        </div>

        {/* Engagement stats */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {property.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {property.favoriteCount ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {property.inquiryCount ?? 0}
            </span>
          </div>
          <span>{formatDate(property.createdAt)}</span>
        </div>

        {/* Delete confirmation */}
        {isConfirming && (
          <div className="mt-3">
            <DeleteConfirmBar
              onConfirm={() => onDeleteConfirm(property._id)}
              onCancel={onDeleteCancel}
              deleting={isDeleting}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function ListRow({
  property, confirmingDelete, deletingId,
  onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: PropertyCardProps): React.ReactElement {
  const isConfirming = confirmingDelete === property._id;
  const isDeleting   = deletingId === property._id;
  const primary      = property.images?.find((i) => i.isPrimary) ?? property.images?.[0];
  const img          = primary?.url ?? property.featureImageUrl;
  const status       = getStatusValue(property);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-32 h-24 rounded-xl overflow-hidden shrink-0">
          <PropertyThumbnail
            src={img}
            alt={property.title}
            className="w-full h-full"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <StatusBadge status={status} />
                <ListingTypeBadge type={property.listingType} />
              </div>
              <h3 className="font-bold text-gray-900 truncate">
                {property.title}
              </h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {[property.society, property.city].filter(Boolean).join(", ")}
                </span>
              </p>
            </div>
            <p className="text-lg font-black text-[#029bba] whitespace-nowrap shrink-0">
              PKR {formatPrice(property.totalPrice ?? property.price)}
            </p>
          </div>

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            {/* Specs */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Maximize className="w-3 h-3" />
                {property.area} {property.unit}
              </span>
              {property.bedrooms && (
                <span className="flex items-center gap-1">
                  <Bed className="w-3 h-3" />
                  {property.bedrooms} Beds
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {property.views} views
              </span>
              <span className="hidden sm:block text-[11px] text-gray-400">
                {formatDate(property.createdAt)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <a
                href={`/property/${property.slug ?? property._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
              >
                <ExternalLink className="w-3 h-3" />
                View
              </a>
              <Link
                href={`/edit-property/${property.slug ?? property._id}`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
              >
                <Edit className="w-3 h-3" />
                Edit
              </Link>
              <button
                type="button"
                onClick={() => onDeleteRequest(property._id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-600"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {isConfirming && (
        <div className="px-4 pb-4">
          <DeleteConfirmBar
            onConfirm={() => onDeleteConfirm(property._id)}
            onCancel={onDeleteCancel}
            deleting={isDeleting}
          />
        </div>
      )}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage:  number;
  totalPages:   number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps): React.ReactElement | null {
  if (totalPages <= 1) return null;

  const pageNumbers = useMemo<number[]>(() => {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 5; i++) pages.push(i);
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pageNumbers.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
            page === currentPage
              ? "bg-[#029bba] text-white shadow-md shadow-[#029bba]/20"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
          aria-label={`Page ${page}`}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <span className="text-xs text-gray-500 ml-3">
        Page <span className="font-bold">{currentPage}</span> of{" "}
        <span className="font-bold">{totalPages}</span>
      </span>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function ListingsContent(): React.ReactElement {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery]     = useState("");
  const [statusFilter, setStatusFilter]   = useState<FilterStatus>("all");
  const [listingTypeFilter, setListingType] = useState<string>("all");
  const [sortBy, setSortBy]               = useState<SortOption>("newest");
  const [viewMode, setViewMode]           = useState<ViewMode>("grid");
  const [showFilters, setShowFilters]     = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Delete state
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId]             = useState<string | null>(null);
  const [deleteError, setDeleteError]           = useState("");

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchProperties = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError("");

    try {
      const res = await fetch("/api/properties/my-properties?limit=50", {
        credentials: "include",
      });

      if (res.status === 404) {
        setProperties([]);
        return;
      }

      if (!res.ok) {
        setFetchError("Failed to load properties. Please try again.");
        return;
      }

      const data = (await res.json()) as {
        success:     boolean;
        properties?: Property[];
      };

      setProperties(data.properties ?? []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchProperties();
  }, [fetchProperties]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo<ListingStats>(
    () => ({
      total:      properties.length,
      active:     properties.filter(
        (p) => getStatusValue(p) === "approved" || getStatusValue(p) === "verified"
      ).length,
      pending:    properties.filter(
        (p) => getStatusValue(p) === "pending" || getStatusValue(p) === "under_review"
      ).length,
      rejected:   properties.filter((p) => getStatusValue(p) === "rejected").length,
      totalViews: properties.reduce((sum, p) => sum + (p.views ?? 0), 0),
    }),
    [properties]
  );

  // ── Filter + Sort ───────────────────────────────────────────────────────────
  const filtered = useMemo<Property[]>(() => {
    let result = [...properties];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          (p.society ?? "").toLowerCase().includes(q) ||
          p.propertyType.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => {
        const s = getStatusValue(p);
        // "approved" filter matches both "approved" and "verified"
        if (statusFilter === "approved" || statusFilter === "verified") {
          return s === "approved" || s === "verified";
        }
        if (statusFilter === "pending" || statusFilter === "under_review") {
          return s === "pending" || s === "under_review";
        }
        return s === statusFilter;
      });
    }

    if (listingTypeFilter !== "all") {
      result = result.filter((p) => p.listingType === listingTypeFilter);
    }

    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "price_high":
        result.sort((a, b) => (b.totalPrice ?? b.price) - (a.totalPrice ?? a.price));
        break;
      case "price_low":
        result.sort((a, b) => (a.totalPrice ?? a.price) - (b.totalPrice ?? b.price));
        break;
      case "views":
        result.sort((a, b) => b.views - a.views);
        break;
    }

    return result;
  }, [properties, searchQuery, statusFilter, listingTypeFilter, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, listingTypeFilter, sortBy]);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginated = useMemo<Property[]>(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  // ── Delete handlers ─────────────────────────────────────────────────────────
  const handleDeleteRequest = useCallback((id: string) => {
    setConfirmingDelete(id);
    setDeleteError("");
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setConfirmingDelete(null);
    setDeleteError("");
  }, []);

  const handleDeleteConfirm = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setDeleteError("");

      try {
        const res = await fetch(`/api/properties/${id}`, {
          method:      "DELETE",
          credentials: "include",
        });

        if (res.status === 404) {
          setDeleteError("Delete API not available yet.");
          return;
        }

        if (!res.ok) {
          const data = (await res.json()) as { error?: string; message?: string };
          setDeleteError(data.error ?? data.message ?? "Failed to delete. Please try again.");
          return;
        }

        // Optimistic remove
        setProperties((prev) => prev.filter((p) => p._id !== id));
        setConfirmingDelete(null);
      } catch {
        setDeleteError("Something went wrong. Please try again.");
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  // ── Stat card filter handler ────────────────────────────────────────────────
  const handleStatFilter = useCallback(
    (filter: FilterStatus) => {
      setStatusFilter((prev) => (prev === filter ? "all" : filter));
    },
    []
  );

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your properties...</p>
        </div>
      </div>
    );
  }

  const hasFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    listingTypeFilter !== "all";

  return (
    <div className="p-4 md:p-6 pb-16">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#004063] tracking-tight flex items-center gap-2">
            <Home className="w-6 h-6 text-[#029bba]" />
            My Listings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats.total} propert{stats.total === 1 ? "y" : "ies"} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchProperties(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 bg-white rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/add-property"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-md shadow-[#029bba]/20"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </Link>
        </div>
      </div>

      {/* ── Fetch Error ───────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {fetchError}
        </div>
      )}

      {/* ── Delete Error ──────────────────────────────────────────────────── */}
      {deleteError && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {deleteError}
          <button
            type="button"
            onClick={() => setDeleteError("")}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total"
          value={stats.total}
          color="teal"
          icon={<Building2 className="w-5 h-5" />}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <StatCard
          label="Active"
          value={stats.active}
          color="green"
          icon={<CheckCircle className="w-5 h-5" />}
          active={statusFilter === "approved"}
          onClick={() => handleStatFilter("approved")}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          color="amber"
          icon={<Clock className="w-5 h-5" />}
          active={statusFilter === "pending"}
          onClick={() => handleStatFilter("pending")}
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          color="red"
          icon={<XCircle className="w-5 h-5" />}
          active={statusFilter === "rejected"}
          onClick={() => handleStatFilter("rejected")}
        />
        <StatCard
          label="Total Views"
          value={stats.totalViews.toLocaleString()}
          color="blue"
          icon={<Eye className="w-5 h-5" />}
        />
      </div>

      {/* ── Filters Bar ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, city, society..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none text-sm transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter toggle (mobile shows filters button) */}
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className={`lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                showFilters
                  ? "border-[#029bba] bg-[#029bba]/5 text-[#029bba]"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>

            {/* Listing Type — desktop always visible, mobile toggle */}
            <select
              value={listingTypeFilter}
              onChange={(e) => setListingType(e.target.value)}
              className={`px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#029bba]/20 outline-none bg-white ${
                !showFilters ? "hidden lg:block" : ""
              }`}
            >
              <option value="all">All Types</option>
              <option value="full_payment">For Sale</option>
              <option value="installment">Installment</option>
              <option value="rent">For Rent</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#029bba]/20 outline-none bg-white ${
                !showFilters ? "hidden lg:block" : ""
              }`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_high">Price: High to Low</option>
              <option value="price_low">Price: Low to High</option>
              <option value="views">Most Views</option>
            </select>

            {/* View Toggle */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-[#029bba] text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
                aria-label="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-[#029bba] text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
              <FilterIcon className="w-3 h-3" />
              Active:
            </span>
            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full hover:bg-[#029bba]/20 transition-colors capitalize"
              >
                {statusFilter.replace(/_/g, " ")}
                <XCircle className="w-3 h-3" />
              </button>
            )}
            {listingTypeFilter !== "all" && (
              <button
                type="button"
                onClick={() => setListingType("all")}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full hover:bg-[#029bba]/20 transition-colors capitalize"
              >
                {listingTypeFilter.replace(/_/g, " ")}
                <XCircle className="w-3 h-3" />
              </button>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full hover:bg-[#029bba]/20 transition-colors"
              >
                &ldquo;{searchQuery}&rdquo;
                <XCircle className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setListingType("all");
                setSearchQuery("");
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline ml-1 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Results Count ─────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Showing{" "}
          <span className="font-bold text-gray-700">
            {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)}
          </span>{" "}
          of{" "}
          <span className="font-bold text-gray-700">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "property" : "properties"}
        </p>
      )}

      {/* ── Property Grid / List ──────────────────────────────────────────── */}
      {paginated.length > 0 ? (
        <>
          <div
            className={
              viewMode === "grid"
                ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {paginated.map((property) =>
              viewMode === "grid" ? (
                <GridCard
                  key={property._id}
                  property={property}
                  confirmingDelete={confirmingDelete}
                  deletingId={deletingId}
                  onDeleteRequest={handleDeleteRequest}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteCancel={handleDeleteCancel}
                />
              ) : (
                <ListRow
                  key={property._id}
                  property={property}
                  confirmingDelete={confirmingDelete}
                  deletingId={deletingId}
                  onDeleteRequest={handleDeleteRequest}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteCancel={handleDeleteCancel}
                />
              )
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        // ── Empty State ─────────────────────────────────────────────────
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <Home className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {hasFilters
              ? "No properties match your filters"
              : "No properties listed yet"}
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            {hasFilters
              ? "Try adjusting your search or clearing filters to see more results"
              : "Start by adding your first property listing to reach potential buyers"}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setListingType("all");
                setSearchQuery("");
              }}
              className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            <Link
              href="/add-property"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-md shadow-[#029bba]/20"
            >
              <Plus className="w-4 h-4" />
              Add Your First Property
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function AgentListingsPage(): React.ReactElement {
  return (
    <AgentLayout
      title="My Listings | Highrise.pk"
      description="Manage your property listings on Highrise.pk"
    >
      <ListingsContent />
    </AgentLayout>
  );
}

// ========== END OF FILE ==========