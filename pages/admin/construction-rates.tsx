// pages/admin/construction-rates.tsx
// 🏗️ ADMIN CONSTRUCTION RATES DASHBOARD — HIGHRISE.PK
// Full CRUD interface for managing rate overrides
// Wrapped in <AdminLayout>, brand colors only (Rule 12), inline modals (Rule 10)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Loader2, Search, Plus, X, Edit3, Pause, Play, Trash2, History,
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  XCircle, Database, Package, Building2, MapPin, Briefcase,
  Calendar, FileText, ExternalLink, Info, Filter, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type OverrideType = 'material' | 'per_sqft' | 'city_multiplier' | 'add_on';
type City =
  | 'Lahore' | 'Islamabad' | 'Rawalpindi' | 'Karachi' | 'Faisalabad'
  | 'Multan' | 'Peshawar' | 'Gujranwala' | 'Sialkot' | 'Quetta';
type Quality = 'standard' | 'premium' | 'luxury';
type ConstructionType = 'grey_structure' | 'finishing';
type SubType =
  | 'house' | 'villa' | 'farmhouse' | 'highrise_apartment_building'
  | 'shop_showroom' | 'commercial_plaza' | 'office_building' | 'highrise_office_tower'
  | 'warehouse' | 'industrial_building' | 'cold_storage' | 'workshop'
  | 'shops_plus_apartments' | 'complete_mixed_tower';
type AddOnKind = 'boundary_wall' | 'basement' | 'elevator' | 'parking' | 'generator' | 'hvac';
type Trend = 'up' | 'down' | 'stable';

