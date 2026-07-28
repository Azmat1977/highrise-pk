// pages/admin/societies/index.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, Plus, Search,
  Filter, X, Eye, Edit, Trash2, BadgeCheck, AlertTriangle,
  CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight,
  Building2, MapPin, Star, Activity, Clock, Award,
  Calendar, ArrowUpDown, MoreVertical, Download, RefreshCw,
  Settings,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocietyAdminListItem {
  _id: string;
  name: string;
  slug: string;
  city: string;
  areaName: string;
  category: string;
  nocStatus: string;
  approvalAuthority: string;
  overallRiskLevel: string;
  legalScore: number;
  growthScore: number;
  overallScore: number;
  featuredImage?: string;
  isVerifiedByHighrise: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  searchCount: number;
  activeAlertCount: number;
  developerName?: string;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  total: number;
  published: number;
  verified: number;
  pending: number;
  flagged: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type BannerType = 'success' | 'error' | 'info';

interface Banner {
  type: BannerType;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'bg-[#10b981] text-white' },
  pending: { label: 'Pending', color: 'bg-[#f59e0b] text-white' },
  under_review: { label: 'Reviewing', color: 'bg-[#f59e0b] text-white' },
  illegal: { label: 'Illegal', color: 'bg-[#ef4444] text-white' },
  disputed: { label: 'Disputed', color: 'bg-[#ef4444] text-white' },
  cancelled: { label: 'Cancelled', color: 'bg-[#ef4444] text-white' },
  expired: { label: 'Expired', color: 'bg-[#f59e0b] text-white' },
};

