/**
 * POST /api/compare/suggestions
 *
 * Smart similar-projects recommendation engine.
 * Takes current compare items and suggests similar projects.
 *
 * ALGORITHM (Tier-based scoring):
 *   TIER 1 — Same category match (residential/commercial/mixed)
 *   TIER 2 — Same city (dominant city in comparison)
 *   TIER 3 — Price range match (±30% of avg price)
 *   TIER 4 — Shield score boost (prefer highriseScore >= 60)
 *   TIER 5 — Exclusions (already in compare, deleted, unverified)
 *
 * Rate limited: 60 req/min per IP (this endpoint is called on
 * every compare page view, so needs generous limit)
 *
 * Response: Top 6 matching projects (ProjectListing shape)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';

import Project from '@/models/Projects';
import { rateLimitApi, sendRateLimitResponse } from '@/lib/rateLimit';
import {
  computeStubShield,
  type ProjectListing,
  type DeveloperBadge,
  type PropertyType,
} from '@/types/projects';

// ─── VALIDATION ───────────────────────────────────────────────────────────────

const SuggestionsSchema = z.object({
  // Current compare items to base suggestions on
  projectIds: z.array(z.string().min(1).max(100)).max(4).optional().default([]),

  // Optional filters (extracted from current compare items client-side)
  cities:     z.array(z.string().max(100)).max(10).optional().default([]),
  categories: z.array(z.string().max(50)).max(10).optional().default([]),
  natures:    z.array(z.string().max(50)).max(10).optional().default([]),
  minPrice:   z.number().nullable().optional(),
  maxPrice:   z.number().nullable().optional(),

  // How many suggestions to return
  limit:      z.number().min(1).max(12).optional().default(6),
});

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('Cache-Control',          'private, max-age=60');
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error:   'Method not allowed',
    });
  }

  try {
    // ─── Rate limit ────────────────────────────────────────────────────
    const rateLimitResult = await rateLimitApi(req);
    if (!rateLimitResult.ok) {
      return sendRateLimitResponse(res, rateLimitResult);
    }

    // ─── Validate input ────────────────────────────────────────────────
    const parsed = SuggestionsSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error:   'Invalid input',
      });
    }

    const {
      projectIds,
      cities,
      categories,
      natures,
      minPrice,
      maxPrice,
      limit,
    } = parsed.data;

    await dbConnect();

    // ─── Filter to valid ObjectIds ─────────────────────────────────────
    const excludeIds = projectIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    // ─── BUILD SMART MATCHING QUERY ────────────────────────────────────
    // Base: verified, approved, active projects only
    const baseFilter: Record<string, unknown> = {
      isDeleted:               { $ne: true },
      status:                  'verified',
      verificationStatus:      'verified',
      developerApprovalStatus: 'approved',
      isVerified:              true,
    };

    // Exclude current compare items
    if (excludeIds.length > 0) {
      baseFilter._id = { $nin: excludeIds };
    }

    // ─── BUILD $facet AGGREGATION FOR TIERED MATCHING ──────────────────
    // Uses MongoDB aggregation pipeline with $facet to run multiple
    // queries in parallel, then combines results by priority tier.
    //
    // NOTE: We fetch more than `limit` and dedupe client-side,
    // because a project may match multiple tiers.

    // Build regex patterns for case-insensitive matching
    const cityRegex     = cities.length > 0
      ? cities.map(c => new RegExp(`^${escapeRegex(c)}$`, 'i'))
      : [];
    const categoryRegex = categories.length > 0
      ? categories.map(c => new RegExp(escapeRegex(c), 'i'))
      : [];
    const natureRegex   = natures.length > 0
      ? natures.map(n => new RegExp(escapeRegex(n), 'i'))
      : [];

    // Calculate price range (±30% if provided)
    let priceMin: number | null = null;
    let priceMax: number | null = null;

    if (typeof minPrice === 'number' && minPrice > 0) {
      priceMin = Math.max(0, Math.floor(minPrice * 0.7));
    }
    if (typeof maxPrice === 'number' && maxPrice > 0) {
      priceMax = Math.ceil(maxPrice * 1.3);
    }

    // ─── TIER 1: Perfect Match (city + category + price range) ─────────
    const tier1Filter: Record<string, unknown> = { ...baseFilter };
    if (cityRegex.length > 0)     tier1Filter.city = { $in: cityRegex };
    if (categoryRegex.length > 0) tier1Filter.projectCategory = { $in: categoryRegex };
    if (natureRegex.length > 0)   tier1Filter.projectNature   = { $in: natureRegex };
    if (priceMin && priceMax) {
      tier1Filter.minPrice = { $gte: priceMin, $lte: priceMax };
    } else if (priceMin) {
      tier1Filter.minPrice = { $gte: priceMin };
    } else if (priceMax) {
      tier1Filter.minPrice = { $lte: priceMax };
    }

    // ─── TIER 2: Same city + same nature (broader) ──────────────────────
    const tier2Filter: Record<string, unknown> = { ...baseFilter };
    if (cityRegex.length > 0)   tier2Filter.city = { $in: cityRegex };
    if (natureRegex.length > 0) tier2Filter.projectNature = { $in: natureRegex };

    // ─── TIER 3: Same city (broadest match on city) ─────────────────────
    const tier3Filter: Record<string, unknown> = { ...baseFilter };
    if (cityRegex.length > 0) tier3Filter.city = { $in: cityRegex };

    // ─── TIER 4: Top-rated fallback (any city, high shield) ─────────────
    const tier4Filter: Record<string, unknown> = {
      ...baseFilter,
      highriseScore: { $gte: 70 },
    };

    // Shared select projection
    const projectSelect = {
      _id: 1, slug: 1, projectName: 1, tagline: 1,
      city: 1, area: 1, projectCategory: 1,
      projectNature: 1, projectStatus: 1,
      isVerified: 1, isFeatured: 1, isTrustedBuilder: 1,
      developerBadge: 1, minPrice: 1, maxPrice: 1,
      highriseScore: 1, nocStatus: 1, approvalAuthority: 1,
      featureImageUrl: 1, 'images.url': 1, 'images.isPrimary': 1,
      developerId: 1,
      'developerProfile.name': 1,
      'developerProfile.logoUrl': 1,
      inquiries: 1, createdAt: 1,
    };

    // ─── Fetch tiers in parallel ────────────────────────────────────────
    const [tier1, tier2, tier3, tier4] = await Promise.all([
      Project.find(tier1Filter)
        .sort({ highriseScore: -1, createdAt: -1 })
        .limit(limit)
        .select(projectSelect)
        .maxTimeMS(3000)
        .lean(),

      // Only fetch tier 2 if tier 1 might be insufficient
      Project.find(tier2Filter)
        .sort({ highriseScore: -1, createdAt: -1 })
        .limit(limit)
        .select(projectSelect)
        .maxTimeMS(3000)
        .lean(),

      Project.find(tier3Filter)
        .sort({ highriseScore: -1, createdAt: -1 })
        .limit(limit)
        .select(projectSelect)
        .maxTimeMS(3000)
        .lean(),

      Project.find(tier4Filter)
        .sort({ highriseScore: -1, createdAt: -1 })
        .limit(limit)
        .select(projectSelect)
        .maxTimeMS(3000)
        .lean(),
    ]);

    // ─── DEDUPE + PRIORITIZE ────────────────────────────────────────────
    // Tier 1 wins over Tier 2 over Tier 3 over Tier 4
    const seen = new Set<string>();
    const combined: Array<Record<string, unknown>> = [];
    const tierAssignment: Record<string, number> = {};

    const addTier = (tierResults: Array<Record<string, unknown>>, tier: number) => {
      for (const p of tierResults) {
        const id = String(p._id);
        if (!seen.has(id)) {
          seen.add(id);
          combined.push(p);
          tierAssignment[id] = tier;
          if (combined.length >= limit) break;
        }
      }
    };

    addTier(tier1 as Array<Record<string, unknown>>, 1);
    if (combined.length < limit) addTier(tier2 as Array<Record<string, unknown>>, 2);
    if (combined.length < limit) addTier(tier3 as Array<Record<string, unknown>>, 3);
    if (combined.length < limit) addTier(tier4 as Array<Record<string, unknown>>, 4);

    // Truncate to requested limit
    const finalProjects = combined.slice(0, limit);

    // ─── MAP TO ProjectListing SHAPE ────────────────────────────────────
    const projects: ProjectListing[] = finalProjects.map(p => {
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') {
        primaryImage = p.featureImageUrl;
      } else if (Array.isArray(p.images) && p.images.length > 0) {
        const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
        primaryImage = imgs.find(i => i?.isPrimary)?.url ?? imgs[0]?.url ?? null;
      }

      const dev   = p.developerProfile as { name?: string; logoUrl?: string } | undefined;
      const score = typeof p.highriseScore === 'number' ? p.highriseScore : 0;
      const noc   = (p.nocStatus as string | undefined) ?? 'not_applied';

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
        projectStatus:    'under_construction' as const,
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
        nocAuthority:     typeof p.approvalAuthority === 'string' ? p.approvalAuthority : null,
        nocNumber:        null,
        legalDocumentUrl: null,
        shield: computeStubShield({
          nocStatus:      noc as 'approved' | 'pending' | 'not_applied',
          isVerified:     Boolean(p.isVerified),
          developerBadge: typeof p.developerBadge === 'string' ? p.developerBadge : null,
          highriseScore:  score,
        }),
        developerId:      p.developerId ? String(p.developerId) : null,
        developerName:    dev?.name ?? '',
        developerSlug:    '',
        developerLogoUrl: dev?.logoUrl ?? null,
        developerBadge:   typeof p.developerBadge === 'string' ? p.developerBadge as DeveloperBadge : null,
        isTrustedBuilder: Boolean(p.isTrustedBuilder),
        marketedBy:       null,
        primaryImage,
        imageCount:       Array.isArray(p.images) ? p.images.length : 0,
        isShortlisted:    false,
        inquiryCount:     typeof p.inquiries === 'number' ? p.inquiries : null,
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

    // ─── Build matching context for UI display ─────────────────────────
    const matchContext = {
      cities,
      categories,
      natures,
      priceRange: {
        min: priceMin,
        max: priceMax,
      },
      totalMatches: projects.length,
      tierBreakdown: {
        tier1: Object.values(tierAssignment).filter(t => t === 1).length,
        tier2: Object.values(tierAssignment).filter(t => t === 2).length,
        tier3: Object.values(tierAssignment).filter(t => t === 3).length,
        tier4: Object.values(tierAssignment).filter(t => t === 4).length,
      },
    };

    return res.status(200).json({
      success: true,
      projects,
      context: matchContext,
    });

  } catch (error) {
    console.error('[api/compare/suggestions] Error:', error);
    return res.status(500).json({
      success:  false,
      projects: [],
      error:    'Failed to load suggestions',
    });
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}