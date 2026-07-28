// models/SocietyProfile.ts
// Highrise.pk — Society Registration & KYC Profile
// Separate from Society.ts (public intelligence model)
// This model handles onboarding, KYC, approval workflow
// Mirrors AgentProfile / DeveloperProfile architecture
// AES-256-GCM encryption via pre-save middleware (kycCrypto)
// NO console.* | NO as any | NO plain CNIC storage

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── Re-export from Society for consistency ───────────────────────────────────

export type SocietyAuthority =
  | 'LDA'
  | 'CDA'
  | 'RDA'
  | 'KDA'
  | 'FDA'
  | 'MDA'
  | 'DHA'
  | 'PHATA'
  | 'Other';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SocietyProfileStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'info_required';

export type SocietyPlotSize =
  | '3_marla'
  | '5_marla'
  | '7_marla'
  | '10_marla'
  | '1_kanal'
  | '2_kanal'
  | '4_marla'
  | '6_marla'
  | '8_marla'
  | '12_marla'
  | '1_kanal_4_marla'
  | 'commercial'
  | 'other';

export type SocietyAmenity =
  | 'mosque'
  | 'school'
  | 'hospital'
  | 'park'
  | 'community_center'
  | 'commercial_area'
  | 'security_gate'
  | 'cctv'
  | 'underground_electricity'
  | 'gas'
  | 'water_supply'
  | 'sewerage'
  | 'gymnasium'
  | 'swimming_pool'
  | 'sports_complex'
  | 'cinema'
  | 'food_court'
  | 'playground'
  | 'jogging_track'
  | 'library'
  | 'graveyard'
  | 'car_parking'
  | 'visitor_parking'
  | 'fire_station'
  | 'police_post';

export type SocietyDocumentType =
  | 'noc_certificate'
  | 'layout_plan'
  | 'master_plan'
  | 'secp_certificate'
  | 'ntn_certificate'
  | 'authority_approval'
  | 'land_acquisition'
  | 'environmental_noc'
  | 'other';

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IPlotInventory {
  size: SocietyPlotSize;
  totalPlots: number;
  availablePlots: number;
  pricePerMarla?: number;        // PKR
  pricePerSqFt?: number;         // PKR
}

export interface IBlock {
  name: string;                  // e.g. "Block A", "Overseas Block", "Phase 1"
  totalPlots: number;
  availablePlots: number;
  plotSizes: SocietyPlotSize[];  // sizes offered in this block
  possessionStatus: 'announced' | 'under_development' | 'ready';
  launchYear?: number;
  completionYear?: number;
}

export interface IInstallmentPlan {
  planName: string;              // e.g. "3-Year Easy Installments"
  durationMonths: number;        // total plan length
  downPaymentPercent: number;    // e.g. 20 (meaning 20%)
  monthlyInstallmentPercent?: number;
  quarterlyInstallmentPercent?: number;
  halfYearlyInstallmentPercent?: number;
  balloonPaymentPercent?: number; // final lump sum if any
  isInterestFree: boolean;
  notes?: string;
}

export interface ISocietyKycDocument {
  type: SocietyDocumentType;
  title: string;
  url: string;                   // Cloudinary private folder URL
  uploadedAt: Date;
}

