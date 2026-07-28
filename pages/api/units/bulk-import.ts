// pages/api/units/bulk-import.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Unit from '@/models/Unit';
import { requireAuth } from '@/lib/requireAuth';
import {
  rateLimitDeveloper,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';
import { z } from 'zod';

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════

const MAX_UNITS_PER_IMPORT = 200;
const MAX_UNIT_NUMBER_LEN  = 60;

// ════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════

// Single unit row schema — mirrors required + commonly used fields
const UnitRowSchema = z.object({
  // Required
  unitNumber:  z.string().min(1).max(MAX_UNIT_NUMBER_LEN),
  category:    z.enum(['residential', 'commercial']),
  unitType:    z.string().min(1).max(80),
  area:        z.number().positive(),
  price:       z.number().positive(),

  // Optional — identity
  areaUnit:         z.string().max(20).optional().default('Sq.Ft'),
  unitTypeName:     z.string().max(80).optional(),
  title:            z.string().max(200).optional(),
  floorNumber:      z.number().min(-5).max(200).optional(),
  floorName:        z.string().max(80).optional(),
  tower:            z.string().max(80).optional(),
  wing:             z.string().max(80).optional(),
  building:         z.string().max(120).optional(),
  subType:          z.string().max(80).optional(),

  // Optional — size
  coveredArea:      z.number().min(0).optional(),
  carpetArea:       z.number().min(0).optional(),
  balconyArea:      z.number().min(0).optional(),
  terraceArea:      z.number().min(0).optional(),

  // Optional — price
  pricePerUnit:     z.number().min(0).optional(),
  priceNegotiable:  z.boolean().optional(),
  priceLabel:       z.string().max(60).optional(),

  // Optional — residential features
  bedrooms:         z.number().min(0).max(20).optional(),
  bathrooms:        z.number().min(0).max(20).optional(),
  livingRooms:      z.number().min(0).max(10).optional(),
  kitchens:         z.number().min(0).max(5).optional(),
  balconies:        z.number().min(0).max(10).optional(),
  servantQuarter:   z.boolean().optional(),
  storeRoom:        z.boolean().optional(),
  studyRoom:        z.boolean().optional(),

  // Optional — commercial features
  cabins:           z.number().min(0).optional(),
  seatingCapacity:  z.number().min(0).optional(),
  kitchenette:      z.boolean().optional(),
  reception:        z.boolean().optional(),

  // Optional — position
  isCorner:         z.boolean().optional(),
  facing: z.enum([
    'north', 'south', 'east', 'west',
    'north_east', 'north_west', 'south_east', 'south_west',
  ]).optional(),
  view: z.enum([
    'park', 'road', 'city', 'garden', 'pool',
    'mosque', 'hills', 'open', 'internal',
  ]).optional(),
  isParkFacing:     z.boolean().optional(),
  isRoadFacing:     z.boolean().optional(),

  // Optional — features
  features:         z.array(z.string().max(80)).max(30).optional(),
  finishingLevel: z.enum([
    'grey_structure', 'standard', 'premium', 'luxury',
  ]).optional(),

  // Optional — status
  status: z.enum([
    'available', 'reserved', 'sold', 'on_hold', 'cancelled',
  ]).optional().default('available'),

  // Optional — payment
  listingType: z.enum([
    'full_payment', 'installment', 'both', 'pre_launch',
  ]).optional().default('both'),

  // Optional — parking
  parkingIncluded:  z.boolean().optional(),
  parkingSpaces:    z.number().min(0).optional(),
  parkingType: z.enum(['covered', 'open', 'basement']).optional(),

  // Optional — description
  description:      z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  highlights:       z.array(z.string().max(120)).max(20).optional(),
});

const BulkImportSchema = z.object({
  projectId: z.string().min(24).max(24),
  units:     z.array(UnitRowSchema).min(1).max(MAX_UNITS_PER_IMPORT),
  // Strategy:
  //   'skip'      → skip rows where unitNumber already exists (default)
  //   'overwrite' → update existing units with new data
  //   'strict'    → fail entire import if ANY duplicate found
  strategy:  z.enum(['skip', 'overwrite', 'strict']).optional().default('skip'),
});

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

type ImportRow = z.infer<typeof UnitRowSchema>;

interface ImportResult {
  success:    boolean;
  total:      number;
  imported:   number;
  skipped:    number;
  overwritten: number;
  failed:     number;
  errors:     Array<{
    row:     number;
    unitNumber: string;
    reason:  string;
  }>;
  duration:   number;
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

/**
 * Check for duplicate unitNumbers within the import batch itself.
 * Catches user errors before hitting the DB.
 */
function findBatchDuplicates(units: ImportRow[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const unit of units) {
    const key = unit.unitNumber.trim().toLowerCase();
    if (seen.has(key)) {
      dupes.push(unit.unitNumber);
    } else {
      seen.add(key);
    }
  }
  return dupes;
}

/**
 * Build a unit document from a validated row.
 * developerId comes from the verified project (not user input).
 */
function buildUnitDoc(
  row:         ImportRow,
  projectId:   mongoose.Types.ObjectId,
  developerId: mongoose.Types.ObjectId,
  index:       number
): Record<string, unknown> {
  return {
    projectId,
    developerId,

    // Identity
    unitNumber:      row.unitNumber.trim(),
    unitTypeName:    row.unitTypeName || row.unitType,
    title:           row.title,
    floorNumber:     row.floorNumber,
    floorName:       row.floorName,
    tower:           row.tower,
    wing:            row.wing,
    building:        row.building,
    subType:         row.subType,

    // Classification
    category:        row.category,
    unitType:        row.unitType,

    // Size
    area:            row.area,
    areaUnit:        row.areaUnit ?? 'Sq.Ft',
    coveredArea:     row.coveredArea,
    carpetArea:      row.carpetArea,
    balconyArea:     row.balconyArea,
    terraceArea:     row.terraceArea,

    // Price
    price:           row.price,
    pricePerUnit:    row.pricePerUnit,
    priceNegotiable: row.priceNegotiable ?? false,
    priceLabel:      row.priceLabel,

    // Residential features
    bedrooms:        row.bedrooms,
    bathrooms:       row.bathrooms,
    livingRooms:     row.livingRooms,
    kitchens:        row.kitchens,
    balconies:       row.balconies,
    servantQuarter:  row.servantQuarter ?? false,
    storeRoom:       row.storeRoom ?? false,
    studyRoom:       row.studyRoom ?? false,

    // Commercial features
    cabins:          row.cabins,
    seatingCapacity: row.seatingCapacity,
    kitchenette:     row.kitchenette ?? false,
    reception:       row.reception ?? false,

    // Position
    isCorner:        row.isCorner ?? false,
    facing:          row.facing,
    view:            row.view,
    isParkFacing:    row.isParkFacing ?? false,
    isRoadFacing:    row.isRoadFacing ?? false,

    // Features
    features:        row.features ?? [],
    finishingLevel:  row.finishingLevel,

    // Status & payment
    status:          row.status ?? 'available',
    listingType:     row.listingType ?? 'both',
    isPublished:     false, // Always false until admin reviews
    isVerified:      false,
    isFeatured:      false,
    isHotDeal:       false,
    isPriceDropped:  false,

    // Parking
    parkingIncluded: row.parkingIncluded ?? false,
    parkingSpaces:   row.parkingSpaces,
    parkingType:     row.parkingType,

    // Description
    description:      row.description,
    shortDescription: row.shortDescription,
    highlights:       row.highlights ?? [],

    // Soft delete
    isDeleted: false,
    deletedAt: null,

    // Analytics
    views:        0,
    inquiryCount: 0,

    // Import metadata
    importedAt:   new Date(),
    importIndex:  index,
  };
}

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── Method guard ──
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Auth guard ──
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── Role guard ──
  const role = auth.role as string;
  if (!['developer', 'admin'].includes(role)) {
    await logSecurityEvent({
      type:     'suspicious_activity',
      severity: 'medium',
      userId:   auth.id,
      metadata: {
        action: 'bulk_import_unauthorized_role',
        role,
        reason: 'Non-developer attempted bulk unit import',
      },
    });
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // ── Rate limit ──
  const rl = await rateLimitDeveloper(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── DB ──
  await dbConnect();

  const startTime = Date.now();

  try {
    // ── Zod validation ──
    const parsed = BulkImportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message:  'Invalid import data',
        errors:   parsed.error.flatten().fieldErrors,
      });
    }

    const { projectId, units, strategy } = parsed.data;

    // ── Validate projectId ──
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    // ── Check for duplicates within the batch ──
    const batchDupes = findBatchDuplicates(units);
    if (batchDupes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Duplicate unit numbers found within import batch: ${batchDupes.slice(0, 5).join(', ')}`,
      });
    }

    // ── Ownership check — get developerId from project (not body) ──
    const Project = mongoose.models.Project as
      mongoose.Model<mongoose.Document>;

    if (!Project) {
      return res.status(500).json({ success: false, message: 'Something went wrong' });
    }

    const projectQuery: Record<string, unknown> = {
      _id:       new mongoose.Types.ObjectId(projectId),
      isDeleted: { $ne: true },
    };

    // Developers can only import to their own projects
    if (role === 'developer') {
      const DeveloperProfile = mongoose.models.DeveloperProfile as
        mongoose.Model<mongoose.Document>;

      const devProfile = await DeveloperProfile.findOne(
        { user: auth.id },
        { _id: 1 }
      ).lean() as { _id: mongoose.Types.ObjectId } | null;

      if (!devProfile) {
        return res.status(403).json({
          success: false,
          message: 'Developer profile not found',
        });
      }

      projectQuery.developerId = devProfile._id;
    }

    const project = await Project.findOne(projectQuery)
      .select('_id developerId')
      .lean() as {
        _id:         mongoose.Types.ObjectId;
        developerId: mongoose.Types.ObjectId;
      } | null;

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or you do not have permission',
      });
    }

    // ── Fetch all existing unitNumbers for this project ──
    const existingUnits = await Unit.find(
      {
        projectId: new mongoose.Types.ObjectId(projectId),
        isDeleted: { $ne: true },
      },
      { unitNumber: 1, _id: 1 }
    ).lean() as Array<{ _id: mongoose.Types.ObjectId; unitNumber: string }>;

    const existingMap = new Map<string, mongoose.Types.ObjectId>();
    for (const u of existingUnits) {
      existingMap.set(u.unitNumber.trim().toLowerCase(), u._id);
    }

    // ── Strict strategy: fail if ANY duplicate exists ──
    if (strategy === 'strict') {
      const conflicting = units.filter((u) =>
        existingMap.has(u.unitNumber.trim().toLowerCase())
      );
      if (conflicting.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Import failed (strict mode): ${conflicting.length} unit(s) already exist`,
          conflicts: conflicting.map((u) => u.unitNumber),
        });
      }
    }

    // ── Process units row by row ──
    const result: ImportResult = {
      success:     true,
      total:       units.length,
      imported:    0,
      skipped:     0,
      overwritten: 0,
      failed:      0,
      errors:      [],
      duration:    0,
    };

    const projectObjectId  = new mongoose.Types.ObjectId(projectId);
    const developerObjectId = project.developerId;

    // Process in batches of 20 to avoid overwhelming DB
    const BATCH_SIZE = 20;

    for (let i = 0; i < units.length; i += BATCH_SIZE) {
      const batch = units.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (row, batchIndex) => {
          const rowIndex    = i + batchIndex + 1;
          const unitNumKey  = row.unitNumber.trim().toLowerCase();
          const existingId  = existingMap.get(unitNumKey);

          try {
            if (existingId) {
              // ── Duplicate handling ──
              if (strategy === 'skip') {
                result.skipped++;
                return;
              }

              if (strategy === 'overwrite') {
                // Update existing unit
                const updateDoc = buildUnitDoc(
                  row,
                  projectObjectId,
                  developerObjectId,
                  rowIndex
                );

                // Remove fields that should not be overwritten
                delete updateDoc.isDeleted;
                delete updateDoc.deletedAt;
                delete updateDoc.views;
                delete updateDoc.inquiryCount;
                delete updateDoc.isVerified;

                await Unit.findByIdAndUpdate(
                  existingId,
                  { $set: updateDoc },
                  { runValidators: true }
                );
                result.overwritten++;
                return;
              }
            }

            // ── New unit — insert ──
            const unitDoc = buildUnitDoc(
              row,
              projectObjectId,
              developerObjectId,
              rowIndex
            );

            await Unit.create(unitDoc);
            result.imported++;

          } catch (rowError: unknown) {
            result.failed++;

            // Duplicate key from concurrent insert (race condition)
            if ((rowError as { code?: number }).code === 11000) {
              result.errors.push({
                row:        rowIndex,
                unitNumber: row.unitNumber,
                reason:     'Unit number already exists in this project',
              });
              return;
            }

            result.errors.push({
              row:        rowIndex,
              unitNumber: row.unitNumber,
              reason:     rowError instanceof Error
                ? rowError.message
                : 'Unknown error',
            });
          }
        })
      );
    }

    // ── Sync project breakdown (fire and forget) ──
    syncUnitTypeBreakdown(projectId).catch(() => {
      // Silent
    });

    // ── Audit log ──
    await logSecurityEvent({
      type:     'admin_action',
      severity: 'medium',
      userId:   auth.id,
      metadata: {
        action:      'bulk_units_imported',
        projectId,
        strategy,
        total:       result.total,
        imported:    result.imported,
        skipped:     result.skipped,
        overwritten: result.overwritten,
        failed:      result.failed,
      },
    });

    result.duration = Date.now() - startTime;

    // ── Determine overall success ──
    // Import is considered successful even with partial failures
    // Caller can inspect result.errors for details
    result.success = result.imported > 0 || result.overwritten > 0;

    const statusCode = result.failed > 0 && result.imported === 0 && result.overwritten === 0
      ? 422  // All rows failed
      : 201; // At least some succeeded

    return res.status(statusCode).json({
      success: result.success,
      message: buildResultMessage(result),
      data:    result,
    });

  } catch (error: unknown) {
    await logSecurityEvent({
      type:     'system_error',
      severity: 'high',
      userId:   auth.id,
      metadata: {
        action: 'bulk_import_failed',
        reason: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
}

// ════════════════════════════════════════════════════
// RESULT MESSAGE BUILDER
// ════════════════════════════════════════════════════

function buildResultMessage(result: ImportResult): string {
  const parts: string[] = [];

  if (result.imported > 0) {
    parts.push(`${result.imported} unit${result.imported !== 1 ? 's' : ''} imported`);
  }
  if (result.overwritten > 0) {
    parts.push(`${result.overwritten} updated`);
  }
  if (result.skipped > 0) {
    parts.push(`${result.skipped} skipped (already exist)`);
  }
  if (result.failed > 0) {
    parts.push(`${result.failed} failed`);
  }

  return parts.length > 0
    ? parts.join(', ') + '.'
    : 'No units were processed.';
}