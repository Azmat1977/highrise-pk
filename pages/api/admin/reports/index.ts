// pages/api/admin/reports/index.ts
// 🔒 ENTERPRISE v2.0 - Admin Reports List with RBAC, Rate Limiting, Audit, PII Protection

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Report from '@/models/Report';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import mongoose from 'mongoose';
import { requireAuth } from '@/lib/requireAuth';
import { checkPermission } from '@/lib/permissions';
import { z } from 'zod';
import { rateLimitAdmin, RateLimitResult } from '@/lib/rateLimit';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 3000;
const MAX_LIMIT = 100; // Prevent OOM attacks
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

const ALLOWED_STATUS = new Set(['open', 'reviewing', 'resolved', 'rejected']);
const ALLOWED_ENTITY_TYPES = new Set(['property', 'comment', 'user', 'developer']);

// ✅ Zod Schema for Query Validation
const QuerySchema = z.object({
  status: z.enum(['open', 'reviewing', 'resolved', 'rejected', '']).optional().default(''),
  entityType: z.enum(['property', 'comment', 'user', 'developer', '']).optional().default(''),
  page: z.coerce.number().int().min(1).max(10000).optional().default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  q: z.string().trim().max(100).optional().default(''),
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip || '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function requireActiveUserOrThrow(user: any) {
  if (!user) {
    const err: any = new Error('User not found');
    err.statusCode = 401;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  if (user.isDeleted || user.status === 'banned' || user.isActive === false) {
    const err: any = new Error('Account is restricted');
    err.statusCode = 403;
    err.code = 'ACCOUNT_RESTRICTED';
    throw err;
  }
}

function requireAdminRoleOrThrow(user: any) {
  const role = String(user?.role || 'user').toLowerCase();
  if (!['admin', 'superadmin'].includes(role)) {
    const err: any = new Error('Admin access required');
    err.statusCode = 403;
    err.code = 'ADMIN_REQUIRED';
    throw err;
  }
}

// 🔒 PII Redaction for Reports (Hide emails/phones for non-superadmins)
function redactPII(report: any, isSuperAdmin: boolean): any {
  if (isSuperAdmin) return report; // SuperAdmins see everything

  return {
    ...report,
    reporterEmail: report.reporterEmail ? `${report.reporterEmail.slice(0, 3)}***@***` : '',
    reporterPhone: report.reporterPhone ? `***${report.reporterPhone.slice(-4)}` : '',
  };
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed',
      requestId 
    });
  }

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] || '').slice(0, 200);

  try {
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUTHENTICATION & AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════

    const auth = await requireAuth(req, res);
    if (!auth) return;

    const admin: any = await User.findById(auth.id)
      .select('role status isDeleted isActive permissions')
      .lean()
      .maxTimeMS(MAX_TIME_MS);

    requireActiveUserOrThrow(admin);
    requireAdminRoleOrThrow(admin);

    const isSuperAdmin = String(admin.role).toLowerCase() === 'superadmin';

    // ✅ Permission Check
    const hasPermission = checkPermission(admin, 'reports.view');
    if (!hasPermission) {
      const err: any = new Error('You do not have permission to view reports');
      err.statusCode = 403;
      err.code = 'PERMISSION_DENIED';
      throw err;
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ RATE LIMITING (Redis-backed with fallback)
    // ═══════════════════════════════════════════════════════════════

    const rateLimitResult = await rateLimitAdmin(req);

if (!rateLimitResult.ok) {
  res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
  return res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down.',
    code: 'RATE_LIMITED',
    requestId,
  });
}

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

    const { status, entityType, page, limit, q } = parseResult.data;
    const skip = (page - 1) * limit;

    // ═══════════════════════════════════════════════════════════════
    // ✅ BUILD SECURE QUERY
    // ═══════════════════════════════════════════════════════════════

    const filter: any = {};

    // Filter by status
    if (status && ALLOWED_STATUS.has(status)) {
      filter.status = status;
    }

    // Filter by entity type
    if (entityType && ALLOWED_ENTITY_TYPES.has(entityType)) {
      filter.entityType = entityType;
    } else if (!entityType) {
      // Default to property reports (most common)
      filter.entityType = 'property';
    }

    // Search functionality
    if (q && q.length >= 2) {
      const or: any[] = [];

      // Search by ObjectId (report ID or entity ID)
      if (mongoose.Types.ObjectId.isValid(q)) {
        or.push({ _id: new mongoose.Types.ObjectId(q) });
        or.push({ entityId: new mongoose.Types.ObjectId(q) });
      }

      // Search by reason (exact enum match)
      const reasonMatch = q.toLowerCase().replace(/[^a-z_]/g, '');
      if (reasonMatch) {
        or.push({ reason: { $regex: `^${reasonMatch}`, $options: 'i' } });
      }

      // Search by reporter email (only for superadmin)
      if (isSuperAdmin && q.includes('@')) {
        or.push({ reporterEmail: { $regex: q, $options: 'i' } });
      }

      if (or.length > 0) {
        filter.$or = or;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ FETCH REPORTS (Optimized with .lean())
    // ═══════════════════════════════════════════════════════════════

    const [total, reports] = await Promise.all([
      Report.countDocuments(filter).maxTimeMS(MAX_TIME_MS),
      Report.find(filter)
        .sort({ createdAt: -1, status: 1 }) // Open reports first
        .skip(skip)
        .limit(limit)
        .select('-__v') // Exclude mongoose internal field
        .lean()
        .maxTimeMS(MAX_TIME_MS),
    ]);

    // ═══════════════════════════════════════════════════════════════
    // ✅ SANITIZE & REDACT OUTPUT
    // ═══════════════════════════════════════════════════════════════

    const sanitizedReports = (reports || []).map((r: any) => {
      const base = {
        _id: String(r._id),
        entityType: r.entityType,
        entityId: String(r.entityId),
        reason: r.reason,
        details: String(r.details || '').slice(0, 500), // Truncate long details
        reporterEmail: r.reporterEmail || '',
        reporterPhone: r.reporterPhone || '',
        reporterUserId: r.reporterUserId ? String(r.reporterUserId) : null,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };

      return redactPII(base, isSuperAdmin);
    });

    // ═══════════════════════════════════════════════════════════════
    // ✅ AUDIT LOG (Async - non-blocking)
    // ═══════════════════════════════════════════════════════════════

    SecurityEvent.create({
      eventType: 'admin.reports.viewed',
      userId: auth.id,
      metadata: {
        filters: { status, entityType, q: q ? '[redacted]' : '' },
        page,
        limit,
        totalResults: total,
      },
      ipAddress: ip,
      userAgent: ua,
      severity: 'info',
    }).catch((err) => console.error('Audit log failed:', err));

    // ═══════════════════════════════════════════════════════════════
    // ✅ RESPONSE
    // ═══════════════════════════════════════════════════════════════

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      reports: sanitizedReports,
      requestId,
    });

  } catch (error: any) {
    console.error('Admin reports list error:', { requestId, error: error?.message });

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
