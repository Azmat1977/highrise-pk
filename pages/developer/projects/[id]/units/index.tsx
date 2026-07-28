//C:\dev\highrise-pk\pages\developer\projects\[id]\units\index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';
import { useDeveloperContext } from '@/components/developer/DeveloperContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type UnitStatus = 'available' | 'reserved' | 'sold' | 'on_hold' | 'cancelled';

interface Unit {
  _id: string;
  unitNumber: string;
  floorNumber: number;
  floorName?: string;
  category: string;
  unitType: string;
  price: number;
  areaSqft?: number;
  areaMarla?: number;
  status: UnitStatus;
  bedrooms?: number;
}

interface ProjectStats {
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
  onHoldUnits: number;
  minPrice: number;
  maxPrice: number;
}

interface ProjectInfo {
  _id: string;
  projectName: string;
  city: string;
  area: string;
}

interface UnitsApiResponse {
  success: boolean;
  units?: Unit[];
  stats?: ProjectStats;
  project?: ProjectInfo;
  totalPages?: number;
  currentPage?: number;
  totalCount?: number;
  message?: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const STATUS_COLORS: Record<UnitStatus, string> = {
  available: 'bg-green-100 text-green-700 border-green-200',
  reserved:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  sold:      'bg-red-100 text-red-700 border-red-200',
  on_hold:   'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
};

const STATUS_LABELS: Record<UnitStatus, string> = {
  available: 'Available',
  reserved:  'Reserved',
  sold:      'Sold',
  on_hold:   'On Hold',
  cancelled: 'Cancelled',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toStr(v: string | string[] | undefined): string {
  if (!v) return '';
  return Array.isArray(v) ? v[0] : v;
}

function formatPrice(n: number): string {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  colorClass,
  borderClass,
}: {
  label: string;
  value: number;
  colorClass: string;
  borderClass: string;
}): React.ReactElement {
  return (
    <div className={`bg-white p-4 rounded-xl border shadow-sm ${borderClass}`}>
      <p className={`text-xs font-semibold uppercase ${colorClass}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
  );
}

function UnitsSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-xl" />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Inline Action Menu (replaces Radix DropdownMenu)
// ─────────────────────────────────────────────

interface ActionMenuProps {
  unitId: string;
  projectId: string;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onDelete: (unitId: string) => void;
  deleting: boolean;
}

function ActionMenu({
  unitId,
  projectId,
  openMenuId,
  setOpenMenuId,
  confirmDeleteId,
  setConfirmDeleteId,
  onDelete,
  deleting,
}: ActionMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);
  const isOpen = openMenuId === unitId;
  const isConfirming = confirmDeleteId === unitId;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen, setOpenMenuId]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleEsc(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpenMenuId(null);
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, setOpenMenuId]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpenMenuId(isOpen ? null : unitId)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Unit actions"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-9 z-50 min-w-[160px] bg-white rounded-xl border border-gray-200 shadow-xl p-1.5">
          {/* Edit */}
          <Link
            href={`/developer/projects/${projectId}/units/${unitId}/edit`}
            onClick={() => setOpenMenuId(null)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit Unit
          </Link>

          {/* Delete — two-step inline confirm */}
          {!isConfirming ? (
            <button
              type="button"
              onClick={() => {
                setOpenMenuId(null);
                setConfirmDeleteId(unitId);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Unit
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────

function UnitsListPage(): React.ReactElement {
  const router = useRouter();
  const { profile } = useDeveloperContext();

  const projectId = useMemo(
    () => toStr(router.query?.id as string | string[] | undefined),
    [router.query?.id]
  );

  // ── Data state ──
  const [loading, setLoading]         = useState(true);
  const [units, setUnits]             = useState<Unit[]>([]);
  const [project, setProject]         = useState<ProjectInfo | null>(null);
  const [stats, setStats]             = useState<ProjectStats | null>(null);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalCount, setTotalCount]   = useState(0);

  // ── Error/Action state ──
  const [fetchError, setFetchError]         = useState<string | null>(null);
  const [deleteError, setDeleteError]       = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess]   = useState<string | null>(null);
  const [deleting, setDeleting]             = useState(false);

  // ── UI state ──
  const [openMenuId, setOpenMenuId]         = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Filters ──
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UnitStatus>('all');
  const [floorFilter, setFloorFilter] = useState<'all' | string>('all');

  // ── Pagination ──
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState<typeof PAGE_SIZE_OPTIONS[number]>(25);

  const abortRef = useRef<AbortController | null>(null);
  const reqSeq   = useRef(0);

  // Unique floors derived from loaded units
  const floors = useMemo(
    () =>
      Array.from(new Set(units.map((u) => u.floorNumber))).sort((a, b) => a - b),
    [units]
  );

  // ─────────────────────────────────────────
  // Fetch Units
  // ─────────────────────────────────────────

  const fetchUnits = useCallback(async (): Promise<void> => {
    if (!projectId) return;

    const seq = ++reqSeq.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setFetchError(null);

    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      const q = search.trim();
      if (q) qs.set('q', q);
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (floorFilter !== 'all') qs.set('floor', floorFilter);

      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/units?${qs.toString()}`,
        {
          method: 'GET',
          credentials: 'include',
          signal: ac.signal,
        }
      );

      const data: UnitsApiResponse = await res.json().catch(() => ({ success: false }));

      if (seq !== reqSeq.current) return;

      if (!res.ok || !data.success) {
        // Project not found or access denied → redirect
        if (res.status === 403 || res.status === 404) {
          void router.push('/developer/projects');
          return;
        }
        setFetchError(data.message ?? 'Failed to load units. Please try again.');
        setUnits([]);
        setStats(null);
        return;
      }

      setUnits(Array.isArray(data.units) ? data.units : []);
      setStats(data.stats ?? null);
      setProject(data.project ?? null);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.totalCount ?? 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (seq !== reqSeq.current) return;
      setFetchError('Network error. Please check your connection and try again.');
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [projectId, page, limit, search, statusFilter, floorFilter, router]);

  useEffect(() => {
    void fetchUnits();
    return () => abortRef.current?.abort();
  }, [fetchUnits]);

  // ─────────────────────────────────────────
  // Delete Handler — two-step, no confirm()
  // ─────────────────────────────────────────

  const handleDelete = useCallback(
    async (unitId: string): Promise<void> => {
      if (!projectId || deleting) return;

      // Step 1 — first click sets confirmDeleteId (handled in ActionMenu)
      // Step 2 — second click calls this function with confirmed id
      if (confirmDeleteId !== unitId) {
        setConfirmDeleteId(unitId);
        return;
      }

      setDeleting(true);
      setDeleteError(null);
      setDeleteSuccess(null);
      setConfirmDeleteId(null);

      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/units/${encodeURIComponent(unitId)}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        const data: { success: boolean; message?: string } = await res
          .json()
          .catch(() => ({ success: false }));

        if (res.ok && data.success) {
          setDeleteSuccess('Unit deleted successfully.');

          // Optimistic removal
          setUnits((prev) => prev.filter((u) => u._id !== unitId));
          setTotalCount((prev) => Math.max(0, prev - 1));

          // Optimistic stats update
          setStats((prev) => {
            if (!prev) return prev;
            const deleted = units.find((u) => u._id === unitId);
            if (!deleted) return prev;
            const next = { ...prev, totalUnits: Math.max(0, prev.totalUnits - 1) };
            if (deleted.status === 'available') next.availableUnits = Math.max(0, prev.availableUnits - 1);
            if (deleted.status === 'reserved')  next.reservedUnits  = Math.max(0, prev.reservedUnits - 1);
            if (deleted.status === 'sold')       next.soldUnits      = Math.max(0, prev.soldUnits - 1);
            if (deleted.status === 'on_hold')    next.onHoldUnits    = Math.max(0, prev.onHoldUnits - 1);
            return next;
          });

          // Auto-dismiss success banner
          setTimeout(() => setDeleteSuccess(null), 4000);
        } else {
          setDeleteError(data.message ?? 'Failed to delete unit. Please try again.');
        }
      } catch (err: unknown) {
        setDeleteError(
          err instanceof Error ? err.message : 'An unexpected error occurred.'
        );
      } finally {
        setDeleting(false);
      }
    },
    [projectId, deleting, confirmDeleteId, units]
  );

