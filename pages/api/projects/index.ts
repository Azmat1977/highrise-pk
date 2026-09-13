// pages/api/projects/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import type { SortOrder, FilterQuery, PipelineStage } from 'mongoose';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project, { IProject, DeveloperBadgeTier } from '@/models/Projects';
import User from '@/models/User';
import DeveloperProfile from '@/models/DeveloperProfile';

import {
  requireAuth,
  requireDeveloper,
  getClientIp,
} from '@/lib/requireAuth';

import {
  rateLimitApi,
  rateLimitPropertyCreate,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';

import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import {
  ProjectContentSchema,
  applyProjectContentFields,
} from '@/lib/validators/projectForm';

// ============================================================================
// SECURITY HEADERS
// ============================================================================

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()'
  );
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=86400; includeSubDomains; preload'
  );
}

// ============================================================================
// CONSTANTS — Enums aligned with Projects model
// ============================================================================

const PROJECT_CATEGORIES = [
  'high_rise',
  'housing_society',
  'mixed_use',
  'commercial_plaza',
  'townhouse',
  'gated_community',
  'farmhouse_community',
  'industrial_park',
  'highrise',
  'society'
] as const;

const PROJECT_NATURES = ['residential', 'commercial', 'mixed'] as const;

const DEVELOPER_BADGES: DeveloperBadgeTier[] = [
  'new_entrant',
  'emerging',
  'trusted',
  'premium',
];

const LISTING_STATUS = ['draft', 'pending', 'verified', 'rejected'] as const;

const VERIFICATION_STATUS = ['pending', 'verified', 'rejected'] as const;

/**
 * Pakistani-friendly budget tiers — what buyers actually search.
 * Maps to PKR ranges for filtering.
 */
const BUDGET_TIERS = {
  under_50L: { min: 0, max: 5_000_000 },
  '50L_to_1Cr': { min: 5_000_000, max: 10_000_000 },
  '1Cr_to_3Cr': { min: 10_000_000, max: 30_000_000 },
  '3Cr_to_5Cr': { min: 30_000_000, max: 50_000_000 },
  above_5Cr: { min: 50_000_000, max: Number.MAX_SAFE_INTEGER },
} as const;

type BudgetTier = keyof typeof BUDGET_TIERS;

const SORT_OPTIONS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { minPrice: 1, _id: -1 },
  price_desc: { maxPrice: -1, _id: -1 },
  popularity: { highriseScore: -1, createdAt: -1 },
  most_viewed: { views: -1, createdAt: -1 },
  most_inquired: { inquiries: -1, createdAt: -1 },
} as const;

type SortKey = keyof typeof SORT_OPTIONS;

// ============================================================================
// HELPERS
// ============================================================================

function getQueryString(q: string | string[] | undefined): string {
  if (!q) return '';
  return Array.isArray(q) ? String(q[0] || '') : String(q || '');
}

