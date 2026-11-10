// C:\dev\highrise-pk\pages\api\compare\[shareId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import { rateLimitApi, sendRateLimitResponse } from '@/lib/rateLimit';
import {
  MAX_COMPARE_ITEMS,
  asRecord,
  createCompareRequestContext,
  parseComparisonReferences,
  resolveCompareReferences,
  safelyLogCompareEvent,
  setCompareSecurityHeaders,
  toCompareDate,
  toCompareIsoDate,
  validatePropertyListingIntents,
} from '@/lib/compareApi';

const shareQuerySchema = z
  .object({
    shareId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9_-]+$/, 'Invalid share ID format'),
  })
  .strict();

function notFound(res: NextApiResponse): void {
  res.status(404).json({
    success: false,
    error: 'Comparison link not found or expired.',
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  setCompareSecurityHeaders(res);
  const context = createCompareRequestContext(req, res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const rateLimitResult = await rateLimitApi(req);

    if (!rateLimitResult.ok) {
      await safelyLogCompareEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
        req,
        metadata: {
          action: 'compare_shared_read_rate_limited',
          endpoint: '/api/compare/[shareId]',
          retryAfter: rateLimitResult.retryAfter,
        },
      });

      sendRateLimitResponse(res, rateLimitResult);
      return;
    }

    const validation = shareQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid comparison share link.',
      });
      return;
    }

    await dbConnect();

    const now = new Date();
    const comparison = await Comparison.findOne({
      shareId: validation.data.shareId,
      isShared: true,
      expiresAt: { $gt: now },
    }).lean();

    if (!comparison) {
      notFound(res);
      return;
    }

    const comparisonRecord = asRecord(comparison);
    const expiry = toCompareDate(comparisonRecord.expiresAt);

    if (
      comparisonRecord.isShared !== true ||
      expiry === null ||
      expiry.getTime() <= Date.now()
    ) {
      notFound(res);
      return;
    }

    const parsed = parseComparisonReferences(comparison);

    if (
      parsed.invalidCount > 0 ||
      parsed.references.length === 0 ||
      parsed.references.length > MAX_COMPARE_ITEMS
    ) {
      notFound(res);
      return;
    }

    const entityTypes = new Set(
      parsed.references.map(reference => reference.entityType),
    );

    if (entityTypes.size !== 1) {
      notFound(res);
      return;
    }

    const resolved = await resolveCompareReferences(parsed.references);

    if (resolved.unavailableCount > 0) {
      notFound(res);
      return;
    }

    const intentValidation = validatePropertyListingIntents(
      parsed.references,
      resolved,
    );

    if (!intentValidation.valid) {
      notFound(res);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        shareId: validation.data.shareId,
        entityType: Array.from(entityTypes)[0],
        properties: resolved.properties,
        projects: resolved.projects,
        societies: resolved.societies,
        entities: resolved.entities,
        count: resolved.entities.length,
        limit: MAX_COMPARE_ITEMS,
        createdAt: toCompareIsoDate(comparisonRecord.createdAt),
        expiresAt: expiry.toISOString(),
      },
    });
  } catch {
    await safelyLogCompareEvent({
      type: 'api_unhandled_error',
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
      req,
      metadata: {
        action: 'compare_shared_read_failed',
        endpoint: '/api/compare/[shareId]',
      },
    });

    res.status(500).json({
      success: false,
      error: 'Server error while fetching shared comparison.',
    });
  }
}