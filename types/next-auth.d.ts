import type { DefaultSession, DefaultUser } from "next-auth";
import type {
  Capability,
  LegacyMarketplaceRole,
  Permission,
  Role,
} from "@/lib/auth";

type HighriseRole = Role | LegacyMarketplaceRole;

type OnboardingStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "info_required";

type VerificationStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "info_required";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: HighriseRole;
      authorityRole?: Role;
      capabilities?: Capability[];
      permissions?: Permission[];
      displayName?: string;

      isVerified?: boolean;
      isEmailVerified?: boolean;
      kycVerified?: boolean;

      isVerifiedOwner?: boolean;
      ownerVerificationStatus?: VerificationStatus;

      isVerifiedAgent?: boolean;
      agentVerificationStatus?: VerificationStatus;

      onboardingStatus?: OnboardingStatus;
      onboardingRole?: LegacyMarketplaceRole | null;

      phone?: string;
      phoneNumber?: string;
      isPhoneVerified?: boolean;
      needsPhone?: boolean;

      profilePicture?: string | null;
      tokenVersion?: number;
    } & DefaultSession["user"];

    rememberMe?: boolean;
    sessionMaxAgeSeconds?: number;
    isInvalid?: boolean;
  }

  interface User extends DefaultUser {
    id: string;
    role: HighriseRole;
    authorityRole?: Role;
    capabilities?: Capability[];
    permissions?: Permission[];
    displayName?: string;

    isVerified?: boolean;
    isEmailVerified?: boolean;
    kycVerified?: boolean;

    isVerifiedOwner?: boolean;
    ownerVerificationStatus?: VerificationStatus;

    isVerifiedAgent?: boolean;
    agentVerificationStatus?: VerificationStatus;

    onboardingStatus?: OnboardingStatus;
    onboardingRole?: LegacyMarketplaceRole | null;

    phone?: string;
    phoneNumber?: string;
    isPhoneVerified?: boolean;
    needsPhone?: boolean;

    profilePicture?: string | null;
    tokenVersion?: number;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: HighriseRole;
    authorityRole?: Role;
    capabilities?: Capability[];
    permissions?: Permission[];
    displayName?: string;

    isVerified?: boolean;
    isEmailVerified?: boolean;
    kycVerified?: boolean;

    isVerifiedOwner?: boolean;
    ownerVerificationStatus?: VerificationStatus;

    isVerifiedAgent?: boolean;
    agentVerificationStatus?: VerificationStatus;

    onboardingStatus?: OnboardingStatus;
    onboardingRole?: LegacyMarketplaceRole | null;

    phone?: string;
    phoneNumber?: string;
    isPhoneVerified?: boolean;
    needsPhone?: boolean;

    profilePicture?: string | null;
    tokenVersion?: number;
    rememberMe?: boolean;
    sessionMaxAgeSeconds?: number;
    lastDbCheckAt?: number;
    isInvalid?: boolean;
  }
}