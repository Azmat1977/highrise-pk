/**
 * pages/api/projects/hotspots.ts
 *
 * GET /api/projects/hotspots?city=Islamabad&limit=10
 *
 * Returns popular areas within a city with project counts.
 * Used by: Public listing page hotspots section.
 *
 * Security: Public endpoint — no auth required.
 * Rate limited via Upstash.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';

import {
  rateLimitApi,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';

import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { getClientIp } from '@/lib/requireAuth';

// ============================================
// TYPES
// ============================================

interface HotspotResult {
  area: string;
  city: string;
  projectCount: number;
  verifiedCount: number;
}

interface ApiResponse {
  success: boolean;
  hotspots?: HotspotResult[];
  city?: string;
  message?: string;
}

// ============================================
// SECURITY HEADERS
// ============================================

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains');
}

// ============================================
// VALIDATION SCHEMA
// ============================================

const QuerySchema = z.object({
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(80, 'City name too long')
    .optional(),
  limit: z
    .string()
    .optional()
    .transform(v => {
      const n = parseInt(v ?? '10', 10);
      if (Number.isNaN(n) || n < 1) return 10;
      if (n > 30) return 30;
      return n;
    }),
});

// ============================================
// HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  setSecurityHeaders(res);

  // GET only
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  // Rate limit
  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  // Validate query
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
    });
    return;
  }

  const { city, limit } = parsed.data;

  try {
    await dbConnect();

    // Build match stage
    const matchStage: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: 'verified',
      verificationStatus: 'verified',
      developerApprovalStatus: 'approved',
    };

    if (city) {
      // Case-insensitive exact city match
      matchStage.city = {
        $regex: new RegExp(
          `^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          'i'
        ),
      };
    }

    // Aggregate hotspots
    const raw = await Project.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { city: '$city', area: '$area' },
          projectCount: { $sum: 1 },
          verifiedCount: {
            $sum: {
              $cond: [{ $eq: ['$isVerified', true] }, 1, 0],
            },
          },
        },
      },
      { $sort: { projectCount: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          area: '$_id.area',
          city: '$_id.city',
          projectCount: 1,
          verifiedCount: 1,
        },
      },
    ]).option({ maxTimeMS: 3000 });

    const hotspots: HotspotResult[] = (
      raw as Array<{
        area: unknown;
        city: unknown;
        projectCount: unknown;
        verifiedCount: unknown;
      }>
    ).map(h => ({
      area:          String(h.area ?? ''),
      city:          String(h.city ?? ''),
      projectCount:  Number(h.projectCount ?? 0),
      verifiedCount: Number(h.verifiedCount ?? 0),
    }));

    // Cache: 5 minutes (hotspots don't change often)
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    );

    res.status(200).json({
      success: true,
      hotspots,
      city: city ?? 'all',
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';

    await logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      metadata: {
        action: 'hotspots_fetch_failed',
        endpoint: '/api/projects/hotspots',
        method: 'GET',
        reason: errMsg,
      },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotspots',
    });
  }
}