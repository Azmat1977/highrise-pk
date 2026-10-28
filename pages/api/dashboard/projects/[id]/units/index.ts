//C:\dev\highrise-pk\pages\api\dashboard\projects\[id]\units\index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';
import User from '@/models/User';
import { requireAuth } from '@/lib/requireAuth';

type ApiResponse =
  | {
      success: true;
      data: {
        id: string;
        projectName: string;
        city: string;
        area: string;
        unitTypes: any[];
        units: any[];
        groupedUnits: Record<string, any[]>;
        stats: {
          totalUnits: number;
          byStatus: Record<string, number>;
        };
        pagination: {
          mode: 'page' | 'cursor';
          page?: number;
          limit: number;
          total?: number;
          totalPages?: number;
          nextCursor?: string | null;
          hasMore?: boolean;
        };
      };
    }
  | { success: false; message: string };

function setSecurityHeaders(res: NextApiResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Helpful for API responses behind proxies/CDNs
  res.setHeader('Vary', 'Accept-Encoding');

  // Encourage HTTPS (best set at CDN/edge too, but safe here)
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');

  // API defaults: conservative
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Dashboard: never cache
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

const RL_WINDOW_MS = 60_000;
const RL_MAX = 120;
const bucket = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextApiRequest) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim();
  return (req.socket as any)?.remoteAddress || '0.0.0.0';
}

function rateLimit(req: NextApiRequest) {
  const ip = getClientIp(req);
  const key = `dash:projects:units:${ip}`;
  const now = Date.now();

  // Lightweight cleanup to avoid unbounded Map growth
  if (bucket.size > 10_000) {
    for (const [k, v] of bucket.entries()) {
      if (now > v.resetAt) bucket.delete(k);
    }
  }

  const curr = bucket.get(key);
  if (!curr || now > curr.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    return { ok: true };
  }
  if (curr.count >= RL_MAX) return { ok: false };
  curr.count += 1;
  bucket.set(key, curr);
  return { ok: true };
}

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeString(v: any) {
  return typeof v === 'string' ? v.trim() : '';
}

async function requireSession(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return { ok: false as const };

  const role = String(auth.role || '').toLowerCase();
  const isAdmin =
    auth.authorityRole === 'admin' ||
    role === 'admin' ||
    role === 'superadmin';

  return { ok: true as const, userId: auth.id, isAdmin };
}

async function enforceActiveAndCnicIfPossible(
  userId: string,
  isAdmin: boolean
): Promise<{ ok: boolean; status: number; message: string }> {
  if (isAdmin) return { ok: true, status: 200, message: 'ok' };

  try {
    const u: any = await User.findById(userId)
      .select('_id isActive disabled status cnicVerified cnic verified')
      .lean();

    if (!u) return { ok: false, status: 401, message: 'Unauthorized' };

    const disabled =
      u.disabled === true ||
      u.isActive === false ||
      u.status === 'disabled' ||
      u.status === 'banned';

    if (disabled) return { ok: false, status: 403, message: 'Account is not active.' };

    const cnicVerified =
      u.cnicVerified === true || u.verified === true || u?.cnic?.verified === true;

    if (!cnicVerified) {
      return { ok: false, status: 403, message: 'CNIC verification is required for dashboard access.' };
    }

    return { ok: true, status: 200, message: 'ok' };
  } catch {
    // best-effort
    return { ok: true, status: 200, message: 'ok' };
  }
}

function buildCursor(id: string) {
  return Buffer.from(id, 'utf8').toString('base64');
}

