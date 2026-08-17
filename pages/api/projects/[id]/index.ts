/**
 * pages/api/projects/[id]/index.ts
 * 
 * GET   /api/projects/[id]  → Public project detail (by ObjectId OR slug)
 * PATCH /api/projects/[id]  → Developer content update (owner or admin)
 * PUT   /api/projects/[id]  → 410 Gone (use PATCH)
 * DELETE /api/projects/[id] → 410 Gone (use /trash endpoint)
 * 
 * V5.0.0 — Aligned with Projects.ts model, Unit.ts, requireAuth guards,
 *           Upstash rate limiting, logSecurityEvent, findOne()+save() pattern
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';
import DeveloperProfile from '@/models/DeveloperProfile';

import {
  requireAuth,
  getClientIp,
} from '@/lib/requireAuth';

import {
  rateLimitApi,
  rateLimitDeveloper,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';

import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { getOptionalAuth } from '@/lib/optionalAuth';

import {
  syncUnitTypeBreakdown,
  denormalizeProjectToUnits,
} from '@/lib/units/syncUnitTypeBreakdown';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  code?: string;
  project?: T;
  errors?: Record<string, string[]>;
};

// ─────────────────────────────────────────────
// Zod v4 — PATCH validation schema
// ─────────────────────────────────────────────

const PatchProjectSchema = z.object({
  // Identity
  projectName:      z.string().min(3).max(120).optional(),
  tagline:          z.string().max(200).optional(),
  shortDescription: z.string().max(500).optional(),
  description:      z.string().max(10000).optional(),

  // Category & nature
  projectCategory: z.enum([
    'highrise', 'society', 'mixed_use',
    'commercial_plaza', 'townhouse', 'gated_community',
  ]).optional(),
  projectNature: z.enum(['residential', 'commercial', 'mixed']).optional(),

  // Location
  city:             z.string().max(80).optional(),
  area:             z.string().max(120).optional(),
  specificLocation: z.string().max(200).optional(),
  googleMapLink:    z.string().url().optional().or(z.literal('')),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),

  // Pricing
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  priceRangeText: z.string().max(100).optional(),

  // Timeline
  launchDate:             z.string().optional(),
  expectedCompletionDate: z.string().optional(),
  possessionStartDate:    z.string().optional(),
  developmentProgress:    z.number().min(0).max(100).optional(),

  // Units summary (manual override before sync)
  totalUnits:      z.number().int().min(0).optional(),

  // Media
  featureImageUrl: z.string().url().optional(),
  images: z.array(z.object({
    url:       z.string().url(),
    isPrimary: z.boolean().optional(),
    caption:   z.string().max(200).optional(),
  })).max(30).optional(),

  // Legal
  legalDocs: z.array(z.object({
    title: z.string().max(100),
    url:   z.string().url(),
    type:  z.string().max(50).optional(),
  })).max(10).optional(),

  // Installment plan
  installmentPlan: z.object({
    available:          z.boolean().optional(),
    downPaymentPercent: z.number().min(0).max(100).optional(),
    monthlyInstallment: z.number().min(0).optional(),
    installmentMonths:  z.number().int().min(0).optional(),
    handoverPercent:    z.number().min(0).max(100).optional(),
  }).optional(),

  // Submit for review (draft → pending)
  submitForReview: z.boolean().optional(),
}).strict();

type PatchBody = z.infer<typeof PatchProjectSchema>;

// ─────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function normalizeId(id: string | string[] | undefined): string {
  if (Array.isArray(id)) return String(id[0] ?? '').trim();
  return String(id ?? '').trim();
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Resolve project by ObjectId OR slug.
 * Returns the Mongoose document (not lean) for save() pattern.
 */
async function resolveProject(identifier: string, includeDeleted = false) {
  const filter: Record<string, unknown> = includeDeleted
    ? {}
    : { isDeleted: { $ne: true } };

  if (isValidObjectId(identifier)) {
    const byId = await Project.findOne({ _id: identifier, ...filter })
      .maxTimeMS(3000);
    if (byId) return byId;
  }

  return Project.findOne({ slug: identifier, ...filter }).maxTimeMS(3000);
}

/**
 * Check if a project is publicly visible.
 * V5.0.0 status enum: draft | pending | verified | rejected
 */