interface RateListItem {
  _id: string;
  overrideType: OverrideType;
  city?: City;
  subType?: SubType;
  quality?: Quality;
  constructionType?: ConstructionType;
  materialKey?: string;
  addOnKind?: AddOnKind;
  displayName: string;
  unit?: string;
  value: number;
  trend?: Trend;
  changePercent?: number;
  active: boolean;
  validFrom: string;
  validUntil?: string;
  isExpired: boolean;
  daysSinceUpdate: number;
  source: string;
  sourceUrl?: string;
  notes?: string;
  createdByEmail?: string;
  lastUpdatedByEmail?: string;
  historyCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ListStats {
  total: number;
  active: number;
  expired: number;
  stale: number;
  byType: { material: number; per_sqft: number; city_multiplier: number; add_on: number };
}

interface HistoryEntry {
  oldValue: number;
  newValue: number;
  changePercent: number;
  changedByEmail?: string;
  changedAt: string;
  changeReason?: string;
}

interface RateDetail extends RateListItem {
  history: HistoryEntry[];
}

type BannerType = 'success' | 'error' | 'info';
interface Banner { type: BannerType; message: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES: City[] = [
  'Lahore', 'Islamabad', 'Rawalpindi', 'Karachi', 'Faisalabad',
  'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Quetta',
];

const SUB_TYPES: { id: SubType; label: string }[] = [
  { id: 'house', label: 'House' },
  { id: 'villa', label: 'Villa' },
  { id: 'farmhouse', label: 'Farmhouse' },
  { id: 'highrise_apartment_building', label: 'Highrise Apartment Building' },
  { id: 'shop_showroom', label: 'Shop / Showroom' },
  { id: 'commercial_plaza', label: 'Commercial Plaza' },
  { id: 'office_building', label: 'Office Building' },
  { id: 'highrise_office_tower', label: 'Highrise Office Tower' },
  { id: 'warehouse', label: 'Warehouse' },
  { id: 'industrial_building', label: 'Industrial Building' },
  { id: 'cold_storage', label: 'Cold Storage' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'shops_plus_apartments', label: 'Shops + Apartments' },
  { id: 'complete_mixed_tower', label: 'Complete Mixed Tower' },
];

const MATERIAL_KEYS: { key: string; label: string; unit: string }[] = [
  { key: 'cement_opc', label: 'Cement (OPC)', unit: 'per 50kg bag' },
  { key: 'steel_saria', label: 'Steel / Saria (Grade 60)', unit: 'per 40kg' },
  { key: 'bricks_1st_class', label: 'Bricks (1st Class)', unit: 'per 1000' },
  { key: 'sand_lawrencepur', label: 'Sand (Lawrencepur)', unit: 'per cubic ft' },
  { key: 'crush_margalla', label: 'Crush (Margalla)', unit: 'per cubic ft' },
  { key: 'concrete_blocks_solid', label: 'Concrete Blocks (Solid)', unit: 'per block' },
  { key: 'tiles_standard', label: 'Tiles (Standard)', unit: 'per sq ft' },
  { key: 'tiles_vitrified', label: 'Tiles (Premium Vitrified)', unit: 'per sq ft' },
  { key: 'marble_botticino', label: 'Marble (Botticino)', unit: 'per sq ft' },
  { key: 'paint_premium_emulsion', label: 'Paint (Premium Emulsion)', unit: 'per gallon' },
  { key: 'wood_teak_burma', label: 'Wood (Teak — Burma)', unit: 'per cubic ft' },
  { key: 'wood_local_deodar', label: 'Wood (Local Deodar)', unit: 'per cubic ft' },
  { key: 'copper_wire_7_29', label: 'Copper Wire (7/29)', unit: 'per 90m coil' },
  { key: 'pvc_pipes_4_inch', label: 'PVC Pipes (4 inch)', unit: 'per ft' },
  { key: 'labor_skilled_mason', label: 'Skilled Mason', unit: 'per day' },
  { key: 'labor_unskilled', label: 'Unskilled Labor', unit: 'per day' },
  { key: 'labor_electrician', label: 'Electrician (Certified)', unit: 'per day' },
];

const ADD_ON_KINDS: { id: AddOnKind; label: string; defaultUnit: string }[] = [
  { id: 'boundary_wall', label: 'Boundary Wall', defaultUnit: 'per running ft' },
  { id: 'basement', label: 'Basement', defaultUnit: 'per sqft' },
  { id: 'elevator', label: 'Elevator', defaultUnit: 'per unit' },
  { id: 'parking', label: 'Parking', defaultUnit: 'per slot' },
  { id: 'generator', label: 'Generator', defaultUnit: 'per KVA' },
  { id: 'hvac', label: 'HVAC System', defaultUnit: 'per sqft' },
];

const OVERRIDE_TYPE_META: Record<OverrideType, { label: string; icon: React.ReactElement; color: string }> = {
  material: { label: 'Material Price', icon: <Package className="w-4 h-4" />, color: '#029bba' },
  per_sqft: { label: 'Per-Sqft Rate', icon: <Building2 className="w-4 h-4" />, color: '#004063' },
  city_multiplier: { label: 'City Multiplier', icon: <MapPin className="w-4 h-4" />, color: '#06b6d4' },
  add_on: { label: 'Add-On Cost', icon: <Briefcase className="w-4 h-4" />, color: '#027a94' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs ${(amount / 100_000).toFixed(2)} Lac`;
  return `Rs ${amount.toLocaleString()}`;
}

function formatValueByType(rate: { value: number; overrideType: OverrideType }): string {
  if (rate.overrideType === 'city_multiplier') {
    return `${rate.value}x`;
  }
  return formatPKR(rate.value);
}

function formatRelativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AdminConstructionRatesPage(): React.ReactElement {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ─── Auth guard ─────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    const role = (session?.user as { role?: string })?.role;
    if (role !== 'admin') {
      router.replace('/');
    }
  }, [status, session, router]);

  // ─── List state ─────────────────────────────────────────────
  const [rates, setRates] = useState<RateListItem[]>([]);
  const [stats, setStats] = useState<ListStats>({
    total: 0, active: 0, expired: 0, stale: 0,
    byType: { material: 0, per_sqft: 0, city_multiplier: 0, add_on: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Filters ────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<OverrideType | ''>('');
  const [filterCity, setFilterCity] = useState<City | ''>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired' | 'stale'>('all');

  // ─── Modals ────────────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<RateListItem | null>(null);
  const [historyModal, setHistoryModal] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; hard: boolean } | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ id: string; name: string; toActive: boolean } | null>(null);

  // ─── Banner ────────────────────────────────────────────────
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  // ─── Fetch rates ───────────────────────────────────────────
  const fetchRates = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filterType) params.set('overrideType', filterType);
      if (filterCity) params.set('city', filterCity);

      if (filterStatus === 'active') params.set('activeOnly', 'true');
      else if (filterStatus === 'inactive') params.set('activeOnly', 'false');
      else if (filterStatus === 'expired') params.set('expiredOnly', 'true');
      else if (filterStatus === 'stale') params.set('staleOnly', 'true');

      params.set('limit', '100');
      params.set('sortBy', 'updatedAt');
      params.set('sortOrder', 'desc');

      const res = await fetch(`/api/admin/construction-rates?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data?.error || 'Failed to load rates' });
        return;
      }

