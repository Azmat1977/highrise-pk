// types/installmentProperty.ts

// ============================================
// INSTALLMENT PROPERTY FORM - TYPE DEFINITIONS
// ============================================

// Property Categories
export type PropertyCategory = 'residential' | 'commercial';

// Listing Purpose for Installment
export type ListingPurpose = 'new_booking' | 'resale' | 'transfer';

// Property Condition
export type PropertyCondition =
  | 'new_launch'
  | 'under_construction'
  | 'near_completion'
  | 'completed'
  | 'ready_possession';

// Plot Status
export type PlotStatus = 'file' | 'on_ground';

// Development Status
export type DevelopmentStatus =
  | 'undeveloped'
  | 'under_development'
  | 'semi_developed'
  | 'fully_developed';

// Booking Status
export type BookingStatus = 'open' | 'closing_soon' | 'closed';

// Ballot Status
export type BallotStatus = 'pending' | 'done' | 'not_applicable';

// Possession Due On
export type PossessionDueOn =
  | 'on_50_percent'
  | 'on_80_percent'
  | 'on_completion'
  | 'after_full_payment'
  | 'after_ballot';

// Parking Included
export type ParkingIncluded = 'included' | 'separate' | 'optional';

// Project Status
export type ProjectStatus =
  | 'launching'
  | 'booking_open'
  | 'under_development'
  | 'near_completion'
  | 'completed'
  | 'possession_started';

// Approval Status
export type ApprovalStatus = 'approved' | 'pending' | 'not_required' | 'rejected';

// Utility Inclusion
export type UtilityInclusion =
  | 'included'
  | 'not_included'
  | 'on_possession'
  | 'on_actual';

// Maintenance Included
export type MaintenanceIncluded =
  | 'included_limited'
  | 'included_lifetime'
  | 'not_included'
  | 'optional';

// Tax Paid By
export type TaxPaidBy = 'buyer' | 'seller' | 'shared' | 'negotiable';

// File Type
export type FileType = 'open_file' | 'allocation' | 'affidavit' | 'registry' | 'lease';

// ============================================
// FORM DATA INTERFACE
// ============================================

export interface InstallmentFormData {
  // ============================================
  // SECTION 1: BASIC INFORMATION
  // ============================================
  propertyCategory: PropertyCategory;
  propertyType: string;
  propertySubtype: string;
  listingPurpose: ListingPurpose;
  title: string;
  propertyCondition: PropertyCondition;

  // ============================================
  // SECTION 2: LOCATION DETAILS
  // ============================================
  province: string;
  city: string;
  locality: string;
  society: string;
  customSociety: string;
  phase: string;
  block: string;
  streetNumber: string;
  plotNumber: string;
  completeAddress: string;
  nearbyLandmark: string;

  // ============================================
  // SECTION 3: SIZE & MEASUREMENTS
  // ============================================
  area: string;
  areaUnit: string;
  coveredArea: string;
  coveredAreaUnit: string;
  plotWidth: string;
  plotDepth: string;
  grossArea: string;
  netArea: string;
  floorNumber: string;
  totalFloors: string;
  balconyArea: string;

  // ============================================
  // SECTION 4: PROPERTY DETAILS (Dynamic)
  // ============================================
  // House/Villa
  bedrooms: string;
  bathrooms: string;
  drawingRoom: boolean;
  diningRoom: boolean;
  livingRoom: boolean;
  kitchens: string;
  storeRooms: string;
  servantQuarter: boolean;
  servantQuarterRooms: string;
  floors: string;
  basement: boolean;
  basementArea: string;
  rooftopAccess: boolean;
  lawnGarden: string;
  garage: string;
  porch: boolean;

  // Apartment/Penthouse
  apartmentType: string;
  view: string;
  balconies: string;
  isCornerUnit: boolean;

  // Plot
  plotCategory: string;
  isCornerPlot: boolean;
  facingDirection: string;
  specialFacing: string[];
  plotStatus: PlotStatus;
  developmentStatus: DevelopmentStatus;
  openSides: string;
  hasBoundaryWall: boolean;

  // Shop/Commercial
  floorLocation: string;
  shopPosition: string;
  shopFrontWidth: string;
  shopDepth: string;
  shopHeight: string;
  hasMezzanine: boolean;
  mezzanineArea: string;
  hasBasement: boolean;
  commercialBasementArea: string;
  washroom: string;
  hasSignage: boolean;
  shutterType: string;
  hasDisplayWindow: boolean;
  suitableFor: string[];
  electricityLoad: string;
  ceilingHeight: string;

  // ============================================
  // SECTION 5: PRICING & PAYMENT PLAN
  // ============================================
  // Total Price
  totalPrice: string;
  pricePerUnit: string;
  isNegotiable: boolean;

  // Booking
  bookingAmount: string;
  bookingPercent: string;
  bookingStatus: BookingStatus;

  // Down Payment
  downPaymentAmount: string;
  downPaymentPercent: string;
  downPaymentDueWithin: string;
  downPaymentInInstallments: boolean;
  numberOfDPInstallments: string;

