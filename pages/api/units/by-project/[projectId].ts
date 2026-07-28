//C:\dev\highrise-pk\pages\api\units\by-project\[projectId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose, { type SortOrder } from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import Unit from '@/models/Unit';
import { requireAuth } from '@/lib/requireAuth';
import {
  rateLimitApi,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

type AuthedSession = {
  id: string;
  email: string;
  role: string;
} | null;

// =============================
// Security headers
// =============================
function setSecurityHeaders(res: NextApiResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()'
  );
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains; preload');
  res.setHeader('Vary', 'Accept-Encoding');
}

// =============================
// Helpers
// =============================
function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  const first = (ip || '').split(',')[0]?.trim();
  return first || (req.socket?.remoteAddress || '0.0.0.0');
}

// bumpRate removed — using Upstash rateLimitApi() instead

function normalizeString(v: any, maxLen = 80) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s) return '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function parseBool(v: any): boolean | null {
  const s = String(v ?? '').toLowerCase().trim();
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function isAdminSession(session: AuthedSession): boolean {
  if (!session) return false;
  const role = String(session.role || '').toLowerCase();
  return role === 'admin' || role === 'superadmin';
}

function computePublicAllowed(project: any): boolean {
  const status = String(project?.status || '').toLowerCase();
  const verificationStatus = String(project?.verificationStatus || '').toLowerCase();

  return (
    project?.isVerified === true ||
    status === 'approved' ||
    status === 'active' ||
    status === 'published' ||
    verificationStatus === 'approved'
  );
}

/**
 * Cursor payload for stable sort: createdAt desc, _id desc
 * base64url (no padding)
 */
type CursorPayload = { createdAt: string; _id: string };

