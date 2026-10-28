// pages/society/plots.tsx
// Highrise.pk — Society Plot Inventory Management
// Full table: filter by size, add/edit/delete entries
// NO framer-motion | NO as any | NO toast | inline modals only

import { useEffect, useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import Head from 'next/head';
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Save,
  Package,
  TrendingUp,
  Search,
} from 'lucide-react';
import SocietyLayout from '@/components/society/SocietyLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlotEntry {
  size: string;
  totalPlots: number;
  availablePlots: number;
  pricePerMarla?: number;
  pricePerSqFt?: number;
}

interface PlotsApiResponse {
  success: boolean;
  plots?: PlotEntry[];
  message?: string;
  errors?: Record<string, string[]>;
}

// ─── Plot size config ─────────────────────────────────────────────────────────

const PLOT_SIZES = [
  { value: '3_marla', label: '3 Marla' },
  { value: '4_marla', label: '4 Marla' },
  { value: '5_marla', label: '5 Marla' },
  { value: '6_marla', label: '6 Marla' },
  { value: '7_marla', label: '7 Marla' },
  { value: '8_marla', label: '8 Marla' },
  { value: '10_marla', label: '10 Marla' },
  { value: '12_marla', label: '12 Marla' },
  { value: '1_kanal', label: '1 Kanal' },
  { value: '1_kanal_4_marla', label: '1 Kanal 4 Marla' },
  { value: '2_kanal', label: '2 Kanal' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
] as const;

type PlotSizeValue = typeof PLOT_SIZES[number]['value'];

const SIZE_LABEL: Record<string, string> = Object.fromEntries(
  PLOT_SIZES.map((s) => [s.value, s.label])
);

// ─── Format PKR ──────────────────────────────────────────────────────────────

function formatPKR(value: number): string {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)} Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)} L`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

// ─── Plot Form Modal ──────────────────────────────────────────────────────────

interface PlotFormModalProps {
  existing: PlotEntry | null;     // null = add mode
  takenSizes: string[];           // already used sizes (for add mode)
  onClose: () => void;
  onSave: (data: PlotEntry, isNew: boolean) => Promise<void>;
  saving: boolean;
  errorMsg: string;
}

function PlotFormModal({
  existing,
  takenSizes,
  onClose,
  onSave,
  saving,
  errorMsg,
}: PlotFormModalProps): ReactElement {
  const isNew = !existing;

  const [size, setSize] = useState<PlotSizeValue>(
    (existing?.size as PlotSizeValue) ?? '5_marla'
  );
  const [totalPlots, setTotalPlots] = useState(existing?.totalPlots ?? 0);
  const [availablePlots, setAvailablePlots] = useState(existing?.availablePlots ?? 0);
  const [pricePerMarla, setPricePerMarla] = useState(existing?.pricePerMarla ?? 0);
  const [pricePerSqFt, setPricePerSqFt] = useState(existing?.pricePerSqFt ?? 0);
  const [localError, setLocalError] = useState('');

  const availableSizes = isNew
    ? PLOT_SIZES.filter((s) => !takenSizes.includes(s.value))
    : PLOT_SIZES;

  const handleSubmit = async () => {
    setLocalError('');
    if (availablePlots > totalPlots) {
      setLocalError('Available plots cannot exceed total plots.');
      return;
    }
    await onSave(
      { size, totalPlots, availablePlots, pricePerMarla: pricePerMarla || undefined, pricePerSqFt: pricePerSqFt || undefined },
      isNew
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isNew ? 'Add Plot Size' : `Edit — ${SIZE_LABEL[existing?.size ?? ''] ?? existing?.size}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {(localError || errorMsg) && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError || errorMsg}
            </div>
          )}

          {/* Size */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Plot Size *
            </label>
            {isNew ? (
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as PlotSizeValue)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20"
              >
                {availableSizes.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-semibold text-gray-800 px-3 py-2 bg-gray-50 rounded-xl">
                {SIZE_LABEL[existing?.size ?? ''] ?? existing?.size}
              </p>
            )}
          </div>

          {/* Total plots */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Total Plots *
              </label>
              <input
                type="number"
                min={0}
                value={totalPlots}
                onChange={(e) => setTotalPlots(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Available Plots *
              </label>
              <input
                type="number"
                min={0}
                max={totalPlots}
                value={availablePlots}
                onChange={(e) => setAvailablePlots(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Price / Marla (PKR)
              </label>
              <input
                type="number"
                min={0}
                value={pricePerMarla}
                onChange={(e) => setPricePerMarla(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Price / Sq.Ft (PKR)
              </label>
              <input
                type="number"
                min={0}
                value={pricePerSqFt}
                onChange={(e) => setPricePerSqFt(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20"
              />
            </div>
          </div>

          {/* Live preview */}
          {totalPlots > 0 && (
            <div className="p-3 bg-[#029bba]/5 rounded-xl border border-[#029bba]/10">
              <p className="text-xs font-semibold text-[#004063] mb-1">Preview</p>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>Total: <strong className="text-gray-800">{totalPlots}</strong></span>
                <span>Available: <strong className="text-green-700">{availablePlots}</strong></span>
                <span>Sold: <strong className="text-amber-700">{totalPlots - availablePlots}</strong></span>
              </div>
              {pricePerMarla > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Price / Marla: <strong>PKR {formatPKR(pricePerMarla)}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : isNew ? 'Add Entry' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

interface DeleteConfirmProps {
  sizeLabel: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirmModal({
  sizeLabel,
  onConfirm,
  onCancel,
  deleting,
}: DeleteConfirmProps): ReactElement {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Remove Plot Size</h2>
            <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Remove the <strong>{sizeLabel}</strong> inventory entry from your society profile?
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void onConfirm()}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SocietyPlotsPage(): ReactElement {
  const [plots, setPlots] = useState<PlotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state
  const [addEditModal, setAddEditModal] = useState<{
    open: boolean;
    entry: PlotEntry | null;
  }>({ open: false, entry: null });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    size: string;
  }>({ open: false, size: '' });

  // Operation state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Filter
  const [search, setSearch] = useState('');

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchPlots = useCallback(async () => {
    try {
      const res = await fetch('/api/society/plots', { credentials: 'include' });
      const data = (await res.json()) as PlotsApiResponse;
      if (!res.ok || !data.success) {
        setErrorMsg(data.message ?? 'Failed to load plot inventory.');
        return;
      }
      setPlots(data.plots ?? []);
    } catch {
      setErrorMsg('Network error. Please try again.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchPlots().finally(() => setLoading(false));
  }, [fetchPlots]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleSave = async (data: PlotEntry, isNew: boolean) => {
    setSaving(true);
    setModalError('');

    try {
      const res = await fetch('/api/society/plots', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as PlotsApiResponse;

      if (!res.ok || !json.success) {
        setModalError(json.message ?? 'Failed to save plot entry.');
        return;
      }

      setPlots(json.plots ?? []);
      setAddEditModal({ open: false, entry: null });
      setSuccessMsg(isNew ? 'Plot size added successfully.' : 'Plot entry updated.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setModalError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/society/plots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ size: deleteModal.size }),
      });
      const json = (await res.json()) as PlotsApiResponse;

      if (!res.ok || !json.success) {
        setErrorMsg(json.message ?? 'Failed to remove plot entry.');
        setDeleteModal({ open: false, size: '' });
        return;
      }

      setPlots(json.plots ?? []);
      setDeleteModal({ open: false, size: '' });
      setSuccessMsg('Plot entry removed.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = plots.filter((p) => {
    if (!search) return true;
    const label = SIZE_LABEL[p.size]?.toLowerCase() ?? p.size.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  const totalPlots = plots.reduce((s, p) => s + p.totalPlots, 0);
  const totalAvailable = plots.reduce((s, p) => s + p.availablePlots, 0);
  const takenSizes = plots.map((p) => p.size);
  const canAddMore = takenSizes.length < PLOT_SIZES.length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Plot Inventory — Society Portal | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <SocietyLayout>
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plot Inventory</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage available plots by size category. Prices shown per Marla / Sq.Ft.
            </p>
          </div>
          {canAddMore && (
            <button
              onClick={() => {
                setModalError('');
                setAddEditModal({ open: true, entry: null });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Plot Size
            </button>
          )}
        </div>

        {/* Banners */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-3 p-4 border-l-4 border-[#10b981] bg-[#f0fdf4] rounded-r-xl">
            <CheckCircle className="w-5 h-5 text-[#10b981] flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-3 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center mb-2">
              <Package className="w-4 h-4 text-[#029bba]" />
            </div>
            <p className="text-xl font-bold text-gray-800">{plots.length}</p>
            <p className="text-xs text-gray-500">Size Categories</p>
          </div>
          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-gray-800">{totalPlots.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Plots</p>
          </div>
          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-gray-800">{totalAvailable.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Available</p>
          </div>
          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl font-bold text-gray-800">
              {(totalPlots - totalAvailable).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Sold / Reserved</p>
          </div>
        </div>

        {/* ── Filter ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by size..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-gray-100 rounded-2xl">
            <Layers className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-base font-semibold text-gray-600 mb-1">
              {plots.length === 0 ? 'No Plot Inventory Added' : 'No results match filter'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {plots.length === 0
                ? 'Add plot size categories to track availability and pricing.'
                : 'Try clearing the filter.'}
            </p>
            {plots.length === 0 && canAddMore && (
              <button
                onClick={() => setAddEditModal({ open: true, entry: null })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Plot Size
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Plot Size
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Total
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Available
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Sold
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Price/Marla
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Price/SqFt
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Availability
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((plot) => {
                    const sold = plot.totalPlots - plot.availablePlots;
                    const pct = plot.totalPlots > 0
                      ? Math.round((plot.availablePlots / plot.totalPlots) * 100)
                      : 0;

                    return (
                      <tr key={plot.size} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-semibold text-gray-800">
                            {SIZE_LABEL[plot.size] ?? plot.size}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-gray-700 font-medium">
                          {plot.totalPlots.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold text-green-700">
                            {plot.availablePlots.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold text-amber-700">
                            {sold.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-gray-600">
                          {plot.pricePerMarla
                            ? `PKR ${formatPKR(plot.pricePerMarla)}`
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-600">
                          {plot.pricePerSqFt
                            ? `PKR ${formatPKR(plot.pricePerSqFt)}`
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#029bba] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setModalError('');
                                setAddEditModal({ open: true, entry: plot });
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#029bba]/10 text-gray-400 hover:text-[#029bba] transition-colors"
                              title="Edit"
                              aria-label="Edit plot entry"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({ open: true, size: plot.size })
                              }
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove"
                              aria-label="Remove plot entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {filtered.length} of {PLOT_SIZES.length} size categories used
              </p>
              {canAddMore && (
                <button
                  onClick={() => {
                    setModalError('');
                    setAddEditModal({ open: true, entry: null });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#029bba] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add size
                </button>
              )}
            </div>
          </div>
        )}
      </SocietyLayout>

      {/* ── Modals ── */}
      {addEditModal.open && (
        <PlotFormModal
          existing={addEditModal.entry}
          takenSizes={takenSizes}
          onClose={() => setAddEditModal({ open: false, entry: null })}
          onSave={handleSave}
          saving={saving}
          errorMsg={modalError}
        />
      )}

      {deleteModal.open && (
        <DeleteConfirmModal
          sizeLabel={SIZE_LABEL[deleteModal.size] ?? deleteModal.size}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal({ open: false, size: '' })}
          deleting={deleting}
        />
      )}
    </>
  );
}