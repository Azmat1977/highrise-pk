/**
 * pages/api/projects/my-projects.ts
 *
 * GET /api/projects/my-projects
 *
 * Returns the authenticated developer's own projects (dashboard list).
 * Supports dual pagination (cursor + page), filters, and sort.
 *
 * Access:
 *   - Developer: their own projects only
 *   - Admin: can pass ?developerId=xxx to view any developer's projects
 *
 * V5.0.0 — Aligned with Projects.ts model, requireAuth, Upstash rate limit
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';

import { requireAuth, getClientIp } from '@/lib/requireAuth';
import {
  rateLimitApi,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ApiResponse = {
  success: boolean;
  message?: string;
  code?: string;
  projects?: unknown[];
  pagination?: Record<string, unknown>;
  cursor?: { next: string | null } | null;
};

type CursorPayload = {
  ts: string;   // ISO timestamp for primary sort field
  _id: string;  // tiebreaker
};

// ─────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains');
  // Dashboard data must never be cached
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getString(q: string | string[] | undefined): string {
  if (!q) return '';
  return Array.isArray(q) ? String(q[0] ?? '') : String(q);
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n) || Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

function b64urlEncode(obj: CursorPayload): string {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlDecode(token: string): CursorPayload | null {
  try {
    const t = String(token).trim();
    if (!t) return null;
    let b64 = t.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as CursorPayload;
  } catch {
    return null;
  }
}

/**
 * Primary image: featureImageUrl → first isPrimary → first image
 */
function getPrimaryImage(p: Record<string, unknown>): string | null {
  if (typeof p.featureImageUrl === 'string' && p.featureImageUrl) {
    return p.featureImageUrl;
  }
  if (Array.isArray(p.images) && p.images.length > 0) {
    const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
    const primary = imgs.find((img) => img.isPrimary);
    return primary?.url ?? imgs[0]?.url ?? null;
  }
  return null;
}

// V5.0.0 valid enums — locked
const VALID_CATEGORIES = new Set([
  'highrise', 'society', 'mixed_use',
  'commercial_plaza', 'townhouse', 'gated_community',
]);
const VALID_NATURES  = new Set(['residential', 'commercial', 'mixed']);
const VALID_STATUSES = new Set(['draft', 'pending', 'verified', 'rejected']);

