// pages/api/admin/developers/[developerId]/approve.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — APPROVE DEVELOPER APPLICATION — Highrise.pk
// 🔒 ENTERPRISE-GRADE | Admin Only | Full Audit Trail
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. Admin reviews pending DeveloperProfile
//   2. DeveloperProfile.status → "approved"
//   3. DeveloperProfile.isVerified → true
//   4. DeveloperProfile.verificationLevel → "docs_verified"
//   5. User.role → "developer"
//   6. User.tokenVersion++ (forces developer to re-login)
//   7. Confirmation email → developer
//   8. Full audit trail via logSecurityEvent()
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";

import User from "@/models/User";
import DeveloperProfile from "@/models/DeveloperProfile";

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
    newRole: string;
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
  email: string;
  name?: string;
  role: string;
  tokenVersion?: number;
  isDeleted: boolean;
  status: string;
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

function buildApprovalEmail(developer: {
  name: string;
  companyName: string;
  developerType: string;
}): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
  const safeName = escapeHtml(developer.name);
  const safeCompany = escapeHtml(developer.companyName);
  const safeType = escapeHtml(developer.developerType);

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
                Aapki Developer Application Approve Ho Gayi
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
                <strong>${safeCompany}</strong> (${safeType}) ki application
                <strong>Highrise.pk</strong> par approved ho gayi hai!
              </p>

              <!-- What's unlocked -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                          border-radius:12px;padding:24px;margin:24px 0;">
                <strong style="color:#166534;font-size:16px;">
                  ✅ Ab Aap Kar Sakte Hain:
                </strong>
                <ul style="color:#166534;margin:12px 0 0;
                           padding-left:20px;line-height:2;">
                  <li>Projects aur Units list kar sakte hain</li>
                  <li>Verified developers mein dikheinge</li>
                  <li>Buyers se leads receive kar sakte hain</li>
                  <li>Developer dashboard access kar sakte hain</li>
                  <li>Company profile public page available hai</li>
                </ul>
              </div>

              <!-- Important notice -->
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;
                          padding:16px;border-radius:0 8px 8px 0;margin:0 0 28px;">
                <strong style="color:#92400e;">⚠️ Zaroori / Important:</strong>
                <p style="color:#92400e;margin:8px 0 0;font-size:14px;">
                  Dubara login karein taake aapka naya role activate ho.
                  Please re-login to activate your developer account.
                </p>
              </div>

              <!-- CTAs -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${siteUrl}/auth/login"
                   style="display:inline-block;background:#029bba;color:#ffffff;
                          padding:14px 28px;text-decoration:none;border-radius:8px;
                          font-weight:600;font-size:16px;margin-right:12px;">
                  Login Again →
                </a>
                <a href="${siteUrl}/developer/dashboard"
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
        message: "This developer application is already approved.",
        requestId,
      });
    }

    if (profile.status === "rejected") {
      return void res.status(409).json({
        success: false,
        message:
          "This application was previously rejected. Developer must reapply.",
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
        message: `Cannot approve profile with status: ${profile.status}`,
        requestId,
      });
    }

    // ── Fetch linked User ─────────────────────
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
          reason: "Developer profile references non-existent user",
          action: "developer_approve_failed",
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
        message: `Cannot approve developer: linked user account is ${linkedUser.status}.`,
        requestId,
      });
    }

    // ════════════════════════════════════════
    // ATOMIC APPROVAL
    // Step 1: Approve DeveloperProfile
    // Step 2: Promote User role + tokenVersion++
    // Rollback Step 1 if Step 2 fails
    // ════════════════════════════════════════

    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);
    const currentTokenVersion =
      typeof linkedUser.tokenVersion === "number"
        ? linkedUser.tokenVersion
        : 0;

    // ── Step 1: Approve DeveloperProfile ──────
    await DeveloperProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          status: "approved",
          isVerified: true,
          verifiedAt: now,
          verifiedBy: adminObjectId,
          verificationLevel: "docs_verified",
          lastActivityAt: now,
        },
        $push: {
          verificationHistory: {
            status: "approved",
            by: adminObjectId,
            at: now,
            notes: `Approved by admin ${admin.id}`,
          },
          auditTrail: {
            action: "developer_profile_approved",
            performedBy: adminObjectId,
            performedAt: now,
            changes: {
              status: { from: profile.status, to: "approved" },
              isVerified: { from: false, to: true },
              role: { from: linkedUser.role, to: "developer" },
            },
          },
        },
      }
    );

    // ── Step 2: Promote User → developer ──────
    // tokenVersion++ invalidates ALL existing sessions
    // Developer must re-login to get JWT with role: "developer"
    const userUpdateResult = await User.updateOne(
      { _id: linkedUser._id },
      {
        $set: { role: "developer" },
        $inc: { tokenVersion: 1 },
      }
    );

    // ── Rollback if User update failed ────────
    if (userUpdateResult.modifiedCount === 0) {
      await DeveloperProfile.updateOne(
        { _id: profile._id },
        {
          $set: {
            status: profile.status,
            isVerified: false,
            verifiedAt: undefined,
            verifiedBy: undefined,
            verificationLevel: "docs_pending",
          },
          $pop: {
            verificationHistory: 1,
            auditTrail: 1,
          },
        }
      );

      await logSecurityEvent({
        type: "admin_action",
        severity: "critical",
        userId: admin.id,
        req,
        metadata: {
          reason:
            "User role update failed during developer approval — rollback executed",
          action: "developer_approve_rollback",
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

    // ── Audit log ─────────────────────────────
    await logSecurityEvent({
      type: "admin_action",
      severity: "medium",
      userId: admin.id,
      req,
      metadata: {
        action: "developer_approved",
        profileId: id,
        developerUserId: String(linkedUser._id),
        developerEmail: linkedUser.email,
        companyName: profile.companyName,
        developerType: profile.developerType,
        roleFrom: linkedUser.role,
        roleTo: "developer",
        newTokenVersion: currentTokenVersion + 1,
        approvedBy: admin.id,
        approvedAt: now.toISOString(),
      },
    });

    // ── Approval email — fire and forget ──────
    void sendEmail({
      to: profile.email,
      subject: "🎉 Application Approved — Highrise.pk Developer",
      html: buildApprovalEmail({
        name: linkedUser.name ?? profile.companyName,
        companyName: profile.companyName,
        developerType: profile.developerType,
      }),
      fromName: "Highrise.pk Verification",
    });

    // ── Success ───────────────────────────────
    return void res.status(200).json({
      success: true,
      message: `Developer approved successfully. ${linkedUser.email} has been notified and must re-login to access developer features.`,
      requestId,
      data: {
        profileId: id,
        developerEmail: profile.email,
        newRole: "developer",
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
        reason: "Unhandled error during developer approval",
        action: "developer_approve_error",
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