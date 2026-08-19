// pages/api/admin/construction-rates/index.ts
// 🏗️ ADMIN CONSTRUCTION RATES API — LIST + CREATE
// GET  /api/admin/construction-rates → list all overrides + stats
// POST /api/admin/construction-rates → create new override

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import ConstructionRate from '@/models/ConstructionRate';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import type { FilterQuery } from 'mongoose';

// ─── Local Mongoose Doc Shapes (for .lean() results) ─────────────────────────

interface RateAdminDoc {
  _id: { toString(): string };
  overrideType: string;
  city?: string;
  subType?: string;
  quality?: string;
  constructionType?: string;
  materialKey?: string;
  addOnKind?: string;
  displayName: string;
  unit?: string;
  value: number;
  trend?: string;
  changePercent?: number;
  active: boolean;
  validFrom: Date;
  validUntil?: Date;
  source: string;
  sourceUrl?: string;
  notes?: string;
  createdBy: { toString(): string };
  createdByEmail?: string;
  lastUpdatedBy?: { toString(): string };
  lastUpdatedByEmail?: string;
  history?: Array<{
    oldValue: number;
    newValue: number;
    changePercent: number;
    changedAt: Date;
    changedByEmail?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Response Types ──────────────────────────────────────────────────────────

interface RateAdminListItem {
  _id: string;
  overrideType: string;
  city?: string;
  subType?: string;
  quality?: string;
  constructionType?: string;
  materialKey?: string;
  addOnKind?: string;
  displayName: string;
  unit?: string;
  value: number;
  trend?: string;
  changePercent?: number;
  active: boolean;
  validFrom: string;
  validUntil?: string;
  isExpired: boolean;
  daysSinceUpdate: number;
  source: string;
  sourceUrl?: string;
  notes?: string;
  createdByEmail?: string;
  lastUpdatedByEmail?: string;
  historyCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  success: boolean;
  data?: {
    rates: RateAdminListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: {
      total: number;
      active: number;
      expired: number;
      stale: number; // not updated in 90+ days
      byType: {
        material: number;
        per_sqft: number;
        city_multiplier: number;
        add_on: number;
      };
    };
  };
  error?: string;
}

interface CreateResponse {
  success: boolean;
  data?: {
    rate: {
      _id: string;
      overrideType: string;
      displayName: string;
      value: number;
      active: boolean;
    };
  };
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// ─── Validation Constants ────────────────────────────────────────────────────

const OVERRIDE_TYPES = [
  'material',
  'per_sqft',
  'city_multiplier',
  'add_on',
] as const;

const CITIES = [
  'Lahore', 'Islamabad', 'Rawalpindi', 'Karachi', 'Faisalabad',
  'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Quetta',
] as const;

const SUB_TYPES = [
  'house', 'villa', 'farmhouse', 'highrise_apartment_building',
  'shop_showroom', 'commercial_plaza', 'office_building', 'highrise_office_tower',
  'warehouse', 'industrial_building', 'cold_storage', 'workshop',
  'shops_plus_apartments', 'complete_mixed_tower',
] as const;

const QUALITIES = ['standard', 'premium', 'luxury'] as const;
const CONSTRUCTION_TYPES = ['grey_structure', 'finishing'] as const;
const ADD_ON_KINDS = [
  'boundary_wall', 'basement', 'elevator', 'parking', 'generator', 'hvac',
] as const;
const TRENDS = ['up', 'down', 'stable'] as const;

const MATERIAL_KEYS_VALID = [
  'cement_opc', 'steel_saria', 'bricks_1st_class', 'sand_lawrencepur',
  'crush_margalla', 'concrete_blocks_solid', 'tiles_standard', 'tiles_vitrified',
  'marble_botticino', 'paint_premium_emulsion', 'wood_teak_burma',
  'wood_local_deodar', 'copper_wire_7_29', 'pvc_pipes_4_inch',
  'labor_skilled_mason', 'labor_unskilled', 'labor_electrician',
] as const;

// ─── Validation Schema (Discriminated by overrideType) ───────────────────────

const baseSchema = {
  city: z.enum(CITIES).optional(),
  displayName: z.string().trim().min(2, 'Display name is required').max(200),
  value: z.number().min(0, 'Value cannot be negative').max(1_000_000_000, 'Value too large'),
  active: z.boolean().optional().default(true),
  validFrom: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  validUntil: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  source: z
    .string()
    .trim()
    .min(3, 'Source is required (e.g., "Dealer survey, Q2 2025")')
    .max(200),
  sourceUrl: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(1000).optional(),
};

const materialSchema = z
  .object({
    overrideType: z.literal('material'),
    materialKey: z.enum(MATERIAL_KEYS_VALID, { message: 'Invalid material key' }),
    unit: z.string().trim().min(1, 'Unit is required').max(50),
    trend: z.enum(TRENDS).optional(),
    changePercent: z.number().min(-100).max(1000).optional(),
    ...baseSchema,
  })
  .strict();

const perSqftSchema = z
  .object({
    overrideType: z.literal('per_sqft'),
    subType: z.enum(SUB_TYPES, { message: 'Invalid sub-type' }),
    quality: z.enum(QUALITIES, { message: 'Invalid quality grade' }),
    constructionType: z.enum(CONSTRUCTION_TYPES, { message: 'Invalid construction type' }),
    ...baseSchema,
  })
  .strict();

const cityMultiplierSchema = z
  .object({
    overrideType: z.literal('city_multiplier'),
    city: z.enum(CITIES, { message: 'City is required for city multiplier' }),
    subType: z.enum(SUB_TYPES, { message: 'Sub-type is required' }),
    displayName: z.string().trim().min(2).max(200),
    value: z
      .number()
      .min(0.3, 'Multiplier must be at least 0.3')
      .max(3.0, 'Multiplier cannot exceed 3.0'),
    active: z.boolean().optional().default(true),
    validFrom: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
    validUntil: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
    source: z.string().trim().min(3).max(200),
    sourceUrl: z
      .string()
      .trim()
      .url()
      .max(500)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

const addOnSchema = z
  .object({
    overrideType: z.literal('add_on'),
    addOnKind: z.enum(ADD_ON_KINDS, { message: 'Invalid add-on kind' }),
    quality: z.enum(QUALITIES, { message: 'Quality grade is required' }),
    ...baseSchema,
  })
  .strict();

const createRateSchema = z.discriminatedUnion('overrideType', [
  materialSchema,
  perSqftSchema,
  cityMultiplierSchema,
  addOnSchema,
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(date: Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isStale(updatedAt: Date | string): boolean {
  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  return date.getTime() < ninetyDaysAgo;
}

function isExpired(validUntil?: Date | string): boolean {
  if (!validUntil) return false;
  const date = validUntil instanceof Date ? validUntil : new Date(validUntil);
  return date.getTime() < Date.now();
}

function daysSince(date: Date | string): number {
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse>
): Promise<void> {
  // ── Rate limit (First) ───────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);

  if (!rl.ok) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again shortly.',
    });
    return;
  }

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    // ── DB (Third) ─────────────────────────────────────────────
    await dbConnect();

    if (req.method === 'GET') {
      await handleList(req, res);
      return;
    }

    if (req.method === 'POST') {
      await handleCreate(req, res, auth.id, auth.email);
      return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      userId: auth.id,
      ip: getClientIp(req),
      req,
      metadata: {
        endpoint: '/api/admin/construction-rates',
        method: req.method,
        errorMessage: `Admin construction rates handler failed: ${errorMessage}`,
      },
    }).catch(() => {
      // silent
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.',
    });
  }
}

// ─── GET: List rates with filters + stats ───────────────────────────────────

async function handleList(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse>
): Promise<void> {
  const {
    search = '',
    overrideType = '',
    city = '',
    subType = '',
    activeOnly = '',
    expiredOnly = '',
    staleOnly = '',
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    page = '1',
    limit = '20',
  } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter: FilterQuery<Record<string, unknown>> = {};

  const searchStr = String(search).trim();
  if (searchStr.length > 0) {
    filter.$or = [
      { displayName: { $regex: escapeRegex(searchStr), $options: 'i' } },
      { source: { $regex: escapeRegex(searchStr), $options: 'i' } },
      { materialKey: { $regex: escapeRegex(searchStr.toLowerCase()), $options: 'i' } },
    ];
  }

  if (overrideType && (OVERRIDE_TYPES as readonly string[]).includes(String(overrideType))) {
    filter.overrideType = overrideType;
  }

  if (city && (CITIES as readonly string[]).includes(String(city))) {
    filter.city = city;
  }

  if (subType && (SUB_TYPES as readonly string[]).includes(String(subType))) {
    filter.subType = subType;
  }

  if (activeOnly === 'true') filter.active = true;
  if (activeOnly === 'false') filter.active = false;

  // Expired: validUntil < now
  if (expiredOnly === 'true') {
    filter.validUntil = { $exists: true, $lt: new Date() };
  }

  // Stale: not updated in 90 days
  if (staleOnly === 'true') {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    filter.updatedAt = { $lt: ninetyDaysAgo };
  }

  // Sort
  const sortFieldMap: Record<string, string> = {
    displayName: 'displayName',
    value: 'value',
    city: 'city',
    overrideType: 'overrideType',
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
  };
  const sortField = sortFieldMap[String(sortBy)] || 'updatedAt';
  const sortDir: 1 | -1 = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [sortField]: sortDir };

  // Parallel query: list + total + stats
  const [rates, total, statsAgg] = await Promise.all([
    ConstructionRate.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ConstructionRate.countDocuments(filter),
    ConstructionRate.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ['$active', 1, 0] } },
                expired: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$validUntil', null] },
                          { $lt: ['$validUntil', new Date()] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                stale: {
                  $sum: {
                    $cond: [
                      {
                        $lt: [
                          '$updatedAt',
                          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          byType: [
            { $group: { _id: '$overrideType', count: { $sum: 1 } } },
          ],
        },
      },
    ]),
  ]);

  // Transform results
  const transformed: RateAdminListItem[] = (rates as unknown as RateAdminDoc[]).map((r) => ({
    _id: r._id.toString(),
    overrideType: r.overrideType,
    city: r.city,
    subType: r.subType,
    quality: r.quality,
    constructionType: r.constructionType,
    materialKey: r.materialKey,
    addOnKind: r.addOnKind,
    displayName: r.displayName,
    unit: r.unit,
    value: r.value,
    trend: r.trend,
    changePercent: r.changePercent,
    active: Boolean(r.active),
    validFrom: toISO(r.validFrom) || new Date().toISOString(),
    validUntil: toISO(r.validUntil),
    isExpired: isExpired(r.validUntil),
    daysSinceUpdate: daysSince(r.updatedAt),
    source: r.source,
    sourceUrl: r.sourceUrl,
    notes: r.notes,
    createdByEmail: r.createdByEmail,
    lastUpdatedByEmail: r.lastUpdatedByEmail,
    historyCount: Array.isArray(r.history) ? r.history.length : 0,
    createdAt: toISO(r.createdAt) || new Date().toISOString(),
    updatedAt: toISO(r.updatedAt) || new Date().toISOString(),
  }));

  // Parse stats from $facet result
  const facetResult = statsAgg[0] as
    | {
        totals?: Array<{ total: number; active: number; expired: number; stale: number }>;
        byType?: Array<{ _id: string; count: number }>;
      }
    | undefined;

  const totals = facetResult?.totals?.[0] || { total: 0, active: 0, expired: 0, stale: 0 };
  const byTypeArr = facetResult?.byType || [];

  const byType = {
    material: 0,
    per_sqft: 0,
    city_multiplier: 0,
    add_on: 0,
  };
  for (const item of byTypeArr) {
    if (item._id === 'material') byType.material = item.count;
    if (item._id === 'per_sqft') byType.per_sqft = item.count;
    if (item._id === 'city_multiplier') byType.city_multiplier = item.count;
    if (item._id === 'add_on') byType.add_on = item.count;
  }

  res.status(200).json({
    success: true,
    data: {
      rates: transformed,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
      stats: {
        total: totals.total,
        active: totals.active,
        expired: totals.expired,
        stale: totals.stale,
        byType,
      },
    },
  });
}

// ─── POST: Create new rate override ─────────────────────────────────────────

async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse>,
  adminId: string,
  adminEmail?: string
): Promise<void> {
  // Validate body
  const parsed = createRateSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
    return;
  }

