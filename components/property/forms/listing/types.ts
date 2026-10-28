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
  coordinatesRaw:   string;
  lat:              string;
  lng:              string;

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
  amenities:        string[];
  nearbyFacilities: Array<{ name: string; category: string; distance: string }>;
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
  isFeaturedRequested: boolean;
  declaration:      boolean;
}

export const INITIAL_STATE: ListingFormState = {
  propertyType: '', propertySubtype: '', listingType: '', title: '',
  city: '', society: '', phase: '', block: '', streetAddress: '',
  coordinatesRaw: '', lat: '', lng: '',
  area: '', areaUnit: 'Marla', frontSize: '', depthSize: '', coveredArea: '',
  bedrooms: '', bathrooms: '', servantQuarters: '', parkings: '',
  floors: '', floorNumber: '', propertyAge: '', facing: '',
  isCorner: false, boundaryWall: false, furnishingStatus: '',
  possessionStatus: 'ready', amenities: [], nearbyFacilities: [],
  cultivationType: '',
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
  description: '', isFeaturedRequested: false, declaration: false,
};

// Property-type-aware amenity registry
export const AMENITY_GROUPS: Record<string, Array<{ key: string; label: string }>> = {
  residential: [
    { key: 'balcony', label: 'Balcony' },
    { key: 'servant_quarter', label: 'Servant Quarter' },
    { key: 'store_room', label: 'Store Room' },
    { key: 'laundry', label: 'Laundry Room' },
    { key: 'modular_kitchen', label: 'Modular Kitchen' },
    { key: 'lift', label: 'Lift / Elevator' },
    { key: 'backup_generator', label: 'Backup Generator' },
    { key: 'gym', label: 'Gym' },
    { key: 'swimming_pool', label: 'Swimming Pool' },
    { key: 'community_hall', label: 'Community Hall' },
    { key: 'kids_play_area', label: 'Kids Play Area' },
    { key: 'rooftop_access', label: 'Rooftop Access' },
    { key: 'cctv', label: 'CCTV' },
    { key: 'security_guard', label: '24/7 Security' },
    { key: 'intercom', label: 'Intercom' },
    { key: 'reserved_parking', label: 'Reserved Parking' },
    { key: 'visitor_parking', label: 'Visitor Parking' },
  ],
  commercial: [
    { key: 'front_signage', label: 'Front Signage' },
    { key: 'display_window', label: 'Display Window' },
    { key: 'reception', label: 'Reception Area' },
    { key: 'meeting_room', label: 'Meeting Room' },
    { key: 'central_ac', label: 'Central AC' },
    { key: 'split_ac', label: 'Split AC' },
    { key: 'backup_power', label: 'Backup Power (UPS/Generator)' },
    { key: 'internet_ready', label: 'Internet Ready' },
    { key: 'lift_access', label: 'Lift Access' },
    { key: 'loading_dock', label: 'Loading Dock' },
    { key: 'cctv', label: 'CCTV' },
    { key: 'fire_safety', label: 'Fire Safety System' },
    { key: 'access_control', label: 'Access Control' },
    { key: 'washroom', label: 'Attached Washroom' },
  ],
  food: [
    { key: 'commercial_kitchen', label: 'Commercial Kitchen' },
    { key: 'exhaust_system', label: 'Exhaust System' },
    { key: 'grease_trap', label: 'Grease Trap' },
    { key: 'cold_storage', label: 'Cold Storage' },
    { key: 'gas_connection', label: 'Gas Connection' },
    { key: 'outdoor_seating', label: 'Outdoor Seating' },
    { key: 'delivery_bay', label: 'Delivery Bay' },
    { key: 'washroom', label: 'Customer Washroom' },
  ],
  plot: [
    { key: 'electricity', label: 'Electricity Available' },
    { key: 'sui_gas', label: 'Sui Gas Available' },
    { key: 'water', label: 'Water Connection' },
    { key: 'sewerage', label: 'Sewerage' },
    { key: 'boundary_wall', label: 'Boundary Wall' },
    { key: 'main_gate', label: 'Main Gate' },
    { key: 'paved_road', label: 'Paved Road Access' },
    { key: 'corner', label: 'Corner Plot' },
  ],
};

export const NEARBY_CATEGORIES = [
  'School',
  'College',
  'University',
  'Hospital',
  'Shopping Mall',
  'Grocery / Market',
  'Mosque',
  'Park',
  'Gym',
  'Restaurant',
  'Bank / ATM',
  'Petrol Station',
  'Metro / Bus Stop',
  'Major Road',
  'Airport',
] as const;

export function getAmenityGroupForType(propertyType: string): Array<{ key: string; label: string }> {
  const t = String(propertyType || '').toLowerCase();
  if (['shop', 'office', 'warehouse', 'building', 'commercial'].includes(t)) {
    return AMENITY_GROUPS.commercial;
  }
  if (t.includes('food') || t.includes('restaurant')) {
    return AMENITY_GROUPS.food;
  }
  if (['plot', 'farmhouse', 'other'].includes(t)) {
    return AMENITY_GROUPS.plot;
  }
  return AMENITY_GROUPS.residential;
}

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