const RISK_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  safe: { label: 'Safe', bg: 'bg-[#f0fdf4]', text: 'text-[#10b981]' },
  caution: { label: 'Caution', bg: 'bg-[#fef3c7]', text: 'text-[#92400e]' },
  high_risk: { label: 'High Risk', bg: 'bg-[#fef2f2]', text: 'text-[#ef4444]' },
  avoid: { label: 'Avoid', bg: 'bg-[#ef4444]', text: 'text-white' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminSocietiesPage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Data
  const [societies, setSocieties] = useState<SocietyAdminListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    published: 0,
    verified: 0,
    pending: 0,
    flagged: 0,
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [city, setCity] = useState('');
  const [nocStatus, setNocStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [isPublished, setIsPublished] = useState('');
  const [isVerified, setIsVerified] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // UI
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auth Guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.replace('/login?redirect=/admin/societies');
      return;
    }
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'admin') {
      router.replace('/');
    }
  }, [session, status, router]);

  // ─── Fetch Data ──────────────────────────────────────────────────────────

  const fetchSocieties = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      if (nocStatus) params.set('nocStatus', nocStatus);
      if (riskLevel) params.set('riskLevel', riskLevel);
      if (isPublished) params.set('isPublished', isPublished);
      if (isVerified) params.set('isVerified', isVerified);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/admin/societies?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data?.error || 'Failed to load societies' });
        setSocieties([]);
        return;
      }

      setSocieties(data.data.societies || []);
      setPagination(data.data.pagination);
      setStats(data.data.stats);
    } catch {
      setBanner({ type: 'error', message: 'Network error. Please try again.' });
      setSocieties([]);
    } finally {
      setLoading(false);
    }
  }, [search, city, nocStatus, riskLevel, isPublished, isVerified, sortBy, sortOrder, page]);

  useEffect(() => {
    const userRole = (session?.user as { role?: string })?.role;
    if (session?.user && userRole === 'admin') {
      fetchSocieties();
    }
  }, [session, fetchSocieties]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
        setPage(1);
      }
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput, search]);

  // Auto-clear banner
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleQuickToggle = async (
    society: SocietyAdminListItem,
    field: 'isPublished' | 'isVerifiedByHighrise' | 'isFeatured'
  ) => {
    setActionLoadingId(society._id);
    try {
      const currentValue =
        field === 'isPublished' ? society.isPublished :
        field === 'isVerifiedByHighrise' ? society.isVerifiedByHighrise :
        society.isFeatured;

      const res = await fetch(`/api/admin/societies/${society._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentValue }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data?.error || 'Failed to update society' });
        return;
      }

      const fieldLabels: Record<string, string> = {
        isPublished: currentValue ? 'unpublished' : 'published',
        isVerifiedByHighrise: currentValue ? 'unverified' : 'verified',
        isFeatured: currentValue ? 'unfeatured' : 'featured',
      };

      setBanner({
        type: 'success',
        message: `${society.name} has been ${fieldLabels[field]}.`,
      });

      // Refresh list
      fetchSocieties();
    } catch {
      setBanner({ type: 'error', message: 'Connection error. Please try again.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setActionLoadingId(deleteModal.id);

    try {
      const url = deleteMode === 'hard'
        ? `/api/admin/societies/${deleteModal.id}?hard=true`
        : `/api/admin/societies/${deleteModal.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data?.error || 'Delete failed' });
        return;
      }

      setBanner({
        type: 'success',
        message: deleteMode === 'hard'
          ? `${deleteModal.name} permanently deleted.`
          : `${deleteModal.name} unpublished successfully.`,
      });

      setDeleteModal(null);
      setDeleteMode('soft');
      fetchSocieties();
    } catch {
      setBanner({ type: 'error', message: 'Connection error during delete.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCity('');
    setNocStatus('');
    setRiskLevel('');
    setIsPublished('');
    setIsVerified('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const activeFilterCount =
    (city ? 1 : 0) +
    (nocStatus ? 1 : 0) +
    (riskLevel ? 1 : 0) +
    (isPublished ? 1 : 0) +
    (isVerified ? 1 : 0);

  // ─── Auth Loading State ──────────────────────────────────────────────────

  if (status === 'loading' || !session?.user) {
    return (
      <>
        <Head>
          <title>Loading… | Admin</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
        </div>
      </>
    );
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return (
      <>
        <Head>
          <title>Access Denied</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-md p-8 max-w-md text-center">
            <ShieldX className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">Admin privileges required.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Society Management | Highrise Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6 max-w-[1600px] mx-auto">

          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="w-7 h-7 text-[#029bba]" />
                Society Management
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Manage NOC verifications, risk alerts, and society intelligence data
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSocieties()}
                disabled={loading}
                className="px-3 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/admin/societies/new">
                <button className="px-4 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2 shadow-md">
                  <Plus className="w-4 h-4" />
                  Add Society
                </button>
              </Link>
            </div>
          </div>

          {/* ── BANNER ── */}
          {banner && (
            <div
              className={`mb-6 rounded-xl border-l-4 p-4 flex items-start gap-3 ${
                banner.type === 'success'
                  ? 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]'
                  : banner.type === 'error'
                  ? 'bg-[#fef2f2] border-[#ef4444] text-red-700'
                  : 'bg-[#eff6ff] border-[#029bba] text-[#004063]'
              }`}
            >
              {banner.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {banner.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {banner.type === 'info' && <Activity className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <span className="flex-1 text-sm font-medium">{banner.message}</span>
              <button
                onClick={() => setBanner(null)}
                className="opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STATS DASHBOARD ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <StatCard
              icon={<Building2 className="w-5 h-5" />}
              label="Total Societies"
              value={stats.total}
              color="#029bba"
              onClick={handleClearFilters}
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5" />}
              label="Published"
              value={stats.published}
              color="#10b981"
              onClick={() => { setIsPublished('true'); setPage(1); }}
            />
            <StatCard
              icon={<BadgeCheck className="w-5 h-5" />}
              label="Verified"
              value={stats.verified}
              color="#7c3aed"
              onClick={() => { setIsVerified('true'); setPage(1); }}
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Pending NOC"
              value={stats.pending}
              color="#f59e0b"
              onClick={() => { setNocStatus('pending'); setPage(1); }}
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Flagged"
              value={stats.flagged}
              color="#ef4444"
              onClick={() => { setRiskLevel('high_risk'); setPage(1); }}
            />
          </div>

          {/* ── SEARCH + FILTERS BAR ── */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, city, area, or slug..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Toggle filters on mobile */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden h-10 px-4 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#029bba] text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filters */}
            <div className={`${showFilters ? 'grid' : 'hidden'} md:grid grid-cols-2 md:grid-cols-6 gap-3 mt-3 pt-3 border-t border-gray-100`}>
              <select
                value={city}
                onChange={(e) => { setCity(e.target.value); setPage(1); }}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] outline-none cursor-pointer bg-white"
              >
                <option value="">All Cities</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Karachi">Karachi</option>
                <option value="Rawalpindi">Rawalpindi</option>
                <option value="Faisalabad">Faisalabad</option>
                <option value="Multan">Multan</option>
                <option value="Peshawar">Peshawar</option>
                <option value="Quetta">Quetta</option>
                <option value="Gujranwala">Gujranwala</option>
                <option value="Sialkot">Sialkot</option>
              </select>

              <select
                value={nocStatus}
                onChange={(e) => { setNocStatus(e.target.value); setPage(1); }}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] outline-none cursor-pointer bg-white"
              >
                <option value="">All NOC</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="illegal">Illegal</option>
                <option value="disputed">Disputed</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={riskLevel}
                onChange={(e) => { setRiskLevel(e.target.value); setPage(1); }}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] outline-none cursor-pointer bg-white"
              >
                <option value="">All Risk</option>
                <option value="safe">🟢 Safe</option>
                <option value="caution">🟡 Caution</option>
                <option value="high_risk">🔴 High Risk</option>
                <option value="avoid">⛔ Avoid</option>
              </select>

              <select
                value={isPublished}
                onChange={(e) => { setIsPublished(e.target.value); setPage(1); }}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] outline-none cursor-pointer bg-white"
              >
                <option value="">Any Status</option>
                <option value="true">Published</option>
                <option value="false">Unpublished</option>
              </select>

              <select
                value={isVerified}
                onChange={(e) => { setIsVerified(e.target.value); setPage(1); }}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] outline-none cursor-pointer bg-white"
              >
                <option value="">Any</option>
                <option value="true">✓ Verified</option>
                <option value="false">Not Verified</option>
              </select>

              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(':');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                  setPage(1);
                }}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] outline-none cursor-pointer bg-white"
              >
                <option value="createdAt:desc">Newest First</option>
                <option value="createdAt:asc">Oldest First</option>
                <option value="updatedAt:desc">Recently Updated</option>
                <option value="name:asc">Name (A-Z)</option>
                <option value="name:desc">Name (Z-A)</option>
                <option value="overallScore:desc">Highest Score</option>
                <option value="legalScore:desc">Best Legal Score</option>
                <option value="viewCount:desc">Most Viewed</option>
              </select>

              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="col-span-2 md:col-span-6 h-10 px-3 rounded-xl bg-red-50 text-[#ef4444] text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear All Filters ({activeFilterCount})
                </button>
              )}
            </div>
          </div>

          {/* ── TABLE ── */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {loading ? (
                  'Loading...'
                ) : (
                  <>
                    Showing <strong className="text-gray-900">{societies.length}</strong> of{' '}
                    <strong className="text-gray-900">{pagination.total.toLocaleString()}</strong> societies
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mb-3" />
                <p className="text-gray-600 text-sm">Loading societies...</p>
              </div>
            ) : societies.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No societies found</h3>
                <p className="text-gray-600 mb-6">
                  {activeFilterCount > 0 || search
                    ? 'Try adjusting filters or clearing them.'
                    : 'Get started by adding your first society.'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleClearFilters}
                      className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                  <Link href="/admin/societies/new">
                    <button className="px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Society
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider">Society</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">NOC</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Risk</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Score</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Alerts</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {societies.map((s) => (
                        <SocietyRow
                          key={s._id}
                          society={s}
                          isLoading={actionLoadingId === s._id}
                          onToggle={(field) => handleQuickToggle(s, field)}
                          onDelete={() => setDeleteModal({ id: s._id, name: s.name })}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {societies.map((s) => (
                    <SocietyCardMobile
                      key={s._id}
                      society={s}
                      isLoading={actionLoadingId === s._id}
                      onToggle={(field) => handleQuickToggle(s, field)}
                      onDelete={() => setDeleteModal({ id: s._id, name: s.name })}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Page <strong>{pagination.page}</strong> of{' '}
                      <strong>{pagination.pages}</strong>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={!pagination.hasPrev}
                        className="p-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!pagination.hasNext}
                        className="p-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── DELETE MODAL ── */}
        {deleteModal && (
          <DeleteModal
            societyName={deleteModal.name}
            mode={deleteMode}
            onModeChange={setDeleteMode}
            isLoading={actionLoadingId === deleteModal.id}
            onConfirm={handleDelete}
            onCancel={() => {
              setDeleteModal(null);
              setDeleteMode('soft');
            }}
          />
        )}
      </AdminLayout>
    </>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactElement;
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}

function StatCard({ icon, label, value, color, onClick }: StatCardProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-extrabold text-gray-900 group-hover:text-[#029bba] transition-colors">
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
    </button>
  );
}

// ─── Society Row (Desktop) ───────────────────────────────────────────────────

interface SocietyRowProps {
  society: SocietyAdminListItem;
  isLoading: boolean;
  onToggle: (field: 'isPublished' | 'isVerifiedByHighrise' | 'isFeatured') => void;
  onDelete: () => void;
}

function SocietyRow({ society, isLoading, onToggle, onDelete }: SocietyRowProps): React.ReactElement {
  const noc = NOC_STATUS_CONFIG[society.nocStatus] || NOC_STATUS_CONFIG.pending;
  const risk = RISK_CONFIG[society.overallRiskLevel] || RISK_CONFIG.caution;

  const scoreColor =
    society.overallScore >= 75 ? 'text-[#10b981]' :
    society.overallScore >= 50 ? 'text-[#f59e0b]' :
    'text-[#ef4444]';

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      {/* Society */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
            {society.featuredImage ? (
              <img
                src={society.featuredImage}
                alt={society.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/societies/${society.slug}`} target="_blank">
                <span className="font-semibold text-gray-900 hover:text-[#029bba] transition-colors truncate">
                  {society.name}
                </span>
              </Link>
              {society.isVerifiedByHighrise && (
                <BadgeCheck className="w-4 h-4 text-[#029bba] flex-shrink-0" />
              )}
              {society.isFeatured && (
                <Star className="w-3.5 h-3.5 text-[#f59e0b] fill-[#f59e0b] flex-shrink-0" />
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {society.areaName}, {society.city} · {society.approvalAuthority}
            </div>
          </div>
        </div>
      </td>

      {/* NOC */}
      <td className="py-3 px-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${noc.color}`}>
          {noc.label}
        </span>
      </td>

      {/* Risk */}
      <td className="py-3 px-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${risk.bg} ${risk.text}`}>
          {risk.label}
        </span>
      </td>

      {/* Score */}
      <td className="py-3 px-3 text-center">
        <div className={`text-lg font-extrabold ${scoreColor}`}>{society.overallScore}</div>
        <div className="text-[10px] text-gray-400">/ 100</div>
      </td>

      {/* Alerts */}
      <td className="py-3 px-3 text-center">
        {society.activeAlertCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-[#ef4444] text-xs font-bold">
            <AlertTriangle className="w-3 h-3" />
            {society.activeAlertCount}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Status Toggles */}
      <td className="py-3 px-3">
        <div className="flex items-center justify-center gap-1">
          <ToggleButton
            label="Published"
            shortLabel="P"
            active={society.isPublished}
            disabled={isLoading}
            onClick={() => onToggle('isPublished')}
            activeColor="bg-[#10b981] text-white"
          />
          <ToggleButton
            label="Verified"
            shortLabel="V"
            active={society.isVerifiedByHighrise}
            disabled={isLoading}
            onClick={() => onToggle('isVerifiedByHighrise')}
            activeColor="bg-[#029bba] text-white"
          />
          <ToggleButton
            label="Featured"
            shortLabel="F"
            active={society.isFeatured}
            disabled={isLoading}
            onClick={() => onToggle('isFeatured')}
            activeColor="bg-[#f59e0b] text-white"
          />
        </div>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center justify-end gap-1">
          <Link href={`/societies/${society.slug}`} target="_blank">
            <button
              className="p-2 rounded-lg text-gray-500 hover:text-[#029bba] hover:bg-[#029bba]/5 transition-colors"
              title="View Public Page"
            >
              <Eye className="w-4 h-4" />
            </button>
          </Link>
          <Link href={`/admin/societies/${society._id}/edit`}>
            <button
              className="p-2 rounded-lg text-gray-500 hover:text-[#029bba] hover:bg-[#029bba]/5 transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
          </Link>
          <button
            onClick={onDelete}
            disabled={isLoading}
            className="p-2 rounded-lg text-gray-500 hover:text-[#ef4444] hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Society Card (Mobile) ───────────────────────────────────────────────────

function SocietyCardMobile({ society, isLoading, onToggle, onDelete }: SocietyRowProps): React.ReactElement {
  const noc = NOC_STATUS_CONFIG[society.nocStatus] || NOC_STATUS_CONFIG.pending;
  const risk = RISK_CONFIG[society.overallRiskLevel] || RISK_CONFIG.caution;

  return (
    <div className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
          {society.featuredImage ? (
            <img src={society.featuredImage} alt={society.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-bold text-gray-900 truncate">{society.name}</span>
            {society.isVerifiedByHighrise && <BadgeCheck className="w-4 h-4 text-[#029bba]" />}
          </div>
          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {society.areaName}, {society.city}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${noc.color}`}>
          {noc.label}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${risk.bg} ${risk.text}`}>
          {risk.label}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
          Score: {society.overallScore}
        </span>
        {society.activeAlertCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-[#ef4444] text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3" /> {society.activeAlertCount}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <ToggleButton label="Published" shortLabel="P" active={society.isPublished} disabled={isLoading} onClick={() => onToggle('isPublished')} activeColor="bg-[#10b981] text-white" />
          <ToggleButton label="Verified" shortLabel="V" active={society.isVerifiedByHighrise} disabled={isLoading} onClick={() => onToggle('isVerifiedByHighrise')} activeColor="bg-[#029bba] text-white" />
          <ToggleButton label="Featured" shortLabel="F" active={society.isFeatured} disabled={isLoading} onClick={() => onToggle('isFeatured')} activeColor="bg-[#f59e0b] text-white" />
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/societies/${society.slug}`} target="_blank">
            <button className="p-1.5 rounded-lg text-gray-500 hover:text-[#029bba] hover:bg-[#029bba]/5">
              <Eye className="w-4 h-4" />
            </button>
          </Link>
          <Link href={`/admin/societies/${society._id}/edit`}>
            <button className="p-1.5 rounded-lg text-gray-500 hover:text-[#029bba] hover:bg-[#029bba]/5">
              <Edit className="w-4 h-4" />
            </button>
          </Link>
          <button onClick={onDelete} disabled={isLoading} className="p-1.5 rounded-lg text-gray-500 hover:text-[#ef4444] hover:bg-red-50 disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toggle Button ───────────────────────────────────────────────────────────

interface ToggleButtonProps {
  label: string;
  shortLabel: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  activeColor: string;
}

function ToggleButton({ label, shortLabel, active, disabled, onClick, activeColor }: ToggleButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all disabled:opacity-50 ${
        active ? activeColor : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      }`}
    >
      {shortLabel}
    </button>
  );
}

// ─── Delete Modal ────────────────────────────────────────────────────────────

interface DeleteModalProps {
  societyName: string;
  mode: 'soft' | 'hard';
  onModeChange: (mode: 'soft' | 'hard') => void;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ societyName, mode, onModeChange, isLoading, onConfirm, onCancel }: DeleteModalProps): React.ReactElement {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            mode === 'hard' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {mode === 'hard' ? 'Permanently Delete' : 'Unpublish Society'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Are you sure you want to {mode === 'hard' ? 'permanently delete' : 'unpublish'}{' '}
              <strong>{societyName}</strong>?
            </p>
          </div>
        </div>

        <div className="mb-4 space-y-2">
          <label className="flex items-start gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              checked={mode === 'soft'}
              onChange={() => onModeChange('soft')}
              className="mt-0.5 accent-[#f59e0b]"
            />
            <div className="text-sm">
              <div className="font-semibold text-gray-900">Soft Delete (Unpublish)</div>
              <div className="text-xs text-gray-500">Hide from public — data preserved, can be restored later.</div>
            </div>
          </label>
          <label className="flex items-start gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              checked={mode === 'hard'}
              onChange={() => onModeChange('hard')}
              className="mt-0.5 accent-[#ef4444]"
            />
            <div className="text-sm">
              <div className="font-semibold text-[#ef4444]">Hard Delete (Permanent)</div>
              <div className="text-xs text-gray-500">⚠️ Cannot be undone. All data including alerts and documents removed forever.</div>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-2 ${
              mode === 'hard'
                ? 'bg-[#ef4444] hover:bg-red-600'
                : 'bg-[#f59e0b] hover:bg-amber-600'
            }`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'hard' ? 'Permanently Delete' : 'Unpublish'}
          </button>
        </div>
      </div>
    </div>
  );
}