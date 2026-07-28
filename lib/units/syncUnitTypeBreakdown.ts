// lib/units/syncUnitTypeBreakdown.ts
/**
 * ============================================================================
 * UNIT TYPE BREAKDOWN AUTO-SYNC UTILITY (Highrise.pk Industry-First)
 * ============================================================================
 *
 * This utility maintains the live aggregation of unit-level data into
 * project.unitTypeBreakdown[] — the rich summary cards shown on every
 * project page (replaces Zameen's static "PKR X – Y Cr" approach).
 *
 * AUTO-AGGREGATED FIELDS (30+ per type):
 *   ✅ Inventory counts (total, sold, available, reserved, on_hold, cancelled)
 *   ✅ Price ranges (priceRange, pricePerSqftRange)
 *   ✅ Area ranges (primary unit + Marla + Sqft)
 *   ✅ Investment metrics (avg yield, avg rent, score)
 *   ✅ Selling velocity (last30/60 days — honest urgency)
 *   ✅ Floor availability (which floors have available units)
 *   ✅ Engagement metrics (views, inquiries, popularity)
 *   ✅ Activity timestamps (last sold, last added, last synced)
 *   ✅ Hot deals count (price-dropped units)
 *
 * THREE EXPORTED FUNCTIONS:
 *   1. syncUnitTypeBreakdown(projectId)
 *      → Recalculates project.unitTypeBreakdown[] from all units
 *      → Call after: Unit create / update / delete / status change
 *
 *   2. denormalizeProjectToUnits(projectId)
 *      → Pushes project fields (slug, name, city, areaName, badge,
 *        contactVisibility) to all units of that project
 *      → Call after: Project PATCH (slug, badge, location, plan change)
 *
 *   3. expireStaleReservations(projectId?)
 *      → Lazy-checks reservedUntil < now()
 *      → Auto-reverts expired reservations: status → 'available'
 *      → Call from: cron job (hourly) or lazy on GET endpoints
 *
 * WHERE TO CALL FROM (Option B — API Layer):
 *   ─────────────────────────────────────────────────────────────────
 *   POST   /api/projects/[id]/units              → syncUnitTypeBreakdown
 *   PATCH  /api/projects/[id]/units/[unitId]     → syncUnitTypeBreakdown
 *   DELETE /api/projects/[id]/units/[unitId]     → syncUnitTypeBreakdown
 *   PATCH  /api/projects/[id]/units/[unitId]/status → syncUnitTypeBreakdown
 *   PATCH  /api/projects/[id]                    → denormalizeProjectToUnits
 *   PATCH  /api/admin/projects/[id]              → denormalizeProjectToUnits
 *   GET    /api/projects/[id] (cached <2min)     → expireStaleReservations (lazy)
 *
 * DESIGN PRINCIPLES:
 *   ✅ Idempotent — running twice produces same result
 *   ✅ Atomic — try/catch, never throws to caller (returns result object)
 *   ✅ Logged — all errors logged via logSecurityEvent
 *   ✅ Performant — single aggregation pipeline + bulkWrite
 *   ✅ Pakistani context — Marla ↔ Sqft conversion built-in
 *   ✅ Honest urgency — selling velocity from REAL data
 *
 * @see models/Project.ts (unitTypeBreakdown schema)
 * @see models/Unit.ts (denormalized fields)
 * ============================================================================
 */

