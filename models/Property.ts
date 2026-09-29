// models/Property.ts
import mongoose, { Schema, Document, CallbackError } from 'mongoose';
import crypto from 'crypto';
import { canTransitionPropertyVerification } from '@/lib/property/propertyLifecycle';

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

function requireEnvSecret(key: string): string {
  const val = process.env[key];
  if (!val || val.startsWith('change-me')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `[Highrise.pk] FATAL: Environment variable "${key}" is not set or is using default value. ` +
        `This is a security violation. Set a strong secret in your .env file.`
      );
    }
    // Dev/test: warn but don't crash
    return key === 'PROPERTY_HASH_SECRET'
      ? 'dev-hash-secret-not-for-production'
      : 'dev-encryption-key-32-chars-padded';
  }
  return val;
}

const DUPLICATE_HASH_SECRET = requireEnvSecret('PROPERTY_HASH_SECRET');
const ENCRYPTION_KEY = requireEnvSecret('PROPERTY_ENCRYPTION_KEY');

// Pakistan geo boundaries (approximate)
const PAKISTAN_BOUNDS = {
  minLat: 23.5,
  maxLat: 37.1,
  minLng: 60.8,
  maxLng: 77.8,
};

// Quality score weights (must sum to 100)
const QUALITY_WEIGHTS = {
  hasImages:       20,
  hasDescription:  15,
  hasCoordinates:  15,
  hasContact:      10,
  hasAmenities:    10,
  hasDocuments:    10,
  isVerified:      20,
} as const;

// ═══════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type ListingType      = 'full_payment' | 'installment' | 'rent' | 'pre_launch';
export type ListingPurpose   = 'new_booking' | 'resale' | 'transfer';
export type PropertyCategory = 'residential' | 'commercial';
export type PropertyCondition =
  | 'new_launch'
  | 'under_construction'
  | 'near_completion'
  | 'completed'
  | 'ready_possession';

export type VerificationStatus =
  | 'draft'
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'flagged';

// Legacy status — auto-synced from verification.status
export type LegacyStatus = 'pending' | 'approved' | 'rejected' | 'available';

export type PlotStatus       = 'file' | 'on_ground';
export type DevelopmentStatus =
  | 'undeveloped'
  | 'under_development'
  | 'semi_developed'
  | 'fully_developed';
export type BookingStatus    = 'open' | 'closing_soon' | 'closed';
export type BallotStatus     = 'pending' | 'done' | 'not_applicable';
export type ParkingIncluded  = 'included' | 'separate' | 'optional';
export type ProjectStatus =
  | 'launching'
  | 'booking_open'
  | 'under_development'
  | 'near_completion'
  | 'completed'
  | 'possession_started';
export type ApprovalStatus   = 'approved' | 'pending' | 'not_required' | 'rejected';
export type UtilityStatus    = 'available' | 'applied' | 'not_available';
export type UtilityInclusion = 'included' | 'not_included' | 'on_possession' | 'on_actual';
export type MaintenanceIncluded =
  | 'included_limited'
  | 'included_lifetime'
  | 'not_included'
  | 'optional';
export type TaxPaidBy  = 'buyer' | 'seller' | 'shared' | 'negotiable';
export type FileType   = 'open_file' | 'allocation' | 'affidavit' | 'registry' | 'lease';
export type TrustLevel = 'unverified' | 'basic' | 'standard' | 'trusted' | 'premium';

// ═══════════════════════════════════════════════════════════════
// 🛡️ VERIFICATION & FRAUD INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface IVerificationMetadata {
  status:                 VerificationStatus;
  submittedAt?:           Date;
  verifiedAt?:            Date;
  verifiedBy?:            mongoose.Types.ObjectId;
  rejectedAt?:            Date;
  rejectedBy?:            mongoose.Types.ObjectId;
  rejectionReason?:       string;
  internalNotes?:         string;
  verificationScore?:     number;
  requiresManualReview?:  boolean;
  lastReviewedAt?:        Date;
}

export interface IOwnershipProof {
  hasProof: boolean;
  // Legacy URL-encrypted fields retained only for migration compatibility.
  titleDeedEncrypted?: string;
  authorityLetterEncrypted?: string;
  cnicCopyEncrypted?: string;
  // Canonical durable Cloudinary references. Public IDs are encrypted at rest.
  titleDeedPublicIdEncrypted?: string;
  titleDeedResourceType?: 'image' | 'raw';
  authorityLetterPublicIdEncrypted?: string;
  authorityLetterResourceType?: 'image' | 'raw';
  cnicCopyPublicIdEncrypted?: string;
  cnicCopyResourceType?: 'image' | 'raw';
  uploadedAt?: Date;
  reviewStatus?: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  verifiedByAdmin?: boolean;
  verificationNotes?: string;
}

export interface IFraudDetection {
  duplicateHash?:        string;
  isPotentialDuplicate?: boolean;
  duplicateOf?:          mongoose.Types.ObjectId[];
  priceAnomalyScore?:    number;
  isPriceAnomaly?:       boolean;
  marketAveragePrice?:   number;
  aiFlags?:              string[];
  manualFlags?:          string[];
  fraudScore?:           number;
  lastFraudCheckAt?:     Date;
}

export interface IQualityMetrics {
  completenessScore:  number;
  hasImages:          boolean;
  imageCount:         number;
  hasDescription:     boolean;
  descriptionLength:  number;
  hasCoordinates:     boolean;
  hasContact:         boolean;
  hasAmenities:       boolean;
  amenityCount:       number;
  hasDocuments:       boolean;
  documentCount:      number;
  isVerified:         boolean;
  lastCalculatedAt?:  Date;
}

// ✅ UNIQUE TO HIGHRISE.PK — Trust Score (public-facing)
export interface ITrustScore {
  score:             number;      // 0-100 composite
  level:             TrustLevel;  // human label
  qualityComponent:  number;      // 0-25
  verifiedComponent: number;      // 0-30
  ownershipComponent:number;      // 0-25
  fraudComponent:    number;      // 0-20 (inverted — 20 = no fraud)
  lastCalculatedAt:  Date;
  isPublic:          boolean;     // shown on listing card
}

// ✅ UNIQUE TO HIGHRISE.PK — True Cost Engine
export interface ITrueCost {
  basePrice:                   number;
  bookingAmount?:              number;
  downPaymentAmount?:          number;
  totalInstallmentsAmount?:    number;
  possessionAmount?:           number;
  extraChargesTotal?:          number;
  possessionChargesTotal?:     number;
  governmentTaxBuyerFiler?:    number;
  governmentTaxBuyerNonFiler?: number;
  governmentTaxSellerFiler?:   number;
  governmentTaxSellerNonFiler?:number;
  transferChargesTotal?:       number;
  maintenanceAnnual?:          number;
  grandTotalBuyerFiler:        number;
  grandTotalBuyerNonFiler:     number;
  hiddenChargesDisclosed:      boolean;
  calculatedAt:                Date;
}

// ✅ UNIQUE TO HIGHRISE.PK — Market Intelligence
export interface IMarketIntelligence {
  societyAveragePricePerSqft?: number;
  cityAveragePricePerSqft?:    number;
  priceVsMarketPercent?:       number;  // +/- vs market avg
  priceRating?:                'below_market' | 'at_market' | 'above_market' | 'premium';
  demandScore?:                number;  // 0-100 based on inquiries + views
  investmentScore?:            number;  // 0-100 composite
  rentalYield?:                number;  // percent (for buy-to-let analysis)
  capitalGrowthEstimate?:      number;  // annual % estimate
  lastUpdatedAt?:              Date;
}

// ✅ UNIQUE TO HIGHRISE.PK — Audit Trail on property
export interface IPropertyAuditEntry {
  action:      string;
  performedBy: mongoose.Types.ObjectId;
  role:        string;
  timestamp:   Date;
  previousValue?: string;
  newValue?:      string;
  reason?:        string;
  ip?:            string;
}

// ═══════════════════════════════════════════════════════════════
// 📦 SUB-DOCUMENT INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface IImage {
  url:        string;
  public_id:  string;
  caption?:   string;
  isPrimary?: boolean;
  category?:
    | 'exterior' | 'interior' | 'bedroom' | 'bathroom'
    | 'kitchen'  | 'living'   | 'view'    | 'amenity'
    | 'floor_plan' | 'other';
  order?: number;
}

export interface IGalleryImage {
  url:       string;
  public_id: string;
  caption?:  string;
  category:
    | 'exterior' | 'interior' | 'bedroom'   | 'bathroom'
    | 'kitchen'  | 'living'   | 'view'      | 'amenity'
    | 'floor_plan' | 'construction' | 'render' | 'other';
  order?: number;
}

export interface INearbyFacility {
  name:      string;
  category?: string;
  distance?: string;
}

export interface IDocument {
  type:        string;
  name:        string;
  url:         string;
  public_id:   string;
  size?:       number;
  uploadedAt?: Date;
}

export interface IFloorPlan {
  floorName: string;
  floorNumber?: number;
  imageUrl?: string;
  imagePublicId?: string;
  pdfUrl?: string;
  pdfPublicId?: string;
  resourceType?: 'image' | 'raw';
  mimeType?: string;
  description?: string;
}

export interface IUnitPlan {
  unitType:           'apartment' | 'shop' | 'office' | 'penthouse' | 'studio' | 'food_court' | 'other';
  unitName:           string;
  size?:              number;
  sizeUnit?:          string;
  bedrooms?:          number;
  bathrooms?:         number;
  layoutImageUrl?:    string;
  layoutImagePublicId?: string;
  interiorImages?:    { url: string; publicId: string; caption?: string }[];
  pdfUrl?:            string;
  pdfPublicId?:       string;
  features?:          string[];
  priceRange?:        string;
  description?:       string;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IGeoPoint {
  type:        'Point';
  coordinates: [number, number];
}

export interface IBooking {
  amount?:  number;
  percent?: number;
  status?:  BookingStatus;
}

export interface IDownPayment {
  amount?:           number;
  percent?:          number;
  dueWithin?:        string;
  inInstallments?:   boolean;
  installmentCount?: number;
}

export interface IInstallmentPlan {
  hasMonthly?:       boolean;
  monthlyAmount?:    number;
  monthlyCount?:     number;
  hasQuarterly?:     boolean;
  quarterlyAmount?:  number;
  quarterlyCount?:   number;
  hasHalfYearly?:    boolean;
  halfYearlyAmount?: number;
  halfYearlyCount?:  number;
  hasYearly?:        boolean;
  yearlyAmount?:     number;
  yearlyCount?:      number;
  planDuration?:     number;
  planDurationUnit?: 'months' | 'years';
  startDate?:        Date;
}

export interface IPossession {
  amount?:       number;
  percent?:      number;
  dueOn?:        string;
  expectedDate?: Date;
  status?:       string;
}

export interface IBallot {
  status?:                    BallotStatus;
  date?:                      Date;
  isAllocated?:               boolean;
  allocationLetterAvailable?: boolean;
}

export interface IResaleTracking {
  isResale?:              boolean;
  installmentsPaid?:      number;
  installmentsRemaining?: number;
  amountPaid?:            number;
  amountRemaining?:       number;
  profitAmount?:          number;
}

export interface IOtherCharges {
  confirmationCharges?:  number;
  transferFee?:          number;
  developmentCharges?:   number;
  otherCharges?:         number;
  latePaymentSurcharge?: number;
  earlyPaymentDiscount?: number;
}

// V4.9.7 — Parking redesign (6-step conversational flow)
export type ParkingAvailability = 'dedicated' | 'shared' | 'none';
export type ParkingLocationType = 'covered' | 'open' | 'garage' | 'basement' | 'driveway';

export interface IParking {
  // Step 1 — Availability
  availability?:       ParkingAvailability;   // 'dedicated' | 'shared' | 'none'
  available?:          boolean;               // ✅ Legacy — keep (derived: availability !== 'none')

  // Step 2 — Pricing model
  isIncludedInPrice?:  boolean;               // true = no extra cost
  included?:           ParkingIncluded;       // ✅ Legacy enum — keep for compat

  // Step 3 — Extra cost breakdown (only if !isIncludedInPrice)
  oneTimePurchaseFee?: number;                // One-time buy cost (e.g. garage purchase)
  monthlyFee?:         number;                // Monthly parking fee
  price?:              number;                // ✅ Legacy — keep (was combined price)

  // Step 4 — Vehicle counts
  carSpaces?:          number;                // Dedicated car spots
  motorcycleSpaces?:   number;               // Dedicated motorcycle spots
  spaces?:             number;               // ✅ Legacy total — keep for compat

