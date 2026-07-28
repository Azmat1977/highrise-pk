// pages/api/admin/comments/[id]/index.ts
// 🔒 ENTERPRISE v2.0 - Admin Comment Moderation with Zod, Audit Trail & Full RBAC

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

const VALID_ACTIONS = ['approve', 'reject', 'spam', 'pending'] as const;
const CONFIRMATION_CODE = 'DELETE-COMMENT-PERMANENTLY';

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const UpdateCommentSchema = z.object({
  action: z.enum(VALID_ACTIONS),
  adminNotes: z.string().trim().max(500).optional(),
});

const DeleteQuerySchema = z.object({
  permanent: z.enum(['true', 'false']).optional().default('false'),
  confirmationCode: z.string().optional(),
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
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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

/**
 * Archive comment data before permanent deletion
 */
async function archiveCommentData(comment: any, deletedBy: string, ip: string, ua: string): Promise<void> {
  try {
    await SecurityEvent.create({
      eventType: 'comment_permanently_deleted',
      severity: 'high',
      userId: deletedBy,
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        commentId: String(comment._id),
        content: comment.content?.slice(0, 100) || '',
        authorName: comment.author?.name || '',
        blogSlug: comment.blogSlug || '',
        status: comment.status,
        likes: comment.likes?.length || 0,
        reports: comment.reportCount || 0,
        createdAt: comment.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to archive comment data:', error);
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
          endpoint: `/api/admin/comments/${commentId}`,
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

    const isSuperAdmin = String(admin.role).toLowerCase() === 'superadmin';

    // ═══════════════════════════════════════════════════════════════
    // ✅ GET METHOD - VIEW COMMENT DETAILS
    // ═══════════════════════════════════════════════════════════════

    if (req.method === 'GET') {
      const hasPermission = checkPermission(admin, 'comment_view_details');
      if (!hasPermission) {
        SecurityEvent.create({
          eventType: 'permission_denied',
          severity: 'high',
          userId: session.user.id,
          ipAddress: ip,
          userAgent: ua,
          metadata: {
            endpoint: `/api/admin/comments/${commentId}`,
            permission: 'comment_view_details',
          },
        }).catch(console.error);

        return res.status(403).json({
          success: false,
          message: 'Permission denied',
          code: 'PERMISSION_DENIED',
          requestId,
        });
      }

      const comment: any = await Comment.findById(commentId)
        .populate('blogId', 'title slug -_id')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found',
          code: 'NOT_FOUND',
          requestId,
        });
      }

      // Audit log (non-blocking)
      SecurityEvent.create({
        eventType: 'admin_action',
        severity: 'low',
        userId: session.user.id,
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          action: 'view_comment_details',
          commentId,
        },
      }).catch(console.error);

      return res.status(200).json({
        success: true,
        message: 'Comment found',
        comment,
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ PATCH METHOD - UPDATE COMMENT STATUS
    // ═══════════════════════════════════════════════════════════════

    if (req.method === 'PATCH') {
      const hasPermission = checkPermission(admin, 'comment_moderate');
      if (!hasPermission) {
        SecurityEvent.create({
          eventType: 'permission_denied',
          severity: 'high',
          userId: session.user.id,
          ipAddress: ip,
          userAgent: ua,
          metadata: {
            endpoint: `/api/admin/comments/${commentId}`,
            permission: 'comment_moderate',
          },
        }).catch(console.error);

        return res.status(403).json({
          success: false,
          message: 'Permission denied',
          code: 'PERMISSION_DENIED',
          requestId,
        });
      }

      // Validate request body
      const parseResult = UpdateCommentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          errors: parseResult.error.flatten().fieldErrors,
          requestId,
        });
      }

      const { action, adminNotes } = parseResult.data;

      const comment: any = await Comment.findById(commentId).maxTimeMS(MAX_TIME_MS);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found',
          code: 'NOT_FOUND',
          requestId,
        });
      }

      // Status mapping
      const statusMap: Record<string, string> = {
        approve: 'approved',
        reject: 'rejected',
        spam: 'spam',
        pending: 'pending',
      };

      const oldStatus = comment.status;
      const newStatus = statusMap[action];

      // Update comment
      comment.status = newStatus;
      comment.moderatedBy = session.user.id;
      comment.moderatedAt = new Date();

      if (adminNotes) {
        comment.adminNotes = adminNotes;
      }

      // Clear report flags if approved
      if (action === 'approve') {
        comment.isReported = false;
        comment.reportCount = 0;
        comment.reportReasons = [];
      }

      comment.updatedAt = new Date();
      await comment.save();

      const actionMessages: Record<string, string> = {
        approve: 'Comment approved successfully',
        reject: 'Comment rejected',
        spam: 'Comment marked as spam',
        pending: 'Comment moved to pending',
      };

      // Audit log (non-blocking)
      SecurityEvent.create({
        eventType: 'admin_action',
        severity: action === 'spam' ? 'medium' : 'low',
        userId: session.user.id,
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          action: 'moderate_comment',
          commentId,
          oldStatus,
          newStatus,
          moderationAction: action,
        },
      }).catch(console.error);

      return res.status(200).json({
        success: true,
        message: actionMessages[action],
        comment: {
          _id: comment._id,
          status: comment.status,
          moderatedBy: comment.moderatedBy,
          moderatedAt: comment.moderatedAt,
        },
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ DELETE METHOD - SOFT/PERMANENT DELETE
    // ═══════════════════════════════════════════════════════════════

    if (req.method === 'DELETE') {
      const hasPermission = checkPermission(admin, 'comment_delete');
      if (!hasPermission) {
        SecurityEvent.create({
          eventType: 'permission_denied',
          severity: 'high',
          userId: session.user.id,
          ipAddress: ip,
          userAgent: ua,
          metadata: {
            endpoint: `/api/admin/comments/${commentId}`,
            permission: 'comment_delete',
          },
        }).catch(console.error);

        return res.status(403).json({
          success: false,
          message: 'Permission denied',
          code: 'PERMISSION_DENIED',
          requestId,
        });
      }

      // Validate query params
      const queryResult = DeleteQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          requestId,
        });
      }

      const { permanent, confirmationCode } = queryResult.data;

      const comment: any = await Comment.findById(commentId).maxTimeMS(MAX_TIME_MS);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found',
          code: 'NOT_FOUND',
          requestId,
        });
      }

      if (permanent === 'true') {
        // ⚠️ PERMANENT DELETE - Requires SuperAdmin + Confirmation
        if (!isSuperAdmin) {
          return res.status(403).json({
            success: false,
            message: 'SuperAdmin access required for permanent deletion',
            code: 'SUPERADMIN_REQUIRED',
            requestId,
          });
        }

        if (confirmationCode !== CONFIRMATION_CODE) {
          SecurityEvent.create({
            eventType: 'suspicious_activity',
            severity: 'high',
            userId: session.user.id,
            ipAddress: ip,
            userAgent: ua,
            metadata: {
              action: 'invalid_confirmation_code',
              commentId,
            },
          }).catch(console.error);

          return res.status(400).json({
            success: false,
            message: `Invalid confirmation code. Please enter "${CONFIRMATION_CODE}" to confirm.`,
            code: 'INVALID_CONFIRMATION',
            requestId,
          });
        }

        // Archive before deletion
        await archiveCommentData(comment, session.user.id, ip, ua);

        // Permanent delete
        await Comment.findByIdAndDelete(commentId).maxTimeMS(MAX_TIME_MS);

        SecurityEvent.create({
          eventType: 'admin_action',
          severity: 'critical',
          userId: session.user.id,
          ipAddress: ip,
          userAgent: ua,
          metadata: {
            action: 'comment_permanently_deleted',
            commentId,
          },
        }).catch(console.error);

        return res.status(200).json({
          success: true,
          message: 'Comment permanently deleted',
          requestId,
        });
      } else {
        // Soft delete
        comment.isDeleted = true;
        comment.deletedAt = new Date();
        comment.deletedBy = session.user.id;
        await comment.save();

        SecurityEvent.create({
          eventType: 'admin_action',
          severity: 'medium',
          userId: session.user.id,
          ipAddress: ip,
          userAgent: ua,
          metadata: {
            action: 'comment_soft_deleted',
            commentId,
          },
        }).catch(console.error);

        return res.status(200).json({
          success: true,
          message: 'Comment deleted',
          comment: {
            _id: comment._id,
            isDeleted: comment.isDeleted,
            deletedAt: comment.deletedAt,
          },
          requestId,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ METHOD NOT ALLOWED
    // ═══════════════════════════════════════════════════════════════

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  } catch (error: any) {
    console.error('Admin comment moderation error:', { requestId, error: error?.message });

    SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: `/api/admin/comments/${commentId}`,
        method: req.method,
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