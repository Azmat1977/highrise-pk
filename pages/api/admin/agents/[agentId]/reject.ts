// pages/api/admin/agents/[id]/reject.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — REJECT AGENT APPLICATION - Highrise.pk
// 🔒 ENTERPRISE-GRADE | Admin Only | Full Audit Trail
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. Admin reviews pending AgentProfile
//   2. Admin provides rejection reason (mandatory)
//   3. AgentProfile.status → "rejected"
//   4. User.role remains "user" (no promotion)
//   5. Rejection email sent to agent with reason
//   6. Agent may reapply (new profile submission)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";

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

function buildRejectionEmail(agent: {
  name: string;
  agencyName?: string;
  reason: string;
}): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
  const safeName   = escapeHtml(agent.name);
  const safeReason = escapeHtml(agent.reason);
  const safeAgency = agent.agencyName
    ? escapeHtml(agent.agencyName)
    : null;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update — Highrise.pk</title>
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
            <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);
                       padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">
                Application Update
              </h1>
              <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:15px;">
                Highrise.pk Verification Team
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
                Hamari team ne <strong>${safeAgency}</strong> ki application review ki hai.
                Afsos ke sath batana padta hai ke is waqt aapki application approve nahi ho saki.
              </p>` : `
              <p style="font-size:16px;color:#555;margin:0 0 16px;line-height:1.6;">
                Hamari team ne aapki application review ki hai.
                Afsos ke sath batana padta hai ke is waqt aapki application
                approve nahi ho saki.
              </p>`}

              <!-- Rejection reason -->
              <div style="background:#fef2f2;border-left:4px solid #ef4444;
                          padding:20px;border-radius:0 8px 8px 0;margin:24px 0;">
                <strong style="color:#991b1b;font-size:15px;">
                  ❌ Rejection Reason / Wajah:
                </strong>
                <p style="color:#991b1b;margin:10px 0 0;font-size:15px;
                          line-height:1.6;">
                  ${safeReason}
                </p>
              </div>

              <!-- What to do next -->
              <div style="background:#f0f9ff;border:1px solid #bae6fd;
                          border-radius:12px;padding:24px;margin:24px 0;">
                <strong style="color:#0c4a6e;font-size:15px;">
                  📋 Agle Qadam / Next Steps:
                </strong>
                <ul style="color:#0c4a6e;margin:12px 0 0;
                           padding-left:20px;line-height:2;font-size:14px;">
                  <li>Upar di gayi wajah ko address karein</li>
                  <li>Apni details update karein aur dobara apply karein</li>
                  <li>Koi sawal ho to support se rabta karein</li>
                </ul>
              </div>

              <!-- Important: can reapply -->
              <div style="background:#f0fdf4;border-left:4px solid #10b981;
                          padding:16px;border-radius:0 8px 8px 0;margin:0 0 28px;">
                <strong style="color:#166534;font-size:14px;">
                  ✅ Good News / Achi Khabar:
                </strong>
                <p style="color:#166534;margin:8px 0 0;font-size:14px;">
                  Aap dobara apply kar sakte hain. Issues fix karke
                  naya application submit karein.
                </p>
              </div>

              <!-- CTAs -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${siteUrl}/onboarding/business?role=agent"
                   style="display:inline-block;background:#029bba;color:#ffffff;
                          padding:14px 28px;text-decoration:none;border-radius:8px;
                          font-weight:600;font-size:16px;margin-right:12px;">
                  Reapply Now →
                </a>
                <a href="${siteUrl}/contact"
                   style="display:inline-block;background:#6b7280;color:#ffffff;
                          padding:14px 28px;text-decoration:none;border-radius:8px;
                          font-weight:600;font-size:16px;">
                  Contact Support
                </a>
              </div>

              <p style="font-size:15px;color:#555;line-height:1.6;margin:0;">
                Shukriya,<br>
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
      message: "Too many requests.",
      requestId,
    });
  }

  // ── Admin auth ───────────────────────────────────────────────
  const admin = await requireAdmin(req, res);
  if (!admin) return;

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

  // ── Parse + validate body ────────────────────────────────────
  const body = req.body as Record<string, unknown>;
  const reason = String(body.reason ?? "").trim().slice(0, 500);

  if (!reason || reason.length < 10) {
    return void res.status(400).json({
      success: false,
      message:
        "Rejection reason is required (minimum 10 characters). This is sent to the agent.",
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

    // ── Status guards ────────────────────────────────────────────
    if (profile.status === "approved") {
      return void res.status(409).json({
        success: false,
        message:
          "Cannot reject an already approved agent. Use suspend instead.",
        requestId,
      });
    }

    if (profile.status === "rejected") {
      return void res.status(409).json({
        success: false,
        message: "This application is already rejected.",
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
        message: `Cannot reject profile with status: ${profile.status}`,
        requestId,
      });
    }

    // ── Fetch linked User (for name in email + role check) ───────
    const linkedUser = await User.findOne({ _id: profile.user })
      .select({ _id: 1, name: 1, email: 1, role: 1 })
      .lean<UserLean>();

    // ── Update AgentProfile → rejected ───────────────────────────
    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);

    await AgentProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          status:          "rejected",
          rejectionReason: reason,
          lastActivityAt:  now,
        },
        $push: {
          auditTrail: {
            action:      "profile_rejected",
            performedBy: adminObjectId,
            performedAt: now,
            changes: {
              status:          { from: profile.status, to: "rejected" },
              rejectionReason: reason,
            },
          },
        },
      }
    );

    // ── V6.8.0: Sync capability flags on User ────────────────────
    // If user was previously approved (edge case), revoke agent access
    // Always update agentVerificationStatus mirror
    // tokenVersion++ forces re-login (ensures session reflects new status)
    if (linkedUser) {
      const userUpdate: Record<string, unknown> = {
        $set: {
          isVerifiedAgent:         false,
          agentVerificationStatus: "rejected",
        },
        $inc: {
          tokenVersion: 1,
        },
      };

      // Only downgrade role if user was previously an "agent"
      // (protects admin accounts from accidental downgrade)
      if (linkedUser.role === "agent") {
        (userUpdate.$set as Record<string, unknown>).role = "user";
      }

      await User.updateOne({ _id: linkedUser._id }, userUpdate);
    }

    // ── Audit log ────────────────────────────────────────────────
    await logSecurityEvent({
      type:     "kyc_rejected",
      severity: "medium",
      userId:   admin.id,
      req,
      metadata: {
        action:                    "agent_rejected",
        profileId:                 id,
        agentUserId:               String(profile.user),
        agentEmail:                profile.email,
        agencyName:                profile.agencyName ?? profile.displayName,
        reason,
        capabilityRevoked:         "isVerifiedAgent",
        agentVerificationStatus:   "rejected",
        rejectedBy:                admin.id,
        rejectedAt:                now.toISOString(),
      },
    });

    // ── Rejection email (fire-and-forget) ────────────────────────
   void sendEmail({
      to:       profile.email,
      subject:  "Application Update — Highrise.pk",
      html:     buildRejectionEmail({
        name:       linkedUser?.name ?? profile.displayName,
        agencyName: profile.agencyName,
        reason,
      }),
      fromName: "Highrise.pk Verification",
    });

    // ── Success ──────────────────────────────────────────────────
    return void res.status(200).json({
      success: true,
      message: `Application rejected. ${profile.email} has been notified with the reason.`,
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
        reason:   "Unhandled error during agent rejection",
        action:   "agent_reject_error",
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