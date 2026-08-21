// pages/api/owner/profile.ts
// ═══════════════════════════════════════════════════════════════
// OWNER — GET/UPDATE OWN PROFILE - Highrise.pk V6.6.0
// 🔒 User Auth | Masked CNIC | Owner Self-Service
// ═══════════════════════════════════════════════════════════════
// GET:  Returns owner's own profile (masked CNIC, no encrypted)
// PATCH: Updates safe fields (displayName, about, address, photo)
//        → CNIC/phone/email/city CANNOT be changed here
//        → For CNIC changes, admin action required
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import crypto from "crypto";

import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApi, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";

import OwnerProfile from "@/models/OwnerProfile";
import { toPrivateKycAssetView } from "@/lib/privateAsset";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
  data?: unknown;
  errors?: unknown;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

const CloudinaryImageSchema = z.object({
  url: z.string()
    .url()
    .refine(
      (url) => url.includes("cloudinary.com") || url.includes("res.cloudinary.com"),
      "Image must be uploaded to Cloudinary"
    )
    .max(500),
  publicId: z.string()
    .min(3)
    .max(200)
    .regex(/^[a-zA-Z0-9_\-/.]+$/),
});

const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(3).max(100).optional(),
  about: z.string().trim().max(500).optional(),
  address: z.string().trim().max(500).optional(),
  profilePhoto: CloudinaryImageSchema.optional(),
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
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
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

    // ═══════════════════════════════════════════════════════════
    // GET — Return own profile (masked)
    // ═══════════════════════════════════════════════════════════
    if (req.method === "GET") {
      const profile = await OwnerProfile.findOne({
        user: user.id,
        isDeleted: false,
      }); // Not lean — we need instance methods

      if (!profile) {
        return void res.status(404).json({
          success: false,
          message: "Owner profile not found. Please submit verification first.",
          requestId,
        });
      }

      // Build safe response (no encrypted fields, CNIC masked)
      const safeProfile = {
        id: String(profile._id),
        slug: profile.slug,
        displayName: profile.displayName,
        about: profile.about,
        maskedCnic: profile.getMaskedCNIC(),
        maskedPhone: profile.getMaskedPhone(),
        email: profile.email,
        city: profile.city,
        address: profile.address,
        documents: {
          cnicFront: profile.documents?.cnicFront
            ? (() => {
                const asset = toPrivateKycAssetView(profile.documents.cnicFront);
                return asset
                  ? { ...asset, verified: !!profile.documents.cnicFront?.verifiedAt }
                  : null;
              })()
            : null,
          cnicBack: profile.documents?.cnicBack
            ? (toPrivateKycAssetView(profile.documents.cnicBack) ?? null)
            : null,
          selfieWithCnic: profile.documents?.selfieWithCnic
            ? (toPrivateKycAssetView(profile.documents.selfieWithCnic) ?? null)
            : null,
          profilePhoto: profile.documents?.profilePhoto?.url
            ? {
                url: profile.documents.profilePhoto.url,
                uploadedAt: profile.documents.profilePhoto.uploadedAt,
              }
            : null,
        },
        status: profile.status,
        verificationLevel: profile.verificationLevel,
        verifiedAt: profile.verifiedAt,
        cnicLocked: !!profile.cnicLockedAt,
        rejectionReason: profile.rejectionReason,
        infoRequiredReason: profile.infoRequiredReason,
        maxListings: profile.maxListings,
        activeListingsCount: profile.activeListingsCount,
        totalListingsCount: profile.totalListingsCount,
        remainingListings: Math.max(
          0,
          profile.maxListings - profile.activeListingsCount
        ),
        canAddListing: profile.canAddListing(),
        ratings: profile.ratings,
        memberSince: profile.memberSince,
        submittedForReviewAt: profile.submittedForReviewAt,
        profileUrl: `/owner/${profile.slug}`,
      };

      return void res.status(200).json({
        success: true,
        message: "Profile retrieved",
        requestId,
        data: safeProfile,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // PATCH — Update safe fields only
    // ═══════════════════════════════════════════════════════════
    if (req.method === "PATCH") {
      const parsed = UpdateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return void res.status(400).json({
          success: false,
          message: "Invalid update data",
          requestId,
          errors: parsed.error.issues,
        });
      }

      const profile = await OwnerProfile.findOne({
        user: user.id,
        isDeleted: false,
      });

      if (!profile) {
        return void res.status(404).json({
          success: false,
          message: "Owner profile not found",
          requestId,
        });
      }

      const { displayName, about, address, profilePhoto } = parsed.data;
      const now = new Date();
      const changes: Record<string, unknown> = {};
      const updateData: Record<string, unknown> = {};

      if (displayName && displayName !== profile.displayName) {
        updateData.displayName = displayName;
        changes.displayName = { from: profile.displayName, to: displayName };
      }
      if (about !== undefined && about !== profile.about) {
        updateData.about = about;
        changes.about = { updated: true };
      }
      if (address !== undefined && address !== profile.address) {
        updateData.address = address;
        changes.address = { updated: true };
      }
      if (profilePhoto) {
        updateData["documents.profilePhoto"] = {
          url: profilePhoto.url,
          publicId: profilePhoto.publicId,
          uploadedAt: now,
        };
        changes.profilePhoto = { updated: true };
      }

      if (Object.keys(updateData).length === 0) {
        return void res.status(400).json({
          success: false,
          message: "No changes to apply",
          requestId,
        });
      }

      updateData.lastActivityAt = now;

      await OwnerProfile.updateOne(
        { _id: profile._id },
        {
          $set: updateData,
          $push: {
            auditTrail: {
              action: "profile_updated_by_owner",
              performedBy: user.id,
              performedAt: now,
              changes,
            },
          },
        }
      );

      return void res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        requestId,
        data: { updated: Object.keys(changes) },
      });
    }
  } catch {

    return void res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      requestId,
    });
  }
}