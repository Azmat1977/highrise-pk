// ========== FILE: lib/constructionRates.ts ==========
// 🏗️ CONSTRUCTION RATE DATABASE — HIGHRISE.PK
// Comprehensive baseline rates for all property typologies in Pakistan
//
// Data Sources:
//   • Pakistan Engineering Council (PEC) Guidelines 2024
//   • Pakistan Council of Architects & Town Planners (PCATP) Q1 2025
//   • DAWN newspaper construction cost reports (2024-2025)
//   • DHA/Bahria Town published per-sqft rates
//   • Naya Pakistan Housing Authority benchmarks
//   • Lahore/Karachi Industrial Estate Authority rates
//   • Aggregated contractor association surveys
//   • SBP Inflation data / Cement/Steel price tracking 2026
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
  requiresEngineerNote: boolean;         // Structural-engineer warning regardless of floor count
  timelineMonths: {                      // Typical construction duration
    greyStructure: number;
    finishing: number;
    turnkey: number;
  };
}

// ─── Typology Rate Card (per sqft) ────────────────────────────
export interface TypologyRateCard {
  greyStructurePerSqft: Record<QualityGrade, number>;
  finishingPerSqft: Record<QualityGrade, number>;
  greyStructureBreakdown: CostBreakdownTemplate[];
  finishingBreakdown: CostBreakdownTemplate[];
}

// ─── City Multipliers ──────────────────────────────────────────
export interface CityMultipliers {
  [city: string]: {
    greyStructure: number;   // 0.85 - 1.15
    finishing: number;       // 0.90 - 1.15
    labor: number;           // 0.80 - 1.20
  };
}

// ─── Rate Version (Update these on each release) ──────────────
export const RATES_VERSION = '2026-Q1';
export const RATES_VALID_UNTIL = '2026-06-30';
export const RATES_LAST_UPDATED = '2026-01-15';
export const RATES_SOURCE_NOTE = 'Rates based on Q1 2026 market survey. Includes 15% inflation adjustment from 2025. Cement: PKR 1,280/bag, Steel: PKR 285/kg (Grade 60), Bricks: PKR 18,500/1000, Labor: PKR 1,650/day (skilled).';

// ═══════════════════════════════════════════════════════════════
// MATERIAL RATES — 2026 Q1 Prices
// ═══════════════════════════════════════════════════════════════

export const MATERIAL_RATES_2026: MaterialRate[] = [
  // Structural
  { name: 'Cement (OPC 53 Grade)', unit: '50kg Bag', pricePKR: 1280, trend: 'stable', changePercent: 0, category: 'structural' },
  { name: 'Steel Rebar (Grade 60)', unit: 'kg', pricePKR: 285, trend: 'up', changePercent: 5.6, category: 'structural' },
  { name: 'Steel Rebar (Grade 40)', unit: 'kg', pricePKR: 270, trend: 'up', changePercent: 5.0, category: 'structural' },
  { name: 'Crush Aggregate (Margalla)', unit: 'Cft', pricePKR: 165, trend: 'stable', changePercent: 0, category: 'structural' },
  { name: 'Sand (Ravi/Chenab)', unit: 'Cft', pricePKR: 65, trend: 'stable', changePercent: 0, category: 'structural' },
  { name: 'Bricks (A-Class, 1000 pcs)', unit: '1000 pcs', pricePKR: 18500, trend: 'up', changePercent: 5.7, category: 'structural' },
  { name: 'Concrete Blocks (6")', unit: 'pc', pricePKR: 85, trend: 'stable', changePercent: 0, category: 'structural' },
  { name: 'Concrete Blocks (8")', unit: 'pc', pricePKR: 110, trend: 'stable', changePercent: 0, category: 'structural' },

  // Finishing
  { name: 'Tiles (600x600mm, Local)', unit: 'Sq Ft', pricePKR: 185, trend: 'stable', changePercent: 0, category: 'finishing' },
  { name: 'Tiles (600x600mm, Imported)', unit: 'Sq Ft', pricePKR: 380, trend: 'up', changePercent: 8.6, category: 'finishing' },
  { name: 'Marble (Local, 1" Thick)', unit: 'Sq Ft', pricePKR: 280, trend: 'up', changePercent: 7.7, category: 'finishing' },
  { name: 'Granite (Imported)', unit: 'Sq Ft', pricePKR: 650, trend: 'up', changePercent: 10.0, category: 'finishing' },
  { name: 'Paint (Premium Emulsion)', unit: 'Gallon', pricePKR: 3200, trend: 'stable', changePercent: 0, category: 'finishing' },
  { name: 'Paint (Weather Shield)', unit: 'Gallon', pricePKR: 4200, trend: 'up', changePercent: 5.0, category: 'finishing' },
  { name: 'Wood (Deodar, 1st Quality)', unit: 'Cft', pricePKR: 3800, trend: 'up', changePercent: 12.0, category: 'finishing' },
  { name: 'Wood (Partal/Chir)', unit: 'Cft', pricePKR: 1200, trend: 'stable', changePercent: 0, category: 'finishing' },
  { name: 'Aluminum Windows (Powder Coated)', unit: 'Sq Ft', pricePKR: 1150, trend: 'up', changePercent: 9.5, category: 'finishing' },
  { name: 'UPVC Windows (Double Glazed)', unit: 'Sq Ft', pricePKR: 1650, trend: 'up', changePercent: 11.0, category: 'finishing' },
  { name: 'False Ceiling (Gypsum)', unit: 'Sq Ft', pricePKR: 145, trend: 'stable', changePercent: 0, category: 'finishing' },
  { name: 'False Ceiling (PVC)', unit: 'Sq Ft', pricePKR: 95, trend: 'stable', changePercent: 0, category: 'finishing' },

  // MEP
  { name: 'Electrical Wiring (3/.029, Pakistan Cable)', unit: 'Coil (90m)', pricePKR: 8500, trend: 'up', changePercent: 6.3, category: 'mep' },
  { name: 'Electrical Wiring (7/.029, Pakistan Cable)', unit: 'Coil (90m)', pricePKR: 16500, trend: 'up', changePercent: 6.5, category: 'mep' },
  { name: 'PVC Conduit (1")', unit: 'Length (10ft)', pricePKR: 180, trend: 'stable', changePercent: 0, category: 'mep' },
  { name: 'Switches/Sockets (Premium)', unit: 'pc', pricePKR: 280, trend: 'up', changePercent: 4.0, category: 'mep' },
  { name: 'LED Downlight (Recessed)', unit: 'pc', pricePKR: 450, trend: 'down', changePercent: -5.0, category: 'mep' },
  { name: 'Copper Pipe (1/2")', unit: 'ft', pricePKR: 480, trend: 'up', changePercent: 12.0, category: 'mep' },
  { name: 'PPR Pipe (25mm)', unit: 'ft', pricePKR: 125, trend: 'stable', changePercent: 0, category: 'mep' },
  { name: 'Water Tank (Plastic, 500 Gal)', unit: 'pc', pricePKR: 28000, trend: 'stable', changePercent: 0, category: 'mep' },
  { name: 'Water Pump (1 HP)', unit: 'pc', pricePKR: 18500, trend: 'up', changePercent: 8.0, category: 'mep' },
  { name: 'AC Split Unit (1.5 Ton, Inverter)', unit: 'pc', pricePKR: 125000, trend: 'up', changePercent: 15.0, category: 'mep' },

  // Labor (Daily rates)
  { name: 'Mason (Skilled)', unit: 'Day', pricePKR: 1650, trend: 'up', changePercent: 10.0, category: 'labor' },
  { name: 'Steel Fixer (Skilled)', unit: 'Day', pricePKR: 1800, trend: 'up', changePercent: 9.0, category: 'labor' },
  { name: 'Carpenter (Shuttering)', unit: 'Day', pricePKR: 1600, trend: 'up', changePercent: 8.0, category: 'labor' },
  { name: 'Plumber (Skilled)', unit: 'Day', pricePKR: 1700, trend: 'up', changePercent: 9.5, category: 'labor' },
  { name: 'Electrician (Skilled)', unit: 'Day', pricePKR: 1750, trend: 'up', changePercent: 9.0, category: 'labor' },
  { name: 'Painter (Skilled)', unit: 'Day', pricePKR: 1500, trend: 'up', changePercent: 7.0, category: 'labor' },
  { name: 'Tile Fixer (Skilled)', unit: 'Day', pricePKR: 1650, trend: 'up', changePercent: 8.0, category: 'labor' },
  { name: 'Unskilled Labor (Helper)', unit: 'Day', pricePKR: 950, trend: 'up', changePercent: 5.6, category: 'labor' },
];

