// components/developer/DeveloperLayout.tsx
// ═══════════════════════════════════════════════════════════════
// DEVELOPER LAYOUT — Highrise.pk V6.4.5
// Wraps all developer portal pages with sidebar, topbar, guards.
// Gold Standard: mirrors AgentLayout + SocietyLayout pattern.
// ═══════════════════════════════════════════════════════════════
// ✅ useSession() only — no localStorage
// ✅ Role guard via DeveloperContext
// ✅ Collapsible sidebar (w-64 ↔ w-20, desktop toggle)
// ✅ Mobile drawer with backdrop overlay
// ✅ Sticky topbar (h-16, top-0 z-30)
// ✅ Trust score badge in sidebar (color-coded)
// ✅ Profile completion bar in sidebar (< 100%)
// ✅ All 6 status banners (draft/pending/rejected/suspended/info_required)
// ✅ Approved verified pill in topbar
// ✅ View Public Profile link (approved + slug)
// ✅ Breadcrumb: Building2 + "Portal" + current page
// ✅ View Site + Logout in topbar right
// ✅ No Bell, no Search bar, no Add Project in topbar
// ✅ Active nav: bg-[#029bba] text-white shadow-md
// ✅ No framer-motion — Tailwind transitions only
// ✅ No inline style={} — Tailwind only
// ✅ No console.log/error
// ✅ Correct phone number: +92 333 5877106
// ✅ TypeScript strict — no any
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Home,
  FolderOpen,
  TrendingUp,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PauseCircle,
  FileEdit,
  Info,
  Shield,
  ExternalLink,
  ChevronRight,
  Star,
} from "lucide-react";
import { useDeveloperContext } from "./DeveloperContext";
import type { DeveloperStatus } from "./DeveloperContext";

// ============================================
// TYPES
// ============================================

