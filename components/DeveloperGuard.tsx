// components/DeveloperGuard.tsx
// ═══════════════════════════════════════════════════════════════
// DEVELOPER GUARD — Highrise.pk
// Protects developer-only UI sections and pages.
// Reads from DeveloperContext — never fetches independently.
// ═══════════════════════════════════════════════════════════════
// ✅ Reads profile from DeveloperContext — no duplicate fetch
// ✅ useSession() only — no localStorage
// ✅ All 5 status states handled (draft/pending/approved/rejected/suspended)
// ✅ No as any — session typed via next-auth.d.ts
// ✅ No inline style={} — Tailwind only
// ✅ noindex on all guard UI states
// ✅ Correct redirect paths (/login, /onboarding/business)
// ✅ TypeScript strict — no any
// ═══════════════════════════════════════════════════════════════

import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import {
  Lock,
  Clock,
  XCircle,
  PauseCircle,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useDeveloperContext } from "./developer/DeveloperContext";

// ============================================
// TYPES
// ============================================

interface DeveloperGuardProps {
  children: React.ReactNode;
  /**
   * If true (default): profile must be status === "approved" to pass.
   * If false: any profile (including pending/draft) passes through.
   * Rejected and suspended always block regardless of this flag.
   */
  requireApproval?: boolean;
}

// ============================================
// SHARED — noindex head for all guard states
// ============================================

function GuardHead({ title }: { title: string }) {
  return (
    <Head>
      <title>{title} | Highrise.pk</title>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />
    </Head>
  );
}

// ============================================
// STATE SCREENS
// ============================================

