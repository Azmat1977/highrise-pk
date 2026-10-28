// pages/admin/subscribers/index.tsx
// 🏗️ ENTERPRISE SUBSCRIBER MANAGEMENT PAGE — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// MERGED: Best of original file + Option F new features
//
// FROM ORIGINAL:
//   ✅ AdminLayout wrapper (sidebar + topbar)
//   ✅ SubscriberModal (Add / Edit / View 3-mode)
//   ✅ Bulk checkbox selection + bulk delete
//
// FROM OPTION F:
//   ✅ useSession() + useRouter() auth guard (NO AdminGuard)
//   ✅ NO Card import — native Tailwind divs
//   ✅ NO react-hot-toast — custom inline Banner
//   ✅ Import CSV button + ImportModal
//   ✅ Export via /api/newsletter/subscribers/export (all rows)
//   ✅ pending status in Stats + Subscriber type
//   ✅ Correct API paths (/api/newsletter/subscribers)
//   ✅ Clickable stat cards as filters
//   ✅ Search clear button (X)
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useSession }  from 'next-auth/react';
import { useRouter }   from 'next/router';
import Head            from 'next/head';
import AdminLayout     from '@/components/admin/AdminLayout';
import ImportModal     from '@/components/admin/subscribers/ImportModal';
import {
  Users,
  Mail,
  Search,
  Download,
  UserCheck,
  UserX,
  Calendar,
  Plus,
  Trash2,
  Eye,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Clock,
  Upload,
  Filter,
  Tag,
  UserMinus,
  XCircle,
  Info,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

type SubscriberStatus = 'active' | 'pending' | 'unsubscribed' | 'bounced';

interface Subscriber {
  _id:             string;
  email:           string;
  name?:           string;
  status:          SubscriberStatus;
  source:          string;
  subscribedAt?:   string;
  unsubscribedAt?: string;
  emailsSent:      number;
  tags?:           string[];
  createdAt:       string;
}

interface Stats {
  total:        number;
  active:       number;
  unsubscribed: number;
  bounced:      number;
  pending:      number;
}

interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

type StatusFilter = 'all' | SubscriberStatus;

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PAGE_LIMIT = 50;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',          label: 'All'          },
  { key: 'active',       label: 'Active'       },
  { key: 'pending',      label: 'Pending'      },
  { key: 'unsubscribed', label: 'Unsubscribed' },
  { key: 'bounced',      label: 'Bounced'      },
];

const ALLOWED_SOURCES = [
  'admin', 'website', 'landing_page', 'property_page',
  'blog', 'referral', 'import', 'api',
];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

