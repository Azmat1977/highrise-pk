// pages/api/properties/[id]/permanent-delete.ts
// ═══════════════════════════════════════════════════════════════
// Owner Permanent Delete Endpoint
// ═══════════════════════════════════════════════════════════════
// DELETE → Owner permanently deletes their OWN trashed property
//
// ARCHITECTURAL BOUNDARY (V4.8):
//   ✅ This file:  Owner-only permanent delete of own property
//   ❌ This file:  NO admin permanent delete
//   ✅ Admin endpoint:  /api/admin/properties/[propertyId]/permanent-delete
//
// SAFETY REQUIREMENTS:
//   1. Property must be in trash (isDeleted: true)
//   2. Body must include confirmationCode === "DELETE-PROPERTY-PERMANENTLY"
//   3. Body must include reason (min 10 chars)
//   4. Cloudinary assets cleaned (best-effort, non-blocking)
//   5. Archive snapshot logged for compliance recovery
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property, { IProperty } from '@/models/Property';
import cloudinary, { isHighrisePublicId } from '@/lib/cloudinary';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApiWrite } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import mongoose from 'mongoose';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS       = 2500;
const CONFIRMATION_CODE = 'DELETE-PROPERTY-PERMANENTLY';
const MIN_REASON_LEN    = 10;
const MAX_REASON_LEN    = 500;
const CLOUDINARY_BATCH  = 100;

// Cloudinary folder prefixes are managed by lib/cloudinary.ts (FOLDERS constant)
// Use isHighrisePublicId() helper for validation (single source of truth)

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface DeleteBody {
  confirmationCode: string;
  reason:           string;
}

interface LeanProperty {
  _id:                  mongoose.Types.ObjectId;
  owner:                mongoose.Types.ObjectId;
  agentId?:             mongoose.Types.ObjectId;
  developerId?:         mongoose.Types.ObjectId;
  slug?:                string;
  title?:               string;
  city?:                string;
  society?:             string;
  price?:               number;
  listingType?:         string;
  isDeleted?:           boolean;
  verification?:        { status?: string };

  // Images
  images?:              { url?: string; public_id?: string }[];
  gallery?:             { url?: string; public_id?: string }[];
  featureImagePublicId?: string;

  // Documents (PDFs)
  brochurePublicId?:    string;
  priceListPublicId?:   string;
  paymentPlanPublicId?: string;

  // Plans
  floorPlans?: {
    imagePublicId?: string;
    pdfPublicId?:   string;
  }[];
  unitPlans?: {
    layoutImagePublicId?: string;
    pdfPublicId?:         string;
    interiorImages?:      { publicId?: string }[];
  }[];
}

interface MediaIds {
  images:    string[];
  documents: string[];
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

// Collect all media IDs grouped by Cloudinary resource_type
// isHighrisePublicId() from lib/cloudinary.ts is the single source of truth
// for folder ownership validation — prevents deletion of non-Highrise assets
function collectPublicIds(property: LeanProperty): MediaIds {
  const imageIds    = new Set<string>();
  const documentIds = new Set<string>();

  const addImage = (id: unknown): void => {
    const pid = String(id ?? '').trim();
    if (pid && isHighrisePublicId(pid)) imageIds.add(pid);
  };

  const addDoc = (id: unknown): void => {
    const pid = String(id ?? '').trim();
    if (pid && isHighrisePublicId(pid)) documentIds.add(pid);
  };

  // Images
  (property.images ?? []).forEach((img) => addImage(img?.public_id));
  (property.gallery ?? []).forEach((img) => addImage(img?.public_id));
  addImage(property.featureImagePublicId);

  // Floor plans
  (property.floorPlans ?? []).forEach((fp) => {
    addImage(fp?.imagePublicId);
    addDoc(fp?.pdfPublicId);
  });

  // Unit plans
  (property.unitPlans ?? []).forEach((up) => {
    addImage(up?.layoutImagePublicId);
    addDoc(up?.pdfPublicId);
    (up?.interiorImages ?? []).forEach((ii) => addImage(ii?.publicId));
  });

  // Documents (PDFs)
  addDoc(property.brochurePublicId);
  addDoc(property.priceListPublicId);
  addDoc(property.paymentPlanPublicId);

  return {
    images:    Array.from(imageIds),
    documents: Array.from(documentIds),
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// Best-effort Cloudinary cleanup — never throws
async function cleanupCloudinary(
  ids:          string[],
  resourceType: 'image' | 'raw'
): Promise<number> {
  if (ids.length === 0) return 0;

  let cleaned = 0;
  const batches = chunkArray(ids, CLOUDINARY_BATCH);

  for (const batch of batches) {
    try {
      await cloudinary.api.delete_resources(batch, { resource_type: resourceType });
      cleaned += batch.length;
    } catch {
      // Silently continue — orphaned media is non-critical
      // Cleanup cron job can sweep orphans later
    }
  }

  return cleaned;
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

  // ── Method guard ────────────────────────────────────────────
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      requestId,
    });
    return;
  }

  // ── Rate limit ──────────────────────────────────────────────
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

  // ── Auth required ───────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── ID validation ───────────────────────────────────────────
  const idRaw = normalizeId(req.query['id']);
  if (!idRaw || !isValidObjectId(idRaw)) {
    res.status(400).json({
      success: false,
      message: 'Invalid property ID.',
      requestId,
    });
    return;
  }

  // ── Body validation ─────────────────────────────────────────
  const body = req.body as DeleteBody;

