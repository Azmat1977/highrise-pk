// pages/api/properties/[id]/index.ts
// ═══════════════════════════════════════════════════════════════
// Owner / Public Property Endpoint
// ═══════════════════════════════════════════════════════════════
// GET   → Public detail (verified properties) + Owner/Admin full view
// PATCH → Owner content updates + 'submit' action only
//
// ARCHITECTURAL BOUNDARY (V4.8):
//   ✅ This file:  Owner can submit + update content
//   ❌ This file:  NO verify/reject/flag/unflag/feature/unfeature
//   ✅ Admin endpoint handles ALL verification actions:
//      /api/admin/properties/[propertyId]/index.ts
//
// Reasoning: Single source of truth for verification mutations
//            prevents audit log drift + state machine bypass.
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property, {
  IProperty,
  VerificationStatus,
  PropertyHelpers,
} from '@/models/Property';
import User from '@/models/User';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, rateLimitApiWrite } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import mongoose from 'mongoose';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 2500;
const CLOUDINARY_PREFIX = 'https://res.cloudinary.com/';

// Fields whose change triggers re-verification
const MAJOR_EDIT_FIELDS = new Set([
  'price', 'area', 'city', 'society',
  'propertyType', 'title', 'description',
]);

// Allowed owner actions ONLY
// Admin verification actions live in /api/admin/properties/[propertyId]
const ALLOWED_OWNER_ACTIONS = new Set(['submit']);

// Enum allowlists for PATCH validation
const FURNISHED_ENUM    = new Set(['unfurnished', 'semi_furnished', 'fully_furnished']);
const CONDITION_ENUM    = new Set(['brand_new', 'excellent', 'good', 'needs_renovation']);

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface PatchBody {
  // Content updates
  title?:            string;
  description?:      string;
  shortDescription?: string;
  price?:            number;
  area?:             number;
  unit?:             string;
  city?:             string;
  society?:          string;
  phase?:            string;
  block?:            string;
  locality?:         string;
  province?:         string;
  nearbyLandmark?:   string;
  propertyType?:     string;
  propertySubtype?:  string;
  bedrooms?:         number;
  bathrooms?:        number;
  furnished?:        string;
  condition?:        string;
  facing?:           string;
  parking?:          string;
  amenities?:        string[];
  videoUrl?:         string;
  virtualTourUrl?:   string;
  whatsappNumber?:   string;
  contactTime?:      string;
  contactDetails?:   Record<string, unknown>;
  priceNegotiable?:  boolean;
  coordinates?:      { lat: number; lng: number };

  // Media (pre-uploaded URLs from /api/upload)
  featureImageUrl?:  string;
  images?:           unknown[];
  gallery?:          unknown[];

  // Owner action only
  action?:           'submit';

  [key: string]: unknown;
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

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function normalizeId(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return String(s ?? '').trim() || null;
}

function cap(input: unknown, maxLen: number): string {
  const s = String(input ?? '').trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isSafeHttpsUrl(url: string): boolean {
  const u = String(url ?? '').trim();
  if (!u)                        return false;
  if (!/^https:\/\//i.test(u))  return false;
  if (/javascript:/i.test(u))   return false;
  if (/data:/i.test(u))         return false;
  return true;
}

// Verify user account is in usable state
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

// Verify lifecycle transition is allowed (must match Property model state machine)
const ALLOWED_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  draft:        ['pending'],
  pending:      ['under_review', 'rejected'],
  under_review: ['verified', 'rejected', 'flagged'],
  rejected:     ['under_review'],
  flagged:      ['under_review'],
  verified:     ['flagged'],
};

function isAllowedTransition(
  from: VerificationStatus,
  to:   VerificationStatus
): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

// Validate image array against Cloudinary prefix
function validateImageArray(
  arr:        unknown[],
  isGallery:  boolean
): Array<{ url: string; public_id: string; isPrimary?: boolean; caption?: string; category?: string }> {
  const valid: Array<{
    url:        string;
    public_id:  string;
    isPrimary?: boolean;
    caption?:   string;
    category?:  string;
  }> = [];

  for (const img of arr.slice(0, 30)) {
    if (!img || typeof img !== 'object') continue;
    const imgObj = img as Record<string, unknown>;

    const url      = String(imgObj['url'] ?? '').trim();
    const publicId = String(imgObj['public_id'] ?? imgObj['publicId'] ?? '').trim();

    if (!url.startsWith(CLOUDINARY_PREFIX)) continue;
    if (!publicId)                          continue;

    const item: typeof valid[number] = {
      url,
      public_id: publicId,
      caption:   typeof imgObj['caption'] === 'string'
                   ? imgObj['caption'].slice(0, 140)
                   : '',
    };

    if (isGallery) {
      item.category = 'other';
    } else {
      item.isPrimary = imgObj['isPrimary'] === true;
    }

    valid.push(item);
  }

  return valid;
}

// ═══════════════════════════════════════════════════════════════
// 🔍 GET /api/properties/[id]
// Public detail by ObjectId
// (ISR pages use by-slug/[slug].ts — this is for internal/agent use)
// ═══════════════════════════════════════════════════════════════

async function handleGet(
  req:       NextApiRequest,
  res:       NextApiResponse,
  requestId: string
): Promise<void> {
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      message: 'Too many requests.',
      requestId,
    });
    return;
  }

  const idRaw = normalizeId(req.query['id']);
  if (!idRaw || !isValidObjectId(idRaw)) {
    res.status(400).json({
      success: false,
      message: 'Invalid property ID.',
      requestId,
    });
    return;
  }

  // ── Fetch property first (single query) ─────────────────────
  const property = await Property
    .findById(idRaw)
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

  // ── Optional auth (no response side effects) ────────────────
  // Use getToken directly (NOT requireAuth) to avoid mock-response crashes
  let isOwnerOrAdmin = false;
  let isAdmin        = false;

  try {
    const { getToken } = await import('next-auth/jwt');
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token?.id && typeof token.id === 'string') {
      isAdmin = token.role === 'admin';
      isOwnerOrAdmin =
        isAdmin || property.owner?.toString() === token.id;
    }
  } catch {
    // Invalid/expired token — treat as public visitor
  }

  // ── Visibility gate ──────────────────────────────────────────
  const verStatus = property.verification?.status;
  const isPublic  = verStatus === 'verified';

  if (!isPublic && !isOwnerOrAdmin) {
    res.status(404).json({
      success: false,
      message: 'Property not found.',
      requestId,
    });
    return;
  }

  // ── View increment (public only, non-owner) ─────────────────
  if (isPublic && !isOwnerOrAdmin) {
    Property
      .findByIdAndUpdate(idRaw, { $inc: { views: 1 } })
      .maxTimeMS(1000)
      .lean()
      .catch(() => {});
  }

  // ── Strip internal fields per role ──────────────────────────
  const response = property as unknown as Record<string, unknown>;
  if (!isAdmin) {
    delete response['fraudDetection'];
    delete response['ownershipProof'];
    delete response['verification'];
    delete response['auditTrail'];
    delete response['deletedBy'];
    delete response['internalNotes'];
  }
  if (!isOwnerOrAdmin) {
    delete response['contactDetails'];
  }

  // ── Cache headers ────────────────────────────────────────────
  // Only public verified responses are CDN-cacheable
  if (isPublic && !isOwnerOrAdmin) {
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }

  res.status(200).json({
    success:   true,
    requestId,
    property:  response,
  });
}