  const data = parsed.data;

  // ─── Duplicate check (prevent confusing multiple overrides for same target) ──

  const duplicateFilter: FilterQuery<Record<string, unknown>> = {
    overrideType: data.overrideType,
    active: true,
  };

  if (data.overrideType === 'material') {
    duplicateFilter.materialKey = data.materialKey;
    duplicateFilter.city = data.city ?? { $exists: false };
  } else if (data.overrideType === 'per_sqft') {
    duplicateFilter.subType = data.subType;
    duplicateFilter.quality = data.quality;
    duplicateFilter.constructionType = data.constructionType;
    duplicateFilter.city = data.city ?? { $exists: false };
  } else if (data.overrideType === 'city_multiplier') {
    duplicateFilter.city = data.city;
    duplicateFilter.subType = data.subType;
  } else if (data.overrideType === 'add_on') {
    duplicateFilter.addOnKind = data.addOnKind;
    duplicateFilter.quality = data.quality;
    duplicateFilter.city = data.city ?? { $exists: false };
  }

  const duplicate = await ConstructionRate.findOne(duplicateFilter).select('_id displayName').lean();

  if (duplicate) {
    res.status(409).json({
      success: false,
      error: `An active override already exists for this target. Edit the existing one instead, or deactivate it first.`,
    });
    return;
  }