import mongoose, { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Pakistani area conversion constants (Lahore standard).
 * 1 Marla = 272.25 sqft
 * 1 Kanal = 20 Marla = 5,445 sqft
 */
const SQFT_PER_MARLA = 272.25;

/**
 * Velocity thresholds — "Selling fast" badge triggers.
 * If sold count in last 30 days >= this → isFastSelling = true
 */
const FAST_SELLING_THRESHOLD_30D = 5;
const FAST_SELLING_THRESHOLD_60D = 10;

/**
 * Popularity score weights — composite 0-100 score.
 */
const POPULARITY_WEIGHTS = {
  viewWeight: 0.3,      // 30% weight to views
  inquiryWeight: 0.5,   // 50% weight to inquiries (higher intent)
  favoriteWeight: 0.2,  // 20% weight to favorites
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SyncResult {
  success: boolean;
  projectId: string;
  unitTypesProcessed: number;
  totalUnitsProcessed: number;
  syncDurationMs: number;
  error?: string;
}

export interface DenormalizeResult {
  success: boolean;
  projectId: string;
  unitsUpdated: number;
  syncDurationMs: number;
  error?: string;
}

export interface ExpireReservationsResult {
  success: boolean;
  expiredCount: number;
  syncDurationMs: number;
  projectId?: string;
  error?: string;
}

interface UnitAggregateRow {
  _id: string; // unitType (e.g., 'apartment_2bed', 'shop')
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
  onHoldUnits: number;
  cancelledUnits: number;
  minPrice: number;
  maxPrice: number;
  minPricePerSqft: number;
  maxPricePerSqft: number;
  minArea: number;
  maxArea: number;
  areaUnit: string;
  bedrooms: number | null;
  bathrooms: number | null;
  avgRentalYield: number | null;
  avgMonthlyRent: number | null;
  investmentScores: string[];
  floorsAvailable: string[];
  parkingIncluded: boolean;
  parkingSpacesPerUnit: number | null;
  hotDealsCount: number;
  soldInLast30Days: number;
  soldInLast60Days: number;
  totalViews: number;
  totalInquiries: number;
  totalFavorites: number;
  lastSoldDate: Date | null;
  lastUnitAddedDate: Date | null;
  bookingAmount: number | null;
  bookingPercent: number | null;
  monthlyInstallment: number | null;
  installmentMonths: number | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert area to Marla (Pakistani standard).
 */
function convertToMarla(area: number, unit: string): number {
  const normalized = String(unit || '').toLowerCase().replace(/[.\s]/g, '');
  if (normalized === 'sqft' || normalized === 'sqfeet' || normalized === 'squarefeet') {
    return Math.round((area / SQFT_PER_MARLA) * 100) / 100;
  }
  if (normalized === 'marla') return area;
  if (normalized === 'kanal') return area * 20;
  return area; // Unknown unit — return as-is
}

/**
 * Convert area to Sqft (investor standard).
 */
function convertToSqft(area: number, unit: string): number {
  const normalized = String(unit || '').toLowerCase().replace(/[.\s]/g, '');
  if (normalized === 'marla') return Math.round(area * SQFT_PER_MARLA);
  if (normalized === 'kanal') return Math.round(area * 20 * SQFT_PER_MARLA);
  if (normalized === 'sqft' || normalized === 'sqfeet' || normalized === 'squarefeet') {
    return area;
  }
  return area;
}

/**
 * Calculate most common investment score from array.
 */
function modeInvestmentScore(
  scores: string[]
): 'low' | 'medium' | 'high' | 'excellent' | undefined {
  if (!Array.isArray(scores) || scores.length === 0) return undefined;
  const counts: Record<string, number> = {};
  for (const s of scores) {
    if (!s) continue;
    counts[s] = (counts[s] || 0) + 1;
  }
  let maxCount = 0;
  let mode: string | undefined;
  for (const [key, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mode = key;
    }
  }
  if (mode && ['low', 'medium', 'high', 'excellent'].includes(mode)) {
    return mode as 'low' | 'medium' | 'high' | 'excellent';
  }
  return undefined;
}

/**
 * Compress floor list into ranges.
 * Input:  ['3','4','5','7','10','11','12']
 * Output: ['3-5', '7', '10-12']
 */
function compressFloorList(floors: string[]): string[] {
  const nums = Array.from(
    new Set(
      floors
        .map((f) => parseInt(String(f), 10))
        .filter((n) => Number.isFinite(n))
    )
  ).sort((a, b) => a - b);

  if (nums.length === 0) return [];

  const result: string[] = [];
  let start = nums[0];
  let end = nums[0];

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === end + 1) {
      end = nums[i];
    } else {
      result.push(start === end ? String(start) : `${start}-${end}`);
      start = nums[i];
      end = nums[i];
    }
  }
  result.push(start === end ? String(start) : `${start}-${end}`);
  return result;
}

/**
 * Calculate popularity score (0-100) from engagement metrics.
 */
function calculatePopularityScore(
  views: number,
  inquiries: number,
  favorites: number
): number {
  // Normalize each metric (log scale for views — large numbers should not dominate)
  const viewScore = Math.min(100, Math.log10(Math.max(1, views)) * 25);
  const inquiryScore = Math.min(100, inquiries * 5);
  const favoriteScore = Math.min(100, favorites * 10);

  const composite =
    viewScore * POPULARITY_WEIGHTS.viewWeight +
    inquiryScore * POPULARITY_WEIGHTS.inquiryWeight +
    favoriteScore * POPULARITY_WEIGHTS.favoriteWeight;

  return Math.round(Math.max(0, Math.min(100, composite)));
}

/**
 * Safe ObjectId parser.
 */
function toObjectId(id: string | Types.ObjectId): Types.ObjectId | null {
  try {
    if (id instanceof Types.ObjectId) return id;
    if (mongoose.isValidObjectId(id)) return new Types.ObjectId(id);
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// MAIN FUNCTION 1: syncUnitTypeBreakdown
// ============================================================================

/**
 * Recalculates project.unitTypeBreakdown[] from all units in project.
 *
 * Uses MongoDB aggregation pipeline for performance:
 *   - Single DB roundtrip even with 1000+ units
 *   - Group by unitType
 *   - Compute all 30+ aggregation fields
 *
 * @param projectId - Project _id to sync
 * @returns SyncResult with metrics
 *
 * @example
 *   // After creating a unit:
 *   const unit = await Unit.create({ ... });
 *   await syncUnitTypeBreakdown(unit.projectId);
 */
export async function syncUnitTypeBreakdown(
  projectId: string | Types.ObjectId
): Promise<SyncResult> {
  const startTime = Date.now();
  const projectIdStr = String(projectId);

  const result: SyncResult = {
    success: false,
    projectId: projectIdStr,
    unitTypesProcessed: 0,
    totalUnitsProcessed: 0,
    syncDurationMs: 0,
  };

  try {
    await dbConnect();

    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId) {
      result.error = 'Invalid projectId';
      result.syncDurationMs = Date.now() - startTime;
      return result;
    }

    // Load project (must exist + not deleted)
    const project = await Project.findOne({
      _id: projectObjectId,
      isDeleted: { $ne: true },
    });

    if (!project) {
      result.error = 'Project not found or deleted';
      result.syncDurationMs = Date.now() - startTime;
      return result;
    }

    // Calculate date thresholds for velocity metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    /**
     * Aggregation pipeline: group all units of this project by unitType.
     * Computes all 30+ fields in a single DB roundtrip.
     */
    const aggregateResult = (await Unit.aggregate([
      {
        $match: {
          projectId: projectObjectId,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: '$unitType',

          // Inventory counts
          totalUnits: { $sum: 1 },
          availableUnits: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
          },
          reservedUnits: {
            $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] },
          },
          soldUnits: {
            $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] },
          },
          onHoldUnits: {
            $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] },
          },
          cancelledUnits: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },

          // Price range
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          minPricePerSqft: { $min: '$pricePerUnit' },
          maxPricePerSqft: { $max: '$pricePerUnit' },

          // Area range (primary unit — taken from first doc)
          minArea: { $min: '$area' },
          maxArea: { $max: '$area' },
          areaUnit: { $first: '$areaUnit' },

          // Room config (most units in this type have same config)
          bedrooms: { $first: '$bedrooms' },
          bathrooms: { $first: '$bathrooms' },

          // Investment intelligence — averages from units that have data
          avgRentalYield: {
            $avg: '$investorIntelligence.expectedRentalYield',
          },
          avgMonthlyRent: {
            $avg: '$investorIntelligence.estimatedMonthlyRent',
          },
          investmentScores: {
            $push: '$investorIntelligence.investmentScore',
          },

          // Floors (from available units only — what buyer can actually buy)
          floorsAvailable: {
            $push: {
              $cond: [
                { $eq: ['$status', 'available'] },
                '$floorNumber',
                null,
              ],
            },
          },

          // Parking (from first doc — usually consistent per type)
          parkingIncluded: { $first: '$parkingIncluded' },
          parkingSpacesPerUnit: { $first: '$parkingSpaces' },

          // Hot deals (units with price drop flag)
          hotDealsCount: {
            $sum: { $cond: [{ $eq: ['$isPriceDropped', true] }, 1, 0] },
          },

          // Selling velocity (honest urgency from real data)
          soldInLast30Days: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'sold'] },
                    { $gte: ['$soldInfo.soldOn', thirtyDaysAgo] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          soldInLast60Days: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'sold'] },
                    { $gte: ['$soldInfo.soldOn', sixtyDaysAgo] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          // Engagement metrics
          totalViews: { $sum: '$views' },
          totalInquiries: { $sum: '$inquiryCount' },
          totalFavorites: { $sum: '$favoriteCount' },

          // Activity timestamps
          lastSoldDate: { $max: '$soldInfo.soldOn' },
          lastUnitAddedDate: { $max: '$createdAt' },

          // Quick installment reference (from first unit's installment plan)
          bookingAmount: { $first: '$installmentPlan.bookingAmount' },
          bookingPercent: { $first: '$installmentPlan.bookingPercent' },
          monthlyInstallment: { $first: '$installmentPlan.monthlyAmount' },
          installmentMonths: { $first: '$installmentPlan.monthlyCount' },
        },
      },
      { $sort: { _id: 1 } },
    ])) as UnitAggregateRow[];

    if (aggregateResult.length === 0) {
      // No units — clear unitTypeBreakdown
      project.unitTypeBreakdown = [];
      await project.save();

      result.success = true;
      result.unitTypesProcessed = 0;
      result.totalUnitsProcessed = 0;
      result.syncDurationMs = Date.now() - startTime;
      return result;
    }

    // Build new unitTypeBreakdown array
    // Cast to known shape — Mongoose subdocs lose strict typing in this context
    const existingTypes: Array<{
      type?: string;
      name?: string;
      category?: 'residential' | 'commercial';
      description?: string;
      features?: string[];
      layoutImageUrl?: string;
      layoutImagePublicId?: string;
      interiorImages?: Array<{ url: string; publicId: string; caption?: string }>;
      floorPlanPdfUrl?: string;
      floorPlanPdfPublicId?: string;
      walkthroughVideoUrl?: string;
      floorPlanUrl?: string;
      floorPlanPublicId?: string;
      floorsAssigned?: string[];
      locatedOn?: string[];
      slotCount?: number;
      slotPrice?: number;
      seoSlug?: string;
      possessionDate?: Date;
      isReadyForPossession?: boolean;
      isVerified?: boolean;
      verifiedAt?: Date;
    }> = (project.unitTypeBreakdown as unknown as Array<{ type?: string }>) || [];

    const newBreakdown = aggregateResult.map((row) => {
      // Find existing entry to preserve manually-set fields (description, features, media)
      const existing = existingTypes.find(
        (t) => t?.type === row._id
      );

      // Clean floor list (remove nulls, dedupe, compress)
      const cleanFloors = (row.floorsAvailable || [])
        .filter((f) => f !== null && f !== undefined && f !== '')
        .map((f) => String(f));
      const uniqueFloors = Array.from(new Set(cleanFloors));
      const compressedFloors = compressFloorList(uniqueFloors);

      // Area conversions
      const areaUnit = row.areaUnit || 'Sq.Ft';
      const areaRangeMarla =
        row.minArea && row.maxArea
          ? {
              min: convertToMarla(row.minArea, areaUnit),
              max: convertToMarla(row.maxArea, areaUnit),
            }
          : undefined;

      const areaRangeSqft =
        row.minArea && row.maxArea
          ? {
              min: convertToSqft(row.minArea, areaUnit),
              max: convertToSqft(row.maxArea, areaUnit),
            }
          : undefined;

      // Investment score mode
      const validScores = (row.investmentScores || []).filter(
        (s) => s && ['low', 'medium', 'high', 'excellent'].includes(s)
      );
      const investmentScoreAvg = modeInvestmentScore(validScores);

      // Velocity flags (honest urgency)
      const isFastSelling =
        (row.soldInLast30Days || 0) >= FAST_SELLING_THRESHOLD_30D ||
        (row.soldInLast60Days || 0) >= FAST_SELLING_THRESHOLD_60D;

      // Popularity score
      const popularityScore = calculatePopularityScore(
        row.totalViews || 0,
        row.totalInquiries || 0,
        row.totalFavorites || 0
      );

      return {
        // Preserved from existing (manual fields)
        type: row._id,
        name: existing?.name,
        category: existing?.category,
        description: existing?.description,
        features: existing?.features,
        layoutImageUrl: existing?.layoutImageUrl,
        layoutImagePublicId: existing?.layoutImagePublicId,
        interiorImages: existing?.interiorImages,
        floorPlanPdfUrl: existing?.floorPlanPdfUrl,
        floorPlanPdfPublicId: existing?.floorPlanPdfPublicId,
        walkthroughVideoUrl: existing?.walkthroughVideoUrl,
        floorPlanUrl: existing?.floorPlanUrl,
        floorPlanPublicId: existing?.floorPlanPublicId,
        floorsAssigned: existing?.floorsAssigned,
        locatedOn: existing?.locatedOn,
        slotCount: existing?.slotCount,
        slotPrice: existing?.slotPrice,
        seoSlug: existing?.seoSlug,
        possessionDate: existing?.possessionDate,
        isReadyForPossession: existing?.isReadyForPossession,
        isVerified: existing?.isVerified ?? false,
        verifiedAt: existing?.verifiedAt,

        // Auto-aggregated (always overwritten)
        totalUnits: row.totalUnits || 0,
        soldUnits: row.soldUnits || 0,
        availableUnits: row.availableUnits || 0,
        reservedUnits: row.reservedUnits || 0,
        onHoldUnits: row.onHoldUnits || 0,
        cancelledUnits: row.cancelledUnits || 0,

        priceRange: {
          min: row.minPrice || 0,
          max: row.maxPrice || 0,
        },
        pricePerSqftRange:
          row.minPricePerSqft && row.maxPricePerSqft
            ? {
                min: row.minPricePerSqft,
                max: row.maxPricePerSqft,
              }
            : undefined,

        areaRange:
          row.minArea && row.maxArea
            ? {
                min: row.minArea,
                max: row.maxArea,
                unit: areaUnit,
              }
            : undefined,
        areaRangeMarla,
        areaRangeSqft,

        bedrooms: row.bedrooms ?? undefined,
        bathrooms: row.bathrooms ?? undefined,

        floorsAvailable: compressedFloors,
        floorsAvailableCount: uniqueFloors.length,

        bookingAmount: row.bookingAmount ?? undefined,
        bookingPercent: row.bookingPercent ?? undefined,
        monthlyInstallment: row.monthlyInstallment ?? undefined,
        installmentMonths: row.installmentMonths ?? undefined,

        avgRentalYield:
          row.avgRentalYield !== null && row.avgRentalYield !== undefined
            ? Math.round(row.avgRentalYield * 100) / 100
            : undefined,
        avgMonthlyRent:
          row.avgMonthlyRent !== null && row.avgMonthlyRent !== undefined
            ? Math.round(row.avgMonthlyRent)
            : undefined,
        investmentScoreAvg,

        parkingIncluded: row.parkingIncluded ?? false,
        parkingSpacesPerUnit: row.parkingSpacesPerUnit ?? undefined,

        soldInLast30Days: row.soldInLast30Days || 0,
        soldInLast60Days: row.soldInLast60Days || 0,
        isFastSelling,
        hotDealsCount: row.hotDealsCount || 0,

        popularityScore,
        viewCount: row.totalViews || 0,
        inquiryCount: row.totalInquiries || 0,

        lastSoldDate: row.lastSoldDate ?? undefined,
        lastUnitAddedDate: row.lastUnitAddedDate ?? undefined,
        lastSyncedAt: new Date(),
      };
    });

    // Atomic update: overwrite entire unitTypeBreakdown array
    project.unitTypeBreakdown = newBreakdown;
    await project.save();

    result.success = true;
    result.unitTypesProcessed = newBreakdown.length;
    result.totalUnitsProcessed = aggregateResult.reduce(
      (sum, r) => sum + (r.totalUnits || 0),
      0
    );
    result.syncDurationMs = Date.now() - startTime;
    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown sync error';
    result.error = errorMsg;
    result.syncDurationMs = Date.now() - startTime;

    // Log to security event for audit trail
    try {
      await logSecurityEvent({
        type: 'system_error',
        severity: 'high',
        metadata: {
          action: 'unit_type_breakdown_sync_failed',
          success: false,
          reason: errorMsg,
          projectId: projectIdStr,
          durationMs: result.syncDurationMs,
        },
      });
    } catch {
      // Logging failure should never break the caller
    }

    return result;
  }
}

