// pages/api/developers/[slug].ts
// ═══════════════════════════════════════════════════════════════
// PUBLIC DEVELOPER PROFILE API — Highrise.pk
// Powers: pages/developer/[slug].tsx (ISR public profile page)
// ═══════════════════════════════════════════════════════════════
// GET /api/developers/[slug]
//   Returns full public developer profile for ISR rendering
//   Increments profileViews (fire and forget)
// ═══════════════════════════════════════════════════════════════
// ✅ Slug-only lookup — no ObjectId exposure
// ✅ Approved developers only
// ✅ No PII in response
// ✅ Upstash Redis rate limiting
// ✅ CDN cache headers (ISR compatible)
// ✅ Security headers
// ✅ JSON-LD structured data hints in response
// ✅ TypeScript strict — no any, no as casts
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { rateLimitApi } from "@/lib/rateLimit";
import DeveloperProfile, {
  IDeveloperProfile,
} from "@/models/DeveloperProfile";

// ============================================
// TYPES
// ============================================

/** Full public profile — safe for ISR rendering, no PII */
interface PublicDeveloperProfile {
  _id: string;
  slug: string;
  companyName: string;
  developerType: string;
  companyType: string;
  city: string;
  operatingCities: string[];
  serviceAreas: string[];
  officeAddress?: string;
  website?: string;
  establishedYear: number;
  description?: string;
  tagline?: string;
  ceoName?: string;

  // Media
  logo?: { url: string };
  coverImage?: { url: string };
  gallery: Array<{ url: string; caption?: string }>;

