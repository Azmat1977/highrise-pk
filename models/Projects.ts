// models/Project.ts
import crypto from 'crypto';
import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ProjectCategory =
  // Canonical values (preferred going forward — match types/projects.ts)
  | 'high_rise'
  | 'housing_society'
  | 'mixed_use'
  | 'commercial_plaza'
  | 'townhouse'
  | 'gated_community'
  | 'farmhouse_community'
  | 'industrial_park'
  // Legacy short-form values (still valid — pre-existing DB data)
  | 'highrise'
  | 'society';

export type ProjectNature = 'residential' | 'commercial' | 'mixed';

export type ProjectStatus =
  | 'Planning'
  | 'Pre-Launch'
  | 'Under Development'
  | 'Launched'
  | 'Completed';

export type SaleMode = 'Installment' | 'Full Payment' | 'Both';

export type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'not_applied';

// Platform verification workflow — aligned with Property model
export type ListingStatus = 'draft' | 'pending' | 'verified' | 'rejected';

// Admin-facing verification status (same values, explicit alias)
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

// Developer snapshot for publish gating
export type DeveloperApprovalStatus = 'approved' | 'pending' | 'rejected';

export type ImageType =
  | 'exterior'
  | 'interior'
  | 'amenity'
  | 'floor_plan'
  | 'progress'
  | 'render'
  | 'other';

// Highrise Trust Types
export type HighriseRiskLevel = 'low' | 'medium' | 'high';

export type HighriseDeliveryStatus =
  | 'on_track'
  | 'slightly_delayed'
  | 'critical_delay'
  | 'completed';

export type HighriseVerificationLevel =
  | 'not_verified'
  | 'docs_verified'
  | 'site_verified'
  | 'handover_verified';

/**
 * Developer Badge Tier System
 *
 * new_entrant  — First project, no track record yet (Gray)
 * emerging     — 1–2 delivered projects, basic docs verified (Blue)
 * trusted      — 3–9 delivered, no disputes, on-time ≥ 60% (Teal #029bba)
 * premium      — 10+ delivered, on-time ≥ 80%, zero fraud (Purple #7c3aed)
 *
 * Assigned by Highrise admin after investigation.
 * Displayed on: developer profile, project cards, unit listings,
 * inquiry forms ("You're contacting a 💎 Premium Developer").
 */
export type DeveloperBadgeTier =
  | 'new_entrant'
  | 'emerging'
  | 'trusted'
  | 'premium';

// ============================================
// RISK ALERT TYPES (NEW — V5.7.0 Phase A)
// ============================================

/**
 * Severity levels — maps directly to UI color system:
 *   low      → info teal  (#029bba)
 *   medium   → warning    (#f59e0b)
 *   high     → danger     (#ef4444)
 *   critical → danger     (#ef4444) + pulse animation
 */
export type RiskAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Alert categories — drives filtering on /risk-alerts page
 * and helps buyers understand the nature of the issue.
 */
export type RiskAlertCategory =
  | 'legal'        // Court orders, injunctions, litigation
  | 'financial'    // Developer insolvency, payment disputes
  | 'construction' // Structural issues, stop-work orders
  | 'fraud'        // Fake schemes, duplicate sales, impersonation
  | 'noc'          // NOC revoked, expired, or not applied
  | 'general';     // Other alerts

export type RiskAlertStatus = 'active' | 'resolved' | 'investigating';

// ============================================
// SUB-DOCUMENT INTERFACES
// ============================================

/**
 * Risk Alert — embedded in both Society and Project models.
 * Unified shape allows the /api/risk-alerts feed to merge both
 * into a single sorted response without schema differences.
 *
 * sourceType is added at the API layer (not stored in DB)
 * to identify whether an alert came from society or project.
 */
export interface IRiskAlert {
  _id?: mongoose.Types.ObjectId;

  // Core content
  title: string;
  description: string;

  // Classification
  severity: RiskAlertSeverity;
  category: RiskAlertCategory;

  // Authority that issued or actioned the alert
  // Examples: "LDA", "RDA", "KDA", "Court Order", "Highrise Team"
  issuedBy: string;

  // Lifecycle
  issuedAt: Date;
  resolvedAt?: Date;
  status: RiskAlertStatus;

  // Optional evidence link (official notice, news article, court doc)
  sourceUrl?: string;

  // For project alerts: which specific units are affected
  // Examples: ["3A", "Floor 5", "Block B"]
  affectedUnits?: string[];

  // Admin who created this alert (audit trail)
  createdBy?: mongoose.Types.ObjectId;
}

/**
 * Developer's OTHER completed projects — shown on project page
 * as portfolio credibility ("Other projects by this developer").
 * Full developer portfolio lives on DeveloperProfile model.
 */
export interface IRelatedProject {
  name: string;
  type: 'Residential' | 'Commercial' | 'Mixed Use';
  location: string;
  year: number;
  images: string[];
}

export interface IUnitType {
  // ── IDENTITY ──────────────────────────────
  type: string;
  name?: string;
  category?: 'residential' | 'commercial';
  description?: string;
  features?: string[];

  // ── LIVE INVENTORY COUNTS ─────────────────
  totalUnits?: number;
  soldUnits?: number;
  availableUnits?: number;
  reservedUnits?: number;
  onHoldUnits?: number;
  cancelledUnits?: number;

  // ── PRICING RANGE ─────────────────────────
  priceRange: {
    min: number;
    max: number;
  };

  pricePerSqftRange?: {
    min: number;
    max: number;
  };

  // ── AREA RANGE ────────────────────────────
  areaRange?: {
    min: number;
    max: number;
    unit: string;
  };

  areaRangeMarla?: {
    min: number;
    max: number;
  };
  areaRangeSqft?: {
    min: number;
    max: number;
  };

  // ── ROOM CONFIGURATION ────────────────────
  bedrooms?: number;
  bathrooms?: number;

  // ── COMMERCIAL-SPECIFIC ───────────────────
  slotCount?: number;
  slotPrice?: number;

  // ── FLOOR ALLOCATION ──────────────────────
  floorsAssigned?: string[];
  locatedOn?: string[];
  floorsAvailable?: string[];
  floorsAvailableCount?: number;

  // ── QUICK INSTALLMENT REFERENCE ───────────
  bookingAmount?: number;
  bookingPercent?: number;
  monthlyInstallment?: number;
  installmentMonths?: number;

  // ── INVESTMENT INTELLIGENCE ───────────────
  avgRentalYield?: number;
  avgMonthlyRent?: number;
  investmentScoreAvg?: 'low' | 'medium' | 'high' | 'excellent';

  // ── PARKING ───────────────────────────────
  parkingIncluded?: boolean;
  parkingSpacesPerUnit?: number;

  // ── POSSESSION ────────────────────────────
  possessionDate?: Date;
  isReadyForPossession?: boolean;

  // ── SELLING VELOCITY ──────────────────────
  soldInLast30Days?: number;
  soldInLast60Days?: number;
  isFastSelling?: boolean;
  hotDealsCount?: number;

  // ── ENGAGEMENT METRICS ────────────────────
  popularityScore?: number;
  viewCount?: number;
  inquiryCount?: number;

  // ── ACTIVITY TIMESTAMPS ───────────────────
  lastSoldDate?: Date;
  lastUnitAddedDate?: Date;
  lastSyncedAt?: Date;

  // ── TYPE-LEVEL VERIFICATION ───────────────
  isVerified?: boolean;
  verifiedAt?: Date;

  // ── SEO ───────────────────────────────────
  seoSlug?: string;

