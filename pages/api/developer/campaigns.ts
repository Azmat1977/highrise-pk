// pages/api/developer/campaigns.ts
// --- SECURE TENANT-ISOLATED DEVELOPER CAMPAIGNS API ---
// Role Guarded | Session Enforced | Rate Limited | NoSQL Injection Protected

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, setRateLimitHeaders, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import Project from '@/models/Projects';

interface ApiResponse {
  success: boolean;
  message?: string;
  campaigns?: unknown[];
}

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate, private');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  // 1. Session and Auth Check
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (auth.role !== 'developer' && auth.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Access denied.' });
    return;
  }

  // 2. High-Capacity Rate Limiting
  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  try {
    await dbConnect();

    // 3. Strict Tenant Isolation
    // Developers can ONLY fetch campaigns belonging to their authenticated userId
    const developerId = new mongoose.Types.ObjectId(auth.id);

    const campaigns = await Project.find({
      developerId,
      isDeleted: false,
      $or: [
        { isFeatured: true },
        { promotionStartDate: { $ne: null } },
        { promotionEndDate: { $ne: null } },
      ],
    })
      .sort({ createdAt: -1 })
      .select({
        _id: 1,
        projectName: 1,
        slug: 1,
        city: 1,
        area: 1,
        isFeatured: 1,
        promotionStartDate: 1,
        promotionEndDate: 1,
        promotionImpressions: 1,
        promotionClicks: 1,
        featureImageUrl: 1,
        'images.url': 1,
        'images.isPrimary': 1,
      })
      .lean();

    // Map primary image representation
    const mappedCampaigns = campaigns.map((c: any) => {
      let primaryImage: string | null = null;
      if (typeof c.featureImageUrl === 'string' && c.featureImageUrl) {
        primaryImage = c.featureImageUrl;
      } else if (Array.isArray(c.images) && c.images.length > 0) {
        const imgs = c.images as Array<{ url?: string; isPrimary?: boolean }>;
        primaryImage = imgs.find((i) => i.isPrimary)?.url ?? imgs[0]?.url ?? null;
      }

      return {
        _id: String(c._id),
        projectName: c.projectName,
        slug: c.slug,
        city: c.city,
        area: c.area || '',
        isFeatured: Boolean(c.isFeatured),
        promotionStartDate: c.promotionStartDate ? c.promotionStartDate.toISOString() : null,
        promotionEndDate: c.promotionEndDate ? c.promotionEndDate.toISOString() : null,
        promotionImpressions: Number(c.promotionImpressions ?? 0),
        promotionClicks: Number(c.promotionClicks ?? 0),
        primaryImage,
      };
    });

    // 4. Audit logging
    await logSecurityEvent({
      type: 'admin_action',
      severity: 'low',
      userId: auth.id,
      ip: req.socket?.remoteAddress ?? 'unknown',
      metadata: {
        action: 'developer_campaigns_viewed',
        developerId: auth.id,
        campaignsCount: campaigns.length,
      },
    });

    res.status(200).json({
      success: true,
      campaigns: mappedCampaigns,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve active campaigns.' });
  }
}