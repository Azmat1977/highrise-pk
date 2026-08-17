// pages/api/admin/developers/[developerId]/index.ts
// 🔒 ENTERPRISE v3.0 — Admin Developer Detail & Update
// Fixes: requireAdmin, logSecurityEvent, crypto.randomUUID,
//        correct enum values, tokenVersion++, Project removed (TODO),
//        proper types, dbConnect order, route param [developerId]

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import DeveloperProfile from '@/models/DeveloperProfile';
import User from '@/models/User';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';
import { toPrivateKycAssetView } from '@/lib/privateAsset';

// ═══════════════════════════════════════════════════════════════
// 🔒 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;

const VALID_STATUSES = [
  'approved', 'rejected', 'pending', 'suspended',
] as const;

const VALID_RISK_LEVELS = [
  'low', 'medium', 'high',
] as const;

// ✅ Locked DeveloperProfile verificationLevel enum
const VALID_VERIFICATION_LEVELS = [
  'not_verified',
  'docs_pending',
  'docs_verified',
  'site_verified',
  'fully_verified',
] as const;

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPES
// ═══════════════════════════════════════════════════════════════

type ValidStatus            = typeof VALID_STATUSES[number];
type ValidRiskLevel = typeof VALID_RISK_LEVELS[number]; // 'low' | 'medium' | 'high'
type ValidVerificationLevel = typeof VALID_VERIFICATION_LEVELS[number];

interface UpdatePayload {
  status?:             ValidStatus;
  highriseScore?:      number;
  onTimeDeliveryRate?: number;
  riskLevel?:          ValidRiskLevel;
  verificationLevel?:  ValidVerificationLevel;
  adminNotes?:         string;
}

interface ChangeRecord {
  before: Partial<UpdatePayload>;
  after:  Partial<UpdatePayload & { isVerified: boolean }>;
}

interface IdentitySummary {
  email?:     string;
  name?:      string;
  createdAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid ID format',
);

