// types/property.ts

import { 
  InstallmentFormData, 
  initialInstallmentFormData,
  ListingPurpose,
  PropertyCondition,
  PlotStatus,
  DevelopmentStatus,
  BookingStatus,
  BallotStatus,
  PossessionDueOn,
  ParkingIncluded,
  ProjectStatus,
  ApprovalStatus,
  FileType,
  UtilityInclusion,
  MaintenanceIncluded,
  TaxPaidBy,
} from './installmentProperty';

// Re-export commonly used types from installmentProperty
export type {
  InstallmentFormData,
  ListingPurpose,
  PropertyCondition,
  PlotStatus,
  DevelopmentStatus,
  BookingStatus,
  BallotStatus,
  PossessionDueOn,
  ParkingIncluded,
  ProjectStatus,
  ApprovalStatus,
  FileType,
  UtilityInclusion,
  MaintenanceIncluded,
  TaxPaidBy,
} from './installmentProperty';

// ============================================
// UNIFIED PROPERTY FORM - CORE TYPES
// ============================================

// User Role (Owner, Agent, Developer, Society)
export type UserRole = 'owner' | 'agent' | 'developer' | 'society';

// Listing Type (Sell, Rent, Installment)
export type ListingType = 'sell' | 'rent' | 'installment';

// Property Category (for UI grouping)
// residential | commercial | plot | industrial
export type PropertyCategory = 'residential' | 'commercial' | 'plot' | 'industrial';

// ============================================
// FULL PAYMENT PROPERTY FORM TYPES
// ============================================

export interface FullPaymentFormData {
  // Basic Information
  title: string;
  propertyType: string;
  propertySubtype: string;
  price: string;
  area: string;
  unit: string;

  // Location Details
  city: string;
  society: string;
  customSociety: string;
  phase: string;
  block: string;
  streetNumber: string;

  // Property Details (dynamic based on type)
  bedrooms: string;
  bathrooms: string;
  floors: string;
  floorNumber: string;
  totalFloors: string;
  servantQuarter: boolean;
  basement: boolean;
  hasAttachedBath: boolean;
  hasMezzanine: boolean;

  // Shop & Commercial Specific Fields
  floorLocation: string;
  shopPosition: string;
  shopFrontWidth: string;
  shopDepth: string;
  mezzanineArea: string;
  electricityLoad: string;
  ceilingHeight: string;
  suitableFor: string[];
  hasWashroom: boolean;
  hasSignage: boolean;

  // Features
  furnished: string;
  condition: string;
  facing: string;
  parking: string;

  // Amenities (checkboxes)
  amenities: string[];

  // Possession & Legal
  possessionStatus: string;
  ownershipType: string;

  // Description & Media
  description: string;
  videoUrl: string;
  images: File[];

  // Contact Preferences
  whatsappNumber: string;
  contactTime: string;
}

export interface FullPaymentFormErrors {
  title?: string;
  propertyType?: string;
  propertySubtype?: string;
  price?: string;
  area?: string;
  unit?: string;
  city?: string;
  society?: string;
  customSociety?: string;
  phase?: string;
  block?: string;
  bedrooms?: string;
  bathrooms?: string;
  floors?: string;
  floorNumber?: string;
  totalFloors?: string;
  floorLocation?: string;
  shopFrontWidth?: string;
  shopDepth?: string;
  furnished?: string;
  condition?: string;
  facing?: string;
  parking?: string;
  possessionStatus?: string;
  ownershipType?: string;
  description?: string;
  videoUrl?: string;
  images?: string;
  whatsappNumber?: string;
  contactTime?: string;
}

export const initialFullPaymentFormData: FullPaymentFormData = {
  // Basic Information
  title: '',
  propertyType: 'House',
  propertySubtype: '',
  price: '',
  area: '',
  unit: 'Marla',

  // Location Details
  city: '',
  society: '',
  customSociety: '',
  phase: '',
  block: '',
  streetNumber: '',

  // Property Details
  bedrooms: '',
  bathrooms: '',
  floors: '',
  floorNumber: '',
  totalFloors: '',
  servantQuarter: false,
  basement: false,
  hasAttachedBath: false,
  hasMezzanine: false,

  // Shop & Commercial Specific Fields
  floorLocation: 'ground',
  shopPosition: '',
  shopFrontWidth: '',
  shopDepth: '',
  mezzanineArea: '',
  electricityLoad: 'single_phase',
  ceilingHeight: 'standard',
  suitableFor: [],
  hasWashroom: false,
  hasSignage: true,

  // Features
  furnished: 'unfurnished',
  condition: 'excellent',
  facing: '',
  parking: '0',

  // Amenities
  amenities: [],

  // Possession & Legal
  possessionStatus: 'ready',
  ownershipType: 'freehold',

  // Description & Media
  description: '',
  videoUrl: '',
  images: [],

  // Contact Preferences
  whatsappNumber: '',
  contactTime: 'anytime',
};

