// models/Unit.ts
import crypto from 'crypto';
import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type UnitCategory = 'residential' | 'commercial';

export type ResidentialUnitType =
  | 'studio'
  | 'apartment_1bed'
  | 'apartment_2bed'
  | 'apartment_3bed'
  | 'apartment_4bed'
  | 'penthouse'
  | 'duplex';

export type CommercialUnitType =
  | 'shop'
  | 'office'
  | 'food_court'
  | 'showroom'
  | 'warehouse'
  | 'kiosk';

export type UnitType = ResidentialUnitType | CommercialUnitType;

/**
 * Unit lifecycle status (V4.9.8+ — added 'cancelled')
 *
 * available  → Open for booking
 * reserved   → Buyer placed booking (with reservedUntil expiry)
 * sold       → Payment complete (locked, admin can reverse only)
 * on_hold    → Temporarily held by developer
 * cancelled  → Reservation/booking cancelled → returns to available
 */
export type UnitStatus =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'on_hold'
  | 'cancelled';

/**
 * Listing type (V4.9.8+ — added 'pre_launch' aligning with Property model)
 */
export type ListingType =
  | 'full_payment'
  | 'installment'
  | 'both'
  | 'pre_launch';

export type FacingDirection =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'north_east'
  | 'north_west'
  | 'south_east'
  | 'south_west';

export type ViewType =
  | 'park'
  | 'road'
  | 'city'
  | 'garden'
  | 'pool'
  | 'mosque'
  | 'hills'
  | 'open'
  | 'internal';

export type InvestmentScore = 'low' | 'medium' | 'high' | 'excellent';

/**
 * Developer badge tier — denormalized from Project for fast unit-card render.
 * Mirrors Project.developerBadge — kept in sync via sync utility.
 */
export type DeveloperBadgeTier =
  | 'new_entrant'
  | 'emerging'
  | 'trusted'
  | 'premium';

/**
 * Contact visibility plan (managed marketplace model).
 *
 * basic       → Only Highrise contact shown (default)
 * premium     → Highrise + developer office address shown
 * enterprise  → Highrise + full developer details shown
 *
 * Inherited from parent Project — denormalized for fast public reads.
 */
export type ContactPlan = 'basic' | 'premium' | 'enterprise';

// ============================================
// SUB-DOCUMENT INTERFACES
// ============================================

export interface IUnitImage {
  url: string;
  publicId: string;
  caption?: string;
  isPrimary?: boolean;
  order?: number;
}

export interface IFloorPlanImage {
  url: string;
  publicId: string;
  title?: string;
}

export interface IUnitInstallmentPlan {
  totalPrice?: number;
  bookingAmount?: number;
  bookingPercent?: number;
  downPayment?: number;
  downPaymentPercent?: number;
  downPaymentDueIn?: string;
  hasMonthly?: boolean;
  monthlyAmount?: number;
  monthlyCount?: number;
  hasQuarterly?: boolean;
  quarterlyAmount?: number;
  quarterlyCount?: number;
  hasHalfYearly?: boolean;
  halfYearlyAmount?: number;
  halfYearlyCount?: number;
  hasYearly?: boolean;
  yearlyAmount?: number;
  yearlyCount?: number;
  possessionAmount?: number;
  possessionPercent?: number;
  planDuration?: number;
  planDurationUnit?: 'months' | 'years';
  planValidUntil?: Date;
  earlyPaymentDiscount?: number;
  fullPaymentDiscount?: number;
}

export interface IBookingInfo {
  reservedBy?: Types.ObjectId;
  reservedByName?: string;
  reservedByPhone?: string;
  reservedByEmail?: string;
  reservedOn?: Date;
  reservedUntil?: Date;
  reservationAmount?: number;
  reservationNotes?: string;
  /**
   * Set to true when reservedUntil < now() via cron or lazy check.
   * Enables: "Show only non-expired reservations" filter.
   * Auto-cleared when reservation is renewed/upgraded to sold.
   */
  reservationExpired?: boolean;
}

/**
 * Sold info — CNIC handled with enterprise security.
 *
 * SECURITY MODEL:
 *   - soldToCnicHash: SHA-256 hash for duplicate detection / search
 *   - soldToCnicEncrypted: AES-256-GCM ciphertext for admin display
 *   - Raw CNIC NEVER stored
 *   - Encryption via @/lib/kycCrypto (existing in stack)
 */
export interface ISoldInfo {
  soldTo?: Types.ObjectId;
  soldToName?: string;
  soldToPhone?: string;
  /**
   * SHA-256 hash of CNIC.
   * Used for duplicate detection without exposing raw value.
   * Set by API layer using crypto.createHash('sha256').
   */
  soldToCnicHash?: string;
  /**
   * AES-256-GCM ciphertext of CNIC.
   * Decrypt via kycCrypto.decrypt() — admin display only.
   * Never returned to public API.
   */
  soldToCnicEncrypted?: string;
  soldOn?: Date;
  soldPrice?: number;
  paymentMethod?: 'full_payment' | 'installment';
  saleNotes?: string;
}

