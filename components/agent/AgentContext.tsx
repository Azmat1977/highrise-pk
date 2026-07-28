// ========== FILE: components/agent/AgentContext.tsx ==========
// Agent profile context — fetched once in AgentLayout, consumed anywhere
// without duplicate API calls. Fully expanded type — no unsafe casts.
// V6.4.3 — LESSON #196: type expansion over type assertion
// =============================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "info_required";

export type VerificationLevel =
  | "not_verified"
  | "documents_pending"
  | "basic_verified"
  | "license_verified"
  | "full_verified"
  | "premium_verified";

export type AgentType = "individual" | "agency" | "freelance";

export type AgentBadge =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "highrise_verified"
  | "top_performer"
  | "quick_responder"
  | "customer_choice"
  | "premium_member";

export type AgentSpecialization =
  | "residential"
  | "commercial"
  | "plots"
  | "rental"
  | "all";

// ── Sub-types ────────────────────────────────────────────────────────────────

export interface AgentSocialLinks {
  facebook?:  string;
  instagram?: string;
  linkedin?:  string;
  youtube?:   string;
  twitter?:   string;
  tiktok?:    string;
  website?:   string;
}

export interface AgentBusinessHours {
  weekdays?: string;
  weekends?: string;
}

export interface AgentExperience {
  years:        number;
  totalDeals?:  number;
  totalValue?:  number;
}

export interface AgentServiceAreas {
  cities:     string[];
  localities: string[];
}

export interface AgentStats {
  activeListings:      number;
  totalListings?:      number;
  soldProperties?:     number;
  rentedProperties?:   number;
  totalLeads?:         number;
  convertedLeads?:     number;
  averageResponseTime?: number;
  responseRate?:       number;
  totalViews?:         number;
}

export interface AgentRatings {
  averageRating: number;
  totalReviews:  number;
  breakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  lastReviewAt?: string;
}

export interface AgentTrustScore {
  overall:   number;
  breakdown?: {
    profileComplete:   number;
    documentsVerified: number;
    officeVerified:    number;
    customerRatings:   number;
    dealHistory:       number;
    responseTime:      number;
  };
  lastCalculated?: string;
}

export interface AgentDocumentFile {
  url?:        string;
  publicId?:   string;
  uploadedAt?: string;
}

export interface AgentDocuments {
  profilePhoto?: AgentDocumentFile;
  coverPhoto?:   AgentDocumentFile;
}

export interface AgentOfficeVerification {
  address?:     string;
  city?:        string;
  verifiedAt?:  string;
  isActive?:    boolean;
  // V6.8.13: Coordinates for interactive map picker
  // Populated when agent uses drag-pin location picker
  coordinates?: {
    latitude?:  number;
    longitude?: number;
  };
  verificationNotes?: string;
}

// ── MAIN PROFILE SNAPSHOT (fully expanded) ────────────────────────────────────

export interface AgentProfileSnap {
  _id:               string;
  slug?:             string;

  // Basic
  displayName:       string;
  tagline?:          string;
  about?:            string;

  // Type / Agency
  agentType?:        AgentType;
  agencyName?:       string;
  agencySize?:       "solo" | "small" | "medium" | "large";

  // Contact
  email?:            string;

  // License
  licenseNumber?:    string;
  licenseIssuer?:    string;
  licenseVerified?:  boolean;

  // Location
  city?:             string;
  operatingCities?:  string[];

  // Areas
  serviceAreas?:     AgentServiceAreas;

  // Specializations & Languages
  specializations?:  AgentSpecialization[];
  languages?:        string[];

  // Experience
  experience?:       AgentExperience;

  // Social
  socialLinks?:      AgentSocialLinks;

  // Business hours
  businessHours?:    AgentBusinessHours;

  // Office
  officeVerification?: AgentOfficeVerification;

  // Documents
  documents?:        AgentDocuments;

  // Verification
  status:            AgentStatus;
  verificationLevel: VerificationLevel;
  rejectionReason?:  string;
  infoRequiredReason?: string;
  verifiedAt?:       string;
  submittedForReviewAt?: string;

