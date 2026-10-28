// pages/developer/verify.tsx
// ═══════════════════════════════════════════════════════════════
// DEVELOPER VERIFICATION PAGE — Highrise.pk
// Submit profile for admin review + track verification status.
// ═══════════════════════════════════════════════════════════════
// ✅ All 6 status states (draft/pending/approved/rejected/suspended/info_required)
// ✅ Profile completion checklist with visual indicators
// ✅ Submit for review button (only when ready)
// ✅ Rejection reason display with resubmit CTA
// ✅ Info required reason display with update CTA
// ✅ DeveloperLayout (role guard via DeveloperContext)
// ✅ noindex/nofollow — private portal page
// ✅ Lucide React only — no raw SVGs
// ✅ fetch() with credentials:'include'
// ✅ TypeScript strict — no any
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  PauseCircle,
  FileEdit,
  Upload,
  Building2,
  User,
  FileText,
  Lock,
  Image as ImageIcon,
  ChevronRight,
  Loader2,
  RefreshCw,
  Phone,
  MapPin,
  X,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';
import {
  useDeveloperContext,
  type DeveloperProfileSnap,
} from '@/components/developer/DeveloperContext';

// ============================================
// TYPES
// ============================================

interface SubmitResponse {
  success: boolean;
  message?: string;
}

interface BannerState {
  type: 'success' | 'error';
  message: string;
}

// ============================================
// VERIFICATION REQUIREMENTS
// Each item maps to a profile field check
// ============================================

interface RequirementItem {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  check: (p: DeveloperProfileSnap) => boolean;
  fixLink: string;
  fixLabel: string;
  required: boolean;
}

const REQUIREMENTS: RequirementItem[] = [
  {
    key: 'companyName',
    label: 'Company Name',
    description: 'Official registered company name',
    icon: Building2,
    check: (p) => Boolean(p.companyName?.trim()),
    fixLink: '/developer/profile',
    fixLabel: 'Add Company Name',
    required: true,
  },
  {
    key: 'description',
    label: 'Company Description',
    description: 'At least 50 characters describing your company',
    icon: FileText,
    check: (p) => Boolean(p.description && p.description.length >= 50),
    fixLink: '/developer/profile',
    fixLabel: 'Add Description',
    required: true,
  },
  {
    key: 'logo',
    label: 'Company Logo',
    description: 'Official company logo (400×400px recommended)',
    icon: ImageIcon,
    check: (p) => Boolean(p.logo?.url),
    fixLink: '/developer/profile',
    fixLabel: 'Upload Logo',
    required: true,
  },
  {
    key: 'ntn',
    label: 'NTN Number',
    description: 'FBR National Tax Number — encrypted securely',
    icon: Lock,
    check: (p) =>
      Boolean(p.ntnNumberMasked && p.ntnNumberMasked !== 'Not provided'),
    fixLink: '/developer/profile',
    fixLabel: 'Add NTN',
    required: true,
  },
  {
    key: 'secp',
    label: 'SECP Registration',
    description: 'Securities & Exchange Commission registration number',
    icon: Lock,
    check: (p) =>
      Boolean(p.secpNumberMasked && p.secpNumberMasked !== 'Not provided'),
    fixLink: '/developer/profile',
    fixLabel: 'Add SECP Number',
    required: true,
  },
  {
    key: 'authorizedPerson',
    label: 'Authorized Person',
    description: 'Name of the person authorized to act on company behalf',
    icon: User,
    check: (p) => Boolean(p.authorizedPersonName?.trim()),
    fixLink: '/developer/profile',
    fixLabel: 'Add Authorized Person',
    required: true,
  },
  {
    key: 'cnicImages',
    label: 'CNIC Images',
    description: 'Front and back photos of authorized person CNIC',
    icon: Upload,
    check: (p) =>
      Boolean(
        p.legalDocs?.authorizedPersonCnicFrontImage?.url &&
          p.legalDocs?.authorizedPersonCnicBackImage?.url
      ),
    fixLink: '/developer/profile',
    fixLabel: 'Upload CNIC Images',
    required: true,
  },
  {
    key: 'city',
    label: 'Primary City',
    description: 'Your main city of operations',
    icon: MapPin,
    check: (p) => Boolean(p.city?.trim()),
    fixLink: '/developer/profile',
    fixLabel: 'Set City',
    required: true,
  },
  {
    key: 'phone',
    label: 'Phone Number',
    description: 'Company contact number — encrypted securely',
    icon: Phone,
    check: (p) => Boolean(p.phoneMasked && p.phoneMasked !== 'Not provided'),
    fixLink: '/developer/profile',
    fixLabel: 'Add Phone',
    required: true,
  },
  {
    key: 'secpDoc',
    label: 'SECP Certificate Document',
    description: 'Scanned copy of your SECP registration certificate',
    icon: FileText,
    check: (p) => Boolean(p.legalDocs?.secpCertificate?.url),
    fixLink: '/developer/profile',
    fixLabel: 'Upload Certificate',
    required: true,
  },
  {
    key: 'ntnDoc',
    label: 'NTN Certificate Document',
    description: 'Scanned copy of your NTN certificate from FBR',
    icon: FileText,
    check: (p) => Boolean(p.legalDocs?.ntnCertificate?.url),
    fixLink: '/developer/profile',
    fixLabel: 'Upload Certificate',
    required: false,
  },
  {
    key: 'coverImage',
    label: 'Cover Image',
    description: 'Company cover banner (1200×400px recommended)',
    icon: ImageIcon,
    check: (p) => Boolean(p.coverImage?.url),
    fixLink: '/developer/profile',
    fixLabel: 'Upload Cover',
    required: false,
  },
  {
    key: 'officeAddress',
    label: 'Office Address',
    description: 'Complete office address for verification',
    icon: MapPin,
    check: (p) => Boolean(p.officeAddress?.trim()),
    fixLink: '/developer/profile',
    fixLabel: 'Add Address',
    required: false,
  },
];

