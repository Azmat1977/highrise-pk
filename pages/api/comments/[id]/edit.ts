// pages/api/comments/[id]/reply.ts
// 🔒 ENTERPRISE v2.0 - Nested Reply System with Threading, XSS Protection & Rate Limiting

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import SecurityEvent from '@/models/SecurityEvent';
import { rateLimitComment } from '@/lib/rateLimit';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;
const MIN_CONTENT_LENGTH = 3;
const MAX_CONTENT_LENGTH = 1000;
const MAX_REPLY_DEPTH = 5; // Max nesting levels
const MAX_NAME_LENGTH = 100;

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
  author: z.object({
    name: z.string().trim().min(2).max(MAX_NAME_LENGTH),
    email: z.string().email('Invalid email address'),
  }),
  parentReplyId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(), // For nested replies
  turnstileToken: z.string().optional(), // Bot protection
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

/**
 * 🔒 Sanitize content to prevent XSS
 */
function sanitizeContent(content: string): string {
  const cleanContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  return cleanContent
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .slice(0, MAX_CONTENT_LENGTH);
}

/**
 * Find the depth of a reply within nested structure
 */
function findReplyDepth(replies: any[], parentReplyId: string): number {
  for (const reply of replies) {
    if (String(reply._id) === parentReplyId) {
      return (reply.depth || 0) + 1;
    }
  }
  return 1; // Default depth if parent not found
}

/**
 * Check if reply exists in the comment
 */
function findReplyById(replies: any[], replyId: string): any | null {
  for (const reply of replies) {
    if (String(reply._id) === replyId) {
      return reply;
    }
  }
  return null;
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

  try {
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════
    // ✅ RATE LIMITING
    // ═══════════════════════════════════════════════════════════════

    const rl = await rateLimitComment(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter || 60));

      SecurityEvent.create({
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          endpoint: `/api/comments/${commentId}/reply`,
        },
      }).catch(console.error);

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.',
        code: 'RATE_LIMITED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ VALIDATE REQUEST BODY
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

    const { content, author, parentReplyId } = parseResult.data;

    // ═══════════════════════════════════════════════════════════════
    // ✅ SANITIZE CONTENT
    // ═══════════════════════════════════════════════════════════════

    const sanitizedContent = sanitizeContent(content);

    if (sanitizedContent.length < MIN_CONTENT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: 'Content is too short after sanitization',
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

    // ═══════════════════════════════════════════════════════════════
    // ✅ CHECK IF COMMENT IS DELETED
    // ═══════════════════════════════════════════════════════════════

    if (comment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to a deleted comment',
        code: 'COMMENT_DELETED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CHECK IF COMMENT IS APPROVED (Only allow replies to approved comments)
    // ═══════════════════════════════════════════════════════════════

    if (comment.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to an unapproved comment',
        code: 'COMMENT_NOT_APPROVED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CALCULATE REPLY DEPTH (For Nested Replies)
    // ═══════════════════════════════════════════════════════════════

    let replyDepth = 0;
    let parentReply: any = null;

    if (parentReplyId) {
      // This is a nested reply (reply to a reply)
      parentReply = findReplyById(comment.replies, parentReplyId);

      if (!parentReply) {
        return res.status(400).json({
          success: false,
          message: 'Parent reply not found',
          code: 'PARENT_REPLY_NOT_FOUND',
          requestId,
        });
      }

      replyDepth = (parentReply.depth || 0) + 1;

      // Check max nesting depth
      if (replyDepth > MAX_REPLY_DEPTH) {
        return res.status(400).json({
          success: false,
          message: `Maximum reply depth (${MAX_REPLY_DEPTH}) reached. Please reply to an earlier comment.`,
          code: 'MAX_DEPTH_REACHED',
          maxDepth: MAX_REPLY_DEPTH,
          requestId,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CREATE REPLY OBJECT
    // ═══════════════════════════════════════════════════════════════

    const now = new Date();
    const replyId = new mongoose.Types.ObjectId();

    const reply = {
      _id: replyId,
      parentReplyId: parentReplyId ? new mongoose.Types.ObjectId(parentReplyId) : undefined,
      depth: replyDepth,
      author: {
        name: author.name.trim().slice(0, MAX_NAME_LENGTH),
        email: author.email.toLowerCase().trim(),
        isAdmin: false,
        isVerifiedBuyer: false, // Will be checked/set by verification system
        reputation: {
          trustScore: 50,
          helpfulCommentsCount: 0,
          totalCommentsCount: 0,
        },
      },
      content: sanitizedContent,
      isEdited: false,
      editHistory: [],
      likes: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    // ═══════════════════════════════════════════════════════════════
    // ✅ ADD REPLY TO COMMENT
    // ═══════════════════════════════════════════════════════════════

    comment.replies.push(reply);
    comment.updatedAt = now;
    
    // Update engagement score
    comment.engagementScore = 
      (comment.likes?.length || 0) * 1 +
      (comment.helpfulVotes?.length || 0) * 2 +
      (comment.replies?.length || 0) * 3;

    await comment.save();

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUDIT LOG
    // ═══════════════════════════════════════════════════════════════

    SecurityEvent.create({
      eventType: 'comment_reply_added',
      severity: 'low',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        commentId,
        replyId: String(replyId),
        isNested: Boolean(parentReplyId),
        depth: replyDepth,
        contentLength: sanitizedContent.length,
      },
    }).catch(console.error);

    // ═══════════════════════════════════════════════════════════════
    // ✅ SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════

    return res.status(201).json({
      success: true,
      message: parentReplyId ? 'Nested reply added successfully' : 'Reply added successfully',
      reply: {
        _id: reply._id,
        parentReplyId: reply.parentReplyId,
        depth: reply.depth,
        author: {
          name: reply.author.name,
          isVerifiedBuyer: reply.author.isVerifiedBuyer,
        },
        content: reply.content,
        createdAt: reply.createdAt,
      },
      threading: {
        isNested: Boolean(parentReplyId),
        depth: replyDepth,
        maxDepth: MAX_REPLY_DEPTH,
        canReplyFurther: replyDepth < MAX_REPLY_DEPTH,
      },
      requestId,
    });
  } catch (error: any) {
    console.error('Reply error:', { requestId, error: error?.message });

    SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: `/api/comments/${commentId}/reply`,
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