  // Badges & Achievements
  badges?:           AgentBadge[];

  // Ratings & Stats
  ratings?:          AgentRatings;
  stats?:            AgentStats;
  trustScore?:       AgentTrustScore;

  // Premium & Featured
  isPremium?:        boolean;
  premiumTier?:      "basic" | "pro" | "enterprise";
  isFeatured?:       boolean;
  isAvailable?:      boolean;
  availabilityNote?: string;

  // Timestamps
  memberSince?:      string;
  createdAt?:        string;
  updatedAt?:        string;
}

// ── Context Value ────────────────────────────────────────────────────────────

export interface AgentContextValue {
  /** Full agent profile snapshot — null if not yet loaded or unavailable */
  profile: AgentProfileSnap | null;
  /** True while the first profile fetch is in progress */
  profileLoading: boolean;
  /** Profile completion percentage (0-100) — computed from profile fields */
  profileCompletion: number;
  /** Call after any profile mutation to sync sidebar + all consumers */
  refreshProfile: () => Promise<void>;
}

// ─── Profile Completion Calculator ────────────────────────────────────────────
// Same criteria as backend trustScore.breakdown.profileComplete
// Total: 10 criteria → each worth 10%

function calculateProfileCompletion(profile: AgentProfileSnap | null): number {
  if (!profile) return 0;

  const checks = [
    Boolean(profile.displayName && profile.displayName.length >= 3),
    Boolean(profile.about && profile.about.length >= 100),
    Boolean(profile.tagline && profile.tagline.length >= 10),
    Boolean(profile.documents?.profilePhoto?.url),
    Boolean(profile.documents?.coverPhoto?.url),
    Boolean(
      profile.socialLinks?.facebook ??
      profile.socialLinks?.instagram ??
      profile.socialLinks?.linkedin ??
      profile.socialLinks?.website
    ),
    Boolean(profile.experience?.years && profile.experience.years > 0),
    Boolean(profile.serviceAreas?.cities && profile.serviceAreas.cities.length > 0),
    Boolean(profile.specializations && profile.specializations.length > 0),
    Boolean(profile.languages && profile.languages.length > 0),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AgentContext = createContext<AgentContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAgentContext
 * Must be called inside a component wrapped by AgentLayout.
 * Throws if used outside — catches misuse at development time.
 */
export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error(
      "useAgentContext must be used inside AgentLayout. " +
        "Make sure your page is wrapped with AgentLayout."
    );
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AgentProviderProps {
  children:       React.ReactNode;
  /** Initial profile — passed in by AgentLayout after first fetch */
  initialProfile: AgentProfileSnap | null;
  /** Initial loading state */
  initialLoading: boolean;
}

export function AgentProvider({
  children,
  initialProfile,
  initialLoading,
}: AgentProviderProps): React.ReactElement {
  const [profile, setProfile]         = useState<AgentProfileSnap | null>(initialProfile);
  const [profileLoading, setLoading]  = useState<boolean>(initialLoading);

  // Sync internal state when parent's initial props change
  // (e.g., when AgentLayout finishes its own fetch)
  React.useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  React.useEffect(() => {
    setLoading(initialLoading);
  }, [initialLoading]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/profile", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        success: boolean;
        profile?: AgentProfileSnap | null;
      };
      if (data.success && data.profile) {
        setProfile(data.profile);
      }
    } catch {
      // Refresh failure must not crash consumers
      // Profile stays as last known good state
    } finally {
      setLoading(false);
    }
  }, []);

  const profileCompletion = useMemo(
    () => calculateProfileCompletion(profile),
    [profile]
  );

  const value = useMemo<AgentContextValue>(
    () => ({
      profile,
      profileLoading,
      profileCompletion,
      refreshProfile,
    }),
    [profile, profileLoading, profileCompletion, refreshProfile]
  );

  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
}

// ========== END OF FILE ==========