export interface IInvestorIntelligence {
  expectedRentalYield?: number;
  estimatedMonthlyRent?: number;
  capitalAppreciation?: string;
  appreciationPercent?: number;
  appreciationTimeframe?: string;
  investmentScore?: InvestmentScore;
  demandScore?: 'low' | 'moderate' | 'high' | 'very_high';
  rentalDemand?: 'low' | 'moderate' | 'high' | 'very_high';
  investmentNotes?: string;
}

export interface IUnitCharges {
  cornerCharges?: number;
  facingPremium?: number;
  floorPremium?: number;
  possessionCharges?: number;
  maintenanceAdvance?: number;
  maintenanceMonths?: number;
  electricityMeterCharges?: number;
  gasMeterCharges?: number;
  waterConnectionCharges?: number;
  parkingCharges?: number;
  documentationCharges?: number;
  transferFee?: number;
  totalAdditionalCharges?: number;
}

/**
 * Price history entry — captures every price change for trust.
 * Used by Aria AI bot: "Has this unit's price changed?"
 * Displayed publicly: price drop indicator.
 */
export interface IPriceHistoryEntry {
  price: number;
  previousPrice?: number;
  changedAt: Date;
  changedBy?: Types.ObjectId;
  reason?: string;
  direction?: 'increase' | 'decrease' | 'initial';
  percentChange?: number;
}

/**
 * Contact visibility (denormalized from parent Project).
 * Drives sanitizeUnitForPublic() in API layer.
 */
export interface IContactVisibility {
  plan: ContactPlan;
  showDeveloperPhone?: boolean;
  showDeveloperWhatsapp?: boolean;
  showDeveloperEmail?: boolean;
  showDeveloperAddress?: boolean;
}

// ============================================
// MAIN UNIT INTERFACE
// ============================================

export interface IUnit extends Document {
  // ── IDENTITY & PLATFORM TRACKING ───────────
  unitId?: string; // unique format: HR-UNT-[HEX]

  // ── REFERENCES (NO propertyId — architecture rule) ──
  projectId: Types.ObjectId;
  developerId: Types.ObjectId;
  unitTypeName?: string;

  // ── DENORMALIZED FROM PROJECT (for SEO + AI context) ──
  /**
   * Denormalized fields from parent Project.
   * Synced on project update via sync utility.
   * Enables zero-join unit-card rendering + Aria AI context.
   */
  projectSlug?: string;
  projectName?: string;
  city?: string;
  /**
   * Denormalized AREA NAME (locality) from parent Project — e.g., "Gulberg III".
   * Renamed from `area` to avoid collision with unit size field below.
   */
  areaName?: string;
  developerBadge?: DeveloperBadgeTier;
  contactVisibility?: IContactVisibility;

  // ── IDENTITY ──────────────────────────────
  unitNumber: string;
  slug: string;
  title?: string;

  // ── BUILDING POSITION ─────────────────────
  floorNumber?: number;
  floorName?: string;
  tower?: string;
  wing?: string;
  building?: string;

  // ── CLASSIFICATION ────────────────────────
  category: UnitCategory;
  unitType: string;
  subType?: string;

  // ── SIZE & MEASUREMENTS ───────────────────
  area: number;
  areaUnit: string;
  coveredArea?: number;
  carpetArea?: number;
  balconyArea?: number;
  terraceArea?: number;
  frontWidth?: number;
  depth?: number;
  height?: number;
  hasMezzanine?: boolean;
  mezzanineArea?: number;

  // ── PRICE ─────────────────────────────────
  price: number;
  pricePerUnit?: number;
  priceNegotiable?: boolean;
  priceLabel?: string;

  // ── PRICE HISTORY (trust signal) ──────────
  previousPrice?: number;
  priceHistory?: IPriceHistoryEntry[];

  // ── FEATURES (Residential) ────────────────
  bedrooms?: number;
  bathrooms?: number;
  livingRooms?: number;
  kitchens?: number;
  balconies?: number;
  servantQuarter?: boolean;
  storeRoom?: boolean;
  laundryArea?: boolean;
  studyRoom?: boolean;

  // ── FEATURES (Commercial) ─────────────────
  washroom?: 'none' | 'private' | 'shared';
  kitchenette?: boolean;
  reception?: boolean;
  cabins?: number;
  seatingCapacity?: number;
  hasExhaustSystem?: boolean;
  hasDisplayWindow?: boolean;
  shutterType?: string;
  suitableFor?: string[];

  // ── POSITION & ATTRIBUTES ─────────────────
  isCorner?: boolean;
  facing?: FacingDirection;
  view?: ViewType;
  viewDescription?: string;
  isParkFacing?: boolean;
  isRoadFacing?: boolean;
  isMosqueFacing?: boolean;
  hasPrivateElevator?: boolean;
  hasPrivateEntrance?: boolean;
  hasRoofRights?: boolean;
  hasGarden?: boolean;
  gardenArea?: number;