// ═══════════════════════════════════════════════════════════════
// ✏️ PATCH /api/properties/[id]
// Owner content updates + 'submit' action only
// All verification actions → /api/admin/properties/[propertyId]
// ═══════════════════════════════════════════════════════════════

async function handlePatch(
  req:       NextApiRequest,
  res:       NextApiResponse,
  requestId: string
): Promise<void> {
  const ip = getClientIp(req);

  const rl = await rateLimitApiWrite(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      message: 'Too many requests.',
      requestId,
    });
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const idRaw = normalizeId(req.query['id']);
  if (!idRaw || !isValidObjectId(idRaw)) {
    res.status(400).json({
      success: false,
      message: 'Invalid property ID.',
      requestId,
    });
    return;
  }

  const body = req.body as PatchBody;
  if (!body || typeof body !== 'object') {
    res.status(400).json({
      success: false,
      message: 'Request body must be JSON.',
      requestId,
    });
    return;
  }

  // ── Verify actor account is active ──────────────────────────
  const actor = await User
    .findById(auth.id)
    .select('status isDeleted deletedAt role')
    .maxTimeMS(MAX_TIME_MS)
    .lean<{
      status?:    string;
      isDeleted?: boolean;
      deletedAt?: Date | null;
      role?:      string;
    }>();

  try {
    assertUserActive(actor);
  } catch (err: unknown) {
    const code    = (err as NodeJS.ErrnoException).code ?? 'FORBIDDEN';
    const message = err instanceof Error ? err.message : 'Forbidden';
    res.status(403).json({
      success: false,
      message,
      code,
      requestId,
    });
    return;
  }

  const isAdmin = auth.role === 'admin';

  // ── Load property (full document for save() with pre-save hooks) ──
  const property = await Property
    .findById(idRaw)
    .maxTimeMS(MAX_TIME_MS);

  if (!property) {
    res.status(404).json({
      success: false,
      message: 'Property not found.',
      requestId,
    });
    return;
  }

  const prop    = property as IProperty & { [key: string]: unknown };
  const ownerId = prop.owner?.toString() ?? '';
  const isOwner = ownerId === auth.id;

  // ── Authorization ───────────────────────────────────────────
  if (!isAdmin && !isOwner) {
    res.status(403).json({
      success: false,
      message: 'Forbidden.',
      requestId,
    });
    return;
  }

  // ── Trash gate ──────────────────────────────────────────────
  if (prop.isDeleted && !isAdmin) {
    res.status(409).json({
      success: false,
      message: 'This property is in Trash. Restore it before editing.',
      code:    'PROPERTY_IN_TRASH',
      requestId,
    });
    return;
  }

  const action = body.action;

  // ═══════════════════════════════════════════════════════════════
  // ── OWNER ACTION: 'submit' (draft → pending) ───────────────────
  // ═══════════════════════════════════════════════════════════════
  if (action) {
    // Reject any admin verification action sent to this endpoint
    if (!ALLOWED_OWNER_ACTIONS.has(action)) {
      res.status(400).json({
        success: false,
        message: `Action "${action}" is not allowed on this endpoint. ` +
                 `Admin verification actions must be sent to /api/admin/properties/[propertyId].`,
        code:    'ACTION_NOT_ALLOWED',
        requestId,
      });
      return;
    }

    // 'submit' — owner submits draft for admin review
    const currentStatus = (prop.verification?.status ?? 'draft') as VerificationStatus;

    if (!isAllowedTransition(currentStatus, 'pending')) {
      res.status(409).json({
        success: false,
        message: `Cannot submit from status "${currentStatus}".`,
        code:    'INVALID_TRANSITION',
        requestId,
      });
      return;
    }

    prop.verification = {
      ...(prop.verification ?? { status: 'draft' }),
      status:               'pending',
      submittedAt:          new Date(),
      requiresManualReview: true,
    };
    prop.updatedBy = new mongoose.Types.ObjectId(auth.id);

    await property.save();

    await logSecurityEvent({
      type:   'property_updated',
      userId: auth.id,
      role:   auth.role,
      ip,
      metadata: {
        propertyId: idRaw,
        action:     'submit_for_review',
        requestId,
      },
    });

    res.status(200).json({
      success:  true,
      message:  'Property submitted for review.',
      requestId,
      property: {
        _id:               idRaw,
        slug:              prop.slug,
        verificationStatus: 'pending',
      },
    });
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // ── CONTENT UPDATE (owner or admin) ────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  // Edit lock during admin review
  const currentStatus = (prop.verification?.status ?? 'draft') as VerificationStatus;
  if (currentStatus === 'under_review' && !isAdmin) {
    res.status(409).json({
      success: false,
      message: 'Property is currently under review. ' +
               'Edits are locked until review is complete.',
      code:    'UNDER_REVIEW',
      requestId,
    });
    return;
  }

  // Detect major edits (triggers reset to draft for owner)
  const majorEditDetected = Array.from(MAJOR_EDIT_FIELDS).some((field) => {
    if (body[field] === undefined) return false;
    return String(body[field]).trim() !== String(prop[field] ?? '').trim();
  });

  // ── Apply safe content updates ──────────────────────────────
  if (body.title !== undefined)            prop.title            = cap(body.title, 150);
  if (body.description !== undefined)      prop.description      = cap(body.description, 5000);
  if (body.shortDescription !== undefined) prop.shortDescription = cap(body.shortDescription, 500);

  // Price (with previousPrice tracking — pre-save hook builds priceHistory)
  if (body.price !== undefined) {
    const n = Number(body.price);
    if (Number.isFinite(n) && n >= 0) {
      prop.previousPrice = prop.price;
      prop.price         = n;
    }
  }

  // Area
  if (body.area !== undefined) {
    const n = Number(body.area);
    if (Number.isFinite(n) && n > 0) prop.area = n;
  }

  // String fields
  if (body.unit !== undefined)            prop.unit            = cap(body.unit, 20);
  if (body.city !== undefined)            prop.city            = cap(body.city, 60);
  if (body.society !== undefined)         prop.society         = cap(body.society, 120);
  if (body.phase !== undefined)           prop.phase           = cap(body.phase, 60);
  if (body.block !== undefined)           prop.block           = cap(body.block, 60);
  if (body.locality !== undefined)        prop.locality        = cap(body.locality, 80);
  if (body.province !== undefined)        prop.province        = cap(body.province, 60);
  if (body.nearbyLandmark !== undefined)  prop.nearbyLandmark  = cap(body.nearbyLandmark, 120);
  if (body.propertyType !== undefined)    prop.propertyType    = cap(body.propertyType, 60);
  if (body.propertySubtype !== undefined) prop.propertySubtype = cap(body.propertySubtype, 60);

  // Bedrooms / Bathrooms with bounds
  if (body.bedrooms !== undefined) {
    const n = parseInt(String(body.bedrooms), 10);
    if (Number.isFinite(n) && n >= 0 && n <= 50) prop.bedrooms = n;
  }

  if (body.bathrooms !== undefined) {
    const n = parseInt(String(body.bathrooms), 10);
    if (Number.isFinite(n) && n >= 0 && n <= 30) prop.bathrooms = n;
  }

  // Enum-validated fields
  if (body.furnished !== undefined) {
    const val = cap(body.furnished, 30);
    if (FURNISHED_ENUM.has(val)) {
      prop.furnished = val as IProperty['furnished'];
    }
  }

  if (body.condition !== undefined) {
    const val = cap(body.condition, 30);
    if (CONDITION_ENUM.has(val)) {
      prop.condition = val as IProperty['condition'];
    }
  }

  if (body.facing !== undefined)          prop.facing         = cap(body.facing, 60);
  if (body.parking !== undefined)         prop.parking        = cap(body.parking, 40);
  if (body.whatsappNumber !== undefined)  prop.whatsappNumber = cap(body.whatsappNumber, 30);
  if (body.contactTime !== undefined)     prop.contactTime    = cap(body.contactTime, 40) as IProperty['contactTime'];
  if (body.priceNegotiable !== undefined) prop.priceNegotiable = Boolean(body.priceNegotiable);

  // Amenities array
  if (Array.isArray(body.amenities)) {
    prop.amenities = body.amenities
      .map((a) => cap(String(a), 80))
      .filter(Boolean)
      .slice(0, 50);
  }

  // Coordinates — validate Pakistan bounds
  if (body.coordinates && typeof body.coordinates === 'object') {
    const lat = Number(body.coordinates.lat);
    const lng = Number(body.coordinates.lng);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      PropertyHelpers.isValidPakistanCoordinates(lat, lng)
    ) {
      prop.coordinates = { lat, lng };
    }
  }

  // Video URLs — safe HTTPS + YouTube/Vimeo (pre-save validates further)
  if (body.videoUrl !== undefined) {
    const url = cap(String(body.videoUrl), 2048);
    prop.videoUrl = url && isSafeHttpsUrl(url) ? url : undefined;
  }

  if (body.virtualTourUrl !== undefined) {
    const url = cap(String(body.virtualTourUrl), 2048);
    prop.virtualTourUrl = url && isSafeHttpsUrl(url) ? url : undefined;
  }

  // Feature image (Cloudinary only)
  if (body.featureImageUrl !== undefined) {
    const url = cap(String(body.featureImageUrl), 2048);
    if (url.startsWith(CLOUDINARY_PREFIX)) {
      prop.featureImageUrl = url;
    }
  }

  // Images (Cloudinary-validated)
  if (Array.isArray(body.images)) {
    prop.images = validateImageArray(body.images, false) as IProperty['images'];
  }

  // Gallery (Cloudinary-validated)
  if (Array.isArray(body.gallery)) {
    prop.gallery = validateImageArray(body.gallery, true) as IProperty['gallery'];
  }

  // Contact details (admin only — full structured update)
  if (isAdmin && body.contactDetails && typeof body.contactDetails === 'object') {
    prop.contactDetails = body.contactDetails as IProperty['contactDetails'];
  }

  // ── Major edit → reset to draft (owner must resubmit) ───────
  if (majorEditDetected && !isAdmin) {
    prop.verification = {
      ...(prop.verification ?? { status: 'draft' }),
      status:               'draft',
      requiresManualReview: true,
      lastReviewedAt:       new Date(),
    };
  }

  prop.updatedBy = new mongoose.Types.ObjectId(auth.id);

  // ── Save (triggers pre-save hooks: trustScore, qualityMetrics,
  //         fraudDetection, status sync) ───────────────────────────
  await property.save();

  await logSecurityEvent({
    type:   'property_updated',
    userId: auth.id,
    role:   auth.role,
    ip,
    metadata: {
      propertyId:        idRaw,
      majorEditDetected,
      resetToDraft:      majorEditDetected && !isAdmin,
      requestId,
    },
  });

  res.status(200).json({
    success:  true,
    requestId,
    message:  majorEditDetected && !isAdmin
      ? 'Property updated. Major changes detected — please resubmit for review.'
      : 'Property updated successfully.',
    property: {
      _id:               idRaw,
      slug:              prop.slug,
      verificationStatus: prop.verification?.status,
      trustScore:         property.trustScore?.score          ?? 0,
      qualityScore:       property.qualityMetrics?.completenessScore ?? 0,
      majorEditDetected,
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

    if (req.method === 'PATCH') {
      await handlePatch(req, res, requestId);
      return;
    }

    res.setHeader('Allow', 'GET, PATCH');
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