/**
 * pages/api/projects/list.ts
 *
 * Section 10 — Load More endpoint for main project grid.
 *
 * ENDPOINT: POST /api/projects/list
 *
 * PURPOSE:
 *   When user clicks "Load More" in Section 10, this endpoint returns
 *   the next batch of projects matching the current filter state.
 *
 * WHY POST (not GET):
 *   → Filter payload can be complex (multiple params)
 *   → Avoids URL length limits
 *   → Doesn't create cacheable URLs (pagination is stateful)
 *   → SEO handled separately via SSR + ?page=N pagination
 *
 * SECURITY (Rule Set B compliant):
 *   ✅ Rate limited (rateLimitApi — 100 req/min per IP)
 *   ✅ Input validation (Zod schema)
 *   ✅ NoSQL injection defense (parameterized Mongoose queries)
 *   ✅ maxTimeMS on all queries
 *   ✅ Generic error messages (no stack traces)
 *   ✅ Try/catch on all async logic
 *   ✅ Public endpoint (no auth — read-only project listings)
 *
 * MATCHES SSR LOGIC:
 *   Same base filter, same sort map, same PAGE_SIZE.
 *   Only difference: returns JSON instead of rendering page.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project   from '@/models/Projects';
import {
  rateLimitApi,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import {
  type ProjectListing,
  type ProjectListResponse,
  type SortOption,
  type PropertyType,
  type DeveloperBadge,
  PROJECTS_PER_PAGE,
  computeStubShield,
  escapeRegExp,
} from '@/types/projects';

// ─── INPUT VALIDATION SCHEMA ──────────────────────────────────

const FilterInputSchema = z.object({
  city:         z.string().max(100).optional().default(''),
  type:         z.string().max(50).optional().default(''),
  category:     z.string().max(50).optional().default(''),
  nature:       z.string().max(50).optional().default(''),
  minBudget:    z.number().int().nonnegative().nullable().optional().default(null),
  maxBudget:    z.number().int().nonnegative().nullable().optional().default(null),
  minArea:      z.number().int().nonnegative().nullable().optional().default(null),
  maxArea:      z.number().int().nonnegative().nullable().optional().default(null),
  possession:   z.string().max(50).optional().default(''),
  noc:          z.boolean().optional().default(false),
  installments: z.boolean().optional().default(false),
  locality:     z.string().max(100).optional().default(''),
  builder:      z.string().max(100).optional().default(''),
  sort:         z.enum(['relevance', 'price_asc', 'price_desc', 'possession', 'newest'])
                  .optional().default('relevance'),
  page:         z.number().int().min(1).max(50).optional().default(1),
});

// ─── SORT MAP (matches SSR) ────────────────────────────────────

const SORT_MAP: Record<SortOption, Record<string, 1 | -1>> = {
  relevance:  { highriseScore: -1, createdAt: -1 },
  price_asc:  { minPrice: 1,       createdAt: -1 },
  price_desc: { minPrice: -1,      createdAt: -1 },
  possession: { possessionStartDate: 1, createdAt: -1 },
  newest:     { createdAt: -1,     _id: -1 },
};

// ─── HANDLER ──────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProjectListResponse>,
): Promise<void> {

  // ── Method check ─────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success:  false,
      projects: [],
      hasMore:  false,
      page:     1,
      total:    0,
      error:    'Method not allowed',
    });
  }

  // ── Rate limit ────────────────────────────────────────────
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    return sendRateLimitResponse(res, rl) as unknown as void;
  }

  // ── Input validation ──────────────────────────────────────
  const parseResult = FilterInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    // Log invalid input attempt — treated as suspicious_activity because
    // legitimate frontend clients never send malformed Zod payloads.
    // Malformed input on this endpoint is almost always:
    //   - Bot probing for vulnerabilities
    //   - Misconfigured scraper
    //   - Injection attempt
    // Severity auto-assigned as 'medium' by SecurityEvent pre-save hook.
    await logSecurityEvent({
      type: 'suspicious_activity',
      ip:   (req.headers['x-forwarded-for'] as string) ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
      metadata: {
        action:   'projects_list_invalid_input',
        endpoint: '/api/projects/list',
        reason:   'Zod validation failed on filter payload',
        issues:   parseResult.error.issues.map(i => i.path.join('.')),
      },
    }).catch(() => undefined);

    return res.status(400).json({
      success:  false,
      projects: [],
      hasMore:  false,
      page:     1,
      total:    0,
      error:    'Invalid filter parameters',
    });
  }

  const filters = parseResult.data;

  try {
    await dbConnect();

    // ── Build MongoDB query (matches SSR base) ─────────────
    const base: Record<string, unknown> = {
      isDeleted:               { $ne: true },
      status:                  'verified',
      verificationStatus:      'verified',
      developerApprovalStatus: 'approved',
    };

    if (filters.city) {
      base.city = {
        $regex: new RegExp(`^${escapeRegExp(filters.city)}$`, 'i'),
      };
    }

    if (filters.category) {
      base.projectCategory = {
        $regex: new RegExp(escapeRegExp(filters.category), 'i'),
      };
    }

    if (filters.nature) {
      base.projectNature = {
        $regex: new RegExp(escapeRegExp(filters.nature), 'i'),
      };
    }

    if (filters.locality) {
      base.area = {
        $regex: new RegExp(`^${escapeRegExp(filters.locality)}$`, 'i'),
      };
    }

    if (filters.builder) {
      base['developerProfile.name'] = {
        $regex: new RegExp(escapeRegExp(filters.builder), 'i'),
      };
    }

    if (filters.noc)          base.nocStatus = 'approved';
    if (filters.installments) base.saleMode  = { $in: ['Installment', 'Both'] };

    if (filters.possession) {
      const map: Record<string, string> = {
        ready_to_move:      'Completed',
        under_construction: 'Under Development',
        new_launch:         'Launched',
        pre_launch:         'Pre-Launch',
      };
      if (map[filters.possession]) {
        base.projectStatus = map[filters.possession];
      }
    }

    if (filters.minBudget || filters.maxBudget) {
      const pf: Record<string, number> = {};
      if (filters.minBudget) pf.$gte = filters.minBudget;
      if (filters.maxBudget) pf.$lte = filters.maxBudget;
      base.minPrice = pf;
    }

    // ── Pagination ─────────────────────────────────────────
    const skip = (filters.page - 1) * PROJECTS_PER_PAGE;
    const sort = SORT_MAP[filters.sort] ?? SORT_MAP.relevance;

    // ── Parallel: fetch page + total count ────────────────
    const [rawProjects, total] = await Promise.all([
      Project.find(base)
        .sort(sort)
        .skip(skip)
        .limit(PROJECTS_PER_PAGE)
        .select({
          _id: 1, slug: 1, projectName: 1, tagline: 1,
          city: 1, area: 1, projectCategory: 1,
          projectNature: 1, projectStatus: 1,
          isVerified: 1, isFeatured: 1, isTrustedBuilder: 1,
          developerBadge: 1, minPrice: 1, maxPrice: 1,
          highriseScore: 1, nocStatus: 1,
          featureImageUrl: 1, 'images.url': 1,
          'images.isPrimary': 1,
          developerId: 1,
          'developerProfile.name': 1,
          'developerProfile.logoUrl': 1,
          createdAt: 1,
        })
        .maxTimeMS(5000)
        .lean(),

      Project.countDocuments(base).maxTimeMS(3000),
    ]);

    // ── Map raw docs → ProjectListing (matches SSR mapper) ─
    const projects: ProjectListing[] = (
      rawProjects as Array<Record<string, unknown>>
    ).map(p => {
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') {
        primaryImage = p.featureImageUrl;
      } else if (Array.isArray(p.images) && p.images.length > 0) {
        const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
        primaryImage =
          imgs.find(i => i?.isPrimary)?.url ?? imgs[0]?.url ?? null;
      }

      const dev  = p.developerProfile as
        { name?: string; logoUrl?: string } | undefined;
      const score = typeof p.highriseScore === 'number' ? p.highriseScore : 0;
      const noc   = (p.nocStatus as string | undefined) ?? 'not_applied';

      const rawStatus = String(p.projectStatus ?? '').toLowerCase();
      let projectStatus: ProjectListing['projectStatus'] = 'under_construction';
      if (rawStatus === 'completed' || rawStatus === 'ready_to_move') {
        projectStatus = 'ready_to_move';
      } else if (rawStatus === 'launched' || rawStatus === 'new_launch') {
        projectStatus = 'new_launch';
      } else if (rawStatus === 'pre-launch' || rawStatus === 'pre_launch') {
        projectStatus = 'pre_launch';
      }

      return {
        _id:              String(p._id ?? ''),
        slug:             String(p.slug ?? ''),
        projectName:      String(p.projectName ?? ''),
        tagline:          typeof p.tagline === 'string' ? p.tagline : null,
        city:             String(p.city ?? ''),
        area:             String(p.area ?? ''),
        locality:         null,
        propertyType:     ['flats'] as PropertyType[],
        projectCategory:  String(p.projectCategory ?? ''),
        projectNature:    String(p.projectNature ?? ''),
        projectStatus,
        minPrice:         typeof p.minPrice === 'number' ? p.minPrice : null,
        maxPrice:         typeof p.maxPrice === 'number' ? p.maxPrice : null,
        priceOnRequest:   typeof p.minPrice !== 'number',
        minAreaMarla:     null,
        maxAreaMarla:     null,
        minBedrooms:      null,
        maxBedrooms:      null,
        possessionDate:   null,
        possessionQuarter:null,
        isVerified:       Boolean(p.isVerified),
        nocStatus:        noc as 'approved' | 'pending' | 'not_applied',
        nocAuthority:     null,
        nocNumber:        null,
        legalDocumentUrl: null,
        shield:           computeStubShield({
          nocStatus:      noc as 'approved' | 'pending' | 'not_applied',
          isVerified:     Boolean(p.isVerified),
          developerBadge: typeof p.developerBadge === 'string'
                          ? p.developerBadge : null,
          highriseScore:  score,
        }),
        developerId:      p.developerId ? String(p.developerId) : null,
        developerName:    dev?.name ?? '',
        developerSlug:    '',
        developerLogoUrl: dev?.logoUrl ?? null,
        developerBadge:   typeof p.developerBadge === 'string'
                          ? p.developerBadge as DeveloperBadge
                          : null,
        isTrustedBuilder: Boolean(p.isTrustedBuilder),
        marketedBy:       null,
        primaryImage,
        imageCount:       Array.isArray(p.images) ? p.images.length : 0,
        isShortlisted:    false,
        inquiryCount:     null,
        amenities:        [],
        fairPriceUrl:     String(p.slug ?? '')
                          ? `/tools/fair-price?project=${String(p.slug)}`
                          : null,
        isFeatured:       Boolean(p.isFeatured),
        highriseScore:    score,
        createdAt:        p.createdAt instanceof Date
                          ? p.createdAt.toISOString()
                          : String(p.createdAt ?? ''),
      };
    });

    // ── Security headers ───────────────────────────────────
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'private, max-age=60');

    // ── Response ───────────────────────────────────────────
    return res.status(200).json({
      success:  true,
      projects,
      hasMore:  skip + projects.length < total,
      page:     filters.page,
      total,
    });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';

    // Log error (severity: high — system failure)
    await logSecurityEvent({
      type:      'system_error',
      severity:  'high',
      ip:        (req.headers['x-forwarded-for'] as string) ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
      metadata: {
        action:   'projects_list_failed',
        endpoint: '/api/projects/list',
        reason:   errMsg,
      },
    }).catch(() => undefined);

    return res.status(500).json({
      success:  false,
      projects: [],
      hasMore:  false,
      page:     1,
      total:    0,
      error:    'Unable to load projects. Please try again.',
    });
  }
}