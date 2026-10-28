// components/property/forms/shared/usePropertyForm.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

// ═══════════════════════════════════════════════════════════════
// LISTING TYPES
// ═══════════════════════════════════════════════════════════════

export type ListingType = 'full_payment' | 'installment' | 'rent' | 'pre_launch';

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  full_payment: 'For Sale (Full Payment)',
  installment:  'Installment Plan',
  rent:         'For Rent',
  pre_launch:   'Pre-Launch / Token',
};

export const LISTING_TYPE_COLORS: Record<ListingType, {
  bg: string; border: string; text: string; gradient: string;
}> = {
  full_payment: {
    bg: 'bg-[#029bba] bg-opacity-5',
    border: 'border-[#029bba]',
    text: 'text-[#029bba]',
    gradient: 'from-[#029bba] to-[#004063]',
  },
  installment: {
    bg: 'bg-[#7c3aed] bg-opacity-5',
    border: 'border-[#7c3aed]',
    text: 'text-[#7c3aed]',
    gradient: 'from-[#7c3aed] to-[#4f46e5]',
  },
  rent: {
    bg: 'bg-[#0d9488] bg-opacity-5',
    border: 'border-[#0d9488]',
    text: 'text-[#0d9488]',
    gradient: 'from-[#0d9488] to-[#065f46]',
  },
  pre_launch: {
    bg: 'bg-[#4f46e5] bg-opacity-5',
    border: 'border-[#4f46e5]',
    text: 'text-[#4f46e5]',
    gradient: 'from-[#4f46e5] to-[#7c3aed]',
  },
};

// ═══════════════════════════════════════════════════════════════
// PROPERTY TYPES & SUBTYPES
// ═══════════════════════════════════════════════════════════════

export type PropertyType =
  | 'apartment' | 'house'    | 'villa'    | 'plot'
  | 'commercial'| 'shop'     | 'office'   | 'warehouse'
  | 'building'  | 'penthouse'| 'farmhouse'| 'room' | 'other';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment:  'Apartment / Flat',
  house:      'House',
  villa:      'Villa',
  plot:       'Plot',
  commercial: 'Commercial',
  shop:       'Shop',
  office:     'Office',
  warehouse:  'Warehouse / Factory',
  building:   'Whole Building',
  penthouse:  'Penthouse',
  farmhouse:  'Farm House',
  room:       'Room / PG',
  other:      'Agricultural / Other',
};

// Property type groups for UI
export interface PropertyTypeGroup {
  label:    string;
  icon:     string;
  color:    string;
  types:    PropertyType[];
}

export const PROPERTY_TYPE_GROUPS: PropertyTypeGroup[] = [
  {
    label:  'Residential',
    icon:   '🏠',
    color:  'border-[#029bba]',
    types:  ['house', 'apartment', 'villa', 'penthouse', 'room'],
  },
  {
    label:  'Plot / Land',
    icon:   '📐',
    color:  'border-[#10b981]',
    types:  ['plot'],
  },
  {
    label:  'Commercial',
    icon:   '🏢',
    color:  'border-[#7c3aed]',
    types:  ['shop', 'office', 'warehouse', 'building', 'commercial'],
  },
  {
    label:  'Agricultural',
    icon:   '🌾',
    color:  'border-[#f59e0b]',
    types:  ['farmhouse', 'other'],
  },
];

// Sub-types per property type
export interface SubTypeOption {
  value: string;
  label: string;
}

