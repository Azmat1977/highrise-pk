// models/DeveloperProfile.ts
// ═══════════════════════════════════════════════════════════════
// DEVELOPER PROFILE MODEL — Highrise.pk V6.4.5+
// 🔒 ENTERPRISE-GRADE SECURITY — Production Ready
// Extended profile for users with role: 'developer'
// ═══════════════════════════════════════════════════════════════
// ✅ NTN Encryption (AES-256-GCM)
// ✅ SECP Encryption (AES-256-GCM)
// ✅ Authorized Person CNIC Encryption
// ✅ Phone Numbers Encryption
// ✅ Hash-based Duplicate Prevention (NTN + SECP + CNIC + Phone)
// ✅ KYC Lock — submitted KYC cannot be changed without override
// ✅ Badge Hierarchy System (12 tiers)
// ✅ Trust Score Algorithm (6-factor breakdown)
// ✅ Audit Trail (last 100 entries, IP tracked)
// ✅ Soft Delete with reason + actor logging
// ✅ Progressive Onboarding (draft → pending → approved)
// ✅ Pakistan Compliance (FBR NTN, SECP, NADRA CNIC)
// ✅ Anti-fraud: same NTN/SECP/CNIC cannot register twice
// ✅ V6.4.5+: CompletedProjects portfolio (verified by admin)
// ✅ V6.4.5+: CNIC front/back image upload for authorized person
// ✅ V6.4.5+: Authorized person verification level tracking
// ═══════════════════════════════════════════════════════════════

import mongoose, {
  Schema,
  Document,
  Types,
  Model,
  QueryWithHelpers,
} from "mongoose";
import crypto from "crypto";
import {
  encryptCnic,
  decryptCnic,
  hashCnic,
  encryptPhone,
  decryptPhone,
  hashPhone,
  encryptNtn,
  decryptNtn,
  hashNtn,
  encryptSecp,
  decryptSecp,
  hashSecp,
  maskCnic,
  maskPhone,
  maskNtn,
  maskSecp,
  validateCnic,
  validatePhone,
  validateNtn,
  validateSecp,
} from "@/lib/kycCrypto";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type DeveloperType =
  | "builder"
  | "developer"
  | "society"
  | "corporate"
  | "individual";

export type DeveloperStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "info_required";

export type KycStatus = "none" | "pending" | "verified" | "rejected";

export type VerificationLevel =
  | "not_verified"
  | "docs_pending"
  | "docs_verified"
  | "site_verified"
  | "fully_verified";

export type AuthorizedPersonVerificationLevel =
  | "unverified"
  | "documents_uploaded"
  | "basic_verified"
  | "fully_verified";

export type RiskLevel = "low" | "medium" | "high";

export type DeveloperBadge =
  | "startup"
  | "emerging"
  | "established"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "highrise_verified"
  | "top_developer"
  | "trusted_builder"
  | "on_time_delivery"
  | "premium_partner";

export type CompletedProjectType =
  | "residential_society"
  | "commercial_society"
  | "highrise_building"
  | "mixed_use"
  | "townhouse_complex"
  | "gated_community"
  | "housing_scheme"
  | "farmhouse_society"
  | "commercial_plaza"
  | "shopping_mall";

export type CompletedProjectStatus =
  | "completed"
  | "under_construction"
  | "ready_for_possession"
  | "delayed"
  | "on_hold";

// ============================================
// SUB-DOCUMENT INTERFACES
// ============================================

export interface ICloudinaryAsset {
  url: string;
  public_id: string;
}

export interface IGalleryItem extends ICloudinaryAsset {
  caption?: string;
  category?: "office" | "team" | "event" | "project" | "award";
  uploadedAt?: Date;
}

export interface ISocialLinks {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
  website?: string;
}

// ── Completed Project (V6.4.5+) ──────────────────────────────

export interface ICompletedProject {
  _id?: Types.ObjectId;

  // Basic Info
  projectName: string;
  projectType: CompletedProjectType;

  // Location
  city: string;
  area: string;
  location?: string;

  // Timeline
  startYear?: number;
  completionYear: number;

  // Status with Transparency
  status: CompletedProjectStatus;
  delayReason?: string;              // Required if delayed/on_hold
  expectedResolutionDate?: string;

  // Details
  totalUnits?: number;
  totalPlots?: number;
  totalArea?: string;
  societyName?: string;
  description?: string;              // Max 500 chars

  // Media
  images: string[];                  // 1-5 Cloudinary URLs (required)
  videoUrl?: string;                 // YouTube/Vimeo only
  virtualTourUrl?: string;
  brochureUrl?: string;

  // Admin Verification — developer can NEVER set these
  isVerified: boolean;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  verificationNotes?: string;
  rejectionReason?: string;

  // Timestamps
  addedAt: Date;
  updatedAt: Date;
}

export interface ILegalDocs {
  secpCertificate?: ICloudinaryAsset;
  ntnCertificate?: ICloudinaryAsset;
  memorandum?: ICloudinaryAsset;
  articlesOfAssociation?: ICloudinaryAsset;
  pastProjects?: ICloudinaryAsset[];
  // V6.4.5+ — Authorized person CNIC images (mandatory for new profiles)
  authorizedPersonCnicFrontImage?: ICloudinaryAsset;
  authorizedPersonCnicBackImage?: ICloudinaryAsset;
}

export interface IVerificationHistoryEntry {
  status:
    | "submitted"
    | "docs_verified"
    | "site_visited"
    | "approved"
    | "rejected";
  by?: Types.ObjectId;
  at: Date;
  notes?: string;
  ipAddress?: string;
}

export interface IRatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface IPortfolio {
  // V6.4.5+ — Verified project list (replaces raw numbers)
  completedProjects?: ICompletedProject[];

  // Legacy fields — kept for backwards compatibility
  // New profiles use completedProjects[] instead
  totalUnitsDelivered?: number;
  totalProjectValue?: number;
  totalLandArea?: number;
  awards?: string[];
  certifications?: string[];
  notableProjects?: string[];
}

export interface ITrustScore {
  overall: number;
  breakdown: {
    profileComplete: number;
    documentsVerified: number;
    siteVerified: number;
    customerRatings: number;
    projectHistory: number;
    onTimeDelivery: number;
  };
  lastCalculated: Date;
}

