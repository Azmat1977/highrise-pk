// pages/api/favorites/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Favorite from '@/models/Favorite';
import SecurityEvent from '@/models/SecurityEvent';
import { rateLimitApi } from '@/lib/rateLimit';
import mongoose from 'mongoose';
import { isPublicProperty, PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';
import Property from '@/models/Property';
import Society from '@/models/Society';
import { requireAuth } from '@/lib/requireAuth';

/**
 * Favorites list and check endpoint.
 *
 * Security features:
 *   Authentication required (session-based, canonical requireAuth guard).
 *   Distributed rate limiting.
 *   Request ID tracking and security headers.
 *   Input validation and sanitization.
 *   Sensitive media keys scrubbed from responses.
 *   Audit logging for errors with generic client messages.
 *
 * Modes:
 *   mode=has   Check whether one entity is favorited (heart icon state).
 *   mode=ids   Property-only ID list for the signed-in user, with a meta debug block.
 *   default    List favorites with populated, scrubbed entities (offset or cursor pagination).
 *
 * Pagination:
 *   Cursor-based (recommended for infinite scroll).
 *   Offset-based (for traditional pagination).
 *
 * @route GET /api/favorites
 * @route GET /api/favorites?mode=has&propertyId=<id>
 * @access Authenticated users only
 */

// ===== Constants =====

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_PAGE = 500;
const MAX_QUERY_TIME_MS = 2500;

// Sensitive keys to scrub from response
const SENSITIVE_MEDIA_KEYS = new Set([
  'public_id',
  'publicId',
  'cloudinaryPublicId',
  'asset_id',
  'assetId',
  'signature',
  'etag',
  'api_key',
  'apiSecret',
  'access_token',
  'accessToken',
]);

// ===== Helper functions =====

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  res.setHeader('Vary', 'Accept-Encoding, Cookie');
}

function normalizeText(input: any, maxLen: number): string {
  const s = typeof input === 'string' ? input.trim() : '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

function clampInt(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

async function logSecurityEvent(data: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityEvent.create({ ...data, timestamp: new Date() });
  } catch {
    // best-effort audit logging
  }
}

// ===== Cursor pagination helpers =====

type CursorPayload = { t: string; id: string };

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
}

function encodeCursor(createdAt: Date, id: any): string {
  const payload: CursorPayload = { t: createdAt.toISOString(), id: String(id) };
  return base64UrlEncode(JSON.stringify(payload));
}

function decodeCursor(token: string): CursorPayload | null {
  try {
    const raw = base64UrlDecode(String(token || '').trim());
    const parsed = JSON.parse(raw) as CursorPayload;

    if (!parsed || typeof parsed.t !== 'string' || typeof parsed.id !== 'string') return null;
    if (!isValidObjectId(parsed.id)) return null;

    const d = new Date(parsed.t);
    if (Number.isNaN(d.getTime())) return null;

    return parsed;
  } catch {
    return null;
  }
}

function cursorCondition(payload: CursorPayload): any {
  const t = new Date(payload.t);
  const oid = new mongoose.Types.ObjectId(payload.id);
  return { $or: [{ createdAt: { $lt: t } }, { createdAt: t, _id: { $lt: oid } }] };
}

// ===== Sensitive data scrubbing =====

function scrubSensitive(val: any): any {
  if (!val) return val;
  if (Array.isArray(val)) return val.map(scrubSensitive);
  if (typeof val !== 'object') return val;

  for (const k of Object.keys(val)) {
    if (SENSITIVE_MEDIA_KEYS.has(k)) {
      delete (val as any)[k];
      continue;
    }
    (val as any)[k] = scrubSensitive((val as any)[k]);
  }
  return val;
}