  // ── MEDIA ─────────────────────────────────
  layoutImageUrl?: string;
  layoutImagePublicId?: string;
  interiorImages?: {
    url: string;
    publicId: string;
    caption?: string;
  }[];
  floorPlanPdfUrl?: string;
  floorPlanPdfPublicId?: string;
  walkthroughVideoUrl?: string;
  floorPlanUrl?: string;
  floorPlanPublicId?: string;
}

export interface IProjectImage {
  url: string;
  public_id: string;
  caption?: string;
  type: ImageType;
  isPrimary?: boolean;
  order?: number;
}

export interface IFloorPlan {
  title: string;
  unitType: string;
  area?: number;
  areaUnit?: string;
  bedrooms?: number;
  bathrooms?: number;
  imageUrl: string;
  public_id: string;
}

export interface IBuildingFloorPlan {
  floorName: string;
  floorNumber?: number;
  floorType?:
    | 'parking'
    | 'commercial'
    | 'residential'
    | 'amenity'
    | 'rooftop'
    | 'mixed';
  imageUrl?: string;
  imagePublicId?: string;
  pdfUrl?: string;
  pdfPublicId?: string;
  description?: string;
  unitsOnFloor?: string[];
}

export interface IDevelopmentUpdate {
  title: string;
  date: Date;
  description?: string;
  images?: {
    url: string;
    publicId: string;
    caption?: string;
  }[];
  videoUrl?: string;
  progressPercent?: number;
}

export interface INearbyFacility {
  name: string;
  category:
    | 'hospital'
    | 'school'
    | 'restaurant'
    | 'park'
    | 'mall'
    | 'mosque'
    | 'bank'
    | 'transport'
    | 'other';
  distance?: string;
  icon?: string;
}

export interface IProjectHighlight {
  title: string;
  description: string;
  icon?: string;
}

export interface ILocationAdvantage {
  title: string;
  points: string[];
}

export interface IOffering {
  category: string;
  items: string[];
  icon?: string;
}

export interface IInvestmentReason {
  title: string;
  description: string;
  icon?: string;
}

export interface IAmenityDetailed {
  name: string;
  description?: string;
  icon?: string;
  category:
    | 'security'
    | 'lifestyle'
    | 'convenience'
    | 'recreation'
    | 'business'
    | 'spiritual';
}

export interface IGalleryImage {
  url: string;
  // publicId is canonical. public_id is retained only for legacy records.
  publicId?: string;
  public_id?: string;
  caption?: string;
  isPrimary?: boolean;
  category:
    | 'exterior'
    | 'interior'
    | 'amenity'
    | 'amenities'
    | 'view'
    | 'lobby'
    | 'construction'
    | 'render'
    | 'floor_plan'
    | 'aerial'
    | 'other';
  order?: number;
  uploadedAt?: Date;
}

export interface IProjectVideo {
  url: string;
  type: 'youtube' | 'vimeo' | 'direct';
  title?: string;
  thumbnail?: string;
  category?:
    | 'overview'
    | 'walkthrough'
    | 'drone'
    | 'construction'
    | 'testimonial';
}

export interface IProjectDocuments {
  brochureUrl?: string;
  brochurePublicId?: string;
  priceListUrl?: string;
  priceListPublicId?: string;
  paymentPlanUrl?: string;
  paymentPlanPublicId?: string;
  masterPlanUrl?: string;
  masterPlanPublicId?: string;
  nocDocumentUrl?: string;
  nocDocumentPublicId?: string;
}

/**
 * Managed project document library used by /api/projects/[id]/documents.
 * Files are stored in Cloudinary with authenticated delivery and are
 * exposed to clients only through short-lived signed URLs.
 */
export interface IProjectDocumentItem {
  url: string;
  publicId: string;
  title: string;
  description?: string;
  category:
    | 'noc'
    | 'approval_letter'
    | 'building_plan'
    | 'layout_plan'
    | 'development_agreement'
    | 'allotment_letter'
    | 'rera_registration'
    | 'environmental_clearance'
    | 'brochure'
    | 'payment_plan'
    | 'floor_plan'
    | 'specification'
    | 'legal'
    | 'financial'
    | 'other';
  visibility: 'public' | 'registered' | 'admin_only';
  fileType: string;
  fileSize?: number;
  resourceType?: 'image' | 'raw';
  format?: string;
  order: number;
  uploadedAt: Date;
  uploadedBy?: string;
}

export interface IFloorDetails {
  totalFloors?: number;
  floorsForParking?: number;
  floorsForCommercial?: number;
  floorsForResidential?: number;
  namedFloors?: string[];
}

export interface ISocietyDetails {
  totalLandArea?: number;
  landAreaUnit?: string;
  totalResidentialPlots?: number;
  totalCommercialPlots?: number;
  plotSizesOffered?: string;
  developmentStatus?: 'launched' | 'developing' | 'developed';
  facilities?: string[];
}

export interface IFullPaymentInfo {
  fullPrice?: number;
  areaSize?: number;
  areaUnit?: string;
  pricePerUnit?: number;
}

export interface IPaymentPlanImage {
  url:      string;
  publicId?: string;
  caption?: string;
}

export interface IInstallmentPlan {
  totalPrice?: number;
  bookingAmount?: number;
  bookingPercent?: number;
  downPayment?: number;
  downPaymentPercent?: number;
  monthlyAmount?: number;
  monthlyDuration?: number;
  quarterlyAmount?: number;
  quarterlyDuration?: number;
  halfYearlyAmount?: number;
  halfYearlyDuration?: number;
  yearlyAmount?: number;
  yearlyDuration?: number;
  possessionAmount?: number;
  possessionPercent?: number;
  planValidity?: string;
  planDuration?: number;
  planDurationUnit?: 'months' | 'years';
  earlyPaymentDiscount?: number;
  fullPaymentDiscount?: number;
}

export interface IPaymentPlanInstallment {
  label: string;
  amount: number;
  percentage?: number;
  dueDate?: string;
  dueAfter?: string;
  frequency?: 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'on_possession';
  count?: number;
  notes?: string;
}

export interface IProjectPaymentPlan {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  planType: 'standard' | 'easy_installment' | 'flexi' | 'down_payment' | 'full_payment' | 'custom';
  applicableTo?: 'all_units' | 'residential' | 'commercial' | 'specific_types';
  unitTypes?: string[];
  totalPrice?: number;
  currency?: string;
  bookingAmount?: number;
  bookingPercent?: number;
  downPayment?: number;
  downPaymentPercent?: number;
  downPaymentDueIn?: string;
  installments?: IPaymentPlanInstallment[];
  possessionAmount?: number;
  possessionPercent?: number;
  planDuration?: number;
  planDurationUnit?: 'months' | 'years';
  earlyPaymentDiscount?: number;
  fullPaymentDiscount?: number;
  bulkBookingDiscount?: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
  isDefault?: boolean;
  isFeatured?: boolean;
  order?: number;
  termsAndConditions?: string;
  disclaimers?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

export interface IDeveloperProfileSnapshot {
  name?: string;
  ceoName?: string;
  contactNumber?: string;
  officialEmail?: string;
  whatsappNumber?: string;
  website?: string;
  socialLinks?: string[];
  logoUrl?: string;
  logoPublicId?: string;
  registrationCertUrl?: string;
  description?: string;
  establishedYear?: number;
  completedProjectsCount?: number;
  developerBadge?: DeveloperBadgeTier;
}

export interface ILegalDocs {
  nocUrl?: string;
  nocPublicId?: string;
  secpCertUrl?: string;
  secpCertPublicId?: string;
  layoutMapUrl?: string;
  layoutMapPublicId?: string;
  environmentCertUrl?: string;
  environmentCertPublicId?: string;
  authorityLicenseUrl?: string;
  authorityLicensePublicId?: string;
  brochureUrl?: string;
  brochurePublicId?: string;
}

export interface IProjectContact {
  personName?: string;
  designation?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  whatsappNumber?: string;
  email?: string;
  officeAddress?: string;
  officeHours?: string;
  showPhoneOnListing?: boolean;
  allowWhatsappMessages?: boolean;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

// ============================================
// MAIN PROJECT INTERFACE
// ============================================

export interface IProject extends Document {
  // ── IDENTITY & PLATFORM TRACKING ───────────
  projectId?: string; // unique format: HR-PRJ-[HEX]

