/**
 * pages/api/projects/trending.ts
 *
 * GET /api/projects/trending?limit=8&city=Islamabad
 *
 * Returns trending projects based on algorithm:
 *   - highriseScore weight: 40%
 *   - views weight: 30%
 *   - inquiries weight: 20%
 *   - recency weight: 10%
 *
 * Used by: Public listing page trending carousel.
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

interface TrendingProject {
  _id: string;
  slug: string;
  projectName: string;
  tagline?: string;
  city: string;
  area: string;
  projectCategory: string;
  projectNature: string;
  projectStatus: string;
  isVerified: boolean;
  isFeatured: boolean;
  isTrustedBuilder: boolean;
  developerBadge?: string;
  badgeLabel?: string;
  badgeEmoji?: string;
  minPrice?: number;
  maxPrice?: number;
  highriseScore?: number;
  riskLevel?: string;
  primaryImage: string | null;
  developerName: string;
  developerLogoUrl?: string;
  trendingScore: number;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  projects?: TrendingProject[];
  total?: number;
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
      const n = parseInt(v ?? '8', 10);
      if (Number.isNaN(n) || n < 1) return 8;
      if (n > 20) return 20;
      return n;
    }),
  category: z
    .string()
    .trim()
    .max(32)
    .optional(),
});

// ============================================
// HELPERS
// ============================================

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

  const { city, limit, category } = parsed.data;

  try {
    await dbConnect();

    // Build match stage — only verified + approved
    const matchStage: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: 'verified',
      verificationStatus: 'verified',
      developerApprovalStatus: 'approved',
    };

    if (city) {
      matchStage.city = {
        $regex: new RegExp(`^${escapeRegExp(city)}$`, 'i'),
      };
    }

    if (category) {
      matchStage.projectCategory = category;
    }

    // Trending algorithm via $addFields + $sort
    // Score = (highriseScore * 0.4) + (views * 0.3) + (inquiries * 0.2) + (recencyBonus * 0.1)
    // recencyBonus: projects created in last 30 days get bonus 50, 60 days get 25, else 0
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo  = new Date(Date.now() - 60 * 86400000);

    const raw = await Project.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          // Normalize scores to 0-100 range
          scoreNorm: {
            $multiply: [
              { $ifNull: ['$highriseScore', 0] },
              0.4,
            ],
          },
          viewsNorm: {
            $multiply: [
              {
                $min: [
                  { $divide: [{ $ifNull: ['$views', 0] }, 100] },
                  100,
                ],
              },
              0.3,
            ],
          },
          inquiriesNorm: {
            $multiply: [
              {
                $min: [
                  { $divide: [{ $ifNull: ['$inquiries', 0] }, 50] },
                  100,
                ],
              },
              0.2,
            ],
          },
          recencyBonus: {
            $multiply: [
              {
                $cond: [
                  { $gte: ['$createdAt', thirtyDaysAgo] },
                  50,
                  {
                    $cond: [
                      { $gte: ['$createdAt', sixtyDaysAgo] },
                      25,
                      0,
                    ],
                  },
                ],
              },
              0.1,
            ],
          },
        },
      },
      {
        $addFields: {
          trendingScore: {
            $add: [
              '$scoreNorm',
              '$viewsNorm',
              '$inquiriesNorm',
              '$recencyBonus',
            ],
          },
        },
      },
      { $sort: { trendingScore: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          slug: 1,
          projectName: 1,
          tagline: 1,
          city: 1,
          area: 1,
          projectCategory: 1,
          projectNature: 1,
          projectStatus: 1,
          isVerified: 1,
          isFeatured: 1,
          isTrustedBuilder: 1,
          developerBadge: 1,
          minPrice: 1,
          maxPrice: 1,
          highriseScore: 1,
          riskLevel: 1,
          featureImageUrl: 1,
          images: { $slice: ['$images', 1] },
          'developerProfile.name': 1,
          'developerProfile.logoUrl': 1,
          trendingScore: 1,
          createdAt: 1,
        },
      },
    ]).option({ maxTimeMS: 5000 });

    // Badge display helpers
    const badgeLabels: Record<string, string> = {
      new_entrant: 'New Developer',
      emerging:    'Emerging Builder',
      trusted:     'Trusted Developer',
      premium:     'Premium Developer',
    };
    const badgeEmojis: Record<string, string> = {
      new_entrant: '🆕',
      emerging:    '⭐',
      trusted:     '🏆',
      premium:     '💎',
    };

    // Transform response
    const projects: TrendingProject[] = (
      raw as Array<Record<string, unknown>>
    ).map(p => {
      // Resolve primary image
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') {
        primaryImage = p.featureImageUrl;
      } else if (Array.isArray(p.images) && p.images.length > 0) {
        const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
        const primary = imgs.find(img => img?.isPrimary);
        primaryImage = primary?.url ?? imgs[0]?.url ?? null;
      }

      const devProfile = p.developerProfile as {
        name?: string;
        logoUrl?: string;
      } | undefined;

      const badge = typeof p.developerBadge === 'string'
        ? p.developerBadge
        : '';

      return {
        _id:              String(p._id ?? ''),
        slug:             String(p.slug ?? ''),
        projectName:      String(p.projectName ?? ''),
        tagline:          typeof p.tagline === 'string' ? p.tagline : undefined,
        city:             String(p.city ?? ''),
        area:             String(p.area ?? ''),
        projectCategory:  String(p.projectCategory ?? ''),
        projectNature:    String(p.projectNature ?? ''),
        projectStatus:    String(p.projectStatus ?? ''),
        isVerified:       Boolean(p.isVerified),
        isFeatured:       Boolean(p.isFeatured),
        isTrustedBuilder: Boolean(p.isTrustedBuilder),
        developerBadge:   badge || undefined,
        badgeLabel:       badge ? badgeLabels[badge] : undefined,
        badgeEmoji:       badge ? badgeEmojis[badge] : undefined,
        minPrice:         typeof p.minPrice === 'number' ? p.minPrice : undefined,
        maxPrice:         typeof p.maxPrice === 'number' ? p.maxPrice : undefined,
        highriseScore:    typeof p.highriseScore === 'number' ? p.highriseScore : undefined,
        riskLevel:        typeof p.riskLevel === 'string' ? p.riskLevel : undefined,
        primaryImage,
        developerName:    devProfile?.name ?? '',
        developerLogoUrl: devProfile?.logoUrl,
        trendingScore:    typeof p.trendingScore === 'number'
          ? Math.round(p.trendingScore * 100) / 100
          : 0,
        createdAt:        p.createdAt instanceof Date
          ? p.createdAt.toISOString()
          : String(p.createdAt ?? ''),
      };
    });

    // Cache: 5 minutes (trending changes periodically)
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    );

    res.status(200).json({
      success: true,
      projects,
      total: projects.length,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';

    await logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      metadata: {
        action: 'trending_fetch_failed',
        endpoint: '/api/projects/trending',
        method: 'GET',
        reason: errMsg,
      },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending projects',
    });
  }
}