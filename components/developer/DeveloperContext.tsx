// components/developer/DeveloperContext.tsx
// ═══════════════════════════════════════════════════════════════
// DEVELOPER CONTEXT — Highrise.pk V6.4.5
// Single source of truth for all developer portal pages.
// Profile fetched ONCE here — never re-fetched in page components.
// ═══════════════════════════════════════════════════════════════
// ✅ useSession() only — no localStorage
// ✅ Role enforced at context level
// ✅ Profile fetched once, shared via context
// ✅ refreshProfile() for post-mutation updates
// ✅ All 6 status states handled (including info_required)
// ✅ profileCompletion % calculated (10 criteria × 10%)
// ✅ Trust score from trustScore.overall (0-100)
// ✅ DeveloperProfileSnap expanded — matches toPrivateProfile()
// ✅ Graceful stats fallback (no hard dependency on stats API)
// ✅ TypeScript strict — no any, no unsafe casts
// ═══════════════════════════════════════════════════════════════

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type DeveloperStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "info_required";

export type DeveloperVerificationLevel =
  | "not_verified"
  | "docs_pending"
  | "docs_verified"
  | "site_verified"
  | "fully_verified";

export type DeveloperBadge =
  | "startup"
  | "emerging"
  | "established"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "highrise_verified"
  | "top_developer"
  | "trusted_builder"
  | "on_time_delivery"
  | "premium_partner";

export type KycStatus = "none" | "pending" | "verified" | "rejected";

export type RiskLevel = "low" | "medium" | "high";

// ─── Sub-document types ───────────────────────────────────────

export interface DeveloperSocialLinks {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
  website?: string;
}

export interface DeveloperLegalDocs {
  secpCertificate?: { url: string };
  ntnCertificate?: { url: string };
  memorandum?: { url: string };
  articlesOfAssociation?: { url: string };
  pastProjects?: { url: string }[];
  // V6.5.0 — Authorized person CNIC images
  authorizedPersonCnicFrontImage?: { url: string };
  authorizedPersonCnicBackImage?: { url: string };
}

export interface DeveloperTrustScore {
  overall: number;
  breakdown: {
    profileComplete: number;
    documentsVerified: number;
    siteVerified: number;
    customerRatings: number;
    projectHistory: number;
    onTimeDelivery: number;
  };
  lastCalculated: string;
}

// ── Completed project snapshot (read from API) ────────────────
export interface DeveloperCompletedProject {
  _id?: string;
  projectName: string;
  projectType: string;
  city: string;
  area: string;
  location?: string;
  startYear?: number;
  completionYear: number;
  status: string;
  delayReason?: string;
  expectedResolutionDate?: string;
  totalUnits?: number;
  totalPlots?: number;
  totalArea?: string;
  societyName?: string;
  description?: string;
  images: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
  brochureUrl?: string;
  // Read-only — set by admin only
  isVerified: boolean;
  verifiedAt?: string;
  verificationNotes?: string;
  rejectionReason?: string;
  addedAt?: string;
  updatedAt?: string;
}

export interface DeveloperPortfolio {
  // V6.5.0 — Project list (replaces raw numbers)
  completedProjects?: DeveloperCompletedProject[];
  // Legacy fields — kept for backwards compatibility
  totalUnitsDelivered?: number;
  totalProjectValue?: number;
  totalLandArea?: number;
  awards?: string[];
  certifications?: string[];
  notableProjects?: string[];
}

export interface DeveloperBadgeHistory {
  badge: DeveloperBadge;
  earnedAt: string;
  criteria?: string;
}

export interface DeveloperVerificationHistoryEntry {
  status: string;
  at: string;
  notes?: string;
}

// ─── Main profile snapshot ────────────────────────────────────

/**
 * Safe public+private snapshot of DeveloperProfile.
 * Matches toPrivateProfile() output from /api/developer/profile.ts exactly.
 * No encrypted fields, no hashes, no audit trail.
 */
export interface DeveloperProfileSnap {
  _id: string;
  slug: string;

  // Company info
  companyName: string;
  companyType: string;
  developerType: string;
  establishedYear: number;
  description?: string;
  tagline?: string;
  ceoName?: string;

  // Masked KYC — never real numbers
  ntnNumberMasked?: string;
  secpNumberMasked?: string;
  kycStatus: KycStatus;
  kycLockedAt: string | null;