// ============================================
// STATUS DISPLAY CONFIG
// ============================================

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  bgGradient: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  draft: {
    icon: FileEdit,
    title: 'Profile Not Submitted',
    description:
      'Complete all required fields and submit your profile for admin verification.',
    bgGradient: 'from-gray-50 to-white',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
    borderColor: 'border-gray-200',
  },
  pending: {
    icon: Clock,
    title: 'Under Review',
    description:
      'Your profile is being reviewed by our team. This usually takes 1–2 business days. We will notify you by email.',
    bgGradient: 'from-amber-50 to-white',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
  },
  approved: {
    icon: CheckCircle2,
    title: 'Verified Developer ✅',
    description:
      'Congratulations! Your profile is approved. You can now create projects, list units, and receive leads.',
    bgGradient: 'from-emerald-50 to-white',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
  },
  rejected: {
    icon: XCircle,
    title: 'Application Rejected',
    description:
      'Your application was not approved. Please review the reason below and update your profile to resubmit.',
    bgGradient: 'from-red-50 to-white',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
  },
  suspended: {
    icon: PauseCircle,
    title: 'Account Suspended',
    description:
      'Your account has been temporarily suspended. Please contact our team at developers@highrise.pk or call +92 333 5877106.',
    bgGradient: 'from-orange-50 to-white',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-200',
  },
  info_required: {
    icon: AlertCircle,
    title: 'Additional Information Required',
    description:
      'Our team needs more information to complete verification. Please check the details below and update your profile.',
    bgGradient: 'from-blue-50 to-white',
    iconBg: 'bg-blue-100',
    iconColor: 'text-[#029bba]',
    borderColor: 'border-blue-200',
  },
};

// ============================================
// SKELETON
// ============================================

function VerifySkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-40 bg-gray-200 rounded-2xl" />
      <div className="h-8 bg-gray-200 rounded-xl w-48" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN VERIFY CONTENT
// ============================================

