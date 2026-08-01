// ========== FILE: hooks/useAuth.ts ==========
// 🔒 ENTERPRISE AUTH HOOK - HIGHRISE.PK
// V6.0.0 — Sprint 1 alignment
//   → Uses canonical Role + Capability + Permission types from lib/auth
//   → Adds authorityRole, capabilities, isVerifiedOwner, isVerifiedAgent
//   → Adds isPhoneVerified, needsPhone for lead capture
//   → Role flags now use capability checks (unified account architecture)
//   → No server-only imports (safe for client bundle)
// ═══════════════════════════════════════════════════════════════

import { useSession } from 'next-auth/react';
import type {
  Capability,
  LegacyMarketplaceRole,
  Permission,
  Role,
} from '@/lib/auth';

// ─── Session Role Type ────────────────────────────────────────
// Session may contain a canonical Role OR a legacy marketplace role
// during migration. This union is safe for both.

export type SessionRole = Role | LegacyMarketplaceRole;

export type OnboardingStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info_required';

export type OnboardingRole = LegacyMarketplaceRole | null;

export type VerificationStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'info_required';

// ─── AuthUser Shape ───────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  displayName: string;

  /** Raw role from session — may be legacy marketplace role during migration */
  role: SessionRole;

  /** Canonical authority role — always one of ROLE_VALUES */
  authorityRole: Role;

  /** Business capabilities — unified account architecture */
  capabilities: Capability[];

  /** Explicit direct permissions */
  permissions: Permission[];

  // Verification flags
  isVerified: boolean;
  kycVerified: boolean;

  isVerifiedOwner: boolean;
  ownerVerificationStatus: VerificationStatus;

  isVerifiedAgent: boolean;
  agentVerificationStatus: VerificationStatus;

  // Phone verification (lead capture)
  isPhoneVerified: boolean;
  needsPhone: boolean;

  // Onboarding
  onboardingStatus: OnboardingStatus;
  onboardingRole: OnboardingRole;

  tokenVersion: number;
  phoneNumber?: string;
  profilePicture?: string | null;
}

// ─── Hook Return Shape ────────────────────────────────────────

export interface UseAuthReturn {
  /** Authenticated user — null when unauthenticated or loading */
  user: AuthUser | null;

  /** True while NextAuth resolves session — show skeleton UI */
  isLoading: boolean;

  /** Raw NextAuth session status */
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';

  /** True when session is resolved and user is logged in */
  isAuthenticated: boolean;

  // ── Authority flags (based on authorityRole) ──
  isSuperAdmin: boolean;
  isAdmin: boolean;         // admin OR superadmin
  isModerator: boolean;     // moderator OR admin OR superadmin
  isFinance: boolean;       // finance OR admin OR superadmin
  isEditor: boolean;        // editor OR admin OR superadmin
  isStaff: boolean;         // any non-user, non-legacy role

  // ── Capability flags (based on capabilities array) ──
  isAgent: boolean;         // has real_estate_agent capability OR is admin
  isDeveloper: boolean;     // has property_developer capability OR is admin
  isSociety: boolean;       // has housing_society capability OR is admin
  isPropertyOwner: boolean; // has property_owner capability OR is admin

  // ── Verification flags ────────────────────────
  isEmailVerified: boolean;
  isKycVerified: boolean;
  isVerifiedOwner: boolean;
  isVerifiedAgent: boolean;
  isPhoneVerified: boolean;
  needsPhone: boolean;

  // ── Onboarding flags ──────────────────────────
  hasOnboardingApplication: boolean;
  isOnboardingPending: boolean;
  isOnboardingApproved: boolean;
  isOnboardingRejected: boolean;
  needsInfo: boolean;

  // ── Convenience accessors ─────────────────────
  userId: string;
  userEmail: string;
  userRole: SessionRole;
  userAuthorityRole: Role;
  userName: string;
  userDisplayName: string;
  userCapabilities: Capability[];
  userPermissions: Permission[];
}

// ─── Type Guards ──────────────────────────────────────────────

