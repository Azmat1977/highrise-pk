// components/developer/VerificationStatusCard.tsx
import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Info,
  Lock,
  Send,
} from 'lucide-react';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

export type ProfileStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'info_required';

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type VerificationLevel =
  | 'not_verified'
  | 'docs_pending'
  | 'docs_verified'
  | 'site_verified'
  | 'fully_verified';

interface VerificationStatusCardProps {
  status:             ProfileStatus;
  kycStatus:          KycStatus;
  verificationLevel:  VerificationLevel;
  rejectionReason?:   string;
  infoRequiredReason?: string;
  suspensionReason?:  string;
  trustScore?:        number;
  isKycLocked?:       boolean;
  onSubmitForReview?: () => void;
  onEditProfile?:     () => void;
  className?:         string;
}

// ════════════════════════════════════════════════════
// STATUS CONFIG
// ════════════════════════════════════════════════════

interface StatusConfig {
  label:       string;
  description: string;
  icon:        React.ReactElement;
  bg:          string;
  border:      string;
  text:        string;
  iconColor:   string;
  pulse?:      boolean;
}

const STATUS_CONFIG: Record<ProfileStatus, StatusConfig> = {
  draft: {
    label:       'Draft',
    description: 'Aapka profile abhi review ke liye submit nahi hua. Profile complete karein aur submit karein.',
    icon:        <FileText className="w-6 h-6" />,
    bg:          'bg-gray-50',
    border:      'border-gray-200',
    text:        'text-gray-700',
    iconColor:   'text-gray-400',
  },
  pending: {
    label:       'Under Review',
    description: 'Aapka profile hamari team review kar rahi hai. Yeh process 24-48 hours le sakta hai.',
    icon:        <Clock className="w-6 h-6" />,
    bg:          'bg-amber-50',
    border:      'border-amber-200',
    text:        'text-amber-800',
    iconColor:   'text-amber-500',
    pulse:       true,
  },
  approved: {
    label:       'Approved',
    description: 'Aapka profile verify ho chuka hai. Ab aap projects create aur manage kar sakte hain.',
    icon:        <ShieldCheck className="w-6 h-6" />,
    bg:          'bg-emerald-50',
    border:      'border-emerald-200',
    text:        'text-emerald-800',
    iconColor:   'text-emerald-500',
  },
  rejected: {
    label:       'Rejected',
    description: 'Aapka profile reject ho gaya hai. Neeche wajah dekhein aur zaruri changes karein.',
    icon:        <ShieldX className="w-6 h-6" />,
    bg:          'bg-red-50',
    border:      'border-red-200',
    text:        'text-red-800',
    iconColor:   'text-red-500',
  },
  suspended: {
    label:       'Suspended',
    description: 'Aapka account filhal suspend hai. Support se contact karein for resolution.',
    icon:        <ShieldAlert className="w-6 h-6" />,
    bg:          'bg-red-50',
    border:      'border-red-300',
    text:        'text-red-800',
    iconColor:   'text-red-600',
  },
  info_required: {
    label:       'Information Required',
    description: 'Hamein aapki taraf se kuch aur information chahiye. Neeche details dekhein.',
    icon:        <AlertCircle className="w-6 h-6" />,
    bg:          'bg-orange-50',
    border:      'border-orange-200',
    text:        'text-orange-800',
    iconColor:   'text-orange-500',
  },
};

// ════════════════════════════════════════════════════
// KYC STATUS CONFIG
// ════════════════════════════════════════════════════

interface KycConfig {
  label:    string;
  icon:     React.ReactElement;
  bg:       string;
  text:     string;
}

