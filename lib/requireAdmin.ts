// ========== FILE: lib/requireAdmin.ts ==========
// 🔒 ENTERPRISE ADMIN AUTHORIZATION GUARD - HIGHRISE.PK
// Security Level: MAXIMUM | Admin-Only Access | Audit Logging | IP Restrictions
// ═══════════════════════════════════════════════════════════════

import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import type mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface AdminToken {
  id: string;
  email: string;
  name?: string;
  role: "admin";
  isEmailVerified: boolean;
  tokenVersion: number;
}

interface DbAdminUser {
  _id: mongoose.Types.ObjectId | string;
  email?: string;
  name?: string;
  role?: string;
  status?: "active" | "pending" | "suspended" | "banned";
  isDeleted?: boolean;
  isEmailVerified?: boolean;
  tokenVersion?: number;
  twoFactorAuth?: {
    enabled?: boolean;
    verifiedAt?: Date;
  };
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// ✅ Admin IP whitelist (optional, set via environment)
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS
  ? process.env.ADMIN_ALLOWED_IPS.split(",").map((ip) => ip.trim())
  : null;

// ✅ Require 2FA for admin access
const REQUIRE_ADMIN_2FA = process.env.REQUIRE_ADMIN_2FA === "1";

// ═══════════════════════════════════════════════════════════════
// 🔐 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Get client IP
 */
function getClientIp(req: NextApiRequest): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string") return cfIp.trim();

  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string") return realIp.trim();

  return req.socket?.remoteAddress || "unknown";
}

/**
 * ✅ Hash IP for logging
 */
function hashIp(ip: string): string {
  const secret =
    process.env.KYC_HASH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "admin-log-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(ip)
    .digest("hex")
    .slice(0, 16);
}

/**
 * ✅ Log admin action (audit trail)
 */
async function logAdminAction(data: {
  userId?: string;
  email?: string;
  action: string;
  success: boolean;
  reason?: string;
  ip: string;
  userAgent?: string;
  endpoint?: string;
}): Promise<void> {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "admin_access",
      action: data.action,
      success: data.success,
      userId: data.userId,
      email: data.email,
      reason: data.reason,
      ip: hashIp(data.ip),
      endpoint: data.endpoint,
    };

    // Always log admin actions (security requirement)
    if (data.success) {
      console.log("[AdminGuard]", JSON.stringify(logEntry));
    } else {
      console.warn("[AdminGuard]", JSON.stringify(logEntry));
    }

    // AdminAuditLog DB logging will be implemented in Section 8.
    // Console logging above satisfies audit trail for now.
  } catch (error) {
    console.error("[AdminGuard] Logging error:", error);
  }
}

/**
 * ✅ Send error response
 */
