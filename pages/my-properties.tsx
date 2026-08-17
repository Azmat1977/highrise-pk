// File: pages/my-properties.tsx
// COMPLETE REPLACEMENT
// Owner dashboard — manage listings (view/edit/trash)
// All banned patterns removed (axios, framer-motion, shadcn, localStorage)

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Home,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Lock,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ListingType =
  | "full_payment"
  | "installment"
  | "rent"
  | "pre_launch"
  | "joint_venture"
  | "lease"
  | "auction"
  | "rent_to_own";

type PropertyStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "approved"
  | "verified"
  | "rejected"
  | "flagged";

interface PropertyImage {
  url: string;
  publicId?: string;
}

interface Property {
  _id: string;
  slug?: string;
  title: string;
  propertyType: string;
  listingType: ListingType;
  price: number;
  totalPrice?: number;
  area: number;
  unit: string;
  city: string;
  bedrooms?: number;
  bathrooms?: number;
  images: PropertyImage[];
  status: PropertyStatus;
  views: number;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

type ListingFilter = "all" | "full_payment" | "installment" | "rent";
type ViewMode = "active" | "trash";

interface BannerState {
  type: "success" | "error";
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  const p = typeof price === "number" && !isNaN(price) ? price : 0;
  if (p >= 10_000_000) return `${(p / 10_000_000).toFixed(2)} Crore`;
  if (p >= 100_000) return `${(p / 100_000).toFixed(2)} Lac`;
  return p.toLocaleString("en-PK");
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getListingTypeLabel(type: ListingType): string {
  const map: Record<ListingType, string> = {
    full_payment:  "For Sale",
    installment:   "Installments",
    rent:          "For Rent",
    pre_launch:    "Pre-Launch",
    joint_venture: "Joint Venture",
    lease:         "Lease",
    auction:       "Auction",
    rent_to_own:   "Rent-to-Own",
  };
  return map[type] ?? "For Sale";
}

function getPropertyUrl(property: Property): string {
  return `/property/${property.slug ?? property._id}`;
}

const OWNER_PURGE_GRACE_DAYS = 30;

function purgeEligibility(deletedAt?: string | null): { eligible: boolean; daysRemaining: number; eligibleAt: Date | null } {
  if (!deletedAt) return { eligible: false, daysRemaining: OWNER_PURGE_GRACE_DAYS, eligibleAt: null };
  const deleted = new Date(deletedAt);
  if (Number.isNaN(deleted.getTime())) return { eligible: false, daysRemaining: OWNER_PURGE_GRACE_DAYS, eligibleAt: null };
  const eligibleAt = new Date(deleted.getTime() + OWNER_PURGE_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const remainingMs = eligibleAt.getTime() - Date.now();
  return {
    eligible: remainingMs <= 0,
    daysRemaining: Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))),
    eligibleAt,
  };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PropertyStatus }): React.ReactElement {
  if (status === "approved" || status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3" />
        {status === "verified" ? "Verified" : "Approved"}
      </span>
    );
  }
  if (status === "rejected" || status === "flagged") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3" />
        {status === "flagged" ? "Flagged" : "Rejected"}
      </span>
    );
  }
  if (status === "under_review") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Clock className="w-3 h-3" />
        Under Review
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

// ─── Confirmation Modal (inline — no external library) ───────────────────────

interface TrashConfirmModalProps {
  open: boolean;
  propertyTitle: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function TrashConfirmModal({
  open,
  propertyTitle,
  busy,
  onCancel,
  onConfirm,
}: TrashConfirmModalProps): React.ReactElement | null {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm move to trash"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-[#ef4444]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#004063]">
                Move to Trash?
              </h3>
              <p className="text-xs text-[#666666] mt-0.5">
                Listing will be hidden from public view
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-[#333333] mb-4 leading-relaxed">
            You are about to move{" "}
            <span className="font-semibold text-[#004063]">
              &quot;{propertyTitle}&quot;
            </span>{" "}
            to trash.
          </p>

          {/* Info banner */}
          <div className="bg-[#eff6ff] border-l-4 border-[#029bba] rounded-lg p-3 mb-5">
            <p className="text-xs text-[#004063] leading-relaxed">
              <strong>What happens:</strong> The listing is hidden from public
              search and your inquiries continue to be preserved. You can restore
              it from the Trash section within 30 days.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 px-5 py-3 rounded-xl border border-gray-200 text-[#333333] font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#ef4444] text-white font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Moving…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Move to Trash
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PermanentDeleteModalProps {
  open: boolean;
  propertyTitle: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

function PermanentDeleteModal({
  open,
  propertyTitle,
  busy,
  onCancel,
  onConfirm,
}: PermanentDeleteModalProps): React.ReactElement | null {
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setConfirmation("");
      setReason("");
    }
  }, [open]);

  if (!open) return null;
  const valid = confirmation === "DELETE PERMANENTLY" && reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Confirm permanent deletion">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onCancel()} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 border-b border-red-100 bg-red-50 px-6 py-5">
          <AlertTriangle className="mt-0.5 h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-bold text-red-800">Permanently delete Property?</h3>
            <p className="mt-1 text-xs leading-relaxed text-red-700">This cannot be undone. Public media and protected evidence will be deleted or placed into the durable cleanup queue.</p>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-gray-700">You are permanently deleting <strong>{propertyTitle}</strong>.</p>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="permanent-delete-reason">Reason</label>
            <textarea id="permanent-delete-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} disabled={busy} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100" placeholder="Explain why you are permanently deleting this listing (minimum 10 characters)." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="permanent-delete-confirmation">Type DELETE PERMANENTLY</label>
            <input id="permanent-delete-confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={busy} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100" autoComplete="off" />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => onConfirm(reason.trim())} disabled={busy || !valid} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────

interface AuthGateProps {
  state: "loading" | "unauthenticated" | "wrong-role";
}

function AuthGate({ state }: AuthGateProps): React.ReactElement {
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#029bba]" />
      </div>
    );
  }

