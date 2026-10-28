// pages/admin/units/index.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import {
  Home,
  Store,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  X,
  Star,
  Shield,
  Trash2,
  RotateCcw,
  ArrowUpDown,
  Building2,
  MapPin,
  Layers,
  TrendingDown,
  Package,
  RefreshCw,
  Download,
  MoreVertical,
  BadgeCheck,
  EyeOff,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface AdminUnit {
  _id:           string;
  unitNumber:    string;
  title?:        string;
  unitType:      string;
  unitTypeName?: string;
  category:      string;
  status:        string;
  isPublished:   boolean;
  isVerified:    boolean;
  isFeatured:    boolean;
  isHotDeal:     boolean;
  isPriceDropped: boolean;
  price:         number;
  area:          number;
  areaUnit?:     string;
  bedrooms?:     number;
  bathrooms?:    number;
  floorNumber?:  number;
  floorName?:    string;
  tower?:        string;
  isCorner?:     boolean;
  views?:        number;
  inquiryCount?: number;
  isDeleted?:    boolean;
  deletedAt?:    string;
  createdAt:     string;
  updatedAt:     string;
  images?:       Array<{ url: string; isPrimary?: boolean }>;
  projectId?: {
    _id:         string;
    projectName: string;
    slug:        string;
    city?:       string;
  };
  developerId?: {
    companyName: string;
    email:       string;
  };
}

interface AdminStats {
  totalUnits:     number;
  availableUnits: number;
  reservedUnits:  number;
  soldUnits:      number;
  onHoldUnits:    number;
  publishedUnits: number;
  verifiedUnits:  number;
  featuredUnits:  number;
  deletedUnits:   number;
  totalViews:     number;
  totalInquiries: number;
  avgPrice:       number;
  minPrice:       number;
  maxPrice:       number;
}

interface Pagination {
  page:       number;
  limit:      number;
  totalCount: number;
  totalPages: number;
  hasMore:    boolean;
}

