// pages/api/properties/upload-ownership-proof.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Property, { IProperty, PropertyHelpers } from '@/models/Property';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApiWrite } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { FOLDERS, isHighrisePublicId, isCloudinaryUrl } from '@/lib/cloudinary';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 2500;

// Single source of truth: lib/cloudinary.ts FOLDERS constant
// FOLDERS.kyc = 'highrise-pk/kyc'
// Documents must be uploaded via /api/upload?folder=documents first

const VALID_DOC_TYPES = new Set([
  'title_deed',
  'authority_letter',
  'cnic_copy',
] as const);

type DocType = 'title_deed' | 'authority_letter' | 'cnic_copy';

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════

interface ProofUploadBody {
  propertyId?: unknown;
  docType?:    unknown;
  url?:        unknown;
  publicId?:   unknown;
}

interface LeanProperty {
  _id:            mongoose.Types.ObjectId;
  owner:          mongoose.Types.ObjectId;
  isDeleted?:     boolean;
  verification?:  { status?: string };
  ownershipProof?: {
    hasProof?:                 boolean;
    titleDeedEncrypted?:       string;
    authorityLetterEncrypted?: string;
    cnicCopyEncrypted?:        string;
    uploadedAt?:               Date;
    verifiedByAdmin?:          boolean;
  };
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

// Validate URL is from our Cloudinary account + kyc folder
// Uses lib/cloudinary.ts helpers — single source of truth
function isValidOwnershipProofUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:')  return false;
    // isCloudinaryUrl checks res.cloudinary.com domain
    if (!isCloudinaryUrl(url))    return false;
    // Must be in the kyc folder path
    if (!u.pathname.includes(FOLDERS.kyc)) return false;
    return true;
  } catch {
    return false;
  }
}

