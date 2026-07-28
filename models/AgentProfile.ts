// models/AgentProfile.ts
// ═══════════════════════════════════════════════════════════════
// AGENT PROFILE MODEL - Highrise.pk
// 🔒 ENTERPRISE-GRADE SECURITY - Production Ready
// Extended profile for users with role: 'agent'
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'crypto';
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
  encryptLicense,
  decryptLicense,
  hashLicense,
  maskCnic,
  maskPhone,
  validateCnic,
  validatePhone,
  validateNtn,
  validateSecp,
  validateLicense,
} from '@/lib/kycCrypto';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type AgentType = 'individual' | 'agency' | 'freelance';
export type AgentSpecialization = 'residential' | 'commercial' | 'plots' | 'rental' | 'luxury' | 'industrial' | 'all';
export type AgentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'info_required';

// Enhanced Badge System (Hierarchical)
export type AgentBadge =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'highrise_verified'
  | 'top_performer'
  | 'quick_responder'
  | 'customer_choice'
  | 'premium_member';

// Verification Level (Granular)
export type VerificationLevel =
  | 'not_verified'
  | 'documents_pending'
  | 'basic_verified'
  | 'license_verified'
  | 'full_verified'
  | 'premium_verified';

// ============================================
// SUB-DOCUMENT INTERFACES
// ============================================

export interface IAgentExperience {
  years: number;
  totalDeals?: number;
  totalValue?: number;
  specializations?: AgentSpecialization[];
}

export interface IAgentAreas {
  cities: string[];
  localities: string[];
}

export interface IAgentStats {
  activeListings: number;
  totalListings: number;
  soldProperties: number;
  rentedProperties: number;
  averageResponseTime?: number;
  responseRate?: number;
  totalLeads?: number;
  convertedLeads?: number;
}

export interface IAgentRatings {
  averageRating: number;
  totalReviews: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  lastReviewAt?: Date;
}

// V6.8.8: Admin-curated review subdocument
export type ReviewSource =
  | "admin_verified"           // Admin phone interview with buyer
  | "client_testimonial"       // Direct client testimonial (verified)
  | "post_transaction"         // From verified completed deal
  | "highrise_investigation";  // Highrise team's internal rating

export interface IAgentReview {
  _id?: Types.ObjectId;
  rating:          number;              // 1-5
  reviewText:      string;              // The actual review content
  reviewerName:    string;              // e.g. "Ahmed Khan" or "Verified Client"
  reviewerCity?:   string;              // e.g. "Islamabad"
  source:          ReviewSource;        // How admin obtained this review
  adminNotes?:     string;              // Internal notes (not shown publicly)
  addedBy:         Types.ObjectId;      // Admin user ID
  addedAt:         Date;
  editedBy?:       Types.ObjectId;
  editedAt?:       Date;
  isPublished:     boolean;             // Admin toggle for visibility
  transactionRef?: string;              // Optional: property/deal reference
}

export interface IAgentSocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
  tiktok?: string;
  website?: string;
}

export interface IAgentDocuments {
  cnicFront?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
    expiresAt?: Date;
    verifiedAt?: Date;
    verifiedBy?: Types.ObjectId;
  };
  cnicBack?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
  };
  license?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
    expiresAt?: Date;
    verifiedAt?: Date;
    verifiedBy?: Types.ObjectId;
    issuer?: string;
  };
  certificates?: Array<{
    url: string;
    publicId: string;
    title: string;
    issuedBy: string;
    issuedAt?: Date;
    uploadedAt: Date;
  }>;
  profilePhoto?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
  };
  coverPhoto?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
  };
  ntnCertificate?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
    verifiedAt?: Date;
  };
  secpCertificate?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
    verifiedAt?: Date;
  };
}

export interface IOfficeVerification {
  address: string;
  city: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  photos?: Array<{
    url: string;
    publicId: string;
    uploadedAt: Date;
    description?: string;
  }>;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  verificationNotes?: string;
  isActive: boolean;
}

