// pages/api/comments/index.ts
// 🔒 ENTERPRISE v2.0 - Advanced Comment System with Multi-Tier Sorting, Verified Badges & Threading

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import SecurityEvent from '@/models/SecurityEvent';
import { rateLimitComment } from '@/lib/rateLimit';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_CONTENT_LENGTH = 3;
const MAX_CONTENT_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;

// ✅ Advanced Sort Options (Zameen.com + Stack Overflow style)
const VALID_SORT_OPTIONS = [
  'newest',        // Most recent first
  'oldest',        // Oldest first
  'top',           // Most likes
  'helpful',       // Most helpful votes (Amazon style)
  'verified',      // Verified buyers first, then newest
  'best-answer',   // Best answer first, then top
  'trending',      // High engagement (likes + replies + helpful)
] as const;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const GetCommentsSchema = z.object({
  blogSlug: z.string().trim().min(1).max(200),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  sortBy: z.enum(VALID_SORT_OPTIONS).optional().default('newest'),
  status: z.enum(['pending', 'approved', 'rejected', 'spam', 'all']).optional().default('approved'),
});

const PostCommentSchema = z.object({
  blogSlug: z.string().trim().min(1).max(200),
  blogId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid blog ID'),
  content: z
    .string()
    .trim()
    .min(MIN_CONTENT_LENGTH, `Comment must be at least ${MIN_CONTENT_LENGTH} characters`)
    .max(MAX_CONTENT_LENGTH, `Comment cannot exceed ${MAX_CONTENT_LENGTH} characters`),
  author: z.object({
    name: z.string().trim().min(2).max(MAX_NAME_LENGTH),
    email: z.string().email('Invalid email address'),
  }),
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
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
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
 * Create unique identifier for guest users
 */
function createGuestIdentifier(ip: string, email: string): string {
  return crypto
    .createHash('sha256')
    .update(`${ip}:${email}`)
    .digest('hex')
    .slice(0, 24);
}

/**
 * Get sort pipeline based on sortBy option
 */
function getSortPipeline(sortBy: string): Record<string, 1 | -1> {
  switch (sortBy) {
    case 'newest':
      return { createdAt: -1 };
    
    case 'oldest':
      return { createdAt: 1 };
    
    case 'top':
      // Sort by like count (array length)
      return { 'likes.length': -1, createdAt: -1 };
    
    case 'helpful':
      // Sort by helpful votes (Amazon style)
      return { 'helpfulVotes.length': -1, createdAt: -1 };
    
    case 'verified':
      // Verified buyers first, then newest
      return { 'author.isVerifiedBuyer': -1, createdAt: -1 };
    
    case 'best-answer':
      // Best answer first, then by helpful votes
      return { isBestAnswer: -1, 'helpfulVotes.length': -1, createdAt: -1 };
    
    case 'trending':
      // High engagement score (calculated in model)
      return { engagementScore: -1, createdAt: -1 };
    
    default:
      return { createdAt: -1 };
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

  try {
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════
    // ✅ GET METHOD - FETCH COMMENTS WITH ADVANCED SORTING
    // ═══════════════════════════════════════════════════════════════

    if (req.method === 'GET') {
      // Validate query params
      const parseResult = GetCommentsSchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          errors: parseResult.error.flatten().fieldErrors,
          requestId,
        });
      }

      const { blogSlug, page, limit, sortBy, status } = parseResult.data;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {
        blogSlug,
        isDeleted: { $ne: true },
      };

      // Status filter (public sees only approved)
      if (status === 'all') {
        // Admin view - no status filter
      } else {
        query.status = status;
      }

      // Get sort pipeline
      const sortPipeline = getSortPipeline(sortBy);

      // ═══════════════════════════════════════════════════════════════
      // ✅ FETCH COMMENTS WITH SORTING
      // ═══════════════════════════════════════════════════════════════

      const [comments, total, pinnedComments] = await Promise.all([
        Comment.find(query)
          .sort(sortPipeline)
          .skip(skip)
          .limit(limit)
          .lean()
          .maxTimeMS(MAX_TIME_MS),
        Comment.countDocuments(query).maxTimeMS(MAX_TIME_MS),
        // Get pinned comments separately (always show at top)
        Comment.find({
          blogSlug,
          isPinned: true,
          isDeleted: { $ne: true },
          status: 'approved',
        })
          .sort({ pinnedAt: -1 })
          .limit(3)
          .lean()
          .maxTimeMS(MAX_TIME_MS),
      ]);

      // ═══════════════════════════════════════════════════════════════
      // ✅ CALCULATE STATS FOR FRONTEND
      // ═══════════════════════════════════════════════════════════════

      const stats = {
        totalComments: total,
        pinnedCount: pinnedComments.length,
        verifiedCount: await Comment.countDocuments({
          blogSlug,
          'author.isVerifiedBuyer': true,
          isDeleted: { $ne: true },
          status: 'approved',
        }).maxTimeMS(MAX_TIME_MS),
        hasBestAnswer: await Comment.exists({
          blogSlug,
          isBestAnswer: true,
          isDeleted: { $ne: true },
        }),
      };

      // ═══════════════════════════════════════════════════════════════
      // ✅ FORMAT COMMENTS FOR RESPONSE
      // ═══════════════════════════════════════════════════════════════

      const formatComment = (c: any) => ({
        _id: c._id,
        content: c.content,
        author: {
          name: c.author?.name,
          isVerifiedBuyer: c.author?.isVerifiedBuyer || false,
          verificationDate: c.author?.verificationDate,
          reputation: c.author?.reputation,
        },
        status: c.status,
        likes: c.likes?.length || 0,
        dislikes: c.dislikes?.length || 0,
        helpfulVotes: c.helpfulVotes?.length || 0,
        notHelpfulVotes: c.notHelpfulVotes?.length || 0,
        netScore: (c.likes?.length || 0) - (c.dislikes?.length || 0),
        replies: c.replies?.length || 0,
        isPinned: c.isPinned || false,
        pinnedReason: c.pinnedReason,
        isBestAnswer: c.isBestAnswer || false,
        isEdited: c.isEdited || false,
        editedAt: c.editedAt,
        engagementScore: c.engagementScore || 0,
        createdAt: c.createdAt,
      });

      return res.status(200).json({
        success: true,
        comments: comments.map(formatComment),
        pinnedComments: pinnedComments.map(formatComment),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats,
        sorting: {
          current: sortBy,
          available: VALID_SORT_OPTIONS,
        },
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ POST METHOD - CREATE NEW COMMENT
    // ═══════════════════════════════════════════════════════════════

    if (req.method === 'POST') {
      // Rate limiting
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

      // Validate request body
      const parseResult = PostCommentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          errors: parseResult.error.flatten().fieldErrors,
          requestId,
        });
      }

      const { blogSlug, blogId, content, author } = parseResult.data;

      // Sanitize content
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
      // ✅ CREATE COMMENT
      // ═══════════════════════════════════════════════════════════════

      const now = new Date();
      const editDeadline = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

      const newComment = await Comment.create({
        blogId,
        blogSlug,
        author: {
          name: author.name.trim().slice(0, MAX_NAME_LENGTH),
          email: author.email.toLowerCase().trim(),
          isAdmin: false,
          isVerifiedBuyer: false, // Will be verified separately
          reputation: {
            trustScore: 50,
            helpfulCommentsCount: 0,
            totalCommentsCount: 0,
          },
        },
        content: sanitizedContent,
        status: 'pending', // Auto-approve can be added later
        likes: [],
        dislikes: [],
        helpfulVotes: [],
        notHelpfulVotes: [],
        replies: [],
        isEdited: false,
        editHistory: [],
        editDeadline,
        attachments: [],
        isPinned: false,
        isBestAnswer: false,
        mentions: [],
        isReported: false,
        reportCount: 0,
        reportReasons: [],
        isDeleted: false,
        viewCount: 0,
        engagementScore: 0,
        depth: 0,
        threadPath: 'root',
        createdAt: now,
        updatedAt: now,
      });

      // ═══════════════════════════════════════════════════════════════
      // ✅ AUDIT LOG
      // ═══════════════════════════════════════════════════════════════

      SecurityEvent.create({
        eventType: 'comment_created',
        severity: 'low',
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          commentId: String(newComment._id),
          blogSlug,
          contentLength: sanitizedContent.length,
        },
      }).catch(console.error);

      return res.status(201).json({
        success: true,
        message: 'Comment submitted successfully. It will be visible after moderation.',
        comment: {
          _id: newComment._id,
          status: newComment.status,
          editDeadline: newComment.editDeadline,
          canEdit: true,
        },
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ METHOD NOT ALLOWED
    // ═══════════════════════════════════════════════════════════════

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  } catch (error: any) {
    console.error('Comments API error:', { requestId, error: error?.message });

    SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: '/api/comments',
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
