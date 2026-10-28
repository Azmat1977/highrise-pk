// pages/api/otp/verify.ts
// ═══════════════════════════════════════════════════════════════
// OTP VERIFY API — Highrise.pk V6.4.5+
// POST /api/otp/verify
// ═══════════════════════════════════════════════════════════════
// Verifies a 6-digit OTP submitted by the user.
// On success: marks email as verified in EmailVerification model.
// ═══════════════════════════════════════════════════════════════
// ✅ requireAuth — must be logged in
// ✅ Constant-time hash comparison (timing attack prevention)
// ✅ Attempt tracking — lockout after 5 wrong attempts
// ✅ Expiry enforcement
// ✅ Single-use — verified record cannot be re-verified
// ✅ Returns remainingAttempts on wrong code
// ✅ Strict TypeScript — no any, no console.*
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApiWrite } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import EmailVerification, {
  type EmailVerificationPurpose,
} from "@/models/EmailVerification";
import { z } from "zod";

// ============================================
// TYPES
// ============================================

interface ApiResponse {
  success:            boolean;
  message:            string;
  verified?:          boolean;
  remainingAttempts?: number;
  requestId:          string;
}

// ============================================
// ZOD SCHEMA
// ============================================

const VerifyOtpBodySchema = z.object({
  email:   z.string().trim().toLowerCase().min(5).max(254),
  purpose: z.enum([
    "company_email",
    "authorized_person_email",
    "agent_email",
    "society_email",
    "general",
  ]),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
});

// ============================================
// HELPERS
// ============================================

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id",              requestId);
  res.setHeader("Content-Type",              "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options",    "nosniff");
  res.setHeader("X-Frame-Options",           "DENY");
  res.setHeader("Cache-Control",             "no-store, no-cache, must-revalidate, private");
  res.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers["x-forwarded-for"];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? "").split(",")[0]?.trim() || req.socket?.remoteAddress || "0.0.0.0";
}

/**
 * Hash OTP — must match exactly the same function in send.ts
 */
function hashOtp(email: string, code: string): string {
  const pepper =
    process.env.OTP_PEPPER ??
    process.env.NEXTAUTH_SECRET ??
    "otp_pepper_secure";
  return crypto
    .createHmac("sha256", pepper)
    .update(`highrise:otp:${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}

/**
 * Constant-time string comparison — prevents timing attacks.
 * Both strings hashed to same length before comparison.
 */
function constantTimeCompare(a: string, b: string): boolean {
  // Ensure both are same length by comparing their SHA-256 hashes
  // This prevents length-based timing leaks
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  try {
    return crypto.timingSafeEqual(ha, hb);
  } catch {
    return false;
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  // ── Method guard ──────────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return void res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  const ip = getClientIp(req);
  const ua = String(req.headers["user-agent"] ?? "").slice(0, 200);

  // ── Rate limit ────────────────────────────────────────────
  // Stricter than send — prevents brute force on OTP
  const rl = await rateLimitApiWrite(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      requestId,
    });
  }

  // ── Auth ──────────────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── DB ────────────────────────────────────────────────────
  await dbConnect();

  // ── Validate body ─────────────────────────────────────────
  const bodyResult = VerifyOtpBodySchema.safeParse(req.body ?? {});
  if (!bodyResult.success) {
    return void res.status(400).json({
      success: false,
      message: bodyResult.error.issues[0]?.message ?? "Invalid request body.",
      requestId,
    });
  }

  const { email, purpose, code } = bodyResult.data;

  try {
    // ── Check if already verified ───────────────────────────
    // Short-circuit — idempotent response
    const alreadyVerified = await EmailVerification.isVerified(email, purpose);
    if (alreadyVerified) {
      return void res.status(200).json({
        success:  true,
        message:  "Email is already verified.",
        verified: true,
        requestId,
      });
    }

    // ── Find pending record ─────────────────────────────────
    // findPending() includes select:false otpHash field
    const record = await EmailVerification.findPending(email, purpose);

    if (!record) {
      logSecurityEvent({
        type:      "admin_action",
        severity:  "low",
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:  "otp_verify_no_record",
          email,
          purpose,
          requestId,
        },
      });

      return void res.status(400).json({
        success: false,
        message: "No verification code found for this email. Please request a new code.",
        requestId,
      });
    }

    // ── Check expiry ─────────────────────────────────────────
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      // Delete expired record
      await EmailVerification.deleteOne({ _id: record._id });

      return void res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
        requestId,
      });
    }

    // ── Check max attempts ───────────────────────────────────
    if (record.attempts >= record.maxAttempts) {
      // Delete locked record — force new OTP request
      await EmailVerification.deleteOne({ _id: record._id });

      logSecurityEvent({
        type:      "admin_action",
        severity:  "medium",
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:   "otp_max_attempts_exceeded",
          email,
          purpose,
          attempts: record.attempts,
          requestId,
        },
      });

      return void res.status(400).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new verification code.",
        requestId,
      });
    }

    // ── Compute hash of submitted code ───────────────────────
    const submittedHash = hashOtp(email, code);
    const storedHash    = record.otpHash;

    // ── Constant-time comparison ─────────────────────────────
    const isMatch = constantTimeCompare(submittedHash, storedHash);

    if (!isMatch) {
      // Increment attempts
      const newAttempts = record.attempts + 1;
      const remaining   = record.maxAttempts - newAttempts;

      await EmailVerification.updateOne(
        { _id: record._id },
        {
          $inc: { attempts: 1 },
          $set: { updatedAt: new Date() },
        }
      );

      // If last attempt used → delete (force new OTP)
      if (remaining <= 0) {
        await EmailVerification.deleteOne({ _id: record._id });

        logSecurityEvent({
          type:      "admin_action",
          severity:  "medium",
          userId:    auth.id,
          ip,
          userAgent: ua,
          metadata:  {
            action:  "otp_max_attempts_reached",
            email,
            purpose,
            requestId,
          },
        });

        return void res.status(400).json({
          success:            false,
          message:            "Too many incorrect attempts. Please request a new verification code.",
          remainingAttempts:  0,
          requestId,
        });
      }

      logSecurityEvent({
        type:      "admin_action",
        severity:  "low",
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:    "otp_wrong_code",
          email,
          purpose,
          attempts:  newAttempts,
          remaining,
          requestId,
        },
      });

      return void res.status(400).json({
        success:           false,
        message:           remaining === 1
          ? "Incorrect code. 1 attempt remaining before lockout."
          : `Incorrect code. ${remaining} attempts remaining.`,
        remainingAttempts: remaining,
        requestId,
      });
    }

    // ── ✅ CODE MATCHES — Mark as verified ───────────────────
    await EmailVerification.updateOne(
      { _id: record._id },
      {
        $set: {
          verified:   true,
          verifiedAt: new Date(),
          // Clear sensitive hash after successful verification
          // (Cannot clear select:false field this way — it stays but is
          //  never returned by normal queries anyway)
          updatedAt:  new Date(),
        },
      }
    );

    // ── Log success ──────────────────────────────────────────
    logSecurityEvent({
      type:      "admin_action",
      severity:  "low",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:  "otp_verified",
        email,
        purpose,
        requestId,
      },
    });

    return void res.status(200).json({
      success:  true,
      message:  "Email verified successfully! ✅",
      verified: true,
      requestId,
    });

  } catch (err: unknown) {
    logSecurityEvent({
      type:      "admin_action",
      severity:  "high",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:  "otp_verify_error",
        email,
        purpose,
        error:   err instanceof Error ? err.message : "Unknown",
        requestId,
      },
    });

    return void res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
      requestId,
    });
  }
}