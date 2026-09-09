// components/property/forms/listing/types.ts
//
// Highrise.pk — Unified Property Listing Form Types
// API-driven (pages/api/properties/index.ts POST contract)
// Property type config: usePropertyForm.ts se reuse (single source)

import type { PropertyType, ListingType } from '../shared/usePropertyForm';
import { PROPERTY_TYPE_GROUPS, PROPERTY_TYPE_LABELS } from '../shared/usePropertyForm';

export type { PropertyType, ListingType };
export { PROPERTY_TYPE_GROUPS, PROPERTY_TYPE_LABELS };

// Area units — Pakistani market
export const AREA_UNITS = ['Marla', 'Kanal', 'Sq. Yd.', 'Sq. Ft.', 'Sq. M.'] as const;
export type AreaUnit = typeof AREA_UNITS[number];

// Form state — full property shape (API contract ke mutabiq)
export interface ListingFormState {
  // Step 1: Type + Location
  propertyType:     PropertyType | '';
  propertySubtype:  string;    // e.g. 'corner_plot', 'batai'
  listingType:      ListingType | '';
  title:            string;
  city:             string;
  society:          string;
  phase:            string;
  block:            string;
  streetAddress:    string;

  // Step 2: Details (conditional by propertyType)
  area:             string;
  areaUnit:         AreaUnit;
  frontSize:        string;    // plots — front in ft
  depthSize:        string;    // plots — depth in ft
  coveredArea:      string;    // built properties
  bedrooms:         string;
  bathrooms:        string;
  servantQuarters:  string;
  parkings:         string;
  floors:           string;    // house/building
  floorNumber:      string;    // apartment/shop/office
  propertyAge:      string;
  facing:           string;    // North/South/East/West
  isCorner:         boolean;
  boundaryWall:     boolean;   // plots
  furnishingStatus: string;    // furnished/semi/unfurnished
  possessionStatus: string;    // ready/under_construction/on_handover
  // Agricultural
  cultivationType:  string;    // orchard/crop/barren
  hasBore:          boolean;
  hasElectricity:   boolean;

  // Step 3: Pricing (listingType conditional)
  price:            string;    // full payment / pre-launch price
  priceNegotiable:  boolean;
  monthlyRent:      string;
  securityDeposit:  string;
  advanceMonths:    string;
  utilitiesIncluded: boolean;
  // Smart Installment Calculator
  instTotalPrice:   string;
  bookingPercent:   string;
  downPercent:      string;
  possessionPercent: string;
  installmentCount: string;
  frequency:        'monthly' | 'quarterly' | 'half-yearly';
  // Utilities (8 — API contract)
  electricityStatus: string;
  suiGasStatus:     string;
  waterStatus:      string;
  sewerageStatus:   string;
  internetReady:    boolean;
  cctvCoverage:     boolean;
  streetLights:     boolean;
  roadCondition:    string;
  gatedCommunity:   boolean;

  // Step 4: Legal + Media + Contact
  ownershipType:    string;    // freehold/leasehold/power_of_attorney
  fileType:         string;    // open_file/allocation/affidavit/registry/lease
  documentsAvailable: string[];
  hasDispute:       boolean;
  disputeDetails:   string;
  taxPaidUpToDate:  boolean;
  societyMembershipRequired: boolean;

  featureImage:     { url: string; public_id: string } | null;
  images:           Array<{ url: string; public_id: string; caption?: string }>;
  videoUrl:         string;
  virtualTourUrl:   string;
  droneVideoUrl:    string;

  contactPerson:    string;
  contactPhone:     string;
  contactWhatsapp:  string;
  showPhoneOnListing: boolean;

  description:      string;
  declaration:      boolean;
}

export const INITIAL_STATE: ListingFormState = {
  propertyType: '', propertySubtype: '', listingType: '', title: '',
  city: '', society: '', phase: '', block: '', streetAddress: '',
  area: '', areaUnit: 'Marla', frontSize: '', depthSize: '', coveredArea: '',
  bedrooms: '', bathrooms: '', servantQuarters: '', parkings: '',
  floors: '', floorNumber: '', propertyAge: '', facing: '',
  isCorner: false, boundaryWall: false, furnishingStatus: '',
  possessionStatus: 'ready', cultivationType: '',
  hasBore: false, hasElectricity: false,
  price: '', priceNegotiable: false, monthlyRent: '', securityDeposit: '',
  advanceMonths: '', utilitiesIncluded: false,
  instTotalPrice: '', bookingPercent: '', downPercent: '',
  possessionPercent: '', installmentCount: '', frequency: 'quarterly',
  electricityStatus: '', suiGasStatus: '', waterStatus: '', sewerageStatus: '',
  internetReady: false, cctvCoverage: false, streetLights: false,
  roadCondition: '', gatedCommunity: false,
  ownershipType: 'freehold', fileType: '', documentsAvailable: [],
  hasDispute: false, disputeDetails: '', taxPaidUpToDate: false,
  societyMembershipRequired: false,
  featureImage: null,
  images: [], videoUrl: '', virtualTourUrl: '', droneVideoUrl: '',
  contactPerson: '', contactPhone: '', contactWhatsapp: '',
  showPhoneOnListing: true,
  description: '', declaration: false,
};

// Pakistani cities (30 — new.tsx se same)
export const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Peshawar', 'Multan', 'Hyderabad', 'Quetta', 'Sialkot',
  'Gujranwala', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Dera Ghazi Khan',
  'Gujrat', 'Sahiwal', 'Wah Cantonment', 'Mardan', 'Kasur',
  'Okara', 'Mingora', 'Nawabshah', 'Chiniot', 'Kotri',
] as const;

export const FACING_OPTIONS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'] as const;
export const FURNISHING_OPTIONS = ['furnished', 'semi-furnished', 'unfurnished'] as const;
export const POSSESSION_OPTIONS = [
  { value: 'ready', label: 'Ready for Possession' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'on_handover', label: 'On Handover' },
] as const;