  // Installments
  hasMonthlyInstallments: boolean;
  monthlyAmount: string;
  monthlyCount: string;
  hasQuarterlyInstallments: boolean;
  quarterlyAmount: string;
  quarterlyCount: string;
  hasHalfYearlyInstallments: boolean;
  halfYearlyAmount: string;
  halfYearlyCount: string;
  hasYearlyInstallments: boolean;
  yearlyAmount: string;
  yearlyCount: string;
  installmentStartDate: string;
  planDuration: string;
  planDurationUnit: string;

  // Legacy nested installment objects used in some UI parts
  // (kept for backward compatibility / TypeScript only)
  installmentPlan?: {
    hasMonthly?: boolean;
    monthlyAmount?: string;
    monthlyCount?: string;
    hasQuarterly?: boolean;
    quarterlyAmount?: string;
    quarterlyCount?: string;
    hasHalfYearly?: boolean;
    halfYearlyAmount?: string;
    halfYearlyCount?: string;
    hasYearly?: boolean;
    yearlyAmount?: string;
    yearlyCount?: string;
  };

  installmentPlan2?: {
    hasMonthly?: boolean;
    monthlyAmount?: string;
    monthlyCount?: string;
    hasQuarterly?: boolean;
    quarterlyAmount?: string;
    quarterlyCount?: string;
    hasHalfYearly?: boolean;
    halfYearlyAmount?: string;
    halfYearlyCount?: string;
    hasYearly?: boolean;
    yearlyAmount?: string;
    yearlyCount?: string;
  };

  // Resale Info
  isResale: boolean;
  installmentsPaid: string;
  installmentsRemaining: string;
  amountPaid: string;
  amountRemaining: string;
  ownPrice: string;
  profit: string;

  // Possession
  possessionAmount: string;
  possessionPercent: string;
  possessionDueOn: string;
  expectedPossessionDate: string;
  possessionStatus: string;

  // Ballot/Allotment
  ballotStatus: BallotStatus;
  expectedBallotDate: string;
  isPlotAllocated: boolean;
  hasAllocationLetter: boolean;

  // Other Payment Charges
  confirmationCharges: string;
  developmentChargesPayment: string;
  latePaymentSurcharge: string;
  earlyPaymentDiscount: string;

  // ============================================
  // SECTION 6: PARKING DETAILS
  // ============================================
  parkingAvailable: boolean;
  parkingType: string;
  parkingSpaces: string;
  parkingIncluded: ParkingIncluded;
  parkingSize: string;
  parkingPricePerSqft: string;
  parkingTotalPrice: string;
  hasEVCharging: boolean;

  // ============================================
  // SECTION 7: PROJECT & DEVELOPER DETAILS
  // (fields kept for type compatibility, UI no longer uses this section)
  // ============================================
  projectName: string;
  developerName: string;
  developerContact: string;
  developerEmail: string;
  projectType: string;
  projectStatus: ProjectStatus;
  developmentProgress: string;
  launchDate: string;
  expectedCompletionDate: string;
  possessionStartDate: string;
  totalProjectArea: string;
  projectAreaUnit: string;
  totalUnits: string;
  unitsSold: string;
  unitsAvailable: string;

  // Approvals
  approvalAuthority: string;
  isApproved: ApprovalStatus;
  nocStatus: ApprovalStatus;
  nocNumber: string;
  environmentClearance: boolean;
  buildingPlanApproved: boolean;
  societyRegistrationNumber: string;

  // ============================================
  // SECTION 8: UTILITIES & INFRASTRUCTURE
  // ============================================
  electricityStatus: string;
  electricityLoadInfra: string;
  gasStatus: string;
  waterStatus: string;
  sewerageStatus: string;
  internetReady: boolean;
  cctvCoverage: boolean;
  streetLights: boolean;
  roadCondition: string;
  gatedCommunity: boolean;
  securityLevel: string;

  // ============================================
  // SECTION 9: FEATURES & AMENITIES
  // ============================================
  // Interior Features
  flooring: string;
  ceiling: string;
  kitchenType: string;
  wardrobes: string;
  airConditioning: string;
  centralHeating: boolean;
  intercom: boolean;
  smartHome: boolean;
  doubleGlazedWindows: boolean;

  // Exterior Features
  facingMaterial: string;
  boundaryWall: boolean;
  mainGate: string;
  garden: boolean;
  swimmingPool: boolean;
  privatePool: boolean;
  terrace: boolean;

  // Building Amenities
  elevator: boolean;
  numberOfLifts: string;
  generator: boolean;
  fireSafety: boolean;
  reception: boolean;
  gym: boolean;
  buildingPool: boolean;
  communityHall: boolean;
  kidsPlayArea: boolean;
  rooftopAccessBuilding: boolean;
  bbqArea: boolean;
  prayerRoom: boolean;
  laundryService: boolean;

  // Society Amenities
  mosque: boolean;
  school: boolean;
  hospital: boolean;
  shoppingMall: boolean;
  parks: boolean;
  sportsFacilities: boolean;
  joggingTrack: boolean;
  communityCenter: boolean;
  banks: boolean;
  restaurants: boolean;
  cinema: boolean;
  themePark: boolean;
  lake: boolean;
  golfCourse: boolean;

