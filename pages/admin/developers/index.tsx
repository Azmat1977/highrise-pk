// pages/admin/developers/index.tsx
// Highrise.pk — Admin Developer Management V6.4.5+
// ✅ V6.4.5+: info_required status + filter tab
// All other patterns preserved from original

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
  Shield,
  AlertTriangle,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ─── Types ────────────────────────────────────────────────────

interface Developer {
  _id: string;
  companyName: string;
  developerType: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'info_required';
  city?: string;
  logo?: { url: string };
  createdAt: string;
  isDeleted?: boolean;
}

interface Counts {
  all:           number;
  pending:       number;
  approved:      number;
  rejected:      number;
  info_required: number;  // V6.4.5+
  trash:         number;
}

interface ApiResponse {
  success: boolean;
  developers?: Developer[];
  counts?: Counts;
  pagination?: {
    page:       number;
    totalPages: number;
    total:      number;
    limit:      number;
  };
  message?: string;
}

type CascadeOption = 'soft' | 'permanent' | 'none';

// V6.4.5+: Added info_required
type ActiveFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info_required'
  | 'trash';

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: string;
}): React.ReactElement {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: {
      bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending',
    },
    approved: {
      bg: 'bg-[#f0fdf4]', text: 'text-[#10b981]', label: 'Verified',
    },
    rejected: {
      bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected',
    },
    suspended: {
      bg: 'bg-orange-100', text: 'text-orange-700', label: 'Suspended',
    },
    draft: {
      bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft',
    },
    // V6.4.5+
    info_required: {
      bg: 'bg-blue-100', text: 'text-blue-700', label: 'Info Required',
    },
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

// ─── Skeleton Row ─────────────────────────────────────────────

function SkeletonRow(): React.ReactElement {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200" />
          <div className="space-y-1">
            <div className="w-32 h-4 bg-gray-200 rounded" />
            <div className="w-20 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
      <td className="px-6 py-4"><div className="w-16 h-5 bg-gray-200 rounded-full" /></td>
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

// ─── Permanent Delete Modal ───────────────────────────────────

interface PermanentDeleteModalProps {
  companyName: string;
  processing:  boolean;
  onCancel:    () => void;
  onConfirm:   (reason: string, cascade: CascadeOption) => void;
}

function PermanentDeleteModal({
  companyName,
  processing,
  onCancel,
  onConfirm,
}: PermanentDeleteModalProps): React.ReactElement {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [deleteReason, setDeleteReason]           = useState('');
  const [cascadeOption, setCascadeOption]         = useState<CascadeOption>('soft');

  const isValid =
    confirmationInput === companyName &&
    deleteReason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Permanent Deletion</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              This action is irreversible and cannot be undone.
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-5">
          <p className="text-sm text-red-700 font-medium">You are permanently deleting:</p>
          <p className="text-base font-bold text-red-900 mt-1">{companyName}</p>
        </div>

        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Project Handling</p>
          <div className="space-y-2">
            {(
              [
                { value: 'soft',      label: 'Soft delete associated projects' },
                { value: 'permanent', label: 'Permanently delete associated projects' },
                { value: 'none',      label: 'Do not modify projects' },
              ] as { value: CascadeOption; label: string }[]
            ).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="cascade"
                  value={opt.value}
                  checked={cascadeOption === opt.value}
                  onChange={() => setCascadeOption(opt.value)}
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
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            rows={3}
            placeholder="Provide a detailed reason for audit logging (min. 10 characters)..."
            className="w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] text-sm p-3 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            {deleteReason.trim().length} / 10 minimum characters
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Type <span className="font-bold text-red-600">{companyName}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder="Enter exact company name..."
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
            onClick={() => onConfirm(deleteReason.trim(), cascadeOption)}
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

// ─── Inline Confirm Modal ─────────────────────────────────────

interface InlineConfirmModalProps {
  title:        string;
  message:      string;
  confirmLabel: string;
  confirmClass: string;
  processing:   boolean;
  onCancel:     () => void;
  onConfirm:    () => void;
}

function InlineConfirmModal({
  title,
  message,
  confirmLabel,
  confirmClass,
  processing,
  onCancel,
  onConfirm,
}: InlineConfirmModalProps): React.ReactElement {
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

// ─── Main Component ───────────────────────────────────────────

export default function AdminDevelopersList(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') void router.replace('/login');
    if (status === 'authenticated' && session.user.role !== 'admin')
      void router.replace('/login');
  }, [status, session, router]);

  // ── State ────────────────────────────────────────────────────
  const [developers, setDevelopers]   = useState<Developer[]>([]);
  const [counts, setCounts]           = useState<Counts>({
    all: 0, pending: 0, approved: 0,
    rejected: 0, info_required: 0, trash: 0,
  });
  const [pagination, setPagination]   = useState({
    page: 1, totalPages: 1, total: 0, limit: 20,
  });
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]         = useState(true);
  const [processing, setProcessing]   = useState(false);

  // Banner
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  };

  // Modal state
  const [approveModal, setApproveModal] = useState<{
    developerId: string;
    companyName: string;
  } | null>(null);

  const [rejectModal, setRejectModal] = useState<{
    developerId: string;
    companyName: string;
  } | null>(null);

  const [trashModal, setTrashModal] = useState<{
    developerId: string;
    companyName: string;
  } | null>(null);

  const [restoreModal, setRestoreModal] = useState<{
    developerId: string;
    companyName: string;
  } | null>(null);

  const [permanentDeleteModal, setPermanentDeleteModal] = useState<{
    developerId: string;
    companyName: string;
  } | null>(null);

  const refreshSidebarStats = useCallback(() => {
    window.dispatchEvent(new Event('refreshAdminStats'));
  }, []);

  // ── Sync filter with URL ──────────────────────────────────────
  useEffect(() => {
    const qs    = router.query.status;
    // V6.4.5+: info_required added to valid filters
    const valid: ActiveFilter[] = [
      'all', 'pending', 'approved', 'rejected', 'info_required', 'trash',
    ];
    if (typeof qs === 'string' && valid.includes(qs as ActiveFilter)) {
      setActiveFilter(qs as ActiveFilter);
    } else {
      setActiveFilter('all');
    }
  }, [router.query.status]);

  // Listen for tab change from notification click
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      const valid: ActiveFilter[] = [
        'all', 'pending', 'approved', 'rejected', 'info_required', 'trash',
      ];
      if (valid.includes(tab as ActiveFilter)) {
        setActiveFilter(tab as ActiveFilter);
        void router.push(
          `/admin/developers?status=${tab}`,
          undefined,
          { shallow: true }
        );
      }
    };
    window.addEventListener('changeDevTab', handler);
    return () => window.removeEventListener('changeDevTab', handler);
  }, [router]);

  // ── Load developers ───────────────────────────────────────────
  const loadDevelopers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page',    String(page));
        params.set('limit',   '20');
        params.set('deleted', activeFilter === 'trash' ? 'true' : 'false');

        if (activeFilter !== 'all' && activeFilter !== 'trash') {
          params.set('status', activeFilter);
        }
        if (search.trim()) {
          params.set('search', search.trim());
        }

        const res = await fetch(
          `/api/admin/developers?${params.toString()}`,
          { credentials: 'include' }
        );

        if (!res.ok) {
          showBanner('error', 'Failed to load developers. Please try again.');
          return;
        }

        const data: ApiResponse = await res.json();

        if (!data.success) {
          showBanner('error', data.message ?? 'Failed to load developers.');
          return;
        }

        setDevelopers(data.developers ?? []);
        setCounts(
          data.counts ?? {
            all: 0, pending: 0, approved: 0,
            rejected: 0, info_required: 0, trash: 0,
          }
        );
        if (data.pagination) {
          setPagination({
            page:       data.pagination.page,
            totalPages: data.pagination.totalPages ?? Math.ceil(data.pagination.total / 20),
            total:      data.pagination.total,
            limit:      data.pagination.limit,
          });
        }
      } catch {
        showBanner('error', 'Network error. Please check your connection.');
      } finally {
        setLoading(false);
      }
    },
    [activeFilter, search]
  );

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role === 'admin') {
      void loadDevelopers(1);
    }
  }, [activeFilter, search, status, session, loadDevelopers]);

  // ── Action handlers ───────────────────────────────────────────

  const handleApprove = async () => {
    if (!approveModal) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/developers/${approveModal.developerId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to approve developer.');
        return;
      }
      showBanner('success', `${approveModal.companyName} approved successfully.`);
      refreshSidebarStats();
      setApproveModal(null);
      void loadDevelopers(pagination.page);
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
        `/api/admin/developers/${rejectModal.developerId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to reject developer.');
        return;
      }
      showBanner('success', `${rejectModal.companyName} rejected.`);
      refreshSidebarStats();
      setRejectModal(null);
      void loadDevelopers(pagination.page);
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
        `/api/admin/developers/${trashModal.developerId}/trash`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to move to trash.');
        return;
      }
      showBanner('success', `${trashModal.companyName} moved to trash.`);
      refreshSidebarStats();
      setTrashModal(null);
      void loadDevelopers(1);
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
        `/api/admin/developers/${restoreModal.developerId}/trash`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to restore developer.');
        return;
      }
      showBanner('success', `${restoreModal.companyName} restored from trash.`);
      refreshSidebarStats();
      setRestoreModal(null);
      void loadDevelopers(1);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePermanentDelete = async (
    reason: string,
    cascade: CascadeOption
  ) => {
    if (!permanentDeleteModal) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/developers/${permanentDeleteModal.developerId}/permanent-delete`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            confirmationCode: 'DELETE-DEVELOPER-PERMANENTLY',
            reason,
            cascadeProjects: cascade,
          }),
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to permanently delete developer.');
        return;
      }
      showBanner('success', `${permanentDeleteModal.companyName} permanently deleted.`);
      refreshSidebarStats();
      setPermanentDeleteModal(null);
      void loadDevelopers(1);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ── Filter tabs ───────────────────────────────────────────────

  const filterTabs: {
    key:   ActiveFilter;
    label: string;
    count: number;
    color?: string;
  }[] = [
    { key: 'all',           label: 'All',          count: counts.all },
    { key: 'pending',       label: 'Pending',       count: counts.pending },
    { key: 'approved',      label: 'Verified',      count: counts.approved },
    { key: 'info_required', label: 'Info Required', count: counts.info_required, color: 'text-blue-600' },
    { key: 'rejected',      label: 'Rejected',      count: counts.rejected },
    { key: 'trash',         label: 'Trash',         count: counts.trash },
  ];

  const handleFilterChange = (key: ActiveFilter) => {
    setActiveFilter(key);
    setSearch('');
    setSearchInput('');
    void router.push(
      key === 'all'
        ? '/admin/developers'
        : `/admin/developers?status=${key}`,
      undefined,
      { shallow: true }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // ── Loading/auth state ────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Manage Developers — Admin | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Modals */}
      {approveModal && (
        <InlineConfirmModal
          title="Approve Developer"
          message={`Approve "${approveModal.companyName}"?\n\nTheir role will be upgraded to Developer and they will be notified by email.`}
          confirmLabel="Yes, Approve"
          confirmClass="bg-[#10b981] hover:bg-green-600"
          processing={processing}
          onCancel={() => setApproveModal(null)}
          onConfirm={() => void handleApprove()}
        />
      )}

      {rejectModal && (
        <InlineConfirmModal
          title="Reject Developer"
          message={`Reject "${rejectModal.companyName}"?\n\nThey will be notified and can resubmit after making corrections.`}
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
          message={`Move "${trashModal.companyName}" to trash?\n\nYou can restore it later from the Trash tab.`}
          confirmLabel="Move to Trash"
          confirmClass="bg-amber-500 hover:bg-amber-600"
          processing={processing}
          onCancel={() => setTrashModal(null)}
          onConfirm={() => void handleTrash()}
        />
      )}

      {restoreModal && (
        <InlineConfirmModal
          title="Restore Developer"
          message={`Restore "${restoreModal.companyName}" from trash?\n\nThe profile will become active again.`}
          confirmLabel="Yes, Restore"
          confirmClass="bg-[#029bba] hover:bg-[#027a94]"
          processing={processing}
          onCancel={() => setRestoreModal(null)}
          onConfirm={() => void handleRestore()}
        />
      )}

      {permanentDeleteModal && (
        <PermanentDeleteModal
          companyName={permanentDeleteModal.companyName}
          processing={processing}
          onCancel={() => setPermanentDeleteModal(null)}
          onConfirm={(reason, cascade) =>
            void handlePermanentDelete(reason, cascade)
          }
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
              <button
                onClick={() => setBanner(null)}
                className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link href="/admin" className="hover:text-gray-700 transition-colors">
                  Admin
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">Developers</span>
              </div>
              <h1 className="text-2xl font-bold text-[#004063] flex items-center gap-2">
                <Shield className="w-6 h-6 text-[#029bba]" />
                Manage Developers
              </h1>
            </div>

            {/* Search */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by company name..."
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
                <span className={`ml-2 text-xs ${
                  activeFilter === tab.key
                    ? 'text-white/70'
                    : tab.color ?? 'text-gray-400'
                }`}>
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>

          {/* Search active indicator */}
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
                    {['Company', 'Type', 'Status', 'Submitted', 'Actions'].map(
                      (h, i) => (
                        <th
                          key={h}
                          className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                            i === 4 ? 'text-right' : 'text-left'
                          }`}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : developers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                            <Building2 className="w-7 h-7 text-gray-400" />
                          </div>
                          <p className="text-base font-semibold text-gray-700">
                            {activeFilter === 'trash'
                              ? 'Trash is empty'
                              : search
                              ? `No results for "${search}"`
                              : 'No developers found'}
                          </p>
                          <p className="text-sm text-gray-400">
                            {activeFilter === 'pending'
                              ? 'No pending developer profiles to review.'
                              : activeFilter === 'info_required'
                              ? 'No developers awaiting information.'
                              : activeFilter === 'trash'
                              ? 'All developer profiles are active.'
                              : 'Try adjusting your filters or search terms.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    developers.map((dev) => {
                      const isDeleted = dev.isDeleted === true;
                      return (
                        <tr
                          key={dev._id}
                          className={`hover:bg-gray-50 transition-colors ${
                            isDeleted ? 'opacity-60' : ''
                          }`}
                        >
                          {/* Company */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {dev.logo?.url ? (
                                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                  <Image
                                    src={dev.logo.url}
                                    alt={dev.companyName}
                                    fill sizes="40px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-[#029bba] flex items-center justify-center text-white font-bold shrink-0">
                                  {dev.companyName?.charAt(0)?.toUpperCase() ?? 'D'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">
                                  {dev.companyName}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {dev.city ?? 'City not set'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 capitalize">
                              {dev.developerType}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={dev.status} />
                              {isDeleted && (
                                <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  In Trash
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Submitted */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-500">
                              {new Date(dev.createdAt).toLocaleDateString(
                                'en-PK',
                                { day: 'numeric', month: 'short', year: 'numeric' }
                              )}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View */}
                              <Link
                                href={`/admin/developers/${dev._id}`}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4 text-gray-500" />
                              </Link>

                              {!isDeleted ? (
                                <>
                                  {dev.status !== 'approved' && (
                                    <button
                                      onClick={() => setApproveModal({
                                        developerId: dev._id,
                                        companyName: dev.companyName,
                                      })}
                                      className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                                      title="Approve"
                                    >
                                      <CheckCircle className="w-4 h-4 text-[#10b981]" />
                                    </button>
                                  )}
                                  {dev.status !== 'rejected' && (
                                    <button
                                      onClick={() => setRejectModal({
                                        developerId: dev._id,
                                        companyName: dev.companyName,
                                      })}
                                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                                      title="Reject"
                                    >
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    </button>
                                  )}
                                  {/* V6.4.5+: Info Required indicator in list */}
                                  {dev.status === 'info_required' && (
                                    <span
                                      className="p-2 rounded-lg bg-blue-50"
                                      title="Info Required from Developer"
                                    >
                                      <Info className="w-4 h-4 text-blue-500" />
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setTrashModal({
                                      developerId: dev._id,
                                      companyName: dev.companyName,
                                    })}
                                    className="p-2 rounded-lg hover:bg-amber-50 transition-colors"
                                    title="Move to Trash"
                                  >
                                    <Trash2 className="w-4 h-4 text-amber-500" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setRestoreModal({
                                      developerId: dev._id,
                                      companyName: dev.companyName,
                                    })}
                                    className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                                    title="Restore from Trash"
                                  >
                                    <RotateCcw className="w-4 h-4 text-[#10b981]" />
                                  </button>
                                  <button
                                    onClick={() => setPermanentDeleteModal({
                                      developerId: dev._id,
                                      companyName: dev.companyName,
                                    })}
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
                  <span className="font-semibold text-gray-700">
                    {pagination.total}
                  </span>{' '}
                  developers
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void loadDevelopers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium text-gray-700 px-2">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => void loadDevelopers(pagination.page + 1)}
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