// ========== FILE: pages/agent/verify.tsx ==========
// Agent Verification Status Page — V6.8.0
// Shows agent their current verification state and next actions
// 6 states: none, draft, pending, approved, rejected, suspended, info_required
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileEdit,
  Mail,
  ArrowRight,
  Loader2,
  ExternalLink,
  Phone,
  MessageSquare,
  Info,
  Upload,
  RefreshCw,
} from "lucide-react";
import AgentLayout from "@/components/agent/AgentLayout";
import { useAgentContext, type AgentProfileSnap } from "@/components/agent/AgentContext";

// ─── State Configurations ─────────────────────────────────────────────────────

interface StateConfig {
  bgGradient:  string;
  iconBg:      string;
  iconColor:   string;
  icon:        React.ReactNode;
  title:       string;
  subtitle:    string;
  cardBg:      string;
  cardBorder:  string;
}

const STATE_CONFIG: Record<string, StateConfig> = {
  none: {
    bgGradient: "from-gray-500 to-gray-600",
    iconBg:     "bg-gray-100",
    iconColor:  "text-gray-500",
    icon:       <FileEdit className="w-8 h-8" />,
    title:      "Get Verified as Agent",
    subtitle:   "Start your journey to become a verified real estate agent",
    cardBg:     "bg-gray-50",
    cardBorder: "border-gray-200",
  },
  draft: {
    bgGradient: "from-gray-500 to-gray-600",
    iconBg:     "bg-gray-100",
    iconColor:  "text-gray-500",
    icon:       <FileEdit className="w-8 h-8" />,
    title:      "Application Draft",
    subtitle:   "Complete your application to submit for review",
    cardBg:     "bg-gray-50",
    cardBorder: "border-gray-200",
  },
  pending: {
    bgGradient: "from-[#029bba] to-[#027a94]",
    iconBg:     "bg-[#029bba]/10",
    iconColor:  "text-[#029bba]",
    icon:       <Clock className="w-8 h-8" />,
    title:      "Under Review",
    subtitle:   "Our team is reviewing your application",
    cardBg:     "bg-blue-50",
    cardBorder: "border-blue-200",
  },
  info_required: {
    bgGradient: "from-amber-500 to-amber-600",
    iconBg:     "bg-amber-100",
    iconColor:  "text-amber-600",
    icon:       <Info className="w-8 h-8" />,
    title:      "Additional Info Required",
    subtitle:   "Please provide the information requested below",
    cardBg:     "bg-amber-50",
    cardBorder: "border-amber-200",
  },
  approved: {
    bgGradient: "from-[#10b981] to-[#059669]",
    iconBg:     "bg-[#10b981]/10",
    iconColor:  "text-[#10b981]",
    icon:       <CheckCircle className="w-8 h-8" />,
    title:      "Verified Agent",
    subtitle:   "You are a verified professional on Highrise.pk",
    cardBg:     "bg-emerald-50",
    cardBorder: "border-emerald-200",
  },
  rejected: {
    bgGradient: "from-red-500 to-red-600",
    iconBg:     "bg-red-100",
    iconColor:  "text-red-600",
    icon:       <XCircle className="w-8 h-8" />,
    title:      "Application Not Approved",
    subtitle:   "You may reapply after addressing the concerns below",
    cardBg:     "bg-red-50",
    cardBorder: "border-red-200",
  },
  suspended: {
    bgGradient: "from-orange-500 to-orange-600",
    iconBg:     "bg-orange-100",
    iconColor:  "text-orange-600",
    icon:       <AlertTriangle className="w-8 h-8" />,
    title:      "Account Suspended",
    subtitle:   "Your agent access has been temporarily disabled",
    cardBg:     "bg-orange-50",
    cardBorder: "border-orange-200",
  },
};

// ─── Progress Steps (for pending/info_required) ───────────────────────────────

interface StepProps {
  number:      number;
  label:       string;
  status:      "complete" | "current" | "pending";
  description: string;
}

