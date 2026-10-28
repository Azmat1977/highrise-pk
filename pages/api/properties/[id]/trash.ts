// pages/api/properties/[id]/trash.ts
// ═══════════════════════════════════════════════════════════════
// Owner Trash / Restore Endpoint
// ═══════════════════════════════════════════════════════════════
// PATCH → Owner can trash or restore their OWN property
//
// ARCHITECTURAL BOUNDARY (V4.8):
//   ✅ This file:  Owner-only trash/restore
//   ❌ This file:  NO admin trash (admin uses dedicated endpoint)
//   ✅ Admin endpoint:  /api/admin/properties/[propertyId]/trash
//
// Reasoning: Single source of truth for admin mutations
//            prevents audit log drift + state machine bypass.
//
// Body: { isDeleted: boolean, reason?: string }
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property, { IProperty } from '@/models/Property';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApiWrite } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { ownerRestoreTargetStatus, legacyStatusForVerification, isPropertyVerificationStatus } from '@/lib/property/propertyLifecycle';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS    = 2500;
const MAX_REASON_LEN = 500;
const MAX_IP_LEN     = 64;

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface TrashBody {
  isDeleted: boolean;
  reason?:   string;
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

function normalizeId(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return String(s ?? '').trim() || null;
}

// Helper: push audit trail entry (used by both trash and restore branches)
function pushAuditEntry(
  doc:         IProperty,
  action:      'trashed' | 'restored',
  performedBy: mongoose.Types.ObjectId,
  role:        string,
  timestamp:   Date,
  reason:      string | undefined,
  ip:          string
): void {
  if (!Array.isArray(doc.auditTrail)) {
    doc.auditTrail = [];
  }
  doc.auditTrail.push({
    action,
    performedBy,
    role,
    timestamp,
    reason,
    ip: ip.slice(0, MAX_IP_LEN),
  });
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

  // ── Method guard ────────────────────────────────────────────
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      requestId,
    });
    return;
  }

  // ── Rate limit ──────────────────────────────────────────────
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

  // ── Auth required ───────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── ID validation ───────────────────────────────────────────
  const idRaw = normalizeId(req.query['id']);
  if (!idRaw || !isValidObjectId(idRaw)) {
    res.status(400).json({
      success: false,
      message: 'Invalid property ID.',
      requestId,
    });
    return;
  }

  // ── Body validation ─────────────────────────────────────────
  const body = req.body as TrashBody;
  if (!body || typeof body.isDeleted !== 'boolean') {
    res.status(400).json({
      success: false,
      message: 'Request body must include isDeleted (boolean).',
      requestId,
    });
    return;
  }

  const desired = body.isDeleted;
  const reason  = typeof body.reason === 'string'
    ? body.reason.trim().slice(0, MAX_REASON_LEN)
    : undefined;

  const ip = getClientIp(req);

  try {
    await dbConnect();

    // ── Single query: load full document for save() ─────────────
    // findOne() + save() triggers pre-save hooks (status sync,
    // trust score, quality metrics, fraud detection)
    const doc = await Property
      .findById(idRaw)
      .maxTimeMS(MAX_TIME_MS);

    if (!doc) {
      res.status(404).json({
        success: false,
        message: 'Property not found.',
        requestId,
      });
      return;
    }

    const property = doc as IProperty;

    // ── Authorization: OWNER ONLY ───────────────────────────────
    // Admin trash/restore is handled by /api/admin/properties/[propertyId]/trash
    // This endpoint is exclusively for property owners managing their own listings
    const isOwner = property.owner?.toString() === auth.id;
    if (!isOwner) {
      // Admin attempting to use this endpoint?
      if (auth.authorityRole === 'admin' || auth.authorityRole === 'superadmin') {
        res.status(400).json({
          success: false,
          message: 'Admin trash operations must use /api/admin/properties/[propertyId]/trash',
          code:    'WRONG_ENDPOINT',
          requestId,
        });
        return;
      }

      res.status(403).json({
        success: false,
        message: 'Forbidden. You can only trash properties you own.',
        requestId,
      });
      return;
    }

    // ── Idempotent guard ────────────────────────────────────────
    if (Boolean(property.isDeleted) === desired) {
      res.status(200).json({
        success:  true,
        requestId,
        message:  desired
          ? 'Property is already in Trash.'
          : 'Property is already active.',
        property: {
          _id:       idRaw,
          slug:      property.slug,
          isDeleted: desired,
          deletedAt: property.deletedAt ?? null,
        },
      });
      return;
    }

    // ── Apply mutation ──────────────────────────────────────────
    const now     = new Date();
    const ownerId = new mongoose.Types.ObjectId(auth.id);

    if (desired) {
      // ── Trash (soft delete) ──────────────────────────────────
      property.isDeleted = true;
      property.deletedAt = now;
      property.deletedBy = ownerId;

      // Trashed property cannot be featured
      property.isFeatured = false;

      pushAuditEntry(property, 'trashed', ownerId, auth.role, now, reason, ip);
    } else {
      // ── Restore ──────────────────────────────────────────────
      // Restoration never republishes a stale verification decision.
      const currentVerification = isPropertyVerificationStatus(property.verification?.status)
        ? property.verification.status
        : 'draft';
      const restoreStatus = ownerRestoreTargetStatus(currentVerification);

      property.isDeleted = false;
      property.deletedAt = null;
      property.deletedBy = null;
      if (!property.verification) property.verification = { status: 'draft' };
      property.verification.status = restoreStatus;
      property.verification.verifiedAt = undefined;
      property.verification.verifiedBy = undefined;
      property.verification.requiresManualReview = true;
      const legacy = legacyStatusForVerification(restoreStatus);
      property.status = legacy.status;
      property.isVerified = legacy.isVerified;
      property.isFlagged = legacy.isFlagged;
      property.isFeatured = false;

      pushAuditEntry(property, 'restored', ownerId, auth.role, now, reason, ip);
    }

    property.updatedBy = ownerId;

    // ── Save (triggers pre-save hooks) ──────────────────────────
    await doc.save();

    // ── Audit log ───────────────────────────────────────────────
    await logSecurityEvent({
      type:   desired ? 'property_deleted' : 'property_updated',
      userId: auth.id,
      role:   auth.role,
      ip,
      metadata: {
        propertyId: idRaw,
        action:     desired ? 'trash' : 'restore',
        reason:     reason ?? null,
        requestId,
      },
    });

    // ── Response ────────────────────────────────────────────────
    res.status(200).json({
      success:  true,
      requestId,
      message:  desired
        ? 'Moved to Trash. You can restore it within 30 days, or it will be permanently deleted.'
        : 'Restored to Draft. Review the listing and resubmit it for verification before it can become public again.',
      property: {
        _id:       idRaw,
        slug:      property.slug,
        isDeleted: desired,
        deletedAt: desired ? now : null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({
      success: false,
      message: 'Failed to update trash status.',
      requestId,
      ...(process.env.NODE_ENV === 'development' && { debug: message }),
    });
  }
}