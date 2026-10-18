// pages/admin/users/[id].tsx
// Admin User Detail Page — V4.1 Compliant
// FLAT FILE (not folder/index.tsx)
// Single AdminLayout | useSession() guard | noindex
// Inline modals + banners | next/image | mailto: email
// Risk score widget | Audit trail | All admin actions

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Building2,
  CheckCircle,
  Clock,
  ShieldOff,
  ShieldAlert,
  Trash2,
  RotateCcw,
  Loader2,
  FileText,
  CreditCard,
  Home,
  Briefcase,
  Globe,
  AlertTriangle,
  AlertCircle,
  Activity,
  TrendingUp,
  Lock,
  Unlock,
  LogOut,
  X,
  ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDetail {
  _id:               string;
  name?:             string;
  displayName?:      string;
  email?:            string;
  phone?:            string;
  whatsappNumber?:   string;
  role?:             string;
  status?:           string;
  statusReason?:     string;
  statusChangedAt?:  string | null;
  accountType?:      string;
  profession?:       string;
  companyName?:      string;
  city?:             string;
  country?:          string;
  about?:            string;
  licenseNumber?:    string;
  ntnNumber?:        string;
  officeAddress?:    string;
  homeAddress?:      string;
  cnicName?:         string;
  cnicStatus?:       string;
  cnicLockedAt?:     string | null;
  cnicFrontUrl?:     string;
  cnicBackUrl?:      string;
  licenseFileUrl?:   string;
  companyProofUrl?:  string;
  ntnCertUrl?:       string;
  profilePictureUrl?: string;
  isVerified?:       boolean;
  isDeleted?:        boolean;
  deletedAt?:        string | null;
  loginAttempts?:    number;
  lastLoginAt?:      string | null;
  tokenVersion?:     number;
  createdAt?:        string | null;
  updatedAt?:        string | null;
}

interface UserDetailResponse {
  success:     boolean;
  message?:    string;
  user?:       UserDetail;
  statistics?: {
    properties: {
      total: number; active: number; verified: number; pendingVerification: number;
      note?: string;
    };
    account: {
      ageInDays: number; lastLogin: string | null;
      failedLoginAttempts: number; totalSuccessfulLogins: number;
      tokenVersion: number; isLocked: boolean;
    };
  };
  security?: {
    riskScore:    number;
    riskLevel:    'low' | 'medium' | 'high' | 'critical';
    status:       string;
    isVerified:   boolean;
    isDeleted:    boolean;
    isLocked:     boolean;
    recentEvents: Array<{
      type:      string;
      severity:  string;
      createdAt: string;
      metadata:  Record<string, unknown>;
    }>;
  };
}

interface Banner {
  type:    'success' | 'error';
  message: string;
}

type ValidRole = 'user' | 'agent' | 'developer';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_ROLES: { value: ValidRole; label: string }[] = [
  { value: 'user',      label: 'User'      },
  { value: 'agent',     label: 'Agent'     },
  { value: 'developer', label: 'Developer' },
];

const STATUS_CONFIG = {
  active:    { cls: 'bg-[#f0fdf4] text-[#10b981] border-[#10b981]', icon: CheckCircle, label: 'Active' },
  pending:   { cls: 'bg-[#fef3c7] text-[#92400e] border-[#f59e0b]', icon: Clock,       label: 'Pending' },
  suspended: { cls: 'bg-[#fef3c7] text-[#9a3412] border-[#f59e0b]', icon: ShieldOff,   label: 'Suspended' },
  banned:    { cls: 'bg-[#fef2f2] text-red-700 border-[#ef4444]',   icon: ShieldAlert, label: 'Banned' },
} as const;

const ROLE_BADGE_CLS: Record<string, string> = {
  user:      'bg-gray-100 text-gray-700',
  agent:     'bg-blue-100 text-blue-700',
  developer: 'bg-green-100 text-green-700',
  admin:     'bg-purple-100 text-purple-700',
  reader:    'bg-slate-100 text-slate-600',
  writer:    'bg-slate-100 text-slate-600',
  editor:    'bg-slate-100 text-slate-600',
};

