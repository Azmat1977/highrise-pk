import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import type mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import {
  capabilityFromLegacyRole,
  hasPermission as actorHasPermission,
  isLegacyMarketplaceRole,
  normalizeCapabilities,
  normalizePermission,
  normalizePermissions,
  normalizeRole,
  type Actor,
  type Capability,
  type LegacyMarketplaceRole,
  type Permission,
  type Role,
} from "@/lib/auth";

export type UserRole = Role | LegacyMarketplaceRole;
export type OnboardingStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "info_required";

export interface AuthToken {
  id: string;
  email?: string;
  name?: string;
  displayName?: string;
  role: UserRole;
  authorityRole: Role;
  capabilities: Capability[];
  permissions: Permission[];
  actor: Actor;
  isEmailVerified: boolean;
  kycVerified: boolean;
  onboardingStatus: OnboardingStatus;
  onboardingRole?: LegacyMarketplaceRole | null;
  tokenVersion: number;
  phone?: string;
  phoneNumber?: string;
  profilePicture?: string | null;
  rememberMe?: boolean;
  sessionMaxAgeSeconds?: number;
  lastDbCheckAt?: number;
  isInvalid?: boolean;
}

export interface AuthResult {
  success: true;
  token: AuthToken;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isVerified: boolean;
    status: string;
  };
}

export interface AuthError {
  success: false;
  error: string;
  code: string;
}

interface DbUser {
  _id: mongoose.Types.ObjectId | string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: unknown;
  status?: "active" | "pending" | "suspended" | "banned";
  isDeleted?: boolean;
  isVerified?: boolean;
  tokenVersion?: number;
  kycVerified?: boolean;
  onboardingStatus?: OnboardingStatus;
  onboardingRole?: LegacyMarketplaceRole | null;
  capabilities?: unknown[];
  permissions?: unknown[];
  profilePictureUrl?: string | null;
  phone?: string;
  twoFactorAuth?: {
    enabled?: boolean;
    verifiedAt?: Date;
  };
}

const REQUIRE_ADMIN_2FA = process.env.REQUIRE_ADMIN_2FA === "1";

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  return typeof value === "string" ? value.trim() : null;
}

export function getClientIp(req: NextApiRequest): string {
  const cloudflare = firstHeaderValue(req.headers["cf-connecting-ip"]);
  if (cloudflare) {
    return cloudflare;
  }

  const forwarded = firstHeaderValue(req.headers["x-forwarded-for"]);
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = firstHeaderValue(req.headers["x-real-ip"]);
  return realIp || req.socket?.remoteAddress || "unknown";
}

function hashIp(ip: string): string | undefined {
  const secret =
    process.env.SECURITY_LOG_HMAC_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return undefined;
  }

  return crypto
    .createHmac("sha256", secret)
    .update(ip)
    .digest("hex")
    .slice(0, 16);
}

async function logAuthEvent(data: {
  userId?: string;
  email?: string;
  action: string;
  success: boolean;
  reason?: string;
  ip?: string;
}): Promise<void> {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      type: "auth_guard",
      action: data.action,
      success: data.success,
      userId: data.userId,
      email: data.email
        ? data.email.replace(/(.{2}).*@/, "$1***@")
        : undefined,
      reason: data.reason,
      ipHash: data.ip ? hashIp(data.ip) : undefined,
    };

    if (process.env.AUTH_DEBUG === "1") {
      console.info(JSON.stringify(entry));
    }
  } catch {
    // Authentication must not fail because telemetry failed.
  }
}

function sendError(
  res: NextApiResponse,
  status: number,
  message: string,
  code: string,
): null {
  res.status(status).json({
    success: false,
    error: message,
    code,
  });
  return null;
}

function rawRole(value: unknown): UserRole {
  if (isLegacyMarketplaceRole(value)) {
    return value;
  }

  return normalizeRole(value);
}

function buildCapabilities(user: DbUser): Capability[] {
  const capabilities = normalizeCapabilities(user.capabilities);

  if (isLegacyMarketplaceRole(user.role)) {
    capabilities.push(capabilityFromLegacyRole(user.role));
  }

  if (
    user.onboardingStatus === "approved" &&
    user.onboardingRole &&
    isLegacyMarketplaceRole(user.onboardingRole)
  ) {
    capabilities.push(
      capabilityFromLegacyRole(user.onboardingRole),
    );
  }

  return [...new Set(capabilities)];
}