function VerifyContent(): React.ReactElement {
  const {
    profile,
    isLoading,
    error: contextError,
    refreshProfile,
    profileCompletion,
  } = useDeveloperContext();

  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);

  // Auto-dismiss success banner
  useEffect(() => {
    if (banner?.type === 'success') {
      const t = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(t);
    }
  }, [banner]);

  // ── Derived state ──────────────────────────────────────────
  const status = profile?.status ?? 'draft';
  const statusConfig = STATUS_MAP[status] ?? STATUS_MAP.draft;
  const StatusIcon = statusConfig.icon;

  const requiredItems = REQUIREMENTS.filter((r) => r.required);
  const optionalItems = REQUIREMENTS.filter((r) => !r.required);

  const completedRequired = profile
    ? requiredItems.filter((r) => r.check(profile)).length
    : 0;
  const totalRequired = requiredItems.length;
  const allRequiredDone = completedRequired === totalRequired;
  const completionPercent =
    totalRequired > 0
      ? Math.round((completedRequired / totalRequired) * 100)
      : 0;

  const canSubmit =
    allRequiredDone &&
    (status === 'draft' || status === 'rejected' || status === 'info_required');

  // ── Submit for review ──────────────────────────────────────
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setBanner(null);

    try {
      const res = await fetch('/api/developer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ submitForReview: true }),
      });

      const data = (await res.json()) as SubmitResponse;

      if (!res.ok || !data.success) {
        setBanner({
          type: 'error',
          message:
            data.message ?? 'Failed to submit. Please try again.',
        });
        return;
      }

      await refreshProfile();
      setBanner({
        type: 'success',
        message:
          'Profile submitted for review! Our team will verify within 1–2 business days.',
      });
    } catch {
      setBanner({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, submitting, refreshProfile]);

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) return <VerifySkeleton />;

  if (contextError) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-5 m-6">
        <p className="text-sm text-red-800">{contextError}</p>
      </div>
    );
  }

  // ── No profile yet ─────────────────────────────────────────
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-gray-300" />
        </div>
        <h2 className="text-xl font-black text-[#004063] mb-2">
          No Developer Profile Found
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          You need to create your developer profile first before
          submitting for verification.
        </p>
        <Link
          href="/developer/profile"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] hover:bg-[#027a94] text-white font-bold rounded-xl shadow-md text-sm transition-colors"
        >
          <Building2 className="w-4 h-4" />
          Create Developer Profile
        </Link>
      </div>
    );
  }

  // ── Render requirement item ────────────────────────────────
  const renderRequirement = (item: RequirementItem): React.ReactElement => {
    const passed = item.check(profile);
    const IconComp = item.icon;

    return (
      <div
        key={item.key}
        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
          passed
            ? 'bg-emerald-50/50 border-emerald-200'
            : 'bg-white border-gray-200 hover:border-amber-200'
        }`}
      >
        {/* Status indicator */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            passed ? 'bg-emerald-100' : 'bg-gray-100'
          }`}
        >
          {passed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <IconComp className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-bold ${
                passed ? 'text-emerald-800' : 'text-[#004063]'
              }`}
            >
              {item.label}
            </p>
            {item.required && !passed && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full border border-red-200">
                Required
              </span>
            )}
            {!item.required && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded-full">
                Optional
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
        </div>

        {/* Action */}
        {!passed && (
          <Link
            href={item.fixLink}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#029bba]/10 hover:bg-[#029bba]/20 text-[#029bba] text-xs font-semibold transition-colors"
          >
            {item.fixLabel}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Verification — Developer Portal | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-8 pb-20">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#029bba]" />
            Developer Verification
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete the requirements below and submit for admin review
          </p>
        </div>

        {/* Banner */}
        {banner && (
          <div
            className={`mb-6 rounded-xl p-4 flex items-start gap-3 border-l-4 ${
              banner.type === 'success'
                ? 'bg-emerald-50 border-emerald-500'
                : 'bg-red-50 border-red-500'
            }`}
          >
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            )}
            <p
              className={`text-sm font-semibold flex-1 ${
                banner.type === 'success' ? 'text-emerald-800' : 'text-red-800'
              }`}
            >
              {banner.message}
            </p>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══ STATUS CARD ═══════════════════════════════════ */}
        <div
          className={`rounded-2xl border shadow-sm overflow-hidden mb-8 ${statusConfig.borderColor}`}
        >
          <div
            className={`bg-gradient-to-r ${statusConfig.bgGradient} p-6`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${statusConfig.iconBg}`}
              >
                <StatusIcon className={`w-7 h-7 ${statusConfig.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-[#004063]">
                  {statusConfig.title}
                </h2>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  {statusConfig.description}
                </p>

                {/* Rejection reason */}
                {status === 'rejected' && profile.rejectionReason && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">
                      Rejection Reason
                    </p>
                    <p className="text-sm text-red-800">
                      {profile.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Info required reason */}
                {status === 'info_required' && profile.infoRequiredReason && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">
                      What We Need
                    </p>
                    <p className="text-sm text-blue-800">
                      {profile.infoRequiredReason}
                    </p>
                  </div>
                )}

                {/* Approved — quick actions */}
                {status === 'approved' && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/developer/projects/new"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <Building2 className="w-4 h-4" />
                      Add Project
                    </Link>
                    <Link
                      href="/developer/dashboard"
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Go to Dashboard
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar — only for non-approved */}
          {status !== 'approved' && status !== 'suspended' && (
            <div className="px-6 py-4 bg-white border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[#004063]">
                  Requirements Completed
                </p>
                <span className="text-sm font-black text-[#029bba]">
                  {completedRequired}/{totalRequired}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    completionPercent === 100
                      ? 'bg-emerald-500'
                      : completionPercent >= 60
                      ? 'bg-[#029bba]'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ═══ REQUIREMENTS CHECKLIST ════════════════════════ */}
        {status !== 'approved' && status !== 'suspended' && (
          <>
            {/* Required items */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-[#004063] mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#029bba]" />
                Required Documents & Information
              </h3>
              <div className="space-y-3">
                {requiredItems.map(renderRequirement)}
              </div>
            </div>

            {/* Optional items */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-[#004063] mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-400" />
                Optional (Boosts Trust Score)
              </h3>
              <div className="space-y-3">
                {optionalItems.map(renderRequirement)}
              </div>
            </div>

            {/* ═══ SUBMIT SECTION ════════════════════════════ */}
            <div
              className={`rounded-2xl border p-6 ${
                canSubmit
                  ? 'border-[#029bba] bg-gradient-to-r from-[#029bba]/5 to-white'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#004063]">
                    {canSubmit
                      ? 'Ready to Submit!'
                      : 'Complete All Required Items'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {canSubmit
                      ? 'All requirements met. Submit your profile for admin review.'
                      : `${
                          totalRequired - completedRequired
                        } required item${
                          totalRequired - completedRequired !== 1 ? 's' : ''
                        } remaining. Complete them to submit.`}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => void refreshProfile()}
                    className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
                    aria-label="Refresh status"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit || submitting}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
                      canSubmit
                        ? 'bg-[#029bba] hover:bg-[#027a94] text-white shadow-[#029bba]/20'
                        : 'bg-gray-300 text-white cursor-not-allowed'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : status === 'pending' ? (
                      <>
                        <Clock className="w-4 h-4" />
                        Already Submitted
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Submit for Verification
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ SUSPENDED INFO BOX ═══════════════════════════ */}
        {status === 'suspended' && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 text-center">
            <PauseCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#004063] mb-2">
              Account Suspended
            </h3>
            <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
              Aap ka account filhal suspend hai. Kisi bhi query ke liye
              hamari team se rabta karein.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:developers@highrise.pk"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#029bba] text-white text-sm font-semibold rounded-xl hover:bg-[#027a94] transition-colors"
              >
                <FileText className="w-4 h-4" />
                Email Support
              </a>
              <a
                href="tel:+923335877106"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4" />
                +92 333 5877106
              </a>
            </div>
          </div>
        )}

        {/* ═══ INFO BOX ═════════════════════════════════════ */}
        {status !== 'suspended' && (
          <div className="mt-8 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-5">
            <p className="text-xs text-[#1e40af] font-semibold mb-2">
              ℹ️ How Verification Works
            </p>
            <ul className="text-xs text-[#1e40af] space-y-1.5 list-disc list-inside">
              <li>Complete all required fields in your developer profile</li>
              <li>Upload NTN certificate, SECP certificate, and CNIC images</li>
              <li>Click &quot;Submit for Verification&quot; when all requirements are met</li>
              <li>Our team reviews applications within 1–2 business days</li>
              <li>
                Once approved, you can create projects, list units, and receive buyer leads
              </li>
              <li>
                Verified developers get a trust badge and higher visibility on the platform
              </li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================
// PAGE EXPORT
// ============================================

export default function DeveloperVerifyPage(): React.ReactElement {
  return (
    <DeveloperLayout pageTitle="Verification">
      <VerifyContent />
    </DeveloperLayout>
  );
}