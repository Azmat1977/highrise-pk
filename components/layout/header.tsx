// components/layout/header.tsx
// Highrise.pk — Global Header
// V6.4.3 — Role-aware dropdown + mobile menu
// Fixed: removed broken /account/settings, no duplication, expanded admin/agent/developer sections
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  User, LogOut, Plus, UserCircle, Building2, Shield,
  LayoutDashboard, FolderPlus, Settings, Users, Heart, Home,
  Menu, X, ChevronDown, CheckCircle, Clock, XCircle,
  Sparkles, ShieldCheck, Banknote, Construction, Ruler,
  ArrowRight, Calculator, FileText, MessageSquare, Bot,
  Building, TrendingUp, BarChart3, Megaphone, Wrench, HardHat,
} from "lucide-react";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { useRouter } from "next/router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import LoginOrSignupForm from "@/components/auth/LoginOrSignupForm";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare }   from "@/hooks/useCompare";

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PRIMARY_COLOR = "#029bba";
const MAX_DISPLAY_NAME_LEN = 50;
const SESSION_POLL_INTERVAL = 60000;

// ═══════════════════════════════════════════════════════════════
// 🛡️ TYPES
// ═══════════════════════════════════════════════════════════════

interface SessionUser {
  id?: string;
  name?: string;
  email?: string;
  role?: "user" | "developer" | "agent" | "admin";
  displayName?: string;
  profilePicture?: string | null;
  isVerified?: boolean;
}

interface DeveloperProfile {
  _id: string;
  companyName: string;
  status: "draft" | "pending" | "approved" | "rejected";
  isVerified: boolean;
  verificationDate?: string;
}