function isAdminAuthority(role: Role): role is "admin" | "superadmin" {
  return role === "admin" || role === "superadmin";
}

function hasCapability(
  token: AuthToken,
  capability: Capability,
): boolean {
  return token.capabilities.includes(capability);
}

export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthToken | null> {
  const ip = getClientIp(req);

  try {
    const secret = process.env.NEXTAUTH_SECRET;

    if (!secret) {
      await logAuthEvent({
        action: "auth_configuration_error",
        success: false,
        reason: "NEXTAUTH_SECRET is missing",
        ip,
      });
      return sendError(
        res,
        500,
        "Authentication is temporarily unavailable",
        "AUTH_CONFIGURATION_ERROR",
      );
    }

    const token = (await getToken({ req, secret })) as JWT | null;

    if (!token) {
      return sendError(
        res,
        401,
        "Authentication required",
        "AUTH_REQUIRED",
      );
    }

    if (!token.id || typeof token.id !== "string") {
      return sendError(
        res,
        401,
        "Invalid authentication token",
        "TOKEN_INVALID",
      );
    }

    await dbConnect();

    const user = (await User.findById(token.id)
      .select(
        "email name displayName role status isDeleted isVerified tokenVersion kycVerified onboardingStatus onboardingRole capabilities permissions profilePictureUrl phone twoFactorAuth",
      )
      .lean()) as DbUser | null;

    if (!user) {
      return sendError(
        res,
        401,
        "User not found",
        "USER_NOT_FOUND",
      );
    }

    if (user.isDeleted) {
      return sendError(
        res,
        403,
        "Account has been removed",
        "ACCOUNT_DELETED",
      );
    }

    if (user.status !== "active") {
      const messages: Record<string, string> = {
        pending: "Account is pending activation",
        suspended: "Account has been suspended",
        banned: "Account has been banned",
      };

      return sendError(
        res,
        403,
        messages[user.status || ""] || "Account is not active",
        "ACCOUNT_INACTIVE",
      );
    }

    const dbTokenVersion =
      typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
    const jwtTokenVersion =
      typeof token.tokenVersion === "number" ? token.tokenVersion : 0;

    if (dbTokenVersion !== jwtTokenVersion) {
      return sendError(
        res,
        401,
        "Session expired. Please login again.",
        "SESSION_EXPIRED",
      );
    }

    const role = rawRole(user.role);
    const authorityRole = normalizeRole(user.role);
    const capabilities = buildCapabilities(user);
    const permissions = normalizePermissions(user.permissions);

    const requiresVerifiedEmail =
      authorityRole !== "user" || isLegacyMarketplaceRole(role);

    if (requiresVerifiedEmail && !user.isVerified) {
      return sendError(
        res,
        403,
        "Email verification required. Please verify your email.",
        "EMAIL_NOT_VERIFIED",
      );
    }

    if (
      REQUIRE_ADMIN_2FA &&
      isAdminAuthority(authorityRole) &&
      user.twoFactorAuth?.enabled !== true
    ) {
      return sendError(
        res,
        403,
        "Two-factor authentication is required for admin access",
        "2FA_REQUIRED",
      );
    }

    const actor: Actor = {
      id: token.id,
      role: authorityRole,
      capabilities,
      directPermissions: permissions,
      tokenVersion: dbTokenVersion,
      isActive: true,
    };

    return {
      id: token.id,
      email: user.email ?? token.email ?? undefined,
      name: user.name ?? token.name ?? undefined,
      displayName: user.displayName ?? user.name ?? token.name ?? undefined,
      role,
      authorityRole,
      capabilities,
      permissions,
      actor,
      isEmailVerified: user.isVerified ?? false,
      kycVerified: user.kycVerified ?? false,
      onboardingStatus: user.onboardingStatus ?? "none",
      onboardingRole: user.onboardingRole ?? null,
      tokenVersion: dbTokenVersion,
      phone: user.phone ?? token.phone ?? undefined,
      phoneNumber: user.phone ?? token.phoneNumber ?? undefined,
      profilePicture: user.profilePictureUrl ?? null,
    };
  } catch (error) {
    await logAuthEvent({
      action: "auth_error",
      success: false,
      reason: error instanceof Error ? error.message : "Unknown error",
      ip,
    });

    return sendError(
      res,
      500,
      "Authentication error",
      "AUTH_ERROR",
    );
  }
}

