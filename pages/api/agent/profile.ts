// pages/api/agent/profile.ts
// ═══════════════════════════════════════════════════════════════
// AGENT PROFILE API (PRIVATE) — Highrise.pk
// 🔒 ENTERPRISE-GRADE | Session Only | No Public Access
// ═══════════════════════════════════════════════════════════════
//
// GET    → Read own AgentProfile (private)
// PATCH  → Update own profile (whitelisted fields only)
// DELETE → Soft delete own profile
//
// POST removed — profile creation is via /api/onboarding/business
// Phone is immutable — KYC-linked, change requires admin
// Status/verification fields are admin-only
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApi, rateLimitApiWrite } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

import AgentProfile from "@/models/AgentProfile";
import User from "@/models/User";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  message?: string;
  requestId: string;
  profile?: Record<string, unknown> | null;
}

// Lean shape for the profile ownership check
interface ProfileOwnershipLean {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  status: string;
  isDeleted: boolean;
}

// Valid enums — must match AgentProfile schema exactly
const VALID_AGENT_TYPES   = ["individual", "agency", "freelance"] as const;
const VALID_AGENCY_SIZES  = ["solo", "small", "medium", "large"] as const;
const VALID_SPECIALIZATIONS = [
  "residential", "commercial", "plots", "rental", "all",
] as const;

type AgentTypeValue        = typeof VALID_AGENT_TYPES[number];
type AgentSizeValue        = typeof VALID_AGENCY_SIZES[number];
type SpecializationValue   = typeof VALID_SPECIALIZATIONS[number];

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

// ═══════════════════════════════════════════════════════════════
// SANITIZATION HELPERS
// ═══════════════════════════════════════════════════════════════

function safeText(v: unknown, max = 120): string {
  return String(v ?? "").trim().slice(0, max);
}

function safeUrl(v: unknown): string {
  const s = String(v ?? "").trim().slice(0, 500);
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return "";   // Reject non-http URLs
  return s;
}

function safeStringArray(v: unknown, maxItems = 20, maxLen = 80): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x ?? "").trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function safeBoolean(v: unknown): boolean | undefined {
  if (v === true || v === "true")  return true;
  if (v === false || v === "false") return false;
  return undefined;
}