function ProgressStep({ number, label, status, description }: StepProps): React.ReactElement {
  const isComplete = status === "complete";
  const isCurrent  = status === "current";

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
            isComplete
              ? "bg-[#10b981] text-white"
              : isCurrent
              ? "bg-[#029bba] text-white animate-pulse"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {isComplete ? <CheckCircle className="w-5 h-5" /> : number}
        </div>
        {number < 3 && (
          <div
            className={`w-0.5 h-16 mt-2 transition-all ${
              isComplete ? "bg-[#10b981]" : "bg-gray-200"
            }`}
          />
        )}
      </div>
      <div className="flex-1 pb-8">
        <p
          className={`font-bold text-sm ${
            isComplete
              ? "text-[#10b981]"
              : isCurrent
              ? "text-[#029bba]"
              : "text-gray-400"
          }`}
        >
          {label}
        </p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon:  React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-100">
      <div className="w-10 h-10 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function VerifyContent(): React.ReactElement {
  const { data: session }         = useSession();
  const { profile, profileLoading, refreshProfile } = useAgentContext();
  const [refreshing, setRefreshing] = useState(false);

  const status = profile?.status ?? "none";
  const config = STATE_CONFIG[status] ?? STATE_CONFIG.none;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mb-4" />
        <p className="text-sm text-gray-500">Loading verification status...</p>
      </div>
    );
  }

  const userName    = profile?.displayName ?? session?.user?.name ?? "Agent";
  const submittedAt = profile?.submittedForReviewAt ?? profile?.createdAt;

  return (
    <div className="p-4 md:p-6 pb-12 max-w-5xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#004063] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#029bba]" />
            Verification Status
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View your agent verification progress and status
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 text-gray-500 hover:text-[#029bba] bg-white border border-gray-200 rounded-xl transition-colors disabled:opacity-60"
          title="Refresh Status"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Hero Status Card ──────────────────────────────────────────── */}
      <div className={`rounded-2xl overflow-hidden shadow-sm border ${config.cardBorder} mb-6`}>
        <div className={`bg-gradient-to-r ${config.bgGradient} p-6 text-white`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0`}>
              {config.icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black">{config.title}</h2>
              <p className="text-sm text-white/90 mt-1">{config.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Body varies by status */}
        <div className={`p-6 ${config.cardBg}`}>

          {/* ── STATE: NONE (no profile yet) ─────────────────────────── */}
          {status === "none" && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Get verified to unlock all agent features on Highrise.pk. Complete the onboarding
                form to submit your application.
              </p>
              <Link
                href="/onboarding/business?role=agent"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold shadow-md transition-colors"
              >
                Start Verification
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* ── STATE: DRAFT ─────────────────────────────────────────── */}
          {status === "draft" && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                You have a saved draft application. Complete it and submit for review.
              </p>
              <Link
                href="/onboarding/business?role=agent"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold shadow-md transition-colors"
              >
                Continue Application
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* ── STATE: PENDING (under review) ────────────────────────── */}
          {status === "pending" && (
            <div>
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Review Timeline</h3>
                <ProgressStep
                  number={1}
                  label="Documents Submitted"
                  status="complete"
                  description="Your application has been received"
                />
                <ProgressStep
                  number={2}
                  label="Admin Reviewing"
                  status="current"
                  description="Our team is verifying your documents (24-48 hours)"
                />
                <ProgressStep
                  number={3}
                  label="Decision"
                  status="pending"
                  description="You'll receive an email with the result"
                />
              </div>
              <div className="bg-white rounded-xl p-4 border border-blue-100">
                <p className="text-xs text-gray-500">
                  💡 <strong className="text-gray-700">Tip:</strong> Complete your profile
                  photo and about section while you wait. Complete profiles get approved faster.
                </p>
              </div>
            </div>
          )}

          {/* ── STATE: INFO REQUIRED ─────────────────────────────────── */}
          {status === "info_required" && (
            <div>
              {profile?.infoRequiredReason && (
                <div className="bg-white rounded-xl p-5 border border-amber-200 mb-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-amber-900 mb-2">
                        What We Need From You:
                      </p>
                      <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                        {profile.infoRequiredReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Link
                  href="/agent/profile"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold shadow-md transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Update Profile
                </Link>
                <a
                  href="mailto:support@highrise.pk"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </a>
              </div>
            </div>
          )}

          {/* ── STATE: APPROVED ──────────────────────────────────────── */}
          {status === "approved" && (
            <div>
              <div className="bg-white rounded-xl p-5 border border-emerald-200 mb-5">
                <p className="text-sm text-emerald-800 font-medium">
                  🎉 Congratulations! You have full access to Highrise.pk agent features:
                </p>
                <ul className="mt-3 space-y-2">
                  {[
                    "List unlimited properties",
                    "Receive verified buyer leads",
                    "Verified Agent badge on your profile",
                    "Public agent profile visible to buyers",
                    "Performance analytics dashboard",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-emerald-800">
                      <CheckCircle className="w-4 h-4 text-[#10b981] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/agent/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold shadow-md transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/add-property"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#10b981] hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition-colors"
                >
                  Add Property
                </Link>
                {profile?.slug && (
                  <a
                    href={`/agent/${profile.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
                  >
                    View Public Profile
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── STATE: REJECTED ──────────────────────────────────────── */}
          {status === "rejected" && (
            <div>
              {profile?.rejectionReason && (
                <div className="bg-white rounded-xl p-5 border border-red-200 mb-5">
                  <p className="text-sm font-bold text-red-900 mb-2">Reason for Rejection:</p>
                  <p className="text-sm text-red-800 leading-relaxed whitespace-pre-wrap">
                    {profile.rejectionReason}
                  </p>
                </div>
              )}
              <div className="bg-white rounded-xl p-5 border border-gray-100 mb-5">
                <p className="text-sm font-bold text-gray-900 mb-3">Next Steps:</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-[#029bba] font-bold">1.</span>
                    Address the concerns mentioned above
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#029bba] font-bold">2.</span>
                    Prepare updated documents if required
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#029bba] font-bold">3.</span>
                    Submit a new application
                  </li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/onboarding/business?role=agent&reapply=1"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold shadow-md transition-colors"
                >
                  Reapply Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="mailto:support@highrise.pk"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </a>
              </div>
            </div>
          )}

          {/* ── STATE: SUSPENDED ─────────────────────────────────────── */}
          {status === "suspended" && (
            <div>
              <div className="bg-white rounded-xl p-5 border border-orange-200 mb-5">
                <p className="text-sm text-orange-800 mb-3">
                  <strong>Your account access has been restricted.</strong> To appeal or
                  resolve this issue, please contact our support team.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  <InfoCard
                    label="Email Support"
                    value="support@highrise.pk"
                    icon={<Mail className="w-5 h-5" />}
                  />
                  <InfoCard
                    label="Phone Support"
                    value="+92 333 5877106"
                    icon={<Phone className="w-5 h-5" />}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <a
                  href="mailto:support@highrise.pk"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold shadow-md transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email Support
                </a>
                <a
                  href="https://wa.me/923335877106"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] hover:bg-green-600 text-white text-sm font-bold shadow-md transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Application Details (if profile exists) ─────────────────── */}
      {profile && status !== "none" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Application Details</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoCard
              label="Agent Name"
              value={userName}
              icon={<ShieldCheck className="w-5 h-5" />}
            />
            {profile.agencyName && (
              <InfoCard
                label="Agency Name"
                value={profile.agencyName}
                icon={<ShieldCheck className="w-5 h-5" />}
              />
            )}
            {profile.city && (
              <InfoCard
                label="Primary City"
                value={profile.city}
                icon={<ShieldCheck className="w-5 h-5" />}
              />
            )}
            {submittedAt && (
              <InfoCard
                label="Submitted On"
                value={new Date(submittedAt).toLocaleDateString("en-PK", {
                  day:   "numeric",
                  month: "long",
                  year:  "numeric",
                })}
                icon={<Clock className="w-5 h-5" />}
              />
            )}
            {profile.verifiedAt && (
              <InfoCard
                label="Verified On"
                value={new Date(profile.verifiedAt).toLocaleDateString("en-PK", {
                  day:   "numeric",
                  month: "long",
                  year:  "numeric",
                })}
                icon={<CheckCircle className="w-5 h-5" />}
              />
            )}
            <InfoCard
              label="Verification Level"
              value={profile.verificationLevel?.replace(/_/g, " ") ?? "Not Verified"}
              icon={<ShieldCheck className="w-5 h-5" />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function AgentVerifyPage(): React.ReactElement {
  return (
    <AgentLayout
      title="Verification Status | Highrise.pk"
      description="View your agent verification progress on Highrise.pk"
    >
      <VerifyContent />
    </AgentLayout>
  );
}

// ========== END OF FILE ==========