export const PROPERTY_SUBTYPES: Partial<Record<PropertyType, SubTypeOption[]>> = {
  house: [
    { value: 'house',        label: 'House' },
    { value: 'bungalow',     label: 'Bungalow' },
    { value: 'kothi',        label: 'Kothi' },
    { value: 'twin_house',   label: 'Twin House' },
    { value: 'corner_house', label: 'Corner House' },
    { value: 'row_house',    label: 'Row House' },
  ],
  villa: [
    { value: 'villa',        label: 'Villa' },
    { value: 'luxury_villa', label: 'Luxury Villa' },
    { value: 'farm_villa',   label: 'Farm Villa' },
    { value: 'beach_villa',  label: 'Beach Villa' },
  ],
  apartment: [
    { value: 'studio',       label: 'Studio Apartment' },
    { value: '1_bed',        label: '1 Bedroom Flat' },
    { value: '2_bed',        label: '2 Bedroom Flat' },
    { value: '3_bed',        label: '3 Bedroom Flat' },
    { value: '4_bed_plus',   label: '4+ Bedroom Flat' },
    { value: 'flat',         label: 'Flat' },
    { value: 'duplex',       label: 'Duplex Apartment' },
    { value: 'service_apt',  label: 'Serviced Apartment' },
  ],
  penthouse: [
    { value: 'penthouse',        label: 'Standard Penthouse' },
    { value: 'duplex_penthouse', label: 'Duplex Penthouse' },
    { value: 'sky_villa',        label: 'Sky Villa' },
  ],
  room: [
    { value: 'single_room',  label: 'Single Room' },
    { value: 'double_room',  label: 'Double Room' },
    { value: 'pg_room',      label: 'PG / Paying Guest' },
    { value: 'hostel_bed',   label: 'Hostel Bed / Dormitory' },
    { value: 'shared_room',  label: 'Shared Room' },
  ],
  plot: [
    { value: 'residential_plot', label: 'Residential Plot' },
    { value: 'commercial_plot',  label: 'Commercial Plot' },
    { value: 'industrial_plot',  label: 'Industrial Plot' },
    { value: 'boulevard_plot',   label: 'Boulevard Plot' },
    { value: 'corner_plot',      label: 'Corner Plot' },
    { value: 'park_facing_plot', label: 'Park Facing Plot' },
    { value: 'affidavit_plot',   label: 'Affidavit Plot / File' },
  ],
  shop: [
    { value: 'retail_shop',  label: 'Retail Shop' },
    { value: 'showroom',     label: 'Showroom' },
    { value: 'food_stall',   label: 'Food Stall / Cafe Unit' },
    { value: 'kiosk',        label: 'Kiosk' },
    { value: 'clinic_unit',  label: 'Clinic / Medical Unit' },
  ],
  office: [
    { value: 'single_office',  label: 'Single Office' },
    { value: 'office_suite',   label: 'Office Suite' },
    { value: 'full_floor',     label: 'Full Floor' },
    { value: 'coworking',      label: 'Co-working Space' },
    { value: 'corporate',      label: 'Corporate Office' },
    { value: 'virtual_office', label: 'Virtual Office' },
  ],
  warehouse: [
    { value: 'warehouse',       label: 'Warehouse' },
    { value: 'factory',         label: 'Factory / Mill' },
    { value: 'industrial_unit', label: 'Industrial Unit' },
    { value: 'cold_storage',    label: 'Cold Storage' },
    { value: 'workshop',        label: 'Workshop' },
  ],
  building: [
    { value: 'residential_building', label: 'Residential Building' },
    { value: 'commercial_building',  label: 'Commercial Building' },
    { value: 'mixed_use',            label: 'Mixed Use Building' },
    { value: 'plaza',                label: 'Plaza / Shopping Centre' },
    { value: 'hotel_building',       label: 'Hotel / Guest House' },
  ],
  farmhouse: [
    { value: 'farmhouse',     label: 'Farm House' },
    { value: 'farm_villa',    label: 'Farm Villa' },
    { value: 'country_house', label: 'Country House' },
    { value: 'guest_house',   label: 'Guest House' },
  ],
  other: [
    { value: 'agricultural_land', label: 'Agricultural Land' },
    { value: 'orchard',           label: 'Orchard / Baghbani' },
    { value: 'fishpond',          label: 'Fish Pond / Machli Farm' },
    { value: 'poultry_farm',      label: 'Poultry Farm' },
    { value: 'other',             label: 'Other' },
  ],
  commercial: [
    { value: 'commercial_unit', label: 'Commercial Unit' },
    { value: 'plaza_unit',      label: 'Plaza Unit' },
    { value: 'mixed_use_unit',  label: 'Mixed Use Unit' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// FIELD CONFIGURATION — Single Source of Truth
// ═══════════════════════════════════════════════════════════════

export interface FieldConfig {
  // Basics tab
  showSubType:          boolean;
  showBedrooms:         boolean;
  showBathrooms:        boolean;
  showKitchens:         boolean;
  showDrawingDining:    boolean;
  showServantQuarters:  boolean;
  showStudyStore:       boolean;
  showFloorNumber:      boolean;
  showTotalFloors:      boolean;
  showTotalUnits:       boolean;
  showFacing:           boolean;
  showCorner:           boolean;
  cornerLabel:          string;
  showCondition:        boolean;
  conditionOptions:     { value: string; label: string }[];
  showPossession:       boolean;
  // Plot-specific basics
  showPlotCategory:     boolean;
  showPlotNumber:       boolean;
  showIsParkFacing:     boolean;
  showIsMainRoadFacing: boolean;
  // Room-specific
  showGenderPreference: boolean;
  showAttachedBath:     boolean;
  showMealsIncluded:    boolean;
  // Building-specific
  showBuildingOccupancy:boolean;
  // Agricultural
  showLandType:         boolean;
  showWaterSource:      boolean;

  // Size tab
  showPlotArea:         boolean;
  plotAreaLabel:        string;
  defaultPlotUnit:      AreaUnit;
  showCoveredArea:      boolean;
  showPlotDimensions:   boolean;
  showTerraceArea:      boolean;
  showMezzanineArea:    boolean;
  showCarpetArea:       boolean;
  showOpenYardArea:     boolean;
  showFloorPlateArea:   boolean;
  showConstructionYear: boolean;
  quickSizes:           QuickSize[];

  // Commercial-specific size
  showCeilingHeight:    boolean;
  showLoadingBays:      boolean;
  showRoadWidth:        boolean;
  showAllowedFloors:    boolean;
  showFrontageWidth:    boolean;

  // Features tab
  amenityGroups:        AmenityGroupId[];
  showParking:          boolean;
  showParkingType:      string[];
  showBoundaryWall:     boolean;
  showLawnGarden:       boolean;
  showPowerLoad:        boolean;
  showFireSafety:       boolean;
  showThreePhase:       boolean;
  showTubewell:         boolean;
  showAccessRoad:       boolean;
  // Commercial features
  showDisplayWindow:    boolean;
  showStorageRoom:      boolean;
  showServerRoom:       boolean;
  showPrayerRoom:       boolean;
  showPantry:           boolean;

  // Pricing tab
  allowedListingTypes:  ListingType[];
  defaultListingType:   ListingType;
  showFurnishingStatus: boolean;
  showWeeklyRent:       boolean;
  showPreferredTenant:  boolean;
}

export type AmenityGroupId =
  | 'climate_power'
  | 'security'
  | 'lifestyle'
  | 'nearby'
  | 'connectivity'
  | 'commercial_specific'
  | 'warehouse_specific'
  | 'farmhouse_specific';

export interface QuickSize {
  label: string;
  size:  number;
  unit:  AreaUnit;
}

const ALL_CONDITIONS = [
  { value: 'new',                label: 'Brand New' },
  { value: 'used',               label: 'Used / Resale' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'renovated',          label: 'Renovated' },
];

const PLOT_CONDITIONS = [
  { value: 'new',                label: 'Open / Available' },
  { value: 'under_construction', label: 'Under Development' },
  { value: 'used',               label: 'Developed / Improved' },
];

const COMMERCIAL_CONDITIONS = [
  { value: 'new',                label: 'Brand New' },
  { value: 'used',               label: 'Used' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'renovated',          label: 'Renovated / Fitted' },
];

const AGRI_CONDITIONS = [
  { value: 'new',  label: 'Undeveloped / Virgin' },
  { value: 'used', label: 'Cultivated / Developed' },
];

export function getFieldConfig(propertyType: PropertyType | ''): FieldConfig {
  switch (propertyType) {

    // ── HOUSE / VILLA ────────────────────────────────────────
    case 'house':
    case 'villa':
      return {
        showSubType: true, showBedrooms: true, showBathrooms: true,
        showKitchens: true, showDrawingDining: true, showServantQuarters: true,
        showStudyStore: true, showFloorNumber: false, showTotalFloors: true,
        showTotalUnits: false, showFacing: true, showCorner: true,
        cornerLabel: 'Corner Plot', showCondition: true,
        conditionOptions: ALL_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: false,
        showIsParkFacing: true, showIsMainRoadFacing: true,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: true, plotAreaLabel: 'Plot Area',
        defaultPlotUnit: 'Marla', showCoveredArea: true,
        showPlotDimensions: true, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: false,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: true,
        quickSizes: [
          { label: '3 Marla',  size: 3,  unit: 'Marla' },
          { label: '5 Marla',  size: 5,  unit: 'Marla' },
          { label: '7 Marla',  size: 7,  unit: 'Marla' },
          { label: '10 Marla', size: 10, unit: 'Marla' },
          { label: '1 Kanal',  size: 1,  unit: 'Kanal' },
          { label: '2 Kanal',  size: 2,  unit: 'Kanal' },
        ],
        showCeilingHeight: false, showLoadingBays: false,
        showRoadWidth: false, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: ['climate_power','security','lifestyle','nearby','connectivity'],
        showParking: true, showParkingType: ['basement','open','covered','garage'],
        showBoundaryWall: true, showLawnGarden: true,
        showPowerLoad: false, showFireSafety: false, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','installment','rent','pre_launch'],
        defaultListingType: 'full_payment', showFurnishingStatus: true,
        showWeeklyRent: false, showPreferredTenant: true,
      };

    // ── APARTMENT ────────────────────────────────────────────
    case 'apartment':
      return {
        showSubType: true, showBedrooms: true, showBathrooms: true,
        showKitchens: true, showDrawingDining: true, showServantQuarters: true,
        showStudyStore: true, showFloorNumber: true, showTotalFloors: true,
        showTotalUnits: false, showFacing: true, showCorner: true,
        cornerLabel: 'Corner Unit', showCondition: true,
        conditionOptions: ALL_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: false,
        showIsParkFacing: true, showIsMainRoadFacing: false,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: false, plotAreaLabel: 'Covered Area',
        defaultPlotUnit: 'Square Feet', showCoveredArea: false,
        showPlotDimensions: false, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: true,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: true,
        quickSizes: [
          { label: '500 sqft',  size: 500,  unit: 'Square Feet' },
          { label: '750 sqft',  size: 750,  unit: 'Square Feet' },
          { label: '1000 sqft', size: 1000, unit: 'Square Feet' },
          { label: '1200 sqft', size: 1200, unit: 'Square Feet' },
          { label: '1500 sqft', size: 1500, unit: 'Square Feet' },
          { label: '2000 sqft', size: 2000, unit: 'Square Feet' },
        ],
        showCeilingHeight: false, showLoadingBays: false,
        showRoadWidth: false, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: ['climate_power','security','lifestyle','nearby','connectivity'],
        showParking: true, showParkingType: ['basement','covered'],
        showBoundaryWall: false, showLawnGarden: false,
        showPowerLoad: false, showFireSafety: false, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','installment','rent','pre_launch'],
        defaultListingType: 'full_payment', showFurnishingStatus: true,
        showWeeklyRent: false, showPreferredTenant: true,
      };

    // ── PENTHOUSE ────────────────────────────────────────────
    case 'penthouse':
      return {
        showSubType: true, showBedrooms: true, showBathrooms: true,
        showKitchens: true, showDrawingDining: true, showServantQuarters: true,
        showStudyStore: true, showFloorNumber: true, showTotalFloors: true,
        showTotalUnits: false, showFacing: true, showCorner: false,
        cornerLabel: 'Corner Unit', showCondition: true,
        conditionOptions: ALL_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: false,
        showIsParkFacing: false, showIsMainRoadFacing: false,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: false, plotAreaLabel: 'Covered Area',
        defaultPlotUnit: 'Square Feet', showCoveredArea: false,
        showPlotDimensions: false, showTerraceArea: true,
        showMezzanineArea: false, showCarpetArea: true,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: true,
        quickSizes: [
          { label: '2000 sqft', size: 2000, unit: 'Square Feet' },
          { label: '3000 sqft', size: 3000, unit: 'Square Feet' },
          { label: '4000 sqft', size: 4000, unit: 'Square Feet' },
          { label: '5000 sqft', size: 5000, unit: 'Square Feet' },
        ],
        showCeilingHeight: false, showLoadingBays: false,
        showRoadWidth: false, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: ['climate_power','security','lifestyle','nearby','connectivity'],
        showParking: true, showParkingType: ['basement','covered','garage'],
        showBoundaryWall: false, showLawnGarden: false,
        showPowerLoad: false, showFireSafety: false, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','installment','rent','pre_launch'],
        defaultListingType: 'full_payment', showFurnishingStatus: true,
        showWeeklyRent: false, showPreferredTenant: true,
      };

    // ── ROOM ─────────────────────────────────────────────────
    case 'room':
      return {
        showSubType: true, showBedrooms: false, showBathrooms: false,
        showKitchens: false, showDrawingDining: false, showServantQuarters: false,
        showStudyStore: false, showFloorNumber: true, showTotalFloors: false,
        showTotalUnits: false, showFacing: false, showCorner: false,
        cornerLabel: 'Corner', showCondition: true,
        conditionOptions: ALL_CONDITIONS, showPossession: false,
        showPlotCategory: false, showPlotNumber: false,
        showIsParkFacing: false, showIsMainRoadFacing: false,
        showGenderPreference: true, showAttachedBath: true,
        showMealsIncluded: true, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: false, plotAreaLabel: 'Room Area',
        defaultPlotUnit: 'Square Feet', showCoveredArea: false,
        showPlotDimensions: false, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: false,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: false,
        quickSizes: [
          { label: '100 sqft', size: 100, unit: 'Square Feet' },
          { label: '150 sqft', size: 150, unit: 'Square Feet' },
          { label: '200 sqft', size: 200, unit: 'Square Feet' },
          { label: '300 sqft', size: 300, unit: 'Square Feet' },
        ],
        showCeilingHeight: false, showLoadingBays: false,
        showRoadWidth: false, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: ['climate_power','security','connectivity'],
        showParking: false, showParkingType: [],
        showBoundaryWall: false, showLawnGarden: false,
        showPowerLoad: false, showFireSafety: false, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['rent'],
        defaultListingType: 'rent', showFurnishingStatus: true,
        showWeeklyRent: true, showPreferredTenant: true,
      };

    // ── PLOT ─────────────────────────────────────────────────
    case 'plot':
      return {
        showSubType: true, showBedrooms: false, showBathrooms: false,
        showKitchens: false, showDrawingDining: false, showServantQuarters: false,
        showStudyStore: false, showFloorNumber: false, showTotalFloors: false,
        showTotalUnits: false, showFacing: true, showCorner: true,
        cornerLabel: 'Corner Plot', showCondition: true,
        conditionOptions: PLOT_CONDITIONS, showPossession: true,
        showPlotCategory: true, showPlotNumber: true,
        showIsParkFacing: true, showIsMainRoadFacing: true,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: true, plotAreaLabel: 'Plot Area',
        defaultPlotUnit: 'Marla', showCoveredArea: false,
        showPlotDimensions: true, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: false,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: false,
        quickSizes: [
          { label: '3 Marla',  size: 3,  unit: 'Marla' },
          { label: '5 Marla',  size: 5,  unit: 'Marla' },
          { label: '7 Marla',  size: 7,  unit: 'Marla' },
          { label: '10 Marla', size: 10, unit: 'Marla' },
          { label: '1 Kanal',  size: 1,  unit: 'Kanal' },
          { label: '2 Kanal',  size: 2,  unit: 'Kanal' },
          { label: '4 Kanal',  size: 4,  unit: 'Kanal' },
        ],
        showCeilingHeight: false, showLoadingBays: false,
        showRoadWidth: true, showAllowedFloors: true, showFrontageWidth: false,
        amenityGroups: ['security','nearby'],
        showParking: false, showParkingType: [],
        showBoundaryWall: true, showLawnGarden: false,
        showPowerLoad: false, showFireSafety: false, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','installment','pre_launch'],
        defaultListingType: 'full_payment', showFurnishingStatus: false,
        showWeeklyRent: false, showPreferredTenant: false,
      };

    // ── SHOP ─────────────────────────────────────────────────
    case 'shop':
      return {
        showSubType: true, showBedrooms: false, showBathrooms: false,
        showKitchens: false, showDrawingDining: false, showServantQuarters: false,
        showStudyStore: false, showFloorNumber: true, showTotalFloors: false,
        showTotalUnits: false, showFacing: true, showCorner: true,
        cornerLabel: 'Corner Shop', showCondition: true,
        conditionOptions: COMMERCIAL_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: true,
        showIsParkFacing: false, showIsMainRoadFacing: true,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: false, plotAreaLabel: 'Shop Area',
        defaultPlotUnit: 'Square Feet', showCoveredArea: false,
        showPlotDimensions: false, showTerraceArea: false,
        showMezzanineArea: true, showCarpetArea: false,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: true,
        quickSizes: [
          { label: '100 sqft', size: 100, unit: 'Square Feet' },
          { label: '200 sqft', size: 200, unit: 'Square Feet' },
          { label: '300 sqft', size: 300, unit: 'Square Feet' },
          { label: '400 sqft', size: 400, unit: 'Square Feet' },
          { label: '600 sqft', size: 600, unit: 'Square Feet' },
          { label: '1000 sqft',size: 1000,unit: 'Square Feet' },
        ],
        showCeilingHeight: true, showLoadingBays: false,
        showRoadWidth: true, showAllowedFloors: false, showFrontageWidth: true,
        amenityGroups: ['climate_power','security','connectivity','commercial_specific'],
        showParking: true, showParkingType: ['open','basement'],
        showBoundaryWall: false, showLawnGarden: false,
        showPowerLoad: true, showFireSafety: false, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: true, showStorageRoom: true,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','installment','rent','pre_launch'],
        defaultListingType: 'full_payment', showFurnishingStatus: false,
        showWeeklyRent: false, showPreferredTenant: false,
      };

    // ── OFFICE ───────────────────────────────────────────────
    case 'office':
      return {
        showSubType: true, showBedrooms: false, showBathrooms: false,
        showKitchens: false, showDrawingDining: false, showServantQuarters: false,
        showStudyStore: false, showFloorNumber: true, showTotalFloors: true,
        showTotalUnits: false, showFacing: true, showCorner: false,
        cornerLabel: 'Corner', showCondition: true,
        conditionOptions: COMMERCIAL_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: true,
        showIsParkFacing: false, showIsMainRoadFacing: true,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: false, plotAreaLabel: 'Office Area',
        defaultPlotUnit: 'Square Feet', showCoveredArea: false,
        showPlotDimensions: false, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: true,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: true,
        quickSizes: [
          { label: '300 sqft',  size: 300,  unit: 'Square Feet' },
          { label: '500 sqft',  size: 500,  unit: 'Square Feet' },
          { label: '1000 sqft', size: 1000, unit: 'Square Feet' },
          { label: '1500 sqft', size: 1500, unit: 'Square Feet' },
          { label: '2000 sqft', size: 2000, unit: 'Square Feet' },
          { label: '5000 sqft', size: 5000, unit: 'Square Feet' },
        ],
        showCeilingHeight: true, showLoadingBays: false,
        showRoadWidth: false, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: ['climate_power','security','connectivity','commercial_specific'],
        showParking: true, showParkingType: ['basement','covered'],
        showBoundaryWall: false, showLawnGarden: false,
        showPowerLoad: true, showFireSafety: true, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: true, showPrayerRoom: true, showPantry: true,
        allowedListingTypes: ['full_payment','installment','rent','pre_launch'],
        defaultListingType: 'full_payment', showFurnishingStatus: false,
        showWeeklyRent: false, showPreferredTenant: false,
      };

    // ── WAREHOUSE / FACTORY ──────────────────────────────────
    case 'warehouse':
      return {
        showSubType: true, showBedrooms: false, showBathrooms: false,
        showKitchens: false, showDrawingDining: false, showServantQuarters: false,
        showStudyStore: false, showFloorNumber: false, showTotalFloors: false,
        showTotalUnits: false, showFacing: true, showCorner: false,
        cornerLabel: 'Corner', showCondition: true,
        conditionOptions: COMMERCIAL_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: false,
        showIsParkFacing: false, showIsMainRoadFacing: true,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: true, plotAreaLabel: 'Total Land Area',
        defaultPlotUnit: 'Square Feet', showCoveredArea: true,
        showPlotDimensions: true, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: false,
        showOpenYardArea: true, showFloorPlateArea: false,
        showConstructionYear: true,
        quickSizes: [
          { label: '2000 sqft',  size: 2000,  unit: 'Square Feet' },
          { label: '5000 sqft',  size: 5000,  unit: 'Square Feet' },
          { label: '10000 sqft', size: 10000, unit: 'Square Feet' },
          { label: '1 Kanal',    size: 1,     unit: 'Kanal' },
          { label: '2 Kanal',    size: 2,     unit: 'Kanal' },
          { label: '1 Acre',     size: 1,     unit: 'Acres' },
        ],
        showCeilingHeight: true, showLoadingBays: true,
        showRoadWidth: true, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: ['climate_power','security','warehouse_specific'],
        showParking: true, showParkingType: ['open','covered'],
        showBoundaryWall: true, showLawnGarden: false,
        showPowerLoad: true, showFireSafety: true, showThreePhase: true,
        showTubewell: false, showAccessRoad: true,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: true, showPantry: false,
        allowedListingTypes: ['full_payment','rent'],
        defaultListingType: 'full_payment', showFurnishingStatus: false,
        showWeeklyRent: false, showPreferredTenant: false,
      };

    // ── BUILDING ─────────────────────────────────────────────
    case 'building':
      return {
        showSubType: true, showBedrooms: false, showBathrooms: false,
        showKitchens: false, showDrawingDining: false, showServantQuarters: false,
        showStudyStore: false, showFloorNumber: false, showTotalFloors: true,
        showTotalUnits: true, showFacing: true, showCorner: true,
        cornerLabel: 'Corner Building', showCondition: true,
        conditionOptions: ALL_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: false,
        showIsParkFacing: false, showIsMainRoadFacing: true,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: true,
        showLandType: false, showWaterSource: false,
        showPlotArea: true, plotAreaLabel: 'Plot Area',
        defaultPlotUnit: 'Marla', showCoveredArea: true,
        showPlotDimensions: true, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: false,
        showOpenYardArea: false, showFloorPlateArea: true,
        showConstructionYear: true,
        quickSizes: [
          { label: '5 Marla',   size: 5,  unit: 'Marla' },
          { label: '10 Marla',  size: 10, unit: 'Marla' },
          { label: '1 Kanal',   size: 1,  unit: 'Kanal' },
          { label: '2 Kanal',   size: 2,  unit: 'Kanal' },
        ],
        showCeilingHeight: false, showLoadingBays: false,
        showRoadWidth: true, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: ['climate_power','security','lifestyle','connectivity'],
        showParking: true, showParkingType: ['basement','open','covered'],
        showBoundaryWall: true, showLawnGarden: false,
        showPowerLoad: true, showFireSafety: true, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','rent'],
        defaultListingType: 'full_payment', showFurnishingStatus: false,
        showWeeklyRent: false, showPreferredTenant: false,
      };

    // ── FARMHOUSE ────────────────────────────────────────────
    case 'farmhouse':
      return {
        showSubType: true, showBedrooms: true, showBathrooms: true,
        showKitchens: true, showDrawingDining: true, showServantQuarters: true,
        showStudyStore: true, showFloorNumber: false, showTotalFloors: false,
        showTotalUnits: false, showFacing: true, showCorner: false,
        cornerLabel: 'Corner', showCondition: true,
        conditionOptions: ALL_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: false,
        showIsParkFacing: false, showIsMainRoadFacing: true,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: true,
        showPlotArea: true, plotAreaLabel: 'Total Land Area',
        defaultPlotUnit: 'Kanal', showCoveredArea: true,
        showPlotDimensions: true, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: false,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: true,
        quickSizes: [
          { label: '2 Kanal', size: 2, unit: 'Kanal' },
          { label: '4 Kanal', size: 4, unit: 'Kanal' },
          { label: '1 Acre',  size: 1, unit: 'Acres' },
          { label: '2 Acres', size: 2, unit: 'Acres' },
          { label: '5 Acres', size: 5, unit: 'Acres' },
        ],
        showCeilingHeight: false, showLoadingBays: false,
        showRoadWidth: false, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: ['climate_power','security','lifestyle','nearby','farmhouse_specific'],
        showParking: true, showParkingType: ['open','garage'],
        showBoundaryWall: true, showLawnGarden: true,
        showPowerLoad: false, showFireSafety: false, showThreePhase: false,
        showTubewell: true, showAccessRoad: true,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','installment','rent'],
        defaultListingType: 'full_payment', showFurnishingStatus: true,
        showWeeklyRent: false, showPreferredTenant: true,
      };

    // ── AGRICULTURAL / OTHER ─────────────────────────────────
    case 'other':
      return {
        showSubType: true, showBedrooms: false, showBathrooms: false,
        showKitchens: false, showDrawingDining: false, showServantQuarters: false,
        showStudyStore: false, showFloorNumber: false, showTotalFloors: false,
        showTotalUnits: false, showFacing: false, showCorner: false,
        cornerLabel: 'Corner', showCondition: true,
        conditionOptions: AGRI_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: false,
        showIsParkFacing: false, showIsMainRoadFacing: false,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: true, showWaterSource: true,
        showPlotArea: true, plotAreaLabel: 'Land Area',
        defaultPlotUnit: 'Acres', showCoveredArea: false,
        showPlotDimensions: false, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: false,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: false,
        quickSizes: [
          { label: '1 Acre',   size: 1,   unit: 'Acres' },
          { label: '2 Acres',  size: 2,   unit: 'Acres' },
          { label: '5 Acres',  size: 5,   unit: 'Acres' },
          { label: '10 Acres', size: 10,  unit: 'Acres' },
          { label: '25 Acres', size: 25,  unit: 'Acres' },
          { label: '50 Acres', size: 50,  unit: 'Acres' },
        ],
        showCeilingHeight: false, showLoadingBays: false,
        showRoadWidth: false, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: [],
        showParking: false, showParkingType: [],
        showBoundaryWall: true, showLawnGarden: false,
        showPowerLoad: false, showFireSafety: false, showThreePhase: false,
        showTubewell: true, showAccessRoad: true,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','rent'],
        defaultListingType: 'full_payment', showFurnishingStatus: false,
        showWeeklyRent: false, showPreferredTenant: false,
      };

    // ── COMMERCIAL (generic) ─────────────────────────────────
    case 'commercial':
      return {
        showSubType: true, showBedrooms: false, showBathrooms: false,
        showKitchens: false, showDrawingDining: false, showServantQuarters: false,
        showStudyStore: false, showFloorNumber: true, showTotalFloors: false,
        showTotalUnits: false, showFacing: true, showCorner: true,
        cornerLabel: 'Corner Unit', showCondition: true,
        conditionOptions: COMMERCIAL_CONDITIONS, showPossession: true,
        showPlotCategory: false, showPlotNumber: true,
        showIsParkFacing: false, showIsMainRoadFacing: true,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: false, plotAreaLabel: 'Unit Area',
        defaultPlotUnit: 'Square Feet', showCoveredArea: false,
        showPlotDimensions: false, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: false,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: true,
        quickSizes: [
          { label: '200 sqft',  size: 200,  unit: 'Square Feet' },
          { label: '500 sqft',  size: 500,  unit: 'Square Feet' },
          { label: '1000 sqft', size: 1000, unit: 'Square Feet' },
          { label: '2000 sqft', size: 2000, unit: 'Square Feet' },
        ],
        showCeilingHeight: true, showLoadingBays: false,
        showRoadWidth: true, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: ['climate_power','security','connectivity','commercial_specific'],
        showParking: true, showParkingType: ['open','basement'],
        showBoundaryWall: false, showLawnGarden: false,
        showPowerLoad: true, showFireSafety: false, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','installment','rent','pre_launch'],
        defaultListingType: 'full_payment', showFurnishingStatus: false,
        showWeeklyRent: false, showPreferredTenant: false,
      };

    // ── DEFAULT (no type selected yet) ───────────────────────
    default:
      return {
        showSubType: false, showBedrooms: false, showBathrooms: false,
        showKitchens: false, showDrawingDining: false, showServantQuarters: false,
        showStudyStore: false, showFloorNumber: false, showTotalFloors: false,
        showTotalUnits: false, showFacing: false, showCorner: false,
        cornerLabel: 'Corner', showCondition: false,
        conditionOptions: ALL_CONDITIONS, showPossession: false,
        showPlotCategory: false, showPlotNumber: false,
        showIsParkFacing: false, showIsMainRoadFacing: false,
        showGenderPreference: false, showAttachedBath: false,
        showMealsIncluded: false, showBuildingOccupancy: false,
        showLandType: false, showWaterSource: false,
        showPlotArea: false, plotAreaLabel: 'Area',
        defaultPlotUnit: 'Marla', showCoveredArea: false,
        showPlotDimensions: false, showTerraceArea: false,
        showMezzanineArea: false, showCarpetArea: false,
        showOpenYardArea: false, showFloorPlateArea: false,
        showConstructionYear: false, quickSizes: [],
        showCeilingHeight: false, showLoadingBays: false,
        showRoadWidth: false, showAllowedFloors: false, showFrontageWidth: false,
        amenityGroups: [],
        showParking: false, showParkingType: [],
        showBoundaryWall: false, showLawnGarden: false,
        showPowerLoad: false, showFireSafety: false, showThreePhase: false,
        showTubewell: false, showAccessRoad: false,
        showDisplayWindow: false, showStorageRoom: false,
        showServerRoom: false, showPrayerRoom: false, showPantry: false,
        allowedListingTypes: ['full_payment','installment','rent','pre_launch'],
        defaultListingType: 'full_payment', showFurnishingStatus: true,
        showWeeklyRent: false, showPreferredTenant: false,
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// AREA UNITS
// ═══════════════════════════════════════════════════════════════

export type AreaUnit =
  | 'Marla' | 'Kanal' | 'Square Feet'
  | 'Square Yards' | 'Square Meters' | 'Acres';

export const AREA_UNITS: AreaUnit[] = [
  'Marla', 'Kanal', 'Square Feet',
  'Square Yards', 'Square Meters', 'Acres',
];

export const AREA_UNIT_DESCRIPTIONS: Record<AreaUnit, string> = {
  'Marla':        '1 Marla = 272.25 sq ft',
  'Kanal':        '1 Kanal = 20 Marla = 5,445 sq ft',
  'Square Feet':  'Standard square feet',
  'Square Yards': '1 sq yd = 9 sq ft',
  'Square Meters':'1 sq m ≈ 10.764 sq ft',
  'Acres':        '1 Acre = 8 Kanal = 43,560 sq ft',
};

export function convertToSqFt(size: number, unit: AreaUnit): number {
  const map: Record<AreaUnit, number> = {
    'Marla': 272.25, 'Kanal': 5445, 'Square Feet': 1,
    'Square Yards': 9, 'Square Meters': 10.764, 'Acres': 43560,
  };
  return Math.round(size * (map[unit] ?? 1));
}

// ═══════════════════════════════════════════════════════════════
// PAKISTAN CITIES
// ═══════════════════════════════════════════════════════════════

export const PAKISTAN_CITIES = [
  'Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad',
  'Multan','Peshawar','Quetta','Sialkot','Gujranwala',
  'Hyderabad','Bahawalpur','Sargodha','Abbottabad','Sukkur',
  'Larkana','Sheikhupura','Rahim Yar Khan','Jhang','Dera Ghazi Khan',
  'Gujrat','Sahiwal','Wah Cantonment','Mardan','Kasur',
  'Okara','Mingora','Nawabshah','Chiniot','Kamoke',
  'Mirpur','Muzaffarabad','Gilgit','Skardu','Other',
] as const;

// ═══════════════════════════════════════════════════════════════
// INSTALLMENT PLAN
// ═══════════════════════════════════════════════════════════════

export interface InstallmentPlan {
  totalPrice:               number;
  bookingAmount:            number;
  bookingPercent:           number;
  downPaymentAmount:        number;
  downPaymentPercent:       number;
  possessionAmount:         number;
  possessionPercent:        number;
  durationMonths:           number;
  hasMonthly:               boolean;
  monthlyAmount:            number;
  monthlyCount:             number;
  hasQuarterly:             boolean;
  quarterlyAmount:          number;
  quarterlyCount:           number;
  hasHalfYearly:            boolean;
  halfYearlyAmount:         number;
  halfYearlyCount:          number;
  hasYearly:                boolean;
  yearlyAmount:             number;
  yearlyCount:              number;
  startDate:                string;
  endDate:                  string;
  planName:                 string;
  developerName:            string;
  isNegotiable:             boolean;
  bankFinancingAvailable:   boolean;
  // Enterprise additions
  confirmationDeposit:      number;
  latePaymentPenalty:       number;
  discountOnFullPayment:    number;
  transferChargePercent:    number;
  cancellationPolicy:       string;
}

// ═══════════════════════════════════════════════════════════════
// RENTAL DETAILS — Enterprise Grade
// ═══════════════════════════════════════════════════════════════

export interface RentalDetails {
  // Core
  monthlyRent:              number;
  weeklyRent:               number;
  isNegotiable:             boolean;
  // Security & advance
  securityDepositMonths:    number;
  securityDepositAmount:    number;
  advanceMonths:            number;
  advanceAmount:            number;
  // Lease terms
  minimumLeasePeriod:       number;
  maximumLeasePeriod:       number;
  leaseFlexible:            boolean;
  availableFrom:            string;
  // Inclusions
  maintenanceIncluded:      boolean;
  maintenanceAmount:        number;
  utilitiesIncluded:        boolean;
  electricityIncluded:      boolean;
  gasIncluded:              boolean;
  waterIncluded:            boolean;
  internetIncluded:         boolean;
  parkingIncluded:          boolean;
  // Tenant preferences
  preferredTenantType:      'family' | 'bachelor' | 'couple' | 'company' | 'any' | '';
  maxOccupants:             number;
  petsAllowed:              boolean;
  smokingAllowed:           boolean;
  commercialUseAllowed:     boolean;
  // Room-specific
  mealsIncluded:            boolean;
  genderPreference:         'male' | 'female' | 'any' | '';
  // Financial
  furnishingStatus:         'unfurnished' | 'semi-furnished' | 'fully-furnished';
  rentIncrementPercent:     number;
  rentIncrementYearly:      boolean;
  // Misc
  shortTermAllowed:         boolean;
  immediateAvailable:       boolean;
  agreementType:            'standard' | 'notarized' | 'verbal' | '';
}

// ═══════════════════════════════════════════════════════════════
// RESIDENTIAL DETAILS
// ═══════════════════════════════════════════════════════════════

export interface ResidentialDetails {
  // House / Villa
  drawingRoom:        boolean;
  diningRoom:         boolean;
  studyRoom:          boolean;
  storeRoom:          boolean;
  servantQuarters:    boolean;
  laundryRoom:        boolean;
  porch:              boolean;
  boundaryWall:       boolean;
  mainRoadAccess:     boolean;
  isParkFacing:       boolean;
  isMainRoadFacing:   boolean;
  lawnGarden:         'none' | 'front' | 'back' | 'both' | 'rooftop' | '';
  // Apartment / Penthouse extras
  terraceArea:        number | '';
  carpetArea:         number | '';
  balconies:          number | '';
  view:               string;
  // Penthouse luxury
  hasPrivateElevator: boolean;
  hasJacuzzi:         boolean;
  hasPanoramicView:   boolean;
  hasConcierge:       boolean;
  // Room specific
  attachedBath:       boolean;
  sharedBath:         boolean;
  kitchenAccess:      'private' | 'shared' | 'none' | '';
}

// ═══════════════════════════════════════════════════════════════
// PLOT DETAILS
// ═══════════════════════════════════════════════════════════════

export interface PlotDetails {
  plotCategory:       'open_plot' | 'file' | 'on_ground' | '';
  plotNumber:         string;
  isParkFacing:       boolean;
  isMainRoadFacing:   boolean;
  isCorner:           boolean;
  roadWidth:          number | '';
  allowedFloors:      number | '';
  allowedUse:         string;
  boundaryWall:       boolean;
  developmentStatus:  'undeveloped' | 'under_development' | 'semi_developed' | 'fully_developed' | '';
}

// ═══════════════════════════════════════════════════════════════
// COMMERCIAL DETAILS
// ═══════════════════════════════════════════════════════════════

export interface CommercialDetails {
  // Shop
  shopNumber:         string;
  frontageWidth:      number | '';
  hasMezzanine:       boolean;
  mezzanineArea:      number | '';
  hasDisplayWindow:   boolean;
  hasStorageRoom:     boolean;
  hasWashroom:        boolean;
  shutterType:        'rolling' | 'collapsible' | 'glass' | 'none' | '';
  suitableFor:        string[];
  // Office
  meetingRooms:       number | '';
  carpetArea:         number | '';
  officeCabinType:    'cabin' | 'open_plan' | 'mixed' | '';
  hasReception:       boolean;
  hasServerRoom:      boolean;
  hasPantry:          boolean;
  hasPrayerRoom:      boolean;
  // Warehouse
  ceilingHeight:      number | '';
  loadingBays:        number | '';
  hasOfficePortion:   boolean;
  openYardArea:       number | '';
  hasThreePhase:      boolean;
  hasDockLeveler:     boolean;
  hasCraneAccess:     boolean;
  hasFireSafety:      boolean;
  hasDrainage:        boolean;
  // Building
  totalUnits:         number | '';
  basementFloors:     number | '';
  liftsCount:         number | '';
  buildingAge:        number | '';
  floorPlateArea:     number | '';
  occupancyStatus:    'vacant' | 'tenanted' | 'partial' | '';
  currentRentalIncome:number | '';
  // General commercial
  powerLoad:          number | '';
  roadWidth:          number | '';
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUCTION DETAILS — Enterprise Lifecycle Tracking
// ═══════════════════════════════════════════════════════════════

export type ProjectStatus =
  | 'planned'    // Pre-launch / not yet started
  | 'building'   // Active construction
  | 'finishing'  // Near completion (finishing stage)
  | 'ready'      // Completed / ready for possession
  | '';

export type ConstructionStage =
  | 'foundation'
  | 'structure'
  | 'brickwork'
  | 'plastering'
  | 'electrical'
  | 'finishing'
  | 'final_touches'
  | '';

export type ScheduleStatus =
  | 'on_time'
  | 'delayed'
  | 'ahead'
  | '';

// Stage → Default Progress % mapping (smart defaults)
export const STAGE_PROGRESS_MAP: Record<Exclude<ConstructionStage, ''>, number> = {
  foundation:    15,
  structure:     30,
  brickwork:     45,
  plastering:    60,
  electrical:    75,
  finishing:     90,
  final_touches: 97,
};

// Stage details (for UI display)
export const STAGE_DETAILS: Record<Exclude<ConstructionStage, ''>, {
  label: string;
  icon: string;
  description: string;
  typicalDuration: string;
}> = {
  foundation: {
    label: 'Foundation & Excavation',
    icon: '⛏️',
    description: 'Site cleared, foundation dug & poured',
    typicalDuration: '1-2 months',
  },
  structure: {
    label: 'Structure (RCC)',
    icon: '🏗️',
    description: 'Columns, beams, slabs poured',
    typicalDuration: '3-6 months',
  },
  brickwork: {
    label: 'Brickwork & Walls',
    icon: '🧱',
    description: 'Walls built, partitions raised',
    typicalDuration: '2-3 months',
  },
  plastering: {
    label: 'Plastering',
    icon: '🎨',
    description: 'Interior & exterior plaster applied',
    typicalDuration: '1-2 months',
  },
  electrical: {
    label: 'Electrical & Plumbing',
    icon: '⚡',
    description: 'Wiring, pipes, fixtures installed',
    typicalDuration: '2-3 months',
  },
  finishing: {
    label: 'Finishing Work',
    icon: '🪵',
    description: 'Flooring, doors, paint, tiles',
    typicalDuration: '2-4 months',
  },
  final_touches: {
    label: 'Final Touches',
    icon: '✨',
    description: 'Cleaning, snagging, final inspections',
    typicalDuration: '2-4 weeks',
  },
};

export interface ConstructionDetails {
  // Master status (drives visibility)
  projectStatus:       ProjectStatus;

  // Building/Finishing fields
  currentStage:        ConstructionStage;
  progressPercent:     number | '';

  // Timeline
  constructionStart:   string;  // ISO date
  expectedCompletion:  string;
  handoverDate:        string;
  moveInDate:          string;

  // Schedule
  scheduleStatus:      ScheduleStatus;

  // Delay fields (if delayed)
  originalCompletion:  string;
  delayMonths:         number | '';
  delayReason:         string;

  // Pre-launch fields (if planned)
  expectedLaunch:      string;
  bookingOpens:        string;
  preLaunchDiscount:   number | '';

  // Ready fields (if ready)
  yearBuilt:           number | '';
  yearRenovated:       number | '';
}

// ═══════════════════════════════════════════════════════════════
// AGRICULTURAL DETAILS
// ═══════════════════════════════════════════════════════════════

export interface AgriculturalDetails {
  landType:           'irrigated' | 'rainfed' | 'barani' | '';
  waterSource:        'canal' | 'tubewell' | 'rainwater' | 'none' | '';
  cropHistory:        string;
  hasTubewell:        boolean;
  hasFruitTrees:      boolean;
  hasLivestockArea:   boolean;
  hasGuestHouse:      boolean;
  accessRoadType:     'paved' | 'unpaved' | 'none' | '';
}

// ═══════════════════════════════════════════════════════════════
// UPLOADED IMAGE
// ═══════════════════════════════════════════════════════════════// ═══════════════════════════════════════════════════════════════
// PARKING DETAILS — V4.9.7 6-Step Conversational Flow
// ═══════════════════════════════════════════════════════════════

export type ParkingAvailability = 'dedicated' | 'shared' | 'none';
export type ParkingLocationType = 'covered' | 'open' | 'garage' | 'basement' | 'driveway';

export interface ParkingFormState {
  // Step 1 — Availability
  availability:       ParkingAvailability | '';

  // Step 2 — Pricing model
  isIncludedInPrice:  boolean;

  // Step 3 — Extra cost breakdown (only if !isIncludedInPrice)
  oneTimePurchaseFee: number | '';
  monthlyFee:         number | '';

  // Step 4 — Vehicle counts
  carSpaces:          number | '';
  motorcycleSpaces:   number | '';

  // Step 5 — Physical type
  locationType:       ParkingLocationType | '';

  // Step 6 — Features
  isDedicated:        boolean;
  hasEVCharging:      boolean;
  hasCCTV:            boolean;
  hasVisitorParking:  boolean;
  hasValet:           boolean;
  hasSecurityGuard:   boolean;
  specialNotes:       string;

  // Legacy fields — kept for backward compat
  available:          boolean;   // derived: availability !== 'none'
  spaces:             number | ''; // legacy total
  type:               string;    // legacy free-text
}

// ═══════════════════════════════════════════════════════════════
// UPLOADED IMAGE
// ═══════════════════════════════════════════════════════════════

export interface UploadedImage {
  url: string;
  publicId: string;
  assetToken?: string;
  resourceType?: 'image' | 'video' | 'raw';
  mimeType?: string;
  isExisting?: boolean;
  isPrimary?: boolean;
  caption?: string;
  category?: 'exterior' | 'interior' | 'kitchen' | 'bathroom' | 'bedroom' | 'other';
}

// ═══════════════════════════════════════════════════════════════
// MASTER FORM STATE
// ═══════════════════════════════════════════════════════════════

export interface PropertyFormState {
  // ── Meta
  listingType:    ListingType;
  isDraft:        boolean;

  // ── Tab 1: Basics (shared)
  title:          string;
  description:    string;
  propertyType:   PropertyType | '';
  subType:        string;
  condition:      string;
  facing:         string;
  isCorner:       boolean;
  floor:          number | '';
  totalFloors:    number | '';
  bedrooms:       number | '';
  bathrooms:      number | '';
  kitchens:       number | '';
  possessionStatus: 'ready' | 'under_construction' | 'on_map' | '';
  possessionDate: string;

  // ── Category-specific details (nested)
  residential:    ResidentialDetails;
  plotDetails:    PlotDetails;
  commercial:     CommercialDetails;
  agricultural:   AgriculturalDetails;
  construction:   ConstructionDetails;

  // ── Tab 2: Location
  city:               string;
  area:               string;
  sector:             string;
  block:              string;
  street:             string;
  address:            string;
  googleMapLink:      string;
  latitude:           number | '';
  longitude:          number | '';
  nearbyLandmarks:    string[];
  societyName:        string;
  phase:              string;
  projectId:          string;

  // ── Tab 3: Size
  areaSize:           number | '';
  areaUnit:           AreaUnit;
  coveredArea:        number | '';
  coveredAreaUnit:    AreaUnit;
  plotWidth:          number | '';
  plotLength:         number | '';
  sizeUnit:           AreaUnit;
  constructionYear:   number | '';
  renovationYear:     number | '';

  // ── Tab 4: Pricing
  price:              number | '';
  pricePerUnit:       number | '';
  isNegotiable:       boolean;
  tokenAmount:        number | '';
  expectedCompletionDate: string;
  installmentPlan:    InstallmentPlan;
  rentalDetails:      RentalDetails;

  // ── Tab 5: Charges & Taxes
  governmentTaxes: {
    stampDuty:      number | '';
    registrationFee:number | '';
    cgt:            number | '';
    withHoldingTax: number | '';
    cvt:            number | '';
    advanceTax:     number | '';
  };
  transferCharges: {
    noc:            number | '';
    transfer:       number | '';
    agent:          number | '';
    legal:          number | '';
  };
  extraCharges: {
    cornerCharges:                  number | '';
    developmentCharges:             number | '';
    electricityConnectionCharges:   number | '';
    gasConnectionCharges:           number | '';
    waterConnectionCharges:         number | '';
    parkingCharges:                 number | '';
    floorPremium:                   number | '';
    viewPremium:                    number | '';
    otherCharges:                   number | '';
    otherChargesDescription:        string;
  };
  possessionCharges: {
    total:          number | '';
    description:    string;
  };
  hiddenChargesDisclosure: string;
  maintenance: {
    monthlyFee:     number | '';
    annualFee:      number | '';
    includes:       string[];
  };

  // ── Tab 6: Features & Legal
  // Amenities (flat booleans — merged to array on submit)
  centralAC:          boolean;
  centralHeating:     boolean;
  generator:          boolean;
  upsBackup:          boolean;
  solarPanels:        boolean;
  elevator:           boolean;
  security24_7:       boolean;
  cctv:               boolean;
  intercom:           boolean;
  swimmingPool:       boolean;
  gym:                boolean;
  mosque:             boolean;
  park:               boolean;
  playground:         boolean;
  communityCenter:    boolean;
  shopping:           boolean;
  hospital:           boolean;
  school:             boolean;
  broadband:          boolean;
  cableTV:            boolean;
  wasteManagement:    boolean;
  maintenanceStaff:   boolean;
  gatedCommunity:     boolean;
  guardRoom:          boolean;
  servantQuartersAmenity: boolean;
  laundry:            boolean;
  rooftopAccess:      boolean;
  balcony:            boolean;
  garden:             boolean;
  basement:           boolean;
  doubleGlazing:      boolean;
  floorHeating:       boolean;
  // Commercial amenities
  powerBackup:        boolean;
  centralAirConditioning: boolean;
  accessControl:      boolean;
  fireSuppression:    boolean;
  loadingDock:        boolean;
  craneAvailable:     boolean;
  coldStorageAvailable: boolean;
  // Farmhouse amenities
  tubewell:           boolean;
  fruitTrees:         boolean;
  livestockArea:      boolean;

  parking: ParkingFormState;

  legal: {
    ownershipType:               string;
    approvalAuthority:           string;
    nocAvailable:                boolean;
    registryAvailable:           boolean;
    allotmentLetterAvailable:    boolean;
    agreementToSellAvailable:    boolean;
    possessionLetterAvailable:   boolean;
    completionCertificateAvailable: boolean;
    encumbranceFree:             boolean;
    disputeFree:                 boolean;
    reraRegistered:              boolean;
    reraNumber:                  string;
    fileType:                    string;
    transferType:                string;
    taxPaidUpToDate:             boolean;
  };

  infrastructure: {
    electricity:    boolean;
    gas:            boolean;
    water:          boolean;
    sewerage:       boolean;
    internet:       boolean;
    roads:          boolean;
    streetLights:   boolean;
  };

  // ── Tab 7: Media & Contact
  images:             UploadedImage[];
  floorPlanImages:    UploadedImage[];
  videoUrl:           string;
  virtualTourUrl:     string;
  ownershipProofUrl:  string;
  ownershipProofPublicId: string;
  ownershipProofAssetToken: string;
  ownershipProofResourceType: 'image' | 'raw' | '';
  ownershipProofMimeType: string;

  contactDetails: {
    name:               string;
    phone:              string;
    whatsapp:           string;
    email:              string;
    preferredContact:   'phone' | 'whatsapp' | 'email';
    showPhone:          boolean;
    showEmail:          boolean;
  };

  termsAccepted:      boolean;
  accuracyConfirmed:  boolean;
}

// ═══════════════════════════════════════════════════════════════
// TAB DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type TabId =
  | 'basics' | 'location' | 'size'
  | 'pricing' | 'charges' | 'features' | 'media';

export interface TabDefinition {
  id:    TabId;
  label: string;
  icon:  string;
}

export const TABS: TabDefinition[] = [
  { id: 'basics',   label: 'Basics',   icon: '🏠' },
  { id: 'location', label: 'Location', icon: '📍' },
  { id: 'size',     label: 'Size',     icon: '📐' },
  { id: 'pricing',  label: 'Pricing',  icon: '💰' },
  { id: 'charges',  label: 'Charges',  icon: '🧾' },
  { id: 'features', label: 'Features', icon: '✨' },
  { id: 'media',    label: 'Media',    icon: '📷' },
];

// ═══════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════

export type TabErrors       = Partial<Record<string, string>>;
export type AllTabErrors    = Partial<Record<TabId, TabErrors>>;
export type TabStatus       = 'untouched' | 'complete' | 'error';
export type AllTabStatuses  = Record<TabId, TabStatus>;

// ═══════════════════════════════════════════════════════════════
// PRICE FORMATTERS
// ═══════════════════════════════════════════════════════════════

export function formatPKR(amount: number | ''): string {
  if (amount === '' || amount === 0) return '';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num <= 0) return '';
  const crore    = Math.floor(num / 10_000_000);
  const lakh     = Math.floor((num % 10_000_000) / 100_000);
  const thousand = Math.floor((num % 100_000) / 1_000);
  const remainder= Math.floor(num % 1_000);
  const parts: string[] = [];
  if (crore    > 0) parts.push(`${crore} Crore`);
  if (lakh     > 0) parts.push(`${lakh} Lakh`);
  if (thousand > 0) parts.push(`${thousand} Thousand`);
  if (remainder> 0) parts.push(`${remainder}`);
  return parts.join(' ');
}

export function formatPKRNumeric(amount: number | ''): string {
  if (amount === '' || amount === 0) return '';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-PK');
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT STATE
// ═══════════════════════════════════════════════════════════════

const defaultInstallmentPlan: InstallmentPlan = {
  totalPrice: 0, bookingAmount: 0, bookingPercent: 0,
  downPaymentAmount: 0, downPaymentPercent: 0,
  possessionAmount: 0, possessionPercent: 0,
  durationMonths: 0, hasMonthly: false, monthlyAmount: 0, monthlyCount: 0,
  hasQuarterly: false, quarterlyAmount: 0, quarterlyCount: 0,
  hasHalfYearly: false, halfYearlyAmount: 0, halfYearlyCount: 0,
  hasYearly: false, yearlyAmount: 0, yearlyCount: 0,
  startDate: '', endDate: '', planName: '', developerName: '',
  isNegotiable: false, bankFinancingAvailable: false,
  confirmationDeposit: 0, latePaymentPenalty: 0,
  discountOnFullPayment: 0, transferChargePercent: 0,
  cancellationPolicy: '',
};

const defaultRentalDetails: RentalDetails = {
  monthlyRent: 0, weeklyRent: 0, isNegotiable: false,
  securityDepositMonths: 2, securityDepositAmount: 0,
  advanceMonths: 1, advanceAmount: 0,
  minimumLeasePeriod: 12, maximumLeasePeriod: 0, leaseFlexible: false,
  availableFrom: '', maintenanceIncluded: false, maintenanceAmount: 0,
  utilitiesIncluded: false, electricityIncluded: false, gasIncluded: false,
  waterIncluded: false, internetIncluded: false, parkingIncluded: false,
  preferredTenantType: 'any', maxOccupants: 0, petsAllowed: false,
  smokingAllowed: false, commercialUseAllowed: false,
  mealsIncluded: false, genderPreference: 'any',
  furnishingStatus: 'unfurnished', rentIncrementPercent: 0,
  rentIncrementYearly: false, shortTermAllowed: false,
  immediateAvailable: false, agreementType: 'standard',
};

const defaultResidential: ResidentialDetails = {
  drawingRoom: false, diningRoom: false, studyRoom: false,
  storeRoom: false, servantQuarters: false, laundryRoom: false,
  porch: false, boundaryWall: false, mainRoadAccess: false,
  isParkFacing: false, isMainRoadFacing: false, lawnGarden: '',
  terraceArea: '', carpetArea: '', balconies: '', view: '',
  hasPrivateElevator: false, hasJacuzzi: false,
  hasPanoramicView: false, hasConcierge: false,
  attachedBath: false, sharedBath: false, kitchenAccess: '',
};

const defaultPlotDetails: PlotDetails = {
  plotCategory: '', plotNumber: '', isParkFacing: false,
  isMainRoadFacing: false, isCorner: false, roadWidth: '',
  allowedFloors: '', allowedUse: '', boundaryWall: false,
  developmentStatus: '',
};

const defaultCommercial: CommercialDetails = {
  shopNumber: '', frontageWidth: '', hasMezzanine: false,
  mezzanineArea: '', hasDisplayWindow: false, hasStorageRoom: false,
  hasWashroom: false, shutterType: '', suitableFor: [],
  meetingRooms: '', carpetArea: '', officeCabinType: '',
  hasReception: false, hasServerRoom: false, hasPantry: false,
  hasPrayerRoom: false, ceilingHeight: '', loadingBays: '',
  hasOfficePortion: false, openYardArea: '', hasThreePhase: false,
  hasDockLeveler: false, hasCraneAccess: false, hasFireSafety: false,
  hasDrainage: false, totalUnits: '', basementFloors: '',
  liftsCount: '', buildingAge: '', floorPlateArea: '',
  occupancyStatus: '', currentRentalIncome: '', powerLoad: '',
  roadWidth: '',
};

const defaultAgricultural: AgriculturalDetails = {
  landType: '', waterSource: '', cropHistory: '',
  hasTubewell: false, hasFruitTrees: false,
  hasLivestockArea: false, hasGuestHouse: false, accessRoadType: '',
};

const defaultConstruction: ConstructionDetails = {
  projectStatus:      '',
  currentStage:       '',
  progressPercent:    '',
  constructionStart:  '',
  expectedCompletion: '',
  handoverDate:       '',
  moveInDate:         '',
  scheduleStatus:     '',
  originalCompletion: '',
  delayMonths:        '',
  delayReason:        '',
  expectedLaunch:     '',
  bookingOpens:       '',
  preLaunchDiscount:  '',
  yearBuilt:          '',
  yearRenovated:      '',
};

export const DEFAULT_FORM_STATE: PropertyFormState = {
  listingType: 'full_payment', isDraft: false,
  title: '', description: '', propertyType: '', subType: '',
  condition: '', facing: '', isCorner: false,
  floor: '', totalFloors: '', bedrooms: '', bathrooms: '', kitchens: '',
  possessionStatus: '', possessionDate: '',
  residential: defaultResidential,
  plotDetails: defaultPlotDetails,
  commercial: defaultCommercial,
  agricultural: defaultAgricultural,
  construction: defaultConstruction,
  city: '', area: '', sector: '', block: '', street: '',
  address: '', googleMapLink: '', latitude: '', longitude: '',
  nearbyLandmarks: [], societyName: '', phase: '', projectId: '',
  areaSize: '', areaUnit: 'Marla', coveredArea: '',
  coveredAreaUnit: 'Square Feet', plotWidth: '', plotLength: '',
  sizeUnit: 'Marla', constructionYear: '', renovationYear: '',
  price: '', pricePerUnit: '', isNegotiable: false,
  tokenAmount: '', expectedCompletionDate: '',
  installmentPlan: defaultInstallmentPlan,
  rentalDetails: defaultRentalDetails,
  governmentTaxes: {
    stampDuty: '', registrationFee: '', cgt: '',
    withHoldingTax: '', cvt: '', advanceTax: '',
  },
  transferCharges: { noc: '', transfer: '', agent: '', legal: '' },
  extraCharges: {
    cornerCharges: '', developmentCharges: '',
    electricityConnectionCharges: '', gasConnectionCharges: '',
    waterConnectionCharges: '', parkingCharges: '',
    floorPremium: '', viewPremium: '',
    otherCharges: '', otherChargesDescription: '',
  },
  possessionCharges: { total: '', description: '' },
  hiddenChargesDisclosure: '',
  maintenance: { monthlyFee: '', annualFee: '', includes: [] },
  centralAC: false, centralHeating: false, generator: false,
  upsBackup: false, solarPanels: false, elevator: false,
  security24_7: false, cctv: false, intercom: false,
  swimmingPool: false, gym: false, mosque: false, park: false,
  playground: false, communityCenter: false, shopping: false,
  hospital: false, school: false, broadband: false, cableTV: false,
  wasteManagement: false, maintenanceStaff: false,
  gatedCommunity: false, guardRoom: false,
  servantQuartersAmenity: false, laundry: false,
  rooftopAccess: false, balcony: false, garden: false,
  basement: false, doubleGlazing: false, floorHeating: false,
  powerBackup: false, centralAirConditioning: false,
  accessControl: false, fireSuppression: false,
  loadingDock: false, craneAvailable: false,
  coldStorageAvailable: false, tubewell: false,
  fruitTrees: false, livestockArea: false,
  parking: {
    // Step 1
    availability:       '',
    // Step 2
    isIncludedInPrice:  true,
    // Step 3
    oneTimePurchaseFee: '',
    monthlyFee:         '',
    // Step 4
    carSpaces:          '',
    motorcycleSpaces:   '',
    // Step 5
    locationType:       '',
    // Step 6
    isDedicated:        false,
    hasEVCharging:      false,
    hasCCTV:            false,
    hasVisitorParking:  false,
    hasValet:           false,
    hasSecurityGuard:   false,
    specialNotes:       '',
    // Legacy
    available:          false,
    spaces:             '',
    type:               '',
  },
  legal: {
    ownershipType: '', approvalAuthority: '',
    nocAvailable: false, registryAvailable: false,
    allotmentLetterAvailable: false, agreementToSellAvailable: false,
    possessionLetterAvailable: false, completionCertificateAvailable: false,
    encumbranceFree: false, disputeFree: false,
    reraRegistered: false, reraNumber: '',
    fileType: '', transferType: '', taxPaidUpToDate: false,
  },
  infrastructure: {
    electricity: false, gas: false, water: false,
    sewerage: false, internet: false, roads: false, streetLights: false,
  },
  images: [], floorPlanImages: [],
  videoUrl: '', virtualTourUrl: '',
  ownershipProofUrl: '', ownershipProofPublicId: '',
  ownershipProofAssetToken: '', ownershipProofResourceType: '', ownershipProofMimeType: '',
  contactDetails: {
    name: '', phone: '', whatsapp: '', email: '',
    preferredContact: 'phone', showPhone: true, showEmail: false,
  },
  termsAccepted: false, accuracyConfirmed: false,
};

// ═══════════════════════════════════════════════════════════════
// SESSION STORAGE
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'highrise_property_draft_v2';

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

function validateTab(tab: TabId, state: PropertyFormState): TabErrors {
  const errors: TabErrors = {};
  const cfg = getFieldConfig(state.propertyType as PropertyType | '');

  if (tab === 'basics') {
    if (!state.title.trim())
      errors.title = 'Title is required';
    else if (state.title.trim().length < 10)
      errors.title = 'Title must be at least 10 characters';
    else if (state.title.trim().length > 200)
      errors.title = 'Title must be under 200 characters';

    if (!state.description.trim())
      errors.description = 'Description is required';
    else if (state.description.trim().length < 50)
      errors.description = 'Description must be at least 50 characters';

    if (!state.propertyType)
      errors.propertyType = 'Property type is required';

    if (state.propertyType && cfg.showSubType && !state.subType)
      errors.subType = 'Please select a sub-type';

    if (state.propertyType && cfg.showCondition && !state.condition)
      errors.condition = 'Condition is required';

    if (state.propertyType && cfg.showPossession && !state.possessionStatus)
      errors.possessionStatus = 'Possession status is required';

    if (cfg.showBedrooms && (state.bedrooms === '' || (state.bedrooms as number) < 0))
      errors.bedrooms = 'Bedrooms required';

    if (cfg.showBathrooms && (state.bathrooms === '' || (state.bathrooms as number) < 0))
      errors.bathrooms = 'Bathrooms required';
  }

  if (tab === 'location') {
    if (!state.city) errors.city = 'City is required';
    if (!state.address.trim()) errors.address = 'Address is required';
    if (state.googleMapLink && !state.googleMapLink.startsWith('https://'))
      errors.googleMapLink = 'Must be a valid HTTPS URL';
    if (state.latitude !== '' && (state.latitude < 23.0 || state.latitude > 37.5))
      errors.latitude = 'Latitude must be within Pakistan (23–37.5)';
    if (state.longitude !== '' && (state.longitude < 60.0 || state.longitude > 77.5))
      errors.longitude = 'Longitude must be within Pakistan (60–77.5)';
  }

  if (tab === 'size') {
    if (state.areaSize === '' || (state.areaSize as number) <= 0)
      errors.areaSize = 'Area size is required';
    if (!state.areaUnit)
      errors.areaUnit = 'Area unit is required';
  }

  if (tab === 'pricing') {
    const lt = state.listingType;
    if (lt === 'full_payment' || lt === 'pre_launch') {
      if (state.price === '' || (state.price as number) <= 0)
        errors.price = 'Price is required';
    }
    if (lt === 'installment') {
      if (!state.installmentPlan.totalPrice || state.installmentPlan.totalPrice <= 0)
        errors['installmentPlan.totalPrice'] = 'Total price is required';
      if (!state.installmentPlan.bookingAmount || state.installmentPlan.bookingAmount <= 0)
        errors['installmentPlan.bookingAmount'] = 'Booking amount is required';
      if (!state.installmentPlan.durationMonths || state.installmentPlan.durationMonths <= 0)
        errors['installmentPlan.durationMonths'] = 'Duration is required';
    }
    if (lt === 'rent') {
      if (!state.rentalDetails.monthlyRent || state.rentalDetails.monthlyRent <= 0)
        errors['rentalDetails.monthlyRent'] = 'Monthly rent is required';
    }
  }

  if (tab === 'features') {
    if (!state.legal.ownershipType)
      errors['legal.ownershipType'] = 'Ownership type is required';
  }

  if (tab === 'media') {
    if (state.images.length === 0)
      errors.images = 'At least one image is required';
    if (!state.contactDetails.name.trim())
      errors['contactDetails.name'] = 'Contact name is required';
    if (!state.contactDetails.phone.trim())
      errors['contactDetails.phone'] = 'Phone number is required';
    if (!state.termsAccepted)
      errors.termsAccepted = 'You must accept the terms';
    if (!state.accuracyConfirmed)
      errors.accuracyConfirmed = 'You must confirm accuracy';
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════
// BUILD SUBMIT PAYLOAD — Maps nested form state → model fields
// ═══════════════════════════════════════════════════════════════

export function buildPropertySubmitPayload(state: PropertyFormState): Record<string, unknown> {
  // Merge amenity booleans → amenities array
  const amenityFlags: Record<string, boolean> = {
    'Central AC':           state.centralAC,
    'Central Heating':      state.centralHeating,
    'Generator':            state.generator,
    'UPS Backup':           state.upsBackup,
    'Solar Panels':         state.solarPanels,
    'Elevator / Lift':      state.elevator,
    '24/7 Security':        state.security24_7,
    'CCTV':                 state.cctv,
    'Intercom':             state.intercom,
    'Swimming Pool':        state.swimmingPool,
    'Gym / Fitness':        state.gym,
    'Mosque':               state.mosque,
    'Park':                 state.park,
    'Playground':           state.playground,
    'Community Center':     state.communityCenter,
    'Shopping':             state.shopping,
    'Hospital':             state.hospital,
    'School':               state.school,
    'Broadband Internet':   state.broadband,
    'Cable TV':             state.cableTV,
    'Waste Management':     state.wasteManagement,
    'Maintenance Staff':    state.maintenanceStaff,
    'Gated Community':      state.gatedCommunity,
    'Guard Room':           state.guardRoom,
    'Servant Quarters':     state.servantQuartersAmenity,
    'Laundry':              state.laundry,
    'Rooftop Access':       state.rooftopAccess,
    'Balcony':              state.balcony,
    'Garden':               state.garden,
    'Basement':             state.basement,
    'Double Glazing':       state.doubleGlazing,
    'Floor Heating':        state.floorHeating,
    'Power Backup':         state.powerBackup,
    'Central Air Conditioning': state.centralAirConditioning,
    'Access Control':       state.accessControl,
    'Fire Suppression':     state.fireSuppression,
    'Loading Dock':         state.loadingDock,
    'Crane Available':      state.craneAvailable,
    'Cold Storage':         state.coldStorageAvailable,
    'Tubewell':             state.tubewell,
    'Fruit Trees':          state.fruitTrees,
    'Livestock Area':       state.livestockArea,
  };

  const amenities = Object.entries(amenityFlags)
    .filter(([, v]) => v)
    .map(([k]) => k);

  // Build category-specific details object → saved in property.details
  const details: Record<string, unknown> = {};
  const pt = state.propertyType;

  if (['house','villa','apartment','penthouse','room','farmhouse'].includes(pt)) {
    Object.assign(details, {
      drawingRoom:        state.residential.drawingRoom,
      diningRoom:         state.residential.diningRoom,
      studyRoom:          state.residential.studyRoom,
      storeRoom:          state.residential.storeRoom,
      servantQuarters:    state.residential.servantQuarters,
      laundryRoom:        state.residential.laundryRoom,
      porch:              state.residential.porch,
      boundaryWall:       state.residential.boundaryWall,
      mainRoadAccess:     state.residential.mainRoadAccess,
      isParkFacing:       state.residential.isParkFacing,
      isMainRoadFacing:   state.residential.isMainRoadFacing,
      lawnGarden:         state.residential.lawnGarden || undefined,
    });
    if (pt === 'apartment' || pt === 'penthouse') {
      Object.assign(details, {
        terraceArea:        state.residential.terraceArea !== '' ? state.residential.terraceArea : undefined,
        carpetArea:         state.residential.carpetArea  !== '' ? state.residential.carpetArea  : undefined,
        balconies:          state.residential.balconies   !== '' ? state.residential.balconies   : undefined,
        view:               state.residential.view        || undefined,
      });
    }
    if (pt === 'penthouse') {
      Object.assign(details, {
        hasPrivateElevator: state.residential.hasPrivateElevator,
        hasJacuzzi:         state.residential.hasJacuzzi,
        hasPanoramicView:   state.residential.hasPanoramicView,
        hasConcierge:       state.residential.hasConcierge,
      });
    }
    if (pt === 'room') {
      Object.assign(details, {
        attachedBath:       state.residential.attachedBath,
        sharedBath:         state.residential.sharedBath,
        kitchenAccess:      state.residential.kitchenAccess || undefined,
        genderPreference:   state.rentalDetails.genderPreference || undefined,
        mealsIncluded:      state.rentalDetails.mealsIncluded,
      });
    }
    if (pt === 'farmhouse') {
      Object.assign(details, {
        hasTubewell:        state.agricultural.hasTubewell,
        hasFruitTrees:      state.agricultural.hasFruitTrees,
        hasLivestockArea:   state.agricultural.hasLivestockArea,
        hasGuestHouse:      state.agricultural.hasGuestHouse,
        accessRoadType:     state.agricultural.accessRoadType || undefined,
        waterSource:        state.agricultural.waterSource   || undefined,
      });
    }
  }

  if (pt === 'plot') {
    Object.assign(details, {
      plotCategory:       state.plotDetails.plotCategory    || undefined,
      plotNumber:         state.plotDetails.plotNumber      || undefined,
      isParkFacing:       state.plotDetails.isParkFacing,
      isMainRoadFacing:   state.plotDetails.isMainRoadFacing,
      roadWidth:          state.plotDetails.roadWidth       !== '' ? state.plotDetails.roadWidth      : undefined,
      allowedFloors:      state.plotDetails.allowedFloors   !== '' ? state.plotDetails.allowedFloors  : undefined,
      allowedUse:         state.plotDetails.allowedUse      || undefined,
      boundaryWall:       state.plotDetails.boundaryWall,
      developmentStatus:  state.plotDetails.developmentStatus || undefined,
    });
  }

  if (['shop','office','warehouse','building','commercial'].includes(pt)) {
    Object.assign(details, {
      shopNumber:         state.commercial.shopNumber      || undefined,
      frontageWidth:      state.commercial.frontageWidth   !== '' ? state.commercial.frontageWidth   : undefined,
      hasMezzanine:       state.commercial.hasMezzanine,
      mezzanineArea:      state.commercial.mezzanineArea   !== '' ? state.commercial.mezzanineArea   : undefined,
      hasDisplayWindow:   state.commercial.hasDisplayWindow,
      hasStorageRoom:     state.commercial.hasStorageRoom,
      hasWashroom:        state.commercial.hasWashroom,
      shutterType:        state.commercial.shutterType     || undefined,
      suitableFor:        state.commercial.suitableFor,
      meetingRooms:       state.commercial.meetingRooms    !== '' ? state.commercial.meetingRooms    : undefined,
      carpetArea:         state.commercial.carpetArea      !== '' ? state.commercial.carpetArea      : undefined,
      officeCabinType:    state.commercial.officeCabinType || undefined,
      hasReception:       state.commercial.hasReception,
      hasServerRoom:      state.commercial.hasServerRoom,
      hasPantry:          state.commercial.hasPantry,
      hasPrayerRoom:      state.commercial.hasPrayerRoom,
      ceilingHeight:      state.commercial.ceilingHeight   !== '' ? state.commercial.ceilingHeight   : undefined,
      loadingBays:        state.commercial.loadingBays     !== '' ? state.commercial.loadingBays     : undefined,
      hasOfficePortion:   state.commercial.hasOfficePortion,
      openYardArea:       state.commercial.openYardArea    !== '' ? state.commercial.openYardArea    : undefined,
      hasThreePhase:      state.commercial.hasThreePhase,
      hasDockLeveler:     state.commercial.hasDockLeveler,
      hasCraneAccess:     state.commercial.hasCraneAccess,
      hasFireSafety:      state.commercial.hasFireSafety,
      hasDrainage:        state.commercial.hasDrainage,
      totalUnits:         state.commercial.totalUnits      !== '' ? state.commercial.totalUnits      : undefined,
      basementFloors:     state.commercial.basementFloors  !== '' ? state.commercial.basementFloors  : undefined,
      liftsCount:         state.commercial.liftsCount      !== '' ? state.commercial.liftsCount      : undefined,
      buildingAge:        state.commercial.buildingAge     !== '' ? state.commercial.buildingAge     : undefined,
      floorPlateArea:     state.commercial.floorPlateArea  !== '' ? state.commercial.floorPlateArea  : undefined,
      occupancyStatus:    state.commercial.occupancyStatus || undefined,
      currentRentalIncome:state.commercial.currentRentalIncome !== '' ? state.commercial.currentRentalIncome : undefined,
      powerLoad:          state.commercial.powerLoad       !== '' ? state.commercial.powerLoad       : undefined,
      roadWidth:          state.commercial.roadWidth       !== '' ? state.commercial.roadWidth       : undefined,
    });
  }

  if (pt === 'other') {
    Object.assign(details, {
      landType:           state.agricultural.landType      || undefined,
      waterSource:        state.agricultural.waterSource   || undefined,
      cropHistory:        state.agricultural.cropHistory   || undefined,
      hasTubewell:        state.agricultural.hasTubewell,
      hasFruitTrees:      state.agricultural.hasFruitTrees,
      hasLivestockArea:   state.agricultural.hasLivestockArea,
      accessRoadType:     state.agricultural.accessRoadType || undefined,
    });
  }

  // ── Construction lifecycle (saved in details.construction) ──
  const construction = state.construction;
  if (construction.projectStatus) {
    const constructionObj: Record<string, unknown> = {
      projectStatus: construction.projectStatus,
    };

    // Building/Finishing fields
    if (construction.currentStage)
      constructionObj['currentStage'] = construction.currentStage;
    if (construction.progressPercent !== '')
      constructionObj['progressPercent'] = construction.progressPercent;

    // Timeline
    if (construction.constructionStart)
      constructionObj['constructionStart'] = construction.constructionStart;
    if (construction.expectedCompletion)
      constructionObj['expectedCompletion'] = construction.expectedCompletion;
    if (construction.handoverDate)
      constructionObj['handoverDate'] = construction.handoverDate;
    if (construction.moveInDate)
      constructionObj['moveInDate'] = construction.moveInDate;

    // Schedule status
    if (construction.scheduleStatus)
      constructionObj['scheduleStatus'] = construction.scheduleStatus;

    // Delay fields
    if (construction.scheduleStatus === 'delayed') {
      if (construction.originalCompletion)
        constructionObj['originalCompletion'] = construction.originalCompletion;
      if (construction.delayMonths !== '')
        constructionObj['delayMonths'] = construction.delayMonths;
      if (construction.delayReason)
        constructionObj['delayReason'] = construction.delayReason;
    }

    // Pre-launch fields
    if (construction.projectStatus === 'planned') {
      if (construction.expectedLaunch)
        constructionObj['expectedLaunch'] = construction.expectedLaunch;
      if (construction.bookingOpens)
        constructionObj['bookingOpens'] = construction.bookingOpens;
      if (construction.preLaunchDiscount !== '')
        constructionObj['preLaunchDiscount'] = construction.preLaunchDiscount;
    }

    // Ready fields — also keep top-level constructionYear/renovationYear in sync
    if (construction.yearBuilt !== '') {
      constructionObj['yearBuilt'] = construction.yearBuilt;
    }
    if (construction.yearRenovated !== '') {
      constructionObj['yearRenovated'] = construction.yearRenovated;
    }

    details['construction'] = constructionObj;
  }

  return {
    listingType:      state.listingType,
    title:            state.title.trim(),
    description:      state.description.trim(),
    propertyType:     state.propertyType,
    propertySubtype:  state.subType || undefined,
    details,
    condition:        state.condition   || undefined,
    facing:           state.facing      || undefined,
    isCornerPlot:     state.isCorner,
    floorNumber:      state.floor       !== '' ? state.floor       : undefined,
    totalFloors:      state.totalFloors !== '' ? state.totalFloors : undefined,
    bedrooms:         state.bedrooms    !== '' ? state.bedrooms    : undefined,
    bathrooms:        state.bathrooms   !== '' ? state.bathrooms   : undefined,
    kitchens:         state.kitchens    !== '' ? state.kitchens    : undefined,
    possessionStatus: state.possessionStatus || undefined,
    possessionDate:   state.possessionDate   || undefined,

    location: {
      city:              state.city,
      area:              state.area,
      sector:            state.sector,
      block:             state.block,
      street:            state.street,
      address:           state.address.trim(),
      googleMapLink:     state.googleMapLink || undefined,
      coordinates: {
        lat: state.latitude  !== '' ? state.latitude  : undefined,
        lng: state.longitude !== '' ? state.longitude : undefined,
      },
      nearbyLandmarks:   state.nearbyLandmarks,
      societyName:       state.societyName,
      phase:             state.phase,
    },

    projectId:         state.projectId || undefined,

    area: {
      size:          state.areaSize,
      unit:          state.areaUnit,
      coveredArea:   state.coveredArea  !== '' ? state.coveredArea  : undefined,
      coveredAreaUnit: state.coveredAreaUnit,
      plotWidth:     state.plotWidth    !== '' ? state.plotWidth    : undefined,
      plotLength:    state.plotLength   !== '' ? state.plotLength   : undefined,
      sizeUnit:      state.sizeUnit,
    },

    constructionYear: state.constructionYear !== '' ? state.constructionYear : undefined,
    renovationYear:   state.renovationYear   !== '' ? state.renovationYear   : undefined,

    price:            state.price          !== '' ? state.price          : undefined,
    pricePerUnit:     state.pricePerUnit   !== '' ? state.pricePerUnit   : undefined,
    priceNegotiable:  state.isNegotiable,
    tokenAmount:      state.tokenAmount    !== '' ? state.tokenAmount    : undefined,
    expectedCompletionDate: state.expectedCompletionDate || undefined,

    installmentPlan:  state.listingType === 'installment' ? state.installmentPlan : undefined,
    rentalDetails:    state.listingType === 'rent'        ? state.rentalDetails   : undefined,

    governmentTaxes:         state.governmentTaxes,
    transferCharges:         state.transferCharges,
    extraCharges:            state.extraCharges,
    possessionCharges:       state.possessionCharges,
    hiddenChargesDisclosure: state.hiddenChargesDisclosure || undefined,
    maintenance:             state.maintenance,

    amenities,

    // V4.9.7 — Map ParkingFormState → IParking API contract
    parking: (() => {
      const p = state.parking;
      if (!p.availability || p.availability === 'none') {
        // No parking — return minimal object
        return {
          availability:      'none',
          available:         false,
          isIncludedInPrice: true,
        };
      }
      return {
        // Step 1
        availability:       p.availability,
        available:          true, // narrowed: 'dedicated' | 'shared' → always true
        // Step 2
        isIncludedInPrice:  p.isIncludedInPrice,
        included:           p.isIncludedInPrice ? 'included' : 'separate', // Legacy enum
        // Step 3 — only if extra cost
        ...((!p.isIncludedInPrice) && {
          oneTimePurchaseFee: p.oneTimePurchaseFee !== '' ? p.oneTimePurchaseFee : undefined,
          monthlyFee:         p.monthlyFee         !== '' ? p.monthlyFee         : undefined,
          // Legacy price field = oneTimePurchaseFee for backward compat
          price:              p.oneTimePurchaseFee !== '' ? p.oneTimePurchaseFee : undefined,
        }),
        // Step 4
        carSpaces:          p.carSpaces         !== '' ? p.carSpaces         : undefined,
        motorcycleSpaces:   p.motorcycleSpaces  !== '' ? p.motorcycleSpaces  : undefined,
        // Legacy total spaces
        spaces: (
          (p.carSpaces !== '' ? Number(p.carSpaces) : 0) +
          (p.motorcycleSpaces !== '' ? Number(p.motorcycleSpaces) : 0)
        ) || undefined,
        // Step 5
        locationType:       p.locationType || undefined,
        type:               p.locationType || p.type || undefined, // Legacy free-text
        // Step 6
        isDedicated:        p.isDedicated,
        hasEVCharging:      p.hasEVCharging,
        hasCCTV:            p.hasCCTV,
        hasVisitorParking:  p.hasVisitorParking,
        hasValet:           p.hasValet,
        hasSecurityGuard:   p.hasSecurityGuard,
        specialNotes:       p.specialNotes || undefined,
      };
    })(),

    legal:           state.legal,
    infrastructure:  state.infrastructure,

    images:          state.images,
    floorPlanImages: state.floorPlanImages,
    videoUrl:        state.videoUrl        || undefined,
    virtualTourUrl:  state.virtualTourUrl  || undefined,
    contactDetails:  state.contactDetails,
    termsAccepted:   state.termsAccepted,
    accuracyConfirmed: state.accuracyConfirmed,
  };
}

// ═══════════════════════════════════════════════════════════════
// HOOK RETURN TYPE
// ═══════════════════════════════════════════════════════════════

export interface UsePropertyFormOptions {
  mode?: 'create' | 'edit';
  propertyId?: string;
  initialForm?: PropertyFormState;
  currentVerificationStatus?: string;
}

export interface UsePropertyFormReturn {
  form:             PropertyFormState;
  activeTab:        TabId;
  tabErrors:        AllTabErrors;
  tabStatuses:      AllTabStatuses;
  touchedTabs:      Set<TabId>;
  isSubmitting:     boolean;
  submitError:      string;
  submitSuccess:    boolean;
  submittedSlug:    string;
  submittedStatus:  string;
  isDirty:          boolean;
  lastSaved:        Date | null;
  fieldConfig:      FieldConfig;

  setField:             <K extends keyof PropertyFormState>(key: K, value: PropertyFormState[K]) => void;
  setResidentialField:  <K extends keyof ResidentialDetails>(key: K, value: ResidentialDetails[K]) => void;
  setPlotField:         <K extends keyof PlotDetails>(key: K, value: PlotDetails[K]) => void;
  setCommercialField:   <K extends keyof CommercialDetails>(key: K, value: CommercialDetails[K]) => void;
  setAgriculturalField: <K extends keyof AgriculturalDetails>(key: K, value: AgriculturalDetails[K]) => void;
  setConstructionField: <K extends keyof ConstructionDetails>(key: K, value: ConstructionDetails[K]) => void;
  setParkingField:      <K extends keyof ParkingFormState>(key: K, value: ParkingFormState[K]) => void;
  setInstallmentField:  <K extends keyof InstallmentPlan>(key: K, value: InstallmentPlan[K]) => void;
  setRentalField:       <K extends keyof RentalDetails>(key: K, value: RentalDetails[K]) => void;
  setListingType:       (type: ListingType) => void;
  setActiveTab:         (tab: TabId) => void;

  validateCurrentTab:   () => boolean;
  validateAllTabs:      () => boolean;
  goToNextTab:          () => void;
  goToPrevTab:          () => void;
  saveDraft:            () => void;
  clearDraft:           () => void;
  submitForm:           () => Promise<void>;

  formatPKR:            (amount: number | '') => string;
  formatPKRNumeric:     (amount: number | '') => string;
  getTabIndex:          (tab: TabId) => number;
  completedTabCount:    number;
}

// ═══════════════════════════════════════════════════════════════
// THE HOOK
// ═══════════════════════════════════════════════════════════════

export function usePropertyForm(options: UsePropertyFormOptions = {}): UsePropertyFormReturn {
  const { data: session } = useSession();
  const mode = options.mode ?? 'create';

  const loadSaved = (): PropertyFormState => {
    if (mode === 'edit' && options.initialForm) return options.initialForm;
    if (typeof window === 'undefined') return DEFAULT_FORM_STATE;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_FORM_STATE;
      const parsed = JSON.parse(raw) as Partial<PropertyFormState>;
      const defaultParking: ParkingFormState = {
        availability: '', isIncludedInPrice: true,
        oneTimePurchaseFee: '', monthlyFee: '',
        carSpaces: '', motorcycleSpaces: '',
        locationType: '', isDedicated: false,
        hasEVCharging: false, hasCCTV: false,
        hasVisitorParking: false, hasValet: false,
        hasSecurityGuard: false, specialNotes: '',
        available: false, spaces: '', type: '',
      };

      return {
        ...DEFAULT_FORM_STATE,
        ...parsed,
        residential:  { ...defaultResidential,  ...(parsed.residential  ?? {}) },
        plotDetails:  { ...defaultPlotDetails,  ...(parsed.plotDetails  ?? {}) },
        commercial:   { ...defaultCommercial,   ...(parsed.commercial   ?? {}) },
        agricultural: { ...defaultAgricultural, ...(parsed.agricultural ?? {}) },
        construction: { ...defaultConstruction, ...(parsed.construction ?? {}) },
        parking:      { ...defaultParking,      ...(parsed.parking      ?? {}) },
        installmentPlan: { ...defaultInstallmentPlan, ...(parsed.installmentPlan ?? {}) },
        rentalDetails:   { ...defaultRentalDetails,   ...(parsed.rentalDetails   ?? {}) },
      };
    } catch {
      return DEFAULT_FORM_STATE;
    }
  };

  const [form, setForm]                   = useState<PropertyFormState>(loadSaved);
  const [activeTab, setActiveTabState]    = useState<TabId>('basics');
  const [tabErrors, setTabErrors]         = useState<AllTabErrors>({});
  const [touchedTabs, setTouchedTabs]     = useState<Set<TabId>>(new Set());
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [submitError, setSubmitError]     = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedSlug, setSubmittedSlug] = useState('');
  const [submittedStatus, setSubmittedStatus] = useState('');
  const [isDirty, setIsDirty]             = useState(false);
  const [lastSaved, setLastSaved]         = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived field config
  const fieldConfig = getFieldConfig(form.propertyType as PropertyType | '');

  // Tab statuses
  const tabStatuses = useCallback((): AllTabStatuses => {
    const s = {} as AllTabStatuses;
    for (const tab of TABS) {
      if (!touchedTabs.has(tab.id))          s[tab.id] = 'untouched';
      else if (tabErrors[tab.id] && Object.keys(tabErrors[tab.id]!).length > 0)
                                              s[tab.id] = 'error';
      else                                    s[tab.id] = 'complete';
    }
    return s;
  }, [touchedTabs, tabErrors]);

  const completedTabCount = TABS.filter(
    (t) => Object.keys(validateTab(t.id, form)).length === 0
  ).length;

  // ── Setters ──────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof PropertyFormState>(key: K, value: PropertyFormState[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        // When propertyType changes: reset subType + enforce listing type
        if (key === 'propertyType') {
          next.subType = '';
          const cfg = getFieldConfig(value as PropertyType | '');
          if (!cfg.allowedListingTypes.includes(next.listingType)) {
            next.listingType = cfg.defaultListingType;
          }
          // Reset area unit to type default
          next.areaUnit = cfg.defaultPlotUnit;
        }
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  const setResidentialField = useCallback(
    <K extends keyof ResidentialDetails>(key: K, value: ResidentialDetails[K]) => {
      setForm((prev) => ({
        ...prev,
        residential: { ...prev.residential, [key]: value },
      }));
      setIsDirty(true);
    },
    []
  );

  const setPlotField = useCallback(
    <K extends keyof PlotDetails>(key: K, value: PlotDetails[K]) => {
      setForm((prev) => ({
        ...prev,
        plotDetails: { ...prev.plotDetails, [key]: value },
      }));
      setIsDirty(true);
    },
    []
  );

  const setCommercialField = useCallback(
    <K extends keyof CommercialDetails>(key: K, value: CommercialDetails[K]) => {
      setForm((prev) => ({
        ...prev,
        commercial: { ...prev.commercial, [key]: value },
      }));
      setIsDirty(true);
    },
    []
  );

  const setAgriculturalField = useCallback(
    <K extends keyof AgriculturalDetails>(key: K, value: AgriculturalDetails[K]) => {
      setForm((prev) => ({
        ...prev,
        agricultural: { ...prev.agricultural, [key]: value },
      }));
      setIsDirty(true);
    },
    []
  );

  const setConstructionField = useCallback(
    <K extends keyof ConstructionDetails>(key: K, value: ConstructionDetails[K]) => {
      setForm((prev) => ({
        ...prev,
        construction: { ...prev.construction, [key]: value },
      }));
      setIsDirty(true);
    },
    []
  );

  const setParkingField = useCallback(
    <K extends keyof ParkingFormState>(key: K, value: ParkingFormState[K]) => {
      setForm((prev) => {
        const next = { ...prev.parking, [key]: value };

        // Smart derived field: availability → available (legacy sync)
        if (key === 'availability') {
          next.available = (value as ParkingAvailability) !== 'none';
        }

        return { ...prev, parking: next };
      });
      setIsDirty(true);
    },
    []
  );

  const setInstallmentField = useCallback(
    <K extends keyof InstallmentPlan>(key: K, value: InstallmentPlan[K]) => {
      setForm((prev) => ({
        ...prev,
        installmentPlan: { ...prev.installmentPlan, [key]: value },
      }));
      setIsDirty(true);
    },
    []
  );

  const setRentalField = useCallback(
    <K extends keyof RentalDetails>(key: K, value: RentalDetails[K]) => {
      setForm((prev) => ({
        ...prev,
        rentalDetails: { ...prev.rentalDetails, [key]: value },
      }));
      setIsDirty(true);
    },
    []
  );

  const setListingType = useCallback((type: ListingType) => {
    setForm((prev) => ({
      ...prev,
      listingType:     type,
      price:           '',
      pricePerUnit:    '',
      tokenAmount:     '',
      expectedCompletionDate: '',
      installmentPlan: defaultInstallmentPlan,
      rentalDetails:   defaultRentalDetails,
    }));
    setIsDirty(true);
  }, []);

  // ── Tab navigation ───────────────────────────────────────────

  const setActiveTab = useCallback((tab: TabId) => {
    setTouchedTabs((prev) => new Set(prev).add(activeTab));
    const errors = validateTab(activeTab, form);
    setTabErrors((prev) => ({ ...prev, [activeTab]: errors }));
    setActiveTabState(tab);
  }, [activeTab, form]);

  const validateCurrentTab = useCallback((): boolean => {
    const errors = validateTab(activeTab, form);
    setTabErrors((prev) => ({ ...prev, [activeTab]: errors }));
    setTouchedTabs((prev) => new Set(prev).add(activeTab));
    return Object.keys(errors).length === 0;
  }, [activeTab, form]);

  const validateAllTabs = useCallback((): boolean => {
    const allErrors: AllTabErrors = {};
    let valid = true;
    for (const tab of TABS) {
      const errors = validateTab(tab.id, form);
      allErrors[tab.id] = errors;
      if (Object.keys(errors).length > 0) valid = false;
    }
    setTabErrors(allErrors);
    setTouchedTabs(new Set(TABS.map((t) => t.id)));
    return valid;
  }, [form]);

  const goToNextTab = useCallback(() => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
  }, [activeTab, setActiveTab]);

  const goToPrevTab = useCallback(() => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (idx > 0) setActiveTab(TABS[idx - 1].id);
  }, [activeTab, setActiveTab]);

  // ── Draft persistence ────────────────────────────────────────

  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (mode === 'edit') {
      setLastSaved(new Date());
      setIsDirty(false);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      setLastSaved(new Date());
      setIsDirty(false);
    } catch {
      // sessionStorage full — ignore
    }
  }, [form, mode]);

  const clearDraft = useCallback(() => {
    if (mode === 'edit') {
      setTabErrors({});
      setTouchedTabs(new Set());
      setIsDirty(false);
      setLastSaved(null);
      return;
    }
    if (typeof window === 'undefined') return;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setForm(DEFAULT_FORM_STATE);
    setTabErrors({});
    setTouchedTabs(new Set());
    setIsDirty(false);
    setLastSaved(null);
  }, [mode]);

  // Auto-save every 30s
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (isDirty) saveDraft();
    }, 30_000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [isDirty, saveDraft]);

  // ── Submit ───────────────────────────────────────────────────

  const submitForm = useCallback(async () => {
    if (!validateAllTabs()) return;
    if (!session) {
      setSubmitError('You must be logged in to submit a property.');
      return;
    }
    if (mode === 'edit' && !options.propertyId) {
      setSubmitError('Property ID is missing for edit mode.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = buildPropertySubmitPayload(form);
      let propertyId = options.propertyId ?? '';
      let slug = '';
      let verificationStatus = options.currentVerificationStatus ?? 'draft';

      if (mode === 'edit') {
        const updateRes = await fetch(`/api/properties/${propertyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const updateData = await updateRes.json() as {
          success?: boolean;
          message?: string;
          error?: string;
          property?: { slug?: string; verificationStatus?: string };
        };
        if (!updateRes.ok || !updateData.success) {
          setSubmitError(updateData.message ?? updateData.error ?? 'Property update failed.');
          return;
        }
        slug = updateData.property?.slug ?? '';
        verificationStatus = updateData.property?.verificationStatus ?? verificationStatus;
      } else {
        const createRes = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const createData = await createRes.json() as {
          success?: boolean;
          message?: string;
          error?: string;
          property?: { _id?: string; slug?: string; verificationStatus?: string };
        };
        if (!createRes.ok || !createData.success || !createData.property?._id) {
          setSubmitError(createData.message ?? createData.error ?? 'Property creation failed.');
          return;
        }
        propertyId = createData.property._id;
        slug = createData.property.slug ?? '';
        verificationStatus = createData.property.verificationStatus ?? 'draft';
      }

      // Private ownership evidence is associated only after the Property exists.
      // The short-lived preview URL never enters the normal Property mutation payload.
      if (form.ownershipProofPublicId && form.ownershipProofAssetToken) {
        const proofRes = await fetch('/api/properties/upload-ownership-proof', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            docType: 'title_deed',
            publicId: form.ownershipProofPublicId,
            assetToken: form.ownershipProofAssetToken,
            resourceType: form.ownershipProofResourceType || 'image',
            mimeType: form.ownershipProofMimeType || 'application/octet-stream',
          }),
        });
        const proofData = await proofRes.json() as {
          success?: boolean;
          message?: string;
          property?: { verificationStatus?: string };
        };
        if (!proofRes.ok || !proofData.success) {
          setSubmitError(proofData.message ?? 'Property saved, but ownership evidence could not be secured.');
          return;
        }
        verificationStatus = proofData.property?.verificationStatus ?? verificationStatus;
      }

      // The create/edit mutation writes content; publication review is a separate,
      // explicit lifecycle action. Only draft records are submitted.
      if (verificationStatus === 'draft') {
        const submitRes = await fetch(`/api/properties/${propertyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit' }),
        });
        const submitData = await submitRes.json() as {
          success?: boolean;
          message?: string;
          error?: string;
          property?: { slug?: string; verificationStatus?: string };
        };
        if (!submitRes.ok || !submitData.success) {
          setSubmitError(submitData.message ?? submitData.error ?? 'Property saved as draft, but submission for review failed.');
          return;
        }
        slug = submitData.property?.slug ?? slug;
        verificationStatus = submitData.property?.verificationStatus ?? 'pending';
      }

      setSubmittedSlug(slug);
      setSubmittedStatus(verificationStatus);
      setSubmitSuccess(true);
      clearDraft();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, session, validateAllTabs, clearDraft, mode, options.propertyId, options.currentVerificationStatus]);

  const getTabIndex = useCallback(
    (tab: TabId): number => TABS.findIndex((t) => t.id === tab),
    []
  );

  return {
    form, activeTab, tabErrors, tabStatuses: tabStatuses(),
    touchedTabs, isSubmitting, submitError, submitSuccess,
    submittedSlug, submittedStatus, isDirty, lastSaved, fieldConfig,
    setField, setResidentialField, setPlotField,
    setCommercialField, setAgriculturalField,
    setConstructionField, setParkingField,
    setInstallmentField, setRentalField,
    setListingType, setActiveTab, validateCurrentTab,
    validateAllTabs, goToNextTab, goToPrevTab,
    saveDraft, clearDraft, submitForm,
    formatPKR, formatPKRNumeric, getTabIndex, completedTabCount,
  };
}