// ═══════════════════════════════════════════════════════════════
// CITY MULTIPLIERS (Base = Islamabad/Rawalpindi = 1.0)
// ═══════════════════════════════════════════════════════════════

export const CITY_MULTIPLIERS: CityMultipliers = {
  'Lahore':      { greyStructure: 0.95, finishing: 0.98, labor: 0.92 },
  'Islamabad':   { greyStructure: 1.00, finishing: 1.00, labor: 1.00 },
  'Rawalpindi':  { greyStructure: 0.98, finishing: 0.98, labor: 0.95 },
  'Karachi':     { greyStructure: 1.12, finishing: 1.15, labor: 1.18 },
  'Faisalabad':  { greyStructure: 0.88, finishing: 0.92, labor: 0.85 },
  'Multan':      { greyStructure: 0.86, finishing: 0.90, labor: 0.82 },
  'Peshawar':    { greyStructure: 0.90, finishing: 0.92, labor: 0.85 },
  'Gujranwala':  { greyStructure: 0.87, finishing: 0.91, labor: 0.83 },
  'Sialkot':     { greyStructure: 0.87, finishing: 0.91, labor: 0.83 },
  'Quetta':      { greyStructure: 1.08, finishing: 1.10, labor: 1.15 },
};

// ═══════════════════════════════════════════════════════════════
// SUB-TYPE METADATA
// ═══════════════════════════════════════════════════════════════

