// pages/projects/index.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  Search,
  MapPin,
  Building2,
  Layers,
  Filter,
  BadgeCheck,
  ArrowRight,
  X,
  Home,
  ShoppingBag,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface ProjectSummary {
  _id: string;
  slug?: string; // SEO-friendly URL slug
  projectName: string;
  city: string;
  area: string;
  projectCategory: 'highrise' | 'society';
  projectNature: 'residential' | 'commercial' | 'mixed';
  projectStatus?: string;
  saleMode?: string;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  requestedVerification?: boolean;
  createdAt?: string;
  // Image fields
  featureImageUrl?: string; // 👈 Add this line
  primaryImage?: string;
  images?: { url?: string }[];
  // Additional fields for cards
  startingPrice?: number;
  developerName?: string;
  unitTypes?: string[]; // e.g. ['Apartments', 'Shops', 'Offices']
  isFeatured?: boolean;
  isVerified?: boolean;
}

// Simple list of major Pakistani cities for the dropdown
const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Hyderabad',
  'Gujranwala',
  'Sialkot',
  'Sargodha',
  'Bahawalpur',
  'Sukkur',
  'Rahim Yar Khan',
  'Sahiwal',
  'Gujrat',
  'Mardan',
  'Abbottabad',
  'Mirpur',
  'Muzaffarabad',
];

