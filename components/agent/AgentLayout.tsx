// ========== FILE: components/agent/AgentLayout.tsx ==========
// Highrise.pk — Agent Portal Layout
// Mirrors SocietyLayout pattern (Gold Standard — LESSON #198)
// Sidebar + topbar for all agent dashboard pages
// V6.4.3 — collapsible sidebar, mobile drawer, sticky topbar,
//          trust score badge, profile completion %, status banners
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Home,
  Plus,
  Users,
  Settings,
  Eye,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Clock,
  AlertTriangle,
  XCircle,
  FileEdit,
  Loader2,
  CheckCircle,
  ShieldCheck,
  ExternalLink,
  Building2,
} from "lucide-react";
import {
  AgentProvider,
  type AgentProfileSnap,
} from "@/components/agent/AgentContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentLayoutProps {
  children:     React.ReactNode;
  /** Page <title> — e.g. "My Listings | Highrise.pk" */
  title?:       string;
  /** Meta description for the page */
  description?: string;
}

interface NavItem {
  name:        string;
  href:        string;
  icon:        React.ReactElement;
  badge?:      string;
  comingSoon?: boolean;
  exact?:      boolean;
}

// ─── Nav Items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    name:  "Dashboard",
    href:  "/agent/dashboard",
    icon:  <LayoutDashboard className="w-5 h-5" />,
    exact: true,
  },
  {
    name: "My Listings",
    href: "/agent/listings",
    icon: <Home className="w-5 h-5" />,
  },
  {
    name: "Add Property",
    href: "/add-property",
    icon: <Plus className="w-5 h-5" />,
  },
  {
    name: "Leads Inbox",
    href: "/agent/leads",
    icon: <Users className="w-5 h-5" />,
  },
  {
    name: "My Profile",
    href: "/agent/profile",
    icon: <Settings className="w-5 h-5" />,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return "A";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isNavActive(
  href: string,
  pathname: string,
  exact: boolean = false,
  allNavHrefs: string[] = []
): boolean {
  // Exact match required
  if (exact) return pathname === href;

  // Direct match
  if (pathname === href) return true;

  // Prefix match — but skip if a MORE SPECIFIC nav item also matches
  // Example: /agent/listings/new should NOT activate "My Listings" (/agent/listings)
  //          because Add Property (/add-property) or a deeper nested route matches
  if (pathname.startsWith(href + "/")) {
    const hasMoreSpecificMatch = allNavHrefs.some(
      (otherHref) =>
        otherHref !== href &&
        otherHref.length > href.length &&
        otherHref.startsWith(href) &&
        (pathname === otherHref || pathname.startsWith(otherHref + "/"))
    );
    return !hasMoreSpecificMatch;
  }

  return false;
}

// ─── Status Banner ────────────────────────────────────────────────────────────

function AgentStatusBanner({
  profile,
}: {
  profile: AgentProfileSnap | null;
}): React.ReactElement | null {
  if (!profile) return null;

  if (profile.status === "pending") {
    return (
      <div className="flex items-start gap-3 p-3 border-l-4 border-[#029bba] bg-[#eff6ff] rounded-r-xl text-sm mb-4">
        <Clock className="w-4 h-4 text-[#029bba] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[#004063]">
            Application Under Review
          </p>
          <p className="text-xs text-[#004063]/80 mt-0.5">
            Our team typically reviews submissions within 1–3 business days.
          </p>
        </div>
      </div>
    );
  }

  if (profile.status === "info_required") {
    return (
      <div className="flex items-start gap-3 p-3 border-l-4 border-amber-500 bg-amber-50 rounded-r-xl text-sm mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900">
            Additional Information Required
          </p>
          {profile.infoRequiredReason && (
            <p className="text-xs text-amber-800 mt-0.5">
              {profile.infoRequiredReason}
            </p>
          )}
          <Link
            href="/agent/profile"
            className="text-xs text-amber-900 underline font-medium mt-1 inline-block"
          >
            Update Profile →
          </Link>
        </div>
      </div>
    );
  }

  if (profile.status === "rejected") {
    return (
      <div className="flex items-start gap-3 p-3 border-l-4 border-red-500 bg-red-50 rounded-r-xl text-sm mb-4">
        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-900">
            Application Not Approved
          </p>
          {profile.rejectionReason && (
            <p className="text-xs text-red-800 mt-0.5">
              {profile.rejectionReason}
            </p>
          )}
          <Link
            href="/onboarding/business?role=agent&reapply=1"
            className="text-xs text-red-900 underline font-medium mt-1 inline-block"
          >
            Reapply Now →
          </Link>
        </div>
      </div>
    );
  }

  if (profile.status === "suspended") {
    return (
      <div className="flex items-start gap-3 p-3 border-l-4 border-gray-400 bg-gray-50 rounded-r-xl text-sm mb-4">
        <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-gray-700">Account Suspended</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Contact{" "}
            <a
              href="mailto:support@highrise.pk"
              className="underline font-medium"
            >
              support@highrise.pk
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (profile.status === "draft") {
    return (
      <div className="flex items-start gap-3 p-3 border-l-4 border-gray-300 bg-gray-50 rounded-r-xl text-sm mb-4">
        <FileEdit className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-gray-600">
            Application Draft
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Your onboarding is saved but not submitted.
          </p>
          <Link
            href="/onboarding/business?role=agent"
            className="text-xs text-[#029bba] font-semibold underline mt-1 inline-block"
          >
            Complete Application →
          </Link>
        </div>
      </div>
    );
  }

  // approved — no banner needed (approved badge shown separately)
  return null;
}

// ─── Trust Score Badge ────────────────────────────────────────────────────────

function TrustScoreBadge({
  profile,
}: {
  profile: AgentProfileSnap | null;
}): React.ReactElement | null {
  if (!profile || profile.status !== "approved") return null;
  const score = profile.trustScore?.overall ?? 0;

  const color =
    score >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    score >= 60 ? "text-blue-700 bg-blue-50 border-blue-200" :
    score >= 40 ? "text-amber-700 bg-amber-50 border-amber-200" :
                  "text-gray-700 bg-gray-50 border-gray-200";

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${color}`}>
      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
          Trust Score
        </p>
        <p className="text-sm font-bold leading-tight">{score}/100</p>
      </div>
    </div>
  );
}

// ─── Profile Completion Bar ───────────────────────────────────────────────────

function ProfileCompletionBar({
  completion,
}: {
  completion: number;
}): React.ReactElement | null {
  if (completion >= 100) return null;

  return (
    <div className="p-3 rounded-xl bg-gradient-to-br from-[#029bba]/5 to-[#029bba]/10 border border-[#029bba]/20">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-[#004063]">
          Profile Completion
        </p>
        <span className="text-xs font-bold text-[#029bba]">{completion}%</span>
      </div>
      <div className="w-full h-2 bg-white rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#029bba] to-[#027a94] transition-all duration-500"
          style={{ width: `${completion}%` }}
        />
      </div>
      <Link
        href="/agent/profile"
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#029bba] hover:text-[#027a94] transition-colors"
      >
        Complete Now
        <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── Sidebar Content ──────────────────────────────────────────────────────────

interface SidebarProps {
  pathname:          string;
  profile:           AgentProfileSnap | null;
  profileCompletion: number;
  userName?:         string | null;
  userEmail?:        string | null;
  sidebarOpen:       boolean;
  onToggle?:         () => void;
  onClose?:          () => void;
}

function SidebarContent({
  pathname,
  profile,
  profileCompletion,
  userName,
  userEmail,
  sidebarOpen,
  onToggle,
  onClose,
}: SidebarProps): React.ReactElement {
  const router = useRouter();
  const avatarUrl = profile?.documents?.profilePhoto?.url;
  const displayName = profile?.displayName ?? userName ?? "Agent";
  const userInitial = getInitials(displayName);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    void router.push("/login");
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Brand / Logo row ────────────────────────────────────────────────── */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
        <Link href="/agent/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="font-bold text-gray-900 leading-tight truncate text-sm">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 leading-tight">
                Agent Portal
              </p>
            </div>
          )}
        </Link>

        {/* Desktop collapse toggle */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Menu className="w-5 h-5 text-gray-500" />
          </button>
        )}

        {/* Mobile close */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* ── User Identity Card (only when expanded) ────────────────────────── */}
      {sidebarOpen && profile && (
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-11 h-11 rounded-full object-cover border-2 border-gray-100 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {userInitial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 truncate leading-tight mt-0.5">
                {userEmail ?? ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Banner / Trust Score / Completion ───────────────────────── */}
      {sidebarOpen && profile && (
        <div className="px-4 space-y-3">
          {/* Status banner for non-approved states */}
          {profile.status !== "approved" && (
            <AgentStatusBanner profile={profile} />
          )}

          {/* Approved: show trust score + completion */}
          {profile.status === "approved" && (
            <>
              <TrustScoreBadge profile={profile} />
              <ProfileCompletionBar completion={profileCompletion} />
            </>
          )}
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 mt-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item.href, pathname, item.exact, NAV_ITEMS.map((n) => n.href));

          if (item.comingSoon) {
            return (
              <div
                key={item.name}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed"
                title="Coming soon"
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {sidebarOpen && <span>{item.name}</span>}
                </div>
                {sidebarOpen && (
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link key={item.name} href={item.href} onClick={onClose}>
              <div
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  isNavActive(item.href, pathname, item.exact, NAV_ITEMS.map((n) => n.href))
                    ? "bg-[#029bba] text-white shadow-md shadow-[#029bba]/20"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {sidebarOpen && <span>{item.name}</span>}
                </div>
                {item.badge && sidebarOpen && (
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t border-gray-100" />

        {/* View Public Profile — only if approved + slug exists */}
        {profile?.status === "approved" && profile.slug && (
          <a
            href={`/agent/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 cursor-pointer"
          >
            <Eye className="w-5 h-5" />
            {sidebarOpen && (
              <>
                <span className="flex-1">View Public Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
              </>
            )}
          </a>
        )}

        {/* Back to main site */}
        <Link href="/" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 cursor-pointer">
            <Home className="w-5 h-5" />
            {sidebarOpen && <span>View Site</span>}
          </div>
        </Link>
      </nav>

      {/* ── User Footer ────────────────────────────────────────────────────── */}
      <div className="shrink-0 p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-semibold shrink-0 text-sm">
              {userInitial}
            </div>
          )}
          {sidebarOpen && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userEmail ?? ""}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Layout Component ────────────────────────────────────────────────────

