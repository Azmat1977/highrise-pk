// pages/api/developer/profile.ts
// ═══════════════════════════════════════════════════════════════
// DEVELOPER PROFILE API — Highrise.pk V6.4.5+
// 🔒 ENTERPRISE-GRADE — Production Ready
// ═══════════════════════════════════════════════════════════════
// GET    /api/developer/profile          → own private profile
// GET    /api/developer/profile?slug=x   → public profile by slug
// POST   /api/developer/profile          → create profile
// PUT    /api/developer/profile          → update profile
// ═══════════════════════════════════════════════════════════════
// ✅ V6.4.5+: NTN Certificate mandatory
// ✅ V6.4.5+: CNIC front + back images mandatory
// ✅ V6.4.5+: completedProjects[] portfolio handling
// ✅ V6.4.5+: Video URL validation (YouTube/Vimeo)
// ✅ V6.4.5+: delayed/on_hold requires delayReason
// ✅ V6.4.5+: developer cannot set isVerified on projects
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import {
  rateLimitApi,
  rateLimitApiWrite,
} from "@/lib/rateLimit";
import DeveloperProfile, {
  IDeveloperProfile,
  type ICompletedProject,
  type CompletedProjectType,
  type CompletedProjectStatus,
} from "@/models/DeveloperProfile";
import User from "@/models/User";
import { sendEmail } from "@/lib/email";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import {
  validatePhone,
  validateNtn,
  validateSecp,
  validateCnic,
  hashNtn,
  hashSecp,
  hashCnic,
  hashPhone,
} from "@/lib/kycCrypto";
import mongoose from "mongoose";
import crypto from "crypto";
import { toPrivateKycAssetView } from "@/lib/privateAsset";

// ============================================
// TYPES
// ============================================

interface CloudinaryRef {
  url: string;
  public_id: string;
}

// ── Completed Project input from client ──────────────────────

interface CompletedProjectInput {
  _id?: string;
  projectName?: string;
  projectType?: string;
  city?: string;
  area?: string;
  location?: string;
  startYear?: number;
  completionYear?: number;
  status?: string;
  delayReason?: string;
  expectedResolutionDate?: string;
  totalUnits?: number;
  totalPlots?: number;
  totalArea?: string;
  societyName?: string;
  description?: string;
  images?: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
  brochureUrl?: string;
  // NOTE: isVerified, verifiedBy, verifiedAt are NEVER accepted from client
}

interface CreateProfileBody {
  // Company
  companyName?: string;
  companyType?: string;
  developerType?: string;
  establishedYear?: number;
  description?: string;
  tagline?: string;
  ceoName?: string;

  // KYC — raw values, encrypted in pre-save
  ntnNumber?: string;
  secpNumber?: string;
  strn?: string;

  // Contact — raw values, encrypted in pre-save
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  officeAddress?: string;
  city?: string;
  operatingCities?: string[];
  serviceAreas?: string[];

  // Authorized person
  authorizedPersonName?: string;
  authorizedPersonCNIC?: string;
  authorizedPersonPhone?: string;
  authorizedPersonEmail?: string;
  authorizedPersonDesignation?: string;

  // Media — pre-uploaded via /api/upload
  logo?: CloudinaryRef;
  coverImage?: CloudinaryRef;

  // Legal docs — pre-uploaded via /api/upload
  legalDocs?: {
    secpCertificate?: CloudinaryRef;
    ntnCertificate?: CloudinaryRef;
    memorandum?: CloudinaryRef;
    articlesOfAssociation?: CloudinaryRef;
    pastProjects?: CloudinaryRef[];
    // V6.4.5+ — CNIC images
    authorizedPersonCnicFrontImage?: CloudinaryRef;
    authorizedPersonCnicBackImage?: CloudinaryRef;
  };

  // Social links
  socialLinks?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
  };

  // V6.4.5+ — Portfolio projects
  portfolio?: {
    completedProjects?: CompletedProjectInput[];
  };
}

interface UpdateProfileBody {
  companyName?: string;
  companyType?: string;
  developerType?: string;
  establishedYear?: number;
  description?: string;
  tagline?: string;
  ceoName?: string;
  ntnNumber?: string;
  secpNumber?: string;
  strn?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  officeAddress?: string;
  city?: string;
  operatingCities?: string[];
  serviceAreas?: string[];
  authorizedPersonName?: string;
  authorizedPersonCNIC?: string;
  authorizedPersonPhone?: string;
  authorizedPersonEmail?: string;
  authorizedPersonDesignation?: string;
  logo?: CloudinaryRef;
  coverImage?: CloudinaryRef;
  legalDocs?: {
    secpCertificate?: CloudinaryRef;
    ntnCertificate?: CloudinaryRef;
    memorandum?: CloudinaryRef;
    articlesOfAssociation?: CloudinaryRef;
    pastProjects?: CloudinaryRef[];
    // V6.4.5+ — CNIC images
    authorizedPersonCnicFrontImage?: CloudinaryRef;
    authorizedPersonCnicBackImage?: CloudinaryRef;
  };
  socialLinks?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
  };
  // V6.4.5+ — Portfolio projects
  portfolio?: {
    completedProjects?: CompletedProjectInput[];
  };
  // SEO — added to PUT handling
  metaTitle?: string;
  metaDescription?: string;
}

// ============================================
// CONSTANTS
// ============================================

const VALID_PROJECT_TYPES: CompletedProjectType[] = [
  "residential_society",
  "commercial_society",
  "highrise_building",
  "mixed_use",
  "townhouse_complex",
  "gated_community",
  "housing_scheme",
  "farmhouse_society",
  "commercial_plaza",
  "shopping_mall",
];

const VALID_PROJECT_STATUSES: CompletedProjectStatus[] = [
  "completed",
  "under_construction",
  "ready_for_possession",
  "delayed",
  "on_hold",
];

// YouTube/Vimeo URL validation
const VIDEO_URL_REGEX =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)[a-zA-Z0-9_\-?=&]+$/;

const MAX_COMPLETED_PROJECTS = 50;

// ============================================
// HELPERS — Security Headers
// ============================================

function setSecurityHeaders(
  res: NextApiResponse,
  requestId: string,
): void {
  res.setHeader("X-Request-Id",              requestId);
  res.setHeader("Content-Type",              "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options",    "nosniff");
  res.setHeader("X-Frame-Options",           "DENY");
  res.setHeader("Cache-Control",             "no-store, no-cache, must-revalidate, private");
  res.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("Permissions-Policy",        "geolocation=(), microphone=(), camera=()");
}