  // Authorized person
  authorizedPersonName: string;
  authorizedPersonDesignation?: string;
  authorizedPersonEmail?: string;
  authorizedPersonCnicMasked?: string;
  // V6.5.0 — CNIC verification level
  authorizedPersonVerificationLevel?:
    | "unverified"
    | "documents_uploaded"
    | "basic_verified"
    | "fully_verified";

  // Contact — masked
  phoneMasked?: string;
  email: string;
  website?: string;
  officeAddress?: string;
  city: string;
  operatingCities?: string[];
  serviceAreas?: string[];

  // Media
  logo?: { url: string; public_id: string };
  coverImage?: { url: string; public_id: string };
  gallery?: Array<{
    url: string;
    public_id: string;
    caption?: string;
    category?: string;
  }>;

  // Social
  socialLinks?: DeveloperSocialLinks;

  // Legal docs — URLs only
  legalDocs?: DeveloperLegalDocs;

  // Status & verification
  status: DeveloperStatus;
  isVerified: boolean;
  verificationLevel: DeveloperVerificationLevel;
  verificationHistory?: DeveloperVerificationHistoryEntry[];
  rejectionReason?: string;
  infoRequiredReason?: string;

  // Trust & badges
  trustScore?: DeveloperTrustScore;
  highriseScore?: number;
  riskLevel?: RiskLevel;
  badges?: DeveloperBadge[];
  badgeHistory?: DeveloperBadgeHistory[];

  // Stats
  completedProjectsCount: number;
  activeProjectsCount: number;
  averageRating: number;
  totalReviews: number;
  onTimeDeliveryRate?: number;

  // Portfolio
  portfolio?: DeveloperPortfolio;

  // Premium
  isFeatured: boolean;
  isPremiumPartner: boolean;
  premiumTier?: "basic" | "pro" | "enterprise";
  premiumUntil?: string;

  // Analytics
  profileViews: number;
  inquiryCount: number;
  favoriteCount: number;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
}

// ─── Stats shape ──────────────────────────────────────────────

export interface DeveloperStats {
  totalProjects: number;
  activeProjects: number;
  pendingProjects: number;
  totalLeads: number;
  newLeads: number;
  wonLeads: number;
}

// ─── Context value ────────────────────────────────────────────

interface DeveloperContextValue {
  /** Full profile snapshot — null while loading or if not found */
  profile: DeveloperProfileSnap | null;
  /** Profile completion percentage (0-100), calculated from 10 criteria */
  profileCompletion: number;
  /** Aggregated stats for sidebar badges */
  stats: DeveloperStats;
  /** True while first profile fetch is in progress */
  isLoading: boolean;
  /** Non-null if profile fetch failed */
  error: string | null;
  /** Call after any profile mutation to re-fetch */
  refreshProfile: () => Promise<void>;
  /** Call after any stats-affecting action */
  refreshStats: () => Promise<void>;
}

// ============================================
// PROFILE COMPLETION CALCULATOR
// Matches backend trust score criteria
// 10 checks × 10% each = 100%
// ============================================

