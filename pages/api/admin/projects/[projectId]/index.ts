/**
 * pages/api/admin/projects/[projectId]/index.ts
 *
 * GET   /api/admin/projects/[projectId]  → Admin full project detail
 * PATCH /api/admin/projects/[projectId]  → Admin moderation mutations
 *                                          (verify / reject / feature / restore)
 *
 * Admin-only. Handles ALL verification mutations.
 * Developers use /api/projects/[id] for content updates.
 *
 * V5.0.0 — requireAdmin, findOne()+save(), Upstash rate limit,
 *           logSecurityEvent, syncUnitTypeBreakdown, denormalizeProjectToUnits
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';
import DeveloperProfile from '@/models/DeveloperProfile';

import { requireAdmin } from '@/lib/requireAdmin';
import {
  rateLimitAdmin,
  setRateLimitHeaders,
  sendRateLimitResponse,
  getClientIp,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import {
  syncUnitTypeBreakdown,
  denormalizeProjectToUnits,
} from '@/lib/units/syncUnitTypeBreakdown';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ApiResponse = {
  success: boolean;
  message?: string;
  code?: string;
  project?: unknown;
  errors?: Record<string, string[]>;
};

// ─────────────────────────────────────────────
// Zod v4 — PATCH validation schema
// ─────────────────────────────────────────────

const AdminPatchSchema = z.discriminatedUnion('action', [

  // ── Verify project ──────────────────────────
  z.object({
    action: z.literal('verify'),
    note:   z.string().max(500).optional(),
  }),

  // ── Reject project ──────────────────────────
  z.object({
    action:          z.literal('reject'),
    rejectionReason: z.string().min(10).max(1000),
  }),

  // ── Toggle featured ─────────────────────────
  z.object({
    action:     z.literal('feature'),
    isFeatured: z.boolean(),
  }),

  // ── Restore from trash ──────────────────────
  z.object({
    action: z.literal('restore'),
    note:   z.string().max(500).optional(),
  }),

  // ── Re-open rejected → pending ──────────────
  z.object({
    action: z.literal('reopen'),
    note:   z.string().max(500).optional(),
  }),

  // ── Suspend a verified project ──────────────
  z.object({
    action: z.literal('suspend'),
    reason: z.string().min(10).max(1000),
  }),

  // ── Add risk alert ───────────────────────────
  z.object({
    action:      z.literal('add-alert'),
    title:       z.string().min(5).max(200),
    description: z.string().min(10).max(2000),
    severity:    z.enum(['low', 'medium', 'high', 'critical']),
    category:    z.enum(['legal', 'financial', 'construction', 'fraud', 'noc', 'general']),
    issuedBy:    z.string().min(2).max(150),
    issuedAt:    z.string().datetime().optional(),
    sourceUrl:   z.string().url().optional().or(z.literal('')),
    affectedUnits: z.array(z.string().max(100)).max(50).optional(),
  }),

  // ── Update risk alert ────────────────────────
  z.object({
    action:      z.literal('update-alert'),
    alertId:     z.string().length(24, { message: 'Invalid alert ID' }),
    title:       z.string().min(5).max(200).optional(),
    description: z.string().min(10).max(2000).optional(),
    severity:    z.enum(['low', 'medium', 'high', 'critical']).optional(),
    category:    z.enum(['legal', 'financial', 'construction', 'fraud', 'noc', 'general']).optional(),
    issuedBy:    z.string().min(2).max(150).optional(),
    status:      z.enum(['active', 'resolved', 'investigating']).optional(),
    sourceUrl:   z.string().url().optional().or(z.literal('')),
    affectedUnits: z.array(z.string().max(100)).max(50).optional(),
  }),

  // ── Remove risk alert ────────────────────────
  z.object({
    action:  z.literal('remove-alert'),
    alertId: z.string().length(24, { message: 'Invalid alert ID' }),
  }),

]) as z.ZodType<AdminPatchBody>;

type AdminPatchBody =
  | { action: 'verify';  note?: string }
  | { action: 'reject';  rejectionReason: string }
  | { action: 'feature'; isFeatured: boolean }
  | { action: 'restore'; note?: string }
  | { action: 'reopen';  note?: string }
  | { action: 'suspend'; reason: string }
  | {
      action: 'add-alert';
      title: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      category: 'legal' | 'financial' | 'construction' | 'fraud' | 'noc' | 'general';
      issuedBy: string;
      issuedAt?: string;
      sourceUrl?: string;
      affectedUnits?: string[];
    }
  | {
      action: 'update-alert';
      alertId: string;
      title?: string;
      description?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'legal' | 'financial' | 'construction' | 'fraud' | 'noc' | 'general';
      issuedBy?: string;
      status?: 'active' | 'resolved' | 'investigating';
      sourceUrl?: string;
      affectedUnits?: string[];
    }
  | { action: 'remove-alert'; alertId: string };

// ─────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) &&
    /^[a-fA-F0-9]{24}$/.test(id);
}

function normalizeParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
}

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000)    return `${(amount / 100_000).toFixed(2)} Lac`;
  if (amount >= 1_000)      return `${(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

function getPrimaryImage(p: Record<string, unknown>): string | null {
  if (typeof p.featureImageUrl === 'string' && p.featureImageUrl) {
    return p.featureImageUrl;
  }
  if (Array.isArray(p.images) && p.images.length > 0) {
    const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
    return imgs.find((i) => i.isPrimary)?.url ?? imgs[0]?.url ?? null;
  }
  return null;
}

/**
 * Resolve project by ObjectId OR slug.
 * Returns Mongoose document (not lean) for save() pattern.
 * Admin: always include deleted docs.
 */
