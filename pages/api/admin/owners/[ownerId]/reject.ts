// pages/api/admin/owners/[ownerId]/reject.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — REJECT OWNER VERIFICATION - Highrise.pk V6.6.0
// 🔒 Admin Only | Requires Reason | Full Audit
// ═══════════════════════════════════════════════════════════════
// Body: { reason: string, requestMoreInfo?: boolean }
//   → If requestMoreInfo=true: status → "info_required" (soft rejection)
//   → Else: status → "rejected" (hard rejection)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";
import { z } from "zod";
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
  errors?: unknown;
}

interface OwnerProfileLean {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  status: string;
  displayName: string;
  email: string;
  isDeleted: boolean;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

const RejectSchema = z.object({
  reason: z.string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(1000, "Reason too long"),
  requestMoreInfo: z.boolean().default(false),
});

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
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

function buildRejectionEmail(name: string, reason: string, requestMoreInfo: boolean): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
  const safeName = escapeHtml(name);
  const safeReason = escapeHtml(reason);

  const title = requestMoreInfo ? "Application Needs Update" : "Application Not Approved";
  const gradientFrom = requestMoreInfo ? "#f59e0b" : "#ef4444";
  const gradientTo = requestMoreInfo ? "#d97706" : "#dc2626";
  const heading = requestMoreInfo ? "📝 Update Required" : "❌ Application Update";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Highrise.pk</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8f9fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,${gradientFrom} 0%,${gradientTo} 100%);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">
                ${heading}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <p style="font-size:16px;color:#333;margin:0 0 16px;">
                Assalam-u-Alaikum <strong>${safeName}</strong>,
              </p>
              <p style="font-size:16px;color:#555;margin:0 0 20px;line-height:1.6;">
                ${requestMoreInfo
                  ? "Aap ki verification application ke liye kuch additional information ki zaroorat hai."
                  : "Afsos, aap ki verification application is waqt approve nahi ho saki."}
              </p>

              <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:0 8px 8px 0;margin:0 0 28px;">
                <strong style="color:#991b1b;">📋 Reason:</strong>
                <p style="color:#991b1b;margin:8px 0 0;font-size:14px;line-height:1.6;">
                  ${safeReason}
                </p>
              </div>

              ${requestMoreInfo
                ? `<p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 20px;">
                    Please apni application update karke dubara submit karein.
                    Aap ka CNIC pehle se locked hai — sirf jo cheezein missing hain unhein update karein.
                  </p>`
                : `<p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 20px;">
                    Aap dubara apply kar sakte hain agar sahih documents ke saath.
                    Kisi bhi confusion ke liye humein contact karein.
                  </p>`}

              <div style="text-align:center;margin:0 0 28px;">
                <a href="${siteUrl}/owner/dashboard" style="display:inline-block;background:#029bba;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;margin-right:12px;">
                  ${requestMoreInfo ? "Update Application →" : "Try Again →"}
                </a>
                <a href="${siteUrl}/contact" style="display:inline-block;background:#6b7280;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
                  Contact Support →
                </a>
              </div>

              <p style="font-size:15px;color:#555;line-height:1.6;margin:0;">
                JazakAllah Khair,<br>
                <strong>Highrise.pk Verification Team</strong><br>
                <span style="color:#999;font-size:13px;">📧 support@highrise.pk | 📱 +92 333 5877106</span>
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

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return void res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  const admin = await requireAdmin(req, res);
  if (!admin) return;

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
    const parsed = RejectSchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({
        success: false,
        message: "Invalid rejection data",
        requestId,
        errors: parsed.error.issues,
      });
    }

    const { reason, requestMoreInfo } = parsed.data;

    await dbConnect();

    const profile = await OwnerProfile.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    })
      .select({ _id: 1, user: 1, status: 1, displayName: 1, email: 1, isDeleted: 1 })
      .lean<OwnerProfileLean>();

    if (!profile) {
      return void res.status(404).json({
        success: false,
        message: "Owner profile not found",
        requestId,
      });
    }

    if (profile.status === "rejected" && !requestMoreInfo) {
      return void res.status(409).json({
        success: false,
        message: "This profile is already rejected",
        requestId,
      });
    }

    if (profile.status === "suspended") {
      return void res.status(409).json({
        success: false,
        message: "Cannot reject a suspended profile",
        requestId,
      });
    }

    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);
    const newStatus = requestMoreInfo ? "info_required" : "rejected";

    // Update OwnerProfile
    const updateData: Record<string, unknown> = {
      status: newStatus,
      verificationLevel: requestMoreInfo ? "documents_pending" : "not_verified",
      lastActivityAt: now,
    };

    if (requestMoreInfo) {
      updateData.infoRequiredReason = reason;
      updateData.rejectionReason = undefined;
    } else {
      updateData.rejectionReason = reason;
      updateData.infoRequiredReason = undefined;
    }

    await OwnerProfile.updateOne(
      { _id: profile._id },
      {
        $set: updateData,
        $push: {
          auditTrail: {
            action: requestMoreInfo ? "info_requested" : "profile_rejected",
            performedBy: adminObjectId,
            performedAt: now,
            changes: {
              status: { from: profile.status, to: newStatus },
              reason,
            },
          },
        },
      }
    );

    // Update User — hard reject revokes owner + KYC gates (info-request: status only)
    await User.updateOne(
      { _id: profile.user },
      {
        $set: {
          ownerVerificationStatus: newStatus,
          // Hard reject only: revoke listing gates (soft info-request leaves gates untouched)
          ...(requestMoreInfo ? {} : { isVerifiedOwner: false, kycVerified: false }),
        },
        // Hard reject only: force JWT refresh so gates flip live
        ...(!requestMoreInfo ? { $inc: { tokenVersion: 1 } } : {}),
      }
    );

    // Audit log
    await logSecurityEvent({
      type: "admin_action",
      severity: "medium",
      userId: admin.id,
      req,
      metadata: {
        action: requestMoreInfo ? "owner_info_requested" : "owner_rejected",
        profileId: id,
        ownerEmail: profile.email,
        statusFrom: profile.status,
        statusTo: newStatus,
        reason,
      },
    });

    // Send rejection email
    void sendEmail({
      to: profile.email,
      subject: requestMoreInfo
        ? "📝 Update Required — Highrise.pk Verification"
        : "Application Update — Highrise.pk Verification",
      html: buildRejectionEmail(profile.displayName, reason, requestMoreInfo),
      fromName: "Highrise.pk Verification",
    });

    return void res.status(200).json({
      success: true,
      message: requestMoreInfo
        ? "Info requested successfully. Owner has been notified."
        : "Owner application rejected. Owner has been notified.",
      requestId,
    });
  } catch (err: unknown) {
    await logSecurityEvent({
      type: "admin_action",
      severity: "high",
      userId: admin.id,
      req,
      metadata: {
        action: "owner_reject_error",
        profileId: id,
        error: err instanceof Error ? err.message : "Unknown",
      },
    }).catch(() => undefined);

    return void res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      requestId,
    });
  }
}