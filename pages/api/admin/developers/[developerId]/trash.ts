// pages/api/admin/developers/[developerId]/trash.ts
// 🔒 ENTERPRISE v3.0 — Admin Developer Soft Delete (Trash / Restore)
// Fixes: requireAdmin, logSecurityEvent, crypto.randomUUID,
//        route param [developerId], no isSelfDelete on admin route,
//        no superadmin/moderator roles, auditTrail for restore,
//        proper types, dbConnect order, void pattern

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import DeveloperProfile from '@/models/DeveloperProfile';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';
import mongoose from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD SCHEMA
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid ID format',
);

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPES
// ═══════════════════════════════════════════════════════════════

type TrashAction = 'trashed' | 'restored';

interface TrashResponse {
  success:   boolean;
  message:   string;
  action?:   TrashAction;
  developer?: {
    _id:         unknown;
    companyName: string;
    isDeleted:   boolean;
    status:      string;
  };
  code?:     string;
  requestId: string;
}

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(
  res:       NextApiResponse,
  requestId: string,
): void {
  res.setHeader('X-Request-Id',              requestId);
  res.setHeader('Content-Type',              'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('Cache-Control',             'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy',        'geolocation=(), microphone=(), camera=()');
}

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? '').split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || '0.0.0.0';
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrashResponse>,
): Promise<void> {

  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    void res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
    return;
  }

  // ── Validate route param ─────────────────────────────────────
  // ✅ Route param is [developerId] — matches locked naming convention
  const { developerId } = req.query;
  const idResult = ObjectIdSchema.safeParse(developerId);

  if (!idResult.success) {
    void res.status(400).json({
      success: false,
      message: 'Invalid Developer ID format',
      code:    'INVALID_ID',
      requestId,
    });
    return;
  }

  const developerIdStr = idResult.data;

  // ── DB first — before any queries ────────────────────────────
  await dbConnect();

  // ── Rate limit ───────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    // ✅ No SecurityEvent here — rate limit logging creates DB writes
    //    under DoS conditions — exactly when you don't want extra load
    void res.status(429).json({
      success: false,
      message: `Too many requests. Please try again in ${rl.retryAfter ?? 60} seconds.`,
      code:    'RATE_LIMITED',
      requestId,
    });
    return;
  }

  // ── Auth — requireAdmin() only ────────────────────────────────
  // ✅ This is an admin-only endpoint
  // ✅ Self-delete by developer belongs on /api/developer/profile DELETE
  //    not on /api/admin/ routes — security boundary
  const auth = await requireAdmin(req, res);
  if (!auth) return; // requireAdmin already sent 401/403

  try {
    // ── Fetch developer ───────────────────────────────────────
    const developer = await DeveloperProfile.findById(developerIdStr)
      .maxTimeMS(MAX_TIME_MS);

    if (!developer) {
      void res.status(404).json({
        success: false,
        message: 'Developer not found',
        code:    'NOT_FOUND',
        requestId,
      });
      return;
    }

    // ── Toggle trash status ───────────────────────────────────
    const now = new Date();
    let action: TrashAction;
    let message: string;

    if (developer.isDeleted) {
      // ── RESTORE ───────────────────────────────────────────
      developer.isDeleted      = false;
      developer.deletedAt      = null;
      developer.deletedBy      = undefined;
      developer.deletionReason = undefined;

      // ✅ Restore tracked via auditTrail — no restoredAt/restoredBy
      //    fields needed on the model (that's what auditTrail is for)
      await developer.addAuditEntry(
        'developer_restored',
        new mongoose.Types.ObjectId(auth.id),
        { restoredAt: now.toISOString() },
        ip,
      );

      action  = 'restored';
      message = 'Developer restored from trash successfully';

      logSecurityEvent({
        type:      'admin_action',
        severity:  'medium',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:            'developer_restored',
          targetDeveloperId: developerIdStr,
          requestId,
        },
      });

    } else {
      // ── SOFT DELETE (TRASH) ───────────────────────────────
      developer.isDeleted = true;
      developer.deletedAt = now;
      developer.deletedBy = new mongoose.Types.ObjectId(auth.id);

      await developer.addAuditEntry(
        'developer_trashed',
        new mongoose.Types.ObjectId(auth.id),
        { trashedAt: now.toISOString() },
        ip,
      );

      action  = 'trashed';
      message = 'Developer moved to trash successfully';

      logSecurityEvent({
        type:      'admin_action',
        severity:  'medium',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:            'developer_trashed',
          targetDeveloperId: developerIdStr,
          requestId,
        },
      });
    }

    // ✅ No manual updatedAt — Mongoose timestamps:true handles it
    await developer.save({ validateBeforeSave: false });

    // ── Success response ──────────────────────────────────────
    void res.status(200).json({
      success: true,
      message,
      action,
      developer: {
        _id:         developer._id,
        companyName: developer.companyName,
        isDeleted:   developer.isDeleted,
        status:      developer.status,
      },
      requestId,
    });

  } catch (error: unknown) {
    logSecurityEvent({
      type:      'admin_action',
      severity:  'high',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:            'developer_trash_toggle_error',
        targetDeveloperId: developerIdStr,
        errorCode:         error instanceof Error ? error.message : 'UNKNOWN',
        requestId,
      },
    });

    void res.status(500).json({
      success: false,
      message: 'Internal server error',
      code:    'SERVER_ERROR',
      requestId,
    });
  }
}