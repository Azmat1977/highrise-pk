// ========== FILE: hooks/useAuth.ts ==========
// 🔒 ENTERPRISE AUTH HOOK - HIGHRISE.PK
// V5.8.0 — Sync with [...nextauth].ts canonical Session shape
//          + Add kycVerified, onboardingStatus, society role
// ═══════════════════════════════════════════════════════════════

import { useSession } from 'next-auth/react';

// ─── NO MODULE AUGMENTATION HERE ──────────────────────────────
// Session typing is owned by pages/api/auth/[...nextauth].ts
// Adding declare module here causes TS2717 (duplicate declaration)
// ──────────────────────────────────────────────────────────────

// ─── Type Definitions ─────────────────────────────────────────

export type UserRole =
  | 'user'
  | 'reader'
  | 'writer'
  | 'editor'
  | 'developer'
  | 'agent'
  | 'society'
  | 'admin';

export type OnboardingStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info_required';

export type OnboardingRole = 'agent' | 'developer' | 'society' | null;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  displayName: string;
  role: UserRole;
  isVerified: boolean;
  kycVerified: boolean;
  onboardingStatus: OnboardingStatus;
  onboardingRole: OnboardingRole;
  tokenVersion: number;
  phoneNumber?: string;
  profilePicture?: string | null;
  permissions: string[];
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

  // ── Role flags (admin inherits all lower roles) ──
  isAdmin: boolean;
  isAgent: boolean;       // true for role: agent OR admin
  isDeveloper: boolean;   // true for role: developer OR admin
  isSociety: boolean;     // true for role: society OR admin

  // ── Verification flags ───────────────────────────
  isEmailVerified: boolean;
  isKycVerified: boolean;

  // ── Onboarding flags ─────────────────────────────
  hasOnboardingApplication: boolean;       // any application submitted
  isOnboardingPending: boolean;            // awaiting admin review
  isOnboardingApproved: boolean;
  isOnboardingRejected: boolean;
  needsInfo: boolean;                      // admin requested more info

  // ── Convenience accessors ────────────────────────
  userId: string;
  userEmail: string;
  userRole: UserRole;
  userName: string;
  userDisplayName: string;
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * useAuth — Centralized authentication state for all components.
 *
 * Reads from NextAuth session (httpOnly JWT cookie).
 * Never uses localStorage — XSS-safe.
 *
 * Session shape is owned by [...nextauth].ts module augmentation.
 *
 * @example
 * const { isAuthenticated, isAdmin, isKycVerified, user } = useAuth();
 *
 * if (isLoading) return <Skeleton />;
 * if (!isAuthenticated) return <LoginPrompt />;
 * if (!isKycVerified) return <KycRequired />;
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  // Build typed user from session — null when unauthenticated
  const user: AuthUser | null = isAuthenticated && session?.user
    ? {
        id: session.user.id ?? '',
        email: session.user.email ?? '',
        name: session.user.name ?? '',
        displayName: session.user.displayName ?? session.user.name ?? '',
        role: (session.user.role ?? 'user') as UserRole,
        isVerified: session.user.isVerified ?? false,
        kycVerified: session.user.kycVerified ?? false,
        onboardingStatus: (session.user.onboardingStatus ?? 'none') as OnboardingStatus,
        onboardingRole: (session.user.onboardingRole ?? null) as OnboardingRole,
        tokenVersion: session.user.tokenVersion ?? 0,
        phoneNumber: session.user.phoneNumber ?? undefined,
        profilePicture: session.user.profilePicture ?? null,
        permissions: session.user.permissions ?? [],
      }
    : null;

  // ── Role flags ─────────────────────────────────────────────
  const role: UserRole = user?.role ?? 'user';
  const isAdmin = role === 'admin';
  const isAgent = role === 'agent' || isAdmin;
  const isDeveloper = role === 'developer' || isAdmin;
  const isSociety = role === 'society' || isAdmin;

  // ── Verification flags ─────────────────────────────────────
  const isEmailVerified = user?.isVerified ?? false;
  const isKycVerified = user?.kycVerified ?? false;

  // ── Onboarding flags ───────────────────────────────────────
  const onboardingStatus: OnboardingStatus = user?.onboardingStatus ?? 'none';
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

    // Role flags
    isAdmin,
    isAgent,
    isDeveloper,
    isSociety,

    // Verification flags
    isEmailVerified,
    isKycVerified,

    // Onboarding flags
    hasOnboardingApplication,
    isOnboardingPending,
    isOnboardingApproved,
    isOnboardingRejected,
    needsInfo,

    // Convenience accessors
    userId: user?.id ?? '',
    userEmail: user?.email ?? '',
    userRole: role,
    userName: user?.name ?? '',
    userDisplayName: user?.displayName ?? user?.name ?? '',
  };
}

// ========== END OF FILE ==========