// ============================================
// RENT PROPERTY FORM TYPES (NEW)
// ============================================

export interface RentFormData {
  // Basic Information
  title: string;
  propertyType: string;
  propertySubtype: string;
  
  // Location Details
  city: string;
  society: string;
  customSociety: string;
  phase: string;
  block: string;
  streetNumber: string;
  completeAddress: string;

  // Size
  area: string;
  unit: string;
  
  // Property Details (dynamic based on type)
  bedrooms: string;
  bathrooms: string;
  floors: string;
  floorNumber: string;
  totalFloors: string;
  servantQuarter: boolean;
  basement: boolean;

  // Shop & Commercial Fields
  floorLocation: string;
  shopPosition: string;
  shopFrontWidth: string;
  shopDepth: string;
  hasMezzanine: boolean;
  mezzanineArea: string;
  suitableFor: string[];

  // Rent Pricing
  monthlyRent: string;
  securityDeposit: string; // PKR amount (e.g., "150000")
  advanceRent: string; // in months
  minContractPeriod: string; // in months
  maxContractPeriod: string; // in months
  rentNegotiable: boolean;
  incrementPerYear: string; // percentage

  // Utilities & Charges
  maintenanceCharges: string;
  maintenanceIncluded: boolean;
  utilitiesIncluded: boolean;
  utilitiesDetails: string;
  parkingIncluded: boolean;
  parkingCharges: string;

  // Features
  furnished: string;
  condition: string;
  facing: string;
  parking: string;
  amenities: string[];

  // Availability
  availableFrom: string;
  immediateAvailable: boolean;
  shortTermAllowed: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;

  // Tenant Preferences
  preferredTenant: string; // 'family' | 'bachelor' | 'company' | 'any'
  maxOccupants: string;

  // Legal & Ownership
  ownershipType: string;
  agreementType: string; // 'registered' | 'unregistered'
  
  // Description & Media
  description: string;
  videoUrl: string;
  images: File[];

  // Contact Preferences
  contactPerson: string;
  whatsappNumber: string;
  contactTime: string;
  showPhoneOnListing: boolean;
}

export interface RentFormErrors {
  title?: string;
  propertyType?: string;
  monthlyRent?: string;
  securityDeposit?: string;
  area?: string;
  city?: string;
  society?: string;
  bedrooms?: string;
  bathrooms?: string;
  availableFrom?: string;
  description?: string;
  images?: string;
  whatsappNumber?: string;
}

export const initialRentFormData: RentFormData = {
  // Basic Information
  title: '',
  propertyType: 'Apartment',
  propertySubtype: '',

  // Location
  city: '',
  society: '',
  customSociety: '',
  phase: '',
  block: '',
  streetNumber: '',
  completeAddress: '',

  // Size
  area: '',
  unit: 'Marla',

  // Property Details
  bedrooms: '',
  bathrooms: '',
  floors: '',
  floorNumber: '',
  totalFloors: '',
  servantQuarter: false,
  basement: false,

  // Commercial Fields
  floorLocation: 'ground',
  shopPosition: '',
  shopFrontWidth: '',
  shopDepth: '',
  hasMezzanine: false,
  mezzanineArea: '',
  suitableFor: [],

  // Rent Pricing
  monthlyRent: '',
  securityDeposit: '', // PKR amount (e.g., 150000)
  advanceRent: '1', // 1 month default
  minContractPeriod: '12', // 1 year default
  maxContractPeriod: '',
  rentNegotiable: false,
  incrementPerYear: '10', // 10% default

  // Utilities & Charges
  maintenanceCharges: '',
  maintenanceIncluded: false,
  utilitiesIncluded: false,
  utilitiesDetails: '',
  parkingIncluded: true,
  parkingCharges: '',

  // Features
  furnished: 'unfurnished',
  condition: 'excellent',
  facing: '',
  parking: '1',
  amenities: [],

  // Availability
  availableFrom: '',
  immediateAvailable: true,
  shortTermAllowed: false,
  petsAllowed: false,
  smokingAllowed: false,

  // Tenant Preferences
  preferredTenant: 'any',
  maxOccupants: '',

  // Legal
  ownershipType: 'freehold',
  agreementType: 'registered',

  // Media
  description: '',
  videoUrl: '',
  images: [],

  // Contact
  contactPerson: '',
  whatsappNumber: '',
  contactTime: 'anytime',
  showPhoneOnListing: true,
};

// ============================================
// UNIFIED / DYNAMIC PROPERTY FORM
// ============================================

export interface DynamicPropertyFormData {
  // --- Step 1: Role & Purpose ---
  userRole: UserRole;
  listingType: ListingType;

  // --- Step 2: Category (UI grouping) ---
  category: PropertyCategory;

