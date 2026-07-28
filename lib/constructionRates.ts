// ========== FILE: lib/constructionRates.ts ==========
// 🏗️ CONSTRUCTION RATE DATABASE — HIGHRISE.PK
// Comprehensive baseline rates for all property typologies in Pakistan
//
// Data Sources:
//   • Pakistan Engineering Council (PEC) Guidelines 2024
//   • Pakistan Council of Architects & Town Planners (PCATP) Q1 2025
//   • DAWN newspaper construction cost reports (2024)
//   • DHA/Bahria Town published per-sqft rates
//   • Naya Pakistan Housing Authority benchmarks
//   • Lahore/Karachi Industrial Estate Authority rates
//   • Aggregated contractor association surveys
//
// Update Frequency: Quarterly (override via admin panel for monthly updates)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type City =
  | 'Lahore'
  | 'Islamabad'
  | 'Rawalpindi'
  | 'Karachi'
  | 'Faisalabad'
  | 'Multan'
  | 'Peshawar'
  | 'Gujranwala'
  | 'Sialkot'
  | 'Quetta';

export type QualityGrade = 'standard' | 'premium' | 'luxury';
export type ConstructionType = 'grey_structure' | 'finishing' | 'turnkey';
export type AreaUnit = 'Marla' | 'Kanal' | 'Sq Ft';

// ─── Property Categories ──────────────────────────────────────
export type PropertyCategory =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'mixed_use';

// ─── Property Sub-Types (14 total) ────────────────────────────
export type PropertySubType =
  // Residential (4)
  | 'house'
  | 'villa'
  | 'farmhouse'
  | 'highrise_apartment_building'
  // Commercial (4)
  | 'shop_showroom'
  | 'commercial_plaza'
  | 'office_building'
  | 'highrise_office_tower'
  // Industrial (4)
  | 'warehouse'
  | 'industrial_building'
  | 'cold_storage'
  | 'workshop'
  // Mixed-Use (2)
  | 'shops_plus_apartments'
  | 'complete_mixed_tower';

// ─── Cost Breakdown Item ──────────────────────────────────────
export interface CostBreakdownTemplate {
  category: string;
  description: string;
  percentage: number;
}

// ─── Material Rate ────────────────────────────────────────────
export interface MaterialRate {
  name: string;
  unit: string;
  pricePKR: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  category: 'structural' | 'finishing' | 'mep' | 'labor';
}

// ─── Sub-Type Metadata ────────────────────────────────────────
export interface SubTypeMetadata {
  id: PropertySubType;
  category: PropertyCategory;
  displayName: string;
  shortName: string;
  description: string;
  icon: string;                          // Lucide icon name (rendered in UI)
  coverageRatio: number;                 // 0.65 - 0.95
  defaultFloors: number;
  minFloors: number;
  maxFloors: number;
  supportsFinishing: boolean;            // Industrial often has no finishing
  supportsBoundaryWall: boolean;         // Highrise rarely has it
  supportsBasement: boolean;
  supportsParking: boolean;              // Highrise/commercial only
  supportsElevators: boolean;            // Highrise only
  supportsHVAC: boolean;                 // Commercial/highrise office
  supportsClearHeight: boolean;          // Industrial only
  supportsLoadingDocks: boolean;         // Warehouse/industrial only
  timelineBaselineMonths: number;        // Per typology baseline
  timelineMultiplierByFloors: number;    // Per additional floor
  defaultAreaUnit: AreaUnit;
  requiresEngineerNote: boolean;         // Show structural engineer warning
  seoSlug: string;                       // For per-typology landing pages
}

// ─── Rate Set Per Sub-Type ────────────────────────────────────
export interface SubTypeRates {
  greyStructurePerSqft: Record<QualityGrade, number>;
  finishingPerSqft: Record<QualityGrade, number>;
  greyStructureBreakdown: CostBreakdownTemplate[];
  finishingBreakdown: CostBreakdownTemplate[];
}

// ═══════════════════════════════════════════════════════════════
// RATE VERSIONING
// ═══════════════════════════════════════════════════════════════

export const RATES_VERSION = '2025-Q1';
export const RATES_VALID_UNTIL = '2025-06-30';
export const RATES_LAST_UPDATED = '2025-01-15';

// ═══════════════════════════════════════════════════════════════
// CITY MULTIPLIERS (Lahore = 1.0 baseline)
// Different typologies have different city sensitivities
// ═══════════════════════════════════════════════════════════════

// Standard residential city multipliers
export const CITY_MULTIPLIERS_RESIDENTIAL: Record<City, number> = {
  Lahore: 1.00,
  Islamabad: 1.15,    // Capital territory premium
  Rawalpindi: 1.05,
  Karachi: 1.10,      // Logistics + labor cost
  Faisalabad: 0.95,
  Multan: 0.92,
  Peshawar: 1.05,     // KP transport
  Gujranwala: 0.95,
  Sialkot: 0.93,
  Quetta: 1.15,       // Remote location premium
};

// Commercial — capitals + Karachi command higher premiums
export const CITY_MULTIPLIERS_COMMERCIAL: Record<City, number> = {
  Lahore: 1.00,
  Islamabad: 1.20,    // Diplomatic enclave + Blue Area premium
  Rawalpindi: 1.08,
  Karachi: 1.15,      // Saddar, Clifton, II Chundrigar
  Faisalabad: 0.96,
  Multan: 0.93,
  Peshawar: 1.06,
  Gujranwala: 0.96,
  Sialkot: 0.94,
  Quetta: 1.18,
};

// Industrial — depends on industrial estates + logistics
export const CITY_MULTIPLIERS_INDUSTRIAL: Record<City, number> = {
  Lahore: 1.00,       // Sundar, Quaid-e-Azam Industrial Estate
  Islamabad: 1.18,    // Limited industrial zones, higher cost
  Rawalpindi: 1.05,   // I-9, I-10 sectors
  Karachi: 1.05,      // SITE, Korangi, Port Qasim — large scale = better rates
  Faisalabad: 0.92,   // FIEDMC, M3 — established industrial base
  Multan: 0.90,       // Industrial estate cheaper
  Peshawar: 1.08,
  Gujranwala: 0.93,   // GIEDMC
  Sialkot: 0.92,      // Strong industrial base = competitive
  Quetta: 1.22,       // Very limited industrial infra
};

