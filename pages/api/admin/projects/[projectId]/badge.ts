/**
 * pages/api/admin/projects/[projectId]/badge.ts
 *
 * PATCH /api/admin/projects/[projectId]/badge
 *
 * Admin assigns or overrides a developer badge tier for a project.
 * Badge is also synced to the developer's profile and all child units.
 *
 * 4 Badge Tiers (V5.0.0):
 *   new_entrant  → 0 completed projects   🆕
 *   emerging     → 1-2 completed projects  ⭐
 *   trusted      → 3-9 completed projects  🏆
 *   premium      → 10+ completed projects  💎
 *
 * Auto-derive is default. Admin override adds audit trail.
 *
 * V5.0.0 — requireAdmin, findOne()+save(), Upstash rate limit,
 *           logSecurityEvent, denormalizeProjectToUnits
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import DeveloperProfile from '@/models/DeveloperProfile';

import { requireAdmin, getClientIp } from '@/lib/requireAuth';
import {
  rateLimitAdmin,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { denormalizeProjectToUnits } from '@/lib/units/syncUnitTypeBreakdown';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type DeveloperBadge = 'new_entrant' | 'emerging' | 'trusted' | 'premium';

type ApiResponse = {
  success: boolean;
  message?: string;
  code?: string;
  project?: unknown;
  errors?: Record<string, string[]>;
};

// ─────────────────────────────────────────────
// Zod v4 — PATCH validation
// ─────────────────────────────────────────────

const BadgeSchema = z.object({
  // Target badge tier
  badge: z.enum(['new_entrant', 'emerging', 'trusted', 'premium'], {
    message: 'Badge must be one of: new_entrant, emerging, trusted, premium',
  }),

  // Admin note — required for override audit trail
  notes: z.string().min(5).max(500),

  // Whether to also update the developer profile badge
  // Default: true — keeps project + profile in sync
  syncToProfile: z.boolean().optional().default(true),

  // Whether to reset back to auto-derived badge
  // If true: ignores 'badge' field and re-derives from completedProjectsCount
  resetToAuto: z.boolean().optional().default(false),
}).strict();

type BadgeBody = z.infer<typeof BadgeSchema>;

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

/**
 * Auto-derive badge tier from completedProjectsCount.
 * Mirrors the Projects.ts pre-save hook logic.
 *
 *   0       → new_entrant
 *   1–2     → emerging
 *   3–9     → trusted
 *   10+     → premium
 */
function deriveBadge(completedCount: number): DeveloperBadge {
  if (completedCount >= 10) return 'premium';
  if (completedCount >= 3)  return 'trusted';
  if (completedCount >= 1)  return 'emerging';
  return 'new_entrant';
}

// Badge metadata for response
const BADGE_LABELS: Record<DeveloperBadge, string> = {
  new_entrant: 'New Entrant',
  emerging:    'Emerging Developer',
  trusted:     'Trusted Builder',
  premium:     'Premium Developer',
};

const BADGE_EMOJIS: Record<DeveloperBadge, string> = {
  new_entrant: '🆕',
  emerging:    '⭐',
  trusted:     '🏆',
  premium:     '💎',
};