const RISK_LEVEL_CFG = {
  low:      { cls: 'bg-[#f0fdf4] text-[#10b981] border-[#10b981]', label: 'Low Risk' },
  medium:   { cls: 'bg-[#fef3c7] text-amber-700 border-[#f59e0b]', label: 'Medium Risk' },
  high:     { cls: 'bg-[#fef2f2] text-orange-700 border-orange-400', label: 'High Risk' },
  critical: { cls: 'bg-[#fef2f2] text-red-700 border-[#ef4444]',   label: 'Critical Risk' },
} as const;

const SEVERITY_CLS: Record<string, string> = {
  low:      'bg-gray-100 text-gray-700',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function refreshSidebarStats(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('refreshAdminStats'));
  }
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
}

function InfoCard({ icon, label, value }: InfoCardProps): React.ReactElement {
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
      <div className="p-2 bg-white rounded-lg text-gray-500 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-words">{value || 'Not provided'}</p>
      </div>
    </div>
  );
}

interface DocumentCardProps {
  label: string;
  url:   string | undefined;
}

function DocumentCard({ label, url }: DocumentCardProps): React.ReactElement {
  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#029bba] text-white text-xs rounded-lg hover:bg-[#027a94] transition-colors"
        >
          <FileText className="w-3 h-3" />
          View Document
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <p className="text-xs text-gray-400">Not uploaded</p>
      )}
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: 'primary' | 'danger' | 'warning';
  showReason: boolean;
  loading: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function ConfirmModal({
  open, title, message, confirmLabel, confirmColor,
  showReason, loading, onConfirm, onCancel,
}: ConfirmModalProps): React.ReactElement | null {
  const [reason, setReason] = useState('');
  useEffect(() => { if (!open) setReason(''); }, [open]);
  if (!open) return null;

  const btnCls = {
    primary: 'bg-[#029bba] hover:bg-[#027a94]',
    danger:  'bg-[#ef4444] hover:bg-red-700',
    warning: 'bg-[#f59e0b] hover:bg-amber-600',
  }[confirmColor];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-[#004063] mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">{message}</p>
        {showReason && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason {confirmColor === 'danger' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Enter reason..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#029bba] outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || (showReason && confirmColor === 'danger' && reason.trim().length < 5)}
            className={`px-4 py-2 text-sm text-white rounded-xl disabled:opacity-50 flex items-center gap-2 ${btnCls}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Permanent Delete Modal — separate (needs confirmation code + reason)
interface PermanentDeleteModalProps {
  open: boolean;
  userName: string;
  loading: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function PermanentDeleteModal({
  open, userName, loading, onConfirm, onCancel,
}: PermanentDeleteModalProps): React.ReactElement | null {
  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) { setCode(''); setReason(''); }
  }, [open]);

  if (!open) return null;
  const codeValid = code === 'DELETE-USER-PERMANENTLY';
  const reasonValid = reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
          </div>
          <h3 className="text-lg font-bold text-[#ef4444]">Permanent Delete</h3>
        </div>
        <p className="text-sm text-gray-700 mb-4">
          You are about to <strong>permanently delete</strong> the user <strong>{userName}</strong>.
          This action <strong>cannot be undone</strong>.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Type confirmation code: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[#ef4444]">DELETE-USER-PERMANENTLY</code>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="DELETE-USER-PERMANENTLY"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#029bba] outline-none font-mono"
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Reason <span className="text-red-500">*</span> (min 10 chars)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Why are you permanently deleting this user?"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#029bba] outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || !codeValid || !reasonValid}
            className="px-4 py-2 text-sm text-white rounded-xl bg-[#ef4444] hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function UserDetailContent({ userId }: { userId: string }): React.ReactElement {
  const router = useRouter();

  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);

  // Modals
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string;
    confirmLabel: string; confirmColor: 'primary' | 'danger' | 'warning';
    showReason: boolean; onConfirm: (r: string) => Promise<void>;
  }>({
    open: false, title: '', message: '', confirmLabel: 'Confirm',
    confirmColor: 'primary', showReason: false, onConfirm: async () => {},
  });
  const [permDeleteOpen, setPermDeleteOpen] = useState(false);

  const showBanner = useCallback((type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  // Fetch
  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include',
      });
      const result = await res.json() as UserDetailResponse;

      if (result.success && result.user) {
        setData(result);
      } else {
        showBanner('error', result.message ?? 'Failed to load user');
      }
    } catch {
      showBanner('error', 'Network error');
    } finally {
      setLoading(false);
    }
  }, [userId, showBanner]);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  // Mutation helper
  const performMutation = useCallback(async (
    url: string, method: 'PATCH' | 'PUT' | 'DELETE',
    body?: Record<string, unknown>, successMessage = 'Updated'
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await res.json() as { success: boolean; message?: string };
      if (result.success) {
        showBanner('success', result.message ?? successMessage);
        await fetchUser();
        refreshSidebarStats();
        return true;
      } else {
        showBanner('error', result.message ?? 'Action failed');
        return false;
      }
    } catch {
      showBanner('error', 'Network error');
      return false;
    } finally {
      setBusy(false);
    }
  }, [fetchUser, showBanner]);

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
      </div>
    );
  }

  // Not found
  if (!data?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <User className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">User Not Found</h2>
        <p className="text-sm text-gray-500 mb-4">The user does not exist or has been removed.</p>
        <Link href="/admin/users" className="px-4 py-2 bg-[#029bba] text-white rounded-xl text-sm hover:bg-[#027a94]">
          Back to Users
        </Link>
      </div>
    );
  }

  const user = data.user;
  const stats = data.statistics;
  const security = data.security;

  const status = STATUS_CONFIG[user.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
  const StatusIcon = status.icon;
  const roleCls = ROLE_BADGE_CLS[user.role ?? 'user'] ?? ROLE_BADGE_CLS.user;
  const isAdmin = user.role === 'admin';

  // Action handlers
  const handleActivate = () => {
    void performMutation(`/api/admin/users/${userId}`, 'PATCH', { status: 'active' }, 'User activated');
  };

  const handleSuspend = () => {
    setConfirmModal({
      open: true, title: 'Suspend User',
      message: `Suspend "${user.name}"? They will be logged out and cannot log in.`,
      confirmLabel: 'Suspend', confirmColor: 'warning', showReason: true,
      onConfirm: async (reason) => {
        const body: Record<string, unknown> = { status: 'suspended' };
        if (reason) body.statusReason = reason;
        await performMutation(`/api/admin/users/${userId}`, 'PATCH', body, 'User suspended');
        setConfirmModal((p) => ({ ...p, open: false }));
      },
    });
  };

  const handleBan = () => {
    setConfirmModal({
      open: true, title: 'Ban User',
      message: `Ban "${user.name}"? They will be logged out. Reason required (min 5 chars).`,
      confirmLabel: 'Ban User', confirmColor: 'danger', showReason: true,
      onConfirm: async (reason) => {
        if (reason.length < 5) { showBanner('error', 'Reason must be at least 5 characters'); return; }
        await performMutation(`/api/admin/users/${userId}`, 'PATCH', { status: 'banned', statusReason: reason }, 'User banned');
        setConfirmModal((p) => ({ ...p, open: false }));
      },
    });
  };

  const handleRoleChange = (newRole: string) => {
    setConfirmModal({
      open: true, title: 'Change Role',
      message: `Change role to "${newRole}"? User will be logged out and need to log in again.`,
      confirmLabel: 'Change Role', confirmColor: 'primary', showReason: false,
      onConfirm: async () => {
        await performMutation(`/api/admin/users/${userId}`, 'PATCH', { role: newRole }, `Role changed to ${newRole}`);
        setConfirmModal((p) => ({ ...p, open: false }));
      },
    });
  };

  const handleForceLogout = () => {
    setConfirmModal({
      open: true, title: 'Force Logout',
      message: `Force logout for "${user.name}"? All active sessions will be terminated immediately.`,
      confirmLabel: 'Force Logout', confirmColor: 'warning', showReason: false,
      onConfirm: async () => {
        await performMutation(`/api/admin/users/${userId}`, 'PATCH', { forceLogout: true }, 'User logged out');
        setConfirmModal((p) => ({ ...p, open: false }));
      },
    });
  };

  const handleUnlock = () => {
    void performMutation(`/api/admin/users/${userId}`, 'PATCH', { unlockAccount: true }, 'Account unlocked');
  };

  const handleTrash = () => {
    setConfirmModal({
      open: true, title: 'Move to Trash',
      message: `Move "${user.name}" to trash? You can restore from the trash tab.`,
      confirmLabel: 'Move to Trash', confirmColor: 'danger', showReason: false,
      onConfirm: async () => {
        const ok = await performMutation(`/api/admin/users/${userId}/trash`, 'PUT', undefined, 'User moved to trash');
        setConfirmModal((p) => ({ ...p, open: false }));
        if (ok) void router.push('/admin/users?status=trash');
      },
    });
  };

  const handleRestore = () => {
    void performMutation(`/api/admin/users/${userId}/trash`, 'PUT', undefined, 'User restored');
  };

  const handlePermanentDelete = async (reason: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permanent-delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationCode: 'DELETE-USER-PERMANENTLY',
          reason,
        }),
      });
      const result = await res.json() as { success: boolean; message?: string };
      if (result.success) {
        showBanner('success', 'User permanently deleted');
        refreshSidebarStats();
        setPermDeleteOpen(false);
        setTimeout(() => void router.push('/admin/users'), 1000);
      } else {
        showBanner('error', result.message ?? 'Failed to delete');
      }
    } catch {
      showBanner('error', 'Network error');
    } finally {
      setBusy(false);
    }
  };

  const riskCfg = security?.riskLevel ? RISK_LEVEL_CFG[security.riskLevel] : null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Back */}
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </Link>

      {/* Banner */}
      {banner && (
        <div className={`mb-4 rounded-xl p-4 border-l-4 flex items-center justify-between gap-4 ${
          banner.type === 'success'
            ? 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]'
            : 'bg-[#fef2f2] border-[#ef4444] text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {banner.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <p className="text-sm font-medium">{banner.message}</p>
          </div>
          <button type="button" onClick={() => setBanner(null)} className="shrink-0 p-1 hover:bg-black/5 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Deleted warning */}
      {user.isDeleted && (
        <div className="mb-6 p-4 bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">This user is in trash</p>
            <p className="text-xs text-red-600">Deleted on {formatDate(user.deletedAt)}</p>
          </div>
          <button
            type="button"
            onClick={handleRestore}
            disabled={busy}
            className="px-4 py-2 bg-[#029bba] text-white rounded-xl text-sm hover:bg-[#027a94] flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Restore
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.profilePictureUrl ? (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden">
                <Image
                  src={user.profilePictureUrl}
                  alt={user.name ?? 'User'}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-bold text-3xl">
                {user.name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
            )}
            {user.isVerified && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#10b981] rounded-full flex items-center justify-center border-4 border-white">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{user.name ?? 'Unknown'}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${status.cls} flex items-center gap-1.5`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleCls}`}>
                {user.role}
              </span>
              {security?.isLocked && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fef2f2] text-red-700 border border-red-300 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Locked
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">@{user.displayName ?? user.name}</p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 hover:text-[#029bba]">
                <Mail className="w-4 h-4 text-gray-400" />
                {user.email}
              </a>
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-gray-400" />
                {user.phone ?? '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                {user.city ?? '—'}, {user.country ?? 'PK'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Joined {formatDateShort(user.createdAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          {!isAdmin && !user.isDeleted && (
            <div className="flex flex-col gap-2 shrink-0">
              {user.status !== 'active' && (
                <button type="button" onClick={handleActivate} disabled={busy} className="px-4 py-2 bg-[#10b981] text-white rounded-xl text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Activate
                </button>
              )}
              {user.status === 'active' && (
                <button type="button" onClick={handleSuspend} disabled={busy} className="px-4 py-2 bg-[#f59e0b] text-white rounded-xl text-sm hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2">
                  <ShieldOff className="w-4 h-4" /> Suspend
                </button>
              )}
              {user.status !== 'banned' && (
                <button type="button" onClick={handleBan} disabled={busy} className="px-4 py-2 bg-[#ef4444] text-white rounded-xl text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Ban
                </button>
              )}
              <button type="button" onClick={handleTrash} disabled={busy} className="px-4 py-2 border border-red-300 text-red-600 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Trash
              </button>
            </div>
          )}
          {user.isDeleted && (
            <div className="flex flex-col gap-2 shrink-0">
              <button type="button" onClick={() => setPermDeleteOpen(true)} disabled={busy} className="px-4 py-2 bg-[#ef4444] text-white rounded-xl text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete Forever
              </button>
            </div>
          )}
        </div>

        {/* Status reason */}
        {user.statusReason && (user.status === 'suspended' || user.status === 'banned') && (
          <div className="mt-4 p-3 bg-[#fef3c7] border-l-4 border-[#f59e0b] rounded-xl">
            <p className="text-sm text-amber-800"><strong>Reason:</strong> {user.statusReason}</p>
            {user.statusChangedAt && (
              <p className="text-xs text-amber-700 mt-1">Changed: {formatDate(user.statusChangedAt)}</p>
            )}
          </div>
        )}
      </div>

      {/* Quick Admin Actions Row */}
      {!isAdmin && !user.isDeleted && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-wrap gap-2">
          <button type="button" onClick={handleForceLogout} disabled={busy} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Force Logout
          </button>
          {security?.isLocked && (
            <button type="button" onClick={handleUnlock} disabled={busy} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2">
              <Unlock className="w-4 h-4" /> Unlock Account
            </button>
          )}
          <a href={`mailto:${user.email}`} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email User
          </a>
        </div>
      )}

      {/* Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Personal Info */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-[#004063] mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#029bba]" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoCard icon={<User className="w-4 h-4" />} label="Full Name" value={user.name} />
            <InfoCard icon={<Mail className="w-4 h-4" />} label="Email" value={user.email} />
            <InfoCard icon={<Phone className="w-4 h-4" />} label="Phone" value={user.phone} />
            <InfoCard icon={<Phone className="w-4 h-4" />} label="WhatsApp" value={user.whatsappNumber} />
            <InfoCard icon={<MapPin className="w-4 h-4" />} label="City" value={user.city} />
            <InfoCard icon={<Globe className="w-4 h-4" />} label="Country" value={user.country} />
            <InfoCard icon={<CreditCard className="w-4 h-4" />} label="CNIC Name" value={user.cnicName} />
            <InfoCard icon={<CreditCard className="w-4 h-4" />} label="KYC Status" value={user.cnicStatus} />
            <InfoCard icon={<Home className="w-4 h-4" />} label="Home Address" value={user.homeAddress} />
            <InfoCard icon={<MapPin className="w-4 h-4" />} label="Office Address" value={user.officeAddress} />
          </div>
        </div>

        {/* Account Info + Role */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-[#004063] mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#029bba]" />
            Account Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <InfoCard icon={<Briefcase className="w-4 h-4" />} label="Account Type" value={user.accountType} />
            <InfoCard icon={<User className="w-4 h-4" />} label="Profession" value={user.profession} />
            <InfoCard icon={<Calendar className="w-4 h-4" />} label="Joined" value={formatDate(user.createdAt)} />
            <InfoCard icon={<Calendar className="w-4 h-4" />} label="Last Login" value={formatDate(user.lastLoginAt)} />
            <InfoCard icon={<Activity className="w-4 h-4" />} label="Total Logins" value={String(stats?.account.totalSuccessfulLogins ?? 0)} />
            <InfoCard icon={<Lock className="w-4 h-4" />} label="Failed Attempts" value={String(stats?.account.failedLoginAttempts ?? 0)} />
          </div>

          {!isAdmin && !user.isDeleted && (
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-xs font-medium text-gray-700 mb-2">Change Role</label>
              <div className="flex flex-wrap gap-2">
                {VALID_ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => user.role !== r.value && handleRoleChange(r.value)}
                    disabled={busy || user.role === r.value}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      user.role === r.value
                        ? 'bg-[#029bba] text-white cursor-default'
                        : 'border border-gray-300 text-gray-700 hover:border-[#029bba] hover:text-[#029bba] disabled:opacity-50'
                    }`}
                  >
                    {r.label}
                    {user.role === r.value && ' (current)'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Note: Cannot promote to admin via UI for security.</p>
            </div>
          )}
        </div>

        {/* Business Info (company only) */}
        {user.accountType === 'company' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-[#004063] mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#029bba]" />
              Business Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon={<Building2 className="w-4 h-4" />} label="Company Name" value={user.companyName} />
              <InfoCard icon={<FileText className="w-4 h-4" />} label="License Number" value={user.licenseNumber} />
              <InfoCard icon={<CreditCard className="w-4 h-4" />} label="NTN Number" value={user.ntnNumber} />
              <InfoCard icon={<MapPin className="w-4 h-4" />} label="Office Address" value={user.officeAddress} />
            </div>
          </div>
        )}

        {/* Risk Score Widget */}
        {security && riskCfg && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-[#004063] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#029bba]" />
              Security & Risk Assessment
            </h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                <p className="text-3xl font-bold text-gray-900">{security.riskScore}<span className="text-base text-gray-400">/100</span></p>
              </div>
              <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${riskCfg.cls}`}>
                {riskCfg.label}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Email Verified</span>
                <span className={security.isVerified ? 'text-[#10b981]' : 'text-red-600'}>
                  {security.isVerified ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Account Locked</span>
                <span className={security.isLocked ? 'text-red-600' : 'text-[#10b981]'}>
                  {security.isLocked ? '✗ Yes' : '✓ No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Token Version</span>
                <span className="font-mono text-gray-900">{stats?.account.tokenVersion ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Account Age</span>
                <span className="text-gray-900">{stats?.account.ageInDays ?? 0} days</span>
              </div>
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-[#004063] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#029bba]" />
            Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DocumentCard label="CNIC Front" url={user.cnicFrontUrl} />
            <DocumentCard label="CNIC Back" url={user.cnicBackUrl} />
            <DocumentCard label="License" url={user.licenseFileUrl} />
            <DocumentCard label="NTN Certificate" url={user.ntnCertUrl} />
            {user.accountType === 'company' && (
              <DocumentCard label="Company Proof" url={user.companyProofUrl} />
            )}
          </div>
        </div>

        {/* Audit Trail */}
        {security?.recentEvents && security.recentEvents.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
            <h2 className="text-base font-bold text-[#004063] mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#029bba]" />
              Recent Activity ({security.recentEvents.length})
            </h2>
            <div className="space-y-2">
              {security.recentEvents.map((event, i) => (
                <div key={`${event.createdAt}-${i}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${SEVERITY_CLS[event.severity] ?? SEVERITY_CLS.low}`}>
                    {event.severity}
                  </span>
                  <span className="text-sm text-gray-900 flex-1 truncate">{event.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-500 shrink-0">{formatDate(event.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmColor={confirmModal.confirmColor}
        showReason={confirmModal.showReason}
        loading={busy}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, open: false }))}
      />

      <PermanentDeleteModal
        open={permDeleteOpen}
        userName={user.name ?? 'User'}
        loading={busy}
        onConfirm={handlePermanentDelete}
        onCancel={() => setPermDeleteOpen(false)}
      />
    </div>
  );
}

// ─── Page Export with Auth Guard ──────────────────────────────────────────────

export default function AdminUserDetailPage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { id } = router.query;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      void router.replace('/login');
    }
  }, [session, status, router]);

  return (
    <>
      <Head>
        <title>User Details | Highrise Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AdminLayout>
        {status === 'loading' || !session || session.user?.role !== 'admin' ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
          </div>
        ) : typeof id !== 'string' ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-sm text-gray-500">Invalid user ID</p>
          </div>
        ) : (
          <UserDetailContent userId={id} />
        )}
      </AdminLayout>
    </>
  );
}