export async function requireRole(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: readonly UserRole[],
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  const directlyAllowed = allowedRoles.includes(token.role);
  const authorityAllowed = allowedRoles.includes(token.authorityRole);
  const superadminForAdmin =
    token.authorityRole === "superadmin" &&
    allowedRoles.includes("admin");

  if (!directlyAllowed && !authorityAllowed && !superadminForAdmin) {
    return sendError(
      res,
      403,
      "You do not have permission to access this resource",
      "FORBIDDEN",
    );
  }

  return token;
}

export async function requirePermission(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredPermission: string,
): Promise<AuthToken | null> {
  const permission = normalizePermission(requiredPermission);

  if (!permission) {
    return sendError(
      res,
      403,
      "Permission denied",
      "UNKNOWN_PERMISSION",
    );
  }

  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  if (!actorHasPermission(token.actor, permission)) {
    return sendError(
      res,
      403,
      "You do not have permission to perform this action",
      "PERMISSION_DENIED",
    );
  }

  return token;
}

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  if (!isAdminAuthority(token.authorityRole)) {
    return sendError(
      res,
      403,
      "Admin access required",
      "ADMIN_REQUIRED",
    );
  }

  return token;
}

export async function requireSuperAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  if (token.authorityRole !== "superadmin") {
    return sendError(
      res,
      403,
      "Superadmin access required",
      "SUPERADMIN_REQUIRED",
    );
  }

  return token;
}

export async function requireAgent(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  if (
    !isAdminAuthority(token.authorityRole) &&
    !hasCapability(token, "real_estate_agent")
  ) {
    return sendError(res, 403, "Agent access required", "AGENT_REQUIRED");
  }

  return token;
}

export async function requireDeveloper(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  if (
    !isAdminAuthority(token.authorityRole) &&
    !hasCapability(token, "property_developer")
  ) {
    return sendError(
      res,
      403,
      "Developer access required",
      "DEVELOPER_REQUIRED",
    );
  }

  return token;
}

export async function requireSociety(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  if (
    !isAdminAuthority(token.authorityRole) &&
    !hasCapability(token, "housing_society")
  ) {
    return sendError(
      res,
      403,
      "Society access required",
      "SOCIETY_REQUIRED",
    );
  }

  return token;
}

export async function requireAgentOrDeveloper(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  if (
    !isAdminAuthority(token.authorityRole) &&
    !hasCapability(token, "real_estate_agent") &&
    !hasCapability(token, "property_developer")
  ) {
    return sendError(
      res,
      403,
      "Agent or developer access required",
      "MARKETPLACE_ROLE_REQUIRED",
    );
  }

  return token;
}

export async function requireVerified(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  if (!token.isEmailVerified) {
    return sendError(
      res,
      403,
      "Please verify your email to access this feature",
      "NOT_VERIFIED",
    );
  }

  return token;
}

export async function requireOwnership(
  req: NextApiRequest,
  res: NextApiResponse,
  resourceOwnerId: string,
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  if (
    !isAdminAuthority(token.authorityRole) &&
    token.id !== resourceOwnerId
  ) {
    return sendError(
      res,
      403,
      "You do not have permission to access this resource",
      "NOT_OWNER",
    );
  }

  return token;
}

export async function requireOwnershipOrRole(
  req: NextApiRequest,
  res: NextApiResponse,
  resourceOwnerId: string,
  allowedRoles: readonly UserRole[],
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) {
    return null;
  }

  const hasAllowedRole =
    allowedRoles.includes(token.role) ||
    allowedRoles.includes(token.authorityRole) ||
    (token.authorityRole === "superadmin" &&
      allowedRoles.includes("admin"));

  if (!hasAllowedRole && token.id !== resourceOwnerId) {
    return sendError(
      res,
      403,
      "You do not have permission to access this resource",
      "FORBIDDEN",
    );
  }

  return token;
}

export type { Permission };
