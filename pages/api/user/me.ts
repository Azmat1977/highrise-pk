// ========== FILE: pages/api/user/me.ts ==========
// 🔒 GET CURRENT USER — Enterprise-safe endpoint
// Returns full user profile from database (not JWT)
// =====================================================

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface UserResponse {
  id:                       string;
  name:                     string;
  displayName:              string;
  email:                    string;
  role:                     string;
  phone:                    string;
  city:                     string;
  country:                  string;
  profession:               string;
  companyName:              string;
  licenseNumber:            string;
  ntnNumber:                string;
  officeAddress:            string;
  homeAddress:              string;
  profilePictureUrl:        string;
  isVerified:               boolean;
  kycVerified:              boolean;
  onboardingStatus:         string;
  ownerVerificationStatus:  string;
  isVerifiedOwner:          boolean;

  // Profile change tracking (V6.7.0)
  profileChangeCount:       number;
  profileChangeLimit:       number;
  profileChangesRemaining:  number;
  profileChangeLocked:      boolean;
}

// ═══════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id",           requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options",        "DENY");
  res.setHeader("Cache-Control",          "no-store, max-age=0");
  res.setHeader("Referrer-Policy",        "same-origin");
}

// ═══════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  // ── Auth ──────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    await dbConnect();

    const user = await User.findOne({
      _id: auth.id,
      isDeleted: { $ne: true },
    })
      .select(
        "_id name email displayName role phone city country profession " +
        "companyName licenseNumber ntnNumber officeAddress homeAddress " +
        "profilePictureUrl isVerified kycVerified onboardingStatus " +
        "ownerVerificationStatus isVerifiedOwner " +
        "profileChangeCount profileChangeLimit profileChangeLocked"
      )
      .lean<Record<string, unknown>>();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        requestId,
      });
    }

    // Compute change tracking
    const changeCount = Number(user.profileChangeCount ?? 0);
    const changeLimit = Number(user.profileChangeLimit  ?? 2);
    const remaining   = Math.max(0, changeLimit - changeCount);

    const userData: UserResponse = {
      id:                      String(user._id),
      name:                    String(user.name ?? ""),
      displayName:             String(user.displayName ?? ""),
      email:                   String(user.email ?? ""),
      role:                    String(user.role ?? "user"),
      phone:                   String(user.phone ?? ""),
      city:                    String(user.city ?? ""),
      country:                 String(user.country ?? "Pakistan"),
      profession:              String(user.profession ?? ""),
      companyName:             String(user.companyName ?? ""),
      licenseNumber:           String(user.licenseNumber ?? ""),
      ntnNumber:               String(user.ntnNumber ?? ""),
      officeAddress:           String(user.officeAddress ?? ""),
      homeAddress:             String(user.homeAddress ?? ""),
      profilePictureUrl:       String(user.profilePictureUrl ?? ""),
      isVerified:              Boolean(user.isVerified),
      kycVerified:             Boolean(user.kycVerified),
      onboardingStatus:        String(user.onboardingStatus ?? "none"),
      ownerVerificationStatus: String(user.ownerVerificationStatus ?? "none"),
      isVerifiedOwner:         Boolean(user.isVerifiedOwner),

      // Profile change tracking (V6.7.0)
      profileChangeCount:      changeCount,
      profileChangeLimit:      changeLimit,
      profileChangesRemaining: remaining,
      profileChangeLocked:     Boolean(user.profileChangeLocked),
    };

    return res.status(200).json({
      success: true,
      requestId,
      user: userData,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load user profile",
      requestId,
    });
  }
}

// ========== END OF FILE ==========