  // --- Common Fields (Shared across all types) ---
  title: string;
  propertyType: string;
  propertySubtype: string;

  // Location
  city: string;
  society: string;
  customSociety: string;
  phase: string;
  block: string;
  streetNumber: string;
  completeAddress: string;

  // Size
  area: string;
  unit: string;

  // Property Details (dynamic based on category)
  bedrooms: string;
  bathrooms: string;
  floors: string;
  floorNumber: string;
  totalFloors: string;
  servantQuarter: boolean;
  basement: boolean;

  // Commercial Fields
  floorLocation: string;
  shopPosition: string;
  shopFrontWidth: string;
  shopDepth: string;
  hasMezzanine: boolean;
  mezzanineArea: string;
  suitableFor: string[];

  // Features
  furnished: string;
  condition: string;
  facing: string;
  parking: string;
  amenities: string[];

  // Legal
  possessionStatus: string;
  ownershipType: string;

  // Media
  description: string;
  videoUrl: string;
  images: File[];
  previewImages?: string[];

  // Contact
   whatsappNumber: string;
  contactTime: string;
  contactPerson: string;
  showPhoneOnListing: boolean;


  // --- SELL Specific (Full Payment) ---
  price: string; // Total price for sell

  // --- RENT Specific ---
  monthlyRent: string;
  securityDeposit: string; // PKR amount
  advanceRent: string;
  minContractPeriod: string;
  maxContractPeriod: string;
  rentNegotiable: boolean;
  incrementPerYear: string;
  maintenanceCharges: string;
  maintenanceIncluded: boolean;
  utilitiesIncluded: boolean;
  utilitiesDetails: string;
  availableFrom: string;
  immediateAvailable: boolean;
  shortTermAllowed: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  preferredTenant: string;
  maxOccupants: string;
  agreementType: string;

  // --- INSTALLMENT Specific (Complete Installment Form) ---
  installmentData: InstallmentFormData;
}

export const initialDynamicPropertyFormData: DynamicPropertyFormData = {
  // Step 1: Role & Purpose
  userRole: 'owner',
  listingType: 'sell',

  // Step 2: Category
  category: 'residential',

  // Common Fields
  title: '',
  propertyType: 'House',
  propertySubtype: '',

  // Location
  city: '',
  society: '',
  customSociety: '',
  phase: '',
  block: '',
  streetNumber: '',
  completeAddress: '',

  // Size
  area: '',
  unit: 'Marla',

  // Property Details
  bedrooms: '',
  bathrooms: '',
  floors: '',
  floorNumber: '',
  totalFloors: '',
  servantQuarter: false,
  basement: false,

  // Commercial
  floorLocation: 'ground',
  shopPosition: '',
  shopFrontWidth: '',
  shopDepth: '',
  hasMezzanine: false,
  mezzanineArea: '',
  suitableFor: [],

  // Features
  furnished: 'unfurnished',
  condition: 'excellent',
  facing: '',
  parking: '0',
  amenities: [],

  // Legal
  possessionStatus: 'ready',
  ownershipType: 'freehold',

  // Media
  description: '',
  videoUrl: '',
  images: [],
  previewImages: [],

  // Contact
  whatsappNumber: '',
  contactTime: 'anytime',
  contactPerson: '',
  showPhoneOnListing: true,

  // SELL
  price: '',

  // RENT
  monthlyRent: '',
  securityDeposit: '',
  advanceRent: '1',
  minContractPeriod: '12',
  maxContractPeriod: '',
  rentNegotiable: false,
  incrementPerYear: '10',
  maintenanceCharges: '',
  maintenanceIncluded: false,
  utilitiesIncluded: false,
  utilitiesDetails: '',
  availableFrom: '',
  immediateAvailable: true,
  shortTermAllowed: false,
  petsAllowed: false,
  smokingAllowed: false,
  preferredTenant: 'any',
  maxOccupants: '',
  agreementType: 'registered',

  // INSTALLMENT
  installmentData: initialInstallmentFormData,
};

// ============================================
// DROPDOWN OPTIONS
// ============================================

export const PROPERTY_TYPES = [
  'House',
  'Apartment',
  'Plot',
  'Shop',
  'Commercial',
  'Farmhouse',
] as const;

// ✅ NEW: Category-wise Property Types (prevents wrong types per category)
export const PROPERTY_TYPES_BY_CATEGORY: Record<PropertyCategory, readonly (typeof PROPERTY_TYPES)[number][]> = {
  residential: ['House', 'Apartment', 'Farmhouse', 'Plot'],
  commercial: ['Shop', 'Commercial'],
  plot: ['Plot'],
  industrial: ['Commercial'], // (temporary) until we add Warehouse/Factory as separate types
} as const;


