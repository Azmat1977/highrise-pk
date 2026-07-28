// ========== FILE: lib/constructionEngine.ts ==========
// 🏗️ CONSTRUCTION CALCULATION ENGINE — HIGHRISE.PK
// Pure functions that compute construction costs from input + rates
//
// Architecture:
//   - No DB calls, no API calls, no side effects
//   - Takes typed inputs + rate database → returns typed result
//   - Routes to typology-specific engines (House, Highrise, Industrial, Mixed)
//   - Composite logic for Mixed-Use (weighted commercial + residential)
// ═══════════════════════════════════════════════════════════════════════════

import {
  type City,
  type QualityGrade,
  type ConstructionType,
  type AreaUnit,
  type PropertySubType,
  type PropertyCategory,
  type CostBreakdownTemplate,
  type MaterialRate,
  SUB_TYPE_METADATA,
  SUB_TYPE_RATES,
  BOUNDARY_WALL_PKR_PER_RUNNING_FT,
  BASEMENT_PKR_PER_SQFT,
  ELEVATOR_PKR_PER_UNIT,
  PARKING_PKR_PER_SLOT,
  GENERATOR_PKR_PER_KVA,
  MATERIAL_RATES,
  SIZE_TO_SQFT,
  getCityMultiplier,
  RATES_VERSION,
  RATES_VALID_UNTIL,
  RATES_LAST_UPDATED,
} from '@/lib/constructionRates';

// ═══════════════════════════════════════════════════════════════
// INPUT / OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════

export interface EngineInput {
  // Core selection
  city: City;
  subType: PropertySubType;
  quality: QualityGrade;
  constructionType: ConstructionType;

  // Size
  size: number;
  sizeUnit: AreaUnit;

  // Structure
  floors: number;

  // Optional add-ons (UI controls visibility per subType)
  includeBoundaryWall?: boolean;
  includeBasement?: boolean;
  elevatorCount?: number;             // 0-6 (highrise only)
  parkingSlots?: number;              // commercial/highrise
  generatorKVA?: number;              // backup power
  clearHeightFt?: number;             // industrial (20/30/40)
  loadingDocks?: number;              // warehouse
  hvacIncluded?: boolean;             // commercial/highrise

  // Mixed-use specific
  groundFloorCommercialPct?: number;  // 0-100 (default 25)
}

export interface CostBreakdownItem {
  category: string;
  description: string;
  amount: number;
  percentage: number;
}

export interface TimelineEstimate {
  min: number;
  max: number;
}

export interface AddOnBreakdown {
  boundaryWall?: number;
  basement?: number;
  elevators?: number;
  parking?: number;
  generator?: number;
  hvac?: number;
}

export interface EngineResult {
  // Input echo (for UI)
  city: City;
  subType: PropertySubType;
  subTypeDisplayName: string;
  category: PropertyCategory;
  quality: QualityGrade;
  constructionType: ConstructionType;
  floors: number;

  // Calculated areas
  plotSizeSqft: number;
  coveredAreaPerFloor: number;
  totalCoveredSqft: number;
  coverageRatio: number;

  // Cost summary
  baseCost: number;                   // Construction only
  addOnsCost: number;                 // Sum of all add-ons
  totalCost: number;                  // Base + add-ons
  costPerSqft: number;
  costPerMarla: number;

  // Confidence range (±)
  costMin: number;
  costMax: number;
  confidenceLevel: 'high' | 'medium' | 'low';

  // Breakdown
  breakdown: CostBreakdownItem[];
  addOns: AddOnBreakdown;

  // Timeline
  timelineMonths: TimelineEstimate;

  // Material rates (city-adjusted)
  materialRates: MaterialRate[];

  // Engineering note (if required)
  requiresEngineerNote: boolean;
  engineerNoteText?: string;

  // Insights
  insights: string[];

  // Metadata
  lastUpdated: string;
  ratesVersion: string;
  validUntil: string;
  cityMultiplier: number;
}

// ═══════════════════════════════════════════════════════════════
// CORE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert plot size to sqft
 */
export function toSqft(size: number, unit: AreaUnit): number {
  return size * SIZE_TO_SQFT[unit];
}

/**
 * Round to nearest 1,000 PKR for cleaner display
 */
function roundToThousand(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}

