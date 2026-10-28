// pages/api/properties/track-price.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property, { IProperty } from '@/models/Property';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApiWrite } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User   from '@/models/User';
import {
  isPropertyVerificationStatus,
  legacyStatusForVerification,
  ownerEditTargetStatus,
} from '@/lib/property/propertyLifecycle';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS    = 2500;
const MAX_REASON_LEN = 240;
const MAX_PRICE      = 50_000_000_000; // 50B PKR

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface PriceUpdateBody {
  propertyId?: unknown;
  newPrice?:   unknown;
  reason?:     unknown;
  dryRun?:     unknown;
}

interface LeanProperty {
  _id:           mongoose.Types.ObjectId;
  owner:         mongoose.Types.ObjectId;
  price?:        number;
  isDeleted?:    boolean;
  verification?: { status?: string };
  slug?:         string;
  title?:        string;
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf    = req.headers['x-forwarded-for'];
  const raw   = Array.isArray(xf) ? xf[0] : xf;
  const first = (raw ?? '').split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || '0.0.0.0';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',              requestId);
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains; preload');
  res.setHeader('X-DNS-Prefetch-Control',    'off');
  res.setHeader('Cache-Control',             'no-store');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/,/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n < 0)              return null;
  if (n > MAX_PRICE)      return null;
  return n;
}

function clampReason(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  if (!s) return undefined;
  return s.length > MAX_REASON_LEN ? s.slice(0, MAX_REASON_LEN) : s;
}