  // ── OWNERSHIP ──────────────────────────────
  developerId: mongoose.Types.ObjectId;

  // ── CLASSIFICATION ─────────────────────────
  projectCategory: ProjectCategory;
  projectNature: ProjectNature;

  // ── IDENTITY ───────────────────────────────
  projectName: string;
  slug: string;
  tagline?: string;
  description?: string;
  shortDescription?: string;

  // ── LOCATION ───────────────────────────────
  city: string;
  area: string;
  specificLocation?: string;
  googleMapLink?: string;
  coordinatesRaw?: string;
  coordinates?: ICoordinates;
  location?: IGeoPoint;
  nearbyLandmarks?: string[];

  // ── STATUS ─────────────────────────────────
  projectType?: 'Residential' | 'Commercial' | 'Mixed Use';
  projectStatus: ProjectStatus;
  launchDate?: Date;
  developmentProgress?: number;
  expectedCompletionDate?: Date;
  possessionStartDate?: Date;

  // ── APPROVALS ──────────────────────────────
  approvalAuthority?: string;
  isApproved?: ApprovalStatus;
  nocStatus?: ApprovalStatus;
  nocNumber?: string;
  societyRegistrationNumber?: string;
  environmentClearance?: boolean;
  buildingPlanApproved?: boolean;
  legalDocs?: ILegalDocs;

  // ── DEVELOPER PORTFOLIO ────────────────────
  relatedProjects?: IRelatedProject[];

  // ── SCALE ──────────────────────────────────
  totalArea?: string;
  totalBlocks?: number;
  totalUnits?: number;
  unitsSold?: number;
  unitsAvailable?: number;
  priceRangeText?: string;
  minPrice?: number;
  maxPrice?: number;
  floorDetails?: IFloorDetails;
  societyDetails?: ISocietyDetails;

  // ── PRICING ────────────────────────────────
  saleMode?: SaleMode;
  fullPaymentInfo?: IFullPaymentInfo;
  installmentPlan?: IInstallmentPlan;
  paymentPlans?: IProjectPaymentPlan[];
  paymentPlanImages?: IPaymentPlanImage[];
  floorWisePriceImages?: { url: string; caption?: string }[];
  unitTypeBreakdown?: IUnitType[];

  // ── DEVELOPER SNAPSHOT ─────────────────────
  developerProfile?: IDeveloperProfileSnapshot;
  developerApprovalStatus?: DeveloperApprovalStatus;
  developerVerifiedAt?: Date;

  // ── MEDIA ──────────────────────────────────
  projectLogo?: string;
  projectLogoPublicId?: string;
  featureImageUrl?: string;
  featureImagePublicId?: string;
  images?: IProjectImage[];
  progressImages?: string[];
  floorPlans?: IFloorPlan[];
  buildingFloorPlans?: IBuildingFloorPlan[];
  projectDocuments?: IProjectDocuments;
  documents?: IProjectDocumentItem[];
  droneVideoUrl?: string;
  virtualTourUrl?: string;
  projectVideoUrl?: string;
  constructionVideoUrl?: string;
  gallery?: IGalleryImage[];
  videos?: IProjectVideo[];

  // ── VERIFICATION PANEL (Fact-Based) ─────────
  verificationPanel?: {
    verifiedBy?: string;
    source?: string;
    verifiedAt?: Date;
    legalDisclaimer?: string;
  };

  // ── AMENITIES ──────────────────────────────
  buildingAmenities?: string[];
  communityAmenities?: string[];
  securityFeatures?: string[];
  sustainabilityFeatures?: string[];
  amenitiesDetailed?: IAmenityDetailed[];

  // ── CONTENT ────────────────────────────────
  highlights?: string[];
  projectHighlights?: IProjectHighlight[];
  locationAdvantages?: ILocationAdvantage[];
  offerings?: IOffering[];
  investmentReasons?: IInvestmentReason[];
  nearbyFacilities?: INearbyFacility[];
  developmentUpdates?: IDevelopmentUpdate[];
  contactDetails?: IProjectContact;

  // ── TRUST & VERIFICATION ───────────────────
  highriseScore?: number;
  riskLevel?: HighriseRiskLevel;
  deliveryStatus?: HighriseDeliveryStatus;
  verificationLevel?: HighriseVerificationLevel;

  developerBadge?: DeveloperBadgeTier;
  badgeAssignedBy?: mongoose.Types.ObjectId;
  badgeAssignedAt?: Date;
  badgeNotes?: string;
  isTrustedBuilder?: boolean;

  // ── RISK ALERTS (NEW — V5.7.0 Phase A) ────────────────────────
  /**
   * Admin-managed risk alerts for this project.
   * Unified with Society.riskAlerts[] via /api/risk-alerts feed.
   *
   * Examples:
   *   - Court stay order on property transfers
   *   - Developer financial issues
   *   - Construction stop-work order
   *   - Fraud reports filed against developer
   */
  riskAlerts?: IRiskAlert[];

  // ── LISTING STATUS ─────────────────────────
  status: ListingStatus;
  requestedVerification?: boolean;
  verificationStatus: VerificationStatus;
  isFeatured?: boolean;
  isVerified?: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;

  // ── SOFT DELETE ────────────────────────────
  isDeleted: boolean;
  deletedAt?: Date | null;

  // ── ENGAGEMENT ─────────────────────────────
  views: number;
  inquiries: number;
  favoriteCount?: number;
  compareCount?: number;
  shareCount?: number;

  // ── SEO ────────────────────────────────────
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;

  // ── RATINGS ────────────────────────────────
  averageRating?: number;
  totalReviews?: number;
  ratingBreakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };

