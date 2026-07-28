/**
 * pages/api/projects/[id]/trash.ts
 *
 * POST /api/projects/[id]/trash
 *
 * Soft-delete (trash) or restore a project.
 * Body: { action: 'trash' | 'restore' }
 *
 * Access:
 *   - Developer: own projects only
 *   - Admin: any project
 *
 * V5.0.0 — findOne() + save(), requireAuth, Upstash rate limit,
 *           logSecurityEvent, syncUnitTypeBreakdown on restore
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';

import { requireAuth, getClientIp } from '@/lib/requireAuth';
import {
  rateLimitDeveloper,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ApiResponse = {
  success: boolean;
  message: string;
  code?: string;
  projectId?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  idempotent?: boolean;
};

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
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Parse action from body.
 * Accepts: { action: 'trash' | 'restore' }
 * Also accepts legacy: { isDeleted: true | false }
 */
function parseAction(body: unknown): 'trash' | 'restore' | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  // Primary: explicit action string
  if (typeof b.action === 'string') {
    if (b.action === 'trash')   return 'trash';
    if (b.action === 'restore') return 'restore';
    return null;
  }

  // Legacy fallback: isDeleted boolean
  if (typeof b.isDeleted === 'boolean') {
    return b.isDeleted ? 'trash' : 'restore';
  }
  if (typeof b.isDeleted === 'string') {
    const s = b.isDeleted.toLowerCase().trim();
    if (s === 'true'  || s === '1') return 'trash';
    if (s === 'false' || s === '0') return 'restore';
  }

  return null;
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  setSecurityHeaders(res);

  // POST only — trash is an action, not a resource replacement
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // ── Rate limit ──────────────────────────────
  const rl = await rateLimitDeveloper(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  // ── Auth ────────────────────────────────────
  const authResult = await requireAuth(req, res);
  if (!authResult) return;

  const userId  = authResult.id;
  const role    = authResult.role;
  const isAdmin = role === 'admin';
  const ip      = getClientIp(req);

  // Only developer or admin
  if (!isAdmin && role !== 'developer') {
    return void res.status(403).json({
      success: false,
      message: 'Only developer accounts can trash or restore projects.',
      code: 'FORBIDDEN',
    });
  }

  // ── Validate ID ─────────────────────────────
  const rawId = req.query.id;
  const id    = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || !isValidObjectId(String(id))) {
    return void res.status(400).json({
      success: false,
      message: 'Invalid or missing project ID.',
      code: 'INVALID_ID',
    });
  }

  // ── Parse action ────────────────────────────
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

  const action = parseAction(body);
  if (!action) {
    return void res.status(400).json({
      success: false,
      message: "Body must include { action: 'trash' | 'restore' }.",
      code: 'MISSING_ACTION',
    });
  }

  await dbConnect();

  // ── Fetch project ────────────────────────────
  // Use findOne() + save() — arch rule (never findByIdAndUpdate)
  // Include deleted docs so admin can restore already-trashed items
  const project = await Project.findOne({
    _id: new mongoose.Types.ObjectId(String(id)),
  }).select('_id developer slug projectName status isDeleted deletedAt');

  // Anti-enumeration: always 404, never 403 for non-owners
  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Ownership check ──────────────────────────
  // Projects.ts uses 'developer' (ObjectId ref to User), not 'developerId'
  const ownerStr = String(
    (project as unknown as { developer: mongoose.Types.ObjectId }).developer ?? '',
  );
  const isOwner = ownerStr === userId;

  if (!isAdmin && !isOwner) {
    // Safe 404 — do not reveal existence to non-owners
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // ── Guard: only admin can trash a verified project ──
  const projStatus = String(
    (project as unknown as { status: string }).status ?? '',
  );

  if (action === 'trash' && projStatus === 'verified' && !isAdmin) {
    return void res.status(403).json({
      success: false,
      message: 'Verified projects cannot be trashed without admin approval. Contact support.',
      code: 'VERIFIED_PROJECT_PROTECTED',
    });
  }

  // ── Idempotency check ────────────────────────
  const currentlyDeleted = Boolean(
    (project as unknown as { isDeleted?: boolean }).isDeleted,
  );
  const wantsDeleted = action === 'trash';

  if (currentlyDeleted === wantsDeleted) {
    const deletedAt = (project as unknown as { deletedAt?: Date }).deletedAt;
    return void res.status(200).json({
      success:   true,
      message:   wantsDeleted ? 'Project is already in trash.' : 'Project is already active.',
      projectId: String(project._id),
      isDeleted: currentlyDeleted,
      deletedAt: deletedAt ? deletedAt.toISOString() : null,
      idempotent: true,
    });
  }

  // ── Apply via save() ─────────────────────────
  const proj = project as unknown as {
    isDeleted: boolean;
    deletedAt: Date | null;
    status: string;
    slug: string;
    projectName: string;
    save: () => Promise<void>;
  };

  proj.isDeleted = wantsDeleted;
  proj.deletedAt = wantsDeleted ? new Date() : null;

  await project.save();

  // ── Post-save: sync units on restore ─────────
  // When a project is restored, recalculate unitTypeBreakdown
  if (!wantsDeleted) {
    await syncUnitTypeBreakdown(String(project._id)).catch(() => undefined);
  }

  // ── Audit log ────────────────────────────────
  await logSecurityEvent({
    type:     'admin_action',
    severity: wantsDeleted ? 'medium' : 'low',
    userId,
    ip,
    metadata: {
      action:      wantsDeleted ? 'project_trashed' : 'project_restored',
      projectId:   String(project._id),
      projectSlug: proj.slug,
      projectName: proj.projectName,
      byRole:      role,
      isOwner,
    },
    req,
  });

  // ── Response ─────────────────────────────────
  return void res.status(200).json({
    success:   true,
    message:   wantsDeleted
      ? 'Project moved to trash successfully.'
      : 'Project restored from trash successfully.',
    projectId: String(project._id),
    isDeleted: wantsDeleted,
    deletedAt: wantsDeleted ? new Date().toISOString() : null,
  });
}