// ========== FILE: pages/api/onboarding/business.ts ==========
// 🔒 ENTERPRISE AGENT ONBOARDING API - HIGHRISE.PK
// V5.8.0 — Aligned with form payload | KYC fields fixed | onboardingStatus sync
// Creates AgentProfile (status: pending) + flips User.onboardingStatus
// Developer onboarding → /api/onboarding/developer (separate)
// Society onboarding → /api/onboarding/society (separate)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";
import crypto from "crypto";

import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApi, setRateLimitHeaders } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";
import {
  agentOnboardingConfirmationTemplate,
  adminNewAgentApplicationTemplate,
} from "@/lib/email-templates";

import User from "@/models/User";
import AgentProfile from "@/models/AgentProfile";
import DeveloperProfile from "@/models/DeveloperProfile";

import {
  validatePhone,
  validateLicense,
  validateNtn,
  validateCnic,
  normalizeLicense,
  normalizeNtn,
  normalizePhone,
  normalizeCnic,
  hashPhone,
  hashLicense,
  hashNtn,
  hashCnic,
  encryptPhone,
  encryptLicense,
  encryptNtn,
  encryptCnic,
} from "@/lib/kycCrypto";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  message: string;
  requestId?: string;
  data?: {
    profileId: string;
    status: string;
  };
}

// ✅ FIXED: matches actual User schema field names
interface UserLean {
  _id: Types.ObjectId;
  role: string;
  status: string;
  isDeleted: boolean;
  isVerified: boolean;                 // ✅ was: isEmailVerified
  email: string;
  name: string;
  cnicHash?: string | null;
  cnicEnc?: string | null;
  cnicLockedAt?: Date | null;          // ✅ was: cnicLocked
  onboardingStatus?: string;
  onboardingRole?: string | null;
}

// Form payload shape (from pages/onboarding/business.tsx)
interface OnboardingPayload {
  // V6.8.2: Identity Verification (when user has no CNIC yet)
  cnicNumber?: string;
  cnicFullName?: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;

  // Identity
  displayName?: string;
  agentType?: string;
  agencyName?: string;
  agencySize?: string;                 // V6.8.4: solo|small|medium|large (agency only)
  tagline?: string;
  about?: string;

  // V6.8.4: Branding (profile photo required, agency logo optional)
  profilePhotoUrl?: string;
  agencyLogoUrl?: string;

  // Contact
  phone?: string;
  whatsapp?: string;
  orgEmail?: string;
  orgWebsite?: string;

  // Location
  city?: string;
  officeAddress?: string;

  // Representative
  repName?: string;
  repRole?: string;

  // Specialization
  specializations?: string[];
  languages?: string[];                // V6.8.4: Languages spoken
  experience?: { years?: number | string };

  // Service areas (nested)
  serviceAreas?: { localities?: string[]; cities?: string[] };

  // Compliance
  companyRegNo?: string;
  ntnNo?: string;
  licenseNumber?: string;
  licenseDocumentUrl?: string;

  // Social (nested)
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };

  // Consent
  agree?: boolean;
}

const ALLOWED_SPECIALIZATIONS = [
  "residential",
  "commercial",
  "plots",
  "rental",
  "luxury",
  "industrial",
  "all",
] as const;

const ALLOWED_AGENT_TYPES = ["individual", "agency", "freelance"] as const;

// V6.8.4: Agency size options — must match AgentProfile.agencySize enum
const ALLOWED_AGENCY_SIZES = ["solo", "small", "medium", "large"] as const;

// V6.8.4: Supported languages (matches form dropdown)
const ALLOWED_LANGUAGES = [
  "urdu", "english", "punjabi", "sindhi",
  "pashto", "balochi", "saraiki", "arabic",
] as const;

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

function safeEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase().slice(0, 120);
}

function safeUrl(v: unknown): string {
  const s = String(v ?? "").trim().slice(0, 200);
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function safeStringArray(v: unknown, maxItems = 20, maxLen = 200): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((x) => x.slice(0, maxLen));
}

