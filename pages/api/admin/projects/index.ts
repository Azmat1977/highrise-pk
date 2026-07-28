/**
 * pages/api/admin/projects/index.ts
 *
 * GET  /api/admin/projects  → Admin project list with full filters
 * POST /api/admin/projects  → 405 (creation is developer-only via /api/projects)
 *
 * Admin-only endpoint. Full visibility: all statuses, deleted, any developer.
 * Supports: 12 filters, 6 sort options, dual pagination, bulk stats.
 *
 * V5.0.0 — requireAdmin, Upstash rate limit, logSecurityEvent,
 *           Projects.ts aligned (status/badge/developer field names)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import DeveloperProfile from '@/models/DeveloperProfile';

import { requireAdmin, getClientIp } from '@/lib/requireAuth';
import {
  rateLimitAdmin,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

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
  stats?: Record<string, unknown>;
};

type CursorPayload = {
  ts:  string;   // ISO timestamp
  _id: string;   // ObjectId string
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
  // Admin dashboard: never cache
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

// ─────────────────────────────────────────────
// Constants — V5.0.0 locked enums
// ─────────────────────────────────────────────

const VALID_STATUSES = new Set([
  'draft', 'pending', 'verified', 'rejected',
]);

const VALID_CATEGORIES = new Set([
  'highrise', 'society', 'mixed_use',
  'commercial_plaza', 'townhouse', 'gated_community',
]);

const VALID_NATURES = new Set([
  'residential', 'commercial', 'mixed',
]);

const VALID_BADGES = new Set([
  'new_entrant', 'emerging', 'trusted', 'premium',
]);

// Budget tiers → PKR ranges (Pakistani buyer UX)
const BUDGET_TIERS: Record<string, { min: number; max?: number }> = {
  under_50L:    { min: 0,          max: 5_000_000 },
  '50L_1Cr':    { min: 5_000_000,  max: 10_000_000 },
  '1Cr_3Cr':    { min: 10_000_000, max: 30_000_000 },
  '3Cr_5Cr':    { min: 30_000_000, max: 50_000_000 },
  above_5Cr:    { min: 50_000_000 },
};

// Sort options → MongoDB sort objects
// LESSON #65: Record<string, 1 | -1> not SortOrder
const SORT_OPTIONS: Record<string, Record<string, 1 | -1>> = {
  newest:       { createdAt: -1, _id: -1 },
  oldest:       { createdAt:  1, _id:  1 },
  updated:      { updatedAt: -1, _id: -1 },
  price_asc:    { minPrice:   1, _id:  1 },
  price_desc:   { minPrice:  -1, _id: -1 },
  most_viewed:  { 'unitTypeBreakdown.viewCount': -1, _id: -1 },
};

const DEFAULT_SORT = SORT_OPTIONS.newest;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
}

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) &&
    /^[a-fA-F0-9]{24}$/.test(id);
}

function b64urlEncode(obj: CursorPayload): string {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlDecode(token: string): CursorPayload | null {
  try {
    let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    return JSON.parse(
      Buffer.from(b64, 'base64').toString('utf8'),
    ) as CursorPayload;
  } catch {
    return null;
  }
}

function getPrimaryImage(p: Record<string, unknown>): string | null {
  if (typeof p.featureImageUrl === 'string' && p.featureImageUrl) {
    return p.featureImageUrl;
  }
  if (Array.isArray(p.images) && p.images.length > 0) {
    const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
    return imgs.find((i) => i.isPrimary)?.url ?? imgs[0]?.url ?? null;
  }
  return null;
}

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000)    return `${(amount / 100_000).toFixed(2)} Lac`;
  if (amount >= 1_000)      return `${(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

// Badge metadata
const BADGE_LABELS: Record<string, string> = {
  new_entrant: 'New Entrant',
  emerging:    'Emerging Developer',
  trusted:     'Trusted Builder',
  premium:     'Premium Developer',
};
const BADGE_EMOJIS: Record<string, string> = {
  new_entrant: '🆕',
  emerging:    '⭐',
  trusted:     '🏆',
  premium:     '💎',
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
      message: 'Method not allowed. Project creation is via POST /api/projects.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // ── Rate limit ──────────────────────────────
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  // ── Admin auth ──────────────────────────────
  const authResult = await requireAdmin(req, res);
  if (!authResult) return;

  const userId = authResult.id;
  const ip     = getClientIp(req);

  await dbConnect();

  // ── Query params ────────────────────────────
  const {
    // Filters
    status,
    projectCategory,
    projectNature,
    developerBadge,
    city,
    developerId,
    search,
    isFeatured,
    isVerified,
    budgetTier,
    minPrice,
    maxPrice,
    deleted,          // 'all' | 'true' | 'false'

    // Sort
    sortBy,

    // Pagination
    cursor,
    page,
    limit,

    // Include aggregate stats in response
    withStats,
  } = req.query;

  // ── Pagination ──────────────────────────────
  const limitNum   = clampInt(getString(limit), 20, 1, 100);
  const pageNum    = clampInt(getString(page), 1, 1, 1_000_000);
  const cursorTok  = getString(cursor).trim();
  const useCursor  = Boolean(cursorTok);

  // ── Sort ────────────────────────────────────
  const sortKey    = getString(sortBy).toLowerCase();
  const sortObj    = (SORT_OPTIONS[sortKey] ?? DEFAULT_SORT) as Record<string, 1 | -1>;

  // Determine primary sort field for cursor
  const primarySortField = sortKey === 'updated'   ? 'updatedAt' :
                           sortKey === 'price_asc'  ? 'minPrice'  :
                           sortKey === 'price_desc' ? 'minPrice'  :
                           sortKey === 'most_viewed'? 'unitTypeBreakdown.viewCount' :
                           'createdAt';

  // ── Build filter ─────────────────────────────
  const andClauses: Record<string, unknown>[] = [];

  // Deleted mode (admin sees all by default)
  const deletedVal = getString(deleted).toLowerCase();
  if (deletedVal === 'true')  andClauses.push({ isDeleted: true });
  if (deletedVal === 'false') andClauses.push({ isDeleted: { $ne: true } });
  // 'all' or omitted → no filter (admin sees everything)
  if (!deletedVal || deletedVal === 'all') {
    // no clause — show all including deleted
  }

  // Status — V5.0.0 enum only
  const statusVal = getString(status).toLowerCase().trim();
  if (statusVal && VALID_STATUSES.has(statusVal)) {
    andClauses.push({ status: statusVal });
  }

  // Category — 6 types
  const catVal = getString(projectCategory).toLowerCase().trim();
  if (catVal && VALID_CATEGORIES.has(catVal)) {
    andClauses.push({ projectCategory: catVal });
  }

  // Nature
  const natureVal = getString(projectNature).toLowerCase().trim();
  if (natureVal && VALID_NATURES.has(natureVal)) {
    andClauses.push({ projectNature: natureVal });
  }

  // Developer badge — 4 tiers
  const badgeVal = getString(developerBadge).toLowerCase().trim();
  if (badgeVal && VALID_BADGES.has(badgeVal)) {
    andClauses.push({ developerBadge: badgeVal });
  }

  // City
  const cityVal = getString(city).trim().slice(0, 80);
  if (cityVal) {
    andClauses.push({
      city: { $regex: new RegExp(`^${escapeRegExp(cityVal)}$`, 'i') },
    });
  }

  // Developer ID filter (admin views specific developer's projects)
  const devIdVal = getString(developerId).trim();
  if (devIdVal && isValidObjectId(devIdVal)) {
    andClauses.push({
      developer: new mongoose.Types.ObjectId(devIdVal),
    });
  }

  // Featured
  const featuredVal = getString(isFeatured).toLowerCase();
  if (featuredVal === 'true')  andClauses.push({ isFeatured: true });
  if (featuredVal === 'false') andClauses.push({ isFeatured: { $ne: true } });

  // Verified
  const verifiedVal = getString(isVerified).toLowerCase();
  if (verifiedVal === 'true')  andClauses.push({ isVerified: true });
  if (verifiedVal === 'false') andClauses.push({ isVerified: { $ne: true } });

  // Budget tier filter — Pakistani UX
  const tierVal = getString(budgetTier).trim();
  if (tierVal && BUDGET_TIERS[tierVal]) {
    const tier = BUDGET_TIERS[tierVal];
    const priceClause: Record<string, number> = { $gte: tier.min };
    if (tier.max !== undefined) priceClause.$lte = tier.max;
    andClauses.push({ minPrice: priceClause });
  } else {
    // Manual price range
    const minP = parseFloat(getString(minPrice));
    const maxP = parseFloat(getString(maxPrice));
    if (!isNaN(minP) && minP >= 0) {
      andClauses.push({ minPrice: { $gte: minP } });
    }
    if (!isNaN(maxP) && maxP > 0) {
      andClauses.push({ maxPrice: { $lte: maxP } });
    }
  }

  // Full-text search
  const searchVal = getString(search).trim().slice(0, 100);
  if (searchVal) {
    const rx = new RegExp(escapeRegExp(searchVal), 'i');
    andClauses.push({
      $or: [
        { projectName: rx },
        { city: rx },
        { areaName: rx },
        { tagline: rx },
        { slug: rx },
      ],
    });
  }

  // Assemble filter
  const filter: Record<string, unknown> = {};
  if (andClauses.length > 0) filter.$and = andClauses;

  // ── Cursor clause ────────────────────────────
  if (useCursor) {
    const decoded = b64urlDecode(cursorTok);
    if (!decoded?.ts || !decoded?._id || !isValidObjectId(decoded._id)) {
      return void res.status(400).json({
        success: false,
        message: 'Invalid or expired cursor.',
        code: 'INVALID_CURSOR',
      });
    }

    const tsDate   = new Date(decoded.ts);
    if (!Number.isFinite(tsDate.getTime())) {
      return void res.status(400).json({
        success: false,
        message: 'Invalid cursor timestamp.',
        code: 'INVALID_CURSOR',
      });
    }

    // Determine sort direction from sort object
    const primaryDir = Object.values(sortObj)[0] as 1 | -1;
    const op         = primaryDir === -1 ? '$lt' : '$gt';
    const cursorId   = new mongoose.Types.ObjectId(decoded._id);

    const cursorClause = {
      $or: [
        { [primarySortField]: { [op]: tsDate } },
        { [primarySortField]: tsDate, _id: { [op]: cursorId } },
      ],
    };

    const existing = (filter.$and as unknown[]) ?? [];
    filter.$and    = [...existing, cursorClause];
  }

  // ── Projection (admin gets full detail) ──────
  const projection = [
    '_id', 'slug', 'projectName',
    'city', 'areaName',
    'projectCategory', 'projectNature',
    'status', 'isFeatured', 'isVerified',
    'developerBadge', 'badgeAssignedAt',
    'developer',
    'featureImageUrl', 'images.url', 'images.isPrimary',
    'minPrice', 'maxPrice', 'priceRangeText',
    'totalUnits',
    'unitTypeBreakdown.availableUnits',
    'unitTypeBreakdown.soldUnits',
    'unitTypeBreakdown.reservedUnits',
    'unitTypeBreakdown.viewCount',
    'unitTypeBreakdown.inquiryCount',
    'unitTypeBreakdown.isFastSelling',
    'developmentProgress',
    'expectedCompletionDate',
    'rejectionReason',
    'verifiedAt', 'verifiedBy',
    'isDeleted', 'deletedAt',
    'createdAt', 'updatedAt',
  ].join(' ');

  // ── Execute query ─────────────────────────────
  const docs = await Project.find(filter)
    .sort(sortObj)
    .select(projection)
    .limit(useCursor ? limitNum + 1 : limitNum)
    .skip(useCursor ? 0 : (pageNum - 1) * limitNum)
    .maxTimeMS(5000)
    .lean();

  // ── Cursor: detect hasMore ────────────────────
  let hasMore = false;
  let rows    = docs;

  if (useCursor && docs.length > limitNum) {
    hasMore = true;
    rows    = docs.slice(0, limitNum);
  }

  // ── Enrich developer info ─────────────────────
  // Collect unique developer ObjectIds
  const developerIds = Array.from(
    new Set(
      rows
        .map((p) => String((p as unknown as Record<string, unknown>).developer ?? ''))
        .filter((id) => isValidObjectId(id)),
    ),
  ).map((id) => new mongoose.Types.ObjectId(id));

  // Batch fetch developer profiles (single query)
  const devProfiles = developerIds.length > 0
    ? await DeveloperProfile.find({ user: { $in: developerIds } })
        .select('user companyName logo verificationLevel completedProjectsCount status')
        .lean()
    : [];

  // Map user ObjectId → profile
  const devProfileMap = new Map<string, Record<string, unknown>>();
  for (const dp of devProfiles) {
    const dpRaw = dp as unknown as Record<string, unknown>;
    devProfileMap.set(String(dpRaw.user ?? ''), dpRaw);
  }

  // ── Enrich rows ───────────────────────────────
  const projects = rows.map((p) => {
    const proj  = p as unknown as Record<string, unknown>;
    const badge = String(proj.developerBadge ?? 'new_entrant');
    const devId = String(proj.developer ?? '');

    return {
      ...proj,
      primaryImage:   getPrimaryImage(proj),
      badgeLabel:     BADGE_LABELS[badge] ?? badge,
      badgeEmoji:     BADGE_EMOJIS[badge] ?? '',
      priceFormatted: {
        min: proj.minPrice ? formatPKR(Number(proj.minPrice)) : null,
        max: proj.maxPrice ? formatPKR(Number(proj.maxPrice)) : null,
      },
      developerProfile: devProfileMap.get(devId) ?? null,
    };
  });

  // ── Build next cursor ─────────────────────────
  let nextCursor: string | null = null;
  if (useCursor && hasMore && projects.length > 0) {
    const last  = projects[projects.length - 1] as Record<string, unknown>;
    const tsVal = last[primarySortField] as Date | string | undefined;

    nextCursor = b64urlEncode({
      ts:  tsVal ? new Date(tsVal as string).toISOString() : new Date().toISOString(),
      _id: String(last._id),
    });
  }

  // ── Aggregate stats (optional) ────────────────
  // ?withStats=true → include dashboard summary counts
  let stats: Record<string, unknown> | undefined;

  if (getString(withStats).toLowerCase() === 'true') {
    const [statusCounts, badgeCounts, totalCount] = await Promise.all([
      // Status breakdown
      Project.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Badge breakdown
      Project.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$developerBadge', count: { $sum: 1 } } },
      ]),
      // Total (respects current filter)
      Project.countDocuments(filter).maxTimeMS(3000),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[String(row._id ?? 'unknown')] = Number(row.count);
    }

    const byBadge: Record<string, number> = {};
    for (const row of badgeCounts) {
      byBadge[String(row._id ?? 'unknown')] = Number(row.count);
    }

    stats = {
      total:    totalCount,
      byStatus,
      byBadge,
    };
  }

  // ── Audit log (access log for sensitive admin data) ──
  await logSecurityEvent({
    type:     'admin_action',
    severity: 'low',
    userId,
    ip,
    metadata: {
      action:     'admin_projects_list',
      filters:    { statusVal, catVal, badgeVal, cityVal, searchVal, deletedVal },
      pagination: useCursor ? { mode: 'cursor', limit: limitNum } : { mode: 'page', page: pageNum, limit: limitNum },
      resultCount: projects.length,
    },
    req,
  });

  // ── Cursor mode response ──────────────────────
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
      ...(stats ? { stats } : {}),
    });
  }

  // ── Page mode response ────────────────────────
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
    ...(stats ? { stats } : {}),
  });
}