// Badge labels for response enrichment
const BADGE_LABELS: Record<string, string> = {
  new_entrant: '🆕 New Entrant',
  emerging:    '⭐ Emerging',
  trusted:     '🏆 Trusted Builder',
  premium:     '💎 Premium Developer',
};

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // ── Rate limit ──────────────────────────────
  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  // ── Auth ────────────────────────────────────
  const authResult = await requireAuth(req, res);
  if (!authResult) return; // requireAuth sent 401

  const userId  = authResult.id;
  const role    = authResult.role;
  const isAdmin = role === 'admin';
  const ip      = getClientIp(req);

  // Only developer or admin can access this endpoint
  if (!isAdmin && role !== 'developer') {
    return void res.status(403).json({
      success: false,
      message: 'Only developer accounts can access project listings.',
      code: 'FORBIDDEN',
    });
  }

  await dbConnect();

  // ── Query params ────────────────────────────
  const {
    // Admin-only: view a specific developer's projects
    developerId: devIdParam,

    // Filters
    city,
    projectCategory,
    projectNature,
    status,
    search,
    isFeatured,

    // Deleted-mode (admin only)
    deleted,

    // Sort
    sortBy,
    sortDir,

    // Pagination
    cursor,
    page,
    limit,
  } = req.query;

  // ── Determine whose projects to show ────────
  let targetDeveloperId = userId; // default: own projects

  if (isAdmin && devIdParam) {
    const raw = getString(devIdParam).trim();
    if (!isValidObjectId(raw)) {
      return void res.status(400).json({
        success: false,
        message: 'Invalid developerId.',
        code: 'INVALID_DEVELOPER_ID',
      });
    }
    targetDeveloperId = raw;
  }

  // ── Deleted mode (admin only) ───────────────
  // Owners always see non-deleted only (trash.ts handles trashed view)
  let deletedMode: 'exclude' | 'only' | 'all' = 'exclude';
  if (isAdmin && deleted) {
    const d = getString(deleted).toLowerCase();
    if (d === 'all')   deletedMode = 'all';
    if (d === 'true')  deletedMode = 'only';
    if (d === 'false') deletedMode = 'exclude';
  }

  // ── Pagination ──────────────────────────────
  const limitNum    = clampInt(parseInt(getString(limit) || '20', 10), 1, 100);
  const cursorToken = getString(cursor).trim();
  const pageNum     = clampInt(parseInt(getString(page) || '1', 10), 1, 1_000_000);
  const useCursor   = Boolean(cursorToken);

  // ── Sort ────────────────────────────────────
  // LESSON #65: use Record<string, 1 | -1> not SortOrder
  const sortByVal  = getString(sortBy).toLowerCase();
  const sortDirVal = getString(sortDir).toLowerCase();

  const primarySortField = sortByVal === 'updatedat' ? 'updatedAt' : 'createdAt';
  const dir: 1 | -1      = sortDirVal === 'asc' ? 1 : -1;

  const sort: Record<string, 1 | -1> = {
    [primarySortField]: dir,
    _id: dir, // stable tiebreaker
  };

  // ── Build filter ─────────────────────────────
  // Projects.ts uses 'developer' (ObjectId ref to User), not 'developerId'
  const andClauses: Record<string, unknown>[] = [];

  const filter: Record<string, unknown> = {
    developer: new mongoose.Types.ObjectId(targetDeveloperId),
  };

  // Deleted filter
  if (deletedMode === 'exclude') andClauses.push({ isDeleted: { $ne: true } });
  if (deletedMode === 'only')    andClauses.push({ isDeleted: true });
  // 'all' → no clause

  // City filter
  const cityVal = getString(city).trim().slice(0, 80);
  if (cityVal) {
    andClauses.push({
      city: { $regex: new RegExp(`^${escapeRegExp(cityVal)}$`, 'i') },
    });
  }

  // Category filter — V5.0.0 has 6 categories
  const catVal = getString(projectCategory).toLowerCase().trim();
  if (catVal && VALID_CATEGORIES.has(catVal)) {
    andClauses.push({ projectCategory: catVal });
  }

  // Nature filter
  const natureVal = getString(projectNature).toLowerCase().trim();
  if (natureVal && VALID_NATURES.has(natureVal)) {
    andClauses.push({ projectNature: natureVal });
  }

  // Status filter — V5.0.0 enum only
  const statusVal = getString(status).toLowerCase().trim();
  if (statusVal && VALID_STATUSES.has(statusVal)) {
    andClauses.push({ status: statusVal });
  }

  // Featured filter
  const featuredVal = getString(isFeatured).toLowerCase();
  if (featuredVal === 'true')  andClauses.push({ isFeatured: true });
  if (featuredVal === 'false') andClauses.push({ isFeatured: { $ne: true } });

  // Search — projects.ts uses 'areaName' not 'area'
  const searchVal = getString(search).trim().slice(0, 100);
  if (searchVal) {
    const rx = new RegExp(escapeRegExp(searchVal), 'i');
    andClauses.push({
      $or: [
        { projectName: rx },
        { city: rx },
        { areaName: rx },    // V5.0.0 field name
        { tagline: rx },
      ],
    });
  }

  if (andClauses.length > 0) {
    filter.$and = andClauses;
  }

  // ── Cursor clause ────────────────────────────
  if (useCursor) {
    const parsed = b64urlDecode(cursorToken);

    if (!parsed?.ts || !parsed?._id || !isValidObjectId(parsed._id)) {
      return void res.status(400).json({
        success: false,
        message: 'Invalid or expired cursor.',
        code: 'INVALID_CURSOR',
      });
    }

    const tsDate = new Date(parsed.ts);
    if (!Number.isFinite(tsDate.getTime())) {
      return void res.status(400).json({
        success: false,
        message: 'Invalid cursor timestamp.',
        code: 'INVALID_CURSOR',
      });
    }

    const cursorId = new mongoose.Types.ObjectId(parsed._id);
    const op = dir === -1 ? '$lt' : '$gt';

    const cursorClause = {
      $or: [
        { [primarySortField]: { [op]: tsDate } },
        { [primarySortField]: tsDate, _id: { [op]: cursorId } },
      ],
    };

    const existing = (filter.$and as unknown[]) ?? [];
    filter.$and = [...existing, cursorClause];
  }

  // ── Projection (dashboard cards — least privilege) ──
  // No Cloudinary public_id in list view
  const projection = [
    '_id', 'slug', 'projectName',
    'city', 'areaName',
    'projectCategory', 'projectNature',
    'status', 'isFeatured', 'isVerified',
    'developerBadge',
    'featureImageUrl',
    'images.url', 'images.isPrimary',
    'minPrice', 'maxPrice', 'priceRangeText',
    'totalUnits',
    'unitTypeBreakdown.availableUnits',
    'unitTypeBreakdown.soldUnits',
    'unitTypeBreakdown.viewCount',
    'unitTypeBreakdown.inquiryCount',
    'developmentProgress',
    'expectedCompletionDate',
    'createdAt', 'updatedAt',
    // Admin/deleted extra fields
    ...(deletedMode !== 'exclude' || isAdmin ? ['isDeleted', 'deletedAt'] : []),
    ...(isAdmin ? ['rejectionReason', 'verifiedAt', 'verifiedBy'] : []),
  ].join(' ');

  // ── Execute query ────────────────────────────
  try {
    const docs = await Project.find(filter)
      .sort(sort)
      .select(projection)
      .limit(useCursor ? limitNum + 1 : limitNum)
      .skip(useCursor ? 0 : (pageNum - 1) * limitNum)
      .maxTimeMS(3000)
      .lean();

    // ── Cursor: detect hasMore ───────────────
    let hasMore = false;
    let rows    = docs;

    if (useCursor && docs.length > limitNum) {
      hasMore = true;
      rows    = docs.slice(0, limitNum);
    }

    // ── Enrich rows ──────────────────────────
    const projects = rows.map((p) => {
      const proj = p as Record<string, unknown>;
      const badge = String(proj.developerBadge ?? 'new_entrant');
      return {
        ...proj,
        primaryImage: getPrimaryImage(proj),
        badgeLabel:   BADGE_LABELS[badge] ?? badge,
        // Price formatting (PKR)
        priceFormatted: formatPriceRange(
          proj.minPrice as number | undefined,
          proj.maxPrice as number | undefined,
        ),
      };
    });

    // ── Build next cursor ────────────────────
    let nextCursor: string | null = null;
    if (useCursor && hasMore && projects.length > 0) {
      const last = projects[projects.length - 1] as Record<string, unknown>;
      const ts   = (primarySortField === 'updatedAt' ? last.updatedAt : last.createdAt) as
        | string
        | Date
        | undefined;

      nextCursor = b64urlEncode({
        ts:  ts ? new Date(ts as string).toISOString() : new Date().toISOString(),
        _id: String(last._id),
      });
    }

    // ── Cursor mode response ─────────────────
    if (useCursor) {
      return void res.status(200).json({
        success: true,
        projects,
        pagination: {
          mode:    'cursor',
          limit:   limitNum,
          hasMore,
          count:   projects.length,
        },
        cursor: { next: hasMore ? nextCursor : null },
      });
    }

    // ── Page mode response ───────────────────
    const total = await Project.countDocuments(filter).maxTimeMS(3000);
    const pages = Math.max(1, Math.ceil(total / limitNum));

    return void res.status(200).json({
      success: true,
      projects,
      pagination: {
        mode:    'page',
        page:    pageNum,
        limit:   limitNum,
        total,
        pages,
        hasNext: pageNum < pages,
        hasPrev: pageNum > 1,
        count:   projects.length,
      },
      cursor: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    void ip; // consumed for future audit log

    return void res.status(500).json({
      success: false,
      message: 'Failed to fetch projects.',
      code:    'SERVER_ERROR',
    });
  }
}

// ─────────────────────────────────────────────
// PKR price formatter
// ─────────────────────────────────────────────

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000)    return `${(amount / 100_000).toFixed(2)} Lac`;
  if (amount >= 1_000)      return `${(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

function formatPriceRange(
  min: number | undefined,
  max: number | undefined,
): string | null {
  if (!min && !max) return null;
  if (min && max)   return `${formatPKR(min)} – ${formatPKR(max)}`;
  if (min)          return `From ${formatPKR(min)}`;
  if (max)          return `Up to ${formatPKR(max)}`;
  return null;
}