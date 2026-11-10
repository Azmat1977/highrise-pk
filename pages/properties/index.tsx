// File: pages/properties/index.tsx
// Highrise.pk - Public Property Search & Discovery Directory
// Design System Locked: tokens from @/lib/design-system/tokens | icons from @/lib/design-system/icons
// Layout Sync: Mirrors pages/projects/index.tsx (No hero, compact sticky search, 1440px wrapper)
import SectionHeading from "@/components/ui/SectionHeading";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Grid3x3, List } from "lucide-react";
import { icons } from "@/lib/design-system/icons";
import { PageSearchShell } from "@/components/search/PageSearchShell";
import type { SearchField } from "@/components/search/UnifiedSearchBar";

import { PropertyGrid, PropertyListItem } from "@/components/property/property-grid";
import { PropertyCard } from "@/components/property/property-card";
import { RecentlyViewed } from "@/components/recently-viewed";
import RecommendedSellers from "@/components/property/RecommendedSellers";
import ContextualArticles from "@/components/blog/ContextualArticles";
import { normalizePropertiesList } from "@/lib/property/property";
import { PropertyGridSkeleton } from "@/components/skeletons/PropertyGridSkeleton";
import AuthGateModal from "@/components/auth/AuthGateModal";
import { useSession } from "next-auth/react";
import { PAKISTAN_CITIES as CANONICAL_CITIES } from "@/lib/pakistanCities";
import { hasAd } from "@/lib/ads/inventory";
import AdSlot from "@/components/ads/AdSlot";
import { getPageSeoContent } from "@/lib/seo/pageContent";
import PageSeoContent from "@/components/seo/PageSeoContent";

// ============================================================================
// TYPES
// ============================================================================