  // Security Features
  boundaryWallSecurity: boolean;
  gatedEntry: boolean;
  securityGuards24x7: boolean;
  cctvCameras: boolean;
  intercomSystem: boolean;
  smartLock: boolean;
  panicButton: boolean;

  // Legacy amenities array
  amenities: string[];

  // ============================================
  // SECTION 10: LEGAL & OWNERSHIP
  // ============================================
  ownershipType: string;
  fileType: FileType;
  transferType: string;
  documentsAvailable: string[];
  previousOwner: string;
  hasDispute: boolean;
  disputeDetails: string;
  societyMembershipRequired: boolean;
  membershipTransferFee: string;
  taxPaidUpToDate: boolean;

  // ============================================
  // SECTION 11: TAXES & EXTRA CHARGES
  // ============================================
  // Government Taxes
  dcRate: string;
  fbrValue: string;
  stampDutyPercent: string;
  stampDutyAmount: string;
  stampDutyPaidBy: TaxPaidBy;
  cvtPercent: string;
  cvtAmount: string;
  cvtPaidBy: TaxPaidBy;
  whtFiler: string;
  whtNonFiler: string;
  advanceTaxFiler: string;
  advanceTaxNonFiler: string;
  cgtApplicable: boolean;
  cgtHoldingPeriod: string;
  cgtRate: string;
  cgtAmount: string;

  // Society/Transfer Charges
  societyTransferFee: string;
  societyTransferPercent: string;
  membershipTransferFeeCharges: string;
  nocCharges: string;
  registrationFee: string;
  mutationFee: string;

  // Extra Charges
  cornerCharges: string;
  cornerChargesPercent: string;
  facingCharges: string;
  facingChargesType: string;
  floorPreferenceCharges: string;
  developmentCharges: string;
  documentationCharges: string;
  processingFee: string;
  fdcCharges: string;
  otherExtraCharges: string;
  otherExtraChargesNote: string;

  // Possession Charges
  possessionFee: string;
  electricityMeterCharges: string;
  gasMeterCharges: string;
  waterConnectionCharges: string;
  sewerageCharges: string;
  generatorShare: string;
  liftShare: string;
  securityDeposit: string;
  advanceMaintenance: string;
  advanceMaintenanceMonths: string;
  sinkingFund: string;
  parkingAllotmentCharges: string;
  terraceCharges: string;
  gardenCharges: string;
  otherPossessionCharges: string;
  otherPossessionNote: string;

  // Maintenance
  maintenanceApplicable: boolean;
  maintenanceIncluded: MaintenanceIncluded;
  freeMaintenancePeriod: string;
  maintenanceCalculation: string;
  maintenancePerSqft: string;
  fixedMaintenanceAmount: string;
  estimatedMonthlyMaintenance: string;
  maintenanceCovers: string[];
  maintenanceManagedBy: string;
  hasSinkingFund: boolean;
  sinkingFundPerSqft: string;

  // Hidden Charges Disclosure
  hasHiddenCharges: boolean;
  escalationClause: boolean;
  escalationDetails: string;
  delayPenalty: boolean;
  delayPenaltyDetails: string;
  priceRevisionClause: boolean;
  priceRevisionDetails: string;
  otherHiddenCharges: string;
  allChargesDisclosed: boolean;

  // ============================================
  // SECTION 12: DOCUMENTS UPLOAD
  // ============================================
  paymentPlanDoc: File | null;
  floorPlanDocs: File[];
  siteMapDoc: File | null;
  allocationLetterDoc: File | null;
  paymentReceiptsDocs: File[];
  nocDoc: File | null;
  agreementDoc: File | null;
  brochureDoc: File | null;
  rendersDocs: File[];
  otherDocs: File[];

  // ============================================
  // SECTION 13: MEDIA (Images/Videos)
  // ============================================
  images: File[];
  primaryImageIndex: number;
  imageCaptions: string[];
  videoUrl: string;
  droneVideoUrl: string;
  virtualTourUrl: string;
  constructionVideoUrl: string;
  developerVideoUrl: string;

  // ============================================
  // SECTION 14: DESCRIPTION
  // ============================================
  description: string;
  shortDescription: string;
  investmentHighlights: string;
  whyBuyThis: string;
  termsAndConditions: string;

  // ============================================
  // SECTION 15: CONTACT PREFERENCES
  // ============================================
  contactPerson: string;
  primaryPhone: string;
  secondaryPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  preferredContactMethod: string;
  bestTimeToCall: string;
  showPhoneOnListing: boolean;
  allowWhatsAppMessages: boolean;

  // ============================================
  // TERMS & CONDITIONS
  // ============================================
  termsAccepted: boolean;
  privacyAccepted: boolean;
  accuracyConfirmed: boolean;
  authorizationConfirmed: boolean;
}

// ============================================
// FORM ERRORS INTERFACE
// ============================================

export interface InstallmentFormErrors {
  // Basic
  propertyCategory?: string;
  propertyType?: string;
  listingPurpose?: string;
  title?: string;
  propertyCondition?: string;