async function resolveProject(identifier: string) {
  if (isValidObjectId(identifier)) {
    const byId = await Project.findById(identifier).maxTimeMS(3000);
    if (byId) return byId;
  }
  return Project.findOne({ slug: identifier }).maxTimeMS(3000);
}

// ─────────────────────────────────────────────
// Action → status mapping
// ─────────────────────────────────────────────

// V5.0.0 status enum: 'draft' | 'pending' | 'verified' | 'rejected'
const ACTION_STATUS_MAP: Partial<Record<string, string>> = {
  verify:  'verified',
  reject:  'rejected',
  restore: 'draft',     // restore brings back to draft for re-submission
  reopen:  'pending',   // admin re-opens rejected → back in queue
  suspend: 'rejected',  // suspend uses rejected status with reason
  // Alert sub-operations do NOT change project status
  'add-alert':    undefined,
  'update-alert': undefined,
  'remove-alert': undefined,
};

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  setSecurityHeaders(res);

  const method = (req.method ?? 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'PATCH') {
    res.setHeader('Allow', ['GET', 'PATCH']);
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // ── Rate limit ──────────────────────────────
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  // ── Admin auth ──────────────────────────────
  const authResult = await requireAdmin(req, res);
  if (!authResult) return;

  const userId = authResult.id;
  const ip     = getClientIp(req);

  // ── Resolve projectId ───────────────────────
  const projectId = normalizeParam(
    req.query.projectId as string | string[] | undefined,
  ).trim();

  if (!projectId) {
    return void res.status(400).json({
      success: false,
      message: 'Project ID is required.',
      code: 'MISSING_ID',
    });
  }

  await dbConnect();

  if (method === 'GET')   return void handleGet(req, res, projectId, userId, ip);
  if (method === 'PATCH') return void handlePatch(req, res, projectId, userId, ip);
}

