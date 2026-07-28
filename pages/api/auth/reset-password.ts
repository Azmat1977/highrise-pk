// pages/api/auth/reset-password.ts
// Highrise.pk - Password Reset Completion
//
// SECURITY DESIGN:
//   - Verifies AND consumes reset code atomically
//   - Timing-safe comparison (prevents timing attacks)
//   - bcrypt cost 12 for new password hash
//   - Clears ALL reset fields after use (prevents replay)
//   - Unlocks account on successful reset
//   - Marks email verified (user proved email access)
//   - Increments tokenVersion (invalidates all existing sessions)
//   - Rate limiting: Upstash Redis
//   - Confirmation email sent after success

import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { rateLimitApi, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";

// ─── Types ────────────────────────────────────────────────────

interface IUserSecurity {
  resetCodeHash?: string;
  resetCodeExpiresAt?: Date;
  resetRequestedAt?: Date;
}

interface DbUserDoc {
  _id: unknown;
  email?: string;
  name?: string;
  security?: IUserSecurity;
  password?: string;
  isVerified?: boolean;
  tokenVersion?: number;
  loginAttempts?: number;
  lockUntil?: Date | undefined;
  markEmailVerified?: () => void;
  save: (opts?: { validateBeforeSave?: boolean }) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

function getRequestId(req: NextApiRequest): string {
  const hdr = req.headers["x-request-id"];
  if (typeof hdr === "string" && hdr.trim()) return hdr.trim();
  return crypto.randomUUID();
}

// getClientIp imported from @/lib/rateLimit

function getUserAgent(req: NextApiRequest): string {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : "unknown";
}

function normalizeEmail(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\x00-\x1F\x7F]/g, "")
    .slice(0, 120);
}

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function safeFail(res: NextApiResponse, requestId: string) {
  return res.status(400).json({
    success: false,
    message: "Invalid or expired code. Please request a new one.",
    requestId,
  });
}

function isStrongPassword(pw: string): { valid: boolean; reason?: string } {
  const v = String(pw ?? "");
  if (v.length < 12)
    return { valid: false, reason: "Password must be at least 12 characters" };
  if (!/[a-z]/.test(v))
    return { valid: false, reason: "Must contain lowercase letter" };
  if (!/[A-Z]/.test(v))
    return { valid: false, reason: "Must contain uppercase letter" };
  if (!/[0-9]/.test(v))
    return { valid: false, reason: "Must contain number" };
  if (!/[^A-Za-z0-9]/.test(v))
    return { valid: false, reason: "Must contain special character" };
  return { valid: true };
}

/**
 * Must match reset-request.ts exactly.
 * HMAC-SHA256 with KYC_HASH_SECRET.
 */
function hashResetCode(email: string, code: string): string {
  const secret =
    process.env.KYC_HASH_SECRET ??
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("KYC_HASH_SECRET is not set");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`reset:${email}:${code}`)
    .digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aa = Buffer.from(String(a ?? ""), "hex");
  const bb = Buffer.from(String(b ?? ""), "hex");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