  // Location
  province?: string;
  city?: string;
  society?: string;
  customSociety?: string;

  // Size
  area?: string;
  areaUnit?: string;

  // Property Details
  bedrooms?: string;
  bathrooms?: string;
  floorLocation?: string;
  shopFrontWidth?: string;
  shopDepth?: string;

  // Payment Plan
  totalPrice?: string;
  bookingAmount?: string;
  bookingStatus?: string;
  downPaymentAmount?: string;
  possessionAmount?: string;
  possessionDueOn?: string;
  paymentPlanTotal?: string;

  // Project
  projectName?: string;
  developerName?: string;
  projectStatus?: string;

  // Legal
  ownershipType?: string;
  fileType?: string;

  // Media
  images?: string;
  description?: string;

  // Contact
  primaryPhone?: string;
  contactEmail?: string;

  // Terms
  termsAccepted?: string;
  privacyAccepted?: string;
  accuracyConfirmed?: string;
  authorizationConfirmed?: string;

  // General
  general?: string;
}

// ============================================
// INITIAL FORM DATA
// ============================================

export const initialInstallmentFormData: InstallmentFormData = {
  // Section 1: Basic Information
  propertyCategory: 'residential',
  propertyType: 'Plot',
  propertySubtype: '',
  listingPurpose: 'new_booking',
  title: '',
  propertyCondition: 'under_construction',

  // Section 2: Location
  province: 'Punjab',
  city: '',
  locality: '',
  society: '',
  customSociety: '',
  phase: '',
  block: '',
  streetNumber: '',
  plotNumber: '',
  completeAddress: '',
  nearbyLandmark: '',

  // Section 3: Size
  area: '',
  areaUnit: 'Marla',
  coveredArea: '',
  coveredAreaUnit: 'Sq. Ft.',
  plotWidth: '',
  plotDepth: '',
  grossArea: '',
  netArea: '',
  floorNumber: '',
  totalFloors: '',
  balconyArea: '',

  // Section 4: Property Details - House/Villa
  bedrooms: '',
  bathrooms: '',
  drawingRoom: false,
  diningRoom: false,
  livingRoom: false,
  kitchens: '1',
  storeRooms: '0',
  servantQuarter: false,
  servantQuarterRooms: '0',
  floors: '1',
  basement: false,
  basementArea: '',
  rooftopAccess: false,
  lawnGarden: 'none',
  garage: '0',
  porch: false,

  // Apartment/Penthouse
  apartmentType: '',
  view: '',
  balconies: '0',
  isCornerUnit: false,

  // Plot
  plotCategory: 'residential',
  isCornerPlot: false,
  facingDirection: '',
  specialFacing: [],
  plotStatus: 'file',
  developmentStatus: 'under_development',
  openSides: '1',
  hasBoundaryWall: false,

  // Shop/Commercial
  floorLocation: 'ground',
  shopPosition: '',
  shopFrontWidth: '',
  shopDepth: '',
  shopHeight: '',
  hasMezzanine: false,
  mezzanineArea: '',
  hasBasement: false,
  commercialBasementArea: '',
  washroom: 'none',
  hasSignage: true,
  shutterType: '',
  hasDisplayWindow: false,
  suitableFor: [],
  electricityLoad: 'single_phase',
  ceilingHeight: 'standard',

  // Section 5: Payment Plan
  totalPrice: '',
  pricePerUnit: '',
  isNegotiable: false,

  bookingAmount: '',
  bookingPercent: '',
  bookingStatus: 'open',

  downPaymentAmount: '',
  downPaymentPercent: '',
  downPaymentDueWithin: '30_days',
  downPaymentInInstallments: false,
  numberOfDPInstallments: '',

  hasMonthlyInstallments: true,
  monthlyAmount: '',
  monthlyCount: '',
  hasQuarterlyInstallments: false,
  quarterlyAmount: '',
  quarterlyCount: '',
  hasHalfYearlyInstallments: false,
  halfYearlyAmount: '',
  halfYearlyCount: '',
  hasYearlyInstallments: false,
  yearlyAmount: '',
  yearlyCount: '',
  installmentStartDate: '',
  planDuration: '',
  planDurationUnit: 'years',

  isResale: false,
  installmentsPaid: '',
  installmentsRemaining: '',
  amountPaid: '',
  amountRemaining: '',
  ownPrice: '',
  profit: '',

  possessionAmount: '',
  possessionPercent: '',
  possessionDueOn: 'on_completion',
  expectedPossessionDate: '',
  possessionStatus: 'not_yet',

  ballotStatus: 'not_applicable',
  expectedBallotDate: '',
  isPlotAllocated: false,
  hasAllocationLetter: false,

  confirmationCharges: '',
  developmentChargesPayment: '',
  latePaymentSurcharge: '',
  earlyPaymentDiscount: '',

  // Section 6: Parking
  parkingAvailable: false,
  parkingType: '',
  parkingSpaces: '0',
  parkingIncluded: 'included',
  parkingSize: '',
  parkingPricePerSqft: '',
  parkingTotalPrice: '',
  hasEVCharging: false,

  // Section 7: Project Details (kept for compatibility, not shown in UI)
  projectName: '',
  developerName: '',
  developerContact: '',
  developerEmail: '',
  projectType: '',
  projectStatus: 'booking_open',
  developmentProgress: '0',
  launchDate: '',
  expectedCompletionDate: '',
  possessionStartDate: '',
  totalProjectArea: '',
  projectAreaUnit: 'Acres',
  totalUnits: '',
  unitsSold: '',
  unitsAvailable: '',

  approvalAuthority: '',
  isApproved: 'pending',
  nocStatus: 'pending',
  nocNumber: '',
  environmentClearance: false,
  buildingPlanApproved: false,
  societyRegistrationNumber: '',

  // Section 8: Infrastructure
  electricityStatus: 'available',
  electricityLoadInfra: 'single_phase',
  gasStatus: 'available',
  waterStatus: 'available',
  sewerageStatus: 'available',
  internetReady: false,
  cctvCoverage: false,
  streetLights: false,
  roadCondition: 'carpeted',
  gatedCommunity: false,
  securityLevel: 'basic',

  // Section 9: Features
  flooring: '',
  ceiling: '',
  kitchenType: '',
  wardrobes: '',
  airConditioning: '',
  centralHeating: false,
  intercom: false,
  smartHome: false,
  doubleGlazedWindows: false,

  facingMaterial: '',
  boundaryWall: false,
  mainGate: '',
  garden: false,
  swimmingPool: false,
  privatePool: false,
  terrace: false,

  elevator: false,
  numberOfLifts: '0',
  generator: false,
  fireSafety: false,
  reception: false,
  gym: false,
  buildingPool: false,
  communityHall: false,
  kidsPlayArea: false,
  rooftopAccessBuilding: false,
  bbqArea: false,
  prayerRoom: false,
  laundryService: false,

  mosque: false,
  school: false,
  hospital: false,
  shoppingMall: false,
  parks: false,
  sportsFacilities: false,
  joggingTrack: false,
  communityCenter: false,
  banks: false,
  restaurants: false,
  cinema: false,
  themePark: false,
  lake: false,
  golfCourse: false,

  boundaryWallSecurity: false,
  gatedEntry: false,
  securityGuards24x7: false,
  cctvCameras: false,
  intercomSystem: false,
  smartLock: false,
  panicButton: false,

  amenities: [],

  // Section 10: Legal
  ownershipType: 'freehold',
  fileType: 'open_file',
  transferType: '',
  documentsAvailable: [],
  previousOwner: '',
  hasDispute: false,
  disputeDetails: '',
  societyMembershipRequired: false,
  membershipTransferFee: '',
  taxPaidUpToDate: true,

  // Section 11: Taxes & Charges
  dcRate: '',
  fbrValue: '',
  stampDutyPercent: '1',
  stampDutyAmount: '',
  stampDutyPaidBy: 'buyer',
  cvtPercent: '2',
  cvtAmount: '',
  cvtPaidBy: 'buyer',
  whtFiler: '',
  whtNonFiler: '',
  advanceTaxFiler: '',
  advanceTaxNonFiler: '',
  cgtApplicable: false,
  cgtHoldingPeriod: '',
  cgtRate: '',
  cgtAmount: '',

  societyTransferFee: '',
  societyTransferPercent: '',
  membershipTransferFeeCharges: '',
  nocCharges: '',
  registrationFee: '',
  mutationFee: '',

  cornerCharges: '',
  cornerChargesPercent: '',
  facingCharges: '',
  facingChargesType: '',
  floorPreferenceCharges: '',
  developmentCharges: '',
  documentationCharges: '',
  processingFee: '',
  fdcCharges: '',
  otherExtraCharges: '',
  otherExtraChargesNote: '',

  possessionFee: '',
  electricityMeterCharges: '',
  gasMeterCharges: '',
  waterConnectionCharges: '',
  sewerageCharges: '',
  generatorShare: '',
  liftShare: '',
  securityDeposit: '',
  advanceMaintenance: '',
  advanceMaintenanceMonths: '3',
  sinkingFund: '',
  parkingAllotmentCharges: '',
  terraceCharges: '',
  gardenCharges: '',
  otherPossessionCharges: '',
  otherPossessionNote: '',

  maintenanceApplicable: true,
  maintenanceIncluded: 'not_included',
  freeMaintenancePeriod: '',
  maintenanceCalculation: 'per_sqft',
  maintenancePerSqft: '',
  fixedMaintenanceAmount: '',
  estimatedMonthlyMaintenance: '',
  maintenanceCovers: [],
  maintenanceManagedBy: '',
  hasSinkingFund: false,
  sinkingFundPerSqft: '',

  hasHiddenCharges: false,
  escalationClause: false,
  escalationDetails: '',
  delayPenalty: false,
  delayPenaltyDetails: '',
  priceRevisionClause: false,
  priceRevisionDetails: '',
  otherHiddenCharges: '',
  allChargesDisclosed: true,

  // Section 12: Documents
  paymentPlanDoc: null,
  floorPlanDocs: [],
  siteMapDoc: null,
  allocationLetterDoc: null,
  paymentReceiptsDocs: [],
  nocDoc: null,
  agreementDoc: null,
  brochureDoc: null,
  rendersDocs: [],
  otherDocs: [],

  // Section 13: Media
  images: [],
  primaryImageIndex: 0,
  imageCaptions: [],
  videoUrl: '',
  droneVideoUrl: '',
  virtualTourUrl: '',
  constructionVideoUrl: '',
  developerVideoUrl: '',

  // Section 14: Description
  description: '',
  shortDescription: '',
  investmentHighlights: '',
  whyBuyThis: '',
  termsAndConditions: '',

  // Section 15: Contact
  contactPerson: '',
  primaryPhone: '',
  secondaryPhone: '',
  whatsappNumber: '',
  contactEmail: '',
  preferredContactMethod: 'whatsapp',
  bestTimeToCall: 'anytime',
  showPhoneOnListing: true,
  allowWhatsAppMessages: true,

  // Terms
  termsAccepted: false,
  privacyAccepted: false,
  accuracyConfirmed: false,
  authorizationConfirmed: false,
};

