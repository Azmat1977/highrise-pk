// pages/admin/developers/[id].tsx
// Highrise.pk — Admin Developer Detail & Review Page V6.4.5+
// ═══════════════════════════════════════════════════════════════
// ✅ V6.4.5+: info_required status + modal
// ✅ V6.4.5+: CNIC verification panel
// ✅ V6.4.5+: Portfolio project verification panel
// ✅ V6.4.5+: Badge assignment panel
// ✅ V6.4.5+: Document cross-check panel (enhanced)
// ✅ All existing functionality preserved
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Shield,
  TrendingUp,
  Activity,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  ArrowLeft,
  ExternalLink,
  FileText,
  Award,
  Building2,
  User,
  Eye,
  EyeOff,
  Clock,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ─── Types ────────────────────────────────────────────────────

type DeveloperStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'info_required';

type RiskLevel = 'low' | 'medium' | 'high';

type VerificationLevel =
  | 'not_verified'
  | 'docs_pending'
  | 'docs_verified'
  | 'site_verified'
  | 'fully_verified';

type AuthorizedPersonVerificationLevel =
  | 'unverified'
  | 'documents_uploaded'
  | 'basic_verified'
  | 'fully_verified';

type DeveloperBadge =
  | 'startup'
  | 'emerging'
  | 'established'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'highrise_verified'
  | 'top_developer'
  | 'trusted_builder'
  | 'on_time_delivery'
  | 'premium_partner';

type AdminAssignableBadge =
  | 'highrise_verified'
  | 'top_developer'
  | 'trusted_builder'
  | 'on_time_delivery'
  | 'premium_partner';

interface CompletedProject {
  _id: string;
  projectName: string;
  projectType: string;
  city: string;
  area: string;
  completionYear: number;
  status: string;
  delayReason?: string;
  totalUnits?: number;
  totalArea?: string;
  description?: string;
  images: string[];
  videoUrl?: string;
  isVerified: boolean;
  verifiedAt?: string;
  verificationNotes?: string;
  rejectionReason?: string;
  addedAt?: string;
}

interface Developer {
  _id: string;
  companyName: string;
  developerType: string;
  companyType?: string;
  secpNumber?: string;
  ntnNumber?: string;
  strn?: string;
  establishedYear?: number;
  website?: string;
  description?: string;
  tagline?: string;
  ceoName?: string;
  officeAddress?: string;
  city?: string;
  phone?: string;
  email?: string;
  authorizedPersonName?: string;
  authorizedPersonCNIC?: string;
  authorizedPersonVerificationLevel?: AuthorizedPersonVerificationLevel;
  status: DeveloperStatus;
  isVerified: boolean;
  verifiedAt?: string;
  highriseScore?: number;
  onTimeDeliveryRate?: number;
  riskLevel?: RiskLevel;
  verificationLevel?: VerificationLevel;
  lastVerifiedAt?: string;
  adminNotes?: string;
  slug?: string;
  badges?: DeveloperBadge[];
  logo?: { url: string; public_id: string };
  socialLinks?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
  };
  legalDocs?: {
    secpCertificate?: { url: string };
    ntnCertificate?: { url: string };
    memorandum?: { url: string };
    authorizedPersonCnicFrontImage?: { url: string };
    authorizedPersonCnicBackImage?: { url: string };
    pastProjects?: { url: string }[];
  };
  portfolio?: {
    completedProjects?: CompletedProject[];
  };
  completedProjectsCount?: number;
  activeProjectsCount?: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: string;
    email?: string;
    name?: string;
    createdAt?: string;
  };
}

interface TrustValues {
  highriseScore: number;
  onTimeDeliveryRate: number;
  riskLevel: RiskLevel;
  verificationLevel: VerificationLevel;
  adminNotes: string;
}

// ─── Constants ────────────────────────────────────────────────

const ADMIN_ASSIGNABLE_BADGES: AdminAssignableBadge[] = [
  'highrise_verified',
  'top_developer',
  'trusted_builder',
  'on_time_delivery',
  'premium_partner',
];

const BADGE_LABELS: Record<AdminAssignableBadge, string> = {
  highrise_verified: '🛡️ Highrise Verified',
  top_developer:     '📈 Top Developer',
  trusted_builder:   '✅ Trusted Builder',
  on_time_delivery:  '⏱️ On-Time Delivery',
  premium_partner:   '👑 Premium Partner',
};

const TIER_BADGE_LABELS: Record<string, string> = {
  startup:     '🎯 Startup',
  emerging:    '📈 Emerging',
  established: '🏢 Established',
  silver:      '🥈 Silver',
  gold:        '🥇 Gold',
  platinum:    '💎 Platinum',
  diamond:     '⭐ Diamond',
};