// ===== Main handler =====

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // STEP 1: METHOD VALIDATION
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

  try {
    // STEP 2: RATE LIMITING (Distributed)
    const rateLimitResult = await rateLimitApi(req);

    if (!rateLimitResult.ok) {
      await logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        ipAddress: clientIP,
        userAgent,
        metadata: {
          endpoint: '/api/favorites',
          limit: rateLimitResult.limit,
        },
      });

      res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.',
        requestId,
        retryAfter: rateLimitResult.retryAfter,
      });
    }

    // STEP 3: DATABASE CONNECTION
    await dbConnect();

    // STEP 4: AUTHENTICATION (canonical guard)
    // requireAuth validates tokenVersion + account status + returns AuthToken
    const auth = await requireAuth(req, res);
    if (!auth) return; // requireAuth already sent 401 response

    const userId = auth.id;

    if (!isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user identity.',
        requestId,
      });
    }

    const userOid = new mongoose.Types.ObjectId(userId);

    // STEP 5: DETERMINE MODE
    const mode = normalizeText(req.query.mode, 16).toLowerCase();

    // MODE: HAS (Check if entity is favorited)
    if (mode === 'has') {
      return handleHasMode(req, res, userOid, userId, requestId);
    }

    if (mode === 'ids') {
      const rows = await Favorite.find({
        $and: [
          { $or: [{ userId: userOid }, { userId }, { user: userOid }, { user: userId }] },
          { entityType: 'property' },
          { isDeleted: { $ne: true } },
        ],
      })
        .select('entityId')
        .lean();

      const cleanIds = rows
        .map((row: any) => {
          const raw = row?.entityId;
          if (!raw) return '';
          if (typeof raw === 'string') return raw.trim();
          if (typeof raw === 'object') {
            if (typeof raw.toHexString === 'function') {
              try { return raw.toHexString(); } catch { /* fall through */ }
            }
            if (raw._id) return String(raw._id);
            try {
              const s = String(raw);
              return s !== '[object Object]' ? s : '';
            } catch {
              return '';
            }
          }
          return String(raw);
        })
        .filter((id: string) => isValidObjectId(id));

      // User's own wishlist IDs: only exclude deleted properties (do NOT require public verification)
      const existing = cleanIds.length
        ? await Property.find({
            _id: { $in: cleanIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
            isDeleted: { $ne: true },
          })
            .select('_id')
            .lean()
        : [];

      return res.status(200).json({
        success: true,
        requestId,
        data: {
          propertyIds: existing.map((row: any) => String(row._id)),
          // Debug aid (safe): how many favorite rows vs resolved properties
          meta: {
            favoriteRows: rows.length,
            cleanIds: cleanIds.length,
            resolvedProperties: existing.length,
          },
        },
      });
    }

    // MODE: LIST (Default: list user's favorites)
    return handleListMode(req, res, userOid, userId, requestId);

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';

    await logSecurityEvent({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/favorites',
        error: errMessage,
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites',
      requestId,
    });
  }
}

// ===== HAS MODE: Check if entity is favorited =====

async function handleHasMode(
  req: NextApiRequest,
  res: NextApiResponse,
  userOid: mongoose.Types.ObjectId,
  userId: string,
  requestId: string
) {
  // Parse entity info (supports legacy and new format)
  const propertyId = normalizeText(req.query.propertyId, 64);
  const projectId = normalizeText(req.query.projectId, 64);
  const entityTypeRaw = normalizeText(req.query.entityType, 16).toLowerCase();
  const entityIdRaw = normalizeText(req.query.entityId, 64);

  let entityType: 'property' | 'project' | 'society' = 'property';
  let entityId = '';

  if (propertyId) {
    entityType = 'property';
    entityId = propertyId;
  } else if (projectId) {
    entityType = 'project';
    entityId = projectId;
  } else if (entityTypeRaw && entityIdRaw) {
    if (
      entityTypeRaw !== 'property' &&
      entityTypeRaw !== 'project' &&
      entityTypeRaw !== 'society'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entityType. Must be property, project, or society.',
        requestId,
      });
    }
    entityType = entityTypeRaw as 'property' | 'project' | 'society';
    entityId = entityIdRaw;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields. Provide propertyId OR (entityType + entityId).',
      requestId,
    });
  }
  if (!isValidObjectId(entityId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid entityId format.',
      requestId,
    });
  }

  // Build ownership conditions (handles legacy user vs userId, ObjectId vs string)
  const ownershipOr = [
    { userId: userOid },
    { userId },
    { user: userOid },
    { user: userId },
  ];

  // Build entityId conditions (handles ObjectId vs string storage)
  const entityOid = new mongoose.Types.ObjectId(entityId);
  const entityIdOr = [
    { entityId: entityOid },
    { entityId },
  ];

  // Query with bulletproof conditions
  const exists = await Favorite.findOne({
    $and: [
      { $or: ownershipOr },
      { $or: entityIdOr },
      { entityType },
      { isDeleted: { $ne: true } },
    ],
  })
    .select('_id')
    .maxTimeMS(MAX_QUERY_TIME_MS)
    .lean();

  return res.status(200).json({
    success: true,
    requestId,
    isFavorite: Boolean(exists),
    entityType,
    entityId,
  });
}

// ===== LIST MODE: List user's favorites with pagination =====

