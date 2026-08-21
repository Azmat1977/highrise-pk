// pages/api/agents/index.ts
// ═══════════════════════════════════════════════════════════════
// PUBLIC AGENT LISTING API — Highrise.pk
// 🔒 ENTERPRISE-GRADE | Public Read | Rate Limited | ISR-Ready
// ═══════════════════════════════════════════════════════════════
//
// GET — List approved agents with filtering, sorting, pagination
//
// Security:
//   - No PII exposed (no email, no phone, no encrypted fields)
//   - status always hardcoded to "approved" — never from query
//   - Rate limited via Upstash Redis
//   - All query params sanitized and validated
//   - Regex injection prevented via escapeRegex()
//
// Pagination:
//   - Page mode:   ?page=1&limit=20
//   - Cursor mode: ?cursor=<token>&limit=20
//   - Cursor is stable under concurrent inserts
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import type mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { rateLimitApi } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

import AgentProfile, { type IAgentProfile } from "@/models/AgentProfile";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PagePagination {
  mode:        "page";
  currentPage: number;
  totalPages:  number;
  total:       number;
  limit:       number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface CursorPagination {
  mode:        "cursor";
  limit:       number;
  nextCursor:  string | null;
  hasNextPage: boolean;
}

interface ApiResponse {
  success:    boolean;
  agents?:    unknown[];
  pagination?: PagePagination | CursorPagination;
  requestId:  string;
  message?:   string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS — must match AgentProfile schema exactly
// ═══════════════════════════════════════════════════════════════

const VALID_AGENT_TYPES = [
  "individual", "agency", "freelance",
] as const;

const VALID_SPECIALIZATIONS = [
  "residential", "commercial", "plots", "rental", "all",
] as const;

const VERIFIED_LEVELS = [
  "basic_verified",
  "license_verified",
  "full_verified",
  "premium_verified",
] as const;

const VALID_SORT_OPTIONS = [
  "featured", "rating", "experience", "listings", "newest", "trust",
] as const;

type AgentTypeValue     = typeof VALID_AGENT_TYPES[number];
type SortOption         = typeof VALID_SORT_OPTIONS[number];

// Fields returned to public — NO PII (no email, phone, CNIC)
const PUBLIC_SELECT_FIELDS = [
  "slug",
  "displayName",
  "tagline",
  "agentType",
  "agencyName",
  "agencySize",
  "city",
  "operatingCities",
  "specializations",
  "languages",
  "verificationLevel",
  "isFeatured",
  "featuredUntil",
  "featuredPriority",
  "isPremium",
  "badges",
  "ratings.averageRating",
  "ratings.totalReviews",
  "stats.activeListings",
  "stats.totalListings",
  "trustScore.overall",
  "experience.years",
  "documents.profilePhoto.url",
  "documents.profilePhoto.publicId",
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
  // Public directory — short CDN cache, stale-while-revalidate for ISR
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
  );
}

// ═══════════════════════════════════════════════════════════════
// SANITIZATION HELPERS
// ═══════════════════════════════════════════════════════════════

function safeStr(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function safeInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function escapeRegex(input: string): string {
  // Prevents ReDoS / regex injection
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidEnum<T extends string>(
  v: unknown,
  values: readonly T[]
): v is T {
  return typeof v === "string" && (values as readonly string[]).includes(v);
}

// ═══════════════════════════════════════════════════════════════
// CURSOR PARSING
// ═══════════════════════════════════════════════════════════════

interface ParsedCursor {
  createdAt: Date;
  id:        string;
}

function parseCursor(raw: unknown): ParsedCursor | null {
  if (typeof raw !== "string" || !raw.trim()) return null;

  const parts = raw.trim().split("|");
  if (parts.length !== 2) return null;

  const [isoDate, id] = parts;
  if (!isoDate || !id || id.length < 8) return null;

  const dt = new Date(isoDate);
  if (isNaN(dt.getTime())) return null;

  return { createdAt: dt, id };
}

function buildNextCursor(agents: unknown[]): string | null {
  if (!agents.length) return null;
  const last = agents[agents.length - 1] as Record<string, unknown>;
  if (!last?.createdAt || !last?._id) return null;
  return `${new Date(last.createdAt as string).toISOString()}|${String(last._id)}`;
}

// ═══════════════════════════════════════════════════════════════
// SORT BUILDER
// ═══════════════════════════════════════════════════════════════

function buildSort(
  sortBy: SortOption,
  useCursor: boolean
): Record<string, 1 | -1> {
  // Cursor mode always uses stable sort (createdAt + _id)
  if (useCursor) {
    return { createdAt: -1, _id: -1 };
  }

  switch (sortBy) {
    case "featured":
      return {
        isFeatured:              -1,
        featuredPriority:        -1,
        "ratings.averageRating": -1,
      };
    case "rating":
      return {
        "ratings.averageRating": -1,
        "ratings.totalReviews":  -1,
      };
    case "experience":
      return { "experience.years": -1 };
    case "listings":
      return { "stats.activeListings": -1 };
    case "newest":
      return { createdAt: -1 };
    case "trust":
      return { "trustScore.overall": -1 };
    default:
      return {
        isFeatured:              -1,
        "ratings.averageRating": -1,
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// QUERY BUILDER
// ═══════════════════════════════════════════════════════════════

function buildBaseQuery(
  params: Record<string, unknown>
): mongoose.FilterQuery<IAgentProfile> {
  const now = new Date();

  // Base — always hardcoded, never from user input
  const base: mongoose.FilterQuery<IAgentProfile> = {
    status:    "approved",
    isDeleted: false,
  };

  const andClauses: mongoose.FilterQuery<IAgentProfile>[] = [];

  // ── City filter ──────────────────────────────────────────────
  const cityQ = safeStr(params.city, 60);
  if (cityQ) {
    const safe = escapeRegex(cityQ);
    // Use anchored regex for better index usage
    const cityRegex = { $regex: `^${safe}$`, $options: "i" };
    andClauses.push({
      $or: [
        { city: cityRegex },
        { operatingCities: cityRegex },
        { "serviceAreas.cities": { $regex: safe, $options: "i" } },
      ],
    });
  }

  // ── Specialization filter ────────────────────────────────────
  const specQ = safeStr(params.specialization, 40);
  if (isValidEnum(specQ, VALID_SPECIALIZATIONS)) {
    base.specializations = { $in: [specQ, "all"] };
  }

  // ── Agent type filter ────────────────────────────────────────
  const typeQ = safeStr(params.agentType, 20);
  if (isValidEnum(typeQ, VALID_AGENT_TYPES)) {
    base.agentType = typeQ as AgentTypeValue;
  }

  // ── Verified filter ──────────────────────────────────────────
  if (params.verified === "true") {
    base.verificationLevel = { $in: [...VERIFIED_LEVELS] };
  }

  // ── Featured filter ──────────────────────────────────────────
  if (params.featured === "true") {
    base.isFeatured = true;
    // Include agents with no expiry (null) OR future expiry
    andClauses.push({
      $or: [
        { featuredUntil: null },
        { featuredUntil: { $gte: now } },
      ],
    });
  }

  // ── Premium filter (bonus — useful for frontend) ─────────────
  if (params.premium === "true") {
    base.isPremium = true;
    andClauses.push({
      $or: [
        { premiumUntil: null },
        { premiumUntil: { $gte: now } },
      ],
    });
  }

  // ── Combine with $and if needed ──────────────────────────────
  if (andClauses.length > 0) {
    return { ...base, $and: andClauses };
  }

  return base;
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

  setPublicCacheHeaders(res, requestId);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return void res.status(405).json({
      success:   false,
      message:   "Method not allowed",
      requestId,
    });
  }

  // ── Rate limiting ────────────────────────────────────────────
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success:   false,
      message:   "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  try {
    await dbConnect();

    // ── Parse query params ───────────────────────────────────────
    const {
      city,
      specialization,
      agentType,
      verified,
      featured,
      premium,
      page     = "1",
      limit    = "20",
      sortBy   = "featured",
      cursor,
    } = req.query;

    const limitNum   = safeInt(limit,   1, 50,  20);
    const pageNum    = safeInt(page,    1, 999,  1);
    const useCursor  = typeof cursor === "string" && cursor.trim().length > 0;
    const sortOption = isValidEnum(sortBy, VALID_SORT_OPTIONS)
      ? sortBy
      : "featured";

    // ── Build base query ─────────────────────────────────────────
    const baseQuery = buildBaseQuery({
      city,
      specialization,
      agentType,
      verified,
      featured,
      premium,
    });

    // ── Apply cursor filter ──────────────────────────────────────
    // Cursor adds an additional $and clause — does NOT conflict
    // with any existing $or in baseQuery
    let effectiveQuery: mongoose.FilterQuery<IAgentProfile> = baseQuery;

    if (useCursor) {
      const parsed = parseCursor(cursor);
      if (parsed) {
        const existingAnd = Array.isArray(baseQuery.$and)
          ? baseQuery.$and
          : [];

        effectiveQuery = {
          ...baseQuery,
          $and: [
            ...existingAnd,
            {
              $or: [
                { createdAt: { $lt: parsed.createdAt } },
                {
                  createdAt: parsed.createdAt,
                  _id:       { $lt: parsed.id },
                },
              ],
            },
          ],
        };
      }
    }

    // ── Build sort ───────────────────────────────────────────────
    const sort = buildSort(sortOption, useCursor);

    // ── Execute queries ──────────────────────────────────────────
    // Total count only for page mode page 1 (expensive — skip for
    // subsequent pages if frontend passes total from first response)
    const needsTotal = !useCursor;
    const skipCount  = useCursor ? 0 : (pageNum - 1) * limitNum;

    const [agents, total] = await Promise.all([
      AgentProfile.find(effectiveQuery)
        .select(PUBLIC_SELECT_FIELDS)
        .sort(sort)
        .skip(skipCount)
        .limit(limitNum)
        .lean(),

      needsTotal
        ? AgentProfile.countDocuments(baseQuery)
        : Promise.resolve(0),
    ]);

    // ── Build pagination response ────────────────────────────────
    if (useCursor) {
      const nextCursor = agents.length === limitNum
        ? buildNextCursor(agents)
        : null;

      return void res.status(200).json({
        success: true,
        agents,
        pagination: {
          mode:        "cursor",
          limit:       limitNum,
          nextCursor,
          hasNextPage: Boolean(nextCursor),
        },
        requestId,
      });
    }

    // Page mode
    const totalPages = Math.ceil(total / limitNum);

    return void res.status(200).json({
      success: true,
      agents,
      pagination: {
        mode:        "page",
        currentPage: pageNum,
        totalPages,
        total,
        limit:       limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
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
        endpoint: "/api/agents/index",
      },
    }).catch(() => {});

    return void res.status(500).json({
      success:   false,
      message:   "An unexpected error occurred.",
      requestId,
    });
  }
}