// pages/api/properties/my-properties.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi } from '@/lib/rateLimit';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User   from '@/models/User';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS    = 2500;
const DEFAULT_LIMIT  = 20;
const MAX_LIMIT      = 50;

const VALID_VERIFICATION_STATUSES = new Set([
  'draft', 'pending', 'under_review', 'verified', 'rejected', 'flagged',
]);

const VALID_SORT_FIELDS = new Set([
  'createdAt', 'updatedAt', 'price', 'views', 'qualityScore',
]);

const VALID_LISTING_TYPES = new Set([
  'full_payment', 'installment', 'rent',
]);

const VALID_OWNERSHIP_PROOF_STATUSES = new Set([
  'verified', 'pending', 'missing',
]);

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface CursorPayload {
  t:          string;   // ISO date string (createdAt for tie-break)
  id:         string;   // ObjectId hex
  sortValue?: number | string | null; // value of the sorted field
}

interface MongoFilter {
  owner:                              mongoose.Types.ObjectId;
  isDeleted?:                         { $ne: boolean } | boolean;
  'verification.status'?:             { $in: string[] };
  isFlagged?:                         boolean;
  'fraudDetection.isPotentialDuplicate'?: boolean;
  'ownershipProof.verifiedByAdmin'?:  boolean | { $ne: boolean };
  'ownershipProof.hasProof'?:         boolean | { $ne: boolean };
  listingType?:                       string;
  $or?:                               MongoCondition[];
}

type MongoCondition = Record<string, unknown>;

