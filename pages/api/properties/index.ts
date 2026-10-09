// pages/api/properties/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property, { IProperty, VerificationStatus } from '@/models/Property';
import AgentProfile from '@/models/AgentProfile';
import DeveloperProfile from '@/models/DeveloperProfile';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, rateLimitApiWrite } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import mongoose from 'mongoose';
import crypto from 'crypto';
import type {
  IImage,
  IContact,
  IBallot,
  IBooking,
  IParking,
  IMaintenance,
  ILegal,
  TaxPaidBy,
  UtilityStatus,
} from '@/models/Property';
import { PropertyHelpers } from '@/models/Property';
import User from '@/models/User';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';
import { hasUsablePropertyLocation, normalizePropertyMutationInput } from '@/lib/property/propertyNormalization';
import { validatePropertyMediaInput, validatePropertyFloorPlanInput } from '@/lib/property/propertyMedia';
import { normalizeDiscoveryGroup, normalizePropertyType, parsePropertyTypeList, propertyTypesForDiscoveryGroup } from '@/lib/property/propertyTaxonomy';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_LIMIT      = 48;
const DEFAULT_LIMIT  = 12;
const MAX_PAGE       = 500;
const MAX_SKIP       = 20_000;
const MAX_SEARCH_LEN = 80;
const MAX_TIME_MS    = 2500;

// Allowlists — defense in depth
const ALLOWED_SORT = new Set([
  '', 'newest', 'oldest', 'price_low', 'price_high',
  'area_low', 'area_high', 'featured', 'trust_score',
]);

const ALLOWED_LISTING_TYPE = new Set([
  'full_payment', 'rent', 'installment', 'all',
]);

const ALLOWED_PROPERTY_CATEGORY = new Set([
  'residential', 'commercial', 'plots', 'all',
]);

const ALLOWED_PROJECT_CATEGORY = new Set([
  'highrise', 'society',
]);

const ALLOWED_PROPERTY_KIND = new Set([
  'standalone', 'project', 'project_unit',
]);

const ALLOWED_LISTING_PURPOSE = new Set([
  'new_booking', 'resale', 'transfer',
]);

const ALLOWED_PROPERTY_CONDITION = new Set([
  'new_launch', 'under_construction', 'near_completion',
  'completed', 'ready_possession',
]);

// Cursor pagination — only deterministic sorts support cursor
const CURSOR_SUPPORTED_SORT = new Set(['', 'newest', 'featured', 'trust_score']);

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface MongoFilter {
  isDeleted:               { $ne: boolean };
  isFlagged?:              { $ne: boolean };
  'verification.status':   VerificationStatus;
  isFeatured?:             boolean;
  isPromoted?:             boolean;
  owner?:                  mongoose.Types.ObjectId | { $in: mongoose.Types.ObjectId[] };
  city?:                   { $regex: RegExp };
  society?:                { $regex: RegExp };
  propertyType?:           { $in: RegExp[] } | { $regex: RegExp };
  propertyCategory?:       string;
  listingType?:            string;
  listingPurpose?:         string;
  propertyCondition?:      string;
  propertyKind?:           string;
  bedrooms?:               number | { $gte: number };
  bathrooms?:              number | { $gte: number };
  price?:                  { $gte?: number; $lte?: number };
  area?:                   { $gte?: number; $lte?: number };
  agentId?:                mongoose.Types.ObjectId;
  developerId?:            mongoose.Types.ObjectId;
  projectId?:              mongoose.Types.ObjectId | { $in: mongoose.Types.ObjectId[] };
  projectCategory?:        string;
  'trustScore.level'?:     string;
  _id?:                    { $ne: mongoose.Types.ObjectId };
  $and?:                   MongoFilterCondition[];
}

// Flexible condition type for $and array entries
type MongoFilterCondition = Record<string, unknown>;

interface SortOption {
  [key: string]: 1 | -1;
}

interface CursorPayloadNewest {
  m:  'n';
  t:  string;
  id: string;
}

interface CursorPayloadFeatured {
  m:  'f';
  f:  0 | 1;
  t:  string;
  id: string;
}

interface CursorPayloadTrust {
  m:  'ts';
  s:  number;
  t:  string;
  id: string;
}

type CursorPayload =
  | CursorPayloadNewest
  | CursorPayloadFeatured
  | CursorPayloadTrust;

// Scrubbed property shape for public response
type ScrubbedProperty = Record<string, unknown>;

// POST body shape
interface PropertyCreateBody {
  title:            string;
  description:      string;
  price:            number;
  area:             number;
  unit:             string;
  city:             string;
  society:          string;
  propertyType:     string;
  listingType:      string;
  propertyCategory?: string;
  propertyKind?:    string;
  [key: string]:    unknown;
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

function getStringArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  return s ? [s] : [];
}