// ─── Sub-components ───────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: DeveloperStatus;
}): React.ReactElement {
  const config: Record<
    DeveloperStatus,
    { bg: string; text: string; dot: string; label: string }
  > = {
    draft: {
      bg: 'bg-gray-100', text: 'text-gray-700',
      dot: 'bg-gray-400', label: 'Draft',
    },
    pending: {
      bg: 'bg-amber-100', text: 'text-amber-800',
      dot: 'bg-amber-500', label: 'Pending',
    },
    approved: {
      bg: 'bg-[#f0fdf4]', text: 'text-[#10b981]',
      dot: 'bg-[#10b981]', label: 'Approved',
    },
    rejected: {
      bg: 'bg-red-100', text: 'text-red-700',
      dot: 'bg-red-500', label: 'Rejected',
    },
    suspended: {
      bg: 'bg-orange-100', text: 'text-orange-700',
      dot: 'bg-orange-500', label: 'Suspended',
    },
    // V6.4.5+
    info_required: {
      bg: 'bg-blue-100', text: 'text-blue-700',
      dot: 'bg-blue-500', label: 'Info Required',
    },
  };
  const c = config[status] ?? config.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${c.bg} ${c.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}): React.ReactElement {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500 sm:w-1/3 mb-1 sm:mb-0 shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-gray-900 sm:w-2/3 break-words">
        {value !== undefined && value !== null && value !== '' ? (
          String(value)
        ) : (
          <span className="text-gray-400 italic">Not provided</span>
        )}
      </dd>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-[#004063]">{title}</h2>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function DocumentCard({
  title,
  url,
  typedValue,
  fieldLabel,
}: {
  title: string;
  url?: string;
  typedValue?: string;
  fieldLabel?: string;
}): React.ReactElement {
  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-xs text-gray-400 italic">Not uploaded</p>
      </div>
    );
  }

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) ||
    url.includes('image') ||
    !url.toLowerCase().includes('.pdf');
  const isPDF   = url.toLowerCase().includes('.pdf');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      {typedValue && fieldLabel && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">{fieldLabel}</p>
          <p className="text-sm font-mono font-bold text-[#004063]">
            {typedValue}
          </p>
        </div>
      )}
      {isImage && (
        <div className="relative w-full h-36 rounded-lg overflow-hidden border border-gray-100 mb-3">
          <Image
            src={url}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain bg-gray-50"
          />
        </div>
      )}
      {isPDF && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mb-3">
          <FileText className="w-6 h-6 text-red-500 shrink-0" />
          <span className="text-sm text-gray-600">PDF Document</span>
        </div>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#029bba] hover:text-[#027a94] transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View Full Document
      </a>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────

function PageSkeleton(): React.ReactElement {
  return (
    <AdminLayout>
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="bg-white rounded-2xl p-6 h-36 border border-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-48 border border-gray-100" />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Approve Modal ────────────────────────────────────────────

function ApproveModal({
  companyName,
  processing,
  onCancel,
  onConfirm,
}: {
  companyName: string;
  processing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#10b981] to-green-600 px-6 py-5 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">Approve Developer</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-600 text-center mb-4">
            Approve <span className="font-bold text-gray-900">{companyName}</span>?
          </p>
          <div className="bg-[#f0fdf4] border border-green-100 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-green-800 mb-2">
              This developer will be able to:
            </p>
            <ul className="space-y-1.5">
              {[
                'Add projects on Highrise.pk',
                'Appear in verified developers list',
                'Receive buyer inquiries',
                'Get verified badge on profile',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 text-[#10b981] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            An email notification will be sent to the developer upon approval.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={processing}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={processing}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-green-600 text-white font-semibold disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
            >
              {processing ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Approving...</>
              ) : (
                <><CheckCircle className="w-4 h-4" />Yes, Approve</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────

function RejectModal({
  companyName,
  processing,
  onCancel,
  onConfirm,
}: {
  companyName: string;
  processing: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}): React.ReactElement {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Reject Developer</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Rejecting <span className="font-semibold">{companyName}</span>
            </p>
          </div>
          <button onClick={onCancel} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Reason for rejection <span className="text-[#ef4444]">*</span>
            <span className="text-xs font-normal text-gray-400 ml-1">(min 10 chars)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Explain why this developer is being rejected..."
            className="w-full rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 text-sm p-3 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">{reason.trim().length}/10 minimum</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={processing || reason.trim().length < 10}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
          >
            {processing ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Rejecting...</>
            ) : 'Reject Developer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Info Required Modal ──────────────────────────────────────

function InfoRequiredModal({
  companyName,
  processing,
  onCancel,
  onConfirm,
}: {
  companyName: string;
  processing: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}): React.ReactElement {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Request More Information</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              From <span className="font-semibold">{companyName}</span>
            </p>
          </div>
          <button onClick={onCancel} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            What information is needed? <span className="text-[#ef4444]">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Please upload clearer SECP certificate. The current image is blurry and numbers are not readable..."
            className="w-full rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 text-sm p-3 outline-none resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-gray-400 mt-1">
            {reason.trim().length}/1000 — This will be sent directly to the developer
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={processing || reason.trim().length < 10}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
          >
            {processing ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
            ) : (
              <><AlertTriangle className="w-4 h-4" />Send Request</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Project Verification Card ────────────────────────────────

function ProjectVerificationCard({
  project,
  developerId,
  onUpdated,
  showBanner,
}: {
  project: CompletedProject;
  developerId: string;
  onUpdated: () => void;
  showBanner: (type: 'success' | 'error', msg: string) => void;
}): React.ReactElement {
  const [processing, setProcessing] = useState(false);
  const [showNotes, setShowNotes]   = useState(false);
  const [notes, setNotes]           = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [action, setAction]         = useState<'verify' | 'reject' | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const handleSubmit = async (): Promise<void> => {
    if (!action) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `/api/admin/developers/${developerId}/verify-project`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            projectId:         project._id,
            action,
            verificationNotes: notes,
            rejectionReason:   rejectReason,
          }),
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to update project.');
        return;
      }
      showBanner('success', data.message ?? 'Project updated.');
      setAction(null);
      setNotes('');
      setRejectReason('');
      onUpdated();
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const statusColor: Record<string, string> = {
    completed:            'bg-emerald-100 text-emerald-700',
    ready_for_possession: 'bg-blue-100 text-blue-700',
    under_construction:   'bg-amber-100 text-amber-700',
    delayed:              'bg-orange-100 text-orange-700',
    on_hold:              'bg-red-100 text-red-700',
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      project.isVerified
        ? 'border-emerald-200 bg-emerald-50/20'
        : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-bold text-[#004063] text-sm">{project.projectName}</p>
            {project.isVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full border border-amber-200">
                <Clock className="w-3 h-3" /> Pending
              </span>
            )}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              statusColor[project.status] ?? 'bg-gray-100 text-gray-600'
            }`}>
              {project.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{project.city}, {project.area}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />{project.completionYear}
            </span>
            {project.images.length > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {project.images.length} photo{project.images.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Images */}
      {project.images.length > 0 && (
        <div className="px-5 pb-4">
          <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 mb-2">
            <Image
              src={project.images[activeImage]}
              alt={`${project.projectName} - image ${activeImage + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          {project.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {project.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                    activeImage === idx
                      ? 'border-[#029bba]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details */}
      <div className="px-5 pb-4 space-y-1">
        <p className="text-xs text-gray-500">
          <span className="font-semibold">Type:</span>{' '}
          {project.projectType.replace(/_/g, ' ')}
        </p>
        {project.totalUnits && (
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Units:</span> {project.totalUnits}
          </p>
        )}
        {project.totalArea && (
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Area:</span> {project.totalArea}
          </p>
        )}
        {project.description && (
          <p className="text-xs text-gray-500 italic">"{project.description}"</p>
        )}
        {project.delayReason && (
          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs font-semibold text-orange-700">
              Delay Reason:
            </p>
            <p className="text-xs text-orange-600 mt-0.5">{project.delayReason}</p>
          </div>
        )}
        {project.verificationNotes && (
          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs font-semibold text-emerald-700">
              Verification Notes:
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {project.verificationNotes}
            </p>
          </div>
        )}
        {project.rejectionReason && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-semibold text-red-700">
              Rejection Reason:
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {project.rejectionReason}
            </p>
          </div>
        )}
      </div>

      {/* Action area */}
      {!project.isVerified && action === null && (
        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={() => { setAction('verify'); setShowNotes(true); }}
            className="flex-1 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verify Project
          </button>
          <button
            type="button"
            onClick={() => { setAction('reject'); setShowNotes(true); }}
            className="flex-1 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      )}

      {/* Re-verify already verified */}
      {project.isVerified && action === null && (
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => { setAction('reject'); setShowNotes(true); }}
            className="w-full px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-colors"
          >
            Revoke Verification
          </button>
        </div>
      )}

      {/* Notes form */}
      {showNotes && action !== null && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
          {action === 'verify' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Verification Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about this verification..."
                className="w-full rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 text-xs p-2.5 outline-none resize-none"
                maxLength={500}
              />
            </div>
          )}
          {action === 'reject' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Rejection Reason <span className="text-[#ef4444]">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Why is this project being rejected/revoked?"
                className="w-full rounded-xl border border-gray-300 focus:border-red-300 focus:ring-2 focus:ring-red-200 text-xs p-2.5 outline-none resize-none"
                maxLength={500}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setAction(null); setShowNotes(false); setNotes(''); setRejectReason(''); }}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={
                processing ||
                (action === 'reject' && rejectReason.trim().length < 3)
              }
              className={`flex-1 px-3 py-2 rounded-xl text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                action === 'verify'
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {processing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : action === 'verify' ? (
                <><CheckCircle2 className="w-3.5 h-3.5" />Confirm Verify</>
              ) : (
                <><XCircle className="w-3.5 h-3.5" />Confirm Reject</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function AdminDeveloperDetail(): React.ReactElement {
  const router  = useRouter();
  const { data: session, status } = useSession();
  const { id }  = router.query;

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') void router.replace('/auth/login');
    if (status === 'authenticated' &&
      (session?.user as { role?: string })?.role !== 'admin')
      void router.replace('/auth/login');
  }, [status, session, router]);

  // ── State ────────────────────────────────────────────────────
  const [developer, setDeveloper]     = useState<Developer | null>(null);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [trustLoading, setTrustLoading]   = useState(false);
  const [cnicLoading, setCnicLoading]     = useState(false);
  const [badgeLoading, setBadgeLoading]   = useState(false);

  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showBanner = useCallback(
    (type: 'success' | 'error', message: string) => {
      setBanner({ type, message });
      setTimeout(() => setBanner(null), 5000);
    },
    []
  );

  // Modals
  const [showApproveModal, setShowApproveModal]         = useState(false);
  const [showRejectModal, setShowRejectModal]           = useState(false);
  const [showInfoRequiredModal, setShowInfoRequiredModal] = useState(false);

  // Trust form
  const [trustValues, setTrustValues] = useState<TrustValues>({
    highriseScore:      0,
    onTimeDeliveryRate: 0,
    riskLevel:          'medium',
    verificationLevel:  'not_verified',
    adminNotes:         '',
  });

  // Badge assignment
  const [selectedAdminBadges, setSelectedAdminBadges] = useState<
    AdminAssignableBadge[]
  >([]);

  // CNIC verification state
  const [cnicResult, setCnicResult] = useState<
    'match' | 'mismatch' | 'poor_quality' | null
  >(null);
  const [cnicNotes, setCnicNotes] = useState('');

  // ── Load developer ───────────────────────────────────────────
  const loadDeveloper = useCallback(
    async (developerId: string) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/developers/${developerId}`,
          { credentials: 'include' }
        );
        const data: {
          success: boolean;
          developer?: Developer & {
            verification?: {
              ntnNumber?: string | null;
              secpNumber?: string | null;
              authorizedPersonCNIC?: string | null;
              phone?: string | null;
              authorizedPersonPhone?: string | null;
            };
          };
          message?: string;
        } = await res.json();

        if (!res.ok || !data.success || !data.developer) {
          showBanner('error', data.message ?? 'Failed to load developer.');
          return;
        }

        // Decrypted verification numbers (admin-only GET payload) →
        // the existing DocumentCard typedValue fields. Numbers render
        // side-by-side with NTN/SECP/CNIC documents for cross-checking.
        const v = data.developer.verification;
        setDeveloper({
          ...data.developer,
          ntnNumber:             v?.ntnNumber ?? undefined,
          secpNumber:            v?.secpNumber ?? undefined,
          authorizedPersonCNIC:  v?.authorizedPersonCNIC ?? undefined,
          phone:                 v?.phone ?? undefined,
        });

        // Sync trust values
        setTrustValues({
          highriseScore:      data.developer.highriseScore ?? 0,
          onTimeDeliveryRate: data.developer.onTimeDeliveryRate ?? 0,
          riskLevel:          data.developer.riskLevel ?? 'medium',
          verificationLevel:  data.developer.verificationLevel ?? 'not_verified',
          adminNotes:         data.developer.adminNotes ?? '',
        });

        // Sync admin badge selection
        const currentAdminBadges = (data.developer.badges ?? []).filter(
          (b): b is AdminAssignableBadge =>
            ADMIN_ASSIGNABLE_BADGES.includes(b as AdminAssignableBadge)
        );
        setSelectedAdminBadges(currentAdminBadges);

      } catch {
        showBanner('error', 'Network error. Please check your connection.');
      } finally {
        setLoading(false);
      }
    },
    [showBanner]
  );

  useEffect(() => {
    if (
      status === 'authenticated' &&
      (session?.user as { role?: string })?.role === 'admin' &&
      typeof id === 'string'
    ) {
      void loadDeveloper(id);
    }
  }, [id, status, session, loadDeveloper]);

  // ── Approve ──────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!developer) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/developers/${developer._id}/approve`,
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
      setShowApproveModal(false);
      showBanner('success', `${developer.companyName} approved successfully.`);
      window.dispatchEvent(new Event('refreshAdminStats'));
      void loadDeveloper(developer._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject ───────────────────────────────────────────────────
  const handleReject = async (reason: string) => {
    if (!developer) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/developers/${developer._id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to reject developer.');
        return;
      }
      setShowRejectModal(false);
      showBanner('success', `${developer.companyName} has been rejected.`);
      window.dispatchEvent(new Event('refreshAdminStats'));
      void loadDeveloper(developer._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Info Required ────────────────────────────────────────────
  const handleInfoRequired = async (reason: string) => {
    if (!developer) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/developers/${developer._id}/info-required`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to send info request.');
        return;
      }
      setShowInfoRequiredModal(false);
      showBanner('success', `Information request sent to ${developer.companyName}.`);
      void loadDeveloper(developer._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Trust metrics ────────────────────────────────────────────
  const handleUpdateTrust = async () => {
    if (!developer) return;
    setTrustLoading(true);
    try {
      const res = await fetch(
        `/api/admin/developers/${developer._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            highriseScore:      trustValues.highriseScore,
            onTimeDeliveryRate: trustValues.onTimeDeliveryRate,
            riskLevel:          trustValues.riskLevel,
            verificationLevel:  trustValues.verificationLevel,
            adminNotes:         trustValues.adminNotes || undefined,
          }),
        }
      );
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to update trust metrics.');
        return;
      }
      showBanner('success', 'Trust metrics updated successfully.');
      void loadDeveloper(developer._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setTrustLoading(false);
    }
  };

  // ── CNIC verification ────────────────────────────────────────
  const handleCnicVerification = async () => {
    if (!developer || !cnicResult) return;
    setCnicLoading(true);
    try {
      const res = await fetch(
        `/api/admin/developers/${developer._id}/verify-cnic`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            verificationResult: cnicResult,
            notes: cnicNotes,
          }),
        }
      );
      const data: {
        success: boolean;
        message?: string;
        verificationLevel?: string;
      } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to update CNIC verification.');
        return;
      }
      showBanner('success', data.message ?? 'CNIC verification updated.');
      setCnicResult(null);
      setCnicNotes('');
      void loadDeveloper(developer._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setCnicLoading(false);
    }
  };

  // ── Badge assignment ─────────────────────────────────────────
  const handleAssignBadges = async () => {
    if (!developer) return;
    setBadgeLoading(true);
    try {
      const res = await fetch(
        `/api/admin/developers/${developer._id}/assign-badge`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ badges: selectedAdminBadges }),
        }
      );
      const data: {
        success: boolean;
        message?: string;
        badges?: DeveloperBadge[];
      } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to assign badges.');
        return;
      }
      showBanner('success', `Badges updated for ${developer.companyName}.`);
      void loadDeveloper(developer._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setBadgeLoading(false);
    }
  };

  const toggleAdminBadge = (badge: AdminAssignableBadge): void => {
    setSelectedAdminBadges((prev) =>
      prev.includes(badge)
        ? prev.filter((b) => b !== badge)
        : [...prev, badge]
    );
  };

  // ── Auth / loading states ────────────────────────────────────
  if (status === 'loading' || status === 'unauthenticated') return <PageSkeleton />;
  if (loading) return <PageSkeleton />;

  if (!developer) {
    return (
      <>
        <Head>
          <title>Developer Not Found — Admin | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <AdminLayout>
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Developer Not Found</h2>
            <p className="text-gray-500 text-sm">This developer profile may have been deleted.</p>
            <Link
              href="/admin/developers"
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors"
            >
              Back to Developers
            </Link>
          </div>
        </AdminLayout>
      </>
    );
  }

  const hasCnicImages =
    Boolean(developer.legalDocs?.authorizedPersonCnicFrontImage?.url) ||
    Boolean(developer.legalDocs?.authorizedPersonCnicBackImage?.url);

  const completedProjects =
    developer.portfolio?.completedProjects ?? [];

  const currentTierBadge = (developer.badges ?? []).find((b) =>
    ['startup','emerging','established','silver','gold','platinum','diamond'].includes(b)
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>
          {developer.companyName} — Developer Review | Admin | Highrise.pk
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Modals */}
      {showApproveModal && (
        <ApproveModal
          companyName={developer.companyName}
          processing={actionLoading}
          onCancel={() => setShowApproveModal(false)}
          onConfirm={() => void handleApprove()}
        />
      )}
      {showRejectModal && (
        <RejectModal
          companyName={developer.companyName}
          processing={actionLoading}
          onCancel={() => setShowRejectModal(false)}
          onConfirm={(reason) => void handleReject(reason)}
        />
      )}
      {showInfoRequiredModal && (
        <InfoRequiredModal
          companyName={developer.companyName}
          processing={actionLoading}
          onCancel={() => setShowInfoRequiredModal(false)}
          onConfirm={(reason) => void handleInfoRequired(reason)}
        />
      )}

      <AdminLayout>
        <div className="space-y-6 max-w-5xl mx-auto">

          {/* ── Banner ── */}
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

          {/* ── Breadcrumb ── */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/admin" className="hover:text-gray-700 transition-colors">Admin</Link>
            <span>/</span>
            <Link href="/admin/developers" className="hover:text-gray-700 transition-colors">Developers</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">
              {developer.companyName}
            </span>
          </div>

          {/* ── Header card ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Company identity */}
              <div className="flex items-start gap-4">
                {developer.logo?.url ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                    <Image
                      src={developer.logo.url}
                      alt={developer.companyName}
                      fill sizes="80px"
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-[#029bba] flex items-center justify-center text-3xl font-bold text-white shrink-0">
                    {developer.companyName?.charAt(0)?.toUpperCase() ?? 'D'}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-[#004063]">
                    {developer.companyName}
                  </h1>
                  <p className="text-gray-500 capitalize text-sm mt-0.5">
                    {developer.developerType}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge status={developer.status} />
                    {currentTierBadge && (
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {TIER_BADGE_LABELS[currentTierBadge] ?? currentTierBadge}
                      </span>
                    )}
                    {developer.slug && (
                      <Link
                        href={`/developers/${developer.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#029bba] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Public Profile
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 shrink-0">
                {(developer.status === 'pending' ||
                  developer.status === 'rejected' ||
                  developer.status === 'info_required') && (
                  <button
                    onClick={() => setShowApproveModal(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-[#10b981] hover:bg-green-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    Approve
                  </button>
                )}
                {(developer.status === 'pending' ||
                  developer.status === 'approved' ||
                  developer.status === 'info_required') && (
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                )}
                {developer.status !== 'info_required' &&
                  developer.status !== 'rejected' &&
                  developer.status !== 'suspended' && (
                  <button
                    onClick={() => setShowInfoRequiredModal(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    Info Required
                  </button>
                )}
                <Link
                  href="/admin/developers"
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              </div>
            </div>

            {/* Info required reason banner */}
            {developer.status === 'info_required' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-800">
                    Information Requested from Developer
                  </p>
                  <p className="text-sm text-blue-700 mt-0.5">
                    Waiting for developer response.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Trust & Verification Control ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <div className="p-2 bg-[#029bba]/10 rounded-lg">
                <Shield className="w-5 h-5 text-[#029bba]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#004063]">
                  Trust & Verification Control
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage scores visible on public profile
                </p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Performance metrics */}
              <div className="space-y-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Performance Metrics
                </h3>
                {/* Highrise Score */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Highrise Trust Score
                    </label>
                    <span className="text-xs font-bold text-[#029bba] bg-white px-2 py-1 rounded-lg border border-gray-200">
                      {trustValues.highriseScore}/100
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={100}
                    value={trustValues.highriseScore}
                    onChange={(e) => setTrustValues((v) => ({ ...v, highriseScore: Number(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#029bba]"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <input
                      type="number" min={0} max={100}
                      value={trustValues.highriseScore}
                      onChange={(e) => setTrustValues((v) => ({ ...v, highriseScore: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                      className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                    />
                    <span className="text-xs text-gray-400">Adjust slider or type</span>
                  </div>
                </div>
                {/* On-Time Delivery */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      On-Time Delivery Rate
                    </label>
                    <span className="text-xs font-bold text-[#10b981] bg-white px-2 py-1 rounded-lg border border-gray-200">
                      {trustValues.onTimeDeliveryRate}%
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={100}
                    value={trustValues.onTimeDeliveryRate}
                    onChange={(e) => setTrustValues((v) => ({ ...v, onTimeDeliveryRate: Number(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                  />
                </div>
              </div>
              {/* Status levels */}
              <div className="space-y-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Status Levels
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Risk Assessment Level
                  </label>
                  <select
                    value={trustValues.riskLevel}
                    onChange={(e) => setTrustValues((v) => ({ ...v, riskLevel: e.target.value as RiskLevel }))}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm"
                  >
                    <option value="low">Low Risk 🟢</option>
                    <option value="medium">Medium Risk 🟡</option>
                    <option value="high">High Risk 🔴</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Verification Level
                  </label>
                  <select
                    value={trustValues.verificationLevel}
                    onChange={(e) => setTrustValues((v) => ({ ...v, verificationLevel: e.target.value as VerificationLevel }))}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm"
                  >
                    <option value="not_verified">Not Verified ⚪</option>
                    <option value="docs_pending">Documents Pending 🟡</option>
                    <option value="docs_verified">Documents Verified 📄</option>
                    <option value="site_verified">Site Verified 🏗️</option>
                    <option value="fully_verified">Highrise Certified ✅</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Admin Notes{' '}
                    <span className="text-gray-400 font-normal">(internal only)</span>
                  </label>
                  <textarea
                    value={trustValues.adminNotes}
                    onChange={(e) => setTrustValues((v) => ({ ...v, adminNotes: e.target.value }))}
                    rows={3} maxLength={2000}
                    placeholder="Internal notes (not shown publicly)..."
                    className="w-full rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 text-sm p-3 outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {trustValues.adminNotes.length}/2000
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => void handleUpdateTrust()}
                disabled={trustLoading}
                className="px-6 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-sm disabled:opacity-60 transition-colors flex items-center gap-2"
              >
                {trustLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" />Save Trust Metrics</>
                )}
              </button>
            </div>
          </div>

          {/* ── V6.4.5+: Document Cross-Check Panel ── */}
          <Section
            title="Document Cross-Check"
            subtitle="Verify typed data matches uploaded documents"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocumentCard
                title="SECP Certificate"
                url={developer.legalDocs?.secpCertificate?.url}
                typedValue={developer.secpNumber ?? 'Not provided'}
                fieldLabel="Typed SECP Number"
              />
              <DocumentCard
                title="NTN Certificate"
                url={developer.legalDocs?.ntnCertificate?.url}
                typedValue={developer.ntnNumber ?? 'Not provided'}
                fieldLabel="Typed NTN Number"
              />
              <DocumentCard
                title="Memorandum of Association"
                url={developer.legalDocs?.memorandum?.url}
              />
              <DocumentCard
                title="Company Logo"
                url={developer.logo?.url}
              />
            </div>

            {/* Verification checklist */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-bold text-gray-700 mb-3">
                Admin Verification Checklist
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Company name matches SECP certificate', done: Boolean(developer.legalDocs?.secpCertificate?.url) },
                  { label: 'SECP number matches certificate', done: Boolean(developer.legalDocs?.secpCertificate?.url && developer.secpNumber) },
                  { label: 'NTN certificate uploaded', done: Boolean(developer.legalDocs?.ntnCertificate?.url) },
                  { label: 'NTN number matches certificate', done: Boolean(developer.legalDocs?.ntnCertificate?.url && developer.ntnNumber) },
                  { label: 'Authorized person CNIC images uploaded', done: hasCnicImages },
                  { label: 'CNIC identity verified', done: developer.authorizedPersonVerificationLevel === 'basic_verified' || developer.authorizedPersonVerificationLevel === 'fully_verified' },
                  { label: 'Portfolio projects reviewed', done: completedProjects.some((p) => p.isVerified) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      item.done ? 'bg-emerald-100' : 'bg-gray-200'
                    }`}>
                      {item.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <p className={`text-sm ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── V6.4.5+: CNIC Verification Panel ── */}
          <Section
            title="Authorized Person CNIC Verification"
            subtitle="Cross-check typed CNIC data against uploaded images"
          >
            {/* Typed data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Authorized Person Name</p>
                <p className="text-sm font-bold text-[#004063]">
                  {developer.authorizedPersonName ?? 'Not provided'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Authorized Person CNIC</p>
                <p className="text-sm font-bold font-mono text-[#004063]">
                  {developer.authorizedPersonCNIC ?? 'Not provided'}
                </p>
              </div>
            </div>

            {/* CNIC images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <DocumentCard
                title="CNIC Front Image"
                url={developer.legalDocs?.authorizedPersonCnicFrontImage?.url}
              />
              <DocumentCard
                title="CNIC Back Image"
                url={developer.legalDocs?.authorizedPersonCnicBackImage?.url}
              />
            </div>

            {/* Current verification level */}
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Current Verification Level</p>
              <div className="flex items-center gap-2">
                {developer.authorizedPersonVerificationLevel === 'basic_verified' ||
                 developer.authorizedPersonVerificationLevel === 'fully_verified' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    {developer.authorizedPersonVerificationLevel.replace(/_/g, ' ')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-bold rounded-full">
                    <Clock className="w-4 h-4" />
                    {(developer.authorizedPersonVerificationLevel ?? 'unverified').replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>

            {/* Verification action */}
            {!hasCnicImages ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  CNIC images not yet uploaded. Developer must upload front and back CNIC images first.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-700">
                  Your Assessment:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'match' as const,        label: '✅ Name & CNIC Match',    cls: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
                    { value: 'mismatch' as const,     label: '❌ Mismatch Detected',    cls: 'border-red-300 bg-red-50 text-red-700' },
                    { value: 'poor_quality' as const, label: '⚠️ Poor Image Quality',   cls: 'border-amber-300 bg-amber-50 text-amber-700' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCnicResult(opt.value)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                        cnicResult === opt.value
                          ? opt.cls + ' ring-2 ring-offset-1'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {cnicResult && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Notes (optional)
                    </label>
                    <textarea
                      value={cnicNotes}
                      onChange={(e) => setCnicNotes(e.target.value)}
                      rows={2}
                      placeholder="Any additional notes about this CNIC verification..."
                      className="w-full rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 text-sm p-3 outline-none resize-none"
                      maxLength={500}
                    />
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleCnicVerification()}
                    disabled={!cnicResult || cnicLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {cnicLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                    ) : (
                      <><Shield className="w-4 h-4" />Save CNIC Assessment</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* ── V6.4.5+: Portfolio Project Verification Panel ── */}
          <Section
            title={`Portfolio Project Verification (${completedProjects.length})`}
            subtitle="Verify or reject each submitted project individually"
          >
            {completedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-600">
                  No projects submitted yet
                </p>
                <p className="text-xs text-gray-400">
                  Developer has not added any completed projects to their portfolio.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-700">
                        {completedProjects.filter((p) => p.isVerified).length}
                      </strong> verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="text-sm text-gray-600">
                      <strong className="text-amber-700">
                        {completedProjects.filter((p) => !p.isVerified).length}
                      </strong> pending
                    </span>
                  </div>
                  <div className="ml-auto text-xs text-gray-400">
                    {completedProjects.length} total
                  </div>
                </div>

                {/* Project cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedProjects.map((project) => (
                    <ProjectVerificationCard
                      key={project._id}
                      project={project}
                      developerId={developer._id}
                      onUpdated={() => void loadDeveloper(developer._id)}
                      showBanner={showBanner}
                    />
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ── V6.4.5+: Badge Assignment Panel ── */}
          <Section
            title="Badge Assignment"
            subtitle="Manually assign special badges (tier badge is auto-calculated)"
          >
            {/* Current tier badge */}
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Auto-Calculated Tier Badge
              </p>
              <div className="flex items-center gap-2">
                {currentTierBadge ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#029bba]/10 text-[#029bba] text-sm font-bold rounded-full border border-[#029bba]/20">
                    <Award className="w-4 h-4" />
                    {TIER_BADGE_LABELS[currentTierBadge] ?? currentTierBadge}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400 italic">No tier badge yet</span>
                )}
                <p className="text-xs text-gray-400">
                  Based on {completedProjects.filter((p) => p.isVerified).length} verified projects
                </p>
              </div>
            </div>

            {/* Admin-assignable badges */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Admin-Assignable Badges
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ADMIN_ASSIGNABLE_BADGES.map((badge) => {
                  const isSelected = selectedAdminBadges.includes(badge);
                  return (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => toggleAdminBadge(badge)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-left flex items-center gap-2 ${
                        isSelected
                          ? 'border-[#029bba] bg-[#029bba]/10 text-[#029bba]'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-[#029bba] bg-[#029bba]'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                      {BADGE_LABELS[badge]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleAssignBadges()}
                disabled={badgeLoading}
                className="px-5 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {badgeLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                ) : (
                  <><Award className="w-4 h-4" />Save Badges</>
                )}
              </button>
            </div>
          </Section>

          {/* ── Info sections grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Company Information">
              <dl>
                <InfoRow label="Company Name"    value={developer.companyName} />
                <InfoRow label="Developer Type"  value={developer.developerType} />
                <InfoRow label="Company Type"    value={developer.companyType} />
                <InfoRow label="SECP Number"     value={developer.secpNumber} />
                <InfoRow label="NTN Number"      value={developer.ntnNumber} />
                <InfoRow label="STRN"            value={developer.strn} />
                <InfoRow label="Est. Year"       value={developer.establishedYear} />
                <InfoRow label="Website"         value={developer.website} />
              </dl>
            </Section>

            <Section title="Contact Information">
              <dl>
                <InfoRow label="Office Address" value={developer.officeAddress} />
                <InfoRow label="City"           value={developer.city} />
                <InfoRow label="Phone"          value={developer.phone} />
                <InfoRow label="Email"          value={developer.email} />
              </dl>
            </Section>

            <Section title="Authorized Person">
              <dl>
                <InfoRow label="Full Name"   value={developer.authorizedPersonName} />
                <InfoRow label="CNIC"        value={developer.authorizedPersonCNIC} />
                <InfoRow label="Verification"
                  value={developer.authorizedPersonVerificationLevel?.replace(/_/g, ' ')} />
              </dl>
            </Section>

            <Section title="User Account">
              <dl>
                <InfoRow label="User Email"      value={developer.user?.email} />
                <InfoRow label="User Name"       value={developer.user?.name} />
                <InfoRow label="Account Created"
                  value={developer.user?.createdAt
                    ? new Date(developer.user.createdAt).toLocaleDateString('en-PK', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : undefined}
                />
              </dl>
            </Section>

            <Section title="Public Profile">
              <dl>
                <InfoRow label="Tagline"  value={developer.tagline} />
                <InfoRow label="CEO Name" value={developer.ceoName} />
                <InfoRow label="Slug"     value={developer.slug} />
              </dl>
              {developer.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {developer.description}
                  </p>
                </div>
              )}
            </Section>

            <Section title="Trust Metrics (Current)">
              <dl>
                <InfoRow label="Highrise Score"
                  value={`${developer.highriseScore ?? 0} / 100`} />
                <InfoRow label="Delivery Rate"
                  value={`${developer.onTimeDeliveryRate ?? 0}%`} />
                <InfoRow label="Risk Level"
                  value={developer.riskLevel ?? 'Not set'} />
                <InfoRow label="Verification Level"
                  value={developer.verificationLevel?.replace(/_/g, ' ') ?? 'Not verified'} />
                {developer.lastVerifiedAt && (
                  <InfoRow label="Last Verified"
                    value={new Date(developer.lastVerifiedAt).toLocaleDateString('en-PK', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  />
                )}
              </dl>
            </Section>

            <Section title="Submission Info">
              <dl>
                <InfoRow label="Submitted On"
                  value={new Date(developer.createdAt).toLocaleDateString('en-PK', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                />
                <InfoRow label="Last Updated"
                  value={new Date(developer.updatedAt).toLocaleDateString('en-PK', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                />
                {developer.verifiedAt && (
                  <InfoRow label="Verified On"
                    value={new Date(developer.verifiedAt).toLocaleDateString('en-PK', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  />
                )}
                <InfoRow label="Active Projects"
                  value={developer.activeProjectsCount ?? 0} />
                <InfoRow label="Verified Projects"
                  value={completedProjects.filter((p) => p.isVerified).length} />
              </dl>
            </Section>

            <Section title="Social Links">
              <dl>
                <InfoRow label="Facebook"  value={developer.socialLinks?.facebook} />
                <InfoRow label="LinkedIn"  value={developer.socialLinks?.linkedin} />
                <InfoRow label="Instagram" value={developer.socialLinks?.instagram} />
                <InfoRow label="YouTube"   value={developer.socialLinks?.youtube} />
                <InfoRow label="Twitter"   value={developer.socialLinks?.twitter} />
              </dl>
            </Section>
          </div>

        </div>
      </AdminLayout>
    </>
  );
}