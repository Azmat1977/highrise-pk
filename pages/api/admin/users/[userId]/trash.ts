// pages/api/admin/users/[userId]/trash.ts
// Admin User Trash Toggle API — V4.1 Compliant
// PUT — toggles isDeleted (trash ↔ restore)
// Uses auditTrail (NOT restoredAt/restoredBy — banned per V4.1)

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { logUserAction } from '@/lib/logAdminAction';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TIME_MS = 5000;

const EXCLUDED_FIELDS = [
  '-password',
  '-resetToken',
  '-resetTokenExpiry',
  '-cnic',
  '-cnicEnc',
  '-cnicHash',
  '-security.passwordHistory',
  '-security.resetCodeHash',
  '-twoFactorAuth.secret',
  '-twoFactorAuth.backupCodes',
].join(' ');

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

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

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
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

    // Prevent self-trash
    if (userId === admin.id) {
      res.status(400).json({
        success: false,
        message: 'Cannot trash your own account',
        code:    'SELF_DELETION_BLOCKED',
        requestId,
      });
      return;
    }

    await dbConnect();

    const targetUser = await User.findById(userId).maxTimeMS(MAX_TIME_MS);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND', requestId });
      return;
    }

    // Protect other admins
    if (targetUser.role === 'admin') {
      res.status(403).json({
        success: false,
        message: 'Cannot trash administrator accounts',
        code:    'ADMIN_PROTECTION',
        requestId,
      });
      return;
    }

    const wasDeleted = Boolean(targetUser.isDeleted);
    const now = new Date();

    if (wasDeleted) {
      // ── Restore ──
      targetUser.isDeleted = false;
      targetUser.deletedAt = undefined;
      targetUser.deletedBy = undefined;

      // Add audit trail entry (V4.1: no restoredAt/restoredBy fields)
      if (!targetUser.auditTrail) {
        targetUser.auditTrail = {};
      }
      if (!targetUser.auditTrail.modificationHistory) {
        targetUser.auditTrail.modificationHistory = [];
      }
      targetUser.auditTrail.modificationHistory.push({
        field:     'isDeleted',
        oldValue:  'true',
        newValue:  'false',
        changedBy: new mongoose.Types.ObjectId(admin.id),
        changedAt: now,
        ip,
      });
      targetUser.auditTrail.lastModifiedAt = now;
      targetUser.auditTrail.lastModifiedBy = new mongoose.Types.ObjectId(admin.id);
      targetUser.auditTrail.lastModifiedByIp = ip;
    } else {
      // ── Trash ──
      targetUser.isDeleted = true;
      targetUser.deletedAt = now;
      targetUser.deletedBy = admin.id;
      // Force logout
      targetUser.tokenVersion = (targetUser.tokenVersion ?? 0) + 1;
    }

    await targetUser.save();

   // Audit log
    void logUserAction({
      action:        wasDeleted ? 'user_restored' : 'user_deleted',
      adminId:       admin.id,
      adminEmail:    admin.email ?? '',
      adminName:     admin.name ?? admin.email ?? 'admin',
      entityId:      userId,
      entityLabel:   targetUser.name ?? targetUser.email ?? userId,
      previousValue: wasDeleted ? 'trashed' : 'active',
      newValue:      wasDeleted ? 'restored' : 'trashed',
      ip,
      userAgent:     ua,
      requestId,
      meta: {
        isDeleted:      !wasDeleted,
        previousState:  wasDeleted ? 'trashed' : 'active',
        newState:       wasDeleted ? 'restored' : 'trashed',
        targetUserRole: targetUser.role,
      },
    });

    // Fetch clean response
    const updatedRaw = await User.findById(userId)
      .select(EXCLUDED_FIELDS)
      .lean()
      .maxTimeMS(MAX_TIME_MS);

    res.status(200).json({
      success: true,
      message: wasDeleted ? 'User restored from trash' : 'User moved to trash',
      action:  wasDeleted ? 'restored' : 'trashed',
      user:    updatedRaw,
      requestId,
    });
  } catch (err: unknown) {
    void logSecurityEvent({
      type: 'admin_action',
      ip,
      metadata: {
        action:   'admin_user_trash_error',
        endpoint: `/api/admin/users/${userId}/trash`,
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