// ============================================
// DROPDOWN OPTIONS
// ============================================

export const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Azad Kashmir',
  'Gilgit-Baltistan',
] as const;

export const PROPERTY_TYPES_INSTALLMENT = {
  residential: [
    { value: 'Plot', label: 'Plot', icon: '📍' },
    { value: 'House', label: 'House', icon: '🏠' },
    { value: 'Villa', label: 'Villa', icon: '🏡' },
    { value: 'Apartment', label: 'Apartment', icon: '🏢' },
    { value: 'Penthouse', label: 'Penthouse', icon: '🌆' },
    { value: 'Farmhouse', label: 'Farmhouse', icon: '🌾' },
  ],
  commercial: [
    { value: 'Plot', label: 'Plot', icon: '📍' },
    { value: 'Shop', label: 'Shop', icon: '🏪' },
    { value: 'Office', label: 'Office', icon: '🏛️' },
    { value: 'Food Court', label: 'Food Court', icon: '🍽️' },
    { value: 'Warehouse', label: 'Warehouse', icon: '📦' },
    { value: 'Hall', label: 'Hall/Showroom', icon: '🏬' },
  ],
} as const;

export const LISTING_PURPOSE_OPTIONS = [
  {
    value: 'new_booking',
    label: 'New Booking',
    description: 'Fresh booking from developer',
  },
  { value: 'resale', label: 'Resale', description: 'Selling my existing booking' },
  { value: 'transfer', label: 'Transfer', description: 'Transfer of ownership' },
] as const;

