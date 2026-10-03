// pages/owner/listings/index.tsx
// Owner Listings Management — Enterprise V1.0
// Adapted from agent/listings.tsx with owner-specific additions:
//   - 10 listing limit progress bar
//   - Submit for Review action (draft only)
//   - Approved-only add button
//   - Server-side pagination

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Home, Plus, Search, Eye, Edit, Trash2, CheckCircle,
  Clock, XCircle, MapPin, Maximize, Bed, Bath, Grid, List,
  Loader2, RefreshCw, ExternalLink, Heart, MessageSquare,
  ChevronLeft, ChevronRight, AlertTriangle, Building2,
  Send, ShieldCheck, SlidersHorizontal, Filter as FilterIcon,
} from "lucide-react";
import OwnerLayout from "@/components/owner/OwnerLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyImage {
  url:        string;
  isPrimary?: boolean;
}

interface Property {
  _id:              string;
  title:            string;
  slug?:            string;
  price:            number;
  area:             number;
  unit:             string;
  city:             string;
  locality?:        string;
  society?:         string;
  propertyType:     string;
  listingType:      string;
  bedrooms?:        number;
  bathrooms?:       number;
  verification?:    { status?: string };
  status?:          string;
  views:            number;
  favoriteCount?:   number;
  inquiryCount?:    number;
  images?:          PropertyImage[];
  featureImageUrl?: string;
  createdAt:        string;
}

type ViewMode = "grid" | "list";

// ─── Constants ────────────────────────────────────────────────────────────────

const LISTING_LIMIT = 10;
const PAGE_SIZE     = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000)    return `${(price / 100_000).toFixed(2)} Lac`;
  return price.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function getStatusValue(property: Property): string {
  return property.verification?.status ?? property.status ?? "draft";
}

// ─── Status Config ────────────────────────────────────────────────────────────

type StatusKey = "approved" | "verified" | "pending" | "under_review" |
                 "rejected" | "draft" | "flagged";

const STATUS_CONFIG: Record<StatusKey, {
  label: string; icon: React.ReactNode; className: string;
}> = {
  approved:     { label: "Active",     icon: <CheckCircle className="w-3 h-3" />,    className: "bg-emerald-100 text-emerald-700" },
  verified:     { label: "Verified",   icon: <CheckCircle className="w-3 h-3" />,    className: "bg-emerald-100 text-emerald-700" },
  pending:      { label: "Pending",    icon: <Clock className="w-3 h-3" />,          className: "bg-amber-100 text-amber-700" },
  under_review: { label: "In Review",  icon: <Clock className="w-3 h-3" />,          className: "bg-blue-100 text-blue-700" },
  rejected:     { label: "Rejected",   icon: <XCircle className="w-3 h-3" />,        className: "bg-red-100 text-red-700" },
  draft:        { label: "Draft",      icon: <Edit className="w-3 h-3" />,           className: "bg-gray-100 text-gray-700" },
  flagged:      { label: "Flagged",    icon: <AlertTriangle className="w-3 h-3" />,  className: "bg-orange-100 text-orange-700" },
};

function StatusBadge({ status }: { status: string }): React.ReactElement | null {
  const cfg = STATUS_CONFIG[status as StatusKey];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

const LISTING_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  full_payment: { label: "For Sale",    className: "bg-rose-500 text-white shadow-sm" },
  installment:  { label: "Installment", className: "bg-violet-500 text-white shadow-sm" },
  rent:         { label: "For Rent",    className: "bg-emerald-500 text-white shadow-sm" },
};

