// pages/api/properties/true-cost.ts
// ═══════════════════════════════════════════════════════════════
// True Cost Calculator — Read pre-computed trueCost from property
// GET /api/properties/true-cost?id=[objectId]
// GET /api/properties/true-cost?slug=[slug]
//
// trueCost is computed by Property model pre-save hook.
// This endpoint reads the stored value — no recomputation.
//
// AUTH PATTERN:
//   getToken() directly — optional auth, no mock res, no 401 forced
//   Public visitors: token = null → public mode (verified only)
//   Owner/admin: token != null → preview mode (any status)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken }   from 'next-auth/jwt';
import dbConnect      from '@/lib/dbConnect';
import Property       from '@/models/Property';
import { rateLimitApi } from '@/lib/rateLimit';
import mongoose from 'mongoose';
import crypto   from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface TrueCostProperty {
  _id:          mongoose.Types.ObjectId;
  slug?:        string;
  title?:       string;
  listingType?: string;
  price?:       number;
  city?:        string;
  society?:     string;
  owner:        mongoose.Types.ObjectId;
  isDeleted?:   boolean;
  verification?: { status?: string };
  trueCost?: {
    basePrice:                    number;
    bookingAmount?:               number;
    downPaymentAmount?:           number;
    totalInstallmentsAmount?:     number;
    possessionAmount?:            number;
    extraChargesTotal?:           number;
    possessionChargesTotal?:      number;
    governmentTaxBuyerFiler?:     number;
    governmentTaxBuyerNonFiler?:  number;
    governmentTaxSellerFiler?:    number;
    governmentTaxSellerNonFiler?: number;
    transferChargesTotal?:        number;
    maintenanceAnnual?:           number;
    grandTotalBuyerFiler:         number;
    grandTotalBuyerNonFiler:      number;
    hiddenChargesDisclosed:       boolean;
    calculatedAt:                 Date;
  };
  trustScore?: {
    score?: number;
    level?: string;
  };
}

type SuccessResponse = {
  success:   true;
  requestId: string;
  property: {
    _id:         string;
    slug:        string;
    title:       string;
    listingType: string;
    price:       number;
    city:        string;
    society:     string;
  };
  trueCost:   TrueCostProperty['trueCost'];
  trustScore: TrueCostProperty['trustScore'];
  meta: {
    isPreview: boolean;
    isPublic:  boolean;
    cachedAt:  string;
  };
};

type ErrorResponse = {
  success:   false;
  message:   string;
  code?:     string;
  requestId: string;
};

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 2500;

// ═══════════════════════════════════════════════════════════════
// 🔧 PURE HELPERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',              requestId);
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains; preload');
  res.setHeader('X-DNS-Prefetch-Control',    'off');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
  );
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function normalizeSlug(raw: string): string {
  // Lowercase, trim, allow URL-safe chars (matches by-slug pattern)
  const s = raw.trim().toLowerCase();
  if (!s || s === 'undefined' || s === 'null') return '';
  if (!/^[a-z0-9_-]{1,180}$/.test(s)) return '';
  return s;
}

function isPubliclyVisible(property: TrueCostProperty): boolean {
  return property.verification?.status === 'verified';
}

