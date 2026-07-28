// pages/owner/dashboard.tsx
// Owner Dashboard — Enterprise V1.0

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Plus,
  List,
  MessageSquare,
  ShieldCheck,
  Eye,
  TrendingUp,
  Home,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronRight,
  Building2,
  ArrowRight,
} from "lucide-react";
import OwnerLayout from "@/components/owner/OwnerLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentListing {
  _id:              string;
  title:            string;
  slug?:            string;
  price:            number;
  area:             number;
  unit:             string;
  city:             string;
  society:          string;
  propertyType:     string;
  listingType:      string;
  verification?:    { status?: string };
  images?:          { url: string; isPrimary?: boolean }[];
  featureImageUrl?: string;
  views:            number;
  inquiryCount:     number;
  createdAt:        string;
}

interface DashboardStats {
  totalListings:     number;
  listingLimit:      number;
  listingsUsed:      number;
  listingsRemaining: number;
  totalViews:        number;
  totalInquiries:    number;
  byStatus: {
    draft:        number;
    pending:      number;
    under_review: number;
    verified:     number;
    rejected:     number;
  };
}

interface DashboardData {
  owner: {
    status:    string;
    fullName?: string;
  };
  stats:          DashboardStats;
  recentListings: RecentListing[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(1)} Cr`;
  if (price >= 100_000)    return `${(price / 100_000).toFixed(1)} Lac`;
  return price.toLocaleString();
}

function getVerificationStatus(
  property: RecentListing
): string {
  return property.verification?.status ?? "draft";
}

function getPrimaryImage(listing: RecentListing): string | null {
  const primary = listing.images?.find((i) => i.isPrimary) ?? listing.images?.[0];
  return primary?.url ?? listing.featureImageUrl ?? null;
}

// ─── Status badge (mini) ──────────────────────────────────────────────────────

const STATUS_MINI: Record<string, { label: string; className: string }> = {
  draft:        { label: "Draft",       className: "bg-gray-100 text-gray-600" },
  pending:      { label: "Pending",     className: "bg-amber-100 text-amber-700" },
  under_review: { label: "In Review",   className: "bg-blue-100 text-blue-700" },
  verified:     { label: "Verified",    className: "bg-emerald-100 text-emerald-700" },
  rejected:     { label: "Rejected",    className: "bg-red-100 text-red-700" },
  flagged:      { label: "Flagged",     className: "bg-orange-100 text-orange-700" },
};

function MiniStatusBadge({ status }: { status: string }): React.ReactElement {
  const cfg = STATUS_MINI[status] ?? STATUS_MINI.draft;
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  sub,
  href,
}: {
  label:      string;
  value:      string | number;
  icon:       React.ReactNode;
  iconBg:     string;
  iconColor:  string;
  sub?:       string;
  href?:      string;
}): React.ReactElement {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        {href && <ChevronRight className="w-4 h-4 text-gray-300" />}
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

// ─── Listing Progress ─────────────────────────────────────────────────────────

function ListingProgressBar({
  used,
  limit,
}: {
  used:  number;
  limit: number;
}): React.ReactElement {
  const pct      = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isFull   = used >= limit;
  const isNearby = pct >= 80 && !isFull;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#029bba]" />
          <span className="text-sm font-bold text-gray-900">Listing Quota</span>
        </div>
        <span
          className={`text-sm font-black ${
            isFull ? "text-red-600" : isNearby ? "text-amber-600" : "text-[#029bba]"
          }`}
        >
          {used} / {limit}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isFull
              ? "bg-red-500"
              : isNearby
              ? "bg-amber-500"
              : "bg-[#029bba]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {isFull
          ? "You have reached your listing limit."
          : `${limit - used} listing slot${limit - used === 1 ? "" : "s"} remaining`}
      </p>
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions({
  ownerStatus,
  listingsFull,
}: {
  ownerStatus:  string;
  listingsFull: boolean;
}): React.ReactElement {
  const approved = ownerStatus === "approved";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-black text-gray-900 mb-3">Quick Actions</h3>
      <div className="space-y-2">
        {approved && !listingsFull ? (
          <Link
            href="/owner/listings/new"
            className="flex items-center justify-between px-4 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Listing
            </span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : !approved ? (
          <Link
            href="/owner/verify"
            className="flex items-center justify-between px-4 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Complete Verification
            </span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-100 text-gray-400 rounded-xl text-sm font-bold cursor-not-allowed">
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Listing
            </span>
            <span className="text-xs">Limit Reached</span>
          </div>
        )}

        <Link
          href="/owner/listings"
          className="flex items-center justify-between px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <List className="w-4 h-4 text-gray-400" />
            View All Listings
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>

        <Link
          href="/owner/leads"
          className="flex items-center justify-between px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            View My Leads
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>

        <Link
          href="/owner/verify"
          className="flex items-center justify-between px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            Verification Status
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
      </div>
    </div>
  );
}

// ─── Owner Status Card ────────────────────────────────────────────────────────

function OwnerStatusCard({
  status,
}: {
  status: string;
}): React.ReactElement {
  const CONFIG = {
    approved: {
      bg:     "bg-emerald-50 border-emerald-200",
      icon:   <CheckCircle className="w-8 h-8 text-emerald-500" />,
      title:  "Verified Owner",
      text:   "Your account is verified. You can list and manage properties.",
      action: null,
    },
    pending: {
      bg:     "bg-amber-50 border-amber-200",
      icon:   <Clock className="w-8 h-8 text-amber-500" />,
      title:  "Verification Pending",
      text:   "Your documents have been submitted and are awaiting review.",
      action: { label: "View Status", href: "/owner/verify" },
    },
    under_review: {
      bg:     "bg-blue-50 border-blue-200",
      icon:   <Clock className="w-8 h-8 text-blue-500" />,
      title:  "Under Review",
      text:   "Our team is reviewing your documents. You'll be notified within 24–48 hours.",
      action: { label: "View Status", href: "/owner/verify" },
    },
    rejected: {
      bg:     "bg-red-50 border-red-200",
      icon:   <XCircle className="w-8 h-8 text-red-500" />,
      title:  "Verification Rejected",
      text:   "Your verification was rejected. Please re-submit with correct documents.",
      action: { label: "Re-submit", href: "/owner/verify" },
    },
    suspended: {
      bg:     "bg-red-50 border-red-200",
      icon:   <AlertTriangle className="w-8 h-8 text-red-500" />,
      title:  "Account Suspended",
      text:   "Your account has been suspended. Please contact support.",
      action: null,
    },
  };

  const cfg = CONFIG[status as keyof typeof CONFIG] ?? CONFIG.pending;

  return (
    <div className={`rounded-2xl border p-5 ${cfg.bg}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-gray-900 mb-1">{cfg.title}</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{cfg.text}</p>
          {cfg.action && (
            <Link
              href={cfg.action.href}
              className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-[#029bba] hover:underline"
            >
              {cfg.action.label}
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Recent Listing Card ──────────────────────────────────────────────────────

function RecentListingCard({
  listing,
}: {
  listing: RecentListing;
}): React.ReactElement {
  const img    = getPrimaryImage(listing);
  const status = getVerificationStatus(listing);

  return (
    <Link
      href={`/owner/listings`}
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#029bba]/30 hover:bg-[#029bba]/5 transition-all group"
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
        {img ? (
          <Image
            src={img}
            alt={listing.title}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <MiniStatusBadge status={status} />
        </div>
        <p className="text-sm font-bold text-gray-900 truncate">{listing.title}</p>
        <p className="text-xs text-gray-500 truncate">
          {listing.society}, {listing.city}
        </p>
        <p className="text-xs font-bold text-[#029bba] mt-0.5">
          PKR {formatPrice(listing.price)}
        </p>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
          <Eye className="w-3 h-3" />
          {listing.views}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 justify-end">
          <MessageSquare className="w-3 h-3" />
          {listing.inquiryCount}
        </div>
      </div>
    </Link>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function DashboardContent(): React.ReactElement {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState("");

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/owner/dashboard", { credentials: "include" });
      if (!res.ok) {
        setError("Failed to load dashboard data.");
        return;
      }
      const json = (await res.json()) as { success: boolean } & DashboardData;
      if (json.success) {
        setData(json);
      }
    } catch {
      setError("Something went wrong. Please refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold mb-4">{error}</p>
        <button
          type="button"
          onClick={() => void fetchDashboard()}
          className="px-5 py-2.5 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return <></>;

  const { owner, stats, recentListings } = data;
  const listingsFull = stats.listingsUsed >= stats.listingLimit;

  return (
    <div className="p-4 md:p-6 pb-16">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#029bba]" />
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here&apos;s your property overview.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchDashboard(true)}
          disabled={refreshing}
          className="p-2.5 border border-gray-200 bg-white rounded-xl text-gray-500 hover:text-[#029bba] hover:border-[#029bba] transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Owner Status Card ────────────────────────────────────────────── */}
      <div className="mb-6">
        <OwnerStatusCard status={owner.status} />
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Listings"
          value={stats.totalListings}
          icon={<Building2 className="w-5 h-5" />}
          iconBg="bg-[#029bba]/10"
          iconColor="text-[#029bba]"
          href="/owner/listings"
        />
        <StatCard
          label="Total Views"
          value={stats.totalViews.toLocaleString()}
          icon={<Eye className="w-5 h-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Total Inquiries"
          value={stats.totalInquiries.toLocaleString()}
          icon={<MessageSquare className="w-5 h-5" />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          href="/owner/leads"
        />
        <StatCard
          label="Verified Listings"
          value={stats.byStatus.verified}
          icon={<CheckCircle className="w-5 h-5" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub={`${stats.byStatus.pending + stats.byStatus.under_review} pending`}
        />
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left: Recent Listings */}
        <div className="lg:col-span-2 space-y-5">

          {/* Listing Progress */}
          <ListingProgressBar
            used={stats.listingsUsed}
            limit={stats.listingLimit}
          />

          {/* Status breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#029bba]" />
              Listings by Status
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Draft",       count: stats.byStatus.draft,        color: "text-gray-600",   bg: "bg-gray-50" },
                { label: "Pending",     count: stats.byStatus.pending,       color: "text-amber-600",  bg: "bg-amber-50" },
                { label: "In Review",   count: stats.byStatus.under_review,  color: "text-blue-600",   bg: "bg-blue-50" },
                { label: "Verified",    count: stats.byStatus.verified,      color: "text-emerald-600",bg: "bg-emerald-50" },
                { label: "Rejected",    count: stats.byStatus.rejected,      color: "text-red-600",    bg: "bg-red-50" },
              ].map((s) => (
                <Link
                  key={s.label}
                  href="/owner/listings"
                  className={`${s.bg} rounded-xl p-3 text-center hover:scale-105 transition-transform`}
                >
                  <p className={`text-xl font-black ${s.color}`}>{s.count}</p>
                  <p className={`text-[11px] font-semibold mt-0.5 ${s.color}`}>{s.label}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent listings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#029bba]" />
                Recent Listings
              </h3>
              <Link
                href="/owner/listings"
                className="text-xs font-bold text-[#029bba] hover:underline flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {recentListings.length > 0 ? (
              <div className="space-y-2">
                {recentListings.map((listing) => (
                  <RecentListingCard key={listing._id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Home className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-500">No listings yet</p>
                {owner.status === "approved" && !listingsFull && (
                  <Link
                    href="/owner/listings/new"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Listing
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Actions + Status */}
        <div className="space-y-5">
          <QuickActions
            ownerStatus={owner.status}
            listingsFull={listingsFull}
          />

          {/* Verification guide */}
          {owner.status !== "approved" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#029bba]" />
                Verification Guide
              </h3>
              <div className="space-y-2.5">
                {[
                  { step: 1, text: "Submit CNIC documents" },
                  { step: 2, text: "Admin reviews (24–48h)" },
                  { step: 3, text: "Get verified owner badge" },
                  { step: 4, text: "List up to 10 properties" },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-black flex items-center justify-center flex-shrink-0">
                      {s.step}
                    </div>
                    <p className="text-xs text-gray-600">{s.text}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/owner/verify"
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Start Verification
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function OwnerDashboardPage(): React.ReactElement {
  return (
    <OwnerLayout
      title="Dashboard | Owner Portal — Highrise.pk"
      description="Manage your properties on Highrise.pk"
    >
      <DashboardContent />
    </OwnerLayout>
  );
}