export default function AgentLayout({
  children,
  title       = "Agent Dashboard | Highrise.pk",
  description = "Manage your property listings on Highrise.pk",
}: AgentLayoutProps): React.ReactElement | null {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [profile, setProfile] = useState<AgentProfileSnap | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Compute profile completion (same logic as Context but for initial layout render)
  const profileCompletion = React.useMemo(() => {
    if (!profile) return 0;
    const checks = [
      Boolean(profile.displayName && profile.displayName.length >= 3),
      Boolean(profile.about && profile.about.length >= 100),
      Boolean(profile.tagline && profile.tagline.length >= 10),
      Boolean(profile.documents?.profilePhoto?.url),
      Boolean(profile.documents?.coverPhoto?.url),
      Boolean(
        profile.socialLinks?.facebook ??
        profile.socialLinks?.instagram ??
        profile.socialLinks?.linkedin ??
        profile.socialLinks?.website
      ),
      Boolean(profile.experience?.years && profile.experience.years > 0),
      Boolean(profile.serviceAreas?.cities && profile.serviceAreas.cities.length > 0),
      Boolean(profile.specializations && profile.specializations.length > 0),
      Boolean(profile.languages && profile.languages.length > 0),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  // ── Fetch Profile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/agent/profile", {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          success: boolean;
          profile?: AgentProfileSnap | null;
        };
        if (data.success && data.profile) {
          setProfile(data.profile);
        }
      }
    } catch {
      // Fetch failure must never crash layout — profile stays null
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Role Guard + Profile Fetch (V6.8.0 — Capability Flag Pattern) ──────────
  // Session 3 pattern: check isVerifiedAgent, not role
  // Allowed paths:
  //   → Admin: full access
  //   → Verified Agent: full access (isVerifiedAgent OR legacy role="agent")
  //   → Pending/rejected/info_required agent: /agent/verify ONLY
  //   → Everyone else: redirected to homepage
  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "unauthenticated") {
      void router.replace(
        `/login?redirect=${encodeURIComponent(router.asPath)}`
      );
      return;
    }

    const sessionUser = session?.user as {
      role?:                      string;
      isVerifiedAgent?:           boolean;
      agentVerificationStatus?:   string;
    } | undefined;

    const role                    = sessionUser?.role;
    const isVerifiedAgent         = sessionUser?.isVerifiedAgent;
    const agentVerificationStatus = sessionUser?.agentVerificationStatus;
    const isAdmin                 = role === "admin";
    const isAgent                 = role === "agent" || isVerifiedAgent === true;

    // V6.8.0: Applying agents (non-approved) can view /agent/verify to check status
    const isApplyingAgent =
      !isAgent &&
      !isAdmin &&
      agentVerificationStatus !== undefined &&
      agentVerificationStatus !== "none";

    const isVerifyPage = router.pathname === "/agent/verify";

    // Allow: admin OR verified agent OR (applying agent on verify page)
    if (!isAdmin && !isAgent && !(isApplyingAgent && isVerifyPage)) {
      // Applying agents trying to access other pages → send to verify
      if (isApplyingAgent && !isVerifyPage) {
        void router.replace("/agent/verify");
      } else {
        // Non-agents → homepage
        void router.replace("/");
      }
      return;
    }

    void fetchProfile();
  }, [authStatus, session, router, fetchProfile]);

  // ── Close mobile sidebar on route change ────────────────────────────────────
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [router.pathname]);

  // ── Loading State ──────────────────────────────────────────────────────────
  if (authStatus === "loading" || (authStatus === "authenticated" && profileLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
          <p className="text-sm text-gray-500 font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ── Auth guard fallback (V6.8.0) ──────────────────────────────────────────
  // Mirrors useEffect logic — prevents flash of unauthorized content
  // Allow: admin, verified agent, or applying agent on verify page
  const sessionUserGuard = session?.user as {
    role?:                    string;
    isVerifiedAgent?:         boolean;
    agentVerificationStatus?: string;
  } | undefined;

  const guardRole                    = sessionUserGuard?.role;
  const guardIsVerifiedAgent         = sessionUserGuard?.isVerifiedAgent;
  const guardAgentStatus             = sessionUserGuard?.agentVerificationStatus;
  const guardIsAdmin                 = guardRole === "admin";
  const guardIsAgent                 = guardRole === "agent" || guardIsVerifiedAgent === true;
  const guardIsApplyingAgent         =
    !guardIsAgent &&
    !guardIsAdmin &&
    guardAgentStatus !== undefined &&
    guardAgentStatus !== "none";
  const guardIsVerifyPage            = router.pathname === "/agent/verify";

  if (
    authStatus === "unauthenticated" ||
    (!guardIsAdmin && !guardIsAgent && !(guardIsApplyingAgent && guardIsVerifyPage))
  ) {
    return null;
  }

  // Extra null-safety after all guards (TypeScript narrowing)
  if (!session?.user) return null;

  const { name, email } = session.user;

  // ── Breadcrumb label ──────────────────────────────────────────────────────
  const breadcrumb =
    router.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ??
    "Dashboard";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {/* Private pages must never be indexed */}
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ── Mobile overlay ─────────────────────────────────────────────── */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
            mobileSidebarOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside
          className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "w-64" : "w-20"}
            ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <SidebarContent
            pathname={router.pathname}
            profile={profile}
            profileCompletion={profileCompletion}
            userName={name}
            userEmail={email}
            sidebarOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((o) => !o)}
            onClose={mobileSidebarOpen ? () => setMobileSidebarOpen(false) : undefined}
          />
        </aside>

        {/* ── Main Content Area ────────────────────────────────────────── */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            sidebarOpen ? "lg:ml-64" : "lg:ml-20"
          }`}
        >
          {/* Top Header (sticky) */}
          <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="h-full px-4 flex items-center justify-between gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>

              {/* Breadcrumb */}
              <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4 text-[#029bba]" />
                <span>Agent Portal</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-800 font-semibold capitalize">
                  {breadcrumb}
                </span>
              </div>

              {/* Fill space */}
              <div className="flex-1" />

              {/* Right actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Approved status pill */}
                {profile?.status === "approved" && (
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">
                      Verified Agent
                    </span>
                  </div>
                )}

                {/* View Site button */}
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
                >
                  <Home className="w-4 h-4" />
                  View Site
                </Link>

                {/* Logout button */}
                <button
                  onClick={() => void signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* Page content wrapped in Provider */}
          <main>
            <AgentProvider
              initialProfile={profile}
              initialLoading={profileLoading}
            >
              {children}
            </AgentProvider>
          </main>
        </div>
      </div>
    </>
  );
}

// ========== END OF FILE ==========