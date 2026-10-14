// pages/societies/index.tsx
// 🏛️ VERIFIED SOCIETIES BROWSE PAGE — HIGHRISE.PK
// Pakistan's first directory of intelligence-scored housing societies.
// Industry-first: verified NOC + risk scores + comparable analysis.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import ContextualArticles from '@/components/blog/ContextualArticles';
import {
  Search, MapPin, Shield, ShieldCheck, ShieldAlert, ShieldX,
  AlertTriangle, XCircle, Clock, Building2,
  TrendingUp, Award, Info, ChevronRight, Filter, X,
  Loader2, BadgeCheck, Activity, Banknote, Sparkles, Home,
  Grid3x3, List, ArrowRight, ChevronDown, Star,
  Database, Lock,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SocietyListItem {
  _id: string;
  name: string;
  slug: string;
  city: string;
  areaName: string;
  category: string;
  nocStatus: string;
  approvalAuthority: string;
  overallRiskLevel: string;
  scores: {
    legal: number;
    growth: number;
    possession: number;
    infrastructure: number;
    livability: number;
    overall: number;
  };
  featuredImage?: string;
  activeAlertCount: number;
  isVerifiedByHighrise: boolean;
  isFeatured: boolean;
  viewCount: number;
  developerName?: string;
  launchYear?: number;
  possessionPercentage?: number;
}

interface FilterOptions {
  cities: string[];
  authorities: string[];
  nocStatuses: string[];
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type ViewMode = 'grid' | 'list';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS — Design language from /tools/verify-society
// ═══════════════════════════════════════════════════════════════

const NOC_LABELS: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  approved: {
    label: 'NOC Approved',
    color: 'bg-[#10b981] text-white border-[#10b981]',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  pending: {
    label: 'NOC Pending',
    color: 'bg-[#f59e0b] text-white border-[#f59e0b]',
    icon: <Clock className="w-4 h-4" />,
  },
  under_review: {
    label: 'Under Review',
    color: 'bg-[#f59e0b] text-white border-[#f59e0b]',
    icon: <Clock className="w-4 h-4" />,
  },
  illegal: {
    label: 'Declared Illegal',
    color: 'bg-[#ef4444] text-white border-[#ef4444]',
    icon: <ShieldX className="w-4 h-4" />,
  },
  disputed: {
    label: 'Disputed',
    color: 'bg-[#ef4444] text-white border-[#ef4444]',
    icon: <ShieldAlert className="w-4 h-4" />,
  },
  cancelled: {
    label: 'NOC Cancelled',
    color: 'bg-[#ef4444] text-white border-[#ef4444]',
    icon: <XCircle className="w-4 h-4" />,
  },
  expired: {
    label: 'NOC Expired',
    color: 'bg-[#f59e0b] text-white border-[#f59e0b]',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
};

const RISK_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  safe: { label: 'Safe', color: 'text-[#10b981]', bg: 'bg-[#f0fdf4]' },
  caution: { label: 'Caution', color: 'text-[#f59e0b]', bg: 'bg-[#fef3c7]' },
  high_risk: { label: 'High Risk', color: 'text-[#ef4444]', bg: 'bg-[#fef2f2]' },
  avoid: { label: 'Avoid', color: 'text-white', bg: 'bg-[#ef4444]' },
};

const CATEGORY_LABELS: Record<string, string> = {
  housing_scheme: 'Housing Scheme',
  gated_community: 'Gated Community',
  apartment_complex: 'Apartment Complex',
  commercial_zone: 'Commercial Zone',
  mixed_use: 'Mixed Use',
  industrial_zone: 'Industrial Zone',
  township: 'Township',
};

const PAKISTAN_CITIES = [
  'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Multan', 'Peshawar',
  'Faisalabad', 'Sialkot', 'Gujranwala', 'Bahawalpur', 'Sargodha',
  'Hyderabad', 'Quetta', 'Sukkur', 'Larkana', 'Sheikhupura', 'Jhelum',
  'Mardan', 'Mirpur', 'Abbottabad', 'Kasur', 'Okara', 'Sahiwal',
];

const PAKISTAN_AUTHORITIES = [
  'CDA', 'RDA', 'LDA', 'KDA', 'FDA', 'MDA', 'DHA', 'PHATA',
  'SBCA', 'GDA', 'Cantonment_Board', 'TMA', 'Other',
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-[#10b981]';
  if (score >= 50) return 'text-[#f59e0b]';
  return 'text-[#ef4444]';
}

function getScoreBg(score: number): string {
  if (score >= 75) return 'bg-[#10b981]';
  if (score >= 50) return 'bg-[#f59e0b]';
  return 'bg-[#ef4444]';
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function SocietiesBrowsePage(): React.ReactElement {
  const router = useRouter();

  // Data
  const [societies, setSocieties] = useState<SocietyListItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    cities: [],
    authorities: [],
    nocStatuses: [],
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters (initial values from URL query)
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [nocStatus, setNocStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [authority, setAuthority] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('overallScore');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════════════════════════
  // URL SYNC — Read query params on mount + URL changes
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (typeof q.city === 'string') setCity(q.city);
    if (typeof q.nocStatus === 'string') setNocStatus(q.nocStatus);
    if (typeof q.riskLevel === 'string') setRiskLevel(q.riskLevel);
    if (typeof q.authority === 'string') setAuthority(q.authority);
    if (typeof q.category === 'string') setCategory(q.category);
    if (typeof q.sortBy === 'string') setSortBy(q.sortBy);
    if (typeof q.search === 'string') {
      setSearch(q.search);
      setSearchInputValue(q.search);
    }
    if (typeof q.page === 'string') setPage(Number(q.page) || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // ═══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ═══════════════════════════════════════════════════════════════

  const fetchSocieties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      if (nocStatus) params.set('nocStatus', nocStatus);
      if (riskLevel) params.set('riskLevel', riskLevel);
      if (authority) params.set('authority', authority);
      if (category) params.set('category', category);
      if (sortBy) params.set('sortBy', sortBy);
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetch(`/api/societies?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || 'Failed to load societies');
        setSocieties([]);
        return;
      }

      setSocieties(data.data.societies || []);
      setPagination(data.data.pagination);
      setFilterOptions(data.data.filters || { cities: [], authorities: [], nocStatuses: [] });
    } catch {
      setError('Network error. Please check your connection.');
      setSocieties([]);
    } finally {
      setLoading(false);
    }
  }, [search, city, nocStatus, riskLevel, authority, category, sortBy, page]);

  useEffect(() => {
    fetchSocieties();
  }, [fetchSocieties]);

  // ═══════════════════════════════════════════════════════════════
  // URL SYNC — Write to URL when filters change
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!router.isReady) return;
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (city) params.city = city;
    if (nocStatus) params.nocStatus = nocStatus;
    if (riskLevel) params.riskLevel = riskLevel;
    if (authority) params.authority = authority;
    if (category) params.category = category;
    if (sortBy && sortBy !== 'overallScore') params.sortBy = sortBy;
    if (page > 1) params.page = String(page);

    router.replace(
      { pathname: '/societies', query: params },
      undefined,
      { shallow: true, scroll: false }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, city, nocStatus, riskLevel, authority, category, sortBy, page]);

  // ═══════════════════════════════════════════════════════════════
  // DEBOUNCED SEARCH
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      if (searchInputValue !== search) {
        setSearch(searchInputValue);
        setPage(1);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInputValue, search]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleClearFilters = () => {
    setSearchInputValue('');
    setSearch('');
    setCity('');
    setNocStatus('');
    setRiskLevel('');
    setAuthority('');
    setCategory('');
    setSortBy('overallScore');
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const activeFilterCount =
    (city ? 1 : 0) +
    (nocStatus ? 1 : 0) +
    (riskLevel ? 1 : 0) +
    (authority ? 1 : 0) +
    (category ? 1 : 0);

  const cityOptions = Array.from(
    new Map(
      [...PAKISTAN_CITIES, ...filterOptions.cities]
        .map((cityName) => cityName.trim())
        .filter(Boolean)
        .map((cityName) => [cityName.toLowerCase(), cityName] as const)
    ).values()
  ).sort((firstCity, secondCity) => firstCity.localeCompare(secondCity));

  const authorityOptions = Array.from(
    new Map(
      [...PAKISTAN_AUTHORITIES, ...filterOptions.authorities]
        .map((authorityName) => authorityName.trim())
        .filter(Boolean)
        .map((authorityName) => [authorityName.toLowerCase(), authorityName] as const)
    ).values()
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>Verified Societies in Pakistan | Browse 500+ Housing Schemes | Highrise.pk</title>
        <meta
          name="description"
          content="Browse Pakistan's most trusted directory of verified housing societies. NOC status, risk scores, legal validation. DHA, Bahria, Lake City, and 500+ more societies across 10 cities."
        />
        <meta
          name="keywords"
          content="verified societies Pakistan, housing schemes, DHA Lahore, Bahria Town, NOC approved societies, real estate Pakistan, gated communities, society directory"
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Verified Societies in Pakistan | Highrise.pk" />
        <meta property="og:description" content="500+ verified housing societies with NOC status, intelligence scores, and risk alerts." />
        <meta property="og:url" content="https://highrise.pk/societies" />
        <link rel="canonical" href="https://highrise.pk/societies" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: 'Verified Societies in Pakistan',
              url: 'https://highrise.pk/societies',
              description: 'Browse Pakistan\'s most trusted directory of verified housing societies with NOC status and intelligence scores.',
              provider: {
                '@type': 'Organization',
                name: 'Highrise.pk',
                url: 'https://highrise.pk',
              },
              breadcrumb: {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://highrise.pk' },
                  { '@type': 'ListItem', position: 2, name: 'Societies', item: 'https://highrise.pk/societies' },
                ],
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 pt-4 md:pt-5 pb-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="font-medium text-gray-600">Societies</span>
          </nav>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
            Verified Societies in Pakistan
          </h1>
          <p className="text-xs text-gray-600 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
            <span>{pagination.total.toLocaleString()} Societies</span>
            <span className="text-gray-300">•</span>
            <span className="text-emerald-600">NOC Status & Risk Scores</span>
            <span className="text-gray-300">•</span>
            <span className="text-[#029bba]">12 Authorities Tracked</span>
          </p>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
            DISCLAIMER STRIP
        ═══════════════════════════════════════════════════════════════ */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-1">
          <div className="rounded-xl border border-[#f59e0b]/30 bg-[#fef3c7] px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-[#92400e] text-xs md:text-sm">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span className="text-center">
                <strong>Always verify with official authorities</strong> before any transaction. Data aggregated from public sources.
              </span>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            FILTERS BAR (Sticky)
        ═══════════════════════════════════════════════════════════════ */}
        <section className="sticky top-[64px] z-30 bg-white border-y border-gray-200 shadow-sm">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-3">
            <div className="space-y-2.5">

              <div className="flex items-center gap-2">
              <div className="relative min-w-0 w-full max-w-[720px] flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#029bba] pointer-events-none" />
                <input
                  type="text"
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  placeholder="Search societies by name..."
                  className="w-full h-11 pl-10 pr-20 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] focus:outline-none transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => { setSearch(searchInputValue.trim()); setPage(1); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#029bba] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#004063]"
                >
                  Search
                </button>
              </div>

              {/* Mobile filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200 md:hidden"
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#029bba] text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              <div className="hidden md:ml-auto md:flex items-center gap-1 p-1 bg-gray-100 rounded-xl" aria-label="Society view mode">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-[#029bba] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white text-[#029bba] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-label="List view"
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              </div>

              {/* Desktop / mobile-expandable filters */}
              <div className={`${showFilters ? 'flex' : 'hidden'} w-full min-w-0 flex-wrap items-center gap-2 md:flex`}>

                {/* City */}
                <select
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setPage(1); }}
                  className="h-9 w-auto min-w-[6.5rem] max-w-none shrink-0 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 outline-none cursor-pointer focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10"
                >
                  <option value="">All Cities</option>
                  {cityOptions.map((cityName) => (
                    <option key={cityName} value={cityName}>{cityName}</option>
                  ))}
                </select>

                {/* NOC Status */}
                <select
                  value={nocStatus}
                  onChange={(e) => { setNocStatus(e.target.value); setPage(1); }}
                  className="h-9 w-auto min-w-[9rem] max-w-none shrink-0 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 outline-none cursor-pointer focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10"
                >
                  <option value="">Any NOC Status</option>
                  <option value="approved">✅ Approved</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="under_review">🔍 Under Review</option>
                  <option value="illegal">⛔ Illegal</option>
                  <option value="disputed">⚠️ Disputed</option>
                  <option value="cancelled">❌ Cancelled</option>
                  <option value="expired">📅 Expired</option>
                </select>

                {/* Risk Level */}
                <select
                  value={riskLevel}
                  onChange={(e) => { setRiskLevel(e.target.value); setPage(1); }}
                  className="h-9 w-auto min-w-[8rem] max-w-none shrink-0 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 outline-none cursor-pointer focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10"
                >
                  <option value="">Any Risk Level</option>
                  <option value="safe">🟢 Safe</option>
                  <option value="caution">🟡 Caution</option>
                  <option value="high_risk">🔴 High Risk</option>
                  <option value="avoid">⛔ Avoid</option>
                </select>

                {/* Category */}
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="h-9 w-auto min-w-[8rem] max-w-none shrink-0 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 outline-none cursor-pointer focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10"
                >
                  <option value="">Any Category</option>
                  <option value="housing_scheme">Housing Scheme</option>
                  <option value="gated_community">Gated Community</option>
                  <option value="apartment_complex">Apartment Complex</option>
                  <option value="commercial_zone">Commercial Zone</option>
                  <option value="mixed_use">Mixed Use</option>
                  <option value="township">Township</option>
                </select>

                {/* Authority */}
                <select
                  value={authority}
                  onChange={(e) => { setAuthority(e.target.value); setPage(1); }}
                  className="h-9 w-auto min-w-[8rem] max-w-none shrink-0 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 outline-none cursor-pointer focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10"
                >
                  <option value="">Any Authority</option>
                  {authorityOptions.map((authorityName) => (
                    <option key={authorityName} value={authorityName}>
                      {authorityName.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="h-9 w-auto min-w-[7.5rem] max-w-none shrink-0 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 outline-none cursor-pointer focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10"
                  aria-label="Sort societies"
                >
                  <option value="overallScore">Best Score</option>
                  <option value="legalScore">Legal Score</option>
                  <option value="growthScore">Growth Score</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="viewCount">Most Viewed</option>
                  <option value="createdAt">Newest</option>
                </select>

                {/* Clear filters */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-[#ef4444] hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear ({activeFilterCount})
                  </button>
                )}
              </div>

            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            RESULTS HEADER
        ═══════════════════════════════════════════════════════════════ */}
        <section ref={resultsRef} className="mx-auto max-w-[1440px] px-3 pt-6 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-gray-600">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading societies...
                  </span>
                ) : (
                  <>
                    Showing <strong className="text-gray-900">{societies.length}</strong> of{' '}
                    <strong className="text-gray-900">{pagination.total.toLocaleString()}</strong> societies
                    {search && <> matching &quot;<strong className="text-[#029bba]">{search}</strong>&quot;</>}
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            RESULTS GRID / LIST
        ═══════════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-[1440px] px-3 pb-16 sm:px-4 lg:px-6">
          {loading ? (
            // Skeleton loader
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4'}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-gray-200 rounded-full" />
                      <div className="h-6 w-20 bg-gray-200 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-12 bg-gray-200 rounded" />
                      <div className="h-12 bg-gray-200 rounded" />
                      <div className="h-12 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-6 rounded-xl text-center">
              <XCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-red-700 mb-2">{error}</h3>
              <button
                onClick={fetchSocieties}
                className="mt-2 px-5 py-2 rounded-lg bg-[#ef4444] text-white font-semibold hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : societies.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No societies match your criteria</h3>
              <p className="text-gray-600 mb-6">
                {search
                  ? `No results for "${search}". Try a different search term or adjust filters.`
                  : 'Try adjusting your filters or browse all societies.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="px-5 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
                <Link href="/tools/verify-society">
                  <button className="px-5 py-2.5 rounded-xl border-2 border-[#029bba] text-[#029bba] font-semibold hover:bg-[#029bba] hover:text-white transition-all inline-flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Verify Custom Society
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {societies.map((s) => (
                    <SocietyCard key={s._id} society={s} />
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {societies.map((s) => (
                    <SocietyListItem key={s._id} society={s} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    ← Previous
                  </button>

                  {/* Page numbers (smart pagination) */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }).map((_, idx) => {
                      let pageNum: number;
                      if (pagination.pages <= 5) {
                        pageNum = idx + 1;
                      } else if (page <= 3) {
                        pageNum = idx + 1;
                      } else if (page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + idx;
                      } else {
                        pageNum = page - 2 + idx;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                            page === pageNum
                              ? 'bg-[#029bba] text-white shadow-md'
                              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            HOW WE SCORE (Trust Building)
        ═══════════════════════════════════════════════════════════════ */}
        <section className="bg-white py-16 border-t border-gray-200">
          <div className="mx-auto max-w-[1440px] px-3 sm:px-4 lg:px-6">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
                <Activity className="w-4 h-4" />
                Our Scoring Methodology
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                How We <span className="text-[#029bba]">Score</span> Societies
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Every society in our directory is evaluated across 6 intelligence dimensions —
                giving you a complete picture before you invest.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {[
                {
                  icon: <Shield className="w-6 h-6" />,
                  title: 'Legal Score',
                  description: 'NOC status, approval authority, court litigation history, and regulatory compliance.',
                  weight: '25%',
                },
                {
                  icon: <TrendingUp className="w-6 h-6" />,
                  title: 'Growth Score',
                  description: 'Historical price appreciation, demand trends, and 5-year market projections.',
                  weight: '20%',
                },
                {
                  icon: <Building2 className="w-6 h-6" />,
                  title: 'Infrastructure Score',
                  description: 'Roads, utilities, security, hospitals, schools, and commercial facilities.',
                  weight: '20%',
                },
                {
                  icon: <Clock className="w-6 h-6" />,
                  title: 'Possession Score',
                  description: 'On-time delivery track record, possession percentage, and development progress.',
                  weight: '15%',
                },
                {
                  icon: <Home className="w-6 h-6" />,
                  title: 'Livability Score',
                  description: 'Resident satisfaction, community amenities, safety ratings, and lifestyle quality.',
                  weight: '15%',
                },
                {
                  icon: <Award className="w-6 h-6" />,
                  title: 'Overall Score',
                  description: 'Weighted average of all scores. Quick at-a-glance trust indicator (0-100).',
                  weight: 'Composite',
                },
              ].map((item) => (
                <div key={item.title} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-[#029bba]/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] text-white flex items-center justify-center shadow-md">
                      {item.icon}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-bold">
                      {item.weight}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-3 py-8 sm:px-4 lg:px-6">
          <ContextualArticles
            title="Society News & Verification Guides"
            description="Published updates on housing societies, NOC checks, legal records, and city development."
            tags={['Society Reviews', 'Legal Guide', 'Verification', 'City Guide']}
          />
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            CROSS-TOOL CTA SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] py-16">
          <div className="mx-auto max-w-[1440px] px-3 sm:px-4 lg:px-6">
            <div className="max-w-4xl mx-auto text-center">
              <Sparkles className="w-10 h-10 text-[#06b6d4] mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Society Not Listed? <span className="text-[#06b6d4]">We&apos;ll Verify It For You</span>
              </h2>
              <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                Use our verification tool to check any society in Pakistan instantly,
                or explore our other intelligence tools for smarter decisions.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <Link href="/tools/verify-society">
                  <button className="px-5 py-3 rounded-xl bg-white text-[#004063] font-bold hover:bg-gray-100 transition-colors inline-flex items-center gap-2 shadow-md">
                    <Shield className="w-4 h-4" />
                    Verify Custom Society
                  </button>
                </Link>
                <Link href="/risk-alerts">
                  <button className="px-5 py-3 rounded-xl bg-white/15 text-white border-2 border-white/30 font-bold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Alert Board
                  </button>
                </Link>
                <Link href="/tools/price-estimator">
                  <button className="px-5 py-3 rounded-xl bg-white/15 text-white border-2 border-white/30 font-bold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Check Fair Price
                  </button>
                </Link>
              </div>

              <div className="inline-flex items-center gap-2 text-xs text-white/50">
                <Lock className="w-3 h-3" />
                100% Free · No Login · Data from official sources
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: Society Card (Grid View)
// ═══════════════════════════════════════════════════════════════

interface SocietyCardProps {
  society: SocietyListItem;
}

function SocietyCard({ society }: SocietyCardProps): React.ReactElement {
  const noc = NOC_LABELS[society.nocStatus] || NOC_LABELS.pending;
  const risk = RISK_LABELS[society.overallRiskLevel] || RISK_LABELS.caution;
  const categoryLabel = CATEGORY_LABELS[society.category] || society.category;

  return (
    <Link href={`/societies/${society.slug}`}>
      <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-[#029bba]/40 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col">

        {/* Image / Header */}
        <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          {society.featuredImage ? (
            <Image
              src={society.featuredImage}
              alt={society.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-16 h-16 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* NOC Badge */}
          <div className="absolute top-3 left-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${noc.color} text-xs font-bold shadow-lg backdrop-blur-sm`}>
              {noc.icon}
              {noc.label}
            </div>
          </div>

          {/* Verified Badge */}
          {society.isVerifiedByHighrise && (
            <div className="absolute top-3 right-3">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#029bba]/95 text-white text-[10px] font-bold backdrop-blur-sm shadow-lg">
                <BadgeCheck className="w-3 h-3" />
                Highrise Verified
              </div>
            </div>
          )}

          {/* Featured ribbon */}
          {society.isFeatured && !society.isVerifiedByHighrise && (
            <div className="absolute top-3 right-3">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f59e0b] text-white text-[10px] font-bold backdrop-blur-sm shadow-lg">
                <Star className="w-3 h-3 fill-white" />
                Featured
              </div>
            </div>
          )}

          {/* Active Alerts */}
          {society.activeAlertCount > 0 && (
            <div className="absolute bottom-3 left-3">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ef4444]/95 text-white text-[10px] font-bold backdrop-blur-sm shadow-lg animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {society.activeAlertCount} Alert{society.activeAlertCount > 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Overall Score Big Badge */}
          <div className="absolute bottom-3 right-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-lg">
              <div className="flex items-center gap-1.5">
                <div className={`text-lg font-extrabold ${getScoreColor(society.scores.overall)}`}>
                  {society.scores.overall}
                </div>
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                  /100<br />Score
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Title + Location */}
          <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 group-hover:text-[#029bba] transition-colors line-clamp-1">
            {society.name}
          </h3>
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{society.areaName}, {society.city}</span>
          </p>

          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">
              {categoryLabel}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#029bba]/10 text-[#029bba] text-[11px] font-bold">
              {society.approvalAuthority}
            </span>
            {society.launchYear && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 text-[11px]">
                Since {society.launchYear}
              </span>
            )}
          </div>

          {/* Scores Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <ScoreItem label="Legal" score={society.scores.legal} />
            <ScoreItem label="Growth" score={society.scores.growth} />
            <ScoreItem label="Infra" score={society.scores.infrastructure} />
          </div>

          {/* Risk + CTA */}
          <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${risk.bg} ${risk.color} text-xs font-bold`}>
              <Shield className="w-3 h-3" />
              {risk.label}
            </div>
            <span className="text-[#029bba] font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              View Report <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: Society List Item (List View)
// ═══════════════════════════════════════════════════════════════

function SocietyListItem({ society }: SocietyCardProps): React.ReactElement {
  const noc = NOC_LABELS[society.nocStatus] || NOC_LABELS.pending;
  const risk = RISK_LABELS[society.overallRiskLevel] || RISK_LABELS.caution;
  const categoryLabel = CATEGORY_LABELS[society.category] || society.category;

  return (
    <Link href={`/societies/${society.slug}`}>
      <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-[#029bba]/40 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col md:flex-row">

        {/* Image */}
        <div className="relative md:w-72 h-48 md:h-auto md:flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          {society.featuredImage ? (
            <Image
              src={society.featuredImage}
              alt={society.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 288px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-12 h-12 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          <div className="absolute top-3 left-3">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${noc.color} text-[10px] font-bold shadow-lg backdrop-blur-sm`}>
              {noc.icon}
              {noc.label}
            </div>
          </div>

          {society.activeAlertCount > 0 && (
            <div className="absolute bottom-3 left-3">
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#ef4444]/95 text-white text-[10px] font-bold backdrop-blur-sm shadow-lg animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {society.activeAlertCount}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-[#029bba] transition-colors line-clamp-1">
                {society.name}
              </h3>
              {society.isVerifiedByHighrise && (
                <BadgeCheck className="w-5 h-5 text-[#029bba] flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{society.areaName}, {society.city}</span>
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">
                {categoryLabel}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#029bba]/10 text-[#029bba] text-[11px] font-bold">
                {society.approvalAuthority}
              </span>
              {society.developerName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 text-[11px]">
                  <Building2 className="w-3 h-3" />
                  {society.developerName}
                </span>
              )}
            </div>

            {/* Mini scores inline */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Legal:</span>
                <span className={`font-bold ${getScoreColor(society.scores.legal)}`}>{society.scores.legal}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Growth:</span>
                <span className={`font-bold ${getScoreColor(society.scores.growth)}`}>{society.scores.growth}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Infra:</span>
                <span className={`font-bold ${getScoreColor(society.scores.infrastructure)}`}>{society.scores.infrastructure}</span>
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${risk.bg} ${risk.color} text-[10px] font-bold`}>
                <Shield className="w-2.5 h-2.5" />
                {risk.label}
              </div>
            </div>
          </div>

          {/* Right side: Overall score + CTA */}
          <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-2 md:flex-shrink-0">
            <div className="text-center md:text-right">
              <div className={`text-3xl font-extrabold ${getScoreColor(society.scores.overall)}`}>
                {society.scores.overall}
              </div>
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">/100 Overall</div>
            </div>
            <button className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold transition-colors group-hover:gap-2 whitespace-nowrap">
              View Report
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: Score Item (Mini progress bar)
// ═══════════════════════════════════════════════════════════════

interface ScoreItemProps {
  label: string;
  score: number;
}

function ScoreItem({ label, score }: ScoreItemProps): React.ReactElement {
  return (
    <div className="text-center">
      <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
        <div
          className={`absolute inset-y-0 left-0 ${getScoreBg(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className={`text-sm font-bold ${getScoreColor(score)}`}>{score}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}