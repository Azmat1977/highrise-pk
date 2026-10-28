// ========== FILE: pages/admin/properties/index.tsx ==========
// Admin: Property Management Panel
// Named export: AdminPropertiesContent (used by pending + featured sub-pages)
// Default export: AdminPropertiesPage (self-contained with auth guard)
// V6.4.2 — useSession() guard, fetch(), inline modals, Tailwind only
// ================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Search, RefreshCw, Eye, CheckCircle, XCircle,
  Trash2, RotateCcw, AlertTriangle, Flag, ChevronLeft,
  ChevronRight, Star, StarOff, Building2, MapPin, Tag,
  Clock, TrendingUp, Shield, X, SlidersHorizontal,
  BadgeCheck, Flame, BarChart3,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminPropertyItem {
  _id:                string;
  title:              string;
  slug:               string | null;
  propertyType:       string;
  listingType:        string;
  city:               string;
  society:            string;
  price:              number;
  area:               number;
  unit:               string;
  status:             string;
  verificationStatus: string;
  isDeleted:          boolean;
  isFeatured:         boolean;
  isFlagged:          boolean;
  trustScore:         number;
  qualityScore:       number;
  views:              number;
  inquiryCount:       number;
  primaryImage:       string | null;
  ownerName:          string | null;
  ownerEmail:         string | null;
  agentId:            string | null;
  developerId:        string | null;
  createdAt:          string;
  updatedAt:          string;
  deletedAt:          string | null;
  verifiedAt:         string | null;
  rejectionReason:    string | null;
  flagReason:         string | null;
}

interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

interface BannerState {
  type:    "success" | "error" | "warning";
  message: string;
}

interface ModalState {
  type:     "approve" | "reject" | "flag" | "trash" | "restore" | "permanent_delete" | null;
  property: AdminPropertyItem | null;
}

// ── Named export props ─────────────────────────────────────────────────────────

export interface AdminPropertiesContentProps {
  initialFilterStatus?: string;
  featuredOnly?:        boolean;
  pageTitle?:           string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) {
    const c = amount / 10_000_000;
    return `${c % 1 === 0 ? c : c.toFixed(2)} Crore`;
  }
  if (amount >= 100_000) {
    const l = amount / 100_000;
    return `${l % 1 === 0 ? l : l.toFixed(2)} Lakh`;
  }
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString("en-PK");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Config ─────────────────────────────────────────────────────────────────────

