// pages/admin/applications/index.tsx
// 🔒 ADMIN APPLICATIONS LIST UI - HIGHRISE.PK
// V5.9.0 — Combined inbox for agent + developer applications
// fetch() only | lucide-react | native Tailwind | no framer-motion
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Search,
  Loader2,
  Users,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
  Eye,
  Filter,
  MapPin,
} from 'lucide-react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';

// ─── Types ─────────────────────────────────────────────────────

type AppType = 'agent' | 'developer' | 'society' | 'all';
type AppStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info_required'
  | 'suspended'
  | 'all';

interface ApplicationListItem {
  _id: string;
  type: 'agent' | 'developer' | 'society';
  displayName: string;
  agencyOrCompany: string;
  city: string;
  email: string;
  status: AppStatus;
  submittedAt: string | null;
  createdAt: string;
  agentType?: string;
  developerType?: string;
  authority?: string;
  nocNumber?: string;
}

interface Counts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  info_required: number;
  agents: number;
  developers: number;
  societies: number;
}

interface ApiResponse {
  success: boolean;
  applications?: ApplicationListItem[];
  counts?: Counts;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
  message?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function statusBadge(status: AppStatus): { label: string; classes: string; Icon: typeof CheckCircle } {
  switch (status) {
    case 'approved':
      return {
        label: 'Approved',
        classes: 'bg-green-50 text-green-700 border-green-200',
        Icon: CheckCircle,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        classes: 'bg-red-50 text-red-700 border-red-200',
        Icon: XCircle,
      };
    case 'info_required':
      return {
        label: 'Info Required',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
        Icon: AlertCircle,
      };
    case 'suspended':
      return {
        label: 'Suspended',
        classes: 'bg-gray-100 text-gray-700 border-gray-300',
        Icon: XCircle,
      };
    default:
      return {
        label: 'Pending',
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
        Icon: Clock,
      };
  }
}

// ─── Component ─────────────────────────────────────────────────

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 20,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<AppType>('all');
  const [statusFilter, setStatusFilter] = useState<AppStatus>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  // ── Hydrate filters from URL query (for deep links from navbar) ──
  useEffect(() => {
    if (!router.isReady) return;
    const qType = router.query.type;
    const qStatus = router.query.status;

    if (
      typeof qType === 'string' &&
      ['all', 'agent', 'developer', 'society'].includes(qType)
    ) {
      setTypeFilter(qType as AppType);
    }
    if (
      typeof qStatus === 'string' &&
      [
        'all',
        'pending',
        'approved',
        'rejected',
        'info_required',
        'suspended',
      ].includes(qStatus)
    ) {
      setStatusFilter(qStatus as AppStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.type, router.query.status]);

  // ── Fetch data ──
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
          type: typeFilter,
          status: statusFilter,
          sort,
        });

        if (search) params.set('search', search);

        const res = await fetch(`/api/admin/applications?${params.toString()}`);
        const data = (await res.json()) as ApiResponse;

        if (!res.ok || !data.success) {
          throw new Error(data.message ?? 'Failed to load applications');
        }

        setApplications(data.applications ?? []);
        setCounts(data.counts ?? null);
        if (data.pagination) setPagination(data.pagination);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to load applications'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, typeFilter, statusFilter, search, sort]
  );

  // Initial + filter changes
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, search, sort]);

  // ── Search submit ──
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  // ── Render ──
  return (
    <AdminLayout>
      <Head>
        <title>Applications | Admin | Highrise.pk</title>
      </Head>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Applications Inbox
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Review agent, developer &amp; society onboarding applications
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={cx('w-4 h-4', refreshing && 'animate-spin')}
            />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {counts && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={cx(
                'p-4 rounded-xl border text-left transition-all',
                statusFilter === 'pending'
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Pending
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{counts.pending}</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('info_required')}
              className={cx(
                'p-4 rounded-xl border text-left transition-all',
                statusFilter === 'info_required'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Info Req
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {counts.info_required}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={cx(
                'p-4 rounded-xl border text-left transition-all',
                statusFilter === 'approved'
                  ? 'bg-green-50 border-green-300 ring-2 ring-green-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Approved
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{counts.approved}</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={cx(
                'p-4 rounded-xl border text-left transition-all',
                statusFilter === 'rejected'
                  ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Rejected
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{counts.rejected}</p>
            </button>
          </div>
        )}

        {/* Type Filter Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl p-2 inline-flex gap-1 flex-wrap">
          {(
            [
              { value: 'all', label: 'All', icon: Filter, count: counts?.all },
              { value: 'agent', label: 'Agents', icon: Users, count: counts?.agents },
              {
                value: 'developer',
                label: 'Developers',
                icon: Building2,
                count: counts?.developers,
              },
              {
                value: 'society',
                label: 'Societies',
                icon: MapPin,
                count: counts?.societies,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setTypeFilter(tab.value)}
                className={cx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  typeFilter === tab.value
                    ? 'bg-[#029bba] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count !== null && (
                  <span
                    className={cx(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      typeFilter === tab.value
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-700'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + Sort Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, company, email, city..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Search
            </button>
          </form>

          <button
            type="button"
            onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sort === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Applications Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">
                No applications found
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Company / Agent</th>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {applications.map((app) => {
                    const badge = statusBadge(app.status);
                    const BadgeIcon = badge.Icon;
                    // Type badge colors — society is purple per design system
                    const typeBadgeClasses =
                      app.type === 'society'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : app.type === 'developer'
                        ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200';

                    const TypeIcon =
                      app.type === 'society'
                        ? MapPin
                        : app.type === 'developer'
                        ? Building2
                        : Users;

                    const typeLabel =
                      app.type === 'society'
                        ? 'Society'
                        : app.type === 'developer'
                        ? 'Developer'
                        : 'Agent';

                    return (
                      <tr
                        key={`${app.type}-${app._id}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div
                            className={cx(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
                              typeBadgeClasses
                            )}
                          >
                            <TypeIcon className="w-3.5 h-3.5" />
                            {typeLabel}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {app.agencyOrCompany}
                          </div>
                          {app.type === 'agent' && app.agentType && (
                            <div className="text-xs text-gray-500 mt-0.5 capitalize">
                              {app.agentType}
                            </div>
                          )}
                          {app.type === 'developer' && app.developerType && (
                            <div className="text-xs text-gray-500 mt-0.5 capitalize">
                              {app.developerType}
                            </div>
                          )}
                          {app.type === 'society' && (app.authority || app.nocNumber) && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {app.authority && (
                                <span className="font-medium">{app.authority}</span>
                              )}
                              {app.authority && app.nocNumber && (
                                <span className="mx-1">·</span>
                              )}
                              {app.nocNumber && (
                                <span className="font-mono">NOC: {app.nocNumber}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {app.city}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">
                          {app.email}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cx(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                              badge.classes
                            )}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {timeAgo(app.submittedAt ?? app.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/applications/${app._id}?type=${app.type}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#029bba] hover:bg-[#027a94] text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-sm text-gray-600">
              Page <strong>{pagination.page}</strong> of{' '}
              <strong>{pagination.totalPages}</strong> ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}