const KYC_CONFIG: Record<KycStatus, KycConfig> = {
  none: {
    label: 'KYC Not Submitted',
    icon:  <FileText className="w-4 h-4" />,
    bg:    'bg-gray-100',
    text:  'text-gray-500',
  },
  pending: {
    label: 'KYC Under Review',
    icon:  <Loader2 className="w-4 h-4 animate-spin" />,
    bg:    'bg-amber-100',
    text:  'text-amber-600',
  },
  verified: {
    label: 'KYC Verified',
    icon:  <CheckCircle2 className="w-4 h-4" />,
    bg:    'bg-emerald-100',
    text:  'text-emerald-600',
  },
  rejected: {
    label: 'KYC Rejected',
    icon:  <XCircle className="w-4 h-4" />,
    bg:    'bg-red-100',
    text:  'text-red-600',
  },
};

// ════════════════════════════════════════════════════
// VERIFICATION LEVEL CONFIG
// ════════════════════════════════════════════════════

interface LevelStep {
  label:      string;
  completed:  boolean;
  current:    boolean;
}

function getVerificationSteps(level: VerificationLevel): LevelStep[] {
  const levels: VerificationLevel[] = [
    'not_verified',
    'docs_pending',
    'docs_verified',
    'site_verified',
    'fully_verified',
  ];

  const currentIndex = levels.indexOf(level);

  return [
    {
      label:     'Profile Created',
      completed: currentIndex >= 0,
      current:   currentIndex === 0,
    },
    {
      label:     'Documents Submitted',
      completed: currentIndex >= 1,
      current:   currentIndex === 1,
    },
    {
      label:     'Documents Verified',
      completed: currentIndex >= 2,
      current:   currentIndex === 2,
    },
    {
      label:     'Site Verified',
      completed: currentIndex >= 3,
      current:   currentIndex === 3,
    },
    {
      label:     'Fully Verified',
      completed: currentIndex >= 4,
      current:   currentIndex === 4,
    },
  ];
}

// ════════════════════════════════════════════════════
// TRUST SCORE BAR
// ════════════════════════════════════════════════════