  // ── FEATURES & AMENITIES ──────────────────
  features?: string[];
  includedAppliances?: string[];
  finishingLevel?: 'grey_structure' | 'standard' | 'premium' | 'luxury';
  finishingDetails?: string;

  // ── STATUS & AVAILABILITY ─────────────────
  status: UnitStatus;
  isPublished?: boolean;
  availableFrom?: Date;
  bookingInfo?: IBookingInfo;
  soldInfo?: ISoldInfo;

  // ── PAYMENT & PRICING ─────────────────────
  listingType: ListingType;
  installmentPlan?: IUnitInstallmentPlan;
  charges?: IUnitCharges;
  totalPrice?: number;
  grandTotal?: number;

  // ── INVESTOR INTELLIGENCE ─────────────────
  investorIntelligence?: IInvestorIntelligence;

  // ── PARKING ───────────────────────────────
  parkingIncluded?: boolean;
  parkingSpaces?: number;
  parkingType?: 'covered' | 'open' | 'basement';
  parkingNumber?: string;
  parkingPrice?: number;

  // ── MEDIA ─────────────────────────────────
  images?: IUnitImage[];
  floorPlanImage?: IFloorPlanImage;
  layoutImage?: IFloorPlanImage;
  virtualTourUrl?: string;
  videoUrl?: string;

  // ── DESCRIPTION ───────────────────────────
  description?: string;
  shortDescription?: string;
  highlights?: string[];
  termsAndConditions?: string;

  /**
   * Internal-only contact (Highrise admin sees).
   * NEVER exposed to public API.
   * Managed marketplace: buyers contact Highrise sales team / Aria AI.
   */
  customContact?: {
    personName?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
  };

  // ── META & ADMIN ──────────────────────────
  isVerified?: boolean;
  isFeatured?: boolean;
  isHotDeal?: boolean;
  isPriceDropped?: boolean;

  // ── SOFT DELETE ───────────────────────────
  isDeleted: boolean;
  deletedAt?: Date | null;

  // ── ANALYTICS ─────────────────────────────
  views: number;
  /**
   * Single source of truth for inquiry count.
   * (Previously had both `inquiries` and `inquiryCount` — consolidated.)
   */
  inquiryCount: number;

  // ── SEO ───────────────────────────────────
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;

  // ── SOCIAL PROOF ──────────────────────────
  favoriteCount?: number;
  compareCount?: number;
  shareCount?: number;

  // ── AUDIT ─────────────────────────────────
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  lastStatusChangedAt?: Date;
  lastPriceChangedAt?: Date;

  // ── TIMESTAMPS ────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SUB-SCHEMAS
// ============================================

const UnitImageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publicId: { type: String, required: true, trim: true, maxlength: 512 },
    caption: { type: String, trim: true, maxlength: 140 },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0, min: 0, max: 10_000 },
  },
  { _id: false }
);

const FloorPlanImageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publicId: { type: String, required: true, trim: true, maxlength: 512 },
    title: { type: String, trim: true, maxlength: 120 },
  },
  { _id: false }
);