export const PROPERTY_SUBTYPES: Record<string, string[]> = {
  House: ['Single Story', 'Double Story', 'Triple Story', 'Bungalow', 'Villa', 'Penthouse'],
  Apartment: ['Studio', '1 Bed', '2 Bed', '3 Bed', '4+ Bed', 'Penthouse'],
  Plot: ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Corner'],
  Shop: ['Shop', 'Showroom', 'Outlet', 'Kiosk', 'Corner Shop', 'Double-Height Shop'],
  Commercial: ['Office', 'Building', 'Warehouse', 'Factory', 'Hall', 'Plaza'],
  Farmhouse: ['Farmhouse', 'Agricultural Land', 'Dairy Farm'],
};

export const AREA_UNITS = ['Marla', 'Kanal', 'Sq. Ft.', 'Sq. Yards'] as const;

export const CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Bahawalpur',
  'Sargodha',
  'Sukkur',
  'Larkana',
  'Mardan',
  'Abbottabad',
  'Muzaffarabad',
  'Mirpur',
  'Other',
] as const;

export const SOCIETIES: Record<string, string[]> = {
  Lahore: [
    'DHA Phase 1',
    'DHA Phase 2',
    'DHA Phase 3',
    'DHA Phase 4',
    'DHA Phase 5',
    'DHA Phase 6',
    'DHA Phase 7',
    'DHA Phase 8',
    'DHA Phase 9 (Town)',
    'DHA Phase 10',
    'DHA Phase 11 (Rahbar)',
    'DHA EME Sector',
    'Bahria Town',
    'Bahria Orchard',
    'Model Town',
    'Gulberg',
    'Garden Town',
    'Johar Town',
    'Wapda Town',
    'Valencia Town',
    'Cantt',
    'Askari 10',
    'Askari 11',
    'Lake City',
    'LDA Avenue',
    'Paragon City',
    'Izmir Town',
    'Other',
  ],
  Karachi: [
    'DHA Phase 1',
    'DHA Phase 2',
    'DHA Phase 3',
    'DHA Phase 4',
    'DHA Phase 5',
    'DHA Phase 6',
    'DHA Phase 7',
    'DHA Phase 8',
    'Bahria Town Karachi',
    'Clifton',
    'PECHS',
    'Gulshan-e-Iqbal',
    'Gulistan-e-Johar',
    'North Nazimabad',
    'FB Area',
    'Nazimabad',
    'Korangi',
    'Malir',
    'Scheme 33',
    'Other',
  ],
  Islamabad: [
    'DHA Phase 1',
    'DHA Phase 2',
    'DHA Phase 3',
    'Bahria Town Phase 1-7',
    'Bahria Enclave',
    'Capital Smart City',
    'Blue World City',
    'Park View City',
    'B-17 Multi Gardens',
    'E-11',
    'F-6',
    'F-7',
    'F-8',
    'F-10',
    'F-11',
    'G-6',
    'G-7',
    'G-8',
    'G-9',
    'G-10',
    'G-11',
    'G-13',
    'G-14',
    'G-15',
    'I-8',
    'I-10',
    'I-14',
    'I-16',
    'Gulberg Greens',
    'Gulberg Residencia',
    'Other',
  ],
  Rawalpindi: [
    'Bahria Town Phase 1-8',
    'DHA Phase 1',
    'DHA Phase 2',
    'Askari 14',
    'Chaklala Scheme 3',
    'PWD Housing',
    'Media Town',
    'CBR Town',
    'Soan Garden',
    'Gulraiz Housing',
    'Adiala Road',
    'Other',
  ],
  Faisalabad: [
    'Eden Valley',
    'Citi Housing',
    'Canal Road',
    'Gulberg',
    'Madina Town',
    'Peoples Colony',
    'Other',
  ],
  Multan: [
    'DHA Multan',
    'Citi Housing',
    'Shah Rukn-e-Alam Colony',
    'Bosan Road',
    'Garden Town',
    'Other',
  ],
  Peshawar: [
    'DHA Peshawar',
    'Hayatabad Phase 1-7',
    'University Town',
    'Regi Model Town',
    'Other',
  ],
  Quetta: [
    'Chiltan Housing',
    'Satellite Town',
    'Jinnah Town',
    'Other',
  ],
  Other: ['Other'],
};

export const DEFAULT_SOCIETIES = ['Other'];

export const FURNISHED_OPTIONS = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'fully_furnished', label: 'Fully Furnished' },
] as const;