interface RoleBadge {
  text: string;
  bg: string;
  color: string;
  icon: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY UTILITIES
// ═══════════════════════════════════════════════════════════════

function sanitizeDisplayName(raw?: string | null): string {
  if (!raw) return "";
  return String(raw)
    .replace(/[<>'"]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LEN);
}

function extractFirstName(fullName?: string | null): string {
  if (!fullName) return "";
  const sanitized = sanitizeDisplayName(fullName);
  return sanitized.split(" ")[0] || sanitized;
}

function getDisplayName(user?: SessionUser | null): string {
  if (!user) return "";
  return (
    sanitizeDisplayName(user.displayName) ||
    extractFirstName(user.name) ||
    sanitizeDisplayName(user.email?.split("@")[0]) ||
    "User"
  );
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// ═══════════════════════════════════════════════════════════════
// 🏗️ ROLE BADGE
// ═══════════════════════════════════════════════════════════════

function getRoleBadge(
  role?: string,
  hasDevProfile?: boolean,
  isDevApproved?: boolean,
  devStatus?: string,
  isVerifiedOwner?: boolean,
  ownerStatus?: string
): RoleBadge {
  if (role === "admin") {
    return {
      text: "Admin",
      bg: "#fef3c7",
      color: "#d97706",
      icon: <Shield className="w-3 h-3" />,
    };
  }

  // ── Verified Owner ──
  if (isVerifiedOwner) {
    return {
      text: "Verified Owner",
      bg: "#d1fae5",
      color: "#059669",
      icon: <ShieldCheck className="w-3 h-3" />,
    };
  }
  if (ownerStatus === "pending") {
    return {
      text: "Owner (Pending)",
      bg: "#fef3c7",
      color: "#d97706",
      icon: <Clock className="w-3 h-3" />,
    };
  }

  if (role === "developer" || hasDevProfile) {
    if (isDevApproved) {
      return {
        text: "Verified Developer",
        bg: "#d1fae5",
        color: "#059669",
        icon: <CheckCircle className="w-3 h-3" />,
      };
    }
    if (devStatus === "pending") {
      return {
        text: "Developer (Pending)",
        bg: "#fef3c7",
        color: "#d97706",
        icon: <Clock className="w-3 h-3" />,
      };
    }
    if (devStatus === "rejected") {
      return {
        text: "Developer (Rejected)",
        bg: "#fee2e2",
        color: "#dc2626",
        icon: <XCircle className="w-3 h-3" />,
      };
    }
    return {
      text: "Developer",
      bg: `${PRIMARY_COLOR}15`,
      color: PRIMARY_COLOR,
      icon: <Building2 className="w-3 h-3" />,
    };
  }

  if (role === "agent") {
    return {
      text: "Agent",
      bg: "#fff7ed",
      color: "#ea580c",
      icon: <Users className="w-3 h-3" />,
    };
  }

  return {
    text: "User",
    bg: "#f3f4f6",
    color: "#6b7280",
    icon: <User className="w-3 h-3" />,
  };
}

// ═══════════════════════════════════════════════════════════════
// 🎨 DROPDOWN MENU ITEM (Reusable)
// ═══════════════════════════════════════════════════════════════

interface MenuItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  badge?: { text: string; color: string };
  iconColor?: string;
  hoverColor?: string;
}

function MenuItem({
  href, icon, label, description, badge,
  iconColor = "text-gray-400",
  hoverColor = "group-hover:text-[#029bba]",
}: MenuItemProps): React.ReactElement {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 rounded-xl
          hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100
          focus:bg-gradient-to-r focus:from-gray-50 focus:to-gray-100
          transition-all group outline-none cursor-pointer"
      >
        <span className={cx("w-4 h-4 flex-shrink-0 transition-colors", iconColor, hoverColor)}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-medium block truncate">{label}</span>
          {description && (
            <span className="text-[11px] text-gray-400 block truncate">{description}</span>
          )}
        </div>
        {badge && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: `${badge.color}15`, color: badge.color }}
          >
            {badge.text}
          </span>
        )}
      </Link>
    </DropdownMenu.Item>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SECTION HEADER (Dropdown)
// ═══════════════════════════════════════════════════════════════

function SectionHeader({
  label, color = "text-gray-400",
}: { label: string; color?: string }): React.ReactElement {
  return (
    <div className="px-4 pt-3 pb-1.5">
      <p className={cx("text-[10px] font-bold uppercase tracking-wider", color)}>
        {label}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 MOBILE MENU LINK
// ═══════════════════════════════════════════════════════════════

interface MobileLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "default" | "primary" | "soft" | "danger";
}

function MobileLink({
  href, icon, label, onClick, active = false, variant = "default",
}: MobileLinkProps): React.ReactElement {
  const variants = {
    default: active
      ? "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]"
      : "text-gray-700 hover:bg-gray-50 active:bg-gray-100",
    primary: "bg-gradient-to-r from-[#029bba] to-[#027a94] text-white shadow-lg hover:shadow-xl",
    soft:    "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]",
    danger:  "text-red-600 hover:bg-red-50 active:bg-red-100",
  };
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cx(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all min-h-[44px]",
        variants[variant]
      )}
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function MobileSectionHeader({
  label, color,
}: { label: string; color: string }): React.ReactElement {
  return (
    <p
      className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider"
      style={{ color }}
    >
      {label}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════

export const Header: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  // ── Favorites (guest + logged-in unified) ──────────────────
  // totalCount = all favorites across ALL entity types (projects + properties)
  // Used for header badge — updates in real-time via cross-tab events
  const { totalCount: favoritesCount, isReady: favoritesReady } = useFavorites({
    defaultEntityType: 'project',
  });

  // ── Compare counter (mirrors favorites pattern) ────────────
  const { totalCount: compareCount, isReady: compareReady } = useCompare({
    defaultEntityType: 'project',
  });

  // ── State ──────────────────────────────────────────────────
  const [isLoginModalOpen, setIsLoginModalOpen]       = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen]       = useState(false);
    const [isAddListingOpen, setIsAddListingOpen]       = useState(false);
  const [loginContext, setLoginContext]                = useState<"contact" | "listing" | "save" | "general">("general");
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isExploreDropdownOpen, setIsExploreDropdownOpen] = useState(false);
  const [isMobileToolsExpanded, setIsMobileToolsExpanded] = useState(false);
  const [isMobileExploreExpanded, setIsMobileExploreExpanded] = useState(false);
  const [isRouteLoading, setIsRouteLoading]           = useState(false);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);

  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile | null>(null);
  const [devProfileLoading, setDevProfileLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Derived state ───────────────────────────────────────────
    const user = session?.user as SessionUser | undefined;
  const isLoggedIn = status === "authenticated" && !!user;
  const isAdmin    = user?.role === "admin";
  const isAgent    = user?.role === "agent";
  const hasDevProfile  = !!developerProfile;
  const isDeveloper    = user?.role === "developer" || hasDevProfile;
  const isDevApproved  = developerProfile?.status === "approved";

  // ── Owner fields ──
  const isVerifiedOwner  = !!(user as { isVerifiedOwner?: boolean })?.isVerifiedOwner;
  const ownerStatus      = (user as { ownerVerificationStatus?: string })?.ownerVerificationStatus ?? "none";
  const isOwnerPending   = ownerStatus === "pending";

  const displayName = getDisplayName(user);
  const roleBadge   = getRoleBadge(
    user?.role, hasDevProfile, isDevApproved,
    developerProfile?.status, isVerifiedOwner, ownerStatus
  );

  // ── Fetch developer profile ─────────────────────────────────
  const fetchDeveloperProfile = useCallback(async () => {
    if (!isLoggedIn || !user?.id) {
      setDeveloperProfile(null);
      setDevProfileLoading(false);
      return;
    }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setDevProfileLoading(true);
    try {
      const res = await fetch("/api/developer/profile", {
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.hasProfile && data.profile) {
        setDeveloperProfile(data.profile as DeveloperProfile);
      } else {
        setDeveloperProfile(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setDeveloperProfile(null);
      }
    } finally {
      setDevProfileLoading(false);
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    fetchDeveloperProfile();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchDeveloperProfile]);

  // ── Outside click for tools + explore dropdowns ──────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
      if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(event.target as Node)) {
        setIsExploreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Close dropdowns on route change ──────────────────────────
  useEffect(() => {
    setIsToolsDropdownOpen(false);
    setIsExploreDropdownOpen(false);
    setIsMobileToolsExpanded(false);
    setIsMobileExploreExpanded(false);
    setIsMobileMenuOpen(false);
    setIsAddListingOpen(false);
  }, [router.pathname]);

  // ── Route loading indicator ─────────────────────────────────
  useEffect(() => {
    const handleStart = () => setIsRouteLoading(true);
    const handleDone  = () => setIsRouteLoading(false);
    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleDone);
    router.events.on("routeChangeError", handleDone);
    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleDone);
      router.events.off("routeChangeError", handleDone);
    };
  }, [router.events]);

  // ── Session polling ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      if (!devProfileLoading) fetchDeveloperProfile();
    }, SESSION_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isLoggedIn, fetchDeveloperProfile, devProfileLoading]);

  // ── Logout ──────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setDeveloperProfile(null);
      setDevProfileLoading(false);
      await signOut({ redirect: false });
      router.push("/");
    } catch {
      window.location.href = "/";
    }
  }, [router]);

  // ── Navigation links ────────────────────────────────────────
  // PRIMARY nav — 3 items (Home, Properties, Projects)
  // Tools dropdown + NEW Explore dropdown handle the rest
  const navLinks = [
    { label: "Home",       href: "/" },
    { label: "Properties", href: "/properties" },
    { label: "Projects",   href: "/projects" },
  ];

  // EXPLORE dropdown items — consolidated secondary nav
  const exploreItems = [
    { label: "Societies",  href: "/societies",  icon: <Building2 className="w-4 h-4" />, description: "Browse verified housing societies" },
    { label: "Agents",     href: "/agents",     icon: <Users className="w-4 h-4" />,     description: "Find verified property agents" },
    { label: "Developers", href: "/developers", icon: <Building className="w-4 h-4" />,  description: "Explore trusted developers" },
    { label: "SafeDeal",   href: "/safedeal",   icon: <ShieldCheck className="w-4 h-4" />, description: "Secure property transactions" },
    { label: "Blog",       href: "/blog",       icon: <FileText className="w-4 h-4" />,  description: "Insights & market news" },
  ];

  // ═══════════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <>
      {isRouteLoading && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-gradient-to-r from-transparent via-gray-100/50 to-transparent overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#029bba] via-[#16c2e0] to-[#029bba] rounded-full"
            style={{
              width: '30%',
              animation: 'routeLoading 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite, loadingPulse 2s ease-in-out infinite',
              boxShadow: '0 0 20px rgba(2, 155, 186, 0.5), 0 0 40px rgba(2, 155, 186, 0.3)',
            }}
          />
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-200/50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="flex items-center group" aria-label="Highrise.pk Home">
            <div className="relative flex items-center justify-center">
              <Image
                src="/images/logo.png"
                alt="Highrise.pk"
                width={170}
                height={70}
                priority
                className="h-14 md:h-16 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </div>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden lg:flex items-center space-x-6" role="navigation">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cx(
                  "text-[15px] font-semibold transition-colors relative group whitespace-nowrap",
                  router.pathname === item.href ? "text-[#029bba]" : "text-gray-700 hover:text-[#029bba]"
                )}
              >
                {item.label}
                <span
                  className={cx(
                    "absolute -bottom-1 left-0 h-0.5 bg-[#029bba] transition-all duration-200",
                    router.pathname === item.href ? "w-0" : "w-0 group-hover:w-full"
                  )}
                />
              </Link>
            ))}

            {/* TOOLS DROPDOWN */}
            <div className="relative" ref={toolsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                className={cx(
                  "inline-flex items-center gap-1 text-[15px] font-semibold transition-colors relative group",
                  router.pathname.startsWith("/tools") ? "text-[#029bba]" : "text-gray-700 hover:text-[#029bba]"
                )}
                aria-expanded={isToolsDropdownOpen}
                aria-haspopup="true"
              >
                <Sparkles className="w-4 h-4" />
                Tools
                <ChevronDown className={cx("w-3.5 h-3.5 transition-transform", isToolsDropdownOpen && "rotate-180")} />
              </button>

              {isToolsDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-96 rounded-2xl border-2 border-gray-100 bg-white shadow-2xl overflow-hidden z-[9999]">
                  <div className="px-5 py-3 bg-gradient-to-r from-[#029bba] to-[#004063] text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-[#06b6d4]" />
                      <h3 className="font-bold text-sm">Free Intelligence Tools</h3>
                    </div>
                    <p className="text-xs text-white/80">Make smarter property decisions</p>
                  </div>

                  <div className="p-2">
                    <ToolMenuItem
                      icon={<ShieldCheck className="w-5 h-5" />}
                      iconBg="from-[#029bba] to-[#004063]"
                      title="Verify Society NOC"
                      description="Check legal approval + risk alerts"
                      href="/tools/verify-society"
                      badge="Industry-First"
                      onClick={() => setIsToolsDropdownOpen(false)}
                    />
                    <ToolMenuItem
                      icon={<Banknote className="w-5 h-5" />}
                      iconBg="from-[#027a94] to-[#003553]"
                      title="Fair Price Estimator"
                      description="Data-driven price verdict engine"
                      href="/tools/price-estimator"
                      badge="Industry-First"
                      onClick={() => setIsToolsDropdownOpen(false)}
                    />
                    <ToolMenuItem
                      icon={<Construction className="w-5 h-5" />}
                      iconBg="from-[#004063] to-[#001f2b]"
                      title="Construction Calculator"
                      description="14 property types · 10 cities"
                      href="/tools/construction-calculator"
                      badge="Industry-First"
                      onClick={() => setIsToolsDropdownOpen(false)}
                    />
                    <ToolMenuItem
                      icon={<Calculator className="w-5 h-5" />}
                      iconBg="from-[#029bba] to-[#003553]"
                      title="Home Loan Calculator"
                      description="10 banks · Islamic + Conventional"
                      href="/tools/home-loan-calculator"
                      badge="Industry-First"
                      onClick={() => setIsToolsDropdownOpen(false)}
                    />
                    <ToolMenuItem
                      icon={<Ruler className="w-5 h-5" />}
                      iconBg="from-[#06b6d4] to-[#029bba]"
                      title="Area Unit Converter"
                      description="13 units · 3 Marla standards"
                      href="/tools/area-unit-converter"
                      badge="Most Comprehensive"
                      onClick={() => setIsToolsDropdownOpen(false)}
                    />
                  </div>

                  <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                    <Link
                      href="/tools"
                      onClick={() => setIsToolsDropdownOpen(false)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white text-sm font-bold transition-all shadow-md group"
                    >
                      <Sparkles className="w-4 h-4" />
                      View All Tools
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* EXPLORE DROPDOWN (NEW — consolidates secondary nav) */}
            <div className="relative" ref={exploreDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExploreDropdownOpen(!isExploreDropdownOpen)}
                className={cx(
                  "inline-flex items-center gap-1 text-[15px] font-semibold transition-colors relative group whitespace-nowrap",
                  exploreItems.some(item => router.pathname.startsWith(item.href))
                    ? "text-[#029bba]"
                    : "text-gray-700 hover:text-[#029bba]"
                )}
                aria-expanded={isExploreDropdownOpen}
                aria-haspopup="true"
              >
                Explore
                <ChevronDown className={cx("w-3.5 h-3.5 transition-transform", isExploreDropdownOpen && "rotate-180")} />
              </button>

              {isExploreDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 rounded-2xl border-2 border-gray-100 bg-white shadow-2xl overflow-hidden z-[9999]">
                  <div className="px-5 py-3 bg-gradient-to-r from-[#029bba] to-[#004063] text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-[#06b6d4]" />
                      <h3 className="font-bold text-sm">Explore Highrise.pk</h3>
                    </div>
                    <p className="text-xs text-white/80">Discover more of the platform</p>
                  </div>

                  <div className="p-2">
                    {exploreItems.map((item) => {
                      const active = router.pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setIsExploreDropdownOpen(false)}
                          className={cx(
                            "flex items-start gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer group",
                            active
                              ? "bg-[#029bba]/10"
                              : "hover:bg-gradient-to-r hover:from-[#029bba]/5 hover:to-[#029bba]/10"
                          )}
                        >
                          <div className={cx(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                            active
                              ? "bg-[#029bba] text-white"
                              : "bg-[#029bba]/10 text-[#029bba] group-hover:bg-[#029bba] group-hover:text-white"
                          )}>
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cx(
                              "font-bold text-sm transition-colors",
                              active ? "text-[#029bba]" : "text-gray-900 group-hover:text-[#029bba]"
                            )}>
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* RIGHT SIDE ACTIONS */}
          <div className="flex items-center gap-3">

            {/* ═══════════════════════════════════════════════════════
                COMPARE BUTTON — Bar Chart + Counter (Desktop)
                Shows when items are in comparison list
                Positioned before Shortlist for logical grouping
            ═══════════════════════════════════════════════════════ */}
            <Link
              href="/compare"
              aria-label={`Compare${compareCount > 0 ? ` (${compareCount} items)` : ''}`}
              className={cx(
                "hidden md:flex relative items-center justify-center",
                "w-11 h-11 rounded-xl transition-all group",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/compare" || router.pathname.startsWith("/compare/")
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <BarChart3
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/compare"
                    ? "text-[#029bba]"
                    : compareCount > 0
                      ? "text-[#029bba]"
                      : "text-gray-500 group-hover:text-[#029bba]"
                )}
              />
              {compareReady && compareCount > 0 && (
                <span
                  className={cx(
                    "absolute -top-0.5 -right-0.5",
                    "min-w-[20px] h-5 px-1.5",
                    "rounded-full bg-[#029bba] text-white",
                    "text-[10px] font-black leading-none",
                    "flex items-center justify-center",
                    "border-2 border-white shadow-sm",
                    "animate-in zoom-in-50 duration-200"
                  )}
                  aria-hidden="true"
                >
                  {compareCount}
                </span>
              )}
            </Link>

            {/* ═══════════════════════════════════════════════════════
                SHORTLIST BUTTON — Heart + Counter (Desktop)
                Always visible (guest + logged-in)
                Guest count from localStorage, logged-in from DB
            ═══════════════════════════════════════════════════════ */}
            <Link
              href="/shortlist"
              aria-label={`My Shortlist${favoritesCount > 0 ? ` (${favoritesCount} saved)` : ''}`}
              className={cx(
                "hidden md:flex relative items-center justify-center",
                "w-11 h-11 rounded-xl transition-all group",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/shortlist"
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <Heart
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/shortlist"
                    ? "text-[#029bba] fill-[#029bba]"
                    : favoritesCount > 0
                      ? "text-red-500 fill-red-500"
                      : "text-gray-500 group-hover:text-red-500"
                )}
              />
              {favoritesReady && favoritesCount > 0 && (
                <span
                  className={cx(
                    "absolute -top-0.5 -right-0.5",
                    "min-w-[20px] h-5 px-1.5",
                    "rounded-full bg-red-500 text-white",
                    "text-[10px] font-black leading-none",
                    "flex items-center justify-center",
                    "border-2 border-white shadow-sm",
                    "animate-in zoom-in-50 duration-200"
                  )}
                  aria-hidden="true"
                >
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </Link>

            {/* LOGGED IN: Add Listing */}
            {isLoggedIn && (
              <>
                {isDevApproved ? (
                  <div className="relative hidden md:block">
                    <Button
                      type="button"
                      size="sm"
                      className="flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white font-semibold rounded-xl px-5 shadow-lg hover:shadow-xl transition-all"
                      onClick={() => setIsAddListingOpen(!isAddListingOpen)}
                    >
                      <Plus className="w-4 h-4" />
                      Add Listing
                      <ChevronDown className={cx("w-4 h-4 transition-transform", isAddListingOpen && "rotate-180")} />
                    </Button>

                    {isAddListingOpen && (
                      <>
                        <div className="fixed inset-0 z-[998]" onClick={() => setIsAddListingOpen(false)} />
                        <div className="absolute right-0 mt-2 w-64 rounded-2xl border-2 border-gray-200 bg-white p-2 shadow-2xl z-[999]">
                          <Link
                            href="/add-property"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-[#029bba]/10 hover:to-[#029bba]/5 transition-all group"
                            onClick={() => setIsAddListingOpen(false)}
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#029bba]/10 flex items-center justify-center group-hover:bg-[#029bba]/20 transition-colors">
                              <Home className="w-5 h-5 text-[#029bba]" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Add Property</p>
                              <p className="text-xs text-gray-500">Single unit listing</p>
                            </div>
                          </Link>
                          <Link
                            href="/developer/projects/new"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-[#029bba]/10 hover:to-[#029bba]/5 transition-all group mt-1"
                            onClick={() => setIsAddListingOpen(false)}
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#029bba]/10 flex items-center justify-center group-hover:bg-[#029bba]/20 transition-colors">
                              <Building2 className="w-5 h-5 text-[#029bba]" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Add Project</p>
                              <p className="text-xs text-gray-500">Multi-unit development</p>
                            </div>
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Admins don't need "List Your Property" button */
                  !isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      className="hidden md:flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white text-sm font-semibold rounded-xl px-4 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                      onClick={() => router.push("/add-property")}
                    >
                      <Plus className="w-4 h-4" />
                      List Property
                    </Button>
                  )
                )}
              </>
            )}

            {/* GUEST: Login + List */}
            {!isLoggedIn && (
              <>
                                <Button
                  type="button"
                  size="sm"
                  className="hidden md:flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white text-sm font-semibold rounded-xl px-4 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setLoginContext("listing");
                    setIsLoginModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  List Property
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden md:flex items-center gap-2 text-[15px] text-gray-700 hover:text-[#029bba] font-semibold transition-colors"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  <User className="w-4 h-4" />
                  Login
                </Button>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                LOGGED IN: PROFILE DROPDOWN (ROLE-AWARE)
            ═══════════════════════════════════════════════════════════════ */}
            {isLoggedIn && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#029bba] hidden sm:block text-sm">
                  {displayName}
                </span>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:text-[#029bba] hover:bg-gray-50 transition-all border-2 border-transparent hover:border-gray-200"
                      aria-label="User menu"
                    >
                      <UserCircle className="w-5 h-5" />
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="z-[9999] min-w-[300px] max-h-[calc(100vh-110px)] overflow-y-auto overscroll-contain rounded-2xl border-2 border-gray-200 bg-white p-2 shadow-2xl"
                  >
                    {/* ═══════════════════════════════════════════════════════════════
                        USER INFO HEADER
                    ═══════════════════════════════════════════════════════════════ */}
                    <div className="px-4 py-4 border-b border-gray-100 mb-1">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {user?.email}
                      </p>
                      <div
                        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: roleBadge.bg, color: roleBadge.color }}
                      >
                        {roleBadge.icon}
                        {roleBadge.text}
                      </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        🛡️ ADMIN MENU
                    ═══════════════════════════════════════════════════════════════ */}
                    {isAdmin && (
                      <>
                        <SectionHeader label="Admin Workspace" color="text-amber-600" />
                        <MenuItem
                          href="/admin"
                          icon={<Shield />}
                          label="Admin Dashboard"
                          iconColor="text-amber-500"
                          hoverColor="group-hover:text-amber-600"
                        />

                        <SectionHeader label="Manage Listings" color="text-amber-600" />
                        <MenuItem href="/admin/properties" icon={<Home />} label="Manage Properties" />
                        <MenuItem href="/admin/projects"   icon={<Building />} label="Manage Projects" />
                        <MenuItem href="/admin/societies"  icon={<Building2 />} label="Manage Societies" />

                        <SectionHeader label="Manage Users" color="text-amber-600" />
                        <MenuItem href="/admin/developers" icon={<Building2 />} label="Manage Developers" />
                        <MenuItem href="/admin/agents"     icon={<Users />} label="Manage Agents" />
                        <MenuItem href="/admin/users"      icon={<UserCircle />} label="Manage Users" />

                                                <SectionHeader label="Verifications" color="text-amber-600" />
                        <MenuItem href="/admin/owners"     icon={<ShieldCheck />} label="Verified Owners" />
                        <MenuItem href="/admin/providers"  icon={<Wrench />}      label="Service Providers" />
                        <MenuItem href="/admin/labour"     icon={<HardHat />}     label="Labour Verification" />

                        <SectionHeader label="SafeDeal & Visits" color="text-amber-600" />
                        <MenuItem href="/admin/safedeal"   icon={<ShieldCheck />} label="SafeDeal Bookings" />
                        <MenuItem href="/admin/homevisit"  icon={<Home />}        label="Home Visits" />

                        <SectionHeader label="CRM & AI" color="text-amber-600" />
                        <MenuItem href="/admin/leads"  icon={<MessageSquare />} label="Manage Leads" />
                        <MenuItem
                          href="/admin/aleem"
                          icon={<Bot />}
                          label="Aleem AI"
                          description="Conversations + analytics"
                          badge={{ text: "AI", color: "#029bba" }}
                        />

                        <SectionHeader label="Content & Reports" color="text-amber-600" />
                        <MenuItem href="/admin/blogs"     icon={<FileText />} label="Blog Manager" />
                        <MenuItem href="/admin/analytics" icon={<BarChart3 />} label="Analytics" />
                        <MenuItem href="/admin/campaigns" icon={<Megaphone />} label="Campaigns" />
                        <MenuItem href="/admin/settings"  icon={<Settings />} label="Admin Settings" />
                      </>
                    )}

                                        {/* ═══════════════════════════════════════════════════════════════
                        🛡️ VERIFIED OWNER MENU
                    ═══════════════════════════════════════════════════════════════ */}
                    {isVerifiedOwner && !isAdmin && !isAgent && !isDeveloper && (
                      <>
                        <SectionHeader label="Owner Portal" color="#059669" />
                        <MenuItem
                          href="/owner/dashboard"
                          icon={<LayoutDashboard />}
                          label="Owner Dashboard"
                          iconColor="text-emerald-400"
                          hoverColor="group-hover:text-emerald-600"
                        />
                        <MenuItem
                          href="/owner/listings"
                          icon={<Home />}
                          label="My Listings"
                          iconColor="text-emerald-400"
                          hoverColor="group-hover:text-emerald-600"
                        />
                        <MenuItem
                          href="/owner/leads"
                          icon={<MessageSquare />}
                          label="My Leads"
                          iconColor="text-emerald-400"
                          hoverColor="group-hover:text-emerald-600"
                        />
                      </>
                    )}

                    {isOwnerPending && !isAdmin && !isAgent && !isDeveloper && !isVerifiedOwner && (
                      <>
                        <SectionHeader label="Owner Verification" color="#d97706" />
                        <MenuItem
                          href="/owner/verify"
                          icon={<Clock />}
                          label="Verification Pending"
                          description="Usually 24-48 hours"
                          badge={{ text: "Under Review", color: "#d97706" }}
                          iconColor="text-amber-400"
                          hoverColor="group-hover:text-amber-600"
                        />
                      </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        🏢 AGENT MENU
                    ═══════════════════════════════════════════════════════════════ */}
                    {isAgent && (
                      <>
                        <SectionHeader label="Agent Workspace" color="text-orange-600" />
                        <MenuItem
                          href="/agent/dashboard"
                          icon={<LayoutDashboard />}
                          label="Agent Dashboard"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />
                        <MenuItem
                          href="/agent/listings"
                          icon={<Home />}
                          label="My Listings"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />
                        <MenuItem
                          href="/agent/leads"
                          icon={<MessageSquare />}
                          label="My Leads"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />

                        <SectionHeader label="Profile" color="text-orange-600" />
                        <MenuItem
                          href="/agent/profile"
                          icon={<UserCircle />}
                          label="Agent Profile"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />
                        <MenuItem
                          href="/add-property"
                          icon={<Plus />}
                          label="Add New Property"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />
                      </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        🏗️ DEVELOPER MENU
                    ═══════════════════════════════════════════════════════════════ */}
                    {isDeveloper && !isAdmin && !isAgent && (
                      <>
                        <SectionHeader label="Developer Workspace" color={PRIMARY_COLOR} />
                        <MenuItem
                          href="/developer/dashboard"
                          icon={<LayoutDashboard />}
                          label="Developer Dashboard"
                          badge={
                            developerProfile?.status === "pending"
                              ? { text: "Pending", color: "#d97706" }
                              : developerProfile?.status === "rejected"
                              ? { text: "Rejected", color: "#dc2626" }
                              : undefined
                          }
                        />
                        <MenuItem href="/developer/projects" icon={<Building />} label="My Projects" />
                        {isDevApproved && (
                          <MenuItem href="/developer/projects/new" icon={<FolderPlus />} label="Add New Project" />
                        )}
                        <MenuItem href="/developer/leads"     icon={<MessageSquare />} label="My Leads" />
                        <MenuItem href="/developer/analytics" icon={<TrendingUp />} label="Analytics" />

                        <SectionHeader label="Company" color={PRIMARY_COLOR} />
                        <MenuItem href="/developer/profile" icon={<Settings />} label="Company Profile" />
                      </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        👤 REGULAR USER MENU
                    ═══════════════════════════════════════════════════════════════ */}
                    {!isAdmin && !isAgent && !isDeveloper && (
                      <>
                        <SectionHeader label="My Account" />
                        <MenuItem href="/dashboard"        icon={<LayoutDashboard />} label="My Dashboard" />
                        <MenuItem href="/profile"          icon={<UserCircle />} label="My Profile" />
                        <MenuItem href="/my-properties"    icon={<Home />} label="My Properties" />
                        <MenuItem href="/saved-properties" icon={<Heart />} label="Saved Properties" />

                                               <SectionHeader label="Upgrade Your Account" color={PRIMARY_COLOR} />

                        {/* Verified Owner option */}
                        <DropdownMenu.Item asChild>
                          <Link
                            href="/owner/verify"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                              bg-gradient-to-r from-emerald-50 to-emerald-100
                              hover:from-emerald-100 hover:to-emerald-200
                              transition-all group cursor-pointer outline-none"
                            style={{ color: "#059669" }}
                          >
                            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">List My Property</p>
                              <p className="text-[11px] opacity-80">CNIC verified owner listing</p>
                            </div>
                            <ArrowRight className="w-4 h-4 flex-shrink-0" />
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item asChild>
                          <Link
                            href="/onboarding/business"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                              bg-gradient-to-r from-orange-50 to-orange-100
                              hover:from-orange-100 hover:to-orange-200
                              transition-all group cursor-pointer outline-none"
                            style={{ color: "#ea580c" }}
                          >
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">Become an Agent</p>
                              <p className="text-[11px] opacity-80">List properties professionally</p>
                            </div>
                            <ArrowRight className="w-4 h-4 flex-shrink-0" />
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item asChild>
                          <Link
                            href="/onboarding/developer"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                              bg-gradient-to-r from-[#029bba]/5 to-[#029bba]/10
                              hover:from-[#029bba]/10 hover:to-[#029bba]/20
                              transition-all group cursor-pointer outline-none"
                            style={{ color: PRIMARY_COLOR }}
                          >
                            <Building2 className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">Become a Developer</p>
                              <p className="text-[11px] opacity-80">Create verified projects</p>
                            </div>
                            <ArrowRight className="w-4 h-4 flex-shrink-0" />
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item asChild>
                          <Link
                            href="/onboarding/society"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                              bg-gradient-to-r from-purple-50 to-purple-100
                              hover:from-purple-100 hover:to-purple-200
                              transition-all group cursor-pointer outline-none"
                            style={{ color: "#7c3aed" }}
                          >
                            <Building className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">Register Society</p>
                              <p className="text-[11px] opacity-80">Manage plots & blocks</p>
                            </div>
                            <ArrowRight className="w-4 h-4 flex-shrink-0" />
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item asChild>
                          <Link
                            href="/coming-soon?feature=provider"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                              bg-gradient-to-r from-gray-50 to-gray-100
                              hover:from-gray-100 hover:to-gray-200
                              transition-all group cursor-pointer outline-none"
                            style={{ color: "#6b7280" }}
                          >
                            <Wrench className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">Service Provider</p>
                              <p className="text-[11px] opacity-80">Vendors, contractors, factories</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                              Soon
                            </span>
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item asChild>
                          <Link
                            href="/coming-soon?feature=labour"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                              bg-gradient-to-r from-gray-50 to-gray-100
                              hover:from-gray-100 hover:to-gray-200
                              transition-all group cursor-pointer outline-none"
                            style={{ color: "#6b7280" }}
                          >
                            <HardHat className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">Skilled Labour</p>
                              <p className="text-[11px] opacity-80">Register your trade</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                              Soon
                            </span>
                          </Link>
                        </DropdownMenu.Item>
                      </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        LOGOUT (all roles)
                    ═══════════════════════════════════════════════════════════════ */}
                    <DropdownMenu.Separator className="my-2 h-px bg-gray-200" />

                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 rounded-xl
                        hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100
                        cursor-pointer transition-all font-semibold group outline-none"
                    >
                      <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Log Out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                MOBILE COMPARE BUTTON
            ═══════════════════════════════════════════════════════ */}
            <Link
              href="/compare"
              aria-label={`Compare${compareCount > 0 ? ` (${compareCount} items)` : ''}`}
              className={cx(
                "md:hidden relative flex items-center justify-center",
                "w-10 h-10 rounded-xl transition-colors",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/compare" || router.pathname.startsWith("/compare/")
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <BarChart3
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/compare" || compareCount > 0
                    ? "text-[#029bba]"
                    : "text-gray-600"
                )}
              />
              {compareReady && compareCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5
                             min-w-[18px] h-[18px] px-1
                             rounded-full bg-[#029bba] text-white
                             text-[9px] font-black leading-none
                             flex items-center justify-center
                             border-2 border-white shadow-sm
                             animate-in zoom-in-50 duration-200"
                  aria-hidden="true"
                >
                  {compareCount}
                </span>
              )}
            </Link>

            {/* ═══════════════════════════════════════════════════════
                MOBILE SHORTLIST BUTTON — Heart + Counter
                Visible on mobile only (desktop shown above)
            ═══════════════════════════════════════════════════════ */}
            <Link
              href="/shortlist"
              aria-label={`My Shortlist${favoritesCount > 0 ? ` (${favoritesCount} saved)` : ''}`}
              className={cx(
                "md:hidden relative flex items-center justify-center",
                "w-10 h-10 rounded-xl transition-colors",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/shortlist"
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <Heart
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/shortlist"
                    ? "text-[#029bba] fill-[#029bba]"
                    : favoritesCount > 0
                      ? "text-red-500 fill-red-500"
                      : "text-gray-600"
                )}
              />
              {favoritesReady && favoritesCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5
                             min-w-[18px] h-[18px] px-1
                             rounded-full bg-red-500 text-white
                             text-[9px] font-black leading-none
                             flex items-center justify-center
                             border-2 border-white shadow-sm
                             animate-in zoom-in-50 duration-200"
                  aria-hidden="true"
                >
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </Link>

            {/* MOBILE MENU BUTTON */}
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen
                ? <X className="w-6 h-6 text-gray-700" />
                : <Menu className="w-6 h-6 text-gray-700" />}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MOBILE MENU (Slide-in)
        ═══════════════════════════════════════════════════════════════ */}
        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[998] lg:hidden animate-in fade-in duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            <div
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[400px] bg-white z-[999] lg:hidden shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#029bba] to-[#004063] px-6 py-5 shadow-lg z-10">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 -ml-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <Image
                    src="/images/logo.png"
                    alt="Highrise.pk"
                    width={120}
                    height={48}
                    className="h-10 w-auto object-contain"
                  />
                </div>

                {isLoggedIn ? (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-base truncate">{displayName}</p>
                        <p className="text-white/70 text-xs truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 text-white border border-white/30">
                      {roleBadge.icon}
                      {roleBadge.text}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-white/90 text-sm font-medium">Welcome to Highrise.pk</p>
                    <p className="text-white/70 text-xs mt-1">Pakistan&apos;s Trusted Property Platform</p>
                  </div>
                )}
              </div>

              {/* Public navigation links */}
              <nav className="px-4 py-4" role="navigation">
                <div className="space-y-1">
                  {navLinks.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cx(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all min-h-[44px]",
                        router.pathname === item.href
                          ? "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]"
                          : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Home className="w-5 h-5" />
                      {item.label}
                    </Link>
                  ))}

                  {/* Tools expandable */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsMobileToolsExpanded(!isMobileToolsExpanded)}
                      className={cx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-semibold transition-all min-h-[44px]",
                        router.pathname.startsWith("/tools")
                          ? "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]"
                          : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5" />
                        Tools
                      </div>
                      <ChevronDown className={cx("w-4 h-4 transition-transform", isMobileToolsExpanded && "rotate-180")} />
                    </button>
                    <div
                      className={cx(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        isMobileToolsExpanded ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="ml-4 space-y-1 pl-3 border-l-2 border-[#029bba]/20">
                        <Link href="/tools/verify-society" onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#029bba]/5 hover:text-[#029bba] transition-all">
                          <ShieldCheck className="w-4 h-4 text-[#029bba]" /> Verify Society NOC
                        </Link>
                        <Link href="/tools/price-estimator" onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#029bba]/5 hover:text-[#029bba] transition-all">
                          <Banknote className="w-4 h-4 text-[#029bba]" /> Fair Price Estimator
                        </Link>
                        <Link href="/tools/construction-calculator" onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#029bba]/5 hover:text-[#029bba] transition-all">
                          <Construction className="w-4 h-4 text-[#029bba]" /> Construction Calculator
                        </Link>
                        <Link href="/tools/home-loan-calculator" onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#029bba]/5 hover:text-[#029bba] transition-all">
                          <Calculator className="w-4 h-4 text-[#029bba]" /> Home Loan Calculator
                        </Link>
                        <Link href="/tools/area-unit-converter" onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#029bba]/5 hover:text-[#029bba] transition-all">
                          <Ruler className="w-4 h-4 text-[#029bba]" /> Area Unit Converter
                        </Link>
                        <Link href="/tools" onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-[#029bba] bg-[#029bba]/5 hover:bg-[#029bba]/10 transition-all">
                          <Sparkles className="w-4 h-4" /> View All Tools
                          <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    LOGGED IN: ROLE-AWARE MOBILE MENU
                ═══════════════════════════════════════════════════════════════ */}
                {isLoggedIn && (
                  <>
                    {/* Add Listing CTA — not for admin */}
                    {!isAdmin && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <div className="space-y-1">
                          {isDevApproved ? (
                            <>
                              <MobileLink href="/add-property" icon={<Plus />} label="Add Property"
                                onClick={() => setIsMobileMenuOpen(false)} variant="primary" />
                              <MobileLink href="/developer/projects/new" icon={<Building2 />} label="Add Project"
                                onClick={() => setIsMobileMenuOpen(false)} variant="soft" />
                            </>
                          ) : (
                            <MobileLink href="/add-property" icon={<Plus />} label="List Your Property"
                              onClick={() => setIsMobileMenuOpen(false)} variant="primary" />
                          )}
                        </div>
                      </>
                    )}

                    {/* ── ADMIN MOBILE ── */}
                    {isAdmin && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <MobileSectionHeader label="🛡️ Admin Workspace" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin" icon={<Shield />} label="Admin Dashboard"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin"} />
                        </div>

                        <MobileSectionHeader label="Manage Listings" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin/properties" icon={<Home />} label="Manage Properties"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/properties"} />
                          <MobileLink href="/admin/projects" icon={<Building />} label="Manage Projects"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/projects"} />
                          <MobileLink href="/admin/societies" icon={<Building2 />} label="Manage Societies"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/societies"} />
                        </div>

                        <MobileSectionHeader label="Manage Users" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin/developers" icon={<Building2 />} label="Manage Developers"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/developers"} />
                          <MobileLink href="/admin/agents" icon={<Users />} label="Manage Agents"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/agents"} />
                          <MobileLink href="/admin/users" icon={<UserCircle />} label="Manage Users"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/users"} />
                        </div>

                        <MobileSectionHeader label="CRM & AI" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin/leads" icon={<MessageSquare />} label="Manage Leads"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/leads"} />
                          <MobileLink href="/admin/aleem" icon={<Bot />} label="Aleem AI"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname.startsWith("/admin/aleem")} />
                        </div>

                        <MobileSectionHeader label="Content & Reports" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin/blogs" icon={<FileText />} label="Blog Manager"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname.startsWith("/admin/blogs")} />
                          <MobileLink href="/admin/analytics" icon={<BarChart3 />} label="Analytics"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/analytics"} />
                          <MobileLink href="/admin/campaigns" icon={<Megaphone />} label="Campaigns"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname.startsWith("/admin/campaigns")} />
                          <MobileLink href="/admin/settings" icon={<Settings />} label="Admin Settings"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/settings"} />
                        </div>
                      </>
                    )}

                    {/* ── AGENT MOBILE ── */}
                    {isAgent && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <MobileSectionHeader label="🏢 Agent Workspace" color="#ea580c" />
                        <div className="space-y-1">
                          <MobileLink href="/agent/dashboard" icon={<LayoutDashboard />} label="Agent Dashboard"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/agent/dashboard"} />
                          <MobileLink href="/agent/listings" icon={<Home />} label="My Listings"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/agent/listings"} />
                          <MobileLink href="/agent/leads" icon={<MessageSquare />} label="My Leads"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/agent/leads"} />
                          <MobileLink href="/agent/profile" icon={<UserCircle />} label="Agent Profile"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/agent/profile"} />
                        </div>
                      </>
                    )}

                    {/* ── DEVELOPER MOBILE ── */}
                    {isDeveloper && !isAdmin && !isAgent && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <MobileSectionHeader label="🏗️ Developer Workspace" color={PRIMARY_COLOR} />
                        <div className="space-y-1">
                          <MobileLink href="/developer/dashboard" icon={<LayoutDashboard />} label="Developer Dashboard"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/dashboard"} />
                          <MobileLink href="/developer/projects" icon={<Building />} label="My Projects"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname.startsWith("/developer/projects")} />
                          {isDevApproved && (
                            <MobileLink href="/developer/projects/new" icon={<FolderPlus />} label="Add New Project"
                              onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/projects/new"} />
                          )}
                          <MobileLink href="/developer/leads" icon={<MessageSquare />} label="My Leads"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/leads"} />
                          <MobileLink href="/developer/analytics" icon={<TrendingUp />} label="Analytics"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/analytics"} />
                          <MobileLink href="/developer/profile" icon={<Settings />} label="Company Profile"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/profile"} />
                        </div>
                      </>
                    )}

                    {/* ── USER MOBILE ── */}
                    {!isAdmin && !isAgent && !isDeveloper && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <MobileSectionHeader label="My Account" color="#6b7280" />
                        <div className="space-y-1">
                          <MobileLink href="/dashboard" icon={<LayoutDashboard />} label="My Dashboard"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/dashboard"} />
                          <MobileLink href="/profile" icon={<UserCircle />} label="My Profile"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/profile"} />
                          <MobileLink href="/my-properties" icon={<Home />} label="My Properties"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/my-properties"} />
                          <MobileLink href="/saved-properties" icon={<Heart />} label="Saved Properties"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/saved-properties"} />
                        </div>

                        <MobileSectionHeader label="Upgrade Account" color={PRIMARY_COLOR} />
                        <div className="space-y-1">
                          <Link
                            href="/onboarding/business"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 transition-all min-h-[44px]"
                          >
                            <Users className="w-5 h-5" />
                            <span className="flex-1">Become an Agent</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                          <Link
                            href="/onboarding/developer"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba] transition-all min-h-[44px]"
                          >
                            <Building2 className="w-5 h-5" />
                            <span className="flex-1">Become a Developer</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                          <Link
                            href="/onboarding/society"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 transition-all min-h-[44px]"
                          >
                            <Building className="w-5 h-5" />
                            <span className="flex-1">Register Society</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                          <Link
                            href="/coming-soon?feature=provider"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 transition-all min-h-[44px]"
                          >
                            <Wrench className="w-5 h-5" />
                            <span className="flex-1">Service Provider</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Soon</span>
                          </Link>
                          <Link
                            href="/coming-soon?feature=labour"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 transition-all min-h-[44px]"
                          >
                            <HardHat className="w-5 h-5" />
                            <span className="flex-1">Skilled Labour</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Soon</span>
                          </Link>
                        </div>
                      </>
                    )}

                    {/* Logout */}
                    <div className="my-4 border-t-2 border-gray-100" />
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition-all min-h-[44px] w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      Log Out
                    </button>
                  </>
                )}

                {/* Guest: Login button */}
                {!isLoggedIn && (
                  <>
                    <div className="my-4 border-t-2 border-gray-100" />
                    <button
                      className="flex items-center justify-center gap-3 w-full px-4 py-3.5 bg-gradient-to-r from-[#029bba] to-[#027a94] text-white rounded-xl text-[15px] font-semibold shadow-lg hover:shadow-xl transition-all min-h-[44px]"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsLoginModalOpen(true);
                      }}
                    >
                      <User className="w-5 h-5" />
                      Login / Sign Up
                    </button>
                    <button
                      className="flex items-center justify-center gap-3 w-full px-4 py-3.5 mt-2 bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba] rounded-xl text-[15px] font-semibold transition-all min-h-[44px]"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsLoginModalOpen(true);
                      }}
                    >
                      <Plus className="w-5 h-5" />
                      List Your Property
                    </button>
                  </>
                )}
              </nav>

              {/* Footer */}
              <div className="px-6 py-4 mt-4 border-t-2 border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  © {new Date().getFullYear()} Highrise.pk
                </p>
                <p className="text-xs text-gray-400 text-center mt-1">
                  Pakistan&apos;s Trusted Property Platform
                </p>
              </div>
            </div>
          </>
        )}
      </header>

      {/* LOGIN MODAL */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        size="sm"
      >
        <LoginOrSignupForm
          onSuccess={() => setIsLoginModalOpen(false)}
          isModal={true}
          context={loginContext}
        />
      </Modal>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎨 TOOL MENU ITEM (Desktop Tools Dropdown)
// ═══════════════════════════════════════════════════════════════

interface ToolMenuItemProps {
  icon: React.ReactElement;
  iconBg: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  onClick: () => void;
}

const ToolMenuItem: React.FC<ToolMenuItemProps> = ({
  icon, iconBg, title, description, href, badge, onClick,
}) => {
  return (
    <Link href={href} onClick={onClick}>
      <div className="group flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-[#029bba]/5 hover:to-[#029bba]/10 transition-all cursor-pointer">
        <div
          className={cx(
            "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform",
            iconBg
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-bold text-gray-900 text-sm group-hover:text-[#029bba] transition-colors truncate">
              {title}
            </h4>
            <span className="px-1.5 py-0.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
              {badge}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center" />
      </div>
    </Link>
  );
};

export default Header;