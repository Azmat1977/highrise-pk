// pages/api/comments/verify-buyer.ts
// 🔒 ENTERPRISE v2.0 - Verified Buyer Badge System (Zameen.com Style)

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import Property from '@/models/Property';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

const VerifyBuyerSchema = z.object({
  commentId: ObjectIdSchema,
  propertyId: ObjectIdSchema.optional(), // Property they purchased
  manual: z.boolean().optional(), // Manual verification by admin
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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

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
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
        requestId,
      });
    }

    const admin: any = await User.findById(session.user.id)
      .select('role permissions')
      .lean()
      .maxTimeMS(MAX_TIME_MS);

    requireActiveAdminOrThrow(admin);

    // ═══════════════════════════════════════════════════════════════
    // ✅ VALIDATE REQUEST BODY
    // ═══════════════════════════════════════════════════════════════

    const parseResult = VerifyBuyerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        errors: parseResult.error.flatten().fieldErrors,
        requestId,
      });
    }

    const { commentId, propertyId, manual } = parseResult.data;

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
    // ✅ VERIFY BUYER STATUS
    // ═══════════════════════════════════════════════════════════════

    let isVerified = false;
    let verificationMethod = '';
    let verifiedPropertyId = null;

    if (manual) {
      // Manual verification by admin
      isVerified = true;
      verificationMethod = 'manual_admin';
      verifiedPropertyId = propertyId || null;
    } else if (propertyId) {
      // Check if user purchased/owns the property
      const property: any = await Property.findOne({
        _id: propertyId,
        $or: [
          { 'buyer.email': comment.author?.email }, // Has purchase record
          { owner: comment.author?.userId }, // Owns the property
        ],
      })
        .select('_id')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (property) {
        isVerified = true;
        verificationMethod = 'property_ownership';
        verifiedPropertyId = propertyId;
      }
    } else {
      // Auto-verify based on email in property records
      const userProperty: any = await Property.findOne({
        $or: [
          { 'buyer.email': comment.author?.email },
          { owner: comment.author?.userId },
        ],
        'verification.status': 'verified',
      })
        .select('_id')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (userProperty) {
        isVerified = true;
        verificationMethod = 'auto_verified';
        verifiedPropertyId = userProperty._id;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ UPDATE COMMENT
    // ═══════════════════════════════════════════════════════════════

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Unable to verify buyer status. No matching property found.',
        code: 'VERIFICATION_FAILED',
        requestId,
      });
    }

    const now = new Date();

    comment.author.isVerifiedBuyer = true;
    comment.author.verificationDate = now;
    comment.author.verifiedPropertyId = verifiedPropertyId;
    comment.updatedAt = now;

    await comment.save();

    // ═══════════════════════════════════════════════════════════════
    // ✅ UPDATE ALL COMMENTS FROM SAME USER
    // ═══════════════════════════════════════════════════════════════

    await Comment.updateMany(
      { 'author.email': comment.author.email },
      {
        $set: {
          'author.isVerifiedBuyer': true,
          'author.verificationDate': now,
          'author.verifiedPropertyId': verifiedPropertyId,
        },
      }
    ).maxTimeMS(MAX_TIME_MS);

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUDIT LOG
    // ═══════════════════════════════════════════════════════════════

    SecurityEvent.create({
      eventType: 'buyer_verified',
      severity: 'low',
      userId: session.user.id,
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        commentId,
        email: comment.author.email,
        verificationMethod,
        propertyId: verifiedPropertyId ? String(verifiedPropertyId) : null,
      },
    }).catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'Buyer verified successfully',
      verification: {
        isVerifiedBuyer: true,
        verificationDate: now,
        verificationMethod,
        propertyId: verifiedPropertyId,
      },
      requestId,
    });
  } catch (error: any) {
    console.error('Verify buyer error:', { requestId, error: error?.message });

    SecurityEvent.create({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        endpoint: '/api/comments/verify-buyer',
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
