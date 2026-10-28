// pages/api/comments/[id]/like.ts
// 🔒 ENTERPRISE v2.0 - Like/Dislike System with Atomic Operations & Guest Tracking

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Comment from '@/models/Comment';
import SecurityEvent from '@/models/SecurityEvent';
import { rateLimitComment } from '@/lib/rateLimit';
import { z } from 'zod';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;
const VALID_ACTIONS = ['like', 'dislike', 'remove'] as const;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const LikeSchema = z.object({
  action: z.enum(VALID_ACTIONS),
  email: z.string().email('Invalid email address').optional(), // For guest tracking
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
 * Create unique identifier for guest users (IP + Email hash)
 */
function createGuestIdentifier(ip: string, email?: string): string {
  const source = email ? `${ip}:${email}` : ip;
  return crypto
    .createHash('sha256')
    .update(source)
    .digest('hex')
    .slice(0, 24);
}

/**
 * Convert to mongoose ObjectId
 */
function toObjectId(identifier: string): mongoose.Types.ObjectId {
  const paddedId = identifier.padEnd(24, '0');
  return new mongoose.Types.ObjectId(paddedId);
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

    const parseResult = LikeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        errors: parseResult.error.flatten().fieldErrors,
        requestId,
      });
    }

    const { action, email } = parseResult.data;

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
        message: 'Cannot like a deleted comment',
        code: 'COMMENT_DELETED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CREATE USER IDENTIFIER
    // ═══════════════════════════════════════════════════════════════

    const guestId = createGuestIdentifier(ip, email);
    const userId = toObjectId(guestId);
    const userIdStr = String(userId);

    // Initialize arrays if they don't exist
    if (!comment.likes) comment.likes = [];
    if (!comment.dislikes) comment.dislikes = [];

    // Convert to strings for comparison
    const likeIds = comment.likes.map((id: any) => String(id));
    const dislikeIds = comment.dislikes.map((id: any) => String(id));

    const hasLiked = likeIds.includes(userIdStr);
    const hasDisliked = dislikeIds.includes(userIdStr);

    // ═══════════════════════════════════════════════════════════════
    // ✅ HANDLE ACTION
    // ═══════════════════════════════════════════════════════════════

    let updateOperation: any = {};
    let message = '';
    let actionTaken = '';

    if (action === 'like') {
      if (hasLiked) {
        // Toggle off (remove like)
        updateOperation = { $pull: { likes: userId } };
        message = 'Like removed';
        actionTaken = 'like_removed';
      } else {
        // Add like (remove dislike if exists)
        updateOperation = {
          $addToSet: { likes: userId },
          $pull: { dislikes: userId },
        };
        message = 'Comment liked';
        actionTaken = 'liked';
      }
    } else if (action === 'dislike') {
      if (hasDisliked) {
        // Toggle off (remove dislike)
        updateOperation = { $pull: { dislikes: userId } };
        message = 'Dislike removed';
        actionTaken = 'dislike_removed';
      } else {
        // Add dislike (remove like if exists)
        updateOperation = {
          $addToSet: { dislikes: userId },
          $pull: { likes: userId },
        };
        message = 'Comment disliked';
        actionTaken = 'disliked';
      }
    } else if (action === 'remove') {
      // Remove both like and dislike
      updateOperation = {
        $pull: {
          likes: userId,
          dislikes: userId,
        },
      };
      message = 'Vote removed';
      actionTaken = 'removed';
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ ATOMIC UPDATE
    // ═══════════════════════════════════════════════════════════════

    const updatedComment: any = await Comment.findByIdAndUpdate(
      commentId,
      updateOperation,
      { new: true }
    )
      .select('likes dislikes')
      .lean()
      .maxTimeMS(MAX_TIME_MS);

    if (!updatedComment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
        code: 'NOT_FOUND',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUDIT LOG (Non-blocking)
    // ═══════════════════════════════════════════════════════════════

    void SecurityEvent.create({
      eventType: 'comment_vote',
      severity: 'low',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        commentId,
        action: actionTaken,
        previousState: {
          hasLiked,
          hasDisliked,
        },
      },
    });

    // ═══════════════════════════════════════════════════════════════
    // ✅ SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════

    const likeCount = updatedComment.likes?.length || 0;
    const dislikeCount = updatedComment.dislikes?.length || 0;

    return res.status(200).json({
      success: true,
      message,
      action: actionTaken,
      stats: {
        likes: likeCount,
        dislikes: dislikeCount,
        netScore: likeCount - dislikeCount,
      },
      userState: {
        hasLiked: updatedComment.likes?.some((id: any) => String(id) === userIdStr) || false,
        hasDisliked: updatedComment.dislikes?.some((id: any) => String(id) === userIdStr) || false,
      },
      requestId,
    });
  } catch (error: unknown) {
    void SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: `/api/comments/${commentId}/like`,
        errorCode: 'UNKNOWN',
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