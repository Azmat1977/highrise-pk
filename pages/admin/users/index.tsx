// pages/admin/users/index.tsx
// Admin Users Management List — V4.1 Compliant
// Single AdminLayout wrap | useSession() guard | noindex
// Inline banners + modals | No toast | No framer-motion | No <img>
// Mailto: email button | Pagination | Tab sync with URL

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Users,
  Search,
  CheckCircle,
  Clock,
  Trash2,
  RotateCcw,
  Eye,
  Shield,
  ShieldOff,
  ShieldAlert,
  ChevronDown,
  X,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaskedUser {
  _id:               string;
  name:              string;
  displayName:       string;
  emailMasked:       string;
  phoneMasked:       string;
  role:              string;
  status:            string;
  accountType:       string;
  city:              string;
  country:           string;
  isVerified:        boolean;
  isDeleted:         boolean;
  cnicStatus:        string;
  profilePictureUrl: string;
  createdAt:         string;
  lastLoginAt:       string | null;
  deletedAt:         string | null;
  statusReason:      string;
}

interface Counts {
  all:       number;
  active:    number;
  pending:   number;
  suspended: number;
  banned:    number;
  trash:     number;
}

interface Banner {
  type:    'success' | 'error';
  message: string;
}

type StatusAction = 'active' | 'pending' | 'suspended' | 'banned';
type ValidRole = 'user' | 'agent' | 'developer';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',       label: 'All Users',  icon: Users       },
  { key: 'active',    label: 'Active',     icon: CheckCircle },
  { key: 'pending',   label: 'Pending',    icon: Clock       },
  { key: 'suspended', label: 'Suspended',  icon: ShieldOff   },
  { key: 'banned',    label: 'Banned',     icon: ShieldAlert },
  { key: 'trash',     label: 'Trash',      icon: Trash2      },
] as const;

// V4.1 Option A — only 4 valid assignable roles
const VALID_ROLES: { value: ValidRole; label: string; cls: string }[] = [
  { value: 'user',      label: 'User',      cls: 'bg-gray-100 text-gray-700' },
  { value: 'agent',     label: 'Agent',     cls: 'bg-blue-100 text-blue-700' },
  { value: 'developer', label: 'Developer', cls: 'bg-green-100 text-green-700' },
];

// Legacy roles shown read-only in filters (cannot be assigned to)
const ALL_ROLE_LABELS: Record<string, string> = {
  user:      'User',
  agent:     'Agent',
  developer: 'Developer',
  admin:     'Admin',
  reader:    'Reader (legacy)',
  writer:    'Writer (legacy)',
  editor:    'Editor (legacy)',
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  active:    { cls: 'bg-[#f0fdf4] text-[#10b981] border-[#10b981]', label: 'Active'    },
  pending:   { cls: 'bg-[#fef3c7] text-[#92400e] border-[#f59e0b]', label: 'Pending'   },
  suspended: { cls: 'bg-[#fef3c7] text-[#9a3412] border-[#f59e0b]', label: 'Suspended' },
  banned:    { cls: 'bg-[#fef2f2] text-red-700 border-[#ef4444]',   label: 'Banned'    },
};

const ROLE_BADGE_CLS: Record<string, string> = {
  user:      'bg-gray-100 text-gray-700',
  agent:     'bg-blue-100 text-blue-700',
  developer: 'bg-green-100 text-green-700',
  admin:     'bg-purple-100 text-purple-700',
  reader:    'bg-slate-100 text-slate-600',
  writer:    'bg-slate-100 text-slate-600',
  editor:    'bg-slate-100 text-slate-600',
};

const PAGE_SIZE = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  });
}

function refreshSidebarStats(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('refreshAdminStats'));
  }
}

// ─── Inline Confirm Modal ─────────────────────────────────────────────────────

interface InlineConfirmModalProps {
  open:          boolean;
  title:         string;
  message:       string;
  confirmLabel:  string;
  confirmColor:  'primary' | 'danger' | 'warning';
  loading:       boolean;
  showReason:    boolean;
  onConfirm:     (reason: string) => void;
  onCancel:      () => void;
}