interface FilterState {
  search: string;
  city: string;
  society: string;
  propertyCategory: string;
  propertyType: string;
  listingType: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  sort: string;
  listingSource: string;
  verifiedOnly: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface PropertiesApiResponse {
  success?: boolean;
  properties?: PropertyListItem[];
  pagination?: PaginationInfo;
}

type FilterKey = keyof FilterState;

// ============================================================================
// CONSTANTS
// ============================================================================

// Canonical city source — the /cities directory, mega-menus and this page
// all agree on the same names.
const PAKISTAN_CITIES: string[] = CANONICAL_CITIES;

const PROPERTY_CATEGORIES: Record<
  string,
  {
    label: string;
    types: string[];
    icon: React.ReactElement;
  }
> = {
  residential: {
    label: "Residential",
    icon: <icons.Home className="w-4 h-4" />,
    types: [
      "House", "Apartment", "Upper Portion", "Lower Portion",
      "Farm House", "Room", "Penthouse", "Villa",
    ],
  },
  commercial: {
    label: "Commercial",
    icon: <icons.Building2 className="w-4 h-4" />,
    types: ["Office", "Shop", "Warehouse", "Factory", "Building", "Plaza"],
  },
  plots: {
    label: "Plots",
    icon: <icons.Maximize className="w-4 h-4" />,
    types: [
      "Residential Plot", "Commercial Plot", "Agricultural Land",
      "Industrial Land", "Plot File",
    ],
  },
};

const ALL_PROPERTY_TYPES: { value: string; label: string; category?: string }[] = [
  { value: "",                  label: "All Types"          },
  { value: "House",             label: "House",             category: "residential" },
  { value: "Apartment",         label: "Apartment",         category: "residential" },
  { value: "Upper Portion",     label: "Upper Portion",     category: "residential" },
  { value: "Lower Portion",     label: "Lower Portion",     category: "residential" },
  { value: "Farm House",        label: "Farm House",        category: "residential" },
  { value: "Room",              label: "Room",              category: "residential" },
  { value: "Penthouse",         label: "Penthouse",         category: "residential" },
  { value: "Villa",             label: "Villa",             category: "residential" },
  { value: "Office",            label: "Office",            category: "commercial"  },
  { value: "Shop",              label: "Shop",              category: "commercial"  },
  { value: "Warehouse",         label: "Warehouse",         category: "commercial"  },
  { value: "Factory",           label: "Factory",           category: "commercial"  },
  { value: "Building",          label: "Building",          category: "commercial"  },
  { value: "Plaza",             label: "Plaza",             category: "commercial"  },
  { value: "Residential Plot",  label: "Residential Plot",  category: "plots"       },
  { value: "Commercial Plot",   label: "Commercial Plot",   category: "plots"       },
  { value: "Agricultural Land", label: "Agricultural Land", category: "plots"       },
  { value: "Industrial Land",   label: "Industrial Land",   category: "plots"       },
  { value: "Plot File",         label: "Plot File",         category: "plots"       },
];

const LISTING_TYPES = [
  { value: "",             label: "All Listings"  },
  { value: "full_payment", label: "For Sale"      },
  { value: "rent",         label: "For Rent"      },
  { value: "installment",  label: "Installments"  },
];

const PRICE_RANGES = [
  { value: "",                     label: "Any Price",        min: "",          max: ""          },
  { value: "0-5000000",            label: "Under 50 Lac",     min: "0",         max: "5000000"   },
  { value: "5000000-10000000",     label: "50 Lac - 1 Crore", min: "5000000",   max: "10000000"  },
  { value: "10000000-30000000",    label: "1 - 3 Crore",      min: "10000000",  max: "30000000"  },
  { value: "30000000-50000000",    label: "3 - 5 Crore",      min: "30000000",  max: "50000000"  },
  { value: "50000000-100000000",   label: "5 - 10 Crore",     min: "50000000",  max: "100000000" },
  { value: "100000000-999999999",  label: "10 Crore+",        min: "100000000", max: "999999999" },
];

const BEDROOM_OPTIONS = [
  { value: "",  label: "Any Beds" },
  { value: "1", label: "1 Bed"    },
  { value: "2", label: "2 Beds"   },
  { value: "3", label: "3 Beds"   },
  { value: "4", label: "4 Beds"   },
  { value: "5", label: "5+ Beds"  },
];

const SORT_OPTIONS = [
  { value: "",           label: "Newest First"        },
  { value: "price_low",  label: "Price: Low to High"  },
  { value: "price_high", label: "Price: High to Low"  },
  { value: "area_high",  label: "Area: Large to Small" },
];

const VALID_SORTS = [
  "", "price_low", "price_high", "area_high",
  "area_low", "newest", "featured",
];

const VALID_LISTING_TYPES = ["", "full_payment", "rent", "installment"];
const VALID_CATEGORIES   = ["", "residential", "commercial", "plots"];
const VALID_CONDITIONS   = ["", "new_launch", "under_construction", "near_completion", "completed", "ready_possession"];
const VALID_BEDROOMS     = ["", "1", "2", "3", "4", "5"];

const LEGACY_QUERY_KEYS = ["purpose", "type", "price_min", "price_max"] as const;

const PAGE_LIMIT = 12;
const DEFAULT_FILTERS: FilterState = {
  search: "", city: "", society: "", propertyCategory: "", propertyType: "",
  listingType: "", condition: "", minPrice: "", maxPrice: "", bedrooms: "", sort: "",
  listingSource: "", verifiedOnly: false,
};

const SEO_CANONICAL_KEYS = new Set([
  "city",
  "society",
  "propertyCategory",
  "propertyType",
  "listingType",
  "condition",
  "sort",
  "listingSource",
  "verifiedOnly",
]);

// ============================================================================
// SANITIZERS (Defense in depth)
// ============================================================================

function clampText(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function clampEnum(v: unknown, allow: readonly string[]): string {
  const s = typeof v === "string" ? v.trim() : "";
  return allow.includes(s) ? s : "";
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// Next.js query params are always strings; coerce the Verified-Only toggle
// back into a boolean so the filter state stays type-safe.
function coerceBooleanParam(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "on";
  }
  return false;
}

const PURPOSE_ALIASES: Readonly<Record<string, string>> = {
  sale: "full_payment",
  buy: "full_payment",
  full_payment: "full_payment",
  rent: "rent",
  rental: "rent",
  installment: "installment",
  installments: "installment",
};

function resolveLegacyListingType(v: unknown): string {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s ? PURPOSE_ALIASES[s] ?? "" : "";
}

function resolveLegacyPropertyType(v: unknown): string {
  const s = typeof v === "string"
    ? v.trim().toLowerCase().replace(/[\s_-]+/g, " ")
    : "";
  if (!s) return "";
  const match = ALL_PROPERTY_TYPES.find(
    (t) => t.value && t.value.toLowerCase() === s
  );
  return match ? match.value : "";
}

const ALL_TYPE_VALUES = [
  "",
  ...ALL_PROPERTY_TYPES.map((t) => t.value).filter(Boolean),
];

const CITIES_ALLOW = ["", ...PAKISTAN_CITIES];

// ============================================================================
// FETCH HELPERS
// ============================================================================

async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 12_000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const signal = init?.signal
      ? mergeSignals(init.signal, controller.signal)
      : controller.signal;
    const res = await fetch(input, { ...init, signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const onAbortA = () => controller.abort(a.reason);
  const onAbortB = () => controller.abort(b.reason);
  if (a.aborted) controller.abort(a.reason);
  if (b.aborted) controller.abort(b.reason);
  a.addEventListener("abort", onAbortA, { once: true });
  b.addEventListener("abort", onAbortB, { once: true });
  return controller.signal;
}


// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PropertiesListingPage(): React.ReactElement {
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://highrise.pk"
  ).replace(/\/+$/, "");
  const baseCanonical = `${SITE_URL}/properties`;

  // State
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // Advertising is not sold yet, so this is false and the sidebar column is
  // never rendered. Flipping it on in lib/ads/inventory.ts enables the layout.
  const hasSidebarAd = hasAd("properties.sidebar");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: PAGE_LIMIT, total: 0, pages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchAbortRef = useRef<AbortController | null>(null);
  const prevQueryRef = useRef<string>("");

  // Buy/Rent tab state (derived from filters.listingType)
  const [activeTab, setActiveTab] = useState<"buy" | "rent" | "installment" | "all">(() => {
    const lt = filters.listingType;
    if (lt === "full_payment") return "buy";
    if (lt === "rent") return "rent";
    if (lt === "installment") return "installment";
    return "all";
  });

  // Scroll listener for sticky search bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSaveSearchClick = () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
    } else {
      setToast({
        message: `Search saved successfully! We will notify you of new verified properties in ${filters.city || 'Pakistan'}.`,
        type: 'success',
      });
    }
  };

  // Canonical URL
  const canonicalUrl = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (!SEO_CANONICAL_KEYS.has(k)) return;
      if (typeof v === "string" && v) params.set(k, v);
    });
    const qs = params.toString();
    return qs ? `${baseCanonical}?${qs}` : baseCanonical;
  }, [filters, baseCanonical]);

  const hasActiveFilters = useMemo(() => {
    const { sort, ...rest } = filters;
    void sort;
    return Object.values(rest).some(Boolean);
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    const { sort, ...rest } = filters;
    void sort;
    return Object.values(rest).filter(Boolean).length;
  }, [filters]);

  const promotedProperties = useMemo(() => {
    return properties.filter((p) => p.isPromoted);
  }, [properties]);

  const getPropertyTypesForQuery = useCallback((): string[] => {
    if (filters.propertyType) return [filters.propertyType];
    return [];
  }, [filters.propertyType]);

  const getFilteredPropertyTypes = useCallback(() => {
    if (filters.propertyCategory && PROPERTY_CATEGORIES[filters.propertyCategory]) {
      const cat = PROPERTY_CATEGORIES[filters.propertyCategory];
      return [
        { value: "", label: `All ${cat.label}` },
        ...cat.types.map((t) => ({ value: t, label: t })),
      ];
    }
    return ALL_PROPERTY_TYPES;
  }, [filters.propertyCategory]);

  const updateURL = useCallback(
    (next: FilterState, page = 1) => {
      const params = new URLSearchParams();

      const safe: FilterState = {
        search: clampText(next.search, 80),
        city: clampEnum(next.city, CITIES_ALLOW),
        society: clampText(next.society, 80),
        propertyCategory: clampEnum(next.propertyCategory, VALID_CATEGORIES),
        propertyType: clampEnum(next.propertyType, ALL_TYPE_VALUES),
        listingType: clampEnum(next.listingType, VALID_LISTING_TYPES),
        condition: clampEnum(next.condition, VALID_CONDITIONS),
        minPrice: clampText(String(next.minPrice).replace(/[^\d]/g, ""), 12),
        maxPrice: clampText(String(next.maxPrice).replace(/[^\d]/g, ""), 12),
        bedrooms: clampEnum(next.bedrooms, VALID_BEDROOMS),
        sort: clampEnum(next.sort, VALID_SORTS),
        listingSource: clampEnum(next.listingSource, ["", "owner", "agent"]),
        verifiedOnly: Boolean(next.verifiedOnly),
      };

      Object.entries(safe).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      if (page > 1) params.set("page", String(page));

      const qs = params.toString();
      router.replace(qs ? `/properties?${qs}` : "/properties", undefined, {
        shallow: true,
      });
    },
    [router]
  );

  // Initialize filters from URL on mount and on router.query changes
  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query;
    const queryString = JSON.stringify(q);
    
    // Skip if query hasn't actually changed (prevents loops)
    if (prevQueryRef.current === queryString) return;
    prevQueryRef.current = queryString;

    const safeFilters: FilterState = {
      search: clampText(q.search, 80),
      city: clampEnum(q.city, CITIES_ALLOW),
      society: clampText(q.society, 80),
      propertyCategory: clampEnum(q.propertyCategory, VALID_CATEGORIES),
      propertyType:
        clampEnum(q.propertyType, ALL_TYPE_VALUES) ||
        clampEnum(q.propertyTypes, ALL_TYPE_VALUES) ||
        resolveLegacyPropertyType(q.type),
      listingType:
        clampEnum(q.listingType, VALID_LISTING_TYPES) ||
        resolveLegacyListingType(q.purpose),
      condition: clampEnum(q.condition, VALID_CONDITIONS),
      minPrice:
        clampText(String(q.minPrice ?? "").replace(/[^\d]/g, ""), 12) ||
        clampText(String(q.price_min ?? "").replace(/[^\d]/g, ""), 12),
      maxPrice:
        clampText(String(q.maxPrice ?? "").replace(/[^\d]/g, ""), 12) ||
        clampText(String(q.price_max ?? "").replace(/[^\d]/g, ""), 12),
      bedrooms: clampEnum(q.bedrooms, VALID_BEDROOMS),
      sort: clampEnum(q.sort, VALID_SORTS),
      listingSource: clampEnum(q.listingSource, ["", "owner", "agent"]),
      verifiedOnly: coerceBooleanParam(q.verifiedOnly),
    };

    setFilters(safeFilters);
    setSearchDraft(safeFilters.search);

    // Sync activeTab with listingType from URL
    const lt = safeFilters.listingType;
    if (lt === "full_payment") setActiveTab("buy");
    else if (lt === "rent") setActiveTab("rent");
    else if (lt === "installment") setActiveTab("installment");
    else setActiveTab("all");

    const pageParam = clampInt(q.page, 1, 500);
    setCurrentPage(pageParam);

    if (LEGACY_QUERY_KEYS.some((k) => k in q)) {
      updateURL(safeFilters, pageParam);
    }
  }, [router.isReady, router.query, updateURL]);

  // Tab change handler - maps tab to listingType and updates URL
  const handleTabChange = useCallback((tab: "buy" | "rent" | "installment" | "all") => {
    setActiveTab(tab);
    let listingType: string = "";
    if (tab === "buy") listingType = "full_payment";
    else if (tab === "rent") listingType = "rent";
    else if (tab === "installment") listingType = "installment";
    
    const next: FilterState = { ...filters, listingType };
    setFilters(next);
    setCurrentPage(1);
    updateURL(next, 1);
  }, [filters, updateURL]);

  const fetchProperties = useCallback(async () => {
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setIsLoading(true);
    setIsError(false);
    setErrorMsg("");

    try {
      const params = new URLSearchParams();

      const safeSearch = clampText(filters.search, 80);
      const safeCity = clampEnum(filters.city, CITIES_ALLOW);
      const safeSociety = clampText(filters.society, 80);
      const safeListingType = clampEnum(filters.listingType, VALID_LISTING_TYPES);
      const safeBedrooms = clampEnum(filters.bedrooms, VALID_BEDROOMS);
      const safeSort = clampEnum(filters.sort, VALID_SORTS);
      const safePage = clampInt(currentPage, 1, 500);

      if (safeSearch) params.append("search", safeSearch);
      if (safeCity) params.append("city", safeCity);
      if (safeSociety) params.append("society", safeSociety);

      const safePropertyCategory = clampEnum(filters.propertyCategory, VALID_CATEGORIES);
      if (safePropertyCategory) params.append("propertyCategory", safePropertyCategory);
      const types = getPropertyTypesForQuery();
      types.slice(0, 12).forEach((t) => params.append("propertyTypes", clampText(t, 40)));

      if (safeListingType) params.append("listingType", safeListingType);
      const safeCondition = clampEnum(filters.condition, VALID_CONDITIONS);
      if (safeCondition) params.append("condition", safeCondition);
      if (filters.minPrice) params.append("minPrice", clampText(filters.minPrice, 12));
      if (filters.maxPrice) params.append("maxPrice", clampText(filters.maxPrice, 12));
      if (safeBedrooms) params.append("bedrooms", safeBedrooms);
      if (safeSort) params.append("sort", safeSort);
      if (filters.listingSource) params.append("listingSource", clampEnum(filters.listingSource, ["", "owner", "agent"]));
      // Verified Only — the platform's core trust promise. When enabled the
      // server guarantees every returned listing is fully verified.
      if (filters.verifiedOnly) params.append("verifiedOnly", "true");

      params.append("page", String(safePage));
      params.append("limit", String(PAGE_LIMIT));

      const res = await fetchWithTimeout(`/api/properties?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        timeoutMs: 12_000,
      });

      const data = await safeJson<PropertiesApiResponse>(res);

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      if (Array.isArray(data)) {
        setProperties(normalizePropertiesList(data));
        setPagination({
          page: 1,
          limit: PAGE_LIMIT,
          total: data.length,
          pages: 1,
        });
      } else {
        const list = data?.properties ?? [];
        setProperties(normalizePropertiesList(list));
        setPagination(
          data?.pagination ?? {
            page: safePage,
            limit: PAGE_LIMIT,
            total: list.length,
            pages: 1,
          }
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to load properties at this time.";
      setIsError(true);
      setErrorMsg(msg);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.search,
    filters.city,
    filters.society,
    filters.listingType,
    filters.condition,
    filters.bedrooms,
    filters.sort,
    filters.minPrice,
    filters.maxPrice,
    filters.propertyType,
    filters.propertyCategory,
    filters.listingSource,
    filters.verifiedOnly,
    currentPage,
    getPropertyTypesForQuery,
  ]);

  useEffect(() => {
    fetchProperties();
    return () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
  }, [fetchProperties]);

  const handleFilterChange = useCallback(
    (key: FilterKey, value: string) => {
      const next: FilterState = { ...filters, [key]: value };
      if (key === "propertyCategory") next.propertyType = "";
      
      // Sync activeTab when listingType changes
      if (key === "listingType") {
        if (value === "full_payment") setActiveTab("buy");
        else if (value === "rent") setActiveTab("rent");
        else if (value === "installment") setActiveTab("installment");
        else setActiveTab("all");
      }
      
      setFilters(next);
      setCurrentPage(1);
      updateURL(next, 1);
    },
    [filters, updateURL]
  );

  const handleSearch = useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault?.();
      const next: FilterState = {
        ...filters,
        search: clampText(searchDraft, 80),
      };
      setFilters(next);
      setCurrentPage(1);
      updateURL(next, 1);
    },
    [filters, searchDraft, updateURL]
  );

  const clearFilter = useCallback(
    (key: FilterKey) => {
      const next: FilterState = {
        ...filters,
        [key]: key === "verifiedOnly" ? false : "",
      };
      setFilters(next);
      setCurrentPage(1);
      updateURL(next, 1);
    },
    [filters, updateURL]
  );

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchDraft("");
    setCurrentPage(1);
    router.replace("/properties", undefined, { shallow: true });
  }, [router]);

  const setPriceRange = useCallback(
    (value: string) => {
      const [min, max] = value ? value.split("-") : ["", ""];
      const next: FilterState = {
        ...filters,
        minPrice: min ?? "",
        maxPrice: max ?? "",
      };
      setFilters(next);
      setCurrentPage(1);
      updateURL(next, 1);
    },
    [filters, updateURL]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > pagination.pages) return;
      setCurrentPage(page);
      updateURL(filters, page);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [filters, pagination.pages, updateURL]
  );

  const pageTitle = useMemo(() => {
    if (filters.propertyCategory && PROPERTY_CATEGORIES[filters.propertyCategory]) {
      return `${PROPERTY_CATEGORIES[filters.propertyCategory].label} Properties in Pakistan | Highrise.pk`;
    }
    return "Properties in Pakistan | Buy, Rent and Installments | Highrise.pk";
  }, [filters.propertyCategory]);

  const pageDescription = useMemo(() => {
    if (hasActiveFilters) {
      return "Browse verified properties in Pakistan with your selected filters. Find homes, plots, and commercial listings on Highrise.pk.";
    }
    return "Browse verified properties for sale, rent, and installments across Pakistan. Filter by city, type, price, and bedrooms on Highrise.pk.";
  }, [hasActiveFilters]);

  const isDeepFiltered =
    Boolean(filters.search) ||
    Boolean(filters.minPrice) ||
    Boolean(filters.maxPrice) ||
    Boolean(filters.bedrooms) ||
    currentPage > 1;

  const directoryJsonLd = useMemo(() => {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: pageTitle,
        url: canonicalUrl,
        description: pageDescription,
        provider: {
          '@type': 'Organization',
          name: 'Highrise.pk',
          url: SITE_URL,
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Properties', item: baseCanonical },
        ],
      },
    ];
  }, [pageTitle, pageDescription, canonicalUrl, baseCanonical, SITE_URL]);

  // ── Phase 5 search shell fields ───────────────────────────────────────────
  // Descriptors only: every value reads and writes this page's existing filter
  // state, so the banner bar and the sticky bar can never drift apart.
  const searchFields: SearchField[] = useMemo(
    () => [
      {
        key: "category",
        kind: "select",
        label: "Category",
        icon: icons.Grid3X3,
        grow: 0.9,
        value: activeTab,
        onChange: (value) =>
          handleTabChange(value as "buy" | "rent" | "installment" | "all"),
        options: [
          { value: "all", label: "All Listings" },
          { value: "buy", label: "Buy" },
          { value: "rent", label: "Rent" },
          { value: "installment", label: "Installments" },
        ],
      },
      {
        key: "city",
        kind: "select",
        label: "City",
        icon: icons.MapPin,
        searchable: true,
        value: filters.city,
        onChange: (value) => handleFilterChange("city", value),
        options: [
          { value: "", label: "All Cities" },
          ...PAKISTAN_CITIES.map((city) => ({ value: city, label: city })),
        ],
      },
      {
        key: "society",
        kind: "text",
        label: "Location",
        icon: icons.Building2,
        grow: 1.3,
        placeholder: "Society, phase or project",
        value: searchDraft,
        onChange: setSearchDraft,
        onSubmit: () => handleSearch(),
      },
      {
        key: "propertyType",
        kind: "select",
        label: "Type",
        icon: icons.Home,
        grow: 1.05,
        value: filters.propertyType,
        onChange: (value) => handleFilterChange("propertyType", value),
        options: getFilteredPropertyTypes().map((type) => ({
          value: type.value,
          label: type.label,
        })),
      },
      {
        key: "budget",
        kind: "select",
        label: "Budget",
        icon: icons.DollarSign,
        value:
          filters.minPrice && filters.maxPrice
            ? `${filters.minPrice}-${filters.maxPrice}`
            : "",
        onChange: setPriceRange,
        options: PRICE_RANGES.map((range) => ({
          value: range.value,
          label: range.label,
        })),
      },
    ],
    [
      activeTab,
      filters.city,
      filters.propertyType,
      filters.minPrice,
      filters.maxPrice,
      searchDraft,
      handleTabChange,
      handleFilterChange,
      handleSearch,
      getFilteredPropertyTypes,
      setPriceRange,
    ]
  );

return (
      <>
        <Head>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDescription} />
          <link rel="canonical" href={canonicalUrl} />
          {isDeepFiltered && <meta name="robots" content="noindex,follow" />}
          <meta property="og:type" content="website" />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDescription} />
          <meta property="og:url" content={canonicalUrl} />
          <meta name="twitter:card" content="summary_large_image" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(directoryJsonLd).replace(/</g, '\\u003c') }}
          />
        </Head>

      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl bg-white border border-gray-200 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm sm:max-w-md">
          {toast.type === 'success' ? (
            <icons.ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <icons.X className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-gray-800 leading-tight">
            {toast.message}
          </span>
          <button onClick={() => setToast(null)} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
            <icons.X className="w-4 h-4" />
          </button>
        </div>
      )}

      <AuthGateModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        actionDescription="save search alerts"
        title="Save Search Alerts"
      />

      <div className="min-h-screen bg-[#f8f9fa]">
        {/* PHASE 5 - unified navy banner + single-row search shell.
            Full-bleed on purpose: it sits outside the 1440px results container
            so the navy band reaches both edges of the viewport. */}
        <PageSearchShell
          title="Find Properties in Pakistan"
          subtitle="Search verified listings across top societies."
          breadcrumb={
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-blue-100/75"
            >
              <Link href="/" className="flex items-center gap-1 transition-colors hover:text-white">
                <icons.Home className="h-3 w-3" />
                <span>Home</span>
              </Link>
              <icons.ChevronRight className="h-3 w-3 text-blue-200/40" />
              <Link href="/properties" className="transition-colors hover:text-white">
                Properties
              </Link>
              {filters.city && (
                <>
                  <icons.ChevronRight className="h-3 w-3 text-blue-200/40" />
                  <span className="text-white">{filters.city}</span>
                </>
              )}
            </nav>
          }
          fields={searchFields}
          onSubmit={handleSearch}
          submitLabel="Search"
          mobileLabel="Search Properties"
          activeFilterCount={activeFilterCount}
          onReset={clearAllFilters}
        />

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="my-6 space-y-6 md:my-8">
            {/* Toolbar row: quick filters left, save-search right. Aligned to
                the same content container as the search shell above. */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Right cluster: save search (pinned right at every breakpoint) */}
              <div className="order-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveSearchClick}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#017a8a] px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-[#004063] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/60 focus-visible:ring-offset-2"
                >
                <icons.Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>Save Search &amp; Get Alerts</span>
              </button>
              </div>

              {/* Left cluster: quick filters */}
              <div className="order-1 flex flex-wrap items-center gap-2">
              <div className="relative shrink-0">
                <icons.Bed className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#029bba]" />
                <select
                  value={filters.bedrooms}
                  onChange={(e) => handleFilterChange("bedrooms", e.target.value)}
                  aria-label="Bedrooms"
                  className="h-9 cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white pl-8 pr-7 text-xs font-bold text-gray-700 shadow-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]"
                >
                  {BEDROOM_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
                <icons.ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#029bba]" />
              </div>

              <div className="relative shrink-0">
                <icons.UserCheck className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#029bba]" />
                <select
                  value={filters.listingSource}
                  onChange={(e) => handleFilterChange("listingSource", e.target.value)}
                  aria-label="Listing source"
                  className="h-9 cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white pl-8 pr-7 text-xs font-bold text-gray-700 shadow-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]"
                >
                  <option value="">All Sources</option>
                  <option value="owner">Direct Owner</option>
                  <option value="agent">Agent Listed</option>
                </select>
                <icons.ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#029bba]" />
              </div>

              {/* Verified Only toggle — the platform's core trust promise.
                  The public listing contract already restricts to verified
                  listings; this switch is the explicit user-facing guarantee
                  that nothing unverified or pending can slip through. */}
              <button
                type="button"
                onClick={() => handleFilterChange("verifiedOnly", !filters.verifiedOnly ? "true" : "")}
                aria-pressed={filters.verifiedOnly}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all ${
                  filters.verifiedOnly
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm ring-2 ring-emerald-100"
                    : "border-gray-300 bg-white text-gray-700 shadow-sm hover:border-[#029bba] hover:text-[#029bba]"
                }`}
              >
                <icons.ShieldCheck
                  className={`h-3.5 w-3.5 ${filters.verifiedOnly ? "fill-emerald-600 text-emerald-600" : "text-[#029bba]"}`}
                />
                <span>Verified Only</span>
                {filters.verifiedOnly && <icons.Check className="h-3 w-3" />}
              </button>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => clearAllFilters()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-bold text-red-600 transition-colors hover:bg-red-100"
                  >
                    <icons.RotateCcw className="h-3.5 w-3.5" />
                    Reset Filters ({activeFilterCount})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Active:</span>

              {filters.search && (
                <FilterChip
                  icon={<icons.Search className="w-3 h-3 text-[#029bba]" />}
                  label={`"${filters.search}"`}
                  onClear={() => clearFilter("search")}
                />
              )}
              {filters.city && (
                <FilterChip
                  icon={<icons.MapPin className="w-3 h-3 text-[#029bba]" />}
                  label={filters.city}
                  onClear={() => clearFilter("city")}
                />
              )}
              {filters.society && (
                <FilterChip
                  icon={<icons.Building2 className="w-3 h-3 text-[#029bba]" />}
                  label={filters.society}
                  onClear={() => clearFilter("society")}
                />
              )}
              {filters.propertyCategory && PROPERTY_CATEGORIES[filters.propertyCategory] && (
                <FilterChip
                  icon={PROPERTY_CATEGORIES[filters.propertyCategory].icon}
                  label={PROPERTY_CATEGORIES[filters.propertyCategory].label}
                  onClear={() => clearFilter("propertyCategory")}
                />
              )}
              {filters.propertyType && (
                <FilterChip
                  icon={<icons.Home className="w-3 h-3 text-[#029bba]" />}
                  label={filters.propertyType}
                  onClear={() => clearFilter("propertyType")}
                />
              )}
              {filters.listingType && (
                <FilterChip
                  icon={<icons.TrendingUp className="w-3 h-3 text-[#029bba]" />}
                  label={
                    LISTING_TYPES.find((t) => t.value === filters.listingType)?.label ??
                    filters.listingType
                  }
                  onClear={() => clearFilter("listingType")}
                />
              )}
              {filters.bedrooms && (
                <FilterChip
                  icon={<icons.Bed className="w-3 h-3 text-[#029bba]" />}
                  label={`${filters.bedrooms} Bed${parseInt(filters.bedrooms, 10) > 1 ? "s" : ""}`}
                  onClear={() => clearFilter("bedrooms")}
                />
              )}
              {filters.listingSource && (
                <FilterChip
                  icon={<icons.UserCheck className="w-3 h-3 text-[#029bba]" />}
                  label={filters.listingSource === 'owner' ? "Owner Direct" : "Agent Listed"}
                  onClear={() => clearFilter("listingSource")}
                />
              )}
              {filters.verifiedOnly && (
                <FilterChip
                  icon={<icons.ShieldCheck className="w-3 h-3 text-emerald-600" />}
                  label="Verified Only"
                  onClear={() => clearFilter("verifiedOnly")}
                />
              )}
              {(filters.minPrice || filters.maxPrice) && (
                <FilterChip
                  icon={<icons.DollarSign className="w-3 h-3 text-[#029bba]" />}
                  label={
                    PRICE_RANGES.find(
                      (p) => p.value === `${filters.minPrice}-${filters.maxPrice}`
                    )?.label ?? "Custom Price"
                  }
                  onClear={() => setPriceRange("")}
                />
              )}

              <button type="button" onClick={clearAllFilters} className="ml-1 text-[11px] font-bold text-red-500 hover:underline">
                Clear All
              </button>
            </div>
          )}

          {/* RECENTLY VIEWED AT TOP */}
          <RecentlyViewed />

          {/* MAIN RESULTS AREA */}
          <div className="relative z-10 pt-4 pb-8 border-t border-gray-200 mt-2">
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {isLoading ? (
                  <>
                    <icons.Loader2 className="h-4 w-4 animate-spin text-[#029bba]" />
                    <span className="font-semibold">Finding properties...</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Showing</span>
                    <span className="font-black text-gray-900">{properties.length}</span>
                    <span className="font-semibold">of</span>
                    <span className="font-black text-[#029bba]">{pagination.total.toLocaleString()}</span>
                    <span className="font-semibold">listings</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange("sort", e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-700 focus:ring-1 focus:ring-[#029bba]/30 focus:border-[#029bba] outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <div className="inline-flex rounded-xl border-2 border-gray-200 bg-white p-1" role="tablist" aria-label="Property view mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "grid"}
                    aria-label="Grid view"
                    onClick={() => setViewMode("grid")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      viewMode === "grid"
                        ? "bg-[#017a8a] text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 hover:text-[#029bba]"
                    }`}
                  >
                    <Grid3x3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "list"}
                    aria-label="List view"
                    onClick={() => setViewMode("list")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      viewMode === "list"
                        ? "bg-[#017a8a] text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 hover:text-[#029bba]"
                    }`}
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Promoted Showcase Strip */}
            {!isLoading && promotedProperties.length > 0 && (
              <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <icons.Award className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider">
                    Featured & Promoted Properties
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {promotedProperties.slice(0, 3).map((property) => (
                    <div key={`promoted-${property._id}`} className="min-w-0">
                      <PropertyCard property={property as any} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading ? (
              <PropertyGridSkeleton count={12} />
            ) : isError ? (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-2xl p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <icons.X className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-red-900 mb-1">
                  Unable to Load Listings
                </h3>
                <p className="text-xs text-red-700 mb-5">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => fetchProperties()}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Try Again
                </button>
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#029bba]/10 flex items-center justify-center mx-auto mb-3">
                  <icons.Building2 className="w-8 h-8 text-[#029bba]" />
                </div>
                <h3 className="text-lg font-bold text-[#004063] mb-1">
                  No Properties Found
                </h3>
                <p className="text-xs text-gray-500 mb-6 max-w-sm mx-auto">
                  {hasActiveFilters
                    ? "No listings match your search criteria. Try removing or adjusting some filters."
                    : "There are no verified listings available at the moment. Check back soon!"}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="px-5 py-2.5 border border-[#029bba] text-[#029bba] rounded-xl text-xs font-bold hover:bg-[#029bba]/5 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                  <Link
                    href="/add-property"
                    className="px-5 py-2.5 bg-[#017a8a] hover:bg-[#004063] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    List Your Property
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Results + optional right ad rail. The rail only exists when
                    inventory is configured (hasAd); with AD_INVENTORY empty
                    this is a plain block and the cards use the full container
                    width — no empty reserved column, no wasted space. */}
                <div
                  className={
                    hasSidebarAd
                      ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
                      : undefined
                  }
                >
                  <div className="min-w-0">
                    <PropertyGrid
                      properties={properties}
                      loading={false}
                      viewMode={viewMode}
                      gridClassName={
                        hasSidebarAd
                          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:grid-cols-2"
                          : undefined
                      }
                    />

                    <AdSlot id="properties.infeed" variant="infeed" className="mt-8" />
                  </div>

                  {hasSidebarAd && (
                    <aside className="hidden xl:block" aria-label="Advertisement">
                      <div className="sticky top-24 space-y-6">
                        <AdSlot id="properties.sidebar" variant="sidebar" />
                      </div>
                    </aside>
                  )}
                </div>

                {pagination.pages > 1 && (
                  <>
                    <div className="flex items-center justify-center mt-10">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => handlePageChange(currentPage - 1)}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <icons.ChevronLeft className="w-4 h-4" />
                          <span className="hidden sm:inline">Previous</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, pagination.pages) },
                            (_, i) => {
                              let pageNum: number;
                              if (pagination.pages <= 5) pageNum = i + 1;
                              else if (currentPage <= 3) pageNum = i + 1;
                              else if (currentPage >= pagination.pages - 2)
                                pageNum = pagination.pages - 4 + i;
                              else pageNum = currentPage - 2 + i;

                              return (
                                <button
                                  key={pageNum}
                                  type="button"
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`min-w-[36px] h-9 rounded-xl text-xs font-bold transition-colors ${
                                    currentPage === pageNum
                                      ? "bg-[#029bba] text-white shadow-xs"
                                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={currentPage === pagination.pages}
                          onClick={() => handlePageChange(currentPage + 1)}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <icons.ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-center text-xs text-gray-400 font-semibold mt-3">
                      Page {currentPage} of {pagination.pages}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
          {!isLoading && !isError && (
            <RecommendedSellers properties={properties} />
          )}
          <ContextualArticles
            title="Property News & Guides"
            description="Published buying, renting, selling, and property-market guidance for Pakistan."
            tags={['Buying Guide', 'Selling Guide', 'Renting Guide', 'Price Trends', 'Property Types']}
          />
          <section aria-labelledby="property-research-tools-heading" className="mt-16 border-t border-gray-200 pt-16">
            <SectionHeading
              id="property-research-tools-heading"
              eyebrow="Property Research Tools"
              eyebrowIcon={<icons.Compass className="h-3.5 w-3.5 text-[#029bba]" />}
              title={
                <>
                  Make a more <span className="text-[#029bba]">informed</span> property decision
                </>
              }
              subtitle="Use our verification and intelligence tools to research properties, societies, and pricing before you invest."
            />
            <div className="flex flex-wrap gap-3">
              <Link href="/tools/price-estimator" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#029bba] hover:text-[#029bba]">
                <icons.DollarSign className="h-4 w-4 text-[#029bba]" /> Price estimator
              </Link>
              <Link href="/tools/home-loan-calculator" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#029bba] hover:text-[#029bba]">
                <icons.Calculator className="h-4 w-4 text-[#029bba]" /> Home loan calculator
              </Link>
              <Link href="/tools/area-unit-converter" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#029bba] hover:text-[#029bba]">
                <icons.Maximize className="h-4 w-4 text-[#029bba]" /> Area converter
              </Link>
              <Link href="/compare" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#029bba] hover:text-[#029bba]">
                <icons.BarChart3 className="h-4 w-4 text-[#029bba]" /> Compare properties
              </Link>
            </div>
          </section>
          <section aria-labelledby="list-property-cta" className="mt-16 relative overflow-hidden rounded-3xl border border-[#029bba]/20 bg-gradient-to-br from-[#002b42] to-[#004063] p-8 sm:p-12 text-center shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#029bba]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#029bba]/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 id="list-property-cta" className="text-3xl font-black text-white md:text-4xl mb-4 leading-tight">
                Have a property to <span className="text-[#38aec7]">sell or rent?</span>
              </h2>
              <p className="text-lg text-blue-100/80 mb-8 leading-relaxed">
                Connect with thousands of verified buyers and tenants. Create a high-quality listing and submit it for Highrise verification review.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/add-property" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#029bba] px-8 py-4 text-base font-bold text-white transition-all hover:bg-[#017a94] hover:shadow-lg active:scale-95 shadow-md">
                  List Your Property <icons.Plus className="w-5 h-5" />
                </Link>
                <Link href="/onboarding/business" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-base font-bold text-white border border-white/20 transition-all hover:bg-white/20 active:scale-95">
                  Business Onboarding
                </Link>
              </div>
            </div>
          </section>

          {/* SEO content — professional card at the very bottom of the page,
              inside the same 1280px container so its gutters match the listings. */}
          {getPageSeoContent("properties") && (
            <PageSeoContent
              {...getPageSeoContent("properties")!}
              contained={false}
              className="mt-8 mb-2"
            />
          )}
        </div>

        {/* Floating Back to Top Button */}
        <div className={`fixed bottom-6 left-0 right-0 flex justify-center z-40 transition-all duration-300 pointer-events-none ${
          isSticky ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'
        }`}>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
            className="pointer-events-auto w-12 h-12 rounded-full bg-[#029bba] hover:bg-[#004063] text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#029bba]/50 border-2 border-white"
          >
            <icons.ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out forwards;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}

// ============================================================================
// FILTER CHIP SUBCOMPONENT
// ============================================================================

interface FilterChipProps {
  icon: React.ReactElement;
  label: string;
  onClear: () => void;
}

function FilterChip({ icon, label, onClear }: FilterChipProps): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px] font-bold text-gray-700">
      {icon}
      <span>{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <icons.X className="w-3 h-3" />
      </button>
    </span>
  );
}