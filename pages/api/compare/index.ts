// C:\dev\highrise-pk\pages\api\compare\index.ts
// V2 — Populates both properties AND projects
// Backward compatible response shape

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOptionalAuth } from '@/lib/optionalAuth';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import Property from '@/models/Property';
import Project from '@/models/Projects';
import mongoose from 'mongoose';
import { rateLimitApi, sendRateLimitResponse } from '@/lib/rateLimit';
import { z } from 'zod';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

const MAX_ITEMS = 4;

const sessionQuerySchema = z.object({
  sessionId: z.string().max(100, "Session ID too long").optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private',
    );
    res.setHeader('Pragma', 'no-cache');

    const rateLimitResult = await rateLimitApi(req);
    if (!rateLimitResult.ok) {
      return sendRateLimitResponse(res, rateLimitResult);
    }

    const rawSessionId = req.cookies['compare_session'] || req.query.sessionId;
    const validation = sessionQuerySchema.safeParse({ sessionId: rawSessionId });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID format',
      });
    }

    const sessionId = validation.data.sessionId;

    await dbConnect();

    // Canonical optional auth (guests allowed for comparison)
    const auth = await getOptionalAuth(req);

    let comparison = null;

    // Fetch comparison based on identity
    if (auth?.id) {
      comparison = await Comparison.findOne({
        userId: new mongoose.Types.ObjectId(auth.id),
      })
        .sort({ createdAt: -1 })
        .lean();
    } else if (sessionId) {
      comparison = await Comparison.findOne({ sessionId })
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!comparison) {
      return res.status(200).json({
        success: true,
        data: {
          properties: [],
          projects:   [],
          entities:   [],
          shareId:    null,
          count:      0,
          limit:      MAX_ITEMS,
        },
      });
    }

    // ─── Migrate legacy properties[] → items[] on read (self-heal) ─
    let items = comparison.items ?? [];
    if (items.length === 0 && comparison.properties && comparison.properties.length > 0) {
      items = comparison.properties.map(pid => ({
        entityType: 'property' as const,
        entityId:   pid,
        addedAt:    comparison!.createdAt,
      }));
    }

    // ─── Separate by entity type ──────────────────────────────
    const propertyIds = items
      .filter(i => i.entityType === 'property')
      .map(i => i.entityId);

    const projectIds = items
      .filter(i => i.entityType === 'project')
      .map(i => i.entityId);

    // ─── Parallel populate ────────────────────────────────────
    const [properties, projects] = await Promise.all([
      propertyIds.length > 0
        ? Property.find({
            _id:    { $in: propertyIds },
            ...PUBLIC_PROPERTY_FILTER,
          })
            .select('title price city area areaUnit images propertyType slug bedrooms bathrooms listingType location previousPrice priceDropPercent')
            .lean()
        : [],

      projectIds.length > 0
        ? Project.find({
            _id:       { $in: projectIds },
            isDeleted: { $ne: true },
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
            .lean()
        : [],
    ]);

    // Filter out any null populated results (shouldn't happen but safety)
    const validProperties = properties.filter(p => p !== null);
    const validProjects   = projects.filter(p => p !== null);

    // ─── Format properties (legacy compatible) ────────────────
    const formattedProperties = validProperties.map((property: Record<string, unknown>) => ({
      _id:              property._id,
      title:            property.title,
      price:            property.price,
      city:             property.city,
      area:             property.area,
      areaUnit:         property.areaUnit,
      images:           property.images,
      propertyType:     property.propertyType,
      slug:             property.slug,
      bedrooms:         property.bedrooms,
      bathrooms:        property.bathrooms,
      listingType:      property.listingType,
      location:         property.location,
      previousPrice:    property.previousPrice,
      priceDropPercent: property.priceDropPercent,
    }));

    // ─── Format projects (for compare page consumption) ───────
    const formattedProjects = validProjects.map((p: Record<string, unknown>) => {
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') {
        primaryImage = p.featureImageUrl;
      } else if (Array.isArray(p.images) && p.images.length > 0) {
        const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
        primaryImage = imgs.find(i => i?.isPrimary)?.url ?? imgs[0]?.url ?? null;
      }
      const dev = p.developerProfile as { name?: string; logoUrl?: string } | undefined;

      return {
        _id:              String(p._id ?? ''),
        slug:             String(p.slug ?? ''),
        projectName:      String(p.projectName ?? ''),
        tagline:          typeof p.tagline === 'string' ? p.tagline : null,
        city:             String(p.city ?? ''),
        area:             String(p.area ?? ''),
        projectCategory:  String(p.projectCategory ?? ''),
        projectNature:    String(p.projectNature ?? ''),
        projectStatus:    String(p.projectStatus ?? ''),
        minPrice:         typeof p.minPrice === 'number' ? p.minPrice : null,
        maxPrice:         typeof p.maxPrice === 'number' ? p.maxPrice : null,
        isVerified:       Boolean(p.isVerified),
        isFeatured:       Boolean(p.isFeatured),
        isTrustedBuilder: Boolean(p.isTrustedBuilder),
        developerBadge:   p.developerBadge,
        highriseScore:    typeof p.highriseScore === 'number' ? p.highriseScore : 0,
        nocStatus:        p.nocStatus,
        approvalAuthority:p.approvalAuthority,
        primaryImage,
        developerName:    dev?.name ?? '',
        developerLogoUrl: dev?.logoUrl ?? null,
        inquiryCount:     typeof p.inquiries === 'number' ? p.inquiries : null,
        createdAt:        p.createdAt instanceof Date
                          ? p.createdAt.toISOString()
                          : String(p.createdAt ?? ''),
      };
    });

    // ─── Ordered entities array (preserves add order for UI) ──
    const entities = items.map(item => {
      if (item.entityType === 'property') {
        const found = formattedProperties.find(
          p => String(p._id) === String(item.entityId),
        );
        return found ? { entityType: 'property' as const, data: found } : null;
      } else {
        const found = formattedProjects.find(
          p => String(p._id) === String(item.entityId),
        );
        return found ? { entityType: 'project' as const, data: found } : null;
      }
    }).filter((e): e is NonNullable<typeof e> => e !== null);

    return res.status(200).json({
      success: true,
      data: {
        _id:        comparison._id,
        properties: formattedProperties,
        projects:   formattedProjects,
        entities,
        shareId:    comparison.shareId,
        isShared:   comparison.isShared,
        count:      entities.length,
        limit:      MAX_ITEMS,
        expiresAt:  comparison.expiresAt,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching comparison list',
      data: {
        properties: [],
        projects:   [],
        entities:   [],
        count:      0,
        limit:      MAX_ITEMS,
      },
    });
  }
}