function normalizeText(input: string, maxLen: number): string {
  const s = String(input || '').trim();
  if (!s) return '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n) || Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function parseFloat2(n: string | undefined): number | null {
  if (!n) return null;
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : null;
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function parseBool(v: string): boolean | null {
  const s = String(v || '').toLowerCase().trim();
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}

/** base64url helpers (no padding) */
function b64urlEncode(obj: unknown): string {
  const json = JSON.stringify(obj);
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlDecode<T = unknown>(token: string): T | null {
  try {
    const t = String(token || '').trim();
    if (!t) return null;
    let b64 = t.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const raw = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type CursorPayload = { createdAt: string; _id: string };

/**
 * Pakistani price formatter — Crore/Lac display.
 */
function formatPricePK(price: number): string {
  if (!price || price <= 0) return 'Price on request';
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(2)} Crore`;
  if (price >= 100_000) return `${(price / 100_000).toFixed(2)} Lac`;
  return `Rs ${price.toLocaleString()}`;
}

/**
 * Auto-derive Project.developerBadge tier from developer's completed projects.
 * Evidence ladder — aligned with computeDeveloperAccountability (display side):
 * 1+ delivered = Trusted Builder (a delivered project is unfakeable execution
 * proof). Display-side logic may only UPGRADE above this stored floor.
 *  0      → new_entrant
 *  1-9    → trusted
 *  10+    → premium
 * Admin can override later via badge.ts endpoint.
 */
function deriveBadgeFromProjectCount(count: number): DeveloperBadgeTier {
  if (count >= 10) return 'premium';
  if (count >= 1) return 'trusted';
  return 'new_entrant';
}

/**
 * Cloudinary public_id validation — ensures it's from our account.
 */
function isHighrisePublicId(publicId: string): boolean {
  if (!publicId || typeof publicId !== 'string') return false;
  return /^highrise\//.test(publicId) || /^projects\//.test(publicId);
}

// ============================================================================
// ZOD SCHEMA — POST validation (minimal wizard fields only)
// ============================================================================

// Rich create schema — shared contract + create-time required fields.
// The create form sends the full payload (was silently stripped by the
// old minimal wizard schema — contract collapse fix).
const ProjectCreateSchema = ProjectContentSchema.extend({
  projectName: z
    .string({ message: 'Project name is required' })
    .trim()
    .min(3, 'Project name must be at least 3 characters')
    .max(150, 'Project name cannot exceed 150 characters'),

  projectCategory: z.enum(PROJECT_CATEGORIES, {
    message: 'Invalid project category',
  }),

  projectNature: z.enum(PROJECT_NATURES, {
    message: 'Invalid project nature',
  }),

  city: z
    .string({ message: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(80, 'City cannot exceed 80 characters'),

  areaName: z
    .string({ message: 'Area is required' })
    .trim()
    .min(2, 'Area must be at least 2 characters')
    .max(120, 'Area cannot exceed 120 characters'),
});

type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

// ============================================================================
// PUBLIC RESPONSE SANITIZER
// ============================================================================

interface SanitizedProjectCard {
  _id: string;
  projectId?: string;
  slug: string;
  projectName: string;
  tagline?: string;
  shortDescription?: string;
  city: string;
  area: string;
  projectCategory: string;
  projectNature: string;
  projectStatus: string;
  saleMode?: string;

  // Trust & verification
  status: string;
  verificationStatus: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  isTrustedBuilder?: boolean;
  developerBadge?: DeveloperBadgeTier;
  badgeLabel?: string;
  badgeEmoji?: string;

  // Pricing
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  areaUnit?: string;
  marketingBadge?: string;
  priceRangeText?: string;
  startingPriceFormatted?: string;

  // Trust meta
  highriseScore?: number;
  riskLevel?: string;
  deliveryStatus?: string;
  verificationLevel?: string;

  // Media (URLs only — no public_ids)
  primaryImage: string | null;
  featureImageUrl?: string;

  // Developer snapshot (company name only — no internal contacts)
  developerId: string;
  developerName: string;
  developerLogoUrl?: string;

  // Unit type summary (V4.9.8 — auto-aggregated)
  unitTypesCount: number;
  totalUnits?: number;
  unitsAvailable?: number;

  // Geo distance (only present in geo radius searches)
  distanceKm?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Project document shape from MongoDB lean() — covers fields we project.
 * Avoids unsafe `any` while remaining flexible to schema evolution.
 */
interface LeanProjectDoc {
  _id: mongoose.Types.ObjectId | string;
  slug: string;
  projectName: string;
  tagline?: string;
  shortDescription?: string;
  city: string;
  area: string;
  projectCategory: string;
  projectNature: string;
  projectStatus: string;
  saleMode?: string;
  status: string;
  verificationStatus: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  isTrustedBuilder?: boolean;
  developerBadge?: DeveloperBadgeTier;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  areaUnit?: string;
  marketingBadge?: string;
  priceRangeText?: string;
  highriseScore?: number;
  riskLevel?: string;
  deliveryStatus?: string;
  verificationLevel?: string;
  featureImageUrl?: string;
  images?: Array<{ url?: string; isPrimary?: boolean }>;
  gallery?: Array<{ url?: string }>;
  developerId?: { _id?: mongoose.Types.ObjectId; name?: string } | string;
  developerProfile?: { name?: string; logoUrl?: string };
  unitTypeBreakdown?: Array<{
    type?: string;
    totalUnits?: number;
    availableUnits?: number;
  }>;
  totalUnits?: number;
  unitsAvailable?: number;
  createdAt: Date;
  updatedAt: Date;
  distanceKm?: number;
}

function sanitizeProjectForPublic(p: LeanProjectDoc): SanitizedProjectCard {
  // Compute primary image (3-tier fallback)
  let primaryImage: string | null = null;
  if (p.featureImageUrl) {
    primaryImage = p.featureImageUrl;
  } else if (Array.isArray(p.images) && p.images.length > 0) {
    const primary = p.images.find((img) => img?.isPrimary);
    primaryImage = primary?.url || p.images[0]?.url || null;
  } else if (Array.isArray(p.gallery) && p.gallery.length > 0) {
    primaryImage = p.gallery[0]?.url || null;
  }

  // Developer name resolution (populate or snapshot fallback)
  let developerName = '';
  let developerIdStr = '';
  if (typeof p.developerId === 'object' && p.developerId) {
    developerName = String(p.developerId.name || '');
    developerIdStr = String(p.developerId._id || '');
  } else if (typeof p.developerId === 'string') {
    developerIdStr = p.developerId;
  }
  if (!developerName && p.developerProfile?.name) {
    developerName = p.developerProfile.name;
  }

  // Badge display helpers
  const badgeLabels: Record<DeveloperBadgeTier, string> = {
    new_entrant: 'New Developer',
    emerging: 'Emerging Builder',
    trusted: 'Trusted Developer',
    premium: 'Premium Developer',
  };
  const badgeEmojis: Record<DeveloperBadgeTier, string> = {
    new_entrant: '🆕',
    emerging: '⭐',
    trusted: '🏆',
    premium: '💎',
  };

  // Unit type breakdown summary
  const unitTypesCount = Array.isArray(p.unitTypeBreakdown)
    ? p.unitTypeBreakdown.length
    : 0;

  return {
    _id: String(p._id),
    projectId: (p as any).projectId || undefined,
    slug: p.slug,
    projectName: p.projectName,
    tagline: p.tagline,
    shortDescription: p.shortDescription,
    city: p.city,
    area: p.area,
    projectCategory: p.projectCategory,
    projectNature: p.projectNature,
    projectStatus: p.projectStatus,
    saleMode: p.saleMode,

    status: p.status,
    verificationStatus: p.verificationStatus,
    isFeatured: p.isFeatured,
    isVerified: p.isVerified,
    isTrustedBuilder: p.isTrustedBuilder,
    developerBadge: p.developerBadge,
    badgeLabel: p.developerBadge ? badgeLabels[p.developerBadge] : undefined,
    badgeEmoji: p.developerBadge ? badgeEmojis[p.developerBadge] : undefined,

    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
    minArea: p.minArea,
    maxArea: p.maxArea,
    areaUnit: p.areaUnit || 'sqft',
    marketingBadge: p.marketingBadge,
    priceRangeText: p.priceRangeText,
    startingPriceFormatted:
      typeof p.minPrice === 'number' && p.minPrice > 0
        ? formatPricePK(p.minPrice)
        : undefined,

    highriseScore: p.highriseScore,
    riskLevel: p.riskLevel,
    deliveryStatus: p.deliveryStatus,
    verificationLevel: p.verificationLevel,

    primaryImage,
    featureImageUrl: p.featureImageUrl,

    developerId: developerIdStr,
    developerName,
    developerLogoUrl: p.developerProfile?.logoUrl,

    unitTypesCount,
    totalUnits: p.totalUnits,
    unitsAvailable: p.unitsAvailable,

    distanceKm: p.distanceKm,

    createdAt:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt:
      p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
  };
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({
    success: false,
    error: 'METHOD_NOT_ALLOWED',
    message: 'Method not allowed',
  });
  return;
}

// ============================================================================
// GET HANDLER — Public listing with filters
// ============================================================================

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Rate limit (Upstash)
  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  try {
    await dbConnect();

    // Optional auth — if admin, allow extra filters
    let isAdmin = false;
    try {
      const adminToken = await requireAuth(req, res);
      if (adminToken && adminToken.role === 'admin') {
        isAdmin = true;
      }
      // If requireAuth sent a 401/403 → res already sent, can't continue
      if (res.writableEnded) return;
    } catch {
      // Public access — no auth needed
      isAdmin = false;
    }

    // Re-check writable (defensive)
    if (res.writableEnded) return;

    // ───────────── Extract query params ─────────────
    const q = req.query;

    const cityValue = normalizeText(getQueryString(q.city), 80);
    const categoryValue = normalizeText(
      getQueryString(q.projectCategory),
      32
    ).toLowerCase();
    const natureValue = normalizeText(
      getQueryString(q.projectNature),
      32
    ).toLowerCase();
    const badgeValue = normalizeText(
      getQueryString(q.developerBadge),
      32
    ).toLowerCase();
    const budgetTierValue = normalizeText(
      getQueryString(q.budgetTier),
      20
    ).toLowerCase();
    const searchValue = normalizeText(getQueryString(q.search), 100);
    const developerIdValue = normalizeText(getQueryString(q.developerId), 32);
    const sortValue = normalizeText(
      getQueryString(q.sort),
      20
    ).toLowerCase() as SortKey;

    const minPriceRaw = parseFloat2(getQueryString(q.minPrice));
    const maxPriceRaw = parseFloat2(getQueryString(q.maxPrice));

    const trustedBool = parseBool(getQueryString(q.trusted));
    const featuredBool = parseBool(getQueryString(q.featured));

    // Geo radius (enterprise standard)
    const nearLat = parseFloat2(getQueryString(q.nearLat));
    const nearLng = parseFloat2(getQueryString(q.nearLng));
    const radiusKm = parseFloat2(getQueryString(q.radiusKm));
    const hasGeoSearch =
      nearLat !== null &&
      nearLng !== null &&
      radiusKm !== null &&
      radiusKm > 0 &&
      radiusKm <= 200;

    // Admin-only filters
    const statusValue = isAdmin
      ? normalizeText(getQueryString(q.status), 16).toLowerCase()
      : '';
    const verificationStatusValue = isAdmin
      ? normalizeText(getQueryString(q.verificationStatus), 16).toLowerCase()
      : '';
    const deletedValue = isAdmin
      ? normalizeText(getQueryString(q.deleted), 10).toLowerCase()
      : '';

    // Pagination
    const limitNum = clampInt(
      parseInt(getQueryString(q.limit) || '24', 10),
      1,
      100
    );
    const pageNum = clampInt(
      parseInt(getQueryString(q.page) || '1', 10),
      1,
      1_000_000
    );
    const skip = (pageNum - 1) * limitNum;
    const cursorToken = normalizeText(getQueryString(q.cursor), 400);

    // ───────────── Build filter ─────────────
    const filter: FilterQuery<IProject> = {};
    const and: FilterQuery<IProject>[] = [];

    // Soft delete gating
    if (isAdmin && deletedValue) {
      if (deletedValue === 'all') {
        // no filter
      } else if (deletedValue === 'true') {
        and.push({ isDeleted: true });
      } else if (deletedValue === 'false') {
        and.push({ isDeleted: { $ne: true } });
      }
    } else {
      and.push({ isDeleted: { $ne: true } });
    }

    // Visibility gating
    if (isAdmin) {
      if (statusValue && (LISTING_STATUS as readonly string[]).includes(statusValue)) {
        and.push({ status: statusValue as typeof LISTING_STATUS[number] });
      }
      if (
        verificationStatusValue &&
        (VERIFICATION_STATUS as readonly string[]).includes(verificationStatusValue)
      ) {
        and.push({
          verificationStatus:
            verificationStatusValue as typeof VERIFICATION_STATUS[number],
        });
      }
    } else {
      // Public: only verified projects + approved developers
      and.push({ status: 'verified' });
      and.push({ verificationStatus: 'verified' });
      and.push({ developerApprovalStatus: 'approved' });
    }

    // City filter (case-insensitive exact)
    if (cityValue) {
      and.push({
        city: { $regex: new RegExp(`^${escapeRegExp(cityValue)}$`, 'i') },
      });
    }

    // Category filter (6 types)
    if (categoryValue && (PROJECT_CATEGORIES as readonly string[]).includes(categoryValue)) {
      and.push({
        projectCategory: categoryValue as typeof PROJECT_CATEGORIES[number],
      });
    }

    // Nature filter (3 types)
    if (natureValue && (PROJECT_NATURES as readonly string[]).includes(natureValue)) {
      and.push({
        projectNature: natureValue as typeof PROJECT_NATURES[number],
      });
    }

    // Developer badge filter (4 tiers)
    if (badgeValue && (DEVELOPER_BADGES as readonly string[]).includes(badgeValue)) {
      and.push({ developerBadge: badgeValue as DeveloperBadgeTier });
    }

    // Trusted-only filter
    if (trustedBool === true) {
      and.push({ isTrustedBuilder: true });
    }

    // Featured-only filter
    if (featuredBool === true) {
      and.push({ isFeatured: true });
    }

    // Budget tier filter (Pakistani context)
    if (budgetTierValue && budgetTierValue in BUDGET_TIERS) {
      const tier = BUDGET_TIERS[budgetTierValue as BudgetTier];
      // Project price overlaps tier range
      and.push({
        $or: [
          {
            minPrice: { $gte: tier.min, $lte: tier.max },
          },
          {
            maxPrice: { $gte: tier.min, $lte: tier.max },
          },
          {
            $and: [
              { minPrice: { $lte: tier.min } },
              { maxPrice: { $gte: tier.max } },
            ],
          },
        ],
      });
    }

    // Manual price range (overrides budget tier if both supplied)
    if (minPriceRaw !== null && minPriceRaw > 0) {
      and.push({ maxPrice: { $gte: minPriceRaw } });
    }
    if (maxPriceRaw !== null && maxPriceRaw > 0) {
      and.push({ minPrice: { $lte: maxPriceRaw } });
    }

    // Developer filter
    if (developerIdValue) {
      if (!isValidObjectId(developerIdValue)) {
        res.status(400).json({
          success: false,
          error: 'INVALID_DEVELOPER_ID',
          message: 'Invalid developerId',
        });
        return;
      }
      and.push({ developerId: new mongoose.Types.ObjectId(developerIdValue) });
    }

    // Text search
    if (searchValue) {
      const safe = escapeRegExp(searchValue);
      const rx = new RegExp(safe, 'i');
      and.push({
        $or: [
          { projectName: rx },
          { city: rx },
          { area: rx },
          { tagline: rx },
        ],
      });
    }

    if (and.length) filter.$and = and;

    // ───────────── Sort selection ─────────────
    const sortKey: SortKey =
      sortValue && sortValue in SORT_OPTIONS ? sortValue : 'newest';
    // Cast to numeric sort spec — required by both .sort() and $geoNear $sort stage
    const sortObj = SORT_OPTIONS[sortKey] as Record<string, 1 | -1>;

    // ───────────── GEO RADIUS SEARCH (special path) ─────────────
    if (hasGeoSearch) {
      // Use $geoNear aggregation — uses 2dsphere index
      const radiusMeters = (radiusKm as number) * 1000;

      const pipeline: PipelineStage[] = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [nearLng as number, nearLat as number],
            },
            distanceField: 'distanceMeters',
            maxDistance: radiusMeters,
            spherical: true,
            query: filter,
          },
        },
        {
          $addFields: {
            distanceKm: { $divide: ['$distanceMeters', 1000] },
          },
        },
        { $sort: sortObj },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: 'users',
            localField: 'developerId',
            foreignField: '_id',
            as: 'developerData',
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $addFields: {
            developerId: {
              $cond: {
                if: { $gt: [{ $size: '$developerData' }, 0] },
                then: { $arrayElemAt: ['$developerData', 0] },
                else: '$developerId',
              },
            },
          },
        },
        { $project: { developerData: 0, distanceMeters: 0 } },
      ];

      const docs = (await Project.aggregate(pipeline).option({
        maxTimeMS: 3000,
      })) as LeanProjectDoc[];

      const projects = docs.map((p) => sanitizeProjectForPublic(p));

      // Cache geo searches briefly (location-specific)
      if (!isAdmin) {
        res.setHeader(
          'Cache-Control',
          'public, s-maxage=15, stale-while-revalidate=60'
        );
      } else {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
      }

      res.status(200).json({
        success: true,
        projects,
        geoSearch: {
          nearLat,
          nearLng,
          radiusKm,
          resultCount: projects.length,
        },
        pagination: {
          mode: 'geo',
          page: pageNum,
          limit: limitNum,
        },
      });
      return;
    }

    // ───────────── CURSOR PAGINATION ─────────────
    let cursorApplied = false;
    if (cursorToken) {
      const parsed = b64urlDecode<CursorPayload>(cursorToken);
      if (!parsed?.createdAt || !parsed?._id) {
        res.status(400).json({
          success: false,
          error: 'INVALID_CURSOR',
          message: 'Invalid cursor',
        });
        return;
      }
      const cAt = new Date(parsed.createdAt);
      if (!Number.isFinite(cAt.getTime()) || !isValidObjectId(parsed._id)) {
        res.status(400).json({
          success: false,
          error: 'INVALID_CURSOR',
          message: 'Invalid cursor payload',
        });
        return;
      }

      const cId = new mongoose.Types.ObjectId(parsed._id);
      const cursorClause: FilterQuery<IProject> = {
        $or: [
          { createdAt: { $lt: cAt } },
          { createdAt: cAt, _id: { $lt: cId } },
        ],
      };

      filter.$and = filter.$and || [];
      filter.$and.push(cursorClause);
      cursorApplied = true;
    }

    // ───────────── Projection ─────────────
    const publicProjection = [
      '_id slug projectName tagline shortDescription',
      'city area projectCategory projectNature projectStatus saleMode',
      'status verificationStatus isFeatured isVerified isTrustedBuilder',
      'developerBadge developerApprovalStatus',
      'minPrice maxPrice minArea maxArea areaUnit marketingBadge priceRangeText',
      'highriseScore riskLevel deliveryStatus verificationLevel',
      'featureImageUrl images.url images.isPrimary gallery.url',
      'developerId developerProfile.name developerProfile.logoUrl',
      'unitTypeBreakdown.type unitTypeBreakdown.totalUnits',
      'unitTypeBreakdown.availableUnits',
      'totalUnits unitsAvailable',
      'createdAt updatedAt',
    ].join(' ');

    const adminExtra = 'isDeleted deletedAt featureImagePublicId';
    const projection = isAdmin
      ? `${publicProjection} ${adminExtra}`
      : publicProjection;

    // ───────────── Execute query ─────────────
    const developerSelect = isAdmin ? 'name email role' : 'name';

    const baseQuery = Project.find(filter)
      .sort(sortObj)
      .select(projection)
      .populate({
        path: 'developerId',
        select: developerSelect,
        model: User,
      })
      .maxTimeMS(2500)
      .lean();

    const rawDocs = cursorApplied
      ? await baseQuery.limit(limitNum + 1)
      : await baseQuery.skip(skip).limit(limitNum);

    const docs = rawDocs as unknown as LeanProjectDoc[];

    let hasMore = false;
    let rows = docs;
    if (cursorApplied && docs.length > limitNum) {
      hasMore = true;
      rows = docs.slice(0, limitNum);
    }

    const projects = rows.map((p) => sanitizeProjectForPublic(p));

    // Next cursor
    let nextCursor: string | null = null;
    if (cursorApplied && projects.length > 0) {
      const last = rows[rows.length - 1];
      const lastCreatedAt =
        last.createdAt instanceof Date
          ? last.createdAt
          : new Date(last.createdAt);
      nextCursor = b64urlEncode({
        createdAt: lastCreatedAt.toISOString(),
        _id: String(last._id),
      } as CursorPayload);
    }

    // Cache headers
    if (!isAdmin) {
      res.setHeader(
        'Cache-Control',
        cursorApplied
          ? 'public, s-maxage=15, stale-while-revalidate=60'
          : 'public, s-maxage=30, stale-while-revalidate=120'
      );
    } else {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }

    // Page mode response (includes totals)
    if (!cursorApplied) {
      const total = await Project.countDocuments(filter).maxTimeMS(2500);
      const pages = Math.max(1, Math.ceil(total / limitNum));

      res.status(200).json({
        success: true,
        projects,
        sort: sortKey,
        pagination: {
          mode: 'page',
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: pages,
          hasNext: pageNum < pages,
          hasPrev: pageNum > 1,
        },
        filters: {
          city: cityValue || undefined,
          projectCategory: categoryValue || undefined,
          projectNature: natureValue || undefined,
          developerBadge: badgeValue || undefined,
          budgetTier: budgetTierValue || undefined,
          trusted: trustedBool === true ? true : undefined,
          featured: featuredBool === true ? true : undefined,
          search: searchValue || undefined,
        },
      });
      return;
    }

    // Cursor mode response
    res.status(200).json({
      success: true,
      projects,
      sort: sortKey,
      pagination: {
        mode: 'cursor',
        limit: limitNum,
        nextCursor: hasMore ? nextCursor : null,
        hasMore,
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    await logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      metadata: {
        action: 'projects_list_failed',
        endpoint: '/api/projects',
        method: 'GET',
        reason: errMsg,
      },
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch projects',
    });
  }
}

// ============================================================================
// POST HANDLER — Developer creates new project (wizard mode)
// ============================================================================

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Rate limit (10/hour — same as property creation intensity)
  const rl = await rateLimitPropertyCreate(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  // Auth: developer or admin only
  const token = await requireDeveloper(req, res);
  if (!token) return;
  if (res.writableEnded) return;

  try {
    await dbConnect();

    // Parse + validate body
    const bodyRaw = req.body || {};
    const validation = ProjectCreateSchema.safeParse(bodyRaw);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid project data',
        fieldErrors,
      });
      return;
    }

    const data: ProjectCreateInput = validation.data;

    // Create-form payment shapes (raw keys — stripped by schema, read
    // from body) → canonical installmentPlan / fullPaymentInfo
    const rawBody = bodyRaw as Record<string, unknown>;
    if (
      data.installmentPlan === undefined &&
      rawBody.installmentInfo && typeof rawBody.installmentInfo === 'object'
    ) {
      const ii = rawBody.installmentInfo as Record<string, number | undefined>;
      data.installmentPlan = {
        totalPrice:      ii.totalUnitPrice ?? 0,
        bookingAmount:   ii.bookingPayment ?? 0,
        downPayment:     ii.downPayment ?? 0,
        monthlyAmount:   ii.monthlyInstallmentAmount ?? 0,
        monthlyDuration: ii.totalMonthlyInstallments ?? 0,
        possessionAmount: ii.possessionCharges ?? 0,
      };
    }
    if (
      data.fullPaymentInfo === undefined &&
      rawBody.fullPaymentInfo && typeof rawBody.fullPaymentInfo === 'object'
    ) {
      const fp = rawBody.fullPaymentInfo as Record<string, unknown>;
      const fullPrice = Number(fp.fullPrice) || 0;
      data.fullPaymentInfo = {
        basePrice:     fullPrice,
        finalPrice:    fullPrice,
        areaSize:      Number(fp.areaSize) || 0,
        areaUnit:      typeof fp.areaUnit === 'string' ? fp.areaUnit : 'sqft',
        pricePerUnit:  Number(fp.pricePerUnit) || 0,
      };
    }

    // Validate Cloudinary public_id (if provided)
    if (data.featureImagePublicId && !isHighrisePublicId(data.featureImagePublicId)) {
      res.status(400).json({
        success: false,
        error: 'INVALID_IMAGE',
        message: 'Feature image must be uploaded via Highrise platform',
      });
      return;
    }

    // ───────────── Developer profile check ─────────────
    // Admin can create on behalf of any developer (future feature)
    // For now: only the developer themselves
    const developerId = token.id;

    const developerProfile = await DeveloperProfile.findOne({
      user: new mongoose.Types.ObjectId(developerId),
      isDeleted: { $ne: true },
    })
      .select(
        'companyName ceoName email logo socialLinks establishedYear ' +
          'completedProjectsCount status verificationLevel slug'
      )
      .lean();

    if (!developerProfile) {
      res.status(403).json({
        success: false,
        error: 'NO_DEVELOPER_PROFILE',
        message:
          'You must create a developer profile before adding projects. Visit /developer/register',
      });
      return;
    }

    // Type-narrow the lean() result
    const profile = developerProfile as unknown as {
      _id: mongoose.Types.ObjectId;
      companyName: string;
      ceoName?: string;
      email: string;
      logo?: { url?: string; public_id?: string };
      socialLinks?: { website?: string };
      establishedYear: number;
      completedProjectsCount: number;
      status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
      verificationLevel: string;
      slug: string;
    };

    // Block project creation unless developer profile is approved
    if (profile.status !== 'approved' && token.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'DEVELOPER_NOT_APPROVED',
        message: `Your developer profile status is "${profile.status}". You can only create projects once approved by Highrise.`,
        developerStatus: profile.status,
      });
      return;
    }

    // ───────────── Duplicate detection ─────────────
    const dupSearch: FilterQuery<IProject> = {
      developerId: new mongoose.Types.ObjectId(developerId),
      projectName: {
        $regex: new RegExp(`^${escapeRegExp(data.projectName)}$`, 'i'),
      },
      city: {
        $regex: new RegExp(`^${escapeRegExp(data.city)}$`, 'i'),
      },
      isDeleted: { $ne: true },
    };

    const duplicate = await Project.findOne(dupSearch)
      .select('_id slug projectName')
      .lean();

    if (duplicate) {
      const dup = duplicate as unknown as {
        _id: mongoose.Types.ObjectId;
        slug: string;
        projectName: string;
      };
      res.status(409).json({
        success: false,
        error: 'DUPLICATE_PROJECT',
        message: `You already have a project named "${dup.projectName}" in ${data.city}. Use a different name or edit the existing project.`,
        existingProject: {
          _id: String(dup._id),
          slug: dup.slug,
        },
      });
      return;
    }

    // ───────────── Build new project document ─────────────
    // Fetch decrypted phone for snapshot (if available)
    // Note: getPhone() is an instance method — we need full document not lean
    let developerPhone: string | undefined;
    try {
      const fullDevDoc = await DeveloperProfile.findById(profile._id);
      if (fullDevDoc) {
        developerPhone = fullDevDoc.getPhone() || undefined;
      }
    } catch {
      // Phone snapshot optional — don't fail project creation
      developerPhone = undefined;
    }

    // Auto-derive badge tier
    const derivedBadge = deriveBadgeFromProjectCount(
      profile.completedProjectsCount || 0
    );

    // Build coordinates + GeoJSON location
    const coords = data.coordinates;
    const projectDoc: Partial<IProject> = {
      developerId: new mongoose.Types.ObjectId(developerId),
      projectName: data.projectName,
      projectCategory: data.projectCategory,
      projectNature: data.projectNature,
      city: data.city,
      area: data.areaName ?? data.area ?? undefined,
      tagline: data.tagline ?? undefined,
      shortDescription: data.shortDescription ?? undefined,
      specificLocation: data.specificLocation ?? undefined,
      projectType: (data.projectType as IProject['projectType']) ?? undefined,
      projectStatus: (data.projectStatus as IProject['projectStatus']) || 'Planning',

      // Wizard default: draft status — developer continues via PATCH
      status: 'draft',
      verificationStatus: 'pending',
      isVerified: false,
      isFeatured: false,
      isDeleted: false,

      // Auto-derived badge (admin can override later)
      developerBadge: derivedBadge,

      // Developer profile snapshot
      developerProfile: {
        name: profile.companyName,
        ceoName: profile.ceoName,
        officialEmail: profile.email,
        contactNumber: developerPhone,
        website: profile.socialLinks?.website,
        logoUrl: profile.logo?.url,
        logoPublicId: profile.logo?.public_id,
        establishedYear: profile.establishedYear,
        completedProjectsCount: profile.completedProjectsCount,
        developerBadge: derivedBadge,
      },

      // Approval snapshot (publish gating)
      developerApprovalStatus: profile.status === 'approved' ? 'approved' : 'pending',
      developerVerifiedAt: profile.status === 'approved' ? new Date() : undefined,

      // Initial engagement counters
      views: 0,
      inquiries: 0,
      favoriteCount: 0,
      compareCount: 0,
      shareCount: 0,
      averageRating: 0,
      totalReviews: 0,
    };

    // Feature image (if provided)
    if (data.featureImageUrl) {
      projectDoc.featureImageUrl = data.featureImageUrl;
    }
    if (data.featureImagePublicId) {
      projectDoc.featureImagePublicId = data.featureImagePublicId;
    }

    // Coordinates → both legacy + GeoJSON (pre-save hook syncs location)
    if (coords) {
      projectDoc.coordinates = { lat: coords.lat, lng: coords.lng };
    }

    // Rich form content (shared contract — restores full create payload)
    applyProjectContentFields(
      projectDoc as unknown as Record<string, unknown>,
      data,
    );

    // ───────────── Create project ─────────────
    const created = await Project.create(projectDoc);

    // ───────────── Audit log ─────────────
    await logSecurityEvent({
      type: 'project_created',
      severity: 'low',
      userId: token.id,
      email: token.email,
      role: token.role,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      metadata: {
        action: 'project_created',
        projectId: String(created._id),
        projectName: created.projectName,
        city: created.city,
        projectCategory: created.projectCategory,
        developerBadge: derivedBadge,
        status: 'draft',
      },
    });

    // ───────────── Response ─────────────
    res.status(201).json({
      success: true,
      message: 'Project created successfully. Continue editing in the wizard.',
      projectId: String(created.projectId ?? ''),
      project: {
        _id: String(created._id),
        projectId: created.projectId,
        slug: created.slug,
        projectName: created.projectName,
        city: created.city,
        area: created.area,
        status: created.status,
        developerBadge: created.developerBadge,
        editUrl: `/developer/projects/${created._id}/edit`,
        previewUrl: `/projects/${created.slug}`,
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';

    // Duplicate key (MongoDB unique constraint)
    if (
      err instanceof Error &&
      (err.message.includes('E11000') || err.message.includes('duplicate key'))
    ) {
      res.status(409).json({
        success: false,
        error: 'DUPLICATE_KEY',
        message: 'A project with similar details already exists',
      });
      return;
    }

    await logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      userId: req.headers['x-user-id'] as string,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      metadata: {
        action: 'project_create_failed',
        endpoint: '/api/projects',
        method: 'POST',
        reason: errMsg,
      },
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create project',
    });
  }
}