  // ─────────────────────────────────────────
  // Client-side filter (instant UX on loaded data)
  // Server receives same filters for DB query
  // ─────────────────────────────────────────

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((unit) => {
      const matchesSearch = !q || unit.unitNumber.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
      const matchesFloor  = floorFilter === 'all' || unit.floorNumber === Number(floorFilter);
      return matchesSearch && matchesStatus && matchesFloor;
    });
  }, [units, search, statusFilter, floorFilter]);

  // ─────────────────────────────────────────
  // Pagination helpers
  // ─────────────────────────────────────────

  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  function handlePrev(): void {
    setPage((p) => Math.max(1, p - 1));
  }

  function handleNext(): void {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  // ─────────────────────────────────────────
  // Render — inside DeveloperLayout
  // ─────────────────────────────────────────

  const pageTitle = project
    ? `${project.projectName} — Units | Developer Dashboard`
    : 'Unit Management | Developer Dashboard';

  return (
    <DeveloperLayout>
      <Head>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-20">

        {/* ── Breadcrumb + Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/developer/dashboard" className="hover:text-[#029bba] transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <Link href="/developer/projects" className="hover:text-[#029bba] transition-colors">
                Projects
              </Link>
              <span>/</span>
              {project ? (
                <Link
                  href={`/developer/projects/${projectId}/edit`}
                  className="hover:text-[#029bba] transition-colors truncate max-w-[160px]"
                >
                  {project.projectName}
                </Link>
              ) : (
                <span className="truncate max-w-[160px]">Project</span>
              )}
              <span>/</span>
              <span className="text-gray-700 font-medium">Units</span>
            </nav>

            <h1 className="text-2xl font-bold text-[#004063] flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#029bba]" />
              Unit Management
              {totalCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({totalCount} total)
                </span>
              )}
            </h1>

            {profile?.companyName && (
              <p className="text-sm text-gray-500 mt-1">{profile.companyName}</p>
            )}
          </div>

          <Link
            href={`/developer/projects/${projectId}/units/new`}
            className="inline-flex items-center gap-2 bg-[#029bba] hover:bg-[#027a94] text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Unit
          </Link>
        </div>

        {/* ── Inline banners ── */}

        {deleteSuccess && (
          <div className="mb-6 bg-[#f0fdf4] border-l-4 border-[#10b981] rounded-xl p-4 flex items-center gap-3">
            <span className="text-[#10b981] font-bold text-lg">✓</span>
            <p className="text-sm text-green-800 font-medium">{deleteSuccess}</p>
          </div>
        )}

        {deleteError && (
          <div className="mb-6 bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ef4444] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{deleteError}</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteError(null)}
              className="text-red-400 hover:text-red-600 text-lg leading-none"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Inline delete confirm banner ── */}
        {confirmDeleteId && (
          <div className="mb-6 bg-[#fef3c7] border-l-4 border-[#f59e0b] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#f59e0b] shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                Are you sure you want to delete this unit? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(confirmDeleteId)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-[#ef4444] hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}

        {/* ── Fetch error ── */}
        {fetchError && (
          <div className="mb-6 bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ef4444] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{fetchError}</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchUnits()}
              className="flex items-center gap-1.5 text-sm text-[#029bba] hover:text-[#027a94] font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* ── Stats Cards ── */}
        {stats && !fetchError && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Units"
              value={stats.totalUnits}
              colorClass="text-gray-700"
              borderClass="border-gray-100"
            />
            <StatCard
              label="Available"
              value={stats.availableUnits}
              colorClass="text-green-700"
              borderClass="border-green-100"
            />
            <StatCard
              label="Sold"
              value={stats.soldUnits}
              colorClass="text-red-700"
              borderClass="border-red-100"
            />
            <StatCard
              label="Reserved"
              value={stats.reservedUnits}
              colorClass="text-yellow-700"
              borderClass="border-yellow-100"
            />
          </div>
        )}

        {/* ── Filters Bar ── */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by unit number..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value as 'all' | UnitStatus);
                }}
                className="pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm appearance-none bg-white cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="reserved">Reserved</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Floor filter */}
            <select
              value={floorFilter}
              onChange={(e) => {
                setPage(1);
                setFloorFilter(e.target.value);
              }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm bg-white cursor-pointer"
            >
              <option value="all">All Floors</option>
              {floors.map((f) => (
                <option key={f} value={String(f)}>
                  {f === 0 ? 'Ground Floor' : `Floor ${f}`}
                </option>
              ))}
            </select>

            {/* Per-page */}
            <select
              value={limit}
              onChange={(e) => {
                setPage(1);
                setLimit(Number(e.target.value) as typeof PAGE_SIZE_OPTIONS[number]);
              }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm bg-white cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Data Table ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6">
              <UnitsSkeleton />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Unit No
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Floor
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Type / Area
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Price
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {filteredUnits.length > 0 ? (
                    filteredUnits.map((unit) => (
                      <tr
                        key={unit._id}
                        className={`transition-colors ${
                          confirmDeleteId === unit._id
                            ? 'bg-red-50/60'
                            : 'hover:bg-gray-50/60'
                        }`}
                      >
                        {/* Unit Number */}
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">
                            {unit.unitNumber}
                          </span>
                        </td>

                        {/* Floor */}
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {unit.floorName
                            ? unit.floorName
                            : unit.floorNumber === 0
                            ? 'Ground'
                            : `Floor ${unit.floorNumber}`}
                        </td>

                        {/* Type + Area */}
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex flex-col">
                            <span className="font-medium capitalize">
                              {unit.unitType.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-gray-400">
                              {(unit as unknown as Record<string, unknown>).areaSqft
                                ? `${(unit as unknown as Record<string, unknown>).areaSqft} sqft`
                                : (unit as unknown as Record<string, unknown>).areaMarla
                                ? `${(unit as unknown as Record<string, unknown>).areaMarla} Marla`
                                : '—'}
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4 text-sm font-semibold text-[#029bba]">
                          {formatPrice(unit.price)}
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[unit.status]}`}
                          >
                            {STATUS_LABELS[unit.status]}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <ActionMenu
                            unitId={unit._id}
                            projectId={projectId}
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            confirmDeleteId={confirmDeleteId}
                            setConfirmDeleteId={setConfirmDeleteId}
                            onDelete={handleDelete}
                            deleting={deleting}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Building2 className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            No units found
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {search || statusFilter !== 'all' || floorFilter !== 'all'
                              ? 'Try adjusting your filters to see more results.'
                              : 'Get started by adding your first unit to this project.'}
                          </p>
                          {!search && statusFilter === 'all' && floorFilter === 'all' && (
                            <Link
                              href={`/developer/projects/${projectId}/units/new`}
                              className="mt-4 inline-flex items-center gap-2 text-[#029bba] font-semibold hover:underline"
                            >
                              <Plus className="w-4 h-4" />
                              Add First Unit
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && !fetchError && totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Page info */}
            <p className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-900">{page}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
              {totalCount > 0 && (
                <> &nbsp;·&nbsp; {totalCount} units total</>
              )}
            </p>

            {/* Prev / Next */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!canPrev}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {/* Page number pills */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = totalPages <= 5
                    ? i + 1
                    : page <= 3
                    ? i + 1
                    : page >= totalPages - 2
                    ? totalPages - 4 + i
                    : page - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-[#029bba] text-white shadow-sm'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DeveloperLayout>
  );
}

export default UnitsListPage;