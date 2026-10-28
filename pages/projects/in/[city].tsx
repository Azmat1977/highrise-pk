/**
 * pages/projects/in/[city].tsx
 * City-Scoped New Projects Directory - Highrise.pk
 *
 * Dedicated SEO Landing Page for city-specific real estate listings.
 * Example URLs:
 *   - /projects/in/islamabad
 *   - /projects/in/lahore
 *   - /projects/in/karachi
 *   - /projects/in/rawalpindi
 */

import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import {
  Search,
  MapPin,
  Building2,
  Banknote,
  ShieldCheck,
  RotateCcw,
  Home,
  ChevronRight,
  X,
  CreditCard,
  Clock,
  ArrowUp,
  Sparkles,
} from 'lucide-react';

import {
  type FilterState,
  type ProjectsPageProps,
  type SortOption,
  type ProjectListing,
  type PropertyType,
  type ProjectCategory,
  type PossessionStatus,
  type BudgetTierKey,
  type ReadyPropertyItem,
  DEFAULT_FILTERS,
  buildQueryString,
  parseFiltersFromQuery,
  escapeRegExp,
  computeStubShield,
  PROJECT_CATEGORY_LABELS,
  BUDGET_TIERS,
  getMatchingBudgetTier,
  budgetTierToRange,
} from '@/types/projects';

import { MainProjectGrid } from '@/components/projects/MainProjectGrid';
import { FilterDropdown } from '@/components/projects/FilterDropdown';
import { ReadyPropertiesCrossSell } from '@/components/projects/ReadyPropertiesCrossSell';
import ProjectCityLinks from '@/components/projects/ProjectCityLinks';
import AuthGateModal from '@/components/auth/AuthGateModal';
import Property from '@/models/Property';
import Project from '@/models/Projects';
import dbConnect from '@/lib/dbConnect';
import {
  getCityCounts,
  getProjectCategoryCounts,
  getProjectNatureCounts,
  getHotspotAreas,
} from '@/lib/cache/projectAggregations';
import { PAKISTAN_CITIES as CANONICAL_CITIES } from '@/lib/pakistanCities';

const POSSESSION_OPTIONS: Array<{ value: PossessionStatus; label: string }> = [
  { value: 'ready_to_move', label: 'Ready to Move' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'new_launch', label: 'New Launch' },
  { value: 'pre_launch', label: 'Pre-Launch' },
];

// Canonical city source — same names as the header mega-menu and /cities.
const PAKISTAN_CITIES: string[] = CANONICAL_CITIES;