export const CONDITION_OPTIONS = [
  { value: 'brand_new', label: 'Brand New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'needs_renovation', label: 'Needs Renovation' },
] as const;

export const FACING_OPTIONS = [
  { value: '', label: 'Select Facing' },
  { value: 'north', label: 'North' },
  { value: 'south', label: 'South' },
  { value: 'east', label: 'East' },
  { value: 'west', label: 'West' },
  { value: 'corner', label: 'Corner' },
  { value: 'park_facing', label: 'Park Facing' },
  { value: 'main_boulevard', label: 'Main Boulevard' },
] as const;

export const PARKING_OPTIONS = [
  { value: '0', label: 'No Parking' },
  { value: '1', label: '1 Car' },
  { value: '2', label: '2 Cars' },
  { value: '3', label: '3 Cars' },
  { value: '4+', label: '4+ Cars' },
] as const;

export const POSSESSION_STATUS_OPTIONS = [
  { value: 'ready', label: 'Ready to Move' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'on_handover', label: 'On Handover' },
] as const;

export const OWNERSHIP_TYPE_OPTIONS = [
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'power_of_attorney', label: 'Power of Attorney' },
] as const;

export const CONTACT_TIME_OPTIONS = [
  { value: 'anytime', label: 'Anytime' },
  { value: 'morning', label: 'Morning (9 AM - 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM - 5 PM)' },
  { value: 'evening', label: 'Evening (5 PM - 9 PM)' },
] as const;

export const AMENITIES_LIST = [
  // Utilities
  { id: 'sui_gas', label: 'Sui Gas', category: 'utilities' },
  { id: 'electricity', label: 'Electricity', category: 'utilities' },
  { id: 'water_supply', label: 'Water Supply', category: 'utilities' },
  { id: 'sewerage', label: 'Sewerage', category: 'utilities' },
  { id: 'solar_panels', label: 'Solar Panels', category: 'utilities' },

  // Security
  { id: 'gated_community', label: 'Gated Community', category: 'security' },
  { id: 'security_guard', label: 'Security Guard', category: 'security' },
  { id: 'cctv', label: 'CCTV Cameras', category: 'security' },
  { id: 'intercom', label: 'Intercom', category: 'security' },

  // Facilities
  { id: 'elevator', label: 'Elevator/Lift', category: 'facilities' },
  { id: 'gym', label: 'Gym', category: 'facilities' },
  { id: 'swimming_pool', label: 'Swimming Pool', category: 'facilities' },
  { id: 'community_center', label: 'Community Center', category: 'facilities' },
  { id: 'mosque', label: 'Nearby Mosque', category: 'facilities' },
  { id: 'school', label: 'Nearby School', category: 'facilities' },
  { id: 'hospital', label: 'Nearby Hospital', category: 'facilities' },
  { id: 'shopping', label: 'Nearby Shopping', category: 'facilities' },

  // Interior
  { id: 'central_ac', label: 'Central AC', category: 'interior' },
  { id: 'central_heating', label: 'Central Heating', category: 'interior' },
  { id: 'lawn_garden', label: 'Lawn/Garden', category: 'interior' },
  { id: 'dirty_kitchen', label: 'Dirty Kitchen', category: 'interior' },
  { id: 'store_room', label: 'Store Room', category: 'interior' },
  { id: 'laundry_room', label: 'Laundry Room', category: 'interior' },
] as const;

// ============================================
// SHOP & COMMERCIAL PROPERTY OPTIONS
// ============================================

export const FLOOR_LOCATION_OPTIONS = [
  { value: 'lower_ground', label: 'Lower Ground' },
  { value: 'ground', label: 'Ground Floor' },
  { value: 'mezzanine', label: 'Mezzanine Floor' },
  { value: '1st', label: '1st Floor' },
  { value: '2nd', label: '2nd Floor' },
  { value: '3rd', label: '3rd Floor' },
  { value: '4th', label: '4th Floor' },
  { value: '5th_plus', label: '5th Floor & Above' },
  { value: 'food_court', label: 'Food Court' },
  { value: 'basement', label: 'Basement' },
  { value: 'rooftop', label: 'Rooftop' },
] as const;

export const SHOP_POSITION_OPTIONS = [
  { value: '', label: 'Select Position' },
  { value: 'main_entrance', label: 'Main Entrance Facing' },
  { value: 'back_side', label: 'Back Side' },
  { value: 'corner', label: 'Corner Shop' },
  { value: 'inside_mall', label: 'Inside Mall/Plaza' },
  { value: 'roadside', label: 'Road Facing' },
  { value: 'market_facing', label: 'Market Facing' },
] as const;

export const ELECTRICITY_LOAD_OPTIONS = [
  { value: 'single_phase', label: 'Single Phase' },
  { value: 'three_phase', label: '3 Phase' },
  { value: 'industrial', label: 'Industrial' },
] as const;

export const CEILING_HEIGHT_OPTIONS = [
  { value: 'standard', label: 'Standard (10-12 ft)' },
  { value: 'double_height', label: 'Double Height (18-22 ft)' },
  { value: 'high', label: 'High Ceiling (14-16 ft)' },
  { value: 'custom', label: 'Custom' },
] as const;