function safeInt(v: unknown, min: number, max: number): number | undefined {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function isValidEnum<T extends string>(
  v: unknown,
  values: readonly T[]
): v is T {
  return typeof v === "string" && (values as readonly string[]).includes(v);
}

// ═══════════════════════════════════════════════════════════════
// SELECT FIELDS — returned to agent (no encrypted fields)
// ═══════════════════════════════════════════════════════════════

const AGENT_SELECT_FIELDS = [
  "_id",
  "slug",
  "displayName",
  "tagline",
  "about",
  "agentType",
  "agencyName",
  "agencySize",
  "email",
  "city",
  "operatingCities",
  "specializations",
  "languages",
  "experience",
  "serviceAreas",
  "socialLinks",
  "businessHours",
  "isAvailable",
  "availabilityNote",
  "status",
  "verificationLevel",
  "badges",
  "isPremium",
  "isFeatured",
  "trustScore",
  "ratings",
  "stats",
  // V6.8.11: Documents (profile, cover, license, cnic for admin, logo)
  "documents.profilePhoto",
  "documents.coverPhoto",
  // V6.8.11: Agency logo (top-level field for agency accounts)
  "agencyLogo",
  // V6.8.11: Office verification (address, city, coordinates)
  // Critical for edit page to show existing office location on map
  "officeVerification",
  "memberSince",
  "createdAt",
  "updatedAt",
].join(" ");

// ═══════════════════════════════════════════════════════════════
// CNIC GATE
// ═══════════════════════════════════════════════════════════════

interface UserLean {
  _id: Types.ObjectId;
  role: string;
  status: string;
  isDeleted: boolean;
  isVerified?: boolean;         // ✅ Correct field (was: isEmailVerified)
  cnicLockedAt?: Date | null;   // ✅ Correct field (was: cnicLocked boolean)
  cnicHash?: string | null;
  cnicEnc?: string | null;
  cnicVerified?: boolean;
}

function hasCnicVerified(user: UserLean): boolean {
  // V6.8.11 FIX: Field name is cnicLockedAt (Date), not cnicLocked (boolean)
  // Also check for cnicVerified as alternate approval signal
  return (
    Boolean(user.cnicLockedAt) &&
    Boolean(user.cnicHash) &&
    Boolean(user.cnicEnc)
  );
}

function requireCnicForAgent(): boolean {
  // Default: true — opt out only via env flag
  return process.env.REQUIRE_CNIC_FOR_AGENT_ONBOARDING !== "0";
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // ── Correlation ID ───────────────────────────────────────────
  const requestId =
    typeof req.headers["x-correlation-id"] === "string"
      ? req.headers["x-correlation-id"]
      : crypto.randomUUID();

  setSecurityHeaders(res, requestId);

  // ── Method guard ─────────────────────────────────────────────
  const ALLOWED_METHODS = ["GET", "PATCH", "DELETE"];
  if (!ALLOWED_METHODS.includes(req.method ?? "")) {
    res.setHeader("Allow", ALLOWED_METHODS.join(", "));
    return void res.status(405).json({
      success: false,
      message: `Method ${req.method ?? "unknown"} not allowed. POST removed — use /api/onboarding/business to create a profile.`,
      requestId,
    });
  }

  // ── Rate limiting ────────────────────────────────────────────
  const isWrite = req.method === "PATCH" || req.method === "DELETE";
  const rl = isWrite
    ? await rateLimitApiWrite(req)
    : await rateLimitApi(req);

  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success: false,
      message: "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  // ── Authentication ───────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return; // requireAuth already sent 401

  try {
    await dbConnect();

    // ── Fetch user for CNIC gate + status check ──────────────────
    // V6.8.11 FIX: Use correct field names + force include select:false fields
    // cnicHash and cnicEnc have select:false in schema — need + prefix
    const dbUser = await User.findById(auth.id)
      .select("_id role status isDeleted isVerified cnicLockedAt cnicVerified +cnicHash +cnicEnc")
      .lean<UserLean>();

    if (!dbUser || dbUser.isDeleted) {
      return void res.status(401).json({
        success: false,
        message: "Unauthorized",
        requestId,
      });
    }

    if (dbUser.status !== "active") {
      return void res.status(403).json({
        success: false,
        message: "Account is not active.",
        requestId,
      });
    }

    const isAdmin = dbUser.role === "admin";

    // ════════════════════════════════════════════════════════════
    // GET — Read own AgentProfile
    // ════════════════════════════════════════════════════════════
    if (req.method === "GET") {
      const profile = await AgentProfile.findOne({
        user: new Types.ObjectId(auth.id),
        isDeleted: false,
      })
        .select(AGENT_SELECT_FIELDS)
        .lean();

      return void res.status(200).json({
        success: true,
        profile: (profile as Record<string, unknown>) ?? null,
        requestId,
      });
    }

    // ════════════════════════════════════════════════════════════
    // PATCH — Update own profile (whitelisted fields only)
    // ════════════════════════════════════════════════════════════
    if (req.method === "PATCH") {
      // CNIC gate for writes
      if (requireCnicForAgent() && !isAdmin) {
        if (!hasCnicVerified(dbUser)) {
          await logSecurityEvent({
            type:     "permission_denied",
            severity: "medium",
            userId:   auth.id,
            req,
            metadata: {
              reason:   "Agent profile update attempted without CNIC verification",
              endpoint: "/api/agent/profile",
            },
          });
          return void res.status(403).json({
            success: false,
            message:
              "CNIC verification is required to update your agent profile.",
            requestId,
          });
        }
      }

      // Fetch profile — confirm ownership
      const profile = await AgentProfile.findOne({
        user: new Types.ObjectId(auth.id),
        isDeleted: false,
      })
        .select("_id user status isDeleted")
        .lean<ProfileOwnershipLean>();

      if (!profile) {
        return void res.status(404).json({
          success: false,
          message:
            "Agent profile not found. Submit onboarding at /api/onboarding/business first.",
          requestId,
        });
      }

      // Suspended agents cannot update their own profile
      if (profile.status === "suspended") {
        return void res.status(403).json({
          success: false,
          message:
            "Your agent profile is suspended. Contact support.",
          requestId,
        });
      }

      // ── Build safe update object ───────────────────────────────
      const body = req.body as Record<string, unknown>;
      const updates: Record<string, unknown> = {};

      // Text fields
      if ("displayName" in body) {
        const v = safeText(body.displayName, 100);
        if (v) updates.displayName = v;
      }
      if ("tagline" in body) {
        updates.tagline = safeText(body.tagline, 200);
      }
      if ("about" in body) {
        updates.about = safeText(body.about, 2000);
      }
      if ("agencyName" in body) {
        updates.agencyName = safeText(body.agencyName, 150);
      }
      if ("availabilityNote" in body) {
        updates.availabilityNote = safeText(body.availabilityNote, 200);
      }
      if ("city" in body) {
        const v = safeText(body.city, 60);
        if (v) updates.city = v;
      }

      // Enum fields
      if ("agentType" in body) {
        if (isValidEnum(body.agentType, VALID_AGENT_TYPES)) {
          updates.agentType = body.agentType;
        }
      }
      if ("agencySize" in body) {
        if (isValidEnum(body.agencySize, VALID_AGENCY_SIZES)) {
          updates.agencySize = body.agencySize;
        }
      }

      // Boolean fields
      if ("isAvailable" in body) {
        const v = safeBoolean(body.isAvailable);
        if (v !== undefined) updates.isAvailable = v;
      }

      // Array fields
      if ("operatingCities" in body) {
        updates.operatingCities = safeStringArray(body.operatingCities, 20, 60);
      }
      if ("languages" in body) {
        updates.languages = safeStringArray(body.languages, 10, 40);
      }
      if ("specializations" in body) {
        if (Array.isArray(body.specializations)) {
          updates.specializations = (body.specializations as unknown[])
            .filter((s): s is SpecializationValue =>
              isValidEnum(s, VALID_SPECIALIZATIONS)
            )
            .slice(0, 5);
        }
      }

      // Experience sub-document (partial update)
      if ("experience" in body && typeof body.experience === "object" && body.experience !== null) {
        const exp = body.experience as Record<string, unknown>;
        const expUpdate: Record<string, unknown> = {};

        const years = safeInt(exp.years, 0, 50);
        if (years !== undefined) expUpdate["experience.years"] = years;

        // totalDeals and totalValue are system-managed — not user-editable
        if (Object.keys(expUpdate).length > 0) {
          Object.assign(updates, expUpdate);
        }
      }

      // serviceAreas sub-document (partial update)
      if ("serviceAreas" in body && typeof body.serviceAreas === "object" && body.serviceAreas !== null) {
        const sa = body.serviceAreas as Record<string, unknown>;
        if ("cities" in sa) {
          updates["serviceAreas.cities"] = safeStringArray(sa.cities, 20, 60);
        }
        if ("localities" in sa) {
          updates["serviceAreas.localities"] = safeStringArray(
            sa.localities, 50, 80
          );
        }
      }

      // socialLinks sub-document
      if ("socialLinks" in body && typeof body.socialLinks === "object" && body.socialLinks !== null) {
        const sl = body.socialLinks as Record<string, unknown>;
        const socialFields = [
          "facebook", "instagram", "linkedin",
          "youtube", "twitter", "tiktok", "website",
        ] as const;

        for (const field of socialFields) {
          if (field in sl) {
            const url = safeUrl(sl[field]);
            updates[`socialLinks.${field}`] = url;
          }
        }
      }

      // businessHours sub-document
      if ("businessHours" in body && typeof body.businessHours === "object" && body.businessHours !== null) {
        const bh = body.businessHours as Record<string, unknown>;
        if ("weekdays" in bh) {
          updates["businessHours.weekdays"] = safeText(bh.weekdays, 50);
        }
        if ("weekends" in bh) {
          updates["businessHours.weekends"] = safeText(bh.weekends, 50);
        }
      }

      // Document photo fields (Cloudinary — must be valid https URLs)
      if ("profilePhotoUrl" in body) {
        const url = safeUrl(body.profilePhotoUrl);
        if (url) {
          updates["documents.profilePhoto.url"]       = url;
          updates["documents.profilePhoto.uploadedAt"] = new Date();
        }
      }
      if ("profilePhotoPublicId" in body) {
        const pid = safeText(body.profilePhotoPublicId, 200);
        if (pid) updates["documents.profilePhoto.publicId"] = pid;
      }
      if ("coverPhotoUrl" in body) {
        const url = safeUrl(body.coverPhotoUrl);
        if (url) {
          updates["documents.coverPhoto.url"]       = url;
          updates["documents.coverPhoto.uploadedAt"] = new Date();
        }
      }
      if ("coverPhotoPublicId" in body) {
        const pid = safeText(body.coverPhotoPublicId, 200);
        if (pid) updates["documents.coverPhoto.publicId"] = pid;
      }

      // V6.8.11: Agency logo (top-level field, agency accounts only)
      if ("agencyLogoUrl" in body) {
        const url = safeUrl(body.agencyLogoUrl);
        if (url) {
          updates["agencyLogo.url"] = url;
        }
      }
      if ("agencyLogoPublicId" in body) {
        const pid = safeText(body.agencyLogoPublicId, 200);
        if (pid) updates["agencyLogo.publicId"] = pid;
      }

      // V6.8.25: Office verification — FIXED for subdocument coordinates
      // Instead of dot-notation (which fails for nested subdocs),
      // fetch existing officeVerification and merge, then set entire object
      if ("officeVerification" in body && typeof body.officeVerification === "object" && body.officeVerification !== null) {
        const ov = body.officeVerification as Record<string, unknown>;

        // Fetch current officeVerification to merge with (preserves other fields)
        // This ensures we don't lose photos, verifiedAt, etc.
        const currentAgent = await AgentProfile.findById(profile._id)
          .select("officeVerification")
          .lean<{ officeVerification?: Record<string, unknown> }>();

        const currentOffice = currentAgent?.officeVerification ?? {};

        // Build the merged officeVerification object
        const mergedOffice: Record<string, unknown> = {
          ...currentOffice,
          isActive: true,
        };

        if ("address" in ov) {
          const addr = safeText(ov.address, 500);
          if (addr) mergedOffice.address = addr;
        }
        if ("city" in ov) {
          const city = safeText(ov.city, 60);
          if (city) mergedOffice.city = city;
        }

        // V6.8.25 KEY FIX: Coordinates from interactive map picker
        // Set as complete object, not dot-notation nested field
        if ("coordinates" in ov && typeof ov.coordinates === "object" && ov.coordinates !== null) {
          const coords = ov.coordinates as Record<string, unknown>;
          const lat = Number(coords.latitude);
          const lng = Number(coords.longitude);

          // Validate coordinates
          if (
            Number.isFinite(lat) && Number.isFinite(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180
          ) {
            // Set entire coordinates object (not dot-notation)
            mergedOffice.coordinates = {
              latitude: lat,
              longitude: lng,
            };
          }
        }

        // Set entire officeVerification object at once
        // This bypasses the subdocument dot-notation issue
        updates["officeVerification"] = mergedOffice;
      }

      // Guard — nothing to update
      if (Object.keys(updates).length === 0) {
        return void res.status(400).json({
          success: false,
          message: "No valid fields provided for update.",
          requestId,
        });
      }

      // Apply update
      const updated = await AgentProfile.findByIdAndUpdate(
        profile._id,
        { $set: updates },
        { new: true, runValidators: true }
      )
        .select(AGENT_SELECT_FIELDS)
        .lean();

      // Audit log
      await logSecurityEvent({
        type:     "kyc_document_uploaded",
        severity: "low",
        userId:   auth.id,
        req,
        metadata: {
          action:    "agent_profile_updated",
          profileId: String(profile._id),
          fields:    Object.keys(updates),
        },
      });

      return void res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        profile: (updated as Record<string, unknown>) ?? null,
        requestId,
      });
    }

    // ════════════════════════════════════════════════════════════
    // DELETE — Soft delete own profile
    // ════════════════════════════════════════════════════════════
    if (req.method === "DELETE") {
      const profile = await AgentProfile.findOne({
        user: new Types.ObjectId(auth.id),
        isDeleted: false,
      })
        .select("_id user status isDeleted")
        .lean<ProfileOwnershipLean>();

      if (!profile) {
        return void res.status(404).json({
          success: false,
          message: "Agent profile not found.",
          requestId,
        });
      }

      // Cannot delete an approved profile directly
      // Must go through admin suspension first (enterprise policy)
      if (profile.status === "approved" && !isAdmin) {
        return void res.status(403).json({
          success: false,
          message:
            "Approved agent profiles cannot be self-deleted. Please contact support.",
          requestId,
        });
      }

      const now = new Date();

      // Soft delete AgentProfile
      await AgentProfile.updateOne(
        { _id: profile._id },
        {
          $set: {
            isDeleted:      true,
            deletedAt:      now,
            deletedBy:      new Types.ObjectId(auth.id),
            deletionReason: "self_deleted",
            status:         "suspended",   // closest valid enum value
          },
        }
      );

      // V6.8.0: Full capability cleanup + role downgrade (Session 3 pattern)
      // - isVerifiedAgent: false      → revoke capability
      // - agentVerificationStatus     → reset to "none"
      // - agentProfileId              → unlink from AgentProfile
      // - agentListingCount           → reset counter
      // - role: "user"                → downgrade (backward compat)
      // - tokenVersion++              → force re-login
      await User.updateOne(
        { _id: new Types.ObjectId(auth.id) },
        {
          $set: {
            role:                    "user",
            isVerifiedAgent:         false,
            agentVerificationStatus: "none",
            agentProfileId:          null,
            agentListingCount:       0,
          },
          $inc: { tokenVersion: 1 },
        }
      );

      await logSecurityEvent({
        type:     "account_deleted",
        severity: "medium",
        userId:   auth.id,
        req,
        metadata: {
          action:                    "agent_profile_self_deleted",
          profileId:                 String(profile._id),
          roleFrom:                  "agent",
          roleTo:                    "user",
          capabilitiesRevoked:       ["isVerifiedAgent", "agentProfileId", "agentListingCount"],
          agentVerificationStatus:   "none",
        },
      });

      return void res.status(200).json({
        success: true,
        message:
          "Agent profile deleted. Your account has been downgraded. Please log in again.",
        requestId,
      });
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error occurred";

    await logSecurityEvent({
      type:     "system_error",
      severity: "high",
      userId:   auth?.id,
      req,
      metadata: {
        error:    message,
        endpoint: "/api/agent/profile",
        method:   req.method,
      },
    }).catch(() => {});

    return void res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// API CONFIG
// ═══════════════════════════════════════════════════════════════

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "512kb", // Profile updates only — no image uploads here
    },
  },
};