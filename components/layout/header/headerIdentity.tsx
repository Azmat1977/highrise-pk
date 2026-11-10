/**
 * components/layout/header/headerIdentity.tsx
 *
 * Session user types, display-name sanitization and role badge resolution for
 * the global header. Pure helpers: no hooks, no fetching, no side effects.
 */

import React from "react";
import { icons } from "@/lib/design-system/icons";
import { colors } from "@/lib/design-system/tokens";

const MAX_DISPLAY_NAME_LEN = 50;

export interface SessionUser {
  id?: string;
  name?: string;
  email?: string;
  role?: "user" | "developer" | "agent" | "admin";
  displayName?: string;
  profilePicture?: string | null;
  isVerified?: boolean;
}

export interface DeveloperProfile {
  _id: string;
  companyName: string;
  status: "draft" | "pending" | "approved" | "rejected";
  isVerified: boolean;
  verificationDate?: string;
}

export interface RoleBadge {
  text: string;
  bg: string;
  color: string;
  icon: React.ReactNode;
}

// ============================================================
// SECURITY UTILITIES
// ============================================================

export function sanitizeDisplayName(raw?: string | null): string {
  if (!raw) return "";
  return String(raw)
    .replace(/[<>'"]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LEN);
}

export function extractFirstName(fullName?: string | null): string {
  if (!fullName) return "";
  const sanitized = sanitizeDisplayName(fullName);
  return sanitized.split(" ")[0] || sanitized;
}

export function getDisplayName(user?: SessionUser | null): string {
  if (!user) return "";
  return (
    sanitizeDisplayName(user.displayName) ||
    extractFirstName(user.name) ||
    sanitizeDisplayName(user.email?.split("@")[0]) ||
    "User"
  );
}

// ============================================================
// ROLE BADGE
// ============================================================

export function getRoleBadge(
  role?: string,
  hasDevProfile?: boolean,
  isDevApproved?: boolean,
  devStatus?: string,
  isVerifiedOwner?: boolean,
  ownerStatus?: string
): RoleBadge {
  if (role === "admin") {
    return {
      text: "Admin",
      bg: colors.warningLight,
      color: colors.warningDark,
      icon: <icons.Shield className="w-3 h-3" />,
    };
  }

  // Verified Owner
  if (isVerifiedOwner) {
    return {
      text: "Verified Owner",
      bg: colors.successLight,
      color: colors.successDark,
      icon: <icons.ShieldCheck className="w-3 h-3" />,
    };
  }
  if (ownerStatus === "pending") {
    return {
      text: "Owner (Pending)",
      bg: colors.warningLight,
      color: colors.warningDark,
      icon: <icons.Clock className="w-3 h-3" />,
    };
  }

  if (role === "developer" || hasDevProfile) {
    if (isDevApproved) {
      return {
        text: "Verified Developer",
        bg: colors.successLight,
        color: colors.successDark,
        icon: <icons.CheckCircle className="w-3 h-3" />,
      };
    }
    if (devStatus === "pending") {
      return {
        text: "Developer (Pending)",
        bg: colors.warningLight,
        color: colors.warningDark,
        icon: <icons.Clock className="w-3 h-3" />,
      };
    }
    if (devStatus === "rejected") {
      return {
        text: "Developer (Rejected)",
        bg: colors.errorLight,
        color: colors.errorDark,
        icon: <icons.XCircle className="w-3 h-3" />,
      };
    }
    return {
      text: "Developer",
      bg: colors.primaryLight,
      color: colors.primary,
      icon: <icons.Building2 className="w-3 h-3" />,
    };
  }

  if (role === "agent") {
    return {
      text: "Agent",
      bg: "#fff7ed",
      color: "#ea580c",
      icon: <icons.Users className="w-3 h-3" />,
    };
  }

  return {
    text: "User",
    bg: colors.gray100,
    color: colors.gray500,
    icon: <icons.User className="w-3 h-3" />,
  };
}