// ============================================================================
// MAIN FUNCTION 2: denormalizeProjectToUnits
// ============================================================================

/**
 * Pushes project-level fields to all units in that project.
 *
 * DENORMALIZED FIELDS:
 *   - projectSlug
 *   - projectName
 *   - city
 *   - areaName (locality name from project.area)
 *   - developerBadge
 *   - contactVisibility
 *
 * Uses bulkWrite for performance — even 1000+ units update in <1 second.
 *
 * @param projectId - Project _id whose units to update
 * @returns DenormalizeResult with metrics
 *
 * @example
 *   // After updating project slug or developer badge:
 *   await project.save();
 *   await denormalizeProjectToUnits(project._id);
 */
export async function denormalizeProjectToUnits(
  projectId: string | Types.ObjectId
): Promise<DenormalizeResult> {
  const startTime = Date.now();
  const projectIdStr = String(projectId);

  const result: DenormalizeResult = {
    success: false,
    projectId: projectIdStr,
    unitsUpdated: 0,
    syncDurationMs: 0,
  };

  try {
    await dbConnect();

    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId) {
      result.error = 'Invalid projectId';
      result.syncDurationMs = Date.now() - startTime;
      return result;
    }

    // Type-narrow the lean() result — Mongoose loses strict typing on .lean()
    const projectDoc = await Project.findOne({
      _id: projectObjectId,
      isDeleted: { $ne: true },
    }).lean();

    if (!projectDoc) {
      result.error = 'Project not found or deleted';
      result.syncDurationMs = Date.now() - startTime;
      return result;
    }

    // Cast to known fields shape (lean() returns generic FlattenMaps type)
    const project = projectDoc as unknown as {
      _id: Types.ObjectId;
      slug?: string;
      projectName?: string;
      city?: string;
      area?: string;
      developerBadge?: 'new_entrant' | 'emerging' | 'trusted' | 'premium';
      contactVisibility?: {
        plan?: 'basic' | 'premium' | 'enterprise';
        showDeveloperPhone?: boolean;
        showDeveloperWhatsapp?: boolean;
        showDeveloperEmail?: boolean;
        showDeveloperAddress?: boolean;
      };
    };

    // Build the $set payload (only fields that exist on project)
    const updateFields: Record<string, unknown> = {};
    if (project.slug) updateFields.projectSlug = project.slug;
    if (project.projectName) updateFields.projectName = project.projectName;
    if (project.city) updateFields.city = project.city;
    if (project.area) updateFields.areaName = project.area;
    if (project.developerBadge) {
      updateFields.developerBadge = project.developerBadge;
    }

    if (project.contactVisibility) {
      updateFields.contactVisibility = {
        plan: project.contactVisibility.plan || 'basic',
        showDeveloperPhone:
          project.contactVisibility.showDeveloperPhone || false,
        showDeveloperWhatsapp:
          project.contactVisibility.showDeveloperWhatsapp || false,
        showDeveloperEmail:
          project.contactVisibility.showDeveloperEmail || false,
        showDeveloperAddress:
          project.contactVisibility.showDeveloperAddress || false,
      };
    } else {
      updateFields.contactVisibility = {
        plan: 'basic',
        showDeveloperPhone: false,
        showDeveloperWhatsapp: false,
        showDeveloperEmail: false,
        showDeveloperAddress: false,
      };
    }

    // Single bulk update — atomic for all units
    const updateResult = await Unit.updateMany(
      {
        projectId: projectObjectId,
        isDeleted: { $ne: true },
      },
      { $set: updateFields }
    );

    result.success = true;
    result.unitsUpdated = updateResult.modifiedCount || 0;
    result.syncDurationMs = Date.now() - startTime;
    return result;
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Unknown denormalize error';
    result.error = errorMsg;
    result.syncDurationMs = Date.now() - startTime;

    try {
      await logSecurityEvent({
        type: 'system_error',
        severity: 'high',
        metadata: {
          action: 'project_to_units_denormalize_failed',
          success: false,
          reason: errorMsg,
          projectId: projectIdStr,
          durationMs: result.syncDurationMs,
        },
      });
    } catch {
      // Logging failure should never break the caller
    }

    return result;
  }
}

