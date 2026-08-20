/**
 * POST /api/projects/batch
 *
 * Fetches multiple projects by IDs in a single request.
 * Used by /shortlist page for both guest + logged-in users.
 *
 * Security:
 *   → Rate limited (30 req/min per IP)
 *   → Zod validation
 *   → Max 100 IDs per request
 *   → No auth required (public data)
 *
 * Response: ProjectListing[] with same shape as SSR
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import {
  computeStubShield,
  type ProjectListing,
  type DeveloperBadge,
  type PropertyType,
} from '@/types/projects';

// ─── VALIDATION ───────────────────────────────────────────────────────────────

const BatchSchema = z.object({
  projectIds: z.array(z.string().min(1).max(100)).min(1).max(100),
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
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const clientIp =
    (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown';

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis }     = await import('@upstash/redis');

    const ratelimit = new Ratelimit({
      redis:   Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix:  'rl:projects:batch',
    });

    const { success } = await ratelimit.limit(clientIp);
    if (!success) {
      res.status(429).json({ success: false, error: 'Too many requests' });
      return;
    }
  } catch {
    // Fail-open on Redis outage
  }

  // ── Validate input ────────────────────────────────────────────────────────
  const parsed = BatchSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid input', projects: [] });
    return;
  }

  // ── Filter to valid ObjectIds ─────────────────────────────────────────────
  const validIds = parsed.data.projectIds.filter(id =>
    mongoose.Types.ObjectId.isValid(id),
  );

  if (validIds.length === 0) {
    res.status(200).json({ success: true, projects: [] });
    return;
  }

  await dbConnect();

  try {
    // ── Fetch projects ────────────────────────────────────────────────────
    const rawProjects = await Project.find({
      _id:                     { $in: validIds },
      isDeleted:               { $ne: true },
      status:                  'verified',
      verificationStatus:      'verified',
      developerApprovalStatus: 'approved',
      isVerified:              true,
    })
      .select({
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
      })
      .maxTimeMS(5000)
      .lean();

    // ── Map to ProjectListing shape (matches SSR pattern) ─────────────────
    const projects: ProjectListing[] = (
      rawProjects as Array<Record<string, unknown>>
    ).map(p => {
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
        isShortlisted:    true,
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

    res.status(200).json({ success: true, projects });
  } catch {
    res.status(500).json({
      success:  false,
      projects: [],
      error:    'Failed to load projects',
    });
  }
}