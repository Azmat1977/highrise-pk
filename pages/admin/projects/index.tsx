// ========== FILE: pages/admin/projects/index.tsx ==========
// Admin: Project Management Panel
// Named export: AdminProjectsContent (used by pending sub-page)
// Default export: AdminProjectsPage (self-contained with auth guard)
// Bug fixes: badge field (developerBadge not badge), reject reason field
// V6.4.2 — useSession() guard, fetch(), inline modals, Tailwind only
// ==================================================================

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Search, CheckCircle, XCircle, Eye, Trash2, RotateCcw,
  Trash, AlertTriangle, Star, X, BadgeCheck, Clock,
  Ban, FolderOpen, RefreshCw, Building2, MapPin, SlidersHorizontal,
  BarChart3, TrendingUp, Shield, Flame,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProjectRow {
  _id:              string;
  slug?:            string;
  projectName:      string;
  city:             string;
  areaName:         string;
  projectCategory:  string;
  projectNature:    string;
  status:           'draft' | 'pending' | 'verified' | 'rejected';
  isVerified:       boolean;
  isFeatured?:      boolean;
  isDeleted?:       boolean;
  deletedAt?:       string;
  developerBadge?:  string;   // ← FIXED: was "badge" (wrong field name)
  badgeLabel?:      string;   // ← returned by API
  badgeEmoji?:      string;   // ← returned by API
  createdAt:        string;
  primaryImage?:    string | null;
  minPrice?:        number;
  maxPrice?:        number;
  priceFormatted?:  { min: string | null; max: string | null };
  totalUnits?:      number;
  developer?:       string;   // ObjectId string
  developerProfile?: {
    companyName?: string;
    logo?:        string;
    verificationLevel?: string;
  } | null;
  rejectionReason?: string | null;
  promotionStartDate?: string | null;
  promotionEndDate?:   string | null;
  promotionImpressions?: number;
  promotionClicks?:    number;
}

interface BannerState {
  type:    'success' | 'error' | 'warning';
  message: string;
}

type ActionType =
  | 'verify' | 'reject' | 'feature' | 'promote' | 'suspend'
  | 'restore' | 'reopen' | 'trash' | 'permanent_delete';

interface ModalState {
  open:            boolean;
  projectId:       string;
  projectName:     string;
  action:          ActionType | null;
  currentFeatured: boolean;
}

