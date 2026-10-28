// pages/api/admin/agents/[agentId]/suspend.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — SUSPEND AGENT ACCOUNT - Highrise.pk
// 🔒 ENTERPRISE-GRADE | Admin Only | Full Audit Trail
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. Admin identifies problem agent (fraud, violation, etc.)
//   2. Admin provides suspension reason (mandatory, min 10 chars)
//   3. AgentProfile.status → "suspended"
//   4. User.isVerifiedAgent → false (capability revoked)
//   5. User.role → "user" (downgrade for backward compat)
//   6. User.tokenVersion++ (force re-login → session invalidated)
//   7. Suspension email sent to agent with reason
//   8. Agent's listings become hidden from public view
//   9. Agent can appeal via support
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";
import { agentSuspendedTemplate } from "@/lib/email-templates";

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
  role: string;
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
  const reason = String(body.reason ?? "").trim().slice(0, 500);

  if (!reason || reason.length < 10) {
    return void res.status(400).json({
      success: false,
      message:
        "Suspension reason is required (minimum 10 characters). This is sent to the agent.",
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

    // ── Status guards — only approved agents can be suspended ────
    if (profile.status === "suspended") {
      return void res.status(409).json({
        success: false,
        message: "This agent is already suspended.",
        requestId,
      });
    }

    if (profile.status !== "approved") {
      return void res.status(409).json({
        success: false,
        message: `Cannot suspend agent with status: ${profile.status}. Only approved agents can be suspended.`,
        requestId,
      });
    }

    // ── Fetch linked User (for name in email + role check) ───────
    const linkedUser = await User.findOne({ _id: profile.user })
      .select({ _id: 1, name: 1, email: 1, role: 1 })
      .lean<UserLean>();

    if (!linkedUser) {
      await logSecurityEvent({
        type: "admin_action",
        severity: "high",
        userId: admin.id,
        req,
        metadata: {
          reason: "Agent profile references non-existent user",
          action: "agent_suspend_failed",
          profileId: id,
          linkedUserId: String(profile.user),
        },
      });
      return void res.status(404).json({
        success: false,
        message: "Linked user account not found.",
        requestId,
      });
    }

    // ════════════════════════════════════════════════════════════
    // ATOMIC SUSPENSION — Update AgentProfile + User
    // ════════════════════════════════════════════════════════════

    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);

    // ── Step 1: Suspend AgentProfile ─────────────────────────────
    await AgentProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          status:           "suspended",
          suspendedAt:      now,
          suspendedBy:      adminObjectId,
          suspensionReason: reason,
          lastActivityAt:   now,
        },
        $push: {
          auditTrail: {
            action:      "profile_suspended",
            performedBy: adminObjectId,
            performedAt: now,
            changes: {
              status:            { from: profile.status, to: "suspended" },
              suspensionReason:  reason,
            },
          },
        },
      }
    );

    // ── Step 2: Revoke capability + downgrade role ───────────────
    // - isVerifiedAgent: false        → revoke agent capability
    // - agentVerificationStatus       → mirror new status
    // - role: "user"                  → downgrade (only if was "agent")
    // - tokenVersion++                → force re-login
    const userUpdate: Record<string, unknown> = {
      $set: {
        isVerifiedAgent:         false,
        agentVerificationStatus: "suspended",
      },
      $inc: {
        tokenVersion: 1,
      },
    };

    // Only downgrade role if user was previously "agent"
    // (protects admin accounts from accidental downgrade)
    if (linkedUser.role === "agent") {
      (userUpdate.$set as Record<string, unknown>).role = "user";
    }

    const userUpdateResult = await User.updateOne(
      { _id: linkedUser._id },
      userUpdate
    );

    // Safety check — user update must succeed
    if (userUpdateResult.matchedCount === 0) {
      // Rollback AgentProfile status
      await AgentProfile.updateOne(
        { _id: profile._id },
        {
          $set: { status: "approved" },
          $unset: {
            suspendedAt: "",
            suspendedBy: "",
            suspensionReason: "",
          },
          $pop: { auditTrail: 1 },
        }
      );

      await logSecurityEvent({
        type:     "admin_action",
        severity: "critical",
        userId:   admin.id,
        req,
        metadata: {
          reason:       "User update failed during agent suspension — rollback executed",
          action:       "agent_suspend_rollback",
          profileId:    id,
          linkedUserId: String(linkedUser._id),
        },
      });

      return void res.status(500).json({
        success: false,
        message: "Suspension failed. Please try again.",
        requestId,
      });
    }

    // ── Audit log ────────────────────────────────────────────────
    await logSecurityEvent({
      type:     "admin_action",
      severity: "high",
      userId:   admin.id,
      req,
      metadata: {
        action:                    "agent_suspended",
        profileId:                 id,
        agentUserId:               String(profile.user),
        agentEmail:                profile.email,
        agencyName:                profile.agencyName ?? profile.displayName,
        reason,
        capabilityRevoked:         "isVerifiedAgent",
        agentVerificationStatus:   "suspended",
        roleFrom:                  linkedUser.role,
        roleTo:                    linkedUser.role === "agent" ? "user" : linkedUser.role,
        suspendedBy:               admin.id,
        suspendedAt:               now.toISOString(),
      },
    });

    // ── Suspension email (fire-and-forget) ───────────────────────
    void sendEmail({
      to:       profile.email,
      subject:  "Account Suspended - Highrise.pk",
      html:     agentSuspendedTemplate.html({
        agentName:  linkedUser.name ?? profile.displayName,
        agencyName: profile.agencyName,
        reason,
        supportUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk"}/contact`,
      }),
      fromName: "Highrise.pk Team",
    });

    // ── Success ──────────────────────────────────────────────────
    return void res.status(200).json({
      success: true,
      message: `Agent suspended successfully. ${profile.email} has been notified.`,
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
        reason:    "Unhandled error during agent suspension",
        action:    "agent_suspend_error",
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