function isPubliclyVisible(project: InstanceType<typeof Project>): boolean {
  return project.isVerified === true || project.status === 'verified';
}

/**
 * Primary image: featureImageUrl → first isPrimary image → first image.
 */
function getPrimaryImage(project: InstanceType<typeof Project>): string | null {
  const p = project as unknown as {
    featureImageUrl?: string;
    images?: Array<{ url: string; isPrimary?: boolean }>;
  };
  if (p.featureImageUrl) return p.featureImageUrl;
  if (Array.isArray(p.images) && p.images.length > 0) {
    const primary = p.images.find((img) => img.isPrimary);
    return primary?.url ?? p.images[0]?.url ?? null;
  }
  return null;
}

/**
 * Strip developer contact details from profile for public responses.
 * Managed marketplace: Highrise is the first point of contact.
 */
function sanitizeDevProfileForPublic(
  profile: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!profile || typeof profile !== 'object') return null;
  const safe = { ...profile };
  // Never expose contact channels publicly — Highrise team is first contact
  delete safe.contactNumber;
  delete safe.whatsappNumber;
  delete safe.officialEmail;
  delete safe.ceoPhone;
  return safe;
}

/**
 * Format price in Pakistani convention: Crore / Lac / Thousand
 */
function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000)    return `${(amount / 100_000).toFixed(2)} Lac`;
  if (amount >= 1_000)      return `${(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  setSecurityHeaders(res);

  const method = (req.method ?? 'GET').toUpperCase();

  // ── Deprecated methods ──────────────────────
  if (method === 'PUT') {
    res.setHeader('Allow', ['GET', 'PATCH']);
    return void res.status(410).json({
      success: false,
      message: 'PUT is deprecated. Use PATCH for partial updates.',
      code: 'METHOD_DEPRECATED',
    });
  }

  if (method === 'DELETE') {
    res.setHeader('Allow', ['GET', 'PATCH']);
    return void res.status(410).json({
      success: false,
      message: 'DELETE via this endpoint is deprecated. Use POST /api/projects/[id]/trash',
      code: 'METHOD_DEPRECATED',
    });
  }

  if (method !== 'GET' && method !== 'PATCH') {
    res.setHeader('Allow', ['GET', 'PATCH']);
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // ── Rate limit ──────────────────────────────
  const rl = await (method === 'PATCH'
    ? rateLimitDeveloper(req)
    : rateLimitApi(req));

  setRateLimitHeaders(res, rl);

  if (!rl.ok) {
    return void sendRateLimitResponse(res, rl);
  }

  // ── Resolve identifier ──────────────────────
  const idOrSlug = normalizeId(req.query.id as string | string[] | undefined);
  if (!idOrSlug) {
    return void res.status(400).json({
      success: false,
      message: 'Project ID or slug is required.',
      code: 'MISSING_IDENTIFIER',
    });
  }

  await dbConnect();

  if (method === 'GET')   return void handleGet(req, res, idOrSlug);
  if (method === 'PATCH') return void handlePatch(req, res, idOrSlug);
}

// ─────────────────────────────────────────────
// GET — Public project detail
// ─────────────────────────────────────────────

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  idOrSlug: string,
): Promise<void> {
  // Optional auth — non-blocking (preview for owner/admin)
  const optionalAuth = await getOptionalAuth(req);
  const viewerId   = optionalAuth?.id ?? null;
  const viewerRole = optionalAuth?.role ?? 'user';
  const isAdmin    = viewerRole === 'admin';

  // Resolve without deleted docs for public GET
  const project = await resolveProject(idOrSlug, false);

  if (!project) {
    // Anti-enumeration: always 404, never 403
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // Project.developerId is the canonical authenticated User reference.
  const projectDeveloperStr = String(
    (project as unknown as { developerId: mongoose.Types.ObjectId }).developerId ?? '',
  );
  const isOwner = viewerId ? projectDeveloperStr === viewerId : false;

  const publicAllowed = isPubliclyVisible(project);

  // Gate non-public to owner/admin only (anti-enumeration 404)
  if (!publicAllowed && !isAdmin && !isOwner) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // Increment view count (fire-and-forget for public, not owner/admin)
  if (publicAllowed && !isAdmin && !isOwner) {
    Project.updateOne(
      { _id: project._id },
      { $inc: { views: 1 } },
    ).exec().catch(() => undefined);

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  } else {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }

  // Get developer profile (for badge + company name)
  const developerProfile = await DeveloperProfile.findOne({
    user: project.developerId,
  })
    .select(
      isAdmin || isOwner
        ? 'companyName logo establishedYear verificationLevel completedProjectsCount ceoName email socialLinks'
        : 'companyName logo establishedYear verificationLevel completedProjectsCount',
    )
    .lean();

  // Unit counts for public summary
  const unitCounts = await Unit.aggregate([
    {
      $match: {
        projectId: project._id,
        isDeleted: { $ne: true },
        ...(isAdmin || isOwner ? {} : { isPublished: true }),
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const unitCountMap: Record<string, number> = {};
  for (const row of unitCounts) {
    unitCountMap[String(row._id)] = Number(row.count);
  }

  // Badge metadata
  const badgeLabels: Record<string, string> = {
    new_entrant: 'New Entrant',
    emerging:    'Emerging Developer',
    trusted:     'Trusted Builder',
    premium:     'Premium Developer',
  };
  const badgeEmojis: Record<string, string> = {
    new_entrant: '🆕',
    emerging:    '⭐',
    trusted:     '🏆',
    premium:     '💎',
  };

  const proj = project as unknown as Record<string, unknown> & {
    developerBadge?: string;
    minPrice?: number;
    maxPrice?: number;
  };

  const badge = String(proj.developerBadge ?? 'new_entrant');

  // Price formatting
  const priceFormatted = {
    min: proj.minPrice ? formatPKR(Number(proj.minPrice)) : null,
    max: proj.maxPrice ? formatPKR(Number(proj.maxPrice)) : null,
  };

  // Sanitize developer profile for public
  const safeDevProfile = isAdmin || isOwner
    ? developerProfile
    : sanitizeDevProfileForPublic(
        developerProfile as Record<string, unknown> | null,
      );

  // Owner/admin get extra fields
  const adminFields: Record<string, unknown> = {};
  if (isAdmin || isOwner) {
    const adminProj = project as unknown as Record<string, unknown>;
    adminFields.rejectionReason = adminProj.rejectionReason ?? null;
    adminFields.verifiedBy      = adminProj.verifiedBy ?? null;
    adminFields.verifiedAt      = adminProj.verifiedAt ?? null;
    adminFields.badgeNotes      = adminProj.badgeNotes ?? null;
  }

  const projectObject = project.toObject() as Record<string, unknown>;
  if (!isAdmin && !isOwner) {
    delete projectObject.developerId;
    delete projectObject.verifiedBy;
    delete projectObject.rejectionReason;
    delete projectObject.badgeNotes;
    delete projectObject.legalDocs;
  }

  return void res.status(200).json({
    success: true,
    project: {
      ...projectObject,
      developerProfile:  safeDevProfile,
      primaryImage:      getPrimaryImage(project),
      badge,
      badgeLabel:        badgeLabels[badge] ?? badge,
      badgeEmoji:        badgeEmojis[badge] ?? '',
      priceFormatted,
      unitLiveCounts:    unitCountMap,
      // UI hint: contact goes through Highrise (managed marketplace)
      contactViaHighrise: true,
      ...adminFields,
    },
  });
}

// ─────────────────────────────────────────────
// PATCH — Developer content update
// ─────────────────────────────────────────────

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  idOrSlug: string,
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // ── Auth: must be logged in ─────────────────
  const authResult = await requireAuth(req, res);
  if (!authResult) return;

  const userId  = authResult.id;
  const role    = authResult.role;
  const ip      = getClientIp(req);
  const isAdmin = role === 'admin';
  const isDev   = role === 'developer';

  // Only developer or admin can PATCH projects
  if (!isAdmin && !isDev) {
    return void res.status(403).json({
      success: false,
      message: 'Only developers or admins can update projects.',
      code: 'FORBIDDEN',
    });
  }

  // ── Resolve project ─────────────────────────
  const project = await resolveProject(idOrSlug, true);

  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Ownership check ─────────────────────────
  const projectDeveloperStr = String(
    (project as unknown as { developerId: mongoose.Types.ObjectId }).developerId ?? '',
  );

  // Anti-enumeration: non-owners get 404 not 403
  if (!isAdmin && projectDeveloperStr !== userId) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Block updates on deleted projects (non-admin) ──
  const proj = project as unknown as { isDeleted?: boolean };
  if (proj.isDeleted && !isAdmin) {
    return void res.status(410).json({
      success: false,
      message: 'This project has been deleted and cannot be updated.',
      code: 'PROJECT_DELETED',
    });
  }

  // ── Developer profile check ─────────────────
  // Developer must have an approved profile to update projects
  if (isDev) {
    const devProfile = await DeveloperProfile.findOne({ user: userId })
      .select('status')
      .lean();

    if (!devProfile || devProfile.status !== 'approved') {
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'medium',
        userId,
        ip,
        metadata: {
          action:   'project_patch_blocked',
          reason:   'developer_profile_not_approved',
          projectId: String(project._id),
        },
        req,
      });

      return void res.status(403).json({
        success: false,
        message: 'Your developer profile must be approved before updating projects.',
        code: 'PROFILE_NOT_APPROVED',
      });
    }
  }

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

  const parsed = PatchProjectSchema.safeParse(body);
  if (!parsed.success) {
    return void res.status(422).json({
      success: false,
      message:  'Validation failed.',
      code:     'VALIDATION_ERROR',
      errors:   parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const data: PatchBody = parsed.data;

  // ── Status transition: submitForReview ──────
  // Developer can move draft → pending by setting submitForReview: true
  // Admin content edits do NOT change status
  const currentStatus = String(
    (project as unknown as { status: string }).status ?? 'draft',
  );

  const allowedStatusTransitions: Record<string, string[]> = {
    draft:    ['pending'],
    rejected: ['pending'], // re-submit after rejection
  };

  let newStatus: string | undefined;

  if (data.submitForReview === true && !isAdmin) {
    const allowed = allowedStatusTransitions[currentStatus] ?? [];
    if (allowed.includes('pending')) {
      newStatus = 'pending';
    } else {
      return void res.status(409).json({
        success: false,
        message: `Cannot submit for review. Current status is '${currentStatus}'.`,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }
  }

  // ── Apply changes via findOne() + save() ────
  // ARCH RULE: never findByIdAndUpdate for mutations

  const { submitForReview: _omit, ...updateFields } = data;

  // Apply each validated field to the document
  for (const [key, value] of Object.entries(updateFields)) {
    if (value !== undefined) {
      (project as unknown as Record<string, unknown>)[key] = value;
    }
  }

  // Apply status transition if applicable
  if (newStatus) {
    (project as unknown as Record<string, unknown>).status = newStatus;
  }

  // Track who last edited (non-admin edits are developer; admin edits noted)
  (project as unknown as Record<string, unknown>).updatedAt = new Date();

  await project.save();

  // ── Post-save sync ──────────────────────────
  // If location/slug/badge changed, push to all child units
  const locationChanged = (
    'city' in updateFields ||
    'area' in updateFields ||
    'projectName' in updateFields
  );

  if (locationChanged) {
    await denormalizeProjectToUnits(String(project._id)).catch(() => undefined);
  }

  // Recalculate unitTypeBreakdown after any project update
  await syncUnitTypeBreakdown(String(project._id)).catch(() => undefined);

  // ── Audit log ───────────────────────────────
  await logSecurityEvent({
    type:     'admin_action',
    severity: 'low',
    userId,
    ip,
    metadata: {
      action:        'project_updated',
      projectId:     String(project._id),
      projectSlug:   String((project as unknown as { slug: string }).slug ?? ''),
      updatedFields: Object.keys(updateFields),
      newStatus:     newStatus ?? currentStatus,
      byRole:        role,
    },
    req,
  });

  // ── Response ────────────────────────────────
  return void res.status(200).json({
    success: true,
    message: newStatus === 'pending'
      ? 'Project submitted for review. Our team will verify it shortly.'
      : 'Project updated successfully.',
    project: {
      _id:       String(project._id),
      slug:      String((project as unknown as { slug: string }).slug ?? ''),
      status:    String((project as unknown as { status: string }).status ?? ''),
      updatedAt: new Date().toISOString(),
    },
  });
}