function getStatusBadge(status: SubscriberStatus) {
  const styles: Record<SubscriberStatus, string> = {
    active:       'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending:      'bg-amber-100   text-amber-700   border-amber-200',
    unsubscribed: 'bg-gray-100    text-gray-600    border-gray-200',
    bounced:      'bg-red-100     text-red-700     border-red-200',
  };
  const icons: Record<SubscriberStatus, React.ReactNode> = {
    active:       <CheckCircle className="w-3 h-3" />,
    pending:      <Clock       className="w-3 h-3" />,
    unsubscribed: <UserMinus   className="w-3 h-3" />,
    bounced:      <XCircle     className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 BANNER COMPONENT
// ═══════════════════════════════════════════════════════════════

interface BannerProps {
  type:      'success' | 'error' | 'info';
  message:   string;
  onDismiss: () => void;
}

function Banner({ type, message, onDismiss }: BannerProps) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50     border-red-200     text-red-800',
    info:    'bg-blue-50    border-blue-200    text-blue-800',
  };
  const icons = {
    success: <CheckCircle className="w-4 h-4 shrink-0" />,
    error:   <XCircle     className="w-4 h-4 shrink-0" />,
    info:    <Info        className="w-4 h-4 shrink-0" />,
  };
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl text-sm font-semibold max-w-md w-full ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════

interface ConfirmModalProps {
  title:        string;
  message:      string;
  confirmLabel: string;
  confirmColor: 'red' | 'amber';
  onConfirm:    () => void;
  onCancel:     () => void;
  loading?:     boolean;
}

function ConfirmModal({
  title, message, confirmLabel, confirmColor, onConfirm, onCancel, loading,
}: ConfirmModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const btnStyles = {
    red:   'bg-red-500   hover:bg-red-600   text-white',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-black text-[#004063] mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${btnStyles[confirmColor]}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STAT CARD
// ═══════════════════════════════════════════════════════════════

interface StatCardProps {
  label:   string;
  value:   number;
  icon:    React.ReactNode;
  color:   'teal' | 'green' | 'amber' | 'red' | 'gray';
  active?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, icon, color, active, onClick }: StatCardProps) {
  const styles = {
    teal:  { card: 'border-[#029bba]/20 bg-[#029bba]/5',  num: 'text-[#029bba]',   ico: 'bg-[#029bba]/10 text-[#029bba]'   },
    green: { card: 'border-emerald-200  bg-emerald-50',   num: 'text-emerald-600', ico: 'bg-emerald-100  text-emerald-600'  },
    amber: { card: 'border-amber-200    bg-amber-50',     num: 'text-amber-600',   ico: 'bg-amber-100    text-amber-600'    },
    red:   { card: 'border-red-200      bg-red-50',       num: 'text-red-600',     ico: 'bg-red-100      text-red-600'      },
    gray:  { card: 'border-gray-200     bg-gray-50',      num: 'text-gray-600',    ico: 'bg-gray-100     text-gray-500'     },
  };
  const s = styles[color];
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-5 transition-all ${s.card} ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''} ${active ? 'ring-2 ring-[#029bba] ring-offset-1' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.ico}`}>
        {icon}
      </div>
      <div className={`text-3xl font-black ${s.num}`}>{value.toLocaleString()}</div>
      <div className="text-sm font-semibold text-gray-500 mt-1">{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SUBSCRIBER MODAL (Add / Edit / View) — from original file
// ═══════════════════════════════════════════════════════════════

interface SubscriberModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  onSuccess:  () => void;
  subscriber?: Subscriber | null;
  mode:       'add' | 'edit' | 'view';
}

function SubscriberModal({
  isOpen, onClose, onSuccess, subscriber, mode,
}: SubscriberModalProps) {
  const [formData, setFormData] = useState({
    email:  '',
    name:   '',
    status: 'active' as SubscriberStatus,
    source: 'admin',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (isOpen) {
      if (subscriber && (mode === 'edit' || mode === 'view')) {
        setFormData({
          email:  subscriber.email,
          name:   subscriber.name || '',
          status: subscriber.status,
          source: subscriber.source,
        });
      } else {
        setFormData({ email: '', name: '', status: 'active', source: 'admin' });
      }
      setError('');
    }
  }, [isOpen, subscriber, mode]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // POST → /api/newsletter/subscribers (add new)
      // PATCH → /api/newsletter/subscribers/[id] (edit status)
      const url    = mode === 'edit' && subscriber
        ? `/api/newsletter/subscribers/${subscriber._id}`
        : '/api/newsletter/subscribers';
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(
          mode === 'edit'
            ? { status: formData.status }
            : { email: formData.email, name: formData.name, source: formData.source }
        ),
      });
      const data = await res.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isViewMode = mode === 'view';
  const title = mode === 'add' ? 'Add Subscriber' : mode === 'edit' ? 'Edit Subscriber' : 'Subscriber Details';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-black text-[#004063]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Email Address {mode === 'add' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isViewMode || mode === 'edit'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 text-sm"
              placeholder="email@example.com"
              required={mode === 'add'}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isViewMode}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 text-sm"
              placeholder="Subscriber name (optional)"
            />
          </div>

          {/* Status — edit/view only */}
          {(mode === 'edit' || mode === 'view') && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as SubscriberStatus })}
                disabled={isViewMode}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 text-sm"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>
          )}

          {/* Source — add only */}
          {mode === 'add' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all text-sm"
              >
                {ALLOWED_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* View mode — extra details */}
          {mode === 'view' && subscriber && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Source</label>
                <input
                  type="text"
                  value={subscriber.source}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Subscribed</label>
                  <input
                    type="text"
                    value={formatDate(subscriber.subscribedAt)}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Emails Sent</label>
                  <input
                    type="text"
                    value={subscriber.emailsSent}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm"
                  />
                </div>
              </div>

              {subscriber.tags && subscriber.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {subscriber.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#029bba]/10 text-[#029bba]"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {subscriber.unsubscribedAt && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Unsubscribed</label>
                  <input
                    type="text"
                    value={formatDate(subscriber.unsubscribedAt)}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm"
                  />
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold"
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </button>
            {!isViewMode && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] transition-colors text-sm font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                {mode === 'edit' ? 'Save Changes' : 'Add Subscriber'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AdminSubscribersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // ─── Auth guard ───────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || (session.user as any)?.role !== 'admin') {
      router.replace('/login');
    }
  }, [session, authStatus, router]);

  // ─── State ────────────────────────────────────────────────
  const [subscribers,   setSubscribers]   = useState<Subscriber[]>([]);
  const [stats,         setStats]         = useState<Stats>({
    total: 0, active: 0, unsubscribed: 0, bounced: 0, pending: 0,
  });
  const [pagination,    setPagination]    = useState<Pagination>({
    page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 0,
  });
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all');
  const [searchInput,   setSearchInput]   = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [isLoading,     setIsLoading]     = useState(true);
  const [isExporting,   setIsExporting]   = useState(false);
  const [showImport,    setShowImport]    = useState(false);

  // Selection state (from original file)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [subscriberModal, setSubscriberModal] = useState<{
    isOpen:     boolean;
    mode:       'add' | 'edit' | 'view';
    subscriber: Subscriber | null;
  }>({ isOpen: false, mode: 'add', subscriber: null });

  const [confirmAction, setConfirmAction] = useState<{
    type:       'unsubscribe' | 'delete' | 'bulk-delete';
    subscriber?: Subscriber;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const bannerTimer = useRef<NodeJS.Timeout | null>(null);

  // ─── Banner helper ────────────────────────────────────────
  const showBanner = useCallback((
    type: 'success' | 'error' | 'info',
    message: string
  ) => {
    setBanner({ type, message });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4500);
  }, []);

  // ─── Fetch subscribers ────────────────────────────────────
  const fetchSubscribers = useCallback(async (
    page   = 1,
    status = statusFilter,
    search = searchQuery,
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page:   String(page),
        limit:  String(PAGE_LIMIT),
        status,
        search,
      });
      const res  = await fetch(`/api/newsletter/subscribers?${params}`);
      const data = await res.json();

      if (data.success) {
        setSubscribers(data.subscribers || []);
        setStats(data.stats || {
          total: 0, active: 0, unsubscribed: 0, bounced: 0, pending: 0,
        });
        setPagination(data.pagination || {
          page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 0,
        });
        setSelectedIds([]);
      } else {
        showBanner('error', data.message || 'Failed to load subscribers');
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, showBanner]);

  // ─── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchSubscribers(1, statusFilter, searchQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, session]);

  // ─── Search debounce ──────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(value);
      fetchSubscribers(1, statusFilter, value);
    }, 400);
  };

  // ─── Status filter ────────────────────────────────────────
  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    fetchSubscribers(1, status, searchQuery);
  };

  // ─── Page change ──────────────────────────────────────────
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchSubscribers(page, statusFilter, searchQuery);
    }
  };

  // ─── Selection helpers (from original) ───────────────────
  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === subscribers.length
        ? []
        : subscribers.map((s) => s._id)
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ─── Export handler (via API — all rows) ─────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportStatus = statusFilter === 'all' ? 'all' : statusFilter;
      const res = await fetch(
        `/api/newsletter/subscribers/export?status=${exportStatus}`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showBanner('error', data.message || 'Export failed. Please try again.');
        return;
      }

      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const date     = new Date().toISOString().split('T')[0];
      const suffix   = exportStatus === 'all' ? '' : `-${exportStatus}`;
      const filename = `highrise-subscribers${suffix}-${date}.csv`;
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showBanner('success', 'Export downloaded successfully.');
    } catch {
      showBanner('error', 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Delete single subscriber ─────────────────────────────
  const handleDelete = async (subscriber: Subscriber) => {
    setActionLoading(true);
    try {
      const res  = await fetch(
        `/api/newsletter/subscribers/${subscriber._id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        showBanner('success', `${subscriber.email} deleted.`);
        fetchSubscribers(pagination.page, statusFilter, searchQuery);
      } else {
        showBanner('error', data.message || 'Failed to delete.');
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // ─── Bulk delete (from original) ─────────────────────────
  const handleBulkDelete = async () => {
    setActionLoading(true);
    try {
      const results = await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/newsletter/subscribers/${id}`, { method: 'DELETE' })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed === 0) {
        showBanner('success', `${selectedIds.length} subscribers deleted.`);
      } else {
        showBanner('error', `${failed} of ${selectedIds.length} failed to delete.`);
      }
      setSelectedIds([]);
      fetchSubscribers(pagination.page, statusFilter, searchQuery);
    } catch {
      showBanner('error', 'Bulk delete failed. Please try again.');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // ─── Import success ───────────────────────────────────────
  const handleImportSuccess = (imported: number) => {
    showBanner(
      'success',
      `${imported.toLocaleString()} subscriber${imported !== 1 ? 's' : ''} imported successfully.`
    );
    fetchSubscribers(1, statusFilter, searchQuery);
  };

  // ─── Auth loading guard ───────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin" />
      </div>
    );
  }

  if (!session || (session.user as any)?.role !== 'admin') {
    return null;
  }

  // ═════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>Subscribers — Highrise.pk Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      {/* Banner */}
      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* Confirm — Single Delete */}
      {confirmAction?.type === 'delete' && confirmAction.subscriber && (
        <ConfirmModal
          title="Delete Subscriber"
          message={`Permanently delete ${confirmAction.subscriber.email}? This cannot be undone.`}
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={() => handleDelete(confirmAction.subscriber!)}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}

      {/* Confirm — Bulk Delete */}
      {confirmAction?.type === 'bulk-delete' && (
        <ConfirmModal
          title="Delete Selected Subscribers"
          message={`Permanently delete ${selectedIds.length} selected subscribers? This cannot be undone.`}
          confirmLabel="Delete All"
          confirmColor="red"
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}

      {/* Subscriber Add/Edit/View Modal */}
      <SubscriberModal
        isOpen={subscriberModal.isOpen}
        onClose={() => setSubscriberModal({ isOpen: false, mode: 'add', subscriber: null })}
        onSuccess={() => fetchSubscribers(pagination.page, statusFilter, searchQuery)}
        subscriber={subscriberModal.subscriber}
        mode={subscriberModal.mode}
      />

      {/* AdminLayout wraps everything */}
      <AdminLayout>
        <div className="space-y-6">

          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#004063]">
                Newsletter Subscribers
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Manage your email subscriber list — import, export, search and filter
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => fetchSubscribers(pagination.page, statusFilter, searchQuery)}
                disabled={isLoading}
                className="p-2.5 rounded-xl text-gray-500 hover:text-[#029bba] hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setSubscriberModal({ isOpen: true, mode: 'add', subscriber: null })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#004063] hover:bg-[#003050] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Subscriber
              </button>

              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#029bba] hover:bg-[#0289a5] transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>

              <button
                onClick={handleExport}
                disabled={isExporting || stats.total === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />
                }
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total"
              value={stats.total}
              icon={<Users className="w-5 h-5" />}
              color="teal"
              onClick={() => handleStatusChange('all')}
              active={statusFilter === 'all'}
            />
            <StatCard
              label="Active"
              value={stats.active}
              icon={<UserCheck className="w-5 h-5" />}
              color="green"
              onClick={() => handleStatusChange('active')}
              active={statusFilter === 'active'}
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={<Clock className="w-5 h-5" />}
              color="amber"
              onClick={() => handleStatusChange('pending')}
              active={statusFilter === 'pending'}
            />
            <StatCard
              label="Unsubscribed"
              value={stats.unsubscribed}
              icon={<UserMinus className="w-5 h-5" />}
              color="gray"
              onClick={() => handleStatusChange('unsubscribed')}
              active={statusFilter === 'unsubscribed'}
            />
            <StatCard
              label="Bounced"
              value={stats.bounced}
              icon={<UserX className="w-5 h-5" />}
              color="red"
              onClick={() => handleStatusChange('bounced')}
              active={statusFilter === 'bounced'}
            />
          </div>

          {/* ── Filters Bar ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(''); handleSearchChange(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status tabs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <Filter className="w-4 h-4 text-gray-400 shrink-0 mr-1" />
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleStatusChange(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilter === tab.key
                        ? 'bg-[#029bba] text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk actions bar (from original) */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-600 font-semibold">
                  {selectedIds.length} selected
                </span>
                <button
                  onClick={() => setConfirmAction({ type: 'bulk-delete' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 text-gray-500 text-sm font-semibold hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Table header info */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-500">
                {isLoading
                  ? 'Loading...'
                  : `${pagination.total.toLocaleString()} subscriber${pagination.total !== 1 ? 's' : ''}${statusFilter !== 'all' ? ` (${statusFilter})` : ''}${searchQuery ? ` matching "${searchQuery}"` : ''}`
                }
              </p>
              {pagination.totalPages > 1 && (
                <p className="text-xs text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
              )}
            </div>

            {/* Loading */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-semibold">Loading subscribers...</p>
                </div>
              </div>

            ) : subscribers.length === 0 ? (

              /* Empty state */
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-black text-gray-700 mb-2">
                  {searchQuery ? 'No subscribers found' : statusFilter !== 'all' ? `No ${statusFilter} subscribers` : 'No subscribers yet'}
                </h3>
                <p className="text-sm text-gray-400 text-center max-w-sm mb-6">
                  {searchQuery
                    ? `No subscribers match "${searchQuery}". Try a different search.`
                    : statusFilter !== 'all'
                    ? `You have no ${statusFilter} subscribers at this time.`
                    : 'Import your first subscribers using the CSV import button above.'
                  }
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowImport(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#029bba] hover:bg-[#004063] transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Import CSV
                    </button>
                    <button
                      onClick={() => setSubscriberModal({ isOpen: true, mode: 'add', subscriber: null })}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Manually
                    </button>
                  </div>
                )}
              </div>

            ) : (

              /* Data table */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === subscribers.length && subscribers.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Source</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Tags</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                        <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Sent</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                        <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Subscribed</div>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {subscribers.map((sub) => (
                      <tr
                        key={sub._id}
                        className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(sub._id) ? 'bg-[#029bba]/5' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(sub._id)}
                            onChange={() => toggleSelect(sub._id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                          />
                        </td>

                        {/* Email + Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#029bba]/20 to-[#004063]/20 flex items-center justify-center shrink-0">
                              <span className="text-sm font-black text-[#004063]">
                                {(sub.name || sub.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate max-w-[180px]">{sub.email}</p>
                              {sub.name && (
                                <p className="text-xs text-gray-400 truncate max-w-[180px]">{sub.name}</p>
                              )}
                              <div className="sm:hidden mt-1">{getStatusBadge(sub.status)}</div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {getStatusBadge(sub.status)}
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded-lg font-semibold">
                            {sub.source || 'website'}
                          </span>
                        </td>

                        {/* Tags */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {sub.tags && sub.tags.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap max-w-[140px]">
                              {sub.tags.slice(0, 2).map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#029bba]/10 text-[#029bba] font-semibold">
                                  <Tag className="w-2.5 h-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {sub.tags.length > 2 && (
                                <span className="text-xs text-gray-400">+{sub.tags.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* Emails sent */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm font-semibold text-gray-600">{sub.emailsSent ?? 0}</span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-xs text-gray-500">{formatDate(sub.subscribedAt || sub.createdAt)}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSubscriberModal({ isOpen: true, mode: 'view', subscriber: sub })}
                              className="p-2 text-gray-400 hover:text-[#029bba] hover:bg-gray-100 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSubscriberModal({ isOpen: true, mode: 'edit', subscriber: sub })}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmAction({ type: 'delete', subscriber: sub })}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination ── */}
            {!isLoading && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing{' '}
                  <span className="font-bold text-gray-700">
                    {((pagination.page - 1) * PAGE_LIMIT) + 1}–{Math.min(pagination.page * PAGE_LIMIT, pagination.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-bold text-gray-700">{pagination.total.toLocaleString()}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || isLoading}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let page: number;
                      if (pagination.totalPages <= 5) page = i + 1;
                      else if (pagination.page <= 3) page = i + 1;
                      else if (pagination.page >= pagination.totalPages - 2) page = pagination.totalPages - 4 + i;
                      else page = pagination.page - 2 + i;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          disabled={isLoading}
                          className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${page === pagination.page ? 'bg-[#029bba] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </AdminLayout>
    </>
  );
}