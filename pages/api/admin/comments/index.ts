// pages/api/admin/comments/index.ts
// 🔒 ENTERPRISE v2.0 - Admin Comments List with Zod, Search, Rate Limiting & Full Audit Trail

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Comment from '@/models/Comment';
import SecurityEvent from '@/models/SecurityEvent';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;

const VALID_STATUSES = ['all', 'pending', 'approved', 'rejected', 'spam'] as const;
const VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'likes', 'reports'] as const;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  status: z.enum(VALID_STATUSES).optional().default('all'),
  reported: z.enum(['true', 'false', 'all']).optional().default('all'),
  search: z.string().max(MAX_SEARCH_LENGTH).optional().default(''),
  blogSlug: z.string().max(200).optional().default(''),
  sortBy: z.enum(VALID_SORT_FIELDS).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
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

/**
 * 🔒 ReDoS-Safe Search Sanitization
 */
function escapeRegex(input: string): string {
  return input
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
}

undefined

/**
 * 🔒 Redact PII from comment author data
 */
function redactCommentPII(comment: any, isSuperAdmin: boolean): any {
  if (isSuperAdmin) return comment; // SuperAdmins see everything

  if (comment.author?.email) {
    const email = comment.author.email;
    const [local, domain] = email.split('@');
    if (local && domain) {
      comment.author.email = `${local.slice(0, 2)}***@${domain}`;
    }
  }

  if (comment.author?.ip) {
    comment.author.ip = '***.' + comment.author.ip.split('.').pop();
  }

  return comment;
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  // ═══════════════════════════════════════════════════════════════
  // ✅ METHOD CHECK
  // ═══════════════════════════════════════════════════════════════

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  // ── Rate limit (First) ───────────────────────────────────────
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

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    // ── DB (Third) ─────────────────────────────────────────────
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

    // SuperAdmin sees full author email/IP; everyone else gets redacted PII
    const isSuperAdmin =
      String(auth.authorityRole || auth.role || '').toLowerCase() === 'superadmin';

    // ═══════════════════════════════════════════════════════════════
    // ✅ INPUT VALIDATION (Zod)
    // ═══════════════════════════════════════════════════════════════

    const parseResult = QuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        errors: parseResult.error.flatten().fieldErrors,
        requestId,
      });
    }

    const { page, limit, status, reported, search, blogSlug, sortBy, sortOrder } = parseResult.data;
    const skip = (page - 1) * limit;

    // ═══════════════════════════════════════════════════════════════
    // ✅ BUILD SECURE QUERY
    // ═══════════════════════════════════════════════════════════════

    const query: any = {
      isDeleted: { $ne: true },
    };

    // 1. Status Filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // 2. Reported Filter
    if (reported === 'true') {
      query.isReported = true;
    } else if (reported === 'false') {
      query.isReported = { $ne: true };
    }

    // 3. Blog Filter
    if (blogSlug && blogSlug.length >= 2) {
      query.blogSlug = blogSlug;
    }

    // 4. Search Filter (ReDoS-Safe)
    if (search && search.trim().length >= 2) {
      const safeSearch = escapeRegex(search);
      if (safeSearch) {
        const regex = { $regex: safeSearch, $options: 'i' };
        query.$or = [
          { 'author.name': regex },
          { content: regex },
        ];
        // Don't search by email (PII protection)
      }
    }

    // 5. Sort Options
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // ═══════════════════════════════════════════════════════════════
    // ✅ EXECUTE QUERIES (Optimized with .lean())
    // ═══════════════════════════════════════════════════════════════

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('blogId', 'title slug -_id')
        .lean()
        .maxTimeMS(MAX_TIME_MS),
      Comment.countDocuments(query).maxTimeMS(MAX_TIME_MS),
    ]);

    // ═══════════════════════════════════════════════════════════════
    // ✅ SUMMARY COUNTS (Only on first page)
    // ═══════════════════════════════════════════════════════════════

    let counts: any = null;

    if (page === 1) {
      const [allCount, pendingCount, approvedCount, rejectedCount, spamCount, reportedCount] =
        await Promise.all([
          Comment.countDocuments({ isDeleted: { $ne: true } }).maxTimeMS(MAX_TIME_MS),
          Comment.countDocuments({ isDeleted: { $ne: true }, status: 'pending' }).maxTimeMS(MAX_TIME_MS),
          Comment.countDocuments({ isDeleted: { $ne: true }, status: 'approved' }).maxTimeMS(MAX_TIME_MS),
          Comment.countDocuments({ isDeleted: { $ne: true }, status: 'rejected' }).maxTimeMS(MAX_TIME_MS),
          Comment.countDocuments({ isDeleted: { $ne: true }, status: 'spam' }).maxTimeMS(MAX_TIME_MS),
          Comment.countDocuments({ isDeleted: { $ne: true }, isReported: true }).maxTimeMS(MAX_TIME_MS),
        ]);

      counts = {
        all: allCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        spam: spamCount,
        reported: reportedCount,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ REDACT PII (Non-SuperAdmins)
    // ═══════════════════════════════════════════════════════════════

    const sanitizedComments = comments.map((comment) => redactCommentPII(comment, isSuperAdmin));

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUDIT LOG (Non-blocking, PII Redacted)
    // ═══════════════════════════════════════════════════════════════

    if (search || (status && status !== 'all') || reported === 'true' || blogSlug) {
      SecurityEvent.create({
        eventType: 'admin_action',
        severity: 'low',
        userId: auth.id,
        ipAddress: ip,
        userAgent: ua,
        metadata: {
          action: 'list_comments',
          hasSearch: Boolean(search),
          searchLength: search?.length || 0,
          filters: {
            status: status !== 'all' ? status : null,
            reported: reported !== 'all' ? reported : null,
            blogSlug: blogSlug || null,
          },
          resultCount: comments.length,
          page,
        },
      }).catch(console.error);
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════

    return res.status(200).json({
      success: true,
      comments: sanitizedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
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
        endpoint: '/api/admin/comments',
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