function sendError(
  res: NextApiResponse,
  status: number,
  message: string,
  code: string
): null {
  res.status(status).json({
    success: false,
    error: message,
    code,
  });
  return null;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MAIN ADMIN GUARD FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Enterprise Admin Authorization Guard
 * 
 * Security Features:
 * - JWT validation
 * - Admin role verification
 * - Database status check
 * - Token version validation (logout-all-devices)
 * - IP whitelist support
 * - 2FA enforcement (optional)
 * - Comprehensive audit logging
 * - Permission checking
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminToken | null> {
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";
  const endpoint = req.url || "unknown";

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: IP Whitelist Check (if configured)
    // ═══════════════════════════════════════════════════════════
    if (ADMIN_ALLOWED_IPS && ADMIN_ALLOWED_IPS.length > 0) {
      if (!ADMIN_ALLOWED_IPS.includes(ip)) {
        await logAdminAction({
          action: "ip_blocked",
          success: false,
          reason: `IP not in whitelist: ${hashIp(ip)}`,
          ip,
          userAgent,
          endpoint,
        });

        return sendError(
          res,
          403,
          "Access denied from this location",
          "IP_RESTRICTED"
        );
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Extract JWT Token
    // ═══════════════════════════════════════════════════════════
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }) as JWT | null;

    if (!token || !token.id) {
      await logAdminAction({
        action: "token_missing",
        success: false,
        reason: "No JWT token found",
        ip,
        userAgent,
        endpoint,
      });

      return sendError(res, 401, "Authentication required", "AUTH_REQUIRED");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Check Token Role (Quick Rejection)
    // Role is the single source of truth — no permission flags
    // ═══════════════════════════════════════════════════════════
    const tokenRole = token.role || "user";

    if (tokenRole !== "admin") {
      await logAdminAction({
        userId: token.id as string,
        email: token.email ?? undefined,
        action: "role_forbidden",
        success: false,
        reason: `Role: ${tokenRole}`,
        ip,
        userAgent,
        endpoint,
      });

      return sendError(res, 403, "Admin access required", "ADMIN_REQUIRED");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Database Validation (Critical Security Check)
    // ═══════════════════════════════════════════════════════════
    await dbConnect();

    const user = (await User.findById(token.id)
      .select(
        "email name role status isDeleted isEmailVerified tokenVersion twoFactorAuth"
      )
      .lean()) as DbAdminUser | null;

    if (!user) {
      await logAdminAction({
        userId: token.id as string,
        email: token.email ?? undefined,
        action: "user_not_found",
        success: false,
        reason: "Admin user not found in database",
        ip,
        userAgent,
        endpoint,
      });

      return sendError(res, 401, "User not found", "USER_NOT_FOUND");
    }

    // ✅ Verify still an admin in database
    if (user.role !== "admin") {
      await logAdminAction({
        userId: token.id,
        email: user.email,
        action: "role_changed",
        success: false,
        reason: `DB role: ${user.role}, Token role: ${tokenRole}`,
        ip,
        userAgent,
        endpoint,
      });

      return sendError(res, 403, "Admin access revoked", "ADMIN_REVOKED");
    }

    // ✅ Check if deleted
    if (user.isDeleted) {
      await logAdminAction({
        userId: token.id,
        email: user.email,
        action: "user_deleted",
        success: false,
        reason: "Admin account deleted",
        ip,
        userAgent,
        endpoint,
      });

      return sendError(res, 403, "Account has been removed", "ACCOUNT_DELETED");
    }

    // ✅ Check status
    if (user.status !== "active") {
      await logAdminAction({
        userId: token.id,
        email: user.email,
        action: "user_inactive",
        success: false,
        reason: `Status: ${user.status}`,
        ip,
        userAgent,
        endpoint,
      });

      return sendError(res, 403, "Admin account is not active", "ACCOUNT_INACTIVE");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Token Version Check (Logout-All-Devices)
    // ═══════════════════════════════════════════════════════════
    const dbTokenVersion = typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
    const jwtTokenVersion = typeof token.tokenVersion === "number" ? token.tokenVersion : 0;

    if (dbTokenVersion !== jwtTokenVersion) {
      await logAdminAction({
        userId: token.id,
        email: user.email,
        action: "token_version_mismatch",
        success: false,
        reason: `DB: ${dbTokenVersion}, JWT: ${jwtTokenVersion}`,
        ip,
        userAgent,
        endpoint,
      });

      return sendError(res, 401, "Session expired. Please login again.", "SESSION_EXPIRED");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Per-User IP Restrictions
    // Handled at environment level via ADMIN_ALLOWED_IPS
    // Per-user DB-level IP restrictions reserved for Section 8
    // ═══════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════
    // STEP 7: 2FA Check (If Required)
    // ═══════════════════════════════════════════════════════════
    if (REQUIRE_ADMIN_2FA) {
      const is2FAEnabled = user.twoFactorAuth?.enabled === true;
      const is2FAVerified = user.twoFactorAuth?.verifiedAt != null;

      if (!is2FAEnabled) {
        await logAdminAction({
          userId: token.id,
          email: user.email,
          action: "2fa_not_enabled",
          success: false,
          reason: "2FA required but not enabled",
          ip,
          userAgent,
          endpoint,
        });

        return sendError(
          res,
          403,
          "Two-factor authentication is required for admin access",
          "2FA_REQUIRED"
        );
      }

      // Note: In a full implementation, you'd check 2FA verification
      // status for the current session
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 8: Success - Build Admin Token
    // ═══════════════════════════════════════════════════════════
    const adminToken: AdminToken = {
      id: token.id as string,
      email: user.email ?? token.email ?? "",
      name: user.name ?? token.name ?? undefined,
      role: "admin",
      isEmailVerified: user.isEmailVerified ?? false,
      tokenVersion: dbTokenVersion,
    };

    // ✅ Log successful admin access
    await logAdminAction({
      userId: token.id,
      email: user.email,
      action: "admin_access_granted",
      success: true,
      ip,
      userAgent,
      endpoint,
    });

    return adminToken;
  } catch (error) {
    console.error("[AdminGuard] Unexpected error:", error);

    await logAdminAction({
      action: "admin_error",
      success: false,
      reason: (error as Error).message,
      ip,
      userAgent,
      endpoint,
    });

    return sendError(res, 500, "Authorization error", "AUTH_ERROR");
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 PERMISSION-BASED ADMIN CHECKS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Require admin with specific permission
 */
/**
 * Granular permission checks reserved for Section 8 (Admin Panel).
 * Currently all verified admins have full access.
 * Use requireAdmin() for access control.
 */
export async function requireAdminPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  _requiredPermission: string
): Promise<AdminToken | null> {
  return requireAdmin(req, res);
}

/**
 * Super admin distinction reserved for Section 8.
 * Currently all admins are treated equally.
 */
export async function requireSuperAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminToken | null> {
  return requireAdmin(req, res);
}

// ═══════════════════════════════════════════════════════════════
// 🔐 EXPORTS
// ═══════════════════════════════════════════════════════════════

export { getClientIp };

// ========== END OF FILE ==========
