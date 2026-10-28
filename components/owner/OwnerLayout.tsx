// components/owner/OwnerLayout.tsx
// Owner Portal Layout — Enterprise V1.0
// Mirrors AgentLayout pattern with owner-specific:
//   - Verification status banner
//   - Listing limit display  
//   - Owner nav items
//   - Mobile drawer

import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import {
  Home,
  LayoutDashboard,
  List,
  Plus,
  MessageSquare,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Bell,
  User,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OwnerProfile {
  status:        "pending" | "under_review" | "approved" | "rejected" | "suspended";
  listingCount:  number;
  listingLimit:  number;
  fullName?:     string;
}

interface NavItem {
  href:    string;
  label:   string;
  icon:    React.ReactNode;
  badge?:  number;
  exact?:  boolean;
}

interface OwnerLayoutProps {
  children:     React.ReactNode;
  title?:       string;
  description?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    href:  "/owner/dashboard",
    label: "Dashboard",
    icon:  <LayoutDashboard className="w-5 h-5" />,
    exact: true,
  },
  {
    href:  "/owner/listings",
    label: "My Listings",
    icon:  <List className="w-5 h-5" />,
  },
  {
    href:  "/owner/listings/new",
    label: "Add Listing",
    icon:  <Plus className="w-5 h-5" />,
  },
  {
    href:  "/owner/leads",
    label: "My Leads",
    icon:  <MessageSquare className="w-5 h-5" />,
  },
  {
    href:  "/owner/verify",
    label: "Verification",
    icon:  <ShieldCheck className="w-5 h-5" />,
  },
];

// ─── Status Banner Config ─────────────────────────────────────────────────────