export interface IAuditEntry {
  action: string;
  performedBy: Types.ObjectId;
  performedAt: Date;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================
// TEAM MEMBER INTERFACE
// ============================================

export interface ITeamMember {
  _id:        Types.ObjectId;
  name:       string;
  email:      string;
  phone?:     string;
  role:       'owner' | 'admin' | 'sales' | 'marketing' | 'support' | 'viewer';
  isActive:   boolean;
  createdAt:  Date;
  updatedAt?: Date;
  lastActive?: Date;
}

// ============================================
// RAW FIELDS CARRIER — typed, no as any
// ============================================

interface IRawFieldsCarrier {
  _rawPhone?: string;
  _rawWhatsapp?: string;
  _rawAuthorizedPersonCnic?: string;
  _rawAuthorizedPersonPhone?: string;
  _kycOverride?: boolean;
}

// ============================================
// MAIN DEVELOPER PROFILE INTERFACE
// ============================================

export interface IDeveloperProfile extends Document, IRawFieldsCarrier {
  // ─────────────────────────────────────────
  // USER REFERENCE
  // ─────────────────────────────────────────
  user: Types.ObjectId;

  // ─────────────────────────────────────────
  // DEVELOPER TYPE
  // ─────────────────────────────────────────
  developerType: DeveloperType;

  // ─────────────────────────────────────────
  // COMPANY INFO
  // ─────────────────────────────────────────
  companyName: string;
  companyType: string;
  establishedYear: number;
  slug: string;
  description?: string;
  tagline?: string;
  ceoName?: string;

  // ─────────────────────────────────────────
  // 🔒 KYC FIELDS
  // ─────────────────────────────────────────
  secpNumberMasked?: string;
  ntnNumberMasked?: string;
  strnMasked?: string;

  ntnEncrypted?: string;
  ntnHash?: string;
  secpEncrypted?: string;
  secpHash?: string;
  strnEncrypted?: string;

  kycLockedAt?: Date | null;
  kycStatus: KycStatus;

  // ─────────────────────────────────────────
  // 🔒 ENCRYPTED AUTHORIZED PERSON
  // ─────────────────────────────────────────
  authorizedPersonName: string;
  authorizedPersonCnicMasked?: string;
  authorizedPersonCnicEncrypted?: string;
  authorizedPersonCnicHash?: string;
  authorizedPersonPhoneEncrypted?: string;
  authorizedPersonPhoneHash?: string;
  authorizedPersonEmail?: string;
  authorizedPersonDesignation?: string;
  // V6.4.5+ — verification level for authorized person
  authorizedPersonVerificationLevel?: AuthorizedPersonVerificationLevel;

  // ─────────────────────────────────────────
  // 🔒 ENCRYPTED CONTACT INFO
  // ─────────────────────────────────────────
  phoneEncrypted?: string;
  phoneHash?: string;
  whatsappEncrypted?: string;
  email: string;
  website?: string;
  officeAddress?: string;
  city: string;
  operatingCities?: string[];
  serviceAreas?: string[];

  // ─────────────────────────────────────────
  // MEDIA ASSETS
  // ─────────────────────────────────────────
  logo?: ICloudinaryAsset;
  coverImage?: ICloudinaryAsset;
  gallery?: IGalleryItem[];

  // ─────────────────────────────────────────
  // SOCIAL LINKS
  // ─────────────────────────────────────────
  socialLinks?: ISocialLinks;

  // ─────────────────────────────────────────
  // LEGAL DOCUMENTS
  // ─────────────────────────────────────────
  legalDocs?: ILegalDocs;

  // ─────────────────────────────────────────
  // STATUS & VERIFICATION
  // ─────────────────────────────────────────
  status: DeveloperStatus;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  rejectionReason?: string;
  infoRequiredReason?: string;
  verificationLevel: VerificationLevel;
  verificationHistory?: IVerificationHistoryEntry[];
  lastVerifiedAt?: Date;

  // ─────────────────────────────────────────
  // BADGE SYSTEM
  // ─────────────────────────────────────────
  badges: DeveloperBadge[];
  badgeHistory?: Array<{
    badge: DeveloperBadge;
    earnedAt: Date;
    criteria?: string;
  }>;

  // ─────────────────────────────────────────
  // TRUST SCORE
  // ─────────────────────────────────────────
  trustScore: ITrustScore;
  highriseScore?: number;
  highriseScoreOverride?: boolean;
  riskLevel?: RiskLevel;

  // ─────────────────────────────────────────
  // STATS & METRICS
  // ─────────────────────────────────────────
  completedProjectsCount: number;
  activeProjectsCount: number;
  onTimeDeliveryRate?: number;

  // ─────────────────────────────────────────
  // REVIEWS & RATINGS
  // ─────────────────────────────────────────
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: IRatingBreakdown;
  lastReviewAt?: Date;

  // ─────────────────────────────────────────
  // PORTFOLIO
  // ─────────────────────────────────────────
  portfolio?: IPortfolio;

  // ─────────────────────────────────────────
  // FEATURED & PREMIUM
  // ─────────────────────────────────────────
  isFeatured: boolean;
  featuredUntil?: Date;
  featuredPriority?: number;
  isPremiumPartner: boolean;
  premiumUntil?: Date;
  premiumTier?: "basic" | "pro" | "enterprise";

  // ─────────────────────────────────────────
  // SEO FIELDS
  // ─────────────────────────────────────────
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;

  // ─────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────
  favoriteCount: number;
  inquiryCount: number;
  shareCount: number;
  profileViews: number;

  // ─────────────────────────────────────────
  // AUDIT TRAIL
  // ─────────────────────────────────────────
  auditTrail: IAuditEntry[];
  lastActivityAt?: Date;

  // ─────────────────────────────────────────
  // TEAM MEMBERS
  // ─────────────────────────────────────────
  teamMembers?: ITeamMember[];

  // ─────────────────────────────────────────
  // ADMIN NOTES — internal only, never exposed
  // ─────────────────────────────────────────
  adminNotes?: string;

  // ─────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId;
  deletionReason?: string;

  // ─────────────────────────────────────────
  // TIMESTAMPS
  // ─────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;

