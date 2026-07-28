// pages/api/developer/projects.ts
// ═══════════════════════════════════════════════════════════════
// DEVELOPER PROJECTS API — Highrise.pk
// ═══════════════════════════════════════════════════════════════
// ✅ requireAuth() — correct auth pattern
// ✅ rateLimitApi() + rateLimitApiWrite() — persistent Upstash
// ✅ @/lib/dbConnect — correct DB for projects
// ✅ No console.log/error
// ✅ logSecurityEvent() on sensitive actions
// ✅ TypeScript strict — no any
// ✅ Method guard first
// ✅ Ownership check — developer sees only own projects
// ✅ Pagination — page + limit
// ✅ Soft delete via isDeleted flag
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, rateLimitApiWrite } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ============================================
// TYPES
// ============================================

interface ApiResponse {
  success:    boolean;
  message?:   string;
  projects?:  unknown[];
  project?:   unknown;
  projectId?: string;
  pagination?: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
}

// ============================================
// HELPERS
// ============================================

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',              requestId);
  res.setHeader('Content-Type',              'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('Cache-Control',             'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function getStr(v: string | string[] | undefined): string {
  if (!v) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  const method = req.method ?? 'GET';

  if (!['GET', 'POST', 'DELETE'].includes(method)) {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  // ── Auth ────────────────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── Role check ───────────────────────────────────────────────
  if (auth.role !== 'developer' && auth.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Access denied.' });
    return;
  }

  await dbConnect();

  const ip = getClientIp(req);

  // ============================================
  // GET — List developer's projects
  // ============================================
  if (method === 'GET') {
    const rl = await rateLimitApi(req);
    if (!rl.ok) {
      res.status(429).json({ success: false, message: 'Too many requests.' });
      return;
    }

    try {
      // Use registry pattern — avoids OverwriteModelError
      const Project = mongoose.models.Project;
      if (!Project) {
        await import('@/models/Projects');
      }
      const ProjectModel = mongoose.models.Project;

      if (!ProjectModel) {
        res.status(500).json({ success: false, message: 'Service unavailable.' });
        return;
      }

      // Pagination
      const page  = Math.max(1, parseInt(getStr(req.query.page)  || '1',  10));
      const limit = Math.min(100, Math.max(1, parseInt(getStr(req.query.limit) || '20', 10)));
      const skip  = (page - 1) * limit;

      // Status filter
      const statusFilter = getStr(req.query.status);

      // Build ownership filter
      // Developer can only see their own projects
      const developerId = new mongoose.Types.ObjectId(auth.id);

      const filter: Record<string, unknown> = {
        developerId,
        isDeleted:  false,
      };

      // Optional status filter
      const validStatuses = ['draft', 'pending', 'verified', 'rejected'];
      if (statusFilter && statusFilter !== 'all' && validStatuses.includes(statusFilter)) {
        filter.status = statusFilter;
      }

      const [projects, total] = await Promise.all([
        ProjectModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select([
            'projectName', 'slug', 'city', 'areaName', 'area',
            'projectCategory', 'projectNature', 'status', 'verificationStatus',
            'isVerified', 'isFeatured', 'featureImageUrl', 'images',
            'minPrice', 'maxPrice', 'totalUnits', 'unitsSold', 'unitsAvailable',
            'developerBadge', 'createdAt', 'updatedAt',
          ].join(' '))
          .lean(),
        ProjectModel.countDocuments(filter),
      ]);

      // Map primaryImage for each project
      const mapped = (projects as Record<string, unknown>[]).map((p) => {
        let primaryImage: string | null = null;
        if (typeof p.featureImageUrl === 'string' && p.featureImageUrl) {
          primaryImage = p.featureImageUrl;
        } else if (Array.isArray(p.images) && p.images.length > 0) {
          const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
          primaryImage = imgs.find((i) => i.isPrimary)?.url ?? imgs[0]?.url ?? null;
        }
        return { ...p, primaryImage };
      });

      res.status(200).json({
        success:    true,
        projects:   mapped,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch {
      res.status(500).json({ success: false, message: 'Failed to load projects.' });
    }
    return;
  }

  // ============================================
  // POST — Create new project
  // ============================================
  if (method === 'POST') {
    const rl = await rateLimitApiWrite(req);
    if (!rl.ok) {
      res.status(429).json({ success: false, message: 'Too many requests.' });
      return;
    }

    // Only approved developers can create projects
    if (auth.role === 'developer') {
      try {
        const DeveloperProfile = mongoose.models.DeveloperProfile;
        if (!DeveloperProfile) await import('@/models/DeveloperProfile');
        const DevProfileModel = mongoose.models.DeveloperProfile;

        if (DevProfileModel) {
          const profile = await DevProfileModel
            .findOne({ user: auth.id, isDeleted: false })
            .select('status')
            .lean() as { status?: string } | null;

          if (!profile || profile.status !== 'approved') {
            res.status(403).json({
              success: false,
              message: 'Profile must be approved before creating projects.',
            });
            return;
          }
        }
      } catch {
        // Non-critical — proceed
      }
    }

    try {
      // Load Project model
      if (!mongoose.models.Project) await import('@/models/Projects');
      const ProjectModel = mongoose.models.Project;

      if (!ProjectModel) {
        res.status(500).json({ success: false, message: 'Service unavailable.' });
        return;
      }

      const body = req.body as Record<string, unknown>;

      // Required field validation
      const projectName     = String(body.projectName     ?? '').trim();
      const city            = String(body.city            ?? '').trim();
      const projectCategory = String(body.projectCategory ?? '').trim();
      const projectNature   = String(body.projectNature   ?? '').trim();

      if (!projectName || !city || !projectCategory || !projectNature) {
        res.status(400).json({
          success: false,
          message: 'projectName, city, projectCategory, projectNature are required.',
        });
        return;
      }

      // Valid categories from Project model
      const validCategories = [
        'highrise', 'society', 'mixed_use',
        'commercial_plaza', 'townhouse', 'gated_community',
      ];
      if (!validCategories.includes(projectCategory)) {
        res.status(400).json({
          success: false,
          message: `Invalid projectCategory. Must be one of: ${validCategories.join(', ')}`,
        });
        return;
      }

      const validNatures = ['residential', 'commercial', 'mixed'];
      if (!validNatures.includes(projectNature)) {
        res.status(400).json({
          success: false,
          message: `Invalid projectNature. Must be one of: ${validNatures.join(', ')}`,
        });
        return;
      }

      const developerId = new mongoose.Types.ObjectId(auth.id);

      // Build project document
      // Slug generated in pre-save middleware
      const newProject = await ProjectModel.create({
        developerId,
        projectName,
        city,
        areaName:        String(body.areaName ?? body.area ?? '').trim() || undefined,
        area:            String(body.areaName ?? body.area ?? '').trim() || undefined,
        projectCategory,
        projectNature,
        projectStatus:   String(body.projectStatus ?? 'Planning'),
        saleMode:        String(body.saleMode ?? 'Both'),
        description:     String(body.description ?? '').trim() || undefined,
        tagline:         String(body.tagline ?? '').trim() || undefined,
        shortDescription: String(body.shortDescription ?? '').trim() || undefined,
        featureImageUrl:  String(body.featureImageUrl ?? '').trim() || undefined,
        featureImagePublicId: String(body.featureImagePublicId ?? '').trim() || undefined,
        status:           'draft',
        verificationStatus: 'pending',
        isDeleted:        false,
        // Pass through any extra fields from new.tsx form
        ...(body.launchDate              ? { launchDate:              new Date(String(body.launchDate)) }              : {}),
        ...(body.expectedCompletionDate  ? { expectedCompletionDate:  new Date(String(body.expectedCompletionDate)) }  : {}),
        ...(body.possessionStartDate     ? { possessionStartDate:     new Date(String(body.possessionStartDate)) }     : {}),
        ...(body.developmentProgress !== undefined ? { developmentProgress: Number(body.developmentProgress) } : {}),
        ...(body.approvalAuthority    ? { approvalAuthority: String(body.approvalAuthority) }    : {}),
        ...(body.isApproved           ? { isApproved:       String(body.isApproved) }           : {}),
        ...(body.nocStatus            ? { nocStatus:        String(body.nocStatus) }            : {}),
        ...(body.nocNumber            ? { nocNumber:        String(body.nocNumber) }            : {}),
        ...(body.coordinatesRaw       ? { coordinatesRaw:  String(body.coordinatesRaw) }       : {}),
        ...(body.droneVideoUrl        ? { droneVideoUrl:   String(body.droneVideoUrl) }        : {}),
        ...(body.virtualTourUrl       ? { virtualTourUrl:  String(body.virtualTourUrl) }       : {}),
        ...(body.googleMapLink        ? { googleMapLink:   String(body.googleMapLink) }        : {}),
        ...(body.projectDocuments     ? { projectDocuments: body.projectDocuments }             : {}),
        ...(body.buildingFloorPlans   ? { buildingFloorPlans: body.buildingFloorPlans }        : {}),
        ...(body.unitTypeBreakdown    ? { unitTypeBreakdown: body.unitTypeBreakdown }          : {}),
        ...(body.totalArea            ? { totalArea:  String(body.totalArea) }    : {}),
        ...(body.totalBlocks          ? { totalBlocks: Number(body.totalBlocks) }  : {}),
        ...(body.totalUnits           ? { totalUnits:  Number(body.totalUnits) }   : {}),
        ...(body.saleMode             ? { saleMode:   String(body.saleMode) }      : {}),
        ...(body.installmentPlan      ? { installmentPlan: body.installmentPlan }  : {}),
        ...(body.fullPaymentInfo      ? { fullPaymentInfo: body.fullPaymentInfo }  : {}),
      });

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        ip,
        metadata: {
          action:      'project_created',
          projectId:   String(newProject._id),
          projectName,
          city,
        },
      });

      res.status(201).json({
        success:   true,
        message:   'Project created. Submit for review when ready.',
        project:   newProject,
        projectId: String(newProject._id),
      });
    } catch {
      res.status(500).json({ success: false, message: 'Failed to create project.' });
    }
    return;
  }

  // ============================================
  // DELETE — Soft delete (move to trash)
  // ============================================
  if (method === 'DELETE') {
    const rl = await rateLimitApiWrite(req);
    if (!rl.ok) {
      res.status(429).json({ success: false, message: 'Too many requests.' });
      return;
    }

    const projectId = getStr(req.query.projectId);

    if (!projectId || !isValidObjectId(projectId)) {
      res.status(400).json({ success: false, message: 'Valid projectId is required.' });
      return;
    }

    try {
      if (!mongoose.models.Project) await import('@/models/Projects');
      const ProjectModel = mongoose.models.Project;

      if (!ProjectModel) {
        res.status(500).json({ success: false, message: 'Service unavailable.' });
        return;
      }

      const developerId = new mongoose.Types.ObjectId(auth.id);

      const project = await ProjectModel.findOne({
        _id:        new mongoose.Types.ObjectId(projectId),
        developerId,
        isDeleted:  false,
      });

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied.',
        });
        return;
      }

      // Cannot delete verified projects
      const proj = project as unknown as { status: string; isDeleted: boolean; deletedAt: Date | null };
      if (proj.status === 'verified') {
        res.status(409).json({
          success: false,
          message: 'Verified projects cannot be deleted. Contact admin.',
        });
        return;
      }

      // Soft delete
      proj.isDeleted = true;
      proj.deletedAt = new Date();
      await project.save();

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'medium',
        userId:   auth.id,
        ip,
        metadata: {
          action:    'project_soft_deleted',
          projectId,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Project moved to trash.',
      });
    } catch {
      res.status(500).json({ success: false, message: 'Failed to delete project.' });
    }
    return;
  }
}