interface DeveloperLayoutProps {
  children: React.ReactNode;
  /** Page title shown in <title> tag */
  pageTitle?: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

// ============================================
// TRUST SCORE BADGE
// Color-coded: ≥70 emerald, ≥40 amber, <40 red
// ============================================

function TrustScoreBadge({
  score,
  collapsed,
}: {
  score: number;
  collapsed: boolean;
}): React.ReactElement {
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : score >= 40
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";

  if (collapsed) {
    return (
      <div
        className={`mx-auto w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xs ${color}`}
        title={`Trust Score: ${score}/100`}
      >
        {score}
      </div>
    );
  }

  return (
    <div className={`mx-4 mt-3 px-3 py-2 rounded-xl border ${color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wide">
            Trust Score
          </span>
        </div>
        <span className="text-sm font-black">{score}/100</span>
      </div>
      <div className="mt-1.5 w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            score >= 70
              ? "bg-emerald-500"
              : score >= 40
              ? "bg-amber-500"
              : "bg-red-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// PROFILE COMPLETION BAR
// Only shown when < 100%
// ============================================

function ProfileCompletionBar({
  completion,
  collapsed,
}: {
  completion: number;
  collapsed: boolean;
}): React.ReactElement | null {
  if (completion >= 100) return null;

  if (collapsed) {
    return (
      <div
        className="mx-auto w-10 h-10 rounded-xl border border-[#029bba]/30 bg-[#029bba]/10 flex items-center justify-center"
        title={`Profile ${completion}% complete`}
      >
        <span className="text-[10px] font-black text-[#029bba]">
          {completion}%
        </span>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-2 px-3 py-2 rounded-xl border border-[#029bba]/20 bg-[#029bba]/5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-[#004063] uppercase tracking-wide">
          Profile Complete
        </span>
        <span className="text-[11px] font-black text-[#029bba]">
          {completion}%
        </span>
      </div>
      <div className="w-full bg-white/70 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-[#029bba] rounded-full transition-all duration-500"
          style={{ width: `${completion}%` }}
        />
      </div>
      <Link
        href="/developer/profile"
        className="mt-1.5 text-[10px] font-semibold text-[#029bba] hover:underline block"
      >
        Complete profile →
      </Link>
    </div>
  );
}

// ============================================
// STATUS BANNER
// Shown inside sidebar for non-approved status
// ============================================

function StatusBanner(): React.ReactElement | null {
  const { profile, isLoading } = useDeveloperContext();

  if (isLoading || !profile) return null;
  if (profile.status === "approved") return null;

  type BannerConfig = {
    icon: React.ReactElement;
    bg: string;
    border: string;
    title: string;
    message: string;
    cta?: { label: string; href: string };
  };

  const banners: Partial<Record<DeveloperStatus, BannerConfig>> = {
    draft: {
      icon: <FileEdit className="w-4 h-4 text-[#004063]" />,
      bg: "bg-blue-50",
      border: "border-l-4 border-[#029bba]",
      title: "Profile Incomplete",
      message: "Complete your profile and submit for review.",
      cta: { label: "Complete Profile →", href: "/developer/profile" },
    },
    pending: {
      icon: <Clock className="w-4 h-4 text-[#f59e0b]" />,
      bg: "bg-amber-50",
      border: "border-l-4 border-[#f59e0b]",
      title: "Under Review",
      message: "Our team is reviewing your application. Usually 1–2 business days.",
    },
    rejected: {
      icon: <XCircle className="w-4 h-4 text-[#ef4444]" />,
      bg: "bg-red-50",
      border: "border-l-4 border-[#ef4444]",
      title: "Application Rejected",
      message:
        profile.rejectionReason ??
        "Your application was not approved. Contact support.",
      cta: { label: "Update & Resubmit →", href: "/developer/profile" },
    },
    suspended: {
      icon: <PauseCircle className="w-4 h-4 text-[#f59e0b]" />,
      bg: "bg-amber-50",
      border: "border-l-4 border-[#f59e0b]",
      title: "Account Suspended",
      message: "Contact support at developers@highrise.pk.",
    },
    info_required: {
      icon: <Info className="w-4 h-4 text-[#029bba]" />,
      bg: "bg-blue-50",
      border: "border-l-4 border-[#029bba]",
      title: "Info Required",
      message:
        profile.infoRequiredReason ??
        "Additional information is needed to complete verification.",
      cta: { label: "Update Profile →", href: "/developer/profile" },
    },
  };

  const banner = banners[profile.status];
  if (!banner) return null;

  return (
    <div
      className={`mx-4 mt-3 p-3 rounded-xl ${banner.bg} ${banner.border}`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">{banner.icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#004063]">{banner.title}</p>
          <p className="text-[11px] text-[#555555] mt-0.5 leading-relaxed">
            {banner.message}
          </p>
          {banner.cta && (
            <Link
              href={banner.cta.href}
              className="inline-block mt-1.5 text-[11px] font-bold text-[#029bba] hover:underline"
            >
              {banner.cta.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// INNER LAYOUT
// Uses DeveloperContext — must be inside DeveloperProvider
// ============================================

function DeveloperLayoutInner({
  children,
  pageTitle,
}: DeveloperLayoutProps): React.ReactElement {
  const router = useRouter();
  const { data: session } = useSession();
  const { profile, profileCompletion, stats } = useDeveloperContext();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Auto-expand Projects submenu on project routes
  useEffect(() => {
    if (
      router.pathname.startsWith("/developer/projects") ||
      router.pathname === "/developer/campaigns"
    ) {
      setExpandedMenus((prev) =>
        prev.includes("Projects") ? prev : [...prev, "Projects"]
      );
    }
  }, [router.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [router.pathname]);

  // ── Nav items ────────────────────────────────────────────────
  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/developer/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Projects",
      icon: FolderOpen,
      children: [
        {
          name: "All Projects",
          href: "/developer/projects",
          icon: Building2,
        },
        {
          name: "Ad Campaigns",
          href: "/developer/campaigns",
          icon: Star,
        },
        {
          name: "Add New Project",
          href: "/developer/projects/new",
          icon: Plus,
        },
        {
          name: "Pending Approval",
          href: "/developer/projects?status=pending",
          icon: Clock,
          badge: stats.pendingProjects,
        },
      ],
    },
    {
      name: "Leads",
      href: "/developer/leads",
      icon: Users,
      badge: stats.newLeads,
    },
    {
      name: "Analytics",
      href: "/developer/analytics",
      icon: TrendingUp,
    },
    {
      name: "Company Profile",
      href: "/developer/profile",
      icon: Building2,
    },
  ];

  // ── Helpers ─────────────────────────────────────────────────
  const toggleSubmenu = useCallback((name: string): void => {
    setExpandedMenus((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  }, []);

  const isActive = useCallback(
    (href: string): boolean => {
      if (href === "/developer/dashboard") {
        return router.pathname === "/developer/dashboard";
      }
      if (href === "/developer/projects") {
        return (
          router.pathname === "/developer/projects" && !router.query.status
        );
      }
      if (href.includes("status=pending")) {
        return (
          router.pathname === "/developer/projects" &&
          router.query.status === "pending"
        );
      }
      return (
        router.pathname === href ||
        router.asPath === href ||
        router.pathname.startsWith(href + "/")
      );
    },
    [router.pathname, router.query.status, router.asPath]
  );

  const isMenuGroupActive = useCallback(
    (item: NavItem): boolean => {
      if (item.href && isActive(item.href)) return true;
      if (item.children) {
        return item.children.some(
          (child) => child.href && isActive(child.href)
        );
      }
      return false;
    },
    [isActive]
  );

  // ── Current page label for breadcrumb ───────────────────────
  const currentPageLabel = useCallback((): string => {
    const path = router.pathname;
    if (path === "/developer/dashboard") return "Dashboard";
    if (path === "/developer/profile") return "Company Profile";
    if (path === "/developer/analytics") return "Analytics";
    if (path === "/developer/campaigns") return "Ad Campaigns";
    if (path === "/developer/leads") return "Leads";
    if (path === "/developer/projects") return "Projects";
    if (path === "/developer/projects/new") return "New Project";
    if (path.includes("/units/new")) return "Add Unit";
    if (path.includes("/units")) return "Units";
    if (path.includes("/edit")) return "Edit Project";
    return "Portal";
  }, [router.pathname]);

  // ── Logout ──────────────────────────────────────────────────
  const handleLogout = async (): Promise<void> => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  // ── User info ────────────────────────────────────────────────
  const userName = session?.user?.name ?? "Developer";
  const userInitial = userName.charAt(0).toUpperCase();
  const trustScore = profile?.trustScore?.overall ?? 0;
  const isApproved = profile?.status === "approved";

  // ── Render nav item ─────────────────────────────────────────
  const renderNavItem = (
    item: NavItem,
    isChild = false
  ): React.ReactElement => {
    const IconComponent = item.icon;
    const hasChildren = Boolean(item.children?.length);
    const isExpanded = expandedMenus.includes(item.name);
    const groupActive = isMenuGroupActive(item);
    const itemActive = item.href ? isActive(item.href) : false;

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              groupActive
                ? "bg-[#029bba]/10 text-[#029bba]"
                : "text-[#666666] hover:bg-gray-100 hover:text-[#333333]"
            }`}
            aria-expanded={isExpanded}
          >
            <div className="flex items-center gap-3">
              <IconComponent className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{item.name}</span>}
            </div>
            {sidebarOpen && (
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          <div
            className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-200 ${
              isExpanded && sidebarOpen
                ? "max-h-48 opacity-100"
                : "max-h-0 opacity-0"
            }`}
          >
            {item.children?.map((child) => renderNavItem(child, true))}
          </div>
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href ?? "#"}
        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          itemActive
            ? "bg-[#029bba] text-white shadow-md shadow-[#029bba]/20"
            : "text-[#666666] hover:bg-gray-100 hover:text-[#333333]"
        } ${isChild ? "ml-2" : ""}`}
      >
        <div className="flex items-center gap-3">
          <IconComponent className="w-5 h-5 shrink-0" />
          {sidebarOpen && <span>{item.name}</span>}
        </div>
        {item.badge !== undefined && item.badge > 0 && sidebarOpen && (
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              itemActive
                ? "bg-white/20 text-white"
                : "bg-red-100 text-red-600"
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* noindex — all developer pages are private */}
      <Head>
        <title>
          {pageTitle
            ? `${pageTitle} | Highrise.pk Developer Portal`
            : "Developer Portal | Highrise.pk"}
        </title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">

        {/* ── Mobile Overlay ───────────────────────────────────── */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
            mobileSidebarOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* ══════════════════════════════════════════════════════
            SIDEBAR
        ══════════════════════════════════════════════════════ */}
        <aside
          className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-20"
          } ${
            mobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Logo + Toggle */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
            <Link
              href="/developer/dashboard"
              className="flex items-center gap-2 min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center shrink-0 shadow-sm">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <h1 className="font-bold text-[#004063] text-sm leading-tight truncate">
                    Highrise.pk
                  </h1>
                  <p className="text-[11px] text-[#666666] leading-tight">
                    Developer Portal
                  </p>
                </div>
              )}
            </Link>

            {/* Desktop toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu className="w-4 h-4 text-[#666666]" />
            </button>

            {/* Mobile close */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-[#666666]" />
            </button>
          </div>

          {/* Scrollable sidebar body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">

            {/* Company Card */}
            {profile && sidebarOpen && (
              <div className="mx-4 mt-4 p-3 bg-gradient-to-br from-[#029bba]/5 to-[#029bba]/10 rounded-xl border border-[#029bba]/20">
                <div className="flex items-center gap-3">
                  {/* Logo or initial */}
                  {profile.logo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.logo.url}
                      alt={profile.companyName}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#029bba] flex items-center justify-center text-white font-bold shrink-0 text-sm">
                      {profile.companyName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#004063] truncate">
                      {profile.companyName}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {profile.status === "approved" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-[#10b981] shrink-0" />
                          <span className="text-[11px] text-[#10b981] font-semibold">
                            Verified
                          </span>
                        </>
                      ) : profile.status === "pending" ? (
                        <>
                          <Clock className="w-3 h-3 text-[#f59e0b] shrink-0" />
                          <span className="text-[11px] text-[#f59e0b] font-semibold">
                            Under Review
                          </span>
                        </>
                      ) : profile.status === "rejected" ? (
                        <>
                          <XCircle className="w-3 h-3 text-[#ef4444] shrink-0" />
                          <span className="text-[11px] text-[#ef4444] font-semibold">
                            Rejected
                          </span>
                        </>
                      ) : profile.status === "suspended" ? (
                        <>
                          <PauseCircle className="w-3 h-3 text-[#f59e0b] shrink-0" />
                          <span className="text-[11px] text-[#f59e0b] font-semibold">
                            Suspended
                          </span>
                        </>
                      ) : profile.status === "info_required" ? (
                        <>
                          <Info className="w-3 h-3 text-[#029bba] shrink-0" />
                          <span className="text-[11px] text-[#029bba] font-semibold">
                            Info Required
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-[#666666] shrink-0" />
                          <span className="text-[11px] text-[#666666] font-semibold">
                            Draft
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsed — company initial only */}
            {profile && !sidebarOpen && (
              <div className="flex justify-center mt-4">
                {profile.logo?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.logo.url}
                    alt={profile.companyName}
                    className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#029bba] flex items-center justify-center text-white font-bold text-sm">
                    {profile.companyName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}

            {/* Trust Score Badge */}
            {profile && trustScore > 0 && (
              <TrustScoreBadge
                score={trustScore}
                collapsed={!sidebarOpen}
              />
            )}

            {/* Profile Completion Bar */}
            {profile && (
              <ProfileCompletionBar
                completion={profileCompletion}
                collapsed={!sidebarOpen}
              />
            )}

            {/* Status Banner */}
            <StatusBanner />

            {/* Navigation */}
            <nav className="p-4 space-y-1 mt-2">
              {navItems.map((item) => renderNavItem(item))}
            </nav>
          </div>

          {/* User section — pinned to bottom */}
          <div className="shrink-0 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {userInitial}
              </div>
              {sidebarOpen && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#333333] truncate">
                      {userName}
                    </p>
                    <p className="text-[11px] text-[#666666] truncate">
                      {session?.user?.email ?? ""}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleLogout()}
                    className="p-2 rounded-lg hover:bg-red-50 text-[#666666] hover:text-[#ef4444] transition-colors shrink-0"
                    title="Logout"
                    aria-label="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════
            MAIN CONTENT AREA
        ══════════════════════════════════════════════════════ */}
        <div
          className={`transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "lg:ml-20"
          }`}
        >
          {/* ── Sticky Topbar ─────────────────────────────────── */}
          <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center">
            <div className="flex items-center justify-between w-full px-4 gap-4">

              {/* Left — mobile menu + breadcrumb */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5 text-[#666666]" />
                </button>

                {/* Breadcrumb */}
                <nav
                  className="hidden md:flex items-center gap-1.5 text-sm min-w-0"
                  aria-label="Breadcrumb"
                >
                  <div className="flex items-center gap-1.5 text-[#666666]">
                    <Shield className="w-4 h-4 text-[#029bba] shrink-0" />
                    <span className="font-medium">Portal</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <span className="font-semibold text-[#004063] truncate">
                    {currentPageLabel()}
                  </span>
                </nav>
              </div>

              {/* Right — actions */}
              <div className="flex items-center gap-2 shrink-0">

                {/* Verified pill (approved only) */}
                {isApproved && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">
                      Verified Developer
                    </span>
                  </div>
                )}

                {/* View Public Profile (approved + slug) */}
                {isApproved && profile?.slug && (
                  <Link
                    href={`/developers/${profile.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#029bba] text-[#666666] hover:text-[#029bba] text-sm font-medium transition-colors"
                    aria-label="View public profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Public Profile</span>
                  </Link>
                )}

                {/* View Site */}
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#333333] text-sm font-medium transition-colors"
                  aria-label="View site"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden md:inline">View Site</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={() => void handleLogout()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 text-[#666666] hover:text-[#ef4444] text-sm font-medium transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* ── Page Content ──────────────────────────────────── */}
          <main>{children}</main>
        </div>
      </div>
    </>
  );
}

// ============================================
// PUBLIC EXPORT
// DeveloperProvider is supplied by pages/_app.tsx for /developer routes
// ============================================

export default function DeveloperLayout({
  children,
  pageTitle,
}: DeveloperLayoutProps): React.ReactElement {
  return (
    
      <DeveloperLayoutInner pageTitle={pageTitle}>
        {children}
      </DeveloperLayoutInner>
    
  );
}