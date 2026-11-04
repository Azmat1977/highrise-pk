// pages/api/properties/otherlistings/index.ts
//
// Related listings engine — shows other properties by the same entity (Agent, Owner, Developer, or Society).
//
// Endpoint: GET /api/properties/otherlistings?ownerId?agentId?developerId?society
// Response: { listings: PropertyListItem[], total: number }
//
// Logic: Find properties associated with the given entity ID (if multiple keys present, OR condition).
// Exclude the main property ID (if provided) to avoid showing the same listing.
// Reuse the same projection (PUBLIC_PROJECTION) and standard filters (public-only, verified/approved).
// Apply same pagination limits as the main listing API for consistency.
// Keep rate limiting and security headers identical to the public listing route.

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property, { IProperty } from '@/models/Property';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import mongoose from 'mongoose';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_LIMIT      = 24; // Slightly larger than main listing for discovery
const DEFAULT_LIMIT  = 12;
const MAX_PAGE       = 500;
const MAX_SEARCH_LEN = 80;
const MAX_TIME_MS    = 2500;

// Allowlists
const ALLOWED_TRUST = new Set(['premium', 'trusted', 'standard', 'basic', 'unverified']);

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface QueryParams {
  ownerId?: string;
  agentId?: string;
  developerId?: string;
  society?: string;
  excludeId?: string;
  limit?: string;
  page?: string;
}

// ═══════════════════════════════════════════════════════════════
// 🔧 PURE HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf    = req.headers['x-forwarded-for'];
  const raw   = Array.isArray(xf) ? xf[0] : xf;
  const first = (raw ?? '').split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || '0.0.0.0';
}

function getString(v: string | string[] | undefined): string {
  if (!v) return '';
  return Array.isArray(v) ? String(v[0] ?? '') : String(v);
}

function clampText(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function clampInt(v: unknown, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  if (typeof v === "string" || typeof v === "number") {
    const n = Number(v);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, Math.floor(n)));
  }
  return min;
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',               requestId);
  res.setHeader('X-Content-Type-Options',     'nosniff');
  res.setHeader('X-Frame-Options',            'DENY');
  res.setHeader('Referrer-Policy',            'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security',  'max-age=86400; includeSubDomains; preload');
  res.setHeader('X-DNS-Prefetch-Control',     'off');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );
}

function badRequest(
  res:       NextApiResponse,
  message:   string,
  requestId: string
): void {
  res.status(400).json({ success: false, message, requestId });
}

// Scrubbed property shape (same as main listing API)
type ScrubbedProperty = Record<string, unknown>;

const SENSITIVE_KEYS = new Set([
  'public_id', 'publicId', 'cloudinaryPublicId',
  'asset_id',  'assetId',  'signature', 'etag',
  'api_key',   'apiKey',   'apiSecret', 'access_token',
]);

function scrubValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;

  // Handle Mongoose / BSON ObjectId
  if (
    val instanceof mongoose.Types.ObjectId ||
    (val as { _bsontype?: string })._bsontype === 'ObjectID'
  ) {
    return val.toString();
  }

  // Handle Date objects
  if (val instanceof Date) {
    return val.toISOString();
  }

  // Handle objects with toHexString
  if (typeof (val as { toHexString?: unknown }).toHexString === 'function') {
    return (val as { toHexString: () => string }).toHexString();
  }

  if (Array.isArray(val)) return val.map(scrubValue);

  const obj = val as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    out[k] = scrubValue(obj[k]);
  }
  return out;
}

function scrubProperty(p: unknown): ScrubbedProperty {
  return scrubValue(p) as ScrubbedProperty;
}

// ── PUBLIC_PROPERTY_FILTER ───────────────────────────────────────────────

import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

// ═══════════════════════════════════════════════════════════════
// 🎯 HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId: crypto.randomBytes(16).toString('hex'),
    });
  }

  const token = await requireAuth(req, res);
  if (!token) return;

  const requestId = crypto.randomBytes(16).toString('hex');
  const ip        = getClientIp(req);

  await logSecurityEvent({
    type: 'OTHER_LISTINGS_REQUEST' as any,
    ip,
    userId: token.id,
    requestId,
  });

  // Rate limit
  const rl = await rateLimitApi(req);
  res.setHeader('X-RateLimit-Limit', 30);
  res.setHeader('X-RateLimit-Remaining', rl.remaining);

  if (!rl.ok) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      requestId,
    });
  }

  setSecurityHeaders(res, requestId);

  // Parse query parameters
  const {
    ownerId,
    agentId,
    developerId,
    society,
    excludeId,
    limit: limitRaw,
    page: pageRaw,
  } = req.query as unknown as QueryParams;

  // Determine entity filter
  const entityFilters: Record<string, unknown>[] = [];

  if (ownerId && isValidObjectId(ownerId)) {
    entityFilters.push({ owner: new mongoose.Types.ObjectId(ownerId) });
  }
  if (agentId && isValidObjectId(agentId)) {
    entityFilters.push({ agentId: new mongoose.Types.ObjectId(agentId) });
  }
  if (developerId && isValidObjectId(developerId)) {
    entityFilters.push({ developerId: new mongoose.Types.ObjectId(developerId) });
  }
  if (society) {
    // Society is a string field; apply case-insensitive partial match
    const safeSociety = clampText(society, 80);
    if (safeSociety) {
      entityFilters.push({
        $or: [
          { society: { $regex: safeSociety, $options: 'i' } },
          { 'projectDetails.projectName': { $regex: safeSociety, $options: 'i' } },
        ],
      });
    }
  }

  if (entityFilters.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Must specify at least one entity identifier (ownerId, agentId, developerId, or society).',
      requestId,
    });
  }

  // Build filter
  const baseFilter: mongoose.FilterQuery<IProperty> = {
    ...(PUBLIC_PROPERTY_FILTER as mongoose.FilterQuery<IProperty>),
  };

  if (entityFilters.length === 1) {
    Object.assign(baseFilter, entityFilters[0]);
  } else {
    baseFilter.$or = entityFilters;
  }

  // Exclude main listing if provided
  if (excludeId && isValidObjectId(excludeId)) {
    baseFilter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }

  // Pagination
  const limitNum = clampInt(limitRaw, 1, MAX_LIMIT);
  const pageNum  = clampInt(pageRaw, 1, MAX_PAGE);
  const skip    = (pageNum - 1) * limitNum;

  // Execute
  const [rawItems, total] = await Promise.all([
    Property.find(baseFilter as mongoose.FilterQuery<IProperty>)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .maxTimeMS(MAX_TIME_MS)
      .lean(),
    Property.countDocuments(baseFilter as mongoose.FilterQuery<IProperty>).maxTimeMS(MAX_TIME_MS),
  ]);

  // (Optional) Batch lookups for owner profiles, similar to main listing API.

  const items = rawItems.map(scrubProperty);

  res.status(200).json({
    success: true,
    requestId,
    listings: items,
    pagination: {
      page:       pageNum,
      limit:      limitNum,
      total,
      pages:      Math.max(1, Math.ceil(total / limitNum)),
      hasNext:    pageNum < Math.ceil(total / limitNum),
      hasPrev:    pageNum > 1,
    },
    appliedFilters: {
      ownerId: ownerId || null,
      agentId: agentId || null,
      developerId: developerId || null,
      society: society || null,
      excludeId: excludeId || null,
    },
  });
};