// Validate publicId belongs to our kyc folder
// isHighrisePublicId checks ANY highrise folder — we want kyc specifically
function isValidKycPublicId(publicId: string): boolean {
  const pid = String(publicId ?? '').trim();
  return pid.startsWith(FOLDERS.kyc + '/');
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

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      requestId,
    });
    return;
  }

  // Rate limit (write — document upload is sensitive)
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

  // Auth required
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const ip = getClientIp(req);

  try {
    await dbConnect();

    // ── Parse body ────────────────────────────────────────
    // Body is JSON — file was pre-uploaded via /api/upload
    const body = req.body as ProofUploadBody;

    if (!body || typeof body !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Request body must be JSON.',
        requestId,
      });
      return;
    }

    // propertyId
    const propertyIdRaw = String(body.propertyId ?? '').trim();
    if (!propertyIdRaw || !isValidObjectId(propertyIdRaw)) {
      res.status(400).json({
        success: false,
        message: 'Valid propertyId is required.',
        requestId,
      });
      return;
    }

    // docType — must be allowlisted
    const docTypeRaw = String(body.docType ?? '').trim().toLowerCase();
    if (!VALID_DOC_TYPES.has(docTypeRaw as DocType)) {
      res.status(400).json({
        success: false,
        message: 'docType must be: title_deed, authority_letter, or cnic_copy.',
        requestId,
      });
      return;
    }
    const docType = docTypeRaw as DocType;

    // url — must be from our Cloudinary account + kyc folder
    const urlRaw = String(body.url ?? '').trim();
    if (!urlRaw || !isValidOwnershipProofUrl(urlRaw)) {
      res.status(400).json({
        success: false,
        message: 'Invalid document URL. Upload via /api/upload?folder=documents first.',
        requestId,
      });
      return;
    }

    // publicId — must be from our folder
    const publicIdRaw = String(body.publicId ?? '').trim();
    if (!publicIdRaw || !isValidKycPublicId(publicIdRaw)) {
      res.status(400).json({
        success: false,
        message: 'Invalid publicId. Must be from the documents upload folder.',
        requestId,
      });
      return;
    }

    // ── Single DB query — load full Mongoose doc for save() ──
    // findById() + save() — NEVER findByIdAndUpdate (bypasses pre-save hooks)
    // Owner check done in memory — no separate gate query needed
    const doc = await Property
      .findById(propertyIdRaw)
      .maxTimeMS(MAX_TIME_MS);

    if (!doc) {
      res.status(404).json({
        success: false,
        message: 'Property not found or access denied.',
        requestId,
      });
      return;
    }

    const typedDoc = doc as IProperty;

    // ── Owner check (in memory) ───────────────────────────
    const isOwner = typedDoc.owner.toString() === auth.id;
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You can only upload proof for your own properties.',
        requestId,
      });
      return;
    }

    // ── Deleted check (in memory) ─────────────────────────
    if (typedDoc.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Property not found or access denied.',
        requestId,
      });
      return;
    }

    // ── Verification status guard ─────────────────────────
    // Cannot upload documents during active admin review — prevents
    // changing evidence mid-review which would invalidate the review
    const verStatus = typedDoc.verification?.status ?? 'draft';
    if (verStatus === 'under_review') {
      res.status(409).json({
        success: false,
        message: 'Property is currently under review. Documents cannot be changed during review.',
        code:    'UNDER_REVIEW',
        requestId,
      });
      return;
    }

    // ── Encrypt URL ───────────────────────────────────────
    // AES-256-GCM encryption — DB admins cannot browse proofs without keys
    const encryptedUrl = PropertyHelpers.encryptData(urlRaw);

    if (!encryptedUrl) {
      res.status(500).json({
        success: false,
        message: 'Failed to secure document. Please try again.',
        requestId,
      });
      return;
    }

    // ── Update ownership proof fields ─────────────────────
    if (!typedDoc.ownershipProof) {
      typedDoc.ownershipProof = { hasProof: false };
    }

    typedDoc.ownershipProof.hasProof        = true;
    typedDoc.ownershipProof.uploadedAt      = new Date();
    typedDoc.ownershipProof.verifiedByAdmin = false; // Reset — needs admin re-review

    // Set the specific encrypted field by docType
    if (docType === 'title_deed') {
      typedDoc.ownershipProof.titleDeedEncrypted = encryptedUrl;
    } else if (docType === 'authority_letter') {
      typedDoc.ownershipProof.authorityLetterEncrypted = encryptedUrl;
    } else {
      typedDoc.ownershipProof.cnicCopyEncrypted = encryptedUrl;
    }

    // ── State machine: NO auto-advance on document upload ─
    // Document upload ≠ submission.
    // Owner may upload documents while still in draft mode,
    // continue editing the listing, and submit explicitly later.
    // State transition (draft → pending) happens ONLY via the
    // 'submit' action in /api/properties/[id] (owner endpoint).
    // We only set requiresManualReview = true to flag for admin.
    typedDoc.verification = {
      ...(typedDoc.verification ?? { status: 'draft' }),
      requiresManualReview: true,  // signal to admin: new proof attached
    };

    // ── Audit trail ───────────────────────────────────────
    if (!Array.isArray(typedDoc.auditTrail)) {
      typedDoc.auditTrail = [];
    }
    typedDoc.auditTrail.push({
      action:      'ownership_proof_uploaded',
      performedBy: new mongoose.Types.ObjectId(auth.id),
      role:        auth.role,
      timestamp:   new Date(),
      newValue:    docType,
      ip:          ip.slice(0, 64),
    });

    typedDoc.updatedBy = new mongoose.Types.ObjectId(auth.id);

    await doc.save();

    // Log security event — KYC document upload is sensitive operation
    await logSecurityEvent({
      type:     'kyc_submitted',
      severity: 'medium',
      userId:   auth.id,
      role:     auth.role,
      ip,
      metadata: {
        propertyId: propertyIdRaw,
        docType,
        // publicId stored for future Cloudinary cleanup audit
        // NOT the encrypted URL — never log sensitive data
        publicId:   publicIdRaw,
        action:     'ownership_proof_uploaded',
        requestId,
      },
    });

    // ── Response ──────────────────────────────────────────
    // documentsUploaded booleans omitted — signals which docs are stored
    // Frontend should re-fetch property to see proof status
    res.status(200).json({
      success:   true,
      requestId,
      message:   'Ownership document uploaded and secured successfully.',
      property: {
        _id:               propertyIdRaw,
        verificationStatus: typedDoc.verification?.status ?? 'draft',
        ownershipProof: {
          hasProof:        true,
          verifiedByAdmin: false,
          uploadedAt:      new Date().toISOString(),
          docTypeUploaded: docType,  // only the just-uploaded type — not a map of all
        },
      },
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: 'Upload failed. Please try again.',
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        debug: err instanceof Error ? err.message : String(err),
      }),
    });
  }
}