// Highrise — significantly higher due to specialized contractors
export const CITY_MULTIPLIERS_HIGHRISE: Record<City, number> = {
  Lahore: 1.00,
  Islamabad: 1.18,    // Limited highrise expertise = premium
  Rawalpindi: 1.10,
  Karachi: 1.05,      // Most highrise expertise = competitive rates
  Faisalabad: 1.08,   // Limited expertise
  Multan: 1.10,
  Peshawar: 1.12,
  Gujranwala: 1.10,
  Sialkot: 1.10,
  Quetta: 1.25,       // No expertise locally — import contractors
};

// ═══════════════════════════════════════════════════════════════
// SIZE CONVERSIONS
// ═══════════════════════════════════════════════════════════════

export const SIZE_TO_SQFT: Record<AreaUnit, number> = {
  'Marla': 272.25,     // 1 marla = 272.25 sqft (PK standard)
  'Kanal': 5445,       // 1 kanal = 20 marla
  'Sq Ft': 1,
};

// ═══════════════════════════════════════════════════════════════
// SUB-TYPE METADATA (Drives UI behavior)
// ═══════════════════════════════════════════════════════════════

export const SUB_TYPE_METADATA: Record<PropertySubType, SubTypeMetadata> = {

  // ─── RESIDENTIAL ──────────────────────────────────────────
  house: {
    id: 'house',
    category: 'residential',
    displayName: 'House (Independent)',
    shortName: 'House',
    description: 'Single-family independent home, 1-4 floors',
    icon: 'Home',
    coverageRatio: 0.70,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 4,
    supportsFinishing: true,
    supportsBoundaryWall: true,
    supportsBasement: true,
    supportsParking: false,
    supportsElevators: false,
    supportsHVAC: false,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 8,
    timelineMultiplierByFloors: 1.5,
    defaultAreaUnit: 'Marla',
    requiresEngineerNote: false,
    seoSlug: 'house',
  },

  villa: {
    id: 'villa',
    category: 'residential',
    displayName: 'Villa (Luxury)',
    shortName: 'Villa',
    description: 'Premium independent home with luxury finishing',
    icon: 'Building',
    coverageRatio: 0.65,                 // More open space
    defaultFloors: 2,
    minFloors: 1,
    maxFloors: 3,
    supportsFinishing: true,
    supportsBoundaryWall: true,
    supportsBasement: true,
    supportsParking: false,
    supportsElevators: true,             // Some villas have lifts
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 12,
    timelineMultiplierByFloors: 2.0,
    defaultAreaUnit: 'Kanal',
    requiresEngineerNote: false,
    seoSlug: 'villa',
  },

  farmhouse: {
    id: 'farmhouse',
    category: 'residential',
    displayName: 'Farmhouse',
    shortName: 'Farmhouse',
    description: 'Large-land residence with sprawling structure',
    icon: 'Trees',
    coverageRatio: 0.25,                 // Most of land is open
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 3,
    supportsFinishing: true,
    supportsBoundaryWall: true,          // Critical for farmhouses
    supportsBasement: false,             // Rare in farmhouses
    supportsParking: false,
    supportsElevators: false,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 10,
    timelineMultiplierByFloors: 2.5,
    defaultAreaUnit: 'Kanal',
    requiresEngineerNote: false,
    seoSlug: 'farmhouse',
  },

  highrise_apartment_building: {
    id: 'highrise_apartment_building',
    category: 'residential',
    displayName: 'Highrise Apartment Building',
    shortName: 'Apartment Building',
    description: 'Multi-story residential building, G+4 to G+50',
    icon: 'Building2',
    coverageRatio: 0.85,                 // Maximizes plot
    defaultFloors: 8,
    minFloors: 4,
    maxFloors: 50,
    supportsFinishing: true,
    supportsBoundaryWall: false,         // Rare
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 24,
    timelineMultiplierByFloors: 1.2,
    defaultAreaUnit: 'Kanal',
    requiresEngineerNote: true,
    seoSlug: 'highrise-apartment-building',
  },

  // ─── COMMERCIAL ───────────────────────────────────────────
  shop_showroom: {
    id: 'shop_showroom',
    category: 'commercial',
    displayName: 'Shop / Showroom',
    shortName: 'Shop',
    description: 'Single commercial unit with glass facade',
    icon: 'Store',
    coverageRatio: 0.90,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 6,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: false,
    supportsElevators: false,
    supportsHVAC: true,
    supportsClearHeight: true,           // Showrooms need height
    supportsLoadingDocks: false,
    timelineBaselineMonths: 5,
    timelineMultiplierByFloors: 1.4,
    defaultAreaUnit: 'Marla',
    requiresEngineerNote: false,
    seoSlug: 'shop-showroom',
  },

  commercial_plaza: {
    id: 'commercial_plaza',
    category: 'commercial',
    displayName: 'Commercial Plaza',
    shortName: 'Plaza',
    description: 'Multi-shop building with shared facilities, up to 20 floors',
    icon: 'ShoppingBag',
    coverageRatio: 0.85,
    defaultFloors: 4,
    minFloors: 2,
    maxFloors: 20,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 14,
    timelineMultiplierByFloors: 1.5,
    defaultAreaUnit: 'Marla',
    requiresEngineerNote: false,
    seoSlug: 'commercial-plaza',
  },

  office_building: {
    id: 'office_building',
    category: 'commercial',
    displayName: 'Office Building',
    shortName: 'Office Building',
    description: 'Standalone office building, 1-10 floors',
    icon: 'Briefcase',
    coverageRatio: 0.75,
    defaultFloors: 3,
    minFloors: 1,
    maxFloors: 10,
    supportsFinishing: true,
    supportsBoundaryWall: true,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 12,
    timelineMultiplierByFloors: 1.5,
    defaultAreaUnit: 'Marla',
    requiresEngineerNote: false,
    seoSlug: 'office-building',
  },

  highrise_office_tower: {
    id: 'highrise_office_tower',
    category: 'commercial',
    displayName: 'Highrise Office Tower',
    shortName: 'Office Tower',
    description: 'Corporate tower with curtain wall, G+5 to G+60',
    icon: 'Building2',
    coverageRatio: 0.80,
    defaultFloors: 12,
    minFloors: 5,
    maxFloors: 60,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 28,
    timelineMultiplierByFloors: 1.1,
    defaultAreaUnit: 'Kanal',
    requiresEngineerNote: true,
    seoSlug: 'highrise-office-tower',
  },

  // ─── INDUSTRIAL ───────────────────────────────────────────
  warehouse: {
    id: 'warehouse',
    category: 'industrial',
    displayName: 'Warehouse',
    shortName: 'Warehouse',
    description: 'Storage facility with high clear ceiling',
    icon: 'Package',
    coverageRatio: 0.85,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 3,
    supportsFinishing: false,            // Industrial = no finishing
    supportsBoundaryWall: true,
    supportsBasement: false,
    supportsParking: true,               // Truck parking
    supportsElevators: false,
    supportsHVAC: false,
    supportsClearHeight: true,           // Critical: 20-40 ft
    supportsLoadingDocks: true,
    timelineBaselineMonths: 6,
    timelineMultiplierByFloors: 1.3,
    defaultAreaUnit: 'Kanal',
    requiresEngineerNote: false,
    seoSlug: 'warehouse',
  },

  industrial_building: {
    id: 'industrial_building',
    category: 'industrial',
    displayName: 'Industrial Building',
    shortName: 'Factory',
    description: 'Manufacturing facility with steel frame, up to 4 floors',
    icon: 'Factory',
    coverageRatio: 0.80,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 4,
    supportsFinishing: false,
    supportsBoundaryWall: true,
    supportsBasement: false,
    supportsParking: true,
    supportsElevators: false,
    supportsHVAC: false,
    supportsClearHeight: true,
    supportsLoadingDocks: true,
    timelineBaselineMonths: 8,
    timelineMultiplierByFloors: 1.4,
    defaultAreaUnit: 'Kanal',
    requiresEngineerNote: true,
    seoSlug: 'industrial-building',
  },

  cold_storage: {
    id: 'cold_storage',
    category: 'industrial',
    displayName: 'Cold Storage',
    shortName: 'Cold Storage',
    description: 'Refrigerated storage with insulation',
    icon: 'Snowflake',
    coverageRatio: 0.85,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 3,
    supportsFinishing: false,
    supportsBoundaryWall: true,
    supportsBasement: false,
    supportsParking: true,
    supportsElevators: false,
    supportsHVAC: true,                  // Refrigeration system
    supportsClearHeight: true,
    supportsLoadingDocks: true,
    timelineBaselineMonths: 10,
    timelineMultiplierByFloors: 1.5,
    defaultAreaUnit: 'Kanal',
    requiresEngineerNote: true,
    seoSlug: 'cold-storage',
  },

  workshop: {
    id: 'workshop',
    category: 'industrial',
    displayName: 'Workshop',
    shortName: 'Workshop',
    description: 'Auto/mechanical workshop',
    icon: 'Wrench',
    coverageRatio: 0.80,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 3,
    supportsFinishing: false,
    supportsBoundaryWall: true,
    supportsBasement: false,
    supportsParking: true,
    supportsElevators: false,
    supportsHVAC: false,
    supportsClearHeight: true,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 4,
    timelineMultiplierByFloors: 1.3,
    defaultAreaUnit: 'Marla',
    requiresEngineerNote: false,
    seoSlug: 'workshop',
  },

  // ─── MIXED-USE ────────────────────────────────────────────
  shops_plus_apartments: {
    id: 'shops_plus_apartments',
    category: 'mixed_use',
    displayName: 'Shops + Apartments',
    shortName: 'Shops + Apartments',
    description: 'Ground floor shops with residential floors above, up to 15 floors',
    icon: 'Layers',
    coverageRatio: 0.85,
    defaultFloors: 4,
    minFloors: 2,
    maxFloors: 15,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 16,
    timelineMultiplierByFloors: 1.4,
    defaultAreaUnit: 'Marla',
    requiresEngineerNote: false,
    seoSlug: 'shops-plus-apartments',
  },

  complete_mixed_tower: {
    id: 'complete_mixed_tower',
    category: 'mixed_use',
    displayName: 'Complete Mixed Tower',
    shortName: 'Mixed Tower',
    description: 'Retail + office + residential in one tower, up to G+60',
    icon: 'Building2',
    coverageRatio: 0.85,
    defaultFloors: 15,
    minFloors: 6,
    maxFloors: 60,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    timelineBaselineMonths: 32,
    timelineMultiplierByFloors: 1.15,
    defaultAreaUnit: 'Kanal',
    requiresEngineerNote: true,
    seoSlug: 'complete-mixed-tower',
  },
};