function InlineConfirmModal({
  open, title, message, confirmLabel, confirmColor, loading,
  showReason, onConfirm, onCancel,
}: InlineConfirmModalProps): React.ReactElement | null {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  if (!open) return null;

  const btnCls: Record<typeof confirmColor, string> = {
    primary: 'bg-[#029bba] hover:bg-[#027a94]',
    danger:  'bg-[#ef4444] hover:bg-red-700',
    warning: 'bg-[#f59e0b] hover:bg-amber-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
        role="dialog"
        aria-modal="true"
      >
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
              placeholder="Enter reason for this action..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || (showReason && confirmColor === 'danger' && reason.trim().length < 5)}
            className={`px-4 py-2 text-sm text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 ${btnCls[confirmColor]}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Avatar ──────────────────────────────────────────────────────────────

function UserAvatar({
  url, name, size = 48,
}: { url: string; name: string; size?: number }): React.ReactElement {
  if (url) {
    return (
      <div className={`relative rounded-full overflow-hidden bg-gray-100`} style={{ width: size, height: size }}>
        <Image
          src={url}
          alt={name}
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {name?.charAt(0).toUpperCase() || 'U'}
    </div>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────

interface UserCardProps {
  user:        MaskedUser;
  isTrashTab:  boolean;
  busy:        boolean;
  onAction:    (action: string, user: MaskedUser, extra?: string) => void;
}

function UserCard({ user, isTrashTab, busy, onAction }: UserCardProps): React.ReactElement {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const status = STATUS_BADGE[user.status] ?? STATUS_BADGE.active;
  const roleCls = ROLE_BADGE_CLS[user.role] ?? ROLE_BADGE_CLS.user;
  const roleLabel = ALL_ROLE_LABELS[user.role] ?? user.role;
  const isAdmin = user.role === 'admin';
  const canChangeRole = !isTrashTab && !isAdmin;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <UserAvatar url={user.profilePictureUrl} name={user.name} size={48} />
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#10b981] rounded-full flex items-center justify-center border-2 border-white">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
            <p className="text-xs text-gray-500 truncate">{user.emailMasked}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${status.cls} shrink-0`}>
          {status.label}
        </span>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-gray-400" />
          <span className="truncate">{user.phoneMasked || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-gray-400" />
          <span className="truncate">{user.city || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span>{formatDate(user.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-gray-400" />
          <span className="truncate capitalize">{user.accountType}</span>
        </div>
      </div>

      {/* Role + KYC badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {canChangeRole ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              disabled={busy}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-80 disabled:opacity-50 ${roleCls}`}
            >
              <Shield className="w-3 h-3" />
              {roleLabel}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showRoleMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowRoleMenu(false)} />
                <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                  {VALID_ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        onAction('change-role', user, r.value);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50 ${user.role === r.value ? 'font-bold text-[#029bba]' : ''}`}
                    >
                      <span className={`px-2 py-0.5 rounded ${r.cls}`}>{r.label}</span>
                      {user.role === r.value && <CheckCircle className="w-3 h-3 ml-auto text-[#10b981]" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${roleCls}`}>
            <Shield className="w-3 h-3" />
            {roleLabel}
          </span>
        )}
        {user.cnicStatus !== 'none' && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            user.cnicStatus === 'verified' ? 'bg-[#f0fdf4] text-[#10b981]' :
            user.cnicStatus === 'rejected' ? 'bg-[#fef2f2] text-red-700' :
            'bg-[#fef3c7] text-amber-700'
          }`}>
            KYC: {user.cnicStatus}
          </span>
        )}
      </div>

      {/* Deleted info */}
      {user.isDeleted && user.deletedAt && (
        <div className="mb-3 p-2 bg-[#fef2f2] border-l-4 border-[#ef4444] rounded text-xs text-red-700 flex items-center gap-1">
          <Trash2 className="w-3 h-3" />
          Deleted on {formatDate(user.deletedAt)}
        </div>
      )}

      {/* Status reason */}
      {user.statusReason && (user.status === 'suspended' || user.status === 'banned') && (
        <div className="mb-3 p-2 bg-[#fef3c7] border-l-4 border-[#f59e0b] rounded text-xs text-amber-800">
          <strong>Reason:</strong> {user.statusReason}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
        <div className="flex gap-1 flex-wrap">
          {!isTrashTab && !isAdmin && (
            <>
              {user.status !== 'active' && (
                <button
                  type="button"
                  onClick={() => onAction('activate', user)}
                  disabled={busy}
                  className="px-2.5 py-1 bg-[#10b981] text-white text-xs rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" /> Activate
                </button>
              )}
              {user.status === 'active' && (
                <button
                  type="button"
                  onClick={() => onAction('suspend', user)}
                  disabled={busy}
                  className="px-2.5 py-1 bg-[#f59e0b] text-white text-xs rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <ShieldOff className="w-3 h-3" /> Suspend
                </button>
              )}
              {user.status !== 'banned' && user.status !== 'active' && (
                <button
                  type="button"
                  onClick={() => onAction('ban', user)}
                  disabled={busy}
                  className="px-2.5 py-1 bg-[#ef4444] text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <ShieldAlert className="w-3 h-3" /> Ban
                </button>
              )}
            </>
          )}
          {isTrashTab && (
            <>
              <button
                type="button"
                onClick={() => onAction('restore', user)}
                disabled={busy}
                className="px-2.5 py-1 bg-[#029bba] text-white text-xs rounded-lg hover:bg-[#027a94] transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Restore
              </button>
              <button
                type="button"
                onClick={() => onAction('permanent-delete', user)}
                disabled={busy}
                className="px-2.5 py-1 bg-[#ef4444] text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex gap-1 shrink-0">
          <Link
            href={`/admin/users/${user._id}`}
            className="p-1.5 text-gray-400 hover:text-[#029bba] hover:bg-gray-50 rounded transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          {!isTrashTab && (
            <>
              <a
                href={`mailto:${user.emailMasked.replace('***', '')}`}
                className="p-1.5 text-gray-400 hover:text-[#029bba] hover:bg-gray-50 rounded transition-colors"
                title="Email user (opens your email client)"
              >
                <Mail className="w-4 h-4" />
              </a>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => onAction('trash', user)}
                  disabled={busy}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Move to Trash"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function UsersContent(): React.ReactElement {
  const router = useRouter();

  // Data state
  const [users, setUsers] = useState<MaskedUser[]>([]);
  const [counts, setCounts] = useState<Counts>({
    all: 0, active: 0, pending: 0, suspended: 0, banned: 0, trash: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  // UI state
  const [banner, setBanner] = useState<Banner | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string;
    confirmLabel: string; confirmColor: 'primary' | 'danger' | 'warning';
    showReason: boolean; onConfirm: (reason: string) => Promise<void>;
  }>({
    open: false, title: '', message: '',
    confirmLabel: 'Confirm', confirmColor: 'primary',
    showReason: false, onConfirm: async () => {},
  });

  const showBanner = useCallback((type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(PAGE_SIZE),
        ...(activeTab === 'trash' ? { deleted: 'true' } : {}),
        ...(activeTab !== 'all' && activeTab !== 'trash' ? { status: activeTab } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(selectedRole ? { role: selectedRole } : {}),
      });

      const res = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include',
      });

      const data = await res.json() as {
        success:    boolean;
        message?:   string;
        users?:     MaskedUser[];
        counts?:    Counts;
        pagination?: { page: number; pages: number };
      };

      if (data.success && data.users) {
        setUsers(data.users);
        if (data.counts) setCounts(data.counts);
        if (data.pagination) setTotalPages(data.pagination.pages);
      } else {
        showBanner('error', data.message ?? 'Failed to load users');
      }
    } catch {
      showBanner('error', 'Network error — could not load users');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, searchQuery, selectedRole, showBanner]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Sync tab with URL
  useEffect(() => {
    const status = router.query.status;
    if (typeof status === 'string') {
      const valid = TABS.map((t) => t.key);
      if (valid.includes(status as typeof valid[number])) {
        setActiveTab(status);
      }
    }
  }, [router.query.status]);

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setPage(1);
    void router.push(`/admin/users?status=${tabKey}`, undefined, { shallow: true });
  };

  // Perform mutation
  const performMutation = useCallback(async (
    url: string,
    method: 'PATCH' | 'PUT' | 'DELETE',
    body?: Record<string, unknown>,
    successMessage = 'Action completed'
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json() as { success: boolean; message?: string };

      if (data.success) {
        showBanner('success', data.message ?? successMessage);
        await fetchUsers();
        refreshSidebarStats();
        return true;
      } else {
        showBanner('error', data.message ?? 'Action failed');
        return false;
      }
    } catch {
      showBanner('error', 'Network error');
      return false;
    } finally {
      setBusy(false);
    }
  }, [fetchUsers, showBanner]);

  // Action dispatcher
  const handleAction = useCallback(async (action: string, user: MaskedUser, extra?: string) => {
    switch (action) {
      case 'activate':
        await performMutation(
          `/api/admin/users/${user._id}`,
          'PATCH',
          { status: 'active' },
          'User activated'
        );
        break;

      case 'suspend':
        setConfirmModal({
          open: true,
          title: 'Suspend User',
          message: `Suspend "${user.name}"? They won't be able to log in.`,
          confirmLabel: 'Suspend',
          confirmColor: 'warning',
          showReason: true,
          onConfirm: async (reason) => {
            const body: Record<string, unknown> = { status: 'suspended' };
            if (reason) body.statusReason = reason;
            await performMutation(`/api/admin/users/${user._id}`, 'PATCH', body, 'User suspended');
            setConfirmModal((p) => ({ ...p, open: false }));
          },
        });
        break;

      case 'ban':
        setConfirmModal({
          open: true,
          title: 'Ban User',
          message: `Ban "${user.name}"? Reason is required (min 5 chars).`,
          confirmLabel: 'Ban User',
          confirmColor: 'danger',
          showReason: true,
          onConfirm: async (reason) => {
            if (reason.length < 5) {
              showBanner('error', 'Reason must be at least 5 characters');
              return;
            }
            await performMutation(
              `/api/admin/users/${user._id}`,
              'PATCH',
              { status: 'banned', statusReason: reason },
              'User banned'
            );
            setConfirmModal((p) => ({ ...p, open: false }));
          },
        });
        break;

      case 'change-role':
        if (extra) {
          await performMutation(
            `/api/admin/users/${user._id}`,
            'PATCH',
            { role: extra },
            `Role changed to ${extra}`
          );
        }
        break;

      case 'trash':
        setConfirmModal({
          open: true,
          title: 'Move to Trash',
          message: `Move "${user.name}" to trash? You can restore later.`,
          confirmLabel: 'Move to Trash',
          confirmColor: 'danger',
          showReason: false,
          onConfirm: async () => {
            await performMutation(
              `/api/admin/users/${user._id}/trash`,
              'PUT',
              undefined,
              'User moved to trash'
            );
            setConfirmModal((p) => ({ ...p, open: false }));
          },
        });
        break;

      case 'restore':
        await performMutation(
          `/api/admin/users/${user._id}/trash`,
          'PUT',
          undefined,
          'User restored'
        );
        break;

      case 'permanent-delete':
        showBanner('error', 'Use the user detail page for permanent delete (requires confirmation code).');
        break;
    }
  }, [performMutation, showBanner]);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#004063]">Users Management</h1>
          <p className="text-sm text-gray-500">Manage all user accounts and permissions</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchUsers()}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

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

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.key as keyof Counts] ?? 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-[#029bba] text-white border-[#029bba] shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#029bba]/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                  {count}
                </span>
              </div>
              <p className={`text-xs ${isActive ? 'text-white/90' : 'text-gray-500'}`}>
                {tab.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, city..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => { setSelectedRole(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#029bba] outline-none md:w-48"
          >
            <option value="">All Roles</option>
            {Object.entries(ALL_ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {(searchQuery || selectedRole) && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedRole(''); setPage(1); }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* User Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-sm text-gray-500">
            {activeTab === 'trash' ? 'No users in trash.' :
             (searchQuery || selectedRole) ? 'Try adjusting your filters.' :
             'No users to display.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((u) => (
              <UserCard
                key={u._id}
                user={u}
                isTrashTab={activeTab === 'trash'}
                busy={busy}
                onAction={handleAction}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 font-medium px-3">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirm Modal */}
      <InlineConfirmModal
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
    </div>
  );
}

// ─── Page Export with Auth Guard ──────────────────────────────────────────────

export default function AdminUsersPage(): React.ReactElement {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      void router.replace('/login');
    }
  }, [session, status, router]);

  return (
    <>
      <Head>
        <title>Users Management | Highrise Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AdminLayout>
        {status === 'loading' || !session || session.user?.role !== 'admin' ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
          </div>
        ) : (
          <UsersContent />
        )}
      </AdminLayout>
    </>
  );
}