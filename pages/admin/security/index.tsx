// pages/admin/security/index.tsx
// 🏗️ ENTERPRISE ADMIN SECURITY DASHBOARD — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Full security monitoring dashboard for admins:
//   - Stat cards (total events, by severity, threats)
//   - Hourly trend chart (last 24h)
//   - Category breakdown
//   - Recent critical events feed
//   - Full paginated event log with filters
//   - IP block management (add/remove/list)
//
// DESIGN:
//   ✅ useSession() + useRouter() auth guard
//   ✅ AdminLayout wrapper
//   ✅ No Card imports — native Tailwind divs
//   ✅ No react-hot-toast — inline Banner
//   ✅ No framer-motion — Tailwind transitions
//   ✅ Mobile responsive
//   ✅ Auto-refresh every 30 seconds
//   ✅ Tailwind CSS only
//   ✅ Lucide React icons only
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
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  AlertCircle,
  Activity,
  Lock,
  Unlock,
  Eye,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  Globe,
  Ban,
  Clock,
  TrendingUp,
  BarChart3,
  User,
  Key,
  FileText,
  Settings,
  Cpu,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

interface SecurityStats {
  totals: {
    last24h: number;
    last7d:  number;
    last30d: number;
    allTime: number;
  };
  severity: {
    low:      number;
    medium:   number;
    high:     number;
    critical: number;
  };
  category: {
    auth:     number;
    account:  number;
    kyc:      number;
    admin:    number;
    security: number;
    system:   number;
    other:    number;
  };
  topEvents: { type: string; count: number; label: string }[];
  hourly:    { hour: string; count: number; critical: number; high: number }[];
  threats: {
    bruteForceDetected:    number;
    suspiciousActivity:    number;
    rateLimitExceeded:     number;
    ipBlocked:             number;
    permissionDenied:      number;
    vpnDetected:           number;
  };
  recentCritical: {
    _id:       string;
    type:      string;
    severity:  string;
    email?:    string;
    ip?:       string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }[];
}

interface SecurityEvent {
  _id:          string;
  type:         string;
  severity:     string;
  email?:       string;
  ip?:          string;
  userAgent?:   string;
  metadata?:    Record<string, unknown>;
  correlationId?: string;
  createdAt:    string;
}

interface BlockedIP {
  _id:       string;
  ip:        string;
  reason:    string;
  notes?:    string;
  blockedBy: string;
  blockedAt: string;
  expiresAt: string | null;
  isActive:  boolean;
}

