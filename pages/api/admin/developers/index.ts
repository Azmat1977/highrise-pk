// pages/api/admin/developers/index.ts
// 🔒 ENTERPRISE v3.0 — Admin Developer List
// Fixes: requireAdmin, logSecurityEvent, crypto.randomUUID,
//        @/lib/dbConnect, no console.*, proper types, valid enums

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import DeveloperProfile from '@/models/DeveloperProfile';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS        = 5000;
const DEFAULT_LIMIT      = 20;
const MAX_LIMIT          = 100;
const MAX_SEARCH_LENGTH  = 100;

const VALID_STATUSES     = [
  'all', 'pending', 'approved', 'rejected', 'suspended',
] as const;

const VALID_SORT_FIELDS  = [
  'createdAt', 'updatedAt', 'companyName', 'status',
] as const;

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPES
// ═══════════════════════════════════════════════════════════════

type ValidStatus    = typeof VALID_STATUSES[number];
type ValidSortField = typeof VALID_SORT_FIELDS[number];

interface QueryParams {
  page:      number;
  limit:     number;
  status:    ValidStatus;
  deleted:   'true' | 'false';
  search:    string;
  sortBy:    ValidSortField;
  sortOrder: 'asc' | 'desc';
}

interface DeveloperFilter {
  isDeleted?: boolean | { $ne: boolean };
  status?:    string;
  $or?:       Array<Record<string, { $regex: string; $options: string }>>;
}

interface StatusCounts {
  all:       number;
  pending:   number;
  approved:  number;
  rejected:  number;
  suspended: number;
  trash:     number;
}

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════

const QuerySchema = z.object({
  page:      z.coerce.number().int().min(1).max(10000)
               .optional().default(1),
  limit:     z.coerce.number().int().min(1).max(MAX_LIMIT)
               .optional().default(DEFAULT_LIMIT),
  status:    z.enum(VALID_STATUSES).optional().default('all'),
  deleted:   z.enum(['true', 'false']).optional().default('false'),
  search:    z.string().max(MAX_SEARCH_LENGTH).optional().default(''),
  sortBy:    z.enum(VALID_SORT_FIELDS).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ═══════════════════════════════════════════════════════════════
// 🔒 FIELD PROJECTION — Admin list summary (no encrypted fields)
// ═══════════════════════════════════════════════════════════════

const ADMIN_LIST_PROJECTION = {
  _id:               1,
  companyName:       1,
  slug:              1,
  status:            1,
  verificationLevel: 1,
  isVerified:        1,
  city:              1,
  logoUrl:           1,
  createdAt:         1,
  updatedAt:         1,
  isDeleted:         1,
  deletedAt:         1,
  // Explicitly excluded — never travel the wire in list view:
  // ntnEncrypted, secpEncrypted, ntnHash, secpHash (already select:false in model)
  // phone, whatsapp, authorizedPersonCnic — detail view only
} as const;

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',                requestId);
  res.setHeader('Content-Type',                'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options',      'nosniff');
  res.setHeader('X-Frame-Options',             'DENY');
  res.setHeader('Cache-Control',               'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy',             'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security',   'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy',          'geolocation=(), microphone=(), camera=()');
}

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

/**
 * ReDoS-safe regex escaping.
 * Strips control characters, escapes special chars, trims whitespace.
 */
function escapeRegex(input: string): string {
  return input
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {

  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  // ── Method guard ────────────────────────────────────────────
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    void res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
    return;
  }

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);

  // ── Rate limit (First — before DB) ──────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    void res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down.',
      code:    'RATE_LIMITED',
      requestId,
    });
    return;
  }

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── DB (Third) ───────────────────────────────────────────────
  await dbConnect();

  // ── Input validation ─────────────────────────────────────────
  const parseResult = QuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    void res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      code:    'VALIDATION_ERROR',
      errors:  parseResult.error.flatten().fieldErrors,
      requestId,
    });
    return;
  }

  const {
    page,
    limit,
    status,
    deleted,
    search,
    sortBy,
    sortOrder,
  }: QueryParams = parseResult.data;

  const skip = (page - 1) * limit;

  try {
    // ── Build query ────────────────────────────────────────────
    const query: DeveloperFilter = {};

    if (deleted === 'true') {
      query.isDeleted = true;
    } else {
      query.isDeleted = { $ne: true };
      if (status !== 'all') {
        query.status = status;
      }
    }

    // Search — minimum 2 chars, ReDoS-safe
    if (search.trim().length >= 2) {
      const safeSearch = escapeRegex(search);
      if (safeSearch) {
        const regex = { $regex: safeSearch, $options: 'i' };
        query.$or = [
          { companyName: regex },
          { city:        regex },
          { description: regex },
          // ✅ phone/email NOT searched — PII protection
          //    Admin can use exact lookups in [developerId] detail view
        ];
      }
    }

    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // ── Execute queries ────────────────────────────────────────
    const [developers, total] = await Promise.all([
      DeveloperProfile.find(query)
        .select(ADMIN_LIST_PROJECTION)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')   // admin needs email for identity
        .lean()
        .maxTimeMS(MAX_TIME_MS),

      DeveloperProfile.countDocuments(query)
        .maxTimeMS(MAX_TIME_MS),
    ]);

    // ── Summary counts (first page only — performance) ─────────
    let counts: StatusCounts | null = null;

    if (page === 1) {
      const [all, pending, approved, rejected, suspended, trash] =
        await Promise.all([
          DeveloperProfile.countDocuments({ isDeleted: { $ne: true } })
            .maxTimeMS(MAX_TIME_MS),
          DeveloperProfile.countDocuments({ status: 'pending',   isDeleted: { $ne: true } })
            .maxTimeMS(MAX_TIME_MS),
          DeveloperProfile.countDocuments({ status: 'approved',  isDeleted: { $ne: true } })
            .maxTimeMS(MAX_TIME_MS),
          DeveloperProfile.countDocuments({ status: 'rejected',  isDeleted: { $ne: true } })
            .maxTimeMS(MAX_TIME_MS),
          DeveloperProfile.countDocuments({ status: 'suspended', isDeleted: { $ne: true } })
            .maxTimeMS(MAX_TIME_MS),
          DeveloperProfile.countDocuments({ isDeleted: true })
            .maxTimeMS(MAX_TIME_MS),
        ]);

      counts = { all, pending, approved, rejected, suspended, trash };
    }

    // ── Audit log — ALL admin list views (enterprise compliance)
    void logSecurityEvent({
      type:      'admin_action',
      severity:  'low',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:       'admin_list_developers',
        page,
        limit,
        resultCount:  developers.length,
        totalMatched: total,
        filters: {
          status:  status !== 'all' ? status : null,
          deleted,
          hasSearch: search.trim().length >= 2,
        },
        requestId,
      },
    });

    // ── Success response ───────────────────────────────────────
    void res.status(200).json({
      success: true,
      developers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      counts,
      requestId,
    });

  } catch (error: unknown) {
    // ── Error audit — must await in catch ──────────────────────
    await logSecurityEvent({
      type:      'admin_action',
      severity:  'high',
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:    'admin_list_developers_error',
        errorCode: error instanceof Error ? error.message : 'UNKNOWN',
        requestId,
      },
    });

    void res.status(500).json({
      success: false,
      message: 'Internal server error',
      code:    'SERVER_ERROR',
      requestId,
    });
  }
}