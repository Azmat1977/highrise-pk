// pages/api/admin/agents/[agentId]/recalculate-trust.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — RECALCULATE TRUST SCORE - Highrise.pk
// 🔒 ENTERPRISE-GRADE | Admin Only | Full Audit Trail
// V6.8.6 — Standalone endpoint for admins to trigger recalc
// ═══════════════════════════════════════════════════════════════
// Trust Score Breakdown (0-100 total):
//   • Profile Complete (0-20)
//   • Documents Verified (0-25)
//   • Office Verified (0-15)
//   • Customer Ratings (0-20)
//   • Deal History (0-15)
//   • Response Time (0-5)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

import AgentProfile from "@/models/AgentProfile";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success:    boolean;
  message:    string;
  requestId:  string;
  data?: {
    profileId:  string;
    trustScore: {
      overall:  number;
      breakdown: {
        profileComplete:    number;
        documentsVerified:  number;
        officeVerified:     number;
        customerRatings:    number;
        dealHistory:        number;
        responseTime:       number;
      };
      lastCalculated: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const requestId =
    typeof req.headers["x-correlation-id"] === "string"
      ? req.headers["x-correlation-id"]
      : crypto.randomUUID();

  setSecurityHeaders(res, requestId);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return void res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  // ── Rate limiting ────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success: false,
      message: "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  // ── Admin auth ───────────────────────────────────────────────
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── Validate [agentId] param ─────────────────────────────────
  const { agentId } = req.query;
  const id = typeof agentId === "string" ? agentId : "";
  if (!id || !Types.ObjectId.isValid(id)) {
    return void res.status(400).json({
      success: false,
      message: "Invalid agent profile ID.",
      requestId,
    });
  }

  try {
    await dbConnect();

    // ── Fetch full AgentProfile document (not lean — need methods) ──
    const profile = await AgentProfile.findOne({
      _id:       new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!profile) {
      return void res.status(404).json({
        success: false,
        message: "Agent profile not found.",
        requestId,
      });
    }

    // Store old score for audit
    const oldScore = profile.trustScore?.overall ?? 0;

    // ── Calculate new trust score ────────────────────────────────
    const newScore = await profile.calculateTrustScore();
    await profile.save();

    // ── Audit log ────────────────────────────────────────────────
    await logSecurityEvent({
      type:     "admin_action",
      severity: "low",
      userId:   admin.id,
      req,
      metadata: {
        action:     "trust_score_recalculated",
        profileId:  id,
        oldScore,
        newScore:   newScore.overall,
        difference: newScore.overall - oldScore,
        breakdown:  newScore.breakdown,
        recalculatedBy: admin.id,
        recalculatedAt: new Date().toISOString(),
      },
    });

    // ── Success response ─────────────────────────────────────────
    return void res.status(200).json({
      success: true,
      message: `Trust score recalculated: ${oldScore} → ${newScore.overall}/100`,
      requestId,
      data: {
        profileId: id,
        trustScore: {
          overall:  newScore.overall,
          breakdown: newScore.breakdown,
          lastCalculated: newScore.lastCalculated.toISOString(),
        },
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected error occurred";

    await logSecurityEvent({
      type:     "admin_action",
      severity: "high",
      userId:   admin.id,
      req,
      metadata: {
        reason:    "Unhandled error during trust score recalculation",
        action:    "trust_score_recalc_error",
        error:     message,
        profileId: id,
      },
    }).catch(() => undefined);

    return void res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
}