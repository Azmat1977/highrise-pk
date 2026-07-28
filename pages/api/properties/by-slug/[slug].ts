// pages/api/properties/by-slug/[slug].ts
// ═══════════════════════════════════════════════════════════════
// Public Property Detail — by slug or legacy ObjectId
// GET /api/properties/by-slug/[slug]
//
// VISIBILITY RULES:
//   verified                 → public + owner + admin
//   draft/pending/under_review/rejected/flagged → owner + admin only (preview)
//   isDeleted: true          → 404 for everyone
//
// AUTH PATTERN:
//   getToken() directly — optional auth, no mock res, no 401 forced
//   Public visitors: token = null → public mode
//   Authenticated:   token != null → check ownership
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken }   from 'next-auth/jwt';
import dbConnect      from '@/lib/dbConnect';
import Property, { IProperty, VerificationStatus } from '@/models/Property';
import { rateLimitApi } from '@/lib/rateLimit';
import mongoose from 'mongoose';
import crypto   from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface ContactDetails {
  personName?:             string;
  primaryPhone?:           string;
  secondaryPhone?:         string;
  whatsappNumber?:         string;
  email?:                  string;
  preferredMethod?:        string;
  contactTime?:            string;
  showPhoneOnListing?:     boolean;
  allowWhatsappMessages?:  boolean;
}

type PublicProperty = Record<string, unknown>;

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 2500;