  // ── TIMESTAMPS ─────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// HELPERS (Enterprise Guardrails)
// ============================================

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk'
).replace(/\/+$/, '');

function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shortSuffix(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function clampStr(s: string, max: number): string {
  const v = String(s || '');
  return v.length > max ? v.slice(0, max) : v;
}

function isValidEmail(email?: string): boolean {
  if (!email) return true;
  const v = String(email).trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidUrl(url?: string): boolean {
  if (!url) return true;
  const v = String(url).trim();
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizePhone(phone?: string): string {
  if (!phone) return '';
  const raw = String(phone).trim();
  if (!raw) return '';
  return raw.replace(/[^\d+]/g, '');
}

function computeDerivedFromUnitTypes(
  unitTypes: IUnitType[] | undefined | null
): {
  minPrice?: number;
  maxPrice?: number;
  totalUnits?: number;
  unitsSold?: number;
  unitsAvailable?: number;
} {
  if (!Array.isArray(unitTypes) || unitTypes.length === 0) return {};

  const prices: number[] = [];
  let totalUnits = 0;
  let soldUnits = 0;
  let availableUnits = 0;

  for (const ut of unitTypes) {
    const min = ut?.priceRange?.min;
    const max = ut?.priceRange?.max;

    if (typeof min === 'number' && min > 0) prices.push(min);
    if (typeof max === 'number' && max > 0) prices.push(max);

    if (typeof ut?.totalUnits === 'number' && ut.totalUnits > 0)
      totalUnits += ut.totalUnits;
    if (typeof ut?.soldUnits === 'number' && ut.soldUnits > 0)
      soldUnits += ut.soldUnits;
    if (typeof ut?.availableUnits === 'number' && ut.availableUnits > 0)
      availableUnits += ut.availableUnits;
  }

  const derived: {
    minPrice?: number;
    maxPrice?: number;
    totalUnits?: number;
    unitsSold?: number;
    unitsAvailable?: number;
  } = {};

  if (prices.length > 0) {
    derived.minPrice = Math.min(...prices);
    derived.maxPrice = Math.max(...prices);
  }

  if (totalUnits > 0) {
    derived.totalUnits = totalUnits;
    derived.unitsSold = soldUnits;
    derived.unitsAvailable =
      availableUnits > 0
        ? availableUnits
        : Math.max(0, totalUnits - soldUnits);
  }

  return derived;
}

function deriveTrustedBuilder(badge?: DeveloperBadgeTier): boolean {
  return badge === 'trusted' || badge === 'premium';
}

/**
 * Translates Developer Profile's 12-tier badge system into Project's 4-tier classification.
 */
export function mapDeveloperBadgeToTier(badge?: string): DeveloperBadgeTier {
  const b = String(badge || '').toLowerCase().trim();
  if (['diamond', 'premium_partner', 'platinum', 'gold'].includes(b)) {
    return 'premium';
  }
  if (['established', 'silver', 'trusted_builder', 'highrise_verified'].includes(b)) {
    return 'trusted';
  }
  if (['emerging', 'top_developer', 'on_time_delivery'].includes(b)) {
    return 'emerging';
  }
  return 'new_entrant';
}

// ============================================
// SUB-SCHEMAS
// ============================================

// ── Risk Alert Sub-Schema (NEW — V5.7.0) ──────────────────────────────────────

const RiskAlertSchema = new Schema<IRiskAlert>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['legal', 'financial', 'construction', 'fraud', 'noc', 'general'],
      required: true,
      index: true,
    },
    issuedBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'investigating'],
      required: true,
      default: 'active',
    },
    sourceUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    affectedUnits: [{ type: String, trim: true, maxlength: 100 }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    // _id: true (default) — each alert has its own ObjectId for targeted updates
    timestamps: false, // issuedAt serves as the timestamp
  }
);

const RelatedProjectSchema = new Schema(
  {
    name: { type: String },
    type: { type: String, enum: ['Residential', 'Commercial', 'Mixed Use'] },
    location: { type: String },
    year: { type: Number },
    images: [{ type: String }],
  },
  { _id: false }
);

const UnitTypeSchema = new Schema(
  {
    type: { type: String, required: true },
    name: { type: String },
    category: { type: String, enum: ['residential', 'commercial'] },
    description: { type: String },
    features: [{ type: String }],
    totalUnits: { type: Number, min: 0, default: 0 },
    soldUnits: { type: Number, min: 0, default: 0 },
    availableUnits: { type: Number, min: 0, default: 0 },
    reservedUnits: { type: Number, min: 0, default: 0 },
    onHoldUnits: { type: Number, min: 0, default: 0 },
    cancelledUnits: { type: Number, min: 0, default: 0 },
    priceRange: {
      min: { type: Number, min: 0, default: 0 },
      max: { type: Number, min: 0, default: 0 },
    },
    pricePerSqftRange: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },
    areaRange: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      unit: { type: String, default: 'Sq. Ft.' },
    },
    areaRangeMarla: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },
    areaRangeSqft: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    slotCount: { type: Number, min: 0 },
    slotPrice: { type: Number, min: 0 },
    floorsAssigned: [{ type: String }],
    locatedOn: [{ type: String }],
    floorsAvailable: [{ type: String }],
    floorsAvailableCount: { type: Number, min: 0, default: 0 },
    bookingAmount: { type: Number, min: 0 },
    bookingPercent: { type: Number, min: 0, max: 100 },
    monthlyInstallment: { type: Number, min: 0 },
    installmentMonths: { type: Number, min: 0 },
    avgRentalYield: { type: Number, min: 0, max: 100 },
    avgMonthlyRent: { type: Number, min: 0 },
    investmentScoreAvg: {
      type: String,
      enum: ['low', 'medium', 'high', 'excellent'],
    },
    parkingIncluded: { type: Boolean, default: false },
    parkingSpacesPerUnit: { type: Number, min: 0 },
    possessionDate: { type: Date },
    isReadyForPossession: { type: Boolean, default: false },
    soldInLast30Days: { type: Number, min: 0, default: 0 },
    soldInLast60Days: { type: Number, min: 0, default: 0 },
    isFastSelling: { type: Boolean, default: false },
    hotDealsCount: { type: Number, min: 0, default: 0 },
    popularityScore: { type: Number, min: 0, max: 100, default: 0 },
    viewCount: { type: Number, min: 0, default: 0 },
    inquiryCount: { type: Number, min: 0, default: 0 },
    lastSoldDate: { type: Date },
    lastUnitAddedDate: { type: Date },
    lastSyncedAt: { type: Date },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    seoSlug: { type: String, trim: true, maxlength: 120 },
    layoutImageUrl: { type: String },
    layoutImagePublicId: { type: String },
    interiorImages: [
      {
        url: { type: String },
        publicId: { type: String },
        caption: { type: String },
      },
    ],
    floorPlanPdfUrl: { type: String },
    floorPlanPdfPublicId: { type: String },
    walkthroughVideoUrl: { type: String },
    floorPlanUrl: { type: String },
    floorPlanPublicId: { type: String },
  },
  { _id: false }
);

const ProjectImageSchema = new Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    caption: { type: String },
    type: {
      type: String,
      enum: [
        'exterior', 'interior', 'amenity', 'floor_plan',
        'progress', 'render', 'other',
      ],
      default: 'other',
    },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const FloorPlanSchema = new Schema(
  {
    title: { type: String, required: true },
    unitType: { type: String },
    area: { type: Number, min: 0 },
    areaUnit: { type: String, default: 'Sq. Ft.' },
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    imageUrl: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  { _id: false }
);

const BuildingFloorPlanSchema = new Schema(
  {
    floorName: { type: String, required: true },
    floorNumber: { type: Number },
    floorType: {
      type: String,
      enum: ['parking', 'commercial', 'residential', 'amenity', 'rooftop', 'mixed'],
    },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    pdfUrl: { type: String },
    pdfPublicId: { type: String },
    description: { type: String },
    unitsOnFloor: [{ type: String }],
  },
  { _id: false }
);

const DevelopmentUpdateSchema = new Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String },
    images: [
      {
        url: { type: String },
        publicId: { type: String },
        caption: { type: String },
      },
    ],
    videoUrl: { type: String },
    progressPercent: { type: Number, min: 0, max: 100 },
    // Transparency evidence fields (ConstructionTracker display support)
    isDroneUpdate: { type: Boolean, default: false },
    engineerNote: { type: String, maxlength: 1000 },
    qualityChecks: [{ type: String, maxlength: 100 }],
  },
  { _id: false }
);

const NearbyFacilitySchema = new Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'hospital', 'school', 'restaurant', 'park', 'mall',
        'mosque', 'bank', 'transport', 'other',
      ],
      required: true,
    },
    distance: { type: String },
    icon: { type: String },
  },
  { _id: false }
);

const ProjectHighlightSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String },
  },
  { _id: false }
);

const LocationAdvantageSchema = new Schema(
  {
    title: { type: String, required: true },
    points: [{ type: String }],
  },
  { _id: false }
);

