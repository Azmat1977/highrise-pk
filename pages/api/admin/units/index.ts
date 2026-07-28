// pages/api/admin/units/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Unit from '@/models/Unit';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  rateLimitAdmin,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { logAdminAction } from '@/lib/logAdminAction';
import { z } from 'zod';

// ════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════

const BulkActionSchema = z.object({
  action: z.enum([
    'publish',
    'unpublish',
    'verify',
    'unverify',
    'feature',
    'unfeature',
    'trash',
    'restore',
  ]),
  unitIds: z.array(z.string().min(24).max(24)).min(1).max(50),
  reason:  z.string().max(500).optional(),
});

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function buildAdminUnitFilter(
  query: NextApiRequest['query']
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  // Deleted filter — default shows non-deleted only
  const showDeleted = query.deleted === 'true';
  const showAll     = query.all === 'true';
  if (!showAll) {
    filter.isDeleted = showDeleted ? true : { $ne: true };
  }

  // Status filter
  const status = typeof query.status === 'string' ? query.status : '';
  const validStatuses = ['available', 'reserved', 'sold', 'on_hold', 'cancelled'];
  if (status && validStatuses.includes(status)) {
    filter.status = status;
  }

  // Category filter
  const category = typeof query.category === 'string' ? query.category : '';
  if (category && ['residential', 'commercial'].includes(category)) {
    filter.category = category;
  }

  // Unit type filter
  const unitType = typeof query.unitType === 'string' ? query.unitType : '';
  if (unitType) filter.unitType = unitType;

  // Published filter
  const published = typeof query.published === 'string' ? query.published : '';
  if (published === 'true')  filter.isPublished = true;
  if (published === 'false') filter.isPublished = false;

  // Verified filter
  const verified = typeof query.verified === 'string' ? query.verified : '';
  if (verified === 'true')  filter.isVerified = true;
  if (verified === 'false') filter.isVerified = false;

  // Featured filter
  const featured = typeof query.featured === 'string' ? query.featured : '';
  if (featured === 'true') filter.isFeatured = true;

  // Project filter
  const projectId = typeof query.projectId === 'string' ? query.projectId : '';
  if (projectId && mongoose.isValidObjectId(projectId)) {
    filter.projectId = new mongoose.Types.ObjectId(projectId);
  }

  // Developer filter
  const developerId = typeof query.developerId === 'string' ? query.developerId : '';
  if (developerId && mongoose.isValidObjectId(developerId)) {
    filter.developerId = new mongoose.Types.ObjectId(developerId);
  }

  // City filter (denormalized on unit)
  const city = typeof query.city === 'string' ? query.city.trim() : '';
  if (city) filter.city = { $regex: new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };

  // Price range
  const minPrice = typeof query.minPrice === 'string' ? Number(query.minPrice) : NaN;
  const maxPrice = typeof query.maxPrice === 'string' ? Number(query.maxPrice) : NaN;
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    const priceFilter: Record<string, number> = {};
    if (Number.isFinite(minPrice) && minPrice >= 0) priceFilter.$gte = minPrice;
    if (Number.isFinite(maxPrice) && maxPrice >= 0) priceFilter.$lte = maxPrice;
    if (Object.keys(priceFilter).length > 0) filter.price = priceFilter;
  }

  // Date range
  const from = typeof query.from === 'string' ? query.from : '';
  const to   = typeof query.to   === 'string' ? query.to   : '';
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) dateFilter.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) dateFilter.$lte = d;
    }
    if (Object.keys(dateFilter).length > 0) filter.createdAt = dateFilter;
  }

  // Text search
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 60) : '';
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [
      { unitNumber:   rx },
      { title:        rx },
      { unitType:     rx },
      { unitTypeName: rx },
      { tower:        rx },
      { floorName:    rx },
    ];
  }

  return filter;
}

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── Admin guard ──
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── Rate limit ──
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── DB ──
  await dbConnect();

  // ════════════════════════════════════════════════════
  // GET — List all units with filters + stats
  // ════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      // Pagination
      const page  = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
      const skip  = (page - 1) * limit;

      // Sort
      const sortField = String(req.query.sortBy ?? 'createdAt');
      const sortDir   = String(req.query.sortOrder ?? 'desc') === 'asc' ? 1 : -1;
      const allowedSortFields = new Set([
        'createdAt', 'updatedAt', 'price',
        'area', 'unitNumber', 'floorNumber',
        'status', 'views', 'inquiryCount',
      ]);
      const sort: Record<string, 1 | -1> = {
        [allowedSortFields.has(sortField) ? sortField : 'createdAt']: sortDir as 1 | -1,
      };

      // Filter
      const filter = buildAdminUnitFilter(req.query);

      // Execute in parallel
      const [units, totalCount, statsAgg] = await Promise.all([

        Unit.find(filter)
          .select([
            '_id', 'projectId', 'developerId',
            'unitNumber', 'title', 'unitType', 'unitTypeName',
            'category', 'status', 'isPublished', 'isVerified',
            'isFeatured', 'isHotDeal', 'isPriceDropped',
            'price', 'area', 'areaUnit',
            'bedrooms', 'bathrooms',
            'floorNumber', 'floorName', 'tower',
            'isCorner', 'facing',
            'images',
            'views', 'inquiryCount',
            'isDeleted', 'deletedAt',
            'createdAt', 'updatedAt',
          ].join(' '))
          .populate('projectId', 'projectName slug city')
          .populate('developerId', 'companyName email')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),

        Unit.countDocuments(filter),

        // Platform-wide unit stats (admin overview)
        Unit.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          {
            $group: {
              _id:            null,
              totalUnits:     { $sum: 1 },
              availableUnits: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
              reservedUnits:  { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
              soldUnits:      { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
              onHoldUnits:    { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
              publishedUnits: { $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] } },
              verifiedUnits:  { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
              featuredUnits:  { $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] } },
              deletedUnits:   { $sum: { $cond: [{ $eq: ['$isDeleted', true] }, 1, 0] } },
              totalViews:     { $sum: '$views' },
              totalInquiries: { $sum: '$inquiryCount' },
              avgPrice:       { $avg: '$price' },
              minPrice:       { $min: '$price' },
              maxPrice:       { $max: '$price' },
            },
          },
        ]).option({ maxTimeMS: 3000 }),
      ]);

      const stats = statsAgg?.[0] ?? {
        totalUnits: 0, availableUnits: 0, reservedUnits: 0,
        soldUnits: 0, onHoldUnits: 0, publishedUnits: 0,
        verifiedUnits: 0, featuredUnits: 0, deletedUnits: 0,
        totalViews: 0, totalInquiries: 0,
        avgPrice: 0, minPrice: 0, maxPrice: 0,
      };

      const totalPages = Math.max(1, Math.ceil(totalCount / limit));

      return res.status(200).json({
        success: true,
        data: {
          units,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasMore: page < totalPages,
          },
          stats,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   admin.id,
        metadata: {
          action: 'admin_units_list_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // POST — Bulk action on multiple units
  // ════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      // Zod validation
      const parsed = BulkActionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { action, unitIds, reason } = parsed.data;

      // Validate all IDs are valid ObjectIds
      const invalidIds = unitIds.filter((id) => !mongoose.isValidObjectId(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid unit IDs: ${invalidIds.join(', ')}`,
        });
      }

      const objectIds = unitIds.map((id) => new mongoose.Types.ObjectId(id));

      // Build update based on action
      let updateData: Record<string, unknown> = {};
      let filterExtra: Record<string, unknown> = {};

      switch (action) {
        case 'publish':
          updateData = { isPublished: true };
          filterExtra = { isDeleted: { $ne: true } };
          break;

        case 'unpublish':
          updateData = { isPublished: false };
          filterExtra = { isDeleted: { $ne: true } };
          break;

        case 'verify':
          updateData = { isVerified: true, isPublished: true };
          filterExtra = { isDeleted: { $ne: true } };
          break;

        case 'unverify':
          updateData = { isVerified: false };
          filterExtra = { isDeleted: { $ne: true } };
          break;

        case 'feature':
          updateData = { isFeatured: true };
          filterExtra = { isDeleted: { $ne: true } };
          break;

        case 'unfeature':
          updateData = { isFeatured: false };
          filterExtra = { isDeleted: { $ne: true } };
          break;

        case 'trash':
          updateData = {
            isDeleted: true,
            deletedAt: new Date(),
          };
          filterExtra = { isDeleted: { $ne: true } };
          break;

        case 'restore':
          updateData = {
            isDeleted: false,
            deletedAt: null,
          };
          filterExtra = { isDeleted: true };
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action',
          });
      }

      // Execute bulk update
      const result = await Unit.updateMany(
        {
          _id: { $in: objectIds },
          ...filterExtra,
        },
        { $set: updateData }
      );

      // Audit log
      await logSecurityEvent({
        type:     'bulk_action_performed',
        severity: action === 'trash' ? 'high' : 'medium',
        userId:   admin.id,
        metadata: {
          action:        `admin_units_bulk_${action}`,
          unitIds,
          unitCount:     unitIds.length,
          affectedCount: result.modifiedCount,
          reason,
        },
      });

      await logAdminAction({
        action:      'bulk_action_performed' as any,
        entityType:  'unit' as any,
        adminId:     admin.id,
        adminEmail:  admin.email,
        entityLabel: `${result.modifiedCount} units`,
        newValue:    action,
        reason,
        meta: {
          unitIds,
          bulkAction:    action,
          affectedCount: result.modifiedCount,
        },
        ip:        req.headers['x-forwarded-for']?.toString() ?? '',
        userAgent: req.headers['user-agent'] ?? '',
      });

      return res.status(200).json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        data: {
          action,
          requestedCount: unitIds.length,
          affectedCount:  result.modifiedCount,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   admin.id,
        metadata: {
          action: 'admin_units_bulk_action_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ── Method not allowed ──
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}