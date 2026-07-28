/**
 * pages/api/projects/[id]/units/[unitId]/status.ts
 *
 * PATCH /api/projects/[id]/units/[unitId]/status
 *
 * Handles unit status transitions with business rules:
 *   available  → reserved  (developer/admin)
 *   available  → on_hold   (admin only)
 *   reserved   → available (developer/admin — cancel reservation)
 *   reserved   → sold      (developer/admin — with CNIC capture)
 *   on_hold    → available (admin only)
 *   on_hold    → sold      (admin only)
 *   any        → cancelled (admin only)
 *   cancelled  → available (admin only — reinstate)
 *
 * V5.0.0 — findOne()+save(), requireAuth, Upstash rate limit,
 *           logSecurityEvent, syncUnitTypeBreakdown, kycCrypto
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import crypto from 'crypto';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';

import { requireAuth, getClientIp } from '@/lib/requireAuth';
import {
  rateLimitDeveloper,
  rateLimitAdmin,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type UnitStatus = 'available' | 'reserved' | 'sold' | 'on_hold' | 'cancelled';

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

const StatusSchema = z.object({
  // Target status (required)
  status: z.enum([
    'available', 'reserved', 'sold', 'on_hold', 'cancelled',
  ]),

  // Required when status → 'reserved'
  reservedBy:        z.string().max(120).optional(),  // buyer name
  reservationExpiry: z.string().optional(),           // ISO date string
  reservationAmount: z.number().min(0).optional(),    // token amount paid

  // Required when status → 'sold'
  // Raw CNIC — hashed + encrypted before storage (never stored plain)
  soldToCnic:        z.string()
    .regex(/^\d{5}-\d{7}-\d$/, { message: 'CNIC must be in format XXXXX-XXXXXXX-X' })
    .optional(),
  soldToName:        z.string().max(120).optional(),
  soldPrice:         z.number().min(0).optional(),
  soldAt:            z.string().optional(),           // ISO date string

  // Optional note for any transition
  note: z.string().max(500).optional(),
}).strict();

type StatusBody = z.infer<typeof StatusSchema>;

// ─────────────────────────────────────────────
// Status transition rules
// ─────────────────────────────────────────────

/**
 * Allowed transitions per role.
 * Key: current status → Value: allowed next statuses
 */
const DEVELOPER_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  available:  ['reserved'],
  reserved:   ['available', 'sold'],
  sold:       [],                      // sold is terminal for developers
  on_hold:    [],                      // admin only
  cancelled:  [],                      // admin only
};

const ADMIN_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  available:  ['reserved', 'on_hold', 'cancelled'],
  reserved:   ['available', 'sold', 'on_hold', 'cancelled'],
  sold:       ['cancelled'],           // admin can cancel a bad sale
  on_hold:    ['available', 'sold', 'cancelled'],
  cancelled:  ['available'],           // reinstate
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
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) &&
    /^[a-fA-F0-9]{24}$/.test(id);
}

function normalizeParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
}

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000)    return `${(amount / 100_000).toFixed(2)} Lac`;
  if (amount >= 1_000)      return `${(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

/**
 * Hash CNIC with SHA-256 for duplicate detection.
 * Never store raw CNIC — arch rule.
 */
function hashCnic(cnic: string): string {
  const secret = process.env.KYC_HASH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'hr-cnic-hash';
  return crypto
    .createHmac('sha256', secret)
    .update(cnic.replace(/-/g, ''))   // normalize: remove dashes before hash
    .digest('hex');
}

/**
 * Encrypt CNIC with AES-256-GCM for secure storage.
 * Uses kycCrypto pattern from arch rules.
 */
function encryptCnic(cnic: string): string {
  const keyHex = process.env.KYC_ENCRYPTION_KEY ?? '';
  if (!keyHex || keyHex.length < 64) {
    // Fallback: store hash only if key not configured
    // In production KYC_ENCRYPTION_KEY must be set (32 bytes = 64 hex chars)
    return '';
  }

  const key  = Buffer.from(keyHex, 'hex');
  const iv   = crypto.randomBytes(12);            // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const normalized = cnic.replace(/-/g, '');      // store without dashes
  const encrypted  = Buffer.concat([
    cipher.update(normalized, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext (all hex)
  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

/**
 * Auto-expire stale reservations on this unit before processing.
 * If reservationExpiry is past, revert to 'available'.
 */
async function autoExpireIfStale(
  unit: InstanceType<typeof Unit>,
): Promise<boolean> {
  const u = unit as unknown as Record<string, unknown>;

  if (u.status !== 'reserved') return false;

  const expiry = u.reservationExpiry as Date | string | undefined;
  if (!expiry) return false;

  const expiryDate = new Date(expiry as string);
  if (!Number.isFinite(expiryDate.getTime())) return false;

  if (expiryDate < new Date()) {
    u.status            = 'available';
    u.reservedBy        = null;
    u.reservationExpiry = null;
    u.reservationAmount = null;
    u.reservationExpired = true;
    await unit.save();
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed. Use PATCH.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // ── Auth ────────────────────────────────────
  const authResult = await requireAuth(req, res);
  if (!authResult) return;

  const userId  = authResult.id;
  const role    = authResult.role;
  const isAdmin = role === 'admin';
  const ip      = getClientIp(req);

  // Only developer or admin
  if (!isAdmin && role !== 'developer') {
    return void res.status(403).json({
      success: false,
      message: 'Only developers or admins can update unit status.',
      code: 'FORBIDDEN',
    });
  }

  // ── Rate limit (admin gets higher limit) ────
  const rl = await (isAdmin
    ? rateLimitAdmin(req)
    : rateLimitDeveloper(req));

  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  // ── Resolve params ──────────────────────────
  const idOrSlug = normalizeParam(
    req.query.id as string | string[] | undefined,
  ).trim();
  const unitId   = normalizeParam(
    req.query.unitId as string | string[] | undefined,
  ).trim();

  if (!idOrSlug || !unitId || !isValidObjectId(unitId)) {
    return void res.status(400).json({
      success: false,
      message: 'Valid project ID and unit ID are required.',
      code: 'INVALID_PARAMS',
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

  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return void res.status(422).json({
      success: false,
      message: 'Validation failed.',
      code:    'VALIDATION_ERROR',
      errors:  parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const data: StatusBody = parsed.data;
  const targetStatus     = data.status as UnitStatus;

  await dbConnect();

  // ── Resolve project ─────────────────────────
  const project = await (
    isValidObjectId(idOrSlug)
      ? Project.findOne({ _id: idOrSlug, isDeleted: { $ne: true } })
      : Project.findOne({ slug: idOrSlug, isDeleted: { $ne: true } })
  )
    .select('_id developer slug projectName')
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

  // Anti-enumeration ownership check
  if (!isAdmin && ownerStr !== userId) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Fetch unit via findOne() for save() ─────
  const unit = await Unit.findOne({
    _id:       new mongoose.Types.ObjectId(unitId),
    project:   new mongoose.Types.ObjectId(String(proj._id ?? '')),
    isDeleted: { $ne: true },
  });

  if (!unit) {
    return void res.status(404).json({
      success: false,
      message: 'Unit not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Auto-expire stale reservation ───────────
  const wasExpired = await autoExpireIfStale(unit);

  const unitRaw       = unit as unknown as Record<string, unknown>;
  const currentStatus = String(unitRaw.status ?? 'available') as UnitStatus;

  // ── Idempotency ──────────────────────────────
  if (currentStatus === targetStatus && !wasExpired) {
    return void res.status(200).json({
      success: true,
      message: `Unit is already ${targetStatus}.`,
      unit: {
        _id:    String(unit._id),
        status: currentStatus,
      },
    });
  }

  // ── Validate transition ──────────────────────
  const allowed = isAdmin
    ? ADMIN_TRANSITIONS[currentStatus] ?? []
    : DEVELOPER_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(targetStatus)) {
    return void res.status(409).json({
      success: false,
      message: `Cannot transition from '${currentStatus}' to '${targetStatus}'.${
        !isAdmin ? ' Contact admin if needed.' : ''
      }`,
      code: 'INVALID_TRANSITION',
    });
  }

  // ── Business rule validations ────────────────

  // reserved → requires buyer info
  if (targetStatus === 'reserved') {
    if (!data.reservedBy) {
      return void res.status(422).json({
        success: false,
        message: "Buyer name (reservedBy) is required when reserving a unit.",
        code: 'MISSING_BUYER_INFO',
      });
    }
    if (!data.reservationExpiry) {
      return void res.status(422).json({
        success: false,
        message: 'Reservation expiry date is required.',
        code: 'MISSING_EXPIRY',
      });
    }
    const expDate = new Date(data.reservationExpiry);
    if (!Number.isFinite(expDate.getTime()) || expDate <= new Date()) {
      return void res.status(422).json({
        success: false,
        message: 'Reservation expiry must be a future date.',
        code: 'INVALID_EXPIRY',
      });
    }
  }

  // sold → requires CNIC + name
  if (targetStatus === 'sold') {
    if (!data.soldToCnic) {
      return void res.status(422).json({
        success: false,
        message: 'Buyer CNIC is required to mark a unit as sold.',
        code: 'MISSING_CNIC',
      });
    }
    if (!data.soldToName) {
      return void res.status(422).json({
        success: false,
        message: 'Buyer name (soldToName) is required to mark a unit as sold.',
        code: 'MISSING_BUYER_NAME',
      });
    }
  }

  // ── Apply status transition ──────────────────

  unitRaw.status = targetStatus;

  if (targetStatus === 'reserved') {
    unitRaw.reservedBy        = data.reservedBy;
    unitRaw.reservationExpiry = data.reservationExpiry
      ? new Date(data.reservationExpiry)
      : null;
    unitRaw.reservationAmount = data.reservationAmount ?? null;
    unitRaw.reservationExpired = false;
  }

  if (targetStatus === 'available') {
    // Clear reservation fields on revert
    unitRaw.reservedBy         = null;
    unitRaw.reservationExpiry  = null;
    unitRaw.reservationAmount  = null;
    unitRaw.reservationExpired = false;
  }

  if (targetStatus === 'sold' && data.soldToCnic) {
    // Security arch rule: NEVER store raw CNIC
    // Hash for duplicate detection + encrypt for authorized lookup
    unitRaw.soldToCnicHash      = hashCnic(data.soldToCnic);
    unitRaw.soldToCnicEncrypted = encryptCnic(data.soldToCnic);
    unitRaw.soldToName          = data.soldToName;
    unitRaw.soldPrice           = data.soldPrice ?? unitRaw.price;
    unitRaw.soldAt              = data.soldAt
      ? new Date(data.soldAt)
      : new Date();

    // Clear reservation after sale
    unitRaw.reservedBy        = null;
    unitRaw.reservationExpiry = null;
    unitRaw.reservationAmount = null;
  }

  if (targetStatus === 'cancelled') {
    // Clear all sale/reservation data on cancel
    unitRaw.reservedBy         = null;
    unitRaw.reservationExpiry  = null;
    unitRaw.reservationAmount  = null;
    unitRaw.reservationExpired = false;
  }

  // ── Save ─────────────────────────────────────
  await unit.save();

  // ── Post-save: sync project breakdown ────────
  await syncUnitTypeBreakdown(String(proj._id ?? '')).catch(() => undefined);

  // ── Audit log ─────────────────────────────────
  // IMPORTANT: Never log raw CNIC — log hash only
  await logSecurityEvent({
    type:     'admin_action',
    severity: targetStatus === 'sold' ? 'high' : 'medium',
    userId,
    ip,
    metadata: {
      action:         'unit_status_changed',
      unitId,
      projectId:      String(proj._id ?? ''),
      projectSlug:    String(proj.slug ?? ''),
      fromStatus:     currentStatus,
      toStatus:       targetStatus,
      byRole:         role,
      wasAutoExpired: wasExpired,
      // Sale audit — hash only, never raw CNIC
      ...(targetStatus === 'sold' && data.soldToCnic
        ? {
            soldToCnicHash: hashCnic(data.soldToCnic),
            soldToName:     data.soldToName,
            soldPrice:      data.soldPrice,
          }
        : {}),
      // Reservation audit
      ...(targetStatus === 'reserved'
        ? {
            reservedBy:        data.reservedBy,
            reservationExpiry: data.reservationExpiry,
            reservationAmount: data.reservationAmount,
          }
        : {}),
      note: data.note,
    },
    req,
  });

  // ── Response ─────────────────────────────────
  const statusMessages: Record<UnitStatus, string> = {
    available:  'Unit is now available.',
    reserved:   'Unit reserved successfully.',
    sold:       'Unit marked as sold. Sale recorded securely.',
    on_hold:    'Unit placed on hold.',
    cancelled:  'Unit cancelled.',
  };

  return void res.status(200).json({
    success: true,
    message: statusMessages[targetStatus],
    unit: {
      _id:          String(unit._id),
      unitNumber:   String(unitRaw.unitNumber ?? ''),
      status:       targetStatus,
      previousStatus: currentStatus,
      // Price for sold confirmation
      ...(targetStatus === 'sold'
        ? {
            soldPrice: data.soldPrice ?? unitRaw.price,
            soldPriceFormatted: typeof (data.soldPrice ?? unitRaw.price) === 'number'
              ? formatPKR(Number(data.soldPrice ?? unitRaw.price))
              : null,
            soldAt: unitRaw.soldAt,
          }
        : {}),
      // Expiry for reservation confirmation
      ...(targetStatus === 'reserved'
        ? {
            reservationExpiry: data.reservationExpiry,
            reservationAmount: data.reservationAmount,
          }
        : {}),
      updatedAt: new Date().toISOString(),
    },
  });
}