function parseCursor(cursor: string) {
  try {
    return Buffer.from(cursor, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function groupByUnitType(items: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const it of items) {
    const t = normalizeString(it?.unitType) || normalizeString(it?.unitTypeName) || 'unknown';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(it);
  }
  return grouped;
}

function tallyByStatus(items: any[], knownStatuses: string[]) {
  const map: Record<string, number> = {};
  for (const s of knownStatuses) map[s] = 0;
  for (const it of items) {
    const s = normalizeString(it?.status) || 'unknown';
    if (map[s] === undefined) map[s] = 0;
    map[s] += 1;
  }
  return map;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  setSecurityHeaders(res);

  const rl = rateLimit(req);
  if (!rl.ok) {
    return res.status(429).json({ success: false, message: 'Too many requests. Please try again.' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const auth = await requireSession(req, res);
  if (!auth.ok) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Project ID is required' });
  }

  try {
    await dbConnect();

    const gate = await enforceActiveAndCnicIfPossible(auth.userId, auth.isAdmin);
    if (!gate.ok) {
      return res.status(gate.status).json({ success: false, message: gate.message });
    }

    // Resolve project by ObjectId only (dashboard should use stable ids)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format.' });
    }

    const project: any = await Project.findById(id)
      .select('_id developerId projectName city area unitTypeBreakdown isDeleted deletedAt')
      .lean();

    // safe 404
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const ownerId = String(project.developerId || '');
    const isOwner = ownerId && ownerId === String(auth.userId);

    if (!auth.isAdmin && !isOwner) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // If project is trashed/deleted, only admin can query it (safe default)
    const projectDeleted = project.isDeleted === true || !!project.deletedAt;
    if (projectDeleted && !auth.isAdmin) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // ===== Dual Pagination (LOCKED) =====
    const limit = clampInt(req.query.limit, 30, 1, 80);
    const page = clampInt(req.query.page, 1, 1, 1_000_000);
    const cursor = normalizeString(req.query.cursor);
    const mode: 'page' | 'cursor' = cursor ? 'cursor' : 'page';

    // If cursor mode is requested, cursor MUST be valid
    if (mode === 'cursor') {
      const lastId = parseCursor(cursor);
      if (!lastId || !mongoose.Types.ObjectId.isValid(lastId)) {
        return res.status(400).json({ success: false, message: 'Invalid cursor' });
      }
    }

    // ===== Filters (dashboard can filter all, but validated) =====
    const unitType = normalizeString(req.query.unitType);
    const unitStatus = normalizeString(req.query.status);
    const q = normalizeString(req.query.q);

    const query: any = { projectId: project._id };

    // Optional includeDeleted flag (admin + owner can use to manage trash)
    const includeDeletedRaw = normalizeString(req.query.includeDeleted);
    const includeDeleted = includeDeletedRaw === '1' || includeDeletedRaw.toLowerCase() === 'true';

    if (!includeDeleted) query.isDeleted = { $ne: true };

    // Best-effort allowlist: unitType against project.unitTypeBreakdown
    const allowedUnitTypes = new Set<string>();
    if (Array.isArray(project?.unitTypeBreakdown)) {
      for (const it of project.unitTypeBreakdown) {
        if (typeof it === 'string' && it.trim()) allowedUnitTypes.add(it.trim());
        if (it && typeof it === 'object') {
          const a = typeof (it as any).unitType === 'string' ? (it as any).unitType.trim() : '';
          const b = typeof (it as any).name === 'string' ? (it as any).name.trim() : '';
          const c = typeof (it as any).type === 'string' ? (it as any).type.trim() : '';
          if (a) allowedUnitTypes.add(a);
          if (b) allowedUnitTypes.add(b);
          if (c) allowedUnitTypes.add(c);
        }
      }
    }

    if (unitType) {
      if (allowedUnitTypes.size > 0 && !allowedUnitTypes.has(unitType)) {
        return res.status(400).json({ success: false, message: 'Invalid unitType' });
      }
      query.unitType = unitType;
    }

    // Status allowlist (dashboard-safe)
    const allowedStatuses = new Set([
      'available',
      'reserved',
      'sold',
      'on_hold',
      'pending',
      'approved',
      'rejected',
      'draft',
      'inactive',
    ]);

    if (unitStatus) {
      const s = unitStatus.toLowerCase();
      if (!allowedStatuses.has(s)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      query.status = s;
    }

    if (q) {
      const safe = q.slice(0, 60);
      const escaped = safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ title: new RegExp(escaped, 'i') }, { unitNumber: new RegExp(escaped, 'i') }];
    }

    // ===== Projection (dashboard: still least-privilege) =====
    const select = [
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
      'tower',
      'images',
      'bookingInfo',
      'soldInfo',
      'isDeleted',
      'deletedAt',
      'createdAt',
      'updatedAt',
    ].join(' ');

    const sortCursor = { _id: -1 };
    const sortPage = { createdAt: -1, _id: -1 };

    let items: any[] = [];
    let pagination: any = { mode, limit };

    if (mode === 'cursor') {
      const lastId = parseCursor(cursor);
      // already validated above
      query._id = { $lt: new mongoose.Types.ObjectId(lastId) };

      const rows = await (Unit as any)
        .find(query)
        .select(select)
        .sort(sortCursor)
        .limit(limit + 1)
        .lean();

      const hasMore = rows.length > limit;
      items = hasMore ? rows.slice(0, limit) : rows;

      const nextCursor =
        hasMore && items.length > 0 ? buildCursor(String(items[items.length - 1]._id)) : null;

      pagination = { mode, limit, nextCursor, hasMore };
    } else {
      const skip = (page - 1) * limit;

      const [rows, total] = await Promise.all([
        (Unit as any).find(query).select(select).sort(sortPage).skip(skip).limit(limit).lean(),
        (Unit as any).countDocuments(query),
      ]);

      items = rows;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      pagination = { mode, page, limit, total, totalPages };
    }

    const groupedUnits = groupByUnitType(items);

    const knownStatuses = ['available', 'reserved', 'sold', 'on_hold', 'pending', 'approved', 'rejected'];
    const byStatus = tallyByStatus(items, knownStatuses);

    return res.status(200).json({
      success: true,
      data: {
        id: String(project._id),
        projectName: project.projectName || '',
        city: project.city || '',
        area: project.area || '',
        unitTypes: Array.isArray(project.unitTypeBreakdown) ? project.unitTypeBreakdown : [],
        units: items,
        groupedUnits,
        stats: { totalUnits: items.length, byStatus },
        pagination,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
}