export const SUITABLE_FOR_OPTIONS = [
  { id: 'retail', label: 'Retail Store' },
  { id: 'restaurant', label: 'Restaurant/Cafe' },
  { id: 'clinic', label: 'Clinic/Medical' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'bank', label: 'Bank/ATM' },
  { id: 'salon', label: 'Salon/Spa' },
  { id: 'gym', label: 'Gym/Fitness' },
  { id: 'office', label: 'Office' },
  { id: 'warehouse', label: 'Warehouse/Storage' },
  { id: 'showroom', label: 'Showroom' },
  { id: 'supermarket', label: 'Supermarket/Grocery' },
  { id: 'mobile_shop', label: 'Mobile/Electronics' },
  { id: 'clothing', label: 'Clothing/Fashion' },
  { id: 'jewelry', label: 'Jewelry' },
  { id: 'food_court', label: 'Food Court Outlet' },
] as const;

// ============================================
// RENT-SPECIFIC OPTIONS
// ============================================

export const PREFERRED_TENANT_OPTIONS = [
  { value: 'family', label: 'Family Only' },
  { value: 'bachelor', label: 'Bachelor(s)' },
  { value: 'company', label: 'Company/Corporate' },
  { value: 'any', label: 'Any' },
] as const;

export const AGREEMENT_TYPE_OPTIONS = [
  { value: 'registered', label: 'Registered Agreement' },
  { value: 'unregistered', label: 'Unregistered Agreement' },
] as const;

// ============================================
// LEGACY TYPES (for backward compatibility)
// ============================================

export interface PropertyFormData {
  title: string;
  propertyType: string;
  price: string;
  area: string;
  unit: string;
  developer: string;
  city: string;
  bedrooms: string;
  bathrooms: string;
  parking: boolean;
  description: string;
  video: string;
  images: File[];
}

export interface PropertyFormErrors {
  title?: string;
  propertyType?: string;
  price?: string;
  area?: string;
  unit?: string;
  developer?: string;
  city?: string;
  bedrooms?: string;
  bathrooms?: string;
  description?: string;
  video?: string;
  images?: string;
}

export const initialPropertyFormData: PropertyFormData = {
  title: '',
  propertyType: 'Apartment',
  price: '',
  area: '',
  unit: 'Sq. Ft.',
  developer: '',
  city: '',
  bedrooms: '',
  bathrooms: '',
  parking: false,
  description: '',
  video: '',
  images: [],
};

export const DEVELOPERS = [
  'DHA',
  'Bahria Town',
  'Capital Smart City',
  'Blue World City',
  'Eden Housing',
  'Park View City',
  'Citi Housing',
  'Askari',
  'WAPDA',
  'LDA',
  'CDA',
  'Private Owner',
  'Other',
] as const;

// ============================================
// GOVERNMENT TAXES & CHARGES
// ============================================

export const TAX_RATES = {
  // Stamp Duty by Province
  stampDuty: {
    punjab: 1,      // 1% of DC Rate
    sindh: 2,       // 2% of DC Rate
    kpk: 3,         // 3% of DC Rate
    balochistan: 2, // 2% of DC Rate
    islamabad: 1,   // 1% of DC Rate
  },
  // Capital Value Tax
  cvt: 2, // 2% of DC Rate (all provinces)
  // Withholding Tax (WHT) - Section 236C
  whtFiler: 3,        // 3% of DC Rate
  whtNonFiler: 10.5,  // 10.5% of DC Rate
  // Advance Tax - Section 236K
  advanceTaxFiler: 3,      // 3% of DC Rate
  advanceTaxNonFiler: 10.5, // 10.5% of DC Rate
  // Capital Gains Tax (CGT) rates by holding period
  cgt: {
    within1Year: 15,
    within2Years: 12.5,
    within3Years: 10,
    within4Years: 7.5,
    within5Years: 5,
    within6Years: 2.5,
    after6Years: 0,
  },
} as const;

export const TAX_PAID_BY_OPTIONS = [
  { value: 'buyer', label: 'Paid by Buyer' },
  { value: 'seller', label: 'Paid by Seller' },
  { value: 'shared', label: 'Shared 50-50' },
  { value: 'negotiable', label: 'Negotiable' },
] as const;

export const FILER_STATUS_OPTIONS = [
  { value: 'filer', label: 'Filer (ATL - Active Tax Payer)', description: 'Registered with FBR' },
  { value: 'non_filer', label: 'Non-Filer', description: 'Not registered with FBR' },
  { value: 'company', label: 'Company/AOP', description: 'Business entity' },
] as const;

export type FilerStatus = 'filer' | 'non_filer' | 'company';

// ============================================
// UTILITY CHARGES OPTIONS
// ============================================

export const UTILITY_INCLUSION_OPTIONS = [
  { value: 'included', label: 'Included in Price', color: 'green' },
  { value: 'not_included', label: 'Not Included (Extra)', color: 'red' },
  { value: 'on_possession', label: 'Paid at Possession', color: 'orange' },
  { value: 'on_actual', label: 'On Actual Cost', color: 'blue' },
] as const;