// ─────────────────────────────────────────────
// GET — Admin full project detail
// ─────────────────────────────────────────────

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  projectId: string,
  userId: string,
  ip: string,
): Promise<void> {
  const project = await resolveProject(projectId);

  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  const proj = project as unknown as Record<string, unknown>;

  // ── Developer profile ────────────────────────
  const developerProfile = await DeveloperProfile.findOne({
    user: proj.developerId,
  })
    .select(
      'companyName ceoName logo establishedYear verificationLevel ' +
      'completedProjectsCount status email socialLinks',
    )
    .lean();

  // ── Unit summary ─────────────────────────────
  const unitCounts = await Unit.aggregate([
    {
      $match: {
        projectId: new mongoose.Types.ObjectId(String(proj._id ?? '')),
        isDeleted: { $ne: true },
      },
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const unitCountMap: Record<string, number> = {};
  for (const row of unitCounts) {
    unitCountMap[String(row._id ?? 'unknown')] = Number(row.count);
  }

  // ── Badge metadata ───────────────────────────
  const BADGE_LABELS: Record<string, string> = {
    new_entrant: 'New Entrant',
    emerging:    'Emerging Developer',
    trusted:     'Trusted Builder',
    premium:     'Premium Developer',
  };
  const BADGE_EMOJIS: Record<string, string> = {
    new_entrant: '🆕',
    emerging:    '⭐',
    trusted:     '🏆',
    premium:     '💎',
  };

  const badge = String(proj.developerBadge ?? 'new_entrant');

  // ── Audit log ────────────────────────────────
  await logSecurityEvent({
    type:     'admin_action',
    severity: 'low',
    userId,
    ip,
    metadata: {
      action:    'admin_project_detail_view',
      projectId: String(proj._id ?? ''),
      slug:      String(proj.slug ?? ''),
    },
    req,
  });

  return void res.status(200).json({
    success: true,
    project: {
      ...project.toObject(),
      primaryImage:     getPrimaryImage(proj),
      badge,
      badgeLabel:       BADGE_LABELS[badge] ?? badge,
      badgeEmoji:       BADGE_EMOJIS[badge] ?? '',
      priceFormatted: {
        min: proj.minPrice ? formatPKR(Number(proj.minPrice)) : null,
        max: proj.maxPrice ? formatPKR(Number(proj.maxPrice)) : null,
      },
      developerProfile,
      unitLiveCounts: unitCountMap,
    },
  });
}

// ─────────────────────────────────────────────
// PATCH — Admin moderation mutations
// ─────────────────────────────────────────────

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  projectId: string,
  userId: string,
  ip: string,
): Promise<void> {
  // ── Parse + validate body ───────────────────
  let body: unknown;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return void res.status(400).json({
      success: false,
      message: 'Invalid JSON body.',
      code: 'INVALID_JSON',
    });
  }

  const parsed = AdminPatchSchema.safeParse(body);
  if (!parsed.success) {
    return void res.status(422).json({
      success:  false,
      message:  'Validation failed.',
      code:     'VALIDATION_ERROR',
      errors:   parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const data: AdminPatchBody = parsed.data;

  // ── Resolve project ─────────────────────────
  // Admin sees all — include deleted (restore action needs it)
  const project = await resolveProject(projectId);

  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  const proj          = project as unknown as Record<string, unknown>;
  const currentStatus = String(proj.status ?? 'draft');
  const currentSlug   = String(proj.slug ?? '');

  // ── Action-specific guards ───────────────────

  if (data.action === 'verify') {
    // Only pending projects can be verified
    if (currentStatus !== 'pending') {
      return void res.status(409).json({
        success: false,
        message: `Only pending projects can be verified. Current status: '${currentStatus}'.`,
        code: 'INVALID_STATE',
      });
    }
  }

  if (data.action === 'reject') {
    // Can reject pending or verified (e.g. fraud discovered post-verify)
    if (!['pending', 'verified'].includes(currentStatus)) {
      return void res.status(409).json({
        success: false,
        message: `Cannot reject a project with status '${currentStatus}'.`,
        code: 'INVALID_STATE',
      });
    }
  }

  if (data.action === 'restore') {
    // Must be soft-deleted to restore
    if (proj.isDeleted !== true) {
      return void res.status(409).json({
        success: false,
        message: 'Project is not in trash. Nothing to restore.',
        code: 'NOT_TRASHED',
      });
    }
  }

  if (data.action === 'reopen') {
    // Only rejected projects can be re-opened
    if (currentStatus !== 'rejected') {
      return void res.status(409).json({
        success: false,
        message: `Only rejected projects can be reopened. Current status: '${currentStatus}'.`,
        code: 'INVALID_STATE',
      });
    }
  }

  if (data.action === 'suspend') {
    // Only verified projects can be suspended
    if (currentStatus !== 'verified') {
      return void res.status(409).json({
        success: false,
        message: `Only verified projects can be suspended. Current status: '${currentStatus}'.`,
        code: 'INVALID_STATE',
      });
    }
  }

  // ── Alert sub-operation guards ───────────────
  if (data.action === 'update-alert' || data.action === 'remove-alert') {
    const alerts = proj.riskAlerts as Array<{ _id?: { toString(): string } }> | undefined;
    const exists = Array.isArray(alerts) &&
      alerts.some((a) => a?._id?.toString() === data.alertId);
    if (!exists) {
      return void res.status(404).json({
        success: false,
        message: 'Risk alert not found on this project.',
        code: 'ALERT_NOT_FOUND',
      });
    }
  }

  // Alert array cap — max 20 alerts per project
  if (data.action === 'add-alert') {
    const alerts = proj.riskAlerts as Array<unknown> | undefined;
    if (Array.isArray(alerts) && alerts.length >= 20) {
      return void res.status(422).json({
        success: false,
        message: 'Maximum 20 risk alerts per project. Please resolve or remove existing alerts first.',
        code: 'ALERT_LIMIT_REACHED',
      });
    }
  }

  // ── Apply mutations via save() ───────────────
  // ARCH RULE: findOne() + save() — never findByIdAndUpdate

  const newStatus = ACTION_STATUS_MAP[data.action];

  if (newStatus) {
    proj.status = newStatus;

    // isVerified sync (auto-derives from status)
    proj.isVerified = newStatus === 'verified';
  }

  // Action-specific field updates
  switch (data.action) {
    case 'verify':
      proj.verifiedBy        = userId;
      proj.verifiedAt        = new Date();
      proj.rejectionReason   = null;
      proj.isDeleted         = false;
      proj.deletedAt         = null;
      break;

    case 'reject':
      proj.rejectionReason   = data.rejectionReason;
      proj.verifiedBy        = null;
      proj.verifiedAt        = null;
      break;

    case 'feature':
      proj.isFeatured        = data.isFeatured;
      // Feature action does NOT change status
      break;

    case 'restore':
      proj.isDeleted         = false;
      proj.deletedAt         = null;
      proj.rejectionReason   = null;
      break;

    case 'reopen':
      proj.rejectionReason   = null;
      proj.verifiedBy        = null;
      proj.verifiedAt        = null;
      break;

    case 'suspend':
      proj.rejectionReason   = data.reason;
      proj.verifiedBy        = null;
      proj.verifiedAt        = null;
      break;

    case 'add-alert': {
      // Initialise array if missing (backward compat for pre-V5.7 docs)
      if (!Array.isArray(proj.riskAlerts)) proj.riskAlerts = [];
      const alerts = proj.riskAlerts as Array<Record<string, unknown>>;
      alerts.push({
        _id:          new mongoose.Types.ObjectId(),
        title:        data.title,
        description:  data.description,
        severity:     data.severity,
        category:     data.category,
        issuedBy:     data.issuedBy,
        issuedAt:     data.issuedAt ? new Date(data.issuedAt) : new Date(),
        status:       'active',
        sourceUrl:    data.sourceUrl || undefined,
        affectedUnits: data.affectedUnits || [],
        createdBy:    userId,
      });
      break;
    }

    case 'update-alert': {
      const alerts = proj.riskAlerts as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(alerts)) {
        const idx = alerts.findIndex(
          (a) => String(a._id) === data.alertId
        );
        if (idx !== -1) {
          const alert = alerts[idx];
          if (data.title !== undefined)       alert.title       = data.title;
          if (data.description !== undefined) alert.description = data.description;
          if (data.severity !== undefined)    alert.severity    = data.severity;
          if (data.category !== undefined)    alert.category    = data.category;
          if (data.issuedBy !== undefined)    alert.issuedBy    = data.issuedBy;
          if (data.sourceUrl !== undefined)   alert.sourceUrl   = data.sourceUrl || undefined;
          if (data.affectedUnits !== undefined) alert.affectedUnits = data.affectedUnits;
          if (data.status !== undefined) {
            alert.status = data.status;
            // Auto-set resolvedAt when marking resolved
            if (data.status === 'resolved' && !alert.resolvedAt) {
              alert.resolvedAt = new Date();
            }
            if (data.status !== 'resolved') {
              alert.resolvedAt = undefined;
            }
          }
          alerts[idx] = alert;
        }
      }
      break;
    }

    case 'remove-alert': {
      const alerts = proj.riskAlerts as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(alerts)) {
        proj.riskAlerts = alerts.filter(
          (a) => String(a._id) !== data.alertId
        ) as typeof proj.riskAlerts;
      }
      break;
    }
  }

  await project.save();

  // ── Post-save sync ───────────────────────────
  const projObjId = String(proj._id ?? '');

  // Always sync breakdown after admin mutation
  await syncUnitTypeBreakdown(projObjId).catch(() => undefined);

  // On verify/restore: push verified status to all child units
  if (data.action === 'verify' || data.action === 'restore') {
    await denormalizeProjectToUnits(projObjId).catch(() => undefined);
  }

  // ── Audit log ────────────────────────────────
  const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
    verify:         'high',
    reject:         'high',
    feature:        'low',
    restore:        'medium',
    reopen:         'medium',
    suspend:        'high',
    'add-alert':    'high',
    'update-alert': 'medium',
    'remove-alert': 'medium',
  };

  await logSecurityEvent({
    type:     'project_approved',
    severity: severityMap[data.action] ?? 'medium',
    userId,
    ip,
    metadata: {
      action:        `project_${data.action}`,
      projectId:     projObjId,
      projectSlug:   currentSlug,
      projectName:   String(proj.projectName ?? ''),
      previousStatus: currentStatus,
      newStatus:     newStatus ?? currentStatus,
      // Action-specific audit fields
      ...(data.action === 'reject'
        ? { rejectionReason: data.rejectionReason }
        : {}),
      ...(data.action === 'suspend'
        ? { suspendReason: data.reason }
        : {}),
      ...(data.action === 'feature'
        ? { isFeatured: data.isFeatured }
        : {}),
    },
    req,
  });

  // ── Response ─────────────────────────────────
  const successMessages: Record<string, string> = {
    verify:  'Project verified and published successfully.',
    reject:  'Project rejected. Developer will be notified.',
    feature: data.action === 'feature'
      ? (data as { action: 'feature'; isFeatured: boolean }).isFeatured
        ? 'Project featured on homepage.'
        : 'Project removed from featured listings.'
      : '',
    restore:        'Project restored from trash. Status reset to draft.',
    reopen:         'Project reopened. Status set to pending for re-review.',
    suspend:        'Project suspended successfully.',
    'add-alert':    'Risk alert added to project successfully.',
    'update-alert': 'Risk alert updated successfully.',
    'remove-alert': 'Risk alert removed successfully.',
  };

  return void res.status(200).json({
    success: true,
    message: successMessages[data.action] ?? 'Project updated.',
    project: {
      _id:            String(proj._id ?? ''),
      slug:           currentSlug,
      projectName:    String(proj.projectName ?? ''),
      status:         String(proj.status ?? ''),
      isVerified:     Boolean(proj.isVerified),
      isFeatured:     Boolean(proj.isFeatured),
      isDeleted:      Boolean(proj.isDeleted),
      rejectionReason: proj.rejectionReason ?? null,
      verifiedAt:     proj.verifiedAt ?? null,
      updatedAt:      new Date().toISOString(),
      // Return updated alerts so admin UI can refresh without refetch
      riskAlerts:     Array.isArray(proj.riskAlerts)
        ? (proj.riskAlerts as Array<Record<string, unknown>>).map((a) => ({
            _id:          String(a._id ?? ''),
            title:        String(a.title ?? ''),
            description:  String(a.description ?? ''),
            severity:     String(a.severity ?? 'medium'),
            category:     String(a.category ?? 'general'),
            issuedBy:     String(a.issuedBy ?? ''),
            status:       String(a.status ?? 'active'),
            issuedAt:     a.issuedAt instanceof Date
              ? a.issuedAt.toISOString()
              : String(a.issuedAt ?? ''),
            resolvedAt:   a.resolvedAt instanceof Date
              ? a.resolvedAt.toISOString()
              : (a.resolvedAt ? String(a.resolvedAt) : null),
            sourceUrl:    a.sourceUrl ?? null,
            affectedUnits: Array.isArray(a.affectedUnits)
              ? a.affectedUnits
              : [],
          }))
        : [],
    },
  });
}