const InstallmentPlanSchema = new Schema(
  {
    totalPrice: { type: Number, min: 0 },
    bookingAmount: { type: Number, min: 0 },
    bookingPercent: { type: Number, min: 0, max: 100 },
    downPayment: { type: Number, min: 0 },
    downPaymentPercent: { type: Number, min: 0, max: 100 },
    downPaymentDueIn: { type: String, trim: true, maxlength: 60 },
    hasMonthly: { type: Boolean, default: false },
    monthlyAmount: { type: Number, min: 0 },
    monthlyCount: { type: Number, min: 0 },
    hasQuarterly: { type: Boolean, default: false },
    quarterlyAmount: { type: Number, min: 0 },
    quarterlyCount: { type: Number, min: 0 },
    hasHalfYearly: { type: Boolean, default: false },
    halfYearlyAmount: { type: Number, min: 0 },
    halfYearlyCount: { type: Number, min: 0 },
    hasYearly: { type: Boolean, default: false },
    yearlyAmount: { type: Number, min: 0 },
    yearlyCount: { type: Number, min: 0 },
    possessionAmount: { type: Number, min: 0 },
    possessionPercent: { type: Number, min: 0, max: 100 },
    planDuration: { type: Number, min: 0 },
    planDurationUnit: { type: String, enum: ['months', 'years'] },
    planValidUntil: { type: Date },
    earlyPaymentDiscount: { type: Number, min: 0, max: 100 },
    fullPaymentDiscount: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const BookingInfoSchema = new Schema(
  {
    reservedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reservedByName: { type: String, trim: true, maxlength: 120 },
    reservedByPhone: { type: String, trim: true, maxlength: 30 },
    reservedByEmail: { type: String, trim: true, maxlength: 254 },
    reservedOn: { type: Date },
    reservedUntil: { type: Date },
    reservationAmount: { type: Number, min: 0 },
    reservationNotes: { type: String, trim: true, maxlength: 800 },
    reservationExpired: { type: Boolean, default: false },
  },
  { _id: false }
);

const SoldInfoSchema = new Schema(
  {
    soldTo: { type: Schema.Types.ObjectId, ref: 'User' },
    soldToName: { type: String, trim: true, maxlength: 120 },
    soldToPhone: { type: String, trim: true, maxlength: 30 },
    // Security: hash + encrypted, never raw
    soldToCnicHash: { type: String, trim: true, maxlength: 128 },
    soldToCnicEncrypted: { type: String, trim: true, maxlength: 1024 },
    soldOn: { type: Date },
    soldPrice: { type: Number, min: 0 },
    paymentMethod: { type: String, enum: ['full_payment', 'installment'] },
    saleNotes: { type: String, trim: true, maxlength: 1200 },
  },
  { _id: false }
);

const InvestorIntelligenceSchema = new Schema(
  {
    expectedRentalYield: { type: Number, min: 0, max: 100 },
    estimatedMonthlyRent: { type: Number, min: 0 },
    capitalAppreciation: { type: String, trim: true, maxlength: 200 },
    appreciationPercent: { type: Number, min: 0 },
    appreciationTimeframe: { type: String, trim: true, maxlength: 60 },
    investmentScore: {
      type: String,
      enum: ['low', 'medium', 'high', 'excellent'],
    },
    demandScore: {
      type: String,
      enum: ['low', 'moderate', 'high', 'very_high'],
    },
    rentalDemand: {
      type: String,
      enum: ['low', 'moderate', 'high', 'very_high'],
    },
    investmentNotes: { type: String, trim: true, maxlength: 1200 },
  },
  { _id: false }
);

const UnitChargesSchema = new Schema(
  {
    cornerCharges: { type: Number, min: 0 },
    facingPremium: { type: Number, min: 0 },
    floorPremium: { type: Number, min: 0 },
    possessionCharges: { type: Number, min: 0 },
    maintenanceAdvance: { type: Number, min: 0 },
    maintenanceMonths: { type: Number, min: 0 },
    electricityMeterCharges: { type: Number, min: 0 },
    gasMeterCharges: { type: Number, min: 0 },
    waterConnectionCharges: { type: Number, min: 0 },
    parkingCharges: { type: Number, min: 0 },
    documentationCharges: { type: Number, min: 0 },
    transferFee: { type: Number, min: 0 },
    totalAdditionalCharges: { type: Number, min: 0 },
  },
  { _id: false }
);

const PriceHistoryEntrySchema = new Schema(
  {
    price: { type: Number, required: true, min: 0 },
    previousPrice: { type: Number, min: 0 },
    changedAt: { type: Date, required: true, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true, maxlength: 500 },
    direction: {
      type: String,
      enum: ['increase', 'decrease', 'initial'],
    },
    percentChange: { type: Number },
  },
  { _id: false }
);

const ContactVisibilitySchema = new Schema(
  {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic',
    },
    showDeveloperPhone: { type: Boolean, default: false },
    showDeveloperWhatsapp: { type: Boolean, default: false },
    showDeveloperEmail: { type: Boolean, default: false },
    showDeveloperAddress: { type: Boolean, default: false },
  },
  { _id: false }
);

// ============================================
// HELPERS (security / normalization)
// ============================================

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk'
).replace(/\/+$/, '');

function toSlugPart(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 120);
}

/**
 * Crypto-based suffix — NO Math.random().
 * Returns 8-char hex string for slug collision resistance.
 */
