/**
 * pages/api/projects/[id]/permanent-delete.ts
 *
 * DELETE /api/projects/[id]/permanent-delete
 *
 * Permanently deletes a project + all child units + Cloudinary assets.
 *
 * Access:
 *   - ADMIN ONLY (enterprise standard — owners use trash, not hard delete)
 *   - Project must be soft-deleted (trashed) first
 *
 * V5.0.0 — requireAdmin, Upstash rate limit, logSecurityEvent,
 *           Unit.deleteMany() for orphan cleanup, Cloudinary best-effort
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';

import { requireAdmin, getClientIp } from '@/lib/requireAuth';
import {
  rateLimitAdmin,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import cloudinary from '@/lib/cloudinary';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ApiResponse = {
  success: boolean;
  message: string;
  code?: string;
  projectId?: string;
  cleanup?: {
    unitsDeleted: number;
    cloudinaryAttempted: number;
    cloudinaryDeleted: number;
  };
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
 * Anti-fraud: only delete Cloudinary assets in our namespace.
 * Never allow arbitrary public_id deletion.
 */
function isAllowedPublicId(publicId: string): boolean {
  const pid = String(publicId ?? '').trim();
  return pid.startsWith('highrise/projects/') || pid.startsWith('highrise/units/');
}

function dedupePublicIds(ids: string[]): string[] {
  return Array.from(
    new Set(ids.map((x) => String(x ?? '').trim()).filter(Boolean)),
  ).filter(isAllowedPublicId);
}

/**
 * Collect all Cloudinary public_ids from a project document.
 */
function collectProjectPublicIds(project: Record<string, unknown>): string[] {
  const ids: string[] = [];

  // Feature image
  if (typeof project.featureImagePublicId === 'string') {
    ids.push(project.featureImagePublicId);
  }

  // images[]
  if (Array.isArray(project.images)) {
    for (const img of project.images as Array<Record<string, unknown>>) {
      if (typeof img?.public_id === 'string') ids.push(img.public_id);
    }
  }

  // gallery[] (some project schemas include this)
  if (Array.isArray(project.gallery)) {
    for (const img of project.gallery as Array<Record<string, unknown>>) {
      if (typeof img?.public_id === 'string') ids.push(img.public_id);
    }
  }

  // legalDocs stored with public_id
  if (Array.isArray(project.legalDocs)) {
    for (const doc of project.legalDocs as Array<Record<string, unknown>>) {
      if (typeof doc?.public_id === 'string') ids.push(doc.public_id);
    }
  }

  return dedupePublicIds(ids);
}

/**
 * Collect Cloudinary public_ids from all child units.
 */
function collectUnitPublicIds(
  units: Array<Record<string, unknown>>,
): string[] {
  const ids: string[] = [];

  for (const unit of units) {
    if (Array.isArray(unit.images)) {
      for (const img of unit.images as Array<Record<string, unknown>>) {
        if (typeof img?.public_id === 'string') ids.push(img.public_id);
      }
    }
    if (Array.isArray(unit.floorPlan)) {
      for (const fp of unit.floorPlan as Array<Record<string, unknown>>) {
        if (typeof fp?.public_id === 'string') ids.push(fp.public_id);
      }
    }
  }

  return dedupePublicIds(ids);
}

/**
 * Best-effort Cloudinary batch delete.
 * Never blocks the DB delete — media cleanup is secondary.
 */
