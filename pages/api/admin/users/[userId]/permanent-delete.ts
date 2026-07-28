// pages/api/admin/users/[userId]/permanent-delete.ts
// Admin User Permanent Delete API — V4.1 Compliant
// DELETE with confirmationCode: 'DELETE-USER-PERMANENTLY' + reason ≥10 chars
// Must be in trash first (two-step safety)
// TODO: Cascade Property delete when Section 4 is built

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { logUserAction } from '@/lib/logAdminAction';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TIME_MS = 5000;
const CONFIRMATION_CODE = 'DELETE-USER-PERMANENTLY';

// ─── Zod ──────────────────────────────────────────────────────────────────────

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const DeleteRequestSchema = z.object({
  confirmationCode: z.literal(CONFIRMATION_CODE, {
    message: `Confirmation code must be exactly "${CONFIRMATION_CODE}"`,
  }),
  reason: z.string().trim().min(10, 'Reason must be at least 10 characters').max(500),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip || '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).json({ success: false, message: 'Method not allowed', requestId });
    return;
  }

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 1000);

  // Validate userId
  const idResult = ObjectIdSchema.safeParse(req.query.userId);
  if (!idResult.success) {
    res.status(400).json({ success: false, message: 'Invalid user ID', code: 'INVALID_ID', requestId });
    return;
  }
  const userId = idResult.data;

  try {
    const rl = await rateLimitAdmin(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
      res.status(429).json({ success: false, message: 'Too many requests', code: 'RATE_LIMITED', requestId });
      return;
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    // Prevent self-delete
    if (userId === admin.id) {
      res.status(400).json({
        success: false,
        message: 'Cannot permanently delete your own account',
        code:    'SELF_DELETION_BLOCKED',
        requestId,
      });
      return;
    }

    // Validate body
    const parsed = DeleteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      res.status(400).json({
        success: false,
        message: firstIssue?.message ?? 'Invalid request body',
        code:    'VALIDATION_ERROR',
        errors:  parsed.error.flatten().fieldErrors,
        requestId,
      });
      return;
    }

    const { reason } = parsed.data;

    await dbConnect();

    const targetUser = await User.findById(userId).maxTimeMS(MAX_TIME_MS);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND', requestId });
      return;
    }

    // Protect admin accounts
    if (targetUser.role === 'admin') {
      void logSecurityEvent({
        type: 'admin_action',
        ip,
        metadata: {
          action:       'admin_delete_attempt_blocked',
          adminId:      admin.id,
          targetUserId: userId,
          targetRole:   'admin',
          requestId,
        },
      });

      res.status(403).json({
        success: false,
        message: 'Cannot permanently delete administrator accounts',
        code:    'ADMIN_PROTECTION',
        requestId,
      });
      return;
    }

    // Must be in trash first
    if (!targetUser.isDeleted) {
      res.status(400).json({
        success: false,
        message: 'User must be moved to trash before permanent deletion',
        code:    'NOT_IN_TRASH',
        requestId,
      });
      return;
    }

    // Archive snapshot before delete
    const archiveSnapshot = {
      _id:          String(targetUser._id),
      name:         targetUser.name ?? '',
      emailMasked:  targetUser.email
        ? `${targetUser.email.slice(0, 2)}***@${targetUser.email.split('@')[1] ?? ''}`
        : '',
      role:         targetUser.role ?? 'user',
      status:       targetUser.status ?? 'active',
      isVerified:   Boolean(targetUser.isVerified),
      accountType:  targetUser.accountType ?? 'individual',
      createdAt:    targetUser.createdAt?.toISOString() ?? '',
      deletedAt:    targetUser.deletedAt?.toISOString() ?? '',
      trashedBy:    targetUser.deletedBy ?? '',
    };

    // TODO Section 4: Cascade Property delete
    const propertiesAffected = 0;

    // Permanent delete
    await User.findByIdAndDelete(userId).maxTimeMS(MAX_TIME_MS);

     // Audit log — high severity (permanent deletes are 'high' per ACTION_SEVERITY_MAP)
    void logUserAction({
      action:        'user_permanently_deleted',
      adminId:       admin.id,
      adminEmail:    admin.email ?? '',
      adminName:     admin.name ?? admin.email ?? 'admin',
      entityId:      userId,
      entityLabel:   archiveSnapshot.name || userId,
      previousValue: `role:${archiveSnapshot.role}, status:${archiveSnapshot.status}`.slice(0, 500),
      newValue:      'permanently_deleted',
      reason,
      ip,
      userAgent:     ua,
      requestId,
      meta: {
        archiveSnapshot,
        propertiesAffected,
        deletedAt: new Date().toISOString(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'User permanently deleted. This action cannot be undone.',
      deletedSnapshot: archiveSnapshot,
      propertiesAffected,
      requestId,
    });
  } catch (err: unknown) {
    void logSecurityEvent({
      type: 'admin_action',
      ip,
      metadata: {
        action:   'admin_user_permanent_delete_error',
        endpoint: `/api/admin/users/${userId}/permanent-delete`,
        error:    err instanceof Error ? err.message : 'unknown',
        requestId,
      },
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code:    'SERVER_ERROR',
      requestId,
    });
  }
}