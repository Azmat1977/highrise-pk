// pages/developers/index.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import type { GetStaticProps } from 'next';
import ContextualArticles from '@/components/blog/ContextualArticles';
import {
  Search,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Building2,
  ArrowRight,
  CheckCircle2,
  X,
  Briefcase,
  Award,
  AlertTriangle,
  Home,
  Loader2,
} from 'lucide-react';
import { PAKISTAN_CITIES as CANONICAL_CITIES } from '@/lib/pakistanCities';
import { PageSearchShell } from '@/components/search/PageSearchShell';
import type { SearchField } from '@/components/search/UnifiedSearchBar';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface DeveloperSummary {
  _id:                    string;
  companyName:            string;
  slug:                   string;
  logo?:                  { url: string };
  city?:                  string;
  operatingCities?:       string[];
  highriseScore?:         number;
  riskLevel?:             'low' | 'medium' | 'high';
  isVerified:             boolean;
  verificationLevel?:     string;
  activeProjectsCount?:   number;
  completedProjectsCount?: number;
  developerType?:         string;
  establishedYear?:       number;
}

interface PageProps {
  developers:   DeveloperSummary[];
  totalCount:   number;
  apiCities:    string[];
  fetchedAt:    string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const SITE_URL = 'https://highrise.pk';
const ISR_REVALIDATE = 60; // seconds
const INITIAL_LOAD   = 48;

// Canonical city source — same names as the header mega-menu and /cities.
const PAKISTAN_CITIES: string[] = CANONICAL_CITIES;

const DEVELOPER_TYPES = [
  { value: '',                label: 'All Types'            },
  { value: 'developer',      label: 'Real Estate Developer' },
  { value: 'builder',        label: 'Builder'               },
  { value: 'constructor',    label: 'Construction Company'  },
  { value: 'housing_society',label: 'Housing Society'       },
  { value: 'government',     label: 'Government Entity'     },
];

const TRUST_SCORE_RANGES = [
  { value: '',          label: 'All Scores',           min: 0,  max: 100 },
  { value: 'excellent', label: 'Excellent (80–100)',   min: 80, max: 100 },
  { value: 'good',      label: 'Good (60–79)',         min: 60, max: 79  },
  { value: 'average',   label: 'Average (40–59)',      min: 40, max: 59  },
  { value: 'below',     label: 'Below Average (0–39)', min: 0,  max: 39  },
];

const RISK_LEVELS = [
  { value: '',       label: 'All Risk Levels' },
  { value: 'low',    label: 'Low Risk'        },
  { value: 'medium', label: 'Medium Risk'     },
  { value: 'high',   label: 'High Risk'       },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function TrustScoreBadge({
  score,
}: {
  score?: number;
}): React.ReactElement {
  const s = score ?? 0;
  const colorClass =
    s >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : s >= 50 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : s > 0  ? 'text-red-700 bg-red-50 border-red-200'
    :          'text-gray-500 bg-gray-100 border-gray-200';

  return (
    <div
      className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border ${colorClass}`}
    >
      <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
        Trust Score
      </span>
      <span className="text-lg font-extrabold leading-none">{s}</span>
    </div>
  );
}

function DeveloperCard({
  dev,
}: {
  dev: DeveloperSummary;
}): React.ReactElement {
  return (
    <Link href={`/developers/${dev.slug}`} className="group relative block h-full">
      <div className="h-full bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:border-[#029bba]/30 group-hover:-translate-y-1">

        {/* Logo + Trust Score */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {dev.logo?.url ? (
              <Image
                src={dev.logo.url}
                alt={`${dev.companyName} logo`}
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300">
                <Building2 className="h-6 w-6" />
              </div>
            )}
          </div>
          <TrustScoreBadge score={dev.highriseScore} />
        </div>

        {/* Name + Verified */}
        <div className="px-6">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="line-clamp-1 text-lg font-bold text-gray-900 transition-colors group-hover:text-[#029bba]">
              {dev.companyName}
            </h3>
            {dev.isVerified && (
              <CheckCircle2 className="h-4 w-4 shrink-0 fill-blue-50 text-[#029bba]" />
            )}
          </div>

          {/* Location + Type */}
          <div className="mb-4 flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {dev.city ?? 'Pakistan'}
            </span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span className="capitalize">
              {dev.developerType ?? 'Developer'}
            </span>
          </div>

          {/* Metrics */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gray-50 p-2.5 text-center">
              <span className="block text-xl font-bold text-gray-900">
                {dev.activeProjectsCount ?? 0}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Ongoing
              </span>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5 text-center">
              <span className="block text-xl font-bold text-gray-900">
                {dev.completedProjectsCount ?? 0}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Completed
              </span>
            </div>
          </div>

          {/* Risk badge */}
          {dev.riskLevel === 'low' && (
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              <ShieldCheck className="h-3 w-3" />
              Low Risk Certified
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4 transition-colors group-hover:bg-[#029bba]/5">
          <span className="text-sm font-medium text-gray-600 group-hover:text-[#029bba]">
            View Profile
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-all group-hover:border-[#029bba] group-hover:text-[#029bba]">
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function DeveloperCardSkeleton(): React.ReactElement {
  return (
    <div className="h-80 animate-pulse rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-6 flex justify-between">
        <div className="h-16 w-16 rounded-xl bg-gray-200" />
        <div className="h-12 w-12 rounded-lg bg-gray-200" />
      </div>
      <div className="mb-4 h-6 w-3/4 rounded bg-gray-200" />
      <div className="mb-8 h-4 w-1/2 rounded bg-gray-200" />
      <div className="flex gap-2">
        <div className="h-16 flex-1 rounded-lg bg-gray-200" />
        <div className="h-16 flex-1 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// JSON-LD
// ─────────────────────────────────────────────

function buildJsonLd(developers: DeveloperSummary[]): string {
  const itemList = {
    '@context':        'https://schema.org',
    '@type':           'ItemList',
    name:              'Verified Real Estate Developers in Pakistan',
    description:       'Top verified real estate developers listed on Highrise.pk with trust scores and project history.',
    url:               `${SITE_URL}/developers`,
    numberOfItems:     developers.length,
    itemListElement:   developers.slice(0, 10).map((dev, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      name:       dev.companyName,
      url:        `${SITE_URL}/developers/${dev.slug}`,
    })),
  };
  return JSON.stringify(itemList);
}

// ─────────────────────────────────────────────
// getStaticProps — ISR
// ─────────────────────────────────────────────

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  try {
    const res  = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/developers?limit=${INITIAL_LOAD}&sort=verified`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!res.ok) {
      return {
        props: { developers: [], totalCount: 0, apiCities: [], fetchedAt: new Date().toISOString() },
        revalidate: ISR_REVALIDATE,
      };
    }

    // API contract: { success, data: { developers, pagination, cities } }
    // (fall back to the old flat shape so an API rollback keeps the page alive)
    const data = await res.json();
    const payload = (data?.data ?? data) as {
      developers?: DeveloperSummary[];
      pagination?: { total?: number };
      cities?:     unknown[];
    };

    return {
      props: {
        developers: (payload.developers ?? []) as DeveloperSummary[],
        totalCount:
          (data.totalCount as number | undefined) ??
          (payload.pagination?.total as number | undefined) ??
          0,
        apiCities: Array.isArray(payload.cities)
          ? (payload.cities.filter(
              (city): city is string => typeof city === 'string' && city.trim().length > 0
            ).map((city) => city.trim()))
          : [],
        fetchedAt:  new Date().toISOString(),
      },
      revalidate: ISR_REVALIDATE,
    };
  } catch {
    return {
      props: { developers: [], totalCount: 0, apiCities: [], fetchedAt: new Date().toISOString() },
      revalidate: ISR_REVALIDATE,
    };
  }
};

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

export default function DevelopersDirectoryPage({
  developers,
  totalCount,
  apiCities,
}: PageProps): React.ReactElement {
  const router = useRouter();

  // ── Filter state ──
  const [searchTerm,         setSearchTerm]         = useState('');
  const [selectedCity,       setSelectedCity]       = useState('');
  const [selectedType,       setSelectedType]       = useState('');
  const [selectedScoreRange, setSelectedScoreRange] = useState('');
  const [selectedRiskLevel,  setSelectedRiskLevel]  = useState('');
  const [verifiedOnly,       setVerifiedOnly]       = useState(false);

  // ── URL-based city filter (?city=Lahore) — deep links + in-page nav ──
  const cityTouchedRef = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;
    const cityParam = typeof router.query.city === 'string' ? router.query.city : '';
    setSelectedCity(cityParam);
  }, [router.isReady, router.query.city]);

  useEffect(() => {
    if (!router.isReady || !cityTouchedRef.current) return;
    const params: Record<string, string> = {};
    if (selectedCity) params.city = selectedCity;
    router.replace(
      { pathname: '/developers', query: params },
      undefined,
      { shallow: true, scroll: false }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, selectedCity]);

  // ── Load more ──
  const [extraDevs,    setExtraDevs]    = useState<DeveloperSummary[]>([]);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [noMorePages,  setNoMorePages]  = useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);

  // ─────────────────────────────────────────
  // Client-side filter on ISR data + extras
  // ─────────────────────────────────────────

  const allDevelopers = useMemo(
    () => [...developers, ...extraDevs],
    [developers, extraDevs]
  );

  const hasActiveFilters = Boolean(
    searchTerm || selectedCity || selectedType ||
    selectedScoreRange || selectedRiskLevel || verifiedOnly
  );

  const filteredDevelopers = useMemo(() => {
    const scoreRange = TRUST_SCORE_RANGES.find(
      (r) => r.value === selectedScoreRange
    ) ?? { min: 0, max: 100 };

    const q = searchTerm.trim().toLowerCase();

    return allDevelopers
      .filter((dev) => {
        if (q && !dev.companyName.toLowerCase().includes(q) &&
            !dev.city?.toLowerCase().includes(q)) return false;

        if (selectedCity) {
          const cityMatch =
            dev.city?.toLowerCase() === selectedCity.toLowerCase() ||
            dev.operatingCities?.some(
              (c) => c.toLowerCase() === selectedCity.toLowerCase()
            );
          if (!cityMatch) return false;
        }

        if (selectedType &&
            dev.developerType?.toLowerCase() !== selectedType.toLowerCase())
          return false;

        if (selectedScoreRange) {
          const s = dev.highriseScore ?? 0;
          if (s < scoreRange.min || s > scoreRange.max) return false;
        }

        if (selectedRiskLevel && dev.riskLevel !== selectedRiskLevel)
          return false;

        if (verifiedOnly && !dev.isVerified) return false;

        return true;
      })
      .sort((a, b) => {
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        return (b.highriseScore ?? 0) - (a.highriseScore ?? 0);
      });
  }, [
    allDevelopers,
    searchTerm,
    selectedCity,
    selectedType,
    selectedScoreRange,
    selectedRiskLevel,
    verifiedOnly,
  ]);

  const featuredDevelopers = hasActiveFilters
    ? []
    : filteredDevelopers.filter(
        (developer) => developer.isVerified && (developer.activeProjectsCount ?? 0) > 0
      ).slice(0, 3);
  const featuredDeveloperIds = new Set(featuredDevelopers.map((developer) => developer._id));
  const directoryDevelopers = filteredDevelopers.filter(
    (developer) => !featuredDeveloperIds.has(developer._id)
  );

  const clearAllFilters = (): void => {
    setSearchTerm('');
    cityTouchedRef.current = true;
    setSelectedCity('');
    setSelectedType('');
    setSelectedScoreRange('');
    setSelectedRiskLevel('');
    setVerifiedOnly(false);
  };

  // ── City options — endpoint cities first (real records), static list fills gaps ──
  const cityOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const city of [...apiCities, ...PAKISTAN_CITIES]) {
      const key = city.toLowerCase();
      if (!city || seen.has(key)) continue;
      seen.add(key);
      list.push(city);
    }
    return list;
  }, [apiCities]);

  // ─────────────────────────────────────────
  // Load more
  // ─────────────────────────────────────────

  const handleLoadMore = async (): Promise<void> => {
    if (loadingMore || noMorePages) return;
    setLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const res = await fetch(
        `/api/developers?page=${nextPage}&limit=${INITIAL_LOAD}&sort=verified`,
        { credentials: 'include' }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setNoMorePages(true);
        return;
      }

      // API contract: { success, data: { developers } } (flat shape kept as fallback)
      const payload = (data.data ?? data) as { developers?: DeveloperSummary[] };
      const incoming = (payload.developers ?? []) as DeveloperSummary[];
      if (incoming.length === 0 || incoming.length < INITIAL_LOAD) {
        setNoMorePages(true);
      }
      setExtraDevs((prev) => {
        const seen = new Set(prev.map((d) => d._id));
        return [
          ...prev,
          ...incoming.filter((d) => !seen.has(d._id)),
        ];
      });
      setCurrentPage(nextPage);
    } catch {
      setNoMorePages(true);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Phase 5 search shell ──────────────────────────────────────────────────
  const activeFilterCount = [
    searchTerm,
    selectedCity,
    selectedType,
    selectedScoreRange,
    selectedRiskLevel,
    verifiedOnly ? 'verified' : '',
  ].filter(Boolean).length;

  // Descriptors only: the shell reads and writes this page's own state.
  const searchFields: SearchField[] = useMemo(
    () => [
      {
        key: 'city',
        kind: 'select',
        label: 'City',
        icon: MapPin,
        searchable: true,
        grow: 1.1,
        value: selectedCity,
        onChange: (value) => {
          cityTouchedRef.current = true;
          setSelectedCity(value);
        },
        options: [
          { value: '', label: 'All Cities' },
          ...cityOptions.map((city) => ({ value: city, label: city })),
        ],
      },
      {
        key: 'developer',
        kind: 'text',
        label: 'Developer Name',
        icon: Search,
        grow: 1.4,
        placeholder: 'Search by developer name',
        value: searchTerm,
        onChange: setSearchTerm,
        onSubmit: () => setSearchTerm(searchTerm.trim()),
      },
    ],
    [selectedCity, searchTerm, cityOptions]
  );

  // ─────────────────────────────────────────
  // ISR fallback skeleton
  // ─────────────────────────────────────────

  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-[1440px] px-3 py-20 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <DeveloperCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // JSON-LD
  // ─────────────────────────────────────────

  const jsonLd = buildJsonLd(developers);


  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <>
      <Head>
        <title>
          Verified Real Estate Developers in Pakistan | Highrise.pk
        </title>
        <meta
          name="description"
          content="Find trusted and KYC-verified real estate developers in Pakistan. Check Highrise Trust Scores™, delivery rates, and past projects before you invest."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_URL}/developers`} />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="Verified Real Estate Developers in Pakistan | Highrise.pk" />
        <meta property="og:description" content="Find trusted and KYC-verified real estate developers in Pakistan. Check Highrise Trust Scores™ before you invest." />
        <meta property="og:url"         content={`${SITE_URL}/developers`} />
        <meta property="og:image"       content={`${SITE_URL}/og/developers.jpg`} />
        <meta property="og:site_name"   content="Highrise.pk" />

        {/* Twitter */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Verified Developers | Highrise.pk" />
        <meta name="twitter:description" content="Pakistan's first trust-scored developer directory." />
        <meta name="twitter:image"       content={`${SITE_URL}/og/developers.jpg`} />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd.replace(/</g, '\\u003c') }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* PHASE 5 - unified navy banner + single-row search shell (full-bleed). */}
        <PageSearchShell
          title="Discover Verified Developers"
          subtitle="Browse top builders and their portfolios."
          breadcrumb={
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-blue-100/75"
            >
              <Link href="/" className="flex items-center gap-1 transition-colors hover:text-white">
                <Home className="h-3 w-3" />
                <span>Home</span>
              </Link>
              <span className="text-blue-200/40">/</span>
              <span className="text-white">Developers</span>
            </nav>
          }
          fields={searchFields}
          onSubmit={() => setSearchTerm(searchTerm.trim())}
          submitLabel="Search"
          mobileLabel="Search Developers"
          activeFilterCount={activeFilterCount}
          onReset={clearAllFilters}
        />

        {/* ── Secondary filters (kept below the banner so the shell stays one row) ── */}
        <div className="mx-auto max-w-[1440px] px-3 pt-4 pb-2 sm:px-4 lg:px-6">
          <div className="flex flex-wrap items-center gap-2">

            {/* Verified toggle */}
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-gray-200 transition-colors peer-checked:bg-[#029bba]" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="flex items-center gap-1 text-[13px] font-medium text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-[#029bba]" />
                Verified
              </span>
            </label>

            {/* Type */}
            <div className="flex h-9 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3">
              <Briefcase className="h-4 w-4 shrink-0 text-[#029bba]" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                aria-label="Developer type"
                className="w-full cursor-pointer border-none bg-transparent text-sm text-gray-700 outline-none focus:ring-0"
              >
                {DEVELOPER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Trust score */}
            <div className="flex h-9 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3">
              <Award className="h-4 w-4 shrink-0 text-[#029bba]" />
              <select
                value={selectedScoreRange}
                onChange={(e) => setSelectedScoreRange(e.target.value)}
                aria-label="Trust score"
                className="w-full cursor-pointer border-none bg-transparent text-sm text-gray-700 outline-none focus:ring-0"
              >
                {TRUST_SCORE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Risk level */}
            <div className="flex h-9 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#029bba]" />
              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                aria-label="Risk level"
                className="w-full cursor-pointer border-none bg-transparent text-sm text-gray-700 outline-none focus:ring-0"
              >
                {RISK_LEVELS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchTerm && (
                <FilterChip
                  label={`Search: "${searchTerm}"`}
                  onRemove={() => setSearchTerm('')}
                />
              )}
              {selectedCity && (
                <FilterChip
                  label={`City: ${selectedCity}`}
                  onRemove={() => {
                    cityTouchedRef.current = true;
                    setSelectedCity('');
                  }}
                />
              )}
              {selectedType && (
                <FilterChip
                  label={`Type: ${DEVELOPER_TYPES.find((t) => t.value === selectedType)?.label ?? selectedType}`}
                  onRemove={() => setSelectedType('')}
                />
              )}
              {selectedScoreRange && (
                <FilterChip
                  label={`Score: ${TRUST_SCORE_RANGES.find((r) => r.value === selectedScoreRange)?.label ?? selectedScoreRange}`}
                  onRemove={() => setSelectedScoreRange('')}
                />
              )}
              {selectedRiskLevel && (
                <FilterChip
                  label={`Risk: ${RISK_LEVELS.find((r) => r.value === selectedRiskLevel)?.label ?? selectedRiskLevel}`}
                  onRemove={() => setSelectedRiskLevel('')}
                />
              )}
              {verifiedOnly && (
                <FilterChip
                  label="Verified Only"
                  onRemove={() => setVerifiedOnly(false)}
                  green
                />
              )}
            </div>
          )}
        </div>

        {/* ── Results ── */}
        <div className="mx-auto max-w-[1440px] px-3 py-8 sm:px-4 lg:px-6">

          {featuredDevelopers.length > 0 && (
            <section aria-labelledby="featured-developers-heading" className="mb-10 border-b border-gray-200 pb-8">
              <div className="mb-4">
                <p className="mb-1 text-xs font-bold text-[#029bba]">VERIFIED WITH ACTIVE PROJECTS</p>
                <h2 id="featured-developers-heading" className="text-xl font-black text-[#004063] md:text-2xl">
                  Featured Developers
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featuredDevelopers.map((dev) => <DeveloperCard key={dev._id} dev={dev} />)}
              </div>
            </section>
          )}

          {/* Results header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <TrendingUp className="text-[#029bba]" />
                {hasActiveFilters ? 'Filtered Results' : 'Top Rated Developers'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters
                  ? `${filteredDevelopers.length} developer${filteredDevelopers.length !== 1 ? 's' : ''} matching your criteria`
                  : `Showing ${allDevelopers.length} of ${totalCount} developers`}
              </p>
            </div>
          </div>

          {/* Grid */}
          {filteredDevelopers.length > 0 ? (
            <>
              {directoryDevelopers.length > 0 && (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {directoryDevelopers.map((dev) => (
                    <DeveloperCard key={dev._id} dev={dev} />
                  ))}
                </div>
              )}

              {/* Load More */}
              {!hasActiveFilters && !noMorePages && (
                <div className="mt-12 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-[#029bba] hover:text-[#029bba] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Developers'
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                No Developers Found
              </h3>
              <p className="mb-6 text-gray-500">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search terms.'
                  : 'No developers available at the moment.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-lg bg-[#029bba] px-6 py-2 font-medium text-white transition-colors hover:bg-[#027a94]"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
        <div className="mx-auto max-w-[1440px] px-3 pb-8 sm:px-4 lg:px-6">
          <ContextualArticles
            title="Developer News & Insights"
            description="Published builder updates, project analysis, and real-estate investment guides."
            tags={['Developer News', 'Market Analysis', 'Project Reviews', 'Investment']}
          />
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// FilterChip helper
// ─────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
  green = false,
}: {
  label:    string;
  onRemove: () => void;
  green?:   boolean;
}): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
        green
          ? 'bg-green-100 text-green-700'
          : 'bg-[#029bba]/10 text-[#029bba]'
      }`}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="hover:text-red-500 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}