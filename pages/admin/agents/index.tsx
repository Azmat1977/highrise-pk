// pages/admin/agents/index.tsx
// Highrise.pk — Admin Agent Management List
// Mirrors developers/index.tsx pattern exactly
// NO react-hot-toast | NO ConfirmationModal | NO AdminGuard
// useSession() guard | inline banners | inline modals

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  RotateCcw,
  Trash,
  UserCheck,
  AlertTriangle,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  _id: string;
  displayName: string;
  agentType: 'individual' | 'agency' | 'freelance';
  agencyName?: string;
  city: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
  verificationLevel: string;
  slug?: string;
  email: string;
  isPremium: boolean;
  trustScore: { overall: number };
  badges: string[];
  documents: {
    profilePhoto?: { url: string };
  };
  agencyLogo?: { url: string };
  createdAt: string;
  isDeleted?: boolean;
}

interface Counts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  trash: number;
}

interface ApiResponse {
  success: boolean;
  agents?: Agent[];
  counts?: Counts;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
  message?: string;
}

type CascadeOption = 'soft' | 'permanent' | 'none';
type ActiveFilter  = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'trash';

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending:   { bg: 'bg-amber-100',    text: 'text-amber-800',    label: 'Pending'   },
    approved:  { bg: 'bg-[#f0fdf4]',   text: 'text-[#10b981]',   label: 'Approved'  },
    rejected:  { bg: 'bg-red-100',      text: 'text-red-700',      label: 'Rejected'  },
    suspended: { bg: 'bg-orange-100',   text: 'text-orange-700',   label: 'Suspended' },
    draft:     { bg: 'bg-gray-100',     text: 'text-gray-600',     label: 'Draft'     },
  };
  const c = config[status] ?? config['draft'];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow(): React.ReactElement {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="w-28 h-4 bg-gray-200 rounded" />
            <div className="w-20 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
      <td className="px-6 py-4"><div className="w-16 h-5 bg-gray-200 rounded-full" /></td>
      <td className="px-6 py-4"><div className="w-12 h-4 bg-gray-200 rounded" /></td>
      <td className="px-6 py-4"><div className="w-24 h-4 bg-gray-200 rounded" /></td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          <div className="w-7 h-7 bg-gray-200 rounded-lg" />
          <div className="w-7 h-7 bg-gray-200 rounded-lg" />
          <div className="w-7 h-7 bg-gray-200 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

// ─── Inline Confirm Modal ─────────────────────────────────────────────────────

function InlineConfirmModal({
  title,
  message,
  confirmLabel,
  confirmClass,
  processing,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  processing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmClass}`}
          >
            {processing ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Permanent Delete Modal ───────────────────────────────────────────────────

function PermanentDeleteModal({
  displayName,
  processing,
  onCancel,
  onConfirm,
}: {
  displayName: string;
  processing: boolean;
  onCancel: () => void;
  onConfirm: (reason: string, cascade: CascadeOption) => void;
}): React.ReactElement {
  const [confirmInput, setConfirmInput] = useState('');
  const [reason, setReason] = useState('');
  const [cascade, setCascade] = useState<CascadeOption>('soft');

  const isValid = confirmInput === displayName && reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Permanent Deletion</h3>
            <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-5">
          <p className="text-sm text-red-700 font-medium">Permanently deleting:</p>
          <p className="text-base font-bold text-red-900 mt-1">{displayName}</p>
        </div>

        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Property Handling</p>
          <div className="space-y-2">
            {(
              [
                { value: 'soft',      label: 'Soft delete associated properties' },
                { value: 'permanent', label: 'Permanently delete associated properties' },
                { value: 'none',      label: 'Do not modify properties' },
              ] as { value: CascadeOption; label: string }[]
            ).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="cascade"
                  value={opt.value}
                  checked={cascade === opt.value}
                  onChange={() => setCascade(opt.value)}
                  className="accent-[#029bba]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Deletion Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Provide a detailed reason for audit logging (min. 10 characters)..."
            className="w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] text-sm p-3 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            {reason.trim().length} / 10 minimum characters
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Type <span className="font-bold text-red-600">{displayName}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="Enter exact agent name..."
            className="w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-300 focus:border-red-400 text-sm p-3 outline-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim(), cascade)}
            disabled={!isValid || processing}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminAgentsList(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();

  // ── Auth guard (V6.8.0 — Session 3 pattern) ─────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') {
      void router.replace('/login');
      return;
    }
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      void router.replace('/');
    }
  }, [status, session, router]);

  // ── State ────────────────────────────────────────────────────────────────────
  const [agents, setAgents]           = useState<Agent[]>([]);
  const [counts, setCounts]           = useState<Counts>({ all: 0, pending: 0, approved: 0, rejected: 0, suspended: 0, trash: 0 });
  const [pagination, setPagination]   = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]         = useState(true);
  const [processing, setProcessing]   = useState(false);

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = useCallback((type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  // Modals
  const [approveModal, setApproveModal]               = useState<{ agentId: string; displayName: string } | null>(null);
  const [rejectModal, setRejectModal]                 = useState<{ agentId: string; displayName: string } | null>(null);
  const [trashModal, setTrashModal]                   = useState<{ agentId: string; displayName: string } | null>(null);
  const [restoreModal, setRestoreModal]               = useState<{ agentId: string; displayName: string } | null>(null);
  const [permanentDeleteModal, setPermanentDeleteModal] = useState<{ agentId: string; displayName: string } | null>(null);

  const refreshSidebarStats = useCallback(() => {
    window.dispatchEvent(new Event('refreshAdminStats'));
  }, []);

  // ── Sync filter with URL ─────────────────────────────────────────────────────
  useEffect(() => {
    const qs = router.query.status;
    const valid: ActiveFilter[] = ['all', 'pending', 'approved', 'rejected', 'suspended', 'trash'];
    if (typeof qs === 'string' && valid.includes(qs as ActiveFilter)) {
      setActiveFilter(qs as ActiveFilter);
    } else {
      setActiveFilter('all');
    }
  }, [router.query.status]);

  // ── Load agents ──────────────────────────────────────────────────────────────
  const loadAgents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      params.set('deleted', activeFilter === 'trash' ? 'true' : 'false');
      if (activeFilter !== 'all' && activeFilter !== 'trash') {
        params.set('status', activeFilter);
      }
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/agents?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        showBanner('error', 'Failed to load agents. Please try again.');
        return;
      }

      const data: ApiResponse = await res.json();
      if (!data.success) {
        showBanner('error', data.message ?? 'Failed to load agents.');
        return;
      }

      setAgents(data.agents ?? []);
      setCounts(data.counts ?? { all: 0, pending: 0, approved: 0, rejected: 0, suspended: 0, trash: 0 });
      if (data.pagination) setPagination(data.pagination);
    } catch {
      showBanner('error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search, showBanner]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role === 'admin') {
      void loadAgents(1);
    }
  }, [activeFilter, search, status, session, loadAgents]);

  // ── Action handlers ──────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!approveModal) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/agents/${approveModal.agentId}/approve`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to approve agent.');
        return;
      }
      showBanner('success', `${approveModal.displayName} approved successfully.`);
      refreshSidebarStats();
      setApproveModal(null);
      void loadAgents(pagination.page);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/agents/${rejectModal.agentId}/reject`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to reject agent.');
        return;
      }
      showBanner('success', `${rejectModal.displayName} rejected.`);
      refreshSidebarStats();
      setRejectModal(null);
      void loadAgents(pagination.page);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleTrash = async () => {
    if (!trashModal) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/agents/${trashModal.agentId}/trash`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to move to trash.');
        return;
      }
      showBanner('success', `${trashModal.displayName} moved to trash.`);
      refreshSidebarStats();
      setTrashModal(null);
      void loadAgents(1);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreModal) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/agents/${restoreModal.agentId}/trash`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to restore agent.');
        return;
      }
      showBanner('success', `${restoreModal.displayName} restored.`);
      refreshSidebarStats();
      setRestoreModal(null);
      void loadAgents(1);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePermanentDelete = async (reason: string, cascade: CascadeOption) => {
    if (!permanentDeleteModal) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/agents/${permanentDeleteModal.agentId}/permanent-delete`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            confirmationCode: 'DELETE-AGENT-PERMANENTLY',
            reason,
            cascade,
          }),
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to permanently delete agent.');
        return;
      }
      showBanner('success', `${permanentDeleteModal.displayName} permanently deleted.`);
      refreshSidebarStats();
      setPermanentDeleteModal(null);
      void loadAgents(1);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ── Filter tabs ──────────────────────────────────────────────────────────────

  const filterTabs: { key: ActiveFilter; label: string; count: number }[] = [
    { key: 'all',       label: 'All',        count: counts.all       },
    { key: 'pending',   label: 'Pending',    count: counts.pending   },
    { key: 'approved',  label: 'Approved',   count: counts.approved  },
    { key: 'rejected',  label: 'Rejected',   count: counts.rejected  },
    { key: 'suspended', label: 'Suspended',  count: counts.suspended },
    { key: 'trash',     label: 'Trash',      count: counts.trash     },
  ];

  const handleFilterChange = (key: ActiveFilter) => {
    setActiveFilter(key);
    setSearch('');
    setSearchInput('');
    void router.push(
      key === 'all' ? '/admin/agents' : `/admin/agents?status=${key}`,
      undefined,
      { shallow: true }
    );
  };

  // ── Loading / auth states ────────────────────────────────────────────────────

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <AdminLayout>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Manage Agents — Admin | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Modals */}
      {approveModal && (
        <InlineConfirmModal
          title="Approve Agent"
          message={`Approve "${approveModal.displayName}"?\n\nTheir role will be upgraded to Agent and they will be notified.`}
          confirmLabel="Yes, Approve"
          confirmClass="bg-[#10b981] hover:bg-green-600"
          processing={processing}
          onCancel={() => setApproveModal(null)}
          onConfirm={() => void handleApprove()}
        />
      )}
      {rejectModal && (
        <InlineConfirmModal
          title="Reject Agent"
          message={`Reject "${rejectModal.displayName}"?\n\nThey will be notified and can resubmit after corrections.`}
          confirmLabel="Yes, Reject"
          confirmClass="bg-red-600 hover:bg-red-700"
          processing={processing}
          onCancel={() => setRejectModal(null)}
          onConfirm={() => void handleReject()}
        />
      )}
      {trashModal && (
        <InlineConfirmModal
          title="Move to Trash"
          message={`Move "${trashModal.displayName}" to trash?\n\nYou can restore them later from the Trash tab.`}
          confirmLabel="Move to Trash"
          confirmClass="bg-amber-500 hover:bg-amber-600"
          processing={processing}
          onCancel={() => setTrashModal(null)}
          onConfirm={() => void handleTrash()}
        />
      )}
      {restoreModal && (
        <InlineConfirmModal
          title="Restore Agent"
          message={`Restore "${restoreModal.displayName}" from trash?\n\nThe profile will become active again.`}
          confirmLabel="Yes, Restore"
          confirmClass="bg-[#029bba] hover:bg-[#027a94]"
          processing={processing}
          onCancel={() => setRestoreModal(null)}
          onConfirm={() => void handleRestore()}
        />
      )}
      {permanentDeleteModal && (
        <PermanentDeleteModal
          displayName={permanentDeleteModal.displayName}
          processing={processing}
          onCancel={() => setPermanentDeleteModal(null)}
          onConfirm={(reason, cascade) => void handlePermanentDelete(reason, cascade)}
        />
      )}

      <AdminLayout>
        <div className="space-y-6">

          {/* Banner */}
          {banner && (
            <div className={`rounded-xl p-4 border-l-4 flex items-center justify-between gap-4 ${
              banner.type === 'success'
                ? 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]'
                : 'bg-[#fef2f2] border-[#ef4444] text-red-700'
            }`}>
              <p className="text-sm font-medium">{banner.message}</p>
              <button onClick={() => setBanner(null)} className="shrink-0 p-1 rounded hover:bg-black/5">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link href="/admin" className="hover:text-gray-700 transition-colors">Admin</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">Agents</span>
              </div>
              <h1 className="text-2xl font-bold text-[#004063] flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-[#029bba]" />
                Manage Agents
              </h1>
            </div>

            {/* Search */}
            <form
              onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, city, email..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors"
              >
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSearchInput(''); }}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-[#029bba] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-xs ${activeFilter === tab.key ? 'text-white/70' : 'text-gray-400'}`}>
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>

          {/* Search indicator */}
          {search && (
            <div className="bg-[#eff6ff] border-l-4 border-[#029bba] rounded-xl p-3">
              <p className="text-sm text-[#029bba] font-medium">
                Showing results for &quot;{search}&quot; — {pagination.total} found
              </p>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Agent', 'Type', 'Status', 'Trust', 'Joined', 'Actions'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                          i === 5 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <>
                      <SkeletonRow /><SkeletonRow /><SkeletonRow />
                      <SkeletonRow /><SkeletonRow />
                    </>
                  ) : agents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                            <Users className="w-7 h-7 text-gray-400" />
                          </div>
                          <p className="text-base font-semibold text-gray-700">
                            {activeFilter === 'trash'
                              ? 'Trash is empty'
                              : search
                              ? `No results for "${search}"`
                              : 'No agents found'}
                          </p>
                          <p className="text-sm text-gray-400">
                            {activeFilter === 'pending'
                              ? 'No pending agent profiles to review.'
                              : 'Try adjusting your filters or search terms.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    agents.map((agent) => {
                      const isDeleted = agent.isDeleted === true;
                      const avatarUrl =
                        agent.documents?.profilePhoto?.url ??
                        agent.agencyLogo?.url;

                      return (
                        <tr
                          key={agent._id}
                          className={`hover:bg-gray-50 transition-colors ${isDeleted ? 'opacity-60' : ''}`}
                        >
                          {/* Agent */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {avatarUrl ? (
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-100 shrink-0">
                                  <Image
                                    src={avatarUrl}
                                    alt={agent.displayName}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#029bba] flex items-center justify-center text-white font-bold shrink-0">
                                  {agent.displayName?.charAt(0)?.toUpperCase() ?? 'A'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">
                                  {agent.displayName}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {agent.agencyName ? agent.agencyName : agent.city}
                                </p>
                                {agent.isPremium && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full mt-0.5">
                                    <Star className="w-2.5 h-2.5" />
                                    Premium
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 capitalize">
                              {agent.agentType}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={agent.status} />
                              {isDeleted && (
                                <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  In Trash
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Trust Score */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#029bba] rounded-full"
                                  style={{ width: `${agent.trustScore?.overall ?? 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 font-medium">
                                {agent.trustScore?.overall ?? 0}
                              </span>
                            </div>
                          </td>

                          {/* Joined */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-500">
                              {new Date(agent.createdAt).toLocaleDateString('en-PK', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/admin/agents/${agent._id}`}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4 text-gray-500" />
                              </Link>
                              {!isDeleted ? (
                                <>
                                  {agent.status !== 'approved' && (
                                    <button
                                      onClick={() => setApproveModal({ agentId: agent._id, displayName: agent.displayName })}
                                      className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                                      title="Approve"
                                    >
                                      <CheckCircle className="w-4 h-4 text-[#10b981]" />
                                    </button>
                                  )}
                                  {agent.status !== 'rejected' && (
                                    <button
                                      onClick={() => setRejectModal({ agentId: agent._id, displayName: agent.displayName })}
                                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                                      title="Reject"
                                    >
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setTrashModal({ agentId: agent._id, displayName: agent.displayName })}
                                    className="p-2 rounded-lg hover:bg-amber-50 transition-colors"
                                    title="Move to Trash"
                                  >
                                    <Trash2 className="w-4 h-4 text-amber-500" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setRestoreModal({ agentId: agent._id, displayName: agent.displayName })}
                                    className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                                    title="Restore"
                                  >
                                    <RotateCcw className="w-4 h-4 text-[#10b981]" />
                                  </button>
                                  <button
                                    onClick={() => setPermanentDeleteModal({ agentId: agent._id, displayName: agent.displayName })}
                                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                                    title="Delete Permanently"
                                  >
                                    <Trash className="w-4 h-4 text-red-500" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Showing{' '}
                  <span className="font-semibold text-gray-700">
                    {(pagination.page - 1) * pagination.limit + 1}–
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-gray-700">{pagination.total}</span>{' '}
                  agents
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void loadAgents(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium text-gray-700 px-2">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => void loadAgents(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
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