  // ─────────────────────────────────────────
  // INSTANCE METHODS
  // ─────────────────────────────────────────
  getNTN(): string | null;
  getSECP(): string | null;
  getAuthorizedPersonCNIC(): string | null;
  getPhone(): string | null;
  getAuthorizedPersonPhone(): string | null;
  getMaskedNTN(): string;
  getMaskedSECP(): string;
  getMaskedAuthorizedPersonCNIC(): string;
  getMaskedPhone(): string;
  calculateTrustScore(): Promise<ITrustScore>;
  updateBadges(): Promise<void>;
  addAuditEntry(
    action: string,
    performedBy: Types.ObjectId,
    changes?: Record<string, unknown>,
    ip?: string
  ): Promise<void>;
}

// ============================================
// STATIC METHODS INTERFACE
// ============================================

export interface IDeveloperProfileModel extends Model<IDeveloperProfile> {
  findByNTN(ntn: string): Promise<IDeveloperProfile | null>;
  findBySECP(secp: string): Promise<IDeveloperProfile | null>;
  findByAuthorizedCNIC(cnic: string): Promise<IDeveloperProfile | null>;
  findByPhone(phone: string): Promise<IDeveloperProfile | null>;
  getExpiringVerifications(daysAhead?: number): Promise<IDeveloperProfile[]>;
}

// ============================================
// HELPER — BADGE CRITERIA TEXT
// ============================================

function getBadgeCriteriaText(badge: DeveloperBadge): string {
  const criteria: Record<DeveloperBadge, string> = {
    startup: "New developer on platform",
    emerging: "1-2 completed projects",
    established: "3-5 completed projects",
    silver: "6-10 completed projects",
    gold: "11-20 completed projects",
    platinum: "21-50 completed projects",
    diamond: "51+ completed projects",
    highrise_verified:
      "Physical site verification + 10+ completed projects + KYC verified",
    top_developer: "Top 10% performer in city (monthly ranking)",
    trusted_builder: "4.5+ average rating with 50+ verified reviews",
    on_time_delivery: "90%+ on-time delivery rate across all projects",
    premium_partner: "Active premium partnership subscription",
  };
  return criteria[badge] ?? "Badge earned";
}

// ============================================
// SUB-SCHEMAS
// ============================================

const CloudinaryAssetSchema = new Schema<ICloudinaryAsset>(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  { _id: false }
);

const GalleryItemSchema = new Schema<IGalleryItem>(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    caption: { type: String, maxlength: 200 },
    category: {
      type: String,
      enum: ["office", "team", "event", "project", "award"],
      default: "project",
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const SocialLinksSchema = new Schema<ISocialLinks>(
  {
    facebook: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    instagram: { type: String, trim: true },
    youtube: { type: String, trim: true },
    twitter: { type: String, trim: true },
    website: { type: String, trim: true },
  },
  { _id: false }
);

// ── V6.4.5+ CompletedProject Schema ──────────────────────────

const CompletedProjectSchema = new Schema<ICompletedProject>(
  {
    projectName: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [150, "Project name cannot exceed 150 characters"],
    },
    projectType: {
      type: String,
      required: [true, "Project type is required"],
      enum: {
        values: [
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
        ],
        message: "{VALUE} is not a valid project type",
      },
    },

    // Location
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
    },
    location: { type: String, trim: true },

    // Timeline
    startYear: {
      type: Number,
      min: [1900, "Start year must be after 1900"],
      max: [new Date().getFullYear(), "Start year cannot be in the future"],
    },
    completionYear: {
      type: Number,
      required: [true, "Completion year is required"],
      min: [1900, "Completion year must be after 1900"],
      max: [new Date().getFullYear() + 10, "Completion year is too far in the future"],
    },

    // Status with Transparency
    status: {
      type: String,
      required: [true, "Project status is required"],
      enum: {
        values: [
          "completed",
          "under_construction",
          "ready_for_possession",
          "delayed",
          "on_hold",
        ],
        message: "{VALUE} is not a valid project status",
      },
    },
    delayReason: {
      type: String,
      trim: true,
      maxlength: [500, "Delay reason cannot exceed 500 characters"],
    },
    expectedResolutionDate: { type: String, trim: true },

    // Details
    totalUnits: { type: Number, min: 0 },
    totalPlots: { type: Number, min: 0 },
    totalArea: { type: String, trim: true },
    societyName: { type: String, trim: true },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // Media — minimum 1 image required (enforced at API level)
    images: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 5,
        message: "Maximum 5 images per project",
      },
    },
    videoUrl: { type: String, trim: true },
    virtualTourUrl: { type: String, trim: true },
    brochureUrl: { type: String, trim: true },

    // Admin Verification — NEVER writable by developer
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    verificationNotes: { type: String, trim: true, maxlength: 500 },
    rejectionReason: { type: String, trim: true, maxlength: 500 },