function TrustScoreBar({ score }: { score: number }): React.ReactElement {
  const percentage = Math.max(0, Math.min(100, score));

  let color = 'from-red-400 to-red-500';
  let label = 'Low';

  if (percentage >= 80) {
    color = 'from-emerald-400 to-emerald-600';
    label = 'Excellent';
  } else if (percentage >= 60) {
    color = 'from-green-400 to-green-500';
    label = 'Good';
  } else if (percentage >= 40) {
    color = 'from-amber-400 to-amber-500';
    label = 'Fair';
  } else if (percentage >= 20) {
    color = 'from-orange-400 to-orange-500';
    label = 'Needs Improvement';
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Trust Score
        </span>
        <span className="text-sm font-bold text-gray-700">
          {percentage}/100 — {label}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// VERIFICATION PROGRESS
// ════════════════════════════════════════════════════

function VerificationProgress({
  level,
}: {
  level: VerificationLevel;
}): React.ReactElement {
  const steps = getVerificationSteps(level);

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Verification Progress
      </p>
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex-shrink-0">
              {step.completed ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              ) : step.current ? (
                <div className="w-5 h-5 rounded-full bg-[#029bba] flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
              )}
            </div>

            {/* Label */}
            <span
              className={`text-sm ${
                step.completed
                  ? 'text-emerald-700 font-semibold'
                  : step.current
                  ? 'text-[#029bba] font-semibold'
                  : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>

            {/* Current indicator */}
            {step.current && (
              <span className="px-2 py-0.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-[10px] font-bold">
                CURRENT
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════

export default function VerificationStatusCard({
  status,
  kycStatus,
  verificationLevel,
  rejectionReason,
  infoRequiredReason,
  suspensionReason,
  trustScore,
  isKycLocked,
  onSubmitForReview,
  onEditProfile,
  className = '',
}: VerificationStatusCardProps): React.ReactElement {
  const statusConfig = STATUS_CONFIG[status];
  const kycConfig    = KYC_CONFIG[kycStatus];

  return (
    <div
      className={`
        rounded-2xl border-2 shadow-sm overflow-hidden
        ${statusConfig.bg} ${statusConfig.border}
        ${className}
      `}
    >
      {/* ── Header ── */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Status icon */}
            <div
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                ${statusConfig.iconColor}
                ${statusConfig.bg}
                border ${statusConfig.border}
                ${statusConfig.pulse ? 'animate-pulse' : ''}
              `}
            >
              {statusConfig.icon}
            </div>

            {/* Status label */}
            <div>
              <h3 className={`font-bold text-lg ${statusConfig.text}`}>
                {statusConfig.label}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 max-w-sm">
                {statusConfig.description}
              </p>
            </div>
          </div>

          {/* KYC badge */}
          <div
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              ${kycConfig.bg} ${kycConfig.text}
              text-xs font-semibold flex-shrink-0
            `}
          >
            {kycConfig.icon}
            <span>{kycConfig.label}</span>
            {isKycLocked && (
              <Lock className="w-3 h-3 ml-0.5" />
            )}
          </div>
        </div>

        {/* ── Rejection Reason ── */}
        {status === 'rejected' && rejectionReason && (
          <div className="mt-4 p-3 rounded-xl bg-red-100 border border-red-200">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-600">{rejectionReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Info Required Reason ── */}
        {status === 'info_required' && infoRequiredReason && (
          <div className="mt-4 p-3 rounded-xl bg-orange-100 border border-orange-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">
                  Required Information
                </p>
                <p className="text-sm text-orange-600">{infoRequiredReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Suspension Reason ── */}
        {status === 'suspended' && suspensionReason && (
          <div className="mt-4 p-3 rounded-xl bg-red-100 border border-red-300">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">
                  Suspension Reason
                </p>
                <p className="text-sm text-red-600">{suspensionReason}</p>
                <p className="text-xs text-red-400 mt-2">
                  Contact support at{' '}
                  <a
                    href="mailto:info@highrise.pk"
                    className="underline font-semibold"
                  >
                    info@highrise.pk
                  </a>{' '}
                  or call{' '}
                  <a
                    href="tel:+923335877106"
                    className="underline font-semibold"
                  >
                    +92 333 5877106
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Verification Progress ── */}
        {status !== 'suspended' && (
          <VerificationProgress level={verificationLevel} />
        )}

        {/* ── Trust Score ── */}
        {trustScore !== undefined && status !== 'suspended' && (
          <TrustScoreBar score={trustScore} />
        )}
      </div>

      {/* ── Action Buttons ── */}
      {(status === 'draft' || status === 'rejected' || status === 'info_required') && (
        <div className="px-5 py-4 bg-white/50 border-t border-gray-100">
          <div className="flex flex-wrap gap-3">
            {/* Edit profile */}
            {onEditProfile && (
              <button
                onClick={onEditProfile}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                           bg-white border border-gray-200
                           text-sm font-semibold text-gray-700
                           hover:bg-gray-50 hover:border-gray-300
                           transition-all duration-200"
              >
                <FileText className="w-4 h-4" />
                Edit Profile
              </button>
            )}

            {/* Submit for review */}
            {onSubmitForReview && status === 'draft' && (
              <button
                onClick={onSubmitForReview}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                           bg-gradient-to-r from-[#029bba] to-[#027a94]
                           text-sm font-semibold text-white
                           hover:from-[#02a8c9] hover:to-[#028aaa]
                           hover:shadow-lg transition-all duration-200"
              >
                <Send className="w-4 h-4" />
                Submit for Review
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Resubmit */}
            {onSubmitForReview && (status === 'rejected' || status === 'info_required') && (
              <button
                onClick={onSubmitForReview}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                           bg-gradient-to-r from-[#029bba] to-[#027a94]
                           text-sm font-semibold text-white
                           hover:from-[#02a8c9] hover:to-[#028aaa]
                           hover:shadow-lg transition-all duration-200"
              >
                <Send className="w-4 h-4" />
                Resubmit for Review
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}