export const ELECTRICITY_METER_OPTIONS = [
  { value: 'own_meter', label: 'Own Individual Meter (WAPDA/KE)' },
  { value: 'sub_meter', label: 'Sub-Meter (Building Supply)' },
  { value: 'bulk_meter', label: 'Bulk Meter (Shared)' },
  { value: 'prepaid_meter', label: 'Prepaid Meter' },
  { value: 'not_available', label: 'Not Yet Available' },
] as const;

export const GAS_CONNECTION_OPTIONS = [
  { value: 'sui_gas', label: 'Sui Gas (Individual Meter)' },
  { value: 'sui_gas_commercial', label: 'Sui Gas (Commercial Rate)' },
  { value: 'lpg', label: 'LPG Connection' },
  { value: 'central_gas', label: 'Central Gas System' },
  { value: 'not_available', label: 'Not Available' },
] as const;

export const WATER_SOURCE_OPTIONS = [
  { value: 'wasa', label: 'WASA/Municipal Water' },
  { value: 'boring', label: 'Boring/Well' },
  { value: 'tanker', label: 'Tanker Supply' },
  { value: 'mixed', label: 'Municipal + Boring' },
  { value: 'filtration_plant', label: 'Society Filtration Plant' },
  { value: 'not_available', label: 'Not Yet Available' },
] as const;

// ============================================
// DEVELOPER/SOCIETY CHARGES
// ============================================

export const EXTRA_CHARGES_TYPES = [
  { id: 'corner_charges', label: 'Corner Plot Charges', typical: '5-15% extra' },
  { id: 'park_facing', label: 'Park Facing Charges', typical: '3-10% extra' },
  { id: 'main_road', label: 'Main Road/Boulevard Charges', typical: '5-15% extra' },
  { id: 'floor_preference', label: 'Floor Preference Charges', typical: 'Rs. 50-500/sqft per floor' },
  { id: 'development_charges', label: 'Development Charges', typical: 'Rs. 50K - 5 Lac' },
  { id: 'documentation_charges', label: 'Documentation Charges', typical: 'Rs. 5K - 50K' },
  { id: 'processing_fee', label: 'Processing/Form Fee', typical: 'Rs. 1K - 10K' },
  { id: 'fdc', label: 'FDC (Fiber/Data Connection)', typical: 'Rs. 5K - 20K' },
  { id: 'connection_charges', label: 'Utility Connection Charges', typical: 'Rs. 30K - 1 Lac' },
] as const;

export const POSSESSION_CHARGES_OPTIONS = [
  { id: 'possession_fee', label: 'Possession Processing Fee' },
  { id: 'electricity_meter', label: 'Electricity Meter Charges' },
  { id: 'gas_meter', label: 'Gas Meter Charges' },
  { id: 'water_meter', label: 'Water Connection Charges' },
  { id: 'sewerage', label: 'Sewerage Connection' },
  { id: 'generator_share', label: 'Generator Share/Cost' },
  { id: 'lift_share', label: 'Lift Share/Cost' },
  { id: 'security_deposit', label: 'Security Deposit' },
  { id: 'advance_maintenance', label: 'Advance Maintenance (3-6 months)' },
  { id: 'sinking_fund', label: 'Sinking Fund Deposit' },
  { id: 'parking_charges', label: 'Parking Allotment Charges' },
  { id: 'terrace_charges', label: 'Terrace/Rooftop Charges' },
  { id: 'garden_charges', label: 'Garden/Lawn Charges' },
] as const;

// ============================================
// MAINTENANCE CHARGES
// ============================================

export const MAINTENANCE_INCLUDED_OPTIONS = [
  { value: 'included_limited', label: 'Included (Limited Period)', description: 'Free for 1-2 years' },
  { value: 'included_lifetime', label: 'Included (Lifetime)', description: 'No separate charges ever' },
  { value: 'not_included', label: 'Not Included', description: 'Pay monthly after possession' },
  { value: 'optional', label: 'Optional', description: 'Can opt-in for services' },
] as const;

export const MAINTENANCE_CALCULATION_OPTIONS = [
  { value: 'per_sqft', label: 'Per Square Foot' },
  { value: 'fixed', label: 'Fixed Monthly' },
  { value: 'per_unit', label: 'Per Unit/Apartment' },
  { value: 'per_marla', label: 'Per Marla' },
] as const;