async function handleListMode(
  req: NextApiRequest,
  res: NextApiResponse,
  userOid: mongoose.Types.ObjectId,
  userId: string,
  requestId: string
) {
  // Parse query parameters
  const entityTypeFilter = normalizeText(req.query.entityType, 16).toLowerCase();
  const entityType = ['property', 'project', 'society'].includes(entityTypeFilter)
    ? entityTypeFilter
    : '';

  const limitNum = clampInt(
    parseInt(String(req.query.limit || DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
    1,
    MAX_LIMIT
  );

  const cursorToken = normalizeText(req.query.cursor, 256);
  const isCursorMode = Boolean(cursorToken);

  const pageNum = isCursorMode
    ? 1
    : clampInt(parseInt(String(req.query.page || 1), 10) || 1, 1, MAX_PAGE);
  const skip = isCursorMode ? 0 : (pageNum - 1) * limitNum;

  // Build ownership conditions (handles legacy)
  const ownershipOr = [
    { userId: userOid },
    { userId },
    { user: userOid },
    { user: userId },
  ];

  // Base filter
  const baseFilter: any = {
    $and: [
      { $or: ownershipOr },
      { isDeleted: { $ne: true } },
    ],
  };

  if (entityType) {
    baseFilter.$and.push({ entityType });
  }

  // Add cursor condition if cursor pagination
  const filter: any = { ...baseFilter };
  let cursorPayload: CursorPayload | null = null;

  if (isCursorMode) {
    cursorPayload = decodeCursor(cursorToken);
    if (!cursorPayload) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cursor token.',
        requestId,
      });
    }
    filter.$and = filter.$and || [];
    filter.$and.push(cursorCondition(cursorPayload));
  }

  // Sort: newest first
  const sortOption: Record<string, 1 | -1> = { createdAt: -1, _id: -1 };

  const safeSelectFields = '_id slug shortId title name price currency city location coverImage featureImageUrl images thumbnail isFeatured isVerified status verification isDeleted isFlagged createdAt area unit propertyType listingType bedrooms bathrooms';

  const fetchLimit = isCursorMode
    ? Math.min((limitNum + 1) * 3, MAX_LIMIT * 3)
    : Math.min(limitNum * 3, MAX_LIMIT * 3);

  const favoritesRaw = await Favorite.find(filter)
    .select('_id entityType entityId notes createdAt updatedAt')
    .sort(sortOption)
    .skip(skip)
    .limit(fetchLimit)
    .maxTimeMS(MAX_QUERY_TIME_MS)
    .lean();

  // Helper for extracting clean 24-hex string IDs from strings, ObjectIds, or nested objects
  const toCleanIdString = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      if (obj._id && obj._id !== val) return toCleanIdString(obj._id);
      if (obj.id && obj.id !== val) return toCleanIdString(obj.id);
      if (typeof (val as any).toHexString === 'function') {
        try { return (val as any).toHexString(); } catch {}
      }
      if (typeof (val as any).toString === 'function') {
        try {
          const str = (val as any).toString();
          if (str && str !== '[object Object]') return str.trim();
        } catch {}
      }
    }
    return '';
  };

  // Extract all raw entity identifiers (ObjectIds, string IDs, slugs)
  const rawPropertyKeys = favoritesRaw
    .filter((f: any) => String(f.entityType || 'property').toLowerCase() === 'property')
    .map((f: any) => toCleanIdString(f.entityId))
    .filter(Boolean);

  const rawProjectKeys = favoritesRaw
    .filter((f: any) => String(f.entityType).toLowerCase() === 'project')
    .map((f: any) => toCleanIdString(f.entityId))
    .filter(Boolean);

  const rawSocietyKeys = favoritesRaw
    .filter((f: any) => String(f.entityType).toLowerCase() === 'society')
    .map((f: any) => toCleanIdString(f.entityId))
    .filter(Boolean);

  const propertyOids = rawPropertyKeys
    .filter((id) => isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const projectOids = rawProjectKeys
    .filter((id) => isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const societyOids = rawSocietyKeys
    .filter((id) => isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // Safely resolve Project model dynamically
  const ProjectModel = (mongoose.models.Project || mongoose.models.project) as mongoose.Model<any> | undefined;

  // Query Property, Project, and Society models flexibly
  const nonOidPropertySlugs = rawPropertyKeys.filter((id) => !isValidObjectId(id));
  const nonOidProjectSlugs = rawProjectKeys.filter((id) => !isValidObjectId(id));
  const nonOidSocietySlugs = rawSocietyKeys.filter((id) => !isValidObjectId(id));

  const [propertiesRaw, projectsRaw, societiesRaw] = await Promise.all([
    rawPropertyKeys.length > 0
      ? Property.find({
          $or: [
            ...(propertyOids.length > 0 ? [{ _id: { $in: propertyOids } }] : []),
            ...(nonOidPropertySlugs.length > 0 ? [{ slug: { $in: nonOidPropertySlugs } }] : []),
          ],
          isDeleted: { $ne: true },
        })
          .select(safeSelectFields)
          .maxTimeMS(MAX_QUERY_TIME_MS)
          .lean()
      : [],
    rawProjectKeys.length > 0 && ProjectModel
      ? ProjectModel.find({
          $or: [
            ...(projectOids.length > 0 ? [{ _id: { $in: projectOids } }] : []),
            ...(nonOidProjectSlugs.length > 0 ? [{ slug: { $in: nonOidProjectSlugs } }] : []),
          ],
          isDeleted: { $ne: true },
        })
          .select(safeSelectFields)
          .maxTimeMS(MAX_QUERY_TIME_MS)
          .lean()
      : [],
    rawSocietyKeys.length > 0
      ? Society.find({
          $or: [
            ...(societyOids.length > 0 ? [{ _id: { $in: societyOids } }] : []),
            ...(nonOidSocietySlugs.length > 0 ? [{ slug: { $in: nonOidSocietySlugs } }] : []),
          ],
          isPublished: true,
        })
          .select(
            '_id name slug city areaName featuredImage images category nocStatus approvalAuthority overallRiskLevel isVerifiedByHighrise isFeatured'
          )
          .maxTimeMS(MAX_QUERY_TIME_MS)
          .lean()
      : [],
  ]);

  // Build lookup maps keyed by string ID, ObjectId, and slug
  const propertyMap = new Map<string, any>();
  for (const p of propertiesRaw as any[]) {
    const idStr = toCleanIdString(p._id);
    if (idStr) propertyMap.set(idStr, p);
    if (p.slug) propertyMap.set(String(p.slug), p);
  }

  const projectMap = new Map<string, any>();
  for (const p of projectsRaw as any[]) {
    const idStr = toCleanIdString(p._id);
    if (idStr) projectMap.set(idStr, p);
    if (p.slug) projectMap.set(String(p.slug), p);
  }

  const societyMap = new Map<string, (typeof societiesRaw)[number]>();
  for (const society of societiesRaw) {
    const idStr = toCleanIdString(society._id);
    if (idStr) societyMap.set(idStr, society);
    if (society.slug) societyMap.set(String(society.slug), society);
  }

  // Deduplicate and assemble clean favorites list
  const uniqueFavoritesMap = new Map<string, any>();

  for (const item of favoritesRaw) {
    const f = item as Record<string, any>;
    if (!f || !f.entityId) continue;

    const rawEntityKey = toCleanIdString(f.entityId);
    const canonicalEntityType = String(f.entityType || 'property').trim().toLowerCase();

    if (!rawEntityKey) continue;

    let populatedEntity = null;
    if (canonicalEntityType === 'property') {
      populatedEntity = propertyMap.get(rawEntityKey);
    } else if (canonicalEntityType === 'project') {
      populatedEntity = projectMap.get(rawEntityKey);
    } else if (canonicalEntityType === 'society') {
      populatedEntity = societyMap.get(rawEntityKey);
    }

    if (!populatedEntity) continue; // Entity deleted, unpublished, or missing

    const canonicalId = toCleanIdString(populatedEntity._id) || rawEntityKey;
    const key = `${canonicalEntityType}:${canonicalId}`;

    if (!uniqueFavoritesMap.has(key)) {
      uniqueFavoritesMap.set(key, {
        _id: toCleanIdString(f._id),
        entityType: canonicalEntityType,
        entityId: populatedEntity,
        notes: typeof f.notes === 'string' ? f.notes : undefined,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      });
    }
  }

  let favorites = Array.from(uniqueFavoritesMap.values());

  // Scrub sensitive data
  favorites = favorites.map((f: any) => {
    const copy = { ...f };
    copy.entityId = scrubSensitive(copy.entityId);
    return copy;
  });

  // Handle cursor pagination
  let hasNext = false;
  let nextCursor: string | null = null;

  if (favorites.length > limitNum) {
    hasNext = true;
    favorites = favorites.slice(0, limitNum);
  }

  const last = favorites[favorites.length - 1];
  if (hasNext && last?.createdAt && last?._id) {
    nextCursor = encodeCursor(new Date(last.createdAt), last._id);
  }

  // Get total count cleanly without aggregation casting errors
  const totalCount = await Favorite.countDocuments(baseFilter).maxTimeMS(MAX_QUERY_TIME_MS);
  const pages = Math.max(1, Math.ceil(totalCount / limitNum));
  const hasPrev = isCursorMode ? Boolean(cursorPayload) : pageNum > 1;

  // Group by entity type
  const grouped = {
    properties: favorites.filter((f: any) => f.entityType === 'property'),
    projects: favorites.filter((f: any) => f.entityType === 'project'),
    societies: favorites.filter((f: any) => f.entityType === 'society'),
  };

  return res.status(200).json({
    success: true,
    requestId,
    data: {
      favorites,
      grouped,
      pagination: {
        mode: isCursorMode ? 'cursor' : 'offset',
        cursor: isCursorMode ? cursorToken : null,
        nextCursor: isCursorMode ? nextCursor : null,
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages,
        hasNext: isCursorMode ? hasNext : pageNum < pages,
        hasPrev,
      },
    },
  });
}