export const PROPERTY_CONDITION_OPTIONS = [
  { value: 'new_launch', label: 'New Launch' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'near_completion', label: 'Near Completion' },
  { value: 'completed', label: 'Completed' },
  { value: 'ready_possession', label: 'Ready for Possession' },
] as const;

export const PLOT_CATEGORY_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'agricultural', label: 'Agricultural' },
] as const;

export const PLOT_STATUS_OPTIONS = [
  { value: 'file', label: 'File Only' },
  { value: 'on_ground', label: 'On Ground (Developed)' },
] as const;

export const DEVELOPMENT_STATUS_OPTIONS = [
  { value: 'undeveloped', label: 'Undeveloped' },
  { value: 'under_development', label: 'Under Development' },
  { value: 'semi_developed', label: 'Semi-Developed' },
  { value: 'fully_developed', label: 'Fully Developed' },
] as const;

export const FACING_DIRECTION_OPTIONS = [
  { value: 'north', label: 'North' },
  { value: 'south', label: 'South' },
  { value: 'east', label: 'East' },
  { value: 'west', label: 'West' },
  { value: 'north_east', label: 'North-East' },
  { value: 'north_west', label: 'North-West' },
  { value: 'south_east', label: 'South-East' },
  { value: 'south_west', label: 'South-West' },
] as const;

export const SPECIAL_FACING_OPTIONS = [
  { id: 'park', label: 'Park Facing' },
  { id: 'main_road', label: 'Main Road' },
  { id: 'boulevard', label: 'Boulevard' },
  { id: 'mosque', label: 'Mosque Facing' },
  { id: 'lake', label: 'Lake/Water' },
  { id: 'green_belt', label: 'Green Belt' },
  { id: 'corner', label: 'Corner' },
] as const;

export const BOOKING_STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'green' },
  { value: 'closing_soon', label: 'Closing Soon', color: 'orange' },
  { value: 'closed', label: 'Closed', color: 'red' },
] as const;