function shortSuffix(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

/**
 * URL safety check — allows http + https, blocks dangerous protocols.
 * Matches isValidUrl() in Project model for consistency.
 */
function isSafeUrl(url: string): boolean {
  const u = String(url || '').trim();
  if (!u) return false;
  // Block dangerous protocols
  if (/^\s*(javascript|data|vbscript|file):/i.test(u)) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function ensureSinglePrimaryImage(images: IUnitImage[] | undefined): void {
  if (!Array.isArray(images) || images.length === 0) return;
  let found = false;
  for (const img of images) {
    if (img?.isPrimary) {
      if (!found) found = true;
      else img.isPrimary = false;
    }
  }
  if (!found && images[0]) images[0].isPrimary = true;
}

function computeAdditionalCharges(
  charges: IUnitCharges | undefined
): { sum: number } {
  if (!charges) return { sum: 0 };
  const sum =
    (charges.cornerCharges || 0) +
    (charges.facingPremium || 0) +
    (charges.floorPremium || 0) +
    (charges.possessionCharges || 0) +
    (charges.maintenanceAdvance || 0) +
    (charges.electricityMeterCharges || 0) +
    (charges.gasMeterCharges || 0) +
    (charges.waterConnectionCharges || 0) +
    (charges.parkingCharges || 0) +
    (charges.documentationCharges || 0) +
    (charges.transferFee || 0);
  return { sum: Math.max(0, sum) };
}

// ============================================
// MAIN UNIT SCHEMA
// ============================================

const UnitSchema = new Schema<IUnit>(
  {
    // ── IDENTITY & PLATFORM TRACKING ───────────
    unitId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // ── REFERENCES ────────────────────────
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    developerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    unitTypeName: { type: String, trim: true, maxlength: 80 },

    // ── DENORMALIZED FROM PROJECT ─────────
    projectSlug: { type: String, trim: true, maxlength: 180, index: true },
    projectName: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 80, index: true },
    // Denormalized locality name from Project (e.g., "Gulberg III")
    // Renamed from 'area' to avoid collision with unit size field below
    areaName: { type: String, trim: true, maxlength: 120, index: true },
    developerBadge: {
      type: String,
      enum: ['new_entrant', 'emerging', 'trusted', 'premium'],
      index: true,
    },
    contactVisibility: ContactVisibilitySchema,

    // ── IDENTITY ──────────────────────────
    unitNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      maxlength: 180,
      index: true,
    },
    title: { type: String, maxlength: 200, trim: true },

    // ── BUILDING POSITION ─────────────────
    floorNumber: { type: Number, min: -5, max: 200 },
    floorName: { type: String, trim: true, maxlength: 80 },
    tower: { type: String, trim: true, maxlength: 80 },
    wing: { type: String, trim: true, maxlength: 80 },
    building: { type: String, trim: true, maxlength: 120 },

    // ── CLASSIFICATION ────────────────────
    category: {
      type: String,
      enum: ['residential', 'commercial'],
      required: true,
      index: true,
    },
    unitType: { type: String, required: true, trim: true, index: true },
    subType: { type: String, trim: true, maxlength: 80 },

    // ── SIZE ──────────────────────────────
    area: { type: Number, required: true, min: 0 },
    areaUnit: {
      type: String,
      required: true,
      default: 'Sq.Ft',
      trim: true,
      maxlength: 20,
    },
    coveredArea: { type: Number, min: 0 },
    carpetArea: { type: Number, min: 0 },
    balconyArea: { type: Number, min: 0 },
    terraceArea: { type: Number, min: 0 },
    frontWidth: { type: Number, min: 0 },
    depth: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    hasMezzanine: { type: Boolean, default: false },
    mezzanineArea: { type: Number, min: 0 },

    // ── PRICE ─────────────────────────────
    price: { type: Number, required: true, min: 0, index: true },
    pricePerUnit: { type: Number, min: 0, index: true },
    priceNegotiable: { type: Boolean, default: false },
    priceLabel: { type: String, trim: true, maxlength: 60 },

    // ── PRICE HISTORY ─────────────────────
    previousPrice: { type: Number, min: 0 },
    priceHistory: [PriceHistoryEntrySchema],

    // ── FEATURES (Residential) ────────────
    bedrooms: { type: Number, min: 0, max: 20 },
    bathrooms: { type: Number, min: 0, max: 20 },
    livingRooms: { type: Number, min: 0, max: 10 },
    kitchens: { type: Number, min: 0, max: 5 },
    balconies: { type: Number, min: 0, max: 10 },
    servantQuarter: { type: Boolean, default: false },
    storeRoom: { type: Boolean, default: false },
    laundryArea: { type: Boolean, default: false },
    studyRoom: { type: Boolean, default: false },

    // ── FEATURES (Commercial) ─────────────
    washroom: { type: String, enum: ['none', 'private', 'shared'] },
    kitchenette: { type: Boolean, default: false },
    reception: { type: Boolean, default: false },
    cabins: { type: Number, min: 0 },
    seatingCapacity: { type: Number, min: 0 },
    hasExhaustSystem: { type: Boolean, default: false },
    hasDisplayWindow: { type: Boolean, default: false },
    shutterType: { type: String, trim: true, maxlength: 60 },
    suitableFor: [{ type: String, trim: true, maxlength: 60 }],

    // ── POSITION ──────────────────────────
    isCorner: { type: Boolean, default: false },
    facing: {
      type: String,
      enum: [
        'north',
        'south',
        'east',
        'west',
        'north_east',
        'north_west',
        'south_east',
        'south_west',
      ],
    },
    view: {
      type: String,
      enum: [
        'park',
        'road',
        'city',
        'garden',
        'pool',
        'mosque',
        'hills',
        'open',
        'internal',
      ],
    },
    viewDescription: { type: String, trim: true, maxlength: 200 },
    isParkFacing: { type: Boolean, default: false },
    isRoadFacing: { type: Boolean, default: false },
    isMosqueFacing: { type: Boolean, default: false },
    hasPrivateElevator: { type: Boolean, default: false },
    hasPrivateEntrance: { type: Boolean, default: false },
    hasRoofRights: { type: Boolean, default: false },
    hasGarden: { type: Boolean, default: false },
    gardenArea: { type: Number, min: 0 },

    // ── FEATURES & AMENITIES ──────────────
    features: [{ type: String, trim: true, maxlength: 80 }],
    includedAppliances: [{ type: String, trim: true, maxlength: 80 }],
    finishingLevel: {
      type: String,
      enum: ['grey_structure', 'standard', 'premium', 'luxury'],
    },
    finishingDetails: { type: String, trim: true, maxlength: 1200 },

    // ── STATUS ────────────────────────────
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'on_hold', 'cancelled'],
      default: 'available',
      index: true,
    },
    isPublished: { type: Boolean, default: true, index: true },
    availableFrom: { type: Date },
    bookingInfo: BookingInfoSchema,
    soldInfo: SoldInfoSchema,

    // ── PAYMENT & PRICING ─────────────────
    listingType: {
      type: String,
      enum: ['full_payment', 'installment', 'both', 'pre_launch'],
      default: 'both',
      index: true,
    },
    installmentPlan: InstallmentPlanSchema,
    charges: UnitChargesSchema,
    totalPrice: { type: Number, min: 0 },
    grandTotal: { type: Number, min: 0 },

    // ── INVESTOR INTELLIGENCE ─────────────
    investorIntelligence: InvestorIntelligenceSchema,

    // ── PARKING ───────────────────────────
    parkingIncluded: { type: Boolean, default: false },
    parkingSpaces: { type: Number, min: 0 },
    parkingType: { type: String, enum: ['covered', 'open', 'basement'] },
    parkingNumber: { type: String, trim: true, maxlength: 40 },
    parkingPrice: { type: Number, min: 0 },

    // ── MEDIA ─────────────────────────────
    images: [UnitImageSchema],
    floorPlanImage: FloorPlanImageSchema,
    layoutImage: FloorPlanImageSchema,
    virtualTourUrl: { type: String, trim: true, maxlength: 2048 },
    videoUrl: { type: String, trim: true, maxlength: 2048 },

    // ── DESCRIPTION ───────────────────────
    description: { type: String, maxlength: 5000, trim: true },
    shortDescription: { type: String, maxlength: 500, trim: true },
    highlights: [{ type: String, trim: true, maxlength: 120 }],
    termsAndConditions: { type: String, maxlength: 3000, trim: true },

    // ── INTERNAL CONTACT (never public) ───
    customContact: {
      personName: { type: String, trim: true, maxlength: 120 },
      phone: { type: String, trim: true, maxlength: 30 },
      whatsapp: { type: String, trim: true, maxlength: 30 },
      email: { type: String, trim: true, maxlength: 254 },
    },

    // ── META & ADMIN ──────────────────────
    isVerified: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isHotDeal: { type: Boolean, default: false, index: true },
    isPriceDropped: { type: Boolean, default: false, index: true },

    // ── SOFT DELETE ───────────────────────
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },

    // ── ANALYTICS ─────────────────────────
    views: { type: Number, default: 0, min: 0 },
    inquiryCount: { type: Number, default: 0, min: 0 },

    // ── SEO ───────────────────────────────
    metaTitle: { type: String, maxlength: 70, trim: true, index: true },
    metaDescription: { type: String, maxlength: 160, trim: true },
    keywords: [{ type: String, trim: true, maxlength: 40, index: true }],
    canonicalUrl: { type: String, trim: true, maxlength: 2048 },

    // ── SOCIAL PROOF ──────────────────────
    favoriteCount: { type: Number, default: 0, min: 0 },
    compareCount: { type: Number, default: 0, min: 0 },
    shareCount: { type: Number, default: 0, min: 0 },

    // ── AUDIT ─────────────────────────────
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    lastStatusChangedAt: { type: Date },
    lastPriceChangedAt: { type: Date },
  },
  { timestamps: true }
);

