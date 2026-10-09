// File: pages/properties/index.tsx
// Highrise.pk - Public Property Search & Discovery Directory
// Design System Locked: tokens from @/lib/design-system/tokens | icons from @/lib/design-system/icons
// Layout Sync: Mirrors pages/projects/index.tsx (No hero, compact sticky search, 1440px wrapper)
// Pure ASCII comments | Zero react-hot-toast

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
import { icons } from "@/lib/design-system/icons";

import { PropertyGrid, PropertyListItem } from "@/components/property/property-grid";
import { RecentlyViewed } from "@/components/recently-viewed";
import { normalizePropertiesList } from "@/lib/property/property";
import { PropertyGridSkeleton } from "@/components/skeletons/PropertyGridSkeleton";
import AuthGateModal from "@/components/auth/AuthGateModal";
import { useSession } from "next-auth/react";

// ============================================================================
// TYPES
// ============================================================================

interface FilterState {
  search: string;
  city: string;
  propertyCategory: string;
  propertyType: string;
  listingType: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  sort: string;
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

const PAKISTAN_CITIES = [
  "Islamabad",  "Rawalpindi", "Lahore",     "Karachi",    "Faisalabad",
  "Multan",     "Peshawar",   "Quetta",     "Gujranwala", "Sialkot",
  "Hyderabad",  "Bahawalpur", "Sargodha",   "Sukkur",     "Larkana",
] as const;

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
const VALID_BEDROOMS     = ["", "1", "2", "3", "4", "5"];

const PAGE_LIMIT = 12;
const DEFAULT_FILTERS: FilterState = {
  search: "", city: "", propertyCategory: "", propertyType: "",
  listingType: "", minPrice: "", maxPrice: "", bedrooms: "", sort: "",
};

const SEO_CANONICAL_KEYS = new Set([
  "city",
  "propertyCategory",
  "propertyType",
  "listingType",
  "sort",
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
// COMPARE BAR COMPONENT (API driven, no localStorage)
// ============================================================================

interface CompareBarItem {
  _id: string;
}

function CompareBar(): React.ReactElement | null {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const loadCompare = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/compare", { signal, credentials: "include" });
      if (!res.ok) {
        setCount(0);
        return;
      }
      const data = (await res.json()) as {
        success?: boolean;
        data?: { properties?: CompareBarItem[] };
      };
      const items = data?.data?.properties ?? [];
      setCount(Array.isArray(items) ? items.length : 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setCount(0);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadCompare(controller.signal);
    return () => controller.abort();
  }, [loadCompare]);

  useEffect(() => {
    const onRouteChange = () => {
      const c = new AbortController();
      loadCompare(c.signal);
    };
    router.events.on("routeChangeComplete", onRouteChange);
    return () => {
      router.events.off("routeChangeComplete", onRouteChange);
    };
  }, [router.events, loadCompare]);

  if (!loaded || count < 2) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] pointer-events-none">
      <div className="pointer-events-auto animate-fadeIn">
        <div className="flex items-center gap-4 bg-white border-2 border-[#029bba]/20 rounded-full shadow-xl px-6 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#029bba]/10 rounded-full">
              <icons.Maximize className="w-5 h-5 text-[#029bba]" />
            </div>
            <span className="text-sm font-medium text-gray-800">
              Comparing{" "}
              <span className="text-[#029bba] font-bold text-base">{count}</span>{" "}
              properties
              <span className="text-gray-400 hidden sm:inline"> / 4 max</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/compare")}
            className="bg-gradient-to-r from-[#029bba] to-[#017a8a] hover:opacity-90 text-white text-sm font-semibold px-5 py-2 rounded-full shadow-md transition-opacity flex items-center gap-2"
          >
            View Comparison
            <icons.ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
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
  const initializedRef = useRef(false);

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

  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query;
    const safeFilters: FilterState = {
      search: clampText(q.search, 80),
      city: clampEnum(q.city, CITIES_ALLOW),
      propertyCategory: clampEnum(q.propertyCategory, VALID_CATEGORIES),
      propertyType: clampEnum(q.propertyType, ALL_TYPE_VALUES),
      listingType: clampEnum(q.listingType, VALID_LISTING_TYPES),
      minPrice: clampText(String(q.minPrice ?? "").replace(/[^\d]/g, ""), 12),
      maxPrice: clampText(String(q.maxPrice ?? "").replace(/[^\d]/g, ""), 12),
      bedrooms: clampEnum(q.bedrooms, VALID_BEDROOMS),
      sort: clampEnum(q.sort, VALID_SORTS),
    };

    setFilters(safeFilters);
    setSearchDraft(safeFilters.search);

    const pageParam = clampInt(q.page, 1, 500);
    setCurrentPage(pageParam);

    initializedRef.current = true;
  }, [router.isReady, router.query]);

  const updateURL = useCallback(
    (next: FilterState, page = 1) => {
      const params = new URLSearchParams();

      const safe: FilterState = {
        search: clampText(next.search, 80),
        city: clampEnum(next.city, CITIES_ALLOW),
        propertyCategory: clampEnum(next.propertyCategory, VALID_CATEGORIES),
        propertyType: clampEnum(next.propertyType, ALL_TYPE_VALUES),
        listingType: clampEnum(next.listingType, VALID_LISTING_TYPES),
        minPrice: clampText(String(next.minPrice).replace(/[^\d]/g, ""), 12),
        maxPrice: clampText(String(next.maxPrice).replace(/[^\d]/g, ""), 12),
        bedrooms: clampEnum(next.bedrooms, VALID_BEDROOMS),
        sort: clampEnum(next.sort, VALID_SORTS),
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

  const fetchProperties = useCallback(async () => {
    if (!initializedRef.current) return;

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
      const safeListingType = clampEnum(filters.listingType, VALID_LISTING_TYPES);
      const safeBedrooms = clampEnum(filters.bedrooms, VALID_BEDROOMS);
      const safeSort = clampEnum(filters.sort, VALID_SORTS);
      const safePage = clampInt(currentPage, 1, 500);

      if (safeSearch) params.append("search", safeSearch);
      if (safeCity) params.append("city", safeCity);

      const safePropertyCategory = clampEnum(filters.propertyCategory, VALID_CATEGORIES);
      if (safePropertyCategory) params.append("propertyCategory", safePropertyCategory);
      const types = getPropertyTypesForQuery();
      types.slice(0, 12).forEach((t) => params.append("propertyTypes", clampText(t, 40)));

      if (safeListingType) params.append("listingType", safeListingType);
      if (filters.minPrice) params.append("minPrice", clampText(filters.minPrice, 12));
      if (filters.maxPrice) params.append("maxPrice", clampText(filters.maxPrice, 12));
      if (safeBedrooms) params.append("bedrooms", safeBedrooms);
      if (safeSort) params.append("sort", safeSort);

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
    filters.listingType,
    filters.bedrooms,
    filters.sort,
    filters.minPrice,
    filters.maxPrice,
    filters.propertyType,
    filters.propertyCategory,
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
      const next: FilterState = { ...filters, [key]: "" };
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
        {/* COMPACT BREADCRUMBS & HEADER ZONE (No Hero Banner) */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5 space-y-4">
          
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
                <icons.Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </Link>
              <icons.ChevronRight className="w-3 h-3 text-gray-300" />
              <Link href="/properties" className="hover:text-[#029bba] font-medium transition-colors">
                Properties
              </Link>
              {filters.city && (
                <>
                  <icons.ChevronRight className="w-3 h-3 text-gray-300" />
                  <span className="text-[#004063] font-bold">{filters.city}</span>
                </>
              )}
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
                  {filters.city ? `Verified Properties in ${filters.city}` : 'Verified Properties in Pakistan'}
                </h1>
                <p className="text-xs text-gray-600 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
                  <span>{pagination.total.toLocaleString()} Properties</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-emerald-600">Verified Listings</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[#029bba]">Trusted Owners</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleSaveSearchClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#004063] hover:to-[#029bba] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <icons.Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Save Search & Get Alerts</span>
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => clearAllFilters()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    <icons.RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters ({activeFilterCount})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* COMPACT STICKY SEARCH & FILTER BAR */}
          <div className={`transition-all duration-300 md:sticky md:top-[64px] z-30 relative ${
            isSticky ? 'bg-white shadow-sm border-b border-gray-200 py-3 -mx-4 px-4 sm:mx-0 sm:px-0' : 'bg-transparent'
          }`}>
            
            <div className="flex flex-col md:flex-row items-center gap-2.5">
              
              {/* Search Bar - Flex 1 */}
              <div className="w-full md:flex-1 relative">
                <icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Search locality, society, or project name..."
                  className="w-full h-11 pl-10 pr-20 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] focus:outline-none transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#029bba] hover:bg-[#004063] text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Search
                </button>
              </div>

              {/* Tightly Packed Dropdowns (Scrollable on small mobile, inline on desktop) */}
              <div className="w-full md:w-auto flex overflow-x-auto md:flex-wrap items-center gap-2.5 pb-1 md:pb-0 shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                {/* City */}
                <div className="w-[140px] shrink-0 relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <icons.MapPin className="w-4 h-4 text-[#029bba]" />
                  </div>
                  <select
                    value={filters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                    className="w-full h-11 pl-9 pr-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none cursor-pointer shadow-sm appearance-none"
                  >
                    <option value="">All Cities</option>
                    {PAKISTAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className="w-[150px] shrink-0 relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <icons.Grid3X3 className="w-4 h-4 text-[#029bba]" />
                  </div>
                  <select
                    value={filters.propertyCategory}
                    onChange={(e) => handleFilterChange("propertyCategory", e.target.value)}
                    className="w-full h-11 pl-9 pr-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none cursor-pointer shadow-sm appearance-none"
                  >
                    <option value="">All Categories</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="plots">Plots & Land</option>
                  </select>
                </div>

                {/* Listing Type */}
                <div className="w-[150px] shrink-0 relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <icons.TrendingUp className="w-4 h-4 text-[#029bba]" />
                  </div>
                  <select
                    value={filters.listingType}
                    onChange={(e) => handleFilterChange("listingType", e.target.value)}
                    className="w-full h-11 pl-9 pr-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none cursor-pointer shadow-sm appearance-none"
                  >
                    {LISTING_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Property Type */}
                <div className="w-[140px] shrink-0 relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <icons.Home className="w-4 h-4 text-[#029bba]" />
                  </div>
                  <select
                    value={filters.propertyType}
                    onChange={(e) => handleFilterChange("propertyType", e.target.value)}
                    className="w-full h-11 pl-9 pr-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none cursor-pointer shadow-sm appearance-none"
                  >
                    {getFilteredPropertyTypes().map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div className="w-[140px] shrink-0 relative hidden lg:block">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <icons.DollarSign className="w-4 h-4 text-[#029bba]" />
                  </div>
                  <select
                    value={
                      filters.minPrice && filters.maxPrice
                        ? `${filters.minPrice}-${filters.maxPrice}`
                        : ""
                    }
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none cursor-pointer shadow-sm appearance-none"
                  >
                    {PRICE_RANGES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Active:</span>
                
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

                <button type="button" onClick={clearAllFilters} className="text-[11px] font-bold text-red-500 hover:underline ml-1">
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* MAIN RESULTS AREA */}
          <div className="relative z-10 pt-4 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-[#004063] flex items-center gap-2">
                  <icons.TrendingUp className="w-5 h-5 text-[#029bba]" />
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <icons.Loader2 className="w-4 h-4 animate-spin text-[#029bba]" />
                      Finding properties...
                    </span>
                  ) : (
                    <>
                      Showing <span className="text-[#029bba]">{properties.length}</span> of <span className="text-[#029bba]">{pagination.total.toLocaleString()}</span> listings
                    </>
                  )}
                </h2>
              </div>

              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange("sort", e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-700 focus:ring-1 focus:ring-[#029bba]/30 focus:border-[#029bba] outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

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
                    className="px-5 py-2.5 bg-[#029bba] hover:bg-[#017a8a] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    List Your Property
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <PropertyGrid properties={properties} loading={false} />

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
        </div>

        <RecentlyViewed />
        <CompareBar />

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