const ProjectsListPage: React.FC = () => {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [projectCategory, setProjectCategory] = useState<string>('');
  const [projectNature, setProjectNature] = useState<string>('');

  // Enterprise: pagination (dual mode)
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(12);
  const [cursor, setCursor] = useState<string>(''); // base64 cursor
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Future-proof: trust-only toggle (works if API returns trust fields)
  const [trustedOnly, setTrustedOnly] = useState<boolean>(false);

  const safeJson = async (res: Response) => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  };

  const buildCanonical = () => {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk').replace(/\/+$/, '');
    // keep canonical stable: no page/cursor on canonical; only core filters
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (city) params.set('city', city);
    if (projectCategory) params.set('projectCategory', projectCategory);
    if (projectNature) params.set('projectNature', projectNature);
    if (trustedOnly) params.set('trusted', '1');

    const qs = params.toString();
    return `${base}/projects${qs ? `?${qs}` : ''}`;
  };

  const canonicalUrl = useMemo(() => buildCanonical(), [
    searchQuery,
    city,
    projectCategory,
    projectNature,
    trustedOnly,
  ]);

    // Fetch projects with current filters (enterprise-safe + dual pagination ready)
  const fetchProjects = async (opts?: { reset?: boolean }) => {
    const reset = opts?.reset !== false;

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (reset) {
      setPage(1);
      setCursor('');
      setHasMore(false);
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();

      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (city) params.append('city', city);
      if (projectCategory) params.append('projectCategory', projectCategory);
      if (projectNature) params.append('projectNature', projectNature);
      if (trustedOnly) params.append('trusted', '1');

      // Dual pagination (LOCKED): page/limit OR cursor mode
      params.append('limit', String(limit));
      if (!reset && cursor) {
        // cursor mode for "Load more"
        params.append('cursor', cursor);
      } else {
        // page mode for initial/search changes
        params.append('page', String(1));
      }

      const url = `/api/projects?${params.toString()}`;

      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      const data = await safeJson(res);

      if (!res.ok || !data?.success) {
        setError(data?.message || 'Failed to load projects.');
        setProjects([]);
        setHasMore(false);
        setCursor('');
        return;
      }

      // Backward compatible: some APIs return {projects: []}, others {data: {projects,pagination}}
      const incoming = (data?.projects || data?.data?.projects || []) as ProjectSummary[];

      // Pagination (best-effort)
      const pg = data?.pagination || data?.data?.pagination || null;
      const nextCursor = pg?.nextCursor ?? null;
      const more = pg?.hasMore ?? false;

      if (reset) {
        setProjects(incoming);
      } else {
        setProjects((prev) => [...prev, ...incoming]);
      }

      setHasMore(Boolean(more));
      setCursor(typeof nextCursor === 'string' ? nextCursor : '');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError('Something went wrong while loading projects.');
      setProjects([]);
      setHasMore(false);
      setCursor('');
    } finally {
      setLoading(false);
    }
  };

    // Initial load
  useEffect(() => {
    fetchProjects({ reset: true });
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced refetch when filters change (user-friendly)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProjects({ reset: true });
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, city, projectCategory, projectNature, trustedOnly]);

  const totalProjects = projects.length;

  const getCategoryLabel = (cat: string) =>
    cat === 'highrise' ? 'High-Rise' : 'Society';

  const getNatureLabel = (nature: string) =>
    nature.charAt(0).toUpperCase() + nature.slice(1);

  const getVerificationBadge = (
    status?: 'pending' | 'approved' | 'rejected',
    requested?: boolean
  ) => {
    let label = 'Not requested';
    let cls =
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700';

    if (status === 'approved') {
      label = 'Verified';
      cls =
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-green-50 text-green-700 border border-green-200';
    } else if (status === 'rejected') {
      label = 'Issue';
      cls =
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-red-50 text-red-700 border border-red-200';
    } else if (status === 'pending' && requested) {
      label = 'Pending';
      cls =
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-yellow-50 text-yellow-700 border border-yellow-200';
    } else if (requested) {
      label = 'Requested';
      cls =
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-yellow-50 text-yellow-700 border border-yellow-200';
    }

    return <span className={cls}>{label}</span>;
  };

  // Helper: Generate project URL (slug-first, _id fallback)
  const getProjectUrl = (project: ProjectSummary): string => {
    return `/projects/${project.slug || project._id}`;
  };

  // Helper: Format price
  const formatPrice = (price?: number): string => {
    if (!price) return '';
    if (price >= 10000000) {
      return `${(price / 10000000).toFixed(2)} Crore`;
    } else if (price >= 100000) {
      return `${(price / 100000).toFixed(2)} Lac`;
    }
    return price.toLocaleString();
  };

  // Helper: Get nature icon
  const getNatureIcon = (nature: string) => {
    switch (nature) {
      case 'residential':
        return <Home className="w-3.5 h-3.5" />;
      case 'commercial':
        return <ShoppingBag className="w-3.5 h-3.5" />;
      case 'mixed':
        return <Briefcase className="w-3.5 h-3.5" />;
      default:
        return <Building2 className="w-3.5 h-3.5" />;
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setCity('');
    setProjectCategory('');
    setProjectNature('');
  };

  // Check if any filter is active
  const hasActiveFilters = searchQuery || city || projectCategory || projectNature;

    return (
    <>
      <Head>
        <title>New Projects in Pakistan | Trusted Developers & Verified Approvals | Highrise.pk</title>
        <meta
          name="description"
          content="Explore verified high-rise and society projects across Pakistan. Compare locations, approvals, and pricing — with trusted developer badges and transparency-first details."
        />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:title" content="New Projects in Pakistan | Highrise.pk" />
        <meta
          property="og:description"
          content="Discover trusted and verified projects with approvals, NOC details, and transparent pricing."
        />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div className="min-h-screen bg-gray-50">
      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION (Developers Page Style)
      ═══════════════════════════════════════════════════════════ */}
      <div className="relative bg-[#001f2b] text-white pt-16 pb-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#029bba 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#029bba] rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        
                <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-center gap-2 text-sm text-white/60 mb-4">
            <Link
              href="/"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <span>/</span>
            <span className="text-white">Projects</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-[#4dd6f5] mb-6 backdrop-blur-sm">
            <ShieldCheck size={14} />
            Verified Projects with NOC & Approval Details
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight leading-normal">
            Discover <span className="text-[#029bba]">Trusted</span> Projects <br className="hidden md:block" /> Across Pakistan
          </h1>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Explore verified housing societies and high-rise buildings. Check approvals, NOCs, and make informed investment decisions.
          </p>
        </div>
      </div>

            {/* ═══════════════════════════════════════════════════════════
          SEARCH & FILTERS – Premium Card
      ═══════════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-4 -mt-12 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 md:p-6 max-w-5xl mx-auto">
          {/* Top Row: Search + Button */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by project name, developer, or area..."
                className="block w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] focus:bg-white transition-all text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
              />
            </div>

            {/* Search Button */}
            <button
              onClick={() => fetchProjects({ reset: true })}
              className="h-14 bg-[#029bba] hover:bg-[#02849e] text-white px-8 rounded-xl font-semibold transition-all shadow-lg shadow-[#029bba]/20 flex items-center justify-center gap-2 whitespace-nowrap text-base"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>

                    {/* Bottom Row: Filters as equal tabs */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTrustedOnly((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                trustedOnly
                  ? 'bg-[#029bba] text-white border-[#029bba]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Trusted only
            </button>

            <span className="text-xs text-gray-500">
              Shows trusted developers/projects first (anti-fraud).
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
              {/* City */}
              <div className="flex items-center gap-2 h-12 px-3 bg-gray-50 rounded-xl border border-gray-100">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-transparent border-none text-sm text-gray-700 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  <option value="">All Cities</option>
                  {PAKISTAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="flex items-center gap-2 h-12 px-3 bg-gray-50 rounded-xl border border-gray-100">
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={projectCategory}
                  onChange={(e) => setProjectCategory(e.target.value)}
                  className="w-full bg-transparent border-none text-sm text-gray-700 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  <option value="">All Categories</option>
                  <option value="highrise">High-Rise Building</option>
                  <option value="society">Housing Society</option>
                </select>
              </div>

              {/* Nature */}
              <div className="flex items-center gap-2 h-12 px-3 bg-gray-50 rounded-xl border border-gray-100">
                <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={projectNature}
                  onChange={(e) => setProjectNature(e.target.value)}
                  className="w-full bg-transparent border-none text-sm text-gray-700 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  <option value="">All Types</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed-Use</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-center justify-end h-12">
                {hasActiveFilters && (
                  <button
                    onClick={() => {
  clearAllFilters();
  setTimeout(() => { void fetchProjects({ reset: true }); }, 0);
}}

                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Tags - Below Card */}
      {hasActiveFilters && (
        <div className="container mx-auto px-4 mt-4">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 mr-2">Active Filters:</span>
            
            {searchQuery && (
  <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#029bba]/10 text-[#029bba] rounded-full text-sm font-medium">
    Search: "{searchQuery}"
    <button
      onClick={() => {
        setSearchQuery('');
        setTimeout(() => { void fetchProjects({ reset: true }); }, 0);
      }}
      className="hover:text-red-600"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </span>
)}
            {city && (
  <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#029bba]/10 text-[#029bba] rounded-full text-sm font-medium">
    <MapPin className="w-3.5 h-3.5" />
    {city}
    <button
      onClick={() => {
        setCity('');
        setTimeout(() => { void fetchProjects({ reset: true }); }, 0);
      }}
      className="hover:text-red-600"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </span>
)}

            
            {projectCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#029bba]/10 text-[#029bba] rounded-full text-sm font-medium">
                <Building2 className="w-3.5 h-3.5" />
                {projectCategory === 'highrise' ? 'High-Rise Building' : 'Housing Society'}
                <button
  onClick={() => {
    setProjectCategory('');
    setTimeout(() => { void fetchProjects({ reset: true }); }, 0);
  }}
  className="hover:text-red-600"
>
  <X className="w-3.5 h-3.5" />
</button>

              </span>
            )}
            
            {projectNature && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#029bba]/10 text-[#029bba] rounded-full text-sm font-medium">
                <Layers className="w-3.5 h-3.5" />
                {projectNature.charAt(0).toUpperCase() + projectNature.slice(1)}
                <button
  onClick={() => {
    setProjectNature('');
    setTimeout(() => { void fetchProjects({ reset: true }); }, 0);
  }}
  className="hover:text-red-600"
>
  <X className="w-3.5 h-3.5" />
</button>

              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          RESULTS SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section className="container mx-auto px-4 py-16">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-[#029bba]" />
              {loading ? 'Loading...' : `${totalProjects} Project${totalProjects !== 1 ? 's' : ''} Found`}
            </h2>
            {hasActiveFilters && !loading && (
              <p className="text-sm text-gray-500 mt-1">
                Filtered results
                {city && ` in ${city}`}
                {projectCategory && ` • ${getCategoryLabel(projectCategory)}`}
                {projectNature && ` • ${getNatureLabel(projectNature)}`}
              </p>
            )}
          </div>

          {/* Optional: Sort dropdown (future enhancement) */}
          {/*
          <select className="text-sm border rounded-lg px-3 py-2">
            <option>Sort by: Featured</option>
            <option>Sort by: Newest</option>
            <option>Sort by: Price (Low to High)</option>
          </select>
          */}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => fetchProjects({ reset: true })}
              className="mt-4 text-sm text-red-700 underline hover:no-underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <button
              onClick={() => {
                clearAllFilters();
                fetchProjects();
              }}
              className="px-6 py-2 bg-[#029bba] text-white rounded-lg hover:bg-[#02849e] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Projects Card Grid */}
        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const categoryLabel = getCategoryLabel(project.projectCategory);
              const natureLabel = getNatureLabel(project.projectNature);

              return (
                <Link
                  key={project._id}
                  href={getProjectUrl(project)}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl 
                             overflow-hidden transition-all duration-300
                             border border-gray-200 hover:border-[#029bba]/30 hover:-translate-y-1"
                >
                  {/* Card Image */}
                  <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {(project.featureImageUrl || project.primaryImage || project.images?.[0]?.url) ? (
                      <Image
                        src={project.featureImageUrl || project.primaryImage || project.images?.[0]?.url || ''}
                        alt={project.projectName}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-gray-300" />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      {project.verificationStatus === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 
                                         bg-[#029bba] text-white text-xs font-medium rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      )}
                      {project.isFeatured && (
                        <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Category Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-gray-700 
                                       text-xs font-medium rounded-full">
                        {categoryLabel}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    {/* Project Name */}
                     <h3 className="font-bold text-lg text-gray-900 mb-2 
                                   group-hover:text-[#029bba] transition-colors line-clamp-1">
                      {project.projectName}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {project.area}, {project.city}
                      </span>
                    </div>

                    {/* Tags Row */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 
                                       bg-gray-100 text-gray-600 text-xs rounded-md">
                        {getNatureIcon(project.projectNature)}
                        {natureLabel}
                      </span>
                      {project.projectStatus && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                          {project.projectStatus}
                        </span>
                      )}
                    </div>

                    {/* Unit Types (if available) */}
                    {project.unitTypes && project.unitTypes.length > 0 && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-1">
                        {project.unitTypes.join(' • ')}
                      </p>
                    )}

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      {project.startingPrice ? (
                        <div>
                          <p className="text-xs text-gray-500">Starting from</p>
                          <p className="font-bold text-[#029bba]">
                            PKR {formatPrice(project.startingPrice)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-500">Contact for price</p>
                        </div>
                      )}

                      <span className="inline-flex items-center gap-1 text-[#029bba] 
                                       text-sm font-medium group-hover:gap-2 transition-all">
                        View
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

                {/* Load More (cursor mode) */}
        {!loading && !error && projects.length > 0 && hasMore && (
          <div className="mt-10 text-center">
            <button
              onClick={() => fetchProjects({ reset: false })}
              className="px-8 py-3 border-2 border-[#029bba] text-[#029bba] 
                         rounded-xl font-semibold hover:bg-[#029bba] hover:text-white
                         transition-colors"
            >
              Load More Projects
            </button>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════
          DISCLAIMER FOOTER
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-amber-50 border-t border-amber-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <p className="text-sm text-amber-800 text-center">
            <strong>Disclaimer:</strong> We encourage you to always confirm approvals 
            directly with the relevant authority in addition to the information shown here.
          </p>
        </div>
      </section>
     </div>
    </>
  );
};

export async function getServerSideProps() {
  // Minimal props — page hydrates client-side
  // This ensures Google sees a server-rendered page
  return {
    props: {},
  };
}

export default ProjectsListPage;
