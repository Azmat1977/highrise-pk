// pages/admin/projects/[id].tsx
// ═══════════════════════════════════════════════════════════════
// ADMIN PROJECT DETAIL — Highrise.pk
// Full project detail + moderation actions + risk alert management
// ═══════════════════════════════════════════════════════════════
// ✅ useSession() guard — admin only
// ✅ GET /api/admin/projects/[projectId] — full detail
// ✅ PATCH /api/admin/projects/[projectId] — all actions
// ✅ All 8 moderation actions
// ✅ Risk alert add/update/remove
// ✅ Unit live inventory counts
// ✅ Developer profile card
// ✅ 2-step confirmation on destructive actions
// ✅ Body scroll lock on modals
// ✅ Lucide React only — no raw SVGs
// ✅ noindex/nofollow
// ✅ TypeScript strict — no any
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Building2,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Ban,
  RotateCcw,
  AlertTriangle,
  Shield,
  BadgeCheck,
  Eye,
  RefreshCw,
  X,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Home,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ============================================
// TYPES
// ============================================

interface DeveloperProfileSnap {
  companyName?:        string;
  ceoName?:            string;
  logo?:               string;
  email?:              string;
  establishedYear?:    number;
  verificationLevel?:  string;
  completedProjectsCount?: number;
  status?:             string;
  socialLinks?:        { website?: string };
}

interface UnitLiveCounts {
  available?: number;
  reserved?:  number;
  sold?:      number;
  on_hold?:   number;
  cancelled?: number;
}

interface RiskAlert {
  _id:           string;
  title:         string;
  description:   string;
  severity:      'low' | 'medium' | 'high' | 'critical';
  category:      'legal' | 'financial' | 'construction' | 'fraud' | 'noc' | 'general';
  issuedBy:      string;
  issuedAt:      string;
  status:        'active' | 'resolved' | 'investigating';
  sourceUrl?:    string | null;
  affectedUnits?: string[];
  resolvedAt?:   string | null;
}

interface ProjectImage {
  url:       string;
  public_id: string;
  type?:     string;
  isPrimary?: boolean;
}

interface ProjectDetail {
  _id:              string;
  slug?:            string;
  projectName:      string;
  city:             string;
  areaName?:        string;
  area?:            string;
  projectCategory:  string;
  projectNature:    string;
  status:           'draft' | 'pending' | 'verified' | 'rejected';
  isVerified:       boolean;
  isFeatured:       boolean;
  isDeleted:        boolean;
  developerBadge?:  string;
  badgeLabel?:      string;
  badgeEmoji?:      string;
  primaryImage?:    string | null;
  featureImageUrl?: string;
  images?:          ProjectImage[];
  minPrice?:        number;
  maxPrice?:        number;
  priceFormatted?:  { min: string | null; max: string | null };
  totalUnits?:      number;
  unitsSold?:       number;
  unitsAvailable?:  number;
  description?:     string;
  tagline?:         string;
  projectStatus?:   string;
  developmentProgress?: number;
  launchDate?:      string;
  expectedCompletionDate?: string;
  possessionStartDate?:    string;
  approvalAuthority?: string;
  isApproved?:      string;
  nocStatus?:       string;
  nocNumber?:       string;
  rejectionReason?: string | null;
  verifiedAt?:      string | null;
  createdAt:        string;
  updatedAt?:       string;
  developer?:       string;
  developerProfile?: DeveloperProfileSnap | null;
  unitLiveCounts?:  UnitLiveCounts;
  riskAlerts?:      RiskAlert[];
  highriseScore?:   number;
  riskLevel?:       string;
}

interface BannerState {
  type:    'success' | 'error' | 'warning';
  message: string;
}

type ModerationAction =
  | 'verify' | 'reject' | 'feature' | 'suspend'
  | 'restore' | 'reopen' | 'trash';

