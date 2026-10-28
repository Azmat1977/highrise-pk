// pages/api/admin/users/index.ts
// Admin Users List API — V4.1 Compliant
// GET — paginated list with counts, search, role/status/kyc filters
// PII masked in list response (full available via detail endpoint)
// Plain `cnic` field excluded — uses encrypted cnicStatus only

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TIME_MS = 5000;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;

// Per V4.1 Option A — only 4 valid roles for filtering/promotion
const VALID_ROLES_STRICT = ['user', 'agent', 'developer', 'admin'] as const;

// Legacy roles in schema — shown for visibility but never assigned
const ALL_SCHEMA_ROLES = [
  'user', 'reader', 'writer', 'editor', 'developer', 'agent', 'admin',
] as const;

const VALID_STATUSES = ['all', 'active', 'pending', 'suspended', 'banned'] as const;
const VALID_KYC_STATUSES = ['all', 'none', 'pending', 'verified', 'rejected'] as const;
const VALID_SORT_FIELDS = ['createdAt', 'lastLoginAt', 'name', 'email', 'role', 'status', 'updatedAt'] as const;

// Fields excluded from response — security + PII
const EXCLUDED_FIELDS = [
  '-password',
  '-resetToken',
  '-resetTokenExpiry',
  '-cnic',                          // plain CNIC — banned for exposure
  '-cnicEnc',
  '-cnicHash',
  '-security.passwordHistory',
  '-security.resetCodeHash',
  '-twoFactorAuth.secret',
  '-twoFactorAuth.backupCodes',
  '-securityQuestions.answerHash',
].join(' ');

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const QuerySchema = z.object({
  page:      z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit:     z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  status:    z.enum(VALID_STATUSES).optional().default('all'),
  role:      z.string().max(100).optional().default('all'),
  deleted:   z.enum(['true', 'false']).optional().default('false'),
  search:    z.string().max(MAX_SEARCH_LENGTH).optional().default(''),
  sortBy:    z.enum(VALID_SORT_FIELDS).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  kycStatus: z.enum(VALID_KYC_STATUSES).optional().default('all'),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserListDoc {
  _id:               unknown;
  name?:             string;
  displayName?:      string;
  email?:            string;
  phone?:            string;
  role?:             string;
  status?:           string;
  accountType?:      string;
  city?:             string;
  country?:          string;
  isVerified?:       boolean;
  isDeleted?:        boolean;
  cnicStatus?:       string;
  profilePictureUrl?: string;
  createdAt?:        Date;
  lastLoginAt?:      Date;
  deletedAt?:        Date;
  statusReason?:     string;
}

interface MaskedUser {
  _id:               string;
  name:              string;
  displayName:       string;
  emailMasked:       string;
  phoneMasked:       string;
  role:              string;
  status:            string;
  accountType:       string;
  city:              string;
  country:           string;
  isVerified:        boolean;
  isDeleted:         boolean;
  cnicStatus:        string;
  profilePictureUrl: string;
  createdAt:         string;
  lastLoginAt:       string | null;
  deletedAt:         string | null;
  statusReason:      string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip || '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function escapeRegex(input: string): string {
  return input
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
}

function parseRoles(roleStr: string): string[] {
  if (!roleStr || roleStr === 'all') return [];
  const valid = new Set<string>(ALL_SCHEMA_ROLES);
  return roleStr
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter((r) => valid.has(r));
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '';
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '****';
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

function maskUser(u: UserListDoc): MaskedUser {
  return {
    _id:               String(u._id),
    name:              u.name ?? '',
    displayName:       u.displayName ?? '',
    emailMasked:       maskEmail(u.email ?? ''),
    phoneMasked:       maskPhone(u.phone ?? ''),
    role:              u.role ?? 'user',
    status:            u.status ?? 'active',
    accountType:       u.accountType ?? 'individual',
    city:              u.city ?? '',
    country:           u.country ?? 'Pakistan',
    isVerified:        Boolean(u.isVerified),
    isDeleted:         Boolean(u.isDeleted),
    cnicStatus:        u.cnicStatus ?? 'none',
    profilePictureUrl: u.profilePictureUrl ?? '',
    createdAt:         u.createdAt ? u.createdAt.toISOString() : '',
    lastLoginAt:       u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    deletedAt:         u.deletedAt ? u.deletedAt.toISOString() : null,
    statusReason:      u.statusReason ?? '',
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ success: false, message: 'Method not allowed', requestId });
    return;
  }

  const ip = getClientIp(req);

  try {
    // ── Rate limit ─────────────────────────────────────────────────────────
    const rl = await rateLimitAdmin(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
      res.status(429).json({ success: false, message: 'Too many requests', code: 'RATE_LIMITED', requestId });
      return;
    }

    // ── Admin auth ──────────────────────────────────────────────────────────
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    // ── Validate query ──────────────────────────────────────────────────────
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        code:    'VALIDATION_ERROR',
        errors:  parsed.error.flatten().fieldErrors,
        requestId,
      });
      return;
    }

    const { page, limit, status, role, deleted, search, sortBy, sortOrder, kycStatus } = parsed.data;
    const skip = (page - 1) * limit;

    // ── DB connect ──────────────────────────────────────────────────────────
    await dbConnect();

    // ── Build query ─────────────────────────────────────────────────────────
    const query: Record<string, unknown> = {};

    if (deleted === 'true') {
      query.isDeleted = true;
    } else {
      query.isDeleted = { $ne: true };
      if (status !== 'all') {
        if (status === 'active') {
          query.$or = [{ status: 'active' }, { status: { $exists: false } }];
        } else {
          query.status = status;
        }
      }
    }

    const parsedRoles = parseRoles(role);
    if (parsedRoles.length > 0) {
      query.role = { $in: parsedRoles };
    }

    if (kycStatus !== 'all') {
      query.cnicStatus = kycStatus;
    }

    if (search && search.trim().length >= 2) {
      const safe = escapeRegex(search);
      if (safe) {
        const regex = { $regex: safe, $options: 'i' };
        const searchConditions = [
          { name:        regex },
          { displayName: regex },
          { email:       regex },
          { phone:       regex },
          { city:        regex },
          { slug:        regex },
        ];
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: searchConditions }];
          delete query.$or;
        } else {
          query.$or = searchConditions;
        }
      }
    }

    // ── Sort ────────────────────────────────────────────────────────────────
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // ── Execute list + total ────────────────────────────────────────────────
    const [rawUsers, total] = await Promise.all([
      User.find(query)
        .select(EXCLUDED_FIELDS)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(MAX_TIME_MS),
      User.countDocuments(query).maxTimeMS(MAX_TIME_MS),
    ]);

    const users = (rawUsers as unknown as UserListDoc[]).map(maskUser);

    // ── Aggregated counts (only on first page) ──────────────────────────────
    let counts:     Record<string, number> | null = null;
    let roleCounts: Record<string, number> | null = null;
    let kycCounts:  Record<string, number> | null = null;

    if (page === 1) {
      const baseQuery = { isDeleted: { $ne: true } };

      const aggregateRaw = await User.aggregate([
        { $match: baseQuery },
        {
          $facet: {
            statusCounts: [
              { $group: { _id: { $ifNull: ['$status', 'active'] }, count: { $sum: 1 } } },
            ],
            roleCounts: [
              { $group: { _id: { $ifNull: ['$role', 'user'] }, count: { $sum: 1 } } },
            ],
            kycCounts: [
              { $group: { _id: { $ifNull: ['$cnicStatus', 'none'] }, count: { $sum: 1 } } },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ]).option({ maxTimeMS: MAX_TIME_MS });

      const aggregateResult = aggregateRaw[0] as {
        statusCounts?: Array<{ _id: string; count: number }>;
        roleCounts?:   Array<{ _id: string; count: number }>;
        kycCounts?:    Array<{ _id: string; count: number }>;
        total?:        Array<{ count: number }>;
      } | undefined;

      const trashCount = await User.countDocuments({ isDeleted: true }).maxTimeMS(MAX_TIME_MS);

      const statusMap: Record<string, number> = {};
      (aggregateResult?.statusCounts ?? []).forEach((s) => { statusMap[s._id] = s.count; });

      const roleMap: Record<string, number> = {};
      (aggregateResult?.roleCounts ?? []).forEach((r) => { roleMap[r._id] = r.count; });

      const kycMap: Record<string, number> = {};
      (aggregateResult?.kycCounts ?? []).forEach((k) => { kycMap[k._id] = k.count; });

      const totalAll = aggregateResult?.total?.[0]?.count ?? 0;

      counts = {
        all:       totalAll,
        active:    statusMap['active']    ?? 0,
        pending:   statusMap['pending']   ?? 0,
        suspended: statusMap['suspended'] ?? 0,
        banned:    statusMap['banned']    ?? 0,
        trash:     trashCount,
      };

      // Show all schema roles for visibility — UI restricts to 4 valid
      roleCounts = {};
      for (const r of ALL_SCHEMA_ROLES) {
        roleCounts[r] = roleMap[r] ?? 0;
      }

      kycCounts = {
        none:     kycMap['none']     ?? 0,
        pending:  kycMap['pending']  ?? 0,
        verified: kycMap['verified'] ?? 0,
        rejected: kycMap['rejected'] ?? 0,
      };
    }

    // ── Respond ─────────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      counts,
      roleCounts,
      kycCounts,
      validRoles: VALID_ROLES_STRICT,
      requestId,
    });
  } catch (err: unknown) {
    void logSecurityEvent({
      type: 'admin_action',
      ip,
      metadata: {
        action:     'admin_users_list_error',
        endpoint:   '/api/admin/users',
        error:      err instanceof Error ? err.message : 'unknown',
        requestId,
      },
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code:    'SERVER_ERROR',
      requestId,
    });
  }
}