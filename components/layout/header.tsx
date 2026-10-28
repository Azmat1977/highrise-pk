// components/layout/header.tsx
// Highrise.pk -- Global Header
// Design System v19 Compliant -- Role-aware dropdown + mobile menu
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { icons } from "@/lib/design-system/icons";
import { colors } from "@/lib/design-system/tokens";
import { Button } from "../ui/button";
import { useRouter } from "next/router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import AuthGateModal from "@/components/auth/AuthGateModal";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/hooks/useCompare";
import { MEGA_MENU_CITIES } from "@/lib/pakistanCities";
import { useStickySearchActive } from "@/hooks/useStickySearchActive";

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIMARY_COLOR = colors.primary;
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
      bg: colors.warningLight,
      color: colors.warningDark,
      icon: <icons.Shield className="w-3 h-3" />,
    };
  }

  // Verified Owner
  if (isVerifiedOwner) {
    return {
      text: "Verified Owner",
      bg: colors.successLight,
      color: colors.successDark,
      icon: <icons.ShieldCheck className="w-3 h-3" />,
    };
  }
  if (ownerStatus === "pending") {
    return {
      text: "Owner (Pending)",
      bg: colors.warningLight,
      color: colors.warningDark,
      icon: <icons.Clock className="w-3 h-3" />,
    };
  }

  if (role === "developer" || hasDevProfile) {
    if (isDevApproved) {
      return {
        text: "Verified Developer",
        bg: colors.successLight,
        color: colors.successDark,
        icon: <icons.CheckCircle className="w-3 h-3" />,
      };
    }
    if (devStatus === "pending") {
      return {
        text: "Developer (Pending)",
        bg: colors.warningLight,
        color: colors.warningDark,
        icon: <icons.Clock className="w-3 h-3" />,
      };
    }
    if (devStatus === "rejected") {
      return {
        text: "Developer (Rejected)",
        bg: colors.errorLight,
        color: colors.errorDark,
        icon: <icons.XCircle className="w-3 h-3" />,
      };
    }
    return {
      text: "Developer",
      bg: colors.primaryLight,
      color: colors.primary,
      icon: <icons.Building2 className="w-3 h-3" />,
    };
  }

  if (role === "agent") {
    return {
      text: "Agent",
      bg: "#fff7ed",
      color: "#ea580c",
      icon: <icons.Users className="w-3 h-3" />,
    };
  }

  return {
    text: "User",
    bg: colors.gray100,
    color: colors.gray500,
    icon: <icons.User className="w-3 h-3" />,
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

// ============================================================
// PRIMARY NAVIGATION CONFIG
// ============================================================

type NavKey = "buy" | "rent" | "projects" | "developers" | "societies" | "agents" | "more";

interface NavLinkItem {
  label: string;
  href: string;
}

interface NavLinksSection {
  kind: "links";
  title: string;
  links: NavLinkItem[];
}

interface NavCitiesSection {
  kind: "cities";
  title: string;
  base: string;
  cities: string[];
  viewAllHref: string;
}

type NavSection = NavLinksSection | NavCitiesSection;

interface NavItem {
  key: NavKey;
  label: string;
  href: string;
  icon: React.ReactNode;
  sections: NavSection[];
  /** Optional city-chip row rendered under the item inside the mobile drawer. */
  cityArea?: {
    heading: string;
    base: string;
  };
}

const BUY_BASE = "/properties?listingType=full_payment";
const RENT_BASE = "/properties?listingType=rent";

// Header city shortcuts come from one shared list so every mega menu, the
// mobile drawer and any future nav surface stay in sync.
const MENU_CITIES = MEGA_MENU_CITIES;

const NAV_ITEMS: NavItem[] = [
  {
    key: "buy",
    label: "Buy",
    href: BUY_BASE,
    icon: <icons.Home className="w-5 h-5" />,
    cityArea: { heading: "Browse Properties by City", base: "/properties" },
    sections: [
      {
        kind: "links",
        title: "Find Your Home",
        links: [
          { label: "All Properties", href: BUY_BASE },
          { label: "Homes", href: `${BUY_BASE}&propertyCategory=residential` },
          { label: "Plots", href: `${BUY_BASE}&propertyCategory=plots` },
          { label: "Commercial", href: `${BUY_BASE}&propertyCategory=commercial` },
        ],
      },
      {
        kind: "links",
        title: "Homes & Rooms",
        links: [
          { label: "Houses", href: `${BUY_BASE}&propertyType=House` },
          { label: "Apartments & Flats", href: `${BUY_BASE}&propertyType=Apartment` },
          { label: "Villas", href: `${BUY_BASE}&propertyType=Villa` },
          { label: "Penthouses", href: `${BUY_BASE}&propertyType=Penthouse` },
          { label: "Upper Portions", href: `${BUY_BASE}&propertyType=Upper%20Portion` },
          { label: "Lower Portions", href: `${BUY_BASE}&propertyType=Lower%20Portion` },
          { label: "Farm Houses", href: `${BUY_BASE}&propertyType=Farm%20House` },
          { label: "Rooms", href: `${BUY_BASE}&propertyType=Room` },
        ],
      },
      {
        kind: "links",
        title: "Plots & Commercial",
        links: [
          { label: "Residential Plots", href: `${BUY_BASE}&propertyType=Residential%20Plot` },
          { label: "Commercial Plots", href: `${BUY_BASE}&propertyType=Commercial%20Plot` },
          { label: "Plot Files", href: `${BUY_BASE}&propertyType=Plot%20File` },
          { label: "Shops", href: `${BUY_BASE}&propertyType=Shop` },
          { label: "Offices", href: `${BUY_BASE}&propertyType=Office` },
          { label: "Warehouses", href: `${BUY_BASE}&propertyType=Warehouse` },
          { label: "Buildings", href: `${BUY_BASE}&propertyType=Building` },
          { label: "Plazas", href: `${BUY_BASE}&propertyType=Plaza` },
        ],
      },
      {
        kind: "links",
        title: "Before You Buy",
        links: [
          { label: "Verify Society NOC", href: "/tools/verify-society" },
          { label: "Fair Price Estimate", href: "/tools/price-estimator" },
          { label: "Construction Cost", href: "/tools/construction-calculator" },
          { label: "Risk Alerts", href: "/risk-alerts" },
        ],
      },
      {
        kind: "cities",
        title: "Browse by City",
        base: BUY_BASE,
        cities: MENU_CITIES,
        viewAllHref: "/cities",
      },
    ],
  },
  {
    key: "rent",
    label: "Rent",
    href: RENT_BASE,
    icon: <icons.Key className="w-5 h-5" />,
    cityArea: { heading: "Browse Rentals by City", base: "/properties?listingType=rent" },
    sections: [
      {
        kind: "links",
        title: "Rental Categories",
        links: [
          { label: "All Rentals", href: RENT_BASE },
          { label: "Homes for Rent", href: `${RENT_BASE}&propertyCategory=residential` },
          { label: "Commercial Rentals", href: `${RENT_BASE}&propertyCategory=commercial` },
          { label: "Plots for Rent", href: `${RENT_BASE}&propertyCategory=plots` },
        ],
      },
      {
        kind: "links",
        title: "Homes & Living",
        links: [
          { label: "Houses", href: `${RENT_BASE}&propertyType=House` },
          { label: "Apartments & Flats", href: `${RENT_BASE}&propertyType=Apartment` },
          { label: "Villas", href: `${RENT_BASE}&propertyType=Villa` },
          { label: "Penthouses", href: `${RENT_BASE}&propertyType=Penthouse` },
          { label: "Upper Portions", href: `${RENT_BASE}&propertyType=Upper%20Portion` },
          { label: "Lower Portions", href: `${RENT_BASE}&propertyType=Lower%20Portion` },
          { label: "Rooms", href: `${RENT_BASE}&propertyType=Room` },
          { label: "Farm Houses", href: `${RENT_BASE}&propertyType=Farm%20House` },
        ],
      },
      {
        kind: "links",
        title: "Commercial Rentals",
        links: [
          { label: "Offices", href: `${RENT_BASE}&propertyType=Office` },
          { label: "Shops", href: `${RENT_BASE}&propertyType=Shop` },
          { label: "Warehouses", href: `${RENT_BASE}&propertyType=Warehouse` },
          { label: "Factories", href: `${RENT_BASE}&propertyType=Factory` },
          { label: "Buildings", href: `${RENT_BASE}&propertyType=Building` },
          { label: "Plazas", href: `${RENT_BASE}&propertyType=Plaza` },
        ],
      },
      {
        kind: "cities",
        title: "Browse by City",
        base: RENT_BASE,
        cities: MENU_CITIES,
        viewAllHref: "/cities",
      },
    ],
  },
  {
    key: "projects",
    label: "New Projects",
    href: "/projects",
    icon: <icons.Building className="w-5 h-5" />,
    cityArea: { heading: "Browse Projects by City", base: "/projects" },
    sections: [
      {
        kind: "links",
        title: "Browse Projects",
        links: [
          { label: "All New Projects", href: "/projects" },
          { label: "On Installments", href: "/projects?installments=true" },
          { label: "Ready to Move", href: "/projects?possession=ready_to_move" },
          { label: "Under Construction", href: "/projects?possession=under_construction" },
          { label: "New Launch", href: "/projects?possession=new_launch" },
          { label: "Pre-Launch", href: "/projects?possession=pre_launch" },
        ],
      },
      {
        kind: "links",
        title: "Project Categories",
        links: [
          { label: "High-Rise Developments", href: "/projects?category=high_rise" },
          { label: "Housing Societies", href: "/projects?category=housing_society" },
          { label: "Commercial Plazas", href: "/projects?category=commercial_plaza" },
          { label: "Mixed-Use Projects", href: "/projects?category=mixed_use" },
          { label: "Gated Communities", href: "/projects?category=gated_community" },
          { label: "Townhouses & Villas", href: "/projects?category=townhouse" },
          { label: "Industrial Parks", href: "/projects?category=industrial_park" },
        ],
      },
      {
        kind: "cities",
        title: "Projects by City",
        base: "/projects",
        cities: MENU_CITIES,
        viewAllHref: "/cities",
      },
      {
        kind: "links",
        title: "Using Highrise",
        links: [
          { label: "How It Works", href: "/about" },
          { label: "Contact Sales", href: "/contact" },
          { label: "Blog & Insights", href: "/blog" },
          { label: "Risk Alerts", href: "/risk-alerts" },
        ],
      },
    ],
  },
  {
    key: "developers",
    label: "Developers",
    href: "/developers",
    icon: <icons.Building2 className="w-5 h-5" />,
    cityArea: { heading: "Browse Developers by City", base: "/developers" },
    sections: [
      {
        kind: "links",
        title: "Developer Directory",
        links: [
          { label: "All Developers", href: "/developers" },
          { label: "High-Rise Projects", href: "/projects?category=high_rise" },
          { label: "Housing Societies", href: "/projects?category=housing_society" },
          { label: "Commercial Plazas", href: "/projects?category=commercial_plaza" },
        ],
      },
      {
        kind: "links",
        title: "Explore Developments",
        links: [
          { label: "New Launches", href: "/projects?possession=new_launch" },
          { label: "Ready to Move", href: "/projects?possession=ready_to_move" },
          { label: "Gated Communities", href: "/projects?category=gated_community" },
          { label: "Mixed-Use Towers", href: "/projects?category=mixed_use" },
        ],
      },
      {
        kind: "cities",
        title: "Developers by City",
        base: "/developers",
        cities: MENU_CITIES,
        viewAllHref: "/cities",
      },
      {
        kind: "links",
        title: "List With Us",
        links: [
          { label: "Become a Developer", href: "/onboarding/business?role=developer" },
          { label: "Developer Onboarding", href: "/onboarding/developer" },
          { label: "List Your Property", href: "/add-property" },
        ],
      },
    ],
  },
  {
    key: "societies",
    label: "Societies",
    href: "/societies",
    icon: <icons.Landmark className="w-5 h-5" />,
    cityArea: { heading: "Browse Societies by City", base: "/societies" },
    sections: [
      {
        kind: "links",
        title: "Discover",
        links: [
          { label: "All Societies", href: "/societies" },
          { label: "Register Society", href: "/onboarding/society" },
          { label: "Society Projects", href: "/projects?category=housing_society" },
        ],
      },
      {
        kind: "links",
        title: "Verification & Risk",
        links: [
          { label: "Verify Society NOC", href: "/tools/verify-society" },
          { label: "Public Risk Alerts", href: "/risk-alerts" },
          { label: "SafeDeal Support", href: "/safedeal" },
        ],
      },
      {
        kind: "cities",
        title: "Societies by City",
        base: "/societies",
        cities: MENU_CITIES,
        viewAllHref: "/cities",
      },
    ],
  },
  {
    key: "agents",
    label: "Agents",
    href: "/agents",
    icon: <icons.Users className="w-5 h-5" />,
    cityArea: { heading: "Browse Agents by City", base: "/agents" },
    sections: [
      {
        kind: "links",
        title: "Find an Agent",
        links: [
          { label: "All Agents", href: "/agents" },
          { label: "Agent Dashboard", href: "/agent/dashboard" },
          { label: "Agent Listings", href: "/agent/listings" },
        ],
      },
      {
        kind: "links",
        title: "For Professionals",
        links: [
          { label: "Become an Agent", href: "/onboarding/business?role=agent" },
          { label: "Agent Registration", href: "/agent/register" },
          { label: "List Your Property", href: "/add-property" },
        ],
      },
      {
        kind: "cities",
        title: "Agents by City",
        base: "/agents",
        cities: MENU_CITIES,
        viewAllHref: "/cities",
      },
    ],
  },
  {
    key: "more",
    label: "More",
    href: "/tools",
    icon: <icons.Sparkles className="w-5 h-5" />,
    sections: [
      {
        kind: "links",
        title: "Free Tools",
        links: [
          { label: "All Research Tools", href: "/tools" },
          { label: "Verify Society NOC", href: "/tools/verify-society" },
          { label: "Fair Price Estimator", href: "/tools/price-estimator" },
          { label: "Construction Calculator", href: "/tools/construction-calculator" },
          { label: "Home Loan Calculator", href: "/tools/home-loan-calculator" },
          { label: "Area Unit Converter", href: "/tools/area-unit-converter" },
        ],
      },
      {
        kind: "links",
        title: "Platform",
        links: [
          { label: "Installment Properties", href: "/properties?listingType=installment" },
          { label: "Compare Properties", href: "/compare" },
          { label: "Saved Properties", href: "/saved-properties" },
          { label: "Blog & Insights", href: "/blog" },
          { label: "SafeDeal", href: "/safedeal" },
          { label: "All Cities", href: "/cities" },
        ],
      },
      {
        kind: "links",
        title: "Company",
        links: [
          { label: "About Us", href: "/about" },
          { label: "Contact Us", href: "/contact" },
          { label: "List Your Property", href: "/add-property" },
          { label: "Become a Developer", href: "/onboarding/developer" },
        ],
      },
    ],
  },
];

// Lightweight projection of the primary nav for surfaces that only need plain
// links (the compact sticky search header). Keeps one source of truth.
export const PRIMARY_NAV_LINKS: ReadonlyArray<{ key: NavKey; label: string; href: string }> =
  NAV_ITEMS.map(({ key, label, href }) => ({ key, label, href }));

function isNavItemActive(item: NavItem, pathname: string, asPath: string): boolean {  if (item.key === "buy") return asPath.startsWith("/properties") && /listingType=full_payment/.test(asPath);
  if (item.key === "rent") return asPath.startsWith("/properties") && /listingType=rent/.test(asPath);
  if (item.key === "projects") return pathname.startsWith("/projects");
  if (item.key === "developers") return pathname.startsWith("/developers");
  if (item.key === "societies") return pathname.startsWith("/societies");
  if (item.key === "agents") return pathname.startsWith("/agents") || pathname.startsWith("/agent/");
  if (item.key === "more") {
    return ["/tools", "/blog", "/about", "/contact", "/safedeal", "/risk-alerts", "/compare", "/saved-properties"].some(
      (route) => pathname.startsWith(route)
    );
  }
  return false;
}

export const Header: React.FC = () => {
  const router = useRouter();
  const navReady = router.isReady;
  const { data: session, status } = useSession();

  // ── Favorites & Compare (0ms Optimistic Sync Layer) ────────────
  const favHook = useFavorites({ defaultEntityType: 'property' });
  const compHook = useCompare({ defaultEntityType: 'property' });

  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [compareCount, setCompareCount] = useState<number>(0);

  const favoritesReady = favHook.isReady;
  const compareReady = compHook.isReady;

  // Sync hook baseline
  useEffect(() => {
    setFavoritesCount(favHook.totalCount);
  }, [favHook.totalCount]);

  useEffect(() => {
    setCompareCount(compHook.totalCount);
  }, [compHook.totalCount]);

  // Sync badge directly from hook refresh on event dispatch (prevents double-counting)
  useEffect(() => {
    const handleFavUpdate = () => {
      void favHook.refresh();
    };
    window.addEventListener('highrise_favorite_updated', handleFavUpdate);
    window.addEventListener('highrise:favorites-changed', handleFavUpdate);
    return () => {
      window.removeEventListener('highrise_favorite_updated', handleFavUpdate);
      window.removeEventListener('highrise:favorites-changed', handleFavUpdate);
    };
  }, [favHook]);

  useEffect(() => {
    const handleCompUpdate = () => {
      try {
        const arr = JSON.parse(localStorage.getItem('highrise_compare') || '[]');
        setCompareCount(Array.isArray(arr) ? arr.length : 0);
      } catch {}
    };
    handleCompUpdate(); // Init check
    window.addEventListener('highrise:compare-changed', handleCompUpdate);
    window.addEventListener('storage', handleCompUpdate);
    return () => {
      window.removeEventListener('highrise:compare-changed', handleCompUpdate);
      window.removeEventListener('storage', handleCompUpdate);
    };
  }, []);

  // ── State ──────────────────────────────────────────────────
  const [isLoginModalOpen, setIsLoginModalOpen]       = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen]       = useState(false);
    const [isAddListingOpen, setIsAddListingOpen]       = useState(false);
  const [loginContext, setLoginContext]                = useState<"contact" | "listing" | "save" | "general" | "compare" | "save_search">("general");
  const [activeNav, setActiveNav]                     = useState<NavKey | null>(null);
  // Geometry of the mega-menu card, measured from the open trigger so the panel
  // hangs directly under it instead of stretching across the whole viewport.
  const [panelBox, setPanelBox]                       = useState<{ left: number; width: number } | null>(null);
  const stickySearchActive = useStickySearchActive();
  const [isMobileMoreExpanded, setIsMobileMoreExpanded] = useState(false);
  const [isRouteLoading, setIsRouteLoading]           = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const navCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navPinnedRef = useRef(false);
  const activeNavRef = useRef<NavKey | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  // ── City browsing ──────────────────────────────────────────────
  // Static canonical city list (lib/pakistanCities) — used by the desktop
  // mega-menu column chips and the mobile drawer city rows. City chips are
  // links to supported ?city= filters, so no live fetch is required.
  const navCities = MENU_CITIES;

  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile | null>(null);
  const [devProfileLoading, setDevProfileLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Derived state ────────────────────────
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

  const handleShortlistClick = useCallback((e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setLoginContext("save");
      setIsLoginModalOpen(true);
    }
  }, [isLoggedIn]);

  const handleCompareClick = useCallback((e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setLoginContext("compare");
      setIsLoginModalOpen(true);
    }
  }, [isLoggedIn]);

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

  // --- Close navigation menus on route change ---
  useEffect(() => {
    applyNavState(null, false);
    setIsMobileMoreExpanded(false);
    setIsMobileMenuOpen(false);
    setIsAddListingOpen(false);
  }, [router.pathname, router.asPath]);

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

  // ─── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setDeveloperProfile(null);
      setDevProfileLoading(false);
      
      await signOut({ redirect: false });

      // Smart Redirect: Only kick to home if they are on a protected dashboard page
      const protectedRoutes = [
        '/admin', '/agent', '/owner', '/developer', 
        '/dashboard', '/profile', '/my-properties', '/saved-properties'
      ];
      
      const isProtected = protectedRoutes.some(route => router.pathname.startsWith(route));

      if (isProtected) {
        void router.push("/");
      } else {
        // Stay exactly on the current public page (e.g., Project Detail)
        // replace() clears the session cache without moving the scroll bar!
        void router.replace(router.asPath, undefined, { scroll: false });
      }
    } catch {
      window.location.href = "/";
    }
  }, [router]);

  // --- Navigation helpers --------------------------------------------------
  const clearNavCloseTimer = useCallback(() => {
    if (navCloseTimer.current) {
      clearTimeout(navCloseTimer.current);
      navCloseTimer.current = null;
    }
  }, []);

  // Single funnel for every open/close transition so the mirror refs and the
  // pinned (click-opened) flag never drift out of sync with React state.
  const applyNavState = useCallback((key: NavKey | null, pinned: boolean) => {
    navPinnedRef.current = key === null ? false : pinned;
    activeNavRef.current = key;
    setActiveNav(key);
  }, []);

  const openNav = useCallback((key: NavKey) => {
    clearNavCloseTimer();
    // Hovering the trigger of an already click-pinned menu keeps it pinned.
    applyNavState(key, activeNavRef.current === key && navPinnedRef.current);
  }, [applyNavState, clearNavCloseTimer]);

  // A click-opened (pinned) menu stays open while the pointer wanders; it only
  // closes via Escape, outside click, link navigation, route change or toggle.
  const scheduleCloseNav = useCallback(() => {
    clearNavCloseTimer();
    if (navPinnedRef.current) return;
    navCloseTimer.current = setTimeout(() => {
      navCloseTimer.current = null;
      if (!navPinnedRef.current) applyNavState(null, false);
    }, 180);
  }, [applyNavState, clearNavCloseTimer]);

  const toggleNav = useCallback((key: NavKey, trigger?: HTMLButtonElement) => {
    if (trigger) activeTriggerRef.current = trigger;
    clearNavCloseTimer();
    if (activeNavRef.current === key) {
      // Clicking an open trigger: closes it if pinned, otherwise pins it.
      if (navPinnedRef.current) {
        applyNavState(null, false);
      } else {
        navPinnedRef.current = true;
      }
    } else {
      applyNavState(key, true);
    }
  }, [applyNavState, clearNavCloseTimer]);

  const closeNavAndFocusTrigger = useCallback(() => {
    clearNavCloseTimer();
    applyNavState(null, false);
    window.requestAnimationFrame(() => activeTriggerRef.current?.focus());
  }, [applyNavState, clearNavCloseTimer]);

  const handleNavBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      scheduleCloseNav();
    }
  }, [scheduleCloseNav]);

  // Keyboard entry point: moves focus from a trigger into its open panel so the
  // shared mega-menu is reachable with Tab / ArrowDown as well as the pointer.
  const focusFirstPanelItem = useCallback((key: NavKey) => {
    const panel = document.getElementById(`nav-panel-${key}`);
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>('a[href], button');
    first?.focus();
  }, []);

  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, key: NavKey) => {
      const isOpen = activeNavRef.current === key;
      const wantsPanel =
        event.key === "ArrowDown" ||
        (event.key === "Tab" && !event.shiftKey && isOpen);
      if (!wantsPanel) return;
      if (!isOpen) {
        // ArrowDown opens the menu that is not open yet, then steps inside it.
        openNav(key);
        window.requestAnimationFrame(() => focusFirstPanelItem(key));
        event.preventDefault();
        return;
      }
      event.preventDefault();
      window.requestAnimationFrame(() => focusFirstPanelItem(key));
    },
    [focusFirstPanelItem, openNav]
  );

  useEffect(() => () => clearNavCloseTimer(), [clearNavCloseTimer]);

  // Keep the mega-menu card aligned to its trigger: centred under the trigger,
  // clamped inside the viewport, width driven by the number of sections.
  useEffect(() => {
    if (!activeNav) {
      setPanelBox(null);
      return;
    }
    const item = NAV_ITEMS.find((navItem) => navItem.key === activeNav);
    if (!item) return;

    const measure = () => {
      const cols = item.sections.length;
      // Wide enough that no column has to truncate a label or wrap a heading.
      // 4-column menus carry the longest labels ("Developer Onboarding",
      // "High-Rise Developments"), so they get close to the 1,200px ceiling.
      const desired = cols >= 5 ? 1180 : cols === 4 ? 1040 : 840;
      const viewportWidth = window.innerWidth;
      const width = Math.min(desired, viewportWidth - 32);
      const headerLeft =
        document.querySelector("header")?.getBoundingClientRect().left ?? 0;
      const triggerRect = activeTriggerRef.current?.getBoundingClientRect();
      const centre = triggerRect
        ? triggerRect.left + triggerRect.width / 2
        : viewportWidth / 2;
      const left = Math.min(
        Math.max(centre - width / 2 - headerLeft, 16),
        viewportWidth - width - 16
      );
      setPanelBox({ left, width });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeNav]);

  // --- Close navigation menus on outside click or Escape ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        if (activeNavRef.current !== null) applyNavState(null, false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activeNavRef.current !== null) {
          // Returns focus to the trigger that opened the menu.
          closeNavAndFocusTrigger();
        }
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [applyNavState, closeNavAndFocusTrigger]);

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

              {/* backdrop-filter would trap the fixed drawer inside the header's
                  height, so it is disabled while the menu overlay is open.

                  The pointer boundary for the desktop mega-menu lives here, on
                  <header>, and not on <nav>: the trigger row (~36px tall) and
                  the fixed panel are both DOM descendants of the header, so the
                  pointer can travel between them — including the strip below the
                  trigger row — without ever "leaving" the interaction region.
                  The 180ms timer is only a safety grace for a real exit. */}
              <header
                className={`bg-white/95 shadow-sm sticky top-0 z-50 border-b border-gray-200/50 transition-transform duration-200 ease-out motion-reduce:transition-none ${isMobileMenuOpen ? '' : 'backdrop-blur-md'} ${stickySearchActive ? '-translate-y-full pointer-events-none' : ''}`}
                onMouseEnter={clearNavCloseTimer}
                onMouseLeave={scheduleCloseNav}
                onBlur={handleNavBlur}
              >
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
          <nav
            ref={navRef}
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-1 flex-1 justify-center"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = navReady && isNavItemActive(item, router.pathname, router.asPath);
              const isOpen = activeNav === item.key;
              return (
                <div
                  key={item.key}
                  onMouseEnter={(e) => {
                    // Record the trigger *before* opening so the panel can be
                    // measured against the right element on first paint.
                    const trigger = e.currentTarget.querySelector("button");
                    if (trigger) activeTriggerRef.current = trigger;
                    openNav(item.key);
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls={`nav-panel-${item.key}`}
                    onMouseEnter={(e) => { activeTriggerRef.current = e.currentTarget; }}
                    onFocus={(e) => { activeTriggerRef.current = e.currentTarget; }}
                    onClick={(e) => toggleNav(item.key, e.currentTarget)}
                    onKeyDown={(e) => handleTriggerKeyDown(e, item.key)}
                    className={cx(
                      "flex items-center gap-1.5 lg:px-2.5 xl:px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50",
                      isActive
                        ? "text-[#029bba] bg-[#029bba]/8"
                        : "text-gray-700 hover:text-[#029bba] hover:bg-gray-50"
                    )}
                  >
                    {item.label}
                    <icons.ChevronDown
                      className={cx(
                        "w-4 h-4 transition-transform",
                        isOpen ? "rotate-180 text-[#029bba]" : "text-gray-400"
                      )}
                    />
                  </button>
                </div>
              );
            })}

            {/* The pointer boundary for these panels is the <header> element
                (see the handlers above), so no invisible bridge is needed to
                carry the pointer across the strip under the trigger row. */}
            {(() => {
              const activeItem = NAV_ITEMS.find((navItem) => navItem.key === activeNav);
              if (!activeItem || !panelBox) return null;
              const colCount = activeItem.sections.length;
              // Equal columns: every section is a short, single-column list, so
              // no column needs extra width (city names sit in one column).
              const gridTemplate = `repeat(${colCount}, minmax(0, 1fr))`;
              return (
                <div
                  className="absolute top-full z-50"
                  style={{ left: panelBox.left, width: panelBox.width }}
                  onMouseEnter={clearNavCloseTimer}
                >
                  {/* pt-2 is part of the card's own hover surface: it covers the
                      gap between the header and the card so a slow pointer
                      crossing it never leaves the interaction region. */}
                  <div className="pt-2">
                    <div
                      id={`nav-panel-${activeItem.key}`}
                      role="menu"
                      aria-label={activeItem.label}
                      className="nav-panel-enter overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_30px_70px_-24px_rgba(0,64,99,0.45)] ring-1 ring-black/[0.02]"
                      onClick={(event) => {
                        // Any link inside the panel closes the menu once clicked;
                        // Navigation itself is handled by <Link> in the same event.
                        if ((event.target as HTMLElement).closest("a")) {
                          applyNavState(null, false);
                        }
                      }}
                    >
                      <div className="h-[3px] w-full bg-gradient-to-r from-[#004063] via-[#029bba] to-[#004063]" />

                      <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-3.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#004063] text-white">
                            {activeItem.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                              Browse
                            </p>
                            <p className="truncate text-[13.5px] font-bold leading-tight text-[#001f2b]">
                              {activeItem.label}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={activeItem.href}
                          className="group flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#007196] transition-colors hover:border-[#029bba] hover:bg-[#029bba]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                        >
                          View all
                          <icons.ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                        </Link>
                      </div>

                      <div
                        className={cx(
                          "grid gap-x-5 gap-y-6 p-6",
                          // Tall menus (Buy at short desktop heights) scroll
                          // inside the card instead of running off screen.
                          "max-h-[calc(100vh-7.5rem)] overflow-y-auto overscroll-contain"
                        )}
                        style={{ gridTemplateColumns: gridTemplate }}
                      >
                        {activeItem.sections.map((section, sectionIndex, arr) => (
                          <div
                            key={`${activeItem.key}-${section.title}`}
                            className={cx(
                              "min-w-0 px-3",
                              // Hairline column rules read cleaner than boxes and
                              // keep the panel from looking like a grid of cards.
                              sectionIndex > 0 && "border-l border-slate-100"
                            )}
                          >
                            <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                              <span className="h-px w-3 bg-[#029bba]/60" aria-hidden="true" />
                              {section.title}
                            </p>

                            {section.kind === "cities" ? (
                              <>
                                <ul className="space-y-0.5">
                                  {section.cities.map((cityName) => (
                                    <li key={`${activeItem.key}-city-${cityName}`}>
                                      <Link
                                        href={`${section.base}${section.base.includes("?") ? "&" : "?"}city=${encodeURIComponent(cityName)}`}
                                        className="flex items-center gap-2 rounded-lg px-2 py-[7px] text-[13px] font-semibold text-slate-700 transition-colors hover:bg-[#029bba]/[0.07] hover:text-[#004063] focus-visible:bg-[#029bba]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                                      >
                                        <icons.MapPin className="h-3.5 w-3.5 shrink-0 text-[#029bba]" />
                                        <span className="truncate">{cityName}</span>
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                                <Link
                                  href={section.viewAllHref}
                                  className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-dashed border-slate-200 px-2 py-2 text-[12px] font-bold text-[#007196] transition-colors hover:border-[#029bba] hover:bg-[#029bba]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                                >
                                  Explore all cities
                                  <icons.ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              </>
                            ) : (
                              <ul className="space-y-0.5">
                                {section.links.map((link) => (
                                  <li key={`${activeItem.key}-${section.title}-${link.href}`}>
                                    <Link
                                      href={link.href}
                                      className="flex items-center rounded-lg px-2 py-[7px] text-[13px] font-medium text-slate-600 transition-colors hover:bg-[#029bba]/[0.07] hover:text-[#004063] focus-visible:bg-[#029bba]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                                    >
                                      <span className="truncate">{link.label}</span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
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
              onClick={handleCompareClick}
              aria-label={`Compare${compareCount > 0 ? ` (${compareCount} items)` : ''}`}
              className={cx(
                "hidden xl:flex relative items-center justify-center",
                "w-11 h-11 rounded-xl transition-all group",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/compare" || router.pathname.startsWith("/compare/")
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <icons.BarChart3
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

            {/* SAVED PROPERTIES BUTTON -- Heart + Counter (Desktop) */}
            <Link
              href="/saved-properties"
              onClick={handleShortlistClick}
              aria-label={`Saved Properties${favoritesCount > 0 ? ` (${favoritesCount} saved)` : ''}`}
              className={cx(
                "hidden xl:flex relative items-center justify-center",
                "w-11 h-11 rounded-xl transition-all group",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/saved-properties"
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <icons.Heart
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/saved-properties"
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
                  <div className="relative hidden xl:block">
                    <Button
                      type="button"
                      size="sm"
                      className="flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white font-semibold rounded-xl px-5 shadow-lg hover:shadow-xl transition-all"
                      onClick={() => setIsAddListingOpen(!isAddListingOpen)}
                    >
                      <icons.Plus className="w-4 h-4" />
                      Add Listing
                      <icons.ChevronDown className={cx("w-4 h-4 transition-transform", isAddListingOpen && "rotate-180")} />
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
                              <icons.Home className="w-5 h-5 text-[#029bba]" />
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
                              <icons.Building2 className="w-5 h-5 text-[#029bba]" />
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
                  !isAdmin && (
                    isDeveloper ? (
                      <Button
                        type="button"
                        size="sm"
                        className="hidden xl:flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white text-sm font-semibold rounded-xl px-4 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                        onClick={() => router.push("/developer/projects/new")}
                      >
                        <icons.Building2 className="w-4 h-4" />
                        Add Project
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="hidden xl:flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white text-sm font-semibold rounded-xl px-4 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                        onClick={() => router.push("/add-property")}
                      >
                        <icons.Plus className="w-4 h-4" />
                        List Property
                      </Button>
                    )
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
                  className="hidden xl:flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white text-sm font-semibold rounded-xl px-4 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setLoginContext("listing");
                    setIsLoginModalOpen(true);
                  }}
                >
                  <icons.Plus className="w-4 h-4" />
                  List Property
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden xl:flex items-center gap-2 text-[15px] text-gray-700 hover:text-[#029bba] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  <icons.User className="w-4 h-4" />
                  Login
                </Button>
              </>
            )}

            {/* LOGGED IN: PROFILE DROPDOWN */}
            {isLoggedIn && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#029bba] hidden sm:block text-sm">
                  {displayName}
                </span>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:text-[#029bba] hover:bg-gray-50 transition-all border-2 border-transparent hover:border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50"
                      aria-label="User menu"
                    >
                      <icons.UserCircle className="w-5 h-5" />
                      <icons.ChevronDown className="w-4 h-4 text-gray-400" />
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

                    {/* ADMIN MENU */}
                    {isAdmin && (
                      <>
                        <SectionHeader label="Admin Workspace" color="text-amber-600" />
                        <MenuItem
                          href="/admin"
                          icon={<icons.Shield />}
                          label="Admin Dashboard"
                          iconColor="text-amber-500"
                          hoverColor="group-hover:text-amber-600"
                        />

                        <SectionHeader label="Manage Listings" color="text-amber-600" />
                        <MenuItem href="/admin/properties" icon={<icons.Home />} label="Manage Properties" />
                        <MenuItem href="/admin/projects"   icon={<icons.Building />} label="Manage Projects" />
                        <MenuItem href="/admin/societies"  icon={<icons.Building2 />} label="Manage Societies" />

                        <SectionHeader label="Manage Users" color="text-amber-600" />
                        <MenuItem href="/admin/developers" icon={<icons.Building2 />} label="Manage Developers" />
                        <MenuItem href="/admin/agents"     icon={<icons.Users />} label="Manage Agents" />
                        <MenuItem href="/admin/users"      icon={<icons.UserCircle />} label="Manage Users" />

                        <SectionHeader label="Verifications" color="text-amber-600" />
                        <MenuItem href="/admin/owners"     icon={<icons.ShieldCheck />} label="Verified Owners" />


                        <SectionHeader label="CRM & AI" color="text-amber-600" />
                        <MenuItem href="/admin/leads"  icon={<icons.MessageSquare />} label="Manage Leads" />
                        <MenuItem
                          href="/admin/aleem"
                          icon={<icons.Bot />}
                          label="Aleem AI"
                          description="Conversations + analytics"
                          badge={{ text: "AI", color: "#029bba" }}
                        />

                        <SectionHeader label="Content & Reports" color="text-amber-600" />
                        <MenuItem href="/admin/blogs"     icon={<icons.FileText />} label="Blog Manager" />
                        <MenuItem href="/admin/analytics" icon={<icons.BarChart3 />} label="Analytics" />
                        <MenuItem href="/admin/campaigns" icon={<icons.Megaphone />} label="Campaigns" />
                        <MenuItem href="/admin/settings"  icon={<icons.Settings />} label="Admin Settings" />
                      </>
                    )}

                    {/* VERIFIED OWNER MENU */}
                    {isVerifiedOwner && !isAdmin && !isAgent && !isDeveloper && (
                      <>
                        <SectionHeader label="Owner Portal" color="#059669" />
                        <MenuItem
                          href="/owner/dashboard"
                          icon={<icons.LayoutDashboard />}
                          label="Owner Dashboard"
                          iconColor="text-emerald-400"
                          hoverColor="group-hover:text-emerald-600"
                        />
                        <MenuItem
                          href="/owner/listings"
                          icon={<icons.Home />}
                          label="My Listings"
                          iconColor="text-emerald-400"
                          hoverColor="group-hover:text-emerald-600"
                        />
                        <MenuItem
                          href="/owner/leads"
                          icon={<icons.MessageSquare />}
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
                          icon={<icons.Clock />}
                          label="Verification Pending"
                          description="Usually 24-48 hours"
                          badge={{ text: "Under Review", color: "#d97706" }}
                          iconColor="text-amber-400"
                          hoverColor="group-hover:text-amber-600"
                        />
                      </>
                    )}

                    {/* AGENT MENU */}
                    {isAgent && (
                      <>
                        <SectionHeader label="Agent Workspace" color="text-orange-600" />
                        <MenuItem
                          href="/agent/dashboard"
                          icon={<icons.LayoutDashboard />}
                          label="Agent Dashboard"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />
                        <MenuItem
                          href="/agent/listings"
                          icon={<icons.Home />}
                          label="My Listings"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />
                        <MenuItem
                          href="/agent/leads"
                          icon={<icons.MessageSquare />}
                          label="My Leads"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />

                        <SectionHeader label="Profile" color="text-orange-600" />
                        <MenuItem
                          href="/agent/profile"
                          icon={<icons.UserCircle />}
                          label="Agent Profile"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />
                        <MenuItem
                          href="/add-property"
                          icon={<icons.Plus />}
                          label="Add New Property"
                          iconColor="text-orange-400"
                          hoverColor="group-hover:text-orange-600"
                        />
                      </>
                    )}

                    {/* DEVELOPER MENU */}
                    {isDeveloper && !isAdmin && !isAgent && (
                      <>
                        <SectionHeader label="Developer Workspace" color={PRIMARY_COLOR} />
                        <MenuItem
                          href="/developer/dashboard"
                          icon={<icons.LayoutDashboard />}
                          label="Developer Dashboard"
                          badge={
                            developerProfile?.status === "pending"
                              ? { text: "Pending", color: "#d97706" }
                              : developerProfile?.status === "rejected"
                              ? { text: "Rejected", color: "#dc2626" }
                              : undefined
                          }
                        />
                        <MenuItem href="/developer/projects" icon={<icons.Building />} label="My Projects" />
                        {isDevApproved && (
                          <MenuItem href="/developer/projects/new" icon={<icons.FolderPlus />} label="Add New Project" />
                        )}
                        <MenuItem href="/developer/leads"     icon={<icons.MessageSquare />} label="My Leads" />
                        <MenuItem href="/developer/analytics" icon={<icons.TrendingUp />} label="Analytics" />

                        <SectionHeader label="Company" color={PRIMARY_COLOR} />
                        <MenuItem href="/developer/profile" icon={<icons.Settings />} label="Company Profile" />
                      </>
                    )}

                    {/* REGULAR USER MENU */}
                    {!isAdmin && !isAgent && !isDeveloper && (
                      <>
                        <SectionHeader label="My Account" />
                        <MenuItem href="/dashboard"        icon={<icons.LayoutDashboard />} label="My Dashboard" />
                        <MenuItem href="/profile"          icon={<icons.UserCircle />} label="My Profile" />
                        <MenuItem href="/my-properties"    icon={<icons.Home />} label="My Properties" />
                        <MenuItem href="/saved-properties" icon={<icons.Heart />} label="Saved Properties" />

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
                            <icons.ShieldCheck className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">List My Property</p>
                              <p className="text-[11px] opacity-80">CNIC verified owner listing</p>
                            </div>
                            <icons.ArrowRight className="w-4 h-4 flex-shrink-0" />
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
                            <icons.Users className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">Become an Agent</p>
                              <p className="text-[11px] opacity-80">List properties professionally</p>
                            </div>
                            <icons.ArrowRight className="w-4 h-4 flex-shrink-0" />
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
                            <icons.Building2 className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">Become a Developer</p>
                              <p className="text-[11px] opacity-80">Create verified projects</p>
                            </div>
                            <icons.ArrowRight className="w-4 h-4 flex-shrink-0" />
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
                            <icons.Building className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold">Register Society</p>
                              <p className="text-[11px] opacity-80">Manage plots & blocks</p>
                            </div>
                            <icons.ArrowRight className="w-4 h-4 flex-shrink-0" />
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
                            <icons.Wrench className="w-4 h-4 flex-shrink-0" />
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
                            <icons.HardHat className="w-4 h-4 flex-shrink-0" />
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

                    {/* LOGOUT (all roles) */}
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
                      <icons.LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Log Out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
            )}

            {/* MOBILE COMPARE BUTTON */}
            <Link
              href="/compare"
              onClick={handleCompareClick}
              aria-label={`Compare${compareCount > 0 ? ` (${compareCount} items)` : ''}`}
              className={cx(
                "lg:hidden relative flex items-center justify-center",
                "w-10 h-10 rounded-xl transition-colors",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/compare" || router.pathname.startsWith("/compare/")
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <icons.BarChart3
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

            {/* MOBILE SAVED PROPERTIES BUTTON */}
            <Link
              href="/saved-properties"
              onClick={handleShortlistClick}
              aria-label={`Saved Properties${favoritesCount > 0 ? ` (${favoritesCount} saved)` : ''}`}
              className={cx(
                "lg:hidden relative flex items-center justify-center",
                "w-10 h-10 rounded-xl transition-colors",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/saved-properties"
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <icons.Heart
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/saved-properties"
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
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen
                ? <icons.X className="w-6 h-6 text-gray-700" />
                : <icons.Menu className="w-6 h-6 text-gray-700" />}
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
                    <icons.X className="w-6 h-6" />
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

﻿              {/* Public navigation links */}
              <nav className="px-4 py-4" role="navigation">
                <div className="space-y-1">
                  {NAV_ITEMS.filter((item) => item.key !== "more").map((item) => {
                    const isActive = navReady && isNavItemActive(item, router.pathname, router.asPath);
                    return (
                      <div key={item.key}>
                        <Link
                          href={item.href}
                          className={cx(
                            "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all min-h-[44px]",
                            isActive
                              ? "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]"
                              : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                          )}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span className={isActive ? "text-[#029bba]" : "text-gray-400"}>{item.icon}</span>
                          {item.label}
                          <icons.ArrowRight className="w-4 h-4 ml-auto text-gray-300" />
                        </Link>
                        {item.cityArea && navCities.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-0.5">
                            {navCities.map((cityName) => (
                              <Link
                                key={`mobile-city-${item.key}-${cityName}`}
                                href={`${item.cityArea!.base}?city=${encodeURIComponent(cityName)}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-[#029bba]/60 hover:text-[#029bba] min-h-[28px]"
                              >
                                <icons.MapPin className="w-3 h-3 text-[#029bba]" />
                                {cityName}
                              </Link>
                            ))}
                            <Link
                              href="/cities"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[#029bba] min-h-[28px]"
                            >
                              View All
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* More expandable */}
                  <div>
                    <button
                      type="button"
                      aria-expanded={isMobileMoreExpanded}
                      aria-controls="mobile-more-panel"
                      onClick={() => setIsMobileMoreExpanded((current) => !current)}
                      className={cx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-semibold transition-all min-h-[44px]",
                        navReady && isNavItemActive(NAV_ITEMS[NAV_ITEMS.length - 1], router.pathname, router.asPath)
                          ? "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]"
                          : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <icons.Sparkles className="w-5 h-5" />
                        More
                      </div>
                      <icons.ChevronDown className={cx("w-4 h-4 transition-transform", isMobileMoreExpanded && "rotate-180")} />
                    </button>
                    <div
                      id="mobile-more-panel"
                      className={cx(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        isMobileMoreExpanded ? "max-h-[720px] opacity-100 mt-1" : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="ml-4 space-y-4 pl-3 border-l-2 border-[#029bba]/20">
                        {NAV_ITEMS[NAV_ITEMS.length - 1].sections
                          .filter((section) => section.kind === "links")
                          .map((section) => (
                          <div key={section.title}>
                            <p className="px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                              {section.title}
                            </p>
                            <div className="space-y-0.5">
                              {(section.kind === "links" ? section.links : []).map((link) => (
                                <Link
                                  key={`mobile-more-${section.title}-${link.href}`}
                                  href={link.href}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#029bba]/5 hover:text-[#029bba] transition-all"
                                >
                                  {link.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* LOGGED IN: ROLE-AWARE MOBILE MENU */}
                {isLoggedIn && (
                  <>
                    {!isAdmin && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <div className="space-y-1">
                          {isDevApproved ? (
                            <>
                              <MobileLink href="/add-property" icon={<icons.Plus />} label="Add Property"
                                onClick={() => setIsMobileMenuOpen(false)} variant="primary" />
                              <MobileLink href="/developer/projects/new" icon={<icons.Building2 />} label="Add Project"
                                onClick={() => setIsMobileMenuOpen(false)} variant="soft" />
                            </>
                          ) : (
                            <MobileLink href="/add-property" icon={<icons.Plus />} label="List Your Property"
                              onClick={() => setIsMobileMenuOpen(false)} variant="primary" />
                          )}
                        </div>
                      </>
                    )}

                    {/* ADMIN MOBILE */}
                    {isAdmin && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <MobileSectionHeader label="Admin Workspace" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin" icon={<icons.Shield />} label="Admin Dashboard"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin"} />
                        </div>

                        <MobileSectionHeader label="Manage Listings" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin/properties" icon={<icons.Home />} label="Manage Properties"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/properties"} />
                          <MobileLink href="/admin/projects" icon={<icons.Building />} label="Manage Projects"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/projects"} />
                          <MobileLink href="/admin/societies" icon={<icons.Building2 />} label="Manage Societies"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/societies"} />
                        </div>

                        <MobileSectionHeader label="Manage Users" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin/developers" icon={<icons.Building2 />} label="Manage Developers"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/developers"} />
                          <MobileLink href="/admin/agents" icon={<icons.Users />} label="Manage Agents"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/agents"} />
                          <MobileLink href="/admin/users" icon={<icons.UserCircle />} label="Manage Users"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/users"} />
                        </div>

                        <MobileSectionHeader label="CRM & AI" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin/leads" icon={<icons.MessageSquare />} label="Manage Leads"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/leads"} />
                          <MobileLink href="/admin/aleem" icon={<icons.Bot />} label="Aleem AI"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname.startsWith("/admin/aleem")} />
                        </div>

                        <MobileSectionHeader label="Content & Reports" color="#d97706" />
                        <div className="space-y-1">
                          <MobileLink href="/admin/blogs" icon={<icons.FileText />} label="Blog Manager"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname.startsWith("/admin/blogs")} />
                          <MobileLink href="/admin/analytics" icon={<icons.BarChart3 />} label="Analytics"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/analytics"} />
                          <MobileLink href="/admin/campaigns" icon={<icons.Megaphone />} label="Campaigns"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname.startsWith("/admin/campaigns")} />
                          <MobileLink href="/admin/settings" icon={<icons.Settings />} label="Admin Settings"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/admin/settings"} />
                        </div>
                      </>
                    )}

                    {/* AGENT MOBILE */}
                    {isAgent && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <MobileSectionHeader label="Agent Workspace" color="#ea580c" />
                        <div className="space-y-1">
                          <MobileLink href="/agent/dashboard" icon={<icons.LayoutDashboard />} label="Agent Dashboard"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/agent/dashboard"} />
                          <MobileLink href="/agent/listings" icon={<icons.Home />} label="My Listings"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/agent/listings"} />
                          <MobileLink href="/agent/leads" icon={<icons.MessageSquare />} label="My Leads"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/agent/leads"} />
                          <MobileLink href="/agent/profile" icon={<icons.UserCircle />} label="Agent Profile"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/agent/profile"} />
                        </div>
                      </>
                    )}

                    {/* DEVELOPER MOBILE */}
                    {isDeveloper && !isAdmin && !isAgent && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <MobileSectionHeader label="Developer Workspace" color={PRIMARY_COLOR} />
                        <div className="space-y-1">
                          <MobileLink href="/developer/dashboard" icon={<icons.LayoutDashboard />} label="Developer Dashboard"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/dashboard"} />
                          <MobileLink href="/developer/projects" icon={<icons.Building />} label="My Projects"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname.startsWith("/developer/projects")} />
                          {isDevApproved && (
                            <MobileLink href="/developer/projects/new" icon={<icons.FolderPlus />} label="Add New Project"
                              onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/projects/new"} />
                          )}
                          <MobileLink href="/developer/leads" icon={<icons.MessageSquare />} label="My Leads"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/leads"} />
                          <MobileLink href="/developer/analytics" icon={<icons.TrendingUp />} label="Analytics"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/analytics"} />
                          <MobileLink href="/developer/profile" icon={<icons.Settings />} label="Company Profile"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/developer/profile"} />
                        </div>
                      </>
                    )}

                    {/* USER MOBILE */}
                    {!isAdmin && !isAgent && !isDeveloper && (
                      <>
                        <div className="my-4 border-t-2 border-gray-100" />
                        <MobileSectionHeader label="My Account" color="#6b7280" />
                        <div className="space-y-1">
                          <MobileLink href="/dashboard" icon={<icons.LayoutDashboard />} label="My Dashboard"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/dashboard"} />
                          <MobileLink href="/profile" icon={<icons.UserCircle />} label="My Profile"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/profile"} />
                          <MobileLink href="/my-properties" icon={<icons.Home />} label="My Properties"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/my-properties"} />
                          <MobileLink href="/saved-properties" icon={<icons.Heart />} label="Saved Properties"
                            onClick={() => setIsMobileMenuOpen(false)} active={router.pathname === "/saved-properties"} />
                        </div>

                        <MobileSectionHeader label="Upgrade Account" color={PRIMARY_COLOR} />
                        <div className="space-y-1">
                          <Link
                            href="/onboarding/business"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 transition-all min-h-[44px]"
                          >
                            <icons.Users className="w-5 h-5" />
                            <span className="flex-1">Become an Agent</span>
                            <icons.ArrowRight className="w-4 h-4" />
                          </Link>
                          <Link
                            href="/onboarding/developer"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba] transition-all min-h-[44px]"
                          >
                            <icons.Building2 className="w-5 h-5" />
                            <span className="flex-1">Become a Developer</span>
                            <icons.ArrowRight className="w-4 h-4" />
                          </Link>
                          <Link
                            href="/onboarding/society"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 transition-all min-h-[44px]"
                          >
                            <icons.Building className="w-5 h-5" />
                            <span className="flex-1">Register Society</span>
                            <icons.ArrowRight className="w-4 h-4" />
                          </Link>
                          <Link
                            href="/coming-soon?feature=provider"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 transition-all min-h-[44px]"
                          >
                            <icons.Wrench className="w-5 h-5" />
                            <span className="flex-1">Service Provider</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Soon</span>
                          </Link>
                          <Link
                            href="/coming-soon?feature=labour"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 transition-all min-h-[44px]"
                          >
                            <icons.HardHat className="w-5 h-5" />
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
                      <icons.LogOut className="w-5 h-5" />
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
                      <icons.User className="w-5 h-5" />
                      Login / Sign Up
                    </button>
                    <button
                      className="flex items-center justify-center gap-3 w-full px-4 py-3.5 mt-2 bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba] rounded-xl text-[15px] font-semibold transition-all min-h-[44px]"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsLoginModalOpen(true);
                      }}
                    >
                      <icons.Plus className="w-5 h-5" />
                      List Your Property
                    </button>
                  </>
                )}
              </nav>

              {/* Footer */}
              <div className="px-6 py-4 mt-4 border-t-2 border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  (c) {new Date().getFullYear()} Highrise.pk
                </p>
                <p className="text-xs text-gray-400 text-center mt-1">
                  Pakistan&apos;s Trusted Property Platform
                </p>
              </div>
            </div>
          </>
        )}
      </header>

      {/* LOGIN MODAL (Upgraded to In-Place AuthGateModal) */}
      <AuthGateModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        actionDescription={
          loginContext === "listing" ? "list your property" :
          loginContext === "save" ? "save this property" :
          loginContext === "compare" ? "compare projects" :
          loginContext === "save_search" ? "save search alerts" :
          "access your account"
        }
        title={
          loginContext === "listing" ? "List Your Property" :
          loginContext === "save" ? "Save Property" :
          loginContext === "compare" ? "Compare Projects" :
          loginContext === "save_search" ? "Save Search Alerts" :
          "Welcome Back"
        }
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎨 TOOL MENU ITEM (Desktop Tools Dropdown)
// ═══════════════════════════════════════════════════════════════

export default Header;