const EMPTY_MODAL: ModalState = {
  open: false, projectId: '', projectName: '',
  action: null, currentFeatured: false,
};

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; bg: string; text: string; dot: string; ring: string;
}> = {
  draft:    { label: 'Draft',    bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400',    ring: 'ring-gray-200' },
  pending:  { label: 'Pending',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   ring: 'ring-amber-200' },
  verified: { label: 'Verified', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', ring: 'ring-emerald-200' },
  rejected: { label: 'Rejected', bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400',     ring: 'ring-red-200' },
};

const BADGE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  new_entrant: { label: 'New Entrant',       emoji: '🆕', color: 'text-gray-500' },
  emerging:    { label: 'Emerging Dev',      emoji: '⭐', color: 'text-blue-600' },
  trusted:     { label: 'Trusted Builder',   emoji: '🏆', color: 'text-[#029bba]' },
  premium:     { label: 'Premium Developer', emoji: '💎', color: 'text-violet-600' },
};

const CATEGORY_LABELS: Record<string, string> = {
  highrise:          'High-Rise',
  society:           'Society',
  mixed_use:         'Mixed Use',
  commercial_plaza:  'Commercial Plaza',
  townhouse:         'Townhouse',
  gated_community:   'Gated Community',
};

const FILTER_TABS = [
  { key: 'all',      label: 'All',      icon: '📊' },
  { key: 'pending',  label: 'Pending',  icon: '⏳' },
  { key: 'verified', label: 'Verified', icon: '✅' },
  { key: 'rejected', label: 'Rejected', icon: '❌' },
  { key: 'trash',    label: 'Trash',    icon: '🗑️' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Action config for modals ───────────────────────────────────────────────────

function getActionConfig(action: ActionType | null): {
  title:        string;
  subtitle:     string;
  confirmText:  string;
  confirmClass: string;
  icon:         React.ReactElement;
  needsReason:  boolean;
  reasonLabel:  string;
  reasonMin:    number;
} {
  switch (action) {
    case 'verify':
      return {
        title: 'Verify Project',
        subtitle: 'Project will be publicly visible',
        confirmText: 'Yes, Verify',
        confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
    case 'reject':
      return {
        title: 'Reject Project',
        subtitle: 'Developer will be notified with reason',
        confirmText: 'Yes, Reject',
        confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
        icon: <XCircle className="w-5 h-5 text-red-600" />,
        needsReason: true, reasonLabel: 'Rejection Reason', reasonMin: 10,
      };
    case 'feature':
      return {
        title: 'Toggle Featured',
        subtitle: 'Update featured status on homepage',
        confirmText: 'Yes, Update',
        confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',
        icon: <Star className="w-5 h-5 text-amber-500" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
    case 'suspend':
      return {
        title: 'Suspend Project',
        subtitle: 'Project will be hidden from public view',
        confirmText: 'Yes, Suspend',
        confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
        icon: <Ban className="w-5 h-5 text-red-600" />,
        needsReason: true, reasonLabel: 'Suspension Reason', reasonMin: 10,
      };
    case 'reopen':
      return {
        title: 'Reopen for Review',
        subtitle: 'Project returns to pending status',
        confirmText: 'Yes, Reopen',
        confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
        icon: <RotateCcw className="w-5 h-5 text-blue-600" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
    case 'restore':
      return {
        title: 'Restore Project',
        subtitle: 'Project will be restored from trash',
        confirmText: 'Yes, Restore',
        confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        icon: <RotateCcw className="w-5 h-5 text-emerald-600" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
    case 'trash':
      return {
        title: 'Move to Trash',
        subtitle: 'Project can be restored within 30 days',
        confirmText: 'Move to Trash',
        confirmClass: 'bg-gray-800 hover:bg-gray-900 text-white',
        icon: <Trash2 className="w-5 h-5 text-gray-600" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
    case 'permanent_delete':
      return {
        title: 'Permanently Delete',
        subtitle: 'This action cannot be undone',
        confirmText: 'Delete Forever',
        confirmClass: 'bg-red-700 hover:bg-red-800 text-white',
        icon: <AlertTriangle className="w-5 h-5 text-red-700" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
    default:
      return {
        title: 'Confirm', subtitle: '', confirmText: 'Confirm',
        confirmClass: 'bg-gray-700 text-white',
        icon: <CheckCircle className="w-5 h-5" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
  }
}

// ── PromoteModal (Priority 8 Sponsorship & Monetization Manager) ───────────────

function PromoteModal({
  open,
  project,
  onClose,
  onConfirm,
  processing,
}: {
  open:       boolean;
  project:    ProjectRow | undefined;
  onClose:    () => void;
  onConfirm:  (isFeatured: boolean, start: string | null, end: string | null) => void;
  processing: boolean;
}): React.ReactElement | null {
  const [isFeatured, setIsFeatured] = useState(false);
  const [duration, setDuration] = useState<'7' | '14' | '30' | 'custom'>('7');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (open && project) {
      setIsFeatured(project.isFeatured ?? false);
      const sDate = project.promotionStartDate ? project.promotionStartDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
      setStart(sDate);

      if (project.promotionEndDate) {
        setEnd(project.promotionEndDate.slice(0, 10));
        setDuration('custom');
      } else {
        const defaultEnd = new Date();
        defaultEnd.setDate(defaultEnd.getDate() + 7);
        setEnd(defaultEnd.toISOString().slice(0, 10));
        setDuration('7');
      }
    }
  }, [open, project]);

  useEffect(() => {
    if (duration !== 'custom' && start) {
      const days = parseInt(duration, 10);
      const eDate = new Date(start);
      eDate.setDate(eDate.getDate() + days);
      setEnd(eDate.toISOString().slice(0, 10));
    }
  }, [duration, start]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !project) return null;

  const impressions = project.promotionImpressions ?? 0;
  const clicks = project.promotionClicks ?? 0;
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={processing ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 border border-gray-100 overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Campaign & Sponsorship Manager</h3>
              <p className="text-xs text-gray-500 mt-0.5">Configure developer monetization packages</p>
            </div>
          </div>
          {!processing && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Project Details Snapshot */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 text-sm truncate">{project.projectName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{project.city} · {project.areaName}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isFeatured ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {isFeatured ? 'Sponsored Active' : 'Organic Listing'}
              </span>
            </div>
          </div>

          {/* Performance Dashboard */}
          {project.isFeatured && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-[#029bba]/5 rounded-xl border border-[#029bba]/10">
              <div className="text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Impressions</p>
                <p className="text-lg font-black text-gray-900 mt-1">{impressions.toLocaleString()}</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Clicks</p>
                <p className="text-lg font-black text-gray-900 mt-1">{clicks.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase">CTR %</p>
                <p className="text-lg font-black text-[#029bba] mt-1">{ctr}%</p>
              </div>
            </div>
          )}

          {/* Promotion Toggle */}
          <div className="flex items-center justify-between p-3 border-2 border-dashed border-gray-200 rounded-xl">
            <div>
              <p className="text-xs font-bold text-gray-800">Activate Premium Placement</p>
              <p className="text-[11px] text-gray-400">Forces insertion into Slot #3 in main project grids</p>
            </div>
            <button
              type="button"
              onClick={() => setIsFeatured(!isFeatured)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${isFeatured ? 'bg-[#029bba]' : 'bg-gray-200'}`}
            >
              <span className={`w-5 h-5 rounded-full bg-white shadow absolute transition-transform ${isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Date Duration Picker */}
          {isFeatured && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Sponsorship Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: '7', label: '7 Days' },
                    { key: '14', label: '14 Days' },
                    { key: '30', label: '30 Days' },
                    { key: 'custom', label: 'Custom' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setDuration(opt.key as any)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        duration === opt.key ? 'bg-[#004063] border-[#004063] text-white' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Campaign Start</label>
                  <input
                    type="date"
                    value={start}
                    onChange={e => setStart(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#029bba]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Campaign Expiry</label>
                  <input
                    type="date"
                    value={end}
                    disabled={duration !== 'custom'}
                    onChange={e => setEnd(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#029bba] disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} disabled={processing} className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(isFeatured, isFeatured ? new Date(start).toISOString() : null, isFeatured ? new Date(end).toISOString() : null)}
            disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#029bba] hover:bg-[#027a94] text-white shadow-md shadow-[#029bba]/20"
          >
            {processing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {processing ? 'Processing...' : 'Apply Sponsorship'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ConfirmModal ───────────────────────────────────────────────────────────────

function ConfirmModal({
  modal, project, onClose, onConfirm, processing,
}: {
  modal:      ModalState;
  project:    ProjectRow | undefined;
  onClose:    () => void;
  onConfirm:  (reason?: string) => void;
  processing: boolean;
}): React.ReactElement | null {
  const [reason,  setReason]  = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (modal.open) { setReason(''); setConfirm(''); }
  }, [modal.open]);

  useEffect(() => {
    document.body.style.overflow = modal.open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modal.open]);

  if (!modal.open) return null;

  const cfg           = getActionConfig(modal.action);
  const isPermanent   = modal.action === 'permanent_delete';
  const confirmReady  = isPermanent ? confirm === 'DELETE' : true;
  const reasonReady   = cfg.needsReason ? reason.trim().length >= cfg.reasonMin : true;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={processing ? undefined : onClose}
      />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10
          border border-gray-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100
          bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center
              justify-center flex-shrink-0">
              {cfg.icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{cfg.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{cfg.subtitle}</p>
            </div>
          </div>
          {!processing && (
            <button onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors
                text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Project card */}
          {project && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl
              border border-gray-200">
              {project.primaryImage ? (
                <img src={project.primaryImage} alt={project.projectName}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0
                    border border-gray-200" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center
                  justify-center flex-shrink-0 border border-[#029bba]/20">
                  <Building2 className="w-6 h-6 text-[#029bba]" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">
                  {project.projectName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {project.city} · {project.areaName}
                  {project.priceFormatted?.min && (
                    <span className="ml-1 text-[#029bba] font-semibold">
                      · PKR {project.priceFormatted.min}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Reason textarea */}
          {cfg.needsReason && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2
                uppercase tracking-wide">
                {cfg.reasonLabel} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder={`Enter ${cfg.reasonLabel.toLowerCase()}...`}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                  focus:border-[#029bba] resize-none transition-all"
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className={`text-xs ${reason.trim().length >= cfg.reasonMin
                  ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {reason.trim().length >= cfg.reasonMin
                    ? '✓ Sufficient detail'
                    : `${cfg.reasonMin - reason.trim().length} more characters needed`}
                </p>
                <p className="text-xs text-gray-400">{reason.length}/1000</p>
              </div>
            </div>
          )}

          {/* Permanent delete confirmation */}
          {isPermanent && (
            <>
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed">
                    <strong>Permanent deletion</strong> — all units, images, documents
                    and Cloudinary media will be destroyed forever.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2
                  uppercase tracking-wide">
                  Type{' '}
                  <span className="font-mono bg-red-50 text-red-600 px-1.5 py-0.5
                    rounded border border-red-200 text-[11px]">
                    DELETE
                  </span>{' '}
                  to confirm
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  className={`w-full px-4 py-3 text-sm border rounded-xl font-mono
                    focus:outline-none focus:ring-2 transition-all
                    ${confirm === 'DELETE'
                      ? 'border-red-400 bg-red-50 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-[#029bba]/20 focus:border-[#029bba]'}`}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100
          bg-gray-50/50">
          <button onClick={onClose} disabled={processing}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600
              border border-gray-200 rounded-xl hover:bg-gray-100
              transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(cfg.needsReason ? reason : undefined)}
            disabled={processing || !reasonReady || !confirmReady}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm
              font-bold transition-colors disabled:opacity-50 shadow-sm
              ${cfg.confirmClass}`}
          >
            {processing
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent
                  rounded-full animate-spin" />
              : null}
            {processing ? 'Processing...' : cfg.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NAMED EXPORT: AdminProjectsContent ────────────────────────────────────────

export interface AdminProjectsContentProps {
  initialFilterStatus?: string;
  pageTitle?:           string;
}

export function AdminProjectsContent({
  initialFilterStatus = 'all',
  pageTitle           = 'All Projects',
}: AdminProjectsContentProps): React.ReactElement {

  const [projects,      setProjects]      = useState<ProjectRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [filterStatus,  setFilterStatus]  = useState(initialFilterStatus);
  const [filterNature,  setFilterNature]  = useState('all');
  const [searchTerm,    setSearchTerm]    = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [modal,         setModal]         = useState<ModalState>(EMPTY_MODAL);
  const [processing,    setProcessing]    = useState(false);
  const [banner,        setBanner]        = useState<BannerState | null>(null);

  // Banner auto-dismiss
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  // Fetch all projects (client-side filtering)
  const fetchProjects = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch('/api/admin/projects?limit=200&page=1', {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.projects)) {
        setProjects(data.projects as ProjectRow[]);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Failed to load projects.' });
      }
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network error.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Client-side filter
  const filtered = projects.filter(p => {
    const term        = searchTerm.toLowerCase();
    const matchSearch =
      p.projectName.toLowerCase().includes(term) ||
      p.city.toLowerCase().includes(term) ||
      p.areaName.toLowerCase().includes(term) ||
      (p.developerProfile?.companyName ?? '').toLowerCase().includes(term);

    const isDeleted = p.isDeleted === true;
    const isTrash   = filterStatus === 'trash';

    const matchDeleted = isTrash ? isDeleted : !isDeleted;
    const matchStatus  = isTrash || filterStatus === 'all' || p.status === filterStatus;
    const matchNature  = filterNature === 'all' || p.projectNature === filterNature;

    return matchSearch && matchDeleted && matchStatus && matchNature;
  });

  // Stats
  const stats = {
    total:    projects.filter(p => !p.isDeleted).length,
    pending:  projects.filter(p => !p.isDeleted && p.status === 'pending').length,
    verified: projects.filter(p => !p.isDeleted && p.isVerified).length,
    trashed:  projects.filter(p => p.isDeleted).length,
  };

  // Open modal
  function openModal(
    projectId: string, projectName: string,
    action: ActionType, currentFeatured = false,
  ) {
    setModal({ open: true, projectId, projectName, action, currentFeatured });
  }

  // Execute campaign updates (Priority 8)
  async function handlePromotionConfirm(isFeatured: boolean, start: string | null, end: string | null) {
    if (!modal.projectId) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/projects/${modal.projectId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'promote',
          isFeatured,
          promotionStartDate: start,
          promotionEndDate: end,
        }),
      });

      const data: { success: boolean; message?: string } = await res.json();
      if (res.ok && data.success) {
        setBanner({ type: 'success', message: data.message ?? 'Sponsorship metrics successfully applied.' });
        setModal(EMPTY_MODAL);
        await fetchProjects(true);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Failed to apply campaign settings.' });
      }
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network error updating campaign.',
      });
    } finally {
      setProcessing(false);
    }
  }

  // Execute action
  async function handleConfirm(reason?: string) {
    if (!modal.action || !modal.projectId) return;
    setProcessing(true);

    try {
      let res: Response;

      if (modal.action === 'trash') {
        res = await fetch(`/api/projects/${modal.projectId}/trash`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'trash' }),
        });
      } else if (modal.action === 'restore') {
        res = await fetch(`/api/projects/${modal.projectId}/trash`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore' }),
        });
      } else if (modal.action === 'permanent_delete') {
        res = await fetch(`/api/projects/${modal.projectId}/permanent-delete`, {
          method: 'DELETE', credentials: 'include',
        });
      } else {
        // All moderation → PATCH /api/admin/projects/[id]
        // CRITICAL FIX: reject sends "rejectionReason" (Zod schema field name)
        // suspend sends "reason" (Zod schema field name)
        const body: Record<string, unknown> = { action: modal.action };

        if (modal.action === 'reject') {
          body.rejectionReason = reason;   // ← FIXED: was "reason", must be "rejectionReason"
        } else if (modal.action === 'suspend') {
          body.reason = reason;            // ← correct: Zod schema uses "reason" for suspend
        } else if (modal.action === 'feature') {
          body.isFeatured = !modal.currentFeatured;
        }

        res = await fetch(`/api/admin/projects/${modal.projectId}`, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data: { success: boolean; message?: string } = await res.json();

      if (res.ok && data.success) {
        setBanner({ type: 'success', message: data.message ?? 'Action completed.' });
        setModal(EMPTY_MODAL);
        if (modal.action === 'permanent_delete') {
          setProjects(prev => prev.filter(p => p._id !== modal.projectId));
        } else {
          await fetchProjects(true);
        }
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Action failed.' });
      }
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network error.',
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      {/* Confirm Modal */}
      <ConfirmModal
        modal={modal}
        project={projects.find(p => p._id === modal.projectId)}
        onClose={() => setModal(EMPTY_MODAL)}
        onConfirm={handleConfirm}
        processing={processing}
      />

      {/* Campaign & Promotion Modal (Priority 8) */}
      <PromoteModal
        open={modal.open && modal.action === 'promote'}
        project={projects.find(p => p._id === modal.projectId)}
        onClose={() => setModal(EMPTY_MODAL)}
        onConfirm={handlePromotionConfirm}
        processing={processing}
      />

      <div className="space-y-6 pb-10">

        {/* ── Floating Banner ──────────────────── */}
        {banner && (
          <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300]
            flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border
            backdrop-blur-sm max-w-sm w-full
            ${banner.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
              : banner.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-800'
              : 'bg-amber-50/95 border-amber-200 text-amber-800'}`}>
            <span className="text-sm font-semibold flex-1">{banner.message}</span>
            <button onClick={() => setBanner(null)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Header ──────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#004063] tracking-tight
              flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-[#029bba]" />
              {pageTitle}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" />
              {loading ? 'Loading projects...' : `${filtered.length} of ${projects.length} projects`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
                rounded-xl border transition-all ${showFilters
                  ? 'bg-[#004063] text-white border-[#004063]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#029bba] hover:text-[#029bba]'}`}>
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => fetchProjects(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
                bg-[#029bba] text-white rounded-xl hover:bg-[#027a94]
                transition-colors disabled:opacity-60 shadow-sm shadow-[#029bba]/20">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stats Bar ───────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active',   value: stats.total,    icon: <FolderOpen className="w-5 h-5" />, color: 'text-[#029bba]', bg: 'bg-[#029bba]/10' },
            { label: 'Pending',  value: stats.pending,  icon: <Clock className="w-5 h-5" />,      color: 'text-amber-600',  bg: 'bg-amber-50' },
            { label: 'Verified', value: stats.verified, icon: <BadgeCheck className="w-5 h-5" />, color: 'text-emerald-600',bg: 'bg-emerald-50' },
            { label: 'Trashed',  value: stats.trashed,  icon: <Trash2 className="w-5 h-5" />,     color: 'text-red-500',    bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4
                flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                flex-shrink-0 ${s.bg} ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Status Tabs ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5
          flex gap-1 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm
                font-semibold transition-all
                ${filterStatus === tab.key
                  ? 'bg-[#029bba] text-white shadow-md shadow-[#029bba]/20'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
              {tab.key !== 'trash' && tab.key !== 'all' && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold
                  ${filterStatus === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500'}`}>
                  {projects.filter(p =>
                    !p.isDeleted && (tab.key === 'all' || p.status === tab.key)
                  ).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Filters Panel ───────────────────── */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Search */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-2
                  uppercase tracking-wide">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2
                    w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Project name, city, area, developer..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-200
                      rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                      focus:border-[#029bba] transition-all"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                        text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Nature filter */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2
                  uppercase tracking-wide">Project Type</label>
                <select value={filterNature}
                  onChange={e => setFilterNature(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200
                    rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                    focus:border-[#029bba] bg-white transition-all">
                  <option value="all">All Types</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed Use</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Table ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Loading */}
          {loading && (
            <div className="p-16 text-center">
              <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent
                rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading projects...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center
                justify-center mx-auto mb-4 border border-gray-100">
                <FolderOpen className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-700 font-bold text-lg">
                {filterStatus === 'trash' ? 'Trash is empty' : 'No projects found'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm
                  ? 'Try a different search term'
                  : 'No projects match the selected filters'}
              </p>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}
                  className="mt-4 px-4 py-2 text-sm font-semibold text-[#029bba]
                    bg-[#029bba]/5 rounded-xl hover:bg-[#029bba]/10 transition-colors">
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Project', 'Category', 'Status', 'Developer', 'Actions'].map((h, i) => (
                      <th key={h}
                        className={`px-5 py-3.5 text-xs font-bold text-gray-500
                          uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(project => {
                    const isDeleted = project.isDeleted === true;
                    const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
                    // FIXED: use developerBadge field (not badge)
                    const badgeKey  = project.developerBadge ?? 'new_entrant';
                    const badgeCfg  = BADGE_CONFIG[badgeKey];

                    return (
                      <tr key={project._id}
                        className={`hover:bg-gray-50/80 transition-colors group
                          ${isDeleted ? 'opacity-60' : ''}`}>

                        {/* Project */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl overflow-hidden
                              flex-shrink-0 bg-gradient-to-br from-[#029bba]/10
                              to-[#004063]/10 border border-gray-100">
                              {project.primaryImage ? (
                                <img src={project.primaryImage}
                                  alt={project.projectName}
                                  className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-[#029bba]" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-gray-900 text-sm truncate
                                  max-w-[180px] group-hover:text-[#029bba] transition-colors"
                                  title={project.projectName}>
                                  {project.projectName}
                                </p>
                                {project.isFeatured && (
                                  <Star className="w-3.5 h-3.5 text-amber-400
                                    flex-shrink-0 fill-current" />
                                )}
                                {project.isVerified && (
                                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-500
                                    flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-500 truncate max-w-[160px]">
                                  {project.city}, {project.areaName}
                                </p>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {timeAgo(project.createdAt)}
                                {isDeleted && (
                                  <span className="ml-2 text-red-500 font-semibold">
                                    · Trashed
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {CATEGORY_LABELS[project.projectCategory] ?? project.projectCategory}
                          </p>
                          <p className="text-xs text-gray-500 capitalize mt-0.5">
                            {project.projectNature}
                          </p>
                          {project.totalUnits != null && (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {project.totalUnits} units
                            </p>
                          )}
                        </td>

                        {/* Status + badge */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                            rounded-full text-[11px] font-bold ring-1
                            ${statusCfg.bg} ${statusCfg.text} ${statusCfg.ring}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                          {badgeCfg && (
                            <p className={`text-[11px] font-semibold mt-1.5 ${badgeCfg.color}`}>
                              {badgeCfg.emoji} {badgeCfg.label}
                            </p>
                          )}
                          {project.rejectionReason && (
                            <p className="text-[11px] text-red-500 mt-1 italic truncate
                              max-w-[140px]" title={project.rejectionReason}>
                              {project.rejectionReason}
                            </p>
                          )}
                        </td>

                        {/* Developer */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {project.developerProfile?.logo ? (
                              <img src={project.developerProfile.logo}
                                alt="logo"
                                className="w-7 h-7 rounded-lg object-cover
                                  border border-gray-100 flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-[#029bba]/10
                                flex items-center justify-center flex-shrink-0
                                border border-[#029bba]/20">
                                <Building2 className="w-3.5 h-3.5 text-[#029bba]" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900
                                truncate max-w-[110px]">
                                {project.developerProfile?.companyName ?? 'Unknown'}
                              </p>
                              {project.developer && (
                                <Link
                                  href={`/admin/developers/${project.developer}`}
                                  className="text-[11px] text-[#029bba] hover:underline">
                                  View profile →
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">

                            {/* View live */}
                            {project.slug && !isDeleted && (
                              <Link href={`/projects/${project.slug}`} target="_blank"
                                className="p-2 text-gray-400 hover:text-[#029bba]
                                  hover:bg-[#029bba]/5 rounded-xl transition-colors"
                                title="View Live">
                                <Eye className="w-4 h-4" />
                              </Link>
                            )}

                            {!isDeleted ? (
                              <>
                                {project.status === 'pending' && (
                                  <button
                                    onClick={() => openModal(project._id, project.projectName, 'verify')}
                                    className="p-2 text-gray-400 hover:text-emerald-600
                                      hover:bg-emerald-50 rounded-xl transition-colors"
                                    title="Verify">
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                {(project.status === 'pending' ||
                                  project.status === 'verified') && (
                                  <button
                                    onClick={() => openModal(project._id, project.projectName, 'reject')}
                                    className="p-2 text-gray-400 hover:text-red-600
                                      hover:bg-red-50 rounded-xl transition-colors"
                                    title="Reject">
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
                                {project.status === 'rejected' && (
                                  <button
                                    onClick={() => openModal(project._id, project.projectName, 'reopen')}
                                    className="p-2 text-gray-400 hover:text-blue-600
                                      hover:bg-blue-50 rounded-xl transition-colors"
                                    title="Reopen">
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                                {project.status === 'verified' && (
                                  <button
                                    onClick={() => openModal(project._id, project.projectName, 'suspend')}
                                    className="p-2 text-gray-400 hover:text-orange-600
                                      hover:bg-orange-50 rounded-xl transition-colors"
                                    title="Suspend">
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openModal(
                                    project._id, project.projectName,
                                    'promote', project.isFeatured,
                                  )}
                                  className={`p-2 rounded-xl transition-colors
                                    ${project.isFeatured
                                      ? 'text-amber-500 hover:bg-amber-50'
                                      : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                  title={project.isFeatured ? 'Manage Sponsorship' : 'Promote/Sponsor'}>
                                  <Star className={`w-4 h-4 ${project.isFeatured ? 'fill-current' : ''}`} />
                                </button>
                                <button
                                  onClick={() => openModal(project._id, project.projectName, 'trash')}
                                  className="p-2 text-gray-400 hover:text-red-600
                                    hover:bg-red-50 rounded-xl transition-colors"
                                  title="Trash">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => openModal(project._id, project.projectName, 'restore')}
                                  className="p-2 text-gray-400 hover:text-emerald-600
                                    hover:bg-emerald-50 rounded-xl transition-colors"
                                  title="Restore">
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openModal(project._id, project.projectName, 'permanent_delete')}
                                  className="p-2 text-gray-400 hover:text-red-700
                                    hover:bg-red-50 rounded-xl transition-colors"
                                  title="Delete Permanently">
                                  <Trash className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table footer */}
              <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50
                flex items-center justify-between text-xs text-gray-500">
                <span>
                  Showing{' '}
                  <span className="font-bold text-gray-700">{filtered.length}</span>{' '}
                  of{' '}
                  <span className="font-bold text-gray-700">{projects.length}</span>{' '}
                  projects
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    <span className="font-semibold text-gray-700">
                      {projects.filter(p => p.isFeatured && !p.isDeleted).length}
                    </span>{' '}Featured
                  </span>
                  <span className="flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3 text-emerald-500" />
                    <span className="font-semibold text-gray-700">
                      {projects.filter(p => p.isVerified && !p.isDeleted).length}
                    </span>{' '}Verified
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-500" />
                    <span className="font-semibold text-gray-700">
                      {projects.filter(p =>
                        !p.isDeleted &&
                        ['trusted', 'premium'].includes(p.developerBadge ?? '')
                      ).length}
                    </span>{' '}Premium
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── DEFAULT EXPORT: AdminProjectsPage ─────────────────────────────────────────

export default function AdminProjectsPage(): React.ReactElement {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || (session.user as { role?: string })?.role !== 'admin') {
      void router.replace('/login?redirect=/admin/projects');
    }
  }, [session, authStatus, router]);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent
            rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user as { role?: string })?.role !== 'admin') return <div />;

  return (
    <>
      <Head>
        <title>Manage Projects | Admin — Highrise.pk</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <AdminLayout>
        <AdminProjectsContent
          initialFilterStatus="all"
          pageTitle="All Projects"
        />
      </AdminLayout>
    </>
  );
}
// ========== END OF FILE ==========