  // Step 5 — Physical type
  type?:               string;               // ✅ Legacy free-text — keep for compat
  locationType?:       ParkingLocationType;  // 'covered' | 'open' | 'garage' | 'basement' | 'driveway'
  size?:               number;               // Area in sqft (for garage/basement)
  pricePerSqft?:       number;               // ✅ Legacy — keep

  // Step 6 — Features
  isDedicated?:        boolean;              // Assigned spot vs first-come-first-serve
  hasEVCharging?:      boolean;              // ✅ Existing — keep
  hasCCTV?:            boolean;              // Parking area under CCTV
  hasVisitorParking?:  boolean;              // Separate visitor parking available
  hasValet?:           boolean;              // Valet parking service
  hasSecurityGuard?:   boolean;              // Security guard in parking area
  specialNotes?:       string;              // Free text (e.g. "2nd basement, slot B-14")

  // Legacy location string — keep for compat
  location?:           string;
}

export interface IProjectDetails {
  projectName?:            string;
  developerName?:          string;
  developerContact?:       string;
  projectType?:            string;
  projectStatus?:          ProjectStatus;
  developmentProgress?:    number;
  launchDate?:             Date;
  expectedCompletionDate?: Date;
  possessionStartDate?:    Date;
  totalProjectArea?:       string;
  totalUnits?:             number;
  unitsSold?:              number;
  unitsAvailable?:         number;
}

export interface IApprovals {
  authority?:                   string;
  approvalStatus?:              ApprovalStatus;
  nocStatus?:                   ApprovalStatus;
  nocNumber?:                   string;
  environmentClearance?:        boolean;
  buildingPlanApproved?:        boolean;
  societyRegistrationNumber?:   string;
}

export interface IUtilityCharge {
  inclusion?:         UtilityInclusion;
  meterType?:         string;
  connectionType?:    string;
  source?:            string;
  connectionCharges?: number;
  monthlyEstimate?:   number;
}

export interface IUtilities {
  electricity?: IUtilityCharge;
  gas?:         IUtilityCharge;
  water?:       IUtilityCharge;
  sewerage?:    IUtilityCharge;
}

export interface IInfrastructure {
  electricityStatus?: UtilityStatus;
  electricityLoad?:   string;
  gasStatus?:         string;
  waterStatus?:       string;
  sewerageStatus?:    UtilityStatus;
  internetReady?:     boolean;
  cctvCoverage?:      boolean;
  streetLights?:      boolean;
  roadCondition?:     string;
  gatedCommunity?:    boolean;
  securityLevel?:     string;
}

export interface IExtraCharges {
  cornerCharges?:            number;
  cornerChargesPercent?:     number;
  facingCharges?:            number;
  facingChargesType?:        string;
  floorPreferenceCharges?:   number;
  developmentCharges?:       number;
  documentationCharges?:     number;
  processingFee?:            number;
  fdcCharges?:               number;
  otherExtraCharges?:        number;
  otherExtraChargesNote?:    string;
}

export interface IPossessionCharges {
  possessionFee?:              number;
  electricityMeterCharges?:    number;
  gasMeterCharges?:            number;
  waterConnectionCharges?:     number;
  sewerageCharges?:            number;
  generatorShare?:             number;
  liftShare?:                  number;
  securityDeposit?:            number;
  advanceMaintenance?:         number;
  advanceMaintenanceMonths?:   number;
  sinkingFund?:                number;
  parkingAllotmentCharges?:    number;
  terraceCharges?:             number;
  gardenCharges?:              number;
  otherPossessionCharges?:     number;
  otherPossessionNote?:        string;
  totalPossessionCharges?:     number;
}

export interface IMaintenance {
  isApplicable?:      boolean;
  included?:          MaintenanceIncluded;
  freePeriodMonths?:  number;
  calculationType?:   string;
  perSqft?:           number;
  fixedAmount?:       number;
  estimatedMonthly?:  number;
  covers?:            string[];
  managedBy?:         string;
  hasSinkingFund?:    boolean;
  sinkingFundPerSqft?: number;
}

export interface IGovernmentTaxes {
  dcRate?:     number;
  fbrValue?:   number;
  stampDuty?:  { percent?: number; amount?: number; paidBy?: TaxPaidBy };
  cvt?:        { percent?: number; amount?: number; paidBy?: TaxPaidBy };
  wht?:        { filerAmount?: number; nonFilerAmount?: number };
  advanceTax?: { filerAmount?: number; nonFilerAmount?: number };
  cgt?:        { applicable?: boolean; holdingPeriodYears?: number; rate?: number; amount?: number };
}

export interface ITransferCharges {
  societyTransferFee?:          number;
  societyTransferPercent?:      number;
  membershipTransferFee?:       number;
  nocCharges?:                  number;
  registrationFee?:             number;
  mutationFee?:                 number;
  agentCommission?:             number;
  agentCommissionPercent?:      number;
  agentCommissionPaidBy?:       TaxPaidBy;
  totalBuyerChargesFiler?:      number;
  totalBuyerChargesNonFiler?:   number;
  totalSellerChargesFiler?:     number;
  totalSellerChargesNonFiler?:  number;
}

export interface IHiddenChargesDisclosure {
  hasHiddenCharges?:      boolean;
  escalationClause?:      boolean;
  escalationDetails?:     string;
  delayPenalty?:          boolean;
  delayPenaltyDetails?:   string;
  priceRevisionClause?:   boolean;
  priceRevisionDetails?:  string;
  otherHiddenCharges?:    string;
  allChargesDisclosed?:   boolean;
}

export interface ILegal {
  ownershipType?:              string;
  fileType?:                   FileType | '';
  transferType?:               string;
  documentationAvailable?:     string[];
  previousOwner?:              string;
  hasDispute?:                 boolean;
  disputeDetails?:             string;
  societyMembershipRequired?:  boolean;
  membershipTransferFee?:      number | null;
  taxPaidUpToDate?:            boolean;
}

export interface IContact {
  personName?:           string;
  primaryPhone?:         string;
  secondaryPhone?:       string;
  whatsappNumber?:       string;
  email?:                string;
  preferredMethod?:      'call' | 'whatsapp' | 'email' | 'any';
  contactTime?:          string;
  showPhoneOnListing?:   boolean;
  allowWhatsappMessages?: boolean;
}

export interface IRentalBills {
  allIncluded?:          boolean;
  electricityIncluded?:  boolean;
  gasIncluded?:          boolean;
  waterIncluded?:        boolean;
  internetIncluded?:     boolean;
}

export interface IRentalTenantPreferences {
  familyOnly?:            boolean;
  bachelorsAllowed?:      boolean;
  petsAllowed?:           boolean;
  smokingAllowed?:        boolean;
  commercialUseAllowed?:  boolean;
}

export interface IRentalDetails {
  monthlyRent?:               number;
  securityDeposit?:           number;
  advanceRentMonths?:         number;
  minContractMonths?:         number;
  maxContractMonths?:         number;
  incrementPerYear?:          number;
  maintenanceChargesMonthly?: number;
  maintenanceIncluded?:       boolean;
  utilitiesIncluded?:         boolean;
  utilitiesDetails?:          string;
  parkingIncluded?:           boolean;
  parkingCharges?:            number;
  immediateAvailable?:        boolean;
  shortTermAllowed?:          boolean;
  petsAllowed?:               boolean;
  smokingAllowed?:            boolean;
  preferredTenant?:           string;
  maxOccupants?:              string;
  agreementType?:             string;
  rentNegotiable?:            boolean;
  availableFrom?:             Date;
  advanceMonths?:             number;
  minimumStayMonths?:         number;
  leaseDurationMonths?:       number;
  leaseFlexible?:             boolean;
  bills?:                     IRentalBills;
  tenantPreferences?:         IRentalTenantPreferences;
}

// ═══════════════════════════════════════════════════════════════
// 🏠 MAIN PROPERTY INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface IProperty extends Document {
  propertyId?: string;
  // Ownership
  owner:        mongoose.Types.ObjectId;
  agentId?:     mongoose.Types.ObjectId;      // Direct ref → AgentProfile
  developerId?: mongoose.Types.ObjectId;      // Direct ref → DeveloperProfile

  // Kind
  propertyKind:     'standalone' | 'project' | 'project_unit';
  projectId?:       mongoose.Types.ObjectId | null;
  projectCategory?: 'highrise' | 'society';

   // Category-specific flexible details
  details?: Record<string, unknown>;

  // Type classification
  residentialType?: 'plot' | 'house' | 'apartment';
  commercialType?:  'shop' | 'office' | 'warehouse' | 'building' | 'food_court' | 'other';
  typeKey?:         string;

  // Core
  title:              string;
  urduTitle?:         string;           // ✅ Bilingual SEO
  slug?:              string;
  propertyCategory?:  PropertyCategory;
  propertyType:       string;
  propertySubtype?:   string;
  listingType:        ListingType;
  listingPurpose?:    ListingPurpose;
  propertyCondition?: PropertyCondition;

  // Pricing
  price:            number;
  pricePerUnit?:    number;
  priceNegotiable?: boolean;
  previousPrice?:   number;
  priceDropPercent?: number;
  priceHistory?: {
    oldPrice?:      number;
    changeAmount?:  number;
    changePercent?: number;
    changeType?:    'increase' | 'decrease';
    changedAt?:     Date;
  };

  // Size
  area:             number;
  unit:             string;

  // Location
  province?:         string;
  city:              string;
  locality?:         string;
  society:           string;
  phase?:            string;
  block?:            string;
  streetNumber?:     string;
  plotNumber?:       string;
  completeAddress?:  string;
  nearbyLandmark?:   string;
  coordinates?:      ICoordinates;
  location?:         IGeoPoint;
  formattedAddress?: string;

  // Dimensions
  coveredArea?:     number;
  coveredAreaUnit?: string;
  plotWidth?:       number;
  plotDepth?:       number;
  grossArea?:       number;
  netArea?:         number;
  balconyArea?:     number;
  unitNumber?:      string;

  // Plot-specific
  plotCategory?:      string;
  isCornerPlot?:      boolean;
  cornerCharges?:     number;
  facingDirection?:   string;
  specialFacing?:     string[];
  plotStatus?:        PlotStatus | '';
  developmentStatus?: DevelopmentStatus | '';
  openSides?:         string;
  hasBoundaryWall?:   boolean;

  // Residential rooms
  bedrooms?:             number;
  bathrooms?:            number;
  drawingRoom?:          boolean;
  diningRoom?:           boolean;
  livingRoom?:           boolean;
  kitchens?:             number;
  storeRooms?:           number;
  servantQuarter?:       boolean;
  servantQuarterRooms?:  number;
  numberOfFloors?:       number;
  floors?:               number;
  basement?:             boolean;
  basementArea?:         number;
  rooftopAccess?:        boolean;
  lawnGarden?:           string;
  garage?:               string;
  porch?:                boolean;

  // Apartment-specific
  apartmentType?:   string;
  floorNumber?:     number;
  totalFloors?:     number;
  view?:            string;
  balconies?:       number;
  isCornerUnit?:    boolean;
  hasAttachedBath?: boolean;

  // Commercial-specific
  floorLocation?:          string;
  shopPosition?:           string;
  shopFrontWidth?:         number;
  shopDepth?:              number;
  shopHeight?:             number;
  hasMezzanine?:           boolean;
  mezzanineArea?:          number;
  numberOfLifts?:          number;
  hasBasement?:            boolean;
  commercialBasementArea?: number;
  washroom?:               string;
  hasWashroom?:            boolean;
  hasSignage?:             boolean;
  shutterType?:            string;
  hasDisplayWindow?:       boolean;
  suitableFor?:            string[];
  electricityLoad?:        string;
  ceilingHeight?:          string;

  // Food court
  seatingCapacity?:  number;
  kitchenSpace?:     string;
  storageArea?:      number;
  hasExhaustSystem?: boolean;
  hasGreaseTrap?:    boolean;
  hasWaterConnection?: boolean;

  // Payment
  booking?:              IBooking;
  downPayment?:          IDownPayment;
  installmentPlan?:      IInstallmentPlan;
  possession?:           IPossession;
  ballot?:               IBallot;
  resaleTracking?:       IResaleTracking;
  otherPaymentCharges?:  IOtherCharges;

  // Parking
  parking?:        string;
  parkingDetails?: IParking;

  // Project
  projectDetails?:  IProjectDetails;
  approvals?:       IApprovals;

  // Infrastructure
  utilities?:       IUtilities;
  infrastructure?:  IInfrastructure;

  // Cost breakdown
  extraCharges?:             IExtraCharges;
  possessionCharges?:        IPossessionCharges;
  maintenance?:              IMaintenance;
  governmentTaxes?:          IGovernmentTaxes;
  transferCharges?:          ITransferCharges;
  hiddenChargesDisclosure?:  IHiddenChargesDisclosure;