// ============================================================================
// MAIN FUNCTION 3: expireStaleReservations
// ============================================================================

/**
 * Auto-reverts expired reservations to 'available' status.
 *
 * LOGIC:
 *   For each unit where:
 *     - status === 'reserved'
 *     - bookingInfo.reservedUntil < now()
 *     - isDeleted !== true
 *   →
 *     - Set status → 'available'
 *     - Set bookingInfo.reservationExpired → true
 *     - Set lastStatusChangedAt → now
 *
 * Note: Does NOT clear reservedBy/reservedByName (audit trail kept).
 *
 * CALL FROM:
 *   - Cron job (every 1 hour recommended)
 *   - Lazy on GET /api/projects/[id] (rate-limited to avoid hammering)
 *
 * @param projectId - Optional: limit to one project (undefined = all projects)
 * @returns ExpireReservationsResult with metrics
 *
 * @example
 *   // Cron job (hourly):
 *   await expireStaleReservations();
 *
 *   // Lazy check on project view:
 *   await expireStaleReservations(projectId);
 */
export async function expireStaleReservations(
  projectId?: string | Types.ObjectId
): Promise<ExpireReservationsResult> {
  const startTime = Date.now();
  const projectIdStr = projectId ? String(projectId) : undefined;

  const result: ExpireReservationsResult = {
    success: false,
    expiredCount: 0,
    syncDurationMs: 0,
    projectId: projectIdStr,
  };

  try {
    await dbConnect();

    const now = new Date();

    // Build match query
    const matchQuery: Record<string, unknown> = {
      status: 'reserved',
      isDeleted: { $ne: true },
      'bookingInfo.reservedUntil': { $lt: now },
    };

    if (projectId) {
      const projectObjectId = toObjectId(projectId);
      if (!projectObjectId) {
        result.error = 'Invalid projectId';
        result.syncDurationMs = Date.now() - startTime;
        return result;
      }
      matchQuery.projectId = projectObjectId;
    }

    // Update all matching units atomically
    const updateResult = await Unit.updateMany(matchQuery, {
      $set: {
        status: 'available',
        'bookingInfo.reservationExpired': true,
        lastStatusChangedAt: now,
      },
    });

    result.success = true;
    result.expiredCount = updateResult.modifiedCount || 0;
    result.syncDurationMs = Date.now() - startTime;

    // If any reservations expired in a specific project → re-sync breakdown
    if (result.expiredCount > 0 && projectId) {
      await syncUnitTypeBreakdown(projectId);
    }

    return result;
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Unknown expiry sync error';
    result.error = errorMsg;
    result.syncDurationMs = Date.now() - startTime;

    try {
      await logSecurityEvent({
        type: 'system_error',
        severity: 'medium',
        metadata: {
          action: 'reservation_expiry_sync_failed',
          success: false,
          reason: errorMsg,
          projectId: projectIdStr,
          durationMs: result.syncDurationMs,
        },
      });
    } catch {
      // Logging failure should never break the caller
    }

    return result;
  }
}

// ============================================================================
// CONVENIENCE EXPORT: All sync utilities as a namespace
// ============================================================================

/**
 * Convenience namespace for importing all sync utilities at once.
 *
 * @example
 *   import { UnitSync } from '@/lib/units/syncUnitTypeBreakdown';
 *   await UnitSync.breakdown(projectId);
 *   await UnitSync.denormalize(projectId);
 *   await UnitSync.expireReservations(projectId);
 */
export const UnitSync = {
  breakdown: syncUnitTypeBreakdown,
  denormalize: denormalizeProjectToUnits,
  expireReservations: expireStaleReservations,
};