function setNoStore(res: NextApiResponse): void {
  res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

// ============================================
// HELPERS — IP
// ============================================

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

// ============================================
// HELPERS — CloudinaryRef validation
// ============================================

function isValidCloudinaryRef(ref: unknown): ref is CloudinaryRef {
  if (!ref || typeof ref !== "object") return false;
  const r = ref as Record<string, unknown>;
  return (
    typeof r.url === "string" &&
    r.url.startsWith("https://res.cloudinary.com/") &&
    typeof r.public_id === "string" &&
    r.public_id.startsWith("highrise-pk/")
  );
}

// ============================================
// HELPERS — CompletedProject validation
// ============================================

interface ProjectValidationResult {
  valid: boolean;
  error?: string;
  project?: Partial<ICompletedProject>;
}

function validateAndSanitizeProject(
  input: CompletedProjectInput,
  index: number
): ProjectValidationResult {
  const prefix = `Project ${index + 1}`;

  // Required fields
  if (!input.projectName?.trim()) {
    return { valid: false, error: `${prefix}: Project name is required` };
  }
  if (!input.projectType || !VALID_PROJECT_TYPES.includes(input.projectType as CompletedProjectType)) {
    return { valid: false, error: `${prefix}: Valid project type is required` };
  }
  if (!input.city?.trim()) {
    return { valid: false, error: `${prefix}: City is required` };
  }
  if (!input.area?.trim()) {
    return { valid: false, error: `${prefix}: Area is required` };
  }
  if (!input.completionYear || !Number.isFinite(Number(input.completionYear))) {
    return { valid: false, error: `${prefix}: Valid completion year is required` };
  }

  const completionYear = Number(input.completionYear);
  const currentYear = new Date().getFullYear();
  if (completionYear < 1900 || completionYear > currentYear + 10) {
    return { valid: false, error: `${prefix}: Completion year must be between 1900 and ${currentYear + 10}` };
  }

  if (!input.status || !VALID_PROJECT_STATUSES.includes(input.status as CompletedProjectStatus)) {
    return { valid: false, error: `${prefix}: Valid project status is required` };
  }

  // Transparency enforcement — delayed/on_hold requires reason
  if (
    (input.status === "delayed" || input.status === "on_hold") &&
    !input.delayReason?.trim()
  ) {
    return {
      valid: false,
      error: `${prefix}: Delay/hold reason is required for status "${input.status}" (transparency requirement)`,
    };
  }

  // Images — at least 1 required
  if (!Array.isArray(input.images) || input.images.length === 0) {
    return { valid: false, error: `${prefix}: At least 1 project image is required` };
  }
  if (input.images.length > 5) {
    return { valid: false, error: `${prefix}: Maximum 5 images allowed` };
  }

  // Validate each image URL (must be Cloudinary)
  for (const imgUrl of input.images) {
    if (
      typeof imgUrl !== "string" ||
      !imgUrl.startsWith("https://res.cloudinary.com/")
    ) {
      return { valid: false, error: `${prefix}: All images must be uploaded via Highrise upload system` };
    }
  }

  // Video URL validation — YouTube/Vimeo only
  if (input.videoUrl?.trim()) {
    if (!VIDEO_URL_REGEX.test(input.videoUrl.trim())) {
      return {
        valid: false,
        error: `${prefix}: Video URL must be a valid YouTube or Vimeo link`,
      };
    }
  }

  // Description max length
  if (input.description && input.description.length > 500) {
    return { valid: false, error: `${prefix}: Description cannot exceed 500 characters` };
  }

  // Build sanitized project object
  // ⚠️ SECURITY: isVerified, verifiedBy, verifiedAt are NEVER accepted from client
  const sanitized: Partial<ICompletedProject> = {
    projectName:            input.projectName.trim(),
    projectType:            input.projectType as CompletedProjectType,
    city:                   input.city.trim(),
    area:                   input.area.trim(),
    location:               input.location?.trim(),
    completionYear,
    startYear:              input.startYear ? Number(input.startYear) : undefined,
    status:                 input.status as CompletedProjectStatus,
    delayReason:            input.delayReason?.trim(),
    expectedResolutionDate: input.expectedResolutionDate?.trim(),
    totalUnits:             input.totalUnits ? Number(input.totalUnits) : undefined,
    totalPlots:             input.totalPlots ? Number(input.totalPlots) : undefined,
    totalArea:              input.totalArea?.trim(),
    societyName:            input.societyName?.trim(),
    description:            input.description?.trim(),
    images:                 input.images,
    videoUrl:               input.videoUrl?.trim() || undefined,
    virtualTourUrl:         input.virtualTourUrl?.trim() || undefined,
    brochureUrl:            input.brochureUrl?.trim() || undefined,
    // Always false from client — admin sets via separate API
    isVerified:             false,
    addedAt:                new Date(),
    updatedAt:              new Date(),
  };

  return { valid: true, project: sanitized };
}

// ============================================
// HELPERS — Public profile (no PII)
// ============================================

function toPublicProfile(profile: IDeveloperProfile): Record<string, unknown> {
  return {
    _id: String(profile._id),
    slug: profile.slug,
    companyName: profile.companyName,
    developerType: profile.developerType,
    companyType: profile.companyType,
    establishedYear: profile.establishedYear,
    description: profile.description,
    tagline: profile.tagline,
    ceoName: profile.ceoName,
    city: profile.city,
    operatingCities: profile.operatingCities ?? [],
    serviceAreas: profile.serviceAreas ?? [],
    website: profile.website,
    logo: profile.logo?.url ? { url: profile.logo.url } : undefined,
    coverImage: profile.coverImage?.url
      ? { url: profile.coverImage.url }
      : undefined,
    socialLinks: profile.socialLinks ?? {},
    isVerified: Boolean(profile.isVerified),
    verificationLevel: profile.verificationLevel,
    badges: profile.badges ?? [],
    completedProjectsCount: profile.completedProjectsCount ?? 0,
    activeProjectsCount: profile.activeProjectsCount ?? 0,
    averageRating: profile.averageRating ?? 0,
    totalReviews: profile.totalReviews ?? 0,
    trustScore: profile.trustScore?.overall ?? 0,
    highriseScore: profile.highriseScore ?? 0,
    onTimeDeliveryRate: profile.onTimeDeliveryRate ?? 0,
    // V6.4.5+: only show verified projects publicly
    portfolio: {
      completedProjects: (profile.portfolio?.completedProjects ?? [])
        .filter((p) => p.isVerified)
        .map((p) => ({
          projectName:     p.projectName,
          projectType:     p.projectType,
          city:            p.city,
          area:            p.area,
          completionYear:  p.completionYear,
          status:          p.status,
          totalUnits:      p.totalUnits,
          totalArea:       p.totalArea,
          description:     p.description,
          images:          p.images,
          videoUrl:        p.videoUrl,
          isVerified:      true,
          verifiedAt:      p.verifiedAt,
        })),
    },
    isFeatured: profile.isFeatured ?? false,
    metaTitle: profile.metaTitle,
    metaDescription: profile.metaDescription,
    keywords: profile.keywords ?? [],
    createdAt: profile.createdAt,
  };
}

// ============================================
// HELPERS — Private profile (owner view)
// ============================================

function toPrivateProfile(profile: IDeveloperProfile): Record<string, unknown> {
  return {
    _id: String(profile._id),
    slug: profile.slug,
    companyName: profile.companyName,
    companyType: profile.companyType,
    developerType: profile.developerType,
    establishedYear: profile.establishedYear,
    description: profile.description,
    tagline: profile.tagline,
    ceoName: profile.ceoName,

    // Masked KYC
    ntnNumberMasked: profile.getMaskedNTN(),
    secpNumberMasked: profile.getMaskedSECP(),

    // KYC status
    kycStatus: profile.kycStatus,
    kycLockedAt: profile.kycLockedAt,

    // Authorized person
    authorizedPersonName: profile.authorizedPersonName,
    authorizedPersonDesignation: profile.authorizedPersonDesignation,
    authorizedPersonEmail: profile.authorizedPersonEmail,
    authorizedPersonCnicMasked: profile.getMaskedAuthorizedPersonCNIC(),
    authorizedPersonVerificationLevel: profile.authorizedPersonVerificationLevel,

    // Contact — masked
    phoneMasked: profile.getMaskedPhone(),
    email: profile.email,
    website: profile.website,
    officeAddress: profile.officeAddress,
    city: profile.city,
    operatingCities: profile.operatingCities ?? [],
    serviceAreas: profile.serviceAreas ?? [],

    // Media
    logo: profile.logo,
    coverImage: profile.coverImage,
    gallery: profile.gallery ?? [],

    // Social
    socialLinks: profile.socialLinks ?? {},

    // Legal docs — URLs only, no public_ids exposed to developer
    legalDocs: profile.legalDocs
      ? {
          secpCertificate: toPrivateKycAssetView(profile.legalDocs.secpCertificate),
          ntnCertificate: toPrivateKycAssetView(profile.legalDocs.ntnCertificate),
          memorandum: toPrivateKycAssetView(profile.legalDocs.memorandum),
          articlesOfAssociation: toPrivateKycAssetView(profile.legalDocs.articlesOfAssociation),
          pastProjects: (profile.legalDocs.pastProjects ?? [])
            .map((p) => toPrivateKycAssetView(p))
            .filter(Boolean),
          // V6.4.5+ — CNIC images (URLs only)
          authorizedPersonCnicFrontImage: toPrivateKycAssetView(
            profile.legalDocs.authorizedPersonCnicFrontImage,
          ),
          authorizedPersonCnicBackImage: toPrivateKycAssetView(
            profile.legalDocs.authorizedPersonCnicBackImage,
          ),
        }
      : undefined,

    // Status & verification
    status: profile.status,
    isVerified: profile.isVerified,
    verificationLevel: profile.verificationLevel,
    verificationHistory: profile.verificationHistory ?? [],
    rejectionReason: profile.rejectionReason,
    infoRequiredReason: profile.infoRequiredReason,

    // Trust & badges
    trustScore: profile.trustScore,
    highriseScore: profile.highriseScore,
    badges: profile.badges ?? [],
    badgeHistory: profile.badgeHistory ?? [],

    // Stats
    completedProjectsCount: profile.completedProjectsCount ?? 0,
    activeProjectsCount: profile.activeProjectsCount ?? 0,
    averageRating: profile.averageRating ?? 0,
    totalReviews: profile.totalReviews ?? 0,
    onTimeDeliveryRate: profile.onTimeDeliveryRate,

    // V6.4.5+ — Full portfolio with all projects (verified + unverified)
    portfolio: {
      completedProjects: (profile.portfolio?.completedProjects ?? []).map((p) => ({
        _id:                    String(p._id ?? ""),
        projectName:            p.projectName,
        projectType:            p.projectType,
        city:                   p.city,
        area:                   p.area,
        location:               p.location,
        startYear:              p.startYear,
        completionYear:         p.completionYear,
        status:                 p.status,
        delayReason:            p.delayReason,
        expectedResolutionDate: p.expectedResolutionDate,
        totalUnits:             p.totalUnits,
        totalPlots:             p.totalPlots,
        totalArea:              p.totalArea,
        societyName:            p.societyName,
        description:            p.description,
        images:                 p.images,
        videoUrl:               p.videoUrl,
        virtualTourUrl:         p.virtualTourUrl,
        brochureUrl:            p.brochureUrl,
        isVerified:             p.isVerified,
        verifiedAt:             p.verifiedAt,
        verificationNotes:      p.verificationNotes,
        addedAt:                p.addedAt,
        updatedAt:              p.updatedAt,
      })),
    },

    // Premium
    isFeatured: profile.isFeatured,
    isPremiumPartner: profile.isPremiumPartner,
    premiumTier: profile.premiumTier,
    premiumUntil: profile.premiumUntil,

    // Analytics
    profileViews: profile.profileViews ?? 0,
    inquiryCount: profile.inquiryCount ?? 0,
    favoriteCount: profile.favoriteCount ?? 0,

    // SEO
    metaTitle: profile.metaTitle,
    metaDescription: profile.metaDescription,
    keywords: profile.keywords ?? [],
    canonicalUrl: profile.canonicalUrl,

    // Timestamps
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    lastActivityAt: profile.lastActivityAt,
  };
}

// ============================================
// HELPERS — Admin email notification
// ============================================

async function notifyAdminOfNewDeveloper(data: {
  companyName: string;
  email: string;
  city: string;
  developerType: string;
  profileId: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await sendEmail({
    to: adminEmail,
    subject: `New Developer Registration: ${data.companyName}`,
    html: `
      <h2>New Developer Profile Submitted</h2>
      <p>A new developer has registered on Highrise.pk and requires review.</p>
      <table>
        <tr><td><strong>Company:</strong></td><td>${data.companyName}</td></tr>
        <tr><td><strong>Type:</strong></td><td>${data.developerType}</td></tr>
        <tr><td><strong>City:</strong></td><td>${data.city}</td></tr>
        <tr><td><strong>Contact Email:</strong></td><td>${data.email}</td></tr>
        <tr><td><strong>Profile ID:</strong></td><td>${data.profileId}</td></tr>
      </table>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/developers/${data.profileId}">
          Review Profile →
        </a>
      </p>
    `,
    fromName: "Highrise.pk System",
  });
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);
  await dbConnect();

  const clientIp = getClientIp(req);

  // ════════════════════════════════════════
  // GET — Fetch profile
  // ════════════════════════════════════════
  if (req.method === "GET") {
    const rl = await rateLimitApi(req);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(rl.retryAfter));
      return void res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      });
    }

    const slug =
      typeof req.query.slug === "string" ? req.query.slug.trim() : "";

    // ── GET by slug — PUBLIC ──────────────────────────────────
    if (slug) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return void res.status(400).json({
          success: false,
          code: "INVALID_SLUG",
          message: "Invalid profile slug format.",
        });
      }

      const profile = await DeveloperProfile.findOne({
        slug,
        status: "approved",
        isDeleted: false,
      });

      if (!profile) {
        return void res.status(404).json({
          success: false,
          message: "Developer profile not found.",
        });
      }

      res.setHeader(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
      );

      return void res.status(200).json({
        success: true,
        data: toPublicProfile(profile),
      });
    }

    // ── GET own profile — PRIVATE ─────────────────────────────
    const auth = await requireAuth(req, res);
    if (!auth) return;

    setNoStore(res);

    const profile = await DeveloperProfile.findOne({
      user: auth.id,
      isDeleted: false,
    });

    if (!profile) {
      return void res.status(200).json({
        success: true,
        hasProfile: false,
        data: null,
      });
    }

    return void res.status(200).json({
      success: true,
      hasProfile: true,
      data: toPrivateProfile(profile),
    });
  }

  // ════════════════════════════════════════
  // POST — Create profile
  // ════════════════════════════════════════
  if (req.method === "POST") {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const rl = await rateLimitApiWrite(req);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(rl.retryAfter));
      return void res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      });
    }

    setNoStore(res);

    try {
      const body = req.body as CreateProfileBody;

      // ── 1. ONE PROFILE PER USER ───────────────────────────
      const existing = await DeveloperProfile.findOne({
        user: auth.id,
      }).lean();

      if (existing) {
        return void res.status(409).json({
          success: false,
          code: "PROFILE_EXISTS",
          message: "A developer profile already exists for this account.",
        });
      }

      // ── 2. REQUIRED FIELD VALIDATION ─────────────────────
      const {
        companyName,
        developerType,
        companyType,
        ntnNumber,
        secpNumber,
        phone,
        email,
        city,
        authorizedPersonName,
        authorizedPersonCNIC,
        authorizedPersonPhone,
        logo,
        legalDocs,
      } = body;

      const missingFields: string[] = [];
      if (!companyName?.trim())          missingFields.push("companyName");
      if (!developerType?.trim())        missingFields.push("developerType");
      if (!companyType?.trim())          missingFields.push("companyType");
      if (!ntnNumber?.trim())            missingFields.push("ntnNumber");
      if (!secpNumber?.trim())           missingFields.push("secpNumber");
      if (!phone?.trim())                missingFields.push("phone");
      if (!email?.trim())                missingFields.push("email");
      if (!city?.trim())                 missingFields.push("city");
      if (!authorizedPersonName?.trim()) missingFields.push("authorizedPersonName");

      // ── J.3.1: NTN Certificate mandatory ─────────────────
      if (!legalDocs?.ntnCertificate?.url) {
        missingFields.push("ntnCertificate");
      }
      // SECP Certificate also mandatory
      if (!legalDocs?.secpCertificate?.url) {
        missingFields.push("secpCertificate");
      }

      // ── J.3.3: CNIC images mandatory ─────────────────────
      if (!legalDocs?.authorizedPersonCnicFrontImage?.url) {
        missingFields.push("authorizedPersonCnicFrontImage");
      }
      if (!legalDocs?.authorizedPersonCnicBackImage?.url) {
        missingFields.push("authorizedPersonCnicBackImage");
      }

      if (missingFields.length > 0) {
        return void res.status(400).json({
          success: false,
          code: "MISSING_FIELDS",
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      // ── 3. VALIDATE KYC FORMAT ────────────────────────────
      const ntnResult = validateNtn(ntnNumber!);
      if (!ntnResult.isValid) {
        return void res.status(400).json({
          success: false,
          code: "INVALID_NTN",
          message: ntnResult.error ?? "Invalid NTN format",
        });
      }

      const secpResult = validateSecp(secpNumber!);
      if (!secpResult.isValid) {
        return void res.status(400).json({
          success: false,
          code: "INVALID_SECP",
          message: secpResult.error ?? "Invalid SECP number format",
        });
      }

      const phoneResult = validatePhone(phone!);
      if (!phoneResult.isValid) {
        return void res.status(400).json({
          success: false,
          code: "INVALID_PHONE",
          message: phoneResult.error ?? "Invalid phone number format",
        });
      }

      if (authorizedPersonCNIC) {
        const cnicResult = validateCnic(authorizedPersonCNIC);
        if (!cnicResult.isValid) {
          return void res.status(400).json({
            success: false,
            code: "INVALID_CNIC",
            message: cnicResult.error ?? "Invalid CNIC format",
          });
        }
      }

      if (authorizedPersonPhone) {
        const apPhoneResult = validatePhone(authorizedPersonPhone);
        if (!apPhoneResult.isValid) {
          return void res.status(400).json({
            success: false,
            code: "INVALID_AUTHORIZED_PHONE",
            message: apPhoneResult.error ?? "Invalid authorized person phone format",
          });
        }
      }

      // ── 4. DUPLICATE DETECTION ────────────────────────────
      const ntnHashValue  = hashNtn(ntnNumber!);
      const secpHashValue = hashSecp(secpNumber!);

      const [dupNTN, dupSECP] = await Promise.all([
        DeveloperProfile.findOne({
          ntnHash: ntnHashValue,
          isDeleted: false,
        }).lean(),
        DeveloperProfile.findOne({
          secpHash: secpHashValue,
          isDeleted: false,
        }).lean(),
      ]);

      if (dupNTN) {
        await logSecurityEvent({
          type: "kyc_submitted",
          severity: "high",
          userId: auth.id,
          ip: clientIp,
          metadata: {
            reason: "Duplicate NTN registration attempt",
            ntnHash: ntnHashValue,
          },
        });

        return void res.status(409).json({
          success: false,
          code: "DUPLICATE_NTN",
          message:
            "This NTN is already registered with another developer profile. If this is an error, contact support.",
        });
      }

      if (dupSECP) {
        await logSecurityEvent({
          type: "kyc_submitted",
          severity: "high",
          userId: auth.id,
          ip: clientIp,
          metadata: {
            reason: "Duplicate SECP registration attempt",
            secpHash: secpHashValue,
          },
        });

        return void res.status(409).json({
          success: false,
          code: "DUPLICATE_SECP",
          message:
            "This SECP number is already registered with another developer profile. If this is an error, contact support.",
        });
      }

      if (authorizedPersonCNIC) {
        const cnicHashValue = hashCnic(authorizedPersonCNIC);
        const dupCNIC = await DeveloperProfile.findOne({
          authorizedPersonCnicHash: cnicHashValue,
          isDeleted: false,
        }).lean();

        if (dupCNIC) {
          await logSecurityEvent({
            type: "kyc_submitted",
            severity: "high",
            userId: auth.id,
            ip: clientIp,
            metadata: {
              reason: "Duplicate authorized person CNIC registration attempt",
              cnicHash: cnicHashValue,
            },
          });

          return void res.status(409).json({
            success: false,
            code: "DUPLICATE_CNIC",
            message:
              "This CNIC is already registered as an authorized person for another developer profile.",
          });
        }
      }

      // ── 5. VALIDATE PRE-UPLOADED MEDIA REFS ──────────────
      if (logo && !isValidCloudinaryRef(logo)) {
        return void res.status(400).json({
          success: false,
          code: "INVALID_LOGO_REF",
          message: "Invalid logo reference. Upload via /api/upload first.",
        });
      }

      if (
        legalDocs?.secpCertificate &&
        !isValidCloudinaryRef(legalDocs.secpCertificate)
      ) {
        return void res.status(400).json({
          success: false,
          code: "INVALID_SECP_DOC",
          message: "Invalid SECP certificate reference.",
        });
      }

      if (
        legalDocs?.ntnCertificate &&
        !isValidCloudinaryRef(legalDocs.ntnCertificate)
      ) {
        return void res.status(400).json({
          success: false,
          code: "INVALID_NTN_DOC",
          message: "Invalid NTN certificate reference.",
        });
      }

      // V6.4.5+ — Validate CNIC image refs
      if (
        legalDocs?.authorizedPersonCnicFrontImage &&
        !isValidCloudinaryRef(legalDocs.authorizedPersonCnicFrontImage)
      ) {
        return void res.status(400).json({
          success: false,
          code: "INVALID_CNIC_FRONT",
          message: "Invalid CNIC front image reference.",
        });
      }

      if (
        legalDocs?.authorizedPersonCnicBackImage &&
        !isValidCloudinaryRef(legalDocs.authorizedPersonCnicBackImage)
      ) {
        return void res.status(400).json({
          success: false,
          code: "INVALID_CNIC_BACK",
          message: "Invalid CNIC back image reference.",
        });
      }

      // ── 6. VALIDATE establishedYear ───────────────────────
      const currentYear    = new Date().getFullYear();
      const establishedYear = Number(body.establishedYear);
      const safeYear =
        Number.isFinite(establishedYear) &&
        establishedYear > 1900 &&
        establishedYear <= currentYear
          ? establishedYear
          : currentYear;

      // ── 7. VALIDATE completedProjects (optional at creation)
      const validatedProjects: Partial<ICompletedProject>[] = [];

      if (body.portfolio?.completedProjects?.length) {
        if (body.portfolio.completedProjects.length > MAX_COMPLETED_PROJECTS) {
          return void res.status(400).json({
            success: false,
            code: "TOO_MANY_PROJECTS",
            message: `Maximum ${MAX_COMPLETED_PROJECTS} completed projects allowed.`,
          });
        }

        for (let i = 0; i < body.portfolio.completedProjects.length; i++) {
          const result = validateAndSanitizeProject(
            body.portfolio.completedProjects[i],
            i
          );
          if (!result.valid) {
            return void res.status(400).json({
              success: false,
              code: "INVALID_PROJECT",
              message: result.error,
            });
          }
          validatedProjects.push(result.project!);
        }
      }

      // ── 8. BUILD PROFILE DOCUMENT ─────────────────────────
      const newProfile = new DeveloperProfile({
        user: auth.id,
        developerType,
        companyName: companyName!.trim(),
        companyType: companyType!.trim(),
        establishedYear: safeYear,
        description: body.description?.trim(),
        tagline: body.tagline?.trim(),
        ceoName: body.ceoName?.trim(),

        ntnNumberMasked:  ntnNumber!.trim(),
        secpNumberMasked: secpNumber!.trim(),
        strnMasked:       body.strn?.trim(),

        email: email!.toLowerCase().trim(),
        website: body.website?.trim(),
        officeAddress: body.officeAddress?.trim(),
        city: city!.trim(),
        operatingCities: Array.isArray(body.operatingCities)
          ? body.operatingCities
          : [],
        serviceAreas: Array.isArray(body.serviceAreas)
          ? body.serviceAreas
          : [],

        authorizedPersonName: authorizedPersonName!.trim(),
        authorizedPersonEmail:
          body.authorizedPersonEmail?.toLowerCase().trim(),
        authorizedPersonDesignation:
          body.authorizedPersonDesignation?.trim(),
        // V6.4.5+: CNIC images uploaded → set level to documents_uploaded
        authorizedPersonVerificationLevel: "documents_uploaded",

        logo:       logo ?? undefined,
        coverImage: body.coverImage ?? undefined,
        socialLinks: body.socialLinks ?? {},

        legalDocs: {
          ...(legalDocs?.secpCertificate
            ? { secpCertificate: legalDocs.secpCertificate }
            : {}),
          ...(legalDocs?.ntnCertificate
            ? { ntnCertificate: legalDocs.ntnCertificate }
            : {}),
          ...(legalDocs?.memorandum
            ? { memorandum: legalDocs.memorandum }
            : {}),
          ...(legalDocs?.articlesOfAssociation
            ? { articlesOfAssociation: legalDocs.articlesOfAssociation }
            : {}),
          // V6.4.5+ — CNIC images
          ...(legalDocs?.authorizedPersonCnicFrontImage
            ? { authorizedPersonCnicFrontImage: legalDocs.authorizedPersonCnicFrontImage }
            : {}),
          ...(legalDocs?.authorizedPersonCnicBackImage
            ? { authorizedPersonCnicBackImage: legalDocs.authorizedPersonCnicBackImage }
            : {}),
        },

        // V6.4.5+ — Portfolio with validated projects
        portfolio: {
          completedProjects: validatedProjects,
        },

        status: "pending",
        isVerified: false,
        verificationLevel: "docs_pending",
        kycStatus: "pending",

        badges: [],
        auditTrail: [],
      });

      // Set raw carrier fields — pre-save encrypts and deletes
      newProfile._rawPhone = phone!.trim();
      if (body.whatsapp?.trim()) {
        newProfile._rawWhatsapp = body.whatsapp.trim();
      }
      if (authorizedPersonCNIC?.trim()) {
        newProfile._rawAuthorizedPersonCnic = authorizedPersonCNIC.trim();
      }
      if (authorizedPersonPhone?.trim()) {
        newProfile._rawAuthorizedPersonPhone = authorizedPersonPhone.trim();
      }

      // Save 1 — triggers pre-save: encrypt, hash, slug, SEO
      await newProfile.save();

      // ── 9. TRUST SCORE + BADGES + AUDIT ──────────────────
      await newProfile.calculateTrustScore();
      await newProfile.updateBadges();
      await newProfile.addAuditEntry(
        "developer_profile_created",
        new mongoose.Types.ObjectId(auth.id),
        {
          companyName:   companyName!.trim(),
          developerType,
          city:          city!.trim(),
          status:        "pending",
          projectCount:  validatedProjects.length,
        },
        clientIp,
      );

      // 🔒 Bypass KYC lock check on Save 2 — pre-save mutated the masked
      // fields during Save 1, which Mongoose still sees as "modified".
      // Without this override, Save 2 would re-enter the KYC encryption
      // block and throw "NTN/SECP locked" (kycLockedAt was set on Save 1).
      newProfile._kycOverride = true;

      // Save 2 — trust score + badges + audit trail
      await newProfile.save();

      // Clean up override flag (best practice — flag is per-request)
      delete newProfile._kycOverride;

      // ── 10. SECURITY EVENT LOG ────────────────────────────
      await logSecurityEvent({
        type: "developer_profile_created",
        severity: "low",
        userId: auth.id,
        ip: clientIp,
        metadata: {
          companyName:  companyName!.trim(),
          developerType,
          city:         city!.trim(),
          profileId:    String(newProfile._id),
          projectCount: validatedProjects.length,
        },
      });

      // ── 11. ADMIN NOTIFICATION — fire and forget ──────────
      void notifyAdminOfNewDeveloper({
        companyName:   companyName!.trim(),
        email:         email!.toLowerCase().trim(),
        city:          city!.trim(),
        developerType: developerType!,
        profileId:     String(newProfile._id),
      });

      return void res.status(201).json({
        success: true,
        message:
          "Developer profile created successfully. Your application is under review.",
        data: toPrivateProfile(newProfile),
      });

    } catch (err: unknown) {
      const isMongoError =
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "11000";

      if (isMongoError) {
        return void res.status(409).json({
          success: false,
          code: "DUPLICATE_ENTRY",
          message:
            "Duplicate registration detected. NTN or SECP number may already be registered.",
        });
      }

      await logSecurityEvent({
        type: "admin_action",
        severity: "high",
        ip: clientIp,
        metadata: {
          action: "developer_profile_create_error",
          reason: "Profile creation failed with server error",
          error:  err instanceof Error ? err.message : "Unknown error",
        },
      });

      return void res.status(500).json({
        success: false,
        message: "An error occurred. Please try again.",
      });
    }
  }

  // ════════════════════════════════════════
  // PUT — Update profile
  // ════════════════════════════════════════
  if (req.method === "PUT") {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const rl = await rateLimitApiWrite(req);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(rl.retryAfter));
      return void res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      });
    }

    setNoStore(res);

    try {
      const body = req.body as UpdateProfileBody;

      const profile = await DeveloperProfile.findOne({
        user: auth.id,
        isDeleted: false,
      });

      if (!profile) {
        return void res.status(404).json({
          success: false,
          message: "Developer profile not found.",
        });
      }

      if (profile.status === "suspended") {
        return void res.status(403).json({
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message:
            "Your account is suspended. Contact support at developers@highrise.pk.",
        });
      }

      const changes: Record<string, unknown> = {};

      // ── KYC COMPLETENESS GUARD (enterprise sync) ────────────
      // Prevents "empty success": a profile saved with documents but
      // WITHOUT registration numbers (the form-wipe aftermath). If a
      // number is absent from BOTH the stored profile AND this request,
      // reject with clear guidance instead of silently skipping.
      const kycMissing: string[] = [];
      if (!profile.ntnHash && !body.ntnNumber?.trim()) {
        kycMissing.push("NTN number");
      }
      if (!profile.secpHash && !body.secpNumber?.trim()) {
        kycMissing.push("SECP registration number");
      }
      if (
        !profile.authorizedPersonCnicHash &&
        !body.authorizedPersonCNIC?.trim()
      ) {
        kycMissing.push("Authorized person CNIC number");
      }
      if (kycMissing.length > 0) {
        return void res.status(400).json({
          success: false,
          code: "KYC_NUMBERS_MISSING",
          message: `Please provide: ${kycMissing.join(", ")}. Registration numbers are required for verification and cannot be left empty.`,
        });
      }

      // ── TEXT FIELDS ───────────────────────────────────────
      const textFields = [
        "companyName",
        "companyType",
        "developerType",
        "description",
        "tagline",
        "ceoName",
        "email",
        "officeAddress",
        "city",
        "website",
        "authorizedPersonName",
        "authorizedPersonEmail",
        "authorizedPersonDesignation",
        // V6.4.5+: SEO fields added to PUT
        "metaTitle",
        "metaDescription",
      ] as const;

      for (const field of textFields) {
        const incoming = body[field as keyof UpdateProfileBody];
        if (typeof incoming === "string" && incoming.trim() !== "") {
          const trimmed = incoming.trim();
          if (
            trimmed !==
            String(profile[field as keyof IDeveloperProfile] ?? "")
          ) {
            changes[field] = {
              from: profile[field as keyof IDeveloperProfile],
              to: trimmed,
            };
            (profile[field as keyof IDeveloperProfile] as unknown) = trimmed;
          }
        }
      }

      // ── SUBMIT FOR REVIEW ─────────────────────────────────
      // Sent by /developer/verify.tsx when developer clicks submit
      if ((body as UpdateProfileBody & { submitForReview?: boolean }).submitForReview === true) {
        if (profile.status === 'draft' || profile.status === 'rejected' || profile.status === 'info_required') {
          profile.status = 'pending';
          changes.submitForReview = { from: profile.status, to: 'pending' };
        } else {
          return void res.status(400).json({
            success: false,
            code: 'ALREADY_SUBMITTED',
            message: 'Profile is already submitted or approved.',
          });
        }
      }

      // ── ARRAYS ────────────────────────────────────────────
      if (Array.isArray(body.operatingCities)) {
        profile.operatingCities = body.operatingCities;
        changes.operatingCities = { updated: true };
      }

      if (Array.isArray(body.serviceAreas)) {
        profile.serviceAreas = body.serviceAreas;
        changes.serviceAreas = { updated: true };
      }

      // ── KYC FIELDS — respect lock ─────────────────────────
      if (body.ntnNumber?.trim()) {
        if (profile.kycLockedAt && !profile._kycOverride) {
          return void res.status(403).json({
            success: false,
            code: "KYC_LOCKED",
            message:
              "NTN cannot be changed after verification. Contact support if this is an error.",
          });
        }

        const ntnResult = validateNtn(body.ntnNumber);
        if (!ntnResult.isValid) {
          return void res.status(400).json({
            success: false,
            code: "INVALID_NTN",
            message: ntnResult.error ?? "Invalid NTN format",
          });
        }

        const newHash = hashNtn(body.ntnNumber);
        const dup = await DeveloperProfile.findOne({
          ntnHash: newHash,
          _id: { $ne: profile._id },
          isDeleted: false,
        }).lean();

        if (dup) {
          return void res.status(409).json({
            success: false,
            code: "DUPLICATE_NTN",
            message: "This NTN is already registered with another developer.",
          });
        }

        profile.ntnNumberMasked = body.ntnNumber.trim();
        changes.ntn = { updated: true };
      }

      if (body.secpNumber?.trim()) {
        if (profile.kycLockedAt && !profile._kycOverride) {
          return void res.status(403).json({
            success: false,
            code: "KYC_LOCKED",
            message:
              "SECP number cannot be changed after verification. Contact support.",
          });
        }

        const secpResult = validateSecp(body.secpNumber);
        if (!secpResult.isValid) {
          return void res.status(400).json({
            success: false,
            code: "INVALID_SECP",
            message: secpResult.error ?? "Invalid SECP number format",
          });
        }

        const newHash = hashSecp(body.secpNumber);
        const dup = await DeveloperProfile.findOne({
          secpHash: newHash,
          _id: { $ne: profile._id },
          isDeleted: false,
        }).lean();

        if (dup) {
          return void res.status(409).json({
            success: false,
            code: "DUPLICATE_SECP",
            message: "This SECP is already registered with another developer.",
          });
        }

        profile.secpNumberMasked = body.secpNumber.trim();
        changes.secp = { updated: true };
      }

      // ── ENCRYPTED CONTACT FIELDS ──────────────────────────
      if (body.phone?.trim()) {
        const result = validatePhone(body.phone);
        if (!result.isValid) {
          return void res.status(400).json({
            success: false,
            code: "INVALID_PHONE",
            message: result.error ?? "Invalid phone number format",
          });
        }

        const phoneHashValue = hashPhone(body.phone);
        const dupPhone = await DeveloperProfile.findOne({
          phoneHash: phoneHashValue,
          _id: { $ne: profile._id },
          isDeleted: false,
        }).lean();

        if (dupPhone) {
          return void res.status(409).json({
            success: false,
            code: "DUPLICATE_PHONE",
            message:
              "This phone number is already registered with another developer profile.",
          });
        }

        profile._rawPhone = body.phone.trim();
        changes.phone = { updated: true };
      }

      if (body.whatsapp?.trim()) {
        const result = validatePhone(body.whatsapp);
        if (!result.isValid) {
          return void res.status(400).json({
            success: false,
            code: "INVALID_WHATSAPP",
            message: result.error ?? "Invalid WhatsApp number format",
          });
        }
        profile._rawWhatsapp = body.whatsapp.trim();
        changes.whatsapp = { updated: true };
      }

      if (body.authorizedPersonCNIC?.trim()) {
        const result = validateCnic(body.authorizedPersonCNIC);
        if (!result.isValid) {
          return void res.status(400).json({
            success: false,
            code: "INVALID_CNIC",
            message: result.error ?? "Invalid CNIC format",
          });
        }

        const cnicHashValue = hashCnic(body.authorizedPersonCNIC);
        const dupCNIC = await DeveloperProfile.findOne({
          authorizedPersonCnicHash: cnicHashValue,
          _id: { $ne: profile._id },
          isDeleted: false,
        }).lean();

        if (dupCNIC) {
          return void res.status(409).json({
            success: false,
            code: "DUPLICATE_CNIC",
            message:
              "This CNIC is already registered as authorized person for another developer.",
          });
        }

        profile._rawAuthorizedPersonCnic = body.authorizedPersonCNIC.trim();
        changes.authorizedPersonCNIC = { updated: true };
      }

      if (body.authorizedPersonPhone?.trim()) {
        const result = validatePhone(body.authorizedPersonPhone);
        if (!result.isValid) {
          return void res.status(400).json({
            success: false,
            code: "INVALID_AUTHORIZED_PHONE",
            message: result.error ?? "Invalid authorized person phone format",
          });
        }
        profile._rawAuthorizedPersonPhone = body.authorizedPersonPhone.trim();
        changes.authorizedPersonPhone = { updated: true };
      }

      // ── MEDIA ─────────────────────────────────────────────
      if (body.logo && isValidCloudinaryRef(body.logo)) {
        profile.logo = body.logo;
        changes.logo = { updated: true };
      }

      if (body.coverImage && isValidCloudinaryRef(body.coverImage)) {
        profile.coverImage = body.coverImage;
        changes.coverImage = { updated: true };
      }

      // ── LEGAL DOCS ────────────────────────────────────────
      if (body.legalDocs) {
        if (!profile.legalDocs) {
          profile.legalDocs = {};
        }
        if (
          body.legalDocs.secpCertificate &&
          isValidCloudinaryRef(body.legalDocs.secpCertificate)
        ) {
          profile.legalDocs.secpCertificate = body.legalDocs.secpCertificate;
          changes.secpCertificate = { updated: true };
        }
        if (
          body.legalDocs.ntnCertificate &&
          isValidCloudinaryRef(body.legalDocs.ntnCertificate)
        ) {
          profile.legalDocs.ntnCertificate = body.legalDocs.ntnCertificate;
          changes.ntnCertificate = { updated: true };
        }
        if (
          body.legalDocs.memorandum &&
          isValidCloudinaryRef(body.legalDocs.memorandum)
        ) {
          profile.legalDocs.memorandum = body.legalDocs.memorandum;
          changes.memorandum = { updated: true };
        }
        if (
          body.legalDocs.articlesOfAssociation &&
          isValidCloudinaryRef(body.legalDocs.articlesOfAssociation)
        ) {
          profile.legalDocs.articlesOfAssociation =
            body.legalDocs.articlesOfAssociation;
          changes.articlesOfAssociation = { updated: true };
        }
        // V6.4.5+ — CNIC images
        if (
          body.legalDocs.authorizedPersonCnicFrontImage &&
          isValidCloudinaryRef(body.legalDocs.authorizedPersonCnicFrontImage)
        ) {
          profile.legalDocs.authorizedPersonCnicFrontImage =
            body.legalDocs.authorizedPersonCnicFrontImage;
          changes.cnicFrontImage = { updated: true };

          // Bump verification level when images uploaded
          if (
            profile.authorizedPersonVerificationLevel === "unverified" &&
            profile.legalDocs.authorizedPersonCnicBackImage?.url
          ) {
            profile.authorizedPersonVerificationLevel = "documents_uploaded";
          }
        }
        if (
          body.legalDocs.authorizedPersonCnicBackImage &&
          isValidCloudinaryRef(body.legalDocs.authorizedPersonCnicBackImage)
        ) {
          profile.legalDocs.authorizedPersonCnicBackImage =
            body.legalDocs.authorizedPersonCnicBackImage;
          changes.cnicBackImage = { updated: true };

          // Bump verification level when both images uploaded
          if (
            profile.authorizedPersonVerificationLevel === "unverified" &&
            profile.legalDocs.authorizedPersonCnicFrontImage?.url
          ) {
            profile.authorizedPersonVerificationLevel = "documents_uploaded";
          }
        }
      }

      // ── SOCIAL LINKS ──────────────────────────────────────
      if (body.socialLinks && typeof body.socialLinks === "object") {
        profile.socialLinks = {
          ...profile.socialLinks,
          ...body.socialLinks,
        };
        changes.socialLinks = { updated: true };
      }

      // ── ESTABLISHED YEAR ──────────────────────────────────
      if (body.establishedYear !== undefined) {
        const yr = Number(body.establishedYear);
        if (
          Number.isFinite(yr) &&
          yr > 1900 &&
          yr <= new Date().getFullYear()
        ) {
          profile.establishedYear = yr;
          changes.establishedYear = { updated: true };
        }
      }

      // ── V6.4.5+: COMPLETED PROJECTS ───────────────────────
      if (body.portfolio?.completedProjects !== undefined) {
        const incomingProjects = body.portfolio.completedProjects;

        if (incomingProjects.length > MAX_COMPLETED_PROJECTS) {
          return void res.status(400).json({
            success: false,
            code: "TOO_MANY_PROJECTS",
            message: `Maximum ${MAX_COMPLETED_PROJECTS} completed projects allowed.`,
          });
        }

        // Build map of existing projects by _id (to preserve verification status)
        const existingProjectMap = new Map<
          string,
          ICompletedProject
        >();

        if (profile.portfolio?.completedProjects) {
          for (const p of profile.portfolio.completedProjects) {
            if (p._id) {
              existingProjectMap.set(String(p._id), p);
            }
          }
        }

        const updatedProjects: Partial<ICompletedProject>[] = [];

        for (let i = 0; i < incomingProjects.length; i++) {
          const input = incomingProjects[i];
          const result = validateAndSanitizeProject(input, i);

          if (!result.valid) {
            return void res.status(400).json({
              success: false,
              code: "INVALID_PROJECT",
              message: result.error,
            });
          }

          const sanitized = result.project!;

          // Preserve admin-set verification fields for existing projects
          if (input._id) {
            const existing = existingProjectMap.get(input._id);
            if (existing) {
              // ⚠️ SECURITY: Always preserve admin-set verification data
              // Developer CANNOT modify these fields
              sanitized.isVerified       = existing.isVerified;
              sanitized.verifiedBy       = existing.verifiedBy;
              sanitized.verifiedAt       = existing.verifiedAt;
              sanitized.verificationNotes = existing.verificationNotes;
              sanitized.rejectionReason  = existing.rejectionReason;
              sanitized.addedAt          = existing.addedAt;
              // Update timestamp
              sanitized.updatedAt = new Date();
            }
          }

          updatedProjects.push(sanitized);
        }

        if (!profile.portfolio) {
          profile.portfolio = { completedProjects: [] };
        }
        profile.portfolio.completedProjects =
          updatedProjects as ICompletedProject[];
        changes.completedProjects = {
          count: updatedProjects.length,
          updated: true,
        };
      }

      // ── NO CHANGES CHECK ──────────────────────────────────
      if (Object.keys(changes).length === 0) {
        return void res.status(200).json({
          success: true,
          message: "No changes detected.",
          data: toPrivateProfile(profile),
        });
      }

      // Save 1 — field changes + KYC encryption via pre-save
      await profile.save();

      // Trust score + badges + audit — combined into Save 2
      await profile.calculateTrustScore();
      await profile.updateBadges();
      await profile.addAuditEntry(
        "developer_profile_updated",
        new mongoose.Types.ObjectId(auth.id),
        changes,
        clientIp,
      );

      // 🔒 Bypass KYC lock check on Save 2 — pre-save mutated the masked
      // fields during Save 1, which Mongoose still sees as "modified".
      // Without this override, Save 2 would throw "NTN/SECP locked".
      profile._kycOverride = true;

      // Save 2 — trust + badges + audit trail
      await profile.save();

      // Clean up override flag (best practice — flag is per-request)
      delete profile._kycOverride;

      await logSecurityEvent({
        type: "kyc_submitted",
        severity: "low",
        userId: auth.id,
        ip: clientIp,
        metadata: {
          reason:        "Developer profile updated",
          changedFields: Object.keys(changes),
          profileId:     String(profile._id),
        },
      });

      return void res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        data: toPrivateProfile(profile),
      });

    } catch (err: unknown) {
      const isMongoError =
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "11000";

      if (isMongoError) {
        return void res.status(409).json({
          success: false,
          code: "DUPLICATE_ENTRY",
          message:
            "Duplicate entry detected. This NTN, SECP, or phone may already be registered.",
        });
      }

      return void res.status(500).json({
        success: false,
        message: "An error occurred. Please try again.",
      });
    }
  }

  // ════════════════════════════════════════
  // METHOD NOT ALLOWED
  // ════════════════════════════════════════
  res.setHeader("Allow", ["GET", "POST", "PUT"]);
  return void res.status(405).json({
    success: false,
    message: `Method ${req.method ?? "unknown"} not allowed.`,
  });
}