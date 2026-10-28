// pages/api/admin/agents/[agentId]/info-required.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — REQUEST MORE INFO FROM AGENT - Highrise.pk
// 🔒 ENTERPRISE-GRADE | Admin Only | Full Audit Trail
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. Admin reviews pending AgentProfile
//   2. Admin identifies missing/unclear info (documents, clarification)
//   3. Admin provides specific request (mandatory, min 10 chars)
//   4. AgentProfile.status → "info_required"
//   5. AgentProfile.infoRequiredReason → set with admin's message
//   6. Email sent to agent with the request
//   7. Agent sees banner in portal + can update profile
//   8. When agent updates → status can be moved back to "pending"
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";
import { agentOnboardingInfoRequiredTemplate } from "@/lib/email-templates";

import AgentProfile from "@/models/AgentProfile";
import User from "@/models/User";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
  data?: {
    profileId: string;
    agentEmail: string;
  };
}

interface AgentProfileLean {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  status: string;
  displayName: string;
  email: string;
  agencyName?: string;
  isDeleted: boolean;
}

interface UserLean {
  _id: Types.ObjectId;
  name?: string;
  email: string;
}

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // ── Correlation ID ───────────────────────────────────────────
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
      message: "Too many requests.",
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

  // ── Parse + validate body ────────────────────────────────────
  const body = req.body as Record<string, unknown>;
  const reason = String(body.reason ?? "").trim().slice(0, 1000);

  if (!reason || reason.length < 10) {
    return void res.status(400).json({
      success: false,
      message:
        "Info request reason is required (minimum 10 characters). Be specific about what documents or clarifications are needed.",
      requestId,
    });
  }

  try {
    await dbConnect();

    // ── Fetch AgentProfile ───────────────────────────────────────
    const profile = await AgentProfile.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    })
      .select({
        _id: 1,
        user: 1,
        status: 1,
        displayName: 1,
        email: 1,
        agencyName: 1,
        isDeleted: 1,
      })
      .lean<AgentProfileLean>();

    if (!profile) {
      return void res.status(404).json({
        success: false,
        message: "Agent profile not found.",
        requestId,
      });
    }

    // ── Status guards — cannot request info from approved/suspended ──
    if (profile.status === "approved") {
      return void res.status(409).json({
        success: false,
        message:
          "Cannot request info from an approved agent. Use suspend instead if there's an issue.",
        requestId,
      });
    }

    if (profile.status === "suspended") {
      return void res.status(409).json({
        success: false,
        message: "Cannot request info from a suspended agent. Reinstate first.",
        requestId,
      });
    }

    // Only pending/draft/rejected/info_required can transition
    if (
      profile.status !== "pending" &&
      profile.status !== "draft" &&
      profile.status !== "rejected" &&
      profile.status !== "info_required"
    ) {
      return void res.status(409).json({
        success: false,
        message: `Cannot request info from profile with status: ${profile.status}`,
        requestId,
      });
    }

    // ── Fetch linked User (for name in email) ────────────────────
    const linkedUser = await User.findOne({ _id: profile.user })
      .select({ _id: 1, name: 1, email: 1 })
      .lean<UserLean>();

    // ── Update AgentProfile → info_required ──────────────────────
    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);

    await AgentProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          status:             "info_required",
          infoRequiredReason: reason,
          lastActivityAt:     now,
        },
        $push: {
          auditTrail: {
            action:      "info_requested",
            performedBy: adminObjectId,
            performedAt: now,
            changes: {
              status:             { from: profile.status, to: "info_required" },
              infoRequiredReason: reason,
            },
          },
        },
      }
    );

    // ── V6.8.0: Sync capability flag mirror on User ──────────────
    // No role change (still not agent), just update status mirror
    if (linkedUser) {
      await User.updateOne(
        { _id: linkedUser._id },
        {
          $set: {
            agentVerificationStatus: "info_required",
          },
          $inc: {
            tokenVersion: 1,   // Force re-login → agent sees banner
          },
        }
      );
    }

    // ── Audit log ────────────────────────────────────────────────
    await logSecurityEvent({
      type:     "admin_action",
      severity: "low",
      userId:   admin.id,
      req,
      metadata: {
        action:                    "agent_info_requested",
        profileId:                 id,
        agentUserId:               String(profile.user),
        agentEmail:                profile.email,
        agencyName:                profile.agencyName ?? profile.displayName,
        infoRequiredReason:        reason,
        agentVerificationStatus:   "info_required",
        requestedBy:               admin.id,
        requestedAt:               now.toISOString(),
      },
    });

    // ── Info required email (fire-and-forget) ────────────────────
    void sendEmail({
      to:       profile.email,
      subject:  "Additional Information Needed - Highrise.pk Agent Application",
      html:     agentOnboardingInfoRequiredTemplate.html({
        agentName:    linkedUser?.name ?? profile.displayName,
        reason,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk"}/agent/dashboard`,
      }),
      fromName: "Highrise.pk Verification Team",
    });

    // ── Success ──────────────────────────────────────────────────
    return void res.status(200).json({
      success: true,
      message: `Info request sent. ${profile.email} has been notified with your specific requirements.`,
      requestId,
      data: {
        profileId: id,
        agentEmail: profile.email,
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
        reason:    "Unhandled error during info_required update",
        action:    "agent_info_required_error",
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