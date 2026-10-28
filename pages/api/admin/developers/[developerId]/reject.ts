// pages/api/admin/developers/[developerId]/reject.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — REJECT DEVELOPER APPLICATION — Highrise.pk
// 🔒 ENTERPRISE-GRADE | Admin Only | Full Audit Trail
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. Admin reviews pending DeveloperProfile
//   2. Admin provides rejection reason (mandatory, min 10 chars)
//   3. DeveloperProfile.status → "rejected"
//   4. User.role stays "user" (no promotion — never happened)
//   5. Rejection email → developer with reason + reapply CTA
//   6. Developer may reapply via /onboarding/business
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";

import DeveloperProfile from "@/models/DeveloperProfile";
import User from "@/models/User";

// ============================================
// TYPES
// ============================================

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
  data?: {
    profileId: string;
    developerEmail: string;
  };
}

interface DeveloperProfileLean {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  status: string;
  companyName: string;
  email: string;
  developerType: string;
  city: string;
  isDeleted: boolean;
}

interface UserLean {
  _id: Types.ObjectId;
  name?: string;
  email: string;
}

// ============================================
// SECURITY HEADERS
// ============================================

function setSecurityHeaders(
  res: NextApiResponse,
  requestId: string
): void {
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

// ============================================
// EMAIL HELPER
// ============================================

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildRejectionEmail(developer: {
  name: string;
  companyName: string;
  developerType: string;
  reason: string;
}): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";

  const safeName = escapeHtml(developer.name);
  const safeCompany = escapeHtml(developer.companyName);
  const safeType = escapeHtml(developer.developerType);
  const safeReason = escapeHtml(developer.reason);

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
                Highrise.pk Developer Verification Team
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;">
              <p style="font-size:16px;color:#333;margin:0 0 16px;">
                Assalam-u-Alaikum <strong>${safeName}</strong>,
              </p>

              <p style="font-size:16px;color:#555;margin:0 0 16px;line-height:1.6;">
                Hamari team ne <strong>${safeCompany}</strong>
                (${safeType}) ki application review ki hai.
                Afsos ke sath batana padta hai ke is waqt aapki
                application approve nahi ho saki.
              </p>

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
                  <li>SECP certificate aur NTN documents verify karein</li>
                  <li>Profile update karke dobara apply karein</li>
                  <li>Koi sawal ho to support se rabta karein</li>
                </ul>
              </div>

              <!-- Common reasons reference -->
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;
                          padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
                <strong style="color:#92400e;font-size:14px;">
                  ⚠️ Common Rejection Reasons:
                </strong>
                <ul style="color:#92400e;margin:8px 0 0;font-size:13px;
                           padding-left:20px;line-height:1.8;">
                  <li>Unclear or invalid SECP / NTN documents</li>
                  <li>Incomplete company information</li>
                  <li>Mismatched registration details</li>
                  <li>Low quality or unreadable document scans</li>
                </ul>
              </div>

              <!-- Good news: can reapply -->
              <div style="background:#f0fdf4;border-left:4px solid #10b981;
                          padding:16px;border-radius:0 8px 8px 0;margin:0 0 28px;">
                <strong style="color:#166534;font-size:14px;">
                  ✅ Good News / Achi Khabar:
                </strong>
                <p style="color:#166534;margin:8px 0 0;font-size:14px;">
                  Aap dobara apply kar sakte hain. Issues fix karke
                  updated documents ke sath naya application submit karein.
                </p>
              </div>

              <!-- CTAs -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${siteUrl}/developer/profile"
                   style="display:inline-block;background:#029bba;color:#ffffff;
                          padding:14px 28px;text-decoration:none;border-radius:8px;
                          font-weight:600;font-size:16px;margin-right:12px;">
                  Update Profile →
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
                  📧 developers@highrise.pk
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

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // ── Correlation ID ────────────────────────
  const requestId =
    typeof req.headers["x-correlation-id"] === "string"
      ? req.headers["x-correlation-id"]
      : crypto.randomUUID();

  setSecurityHeaders(res, requestId);

  // ── Method guard ──────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return void res.status(405).json({
      success: false,
      message: "Method not allowed.",
      requestId,
    });
  }

  // ── Rate limiting ─────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success: false,
      message: "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  // ── Admin auth ────────────────────────────
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── Validate [developerId] param ──────────
  const { developerId } = req.query;
  const id = typeof developerId === "string" ? developerId.trim() : "";

  if (!id || !Types.ObjectId.isValid(id)) {
    return void res.status(400).json({
      success: false,
      message: "Invalid developer profile ID.",
      requestId,
    });
  }

  // ── Parse + validate rejection reason ─────
  const body = req.body as Record<string, unknown>;
  const reason = String(body.reason ?? "").trim().slice(0, 500);

  if (!reason || reason.length < 10) {
    return void res.status(400).json({
      success: false,
      message:
        "Rejection reason is required (minimum 10 characters). This reason is sent to the developer.",
      requestId,
    });
  }

  await dbConnect();

  try {
    // ── Fetch DeveloperProfile ────────────────
    const profile = await DeveloperProfile.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    })
      .select({
        _id: 1,
        user: 1,
        status: 1,
        companyName: 1,
        email: 1,
        developerType: 1,
        city: 1,
        isDeleted: 1,
      })
      .lean<DeveloperProfileLean>();

    if (!profile) {
      return void res.status(404).json({
        success: false,
        message: "Developer profile not found.",
        requestId,
      });
    }

    // ── Status guards ─────────────────────────
    if (profile.status === "approved") {
      return void res.status(409).json({
        success: false,
        message:
          "Cannot reject an already approved developer. Use suspend instead.",
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

    if (profile.status === "suspended") {
      return void res.status(409).json({
        success: false,
        message:
          "This developer is suspended. Use the unsuspend endpoint instead.",
        requestId,
      });
    }

    if (
      profile.status !== "pending" &&
      profile.status !== "draft"
    ) {
      return void res.status(409).json({
        success: false,
        message: `Cannot reject profile with status: ${profile.status}`,
        requestId,
      });
    }

    // ── Fetch linked User (name for email) ────
    const linkedUser = await User.findOne({ _id: profile.user })
      .select({ _id: 1, name: 1, email: 1 })
      .lean<UserLean>();

    // ── Update DeveloperProfile → rejected ────
    // User.role stays "user" — no promotion ever happened
    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);

    await DeveloperProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          status: "rejected",
          rejectionReason: reason,
          lastActivityAt: now,
        },
        $push: {
          verificationHistory: {
            status: "rejected",
            by: adminObjectId,
            at: now,
            notes: reason,
          },
          auditTrail: {
            action: "developer_profile_rejected",
            performedBy: adminObjectId,
            performedAt: now,
            changes: {
              status: { from: profile.status, to: "rejected" },
              rejectionReason: reason,
            },
          },
        },
      }
    );

    // ── Audit log ─────────────────────────────
    await logSecurityEvent({
      type: "kyc_rejected",
      severity: "medium",
      userId: admin.id,
      req,
      metadata: {
        action: "developer_rejected",
        profileId: id,
        developerUserId: String(profile.user),
        developerEmail: profile.email,
        companyName: profile.companyName,
        developerType: profile.developerType,
        reason,
        rejectedBy: admin.id,
        rejectedAt: now.toISOString(),
      },
    });

    // ── Rejection email — fire and forget ─────
    void sendEmail({
      to: profile.email,
      subject: "Application Update — Highrise.pk Developer Verification",
      html: buildRejectionEmail({
        name: linkedUser?.name ?? profile.companyName,
        companyName: profile.companyName,
        developerType: profile.developerType,
        reason,
      }),
      fromName: "Highrise.pk Verification",
    });

    // ── Success ───────────────────────────────
    return void res.status(200).json({
      success: true,
      message: `Application rejected. ${profile.email} has been notified with the reason.`,
      requestId,
      data: {
        profileId: id,
        developerEmail: profile.email,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected error occurred";

    await logSecurityEvent({
      type: "admin_action",
      severity: "high",
      userId: admin.id,
      req,
      metadata: {
        reason: "Unhandled error during developer rejection",
        action: "developer_reject_error",
        error: message,
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