// Check user account state using only real User model fields
function assertUserActive(
  user: { status?: string; isDeleted?: boolean; deletedAt?: Date | null } | null
): void {
  if (!user) {
    const e = new Error('User not found.');
    (e as NodeJS.ErrnoException).code = 'USER_NOT_FOUND';
    throw e;
  }
  if (user.isDeleted || user.deletedAt) {
    const e = new Error('Account is not available.');
    (e as NodeJS.ErrnoException).code = 'ACCOUNT_DELETED';
    throw e;
  }
  const s = String(user.status ?? 'active').toLowerCase();
  if (s === 'suspended' || s === 'banned') {
    const e = new Error(`Account is ${s}.`);
    (e as NodeJS.ErrnoException).code = 'ACCOUNT_INACTIVE';
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚦 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      requestId,
    });
    return;
  }

  // Rate limit (write endpoint)
  const rl = await rateLimitApiWrite(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down.',
      requestId,
    });
    return;
  }

  // Auth required
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const ip = getClientIp(req);

  try {
    await dbConnect();

    // Load actor for status check
    const actor = await User
      .findById(auth.id)
      .select('status isDeleted deletedAt role')
      .maxTimeMS(MAX_TIME_MS)
      .lean<{
        status?:    string;
        isDeleted?: boolean;
        deletedAt?: Date | null;
        role?:      string;
      }>();

    assertUserActive(actor);

    const isAdmin = auth.authorityRole === 'admin' || auth.authorityRole === 'superadmin';

    // ── Parse body ────────────────────────────────────────
    const body = req.body as PriceUpdateBody;

    if (!body || typeof body !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Request body must be JSON.',
        requestId,
      });
      return;
    }

    const propertyIdRaw = String(body.propertyId ?? '').trim();
    const newPrice      = parseMoney(body.newPrice);
    const reason        = clampReason(body.reason);
    const dryRun        = body.dryRun === true;

    if (!propertyIdRaw || !isValidObjectId(propertyIdRaw)) {
      res.status(400).json({
        success: false,
        message: 'Valid propertyId is required.',
        requestId,
      });
      return;
    }

    if (newPrice === null) {
      res.status(400).json({
        success: false,
        message: `Valid newPrice is required (0 – ${MAX_PRICE.toLocaleString()} PKR).`,
        requestId,
      });
      return;
    }

    // ── Single DB query — full Mongoose doc for save() ────
    // findOne() + save() — NEVER findByIdAndUpdate (bypasses pre-save hooks)
    // Pre-save hook manages: priceHistory, priceDropPercent, previousPrice,
    //   trueCost recalculation, trustScore, qualityMetrics
    // All gate checks (owner, isDeleted, verStatus) done in memory — no lean query
    const doc = await Property
      .findOne({
        _id:       new mongoose.Types.ObjectId(propertyIdRaw),
        isDeleted: { $ne: true },
        // Defense-in-depth: owner re-check at write time
        ...(isAdmin ? {} : { owner: new mongoose.Types.ObjectId(auth.id) }),
      })
      .maxTimeMS(MAX_TIME_MS);

    if (!doc) {
      res.status(404).json({
        success: false,
        message: 'Property not found or access denied.',
        requestId,
      });
      return;
    }

    const typedDoc = doc as IProperty;

    // ── In-memory gate checks ─────────────────────────────
    // Trash guard (defense-in-depth — findOne filter also catches this)
    if (typedDoc.isDeleted) {
      res.status(409).json({
        success: false,
        message: 'Cannot update price for a trashed property. Restore it first.',
        code:    'PROPERTY_IN_TRASH',
        requestId,
      });
      return;
    }

    // Canonical lifecycle gate. Price is a material market fact, so an owner
    // cannot change it while a Property is under review/flagged, and a
    // verified/pending/rejected Property must return to Draft when edited.
    const rawVerificationStatus = typedDoc.verification?.status ?? 'draft';
    const verStatus = isPropertyVerificationStatus(rawVerificationStatus)
      ? rawVerificationStatus
      : 'draft';

    let targetVerificationStatus = verStatus;
    if (!isAdmin) {
      try {
        targetVerificationStatus = ownerEditTargetStatus(verStatus, ['price']);
      } catch (lifecycleError) {
        res.status(409).json({
          success: false,
          message: lifecycleError instanceof Error
            ? lifecycleError.message
            : 'Property cannot be edited in its current review state.',
          code: 'PROPERTY_EDIT_LOCKED',
          requestId,
        });
        return;
      }
    }

    // ── Compute change ────────────────────────────────────
    const rawPrice      = typedDoc.price;
    const oldPrice      = Number.isFinite(rawPrice) ? (rawPrice ?? 0) : 0;
    const changeAmount  = Math.abs(newPrice - oldPrice);
    const changeType    = newPrice < oldPrice ? 'decrease' : 'increase';
    const changePercent = oldPrice > 0
      ? Math.round((changeAmount / oldPrice) * 100)
      : 100;

    // ── Idempotent same-price check ───────────────────────
    if (oldPrice === newPrice) {
      res.status(200).json({
        success:    true,
        message:    'No change: price is already set to this value.',
        requestId,
        propertyId: propertyIdRaw,
        oldPrice,
        newPrice,
        tracked:    false,
        dryRun,
      });
      return;
    }

    // priceHistory tracks changes >= 1% (or from zero)
    const shouldTrack = oldPrice <= 0 || changePercent >= 1;

    // ── Dry run — preview without DB write ────────────────
    if (dryRun) {
      res.status(200).json({
        success:      true,
        requestId,
        message:      'Dry run complete. No changes were written.',
        propertyId:   propertyIdRaw,
        oldPrice,
        newPrice,
        changeAmount,
        changePercent,
        changeType,
        tracked:      shouldTrack,
        dryRun:       true,
      });
      return;
    }

    // ── Apply price mutation ───────────────────────────────
    // Only set price — pre-save hook manages previousPrice + priceHistory
    // Setting previousPrice here would race with the hook's own logic
    typedDoc.price     = newPrice;
    typedDoc.updatedBy = new mongoose.Types.ObjectId(auth.id);

    const verificationStatusBefore = verStatus;
    const verificationStatusAfter = targetVerificationStatus;
    const requiresResubmission = !isAdmin && verificationStatusAfter === 'draft' && verificationStatusBefore !== 'draft';

    if (!isAdmin && verificationStatusAfter !== verificationStatusBefore) {
      typedDoc.verification.status = verificationStatusAfter;
      typedDoc.verification.verifiedAt = undefined;
      typedDoc.verification.verifiedBy = undefined;
      typedDoc.verification.requiresManualReview = false;
      typedDoc.lastStatusChangedAt = new Date();
      typedDoc.isFeatured = false;

      const legacy = legacyStatusForVerification(verificationStatusAfter);
      typedDoc.status = legacy.status;
      typedDoc.isVerified = legacy.isVerified;
      typedDoc.isFlagged = legacy.isFlagged;
    }

    // Price mutations are always auditable, even when the owner gives no
    // optional reason. The verification transition is recorded in the reason.
    if (!Array.isArray(typedDoc.auditTrail)) {
      typedDoc.auditTrail = [];
    }
    const auditReasonParts = [
      reason,
      verificationStatusAfter !== verificationStatusBefore
        ? `Verification ${verificationStatusBefore} -> ${verificationStatusAfter}`
        : undefined,
    ].filter(Boolean);
    typedDoc.auditTrail.push({
      action:        'price_updated',
      performedBy:   new mongoose.Types.ObjectId(auth.id),
      role:          auth.role,
      timestamp:     new Date(),
      previousValue: String(oldPrice),
      newValue:      String(newPrice),
      reason:        auditReasonParts.join(' | ') || 'Price updated',
      ip:            ip.slice(0, 64),
    });

    // save() triggers pre-save hook chain:
    //   → previousPrice set from current price (hook reads typedDoc.price)
    //   → priceHistory entry appended
    //   → priceDropPercent computed
    //   → trueCost recalculated (all charges + tax)
    //   → trustScore recalculated
    //   → qualityMetrics updated
    await doc.save();

    // Log security event — price change is a financial mutation
    await logSecurityEvent({
      type:     'property_updated',
      severity: 'medium',
      userId:   auth.id,
      role:     auth.role,
      ip,
      metadata: {
        propertyId:    propertyIdRaw,
        action:        'price_update',
        oldPrice,
        newPrice,
        changeAmount,
        changePercent,
        changeType,
        shouldTrack,
        reason:        reason ?? null,
        verificationStatusBefore,
        verificationStatusAfter,
        requiresResubmission,
        requestId,
      },
    });

    res.status(200).json({
      success:      true,
      requestId,
      message:      shouldTrack
        ? `Price ${changeType === 'decrease' ? 'decreased' : 'increased'} by ${changePercent}%. True cost recalculated.${requiresResubmission ? ' Listing returned to Draft and must be resubmitted for verification.' : ''}`
        : `Price updated (change too small to track in history).${requiresResubmission ? ' Listing returned to Draft and must be resubmitted for verification.' : ''}`,
      propertyId:   propertyIdRaw,
      oldPrice,
      newPrice,
      changeAmount,
      changePercent,
      changeType,
      tracked:      shouldTrack,
      dryRun:       false,
      verificationStatusBefore,
      verificationStatusAfter,
      requiresResubmission,
      // Return updated computed values from model
      trueCost: {
        grandTotalBuyerFiler:    typedDoc.trueCost?.grandTotalBuyerFiler    ?? newPrice,
        grandTotalBuyerNonFiler: typedDoc.trueCost?.grandTotalBuyerNonFiler ?? newPrice,
      },
    });
  } catch (err: unknown) {
    // Handle custom error codes from assertUserActive
    if (err instanceof Error) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'USER_NOT_FOUND') {
        res.status(401).json({
          success: false,
          message: err.message,
          requestId,
        });
        return;
      }
      if (code === 'ACCOUNT_DELETED' || code === 'ACCOUNT_INACTIVE') {
        res.status(403).json({
          success: false,
          message: err.message,
          requestId,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update price.',
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        debug: err instanceof Error ? err.message : String(err),
      }),
    });
  }
}