const OfferingSchema = new Schema(
  {
    category: { type: String, required: true },
    items: [{ type: String }],
    icon: { type: String },
  },
  { _id: false }
);

const InvestmentReasonSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String },
  },
  { _id: false }
);

const AmenityDetailedSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
  },
  { _id: false }
);

const GalleryImageSchema = new Schema<IGalleryImage>(
  {
    url: { type: String, required: true },
    // New records use publicId; public_id remains readable for legacy data.
    publicId: { type: String },
    public_id: { type: String },
    caption: { type: String, maxlength: 200 },
    isPrimary: { type: Boolean, default: false },
    category: {
      type: String,
      enum: [
        'exterior', 'interior', 'amenity', 'amenities', 'view', 'lobby',
        'construction', 'render', 'floor_plan', 'aerial', 'other',
      ],
      default: 'other',
    },
    order: { type: Number, default: 0, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProjectVideoSchema = new Schema(
  {
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['youtube', 'vimeo', 'direct'],
      default: 'youtube',
    },
    title: { type: String },
    thumbnail: { type: String },
    category: {
      type: String,
      enum: ['overview', 'walkthrough', 'drone', 'construction', 'testimonial'],
    },
  },
  { _id: false }
);

const PaymentPlanInstallmentSchema = new Schema<IPaymentPlanInstallment>(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0 },
    percentage: { type: Number, min: 0, max: 100 },
    dueDate: { type: String, trim: true, maxlength: 60 },
    dueAfter: { type: String, trim: true, maxlength: 60 },
    frequency: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'on_possession'],
    },
    count: { type: Number, min: 0, max: 600 },
    notes: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false }
);

