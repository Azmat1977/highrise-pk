// pages/admin/applications/[id].tsx
// 🔒 ADMIN APPLICATION DETAIL UI - HIGHRISE.PK
// V5.9.0 — View full application + approve/reject/request info
// fetch() only | lucide-react | native Tailwind | inline modals
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
  IdCard,
  Hash,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Shield,
  ShieldCheck,
  History,
  AlertTriangle,
  Briefcase,
  Award,
  Layers,
  LayoutGrid,
  Banknote,
  Home,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ─── Types ─────────────────────────────────────────────────────

type AppType = 'agent' | 'developer' | 'society';
type AppStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info_required'
  | 'suspended'
  | 'draft';
type ActionType = 'approve' | 'reject' | 'request_info';

interface AuditEntry {
  action: string;
  performedBy: string;
  performedAt: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}

interface CloudinaryAsset {
  url: string;
  public_id?: string;
  publicId?: string;
}

interface AgentProfileShape {
  _id: string;
  user?:
    | string
    | {
        _id: string;
        email?: string;
        name?: string;
        displayName?: string;
        role?: string;
        kycVerified?: boolean;
      };
  slug?: string;
  displayName?: string;
  agencyName?: string;
  agentType?: string;
  tagline?: string;
  about?: string;
  email?: string;
  contactEmail?: string;
  city?: string;
  operatingCities?: string[];
  officeVerification?: {
    address?: string;
    city?: string;
  };
  specializations?: string[];
  experience?: { years?: number };
  serviceAreas?: { localities?: string[]; cities?: string[] };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  representativeName?: string;
  representativeRole?: string;
  companyRegNo?: string;
  status?: AppStatus;
  verificationLevel?: string;
  rejectionReason?: string;
  infoRequiredReason?: string;
  submittedForReviewAt?: string;
  verifiedAt?: string;
  licenseDocumentUrl?: string;
  auditTrail?: AuditEntry[];
  createdAt?: string;
}

interface DeveloperProfileShape {
  _id: string;
  user?:
    | string
    | {
        _id: string;
        email?: string;
        name?: string;
        displayName?: string;
        role?: string;
        kycVerified?: boolean;
      };
  slug?: string;
  companyName?: string;
  companyType?: string;
  developerType?: string;
  establishedYear?: number;
  tagline?: string;
  description?: string;
  ceoName?: string;
  email?: string;
  website?: string;
  city?: string;
  officeAddress?: string;
  operatingCities?: string[];
  serviceAreas?: string[];
  authorizedPersonName?: string;
  authorizedPersonEmail?: string;
  authorizedPersonDesignation?: string;
  legalDocs?: {
    ntnCertificate?: CloudinaryAsset;
    secpCertificate?: CloudinaryAsset;
    pastProjects?: CloudinaryAsset[];
  };
  status?: AppStatus;
  kycStatus?: string;
  verificationLevel?: string;
  rejectionReason?: string;
  infoRequiredReason?: string;
  verifiedAt?: string;
  auditTrail?: AuditEntry[];
  createdAt?: string;
}

interface DecryptedAgent {
  cnic: string | null;
  cnicMasked: string;
  license: string | null;
  ntn: string | null;
  secp: string | null;
  phone: string | null;
  phoneMasked: string;
}

interface DecryptedDeveloper {
  ntn: string | null;
  secp: string | null;
  authorizedPersonCnic: string | null;
  authorizedPersonCnicMasked: string;
  phone: string | null;
  phoneMasked: string;
  authorizedPersonPhone: string | null;
}

// ─── Society types ──────────────────────────────────────────────

interface SocietyBlock {
  _id?: string;
  name: string;
  totalPlots: number;
  availablePlots: number;
  plotSizes: string[];
  possessionStatus: 'announced' | 'under_development' | 'ready';
  launchYear?: number;
  completionYear?: number;
}

interface SocietyPlotInventory {
  size: string;
  totalPlots: number;
  availablePlots: number;
  pricePerMarla?: number;
  pricePerSqFt?: number;
}

interface SocietyInstallmentPlan {
  _id?: string;
  planName: string;
  durationMonths: number;
  downPaymentPercent: number;
  monthlyInstallmentPercent?: number;
  quarterlyInstallmentPercent?: number;
  halfYearlyInstallmentPercent?: number;
  balloonPaymentPercent?: number;
  isInterestFree: boolean;
  notes?: string;
}

interface SocietyKycDocument {
  _id?: string;
  type: string;
  title: string;
  url: string;
  uploadedAt?: string;
}