// ============================================
// INDEXES
// ============================================

UnitSchema.index({ projectId: 1, unitNumber: 1 }, { unique: true });
UnitSchema.index({ projectId: 1, status: 1, isDeleted: 1 });
UnitSchema.index({
  projectId: 1,
  category: 1,
  unitType: 1,
  status: 1,
  isDeleted: 1,
});
UnitSchema.index({ projectId: 1, floorNumber: 1, status: 1, isDeleted: 1 });
UnitSchema.index({ developerId: 1, projectId: 1, status: 1, isDeleted: 1 });
UnitSchema.index({ price: 1, status: 1, isDeleted: 1 });
UnitSchema.index({ pricePerUnit: 1, status: 1, isDeleted: 1 });
UnitSchema.index({ 'investorIntelligence.investmentScore': 1 });
UnitSchema.index({ 'investorIntelligence.expectedRentalYield': 1 });
UnitSchema.index({ isDeleted: 1, deletedAt: 1 });
UnitSchema.index({ projectSlug: 1, status: 1, isDeleted: 1 });
UnitSchema.index({ city: 1, category: 1, status: 1, isDeleted: 1 });
UnitSchema.index({ developerBadge: 1, status: 1, isDeleted: 1 });

// Text search
UnitSchema.index(
  {
    unitNumber: 'text',
    title: 'text',
    description: 'text',
    projectName: 'text',
    city: 'text',
    areaName: 'text',
  },
  { name: 'unit_text_search' }
);

// ============================================
// PRE-VALIDATE MIDDLEWARE
// ============================================