const ProjectPaymentPlanSchema = new Schema<IProjectPaymentPlan>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    planType: {
      type: String,
      required: true,
      enum: ['standard', 'easy_installment', 'flexi', 'down_payment', 'full_payment', 'custom'],
    },
    applicableTo: {
      type: String,
      enum: ['all_units', 'residential', 'commercial', 'specific_types'],
      default: 'all_units',
    },
    unitTypes: [{ type: String, trim: true, maxlength: 80 }],
    totalPrice: { type: Number, min: 0 },
    currency: { type: String, trim: true, maxlength: 10, default: 'PKR' },
    bookingAmount: { type: Number, min: 0 },
    bookingPercent: { type: Number, min: 0, max: 100 },
    downPayment: { type: Number, min: 0 },
    downPaymentPercent: { type: Number, min: 0, max: 100 },
    downPaymentDueIn: { type: String, trim: true, maxlength: 60 },
    installments: { type: [PaymentPlanInstallmentSchema], default: [] },
    possessionAmount: { type: Number, min: 0 },
    possessionPercent: { type: Number, min: 0, max: 100 },
    planDuration: { type: Number, min: 0, max: 600 },
    planDurationUnit: { type: String, enum: ['months', 'years'] },
    earlyPaymentDiscount: { type: Number, min: 0, max: 100 },
    fullPaymentDiscount: { type: Number, min: 0, max: 100 },
    bulkBookingDiscount: { type: Number, min: 0, max: 100 },
    validFrom: { type: Date },
    validUntil: { type: Date },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, min: 0, max: 10_000, default: 0 },
    termsAndConditions: { type: String, maxlength: 5000 },
    disclaimers: { type: String, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

const ProjectDocumentItemSchema = new Schema<IProjectDocumentItem>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    category: {
      type: String,
      enum: [
        'noc', 'approval_letter', 'building_plan', 'layout_plan',
        'development_agreement', 'allotment_letter', 'rera_registration',
        'environmental_clearance', 'brochure', 'payment_plan', 'floor_plan',
        'specification', 'legal', 'financial', 'other',
      ],
      default: 'other',
    },
    visibility: {
      type: String,
      enum: ['public', 'registered', 'admin_only'],
      default: 'public',
    },
    fileType: { type: String, required: true },
    fileSize: { type: Number, min: 0 },
    resourceType: { type: String, enum: ['image', 'raw'] },
    format: { type: String },
    order: { type: Number, min: 0, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String },
  },
  { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const ProjectSchema = new Schema<IProject>(
  {
    // ── IDENTITY & PLATFORM TRACKING ───────────
    projectId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // ── OWNERSHIP ────────────────────────────
    developerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── CLASSIFICATION ───────────────────────
    projectCategory: {
      type: String,
      enum: [
        // Canonical values (align with types/projects.ts)
        'high_rise',
        'housing_society',
        'mixed_use',
        'commercial_plaza',
        'townhouse',
        'gated_community',
        'farmhouse_community',
        'industrial_park',
        // Legacy short-form (grandfathered — pre-existing data)
        'highrise',
        'society',
      ],
      required: true,
      index: true,
    },
    projectNature: {
      type: String,
      enum: ['residential', 'commercial', 'mixed'],
      required: true,
      index: true,
    },

    // ── IDENTITY ─────────────────────────────
    projectName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
      index: true,
    },
    slug: { type: String, unique: true, sparse: true, index: true },
    tagline: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 10000 },
    shortDescription: { type: String, maxlength: 500 },

    // ── LOCATION ─────────────────────────────
    city: { type: String, required: true, index: true },
    area: { type: String, required: true, index: true },
    specificLocation: { type: String },
    googleMapLink: { type: String },
    coordinatesRaw: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined },
    },
    nearbyLandmarks: [{ type: String }],

    // ── PROJECT STATUS ────────────────────────
    projectType: {
      type: String,
      enum: ['Residential', 'Commercial', 'Mixed Use'],
    },
    projectStatus: {
      type: String,
      enum: ['Planning', 'Pre-Launch', 'Under Development', 'Launched', 'Completed'],
      default: 'Planning',
      index: true,
    },
    launchDate: { type: Date },
    developmentProgress: { type: Number, min: 0, max: 100, default: 0 },
    expectedCompletionDate: { type: Date },
    possessionStartDate: { type: Date },

    // ── APPROVALS ────────────────────────────
    approvalAuthority: { type: String },
    isApproved: {
      type: String,
      enum: ['approved', 'pending', 'rejected', 'not_applied'],
      default: 'not_applied',
      index: true,
    },
    nocStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected', 'not_applied'],
      default: 'not_applied',
      index: true,
    },
    nocNumber: { type: String },
    societyRegistrationNumber: { type: String },
    environmentClearance: { type: Boolean, default: false },
    buildingPlanApproved: { type: Boolean, default: false },
    legalDocs: {
      nocUrl: { type: String },
      nocPublicId: { type: String },
      secpCertUrl: { type: String },
      secpCertPublicId: { type: String },
      layoutMapUrl: { type: String },
      layoutMapPublicId: { type: String },
      environmentCertUrl: { type: String },
      environmentCertPublicId: { type: String },
      authorityLicenseUrl: { type: String },
      authorityLicensePublicId: { type: String },
      brochureUrl: { type: String },
      brochurePublicId: { type: String },
    },

    // ── DEVELOPER PORTFOLIO ──────────────────
    relatedProjects: [RelatedProjectSchema],

    // ── SCALE ────────────────────────────────
    totalArea: { type: String },
    totalBlocks: { type: Number, min: 0 },
    totalUnits: { type: Number, min: 0 },
    unitsSold: { type: Number, min: 0, default: 0 },
    unitsAvailable: { type: Number, min: 0 },
    priceRangeText: { type: String },
    minPrice: { type: Number, min: 0, index: true },
    maxPrice: { type: Number, min: 0, index: true },

    floorDetails: {
      totalFloors: { type: Number, min: 0 },
      floorsForParking: { type: Number, min: 0 },
      floorsForCommercial: { type: Number, min: 0 },
      floorsForResidential: { type: Number, min: 0 },
      namedFloors: [{ type: String }],
    },

    societyDetails: {
      totalLandArea: { type: Number, min: 0 },
      landAreaUnit: { type: String, default: 'Kanal' },
      totalResidentialPlots: { type: Number, min: 0 },
      totalCommercialPlots: { type: Number, min: 0 },
      plotSizesOffered: { type: String },
      developmentStatus: {
        type: String,
        enum: ['launched', 'developing', 'developed'],
      },
      facilities: [{ type: String }],
    },

    // ── PRICING ──────────────────────────────
    saleMode: {
      type: String,
      enum: ['Installment', 'Full Payment', 'Both'],
    },
    fullPaymentInfo: {
      fullPrice: { type: Number, min: 0 },
      areaSize: { type: Number, min: 0 },
      areaUnit: { type: String, enum: ['Sq.ft', 'Marla', 'Sq.yard', 'Kanal'] },
      pricePerUnit: { type: Number, min: 0 },
    },
    paymentPlanImages: [
      {
        url:      { type: String, required: true },
        publicId: { type: String },
        caption:  { type: String, maxlength: 150 },
      },
    ],
    // Floor-wise price list images (DocumentsSection editor)
    floorWisePriceImages: [
      {
        url:     { type: String, required: true },
        caption: { type: String, maxlength: 150 },
      },
    ],
    installmentPlan: {
      totalPrice: { type: Number, min: 0 },
      bookingAmount: { type: Number, min: 0 },
      bookingPercent: { type: Number, min: 0, max: 100 },
      downPayment: { type: Number, min: 0 },
      downPaymentPercent: { type: Number, min: 0, max: 100 },
      monthlyAmount: { type: Number, min: 0 },
      monthlyDuration: { type: Number, min: 0 },
      quarterlyAmount: { type: Number, min: 0 },
      quarterlyDuration: { type: Number, min: 0 },
      halfYearlyAmount: { type: Number, min: 0 },
      halfYearlyDuration: { type: Number, min: 0 },
      yearlyAmount: { type: Number, min: 0 },
      yearlyDuration: { type: Number, min: 0 },
      possessionAmount: { type: Number, min: 0 },
      possessionPercent: { type: Number, min: 0, max: 100 },
      planValidity: { type: String },
      planDuration: { type: Number, min: 0 },
      planDurationUnit: { type: String, enum: ['months', 'years'] },
      earlyPaymentDiscount: { type: Number, min: 0, max: 100 },
      fullPaymentDiscount: { type: Number, min: 0, max: 100 },
    },
    paymentPlans: { type: [ProjectPaymentPlanSchema], default: [] },

    unitTypeBreakdown: [UnitTypeSchema],

    // ── DEVELOPER SNAPSHOT ───────────────────
    developerProfile: {
      name: { type: String },
      ceoName: { type: String },
      contactNumber: { type: String },
      officialEmail: { type: String },
      whatsappNumber: { type: String },
      website: { type: String },
      socialLinks: [{ type: String }],
      logoUrl: { type: String },
      logoPublicId: { type: String },
      registrationCertUrl: { type: String },
      description: { type: String },
      establishedYear: { type: Number },
      completedProjectsCount: { type: Number, min: 0 },
      developerBadge: {
        type: String,
        enum: ['new_entrant', 'emerging', 'trusted', 'premium'],
      },
    },
    developerApprovalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'pending',
      index: true,
    },
    developerVerifiedAt: { type: Date, default: null },

    // ── MEDIA ────────────────────────────────
    projectLogo: { type: String },
    projectLogoPublicId: { type: String },
    featureImageUrl: { type: String },
    featureImagePublicId: { type: String },
    images: [ProjectImageSchema],
    progressImages: [{ type: String }],
    floorPlans: [FloorPlanSchema],
    buildingFloorPlans: [BuildingFloorPlanSchema],
    projectDocuments: {
      brochureUrl: { type: String },
      brochurePublicId: { type: String },
      priceListUrl: { type: String },
      priceListPublicId: { type: String },
      paymentPlanUrl: { type: String },
      paymentPlanPublicId: { type: String },
      masterPlanUrl: { type: String },
      masterPlanPublicId: { type: String },
      nocDocumentUrl: { type: String },
      nocDocumentPublicId: { type: String },
    },
    documents: { type: [ProjectDocumentItemSchema], default: [] },
    droneVideoUrl: { type: String },
    virtualTourUrl: { type: String },
    projectVideoUrl: { type: String },
    constructionVideoUrl: { type: String },
    gallery: [GalleryImageSchema],
    videos: [ProjectVideoSchema],

    // ── AMENITIES ────────────────────────────
    buildingAmenities: [{ type: String }],
    communityAmenities: [{ type: String }],
    securityFeatures: [{ type: String }],
    sustainabilityFeatures: [{ type: String }],
    amenitiesDetailed: [AmenityDetailedSchema],

    // ── CONTENT ──────────────────────────────
    highlights: [{ type: String }],
    projectHighlights: [ProjectHighlightSchema],
    locationAdvantages: [LocationAdvantageSchema],
    offerings: [OfferingSchema],
    investmentReasons: [InvestmentReasonSchema],
    nearbyFacilities: [NearbyFacilitySchema],
    developmentUpdates: [DevelopmentUpdateSchema],
    contactDetails: {
      personName: { type: String },
      designation: { type: String },
      primaryPhone: { type: String },
      secondaryPhone: { type: String },
      whatsappNumber: { type: String },
      email: { type: String },
      officeAddress: { type: String },
      officeHours: { type: String },
      showPhoneOnListing: { type: Boolean, default: true },
      allowWhatsappMessages: { type: Boolean, default: true },
    },

    // ── TRUST & VERIFICATION ─────────────────
    highriseScore: { type: Number, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
    deliveryStatus: {
      type: String,
      enum: ['on_track', 'slightly_delayed', 'critical_delay', 'completed'],
    },
    verificationLevel: {
      type: String,
      enum: ['not_verified', 'docs_verified', 'site_verified', 'handover_verified'],
    },

    developerBadge: {
      type: String,
      enum: ['new_entrant', 'emerging', 'trusted', 'premium'],
      index: true,
    },
    badgeAssignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    badgeAssignedAt: { type: Date, default: null },
    badgeNotes: { type: String, maxlength: 1000 },
    isTrustedBuilder: { type: Boolean, default: false, index: true },

    // ── RISK ALERTS (NEW — V5.7.0 Phase A) ───────────────────────
    riskAlerts: {
      type: [RiskAlertSchema],
      default: [],
    },

    // ── LISTING STATUS ───────────────────────
    status: {
      type: String,
      enum: ['draft', 'pending', 'verified', 'rejected'],
      default: 'draft',
      index: true,
    },
    requestedVerification: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    isVerified: { type: Boolean, default: false, index: true },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, maxlength: 1000 },

    // ── SOFT DELETE ──────────────────────────
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },

    // ── ENGAGEMENT ───────────────────────────
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0, min: 0 },
    compareCount: { type: Number, default: 0, min: 0 },
    shareCount: { type: Number, default: 0, min: 0 },

    // ── SEO ──────────────────────────────────
    metaTitle: { type: String, maxlength: 70 },
    metaDescription: { type: String, maxlength: 160 },

    // ── VERIFICATION PANEL (Fact-Based) ─────────
    verificationPanel: {
      verifiedBy: { type: String, trim: true },
      source: { type: String, trim: true },
      verifiedAt: { type: Date },
      legalDisclaimer: { type: String, trim: true },
    },
    keywords: [{ type: String }],
    canonicalUrl: { type: String },

    // ── RATINGS ──────────────────────────────
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    ratingBreakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// ============================================
// INDEXES
// ============================================

