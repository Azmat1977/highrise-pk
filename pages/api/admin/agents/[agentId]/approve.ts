// pages/api/admin/agents/[id]/approve.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — APPROVE AGENT APPLICATION - Highrise.pk
// 🔒 ENTERPRISE-GRADE | Admin Only | Full Audit Trail
// V6.8.6 — Auto-calculates Trust Score on approval
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. Admin reviews pending AgentProfile
//   2. This endpoint sets AgentProfile.status → "approved"
//   3. Auto-calculates initial Trust Score (documents + profile)
//   4. User.role → "agent"
//   5. User.tokenVersion++ (forces agent to re-login with new role)
//   6. Confirmation email sent to agent
//   7. Full audit trail via logSecurityEvent()
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";

import User from "@/models/User";
import AgentProfile from "@/models/AgentProfile";

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
    newRole: string;
  };
}

// Lean shape for AgentProfile fields we need
interface AgentProfileLean {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  status: string;
  displayName: string;
  email: string;
  agencyName?: string;
  city: string;
  isDeleted: boolean;
}

// Lean shape for User fields we need
interface UserLean {
  _id: Types.ObjectId;
  email: string;
  name?: string;
  role: string;
  tokenVersion?: number;
  isDeleted: boolean;
  status: string;
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
// EMAIL HELPER
// ═══════════════════════════════════════════════════════════════

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildApprovalEmail(agent: {
  name: string;
  agencyName?: string;
}): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
  const safeName = escapeHtml(agent.name);
  const safeAgency = agent.agencyName
    ? escapeHtml(agent.agencyName)
    : null;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Approved — Highrise.pk</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8f9fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
         style="background:#f8f9fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
               style="background:#ffffff;border-radius:16px;
                      box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);
                       padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">
                🎉 Mubarak Ho!
              </h1>
              <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">
                Aapki Application Approve Ho Gayi
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;">
              <p style="font-size:16px;color:#333;margin:0 0 16px;">
                Assalam-u-Alaikum <strong>${safeName}</strong>,
              </p>

              ${safeAgency ? `
              <p style="font-size:16px;color:#555;margin:0 0 16px;line-height:1.6;">
                <strong>${safeAgency}</strong> ki application
                <strong>Highrise.pk</strong> par approved ho gayi hai!
              </p>` : `
              <p style="font-size:16px;color:#555;margin:0 0 16px;line-height:1.6;">
                Aapki agent application <strong>Highrise.pk</strong> par
                approved ho gayi hai!
              </p>`}

              <!-- What's unlocked -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                          border-radius:12px;padding:24px;margin:24px 0;">
                <strong style="color:#166534;font-size:16px;">
                  ✅ Ab Aap Kar Sakte Hain:
                </strong>
                <ul style="color:#166534;margin:12px 0 0;
                           padding-left:20px;line-height:2;">
                  <li>Properties list kar sakte hain</li>
                  <li>Verified agents mein dikheinge</li>
                  <li>Buyers se leads receive kar sakte hain</li>
                  <li>Agent dashboard access kar sakte hain</li>
                </ul>
              </div>

              <!-- Important notice -->
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;
                          padding:16px;border-radius:0 8px 8px 0;margin:0 0 28px;">
                <strong style="color:#92400e;">⚠️ Zaroori / Important:</strong>
                <p style="color:#92400e;margin:8px 0 0;font-size:14px;">
                  Dubara login karein taake aapka naya role activate ho.
                  Please re-login to activate your agent account.
                </p>
              </div>

              <!-- CTAs -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${siteUrl}/login"
                   style="display:inline-block;background:#029bba;color:#ffffff;
                          padding:14px 28px;text-decoration:none;border-radius:8px;
                          font-weight:600;font-size:16px;margin-right:12px;">
                  Login Again →
                </a>
                <a href="${siteUrl}/agent/dashboard"
                   style="display:inline-block;background:#10b981;color:#ffffff;
                          padding:14px 28px;text-decoration:none;border-radius:8px;
                          font-weight:600;font-size:16px;">
                  Dashboard →
                </a>
              </div>

              <p style="font-size:15px;color:#555;line-height:1.6;margin:0;">
                JazakAllah Khair,<br>
                <strong>Highrise.pk Verification Team</strong><br>
                <span style="color:#999;font-size:13px;">
                  📧 support@highrise.pk
                </span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:20px 30px;
                       text-align:center;border-top:1px solid #e9ecef;">
              <p style="color:#999;font-size:12px;margin:0;">
                Highrise.pk — Pakistan's First Verified Real Estate Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      message: "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  // ── Admin auth ───────────────────────────────────────────────
  const admin = await requireAdmin(req, res);
  if (!admin) return; // requireAdmin already sent response

  // ── Validate [id] param ──────────────────────────────────────
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
        city: 1,
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

    // ── Status guard — only pending can be approved ──────────────
    if (profile.status === "approved") {
      return void res.status(409).json({
        success: false,
        message: "This agent application is already approved.",
        requestId,
      });
    }

    if (profile.status === "rejected") {
      return void res.status(409).json({
        success: false,
        message:
          "This application was previously rejected. Agent must reapply.",
        requestId,
      });
    }

    if (profile.status === "suspended") {
      return void res.status(409).json({
        success: false,
        message:
          "This agent is suspended. Use the unsuspend endpoint instead.",
        requestId,
      });
    }

    if (
  profile.status !== "pending" &&
  profile.status !== "draft" &&
  profile.status !== "info_required"
) {
      return void res.status(409).json({
        success: false,
        message: `Cannot approve profile with status: ${profile.status}`,
        requestId,
      });
    }

    // ── Fetch the linked User ────────────────────────────────────
    const linkedUser = await User.findOne({
      _id: profile.user,
      isDeleted: false,
    })
      .select({
        _id: 1,
        email: 1,
        name: 1,
        role: 1,
        tokenVersion: 1,
        isDeleted: 1,
        status: 1,
      })
      .lean<UserLean>();

    if (!linkedUser) {
      await logSecurityEvent({
        type: "admin_action",
        severity: "high",
        userId: admin.id,
        req,
        metadata: {
          reason: "Agent profile references non-existent user",
          action: "agent_approve_failed",
          profileId: id,
          linkedUserId: String(profile.user),
        },
      });
      return void res.status(404).json({
        success: false,
        message:
          "Linked user account not found. Cannot approve this profile.",
        requestId,
      });
    }

    if (linkedUser.status !== "active") {
      return void res.status(409).json({
        success: false,
        message: `Cannot approve agent: linked user account is ${linkedUser.status}.`,
        requestId,
      });
    }

    // ════════════════════════════════════════════════════════════
    // ATOMIC APPROVAL — Update AgentProfile + User in sequence
    // MongoDB does not support cross-collection transactions
    // without a replica set. We update AgentProfile first (safe
    // to retry), then User. If User update fails, profile stays
    // approved but role not set — caught by logSecurityEvent.
    // ════════════════════════════════════════════════════════════

    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);
    const currentTokenVersion =
      typeof linkedUser.tokenVersion === "number"
        ? linkedUser.tokenVersion
        : 0;

    // ── Step 1: Approve AgentProfile ────────────────────────────
    // V6.8.7: Approval ≠ Document Verification
    // Admin approves the profile to activate the agent, but must
    // manually verify each document (CNIC/License/NTN/SECP) and
    // office separately. This is the enterprise-grade granular
    // verification pattern used by Zameen Pro, Bayut, etc.
    await AgentProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          status:               "approved",
          verifiedAt:           now,
          verifiedBy:           adminObjectId,
          verificationLevel:    "documents_pending",  // NOT auto-verified
          lastActivityAt:       now,
        },
        $push: {
          auditTrail: {
            action:      "profile_approved",
            performedBy: adminObjectId,
            performedAt: now,
            changes: {
              status: { from: profile.status, to: "approved" },
              role:   { from: linkedUser.role, to: "agent" },
              note:   "Individual verifications pending admin action",
            },
          },
        },
      }
    );

    // V6.8.6: Auto-calculate Trust Score after approval
    // Uses AgentProfile.calculateTrustScore() instance method (from schema)
    try {
      const fullProfile = await AgentProfile.findById(profile._id);
      if (fullProfile) {
        await fullProfile.calculateTrustScore();
        await fullProfile.save();
      }
    } catch {
      // Non-fatal — don't fail the approval
    }

    // ── Step 2: Promote User to agent + increment tokenVersion ───
    // V6.8.0: Sets capability flags AND role (backward compat)
    // - isVerifiedAgent: true       → new source of truth (Session 3 pattern)
    // - agentVerificationStatus     → mirrors AgentProfile.status
    // - agentProfileId              → link back to AgentProfile
    // - role: "agent"               → kept for backward compat with old code
    // - tokenVersion++              → forces re-login with new claims
    const userUpdateResult = await User.updateOne(
      { _id: linkedUser._id },
      {
        $set: {
          role:                     "agent",
          isVerifiedAgent:          true,
          agentVerificationStatus:  "approved",
          agentProfileId:           profile._id,
        },
        $inc: {
          tokenVersion: 1,   // Invalidates all existing sessions
        },
      }
    );

    // Safety check — user update must succeed
    // matchedCount check is safer than modifiedCount
    // (modifiedCount=0 if user already had these values, which shouldn't happen but be safe)
    if (userUpdateResult.matchedCount === 0) {
      // Rollback AgentProfile status
      await AgentProfile.updateOne(
        { _id: profile._id },
        {
          $set: { status: "pending" },
          $pop: { auditTrail: 1 }, // Remove last entry (the failed approval)
        }
      );

      await logSecurityEvent({
        type:     "admin_action",
        severity: "critical",
        userId:   admin.id,
        req,
        metadata: {
          reason:    "User role update failed during agent approval — rollback executed",
          action:    "agent_approve_rollback",
          profileId: id,
          linkedUserId: String(linkedUser._id),
        },
      });

      return void res.status(500).json({
        success: false,
        message:
          "Approval failed: could not update user role. Please try again.",
        requestId,
      });
    }

    // Fetch updated trust score for audit log
    const approvedProfile = await AgentProfile.findById(profile._id)
      .select("trustScore verificationLevel")
      .lean<{ trustScore?: { overall?: number }; verificationLevel?: string }>();

    // ── Audit log ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     "admin_action",
      severity: "medium",
      userId:   admin.id,
      req,
      metadata: {
        action:                    "agent_approved",
        profileId:                 id,
        agentUserId:               String(linkedUser._id),
        agentEmail:                linkedUser.email,
        agencyName:                profile.agencyName ?? profile.displayName,
        roleFrom:                  linkedUser.role,
        roleTo:                    "agent",
        capabilityGranted:         "isVerifiedAgent",
        agentVerificationStatus:   "approved",
        tokenVersion:              currentTokenVersion + 1,
        // V6.8.6: Trust score tracking
        trustScore:                approvedProfile?.trustScore?.overall ?? 0,
        verificationLevel:         approvedProfile?.verificationLevel ?? "basic_verified",
        documentsAutoVerified:     true,
        approvedBy:                admin.id,
        approvedAt:                now.toISOString(),
      },
    });

    // ── Approval email (fire-and-forget) ─────────────────────────
    void sendEmail({
      to:       profile.email,
      subject:  "🎉 Application Approved — Highrise.pk Agent",
      html:     buildApprovalEmail({
        name:       linkedUser.name ?? profile.displayName,
        agencyName: profile.agencyName,
      }),
      fromName: "Highrise.pk Verification",
    });

    // ── Success response ─────────────────────────────────────────
    return void res.status(200).json({
      success: true,
      message: `Agent approved successfully. ${linkedUser.email} has been notified and must re-login to access agent features.`,
      requestId,
      data: {
        profileId: id,
        agentEmail: profile.email,
        newRole: "agent",
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
        reason:   "Unhandled error during agent approval",
        action:   "agent_approve_error",
        error:    message,
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