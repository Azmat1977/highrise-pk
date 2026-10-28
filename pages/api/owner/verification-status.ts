// pages/api/owner/verification-status.ts
// ═══════════════════════════════════════════════════════════════
// OWNER — GET VERIFICATION STATUS - Highrise.pk V6.6.0
// 🔒 User Auth | Read-only | Returns status + limits
// ═══════════════════════════════════════════════════════════════
// Used by:
//   → Owner dashboard status banner
//   → "Can I list?" pre-flight checks
//   → Rejection reason display
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApi, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";

import OwnerProfile from "@/models/OwnerProfile";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
  data?: {
    hasProfile: boolean;
    status: string | null;
    verificationLevel: string | null;
    submittedAt: string | null;
    verifiedAt: string | null;
    rejectionReason: string | null;
    infoRequiredReason: string | null;
    canListProperties: boolean;
    maxListings: number;
    activeListingsCount: number;
    remainingListings: number;
  };
}

interface OwnerProfileLean {
  _id: unknown;
  status: string;
  verificationLevel: string;
  submittedForReviewAt?: Date;
  verifiedAt?: Date;
  rejectionReason?: string;
  infoRequiredReason?: string;
  maxListings: number;
  activeListingsCount: number;
  isDeleted: boolean;
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
  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    return sendRateLimitResponse(res, rl);
  }

  // ── Auth guard ───────────────────────────────────────────────
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    await dbConnect();

    const profile = await OwnerProfile.findOne({
      user: user.id,
      isDeleted: false,
    })
      .select({
        _id: 1,
        status: 1,
        verificationLevel: 1,
        submittedForReviewAt: 1,
        verifiedAt: 1,
        rejectionReason: 1,
        infoRequiredReason: 1,
        maxListings: 1,
        activeListingsCount: 1,
        isDeleted: 1,
      })
      .lean<OwnerProfileLean>();

    if (!profile) {
      // User has no owner profile yet
      return void res.status(200).json({
        success: true,
        message: "No owner profile found",
        requestId,
        data: {
          hasProfile: false,
          status: null,
          verificationLevel: null,
          submittedAt: null,
          verifiedAt: null,
          rejectionReason: null,
          infoRequiredReason: null,
          canListProperties: false,
          maxListings: 0,
          activeListingsCount: 0,
          remainingListings: 0,
        },
      });
    }

    const canListProperties =
      profile.status === "approved" &&
      profile.activeListingsCount < profile.maxListings;

    const remainingListings = Math.max(
      0,
      profile.maxListings - profile.activeListingsCount
    );

    return void res.status(200).json({
      success: true,
      message: "Verification status retrieved",
      requestId,
      data: {
        hasProfile: true,
        status: profile.status,
        verificationLevel: profile.verificationLevel,
        submittedAt: profile.submittedForReviewAt?.toISOString() ?? null,
        verifiedAt: profile.verifiedAt?.toISOString() ?? null,
        rejectionReason: profile.rejectionReason ?? null,
        infoRequiredReason: profile.infoRequiredReason ?? null,
        canListProperties,
        maxListings: profile.maxListings,
        activeListingsCount: profile.activeListingsCount,
        remainingListings,
      },
    });
  } catch {

    return void res.status(500).json({
      success: false,
      message: "Unable to fetch verification status",
      requestId,
    });
  }
}