ProjectSchema.index({ developerId: 1 });
ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ status: 1, isDeleted: 1 });
ProjectSchema.index({ verificationStatus: 1, status: 1 });
ProjectSchema.index({ city: 1, projectCategory: 1, status: 1, isDeleted: 1 });
ProjectSchema.index({ city: 1, projectNature: 1, status: 1, isDeleted: 1 });
ProjectSchema.index({
  projectCategory: 1,
  projectNature: 1,
  city: 1,
  status: 1,
  isDeleted: 1,
});
ProjectSchema.index({ minPrice: 1, maxPrice: 1, status: 1, isDeleted: 1 });
ProjectSchema.index({ isFeatured: 1, status: 1, isDeleted: 1 });
ProjectSchema.index({ isVerified: 1, status: 1, isDeleted: 1 });
ProjectSchema.index({ isTrustedBuilder: 1, status: 1, isDeleted: 1 });
ProjectSchema.index({ developerBadge: 1, status: 1, isDeleted: 1 });
ProjectSchema.index({ developerApprovalStatus: 1, status: 1, isDeleted: 1 });
ProjectSchema.index({ averageRating: -1, totalReviews: -1 });
ProjectSchema.index({ metaTitle: 1 });
ProjectSchema.index({ keywords: 1 });

// Risk alerts compound index — optimised for unified feed queries:
//   { 'riskAlerts.status': 'active', 'riskAlerts.severity': 'high' }
//   sorted by issuedAt descending
ProjectSchema.index(
  { 'riskAlerts.status': 1, 'riskAlerts.severity': 1, 'riskAlerts.issuedAt': -1 },
  { name: 'project_risk_alerts', sparse: true }
);

// Geospatial + full-text
ProjectSchema.index({ location: '2dsphere' });
ProjectSchema.index(
  {
    projectName: 'text',
    description: 'text',
    shortDescription: 'text',
    city: 'text',
    area: 'text',
    'developerProfile.name': 'text',
  },
  { name: 'project_text_search' }
);

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

ProjectSchema.pre<IProject>('save', function () {
  // 0) Generate Platform Unique ID (HR-PRJ-[HEX])
  if (!this.projectId) {
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.projectId = `HR-PRJ-${hex}`;
  }

  // 1) Slug hardening
  if (!this.slug && this.projectName) {
    const base = slugify(
      `${this.projectName}-${this.city || ''}-${this.area || ''}`
    );
    const core = clampStr(base || 'project', 100);
    this.slug = `${core}-${shortSuffix()}`;
  } else if (this.slug) {
    const normalized = slugify(this.slug);
    this.slug = clampStr(normalized || `project-${shortSuffix()}`, 120);
  }

  // 2) GeoJSON sync from legacy coordinates object
  const lat = this.coordinates?.lat;
  const lng = this.coordinates?.lng;
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  ) {
    this.location = { type: 'Point', coordinates: [lng, lat] };
  }

  // 3) SEO auto-fill
  if (!this.metaTitle && this.projectName) {
    const mt = `${this.projectName} - ${this.city} | Highrise.pk`;
    this.metaTitle = clampStr(mt, 70);
    if (mt.length > 70) this.metaTitle = mt.slice(0, 67) + '...';
  }

  if (!this.metaDescription && this.description) {
    const plain = String(this.description).replace(/<[^>]*>/g, '');
    this.metaDescription =
      plain.length > 157 ? plain.slice(0, 157) + '...' : plain;
  }

  if (!this.keywords || this.keywords.length === 0) {
    this.keywords = (
      [
        this.projectName,
        this.city,
        this.area,
        this.projectCategory,
        this.projectNature,
        'highrise.pk',
        'pakistan project',
      ] as (string | undefined)[]
    ).filter((k): k is string => Boolean(k));
  }

  if (!this.canonicalUrl && this.slug) {
    this.canonicalUrl = `${SITE_URL}/projects/${this.slug}`;
  }

  // 4) Phone normalization
  if (this.developerProfile?.contactNumber) {
    this.developerProfile.contactNumber =
      normalizePhone(this.developerProfile.contactNumber) ||
      this.developerProfile.contactNumber;
  }
  if (this.developerProfile?.whatsappNumber) {
    this.developerProfile.whatsappNumber =
      normalizePhone(this.developerProfile.whatsappNumber) ||
      this.developerProfile.whatsappNumber;
  }
  if (this.contactDetails?.primaryPhone) {
    this.contactDetails.primaryPhone =
      normalizePhone(this.contactDetails.primaryPhone) ||
      this.contactDetails.primaryPhone;
  }
  if (this.contactDetails?.secondaryPhone) {
    this.contactDetails.secondaryPhone =
      normalizePhone(this.contactDetails.secondaryPhone) ||
      this.contactDetails.secondaryPhone;
  }
  if (this.contactDetails?.whatsappNumber) {
    this.contactDetails.whatsappNumber =
      normalizePhone(this.contactDetails.whatsappNumber) ||
      this.contactDetails.whatsappNumber;
  }

  // 5) Email validation
  if (
    this.developerProfile?.officialEmail &&
    !isValidEmail(this.developerProfile.officialEmail)
  ) {
    this.developerProfile.officialEmail = undefined;
  }
  if (
    this.contactDetails?.email &&
    !isValidEmail(this.contactDetails.email)
  ) {
    this.contactDetails.email = undefined;
  }

  // 6) URL validation
  const urlPairs: Array<[Record<string, unknown> | null | undefined, string]> =
    [
      [this.developerProfile as Record<string, unknown> | undefined, 'website'],
      [this as unknown as Record<string, unknown>, 'googleMapLink'],
      [this as unknown as Record<string, unknown>, 'droneVideoUrl'],
      [this as unknown as Record<string, unknown>, 'virtualTourUrl'],
      [this as unknown as Record<string, unknown>, 'projectVideoUrl'],
      [this as unknown as Record<string, unknown>, 'constructionVideoUrl'],
    ];
  for (const [obj, key] of urlPairs) {
    if (obj && typeof obj[key] === 'string' && !isValidUrl(obj[key] as string)) {
      obj[key] = undefined;
    }
  }

  // 7) Derived values from unitTypeBreakdown
  const derived = computeDerivedFromUnitTypes(
    this.unitTypeBreakdown as IUnitType[] | undefined
  );
  if (typeof derived.minPrice === 'number') this.minPrice = derived.minPrice;
  if (typeof derived.maxPrice === 'number') this.maxPrice = derived.maxPrice;
  if (typeof derived.totalUnits === 'number') this.totalUnits = derived.totalUnits;
  if (typeof derived.unitsSold === 'number') this.unitsSold = derived.unitsSold;
  if (typeof derived.unitsAvailable === 'number')
    this.unitsAvailable = derived.unitsAvailable;

  // 8) Auto-derive isTrustedBuilder
  this.isTrustedBuilder = deriveTrustedBuilder(this.developerBadge);

  // 9) Sync badge into snapshot and map tiers
  if (this.developerProfile?.developerBadge) {
    this.developerBadge = mapDeveloperBadgeToTier(this.developerProfile.developerBadge);
  }
  if (this.developerBadge && this.developerProfile) {
    this.developerProfile.developerBadge = this.developerBadge;
  }

  // 10) Soft delete consistency
  if (this.isDeleted && !this.deletedAt) this.deletedAt = new Date();
  if (!this.isDeleted && this.deletedAt) this.deletedAt = null;

  // 11) Verified status sync
  if (this.status === 'verified') {
    this.isVerified = true;
    if (!this.verifiedAt) this.verifiedAt = new Date();
    this.verificationStatus = 'verified';
  } else if (this.status === 'rejected') {
    this.isVerified = false;
    this.verificationStatus = 'rejected';
  } else if (this.status === 'pending') {
    this.verificationStatus = 'pending';
  }

  // 12) Risk alert consistency — auto-set resolvedAt when status → resolved
  if (Array.isArray(this.riskAlerts)) {
    for (const alert of this.riskAlerts) {
      if (alert.status === 'resolved' && !alert.resolvedAt) {
        alert.resolvedAt = new Date();
      }
      if (alert.status !== 'resolved' && alert.resolvedAt) {
        alert.resolvedAt = undefined;
      }
    }
  }
});