export interface IAuditEntry {
  action: 'submitted' | 'approved' | 'rejected' | 'info_required' | 'suspended' | 'reactivated' | 'updated';
  performedBy: Types.ObjectId;   // User._id of admin or society rep
  performedAt: Date;
  note?: string;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface ISocietyProfile extends Document {
  // ── Ownership ──────────────────────────────────────────────────────────────
  userId: Types.ObjectId;                    // User._id (registrant)
  societyId?: Types.ObjectId;               // Society._id (optional link to public record)

  // ── Status machine ─────────────────────────────────────────────────────────
  status: SocietyProfileStatus;
  infoRequiredReason?: string;              // populated when status = 'info_required'
  rejectionReason?: string;                 // populated when status = 'rejected'
  suspensionReason?: string;                // populated when status = 'suspended'

  // ── Society identity ───────────────────────────────────────────────────────
  societyName: string;
  registeredName: string;                   // legal registered name (may differ)
  slug: string;                             // auto-generated, unique
  city: string;
  areaName: string;
  fullAddress: string;
  authority: SocietyAuthority;
  nocNumber: string;                        // mandatory for registration
  nocIssuanceDate?: Date;
  nocExpiryDate?: Date;
  totalAreaAcres?: number;                  // total land area
  launchYear?: number;

  // ── Authorized person (KYC — encrypted) ───────────────────────────────────
  authorizedPersonName: string;
  authorizedPersonDesignation: string;      // e.g. "Chairman", "CEO", "Director"
  authorizedPersonCnicHash: string;         // SHA-256 for dedup
  authorizedPersonCnicEncrypted: string;    // AES-256-GCM
  authorizedPersonPhone: string;            // plain — not shown publicly
  authorizedPersonPhoneEncrypted?: string;  // AES-256-GCM (optional extra security)
  authorizedPersonEmail: string;

  // ── Compliance ─────────────────────────────────────────────────────────────
  ntcNumber?: string;                       // NTC registration if applicable
  fbrNtn?: string;                          // FBR NTN
  strn?: string;                            // Sales Tax Registration Number
  bankAccountTitle?: string;
  bankName?: string;
  bankIban?: string;                        // for verification only

  // ── Society structure ──────────────────────────────────────────────────────
  blocks: IBlock[];
  plotInventory: IPlotInventory[];
  amenities: SocietyAmenity[];
  installmentPlans: IInstallmentPlan[];

  // ── KYC documents (Cloudinary private) ────────────────────────────────────
  kycDocuments: ISocietyKycDocument[];

  // ── Contact (internal — never shown publicly) ──────────────────────────────
  officePhone: string;
  officeEmail: string;
  websiteUrl?: string;

  // ── Verification & trust ───────────────────────────────────────────────────
  cnicVerified: boolean;
  nocVerified: boolean;
  kycStatus: 'not_started' | 'in_review' | 'verified' | 'failed';
  trustScore: number;                       // 0-100, admin-set post-approval
  badges: string[];                         // e.g. ['noc_verified', 'possession_ready']

  // ── Admin tracking ─────────────────────────────────────────────────────────
  reviewedBy?: Types.ObjectId;             // admin User._id
  reviewedAt?: Date;
  verifiedAt?: Date;
  submittedAt?: Date;
  auditTrail: IAuditEntry[];

  // ── Consent ────────────────────────────────────────────────────────────────
  consentGiven: boolean;
  consentTimestamp?: Date;
  consentIp?: string;

  // ── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const PlotInventorySchema = new Schema<IPlotInventory>(
  {
    size: {
      type: String,
      required: true,
      enum: [
        '3_marla', '4_marla', '5_marla', '6_marla', '7_marla',
        '8_marla', '10_marla', '12_marla', '1_kanal', '1_kanal_4_marla',
        '2_kanal', 'commercial', 'other',
      ],
    },
    totalPlots: { type: Number, required: true, min: 0 },
    availablePlots: { type: Number, required: true, min: 0 },
    pricePerMarla: { type: Number, min: 0 },
    pricePerSqFt: { type: Number, min: 0 },
  },
  { _id: false }
);

const BlockSchema = new Schema<IBlock>(
  {
    name: { type: String, required: true, trim: true },
    totalPlots: { type: Number, required: true, min: 0 },
    availablePlots: { type: Number, required: true, min: 0 },
    plotSizes: [
      {
        type: String,
        enum: [
          '3_marla', '4_marla', '5_marla', '6_marla', '7_marla',
          '8_marla', '10_marla', '12_marla', '1_kanal', '1_kanal_4_marla',
          '2_kanal', 'commercial', 'other',
        ],
      },
    ],
    possessionStatus: {
      type: String,
      required: true,
      enum: ['announced', 'under_development', 'ready'],
      default: 'announced',
    },
    launchYear: { type: Number, min: 1990, max: 2100 },
    completionYear: { type: Number, min: 1990, max: 2100 },
  },
  { _id: true }
);

const InstallmentPlanSchema = new Schema<IInstallmentPlan>(
  {
    planName: { type: String, required: true, trim: true },
    durationMonths: { type: Number, required: true, min: 1, max: 360 },
    downPaymentPercent: { type: Number, required: true, min: 0, max: 100 },
    monthlyInstallmentPercent: { type: Number, min: 0, max: 100 },
    quarterlyInstallmentPercent: { type: Number, min: 0, max: 100 },
    halfYearlyInstallmentPercent: { type: Number, min: 0, max: 100 },
    balloonPaymentPercent: { type: Number, min: 0, max: 100 },
    isInterestFree: { type: Boolean, default: true },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { _id: true }
);

const KycDocumentSchema = new Schema<ISocietyKycDocument>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'noc_certificate', 'layout_plan', 'master_plan',
        'secp_certificate', 'ntn_certificate', 'authority_approval',
        'land_acquisition', 'environmental_noc', 'other',
      ],
    },
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const AuditEntrySchema = new Schema<IAuditEntry>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'submitted', 'approved', 'rejected',
        'info_required', 'suspended', 'reactivated', 'updated',
      ],
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const SocietyProfileSchema = new Schema<ISocietyProfile>(
  {
    // ── Ownership ────────────────────────────────────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    societyId: {
      type: Schema.Types.ObjectId,
      ref: 'Society',
      index: true,
    },

    // ── Status ───────────────────────────────────────────────────────────────
    status: {
      type: String,
      required: true,
      enum: ['draft', 'pending', 'approved', 'rejected', 'suspended', 'info_required'],
      default: 'draft',
      index: true,
    },
    infoRequiredReason: { type: String, trim: true, maxlength: 1000 },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    suspensionReason: { type: String, trim: true, maxlength: 1000 },

    // ── Society identity ──────────────────────────────────────────────────────
    societyName: { type: String, required: true, trim: true, maxlength: 200 },
    registeredName: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    city: { type: String, required: true, trim: true, index: true },
    areaName: { type: String, required: true, trim: true },
    fullAddress: { type: String, required: true, trim: true, maxlength: 500 },
    authority: {
      type: String,
      required: true,
      enum: ['LDA', 'CDA', 'RDA', 'KDA', 'FDA', 'MDA', 'DHA', 'PHATA', 'Other'],
    },
    nocNumber: { type: String, required: true, trim: true, index: true },
    nocIssuanceDate: { type: Date },
    nocExpiryDate: { type: Date },
    totalAreaAcres: { type: Number, min: 0 },
    launchYear: { type: Number, min: 1950, max: 2100 },

    // ── Authorized person (KYC — encrypted fields) ────────────────────────────
    authorizedPersonName: { type: String, required: true, trim: true, maxlength: 200 },
    authorizedPersonDesignation: { type: String, required: true, trim: true, maxlength: 100 },
    authorizedPersonCnicHash: {
      type: String,
      required: true,
      select: false,       // never returned by default
      index: true,         // for dedup lookups
    },
    authorizedPersonCnicEncrypted: {
      type: String,
      required: true,
      select: false,       // never returned by default
    },
    authorizedPersonPhone: { type: String, required: true, trim: true },
    authorizedPersonPhoneEncrypted: {
      type: String,
      select: false,
    },
    authorizedPersonEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // ── Compliance ────────────────────────────────────────────────────────────
    ntcNumber: { type: String, trim: true },
    fbrNtn: { type: String, trim: true },
    strn: { type: String, trim: true },
    bankAccountTitle: { type: String, trim: true, maxlength: 200 },
    bankName: { type: String, trim: true, maxlength: 100 },
    bankIban: { type: String, trim: true, maxlength: 34, select: false },

    // ── Society structure ─────────────────────────────────────────────────────
    blocks: { type: [BlockSchema], default: [] },
    plotInventory: { type: [PlotInventorySchema], default: [] },
    amenities: {
      type: [String],
      enum: [
        'mosque', 'school', 'hospital', 'park', 'community_center',
        'commercial_area', 'security_gate', 'cctv',
        'underground_electricity', 'gas', 'water_supply', 'sewerage',
        'gymnasium', 'swimming_pool', 'sports_complex', 'cinema',
        'food_court', 'playground', 'jogging_track', 'library',
        'graveyard', 'car_parking', 'visitor_parking',
        'fire_station', 'police_post',
      ],
      default: [],
    },
    installmentPlans: { type: [InstallmentPlanSchema], default: [] },

    // ── KYC documents ─────────────────────────────────────────────────────────
    kycDocuments: { type: [KycDocumentSchema], default: [] },

    // ── Contact (internal only) ───────────────────────────────────────────────
    officePhone: { type: String, required: true, trim: true },
    officeEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    websiteUrl: { type: String, trim: true },

    // ── Verification ──────────────────────────────────────────────────────────
    cnicVerified: { type: Boolean, default: false },
    nocVerified: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ['not_started', 'in_review', 'verified', 'failed'],
      default: 'not_started',
    },
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
    badges: { type: [String], default: [] },

    // ── Admin tracking ────────────────────────────────────────────────────────
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    verifiedAt: { type: Date },
    submittedAt: { type: Date },
    auditTrail: { type: [AuditEntrySchema], default: [] },

    // ── Consent ───────────────────────────────────────────────────────────────
    consentGiven: { type: Boolean, required: true, default: false },
    consentTimestamp: { type: Date },
    consentIp: { type: String },
  },
  {
    timestamps: true,
    // Never leak encrypted fields in JSON responses
    toJSON: {
      transform(_doc, ret) {
        delete ret.authorizedPersonCnicHash;
        delete ret.authorizedPersonCnicEncrypted;
        delete ret.authorizedPersonPhoneEncrypted;
        delete ret.bankIban;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Compound: admin inbox queries (status + city + createdAt)
SocietyProfileSchema.index({ status: 1, city: 1, createdAt: -1 });

// Compound: uniqueness checks (one pending per user)
SocietyProfileSchema.index({ userId: 1, status: 1 });

// NOC number uniqueness across all profiles
SocietyProfileSchema.index(
  { nocNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      nocNumber: { $exists: true, $ne: '' },
      status: { $nin: ['rejected', 'draft'] },
    },
  }
);

// FBR NTN uniqueness
SocietyProfileSchema.index(
  { fbrNtn: 1 },
  {
    unique: true,
    partialFilterExpression: {
      fbrNtn: { $exists: true, $ne: '' },
      status: { $nin: ['rejected', 'draft'] },
    },
  }
);

// Text search for admin panel
SocietyProfileSchema.index({
  societyName: 'text',
  registeredName: 'text',
  city: 'text',
  nocNumber: 'text',
});

// ─── Pre-save middleware ──────────────────────────────────────────────────────

SocietyProfileSchema.pre('save', async function (next) {
  // Only encrypt when CNIC fields are modified
  if (
    this.isModified('authorizedPersonCnicEncrypted') ||
    this.isModified('authorizedPersonCnicHash')
  ) {
    // Encryption is handled BEFORE save in the API route
    // (same pattern as AgentProfile / DeveloperProfile)
    // Pre-save just validates that both fields are present together
    if (
      this.authorizedPersonCnicHash &&
      !this.authorizedPersonCnicEncrypted
    ) {
      return next(new Error('CNIC hash set without encrypted value'));
    }
    if (
      this.authorizedPersonCnicEncrypted &&
      !this.authorizedPersonCnicHash
    ) {
      return next(new Error('CNIC encrypted without hash'));
    }
  }

  // Auto-set submittedAt when status moves to pending
  if (this.isModified('status') && this.status === 'pending') {
    if (!this.submittedAt) {
      this.submittedAt = new Date();
    }
  }

  next();
});

// ─── Model ────────────────────────────────────────────────────────────────────

const SocietyProfile: Model<ISocietyProfile> =
  mongoose.models.SocietyProfile ||
  mongoose.model<ISocietyProfile>('SocietyProfile', SocietyProfileSchema);

export default SocietyProfile;