  // ─── Build payload (type-safe per discriminator) ────────────────────────

  const basePayload = {
    overrideType: data.overrideType,
    displayName: data.displayName,
    value: data.value,
    active: data.active ?? true,
    validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
    validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    source: data.source,
    sourceUrl: data.sourceUrl,
    notes: data.notes,
    createdBy: adminId,
    createdByEmail: adminEmail?.toLowerCase(),
    history: [],
  };

  let typeSpecificPayload: Record<string, unknown> = {};

  if (data.overrideType === 'material') {
    typeSpecificPayload = {
      materialKey: data.materialKey,
      unit: data.unit,
      city: data.city,
      trend: data.trend,
      changePercent: data.changePercent,
    };
  } else if (data.overrideType === 'per_sqft') {
    typeSpecificPayload = {
      subType: data.subType,
      quality: data.quality,
      constructionType: data.constructionType,
      city: data.city,
    };
  } else if (data.overrideType === 'city_multiplier') {
    typeSpecificPayload = {
      city: data.city,
      subType: data.subType,
    };
  } else if (data.overrideType === 'add_on') {
    typeSpecificPayload = {
      addOnKind: data.addOnKind,
      quality: data.quality,
      city: data.city,
    };
  }

  const payload = { ...basePayload, ...typeSpecificPayload };

  // ─── Create ──────────────────────────────────────────────────────────────

  const created = await ConstructionRate.create(payload);

  // ─── Audit log ───────────────────────────────────────────────────────────

  await logSecurityEvent({
    type: 'admin_action',
    severity: 'medium',
    userId: adminId,
    ip: getClientIp(req),
    req,
    metadata: {
      action: 'construction_rate_created',
      rateId: created._id.toString(),
      overrideType: data.overrideType,
      displayName: data.displayName,
      value: data.value,
      city: data.city ?? 'global',
      source: data.source,
    },
  }).catch(() => {
    // silent
  });

  res.status(201).json({
    success: true,
    data: {
      rate: {
        _id: created._id.toString(),
        overrideType: data.overrideType,
        displayName: data.displayName,
        value: data.value,
        active: data.active ?? true,
      },
    },
  });
}