  if (state === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-[#004063] mb-2">
            Login Required
          </h2>
          <p className="text-sm text-[#666666] mb-6">
            Please login to view and manage your property listings.
          </p>
          <Link
            href="/login?redirect=/my-properties"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#017a8a] transition-colors"
          >
            Login
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // wrong-role
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md w-full">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-[#004063] mb-2">
          List Properties First
        </h2>
        <p className="text-sm text-[#666666] mb-6">
          You haven&apos;t listed any properties yet. Add your first property to
          start managing your listings here.
        </p>
        <Link
          href="/add-property"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#017a8a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Your First Property
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyPropertiesPage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState<BannerState | null>(null);

  const [listingFilter, setListingFilter] = useState<ListingFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("active");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmProperty, setConfirmProperty] = useState<Property | null>(null);
  const [trashLoading, setTrashLoading] = useState<string | null>(null);
  const [permanentOpen, setPermanentOpen] = useState(false);
  const [permanentProperty, setPermanentProperty] = useState<Property | null>(null);

  const fetchAbortRef = useRef<AbortController | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Banner auto-dismiss ────────────────────────────────────────────────────
  const showBanner = useCallback((type: "success" | "error", message: string) => {
    setBanner({ type, message });
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setBanner(null), 5000);
  }, []);