interface SocietyProfileShape {
  _id: string;
  userId?:
    | string
    | {
        _id: string;
        email?: string;
        name?: string;
        displayName?: string;
        role?: string;
        kycVerified?: boolean;
      };
  societyName?: string;
  registeredName?: string;
  slug?: string;
  city?: string;
  areaName?: string;
  fullAddress?: string;
  authority?: string;
  nocNumber?: string;
  nocIssuanceDate?: string;
  nocExpiryDate?: string;
  totalAreaAcres?: number;
  launchYear?: number;
  authorizedPersonName?: string;
  authorizedPersonDesignation?: string;
  authorizedPersonPhone?: string;
  authorizedPersonEmail?: string;
  ntcNumber?: string;
  fbrNtn?: string;
  strn?: string;
  bankAccountTitle?: string;
  bankName?: string;
  bankIban?: string;
  blocks?: SocietyBlock[];
  plotInventory?: SocietyPlotInventory[];
  amenities?: string[];
  installmentPlans?: SocietyInstallmentPlan[];
  kycDocuments?: SocietyKycDocument[];
  officePhone?: string;
  officeEmail?: string;
  websiteUrl?: string;
  cnicVerified?: boolean;
  nocVerified?: boolean;
  kycStatus?: string;
  trustScore?: number;
  badges?: string[];
  status?: AppStatus;
  rejectionReason?: string;
  infoRequiredReason?: string;
  submittedAt?: string;
  verifiedAt?: string;
  reviewedAt?: string;
  auditTrail?: Array<{
    action: string;
    performedBy: string;
    performedAt: string;
    note?: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
  }>;
  createdAt?: string;
}

interface DecryptedSociety {
  authorizedPersonCnic: string | null;
  authorizedPersonCnicMasked: string;
}

