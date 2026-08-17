// pages/api/units/bulk-update.ts
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

const MAX_UNITS_PER_UPDATE = 100;

// ════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════

/**
 * Fields allowed to be bulk-updated by developers.
 * Admin-only fields (isVerified, isFeatured, isPublished)
 * are intentionally excluded — use /api/admin/units bulk action.
 */
const BulkUpdateFieldsSchema = z.object({
  // Price
  price:           z.number().positive().optional(),
  pricePerUnit:    z.number().min(0).optional(),
  priceNegotiable: z.boolean().optional(),
  priceLabel:      z.string().max(60).optional(),

  // Status (limited — sold requires admin in most cases)
  status: z.enum(['available', 'on_hold']).optional(),

  // Size
  area:     z.number().positive().optional(),
  areaUnit: z.string().max(20).optional(),

  // Position
  isCorner:    z.boolean().optional(),
  facing:      z.enum([
    'north', 'south', 'east', 'west',
    'north_east', 'north_west', 'south_east', 'south_west',
  ]).optional(),

  // Features
  finishingLevel: z.enum([
    'grey_structure', 'standard', 'premium', 'luxury',
  ]).optional(),
  features: z.array(z.string().max(80)).max(30).optional(),

  // Payment
  listingType: z.enum([
    'full_payment', 'installment', 'both', 'pre_launch',
  ]).optional(),

  // Parking
  parkingIncluded: z.boolean().optional(),
  parkingSpaces:   z.number().min(0).optional(),
  parkingType:     z.enum(['covered', 'open', 'basement']).optional(),

  // Description
  description:      z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),

  // Flags
  isHotDeal:      z.boolean().optional(),
  isPriceDropped: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * Two update modes supported:
 *
 * MODE 1 — "ids": Apply same updates to a list of specific unit IDs
 * MODE 2 — "filter": Apply same updates to all units matching a filter
 */
const BulkUpdateByIdsSchema = z.object({
  mode:      z.literal('ids'),
  projectId: z.string().min(24).max(24),
  unitIds:   z.array(z.string().min(24).max(24)).min(1).max(MAX_UNITS_PER_UPDATE),
  updates:   BulkUpdateFieldsSchema,
});

const BulkUpdateByFilterSchema = z.object({
  mode:       z.literal('filter'),
  projectId:  z.string().min(24).max(24),
  filter: z.object({
    category:    z.enum(['residential', 'commercial']).optional(),
    unitType:    z.string().max(80).optional(),
    floorNumber: z.number().min(-5).max(200).optional(),
    tower:       z.string().max(80).optional(),
    status:      z.enum(['available', 'reserved', 'on_hold']).optional(),
  }),
  updates:    BulkUpdateFieldsSchema,
});

const BulkUpdateSchema = z.discriminatedUnion('mode', [
  BulkUpdateByIdsSchema,
  BulkUpdateByFilterSchema,
]);

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface BulkUpdateResult {
  success:        boolean;
  mode:           'ids' | 'filter';
  matchedCount:   number;
  modifiedCount:  number;
  unchangedCount: number;
  changedFields:  string[];
  duration:       number;
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
        action: 'bulk_update_unauthorized_role',
        role,
        reason: 'Non-developer attempted bulk unit update',
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
    const parsed = BulkUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors:  parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const { projectId, updates } = data;

    // ── Validate projectId ──
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    // ── Ownership check — project must belong to developer ──
    const Project = mongoose.models.Project as
      mongoose.Model<mongoose.Document>;

    if (!Project) {
      return res.status(500).json({ success: false, message: 'Something went wrong' });
    }

    const projectQuery: Record<string, unknown> = {
      _id:       new mongoose.Types.ObjectId(projectId),
      isDeleted: { $ne: true },
    };

    if (role === 'developer') {
      // Canonical Project.developerId stores the authenticated User _id.
      projectQuery.developerId = new mongoose.Types.ObjectId(auth.id);
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

    // ── Build MongoDB filter ──
    const dbFilter: Record<string, unknown> = {
      projectId: new mongoose.Types.ObjectId(projectId),
      isDeleted: { $ne: true },
    };

    if (data.mode === 'ids') {
      // Validate all IDs
      const invalidIds = data.unitIds.filter((id) => !mongoose.isValidObjectId(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid unit IDs: ${invalidIds.slice(0, 5).join(', ')}`,
        });
      }

      dbFilter._id = {
        $in: data.unitIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (data.mode === 'filter') {
      const f = data.filter;
      if (f.category)    dbFilter.category    = f.category;
      if (f.unitType)    dbFilter.unitType    = f.unitType;
      if (f.floorNumber !== undefined) dbFilter.floorNumber = f.floorNumber;
      if (f.tower)       dbFilter.tower       = f.tower;
      if (f.status)      dbFilter.status      = f.status;
    }

    // ── Safety check: filter mode must not update too many ──
    if (data.mode === 'filter') {
      const affectedCount = await Unit.countDocuments(dbFilter);

      if (affectedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'No units match the specified filter',
        });
      }

      if (affectedCount > MAX_UNITS_PER_UPDATE) {
        return res.status(400).json({
          success: false,
          message: `Filter matches ${affectedCount} units — maximum ${MAX_UNITS_PER_UPDATE} allowed per bulk update. Please narrow your filter.`,
        });
      }
    }

    // ── Build $set payload ──
    const setPayload: Record<string, unknown> = {};
    const changedFields: string[] = [];

    // Price fields
    if (updates.price !== undefined) {
      setPayload.price = updates.price;
      setPayload.lastPriceChangedAt = new Date();
      changedFields.push('price');
    }
    if (updates.pricePerUnit !== undefined) {
      setPayload.pricePerUnit = updates.pricePerUnit;
      changedFields.push('pricePerUnit');
    }
    if (updates.priceNegotiable !== undefined) {
      setPayload.priceNegotiable = updates.priceNegotiable;
      changedFields.push('priceNegotiable');
    }
    if (updates.priceLabel !== undefined) {
      setPayload.priceLabel = updates.priceLabel;
      changedFields.push('priceLabel');
    }

    // Status
    if (updates.status !== undefined) {
      setPayload.status = updates.status;
      setPayload.lastStatusChangedAt = new Date();
      changedFields.push('status');
    }

    // Size
    if (updates.area !== undefined) {
      setPayload.area = updates.area;
      changedFields.push('area');
    }
    if (updates.areaUnit !== undefined) {
      setPayload.areaUnit = updates.areaUnit;
      changedFields.push('areaUnit');
    }

    // Position
    if (updates.isCorner !== undefined) {
      setPayload.isCorner = updates.isCorner;
      changedFields.push('isCorner');
    }
    if (updates.facing !== undefined) {
      setPayload.facing = updates.facing;
      changedFields.push('facing');
    }

    // Features
    if (updates.finishingLevel !== undefined) {
      setPayload.finishingLevel = updates.finishingLevel;
      changedFields.push('finishingLevel');
    }
    if (updates.features !== undefined) {
      setPayload.features = updates.features;
      changedFields.push('features');
    }

    // Payment
    if (updates.listingType !== undefined) {
      setPayload.listingType = updates.listingType;
      changedFields.push('listingType');
    }

    // Parking
    if (updates.parkingIncluded !== undefined) {
      setPayload.parkingIncluded = updates.parkingIncluded;
      changedFields.push('parkingIncluded');
    }
    if (updates.parkingSpaces !== undefined) {
      setPayload.parkingSpaces = updates.parkingSpaces;
      changedFields.push('parkingSpaces');
    }
    if (updates.parkingType !== undefined) {
      setPayload.parkingType = updates.parkingType;
      changedFields.push('parkingType');
    }

    // Description
    if (updates.description !== undefined) {
      setPayload.description = updates.description;
      changedFields.push('description');
    }
    if (updates.shortDescription !== undefined) {
      setPayload.shortDescription = updates.shortDescription;
      changedFields.push('shortDescription');
    }

    // Flags
    if (updates.isHotDeal !== undefined) {
      setPayload.isHotDeal = updates.isHotDeal;
      changedFields.push('isHotDeal');
    }
    if (updates.isPriceDropped !== undefined) {
      setPayload.isPriceDropped = updates.isPriceDropped;
      changedFields.push('isPriceDropped');
    }

    // ── Execute update ──
    const updateResult = await Unit.updateMany(
      dbFilter,
      { $set: setPayload }
    );

    // ── Sync project breakdown (fire and forget) ──
    syncUnitTypeBreakdown(projectId).catch(() => {
      // Silent
    });

    // ── Build result ──
    const result: BulkUpdateResult = {
      success:        true,
      mode:           data.mode,
      matchedCount:   updateResult.matchedCount ?? 0,
      modifiedCount:  updateResult.modifiedCount ?? 0,
      unchangedCount: (updateResult.matchedCount ?? 0) - (updateResult.modifiedCount ?? 0),
      changedFields,
      duration:       Date.now() - startTime,
    };

    // ── Audit log ──
    await logSecurityEvent({
      type:     'admin_action',
      severity: 'medium',
      userId:   auth.id,
      metadata: {
        action:        'bulk_units_updated',
        projectId,
        mode:          data.mode,
        ...(data.mode === 'ids'
          ? { unitIds: data.unitIds, unitCount: data.unitIds.length }
          : { filter: data.filter }
        ),
        changedFields,
        matchedCount:  result.matchedCount,
        modifiedCount: result.modifiedCount,
        duration:      result.duration,
      },
    });

    return res.status(200).json({
      success: true,
      message: buildResultMessage(result),
      data:    result,
    });

  } catch (error: unknown) {
    await logSecurityEvent({
      type:     'system_error',
      severity: 'high',
      userId:   auth.id,
      metadata: {
        action:   'bulk_update_failed',
        reason:   error instanceof Error ? error.message : 'Unknown error',
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

function buildResultMessage(result: BulkUpdateResult): string {
  const parts: string[] = [];

  if (result.modifiedCount > 0) {
    parts.push(
      `${result.modifiedCount} unit${result.modifiedCount !== 1 ? 's' : ''} updated`
    );
  }

  if (result.unchangedCount > 0) {
    parts.push(`${result.unchangedCount} unchanged`);
  }

  if (result.changedFields.length > 0) {
    parts.push(`fields: ${result.changedFields.join(', ')}`);
  }

  parts.push(`${result.duration}ms`);

  return parts.join(' · ');
}