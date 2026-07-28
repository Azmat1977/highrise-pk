// pages/api/admin/comments/[id]/pin.ts
// 🔒 ENTERPRISE v2.0 - Admin Comment Pinning (Reddit/Discord Style)

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { checkPermission } from '@/lib/permissions';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;
const MAX_PINNED_PER_BLOG = 3; // Maximum pinned comments per blog post

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const PinCommentSchema = z.object({
  action: z.enum(['pin', 'unpin']),
  reason: z.string().trim().max(200).optional(),
});

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY HEADERS + REQUEST ID
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function setSecurityHeaders(res: NextApiResponse, requestId: string) {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip || '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function getUserAgent(req: NextApiRequest): string {
  return String(req.headers['user-agent'] || '').slice(0, 200);
}

function requireActiveAdminOrThrow(user: any) {
  if (!user) {
    const err: any = new Error('User not found');
    err.statusCode = 401;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const role = String(user.role || 'user').toLowerCase();
  if (!['admin', 'superadmin', 'moderator'].includes(role)) {
    const err: any = new Error('Admin access required');
    err.statusCode = 403;
    err.code = 'ADMIN_REQUIRED';
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  // ═══════════════════════════════════════════════════════════════
  // ✅ METHOD CHECK
  // ═══════════════════════════════════════════════════════════════

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    res.setHeader('Allow', ['POST', 'PATCH']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ VALIDATE COMMENT ID
  // ═══════════════════════════════════════════════════════════════

  const { id } = req.query;
  const idResult = ObjectIdSchema.safeParse(id);

  if (!idResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid comment ID format',
      code: 'INVALID_ID',
      requestId,
    });
  }

  const commentId = idResult.data;

  try {
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════
    // ✅ RATE LIMITING
    // ═══════════════════════════════════════════════════════════════

    const rl = await rateLimitAdmin(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter || 60));
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.',
        code: 'RATE_LIMITED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUTHENTICATION & AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════

    const session = (await getServerSession(req, res, authOptions)) as any;

    if (!session?.user) {
      SecurityEvent.create({
        eventType: 'unauthorized_access_attempt',
        severity: 'high',
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          endpoint: `/api/admin/comments/${commentId}/pin`,
          reason: 'No active session',
        },
      }).catch(console.error);

      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
        requestId,
      });
    }

    const admin: any = await User.findById(session.user.id)
      .select('role permissions status isDeleted')
      .lean()
      .maxTimeMS(MAX_TIME_MS);

    requireActiveAdminOrThrow(admin);

    // ✅ Permission Check
    const hasPermission = checkPermission(admin, 'comment_pin');
    if (!hasPermission) {
      SecurityEvent.create({
        eventType: 'permission_denied',
        severity: 'high',
        userId: session.user.id,
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          endpoint: `/api/admin/comments/${commentId}/pin`,
          permission: 'comment_pin',
        },
      }).catch(console.error);

      return res.status(403).json({
        success: false,
        message: 'Permission denied',
        code: 'PERMISSION_DENIED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ VALIDATE REQUEST BODY
    // ═══════════════════════════════════════════════════════════════

    const parseResult = PinCommentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        errors: parseResult.error.flatten().fieldErrors,
        requestId,
      });
    }

    const { action, reason } = parseResult.data;

    // ═══════════════════════════════════════════════════════════════
    // ✅ FETCH COMMENT
    // ═══════════════════════════════════════════════════════════════

    const comment: any = await Comment.findById(commentId).maxTimeMS(MAX_TIME_MS);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
        code: 'NOT_FOUND',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CHECK IF COMMENT IS DELETED
    // ═══════════════════════════════════════════════════════════════

    if (comment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot pin a deleted comment',
        code: 'COMMENT_DELETED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ HANDLE PIN ACTION
    // ═══════════════════════════════════════════════════════════════

    const now = new Date();

    if (action === 'pin') {
      // Check if already pinned
      if (comment.isPinned) {
        return res.status(400).json({
          success: false,
          message: 'Comment is already pinned',
          code: 'ALREADY_PINNED',
          requestId,
        });
      }

      // Check maximum pinned comments per blog
      const pinnedCount = await Comment.countDocuments({
        blogId: comment.blogId,
        isPinned: true,
        isDeleted: { $ne: true },
      }).maxTimeMS(MAX_TIME_MS);

      if (pinnedCount >= MAX_PINNED_PER_BLOG) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_PINNED_PER_BLOG} pinned comments per blog post reached. Unpin another comment first.`,
          code: 'MAX_PINNED_REACHED',
          maxAllowed: MAX_PINNED_PER_BLOG,
          currentPinned: pinnedCount,
          requestId,
        });
      }

      // Pin the comment
      comment.isPinned = true;
      comment.pinnedBy = session.user.id;
      comment.pinnedAt = now;
      comment.pinnedReason = reason || 'Highlighted by admin';
      comment.updatedAt = now;

      await comment.save();

      // Audit log
      SecurityEvent.create({
        eventType: 'admin_action',
        severity: 'medium',
        userId: session.user.id,
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          action: 'comment_pinned',
          commentId,
          blogId: String(comment.blogId),
          reason: reason || 'No reason provided',
        },
      }).catch(console.error);

      return res.status(200).json({
        success: true,
        message: 'Comment pinned successfully',
        comment: {
          _id: comment._id,
          isPinned: comment.isPinned,
          pinnedBy: comment.pinnedBy,
          pinnedAt: comment.pinnedAt,
          pinnedReason: comment.pinnedReason,
        },
        pinnedCount: pinnedCount + 1,
        maxAllowed: MAX_PINNED_PER_BLOG,
        requestId,
      });
    }

    // action === 'unpin'
    if (!comment.isPinned) {
      return res.status(400).json({
        success: false,
        message: 'Comment is not pinned',
        code: 'NOT_PINNED',
        requestId,
      });
    }

    // Unpin the comment
    comment.isPinned = false;
    comment.pinnedBy = undefined;
    comment.pinnedAt = undefined;
    comment.pinnedReason = undefined;
    comment.updatedAt = now;

    await comment.save();

    // Audit log
    SecurityEvent.create({
      eventType: 'admin_action',
      severity: 'low',
      userId: session.user.id,
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        action: 'comment_unpinned',
        commentId,
        blogId: String(comment.blogId),
      },
    }).catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'Comment unpinned successfully',
      comment: {
        _id: comment._id,
        isPinned: comment.isPinned,
      },
      requestId,
    });
  } catch (error: any) {
    console.error('Pin comment error:', { requestId, error: error?.message });

    SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: `/api/admin/comments/${commentId}/pin`,
        errorCode: error?.code || 'UNKNOWN',
      },
    }).catch(console.error);

    if (error?.statusCode && error?.code) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
        requestId,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      requestId,
    });
  }
}