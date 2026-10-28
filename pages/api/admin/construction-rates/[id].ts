// pages/api/admin/construction-rates/[id].ts
// 🏗️ ADMIN CONSTRUCTION RATE — DETAIL / UPDATE / DELETE
// GET    /api/admin/construction-rates/[id] → full detail + history
// PATCH  /api/admin/construction-rates/[id] → update (requires changeReason if value changes)
// DELETE /api/admin/construction-rates/[id] → soft delete (deactivate) or hard delete (?hard=true)

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import ConstructionRate from '@/models/ConstructionRate';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ─── Local Mongoose Doc Shapes (for .lean() results) ─────────────────────────

interface RateHistoryDoc {
  oldValue: number;
  newValue: number;
  changePercent: number;
  changedBy?: { toString(): string };
  changedByEmail?: string;
  changedAt: Date;
  changeReason?: string;
}

interface RateAdminFullDoc {
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
  history?: RateHistoryDoc[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Response Types ──────────────────────────────────────────────────────────

interface RateHistoryItem {
  oldValue: number;
  newValue: number;
  changePercent: number;
  changedByEmail?: string;
  changedAt: string;
  changeReason?: string;
}

interface RateAdminDetail {
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
  history: RateHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

interface DetailResponse {
  success: boolean;
  data?: { rate: RateAdminDetail };
  error?: string;
}

interface UpdateResponse {
  success: boolean;
  data?: {
    rate: {
      _id: string;
      displayName: string;
      value: number;
      active: boolean;
      changeDiff?: {
        oldValue: number;
        newValue: number;
        changePercent: number;
      };
    };
  };
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

interface DeleteResponse {
  success: boolean;
  data?: { _id: string; action: 'deactivated' | 'hard_deleted' };
  error?: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const TRENDS = ['up', 'down', 'stable'] as const;

const updateRateSchema = z
  .object({
    // Display info (always editable)
    displayName: z.string().trim().min(2).max(200).optional(),

    // The value (triggers history entry if changed)
    value: z
      .number()
      .min(0, 'Value cannot be negative')
      .max(1_000_000_000, 'Value too large')
      .optional(),

    // Required when value changes (B+C pattern)
    changeReason: z.string().trim().min(5, 'Change reason must be at least 5 characters').max(500).optional(),

    // Material-specific
    unit: z.string().trim().min(1).max(50).optional(),
    trend: z.enum(TRENDS).optional(),
    changePercent: z.number().min(-100).max(1000).optional(),

    // Lifecycle
    active: z.boolean().optional(),
    validFrom: z
      .string()
      .datetime()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    validUntil: z
      .string()
      .datetime()
      .optional()
      .or(z.literal('').transform(() => undefined))
      .or(z.null()), // Allow null to clear validUntil

    // Source attribution
    source: z.string().trim().min(3).max(200).optional(),
    sourceUrl: z
      .string()
      .trim()
      .url('Must be a valid URL')
      .max(500)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(date: Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function isValidObjectId(id: string): boolean {
  return (
    mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === id
  );
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

function calculateChangePercent(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return parseFloat((((newValue - oldValue) / oldValue) * 100).toFixed(2));
}

function transformToDetail(r: RateAdminFullDoc): RateAdminDetail {
  return {
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
    history: (r.history ?? []).map((h) => ({
      oldValue: h.oldValue,
      newValue: h.newValue,
      changePercent: h.changePercent,
      changedByEmail: h.changedByEmail,
      changedAt: toISO(h.changedAt) || new Date().toISOString(),
      changeReason: h.changeReason,
    })),
    createdAt: toISO(r.createdAt) || new Date().toISOString(),
    updatedAt: toISO(r.updatedAt) || new Date().toISOString(),
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DetailResponse | UpdateResponse | DeleteResponse>
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

  // Validate ID
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  if (!id || typeof id !== 'string' || !isValidObjectId(id)) {
    res.status(400).json({ success: false, error: 'Invalid rate identifier' });
    return;
  }

  try {
    await dbConnect();

    if (req.method === 'GET') {
      await handleGet(req, res, id);
      return;
    }

    if (req.method === 'PATCH') {
      await handlePatch(req, res, id, auth.id, auth.email);
      return;
    }

    if (req.method === 'DELETE') {
      await handleDelete(req, res, id, auth.id);
      return;
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
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
        endpoint: `/api/admin/construction-rates/${id}`,
        method: req.method,
        errorMessage: `Admin rate [id] handler failed: ${errorMessage}`,
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

// ─── GET: Single rate detail with full history ──────────────────────────────

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<DetailResponse>,
  id: string
): Promise<void> {
  const doc = await ConstructionRate.findById(id).lean();

  if (!doc) {
    res.status(404).json({ success: false, error: 'Rate override not found' });
    return;
  }

  const rate = doc as unknown as RateAdminFullDoc;

  res.status(200).json({
    success: true,
    data: { rate: transformToDetail(rate) },
  });
}

// ─── PATCH: Update rate (B+C pattern: requires changeReason if value changes) ──

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse>,
  id: string,
  adminId: string,
  adminEmail?: string
): Promise<void> {
  // Validate body
  const parsed = updateRateSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
    return;
  }

  const data = parsed.data;

  // Find rate
  const rate = await ConstructionRate.findById(id);
  if (!rate) {
    res.status(404).json({ success: false, error: 'Rate override not found' });
    return;
  }

  // Cast for type-safe property access
  const rateDoc = rate as unknown as {
    value: number;
    displayName: string;
    unit?: string;
    trend?: string;
    changePercent?: number;
    active: boolean;
    validFrom: Date;
    validUntil?: Date;
    source: string;
    sourceUrl?: string;
    notes?: string;
    lastUpdatedBy?: mongoose.Types.ObjectId;
    lastUpdatedByEmail?: string;
    history: RateHistoryDoc[];
  };

  // ─── B+C Pattern: If value is changing, changeReason is REQUIRED ─────────

  const valueIsChanging = data.value !== undefined && data.value !== rateDoc.value;

  if (valueIsChanging && !data.changeReason) {
    res.status(400).json({
      success: false,
      error: 'A change reason is required when updating the value (minimum 5 characters)',
      fieldErrors: {
        changeReason: ['Please provide a reason for changing this rate'],
      },
    });
    return;
  }

  // Track what changed for audit
  const changes: string[] = [];
  let changeDiff:
    | { oldValue: number; newValue: number; changePercent: number }
    | undefined;

  // ─── Value Change: Record history entry ────────────────────────────────

  if (valueIsChanging && data.value !== undefined) {
    const oldValue = rateDoc.value;
    const newValue = data.value;
    const changePercent = calculateChangePercent(oldValue, newValue);

    // Push history entry
    if (!Array.isArray(rateDoc.history)) {
      rateDoc.history = [];
    }
    rateDoc.history.push({
      oldValue,
      newValue,
      changePercent,
      changedBy: new mongoose.Types.ObjectId(adminId),
      changedByEmail: adminEmail?.toLowerCase(),
      changedAt: new Date(),
      changeReason: data.changeReason,
    });

    // Cap history at 50 entries (keep most recent)
    if (rateDoc.history.length > 50) {
      rateDoc.history = rateDoc.history.slice(-50);
    }

    rateDoc.value = newValue;

    // Auto-update changePercent + trend if material
    rateDoc.changePercent = changePercent;
    if (changePercent > 0.5) rateDoc.trend = 'up';
    else if (changePercent < -0.5) rateDoc.trend = 'down';
    else rateDoc.trend = 'stable';

    changes.push('value');
    changeDiff = { oldValue, newValue, changePercent };
  }

  // ─── Other field updates ────────────────────────────────────────────────

  const directStringFields: Array<
    'displayName' | 'unit' | 'source' | 'sourceUrl' | 'notes'
  > = ['displayName', 'unit', 'source', 'sourceUrl', 'notes'];

  for (const field of directStringFields) {
    const newVal = data[field];
    if (newVal !== undefined && newVal !== rateDoc[field]) {
      rateDoc[field] = newVal;
      changes.push(field);
    }
  }

  // Trend (manual override even without value change)
  if (data.trend !== undefined && !valueIsChanging) {
    rateDoc.trend = data.trend;
    changes.push('trend');
  }

  // changePercent (manual override even without value change)
  if (data.changePercent !== undefined && !valueIsChanging) {
    rateDoc.changePercent = data.changePercent;
    changes.push('changePercent');
  }

  // Active toggle
  if (data.active !== undefined && data.active !== rateDoc.active) {
    rateDoc.active = data.active;
    changes.push('active');
  }

  // Date fields
  if (data.validFrom !== undefined) {
    rateDoc.validFrom = data.validFrom ? new Date(data.validFrom) : new Date();
    changes.push('validFrom');
  }

  if (data.validUntil !== undefined) {
    if (data.validUntil === null || data.validUntil === '') {
      rateDoc.validUntil = undefined;
    } else {
      rateDoc.validUntil = new Date(data.validUntil);
    }
    changes.push('validUntil');
  }

  // ─── Update "last updated by" attribution ───────────────────────────────

  if (changes.length > 0) {
    rateDoc.lastUpdatedBy = new mongoose.Types.ObjectId(adminId);
    rateDoc.lastUpdatedByEmail = adminEmail?.toLowerCase();
  }

  // ─── Save (triggers pre-save hooks) ─────────────────────────────────────

  await rate.save();

  // ─── Audit log ──────────────────────────────────────────────────────────

  await logSecurityEvent({
    type: 'admin_action',
    severity: valueIsChanging ? 'medium' : 'low',
    userId: adminId,
    ip: getClientIp(req),
    req,
    metadata: {
      action: 'construction_rate_updated',
      rateId: id,
      displayName: rateDoc.displayName,
      changedFields: changes,
      ...(changeDiff && {
        oldValue: changeDiff.oldValue,
        newValue: changeDiff.newValue,
        changePercent: changeDiff.changePercent,
        changeReason: data.changeReason,
      }),
    },
  }).catch(() => {
    // silent
  });

  res.status(200).json({
    success: true,
    data: {
      rate: {
        _id: id,
        displayName: rateDoc.displayName,
        value: rateDoc.value,
        active: rateDoc.active,
        changeDiff,
      },
    },
  });
}

// ─── DELETE: Soft (deactivate) or hard delete ───────────────────────────────

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<DeleteResponse>,
  id: string,
  adminId: string
): Promise<void> {
  const { hard } = req.query;
  const isHardDelete = hard === 'true';

  const rate = await ConstructionRate.findById(id);
  if (!rate) {
    res.status(404).json({ success: false, error: 'Rate override not found' });
    return;
  }

  const rateDoc = rate as unknown as {
    displayName: string;
    overrideType: string;
    value: number;
    active: boolean;
  };

  const displayName = rateDoc.displayName;
  const overrideType = rateDoc.overrideType;

  if (isHardDelete) {
    await ConstructionRate.deleteOne({ _id: id });

    await logSecurityEvent({
      type: 'admin_action',
      severity: 'high',
      userId: adminId,
      ip: getClientIp(req),
      req,
      metadata: {
        action: 'construction_rate_hard_deleted',
        rateId: id,
        displayName,
        overrideType,
      },
    }).catch(() => {
      // silent
    });

    res.status(200).json({
      success: true,
      data: { _id: id, action: 'hard_deleted' },
    });
    return;
  }

  // Soft delete: deactivate (set active: false)
  rateDoc.active = false;
  await rate.save();

  await logSecurityEvent({
    type: 'admin_action',
    severity: 'medium',
    userId: adminId,
    ip: getClientIp(req),
    req,
    metadata: {
      action: 'construction_rate_deactivated',
      rateId: id,
      displayName,
      overrideType,
    },
  }).catch(() => {
    // silent
  });

  res.status(200).json({
    success: true,
    data: { _id: id, action: 'deactivated' },
  });
}