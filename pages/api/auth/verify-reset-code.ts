// pages/api/auth/verify-reset-code.ts
// Highrise.pk - Verify Password Reset Code
//
// SECURITY DESIGN:
//   - Validates code WITHOUT consuming it (reset-password.ts consumes it)
//   - Timing-safe comparison (prevents timing attacks)
//   - Rate limiting: Upstash Redis
//   - Generic error messages (anti-enumeration)
//   - IP and email hashed before logging

import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { rateLimitApi, getClientIp } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

// ─── Types ────────────────────────────────────────────────────

interface IUserSecurity {
  resetCodeHash?: string;
  resetCodeExpiresAt?: Date;
}

interface DbUserLean {
  _id: unknown;
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

function safeFail(res: NextApiResponse, requestId: string) {
  return res.status(400).json({
    success: false,
    message: "Invalid or expired code. Please try again.",
    requestId,
  });
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

/**
 * Timing-safe hex string comparison.
 * Buffers must be same length — hex output of sha256 is always 64 chars.
 */
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

  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code ?? "").trim();

  // ── 2. Validate inputs ────────────────────────────────────
  if (!email) return safeFail(res, requestId);
  if (!/^\d{6}$/.test(code)) return safeFail(res, requestId);

  try {
    await dbConnect();

    // ── 3. Find user with security fields ─────────────────
    // select: false on resetCodeHash — must explicitly select it
    const user = (await User.findOne({
      email,
      isDeleted: { $ne: true },
    })
      .select("_id security.resetCodeHash security.resetCodeExpiresAt")
      .lean()) as DbUserLean | null;

    if (!user) return safeFail(res, requestId);

    const storedHash = String(user.security?.resetCodeHash ?? "");
    const expiresAt = user.security?.resetCodeExpiresAt;
    const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;

    // ── 4. Check expiry ───────────────────────────────────
    if (
      !storedHash ||
      !expiresAtMs ||
      Number.isNaN(expiresAtMs) ||
      Date.now() > expiresAtMs
    ) {
      await logSecurityEvent({
        type: "suspicious_activity",
        userId: String(user._id),
        email,
        ip,
        userAgent,
        severity: "low",
        metadata: {
          reason: "reset_code_expired_or_missing",
          endpoint: "verify-reset-code",
          requestId,
        },
      });
      return safeFail(res, requestId);
    }

    // ── 5. Timing-safe comparison ─────────────────────────
    const computed = hashResetCode(email, code);
    const isValid = timingSafeEqualHex(storedHash, computed);

    if (!isValid) {
      await logSecurityEvent({
        type: "suspicious_activity",
        userId: String(user._id),
        email,
        ip,
        userAgent,
        severity: "medium",
        metadata: {
          reason: "invalid_reset_code",
          endpoint: "verify-reset-code",
          requestId,
        },
      });
      return safeFail(res, requestId);
    }

    // ── 6. Code is valid — do NOT consume it here ─────────
    // reset-password.ts verifies again and clears the hash
    return res.status(200).json({
      success: true,
      message: "Code verified. Please set a new password.",
      requestId,
    });
  } catch {
    return safeFail(res, requestId);
  }
}