// Badge → color (design system locked)
const BADGE_COLORS: Record<DeveloperBadge, string> = {
  new_entrant: '#6b7280',
  emerging:    '#3b82f6',
  trusted:     '#029bba',
  premium:     '#7c3aed',
};

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed. Use PATCH.',
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

  if (!projectId || !isValidObjectId(projectId)) {
    return void res.status(400).json({
      success: false,
      message: 'Valid project ID is required.',
      code: 'INVALID_ID',
    });
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

  const parsed = BadgeSchema.safeParse(body);
  if (!parsed.success) {
    return void res.status(422).json({
      success: false,
      message: 'Validation failed.',
      code:    'VALIDATION_ERROR',
      errors:  parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const data: BadgeBody = parsed.data;

  await dbConnect();

  // ── Fetch project via findOne() for save() ───
  // ARCH RULE: never findByIdAndUpdate for mutations
  const project = await Project.findById(projectId).maxTimeMS(3000);

  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  const proj = project as unknown as Record<string, unknown>;

  // ── Fetch developer profile for completedCount ─
  const devProfile = await DeveloperProfile.findOne({
    user: proj.developerId,
  })
    .select('completedProjectsCount developerBadge status companyName')
    .lean();

  const devProfileRaw = devProfile as unknown as Record<string, unknown> | null;

  const completedCount = typeof devProfileRaw?.completedProjectsCount === 'number'
    ? devProfileRaw.completedProjectsCount
    : 0;

  // ── Determine target badge ───────────────────
  let targetBadge: DeveloperBadge;
  let isAutoReset = false;

  if (data.resetToAuto) {
    // Re-derive from completedProjectsCount
    targetBadge = deriveBadge(completedCount);
    isAutoReset = true;
  } else {
    targetBadge = data.badge;
  }

  const previousBadge = String(proj.developerBadge ?? 'new_entrant') as DeveloperBadge;

  // ── Idempotency ──────────────────────────────
  if (previousBadge === targetBadge && !isAutoReset) {
    return void res.status(200).json({
      success: true,
      message: `Project already has '${BADGE_EMOJIS[targetBadge]} ${BADGE_LABELS[targetBadge]}' badge. No change made.`,
      project: {
        _id:          String(proj._id ?? ''),
        slug:         String(proj.slug ?? ''),
        developerBadge: targetBadge,
        badgeLabel:   BADGE_LABELS[targetBadge],
        badgeEmoji:   BADGE_EMOJIS[targetBadge],
        badgeColor:   BADGE_COLORS[targetBadge],
      },
    });
  }

  // ── Apply badge to project via save() ────────
  proj.developerBadge    = targetBadge;
  proj.badgeAssignedBy   = userId;
  proj.badgeAssignedAt   = new Date();
  proj.badgeNotes        = data.notes;

  // isTrustedBuilder auto-derives from badge
  // (mirrors Projects.ts pre-save hook)
  proj.isTrustedBuilder = targetBadge === 'trusted' || targetBadge === 'premium';

  await project.save();

  // ── Sync badge to developer profile ──────────
  let profileSynced = false;

  if (data.syncToProfile && devProfile) {
    await DeveloperProfile.findOneAndUpdate(
      { user: proj.developerId },
      {
        $set: {
          developerBadge:    targetBadge,
          badgeAssignedBy:   userId,
          badgeAssignedAt:   new Date(),
          badgeNotes:        data.notes,
        },
      },
      { maxTimeMS: 3000 },
    ).catch(() => undefined);

    profileSynced = true;
  }

  // ── Denormalize badge to all child units ─────
  // Unit.ts has developerBadge denormalized field
  await denormalizeProjectToUnits(String(proj._id ?? '')).catch(() => undefined);

  // ── Audit log ────────────────────────────────
  await logSecurityEvent({
    type:     'admin_action',
    severity: 'medium',
    userId,
    ip,
    metadata: {
      action:        'badge_assigned',
      projectId:     String(proj._id ?? ''),
      projectSlug:   String(proj.slug ?? ''),
      projectName:   String(proj.projectName ?? ''),
      previousBadge,
      newBadge:      targetBadge,
      isAutoReset,
      syncToProfile: data.syncToProfile,
      profileSynced,
      notes:         data.notes,
      developerCompletedProjects: completedCount,
    },
    req,
  });

  // ── Response ─────────────────────────────────
  const autoResetMsg = isAutoReset
    ? ` (auto-derived from ${completedCount} completed project${completedCount !== 1 ? 's' : ''})`
    : '';

  return void res.status(200).json({
    success: true,
    message: `Badge updated to ${BADGE_EMOJIS[targetBadge]} ${BADGE_LABELS[targetBadge]}${autoResetMsg}.`,
    project: {
      _id:            String(proj._id ?? ''),
      slug:           String(proj.slug ?? ''),
      projectName:    String(proj.projectName ?? ''),
      developerBadge: targetBadge,
      badgeLabel:     BADGE_LABELS[targetBadge],
      badgeEmoji:     BADGE_EMOJIS[targetBadge],
      badgeColor:     BADGE_COLORS[targetBadge],
      isTrustedBuilder: Boolean(proj.isTrustedBuilder),
      badgeAssignedAt:  new Date().toISOString(),
      previousBadge,
      previousBadgeLabel: BADGE_LABELS[previousBadge] ?? previousBadge,
      profileSynced,
      unitsSynced: true,
    },
  });
}