// ========== FILE: pages/admin/owners/index.tsx ==========
// Highrise.pk — Admin: Owner Verifications List
// V1.1.0 — Matches API response shape exactly
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  ArrowRight,
  MapPin,
  Calendar,
  User,
  Home,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ═══════════════════════════════════════════
// TYPES — matching API response exactly
// ═══════════════════════════════════════════

type OwnerStatus = 'all' | 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'info_required';

interface OwnerListItem {
  _id:                  string;
  slug?:                string;
  displayName:          string;
  email:                string;
  city:                 string;
  status:               'draft' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'info_required';
  verificationLevel:    string;
  cnicVerified:         boolean;
  submittedForReviewAt?: string;
  verifiedAt?:          string;
  createdAt:            string;
  activeListingsCount:  number;
  maxListings:          number;
  user?:                {
    _id:                string;
    name?:              string;
    email?:             string;
    profilePictureUrl?: string;
  };
}

// API returns "counts" not "stats" — with snake_case for info_required
interface Counts {
  all:            number;
  draft:          number;
  pending:        number;
  approved:       number;
  rejected:       number;
  suspended:      number;
  info_required:  number;
}

interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

interface ApiResponse {
  success:  boolean;
  message?: string;
  data?: {
    owners:     OwnerListItem[];
    pagination: Pagination;
    counts:     Counts;
  };
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('en-PK', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

function timeAgo(iso: string | undefined): string {
  if (!iso) return '—';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days  = Math.floor(hours / 24);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return formatDate(iso);
}

// ═══════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const configs: Record<string, { label: string; className: string; icon: React.ReactElement }> = {
    pending: {
      label:     'Pending',
      className: 'bg-[#029bba]/10 text-[#029bba] border-[#029bba]/20',
      icon:      <Clock className="w-3 h-3" />,
    },
    approved: {
      label:     'Approved',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon:      <CheckCircle className="w-3 h-3" />,
    },
    rejected: {
      label:     'Rejected',
      className: 'bg-red-100 text-red-800 border-red-200',
      icon:      <XCircle className="w-3 h-3" />,
    },
    suspended: {
      label:     'Suspended',
      className: 'bg-orange-100 text-orange-800 border-orange-200',
      icon:      <AlertTriangle className="w-3 h-3" />,
    },
    info_required: {
      label:     'Info Required',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
      icon:      <AlertTriangle className="w-3 h-3" />,
    },
    draft: {
      label:     'Draft',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      icon:      <Clock className="w-3 h-3" />,
    },
  };

