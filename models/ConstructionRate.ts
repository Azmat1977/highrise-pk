// ========== FILE: models/ConstructionRate.ts ==========
// 🏗️ CONSTRUCTION RATE OVERRIDE MODEL — HIGHRISE.PK
// Admin-managed rate overrides for material prices + per-sqft rates
//
// Strategy: 3-tier rate system
//   TIER 1: Hardcoded baseline (lib/constructionRates.ts) — always works
//   TIER 2: Admin overrides (THIS MODEL) — admin updates monthly/weekly
//   TIER 3: Crowdsourced (future Phase 3) — verified contractors submit
//
// Override Types:
//   - 'material'    → Override a specific material price (e.g. Cement bag)
//   - 'per_sqft'    → Override per-sqft rate for a sub-type + quality
//   - 'city_multiplier' → Override city multiplier for a typology
//   - 'add_on'      → Override add-on cost (elevator, generator, etc.)
//
// Scoping (priority order):
//   1. City-specific override (highest priority)
//   2. Global override (no city = applies everywhere)
//
// Lifecycle:
//   - active: true  → Override is applied
//   - active: false → Override is paused (admin can re-enable)
//   - validUntil: auto-expire date (admin reviewed reminder)
// ═══════════════════════════════════════════════════════════════════════════

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type RateOverrideType =
  | 'material'           // Override material price
  | 'per_sqft'           // Override per-sqft construction rate
  | 'city_multiplier'    // Override city multiplier
  | 'add_on';            // Override add-on cost (elevator, basement, etc.)

export type RateCity =
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

export type RateQuality = 'standard' | 'premium' | 'luxury';
export type RateConstructionType = 'grey_structure' | 'finishing';

export type RatePropertySubType =
  | 'house'
  | 'villa'
  | 'farmhouse'
  | 'highrise_apartment_building'
  | 'shop_showroom'
  | 'commercial_plaza'
  | 'office_building'
  | 'highrise_office_tower'
  | 'warehouse'
  | 'industrial_building'
  | 'cold_storage'
  | 'workshop'
  | 'shops_plus_apartments'
  | 'complete_mixed_tower';

export type AddOnKind =
  | 'boundary_wall'      // Per running ft
  | 'basement'           // Per sqft
  | 'elevator'           // Per unit
  | 'parking'            // Per slot
  | 'generator'          // Per KVA
  | 'hvac';              // Per sqft

export type RateTrend = 'up' | 'down' | 'stable';

// ─── History Entry (Audit Trail) ──────────────────────────────
export interface IRateHistory {
  oldValue: number;
  newValue: number;
  changedBy: Types.ObjectId;
  changedByEmail?: string;
  changedAt: Date;
  changeReason?: string;
  changePercent: number;
}

// ─── Main Document Interface ──────────────────────────────────
export interface IConstructionRate extends Document {
  // Type of override
  overrideType: RateOverrideType;

  // Scoping
  city?: RateCity;                          // Optional — global if missing
  subType?: RatePropertySubType;            // Required for per_sqft + city_multiplier
  quality?: RateQuality;                    // Required for per_sqft + add_on
  constructionType?: RateConstructionType;  // Required for per_sqft (grey/finishing)
  materialKey?: string;                     // Required for material (e.g. "cement_opc")
  addOnKind?: AddOnKind;                    // Required for add_on

  // Display info (denormalized for admin UI)
  displayName: string;                      // e.g. "Cement (OPC)" or "House — Standard Grey"
  unit?: string;                            // e.g. "per 50kg bag" — for materials only

  // The actual override value
  value: number;                            // The override amount in PKR

  // Material-only fields
  trend?: RateTrend;
  changePercent?: number;

  // Lifecycle
  active: boolean;
  validFrom: Date;
  validUntil?: Date;                        // Optional expiry

  // Source attribution
  source: string;                           // e.g. "Cement Dealer Survey", "PEC Q1 2025"
  sourceUrl?: string;
  notes?: string;                           // Admin notes

