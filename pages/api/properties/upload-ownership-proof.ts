//C:\dev\highrise-pk\pages\api\properties\upload-ownership-proof.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Property, { IProperty, PropertyHelpers } from '@/models/Property';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApiWrite } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { FOLDERS, deleteFile, isHighriseFolderPublicId } from '@/lib/cloudinary';
import { verifyUploadAssetToken } from '@/lib/uploadAssetToken';
import { ownerEditTargetStatus } from '@/lib/property/propertyLifecycle';

type DocType = 'title_deed' | 'authority_letter' | 'cnic_copy';
const VALID_DOC_TYPES = new Set<DocType>(['title_deed', 'authority_letter', 'cnic_copy']);
const MAX_TIME_MS = 2500;

interface ProofUploadBody {
  propertyId?: unknown;
  docType?: unknown;
  publicId?: unknown;
  assetToken?: unknown;
  resourceType?: unknown;
  mimeType?: unknown;
}

function clientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const first = (Array.isArray(xf) ? xf[0] : xf)?.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || '0.0.0.0';
}

function secureHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'private, no-store');
}

function encryptedProofFields(docType: DocType): {
  idKey: 'titleDeedPublicIdEncrypted' | 'authorityLetterPublicIdEncrypted' | 'cnicCopyPublicIdEncrypted';
  resourceKey: 'titleDeedResourceType' | 'authorityLetterResourceType' | 'cnicCopyResourceType';
} {
  if (docType === 'authority_letter') {
    return { idKey: 'authorityLetterPublicIdEncrypted', resourceKey: 'authorityLetterResourceType' };
  }
  if (docType === 'cnic_copy') {
    return { idKey: 'cnicCopyPublicIdEncrypted', resourceKey: 'cnicCopyResourceType' };
  }
  return { idKey: 'titleDeedPublicIdEncrypted', resourceKey: 'titleDeedResourceType' };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = crypto.randomUUID();
  secureHeaders(res, requestId);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Method not allowed.', requestId });
    return;
  }

  const rl = await rateLimitApiWrite(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({ success: false, message: 'Too many requests.', requestId });
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const body = (req.body ?? {}) as ProofUploadBody;
  const propertyId = String(body.propertyId ?? '').trim();
  const docType = String(body.docType ?? '').trim().toLowerCase() as DocType;
  const publicId = String(body.publicId ?? '').trim();
  const resourceType = String(body.resourceType ?? '').trim() as 'image' | 'raw';
  const mimeType = String(body.mimeType ?? '').trim().toLowerCase();

  if (!mongoose.isValidObjectId(propertyId)) {
    res.status(400).json({ success: false, message: 'Valid propertyId is required.', requestId });
    return;
  }
  if (!VALID_DOC_TYPES.has(docType)) {
    res.status(400).json({ success: false, message: 'Invalid ownership-document type.', requestId });
    return;
  }
  if (!isHighriseFolderPublicId(publicId, 'kyc')) {
    res.status(400).json({ success: false, message: 'Invalid ownership-document reference.', requestId });
    return;
  }
  if (!['image', 'raw'].includes(resourceType)) {
    res.status(400).json({ success: false, message: 'Invalid document resource type.', requestId });
    return;
  }
  if (!(mimeType === 'application/pdf' || mimeType === 'image/jpeg' || mimeType === 'image/png')) {
    res.status(400).json({ success: false, message: 'Unsupported ownership-document format.', requestId });
    return;
  }

  const asset = verifyUploadAssetToken(body.assetToken, {
    userId: auth.id,
    publicId,
    folder: 'documents',
    resourceType,
  });
  if (!asset || asset.mimeType !== mimeType) {
    res.status(400).json({ success: false, message: 'Upload ownership token is invalid or expired.', code: 'INVALID_ASSET_TOKEN', requestId });
    return;
  }

  const ip = clientIp(req);
  try {
    await dbConnect();
    const property = await Property.findById(propertyId).maxTimeMS(MAX_TIME_MS);
    if (!property || property.isDeleted || property.owner?.toString() !== auth.id) {
      res.status(404).json({ success: false, message: 'Property not found or access denied.', requestId });
      return;
    }

    const typed = property as IProperty;
    const currentStatus = typed.verification?.status ?? 'draft';
    if (currentStatus === 'under_review' || currentStatus === 'flagged') {
      res.status(409).json({ success: false, message: 'Ownership evidence cannot be changed while this Property is locked for review.', code: 'PROPERTY_LOCKED', requestId });
      return;
    }

    if (!typed.ownershipProof) typed.ownershipProof = { hasProof: false };
    const { idKey, resourceKey } = encryptedProofFields(docType);
    const oldEncrypted = typed.ownershipProof[idKey];
    const oldResource = typed.ownershipProof[resourceKey] ?? 'image';
    let oldPublicId = '';
    if (oldEncrypted) {
      try { oldPublicId = PropertyHelpers.decryptData(oldEncrypted) || ''; } catch { oldPublicId = ''; }
    }

    const encryptedPublicId = PropertyHelpers.encryptData(publicId);
    if (!encryptedPublicId) throw new Error('Could not encrypt ownership-document reference.');

    typed.ownershipProof[idKey] = encryptedPublicId;
    typed.ownershipProof[resourceKey] = resourceType;
    typed.ownershipProof.hasProof = true;
    typed.ownershipProof.uploadedAt = new Date();
    typed.ownershipProof.reviewStatus = 'pending';
    typed.ownershipProof.verifiedByAdmin = false;
    typed.ownershipProof.reviewedAt = undefined;
    typed.ownershipProof.reviewedBy = undefined;
    typed.ownershipProof.verificationNotes = undefined;

    const targetStatus = ownerEditTargetStatus(currentStatus, ['ownershipProof']);
    typed.verification = {
      ...(typed.verification ?? { status: 'draft' }),
      status: targetStatus,
      requiresManualReview: true,
    };

    if (!Array.isArray(typed.auditTrail)) typed.auditTrail = [];
    typed.auditTrail.push({
      action: 'ownership_proof_uploaded',
      performedBy: new mongoose.Types.ObjectId(auth.id),
      role: auth.role,
      timestamp: new Date(),
      previousValue: currentStatus,
      newValue: `${docType}:${targetStatus}`,
      ip: ip.slice(0, 64),
    });
    typed.updatedBy = new mongoose.Types.ObjectId(auth.id);

    // DB first. If later Cloudinary cleanup fails, the old private object is an orphan,
    // never the other way around; the durable current proof cannot be destroyed prematurely.
    await property.save();

    if (oldPublicId && oldPublicId !== publicId && oldPublicId.startsWith(`${FOLDERS.kyc}/`)) {
      await deleteFile(oldPublicId, { resourceType: oldResource, deliveryType: 'authenticated' }).catch(() => undefined);
    }

    const publicIdHash = crypto.createHash('sha256').update(publicId).digest('hex').slice(0, 24);
    await logSecurityEvent({
      type: 'kyc_submitted',
      severity: 'medium',
      userId: auth.id,
      role: auth.role,
      ip,
      metadata: { propertyId, docType, publicIdHash, action: 'ownership_proof_associated', requestId },
    });

    res.status(200).json({
      success: true,
      requestId,
      message: 'Ownership evidence secured for Highrise review.',
      property: {
        _id: propertyId,
        verificationStatus: typed.verification?.status ?? 'draft',
        ownershipProof: { hasProof: true, reviewStatus: 'pending', uploadedAt: typed.ownershipProof.uploadedAt },
      },
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Could not associate ownership evidence. Please try again.',
      requestId,
      ...(process.env.NODE_ENV === 'development' ? { debug: error instanceof Error ? error.message : String(error) } : {}),
    });
  }
}