function hasCapability(
  capabilities: Capability[] | undefined,
  target: Capability,
): boolean {
  return Array.isArray(capabilities) && capabilities.includes(target);
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * useAuth — Centralized authentication state for all components.
 *
 * Reads from NextAuth session (httpOnly JWT cookie).
 * Never uses localStorage — XSS-safe.
 * Never trusts client-side flag mutations.
 *
 * Session shape is owned by types/next-auth.d.ts and populated by
 * pages/api/auth/[...nextauth].ts using buildTrustedSessionClaims().
 *
 * @example
 *   const { isAuthenticated, isAdmin, isKycVerified, user } = useAuth();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!isAuthenticated) return <LoginPrompt />;
 *   if (!isKycVerified) return <KycRequired />;
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  // Build typed user from session — null when unauthenticated
  const user: AuthUser | null =
    isAuthenticated && session?.user
      ? {
          id: session.user.id ?? '',
          email: session.user.email ?? '',
          name: session.user.name ?? '',
          displayName: session.user.displayName ?? session.user.name ?? '',
          role: (session.user.role ?? 'user') as SessionRole,
          authorityRole: (session.user.authorityRole ?? 'user') as Role,
          capabilities: (session.user.capabilities ?? []) as Capability[],
          permissions: (session.user.permissions ?? []) as Permission[],
          isVerified: session.user.isVerified ?? false,
          kycVerified: session.user.kycVerified ?? false,
          isVerifiedOwner: session.user.isVerifiedOwner ?? false,
          ownerVerificationStatus: (session.user.ownerVerificationStatus ??
            'none') as VerificationStatus,
          isVerifiedAgent: session.user.isVerifiedAgent ?? false,
          agentVerificationStatus: (session.user.agentVerificationStatus ??
            'none') as VerificationStatus,
          isPhoneVerified: session.user.isPhoneVerified ?? false,
          needsPhone: session.user.needsPhone ?? false,
          onboardingStatus: (session.user.onboardingStatus ??
            'none') as OnboardingStatus,
          onboardingRole: (session.user.onboardingRole ??
            null) as OnboardingRole,
          tokenVersion: session.user.tokenVersion ?? 0,
          phoneNumber: session.user.phoneNumber ?? undefined,
          profilePicture: session.user.profilePicture ?? null,
        }
      : null;

  // ── Authority flags ────────────────────────────────────────
  const authorityRole: Role = user?.authorityRole ?? 'user';
  const isSuperAdmin = authorityRole === 'superadmin';
  const isAdmin = authorityRole === 'admin' || isSuperAdmin;
  const isModerator = authorityRole === 'moderator' || isAdmin;
  const isFinance = authorityRole === 'finance' || isAdmin;
  const isEditor = authorityRole === 'editor' || isAdmin;
  const isStaff = authorityRole !== 'user';

  // ── Capability flags (unified account architecture) ────────
  const capabilities = user?.capabilities ?? [];
  const isAgent = hasCapability(capabilities, 'real_estate_agent') || isAdmin;
  const isDeveloper =
    hasCapability(capabilities, 'property_developer') || isAdmin;
  const isSociety = hasCapability(capabilities, 'housing_society') || isAdmin;
  const isPropertyOwner =
    hasCapability(capabilities, 'property_owner') || isAdmin;

  // ── Verification flags ─────────────────────────────────────
  const isEmailVerified = user?.isVerified ?? false;
  const isKycVerified = user?.kycVerified ?? false;
  const isVerifiedOwner = user?.isVerifiedOwner ?? false;
  const isVerifiedAgent = user?.isVerifiedAgent ?? false;
  const isPhoneVerified = user?.isPhoneVerified ?? false;
  const needsPhone = user?.needsPhone ?? false;

  // ── Onboarding flags ───────────────────────────────────────
  const onboardingStatus: OnboardingStatus =
    user?.onboardingStatus ?? 'none';
  const hasOnboardingApplication = onboardingStatus !== 'none';
  const isOnboardingPending = onboardingStatus === 'pending';
  const isOnboardingApproved = onboardingStatus === 'approved';
  const isOnboardingRejected = onboardingStatus === 'rejected';
  const needsInfo = onboardingStatus === 'info_required';

  return {
    // Core
    user,
    isLoading,
    sessionStatus: status,
    isAuthenticated,

    // Authority flags
    isSuperAdmin,
    isAdmin,
    isModerator,
    isFinance,
    isEditor,
    isStaff,

    // Capability flags
    isAgent,
    isDeveloper,
    isSociety,
    isPropertyOwner,

    // Verification flags
    isEmailVerified,
    isKycVerified,
    isVerifiedOwner,
    isVerifiedAgent,
    isPhoneVerified,
    needsPhone,

    // Onboarding flags
    hasOnboardingApplication,
    isOnboardingPending,
    isOnboardingApproved,
    isOnboardingRejected,
    needsInfo,

    // Convenience accessors
    userId: user?.id ?? '',
    userEmail: user?.email ?? '',
    userRole: user?.role ?? 'user',
    userAuthorityRole: authorityRole,
    userName: user?.name ?? '',
    userDisplayName: user?.displayName ?? user?.name ?? '',
    userCapabilities: capabilities,
    userPermissions: user?.permissions ?? [],
  };
}

// ========== END OF FILE ==========