  if (!body || typeof body !== 'object') {
    res.status(400).json({
      success: false,
      message: 'Request body is required.',
      requestId,
    });
    return;
  }

  if (body.confirmationCode !== CONFIRMATION_CODE) {
    res.status(400).json({
      success: false,
      message: `Confirmation code required. Type exactly: "${CONFIRMATION_CODE}"`,
      code:    'CONFIRMATION_REQUIRED',
      requestId,
    });
    return;
  }

  const reason = typeof body.reason === 'string'
    ? body.reason.trim().slice(0, MAX_REASON_LEN)
    : '';

  if (reason.length < MIN_REASON_LEN) {
    res.status(400).json({
      success: false,
      message: `Reason for permanent deletion must be at least ${MIN_REASON_LEN} characters.`,
      code:    'REASON_TOO_SHORT',
      requestId,
    });
    return;
  }

  const ip = getClientIp(req);

  try {
    await dbConnect();

    // ── Load property with all media fields ─────────────────────
    const property = await Property
      .findById(idRaw)
      .select(
        '_id owner agentId developerId slug title city society price ' +
        'listingType isDeleted verification ' +
        'images gallery featureImagePublicId ' +
        'brochurePublicId priceListPublicId paymentPlanPublicId ' +
        'floorPlans unitPlans'
      )
      .maxTimeMS(MAX_TIME_MS)
      .lean<LeanProperty>();

    if (!property) {
      // Idempotent — already deleted (acceptable info leak for destructive op)
      res.status(200).json({
        success: true,
        message: 'Property already deleted.',
        requestId,
      });
      return;
    }

    // ── Authorization: OWNER ONLY ───────────────────────────────
    // Admin permanent-delete is handled by /api/admin/properties/[propertyId]/permanent-delete
    const isOwner = property.owner.toString() === auth.id;
    if (!isOwner) {
      // Admin attempting to use this endpoint?
      if (auth.role === 'admin') {
        res.status(400).json({
          success: false,
          message: 'Admin permanent delete must use /api/admin/properties/[propertyId]/permanent-delete',
          code:    'WRONG_ENDPOINT',
          requestId,
        });
        return;
      }

      res.status(403).json({
        success: false,
        message: 'Forbidden. You can only delete properties you own.',
        requestId,
      });
      return;
    }

    // ── Two-step safety: must be in trash first ─────────────────
    if (!property.isDeleted) {
      res.status(400).json({
        success: false,
        message: 'Property must be moved to Trash first before permanent deletion.',
        code:    'NOT_IN_TRASH',
        requestId,
      });
      return;
    }

    // ── Archive snapshot for compliance recovery ────────────────
    const archiveSnapshot = {
      _id:                property._id.toString(),
      slug:               property.slug,
      title:              property.title,
      city:               property.city,
      society:            property.society,
      price:              property.price,
      listingType:        property.listingType,
      owner:              property.owner.toString(),
      agentId:            property.agentId?.toString()     ?? null,
      developerId:        property.developerId?.toString() ?? null,
      verificationStatus: property.verification?.status     ?? 'unknown',
      deletedAt:          new Date().toISOString(),
      deletedBy:          auth.id,
      reason,
    };

    // ── Collect Cloudinary IDs before deletion ──────────────────
    const mediaIds = collectPublicIds(property);

    // ── Defense in depth: re-check owner + still-in-trash at DB level
    const deleteFilter: Record<string, unknown> = {
      _id:       property._id,
      owner:     new mongoose.Types.ObjectId(auth.id),
      isDeleted: true,
    };

    // ── Atomic delete ───────────────────────────────────────────
    const deleted = await Property
      .findOneAndDelete(deleteFilter as mongoose.FilterQuery<IProperty>)
      .maxTimeMS(MAX_TIME_MS)
      .lean();

    if (!deleted) {
      // Race condition or state changed — idempotent
      res.status(200).json({
        success: true,
        message: 'Property already deleted.',
        requestId,
      });
      return;
    }

    // ── Critical audit log (with full archive snapshot) ─────────
    await logSecurityEvent({
      type:   'property_deleted',
      userId: auth.id,
      role:   auth.role,
      ip,
      metadata: {
        propertyId:     idRaw,
        action:         'permanent_delete',
        reason,
        archive:        archiveSnapshot,
        mediaToCleanup: {
          images:    mediaIds.images.length,
          documents: mediaIds.documents.length,
          total:     mediaIds.images.length + mediaIds.documents.length,
        },
        requestId,
      },
    });

    // ── Best-effort Cloudinary cleanup ──────────────────────────
    // After DB delete — failures don't block (orphans cleaned by cron later)
    const cleanedImages    = await cleanupCloudinary(mediaIds.images,    'image');
    const cleanedDocuments = await cleanupCloudinary(mediaIds.documents, 'raw');

    const totalAttempted = mediaIds.images.length + mediaIds.documents.length;
    const totalCleaned   = cleanedImages + cleanedDocuments;

    // ── Response ────────────────────────────────────────────────
    res.status(200).json({
      success:  true,
      requestId,
      message:  'Property permanently deleted. This action cannot be undone.',
      deleted: {
        _id:   idRaw,
        slug:  property.slug ?? null,
        title: property.title ?? null,
      },
      mediaCleanup: {
        attempted: totalAttempted,
        cleaned:   totalCleaned,
        images:    { attempted: mediaIds.images.length,    cleaned: cleanedImages },
        documents: { attempted: mediaIds.documents.length, cleaned: cleanedDocuments },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete property.',
      requestId,
      ...(process.env.NODE_ENV === 'development' && { debug: message }),
    });
  }
}