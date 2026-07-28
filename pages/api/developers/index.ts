// pages/api/developers/index.ts
// ═══════════════════════════════════════════════════════════════
// PUBLIC DEVELOPERS DIRECTORY API — Highrise.pk
// Powers: pages/developers/index.tsx (ISR public directory)
// ═══════════════════════════════════════════════════════════════
// GET /api/developers/index
//   ?city=Lahore          → filter by city
//   ?sort=rating          → sort: rating (default) | projects | newest | verified
//   ?page=1               → pagination (default: 1)
//   ?limit=20             → per page (max: 50)
// ═══════════════════════════════════════════════════════════════
// ✅ Public endpoint — no auth required
// ✅ Upstash Redis rate limiting
// ✅ Approved developers only (status === "approved")
// ✅ No PII in response (no user ObjectId, no email, no phone)
// ✅ Stored project counts — no N+1 queries
// ✅ Safe city filter — no regex injection
// ✅ Pagination — page + limit
// ✅ CDN cache headers for ISR compatibility
// ✅ TypeScript strict — no any
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { rateLimitApi } from "@/lib/rateLimit";
import DeveloperProfile from "@/models/DeveloperProfile";
import type { FilterQuery, SortOrder } from "mongoose";
import type { IDeveloperProfile } from "@/models/DeveloperProfile";

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const VALID_SORT_OPTIONS = [
  "rating",
  "projects",
  "newest",
  "verified",
] as const;

type SortOption = (typeof VALID_SORT_OPTIONS)[number];

// ============================================
// TYPES
// ============================================

/** Safe public developer card — no PII, no internal IDs */
interface PublicDeveloperCard {
  _id: string;
  slug: string;
  companyName: string;
  developerType: string;
  city: string;
  logo?: { url: string };
  coverImage?: { url: string };
  tagline?: string;
  isVerified: boolean;
  verificationLevel: string;
  highriseScore: number;
  badges: string[];
  completedProjectsCount: number;
  activeProjectsCount: number;
  averageRating: number;
  totalReviews: number;
  isFeatured: boolean;
  isPremiumPartner: boolean;
  establishedYear: number;
  operatingCities: string[];
  createdAt: Date;
}

interface DeveloperDirectoryResponse {
  success: boolean;
  data: {
    developers: PublicDeveloperCard[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    cities: string[];
    meta: {
      sort: string;
      cityFilter: string | null;
    };
  };
}

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
}

// ============================================
// HELPERS
// ============================================

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

function sanitizeCity(city: unknown): string | null {
  if (typeof city !== "string" || city === "all" || city.trim() === "") {
    return null;
  }
  // Allow only letters, spaces, hyphens — no special chars that could be ReDoS
  const sanitized = city.trim().replace(/[^a-zA-Z\s\u0600-\u06FF-]/g, "");
  return sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
}

function parseSort(sort: unknown): SortOption {
  if (
    typeof sort === "string" &&
    VALID_SORT_OPTIONS.includes(sort as SortOption)
  ) {
    return sort as SortOption;
  }
  return "rating";
}

function parsePagination(
  pageRaw: unknown,
  limitRaw: unknown
): { page: number; limit: number; skip: number } {
  const page = Math.max(
    DEFAULT_PAGE,
    Number.isFinite(Number(pageRaw)) ? Math.floor(Number(pageRaw)) : DEFAULT_PAGE
  );

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Number.isFinite(Number(limitRaw))
        ? Math.floor(Number(limitRaw))
        : DEFAULT_LIMIT
    )
  );

  return { page, limit, skip: (page - 1) * limit };
}

function buildSortOption(
  sort: SortOption
): Record<string, SortOrder> {
  switch (sort) {
    case "projects":
      return {
        completedProjectsCount: -1,
        activeProjectsCount: -1,
        highriseScore: -1,
      };
    case "newest":
      return { createdAt: -1 };
    case "verified":
      return {
        isVerified: -1,
        verificationLevel: -1,
        highriseScore: -1,
      };
    case "rating":
    default:
      return {
        isFeatured: -1,
        isPremiumPartner: -1,
        highriseScore: -1,
        averageRating: -1,
      };
  }
}

