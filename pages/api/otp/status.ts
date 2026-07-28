// pages/api/otp/status.ts
// ═══════════════════════════════════════════════════════════════
// OTP STATUS API — Highrise.pk V6.4.5+
// GET /api/otp/status?email=x&purpose=y
// ═══════════════════════════════════════════════════════════════
// Check if an email is verified for a specific purpose.
// Used by frontend to show ✅ badge or "Send Code" button.
// ═══════════════════════════════════════════════════════════════
// ✅ requireAuth — must be logged in
// ✅ GET only — no side effects
// ✅ Returns verified status + pending info
// ✅ Strict TypeScript — no any, no console.*
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApi } from "@/lib/rateLimit";
import EmailVerification, {
  type EmailVerificationPurpose,
} from "@/models/EmailVerification";
import { z } from "zod";

// ============================================
// TYPES
// ============================================

interface ApiResponse {
  success:     boolean;
  message?:    string;
  data?: {
    email:       string;
    purpose:     string;
    verified:    boolean;
    verifiedAt?: string;
    pending?:    boolean;
    expiresAt?:  string;
    attemptsRemaining?: number;
  };
  requestId: string;
}

// ============================================
// ZOD SCHEMA
// ============================================

const StatusQuerySchema = z.object({
  email: z.string().trim().toLowerCase().min(5).max(254),
  purpose: z.enum([
    "company_email",
    "authorized_person_email",
    "agent_email",
    "society_email",
    "general",
  ]),
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
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return void res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  // ── Rate limit ────────────────────────────────────────────
  const rl = await rateLimitApi(req);
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

  // ── Validate query params ─────────────────────────────────
  const queryResult = StatusQuerySchema.safeParse({
    email:   req.query.email,
    purpose: req.query.purpose,
  });

  if (!queryResult.success) {
    return void res.status(400).json({
      success: false,
      message: queryResult.error.issues[0]?.message ?? "Invalid query parameters. Required: email, purpose.",
      requestId,
    });
  }

  const { email, purpose } = queryResult.data;

  try {
    // ── Check if verified ───────────────────────────────────
    const verifiedRecord = await EmailVerification.findVerified(email, purpose);

    if (verifiedRecord) {
      return void res.status(200).json({
        success: true,
        data: {
          email,
          purpose,
          verified:   true,
          verifiedAt: verifiedRecord.verifiedAt
            ? verifiedRecord.verifiedAt.toISOString()
            : undefined,
        },
        requestId,
      });
    }

    // ── Check if pending (OTP sent but not yet verified) ────
    const pendingRecord = await EmailVerification.findOne({
      email,
      purpose,
      verified: false,
      expiresAt: { $gt: new Date() },
    })
      .select("expiresAt attempts maxAttempts")
      .sort({ createdAt: -1 })
      .lean();

    if (pendingRecord) {
      const remaining = (pendingRecord.maxAttempts ?? 5) - (pendingRecord.attempts ?? 0);

      return void res.status(200).json({
        success: true,
        data: {
          email,
          purpose,
          verified:          false,
          pending:           true,
          expiresAt:         pendingRecord.expiresAt
            ? new Date(pendingRecord.expiresAt).toISOString()
            : undefined,
          attemptsRemaining: Math.max(0, remaining),
        },
        requestId,
      });
    }

    // ── No record at all — not yet requested ────────────────
    return void res.status(200).json({
      success: true,
      data: {
        email,
        purpose,
        verified: false,
        pending:  false,
      },
      requestId,
    });

  } catch (err: unknown) {
    return void res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
      requestId,
    });
  }
}