/**
 * pages/api/projects/[id]/units/[unitId]/index.ts
 *
 * GET    /api/projects/[id]/units/[unitId]  → Public unit detail
 * PATCH  /api/projects/[id]/units/[unitId]  → Developer updates unit
 * DELETE /api/projects/[id]/units/[unitId]  → 410 Gone (use /trash)
 *
 * V5.0.0 — Unit.ts model, requireAuth, Upstash rate limit,
 *           findOne()+save(), logSecurityEvent, syncUnitTypeBreakdown
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';

import { requireAuth, getClientIp } from '@/lib/requireAuth';
import {
  rateLimitApi,
  rateLimitDeveloper,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import {
  syncUnitTypeBreakdown,
  denormalizeProjectToUnits,
} from '@/lib/units/syncUnitTypeBreakdown';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ApiResponse = {
  success: boolean;
  message?: string;
  code?: string;
  unit?: unknown;
  errors?: Record<string, string[]>;
};

// ─────────────────────────────────────────────
// Zod v4 — PATCH validation schema
// ─────────────────────────────────────────────

const PatchUnitSchema = z.object({
  // Identity
  title:       z.string().max(120).optional(),
  description: z.string().max(5000).optional(),
  floor:       z.number().int().min(-5).max(200).optional(),

  // Unit type (immutable after sold — enforced in handler)
  unitType: z.enum([
    'apartment', 'penthouse', 'studio', 'duplex', 'shop',
    'office', 'warehouse', 'plot', 'villa', 'townhouse', 'other',
  ]).optional(),

  // Size
  areaSqft:  z.number().min(0).optional(),
  areaMarla: z.number().min(0).optional(),
  areaUnit:  z.enum(['sqft', 'marla', 'kanal', 'sqyard']).optional(),

  // Pricing
  listingType: z.enum([
    'full_payment', 'installment', 'both', 'pre_launch',
  ]).optional(),
  price:       z.number().min(0).optional(),
  priceOnCall: z.boolean().optional(),

  // Installment plan
  installment: z.object({
    downPaymentPercent: z.number().min(0).max(100),
    monthlyInstallment: z.number().min(0),
    installmentMonths:  z.number().int().min(1),
    handoverPercent:    z.number().min(0).max(100).optional(),
  }).optional(),

  // Features
  bedrooms:      z.number().int().min(0).max(20).optional(),
  bathrooms:     z.number().int().min(0).max(20).optional(),
  parkingSpaces: z.number().int().min(0).max(10).optional(),
  facing:        z.string().max(20).optional(),
  features:      z.array(z.string().max(50)).max(30).optional(),

  // Media (pre-uploaded via /api/upload)
  images: z.array(z.object({
    url:       z.string().url(),
    public_id: z.string().min(1),
    isPrimary: z.boolean().optional(),
    caption:   z.string().max(200).optional(),
  })).max(20).optional(),

  // Investor intelligence
  expectedRentalYield:  z.number().min(0).max(100).optional(),
  estimatedMonthlyRent: z.number().min(0).optional(),
  capitalAppreciation:  z.number().min(0).max(100).optional(),

  // Possession
  possessionDate:      z.string().optional(),
  isPossessionReady:   z.boolean().optional(),
}).strict();

type PatchUnitBody = z.infer<typeof PatchUnitSchema>;

// ─────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, isPublic: boolean): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains');

  if (isPublic) {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  } else {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) &&
    /^[a-fA-F0-9]{24}$/.test(id);
}

function normalizeParam(
  v: string | string[] | undefined,
): string {
  return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
}

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000)    return `${(amount / 100_000).toFixed(2)} Lac`;
  if (amount >= 1_000)      return `${(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

function getPrimaryImage(
  images: Array<{ url: string; isPrimary?: boolean }> | undefined,
): string | null {
  if (!images?.length) return null;
  return images.find((i) => i.isPrimary)?.url ?? images[0]?.url ?? null;
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  const method = (req.method ?? 'GET').toUpperCase();

  // ── Deprecated DELETE ───────────────────────
  if (method === 'DELETE') {
    setSecurityHeaders(res, false);
    res.setHeader('Allow', ['GET', 'PATCH']);
    return void res.status(410).json({
      success: false,
      message: 'DELETE via this endpoint is deprecated. Use PATCH status=cancelled or contact admin.',
      code: 'METHOD_DEPRECATED',
    });
  }

  if (method !== 'GET' && method !== 'PATCH') {
    setSecurityHeaders(res, false);
    res.setHeader('Allow', ['GET', 'PATCH']);
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  setSecurityHeaders(res, method === 'GET');

  // ── Rate limit ──────────────────────────────
  const rl = await (method === 'PATCH'
    ? rateLimitDeveloper(req)
    : rateLimitApi(req));

  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  // ── Resolve params ──────────────────────────
  const idOrSlug = normalizeParam(
    req.query.id as string | string[] | undefined,
  ).trim();
  const unitId   = normalizeParam(
    req.query.unitId as string | string[] | undefined,
  ).trim();

  if (!idOrSlug || !unitId) {
    return void res.status(400).json({
      success: false,
      message: 'Project ID and Unit ID are required.',
      code: 'MISSING_PARAMS',
    });
  }

  // unitId must be ObjectId (units are always resolved by _id)
  if (!isValidObjectId(unitId)) {
    return void res.status(400).json({
      success: false,
      message: 'Invalid unit ID.',
      code: 'INVALID_UNIT_ID',
    });
  }

  await dbConnect();

  if (method === 'GET')   return void handleGet(req, res, idOrSlug, unitId);
  if (method === 'PATCH') return void handlePatch(req, res, idOrSlug, unitId);
}

// ─────────────────────────────────────────────
// GET — Public unit detail
// ─────────────────────────────────────────────

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  idOrSlug: string,
  unitId: string,
): Promise<void> {
  // Optional auth — owner/admin get extra fields
  const token      = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const viewerId   = token?.sub ? String(token.sub) : null;
  const viewerRole = token?.role ? String(token.role) : 'user';
  const isAdmin    = viewerRole === 'admin';

  // ── Resolve project ─────────────────────────
  const projectFilter: Record<string, unknown> = {
    isDeleted: { $ne: true },
  };

  const project = await (
    isValidObjectId(idOrSlug)
      ? Project.findOne({ _id: idOrSlug, ...projectFilter })
      : Project.findOne({ slug: idOrSlug, ...projectFilter })
  )
    .select('_id developer slug projectName city areaName status isVerified developerBadge')
    .lean();

  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  const proj      = project as unknown as Record<string, unknown>;
  const ownerStr  = String(proj.developer ?? '');
  const isOwner   = viewerId ? ownerStr === viewerId : false;

  // Public visibility gate
  const isVerified = proj.isVerified === true || proj.status === 'verified';
  if (!isVerified && !isAdmin && !isOwner) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Fetch unit ──────────────────────────────
  // Unit.ts: 'project' field links to Project._id
  const unit = await Unit.findOne({
    _id:     new mongoose.Types.ObjectId(unitId),
    project: new mongoose.Types.ObjectId(String(proj._id ?? '')),
    isDeleted: { $ne: true },
  })
    .select(
      isAdmin || isOwner
        ? // Owner/admin: full detail including reservation info
          '-soldToCnicHash -soldToCnicEncrypted'
        : // Public: exclude all sensitive fields
          [
            '_id', 'unitNumber', 'unitType', 'floor', 'title', 'description',
            'status', 'listingType',
            'price', 'priceOnCall',
            'areaSqft', 'areaMarla', 'areaUnit',
            'bedrooms', 'bathrooms', 'parkingSpaces',
            'facing', 'features', 'images',
            'slug', 'canonicalUrl',
            'projectSlug', 'projectName', 'city', 'areaName',
            'developerBadge',
            'expectedRentalYield', 'estimatedMonthlyRent',
            'capitalAppreciation', 'investmentScore', 'demandScore',
            'installment.downPaymentPercent',
            'installment.monthlyInstallment',
            'installment.installmentMonths',
            'possessionDate', 'isPossessionReady',
            'createdAt', 'updatedAt',
          ].join(' '),
    )
    .lean();

  if (!unit) {
    return void res.status(404).json({
      success: false,
      message: 'Unit not found.',
      code: 'NOT_FOUND',
    });
  }

  const u = unit as unknown as Record<string, unknown>;
  // Cast once — .lean() loses typed _id (LESSON #63)
  const unitObjId = (unit as unknown as { _id: mongoose.Types.ObjectId })._id;

  // Increment view count (fire-and-forget, public only)
  if (isVerified && !isAdmin && !isOwner) {
    Unit.updateOne(
      { _id: unitObjId },
      { $inc: { viewCount: 1 } },
    ).exec().catch(() => undefined);
  }

  // ── Badge metadata ──────────────────────────
  const badgeLabels: Record<string, string> = {
    new_entrant: '🆕 New Entrant',
    emerging:    '⭐ Emerging',
    trusted:     '🏆 Trusted Builder',
    premium:     '💎 Premium Developer',
  };
  const badge = String(u.developerBadge ?? 'new_entrant');

  // ── Enrich response ─────────────────────────
  const images = u.images as Array<{ url: string; isPrimary?: boolean }> | undefined;

  return void res.status(200).json({
    success: true,
    unit: {
      ...u,
      primaryImage:  getPrimaryImage(images),
      priceFormatted: typeof u.price === 'number'
        ? formatPKR(u.price)
        : null,
      badgeLabel: badgeLabels[badge] ?? badge,
      // Managed marketplace: contact via Highrise
      contactViaHighrise: true,
      // Canonical URL for SEO
      canonicalUrl: u.canonicalUrl ??
        `/projects/${String(proj.slug ?? '')}/units/${String(u.slug ?? unitId)}`,
    },
  });
}

// ─────────────────────────────────────────────
// PATCH — Developer updates unit content
// ─────────────────────────────────────────────

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  idOrSlug: string,
  unitId: string,
): Promise<void> {
  // ── Auth ────────────────────────────────────
  const authResult = await requireAuth(req, res);
  if (!authResult) return;

  const userId  = authResult.id;
  const role    = authResult.role;
  const isAdmin = role === 'admin';
  const ip      = getClientIp(req);

  if (!isAdmin && role !== 'developer') {
    return void res.status(403).json({
      success: false,
      message: 'Only developers can update units.',
      code: 'FORBIDDEN',
    });
  }

  // ── Resolve project ─────────────────────────
  const project = await (
    isValidObjectId(idOrSlug)
      ? Project.findOne({ _id: idOrSlug, isDeleted: { $ne: true } })
      : Project.findOne({ slug: idOrSlug, isDeleted: { $ne: true } })
  )
    .select('_id developer slug projectName city areaName developerBadge contactVisibility')
    .lean();

  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  const proj     = project as unknown as Record<string, unknown>;
  const ownerStr = String(proj.developer ?? '');

  // Ownership check (anti-enumeration 404)
  if (!isAdmin && ownerStr !== userId) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Fetch unit via findOne() for save() ─────
  // ARCH RULE: findOne() + save() — never findByIdAndUpdate
  const unit = await Unit.findOne({
    _id:     new mongoose.Types.ObjectId(unitId),
    project: new mongoose.Types.ObjectId(String(proj._id ?? '')),
    isDeleted: { $ne: true },
  });

  if (!unit) {
    return void res.status(404).json({
      success: false,
      message: 'Unit not found.',
      code: 'NOT_FOUND',
    });
  }

  const unitRaw = unit as unknown as Record<string, unknown>;

  // ── Guard: sold units are immutable (content) ─
  if (unitRaw.status === 'sold' && !isAdmin) {
    return void res.status(409).json({
      success: false,
      message: 'Sold units cannot be edited. Contact admin if correction needed.',
      code: 'UNIT_SOLD_IMMUTABLE',
    });
  }

  // ── Parse + validate body ───────────────────
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

  const parsed = PatchUnitSchema.safeParse(body);
  if (!parsed.success) {
    return void res.status(422).json({
      success: false,
      message:  'Validation failed.',
      code:     'VALIDATION_ERROR',
      errors:   parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const data: PatchUnitBody = parsed.data;

  // ── Guard: unitType immutable after reservation ─
  if (
    data.unitType &&
    data.unitType !== unitRaw.unitType &&
    (unitRaw.status === 'reserved' || unitRaw.status === 'sold') &&
    !isAdmin
  ) {
    return void res.status(409).json({
      success: false,
      message: 'Unit type cannot be changed after reservation or sale.',
      code: 'UNIT_TYPE_IMMUTABLE',
    });
  }

  // ── Validate image public_ids ───────────────
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

  // ── Track price change for priceHistory ─────
  // Unit.ts pre-save hook appends to priceHistory[] automatically
  // We just need to set the new price — hook handles the rest
  const oldPrice = typeof unitRaw.price === 'number' ? unitRaw.price : 0;
  const newPrice = typeof data.price === 'number' ? data.price : oldPrice;
  const priceChanged = newPrice !== oldPrice;

  // ── Apply changes via save() ─────────────────
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      (unit as unknown as Record<string, unknown>)[key] = value;
    }
  }

  // Parse possessionDate string → Date if provided
  if (data.possessionDate) {
    const d = new Date(data.possessionDate);
    if (Number.isFinite(d.getTime())) {
      (unit as unknown as Record<string, unknown>).possessionDate = d;
    }
  }

  await unit.save();

  // ── Post-save sync ───────────────────────────
  await syncUnitTypeBreakdown(String(proj._id ?? '')).catch(() => undefined);

  // If location-affecting fields changed, denormalize to sibling units
  const locationChanged = 'city' in data || 'areaName' in data;
  if (locationChanged) {
    await denormalizeProjectToUnits(String(proj._id ?? '')).catch(() => undefined);
  }

  // ── Audit log ────────────────────────────────
  await logSecurityEvent({
    type:     'admin_action',
    severity: 'low',
    userId,
    ip,
    metadata: {
      action:       'unit_updated',
      unitId,
      unitNumber:   String(unitRaw.unitNumber ?? ''),
      projectId:    String(proj._id ?? ''),
      projectSlug:  String(proj.slug ?? ''),
      updatedFields: Object.keys(data),
      priceChanged,
      oldPrice:     priceChanged ? oldPrice : undefined,
      newPrice:     priceChanged ? newPrice : undefined,
      byRole:       role,
    },
    req,
  });

  // ── Response ────────────────────────────────
  const updatedUnit = unit as unknown as Record<string, unknown>;

  return void res.status(200).json({
    success: true,
    message: 'Unit updated successfully.',
    unit: {
      _id:           String(unit._id),
      unitNumber:    String(updatedUnit.unitNumber ?? ''),
      unitType:      String(updatedUnit.unitType ?? ''),
      status:        String(updatedUnit.status ?? ''),
      price:         updatedUnit.price,
      priceFormatted: typeof updatedUnit.price === 'number'
        ? formatPKR(updatedUnit.price)
        : null,
      updatedAt: new Date().toISOString(),
    },
  });
}