    // Timestamps
    addedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const LegalDocsSchema = new Schema<ILegalDocs>(
  {
    secpCertificate: {
      url: { type: String },
      public_id: { type: String },
    },
    ntnCertificate: {
      url: { type: String },
      public_id: { type: String },
    },
    memorandum: {
      url: { type: String },
      public_id: { type: String },
    },
    articlesOfAssociation: {
      url: { type: String },
      public_id: { type: String },
    },
    pastProjects: [CloudinaryAssetSchema],
    // V6.4.5+ — Authorized person CNIC images
    authorizedPersonCnicFrontImage: {
      url: { type: String },
      public_id: { type: String },
    },
    authorizedPersonCnicBackImage: {
      url: { type: String },
      public_id: { type: String },
    },
  },
  { _id: false }
);

const VerificationHistorySchema = new Schema<IVerificationHistoryEntry>(
  {
    status: {
      type: String,
      enum: [
        "submitted",
        "docs_verified",
        "site_visited",
        "approved",
        "rejected",
      ],
      required: true,
    },
    by: { type: Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
    notes: { type: String, maxlength: 500 },
    ipAddress: { type: String },
  },
  { _id: true }
);

const TrustScoreSchema = new Schema<ITrustScore>(
  {
    overall: { type: Number, default: 0, min: 0, max: 100 },
    breakdown: {
      profileComplete: { type: Number, default: 0, min: 0, max: 15 },
      documentsVerified: { type: Number, default: 0, min: 0, max: 25 },
      siteVerified: { type: Number, default: 0, min: 0, max: 15 },
      customerRatings: { type: Number, default: 0, min: 0, max: 20 },
      projectHistory: { type: Number, default: 0, min: 0, max: 15 },
      onTimeDelivery: { type: Number, default: 0, min: 0, max: 10 },
    },
    lastCalculated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PortfolioSchema = new Schema<IPortfolio>(
  {
    // V6.4.5+ — verified project list
    completedProjects: {
      type: [CompletedProjectSchema],
      default: [],
      validate: {
        validator: (arr: ICompletedProject[]) => arr.length <= 50,
        message: "Maximum 50 completed projects allowed",
      },
    },
    // Legacy fields — kept for backwards compatibility
    totalUnitsDelivered: { type: Number, default: 0, min: 0 },
    totalProjectValue: { type: Number, default: 0, min: 0 },
    totalLandArea: { type: Number, default: 0, min: 0 },
    awards: [{ type: String, trim: true }],
    certifications: [{ type: String, trim: true }],
    notableProjects: [{ type: String, trim: true }],
  },
  { _id: false }
);

const AuditEntrySchema = new Schema<IAuditEntry>(
  {
    action: { type: String, required: true },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedAt: { type: Date, default: Date.now },
    changes: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { _id: true }
);

// ============================================
// MAIN SCHEMA
// ============================================

const DeveloperProfileSchema = new Schema<IDeveloperProfile>(
  {
    // ─────────────────────────────────────────
    // USER REFERENCE
    // ─────────────────────────────────────────
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true,
    },

    // ─────────────────────────────────────────
    // DEVELOPER TYPE
    // ─────────────────────────────────────────
    developerType: {
      type: String,
      enum: {
        values: [
          "builder",
          "developer",
          "society",
          "corporate",
          "individual",
        ],
        message: "{VALUE} is not a valid developer type",
      },
      required: [true, "Developer type is required"],
    },

    // ─────────────────────────────────────────
    // COMPANY INFO
    // ─────────────────────────────────────────
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: [3, "Company name must be at least 3 characters"],
      maxlength: [150, "Company name cannot exceed 150 characters"],
    },
    companyType: {
      type: String,
      required: [true, "Company type is required"],
      trim: true,
    },
    establishedYear: {
      type: Number,
      required: [true, "Established year is required"],
      min: [1900, "Established year must be after 1900"],
      max: [
        new Date().getFullYear(),
        "Established year cannot be in the future",
      ],
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    tagline: {
      type: String,
      maxlength: [200, "Tagline cannot exceed 200 characters"],
    },
    ceoName: {
      type: String,
      trim: true,
      maxlength: [100, "CEO name cannot exceed 100 characters"],
    },

    // ─────────────────────────────────────────
    // 🔒 KYC FIELDS
    // ─────────────────────────────────────────
    secpNumberMasked: { type: String, trim: true },
    ntnNumberMasked: { type: String, trim: true },
    strnMasked: { type: String, trim: true },

    ntnEncrypted: { type: String, select: false },
    ntnHash: { type: String, sparse: true },
    secpEncrypted: { type: String, select: false },
    secpHash: { type: String, sparse: true },
    strnEncrypted: { type: String, select: false },

    kycLockedAt: { type: Date, default: null },
    kycStatus: {
      type: String,
      enum: ["none", "pending", "verified", "rejected"],
      default: "none",
    },

    // ─────────────────────────────────────────
    // 🔒 AUTHORIZED PERSON
    // ─────────────────────────────────────────
    authorizedPersonName: {
      type: String,
      required: [true, "Authorized person name is required"],
      trim: true,
    },
    authorizedPersonCnicMasked: { type: String },
    authorizedPersonCnicEncrypted: { type: String, select: false },
    authorizedPersonCnicHash: { type: String, sparse: true },
    authorizedPersonPhoneEncrypted: { type: String, select: false },
    authorizedPersonPhoneHash: { type: String, sparse: true },
    authorizedPersonEmail: { type: String, lowercase: true, trim: true },
    authorizedPersonDesignation: { type: String, trim: true },
    // V6.4.5+ — verification level for authorized person
    authorizedPersonVerificationLevel: {
      type: String,
      enum: ["unverified", "documents_uploaded", "basic_verified", "fully_verified"],
      default: "unverified",
    },

    // ─────────────────────────────────────────
    // 🔒 CONTACT
    // ─────────────────────────────────────────
    phoneEncrypted: { type: String, select: false },
    phoneHash: { type: String, sparse: true },
    whatsappEncrypted: { type: String, select: false },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    website: { type: String, trim: true },
    officeAddress: { type: String, trim: true },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    operatingCities: [{ type: String, trim: true }],
    serviceAreas: [{ type: String, trim: true }],

    // ─────────────────────────────────────────
    // MEDIA
    // ─────────────────────────────────────────
    logo: { type: CloudinaryAssetSchema },
    coverImage: CloudinaryAssetSchema,
    gallery: [GalleryItemSchema],

    // ─────────────────────────────────────────
    // SOCIAL LINKS
    // ─────────────────────────────────────────
    socialLinks: SocialLinksSchema,

    // ─────────────────────────────────────────
    // LEGAL DOCUMENTS
    // ─────────────────────────────────────────
    legalDocs: { type: LegalDocsSchema },

    // ─────────────────────────────────────────
    // STATUS & VERIFICATION
    // ─────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: [
          "draft",
          "pending",
          "approved",
          "rejected",
          "suspended",
          "info_required",
        ],
        message: "{VALUE} is not a valid status",
      },
      default: "draft",
    },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, maxlength: 500 },
    infoRequiredReason: { type: String, maxlength: 1000 },
    verificationLevel: {
      type: String,
      enum: {
        values: [
          "not_verified",
          "docs_pending",
          "docs_verified",
          "site_verified",
          "fully_verified",
        ],
        message: "{VALUE} is not a valid verification level",
      },
      default: "not_verified",
    },
    verificationHistory: [VerificationHistorySchema],
    lastVerifiedAt: { type: Date },

    // ─────────────────────────────────────────
    // BADGE SYSTEM
    // ─────────────────────────────────────────
    badges: [
      {
        type: String,
        enum: {
          values: [
            "startup",
            "emerging",
            "established",
            "silver",
            "gold",
            "platinum",
            "diamond",
            "highrise_verified",
            "top_developer",
            "trusted_builder",
            "on_time_delivery",
            "premium_partner",
          ],
          message: "{VALUE} is not a valid badge",
        },
      },
    ],
    badgeHistory: [
      {
        badge: { type: String, required: true },
        earnedAt: { type: Date, default: Date.now },
        criteria: { type: String },
      },
    ],

    // ─────────────────────────────────────────
    // TRUST SCORE
    // ─────────────────────────────────────────
    trustScore: {
      type: TrustScoreSchema,
      default: () => ({
        overall: 0,
        breakdown: {
          profileComplete: 0,
          documentsVerified: 0,
          siteVerified: 0,
          customerRatings: 0,
          projectHistory: 0,
          onTimeDelivery: 0,
        },
        lastCalculated: new Date(),
      }),
    },
    highriseScore: { type: Number, min: 0, max: 100 },
    // Admin-set manual score is authoritative — survives every save and
    // trustScore recalculation until explicitly cleared.
    highriseScoreOverride: { type: Boolean, default: false },
    riskLevel: { type: String, enum: ["low", "medium", "high"] },

    // ─────────────────────────────────────────
    // STATS & METRICS
    // ─────────────────────────────────────────
    completedProjectsCount: { type: Number, default: 0, min: 0 },
    activeProjectsCount: { type: Number, default: 0, min: 0 },
    onTimeDeliveryRate: { type: Number, min: 0, max: 100 },

    // ─────────────────────────────────────────
    // REVIEWS & RATINGS
    // ─────────────────────────────────────────
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    ratingBreakdown: {
      5: { type: Number, default: 0, min: 0 },
      4: { type: Number, default: 0, min: 0 },
      3: { type: Number, default: 0, min: 0 },
      2: { type: Number, default: 0, min: 0 },
      1: { type: Number, default: 0, min: 0 },
    },
    lastReviewAt: { type: Date },

    // ─────────────────────────────────────────
    // PORTFOLIO — V6.4.5+
    // ─────────────────────────────────────────
    portfolio: PortfolioSchema,

    // ─────────────────────────────────────────
    // FEATURED & PREMIUM
    // ─────────────────────────────────────────
    isFeatured: { type: Boolean, default: false },
    featuredUntil: { type: Date },
    featuredPriority: { type: Number, default: 0 },
    isPremiumPartner: { type: Boolean, default: false },
    premiumUntil: { type: Date },
    premiumTier: { type: String, enum: ["basic", "pro", "enterprise"] },

    // ─────────────────────────────────────────
    // SEO FIELDS
    // ─────────────────────────────────────────
    metaTitle: { type: String, maxlength: 70 },
    metaDescription: { type: String, maxlength: 160 },
    keywords: [{ type: String, trim: true }],
    canonicalUrl: { type: String },

    // ─────────────────────────────────────────
    // ANALYTICS
    // ─────────────────────────────────────────
    favoriteCount: { type: Number, default: 0, min: 0 },
    inquiryCount: { type: Number, default: 0, min: 0 },
    shareCount: { type: Number, default: 0, min: 0 },
    profileViews: { type: Number, default: 0, min: 0 },

    // ─────────────────────────────────────────
    // AUDIT TRAIL
    // ─────────────────────────────────────────
    auditTrail: {
      type: [AuditEntrySchema],
      select: false,
      default: [],
    },
    lastActivityAt: { type: Date },

    // ─────────────────────────────────────────
    // TEAM MEMBERS
    // ─────────────────────────────────────────
    teamMembers: {
      type: [
        new mongoose.Schema(
          {
            name:      { type: String, required: true, trim: true, maxlength: 100 },
            email:     { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
            phone:     { type: String, trim: true, maxlength: 20 },
            role:      {
              type: String,
              enum: ['owner', 'admin', 'sales', 'marketing', 'support', 'viewer'],
              required: true,
              default: 'viewer',
            },
            isActive:   { type: Boolean, default: true },
            createdAt:  { type: Date, default: Date.now },
            updatedAt:  { type: Date },
            lastActive: { type: Date },
          },
          { _id: true }
        ),
      ],
      default: [],
      validate: {
        validator: (arr: unknown[]) => arr.length <= 20,
        message:   'Maximum 20 team members allowed',
      },
    },

    // ─────────────────────────────────────────
    // ADMIN NOTES — select: false
    // ─────────────────────────────────────────
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Admin notes cannot exceed 2000 characters"],
      select: false,
    },

    // ─────────────────────────────────────────
    // SOFT DELETE
    // ─────────────────────────────────────────
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletionReason: { type: String },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Anti-fraud uniqueness
DeveloperProfileSchema.index(
  { ntnHash: 1 },
  { unique: true, sparse: true, name: "idx_ntn_hash_unique",
    partialFilterExpression: { ntnHash: { $type: "string" } } }
);
DeveloperProfileSchema.index(
  { secpHash: 1 },
  { unique: true, sparse: true, name: "idx_secp_hash_unique",
    partialFilterExpression: { secpHash: { $type: "string" } } }
);

// Lookup indexes
DeveloperProfileSchema.index({ phoneHash: 1 }, { name: "idx_phone_hash" });
DeveloperProfileSchema.index(
  { authorizedPersonCnicHash: 1 },
  { name: "idx_auth_cnic_hash" }
);

// Search & filter
DeveloperProfileSchema.index(
  { status: 1, isDeleted: 1 },
  { name: "idx_status_deleted" }
);
DeveloperProfileSchema.index(
  { city: 1, status: 1 },
  { name: "idx_city_status" }
);
DeveloperProfileSchema.index(
  { developerType: 1 },
  { name: "idx_developer_type" }
);
DeveloperProfileSchema.index(
  { verificationLevel: 1, status: 1 },
  { name: "idx_verification_status" }
);
DeveloperProfileSchema.index({ kycStatus: 1 }, { name: "idx_kyc_status" });
DeveloperProfileSchema.index({ isVerified: 1 }, { name: "idx_is_verified" });

// Performance
DeveloperProfileSchema.index(
  { averageRating: -1, totalReviews: -1 },
  { name: "idx_rating_reviews" }
);
DeveloperProfileSchema.index(
  { "trustScore.overall": -1 },
  { name: "idx_trust_score" }
);
DeveloperProfileSchema.index(
  { highriseScore: -1 },
  { name: "idx_highrise_score" }
);
DeveloperProfileSchema.index(
  { completedProjectsCount: -1 },
  { name: "idx_completed_projects" }
);
DeveloperProfileSchema.index(
  { isFeatured: 1, featuredPriority: -1 },
  { name: "idx_featured" }
);
DeveloperProfileSchema.index(
  { isPremiumPartner: 1, premiumUntil: -1 },
  { name: "idx_premium" }
);

// Geographic
DeveloperProfileSchema.index(
  { operatingCities: 1 },
  { name: "idx_operating_cities" }
);
DeveloperProfileSchema.index(
  { serviceAreas: 1 },
  { name: "idx_service_areas" }
);

// V6.4.5+ — Portfolio project verification queries
DeveloperProfileSchema.index(
  { "portfolio.completedProjects.isVerified": 1 },
  { name: "idx_portfolio_verified" }
);
DeveloperProfileSchema.index(
  { "portfolio.completedProjects.city": 1 },
  { name: "idx_portfolio_city" }
);

// Full-text search
DeveloperProfileSchema.index(
  {
    companyName: "text",
    description: "text",
    tagline: "text",
    serviceAreas: "text",
    ceoName: "text",
  },
  { name: "idx_text_search" }
);

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

DeveloperProfileSchema.pre("save", async function (next) {
  try {
    const doc = this as IDeveloperProfile;
    const override = Boolean(doc._kycOverride);

    // 🔒 Snapshot kycLockedAt at START of hook — prevents self-locking
    // during initial save (NTN block sets lock BEFORE SECP block checks it)
    const kycWasAlreadyLocked = Boolean(doc.kycLockedAt) && !doc.isNew;

    // ── 1. ENCRYPT & HASH NTN ────────────────────────────────
    if (doc.isModified("ntnNumberMasked") && doc.ntnNumberMasked) {
      const raw = doc.ntnNumberMasked.trim();

      if (kycWasAlreadyLocked && !override) {
        return next(
          new Error(
            "NTN is locked and cannot be changed. Contact support for corrections."
          )
        );
      }

      const validation = validateNtn(raw);
      if (!validation.isValid) {
        return next(new Error(validation.error ?? "Invalid NTN format"));
      }

      doc.ntnEncrypted = encryptNtn(raw);
      doc.ntnHash = hashNtn(raw);
      doc.ntnNumberMasked = maskNtn(raw);

      if (!doc.kycLockedAt) doc.kycLockedAt = new Date();
      if (doc.kycStatus === "none") doc.kycStatus = "pending";
    }

    // ── 2. ENCRYPT & HASH SECP ───────────────────────────────
    if (doc.isModified("secpNumberMasked") && doc.secpNumberMasked) {
      const raw = doc.secpNumberMasked.trim();

      if (kycWasAlreadyLocked && !override) {
        return next(
          new Error(
            "SECP number is locked and cannot be changed. Contact support for corrections."
          )
        );
      }

      const validation = validateSecp(raw);
      if (!validation.isValid) {
        return next(new Error(validation.error ?? "Invalid SECP number format"));
      }

      doc.secpEncrypted = encryptSecp(raw);
      doc.secpHash = hashSecp(raw);
      doc.secpNumberMasked = maskSecp(raw);

      if (!doc.kycLockedAt) doc.kycLockedAt = new Date();
      if (doc.kycStatus === "none") doc.kycStatus = "pending";
    }

    // ── 3. ENCRYPT AUTHORIZED PERSON CNIC ───────────────────
    if (doc._rawAuthorizedPersonCnic) {
      const raw = doc._rawAuthorizedPersonCnic.trim();

      const validation = validateCnic(raw);
      if (!validation.isValid) {
        return next(
          new Error(validation.error ?? "Invalid authorized person CNIC format")
        );
      }

      doc.authorizedPersonCnicEncrypted = encryptCnic(raw);
      doc.authorizedPersonCnicHash = hashCnic(raw);
      doc.authorizedPersonCnicMasked = maskCnic(raw);

      delete doc._rawAuthorizedPersonCnic;
    }

    // ── 4. ENCRYPT COMPANY PHONE ─────────────────────────────
    if (doc._rawPhone) {
      const raw = doc._rawPhone.trim();

      const validation = validatePhone(raw);
      if (!validation.isValid) {
        return next(new Error(validation.error ?? "Invalid phone number format"));
      }

      doc.phoneEncrypted = encryptPhone(raw);
      doc.phoneHash = hashPhone(raw);

      delete doc._rawPhone;
    }

    // ── 5. ENCRYPT WHATSAPP ──────────────────────────────────
    if (doc._rawWhatsapp) {
      const raw = doc._rawWhatsapp.trim();

      const validation = validatePhone(raw);
      if (!validation.isValid) {
        return next(new Error(validation.error ?? "Invalid WhatsApp number format"));
      }

      doc.whatsappEncrypted = encryptPhone(raw);

      delete doc._rawWhatsapp;
    }

    // ── 6. ENCRYPT AUTHORIZED PERSON PHONE ──────────────────
    if (doc._rawAuthorizedPersonPhone) {
      const raw = doc._rawAuthorizedPersonPhone.trim();

      const validation = validatePhone(raw);
      if (!validation.isValid) {
        return next(
          new Error(
            validation.error ?? "Invalid authorized person phone format"
          )
        );
      }

      doc.authorizedPersonPhoneEncrypted = encryptPhone(raw);
      doc.authorizedPersonPhoneHash = hashPhone(raw);

      delete doc._rawAuthorizedPersonPhone;
    }

    // ── 7. AUTO-GENERATE SLUG ────────────────────────────────
    if (!doc.slug && doc.companyName) {
      const baseSlug = doc.companyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const randomSuffix = crypto.randomBytes(3).toString("hex");
      doc.slug = `${baseSlug}-${randomSuffix}`;
    }

    // ── 8. AUTO-GENERATE SEO FIELDS ──────────────────────────
    if (!doc.metaTitle && doc.companyName) {
      const title = `${doc.companyName} — Developer Profile | Highrise.pk`;
      doc.metaTitle =
        title.length > 70 ? title.substring(0, 67) + "..." : title;
    }

    if (!doc.metaDescription && doc.description) {
      const plain = doc.description.replace(/<[^>]*>/g, "");
      doc.metaDescription =
        plain.length > 157 ? plain.substring(0, 154) + "..." : plain;
    }

    if (!doc.keywords || doc.keywords.length === 0) {
      doc.keywords = [
        doc.companyName,
        doc.city,
        doc.developerType,
        "real estate developer",
        "builder pakistan",
        "highrise.pk",
      ].filter((v): v is string => Boolean(v));
    }

    if (!doc.canonicalUrl && doc.slug) {
      doc.canonicalUrl = `https://highrise.pk/developer/${doc.slug}`;
    }

    // ── 9. AUTO-UPDATE VERIFICATION LEVEL ───────────────────
    if (doc.status === "approved") {
      if (doc.lastVerifiedAt) {
        doc.verificationLevel = "fully_verified";
      } else if (doc.kycStatus === "verified") {
        doc.verificationLevel = "docs_verified";
      }
    } else if (
      doc.status === "pending" &&
      doc.verificationLevel === "not_verified"
    ) {
      doc.verificationLevel = "docs_pending";
    }

    // ── 10. ENSURE PRIMARY CITY IN OPERATING CITIES ─────────
    if (doc.city && doc.operatingCities) {
      if (!doc.operatingCities.includes(doc.city)) {
        doc.operatingCities.push(doc.city);
      }
    }

    // ── 11. SYNC HIGHRISE SCORE ──────────────────────────────
    if (
      doc.trustScore?.overall !== undefined &&
      !doc.highriseScoreOverride &&
      (doc.isModified('trustScore') || doc.highriseScore === undefined)
    ) {
      doc.highriseScore = doc.trustScore.overall;
    }

    // ── 12. AUTO-UPDATE AUTHORIZED PERSON VERIFICATION LEVEL
    // When CNIC images are uploaded, bump level to documents_uploaded
    if (
      doc.legalDocs?.authorizedPersonCnicFrontImage?.url &&
      doc.legalDocs?.authorizedPersonCnicBackImage?.url &&
      doc.authorizedPersonVerificationLevel === "unverified"
    ) {
      doc.authorizedPersonVerificationLevel = "documents_uploaded";
    }

    // ── 13. AUTO-SYNC completedProjectsCount ────────────────
    // Keep completedProjectsCount in sync with verified projects
    if (doc.portfolio?.completedProjects) {
      const verifiedCount = doc.portfolio.completedProjects.filter(
        (p) => p.isVerified && p.status === "completed"
      ).length;
      // Only update if we have verified projects (don't override admin-set count)
      if (verifiedCount > 0) {
        doc.completedProjectsCount = verifiedCount;
      }
    }

    // ── 14. UPDATE LAST ACTIVITY ─────────────────────────────
    if (!doc.isNew && doc.isModified()) {
      doc.lastActivityAt = new Date();
    }

    next();
  } catch (err: unknown) {
    next(err instanceof Error ? err : new Error(String(err)));
  }
});

// ============================================
// INSTANCE METHODS
// ============================================

DeveloperProfileSchema.methods.getNTN = function (
  this: IDeveloperProfile
): string | null {
  if (!this.ntnEncrypted) return null;
  try { return decryptNtn(this.ntnEncrypted); } catch { return null; }
};

DeveloperProfileSchema.methods.getSECP = function (
  this: IDeveloperProfile
): string | null {
  if (!this.secpEncrypted) return null;
  try { return decryptSecp(this.secpEncrypted); } catch { return null; }
};

DeveloperProfileSchema.methods.getAuthorizedPersonCNIC = function (
  this: IDeveloperProfile
): string | null {
  if (!this.authorizedPersonCnicEncrypted) return null;
  try { return decryptCnic(this.authorizedPersonCnicEncrypted); } catch { return null; }
};

DeveloperProfileSchema.methods.getPhone = function (
  this: IDeveloperProfile
): string | null {
  if (!this.phoneEncrypted) return null;
  try { return decryptPhone(this.phoneEncrypted); } catch { return null; }
};

DeveloperProfileSchema.methods.getAuthorizedPersonPhone = function (
  this: IDeveloperProfile
): string | null {
  if (!this.authorizedPersonPhoneEncrypted) return null;
  try { return decryptPhone(this.authorizedPersonPhoneEncrypted); } catch { return null; }
};

DeveloperProfileSchema.methods.getMaskedNTN = function (
  this: IDeveloperProfile
): string {
  if (this.ntnNumberMasked) return this.ntnNumberMasked;
  const ntn = this.getNTN();
  return ntn ? maskNtn(ntn) : "Not provided";
};

DeveloperProfileSchema.methods.getMaskedSECP = function (
  this: IDeveloperProfile
): string {
  if (this.secpNumberMasked) return this.secpNumberMasked;
  const secp = this.getSECP();
  return secp ? maskSecp(secp) : "Not provided";
};

DeveloperProfileSchema.methods.getMaskedAuthorizedPersonCNIC = function (
  this: IDeveloperProfile
): string {
  if (this.authorizedPersonCnicMasked) return this.authorizedPersonCnicMasked;
  const cnic = this.getAuthorizedPersonCNIC();
  return cnic ? maskCnic(cnic) : "Not provided";
};

DeveloperProfileSchema.methods.getMaskedPhone = function (
  this: IDeveloperProfile
): string {
  const phone = this.getPhone();
  return phone ? maskPhone(phone) : "Not provided";
};

// 🧮 CALCULATE TRUST SCORE
DeveloperProfileSchema.methods.calculateTrustScore =
  async function (this: IDeveloperProfile): Promise<ITrustScore> {
    const breakdown = {
      profileComplete: 0,
      documentsVerified: 0,
      siteVerified: 0,
      customerRatings: 0,
      projectHistory: 0,
      onTimeDelivery: 0,
    };

    // 1. Profile Completeness (0-15 points)
    let completeness = 0;
    if (this.companyName) completeness += 2;
    if (this.description && this.description.length > 100) completeness += 3;
    if (this.tagline) completeness += 1;
    if (this.logo?.url) completeness += 2;
    if (this.coverImage?.url) completeness += 1;
    if (this.socialLinks?.facebook || this.socialLinks?.linkedin) completeness += 2;
    if (this.ceoName) completeness += 1;
    if (this.website) completeness += 1;
    // V6.4.5+: portfolio projects contribute to completeness
    if (
      this.portfolio?.completedProjects &&
      this.portfolio.completedProjects.length > 0
    ) completeness += 2;
    breakdown.profileComplete = Math.min(completeness, 15);

    // 2. Documents Verified (0-25 points)
    let docsScore = 0;
    if (this.kycStatus === "verified") docsScore += 10;
    if (this.legalDocs?.secpCertificate?.url) docsScore += 5;
    if (this.legalDocs?.ntnCertificate?.url) docsScore += 5;
    if (this.legalDocs?.memorandum?.url) docsScore += 2;
    // V6.4.5+: CNIC images uploaded
    if (this.legalDocs?.authorizedPersonCnicFrontImage?.url) docsScore += 1;
    if (this.legalDocs?.authorizedPersonCnicBackImage?.url) docsScore += 1;
    // V6.4.5+: authorized person verified by admin
    if (this.authorizedPersonVerificationLevel === "basic_verified" ||
        this.authorizedPersonVerificationLevel === "fully_verified") docsScore += 1;
    breakdown.documentsVerified = Math.min(docsScore, 25);

    // 3. Site Verified (0-15 points)
    if (
      this.verificationLevel === "site_verified" ||
      this.verificationLevel === "fully_verified"
    ) {
      breakdown.siteVerified = 15;
    } else if (this.lastVerifiedAt) {
      breakdown.siteVerified = 10;
    }

    // 4. Customer Ratings (0-20 points)
    if (this.totalReviews > 0) {
      const ratingScore = (this.averageRating / 5) * 15;
      const reviewBonus = Math.min(this.totalReviews / 20, 5);
      breakdown.customerRatings = Math.min(
        Math.round(ratingScore + reviewBonus),
        20
      );
    }

    // 5. Project History (0-15 points)
    // V6.4.5+: use verified projects count
    const verifiedProjects =
      this.portfolio?.completedProjects?.filter((p) => p.isVerified).length ??
      this.completedProjectsCount ??
      0;
    if (verifiedProjects > 0) {
      breakdown.projectHistory = Math.min(
        Math.round(verifiedProjects * 1.5),
        15
      );
    }

    // 6. On-Time Delivery (0-10 points)
    if (
      this.onTimeDeliveryRate !== undefined &&
      this.onTimeDeliveryRate > 0
    ) {
      breakdown.onTimeDelivery = Math.min(
        Math.round((this.onTimeDeliveryRate / 100) * 10),
        10
      );
    }

    const overall = Math.round(
      Object.values(breakdown).reduce((sum, val) => sum + val, 0)
    );

    this.trustScore = {
      overall,
      breakdown,
      lastCalculated: new Date(),
    };

    return this.trustScore;
  };

// 🏅 UPDATE BADGES
DeveloperProfileSchema.methods.updateBadges =
  async function (this: IDeveloperProfile): Promise<void> {
    const newBadges: DeveloperBadge[] = [];

    // V6.4.5+: use verified project count for tier badge
    const verifiedProjectCount =
      this.portfolio?.completedProjects?.filter(
        (p) => p.isVerified && p.status === "completed"
      ).length ??
      this.completedProjectsCount ??
      0;

    // Tier badge — only one tier badge at a time
    if (verifiedProjectCount >= 51) {
      newBadges.push("diamond");
    } else if (verifiedProjectCount >= 21) {
      newBadges.push("platinum");
    } else if (verifiedProjectCount >= 11) {
      newBadges.push("gold");
    } else if (verifiedProjectCount >= 6) {
      newBadges.push("silver");
    } else if (verifiedProjectCount >= 3) {
      newBadges.push("established");
    } else if (verifiedProjectCount >= 1) {
      newBadges.push("emerging");
    } else {
      newBadges.push("startup");
    }

    // Preserve admin-assignable badges from current set
    const adminBadges: DeveloperBadge[] = [
      "highrise_verified",
      "top_developer",
      "trusted_builder",
      "on_time_delivery",
      "premium_partner",
    ];
    for (const badge of adminBadges) {
      if (this.badges.includes(badge)) {
        // Re-validate criteria before preserving
        if (badge === "trusted_builder") {
          if (this.averageRating >= 4.5 && this.totalReviews >= 50) {
            newBadges.push(badge);
          }
        } else if (badge === "on_time_delivery") {
          if (
            this.onTimeDeliveryRate !== undefined &&
            this.onTimeDeliveryRate >= 90
          ) {
            newBadges.push(badge);
          }
        } else if (badge === "premium_partner") {
          if (
            this.isPremiumPartner &&
            this.premiumUntil &&
            this.premiumUntil > new Date()
          ) {
            newBadges.push(badge);
          }
        } else {
          // highrise_verified, top_developer — admin-set, preserve as-is
          newBadges.push(badge);
        }
      }
    }

    // Track newly earned badges in history
    for (const badge of newBadges) {
      if (!this.badges.includes(badge)) {
        if (!this.badgeHistory) this.badgeHistory = [];
        this.badgeHistory.push({
          badge,
          earnedAt: new Date(),
          criteria: getBadgeCriteriaText(badge),
        });
      }
    }

    this.badges = newBadges;
  };

// 📝 ADD AUDIT ENTRY
DeveloperProfileSchema.methods.addAuditEntry = async function (
  this: IDeveloperProfile,
  action: string,
  performedBy: Types.ObjectId,
  changes?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  if (!this.auditTrail) this.auditTrail = [];

  this.auditTrail.push({
    action,
    performedBy,
    performedAt: new Date(),
    changes,
    ipAddress: ip,
  } as IAuditEntry);

  if (this.auditTrail.length > 100) {
    this.auditTrail = this.auditTrail.slice(-100);
  }
};

// ============================================
// VIRTUAL FIELDS
// ============================================

DeveloperProfileSchema.virtual("profileUrl").get(function (
  this: IDeveloperProfile
) {
  return `/developer/${this.slug}`;
});

DeveloperProfileSchema.virtual("experienceYears").get(function (
  this: IDeveloperProfile
) {
  if (!this.establishedYear) return 0;
  return new Date().getFullYear() - this.establishedYear;
});

DeveloperProfileSchema.virtual("isFullyVerified").get(function (
  this: IDeveloperProfile
) {
  return (
    this.verificationLevel === "fully_verified" && this.status === "approved"
  );
});

DeveloperProfileSchema.virtual("totalProjectsCount").get(function (
  this: IDeveloperProfile
) {
  return (this.completedProjectsCount ?? 0) + (this.activeProjectsCount ?? 0);
});

// V6.4.5+: phoneMasked virtual (used in profile.tsx display)
DeveloperProfileSchema.virtual("phoneMasked").get(function (
  this: IDeveloperProfile
) {
  return this.getMaskedPhone();
});

// V6.4.5+: verified projects count virtual
DeveloperProfileSchema.virtual("verifiedProjectsCount").get(function (
  this: IDeveloperProfile
) {
  return (
    this.portfolio?.completedProjects?.filter((p) => p.isVerified).length ?? 0
  );
});

DeveloperProfileSchema.set("toJSON", { virtuals: true });
DeveloperProfileSchema.set("toObject", { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

DeveloperProfileSchema.statics.findByNTN = async function (
  ntn: string
): Promise<IDeveloperProfile | null> {
  const validation = validateNtn(ntn);
  if (!validation.isValid) {
    throw new Error(validation.error ?? "Invalid NTN format");
  }
  return this.findOne({ ntnHash: hashNtn(ntn), isDeleted: false });
};

DeveloperProfileSchema.statics.findBySECP = async function (
  secp: string
): Promise<IDeveloperProfile | null> {
  const validation = validateSecp(secp);
  if (!validation.isValid) {
    throw new Error(validation.error ?? "Invalid SECP number format");
  }
  return this.findOne({ secpHash: hashSecp(secp), isDeleted: false });
};

DeveloperProfileSchema.statics.findByAuthorizedCNIC = async function (
  cnic: string
): Promise<IDeveloperProfile | null> {
  const validation = validateCnic(cnic);
  if (!validation.isValid) {
    throw new Error(validation.error ?? "Invalid CNIC format");
  }
  return this.findOne({
    authorizedPersonCnicHash: hashCnic(cnic),
    isDeleted: false,
  });
};

DeveloperProfileSchema.statics.findByPhone = async function (
  phone: string
): Promise<IDeveloperProfile | null> {
  const validation = validatePhone(phone);
  if (!validation.isValid) {
    throw new Error(validation.error ?? "Invalid phone number format");
  }
  return this.findOne({ phoneHash: hashPhone(phone), isDeleted: false });
};

DeveloperProfileSchema.statics.getExpiringVerifications = async function (
  daysAhead = 30
): Promise<IDeveloperProfile[]> {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  cutoffDate.setDate(cutoffDate.getDate() - daysAhead);

  return this.find({
    status: "approved",
    isDeleted: false,
    lastVerifiedAt: { $lte: cutoffDate },
  }).select(
    "companyName email lastVerifiedAt verificationLevel slug"
  );
};

// ============================================
// MODEL EXPORT
// ============================================

const DeveloperProfile =
  (mongoose.models.DeveloperProfile as IDeveloperProfileModel) ||
  mongoose.model<IDeveloperProfile, IDeveloperProfileModel>(
    "DeveloperProfile",
    DeveloperProfileSchema
  );

export default DeveloperProfile;