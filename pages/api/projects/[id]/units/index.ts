/**
 * pages/api/projects/[id]/units/index.ts
 *
 * GET  /api/projects/[id]/units  → Public unit listing for a project
 * POST /api/projects/[id]/units  → Developer creates a unit in their project
 *
 * V5.0.0 — Aligned with Unit.ts model, Projects.ts, requireAuth,
 *           Upstash rate limit, logSecurityEvent, syncUnitTypeBreakdown
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';

import { requireAuth, getClientIp } from '@/lib/requireAuth';
import {
  rateLimitApi,
  rateLimitApiWrite,
  rateLimitPropertyCreate,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';
import { getToken } from 'next-auth/jwt';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ApiResponse = {
  success: boolean;
  message?: string;
  code?: string;
  data?: unknown;
  unit?: unknown;
  errors?: Record<string, string[]>;
};

// ─────────────────────────────────────────────
// Zod v4 — POST validation schema
// ─────────────────────────────────────────────

const CreateUnitSchema = z.object({
  // Identity
  unitNumber:   z.string().min(1).max(20),
  unitType:     z.enum([
    'apartment', 'penthouse', 'studio', 'duplex', 'shop',
    'office', 'warehouse', 'plot', 'villa', 'townhouse', 'other',
  ]),
  floor:        z.number().int().min(-5).max(200).optional(),
  title:        z.string().max(120).optional(),
  description:  z.string().max(5000).optional(),

  // Size
  areaSqft:     z.number().min(0).optional(),
  areaMarla:    z.number().min(0).optional(),
  areaUnit:     z.enum(['sqft', 'marla', 'kanal', 'sqyard']).optional(),

  // Pricing
  listingType:  z.enum(['full_payment', 'installment', 'both', 'pre_launch']),
  price:        z.number().min(0),
  priceOnCall:  z.boolean().optional(),

  // Installment (required if listingType includes installment)
  installment: z.object({
    downPaymentPercent: z.number().min(0).max(100),
    monthlyInstallment: z.number().min(0),
    installmentMonths:  z.number().int().min(1),
    handoverPercent:    z.number().min(0).max(100).optional(),
  }).optional(),

  // Features
  bedrooms:   z.number().int().min(0).max(20).optional(),
  bathrooms:  z.number().int().min(0).max(20).optional(),
  parkingSpaces: z.number().int().min(0).max(10).optional(),

  // Status
  status: z.enum([
    'available', 'reserved', 'sold', 'on_hold', 'cancelled',
  ]).optional().default('available'),

  // Investor intelligence
  expectedRentalYield:  z.number().min(0).max(100).optional(),
  estimatedMonthlyRent: z.number().min(0).optional(),
  capitalAppreciation:  z.number().min(0).max(100).optional(),

  // Media (pre-uploaded via /api/upload)
  images: z.array(z.object({
    url:       z.string().url(),
    public_id: z.string().min(1),
    isPrimary: z.boolean().optional(),
    caption:   z.string().max(200).optional(),
  })).max(20).optional(),

  // Facing / orientation
  facing:   z.string().max(20).optional(),
  features: z.array(z.string().max(50)).max(30).optional(),
}).strict();

type CreateUnitBody = z.infer<typeof CreateUnitSchema>;

// ─────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, isPublic: boolean): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains');
  res.setHeader('Vary', 'Accept-Encoding');

  if (isPublic) {
    // Public GET: cacheable
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  } else {
    // POST mutations: never cache
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

function normalizeId(id: string | string[] | undefined): string {
  return Array.isArray(id) ? String(id[0] ?? '') : String(id ?? '');
}

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * b64url cursor encode/decode — stable for ObjectId strings
 */
