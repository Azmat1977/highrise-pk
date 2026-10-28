// pages/api/comments/[id]/helpful.ts
// 🔒 ENTERPRISE v2.0 - Helpful/Not Helpful Voting System (Amazon/Stack Overflow Style)

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
const VALID_VOTE_TYPES = ['helpful', 'not-helpful'] as const;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const VoteSchema = z.object({
  voteType: z.enum(VALID_VOTE_TYPES),
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
    .slice(0, 24); // Make it look like ObjectId
}

/**
 * Convert to mongoose ObjectId (for consistent storage)
 */
function toObjectId(identifier: string): mongoose.Types.ObjectId {
  // Pad to 24 chars if needed
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

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE']);
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
        message: 'Cannot vote on a deleted comment',
        code: 'COMMENT_DELETED',
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ POST METHOD - ADD VOTE
    // ═══════════════════════════════════════════════════════════════

    if (req.method === 'POST') {
      // Validate request body
      const parseResult = VoteSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          errors: parseResult.error.flatten().fieldErrors,
          requestId,
        });
      }

      const { voteType, email } = parseResult.data;

      // Create unique voter identifier
      const guestId = createGuestIdentifier(ip, email);
      const voterId = toObjectId(guestId);

      // Initialize arrays if they don't exist
      if (!comment.helpfulVotes) comment.helpfulVotes = [];
      if (!comment.notHelpfulVotes) comment.notHelpfulVotes = [];

      // Convert to ObjectId arrays for comparison
      const helpfulVoteIds = comment.helpfulVotes.map((id: any) => String(id));
      const notHelpfulVoteIds = comment.notHelpfulVotes.map((id: any) => String(id));
      const voterIdStr = String(voterId);

      // Check if user already voted
      const hasVotedHelpful = helpfulVoteIds.includes(voterIdStr);
      const hasVotedNotHelpful = notHelpfulVoteIds.includes(voterIdStr);

      if (voteType === 'helpful') {
        if (hasVotedHelpful) {
          // Already voted helpful - remove vote (toggle off)
          comment.helpfulVotes = comment.helpfulVotes.filter(
            (id: any) => String(id) !== voterIdStr
          );

          await comment.save();

          return res.status(200).json({
            success: true,
            message: 'Helpful vote removed',
            action: 'removed',
            stats: {
              helpfulCount: comment.helpfulVotes.length,
              notHelpfulCount: comment.notHelpfulVotes.length,
              netScore: comment.helpfulVotes.length - comment.notHelpfulVotes.length,
            },
            requestId,
          });
        }

        // Remove from not helpful if exists
        if (hasVotedNotHelpful) {
          comment.notHelpfulVotes = comment.notHelpfulVotes.filter(
            (id: any) => String(id) !== voterIdStr
          );
        }

        // Add to helpful (atomic operation)
        await Comment.findByIdAndUpdate(
          commentId,
          {
            $addToSet: { helpfulVotes: voterId },
            $pull: { notHelpfulVotes: voterId },
          },
          { new: true }
        ).maxTimeMS(MAX_TIME_MS);

        // Reload comment to get updated counts
        const updatedComment: any = await Comment.findById(commentId)
          .select('helpfulVotes notHelpfulVotes')
          .lean()
          .maxTimeMS(MAX_TIME_MS);

        // Audit log
        void SecurityEvent.create({
          eventType: 'comment_vote_helpful',
          severity: 'low',
          ipAddress: ip,
          userAgent: ua,
          metadata: {
            commentId,
            previousVote: hasVotedNotHelpful ? 'not-helpful' : null,
          },
        });

        return res.status(200).json({
          success: true,
          message: 'Marked as helpful',
          action: 'added',
          stats: {
            helpfulCount: updatedComment.helpfulVotes?.length || 0,
            notHelpfulCount: updatedComment.notHelpfulVotes?.length || 0,
            netScore: (updatedComment.helpfulVotes?.length || 0) - (updatedComment.notHelpfulVotes?.length || 0),
          },
          requestId,
        });
      }

      // voteType === 'not-helpful'
      if (hasVotedNotHelpful) {
        // Already voted not helpful - remove vote (toggle off)
        comment.notHelpfulVotes = comment.notHelpfulVotes.filter(
          (id: any) => String(id) !== voterIdStr
        );

        await comment.save();

        return res.status(200).json({
          success: true,
          message: 'Not helpful vote removed',
          action: 'removed',
          stats: {
            helpfulCount: comment.helpfulVotes.length,
            notHelpfulCount: comment.notHelpfulVotes.length,
            netScore: comment.helpfulVotes.length - comment.notHelpfulVotes.length,
          },
          requestId,
        });
      }

      // Remove from helpful if exists
      if (hasVotedHelpful) {
        comment.helpfulVotes = comment.helpfulVotes.filter(
          (id: any) => String(id) !== voterIdStr
        );
      }

      // Add to not helpful (atomic operation)
      await Comment.findByIdAndUpdate(
        commentId,
        {
          $addToSet: { notHelpfulVotes: voterId },
          $pull: { helpfulVotes: voterId },
        },
        { new: true }
      ).maxTimeMS(MAX_TIME_MS);

      // Reload comment to get updated counts
      const updatedComment: any = await Comment.findById(commentId)
        .select('helpfulVotes notHelpfulVotes')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      // Audit log
      void SecurityEvent.create({
        eventType: 'comment_vote_not_helpful',
        severity: 'low',
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          commentId,
          previousVote: hasVotedHelpful ? 'helpful' : null,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Marked as not helpful',
        action: 'added',
        stats: {
          helpfulCount: updatedComment.helpfulVotes?.length || 0,
          notHelpfulCount: updatedComment.notHelpfulVotes?.length || 0,
          netScore: (updatedComment.helpfulVotes?.length || 0) - (updatedComment.notHelpfulVotes?.length || 0),
        },
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ DELETE METHOD - REMOVE VOTE
    // ═══════════════════════════════════════════════════════════════

    if (req.method === 'DELETE') {
      const email = req.body?.email;
      const guestId = createGuestIdentifier(ip, email);
      const voterId = toObjectId(guestId);
      const voterIdStr = String(voterId);

      // Remove from both arrays
      await Comment.findByIdAndUpdate(
        commentId,
        {
          $pull: {
            helpfulVotes: voterId,
            notHelpfulVotes: voterId,
          },
        },
        { new: true }
      ).maxTimeMS(MAX_TIME_MS);

      // Reload comment to get updated counts
      const updatedComment: any = await Comment.findById(commentId)
        .select('helpfulVotes notHelpfulVotes')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      return res.status(200).json({
        success: true,
        message: 'Vote removed',
        stats: {
          helpfulCount: updatedComment.helpfulVotes?.length || 0,
          notHelpfulCount: updatedComment.notHelpfulVotes?.length || 0,
          netScore: (updatedComment.helpfulVotes?.length || 0) - (updatedComment.notHelpfulVotes?.length || 0),
        },
        requestId,
      });
    }
  } catch (error: unknown) {
    void SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: `/api/comments/${commentId}/helpful`,
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