const STATUS_BANNER = {
  pending: {
    bg:     "bg-amber-50 border-amber-200",
    text:   "text-amber-800",
    icon:   <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />,
    label:  "Verification Pending",
    detail: "Your verification is pending admin review. Listing requires approval.",
  },
  under_review: {
    bg:     "bg-blue-50 border-blue-200",
    text:   "text-blue-800",
    icon:   <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />,
    label:  "Under Review",
    detail: "Your documents are being reviewed. We'll notify you within 24–48 hours.",
  },
  approved: {
    bg:     "bg-emerald-50 border-emerald-200",
    text:   "text-emerald-800",
    icon:   <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />,
    label:  "Verified Owner",
    detail: "Your account is verified. You can list up to 10 properties.",
  },
  rejected: {
    bg:     "bg-red-50 border-red-200",
    text:   "text-red-800",
    icon:   <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />,
    label:  "Verification Rejected",
    detail: "Your verification was rejected. Please re-submit with correct documents.",
  },
  suspended: {
    bg:     "bg-red-50 border-red-200",
    text:   "text-red-800",
    icon:   <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />,
    label:  "Account Suspended",
    detail: "Your account has been suspended. Please contact support.",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNavActive(
  href:      string,
  pathname:  string,
  exact:     boolean = false,
  allNavHrefs: string[] = []
): boolean {
  // Exact match required
  if (exact) return pathname === href;

  // Direct match
  if (pathname === href) return true;

  // Prefix match — but skip if a MORE SPECIFIC nav item also matches
  // Example: /owner/listings/new should NOT activate "My Listings" (/owner/listings)
  //          because Add Listing (/owner/listings/new) is a more specific match
  if (pathname.startsWith(href + "/")) {
    // Check if any OTHER nav item is a more specific prefix
    const hasMoreSpecificMatch = allNavHrefs.some(
      (otherHref) =>
        otherHref !== href &&                    // not the current item
        otherHref.length > href.length &&        // longer (more specific)
        otherHref.startsWith(href) &&            // starts with current
        (pathname === otherHref || pathname.startsWith(otherHref + "/"))
    );
    return !hasMoreSpecificMatch;
  }

  return false;
}

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────

function SideNavItem({
  item,
  pathname,
  onClick,
  allNavHrefs = [],
}: {
  item:        NavItem;
  pathname:    string;
  onClick?:    () => void;
  allNavHrefs?: string[];
}): React.ReactElement {
  const active = isNavActive(item.href, pathname, item.exact, allNavHrefs);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
        active
          ? "bg-[#029bba] text-white shadow-md shadow-[#029bba]/20"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className={active ? "text-white" : "text-gray-400"}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            active
              ? "bg-white/20 text-white"
              : "bg-[#029bba]/10 text-[#029bba]"
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ─── Listing Progress Bar ─────────────────────────────────────────────────────

function ListingProgress({
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
    <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          Listings Used
        </span>
        <span
          className={`text-xs font-black ${
            isFull
              ? "text-red-600"
              : isNearby
              ? "text-amber-600"
              : "text-[#029bba]"
          }`}
        >
          {used}/{limit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
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
      {isFull && (
        <p className="text-[11px] text-red-600 font-semibold mt-1.5">
          Listing limit reached
        </p>
      )}
    </div>
  );
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  pathname,
  profile,
  userName,
}: {
  open:     boolean;
  onClose:  () => void;
  pathname: string;
  profile:  OwnerProfile | null;
  userName: string;
}): React.ReactElement {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return <></>;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-black text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 truncate max-w-[140px]">
                {userName}
              </p>
              <p className="text-xs text-gray-500">Property Owner</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <SideNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              onClick={onClose}
              allNavHrefs={NAV_ITEMS.map((n) => n.href)}
            />
          ))}
        </nav>

        {/* Listing progress */}
        {profile?.status === "approved" && (
          <div className="p-3 border-t border-gray-100">
            <ListingProgress
              used={profile.listingCount}
              limit={profile.listingLimit}
            />
          </div>
        )}

        {/* Sign out */}
        <div className="p-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function OwnerLayout({
  children,
  title       = "Owner Portal | Highrise.pk",
  description = "Manage your properties on Highrise.pk",
}: OwnerLayoutProps): React.ReactElement {
  const { data: session, status: authStatus } = useSession();
  const router   = useRouter();
  const pathname = router.pathname;

  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [profile, setProfile]         = useState<OwnerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Derive user info from session
  const userName  = session?.user?.name ?? "Owner";
  const userEmail = session?.user?.email ?? "";

  // ── Auth redirect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      void router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    const sessionUser = session?.user as {
      role?:            string;
      isVerifiedOwner?: boolean;
    } | undefined;

    const role            = sessionUser?.role;
    const isVerifiedOwner = sessionUser?.isVerifiedOwner;

    // Allow: admin OR verified owner
    // Redirect: anyone else (unverified users trying to access owner portal)
    if (
      authStatus === "authenticated" &&
      role !== "admin" &&
      !isVerifiedOwner
    ) {
      // Not verified — send to verification page instead of dashboard
      void router.push("/owner/verify");
    }
  }, [authStatus, session, pathname, router]);

  // ── Fetch owner profile for status + listing count ──────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const [statusRes, listingsRes] = await Promise.all([
        fetch("/api/owner/verification-status", { credentials: "include" }),
        fetch("/api/owner/listings?limit=1&countOnly=true", { credentials: "include" }),
      ]);

      let ownerStatus: OwnerProfile["status"] = "pending";
      let listingCount = 0;
      let listingLimit = 10;

      if (statusRes.ok) {
        // API returns: { success, data: { status, maxListings, ... } }
        const statusData = (await statusRes.json()) as {
          success?: boolean;
          status?:  string;                     // legacy fallback
          profile?: { status?: string };        // legacy fallback
          data?:    {
            status?:      string;
            maxListings?: number;
            activeListingsCount?: number;
          };
        };

        // Priority: data.status (current API) > status > profile.status (legacy)
        ownerStatus =
          (statusData.data?.status        ??
           statusData.status              ??
           statusData.profile?.status     ??
           "pending") as OwnerProfile["status"];

        // Sync listing limit from status API if available
        if (typeof statusData.data?.maxListings === "number") {
          listingLimit = statusData.data.maxListings;
        }

        // Sync count from status API as fallback
        if (typeof statusData.data?.activeListingsCount === "number") {
          listingCount = statusData.data.activeListingsCount;
        }
      }

      if (listingsRes.ok) {
        const listingData = (await listingsRes.json()) as {
          total?: number;
          count?: number;
          pagination?: { total?: number };
        };
        // Prefer count from listings API (real-time), fallback to status API count
        const listingsApiCount =
          listingData.total ??
          listingData.count ??
          listingData.pagination?.total;

        if (typeof listingsApiCount === "number") {
          listingCount = listingsApiCount;
        }
      }

      setProfile({
        status:       ownerStatus,
        listingCount,
        listingLimit,
        fullName:     userName,
      });
    } catch {
      setProfile({
        status:       "pending",
        listingCount: 0,
        listingLimit: 10,
      });
    } finally {
      setProfileLoading(false);
    }
  }, [userName]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      void fetchProfile();
    }
  }, [authStatus, fetchProfile]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading portal...</p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated (brief flash before redirect) ────────────────────────────
  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
      </div>
    );
  }

  const bannerCfg =
    profile ? STATUS_BANNER[profile.status] ?? STATUS_BANNER.pending : null;

  // ── Breadcrumb label from pathname ───────────────────────────────────────────
  const breadcrumbLabel =
    NAV_ITEMS.find(
      (n) =>
        pathname === n.href ||
        (n.href !== "/owner/dashboard" && pathname.startsWith(n.href))
    )?.label ?? "Owner Portal";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-[#f8fafc] flex">

        {/* ── Sidebar (desktop) ───────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm fixed top-0 left-0 bottom-0 z-30">

          {/* Logo */}
          <div className="px-5 py-5 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-[#004063]">Highrise.pk</p>
                <p className="text-[10px] text-gray-400 font-semibold">Owner Portal</p>
              </div>
            </Link>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-[11px] text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>

            {/* Verification badge */}
            {profile && !profileLoading && (
              <div
                className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${
                  bannerCfg?.bg ?? ""
                } ${bannerCfg?.text ?? ""}`}
              >
                {bannerCfg?.icon}
                {bannerCfg?.label}
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <SideNavItem
                key={item.href}
                item={item}
                pathname={pathname}
                allNavHrefs={NAV_ITEMS.map((n) => n.href)}
              />
            ))}
          </nav>

          {/* Listing progress (approved only) */}
          {profile?.status === "approved" && (
            <div className="p-3 border-t border-gray-100">
              <ListingProgress
                used={profile.listingCount}
                limit={profile.listingLimit}
              />
            </div>
          )}

          {/* Back to main site */}
          <div className="p-3 border-t border-gray-100 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Main Dashboard
            </Link>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── Mobile Drawer ───────────────────────────────────────────────── */}
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          pathname={pathname}
          profile={profile}
          userName={userName}
        />

        {/* ── Main content area ────────────────────────────────────────────── */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

          {/* Sticky topbar */}
          <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
            <div className="flex items-center justify-between h-14 px-4">

              {/* Left: mobile menu + breadcrumb */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm">
                  <Link
                    href="/owner/dashboard"
                    className="text-gray-400 hover:text-[#029bba] transition-colors font-medium"
                  >
                    Owner
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  <span className="font-bold text-[#004063]">
                    {breadcrumbLabel}
                  </span>
                </nav>
              </div>

              {/* Right: notification bell + user avatar */}
              <div className="flex items-center gap-2">
                <Link
                  href="/owner/verify"
                  className="hidden sm:flex p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 relative"
                  title="Verification Status"
                >
                  <Bell className="w-5 h-5" />
                  {profile?.status === "pending" || profile?.status === "under_review" ? (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
                  ) : null}
                </Link>

                <Link
                  href="/owner/dashboard"
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-black text-xs">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-gray-700 max-w-[100px] truncate">
                    {userName}
                  </span>
                </Link>
              </div>
            </div>

            {/* Status banner (below topbar) */}
            {bannerCfg && profile && profile.status !== "approved" && (
              <div
                className={`px-4 py-2.5 border-b text-xs font-semibold flex items-center gap-2 ${bannerCfg.bg} ${bannerCfg.text}`}
              >
                {bannerCfg.icon}
                <span className="font-black">{bannerCfg.label}:</span>
                <span className="font-medium">{bannerCfg.detail}</span>
                {(profile.status === "rejected" || profile.status === "pending") && (
                  <Link
                    href="/owner/verify"
                    className="ml-auto underline font-bold hover:no-underline flex items-center gap-1"
                  >
                    {profile.status === "rejected" ? "Re-submit" : "View Status"}
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}
          </header>

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-100 bg-white px-6 py-4 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Highrise.pk — Owner Portal
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}