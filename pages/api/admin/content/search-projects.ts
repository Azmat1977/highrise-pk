// pages/api/admin/content/search-projects.ts
// Search projects for campaign project card insertion
// Admin only — rate limited — verified projects only

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import mongoose from 'mongoose';

// ─── Inline Project model import (avoids path resolution issues) ──
// We use mongoose.models first to avoid re-registration on hot reload
let Project: mongoose.Model<any>;
try {
  Project = mongoose.model('Project');
} catch {
  // Model not registered yet — require it
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Project = require('@/models/Projects').default;
}

// ─── Response shape ───────────────────────────────────────────
interface ProjectResult {
  id:              string;
  projectName:     string;
  city:            string;
  area:            string;
  projectCategory: string;
  projectNature:   string;
  minPrice:        number | null;
  maxPrice:        number | null;
  imageUrl:        string | null;
  slug:            string | null;
}

interface ApiResponse {
  success:  boolean;
  results?: ProjectResult[];
  total?:   number;
  message?: string;
}

// ─── Security headers ─────────────────────────────────────────
function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const requestId = Math.random().toString(36).slice(2, 10);
  setSecurityHeaders(res);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Rate limit ───────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  // ── Auth guard ───────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── Input validation ─────────────────────────────────────────
  const rawQuery = String(req.query.q    || '').trim();
  const rawCity  = String(req.query.city || '').trim();

  if (rawQuery.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Search query too long',
    });
  }

  if (rawQuery.length < 2 && !rawCity) {
    return res.status(400).json({
      success: false,
      message: 'Please enter at least 2 characters',
    });
  }

  try {
    await dbConnect();

    // ── Ensure model is loaded after dbConnect ────────────────
    if (!mongoose.models['Project']) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@/models/Projects');
    }
    const ProjectModel = mongoose.models['Project'] as mongoose.Model<any>;

    // ── Build query ───────────────────────────────────────────
    const baseFilter: Record<string, unknown> = {
      status:    'verified',
      isDeleted: false,
    };

    const searchConditions: Record<string, unknown>[] = [];

    if (rawQuery.length >= 2) {
      const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex   = new RegExp(escaped, 'i');
      searchConditions.push(
        { projectName:             { $regex: regex } },
        { city:                    { $regex: regex } },
        { area:                    { $regex: regex } },
        { 'developerProfile.name': { $regex: regex } }
      );
    }

    if (rawCity) {
      const cityEscaped = rawCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchConditions.push({ city: { $regex: new RegExp(cityEscaped, 'i') } });
    }

    const filter: Record<string, unknown> =
      searchConditions.length > 0
        ? { ...baseFilter, $or: searchConditions }
        : baseFilter;

    // ── Execute query ─────────────────────────────────────────
    const docs: any[] = await ProjectModel.find(filter)
      .select(
        'projectName city area projectCategory projectNature ' +
        'minPrice maxPrice featureImageUrl images gallery slug'
      )
      .sort({ isFeatured: -1, views: -1 })
      .limit(20)
      .lean();

    // ── Map results ───────────────────────────────────────────
    const results: ProjectResult[] = docs.map((doc) => {
      let imageUrl: string | null = null;

      if (Array.isArray(doc.images) && doc.images.length > 0) {
        const primary = doc.images.find((img: any) => img?.isPrimary);
        imageUrl = primary?.url ?? doc.images[0]?.url ?? null;
      }

      if (!imageUrl && doc.featureImageUrl) {
        imageUrl = doc.featureImageUrl;
      }

      if (!imageUrl && Array.isArray(doc.gallery) && doc.gallery.length > 0) {
        imageUrl = doc.gallery[0]?.url ?? null;
      }

      return {
        id:              String(doc._id),
        projectName:     doc.projectName     || '',
        city:            doc.city            || '',
        area:            doc.area            || '',
        projectCategory: doc.projectCategory || '',
        projectNature:   doc.projectNature   || '',
        minPrice:        typeof doc.minPrice === 'number' ? doc.minPrice : null,
        maxPrice:        typeof doc.maxPrice === 'number' ? doc.maxPrice : null,
        imageUrl,
        slug:            doc.slug            || null,
      };
    });

    // ── Audit log ─────────────────────────────────────────────
    await logSecurityEvent({
      type:      'admin_action',
      severity:  'low',
      userId:    auth.id,
      ip:        String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''),
      userAgent: String(req.headers['user-agent'] || ''),
      metadata:  {
        requestId,
        action:  'project_search',
        query:   rawQuery,
        count:   results.length,
      },
    });

    return res.status(200).json({
      success: true,
      results,
      total:   results.length,
    });

  } catch (err) {
    await logSecurityEvent({
      type:      'system_error',
      severity:  'high',
      userId:    auth.id,
      ip:        String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''),
      userAgent: String(req.headers['user-agent'] || ''),
      metadata:  {
        requestId,
        action: 'project_search_error',
        error:  err instanceof Error ? err.message : 'unknown',
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Search failed — please try again',
    });
  }
}