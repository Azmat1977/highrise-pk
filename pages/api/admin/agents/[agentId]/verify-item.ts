// pages/api/admin/agents/[agentId]/verify-item.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — VERIFY INDIVIDUAL ITEM - Highrise.pk
// 🔒 ENTERPRISE-GRADE | Granular Verification System
// V6.8.7 — Toggle verification for CNIC/License/NTN/SECP/Office
// ═══════════════════════════════════════════════════════════════
// Body: {
//   item: 'cnic' | 'license' | 'ntn' | 'secp' | 'office',
//   verified: boolean,
//   notes?: string (optional admin notes)
// }
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";
import { z } from "zod";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

import AgentProfile from "@/models/AgentProfile";

// ═══════════════════════════════════════════════════════════════
// TYPES & VALIDATION
// ═══════════════════════════════════════════════════════════════

const VerifyItemSchema = z.object({
  item:     z.enum(["cnic", "license", "ntn", "secp", "office"]),
  verified: z.boolean(),
  notes:    z.string().trim().max(500).optional(),
});

interface ApiResponse {
  success:   boolean;
  message:   string;
  requestId: string;
  data?: {
    item:       string;
    verified:   boolean;
    trustScore: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
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
      success:   false,
      message:   "Method not allowed",
      requestId,
    });
  }

  // ── Rate limiting ────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success:   false,
      message:   "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  // ── Admin auth ───────────────────────────────────────────────
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── Validate [agentId] param ─────────────────────────────────
  const { agentId } = req.query;
  const id = typeof agentId === "string" ? agentId : "";
  if (!id || !Types.ObjectId.isValid(id)) {
    return void res.status(400).json({
      success:   false,
      message:   "Invalid agent profile ID.",
      requestId,
    });
  }

  // ── Validate body ────────────────────────────────────────────
  const parsed = VerifyItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return void res.status(400).json({
      success:   false,
      message:   `Invalid request: ${parsed.error.issues[0]?.message ?? "check payload"}`,
      requestId,
    });
  }

  const { item, verified, notes } = parsed.data;

  try {
    await dbConnect();

    // ── Fetch profile ────────────────────────────────────────────
    const profile = await AgentProfile.findOne({
      _id:       new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!profile) {
      return void res.status(404).json({
        success:   false,
        message:   "Agent profile not found.",
        requestId,
      });
    }

    // Must be approved before individual items can be verified
    if (profile.status !== "approved") {
      return void res.status(409).json({
        success:   false,
        message:   "Agent must be approved before verifying individual items.",
        requestId,
      });
    }

    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);

    // Store old value for audit
    let oldValue: boolean | undefined;
    let itemLabel: string;

    // ── Apply verification based on item type ────────────────────
    switch (item) {
      case "cnic":
        oldValue = profile.cnicVerified;
        profile.cnicVerified = verified;
        profile.cnicVerifiedAt = verified ? now : undefined;
        itemLabel = "CNIC";

        // Also update documents.cnicFront verification if exists
        if (profile.documents?.cnicFront && verified) {
          profile.documents.cnicFront.verifiedAt = now;
          profile.documents.cnicFront.verifiedBy = adminObjectId;
        }
        break;

      case "license":
        oldValue = profile.licenseVerified;
        profile.licenseVerified = verified;
        profile.licenseVerifiedAt = verified ? now : undefined;
        itemLabel = "License";

        // Also update documents.license verification if exists
        if (profile.documents?.license && verified) {
          profile.documents.license.verifiedAt = now;
          profile.documents.license.verifiedBy = adminObjectId;
        }
        break;

      case "ntn":
        oldValue = profile.ntnVerified;
        profile.ntnVerified = verified;
        itemLabel = "NTN";

        if (profile.documents?.ntnCertificate && verified) {
          profile.documents.ntnCertificate.verifiedAt = now;
        }
        break;

      case "secp":
        oldValue = profile.secpVerified;
        profile.secpVerified = verified;
        itemLabel = "SECP";

        if (profile.documents?.secpCertificate && verified) {
          profile.documents.secpCertificate.verifiedAt = now;
        }
        break;

      case "office":
        oldValue = Boolean(profile.officeVerification?.verifiedAt);

        if (!profile.officeVerification) {
          return void res.status(400).json({
            success:   false,
            message:   "Agent has not provided an office address yet.",
            requestId,
          });
        }

        if (verified) {
          profile.officeVerification.verifiedAt         = now;
          profile.officeVerification.verifiedBy         = adminObjectId;
          if (notes) profile.officeVerification.verificationNotes = notes;
        } else {
          profile.officeVerification.verifiedAt         = undefined;
          profile.officeVerification.verifiedBy         = undefined;
        }
        itemLabel = "Office";
        break;

      default:
        return void res.status(400).json({
          success:   false,
          message:   "Invalid item type.",
          requestId,
        });
    }

    // ── Add audit trail entry ────────────────────────────────────
    await profile.addAuditEntry(
      `${item}_${verified ? "verified" : "unverified"}`,
      adminObjectId,
      {
        item,
        verified,
        previousValue: oldValue,
        notes:         notes ?? null,
      }
    );

    // ── Recalculate trust score after change ─────────────────────
    await profile.calculateTrustScore();

    // ── Save all changes ─────────────────────────────────────────
    await profile.save();

    // ── Audit log ────────────────────────────────────────────────
    await logSecurityEvent({
      type:     "admin_action",
      severity: "medium",
      userId:   admin.id,
      req,
      metadata: {
        action:      "agent_item_verified",
        profileId:   id,
        item,
        verified,
        oldValue,
        newTrustScore: profile.trustScore.overall,
        notes,
        performedBy:   admin.id,
        performedAt:   now.toISOString(),
      },
    });

    // ── Success response ─────────────────────────────────────────
    return void res.status(200).json({
      success: true,
      message: `${itemLabel} ${verified ? "verified" : "unverified"} successfully. Trust score updated.`,
      requestId,
      data: {
        item,
        verified,
        trustScore: profile.trustScore.overall,
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
        reason:    "Unhandled error during item verification",
        action:    "agent_item_verify_error",
        error:     message,
        profileId: id,
        item,
      },
    }).catch(() => undefined);

    return void res.status(500).json({
      success:   false,
      message:   "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
}