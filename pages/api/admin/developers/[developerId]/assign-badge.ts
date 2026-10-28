// pages/api/admin/developers/[developerId]/assign-badge.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — Assign Manual Badges to Developer
// POST /api/admin/developers/[developerId]/assign-badge
// ═══════════════════════════════════════════════════════════════
// ✅ Only admin-assignable badges accepted
// ✅ Tier badge preserved from updateBadges() auto-calculation
// ✅ Merges admin badges with auto-calculated tier badge
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import DeveloperProfile, {
  type DeveloperBadge,
} from "@/models/DeveloperProfile";
import { z } from "zod";

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

// Only admin can manually assign these badges
// Tier badges (startup → diamond) are auto-calculated based on verified projects
const ADMIN_ASSIGNABLE_BADGES: DeveloperBadge[] = [
  "highrise_verified",
  "top_developer",
  "trusted_builder",
  "on_time_delivery",
  "premium_partner",
];

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ID");

const AssignBadgeBodySchema = z.object({
  // Which admin-assignable badges to enable (others auto-removed)
  badges: z.array(
    z.enum([
      "highrise_verified",
      "top_developer",
      "trusted_builder",
      "on_time_delivery",
      "premium_partner",
    ])
  ).max(5),
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

  const bodyResult = AssignBadgeBodySchema.safeParse(req.body ?? {});
  if (!bodyResult.success) {
    return void res.status(400).json({
      success: false,
      message: bodyResult.error.issues[0]?.message ?? "Invalid badge list.",
      requestId,
    });
  }

  const { badges: requestedAdminBadges } = bodyResult.data;

  try {
    const profile = await DeveloperProfile.findById(developerId);

    if (!profile || profile.isDeleted) {
      return void res.status(404).json({
        success: false,
        message: "Developer profile not found.",
        requestId,
      });
    }

    const previousBadges = [...profile.badges];

    // Get current tier badge (auto-calculated, must be preserved)
    const TIER_BADGES: DeveloperBadge[] = [
      "startup", "emerging", "established",
      "silver", "gold", "platinum", "diamond",
    ];

    const currentTierBadge = profile.badges.find((b) =>
      TIER_BADGES.includes(b)
    );

    // Build new badge array:
    // 1. Keep current tier badge (auto-calculated)
    // 2. Replace admin badges with the new selection
    const newBadges: DeveloperBadge[] = [];

    if (currentTierBadge) {
      newBadges.push(currentTierBadge);
    }

    for (const badge of requestedAdminBadges) {
      if (!newBadges.includes(badge)) {
        newBadges.push(badge);
      }
    }

    // Track newly added badges in history
    const addedBadges = requestedAdminBadges.filter(
      (b) => !previousBadges.includes(b)
    );
    const removedBadges = ADMIN_ASSIGNABLE_BADGES.filter(
      (b) =>
        (previousBadges as string[]).includes(b) &&
        !(requestedAdminBadges as string[]).includes(b)
    );

    if (addedBadges.length > 0) {
      if (!profile.badgeHistory) profile.badgeHistory = [];
      for (const badge of addedBadges) {
        profile.badgeHistory.push({
          badge,
          earnedAt: new Date(),
          criteria: `Manually assigned by admin ${auth.email}`,
        });
      }
    }

    profile.badges = newBadges;

    // Recalculate trust score (badges affect score visibility)
    await profile.calculateTrustScore();

    await profile.addAuditEntry(
      "badges_assigned",
      new mongoose.Types.ObjectId(auth.id),
      {
        previousBadges,
        newBadges,
        addedBadges,
        removedBadges,
        assignedBy: auth.email,
      },
      ip
    );

    await profile.save();

    await logSecurityEvent({
      type:      "admin_action",
      severity:  "medium",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:         "badges_assigned",
        developerId,
        companyName:    profile.companyName,
        addedBadges,
        removedBadges,
        finalBadges:    newBadges,
        requestId,
      },
    });

    return void res.status(200).json({
      success:      true,
      message:      `Badges updated for ${profile.companyName}.`,
      badges:       newBadges,
      addedBadges,
      removedBadges,
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
        action:  "assign_badge_error",
        developerId,
        error:   err instanceof Error ? err.message : "Unknown",
        requestId,
      },
    });

    return void res.status(500).json({
      success: false,
      message: "Failed to assign badges. Please try again.",
      requestId,
    });
  }
}