type ActiveTab = 'overview' | 'events' | 'blocked';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SEVERITY_STYLES: Record<string, {
  badge: string;
  dot:   string;
  bg:    string;
}> = {
  low:      { badge: 'bg-blue-100  text-blue-700  border-blue-200',  dot: 'bg-blue-400',   bg: 'bg-blue-50'    },
  medium:   { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400',  bg: 'bg-amber-50'   },
  high:     { badge: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400', bg: 'bg-orange-50' },
  critical: { badge: 'bg-red-100   text-red-700   border-red-200',   dot: 'bg-red-500',    bg: 'bg-red-50'     },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  auth:     <Key      className="w-4 h-4" />,
  account:  <User     className="w-4 h-4" />,
  kyc:      <FileText className="w-4 h-4" />,
  admin:    <Settings className="w-4 h-4" />,
  security: <Shield   className="w-4 h-4" />,
  system:   <Cpu      className="w-4 h-4" />,
  other:    <Activity className="w-4 h-4" />,
};

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const sec    = Math.floor(diffMs / 1000);
  if (sec < 60)   return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60)   return `${min}m ago`;
  const hr  = Math.floor(min / 60);
  if (hr  < 24)   return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── Banner ──────────────────────────────────────────────────

interface BannerProps {
  type:      'success' | 'error' | 'info';
  message:   string;
  onDismiss: () => void;
}

function Banner({ type, message, onDismiss }: BannerProps) {
  const s = {
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
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl text-sm font-semibold max-w-md w-full ${s[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Severity Badge ───────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────

interface MiniBarChartProps {
  data:    { hour: string; count: number; critical: number; high: number }[];
  height?: number;
}

function MiniBarChart({ data, height = 60 }: MiniBarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-0.5 w-full" style={{ height }}>
      {data.map((d) => {
        const barH = Math.max(
          (d.count / maxVal) * height,
          d.count > 0 ? 4 : 0
        );
        const hasCritical = d.critical > 0;
        const hasHigh     = d.high > 0;

        return (
          <div
            key={d.hour}
            className="flex-1 flex flex-col justify-end group relative"
            style={{ height }}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-10">
              <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap">
                {d.hour}:00 — {d.count} event{d.count !== 1 ? 's' : ''}
                {d.critical > 0 && ` (${d.critical} critical)`}
              </div>
              <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
            </div>

            {/* Bar */}
            <div
              className={`w-full rounded-t-sm transition-all ${
                hasCritical
                  ? 'bg-red-400'
                  : hasHigh
                  ? 'bg-orange-400'
                  : d.count > 0
                  ? 'bg-[#029bba]'
                  : 'bg-gray-100'
              }`}
              style={{ height: barH }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────

interface StatCardProps {
  label:    string;
  value:    number | string;
  icon:     React.ReactNode;
  color:    'teal' | 'blue' | 'amber' | 'red' | 'green' | 'gray' | 'orange';
  subtitle?: string;
  pulse?:   boolean;
}

function StatCard({
  label, value, icon, color, subtitle, pulse,
}: StatCardProps) {
  const styles = {
    teal:   { card: 'border-[#029bba]/20 bg-[#029bba]/5',   ico: 'bg-[#029bba]/10 text-[#029bba]',  num: 'text-[#029bba]'   },
    blue:   { card: 'border-blue-200   bg-blue-50',         ico: 'bg-blue-100   text-blue-600',     num: 'text-blue-600'    },
    amber:  { card: 'border-amber-200  bg-amber-50',        ico: 'bg-amber-100  text-amber-600',    num: 'text-amber-600'   },
    red:    { card: 'border-red-200    bg-red-50',          ico: 'bg-red-100    text-red-600',      num: 'text-red-600'     },
    green:  { card: 'border-emerald-200 bg-emerald-50',     ico: 'bg-emerald-100 text-emerald-600', num: 'text-emerald-600' },
    gray:   { card: 'border-gray-200   bg-gray-50',         ico: 'bg-gray-100   text-gray-500',     num: 'text-gray-700'    },
    orange: { card: 'border-orange-200 bg-orange-50',       ico: 'bg-orange-100 text-orange-600',   num: 'text-orange-600'  },
  };
  const s = styles[color];

  return (
    <div className={`rounded-2xl border p-4 transition-all ${s.card}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.ico}`}>
          {icon}
        </div>
        {pulse && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className={`text-2xl font-black ${s.num}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm font-semibold text-gray-500 mt-0.5">{label}</div>
      {subtitle && (
        <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}

// ─── Block IP Modal ───────────────────────────────────────────

interface BlockIPModalProps {
  onClose:  () => void;
  onBlocked: (ip: string) => void;
}

function BlockIPModal({ onClose, onBlocked }: BlockIPModalProps) {
  const [ip,           setIp]           = useState('');
  const [reason,       setReason]       = useState('');
  const [notes,        setNotes]        = useState('');
  const [expiresHours, setExpiresHours] = useState<string>('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ip.trim()) { setError('IP address is required'); return; }
    if (!reason.trim()) { setError('Reason is required'); return; }

    setIsLoading(true);
    try {
      const res  = await fetch('/api/admin/security/block-ip', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip:           ip.trim(),
          reason:       reason.trim(),
          notes:        notes.trim(),
          expiresHours: expiresHours ? parseInt(expiresHours, 10) : null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        onBlocked(ip.trim());
        onClose();
      } else {
        setError(data.message || 'Failed to block IP');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-[#004063]">Block IP Address</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              IP Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="e.g. 192.168.1.100"
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all font-mono disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Brute force attack detected"
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
              placeholder="Internal notes about this block..."
              rows={2}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Block Duration
            </label>
            <select
              value={expiresHours}
              onChange={(e) => setExpiresHours(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all disabled:opacity-50"
            >
              <option value="">Permanent</option>
              <option value="1">1 Hour</option>
              <option value="6">6 Hours</option>
              <option value="24">24 Hours</option>
              <option value="72">3 Days</option>
              <option value="168">7 Days</option>
              <option value="720">30 Days</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Permanent blocks never expire unless manually removed.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !ip.trim() || !reason.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Blocking...</>
                : <><Ban className="w-4 h-4" />Block IP</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function SecurityDashboardPage() {
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
  const [activeTab,    setActiveTab]    = useState<ActiveTab>('overview');
  const [stats,        setStats]        = useState<SecurityStats | null>(null);
  const [events,       setEvents]       = useState<SecurityEvent[]>([]);
  const [blockedIPs,   setBlockedIPs]   = useState<BlockedIP[]>([]);
  const [isLoadingStats,   setIsLoadingStats]   = useState(true);
  const [isLoadingEvents,  setIsLoadingEvents]  = useState(false);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);

  // Events filters
  const [evtSeverity,  setEvtSeverity]  = useState('all');
  const [evtType,      setEvtType]      = useState('all');
  const [evtSearch,    setEvtSearch]    = useState('');
  const [evtSearchInput, setEvtSearchInput] = useState('');
  const [evtPage,      setEvtPage]      = useState(1);
  const [evtTotal,     setEvtTotal]     = useState(0);
  const [evtTotalPages, setEvtTotalPages] = useState(0);

  // Blocked IPs
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [unblockingIP,   setUnblockingIP]   = useState<string | null>(null);
  const [blkPage,        setBlkPage]        = useState(1);
  const [blkTotal,       setBlkTotal]       = useState(0);
  const [blkTotalPages,  setBlkTotalPages]  = useState(0);

  // Banner
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const bannerTimer  = useRef<NodeJS.Timeout | null>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const searchTimer  = useRef<NodeJS.Timeout | null>(null);

  // ─── Banner helper ────────────────────────────────────────
  const showBanner = useCallback((
    type: 'success' | 'error' | 'info',
    message: string
  ) => {
    setBanner({ type, message });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4500);
  }, []);

  // ─── Fetch stats ──────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res  = await fetch(
        '/api/admin/security/stats',
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {
      // Silent — stats refresh in background
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // ─── Fetch events ─────────────────────────────────────────
  const fetchEvents = useCallback(async (
    page     = evtPage,
    severity = evtSeverity,
    type     = evtType,
    search   = evtSearch,
  ) => {
    setIsLoadingEvents(true);
    try {
      const params = new URLSearchParams({
        page:     String(page),
        severity,
        type,
        search,
      });
      const res  = await fetch(
        `/api/admin/security/events?${params}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
        setEvtTotal(data.pagination?.total || 0);
        setEvtTotalPages(data.pagination?.totalPages || 0);
      }
    } catch {
      showBanner('error', 'Failed to load events');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [evtPage, evtSeverity, evtType, evtSearch, showBanner]);

  // ─── Fetch blocked IPs ────────────────────────────────────
  const fetchBlockedIPs = useCallback(async (page = blkPage) => {
    setIsLoadingBlocked(true);
    try {
      const res  = await fetch(
        `/api/admin/security/block-ip?page=${page}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.success) {
        setBlockedIPs(data.blocks || []);
        setBlkTotal(data.pagination?.total || 0);
        setBlkTotalPages(data.pagination?.totalPages || 0);
      }
    } catch {
      showBanner('error', 'Failed to load blocked IPs');
    } finally {
      setIsLoadingBlocked(false);
    }
  }, [blkPage, showBanner]);

  // ─── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, session]);

  // ─── Tab-based loading ────────────────────────────────────
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    if (activeTab === 'events')  fetchEvents();
    if (activeTab === 'blocked') fetchBlockedIPs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── Auto-refresh stats every 30s ────────────────────────
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    refreshTimer.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats();
      }
    }, 30_000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [authStatus, fetchStats]);

  // ─── Event search debounce ────────────────────────────────
  const handleSearchChange = (value: string) => {
    setEvtSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setEvtSearch(value);
      setEvtPage(1);
      fetchEvents(1, evtSeverity, evtType, value);
    }, 400);
  };

  // ─── Event filter change ──────────────────────────────────
  const handleEvtFilter = (
    severity = evtSeverity,
    type     = evtType,
  ) => {
    setEvtPage(1);
    fetchEvents(1, severity, type, evtSearch);
  };

  // ─── Unblock IP ───────────────────────────────────────────
  const handleUnblock = async (ip: string) => {
    setUnblockingIP(ip);
    try {
      const res  = await fetch('/api/admin/security/block-ip', {
        method:      'DELETE',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ ip }),
      });
      const data = await res.json();
      if (data.success) {
        showBanner('success', `IP ${ip} has been unblocked.`);
        fetchBlockedIPs(blkPage);
      } else {
        showBanner('error', data.message || 'Failed to unblock IP');
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setUnblockingIP(null);
    }
  };

  // ─── Auth loading ─────────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin" />
      </div>
    );
  }
  if (!session || (session.user as any)?.role !== 'admin') return null;

  // ─── Compute threat total ─────────────────────────────────
  const threatTotal = stats
    ? Object.values(stats.threats).reduce((a, b) => a + b, 0)
    : 0;

  // ═════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>Security Dashboard — Highrise.pk Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {showBlockModal && (
        <BlockIPModal
          onClose={() => setShowBlockModal(false)}
          onBlocked={(ip) => {
            showBanner('success', `IP ${ip} has been blocked.`);
            if (activeTab === 'blocked') fetchBlockedIPs(1);
          }}
        />
      )}

      <AdminLayout>
        <div className="space-y-6">

          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
                <Shield className="w-7 h-7 text-[#029bba]" />
                Security Dashboard
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Real-time security monitoring, threat detection and IP management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-refresh 30s
              </div>
              <button
                onClick={() => { fetchStats(); showBanner('info', 'Stats refreshed.'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* ── Tab Bar ── */}
          <div className="flex items-center gap-1 border-b border-gray-200">
            {([
              { key: 'overview', label: 'Overview',   icon: <Activity  className="w-4 h-4" /> },
              { key: 'events',   label: 'Event Log',  icon: <Eye       className="w-4 h-4" /> },
              { key: 'blocked',  label: 'Blocked IPs', icon: <Ban      className="w-4 h-4" /> },
            ] as { key: ActiveTab; label: string; icon: React.ReactNode }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2
                  transition-all -mb-px
                  ${activeTab === tab.key
                    ? 'border-[#029bba] text-[#029bba]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════
              TAB 1: OVERVIEW
          ════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">

              {/* Stat cards row 1 — Totals */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Events (24h)"
                  value={stats?.totals.last24h ?? '—'}
                  icon={<Activity className="w-5 h-5" />}
                  color="teal"
                  pulse
                />
                <StatCard
                  label="Events (7 days)"
                  value={stats?.totals.last7d ?? '—'}
                  icon={<TrendingUp className="w-5 h-5" />}
                  color="blue"
                />
                <StatCard
                  label="Events (30 days)"
                  value={stats?.totals.last30d ?? '—'}
                  icon={<BarChart3 className="w-5 h-5" />}
                  color="gray"
                />
                <StatCard
                  label="Total Events"
                  value={stats?.totals.allTime ?? '—'}
                  icon={<FileText className="w-5 h-5" />}
                  color="gray"
                  subtitle="All time"
                />
              </div>

              {/* Stat cards row 2 — Severity */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Critical (30d)"
                  value={stats?.severity.critical ?? '—'}
                  icon={<ShieldX className="w-5 h-5" />}
                  color="red"
                />
                <StatCard
                  label="High (30d)"
                  value={stats?.severity.high ?? '—'}
                  icon={<ShieldAlert className="w-5 h-5" />}
                  color="orange"
                />
                <StatCard
                  label="Medium (30d)"
                  value={stats?.severity.medium ?? '—'}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  color="amber"
                />
                <StatCard
                  label="Low (30d)"
                  value={stats?.severity.low ?? '—'}
                  icon={<ShieldCheck className="w-5 h-5" />}
                  color="green"
                />
              </div>

              {/* Hourly trend + Threat summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Hourly chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-[#004063]">
                      Event Activity — Last 24 Hours
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-red-400" />
                        Critical
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-orange-400" />
                        High
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-[#029bba]" />
                        Other
                      </span>
                    </div>
                  </div>
                  {stats?.hourly ? (
                    <>
                      <MiniBarChart data={stats.hourly} height={80} />
                      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>23:00</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-20 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Threat summary */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-[#004063]">
                      Threats (24h)
                    </h3>
                    {threatTotal > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        {threatTotal} total
                      </span>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { key: 'bruteForceDetected',  label: 'Brute Force',       icon: <Zap       className="w-3.5 h-3.5" />, color: 'text-red-600'    },
                      { key: 'suspiciousActivity',   label: 'Suspicious',         icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-orange-600' },
                      { key: 'rateLimitExceeded',    label: 'Rate Limited',       icon: <Activity  className="w-3.5 h-3.5" />, color: 'text-amber-600'  },
                      { key: 'ipBlocked',            label: 'IPs Blocked',        icon: <Ban       className="w-3.5 h-3.5" />, color: 'text-red-600'    },
                      { key: 'permissionDenied',     label: 'Access Denied',      icon: <Lock      className="w-3.5 h-3.5" />, color: 'text-orange-600' },
                      { key: 'vpnDetected',          label: 'VPN Detected',       icon: <Globe     className="w-3.5 h-3.5" />, color: 'text-blue-600'   },
                    ].map(({ key, label, icon, color }) => {
                      const count = stats?.threats[key as keyof typeof stats.threats] ?? 0;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <div className={`flex items-center gap-2 text-xs font-semibold ${color}`}>
                            {icon}
                            {label}
                          </div>
                          <span className={`text-sm font-black ${count > 0 ? color : 'text-gray-300'}`}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Category breakdown + Recent critical */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Category breakdown */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-black text-[#004063] mb-4">
                    Events by Category (24h)
                  </h3>
                  <div className="space-y-3">
                    {stats
                      ? Object.entries(stats.category)
                          .sort(([, a], [, b]) => b - a)
                          .map(([cat, count]) => {
                            const total = Object.values(stats.category).reduce((a, b) => a + b, 1);
                            const pct   = Math.round((count / total) * 100);
                            return (
                              <div key={cat}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 capitalize">
                                    {CATEGORY_ICONS[cat] || <Activity className="w-4 h-4" />}
                                    {cat}
                                  </div>
                                  <span className="text-xs font-bold text-gray-700">
                                    {count.toLocaleString()}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-1.5 rounded-full bg-[#029bba] transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                      : (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
                        </div>
                      )
                    }
                  </div>
                </div>

                {/* Recent critical events */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-black text-[#004063] mb-4">
                    Recent Critical Events
                  </h3>
                  {stats?.recentCritical && stats.recentCritical.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentCritical.map((ev) => (
                        <div
                          key={ev._id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            SEVERITY_STYLES[ev.severity]?.dot || 'bg-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">
                              {formatEventType(ev.type)}
                            </p>
                            {ev.email && (
                              <p className="text-[10px] text-gray-400 truncate">
                                {ev.email}
                              </p>
                            )}
                            {ev.ip && (
                              <p className="text-[10px] text-gray-400 font-mono truncate">
                                {ev.ip}
                              </p>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 shrink-0">
                            {timeAgo(ev.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ShieldCheck className="w-10 h-10 text-emerald-400 mb-2" />
                      <p className="text-sm font-bold text-gray-500">No critical events</p>
                      <p className="text-xs text-gray-400">System is running clean</p>
                    </div>
                  )}

                  {/* Top event types */}
                  {stats?.topEvents && stats.topEvents.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                        Top Event Types (24h)
                      </p>
                      <div className="space-y-1.5">
                        {stats.topEvents.slice(0, 5).map((ev) => (
                          <div key={ev.type} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 truncate">
                              {ev.label}
                            </span>
                            <span className="text-xs font-bold text-gray-700 shrink-0 ml-2">
                              {ev.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              TAB 2: EVENT LOG
          ════════════════════════════════════════ */}
          {activeTab === 'events' && (
            <div className="space-y-4">

              {/* Filters */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">

                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by email, IP, or action..."
                      value={evtSearchInput}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all"
                    />
                    {evtSearchInput && (
                      <button
                        onClick={() => { setEvtSearchInput(''); handleSearchChange(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Severity filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                    <select
                      value={evtSeverity}
                      onChange={(e) => {
                        setEvtSeverity(e.target.value);
                        handleEvtFilter(e.target.value, evtType);
                      }}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba]"
                    >
                      <option value="all">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Event table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-500">
                    {isLoadingEvents
                      ? 'Loading...'
                      : `${evtTotal.toLocaleString()} events`
                    }
                  </p>
                  {evtTotalPages > 1 && (
                    <p className="text-xs text-gray-400">
                      Page {evtPage} of {evtTotalPages}
                    </p>
                  )}
                </div>

                {isLoadingEvents ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-6 h-6 text-[#029bba] animate-spin" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <ShieldCheck className="w-12 h-12 text-emerald-400 mb-3" />
                    <p className="text-sm font-bold text-gray-500">No events found</p>
                    <p className="text-xs text-gray-400">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Severity</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Event Type</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">IP</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {events.map((ev) => (
                          <tr
                            key={ev._id}
                            className={`hover:bg-gray-50 transition-colors ${
                              ev.severity === 'critical' ? 'bg-red-50/30' :
                              ev.severity === 'high'     ? 'bg-orange-50/20' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <SeverityBadge severity={ev.severity} />
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold text-gray-700">
                                {formatEventType(ev.type)}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-xs text-gray-500 font-mono truncate max-w-[140px] block">
                                {ev.email || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="text-xs text-gray-500 font-mono">
                                {ev.ip || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden xl:table-cell">
                              <span className="text-xs text-gray-400 truncate max-w-[160px] block">
                                {(ev.metadata?.action as string) || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                {timeAgo(ev.createdAt)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {!isLoadingEvents && evtTotalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Page <span className="font-bold">{evtPage}</span> of{' '}
                      <span className="font-bold">{evtTotalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const p = evtPage - 1;
                          setEvtPage(p);
                          fetchEvents(p);
                        }}
                        disabled={evtPage <= 1}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </button>
                      <button
                        onClick={() => {
                          const p = evtPage + 1;
                          setEvtPage(p);
                          fetchEvents(p);
                        }}
                        disabled={evtPage >= evtTotalPages}
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
          )}

          {/* ════════════════════════════════════════
              TAB 3: BLOCKED IPs
          ════════════════════════════════════════ */}
          {activeTab === 'blocked' && (
            <div className="space-y-4">

              {/* Header + block button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {blkTotal.toLocaleString()} blocked IP{blkTotal !== 1 ? 's' : ''} active
                </p>
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  Block IP Address
                </button>
              </div>

              {/* Blocked IPs table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {isLoadingBlocked ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-6 h-6 text-[#029bba] animate-spin" />
                  </div>
                ) : blockedIPs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                      <Unlock className="w-7 h-7 text-emerald-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-500 mb-1">
                      No blocked IPs
                    </p>
                    <p className="text-xs text-gray-400 text-center max-w-xs">
                      Block suspicious IP addresses to prevent repeated attacks.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">IP Address</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Reason</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Blocked</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Expires</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {blockedIPs.map((block) => (
                          <tr key={block._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                                  <Ban className="w-3.5 h-3.5 text-red-600" />
                                </div>
                                <span className="text-sm font-mono font-bold text-gray-800">
                                  {block.ip}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 hidden sm:table-cell">
                              <span className="text-xs text-gray-600 line-clamp-1 max-w-[200px]">
                                {block.reason}
                              </span>
                            </td>
                            <td className="px-4 py-4 hidden md:table-cell">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                {timeAgo(block.blockedAt)}
                              </div>
                            </td>
                            <td className="px-4 py-4 hidden lg:table-cell">
                              {block.expiresAt ? (
                                <span className="text-xs text-amber-600 font-semibold">
                                  {new Date(block.expiresAt).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-red-600">
                                  Permanent
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => handleUnblock(block.ip)}
                                disabled={unblockingIP === block.ip}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-50 ml-auto"
                              >
                                {unblockingIP === block.ip
                                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                                  : <Unlock className="w-3 h-3" />
                                }
                                Unblock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {!isLoadingBlocked && blkTotalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Page <span className="font-bold">{blkPage}</span> of{' '}
                      <span className="font-bold">{blkTotalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const p = blkPage - 1;
                          setBlkPage(p);
                          fetchBlockedIPs(p);
                        }}
                        disabled={blkPage <= 1}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </button>
                      <button
                        onClick={() => {
                          const p = blkPage + 1;
                          setBlkPage(p);
                          fetchBlockedIPs(p);
                        }}
                        disabled={blkPage >= blkTotalPages}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </AdminLayout>
    </>
  );
}