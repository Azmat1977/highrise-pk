// pages/api/developer/stats.ts
// ═══════════════════════════════════════════════════════════════
// DEVELOPER STATS API — Highrise.pk
// Returns aggregated stats for the developer dashboard sidebar.
// ═══════════════════════════════════════════════════════════════
// ✅ requireAuth() guard (async)
// ✅ rateLimitApi() rate limiting
// ✅ Role check: developer only
// ✅ Ownership-scoped queries (auth.id)
// ✅ isDeleted:false on all queries
// ✅ Generic error messages
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi } from '@/lib/rateLimit';
import mongoose from 'mongoose';

interface StatsResponse {
  success: boolean;
  data?: {
    totalProjects: number;
    activeProjects: number;
    pendingProjects: number;
    totalLeads: number;
    newLeads: number;
    wonLeads: number;
  };
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
): Promise<void> {
  // ── Method guard ────────────────────────────────────────────
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  try {
    // ── Auth guard (async) ──────────────────────────────────────
    const auth = await requireAuth(req, res);
    if (!auth) return; // 401 already sent

    // ── Role check ──────────────────────────────────────────────
    if (auth.role !== 'developer') {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    // ── Rate limit ──────────────────────────────────────────────
    const rl = await rateLimitApi(req);
    if (!rl.ok) {
      res.status(429).json({ success: false, message: 'Too many requests. Please try again shortly.' });
      return;
    }

    // ── DB connect ──────────────────────────────────────────────
    await dbConnect();

    const developerId = new mongoose.Types.ObjectId(auth.id);

    // ── Get models via registry pattern ─────────────────────────
    const Project = mongoose.models.Project;
    const Lead = mongoose.models.Lead;

    if (!Project) {
      // Model not registered yet — import to trigger registration
      await import('@/models/Projects');
    }

    const ProjectModel = mongoose.models.Project;

    if (!ProjectModel) {
      res.status(500).json({ success: false, message: 'Service temporarily unavailable.' });
      return;
    }

    // ── Project stats ───────────────────────────────────────────

    const totalProjects = await ProjectModel.countDocuments({
      developerId,
      isDeleted: false,
    });

    const activeProjects = await ProjectModel.countDocuments({
      developerId,
      isDeleted: false,
      status: 'verified',
    });

    const pendingProjects = await ProjectModel.countDocuments({
      developerId,
      isDeleted: false,
      status: 'pending',
    });

    // ── Lead stats ──────────────────────────────────────────────
    let totalLeads = 0;
    let newLeads = 0;
    let wonLeads = 0;

    // Dynamically import Lead model if not registered
    if (!Lead) {
      try {
        await import('@/models/Lead');
      } catch {
        // Lead model may not exist — graceful skip
      }
    }

    const LeadModel = mongoose.models.Lead;

    if (LeadModel) {
      // Get all project IDs for this developer
      const projectDocs = await ProjectModel.find(
        { developerId, isDeleted: false },
        { _id: 1 }
      ).lean() as any[];

      const projectIdList = projectDocs.map((p: any) => p._id);

      if (projectIdList.length > 0) {
        const leadFilter = {
          $or: [
            { developerId },
            { projectId: { $in: projectIdList } },
          ],
          isDeleted: { $ne: true },
        };

        totalLeads = await LeadModel.countDocuments(leadFilter);

        newLeads = await LeadModel.countDocuments({
          ...leadFilter,
          status: 'new',
        });

        wonLeads = await LeadModel.countDocuments({
          ...leadFilter,
          status: 'won',
        });
      }
    }

    // ── Response ────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        totalProjects,
        activeProjects,
        pendingProjects,
        totalLeads,
        newLeads,
        wonLeads,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
}