  // Computed totals (legacy — replaced by trueCost)
  totalExtraCharges?:         number;
  totalPossessionCost?:       number;
  grandTotalWithAllCharges?:  number;

  // Features
  furnished?:          string;
  condition?:          string;
  facing?:             string;
  interiorFeatures?:   string[];
  exteriorFeatures?:   string[];
  buildingAmenities?:  string[];
  societyAmenities?:   string[];
  securityFeatures?:   string[];
  amenities?:          string[];
  nearbyFacilities?:   INearbyFacility[];

  // Legal
  possessionStatus?: string;
  ownershipType?:    string;
  legal?:            ILegal;
  documents?:        IDocument[];

  // Media
  featureImageUrl?:     string;
  featureImagePublicId?: string;
  gallery?:             IGalleryImage[];
  images?:              IImage[];
  primaryImageIndex?:   number;

  // Video
  videoUrl?:             string;
  droneVideoUrl?:        string;
  virtualTourUrl?:       string;
  constructionVideoUrl?: string;
  developerVideoUrl?:    string;

  // Downloads
  brochureUrl?:        string;
  brochurePublicId?:   string;
  priceListUrl?:       string;
  priceListPublicId?:  string;
  paymentPlanUrl?:     string;
  paymentPlanPublicId?: string;

  // Plans
  floorPlans?: IFloorPlan[];
  unitPlans?:  IUnitPlan[];

  // Content
  description:           string;
  shortDescription?:     string;
  investmentHighlights?: string;
  whyBuyThis?:           string;
  termsAndConditions?:   string;

  // Contact
  whatsappNumber?:  string;
  contactTime?:     string;
  contactDetails?:  IContact;
  rentalDetails?:   IRentalDetails;

  // ✅ VERIFICATION & TRUST (Highrise.pk exclusive)
  verification:     IVerificationMetadata;
  ownershipProof?:  IOwnershipProof;
  fraudDetection?:  IFraudDetection;
  qualityMetrics?:  IQualityMetrics;
  trustScore?:      ITrustScore;              // Public-facing trust composite
  trueCost?:        ITrueCost;               // True Cost Engine
  marketIntelligence?: IMarketIntelligence; // Market data overlay

  // Audit trail on property itself
  auditTrail?: IPropertyAuditEntry[];

  // Legacy status (auto-synced from verification.status)
  status?:     LegacyStatus;
  isVerified?: boolean;
  isFeatured?: boolean;
  isDeleted?:  boolean;
  deletedAt?:  Date | null;
  deletedBy?:  mongoose.Types.ObjectId | null;
  isFlagged?:  boolean;
  flagReason?: string | null;
  flaggedAt?:  Date | null;

  // Analytics
  views?:         number;
  favoriteCount?: number;
  inquiryCount?:  number;
  compareCount?:  number;
  shareCount?:    number;

  // SEO
  metaTitle?:     string;
  metaDescription?: string;
  keywords?:      string[];
  canonicalUrl?:  string;

  // Tracking
  developer?:            string;
  createdBy?:            mongoose.Types.ObjectId;
  updatedBy?:            mongoose.Types.ObjectId;
  lastStatusChangedAt?:  Date;
  lastPriceChangedAt?:   Date;

  createdAt?: Date;
  updatedAt?: Date;