interface ApiResponse {
  success: boolean;
  data?:
    | {
        type: 'agent';
        profile: AgentProfileShape;
        decrypted: DecryptedAgent;
      }
    | {
        type: 'developer';
        profile: DeveloperProfileShape;
        decrypted: DecryptedDeveloper;
      }
    | {
        type: 'society';
        profile: SocietyProfileShape;
        decrypted: DecryptedSociety;
      };
  message?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function statusBadge(status: AppStatus | undefined): {
  label: string;
  classes: string;
  Icon: typeof CheckCircle;
} {
  switch (status) {
    case 'approved':
      return {
        label: 'Approved',
        classes: 'bg-green-50 text-green-700 border-green-200',
        Icon: CheckCircle,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        classes: 'bg-red-50 text-red-700 border-red-200',
        Icon: XCircle,
      };
    case 'info_required':
      return {
        label: 'Info Required',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
        Icon: AlertCircle,
      };
    case 'suspended':
      return {
        label: 'Suspended',
        classes: 'bg-gray-100 text-gray-700 border-gray-300',
        Icon: XCircle,
      };
    case 'draft':
      return {
        label: 'Draft',
        classes: 'bg-gray-100 text-gray-700 border-gray-300',
        Icon: Clock,
      };
    default:
      return {
        label: 'Pending',
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
        Icon: Clock,
      };
  }
}

function isCloudinaryImage(url?: string): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

// ─── Sub-components ────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {icon && (
        <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p
          className={cx(
            'text-sm text-gray-900 break-words',
            mono && 'font-mono text-xs'
          )}
        >
          {value || <span className="text-gray-400">—</span>}
        </p>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <span className="text-[#029bba]">{icon}</span>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

function DocumentPreview({
  label,
  asset,
}: {
  label: string;
  asset?: CloudinaryAsset;
}) {
  if (!asset?.url) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center bg-gray-50">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xs text-gray-300 mt-1">Not provided</p>
      </div>
    );
  }

  const isImg = isCloudinaryImage(asset.url);

  return (
    <a
      href={asset.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
        {isImg ? (
          <Image
            src={asset.url}
            alt={label}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <span className="text-xs text-gray-500">PDF Document</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2 bg-white flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 truncate">
          {label}
        </span>
        <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#029bba] transition-colors" />
      </div>
    </a>
  );
}

// ─── Action Modal ──────────────────────────────────────────────

interface ActionModalProps {
  action: ActionType;
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function ActionModal({
  action,
  open,
  loading,
  error,
  onClose,
  onConfirm,
}: ActionModalProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  if (!open) return null;

  const config = {
    approve: {
      title: 'Approve Application',
      description:
        'This will grant the user their role, send a confirmation email, and force their session to refresh.',
      confirmLabel: 'Confirm Approval',
      confirmClass: 'bg-green-600 hover:bg-green-700',
      Icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      requiresReason: false,
    },
    reject: {
      title: 'Reject Application',
      description:
        'The applicant will be notified via email with the reason below. They can re-apply after 30 days.',
      confirmLabel: 'Confirm Rejection',
      confirmClass: 'bg-red-600 hover:bg-red-700',
      Icon: XCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      requiresReason: true,
    },
    request_info: {
      title: 'Request Additional Information',
      description:
        'The applicant will be notified to provide additional details before the application can proceed.',
      confirmLabel: 'Send Request',
      confirmClass: 'bg-amber-600 hover:bg-amber-700',
      Icon: AlertCircle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      requiresReason: true,
    },
  }[action];

  const Icon = config.Icon;
  const canSubmit = config.requiresReason ? reason.trim().length >= 10 : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-3">
          <div
            className={cx(
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              config.iconBg
            )}
          >
            <Icon className={cx('w-5 h-5', config.iconColor)} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{config.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {config.requiresReason && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-400 ml-2">
                  (Minimum 10 characters, shown to applicant)
                </span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder={
                  action === 'reject'
                    ? 'e.g. SECP certificate could not be verified against official records...'
                    : 'e.g. Please upload a clearer scan of your NTN certificate...'
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none transition-all resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1 text-right">
                {reason.length} / 1000
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || !canSubmit}
            className={cx(
              'px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2',
              config.confirmClass
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export default function AdminApplicationDetailPage() {
  const router = useRouter();
  const { id, type } = router.query;

  const appId = typeof id === 'string' ? id : '';
  const appType = (typeof type === 'string' ? type : '') as AppType;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Action state
  const [modalAction, setModalAction] = useState<ActionType | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // ── Fetch detail ──
  const fetchDetail = useCallback(async () => {
    if (!appId || !appType) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/applications/${appId}?type=${appType}`
      );
      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? 'Failed to load application');
      }

      setData(json.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [appId, appType]);

  useEffect(() => {
    if (router.isReady) void fetchDetail();
  }, [router.isReady, fetchDetail]);

  // ── Submit action ──
  const submitAction = async (action: ActionType, reason: string) => {
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(
        `/api/admin/applications/${appId}?type=${appType}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, reason: reason || undefined }),
        }
      );
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? 'Action failed');
      }

      setSuccessBanner(json.message ?? 'Action completed successfully');
      setModalAction(null);
      await fetchDetail();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading / error states ──
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Unable to Load Application
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {error ?? 'Application not found or has been deleted.'}
          </p>
          <Link
            href="/admin/applications"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#029bba] text-white rounded-lg text-sm font-medium hover:bg-[#027a94] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Applications
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const isAgent = data.type === 'agent';
  const isDeveloper = data.type === 'developer';
  const isSociety = data.type === 'society';
  const profile = data.profile;

  // Society uses 'userId' field, agent/developer use 'user'
  const userObj = isSociety
    ? typeof (profile as SocietyProfileShape).userId === 'object'
      ? ((profile as SocietyProfileShape).userId as Exclude<
          SocietyProfileShape['userId'],
          string | undefined
        >)
      : null
    : typeof (profile as AgentProfileShape | DeveloperProfileShape).user ===
      'object'
    ? ((profile as AgentProfileShape).user as Exclude<
        AgentProfileShape['user'],
        string | undefined
      >)
    : null;

  const profileTitle = isAgent
    ? (profile as AgentProfileShape).agencyName ??
      (profile as AgentProfileShape).displayName ??
      'Unnamed Agent'
    : isDeveloper
    ? (profile as DeveloperProfileShape).companyName ?? 'Unnamed Company'
    : (profile as SocietyProfileShape).societyName ?? 'Unnamed Society';

  const typeLabel = isAgent
    ? 'Agent'
    : isDeveloper
    ? 'Developer'
    : 'Society';

  const HeaderIcon = isAgent ? User : isDeveloper ? Building2 : MapPin;

  const status = profile.status;
  const badge = statusBadge(status);
  const BadgeIcon = badge.Icon;

  const canActOn =
    status === 'pending' || status === 'info_required' || status === 'rejected';

  return (
    <AdminLayout>
      <Head>
        <title>{profileTitle} | Admin | Highrise.pk</title>
      </Head>

      <div className="space-y-6">
        {/* Breadcrumb + Header */}
        <div>
          <Link
            href="/admin/applications"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#029bba] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Applications
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center justify-center flex-shrink-0">
                  <HeaderIcon className="w-6 h-6 text-[#029bba]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">
                    {profileTitle}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <span>{typeLabel} Application</span>
                    <span className="text-gray-300">•</span>
                    <span>Submitted {formatDate(profile.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <span
              className={cx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border self-start',
                badge.classes
              )}
            >
              <BadgeIcon className="w-4 h-4" />
              {badge.label}
            </span>
          </div>
        </div>

        {/* Success banner */}
        {successBanner && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                {successBanner}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-green-700 hover:text-green-900"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Existing status messages */}
        {profile.rejectionReason && status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 text-sm">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-800 mt-1">
                  {profile.rejectionReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {profile.infoRequiredReason && status === 'info_required' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">
                  Additional Information Requested
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  {profile.infoRequiredReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Application details (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Info */}
            <Section icon={<User className="w-4 h-4" />} title="Account Owner">
              <InfoRow
                icon={<User className="w-4 h-4" />}
                label="Full Name"
                value={userObj?.name ?? userObj?.displayName ?? '—'}
              />
              <InfoRow
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={
                  userObj?.email ??
                  (isSociety
                    ? (profile as SocietyProfileShape).officeEmail
                    : (profile as AgentProfileShape | DeveloperProfileShape)
                        .email) ??
                  '—'
                }
              />
              <InfoRow
                icon={<Shield className="w-4 h-4" />}
                label="Current Role"
                value={
                  <span className="capitalize px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                    {userObj?.role ?? 'user'}
                  </span>
                }
              />
              <InfoRow
                icon={<ShieldCheck className="w-4 h-4" />}
                label="KYC Verified"
                value={
                  userObj?.kycVerified ? (
                    <span className="text-green-700 text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-amber-700 text-xs font-medium">
                      Pending verification
                    </span>
                  )
                }
              />
            </Section>

            {/* AGENT-SPECIFIC */}
            {isAgent && (
              <>
                <Section
                  icon={<Briefcase className="w-4 h-4" />}
                  title="Business Profile"
                >
                  <InfoRow
                    icon={<User className="w-4 h-4" />}
                    label="Display Name"
                    value={(profile as AgentProfileShape).displayName}
                  />
                  <InfoRow
                    icon={<Building2 className="w-4 h-4" />}
                    label="Agency Name"
                    value={(profile as AgentProfileShape).agencyName}
                  />
                  <InfoRow
                    label="Agent Type"
                    value={
                      <span className="capitalize">
                        {(profile as AgentProfileShape).agentType ?? '—'}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Tagline"
                    value={(profile as AgentProfileShape).tagline}
                  />
                  <InfoRow
                    label="About"
                    value={
                      (profile as AgentProfileShape).about ? (
                        <span className="text-sm leading-relaxed whitespace-pre-wrap">
                          {(profile as AgentProfileShape).about}
                        </span>
                      ) : null
                    }
                  />
                  <InfoRow
                    icon={<Award className="w-4 h-4" />}
                    label="Experience"
                    value={
                      (profile as AgentProfileShape).experience?.years
                        ? `${(profile as AgentProfileShape).experience?.years} years`
                        : null
                    }
                  />
                  <InfoRow
                    label="Specializations"
                    value={
                      (profile as AgentProfileShape).specializations?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {(profile as AgentProfileShape).specializations?.map(
                            (s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 bg-[#029bba]/10 text-[#029bba] rounded text-xs font-medium capitalize"
                              >
                                {s}
                              </span>
                            )
                          )}
                        </div>
                      ) : null
                    }
                  />
                </Section>

                <Section
                  icon={<MapPin className="w-4 h-4" />}
                  title="Contact & Location"
                >
                  <InfoRow
                    icon={<Phone className="w-4 h-4" />}
                    label="Business Phone"
                    value={(data.decrypted as DecryptedAgent).phone}
                    mono
                  />
                  <InfoRow
                    icon={<Mail className="w-4 h-4" />}
                    label="Business Email"
                    value={
                      (profile as AgentProfileShape).contactEmail ??
                      (profile as AgentProfileShape).email
                    }
                  />
                  <InfoRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="City"
                    value={(profile as AgentProfileShape).city}
                  />
                  <InfoRow
                    label="Office Address"
                    value={
                      (profile as AgentProfileShape).officeVerification?.address
                    }
                  />
                  <InfoRow
                    label="Service Localities"
                    value={
                      (profile as AgentProfileShape).serviceAreas?.localities
                        ?.length
                        ? (profile as AgentProfileShape).serviceAreas?.localities?.join(
                            ', '
                          )
                        : null
                    }
                  />
                </Section>

                <Section
                  icon={<IdCard className="w-4 h-4" />}
                  title="Compliance & Documents"
                >
                  <InfoRow
                    icon={<IdCard className="w-4 h-4" />}
                    label="CNIC (Decrypted)"
                    value={(data.decrypted as DecryptedAgent).cnic}
                    mono
                  />
                  <InfoRow
                    icon={<FileText className="w-4 h-4" />}
                    label="License Number"
                    value={(data.decrypted as DecryptedAgent).license}
                    mono
                  />
                  <InfoRow
                    icon={<Hash className="w-4 h-4" />}
                    label="NTN"
                    value={(data.decrypted as DecryptedAgent).ntn}
                    mono
                  />
                  <InfoRow
                    icon={<IdCard className="w-4 h-4" />}
                    label="Company Reg No"
                    value={(profile as AgentProfileShape).companyRegNo}
                    mono
                  />

                  {/* License document preview */}
                  {(profile as AgentProfileShape).licenseDocumentUrl && (
                    <div className="pt-4 pb-2">
                      <p className="text-xs text-gray-500 mb-2">
                        Verification Document
                      </p>
                      <div className="max-w-xs">
                        <DocumentPreview
                          label="License Document"
                          asset={{
                            url: (profile as AgentProfileShape)
                              .licenseDocumentUrl as string,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Section>

                {(profile as AgentProfileShape).representativeName && (
                  <Section
                    icon={<User className="w-4 h-4" />}
                    title="Representative"
                  >
                    <InfoRow
                      icon={<User className="w-4 h-4" />}
                      label="Name"
                      value={(profile as AgentProfileShape).representativeName}
                    />
                    <InfoRow
                      label="Role"
                      value={(profile as AgentProfileShape).representativeRole}
                    />
                  </Section>
                )}
              </>
            )}

            {/* DEVELOPER-SPECIFIC */}
            {!isAgent && (
              <>
                <Section
                  icon={<Building2 className="w-4 h-4" />}
                  title="Company Identity"
                >
                  <InfoRow
                    icon={<Building2 className="w-4 h-4" />}
                    label="Company Name"
                    value={(profile as DeveloperProfileShape).companyName}
                  />
                  <InfoRow
                    label="Developer Type"
                    value={
                      <span className="capitalize">
                        {(profile as DeveloperProfileShape).developerType ??
                          '—'}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Company Type"
                    value={(profile as DeveloperProfileShape).companyType}
                  />
                  <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Established"
                    value={(profile as DeveloperProfileShape).establishedYear}
                  />
                  <InfoRow
                    label="CEO Name"
                    value={(profile as DeveloperProfileShape).ceoName}
                  />
                  <InfoRow
                    label="Tagline"
                    value={(profile as DeveloperProfileShape).tagline}
                  />
                  <InfoRow
                    label="Description"
                    value={
                      (profile as DeveloperProfileShape).description ? (
                        <span className="text-sm leading-relaxed whitespace-pre-wrap">
                          {(profile as DeveloperProfileShape).description}
                        </span>
                      ) : null
                    }
                  />
                </Section>

                <Section
                  icon={<User className="w-4 h-4" />}
                  title="Authorized Person"
                >
                  <InfoRow
                    icon={<User className="w-4 h-4" />}
                    label="Full Name"
                    value={
                      (profile as DeveloperProfileShape).authorizedPersonName
                    }
                  />
                  <InfoRow
                    label="Designation"
                    value={
                      (profile as DeveloperProfileShape)
                        .authorizedPersonDesignation
                    }
                  />
                  <InfoRow
                    icon={<IdCard className="w-4 h-4" />}
                    label="CNIC (Decrypted)"
                    value={
                      (data.decrypted as DecryptedDeveloper)
                        .authorizedPersonCnic
                    }
                    mono
                  />
                  <InfoRow
                    icon={<Phone className="w-4 h-4" />}
                    label="Phone"
                    value={
                      (data.decrypted as DecryptedDeveloper)
                        .authorizedPersonPhone
                    }
                    mono
                  />
                  <InfoRow
                    icon={<Mail className="w-4 h-4" />}
                    label="Email"
                    value={
                      (profile as DeveloperProfileShape).authorizedPersonEmail
                    }
                  />
                </Section>

                <Section
                  icon={<MapPin className="w-4 h-4" />}
                  title="Contact & Location"
                >
                  <InfoRow
                    icon={<Phone className="w-4 h-4" />}
                    label="Company Phone"
                    value={(data.decrypted as DecryptedDeveloper).phone}
                    mono
                  />
                  <InfoRow
                    icon={<Mail className="w-4 h-4" />}
                    label="Company Email"
                    value={(profile as DeveloperProfileShape).email}
                  />
                  <InfoRow
                    icon={<Globe className="w-4 h-4" />}
                    label="Website"
                    value={
                      (profile as DeveloperProfileShape).website ? (
                        <a
                          href={
                            (profile as DeveloperProfileShape).website ?? '#'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#029bba] hover:underline"
                        >
                          {(profile as DeveloperProfileShape).website}
                        </a>
                      ) : null
                    }
                  />
                  <InfoRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="City"
                    value={(profile as DeveloperProfileShape).city}
                  />
                  <InfoRow
                    label="Office Address"
                    value={(profile as DeveloperProfileShape).officeAddress}
                  />
                  <InfoRow
                    label="Operating Cities"
                    value={
                      (profile as DeveloperProfileShape).operatingCities
                        ?.length
                        ? (profile as DeveloperProfileShape).operatingCities?.join(
                            ', '
                          )
                        : null
                    }
                  />
                </Section>

                <Section
                  icon={<IdCard className="w-4 h-4" />}
                  title="Compliance Numbers"
                >
                  <InfoRow
                    icon={<Hash className="w-4 h-4" />}
                    label="NTN (Decrypted)"
                    value={(data.decrypted as DecryptedDeveloper).ntn}
                    mono
                  />
                  <InfoRow
                    icon={<IdCard className="w-4 h-4" />}
                    label="SECP (Decrypted)"
                    value={(data.decrypted as DecryptedDeveloper).secp}
                    mono
                  />
                </Section>

                <Section
                  icon={<FileText className="w-4 h-4" />}
                  title="Legal Documents"
                >
                  <div className="grid sm:grid-cols-2 gap-3 py-3">
                    <DocumentPreview
                      label="NTN Certificate"
                      asset={
                        (profile as DeveloperProfileShape).legalDocs
                          ?.ntnCertificate
                      }
                    />
                    <DocumentPreview
                      label="SECP Certificate"
                      asset={
                        (profile as DeveloperProfileShape).legalDocs
                          ?.secpCertificate
                      }
                    />
                  </div>
                </Section>

                {(profile as DeveloperProfileShape).legalDocs?.pastProjects
                  ?.length ? (
                  <Section
                    icon={<ImageIcon className="w-4 h-4" />}
                    title={`Past Projects (${
                      (profile as DeveloperProfileShape).legalDocs
                        ?.pastProjects?.length ?? 0
                    })`}
                  >
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 py-3">
                      {(profile as DeveloperProfileShape).legalDocs?.pastProjects?.map(
                        (proj, idx) => (
                          <DocumentPreview
                            key={(proj.publicId ?? proj.public_id ?? idx).toString()}
                            label={`Project ${idx + 1}`}
                            asset={proj}
                          />
                        )
                      )}
                    </div>
                  </Section>
                ) : null}
              </>
            )}

            {/* SOCIETY-SPECIFIC ──────────────────────────────────── */}
            {isSociety && (
              <>
                <Section
                  icon={<Building2 className="w-4 h-4" />}
                  title="Society Identity"
                >
                  <InfoRow
                    icon={<Building2 className="w-4 h-4" />}
                    label="Society Name"
                    value={(profile as SocietyProfileShape).societyName}
                  />
                  <InfoRow
                    label="Registered Legal Name"
                    value={(profile as SocietyProfileShape).registeredName}
                  />
                  <InfoRow
                    icon={<Shield className="w-4 h-4" />}
                    label="Approving Authority"
                    value={
                      (profile as SocietyProfileShape).authority ? (
                        <span className="px-2 py-0.5 bg-[#029bba]/10 text-[#029bba] rounded text-xs font-bold">
                          {(profile as SocietyProfileShape).authority}
                        </span>
                      ) : null
                    }
                  />
                  <InfoRow
                    icon={<FileText className="w-4 h-4" />}
                    label="NOC Number"
                    value={(profile as SocietyProfileShape).nocNumber}
                    mono
                  />
                  <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="NOC Issuance Date"
                    value={formatDate(
                      (profile as SocietyProfileShape).nocIssuanceDate
                    )}
                  />
                  <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="NOC Expiry Date"
                    value={formatDate(
                      (profile as SocietyProfileShape).nocExpiryDate
                    )}
                  />
                  <InfoRow
                    label="Total Area (Acres)"
                    value={(profile as SocietyProfileShape).totalAreaAcres}
                  />
                  <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Launch Year"
                    value={(profile as SocietyProfileShape).launchYear}
                  />
                </Section>

                <Section
                  icon={<User className="w-4 h-4" />}
                  title="Authorized Person"
                >
                  <InfoRow
                    icon={<User className="w-4 h-4" />}
                    label="Full Name"
                    value={
                      (profile as SocietyProfileShape).authorizedPersonName
                    }
                  />
                  <InfoRow
                    label="Designation"
                    value={
                      (profile as SocietyProfileShape)
                        .authorizedPersonDesignation
                    }
                  />
                  <InfoRow
                    icon={<IdCard className="w-4 h-4" />}
                    label="CNIC (Decrypted)"
                    value={
                      (data.decrypted as DecryptedSociety).authorizedPersonCnic
                    }
                    mono
                  />
                  <InfoRow
                    icon={<Phone className="w-4 h-4" />}
                    label="Phone"
                    value={
                      (profile as SocietyProfileShape).authorizedPersonPhone
                    }
                    mono
                  />
                  <InfoRow
                    icon={<Mail className="w-4 h-4" />}
                    label="Email"
                    value={
                      (profile as SocietyProfileShape).authorizedPersonEmail
                    }
                  />
                </Section>

                <Section
                  icon={<MapPin className="w-4 h-4" />}
                  title="Contact & Location"
                >
                  <InfoRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="City"
                    value={(profile as SocietyProfileShape).city}
                  />
                  <InfoRow
                    label="Area / Locality"
                    value={(profile as SocietyProfileShape).areaName}
                  />
                  <InfoRow
                    label="Full Address"
                    value={(profile as SocietyProfileShape).fullAddress}
                  />
                  <InfoRow
                    icon={<Phone className="w-4 h-4" />}
                    label="Office Phone"
                    value={(profile as SocietyProfileShape).officePhone}
                    mono
                  />
                  <InfoRow
                    icon={<Mail className="w-4 h-4" />}
                    label="Office Email"
                    value={(profile as SocietyProfileShape).officeEmail}
                  />
                  <InfoRow
                    icon={<Globe className="w-4 h-4" />}
                    label="Website"
                    value={
                      (profile as SocietyProfileShape).websiteUrl ? (
                        <a
                          href={
                            (profile as SocietyProfileShape).websiteUrl ?? '#'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#029bba] hover:underline"
                        >
                          {(profile as SocietyProfileShape).websiteUrl}
                        </a>
                      ) : null
                    }
                  />
                </Section>

                <Section
                  icon={<IdCard className="w-4 h-4" />}
                  title="Compliance & Banking"
                >
                  <InfoRow
                    icon={<Hash className="w-4 h-4" />}
                    label="FBR NTN"
                    value={(profile as SocietyProfileShape).fbrNtn}
                    mono
                  />
                  <InfoRow
                    icon={<Hash className="w-4 h-4" />}
                    label="STRN"
                    value={(profile as SocietyProfileShape).strn}
                    mono
                  />
                  <InfoRow
                    icon={<Hash className="w-4 h-4" />}
                    label="NTC Number"
                    value={(profile as SocietyProfileShape).ntcNumber}
                    mono
                  />
                  <InfoRow
                    icon={<Banknote className="w-4 h-4" />}
                    label="Bank Name"
                    value={(profile as SocietyProfileShape).bankName}
                  />
                  <InfoRow
                    label="Account Title"
                    value={(profile as SocietyProfileShape).bankAccountTitle}
                  />
                  <InfoRow
                    icon={<Banknote className="w-4 h-4" />}
                    label="IBAN"
                    value={(profile as SocietyProfileShape).bankIban}
                    mono
                  />
                </Section>

                {/* Blocks & Phases */}
                {(profile as SocietyProfileShape).blocks &&
                  ((profile as SocietyProfileShape).blocks?.length ?? 0) > 0 && (
                    <Section
                      icon={<Layers className="w-4 h-4" />}
                      title={`Blocks & Phases (${
                        (profile as SocietyProfileShape).blocks?.length ?? 0
                      })`}
                    >
                      <div className="space-y-3 py-3">
                        {(profile as SocietyProfileShape).blocks?.map(
                          (block, idx) => (
                            <div
                              key={block._id ?? idx}
                              className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-sm text-gray-900">
                                  {block.name}
                                </p>
                                <span
                                  className={cx(
                                    'text-[10px] px-2 py-0.5 rounded-full font-medium border',
                                    block.possessionStatus === 'ready'
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : block.possessionStatus ===
                                        'under_development'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-gray-100 text-gray-700 border-gray-300'
                                  )}
                                >
                                  {block.possessionStatus.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                                <div>
                                  Total: <strong>{block.totalPlots}</strong>{' '}
                                  plots
                                </div>
                                <div>
                                  Available:{' '}
                                  <strong>{block.availablePlots}</strong> plots
                                </div>
                                {block.launchYear && (
                                  <div>
                                    Launch:{' '}
                                    <strong>{block.launchYear}</strong>
                                  </div>
                                )}
                                {block.completionYear && (
                                  <div>
                                    Completion:{' '}
                                    <strong>{block.completionYear}</strong>
                                  </div>
                                )}
                              </div>
                              {block.plotSizes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {block.plotSizes.map((sz) => (
                                    <span
                                      key={sz}
                                      className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded font-medium text-gray-700"
                                    >
                                      {sz.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </Section>
                  )}

                {/* Plot Inventory */}
                {(profile as SocietyProfileShape).plotInventory &&
                  ((profile as SocietyProfileShape).plotInventory?.length ?? 0) >
                    0 && (
                    <Section
                      icon={<LayoutGrid className="w-4 h-4" />}
                      title={`Plot Inventory (${
                        (profile as SocietyProfileShape).plotInventory?.length ??
                        0
                      })`}
                    >
                      <div className="overflow-x-auto py-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                              <th className="text-left py-2 px-2 font-semibold">
                                Size
                              </th>
                              <th className="text-right py-2 px-2 font-semibold">
                                Total
                              </th>
                              <th className="text-right py-2 px-2 font-semibold">
                                Available
                              </th>
                              <th className="text-right py-2 px-2 font-semibold">
                                Price/Marla
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(profile as SocietyProfileShape).plotInventory?.map(
                              (inv, idx) => (
                                <tr key={idx} className="text-gray-700">
                                  <td className="py-2 px-2 capitalize">
                                    {inv.size.replace(/_/g, ' ')}
                                  </td>
                                  <td className="text-right py-2 px-2">
                                    {inv.totalPlots}
                                  </td>
                                  <td className="text-right py-2 px-2 font-medium text-[#029bba]">
                                    {inv.availablePlots}
                                  </td>
                                  <td className="text-right py-2 px-2 font-mono text-xs">
                                    {inv.pricePerMarla
                                      ? `PKR ${inv.pricePerMarla.toLocaleString()}`
                                      : '—'}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Section>
                  )}

                {/* Amenities */}
                {(profile as SocietyProfileShape).amenities &&
                  ((profile as SocietyProfileShape).amenities?.length ?? 0) >
                    0 && (
                    <Section
                      icon={<Home className="w-4 h-4" />}
                      title={`Amenities (${
                        (profile as SocietyProfileShape).amenities?.length ?? 0
                      })`}
                    >
                      <div className="flex flex-wrap gap-1.5 py-3">
                        {(profile as SocietyProfileShape).amenities?.map(
                          (a) => (
                            <span
                              key={a}
                              className="px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] rounded text-xs font-medium capitalize"
                            >
                              {a.replace(/_/g, ' ')}
                            </span>
                          )
                        )}
                      </div>
                    </Section>
                  )}

                {/* Installment Plans */}
                {(profile as SocietyProfileShape).installmentPlans &&
                  ((profile as SocietyProfileShape).installmentPlans?.length ??
                    0) > 0 && (
                    <Section
                      icon={<Banknote className="w-4 h-4" />}
                      title={`Installment Plans (${
                        (profile as SocietyProfileShape).installmentPlans
                          ?.length ?? 0
                      })`}
                    >
                      <div className="space-y-3 py-3">
                        {(profile as SocietyProfileShape).installmentPlans?.map(
                          (plan, idx) => (
                            <div
                              key={plan._id ?? idx}
                              className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-semibold text-sm text-gray-900">
                                  {plan.planName}
                                </p>
                                {plan.isInterestFree && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                                    Shari&apos;ah-Compliant
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                                <div>
                                  Duration:{' '}
                                  <strong>{plan.durationMonths} mo</strong>
                                </div>
                                <div>
                                  Down Payment:{' '}
                                  <strong>{plan.downPaymentPercent}%</strong>
                                </div>
                                {plan.monthlyInstallmentPercent && (
                                  <div>
                                    Monthly:{' '}
                                    <strong>
                                      {plan.monthlyInstallmentPercent}%
                                    </strong>
                                  </div>
                                )}
                                {plan.quarterlyInstallmentPercent && (
                                  <div>
                                    Quarterly:{' '}
                                    <strong>
                                      {plan.quarterlyInstallmentPercent}%
                                    </strong>
                                  </div>
                                )}
                                {plan.halfYearlyInstallmentPercent && (
                                  <div>
                                    Half-Yearly:{' '}
                                    <strong>
                                      {plan.halfYearlyInstallmentPercent}%
                                    </strong>
                                  </div>
                                )}
                                {plan.balloonPaymentPercent && (
                                  <div>
                                    Balloon:{' '}
                                    <strong>
                                      {plan.balloonPaymentPercent}%
                                    </strong>
                                  </div>
                                )}
                              </div>
                              {plan.notes && (
                                <p className="text-xs text-gray-500 mt-2 italic">
                                  {plan.notes}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </Section>
                  )}

                {/* KYC Documents */}
                {(profile as SocietyProfileShape).kycDocuments &&
                  ((profile as SocietyProfileShape).kycDocuments?.length ?? 0) >
                    0 && (
                    <Section
                      icon={<FileText className="w-4 h-4" />}
                      title={`KYC Documents (${
                        (profile as SocietyProfileShape).kycDocuments?.length ??
                        0
                      })`}
                    >
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 py-3">
                        {(profile as SocietyProfileShape).kycDocuments?.map(
                          (doc, idx) => (
                            <DocumentPreview
                              key={doc._id ?? idx}
                              label={`${doc.title} (${doc.type.replace(
                                /_/g,
                                ' '
                              )})`}
                              asset={{ url: doc.url }}
                            />
                          )
                        )}
                      </div>
                    </Section>
                  )}
              </>
            )}
          </div>

          {/* Right: Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Action panel */}
            {canActOn && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-6">
                <h3 className="font-bold text-gray-900 mb-1">Take Action</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Review carefully before approving
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setModalAction('approve');
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Application
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setModalAction('request_info');
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Request More Info
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setModalAction('reject');
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Application
                  </button>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Note:</strong> All actions are logged and will force
                    the user&apos;s session to refresh on their next request.
                  </p>
                </div>
              </div>
            )}

            {/* Status summary if already actioned */}
            {!canActOn && status === 'approved' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-bold text-green-900 mb-1">
                  Already Approved
                </h3>
                <p className="text-xs text-green-700">
                  This application was approved on{' '}
                  <strong>{formatDate(profile.verifiedAt)}</strong>.
                </p>
              </div>
            )}

            {!canActOn && status === 'suspended' && (
              <div className="bg-gray-100 border border-gray-300 rounded-xl p-5">
                <XCircle className="w-8 h-8 text-gray-600 mb-2" />
                <h3 className="font-bold text-gray-900 mb-1">Suspended</h3>
                <p className="text-xs text-gray-700">
                  Suspended applications cannot be modified through this
                  interface. Contact a senior admin.
                </p>
              </div>
            )}

            {/* Audit Trail */}
            {profile.auditTrail && profile.auditTrail.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#029bba]" />
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Audit Trail
                  </h3>
                  <span className="ml-auto text-xs text-gray-500">
                    {profile.auditTrail.length} entries
                  </span>
                </div>
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {profile.auditTrail
                    .slice()
                    .reverse()
                    .map((entry, idx) => {
                      // Society audit entries have 'note' field
                      const note = (entry as { note?: string }).note;
                      return (
                        <div key={idx} className="px-5 py-3 text-sm">
                          <p className="font-medium text-gray-900 capitalize">
                            {entry.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(entry.performedAt)}
                          </p>
                          {note && (
                            <p className="text-xs text-gray-600 mt-1 italic line-clamp-2">
                              {note}
                            </p>
                          )}
                          {entry.ipAddress && (
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              {entry.ipAddress}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <ActionModal
        action={modalAction ?? 'approve'}
        open={modalAction !== null}
        loading={actionLoading}
        error={actionError}
        onClose={() => {
          if (!actionLoading) {
            setModalAction(null);
            setActionError(null);
          }
        }}
        onConfirm={(reason) => {
          if (modalAction) void submitAction(modalAction, reason);
        }}
      />
    </AdminLayout>
  );
}