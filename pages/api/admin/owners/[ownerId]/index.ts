// pages/api/admin/owners/[ownerId]/index.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — GET OWNER DETAIL - Highrise.pk V6.6.0
// 🔒 Admin Only | Decrypts CNIC (audit-logged) | Full Profile
// ═══════════════════════════════════════════════════════════════
// Returns FULL profile including:
//   → Decrypted CNIC number (AUDIT LOGGED)
//   → Decrypted phone number
//   → All documents with URLs
//   → Full audit trail
//   → Linked User details
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";
import crypto from "crypto";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

import OwnerProfile from "@/models/OwnerProfile";
import User from "@/models/User";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
  data?: unknown;
}

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store, max-age=0");
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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
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

    // Load profile WITH encrypted fields (need to decrypt)
    const profile = await OwnerProfile.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    })
      .select("+cnicEncrypted +phoneEncrypted")
      .populate("user", "name email profilePictureUrl createdAt lastLoginAt status");

    if (!profile) {
      return void res.status(404).json({
        success: false,
        message: "Owner profile not found",
        requestId,
      });
    }

    // ── Log CNIC decryption (audit trail) ────────────────────────
    await logSecurityEvent({
      type: "admin_action",
      severity: "medium",
      userId: admin.id,
      req,
      metadata: {
        action: "owner_cnic_decrypted",
        profileId: id,
        reason: "Admin viewed owner verification detail",
      },
    });

    // ── Decrypt sensitive data ───────────────────────────────────
    const decryptedCnic = profile.getCNIC();
    const decryptedPhone = profile.getPhone();

    return void res.status(200).json({
      success: true,
      message: "Owner profile retrieved",
      requestId,
      data: {
        id: String(profile._id),
        slug: profile.slug,
        displayName: profile.displayName,
        about: profile.about,

        // Decrypted (admin only)
        cnic: decryptedCnic,
        maskedCnic: profile.getMaskedCNIC(),
        phone: decryptedPhone,
        maskedPhone: profile.getMaskedPhone(),
        email: profile.email,

        city: profile.city,
        address: profile.address,

        // Documents (full URLs for admin verification)
        documents: profile.documents,

        // Status
        status: profile.status,
        verificationLevel: profile.verificationLevel,
        cnicVerified: profile.cnicVerified,
        cnicVerifiedAt: profile.cnicVerifiedAt,
        cnicLockedAt: profile.cnicLockedAt,
        verifiedAt: profile.verifiedAt,
        verifiedBy: profile.verifiedBy,
        submittedForReviewAt: profile.submittedForReviewAt,

        // Rejection
        rejectionReason: profile.rejectionReason,
        rejectedAt: (profile as unknown as { rejectedAt?: Date }).rejectedAt ?? null,
        rejectedBy: (profile as unknown as { rejectedBy?: unknown }).rejectedBy ?? null,

        // Info Required
        infoRequiredReason: profile.infoRequiredReason,
        infoRequiredAt: (profile as unknown as { infoRequiredAt?: Date }).infoRequiredAt ?? null,

        // Suspension
        suspensionReason: profile.suspensionReason,
        suspendedAt: profile.suspendedAt,
        suspendedBy: profile.suspendedBy,

        // Ratings
        ratings: profile.ratings,

        // Audit trail (last 50)
        auditTrail: profile.auditTrail?.slice(-50) ?? [],

        // Metadata
        memberSince: profile.memberSince,
        lastActivityAt: profile.lastActivityAt,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,

        // Linked user (populated)
        user: profile.user,
      },
    });
  } catch (err: unknown) {
    await logSecurityEvent({
      type: "admin_action",
      severity: "high",
      userId: admin.id,
      req,
      metadata: {
        action: "owner_detail_fetch_error",
        profileId: id,
        error: err instanceof Error ? err.message : "Unknown",
      },
    }).catch(() => undefined);

    return void res.status(500).json({
      success: false,
      message: "Unable to fetch owner profile",
      requestId,
    });
  }
}