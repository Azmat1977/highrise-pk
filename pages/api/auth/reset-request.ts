// pages/api/auth/reset-request.ts
// Highrise.pk - Password Reset Request
//
// SECURITY DESIGN:
//   - Anti-enumeration: always returns 200 OK
//   - Reset code: crypto.randomInt (CSPRNG) — 6 digits
//   - Stored as SHA-256(email:code:KYC_HASH_SECRET) — timing-safe verify
//   - Rate limiting: Upstash Redis via lib/rateLimit.ts
//   - IP and email hashed before any logging
//   - 15 minute expiry stored in security.resetCodeExpiresAt
//
// FIELD MAP (User.ts IUserSecurity):
//   security.resetCodeHash        — SHA-256 hash of code
//   security.resetCodeExpiresAt   — expiry timestamp
//   security.resetRequestedAt     — request timestamp

import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { rateLimitApi, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";

// ─── Constants ────────────────────────────────────────────────
const RESET_COOLDOWN_SECONDS = 60; // Minimum gap between reset requests

// ─── Types ────────────────────────────────────────────────────

interface IUserSecurity {
  resetCodeHash?: string;
  resetCodeExpiresAt?: Date;
  resetRequestedAt?: Date;
  resetAttempts?: number;
}

interface DbUser {
  _id: unknown;
  email?: string;
  name?: string;
  isDeleted?: boolean;
  security?: IUserSecurity;
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

function normalizeEmail(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\x00-\x1F\x7F]/g, "")
    .slice(0, 120);
}

function getUserAgent(req: NextApiRequest): string {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : "unknown";
}

/** Anti-enumeration: always 200 OK regardless of whether email exists */
function safeOk(res: NextApiResponse, requestId: string) {
  return res.status(200).json({
    message:
      "If the email is registered, you will receive a reset code shortly.",
    requestId,
  });
}

/**
 * Hash reset code for storage.
 * Uses KYC_HASH_SECRET (consistent with platform hashing strategy).
 * SHA-256 is correct here — reset codes are short-lived 6-digit tokens,
 * bcrypt's cost factor adds unnecessary latency with no security benefit.
 */
function hashResetCode(email: string, code: string): string {
  const secret =
    process.env.KYC_HASH_SECRET ??
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "KYC_HASH_SECRET is not set — cannot hash reset code"
    );
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`reset:${email}:${code}`)
    .digest("hex");
}

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ─── Handler ──────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = getRequestId(req);
  setSecurityHeaders(res, requestId);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed", requestId });
  }

  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);
  const normalizedEmail = normalizeEmail(req.body?.email);

  // ── 1. Rate limit by IP (Upstash Redis) ───────────────────
  const ipRl = await rateLimitApi(req);
  if (!ipRl.ok) {
    await logSecurityEvent({
      type: "rate_limit_exceeded",
      ip,
      severity: "medium",
      metadata: { endpoint: "reset-request" },
    });
    // Still return 200 — anti-enumeration
    return safeOk(res, requestId);
  }

  // ── 2. Validate email format ───────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return safeOk(res, requestId);
  }

  try {
    await dbConnect();

    // ── 3. Find user ─────────────────────────────────────────
    const user = (await User.findOne({
      email: normalizedEmail,
      isDeleted: { $ne: true },
    })
      .select("_id email name security.resetRequestedAt security.resetAttempts")
      .lean()) as DbUser | null;

    if (!user) {
      // Do not log — high volume of legitimate typos would create noise
      return safeOk(res, requestId);
    }

    // ── 4. Enforce cooldown between reset requests ────────────
    // Prevents email flooding and limits brute-force window resets.
    // security.resetRequestedAt is already stored — just check it.
    const lastRequestedAt = user.security?.resetRequestedAt
      ? new Date(user.security.resetRequestedAt)
      : null;

    if (lastRequestedAt) {
      const secondsSinceLastRequest = Math.floor(
        (Date.now() - lastRequestedAt.getTime()) / 1000
      );

      if (secondsSinceLastRequest < RESET_COOLDOWN_SECONDS) {
        const waitSeconds = RESET_COOLDOWN_SECONDS - secondsSinceLastRequest;

        await logSecurityEvent({
          type: "rate_limit_exceeded",
          userId: String(user._id),
          ip,
          userAgent,
          severity: "low",
          metadata: {
            reason: "reset_request_cooldown_active",
            waitSeconds,
            endpoint: "reset-request",
            requestId,
          },
        });

        // Anti-enumeration: return 200 even on cooldown
        return safeOk(res, requestId);
      }
    }

    // ── 5. Generate CSPRNG reset code ─────────────────────────
    // crypto.randomInt is CSPRNG — safe for security tokens
    const resetCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // ── 6. Hash code and store atomically ─────────────────────
    // Also resets resetAttempts to 0 — new code = fresh attempt budget.
    // Uses findByIdAndUpdate for atomic write (no save() race condition).
    const resetCodeHash = hashResetCode(normalizedEmail, resetCode);

    const updated = await User.findOneAndUpdate(
      {
        _id: user._id,
        isDeleted: { $ne: true },
      },
      {
        $set: {
          "security.resetCodeHash":      resetCodeHash,
          "security.resetCodeExpiresAt": expiresAt,
          "security.resetRequestedAt":   new Date(),
          "security.resetAttempts":      0,
        },
      },
      { new: true }
    );

    if (!updated) return safeOk(res, requestId);

    // ── 6. Log security event ─────────────────────────────────
    await logSecurityEvent({
      type: "password_reset_requested",
      userId: String(user._id),
      email: normalizedEmail,        // hashed inside logSecurityEvent
      ip,                            // hashed inside logSecurityEvent
      userAgent,
      severity: "low",
      metadata: { requestId },
    });

    // ── 7. Send reset email ───────────────────────────────────
    const safeCode = escapeHtml(resetCode);
    const safeName = escapeHtml(user.name ?? "there");

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
          <h2 style="margin-top:0;color:#029bba;">Reset your Highrise.pk password</h2>
          <p>Hi ${safeName},</p>
          <p>We received a request to reset your password. Use the code below:</p>
          <div style="background:#f0f9fb;border:2px solid #029bba;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
            <p style="margin:0;font-size:32px;font-weight:bold;letter-spacing:8px;color:#004063;">${safeCode}</p>
          </div>
          <p>This code expires in <strong>15 minutes</strong>.</p>
          <p style="color:#666;font-size:13px;">
            If you did not request a password reset, you can safely ignore this email.
            Your password will not change.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:11px;margin:0;">
            Highrise.pk &mdash; Pakistan&apos;s First Verified Property Marketplace
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: "Reset your Highrise.pk password",
      html,
      fromName: "Highrise.pk Security",
    });

    if (!emailResult.success) {
      await logSecurityEvent({
        type: "suspicious_activity",
        userId: String(user._id),
        ip,
        severity: "medium",
        metadata: {
          context: "password_reset_email_failed",
          requestId,
          error: emailResult.error ?? "unknown",
        },
      });
    }

    return safeOk(res, requestId);
  } catch {
    // Always return 200 — anti-enumeration
    return safeOk(res, requestId);
  }
}