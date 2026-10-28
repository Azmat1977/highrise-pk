// pages/api/admin/developers/[developerId]/info-required.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — Request More Information from Developer
// POST /api/admin/developers/[developerId]/info-required
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import DeveloperProfile from "@/models/DeveloperProfile";
import User from "@/models/User";
import { sendEmail } from "@/lib/email";
import { developerOnboardingInfoRequiredTemplate } from "@/lib/email-templates";
import { z } from "zod";
import { Types } from "mongoose";

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id",              requestId);
  res.setHeader("Content-Type",              "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options",    "nosniff");
  res.setHeader("X-Frame-Options",           "DENY");
  res.setHeader("Cache-Control",             "no-store, no-cache, must-revalidate, private");
  res.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers["x-forwarded-for"];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? "").split(",")[0]?.trim() || req.socket?.remoteAddress || "0.0.0.0";
}

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ID");

const InfoRequiredBodySchema = z.object({
  reason: z.string().trim().min(10, "Please provide a detailed reason (min 10 chars)").max(1000),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return void res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  const ip = getClientIp(req);
  const ua = String(req.headers["user-agent"] ?? "").slice(0, 200);

  // ── Rate limit (First — before DB) ──────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success: false,
      message: "Too many requests.",
      requestId,
    });
  }

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── DB (Third) ───────────────────────────────────────────────
  await dbConnect();

  const idResult = ObjectIdSchema.safeParse(req.query.developerId);
  if (!idResult.success) {
    return void res.status(400).json({
      success: false,
      message: "Invalid developer ID format.",
      requestId,
    });
  }

  const developerId = idResult.data;

  // Validate body — reason is required for info_required
  const bodyResult = InfoRequiredBodySchema.safeParse(req.body ?? {});
  if (!bodyResult.success) {
    return void res.status(400).json({
      success: false,
      message: bodyResult.error.issues[0]?.message ?? "Reason is required.",
      requestId,
    });
  }

  const { reason } = bodyResult.data;

  try {
    const profile = await DeveloperProfile.findById(developerId);

    if (!profile || profile.isDeleted) {
      return void res.status(404).json({
        success: false,
        message: "Developer profile not found.",
        requestId,
      });
    }

    if (profile.status === "suspended") {
      return void res.status(400).json({
        success: false,
        message: "Cannot request info from a suspended developer.",
        requestId,
      });
    }

    const previousStatus = profile.status;

    // Update profile
    profile.status             = "info_required";
    profile.infoRequiredReason = reason;

    const adminObjectId = new Types.ObjectId(auth.id);
    if (!profile.verificationHistory) profile.verificationHistory = [];
    profile.verificationHistory.push({
      status: "submitted",
      by:     adminObjectId,
      at:     new Date(),
      notes:  `Info required by admin ${auth.email}: ${reason.slice(0, 100)}`,
    });

    await profile.addAuditEntry(
      "developer_info_required",
      adminObjectId,
      { previousStatus, reason, requestedBy: auth.email },
      ip
    );

    await profile.save();

    // Find user for email
    const user = await User.findById(profile.user).select("name email");

    // Send info-required email — fire and forget
    if (user) {
      const siteUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXTAUTH_URL ??
        "https://highrise.pk";

      const html = developerOnboardingInfoRequiredTemplate.html({
        developerName: user.name ?? user.email,
        companyName:   profile.companyName,
        reason,
        dashboardUrl:  `${siteUrl}/developer/profile`,
      });

      void sendEmail({
        to:      user.email,
        subject: "Additional Information Needed - Highrise.pk Developer Application",
        html,
        fromName: "Highrise.pk Verification Team",
      });
    }

    await logSecurityEvent({
      type:      "admin_action",
      severity:  "medium",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:          "developer_info_required",
        developerId,
        companyName:     profile.companyName,
        previousStatus,
        requestId,
      },
    });

    return void res.status(200).json({
      success: true,
      message: `Information request sent to ${profile.companyName}.`,
      requestId,
    });

  } catch (err: unknown) {
    await logSecurityEvent({
      type:      "admin_action",
      severity:  "high",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:      "developer_info_required_error",
        developerId,
        error:       err instanceof Error ? err.message : "Unknown",
        requestId,
      },
    });

    return void res.status(500).json({
      success: false,
      message: "Failed to send information request. Please try again.",
      requestId,
    });
  }
}