async function deleteCloudinaryAssets(publicIds: string[]): Promise<{
  attempted: number;
  deleted: number;
}> {
  const ids = dedupePublicIds(publicIds);
  if (ids.length === 0) return { attempted: 0, deleted: 0 };

  const CHUNK = 100; // Cloudinary batch limit
  let deleted = 0;

  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = ids.slice(i, i + CHUNK);
    try {
      const result = await cloudinary.api.delete_resources(batch, {
        resource_type: 'image',
        invalidate: true,
      }) as { deleted?: Record<string, string> };

      for (const val of Object.values(result.deleted ?? {})) {
        if (val === 'deleted') deleted += 1;
      }
    } catch {
      // Best-effort: continue on Cloudinary failure
    }
  }

  return { attempted: ids.length, deleted };
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return void res.status(405).json({
      success: false,
      message: 'Method not allowed.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // ── Rate limit (admin tier) ─────────────────
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  // ── Admin only ──────────────────────────────
  // Permanent delete is admin-only — developers use trash (soft delete)
  const authResult = await requireAdmin(req, res);
  if (!authResult) return;

  const userId = authResult.id;
  const ip     = getClientIp(req);

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

  await dbConnect();

  // ── Fetch project ────────────────────────────
  const project = await Project.findById(id)
    .select(
      '_id developer slug projectName status isDeleted ' +
      'featureImagePublicId images gallery legalDocs',
    )
    .lean();

  if (!project) {
    return void res.status(404).json({
      success: false,
      message: 'Project not found.',
      code: 'NOT_FOUND',
    });
  }

  // Cast once — .lean() loses typed _id (LESSON #63)
  const proj       = project as unknown as Record<string, unknown>;
  const projectId  = String((project as unknown as { _id: mongoose.Types.ObjectId })._id);

  // ── Must be trashed first (enterprise guard) ─
  if (proj.isDeleted !== true) {
    return void res.status(409).json({
      success: false,
      message: 'Project must be moved to trash before permanent deletion. Use POST /trash first.',
      code: 'NOT_TRASHED',
    });
  }

  // ── Collect child unit media before delete ───
  const units = await Unit.find({ project: new mongoose.Types.ObjectId(String(id)) })
    .select('images floorPlan')
    .lean();

  const unitPublicIds  = collectUnitPublicIds(
    units as unknown as Array<Record<string, unknown>>,
  );
  const projectPublicIds = collectProjectPublicIds(proj);
  const allPublicIds     = dedupePublicIds([...projectPublicIds, ...unitPublicIds]);

  // ── Audit log BEFORE deletion ────────────────
  // Log intent before any destructive action
  await logSecurityEvent({
    type:     'admin_action',
    severity: 'high',
    userId,
    ip,
    metadata: {
      action:         'project_permanent_delete_initiated',
      projectId:      projectId,
      projectSlug:    String(proj.slug ?? ''),
      projectName:    String(proj.projectName ?? ''),
      unitCount:      units.length,
      cloudinaryIds:  allPublicIds.length,
    },
    req,
  });

  // ── Delete child units first ─────────────────
  const unitDeleteResult = await Unit.deleteMany({
    project: new mongoose.Types.ObjectId(String(id)),
  });

  // ── Delete project document ──────────────────
  await Project.deleteOne({ _id: projectId });

  // ── Cloudinary cleanup (best-effort) ─────────
  // After DB delete — media cleanup never blocks the primary operation
  const cloud = await deleteCloudinaryAssets(allPublicIds);

  // ── Audit log AFTER deletion ─────────────────
  await logSecurityEvent({
    type:     'admin_action',
    severity: 'high',
    userId,
    ip,
    metadata: {
      action:              'project_permanent_deleted',
       projectId:           projectId,
      projectSlug:         String(proj.slug ?? ''),
      projectName:         String(proj.projectName ?? ''),
      unitsDeleted:        unitDeleteResult.deletedCount,
      cloudinaryAttempted: cloud.attempted,
      cloudinaryDeleted:   cloud.deleted,
    },
    req,
  });

  // ── Response ─────────────────────────────────
  return void res.status(200).json({
    success:   true,
    message:   'Project and all associated units permanently deleted.',
    projectId: projectId,
    cleanup: {
      unitsDeleted:        unitDeleteResult.deletedCount,
      cloudinaryAttempted: cloud.attempted,
      cloudinaryDeleted:   cloud.deleted,
    },
  });
}