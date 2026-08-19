// pages/api/admin/owners/[ownerId]/suspend.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — SUSPEND OWNER - Highrise.pk V6.6.0
// 🔒 Admin Only | Requires Reason | Revokes Access
// ═══════════════════════════════════════════════════════════════
// Only approved owners can be suspended
// Suspension revokes:
//   → OwnerProfile.status → "suspended"
//   → User.isVerifiedOwner → false
//   → User.ownerVerificationStatus → "suspended"
//   → User.tokenVersion++ (forces re-login)
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

const SuspendSchema = z.object({
  reason: z.string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(1000, "Reason too long"),
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

function buildSuspensionEmail(name: string, reason: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
  const safeName = escapeHtml(name);
  const safeReason = escapeHtml(reason);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Suspended — Highrise.pk</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8f9fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">
                ⚠️ Account Suspended
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="font-size:16px;color:#333;margin:0 0 16px;">
                Assalam-u-Alaikum <strong>${safeName}</strong>,
              </p>
              <p style="font-size:16px;color:#555;line-height:1.6;">
                Aap ka Verified Owner account temporarily suspend kar diya gaya hai.
              </p>
              <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:15px;margin:20px 0;">
                <strong style="color:#991b1b;">Reason:</strong>
                <p style="color:#991b1b;margin:10px 0 0;">${safeReason}</p>
              </div>
              <p style="font-size:15px;color:#555;line-height:1.6;">
                Suspension ke douran aap:
              </p>
              <ul style="color:#555;line-height:1.8;">
                <li>Nayi properties list nahi kar sakte</li>
                <li>Aap ki existing listings hidden hain</li>
                <li>Verified Owner badge remove ho gaya hai</li>
              </ul>
              <p style="font-size:15px;color:#555;line-height:1.6;margin:20px 0;">
                Agar aap ko lagta hai ye mistake hai, please humein contact karein.
              </p>
              <div style="text-align:center;margin:25px 0;">
                <a href="${siteUrl}/contact" style="display:inline-block;background:#029bba;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;">
                  Contact Support →
                </a>
              </div>
              <p style="font-size:13px;color:#999;margin:20px 0 0;">
                📧 support@highrise.pk | 📱 +92 333 5877106
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
    const parsed = SuspendSchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({
        success: false,
        message: "Reason is required (min 10 characters)",
        requestId,
        errors: parsed.error.issues,
      });
    }

    const { reason } = parsed.data;

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

    if (profile.status !== "approved") {
      return void res.status(409).json({
        success: false,
        message: "Only approved owners can be suspended",
        requestId,
      });
    }

    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);

    // Update OwnerProfile
    await OwnerProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          status: "suspended",
          suspensionReason: reason,
          suspendedAt: now,
          suspendedBy: adminObjectId,
          lastActivityAt: now,
        },
        $push: {
          auditTrail: {
            action: "profile_suspended",
            performedBy: adminObjectId,
            performedAt: now,
            changes: {
              status: { from: "approved", to: "suspended" },
              reason,
            },
          },
        },
      }
    );

    // Update User — revoke verified owner status
    await User.updateOne(
      { _id: profile.user },
      {
        $set: {
          isVerifiedOwner: false,
          ownerVerificationStatus: "suspended",
        },
        $inc: {
          tokenVersion: 1, // Force logout
        },
      }
    );

    // Audit log
    await logSecurityEvent({
      type: "admin_action",
      severity: "high",
      userId: admin.id,
      req,
      metadata: {
        action: "owner_suspended",
        profileId: id,
        ownerEmail: profile.email,
        reason,
        suspendedAt: now.toISOString(),
      },
    });

    // Send suspension email
    void sendEmail({
      to: profile.email,
      subject: "⚠️ Account Suspended — Highrise.pk",
      html: buildSuspensionEmail(profile.displayName, reason),
      fromName: "Highrise.pk Verification",
    });

    return void res.status(200).json({
      success: true,
      message: "Owner suspended successfully",
      requestId,
    });
  } catch (err: unknown) {
    await logSecurityEvent({
      type: "admin_action",
      severity: "high",
      userId: admin.id,
      req,
      metadata: {
        action: "owner_suspend_error",
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