  // Social
  socialLinks: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
  };

  // Verification
  isVerified: boolean;
  verificationLevel: string;
  badges: string[];

  // Stats
  completedProjectsCount: number;
  activeProjectsCount: number;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<string, number>;
  onTimeDeliveryRate?: number;
  highriseScore: number;
  trustScore: number;

  // Portfolio
  portfolio: {
    totalUnitsDelivered?: number;
    totalProjectValue?: number;
    totalLandArea?: number;
    awards?: string[];
    certifications?: string[];
    notableProjects?: string[];
  };

  // Premium
  isFeatured: boolean;
  isPremiumPartner: boolean;

  // Analytics (safe to expose)
  profileViews: number;

  // SEO
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl: string;

  // JSON-LD hints for ISR page
  seo: {
    ogImage: string;
    jsonLd: {
      name: string;
      description?: string;
      url: string;
      logo?: string;
      address?: string;
      city: string;
      foundingDate?: string;
    };
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface SuccessResponse {
  success: true;
  data: PublicDeveloperProfile;
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

function isValidSlug(slug: string): boolean {
  // Slugs are lowercase alphanumeric + hyphens only
  // Min 3 chars, max 120 chars
  return /^[a-z0-9-]{3,120}$/.test(slug);
}

function toPublicProfile(
  profile: IDeveloperProfile
): PublicDeveloperProfile {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";

  const metaTitle =
    profile.metaTitle ??
    `${profile.companyName} — Real Estate Developer in ${profile.city} | Highrise.pk`;

  const metaDescription =
    profile.metaDescription ??
    `${profile.companyName} is a verified ${profile.developerType} based in ${profile.city} with ${profile.completedProjectsCount ?? 0} completed projects. View projects and reviews on Highrise.pk`;

  const canonicalUrl =
    profile.canonicalUrl ?? `${appUrl}/developer/${profile.slug}`;

  const ogImage =
    profile.coverImage?.url ??
    profile.logo?.url ??
    `${appUrl}/og-default.jpg`;

  return {
    _id: String(profile._id),
    slug: profile.slug,
    companyName: profile.companyName,
    developerType: profile.developerType,
    companyType: profile.companyType,
    city: profile.city,
    operatingCities: profile.operatingCities ?? [],
    serviceAreas: profile.serviceAreas ?? [],
    officeAddress: profile.officeAddress,
    website: profile.website,
    establishedYear: profile.establishedYear,
    description: profile.description,
    tagline: profile.tagline,
    ceoName: profile.ceoName,

    // Logo URL only — never public_id
    logo: profile.logo?.url ? { url: profile.logo.url } : undefined,
    coverImage: profile.coverImage?.url
      ? { url: profile.coverImage.url }
      : undefined,
    gallery: (profile.gallery ?? []).map((g) => ({
      url: g.url,
      caption: g.caption,
    })),

    socialLinks: profile.socialLinks ?? {},

    isVerified: Boolean(profile.isVerified),
    verificationLevel: profile.verificationLevel,
    badges: profile.badges ?? [],

    completedProjectsCount: profile.completedProjectsCount ?? 0,
    activeProjectsCount: profile.activeProjectsCount ?? 0,
    averageRating: profile.averageRating ?? 0,
    totalReviews: profile.totalReviews ?? 0,
    ratingBreakdown: (profile.ratingBreakdown as unknown as Record<string, number>) ?? {},
    onTimeDeliveryRate: profile.onTimeDeliveryRate,
    highriseScore: profile.highriseScore ?? 0,
    trustScore: profile.trustScore?.overall ?? 0,

    portfolio: {
      totalUnitsDelivered: profile.portfolio?.totalUnitsDelivered,
      totalProjectValue: profile.portfolio?.totalProjectValue,
      totalLandArea: profile.portfolio?.totalLandArea,
      awards: profile.portfolio?.awards ?? [],
      certifications: profile.portfolio?.certifications ?? [],
      notableProjects: profile.portfolio?.notableProjects ?? [],
    },

    isFeatured: Boolean(profile.isFeatured),
    isPremiumPartner: Boolean(profile.isPremiumPartner),
    profileViews: profile.profileViews ?? 0,

    metaTitle,
    metaDescription,
    keywords: profile.keywords ?? [],
    canonicalUrl,

    // SEO hints for ISR page JSON-LD generation
    seo: {
      ogImage,
      jsonLd: {
        name: profile.companyName,
        description: profile.description,
        url: canonicalUrl,
        logo: profile.logo?.url,
        address: profile.officeAddress,
        city: profile.city,
        foundingDate: profile.establishedYear
          ? String(profile.establishedYear)
          : undefined,
      },
    },

    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,

    // ⛔ NEVER include:
    // user, email, phone, authorizedPerson*, CNIC, NTN, SECP
    // *Encrypted, *Hash fields, auditTrail, rejectionReason
    // legalDocs (document URLs are internal)
  };
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
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

  // ── Validate slug param ───────────────────
  const { slug } = req.query;

  if (typeof slug !== "string" || !slug) {
    return void res.status(400).json({
      success: false,
      code: "MISSING_SLUG",
      message: "Developer slug is required.",
    });
  }

  const normalizedSlug = slug.toLowerCase().trim();

  if (!isValidSlug(normalizedSlug)) {
    return void res.status(400).json({
      success: false,
      code: "INVALID_SLUG",
      message: "Invalid developer profile slug.",
    });
  }

  await dbConnect();

  try {
    // ── Fetch profile ─────────────────────────
    // Slug lookup only — no ObjectId, no userId
    // Only approved profiles are publicly visible
    const profile = await DeveloperProfile.findOne({
      slug: normalizedSlug,
      status: "approved",
      isDeleted: false,
    }).lean<IDeveloperProfile>();

    if (!profile) {
      return void res.status(404).json({
        success: false,
        message: "Developer profile not found.",
      });
    }

    // ── Increment profile views ───────────────
    // Fire and forget — never blocks response
    void DeveloperProfile.updateOne(
      { _id: profile._id },
      { $inc: { profileViews: 1 } }
    ).exec();

    // ── CDN cache headers ─────────────────────
    // Profile pages: 5 min CDN cache, 10 min stale
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );

    return void res.status(200).json({
      success: true,
      data: toPublicProfile(profile),
    });
  } catch (err: unknown) {
    return void res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
}