function safeInt(
  v: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

  // ── Method guard ────────────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return void res
      .status(405)
      .json({ success: false, message: "Method not allowed", requestId });
  }

  // ── Rate limiting ──────────────────────────────────────────
  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    await logSecurityEvent({
      type: "rate_limit_exceeded",
      severity: "medium",
      req,
      metadata: {
        endpoint: "/api/onboarding/business",
        errorMessage: "Agent onboarding rate limit exceeded",
      },
    });
    return void res.status(429).json({
      success: false,
      message: "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  // ── Authentication ─────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    await dbConnect();

    // ✅ FIXED: + prefix forces select on schema-select:false fields
    //          uses cnicLockedAt (not cnicLocked)
    //          uses isVerified (not isEmailVerified)
    const user = await User.findById(auth.id)
      .select(
        "email name role status isDeleted isVerified cnicLockedAt onboardingStatus onboardingRole +cnicHash +cnicEnc"
      )
      .lean<UserLean>();

    if (!user) {
      return void res.status(401).json({
        success: false,
        message: "Unauthorized",
        requestId,
      });
    }

    // ══════════════════════════════════════════════════════════
    // ELIGIBILITY CHECKS
    // ══════════════════════════════════════════════════════════

    // 1. Email must be verified
    if (!user.isVerified) {
      await logSecurityEvent({
        type: "permission_denied",
        severity: "low",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage: "Onboarding attempt with unverified email",
          endpoint: "/api/onboarding/business",
        },
      });
      return void res.status(403).json({
        success: false,
        message:
          "Please verify your email address before completing onboarding.",
        requestId,
      });
    }

    // 2. Account must be active and not deleted
    if (user.isDeleted || user.status !== "active") {
      await logSecurityEvent({
        type: "permission_denied",
        severity: "medium",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage: "Onboarding attempt on inactive or deleted account",
          status: user.status,
          isDeleted: user.isDeleted,
        },
      });
      return void res.status(403).json({
        success: false,
        message: "Account is not eligible for onboarding.",
        requestId,
      });
    }

    // 3. Must be a plain user
    const currentRole = String(user.role ?? "").toLowerCase();
    if (currentRole !== "user") {
      return void res.status(409).json({
        success: false,
        message:
          currentRole === "agent"
            ? "You already have an agent profile."
            : currentRole === "developer"
            ? "You are registered as a developer. Use the developer onboarding."
            : currentRole === "society"
            ? "You are registered as a society. Use the society onboarding."
            : "Your account role does not require onboarding.",
        requestId,
      });
    }

    // 4. ✅ NEW: Block duplicate submissions
    if (user.onboardingStatus === "pending") {
      return void res.status(409).json({
        success: false,
        message:
          "Your application is already under review. Please wait for admin approval.",
        requestId,
      });
    }

    if (user.onboardingStatus === "approved") {
      return void res.status(409).json({
        success: false,
        message: "Your application has already been approved.",
        requestId,
      });
    }

    // 5. V6.8.2: Identity check — determine if user needs to provide CNIC now
    const userHasLockedCnic = Boolean(user.cnicLockedAt) && Boolean(user.cnicHash);
    const body = (req.body ?? {}) as OnboardingPayload;

    // Extract CNIC fields from payload (may be provided if user has no CNIC yet)
    const providedCnicNumber   = String(body.cnicNumber ?? "").trim();
    const providedCnicFullName = String(body.cnicFullName ?? "").trim();
    const providedCnicFrontUrl = String(body.cnicFrontUrl ?? "").trim();
    const providedCnicBackUrl  = String(body.cnicBackUrl ?? "").trim();

    // Track whether we need to process new CNIC data
    const needsCnicProcessing = !userHasLockedCnic;

    if (needsCnicProcessing) {
      // User doesn't have CNIC yet — must provide it in this submission
      if (!providedCnicNumber || !providedCnicFullName || !providedCnicFrontUrl || !providedCnicBackUrl) {
        return void res.status(400).json({
          success: false,
          message: "Identity verification is required. Please provide CNIC number, full name, and both CNIC images.",
          requestId,
        });
      }

      // Validate CNIC number format
      const cnicValidation = validateCnic(providedCnicNumber);
      if (!cnicValidation.isValid) {
        return void res.status(400).json({
          success: false,
          message: `Invalid CNIC: ${cnicValidation.error ?? "Must be 13 digits (e.g., 35202-1234567-8)"}`,
          requestId,
        });
      }

      // Validate CNIC URLs are from our upload endpoint
      if (!providedCnicFrontUrl.includes("cloudinary.com") || !providedCnicBackUrl.includes("cloudinary.com")) {
        return void res.status(400).json({
          success: false,
          message: "CNIC images must be uploaded through Highrise.pk. Please upload again.",
          requestId,
        });
      }

      // Validate full name length
      if (providedCnicFullName.length < 3 || providedCnicFullName.length > 100) {
        return void res.status(400).json({
          success: false,
          message: "CNIC full name must be between 3 and 100 characters.",
          requestId,
        });
      }
    }

    // ══════════════════════════════════════════════════════════
    // PARSE & SANITIZE — matches form payload structure
    // (body already declared above in identity check block)
    // ══════════════════════════════════════════════════════════

    // Identity
    const displayName = safeText(body.displayName, 80);
    const agentType = safeText(body.agentType, 20).toLowerCase();
    const agencyName = safeText(body.agencyName, 100);
    const tagline = safeText(body.tagline, 80);
    const about = safeText(body.about, 500);

    // Contact
    const phoneRaw = safeText(body.phone, 20);
    const whatsappRaw = safeText(body.whatsapp, 20);
    const orgEmail = safeEmail(body.orgEmail);
    const orgWebsite = safeUrl(body.orgWebsite);

    // Location
    const city = safeText(body.city, 60);
    const officeAddress = safeText(body.officeAddress, 200);

    // Representative
    const repName = safeText(body.repName, 80);
    const repRole = safeText(body.repRole, 60);

    // Specializations
    const rawSpecializations = safeStringArray(body.specializations, 6, 50);
    const specializations = rawSpecializations
      .map((s) => s.toLowerCase())
      .filter((s): s is (typeof ALLOWED_SPECIALIZATIONS)[number] =>
        (ALLOWED_SPECIALIZATIONS as readonly string[]).includes(s)
      );

    // Experience (nested → flat)
    const experienceYears = safeInt(body.experience?.years, 0, 50, 0);

    // Service areas (nested)
    const serviceLocalities = safeStringArray(
      body.serviceAreas?.localities,
      20,
      100
    );

    // Compliance
    const companyRegNo = safeText(body.companyRegNo, 40);
    const ntnRaw = safeText(body.ntnNo, 20);
    const licenseRaw = safeText(body.licenseNumber, 60);
    const licenseDocumentUrl = safeUrl(body.licenseDocumentUrl);

    // Social (nested)
    const facebookUrl = safeUrl(body.socialLinks?.facebook);
    const instagramUrl = safeUrl(body.socialLinks?.instagram);
    const linkedinUrl = safeUrl(body.socialLinks?.linkedin);

    // V6.8.4: Branding URLs (profile photo REQUIRED, logo optional)
    // Must be Cloudinary URLs from our /api/upload endpoint
    const profilePhotoUrl = safeText(body.profilePhotoUrl, 500);
    const agencyLogoUrl   = safeText(body.agencyLogoUrl,   500);

    // V6.8.4: Agency size (only relevant if agentType === 'agency')
    const agencySize = safeText(body.agencySize, 20).toLowerCase();

    // V6.8.4: Languages — filter to whitelist
    const rawLanguages = safeStringArray(body.languages, 10, 30);
    const languages = rawLanguages
      .map((l) => l.toLowerCase())
      .filter((l): l is (typeof ALLOWED_LANGUAGES)[number] =>
        (ALLOWED_LANGUAGES as readonly string[]).includes(l)
      );

    // Consent
    const agree = body.agree === true;

    // ══════════════════════════════════════════════════════════
    // MANDATORY FIELD VALIDATION
    // ══════════════════════════════════════════════════════════

    if (!displayName) {
      return void res.status(400).json({
        success: false,
        message: "Display name is required.",
        requestId,
      });
    }

    if (!ALLOWED_AGENT_TYPES.includes(agentType as never)) {
      return void res.status(400).json({
        success: false,
        message: "Please select a valid agent type.",
        requestId,
      });
    }

    if (!city) {
      return void res.status(400).json({
        success: false,
        message: "City is required.",
        requestId,
      });
    }

    if (!phoneRaw) {
      return void res.status(400).json({
        success: false,
        message: "Business phone number is required.",
        requestId,
      });
    }

    if (!officeAddress) {
      return void res.status(400).json({
        success: false,
        message: "Office address is required.",
        requestId,
      });
    }

    if (specializations.length === 0) {
      return void res.status(400).json({
        success: false,
        message: "Please select at least one specialization.",
        requestId,
      });
    }

    if (!companyRegNo && !ntnRaw) {
      return void res.status(400).json({
        success: false,
        message:
          "Please provide either Company Registration No or NTN number.",
        requestId,
      });
    }

    if (!licenseRaw) {
      return void res.status(400).json({
        success: false,
        message:
          "Property dealer / agency license number is required for agents.",
        requestId,
      });
    }

    if (!licenseDocumentUrl) {
      return void res.status(400).json({
        success: false,
        message: "Please upload your verification document.",
        requestId,
      });
    }

    // V6.8.4: Profile photo is REQUIRED for public trust
    if (!profilePhotoUrl) {
      return void res.status(400).json({
        success: false,
        message: "Please upload a profile photo. This appears on your public profile.",
        requestId,
      });
    }

    // V6.8.4: Validate profile photo URL is from Cloudinary
    if (!profilePhotoUrl.includes("cloudinary.com")) {
      return void res.status(400).json({
        success: false,
        message: "Profile photo must be uploaded through Highrise.pk. Please upload again.",
        requestId,
      });
    }

    // V6.8.4: Agency logo — validate URL if provided
    if (agencyLogoUrl && !agencyLogoUrl.includes("cloudinary.com")) {
      return void res.status(400).json({
        success: false,
        message: "Agency logo must be uploaded through Highrise.pk. Please upload again.",
        requestId,
      });
    }

    // V6.8.4: If agency type, agency name + size are REQUIRED
    if (agentType === "agency") {
      if (!agencyName) {
        return void res.status(400).json({
          success: false,
          message: "Agency name is required for agency accounts.",
          requestId,
        });
      }
      if (!agencySize || !(ALLOWED_AGENCY_SIZES as readonly string[]).includes(agencySize)) {
        return void res.status(400).json({
          success: false,
          message: "Please select a valid agency size (solo, small, medium, or large).",
          requestId,
        });
      }
    }

    // V6.8.4: At least one language must be selected
    if (languages.length === 0) {
      return void res.status(400).json({
        success: false,
        message: "Please select at least one language you speak.",
        requestId,
      });
    }

    if (!agree) {
      return void res.status(400).json({
        success: false,
        message: "You must agree to the terms to continue.",
        requestId,
      });
    }

    // ══════════════════════════════════════════════════════════
    // KYC FIELD VALIDATION
    // ══════════════════════════════════════════════════════════

    const phoneValidation = validatePhone(phoneRaw);
    if (!phoneValidation.isValid) {
      return void res.status(400).json({
        success: false,
        message: `Invalid phone number: ${
          phoneValidation.error ??
          "Please use Pakistani mobile format (e.g. 0300-1234567)"
        }`,
        requestId,
      });
    }

    // Validate WhatsApp if provided (else fall back to phone)
    let whatsappToStore = phoneRaw;
    if (whatsappRaw) {
      const waValidation = validatePhone(whatsappRaw);
      if (!waValidation.isValid) {
        return void res.status(400).json({
          success: false,
          message: `Invalid WhatsApp number: ${
            waValidation.error ?? "Please use Pakistani mobile format"
          }`,
          requestId,
        });
      }
      whatsappToStore = whatsappRaw;
    }

    const normalizedLicense = normalizeLicense(licenseRaw);
    const licenseValidation = validateLicense(normalizedLicense);
    if (!licenseValidation.isValid) {
      return void res.status(400).json({
        success: false,
        message: `Invalid license number: ${
          licenseValidation.error ??
          "License must be 5-30 alphanumeric characters"
        }`,
        requestId,
      });
    }

    let normalizedNtn = "";
    if (ntnRaw) {
      normalizedNtn = normalizeNtn(ntnRaw);
      const ntnValidation = validateNtn(normalizedNtn);
      if (!ntnValidation.isValid) {
        return void res.status(400).json({
          success: false,
          message: `Invalid NTN: ${
            ntnValidation.error ??
            "NTN must be 7 digits with optional letter suffix"
          }`,
          requestId,
        });
      }
      normalizedNtn = ntnValidation.normalized ?? normalizedNtn;
    }

    // ══════════════════════════════════════════════════════════
    // DUPLICATE PROFILE CHECK
    // ══════════════════════════════════════════════════════════

    const existingProfile = await AgentProfile.findOne({
      user: user._id,
      isDeleted: false,
    })
      .select("_id status")
      .lean();

    if (existingProfile) {
      return void res.status(409).json({
        success: false,
        message:
          "An onboarding application already exists for your account. Please contact support if you believe this is an error.",
        requestId,
      });
    }

    // ══════════════════════════════════════════════════════════
    // V6.8.2: PROCESS CNIC (from payload OR from existing user)
    // ══════════════════════════════════════════════════════════

    let cnicHash: string;
    let cnicEnc: string;
    let normalizedCnicNumber = "";

    if (needsCnicProcessing) {
      // Process new CNIC from payload
      normalizedCnicNumber = normalizeCnic(providedCnicNumber);
      cnicHash = hashCnic(normalizedCnicNumber);
      cnicEnc  = encryptCnic(normalizedCnicNumber);
    } else {
      // Use existing CNIC from user record
      if (!user.cnicHash || !user.cnicEnc) {
        return void res.status(500).json({
          success: false,
          message: "CNIC data integrity error. Please contact support with this request ID.",
          requestId,
        });
      }
      cnicHash = user.cnicHash;
      cnicEnc  = user.cnicEnc;
    }

    // ══════════════════════════════════════════════════════════
    // CROSS-COLLECTION UNIQUENESS CHECKS
    // ══════════════════════════════════════════════════════════

    const licenseHash = hashLicense(normalizedLicense);
    const normalizedPhone = normalizePhone(phoneRaw) ?? phoneRaw;
    const phoneHash = hashPhone(normalizedPhone);
    const ntnHash = normalizedNtn ? hashNtn(normalizedNtn) : null;

    const uniquenessChecks = await Promise.all([
      AgentProfile.findOne({ cnicHash, isDeleted: false }).select("_id").lean(),
      DeveloperProfile.findOne({
        authorizedPersonCnicHash: cnicHash,
        isDeleted: false,
      })
        .select("_id")
        .lean(),
      AgentProfile.findOne({ licenseHash, isDeleted: false })
        .select("_id")
        .lean(),
      AgentProfile.findOne({ phoneHash, isDeleted: false })
        .select("_id")
        .lean(),
      ntnHash
        ? AgentProfile.findOne({ ntnHash, isDeleted: false })
            .select("_id")
            .lean()
        : Promise.resolve(null),
      ntnHash
        ? DeveloperProfile.findOne({ ntnHash, isDeleted: false })
            .select("_id")
            .lean()
        : Promise.resolve(null),
    ]);

    const [
      cnicInAgent,
      cnicInDeveloper,
      licenseConflict,
      phoneConflict,
      ntnInAgent,
      ntnInDeveloper,
    ] = uniquenessChecks;

    if (cnicInAgent || cnicInDeveloper) {
      await logSecurityEvent({
        type: "suspicious_activity",
        severity: "high",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage: "Duplicate CNIC detected during agent onboarding",
          conflict: cnicInAgent ? "agent_profile" : "developer_profile",
        },
      });
      return void res.status(409).json({
        success: false,
        message:
          "Your identity document (CNIC) is already associated with another profile. If you believe this is an error, please contact support.",
        requestId,
      });
    }

    if (licenseConflict) {
      await logSecurityEvent({
        type: "suspicious_activity",
        severity: "high",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage:
            "Duplicate license number detected during agent onboarding",
          field: "licenseHash",
        },
      });
      return void res.status(409).json({
        success: false,
        message:
          "This license number is already registered on Highrise.pk. Each license number must be unique. Please verify your license details or contact support.",
        requestId,
      });
    }

    if (phoneConflict) {
      await logSecurityEvent({
        type: "suspicious_activity",
        severity: "medium",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage:
            "Duplicate phone number detected during agent onboarding",
          field: "phoneHash",
        },
      });
      return void res.status(409).json({
        success: false,
        message:
          "This phone number is already registered with another agent profile.",
        requestId,
      });
    }

    if (ntnInAgent || ntnInDeveloper) {
      await logSecurityEvent({
        type: "suspicious_activity",
        severity: "high",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage: "Duplicate NTN detected during agent onboarding",
          conflict: ntnInAgent ? "agent_profile" : "developer_profile",
        },
      });
      return void res.status(409).json({
        success: false,
        message:
          "This NTN is already associated with another profile. Each NTN must be unique.",
        requestId,
      });
    }

    // ══════════════════════════════════════════════════════════
    // ENCRYPT KYC FIELDS
    // ══════════════════════════════════════════════════════════

    const phoneEncrypted = encryptPhone(normalizedPhone);
    const whatsappEncrypted = encryptPhone(
      normalizePhone(whatsappToStore) ?? whatsappToStore
    );
    const licenseEncrypted = encryptLicense(normalizedLicense);
    const ntnEncrypted = normalizedNtn ? encryptNtn(normalizedNtn) : undefined;

    // ══════════════════════════════════════════════════════════
    // CREATE AGENTPROFILE
    // ══════════════════════════════════════════════════════════

    const now = new Date();

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)
        ?.split(",")[0]
        ?.trim() ?? req.socket.remoteAddress ?? "unknown";

    const profileData: Record<string, unknown> = {
      user: new Types.ObjectId(String(user._id)),
      displayName,
      email: user.email,
      agentType,
      agencyName: agencyName || undefined,
      // V6.8.4: Agency size (only if agency type)
      ...(agentType === "agency" && agencySize && { agencySize }),
      city,
      operatingCities: [city],

      // CNIC (reused from User — locked at signup)
      cnicEncrypted: cnicEnc,
      cnicHash,
      cnicVerified: false,

      // License
      licenseEncrypted,
      licenseHash,
      licenseVerified: false,
      licenseIssuer: repRole || "Self-declared",
      licenseDocumentUrl,

      // V6.8.4: Documents structure — CNIC + License + Profile Photo + Cover Photo
      // Admin UI reads from AgentProfile.documents.*
      // Cover photo NOT set here (agent adds later from /agent/profile edit page)
      documents: {
        // Identity documents
        cnicFront: providedCnicFrontUrl
          ? {
              url:        providedCnicFrontUrl,
              publicId:   "",
              uploadedAt: now,
            }
          : undefined,
        cnicBack: providedCnicBackUrl
          ? {
              url:        providedCnicBackUrl,
              publicId:   "",
              uploadedAt: now,
            }
          : undefined,
        license: licenseDocumentUrl
          ? {
              url:        licenseDocumentUrl,
              publicId:   "",
              uploadedAt: now,
              issuer:     repRole || "Self-declared",
            }
          : undefined,
        // V6.8.4: Profile photo (REQUIRED — validated above)
        profilePhoto: {
          url:        profilePhotoUrl,
          publicId:   "",
          uploadedAt: now,
        },
      },

      // V6.8.4: Agency logo (top-level field, only if agency type + logo provided)
      ...(agentType === "agency" && agencyLogoUrl && {
        agencyLogo: {
          url:      agencyLogoUrl,
          publicId: "",
        },
      }),

      // NTN (optional)
      ...(ntnEncrypted && { ntnEncrypted }),
      ...(ntnHash && { ntnHash }),
      ...(companyRegNo && { companyRegNo }),

      // Phone + WhatsApp
      phoneEncrypted,
      phoneHash,
      whatsappEncrypted,

      // Profile
      tagline: tagline || undefined,
      about: about || undefined,
      experience: {
        years: experienceYears,
        totalDeals: 0,
        totalValue: 0,
      },
      serviceAreas: {
        cities: [city],
        localities: serviceLocalities,
      },
      specializations,

      // V6.8.4: Languages spoken (validated above)
      languages,

      socialLinks: {
        ...(facebookUrl && { facebook: facebookUrl }),
        ...(instagramUrl && { instagram: instagramUrl }),
        ...(linkedinUrl && { linkedin: linkedinUrl }),
        ...(orgWebsite && { website: orgWebsite }),
      },

      ...(orgEmail && orgEmail !== user.email && { contactEmail: orgEmail }),
      ...(repName && { representativeName: repName }),
      ...(repRole && { representativeRole: repRole }),

      // Office
      officeVerification: {
        address: officeAddress,
        city,
        isActive: true,
      },

      // Status — pending until admin approves
      status: "pending",
      verificationLevel: "not_verified",
      submittedForReviewAt: now,

      // Defaults
      isAvailable: true,
      isDeleted: false,
      isPremium: false,
      isFeatured: false,
      badges: [],
      memberSince: now,
      auditTrail: [
        {
          action: "onboarding_submitted",
          performedBy: new Types.ObjectId(String(user._id)),
          performedAt: now,
          changes: {
            status: "pending",
            agencyName: agencyName || displayName,
            city,
            hasProfilePhoto: Boolean(profilePhotoUrl),
            hasAgencyLogo:   Boolean(agencyLogoUrl),
            languageCount:   languages.length,
          },
          ipAddress,
        },
      ],
    };

    const agentProfile = new AgentProfile(profileData);
    await agentProfile.save();

    const profileId = String(agentProfile._id);

    // ══════════════════════════════════════════════════════════
    // V6.8.2: UPDATE USER — Save CNIC (if new) + Onboarding State
    // Bumps tokenVersion → forces JWT refresh → dashboard reflects changes
    // ══════════════════════════════════════════════════════════

    const userDoc = await User.findById(user._id).select("+cnicEnc +cnicHash");
    if (!userDoc) {
      throw new Error("User record disappeared during onboarding");
    }

    // Save CNIC data if this is first-time submission
    if (needsCnicProcessing) {
      // CRITICAL: Set override BEFORE modifying any CNIC field
      // The pre-save hook checks _kycOverride to allow CNIC changes
      (userDoc as unknown as { _kycOverride?: boolean })._kycOverride = true;

      // Set all CNIC-related fields
      userDoc.cnic         = normalizedCnicNumber;
      userDoc.cnicName     = providedCnicFullName;
      userDoc.cnicEnc      = cnicEnc;
      userDoc.cnicHash     = cnicHash;
      userDoc.cnicFrontUrl = providedCnicFrontUrl;
      userDoc.cnicBackUrl  = providedCnicBackUrl;
      userDoc.cnicLockedAt = now;
      userDoc.cnicStatus   = "pending";
      userDoc.cnicVerified = false;
    }

    // Update onboarding state (always)
    userDoc.onboardingStatus       = "pending";
    userDoc.onboardingRole         = "agent";
    userDoc.onboardingSubmittedAt  = now;
    userDoc.tokenVersion           = (userDoc.tokenVersion ?? 0) + 1;

    try {
      await userDoc.save();
    } catch (saveError: unknown) {
      throw saveError;  // Re-throw to trigger main error handler
    }

    // ══════════════════════════════════════════════════════════
    // AUDIT LOG
    // ══════════════════════════════════════════════════════════

    await logSecurityEvent({
      type: "agent_profile_created",
      severity: "low",
      userId: String(user._id),
      req,
      metadata: {
        profileId,
        agencyName: agencyName || displayName,
        city,
        agentType,
        agencySize:          agentType === "agency" ? agencySize : "n/a",
        hasLicense:          true,
        hasLicenseDocument:  Boolean(licenseDocumentUrl),
        hasProfilePhoto:     Boolean(profilePhotoUrl),      // V6.8.4
        hasAgencyLogo:       Boolean(agencyLogoUrl),        // V6.8.4
        hasNtn:              Boolean(normalizedNtn),
        hasCompanyReg:       Boolean(companyRegNo),
        specializationCount: specializations.length,
        languageCount:       languages.length,              // V6.8.4
        status:              "pending",
      },
    });

    // ══════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS (fire-and-forget)
    // ══════════════════════════════════════════════════════════

    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
    const adminEmail =
      process.env.ADMIN_EMAIL ?? process.env.EMAIL_USER ?? "";

    void sendEmail({
      to: user.email,
      subject: agentOnboardingConfirmationTemplate.subject,
      html: agentOnboardingConfirmationTemplate.html({
        agentName: escapeHtml(user.name ?? displayName),
        agencyName: escapeHtml(agencyName || displayName),
        profileId,
        submittedAt: now.toISOString(),
        supportUrl: `${siteUrl}/contact`,
      }),
      fromName: "Highrise.pk Verification",
    }).catch(() => {
      // Silent fail — never block API for email errors
    });

    if (adminEmail) {
      void sendEmail({
        to: adminEmail,
        subject: `🔔 New Agent Application: ${
          agencyName || displayName
        } — Action Required`,
        html: adminNewAgentApplicationTemplate.html({
          agentName: escapeHtml(user.name ?? displayName),
          agencyName: escapeHtml(agencyName || displayName),
          agentEmail: escapeHtml(user.email),
          city: escapeHtml(city),
          agentType,
          profileId,
          submittedAt: now.toISOString(),
          licenseNumber: licenseRaw,
          ntnNo: normalizedNtn || "",
          reviewUrl: `${siteUrl}/admin/agents`,
          hasLicense: true,
          hasNtn: Boolean(normalizedNtn),
        }),
        fromName: "Highrise.pk Alerts",
      }).catch(() => {
        // Silent fail
      });
    }

    // ══════════════════════════════════════════════════════════
    // SUCCESS RESPONSE
    // ══════════════════════════════════════════════════════════

    return void res.status(201).json({
      success: true,
      message:
        "Application submitted successfully. Our team will review your details within 1-3 business days. You will receive an email notification upon approval.",
      requestId,
      data: {
        profileId,
        status: "pending",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    await logSecurityEvent({
      type: "system_error",
      severity: "high",
      userId: auth?.id,
      req,
      metadata: {
        errorMessage: message,
        endpoint: "/api/onboarding/business",
      },
    }).catch(() => {
      /* never throw from error handler */
    });

    return void res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred. Please try again or contact support.",
      requestId,
      // Include error message in dev mode only for debugging
      ...(process.env.NODE_ENV === "development" && { debug: message }),
    });
  }
}

// ========== END OF FILE ==========