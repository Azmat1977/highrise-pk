/**
 * components/layout/header/navConfig.tsx
 *
 * Primary navigation data for the global header, the mobile drawer and the
 * compact sticky search header. Pure data plus one pure predicate: no state,
 * no hooks, no fetching.
 */

import React from "react";
import { icons } from "@/lib/design-system/icons";
import { MEGA_MENU_CITIES } from "@/lib/pakistanCities";

// ============================================================
// TYPES
// ============================================================

export type NavKey = "buy" | "rent" | "projects" | "developers" | "societies" | "agents" | "more";

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface NavLinksSection {
  kind: "links";
  title: string;
  links: NavLinkItem[];
}

export interface NavCitiesSection {
  kind: "cities";
  title: string;
  base: string;
  cities: string[];
  viewAllHref: string;
}

export type NavSection = NavLinksSection | NavCitiesSection;

export interface NavItem {
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

// ============================================================
// LINK BASES AND CITY SHORTCUTS
// ============================================================

export const BUY_BASE = "/properties?listingType=full_payment";
export const RENT_BASE = "/properties?listingType=rent";

// Header city shortcuts come from one shared list so every mega menu, the
// mobile drawer and any future nav surface stay in sync.
export const MENU_CITIES = MEGA_MENU_CITIES;

// ============================================================
// PRIMARY NAVIGATION CONFIG
// ============================================================

export const NAV_ITEMS: NavItem[] = [
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

export function isNavItemActive(item: NavItem, pathname: string, asPath: string): boolean {
  if (item.key === "buy") return asPath.startsWith("/properties") && /listingType=full_payment/.test(asPath);
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