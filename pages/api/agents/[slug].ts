// pages/api/agents/[slug].ts
// ═══════════════════════════════════════════════════════════════
// PUBLIC AGENT PROFILE API — Highrise.pk
// 🔒 ENTERPRISE-GRADE | Public Read | Rate Limited | ISR-Ready
// ═══════════════════════════════════════════════════════════════
//
// GET — Fetch single approved agent by slug
//
// Security:
//   - No PII exposed (no email, phone, CNIC, encrypted fields)
//   - status always hardcoded to "approved" — 404 for all others
//   - 404 used for non-approved (prevents status enumeration)
//   - Rate limited via Upstash Redis
//   - Slug sanitized — only a-z, 0-9, hyphens allowed
//   - No User populate — AgentProfile has all needed public fields
//
// Performance:
//   - Short CDN cache (60s browser, 300s edge)
//   - stale-while-revalidate for ISR compatibility
//   - Lean query (no Mongoose overhead)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";

import dbConnect from "@/lib/dbConnect";
import { rateLimitApi } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

import AgentProfile from "@/models/AgentProfile";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success:    boolean;
  agent?:     Record<string, unknown> | null;
  requestId:  string;
  message?:   string;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC SELECT FIELDS
// No PII — no email, phone, encrypted fields, audit trail
// ═══════════════════════════════════════════════════════════════

const PUBLIC_SELECT_FIELDS = [
  // Identity
  "slug",
  "displayName",
  "tagline",
  "about",
  "agentType",
  "agencyName",
  "agencySize",

  // Location
  "city",
  "operatingCities",
  "serviceAreas",

  // Professional
  "specializations",
  "languages",
  "experience.years",
  "experience.totalDeals",
  "licenseVerified",
  "cnicVerified",
  "licenseIssuer",

  // Trust & verification
  "verificationLevel",
  "badges",
  "trustScore.overall",
  "trustScore.breakdown",
  "isPremium",
  "premiumTier",
  "isFeatured",

  // Social
  "socialLinks",
  "businessHours",
  "isAvailable",
  "availabilityNote",

  // Stats (public-safe subset)
  "stats.activeListings",
  "stats.totalListings",
  "stats.soldProperties",
  "stats.rentedProperties",
  "stats.averageResponseTime",
  "stats.responseRate",

  // Ratings
  "ratings.averageRating",
  "ratings.totalReviews",
  "ratings.breakdown",
  "ratings.lastReviewAt",

  // Media (Cloudinary public URLs only)
  "documents.profilePhoto.url",
  "documents.profilePhoto.publicId",
  "documents.coverPhoto.url",
  "documents.coverPhoto.publicId",

  // Office (public address + coordinates for map/directions)
  "officeVerification.address",
  "officeVerification.city",
  "officeVerification.coordinates",
  "officeVerification.isActive",
  "officeVerification.verifiedAt",

  // Membership
  "memberSince",
  "createdAt",
].join(" ");

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setPublicCacheHeaders(
  res: NextApiResponse,
  requestId: string
): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  // Short CDN cache — ISR compatible
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
  );
}

// ═══════════════════════════════════════════════════════════════
// SLUG SANITIZATION
// ═══════════════════════════════════════════════════════════════

function sanitizeSlug(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")   // Only a-z, 0-9, hyphens
    .replace(/-+/g, "-")           // Collapse multiple hyphens
    .replace(/^-|-$/g, "")         // Strip leading/trailing hyphens
    .slice(0, 120);
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // ── Correlation ID + headers FIRST (before any early return) ─
  const requestId =
    typeof req.headers["x-correlation-id"] === "string"
      ? req.headers["x-correlation-id"]
      : crypto.randomUUID();

  setPublicCacheHeaders(res, requestId);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return void res.status(405).json({
      success:  false,
      message:  "Method not allowed",
      requestId,
    });
  }

  // ── Rate limiting ────────────────────────────────────────────
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success:  false,
      message:  "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  // ── Slug validation ──────────────────────────────────────────
  const slug = sanitizeSlug(req.query.slug);

  if (!slug) {
    return void res.status(404).json({
      success:  false,
      message:  "Agent not found.",
      requestId,
    });
  }

  try {
    await dbConnect();

    // ── Fetch agent — approved only, not deleted ─────────────────
    // 404 for all non-approved states — prevents status enumeration
    const agent = await AgentProfile.findOne({
      slug,
      status:    "approved",
      isDeleted: false,
    })
      .select(PUBLIC_SELECT_FIELDS)
      .lean();

    if (!agent) {
      return void res.status(404).json({
        success:  false,
        message:  "Agent not found.",
        requestId,
      });
    }

    // ── Success response ─────────────────────────────────────────
    return void res.status(200).json({
      success:  true,
      agent:    agent as Record<string, unknown>,
      requestId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error occurred";

    await logSecurityEvent({
      type:     "system_error",
      severity: "high",
      req,
      metadata: {
        error:    message,
        endpoint: "/api/agents/[slug]",
        slug,
      },
    }).catch(() => {});

    // Never leak internals on public endpoint
    return void res.status(500).json({
      success:  false,
      message:  "An unexpected error occurred.",
      requestId,
    });
  }
}