export const DOWN_PAYMENT_DUE_OPTIONS = [
  { value: '30_days', label: '30 Days' },
  { value: '60_days', label: '60 Days' },
  { value: '90_days', label: '90 Days' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
  { value: 'flexible', label: 'Flexible' },
] as const;

export const POSSESSION_DUE_OPTIONS = [
  { value: 'on_50_percent', label: 'On 50% Payment' },
  { value: 'on_80_percent', label: 'On 80% Payment' },
  { value: 'on_completion', label: 'On Project Completion' },
  { value: 'after_full_payment', label: 'After Full Payment' },
  { value: 'after_ballot', label: 'After Ballot' },
] as const;

export const POSSESSION_STATUS_OPTIONS_INST = [
  { value: 'not_yet', label: 'Not Yet' },
  { value: 'ready', label: 'Ready' },
  { value: 'given', label: 'Already Given' },
] as const;

export const BALLOT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'done', label: 'Done' },
  { value: 'not_applicable', label: 'Not Applicable' },
] as const;

export const PARKING_TYPE_OPTIONS = [
  { value: 'open', label: 'Open Parking' },
  { value: 'covered', label: 'Covered Parking' },
  { value: 'basement', label: 'Basement Parking' },
  { value: 'multi_story', label: 'Multi-Story Parking' },
] as const;

export const PARKING_INCLUDED_OPTIONS = [
  { value: 'included', label: 'Included in Price' },
  { value: 'separate', label: 'Separate (Extra Cost)' },
  { value: 'optional', label: 'Optional Add-on' },
] as const;

export const PROJECT_TYPE_OPTIONS = [
  { value: 'housing_society', label: 'Housing Society' },
  { value: 'high_rise', label: 'High-Rise Building' },
  { value: 'commercial_plaza', label: 'Commercial Plaza' },
  { value: 'mall', label: 'Shopping Mall' },
  { value: 'mixed_use', label: 'Mixed-Use Development' },
  { value: 'gated_community', label: 'Gated Community' },
] as const;

export const PROJECT_STATUS_OPTIONS = [
  { value: 'launching', label: 'Launching Soon' },
  { value: 'booking_open', label: 'Booking Open' },
  { value: 'under_development', label: 'Under Development' },
  { value: 'near_completion', label: 'Near Completion' },
  { value: 'completed', label: 'Completed' },
  { value: 'possession_started', label: 'Possession Started' },
] as const;

export const APPROVAL_AUTHORITY_OPTIONS = [
  { value: 'lda', label: 'LDA (Lahore)' },
  { value: 'rda', label: 'RDA (Rawalpindi)' },
  { value: 'cda', label: 'CDA (Islamabad)' },
  { value: 'kda', label: 'KDA (Karachi)' },
  { value: 'gda', label: 'GDA (Gujranwala)' },
  { value: 'fda', label: 'FDA (Faisalabad)' },
  { value: 'mda', label: 'MDA (Multan)' },
  { value: 'tma', label: 'TMA' },
  { value: 'phata', label: 'PHATA' },
  { value: 'dha', label: 'DHA' },
  { value: 'bahria', label: 'Bahria Town' },
  { value: 'other', label: 'Other' },
] as const;

export const APPROVAL_STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'not_required', label: 'Not Required', color: 'gray' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
] as const;

export const UTILITY_STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'applied', label: 'Applied For' },
  { value: 'not_available', label: 'Not Available' },
] as const;

export const ROAD_CONDITION_OPTIONS = [
  { value: 'carpeted', label: 'Carpeted/Paved' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'planned', label: 'Planned' },
  { value: 'unpaved', label: 'Unpaved/Katcha' },
] as const;

export const SECURITY_LEVEL_OPTIONS = [
  { value: '24x7_guards', label: '24/7 Security Guards' },
  { value: 'cameras_only', label: 'CCTV Cameras Only' },
  { value: 'basic', label: 'Basic Security' },
  { value: 'none', label: 'No Security' },
] as const;

export const FILE_TYPE_OPTIONS = [
  { value: 'open_file', label: 'Open File' },
  { value: 'allocation', label: 'Allocation Letter' },
  { value: 'affidavit', label: 'Affidavit' },
  { value: 'registry', label: 'Registry' },
  { value: 'lease', label: 'Lease' },
] as const;

export const TRANSFER_TYPE_OPTIONS = [
  { value: 'society_transfer', label: 'Society Transfer' },
  { value: 'registry_transfer', label: 'Registry Transfer' },
  { value: 'power_of_attorney', label: 'Power of Attorney' },
  { value: 'sub_lease', label: 'Sub-Lease' },
] as const;

export const DOCUMENTS_AVAILABLE_OPTIONS = [
  { id: 'allocation_letter', label: 'Allocation Letter' },
  { id: 'payment_receipts', label: 'Payment Receipts' },
  { id: 'payment_plan', label: 'Payment Plan' },
  { id: 'agreement', label: 'Sale Agreement' },
  { id: 'site_map', label: 'Site Map' },
  { id: 'noc', label: 'NOC' },
  { id: 'approval_letter', label: 'Approval Letter' },
  { id: 'possession_letter', label: 'Possession Letter' },
  { id: 'floor_plan', label: 'Floor Plan' },
  { id: 'other', label: 'Other Documents' },
] as const;

export const MAINTENANCE_CALCULATION_OPTIONS = [
  { value: 'per_sqft', label: 'Per Square Foot' },
  { value: 'fixed', label: 'Fixed Monthly' },
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'per_marla', label: 'Per Marla' },
] as const;