function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeCursor(token: string): string {
  try {
    let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Format PKR price: Crore / Lac / K
 */
function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000)    return `${(amount / 100_000).toFixed(2)} Lac`;
  if (amount >= 1_000)      return `${(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

// V5.0.0: project is public only when status === 'verified'
function isProjectPublic(project: Record<string, unknown>): boolean {
  return project.isVerified === true || project.status === 'verified';
}

// Valid Unit statuses (V5.0.0)
const VALID_UNIT_STATUSES = new Set([
  'available', 'reserved', 'sold', 'on_hold', 'cancelled',
]);

// Valid Unit types
const VALID_UNIT_TYPES = new Set([
  'apartment', 'penthouse', 'studio', 'duplex', 'shop',
  'office', 'warehouse', 'plot', 'villa', 'townhouse', 'other',
]);

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  const method = (req.method ?? 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'POST') {
    setSecurityHeaders(res, false);
    res.setHeader('Allow', ['GET', 'POST']);
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // Set headers early (GET = public cacheable, POST = no-store)
  setSecurityHeaders(res, method === 'GET');

  // ── Rate limit ──────────────────────────────
  const rl = await (method === 'POST'
    ? rateLimitPropertyCreate(req)
    : rateLimitApi(req));

  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  // ── Resolve project ID or slug ───────────────
  const idOrSlug = normalizeId(req.query.id as string | string[] | undefined).trim();
  if (!idOrSlug) {
    return void res.status(400).json({
      success: false,
      message: 'Project ID or slug is required.',
      code: 'MISSING_ID',
    });
  }

  await dbConnect();

  if (method === 'GET') return void handleGet(req, res, idOrSlug);
  if (method === 'POST') return void handlePost(req, res, idOrSlug);
}

// ─────────────────────────────────────────────
// GET — Public unit listing
// ─────────────────────────────────────────────

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  idOrSlug: string,
): Promise<void> {
  // Optional auth — owner/admin can see all statuses
  const token      = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const viewerId   = token?.sub ? String(token.sub) : null;
  const viewerRole = token?.role ? String(token.role) : 'user';
  const isAdmin    = viewerRole === 'admin';

  // Resolve project
  const projectFilter: Record<string, unknown> = { isDeleted: { $ne: true } };
  const project = await (
    isValidObjectId(idOrSlug)
      ? Project.findOne({ _id: idOrSlug, ...projectFilter })
      : Project.findOne({ slug: idOrSlug, ...projectFilter })
  )
    .select('_id developer slug projectName city areaName status isVerified unitTypeBreakdown')
    .lean();

  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  const proj = project as unknown as Record<string, unknown>;

  // Ownership check (Projects.ts uses 'developer' field)
  const ownerStr = String(proj.developer ?? '');
  const isOwner  = viewerId ? ownerStr === viewerId : false;

  // Public visibility gate — V5.0.0: only 'verified' is public
  if (!isProjectPublic(proj) && !isAdmin && !isOwner) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Query params ─────────────────────────────
  const limitNum   = clampInt(req.query.limit, 24, 1, 60);
  const pageNum    = clampInt(req.query.page, 1, 1, 1_000_000);
  const cursorTok  = String(req.query.cursor ?? '').trim();
  const useCursor  = Boolean(cursorTok);

  const unitTypeFilter = String(req.query.unitType ?? '').trim().toLowerCase();
  const statusFilter   = String(req.query.status ?? '').trim().toLowerCase();
  const searchQ        = String(req.query.q ?? '').trim().slice(0, 60);

  // Sort
  const sortByVal  = String(req.query.sortBy ?? '').toLowerCase();
  const sortDirVal = String(req.query.sortDir ?? '').toLowerCase();
  const sortDir: 1 | -1 = sortDirVal === 'asc' ? 1 : -1;
  const sortField  = sortByVal === 'price' ? 'price' :
                     sortByVal === 'area'  ? 'areaSqft' : 'createdAt';

  const sort: Record<string, 1 | -1> = { [sortField]: sortDir, _id: sortDir };

  // ── Build filter ─────────────────────────────
  // Unit.ts uses 'project' (ObjectId ref), not 'projectId'
  const filter: Record<string, unknown> = {
    project:   new mongoose.Types.ObjectId(String(proj._id ?? '')),
    isDeleted: { $ne: true },
  };

  // Status filter
  // Public: default to 'available' only; owner/admin can see all
  if (statusFilter && VALID_UNIT_STATUSES.has(statusFilter)) {
    filter.status = statusFilter;
  } else if (!isAdmin && !isOwner) {
    // Public default: only show available units
    filter.status = 'available';
  }

  // Unit type filter
  if (unitTypeFilter && VALID_UNIT_TYPES.has(unitTypeFilter)) {
    filter.unitType = unitTypeFilter;
  }

  // Floor filter
  const floorFilter = req.query.floor !== undefined
    ? parseInt(String(req.query.floor), 10)
    : NaN;
  if (!isNaN(floorFilter)) {
    filter.floor = floorFilter;
  }

  // Search
  if (searchQ) {
    const rx = new RegExp(escapeRegExp(searchQ), 'i');
    filter.$or = [{ unitNumber: rx }, { title: rx }];
  }

  // ── Projection (least privilege — no CNIC fields) ──
  const select = [
    '_id', 'unitNumber', 'unitType', 'floor', 'title',
    'status', 'listingType',
    'price', 'priceOnCall',
    'areaSqft', 'areaMarla', 'areaUnit',
    'bedrooms', 'bathrooms', 'parkingSpaces',
    'facing', 'features',
    'images',
    'slug', 'canonicalUrl',
    'developerBadge',
    'expectedRentalYield', 'estimatedMonthlyRent',
    'investmentScore', 'demandScore',
    'createdAt', 'updatedAt',
    // Installment (public — no CNIC)
    'installment.downPaymentPercent',
    'installment.monthlyInstallment',
    'installment.installmentMonths',
  ].join(' ');

  // ── Execute query ─────────────────────────────
  let units: unknown[] = [];
  let hasMore          = false;
  let nextCursor: string | null = null;
  let total: number | undefined;

  if (useCursor) {
    const lastId = decodeCursor(cursorTok);
    if (!lastId || !isValidObjectId(lastId)) {
      return void res.status(400).json({
        success: false,
        message: 'Invalid or expired cursor.',
        code: 'INVALID_CURSOR',
      });
    }

    filter._id = { [sortDir === -1 ? '$lt' : '$gt']: new mongoose.Types.ObjectId(lastId) };

    const rows = await Unit.find(filter)
      .select(select)
      .sort(sort)
      .limit(limitNum + 1)
      .lean();

    hasMore = rows.length > limitNum;
    units   = hasMore ? rows.slice(0, limitNum) : rows;

    if (hasMore && units.length > 0) {
      const last = units[units.length - 1] as { _id: mongoose.Types.ObjectId };
      nextCursor = encodeCursor(String(last._id));
    }
  } else {
    const skip = (pageNum - 1) * limitNum;
    const [rows, count] = await Promise.all([
      Unit.find(filter).select(select).sort(sort).skip(skip).limit(limitNum).lean(),
      Unit.countDocuments(filter),
    ]);
    units = rows;
    total = count;
  }

  // ── Enrich units ──────────────────────────────
  const enriched = (units as Array<Record<string, unknown>>).map((u) => ({
    ...u,
    priceFormatted: typeof u.price === 'number' ? formatPKR(u.price) : null,
    primaryImage: (() => {
      const imgs = u.images as Array<{ url: string; isPrimary?: boolean }> | undefined;
      if (!imgs?.length) return null;
      return imgs.find((i) => i.isPrimary)?.url ?? imgs[0]?.url ?? null;
    })(),
  }));

  // ── Stats ─────────────────────────────────────
  const byStatus: Record<string, number> = {};
  for (const u of enriched) {
    const s = String((u as Record<string, unknown>).status ?? 'unknown');
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  // ── Response ──────────────────────────────────
  return void res.status(200).json({
    success: true,
    data: {
      projectId:   String(proj._id ?? ''),
      projectName: String(proj.projectName ?? ''),
      city:        String(proj.city ?? ''),
      areaName:    String(proj.areaName ?? ''),  // V5.0.0: areaName not area
      units:       enriched,
      stats: {
        count:    enriched.length,
        total:    total ?? enriched.length,
        byStatus,
      },
      pagination: useCursor
        ? { mode: 'cursor', limit: limitNum, hasMore, nextCursor }
        : {
            mode:       'page',
            page:       pageNum,
            limit:      limitNum,
            total:      total ?? 0,
            totalPages: Math.max(1, Math.ceil((total ?? 0) / limitNum)),
          },
    },
  });
}

// ─────────────────────────────────────────────
// POST — Developer creates a unit
// ─────────────────────────────────────────────

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  idOrSlug: string,
): Promise<void> {
  // ── Auth: developer or admin ─────────────────
  const authResult = await requireAuth(req, res);
  if (!authResult) return;

  const userId  = authResult.id;
  const role    = authResult.role;
  const isAdmin = role === 'admin';
  const ip      = getClientIp(req);

  if (!isAdmin && role !== 'developer') {
    return void res.status(403).json({
      success: false,
      message: 'Only developers can add units to projects.',
      code: 'FORBIDDEN',
    });
  }

  // ── Resolve project ───────────────────────────
  const project = await (
    isValidObjectId(idOrSlug)
      ? Project.findOne({ _id: idOrSlug, isDeleted: { $ne: true } })
      : Project.findOne({ slug: idOrSlug, isDeleted: { $ne: true } })
  )
    .select('_id developer slug projectName city areaName developerBadge contactVisibility status isVerified')
    .lean();

  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  const proj = project as unknown as Record<string, unknown>;

  // ── Ownership check ───────────────────────────
  const ownerStr = String(proj.developer ?? '');
  if (!isAdmin && ownerStr !== userId) {
    // Anti-enumeration
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Project must be at least pending to add units ──
  const projStatus = String(proj.status ?? 'draft');
  if (!isAdmin && projStatus === 'draft') {
    return void res.status(409).json({
      success: false,
      message: 'Submit your project for review before adding units.',
      code: 'PROJECT_DRAFT',
    });
  }

  // ── Parse + validate body ─────────────────────
  let body: unknown;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return void res.status(400).json({
      success: false,
      message: 'Invalid JSON body.',
      code: 'INVALID_JSON',
    });
  }

  const parsed = CreateUnitSchema.safeParse(body);
  if (!parsed.success) {
    return void res.status(422).json({
      success:  false,
      message:  'Validation failed.',
      code:     'VALIDATION_ERROR',
      errors:   parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const data: CreateUnitBody = parsed.data;

  // ── Duplicate unitNumber check ─────────────────
  const existing = await Unit.findOne({
    project: new mongoose.Types.ObjectId(String(proj._id ?? '')),
    unitNumber: data.unitNumber,
  }).select('_id').lean();

  if (existing) {
    return void res.status(409).json({
      success: false,
      message: `Unit number '${data.unitNumber}' already exists in this project.`,
      code: 'DUPLICATE_UNIT_NUMBER',
    });
  }

  // ── Validate Cloudinary public_ids ────────────
  if (data.images?.length) {
    for (const img of data.images) {
      if (
        !img.public_id.startsWith('highrise/projects/') &&
        !img.public_id.startsWith('highrise/units/')
      ) {
        return void res.status(400).json({
          success: false,
          message: 'Invalid image public_id. Upload via /api/upload first.',
          code: 'INVALID_IMAGE',
        });
      }
    }
  }

  // ── Build unit document ───────────────────────
  // Denormalize project fields to unit (Unit.ts architecture)
  const unitDoc = {
    project:  new mongoose.Types.ObjectId(String(proj._id ?? '')),

    // Denormalized from project (for SEO + AI context — Unit.ts arch)
    projectSlug:       String(proj.slug ?? ''),
    projectName:       String(proj.projectName ?? ''),
    city:              String(proj.city ?? ''),
    areaName:          String(proj.areaName ?? ''),
    developerBadge:    String(proj.developerBadge ?? 'new_entrant'),
    contactVisibility: proj.contactVisibility ?? { plan: 'basic' },

    // Unit-specific fields
    unitNumber:   data.unitNumber,
    unitType:     data.unitType,
    floor:        data.floor,
    title:        data.title,
    description:  data.description,

    areaSqft:     data.areaSqft,
    areaMarla:    data.areaMarla,
    areaUnit:     data.areaUnit,

    listingType:  data.listingType,
    price:        data.price,
    priceOnCall:  data.priceOnCall ?? false,

    installment:  data.installment,

    bedrooms:     data.bedrooms,
    bathrooms:    data.bathrooms,
    parkingSpaces: data.parkingSpaces,

    status:       data.status ?? 'available',

    expectedRentalYield:  data.expectedRentalYield,
    estimatedMonthlyRent: data.estimatedMonthlyRent,
    capitalAppreciation:  data.capitalAppreciation,

    images:   data.images ?? [],
    facing:   data.facing,
    features: data.features ?? [],
  };

  // ── Save ──────────────────────────────────────
  const unit = new Unit(unitDoc);
  await unit.save();

  // ── Post-save: sync project unitTypeBreakdown ─
  await syncUnitTypeBreakdown(String(proj._id ?? '')).catch(() => undefined);

  // ── Audit log ─────────────────────────────────
  await logSecurityEvent({
    type:     'project_created',
    severity: 'low',
    userId,
    ip,
    metadata: {
      action:      'unit_created',
      unitId:      String(unit._id),
      unitNumber:  data.unitNumber,
      unitType:    data.unitType,
      projectId:   String(proj._id ?? ''),
      projectSlug: String(proj.slug ?? ''),
      byRole:      role,
    },
    req,
  });

  // ── Response ──────────────────────────────────
  return void res.status(201).json({
    success: true,
    message: 'Unit created successfully.',
    unit: {
      _id:        String(unit._id),
      unitNumber: unit.unitNumber,
      unitType:   unit.unitType,
      status:     unit.status,
      price:      unit.price,
      priceFormatted: formatPKR(unit.price),
      canonicalUrl: `/projects/${String(proj.slug ?? '')}/units/${String((unit as unknown as { slug: string }).slug ?? '')}`,
      createdAt:  unit.createdAt,
    },
  });
}