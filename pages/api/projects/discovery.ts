/**
 * pages/api/projects/discovery.ts
 *
 * GET /api/projects/discovery?tab=all_projects&limit=8&city=Islamabad
 *
 * Discovery tabs for the listing page — Pakistani market optimized:
 *   - all_projects:      All verified projects (broadest view)
 *   - ready_to_move:     Completed / possession available
 *   - easy_installments: Payment plan available (Pakistani favorite)
 *   - new_launches:      Fresh projects (last 60 days)
 *   - top_builders:      Trusted + premium badge developers
 *   - govt_approved:     Government NOC + approval verified
 *
 * Used by: Public listing page discovery section.
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

type DiscoveryTab =
  | 'all_projects'
  | 'ready_to_move'
  | 'easy_installments'
  | 'new_launches'
  | 'top_builders'
  | 'govt_approved';

interface DiscoveryProject {
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
  totalUnits?: number;
  unitsAvailable?: number;
  createdAt: string;
  // Tab-specific extras
  saleMode?: string;
  monthlyInstallment?: number;
  possessionStartDate?: string;
  isReadyForPossession?: boolean;
}

interface ApiResponse {
  success: boolean;
  tab?: DiscoveryTab;
  tabLabel?: string;
  projects?: DiscoveryProject[];
  total?: number;
  message?: string;
}

// ============================================
// CONSTANTS
// ============================================

const VALID_TABS: DiscoveryTab[] = [
  'all_projects',
  'ready_to_move',
  'easy_installments',
  'new_launches',
  'top_builders',
  'govt_approved',
];

const TAB_LABELS: Record<DiscoveryTab, string> = {
  all_projects:      '✨ All Projects',
  ready_to_move:     '🏠 Ready to Move',
  easy_installments: '💰 On Easy Installments',
  new_launches:      '🚀 New Launches',
  top_builders:      '🏆 Top Builders',
  govt_approved:     '🏛️ Govt. Approved',
};

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
  tab: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (v): v is DiscoveryTab => VALID_TABS.includes(v as DiscoveryTab),
      {
        message:
          'Invalid tab. Allowed: all_projects, ready_to_move, easy_installments, new_launches, top_builders, govt_approved',
      }
    )
    .optional()
    .default('all_projects'),
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
});

// ============================================
// HELPERS
// ============================================

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================
// TAB QUERY BUILDERS
// ============================================

function buildTabQuery(
  tab: DiscoveryTab,
  baseMatch: Record<string, unknown>
): {
  match: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
} {
  const now = new Date();

  switch (tab) {
    case 'all_projects': {
      // All verified projects — newest first, broadest view
      return {
        match: baseMatch,
        sort: { createdAt: -1, _id: -1 },
      };
    }

    case 'ready_to_move': {
      // Completed OR ready for possession OR possession date passed
      return {
        match: {
          ...baseMatch,
          $or: [
            { projectStatus: 'Completed' },
            { 'unitTypeBreakdown.isReadyForPossession': true },
            { possessionStartDate: { $lte: now } },
          ],
        },
        sort: { possessionStartDate: -1, createdAt: -1 },
      };
    }

    case 'easy_installments': {
      // Payment plans available — Pakistani market favorite
      return {
        match: {
          ...baseMatch,
          saleMode: { $in: ['Installment', 'Both'] },
          $or: [
            { 'installmentPlan.monthlyAmount': { $gt: 0 } },
            { 'installmentPlan.monthlyDuration': { $gt: 0 } },
            { 'unitTypeBreakdown.monthlyInstallment': { $gt: 0 } },
          ],
        },
        sort: { 'installmentPlan.monthlyAmount': 1, createdAt: -1 },
      };
    }

    case 'new_launches': {
      // Last 60 days OR status is Pre-Launch / Launched
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
      return {
        match: {
          ...baseMatch,
          $or: [
            { createdAt: { $gte: sixtyDaysAgo } },
            { projectStatus: { $in: ['Pre-Launch', 'Launched'] } },
          ],
        },
        sort: { createdAt: -1, _id: -1 },
      };
    }

    case 'top_builders': {
      // Trusted or premium developers only
      return {
        match: {
          ...baseMatch,
          developerBadge: { $in: ['trusted', 'premium'] },
          isTrustedBuilder: true,
        },
        sort: { highriseScore: -1, createdAt: -1 },
      };
    }

    case 'govt_approved': {
      // Government NOC + approval verified
      return {
        match: {
          ...baseMatch,
          isApproved: 'approved',
          nocStatus: 'approved',
        },
        sort: { highriseScore: -1, createdAt: -1 },
      };
    }

    default: {
      return {
        match: baseMatch,
        sort: { createdAt: -1, _id: -1 },
      };
    }
  }
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
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid query parameters';
    res.status(400).json({
      success: false,
      message: firstError,
    });
    return;
  }

  const { tab, city, limit } = parsed.data;

  try {
    await dbConnect();

    // Base match — only verified + approved (public visibility)
    const baseMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: 'verified',
      verificationStatus: 'verified',
      developerApprovalStatus: 'approved',
    };

    // City filter
    if (city) {
      baseMatch.city = {
        $regex: new RegExp(`^${escapeRegExp(city)}$`, 'i'),
      };
    }

    // Build tab-specific query
    const { match, sort } = buildTabQuery(tab, baseMatch);

    // Projection — public fields + tab-specific extras
    const projection = {
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
      'images.url': 1,
      'images.isPrimary': 1,
      'developerProfile.name': 1,
      'developerProfile.logoUrl': 1,
      totalUnits: 1,
      unitsAvailable: 1,
      createdAt: 1,
      // Tab-specific fields
      saleMode: 1,
      possessionStartDate: 1,
      'installmentPlan.monthlyAmount': 1,
      'unitTypeBreakdown.monthlyInstallment': 1,
      'unitTypeBreakdown.isReadyForPossession': 1,
    };

    // Execute query
    const rawProjects = await Project.find(match)
      .select(projection)
      .sort(sort)
      .limit(limit)
      .maxTimeMS(5000)
      .lean();

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

    // Transform to safe response
    const projects: DiscoveryProject[] = (
      rawProjects as Array<Record<string, unknown>>
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

      // Extract lowest monthly installment from unit types (if available)
      let monthlyInstallment: number | undefined;
      const installmentPlan = p.installmentPlan as { monthlyAmount?: number } | undefined;
      if (typeof installmentPlan?.monthlyAmount === 'number' && installmentPlan.monthlyAmount > 0) {
        monthlyInstallment = installmentPlan.monthlyAmount;
      } else if (Array.isArray(p.unitTypeBreakdown)) {
        const utb = p.unitTypeBreakdown as Array<{ monthlyInstallment?: number }>;
        const amounts = utb
          .map(u => u?.monthlyInstallment)
          .filter((n): n is number => typeof n === 'number' && n > 0);
        if (amounts.length > 0) monthlyInstallment = Math.min(...amounts);
      }

      // Check ready for possession
      let isReadyForPossession = false;
      if (Array.isArray(p.unitTypeBreakdown)) {
        const utb = p.unitTypeBreakdown as Array<{ isReadyForPossession?: boolean }>;
        isReadyForPossession = utb.some(u => u?.isReadyForPossession === true);
      }

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
        totalUnits:       typeof p.totalUnits === 'number' ? p.totalUnits : undefined,
        unitsAvailable:   typeof p.unitsAvailable === 'number' ? p.unitsAvailable : undefined,
        createdAt:        p.createdAt instanceof Date
          ? p.createdAt.toISOString()
          : String(p.createdAt ?? ''),
        // Tab-specific extras
        saleMode:            typeof p.saleMode === 'string' ? p.saleMode : undefined,
        monthlyInstallment,
        possessionStartDate: p.possessionStartDate instanceof Date
          ? p.possessionStartDate.toISOString()
          : (typeof p.possessionStartDate === 'string' ? p.possessionStartDate : undefined),
        isReadyForPossession,
      };
    });

    // Cache strategy per tab
    const cacheSeconds: Record<DiscoveryTab, number> = {
      all_projects:      120,  // 2 min — updates with new listings
      ready_to_move:     300,  // 5 min — status changes less often
      easy_installments: 600,  // 10 min — payment plans stable
      new_launches:      120,  // 2 min — fresh content
      top_builders:      600,  // 10 min — badge changes rarely
      govt_approved:     600,  // 10 min — approval status stable
    };

    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${cacheSeconds[tab]}, stale-while-revalidate=${cacheSeconds[tab] * 2}`
    );

    res.status(200).json({
      success: true,
      tab,
      tabLabel: TAB_LABELS[tab],
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
        action: 'discovery_fetch_failed',
        endpoint: '/api/projects/discovery',
        method: 'GET',
        tab,
        reason: errMsg,
      },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch discovery projects',
    });
  }
}