UnitSchema.pre<IUnit>('validate', function () {
  // URL hygiene
  if (this.virtualTourUrl && !isSafeUrl(this.virtualTourUrl)) {
    this.virtualTourUrl = undefined;
  }
  if (this.videoUrl && !isSafeUrl(this.videoUrl)) {
    this.videoUrl = undefined;
  }

  // Image normalization + single primary enforcement
  if (Array.isArray(this.images) && this.images.length > 0) {
    for (const img of this.images) {
      if (!img) continue;
      if (img.url) img.url = String(img.url).trim();
      if (img.publicId) img.publicId = String(img.publicId).trim();
      if (img.caption) {
        img.caption = String(img.caption).trim().slice(0, 140);
      }
      if (typeof img.order !== 'number') img.order = 0;
      img.order = Math.max(0, Math.min(10_000, img.order));
    }
    ensureSinglePrimaryImage(this.images);
  }
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

UnitSchema.pre<IUnit>('save', function () {
  // 0) Generate Platform Unique ID (HR-UNT-[HEX])
  if (!this.unitId) {
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.unitId = `HR-UNT-${hex}`;
  }

  // 0.1) Status Transition Safeguard — if unit is no longer sold, purge PII
  if (this.isModified('status') && this.status !== 'sold') {
    this.soldInfo = undefined;
  }

  // String normalization
  if (this.unitNumber) this.unitNumber = String(this.unitNumber).trim();
  if (this.title) this.title = String(this.title).trim();
  if (this.floorName) this.floorName = String(this.floorName).trim();
  if (this.tower) this.tower = String(this.tower).trim();
  if (this.wing) this.wing = String(this.wing).trim();
  if (this.building) this.building = String(this.building).trim();
  if (this.subType) this.subType = String(this.subType).trim();

  // Numeric clamping (defense in depth)
  if (typeof this.area === 'number') this.area = Math.max(0, this.area);
  if (typeof this.price === 'number') this.price = Math.max(0, this.price);

  // Slug generation — crypto-based suffix (no Math.random / Date.now)
  if (!this.slug && this.unitNumber) {
    const projectPart = this.projectId?.toString().slice(-6) || 'unit';
    const base = toSlugPart(this.unitNumber);
    this.slug = `${base}-${projectPart}-${shortSuffix()}`.slice(0, 180);
  }

  // Auto-generate title
  if (!this.title && this.unitNumber) {
    const typeLabel = this.unitType
      ? this.unitType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      : 'Unit';
    this.title = `${typeLabel} ${this.unitNumber}`;
    if (this.floorName) this.title += ` - ${this.floorName}`;
    if (this.title.length > 200) this.title = this.title.slice(0, 200);
  }

  // Auto-calc pricePerUnit
  if (this.price && this.area && !this.pricePerUnit) {
    this.pricePerUnit = Math.round(this.price / this.area);
  }

  // Audit timestamps
  if (this.isModified('status')) {
    this.lastStatusChangedAt = new Date();
  }
  if (this.isModified('price')) {
    this.lastPriceChangedAt = new Date();

    // Auto-append to price history on price change (non-initial)
    if (!this.isNew && typeof this.previousPrice === 'number') {
      const prev = this.previousPrice;
      const curr = this.price;
      const direction: 'increase' | 'decrease' | 'initial' =
        curr > prev ? 'increase' : curr < prev ? 'decrease' : 'initial';
      const percentChange =
        prev > 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : 0;

      if (!Array.isArray(this.priceHistory)) this.priceHistory = [];
      this.priceHistory.push({
        price: curr,
        previousPrice: prev,
        changedAt: new Date(),
        changedBy: this.updatedBy,
        direction,
        percentChange,
      });

      // Auto-flag price drop
      if (direction === 'decrease') {
        this.isPriceDropped = true;
      }
    } else if (this.isNew) {
      // First entry — initial price
      if (!Array.isArray(this.priceHistory)) this.priceHistory = [];
      this.priceHistory.push({
        price: this.price,
        changedAt: new Date(),
        changedBy: this.createdBy,
        direction: 'initial',
        percentChange: 0,
      });
    }
  }

  // Charges + totals
  if (this.charges) {
    const { sum } = computeAdditionalCharges(this.charges);
    this.charges.totalAdditionalCharges = sum;
    const base = this.price || 0;
    this.totalPrice = Math.max(0, base + sum);
  }

  // Grand total (includes parking if not bundled)
  const baseTotal = this.totalPrice ?? this.price ?? 0;
  this.grandTotal = Math.max(0, baseTotal);
  if (this.parkingPrice && !this.parkingIncluded) {
    this.grandTotal = Math.max(0, this.grandTotal + this.parkingPrice);
  }

  // Auto-calc rental yield
  if (
    this.investorIntelligence?.estimatedMonthlyRent &&
    this.price &&
    !this.investorIntelligence.expectedRentalYield
  ) {
    const annualRent = this.investorIntelligence.estimatedMonthlyRent * 12;
    const yieldPct = (annualRent / this.price) * 100;
    this.investorIntelligence.expectedRentalYield =
      Math.round(yieldPct * 100) / 100;
  }

  // Reservation expiry auto-flag
  if (this.bookingInfo?.reservedUntil) {
    const expired = new Date(this.bookingInfo.reservedUntil) < new Date();
    this.bookingInfo.reservationExpired = expired;
  }

  // SEO auto-fields
  if (!this.metaTitle && this.title) {
    let mt = `${this.title} | Highrise.pk`;
    if (mt.length > 70) mt = mt.substring(0, 67) + '...';
    this.metaTitle = mt;
  }

  if (!this.metaDescription && this.description) {
    const plainDesc = String(this.description).replace(/<[^>]*>/g, '');
    let md = plainDesc.substring(0, 157);
    if (plainDesc.length > 157) md += '...';
    this.metaDescription = md;
  }

  if (!this.keywords || this.keywords.length === 0) {
    this.keywords = [
      this.unitType,
      this.category,
      this.bedrooms ? `${this.bedrooms} bed` : null,
      this.projectName,
      this.city,
      this.areaName,
      'unit',
      'highrise.pk',
      'pakistan property',
    ].filter((k): k is string => Boolean(k));
  } else {
    const uniq = Array.from(
      new Set(this.keywords.map((k) => String(k).trim()).filter(Boolean))
    );
    this.keywords = uniq.slice(0, 20).map((k) => k.slice(0, 40));
  }

  /**
   * Canonical URL — Option A (enterprise SEO).
   * Pattern: /projects/[projectSlug]/units/[unitSlug]
   * Falls back to /units/[slug] if projectSlug not yet denormalized.
   */
  if (!this.canonicalUrl && this.slug) {
    if (this.projectSlug) {
      this.canonicalUrl = `${SITE_URL}/projects/${this.projectSlug}/units/${this.slug}`;
    } else {
      this.canonicalUrl = `${SITE_URL}/units/${this.slug}`;
    }
  }

  // Booking email length cap
  if (this.bookingInfo?.reservedByEmail) {
    this.bookingInfo.reservedByEmail = String(
      this.bookingInfo.reservedByEmail
    )
      .trim()
      .slice(0, 254);
  }
});

// ============================================
// VIRTUAL FIELDS
// ============================================

UnitSchema.virtual('primaryImage').get(function (this: IUnit) {
  const imgs = this.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const primary = imgs.find((img) => img.isPrimary);
    return primary ? primary.url : imgs[0].url;
  }
  return null;
});

UnitSchema.virtual('statusLabel').get(function (this: IUnit) {
  const labels: Record<UnitStatus, string> = {
    available: 'Available',
    reserved: 'Reserved',
    sold: 'Sold',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
  };
  return labels[this.status] || this.status;
});

UnitSchema.virtual('statusColor').get(function (this: IUnit) {
  const colors: Record<UnitStatus, string> = {
    available: '#10b981', // green
    reserved: '#f59e0b',  // amber
    sold: '#ef4444',      // red
    on_hold: '#6b7280',   // gray
    cancelled: '#9ca3af', // light gray
  };
  return colors[this.status] || '#6b7280';
});

/**
 * Pakistani price format — Crore / Lac / Thousand
 */
UnitSchema.virtual('formattedPrice').get(function (this: IUnit) {
  if (!this.price) return null;
  if (this.price >= 10_000_000) {
    return `${(this.price / 10_000_000).toFixed(2)} Crore`;
  }
  if (this.price >= 100_000) {
    return `${(this.price / 100_000).toFixed(2)} Lac`;
  }
  return `Rs ${Number(this.price).toLocaleString()}`;
});

/**
 * Area in Marla (Pakistani-friendly).
 * 1 Marla = 272.25 sqft (Lahore standard).
 */
UnitSchema.virtual('areaInMarla').get(function (this: IUnit) {
  if (!this.area || !this.areaUnit) return null;
  const unit = this.areaUnit.toLowerCase().replace(/[.\s]/g, '');
  if (unit === 'sqft' || unit === 'sqfeet' || unit === 'squarefeet') {
    return Math.round((this.area / 272.25) * 100) / 100;
  }
  if (unit === 'marla') return this.area;
  return null;
});

/**
 * Reservation status helpers — drives Aria AI responses.
 */
UnitSchema.virtual('isReservationExpired').get(function (this: IUnit) {
  if (!this.bookingInfo?.reservedUntil) return false;
  return new Date(this.bookingInfo.reservedUntil) < new Date();
});

/**
 * Price drop percentage — for "Hot Deal" badges.
 */
UnitSchema.virtual('priceDropPercent').get(function (this: IUnit) {
  if (!this.previousPrice || !this.price) return 0;
  if (this.price >= this.previousPrice) return 0;
  return Math.round(
    ((this.previousPrice - this.price) / this.previousPrice) * 100
  );
});

UnitSchema.set('toJSON', { virtuals: true });
UnitSchema.set('toObject', { virtuals: true });

// ============================================
// MODEL EXPORT
// ============================================

const Unit =
  mongoose.models.Unit || mongoose.model<IUnit>('Unit', UnitSchema);

export default Unit;