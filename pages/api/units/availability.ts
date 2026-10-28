// pages/api/units/availability.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Unit from '@/models/Unit';
import {
  rateLimitApi,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface FloorAvailability {
  floor:     number | string;
  floorName: string | null;
  total:     number;
  available: number;
  reserved:  number;
  sold:      number;
  onHold:    number;
  minPrice:  number;
  maxPrice:  number;
}

interface TypeAvailability {
  unitType:      string;
  unitTypeName:  string | null;
  category:      string | null;
  total:         number;
  available:     number;
  reserved:      number;
  sold:          number;
  onHold:        number;
  minPrice:      number;
  maxPrice:      number;
  minArea:       number;
  maxArea:       number;
  areaUnit:      string | null;
  bedrooms:      number | null;
  bathrooms:     number | null;
}

interface TowerAvailability {
  tower:     string;
  total:     number;
  available: number;
  reserved:  number;
  sold:      number;
  onHold:    number;
}

interface AvailabilityResponse {
  projectId:  string;
  summary: {
    totalUnits:     number;
    availableUnits: number;
    reservedUnits:  number;
    soldUnits:      number;
    onHoldUnits:    number;
    cancelledUnits: number;
    soldPercentage: number;
    minPrice:       number;
    maxPrice:       number;
    avgPrice:       number;
    minArea:        number;
    maxArea:        number;
  };
  byFloor:  FloorAvailability[];
  byType:   TypeAvailability[];
  byTower:  TowerAvailability[];
  byStatus: Record<string, number>;
  lastUpdated: string;
}

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── Method guard ──
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Rate limit (public endpoint — higher limit) ──
  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── Validate projectId ──
  const projectId = typeof req.query.projectId === 'string'
    ? req.query.projectId.trim()
    : '';

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: 'projectId query parameter is required',
    });
  }

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid project ID',
    });
  }

  // ── DB ──
  await dbConnect();

  try {
    const projectObjectId = new mongoose.Types.ObjectId(projectId);

    // ── Verify project exists and is public ──
    const Project = mongoose.models.Project as
      mongoose.Model<mongoose.Document>;

    if (!Project) {
      return res.status(500).json({ success: false, message: 'Something went wrong' });
    }

    const project = await Project.findOne({
      _id:       projectObjectId,
      isDeleted: { $ne: true },
    })
      .select('_id status isVerified')
      .lean() as {
        _id:        mongoose.Types.ObjectId;
        status?:    string;
        isVerified?: boolean;
      } | null;

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Only show availability for verified/approved projects
    const publicAllowed =
      project.isVerified === true ||
      project.status === 'verified' ||
      project.status === 'approved' ||
      project.status === 'active';

    if (!publicAllowed) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // ── Base match filter ──
    const baseMatch = {
      projectId: projectObjectId,
      isDeleted: { $ne: true },
    };

    // ── Run all aggregations in parallel ──
    const [
      summaryAgg,
      byFloorAgg,
      byTypeAgg,
      byTowerAgg,
      byStatusAgg,
    ] = await Promise.all([

      // ── Summary aggregation ──
      Unit.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id:            null,
            totalUnits:     { $sum: 1 },
            availableUnits: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
            reservedUnits:  { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
            soldUnits:      { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
            onHoldUnits:    { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
            cancelledUnits: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            minPrice:       { $min: '$price' },
            maxPrice:       { $max: '$price' },
            avgPrice:       { $avg: '$price' },
            minArea:        { $min: '$area' },
            maxArea:        { $max: '$area' },
          },
        },
      ]).option({ maxTimeMS: 3000 }),

      // ── By floor aggregation ──
      Unit.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: {
              floor:     { $ifNull: ['$floorNumber', 'unknown'] },
              floorName: { $ifNull: ['$floorName', null] },
            },
            total:     { $sum: 1 },
            available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
            reserved:  { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
            sold:      { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
            onHold:    { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
            minPrice:  { $min: '$price' },
            maxPrice:  { $max: '$price' },
          },
        },
        { $sort: { '_id.floor': 1 } },
      ]).option({ maxTimeMS: 3000 }),

      // ── By type aggregation ──
      Unit.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$unitType',
            unitTypeName: { $first: '$unitTypeName' },
            category:     { $first: '$category' },
            total:        { $sum: 1 },
            available:    { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
            reserved:     { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
            sold:         { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
            onHold:       { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
            minPrice:     { $min: '$price' },
            maxPrice:     { $max: '$price' },
            minArea:      { $min: '$area' },
            maxArea:      { $max: '$area' },
            areaUnit:     { $first: '$areaUnit' },
            bedrooms:     { $first: '$bedrooms' },
            bathrooms:    { $first: '$bathrooms' },
          },
        },
        { $sort: { _id: 1 } },
      ]).option({ maxTimeMS: 3000 }),

      // ── By tower aggregation ──
      Unit.aggregate([
        {
          $match: {
            ...baseMatch,
            tower: { $ne: null, $exists: true },
          },
        },
        {
          $group: {
            _id:       '$tower',
            total:     { $sum: 1 },
            available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
            reserved:  { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
            sold:      { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
            onHold:    { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]).option({ maxTimeMS: 3000 }),

      // ── By status count ──
      Unit.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id:   '$status',
            count: { $sum: 1 },
          },
        },
      ]).option({ maxTimeMS: 3000 }),
    ]);

    // ── Build summary ──
    const rawSummary = summaryAgg?.[0] ?? {
      totalUnits: 0, availableUnits: 0, reservedUnits: 0,
      soldUnits: 0, onHoldUnits: 0, cancelledUnits: 0,
      minPrice: 0, maxPrice: 0, avgPrice: 0,
      minArea: 0, maxArea: 0,
    };

    const summary = {
      totalUnits:     rawSummary.totalUnits ?? 0,
      availableUnits: rawSummary.availableUnits ?? 0,
      reservedUnits:  rawSummary.reservedUnits ?? 0,
      soldUnits:      rawSummary.soldUnits ?? 0,
      onHoldUnits:    rawSummary.onHoldUnits ?? 0,
      cancelledUnits: rawSummary.cancelledUnits ?? 0,
      soldPercentage: rawSummary.totalUnits > 0
        ? Math.round((rawSummary.soldUnits / rawSummary.totalUnits) * 100)
        : 0,
      minPrice: rawSummary.minPrice ?? 0,
      maxPrice: rawSummary.maxPrice ?? 0,
      avgPrice: rawSummary.avgPrice ? Math.round(rawSummary.avgPrice) : 0,
      minArea:  rawSummary.minArea ?? 0,
      maxArea:  rawSummary.maxArea ?? 0,
    };

    // ── Build byFloor ──
    const byFloor: FloorAvailability[] = (byFloorAgg ?? []).map(
      (row: Record<string, unknown>) => {
        const id = row._id as { floor: number | string; floorName: string | null };
        return {
          floor:     id.floor,
          floorName: id.floorName,
          total:     (row.total as number) ?? 0,
          available: (row.available as number) ?? 0,
          reserved:  (row.reserved as number) ?? 0,
          sold:      (row.sold as number) ?? 0,
          onHold:    (row.onHold as number) ?? 0,
          minPrice:  (row.minPrice as number) ?? 0,
          maxPrice:  (row.maxPrice as number) ?? 0,
        };
      }
    );

    // ── Build byType ──
    const byType: TypeAvailability[] = (byTypeAgg ?? []).map(
      (row: Record<string, unknown>) => ({
        unitType:     (row._id as string) ?? 'unknown',
        unitTypeName: (row.unitTypeName as string) ?? null,
        category:     (row.category as string) ?? null,
        total:        (row.total as number) ?? 0,
        available:    (row.available as number) ?? 0,
        reserved:     (row.reserved as number) ?? 0,
        sold:         (row.sold as number) ?? 0,
        onHold:       (row.onHold as number) ?? 0,
        minPrice:     (row.minPrice as number) ?? 0,
        maxPrice:     (row.maxPrice as number) ?? 0,
        minArea:      (row.minArea as number) ?? 0,
        maxArea:      (row.maxArea as number) ?? 0,
        areaUnit:     (row.areaUnit as string) ?? null,
        bedrooms:     (row.bedrooms as number) ?? null,
        bathrooms:    (row.bathrooms as number) ?? null,
      })
    );

    // ── Build byTower ──
    const byTower: TowerAvailability[] = (byTowerAgg ?? []).map(
      (row: Record<string, unknown>) => ({
        tower:     (row._id as string) ?? 'unknown',
        total:     (row.total as number) ?? 0,
        available: (row.available as number) ?? 0,
        reserved:  (row.reserved as number) ?? 0,
        sold:      (row.sold as number) ?? 0,
        onHold:    (row.onHold as number) ?? 0,
      })
    );

    // ── Build byStatus ──
    const byStatus: Record<string, number> = {};
    for (const row of (byStatusAgg ?? []) as Array<{ _id: string; count: number }>) {
      if (row._id) {
        byStatus[row._id] = row.count ?? 0;
      }
    }

    // ── Build response ──
    const response: AvailabilityResponse = {
      projectId,
      summary,
      byFloor,
      byType,
      byTower,
      byStatus,
      lastUpdated: new Date().toISOString(),
    };

    // ── Cache headers (public, short-lived) ──
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=30, stale-while-revalidate=120'
    );

    return res.status(200).json({
      success: true,
      data:    response,
    });

  } catch (error: unknown) {
    await logSecurityEvent({
      type:     'system_error',
      severity: 'medium',
      metadata: {
        action:    'unit_availability_fetch_failed',
        projectId: typeof req.query.projectId === 'string' ? req.query.projectId : 'unknown',
        reason:    error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
}