// ========== FILE: pages/api/admin/users/[id]/reset-profile-changes.ts ==========
// 🔒 ADMIN-ONLY: Reset user's profile change counter
// V6.7.0 — Allows locked users to make changes again
// =====================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { sendEmail } from "@/lib/email";
import { authOptions } from "../../../auth/[...nextauth]";

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id",           requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options",        "DENY");
  res.setHeader("Cache-Control",          "no-store");
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildResetNotificationEmail(userName: string, reason: string): string {
  const safe = escapeHtml(userName);
  const safeReason = escapeHtml(reason);
  return `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f8f9fa;padding:20px;">
  <div style="max-width:600px;margin:auto;background:white;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#029bba,#004063);padding:30px;text-align:center;color:white;">
      <h1 style="margin:0;">🔓 Profile Unlocked</h1>
    </div>
    <div style="padding:30px;">
      <p>Assalam-u-Alaikum <strong>${safe}</strong>,</p>
      <p>Good news — an admin has reset your profile change limit. You can now update your profile again.</p>
      <div style="background:#f0f9ff;border-left:4px solid #029bba;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
        <strong style="color:#004063;">Admin Note:</strong>
        <p style="color:#004063;margin:8px 0 0;">${safeReason}</p>
      </div>
      <p><strong>Remember:</strong> You have 2 changes available. Use them carefully.</p>
      <p>JazakAllah Khair,<br><strong>Highrise.pk Team</strong></p>
    </div>
  </div>
</body></html>`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false, message: "Method not allowed", requestId,
    });
  }

  // ── Admin auth ──
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return res.status(403).json({
      success: false, message: "Admin access required", requestId,
    });
  }

  const { userId } = req.query;
  if (typeof userId !== "string" || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false, message: "Invalid user ID", requestId,
    });
  }

  const { reason } = req.body ?? {};
  const cleanReason = String(reason ?? "Admin reset").trim().slice(0, 500);

  try {
    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false, message: "User not found", requestId,
      });
    }

    const previousCount = user.profileChangeCount ?? 0;

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          profileChangeCount:       0,
          profileChangeLocked:      false,
          profileChangeLockedAt:    null,
          profileChangeLockReason:  null,
        },
        $push: {
          profileChangeResetHistory: {
            resetAt:       new Date(),
            resetBy:       session.user.id,
            reason:        cleanReason,
            previousCount,
          },
        },
      }
    );

    // Notify user
    void sendEmail({
      to: user.email,
      subject: "🔓 Profile Unlocked — Highrise.pk",
      html: buildResetNotificationEmail(user.name, cleanReason),
      fromName: "Highrise.pk Admin",
    });

    return res.status(200).json({
      success: true,
      message: `Profile change counter reset for ${user.name}`,
      requestId,
    });
  } catch {
    return res.status(500).json({
      success: false, message: "Failed to reset", requestId,
    });
  }
}

// ========== END OF FILE ==========