// models/Society.ts
// Highrise.pk — Public Society Intelligence Model (V2)
// This is the PUBLIC intelligence record — separate from SocietyProfile.ts (KYC/onboarding)
// V2: Expanded to match API contract + admin intelligence tools
// NO console.* | NO as any

import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type NOCStatus =
  | 'approved'
  | 'pending'
  | 'under_review'
  | 'illegal'
  | 'disputed'
  | 'cancelled'
  | 'expired';

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

export type SocietyCategory =
  | 'housing_scheme'
  | 'gated_community'
  | 'apartment_complex'
  | 'commercial_zone'
  | 'mixed_use'
  | 'industrial_zone'
  | 'township';

export type LitigationStatus =
  | 'none'
  | 'minor'
  | 'major'
  | 'court_ordered_stop'
  | 'resolved';

export type OverallRiskLevel = 'safe' | 'caution' | 'high_risk' | 'avoid';

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IRiskAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  issuedBy?: string;
  referenceNo?: string;
  date: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedNote?: string;
}

export interface ISocietyDocument {
  title: string;
  url: string;
  type:
    | 'noc'
    | 'map'
    | 'master_plan'
    | 'layout_plan'
    | 'authority_approval'
    | 'court_order'
    | 'other';
  uploadedAt: Date;
}

export interface IBlockRate {
  blockName: string;
  plotSize: string;
  minPrice: number;
  maxPrice: number;
  pricePerMarla?: number;
  lastUpdated: Date;
}

export interface IInfrastructureDetails {
  electricity: number;   // 0-100
  gas: number;
  water: number;
  sewerage: number;
  internet: number;
  roads: number;
}

export interface ILivabilityDetails {
  schools: number;       // 0-100
  hospitals: number;
  markets: number;
  transport: number;
  security: number;
  parks: number;
}

export interface IScores {
  legal: number;         // 0-100
  growth: number;
  possession: number;
  infrastructure: number;
  livability: number;
  overall: number;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface ISociety extends Document {
  // ── Identity ───────────────────────────────────────────────────────────────
  name: string;
  slug: string;
  alternateNames: string[];
  category: SocietyCategory;
  description?: string;

  // ── Location ───────────────────────────────────────────────────────────────
  city: string;
  areaName: string;
  fullAddress?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];   // [lng, lat]
  };

  // ── Legal / NOC ────────────────────────────────────────────────────────────
  nocStatus: NOCStatus;
  nocNumber?: string;
  nocDate?: Date;
  nocExpiryDate?: Date;
  approvalAuthority: SocietyAuthority;
  developmentAuthority?: string;
  registrationNo?: string;
  litigationStatus: LitigationStatus;
  litigationNote?: string;

  // ── Risk ───────────────────────────────────────────────────────────────────
  overallRiskLevel: OverallRiskLevel;
  riskAlerts: IRiskAlert[];

  // ── Intelligence Scores ────────────────────────────────────────────────────
  scores: IScores;
  infrastructureDetails: IInfrastructureDetails;
  livabilityDetails: ILivabilityDetails;

  // ── Pricing Intelligence ───────────────────────────────────────────────────
  blockRates: IBlockRate[];
  priceChangeYoY?: number;           // e.g. 12.5 = 12.5% YoY appreciation
  rentalYield?: number;              // e.g. 4.2 = 4.2% annual rental yield

  // ── Media ──────────────────────────────────────────────────────────────────
  featuredImage?: string;
  images: string[];
  documents: ISocietyDocument[];

  // ── Developer info ─────────────────────────────────────────────────────────
  developerName?: string;
  developerWebsite?: string;

  // ── Project stats ──────────────────────────────────────────────────────────
  totalPlots?: number;
  totalPhases?: number;
  launchYear?: number;
  expectedCompletionYear?: number;
  possessionPercentage?: number;     // 0-100

  // ── Platform fields ────────────────────────────────────────────────────────
  isVerifiedByHighrise: boolean;
  isFeatured: boolean;
  isPublished: boolean;              // false = draft/hidden from public
  viewCount: number;
  searchCount: number;
  lastVerifiedAt?: Date;

  // ── SEO ────────────────────────────────────────────────────────────────────
  seoTitle?: string;
  seoDescription?: string;

  // ── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const RiskAlertSchema = new Schema<IRiskAlert>(
  {
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    issuedBy: { type: String, trim: true },
    referenceNo: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    isResolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedNote: { type: String, trim: true, maxlength: 500 },
  },
  { _id: true }
);