// ============================================
// PRE-UPDATE MIDDLEWARE
// ============================================

function applyDerivedToUpdate(update: Record<string, unknown>): void {
  const $set = (update.$set as Record<string, unknown>) || {};

  const unitTypes =
    ($set.unitTypeBreakdown as IUnitType[] | undefined) ??
    (update.unitTypeBreakdown as IUnitType[] | undefined);

  if (unitTypes !== undefined) {
    const derived = computeDerivedFromUnitTypes(unitTypes);
    update.$set = update.$set || {};
    const s = update.$set as Record<string, unknown>;
    if (typeof derived.minPrice === 'number') s.minPrice = derived.minPrice;
    if (typeof derived.maxPrice === 'number') s.maxPrice = derived.maxPrice;
    if (typeof derived.totalUnits === 'number') s.totalUnits = derived.totalUnits;
    if (typeof derived.unitsSold === 'number') s.unitsSold = derived.unitsSold;
    if (typeof derived.unitsAvailable === 'number')
      s.unitsAvailable = derived.unitsAvailable;
  }

  const badge =
    ($set.developerBadge as DeveloperBadgeTier | undefined) ??
    (update.developerBadge as DeveloperBadgeTier | undefined);
  if (badge !== undefined) {
    update.$set = update.$set || {};
    (update.$set as Record<string, unknown>).isTrustedBuilder =
      deriveTrustedBuilder(badge);
    (update.$set as Record<string, unknown>)[
      'developerProfile.developerBadge'
    ] = badge;
  }

  if (typeof $set.isDeleted === 'boolean') {
    update.$set = update.$set || {};
    const s = update.$set as Record<string, unknown>;
    s.deletedAt = $set.isDeleted ? (s.deletedAt ?? new Date()) : null;
  }

  const coords = ($set.coordinates ?? update.coordinates) as
    | { lat?: number; lng?: number }
    | undefined;
  const lat = coords?.lat;
  const lng = coords?.lng;
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  ) {
    update.$set = update.$set || {};
    (update.$set as Record<string, unknown>).location = {
      type: 'Point',
      coordinates: [lng, lat],
    };
  }

  const slug =
    ($set.slug as string | undefined) ?? (update.slug as string | undefined);
  if (typeof slug === 'string' && slug.trim()) {
    update.$set = update.$set || {};
    const s = update.$set as Record<string, unknown>;
    if (!s.canonicalUrl) {
      s.canonicalUrl = `${SITE_URL}/projects/${slug.trim()}`;
    }
  }

  const newStatus =
    ($set.status as ListingStatus | undefined) ??
    (update.status as ListingStatus | undefined);
  if (newStatus) {
    update.$set = update.$set || {};
    const s = update.$set as Record<string, unknown>;
    if (newStatus === 'verified') {
      s.isVerified = true;
      s.verificationStatus = 'verified';
      if (!s.verifiedAt) s.verifiedAt = new Date();
    } else if (newStatus === 'rejected') {
      s.isVerified = false;
      s.verificationStatus = 'rejected';
    } else if (newStatus === 'pending') {
      s.verificationStatus = 'pending';
    }
  }
}

ProjectSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  if (!update || Array.isArray(update)) return;
  applyDerivedToUpdate(update as Record<string, unknown>);
  this.setUpdate(update as Parameters<typeof this.setUpdate>[0]);
});

ProjectSchema.pre('updateOne', function () {
  const update = this.getUpdate();
  if (!update || Array.isArray(update)) return;
  applyDerivedToUpdate(update as Record<string, unknown>);
  this.setUpdate(update as Parameters<typeof this.setUpdate>[0]);
});

ProjectSchema.pre('updateMany', function () {
  const update = this.getUpdate();
  if (!update || Array.isArray(update)) return;
  applyDerivedToUpdate(update as Record<string, unknown>);
  this.setUpdate(update as Parameters<typeof this.setUpdate>[0]);
});

// ============================================
// VIRTUAL FIELDS
// ============================================

ProjectSchema.virtual('primaryImage').get(function (this: IProject) {
  const imgs = this.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const primary = imgs.find((img) => img.isPrimary);
    return primary ? primary.url : imgs[0].url;
  }
  const gallery = this.gallery;
  if (Array.isArray(gallery) && gallery.length > 0) {
    return gallery[0].url;
  }
  return this.featureImageUrl ?? null;
});

ProjectSchema.virtual('soldPercentage').get(function (this: IProject) {
  const total = this.totalUnits;
  const sold = this.unitsSold;
  if (total && total > 0 && sold !== undefined) {
    return Math.round((sold / total) * 100);
  }
  return 0;
});

ProjectSchema.virtual('availablePercentage').get(function (this: IProject) {
  const total = this.totalUnits;
  const available = this.unitsAvailable;
  if (total && total > 0 && available !== undefined) {
    return Math.round((available / total) * 100);
  }
  return 0;
});

/**
 * activeRiskAlertCount — used on admin cards for quick badge display.
 * Counts only 'active' alerts (not resolved or investigating).
 */
ProjectSchema.virtual('activeRiskAlertCount').get(function (this: IProject) {
  if (!Array.isArray(this.riskAlerts)) return 0;
  return this.riskAlerts.filter((a) => a.status === 'active').length;
});

/**
 * highestAlertSeverity — for sort/display priority.
 * Returns the most severe active alert severity, or null.
 */
ProjectSchema.virtual('highestAlertSeverity').get(function (this: IProject) {
  if (!Array.isArray(this.riskAlerts)) return null;
  const active = this.riskAlerts.filter((a) => a.status === 'active');
  if (active.length === 0) return null;
  const order: Record<string, number> = {
    critical: 4, high: 3, medium: 2, low: 1,
  };
  return active.reduce((max, a) =>
    (order[a.severity] ?? 0) > (order[max.severity] ?? 0) ? a : max
  ).severity;
});

ProjectSchema.virtual('badgeLabel').get(function (this: IProject) {
  const labels: Record<DeveloperBadgeTier, string> = {
    new_entrant: 'New Developer',
    emerging: 'Emerging Builder',
    trusted: 'Trusted Developer',
    premium: 'Premium Developer',
  };
  return this.developerBadge ? labels[this.developerBadge] : null;
});

ProjectSchema.virtual('badgeEmoji').get(function (this: IProject) {
  const emojis: Record<DeveloperBadgeTier, string> = {
    new_entrant: '🆕',
    emerging: '⭐',
    trusted: '🏆',
    premium: '💎',
  };
  return this.developerBadge ? emojis[this.developerBadge] : null;
});

ProjectSchema.set('toJSON', { virtuals: true });
ProjectSchema.set('toObject', { virtuals: true });

// ============================================
// MODEL EXPORT
// ============================================

const Project =
  mongoose.models.Project ||
  mongoose.model<IProject>('Project', ProjectSchema);

export default Project;