  // Audit
  createdBy: Types.ObjectId;
  createdByEmail?: string;
  lastUpdatedBy?: Types.ObjectId;
  lastUpdatedByEmail?: string;
  history: IRateHistory[];

  // Timestamps (auto)
  createdAt: Date;
  updatedAt: Date;
}

// ─── Model Statics ────────────────────────────────────────────
export interface IConstructionRateModel extends Model<IConstructionRate> {
  /**
   * Find active override for material in a specific city.
   * Falls back to global override if no city-specific exists.
   */
  findActiveMaterialOverride(
    materialKey: string,
    city?: RateCity
  ): Promise<IConstructionRate | null>;

  /**
   * Find active override for per-sqft rate.
   */
  findActivePerSqftOverride(
    subType: RatePropertySubType,
    quality: RateQuality,
    constructionType: RateConstructionType,
    city?: RateCity
  ): Promise<IConstructionRate | null>;

  /**
   * Find active override for city multiplier.
   */
  findActiveCityMultiplierOverride(
    city: RateCity,
    subType: RatePropertySubType
  ): Promise<IConstructionRate | null>;

  /**
   * Find active override for add-on cost.
   */
  findActiveAddOnOverride(
    addOnKind: AddOnKind,
    quality: RateQuality,
    city?: RateCity
  ): Promise<IConstructionRate | null>;

