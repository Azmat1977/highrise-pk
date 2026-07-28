// pages/api/admin/developers/[developerId]/permanent-delete.ts
// 🔒 ENTERPRISE v3.0 — Admin Developer Permanent Delete
// ⚠️  DANGER ZONE — IRREVERSIBLE ACTION ⚠️
//
// Fixes: requireAdmin, logSecurityEvent, crypto.randomUUID,
//        route param [developerId], no Project model (TODO Section 5),
//        User role reset + tokenVersion++, archiveDeveloperData removed,
//        reason required, proper types, dbConnect order

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import DeveloperProfile from '@/models/DeveloperProfile';
import User from '@/models/User';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS         = 5000;
const CONFIRMATION_CODE   = 'DELETE-DEVELOPER-PERMANENTLY';

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPES
// ═══════════════════════════════════════════════════════════════

interface DeletePayload {
  confirmationCode: string;
  reason:           string;  // ✅ Required — irreversible action must have reason
}

interface DeleteResult {
  success:      boolean;
  message:      string;
  deletedData?: {
    developerId:  string;
    deletedAt:    Date;
    userReset:    boolean;
  };
  code?:        string;
  requestId:    string;
}

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid ID format',
);

const DeleteRequestSchema = z.object({
  confirmationCode: z.string().trim().min(1).max(100),
  // ✅ reason is REQUIRED for permanent delete — irreversible action
  reason: z.string().trim().min(10).max(500, 'Reason cannot exceed 500 characters'),
  // TODO Section 5: cascadeProjects will be added when Project model is built
  // cascadeProjects: z.enum(['soft', 'permanent', 'none']).default('soft'),
});

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
  res: NextApiResponse<DeleteResult>,
): Promise<void> {

  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
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

  // ── DB first — before ALL queries ────────────────────────────
  await dbConnect();

  // ── Rate limit ───────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    void res.status(429).json({
      success: false,
      message: `Too many requests. Please try again in ${rl.retryAfter ?? 60} seconds.`,
      code:    'RATE_LIMITED',
      requestId,
    });
    return;
  }

  // ── Auth — requireAdmin() only ────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── Validate request body ─────────────────────────────────────
  const parseResult = DeleteRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    void res.status(400).json({
      success: false,
      message: 'Invalid request body',
      code:    'VALIDATION_ERROR',
      requestId,
    });
    return;
  }

  const { confirmationCode, reason }: DeletePayload = parseResult.data;

  // ── Confirmation code check ───────────────────────────────────
  // ✅ Wrong code is a security signal — log it
  if (confirmationCode !== CONFIRMATION_CODE) {
    logSecurityEvent({
      type:      'admin_action',
      severity:  'high',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:            'permanent_delete_wrong_confirmation',
        targetDeveloperId: developerIdStr,
        metadata:          { reason: 'Confirmation code mismatch' },
        requestId,
      },
    });

    void res.status(400).json({
      success: false,
      message: `Invalid confirmation code. Required: "${CONFIRMATION_CODE}"`,
      code:    'INVALID_CONFIRMATION',
      requestId,
    });
    return;
  }

  try {
    // ── Fetch developer ───────────────────────────────────────
    const developer = await DeveloperProfile.findById(developerIdStr)
      .populate('user', '_id')
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

    // ── Must be in trash first ────────────────────────────────
    // ✅ Two-step safety: soft delete → review → permanent delete
    if (!developer.isDeleted) {
      logSecurityEvent({
        type:      'admin_action',
        severity:  'medium',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:            'permanent_delete_not_in_trash',
          targetDeveloperId: developerIdStr,
          metadata:          { reason: 'Profile not soft-deleted first' },
          requestId,
        },
      });

      void res.status(400).json({
        success: false,
        message: 'Developer must be in trash before permanent deletion. Soft delete first.',
        code:    'NOT_IN_TRASH',
        requestId,
      });
      return;
    }

    // ── Resolve user reference ────────────────────────────────
    // ✅ Populate replaces ObjectId with document at runtime.
    //    TypeScript still sees Types.ObjectId — cast through unknown first.
    type PopulatedUser = { _id: { toString(): string } };
    const userRef = (developer.user as unknown) as PopulatedUser | null;

    const targetUserId = userRef?._id?.toString() ?? null;

    // ── Archive before deletion ───────────────────────────────
    // ✅ Permanent audit record — logged BEFORE the delete
    //    so even if deletion fails, the intent is recorded
    logSecurityEvent({
      type:      'admin_action',
      severity:  'critical',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:             'developer_permanent_delete_initiated',
        targetDeveloperId:  developerIdStr,
        targetUserId:       targetUserId ?? 'unknown',
        archivedSnapshot: {
          companyName:    developer.companyName,
          email:          developer.email,
          city:           developer.city,
          status:         developer.status,
          isVerified:     developer.isVerified,
          highriseScore:  developer.highriseScore,
          kycStatus:      developer.kycStatus,
          // ✅ phone not included — phoneEncrypted is select:false
          //    phoneHash existence confirms phone was registered
          hadPhone:       Boolean(developer.phoneHash),
          createdAt:      developer.createdAt?.toISOString(),
          softDeletedAt:  developer.deletedAt?.toISOString() ?? 'unknown',
        },
        reason,
        requestId,
      },
    });

    // ── Permanent deletion ────────────────────────────────────
    const deletionTimestamp = new Date();

    await DeveloperProfile.findByIdAndDelete(developerIdStr)
      .maxTimeMS(MAX_TIME_MS);

    // ── Reset User record ─────────────────────────────────────
    // ✅ Critical: reset role + tokenVersion to invalidate active sessions
    //    Without this, deleted developer's JWT remains valid as 'developer'
    let userReset = false;

    if (targetUserId) {
      await User.findByIdAndUpdate(
        targetUserId,
        {
          $set: { role: 'user' },
          $inc: { tokenVersion: 1 },  // ← invalidates all active JWTs
        },
        { runValidators: true },
      ).maxTimeMS(MAX_TIME_MS);

      userReset = true;
    }

    // TODO Section 5: Project cascade when Project model is built
    // const projectResult = await Project.updateMany(
    //   { developerId: targetUserId },
    //   { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: auth.id } }
    // )

    // ── Final audit log ───────────────────────────────────────
    logSecurityEvent({
      type:      'admin_action',
      severity:  'critical',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:            'developer_permanently_deleted',
        targetDeveloperId: developerIdStr,
        targetUserId:      targetUserId ?? 'unknown',
        userReset,
        reason,
        deletedAt:         deletionTimestamp.toISOString(),
        requestId,
      },
    });

    // ── Success response ──────────────────────────────────────
    void res.status(200).json({
      success: true,
      message: 'Developer permanently deleted. This action cannot be undone.',
      deletedData: {
        developerId:  developerIdStr,
        deletedAt:    deletionTimestamp,
        userReset,
      },
      requestId,
    });

  } catch (error: unknown) {
    logSecurityEvent({
      type:      'admin_action',
      severity:  'critical',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:            'developer_permanent_delete_error',
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