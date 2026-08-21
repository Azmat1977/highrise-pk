// pages/api/admin/agents/[agentId]/index.ts
// Highrise.pk — Admin Agent Detail & Update
// GET: agent detail view
// PUT: update status / verification level / trust score / admin notes
// Access: Admin only

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import AgentProfile from '@/models/AgentProfile';
import User from '@/models/User';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { toPrivateKycAssetView } from '@/lib/privateAsset';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';
// V6.8.4: KYC decrypt helpers for admin display
// Admin sees FULL decrypted values (not masked) — required for verification
// Security preserved via: audit logging on every decryption + admin-only access
import {
  decryptCnic,
  decryptPhone,
  decryptLicense,
  decryptNtn,
} from '@/lib/kycCrypto';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TIME_MS = 5000;

const VALID_STATUSES = [
  'approved', 'rejected', 'pending', 'suspended',
] as const;

const VALID_VERIFICATION_LEVELS = [
  'not_verified',
  'documents_pending',
  'basic_verified',
  'license_verified',
  'full_verified',
  'premium_verified',
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type ValidStatus            = typeof VALID_STATUSES[number];
type ValidVerificationLevel = typeof VALID_VERIFICATION_LEVELS[number];

interface UpdatePayload {
  status?:            ValidStatus;
  verificationLevel?: ValidVerificationLevel;
  trustScore?:        number;
  adminNotes?:        string;
  suspensionReason?:  string;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ObjectIdSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid ID format'
);

const UpdateAgentSchema = z.object({
  status:            z.enum(VALID_STATUSES).optional(),
  verificationLevel: z.enum(VALID_VERIFICATION_LEVELS).optional(),
  trustScore:        z.number().min(0).max(100).optional(),
  adminNotes:        z.string().trim().max(1000).optional(),
  suspensionReason:  z.string().trim().max(500).optional(),
}).refine(
  (d) =>
    d.status !== undefined ||
    d.verificationLevel !== undefined ||
    d.trustScore !== undefined ||
    d.adminNotes !== undefined ||
    d.suspensionReason !== undefined,
  { message: 'At least one field must be provided for update' }
);

// ─── Security headers ─────────────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

// ─── IP helper ────────────────────────────────────────────────────────────────

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? '').split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '0.0.0.0';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);

  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).json({ success: false, message: 'Method not allowed', requestId });
    return;
  }

  // ── Validate route param ──────────────────────────────────────────────────
  const { agentId } = req.query;
  const idResult = ObjectIdSchema.safeParse(agentId);
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid Agent ID format',
      code: 'INVALID_ID',
      requestId,
    });
    return;
  }
  const agentIdStr = idResult.data;

  await dbConnect();

  // ── Rate limit ────────────────────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    res.status(429).json({
      success: false,
      message: `Too many requests. Retry in ${rl.retryAfter ?? 60} seconds.`,
      requestId,
    });
    return;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── GET ───────────────────────────────────────────────────────────────────
  // V6.8.4: Enterprise-grade admin view with:
  //   → Populated user relation
  //   → FULL decrypted KYC fields (CNIC, NTN, License, Phone) — required for verification
  //   → User.cnicFrontUrl/cnicBackUrl merged into documents fallback
  //   → Company registration + license doc URL exposed
  //   → Security via: admin-only access + full audit logging on every decryption
  //   → Never expose raw encrypted fields to frontend (strip before response)
  if (req.method === 'GET') {
    try {
      // Fetch agent with populated user + all sensitive fields
      // +field syntax forces select on schema-select:false fields
      // V6.8.8 FIX: Fetch reviews via separate query to bypass Mongoose select quirk
      // The main query uses .select() with +field syntax which excludes subdoc arrays
      // Fetching reviews separately guarantees they're returned reliably
      const agent = await AgentProfile.findById(agentIdStr)
        .populate('user', 'name email createdAt role status cnicFrontUrl cnicBackUrl cnicName cnicStatus cnicLockedAt')
        .select('+cnicEncrypted +cnicHash +licenseEncrypted +licenseHash +ntnEncrypted +ntnHash +phoneEncrypted +phoneHash +whatsappEncrypted')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (!agent) {
        res.status(404).json({
          success: false,
          message: 'Agent not found',
          code: 'NOT_FOUND',
          requestId,
        });
        return;
      }

      // V6.8.8: Fetch reviews as separate query — guaranteed to return them
      const reviewsDoc = await AgentProfile.findById(agentIdStr)
        .select('reviews')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      const reviewsArray = (reviewsDoc as unknown as { reviews?: unknown[] })?.reviews ?? [];

      // Attach reviews to agent object
      (agent as Record<string, unknown>).reviews = reviewsArray;

      // ── Type-safe access to encrypted fields ─────────────────────────
      const rawAgent = agent as unknown as {
        _id:                 unknown;
        cnicEncrypted?:      string;
        licenseEncrypted?:   string;
        ntnEncrypted?:       string;
        phoneEncrypted?:     string;
        whatsappEncrypted?:  string;
        companyRegNo?:       string;
        licenseDocumentUrl?: string;
        documents?:          Record<string, { url?: string; publicId?: string; uploadedAt?: Date; issuer?: string } | undefined>;
        agencyLogo?:         { url?: string; publicId?: string };
        // V6.8.8: Reviews subdocument array
        reviews?: Array<{
          _id?:            unknown;
          rating:          number;
          reviewText:      string;
          reviewerName:    string;
          reviewerCity?:   string;
          source:          string;
          adminNotes?:     string;
          addedBy?:        unknown;
          addedAt:         Date;
          editedBy?:       unknown;
          editedAt?:       Date;
          isPublished:     boolean;
          transactionRef?: string;
        }>;
        user?: {
          _id?:          unknown;
          name?:         string;
          email?:        string;
          role?:         string;
          status?:       string;
          createdAt?:    Date;
          cnicFrontUrl?: string;
          cnicBackUrl?:  string;
          cnicName?:     string;
          cnicStatus?:   string;
          cnicLockedAt?: Date;
        };
      };

      // ── Decrypt sensitive fields for admin display (FULL values) ─────
      // ENTERPRISE PATTERN: Admin verifies identity by comparing decrypted
      // values against uploaded document images. Masking would defeat this.
      // Security is preserved via:
      //   1. Admin-only endpoint (requireAdmin middleware)
      //   2. Rate limiting (rateLimitAdmin)
      //   3. Full audit trail (logSecurityEvent below)
      //   4. Encrypted at rest (AES-256-GCM in database)
      //   5. Never sent to public/agent endpoints
      const auditInfo = { adminId: auth.id, reason: 'admin_view_agent_detail_full_decrypt' };

      let cnicFull      = 'Not provided';
      let ntnFull       = 'Not provided';
      let licenseFull   = 'Not provided';
      let phoneFull     = 'Not provided';
      let whatsappFull  = 'Not provided';

      // Track which fields were successfully decrypted for audit log
      const decryptionResults = {
        cnic:     false,
        ntn:      false,
        license:  false,
        phone:    false,
        whatsapp: false,
      };

      try {
        if (rawAgent.cnicEncrypted) {
          cnicFull                = decryptCnic(rawAgent.cnicEncrypted, auditInfo);
          decryptionResults.cnic  = true;
        }
      } catch {
        // best-effort CNIC decrypt — continue
      }

      try {
        if (rawAgent.ntnEncrypted) {
          ntnFull                = decryptNtn(rawAgent.ntnEncrypted, auditInfo);
          decryptionResults.ntn  = true;
        }
      } catch {
        // best-effort NTN decrypt — continue
      }

      try {
        if (rawAgent.licenseEncrypted) {
          licenseFull               = decryptLicense(rawAgent.licenseEncrypted, auditInfo);
          decryptionResults.license = true;
        }
      } catch {
        // best-effort license decrypt — continue
      }

      try {
        if (rawAgent.phoneEncrypted) {
          phoneFull               = decryptPhone(rawAgent.phoneEncrypted, auditInfo);
          decryptionResults.phone = true;
        }
      } catch {
        // best-effort phone decrypt — continue
      }

      try {
        if (rawAgent.whatsappEncrypted) {
          whatsappFull               = decryptPhone(rawAgent.whatsappEncrypted, auditInfo);
          decryptionResults.whatsapp = true;
        }
      } catch {
        // best-effort WhatsApp decrypt — continue
      }

      // ── Merge documents from User model (fallback for existing agents) ──
      // Priority: AgentProfile.documents > User.cnicFrontUrl/cnicBackUrl
      // This handles both new submissions (has documents) AND
      // legacy submissions (only has User.cnicFrontUrl)
      const existingDocs = rawAgent.documents ?? {};

      const mergedDocuments = {
        // Public media stays on normal Cloudinary delivery.
        profilePhoto: existingDocs.profilePhoto,
        coverPhoto:   existingDocs.coverPhoto,

        // Sensitive documents use short-lived authenticated URLs when a
        // canonical publicId exists. Legacy public-only records are visible
        // only to this admin endpoint and are flagged for migration.
        cnicFront: toPrivateKycAssetView(
          existingDocs.cnicFront?.url
            ? existingDocs.cnicFront
            : rawAgent.user?.cnicFrontUrl
              ? { url: rawAgent.user.cnicFrontUrl, uploadedAt: rawAgent.user.cnicLockedAt }
              : undefined,
          { allowLegacyAdminUrl: true },
        ),

        cnicBack: toPrivateKycAssetView(
          existingDocs.cnicBack?.url
            ? existingDocs.cnicBack
            : rawAgent.user?.cnicBackUrl
              ? { url: rawAgent.user.cnicBackUrl, uploadedAt: rawAgent.user.cnicLockedAt }
              : undefined,
          { allowLegacyAdminUrl: true },
        ),

        license: toPrivateKycAssetView(
          existingDocs.license?.url
            ? existingDocs.license
            : rawAgent.licenseDocumentUrl
              ? { url: rawAgent.licenseDocumentUrl, issuer: 'Self-declared' }
              : undefined,
          { allowLegacyAdminUrl: true },
        ),
      };

      // ── Build enriched response ────────────────────────────────────
      // V6.8.4: Send FULL decrypted values to admin for verification
      // Frontend must display these clearly with "🔓 Decrypted" indicator
      // Admin's browser is the ONLY place these appear outside the DB
      // V6.8.8: Explicitly serialize reviews (Mongoose subdocs need conversion)
      const serializedReviews = Array.isArray(rawAgent.reviews)
        ? rawAgent.reviews.map((r) => ({
            _id:            r._id ? String(r._id) : undefined,
            rating:         Number(r.rating ?? 0),
            reviewText:     String(r.reviewText ?? ""),
            reviewerName:   String(r.reviewerName ?? ""),
            reviewerCity:   r.reviewerCity ? String(r.reviewerCity) : undefined,
            source:         String(r.source ?? "admin_verified"),
            adminNotes:     r.adminNotes ? String(r.adminNotes) : undefined,
            addedBy:        r.addedBy ? String(r.addedBy) : undefined,
            addedAt:        r.addedAt ? new Date(r.addedAt).toISOString() : new Date().toISOString(),
            editedBy:       r.editedBy ? String(r.editedBy) : undefined,
            editedAt:       r.editedAt ? new Date(r.editedAt).toISOString() : undefined,
            isPublished:    Boolean(r.isPublished),
            transactionRef: r.transactionRef ? String(r.transactionRef) : undefined,
          }))
        : [];

      const enrichedAgent = {
        ...agent,
        // Replace encrypted fields with full decrypted values
        cnicNumber:     cnicFull,
        ntnNumber:      ntnFull,
        licenseNumber:  licenseFull,
        phoneNumber:    phoneFull,
        whatsappNumber: whatsappFull,

        // Business compliance (visible to admin)
        companyRegNo:       rawAgent.companyRegNo ?? null,
        licenseDocumentUrl: rawAgent.licenseDocumentUrl ?? null,

        // Merged documents (with fallback)
        documents: mergedDocuments,

        // V6.8.8: Serialized reviews (converted from Mongoose subdocs)
        reviews: serializedReviews,

        // Strip raw encrypted fields — never send raw ciphertext to frontend
        cnicEncrypted:     undefined,
        licenseEncrypted:  undefined,
        ntnEncrypted:      undefined,
        phoneEncrypted:    undefined,
        whatsappEncrypted: undefined,
      };

      // V6.8.4: HIGH severity audit — admin viewed full decrypted PII
      // Every decryption is logged with which fields were revealed
      // This creates a complete audit trail for compliance/investigation
      logSecurityEvent({
        type:      'admin_action',
        severity:  'high',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:        'admin_view_agent_full_kyc',
          targetAgentId: agentIdStr,
          decryptedFields: decryptionResults,
          fieldsAttempted: {
            cnic:     Boolean(rawAgent.cnicEncrypted),
            ntn:      Boolean(rawAgent.ntnEncrypted),
            license:  Boolean(rawAgent.licenseEncrypted),
            phone:    Boolean(rawAgent.phoneEncrypted),
            whatsapp: Boolean(rawAgent.whatsappEncrypted),
          },
          requestId,
        },
      });

      res.status(200).json({
        success: true,
        agent:   enrichedAgent,
        requestId,
      });
    } catch (err: unknown) {
      logSecurityEvent({
        type:      'admin_action',
        severity:  'high',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:      'admin_view_agent_error',
          targetAgentId: agentIdStr,
          reason:        err instanceof Error ? err.message : 'UNKNOWN',
          requestId,
        },
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        requestId,
      });
    }
    return;
  }

  // ── PUT ───────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const parsed = UpdateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid request body',
        errors:  parsed.error.flatten().fieldErrors,
        requestId,
      });
      return;
    }

    const {
      status,
      verificationLevel,
      trustScore,
      adminNotes,
      suspensionReason,
    }: UpdatePayload = parsed.data;

    try {
      const agent = await AgentProfile.findById(agentIdStr)
        .maxTimeMS(MAX_TIME_MS);

      if (!agent) {
        res.status(404).json({
          success: false,
          message: 'Agent not found',
          code: 'NOT_FOUND',
          requestId,
        });
        return;
      }

      if (agent.isDeleted) {
        res.status(400).json({
          success: false,
          message: 'Cannot update a deleted agent. Restore it first.',
          code: 'AGENT_DELETED',
          requestId,
        });
        return;
      }

      const before: Partial<UpdatePayload> = {};
      const after:  Partial<UpdatePayload> = {};
      let statusUpdated = false;

      // ── Status ──────────────────────────────────────────────────────────
      // V6.8.0: Syncs both role (legacy) AND capability flags (Session 3 pattern)
      if (status !== undefined) {
        before.status = agent.status as ValidStatus;
        after.status  = status;
        agent.status  = status;
        statusUpdated = true;

        if (status === 'approved') {
          agent.verifiedAt = new Date();
          // Grant capability + role, force re-login
          await User.findByIdAndUpdate(
            agent.user,
            {
              $set: {
                role:                    'agent',
                isVerifiedAgent:         true,
                agentVerificationStatus: 'approved',
                agentProfileId:          agent._id,
              },
              $inc: { tokenVersion: 1 },
            },
            { runValidators: true }
          ).maxTimeMS(MAX_TIME_MS);
        } else if (status === 'suspended') {
          agent.suspendedAt = new Date();
          if (suspensionReason) {
            agent.suspensionReason = suspensionReason;
          }
          // Revoke capability + downgrade role, force re-login
          await User.findByIdAndUpdate(
            agent.user,
            {
              $set: {
                role:                    'user',
                isVerifiedAgent:         false,
                agentVerificationStatus: 'suspended',
              },
              $inc: { tokenVersion: 1 },
            },
            { runValidators: true }
          ).maxTimeMS(MAX_TIME_MS);
        } else if (status === 'rejected') {
          // Revoke capability + downgrade role, force re-login
          await User.findByIdAndUpdate(
            agent.user,
            {
              $set: {
                role:                    'user',
                isVerifiedAgent:         false,
                agentVerificationStatus: 'rejected',
              },
              $inc: { tokenVersion: 1 },
            },
            { runValidators: true }
          ).maxTimeMS(MAX_TIME_MS);
        } else if (status === 'pending') {
          // Reset to pending — clear capability, keep role neutral
          await User.findByIdAndUpdate(
            agent.user,
            {
              $set: {
                isVerifiedAgent:         false,
                agentVerificationStatus: 'pending',
              },
              $inc: { tokenVersion: 1 },
            },
            { runValidators: true }
          ).maxTimeMS(MAX_TIME_MS);
        }
      }

      // ── Verification level ───────────────────────────────────────────────
      if (verificationLevel !== undefined) {
        before.verificationLevel = agent.verificationLevel as ValidVerificationLevel;
        after.verificationLevel  = verificationLevel;
        agent.verificationLevel  = verificationLevel;
      }

      // ── Trust score override ─────────────────────────────────────────────
      if (trustScore !== undefined) {
        agent.trustScore.overall = trustScore;
        agent.trustScore.lastCalculated = new Date();
      }

      // ── Admin notes (stored in suspensionReason field for agents) ────────
      // AgentProfile has no adminNotes field — use auditTrail metadata
      if (adminNotes !== undefined) {
        await agent.addAuditEntry(
          'admin_notes_updated',
          agent.user as unknown as import('mongoose').Types.ObjectId,
          { notes: adminNotes },
          ip
        );
      }

      await agent.save();

      logSecurityEvent({
        type:      'admin_action',
        severity:  statusUpdated ? 'high' : 'medium',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:      'admin_update_agent',
          targetAgentId: agentIdStr,
          changes: { before, after },
          requestId,
        },
      });

      res.status(200).json({
        success: true,
        message: statusUpdated
          ? `Agent status updated to ${status}`
          : 'Agent updated successfully',
        requestId,
      });
    } catch (err: unknown) {
      logSecurityEvent({
        type:      'admin_action',
        severity:  'high',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:      'admin_update_agent_error',
          targetAgentId: agentIdStr,
          reason:        err instanceof Error ? err.message : 'UNKNOWN',
          requestId,
        },
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        requestId,
      });
    }
  }
}