export const SUBTYPE_METADATA: Record<PropertySubType, SubTypeMetadata> = {
  // Residential
  house: {
    id: 'house',
    category: 'residential',
    displayName: 'House (5-20 Marla)',
    shortName: 'House',
    description: 'Standard residential house on 5-20 marla plot',
    icon: 'home',
    coverageRatio: 0.70,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 3,
    supportsFinishing: true,
    supportsBoundaryWall: true,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: false,
    supportsHVAC: false,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    requiresEngineerNote: false,
    timelineMonths: { greyStructure: 6, finishing: 4, turnkey: 10 },
  },
  villa: {
    id: 'villa',
    category: 'residential',
    displayName: 'Villa (1-4 Kanal)',
    shortName: 'Villa',
    description: 'Luxury standalone villa on 1-4 kanal plot',
    icon: 'home',
    coverageRatio: 0.60,
    defaultFloors: 2,
    minFloors: 1,
    maxFloors: 3,
    supportsFinishing: true,
    supportsBoundaryWall: true,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    requiresEngineerNote: false,
    timelineMonths: { greyStructure: 8, finishing: 6, turnkey: 14 },
  },
  farmhouse: {
    id: 'farmhouse',
    category: 'residential',
    displayName: 'Farmhouse (4+ Kanal)',
    shortName: 'Farmhouse',
    description: 'Large farmhouse on 4+ kanal with boundary wall, landscaping',
    icon: 'tree-pine',
    coverageRatio: 0.40,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 2,
    supportsFinishing: true,
    supportsBoundaryWall: true,
    supportsBasement: false,
    supportsParking: true,
    supportsElevators: false,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    requiresEngineerNote: false,
    timelineMonths: { greyStructure: 6, finishing: 5, turnkey: 11 },
  },
  highrise_apartment_building: {
    id: 'highrise_apartment_building',
    category: 'residential',
    displayName: 'High-Rise Apartment Building',
    shortName: 'Apt Building',
    description: 'Multi-story residential tower (4+ floors) with elevators',
    icon: 'building-2',
    coverageRatio: 0.85,
    defaultFloors: 10,
    minFloors: 4,
    maxFloors: 50,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: false,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    requiresEngineerNote: true,
    timelineMonths: { greyStructure: 18, finishing: 12, turnkey: 30 },
  },

  // Commercial
  shop_showroom: {
    id: 'shop_showroom',
    category: 'commercial',
    displayName: 'Shop / Showroom',
    shortName: 'Shop',
    description: 'Ground floor retail unit with high ceiling & frontage',
    icon: 'store',
    coverageRatio: 0.95,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 2,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: false,
    supportsElevators: false,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    requiresEngineerNote: false,
    timelineMonths: { greyStructure: 3, finishing: 2, turnkey: 5 },
  },
  commercial_plaza: {
    id: 'commercial_plaza',
    category: 'commercial',
    displayName: 'Commercial Plaza (2-6 Floors)',
    shortName: 'Plaza',
    description: 'Multi-story commercial building with shops/offices',
    icon: 'building',
    coverageRatio: 0.85,
    defaultFloors: 4,
    minFloors: 2,
    maxFloors: 6,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    requiresEngineerNote: false,
    timelineMonths: { greyStructure: 10, finishing: 6, turnkey: 16 },
  },
  office_building: {
    id: 'office_building',
    category: 'commercial',
    displayName: 'Office Building (4-12 Floors)',
    shortName: 'Office Bldg',
    description: 'Mid-rise office tower with central HVAC & elevators',
    icon: 'briefcase',
    coverageRatio: 0.85,
    defaultFloors: 8,
    minFloors: 4,
    maxFloors: 12,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    requiresEngineerNote: false,
    timelineMonths: { greyStructure: 12, finishing: 8, turnkey: 20 },
  },
  highrise_office_tower: {
    id: 'highrise_office_tower',
    category: 'commercial',
    displayName: 'High-Rise Office Tower (12+ Floors)',
    shortName: 'Office Tower',
    description: 'Premium high-rise office with curtain wall, BMS, multiple elevators',
    icon: 'building-2',
    coverageRatio: 0.80,
    defaultFloors: 20,
    minFloors: 12,
    maxFloors: 60,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    requiresEngineerNote: true,
    timelineMonths: { greyStructure: 24, finishing: 16, turnkey: 40 },
  },

  // Industrial
  warehouse: {
    id: 'warehouse',
    category: 'industrial',
    displayName: 'Warehouse / Godown',
    shortName: 'Warehouse',
    description: 'Large-span steel/prefab structure for storage/logistics',
    icon: 'warehouse',
    coverageRatio: 0.95,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 2,
    supportsFinishing: false,
    supportsBoundaryWall: true,
    supportsBasement: false,
    supportsParking: true,
    supportsElevators: false,
    supportsHVAC: false,
    supportsClearHeight: true,
    supportsLoadingDocks: true,
    requiresEngineerNote: false,
    timelineMonths: { greyStructure: 4, finishing: 0, turnkey: 4 },
  },
  industrial_building: {
    id: 'industrial_building',
    category: 'industrial',
    displayName: 'Industrial Building / Factory',
    shortName: 'Factory',
    description: 'Heavy-duty RCC/steel structure for manufacturing',
    icon: 'factory',
    coverageRatio: 0.90,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 3,
    supportsFinishing: false,
    supportsBoundaryWall: true,
    supportsBasement: false,
    supportsParking: true,
    supportsElevators: false,
    supportsHVAC: true,
    supportsClearHeight: true,
    supportsLoadingDocks: true,
    requiresEngineerNote: true,
    timelineMonths: { greyStructure: 6, finishing: 0, turnkey: 6 },
  },
  cold_storage: {
    id: 'cold_storage',
    category: 'industrial',
    displayName: 'Cold Storage Facility',
    shortName: 'Cold Storage',
    description: 'Insulated panels, refrigeration plant, loading docks',
    icon: 'snowflake',
    coverageRatio: 0.92,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 2,
    supportsFinishing: true,
    supportsBoundaryWall: true,
    supportsBasement: false,
    supportsParking: true,
    supportsElevators: false,
    supportsHVAC: true,
    supportsClearHeight: true,
    supportsLoadingDocks: true,
    requiresEngineerNote: true,
    timelineMonths: { greyStructure: 5, finishing: 3, turnkey: 8 },
  },
  workshop: {
    id: 'workshop',
    category: 'industrial',
    displayName: 'Workshop / Garage',
    shortName: 'Workshop',
    description: 'Basic shed with concrete floor, roller shutters, 3-phase power',
    icon: 'wrench',
    coverageRatio: 0.90,
    defaultFloors: 1,
    minFloors: 1,
    maxFloors: 1,
    supportsFinishing: true,
    supportsBoundaryWall: true,
    supportsBasement: false,
    supportsParking: true,
    supportsElevators: false,
    supportsHVAC: false,
    supportsClearHeight: true,
    supportsLoadingDocks: false,
    requiresEngineerNote: false,
    timelineMonths: { greyStructure: 2, finishing: 1, turnkey: 3 },
  },

  // Mixed-Use
  shops_plus_apartments: {
    id: 'shops_plus_apartments',
    category: 'mixed_use',
    displayName: 'Shops + Apartments (2-6 Floors)',
    shortName: 'Mixed (Low)',
    description: 'Ground floor retail + upper floor residential apartments',
    icon: 'building',
    coverageRatio: 0.85,
    defaultFloors: 4,
    minFloors: 2,
    maxFloors: 6,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: false,
    supportsClearHeight: false,
    supportsLoadingDocks: false,
    requiresEngineerNote: false,
    timelineMonths: { greyStructure: 10, finishing: 7, turnkey: 17 },
  },
  complete_mixed_tower: {
    id: 'complete_mixed_tower',
    category: 'mixed_use',
    displayName: 'Complete Mixed-Use Tower (12+ Floors)',
    shortName: 'Mixed Tower',
    description: 'Retail podium + offices + residential + amenities',
    icon: 'building-2',
    coverageRatio: 0.80,
    defaultFloors: 20,
    minFloors: 12,
    maxFloors: 60,
    supportsFinishing: true,
    supportsBoundaryWall: false,
    supportsBasement: true,
    supportsParking: true,
    supportsElevators: true,
    supportsHVAC: true,
    supportsClearHeight: false,
    supportsLoadingDocks: true,
    requiresEngineerNote: true,
    timelineMonths: { greyStructure: 24, finishing: 18, turnkey: 42 },
  },
};