export const MAINTENANCE_COVERS_OPTIONS = [
  { id: 'security', label: 'Security Guards' },
  { id: 'cctv', label: 'CCTV Monitoring' },
  { id: 'cleaning', label: 'Common Area Cleaning' },
  { id: 'lift', label: 'Lift/Elevator Maintenance' },
  { id: 'generator', label: 'Generator/Power Backup' },
  { id: 'water_pump', label: 'Water Pump/Tank' },
  { id: 'garbage', label: 'Garbage Collection' },
  { id: 'landscaping', label: 'Landscaping/Gardening' },
  { id: 'pest_control', label: 'Pest Control' },
  { id: 'fire_safety', label: 'Fire Safety Systems' },
  { id: 'swimming_pool', label: 'Swimming Pool Maintenance' },
  { id: 'gym', label: 'Gym Maintenance' },
  { id: 'common_utilities', label: 'Common Area Utilities' },
  { id: 'staff_salaries', label: 'Staff Salaries' },
  { id: 'building_insurance', label: 'Building Insurance' },
] as const;

// ============================================
// TRANSFER/RESALE CHARGES
// ============================================

export const TRANSFER_CHARGES_TYPES = [
  { id: 'society_transfer', label: 'Society Transfer Fee', typical: '0.5-2% or Fixed' },
  { id: 'membership_transfer', label: 'Membership Transfer', typical: 'Rs. 5K - 50K' },
  { id: 'noc_charges', label: 'NOC Charges', typical: 'Rs. 5K - 25K' },
  { id: 'stamp_duty', label: 'Stamp Duty', typical: '1-3% of DC Rate' },
  { id: 'cvt', label: 'Capital Value Tax (CVT)', typical: '2% of DC Rate' },
  { id: 'wht', label: 'Withholding Tax (WHT)', typical: '3-10.5% of DC Rate' },
  { id: 'advance_tax', label: 'Advance Tax', typical: '3-10.5% of DC Rate' },
  { id: 'registration_fee', label: 'Registration Fee', typical: 'Fixed amount' },
  { id: 'mutation_fee', label: 'Mutation Fee', typical: 'Varies' },
] as const;

// ============================================
// TAX CALCULATOR HELPER TYPES
// ============================================

export interface TaxCalculationInput {
  propertyValue: number;
  dcRate: number;
  fbrValue: number;
  buyerFilerStatus: FilerStatus;
  sellerFilerStatus: FilerStatus;
  province: string;
  holdingPeriodYears?: number;
  purchasePrice?: number;
}

export interface TaxCalculationResult {
  taxableValue: number; // Higher of DC Rate or FBR Value
  
  buyerCharges: {
    stampDuty: number;
    cvt: number;
    advanceTax: number;
    total: number;
  };
  
  sellerCharges: {
    wht: number;
    cgt: number;
    total: number;
  };
  
  totalGovernmentTaxes: number;
  
  breakdown: {
    stampDutyPercent: number;
    cvtPercent: number;
    advanceTaxPercent: number;
    whtPercent: number;
    cgtPercent: number;
  };
}

// ============================================
// USER ROLE OPTIONS
// ============================================

export const USER_ROLE_OPTIONS = [
  { 
    value: 'owner' as UserRole, 
    label: 'Owner', 
    description: 'I am the property owner',
    icon: '👤'
  },
  { 
    value: 'agent' as UserRole, 
    label: 'Agent', 
    description: 'I am a real estate agent',
    icon: '🏢'
  },
  { 
    value: 'developer' as UserRole, 
    label: 'Developer', 
    description: 'I am a property developer',
    icon: '🏗️'
  },
  { 
    value: 'society' as UserRole, 
    label: 'Society', 
    description: 'I represent a housing society',
    icon: '🏘️'
  },
] as const;

// ============================================
// LISTING TYPE OPTIONS
// ============================================

export const LISTING_TYPE_OPTIONS = [
  { 
    value: 'sell' as ListingType, 
    label: 'Sell', 
    description: 'Full payment / Cash',
    icon: '💵'
  },
  { 
    value: 'rent' as ListingType, 
    label: 'Rent', 
    description: 'Monthly rental',
    icon: '🔑'
  },
  { 
    value: 'installment' as ListingType, 
    label: 'Installment', 
    description: 'Payment plan / Booking',
    icon: '📅'
  },
] as const;

// ============================================
// PROPERTY CATEGORY OPTIONS (for Step 2)
// ============================================

export const PROPERTY_CATEGORY_OPTIONS = [
  { 
    value: 'residential' as PropertyCategory, 
    label: 'Residential', 
    description: 'Houses, Apartments, Plots',
    icon: '🏠'
  },
  { 
    value: 'commercial' as PropertyCategory, 
    label: 'Commercial', 
    description: 'Shops, Offices, Buildings',
    icon: '🏢'
  },
  { 
    value: 'plot' as PropertyCategory, 
    label: 'Plot', 
    description: 'Residential/Commercial Plots',
    icon: '📍'
  },
  { 
    value: 'industrial' as PropertyCategory, 
    label: 'Industrial', 
    description: 'Warehouses, Factories',
    icon: '🏭'
  },
] as const;