const DocumentSchema = new Schema<ISocietyDocument>(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'noc', 'map', 'master_plan', 'layout_plan',
        'authority_approval', 'court_order', 'other',
      ],
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const BlockRateSchema = new Schema<IBlockRate>(
  {
    blockName: { type: String, required: true, trim: true },
    plotSize: { type: String, required: true, trim: true },
    minPrice: { type: Number, required: true, min: 0 },
    maxPrice: { type: Number, required: true, min: 0 },
    pricePerMarla: { type: Number, min: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ScoresSchema = new Schema<IScores>(
  {
    legal: { type: Number, default: 0, min: 0, max: 100 },
    growth: { type: Number, default: 0, min: 0, max: 100 },
    possession: { type: Number, default: 0, min: 0, max: 100 },
    infrastructure: { type: Number, default: 0, min: 0, max: 100 },
    livability: { type: Number, default: 0, min: 0, max: 100 },
    overall: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const InfrastructureDetailsSchema = new Schema<IInfrastructureDetails>(
  {
    electricity: { type: Number, default: 0, min: 0, max: 100 },
    gas: { type: Number, default: 0, min: 0, max: 100 },
    water: { type: Number, default: 0, min: 0, max: 100 },
    sewerage: { type: Number, default: 0, min: 0, max: 100 },
    internet: { type: Number, default: 0, min: 0, max: 100 },
    roads: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const LivabilityDetailsSchema = new Schema<ILivabilityDetails>(
  {
    schools: { type: Number, default: 0, min: 0, max: 100 },
    hospitals: { type: Number, default: 0, min: 0, max: 100 },
    markets: { type: Number, default: 0, min: 0, max: 100 },
    transport: { type: Number, default: 0, min: 0, max: 100 },
    security: { type: Number, default: 0, min: 0, max: 100 },
    parks: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const SocietySchema = new Schema<ISociety>(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    alternateNames: { type: [String], default: [] },
    category: {
      type: String,
      required: true,
      enum: [
        'housing_scheme', 'gated_community', 'apartment_complex',
        'commercial_zone', 'mixed_use', 'industrial_zone', 'township',
      ],
      default: 'housing_scheme',
    },
    description: { type: String, trim: true, maxlength: 3000 },

    // ── Location ──────────────────────────────────────────────────────────────
    city: { type: String, required: true, trim: true, index: true },
    areaName: { type: String, required: true, trim: true },
    fullAddress: { type: String, trim: true, maxlength: 500 },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: { type: [Number] },
    },

    // ── Legal ─────────────────────────────────────────────────────────────────
    nocStatus: {
      type: String,
      required: true,
      enum: [
        'approved', 'pending', 'under_review',
        'illegal', 'disputed', 'cancelled', 'expired',
      ],
      default: 'pending',
      index: true,
    },
    nocNumber: { type: String, trim: true },
    nocDate: { type: Date },
    nocExpiryDate: { type: Date },
    approvalAuthority: {
      type: String,
      required: true,
      enum: ['LDA', 'CDA', 'RDA', 'KDA', 'FDA', 'MDA', 'DHA', 'PHATA', 'Other'],
    },
    developmentAuthority: { type: String, trim: true },
    registrationNo: { type: String, trim: true },
    litigationStatus: {
      type: String,
      enum: ['none', 'minor', 'major', 'court_ordered_stop', 'resolved'],
      default: 'none',
    },
    litigationNote: { type: String, trim: true, maxlength: 1000 },

    // ── Risk ──────────────────────────────────────────────────────────────────
    overallRiskLevel: {
      type: String,
      enum: ['safe', 'caution', 'high_risk', 'avoid'],
      default: 'caution',
      index: true,
    },
    riskAlerts: { type: [RiskAlertSchema], default: [] },

    // ── Scores ────────────────────────────────────────────────────────────────
    scores: { type: ScoresSchema, default: () => ({}) },
    infrastructureDetails: { type: InfrastructureDetailsSchema, default: () => ({}) },
    livabilityDetails: { type: LivabilityDetailsSchema, default: () => ({}) },

    // ── Pricing ───────────────────────────────────────────────────────────────
    blockRates: { type: [BlockRateSchema], default: [] },
    priceChangeYoY: { type: Number },
    rentalYield: { type: Number },

    // ── Media ─────────────────────────────────────────────────────────────────
    featuredImage: { type: String, trim: true },
    images: { type: [String], default: [] },
    documents: { type: [DocumentSchema], default: [] },

    // ── Developer ─────────────────────────────────────────────────────────────
    developerName: { type: String, trim: true, maxlength: 200 },
    developerWebsite: { type: String, trim: true },

    // ── Project stats ─────────────────────────────────────────────────────────
    totalPlots: { type: Number, min: 0 },
    totalPhases: { type: Number, min: 0 },
    launchYear: { type: Number, min: 1950, max: 2100 },
    expectedCompletionYear: { type: Number, min: 1950, max: 2100 },
    possessionPercentage: { type: Number, min: 0, max: 100 },

    // ── Platform ──────────────────────────────────────────────────────────────
    isVerifiedByHighrise: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: false, index: true },
    viewCount: { type: Number, default: 0 },
    searchCount: { type: Number, default: 0 },
    lastVerifiedAt: { type: Date },

    // ── SEO ───────────────────────────────────────────────────────────────────
    seoTitle: { type: String, trim: true, maxlength: 160 },
    seoDescription: { type: String, trim: true, maxlength: 320 },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Geospatial
SocietySchema.index({ coordinates: '2dsphere' }, { sparse: true });

// Full-text search
SocietySchema.index({
  name: 'text',
  areaName: 'text',
  city: 'text',
  developerName: 'text',
  alternateNames: 'text',
});

// Admin list queries
SocietySchema.index({ isPublished: 1, isFeatured: -1, 'scores.overall': -1 });

// Browse page queries (city + nocStatus + riskLevel)
SocietySchema.index({ isPublished: 1, city: 1, nocStatus: 1, overallRiskLevel: 1 });

// Sort by overall score
SocietySchema.index({ isPublished: 1, 'scores.overall': -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

const Society: Model<ISociety> =
  mongoose.models.Society ||
  mongoose.model<ISociety>('Society', SocietySchema);

export default Society;