interface StatusCount {
  _id:   string;
  count: number;
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf    = req.headers['x-forwarded-for'];
  const raw   = Array.isArray(xf) ? xf[0] : xf;
  const first = (raw ?? '').split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || '0.0.0.0';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',              requestId);
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains; preload');
  res.setHeader('X-DNS-Prefetch-Control',    'off');
  res.setHeader('Cache-Control',             'no-store');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function parseBool(v: string | string[] | undefined): boolean {
  if (!v) return false;
  const s = String(Array.isArray(v) ? v[0] : v).toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function getString(v: string | string[] | undefined): string {
  if (!v) return '';
  return String(Array.isArray(v) ? v[0] : v).trim();
}

function getStringArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

function allowlisted(v: string, set: Set<string>): string {
  const s = v.toLowerCase().trim();
  return set.has(s) ? s : '';
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// Check user account state using only real User model fields
function assertUserActive(
  user: { status?: string; isDeleted?: boolean; deletedAt?: Date | null } | null
): void {
  if (!user) {
    const e = new Error('User not found.');
    (e as NodeJS.ErrnoException).code = 'USER_NOT_FOUND';
    throw e;
  }
  if (user.isDeleted || user.deletedAt) {
    const e = new Error('Account is not available.');
    (e as NodeJS.ErrnoException).code = 'ACCOUNT_DELETED';
    throw e;
  }
  const s = String(user.status ?? 'active').toLowerCase();
  if (s === 'suspended' || s === 'banned') {
    const e = new Error(`Account is ${s}.`);
    (e as NodeJS.ErrnoException).code = 'ACCOUNT_INACTIVE';
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CURSOR HELPERS
// ═══════════════════════════════════════════════════════════════

function b64Encode(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64Decode(s: string): string | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad  = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    return Buffer.from(b64 + pad, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function parseCursor(token: string | string[] | undefined): CursorPayload | null {
  if (!token) return null;
  const raw = getString(token);
  if (!raw) return null;

  const decoded = b64Decode(raw);
  if (!decoded) return null;

  try {
    const obj = JSON.parse(decoded) as Record<string, unknown>;
    const t   = String(obj['t'] ?? '');
    const id  = String(obj['id'] ?? '');

    if (!t || !isValidObjectId(id))       return null;
    if (Number.isNaN(new Date(t).getTime())) return null;

    const sortValue = obj['sortValue'];
    return {
      t,
      id,
      sortValue: (
        typeof sortValue === 'number' ||
        typeof sortValue === 'string'
      ) ? sortValue : null,
    };
  } catch {
    return null;
  }
}

function makeCursor(
  doc: Record<string, unknown>,
  sortField: string
): string {
  const createdAt = doc['createdAt'];
  const id        = doc['_id'];

  let sortValue: number | string | null = null;
  if (sortField === 'qualityScore') {
    const qm = doc['qualityMetrics'] as Record<string, unknown> | undefined;
    sortValue = Number(qm?.['completenessScore'] ?? 0);
  } else if (sortField !== 'createdAt') {
    const v = doc[sortField];
    if (typeof v === 'number' || typeof v === 'string') sortValue = v;
  }

  const payload: CursorPayload = {
    t:  new Date(String(createdAt)).toISOString(),
    id: String(id),
    ...(sortValue !== null && { sortValue }),
  };

  return b64Encode(JSON.stringify(payload));
}

// Build cursor $or condition
function cursorCondition(
  payload:   CursorPayload,
  sortField: string,
  sortOrder: 1 | -1,
  direction: 'next' | 'prev'
): MongoCondition {
  const t         = new Date(payload.t);
  const id        = payload.id;

  // Determine actual DB field
  const dbField = sortField === 'qualityScore'
    ? 'qualityMetrics.completenessScore'
    : sortField;

  // For createdAt-only sort — simple cursor
  if (sortField === 'createdAt' || payload.sortValue === null) {
    const op = (sortOrder === -1) === (direction === 'next') ? '$lt' : '$gt';
    return {
      $or: [
        { createdAt: { [op]: t } },
        { createdAt: t, _id: { [op]: id } },
      ],
    };
  }

  // For other sort fields — use sortValue as primary, createdAt + _id as tiebreaker
  const sv  = payload.sortValue;
  const op1 = (sortOrder === -1) === (direction === 'next') ? '$lt' : '$gt';

  return {
    $or: [
      { [dbField]: { [op1]: sv } },
      {
        [dbField]: sv,
        $or: [
          { createdAt: { [op1]: t } },
          { createdAt: t, _id: { [op1]: id } },
        ],
      },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// 📋 PROJECTION
// ═══════════════════════════════════════════════════════════════

const PROJECTION = [
  '_id',
  'slug',
  'title',
  'propertyType',
  'propertyCategory',
  'listingType',
  'price',
  'priceDropPercent',
  'area',
  'unit',
  'city',
  'society',
  'bedrooms',
  'bathrooms',
  'isDeleted',
  'deletedAt',
  'isFeatured',
  'isVerified',
  'views',
  'favoriteCount',
  'inquiryCount',
  'createdAt',
  'updatedAt',
  'featureImageUrl',
  'images.url',
  'images.isPrimary',
  // Verification
  'verification.status',
  'verification.submittedAt',
  'verification.verifiedAt',
  'verification.rejectedAt',
  'verification.rejectionReason',
  'verification.requiresManualReview',
  'verification.verificationScore',
  // Quality
  'qualityMetrics.completenessScore',
  // Trust score (owner sees their own)
  'trustScore.score',
  'trustScore.level',
  // True cost
  'trueCost.grandTotalBuyerFiler',
  'trueCost.hiddenChargesDisclosed',
  // Fraud (owner sees their own flags)
  'fraudDetection.isPotentialDuplicate',
  'fraudDetection.isPriceAnomaly',
  'fraudDetection.fraudScore',
  // Ownership proof status (not encrypted URLs)
  'ownershipProof.hasProof',
  'ownershipProof.verifiedByAdmin',
  'ownershipProof.uploadedAt',
].join(' ');

// ═══════════════════════════════════════════════════════════════
// 🚦 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      requestId,
    });
    return;
  }

  // Rate limit
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down.',
      requestId,
    });
    return;
  }

  // Auth required — this is a private endpoint
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    await dbConnect();

    // Load actor for status check
    const actor = await User
      .findById(auth.id)
      .select('status isDeleted deletedAt')
      .maxTimeMS(MAX_TIME_MS)
      .lean<{ status?: string; isDeleted?: boolean; deletedAt?: Date | null }>();

    assertUserActive(actor);

    const isAdmin = auth.role === 'admin';

    // ── Parse query params ──────────────────────────────────
    const q = req.query;

    const includeDeleted = parseBool(q['includeDeleted']);
    const showFlagged    = parseBool(q['flagged']);
    const showDuplicates = parseBool(q['duplicates']);

    // Verification status (multi-value: ?verificationStatus=draft&verificationStatus=pending)
    const verificationStatuses = getStringArray(q['verificationStatus'])
      .map((s) => allowlisted(s, VALID_VERIFICATION_STATUSES))
      .filter(Boolean);

    const ownershipProofRaw = allowlisted(
      getString(q['ownershipProof']),
      VALID_OWNERSHIP_PROOF_STATUSES
    );

    const listingTypeRaw = allowlisted(
      getString(q['listingType']),
      VALID_LISTING_TYPES
    );

    const sortFieldRaw = allowlisted(
      getString(q['sortBy']),
      VALID_SORT_FIELDS
    ) || 'createdAt';

    const sortOrderStr = getString(q['sortOrder']).toLowerCase();
    const sortOrder: 1 | -1 = sortOrderStr === 'asc' ? 1 : -1;

    const limitNum  = clampInt(
      parseInt(getString(q['limit']), 10) || DEFAULT_LIMIT,
      1,
      MAX_LIMIT
    );

    const pageNum   = clampInt(
      parseInt(getString(q['page']),  10) || 1,
      1,
      1_000_000
    );

    const cursorNext   = parseCursor(q['cursor']);
    const cursorBefore = parseCursor(q['before']);
    const isCursorMode = Boolean(cursorNext || cursorBefore);

    // ── Build base filter ──────────────────────────────────
    const baseFilter: MongoFilter = {
      owner: new mongoose.Types.ObjectId(auth.id),
    };

    // Deleted visibility
    // Admin can see all; owner can see own deleted (no extra gate needed)
    if (!includeDeleted) {
      baseFilter.isDeleted = { $ne: true };
    }

    // Verification status
    if (verificationStatuses.length > 0) {
      baseFilter['verification.status'] = { $in: verificationStatuses };
    }

    // Flagged (isFlagged field — not isPotentialDuplicate)
    if (showFlagged) {
      baseFilter.isFlagged = true;
    }

    // Potential duplicates (fraud detection)
    if (showDuplicates) {
      baseFilter['fraudDetection.isPotentialDuplicate'] = true;
    }

    // Ownership proof
    if (ownershipProofRaw === 'verified') {
      baseFilter['ownershipProof.verifiedByAdmin'] = true;
    } else if (ownershipProofRaw === 'pending') {
      baseFilter['ownershipProof.hasProof']        = true;
      baseFilter['ownershipProof.verifiedByAdmin'] = { $ne: true };
    } else if (ownershipProofRaw === 'missing') {
      baseFilter['ownershipProof.hasProof']        = { $ne: true };
    }

    // Listing type
    if (listingTypeRaw) {
      baseFilter.listingType = listingTypeRaw;
    }

    // ── Build sort ─────────────────────────────────────────
    const dbSortField = sortFieldRaw === 'qualityScore'
      ? 'qualityMetrics.completenessScore'
      : sortFieldRaw;

    const sortOption: Record<string, 1 | -1> = {
      [dbSortField]: sortOrder,
      _id:           sortOrder,  // tie-breaker
    };

    // ── Build cursor filter ────────────────────────────────
    const queryFilter: MongoFilter = { ...baseFilter };

    if (isCursorMode) {
      // cursorCondition() returns { $or: [...] } — extract inner array
      // to avoid double-nested $or: [{ $or: [...] }] in MongoDB query
      if (cursorNext) {
        const cond = cursorCondition(cursorNext, sortFieldRaw, sortOrder, 'next') as { $or: MongoCondition[] };
        queryFilter.$or = cond['$or'];
      } else if (cursorBefore) {
        const cond = cursorCondition(cursorBefore, sortFieldRaw, sortOrder, 'prev') as { $or: MongoCondition[] };
        queryFilter.$or = cond['$or'];
      }
    }

    // ── Execute queries ────────────────────────────────────
    // No .hint() — let MongoDB query planner use owner index
    const fetchLimit = isCursorMode ? limitNum + 1 : limitNum;
    const skip       = isCursorMode ? 0 : (pageNum - 1) * limitNum;

    const [rawProperties, total, statusCounts] = await Promise.all([
      Property
        .find(queryFilter as mongoose.FilterQuery<typeof Property>)
        .select(PROJECTION)
        .sort(sortOption)
        .skip(skip)
        .limit(fetchLimit)
        .maxTimeMS(MAX_TIME_MS)
        .lean<Record<string, unknown>[]>(),

      Property
        .countDocuments(baseFilter as mongoose.FilterQuery<typeof Property>)
        .maxTimeMS(MAX_TIME_MS),

      // Status breakdown for dashboard stats
      Property
        .aggregate<StatusCount>([
          {
            $match: {
              owner:     new mongoose.Types.ObjectId(auth.id),
              isDeleted: { $ne: true },
            },
          },
          {
            $group: {
              _id:   '$verification.status',
              count: { $sum: 1 },
            },
          },
        ])
        .option({ maxTimeMS: MAX_TIME_MS }),
    ]);

    // ── Cursor pagination post-processing ─────────────────
    let properties      = rawProperties;
    let hasMore         = false;
    let nextCursorToken: string | null = null;
    let prevCursorToken: string | null = null;

    if (isCursorMode) {
      if (properties.length > limitNum) {
        hasMore    = true;
        properties = properties.slice(0, limitNum);
      }

      if (properties.length > 0) {
        const first = properties[0];
        const last  = properties[properties.length - 1];
        nextCursorToken = hasMore
          ? makeCursor(last,  sortFieldRaw)
          : null;
        // prevCursor exists whenever we have any cursor (next OR before)
        // Allows backward navigation after paginating forward or backward
        prevCursorToken = (cursorNext ?? cursorBefore)
          ? makeCursor(first, sortFieldRaw)
          : null;
      }
    }

    // ── Stats ──────────────────────────────────────────────
    const statMap = new Map<string, number>(
      statusCounts.map((s) => [s._id, s.count])
    );

    const stats = {
      total,
      byStatus: {
        draft:        statMap.get('draft')        ?? 0,
        pending:      statMap.get('pending')       ?? 0,
        under_review: statMap.get('under_review')  ?? 0,
        verified:     statMap.get('verified')      ?? 0,
        rejected:     statMap.get('rejected')      ?? 0,
        flagged:      statMap.get('flagged')       ?? 0,
      },
    };

    // ── Response ───────────────────────────────────────────
    const pages   = Math.max(1, Math.ceil(total / limitNum));
    const hasPrev = isCursorMode
      ? Boolean(cursorNext)
      : pageNum > 1;
    const hasNext = isCursorMode
      ? hasMore
      : pageNum < pages;

    res.status(200).json({
      success:    true,
      requestId,
      properties,
      pagination: {
        mode:    isCursorMode ? 'cursor' : 'offset',
        page:    pageNum,
        limit:   limitNum,
        total,
        pages,
        hasNext,
        hasPrev,
        nextCursor: isCursorMode ? nextCursorToken : null,
        prevCursor: isCursorMode ? prevCursorToken : null,
      },
      stats,
      meta: {
        // isAdmin omitted — client derives role from useSession(), not API
        sortBy:    sortFieldRaw,
        sortOrder: sortOrder === 1 ? 'asc' : 'desc',
        filters: {
          includeDeleted,
          verificationStatuses: verificationStatuses.length > 0
            ? verificationStatuses
            : null,
          showFlagged,
          showDuplicates,
          ownershipProof: ownershipProofRaw || null,
          listingType:    listingTypeRaw    || null,
        },
      },
    });
  } catch (err: unknown) {
    // Custom error codes from assertUserActive
    if (err instanceof Error) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'USER_NOT_FOUND') {
        res.status(401).json({
          success: false,
          message: err.message,
          requestId,
        });
        return;
      }
      if (code === 'ACCOUNT_DELETED' || code === 'ACCOUNT_INACTIVE') {
        res.status(403).json({
          success: false,
          message: err.message,
          requestId,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties.',
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        debug: err instanceof Error ? err.message : String(err),
      }),
    });
  }
}