// ═══════════════════════════════════════════════════════════════
// 🔧 PURE HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf  = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xf) ? xf[0] : xf;
  return (raw ?? '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

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

function normalizeSlug(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const s       = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = String(s ?? '').trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
  // Slug safety: only allow URL-safe characters (max 180 chars)
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(trimmed)) return null;
  return trimmed;
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// ═══════════════════════════════════════════════════════════════
// 🖼️ SCRUB HELPER — Remove internal / PII fields from response
// ═══════════════════════════════════════════════════════════════

const SENSITIVE_KEYS = new Set([
  'public_id',    'publicId',    'cloudinaryPublicId',
  'asset_id',     'assetId',     'signature',
  'etag',         'api_key',     'apiKey',
  'apiSecret',    'access_token','titleDeedEncrypted',
  'authorityLetterEncrypted',    'cnicCopyEncrypted',
  'internalNotes','fraudDetection',
  'ownershipProof',
  'deletedBy',    'updatedBy',   'createdBy',
]);

function scrubValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object')           return val;
  if (Array.isArray(val))                return val.map(scrubValue);

  const obj = val as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    out[k] = scrubValue(obj[k]);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// 📋 PROJECTIONS
// ═══════════════════════════════════════════════════════════════

const PUBLIC_PROJECTION = [
  '_id', 'slug', 'title', 'urduTitle', 'description', 'shortDescription',
  'investmentHighlights', 'whyBuyThis',

  // Pricing
  'price', 'priceNegotiable', 'previousPrice', 'priceDropPercent',
  'priceHistory', 'pricePerUnit',

  // Size
  'area', 'unit', 'coveredArea', 'coveredAreaUnit', 'plotWidth', 'plotDepth',
  'grossArea', 'netArea', 'balconyArea',

  // Location
  'province', 'city', 'locality', 'society', 'phase', 'block',
  'streetNumber', 'plotNumber', 'completeAddress', 'nearbyLandmark',
  'formattedAddress', 'location', 'coordinates',

  // Classification
  'propertyType', 'propertySubtype', 'propertyCategory', 'propertyKind',
  'residentialType', 'commercialType', 'typeKey', 'listingType',
  'listingPurpose', 'propertyCondition',

  // Rooms (residential)
  'bedrooms', 'bathrooms', 'drawingRoom', 'diningRoom', 'livingRoom',
  'kitchens', 'storeRooms', 'servantQuarter', 'servantQuarterRooms',
  'numberOfFloors', 'floors', 'basement', 'basementArea', 'rooftopAccess',
  'lawnGarden', 'garage', 'porch',

  // Apartment
  'apartmentType', 'floorNumber', 'totalFloors', 'view', 'balconies',
  'isCornerUnit', 'hasAttachedBath',

  // Plot
  'plotCategory', 'isCornerPlot', 'facingDirection', 'specialFacing',
  'plotStatus', 'developmentStatus', 'openSides', 'hasBoundaryWall',

  // Commercial
  'floorLocation', 'shopPosition', 'shopFrontWidth', 'shopDepth', 'shopHeight',
  'hasMezzanine', 'mezzanineArea', 'numberOfLifts', 'hasBasement',
  'commercialBasementArea', 'washroom', 'hasWashroom', 'hasSignage',
  'shutterType', 'hasDisplayWindow', 'suitableFor', 'electricityLoad',
  'ceilingHeight',

  // Features
  'furnished', 'condition', 'facing', 'parking', 'parkingDetails',
  'interiorFeatures', 'exteriorFeatures', 'buildingAmenities',
  'societyAmenities', 'securityFeatures', 'amenities',

  // Payment
  'booking', 'downPayment', 'installmentPlan', 'possession', 'ballot',
  'resaleTracking',

  // Project
  'projectId', 'projectCategory', 'projectDetails', 'agentId', 'developerId',

  // Approvals + Legal
  'approvals', 'possessionStatus', 'ownershipType', 'legal',

  // Infrastructure
  'utilities', 'infrastructure',

  // Charges (full breakdown — transparency)
  'extraCharges', 'possessionCharges', 'maintenance', 'governmentTaxes',
  'transferCharges', 'hiddenChargesDisclosure', 'totalExtraCharges',
  'totalPossessionCost', 'grandTotalWithAllCharges',

  // Media (publicIds excluded by scrubValue)
  'featureImageUrl', 'gallery', 'images', 'primaryImageIndex',
  'videoUrl', 'droneVideoUrl', 'virtualTourUrl', 'constructionVideoUrl',
  'developerVideoUrl', 'brochureUrl', 'priceListUrl', 'paymentPlanUrl',
  'floorPlans', 'unitPlans',

  // Contact (gated by gateContactDetails)
  'whatsappNumber', 'contactTime', 'contactDetails', 'rentalDetails',

  // Trust + Quality (Highrise exclusive)
  'verification.status', 'verification.verifiedAt',
  'verification.rejectionReason',
  'trustScore', 'qualityMetrics', 'trueCost', 'marketIntelligence',

  // Legacy
  'status', 'isVerified', 'isFeatured',

  // Analytics
  'views', 'favoriteCount', 'inquiryCount',

  // SEO
  'metaTitle', 'metaDescription', 'keywords', 'canonicalUrl',

  'createdAt', 'updatedAt', 'lastStatusChangedAt', 'lastPriceChangedAt',
].join(' ');

// Extra fields for owner/admin preview
const PREVIEW_EXTRA_PROJECTION = [
  'verification.internalNotes',
  'verification.requiresManualReview',
  'verification.verificationScore',
  'verification.submittedAt',
  'verification.rejectedAt',
  'verification.rejectionReason',
  'auditTrail',
  'isDeleted',
  'deletedAt',
  'isFlagged',
  'flagReason',
  'flaggedAt',
  'owner',   // needed for isOwner check below
].join(' ');

// ═══════════════════════════════════════════════════════════════
// 📞 CONTACT GATING
// ═══════════════════════════════════════════════════════════════

function gateContactDetails(
  contactDetails:  ContactDetails | undefined,
  whatsappNumber:  string | undefined,
  isOwnerOrAdmin:  boolean,
): Record<string, unknown> | null {
  if (!contactDetails && !whatsappNumber) return null;

  const cd = contactDetails ?? {};

  if (isOwnerOrAdmin) {
    return {
      personName:            cd.personName           ?? null,
      primaryPhone:          cd.primaryPhone          ?? null,
      secondaryPhone:        cd.secondaryPhone        ?? null,
      whatsappNumber:        cd.whatsappNumber        ?? whatsappNumber ?? null,
      preferredMethod:       cd.preferredMethod       ?? null,
      contactTime:           cd.contactTime           ?? null,
      showPhoneOnListing:    cd.showPhoneOnListing    ?? true,
      allowWhatsappMessages: cd.allowWhatsappMessages ?? true,
      // email never returned via this API — goes through Lead API
    };
  }

  // Public — respect privacy settings
  return {
    personName:      cd.personName ?? null,
    primaryPhone:    cd.showPhoneOnListing    ? (cd.primaryPhone   ?? null) : null,
    secondaryPhone:  cd.showPhoneOnListing    ? (cd.secondaryPhone ?? null) : null,
    whatsappNumber:  cd.allowWhatsappMessages
                       ? (cd.whatsappNumber ?? whatsappNumber ?? null)
                       : null,
    preferredMethod: cd.preferredMethod ?? null,
    contactTime:     cd.contactTime     ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════
// 🏗️ BUILD PUBLIC RESPONSE
// ═══════════════════════════════════════════════════════════════

function buildPublicResponse(
  property:       IProperty,
  isOwnerOrAdmin: boolean,
  isAdmin:        boolean,
): PublicProperty {
  const raw = property as unknown as Record<string, unknown>;

  const gatedContact = gateContactDetails(
    raw['contactDetails'] as ContactDetails | undefined,
    raw['whatsappNumber'] as string | undefined,
    isOwnerOrAdmin,
  );

  const verification = (raw['verification'] ?? {}) as Record<string, unknown>;
  const safeVerification: Record<string, unknown> = {
    status:               verification['status'],
    verifiedAt:           verification['verifiedAt']           ?? null,
    submittedAt:          verification['submittedAt']          ?? null,
    rejectionReason:      isOwnerOrAdmin
                            ? (verification['rejectionReason'] ?? null)
                            : null,
    requiresManualReview: isOwnerOrAdmin
                            ? (verification['requiresManualReview'] ?? null)
                            : null,
    verificationScore:    isOwnerOrAdmin
                            ? (verification['verificationScore'] ?? null)
                            : null,
    internalNotes:        isAdmin
                            ? (verification['internalNotes'] ?? null)
                            : undefined,
  };

  const response: PublicProperty = {
    ...scrubValue(raw) as Record<string, unknown>,
    contactDetails:   gatedContact,
    whatsappNumber:   gatedContact?.['whatsappNumber'] ?? null,
    verification:     safeVerification,
    fraudDetection:   undefined,
    ownershipProof:   undefined,
    owner:            undefined,   // never expose owner ObjectId publicly
    createdBy:        undefined,
    updatedBy:        undefined,
    deletedBy:        undefined,
    auditTrail:       isOwnerOrAdmin ? raw['auditTrail'] : undefined,
  };

  // Remove undefined keys (clean JSON output)
  for (const key of Object.keys(response)) {
    if (response[key] === undefined) delete response[key];
  }

  return response;
}

// ═══════════════════════════════════════════════════════════════
// 🚦 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
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

  // ── Slug validation ──────────────────────────────────────────
  const slug = normalizeSlug(req.query['slug']);
  if (!slug) {
    res.status(400).json({
      success: false,
      message: 'Invalid or missing property slug.',
      requestId,
    });
    return;
  }

  // ── Optional auth — getToken() directly (Lesson #16) ─────────
  // NEVER use requireAuth() with a mock res for optional auth.
  // getToken() reads the JWT cookie directly — no res needed.
  // Returns null for public visitors (no session).
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? '',
  });

  const isLoggedIn = token !== null;
  const isAdmin    = isLoggedIn && token.role === 'admin';
  const sessionId  = isLoggedIn ? String(token.sub ?? token.id ?? '') : null;

  void getClientIp(req); // available for future audit logging

  try {
    await dbConnect();

    // ── Single DB query — fetch full property ─────────────────
    // No separate gate check — visibility determined in memory
    // after single fetch. Eliminates double round trip.
    const isPreview      = isLoggedIn; // authenticated users may see preview fields
    const baseProjection = isPreview
      ? `${PUBLIC_PROJECTION} ${PREVIEW_EXTRA_PROJECTION}`
      : PUBLIC_PROJECTION;

    // Build filter: slug OR ObjectId (backward compat)
    const filter: Record<string, unknown> = {
      isDeleted: { $ne: true },
      $or: [
        { slug },
        ...(isValidObjectId(slug) ? [{ _id: slug }] : []),
      ],
    };

    const property = await Property
      .findOne(filter as mongoose.FilterQuery<IProperty>)
      .select(baseProjection)
      .maxTimeMS(MAX_TIME_MS)
      .lean<IProperty>();

    if (!property) {
      res.status(404).json({
        success: false,
        message: 'Property not found.',
        requestId,
      });
      return;
    }

    // ── Visibility gate (in memory — no second DB query) ──────
    const raw        = property as unknown as Record<string, unknown>;
    const verification = (raw['verification'] ?? {}) as Record<string, unknown>;
    const verStatus  = verification['status'] as VerificationStatus | undefined;
    const isVerified = verStatus === 'verified';

    // Determine ownership (owner field only in preview projection)
    const ownerRaw   = raw['owner'];
    const ownerId    = ownerRaw instanceof mongoose.Types.ObjectId
      ? ownerRaw.toString()
      : String(ownerRaw ?? '');
    const isOwner        = isLoggedIn && sessionId === ownerId;
    const isOwnerOrAdmin = isOwner || isAdmin;

    // Public visitor hitting non-verified property → 404
    // (SEO-safe: draft/pending/rejected never indexed)
    if (!isVerified && !isOwnerOrAdmin) {
      res.status(404).json({
        success: false,
        message: 'Property not found.',
        requestId,
      });
      return;
    }

    // ── View increment (fire-and-forget) ──────────────────────
    // Only for verified public listings (not owner/admin previews)
    // $inc on views does NOT trigger pre-save hooks — intentional
    // (pre-save hooks are for state machine / trust score / true cost)
    if (isVerified && !isOwnerOrAdmin) {
      Property
        .findByIdAndUpdate(property._id, { $inc: { views: 1 } }, { timestamps: false })
        .maxTimeMS(1000)
        .lean()
        .catch(() => { /* view count failure is non-fatal */ });
    }

    // ── Build response ────────────────────────────────────────
    const publicProperty = buildPublicResponse(property, isOwnerOrAdmin, isAdmin);

    // ── Cache headers ─────────────────────────────────────────
    if (isOwnerOrAdmin && !isVerified) {
      // Owner preview of non-public listing — never cache
      res.setHeader('Cache-Control', 'no-store');
    } else if (isVerified) {
      // Public verified — CDN cacheable (ISR revalidates every 60s)
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }

    // ── Response ──────────────────────────────────────────────
    res.status(200).json({
      success:   true,
      requestId,
      property:  publicProperty,
      meta: {
        isPublic:           isVerified,
        isPreview:          isOwnerOrAdmin && !isVerified,
        verificationStatus: verStatus ?? 'draft',
        trustScore:
          (publicProperty['trustScore'] as Record<string, unknown> | undefined)
            ?.['score'] ?? 0,
        trustLevel:
          (publicProperty['trustScore'] as Record<string, unknown> | undefined)
            ?.['level'] ?? 'unverified',
        shouldIndex: isVerified,  // frontend adds noindex if false
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property.',
      requestId,
      ...(process.env.NODE_ENV === 'development' && { debug: message }),
    });
  }
}