// ═══════════════════════════════════════════════════════════════
// 🚦 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      requestId,
    });
    return;
  }

  // ── Rate limit ───────────────────────────────────────────────
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

  // ── Parse identifier — id takes priority over slug ───────────
  const idRaw   = typeof req.query['id']   === 'string' ? req.query['id'].trim()   : '';
  const slugRaw = typeof req.query['slug'] === 'string' ? req.query['slug']         : '';

  if (!idRaw && !slugRaw) {
    res.status(400).json({
      success: false,
      message: 'Provide either ?id=[objectId] or ?slug=[slug].',
      code:    'MISSING_IDENTIFIER',
      requestId,
    });
    return;
  }

  // Validate id if provided
  if (idRaw && !isValidObjectId(idRaw)) {
    res.status(400).json({
      success: false,
      message: 'Invalid property id format.',
      code:    'INVALID_ID',
      requestId,
    });
    return;
  }

  // Normalize + validate slug if provided (id takes priority)
  const slug = idRaw ? '' : normalizeSlug(slugRaw);
  if (!idRaw && !slug) {
    res.status(400).json({
      success: false,
      message: 'Invalid slug format.',
      code:    'INVALID_SLUG',
      requestId,
    });
    return;
  }

  // ── Optional auth — getToken() directly (Lesson #16) ─────────
  // NEVER use requireAuth() with a mock res for optional auth.
  // getToken() reads JWT cookie directly — no res needed, no 401 forced.
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  });

  const isLoggedIn = token !== null;
  const sessionId  = isLoggedIn ? String(token.sub ?? token.id ?? '') : null;
  const isAdmin    = isLoggedIn && token.role === 'admin';

  try {
    await dbConnect();

    // ── Build lookup filter ───────────────────────────────────
    // id takes priority — slug used only if id not provided
    const lookupFilter: mongoose.FilterQuery<typeof Property> = {
      isDeleted: { $ne: true },
      ...(idRaw ? { _id: new mongoose.Types.ObjectId(idRaw) } : { slug }),
    };

    // ── Single DB query — least-privilege projection ──────────
    // trueCost is pre-computed by model pre-save hook
    // No recomputation — return stored value directly
    const property = await Property
      .findOne(lookupFilter)
      .select(
        '_id slug title listingType price city society ' +
        'owner isDeleted verification.status ' +
        'trueCost trustScore.score trustScore.level',
      )
      .maxTimeMS(MAX_TIME_MS)
      .lean<TrueCostProperty>();

    if (!property) {
      res.status(404).json({
        success: false,
        message: 'Property not found.',
        requestId,
      });
      return;
    }

    // ── Determine ownership (in memory — no second query) ─────
    const ownerId      = property.owner instanceof mongoose.Types.ObjectId
      ? property.owner.toString()
      : String(property.owner ?? '');
    const isOwner      = isLoggedIn && sessionId === ownerId;
    const isOwnerOrAdmin = isOwner || isAdmin;

    // ── Visibility gate ───────────────────────────────────────
    const isPublic = isPubliclyVisible(property);

    if (!isPublic && !isOwnerOrAdmin) {
      // SEO-safe: non-verified properties are invisible to public
      res.status(404).json({
        success: false,
        message: 'Property not found.',
        requestId,
      });
      return;
    }

    // ── trueCost guard ────────────────────────────────────────
    // trueCost computed at save time by pre-save hook.
    // Missing = old document saved before trueCost was added.
    if (!property.trueCost) {
      res.status(404).json({
        success: false,
        message: 'True cost data not yet available for this property.',
        code:    'NO_TRUE_COST',
        requestId,
      });
      return;
    }

    // ── Cache headers ─────────────────────────────────────────
    if (isOwnerOrAdmin && !isPublic) {
      // Owner/admin preview of non-public listing — never cache
      res.setHeader('Cache-Control', 'no-store');
    } else {
      // Public verified listing — CDN cacheable
      // Longer TTL than property detail (trueCost changes less often)
      res.setHeader(
        'Cache-Control',
        'public, s-maxage=120, stale-while-revalidate=600',
      );
    }

    // ── Response ──────────────────────────────────────────────
    res.status(200).json({
      success:   true,
      requestId,
      property: {
        _id:         property._id.toString(),
        slug:        property.slug        ?? '',
        title:       property.title       ?? '',
        listingType: property.listingType ?? 'full_payment',
        price:       property.price       ?? 0,
        city:        property.city        ?? '',
        society:     property.society     ?? '',
      },
      trueCost:   property.trueCost,
      trustScore: property.trustScore,
      meta: {
        isPreview: isOwnerOrAdmin && !isPublic,
        isPublic,
        cachedAt:  new Date().toISOString(),
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch true cost data.',
      requestId,
      ...(process.env.NODE_ENV === 'development' && { debug: message } as object),
    });
  }
}