export const MAINTENANCE_COVERS_OPTIONS = [
  { id: 'security', label: 'Security Guards' },
  { id: 'cctv', label: 'CCTV Monitoring' },
  { id: 'cleaning', label: 'Common Area Cleaning' },
  { id: 'lift', label: 'Lift/Elevator' },
  { id: 'generator', label: 'Generator/Power Backup' },
  { id: 'water_pump', label: 'Water Pump/Tank' },
  { id: 'garbage', label: 'Garbage Collection' },
  { id: 'landscaping', label: 'Landscaping' },
  { id: 'pest_control', label: 'Pest Control' },
  { id: 'fire_safety', label: 'Fire Safety' },
  { id: 'pool', label: 'Swimming Pool' },
  { id: 'gym', label: 'Gym Maintenance' },
  { id: 'common_utilities', label: 'Common Area Utilities' },
  { id: 'staff', label: 'Staff Salaries' },
  { id: 'insurance', label: 'Building Insurance' },
] as const;

export const MAINTENANCE_INCLUDED_OPTIONS = [
  {
    value: 'included_limited',
    label: 'Included (Limited Period)',
    description: 'Free for 1-2 years',
  },
  {
    value: 'included_lifetime',
    label: 'Included (Lifetime)',
    description: 'No separate charges',
  },
  {
    value: 'not_included',
    label: 'Not Included',
    description: 'Pay monthly after possession',
  },
  {
    value: 'optional',
    label: 'Optional',
    description: 'Can opt-in for services',
  },
] as const;

export const CONTACT_METHOD_OPTIONS = [
  { value: 'call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'any', label: 'Any Method' },
] as const;

export const CONTACT_TIME_OPTIONS_INST = [
  { value: 'morning', label: 'Morning (9 AM - 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM - 5 PM)' },
  { value: 'evening', label: 'Evening (5 PM - 9 PM)' },
  { value: 'anytime', label: 'Anytime' },
] as const;

// ============================================
// FORM SECTIONS CONFIGURATION
// ============================================

export const INSTALLMENT_FORM_SECTIONS = [
  { id: 'basic', title: 'Basic Information', icon: '📌', required: true },
  { id: 'location', title: 'Location Details', icon: '📍', required: true },
  { id: 'size', title: 'Size & Measurements', icon: '📐', required: true },
  { id: 'property_details', title: 'Property Details', icon: '🏠', required: true },
  { id: 'payment_plan', title: 'Payment Plan', icon: '💰', required: true },
  { id: 'parking', title: 'Parking Details', icon: '🚗', required: false },
  // 'project' section removed from UI; kept only in types & initial data
  { id: 'infrastructure', title: 'Utilities & Infrastructure', icon: '⚡', required: false },
  { id: 'features', title: 'Features & Amenities', icon: '✨', required: false },
  { id: 'legal', title: 'Legal & Ownership', icon: '📜', required: true },
  { id: 'taxes', title: 'Taxes & Charges', icon: '💸', required: false },
  { id: 'documents', title: 'Documents Upload', icon: '📄', required: false },
  { id: 'media', title: 'Images & Videos', icon: '📸', required: true },
  { id: 'description', title: 'Description', icon: '📝', required: true },
  { id: 'contact', title: 'Contact Details', icon: '📞', required: true },
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format a number into readable Pakistani price format
 * e.g. 2500000 → "25,00,000"
 */
export const formatPakistaniPrice = (value: string | number): string => {
  const numericValue =
    typeof value === 'string'
      ? parseInt(value.replace(/[^\d]/g, ''), 10)
      : Math.round(value);

  if (!numericValue || isNaN(numericValue)) return '0';

  const numStr = numericValue.toString();
  const lastThree = numStr.slice(-3);
  const otherNumbers = numStr.slice(0, -3);

  let formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  if (formatted) {
    formatted += ',' + lastThree;
  } else {
    formatted = lastThree;
  }

  return formatted;
};

/**
 * Parse formatted price back to number
 * e.g. "25,00,000" → 2500000
 */
export const parsePakistaniPrice = (value: string): number => {
  return parseInt(value.replace(/,/g, ''), 10) || 0;
};

/**
 * Convert a numeric amount to a readable short form
 * e.g. 2500000 → "25.00 Lakh"
 */
export const priceToWords = (amount: number): string => {
  if (amount >= 10000000) {
    const crore = amount / 10000000;
    return `${crore.toFixed(2)} Crore`;
  } else if (amount >= 100000) {
    const lakh = amount / 100000;
    return `${lakh.toFixed(2)} Lakh`;
  } else if (amount >= 1000) {
    const thousand = amount / 1000;
    return `${thousand.toFixed(1)}K`;
  }
  return amount.toString();
};

/**
 * Calculate percentage: (amount / total) * 100
 */
export const calculatePercent = (amount: number, total: number): string => {
  if (!total || total === 0) return '0';
  return ((amount / total) * 100).toFixed(1);
};

/**
 * Calculate amount from percentage of total
 */
export const calculateFromPercent = (percent: number, total: number): number => {
  return Math.round((percent / 100) * total);
};