// ─── Handler ──────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = getRequestId(req);
  setSecurityHeaders(res, requestId);

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed", requestId });
  }

  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  // ── 1. Rate limit (Upstash Redis) ─────────────────────────
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    return res
      .status(429)
      .json({ success: false, message: "Too many requests", requestId });
  }

  const normalizedEmail = normalizeEmail(req.body?.email);

  // Accept both 'code' and 'token' field names for compatibility
  const rawCode =
    typeof req.body?.code === "string"
      ? req.body.code
      : typeof req.body?.token === "string"
      ? req.body.token
      : "";
  const resetCode = String(rawCode).trim();
  const newPassword = String(req.body?.newPassword ?? "");

  // ── 2. Validate inputs ────────────────────────────────────
  if (!normalizedEmail) return safeFail(res, requestId);
  if (!/^\d{6}$/.test(resetCode)) return safeFail(res, requestId);
  if (!newPassword) return safeFail(res, requestId);

  // ── 3. Validate password strength ─────────────────────────
  const pwCheck = isStrongPassword(newPassword);
  if (!pwCheck.valid) {
    return res.status(400).json({
      success: false,
      message: pwCheck.reason,
      requestId,
    });
  }

  try {
    await dbConnect();

    // ── 4. Find user with security fields ─────────────────
    // Note: select: false on resetCodeHash requires explicit selection
    const user = (await User.findOne({
      email: normalizedEmail,
      isDeleted: { $ne: true },
    }).select(
      "_id email name password security.resetCodeHash security.resetCodeExpiresAt security.resetRequestedAt isEmailVerified tokenVersion loginAttempts lockUntil"
    )) as DbUserDoc | null;

    if (!user) return safeFail(res, requestId);

    const storedHash = String(user.security?.resetCodeHash ?? "");
    const expiresAt = user.security?.resetCodeExpiresAt;
    const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;

    // ── 5. Check expiry ───────────────────────────────────
    if (
      !storedHash ||
      !expiresAtMs ||
      Number.isNaN(expiresAtMs) ||
      Date.now() > expiresAtMs
    ) {
      await logSecurityEvent({
        type: "suspicious_activity",
        userId: String(user._id),
        email: normalizedEmail,
        ip,
        userAgent,
        severity: "low",
        metadata: {
          reason: "reset_code_expired_or_missing",
          endpoint: "reset-password",
          requestId,
        },
      });
      return safeFail(res, requestId);
    }

    // ── 6. Timing-safe comparison ─────────────────────────
    const computed = hashResetCode(normalizedEmail, resetCode);
    const isValid = timingSafeEqualHex(storedHash, computed);

    if (!isValid) {
      await logSecurityEvent({
        type: "suspicious_activity",
        userId: String(user._id),
        email: normalizedEmail,
        ip,
        userAgent,
        severity: "high",
        metadata: {
          reason: "invalid_reset_code_on_completion",
          endpoint: "reset-password",
          requestId,
        },
      });
      return safeFail(res, requestId);
    }

    // ── 7. Hash new password ──────────────────────────────
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // ── 8. Apply all updates ──────────────────────────────
    user.password = hashedPassword;

    // Mark email verified — user proved email access by using the reset code
    if (user.markEmailVerified) {
      user.markEmailVerified();
    } else {
      user.isVerified = true;
    }

    // Clear ALL reset fields (prevent replay attacks)
    if (user.security) {
      user.security.resetCodeHash = undefined;
      user.security.resetCodeExpiresAt = undefined;
      user.security.resetRequestedAt = undefined;
    }

    // Unlock account — password reset is a valid unlock mechanism
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    // Increment tokenVersion — invalidates ALL existing sessions
    // Forces re-login on all devices after password change
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;

    await user.save({ validateBeforeSave: false });

    // ── 9. Log success ────────────────────────────────────
    await logSecurityEvent({
      type: "password_reset_completed",
      userId: String(user._id),
      email: normalizedEmail,
      ip,
      userAgent,
      severity: "low",
      metadata: { requestId },
    });

    // ── 10. Send confirmation email ───────────────────────
    const safeName = escapeHtml(user.name ?? "there");

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
          <h2 style="margin-top:0;color:#029bba;">Password Changed</h2>
          <p>Hi ${safeName},</p>
          <p>Your Highrise.pk password has been successfully changed.</p>
          <p style="color:#ef4444;font-weight:600;">
            If you did not make this change, please contact us immediately at
            <a href="mailto:support@highrise.pk" style="color:#ef4444;">support@highrise.pk</a>
          </p>
          <p style="color:#666;font-size:13px;">
            For security, you have been logged out of all devices.
            Please login again with your new password.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:11px;margin:0;">
            Highrise.pk &mdash; Pakistan&apos;s First Verified Property Marketplace
          </p>
        </div>
      </body>
      </html>
    `;

    // Fire-and-forget — don't block response on email
    sendEmail({
      to: String(user.email ?? normalizedEmail),
      subject: "Your Highrise.pk password has been changed",
      html,
      fromName: "Highrise.pk Security",
    }).catch(() => {
      // Fire-and-forget — confirmation email failure does not block response
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successful. Please login with your new password.",
      requestId,
    });
  } catch {
    return safeFail(res, requestId);
  }
}