/**
 * Calculate approximate boundary length from plot area (assumes ~square)
 */
function approxBoundaryLengthFt(plotSizeSqft: number): number {
  const sideLength = Math.sqrt(plotSizeSqft);
  return sideLength * 4;
}

// ═══════════════════════════════════════════════════════════════
// BASE COST CALCULATION (Per Sub-Type)
// ═══════════════════════════════════════════════════════════════

/**
 * Get per-sqft cost based on construction type + sub-type rates
 */
function getPerSqftCost(
  subType: PropertySubType,
  quality: QualityGrade,
  constructionType: ConstructionType
): { perSqft: number; breakdown: CostBreakdownTemplate[] } {
  const rates = SUB_TYPE_RATES[subType];
  const meta = SUB_TYPE_METADATA[subType];

  // Industrial typologies skip finishing-only mode (no real finishing)
  if (!meta.supportsFinishing && constructionType === 'finishing') {
    return {
      perSqft: rates.finishingPerSqft[quality],
      breakdown: rates.finishingBreakdown,
    };
  }

  switch (constructionType) {
    case 'grey_structure':
      return {
        perSqft: rates.greyStructurePerSqft[quality],
        breakdown: rates.greyStructureBreakdown,
      };

    case 'finishing':
      return {
        perSqft: rates.finishingPerSqft[quality],
        breakdown: rates.finishingBreakdown,
      };

    case 'turnkey': {
      // Combine grey + finishing
      const grey = rates.greyStructurePerSqft[quality];
      const finishing = rates.finishingPerSqft[quality];
      const total = grey + finishing;
      const greyShare = grey / total;
      const finishingShare = finishing / total;

      // Weighted breakdown
      const greyAdjusted: CostBreakdownTemplate[] = rates.greyStructureBreakdown.map((b) => ({
        category: `[Grey] ${b.category}`,
        description: b.description,
        percentage: b.percentage * greyShare,
      }));
      const finishingAdjusted: CostBreakdownTemplate[] = rates.finishingBreakdown.map((b) => ({
        category: `[Finish] ${b.category}`,
        description: b.description,
        percentage: b.percentage * finishingShare,
      }));

      return {
        perSqft: total,
        breakdown: [...greyAdjusted, ...finishingAdjusted],
      };
    }

    default:
      // Fallback to turnkey
      return {
        perSqft: rates.greyStructurePerSqft[quality] + rates.finishingPerSqft[quality],
        breakdown: [...rates.greyStructureBreakdown, ...rates.finishingBreakdown],
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// ADD-ON COST CALCULATIONS
// ═══════════════════════════════════════════════════════════════

function calculateBoundaryWall(
  plotSizeSqft: number,
  quality: QualityGrade,
  cityMultiplier: number
): number {
  const boundaryFt = approxBoundaryLengthFt(plotSizeSqft);
  const ratePerFt = BOUNDARY_WALL_PKR_PER_RUNNING_FT[quality];
  return roundToThousand(boundaryFt * ratePerFt * cityMultiplier);
}

function calculateBasement(
  coveredAreaPerFloor: number,
  quality: QualityGrade,
  cityMultiplier: number
): number {
  return roundToThousand(
    coveredAreaPerFloor * BASEMENT_PKR_PER_SQFT[quality] * cityMultiplier
  );
}

function calculateElevators(
  elevatorCount: number,
  quality: QualityGrade,
  cityMultiplier: number
): number {
  if (elevatorCount <= 0) return 0;
  return roundToThousand(elevatorCount * ELEVATOR_PKR_PER_UNIT[quality] * cityMultiplier);
}

function calculateParking(
  parkingSlots: number,
  quality: QualityGrade,
  cityMultiplier: number
): number {
  if (parkingSlots <= 0) return 0;
  return roundToThousand(parkingSlots * PARKING_PKR_PER_SLOT[quality] * cityMultiplier);
}

function calculateGenerator(
  kva: number,
  quality: QualityGrade,
  cityMultiplier: number
): number {
  if (kva <= 0) return 0;
  return roundToThousand(kva * GENERATOR_PKR_PER_KVA[quality] * cityMultiplier);
}

function calculateHVAC(
  totalCoveredSqft: number,
  quality: QualityGrade,
  cityMultiplier: number
): number {
  // Approx Rs 180-350 per sqft for split AC; central HVAC higher
  const perSqftRate = quality === 'luxury' ? 450 : quality === 'premium' ? 320 : 200;
  return roundToThousand(totalCoveredSqft * perSqftRate * cityMultiplier);
}

// ═══════════════════════════════════════════════════════════════
// TIMELINE CALCULATION (Per Typology)
// ═══════════════════════════════════════════════════════════════

function calculateTimeline(
  subType: PropertySubType,
  floors: number,
  quality: QualityGrade,
  totalCoveredSqft: number
): TimelineEstimate {
  const meta = SUB_TYPE_METADATA[subType];

  // Base months from metadata
  let baseMonths = meta.timelineBaselineMonths;

  // Add per-floor adjustment
  const extraFloors = Math.max(0, floors - meta.defaultFloors);
  baseMonths += extraFloors * meta.timelineMultiplierByFloors;

  // Quality multiplier (luxury takes longer)
  const qualityMultiplier =
    quality === 'luxury' ? 1.4 : quality === 'premium' ? 1.15 : 1.0;
  baseMonths *= qualityMultiplier;

  // Scale factor for very large areas
  // Reference: 2500 sqft baseline; double for every 10x area
  if (totalCoveredSqft > 25000) {
    baseMonths *= 1.25;
  } else if (totalCoveredSqft > 10000) {
    baseMonths *= 1.10;
  }

  const minMonths = Math.max(2, Math.ceil(baseMonths * 0.85));
  const maxMonths = Math.max(3, Math.ceil(baseMonths * 1.25));

  return { min: minMonths, max: maxMonths };
}

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE LEVEL (Based on Data Quality + Sub-Type Complexity)
// ═══════════════════════════════════════════════════════════════

function calculateConfidence(subType: PropertySubType): 'high' | 'medium' | 'low' {
  // High confidence: well-documented standard typologies
  if (subType === 'house' || subType === 'shop_showroom' || subType === 'warehouse') {
    return 'high';
  }

  // Low confidence: highly variable / specialized typologies
  if (
    subType === 'highrise_office_tower' ||
    subType === 'complete_mixed_tower' ||
    subType === 'cold_storage'
  ) {
    return 'low';
  }

  // Medium for everything else
  return 'medium';
}

// ═══════════════════════════════════════════════════════════════
// COST RANGE (Based on Confidence)
// ═══════════════════════════════════════════════════════════════

function calculateRange(totalCost: number, confidence: 'high' | 'medium' | 'low'): {
  min: number;
  max: number;
} {
  let lowerPct: number;
  let upperPct: number;

  switch (confidence) {
    case 'high':
      lowerPct = 0.92;  // -8%
      upperPct = 1.10;  // +10%
      break;
    case 'medium':
      lowerPct = 0.85;  // -15%
      upperPct = 1.20;  // +20%
      break;
    case 'low':
      lowerPct = 0.75;  // -25%
      upperPct = 1.35;  // +35%
      break;
  }

  return {
    min: roundToThousand(totalCost * lowerPct),
    max: roundToThousand(totalCost * upperPct),
  };
}

// ═══════════════════════════════════════════════════════════════
// INSIGHTS GENERATOR (Per Sub-Type)
// ═══════════════════════════════════════════════════════════════

function generateInsights(input: EngineInput, cityMultiplier: number, totalCost: number): string[] {
  const insights: string[] = [];
  const meta = SUB_TYPE_METADATA[input.subType];

  // ─── City-specific insight ────────────────────────────────
  if (cityMultiplier > 1.10) {
    insights.push(
      `${input.city} construction for ${meta.shortName.toLowerCase()} is ${Math.round(
        (cityMultiplier - 1) * 100
      )}% above Lahore baseline. Factor in transport + labor logistics.`
    );
  } else if (cityMultiplier < 0.95) {
    insights.push(
      `${input.city} offers ${Math.round((1 - cityMultiplier) * 100)}% lower costs than Lahore for ${meta.shortName.toLowerCase()} construction.`
    );
  }

  // ─── Typology-specific insights ───────────────────────────
  switch (input.subType) {
    case 'house':
      if (input.quality === 'standard') {
        insights.push(
          `Standard-grade house is the most popular choice in Pakistan. Best ROI for rental properties.`
        );
      }
      if (input.floors >= 3) {
        insights.push(
          `Multi-storey house (${input.floors} floors) requires stronger RCC foundation. Allow 15-20% extra for structural reinforcement.`
        );
      }
      break;

    case 'villa':
      insights.push(
        `Luxury villas often have 30-40% finishing cost overrun due to imported materials. Get fixed-price contracts with detailed specs.`
      );
      insights.push(
        `Pro tip: Phase your villa construction — grey structure first, then finishing over 3-6 months for better cash flow.`
      );
      break;

    case 'farmhouse':
      insights.push(
        `Farmhouses typically use only 25-30% of plot for construction. Budget extra for landscaping, boundary wall, and water/electricity connections.`
      );
      insights.push(
        `Consider solar power for farmhouse — grid connectivity often takes 6-12 months in suburban areas.`
      );
      break;

    case 'highrise_apartment_building':
      insights.push(
        `⚠️ Highrise construction REQUIRES structural engineer certification. Budget Rs 5-15 Lac for design + structural consultancy.`
      );
      insights.push(
        `Common delay: NOC from CDA/LDA + Civil Aviation Authority for buildings above 80ft. Allow 4-8 months for approvals.`
      );
      insights.push(
        `Elevators add Rs 35 Lac to Rs 1.2 Crore per unit. Plan 1 elevator per 30-40 apartments.`
      );
      break;

    case 'shop_showroom':
      insights.push(
        `Glass facade can be 25-30% of total finishing cost. Use locally available frameless systems to save 20%.`
      );
      break;

    case 'commercial_plaza':
      insights.push(
        `Commercial plazas need fire safety NOC from civil defense. Sprinklers + fire alarm system: Rs 80-150 per sqft.`
      );
      insights.push(
        `Pro tip: Pre-sell shops at grey structure stage to fund finishing. Common practice in Lahore + Karachi.`
      );
      break;

    case 'office_building':
      insights.push(
        `Modern offices need CAT6/fiber cabling. Budget Rs 35-60 per sqft for data + power infrastructure.`
      );
      break;

    case 'highrise_office_tower':
      insights.push(
        `⚠️ Office towers require curtain wall expertise — only 4-5 contractors in Pakistan have full capability.`
      );
      insights.push(
        `Central HVAC is mandatory for buildings above 6 floors. Allocate Rs 350-450 per sqft.`
      );
      insights.push(
        `LEED certification adds 8-12% to cost but commands 15-25% rental premium.`
      );
      break;

    case 'warehouse':
      insights.push(
        `Pre-engineered steel buildings (PEB) cost 30-40% less than RCC for warehouses. Erection time: 2-3 months.`
      );
      insights.push(
        `Industrial floor with rebar mesh + 6" thickness handles forklift loads. Cheaper to over-spec than fix later.`
      );
      break;

    case 'industrial_building':
      insights.push(
        `Get utility load approval BEFORE construction — 3-phase industrial connections take 4-8 months.`
      );
      insights.push(
        `EPA NOC required for any industrial unit. Allocate Rs 2-5 Lac for environmental compliance consultancy.`
      );
      break;

    case 'cold_storage':
      insights.push(
        `Refrigeration plant is 40-50% of total cost. Get quotes from Krones, GEA, or local PEL/Haier industrial.`
      );
      insights.push(
        `Backup power MANDATORY. A 24-hour power outage can destroy entire stock. Generator + auto-transfer switch essential.`
      );
      break;

    case 'workshop':
      insights.push(
        `Industrial 3-phase electrical is often 25% of cost. Plan welding sockets + compressed air lines during construction.`
      );
      break;

    case 'shops_plus_apartments':
      insights.push(
        `Ground floor shops typically generate 60-70% of total project rent. Don't compromise on shopfront design.`
      );
      insights.push(
        `Plan separate water tanks + electrical meters for commercial vs residential floors.`
      );
      break;

    case 'complete_mixed_tower':
      insights.push(
        `⚠️ Mixed-use towers are the MOST complex residential/commercial projects. Hire a PMC (Project Management Consultant).`
      );
      insights.push(
        `Different floors need different finishing — segregate construction phases to avoid contractor confusion.`
      );
      break;
  }

  // ─── Construction type insights ───────────────────────────
  if (input.constructionType === 'grey_structure' && meta.supportsFinishing) {
    insights.push(
      `Grey structure only — add ~40-60% more budget for finishing later. Phased construction is common in Pakistan.`
    );
  } else if (input.constructionType === 'turnkey') {
    insights.push(
      `Turnkey includes everything ready-to-move-in. Get fixed-price contracts with milestone payments.`
    );
  }

  // ─── Cost-saving universal tip ────────────────────────────
  if (input.quality !== 'luxury' && totalCost < 50000000) {
    insights.push(
      `💡 Buy materials directly from authorized dealers to save 8-15% vs contractor markup.`
    );
  }

  // ─── Engineer inspection tip ──────────────────────────────
  if (meta.requiresEngineerNote || input.floors >= 3) {
    insights.push(
      `✅ Hire an independent civil engineer for slab + structural inspections. Costs Rs 50,000-2,00,000 but prevents major issues.`
    );
  }

  // ─── Market timing ────────────────────────────────────────
  insights.push(
    `📊 Material rates updated ${RATES_VERSION}. Steel prices recently fluctuated — lock in major orders early.`
  );

  // Trim to 7 max
  return insights.slice(0, 7);
}

// ═══════════════════════════════════════════════════════════════
// ENGINEER NOTE GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateEngineerNote(subType: PropertySubType, floors: number): string {
  if (subType === 'highrise_apartment_building' || subType === 'highrise_office_tower') {
    return `This is a highrise structure (${floors} floors). Pakistan Engineering Council (PEC) requires certified structural engineer review for buildings above 4 floors. Budget Rs 5-15 Lac for structural design + supervision.`;
  }

  if (subType === 'complete_mixed_tower') {
    return `Mixed-use towers combine residential, commercial, and parking — each with different load requirements. A PEC-certified structural engineer + MEP consultant are MANDATORY. Budget Rs 15-30 Lac for full consultancy.`;
  }

  if (subType === 'industrial_building' || subType === 'cold_storage') {
    return `Industrial buildings have specialized requirements (machine foundations, insulation, electrical loads). Hire an industrial engineering consultant. Budget Rs 3-10 Lac for design + EPA NOC.`;
  }

  if (floors >= 3) {
    return `Multi-storey construction (${floors} floors) requires structural engineer review. Budget Rs 1-3 Lac for design + supervision.`;
  }

  return '';
}

// ═══════════════════════════════════════════════════════════════
// MATERIAL RATES (City-Adjusted)
// ═══════════════════════════════════════════════════════════════

function getCityAdjustedMaterialRates(
  cityMultiplier: number,
  subType: PropertySubType
): MaterialRate[] {
  const meta = SUB_TYPE_METADATA[subType];

  return MATERIAL_RATES
    // Filter out finishing materials if industrial (no finishing)
    .filter((m) => {
      if (!meta.supportsFinishing && m.category === 'finishing') return false;
      return true;
    })
    // Adjust price by city multiplier
    .map((m) => ({
      ...m,
      pricePKR: Math.round(m.pricePKR * cityMultiplier),
    }));
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE — Standard Calculation
// ═══════════════════════════════════════════════════════════════

function calculateStandard(input: EngineInput): EngineResult {
  const meta = SUB_TYPE_METADATA[input.subType];
  const cityMultiplier = getCityMultiplier(input.city, input.subType);

  // ─── Area calculations ───────────────────────────────────
  const plotSizeSqft = toSqft(input.size, input.sizeUnit);
  const coverageRatio = meta.coverageRatio;
  const coveredAreaPerFloor = plotSizeSqft * coverageRatio;
  const totalCoveredSqft = Math.round(coveredAreaPerFloor * input.floors);

  // ─── Per-sqft cost ───────────────────────────────────────
  const { perSqft: rawPerSqft, breakdown: rawBreakdown } = getPerSqftCost(
    input.subType,
    input.quality,
    input.constructionType
  );
  const adjustedPerSqft = Math.round(rawPerSqft * cityMultiplier);

  // ─── Base cost ───────────────────────────────────────────
  const baseCost = adjustedPerSqft * totalCoveredSqft;

  // ─── Add-ons ─────────────────────────────────────────────
  const addOns: AddOnBreakdown = {};
  let addOnsCost = 0;

  if (input.includeBoundaryWall && meta.supportsBoundaryWall) {
    addOns.boundaryWall = calculateBoundaryWall(plotSizeSqft, input.quality, cityMultiplier);
    addOnsCost += addOns.boundaryWall;
  }

  if (input.includeBasement && meta.supportsBasement) {
    addOns.basement = calculateBasement(coveredAreaPerFloor, input.quality, cityMultiplier);
    addOnsCost += addOns.basement;
  }

  if (input.elevatorCount && input.elevatorCount > 0 && meta.supportsElevators) {
    addOns.elevators = calculateElevators(input.elevatorCount, input.quality, cityMultiplier);
    addOnsCost += addOns.elevators;
  }

  if (input.parkingSlots && input.parkingSlots > 0 && meta.supportsParking) {
    addOns.parking = calculateParking(input.parkingSlots, input.quality, cityMultiplier);
    addOnsCost += addOns.parking;
  }

  if (input.generatorKVA && input.generatorKVA > 0) {
    addOns.generator = calculateGenerator(input.generatorKVA, input.quality, cityMultiplier);
    addOnsCost += addOns.generator;
  }

  if (input.hvacIncluded && meta.supportsHVAC) {
    addOns.hvac = calculateHVAC(totalCoveredSqft, input.quality, cityMultiplier);
    addOnsCost += addOns.hvac;
  }

  // ─── Total ───────────────────────────────────────────────
  const totalCost = baseCost + addOnsCost;

  // ─── Per-unit costs ──────────────────────────────────────
  const costPerSqft = adjustedPerSqft;
  const costPerMarla = Math.round(adjustedPerSqft * SIZE_TO_SQFT['Marla']);

  // ─── Confidence + range ──────────────────────────────────
  const confidenceLevel = calculateConfidence(input.subType);
  const { min: costMin, max: costMax } = calculateRange(totalCost, confidenceLevel);

  // ─── Breakdown ───────────────────────────────────────────
  const breakdown: CostBreakdownItem[] = rawBreakdown.map((b) => ({
    category: b.category,
    description: b.description,
    amount: Math.round((baseCost * b.percentage) / 100),
    percentage: parseFloat(b.percentage.toFixed(1)),
  }));

  // Append add-ons to breakdown
  if (addOns.boundaryWall) {
    breakdown.push({
      category: 'Boundary Wall',
      description: 'Perimeter wall with gate',
      amount: addOns.boundaryWall,
      percentage: parseFloat(((addOns.boundaryWall / totalCost) * 100).toFixed(1)),
    });
  }
  if (addOns.basement) {
    breakdown.push({
      category: 'Basement',
      description: 'Underground floor with waterproofing',
      amount: addOns.basement,
      percentage: parseFloat(((addOns.basement / totalCost) * 100).toFixed(1)),
    });
  }
  if (addOns.elevators) {
    breakdown.push({
      category: `Elevators (${input.elevatorCount})`,
      description: 'Passenger lifts with installation',
      amount: addOns.elevators,
      percentage: parseFloat(((addOns.elevators / totalCost) * 100).toFixed(1)),
    });
  }
  if (addOns.parking) {
    breakdown.push({
      category: `Parking (${input.parkingSlots} slots)`,
      description: 'Vehicle parking infrastructure',
      amount: addOns.parking,
      percentage: parseFloat(((addOns.parking / totalCost) * 100).toFixed(1)),
    });
  }
  if (addOns.generator) {
    breakdown.push({
      category: `Generator (${input.generatorKVA} KVA)`,
      description: 'Backup power system',
      amount: addOns.generator,
      percentage: parseFloat(((addOns.generator / totalCost) * 100).toFixed(1)),
    });
  }
  if (addOns.hvac) {
    breakdown.push({
      category: 'HVAC System',
      description: 'Air conditioning + ventilation',
      amount: addOns.hvac,
      percentage: parseFloat(((addOns.hvac / totalCost) * 100).toFixed(1)),
    });
  }

  // ─── Timeline ────────────────────────────────────────────
  const timelineMonths = calculateTimeline(
    input.subType,
    input.floors,
    input.quality,
    totalCoveredSqft
  );

  // ─── Material rates (city-adjusted, filtered by typology) ──
  const materialRates = getCityAdjustedMaterialRates(cityMultiplier, input.subType);

  // ─── Insights ────────────────────────────────────────────
  const insights = generateInsights(input, cityMultiplier, totalCost);

  // ─── Engineer note ───────────────────────────────────────
  const engineerNoteText = meta.requiresEngineerNote || input.floors >= 3
    ? generateEngineerNote(input.subType, input.floors)
    : undefined;

  // ─── Final result ────────────────────────────────────────
  return {
    // Input echo
    city: input.city,
    subType: input.subType,
    subTypeDisplayName: meta.displayName,
    category: meta.category,
    quality: input.quality,
    constructionType: input.constructionType,
    floors: input.floors,

    // Areas
    plotSizeSqft: Math.round(plotSizeSqft),
    coveredAreaPerFloor: Math.round(coveredAreaPerFloor),
    totalCoveredSqft,
    coverageRatio,

    // Cost
    baseCost,
    addOnsCost,
    totalCost,
    costPerSqft,
    costPerMarla,
    costMin,
    costMax,
    confidenceLevel,

    // Breakdown
    breakdown,
    addOns,

    // Timeline
    timelineMonths,

    // Material rates
    materialRates,

    // Engineer
    requiresEngineerNote: meta.requiresEngineerNote || input.floors >= 3,
    engineerNoteText,

    // Insights
    insights,

    // Meta
    lastUpdated: RATES_LAST_UPDATED,
    ratesVersion: RATES_VERSION,
    validUntil: RATES_VALID_UNTIL,
    cityMultiplier: parseFloat(cityMultiplier.toFixed(2)),
  };
}

// ═══════════════════════════════════════════════════════════════
// MIXED-USE COMPOSITE ENGINE
// (Calculates weighted commercial + residential then merges)
// ═══════════════════════════════════════════════════════════════

function calculateMixedUse(input: EngineInput): EngineResult {
  // For mixed-use, we run the standard engine with the mixed-use sub-type
  // The SUB_TYPE_RATES already contain weighted rates (e.g. shops_plus_apartments
  // already has composite rates baked in). So we just use standard calculation
  // but bump the insights with mixed-use specific advice.

  const result = calculateStandard(input);

  // Add mixed-use specific note at top of insights
  const groundFloorPct = input.groundFloorCommercialPct ?? 25;

  const mixedInsight = `Mixed-use layout assumed: ${groundFloorPct}% ground floor commercial (shops/retail) + ${100 - groundFloorPct}% residential above. Adjust ratio in your design for cost variation.`;

  result.insights = [mixedInsight, ...result.insights].slice(0, 7);

  return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════

/**
 * Main calculation entry point.
 * Routes to typology-specific engine based on sub-type category.
 *
 * @param input - Validated EngineInput
 * @returns EngineResult with full cost breakdown
 * @throws Error if input is invalid (caller should validate first with Zod)
 */
export function calculateConstruction(input: EngineInput): EngineResult {
  const meta = SUB_TYPE_METADATA[input.subType];

  // Validate floors are within typology limits
  if (input.floors < meta.minFloors) {
    throw new Error(
      `${meta.displayName} requires minimum ${meta.minFloors} floor(s). You entered ${input.floors}.`
    );
  }

  if (input.floors > meta.maxFloors) {
    throw new Error(
      `${meta.displayName} supports maximum ${meta.maxFloors} floor(s). You entered ${input.floors}.`
    );
  }

  // Validate plot size is reasonable (between 1 marla and 100 kanal)
  const plotSqft = toSqft(input.size, input.sizeUnit);
  if (plotSqft < 200) {
    throw new Error('Plot size too small. Minimum 1 Marla (272 sqft) required.');
  }
  if (plotSqft > 540000) {
    throw new Error('Plot size too large. Maximum 100 Kanal supported.');
  }

  // Route to category-specific engine
  switch (meta.category) {
    case 'mixed_use':
      return calculateMixedUse(input);

    case 'residential':
    case 'commercial':
    case 'industrial':
    default:
      return calculateStandard(input);
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS (Re-exports for convenience)
// ═══════════════════════════════════════════════════════════════

export {
  SUB_TYPE_METADATA,
  SUB_TYPE_RATES,
} from '@/lib/constructionRates';

// ========== END OF FILE ==========