function b64urlEncode(obj: any): string {
  const json = JSON.stringify(obj);
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlDecode<T = any>(token: string): T | null {
  try {
    const t = String(token || '').trim();
    if (!t) return null;

    let b64 = t.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);

    const raw = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// =============================
// Handler
// =============================
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setSecurityHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Auth guard ──
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── Rate limit (Upstash) ──
  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  const projectIdRaw = req.query.projectId;
  const projectId = typeof projectIdRaw === 'string' ? projectIdRaw.trim() : '';
  if (!projectId || !isValidObjectId(projectId)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID' });
  }

  // ✅ Reuse ObjectId instance (performance + consistency)
  const projectObjectId = new mongoose.Types.ObjectId(projectId);

  try {
    await dbConnect();

    // ── Session from requireAuth (already verified above) ──
    const isAdmin = (auth.role as string) === 'admin';
    const actorId = isValidObjectId(auth.id) ? auth.id : '';

    // ── Load project for gating (registry pattern) ──
    const Project = mongoose.models.Project as mongoose.Model<mongoose.Document>;
    if (!Project) {
      return res.status(500).json({ success: false, message: 'Something went wrong' });
    }

    const project = await Project
      .findById(projectId)
      .select('_id developerId status verificationStatus isVerified isDeleted deletedAt')
      .maxTimeMS(2500)
      .lean() as {
        _id: mongoose.Types.ObjectId;
        developerId?: mongoose.Types.ObjectId;
        status?: string;
        verificationStatus?: string;
        isVerified?: boolean;
        isDeleted?: boolean;
        deletedAt?: Date;
      } | null;

    // Safe 404 (anti-enumeration)
    if (!project) return res.status(404).json({ success: false, message: 'Not found' });

    const projectDeleted = project.isDeleted === true || !!project.deletedAt;
    if (projectDeleted && !isAdmin) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const isOwner = actorId ? String(project.developerId) === actorId : false;
    const publicAllowed = computePublicAllowed(project);

    if (!publicAllowed && !(isAdmin || isOwner)) {
      // Do not leak existence
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    // ===== Query params (validated) =====
    const category = normalizeString(req.query.category, 24);
    const unitType = normalizeString(req.query.unitType, 32);
    const status = normalizeString(req.query.status, 24);
    const q = normalizeString(req.query.q, 60);

    const floorNumber = normalizeString(req.query.floorNumber, 12);
    const bedrooms = normalizeString(req.query.bedrooms, 12);

    const minPrice = normalizeString(req.query.minPrice, 20);
    const maxPrice = normalizeString(req.query.maxPrice, 20);

    const isCorner = parseBool(req.query.isCorner);
    const isFeatured = parseBool(req.query.isFeatured);

    // ===== Dual pagination (LOCKED) =====
     const limit = clampInt(req.query.limit, 50, 1, 100);
    const page = clampInt(req.query.page, 1, 1, 1_000_000);
    const cursor = normalizeString(req.query.cursor, 600);
    const mode: 'page' | 'cursor' = cursor ? 'cursor' : 'page';

    // Sort allowlist (public-safe)
    const sortBy = normalizeString(req.query.sortBy, 24) || 'createdAt';
    const sortOrder = (normalizeString(req.query.sortOrder, 8) || 'desc').toLowerCase();

    const allowedSortFields = new Set(['unitNumber', 'floorNumber', 'price', 'area', 'createdAt']);
    const sortField = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';
    const dir: SortOrder = sortOrder === 'asc' ? 1 : -1;

    // Enterprise: cursor mode ONLY supported for createdAt sort (stable, no-skip)
    if (mode === 'cursor' && sortField !== 'createdAt') {
      return res.status(400).json({
        success: false,
        message: 'Cursor mode supports sortBy=createdAt only.',
        code: 'CURSOR_SORT_UNSUPPORTED',
      });
    }

    // Stable sort with tie-breaker for cursor safety
    const sort: Record<string, SortOrder> =
      sortField === 'createdAt'
        ? { createdAt: dir, _id: dir }
        : { [sortField]: dir, createdAt: -1, _id: -1 };

    // ===== Base filter =====
    const filter: any = {
      projectId: projectObjectId,
      isDeleted: { $ne: true },
    };

    // Optional filters (validated)
    if (category) filter.category = category;
    if (unitType) filter.unitType = unitType;

    // Status allowlist
    if (status) {
      const s = status.toLowerCase();
      const allowedStatuses = new Set(['available', 'reserved', 'sold', 'on_hold']);
      if (!allowedStatuses.has(s)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      filter.status = s;
    }

    if (floorNumber) {
      const fn = Number(floorNumber);
      if (Number.isFinite(fn)) filter.floorNumber = Math.trunc(fn);
    }

    if (bedrooms) {
      const bd = Number(bedrooms);
      if (Number.isFinite(bd)) filter.bedrooms = Math.trunc(bd);
    }

    if (isCorner === true) filter.isCorner = true;
    if (isFeatured === true) filter.isFeatured = true;

    if (minPrice || maxPrice) {
      const mp = minPrice ? Number(minPrice) : NaN;
      const xp = maxPrice ? Number(maxPrice) : NaN;
      filter.price = {};
      if (Number.isFinite(mp)) filter.price.$gte = Math.max(0, mp);
      if (Number.isFinite(xp)) filter.price.$lte = Math.max(0, xp);
      if (Object.keys(filter.price).length === 0) delete filter.price;
    }

    // Text search (safe regex)
    if (q) {
      const safe = q.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');

      // Enterprise: schema-safe fields for unit search (no assumptions like title/slug)
      filter.$or = [
        { unitNumber: rx },
        { unitType: rx },
        { unitTypeName: rx },
        { category: rx },
        { floorName: rx },
        { tower: rx },
      ];
    }

    // ===== Cursor mode apply (createdAt desc, _id desc) =====
    let cursorApplied = false;

    if (mode === 'cursor') {
      const parsed = b64urlDecode<CursorPayload>(cursor);
      if (!parsed?.createdAt || !parsed?._id) {
        return res.status(400).json({ success: false, message: 'Invalid cursor' });
      }

      const createdAtDate = new Date(parsed.createdAt);
      if (!Number.isFinite(createdAtDate.getTime()) || !isValidObjectId(parsed._id)) {
        return res.status(400).json({ success: false, message: 'Invalid cursor' });
      }

      const cursorObjectId = new mongoose.Types.ObjectId(parsed._id);

      // For DESC (default) sort by createdAt/_id, fetch next after cursor:
      // (createdAt < cursorCreatedAt) OR (createdAt == cursorCreatedAt AND _id < cursorId)
      // For ASC we reverse comparisons.
      const isAsc = dir === 1;
      const clause = isAsc
        ? {
            $or: [
              { createdAt: { $gt: createdAtDate } },
              { createdAt: createdAtDate, _id: { $gt: cursorObjectId } },
            ],
          }
        : {
            $or: [
              { createdAt: { $lt: createdAtDate } },
              { createdAt: createdAtDate, _id: { $lt: cursorObjectId } },
            ],
          };

      filter.$and = filter.$and || [];
      filter.$and.push(clause);
      cursorApplied = true;
    }

    // ===== Least-privilege projection (public-safe) =====
    // Avoid leaking internal fields or Cloudinary public ids
    const projection = [
      '_id',
      'projectId',
      'unitType',
      'unitTypeName',
      'unitNumber',
      'slug',
      'title',
      'status',
      'isPublished',
      'price',
      'pricePerUnit',
      'area',
      'areaUnit',
      'bedrooms',
      'bathrooms',
      'floorNumber',
      'floorName',
      'tower',
      'isCorner',
      'isFeatured',
      'images.url',
      'bookingInfo',
      'soldInfo',
      'createdAt',
      'updatedAt',
    ].join(' ');

    // ===== Execute query =====
    const query = (Unit as any)
      .find(filter)
      .select(projection)
      .sort(sort)
      .maxTimeMS(2500)
      .lean();

    let units: any[] = [];
    let hasMore = false;

    if (cursorApplied) {
      const rows = await query.limit(limit + 1);
      hasMore = rows.length > limit;
      units = hasMore ? rows.slice(0, limit) : rows;
    } else {
      const skip = (page - 1) * limit;
      units = await query.skip(skip).limit(limit);
    }

    // ===== Stats (project-wide, not filtered by current search; safe for UI) =====
    // Only compute lightweight aggregation; no user data.
    const statsAgg = await (Unit as any).aggregate([
      {
         $match: {
          projectId: projectObjectId,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: 1 },
          availableUnits: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          reservedUnits: { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
          soldUnits: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
          onHoldUnits: { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          minArea: { $min: '$area' },
          maxArea: { $max: '$area' },
        },
      },
    ]).option({ maxTimeMS: 2500 });

    const stats =
      statsAgg?.[0] || {
        totalUnits: 0,
        availableUnits: 0,
        reservedUnits: 0,
        soldUnits: 0,
        onHoldUnits: 0,
        minPrice: 0,
        maxPrice: 0,
        minArea: 0,
        maxArea: 0,
      };

    // ===== Groupings (based on returned page only) =====
    const unitsByFloor = units.reduce((acc: any, unit: any) => {
      const floor = unit.floorNumber ?? 'unknown';
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push({
        _id: unit._id,
        unitNumber: unit.unitNumber,
        status: unit.status,
        unitType: unit.unitType,
        price: unit.price,
        area: unit.area,
        bedrooms: unit.bedrooms,
        isCorner: unit.isCorner,
      });
      return acc;
    }, {});

    const unitsByType = units.reduce((acc: any, unit: any) => {
      const t = unit.unitType || unit.unitTypeName || 'other';
      if (!acc[t]) acc[t] = { total: 0, available: 0, reserved: 0, sold: 0 };
      acc[t].total++;
      if (unit.status === 'available') acc[t].available++;
      else if (unit.status === 'reserved') acc[t].reserved++;
      else if (unit.status === 'sold') acc[t].sold++;
      return acc;
    }, {});

    // ===== Next cursor (only cursor mode) =====
    let nextCursor: string | null = null;
    if (cursorApplied && units.length > 0) {
      const last: any = units[units.length - 1];
      const payload: CursorPayload = {
        createdAt: new Date(last.createdAt).toISOString(),
        _id: String(last._id),
      };
      nextCursor = b64urlEncode(payload);
    }

    // Cache policy:
    // - Public allowed: short cache
    // - Admin/owner preview or non-public access: no-store
    if (publicAllowed && !(isAdmin || isOwner)) {
      res.setHeader(
        'Cache-Control',
        cursorApplied
          ? 'public, s-maxage=15, stale-while-revalidate=60'
          : 'public, s-maxage=30, stale-while-revalidate=120'
      );
    } else {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }

    // Page totals only in page mode (cursor avoids count)
    if (!cursorApplied) {
      const totalCount = await (Unit as any).countDocuments(filter).maxTimeMS(2500);
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));

      return res.status(200).json({
        success: true,
        units,
        stats,
        unitsByFloor,
        unitsByType,
        pagination: {
          mode: 'page',
          page,
          limit,
          totalCount,
          totalPages,
          hasMore: page * limit < totalCount,
        },
        cursor: null,
      });
    }

    return res.status(200).json({
      success: true,
      units,
      stats,
      unitsByFloor,
      unitsByType,
      pagination: {
        mode: 'cursor',
        limit,
        hasMore,
      },
      cursor: {
        next: hasMore ? nextCursor : null,
      },
    });
  } catch (error: unknown) {
    await logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      userId: auth.id,
      metadata: {
        action: 'units_by_project_fetch_failed',
        projectId: typeof projectId === 'string' ? projectId : 'unknown',
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
}