function calculateProfileCompletion(
  profile: DeveloperProfileSnap | null
): number {
  if (!profile) return 0;

  const checks: boolean[] = [
    // 1. Company name
    Boolean(profile.companyName?.trim()),
    // 2. Description (meaningful — more than 50 chars)
    Boolean(profile.description && profile.description.length > 50),
    // 3. Logo uploaded
    Boolean(profile.logo?.url),
    // 4. Cover image uploaded
    Boolean(profile.coverImage?.url),
    // 5. NTN number submitted (masked value present)
    Boolean(
      profile.ntnNumberMasked &&
        profile.ntnNumberMasked !== "Not provided"
    ),
    // 6. SECP number submitted (masked value present)
    Boolean(
      profile.secpNumberMasked &&
        profile.secpNumberMasked !== "Not provided"
    ),
    // 7. Office address provided
    Boolean(profile.officeAddress?.trim()),
    // 8. City set
    Boolean(profile.city?.trim()),
    // 9. Authorized person name
    Boolean(profile.authorizedPersonName?.trim()),
    // 10. SECP certificate uploaded
    Boolean(profile.legalDocs?.secpCertificate?.url),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_STATS: DeveloperStats = {
  totalProjects: 0,
  activeProjects: 0,
  pendingProjects: 0,
  totalLeads: 0,
  newLeads: 0,
  wonLeads: 0,
};

// ============================================
// CONTEXT
// ============================================

const DeveloperContext = createContext<DeveloperContextValue | null>(null);

// ============================================
// HOOK — throws if used outside DeveloperLayout
// ============================================

export function useDeveloperContext(): DeveloperContextValue {
  const ctx = useContext(DeveloperContext);
  if (!ctx) {
    throw new Error(
      "useDeveloperContext() must be used inside <DeveloperProvider>. " +
        "Wrap your developer page with DeveloperLayout."
    );
  }
  return ctx;
}

// ============================================
// PROVIDER
// ============================================

interface DeveloperProviderProps {
  children: ReactNode;
}

export function DeveloperProvider({
  children,
}: DeveloperProviderProps): React.ReactElement {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<DeveloperProfileSnap | null>(null);
  const [stats, setStats] = useState<DeveloperStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Profile completion — derived, never stored ──────────────
  const profileCompletion = useMemo(
    () => calculateProfileCompletion(profile),
    [profile]
  );

  // ── Fetch Profile ───────────────────────────────────────────
  const fetchProfile = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      const res = await fetch("/api/developer/profile", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.status === 401) {
        void router.replace("/login");
        return;
      }

      if (res.status === 403) {
        void router.replace("/");
        return;
      }

      if (!res.ok) {
        const body = (await res.json()) as { error?: string; message?: string };
        setError(body.message ?? body.error ?? "Failed to load developer profile");
        return;
      }

      const body = (await res.json()) as {
        success: boolean;
        hasProfile: boolean;
        data: DeveloperProfileSnap | null;
      };

      if (body.success && body.data) {
        setProfile(body.data);
      } else {
        // No profile yet — developer needs to create one
        setProfile(null);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load developer profile"
      );
    }
  }, [router]);

  // ── Fetch Stats — graceful, non-critical ───────────────────
  // Stats endpoint may not exist — silently use empty defaults
  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/developer/stats", {
        method: "GET",
        credentials: "include",
      });

      // Non-200 → silently ignore, keep defaults
      if (!res.ok) return;

      const body = (await res.json()) as {
        success: boolean;
        data?: Partial<DeveloperStats>;
      };

      if (body.success && body.data) {
        setStats((prev) => ({ ...prev, ...body.data }));
      }
    } catch {
      // Stats failure is non-critical — silently ignore
      // Dashboard will derive stats from profile fields instead
    }
  }, []);

  // ── Public refresh methods ──────────────────────────────────
  const refreshProfile = useCallback(async (): Promise<void> => {
    await fetchProfile();
  }, [fetchProfile]);

  const refreshStats = useCallback(async (): Promise<void> => {
    await fetchStats();
  }, [fetchStats]);

  // ── Role guard + initial load ───────────────────────────────
  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (sessionStatus === "unauthenticated" || !session) {
      void router.replace("/login");
      return;
    }

    const role = session.user.role;

    if (role !== "developer") {
      // Redirect based on actual role
      if (role === "admin") {
        void router.replace("/admin");
      } else if (role === "agent") {
        // LESSON #195 fix: agents go to agent portal, not login
        void router.replace("/agent/dashboard");
      } else if (role === "society") {
        void router.replace("/society/dashboard");
      } else {
        // Regular user — redirect to home
        void router.replace("/");
      }
      return;
    }

    // Authenticated developer — load data
    const init = async (): Promise<void> => {
      setIsLoading(true);
      // Fetch profile first (primary), stats second (non-critical)
      await fetchProfile();
      void fetchStats(); // fire-and-forget — non-blocking
      setIsLoading(false);
    };

    void init();
  }, [session, sessionStatus, router, fetchProfile, fetchStats]);

  // ── Listen for manual refresh events ───────────────────────
  useEffect(() => {
    const handleStatsRefresh = (): void => {
      void fetchStats();
    };

    window.addEventListener("refreshDeveloperStats", handleStatsRefresh);
    return () => {
      window.removeEventListener("refreshDeveloperStats", handleStatsRefresh);
    };
  }, [fetchStats]);

  // ── Loading state — session resolving ──────────────────────
  if (sessionStatus === "loading") {
    return (
      <div
        className="min-h-screen bg-[#f8f9fa] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#666666]">Loading developer portal...</p>
        </div>
      </div>
    );
  }

  // ── Don't render if wrong role (redirect in progress) ──────
  if (
    sessionStatus === "unauthenticated" ||
    session?.user.role !== "developer"
  ) {
    return (
      <div
        className="min-h-screen bg-[#f8f9fa] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DeveloperContext.Provider
      value={{
        profile,
        profileCompletion,
        stats,
        isLoading,
        error,
        refreshProfile,
        refreshStats,
      }}
    >
      {children}
    </DeveloperContext.Provider>
  );
}