function ListingTypeBadge({ type }: { type: string }): React.ReactElement | null {
  const cfg = LISTING_TYPE_BADGE[type];
  if (!cfg) return null;
  return (
    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function PropertyThumbnail({
  src,
  alt,
  className,
}: {
  src?:      string;
  alt:       string;
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

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirmBar({
  onConfirm,
  onCancel,
  deleting,
}: {
  onConfirm: () => void;
  onCancel:  () => void;
  deleting:  boolean;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
      <span className="text-sm text-red-700 font-semibold flex-1">Delete this listing?</span>
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
        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

// ─── Submit Confirm ───────────────────────────────────────────────────────────

function SubmitConfirmBar({
  onConfirm,
  onCancel,
  submitting,
}: {
  onConfirm:  () => void;
  onCancel:   () => void;
  submitting: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
      <Send className="w-4 h-4 text-blue-600 shrink-0" />
      <span className="text-sm text-blue-700 font-semibold flex-1">Submit for admin review?</span>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={submitting}
        className="px-3 py-1.5 text-xs font-bold text-white bg-[#029bba] rounded-lg hover:bg-[#027a94] transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

interface CardProps {
  property:          Property;
  confirmingDelete:  string | null;
  deletingId:        string | null;
  confirmingSubmit:  string | null;
  submittingId:      string | null;
  onDeleteRequest:   (id: string) => void;
  onDeleteConfirm:   (id: string) => void;
  onDeleteCancel:    () => void;
  onSubmitRequest:   (id: string) => void;
  onSubmitConfirm:   (id: string) => void;
  onSubmitCancel:    () => void;
  ownerApproved:     boolean;
}

function GridCard({
  property, confirmingDelete, deletingId,
  confirmingSubmit, submittingId,
  onDeleteRequest, onDeleteConfirm, onDeleteCancel,
  onSubmitRequest, onSubmitConfirm, onSubmitCancel,
  ownerApproved,
}: CardProps): React.ReactElement {
  const isConfirmDel = confirmingDelete === property._id;
  const isConfirmSub = confirmingSubmit === property._id;
  const isDeletingMe = deletingId === property._id;
  const isSubmitting = submittingId === property._id;
  const primary      = property.images?.find((i) => i.isPrimary) ?? property.images?.[0];
  const img          = primary?.url ?? property.featureImageUrl;
  const status       = getStatusValue(property);
  const isDraft      = status === "draft";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative h-48">
        <PropertyThumbnail src={img} alt={property.title} className="w-full h-full" />
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
              title="View listing"
            >
            <ExternalLink className="w-3.5 h-3.5 text-gray-700" />
          </a>
          {isDraft && (
            <Link
              href={`/owner/listings/new?edit=${property._id}`}
              className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5 text-gray-700" />
            </Link>
          )}
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
        <h3 className="font-bold text-gray-900 truncate mb-1">{property.title}</h3>
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{property.society ?? property.city}</span>
        </p>
        <p className="text-lg font-black text-[#029bba] mb-3">
          PKR {formatPrice(property.price)}
          {property.listingType === "rent" && (
            <span className="text-xs font-normal text-gray-500 ml-1">/mo</span>
          )}
        </p>

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

        {/* Engagement */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{property.views}</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{property.favoriteCount ?? 0}</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{property.inquiryCount ?? 0}</span>
          </div>
          <span>{formatDate(property.createdAt)}</span>
        </div>

        {/* Auto-submit replaced the need for manual draft submission */}

        {/* Delete confirm */}
        {isConfirmDel && (
          <div className="mt-3">
            <DeleteConfirmBar
              onConfirm={() => onDeleteConfirm(property._id)}
              onCancel={onDeleteCancel}
              deleting={isDeletingMe}
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
  confirmingSubmit, submittingId,
  onDeleteRequest, onDeleteConfirm, onDeleteCancel,
  onSubmitRequest, onSubmitConfirm, onSubmitCancel,
  ownerApproved,
}: CardProps): React.ReactElement {
  const isConfirmDel = confirmingDelete === property._id;
  const isConfirmSub = confirmingSubmit === property._id;
  const isDeletingMe = deletingId === property._id;
  const isSubmitting = submittingId === property._id;
  const primary      = property.images?.find((i) => i.isPrimary) ?? property.images?.[0];
  const img          = primary?.url ?? property.featureImageUrl;
  const status       = getStatusValue(property);
  const isDraft      = status === "draft";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-4 p-4">
        <div className="w-32 h-24 rounded-xl overflow-hidden shrink-0">
          <PropertyThumbnail src={img} alt={property.title} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <StatusBadge status={status} />
                <ListingTypeBadge type={property.listingType} />
              </div>
              <h3 className="font-bold text-gray-900 truncate">{property.title}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{[property.society, property.city].filter(Boolean).join(", ")}</span>
              </p>
            </div>
            <p className="text-lg font-black text-[#029bba] whitespace-nowrap shrink-0">
              PKR {formatPrice(property.price)}
            </p>
          </div>

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Maximize className="w-3 h-3" />{property.area} {property.unit}
              </span>
              {property.bedrooms && (
                <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{property.bedrooms} Beds</span>
              )}
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{property.views} views</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isDraft && ownerApproved && !isConfirmSub && !isConfirmDel && (
                <button
                  type="button"
                  onClick={() => onSubmitRequest(property._id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#029bba]/10 text-[#029bba] border border-[#029bba]/20 rounded-lg hover:bg-[#029bba]/20 transition-colors"
                >
                  <Send className="w-3 h-3" /> Submit
                </button>
              )}
              {isDraft && (
                <Link
                  href={`/owner/listings/new?edit=${property._id}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <Edit className="w-3 h-3" /> Edit
                </Link>
              )}
                              <a
                  href={`/property/${property.slug ?? property._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <ExternalLink className="w-3 h-3" /> View
              </a>
              <button
                type="button"
                onClick={() => onDeleteRequest(property._id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-600"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm bars below row */}
      {isConfirmSub && (
        <div className="px-4 pb-4">
          <SubmitConfirmBar
            onConfirm={() => onSubmitConfirm(property._id)}
            onCancel={onSubmitCancel}
            submitting={isSubmitting}
          />
        </div>
      )}
      {isConfirmDel && (
        <div className="px-4 pb-4">
          <DeleteConfirmBar
            onConfirm={() => onDeleteConfirm(property._id)}
            onCancel={onDeleteCancel}
            deleting={isDeletingMe}
          />
        </div>
      )}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage:  number;
  totalPages:   number;
  onPageChange: (page: number) => void;
}): React.ReactElement | null {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs font-bold text-gray-700 px-3">
        Page {currentPage} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function ListingsContent(): React.ReactElement {
  const [properties, setProperties]   = useState<Property[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [fetchError, setFetchError]   = useState("");
  const [totalCount, setTotalCount]   = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [ownerStatus, setOwnerStatus] = useState<string>("pending");

  // Filters (server-side on this page)
  const [searchQuery, setSearchQuery]   = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode]         = useState<ViewMode>("grid");
  const [showFilters, setShowFilters]   = useState(false);

  // Delete state
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId]             = useState<string | null>(null);
  const [deleteError, setDeleteError]           = useState("");

  // Submit state
  const [confirmingSubmit, setConfirmingSubmit] = useState<string | null>(null);
  const [submittingId, setSubmittingId]         = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess]       = useState("");

  const ownerApproved = ownerStatus === "approved";

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchListings = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setFetchError("");

      try {
        const params = new URLSearchParams({
          page:   String(currentPage),
          limit:  String(PAGE_SIZE),
          status: statusFilter,
          search: debouncedSearch,
        });

        const [listingsRes, statusRes] = await Promise.all([
          fetch(`/api/owner/listings?${params.toString()}`, { credentials: "include" }),
          fetch("/api/owner/verification-status",           { credentials: "include" }),
        ]);

        if (listingsRes.ok) {
          const data = (await listingsRes.json()) as {
            success:    boolean;
            properties?: Property[];
            pagination?: { total?: number; totalPages?: number };
          };
          setProperties(data.properties ?? []);
          setTotalCount(data.pagination?.total ?? 0);
          setTotalPages(data.pagination?.totalPages ?? 1);
        } else {
          setFetchError("Failed to load listings.");
        }

        if (statusRes.ok) {
          // API returns: { success, data: { status, ... } }
          const statusData = (await statusRes.json()) as {
            success?: boolean;
            status?:  string;                    // legacy fallback
            profile?: { status?: string };       // legacy fallback
            data?:    { status?: string };       // current API shape
          };

          const resolvedStatus =
            statusData.data?.status        ??
            statusData.status              ??
            statusData.profile?.status     ??
            "pending";

          setOwnerStatus(resolvedStatus);
        }
      } catch {
        setFetchError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch]);

  // ── Local stats ──────────────────────────────────────────────────────────────
  const listingsUsed = totalCount;
  const isFull       = listingsUsed >= LISTING_LIMIT;

  const stats = useMemo(() => ({
    total:      totalCount,
    draft:      properties.filter((p) => getStatusValue(p) === "draft").length,
    pending:    properties.filter((p) => ["pending","under_review"].includes(getStatusValue(p))).length,
    verified:   properties.filter((p) => ["verified","approved"].includes(getStatusValue(p))).length,
    rejected:   properties.filter((p) => getStatusValue(p) === "rejected").length,
    totalViews: properties.reduce((s, p) => s + (p.views ?? 0), 0),
  }), [properties, totalCount]);

  // ── Delete handlers ──────────────────────────────────────────────────────────
  const handleDeleteRequest = useCallback((id: string) => {
    setConfirmingDelete(id);
    setDeleteError("");
    setConfirmingSubmit(null);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setConfirmingDelete(null);
    setDeleteError("");
  }, []);

  const handleDeleteConfirm = useCallback(async (id: string) => {
    setDeletingId(id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/owner/listings/${id}`, {
        method:      "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setDeleteError(data.error ?? "Failed to delete.");
        return;
      }
      setProperties((prev) => prev.filter((p) => p._id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setConfirmingDelete(null);
    } catch {
      setDeleteError("Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  // ── Submit handlers ──────────────────────────────────────────────────────────
  const handleSubmitRequest = useCallback((id: string) => {
    setConfirmingSubmit(id);
    setConfirmingDelete(null);
    setSubmitSuccess("");
  }, []);

  const handleSubmitCancel = useCallback(() => {
    setConfirmingSubmit(null);
  }, []);

  const handleSubmitConfirm = useCallback(async (id: string) => {
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/owner/listings/${id}/submit`, {
        method:      "PATCH",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as { success?: boolean; error?: string; message?: string };

      if (res.ok && data.success) {
        setSubmitSuccess("Listing submitted for review! You'll be notified when it goes live.");
        // Update local state
        setProperties((prev) =>
          prev.map((p) =>
            p._id === id
              ? {
                  ...p,
                  verification: { ...p.verification, status: "pending" },
                }
              : p
          )
        );
        setConfirmingSubmit(null);
        setTimeout(() => setSubmitSuccess(""), 5000);
      } else {
        setDeleteError(data.error ?? "Failed to submit.");
        setConfirmingSubmit(null);
      }
    } catch {
      setDeleteError("Something went wrong submitting.");
      setConfirmingSubmit(null);
    } finally {
      setSubmittingId(null);
    }
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading listings...</p>
        </div>
      </div>
    );
  }

  const hasFilters = debouncedSearch !== "" || statusFilter !== "all";

  return (
    <div className="p-4 md:p-6 pb-16">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
            <Home className="w-6 h-6 text-[#029bba]" />
            My Listings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {listingsUsed} of {LISTING_LIMIT} listings used
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchListings(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 bg-white rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {ownerApproved && !isFull ? (
            <Link
              href="/owner/listings/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-md shadow-[#029bba]/20"
            >
              <Plus className="w-4 h-4" />
              Add Listing
            </Link>
          ) : ownerApproved && isFull ? (
            <div
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-400 rounded-xl text-sm font-bold cursor-not-allowed"
              title="Listing limit reached"
            >
              <Plus className="w-4 h-4" />
              Add Listing
            </div>
          ) : (
            <Link
              href="/owner/verify"
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Get Verified
            </Link>
          )}
        </div>
      </div>

      {/* ── Listing Progress Bar ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#029bba]" />
            Listing Quota
          </span>
          <span className={`text-sm font-black ${
            isFull ? "text-red-600" : listingsUsed >= 8 ? "text-amber-600" : "text-[#029bba]"
          }`}>
            {listingsUsed} / {LISTING_LIMIT}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isFull ? "bg-red-500" : listingsUsed >= 8 ? "bg-amber-500" : "bg-[#029bba]"
            }`}
            style={{ width: `${Math.min(100, (listingsUsed / LISTING_LIMIT) * 100)}%` }}
          />
        </div>
        {isFull && (
          <p className="text-xs text-red-600 font-semibold mt-2">
            You have reached the maximum listing limit.
          </p>
        )}
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {fetchError}
        </div>
      )}
      {submitSuccess && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {submitSuccess}
        </div>
      )}
      {deleteError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {deleteError}
          <button type="button" onClick={() => setDeleteError("")} className="ml-auto">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total",    value: stats.total,      color: "text-[#029bba]",   bg: "bg-[#029bba]/10",  filter: "all" },
          { label: "Draft",    value: stats.draft,      color: "text-gray-600",    bg: "bg-gray-100",      filter: "draft" },
          { label: "Pending",  value: stats.pending,    color: "text-amber-600",   bg: "bg-amber-50",      filter: "pending" },
          { label: "Verified", value: stats.verified,   color: "text-emerald-600", bg: "bg-emerald-50",    filter: "verified" },
          { label: "Rejected", value: stats.rejected,   color: "text-red-600",     bg: "bg-red-50",        filter: "rejected" },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s.filter ? "all" : s.filter)}
            className={`text-left p-3 rounded-xl border-2 transition-all ${
              statusFilter === s.filter
                ? "border-[#029bba] bg-white shadow-md"
                : "border-transparent bg-white shadow-sm"
            }`}
          >
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className={`sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${
                showFilters ? "border-[#029bba] bg-[#029bba]/5 text-[#029bba]" : "border-gray-200 text-gray-600"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="hidden sm:block px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#029bba]/20 outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* View toggle */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-[#029bba] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-[#029bba] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active filters */}
        {hasFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <FilterIcon className="w-3 h-3 text-gray-400" />
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
            {debouncedSearch && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setDebounced(""); }}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full hover:bg-[#029bba]/20 transition-colors"
              >
                &ldquo;{debouncedSearch}&rdquo;
                <XCircle className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => { setStatusFilter("all"); setSearchQuery(""); setDebounced(""); }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Listings ────────────────────────────────────────────────────── */}
      {properties.length > 0 ? (
        <>
          <div className={viewMode === "grid"
            ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
          }>
            {properties.map((property) =>
              viewMode === "grid" ? (
                <GridCard
                  key={property._id}
                  property={property}
                  confirmingDelete={confirmingDelete}
                  deletingId={deletingId}
                  confirmingSubmit={confirmingSubmit}
                  submittingId={submittingId}
                  onDeleteRequest={handleDeleteRequest}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteCancel={handleDeleteCancel}
                  onSubmitRequest={handleSubmitRequest}
                  onSubmitConfirm={handleSubmitConfirm}
                  onSubmitCancel={handleSubmitCancel}
                  ownerApproved={ownerApproved}
                />
              ) : (
                <ListRow
                  key={property._id}
                  property={property}
                  confirmingDelete={confirmingDelete}
                  deletingId={deletingId}
                  confirmingSubmit={confirmingSubmit}
                  submittingId={submittingId}
                  onDeleteRequest={handleDeleteRequest}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteCancel={handleDeleteCancel}
                  onSubmitRequest={handleSubmitRequest}
                  onSubmitConfirm={handleSubmitConfirm}
                  onSubmitCancel={handleSubmitCancel}
                  ownerApproved={ownerApproved}
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <Home className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {hasFilters ? "No listings match your filters" : "No listings yet"}
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            {hasFilters
              ? "Try adjusting or clearing your filters"
              : ownerApproved
              ? "Start by adding your first property listing"
              : "Complete verification to start listing properties"}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => { setStatusFilter("all"); setSearchQuery(""); setDebounced(""); }}
              className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          ) : ownerApproved && !isFull ? (
            <Link
              href="/owner/listings/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Listing
            </Link>
          ) : !ownerApproved ? (
            <Link
              href="/owner/verify"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Complete Verification
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function OwnerListingsPage(): React.ReactElement {
  return (
    <OwnerLayout
      title="My Listings | Owner Portal — Highrise.pk"
      description="Manage your property listings"
    >
      <ListingsContent />
    </OwnerLayout>
  );
}