// pages/api/comments/[id]/best-answer.ts
// 🔒 ENTERPRISE v2.0 - Best Answer System (Stack Overflow Style) - Property Owner/Admin Only

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import User from '@/models/User';
import Property from '@/models/Property';
import SecurityEvent from '@/models/SecurityEvent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { rateLimitComment } from '@/lib/rateLimit';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const BestAnswerSchema = z.object({
  action: z.enum(['mark', 'unmark']),
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

    const rl = await rateLimitComment(req);
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
    // ✅ AUTHENTICATION (Required)
    // ═══════════════════════════════════════════════════════════════

    const session = (await getServerSession(req, res, authOptions)) as any;

    if (!session?.user) {
      SecurityEvent.create({
        eventType: 'unauthorized_access_attempt',
        severity: 'high',
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          endpoint: `/api/comments/${commentId}/best-answer`,
          reason: 'No active session',
        },
      }).catch(console.error);

      return res.status(401).json({
        success: false,
        message: 'Authentication required. Only property owners and admins can mark best answers.',
        code: 'UNAUTHORIZED',
        requestId,
      });
    }

    const user: any = await User.findById(session.user.id)
      .select('role')
      .lean()
      .maxTimeMS(MAX_TIME_MS);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId,
      });
    }

    const isAdmin = ['admin', 'superadmin', 'moderator'].includes(String(user.role).toLowerCase());

    // ═══════════════════════════════════════════════════════════════
    // ✅ VALIDATE REQUEST BODY
    // ═══════════════════════════════════════════════════════════════

    const parseResult = BestAnswerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        errors: parseResult.error.flatten().fieldErrors,
        requestId,
      });
    }

    const { action } = parseResult.data;

    // ═══════════════════════════════════════════════════════════════
    // ✅ FETCH COMMENT WITH BLOG INFO
    // ═══════════════════════════════════════════════════════════════

    const comment: any = await Comment.findById(commentId)
      .populate('blogId', 'author')
      .maxTimeMS(MAX_TIME_MS);

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
        message: 'Cannot mark a deleted comment as best answer',
        code: 'COMMENT_DELETED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUTHORIZATION CHECK (Blog Author or Admin)
    // ═══════════════════════════════════════════════════════════════

    const blogAuthorId = comment.blogId?.author;
    const isAuthor = blogAuthorId && String(blogAuthorId) === String(session.user.id);

    if (!isAuthor && !isAdmin) {
      SecurityEvent.create({
        eventType: 'unauthorized_access_attempt',
        severity: 'medium',
        userId: session.user.id,
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          action: 'best_answer_unauthorized',
          commentId,
          blogId: String(comment.blogId?._id),
        },
      }).catch(console.error);

      return res.status(403).json({
        success: false,
        message: 'Only the blog author or admin can mark best answers',
        code: 'NOT_AUTHORIZED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ HANDLE BEST ANSWER ACTION
    // ═══════════════════════════════════════════════════════════════

    const now = new Date();

    if (action === 'mark') {
      // Check if already marked
      if (comment.isBestAnswer) {
        return res.status(400).json({
          success: false,
          message: 'Comment is already marked as best answer',
          code: 'ALREADY_BEST_ANSWER',
          requestId,
        });
      }

      // Unmark any existing best answer for this blog
      await Comment.updateMany(
        {
          blogId: comment.blogId,
          isBestAnswer: true,
          _id: { $ne: commentId },
        },
        {
          $set: {
            isBestAnswer: false,
            markedBestBy: undefined,
            markedBestAt: undefined,
          },
        }
      ).maxTimeMS(MAX_TIME_MS);

      // Mark this comment as best answer
      comment.isBestAnswer = true;
      comment.markedBestBy = session.user.id;
      comment.markedBestAt = now;
      comment.updatedAt = now;

      await comment.save();

      // Audit log
      SecurityEvent.create({
        eventType: 'comment_best_answer_marked',
        severity: 'low',
        userId: session.user.id,
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          commentId,
          blogId: String(comment.blogId?._id),
          markedBy: isAdmin ? 'admin' : 'author',
        },
      }).catch(console.error);

      return res.status(200).json({
        success: true,
        message: 'Comment marked as best answer',
        comment: {
          _id: comment._id,
          isBestAnswer: comment.isBestAnswer,
          markedBestBy: comment.markedBestBy,
          markedBestAt: comment.markedBestAt,
        },
        requestId,
      });
    }

    // action === 'unmark'
    if (!comment.isBestAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Comment is not marked as best answer',
        code: 'NOT_BEST_ANSWER',
        requestId,
      });
    }

    // Unmark the comment
    comment.isBestAnswer = false;
    comment.markedBestBy = undefined;
    comment.markedBestAt = undefined;
    comment.updatedAt = now;

    await comment.save();

    // Audit log
    SecurityEvent.create({
      eventType: 'comment_best_answer_unmarked',
      severity: 'low',
      userId: session.user.id,
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        commentId,
        blogId: String(comment.blogId?._id),
      },
    }).catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'Best answer unmarked successfully',
      comment: {
        _id: comment._id,
        isBestAnswer: comment.isBestAnswer,
      },
      requestId,
    });
  } catch (error: any) {
    console.error('Best answer error:', { requestId, error: error?.message });

    SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: `/api/comments/${commentId}/best-answer`,
        errorCode: error?.code || 'UNKNOWN',
      },
    }).catch(console.error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      requestId,
    });
  }
}