  /**
   * Get all active overrides (for admin dashboard).
   */
  findAllActive(): Promise<IConstructionRate[]>;
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA — History (Sub-Document)
// ═══════════════════════════════════════════════════════════════

const RateHistorySchema = new Schema<IRateHistory>(
  {
    oldValue: { type: Number, required: true },
    newValue: { type: Number, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedByEmail: { type: String, trim: true, lowercase: true },
    changedAt: { type: Date, default: Date.now, required: true },
    changeReason: { type: String, trim: true, maxlength: 500 },
    changePercent: { type: Number, required: true },
  },
  { _id: false }
);

// ═══════════════════════════════════════════════════════════════
// SCHEMA — Main
// ═══════════════════════════════════════════════════════════════

const ConstructionRateSchema = new Schema<IConstructionRate, IConstructionRateModel>(
  {
    // Type
    overrideType: {
      type: String,
      enum: ['material', 'per_sqft', 'city_multiplier', 'add_on'],
      required: true,
      index: true,
    },

    // Scoping
    city: {
      type: String,
      enum: [
        'Lahore', 'Islamabad', 'Rawalpindi', 'Karachi', 'Faisalabad',
        'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Quetta',
      ],
      index: true,
    },
    subType: {
      type: String,
      enum: [
        'house', 'villa', 'farmhouse', 'highrise_apartment_building',
        'shop_showroom', 'commercial_plaza', 'office_building', 'highrise_office_tower',
        'warehouse', 'industrial_building', 'cold_storage', 'workshop',
        'shops_plus_apartments', 'complete_mixed_tower',
      ],
      index: true,
    },
    quality: {
      type: String,
      enum: ['standard', 'premium', 'luxury'],
    },
    constructionType: {
      type: String,
      enum: ['grey_structure', 'finishing'],
    },
    materialKey: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
    },
    addOnKind: {
      type: String,
      enum: ['boundary_wall', 'basement', 'elevator', 'parking', 'generator', 'hvac'],
    },

    // Display
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    // Value
    value: {
      type: Number,
      required: true,
      min: 0,
    },

    // Material trend
    trend: {
      type: String,
      enum: ['up', 'down', 'stable'],
    },
    changePercent: {
      type: Number,
      min: -100,
      max: 1000,
    },

    // Lifecycle
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    validFrom: {
      type: Date,
      default: Date.now,
      required: true,
    },
    validUntil: Date,

    // Source
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    sourceUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Audit
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastUpdatedByEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    history: {
      type: [RateHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'construction_rates',
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES — Compound for fast lookups
// ═══════════════════════════════════════════════════════════════

// Material lookup: by material key + city (or global)
ConstructionRateSchema.index(
  { overrideType: 1, materialKey: 1, city: 1, active: 1 },
  { name: 'idx_material_lookup' }
);

// Per-sqft lookup: by subType + quality + constructionType + city
ConstructionRateSchema.index(
  { overrideType: 1, subType: 1, quality: 1, constructionType: 1, city: 1, active: 1 },
  { name: 'idx_per_sqft_lookup' }
);

// City multiplier lookup
ConstructionRateSchema.index(
  { overrideType: 1, city: 1, subType: 1, active: 1 },
  { name: 'idx_city_multiplier_lookup' }
);

// Add-on lookup
ConstructionRateSchema.index(
  { overrideType: 1, addOnKind: 1, quality: 1, city: 1, active: 1 },
  { name: 'idx_addon_lookup' }
);

// Admin dashboard — recently updated
ConstructionRateSchema.index({ updatedAt: -1 });

// Auto-expire detection
ConstructionRateSchema.index({ validUntil: 1, active: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Days since last update (for "stale rate" warnings in admin)
ConstructionRateSchema.virtual('daysSinceUpdate').get(function (this: IConstructionRate): number {
  const now = Date.now();
  const updated = this.updatedAt?.getTime() ?? now;
  return Math.floor((now - updated) / (1000 * 60 * 60 * 24));
});

// Is this override expired?
ConstructionRateSchema.virtual('isExpired').get(function (this: IConstructionRate): boolean {
  if (!this.validUntil) return false;
  return this.validUntil.getTime() < Date.now();
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

ConstructionRateSchema.pre('save', function (next) {
  // Validate required fields by overrideType
  switch (this.overrideType) {
    case 'material':
      if (!this.materialKey) {
        return next(new Error('materialKey is required for material override'));
      }
      if (!this.unit) {
        return next(new Error('unit is required for material override'));
      }
      break;

    case 'per_sqft':
      if (!this.subType || !this.quality || !this.constructionType) {
        return next(
          new Error('subType, quality, and constructionType are required for per_sqft override')
        );
      }
      break;

    case 'city_multiplier':
      if (!this.city || !this.subType) {
        return next(new Error('city and subType are required for city_multiplier override'));
      }
      // City multipliers should be sane (0.5 - 2.0 typically)
      if (this.value < 0.3 || this.value > 3.0) {
        return next(
          new Error('city_multiplier value must be between 0.3 and 3.0')
        );
      }
      break;

    case 'add_on':
      if (!this.addOnKind || !this.quality) {
        return next(new Error('addOnKind and quality are required for add_on override'));
      }
      break;
  }

  next();
});

// ═══════════════════════════════════════════════════════════════
// STATICS — Lookup helpers
// ═══════════════════════════════════════════════════════════════

ConstructionRateSchema.statics.findActiveMaterialOverride = async function (
  materialKey: string,
  city?: RateCity
): Promise<IConstructionRate | null> {
  const now = new Date();

  // Try city-specific first (higher priority)
  if (city) {
    const cityOverride = await this.findOne({
      overrideType: 'material',
      materialKey: materialKey.toLowerCase(),
      city,
      active: true,
      validFrom: { $lte: now },
      $or: [{ validUntil: { $exists: false } }, { validUntil: { $gt: now } }],
    }).lean();
    if (cityOverride) return cityOverride as unknown as IConstructionRate;
  }

  // Fall back to global
  const globalOverride = await this.findOne({
    overrideType: 'material',
    materialKey: materialKey.toLowerCase(),
    city: { $exists: false },
    active: true,
    validFrom: { $lte: now },
    $or: [{ validUntil: { $exists: false } }, { validUntil: { $gt: now } }],
  }).lean();

  return (globalOverride as unknown as IConstructionRate) || null;
};

ConstructionRateSchema.statics.findActivePerSqftOverride = async function (
  subType: RatePropertySubType,
  quality: RateQuality,
  constructionType: RateConstructionType,
  city?: RateCity
): Promise<IConstructionRate | null> {
  const now = new Date();
  const baseQuery = {
    overrideType: 'per_sqft',
    subType,
    quality,
    constructionType,
    active: true,
    validFrom: { $lte: now },
    $or: [{ validUntil: { $exists: false } }, { validUntil: { $gt: now } }],
  };

  // City-specific first
  if (city) {
    const cityOverride = await this.findOne({ ...baseQuery, city }).lean();
    if (cityOverride) return cityOverride as unknown as IConstructionRate;
  }

  // Global fallback
  const globalOverride = await this.findOne({
    ...baseQuery,
    city: { $exists: false },
  }).lean();

  return (globalOverride as unknown as IConstructionRate) || null;
};

ConstructionRateSchema.statics.findActiveCityMultiplierOverride = async function (
  city: RateCity,
  subType: RatePropertySubType
): Promise<IConstructionRate | null> {
  const now = new Date();
  const override = await this.findOne({
    overrideType: 'city_multiplier',
    city,
    subType,
    active: true,
    validFrom: { $lte: now },
    $or: [{ validUntil: { $exists: false } }, { validUntil: { $gt: now } }],
  }).lean();

  return (override as unknown as IConstructionRate) || null;
};

ConstructionRateSchema.statics.findActiveAddOnOverride = async function (
  addOnKind: AddOnKind,
  quality: RateQuality,
  city?: RateCity
): Promise<IConstructionRate | null> {
  const now = new Date();
  const baseQuery = {
    overrideType: 'add_on',
    addOnKind,
    quality,
    active: true,
    validFrom: { $lte: now },
    $or: [{ validUntil: { $exists: false } }, { validUntil: { $gt: now } }],
  };

  if (city) {
    const cityOverride = await this.findOne({ ...baseQuery, city }).lean();
    if (cityOverride) return cityOverride as unknown as IConstructionRate;
  }

  const globalOverride = await this.findOne({
    ...baseQuery,
    city: { $exists: false },
  }).lean();

  return (globalOverride as unknown as IConstructionRate) || null;
};

ConstructionRateSchema.statics.findAllActive = async function (): Promise<IConstructionRate[]> {
  const now = new Date();
  const results = await this.find({
    active: true,
    validFrom: { $lte: now },
    $or: [{ validUntil: { $exists: false } }, { validUntil: { $gt: now } }],
  })
    .sort({ updatedAt: -1 })
    .lean();

  return results as unknown as IConstructionRate[];
};

// ═══════════════════════════════════════════════════════════════
// MODEL
// ═══════════════════════════════════════════════════════════════

const ConstructionRate: IConstructionRateModel =
  (mongoose.models.ConstructionRate as IConstructionRateModel) ||
  mongoose.model<IConstructionRate, IConstructionRateModel>(
    'ConstructionRate',
    ConstructionRateSchema
  );

export default ConstructionRate;

// ═══════════════════════════════════════════════════════════════
// MATERIAL KEY CONSTANTS (For API + Admin Reference)
// Use these EXACT keys when creating material overrides
// ═══════════════════════════════════════════════════════════════

export const MATERIAL_KEYS = {
  CEMENT_OPC: 'cement_opc',
  STEEL_SARIA: 'steel_saria',
  BRICKS_1ST_CLASS: 'bricks_1st_class',
  SAND_LAWRENCEPUR: 'sand_lawrencepur',
  CRUSH_MARGALLA: 'crush_margalla',
  CONCRETE_BLOCKS: 'concrete_blocks_solid',
  TILES_STANDARD: 'tiles_standard',
  TILES_VITRIFIED: 'tiles_vitrified',
  MARBLE_BOTTICINO: 'marble_botticino',
  PAINT_EMULSION: 'paint_premium_emulsion',
  WOOD_TEAK: 'wood_teak_burma',
  WOOD_DEODAR: 'wood_local_deodar',
  COPPER_WIRE: 'copper_wire_7_29',
  PVC_PIPES: 'pvc_pipes_4_inch',
  LABOR_MASON: 'labor_skilled_mason',
  LABOR_UNSKILLED: 'labor_unskilled',
  LABOR_ELECTRICIAN: 'labor_electrician',
} as const;

export type MaterialKey = typeof MATERIAL_KEYS[keyof typeof MATERIAL_KEYS];

// ========== END OF FILE ==========