  // Virtual
  primaryImage?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * HMAC-based duplicate detection hash
 * Combines: city + society + area + price (normalized)
 */
function generateDuplicateHash(
  city:    string,
  society: string,
  area:    number,
  price:   number
): string {
  const normalized = [
    String(city    || '').toLowerCase().trim(),
    String(society || '').toLowerCase().trim(),
    Math.round(Number(area  || 0)),
    Math.round(Number(price || 0) / 1000) * 1000,
  ].join('|');

  return crypto
    .createHmac('sha256', DUPLICATE_HASH_SECRET)
    .update(normalized)
    .digest('hex');
}

/**
 * AES-256-GCM encryption for ownership proof document URLs
 * Separate from kycCrypto — different key, different purpose
 */
function encryptData(plaintext: string): string {
  if (!plaintext) return '';

  const iv      = crypto.randomBytes(16);
  const key     = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const cipher  = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted  = cipher.update(plaintext, 'utf8', 'hex');
  encrypted     += cipher.final('hex');
  const authTag  = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * AES-256-GCM decryption
 */
function decryptData(ciphertext: string): string {
  if (!ciphertext) return '';

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return '';

    const [ivHex, authTagHex, encrypted] = parts;
    const key      = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted  = decipher.update(encrypted, 'hex', 'utf8');
    decrypted     += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

/**
 * Quality completeness score (0-100)
 */
function calculateQualityScore(property: Partial<IProperty>): number {
  let score = 0;

  if (Array.isArray(property.images) && property.images.length > 0) {
    score += QUALITY_WEIGHTS.hasImages;
  }
  if (typeof property.description === 'string' && property.description.length >= 100) {
    score += QUALITY_WEIGHTS.hasDescription;
  }
  if (
    Array.isArray(property.location?.coordinates) &&
    property.location!.coordinates.length === 2
  ) {
    score += QUALITY_WEIGHTS.hasCoordinates;
  }
  if (typeof property.contactDetails?.primaryPhone === 'string' &&
      property.contactDetails.primaryPhone.length > 0) {
    score += QUALITY_WEIGHTS.hasContact;
  }
  if (Array.isArray(property.amenities) && property.amenities.length > 0) {
    score += QUALITY_WEIGHTS.hasAmenities;
  }
  if (Array.isArray(property.documents) && property.documents.length > 0) {
    score += QUALITY_WEIGHTS.hasDocuments;
  }
  if (property.verification?.status === 'verified') {
    score += QUALITY_WEIGHTS.isVerified;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * ✅ Trust Score Engine — Highrise.pk Exclusive
 * Combines quality + verification + ownership + fraud into
 * a single public-facing trust number (0-100)
 */
function calculateTrustScore(property: Partial<IProperty>): ITrustScore {
  // Component 1: Quality (0-25)
  const qScore = property.qualityMetrics?.completenessScore ?? 0;
  const qualityComponent = Math.round((qScore / 100) * 25);

  // Component 2: Verification status (0-30)
  const verificationMap: Record<VerificationStatus, number> = {
    draft:        0,
    pending:      5,
    under_review: 10,
    rejected:     0,
    flagged:      0,
    verified:     30,
  };
  const verStatus = property.verification?.status ?? 'draft';
  const verifiedComponent = verificationMap[verStatus] ?? 0;

  // Component 3: Ownership proof (0-25)
  let ownershipComponent = 0;
  const proof = property.ownershipProof;
  if (proof?.hasProof) {
    ownershipComponent += 8;
    if (proof.titleDeedEncrypted)       ownershipComponent += 7;
    if (proof.authorityLetterEncrypted) ownershipComponent += 5;
    if (proof.cnicCopyEncrypted)        ownershipComponent += 3;
    if (proof.verifiedByAdmin)          ownershipComponent += 2;
  }
  ownershipComponent = Math.min(25, ownershipComponent);

  // Component 4: Fraud safety (0-20) — inverted fraud score
  const rawFraud = property.fraudDetection?.fraudScore ?? 0;
  const isDuplicate = property.fraudDetection?.isPotentialDuplicate ?? false;
  const isAnomaly   = property.fraudDetection?.isPriceAnomaly ?? false;
  let fraudComponent = 20;
  fraudComponent -= Math.round((rawFraud / 100) * 15);
  if (isDuplicate) fraudComponent -= 3;
  if (isAnomaly)   fraudComponent -= 2;
  fraudComponent = Math.max(0, fraudComponent);

  const score = qualityComponent + verifiedComponent + ownershipComponent + fraudComponent;

  let level: TrustLevel;
  if (score >= 85)      level = 'premium';
  else if (score >= 70) level = 'trusted';
  else if (score >= 50) level = 'standard';
  else if (score >= 30) level = 'basic';
  else                  level = 'unverified';

  return {
    score:              Math.min(100, Math.max(0, score)),
    level,
    qualityComponent,
    verifiedComponent,
    ownershipComponent,
    fraudComponent,
    lastCalculatedAt:   new Date(),
    isPublic:           true,
  };
}

/**
 * ✅ True Cost Engine — Highrise.pk Exclusive
 * Auto-calculates all-in cost for buyer (filer + non-filer)
 */
function calculateTrueCost(property: Partial<IProperty>): ITrueCost {
  const base = Number(property.price) || 0;

  // Booking + down payment
  const bookingAmount     = property.booking?.amount ?? 0;
  const downPaymentAmount = property.downPayment?.amount ?? 0;

  // Installments total
  let totalInstallmentsAmount = 0;
  const ip = property.installmentPlan;
  if (ip) {
    totalInstallmentsAmount +=
      (ip.monthlyAmount    ?? 0) * (ip.monthlyCount    ?? 0) +
      (ip.quarterlyAmount  ?? 0) * (ip.quarterlyCount  ?? 0) +
      (ip.halfYearlyAmount ?? 0) * (ip.halfYearlyCount ?? 0) +
      (ip.yearlyAmount     ?? 0) * (ip.yearlyCount     ?? 0);
  }

  // Possession amount
  const possessionAmount = property.possession?.amount ?? 0;

  // Extra charges total
  const ec = property.extraCharges;
  const extraChargesTotal = ec
    ? (ec.cornerCharges          ?? 0) +
      (ec.facingCharges          ?? 0) +
      (ec.floorPreferenceCharges ?? 0) +
      (ec.developmentCharges     ?? 0) +
      (ec.documentationCharges   ?? 0) +
      (ec.processingFee          ?? 0) +
      (ec.fdcCharges             ?? 0) +
      (ec.otherExtraCharges      ?? 0)
    : 0;

  // Possession charges
  const pc = property.possessionCharges;
  const possessionChargesTotal = pc?.totalPossessionCharges ?? 0;

  // Government taxes — buyer side
  const gt = property.governmentTaxes;
  const tc = property.transferCharges;
  const governmentTaxBuyerFiler    = gt
    ? (gt.stampDuty?.paidBy === 'buyer' ? gt.stampDuty?.amount ?? 0 : 0) +
      (gt.cvt?.paidBy       === 'buyer' ? gt.cvt?.amount       ?? 0 : 0) +
      (gt.wht?.filerAmount    ?? 0) +
      (gt.advanceTax?.filerAmount ?? 0)
    : 0;

  const governmentTaxBuyerNonFiler = gt
    ? (gt.stampDuty?.paidBy === 'buyer' ? gt.stampDuty?.amount ?? 0 : 0) +
      (gt.cvt?.paidBy       === 'buyer' ? gt.cvt?.amount       ?? 0 : 0) +
      (gt.wht?.nonFilerAmount    ?? 0) +
      (gt.advanceTax?.nonFilerAmount ?? 0)
    : 0;

  const governmentTaxSellerFiler    = tc?.totalSellerChargesFiler    ?? 0;
  const governmentTaxSellerNonFiler = tc?.totalSellerChargesNonFiler ?? 0;

  // Transfer charges
  const transferChargesTotal = tc
    ? (tc.societyTransferFee    ?? 0) +
      (tc.membershipTransferFee ?? 0) +
      (tc.nocCharges            ?? 0) +
      (tc.registrationFee       ?? 0) +
      (tc.mutationFee           ?? 0)
    : 0;

  // Annual maintenance
  const maintenanceAnnual = (property.maintenance?.estimatedMonthly ?? 0) * 12;

  // Grand totals
  const commonCosts =
    base +
    extraChargesTotal +
    possessionChargesTotal +
    transferChargesTotal;

  const grandTotalBuyerFiler    = commonCosts + governmentTaxBuyerFiler;
  const grandTotalBuyerNonFiler = commonCosts + governmentTaxBuyerNonFiler;

  return {
    basePrice:                   base,
    bookingAmount,
    downPaymentAmount,
    totalInstallmentsAmount,
    possessionAmount,
    extraChargesTotal,
    possessionChargesTotal,
    governmentTaxBuyerFiler,
    governmentTaxBuyerNonFiler,
    governmentTaxSellerFiler,
    governmentTaxSellerNonFiler,
    transferChargesTotal,
    maintenanceAnnual,
    grandTotalBuyerFiler,
    grandTotalBuyerNonFiler,
    hiddenChargesDisclosed:
      property.hiddenChargesDisclosure?.allChargesDisclosed ?? false,
    calculatedAt: new Date(),
  };
}

/**
 * Sync legacy `status` field from `verification.status`
 */
function syncLegacyStatus(verStatus: VerificationStatus): LegacyStatus {
  switch (verStatus) {
    case 'verified':     return 'approved';
    case 'rejected':     return 'rejected';
    case 'flagged':      return 'rejected';
    case 'draft':        return 'pending';
    case 'pending':      return 'pending';
    case 'under_review': return 'pending';
    default:             return 'pending';
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 PURE HELPER FUNCTIONS (typed — no any)
// ═══════════════════════════════════════════════════════════════

function toSlugPart(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 140);
}

function isSafeHttpsUrl(url: string): boolean {
  const u = String(url || '').trim();
  if (!u)                            return false;
  if (!/^https:\/\//i.test(u))      return false;
  if (/javascript:/i.test(u))       return false;
  if (/data:/i.test(u))             return false;
  return true;
}

function normalizeArrayStrings(
  arr:      unknown,
  maxItems: number,
  maxLen:   number
): string[] {
  if (!Array.isArray(arr)) return [];
  const uniq = Array.from(
    new Set(
      arr
        .map((x) => String(x ?? '').trim())
        .filter(Boolean)
    )
  );
  return uniq.slice(0, maxItems).map((s) => s.slice(0, maxLen));
}

function ensureSinglePrimary(images: IImage[]): void {
  if (!Array.isArray(images) || images.length === 0) return;
  let found = false;
  for (const img of images) {
    if (!img) continue;
    if (img.isPrimary) {
      if (!found) found = true;
      else        img.isPrimary = false;
    }
  }
  if (!found && images[0]) images[0].isPrimary = true;
}

function fixPrimaryIndex(total: number, idx: unknown): number {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (total <= 0)                    return 0;
  if (n >= total)                    return total - 1;
  return Math.floor(n);
}

function isValidLatLng(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  return la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
}

function isValidPakistanCoordinates(
  lat: number | undefined,
  lng: number | undefined
): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng))     return false;
  return (
    lat >= PAKISTAN_BOUNDS.minLat &&
    lat <= PAKISTAN_BOUNDS.maxLat &&
    lng >= PAKISTAN_BOUNDS.minLng &&
    lng <= PAKISTAN_BOUNDS.maxLng
  );
}

// ═══════════════════════════════════════════════════════════════
// 📦 SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const DocumentSchema = new Schema(
  {
    type:       { type: String, trim: true, maxlength: 40,   required: true },
    name:       { type: String, trim: true, maxlength: 120,  required: true },
    url:        { type: String, trim: true, maxlength: 2048, required: true },
    public_id:  { type: String, trim: true, maxlength: 512,  required: true },
    size:       { type: Number, min: 0 },
    uploadedAt: { type: Date,   default: Date.now },
  },
  { _id: false }
);

const GalleryImageSchema = new Schema(
  {
    url:       { type: String, required: true, trim: true, maxlength: 2048 },
    public_id: { type: String, required: true, trim: true, maxlength: 512  },
    caption:   { type: String, trim: true, maxlength: 140 },
    category:  {
      type: String,
      enum: [
        'exterior','interior','bedroom','bathroom','kitchen',
        'living','view','amenity','floor_plan','construction','render','other',
      ],
      default: 'other',
    },
    order: { type: Number, default: 0, min: 0, max: 10_000 },
  },
  { _id: false }
);

const ImageSchema = new Schema(
  {
    url:       { type: String, required: true, trim: true, maxlength: 2048 },
    public_id: { type: String, required: true, trim: true, maxlength: 512  },
    caption:   { type: String, trim: true, maxlength: 140 },
    isPrimary: { type: Boolean, default: false },
    category:  {
      type: String,
      enum: [
        'exterior','interior','bedroom','bathroom','kitchen',
        'living','view','amenity','floor_plan','other',
      ],
    },
    order: { type: Number, default: 0, min: 0, max: 10_000 },
  },
  { _id: false }
);

const VerificationMetadataSchema = new Schema(
  {
    status: {
      type:     String,
      enum:     ['draft','pending','under_review','verified','rejected','flagged'],
      default:  'draft',
      required: true,
      index:    true,
    },
    submittedAt:          { type: Date },
    verifiedAt:           { type: Date, index: true },
    verifiedBy:           { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt:           { type: Date },
    rejectedBy:           { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason:      { type: String, trim: true, maxlength: 1000 },
    internalNotes:        { type: String, trim: true, maxlength: 2000 },
    verificationScore:    { type: Number, min: 0, max: 100 },
    requiresManualReview: { type: Boolean, default: false },
    lastReviewedAt:       { type: Date },
  },
  { _id: false }
);

const OwnershipProofSchema = new Schema(
  {
    hasProof: { type: Boolean, default: false },
    // Legacy encrypted URLs — retained until historical migration is complete.
    titleDeedEncrypted: { type: String, trim: true, maxlength: 2048 },
    authorityLetterEncrypted: { type: String, trim: true, maxlength: 2048 },
    cnicCopyEncrypted: { type: String, trim: true, maxlength: 2048 },
    // Canonical encrypted durable Cloudinary IDs.
    titleDeedPublicIdEncrypted: { type: String, trim: true, maxlength: 2048 },
    titleDeedResourceType: { type: String, enum: ['image', 'raw'] },
    authorityLetterPublicIdEncrypted: { type: String, trim: true, maxlength: 2048 },
    authorityLetterResourceType: { type: String, enum: ['image', 'raw'] },
    cnicCopyPublicIdEncrypted: { type: String, trim: true, maxlength: 2048 },
    cnicCopyResourceType: { type: String, enum: ['image', 'raw'] },
    uploadedAt: { type: Date },
    reviewStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'verified', 'rejected'],
      default: 'not_submitted',
    },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedByAdmin: { type: Boolean, default: false },
    verificationNotes: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const FraudDetectionSchema = new Schema(
  {
    duplicateHash:        { type: String, index: true, maxlength: 128 },
    isPotentialDuplicate: { type: Boolean, default: false, index: true },
    duplicateOf:          [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    priceAnomalyScore:    { type: Number, min: 0, max: 1 },
    isPriceAnomaly:       { type: Boolean, default: false, index: true },
    marketAveragePrice:   { type: Number, min: 0 },
    aiFlags:              [{ type: String, trim: true, maxlength: 200 }],
    manualFlags:          [{ type: String, trim: true, maxlength: 200 }],
    fraudScore:           { type: Number, min: 0, max: 100, index: true },
    lastFraudCheckAt:     { type: Date },
  },
  { _id: false }
);

const QualityMetricsSchema = new Schema(
  {
    completenessScore: { type: Number, min: 0, max: 100, default: 0, index: true },
    hasImages:         { type: Boolean, default: false },
    imageCount:        { type: Number,  default: 0, min: 0 },
    hasDescription:    { type: Boolean, default: false },
    descriptionLength: { type: Number,  default: 0, min: 0 },
    hasCoordinates:    { type: Boolean, default: false },
    hasContact:        { type: Boolean, default: false },
    hasAmenities:      { type: Boolean, default: false },
    amenityCount:      { type: Number,  default: 0, min: 0 },
    hasDocuments:      { type: Boolean, default: false },
    documentCount:     { type: Number,  default: 0, min: 0 },
    isVerified:        { type: Boolean, default: false },
    lastCalculatedAt:  { type: Date },
  },
  { _id: false }
);

// ✅ UNIQUE: Trust Score Schema
const TrustScoreSchema = new Schema(
  {
    score:              { type: Number, min: 0, max: 100, default: 0, index: true },
    level:              {
      type:    String,
      enum:    ['unverified','basic','standard','trusted','premium'],
      default: 'unverified',
      index:   true,
    },
    qualityComponent:   { type: Number, min: 0, max: 25,  default: 0 },
    verifiedComponent:  { type: Number, min: 0, max: 30,  default: 0 },
    ownershipComponent: { type: Number, min: 0, max: 25,  default: 0 },
    fraudComponent:     { type: Number, min: 0, max: 20,  default: 20 },
    lastCalculatedAt:   { type: Date },
    isPublic:           { type: Boolean, default: true },
  },
  { _id: false }
);

// ✅ UNIQUE: True Cost Schema
const TrueCostSchema = new Schema(
  {
    basePrice:                   { type: Number, min: 0, default: 0 },
    bookingAmount:               { type: Number, min: 0 },
    downPaymentAmount:           { type: Number, min: 0 },
    totalInstallmentsAmount:     { type: Number, min: 0 },
    possessionAmount:            { type: Number, min: 0 },
    extraChargesTotal:           { type: Number, min: 0 },
    possessionChargesTotal:      { type: Number, min: 0 },
    governmentTaxBuyerFiler:     { type: Number, min: 0 },
    governmentTaxBuyerNonFiler:  { type: Number, min: 0 },
    governmentTaxSellerFiler:    { type: Number, min: 0 },
    governmentTaxSellerNonFiler: { type: Number, min: 0 },
    transferChargesTotal:        { type: Number, min: 0 },
    maintenanceAnnual:           { type: Number, min: 0 },
    grandTotalBuyerFiler:        { type: Number, min: 0, default: 0, index: true },
    grandTotalBuyerNonFiler:     { type: Number, min: 0, default: 0 },
    hiddenChargesDisclosed:      { type: Boolean, default: false },
    calculatedAt:                { type: Date },
  },
  { _id: false }
);

// ✅ UNIQUE: Market Intelligence Schema
const MarketIntelligenceSchema = new Schema(
  {
    societyAveragePricePerSqft: { type: Number, min: 0 },
    cityAveragePricePerSqft:    { type: Number, min: 0 },
    priceVsMarketPercent:       { type: Number },
    priceRating: {
      type: String,
      enum: ['below_market','at_market','above_market','premium'],
    },
    demandScore:             { type: Number, min: 0, max: 100 },
    investmentScore:         { type: Number, min: 0, max: 100, index: true },
    rentalYield:             { type: Number, min: 0 },
    capitalGrowthEstimate:   { type: Number },
    lastUpdatedAt:           { type: Date },
  },
  { _id: false }
);

// ✅ Property-level Audit Trail Entry
const PropertyAuditEntrySchema = new Schema(
  {
    action:        { type: String, required: true, trim: true, maxlength: 80 },
    performedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role:          { type: String, trim: true, maxlength: 40 },
    timestamp:     { type: Date, default: Date.now },
    previousValue: { type: String, trim: true, maxlength: 500 },
    newValue:      { type: String, trim: true, maxlength: 500 },
    reason:        { type: String, trim: true, maxlength: 500 },
    ip:            { type: String, trim: true, maxlength: 64 },
  },
  { _id: false }
);

// ═══════════════════════════════════════════════════════════════
// 🏗️ MAIN PROPERTY SCHEMA
// ═══════════════════════════════════════════════════════════════

const PropertySchema = new Schema<IProperty>(
  {
    propertyId: { type: String, unique: true, sparse: true, index: true },
    // ── Ownership ──────────────────────────────────────────────
    owner: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    agentId: {
      type:  Schema.Types.ObjectId,
      ref:   'AgentProfile',
      index: true,
    },
    developerId: {
      type:  Schema.Types.ObjectId,
      ref:   'DeveloperProfile',
      index: true,
    },

    // ── Kind ───────────────────────────────────────────────────
    propertyKind: {
      type:     String,
      enum:     ['standalone','project','project_unit'],
      default:  'standalone',
      index:    true,
      required: true,
    },
    projectId: {
      type:    Schema.Types.ObjectId,
      ref:     'Project',           // ✅ Fixed: singular model name
      default: null,
      index:   true,
    },
    projectCategory: {
      type:  String,
      enum:  ['highrise','society'],
      index: true,
    },

    // ── Classification ─────────────────────────────────────────
    residentialType: {
      type:  String,
      enum:  ['plot','house','apartment'],
      index: true,
    },
    commercialType: {
      type:  String,
      enum:  ['shop','office','warehouse','building','food_court','other'],
      index: true,
    },
    typeKey: { type: String, index: true, trim: true, maxlength: 60 },

    // ── Core ───────────────────────────────────────────────────
    title: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 10,
      maxlength: 150,
    },
    urduTitle: { type: String, trim: true, maxlength: 200 },  // ✅ Bilingual SEO
    slug: {
      type:   String,
      unique: true,
      sparse: true,
      index:  true,
      trim:   true,
      maxlength: 180,
    },
    propertyCategory: {
      type:    String,
      enum:    ['residential','commercial'],
      default: 'residential',
      index:   true,
    },
    propertyType:    { type: String, required: true, trim: true, maxlength: 60, index: true },
    propertySubtype: { type: String, trim: true, maxlength: 60 },

    // ── Category-specific details (enterprise flexible field) ──
    // Stores all property-type-specific fields:
    // residential: drawingRoom, diningRoom, boundaryWall, genderPreference, etc.
    // plot: plotCategory, roadWidth, allowedFloors, isParkFacing, etc.
    // commercial: shopNumber, frontageWidth, ceilingHeight, loadingBays, etc.
    // agricultural: landType, waterSource, cropHistory, etc.
    details: {
      type:    Schema.Types.Mixed,
      default: {},
    },

    listingType: {
      type:     String,
      required: true,
      enum:     ['full_payment','installment','rent','pre_launch'],
      default:  'full_payment',
      index:    true,
    },
    listingPurpose: {
      type:  String,
      enum:  ['new_booking','resale','transfer'],
      index: true,
    },
    propertyCondition: {
      type:  String,
      enum:  ['new_launch','under_construction','near_completion','completed','ready_possession'],
      index: true,
    },

    // ── Pricing ────────────────────────────────────────────────
    price:            { type: Number, required: true, min: 0, index: true },
    previousPrice:    { type: Number, min: 0 },
    priceDropPercent: { type: Number, min: 0, max: 100 },
    priceHistory: {
      oldPrice:      { type: Number, min: 0 },
      changeAmount:  { type: Number },
      changePercent: { type: Number, min: 0, max: 100 },
      changeType:    { type: String, enum: ['increase','decrease'] },
      changedAt:     { type: Date },
    },
    pricePerUnit:    { type: Number, min: 0, index: true },
    priceNegotiable: { type: Boolean, default: false },

    // ── Size ───────────────────────────────────────────────────
    area: { type: Number, required: true, min: 0, index: true },
    unit: { type: String, required: true, trim: true, maxlength: 20 },

    // ── Location ───────────────────────────────────────────────
    province:         { type: String, trim: true, maxlength: 60,  index: true },
    city:             { type: String, required: true, trim: true, maxlength: 60,  index: true },
    locality:         { type: String, trim: true, maxlength: 80 },
    society:          { type: String, required: false, default: '', trim: true, maxlength: 120, index: true },
    phase:            { type: String, trim: true, maxlength: 60 },
    block:            { type: String, trim: true, maxlength: 60 },
    streetNumber:     { type: String, trim: true, maxlength: 40 },
    plotNumber:       { type: String, trim: true, maxlength: 40 },
    completeAddress:  { type: String, trim: true, maxlength: 220 },
    nearbyLandmark:   { type: String, trim: true, maxlength: 120 },

    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: {
        type:    [Number],
        default: undefined,
        validate: {
          validator: function (v: unknown) {
            if (v === undefined || v === null) return true;
            if (!Array.isArray(v) || v.length !== 2) return false;
            const [lng, lat] = v as [number, number];
            return isValidLatLng(lat, lng) && isValidPakistanCoordinates(lat, lng);
          },
          message: 'Invalid GeoJSON coordinates. Must be within Pakistan boundaries.',
        },
      },
    },
    formattedAddress: { type: String, trim: true, maxlength: 220 },

    // ── Dimensions ─────────────────────────────────────────────
    coveredArea:     { type: Number, min: 0 },
    coveredAreaUnit: { type: String, trim: true, maxlength: 20 },
    plotWidth:       { type: Number, min: 0 },
    plotDepth:       { type: Number, min: 0 },
    grossArea:       { type: Number, min: 0 },
    netArea:         { type: Number, min: 0 },
    balconyArea:     { type: Number, min: 0 },
    unitNumber:      { type: String, trim: true, maxlength: 60 },

    // ── Plot ───────────────────────────────────────────────────
    plotCategory: {
      type: String,
      enum: ['residential','commercial','industrial','agricultural','mosque','school','university','hospital','government','community_center','graveyard','park','fuel_station','hotel','bank','shopping_mall','telecom',''],
    },
    isCornerPlot:     { type: Boolean, default: false },
    cornerCharges:    { type: Number, min: 0 },
    facingDirection:  { type: String, trim: true, maxlength: 40 },
    specialFacing:    [{ type: String, trim: true, maxlength: 40 }],
    plotStatus:       { type: String, enum: ['file','on_ground',''] },
    developmentStatus:{
      type: String,
      enum: ['undeveloped','under_development','semi_developed','fully_developed',''],
    },
    openSides:       { type: String, trim: true, maxlength: 60 },
    hasBoundaryWall: { type: Boolean, default: false },

    // ── Rooms ──────────────────────────────────────────────────
    bedrooms:            { type: Number, min: 0, max: 50 },
    bathrooms:           { type: Number, min: 0, max: 30 },
    drawingRoom:         { type: Boolean, default: false },
    diningRoom:          { type: Boolean, default: false },
    livingRoom:          { type: Boolean, default: false },
    kitchens:            { type: Number, min: 0, max: 10 },
    storeRooms:          { type: Number, min: 0, max: 10 },
    servantQuarter:      { type: Boolean, default: false },
    servantQuarterRooms: { type: Number, min: 0 },
    numberOfFloors:      { type: Number, min: 1, max: 10 },
    floors:              { type: Number, min: 1, max: 10 },
    basement:            { type: Boolean, default: false },
    basementArea:        { type: Number, min: 0 },
    rooftopAccess:       { type: Boolean, default: false },
    lawnGarden:          { type: String, enum: ['none','front','back','both','rooftop',''] },
    garage:              { type: String, trim: true, maxlength: 60 },
    porch:               { type: Boolean, default: false },

    // ── Apartment ──────────────────────────────────────────────
    apartmentType:   { type: String, trim: true, maxlength: 60 },
    floorNumber:     { type: Number, min: 0, max: 200 },
    totalFloors:     { type: Number, min: 1, max: 200 },
    view:            { type: String, trim: true, maxlength: 60 },
    balconies:       { type: Number, min: 0, max: 10 },
    isCornerUnit:    { type: Boolean, default: false },
    hasAttachedBath: { type: Boolean, default: false },

    // ── Commercial ─────────────────────────────────────────────
    floorLocation:          { type: String, trim: true, maxlength: 80 },
    shopPosition:           { type: String, trim: true, maxlength: 80 },
    shopFrontWidth:         { type: Number, min: 0 },
    shopDepth:              { type: Number, min: 0 },
    shopHeight:             { type: Number, min: 0 },
    hasMezzanine:           { type: Boolean, default: false },
    mezzanineArea:          { type: Number, min: 0 },
    numberOfLifts:          { type: Number, min: 0, default: 0 },
    hasBasement:            { type: Boolean, default: false },
    commercialBasementArea: { type: Number, min: 0 },
    washroom:               { type: String, enum: ['none','private','shared',''] },
    hasWashroom:            { type: Boolean, default: false },
    hasSignage:             { type: Boolean, default: true },
    shutterType:            { type: String, trim: true, maxlength: 60 },
    hasDisplayWindow:       { type: Boolean, default: false },
    suitableFor:            [{ type: String, trim: true, maxlength: 60 }],
    electricityLoad:        { type: String, trim: true, maxlength: 60 },
    ceilingHeight:          { type: String, trim: true, maxlength: 60 },

    // ── Food Court ─────────────────────────────────────────────
    seatingCapacity:   { type: Number, min: 0 },
    kitchenSpace:      { type: String, trim: true, maxlength: 60 },
    storageArea:       { type: Number, min: 0 },
    hasExhaustSystem:  { type: Boolean, default: false },
    hasGreaseTrap:     { type: Boolean, default: false },
    hasWaterConnection:{ type: Boolean, default: false },

    // ── Payment ────────────────────────────────────────────────
    booking: {
      amount:  { type: Number, min: 0 },
      percent: { type: Number, min: 0, max: 100 },
      status:  { type: String, enum: ['open','closing_soon','closed'] },
    },
    downPayment: {
      amount:           { type: Number, min: 0 },
      percent:          { type: Number, min: 0, max: 100 },
      dueWithin:        { type: String, trim: true, maxlength: 60 },
      inInstallments:   { type: Boolean, default: false },
      installmentCount: { type: Number, min: 0 },
    },
    installmentPlan: {
      hasMonthly:       { type: Boolean, default: false },
      monthlyAmount:    { type: Number, min: 0 },
      monthlyCount:     { type: Number, min: 0 },
      hasQuarterly:     { type: Boolean, default: false },
      quarterlyAmount:  { type: Number, min: 0 },
      quarterlyCount:   { type: Number, min: 0 },
      hasHalfYearly:    { type: Boolean, default: false },
      halfYearlyAmount: { type: Number, min: 0 },
      halfYearlyCount:  { type: Number, min: 0 },
      hasYearly:        { type: Boolean, default: false },
      yearlyAmount:     { type: Number, min: 0 },
      yearlyCount:      { type: Number, min: 0 },
      planDuration:     { type: Number, min: 0 },
      planDurationUnit: { type: String, enum: ['months','years'] },
      startDate:        { type: Date },
    },
    possession: {
      amount:       { type: Number, min: 0 },
      percent:      { type: Number, min: 0, max: 100 },
      dueOn:        { type: String, trim: true, maxlength: 60 },
      expectedDate: { type: Date },
      status:       { type: String, trim: true, maxlength: 40 },
    },
    ballot: {
      status:                    { type: String, enum: ['pending','done','not_applicable'] },
      date:                      { type: Date },
      isAllocated:               { type: Boolean, default: false },
      allocationLetterAvailable: { type: Boolean, default: false },
    },
    resaleTracking: {
      isResale:              { type: Boolean, default: false },
      installmentsPaid:      { type: Number, min: 0 },
      installmentsRemaining: { type: Number, min: 0 },
      amountPaid:            { type: Number, min: 0 },
      amountRemaining:       { type: Number, min: 0 },
      profitAmount:          { type: Number },
    },
    otherPaymentCharges: {
      confirmationCharges:  { type: Number, min: 0 },
      transferFee:          { type: Number, min: 0 },
      developmentCharges:   { type: Number, min: 0 },
      otherCharges:         { type: Number, min: 0 },
      latePaymentSurcharge: { type: Number, min: 0 },
      earlyPaymentDiscount: { type: Number, min: 0 },
    },

    // ── Parking ────────────────────────────────────────────────
    // V4.9.7: 6-step conversational parking flow
    parking: { type: String, default: '0', trim: true, maxlength: 40 },
    parkingDetails: {
      // Step 1 — Availability
      availability: {
        type:    String,
        enum:    ['dedicated', 'shared', 'none'],
        default: 'none',
      },
      available:    { type: Boolean, default: false },          // Legacy — derived

      // Step 2 — Pricing model
      isIncludedInPrice: { type: Boolean, default: true },
      included: {
        type: String,
        enum: ['included', 'separate', 'optional'],             // Legacy enum
      },

      // Step 3 — Extra cost breakdown
      oneTimePurchaseFee: { type: Number, min: 0 },            // Buy the spot outright
      monthlyFee:         { type: Number, min: 0 },            // Recurring monthly
      price:              { type: Number, min: 0 },            // Legacy combined

      // Step 4 — Vehicle counts
      carSpaces:          { type: Number, min: 0, max: 100 },
      motorcycleSpaces:   { type: Number, min: 0, max: 100 },
      spaces:             { type: Number, min: 0 },            // Legacy total

      // Step 5 — Physical type
      type:         { type: String, trim: true, maxlength: 40 },  // Legacy free-text
      locationType: {
        type: String,
        enum: ['covered', 'open', 'garage', 'basement', 'driveway'],
      },
      size:         { type: Number, min: 0 },
      pricePerSqft: { type: Number, min: 0 },

      // Step 6 — Features
      isDedicated:        { type: Boolean, default: false },
      hasEVCharging:      { type: Boolean, default: false },   // Existing — keep
      hasCCTV:            { type: Boolean, default: false },
      hasVisitorParking:  { type: Boolean, default: false },
      hasValet:           { type: Boolean, default: false },
      hasSecurityGuard:   { type: Boolean, default: false },
      specialNotes:       { type: String, trim: true, maxlength: 300 },

      // Legacy location string
      location: { type: String, trim: true, maxlength: 80 },
    },

    // ── Project ────────────────────────────────────────────────
    projectDetails: {
      projectName:            { type: String, trim: true, maxlength: 120 },
      developerName:          { type: String, trim: true, maxlength: 120 },
      developerContact:       { type: String, trim: true, maxlength: 60  },
      projectType:            { type: String, trim: true, maxlength: 60  },
      projectStatus: {
        type: String,
        enum: ['launching','booking_open','under_development','near_completion','completed','possession_started'],
      },
      developmentProgress:    { type: Number, min: 0, max: 100 },
      launchDate:             { type: Date },
      expectedCompletionDate: { type: Date },
      possessionStartDate:    { type: Date },
      totalProjectArea:       { type: String, trim: true, maxlength: 60 },
      totalUnits:             { type: Number, min: 0 },
      unitsSold:              { type: Number, min: 0 },
      unitsAvailable:         { type: Number, min: 0 },
    },

    // ── Approvals ──────────────────────────────────────────────
    approvals: {
      authority:                  { type: String, trim: true, maxlength: 120 },
      approvalStatus:             { type: String, enum: ['approved','pending','not_required','rejected'] },
      nocStatus:                  { type: String, enum: ['approved','pending','not_required','rejected'] },
      nocNumber:                  { type: String, trim: true, maxlength: 80 },
      environmentClearance:       { type: Boolean, default: false },
      buildingPlanApproved:       { type: Boolean, default: false },
      societyRegistrationNumber:  { type: String, trim: true, maxlength: 80 },
    },

    // ── Utilities ──────────────────────────────────────────────
    utilities: {
      electricity: {
        inclusion:         { type: String, enum: ['included','not_included','on_possession','on_actual'] },
        meterType:         { type: String, trim: true, maxlength: 40 },
        connectionCharges: { type: Number, min: 0 },
        monthlyEstimate:   { type: Number, min: 0 },
      },
      gas: {
        inclusion:         { type: String, enum: ['included','not_included','on_possession','on_actual'] },
        connectionType:    { type: String, trim: true, maxlength: 40 },
        connectionCharges: { type: Number, min: 0 },
        monthlyEstimate:   { type: Number, min: 0 },
      },
      water: {
        inclusion:         { type: String, enum: ['included','not_included','on_possession','on_actual'] },
        source:            { type: String, trim: true, maxlength: 40 },
        connectionCharges: { type: Number, min: 0 },
        monthlyEstimate:   { type: Number, min: 0 },
      },
      sewerage: {
        inclusion:         { type: String, enum: ['included','not_included','on_possession','on_actual'] },
        connectionCharges: { type: Number, min: 0 },
      },
    },

    // ── Infrastructure ─────────────────────────────────────────
    infrastructure: {
      electricityStatus: { type: String, enum: ['available','applied','not_available'] },
      electricityLoad:   { type: String, trim: true, maxlength: 60 },
      gasStatus:         { type: String, trim: true, maxlength: 60 },
      waterStatus:       { type: String, trim: true, maxlength: 60 },
      sewerageStatus:    { type: String, enum: ['available','applied','not_available'] },
      internetReady:     { type: Boolean, default: false },
      cctvCoverage:      { type: Boolean, default: false },
      streetLights:      { type: Boolean, default: false },
      roadCondition:     { type: String, trim: true, maxlength: 60 },
      gatedCommunity:    { type: Boolean, default: false },
      securityLevel:     { type: String, trim: true, maxlength: 60 },
    },

    // ── Extra Charges ──────────────────────────────────────────
    extraCharges: {
      cornerCharges:           { type: Number, min: 0 },
      cornerChargesPercent:    { type: Number, min: 0, max: 100 },
      facingCharges:           { type: Number, min: 0 },
      facingChargesType:       { type: String, trim: true, maxlength: 40 },
      floorPreferenceCharges:  { type: Number, min: 0 },
      developmentCharges:      { type: Number, min: 0 },
      documentationCharges:    { type: Number, min: 0 },
      processingFee:           { type: Number, min: 0 },
      fdcCharges:              { type: Number, min: 0 },
      otherExtraCharges:       { type: Number, min: 0 },
      otherExtraChargesNote:   { type: String, trim: true, maxlength: 200 },
    },

    // ── Possession Charges ─────────────────────────────────────
    possessionCharges: {
      possessionFee:             { type: Number, min: 0 },
      electricityMeterCharges:   { type: Number, min: 0 },
      gasMeterCharges:           { type: Number, min: 0 },
      waterConnectionCharges:    { type: Number, min: 0 },
      sewerageCharges:           { type: Number, min: 0 },
      generatorShare:            { type: Number, min: 0 },
      liftShare:                 { type: Number, min: 0 },
      securityDeposit:           { type: Number, min: 0 },
      advanceMaintenance:        { type: Number, min: 0 },
      advanceMaintenanceMonths:  { type: Number, min: 0 },
      sinkingFund:               { type: Number, min: 0 },
      parkingAllotmentCharges:   { type: Number, min: 0 },
      terraceCharges:            { type: Number, min: 0 },
      gardenCharges:             { type: Number, min: 0 },
      otherPossessionCharges:    { type: Number, min: 0 },
      otherPossessionNote:       { type: String, trim: true, maxlength: 200 },
      totalPossessionCharges:    { type: Number, min: 0 },
    },

    // ── Maintenance ────────────────────────────────────────────
    maintenance: {
      isApplicable:     { type: Boolean, default: true },
      included: {
        type: String,
        enum: ['included_limited','included_lifetime','not_included','optional'],
      },
      freePeriodMonths:  { type: Number, min: 0 },
      calculationType:   { type: String, trim: true, maxlength: 60 },
      perSqft:           { type: Number, min: 0 },
      fixedAmount:       { type: Number, min: 0 },
      estimatedMonthly:  { type: Number, min: 0 },
      covers:            [{ type: String, trim: true, maxlength: 60 }],
      managedBy:         { type: String, trim: true, maxlength: 120 },
      hasSinkingFund:    { type: Boolean, default: false },
      sinkingFundPerSqft:{ type: Number, min: 0 },
    },

    // ── Government Taxes ───────────────────────────────────────
    governmentTaxes: {
      dcRate:   { type: Number, min: 0 },
      fbrValue: { type: Number, min: 0 },
      stampDuty: {
        percent: { type: Number, min: 0, max: 100 },
        amount:  { type: Number, min: 0 },
        paidBy:  { type: String, enum: ['buyer','seller','shared','negotiable'] },
      },
      cvt: {
        percent: { type: Number, min: 0, max: 100 },
        amount:  { type: Number, min: 0 },
        paidBy:  { type: String, enum: ['buyer','seller','shared','negotiable'] },
      },
      wht: {
        filerAmount:    { type: Number, min: 0 },
        nonFilerAmount: { type: Number, min: 0 },
      },
      advanceTax: {
        filerAmount:    { type: Number, min: 0 },
        nonFilerAmount: { type: Number, min: 0 },
      },
      cgt: {
        applicable:          { type: Boolean, default: false },
        holdingPeriodYears:  { type: Number, min: 0 },
        rate:                { type: Number, min: 0, max: 100 },
        amount:              { type: Number, min: 0 },
      },
    },

    // ── Transfer Charges ───────────────────────────────────────
    transferCharges: {
      societyTransferFee:         { type: Number, min: 0 },
      societyTransferPercent:     { type: Number, min: 0, max: 100 },
      membershipTransferFee:      { type: Number, min: 0 },
      nocCharges:                 { type: Number, min: 0 },
      registrationFee:            { type: Number, min: 0 },
      mutationFee:                { type: Number, min: 0 },
      agentCommission:            { type: Number, min: 0 },
      agentCommissionPercent:     { type: Number, min: 0, max: 100 },
      agentCommissionPaidBy: {
        type: String,
        enum: ['buyer','seller','shared','negotiable'],
      },
      totalBuyerChargesFiler:     { type: Number, min: 0 },
      totalBuyerChargesNonFiler:  { type: Number, min: 0 },
      totalSellerChargesFiler:    { type: Number, min: 0 },
      totalSellerChargesNonFiler: { type: Number, min: 0 },
    },

    // ── Hidden Charges Disclosure ──────────────────────────────
    hiddenChargesDisclosure: {
      hasHiddenCharges:     { type: Boolean, default: false },
      escalationClause:     { type: Boolean, default: false },
      escalationDetails:    { type: String, trim: true, maxlength: 300 },
      delayPenalty:         { type: Boolean, default: false },
      delayPenaltyDetails:  { type: String, trim: true, maxlength: 300 },
      priceRevisionClause:  { type: Boolean, default: false },
      priceRevisionDetails: { type: String, trim: true, maxlength: 300 },
      otherHiddenCharges:   { type: String, trim: true, maxlength: 300 },
      allChargesDisclosed:  { type: Boolean, default: true },
    },

    // ── Legacy computed totals ─────────────────────────────────
    totalExtraCharges:        { type: Number, min: 0 },
    totalPossessionCost:      { type: Number, min: 0 },
    grandTotalWithAllCharges: { type: Number, min: 0 },

    // ── Features ───────────────────────────────────────────────
    furnished: {
      type:    String,
      enum:    ['unfurnished','semi_furnished','fully_furnished'],
      default: 'unfurnished',
    },
    condition: {
      type:    String,
      enum:    ['brand_new','excellent','good','needs_renovation'],
      default: 'excellent',
    },
    facing:            { type: String, trim: true, maxlength: 60 },
    interiorFeatures:  [{ type: String, trim: true, maxlength: 80 }],
    exteriorFeatures:  [{ type: String, trim: true, maxlength: 80 }],
    buildingAmenities: [{ type: String, trim: true, maxlength: 80 }],
    societyAmenities:  [{ type: String, trim: true, maxlength: 80 }],
    securityFeatures:  [{ type: String, trim: true, maxlength: 80 }],
    amenities:         [{ type: String, trim: true, maxlength: 80 }],
    nearbyFacilities: [
      {
        name:     { type: String, trim: true, maxlength: 100 },
        category: { type: String, trim: true, maxlength: 40 },
        distance: { type: String, trim: true, maxlength: 30 },
      },
    ],

    // ── Legal ──────────────────────────────────────────────────
    possessionStatus: {
      type:    String,
      enum:    ['ready','under_construction','on_handover'],
      default: 'ready',
    },
    ownershipType: {
      type:    String,
      enum:    ['freehold','leasehold','power_of_attorney'],
      default: 'freehold',
    },
    legal: {
      ownershipType:           { type: String, default: 'freehold', trim: true, maxlength: 40 },
      fileType: {
        type:    String,
        enum:    ['','open_file','allocation','affidavit','registry','lease'],
        default: '',
      },
      transferType:            { type: String, default: '', trim: true, maxlength: 60 },
      documentationAvailable:  { type: [String], default: [] },
      previousOwner:           { type: String, default: '', trim: true, maxlength: 120 },
      hasDispute:              { type: Boolean, default: false },
      disputeDetails:          { type: String, default: '', trim: true, maxlength: 500 },
      societyMembershipRequired: { type: Boolean, default: false },
      membershipTransferFee:   { type: Number, min: 0, default: null },
      taxPaidUpToDate:         { type: Boolean, default: false },
    },

    documents: { type: [DocumentSchema], default: [] },

    // ── Media ──────────────────────────────────────────────────
    featureImageUrl:      { type: String, trim: true, maxlength: 2048 },
    featureImagePublicId: { type: String, trim: true, maxlength: 512  },
    gallery:              { type: [GalleryImageSchema], default: [] },
    images:               { type: [ImageSchema],       default: [] },
    primaryImageIndex:    { type: Number, default: 0, min: 0 },

    // ── Video ──────────────────────────────────────────────────
    videoUrl: {
      type:     String,
      trim:     true,
      maxlength: 2048,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          if (!isSafeHttpsUrl(v)) return false;
          return (
            v.includes('youtu.be')    ||
            v.includes('youtube.com') ||
            v.includes('vimeo.com')
          );
        },
        message: 'Video URL must be a valid HTTPS YouTube or Vimeo URL.',
      },
    },
    droneVideoUrl:        { type: String, trim: true, maxlength: 2048 },
    virtualTourUrl:       { type: String, trim: true, maxlength: 2048 },
    constructionVideoUrl: { type: String, trim: true, maxlength: 2048 },
    developerVideoUrl:    { type: String, trim: true, maxlength: 2048 },

    // ── Downloads ──────────────────────────────────────────────
    brochureUrl:         { type: String, trim: true, maxlength: 2048 },
    brochurePublicId:    { type: String, trim: true, maxlength: 512  },
    priceListUrl:        { type: String, trim: true, maxlength: 2048 },
    priceListPublicId:   { type: String, trim: true, maxlength: 512  },
    paymentPlanUrl:      { type: String, trim: true, maxlength: 2048 },
    paymentPlanPublicId: { type: String, trim: true, maxlength: 512  },

    // ── Plans ──────────────────────────────────────────────────
    floorPlans: [
      {
        floorName:    { type: String, required: true, trim: true, maxlength: 120 },
        floorNumber:  { type: Number, min: -5, max: 200 },
        imageUrl:     { type: String, trim: true, maxlength: 2048 },
        imagePublicId:{ type: String, trim: true, maxlength: 512  },
        pdfUrl:       { type: String, trim: true, maxlength: 2048 },
        pdfPublicId:  { type: String, trim: true, maxlength: 512  },
        resourceType: { type: String, enum: ['image', 'raw'] },
        mimeType:     { type: String, trim: true, maxlength: 120 },
        description:  { type: String, trim: true, maxlength: 800  },
      },
    ],
    unitPlans: [
      {
        unitType: {
          type:     String,
          enum:     ['apartment','shop','office','penthouse','studio','food_court','other'],
          required: true,
        },
        unitName:             { type: String, required: true, trim: true, maxlength: 120 },
        size:                 { type: Number, min: 0 },
        sizeUnit:             { type: String, default: 'sqft', trim: true, maxlength: 20 },
        bedrooms:             { type: Number, min: 0, max: 20 },
        bathrooms:            { type: Number, min: 0, max: 20 },
        layoutImageUrl:       { type: String, trim: true, maxlength: 2048 },
        layoutImagePublicId:  { type: String, trim: true, maxlength: 512  },
        interiorImages: [
          {
            url:     { type: String, trim: true, maxlength: 2048 },
            publicId:{ type: String, trim: true, maxlength: 512  },
            caption: { type: String, trim: true, maxlength: 140  },
          },
        ],
        pdfUrl:       { type: String, trim: true, maxlength: 2048 },
        pdfPublicId:  { type: String, trim: true, maxlength: 512  },
        features:     [{ type: String, trim: true, maxlength: 80 }],
        priceRange:   { type: String, trim: true, maxlength: 80  },
        description:  { type: String, trim: true, maxlength: 1200 },
      },
    ],

    // ── Content ────────────────────────────────────────────────
    description:           { type: String, required: true, minlength: 50, maxlength: 5000, trim: true },
    shortDescription:      { type: String, maxlength: 500,  trim: true },
    investmentHighlights:  { type: String, maxlength: 2000, trim: true },
    whyBuyThis:            { type: String, maxlength: 2000, trim: true },
    termsAndConditions:    { type: String, maxlength: 3000, trim: true },

    // ── Contact ────────────────────────────────────────────────
    whatsappNumber: { type: String, trim: true, maxlength: 30 },
    contactTime: {
      type:    String,
      enum:    ['anytime','morning','afternoon','evening'],
      default: 'anytime',
    },
    contactDetails: {
      personName:            { type: String, trim: true, maxlength: 120 },
      primaryPhone:          { type: String, trim: true, maxlength: 30  },
      secondaryPhone:        { type: String, trim: true, maxlength: 30  },
      whatsappNumber:        { type: String, trim: true, maxlength: 30  },
      email:                 { type: String, trim: true, maxlength: 254 },
      preferredMethod: {
        type: String,
        enum: ['call','whatsapp','email','any'],
      },
      contactTime:           { type: String, trim: true, maxlength: 40 },
      showPhoneOnListing:    { type: Boolean, default: true },
      allowWhatsappMessages: { type: Boolean, default: true },
    },

    // ── Rental ─────────────────────────────────────────────────
    rentalDetails: {
      monthlyRent:               { type: Number, min: 0 },
      securityDeposit:           { type: Number, min: 0 },
      advanceRentMonths:         { type: Number, min: 0 },
      minContractMonths:         { type: Number, min: 0 },
      maxContractMonths:         { type: Number, min: 0 },
      incrementPerYear:          { type: Number, min: 0 },
      maintenanceChargesMonthly: { type: Number, min: 0 },
      maintenanceIncluded:       { type: Boolean, default: false },
      utilitiesIncluded:         { type: Boolean, default: false },
      utilitiesDetails:          { type: String, trim: true, maxlength: 300 },
      parkingIncluded:           { type: Boolean, default: false },
      parkingCharges:            { type: Number, min: 0 },
      immediateAvailable:        { type: Boolean, default: false },
      shortTermAllowed:          { type: Boolean, default: false },
      petsAllowed:               { type: Boolean, default: false },
      smokingAllowed:            { type: Boolean, default: false },
      preferredTenant:           { type: String, trim: true, maxlength: 80 },
      maxOccupants:              { type: String, trim: true, maxlength: 40 },
      agreementType:             { type: String, trim: true, maxlength: 80 },
      rentNegotiable:            { type: Boolean, default: false },
      availableFrom:             { type: Date },
      advanceMonths:             { type: Number, min: 0 },
      minimumStayMonths:         { type: Number, min: 0 },
      leaseDurationMonths:       { type: Number, min: 0 },
      leaseFlexible:             { type: Boolean, default: false },
      bills: {
        allIncluded:         { type: Boolean, default: false },
        electricityIncluded: { type: Boolean, default: false },
        gasIncluded:         { type: Boolean, default: false },
        waterIncluded:       { type: Boolean, default: false },
        internetIncluded:    { type: Boolean, default: false },
      },
      tenantPreferences: {
        familyOnly:           { type: Boolean, default: false },
        bachelorsAllowed:     { type: Boolean, default: false },
        petsAllowed:          { type: Boolean, default: false },
        smokingAllowed:       { type: Boolean, default: false },
        commercialUseAllowed: { type: Boolean, default: false },
      },
    },

    // ── ✅ HIGHRISE.PK EXCLUSIVE FIELDS ────────────────────────
    verification:       {
      type:     VerificationMetadataSchema,
      required: true,
      default:  () => ({ status: 'draft' }),
    },
    ownershipProof:     {
      type:    OwnershipProofSchema,
      default: () => ({ hasProof: false }),
    },
    fraudDetection:     {
      type:    FraudDetectionSchema,
      default: () => ({}),
    },
    qualityMetrics:     {
      type:    QualityMetricsSchema,
      default: () => ({ completenessScore: 0 }),
    },
    trustScore:         {
      type:    TrustScoreSchema,
      default: () => ({ score: 0, level: 'unverified' }),
    },
    trueCost:           {
      type:    TrueCostSchema,
      default: () => ({ basePrice: 0, grandTotalBuyerFiler: 0, grandTotalBuyerNonFiler: 0, hiddenChargesDisclosed: false, calculatedAt: new Date() }),
    },
    marketIntelligence: {
      type: MarketIntelligenceSchema,
    },

    // ── Property-level audit trail ─────────────────────────────
    auditTrail: {
      type:    [PropertyAuditEntrySchema],
      default: [],
    },

    // ── Legacy status (auto-synced) ────────────────────────────
    status: {
      type:    String,
      enum:    ['pending','approved','rejected','available'],
      default: 'pending',
      index:   true,
    },
    isVerified:  { type: Boolean, default: false, index: true },
    isFeatured:  { type: Boolean, default: false, index: true },
    isDeleted:   { type: Boolean, default: false, index: true },
    deletedAt:   { type: Date,    default: null,  index: true },
    deletedBy:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isFlagged:   { type: Boolean, default: false, index: true },
    flagReason:  { type: String,  default: null,  maxlength: 500, trim: true },
    flaggedAt:   { type: Date,    default: null,  index: true },

    // ── Analytics ──────────────────────────────────────────────
    views:         { type: Number, default: 0, min: 0 },
    favoriteCount: { type: Number, default: 0, min: 0 },
    inquiryCount:  { type: Number, default: 0, min: 0 },
    compareCount:  { type: Number, default: 0, min: 0 },
    shareCount:    { type: Number, default: 0, min: 0 },

    // ── SEO ────────────────────────────────────────────────────
    metaTitle:       { type: String, maxlength: 70,   trim: true, index: true },
    metaDescription: { type: String, maxlength: 160,  trim: true },
    keywords:        [{ type: String, trim: true, maxlength: 40, index: true }],
    canonicalUrl:    { type: String, trim: true, maxlength: 2048 },

    // ── Tracking ───────────────────────────────────────────────
    developer:            { type: String, trim: true, maxlength: 120 },
    createdBy:            { type: Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy:            { type: Schema.Types.ObjectId, ref: 'User', index: true },
    lastStatusChangedAt:  { type: Date },
    lastPriceChangedAt:   { type: Date },
  },
  { timestamps: true }
);

// ═══════════════════════════════════════════════════════════════
// 🔍 INDEXES
// ═══════════════════════════════════════════════════════════════

// Verification workflow
PropertySchema.index({ 'verification.status': 1, createdAt: -1 });
PropertySchema.index({ 'verification.status': 1, 'verification.requiresManualReview': 1 });
PropertySchema.index({ 'verification.status': 1, city: 1, propertyType: 1 });

// Fraud detection
PropertySchema.index({ 'fraudDetection.duplicateHash': 1 });
PropertySchema.index({ 'fraudDetection.isPotentialDuplicate': 1 });
PropertySchema.index({ 'fraudDetection.fraudScore': -1 });

// Trust score (public feed sort)
PropertySchema.index({ 'trustScore.score': -1, 'verification.status': 1, isDeleted: 1 });
PropertySchema.index({ 'trustScore.level': 1, city: 1, listingType: 1 });

// True cost (buyer filter)
PropertySchema.index({ 'trueCost.grandTotalBuyerFiler': 1, city: 1, propertyType: 1 });

// Market intelligence
PropertySchema.index({ 'marketIntelligence.investmentScore': -1, city: 1 });

// Quality
PropertySchema.index({ 'qualityMetrics.completenessScore': -1, 'verification.status': 1 });

// Public feed (verified only)
PropertySchema.index({ 'verification.status': 1, isDeleted: 1, city: 1, listingType: 1, price: -1 });
PropertySchema.index({ 'verification.status': 1, isDeleted: 1, society: 1, price: -1 });
PropertySchema.index({ 'verification.status': 1, isDeleted: 1, propertyCategory: 1, propertyType: 1, city: 1 });

// Agent / Developer direct lookup
PropertySchema.index({ agentId: 1, 'verification.status': 1, isDeleted: 1 });
PropertySchema.index({ developerId: 1, 'verification.status': 1, isDeleted: 1 });

// Project-linked
PropertySchema.index({ projectId: 1, 'verification.status': 1, isDeleted: 1 });

// isFeatured feed
PropertySchema.index({ isFeatured: 1, 'verification.status': 1, isDeleted: 1, city: 1 });

// Geo
PropertySchema.index({ location: '2dsphere' });

// SEO + slug
PropertySchema.index({ slug: 1 });
PropertySchema.index({ metaTitle: 1 });

// Full-text search
PropertySchema.index({
  title:                            'text',
  urduTitle:                        'text',
  description:                      'text',
  society:                          'text',
  city:                             'text',
  'projectDetails.projectName':     'text',
  'projectDetails.developerName':   'text',
});

// ═══════════════════════════════════════════════════════════════
// 🔧 PRE-VALIDATE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

PropertySchema.pre<IProperty>('validate', function (this: IProperty, next) {
  // ── TypeKey derivation ──────────────────────────────────────
  if (!this.typeKey) {
    if (this.propertyCategory === 'residential' && this.residentialType) {
      this.typeKey = `residential.${this.residentialType}`;
    } else if (this.propertyCategory === 'commercial' && this.commercialType) {
      this.typeKey = `commercial.${this.commercialType}`;
    }
  }

  // ── Project consistency ─────────────────────────────────────
  if (this.propertyKind === 'project_unit' && !this.projectId) {
    this.invalidate('projectId', 'project_unit must have a projectId');
  }
  if (this.propertyKind === 'standalone') {
    this.projectId       = null;
    this.projectCategory = undefined;
  }

  // ── Featured guard ──────────────────────────────────────────
  // Cannot be featured unless verified
  if (this.isFeatured && this.verification?.status !== 'verified') {
    this.isFeatured = false;
  }

  // --- Geo sync from legacy coordinates -------------------------
  const lat = this.coordinates?.lat;
  const lng = this.coordinates?.lng;

  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    isValidLatLng(lat, lng) &&
    isValidPakistanCoordinates(lat, lng)
  ) {
    this.location = { type: 'Point', coordinates: [lng, lat] };
  } else if (
    Array.isArray(this.location?.coordinates) &&
    this.location.coordinates.length === 2 &&
    typeof this.location.coordinates[0] === 'number' &&
    typeof this.location.coordinates[1] === 'number'
  ) {
    const coords = this.location.coordinates as [number, number];
    const glng = coords[0];
    const glat = coords[1];
    if (!isValidLatLng(glat, glng) || !isValidPakistanCoordinates(glat, glng)) {
      this.location = undefined;
      this.set('location', undefined);
      if ((this as any)._doc) delete (this as any)._doc.location;
    }
  } else {
    // Force Mongoose & MongoDB driver to completely purge incomplete location object before write
    this.location = undefined;
    this.set('location', undefined);
    if ((this as any)._doc) delete (this as any)._doc.location;
  }

  // ── Image normalization ─────────────────────────────────────
  if (Array.isArray(this.images) && this.images.length > 0) {
    for (const img of this.images) {
      if (!img) continue;
      if (img.url)     img.url     = String(img.url).trim();
      if (img.public_id) img.public_id = String(img.public_id).trim();
      if (img.caption) img.caption = String(img.caption).trim().slice(0, 140);
      if (typeof img.order !== 'number') img.order = 0;
      img.order = Math.max(0, Math.min(10_000, img.order));
    }
    ensureSinglePrimary(this.images);
    this.primaryImageIndex = fixPrimaryIndex(this.images.length, this.primaryImageIndex);
  } else {
    this.primaryImageIndex = 0;
  }

  if (Array.isArray(this.gallery) && this.gallery.length > 0) {
    for (const img of this.gallery) {
      if (!img) continue;
      if (img.url)     img.url     = String(img.url).trim();
      if (img.public_id) img.public_id = String(img.public_id).trim();
      if (img.caption) img.caption = String(img.caption).trim().slice(0, 140);
      if (typeof img.order !== 'number') img.order = 0;
      img.order = Math.max(0, Math.min(10_000, img.order));
    }
  }

  // ── URL hardening ───────────────────────────────────────────
  const urlFields = [
    'featureImageUrl',
    'droneVideoUrl',
    'virtualTourUrl',
    'constructionVideoUrl',
    'developerVideoUrl',
    'brochureUrl',
    'priceListUrl',
    'paymentPlanUrl',
  ] as const;

  for (const f of urlFields) {
    const v = this[f];
    if (v && !isSafeHttpsUrl(String(v))) {
      (this as unknown as Record<string, unknown>)[f] = undefined;
    }
  }

  // ── Keywords hygiene ────────────────────────────────────────
  if (Array.isArray(this.keywords)) {
    this.keywords = normalizeArrayStrings(this.keywords, 20, 40);
  }

  next();
});

// ═══════════════════════════════════════════════════════════════
// 🔧 PRE-SAVE MIDDLEWARE (single hook — no duplicate)
// ═══════════════════════════════════════════════════════════════

PropertySchema.pre<IProperty>('save', async function (this: IProperty, next: (err?: CallbackError) => void) {
  try {
    // ── Capture previous verification status ──────────────────
    let previousVerificationStatus: string | null = null;

    if (!this.isNew && this.isModified('verification.status')) {
      try {
        const existing = await (this.constructor as mongoose.Model<IProperty>)
          .findById(this._id)
          .select('verification.status')
          .lean<{ verification?: { status?: string } }>();

        previousVerificationStatus = existing?.verification?.status ?? null;
      } catch {
        previousVerificationStatus = null;
      }
    }

    // ── Unique Property ID Auto-Generation ─────────────────────
    if (!this.propertyId) {
      const isRent = this.listingType === 'rent';
      const isPlot = this.propertyType === 'plot' || this.residentialType === 'plot';
      const prefix = isRent ? 'HR-RNT' : isPlot ? 'HR-PLT' : 'HR-PRP';
      const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      this.propertyId = `${prefix}-${suffix}`;
    }

    // ── Slug auto-generate ────────────────────────────────────
    if (!this.slug && this.title) {
      const base     = toSlugPart(this.title);
      const cityPart = this.city ? toSlugPart(this.city) : 'pk';
      this.slug      = `${base}-${cityPart}-${Date.now().toString(36)}`.slice(0, 180);
    }

    // ── Price per unit ────────────────────────────────────────
    if (this.price && this.area && !this.pricePerUnit) {
      this.pricePerUnit = Math.round(Number(this.price) / Number(this.area));
    }

    // ── Verification lifecycle state machine ──────────────────
    if (this.isModified('verification.status')) {
      const newStatus = this.verification?.status;

      if (
        typeof previousVerificationStatus === 'string' &&
        previousVerificationStatus !== newStatus
      ) {
        // Admin moderation transition validation
        if (!canTransitionPropertyVerification(
          previousVerificationStatus as VerificationStatus,
          newStatus as VerificationStatus,
        )) {
          return next(
            new Error(
              `Invalid property lifecycle transition from "${previousVerificationStatus}" to "${newStatus}".`
            ) as CallbackError
          );
        }
      }

      // Rejection must have reason
      if (newStatus === 'rejected') {
        const reason = this.verification?.rejectionReason;
        if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
          return next(
            new Error(
              'Rejection reason is required and must be at least 10 characters.'
            ) as CallbackError
          );
        }
      }

      // Flagging requires evidence
      if (newStatus === 'flagged') {
        const notes      = this.verification?.internalNotes;
        const manualFlags = this.fraudDetection?.manualFlags;
        const hasNotes    = typeof notes === 'string' && notes.trim().length >= 5;
        const hasFlags    = Array.isArray(manualFlags) && manualFlags.length > 0;

        if (!hasNotes && !hasFlags) {
          return next(
            new Error(
              'Flagging requires internal notes or at least one manual fraud flag.'
            ) as CallbackError
          );
        }
      }

      // ── Auto-sync legacy status ──────────────────────────────
      this.status     = syncLegacyStatus(newStatus as VerificationStatus);
      this.isVerified = newStatus === 'verified';

      // Sync flag fields
      if (newStatus === 'flagged') {
        this.isFlagged = true;
        this.flaggedAt = new Date();
      } else if (previousVerificationStatus === 'flagged') {
        // newStatus is already !== 'flagged' here (mutually exclusive branches)
        this.isFlagged  = false;
        this.flaggedAt  = null;
        this.flagReason = null;
      }

      this.lastStatusChangedAt = new Date();
    }

    // ── Price history ─────────────────────────────────────────
    if (this.isModified('price')) {
      this.lastPriceChangedAt = new Date();

      const prev    = typeof this.previousPrice === 'number' ? this.previousPrice : undefined;
      const current = typeof this.price === 'number' ? this.price : undefined;

      if (typeof prev === 'number' && typeof current === 'number' && prev >= 0) {
        const changeAmount  = current - prev;
        const changePercent =
          prev > 0 ? Math.abs((changeAmount / prev) * 100) : undefined;

        this.priceHistory = {
          oldPrice:      prev,
          changeAmount,
          changePercent,
          changeType:    changeAmount >= 0 ? 'increase' : 'decrease',
          changedAt:     new Date(),
        };

        this.priceDropPercent =
          changeAmount < 0 && typeof changePercent === 'number'
            ? Math.min(100, Math.max(0, changePercent))
            : 0;
      } else {
        this.priceDropPercent = 0;
      }

      this.previousPrice = typeof current === 'number' ? current : undefined;
    }

    // ── Soft-delete timestamps ────────────────────────────────
    if (this.isModified('isDeleted')) {
      if (this.isDeleted) {
        if (!this.deletedAt) this.deletedAt = new Date();
      } else {
        this.deletedAt = null;
        this.deletedBy = null;
      }
    }

    // ── SEO auto-fields ───────────────────────────────────────
    if (!this.metaTitle && this.title) {
      let mt = `${this.title} - ${this.city} | Highrise.pk`;
      if (mt.length > 70) mt = mt.substring(0, 67) + '...';
      this.metaTitle = mt;
    }

    if (!this.metaDescription && this.description) {
      const plainDesc = String(this.description).replace(/<[^>]*>/g, '');
      this.metaDescription =
        plainDesc.length > 157 ? plainDesc.substring(0, 157) + '...' : plainDesc;
    }

    if (!this.keywords || this.keywords.length === 0) {
      this.keywords = normalizeArrayStrings(
        [
          this.propertyType,
          this.city,
          this.society,
          this.propertyCategory,
          this.listingType,
          'highrise.pk',
          'pakistan property',
        ],
        20,
        40
      );
    } else {
      this.keywords = normalizeArrayStrings(this.keywords, 20, 40);
    }

    if (!this.canonicalUrl && this.slug) {
      this.canonicalUrl = `https://highrise.pk/property/${this.slug}`;
    }

    // ── Fraud detection: duplicate hash ───────────────────────
    if (
      this.isNew ||
      this.isModified('city')    ||
      this.isModified('society') ||
      this.isModified('area')    ||
      this.isModified('price')
    ) {
      const fd = this.fraudDetection ?? ({} as IFraudDetection);

      fd.duplicateHash    = generateDuplicateHash(this.city, this.society, this.area, this.price);
      fd.lastFraudCheckAt = new Date();

      try {
        const duplicates = await (this.constructor as mongoose.Model<IProperty>)
          .find({
            'fraudDetection.duplicateHash': fd.duplicateHash,
            _id: { $ne: this._id },
            isDeleted: false,
          })
          .limit(5)
          .select('_id')
          .lean<{ _id: mongoose.Types.ObjectId }[]>();

        fd.isPotentialDuplicate = duplicates.length > 0;
        fd.duplicateOf          = duplicates.map((d) => d._id);
      } catch {
        fd.isPotentialDuplicate = false;
        fd.duplicateOf          = [];
      }

      this.fraudDetection = fd;
    }

    // ── Quality metrics ───────────────────────────────────────
    const qm: IQualityMetrics = this.qualityMetrics ?? {
      completenessScore: 0,
      hasImages:         false,
      imageCount:        0,
      hasDescription:    false,
      descriptionLength: 0,
      hasCoordinates:    false,
      hasContact:        false,
      hasAmenities:      false,
      amenityCount:      0,
      hasDocuments:      false,
      documentCount:     0,
      isVerified:        false,
    };

    qm.hasImages         = Array.isArray(this.images) && this.images.length > 0;
    qm.imageCount        = this.images?.length          ?? 0;
    qm.hasDescription    = typeof this.description === 'string' && this.description.length >= 100;
    qm.descriptionLength = this.description?.length     ?? 0;
    
    // Safely check coordinates without invoking Mongoose defaults
    const coords = (this as any)._doc?.location?.coordinates ?? this.location?.coordinates;
    qm.hasCoordinates = Array.isArray(coords) && coords.length === 2;
    
    qm.hasContact        = typeof this.contactDetails?.primaryPhone === 'string' &&
                           this.contactDetails.primaryPhone.length > 0;
    qm.hasAmenities      = Array.isArray(this.amenities) && this.amenities.length > 0;
    qm.amenityCount      = this.amenities?.length        ?? 0;
    qm.hasDocuments      = Array.isArray(this.documents) && this.documents.length > 0;
    qm.documentCount     = this.documents?.length        ?? 0;
    qm.isVerified        = this.verification?.status === 'verified';
    qm.completenessScore = calculateQualityScore(this);
    qm.lastCalculatedAt  = new Date();
    this.qualityMetrics  = qm;

    // Verification score + manual review flag
    if (!this.verification) {
      this.verification = { status: 'draft' };
    }
    this.verification.verificationScore  = qm.completenessScore;
    this.verification.requiresManualReview = qm.completenessScore < 70;

    // ── ✅ Trust Score calculation ─────────────────────────────
    this.trustScore = calculateTrustScore(this);

    // ── ✅ True Cost calculation ───────────────────────────────
    this.trueCost = calculateTrueCost(this);

    // Sync legacy computed totals for backward compat
    this.grandTotalWithAllCharges = this.trueCost.grandTotalBuyerFiler;
    this.totalExtraCharges        = this.trueCost.extraChargesTotal;
    this.totalPossessionCost      = this.trueCost.possessionChargesTotal;

    // --- Final GeoJSON Purge (MUST run at the very end of pre-save AFTER metrics getters read this.location) ---
    const finalCoords = (this as any)._doc?.location?.coordinates ?? this.location?.coordinates;
    if (!Array.isArray(finalCoords) || finalCoords.length !== 2 || typeof finalCoords[0] !== 'number' || typeof finalCoords[1] !== 'number') {
      this.location = undefined;
      this.set('location', undefined);
      if ((this as any)._doc) {
        delete (this as any)._doc.location;
      }
    }

    return next();
  } catch (err: unknown) {
    return next(
      (err instanceof Error ? err : new Error(String(err))) as CallbackError
    );
  }
});

// ═══════════════════════════════════════════════════════════════
// 🎨 VIRTUALS
// ═══════════════════════════════════════════════════════════════

PropertySchema.virtual('primaryImage').get(function (this: IProperty) {
  const imgs = Array.isArray(this.images) ? this.images : [];
  if (imgs.length === 0) return this.featureImageUrl ?? null;
  const primary = imgs.find((i) => i?.isPrimary);
  return (
    primary?.url ??
    imgs[this.primaryImageIndex ?? 0]?.url ??
    imgs[0]?.url ??
    null
  );
});

PropertySchema.set('toJSON',   { virtuals: true });
PropertySchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// 📤 MODEL EXPORT
// ═══════════════════════════════════════════════════════════════

const Property =
  (mongoose.models.Property as mongoose.Model<IProperty>) ||
  mongoose.model<IProperty>('Property', PropertySchema);

export default Property;

// ═══════════════════════════════════════════════════════════════
// 🔐 HELPER EXPORTS (for API routes)
// ═══════════════════════════════════════════════════════════════

export const PropertyHelpers = {
  encryptData,
  decryptData,
  generateDuplicateHash,
  calculateQualityScore,
  calculateTrustScore,
  calculateTrueCost,
  isValidPakistanCoordinates,
  syncLegacyStatus,
};