type BulkAction = 'publish' | 'unpublish' | 'verify' | 'unverify' | 'feature' | 'unfeature' | 'trash' | 'restore';

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatPKR(amount: number): string {
  if (!amount || amount <= 0) return '—';
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(1)} Cr`;
  if (amount >= 100_000) return `${(amount / 100_000).toFixed(1)} Lac`;
  return amount.toLocaleString();
}

function formatNumber(num: number): string {
  if (!num) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function getPrimaryImage(unit: AdminUnit): string | null {
  if (unit.images && unit.images.length > 0) {
    const primary = unit.images.find((img) => img.isPrimary);
    return primary?.url ?? unit.images[0].url;
  }
  return null;
}

function getStatusConfig(status: string): { label: string; bg: string; text: string } {
  const configs: Record<string, { label: string; bg: string; text: string }> = {
    available:  { label: 'Available',  bg: 'bg-emerald-100', text: 'text-emerald-700' },
    reserved:   { label: 'Reserved',   bg: 'bg-amber-100',   text: 'text-amber-700' },
    sold:       { label: 'Sold',       bg: 'bg-red-100',     text: 'text-red-700' },
    on_hold:    { label: 'On Hold',    bg: 'bg-gray-100',    text: 'text-gray-600' },
    cancelled:  { label: 'Cancelled',  bg: 'bg-gray-50',     text: 'text-gray-400' },
  };
  return configs[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
}

// ════════════════════════════════════════════════════
// BANNER
// ════════════════════════════════════════════════════

function Banner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}): React.ReactElement {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50
                     px-5 py-3 rounded-xl shadow-xl flex items-center gap-3
                     ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success'
        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        : <AlertCircle className="w-5 h-5 flex-shrink-0" />
      }
      <p className="text-sm font-semibold">{message}</p>
      <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
// STAT CARD
// ════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label:     string;
  value:     string | number;
  icon:      React.ReactElement;
  iconBg:    string;
  iconColor: string;
}): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-black text-gray-900">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════

export default function AdminUnitsPage(): React.ReactElement {
  const { data: session } = useSession();

  // Data
  const [units, setUnits]       = useState<AdminUnit[]>([]);
  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 50, totalCount: 0, totalPages: 0, hasMore: false,
  });

  // Filters
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter]   = useState('');
  const [deletedFilter, setDeletedFilter]     = useState('');
  const [sortBy, setSortBy]         = useState('createdAt');
  const [sortOrder, setSortOrder]   = useState('desc');

  // UI state
  const [loading, setLoading]       = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [banner, setBanner]         = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch units ──
  const fetchUnits = useCallback(async (page = 1) => {
    setLoading(true);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '50');
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);

    if (search)           params.set('q', search);
    if (statusFilter)     params.set('status', statusFilter);
    if (categoryFilter)   params.set('category', categoryFilter);
    if (publishedFilter)  params.set('published', publishedFilter);
    if (verifiedFilter)   params.set('verified', verifiedFilter);
    if (deletedFilter === 'deleted')     params.set('deleted', 'true');
    if (deletedFilter === 'all')         params.set('all', 'true');

    try {
      const res  = await fetch(`/api/admin/units?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success && data.data) {
        setUnits(data.data.units ?? []);
        setPagination(data.data.pagination ?? pagination);
        setStats(data.data.stats ?? null);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Failed to load units' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Failed to load units. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, publishedFilter, verifiedFilter, deletedFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // ── Search debounce ──
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUnits(1);
    }, 400);
  }, [fetchUnits]);

  // ── Selection ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === units.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(units.map((u) => u._id)));
    }
  }, [units, selectedIds]);

  // ── Bulk action ──
  const handleBulkAction = useCallback(async (action: BulkAction) => {
    if (selectedIds.size === 0) return;

    const confirmMessages: Record<BulkAction, string> = {
      publish:   `Publish ${selectedIds.size} unit(s)?`,
      unpublish: `Unpublish ${selectedIds.size} unit(s)?`,
      verify:    `Verify ${selectedIds.size} unit(s)?`,
      unverify:  `Remove verification from ${selectedIds.size} unit(s)?`,
      feature:   `Feature ${selectedIds.size} unit(s)?`,
      unfeature: `Unfeature ${selectedIds.size} unit(s)?`,
      trash:     `Delete ${selectedIds.size} unit(s)? They can be restored later.`,
      restore:   `Restore ${selectedIds.size} unit(s)?`,
    };

    if (!window.confirm(confirmMessages[action])) return;

    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/units', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          action,
          unitIds: Array.from(selectedIds),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setBanner({
          type:    'success',
          message: data.message ?? `Bulk ${action} completed — ${data.data?.affectedCount ?? 0} units affected`,
        });
        setSelectedIds(new Set());
        fetchUnits(pagination.page);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Bulk action failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Bulk action failed. Please try again.' });
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, pagination.page, fetchUnits]);

  // ── Sort toggle ──
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // ── Reset filters ──
  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setPublishedFilter('');
    setVerifiedFilter('');
    setDeletedFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
  }, []);

  const hasActiveFilters = search || statusFilter || categoryFilter ||
    publishedFilter || verifiedFilter || deletedFilter;

  return (
    <AdminLayout>
      <Head>
        <title>Units Management | Highrise.pk Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Banner */}
      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
          <Package className="w-6 h-6 text-[#029bba]" />
          Units Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage all units across all projects on the platform
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatCard
            label="Total Units"
            value={stats.totalUnits}
            icon={<Package className="w-5 h-5" />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Available"
            value={stats.availableUnits}
            icon={<CheckCircle2 className="w-5 h-5" />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            label="Sold"
            value={stats.soldUnits}
            icon={<XCircle className="w-5 h-5" />}
            iconBg="bg-red-50"
            iconColor="text-red-500"
          />
          <StatCard
            label="Verified"
            value={stats.verifiedUnits}
            icon={<Shield className="w-5 h-5" />}
            iconBg="bg-teal-50"
            iconColor="text-teal-600"
          />
          <StatCard
            label="Total Views"
            value={stats.totalViews}
            icon={<Eye className="w-5 h-5" />}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by unit number, type, tower..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200
                         text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                         outline-none transition-colors"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border
                        text-sm font-semibold transition-colors
                        ${hasActiveFilters
                          ? 'border-[#029bba] bg-[#029bba]/5 text-[#029bba]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-[#029bba] text-white text-[10px]
                               font-bold flex items-center justify-center">
                !
              </span>
            )}
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchUnits(pagination.page)}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500
                       hover:text-[#029bba] hover:border-[#029bba]/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Status */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm
                             appearance-none bg-white focus:border-[#029bba] outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm
                             appearance-none bg-white focus:border-[#029bba] outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              {/* Published */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Published
                </label>
                <select
                  value={publishedFilter}
                  onChange={(e) => setPublishedFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm
                             appearance-none bg-white focus:border-[#029bba] outline-none"
                >
                  <option value="">All</option>
                  <option value="true">Published</option>
                  <option value="false">Unpublished</option>
                </select>
              </div>

              {/* Verified */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Verified
                </label>
                <select
                  value={verifiedFilter}
                  onChange={(e) => setVerifiedFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm
                             appearance-none bg-white focus:border-[#029bba] outline-none"
                >
                  <option value="">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Not Verified</option>
                </select>
              </div>

              {/* Deleted */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Show
                </label>
                <select
                  value={deletedFilter}
                  onChange={(e) => setDeletedFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm
                             appearance-none bg-white focus:border-[#029bba] outline-none"
                >
                  <option value="">Active Only</option>
                  <option value="deleted">Deleted Only</option>
                  <option value="all">All (incl. deleted)</option>
                </select>
              </div>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-xs font-semibold text-[#029bba] hover:underline
                           flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="bg-[#004063] rounded-2xl p-4 mb-6 flex flex-wrap items-center
                        justify-between gap-3">
          <p className="text-sm font-semibold text-white">
            {selectedIds.size} unit{selectedIds.size > 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkAction('publish')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs
                         font-semibold hover:bg-emerald-600 disabled:opacity-50"
            >
              Publish
            </button>
            <button
              onClick={() => handleBulkAction('unpublish')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-gray-500 text-white text-xs
                         font-semibold hover:bg-gray-600 disabled:opacity-50"
            >
              Unpublish
            </button>
            <button
              onClick={() => handleBulkAction('verify')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-[#029bba] text-white text-xs
                         font-semibold hover:bg-[#027a94] disabled:opacity-50"
            >
              Verify
            </button>
            <button
              onClick={() => handleBulkAction('feature')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs
                         font-semibold hover:bg-amber-600 disabled:opacity-50"
            >
              Feature
            </button>
            <button
              onClick={() => handleBulkAction('trash')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs
                         font-semibold hover:bg-red-600 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => handleBulkAction('restore')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs
                         font-semibold hover:bg-blue-600 disabled:opacity-50"
            >
              Restore
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs
                         font-semibold hover:bg-white/30"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && units.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-1">No Units Found</h3>
          <p className="text-sm text-gray-400 mb-4">
            {hasActiveFilters
              ? 'No units match the current filters. Try adjusting your search.'
              : 'No units have been created yet.'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                         bg-[#029bba] text-white text-sm font-semibold
                         hover:bg-[#027a94] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Units table */}
      {!loading && units.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {/* Checkbox */}
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === units.length && units.length > 0}
                      onChange={selectAll}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba]
                                 focus:ring-[#029bba]"
                    />
                  </th>

                  {/* Unit */}
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('unitNumber')}
                      className="flex items-center gap-1 text-xs font-bold text-gray-500
                                 uppercase tracking-wide hover:text-[#029bba]"
                    >
                      Unit <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>

                  {/* Project */}
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500
                                 uppercase tracking-wide">
                    Project
                  </th>

                  {/* Status */}
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 text-xs font-bold text-gray-500
                                 uppercase tracking-wide hover:text-[#029bba]"
                    >
                      Status <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>

                  {/* Price */}
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort('price')}
                      className="flex items-center gap-1 text-xs font-bold text-gray-500
                                 uppercase tracking-wide hover:text-[#029bba] ml-auto"
                    >
                      Price <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>

                  {/* Area */}
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500
                                 uppercase tracking-wide hidden lg:table-cell">
                    Area
                  </th>

                  {/* Flags */}
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500
                                 uppercase tracking-wide hidden md:table-cell">
                    Flags
                  </th>

                  {/* Views */}
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort('views')}
                      className="flex items-center gap-1 text-xs font-bold text-gray-500
                                 uppercase tracking-wide hover:text-[#029bba] ml-auto"
                    >
                      Views <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>

                  {/* Actions */}
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500
                                 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {units.map((unit) => {
                  const statusConfig = getStatusConfig(unit.status);
                  const image        = getPrimaryImage(unit);
                  const isSelected   = selectedIds.has(unit._id);

                  return (
                    <tr
                      key={unit._id}
                      className={`hover:bg-gray-50/50 transition-colors
                                  ${unit.isDeleted ? 'bg-red-50/30' : ''}
                                  ${isSelected ? 'bg-[#029bba]/5' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(unit._id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#029bba]
                                     focus:ring-[#029bba]"
                        />
                      </td>

                      {/* Unit info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden
                                          bg-gray-100 flex-shrink-0">
                            {image ? (
                              <Image
                                src={image}
                                alt={unit.unitNumber}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {unit.category === 'commercial'
                                  ? <Store className="w-4 h-4 text-gray-300" />
                                  : <Home className="w-4 h-4 text-gray-300" />
                                }
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">
                              #{unit.unitNumber}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {unit.unitTypeName ?? unit.unitType.replace(/_/g, ' ')}
                              {unit.floorName ? ` · ${unit.floorName}` : ''}
                              {unit.tower ? ` · ${unit.tower}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Project */}
                      <td className="px-4 py-3">
                        {unit.projectId ? (
                          <div className="min-w-0">
                            <Link
                              href={`/admin/projects/${unit.projectId._id}`}
                              className="text-xs font-semibold text-gray-700 hover:text-[#029bba]
                                         truncate block max-w-[160px]"
                            >
                              {unit.projectId.projectName}
                            </Link>
                            {unit.projectId.city && (
                              <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {unit.projectId.city}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                          ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                        {unit.isDeleted && (
                          <span className="block mt-1 px-2 py-0.5 rounded-full bg-red-100
                                           text-red-600 text-[9px] font-bold w-fit">
                            Deleted
                          </span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-[#029bba] text-sm">
                          {formatPKR(unit.price)}
                        </p>
                        {unit.isPriceDropped && (
                          <span className="text-[9px] text-green-600 font-bold flex items-center
                                           gap-0.5 justify-end">
                            <TrendingDown className="w-3 h-3" /> Dropped
                          </span>
                        )}
                      </td>

                      {/* Area */}
                      <td className="px-4 py-3 text-right text-xs text-gray-600 hidden lg:table-cell">
                        {unit.area} {unit.areaUnit ?? 'sqft'}
                        {unit.bedrooms !== undefined && unit.bedrooms > 0 && (
                          <p className="text-[10px] text-gray-400">
                            {unit.bedrooms}B / {unit.bathrooms ?? 0}B
                          </p>
                        )}
                      </td>

                      {/* Flags */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <span title={unit.isPublished ? 'Published' : 'Unpublished'}>
                            {unit.isPublished ? (
                              <Eye className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </span>
                          {unit.isVerified && (
                            <span title="Verified">
                              <BadgeCheck className="w-3.5 h-3.5 text-[#029bba]" />
                            </span>
                          )}
                          {unit.isFeatured && (
                            <span title="Featured">
                              <Star className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                          {unit.isCorner && (
                            <span title="Corner">
                              <Layers className="w-3.5 h-3.5 text-purple-500" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Views */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end text-xs text-gray-500">
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3" />
                            {formatNumber(unit.views ?? 0)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3" />
                            {unit.inquiryCount ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/units/${unit._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg
                                     bg-gray-100 text-gray-600 text-xs font-semibold
                                     hover:bg-[#029bba] hover:text-white transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} units
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchUnits(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs
                           font-semibold text-gray-600 hover:bg-gray-50
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchUnits(pagination.page + 1)}
                disabled={!pagination.hasMore}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs
                           font-semibold text-gray-600 hover:bg-gray-50
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}