  useEffect(
    () => () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    },
    []
  );

  // ── Fetch properties ───────────────────────────────────────────────────────
  const fetchProperties = useCallback(async () => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      setLoading(true);
      setError("");

      const query = viewMode === "trash" ? "?deletedOnly=true" : "";
      const res = await fetch(`/api/properties/my-properties${query}`, {
        credentials: "include",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(body.message ?? body.error ?? `Failed to load (${res.status})`);
      }

      const data = (await res.json()) as { properties?: Property[] };
      setProperties(data.properties ?? []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg =
        err instanceof Error ? err.message : "Failed to load properties";
      setError(msg);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  // Trigger fetch when session is authenticated
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetchProperties();
    return () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
  }, [sessionStatus, fetchProperties]);

  // ── Trash flow ─────────────────────────────────────────────────────────────
  const requestTrash = useCallback(
    (property: Property) => {
      if (trashLoading) return;
      setConfirmProperty(property);
      setConfirmOpen(true);
    },
    [trashLoading]
  );

  const cancelTrash = useCallback(() => {
    if (trashLoading) return;
    setConfirmOpen(false);
    setConfirmProperty(null);
  }, [trashLoading]);

  const confirmTrash = useCallback(async () => {
    if (!confirmProperty) return;
    const propertyId = confirmProperty._id;

    setTrashLoading(propertyId);

    try {
      const res = await fetch(`/api/properties/${propertyId}/trash`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true, reason: "Owner moved listing to Trash from My Properties" }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(body.message ?? body.error ?? "Failed to move to trash");
      }

      setProperties((prev) => prev.filter((p) => p._id !== propertyId));
      setConfirmOpen(false);
      setConfirmProperty(null);
      showBanner("success", "Property moved to trash successfully.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to move to trash";
      showBanner("error", msg);
    } finally {
      setTrashLoading(null);
    }
  }, [confirmProperty, showBanner]);

  const restoreProperty = useCallback(async (property: Property) => {
    if (trashLoading) return;
    setTrashLoading(property._id);
    try {
      const res = await fetch(`/api/properties/${property._id}/trash`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: false, reason: "Owner restored listing from Trash" }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(body.message ?? body.error ?? "Failed to restore Property");
      setProperties((prev) => prev.filter((p) => p._id !== property._id));
      showBanner("success", body.message ?? "Property restored to Draft. Resubmit it for verification before publication.");
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to restore Property");
    } finally {
      setTrashLoading(null);
    }
  }, [showBanner, trashLoading]);

  const requestPermanentDelete = useCallback((property: Property) => {
    if (trashLoading) return;
    setPermanentProperty(property);
    setPermanentOpen(true);
  }, [trashLoading]);

  const confirmPermanentDelete = useCallback(async (reason: string) => {
    if (!permanentProperty) return;
    setTrashLoading(permanentProperty._id);
    try {
      const res = await fetch(`/api/properties/${permanentProperty._id}/permanent-delete`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationCode: "DELETE PERMANENTLY", reason }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
      if (!res.ok) throw new Error(body.message ?? "Permanent deletion failed");
      const id = permanentProperty._id;
      setProperties((prev) => prev.filter((p) => p._id !== id));
      setPermanentOpen(false);
      setPermanentProperty(null);
      showBanner("success", "Property permanently deleted. Cleanup completed or was queued safely.");
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Permanent deletion failed");
    } finally {
      setTrashLoading(null);
    }
  }, [permanentProperty, showBanner]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = {
      all:          properties.length,
      full_payment: 0,
      installment:  0,
      rent:         0,
    };
    properties.forEach((p) => {
      if (p.listingType === "full_payment") c.full_payment++;
      else if (p.listingType === "installment") c.installment++;
      else if (p.listingType === "rent") c.rent++;
    });
    return c;
  }, [properties]);

  const filteredProperties = useMemo(() => {
    if (listingFilter === "all") return properties;
    return properties.filter((p) => p.listingType === listingFilter);
  }, [properties, listingFilter]);

  // ── Auth states ────────────────────────────────────────────────────────────
  if (sessionStatus === "loading") {
    return <AuthGate state="loading" />;
  }

  if (sessionStatus === "unauthenticated") {
    return <AuthGate state="unauthenticated" />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>My Properties | Highrise.pk</title>
        <meta
          name="description"
          content="Manage your property listings on Highrise.pk"
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* ── Banner ────────────────────────────────────────────────────────── */}
      {banner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[130] animate-fadeIn">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border-l-4 ${
              banner.type === "success"
                ? "bg-[#f0fdf4] border-[#10b981] text-[#10b981]"
                : "bg-[#fef2f2] border-[#ef4444] text-red-700"
            }`}
          >
            {banner.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{banner.message}</p>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Trash Confirm Modal ───────────────────────────────────────────── */}
      <TrashConfirmModal
        open={confirmOpen}
        propertyTitle={confirmProperty?.title ?? ""}
        busy={trashLoading !== null}
        onCancel={cancelTrash}
        onConfirm={confirmTrash}
      />
      <PermanentDeleteModal
        open={permanentOpen}
        propertyTitle={permanentProperty?.title ?? ""}
        busy={trashLoading !== null}
        onCancel={() => { if (!trashLoading) { setPermanentOpen(false); setPermanentProperty(null); } }}
        onConfirm={confirmPermanentDelete}
      />

      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#004063]">
                My Properties
              </h1>
              <p className="text-[#666666] mt-1">
                {viewMode === "active" ? "Manage and track your active property listings" : "Restore listings or permanently delete them after the 30-day grace period"}
              </p>
            </div>
            <Link
              href="/add-property"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#029bba] to-[#017a8a] text-white font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Add New Property
            </Link>
          </div>

          <div className="mb-5 inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => { setViewMode("active"); setListingFilter("all"); }} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${viewMode === "active" ? "bg-[#004063] text-white" : "text-gray-600 hover:bg-gray-50"}`}>Active</button>
            <button type="button" onClick={() => { setViewMode("trash"); setListingFilter("all"); }} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${viewMode === "trash" ? "bg-[#004063] text-white" : "text-gray-600 hover:bg-gray-50"}`}>Trash</button>
          </div>

          {/* ── Listing type filters ───────────────────────────────────── */}
          {!loading && !error && properties.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {[
                { key: "all"          as ListingFilter, label: "All",          count: counts.all          },
                { key: "full_payment" as ListingFilter, label: "For Sale",     count: counts.full_payment },
                { key: "installment"  as ListingFilter, label: "Installments", count: counts.installment  },
                { key: "rent"         as ListingFilter, label: "For Rent",     count: counts.rent         },
              ].map((opt) => {
                const active = listingFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setListingFilter(opt.key)}
                    className={`px-4 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-2 ${
                      active
                        ? "bg-[#029bba] text-white border-[#029bba] shadow-sm"
                        : "bg-white text-[#666666] border-gray-300 hover:border-[#029bba] hover:text-[#029bba]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-[#666666]"
                      }`}
                    >
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Loading ─────────────────────────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#029bba] mb-3" />
              <p className="text-sm text-[#666666]">Loading your properties…</p>
            </div>
          )}

          {/* ── Error ───────────────────────────────────────────────────── */}
          {error && !loading && (
            <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-2xl p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Failed to Load Properties
              </h3>
              <p className="text-red-600 mb-5">{error}</p>
              <button
                type="button"
                onClick={() => fetchProperties()}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Empty (no listings at all) ────────────────────────────── */}
          {!loading && !error && properties.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-[#004063] mb-2">
                {viewMode === "active" ? "No Properties Yet" : "Trash is Empty"}
              </h2>
              <p className="text-[#666666] mb-6 max-w-md mx-auto">
                {viewMode === "active"
                  ? "You haven't added any properties. Start by adding your first property to grow your portfolio on Highrise.pk."
                  : "Properties moved to Trash will appear here during the 30-day restoration grace period."}
              </p>
              {viewMode === "active" && (
                <Link
                  href="/add-property"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#029bba] to-[#017a8a] text-white font-semibold rounded-xl shadow-md hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Property
                </Link>
              )}
            </div>
          )}

          {/* ── Filtered empty ──────────────────────────────────────────── */}
          {!loading &&
            !error &&
            properties.length > 0 &&
            filteredProperties.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-[#666666]">
                  No properties found under this filter.
                </p>
                <button
                  type="button"
                  onClick={() => setListingFilter("all")}
                  className="mt-3 text-sm text-[#029bba] font-medium hover:underline"
                >
                  Show all properties
                </button>
              </div>
            )}

          {/* ── Properties Grid ─────────────────────────────────────────── */}
          {!loading && !error && filteredProperties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => {
                const isRent = property.listingType === "rent";
                const isTrashBusy = trashLoading === property._id;

                return (
                  <div
                    key={property._id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow animate-fadeIn"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-gray-200">
                      {property.images?.[0]?.url ? (
                        <img
                          src={property.images[0].url}
                          alt={property.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      {/* Status badge */}
                      <div className="absolute top-2 left-2">
                        <StatusBadge status={property.status} />
                      </div>

                      {/* Listing type badge */}
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#029bba] text-white shadow">
                          {getListingTypeLabel(property.listingType)}
                        </span>
                      </div>

                      {/* Image count */}
                      {property.images && property.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          +{property.images.length - 1} photos
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-[#333333] mb-1 line-clamp-1">
                        {property.title}
                      </h3>

                      <div className="flex items-center text-[#666666] text-sm mb-2">
                        <MapPin className="w-3.5 h-3.5 mr-1" />
                        {property.city}
                      </div>

                      <p className="text-lg font-bold text-[#029bba] mb-2">
                        PKR {formatPrice(property.totalPrice ?? property.price)}
                        {isRent && (
                          <span className="text-xs font-semibold text-[#666666] ml-1">
                            / month
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-[#666666] mb-3">
                        <span>
                          {property.area} {property.unit}
                        </span>
                        {property.bedrooms !== undefined && property.bedrooms > 0 && (
                          <span>{property.bedrooms} Beds</span>
                        )}
                        {property.bathrooms !== undefined && property.bathrooms > 0 && (
                          <span>{property.bathrooms} Baths</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                        <span>Listed: {formatDate(property.createdAt)}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {property.views} views
                        </span>
                      </div>

                      {/* Actions */}
                      {viewMode === "active" ? (
                        <div className="flex gap-2">
                          <Link href={getPropertyUrl(property)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-[#333333] text-sm font-medium hover:bg-gray-50 transition-colors">
                            <Eye className="w-4 h-4" /> View
                          </Link>
                          <Link href={`/edit-property/${property._id}`} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-[#333333] text-sm font-medium hover:bg-gray-50 transition-colors">
                            <Edit className="w-4 h-4" /> Edit
                          </Link>
                          <button type="button" onClick={() => requestTrash(property)} disabled={isTrashBusy} className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50" aria-label="Move to trash">
                            {isTrashBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      ) : (() => {
                        const eligibility = purgeEligibility(property.deletedAt);
                        return (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => restoreProperty(property)} disabled={isTrashBusy} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#029bba] px-3 py-2 text-sm font-semibold text-white hover:bg-[#027a94] disabled:opacity-50">
                                {isTrashBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Restore to Draft
                              </button>
                              <button type="button" onClick={() => requestPermanentDelete(property)} disabled={isTrashBusy || !eligibility.eligible} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                                <Trash2 className="h-4 w-4" /> Delete permanently
                              </button>
                            </div>
                            <p className="text-xs text-gray-500">
                              {eligibility.eligible
                                ? "30-day grace period complete. Permanent deletion is now available."
                                : `Permanent deletion available in ${eligibility.daysRemaining} day${eligibility.daysRemaining === 1 ? "" : "s"}.`}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}