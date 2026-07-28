// pages/api/onboarding/developer.ts
// 🔒 ENTERPRISE DEVELOPER ONBOARDING API - HIGHRISE.PK
// V5.9.0 — Mirrors business.ts patterns exactly
// Creates DeveloperProfile (status: pending) + flips User.onboardingStatus
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";
import crypto from "crypto";

import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApi, setRateLimitHeaders } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendEmail } from "@/lib/email";

import User from "@/models/User";
import AgentProfile from "@/models/AgentProfile";
import DeveloperProfile from "@/models/DeveloperProfile";

import {
  validatePhone,
  validateNtn,
  validateSecp,
  validateCnic,
  normalizePhone,
  normalizeNtn,
  hashCnic,
  hashPhone,
  hashNtn,
  hashSecp,
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

interface UserLean {
  _id: Types.ObjectId;
  role: string;
  status: string;
  isDeleted: boolean;
  isVerified: boolean;
  email: string;
  name: string;
  cnicHash?: string | null;
  cnicEnc?: string | null;
  cnicLockedAt?: Date | null;
  onboardingStatus?: string;
  onboardingRole?: string | null;
}

interface DeveloperPayload {
  // Company identity
  developerType?: string;            // builder | developer | society | corporate | individual
  companyName?: string;
  companyType?: string;
  establishedYear?: number | string;
  tagline?: string;
  description?: string;
  ceoName?: string;

  // Compliance numbers
  ntnNumber?: string;
  secpNumber?: string;

  // Authorized person
  authorizedPersonName?: string;
  authorizedPersonCnic?: string;
  authorizedPersonPhone?: string;
  authorizedPersonEmail?: string;
  authorizedPersonDesignation?: string;

  // Contact
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;

  // Location
  city?: string;
  officeAddress?: string;
  operatingCities?: string[];
  serviceAreas?: string[];

  // Legal documents (Cloudinary asset shape)
  secpCertificateUrl?: string;
  secpCertificatePublicId?: string;
  ntnCertificateUrl?: string;
  ntnCertificatePublicId?: string;
  pastProjects?: Array<{ url: string; public_id: string }>;

  // Consent
  agree?: boolean;
}

const ALLOWED_DEVELOPER_TYPES = [
  "builder",
  "developer",
  "society",
  "corporate",
  "individual",
] as const;

// Types where SECP is REQUIRED
const SECP_REQUIRED_TYPES = new Set(["developer", "corporate", "society"]);

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
  const s = String(v ?? "").trim().slice(0, 500);
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function safeStringArray(v: unknown, maxItems = 20, maxLen = 100): string[] {
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

function safeCloudinaryAssetArray(
  v: unknown,
  maxItems = 5
): Array<{ url: string; public_id: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (item): item is { url: string; public_id: string } =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as { url?: unknown }).url === "string" &&
        typeof (item as { public_id?: unknown }).public_id === "string"
    )
    .map((item) => ({
      url: safeUrl(item.url),
      public_id: safeText(item.public_id, 200),
    }))
    .filter((a) => a.url && a.public_id)
    .slice(0, maxItems);
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
        endpoint: "/api/onboarding/developer",
        errorMessage: "Developer onboarding rate limit exceeded",
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
          errorMessage:
            "Developer onboarding attempt with unverified email",
          endpoint: "/api/onboarding/developer",
        },
      });
      return void res.status(403).json({
        success: false,
        message:
          "Please verify your email address before completing onboarding.",
        requestId,
      });
    }

    // 2. Account active
    if (user.isDeleted || user.status !== "active") {
      await logSecurityEvent({
        type: "permission_denied",
        severity: "medium",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage:
            "Developer onboarding attempt on inactive or deleted account",
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
          currentRole === "developer"
            ? "You already have a developer profile."
            : currentRole === "agent"
            ? "You are registered as an agent. Use the agent onboarding."
            : currentRole === "society"
            ? "You are registered as a society. Use the society onboarding."
            : "Your account role does not require onboarding.",
        requestId,
      });
    }

    // 4. Block duplicate submissions
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

    // 5. CNIC must be locked
    const hasCnic =
      Boolean(user.cnicLockedAt) &&
      Boolean(user.cnicHash) &&
      Boolean(user.cnicEnc);

    if (!hasCnic) {
      await logSecurityEvent({
        type: "permission_denied",
        severity: "medium",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage:
            "Developer onboarding attempted without CNIC verification",
          endpoint: "/api/onboarding/developer",
        },
      });
      return void res.status(403).json({
        success: false,
        message:
          "CNIC verification is required before completing developer onboarding. Please complete your identity verification first.",
        requestId,
      });
    }

    // ══════════════════════════════════════════════════════════
    // PARSE & SANITIZE
    // ══════════════════════════════════════════════════════════

    const body = (req.body ?? {}) as DeveloperPayload;

    // Company identity
    const developerType = safeText(body.developerType, 20).toLowerCase();
    const companyName = safeText(body.companyName, 150);
    const companyType = safeText(body.companyType, 100);
    const establishedYear = safeInt(
      body.establishedYear,
      1900,
      new Date().getFullYear(),
      new Date().getFullYear()
    );
    const tagline = safeText(body.tagline, 200);
    const description = safeText(body.description, 2000);
    const ceoName = safeText(body.ceoName, 100);

    // Compliance
    const ntnRaw = safeText(body.ntnNumber, 20);
    const secpRaw = safeText(body.secpNumber, 30);

    // Authorized person
    const authorizedPersonName = safeText(body.authorizedPersonName, 100);
    const authorizedPersonCnicRaw = safeText(body.authorizedPersonCnic, 15);
    const authorizedPersonPhoneRaw = safeText(body.authorizedPersonPhone, 20);
    const authorizedPersonEmail = safeEmail(body.authorizedPersonEmail);
    const authorizedPersonDesignation = safeText(
      body.authorizedPersonDesignation,
      100
    );

    // Contact
    const phoneRaw = safeText(body.phone, 20);
    const whatsappRaw = safeText(body.whatsapp, 20);
    const companyEmail = safeEmail(body.email) || user.email;
    const website = safeUrl(body.website);

    // Location
    const city = safeText(body.city, 60);
    const officeAddress = safeText(body.officeAddress, 200);
    const operatingCities = safeStringArray(body.operatingCities, 20, 60);
    const serviceAreas = safeStringArray(body.serviceAreas, 30, 100);

    // Legal documents
    const secpCertificateUrl = safeUrl(body.secpCertificateUrl);
    const secpCertificatePublicId = safeText(body.secpCertificatePublicId, 200);
    const ntnCertificateUrl = safeUrl(body.ntnCertificateUrl);
    const ntnCertificatePublicId = safeText(body.ntnCertificatePublicId, 200);
    const pastProjects = safeCloudinaryAssetArray(body.pastProjects, 5);

    // Consent
    const agree = body.agree === true;

    // ══════════════════════════════════════════════════════════
    // MANDATORY FIELD VALIDATION
    // ══════════════════════════════════════════════════════════

    if (!ALLOWED_DEVELOPER_TYPES.includes(developerType as never)) {
      return void res.status(400).json({
        success: false,
        message: "Please select a valid developer type.",
        requestId,
      });
    }

    if (!companyName || companyName.length < 3) {
      return void res.status(400).json({
        success: false,
        message: "Company name is required (minimum 3 characters).",
        requestId,
      });
    }

    if (!companyType) {
      return void res.status(400).json({
        success: false,
        message:
          "Company type is required (e.g. Pvt Ltd, Partnership, Proprietorship).",
        requestId,
      });
    }

    if (!city) {
      return void res.status(400).json({
        success: false,
        message: "Primary city is required.",
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

    if (!phoneRaw) {
      return void res.status(400).json({
        success: false,
        message: "Company phone number is required.",
        requestId,
      });
    }

    if (!authorizedPersonName) {
      return void res.status(400).json({
        success: false,
        message: "Authorized person name is required.",
        requestId,
      });
    }

    if (!authorizedPersonCnicRaw) {
      return void res.status(400).json({
        success: false,
        message: "Authorized person CNIC is required.",
        requestId,
      });
    }

    if (!authorizedPersonDesignation) {
      return void res.status(400).json({
        success: false,
        message: "Authorized person designation is required.",
        requestId,
      });
    }

    // NTN is REQUIRED for all developer types (FBR mandate)
    if (!ntnRaw) {
      return void res.status(400).json({
        success: false,
        message:
          "NTN number is required for all developers (FBR registration mandate).",
        requestId,
      });
    }

    if (!ntnCertificateUrl || !ntnCertificatePublicId) {
      return void res.status(400).json({
        success: false,
        message: "NTN certificate document is required.",
        requestId,
      });
    }

    // SECP required for corporate/developer/society types
    if (SECP_REQUIRED_TYPES.has(developerType)) {
      if (!secpRaw) {
        return void res.status(400).json({
          success: false,
          message:
            "SECP registration number is required for corporate developers.",
          requestId,
        });
      }
      if (!secpCertificateUrl || !secpCertificatePublicId) {
        return void res.status(400).json({
          success: false,
          message:
            "SECP certificate document is required for corporate developers.",
          requestId,
        });
      }
    }

    if (pastProjects.length === 0) {
      return void res.status(400).json({
        success: false,
        message:
          "Please upload at least one past project document or portfolio.",
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

    const authorizedPersonPhoneValidation = authorizedPersonPhoneRaw
      ? validatePhone(authorizedPersonPhoneRaw)
      : { isValid: true, error: undefined };

    if (!authorizedPersonPhoneValidation.isValid) {
      return void res.status(400).json({
        success: false,
        message: `Invalid authorized person phone: ${
          authorizedPersonPhoneValidation.error ?? "Invalid format"
        }`,
        requestId,
      });
    }

    const cnicValidation = validateCnic(authorizedPersonCnicRaw);
    if (!cnicValidation.isValid) {
      return void res.status(400).json({
        success: false,
        message: `Invalid authorized person CNIC: ${
          cnicValidation.error ?? "Must be 13 digits"
        }`,
        requestId,
      });
    }

    const normalizedNtn = normalizeNtn(ntnRaw);
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

    let normalizedSecp = "";
    if (secpRaw) {
      const secpValidation = validateSecp(secpRaw);
      if (!secpValidation.isValid) {
        return void res.status(400).json({
          success: false,
          message: `Invalid SECP number: ${
            secpValidation.error ?? "Invalid SECP format"
          }`,
          requestId,
        });
      }
      normalizedSecp = secpRaw.trim();
    }

    // ══════════════════════════════════════════════════════════
    // DUPLICATE PROFILE CHECK
    // ══════════════════════════════════════════════════════════

    const existingProfile = await DeveloperProfile.findOne({
      user: user._id,
      isDeleted: false,
    })
      .select("_id status")
      .lean();

    if (existingProfile) {
      return void res.status(409).json({
        success: false,
        message:
          "A developer profile already exists for your account. Please contact support if you believe this is an error.",
        requestId,
      });
    }

    // ══════════════════════════════════════════════════════════
    // CROSS-COLLECTION UNIQUENESS CHECKS
    // ══════════════════════════════════════════════════════════

    if (!user.cnicHash || !user.cnicEnc) {
      return void res.status(500).json({
        success: false,
        message:
          "CNIC data integrity error. Please contact support with this request ID.",
        requestId,
      });
    }

    const userCnicHash = user.cnicHash;
    const authorizedCnicHash = hashCnic(authorizedPersonCnicRaw);
    const normalizedPhone = normalizePhone(phoneRaw) ?? phoneRaw;
    const phoneHashValue = hashPhone(normalizedPhone);
    const ntnHashValue = hashNtn(normalizedNtn);
    const secpHashValue = normalizedSecp ? hashSecp(normalizedSecp) : null;

    const uniquenessChecks = await Promise.all([
      // User's own CNIC against existing developer profiles
      DeveloperProfile.findOne({
        authorizedPersonCnicHash: userCnicHash,
        isDeleted: false,
      })
        .select("_id")
        .lean(),
      // User's own CNIC against agent profiles
      AgentProfile.findOne({ cnicHash: userCnicHash, isDeleted: false })
        .select("_id")
        .lean(),
      // Authorized person CNIC against developer profiles (if different from user)
      authorizedCnicHash !== userCnicHash
        ? DeveloperProfile.findOne({
            authorizedPersonCnicHash: authorizedCnicHash,
            isDeleted: false,
          })
            .select("_id")
            .lean()
        : Promise.resolve(null),
      // Phone against developer profiles
      DeveloperProfile.findOne({ phoneHash: phoneHashValue, isDeleted: false })
        .select("_id")
        .lean(),
      // NTN against developer profiles
      DeveloperProfile.findOne({ ntnHash: ntnHashValue, isDeleted: false })
        .select("_id")
        .lean(),
      // NTN against agent profiles
      AgentProfile.findOne({ ntnHash: ntnHashValue, isDeleted: false })
        .select("_id")
        .lean(),
      // SECP against developer profiles (only if SECP provided)
      secpHashValue
        ? DeveloperProfile.findOne({
            secpHash: secpHashValue,
            isDeleted: false,
          })
            .select("_id")
            .lean()
        : Promise.resolve(null),
    ]);

    const [
      userCnicInDeveloper,
      userCnicInAgent,
      authCnicInDeveloper,
      phoneConflict,
      ntnInDeveloper,
      ntnInAgent,
      secpConflict,
    ] = uniquenessChecks;

    if (userCnicInDeveloper || userCnicInAgent || authCnicInDeveloper) {
      await logSecurityEvent({
        type: "suspicious_activity",
        severity: "high",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage: "Duplicate CNIC detected during developer onboarding",
          conflict: userCnicInAgent
            ? "user_cnic_in_agent"
            : userCnicInDeveloper
            ? "user_cnic_in_developer"
            : "authorized_cnic_in_developer",
        },
      });
      return void res.status(409).json({
        success: false,
        message:
          "An identity document (CNIC) provided is already associated with another profile. Please contact support if you believe this is an error.",
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
            "Duplicate phone number detected during developer onboarding",
          field: "phoneHash",
        },
      });
      return void res.status(409).json({
        success: false,
        message:
          "This phone number is already registered with another developer profile.",
        requestId,
      });
    }

    if (ntnInDeveloper || ntnInAgent) {
      await logSecurityEvent({
        type: "suspicious_activity",
        severity: "high",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage: "Duplicate NTN detected during developer onboarding",
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

    if (secpConflict) {
      await logSecurityEvent({
        type: "suspicious_activity",
        severity: "high",
        userId: String(user._id),
        req,
        metadata: {
          errorMessage:
            "Duplicate SECP registration detected during developer onboarding",
          field: "secpHash",
        },
      });
      return void res.status(409).json({
        success: false,
        message:
          "This SECP registration number is already associated with another developer profile.",
        requestId,
      });
    }

    // ══════════════════════════════════════════════════════════
    // CREATE DEVELOPER PROFILE
    // ══════════════════════════════════════════════════════════

    const now = new Date();

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)
        ?.split(",")[0]
        ?.trim() ?? req.socket.remoteAddress ?? "unknown";

    // Build profile via new + save (so pre-save middleware runs encryption)
    const profile = new DeveloperProfile({
      user: new Types.ObjectId(String(user._id)),
      developerType,
      companyName,
      companyType,
      establishedYear,
      tagline: tagline || undefined,
      description: description || undefined,
      ceoName: ceoName || undefined,

      // Compliance — masked fields hold RAW values temporarily;
      // pre-save middleware encrypts + hashes + replaces with masked
      ntnNumberMasked: normalizedNtn,
      ...(normalizedSecp && { secpNumberMasked: normalizedSecp }),

      // Authorized person — raw fields trigger pre-save encryption
      authorizedPersonName,
      authorizedPersonEmail: authorizedPersonEmail || undefined,
      authorizedPersonDesignation,

      // Contact
      email: companyEmail,
      website: website || undefined,
      city,
      operatingCities: operatingCities.length > 0 ? operatingCities : [city],
      serviceAreas,
      officeAddress,

      // Legal documents
      legalDocs: {
        ntnCertificate: {
          url: ntnCertificateUrl,
          public_id: ntnCertificatePublicId,
        },
        ...(secpCertificateUrl && secpCertificatePublicId && {
          secpCertificate: {
            url: secpCertificateUrl,
            public_id: secpCertificatePublicId,
          },
        }),
        pastProjects,
      },

      // Status — pending until admin approves
      status: "pending",
      verificationLevel: "docs_pending",
      kycStatus: "pending",

      // Defaults
      isVerified: false,
      isDeleted: false,
      badges: [],
      completedProjectsCount: 0,
      activeProjectsCount: 0,
      averageRating: 0,
      totalReviews: 0,
      favoriteCount: 0,
      inquiryCount: 0,
      shareCount: 0,
      profileViews: 0,

      auditTrail: [
        {
          action: "developer_onboarding_submitted",
          performedBy: new Types.ObjectId(String(user._id)),
          performedAt: now,
          changes: {
            status: "pending",
            companyName,
            city,
            developerType,
          },
          ipAddress,
        },
      ],
    });

    // Set raw fields for pre-save encryption (typed via IRawFieldsCarrier)
    profile._rawPhone = normalizedPhone;
    profile._rawWhatsapp =
      normalizePhone(whatsappToStore) ?? whatsappToStore;
    profile._rawAuthorizedPersonCnic = authorizedPersonCnicRaw;
    if (authorizedPersonPhoneRaw) {
      profile._rawAuthorizedPersonPhone =
        normalizePhone(authorizedPersonPhoneRaw) ?? authorizedPersonPhoneRaw;
    }

    await profile.save();

    const profileId = String(profile._id);

    // ══════════════════════════════════════════════════════════
    // UPDATE USER ONBOARDING STATE + BUMP TOKEN VERSION
    // ══════════════════════════════════════════════════════════

    const userDoc = await User.findById(user._id);
    if (userDoc) {
      userDoc.onboardingStatus = "pending";
      userDoc.onboardingRole = "developer";
      userDoc.onboardingSubmittedAt = now;
      userDoc.tokenVersion = (userDoc.tokenVersion ?? 0) + 1;
      await userDoc.save();
    }

    // ══════════════════════════════════════════════════════════
    // AUDIT LOG
    // ══════════════════════════════════════════════════════════

    await logSecurityEvent({
      type: "developer_profile_created",
      severity: "low",
      userId: String(user._id),
      req,
      metadata: {
        profileId,
        companyName,
        city,
        developerType,
        hasNtn: Boolean(normalizedNtn),
        hasSecp: Boolean(normalizedSecp),
        hasNtnDoc: Boolean(ntnCertificateUrl),
        hasSecpDoc: Boolean(secpCertificateUrl),
        pastProjectsCount: pastProjects.length,
        status: "pending",
      },
    });

    // ══════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS (fire-and-forget)
    // ══════════════════════════════════════════════════════════

    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
    const adminEmail =
      process.env.ADMIN_EMAIL ?? process.env.EMAIL_USER ?? "";

    // Confirmation to applicant
    void sendEmail({
      to: user.email,
      subject: "✅ Developer Application Received — Highrise.pk",
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;padding:24px;">
          <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
            <h2 style="color:#004063;margin:0 0 16px;">Application Under Review</h2>
            <p style="color:#333;font-size:15px;line-height:1.6;">
              Assalam-u-Alaikum <strong>${escapeHtml(user.name ?? authorizedPersonName)}</strong>,
            </p>
            <p style="color:#333;font-size:15px;line-height:1.6;">
              We have received your developer application for
              <strong>${escapeHtml(companyName)}</strong>. Our compliance team will
              review your submission within <strong>1-3 business days</strong>.
            </p>
            <div style="background:#f0f9fb;border-left:4px solid #029bba;padding:16px;margin:24px 0;border-radius:6px;">
              <p style="margin:0;color:#004063;font-weight:600;">What happens next?</p>
              <ul style="color:#475569;font-size:14px;margin:8px 0 0;padding-left:20px;line-height:1.8;">
                <li>SECP & NTN document verification</li>
                <li>Authorized person CNIC verification</li>
                <li>Past projects portfolio review</li>
                <li>Email notification on approval/feedback</li>
              </ul>
            </div>
            <p style="color:#666;font-size:13px;">
              Application ID: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${profileId}</code>
            </p>
            <a href="${siteUrl}/dashboard"
               style="display:inline-block;background:#029bba;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
              Back to Dashboard
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px;">
            Highrise.pk — Pakistan's Verified Property Platform
          </p>
        </div>
      `,
      fromName: "Highrise.pk Verification",
    }).catch(() => {
      // Silent fail
    });

    // Notification to admin
    if (adminEmail) {
      void sendEmail({
        to: adminEmail,
        subject: `🏗️ New Developer Application: ${companyName} — Action Required`,
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;padding:24px;">
            <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
              <h2 style="color:#004063;margin:0 0 16px;">New Developer Application</h2>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:8px;color:#666;">Company:</td><td style="padding:8px;font-weight:600;">${escapeHtml(companyName)}</td></tr>
                <tr><td style="padding:8px;color:#666;">Type:</td><td style="padding:8px;">${escapeHtml(developerType)}</td></tr>
                <tr><td style="padding:8px;color:#666;">City:</td><td style="padding:8px;">${escapeHtml(city)}</td></tr>
                <tr><td style="padding:8px;color:#666;">Email:</td><td style="padding:8px;">${escapeHtml(user.email)}</td></tr>
                <tr><td style="padding:8px;color:#666;">Authorized Person:</td><td style="padding:8px;">${escapeHtml(authorizedPersonName)} (${escapeHtml(authorizedPersonDesignation)})</td></tr>
                <tr><td style="padding:8px;color:#666;">NTN Provided:</td><td style="padding:8px;">${normalizedNtn ? "Yes ✓" : "No"}</td></tr>
                <tr><td style="padding:8px;color:#666;">SECP Provided:</td><td style="padding:8px;">${normalizedSecp ? "Yes ✓" : "Not required"}</td></tr>
                <tr><td style="padding:8px;color:#666;">Past Projects:</td><td style="padding:8px;">${pastProjects.length} document(s)</td></tr>
              </table>
              <a href="${siteUrl}/admin/developers"
                 style="display:inline-block;background:#029bba;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:24px;">
                Review Application →
              </a>
            </div>
          </div>
        `,
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
        endpoint: "/api/onboarding/developer",
      },
    }).catch(() => {
      /* never throw from error handler */
    });

    return void res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred. Please try again or contact support.",
      requestId,
    });
  }
}