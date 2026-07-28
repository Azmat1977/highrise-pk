// pages/api/admin/owners/[ownerId]/approve.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — APPROVE OWNER VERIFICATION - Highrise.pk V6.6.0
// 🔒 ENTERPRISE-GRADE | Admin Only | Full Audit Trail | Rollback
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. Admin reviews pending OwnerProfile
//   2. This endpoint sets OwnerProfile.status → "approved"
//   3. User.isVerifiedOwner → true
//   4. User.ownerVerificationStatus → "approved"
//   5. User.tokenVersion++ (forces token refresh)
//   6. Confirmation email sent to owner
//   7. Full audit trail via logSecurityEvent()
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";
import crypto from "crypto";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";

import User from "@/models/User";
import OwnerProfile from "@/models/OwnerProfile";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
  data?: {
    profileId: string;
    ownerEmail: string;
    isVerifiedOwner: boolean;
  };
}

interface OwnerProfileLean {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  status: string;
  displayName: string;
  email: string;
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

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cache-Control", "no-store, max-age=0");
}

// ═══════════════════════════════════════════════════════════════
// EMAIL BUILDER
// ═══════════════════════════════════════════════════════════════

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildApprovalEmail(name: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
  const safeName = escapeHtml(name);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verified Owner — Highrise.pk</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8f9fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">
                🎉 Mubarak Ho!
              </h1>
              <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">
                Aap Verified Owner Ban Gaye
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <p style="font-size:16px;color:#333;margin:0 0 16px;">
                Assalam-u-Alaikum <strong>${safeName}</strong>,
              </p>
              <p style="font-size:16px;color:#555;margin:0 0 16px;line-height:1.6;">
                Aap ki <strong>Verified Owner</strong> application <strong>Highrise.pk</strong> par approved ho gayi hai! 🎊
              </p>

              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin:24px 0;">
                <strong style="color:#166534;font-size:16px;">✅ Ab Aap Kar Sakte Hain:</strong>
                <ul style="color:#166534;margin:12px 0 0;padding-left:20px;line-height:2;">
                  <li><strong>10 properties</strong> tak list kar sakte hain</li>
                  <li>Har listing par <strong>🛡️ Verified Owner</strong> badge dikhega</li>
                  <li>Buyers aap se direct contact kar sakte hain</li>
                  <li>Aap ki listings pe zyada trust milega</li>
                  <li>SafeDeal protection use kar sakte hain</li>
                </ul>
              </div>

              <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin:0 0 28px;">
                <strong style="color:#92400e;">⚠️ Zaroori / Important:</strong>
                <p style="color:#92400e;margin:8px 0 0;font-size:14px;">
                  Dubara login karein taake aap ka Verified Owner status activate ho.<br>
                  Please logout and login again to activate your verified status.
                </p>
              </div>

              <div style="text-align:center;margin:0 0 28px;">
                <a href="${siteUrl}/login" style="display:inline-block;background:#029bba;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;margin-right:12px;">
                  Login Again →
                </a>
                <a href="${siteUrl}/owner/dashboard" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
                  Dashboard →
                </a>
              </div>

              <p style="font-size:15px;color:#555;line-height:1.6;margin:0;">
                JazakAllah Khair,<br>
                <strong>Highrise.pk Verification Team</strong><br>
                <span style="color:#999;font-size:13px;">📧 support@highrise.pk | 📱 +92 333 5877106</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9fa;padding:20px 30px;text-align:center;border-top:1px solid #e9ecef;">
              <p style="color:#999;font-size:12px;margin:0;">
                Highrise.pk — Pakistan's First Verified Property Marketplace
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
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    return sendRateLimitResponse(res, rl);
  }

  // ── Admin auth ───────────────────────────────────────────────
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── Validate [ownerId] param ─────────────────────────────────
  const { ownerId } = req.query;
  const id = typeof ownerId === "string" ? ownerId : "";
  if (!id || !Types.ObjectId.isValid(id)) {
    return void res.status(400).json({
      success: false,
      message: "Invalid owner profile ID",
      requestId,
    });
  }

  try {
    await dbConnect();

    // ── Fetch OwnerProfile ───────────────────────────────────────
    const profile = await OwnerProfile.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    })
      .select({
        _id: 1,
        user: 1,
        status: 1,
        displayName: 1,
        email: 1,
        city: 1,
        isDeleted: 1,
      })
      .lean<OwnerProfileLean>();

    if (!profile) {
      return void res.status(404).json({
        success: false,
        message: "Owner profile not found",
        requestId,
      });
    }

    // ── Status guards ────────────────────────────────────────────
    if (profile.status === "approved") {
      return void res.status(409).json({
        success: false,
        message: "This owner is already approved",
        requestId,
      });
    }

    if (profile.status === "suspended") {
      return void res.status(409).json({
        success: false,
        message: "This owner is suspended. Use unsuspend endpoint instead.",
        requestId,
      });
    }

    if (
      profile.status !== "pending" &&
      profile.status !== "draft" &&
      profile.status !== "info_required" &&
      profile.status !== "rejected"
    ) {
      return void res.status(409).json({
        success: false,
        message: `Cannot approve profile with status: ${profile.status}`,
        requestId,
      });
    }

    // ── Fetch linked User ────────────────────────────────────────
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
          reason: "Owner profile references non-existent user",
          action: "owner_approve_failed",
          profileId: id,
          linkedUserId: String(profile.user),
        },
      });
      return void res.status(404).json({
        success: false,
        message: "Linked user account not found",
        requestId,
      });
    }

    if (linkedUser.status !== "active") {
      return void res.status(409).json({
        success: false,
        message: `Cannot approve: linked user account is ${linkedUser.status}`,
        requestId,
      });
    }

    // ════════════════════════════════════════════════════════════
    // ATOMIC APPROVAL — OwnerProfile + User
    // Similar rollback pattern as agent approve
    // ════════════════════════════════════════════════════════════
    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);

    // ── Step 1: Approve OwnerProfile ────────────────────────────
    await OwnerProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          status: "approved",
          verificationLevel: "full_verified",
          cnicVerified: true,
          cnicVerifiedAt: now,
          verifiedAt: now,
          verifiedBy: adminObjectId,
          rejectionReason: undefined,
          infoRequiredReason: undefined,
          lastActivityAt: now,
          "documents.cnicFront.verifiedAt": now,
          "documents.cnicFront.verifiedBy": adminObjectId,
        },
        $push: {
          auditTrail: {
            action: "profile_approved",
            performedBy: adminObjectId,
            performedAt: now,
            changes: {
              status: { from: profile.status, to: "approved" },
              verificationLevel: { to: "full_verified" },
              cnicVerified: { to: true },
            },
          },
        },
      }
    );

    // ── Step 2: Update User ─────────────────────────────────────
    const userUpdateResult = await User.updateOne(
      { _id: linkedUser._id },
      {
        $set: {
          isVerifiedOwner: true,
          ownerVerificationStatus: "approved",
        },
        $inc: {
          tokenVersion: 1, // Force session refresh
        },
      }
    );

    // ── Safety check — rollback if User update failed ───────────
    if (userUpdateResult.modifiedCount === 0) {
      await OwnerProfile.updateOne(
        { _id: profile._id },
        {
          $set: {
            status: "pending",
            verifiedAt: undefined,
            verifiedBy: undefined,
            cnicVerified: false,
            cnicVerifiedAt: undefined,
          },
          $pop: { auditTrail: 1 },
        }
      );

      await logSecurityEvent({
        type: "admin_action",
        severity: "critical",
        userId: admin.id,
        req,
        metadata: {
          reason: "User update failed during owner approval — rollback executed",
          action: "owner_approve_rollback",
          profileId: id,
          linkedUserId: String(linkedUser._id),
        },
      });

      return void res.status(500).json({
        success: false,
        message: "Approval failed. Please try again.",
        requestId,
      });
    }

    // ── Audit log (success) ──────────────────────────────────────
    await logSecurityEvent({
      type: "admin_action",
      severity: "medium",
      userId: admin.id,
      req,
      metadata: {
        action: "owner_approved",
        profileId: id,
        ownerUserId: String(linkedUser._id),
        ownerEmail: linkedUser.email,
        ownerName: profile.displayName,
        city: profile.city,
        statusFrom: profile.status,
        statusTo: "approved",
        approvedBy: admin.id,
        approvedAt: now.toISOString(),
      },
    });

    // ── Send approval email (fire-and-forget) ────────────────────
    void sendEmail({
      to: profile.email,
      subject: "🎉 Verified Owner — Highrise.pk",
      html: buildApprovalEmail(linkedUser.name ?? profile.displayName),
      fromName: "Highrise.pk Verification",
    });

    // ── Success response ─────────────────────────────────────────
    return void res.status(200).json({
      success: true,
      message: `Owner approved successfully. ${linkedUser.email} has been notified.`,
      requestId,
      data: {
        profileId: id,
        ownerEmail: profile.email,
        isVerifiedOwner: true,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    await logSecurityEvent({
      type: "admin_action",
      severity: "high",
      userId: admin.id,
      req,
      metadata: {
        reason: "Unhandled error during owner approval",
        action: "owner_approve_error",
        error: message,
        profileId: id,
      },
    }).catch(() => undefined);

    return void res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      requestId,
    });
  }
}