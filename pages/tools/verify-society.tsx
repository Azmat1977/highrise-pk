// pages/tools/verify-society.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search, MapPin, Shield, ShieldCheck, ShieldAlert, ShieldX,
  AlertTriangle, XCircle, Clock, Building2,
  Award,
  Loader2, ChevronRight, Filter, X, Info,
  BadgeCheck, Activity, Banknote,
  Sparkles, Home,
} from 'lucide-react';
import { PageTitleBanner } from '@/components/layout/PageTitleBanner';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VerifySocietyPage(): React.ReactElement {

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

  // Filters
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [nocStatus, setNocStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [authority, setAuthority] = useState('');
  const [sortBy, setSortBy] = useState('overallScore');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch societies ─────────────────────────────────────────────────────

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
  }, [search, city, nocStatus, riskLevel, authority, sortBy, page]);

  useEffect(() => {
    fetchSocieties();
  }, [fetchSocieties]);

  // Debounced search
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

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleClearFilters = () => {
    setSearchInputValue('');
    setSearch('');
    setCity('');
    setNocStatus('');
    setRiskLevel('');
    setAuthority('');
    setSortBy('overallScore');
    setPage(1);
  };

  const activeFilterCount =
    (city ? 1 : 0) +
    (nocStatus ? 1 : 0) +
    (riskLevel ? 1 : 0) +
    (authority ? 1 : 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Verify Society NOC Status | Pakistan&apos;s Society Verifier | Highrise.pk</title>
        <meta
          name="description"
          content="Check NOC status, approval authority, and risk level of any housing society in Pakistan. Avoid scams. Verified by Highrise.pk — Pakistan's first property intelligence platform."
        />
        <meta name="keywords" content="society NOC verification, LDA approved societies, CDA NOC status, RDA approval, housing scheme legal status, illegal societies Pakistan" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Verify Society NOC Status | Highrise.pk" />
        <meta property="og:description" content="Pakistan's most comprehensive society NOC verification tool. Check legal status, risk alerts, and approval authority." />
        <meta property="og:url" content="https://highrise.pk/tools/verify-society" />
        <link rel="canonical" href="https://highrise.pk/tools/verify-society" />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── PHASE 5 PAGE BANNER ── */}
        <PageTitleBanner
          title="Verify Any Society Before You Invest"
          subtitle="Check NOC status, approval authority, legal score and risk alerts."
          breadcrumb={
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-blue-100/75"
            >
              <Link href="/" className="flex items-center gap-1 transition-colors hover:text-white">
                <Home className="w-3 h-3" />
                <span>Home</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-blue-200/40" />
              <Link href="/tools" className="transition-colors hover:text-white">Tools</Link>
              <ChevronRight className="w-3 h-3 text-blue-200/40" />
              <span className="text-white">Verify Society</span>
            </nav>
          }
        />

        {/* ── SEARCH ── */}
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4">
            <div className="max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  placeholder="Search by society name, city, or area..."
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] outline-none shadow-sm"
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-gray-500 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#10b981]" />
                  Verified data
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#029bba]" />
                  Real-time alerts
                </span>
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#f59e0b]" />
                  Official authority data
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── INFO STRIP ── */}
        <section className="bg-[#fef3c7] border-y border-[#f59e0b]/30 py-3">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="flex items-center justify-center gap-2 text-[#92400e] text-sm">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span className="text-center">
                <strong>Always verify with official authorities</strong> before any transaction. This tool aggregates publicly available data.
              </span>
            </div>
          </div>
        </section>

        {/* ── FILTERS BAR ── */}
        <section className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#029bba] text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Desktop filters always visible / mobile collapsible */}
              <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-3 flex-1`}>
                {/* City */}
                <select
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setPage(1); }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                >
                  <option value="">All Cities</option>
                  {filterOptions.cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* NOC Status */}
                <select
                  value={nocStatus}
                  onChange={(e) => { setNocStatus(e.target.value); setPage(1); }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                >
                  <option value="">Any NOC Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="illegal">Illegal</option>
                  <option value="disputed">Disputed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>

                {/* Risk Level */}
                <select
                  value={riskLevel}
                  onChange={(e) => { setRiskLevel(e.target.value); setPage(1); }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                >
                  <option value="">Any Risk Level</option>
                  <option value="safe">🟢 Safe</option>
                  <option value="caution">🟡 Caution</option>
                  <option value="high_risk">🔴 High Risk</option>
                  <option value="avoid">⛔ Avoid</option>
                </select>

                {/* Authority */}
                <select
                  value={authority}
                  onChange={(e) => { setAuthority(e.target.value); setPage(1); }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                >
                  <option value="">Any Authority</option>
                  {filterOptions.authorities.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white ml-auto"
                >
                  <option value="overallScore">Best Score</option>
                  <option value="legalScore">Legal Score</option>
                  <option value="growthScore">Growth Score</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="viewCount">Most Viewed</option>
                  <option value="createdAt">Recently Added</option>
                </select>

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

        {/* ── RESULTS HEADER ── */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 pt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-600">
                {loading ? (
                  'Searching...'
                ) : (
                  <>
                    Showing <strong className="text-gray-900">{societies.length}</strong> of{' '}
                    <strong className="text-gray-900">{pagination.total.toLocaleString()}</strong> societies
                    {search && <> matching &quot;<strong>{search}</strong>&quot;</>}
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ── RESULTS GRID ── */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 pb-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mb-3" />
              <p className="text-gray-600 text-sm">Loading societies...</p>
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
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No societies found</h3>
              <p className="text-gray-600 mb-6">
                {search
                  ? `No results for "${search}". Try a different search term or clear filters.`
                  : 'Try adjusting your filters or search criteria.'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {societies.map((s) => (
                  <SocietyCard key={s._id} society={s} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm font-medium text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── EDUCATIONAL SECTION ── */}
        <section className="bg-white py-16 border-t border-gray-200">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
                <Info className="w-4 h-4" />
                What is NOC Verification?
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Why Every Pakistani Investor Should <span className="text-[#029bba]">Verify First</span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Pakistan&apos;s real estate market has thousands of housing schemes — but not all are legal.
                Many investors lose their savings to illegal societies declared invalid by authorities.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: <ShieldCheck className="w-6 h-6" />,
                  title: 'Approved Societies',
                  description: 'Have valid NOC from relevant development authority (LDA, CDA, RDA, KDA, etc.). Safe to invest with due diligence.',
                  color: '#10b981',
                },
                {
                  icon: <AlertTriangle className="w-6 h-6" />,
                  title: 'Pending / Under Review',
                  description: 'NOC application is being processed. High uncertainty. Consult legal advisor before investing.',
                  color: '#f59e0b',
                },
                {
                  icon: <ShieldX className="w-6 h-6" />,
                  title: 'Illegal / Disputed',
                  description: 'Operating without authority approval or under court litigation. AVOID. Investment may be permanently stuck.',
                  color: '#ef4444',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-br from-[#001f2b] to-[#003553] py-14">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 text-center">
            <Sparkles className="w-10 h-10 text-[#06b6d4] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Don&apos;t Just Verify — <span className="text-[#06b6d4]">Compare Areas Too</span>
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Check fair prices, calculate construction costs, and discover verified properties — all in one place.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/tools/price-estimator">
                <button className="px-5 py-3 rounded-xl bg-white text-[#004063] font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Check Fair Price
                </button>
              </Link>
              <Link href="/tools/construction-calculator">
                <button className="px-5 py-3 rounded-xl bg-white/15 text-white border border-white/30 font-semibold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Build Cost Calculator
                </button>
              </Link>
              <Link href="/properties">
                <button className="px-5 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Browse Verified Properties
                </button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// ─── Society Card Sub-Component ───────────────────────────────────────────────

interface SocietyCardProps {
  society: SocietyListItem;
}

function SocietyCard({ society }: SocietyCardProps): React.ReactElement {
  const noc = NOC_LABELS[society.nocStatus] || NOC_LABELS.pending;
  const risk = RISK_LABELS[society.overallRiskLevel] || RISK_LABELS.caution;
  const category = CATEGORY_LABELS[society.category] || society.category;

  return (
    <Link href={`/tools/verify-society/${society.slug}`}>
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

          {/* Alert Counter */}
          {society.activeAlertCount > 0 && (
            <div className="absolute bottom-3 left-3">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ef4444]/95 text-white text-[10px] font-bold backdrop-blur-sm shadow-lg animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {society.activeAlertCount} Active Alert{society.activeAlertCount > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Title + Location */}
          <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 group-hover:text-[#029bba] transition-colors">
            {society.name}
          </h3>
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{society.areaName}, {society.city}</span>
          </p>

          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">
              {category}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#029bba]/10 text-[#029bba] text-[11px] font-bold">
              {society.approvalAuthority}
            </span>
            {society.developerName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 text-[11px] truncate max-w-[150px]">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{society.developerName}</span>
              </span>
            )}
          </div>

          {/* Scores Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <ScoreItem label="Legal" score={society.scores.legal} />
            <ScoreItem label="Growth" score={society.scores.growth} />
            <ScoreItem label="Overall" score={society.scores.overall} />
          </div>

          {/* Risk + CTA */}
          <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${risk.bg} ${risk.color} text-xs font-bold`}>
              <Shield className="w-3 h-3" />
              {risk.label}
            </div>
            <span className="text-[#029bba] font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              View Details <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Score Pill Sub-Component ────────────────────────────────────────────────

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