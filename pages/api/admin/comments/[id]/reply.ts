// pages/api/admin/comments/[id]/reply.ts
// 🔒 ENTERPRISE v2.0 - Admin Comment Reply with XSS Protection, Rate Limiting & Full Audit Trail

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Comment from '@/models/Comment';
import SecurityEvent from '@/models/SecurityEvent';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';function requireActiveAdminOrThrow(user: any) {
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
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;
const MIN_CONTENT_LENGTH = 3;
const MAX_CONTENT_LENGTH = 1000;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const ReplySchema = z.object({
  content: z
    .string()
    .trim()
    .min(MIN_CONTENT_LENGTH, `Reply must be at least ${MIN_CONTENT_LENGTH} characters`)
    .max(MAX_CONTENT_LENGTH, `Reply cannot exceed ${MAX_CONTENT_LENGTH} characters`),
  autoApprove: z.boolean().optional().default(true),
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

undefined

/**
 * 🔒 Sanitize content to prevent XSS
 * Removes all HTML tags and dangerous characters
 */
function sanitizeContent(content: string): string {
  // Strip all HTML tags using DOMPurify
  const cleanContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: [],
  });

  // Remove control characters
  return cleanContent
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .slice(0, MAX_CONTENT_LENGTH);
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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter || 60));
    return res.status(429).json({
      success: false,
      message: `Too many requests. Please try again in ${rl.retryAfter || 60} seconds.`,
      code: 'RATE_LIMITED',
      requestId,
    });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════
    // ✅ RATE LIMITING (Stricter for replies to prevent spam)
    // ═══════════════════════════════════════════════════════════════

undefined

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUTHENTICATION & AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════

undefined

    // ═══════════════════════════════════════════════════════════════
    // ✅ VALIDATE REQUEST BODY (Zod)
    // ═══════════════════════════════════════════════════════════════

    const parseResult = ReplySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        errors: parseResult.error.flatten().fieldErrors,
        requestId,
      });
    }

    const { content, autoApprove } = parseResult.data;

    // ═══════════════════════════════════════════════════════════════
    // ✅ SANITIZE CONTENT (XSS Protection)
    // ═══════════════════════════════════════════════════════════════

    const sanitizedContent = sanitizeContent(content);

    if (sanitizedContent.length < MIN_CONTENT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is too short after sanitization',
        code: 'CONTENT_TOO_SHORT',
        requestId,
      });
    }

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

    // ✅ Cannot reply to deleted comments
    if (comment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to a deleted comment',
        code: 'COMMENT_DELETED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CREATE ADMIN REPLY
    // ═══════════════════════════════════════════════════════════════

    const reply = {
      _id: new (Comment as any).base.Types.ObjectId(),
      author: {
        name: auth.name || 'Highrise.pk Team',
        email: auth.email || 'info@highrise.pk',
        userId: auth.id,
        isAdmin: true,
      },
      content: sanitizedContent,
      createdAt: new Date(),
      ip: ip, // Track for moderation
      userAgent: ua.slice(0, 100),
    };

    comment.replies.push(reply);

    // Auto-approve parent comment if admin replies (optional)
    if (autoApprove && comment.status === 'pending') {
      comment.status = 'approved';
    }

    comment.updatedAt = new Date();
    await comment.save();

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUDIT LOG (Non-blocking)
    // ═══════════════════════════════════════════════════════════════

    SecurityEvent.create({
      eventType: 'admin_action',
      severity: 'low',
      userId: auth.id,
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        action: 'admin_reply_posted',
        commentId,
        replyId: String(reply._id),
        contentLength: sanitizedContent.length,
        autoApproved: autoApprove && comment.status === 'approved',
      },
    }).catch(() => undefined);

    // ═══════════════════════════════════════════════════════════════
    // ✅ SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════

    return res.status(201).json({
      success: true,
      message: 'Admin reply posted successfully',
      reply: {
        _id: reply._id,
        author: {
          name: reply.author.name,
          isAdmin: true,
        },
        content: reply.content,
        createdAt: reply.createdAt,
      },
      requestId,
    });
  } catch (error: unknown) {
    void SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      userId: auth.id,
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: `/api/admin/comments/${commentId}/reply`,
        errorCode: error instanceof Error ? error.message : 'UNKNOWN',
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      requestId,
    });
  }
}