function cap(input: string, maxLen: number): string {
  const s = String(input ?? '').trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function allowlisted(v: string, set: Set<string>): string {
  const s = String(v ?? '').toLowerCase().trim();
  return set.has(s) ? s : '';
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function isSafeHttpsUrl(url: string): boolean {
  const u = String(url ?? '').trim();
  if (!u)                       return false;
  if (!/^https:\/\//i.test(u)) return false;
  if (/javascript:/i.test(u))  return false;
  if (/data:/i.test(u))        return false;
  return true;
}

function normalizeArrayStrings(
  arr:      unknown,
  maxItems: number,
  maxLen:   number
): string[] {
  if (!Array.isArray(arr)) return [];
  const uniq = Array.from(
    new Set(
      arr
        .map((x) => String(x ?? '').trim())
        .filter(Boolean)
    )
  );
  return uniq.slice(0, maxItems).map((s) => s.slice(0, maxLen));
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

// ═══════════════════════════════════════════════════════════════
// 🖼️ SCRUB HELPERS
// Remove Cloudinary internals from public response
// ═══════════════════════════════════════════════════════════════

const SENSITIVE_KEYS = new Set([
  'public_id', 'publicId', 'cloudinaryPublicId',
  'asset_id',  'assetId',  'signature', 'etag',
  'api_key',   'apiKey',   'apiSecret', 'access_token',
]);

function scrubValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;

  // Handle Mongoose / BSON ObjectId (convert to 24-hex string)
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

// ═══════════════════════════════════════════════════════════════
// 🔐 CURSOR HELPERS
// ═══════════════════════════════════════════════════════════════

function b64UrlEncode(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64UrlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad  = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
}

function encodeCursor(payload: CursorPayload): string {
  return b64UrlEncode(JSON.stringify(payload));
}

function decodeCursor(token: string): CursorPayload | null {
  try {
    const raw    = b64UrlDecode(String(token).trim());
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (!parsed || typeof parsed !== 'object') return null;

    const m = parsed['m'];
    if (m !== 'n' && m !== 'f' && m !== 'ts') return null;

    const t  = parsed['t'];
    const id = parsed['id'];
    if (typeof t !== 'string' || typeof id !== 'string') return null;
    if (!isValidObjectId(id))                             return null;
    if (Number.isNaN(new Date(t).getTime()))              return null;

    if (m === 'n') {
      return { m: 'n', t, id };
    }

    if (m === 'ts') {
      const s = Number(parsed['s']);
      if (!Number.isFinite(s)) return null;
      return { m: 'ts', s, t, id };
    }

    // featured
    const f = Number(parsed['f']);
    if (f !== 0 && f !== 1) return null;
    return { m: 'f', f: f as 0 | 1, t, id };
  } catch {
    return null;
  }
}

function cursorConditionNewest(
  payload: CursorPayloadNewest
): MongoFilterCondition {
  const t   = new Date(payload.t);
  const oid = new mongoose.Types.ObjectId(payload.id);
  return {
    $or: [
      { createdAt: { $lt: t } },
      { createdAt: t, _id: { $lt: oid } },
    ],
  };
}

function cursorConditionFeatured(
  payload: CursorPayloadFeatured
): MongoFilterCondition {
  const t          = new Date(payload.t);
  const oid        = new mongoose.Types.ObjectId(payload.id);
  const lastWasFeatured = payload.f === 1;

  const olderInGroup: MongoFilterCondition = {
    $or: [
      { createdAt: { $lt: t } },
      { createdAt: t, _id: { $lt: oid } },
    ],
  };

  if (lastWasFeatured) {
    return {
      $or: [
        { isFeatured: { $ne: true } },
        { isFeatured: true, ...olderInGroup },
      ],
    };
  }

  return {
    $and: [{ isFeatured: { $ne: true } }, olderInGroup],
  };
}

function cursorConditionTrust(
  payload: CursorPayloadTrust
): MongoFilterCondition {
  const t   = new Date(payload.t);
  const oid = new mongoose.Types.ObjectId(payload.id);
  return {
    $or: [
      { 'trustScore.score': { $lt: payload.s } },
      {
        'trustScore.score': payload.s,
        $or: [
          { createdAt: { $lt: t } },
          { createdAt: t, _id: { $lt: oid } },
        ],
      },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// 📤 PUBLIC PROJECTION
// Only safe fields — no PII, no encryption keys, no internals
// ═══════════════════════════════════════════════════════════════

const PUBLIC_PROJECTION = [
  '_id',
  'propertyId',
  'slug',
  'title',
  'urduTitle',
  'shortDescription',
  'metaTitle',
  'metaDescription',
  'keywords',
  'canonicalUrl',
  'price',
  'priceNegotiable',
  'priceDropPercent',
  'lastPriceChangedAt',
  'previousPrice',
  'area',
  'unit',
  'city',
  'society',
  'phase',
  'block',
  'locality',
  'province',
  'formattedAddress',
  'nearbyLandmark',
  'propertyType',
  'propertySubtype',
  'propertyCategory',
  'propertyKind',
  'listingType',
  'listingPurpose',
  'propertyCondition',
  'residentialType',
  'commercialType',
  'bedrooms',
  'bathrooms',
  'furnished',
  'condition',
  'floorNumber',
  'totalFloors',
  'parkingDetails.spaces',
  'parkingDetails.included',
  'featureImageUrl',
  'images',
  'isFeatured',
  'isPromoted',
  'promotedUntil',
  'isVerified',
  'verification.status',
  'verification.verifiedAt',
  'trustScore.score',
  'trustScore.level',
  'trustScore.isPublic',
  'qualityMetrics.completenessScore',
  'trueCost.grandTotalBuyerFiler',
  'trueCost.grandTotalBuyerNonFiler',
  'trueCost.hiddenChargesDisclosed',
  'marketIntelligence.priceRating',
  'marketIntelligence.investmentScore',
  'approvals.nocStatus',
  'approvals.approvalStatus',
  'owner',
  'agentId',
  'developerId',
  'projectId',
  'projectCategory',
  'location',
  'views',
  'favoriteCount',
  'inquiryCount',
  'createdAt',
  'updatedAt',
].join(' ');

// ═══════════════════════════════════════════════════════════════
// 🏗️ SORT MAP
// ═══════════════════════════════════════════════════════════════

function buildSortOption(sortValue: string): SortOption {
  switch (sortValue) {
    case 'price_low':
      return { price: 1,  createdAt: -1, _id: -1 };
    case 'price_high':
      return { price: -1, createdAt: -1, _id: -1 };
    case 'area_high':
      return { area: -1,  createdAt: -1, _id: -1 };
    case 'area_low':
      return { area: 1,   createdAt: -1, _id: -1 };
    case 'oldest':
      return { createdAt: 1,  _id: 1 };
    case 'featured':
      return { isFeatured: -1, createdAt: -1, _id: -1 };
    case 'trust_score':
      return { 'trustScore.score': -1, createdAt: -1, _id: -1 };
    case 'newest':
    default:
      return { createdAt: -1, _id: -1 };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔍 GET — PUBLIC PROPERTY LIST
// ═══════════════════════════════════════════════════════════════

async function handleGet(
  req:       NextApiRequest,
  res:       NextApiResponse,
  requestId: string
): Promise<void> {
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

  // ── Parse query params ──────────────────────────────────────
  const q = req.query;

  const searchRaw          = cap(getString(q['search']),          MAX_SEARCH_LEN);
  const cityRaw            = cap(getString(q['city']),            60);
  const societyRaw         = cap(getString(q['society']),         120);
  const propertyTypeRaw    = cap(getString(q['propertyType']),    60);
  const minPriceRaw        = cap(getString(q['minPrice']),        16);
  const maxPriceRaw        = cap(getString(q['maxPrice']),        16);
  const minAreaRaw         = cap(getString(q['minArea']),         16);
  const maxAreaRaw         = cap(getString(q['maxArea']),         16);
  const bedroomsRaw        = cap(getString(q['bedrooms']),        8);
  const bathroomsRaw       = cap(getString(q['bathrooms']),       8);
  const projectIdRaw       = cap(getString(q['projectId']),       24);
  const listingSourceRaw   = allowlisted(getString(q['listingSource']), new Set(['owner', 'agent', 'all', '']));
  const agentIdRaw         = cap(getString(q['agentId']),         24);
  const developerIdRaw     = cap(getString(q['developerId']),     24);
  const excludeIdRaw       = cap(getString(q['excludeId']),       24);
  const cursorToken        = cap(getString(q['cursor']),          512);
  const trustLevelRaw      = cap(getString(q['trustLevel']),      20);

  const sortRaw            = allowlisted(getString(q['sort']),            ALLOWED_SORT);
  const listingTypeRaw     = allowlisted(getString(q['listingType']),     ALLOWED_LISTING_TYPE);
  const propertyCategoryRaw= allowlisted(getString(q['propertyCategory']),ALLOWED_PROPERTY_CATEGORY);
  const projectCategoryRaw = allowlisted(getString(q['projectCategory']), ALLOWED_PROJECT_CATEGORY);
  const propertyKindRaw    = allowlisted(getString(q['propertyKind']),    ALLOWED_PROPERTY_KIND);
  const listingPurposeRaw  = allowlisted(getString(q['listingPurpose']),  ALLOWED_LISTING_PURPOSE);
  const conditionRaw       = allowlisted(getString(q['condition']),       ALLOWED_PROPERTY_CONDITION);

  // Multi-value Property type contract accepts both canonical `propertyTypes`
  // and repeated legacy `propertyType` values from the existing search UI.
  const propertyTypesRaw = parsePropertyTypeList([
    ...getStringArray(q['propertyTypes']),
    ...getStringArray(q['propertyType']),
  ].flatMap((t) => String(t).split(','))).slice(0, 12);

  const limitNum = clampInt(
    parseInt(getString(q['limit']), 10) || DEFAULT_LIMIT,
    1,
    MAX_LIMIT
  );

  const isCursorMode = Boolean(cursorToken);

  if (isCursorMode && !CURSOR_SUPPORTED_SORT.has(sortRaw)) {
    badRequest(
      res,
      'Cursor pagination only supported with sort: newest, featured, trust_score.',
      requestId
    );
    return;
  }

  const pageNum = isCursorMode
    ? 1
    : clampInt(parseInt(getString(q['page']), 10) || 1, 1, MAX_PAGE);

  const skip = isCursorMode ? 0 : (pageNum - 1) * limitNum;

  if (!isCursorMode && skip > MAX_SKIP) {
    badRequest(
      res,
      `Page too deep. Maximum ~${MAX_PAGE} pages. Please refine your filters.`,
      requestId
    );
    return;
  }

  // ── Build base filter ───────────────────────────────────────
  const baseFilter: MongoFilter = {
    ...(PUBLIC_PROPERTY_FILTER as MongoFilter),
  };

  // Search (ReDoS-safe)
  if (searchRaw) {
    const safe  = escapeRegExp(searchRaw);
    const regex = new RegExp(safe, 'i');
    baseFilter.$and = baseFilter.$and ?? [];
    baseFilter.$and.push({
      $or: [
        { title:            regex },
        { urduTitle:        regex },
        { shortDescription: regex },
        { society:          regex },
        { city:             regex },
        { completeAddress:  regex },
        { nearbyLandmark:   regex },
        { 'projectDetails.projectName':   regex },
        { 'projectDetails.developerName': regex },
      ],
    });
  }

  // City (exact case-insensitive)
  if (cityRaw) {
    baseFilter.city = {
      $regex: new RegExp(`^${escapeRegExp(cityRaw)}$`, 'i'),
    };
  }

  // Society
  if (societyRaw) {
    baseFilter.society = {
      $regex: new RegExp(escapeRegExp(societyRaw), 'i'),
    };
  }

  // Listing Source Filter (Owner Direct vs Agent/Developer)
  if (listingSourceRaw && listingSourceRaw !== 'all') {
    const roles = listingSourceRaw === 'owner' ? ['owner'] : ['agent', 'developer', 'admin'];
    const usersWithRole = await User.find({ role: { $in: roles } }).select('_id').lean();
    const matchedUserIds = usersWithRole.map((u) => u._id);
    baseFilter.owner = { $in: matchedUserIds };
  }

  // Property taxonomy: Match both raw UI strings (e.g. "Upper Portion") and canonical types
  const requestedGroup = propertyCategoryRaw && propertyCategoryRaw !== 'all'
    ? normalizeDiscoveryGroup(propertyCategoryRaw)
    : null;

  const rawRequestedTypes = Array.from(
    new Set(
      [propertyTypeRaw, ...propertyTypesRaw]
        .map((s) => String(s ?? '').trim())
        .filter(Boolean)
    )
  );

  const canonicalTypes = parsePropertyTypeList(rawRequestedTypes);
  const groupTypes = requestedGroup ? propertyTypesForDiscoveryGroup(requestedGroup) : [];

  const allMatchingTypeStrings = Array.from(
    new Set([
      ...rawRequestedTypes,
      ...canonicalTypes,
      ...groupTypes,
    ])
  );

  if (allMatchingTypeStrings.length > 0) {
    baseFilter.propertyType = {
      $in: allMatchingTypeStrings.map((t) => new RegExp(`^${escapeRegExp(t)}$`, 'i')),
    };
  }

  // Persisted category is kept only as a compatibility filter when no canonical
  // type/group expansion is available.
  if (!allMatchingTypeStrings.length && requestedGroup && requestedGroup !== 'plots') {
    baseFilter.propertyCategory = requestedGroup;
  }

  // Listing type
  if (listingTypeRaw && listingTypeRaw !== 'all') {
    baseFilter.listingType = listingTypeRaw;
  }

  // Listing purpose
  if (listingPurposeRaw) {
    baseFilter.listingPurpose = listingPurposeRaw;
  }

  // Property condition
  if (conditionRaw) {
    baseFilter.propertyCondition = conditionRaw;
  }

  // Property kind
  if (propertyKindRaw) {
    baseFilter.propertyKind = propertyKindRaw;
  }

  // Project category
  if (projectCategoryRaw) {
    baseFilter.projectCategory = projectCategoryRaw;
  }

  // Bedrooms
  if (bedroomsRaw) {
    const n = parseInt(bedroomsRaw, 10);
    if (Number.isFinite(n) && n >= 0) {
      baseFilter.bedrooms = n >= 5 ? { $gte: 5 } : n;
    }
  }

  // Bathrooms
  if (bathroomsRaw) {
    const n = parseInt(bathroomsRaw, 10);
    if (Number.isFinite(n) && n >= 0) {
      baseFilter.bathrooms = n >= 5 ? { $gte: 5 } : n;
    }
  }

  // Price range
  if (minPriceRaw || maxPriceRaw) {
    const minN = Number(minPriceRaw);
    const maxN = Number(maxPriceRaw);
    const pRange: { $gte?: number; $lte?: number } = {};
    if (Number.isFinite(minN) && minN >= 0) pRange.$gte = minN;
    if (Number.isFinite(maxN) && maxN >= 0) pRange.$lte = maxN;
    if (Object.keys(pRange).length > 0)     baseFilter.price = pRange;
  }

  // Area range
  if (minAreaRaw || maxAreaRaw) {
    const minN = Number(minAreaRaw);
    const maxN = Number(maxAreaRaw);
    const aRange: { $gte?: number; $lte?: number } = {};
    if (Number.isFinite(minN) && minN >= 0) aRange.$gte = minN;
    if (Number.isFinite(maxN) && maxN >= 0) aRange.$lte = maxN;
    if (Object.keys(aRange).length > 0)     baseFilter.area = aRange;
  }

  // Agent filter (direct ref)
  if (agentIdRaw && isValidObjectId(agentIdRaw)) {
    baseFilter.agentId = new mongoose.Types.ObjectId(agentIdRaw);
  }

  // Developer filter (direct ref)
  if (developerIdRaw && isValidObjectId(developerIdRaw)) {
    baseFilter.developerId = new mongoose.Types.ObjectId(developerIdRaw);
  }

  // Project filter
  if (projectIdRaw && isValidObjectId(projectIdRaw)) {
    baseFilter.projectId = new mongoose.Types.ObjectId(projectIdRaw);
  }

  // Exclude a specific property (e.g. on detail page "similar listings")
  if (excludeIdRaw && isValidObjectId(excludeIdRaw)) {
    baseFilter._id = { $ne: new mongoose.Types.ObjectId(excludeIdRaw) };
  }

  // Trust level filter (public-facing Highrise exclusive)
  const ALLOWED_TRUST = new Set([
    'premium', 'trusted', 'standard', 'basic', 'unverified',
  ]);
  if (trustLevelRaw && ALLOWED_TRUST.has(trustLevelRaw)) {
    baseFilter['trustScore.level'] = trustLevelRaw;
  }

  // ── Cursor ──────────────────────────────────────────────────
  const filter: MongoFilter = { ...baseFilter };

  if (isCursorMode) {
    const payload = decodeCursor(cursorToken);
    if (!payload) {
      badRequest(res, 'Invalid cursor token.', requestId);
      return;
    }

    // Enforce cursor mode matches sort
    if (sortRaw === 'featured'    && payload.m !== 'f')  {
      badRequest(res, 'Cursor token is not valid for sort=featured.',    requestId);
      return;
    }
    if (sortRaw === 'trust_score' && payload.m !== 'ts') {
      badRequest(res, 'Cursor token is not valid for sort=trust_score.', requestId);
      return;
    }
    if (
      (sortRaw === 'newest' || sortRaw === '') &&
      payload.m !== 'n'
    ) {
      badRequest(res, 'Cursor token is not valid for sort=newest.', requestId);
      return;
    }

    filter.$and = filter.$and ?? [];

    if (payload.m === 'f') {
      filter.$and.push(cursorConditionFeatured(payload));
    } else if (payload.m === 'ts') {
      filter.$and.push(cursorConditionTrust(payload));
    } else {
      filter.$and.push(cursorConditionNewest(payload));
    }
  }

  // ── Sort ────────────────────────────────────────────────────
  const sortOption = buildSortOption(sortRaw);

  // ── Execute ─────────────────────────────────────────────────
  const fetchLimit = isCursorMode ? limitNum + 1 : limitNum;

  const [rawItems, total] = await Promise.all([
    Property.find(filter as mongoose.FilterQuery<IProperty>)
      .select(PUBLIC_PROJECTION)
      .sort(sortOption)
      .skip(skip)
      .limit(fetchLimit)
      .maxTimeMS(MAX_TIME_MS)
      .lean(),
    Property.countDocuments(
      baseFilter as mongoose.FilterQuery<IProperty>
    ).maxTimeMS(MAX_TIME_MS),
  ]);

  // ── Retrieve Owner Profiles (Batch Lookups - Ref Safety Guard) ────────────────
  const uniqueOwnerIds = Array.from(
    new Set(rawItems.map((item) => item.owner?.toString()).filter(Boolean))
  ).map((id) => new mongoose.Types.ObjectId(id));

  const matchedOwners = await User.find({ _id: { $in: uniqueOwnerIds } })
    .select('_id name role slug listingCount')
    .lean();

  const ownerLookupMap = new Map(matchedOwners.map((u) => [u._id.toString(), u]));

  // ── Scrub + paginate ────────────────────────────────────────
  let items = rawItems.map((item) => {
    const scrubbed = scrubProperty(item);
    const ownerIdStr = item.owner?.toString();
    const ownerInfo = ownerIdStr ? ownerLookupMap.get(ownerIdStr) : null;

    scrubbed.ownerName = ownerInfo?.name || 'Verified Member';
    scrubbed.ownerRole = ownerInfo?.role || 'owner';
    scrubbed.ownerSlug = ownerInfo?.slug || '';
    scrubbed.ownerListingCount = (ownerInfo as Record<string, unknown>)?.listingCount as number || 0;
    return scrubbed;
  });

  let hasNext      = false;
  let nextCursor: string | null = null;

  if (isCursorMode) {
    if (items.length > limitNum) {
      hasNext = true;
      items   = items.slice(0, limitNum);
    }

    const last = items[items.length - 1];
    if (hasNext && last) {
      const lastCreatedAt = String(last['createdAt'] ?? '');
      const lastId        = String(last['_id'] ?? '');

      if (lastCreatedAt && lastId && isValidObjectId(lastId)) {
        if (sortRaw === 'featured') {
          const f = last['isFeatured'] === true ? 1 : 0;
          nextCursor = encodeCursor({
            m:  'f',
            f:  f as 0 | 1,
            t:  new Date(lastCreatedAt).toISOString(),
            id: lastId,
          });
        } else if (sortRaw === 'trust_score') {
          const ts = last['trustScore'] as Record<string, unknown> | undefined;
          const s  = Number(ts?.['score'] ?? 0);
          nextCursor = encodeCursor({
            m:  'ts',
            s,
            t:  new Date(lastCreatedAt).toISOString(),
            id: lastId,
          });
        } else {
          nextCursor = encodeCursor({
            m:  'n',
            t:  new Date(lastCreatedAt).toISOString(),
            id: lastId,
          });
        }
      }
    }
  } else {
    hasNext = pageNum < Math.ceil(total / limitNum);
  }

  const pages   = Math.max(1, Math.ceil(total / limitNum));
  const hasPrev = isCursorMode ? Boolean(cursorToken) : pageNum > 1;

  // ── Cache headers ───────────────────────────────────────────
  // Pure public route — safe to cache at CDN
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=30, stale-while-revalidate=120'
  );
  res.setHeader('Vary', 'Accept-Encoding');

  res.status(200).json({
    success: true,
    requestId,
    properties: items,
    pagination: {
      mode:       isCursorMode ? 'cursor' : 'offset',
      nextCursor: isCursorMode ? nextCursor : null,
      page:       isCursorMode ? null : pageNum,
      limit:      limitNum,
      total,
      pages:      isCursorMode ? null : pages,
      hasNext,
      hasPrev,
    },
    appliedFilters: {
      search:          searchRaw          || null,
      city:            cityRaw            || null,
      society:         societyRaw         || null,
      propertyType:    propertyTypesRaw.length > 0
                         ? propertyTypesRaw
                         : propertyTypeRaw  || null,
      propertyCategory: propertyCategoryRaw || null,
      listingType:     listingTypeRaw     || null,
      listingPurpose:  listingPurposeRaw  || null,
      propertyKind:    propertyKindRaw    || null,
      propertyCondition: conditionRaw     || null,
      projectCategory: projectCategoryRaw || null,
      trustLevel:      trustLevelRaw      || null,
      bedrooms:        bedroomsRaw        || null,
      bathrooms:       bathroomsRaw       || null,
      priceRange:      (minPriceRaw || maxPriceRaw)
                         ? { min: minPriceRaw || null, max: maxPriceRaw || null }
                         : null,
      areaRange:       (minAreaRaw || maxAreaRaw)
                         ? { min: minAreaRaw || null, max: maxAreaRaw || null }
                         : null,
      agentId:         agentIdRaw         || null,
      developerId:     developerIdRaw     || null,
      projectId:       projectIdRaw       || null,
      sort:            sortRaw            || 'newest',
      listingSource:   listingSourceRaw   || null,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// ✏️ POST — CREATE PROPERTY (Agent / Developer / Admin / Owner)
// Enterprise JSON body — images pre-uploaded via /api/upload
// ═══════════════════════════════════════════════════════════════

// Allowed listing types (extended for Pakistani market)
// MUST match Property model enum: ['full_payment','installment','rent']
// Phase 2 (joint_venture, lease, pre_launch, auction, rent_to_own) will be
// added when Property model enum is extended in V4.9+
const ALLOWED_LISTING_TYPES_POST = new Set([
  'full_payment',
  'installment',
  'rent',
  'pre_launch',
]);

// Any authenticated active user may create a property draft.
// Capability-specific gates (agent profile approval, developer profile
// approval) are enforced below. Role-based gate is NOT used here
// because agents and developers use role='user' + capabilities in our
// unified account system.
// Admin/superadmin always pass through.

// Safe number parser — returns undefined if invalid
function safeNum(
  val: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER
): number | undefined {
  const n = Number(val);
  if (!Number.isFinite(n)) return undefined;
  if (n < min || n > max)  return undefined;
  return n;
}

// Safe boolean coerce
function safeBool(val: unknown): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'boolean') return val;
  if (val === 'true'  || val === 1) return true;
  if (val === 'false' || val === 0) return false;
  return undefined;
}

// Safe string with trim + maxlength
function safeStr(
  val: unknown,
  maxLen = 200,
  allowEmpty = false
): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim().slice(0, maxLen);
  if (!allowEmpty && s === '') return undefined;
  return s;
}

// Safe date from string
function safeDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? undefined : d;
}

// Cloudinary URL prefix guard
const CLOUDINARY_PREFIX = 'https://res.cloudinary.com/';

function isCloudinaryUrl(url: unknown): boolean {
  return typeof url === 'string' && url.startsWith(CLOUDINARY_PREFIX);
}

async function handlePost(
  req:       NextApiRequest,
  res:       NextApiResponse,
  requestId: string
): Promise<void> {
  const ip = getClientIp(req);

  // ── Rate limit (write) ──────────────────────────────────────
  const rl = await rateLimitApiWrite(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down.',
      requestId,
    });
    return;
  }

  // ── Auth ────────────────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── Auth gate ────────────────────────────────────────────────
  // Any authenticated user may create a property draft.
  // Capability-specific profile approval checks follow below.
  // No role gate needed — ownership is tracked via property.owner ref.

  // ── Parse JSON body ─────────────────────────────────────────
  const rawBody = req.body as Record<string, unknown>;
  if (!rawBody || typeof rawBody !== 'object') {
    res.status(400).json({
      success: false,
      message: 'Request body must be JSON.',
      requestId,
    });
    return;
  }

  const { data: body } = normalizePropertyMutationInput(rawBody);

  // ── Required fields ─────────────────────────────────────────
  const requiredFields = [
    'title', 'description', 'price', 'area',
    'unit', 'city', 'propertyType', 'listingType',
  ] as const;

  for (const field of requiredFields) {
    const val = body[field];
    if (val === undefined || val === null || String(val).trim() === '') {
      res.status(400).json({
        success: false,
        message: `Field "${field}" is required.`,
        requestId,
      });
      return;
    }
  }

  // ── Listing type ─────────────────────────────────────────────
  const rawListingType = String(body.listingType ?? '').trim().toLowerCase();
  if (!ALLOWED_LISTING_TYPES_POST.has(rawListingType)) {
    res.status(400).json({
      success: false,
      message: `listingType must be one of: ${[...ALLOWED_LISTING_TYPES_POST].join(', ')}.`,
      requestId,
    });
    return;
  }

  // ── Numeric core fields ──────────────────────────────────────
  const price = Number(body.price);
  const area  = Number(body.area);

  if (!Number.isFinite(price) || price < 0) {
    res.status(400).json({
      success: false,
      message: 'price must be a valid non-negative number.',
      requestId,
    });
    return;
  }
  if (!Number.isFinite(area) || area <= 0) {
    res.status(400).json({
      success: false,
      message: 'area must be a valid positive number.',
      requestId,
    });
    return;
  }

  // ── String core fields ───────────────────────────────────────
  const title       = cap(String(body.title),       150);
  const description = cap(String(body.description), 5000);
  const city        = cap(String(body.city),        60);
  const society     = cap(String(body.society ?? ''), 120);
  const locality    = cap(String(body.locality ?? ''), 80);
  const completeAddress = cap(String(body.completeAddress ?? ''), 220);

  if (!hasUsablePropertyLocation({ society, locality, completeAddress })) {
    res.status(400).json({
      success: false,
      message: 'Provide a society, locality/area, or complete address.',
      requestId,
    });
    return;
  }

  if (title.length < 10) {
    res.status(400).json({
      success: false,
      message: 'title must be at least 10 characters.',
      requestId,
    });
    return;
  }
  if (description.length < 50) {
    res.status(400).json({
      success: false,
      message: 'description must be at least 50 characters.',
      requestId,
    });
    return;
  }

  // ── Terms acceptance ─────────────────────────────────────────
  if (body.termsAccepted !== true) {
    res.status(400).json({
      success: false,
      message: 'You must accept the terms and conditions.',
      requestId,
    });
    return;
  }

  // ── Duplicate Gating Block (5-Layer Unique Listing Engine) ───
  const duplicateHash = PropertyHelpers.generateDuplicateHash(city, society, area, price);
  const existingDuplicate = await Property.findOne({
    'fraudDetection.duplicateHash': duplicateHash,
    isDeleted: false,
  }).select('_id').lean();

  if (existingDuplicate) {
    res.status(400).json({
      success: false,
      message: 'This property has already been listed. Duplicate listings are not permitted on Highrise.pk.',
      code: 'DUPLICATE_LISTING_BLOCKED',
      requestId,
    });
    return;
  }

  // ── Property category ────────────────────────────────────────
  const propertyCategory = allowlisted(
    String(body.propertyCategory ?? 'residential'),
    new Set(['residential', 'commercial'])
  ) || 'residential';

  // ── Property kind ────────────────────────────────────────────
  const propertyKind = allowlisted(
    String(body.propertyKind ?? 'standalone'),
    new Set(['standalone', 'project', 'project_unit'])
  ) || 'standalone';

  // ── Profile approval gate (agent / developer) ────────────────
  let resolvedAgentId:     mongoose.Types.ObjectId | undefined;
  let resolvedDeveloperId: mongoose.Types.ObjectId | undefined;

  // ── Capability-specific profile approval gates ────────────────
  // Agents and developers must have approved profiles before listing.
  // Capability check uses our canonical capabilities array, not legacy role.
  if (auth.capabilities.includes('real_estate_agent')) {
    const agentProfile = await AgentProfile.findOne({ user: auth.id })
      .select('_id status')
      .lean<{ _id: mongoose.Types.ObjectId; status: string }>();

    if (!agentProfile) {
      res.status(403).json({
        success: false,
        message: 'Agent profile not found. Please complete your profile first.',
        code: 'AGENT_PROFILE_NOT_FOUND',
        requestId,
      });
      return;
    }
    if (agentProfile.status !== 'approved') {
      res.status(403).json({
        success: false,
        message: 'Your agent profile must be approved before listing properties.',
        code: 'AGENT_NOT_APPROVED',
        requestId,
      });
      return;
    }
    resolvedAgentId = agentProfile._id;
  }

  if (auth.capabilities.includes('property_developer')) {
    const devProfile = await DeveloperProfile.findOne({ user: auth.id })
      .select('_id status')
      .lean<{ _id: mongoose.Types.ObjectId; status: string }>();

    if (!devProfile) {
      res.status(403).json({
        success: false,
        message: 'Developer profile not found. Please complete your profile first.',
        code: 'DEVELOPER_PROFILE_NOT_FOUND',
        requestId,
      });
      return;
    }
    if (devProfile.status !== 'approved') {
      res.status(403).json({
        success: false,
        message: 'Your developer profile must be approved before listing properties.',
        code: 'DEVELOPER_NOT_APPROVED',
        requestId,
      });
      return;
    }
    resolvedDeveloperId = devProfile._id;
  }

  // ── Public media ownership ─────────────────────────────────
  // New media must carry a short-lived uploader-bound token. This prevents
  // a browser from attaching an arbitrary Highrise/Cloudinary asset to a new listing.
  const rawImages = Array.isArray(rawBody.images) ? rawBody.images : [];
  const canonicalImages = validatePropertyMediaInput({
    userId: auth.id,
    folder: 'properties',
    incoming: rawImages,
    existing: [],
    maxItems: 30,
  });
  if (canonicalImages.length !== rawImages.length) {
    res.status(400).json({
      success: false,
      message: 'One or more Property images are invalid or not owned by this upload session.',
      code: 'INVALID_MEDIA_OWNERSHIP',
      requestId,
    });
    return;
  }
  const images: NonNullable<IProperty['images']> = canonicalImages.map(({ resourceType: _resourceType, mimeType: _mimeType, ...image }, index) => ({
    ...image,
    order: index,
  })) as NonNullable<IProperty['images']>;

  const rawFloorPlans = Array.isArray(rawBody.floorPlanImages)
    ? rawBody.floorPlanImages
    : Array.isArray(rawBody.floorPlans) ? rawBody.floorPlans : [];
  const floorPlans = validatePropertyFloorPlanInput({
    userId: auth.id,
    incoming: rawFloorPlans,
    existing: [],
    maxItems: 5,
  });
  if (floorPlans.length !== rawFloorPlans.length) {
    res.status(400).json({
      success: false,
      message: 'One or more floor plans are invalid or not owned by this upload session.',
      code: 'INVALID_FLOORPLAN_OWNERSHIP',
      requestId,
    });
    return;
  }

  const primaryImg = images.find((i) => i?.isPrimary) ?? images[0];
  const featureImageUrl = primaryImg?.url;
  const featureImagePublicId = primaryImg?.public_id;

  // ── Build propertyData ───────────────────────────────────────
  const propertyData: Partial<IProperty> = {
    // Server-controlled — client cannot override these
    owner:      new mongoose.Types.ObjectId(auth.id),
    createdBy:  new mongoose.Types.ObjectId(auth.id),
    updatedBy:  new mongoose.Types.ObjectId(auth.id),
    agentId:    resolvedAgentId,
    developerId:resolvedDeveloperId,
    verification: { status: 'draft' },

    // ── Core ──────────────────────────────────────────────────
    title,
    description,
    price,
    area,
    unit:            cap(String(body.unit ?? 'Sq. Ft.'), 20),
    city,
    society,
    propertyType:    cap(String(body.propertyType), 60),
    propertySubtype: safeStr(body.propertySubtype, 60),
    propertyCategory: propertyCategory as 'residential' | 'commercial',
    listingType:     rawListingType as IProperty['listingType'],
    propertyKind:    propertyKind   as IProperty['propertyKind'],

    // ── Category-specific details (enterprise Mixed field) ──
    // Stores fields like: drawingRoom, plotNumber, ceilingHeight,
    // shopNumber, totalUnits, hasTubewell, genderPreference, etc.
    // ALSO stores: construction (lifecycle tracking object),
    // installmentPolicy, rentalExtras
    details: (() => {
      const baseDetails = body.details && typeof body.details === 'object'
        ? { ...(body.details as Record<string, unknown>) }
        : {};

      // ── Validate & sanitize construction sub-object ──
      const rawConstruction = baseDetails['construction'];
      if (rawConstruction && typeof rawConstruction === 'object') {
        const c = rawConstruction as Record<string, unknown>;

        const ALLOWED_PROJECT_STATUS = new Set([
          'planned', 'building', 'finishing', 'ready',
        ]);
        const ALLOWED_STAGES = new Set([
          'foundation', 'structure', 'brickwork', 'plastering',
          'electrical', 'finishing', 'final_touches',
        ]);
        const ALLOWED_SCHEDULE = new Set([
          'on_time', 'delayed', 'ahead',
        ]);

        const sanitized: Record<string, unknown> = {};

        // Project status (required gate)
        const ps = String(c['projectStatus'] ?? '').toLowerCase().trim();
        if (!ALLOWED_PROJECT_STATUS.has(ps)) {
          // Invalid status → drop entire construction object
          delete baseDetails['construction'];
        } else {
          sanitized['projectStatus'] = ps;

          // Building/Finishing fields
          if (ps === 'building' || ps === 'finishing') {
            const stage = String(c['currentStage'] ?? '').toLowerCase().trim();
            if (ALLOWED_STAGES.has(stage)) {
              sanitized['currentStage'] = stage;
            }

            const progress = safeNum(c['progressPercent'], 0, 100);
            if (typeof progress === 'number') {
              sanitized['progressPercent'] = progress;
            }

            const conStart = safeDate(c['constructionStart']);
            if (conStart) sanitized['constructionStart'] = conStart;

            const expComp = safeDate(c['expectedCompletion']);
            if (expComp) sanitized['expectedCompletion'] = expComp;

            const handover = safeDate(c['handoverDate']);
            if (handover) sanitized['handoverDate'] = handover;

            const moveIn = safeDate(c['moveInDate']);
            if (moveIn) sanitized['moveInDate'] = moveIn;

            // Schedule status
            const sched = String(c['scheduleStatus'] ?? '').toLowerCase().trim();
            if (ALLOWED_SCHEDULE.has(sched)) {
              sanitized['scheduleStatus'] = sched;

              // Delay fields (only if delayed)
              if (sched === 'delayed') {
                const origComp = safeDate(c['originalCompletion']);
                if (origComp) sanitized['originalCompletion'] = origComp;

                const delayMonths = safeNum(c['delayMonths'], 0, 600);
                if (typeof delayMonths === 'number') {
                  sanitized['delayMonths'] = delayMonths;
                }

                const reason = safeStr(c['delayReason'], 1000);
                if (reason) sanitized['delayReason'] = reason;
              }
            }
          }

          // Pre-launch fields (only if planned)
          if (ps === 'planned') {
            const launch = safeDate(c['expectedLaunch']);
            if (launch) sanitized['expectedLaunch'] = launch;

            const booking = safeDate(c['bookingOpens']);
            if (booking) sanitized['bookingOpens'] = booking;

            const expComp = safeDate(c['expectedCompletion']);
            if (expComp) sanitized['expectedCompletion'] = expComp;

            const discount = safeNum(c['preLaunchDiscount'], 0, 50);
            if (typeof discount === 'number') {
              sanitized['preLaunchDiscount'] = discount;
            }
          }

          // Ready fields (only if ready)
          if (ps === 'ready') {
            const yearBuilt = safeNum(c['yearBuilt'], 1900,
              new Date().getFullYear());
            if (typeof yearBuilt === 'number') {
              sanitized['yearBuilt'] = yearBuilt;
            }

            const yearReno = safeNum(c['yearRenovated'], 1900,
              new Date().getFullYear());
            if (typeof yearReno === 'number') {
              sanitized['yearRenovated'] = yearReno;
            }
          }

          baseDetails['construction'] = sanitized;
        }
      }

      return baseDetails;
    })(),

    // ── Bilingual SEO ─────────────────────────────────────────
    urduTitle:           safeStr(body.urduTitle, 200),
    shortDescription:    safeStr(body.shortDescription, 500),
    investmentHighlights:safeStr(body.investmentHighlights, 2000),
    whyBuyThis:          safeStr(body.whyBuyThis, 2000),

    // ── Listing metadata ──────────────────────────────────────
    listingPurpose: allowlisted(
      String(body.listingPurpose ?? ''),
      new Set(['new_booking', 'resale', 'transfer'])
    ) as IProperty['listingPurpose'] || undefined,

    propertyCondition: allowlisted(
      String(body.propertyCondition ?? ''),
      new Set(['new_launch','under_construction','near_completion','completed','ready_possession'])
    ) as IProperty['propertyCondition'] || undefined,

    // ── Project link ──────────────────────────────────────────
    projectCategory: allowlisted(
      String(body.projectCategory ?? ''),
      ALLOWED_PROJECT_CATEGORY
    ) as IProperty['projectCategory'] || undefined,
  };

  // Project ID (only if project_unit or project kind)
  if (propertyKind !== 'standalone' && body.projectId) {
    const pidStr = cap(String(body.projectId), 24);
    if (isValidObjectId(pidStr)) {
      propertyData.projectId = new mongoose.Types.ObjectId(pidStr);
    }
  }

  // ── Location ──────────────────────────────────────────────────
  // Form sends location as nested object: body.location.{city,address,...}
  // Support both nested and flat (backward compat)
  const locRaw = (body.location && typeof body.location === 'object'
    ? body.location as Record<string, unknown>
    : {}) as Record<string, unknown>;

  propertyData.province        = safeStr(body.province ?? locRaw['province'], 60);
  propertyData.locality        = safeStr(body.locality ?? locRaw['locality'], 80);
  propertyData.phase           = safeStr(body.phase ?? locRaw['phase'], 60);
  propertyData.block           = safeStr(body.block ?? locRaw['block'], 60);
  propertyData.streetNumber    = safeStr(body.streetNumber ?? locRaw['street'], 40);
  propertyData.plotNumber      = safeStr(body.plotNumber, 40);
  propertyData.completeAddress = safeStr(body.completeAddress ?? locRaw['address'], 220);
  propertyData.nearbyLandmark  = safeStr(body.nearbyLandmark ?? locRaw['nearbyLandmarks'], 120);
  propertyData.formattedAddress= safeStr(body.formattedAddress, 220);

  // Override society from nested if present
  if (locRaw['societyName']) {
    propertyData.society = cap(String(locRaw['societyName']), 120);
  }

  // Coordinates (map pin — validated against Pakistan bounds)
  // Support nested: body.location.coordinates.{lat,lng}
  // and flat:      body.coordinates.{lat,lng}
  const coordsRaw = (locRaw['coordinates'] && typeof locRaw['coordinates'] === 'object'
    ? locRaw['coordinates'] as Record<string, unknown>
    : body.coordinates && typeof body.coordinates === 'object'
      ? body.coordinates as Record<string, unknown>
      : {}) as Record<string, unknown>;

  const lat = safeNum(coordsRaw['lat'], -90, 90);
  const lng = safeNum(coordsRaw['lng'], -180, 180);
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    PropertyHelpers.isValidPakistanCoordinates(lat, lng)
  ) {
    propertyData.coordinates = { lat, lng };
  }

  // ── Size & Measurements ───────────────────────────────────────
  propertyData.coveredArea      = safeNum(body.coveredArea,   0);
  propertyData.coveredAreaUnit  = safeStr(body.coveredAreaUnit, 20);
  propertyData.plotWidth        = safeNum(body.plotWidth,     0);
  propertyData.plotDepth        = safeNum(body.plotDepth,     0);
  propertyData.grossArea        = safeNum(body.grossArea,     0);
  propertyData.netArea          = safeNum(body.netArea,       0);
  propertyData.balconyArea      = safeNum(body.balconyArea,   0);
  propertyData.unitNumber       = safeStr(body.unitNumber,    60);

  // ── Residential rooms ─────────────────────────────────────────
  propertyData.bedrooms            = safeNum(body.bedrooms,   0, 50);
  propertyData.bathrooms           = safeNum(body.bathrooms,  0, 30);
  propertyData.kitchens            = safeNum(body.kitchens,   0, 10);
  propertyData.storeRooms          = safeNum(body.storeRooms, 0, 10);
  propertyData.floors              = safeNum(body.floors,     1, 10);
  propertyData.floorNumber         = safeNum(body.floorNumber,0, 200);
  propertyData.totalFloors         = safeNum(body.totalFloors,1, 200);
  propertyData.balconies           = safeNum(body.balconies,  0, 10);
  propertyData.servantQuarterRooms = safeNum(body.servantQuarterRooms, 0, 5);
    // Only set residential basementArea for residential properties
  if (propertyCategory === 'residential') {
    propertyData.basementArea = safeNum(body.basementArea, 0);
  }
  propertyData.numberOfLifts       = safeNum(body.numberOfLifts, 0, 20);

  propertyData.drawingRoom    = safeBool(body.drawingRoom);
  propertyData.diningRoom     = safeBool(body.diningRoom);
  propertyData.livingRoom     = safeBool(body.livingRoom);
  propertyData.servantQuarter = safeBool(body.servantQuarter);
  propertyData.basement       = safeBool(body.basement);
  propertyData.rooftopAccess  = safeBool(body.rooftopAccess);
  propertyData.porch          = safeBool(body.porch);
  propertyData.isCornerUnit   = safeBool(body.isCornerUnit);
  propertyData.hasAttachedBath= safeBool(body.hasAttachedBath);
  propertyData.priceNegotiable= safeBool(body.priceNegotiable);

  // Enums
  const lawnAllowed = new Set(['none','front','back','both','rooftop','']);
  propertyData.lawnGarden = lawnAllowed.has(String(body.lawnGarden ?? ''))
    ? (String(body.lawnGarden) as IProperty['lawnGarden'])
    : undefined;

  propertyData.garage      = safeStr(body.garage, 60);
  propertyData.apartmentType = safeStr(body.apartmentType, 60);
  propertyData.view          = safeStr(body.view, 60);

  // ── Plot-specific ─────────────────────────────────────────────
  const plotCatAllowed = new Set(['residential','commercial','industrial','agricultural','']);
  propertyData.plotCategory = plotCatAllowed.has(String(body.plotCategory ?? ''))
    ? String(body.plotCategory) as IProperty['plotCategory']
    : undefined;

  const plotStatusAllowed = new Set(['file','on_ground','']);
  propertyData.plotStatus = plotStatusAllowed.has(String(body.plotStatus ?? ''))
    ? String(body.plotStatus) as IProperty['plotStatus']
    : undefined;

  const devStatusAllowed = new Set([
    'undeveloped','under_development','semi_developed','fully_developed','',
  ]);
  propertyData.developmentStatus = devStatusAllowed.has(String(body.developmentStatus ?? ''))
    ? String(body.developmentStatus) as IProperty['developmentStatus']
    : undefined;

  propertyData.isCornerPlot  = safeBool(body.isCornerPlot);
  propertyData.hasBoundaryWall= safeBool(body.hasBoundaryWall);
  propertyData.openSides     = safeStr(body.openSides, 60);
  propertyData.facingDirection= safeStr(body.facingDirection, 40);
  propertyData.cornerCharges  = safeNum(body.cornerCharges, 0);

  // specialFacing[] — array of strings
  if (Array.isArray(body.specialFacing)) {
    propertyData.specialFacing = normalizeArrayStrings(body.specialFacing, 10, 40);
  }

  // ── Commercial-specific ───────────────────────────────────────
  propertyData.floorLocation    = safeStr(body.floorLocation, 80);
  propertyData.shopPosition     = safeStr(body.shopPosition, 80);
  propertyData.shopFrontWidth   = safeNum(body.shopFrontWidth, 0);
  propertyData.shopDepth        = safeNum(body.shopDepth, 0);
  propertyData.shopHeight       = safeNum(body.shopHeight, 0);
  propertyData.mezzanineArea    = safeNum(body.mezzanineArea, 0);
   // Only set commercialBasementArea for commercial properties
  if (propertyCategory === 'commercial') {
    propertyData.commercialBasementArea = safeNum(body.basementArea, 0);
  }
  propertyData.hasMezzanine     = safeBool(body.hasMezzanine);
  propertyData.hasWashroom      = safeBool(body.hasWashroom);
  propertyData.hasSignage       = safeBool(body.hasSignage);
  propertyData.hasDisplayWindow = safeBool(body.hasDisplayWindow);
  propertyData.hasBasement      = safeBool(body.hasBasement);
  propertyData.shutterType      = safeStr(body.shutterType, 60);
  propertyData.electricityLoad  = safeStr(body.electricityLoad, 60);
  propertyData.ceilingHeight    = safeStr(body.ceilingHeight, 60);

  const washroomAllowed = new Set(['none','private','shared','']);
  propertyData.washroom = washroomAllowed.has(String(body.washroom ?? ''))
    ? String(body.washroom) as IProperty['washroom']
    : undefined;

  if (Array.isArray(body.suitableFor)) {
    propertyData.suitableFor = normalizeArrayStrings(body.suitableFor, 20, 60);
  }

  // ── Features ──────────────────────────────────────────────────
  const furnishedAllowed = new Set(['unfurnished','semi_furnished','fully_furnished']);
  propertyData.furnished = furnishedAllowed.has(String(body.furnished ?? ''))
    ? String(body.furnished) as IProperty['furnished']
    : 'unfurnished';

  const conditionAllowed = new Set(['brand_new','excellent','good','needs_renovation']);
  propertyData.condition = conditionAllowed.has(String(body.condition ?? ''))
    ? String(body.condition) as IProperty['condition']
    : 'excellent';

  propertyData.facing   = safeStr(body.facing, 60);
  propertyData.parking  = safeStr(body.parking, 40) ?? '0';

  // amenities[] — merge boolean flags + array
  // Boolean amenity flags from form (centralHeating, elevator, etc.)
  // are collected into the amenities[] string array
  const BOOLEAN_AMENITY_FLAGS = [
    // Interior
    'centralHeating','intercom','smartHome','doubleGlazedWindows',
    // Exterior
    'boundaryWall','garden','swimmingPool','terrace',
    // Building
    'elevator','generator','fireSafety','reception','gym',
    'buildingPool','communityHall','kidsPlayArea','prayerRoom',
    // Society
    'mosque','school','hospital','shoppingMall','parks',
    'sportsFacilities','joggingTrack','communityCenter',
    'banks','restaurants','cinema','lake','golfCourse',
    // Security
    'gatedEntry','securityGuards24x7','cctvCameras',
    'intercomSystem','smartLock','panicButton',
  ] as const;

  const amenitiesFromFlags: string[] = BOOLEAN_AMENITY_FLAGS.filter(
    (key) => body[key] === true
  );

  const amenitiesFromArray = Array.isArray(body.amenities)
    ? normalizeArrayStrings(body.amenities, 80, 80)
    : [];

  // Deduplicate
  propertyData.amenities = Array.from(
    new Set([...amenitiesFromArray, ...amenitiesFromFlags])
  ).slice(0, 100);

  // ── Pricing extras ────────────────────────────────────────────
  propertyData.pricePerUnit    = safeNum(body.pricePerUnit, 0);

  // ── Installment payment plan ──────────────────────────────────
  if (rawListingType === 'installment') {
    // Read from nested installmentPlan object (form sends it nested)
    const ipRaw = (body.installmentPlan && typeof body.installmentPlan === 'object'
      ? body.installmentPlan as Record<string, unknown>
      : {}) as Record<string, unknown>;

    propertyData.booking = {
      amount:  safeNum(ipRaw['bookingAmount'] ?? body.bookingAmount, 0),
      percent: safeNum(ipRaw['bookingPercent'] ?? body.bookingPercent, 0, 100),
      status:  allowlisted(
                 String(body.bookingStatus ?? ''),
                 new Set(['open','closing_soon','closed'])
               ) as IBooking['status'] || 'open',
    };

    propertyData.downPayment = {
      amount:           safeNum(ipRaw['downPaymentAmount'] ?? body.downPaymentAmount, 0),
      percent:          safeNum(ipRaw['downPaymentPercent'] ?? body.downPaymentPercent, 0, 100),
      dueWithin:        safeStr(body.downPaymentDueWithin, 60),
      inInstallments:   safeBool(body.downPaymentInInstallments) ?? false,
      installmentCount: safeNum(body.numberOfDPInstallments, 0),
    };

    propertyData.installmentPlan = {
      hasMonthly:       safeBool(ipRaw['hasMonthly'])    ?? false,
      monthlyAmount:    safeNum(ipRaw['monthlyAmount'],  0),
      monthlyCount:     safeNum(ipRaw['monthlyCount'],   0),
      hasQuarterly:     safeBool(ipRaw['hasQuarterly'])  ?? false,
      quarterlyAmount:  safeNum(ipRaw['quarterlyAmount'],0),
      quarterlyCount:   safeNum(ipRaw['quarterlyCount'], 0),
      hasHalfYearly:    safeBool(ipRaw['hasHalfYearly']) ?? false,
      halfYearlyAmount: safeNum(ipRaw['halfYearlyAmount'],0),
      halfYearlyCount:  safeNum(ipRaw['halfYearlyCount'],0),
      hasYearly:        safeBool(ipRaw['hasYearly'])     ?? false,
      yearlyAmount:     safeNum(ipRaw['yearlyAmount'],   0),
      yearlyCount:      safeNum(ipRaw['yearlyCount'],    0),
      planDuration:     safeNum(ipRaw['durationMonths'] ?? ipRaw['planDuration'], 0),
      planDurationUnit: 'months',
      startDate:        safeDate(ipRaw['startDate']),
    };

    propertyData.possession = {
      amount:       safeNum(ipRaw['possessionAmount'] ?? body.possessionAmount, 0),
      percent:      safeNum(ipRaw['possessionPercent'] ?? body.possessionPercent, 0, 100),
      dueOn:        safeStr(body.possessionDueOn, 60),
      expectedDate: safeDate(body.expectedPossessionDate),
      status:       safeStr(body.possessionStatus, 40),
    };

    propertyData.ballot = {
      status: allowlisted(
        String(body.ballotStatus ?? ''),
        new Set(['pending','done','not_applicable'])
      ) as IBallot['status'] || 'not_applicable',
      date:                    safeDate(body.expectedBallotDate),
      isAllocated:             safeBool(body.isPlotAllocated) ?? false,
      allocationLetterAvailable: safeBool(body.hasAllocationLetter) ?? false,
    };

    propertyData.resaleTracking = {
      isResale:              safeBool(body.isResale) ?? false,
      installmentsPaid:      safeNum(body.installmentsPaid, 0),
      installmentsRemaining: safeNum(body.installmentsRemaining, 0),
      amountPaid:            safeNum(body.amountPaid, 0),
      amountRemaining:       safeNum(body.amountRemaining, 0),
      profitAmount:          safeNum(body.ownPrice, -1_000_000_000, 1_000_000_000),
    };

    // Enterprise penalty / discount / policy fields → saved in details.installmentPolicy
    const installmentPolicy: Record<string, unknown> = {};
    if (safeNum(ipRaw['confirmationDeposit'], 0) !== undefined) {
      installmentPolicy['confirmationDeposit'] = safeNum(ipRaw['confirmationDeposit'], 0);
    }
    if (safeNum(ipRaw['latePaymentPenalty'], 0) !== undefined) {
      installmentPolicy['latePaymentPenalty'] = safeNum(ipRaw['latePaymentPenalty'], 0);
    }
    if (safeNum(ipRaw['discountOnFullPayment'], 0) !== undefined) {
      installmentPolicy['discountOnFullPayment'] = safeNum(ipRaw['discountOnFullPayment'], 0);
    }
    if (safeNum(ipRaw['transferChargePercent'], 0) !== undefined) {
      installmentPolicy['transferChargePercent'] = safeNum(ipRaw['transferChargePercent'], 0);
    }
    const cancelPolicy = safeStr(ipRaw['cancellationPolicy'], 1000);
    if (cancelPolicy) installmentPolicy['cancellationPolicy'] = cancelPolicy;

    if (Object.keys(installmentPolicy).length > 0) {
      const currentDetails = (propertyData.details ?? {}) as Record<string, unknown>;
      propertyData.details = {
        ...currentDetails,
        installmentPolicy,
      };
    }

    propertyData.otherPaymentCharges = {
      confirmationCharges:  safeNum(body.confirmationCharges, 0),
      developmentCharges:   safeNum(body.developmentChargesPayment, 0),
      latePaymentSurcharge: safeNum(body.latePaymentSurcharge, 0),
      earlyPaymentDiscount: safeNum(body.earlyPaymentDiscount, 0),
    };

    propertyData.possession = {
      amount:       safeNum(body.possessionAmount, 0),
      percent:      safeNum(body.possessionPercent, 0, 100),
      dueOn:        safeStr(body.possessionDueOn, 60),
      expectedDate: safeDate(body.expectedPossessionDate),
      status:       safeStr(body.possessionStatus, 40),
    };

    propertyData.ballot = {
      status: allowlisted(
        String(body.ballotStatus ?? ''),
        new Set(['pending','done','not_applicable'])
      ) as IBallot['status'] || 'not_applicable',
      date:                    safeDate(body.expectedBallotDate),
      isAllocated:             safeBool(body.isPlotAllocated) ?? false,
      allocationLetterAvailable: safeBool(body.hasAllocationLetter) ?? false,
    };

    propertyData.resaleTracking = {
      isResale:              safeBool(body.isResale) ?? false,
      installmentsPaid:      safeNum(body.installmentsPaid, 0),
      installmentsRemaining: safeNum(body.installmentsRemaining, 0),
      amountPaid:            safeNum(body.amountPaid, 0),
      amountRemaining:       safeNum(body.amountRemaining, 0),
      profitAmount:          safeNum(body.ownPrice, -1_000_000_000, 1_000_000_000),
    };

    propertyData.otherPaymentCharges = {
      confirmationCharges:  safeNum(body.confirmationCharges, 0),
      developmentCharges:   safeNum(body.developmentChargesPayment, 0),
      latePaymentSurcharge: safeNum(body.latePaymentSurcharge, 0),
      earlyPaymentDiscount: safeNum(body.earlyPaymentDiscount, 0),
    };
  }

  // ── Rental details ────────────────────────────────────────────
  if (rawListingType === 'rent') {
    // Form sends rentalDetails as nested object
    const rdRaw = (body.rentalDetails && typeof body.rentalDetails === 'object'
      ? body.rentalDetails as Record<string, unknown>
      : {}) as Record<string, unknown>;

    const monthlyRent = safeNum(rdRaw['monthlyRent'], 0) ?? price;
    const secMonths   = safeNum(rdRaw['securityDepositMonths'], 0, 24) ?? 0;
    const secAmount   = safeNum(rdRaw['securityDepositAmount'], 0)
                        ?? (secMonths > 0 ? secMonths * monthlyRent : 0);
    const advMonths   = safeNum(rdRaw['advanceMonths'], 0, 24) ?? 0;

    // Map preferred tenant type to familyOnly/bachelorsAllowed flags
    const tenantType = safeStr(rdRaw['preferredTenantType'], 20) ?? 'any';

    propertyData.rentalDetails = {
      monthlyRent,
      securityDeposit:           secAmount,
      advanceMonths:             advMonths,
      advanceRentMonths:         advMonths,
      minimumStayMonths:         safeNum(rdRaw['minimumLeasePeriod'], 0)  ?? 0,
      minContractMonths:         safeNum(rdRaw['minimumLeasePeriod'], 0)  ?? 0,
      maxContractMonths:         safeNum(rdRaw['maximumLeasePeriod'], 0)  ?? 0,
      leaseDurationMonths:       safeNum(rdRaw['minimumLeasePeriod'], 0)  ?? 0,
      leaseFlexible:             safeBool(rdRaw['leaseFlexible']) ?? false,
      availableFrom:             safeDate(rdRaw['availableFrom']),
      rentNegotiable:            safeBool(rdRaw['isNegotiable']) ?? false,
      maintenanceChargesMonthly: safeNum(rdRaw['maintenanceAmount'], 0),
      maintenanceIncluded:       safeBool(rdRaw['maintenanceIncluded']) ?? false,
      utilitiesIncluded:         safeBool(rdRaw['utilitiesIncluded']) ?? false,
      parkingIncluded:           safeBool(rdRaw['parkingIncluded']) ?? false,
      petsAllowed:               safeBool(rdRaw['petsAllowed']) ?? false,
      smokingAllowed:            safeBool(rdRaw['smokingAllowed']) ?? false,
      immediateAvailable:        safeBool(rdRaw['immediateAvailable']) ?? false,
      shortTermAllowed:          safeBool(rdRaw['shortTermAllowed']) ?? false,
      incrementPerYear:          safeNum(rdRaw['rentIncrementPercent'], 0, 50) ?? 0,
      preferredTenant:           tenantType,
      maxOccupants:              String(safeNum(rdRaw['maxOccupants'], 0) ?? 0),
      agreementType:             safeStr(rdRaw['agreementType'], 40),
      bills: {
        allIncluded:         safeBool(rdRaw['utilitiesIncluded']) ?? false,
        electricityIncluded: safeBool(rdRaw['electricityIncluded']) ?? false,
        gasIncluded:         safeBool(rdRaw['gasIncluded']) ?? false,
        waterIncluded:       safeBool(rdRaw['waterIncluded']) ?? false,
        internetIncluded:    safeBool(rdRaw['internetIncluded']) ?? false,
      },
      tenantPreferences: {
        familyOnly:           tenantType === 'family',
        bachelorsAllowed:     tenantType === 'any' || tenantType === 'bachelor',
        petsAllowed:          safeBool(rdRaw['petsAllowed']) ?? false,
        smokingAllowed:       safeBool(rdRaw['smokingAllowed']) ?? false,
        commercialUseAllowed: safeBool(rdRaw['commercialUseAllowed']) ?? false,
      },
    };

    // Enterprise rental extras → saved in details.rentalExtras
    const rentalExtras: Record<string, unknown> = {};
    if (safeNum(rdRaw['weeklyRent'], 0)) {
      rentalExtras['weeklyRent'] = safeNum(rdRaw['weeklyRent'], 0);
    }
    if (secMonths > 0) rentalExtras['securityDepositMonths'] = secMonths;
    if (rdRaw['genderPreference']) {
      rentalExtras['genderPreference'] = safeStr(rdRaw['genderPreference'], 20);
    }
    if (safeBool(rdRaw['mealsIncluded'])) {
      rentalExtras['mealsIncluded'] = true;
    }
    if (safeBool(rdRaw['rentIncrementYearly'])) {
      rentalExtras['rentIncrementYearly'] = true;
    }
    const furnishingStatus = safeStr(rdRaw['furnishingStatus'], 30);
    if (furnishingStatus) rentalExtras['furnishingStatus'] = furnishingStatus;

    if (Object.keys(rentalExtras).length > 0) {
      const currentDetails = (propertyData.details ?? {}) as Record<string, unknown>;
      propertyData.details = {
        ...currentDetails,
        rentalExtras,
      };
    }

    // Override price field to be monthly rent (consistency)
    if (monthlyRent > 0) {
      propertyData.price = monthlyRent;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 2 listing types (lease, pre_launch, joint_venture, auction,
  // rent_to_own) are reserved for V4.9+ after Property model migration.
  // See: ROADMAP — Section 4.2 Listing Type Expansion
  // ─────────────────────────────────────────────────────────────

  // ── Parking details (V4.9.7 — 6-Step Conversational Schema) ───
  // Form sends nested body.parking = { availability, isIncludedInPrice, ... }
  // Backward compat: also reads legacy flat body.parkingAvailable, etc.
  {
    const pRaw = (body.parking && typeof body.parking === 'object'
      ? body.parking as Record<string, unknown>
      : {}) as Record<string, unknown>;

    // Step 1 — Availability (enum-validated)
    const ALLOWED_AVAILABILITY = new Set(['dedicated', 'shared', 'none']);
    const availabilityRaw = String(pRaw['availability'] ?? '').toLowerCase().trim();
    const availability = ALLOWED_AVAILABILITY.has(availabilityRaw)
      ? (availabilityRaw as 'dedicated' | 'shared' | 'none')
      : undefined;

    // Step 5 — Location type (enum-validated)
    const ALLOWED_LOCATION_TYPE = new Set([
      'covered', 'open', 'garage', 'basement', 'driveway',
    ]);
    const locTypeRaw = String(pRaw['locationType'] ?? '').toLowerCase().trim();
    const locationType = ALLOWED_LOCATION_TYPE.has(locTypeRaw)
      ? locTypeRaw
      : undefined;

    // Legacy compat: included enum from isIncludedInPrice boolean
    const includedLegacyRaw = String(pRaw['included'] ?? '').toLowerCase().trim();
    const includedLegacy = allowlisted(
      includedLegacyRaw || (pRaw['isIncludedInPrice'] === true ? 'included' : 'separate'),
      new Set(['included', 'separate', 'optional'])
    ) as IParking['included'] || undefined;

    // Derive `available` boolean: true only for dedicated/shared
    const derivedAvailable = availability === 'dedicated' || availability === 'shared';

    // Vehicle counts
    const carSpaces        = safeNum(pRaw['carSpaces'], 0, 100);
    const motorcycleSpaces = safeNum(pRaw['motorcycleSpaces'], 0, 100);

    // Legacy total spaces — prefer client-supplied, else auto-sum
    const legacySpaces = safeNum(pRaw['spaces'], 0, 200) ??
      ((carSpaces ?? 0) + (motorcycleSpaces ?? 0) || undefined);

    // Build parkingDetails object — only include defined fields
    const parkingDetails: Partial<IParking> = {
      // Step 1
      availability,
      available: derivedAvailable || (safeBool(pRaw['available']) ?? false),

      // Step 2
      isIncludedInPrice: safeBool(pRaw['isIncludedInPrice']) ?? true,
      included:          includedLegacy,

      // Step 3 — pricing (only meaningful if not included)
      oneTimePurchaseFee: safeNum(pRaw['oneTimePurchaseFee'], 0),
      monthlyFee:         safeNum(pRaw['monthlyFee'], 0),
      price:              safeNum(pRaw['price'] ?? body.parkingPrice, 0),

      // Step 4
      carSpaces,
      motorcycleSpaces,
      spaces: legacySpaces,

      // Step 5
      locationType: locationType as IParking['locationType'],
      type:         safeStr(pRaw['type'] ?? body.parkingType, 40),
      size:         safeNum(pRaw['size'] ?? body.parkingSize, 0),
      pricePerSqft: safeNum(pRaw['pricePerSqft'] ?? body.parkingPricePerSqft, 0),

      // Step 6 — features
      isDedicated:       safeBool(pRaw['isDedicated']) ?? false,
      hasEVCharging:     safeBool(pRaw['hasEVCharging'] ?? body.hasEVCharging) ?? false,
      hasCCTV:           safeBool(pRaw['hasCCTV']) ?? false,
      hasVisitorParking: safeBool(pRaw['hasVisitorParking']) ?? false,
      hasValet:          safeBool(pRaw['hasValet']) ?? false,
      hasSecurityGuard:  safeBool(pRaw['hasSecurityGuard']) ?? false,
      specialNotes:      safeStr(pRaw['specialNotes'], 300),

      // Legacy location string (free text — kept for compat)
      location: safeStr(pRaw['location'], 80),
    };

    // Strip undefined keys so Mongoose defaults work cleanly
    for (const k of Object.keys(parkingDetails) as (keyof IParking)[]) {
      if (parkingDetails[k] === undefined) {
        delete parkingDetails[k];
      }
    }

    propertyData.parkingDetails = parkingDetails as IParking;
  }

  // ── Extra charges (developer) ─────────────────────────────────
  propertyData.extraCharges = {
    cornerCharges:          safeNum(body.cornerCharges, 0),
    facingCharges:          safeNum(body.facingCharges, 0),
    floorPreferenceCharges: safeNum(body.floorPreferenceCharges, 0),
    developmentCharges:     safeNum(body.developmentCharges, 0),
    documentationCharges:   safeNum(body.documentationCharges, 0),
    processingFee:          safeNum(body.processingFee, 0),
  };

  // ── Possession charges ────────────────────────────────────────
  propertyData.possessionCharges = {
    possessionFee:           safeNum(body.possessionFee, 0),
    electricityMeterCharges: safeNum(body.electricityMeterCharges, 0),
    gasMeterCharges:         safeNum(body.gasMeterCharges, 0),
    waterConnectionCharges:  safeNum(body.waterConnectionCharges, 0),
    generatorShare:          safeNum(body.generatorShare, 0),
    securityDeposit:         safeNum(body.securityDeposit, 0),
    advanceMaintenance:      safeNum(body.advanceMaintenance, 0),
    sinkingFund:             safeNum(body.sinkingFund, 0),
  };

  // ── Government taxes ──────────────────────────────────────────
  propertyData.governmentTaxes = {
    dcRate:   safeNum(body.dcRate, 0),
    fbrValue: safeNum(body.fbrValue, 0),
    stampDuty: {
      percent: safeNum(body.stampDutyPercent, 0, 100),
      amount:  safeNum(body.stampDutyAmount, 0),
      paidBy:  allowlisted(
                 String(body.stampDutyPaidBy ?? 'buyer'),
                 new Set(['buyer','seller','shared','negotiable'])
               ) as TaxPaidBy || 'buyer',
    },
    cvt: {
      percent: safeNum(body.cvtPercent, 0, 100),
      amount:  safeNum(body.cvtAmount, 0),
      paidBy:  allowlisted(
                 String(body.cvtPaidBy ?? 'buyer'),
                 new Set(['buyer','seller','shared','negotiable'])
               ) as TaxPaidBy || 'buyer',
    },
    wht: {
      filerAmount:    safeNum(body.whtFiler, 0),
      nonFilerAmount: safeNum(body.whtNonFiler, 0),
    },
    advanceTax: {
      filerAmount:    safeNum(body.advanceTaxFiler, 0),
      nonFilerAmount: safeNum(body.advanceTaxNonFiler, 0),
    },
  };

  // ── Transfer charges ──────────────────────────────────────────
  propertyData.transferCharges = {
    societyTransferFee:   safeNum(body.societyTransferFee, 0),
    membershipTransferFee:safeNum(body.membershipTransferFeeCharges, 0),
    nocCharges:           safeNum(body.nocCharges, 0),
    registrationFee:      safeNum(body.registrationFee, 0),
    mutationFee:          safeNum(body.mutationFee, 0),
  };

  // ── Hidden charges disclosure ─────────────────────────────────
  propertyData.hiddenChargesDisclosure = {
    escalationClause:    safeBool(body.escalationClause)   ?? false,
    escalationDetails:   safeStr(body.escalationDetails, 300),
    delayPenalty:        safeBool(body.delayPenalty)       ?? false,
    delayPenaltyDetails: safeStr(body.delayPenaltyDetails, 300),
    allChargesDisclosed: safeBool(body.allChargesDisclosed)?? false,
  };

  // ── Maintenance ───────────────────────────────────────────────
  const maintenanceApplicable = safeBool(body.maintenanceApplicable) ?? false;
  if (maintenanceApplicable) {
    propertyData.maintenance = {
      isApplicable:    true,
      included: allowlisted(
        String(body.maintenanceIncluded ?? ''),
        new Set(['included_limited','included_lifetime','not_included','optional'])
      ) as IMaintenance['included'] || 'not_included',
      calculationType:   safeStr(body.maintenanceCalculation, 60),
      perSqft:           safeNum(body.maintenancePerSqft, 0),
      fixedAmount:       safeNum(body.fixedMaintenanceAmount, 0),
      estimatedMonthly:  safeNum(body.fixedMaintenanceAmount, 0)
                          ?? safeNum(body.maintenancePerSqft, 0),
      covers: Array.isArray(body.maintenanceCovers)
        ? normalizeArrayStrings(body.maintenanceCovers, 20, 60)
        : [],
      managedBy: safeStr(body.maintenanceManagedBy, 120),
    };
  }

  // ── Infrastructure ────────────────────────────────────────────
  propertyData.infrastructure = {
    electricityStatus: allowlisted(
      String(body.electricityStatus ?? ''),
      new Set(['available','applied','not_available'])
    ) as UtilityStatus || undefined,
    electricityLoad: safeStr(body.electricityLoadInfra ?? body.electricityLoad, 60),
    gasStatus:       safeStr(body.gasStatus, 60),
    waterStatus:     safeStr(body.waterStatus, 60),
    sewerageStatus:  allowlisted(
      String(body.sewerageStatus ?? ''),
      new Set(['available','applied','not_available'])
    ) as UtilityStatus || undefined,
    internetReady:   safeBool(body.internetReady) ?? false,
    cctvCoverage:    safeBool(body.cctvCoverage) ?? false,
    streetLights:    safeBool(body.streetLights) ?? false,
    roadCondition:   safeStr(body.roadCondition, 60),
    gatedCommunity:  safeBool(body.gatedCommunity) ?? false,
    securityLevel:   safeStr(body.securityLevel, 60),
  };

  // ── Legal ─────────────────────────────────────────────────────
  propertyData.legal = {
    ownershipType: allowlisted(
      String(body.ownershipType ?? 'freehold'),
      new Set(['freehold','leasehold','power_of_attorney'])
    ) || 'freehold',
    fileType: allowlisted(
      String(body.fileType ?? ''),
      new Set(['','open_file','allocation','affidavit','registry','lease'])
    ) as ILegal['fileType'] || '',
    transferType: safeStr(body.transferType, 60, true) ?? '',
    documentationAvailable: Array.isArray(body.documentsAvailable)
      ? normalizeArrayStrings(body.documentsAvailable, 20, 60)
      : [],
    previousOwner:             safeStr(body.previousOwner, 120, true) ?? '',
    hasDispute:                safeBool(body.hasDispute) ?? false,
    disputeDetails:            safeStr(body.disputeDetails, 500, true) ?? '',
    societyMembershipRequired: safeBool(body.societyMembershipRequired) ?? false,
    membershipTransferFee:     safeNum(body.membershipTransferFee, 0) ?? null,
    taxPaidUpToDate:           safeBool(body.taxPaidUpToDate) ?? false,
  };

  // Legacy ownership fields (backward compat)
  const ownershipAllowed = new Set(['freehold','leasehold','power_of_attorney']);
  propertyData.ownershipType = ownershipAllowed.has(String(body.ownershipType ?? ''))
    ? String(body.ownershipType) as IProperty['ownershipType']
    : 'freehold';

  const possessionAllowed = new Set(['ready','under_construction','on_handover']);
  propertyData.possessionStatus = possessionAllowed.has(String(body.possessionStatus ?? ''))
    ? String(body.possessionStatus) as IProperty['possessionStatus']
    : 'ready';

  // ── Contact details ───────────────────────────────────────────
  propertyData.contactDetails = {
    personName:    safeStr(body.contactPerson, 120),
    primaryPhone:  safeStr(body.primaryPhone, 30),
    secondaryPhone:safeStr(body.secondaryPhone, 30),
    whatsappNumber:safeStr(body.whatsappNumber ?? body.contactPhone, 30),
    email:         safeStr(body.contactEmail, 254),
    preferredMethod: allowlisted(
      String(body.preferredContactMethod ?? 'any'),
      new Set(['call','whatsapp','email','any'])
    ) as IContact['preferredMethod'] || 'any',
    contactTime:           safeStr(body.bestTimeToCall ?? body.contactTime, 40),
    showPhoneOnListing:    safeBool(body.showPhoneOnListing) ?? true,
    allowWhatsappMessages: safeBool(body.allowWhatsAppMessages) ?? true,
  };

  // Legacy whatsapp + contactTime fields
  propertyData.whatsappNumber = safeStr(body.whatsappNumber, 30);
  const ctAllowed = new Set(['anytime','morning','afternoon','evening']);
  propertyData.contactTime = ctAllowed.has(String(body.contactTime ?? ''))
    ? String(body.contactTime) as IProperty['contactTime']
    : 'anytime';

  // ── Media ─────────────────────────────────────────────────────
  if (images.length > 0) {
    propertyData.images        = images;
    propertyData.featureImageUrl    = featureImageUrl;
    propertyData.featureImagePublicId = featureImagePublicId;
  }
  if (floorPlans.length > 0) {
    propertyData.floorPlans = floorPlans as IProperty['floorPlans'];
  }

  // Video URLs (validated as safe HTTPS)
  const videoFields = [
    'videoUrl','droneVideoUrl','virtualTourUrl','constructionVideoUrl',
  ] as const;

  for (const f of videoFields) {
    const v = String(body[f] ?? '').trim();
    if (v && isSafeHttpsUrl(v)) {
      (propertyData as Record<string, unknown>)[f] = v;
    }
  }

  // ── Create & Save ─────────────────────────────────────────────
  // Remove undefined keys so Mongoose defaults apply correctly
  for (const key of Object.keys(propertyData) as (keyof typeof propertyData)[]) {
    if (propertyData[key] === undefined) {
      delete propertyData[key];
    }
  }

  const property = new Property(propertyData);
  await property.save();

  // ── Security event ────────────────────────────────────────────
  await logSecurityEvent({
    type:   'property_created',
    userId: auth.id,
    role:   auth.role,
    ip,
    metadata: {
      propertyId:   property._id.toString(),
      slug:         property.slug ?? '',
      title:        property.title,
      city:         property.city,
      society:      property.society,
      listingType:  property.listingType,
      agentId:      resolvedAgentId?.toString()     ?? null,
      developerId:  resolvedDeveloperId?.toString() ?? null,
      requestId,
    },
  });

  // ── Response ──────────────────────────────────────────────────
  res.status(201).json({
    success: true,
    message: 'Property draft created. Submit it for review when the listing is complete.',
    requestId,
    property: {
      _id:                property._id.toString(),
      propertyId:         property.propertyId,
      slug:               property.slug,
      title:              property.title,
      listingType:        property.listingType,
      verificationStatus: property.verification.status,
      trustScore:         property.trustScore?.score        ?? 0,
      qualityScore:       property.qualityMetrics?.completenessScore ?? 0,
      imageCount:         property.images?.length           ?? 0,
      createdAt:          property.createdAt,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 🚦 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  try {
    await dbConnect();

    if (req.method === 'GET') {
      await handleGet(req, res, requestId);
      return;
    }

    if (req.method === 'POST') {
      await handlePost(req, res, requestId);
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      requestId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
      requestId,
      ...(process.env.NODE_ENV === 'development' && { debug: message }),
    });
  }
}