  const config = configs[status] ?? configs['draft'];

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md',
        'text-[11px] font-semibold border',
        config.className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════
// FILTER TAB
// ═══════════════════════════════════════════

interface FilterTabProps {
  label:  string;
  count:  number;
  active: boolean;
  onClick: () => void;
  color?: string;
}

function FilterTab({ label, count, active, onClick, color = 'gray' }: FilterTabProps): React.ReactElement {
  const activeColors: Record<string, string> = {
    gray:     'border-gray-800 text-gray-900 bg-gray-100',
    teal:     'border-[#029bba] text-[#029bba] bg-[#029bba]/10',
    emerald:  'border-emerald-600 text-emerald-700 bg-emerald-50',
    red:      'border-red-600 text-red-700 bg-red-50',
    orange:   'border-orange-600 text-orange-700 bg-orange-50',
    amber:    'border-amber-600 text-amber-700 bg-amber-50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex items-center gap-2 px-4 py-2 rounded-xl',
        'text-sm font-semibold border-2 transition-colors whitespace-nowrap',
        active
          ? activeColors[color] ?? activeColors['gray']
          : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
      )}
    >
      {label}
      <span
        className={cx(
          'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5',
          'text-[11px] font-bold rounded-full',
          active
            ? 'bg-white/60'
            : 'bg-gray-100 text-gray-600'
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════
// STATS CARD (top row)
// ═══════════════════════════════════════════

interface StatsCardProps {
  label:     string;
  value:     number;
  icon:      React.ReactElement;
  color:     string;
  bgColor:   string;
}

function StatsCard({ label, value, icon, color, bgColor }: StatsCardProps): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bgColor, color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 leading-none">
            {value}
          </p>
          <p className="text-xs font-medium text-gray-500 mt-1">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

const EMPTY_COUNTS: Counts = {
  all: 0, draft: 0, pending: 0, approved: 0,
  rejected: 0, suspended: 0, info_required: 0,
};

export default function AdminOwnersPage(): React.ReactElement {
  const router = useRouter();

  const [owners, setOwners] = useState<OwnerListItem[]>([]);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter is DRIVEN BY URL query param (?status=pending)
  // Falls back to 'all' if no query param
  const urlStatus = (router.query.status as string) || 'all';
  const activeFilter: OwnerStatus = ['all', 'draft', 'pending', 'approved', 'rejected', 'suspended', 'info_required']
    .includes(urlStatus) ? (urlStatus as OwnerStatus) : 'all';

  const [searchQuery, setSearchQuery] = useState('');

  // Handler that updates URL when user clicks a tab
  const setActiveFilter = useCallback((status: OwnerStatus) => {
    const query = { ...router.query };
    if (status === 'all') {
      delete query.status;
    } else {
      query.status = status;
    }
    void router.push({
      pathname: router.pathname,
      query,
    }, undefined, { shallow: true });
  }, [router]);

  // ── Fetch data ──────────────────────────────────
  const fetchOwners = useCallback(async () => {
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.append('status', activeFilter);
      if (searchQuery.trim())     params.append('search', searchQuery.trim());
      params.append('limit', '50');

      const res = await fetch(`/api/admin/owners?${params.toString()}`, {
        credentials: 'include',
      });
      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !data.success || !data.data) {
        setErrorMsg(data.message ?? 'Failed to load owners');
        return;
      }

      setOwners(data.data.owners ?? []);
      setCounts(data.data.counts ?? EMPTY_COUNTS);
      setPagination(data.data.pagination ?? null);
    } catch {
      setErrorMsg('Network error. Please try again.');
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    setLoading(true);
    void fetchOwners().finally(() => setLoading(false));
  }, [fetchOwners]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOwners();
    setRefreshing(false);
  };

  // ── Debounce search ─────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOwners();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  return (
    <>
      <Head>
        <title>Verified Owners | Admin | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminLayout>
        <div className="space-y-6">

          {/* ── Page Header ── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-6 h-6 text-[#029bba]" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Verified Owners
                </h1>
              </div>
              <p className="text-gray-500 text-sm">
                CNIC verification management for individual property owners
              </p>
            </div>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                         border border-gray-300 bg-white text-gray-700
                         text-sm font-medium hover:border-[#029bba]
                         hover:text-[#029bba] transition-colors
                         disabled:opacity-50"
            >
              <RefreshCw className={cx('w-4 h-4', refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* ── Error Banner ── */}
          {errorMsg && (
            <div className="flex items-center gap-3 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-xl">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatsCard
              label="Total"
              value={counts.all}
              icon={<User className="w-5 h-5" />}
              color="#4b5563"
              bgColor="#f3f4f6"
            />
            <StatsCard
              label="Pending Review"
              value={counts.pending}
              icon={<Clock className="w-5 h-5" />}
              color="#029bba"
              bgColor="#029bba15"
            />
            <StatsCard
              label="Approved"
              value={counts.approved}
              icon={<CheckCircle className="w-5 h-5" />}
              color="#10b981"
              bgColor="#10b98115"
            />
            <StatsCard
              label="Rejected"
              value={counts.rejected}
              icon={<XCircle className="w-5 h-5" />}
              color="#ef4444"
              bgColor="#ef444415"
            />
            <StatsCard
              label="Suspended"
              value={counts.suspended}
              icon={<AlertTriangle className="w-5 h-5" />}
              color="#f97316"
              bgColor="#f9731615"
            />
            <StatsCard
              label="Info Required"
              value={counts.info_required}
              icon={<AlertTriangle className="w-5 h-5" />}
              color="#f59e0b"
              bgColor="#f59e0b15"
            />
          </div>

          {/* ── Filter + Search ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">
                <Filter className="w-3.5 h-3.5 inline mr-1" />
                Filter:
              </span>
              <FilterTab
                label="All"
                count={counts.all}
                active={activeFilter === 'all'}
                onClick={() => setActiveFilter('all')}
                color="gray"
              />
              <FilterTab
                label="Pending"
                count={counts.pending}
                active={activeFilter === 'pending'}
                onClick={() => setActiveFilter('pending')}
                color="teal"
              />
              <FilterTab
                label="Approved"
                count={counts.approved}
                active={activeFilter === 'approved'}
                onClick={() => setActiveFilter('approved')}
                color="emerald"
              />
              <FilterTab
                label="Rejected"
                count={counts.rejected}
                active={activeFilter === 'rejected'}
                onClick={() => setActiveFilter('rejected')}
                color="red"
              />
              <FilterTab
                label="Suspended"
                count={counts.suspended}
                active={activeFilter === 'suspended'}
                onClick={() => setActiveFilter('suspended')}
                color="orange"
              />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full h-11 pl-11 pr-4 border border-gray-200
                           rounded-xl text-sm bg-white outline-none
                           focus:ring-2 focus:ring-[#029bba]/20
                           focus:border-[#029bba] transition-all
                           placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* ── Owners Table ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mb-3" />
                <p className="text-sm text-gray-500">Loading verifications...</p>
              </div>
            ) : owners.length === 0 ? (
              <div className="p-16 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  {activeFilter === 'all'
                    ? 'No owner verifications yet'
                    : `No ${activeFilter.replace('_', ' ')} owners found`}
                </h3>
                <p className="text-sm text-gray-500">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : activeFilter === 'all'
                    ? 'Owner verification submissions will appear here'
                    : `Try a different filter or click "All" to see all owners`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Owner</th>
                      <th className="text-left px-4 py-3 font-semibold">City</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Listings</th>
                      <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                      <th className="text-right px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {owners.map((owner) => (
                      <tr
                        key={String(owner._id)}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Owner Name + Email */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(owner.displayName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {owner.displayName || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {owner.email || '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* City */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {owner.city || '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusBadge status={owner.status} />
                        </td>

                        {/* Listings */}
                        <td className="px-4 py-4">
                          {owner.status === 'approved' ? (
                            <div className="flex items-center gap-1.5">
                              <Home className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-medium text-gray-700">
                                {owner.activeListingsCount ?? 0} / {owner.maxListings ?? 10}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* Submitted */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {timeAgo(owner.submittedForReviewAt ?? owner.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <Link href={`/admin/owners/${String(owner._id)}`}>
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#029bba]/10 text-[#029bba] text-xs font-semibold hover:bg-[#029bba] hover:text-white transition-colors">
                              Review
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Pagination Info ── */}
          {pagination && pagination.total > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500 px-2">
              <p>
                Showing {owners.length} of {pagination.total} total
              </p>
              <p>
                Page {pagination.page} of {pagination.totalPages}
              </p>
            </div>
          )}

          {/* ── Info footer ── */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-semibold mb-1">
                Owner Verification Guidelines
              </p>
              <ul className="space-y-0.5 text-blue-700">
                <li>• Verify CNIC images are clear and readable</li>
                <li>• Confirm name matches CNIC</li>
                <li>• Check CNIC format is valid (13 digits)</li>
                <li>• Look for signs of tampering or forgery</li>
                <li>• Once approved, users get 🛡️ Verified Owner badge</li>
              </ul>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

// ========== END OF FILE ==========