function toPublicCard(
  profile: IDeveloperProfile
): PublicDeveloperCard {
  return {
    _id: String(profile._id),
    slug: profile.slug,
    companyName: profile.companyName,
    developerType: profile.developerType,
    city: profile.city,
    // Logo URL only — no public_id
    logo: profile.logo?.url ? { url: profile.logo.url } : undefined,
    coverImage: profile.coverImage?.url
      ? { url: profile.coverImage.url }
      : undefined,
    tagline: profile.tagline,
    isVerified: Boolean(profile.isVerified),
    verificationLevel: profile.verificationLevel,
    highriseScore: profile.highriseScore ?? 0,
    badges: profile.badges ?? [],
    // Stored counts — maintained by Project model on save
    completedProjectsCount: profile.completedProjectsCount ?? 0,
    activeProjectsCount: profile.activeProjectsCount ?? 0,
    averageRating: profile.averageRating ?? 0,
    totalReviews: profile.totalReviews ?? 0,
    isFeatured: Boolean(profile.isFeatured),
    isPremiumPartner: Boolean(profile.isPremiumPartner),
    establishedYear: profile.establishedYear,
    operatingCities: profile.operatingCities ?? [],
    createdAt: profile.createdAt,
    // ⛔ NEVER include: user, email, phone, CNIC, NTN, SECP,
    //    encrypted fields, hashes, auditTrail, rejectionReason
  };
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeveloperDirectoryResponse | ErrorResponse>
): Promise<void> {
  setSecurityHeaders(res);

  // ── Method guard ──────────────────────────
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return void res.status(405).json({
      success: false,
      message: `Method ${req.method ?? "unknown"} not allowed.`,
    });
  }

  // ── Rate limit ────────────────────────────
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter));
    return void res.status(429).json({
      success: false,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
    });
  }

  await dbConnect();

  try {
    // ── Parse params ──────────────────────────
    const sort = parseSort(req.query.sort);
    const cityFilter = sanitizeCity(req.query.city);
    const { page, limit, skip } = parsePagination(
      req.query.page,
      req.query.limit
    );

    // ── Build query ───────────────────────────
    // ONLY approved developers in public directory
    // Never show: pending, draft, rejected, suspended
    const query: FilterQuery<IDeveloperProfile> = {
      status: "approved",
      isDeleted: false,
    };

    if (cityFilter) {
      // Exact case-insensitive match on sanitized string — no regex injection
      query.city = { $regex: `^${cityFilter}$`, $options: "i" };
    }

    const sortOption = buildSortOption(sort);

    // ── Field projection ──────────────────────
    // Explicit allowlist — never select encrypted/sensitive fields
    const projection = {
      slug: 1,
      companyName: 1,
      developerType: 1,
      city: 1,
      logo: 1,
      coverImage: 1,
      tagline: 1,
      isVerified: 1,
      verificationLevel: 1,
      highriseScore: 1,
      badges: 1,
      completedProjectsCount: 1,
      activeProjectsCount: 1,
      averageRating: 1,
      totalReviews: 1,
      isFeatured: 1,
      isPremiumPartner: 1,
      establishedYear: 1,
      operatingCities: 1,
      createdAt: 1,
      // ⛔ user, email, phone, ntnEncrypted, secpEncrypted,
      //    phoneEncrypted, hashes — NOT included
    };

    // ── Parallel queries ──────────────────────
    const [developers, total, cities] = await Promise.all([
      DeveloperProfile.find(query, projection)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean<IDeveloperProfile[]>(),

      DeveloperProfile.countDocuments(query),

      // Distinct approved cities for filter dropdown
      DeveloperProfile.distinct("city", {
        status: "approved",
        isDeleted: false,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // ── CDN cache headers ─────────────────────
    // Cache for 60s at CDN, serve stale up to 120s while revalidating
    // Matches ISR revalidate: 60 pattern
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120"
    );

    return void res.status(200).json({
      success: true,
      data: {
        developers: developers.map(toPublicCard),
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        cities: (cities as string[])
          .filter((c): c is string => typeof c === "string" && c.length > 0)
          .sort(),
        meta: {
          sort,
          cityFilter,
        },
      },
    });
  } catch (err: unknown) {
    return void res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
}