      setRates(data.data.rates);
      setStats(data.data.stats);
    } catch {
      setBanner({ type: 'error', message: 'Network error. Please refresh.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filterType, filterCity, filterStatus]);

  // Initial + debounced refetch on filter changes
  useEffect(() => {
    const t = setTimeout(() => fetchRates(), 350);
    return () => clearTimeout(t);
  }, [fetchRates]);

  // ─── Refresh stats in sidebar ──────────────────────────────
  const refreshSidebarStats = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refreshAdminStats'));
    }
  };

  // ─── Toggle active ─────────────────────────────────────────
  const handleToggleActive = async (id: string, toActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/construction-rates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: toActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data?.error || 'Failed to toggle status' });
        return;
      }
      setBanner({ type: 'success', message: toActive ? 'Override activated' : 'Override paused' });
      setConfirmToggle(null);
      fetchRates(true);
      refreshSidebarStats();
    } catch {
      setBanner({ type: 'error', message: 'Network error' });
    }
  };

  // ─── Delete ────────────────────────────────────────────────
  const handleDelete = async (id: string, hard: boolean) => {
    try {
      const url = hard
        ? `/api/admin/construction-rates/${id}?hard=true`
        : `/api/admin/construction-rates/${id}`;
      const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data?.error || 'Failed to delete' });
        return;
      }
      setBanner({
        type: 'success',
        message: hard ? 'Override permanently deleted' : 'Override deactivated',
      });
      setConfirmDelete(null);
      fetchRates(true);
      refreshSidebarStats();
    } catch {
      setBanner({ type: 'error', message: 'Network error' });
    }
  };

  // ─── Loading guard ─────────────────────────────────────────
  if (status === 'loading' || (status === 'authenticated' && (session?.user as { role?: string })?.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Construction Rates · Admin · Highrise.pk</title>
      </Head>

      <AdminLayout>
        <div className="space-y-6">

          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-7 h-7 text-[#029bba]" />
                Construction Rates
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage live material prices, per-sqft rates, city multipliers, and add-on costs
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchRates(true)}
                disabled={refreshing}
                className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#027a94] hover:to-[#003553] text-white font-semibold text-sm transition-all shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Override
              </button>
            </div>
          </div>

          {/* ── BANNER ── */}
          {banner && (
            <div
              className={`rounded-xl border-l-4 p-3 flex items-start gap-2 text-sm ${
                banner.type === 'success' ? 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]' :
                banner.type === 'error' ? 'bg-[#fef2f2] border-[#ef4444] text-red-700' :
                'bg-[#eff6ff] border-[#029bba] text-[#004063]'
              }`}
            >
              {banner.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {banner.type === 'error' && <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {banner.type === 'info' && <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span className="flex-1 font-medium">{banner.message}</span>
              <button onClick={() => setBanner(null)} className="opacity-60 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── STATS ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Overrides" value={stats.total} icon={<Database className="w-5 h-5" />} color="#029bba" />
            <StatCard label="Active" value={stats.active} icon={<CheckCircle className="w-5 h-5" />} color="#10b981" />
            <StatCard label="Expired" value={stats.expired} icon={<XCircle className="w-5 h-5" />} color="#ef4444" />
            <StatCard label="Stale (90+ days)" value={stats.stale} icon={<AlertTriangle className="w-5 h-5" />} color="#f59e0b" />
          </div>

          {/* ── BY TYPE ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(OVERRIDE_TYPE_META) as OverrideType[]).map((type) => {
              const meta = OVERRIDE_TYPE_META[type];
              const count = stats.byType[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(filterType === type ? '' : type)}
                  className={`bg-white rounded-xl p-3 border-2 text-left transition-all ${
                    filterType === type ? 'border-[#029bba] shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.icon}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">{count}</div>
                </button>
              );
            })}
          </div>

          {/* ── FILTERS ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, source, or material key..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                />
              </div>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value as City | '')}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
              >
                <option value="">All Cities</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Paused Only</option>
                <option value="expired">Expired Only</option>
                <option value="stale">Stale (90+ days)</option>
              </select>
            </div>

            {(filterType || filterCity || filterStatus !== 'all' || search) && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Filter className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Filters active:</span>
                {search && <FilterBadge label={`"${search}"`} onClear={() => setSearch('')} />}
                {filterType && (
                  <FilterBadge
                    label={OVERRIDE_TYPE_META[filterType].label}
                    onClear={() => setFilterType('')}
                  />
                )}
                {filterCity && <FilterBadge label={filterCity} onClear={() => setFilterCity('')} />}
                {filterStatus !== 'all' && (
                  <FilterBadge label={filterStatus} onClear={() => setFilterStatus('all')} />
                )}
              </div>
            )}
          </div>

          {/* ── LIST ── */}
          {loading ? (
            <div className="bg-white rounded-xl p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#029bba] mb-2" />
              <span className="text-sm text-gray-500">Loading rates...</span>
            </div>
          ) : rates.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-1">No rate overrides found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {filterType || filterCity || search || filterStatus !== 'all'
                  ? 'Try clearing the filters above'
                  : 'Get started by creating your first override'}
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-sm transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Override
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rates.map((rate) => (
                <RateCard
                  key={rate._id}
                  rate={rate}
                  onEdit={() => setEditModal(rate)}
                  onViewHistory={() => setHistoryModal({ id: rate._id, name: rate.displayName })}
                  onToggle={() =>
                    setConfirmToggle({
                      id: rate._id,
                      name: rate.displayName,
                      toActive: !rate.active,
                    })
                  }
                  onDelete={(hard) =>
                    setConfirmDelete({ id: rate._id, name: rate.displayName, hard })
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* ═══════ MODALS ═══════ */}

        {createModalOpen && (
          <CreateRateModal
            onClose={() => setCreateModalOpen(false)}
            onSuccess={(name) => {
              setBanner({ type: 'success', message: `"${name}" created successfully` });
              setCreateModalOpen(false);
              fetchRates(true);
              refreshSidebarStats();
            }}
          />
        )}

        {editModal && (
          <EditRateModal
            rate={editModal}
            onClose={() => setEditModal(null)}
            onSuccess={(diff) => {
              if (diff) {
                setBanner({
                  type: 'success',
                  message: `Updated: ${formatPKR(diff.oldValue)} → ${formatPKR(diff.newValue)} (${diff.changePercent > 0 ? '+' : ''}${diff.changePercent}%)`,
                });
              } else {
                setBanner({ type: 'success', message: 'Override updated successfully' });
              }
              setEditModal(null);
              fetchRates(true);
            }}
          />
        )}

        {historyModal && (
          <HistoryModal
            rateId={historyModal.id}
            rateName={historyModal.name}
            onClose={() => setHistoryModal(null)}
          />
        )}

        {/* Confirm pause/activate */}
        {confirmToggle && (
          <ConfirmModal
            title={confirmToggle.toActive ? 'Activate Override?' : 'Pause Override?'}
            message={
              confirmToggle.toActive
                ? `Activate "${confirmToggle.name}"? The construction calculator will start using this rate immediately.`
                : `Pause "${confirmToggle.name}"? The construction calculator will fall back to baseline rates.`
            }
            confirmLabel={confirmToggle.toActive ? 'Activate' : 'Pause'}
            confirmColor={confirmToggle.toActive ? '#10b981' : '#f59e0b'}
            onConfirm={() => handleToggleActive(confirmToggle.id, confirmToggle.toActive)}
            onCancel={() => setConfirmToggle(null)}
          />
        )}

        {/* Confirm delete */}
        {confirmDelete && (
          <ConfirmModal
            title={confirmDelete.hard ? 'Permanently Delete?' : 'Deactivate Override?'}
            message={
              confirmDelete.hard
                ? `Permanently delete "${confirmDelete.name}"? This cannot be undone. All history will be lost.`
                : `Deactivate "${confirmDelete.name}"? You can re-enable it later from the list.`
            }
            confirmLabel={confirmDelete.hard ? 'Delete Forever' : 'Deactivate'}
            confirmColor="#ef4444"
            onConfirm={() => handleDelete(confirmDelete.id, confirmDelete.hard)}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AdminLayout>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactElement;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps): React.ReactElement {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: color }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function FilterBadge({ label, onClear }: { label: string; onClear: () => void }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#029bba]/10 text-[#029bba] font-semibold">
      {label}
      <button onClick={onClear} className="hover:bg-[#029bba]/20 rounded-full p-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

interface RateCardProps {
  rate: RateListItem;
  onEdit: () => void;
  onViewHistory: () => void;
  onToggle: () => void;
  onDelete: (hard: boolean) => void;
}

function RateCard({ rate, onEdit, onViewHistory, onToggle, onDelete }: RateCardProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = OVERRIDE_TYPE_META[rate.overrideType];
  const isStale = rate.daysSinceUpdate >= 90;

  return (
    <div className={`bg-white rounded-xl border ${rate.active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: meta.color }}
        >
          {meta.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className={`font-bold ${rate.active ? 'text-gray-900' : 'text-gray-500'} text-sm md:text-base`}>
                  {rate.displayName}
                </h3>
                {!rate.active && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">PAUSED</span>
                )}
                {rate.isExpired && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#ef4444]">EXPIRED</span>
                )}
                {isStale && rate.active && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e]">STALE</span>
                )}
                {rate.city && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#029bba]/10 text-[#029bba]">
                    {rate.city}
                  </span>
                )}
                {!rate.city && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">GLOBAL</span>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-2 truncate">
                {meta.label}
                {rate.unit && ` · ${rate.unit}`}
                {rate.subType && ` · ${SUB_TYPES.find((s) => s.id === rate.subType)?.label ?? rate.subType}`}
                {rate.quality && ` · ${rate.quality}`}
              </div>

              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-xl md:text-2xl font-bold text-gray-900">
                  {formatValueByType(rate)}
                </span>
                {rate.trend && rate.changePercent !== undefined && rate.changePercent !== 0 && (
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                    rate.trend === 'up' ? 'text-[#ef4444]' :
                    rate.trend === 'down' ? 'text-[#10b981]' :
                    'text-gray-500'
                  }`}>
                    {rate.trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
                     rate.trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {rate.changePercent > 0 ? '+' : ''}{rate.changePercent}%
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {rate.source}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Updated {formatRelativeDate(rate.updatedAt)}
                </span>
                {rate.historyCount > 0 && (
                  <button
                    onClick={onViewHistory}
                    className="flex items-center gap-1 text-[#029bba] hover:underline font-semibold"
                  >
                    <History className="w-3 h-3" />
                    {rate.historyCount} change{rate.historyCount > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Actions menu"
              >
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4 text-gray-500" />
                      Edit
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onViewHistory(); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <History className="w-4 h-4 text-gray-500" />
                      View History
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onToggle(); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      {rate.active ? (
                        <>
                          <Pause className="w-4 h-4 text-[#f59e0b]" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-[#10b981]" />
                          Activate
                        </>
                      )}
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <XCircle className="w-4 h-4 text-gray-500" />
                      Deactivate
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(true); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[#fef2f2] flex items-center gap-2 text-[#ef4444]"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Forever
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {rate.notes && (
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
              💬 {rate.notes}
            </div>
          )}

          {rate.sourceUrl && (
            <a
              href={rate.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-[#029bba] hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              View source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CREATE MODAL ────────────────────────────────────────────────────────────

interface CreateRateModalProps {
  onClose: () => void;
  onSuccess: (name: string) => void;
}

function CreateRateModal({ onClose, onSuccess }: CreateRateModalProps): React.ReactElement {
  const [tab, setTab] = useState<OverrideType>('material');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared
  const [displayName, setDisplayName] = useState('');
  const [value, setValue] = useState('');
  const [city, setCity] = useState<City | ''>('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');

  // Material
  const [materialKey, setMaterialKey] = useState('');
  const [unit, setUnit] = useState('');
  const [trend, setTrend] = useState<Trend>('stable');
  const [changePercent, setChangePercent] = useState('');

  // Per-sqft
  const [subType, setSubType] = useState<SubType | ''>('');
  const [quality, setQuality] = useState<Quality>('standard');
  const [constructionType, setConstructionType] = useState<ConstructionType>('grey_structure');

  // Add-on
  const [addOnKind, setAddOnKind] = useState<AddOnKind | ''>('');

  // Auto-fill on material select
  useEffect(() => {
    if (tab === 'material' && materialKey) {
      const m = MATERIAL_KEYS.find((k) => k.key === materialKey);
      if (m) {
        if (!displayName) setDisplayName(m.label + (city ? ` — ${city}` : ''));
        if (!unit) setUnit(m.unit);
      }
    }
  }, [materialKey, city, tab, displayName, unit]);

  // Auto-fill on add-on select
  useEffect(() => {
    if (tab === 'add_on' && addOnKind) {
      const a = ADD_ON_KINDS.find((k) => k.id === addOnKind);
      if (a && !displayName) {
        setDisplayName(`${a.label} — ${quality}${city ? ` (${city})` : ''}`);
      }
    }
  }, [addOnKind, quality, city, tab, displayName]);

  const handleSubmit = async () => {
    setError(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Display name is required (min 2 chars)');
      return;
    }
    const valueNum = parseFloat(value);
    if (!value || isNaN(valueNum) || valueNum < 0) {
      setError('Please enter a valid value');
      return;
    }
    if (!source.trim() || source.trim().length < 3) {
      setError('Source is required (e.g. "WhatsApp dealer survey")');
      return;
    }

    // Type-specific validation
    if (tab === 'material') {
      if (!materialKey) { setError('Select a material'); return; }
      if (!unit.trim()) { setError('Unit is required'); return; }
    }
    if (tab === 'per_sqft' && !subType) {
      setError('Select a property sub-type');
      return;
    }
    if (tab === 'city_multiplier') {
      if (!city) { setError('City is required for city multiplier'); return; }
      if (!subType) { setError('Sub-type is required for city multiplier'); return; }
      if (valueNum < 0.3 || valueNum > 3.0) {
        setError('Multiplier must be between 0.3 and 3.0');
        return;
      }
    }
    if (tab === 'add_on' && !addOnKind) {
      setError('Select an add-on kind');
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        overrideType: tab,
        displayName: displayName.trim(),
        value: valueNum,
        source: source.trim(),
        active: true,
      };

      if (city) payload.city = city;
      if (sourceUrl.trim()) payload.sourceUrl = sourceUrl.trim();
      if (notes.trim()) payload.notes = notes.trim();
      if (validUntil) payload.validUntil = new Date(validUntil).toISOString();

      if (tab === 'material') {
        payload.materialKey = materialKey;
        payload.unit = unit.trim();
        if (trend) payload.trend = trend;
        if (changePercent) payload.changePercent = parseFloat(changePercent);
      } else if (tab === 'per_sqft') {
        payload.subType = subType;
        payload.quality = quality;
        payload.constructionType = constructionType;
      } else if (tab === 'city_multiplier') {
        payload.subType = subType;
      } else if (tab === 'add_on') {
        payload.addOnKind = addOnKind;
        payload.quality = quality;
      }

      const res = await fetch('/api/admin/construction-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || 'Failed to create override');
        return;
      }

      onSuccess(displayName.trim());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create Rate Override</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-1 border-b border-gray-200">
          {(Object.keys(OVERRIDE_TYPE_META) as OverrideType[]).map((t) => {
            const m = OVERRIDE_TYPE_META[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  tab === t
                    ? 'bg-[#029bba] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {error && (
            <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-3 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* MATERIAL fields */}
          {tab === 'material' && (
            <>
              <FormGroup label="Material *">
                <select
                  value={materialKey}
                  onChange={(e) => setMaterialKey(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select material...</option>
                  {MATERIAL_KEYS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </FormGroup>
              <FormGroup label="Unit *">
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. per 50kg bag"
                  className="form-input"
                />
              </FormGroup>
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="Trend">
                  <select value={trend} onChange={(e) => setTrend(e.target.value as Trend)} className="form-select">
                    <option value="stable">Stable</option>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                </FormGroup>
                <FormGroup label="Change % (optional)">
                  <input
                    type="number"
                    step="0.1"
                    value={changePercent}
                    onChange={(e) => setChangePercent(e.target.value)}
                    placeholder="e.g. 5.4"
                    className="form-input"
                  />
                </FormGroup>
              </div>
            </>
          )}

          {/* PER-SQFT fields */}
          {tab === 'per_sqft' && (
            <>
              <FormGroup label="Property Sub-Type *">
                <select value={subType} onChange={(e) => setSubType(e.target.value as SubType | '')} className="form-select">
                  <option value="">Select sub-type...</option>
                  {SUB_TYPES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </FormGroup>
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="Quality *">
                  <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)} className="form-select">
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </FormGroup>
                <FormGroup label="Construction Type *">
                  <select value={constructionType} onChange={(e) => setConstructionType(e.target.value as ConstructionType)} className="form-select">
                    <option value="grey_structure">Grey Structure</option>
                    <option value="finishing">Finishing</option>
                  </select>
                </FormGroup>
              </div>
            </>
          )}

          {/* CITY MULTIPLIER fields */}
          {tab === 'city_multiplier' && (
            <>
              <FormGroup label="Sub-Type *">
                <select value={subType} onChange={(e) => setSubType(e.target.value as SubType | '')} className="form-select">
                  <option value="">Select sub-type...</option>
                  {SUB_TYPES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </FormGroup>
              <div className="bg-[#eff6ff] border-l-4 border-[#029bba] p-3 rounded-lg text-xs text-[#004063]">
                <strong>City multipliers:</strong> Value should be between 0.3–3.0.
                Baseline = 1.0. Example: 1.15 means 15% more expensive than Lahore.
              </div>
            </>
          )}

          {/* ADD-ON fields */}
          {tab === 'add_on' && (
            <>
              <FormGroup label="Add-On Kind *">
                <select value={addOnKind} onChange={(e) => setAddOnKind(e.target.value as AddOnKind | '')} className="form-select">
                  <option value="">Select add-on...</option>
                  {ADD_ON_KINDS.map((a) => (
                    <option key={a.id} value={a.id}>{a.label} ({a.defaultUnit})</option>
                  ))}
                </select>
              </FormGroup>
              <FormGroup label="Quality *">
                <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)} className="form-select">
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                </select>
              </FormGroup>
            </>
          )}

          {/* SHARED fields */}
          <FormGroup label="City">
            <select value={city} onChange={(e) => setCity(e.target.value as City | '')} className="form-select">
              <option value="">{tab === 'city_multiplier' ? 'Select city... *' : 'Global (all cities)'}</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Display Name *">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Cement (OPC) — Lahore"
              maxLength={200}
              className="form-input"
            />
          </FormGroup>

          <FormGroup label={`Value (PKR) ${tab === 'city_multiplier' ? '— Multiplier' : ''} *`}>
            <input
              type="number"
              step={tab === 'city_multiplier' ? '0.01' : '1'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={tab === 'city_multiplier' ? 'e.g. 1.15' : 'e.g. 1350'}
              className="form-input"
            />
          </FormGroup>

          <FormGroup label="Source * (where did this rate come from?)">
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Karachi Cement Dealers Survey, Feb 2025"
              maxLength={200}
              className="form-input"
            />
          </FormGroup>

          <FormGroup label="Source URL (optional)">
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="form-input"
            />
          </FormGroup>

          <FormGroup label="Valid Until (optional)">
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="form-input"
            />
          </FormGroup>

          <FormGroup label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={2}
              maxLength={1000}
              className="form-input resize-y"
            />
          </FormGroup>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#027a94] hover:to-[#003553] text-white shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
            ) : (
              <><Plus className="w-4 h-4" />Create Override</>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 0.75rem;
          font-size: 14px;
          outline: none;
        }
        :global(.form-input:focus) {
          border-color: #029bba;
          box-shadow: 0 0 0 2px rgba(2,155,186,0.1);
        }
        :global(.form-select) {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 0.75rem;
          font-size: 14px;
          outline: none;
          background: white;
          cursor: pointer;
        }
        :global(.form-select:focus) {
          border-color: #029bba;
          box-shadow: 0 0 0 2px rgba(2,155,186,0.1);
        }
        :global(textarea.form-input) {
          height: auto;
          padding: 8px 12px;
        }
      `}</style>
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── EDIT MODAL ──────────────────────────────────────────────────────────────

interface EditRateModalProps {
  rate: RateListItem;
  onClose: () => void;
  onSuccess: (diff?: { oldValue: number; newValue: number; changePercent: number }) => void;
}

function EditRateModal({ rate, onClose, onSuccess }: EditRateModalProps): React.ReactElement {
  const [newValue, setNewValue] = useState(String(rate.value));
  const [changeReason, setChangeReason] = useState('');
  const [newSource, setNewSource] = useState(rate.source);
  const [newActive, setNewActive] = useState(rate.active);
  const [newValidUntil, setNewValidUntil] = useState(
    rate.validUntil ? new Date(rate.validUntil).toISOString().slice(0, 16) : ''
  );
  const [newNotes, setNewNotes] = useState(rate.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Diff preview
  const diff = useMemo(() => {
    const num = parseFloat(newValue);
    if (isNaN(num) || num === rate.value) return null;
    const changePercent = rate.value === 0 ? (num > 0 ? 100 : 0) : ((num - rate.value) / rate.value) * 100;
    return {
      oldValue: rate.value,
      newValue: num,
      changePercent: parseFloat(changePercent.toFixed(2)),
    };
  }, [newValue, rate.value]);

  const valueChanged = diff !== null;

  const handleSubmit = async () => {
    setError(null);

    const valueNum = parseFloat(newValue);
    if (isNaN(valueNum) || valueNum < 0) {
      setError('Please enter a valid value');
      return;
    }

    if (valueChanged && (!changeReason.trim() || changeReason.trim().length < 5)) {
      setError('Please provide a reason for changing the value (min 5 chars)');
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        active: newActive,
      };
      if (valueNum !== rate.value) payload.value = valueNum;
      if (valueChanged) payload.changeReason = changeReason.trim();
      if (newSource.trim() !== rate.source) payload.source = newSource.trim();
      if (newNotes !== (rate.notes ?? '')) payload.notes = newNotes.trim();
      if (newValidUntil) {
        payload.validUntil = new Date(newValidUntil).toISOString();
      }

      const res = await fetch(`/api/admin/construction-rates/${rate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || 'Failed to update');
        return;
      }

      onSuccess(data.data?.rate?.changeDiff);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Rate</h2>
            <p className="text-xs text-gray-500 truncate mt-0.5">{rate.displayName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {error && (
            <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-3 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Value */}
          <FormGroup label="Value">
            <input
              type="number"
              step="0.01"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="form-input"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Current: {formatValueByType(rate)} {rate.unit && `(${rate.unit})`}
            </p>
          </FormGroup>

          {/* DIFF PREVIEW */}
          {diff && (
            <div className={`rounded-xl p-3 border-2 ${
              diff.changePercent > 0
                ? 'bg-[#fef2f2] border-[#fecaca]'
                : 'bg-[#f0fdf4] border-[#bbf7d0]'
            }`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">Change Preview</div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="text-gray-500 line-through">{formatPKR(diff.oldValue)}</span>
                <span className="text-gray-400">→</span>
                <span className={diff.changePercent > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}>
                  {formatPKR(diff.newValue)}
                </span>
                <span className={`text-xs ${diff.changePercent > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                  ({diff.changePercent > 0 ? '+' : ''}{diff.changePercent}%)
                </span>
              </div>
            </div>
          )}

          {/* Change reason — REQUIRED if value changed */}
          {valueChanged && (
            <FormGroup label="Change Reason * (required when changing value)">
              <textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Cement price rose 5.4% due to Q2 import tax — confirmed via Karachi dealers"
                rows={2}
                maxLength={500}
                className="form-input resize-y"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {changeReason.length}/500 — minimum 5 chars
              </p>
            </FormGroup>
          )}

          <FormGroup label="Source">
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              maxLength={200}
              className="form-input"
            />
          </FormGroup>

          <FormGroup label="Valid Until">
            <input
              type="datetime-local"
              value={newValidUntil}
              onChange={(e) => setNewValidUntil(e.target.value)}
              className="form-input"
            />
          </FormGroup>

          <FormGroup label="Notes">
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              maxLength={1000}
              className="form-input resize-y"
            />
          </FormGroup>

          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
            <input
              type="checkbox"
              checked={newActive}
              onChange={(e) => setNewActive(e.target.checked)}
              className="w-4 h-4 accent-[#029bba]"
            />
            <span className="text-sm font-semibold text-gray-700">Active</span>
            <span className="text-xs text-gray-500">(Engine uses this rate when active)</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#027a94] hover:to-[#003553] text-white shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
            ) : (
              <><CheckCircle className="w-4 h-4" />Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY MODAL ────────────────────────────────────────────────────────────

interface HistoryModalProps {
  rateId: string;
  rateName: string;
  onClose: () => void;
}

function HistoryModal({ rateId, rateName, onClose }: HistoryModalProps): React.ReactElement {
  const [detail, setDetail] = useState<RateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/construction-rates/${rateId}`, { credentials: 'include' });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          setDetail(data.data.rate);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rateId]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-[#029bba]" />
              Change History
            </h2>
            <p className="text-xs text-gray-500 truncate mt-0.5">{rateName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#029bba]" />
            </div>
          ) : !detail || detail.history.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No history yet — this rate hasn&apos;t been updated since creation.
            </div>
          ) : (
            <div className="space-y-3">
              {detail.history.slice().reverse().map((h, i) => (
                <div key={i} className="border-l-4 border-[#029bba] bg-gray-50 rounded-r-lg p-3">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">{new Date(h.changedAt).toLocaleString('en-PK')}</span>
                    {h.changedByEmail && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-600 font-medium">{h.changedByEmail}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500 line-through">{formatPKR(h.oldValue)}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm font-bold text-gray-900">{formatPKR(h.newValue)}</span>
                    <span className={`text-xs font-bold ${h.changePercent > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      ({h.changePercent > 0 ? '+' : ''}{h.changePercent}%)
                    </span>
                  </div>
                  {h.changeReason && (
                    <div className="text-xs text-gray-700 bg-white rounded p-2">
                      <strong>Reason:</strong> {h.changeReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }: ConfirmModalProps): React.ReactElement {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-md disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: confirmColor }}
          >
            {confirming ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Working...</>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}