type AlertFormMode = 'add' | 'edit';

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<string, {
  label: string; bg: string; text: string;
  dot: string; border: string;
}> = {
  draft:    { label: 'Draft',    bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400',    border: 'border-gray-200' },
  pending:  { label: 'Pending',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   border: 'border-amber-200' },
  verified: { label: 'Verified', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', border: 'border-emerald-200' },
  rejected: { label: 'Rejected', bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400',     border: 'border-red-200' },
};

const BADGE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  new_entrant: { label: 'New Entrant',       emoji: '🆕', color: 'text-gray-500'   },
  emerging:    { label: 'Emerging Dev',      emoji: '⭐', color: 'text-blue-600'   },
  trusted:     { label: 'Trusted Builder',   emoji: '🏆', color: 'text-[#029bba]' },
  premium:     { label: 'Premium Developer', emoji: '💎', color: 'text-violet-600' },
};

const SEVERITY_CONFIG: Record<string, {
  label: string; bg: string; text: string; border: string;
}> = {
  low:      { label: 'Low',      bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  medium:   { label: 'Medium',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  high:     { label: 'High',     bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  critical: { label: 'Critical', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
};

const ALERT_STATUS_CONFIG: Record<string, {
  label: string; bg: string; text: string;
}> = {
  active:        { label: 'Active',        bg: 'bg-red-100',    text: 'text-red-700'    },
  investigating: { label: 'Investigating', bg: 'bg-amber-100',  text: 'text-amber-700'  },
  resolved:      { label: 'Resolved',     bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const CATEGORY_LABELS: Record<string, string> = {
  highrise:         'High-Rise Building',
  society:          'Housing Society',
  mixed_use:        'Mixed Use',
  commercial_plaza: 'Commercial Plaza',
  townhouse:        'Townhouse Complex',
  gated_community:  'Gated Community',
};

// ============================================
// HELPERS
// ============================================

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-PK', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return formatDate(iso);
}

function toStr(v: unknown): string {
  if (!v) return '';
  return Array.isArray(v) ? String(v[0]) : String(v);
}

// ============================================
// MODERATION ACTION CONFIG
// ============================================

function getActionConfig(action: ModerationAction | null): {
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
        subtitle: 'Project will be publicly visible to all buyers',
        confirmText: 'Yes, Verify',
        confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
    case 'reject':
      return {
        title: 'Reject Project',
        subtitle: 'Developer will be notified with the reason',
        confirmText: 'Yes, Reject',
        confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
        icon: <XCircle className="w-5 h-5 text-red-600" />,
        needsReason: true, reasonLabel: 'Rejection Reason', reasonMin: 10,
      };
    case 'feature':
      return {
        title: 'Toggle Featured Status',
        subtitle: 'Update featured status on the homepage',
        confirmText: 'Yes, Update',
        confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',
        icon: <Star className="w-5 h-5 text-amber-500" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
    case 'suspend':
      return {
        title: 'Suspend Project',
        subtitle: 'Project will be hidden from public view immediately',
        confirmText: 'Yes, Suspend',
        confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
        icon: <Ban className="w-5 h-5 text-red-600" />,
        needsReason: true, reasonLabel: 'Suspension Reason', reasonMin: 10,
      };
    case 'reopen':
      return {
        title: 'Reopen for Review',
        subtitle: 'Project returns to pending status for re-review',
        confirmText: 'Yes, Reopen',
        confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
        icon: <RotateCcw className="w-5 h-5 text-blue-600" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
    case 'restore':
      return {
        title: 'Restore from Trash',
        subtitle: 'Project will be restored to draft status',
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
    default:
      return {
        title: 'Confirm Action',
        subtitle: '',
        confirmText: 'Confirm',
        confirmClass: 'bg-gray-700 text-white',
        icon: <CheckCircle className="w-5 h-5" />,
        needsReason: false, reasonLabel: '', reasonMin: 0,
      };
  }
}

// ============================================
// MODERATION CONFIRM MODAL
// ============================================

interface ModerationModalProps {
  action:      ModerationAction | null;
  isFeatured:  boolean;
  processing:  boolean;
  onClose:     () => void;
  onConfirm:   (reason?: string) => void;
}

function ModerationModal({
  action,
  isFeatured,
  processing,
  onClose,
  onConfirm,
}: ModerationModalProps): React.ReactElement | null {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (action) setReason('');
  }, [action]);

  useEffect(() => {
    document.body.style.overflow = action ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [action]);

  useEffect(() => {
    if (!action) return;
    const handle = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !processing) onClose();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [action, processing, onClose]);

  if (!action) return null;

  const cfg = getActionConfig(action);
  const reasonReady = cfg.needsReason
    ? reason.trim().length >= cfg.reasonMin
    : true;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={processing ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              {cfg.icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{cfg.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{cfg.subtitle}</p>
            </div>
          </div>
          {!processing && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {action === 'feature' && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800">
                This project will be{' '}
                <strong>{isFeatured ? 'removed from' : 'added to'}</strong>{' '}
                the featured listings on the homepage.
              </p>
            </div>
          )}

          {cfg.needsReason && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {cfg.reasonLabel}{' '}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={`Enter ${cfg.reasonLabel.toLowerCase()}...`}
                maxLength={1000}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] resize-none transition-all"
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className={`text-xs ${reasonReady ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {reasonReady
                    ? '✓ Sufficient detail'
                    : `${cfg.reasonMin - reason.trim().length} more characters needed`}
                </p>
                <p className="text-xs text-gray-400">{reason.length}/1000</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(cfg.needsReason ? reason : undefined)}
            disabled={processing || !reasonReady}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm ${cfg.confirmClass}`}
          >
            {processing ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {processing ? 'Processing...' : cfg.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// RISK ALERT MODAL
// ============================================

interface AlertFormState {
  title:         string;
  description:   string;
  severity:      'low' | 'medium' | 'high' | 'critical';
  category:      'legal' | 'financial' | 'construction' | 'fraud' | 'noc' | 'general';
  issuedBy:      string;
  sourceUrl:     string;
  affectedUnits: string;
  alertStatus:   'active' | 'resolved' | 'investigating';
}

const EMPTY_ALERT_FORM: AlertFormState = {
  title:         '',
  description:   '',
  severity:      'medium',
  category:      'general',
  issuedBy:      'Highrise Team',
  sourceUrl:     '',
  affectedUnits: '',
  alertStatus:   'active',
};

interface RiskAlertModalProps {
  mode:       AlertFormMode;
  alert?:     RiskAlert | null;
  processing: boolean;
  onClose:    () => void;
  onSubmit:   (form: AlertFormState) => void;
}

function RiskAlertModal({
  mode,
  alert,
  processing,
  onClose,
  onSubmit,
}: RiskAlertModalProps): React.ReactElement {
  const [form, setForm] = useState<AlertFormState>(() => {
    if (mode === 'edit' && alert) {
      return {
        title:         alert.title,
        description:   alert.description,
        severity:      alert.severity,
        category:      alert.category,
        issuedBy:      alert.issuedBy,
        sourceUrl:     alert.sourceUrl ?? '',
        affectedUnits: (alert.affectedUnits ?? []).join(', '),
        alertStatus:   alert.status,
      };
    }
    return { ...EMPTY_ALERT_FORM };
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handle = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !processing) onClose();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [processing, onClose]);

  const handleField = (
    field: keyof AlertFormState,
    value: string
  ): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = form.title.trim().length >= 5 &&
    form.description.trim().length >= 10 &&
    form.issuedBy.trim().length >= 2;

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20';
  const labelCls = 'block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={processing ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-bold text-gray-900">
              {mode === 'add' ? 'Add Risk Alert' : 'Edit Risk Alert'}
            </h3>
          </div>
          {!processing && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className={labelCls}>
              Alert Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleField('title', e.target.value)}
              className={inputCls}
              placeholder="e.g. Court Stay Order on Property Transfers"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleField('description', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Detailed explanation of the risk..."
              maxLength={2000}
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.description.length}/2000
            </p>
          </div>

          {/* Severity + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Severity <span className="text-red-500">*</span>
              </label>
              <select
                value={form.severity}
                onChange={(e) => handleField('severity', e.target.value)}
                className={inputCls}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => handleField('category', e.target.value)}
                className={inputCls}
              >
                <option value="legal">Legal</option>
                <option value="financial">Financial</option>
                <option value="construction">Construction</option>
                <option value="fraud">Fraud</option>
                <option value="noc">NOC</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          {/* Issued By */}
          <div>
            <label className={labelCls}>
              Issued By <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.issuedBy}
              onChange={(e) => handleField('issuedBy', e.target.value)}
              className={inputCls}
              placeholder="e.g. LDA, Court Order, Highrise Team"
              maxLength={150}
            />
          </div>

          {/* Status (edit only) */}
          {mode === 'edit' && (
            <div>
              <label className={labelCls}>Alert Status</label>
              <select
                value={form.alertStatus}
                onChange={(e) => handleField('alertStatus', e.target.value)}
                className={inputCls}
              >
                <option value="active">Active</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          )}

          {/* Source URL */}
          <div>
            <label className={labelCls}>Source URL (Optional)</label>
            <input
              type="url"
              value={form.sourceUrl}
              onChange={(e) => handleField('sourceUrl', e.target.value)}
              className={inputCls}
              placeholder="https://... (court order, news article)"
            />
          </div>

          {/* Affected Units */}
          <div>
            <label className={labelCls}>Affected Units (Optional)</label>
            <input
              type="text"
              value={form.affectedUnits}
              onChange={(e) => handleField('affectedUnits', e.target.value)}
              className={inputCls}
              placeholder="e.g. A-301, Floor 5, Block B (comma-separated)"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave empty if all units are affected
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={processing || !isValid}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'add' ? (
              <Plus className="w-4 h-4" />
            ) : (
              <Edit3 className="w-4 h-4" />
            )}
            {processing
              ? 'Saving...'
              : mode === 'add'
              ? 'Add Alert'
              : 'Update Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STAT PILL — unit inventory
// ============================================

function UnitPill({
  label,
  count,
  color,
}: {
  label:  string;
  count:  number;
  color:  string;
}): React.ReactElement {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${color}`}>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xl font-black">{count}</span>
    </div>
  );
}

// ============================================
// INFO ROW
// ============================================

function InfoRow({
  label,
  value,
  icon,
}: {
  label:  string;
  value:  React.ReactNode;
  icon?:  React.ReactElement;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      {icon && (
        <div className="w-4 h-4 text-gray-400 mt-0.5 shrink-0">{icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {label}
        </p>
        <div className="text-sm font-medium text-gray-900 mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function AdminProjectDetailPage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const projectId = toStr(router.query.id);

  // ── State ────────────────────────────────────────────────────
  const [project, setProject]   = useState<ProjectDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [banner, setBanner]     = useState<BannerState | null>(null);
  const [processing, setProcessing] = useState(false);

  // Moderation modal
  const [modalAction, setModalAction] = useState<ModerationAction | null>(null);

  // Risk alert modal
  const [alertModalMode, setAlertModalMode] = useState<AlertFormMode>('add');
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [editingAlert,   setEditingAlert]   = useState<RiskAlert | null>(null);
  const [alertProcessing, setAlertProcessing] = useState(false);

  // Delete alert confirm
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);
  const [deleteAlertProcessing, setDeleteAlertProcessing] = useState(false);

  // Expandable sections
  const [showDescription, setShowDescription] = useState(false);
  const [showGallery,     setShowGallery]     = useState(false);

  // Banner auto-dismiss
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  // ── Admin auth guard ──────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'loading') return;
    const role = (session?.user as { role?: string })?.role;
    if (!session || role !== 'admin') {
      void router.replace('/login?redirect=/admin/projects');
    }
  }, [session, authStatus, router]);

  // ── Fetch project ─────────────────────────────────────────────
  const fetchProject = useCallback(async (quiet = false): Promise<void> => {
    if (!projectId) return;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res  = await fetch(`/api/admin/projects/${projectId}`, {
        credentials: 'include',
      });
      const data = await res.json() as {
        success: boolean;
        message?: string;
        project?: ProjectDetail;
      };

      if (!res.ok || !data.success || !data.project) {
        if (res.status === 404) {
          setError('Project not found.');
        } else {
          setError(data.message ?? 'Failed to load project.');
        }
        return;
      }
      setProject(data.project);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) void fetchProject();
  }, [projectId, fetchProject]);

  // ── Moderation action ─────────────────────────────────────────
  const handleModerationConfirm = useCallback(async (
    reason?: string
  ): Promise<void> => {
    if (!modalAction || !project || processing) return;

    setProcessing(true);
    try {
      let body: Record<string, unknown>;

      if (modalAction === 'trash') {
        const res = await fetch(`/api/projects/${project._id}/trash`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'trash' }),
        });
        const data = await res.json() as { success: boolean; message?: string };
        if (res.ok && data.success) {
          setBanner({ type: 'success', message: 'Project moved to trash.' });
          void fetchProject(true);
        } else {
          setBanner({ type: 'error', message: data.message ?? 'Action failed.' });
        }
        setModalAction(null);
        return;
      }

      if (modalAction === 'restore') {
        const res = await fetch(`/api/projects/${project._id}/trash`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore' }),
        });
        const data = await res.json() as { success: boolean; message?: string };
        if (res.ok && data.success) {
          setBanner({ type: 'success', message: 'Project restored from trash.' });
          void fetchProject(true);
        } else {
          setBanner({ type: 'error', message: data.message ?? 'Action failed.' });
        }
        setModalAction(null);
        return;
      }

      // All admin moderation → PATCH /api/admin/projects/[id]
      body = { action: modalAction };
      if (modalAction === 'reject')  body.rejectionReason = reason;
      if (modalAction === 'suspend') body.reason = reason;
      if (modalAction === 'feature') body.isFeatured = !project.isFeatured;

      const res  = await fetch(`/api/admin/projects/${project._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success: boolean; message?: string };

      if (res.ok && data.success) {
        setBanner({ type: 'success', message: data.message ?? 'Action completed.' });
        void fetchProject(true);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Action failed.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessing(false);
      setModalAction(null);
    }
  }, [modalAction, project, processing, fetchProject]);

  // ── Risk alert submit ─────────────────────────────────────────
  const handleAlertSubmit = useCallback(async (
    form: AlertFormState
  ): Promise<void> => {
    if (!project || alertProcessing) return;
    setAlertProcessing(true);

    try {
      const affectedUnitsArr = form.affectedUnits.trim()
        ? form.affectedUnits.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const body: Record<string, unknown> =
        alertModalMode === 'add'
          ? {
              action:        'add-alert',
              title:         form.title.trim(),
              description:   form.description.trim(),
              severity:      form.severity,
              category:      form.category,
              issuedBy:      form.issuedBy.trim(),
              sourceUrl:     form.sourceUrl.trim() || undefined,
              affectedUnits: affectedUnitsArr,
            }
          : {
              action:        'update-alert',
              alertId:       editingAlert!._id,
              title:         form.title.trim(),
              description:   form.description.trim(),
              severity:      form.severity,
              category:      form.category,
              issuedBy:      form.issuedBy.trim(),
              status:        form.alertStatus,
              sourceUrl:     form.sourceUrl.trim() || undefined,
              affectedUnits: affectedUnitsArr,
            };

      const res  = await fetch(`/api/admin/projects/${project._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success: boolean; message?: string };

      if (res.ok && data.success) {
        setBanner({
          type: 'success',
          message: alertModalMode === 'add'
            ? 'Risk alert added successfully.'
            : 'Risk alert updated successfully.',
        });
        setAlertModalOpen(false);
        setEditingAlert(null);
        void fetchProject(true);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Failed to save alert.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setAlertProcessing(false);
    }
  }, [project, alertModalMode, editingAlert, alertProcessing, fetchProject]);

  // ── Delete alert ──────────────────────────────────────────────
  const handleDeleteAlert = useCallback(async (
    alertId: string
  ): Promise<void> => {
    if (!project || deleteAlertProcessing) return;
    setDeleteAlertProcessing(true);

    try {
      const res  = await fetch(`/api/admin/projects/${project._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove-alert', alertId }),
      });
      const data = await res.json() as { success: boolean; message?: string };

      if (res.ok && data.success) {
        setBanner({ type: 'success', message: 'Risk alert removed.' });
        setDeleteAlertId(null);
        void fetchProject(true);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Failed to remove alert.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setDeleteAlertProcessing(false);
    }
  }, [project, deleteAlertProcessing, fetchProject]);

  // ── Auth loading ──────────────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
      </div>
    );
  }

  const role = (session?.user as { role?: string })?.role;
  if (!session || role !== 'admin') return <div />;

  // ── Project loading ───────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Head>
          <title>Project Detail | Admin — Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <AdminLayout>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading project details...</p>
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (error || !project) {
    return (
      <>
        <Head>
          <title>Project Not Found | Admin — Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <AdminLayout>
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <AlertTriangle className="w-12 h-12 text-red-400" />
            <h2 className="text-xl font-bold text-gray-900">
              {error ?? 'Project not found'}
            </h2>
            <Link
              href="/admin/projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </Link>
          </div>
        </AdminLayout>
      </>
    );
  }

  // ── Derived values ────────────────────────────────────────────
  const statusCfg    = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
  const badgeKey     = project.developerBadge ?? 'new_entrant';
  const badgeCfg     = BADGE_CONFIG[badgeKey];
  const unitCounts   = project.unitLiveCounts ?? {};
  const totalLive    = Object.values(unitCounts).reduce((sum, n) => sum + (n ?? 0), 0);
  const riskAlerts   = project.riskAlerts ?? [];
  const activeAlerts = riskAlerts.filter((a) => a.status === 'active');
  const canVerify    = project.status === 'pending' && !project.isDeleted;
  const canReject    = ['pending', 'verified'].includes(project.status) && !project.isDeleted;
  const canSuspend   = project.status === 'verified' && !project.isDeleted;
  const canReopen    = project.status === 'rejected' && !project.isDeleted;
  const canTrash     = !project.isDeleted;
  const canRestore   = project.isDeleted;
  const galleryImages = project.images?.filter((img) => img.url) ?? [];

  return (
    <>
      <Head>
        <title>
          {project.projectName} | Admin Project | Highrise.pk
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminLayout>
        <div className="space-y-6 pb-12">

          {/* ── Floating Banner ─────────────────────────────── */}
          {banner && (
            <div
              className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-sm max-w-sm w-full ${
                banner.type === 'success'
                  ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
                  : banner.type === 'error'
                  ? 'bg-red-50/95 border-red-200 text-red-800'
                  : 'bg-amber-50/95 border-amber-200 text-amber-800'
              }`}
              role="status"
              aria-live="polite"
            >
              <span className="text-sm font-semibold flex-1">
                {banner.message}
              </span>
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Modals ──────────────────────────────────────── */}
          <ModerationModal
            action={modalAction}
            isFeatured={project.isFeatured}
            processing={processing}
            onClose={() => setModalAction(null)}
            onConfirm={(reason) => void handleModerationConfirm(reason)}
          />

          {alertModalOpen && (
            <RiskAlertModal
              mode={alertModalMode}
              alert={editingAlert}
              processing={alertProcessing}
              onClose={() => {
                setAlertModalOpen(false);
                setEditingAlert(null);
              }}
              onSubmit={(form) => void handleAlertSubmit(form)}
            />
          )}

          {/* Delete alert confirm banner */}
          {deleteAlertId && (
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-sm font-bold text-amber-800">
                  Remove this risk alert permanently?
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDeleteAlertId(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteAlert(deleteAlertId)}
                  disabled={deleteAlertProcessing}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {deleteAlertProcessing ? 'Removing...' : 'Yes, Remove'}
                </button>
              </div>
            </div>
          )}

          {/* ── Breadcrumb ───────────────────────────────────── */}
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/admin/projects"
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#029bba] transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              All Projects
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-semibold truncate max-w-[200px]">
              {project.projectName}
            </span>
          </div>

          {/* ── Header Card ──────────────────────────────────── */}
          <div className={`rounded-2xl border-2 p-6 ${statusCfg.bg} ${statusCfg.border}`}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Feature image thumbnail */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-white/50 shadow-md shrink-0">
                  {project.primaryImage ?? project.featureImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.primaryImage ?? project.featureImageUrl ?? ''}
                      alt={project.projectName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#029bba]/10">
                      <Building2 className="w-7 h-7 text-[#029bba]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl font-black text-[#004063]">
                      {project.projectName}
                    </h1>
                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                    {project.isFeatured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
                        <Star className="w-3 h-3 fill-current" />
                        Featured
                      </span>
                    )}
                    {project.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <BadgeCheck className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                    {project.isDeleted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                        <Trash2 className="w-3 h-3" />
                        Trashed
                      </span>
                    )}
                    {activeAlerts.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                        <AlertTriangle className="w-3 h-3" />
                        {activeAlerts.length} Alert{activeAlerts.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-2">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {project.city}
                      {(project.areaName ?? project.area) && `, ${project.areaName ?? project.area}`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {CATEGORY_LABELS[project.projectCategory] ?? project.projectCategory}
                    </span>
                    {(project.priceFormatted?.min ?? project.minPrice) && (
                      <span className="flex items-center gap-1.5 text-[#029bba] font-semibold">
                        <DollarSign className="w-3.5 h-3.5" />
                        PKR {project.priceFormatted?.min ?? project.minPrice}
                        {project.priceFormatted?.max && ` – ${project.priceFormatted.max}`}
                      </span>
                    )}
                    {badgeCfg && (
                      <span className={`text-sm font-semibold ${badgeCfg.color}`}>
                        {badgeCfg.emoji} {badgeCfg.label}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Created {timeAgo(project.createdAt)}
                    {project.updatedAt && ` · Updated ${timeAgo(project.updatedAt)}`}
                  </p>
                </div>
              </div>

              {/* Header right — quick actions */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {project.slug && !project.isDeleted && (
                  <Link
                    href={`/projects/${project.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:border-[#029bba] hover:text-[#029bba] transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Live
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void fetchProject(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* ── Two-Column Layout ────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── LEFT COLUMN ─────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Project Details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#029bba]" />
                    Project Details
                  </h2>
                </div>
                <div className="px-6 py-2 divide-y divide-gray-50">
                  <InfoRow
                    label="Project Name"
                    value={project.projectName}
                    icon={<Building2 className="w-4 h-4" />}
                  />
                  <InfoRow
                    label="Location"
                    value={`${project.city}${project.areaName ?? project.area ? `, ${project.areaName ?? project.area}` : ''}`}
                    icon={<MapPin className="w-4 h-4" />}
                  />
                  <InfoRow
                    label="Category"
                    value={`${CATEGORY_LABELS[project.projectCategory] ?? project.projectCategory} · ${project.projectNature}`}
                    icon={<Home className="w-4 h-4" />}
                  />
                  {project.projectStatus && (
                    <InfoRow
                      label="Development Status"
                      value={project.projectStatus}
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                  )}
                  {project.developmentProgress !== undefined && (
                    <InfoRow
                      label="Development Progress"
                      value={
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-[#029bba] rounded-full"
                              style={{ width: `${project.developmentProgress}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-[#029bba] shrink-0">
                            {project.developmentProgress}%
                          </span>
                        </div>
                      }
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                  )}
                  {project.launchDate && (
                    <InfoRow
                      label="Launch Date"
                      value={formatDate(project.launchDate)}
                      icon={<Calendar className="w-4 h-4" />}
                    />
                  )}
                  {project.expectedCompletionDate && (
                    <InfoRow
                      label="Expected Completion"
                      value={formatDate(project.expectedCompletionDate)}
                      icon={<Calendar className="w-4 h-4" />}
                    />
                  )}
                  {project.possessionStartDate && (
                    <InfoRow
                      label="Possession Start"
                      value={formatDate(project.possessionStartDate)}
                      icon={<Calendar className="w-4 h-4" />}
                    />
                  )}
                  <InfoRow
                    label="Created"
                    value={formatDate(project.createdAt)}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                </div>
              </div>

              {/* Legal & Approvals */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#029bba]" />
                    Legal & Approvals
                  </h2>
                </div>
                <div className="px-6 py-2 divide-y divide-gray-50">
                  {project.approvalAuthority && (
                    <InfoRow
                      label="Approval Authority"
                      value={project.approvalAuthority}
                    />
                  )}
                  <InfoRow
                    label="Authority Approval"
                    value={
                      <span className={`capitalize font-semibold ${
                        project.isApproved === 'approved'
                          ? 'text-emerald-600'
                          : project.isApproved === 'rejected'
                          ? 'text-red-600'
                          : 'text-amber-600'
                      }`}>
                        {project.isApproved?.replace(/_/g, ' ') ?? '—'}
                      </span>
                    }
                  />
                  <InfoRow
                    label="NOC Status"
                    value={
                      <span className={`capitalize font-semibold ${
                        project.nocStatus === 'approved'
                          ? 'text-emerald-600'
                          : project.nocStatus === 'rejected'
                          ? 'text-red-600'
                          : 'text-amber-600'
                      }`}>
                        {project.nocStatus?.replace(/_/g, ' ') ?? '—'}
                      </span>
                    }
                  />
                  {project.nocNumber && (
                    <InfoRow label="NOC Number" value={project.nocNumber} />
                  )}
                  {project.rejectionReason && (
                    <InfoRow
                      label="Rejection Reason"
                      value={
                        <span className="text-red-700">
                          {project.rejectionReason}
                        </span>
                      }
                    />
                  )}
                  {project.verifiedAt && (
                    <InfoRow
                      label="Verified At"
                      value={formatDate(project.verifiedAt)}
                    />
                  )}
                </div>
              </div>

              {/* Unit Inventory Live Counts */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#029bba]" />
                    Unit Inventory
                    {totalLive > 0 && (
                      <span className="text-sm font-normal text-gray-400">
                        ({totalLive} total live)
                      </span>
                    )}
                  </h2>
                  <Link
                    href={`/admin/units?projectId=${project._id}`}
                    className="text-xs font-semibold text-[#029bba] hover:underline"
                  >
                    Manage Units →
                  </Link>
                </div>
                <div className="p-5">
                  {totalLive === 0 ? (
                    <div className="text-center py-6">
                      <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No units added yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <UnitPill
                        label="Available"
                        count={unitCounts.available ?? 0}
                        color="bg-emerald-50 text-emerald-700 border-emerald-200"
                      />
                      <UnitPill
                        label="Reserved"
                        count={unitCounts.reserved ?? 0}
                        color="bg-amber-50 text-amber-700 border-amber-200"
                      />
                      <UnitPill
                        label="Sold"
                        count={unitCounts.sold ?? 0}
                        color="bg-red-50 text-red-700 border-red-200"
                      />
                      <UnitPill
                        label="On Hold"
                        count={unitCounts.on_hold ?? 0}
                        color="bg-gray-50 text-gray-700 border-gray-200"
                      />
                      <UnitPill
                        label="Cancelled"
                        count={unitCounts.cancelled ?? 0}
                        color="bg-gray-50 text-gray-500 border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Alerts */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Risk Alerts
                    {activeAlerts.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                        {activeAlerts.length} active
                      </span>
                    )}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setAlertModalMode('add');
                      setEditingAlert(null);
                      setAlertModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Alert
                  </button>
                </div>

                <div className="p-5">
                  {riskAlerts.length === 0 ? (
                    <div className="text-center py-6">
                      <Shield className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No risk alerts</p>
                      <p className="text-xs text-gray-300 mt-1">
                        Add alerts to warn buyers about issues
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {riskAlerts.map((alert) => {
                        const sevCfg    = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.medium;
                        const alertStat = ALERT_STATUS_CONFIG[alert.status] ?? ALERT_STATUS_CONFIG.active;
                        return (
                          <div
                            key={alert._id}
                            className={`rounded-xl border p-4 ${sevCfg.bg} ${sevCfg.border}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className={`text-sm font-bold ${sevCfg.text}`}>
                                    {alert.title}
                                  </p>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sevCfg.bg} ${sevCfg.text} border ${sevCfg.border}`}>
                                    {sevCfg.label}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${alertStat.bg} ${alertStat.text}`}>
                                    {alertStat.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                  {alert.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-1.5">
                                  Issued by: <span className="font-semibold">{alert.issuedBy}</span>
                                  {' · '}{formatDate(alert.issuedAt)}
                                  {alert.category !== 'general' && ` · ${alert.category}`}
                                </p>
                                {alert.affectedUnits && alert.affectedUnits.length > 0 && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Affected: {alert.affectedUnits.join(', ')}
                                  </p>
                                )}
                                {alert.resolvedAt && (
                                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                                    ✓ Resolved {formatDate(alert.resolvedAt)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAlertModalMode('edit');
                                    setEditingAlert(alert);
                                    setAlertModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-white/60 text-gray-500 hover:text-[#029bba] transition-colors"
                                  aria-label="Edit alert"
                                  title="Edit alert"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteAlertId(alert._id)}
                                  className="p-1.5 rounded-lg hover:bg-white/60 text-gray-500 hover:text-red-600 transition-colors"
                                  aria-label="Remove alert"
                                  title="Remove alert"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Description (expandable) */}
              {project.description && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowDescription((v) => !v)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <h2 className="text-base font-bold text-gray-900">
                      Project Description
                    </h2>
                    {showDescription ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {showDescription && (
                    <div className="px-6 pb-5">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {project.description.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Gallery (expandable) */}
              {galleryImages.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowGallery((v) => !v)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#029bba]" />
                      Gallery ({galleryImages.length} images)
                    </h2>
                    {showGallery ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {showGallery && (
                    <div className="px-6 pb-5">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {galleryImages.slice(0, 12).map((img, idx) => (
                          <a
                            key={`${img.public_id}-${idx}`}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square rounded-xl overflow-hidden border border-gray-100 hover:border-[#029bba] transition-colors group"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={`Gallery image ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                      {galleryImages.length > 12 && (
                        <p className="text-xs text-gray-400 mt-3 text-center">
                          +{galleryImages.length - 12} more images
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN ────────────────────────────────── */}
            <div className="space-y-6">

              {/* Action Panel — sticky */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">
                    Moderation Actions
                  </h2>
                </div>
                <div className="p-5 space-y-2">
                  {canVerify && (
                    <button
                      type="button"
                      onClick={() => setModalAction('verify')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Verify Project
                    </button>
                  )}

                  {canReject && (
                    <button
                      type="button"
                      onClick={() => setModalAction('reject')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Project
                    </button>
                  )}

                  {canSuspend && (
                    <button
                      type="button"
                      onClick={() => setModalAction('suspend')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      Suspend Project
                    </button>
                  )}

                  {canReopen && (
                    <button
                      type="button"
                      onClick={() => setModalAction('reopen')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reopen for Review
                    </button>
                  )}

                  {/* Featured toggle */}
                  <button
                    type="button"
                    onClick={() => setModalAction('feature')}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                      project.isFeatured
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${project.isFeatured ? 'fill-current' : ''}`} />
                    {project.isFeatured ? 'Remove Featured' : 'Feature Project'}
                  </button>

                  <div className="pt-2 border-t border-gray-100" />

                  {canTrash && (
                    <button
                      type="button"
                      onClick={() => setModalAction('trash')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Move to Trash
                    </button>
                  )}

                  {canRestore && (
                    <button
                      type="button"
                      onClick={() => setModalAction('restore')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold transition-colors border border-emerald-200"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore from Trash
                    </button>
                  )}

                  {!canVerify && !canReject && !canSuspend && !canReopen && !canTrash && !canRestore && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      No moderation actions available
                    </p>
                  )}
                </div>
              </div>

              {/* Developer Profile Card */}
              {project.developerProfile && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-900">
                      Developer
                    </h2>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      {project.developerProfile.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.developerProfile.logo}
                          alt={project.developerProfile.companyName}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0 border border-[#029bba]/20">
                          <Building2 className="w-6 h-6 text-[#029bba]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">
                          {project.developerProfile.companyName ?? 'Unknown'}
                        </p>
                        {project.developerProfile.ceoName && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {project.developerProfile.ceoName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      {project.developerProfile.establishedYear && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Est. Year</span>
                          <span className="font-semibold text-gray-700">
                            {project.developerProfile.establishedYear}
                          </span>
                        </div>
                      )}
                      {project.developerProfile.completedProjectsCount !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Completed Projects</span>
                          <span className="font-semibold text-gray-700">
                            {project.developerProfile.completedProjectsCount}
                          </span>
                        </div>
                      )}
                      {project.developerProfile.verificationLevel && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Verification</span>
                          <span className="font-semibold text-emerald-600 capitalize">
                            {project.developerProfile.verificationLevel.replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}
                      {project.developerProfile.status && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status</span>
                          <span className={`font-semibold capitalize ${
                            project.developerProfile.status === 'approved'
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}>
                            {project.developerProfile.status}
                          </span>
                        </div>
                      )}
                    </div>

                    {project.developer && (
                      <Link
                        href={`/admin/developers/${project.developer}`}
                        className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#029bba]/5 hover:bg-[#029bba]/10 text-[#029bba] text-xs font-semibold transition-colors border border-[#029bba]/20"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Developer Profile
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Highrise Score */}
              {project.highriseScore !== undefined && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-900 mb-3">
                    Highrise Score
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          project.highriseScore >= 70
                            ? 'bg-emerald-500'
                            : project.highriseScore >= 40
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${project.highriseScore}%` }}
                      />
                    </div>
                    <span className="text-2xl font-black text-[#004063] shrink-0">
                      {project.highriseScore}
                    </span>
                  </div>
                  {project.riskLevel && (
                    <p className={`text-xs font-semibold mt-2 capitalize ${
                      project.riskLevel === 'low'
                        ? 'text-emerald-600'
                        : project.riskLevel === 'medium'
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>
                      Risk Level: {project.riskLevel}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}