function normalizeCityName(raw?: string): string {
  if (!raw) return '';
  const decoded = decodeURIComponent(raw).trim().toLowerCase();
  const matched = PAKISTAN_CITIES.find(c => c.toLowerCase() === decoded);
  if (matched) return matched;
  return decoded.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const CityProjectsPage: NextPage<ProjectsPageProps> = ({
  initialFilters,
  initialProjects,
  totalCount,
  cityCounts,
  categoryCounts,
  natureCounts,
  budgetBands,
  hotspots,
  platformStats,
  tabCounts,
  featuredProjects,
  readyProperties = [],
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.locality || '');
  const [isSticky, setIsSticky] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const cityName = filters.city || 'Pakistan';
  const citySlug = cityName.toLowerCase();

  useEffect(() => {
    setSearchTerm(filters.locality || '');
  }, [filters.locality]);

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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSearchSubmit = () => {
    if (searchTerm !== (filters.locality || '')) {
      updateFilters({ locality: searchTerm });
    }
  };

  const handleSaveSearchClick = () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
    } else {
      setToast({
        message: `Search saved successfully! We will notify you of new verified projects in ${cityName}.`,
        type: 'success',
      });
    }
  };

  const updateFilters = useCallback(
    (patch: Partial<FilterState>) => {
      const next = { ...filters, ...patch, page: 1 };
      setFilters(next);
      setLoading(true);

      // If user clears city or changes to another city, redirect accordingly
      if (patch.city !== undefined && patch.city !== filters.city) {
        if (!patch.city) {
          void router.push('/projects');
        } else {
          void router.push(`/projects/in/${encodeURIComponent(patch.city.toLowerCase())}`);
        }
        return;
      }

      const qs = buildQueryString(next);
      void router.push(
        `/projects/in/${encodeURIComponent(citySlug)}${qs ? `?${qs}` : ''}`,
        undefined,
        { shallow: false, scroll: false }
      );
    },
    [filters, router, citySlug]
  );

  const pageTitle = `New Projects in ${cityName} | Verified Real Estate | Highrise.pk`;
  const pageDesc = `Browse ${totalCount}+ verified new projects in ${cityName}. NOC approved developments, installment plans, and trusted builders on Highrise.pk.`;
  const canonical = `https://highrise.pk/projects/in/${encodeURIComponent(citySlug)}`;

  const activeFilterCount = [
    filters.type,
    filters.minBudget, filters.maxBudget,
    filters.minArea, filters.maxArea,
    filters.possession,
    filters.noc ? 'noc' : '',
    filters.builder, filters.locality,
  ].filter(Boolean).length;

  const noindex = activeFilterCount >= 3 || filters.page > 1;

  const citiesToShow = (() => {
    const countMap = new Map<string, number>();
    cityCounts.forEach(c => countMap.set(c.city.toLowerCase(), c.count));

    const merged = PAKISTAN_CITIES.map(cName => ({
      city: cName,
      count: countMap.get(cName.toLowerCase()) ?? 0,
    }));

    return merged.sort((a, b) => {
      if (a.count > 0 && b.count === 0) return -1;
      if (a.count === 0 && b.count > 0) return 1;
      if (a.count !== b.count) return b.count - a.count;
      return a.city.localeCompare(b.city);
    });
  })();

  const siteUrl = 'https://highrise.pk';

  const collectionPageLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    url: canonical,
    description: pageDesc,
    numberOfItems: totalCount,
    provider: {
      '@type': 'Organization',
      name: 'Highrise.pk',
      url: siteUrl,
      logo: `${siteUrl}/images/logo.png`,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: initialProjects.length,
      itemListElement: initialProjects.map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${siteUrl}/projects/${p.slug}`,
        item: {
          '@type': 'RealEstateListing',
          name: p.projectName,
          description: p.tagline || `${p.projectName} in ${p.area || p.city}`,
          url: `${siteUrl}/projects/${p.slug}`,
          image: p.primaryImage ? [p.primaryImage] : undefined,
          datePosted: p.createdAt,
          address: {
            '@type': 'PostalAddress',
            addressLocality: p.area || cityName,
            addressRegion: cityName,
            addressCountry: 'PK',
          },
          seller: p.developerName ? {
            '@type': 'Organization',
            name: p.developerName,
          } : undefined,
        },
      })),
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Projects', item: `${siteUrl}/projects` },
      { '@type': 'ListItem', position: 3, name: cityName, item: canonical },
    ],
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonical} />
        {noindex && <meta name="robots" content="noindex, follow" />}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content="https://highrise.pk/og-projects.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageLd).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }}
        />
      </Head>

      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl bg-white border border-gray-200 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm sm:max-w-md">
          {toast.type === 'success' ? (
            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-gray-800 leading-tight">
            {toast.message}
          </span>
          <button onClick={() => setToast(null)} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <AuthGateModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        actionDescription={`save search alerts for ${cityName}`}
        title={`Save Search in ${cityName}`}
      />

      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">

          {/* Breadcrumbs and Header Zone */}
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <Link href="/projects" className="hover:text-[#029bba] font-medium transition-colors">
                New Projects
              </Link>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className="text-[#004063] font-bold">{cityName}</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#004063] tracking-tight">
                  Explore Verified Projects in {cityName}
                </h1>
                <p className="text-xs md:text-sm text-gray-600 font-semibold mt-1 flex flex-wrap items-center gap-2">
                  <span>{totalCount.toLocaleString()} Verified Projects</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-emerald-600 font-bold">NOC Approved</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-[#029bba] font-bold">Easy Installment Plans</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSaveSearchClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#004063] hover:to-[#029bba] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Save Search &amp; Get Alerts</span>
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => updateFilters({ ...DEFAULT_FILTERS, city: cityName })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters ({activeFilterCount})
                  </button>
                )}
              </div>
            </div>

            {/* Popular Localities Discovery Hub */}
            {hotspots && hotspots.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-150 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
                  <span>Popular Areas in {cityName}:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hotspots.map((h, idx) => {
                    const areaName = typeof h === 'string' ? h : h.area;
                    const localitySlug = areaName
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '');

                    return (
                      <Link
                        key={idx}
                        href={`/projects/in/${encodeURIComponent(citySlug)}/${encodeURIComponent(localitySlug)}`}
                        className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 hover:border-[#029bba] rounded-xl text-xs font-semibold text-gray-700 hover:text-[#029bba] shadow-2xs transition-all hover:-translate-y-0.5 flex items-center gap-1.5"
                      >
                        <span>{areaName}</span>
                        {typeof h !== 'string' && typeof h.projectCount === 'number' && h.projectCount > 0 && (
                          <span className="text-[10px] text-gray-400 font-bold">
                            ({h.projectCount})
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className={`transition-all duration-300 md:sticky md:top-[64px] z-30 bg-white rounded-2xl border shadow-sm p-4 space-y-4 relative ${
            isSticky
              ? 'md:bg-white/95 md:backdrop-blur-md md:border-gray-300 md:shadow-md md:py-3 md:px-5'
              : 'border-gray-200 md:p-5'
          }`}>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  placeholder={`Search project name or locality in ${cityName}...`}
                  className="w-full h-11 pl-10 pr-24 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-[#029bba] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-[#029bba] hover:bg-[#004063] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  Search
                </button>
              </div>

              <div className="w-full md:w-56">
                <FilterDropdown
                  icon={MapPin}
                  placeholder={cityName}
                  value={cityName}
                  onChange={(v) => updateFilters({ city: v })}
                  searchable
                  options={[
                    { value: '', label: 'All Cities' },
                    ...citiesToShow.map((c) => ({
                      value: c.city,
                      label: c.city,
                      count: c.count > 0 ? c.count : undefined,
                    })),
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 relative z-30">
              <FilterDropdown
                icon={Building2}
                placeholder="Category"
                value={filters.category || ''}
                onChange={(v) => updateFilters({ category: v as ProjectCategory | '' })}
                options={[
                  { value: '', label: 'All Categories' },
                  ...(Object.keys(PROJECT_CATEGORY_LABELS) as ProjectCategory[]).map((key) => ({
                    value: key,
                    label: PROJECT_CATEGORY_LABELS[key],
                  })),
                ]}
              />

              <FilterDropdown
                icon={Clock}
                placeholder="Possession"
                value={filters.possession || ''}
                onChange={(v) => updateFilters({ possession: v as PossessionStatus | '' })}
                options={[
                  { value: '', label: 'Any Possession' },
                  ...POSSESSION_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  })),
                ]}
              />

              <FilterDropdown
                icon={Banknote}
                placeholder="Budget Tier"
                value={getMatchingBudgetTier(filters.minBudget, filters.maxBudget) || ''}
                onChange={(v) => updateFilters(budgetTierToRange(v as BudgetTierKey | ''))}
                options={[
                  { value: '', label: 'Any Budget' },
                  ...BUDGET_TIERS.map((t) => ({ value: t.key, label: t.label })),
                ]}
              />

              <button
                type="button"
                onClick={() => updateFilters({ installments: !filters.installments })}
                className={`h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  filters.installments
                    ? 'bg-[#029bba] border-[#029bba] text-white shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#029bba]/40 hover:text-[#029bba]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Installments</span>
              </button>

              <button
                type="button"
                onClick={() => updateFilters({ noc: !filters.noc })}
                className={`h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  filters.noc
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#029bba]/40 hover:text-[#029bba]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>NOC Approved</span>
              </button>
            </div>

            {/* Active Chips */}
            {activeFilterCount > 0 && (
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400">Active Filters:</span>
                {filters.locality && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                    Locality: {filters.locality}
                    <button type="button" onClick={() => updateFilters({ locality: '' })} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filters.category && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                    {PROJECT_CATEGORY_LABELS[filters.category] || filters.category}
                    <button type="button" onClick={() => updateFilters({ category: '' })} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filters.installments && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] border border-[#029bba]/20 rounded-lg text-xs font-bold">
                    On Installments
                    <button type="button" onClick={() => updateFilters({ installments: false })} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filters.noc && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                    NOC Approved
                    <button type="button" onClick={() => updateFilters({ noc: false })} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => updateFilters({ ...DEFAULT_FILTERS, city: cityName })}
                  className="text-xs font-bold text-red-600 hover:underline ml-2"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Results Grid */}
          <div className="relative z-10">
            <MainProjectGrid
              filters={filters}
              updateFilters={updateFilters}
              initialProjects={initialProjects}
              totalCount={totalCount}
            />
          </div>

          {/* Cross-Sell */}
          <ReadyPropertiesCrossSell
            properties={readyProperties}
            city={cityName}
          />

          {/* SEO Locality Guide */}
          <ProjectCityLinks city={cityName} cities={cityCounts} />
        </div>

        {/* Back to Top */}
        <div className={`fixed bottom-6 left-0 right-0 flex justify-center z-40 transition-all duration-300 pointer-events-none ${
          isSticky ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'
        }`}>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
            className="pointer-events-auto w-12 h-12 rounded-full bg-[#029bba] hover:bg-[#004063] text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#029bba]/50 border-2 border-white"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<ProjectsPageProps> = async ({ params, query, req }) => {
  try {
    const rawCityParam = params?.city as string | undefined;
    const resolvedCity = normalizeCityName(rawCityParam);

    if (!resolvedCity) {
      return {
        redirect: {
          destination: '/projects',
          permanent: false,
        },
      };
    }

    const clientIp = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';

    let rateLimitOk = true;
    try {
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis } = await import('@upstash/redis');
      const ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        prefix: 'rl:projects:city:ssr',
      });
      const result = await ratelimit.limit(clientIp);
      rateLimitOk = result.success;
    } catch {
      rateLimitOk = true;
    }

    if (!rateLimitOk) {
      return {
        props: {
          initialFilters: { ...DEFAULT_FILTERS, city: resolvedCity },
          initialProjects: [],
          totalCount: 0,
          cityCounts: [],
          categoryCounts: [],
          natureCounts: [],
          budgetBands: [],
          hotspots: [],
          platformStats: { totalProjects: 0, totalDevelopers: 0, totalVerified: 0, totalCities: 0 },
          tabCounts: [],
          featuredProjects: [],
          readyProperties: [],
        },
      };
    }

    await dbConnect();
    const filters = {
      ...parseFiltersFromQuery(query as Record<string, string | string[] | undefined>),
      city: resolvedCity,
    };

    const base: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: 'verified',
      verificationStatus: 'verified',
      developerApprovalStatus: 'approved',
      city: { $regex: new RegExp(`^${escapeRegExp(resolvedCity)}$`, 'i') },
    };

    if (filters.category) {
      base.projectCategory = { $regex: new RegExp(escapeRegExp(filters.category), 'i') };
    }
    if (filters.noc) base.nocStatus = 'approved';
    if (filters.installments) base.saleMode = { $in: ['Installment', 'Both'] };

    if (filters.possession) {
      const map: Record<string, string> = {
        ready_to_move: 'Completed',
        under_construction: 'Under Development',
        new_launch: 'Launched',
        pre_launch: 'Pre-Launch',
      };
      if (map[filters.possession]) base.projectStatus = map[filters.possession];
    }

    if (filters.minBudget || filters.maxBudget) {
      const pf: Record<string, number> = {};
      if (filters.minBudget) pf.$gte = filters.minBudget;
      if (filters.maxBudget) pf.$lte = filters.maxBudget;
      base.minPrice = pf;
    }

    const sortMap: Record<SortOption, Record<string, 1 | -1>> = {
      relevance: { highriseScore: -1, createdAt: -1 },
      price_asc: { minPrice: 1, createdAt: -1 },
      price_desc: { minPrice: -1, createdAt: -1 },
      possession: { possessionStartDate: 1, createdAt: -1 },
      newest: { createdAt: -1, _id: -1 },
    };

    const PAGE_SIZE = 12;
    const skip = (filters.page - 1) * PAGE_SIZE;

    const [
      rawProjects,
      total,
      cityCounts,
      categoryCounts,
      natureCounts,
      hotspots,
    ] = await Promise.all([
      Project.find(base)
        .sort(sortMap[filters.sort] ?? sortMap.relevance)
        .skip(skip)
        .limit(PAGE_SIZE)
        .select({
          _id: 1, slug: 1, projectName: 1, tagline: 1,
          city: 1, area: 1, projectCategory: 1,
          projectNature: 1, projectStatus: 1, saleMode: 1,
          isVerified: 1, isFeatured: 1, promotionEndDate: 1, isTrustedBuilder: 1,
          developerBadge: 1, minPrice: 1, maxPrice: 1,
          highriseScore: 1, nocStatus: 1, approvalAuthority: 1,
          unitsAvailable: 1, totalUnits: 1,
          featureImageUrl: 1, 'images.url': 1, 'images.isPrimary': 1,
          developerId: 1, 'developerProfile.name': 1, 'developerProfile.logoUrl': 1,
          'unitTypeBreakdown.areaRangeMarla': 1,
          'unitTypeBreakdown.bedrooms': 1,
          createdAt: 1,
        })
        .maxTimeMS(5000)
        .lean(),
      Project.countDocuments(base).maxTimeMS(3000),
      getCityCounts(),
      getProjectCategoryCounts(base),
      getProjectNatureCounts(base),
      getHotspotAreas(resolvedCity),
    ]);

    const projects: ProjectListing[] = (rawProjects as Array<Record<string, unknown>>).map(p => {
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') {
        primaryImage = p.featureImageUrl;
      } else if (Array.isArray(p.images) && p.images.length > 0) {
        const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
        primaryImage = imgs.find(i => i?.isPrimary)?.url ?? imgs[0]?.url ?? null;
      }

      const dev = p.developerProfile as { name?: string; logoUrl?: string } | undefined;
      const score = typeof p.highriseScore === 'number' ? p.highriseScore : 0;
      const noc = (p.nocStatus as string | undefined) ?? 'not_applied';

      const rawStatus = String(p.projectStatus ?? '').toLowerCase();
      let projectStatus: 'ready_to_move' | 'under_construction' | 'new_launch' | 'pre_launch' = 'under_construction';
      if (rawStatus === 'completed' || rawStatus === 'ready_to_move') {
        projectStatus = 'ready_to_move';
      } else if (rawStatus === 'launched' || rawStatus === 'new_launch') {
        projectStatus = 'new_launch';
      } else if (rawStatus === 'pre-launch' || rawStatus === 'pre_launch') {
        projectStatus = 'pre_launch';
      }

      let minAreaMarla: number | null = null;
      let maxAreaMarla: number | null = null;
      let minBedrooms: number | null = null;
      let maxBedrooms: number | null = null;

      if (Array.isArray(p.unitTypeBreakdown)) {
        const units = p.unitTypeBreakdown as Array<{
          areaRangeMarla?: { min?: number; max?: number };
          bedrooms?: number;
        }>;

        for (const u of units) {
          const uMin = u.areaRangeMarla?.min;
          const uMax = u.areaRangeMarla?.max;
          const uBed = u.bedrooms;

          if (typeof uMin === 'number') {
            minAreaMarla = minAreaMarla === null ? uMin : Math.min(minAreaMarla, uMin);
          }
          if (typeof uMax === 'number') {
            maxAreaMarla = maxAreaMarla === null ? uMax : Math.max(maxAreaMarla, uMax);
          }
          if (typeof uBed === 'number') {
            minBedrooms = minBedrooms === null ? uBed : Math.min(minBedrooms, uBed);
            maxBedrooms = maxBedrooms === null ? uBed : Math.max(maxBedrooms, uBed);
          }
        }
      }

      return {
        _id: String(p._id ?? ''),
        slug: String(p.slug ?? ''),
        projectName: String(p.projectName ?? ''),
        tagline: typeof p.tagline === 'string' ? p.tagline : null,
        city: String(p.city ?? ''),
        area: String(p.area ?? ''),
        locality: null,
        propertyType: ['flats'] as PropertyType[],
        projectCategory: String(p.projectCategory ?? ''),
        projectNature: String(p.projectNature ?? ''),
        projectStatus,
        saleMode: typeof p.saleMode === 'string' ? p.saleMode : null,
        unitsAvailable: typeof p.unitsAvailable === 'number' ? p.unitsAvailable : null,
        totalUnits: typeof p.totalUnits === 'number' ? p.totalUnits : null,
        minPrice: typeof p.minPrice === 'number' ? p.minPrice : null,
        maxPrice: typeof p.maxPrice === 'number' ? p.maxPrice : null,
        priceOnRequest: typeof p.minPrice !== 'number',
        minAreaMarla,
        maxAreaMarla,
        minBedrooms,
        maxBedrooms,
        possessionDate: null,
        possessionQuarter: null,
        isVerified: Boolean(p.isVerified),
        nocStatus: noc as 'approved' | 'pending' | 'not_applied',
        nocAuthority: typeof p.approvalAuthority === 'string' ? p.approvalAuthority : null,
        nocNumber: null,
        legalDocumentUrl: null,
        shield: computeStubShield({
          nocStatus: noc as 'approved' | 'pending' | 'not_applied',
          isVerified: Boolean(p.isVerified),
          developerBadge: typeof p.developerBadge === 'string' ? p.developerBadge : null,
          highriseScore: score,
        }),
        developerId: p.developerId ? String(p.developerId) : null,
        developerName: dev?.name ?? '',
        developerSlug: '',
        developerLogoUrl: dev?.logoUrl ?? null,
        developerBadge: typeof p.developerBadge === 'string' ? p.developerBadge as any : null,
        isTrustedBuilder: Boolean(p.isTrustedBuilder),
        marketedBy: null,
        primaryImage,
        imageCount: Array.isArray(p.images) ? p.images.length : 0,
        isShortlisted: false,
        inquiryCount: null,
        amenities: [],
        fairPriceUrl: String(p.slug ?? '') ? `/tools/fair-price?project=${String(p.slug)}` : null,
        isFeatured: Boolean(p.isFeatured) && (
          !p.promotionEndDate || new Date(p.promotionEndDate as string | Date | number) >= new Date()
        ),
        highriseScore: score,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt ?? ''),
      };
    });

    let readyPropertiesMapped: ReadyPropertyItem[] = [];
    try {
      const rawProperties = await Property.find({
        isDeleted: { $ne: true },
        city: { $regex: new RegExp(`^${escapeRegExp(resolvedCity)}$`, 'i') },
        $or: [
          { status: { $in: ['approved', 'available', 'active', 'verified'] } },
          { 'verification.status': 'verified' },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(4)
        .select({
          _id: 1, slug: 1, title: 1, price: 1, city: 1, location: 1,
          propertyType: 1, purpose: 1, bedrooms: 1, areaSize: 1, areaUnit: 1,
          images: 1, featureImageUrl: 1,
        })
        .maxTimeMS(2000)
        .lean();

      readyPropertiesMapped = (rawProperties as Array<Record<string, unknown>>).map((p) => {
        let primaryImage: string | null = null;
        if (typeof p.featureImageUrl === 'string') {
          primaryImage = p.featureImageUrl;
        } else if (Array.isArray(p.images) && p.images.length > 0) {
          const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
          primaryImage = imgs.find((i) => i?.isPrimary)?.url ?? imgs[0]?.url ?? null;
        }

        return {
          _id: String(p._id ?? ''),
          slug: String(p.slug ?? ''),
          title: String(p.title ?? ''),
          price: typeof p.price === 'number' ? p.price : null,
          city: String(p.city ?? ''),
          location: typeof p.location === 'string' ? p.location : null,
          propertyType: String(p.propertyType ?? 'apartment'),
          purpose: (p.purpose as 'sale' | 'rent') || 'sale',
          bedrooms: typeof p.bedrooms === 'number' ? p.bedrooms : null,
          areaSize: typeof p.areaSize === 'number' ? p.areaSize : null,
          areaUnit: typeof p.areaUnit === 'string' ? p.areaUnit : 'Marla',
          primaryImage,
        };
      });
    } catch {
      readyPropertiesMapped = [];
    }

    return {
      props: {
        initialFilters: filters,
        initialProjects: projects,
        totalCount: total,
        cityCounts,
        categoryCounts,
        natureCounts,
        budgetBands: [],
        hotspots,
        platformStats: { totalProjects: 0, totalDevelopers: 0, totalVerified: 0, totalCities: 0 },
        tabCounts: [],
        featuredProjects: [],
        readyProperties: readyPropertiesMapped,
      },
    };
  } catch {
    return {
      props: {
        initialFilters: DEFAULT_FILTERS,
        initialProjects: [],
        totalCount: 0,
        cityCounts: [],
        categoryCounts: [],
        natureCounts: [],
        budgetBands: [],
        hotspots: [],
        platformStats: { totalProjects: 0, totalDevelopers: 0, totalVerified: 0, totalCities: 0 },
        tabCounts: [],
        featuredProjects: [],
        readyProperties: [],
      },
    };
  }
};

export default CityProjectsPage;