// ═══════════════════════════════════════════════════════════════
// TYPOLOGY RATE CARDS — 2026 Q1 RATES (Per Sq Ft)
// ═══════════════════════════════════════════════════════════════

export const TYPOLOGY_RATES: Record<PropertySubType, TypologyRateCard> = {
  // ─── RESIDENTIAL ────────────────────────────────────────────

  house: {
    // Source: PCATP + DHA Lahore/Karachi + contractor surveys Q1 2026
    // Adjusted for 15% inflation from 2025
    greyStructurePerSqft: {
      standard: 3200,
      premium: 4200,
      luxury: 5500,
    },
    finishingPerSqft: {
      standard: 1800,
      premium: 2800,
      luxury: 4500,
    },
    greyStructureBreakdown: [
      { category: 'Excavation & Foundations', description: 'Strip footings, PCC, termite treatment', percentage: 12 },
      { category: 'RCC Frame', description: 'Columns, beams, slabs, staircase', percentage: 28 },
      { category: 'Brick/Block Masonry', description: '9" & 4.5" walls, DPC', percentage: 15 },
      { category: 'Plaster & Screed', description: 'Internal/external plaster, floor screed', percentage: 10 },
      { category: 'Cement, Steel, Aggregate', description: 'Materials for above items', percentage: 22 },
      { category: 'Labor', description: 'Masons, steel fixers, carpenters, helpers', percentage: 13 },
    ],
    finishingBreakdown: [
      { category: 'Flooring & Tiles', description: 'Bedrooms, bathrooms, kitchen, living', percentage: 22 },
      { category: 'Paint & Wall Finishes', description: 'Emulsion, weather shield, texture', percentage: 14 },
      { category: 'Woodwork (Doors/Windows)', description: 'Deodar/Partal frames, flush/solid doors', percentage: 16 },
      { category: 'Kitchen & Wardrobes', description: 'Cabinets, countertop, hardware', percentage: 14 },
      { category: 'Electrical & Lighting', description: 'Wiring, switches, DB, fixtures, fans', percentage: 12 },
      { category: 'Plumbing & Sanitary', description: 'PPR/copper, fixtures, water tank, pump', percentage: 12 },
      { category: 'Aluminum/UPVC Windows', description: 'Glazing, hardware, mosquito nets', percentage: 8 },
      { category: 'Labor', description: 'All finishing trades', percentage: 2 },
    ],
  },

  villa: {
    // Source: DHA/Islamabad villa contractors + PCATP luxury benchmarks
    greyStructurePerSqft: {
      standard: 3800,
      premium: 5000,
      luxury: 7200,
    },
    finishingPerSqft: {
      standard: 2800,
      premium: 4500,
      luxury: 7500,
    },
    greyStructureBreakdown: [
      { category: 'Deep Foundations / Piles', description: 'Pile caps, grade beams', percentage: 10 },
      { category: 'RCC Frame (Heavy)', description: 'Larger columns, long-span beams', percentage: 30 },
      { category: 'Brick/Block Masonry', description: 'Double walls, insulation cavity', percentage: 12 },
      { category: 'Retaining / Boundary Walls', description: 'Perimeter, landscaping walls', percentage: 8 },
      { category: 'Plaster, Screed, Waterproofing', description: 'High-spec finishes, terraces', percentage: 10 },
      { category: 'Cement, Steel, Aggregate', description: 'Higher grade materials', percentage: 20 },
      { category: 'Labor', description: 'Specialized trades, supervision', percentage: 10 },
    ],
    finishingBreakdown: [
      { category: 'Premium Flooring', description: 'Marble, imported tiles, engineered wood', percentage: 20 },
      { category: 'Wall Finishes', description: 'Texture, wallpaper, feature walls, cladding', percentage: 12 },
      { category: 'Custom Woodwork', description: 'Solid wood doors, built-in furniture, paneling', percentage: 18 },
      { category: 'Modular Kitchen & Wardrobes', description: 'High-end hardware, quartz/granite tops', percentage: 15 },
      { category: 'Smart Electrical', description: 'Automation, mood lighting, AV, security', percentage: 12 },
      { category: 'Premium Plumbing', description: 'Grohe/Kohler, underfloor heating, RO', percentage: 10 },
      { category: 'HVAC (VRF/Central)', description: 'Ducted, zone control, fresh air', percentage: 8 },
      { category: 'Aluminum/UPVC Systems', description: 'Thermal break, double glazed, motorized', percentage: 5 },
    ],
  },

  farmhouse: {
    // Source: Farmhouse builders (Bedian, Raiwind, Chakri) + PCATP
    greyStructurePerSqft: {
      standard: 2800,
      premium: 3600,
      luxury: 4800,
    },
    finishingPerSqft: {
      standard: 1500,
      premium: 2400,
      luxury: 3800,
    },
    greyStructureBreakdown: [
      { category: 'Foundations', description: 'Isolated footings, PCC', percentage: 12 },
      { category: 'RCC Frame', description: 'Standard columns, beams, slabs', percentage: 26 },
      { category: 'Boundary Wall & Gate', description: '9" brick, 8-10ft high, MS gate', percentage: 18 },
      { category: 'Brick Masonry', description: 'Main house walls', percentage: 12 },
      { category: 'Plaster & Screed', description: 'Standard finishes', percentage: 8 },
      { category: 'Cement, Steel, Aggregate', description: 'Standard grade', percentage: 16 },
      { category: 'Labor', description: 'Local workforce', percentage: 8 },
    ],
    finishingBreakdown: [
      { category: 'Flooring (Local Tiles/Marble)', description: 'Standard + outdoor areas', percentage: 25 },
      { category: 'Paint & Exterior', description: 'Weather shield, texture paint', percentage: 15 },
      { category: 'Woodwork', description: 'Doors, windows, basic wardrobes', percentage: 18 },
      { category: 'Kitchen & Bath', description: 'Standard fixtures, local brands', percentage: 15 },
      { category: 'Electrical & Plumbing', description: 'Standard wiring, PPR, basic fixtures', percentage: 15 },
      { category: 'Outdoor/Landscaping', description: 'Paving, gate, water feature', percentage: 10 },
      { category: 'Labor', description: 'Finishing trades', percentage: 2 },
    ],
  },

  highrise_apartment_building: {
    // Source: Bahria Town/DHA highrise contractors + PCATP highrise guidelines
    // Includes: podium, basements, lift cores, fire safety, facade
    greyStructurePerSqft: {
      standard: 4500,
      premium: 5800,
      luxury: 7500,
    },
    finishingPerSqft: {
      standard: 2200,
      premium: 3500,
      luxury: 5500,
    },
    greyStructureBreakdown: [
      { category: 'Deep Foundations (Piles/Raft)', description: 'Piling, pile caps, basement retention', percentage: 15 },
      { category: 'RCC Superstructure', description: 'Shear walls, flat slabs, columns, cores', percentage: 30 },
      { category: 'Basement Construction', description: 'Waterproofing, excavation, shoring', percentage: 12 },
      { category: 'Block Masonry / Drywall', description: 'Unit partitions, shaft walls', percentage: 8 },
      { category: 'Facade Structure', description: 'Curtain wall mullions, balcony structure', percentage: 10 },
      { category: 'Cement, Steel, Aggregate', description: 'High-strength concrete, Grade 60 steel', percentage: 15 },
      { category: 'Labor & Equipment', description: 'Pumping, formwork, tower cranes', percentage: 10 },
    ],
    finishingBreakdown: [
      { category: 'Unit Finishes (Tiles/Paint)', description: 'Apartment interiors', percentage: 28 },
      { category: 'MEP Distribution', description: 'Vertical risers, horizontal distribution', percentage: 18 },
      { category: 'Elevators (Passenger/Service)', description: 'Traction lifts, lobby finishes', percentage: 14 },
      { category: 'Fire & Life Safety', description: 'Sprinklers, detection, pressurization', percentage: 12 },
      { category: 'Facade Glazing/Cladding', description: 'Unitized curtain wall, balconies', percentage: 10 },
      { category: 'Common Areas', description: 'Lobbies, corridors, amenities', percentage: 8 },
      { category: 'Labor', description: 'Specialized highrise trades', percentage: 10 },
    ],
  },

  // ─── COMMERCIAL ──────────────────────────────────────────────

  shop_showroom: {
    // Source: Commercial plaza contractors (Gulberg, DHA, Blue Area)
    greyStructurePerSqft: {
      standard: 2800,
      premium: 3600,
      luxury: 4800,
    },
    finishingPerSqft: {
      standard: 1500,
      premium: 2500,
      luxury: 4000,
    },
    greyStructureBreakdown: [
      { category: 'Foundations', description: 'Heavy footings for column-free span', percentage: 14 },
      { category: 'RCC Frame', description: 'Long-span beams, flat slabs', percentage: 30 },
      { category: 'High Ceiling Structure', description: 'Double height, mezzanine prep', percentage: 12 },
      { category: 'Shopfront Structure', description: 'Steel/RC mullions for glazing', percentage: 10 },
      { category: 'Plaster & Screed', description: 'Standard', percentage: 8 },
      { category: 'Cement, Steel, Aggregate', description: 'Standard', percentage: 18 },
      { category: 'Labor', description: 'Commercial builders', percentage: 8 },
    ],
    finishingBreakdown: [
      { category: 'Shopfront Glazing', description: 'Toughened glass, aluminum framing', percentage: 28 },
      { category: 'Flooring (High Traffic)', description: 'Granite, vitrified, epoxy', percentage: 18 },
      { category: 'Ceiling & Lighting', description: 'Grid, track lights, AC grilles', percentage: 15 },
      { category: 'Electrical (3-Phase)', description: 'High load, display lighting', percentage: 12 },
      { category: 'HVAC (VRV/Cassette)', description: 'Showroom cooling', percentage: 12 },
      { category: 'Plumbing', description: 'Toilets, pantry', percentage: 8 },
      { category: 'Branding/Signage Prep', description: 'Fascia, logo lighting points', percentage: 5 },
      { category: 'Labor', description: 'Specialized', percentage: 2 },
    ],
  },

  commercial_plaza: {
    // Source: Plaza developers (MM Alam, F-10, Saddar) + PCATP
    greyStructurePerSqft: {
      standard: 3200,
      premium: 4200,
      luxury: 5800,
    },
    finishingPerSqft: {
      standard: 1800,
      premium: 3000,
      luxury: 4800,
    },
    greyStructureBreakdown: [
      { category: 'Foundations', description: 'Multi-story loads, basement', percentage: 12 },
      { category: 'RCC Frame', description: 'Columns, beams, slabs, lift cores', percentage: 30 },
      { category: 'Basement(s)', description: 'Parking, services, waterproofing', percentage: 15 },
      { category: 'Masonry / Drywall', description: 'Shop/office partitions', percentage: 8 },
      { category: 'Facade Prep', description: 'Curtain wall/stone cladding structure', percentage: 8 },
      { category: 'Cement, Steel, Aggregate', description: 'Commercial grade', percentage: 18 },
      { category: 'Labor & Equipment', description: 'Pumping, formwork', percentage: 9 },
    ],
    finishingBreakdown: [
      { category: 'Common Area Finishes', description: 'Lobbies, corridors, atriums', percentage: 20 },
      { category: 'Elevators & Escalators', description: 'Passenger + service + goods', percentage: 18 },
      { category: 'MEP Systems', description: 'Chillers, AHUs, BMS, fire', percentage: 18 },
      { category: 'Facade (Glazing/Stone)', description: 'Curtain wall or cladding', percentage: 15 },
      { category: 'Unit Fit-out Shell', description: 'Raised floor, bare shell prep', percentage: 12 },
      { category: 'Electrical/Plumbing', description: 'Common services', percentage: 10 },
      { category: 'Signage/Wayfinding', description: 'Directory, branding prep', percentage: 4 },
      { category: 'Labor', description: 'Multi-trade', percentage: 3 },
    ],
  },

  office_building: {
    // Source: Blue Area, Gulberg, Clifton office towers
    greyStructurePerSqft: {
      standard: 3600,
      premium: 4800,
      luxury: 6500,
    },
    finishingPerSqft: {
      standard: 2200,
      premium: 3500,
      luxury: 5500,
    },
    greyStructureBreakdown: [
      { category: 'Foundations', description: 'Piled/raft for high loads', percentage: 12 },
      { category: 'RCC Frame', description: 'Long-span, column-free, lift cores', percentage: 32 },
      { category: 'Basement Parking', description: '2-3 levels, waterproofing', percentage: 14 },
      { category: 'Raised Floor Structure', description: 'Pedestal system prep', percentage: 6 },
      { category: 'Facade Structure', description: 'Unitized curtain wall support', percentage: 10 },
      { category: 'Cement, Steel, Aggregate', description: 'High-spec concrete, post-tension', percentage: 16 },
      { category: 'Labor & Equipment', description: 'Highrise methods', percentage: 10 },
    ],
    finishingBreakdown: [
      { category: 'Raised Access Floors', description: 'Steel panel, carpet tile', percentage: 14 },
      { category: 'Suspended Ceilings', description: 'Metal tile, gypsum, acoustic', percentage: 12 },
      { category: 'HVAC (Central/VRF)', description: 'Chillers, AHUs, FCUs, BMS, fresh air', percentage: 20 },
      { category: 'Fire & Life Safety', description: 'Addressable, sprinklers, smoke extraction', percentage: 14 },
      { category: 'Elevators (High Speed)', description: 'Destination dispatch, lobby', percentage: 12 },
      { category: 'Electrical/ELV', description: 'Busbar, UPS, data, CCTV, access', percentage: 12 },
      { category: 'Facade Glazing', description: 'Double skin, low-e, shading', percentage: 10 },
      { category: 'Labor', description: 'Specialized', percentage: 6 },
    ],
  },

  highrise_office_tower: {
    // Source: Premium towers (ITC, Ocean Tower, Centaurus equivalent)
    greyStructurePerSqft: {
      standard: 4800,
      premium: 6500,
      luxury: 9000,
    },
    finishingPerSqft: {
      standard: 3000,
      premium: 4800,
      luxury: 7500,
    },
    greyStructureBreakdown: [
      { category: 'Deep Foundations (Piles/Barrettes)', description: 'High capacity, load testing', percentage: 14 },
      { category: 'Superstructure (Core + Outriggers)', description: 'High-strength concrete, PT slabs', percentage: 32 },
      { category: 'Multi-Level Basements', description: '3-5 levels, secant piles, dewatering', percentage: 12 },
      { category: 'Podium Structure', description: 'Retail, amenities, transfer structure', percentage: 8 },
      { category: 'Facade System Structure', description: 'Unitized CW, custom geometry', percentage: 10 },
      { category: 'Cement, Steel, Aggregate', description: 'Grade 80+ concrete, imported steel', percentage: 14 },
      { category: 'Labor, Equipment, Tech', description: 'Jump forms, BIM, monitoring', percentage: 10 },
    ],
    finishingBreakdown: [
      { category: 'Unitized Curtain Wall', description: 'Double skin, IGU, integrated blinds', percentage: 18 },
      { category: 'MEP Plant & Distribution', description: 'District cooling, thermal storage, BMS', percentage: 18 },
      { category: 'Elevators (Ultra High Speed)', description: 'Destination control, sky lobbies', percentage: 14 },
      { category: 'Fire/Life Safety (Performance)', description: 'Engineered, evacuation lifts', percentage: 12 },
      { category: 'Raised Floors / Ceilings', description: 'Office spec + tenant flexibility', percentage: 12 },
      { category: 'Electrical/ELV/Smart Building', description: 'IoT, digital twin, cyber security', percentage: 10 },
      { category: 'Common Areas / Amenities', description: 'Sky gardens, conferencing, fitness', percentage: 10 },
      { category: 'Labor & Commissioning', description: 'Integrated testing, LEED/WELL', percentage: 8 },
    ],
  },

  // ─── INDUSTRIAL ──────────────────────────────────────────────

  warehouse: {
    // Source: Industrial estate developers (Sundar, Rachna, M3, Korangi)
    // Steel structure / Pre-engineered building (PEB) dominant
    greyStructurePerSqft: {
      standard: 1800,
      premium: 2400,
      luxury: 3200,
    },
    finishingPerSqft: {
      standard: 0,
      premium: 0,
      luxury: 0,
    },
    greyStructureBreakdown: [
      { category: 'PEB Steel Frame', description: 'Columns, rafters, purlins, bracing', percentage: 38 },
      { category: 'Foundations', description: 'Pad footings, anchor bolts', percentage: 12 },
      { category: 'Concrete Floor Slab', description: '150-200mm, reinforced, hardener', percentage: 20 },
      { category: 'Roof & Wall Sheeting', description: '0.47-0.55mm profile, insulation', percentage: 15 },
      { category: 'Roller Shutters / Docks', description: 'Motorized, dock levelers', percentage: 8 },
      { category: 'Plinth & Drainage', description: 'Peripheral drain, ramp', percentage: 4 },
      { category: 'Labor & Erection', description: 'PEB erection crew, crane', percentage: 3 },
    ],
    finishingBreakdown: [],
  },

  industrial_building: {
    // Source: Factory builders (Faisalabad, SITE, Hattar)
    // RCC frame with crane beams, heavy floor loads
    greyStructurePerSqft: {
      standard: 2800,
      premium: 3800,
      luxury: 5000,
    },
    finishingPerSqft: {
      standard: 0,
      premium: 0,
      luxury: 0,
    },
    greyStructureBreakdown: [
      { category: 'RCC Frame (Heavy)', description: 'Crane beams, thick slabs, large columns', percentage: 32 },
      { category: 'Foundations', description: 'Heavy pads, piles for machinery', percentage: 15 },
      { category: 'Industrial Floor', description: '200-300mm, fiber reinforced, joints', percentage: 18 },
      { category: 'Roof Structure', description: 'Trusses, decking, insulation, skylights', percentage: 12 },
      { category: 'Masonry Infill', description: 'Block walls up to crane rail', percentage: 8 },
      { category: 'Cement, Steel, Aggregate', description: 'High grade, epoxy coated rebar', percentage: 10 },
      { category: 'Labor & Equipment', description: 'Heavy lifts, specialized', percentage: 5 },
    ],
    finishingBreakdown: [],
  },

  cold_storage: {
    // Source: Cold chain developers (Karachi, Lahore, Faisalabad)
    greyStructurePerSqft: {
      standard: 3500,
      premium: 4500,
      luxury: 6000,
    },
    finishingPerSqft: {
      standard: 2200,
      premium: 3200,
      luxury: 4500,
    },
    greyStructureBreakdown: [
      { category: 'RCC Frame', description: 'Columns, beams, insulated roof deck', percentage: 28 },
      { category: 'Foundations', description: 'Heavy loads, vibration isolation', percentage: 12 },
      { category: 'Insulated Floor', description: 'XPS/EPS under slab, heating cables', percentage: 15 },
      { category: 'Loading Dock Structure', description: 'Ramps, shelters, levelers', percentage: 10 },
      { category: 'Cement, Steel, Aggregate', description: 'Standard + insulation materials', percentage: 15 },
      { category: 'Labor', description: 'Specialized', percentage: 10 },
      { category: 'Vapor Barrier', description: 'Sub-slab & wall', percentage: 10 },
    ],
    finishingBreakdown: [
      { category: 'PUF/PIR Panels (Walls/Roof)', description: '80-150mm, camlock, hygienic', percentage: 35 },
      { category: 'Refrigeration Plant', description: 'Compressors, condensers, evaporators', percentage: 30 },
      { category: 'Doors (Insulated/High Speed)', description: 'Cold room, freezer, rapid roll', percentage: 12 },
      { category: 'Flooring (Epoxy/PU)', description: 'Anti-slip, thermal shock resistant', percentage: 8 },
      { category: 'Electrical & Controls', description: 'PLC, monitoring, backup power', percentage: 8 },
      { category: 'Labor', description: 'Panel installers, refrigeration techs', percentage: 7 },
    ],
  },

  workshop: {
    // Source: Mughalpura + Saddar workshop contractors
    // Cheapest typology — basic shed + concrete floor
    greyStructurePerSqft: {
      standard: 1650,
      premium: 2200,
      luxury: 3100,
    },
    finishingPerSqft: {
      standard: 400,
      premium: 625,
      luxury: 1025,
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

  // ─── MIXED-USE ──────────────────────────────────────────────

  shops_plus_apartments: {
    // Source: Composite rate — ground floor shops (commercial) + upper floors (residential)
    // Weighted average: 25% commercial + 75% residential
    greyStructurePerSqft: {
      standard: 3500,
      premium: 4600,
      luxury: 6100,
    },
    finishingPerSqft: {
      standard: 2100,
      premium: 3400,
      luxury: 5300,
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
      { category: 'Paint & Finishes', description: 'Internal + external', percentage: 14 },
      { category: 'Shopfront Glazing', description: 'Ground floor retail', percentage: 10 },
      { category: 'Fire & Safety', description: 'Common areas', percentage: 8 },
      { category: 'Labor', description: 'Mixed trades', percentage: 11 },
    ],
  },

  complete_mixed_tower: {
    // Source: Premium mixed-use (Centaurus, Emporium, One Constitution)
    // Podium retail + office + residential + hotel/amenities
    greyStructurePerSqft: {
      standard: 5200,
      premium: 7000,
      luxury: 9500,
    },
    finishingPerSqft: {
      standard: 3200,
      premium: 5000,
      luxury: 7800,
    },
    greyStructureBreakdown: [
      { category: 'Deep Foundations', description: 'Piles/barrettes, load testing', percentage: 14 },
      { category: 'Transfer Structure', description: 'Podium to tower, PT beams', percentage: 10 },
      { category: 'Superstructure (Multi-Use)', description: 'Varying spans, cores, outriggers', percentage: 30 },
      { category: 'Basements (3-5 Levels)', description: 'Parking, plant, services', percentage: 12 },
      { category: 'Podium Structure', description: 'Retail, atrium, auditorium', percentage: 8 },
      { category: 'Facade Systems', description: 'Multiple CW types, stone, louvres', percentage: 10 },
      { category: 'Cement, Steel, Aggregate', description: 'Premium grades, imported', percentage: 10 },
      { category: 'Labor, Tech, BIM', description: 'Complex coordination', percentage: 6 },
    ],
    finishingBreakdown: [
      { category: 'Multi-System Facade', description: 'Retail CW, office CW, residential windows', percentage: 16 },
      { category: 'MEP (Zoned by Use)', description: 'District cooling, separate plants', percentage: 18 },
      { category: 'Elevators (Zoned)', description: 'Residential, office, service, shuttle', percentage: 14 },
      { category: 'Fire/Life Safety (Integrated)', description: 'Phased evacuation, BMS', percentage: 12 },
      { category: 'Podium Finishes', description: 'Retail, lobby, amenities, landscaping', percentage: 12 },
      { category: 'Residential Fit-out', description: 'Apartment finishes, kitchens, baths', percentage: 12 },
      { category: 'Office Fit-out Shell', description: 'Raised floor, ceiling, HVAC distribution', percentage: 10 },
      { category: 'Smart Building / Commissioning', description: 'IoT, digital twin, certifications', percentage: 6 },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════════════════════════

export const ALL_CITIES: City[] = [
  'Lahore', 'Islamabad', 'Rawalpindi', 'Karachi',
  'Faisalabad', 'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Quetta',
];

export const ALL_QUALITY_GRADES: QualityGrade[] = ['standard', 'premium', 'luxury'];
export const ALL_CONSTRUCTION_TYPES: ConstructionType[] = ['grey_structure', 'finishing', 'turnkey'];
export const ALL_SUBTYPES: PropertySubType[] = Object.keys(SUBTYPE_METADATA) as PropertySubType[];
export const ALL_CATEGORIES: PropertyCategory[] = ['residential', 'commercial', 'industrial', 'mixed_use'];

// ═══════════════════════════════════════════════════════════════
// CALCULATION HELPERS
// ═══════════════════════════════════════════════════════════════

export function convertArea(area: number, from: AreaUnit, to: AreaUnit): number {
  const toSqFt: Record<AreaUnit, number> = {
    'Marla': 272.25,
    'Kanal': 5445,
    'Sq Ft': 1,
  };
  const sqft = area * toSqFt[from];
  return sqft / toSqFt[to];
}

export function getTypologyRate(
  subType: PropertySubType,
  grade: QualityGrade,
  type: ConstructionType
): number {
  const card = TYPOLOGY_RATES[subType];
  if (!card) return 0;
  if (type === 'grey_structure') return card.greyStructurePerSqft[grade];
  if (type === 'finishing') return card.finishingPerSqft[grade];
  return card.greyStructurePerSqft[grade] + card.finishingPerSqft[grade];
}

export function getCityMultiplier(city: City, component: 'greyStructure' | 'finishing' | 'labor'): number {
  return CITY_MULTIPLIERS[city]?.[component] ?? 1.0;
}

export function calculateConstructionCost(params: {
  subType: PropertySubType;
  grade: QualityGrade;
  type: ConstructionType;
  area: number;
  unit: AreaUnit;
  city: City;
  floors?: number;
  includeBoundaryWall?: boolean;
  includeBasement?: boolean;
  basementLevels?: number;
}): {
  baseCost: number;
  cityAdjustedCost: number;
  breakdown: { item: string; cost: number }[];
  totalCost: number;
  costPerSqft: number;
  timelineMonths: number;
} {
  const ratePerSqft = getTypologyRate(params.subType, params.grade, params.type);
  const areaSqft = convertArea(params.area, params.unit, 'Sq Ft');

  const cityMult = params.type === 'finishing'
    ? getCityMultiplier(params.city, 'finishing')
    : getCityMultiplier(params.city, 'greyStructure');

  const baseCost = ratePerSqft * areaSqft;
  const cityAdjustedCost = baseCost * cityMult;

  const metadata = SUBTYPE_METADATA[params.subType];
  const timeline = params.type === 'turnkey'
    ? metadata.timelineMonths.turnkey
    : params.type === 'finishing'
      ? metadata.timelineMonths.finishing
      : metadata.timelineMonths.greyStructure;

  const breakdown = [
    { item: `Base rate (${params.grade} ${params.type.replace('_', ' ')})`, cost: Math.round(baseCost) },
    { item: `City multiplier (${params.city})`, cost: Math.round(baseCost * (cityMult - 1)) },
  ];

  let totalCost = cityAdjustedCost;

  // Add boundary wall if applicable
  if (params.includeBoundaryWall && metadata.supportsBoundaryWall) {
    const perimeter = Math.sqrt(areaSqft) * 4; // Approximate
    const wallCost = perimeter * 2500 * getCityMultiplier(params.city, 'greyStructure'); // PKR 2500/ft
    breakdown.push({ item: 'Boundary wall (8-10ft)', cost: Math.round(wallCost) });
    totalCost += wallCost;
  }

  // Add basement if applicable
  if (params.includeBasement && metadata.supportsBasement && (params.basementLevels ?? 0) > 0) {
    const basementCost = areaSqft * 3500 * getCityMultiplier(params.city, 'greyStructure') * (params.basementLevels ?? 1);
    breakdown.push({ item: `Basement (${params.basementLevels} level${(params.basementLevels ?? 1) > 1 ? 's' : ''})`, cost: Math.round(basementCost) });
    totalCost += basementCost;
  }

  return {
    baseCost: Math.round(baseCost),
    cityAdjustedCost: Math.round(cityAdjustedCost),
    breakdown,
    totalCost: Math.round(totalCost),
    costPerSqft: Math.round(totalCost / areaSqft),
    timelineMonths: timeline,
  };
}