function NotLoggedInScreen() {
  const router = useRouter();
  const returnUrl = encodeURIComponent(router.asPath);

  return (
    <>
      <GuardHead title="Login Required" />
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#029bba]/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#029bba]" />
          </div>

          <h1 className="text-2xl font-bold text-[#004063] mb-2">
            Login Required
          </h1>
          <p className="text-[#666666] mb-8">
            Please log in to access the developer portal.
          </p>

          <div className="space-y-3">
            <Link
              href={`/login?callbackUrl=${returnUrl}`}
              className="block w-full py-3 px-6 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-center transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/login?mode=signup"
              className="block w-full py-3 px-6 rounded-xl border border-gray-300 text-[#333333] font-semibold text-center hover:bg-gray-50 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function NoProfileScreen() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <>
      <GuardHead title="Become a Developer" />
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#029bba]/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-[#029bba]" />
          </div>

          <h1 className="text-2xl font-bold text-[#004063] mb-3">
            Register as Developer
          </h1>
          <p className="text-[#666666] mb-6">
            To list projects on Highrise.pk, you need to register as a{" "}
            <strong>Builder</strong> or <strong>Developer</strong> and get
            verified.
          </p>

          {/* Benefits */}
          <div className="bg-gradient-to-br from-[#029bba]/5 to-[#004063]/5 rounded-xl p-5 mb-8 text-left">
            <p className="font-semibold text-[#004063] mb-3">
              What you get:
            </p>
            <ul className="space-y-2">
              {[
                "List unlimited projects with units",
                "Verified developer badge for buyer trust",
                "Public company profile page",
                "Dashboard with leads & analytics",
                "Priority listing in search results",
              ].map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-2 text-sm text-[#333333]"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <Link
              href="/onboarding/business"
              className="block w-full py-3 px-6 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-center transition-colors shadow-md shadow-[#029bba]/25"
            >
              Start Developer Registration
            </Link>
            <button
              type="button"
              onClick={() => router.back()}
              className="block w-full py-3 px-6 rounded-xl border border-gray-300 text-[#333333] font-semibold text-center hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
          </div>

          {/* Logged in as hint */}
          {session?.user?.email && (
            <p className="mt-6 text-sm text-[#666666]">
              Logged in as:{" "}
              <span className="font-medium text-[#333333]">
                {session.user.email}
              </span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function PendingScreen({ companyName }: { companyName?: string }) {
  return (
    <>
      <GuardHead title="Profile Under Review" />
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#fef3c7] flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-[#f59e0b]" />
          </div>

          <h1 className="text-2xl font-bold text-[#004063] mb-3">
            Profile Under Review
          </h1>
          <p className="text-[#666666] mb-6">
            Your developer profile is being reviewed by our team. This usually
            takes{" "}
            <strong className="text-[#333333]">1–2 business days</strong>.
          </p>

          {/* Company card */}
          {companyName && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666666]">Company:</span>
                <span className="font-semibold text-[#333333]">
                  {companyName}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-[#666666]">Status:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fef3c7] text-[#f59e0b]">
                  <Clock className="w-3 h-3" />
                  Pending Approval
                </span>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="bg-[#eff6ff] border-l-4 border-[#029bba] rounded-xl p-4 mb-8 text-left">
            <p className="text-sm font-medium text-[#004063]">
              What happens next?
            </p>
            <p className="text-sm text-[#333333] mt-1">
              Once approved, you&apos;ll be able to add projects, manage leads,
              and access your full developer dashboard. We&apos;ll email you
              immediately.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/developer/profile"
              className="block w-full py-3 px-6 rounded-xl border-2 border-[#029bba] text-[#029bba] font-semibold text-center hover:bg-[#029bba]/5 transition-colors"
            >
              View / Edit Profile
            </Link>
            <Link
              href="/"
              className="block w-full py-3 px-6 rounded-xl border border-gray-300 text-[#333333] font-semibold text-center hover:bg-gray-50 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function RejectedScreen({
  companyName,
  rejectionReason,
}: {
  companyName?: string;
  rejectionReason?: string;
}) {
  return (
    <>
      <GuardHead title="Application Not Approved" />
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-[#ef4444]" />
          </div>

          <h1 className="text-2xl font-bold text-[#004063] mb-3">
            Application Not Approved
          </h1>
          <p className="text-[#666666] mb-6">
            Your developer profile was not approved. Please review the
            information below, update your profile, and resubmit.
          </p>

          {/* Company card */}
          {companyName && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666666]">Company:</span>
                <span className="font-semibold text-[#333333]">
                  {companyName}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-[#666666]">Status:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fef2f2] text-[#ef4444]">
                  <XCircle className="w-3 h-3" />
                  Rejected
                </span>
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {rejectionReason ? (
            <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-medium text-[#004063]">
                Reason for rejection:
              </p>
              <p className="text-sm text-[#333333] mt-1">{rejectionReason}</p>
            </div>
          ) : (
            <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b] rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-medium text-[#004063]">
                Common reasons for rejection:
              </p>
              <ul className="text-sm text-[#333333] mt-1 space-y-1 list-disc list-inside">
                <li>Unclear or invalid SECP / NTN documents</li>
                <li>Incomplete company information</li>
                <li>Mismatched registration details</li>
                <li>Low quality or unreadable document scans</li>
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/developer/profile"
              className="block w-full py-3 px-6 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-center transition-colors shadow-md shadow-[#029bba]/25"
            >
              Update & Resubmit
            </Link>
            <Link
              href="/contact"
              className="block w-full py-3 px-6 rounded-xl border border-gray-300 text-[#333333] font-semibold text-center hover:bg-gray-50 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function SuspendedScreen({ companyName }: { companyName?: string }) {
  return (
    <>
      <GuardHead title="Account Suspended" />
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#fef3c7] flex items-center justify-center mx-auto mb-6">
            <PauseCircle className="w-10 h-10 text-[#f59e0b]" />
          </div>

          <h1 className="text-2xl font-bold text-[#004063] mb-3">
            Account Suspended
          </h1>
          <p className="text-[#666666] mb-6">
            Your developer account has been temporarily suspended. Contact our
            support team to resolve this.
          </p>

          {/* Company card */}
          {companyName && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666666]">Company:</span>
                <span className="font-semibold text-[#333333]">
                  {companyName}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-[#666666]">Status:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fef3c7] text-[#f59e0b]">
                  <PauseCircle className="w-3 h-3" />
                  Suspended
                </span>
              </div>
            </div>
          )}

          <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b] rounded-xl p-4 mb-8 text-left">
            <p className="text-sm font-medium text-[#004063]">
              What can I do?
            </p>
            <p className="text-sm text-[#333333] mt-1">
              Contact our developer support team at{" "}
              <a
                href="mailto:developers@highrise.pk"
                className="text-[#029bba] font-medium hover:underline"
              >
                developers@highrise.pk
              </a>{" "}
              with your company name and registered email to appeal this
              decision.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="mailto:developers@highrise.pk"
              className="block w-full py-3 px-6 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-center transition-colors"
            >
              Email Support
            </a>
            <Link
              href="/"
              className="block w-full py-3 px-6 rounded-xl border border-gray-300 text-[#333333] font-semibold text-center hover:bg-gray-50 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function LoadingScreen() {
  return (
    <>
      <GuardHead title="Loading" />
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#666666]">Checking access...</p>
        </div>
      </div>
    </>
  );
}

// ============================================
// MAIN GUARD COMPONENT
// ============================================

export default function DeveloperGuard({
  children,
  requireApproval = true,
}: DeveloperGuardProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { profile, isLoading } = useDeveloperContext();

  // ──────────────────────────────────────────
  // STATE 1 — Session still loading
  // ──────────────────────────────────────────
  if (sessionStatus === "loading" || isLoading) {
    return <LoadingScreen />;
  }

  // ──────────────────────────────────────────
  // STATE 2 — Not authenticated
  // ──────────────────────────────────────────
  if (sessionStatus === "unauthenticated" || !session) {
    return <NotLoggedInScreen />;
  }

  // ──────────────────────────────────────────
  // STATE 3 — Admin bypass (always granted)
  // ──────────────────────────────────────────
  if (session.user.role === "admin") {
    return <>{children}</>;
  }

  // ──────────────────────────────────────────
  // STATE 4 — Not a developer role
  // ──────────────────────────────────────────
  if (session.user.role !== "developer") {
    return <NoProfileScreen />;
  }

  // ──────────────────────────────────────────
  // STATE 5 — Developer role but no profile yet
  // ──────────────────────────────────────────
  if (!profile) {
    return <NoProfileScreen />;
  }

  // ──────────────────────────────────────────
  // STATE 6 — Profile rejected (always blocks)
  // ──────────────────────────────────────────
  if (profile.status === "rejected") {
    return (
      <RejectedScreen
        companyName={profile.companyName}
        rejectionReason={profile.rejectionReason}
      />
    );
  }

  // ──────────────────────────────────────────
  // STATE 7 — Account suspended (always blocks)
  // ──────────────────────────────────────────
  if (profile.status === "suspended") {
    return <SuspendedScreen companyName={profile.companyName} />;
  }

  // ──────────────────────────────────────────
  // STATE 8 — Profile pending or draft + requireApproval
  // ──────────────────────────────────────────
  if (
    requireApproval &&
    (profile.status === "pending" || profile.status === "draft")
  ) {
    return <PendingScreen companyName={profile.companyName} />;
  }

  // ──────────────────────────────────────────
  // STATE 9 — Access granted
  // Covers:
  //   - status === "approved" (always)
  //   - status === "pending"/"draft" when requireApproval === false
  // ──────────────────────────────────────────
  return <>{children}</>;
}