const VER_CONFIG: Record<string, { label: string; dot: string; badge: string; ring: string }> = {
  draft:        { label: "Draft",     dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600",     ring: "ring-gray-200" },
  pending:      { label: "Pending",   dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700",    ring: "ring-amber-200" },
  under_review: { label: "In Review", dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-700",      ring: "ring-blue-200" },
  verified:     { label: "Verified",  dot: "bg-emerald-400",badge: "bg-emerald-50 text-emerald-700",ring: "ring-emerald-200" },
  rejected:     { label: "Rejected",  dot: "bg-red-400",    badge: "bg-red-50 text-red-700",        ring: "ring-red-200" },
  flagged:      { label: "Flagged",   dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700",  ring: "ring-orange-200" },
};

const LISTING_CONFIG: Record<string, { label: string; color: string }> = {
  full_payment: { label: "Full Payment", color: "bg-[#029bba]/10 text-[#029bba]" },
  installment:  { label: "Installment",  color: "bg-violet-100 text-violet-700" },
  rent:         { label: "Rent",         color: "bg-teal-100 text-teal-700" },
};

const TABS = [
  { key: "",             label: "All",       icon: "📊" },
  { key: "pending",      label: "Pending",   icon: "⏳" },
  { key: "under_review", label: "In Review", icon: "🔍" },
  { key: "verified",     label: "Verified",  icon: "✅" },
  { key: "rejected",     label: "Rejected",  icon: "❌" },
  { key: "flagged",      label: "Flagged",   icon: "🚩" },
  { key: "trash",        label: "Trash",     icon: "🗑️" },
];

// ── InlineModal ────────────────────────────────────────────────────────────────

function InlineModal({
  title, subtitle, onClose, busy, children,
}: {
  title:     string;
  subtitle?: string;
  onClose:   () => void;
  busy:      boolean;
  children:  React.ReactNode;
}): React.ReactElement {
  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10
        border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100
          bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {!busy && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── PropertyCard ───────────────────────────────────────────────────────────────

function PropertyCard({
  property,
  onApprove, onReject, onFlag, onTrash,
  onRestore, onPermanentDelete, onFeatureToggle, onReview,
}: {
  property:          AdminPropertyItem;
  onApprove:         () => void;
  onReject:          () => void;
  onFlag:            () => void;
  onTrash:           () => void;
  onRestore:         () => void;
  onPermanentDelete: () => void;
  onFeatureToggle:   () => void;
  onReview:          () => void;
}): React.ReactElement {
  const ver     = VER_CONFIG[property.verificationStatus] ?? VER_CONFIG["draft"];
  const listing = LISTING_CONFIG[property.listingType] ?? { label: property.listingType, color: "bg-gray-100 text-gray-600" };
  const inTrash = property.isDeleted;

  return (
    <div className={`group bg-white rounded-2xl border transition-all duration-200
      hover:shadow-lg hover:-translate-y-px
      ${property.isFlagged
        ? "border-orange-200 shadow-orange-50 shadow-sm"
        : "border-gray-200 shadow-sm"}
      ${inTrash ? "opacity-60" : ""}`}>

      <div className="p-5">
        <div className="flex gap-4">

          {/* Thumbnail */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br
              from-gray-100 to-gray-200 border border-gray-100">
              {property.primaryImage ? (
                <img
                  src={property.primaryImage}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-gray-300" />
                </div>
              )}
            </div>
            {/* Featured star overlay */}
            {property.isFeatured && (
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400
                rounded-full flex items-center justify-center shadow-sm">
                <Star className="w-3 h-3 text-white fill-current" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-sm leading-snug
                  truncate max-w-[260px] group-hover:text-[#029bba] transition-colors"
                  title={property.title}>
                  {property.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {property.city}
                    {property.society && ` · ${property.society}`}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                  rounded-full text-[11px] font-semibold ring-1 ${ver.badge} ${ver.ring}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ver.dot}`} />
                  {ver.label}
                </span>
              </div>
            </div>

            {/* Price + area + listing type */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-sm font-bold text-[#004063]">
                PKR {formatPKR(property.price)}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-500">{property.area} {property.unit}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${listing.color}`}>
                {listing.label}
              </span>
              {property.isFlagged && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full
                  text-[11px] font-semibold bg-orange-50 text-orange-600 ring-1 ring-orange-200">
                  <Flag className="w-2.5 h-2.5" /> Flagged
                </span>
              )}
              {inTrash && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold
                  bg-gray-100 text-gray-500">
                  Trashed
                </span>
              )}
            </div>

            {/* Meta stats */}
            <div className="flex items-center gap-4 mt-2.5">
              {property.ownerName && (
                <span className="text-[11px] text-gray-500">
                  <span className="text-gray-400">Owner:</span> {property.ownerName}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Eye className="w-3 h-3" /> {property.views.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <TrendingUp className="w-3 h-3" /> {property.inquiryCount}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Shield className="w-3 h-3" /> {property.trustScore}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Tag className="w-3 h-3" /> {property.qualityScore}%
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400 ml-auto">
                <Clock className="w-3 h-3" /> {timeAgo(property.createdAt)}
              </span>
            </div>

            {/* Rejection / flag reason */}
            {property.rejectionReason && (
              <div className="mt-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100">
                <p className="text-[11px] text-red-600 leading-snug">
                  <span className="font-semibold">Rejected:</span> {property.rejectionReason}
                </p>
              </div>
            )}
            {property.flagReason && (
              <div className="mt-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-[11px] text-orange-600 leading-snug">
                  <span className="font-semibold">Flag:</span> {property.flagReason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">

          {/* View live */}
          {property.slug && (
            <a
              href={`/property/${property.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                text-gray-600 bg-gray-50 border border-gray-200 rounded-xl
                hover:bg-gray-100 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </a>
          )}

          {!inTrash ? (
            <>
              {property.verificationStatus !== "verified" && (
                <button onClick={onApprove}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                    text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl
                    hover:bg-emerald-100 transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>
              )}
              {(property.verificationStatus === "pending" ||
                property.verificationStatus === "draft") && (
                <button onClick={onReview}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                    text-blue-700 bg-blue-50 border border-blue-200 rounded-xl
                    hover:bg-blue-100 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> Review
                </button>
              )}
              {property.verificationStatus !== "rejected" && (
                <button onClick={onReject}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                    text-red-700 bg-red-50 border border-red-200 rounded-xl
                    hover:bg-red-100 transition-colors">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              )}
              {!property.isFlagged && (
                <button onClick={onFlag}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                    text-orange-700 bg-orange-50 border border-orange-200 rounded-xl
                    hover:bg-orange-100 transition-colors">
                  <Flag className="w-3.5 h-3.5" /> Flag
                </button>
              )}
              {property.verificationStatus === "verified" && (
                <button onClick={onFeatureToggle}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                    rounded-xl transition-colors
                    ${property.isFeatured
                      ? "text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                      : "text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100"}`}>
                  {property.isFeatured
                    ? <><StarOff className="w-3.5 h-3.5" /> Unfeature</>
                    : <><Star className="w-3.5 h-3.5" /> Feature</>}
                </button>
              )}
              <button onClick={onTrash}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                  text-red-600 bg-red-50 border border-red-200 rounded-xl
                  hover:bg-red-100 transition-colors ml-auto">
                <Trash2 className="w-3.5 h-3.5" /> Trash
              </button>
            </>
          ) : (
            <>
              <button onClick={onRestore}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                  text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl
                  hover:bg-emerald-100 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Restore
              </button>
              <button onClick={onPermanentDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                  text-red-700 bg-red-50 border border-red-300 rounded-xl
                  hover:bg-red-100 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete Forever
              </button>
              {property.deletedAt && (
                <span className="text-[11px] text-gray-400 ml-auto">
                  Trashed {timeAgo(property.deletedAt)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NAMED EXPORT: AdminPropertiesContent ───────────────────────────────────────

export function AdminPropertiesContent({
  initialFilterStatus = "",
  featuredOnly        = false,
  pageTitle           = "Property Management",
}: AdminPropertiesContentProps): React.ReactElement {

  // ── State ────────────────────────────────────────────────────
  const [properties,  setProperties]  = useState<AdminPropertyItem[]>([]);
  const [pagination,  setPagination]  = useState<Pagination | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [banner,      setBanner]      = useState<BannerState | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTab,   setActiveTab]   = useState(initialFilterStatus);
  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [city,        setCity]        = useState("");
  const [listingType, setListingType] = useState("");
  const [sortBy,      setSortBy]      = useState("newest");
  const [page,        setPage]        = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [modal,        setModal]        = useState<ModalState>({ type: null, property: null });
  const [modalReason,  setModalReason]  = useState("");
  const [modalNotes,   setModalNotes]   = useState("");
  const [modalConfirm, setModalConfirm] = useState("");
  const [actionBusy,   setActionBusy]   = useState(false);

  // ── Banner ───────────────────────────────────────────────────
  const showBanner = useCallback((type: BannerState["type"], message: string) => {
    setBanner({ type, message });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 5000);
  }, []);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchProperties = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page",   String(page));
      params.set("limit",  "20");
      params.set("sortBy", sortBy);

      if (activeTab === "trash") {
        params.set("isDeleted", "true");
      } else {
        params.set("isDeleted", "false");
        if (activeTab) params.set("verificationStatus", activeTab);
      }

      if (featuredOnly)  params.set("isFeatured", "true");
      if (search)        params.set("search",      search);
      if (city)          params.set("city",         city);
      if (listingType)   params.set("listingType",  listingType);

      const res = await fetch(`/api/admin/properties?${params.toString()}`, {
        credentials: "include",
        signal,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const d = await res.json();
      setProperties(d.data.properties ?? []);
      setPagination(d.data.pagination ?? null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load properties");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, activeTab, search, city, listingType, featuredOnly]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchProperties(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchProperties]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchProperties();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchProperties]);

  useEffect(() => { setPage(1); }, [activeTab, search, city, listingType, sortBy]);

  // ── Modal helpers ─────────────────────────────────────────────
  const openModal = (type: ModalState["type"], property: AdminPropertyItem) => {
    setModal({ type, property });
    setModalReason("");
    setModalNotes("");
    setModalConfirm("");
  };
  const closeModal = () => { if (!actionBusy) setModal({ type: null, property: null }); };

  // ── Status action ─────────────────────────────────────────────
  const handleStatusAction = async (
    newStatus: "under_review" | "verified" | "rejected" | "flagged"
  ) => {
    if (!modal.property || actionBusy) return;
    if (newStatus === "rejected" && modalReason.trim().length < 10) {
      showBanner("error", "Rejection reason must be at least 10 characters.");
      return;
    }
    if (newStatus === "flagged" &&
      modalReason.trim().length < 5 && modalNotes.trim().length < 5) {
      showBanner("error", "Provide a reason or internal notes (min 5 chars).");
      return;
    }
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/properties/${modal.property._id}`, {
        method:      "PATCH",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status:        newStatus,
          reason:        modalReason.trim(),
          internalNotes: modalNotes.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Action failed");
      setProperties(prev => prev.map(p =>
        p._id === modal.property!._id
          ? { ...p, verificationStatus: newStatus,
              status: d.data?.status ?? newStatus,
              isFlagged: d.data?.isFlagged ?? p.isFlagged }
          : p
      ));
      const labels: Record<string, string> = {
        under_review: "marked as In Review",
        verified:     "approved",
        rejected:     "rejected",
        flagged:      "flagged",
      };
      showBanner("success", `Property ${labels[newStatus]} successfully.`);
      closeModal();
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionBusy(false);
    }
  };

  // ── Trash / Restore ───────────────────────────────────────────
  const handleTrashAction = async (action: "trash" | "restore") => {
    if (!modal.property || actionBusy) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/properties/${modal.property._id}/trash`, {
        method:      "PATCH",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, reason: modalReason.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Action failed");
      setProperties(prev => prev.filter(p => p._id !== modal.property!._id));
      showBanner("success", action === "trash"
        ? "Property moved to trash."
        : "Property restored successfully.");
      closeModal();
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionBusy(false);
    }
  };

  // ── Feature toggle ────────────────────────────────────────────
  const handleFeatureToggle = async (property: AdminPropertyItem) => {
    const newFeatured = !property.isFeatured;
    try {
      const res = await fetch(`/api/admin/properties/${property._id}`, {
        method:      "PATCH",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isFeatured: newFeatured }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setProperties(prev => prev.map(p =>
        p._id === property._id
          ? { ...p, isFeatured: d.data?.isFeatured ?? newFeatured }
          : p
      ));
      showBanner("success", newFeatured
        ? "Property marked as featured."
        : "Property removed from featured.");
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed");
    }
  };

  // ── Permanent delete ──────────────────────────────────────────
  const handlePermanentDelete = async () => {
    if (!modal.property || actionBusy) return;
    if (modalConfirm !== "DELETE") {
      showBanner("error", "Type DELETE to confirm permanent deletion.");
      return;
    }
    setActionBusy(true);
    try {
      const res = await fetch(
        `/api/admin/properties/${modal.property._id}/permanent-delete`,
        {
          method:      "DELETE",
          headers:     { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ confirmToken: "DELETE" }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Permanent delete failed");
      setProperties(prev => prev.filter(p => p._id !== modal.property!._id));
      showBanner("success", "Property permanently deleted.");
      closeModal();
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed");
    } finally {
      setActionBusy(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────
  const totalShown = pagination?.total ?? properties.length;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* ── Floating Banner ─────────────────────── */}
      {banner && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300]
          flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border
          backdrop-blur-sm max-w-sm w-full transition-all
          ${banner.type === "success"
            ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
            : banner.type === "error"
            ? "bg-red-50/95 border-red-200 text-red-800"
            : "bg-amber-50/95 border-amber-200 text-amber-800"}`}>
          <span className="text-sm font-semibold flex-1">{banner.message}</span>
          <button onClick={() => setBanner(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Header ──────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#004063] tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" />
            {loading
              ? "Loading properties..."
              : `${totalShown.toLocaleString()} ${featuredOnly ? "featured " : ""}properties`}
            {featuredOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50
                border border-amber-200 rounded-full text-[11px] font-semibold text-amber-700">
                <Star className="w-3 h-3 fill-current" /> Featured only
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
              rounded-xl border transition-all ${showFilters
                ? "bg-[#004063] text-white border-[#004063]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#029bba] hover:text-[#029bba]"}`}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => fetchProperties()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
              bg-[#029bba] text-white rounded-xl hover:bg-[#027a94]
              transition-colors disabled:opacity-60 shadow-sm shadow-[#029bba]/20">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Status Tabs — hidden for featuredOnly ── */}
      {!featuredOnly && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5
          flex gap-1 flex-wrap overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm
                font-semibold transition-all whitespace-nowrap
                ${activeTab === tab.key
                  ? "bg-[#029bba] text-white shadow-md shadow-[#029bba]/20"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Filters Panel ───────────────────────── */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Search
              </label>
              <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}
                className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Title, society, city..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200
                      rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                      focus:border-[#029bba] transition-all"
                  />
                </div>
                <button type="submit"
                  className="px-4 py-2.5 bg-[#029bba] text-white rounded-xl
                    text-sm font-semibold hover:bg-[#027a94] transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                City
              </label>
              <input
                type="text"
                placeholder="Lahore, Karachi..."
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                  focus:border-[#029bba] transition-all"
              />
            </div>

            {/* Type + Sort */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Listing Type
                </label>
                <select value={listingType} onChange={e => setListingType(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                    focus:border-[#029bba] bg-white transition-all">
                  <option value="">All Types</option>
                  <option value="full_payment">Full Payment</option>
                  <option value="installment">Installment</option>
                  <option value="rent">Rent</option>
                </select>
              </div>
            </div>

            {/* Sort + Clear row */}
            <div className="lg:col-span-4 flex items-center gap-3 flex-wrap pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort:</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                    focus:border-[#029bba] bg-white">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="views">Most Viewed</option>
                  <option value="trust_score">Trust Score</option>
                  <option value="quality">Quality Score</option>
                </select>
              </div>

              {(search || city || listingType) && (
                <button
                  onClick={() => {
                    setSearchInput(""); setSearch("");
                    setCity(""); setListingType("");
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold
                    text-red-600 bg-red-50 border border-red-200 rounded-xl
                    hover:bg-red-100 transition-colors">
                  <X className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                  <div className="h-3 bg-gray-100 rounded-lg w-1/3" />
                  <div className="flex gap-2 mt-4">
                    {[...Array(4)].map((__, j) => (
                      <div key={j} className="h-7 w-20 bg-gray-100 rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-700 font-semibold mb-1">Failed to load properties</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button onClick={() => fetchProperties()}
            className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm
              font-semibold hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center
            justify-center mx-auto mb-4 border border-gray-100">
            <Building2 className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-700 font-bold text-lg">No properties found</p>
          <p className="text-sm text-gray-400 mt-1">
            {featuredOnly
              ? "No featured properties yet. Approve and feature a property to see it here."
              : activeTab
              ? `No properties in "${TABS.find(t => t.key === activeTab)?.label}" tab.`
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map(property => (
            <PropertyCard
              key={property._id}
              property={property}
              onApprove={() => openModal("approve", property)}
              onReject={() => openModal("reject", property)}
              onFlag={() => openModal("flag", property)}
              onTrash={() => openModal("trash", property)}
              onRestore={() => openModal("restore", property)}
              onPermanentDelete={() => openModal("permanent_delete", property)}
              onFeatureToggle={() => handleFeatureToggle(property)}
              onReview={() => handleStatusAction("under_review").catch(() => null)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl
          border border-gray-200 shadow-sm px-6 py-4">
          <p className="text-sm text-gray-500">
            Page <span className="font-bold text-gray-700">{pagination.page}</span> of{" "}
            <span className="font-bold text-gray-700">{pagination.totalPages}</span>
            <span className="text-gray-400 ml-1">({pagination.total.toLocaleString()} total)</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev || loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold
                border border-gray-200 rounded-xl disabled:opacity-40
                hover:bg-gray-50 transition-colors text-gray-600">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasNext || loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold
                border border-gray-200 rounded-xl disabled:opacity-40
                hover:bg-gray-50 transition-colors text-gray-600">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          INLINE MODALS
      ══════════════════════════════════════════ */}

      {/* Approve */}
      {modal.type === "approve" && modal.property && (
        <InlineModal
          title="Approve Property"
          subtitle="This will make the property publicly visible"
          onClose={closeModal}
          busy={actionBusy}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl
              border border-emerald-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center
                justify-center flex-shrink-0">
                <BadgeCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-snug">
                  {modal.property.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modal.property.city} · PKR {formatPKR(modal.property.price)}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Approving this property will set its status to{" "}
              <strong className="text-emerald-700">Verified</strong> and make it
              visible to all users on the platform.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeModal} disabled={actionBusy}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600
                  border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleStatusAction("verified")} disabled={actionBusy}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold
                  bg-emerald-600 text-white rounded-xl hover:bg-emerald-700
                  transition-colors disabled:opacity-60 shadow-sm">
                {actionBusy
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle className="w-4 h-4" />}
                Approve Property
              </button>
            </div>
          </div>
        </InlineModal>
      )}

      {/* Reject */}
      {modal.type === "reject" && modal.property && (
        <InlineModal
          title="Reject Property"
          subtitle="Provide a clear reason for the developer"
          onClose={closeModal}
          busy={actionBusy}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center
                justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-sm font-bold text-red-900">{modal.property.title}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={modalReason}
                onChange={e => setModalReason(e.target.value)}
                placeholder="Be specific — the developer will see this reason and needs to understand what to fix..."
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                  focus:border-[#029bba] resize-none transition-all"
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className={`text-xs ${modalReason.length >= 10 ? "text-emerald-600" : "text-gray-400"}`}>
                  {modalReason.length >= 10
                    ? "✓ Sufficient detail"
                    : `${10 - modalReason.length} more characters needed`}
                </p>
                <p className="text-xs text-gray-400">{modalReason.length}/1000</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeModal} disabled={actionBusy}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600
                  border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleStatusAction("rejected")}
                disabled={actionBusy || modalReason.trim().length < 10}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold
                  bg-red-600 text-white rounded-xl hover:bg-red-700
                  transition-colors disabled:opacity-50 shadow-sm">
                {actionBusy
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <XCircle className="w-4 h-4" />}
                Reject Property
              </button>
            </div>
          </div>
        </InlineModal>
      )}

      {/* Flag */}
      {modal.type === "flag" && modal.property && (
        <InlineModal
          title="Flag Property"
          subtitle="Flag for investigation — property stays visible"
          onClose={closeModal}
          busy={actionBusy}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl
              border border-orange-100">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center
                justify-center flex-shrink-0">
                <Flag className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm font-bold text-orange-900">{modal.property.title}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Flag Reason <span className="text-red-500">*</span>
              </label>
              <textarea rows={2} value={modalReason}
                onChange={e => setModalReason(e.target.value)}
                placeholder="Public reason for flagging..."
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                  focus:border-[#029bba] resize-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Internal Notes
                <span className="ml-1.5 text-gray-400 font-normal normal-case">(admin only)</span>
              </label>
              <textarea rows={2} value={modalNotes}
                onChange={e => setModalNotes(e.target.value)}
                placeholder="Internal investigation notes..."
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                  focus:border-[#029bba] resize-none transition-all"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeModal} disabled={actionBusy}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600
                  border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleStatusAction("flagged")}
                disabled={actionBusy ||
                  (modalReason.trim().length < 5 && modalNotes.trim().length < 5)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold
                  bg-orange-500 text-white rounded-xl hover:bg-orange-600
                  transition-colors disabled:opacity-50 shadow-sm">
                {actionBusy
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Flag className="w-4 h-4" />}
                Flag Property
              </button>
            </div>
          </div>
        </InlineModal>
      )}

      {/* Trash */}
      {modal.type === "trash" && modal.property && (
        <InlineModal
          title="Move to Trash"
          subtitle="Property hidden from public — recoverable for 30 days"
          onClose={closeModal}
          busy={actionBusy}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl
              border border-gray-200">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center
                justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{modal.property.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modal.property.city} · {modal.property.society}
                </p>
              </div>
            </div>
            <div className="px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-700 font-medium">
                💡 The listing will be hidden from public view but can be restored
                within 30 days.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Reason
                <span className="ml-1.5 text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <input type="text" value={modalReason}
                onChange={e => setModalReason(e.target.value)}
                placeholder="Reason for moving to trash..."
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                  focus:border-[#029bba] transition-all"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeModal} disabled={actionBusy}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600
                  border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleTrashAction("trash")} disabled={actionBusy}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold
                  bg-gray-800 text-white rounded-xl hover:bg-gray-900
                  transition-colors disabled:opacity-50 shadow-sm">
                {actionBusy
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                Move to Trash
              </button>
            </div>
          </div>
        </InlineModal>
      )}

      {/* Restore */}
      {modal.type === "restore" && modal.property && (
        <InlineModal
          title="Restore Property"
          subtitle="Return this property from trash"
          onClose={closeModal}
          busy={actionBusy}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Restore{" "}
              <strong className="text-gray-900">{modal.property.title}</strong>{" "}
              from trash? It will be returned to its previous verification status.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeModal} disabled={actionBusy}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600
                  border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleTrashAction("restore")} disabled={actionBusy}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold
                  bg-emerald-600 text-white rounded-xl hover:bg-emerald-700
                  transition-colors disabled:opacity-50 shadow-sm">
                {actionBusy
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <RotateCcw className="w-4 h-4" />}
                Restore Property
              </button>
            </div>
          </div>
        </InlineModal>
      )}

      {/* Permanent Delete */}
      {modal.type === "permanent_delete" && modal.property && (
        <InlineModal
          title="Permanently Delete"
          subtitle="This action cannot be undone"
          onClose={closeModal}
          busy={actionBusy}
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center
                  justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-900">This cannot be undone</p>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    All images, documents and data for this property will be permanently
                    deleted from the database and Cloudinary storage.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Deleting:{" "}
              <strong className="text-gray-900">{modal.property.title}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Type{" "}
                <span className="font-mono bg-red-50 text-red-600 px-1.5 py-0.5
                  rounded-lg border border-red-200 text-[11px]">
                  DELETE
                </span>{" "}
                to confirm
              </label>
              <input
                type="text"
                value={modalConfirm}
                onChange={e => setModalConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className={`w-full px-4 py-3 text-sm border rounded-xl font-mono
                  focus:outline-none focus:ring-2 transition-all
                  ${modalConfirm === "DELETE"
                    ? "border-red-400 bg-red-50 focus:ring-red-200"
                    : "border-gray-200 focus:ring-[#029bba]/20 focus:border-[#029bba]"}`}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeModal} disabled={actionBusy}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600
                  border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={actionBusy || modalConfirm !== "DELETE"}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold
                  bg-red-700 text-white rounded-xl hover:bg-red-800
                  transition-colors disabled:opacity-40 shadow-sm">
                {actionBusy
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                Delete Forever
              </button>
            </div>
          </div>
        </InlineModal>
      )}
    </div>
  );
}

// ── DEFAULT EXPORT: AdminPropertiesPage ────────────────────────────────────────

export default function AdminPropertiesPage(): React.ReactElement {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session || session.user?.role !== "admin") {
      void router.replace("/login?redirect=/admin/properties");
    }
  }, [session, authStatus, router]);

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent
            rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "admin") return <></>;

  return (
    <>
      <Head>
        <title>Property Management — Highrise.pk Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AdminLayout>
        <AdminPropertiesContent
          initialFilterStatus=""
          pageTitle="Property Management"
        />
      </AdminLayout>
    </>
  );
}
// ========== END OF FILE ==========