const UpdateDeveloperSchema = z.object({
  status:             z.enum(VALID_STATUSES).optional(),
  highriseScore:      z.number().min(0).max(100).optional(),
  onTimeDeliveryRate: z.number().min(0).max(100).optional(),
  riskLevel:          z.enum(VALID_RISK_LEVELS).optional(),
  verificationLevel:  z.enum(VALID_VERIFICATION_LEVELS).optional(),
  adminNotes:         z.string().trim().max(1000).optional(),
}).refine(
  (data) =>
    data.status              !== undefined ||
    data.highriseScore       !== undefined ||
    data.onTimeDeliveryRate  !== undefined ||
    data.riskLevel           !== undefined ||
    data.verificationLevel   !== undefined ||
    data.adminNotes          !== undefined,
  { message: 'At least one field must be provided for update' },
);

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(
  res:       NextApiResponse,
  requestId: string,
): void {
  res.setHeader('X-Request-Id',              requestId);
  res.setHeader('Content-Type',              'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('Cache-Control',             'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy',        'geolocation=(), microphone=(), camera=()');
}

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPERS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? '').split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || '0.0.0.0';
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {

  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', ['GET', 'PUT']);
    void res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
    return;
  }

  // ── Validate route param ─────────────────────────────────────
  // ✅ Route param is [developerId] — matches locked naming convention
  const { developerId } = req.query;
  const idResult = ObjectIdSchema.safeParse(developerId);

  if (!idResult.success) {
    void res.status(400).json({
      success: false,
      message: 'Invalid Developer ID format',
      code:    'INVALID_ID',
      requestId,
    });
    return;
  }

  const developerIdStr = idResult.data;

  // ── DB ───────────────────────────────────────────────────────
  // ✅ dbConnect before ALL queries — including auth
  await dbConnect();

  // ── Rate limit ───────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    void res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down.',
      code:    'RATE_LIMITED',
      requestId,
    });
    return;
  }

  // ── Auth ─────────────────────────────────────────────────────
  // ✅ requireAdmin() — replaces getServerSession + User.findById
  //    + requireActiveAdminOrThrow entirely
  const auth = await requireAdmin(req, res);
  if (!auth) return; // requireAdmin already sent 401/403

  // ════════════════════════════════════════════════════════════
  // ✅ GET — Developer detail view
  // ════════════════════════════════════════════════════════════

  if (req.method === 'GET') {
    try {
      const developer = await DeveloperProfile.findById(developerIdStr)
        .populate('user', 'name email createdAt')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (!developer) {
        void res.status(404).json({
          success: false,
          message: 'Developer not found',
          code:    'NOT_FOUND',
          requestId,
        });
        return;
      }

      // ── Identity summary (admin detail view — email acceptable) ─
      const userRef = developer.user as {
        name?:      string;
        email?:     string;
        createdAt?: Date;
      } | null;

      const identitySummary: IdentitySummary = {
        email:     userRef?.email     ? String(userRef.email)     : undefined,
        name:      userRef?.name      ? String(userRef.name)      : undefined,
        createdAt: userRef?.createdAt ?? undefined,
      };

      // ── Audit log ────────────────────────────────────────────
      logSecurityEvent({
        type:      'admin_action',
        severity:  'low',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:            'admin_view_developer_detail',
          targetDeveloperId: developerIdStr,
          requestId,
        },
      });

      // Sensitive legal/KYC assets are delivered with short-lived signed URLs.
      // Legacy public-only URLs remain visible to admins temporarily and are
      // explicitly flagged so they can be migrated to authenticated delivery.
      const legalDocs = (developer as Record<string, any>).legalDocs;
      if (legalDocs) {
        for (const key of [
          'secpCertificate',
          'ntnCertificate',
          'memorandum',
          'articlesOfAssociation',
          'authorizedPersonCnicFrontImage',
          'authorizedPersonCnicBackImage',
        ]) {
          if (legalDocs[key]) {
            legalDocs[key] = toPrivateKycAssetView(legalDocs[key], {
              allowLegacyAdminUrl: true,
            });
          }
        }
        if (Array.isArray(legalDocs.pastProjects)) {
          legalDocs.pastProjects = legalDocs.pastProjects
            .map((asset: Record<string, unknown>) =>
              toPrivateKycAssetView(asset, { allowLegacyAdminUrl: true }),
            )
            .filter(Boolean);
        }
      }

      void res.status(200).json({
        success: true,
        developer,
        identitySummary,
        requestId,
      });

    } catch (error: unknown) {
      logSecurityEvent({
        type:      'admin_action',
        severity:  'high',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:            'admin_view_developer_detail_error',
          targetDeveloperId: developerIdStr,
          errorCode:         error instanceof Error ? error.message : 'UNKNOWN',
          requestId,
        },
      });

      void res.status(500).json({
        success: false,
        message: 'Internal server error',
        code:    'SERVER_ERROR',
        requestId,
      });
    }
    return;
  }

  // ════════════════════════════════════════════════════════════
  // ✅ PUT — Update developer
  // ════════════════════════════════════════════════════════════

  if (req.method === 'PUT') {

    // ── Validate body ─────────────────────────────────────────
    const parseResult = UpdateDeveloperSchema.safeParse(req.body);
    if (!parseResult.success) {
      void res.status(400).json({
        success: false,
        message: 'Invalid request body',
        code:    'VALIDATION_ERROR',
        errors:  parseResult.error.flatten().fieldErrors,
        requestId,
      });
      return;
    }

    const {
      status,
      highriseScore,
      onTimeDeliveryRate,
      riskLevel,
      verificationLevel,
      adminNotes,
    }: UpdatePayload = parseResult.data;

    try {
      const developer = await DeveloperProfile.findById(developerIdStr)
        .maxTimeMS(MAX_TIME_MS);

      if (!developer) {
        void res.status(404).json({
          success: false,
          message: 'Developer not found',
          code:    'NOT_FOUND',
          requestId,
        });
        return;
      }

      if (developer.isDeleted) {
        void res.status(400).json({
          success: false,
          message: 'Cannot update a deleted developer. Restore it first.',
          code:    'DEVELOPER_DELETED',
          requestId,
        });
        return;
      }

      // ── Change tracking ───────────────────────────────────
      const changes: ChangeRecord = { before: {}, after: {} };
      let statusUpdated = false;
      let trustUpdated  = false;

      // ── Status update ─────────────────────────────────────
      if (status !== undefined) {
        changes.before.status = developer.status as ValidStatus;
        changes.after.status  = status;
        developer.status      = status;
        statusUpdated         = true;

        if (status === 'approved') {
          developer.isVerified  = true;
          developer.verifiedAt  = new Date();
          changes.after.isVerified = true;

          // ✅ tokenVersion++ forces re-login after role change
          await User.findByIdAndUpdate(
            developer.user,
            {
              $set: { role: 'developer' },
              $inc: { tokenVersion: 1 },   // ← CRITICAL: invalidates old JWT
            },
            { runValidators: true },
          ).maxTimeMS(MAX_TIME_MS);

        } else {
          developer.isVerified = false;
          developer.verifiedAt = undefined;
          changes.after.isVerified = false;
        }

        // TODO: Sync project approval status when Project model is built (Section 5)
        // Project.updateMany({ developerId: developer.user }, {
        //   $set: { developerApprovalStatus: status === 'approved' ? 'approved' : 'pending' }
        // })
      }

      // ── Trust metrics ──────────────────────────────────────
      if (highriseScore !== undefined) {
        changes.before.highriseScore = developer.highriseScore as number;
        changes.after.highriseScore  = highriseScore;
        developer.highriseScore      = highriseScore;
        trustUpdated                 = true;
      }

      if (onTimeDeliveryRate !== undefined) {
        changes.before.onTimeDeliveryRate = developer.onTimeDeliveryRate as number;
        changes.after.onTimeDeliveryRate  = onTimeDeliveryRate;
        developer.onTimeDeliveryRate      = onTimeDeliveryRate;
        trustUpdated                      = true;
      }

      if (riskLevel !== undefined) {
        changes.before.riskLevel = developer.riskLevel as ValidRiskLevel;
        changes.after.riskLevel  = riskLevel;
        developer.riskLevel      = riskLevel;
        trustUpdated             = true;
      }

      if (verificationLevel !== undefined) {
        changes.before.verificationLevel = developer.verificationLevel as ValidVerificationLevel;
        changes.after.verificationLevel  = verificationLevel;
        developer.verificationLevel      = verificationLevel;

        if (verificationLevel !== 'not_verified') {
          developer.lastVerifiedAt = new Date();
        }
        trustUpdated = true;
      }

      if (adminNotes !== undefined) {
        developer.adminNotes = adminNotes;
      }

      // ✅ No manual updatedAt — Mongoose timestamps:true handles it
      await developer.save();

      // ── Audit log ─────────────────────────────────────────
      logSecurityEvent({
        type:      'admin_action',
        severity:  statusUpdated ? 'high' : 'medium',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:            'admin_update_developer',
          targetDeveloperId: developerIdStr,
          statusUpdated,
          trustUpdated,
          changes,
          requestId,
        },
      });

      // ── Build message ──────────────────────────────────────
      let message = 'Developer updated successfully';
      if (statusUpdated && trustUpdated) {
        message = `Developer ${status} and trust metrics updated`;
      } else if (trustUpdated) {
        message = 'Trust metrics updated successfully';
      } else if (statusUpdated) {
        message = `Developer status updated to ${status}`;
      }

      // ── Response — lean snapshot, no encrypted fields ──────
      // ✅ adminNotes is select:false — must explicitly include in admin response
      const snapshot = await DeveloperProfile.findById(developerIdStr)
        .select({
          companyName:        1,
          slug:               1,
          status:             1,
          isVerified:         1,
          verificationLevel:  1,
          highriseScore:      1,
          onTimeDeliveryRate: 1,
          riskLevel:          1,
          adminNotes:         1,   // select:false field — explicit inclusion required
          updatedAt:          1,
        })
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      void res.status(200).json({
        success: true,
        message,
        developer: snapshot,
        requestId,
      });

    } catch (error: unknown) {
      logSecurityEvent({
        type:      'admin_action',
        severity:  'high',
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:            'admin_update_developer_error',
          targetDeveloperId: developerIdStr,
          errorCode:         error instanceof Error ? error.message : 'UNKNOWN',
          requestId,
        },
      });

      void res.status(500).json({
        success: false,
        message: 'Internal server error',
        code:    'SERVER_ERROR',
        requestId,
      });
    }
  }
}