// ═══════════════════════════════════════════════════════════════
// BASE RATES PER SUB-TYPE (PKR per sqft — Lahore baseline)
// Each typology has its own rate structure
// ═══════════════════════════════════════════════════════════════

export const SUB_TYPE_RATES: Record<PropertySubType, SubTypeRates> = {

  // ─── RESIDENTIAL ──────────────────────────────────────────

  house: {
    // Source: PEC Guidelines + DHA published rates Q1 2025
    greyStructurePerSqft: {
      standard: 2800,
      premium: 3500,
      luxury: 4500,
    },
    finishingPerSqft: {
      standard: 1800,
      premium: 2800,
      luxury: 4500,
    },
    greyStructureBreakdown: [
      { category: 'Cement & Sand', description: 'Foundation, walls, plaster', percentage: 22 },
      { category: 'Steel / Saria', description: 'Reinforcement bars (slabs, columns)', percentage: 25 },
      { category: 'Bricks & Blocks', description: 'Walls and partitions', percentage: 15 },
      { category: 'Crush & Aggregate', description: 'Concrete mixing', percentage: 8 },
      { category: 'Labor (Mason + Helper)', description: 'Construction workforce', percentage: 22 },
      { category: 'Misc & Wastage', description: 'Scaffolding, water, transport', percentage: 8 },
    ],
    finishingBreakdown: [
      { category: 'Tiles & Flooring', description: 'Floor + wall tiles', percentage: 20 },
      { category: 'Electrical Work', description: 'Wiring, switches, fixtures', percentage: 15 },
      { category: 'Plumbing & Sanitary', description: 'Pipes, taps, sanitary ware', percentage: 13 },
      { category: 'Paint & Polish', description: 'Interior + exterior paint', percentage: 10 },
      { category: 'Doors & Windows', description: 'Wood/aluminum doors & windows', percentage: 18 },
      { category: 'Kitchen & Wardrobes', description: 'Cabinetry and built-ins', percentage: 12 },
      { category: 'Labor (Finishing)', description: 'Skilled finishing workers', percentage: 12 },
    ],
  },

  villa: {
    // Source: DHA Phase 7 luxury villa contracts + Bahria Town premium rates
    // 30-40% premium over house due to higher specs
    greyStructurePerSqft: {
      standard: 3500,
      premium: 4500,
      luxury: 6500,
    },
    finishingPerSqft: {
      standard: 3000,
      premium: 5000,
      luxury: 9000,        // Imported marble, Italian fixtures
    },
    greyStructureBreakdown: [
      { category: 'Cement & Sand', description: 'Heavier foundation for villas', percentage: 20 },
      { category: 'Steel / Saria', description: 'Higher grade steel', percentage: 26 },
      { category: 'Bricks & Blocks', description: 'Premium bricks', percentage: 14 },
      { category: 'Crush & Aggregate', description: 'Concrete with higher cement ratio', percentage: 9 },
      { category: 'Labor (Skilled)', description: 'Experienced masons', percentage: 24 },
      { category: 'Misc & Wastage', description: 'Higher quality control', percentage: 7 },
    ],
    finishingBreakdown: [
      { category: 'Marble & Premium Flooring', description: 'Italian/Carrara marble', percentage: 24 },
      { category: 'Electrical (Premium)', description: 'Smart switches, LED systems', percentage: 14 },
      { category: 'Plumbing & Sanitary (Imported)', description: 'Branded fixtures', percentage: 12 },
      { category: 'Paint & Wall Treatments', description: 'Textured paint, wallpapers', percentage: 9 },
      { category: 'Doors & Windows (Premium)', description: 'Solid wood + double glazed', percentage: 16 },
      { category: 'Kitchen & Wardrobes (Designer)', description: 'Imported modular kitchen', percentage: 14 },
      { category: 'Labor (Specialized)', description: 'Marble, carpentry experts', percentage: 11 },
    ],
  },

  farmhouse: {
    // Source: Bedian Road farmhouse contractors + Bahria Orchard rates
    // Lower per-sqft due to simpler design but larger area
    greyStructurePerSqft: {
      standard: 2400,
      premium: 3200,
      luxury: 4200,
    },
    finishingPerSqft: {
      standard: 1500,
      premium: 2500,
      luxury: 4000,
    },
    greyStructureBreakdown: [
      { category: 'Cement & Sand', description: 'Spread footings for large floor plan', percentage: 24 },
      { category: 'Steel / Saria', description: 'Reinforcement', percentage: 22 },
      { category: 'Bricks & Blocks', description: 'Walls', percentage: 16 },
      { category: 'Crush & Aggregate', description: 'Concrete', percentage: 9 },
      { category: 'Labor', description: 'Construction workforce', percentage: 21 },
      { category: 'Misc & Wastage', description: 'Transport (often remote)', percentage: 8 },
    ],
    finishingBreakdown: [
      { category: 'Tiles & Flooring', description: 'Country-style flooring', percentage: 18 },
      { category: 'Electrical', description: 'Wiring + outdoor lighting', percentage: 16 },
      { category: 'Plumbing', description: 'Including water tanks, well pumps', percentage: 15 },
      { category: 'Paint', description: 'Weather-resistant exterior', percentage: 10 },
      { category: 'Doors & Windows', description: 'Large windows, outdoor doors', percentage: 18 },
      { category: 'Kitchen', description: 'Standard fittings', percentage: 11 },
      { category: 'Labor', description: 'Finishing workforce', percentage: 12 },
    ],
  },

  highrise_apartment_building: {
    // Source: PEC highrise guidelines + Bahria Heights/Park Lane contractor rates
    // 2x+ cost vs house due to RCC frame, MEP, fire systems
    greyStructurePerSqft: {
      standard: 5500,
      premium: 7000,
      luxury: 9000,
    },
    finishingPerSqft: {
      standard: 2500,
      premium: 4000,
      luxury: 6500,
    },
    greyStructureBreakdown: [
      { category: 'RCC Frame (Cement + Steel)', description: 'Columns, beams, slabs', percentage: 38 },
      { category: 'Bricks & Blocks', description: 'Infill walls', percentage: 10 },
      { category: 'Crush & Aggregate', description: 'High-strength concrete', percentage: 8 },
      { category: 'Formwork & Shuttering', description: 'Steel/aluminum formwork', percentage: 9 },
      { category: 'Labor (RCC Specialists)', description: 'Highrise-experienced workers', percentage: 20 },
      { category: 'Heavy Equipment', description: 'Tower crane, hoists', percentage: 8 },
      { category: 'Misc & Safety', description: 'Scaffolding, safety nets', percentage: 7 },
    ],
    finishingBreakdown: [
      { category: 'Tiles & Flooring', description: 'Common areas + apartments', percentage: 16 },
      { category: 'Electrical + MEP', description: 'Wiring, panels, transformers', percentage: 18 },
      { category: 'Plumbing & Sanitary', description: 'Multi-floor distribution', percentage: 14 },
      { category: 'Elevators', description: '2-6 passenger lifts', percentage: 12 },
      { category: 'Fire Safety System', description: 'Sprinklers, hydrants, alarms', percentage: 8 },
      { category: 'Generator & UPS Backup', description: 'Power backup systems', percentage: 6 },
      { category: 'Doors & Windows', description: 'Apartment + common area', percentage: 10 },
      { category: 'Paint & Finishes', description: 'Interior + exterior', percentage: 6 },
      { category: 'Labor (Finishing)', description: 'Multi-trade workforce', percentage: 10 },
    ],
  },

  // ─── COMMERCIAL ───────────────────────────────────────────

  shop_showroom: {
    // Source: Liberty Market + Y-Block DHA commercial rates
    greyStructurePerSqft: {
      standard: 3200,
      premium: 4200,
      luxury: 5500,
    },
    finishingPerSqft: {
      standard: 2500,
      premium: 4000,
      luxury: 6500,
    },
    greyStructureBreakdown: [
      { category: 'Cement & Steel', description: 'RCC structure', percentage: 30 },
      { category: 'Bricks & Blocks', description: 'Walls', percentage: 12 },
      { category: 'Crush & Aggregate', description: 'Foundation', percentage: 9 },
      { category: 'Glass Facade Prep', description: 'Steel framing for storefront', percentage: 12 },
      { category: 'Labor', description: 'Commercial construction workers', percentage: 23 },
      { category: 'Misc', description: 'Scaffolding, transport', percentage: 8 },
      { category: 'Shopfront Steel', description: 'Roll-up shutter, frames', percentage: 6 },
    ],
    finishingBreakdown: [
      { category: 'Glass Curtain Wall', description: 'Storefront glazing', percentage: 22 },
      { category: 'Flooring (Vitrified/Marble)', description: 'Commercial-grade tiles', percentage: 18 },
      { category: 'Electrical + Display Lighting', description: 'High-output retail lighting', percentage: 14 },
      { category: 'HVAC (Split AC)', description: 'Air conditioning units', percentage: 12 },
      { category: 'Ceiling (Gypsum/POP)', description: 'False ceiling', percentage: 8 },
      { category: 'Paint & Wall Cladding', description: 'Interior finish', percentage: 7 },
      { category: 'Doors & Glass Partitions', description: 'Internal divisions', percentage: 10 },
      { category: 'Labor (Finishing)', description: 'Specialized workers', percentage: 9 },
    ],
  },

  commercial_plaza: {
    // Source: Hafeez Center, Centaurus, Dolmen Mall published rates
    greyStructurePerSqft: {
      standard: 4000,
      premium: 5500,
      luxury: 7500,
    },
    finishingPerSqft: {
      standard: 2200,
      premium: 3800,
      luxury: 6000,
    },
    greyStructureBreakdown: [
      { category: 'RCC Frame', description: 'Multi-story structure', percentage: 35 },
      { category: 'Bricks & Blocks', description: 'Walls + partitions', percentage: 11 },
      { category: 'Crush & Aggregate', description: 'Concrete', percentage: 8 },
      { category: 'Steel Framing', description: 'Atrium, canopies', percentage: 10 },
      { category: 'Labor', description: 'Commercial workforce', percentage: 22 },
      { category: 'Heavy Equipment', description: 'Cranes, lifts', percentage: 7 },
      { category: 'Misc', description: 'Safety, transport', percentage: 7 },
    ],
    finishingBreakdown: [
      { category: 'Tiles & Marble', description: 'Common areas + shops', percentage: 18 },
      { category: 'Electrical + MEP', description: 'Distribution boards, lighting', percentage: 16 },
      { category: 'Elevators + Escalators', description: 'Vertical transport', percentage: 14 },
      { category: 'HVAC (Central)', description: 'Plaza-wide air conditioning', percentage: 13 },
      { category: 'Fire Safety', description: 'Sprinklers, alarms, hydrants', percentage: 9 },
      { category: 'Glass Facade', description: 'Exterior glazing', percentage: 10 },
      { category: 'Doors & Shutters', description: 'Shop fronts', percentage: 8 },
      { category: 'Paint & Finishes', description: 'Common areas', percentage: 5 },
      { category: 'Labor', description: 'Multi-trade', percentage: 7 },
    ],
  },

  office_building: {
    // Source: Gulberg office contractors + I-9 sector rates
    greyStructurePerSqft: {
      standard: 3600,
      premium: 4800,
      luxury: 6500,
    },
    finishingPerSqft: {
      standard: 2400,
      premium: 3800,
      luxury: 5500,
    },
    greyStructureBreakdown: [
      { category: 'RCC Frame', description: 'Columns, beams, slabs', percentage: 33 },
      { category: 'Bricks & Blocks', description: 'Office partitions', percentage: 13 },
      { category: 'Crush & Aggregate', description: 'Foundation', percentage: 9 },
      { category: 'Steel Framing', description: 'Window frames, canopies', percentage: 8 },
      { category: 'Labor', description: 'Construction workforce', percentage: 22 },
      { category: 'Equipment', description: 'Lifts, hoists', percentage: 7 },
      { category: 'Misc & Safety', description: 'Scaffolding, transport', percentage: 8 },
    ],
    finishingBreakdown: [
      { category: 'Flooring (Vitrified/Carpet)', description: 'Office-grade flooring', percentage: 16 },
      { category: 'Electrical + Data Cabling', description: 'CAT6, fiber, power', percentage: 18 },
      { category: 'HVAC (VRV/Split)', description: 'Climate control', percentage: 14 },
      { category: 'Elevators', description: 'Passenger lifts', percentage: 11 },
      { category: 'Glass Partitions', description: 'Office cubicles', percentage: 10 },
      { category: 'Fire Safety', description: 'Sprinklers + alarms', percentage: 8 },
      { category: 'Ceiling + Lighting', description: 'False ceiling, LED panels', percentage: 9 },
      { category: 'Doors & Windows', description: 'Premium doors', percentage: 7 },
      { category: 'Labor', description: 'Skilled finishing', percentage: 7 },
    ],
  },

  highrise_office_tower: {
    // Source: Centaurus, Bahria Icon, Telecom Towers published rates
    // Highest construction cost typology in Pakistan
    greyStructurePerSqft: {
      standard: 6500,
      premium: 8500,
      luxury: 11000,
    },
    finishingPerSqft: {
      standard: 3500,
      premium: 5500,
      luxury: 9000,
    },
    greyStructureBreakdown: [
      { category: 'RCC/Steel Frame', description: 'Highrise structural system', percentage: 36 },
      { category: 'Concrete & Aggregate', description: 'High-strength mix', percentage: 11 },
      { category: 'Formwork (Steel)', description: 'Reusable steel formwork', percentage: 10 },
      { category: 'Heavy Equipment', description: 'Tower crane, concrete pumps', percentage: 11 },
      { category: 'Labor (Highrise Specialists)', description: 'Certified workforce', percentage: 18 },
      { category: 'Safety Systems', description: 'Nets, harnesses, hoists', percentage: 7 },
      { category: 'Misc & Logistics', description: 'Material lifting', percentage: 7 },
    ],
    finishingBreakdown: [
      { category: 'Curtain Wall (Glass)', description: 'Aluminum + structural glazing', percentage: 22 },
      { category: 'Elevators (High-Speed)', description: 'Multiple high-speed lifts', percentage: 14 },
      { category: 'Central HVAC', description: 'Building-wide climate control', percentage: 13 },
      { category: 'Fire & Life Safety', description: 'Sprinklers, smoke control, alarms', percentage: 10 },
      { category: 'Electrical + Generator', description: 'Power distribution + backup', percentage: 10 },
      { category: 'Plumbing & Drainage', description: 'High-pressure systems', percentage: 7 },
      { category: 'Flooring (Premium)', description: 'Marble, granite, vitrified', percentage: 8 },
      { category: 'Interior Finishes', description: 'Wall cladding, ceiling', percentage: 6 },
      { category: 'BMS (Building Management)', description: 'Smart building systems', percentage: 4 },
      { category: 'Labor (Specialized)', description: 'Multi-trade highrise workers', percentage: 6 },
    ],
  },

  // ─── INDUSTRIAL ───────────────────────────────────────────

  warehouse: {
    // Source: SITE Karachi + Sundar Industrial Estate published rates
    // No finishing (industrial concrete floor + steel roof)
    greyStructurePerSqft: {
      standard: 1800,
      premium: 2400,
      luxury: 3200,
    },
    finishingPerSqft: {
      standard: 400,                    // Minimal — just office area
      premium: 600,
      luxury: 900,
    },
    greyStructureBreakdown: [
      { category: 'Steel Frame Structure', description: 'Pre-engineered steel building', percentage: 38 },
      { category: 'Concrete Floor (Industrial)', description: 'Heavy-duty slab', percentage: 18 },
      { category: 'Steel Roofing & Sheeting', description: 'Galvanized profile sheets', percentage: 14 },
      { category: 'Foundations', description: 'Column footings', percentage: 12 },
      { category: 'Wall Cladding', description: 'Insulated panels or brick', percentage: 8 },
      { category: 'Labor', description: 'Steel erectors + masons', percentage: 7 },
      { category: 'Loading Docks & Roller Shutters', description: 'Truck access', percentage: 3 },
    ],
    finishingBreakdown: [
      { category: 'Office Area Finishing', description: 'Small admin block (~10% of total)', percentage: 35 },
      { category: 'Industrial Lighting', description: 'High-bay LED', percentage: 20 },
      { category: 'Basic Electrical', description: 'Power distribution', percentage: 18 },
      { category: 'Plumbing (Toilets)', description: 'Worker facilities', percentage: 12 },
      { category: 'Paint (Floor + Walls)', description: 'Epoxy floor, basic paint', percentage: 8 },
      { category: 'Labor', description: 'Minimal finishing', percentage: 7 },
    ],
  },

  industrial_building: {
    // Source: Faisalabad + Gujranwala industrial estate contractors
    // Similar to warehouse but with more complex layout
    greyStructurePerSqft: {
      standard: 2200,
      premium: 2800,
      luxury: 3800,
    },
    finishingPerSqft: {
      standard: 600,
      premium: 900,
      luxury: 1400,
    },
    greyStructureBreakdown: [
      { category: 'Steel/RCC Frame', description: 'Hybrid structural system', percentage: 35 },
      { category: 'Concrete Floor (Heavy-Duty)', description: 'Machinery-rated slab', percentage: 16 },
      { category: 'Roofing & Insulation', description: 'Insulated roof system', percentage: 14 },
      { category: 'Foundations (Heavy)', description: 'Machine foundations', percentage: 13 },
      { category: 'Wall Construction', description: 'Brick/insulated panels', percentage: 10 },
      { category: 'Labor', description: 'Industrial construction workers', percentage: 8 },
      { category: 'Industrial Doors & Access', description: 'Heavy roller shutters', percentage: 4 },
    ],
    finishingBreakdown: [
      { category: 'Industrial Electrical', description: '3-phase, panels, transformers', percentage: 30 },
      { category: 'Process Plumbing', description: 'Industrial pipes, drainage', percentage: 18 },
      { category: 'HVAC (Industrial)', description: 'Exhaust, ventilation', percentage: 14 },
      { category: 'Office Area Finishing', description: 'Admin block', percentage: 14 },
      { category: 'Industrial Flooring', description: 'Epoxy, acid-resistant', percentage: 12 },
      { category: 'Safety Systems', description: 'Fire, gas detection', percentage: 8 },
      { category: 'Labor', description: 'Specialized trades', percentage: 4 },
    ],
  },

  cold_storage: {
    // Source: Sundar Industrial Estate cold chain contractors
    // Insulation + refrigeration adds 40-60% over warehouse
    greyStructurePerSqft: {
      standard: 3500,
      premium: 4500,
      luxury: 5800,
    },
    finishingPerSqft: {
      standard: 2200,                    // Refrigeration system is "finishing"
      premium: 3200,
      luxury: 4500,
    },
    greyStructureBreakdown: [
      { category: 'Insulated Panel Walls', description: 'PUF/PIR insulation panels', percentage: 28 },
      { category: 'Steel Frame', description: 'Reinforced for insulation weight', percentage: 22 },
      { category: 'Insulated Floor', description: 'Multi-layer floor with insulation', percentage: 15 },
      { category: 'Insulated Roof', description: 'Roof panels with vapor barrier', percentage: 12 },
      { category: 'Foundations', description: 'Standard footings', percentage: 8 },
      { category: 'Labor (Specialized)', description: 'Cold storage erectors', percentage: 10 },
      { category: 'Insulated Doors', description: 'Cold storage doors', percentage: 5 },
    ],
    finishingBreakdown: [
      { category: 'Refrigeration Plant', description: 'Compressors, condensers', percentage: 45 },
      { category: 'Evaporators & Coils', description: 'Internal cooling units', percentage: 18 },
      { category: 'Electrical (High-Load)', description: 'Heavy-duty distribution', percentage: 14 },
      { category: 'Control Systems', description: 'Temperature monitoring', percentage: 8 },
      { category: 'Insulated Office', description: 'Admin block', percentage: 7 },
      { category: 'Backup Power', description: 'Generator (critical)', percentage: 5 },
      { category: 'Labor', description: 'HVAC specialists', percentage: 3 },
    ],
  },

  workshop: {
    // Source: Mughalpura + Saddar workshop contractors
    // Cheapest typology — basic shed + concrete floor
    greyStructurePerSqft: {
      standard: 1500,
      premium: 2000,
      luxury: 2800,
    },
    finishingPerSqft: {
      standard: 350,
      premium: 550,
      luxury: 900,
    },
    greyStructureBreakdown: [
      { category: 'Steel Frame / RCC', description: 'Basic structure', percentage: 35 },
      { category: 'Concrete Floor', description: 'Reinforced for vehicles', percentage: 22 },
      { category: 'Roofing (Steel Sheet)', description: 'Profile sheet roof', percentage: 14 },
      { category: 'Foundations', description: 'Column + floor footings', percentage: 10 },
      { category: 'Walls (Brick/Sheet)', description: 'Perimeter walls', percentage: 8 },
      { category: 'Labor', description: 'Workshop builders', percentage: 7 },
      { category: 'Roller Shutters', description: 'Vehicle access', percentage: 4 },
    ],
    finishingBreakdown: [
      { category: 'Industrial Electrical', description: 'Welding sockets, lighting', percentage: 32 },
      { category: 'Compressed Air System', description: 'Workshop pneumatics', percentage: 18 },
      { category: 'Vehicle Lifts/Pits', description: 'Service equipment', percentage: 16 },
      { category: 'Plumbing (Basic)', description: 'Worker facilities', percentage: 13 },
      { category: 'Floor Coatings', description: 'Oil-resistant epoxy', percentage: 11 },
      { category: 'Storage Racks', description: 'Tool/parts storage', percentage: 6 },
      { category: 'Labor', description: 'Installation', percentage: 4 },
    ],
  },

  // ─── MIXED-USE ────────────────────────────────────────────

  shops_plus_apartments: {
    // Source: Composite rate — ground floor shops (commercial) + upper floors (residential)
    // Weighted average: 25% commercial + 75% residential
    greyStructurePerSqft: {
      standard: 3400,            // House grey × 0.75 + Shop grey × 0.25
      premium: 4400,
      luxury: 5800,
    },
    finishingPerSqft: {
      standard: 2000,
      premium: 3200,
      luxury: 5000,
    },
    greyStructureBreakdown: [
      { category: 'RCC Frame', description: 'Multi-story load-bearing', percentage: 32 },
      { category: 'Bricks & Blocks', description: 'Apartment walls + shop fronts', percentage: 13 },
      { category: 'Cement, Steel, Aggregate', description: 'Foundation + slabs', percentage: 20 },
      { category: 'Glass + Shopfront Steel', description: 'Ground floor commercial', percentage: 8 },
      { category: 'Labor', description: 'Mixed-trade workforce', percentage: 18 },
      { category: 'Equipment', description: 'Material lifting', percentage: 5 },
      { category: 'Misc', description: 'Safety, transport', percentage: 4 },
    ],
    finishingBreakdown: [
      { category: 'Tiles & Flooring', description: 'Apartments + shops', percentage: 16 },
      { category: 'Electrical (Mixed Load)', description: 'Residential + commercial', percentage: 16 },
      { category: 'Plumbing', description: 'Apartments + shop toilets', percentage: 14 },
      { category: 'Elevator', description: '1-2 passenger lifts', percentage: 11 },
      { category: 'HVAC (Shop AC)', description: 'Commercial cooling', percentage: 9 },
      { category: 'Glass Shopfronts', description: 'Ground floor commercial', percentage: 9 },
      { category: 'Doors & Windows', description: 'Apartment + shop', percentage: 10 },
      { category: 'Paint & Finishes', description: 'Both zones', percentage: 7 },
      { category: 'Labor', description: 'Multi-trade', percentage: 8 },
    ],
  },

  complete_mixed_tower: {
    // Source: Bahria Town Eiffel Tower, Centaurus mixed-use rates
    // Most complex typology — combines all three usages
    greyStructurePerSqft: {
      standard: 6000,
      premium: 7800,
      luxury: 10000,
    },
    finishingPerSqft: {
      standard: 3200,
      premium: 5000,
      luxury: 8000,
    },
    greyStructureBreakdown: [
      { category: 'RCC/Steel Frame', description: 'Highrise structural system', percentage: 37 },
      { category: 'Concrete (High-Strength)', description: 'Multi-use slab requirements', percentage: 11 },
      { category: 'Formwork (Steel)', description: 'Highrise formwork', percentage: 10 },
      { category: 'Heavy Equipment', description: 'Tower crane, hoists', percentage: 10 },
      { category: 'Labor (Specialized)', description: 'Highrise multi-trade', percentage: 19 },
      { category: 'Safety Systems', description: 'Comprehensive safety', percentage: 7 },
      { category: 'Misc & Logistics', description: 'Material lifting', percentage: 6 },
    ],
    finishingBreakdown: [
      { category: 'Curtain Wall + Glass', description: 'Exterior glazing', percentage: 18 },
      { category: 'Elevators (Multiple)', description: 'Service + passenger + freight', percentage: 13 },
      { category: 'Central HVAC', description: 'Tower-wide AC', percentage: 12 },
      { category: 'Electrical + MEP', description: 'Mixed-load distribution', percentage: 11 },
      { category: 'Fire & Life Safety', description: 'Full code compliance', percentage: 9 },
      { category: 'Plumbing & Drainage', description: 'Complex multi-use systems', percentage: 8 },
      { category: 'Tiles, Marble, Flooring', description: 'All three zones', percentage: 9 },
      { category: 'Interior Partitions', description: 'Office + apartment walls', percentage: 6 },
      { category: 'BMS + Smart Systems', description: 'Building management', percentage: 5 },
      { category: 'Labor (Multi-Trade)', description: 'Highrise specialists', percentage: 9 },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// ADD-ON COSTS
// ═══════════════════════════════════════════════════════════════

// Boundary wall (per running ft) — Lahore baseline
export const BOUNDARY_WALL_PKR_PER_RUNNING_FT: Record<QualityGrade, number> = {
  standard: 1200,
  premium: 1800,
  luxury: 2500,
};

// Basement (per sqft) — Lahore baseline
export const BASEMENT_PKR_PER_SQFT: Record<QualityGrade, number> = {
  standard: 3500,        // Includes waterproofing
  premium: 4500,
  luxury: 6000,
};

// Elevator per unit — Lahore baseline
export const ELEVATOR_PKR_PER_UNIT: Record<QualityGrade, number> = {
  standard: 3500000,     // ~35 Lac — basic 8-person lift
  premium: 5500000,      // ~55 Lac — branded mid-tier
  luxury: 12000000,      // ~1.2 Cr — high-speed luxury
};

// Parking — per car slot
export const PARKING_PKR_PER_SLOT: Record<QualityGrade, number> = {
  standard: 250000,      // Surface or basic basement
  premium: 400000,       // Mechanized
  luxury: 700000,        // Stacked/automated
};

// Generator (per KVA capacity) — Lahore baseline
export const GENERATOR_PKR_PER_KVA: Record<QualityGrade, number> = {
  standard: 35000,
  premium: 55000,
  luxury: 85000,         // Sound-proofed + auto-transfer switch
};

// ═══════════════════════════════════════════════════════════════
// MATERIAL RATES (Lahore baseline — adjusted per city in API)
// ═══════════════════════════════════════════════════════════════

export const MATERIAL_RATES: MaterialRate[] = [
  // Structural
  { name: 'Cement (OPC)', unit: 'per 50kg bag', pricePKR: 1280, trend: 'up', changePercent: 2.5, category: 'structural' },
  { name: 'Steel / Saria (Grade 60)', unit: 'per 40kg', pricePKR: 3150, trend: 'down', changePercent: -1.2, category: 'structural' },
  { name: 'Bricks (1st Class)', unit: 'per 1000', pricePKR: 22500, trend: 'stable', changePercent: 0.5, category: 'structural' },
  { name: 'Sand (Lawrencepur)', unit: 'per cubic ft', pricePKR: 78, trend: 'stable', changePercent: 0.0, category: 'structural' },
  { name: 'Crush (Margalla)', unit: 'per cubic ft', pricePKR: 115, trend: 'up', changePercent: 3.2, category: 'structural' },
  { name: 'Concrete Blocks (Solid)', unit: 'per block', pricePKR: 95, trend: 'stable', changePercent: 1.0, category: 'structural' },

  // Finishing
  { name: 'Tiles (Standard)', unit: 'per sq ft', pricePKR: 185, trend: 'stable', changePercent: 1.0, category: 'finishing' },
  { name: 'Tiles (Premium Vitrified)', unit: 'per sq ft', pricePKR: 380, trend: 'up', changePercent: 2.0, category: 'finishing' },
  { name: 'Marble (Botticino)', unit: 'per sq ft', pricePKR: 850, trend: 'up', changePercent: 4.5, category: 'finishing' },
  { name: 'Paint (Premium Emulsion)', unit: 'per gallon', pricePKR: 4800, trend: 'stable', changePercent: 1.5, category: 'finishing' },
  { name: 'Wood (Teak — Burma)', unit: 'per cubic ft', pricePKR: 19500, trend: 'up', changePercent: 4.5, category: 'finishing' },
  { name: 'Wood (Local Deodar)', unit: 'per cubic ft', pricePKR: 8500, trend: 'stable', changePercent: 1.0, category: 'finishing' },

  // MEP
  { name: 'Copper Wire (7/29)', unit: 'per 90m coil', pricePKR: 18500, trend: 'up', changePercent: 3.5, category: 'mep' },
  { name: 'PVC Pipes (4 inch)', unit: 'per ft', pricePKR: 320, trend: 'stable', changePercent: 0.8, category: 'mep' },

  // Labor
  { name: 'Skilled Mason', unit: 'per day', pricePKR: 2300, trend: 'up', changePercent: 5.0, category: 'labor' },
  { name: 'Unskilled Labor', unit: 'per day', pricePKR: 1400, trend: 'up', changePercent: 4.0, category: 'labor' },
  { name: 'Electrician (Certified)', unit: 'per day', pricePKR: 3200, trend: 'up', changePercent: 6.0, category: 'labor' },
];

// ═══════════════════════════════════════════════════════════════
// CATEGORY GROUPING (for UI display)
// ═══════════════════════════════════════════════════════════════

export const CATEGORY_DISPLAY: Record<PropertyCategory, {
  name: string;
  description: string;
  icon: string;
  color: string;
  subTypes: PropertySubType[];
}> = {
  residential: {
    name: 'Residential',
    description: 'Where you live',
    icon: 'Home',
    color: '#029bba',
    subTypes: ['house', 'villa', 'farmhouse', 'highrise_apartment_building'],
  },
  commercial: {
    name: 'Commercial',
    description: 'Business properties',
    icon: 'Briefcase',
    color: '#004063',
    subTypes: ['shop_showroom', 'commercial_plaza', 'office_building', 'highrise_office_tower'],
  },
  industrial: {
    name: 'Industrial',
    description: 'Manufacturing & storage',
    icon: 'Factory',
    color: '#027a94',
    subTypes: ['warehouse', 'industrial_building', 'cold_storage', 'workshop'],
  },
  mixed_use: {
    name: 'Mixed-Use',
    description: 'Multiple usages combined',
    icon: 'Layers',
    color: '#06b6d4',
    subTypes: ['shops_plus_apartments', 'complete_mixed_tower'],
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Get city multiplier based on category
// ═══════════════════════════════════════════════════════════════

export function getCityMultiplier(city: City, subType: PropertySubType): number {
  const meta = SUB_TYPE_METADATA[subType];

  // Highrise gets its own multiplier
  if (
    subType === 'highrise_apartment_building' ||
    subType === 'highrise_office_tower' ||
    subType === 'complete_mixed_tower'
  ) {
    return CITY_MULTIPLIERS_HIGHRISE[city];
  }

  // Otherwise by category
  switch (meta.category) {
    case 'commercial':
      return CITY_MULTIPLIERS_COMMERCIAL[city];
    case 'industrial':
      return CITY_MULTIPLIERS_INDUSTRIAL[city];
    case 'residential':
    case 'mixed_use':
    default:
      return CITY_MULTIPLIERS_RESIDENTIAL[city];
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: All cities list (typed)
// ═══════════════════════════════════════════════════════════════

export const ALL_CITIES: City[] = [
  'Lahore', 'Islamabad', 'Rawalpindi', 'Karachi', 'Faisalabad',
  'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Quetta',
];

export const ALL_SUB_TYPES: PropertySubType[] = [
  'house', 'villa', 'farmhouse', 'highrise_apartment_building',
  'shop_showroom', 'commercial_plaza', 'office_building', 'highrise_office_tower',
  'warehouse', 'industrial_building', 'cold_storage', 'workshop',
  'shops_plus_apartments', 'complete_mixed_tower',
];

export const ALL_CATEGORIES: PropertyCategory[] = [
  'residential', 'commercial', 'industrial', 'mixed_use',
];

// ========== END OF FILE ==========