export interface ITrustScore {
  overall: number;
  breakdown: {
    profileComplete: number;
    documentsVerified: number;
    officeVerified: number;
    customerRatings: number;
    dealHistory: number;
    responseTime: number;
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
// MAIN AGENT PROFILE INTERFACE
// ============================================

export interface IAgentProfile extends Document {
  user: Types.ObjectId;
  slug: string;
  displayName: string;
  tagline?: string;
  about?: string;
  agentType: AgentType;
  specializations: AgentSpecialization[];
  languages: string[];
  agencyName?: string;
  agencyLogo?: {
    url: string;
    publicId: string;
  };
  agencySize?: 'solo' | 'small' | 'medium' | 'large';
  cnicEncrypted?: string;
  cnicHash: string;
  cnicVerified: boolean;
  cnicVerifiedAt?: Date;
  licenseEncrypted?: string;
  licenseHash?: string;
  licenseVerified: boolean;
  licenseVerifiedAt?: Date;
  licenseIssuer?: string;
  ntnEncrypted?: string;
  ntnHash?: string;
  ntnVerified: boolean;
  secpEncrypted?: string;
  secpHash?: string;
  secpVerified: boolean;
  phoneEncrypted: string;
  phoneHash: string;
  whatsappEncrypted?: string;
  email: string;
  officeVerification?: IOfficeVerification;
  city: string;
  operatingCities: string[];
  documents: IAgentDocuments;
  experience: IAgentExperience;
  serviceAreas: IAgentAreas;
  stats: IAgentStats;
  ratings: IAgentRatings;
  trustScore: ITrustScore;
  socialLinks?: IAgentSocialLinks;
  status: AgentStatus;
  verificationLevel: VerificationLevel;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  rejectionReason?: string;
  submittedForReviewAt?: Date;
  badges: AgentBadge[];
  badgeHistory?: Array<{
    badge: AgentBadge;
    earnedAt: Date;
    criteria?: string;
  }>;

  // V6.8.8: Admin-curated reviews (never from public submissions)
  reviews?: IAgentReview[];

  memberSince: Date;
  isPremium: boolean;
  premiumUntil?: Date;
  premiumTier?: 'basic' | 'pro' | 'enterprise';
  isFeatured: boolean;
  featuredUntil?: Date;
  featuredPriority?: number;
  isAvailable: boolean;
  availabilityNote?: string;
  businessHours?: {
    weekdays?: string;
    weekends?: string;
  };
  auditTrail: IAuditEntry[];
  lastActivityAt?: Date;
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  deletionReason?: string;
  createdAt: Date;
  updatedAt: Date;

  // ─── V5.8.0: Additional fields from onboarding form ───
  /** URL of uploaded verification document (license, letterhead, certificate) */
  licenseDocumentUrl?: string;
  /** SECP or local registration number (alphanumeric, optional) */
  companyRegNo?: string;
  /** Alternative business contact email (defaults to User.email) */
  contactEmail?: string;
  /** Name of representative submitting application */
  representativeName?: string;
  /** Role of representative (CEO, Owner, Director, Manager, etc.) */
  representativeRole?: string;
  /** Admin's reason when status === 'info_required' (V5.8.0) */
  infoRequiredReason?: string;

  // Instance Methods
  getCNIC(): string | null;
  getPhone(): string | null;
  getLicense(): string | null;
  getNTN(): string | null;
  getSECP(): string | null;
  getMaskedCNIC(): string;
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
// HELPER FUNCTIONS
// ============================================

function getBadgeCriteriaText(badge: AgentBadge): string {
  const criteria: Record<AgentBadge, string> = {
    bronze: '1+ active listings or deals',
    silver: '11+ listings, 6+ deals',
    gold: '26+ listings, 16+ deals',
    platinum: '51+ listings, 31+ deals',
    highrise_verified: 'Office verified, 50+ deals, CNIC & license verified',
    top_performer: 'Top 10% in city (monthly)',
    quick_responder: '<30min response time, 90%+ response rate',
    customer_choice: '4.5+ rating, 50+ reviews',
    premium_member: 'Active premium subscription',
  };
  return criteria[badge] || 'Badge earned';
}

// ============================================
// SUB-SCHEMAS
// ============================================

const ExperienceSchema = new Schema(
  {
    years: { type: Number, default: 0, min: 0, max: 50 },
    totalDeals: { type: Number, default: 0, min: 0 },
    totalValue: { type: Number, default: 0, min: 0 },
    specializations: [
      {
        type: String,
        enum: ['residential', 'commercial', 'plots', 'rental', 'luxury', 'industrial', 'all'],
      },
    ],
  },
  { _id: false }
);

const ServiceAreasSchema = new Schema(
  {
    cities: [{ type: String, trim: true }],
    localities: [{ type: String, trim: true }],
  },
  { _id: false }
);

const StatsSchema = new Schema(
  {
    activeListings: { type: Number, default: 0, min: 0 },
    totalListings: { type: Number, default: 0, min: 0 },
    soldProperties: { type: Number, default: 0, min: 0 },
    rentedProperties: { type: Number, default: 0, min: 0 },
    averageResponseTime: { type: Number, min: 0 },
    responseRate: { type: Number, min: 0, max: 100 },
    totalLeads: { type: Number, default: 0, min: 0 },
    convertedLeads: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const RatingsSchema = new Schema(
  {
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    breakdown: {
      5: { type: Number, default: 0, min: 0 },
      4: { type: Number, default: 0, min: 0 },
      3: { type: Number, default: 0, min: 0 },
      2: { type: Number, default: 0, min: 0 },
      1: { type: Number, default: 0, min: 0 },
    },
    lastReviewAt: { type: Date },
  },
  { _id: false }
);

const TrustScoreSchema = new Schema(
  {
    overall: { type: Number, default: 0, min: 0, max: 100 },
    breakdown: {
      profileComplete: { type: Number, default: 0, min: 0, max: 20 },
      documentsVerified: { type: Number, default: 0, min: 0, max: 25 },
      officeVerified: { type: Number, default: 0, min: 0, max: 15 },
      customerRatings: { type: Number, default: 0, min: 0, max: 20 },
      dealHistory: { type: Number, default: 0, min: 0, max: 15 },
      responseTime: { type: Number, default: 0, min: 0, max: 5 },
    },
    lastCalculated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OfficeVerificationSchema = new Schema(
  {
    address: { type: String, required: true },
    city: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    photos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        description: { type: String },
      },
    ],
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationNotes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const AuditEntrySchema = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now },
    changes: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { _id: true }
);

// V6.8.8: Review subdocument schema — admin-curated only
const ReviewSchema = new Schema<IAgentReview>(
  {
    rating: {
      type:     Number,
      required: true,
      min:      1,
      max:      5,
    },
    reviewText: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: [10, 'Review must be at least 10 characters'],
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },
    reviewerName: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 2,
      maxlength: 80,
    },
    reviewerCity: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    source: {
      type: String,
      enum: {
        values: [
          'admin_verified',
          'client_testimonial',
          'post_transaction',
          'highrise_investigation',
        ],
        message: '{VALUE} is not a valid review source',
      },
      required: true,
    },
    adminNotes: {
      type:      String,
      trim:      true,
      maxlength: 500,
    },
    addedBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    addedAt: {
      type:    Date,
      default: Date.now,
      required: true,
    },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref:  'User',
    },
    editedAt: { type: Date },
    isPublished: {
      type:    Boolean,
      default: true,
    },
    transactionRef: {
      type:      String,
      trim:      true,
      maxlength: 100,
    },
  },
  { _id: true, timestamps: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const AgentProfileSchema = new Schema<IAgentProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [3, 'Display name must be at least 3 characters'],
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: [200, 'Tagline cannot exceed 200 characters'],
    },
    about: {
      type: String,
      trim: true,
      maxlength: [2000, 'About section cannot exceed 2000 characters'],
    },
    agentType: {
      type: String,
      enum: {
        values: ['individual', 'agency', 'freelance'],
        message: '{VALUE} is not a valid agent type',
      },
      default: 'individual',
      required: true,
    },
    specializations: [
      {
        type: String,
        enum: {
          values: ['residential', 'commercial', 'plots', 'rental', 'luxury', 'industrial', 'all'],
          message: '{VALUE} is not a valid specialization',
        },
      },
    ],
    languages: [{ type: String, trim: true }],
    agencyName: {
      type: String,
      trim: true,
      maxlength: [150, 'Agency name cannot exceed 150 characters'],
    },
    agencyLogo: {
      url: { type: String },
      publicId: { type: String },
    },
    agencySize: {
      type: String,
      enum: ['solo', 'small', 'medium', 'large'],
    },
    cnicEncrypted: {
      type: String,
      select: false,
    },
    cnicHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    cnicVerified: { type: Boolean, default: false, index: true },
    cnicVerifiedAt: { type: Date },
    licenseEncrypted: {
      type: String,
      select: false,
    },
    licenseHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    licenseVerified: { type: Boolean, default: false, index: true },
    licenseVerifiedAt: { type: Date },
    licenseIssuer: { type: String, trim: true },

    // ─── V5.8.0: Verification document URL ───
    // Top-level field for the uploaded license/letterhead/certificate document
    // Cloudinary URL — admin views this to verify the agent
    licenseDocumentUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    ntnEncrypted: {
      type: String,
      select: false,
    },
    ntnHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    ntnVerified: { type: Boolean, default: false },
    secpEncrypted: {
      type: String,
      select: false,
    },
    secpHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    secpVerified: { type: Boolean, default: false },

    // ─── V5.8.0: Company registration number ───
    // Non-encrypted (public business identifier)
    // Used when SECP is not applicable but local registration exists
    companyRegNo: {
      type: String,
      trim: true,
      maxlength: 50,
      sparse: true,
      index: true,
    },

    phoneEncrypted: {
      type: String,
      required: [true, 'Phone number is required'],
      select: false,
    },
    phoneHash: {
      type: String,
      required: true,
      index: true,
    },
    whatsappEncrypted: {
      type: String,
      select: false,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },

    // ─── V5.8.0: Alternative business contact email ───
    // Optional — if agency uses a different email for business inquiries
    // Falls back to `email` field if not set
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },

    // ─── V5.8.0: Representative who submitted the application ───
    representativeName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    representativeRole: {
      type: String,
      trim: true,
      maxlength: 60,
    },

    officeVerification: {
      type: OfficeVerificationSchema,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    operatingCities: [{ type: String, trim: true }],
    documents: {
      cnicFront: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
        expiresAt: { type: Date },
        verifiedAt: { type: Date },
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
      cnicBack: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
      },
      license: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
        expiresAt: { type: Date },
        verifiedAt: { type: Date },
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        issuer: { type: String },
      },
      certificates: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
          title: { type: String, required: true },
          issuedBy: { type: String, required: true },
          issuedAt: { type: Date },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      profilePhoto: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
      },
      coverPhoto: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
      },
      ntnCertificate: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
        verifiedAt: { type: Date },
      },
      secpCertificate: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
        verifiedAt: { type: Date },
      },
    },
    experience: {
      type: ExperienceSchema,
      default: () => ({ years: 0, totalDeals: 0, totalValue: 0 }),
    },
    serviceAreas: {
      type: ServiceAreasSchema,
      default: () => ({ cities: [], localities: [] }),
    },
    stats: {
      type: StatsSchema,
      default: () => ({
        activeListings: 0,
        totalListings: 0,
        soldProperties: 0,
        rentedProperties: 0,
        totalLeads: 0,
        convertedLeads: 0,
      }),
    },
    ratings: {
      type: RatingsSchema,
      default: () => ({
        averageRating: 0,
        totalReviews: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      }),
    },
    trustScore: {
      type: TrustScoreSchema,
      default: () => ({
        overall: 0,
        breakdown: {
          profileComplete: 0,
          documentsVerified: 0,
          officeVerified: 0,
          customerRatings: 0,
          dealHistory: 0,
          responseTime: 0,
        },
        lastCalculated: new Date(),
      }),
    },
    socialLinks: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      youtube: { type: String, trim: true },
      twitter: { type: String, trim: true },
      tiktok: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'pending', 'approved', 'rejected', 'suspended', 'info_required'],
        message: '{VALUE} is not a valid status',
      },
      default: 'draft',
      index: true,
    },

    // ─── V5.8.0: Reason when admin requests more info ───
    // Set by admin when status changes to 'info_required'
    // Shown to agent in dashboard so they know what to fix
    infoRequiredReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    verificationLevel: {
      type: String,
      enum: {
        values: [
          'not_verified',
          'documents_pending',
          'basic_verified',
          'license_verified',
          'full_verified',
          'premium_verified',
        ],
        message: '{VALUE} is not a valid verification level',
      },
      default: 'not_verified',
      index: true,
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    submittedForReviewAt: { type: Date },
    badges: [
      {
        type: String,
        enum: {
          values: [
            'bronze',
            'silver',
            'gold',
            'platinum',
            'highrise_verified',
            'top_performer',
            'quick_responder',
            'customer_choice',
            'premium_member',
          ],
          message: '{VALUE} is not a valid badge',
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

    // V6.8.8: Admin-curated reviews (embedded, sorted by addedAt DESC)
    reviews: [ReviewSchema],

    memberSince: { type: Date, default: Date.now },
    isPremium: { type: Boolean, default: false, index: true },
    premiumUntil: { type: Date },
    premiumTier: {
      type: String,
      enum: ['basic', 'pro', 'enterprise'],
    },
    isFeatured: { type: Boolean, default: false, index: true },
    featuredUntil: { type: Date },
    featuredPriority: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
    availabilityNote: { type: String, maxlength: 200 },
    businessHours: {
      weekdays: { type: String, default: '9 AM - 6 PM' },
      weekends: { type: String, default: '10 AM - 2 PM' },
    },
    auditTrail: [AuditEntrySchema],
    lastActivityAt: { type: Date },
    suspensionReason: { type: String },
    suspendedAt: { type: Date },
    suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletionReason: { type: String },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================
// Unique indexes (slug, cnicHash, licenseHash, ntnHash, secpHash) are declared
// INLINE in field definitions (unique: true, sparse: true) — don't redeclare here.
// Only declare COMPOUND indexes and additional single-field indexes below.

AgentProfileSchema.index({ city: 1, status: 1 });
AgentProfileSchema.index({ 'serviceAreas.cities': 1 });
AgentProfileSchema.index({ 'serviceAreas.localities': 1 });
AgentProfileSchema.index({ specializations: 1 });
AgentProfileSchema.index({ agentType: 1 });
AgentProfileSchema.index({ verificationLevel: 1, status: 1 });
AgentProfileSchema.index({ 'ratings.averageRating': -1 });
AgentProfileSchema.index({ 'trustScore.overall': -1 });
AgentProfileSchema.index({ status: 1, isDeleted: 1 });
AgentProfileSchema.index({ isFeatured: 1, featuredPriority: -1 });
AgentProfileSchema.index({ isPremium: 1, premiumUntil: -1 });
AgentProfileSchema.index({ 'documents.cnicFront.expiresAt': 1 }, { sparse: true });
AgentProfileSchema.index({ 'documents.license.expiresAt': 1 }, { sparse: true });

// Full-text search index
AgentProfileSchema.index({
  displayName: 'text',
  agencyName: 'text',
  about: 'text',
  'serviceAreas.localities': 'text',
  tagline: 'text',
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

AgentProfileSchema.pre('save', async function (next) {
  try {
    // 1. Auto-generate slug
    if (!this.slug && this.displayName) {
      const baseSlug = this.displayName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const randomSuffix = crypto.randomBytes(3).toString('hex');
      this.slug = `${baseSlug}-${randomSuffix}`;
    }

    // 2. Set whatsapp from phone if empty
    if (!this.whatsappEncrypted && this.phoneEncrypted) {
      this.whatsappEncrypted = this.phoneEncrypted;
    }

    // 3. Validate operating cities
    if (this.operatingCities && !this.operatingCities.includes(this.city)) {
      this.operatingCities.push(this.city);
    }

    // 4. Auto-update verification level based on status
    if (this.status === 'approved') {
      if (this.isPremium && this.officeVerification?.verifiedAt) {
        this.verificationLevel = 'premium_verified';
      } else if (this.officeVerification?.verifiedAt) {
        this.verificationLevel = 'full_verified';
      } else if (this.cnicVerified && this.licenseVerified) {
        this.verificationLevel = 'license_verified';
      } else if (this.cnicVerified) {
        this.verificationLevel = 'basic_verified';
      }
    } else if (this.status === 'pending' || this.status === 'info_required') {
      this.verificationLevel = 'documents_pending';
    } else if (this.status === 'draft') {
      this.verificationLevel = 'not_verified';
    }

    // 5. Update last activity
    if (this.isModified() && !this.isNew) {
      this.lastActivityAt = new Date();
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// ============================================
// INSTANCE METHODS
// ============================================

AgentProfileSchema.methods.getCNIC = function (this: IAgentProfile): string | null {
  if (!this.cnicEncrypted) return null;
  try {
    return decryptCnic(this.cnicEncrypted);
  } catch {
    // Decryption failure — return null silently
    // Caller treats null as "not available"
    return null;
  }
};

AgentProfileSchema.methods.getPhone = function (this: IAgentProfile): string | null {
  if (!this.phoneEncrypted) return null;
  try {
    return decryptPhone(this.phoneEncrypted);
  } catch {
    return null;
  }
};

AgentProfileSchema.methods.getLicense = function (this: IAgentProfile): string | null {
  if (!this.licenseEncrypted) return null;
  try {
    return decryptLicense(this.licenseEncrypted);
  } catch {
    return null;
  }
};

AgentProfileSchema.methods.getNTN = function (this: IAgentProfile): string | null {
  if (!this.ntnEncrypted) return null;
  try {
    return decryptNtn(this.ntnEncrypted);
  } catch {
    return null;
  }
};

AgentProfileSchema.methods.getSECP = function (this: IAgentProfile): string | null {
  if (!this.secpEncrypted) return null;
  try {
    return decryptSecp(this.secpEncrypted);
  } catch {
    return null;
  }
};

AgentProfileSchema.methods.getMaskedCNIC = function (this: IAgentProfile): string {
  const cnic = this.getCNIC();
  return cnic ? maskCnic(cnic) : 'Not provided';
};

AgentProfileSchema.methods.getMaskedPhone = function (this: IAgentProfile): string {
  const phone = this.getPhone();
  return phone ? maskPhone(phone) : 'Not provided';
};

AgentProfileSchema.methods.calculateTrustScore = async function (
  this: IAgentProfile
): Promise<ITrustScore> {
  const breakdown = {
    profileComplete: 0,
    documentsVerified: 0,
    officeVerified: 0,
    customerRatings: 0,
    dealHistory: 0,
    responseTime: 0,
  };

  // 1. Profile Completeness (0-20 points)
  let completeness = 0;
  if (this.displayName) completeness += 3;
  if (this.about && this.about.length > 100) completeness += 4;
  if (this.tagline) completeness += 2;
  if (this.documents?.profilePhoto?.url) completeness += 3;
  if (this.documents?.coverPhoto?.url) completeness += 2;
  if (this.socialLinks?.facebook || this.socialLinks?.instagram) completeness += 2;
  if (this.experience.years > 0) completeness += 2;
  if (this.serviceAreas.cities.length > 0) completeness += 2;
  breakdown.profileComplete = Math.min(completeness, 20);

  // 2. Documents Verified (0-25 points)
  let docsScore = 0;
  if (this.cnicVerified) docsScore += 10;
  if (this.licenseVerified) docsScore += 10;
  if (this.ntnVerified) docsScore += 3;
  if (this.secpVerified) docsScore += 2;
  breakdown.documentsVerified = Math.min(docsScore, 25);

  // 3. Office Verified (0-15 points)
  if (this.officeVerification?.verifiedAt) {
    breakdown.officeVerified = 15;
  } else if (this.officeVerification?.address) {
    breakdown.officeVerified = 5;
  }

  // 4. Customer Ratings (0-20 points)
  if (this.ratings.totalReviews > 0) {
    const ratingScore = (this.ratings.averageRating / 5) * 15;
    const reviewBonus = Math.min(this.ratings.totalReviews / 10, 5);
    breakdown.customerRatings = Math.min(ratingScore + reviewBonus, 20);
  }

  // 5. Deal History (0-15 points)
  const totalDeals = (this.stats.soldProperties || 0) + (this.stats.rentedProperties || 0);
  if (totalDeals > 0) {
    breakdown.dealHistory = Math.min(totalDeals * 0.5, 15);
  }

  // 6. Response Time (0-5 points)
  if (this.stats.averageResponseTime !== undefined && this.stats.averageResponseTime > 0) {
    if (this.stats.averageResponseTime <= 30) {
      breakdown.responseTime = 5;
    } else if (this.stats.averageResponseTime <= 60) {
      breakdown.responseTime = 3;
    } else if (this.stats.averageResponseTime <= 120) {
      breakdown.responseTime = 1;
    }
  }

  const overall = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  this.trustScore = {
    overall: Math.round(overall),
    breakdown,
    lastCalculated: new Date(),
  };

  return this.trustScore;
};

AgentProfileSchema.methods.updateBadges = async function (this: IAgentProfile): Promise<void> {
  const newBadges: AgentBadge[] = [];
  const totalDeals = (this.stats.soldProperties || 0) + (this.stats.rentedProperties || 0);
  const activeListings = this.stats.activeListings || 0;

  if (activeListings >= 51 && totalDeals >= 31) {
    newBadges.push('platinum');
  } else if (activeListings >= 26 && totalDeals >= 16) {
    newBadges.push('gold');
  } else if (activeListings >= 11 && totalDeals >= 6) {
    newBadges.push('silver');
  } else if (activeListings > 0 || totalDeals > 0) {
    newBadges.push('bronze');
  }

  if (
    this.officeVerification?.verifiedAt &&
    totalDeals >= 50 &&
    this.cnicVerified &&
    this.licenseVerified
  ) {
    newBadges.push('highrise_verified');
  }

  if (
    this.stats.averageResponseTime !== undefined &&
    this.stats.averageResponseTime <= 30 &&
    this.stats.responseRate !== undefined &&
    this.stats.responseRate >= 90
  ) {
    newBadges.push('quick_responder');
  }

  if (this.ratings.averageRating >= 4.5 && this.ratings.totalReviews >= 50) {
    newBadges.push('customer_choice');
  }

  if (this.isPremium && this.premiumUntil && this.premiumUntil > new Date()) {
    newBadges.push('premium_member');
  }

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

AgentProfileSchema.methods.addAuditEntry = async function (
  this: IAgentProfile,
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

AgentProfileSchema.virtual('experienceLabel').get(function (this: IAgentProfile) {
  const years = this.experience?.years || 0;
  if (years === 0) return 'New Agent';
  if (years === 1) return '1 Year Experience';
  return `${years} Years Experience`;
});

AgentProfileSchema.virtual('isVerified').get(function (this: IAgentProfile) {
  return (
    this.verificationLevel !== 'not_verified' &&
    this.verificationLevel !== 'documents_pending' &&
    this.status === 'approved'
  );
});

AgentProfileSchema.virtual('profileUrl').get(function (this: IAgentProfile) {
  return `/agent/${this.slug}`;
});

AgentProfileSchema.virtual('conversionRate').get(function (this: IAgentProfile) {
  if (!this.stats.totalLeads || this.stats.totalLeads === 0) return 0;
  const converted = this.stats.convertedLeads || 0;
  return Math.round((converted / this.stats.totalLeads) * 100);
});

AgentProfileSchema.set('toJSON', { virtuals: true });
AgentProfileSchema.set('toObject', { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

AgentProfileSchema.statics.findByCNIC = async function (cnic: string) {
  const validation = validateCnic(cnic);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid CNIC');
  }

  const cnicHashValue = hashCnic(cnic);
  return this.findOne({ cnicHash: cnicHashValue, isDeleted: false });
};

AgentProfileSchema.statics.findByLicense = async function (licenseNumber: string) {
  const licenseHashValue = hashLicense(licenseNumber);
  return this.findOne({ licenseHash: licenseHashValue, isDeleted: false });
};

AgentProfileSchema.statics.findByPhone = async function (phone: string) {
  const validation = validatePhone(phone);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid phone number');
  }

  const phoneHashValue = hashPhone(phone);
  return this.findOne({ phoneHash: phoneHashValue, isDeleted: false });
};

AgentProfileSchema.statics.getExpiringDocuments = async function (daysAhead = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.find({
    status: 'approved',
    isDeleted: false,
    $or: [
      { 'documents.cnicFront.expiresAt': { $lte: futureDate, $gte: new Date() } },
      { 'documents.license.expiresAt': { $lte: futureDate, $gte: new Date() } },
    ],
  }).select('displayName email documents.cnicFront.expiresAt documents.license.expiresAt');
};

// ============================================
// MODEL EXPORT
// ============================================

const AgentProfile =
  (mongoose.models.AgentProfile as mongoose.Model<IAgentProfile>) ||
  mongoose.model<IAgentProfile>('AgentProfile', AgentProfileSchema);

export default AgentProfile;
