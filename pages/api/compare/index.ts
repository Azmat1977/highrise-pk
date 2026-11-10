//C:\dev\highrise-pk\pages\api\compare\index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import { getClientIp, requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, sendRateLimitResponse } from '@/lib/rateLimit';
import { safelyLogCompareEvent } from '@/lib/compareApi';
import {
  MAX_COMPARE_ITEMS,
  asRecord,
  createCompareRequestContext,
  parseComparisonReferences,
  resolveCompareReferences,
  setCompareSecurityHeaders,
  toCompareDate,
  toCompareIsoDate,
  validatePropertyListingIntents,
} from '@/lib/compareApi';
import Comparison from '@/models/Comparison';

const querySchema = z.object({}).strict();

function emptyResponse(res: NextApiResponse): void {
  res.status(200).json({
    success: true,
    data: {
      entityType: null,
      properties: [],
      projects: [],
      societies: [],
      entities: [],
      shareId: null,
      isShared: false,
      count: 0,
      limit: MAX_COMPARE_ITEMS,
      expiresAt: null,
      validationError: null,
      validationReason: null,
      unavailableCount: 0,
      invalidItemCount: 0,
    },
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  setCompareSecurityHeaders(res);
  const context = createCompareRequestContext(req, res);
  let userId: string | undefined;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
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
          action: 'compare_list_rate_limited',
          endpoint: '/api/compare',
          retryAfter: rateLimitResult.retryAfter,
        },
      });

      sendRateLimitResponse(res, rateLimitResult);
      return;
    }

    const auth = await requireAuth(req, res);
    if (!auth) {
      return;
    }
    userId = auth.id;

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
      });
      return;
    }

    await dbConnect();

    const now = new Date();
    const comparison = await Comparison.findOne({
      userId: new mongoose.Types.ObjectId(auth.id),
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: { $exists: false } },
        { expiresAt: null },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!comparison) {
      emptyResponse(res);
      return;
    }

    const comparisonRecord = asRecord(comparison);
    const parsed = parseComparisonReferences(comparison);
    const resolved = await resolveCompareReferences(parsed.references);
    const entityTypes = Array.from(
      new Set(parsed.references.map(reference => reference.entityType)),
    );
    const entityType = entityTypes.length === 1 ? entityTypes[0] : null;

    let validationError: string | null = null;
    let validationReason: string | null = null;

    if (parsed.invalidCount > 0) {
      validationError =
        'Some saved comparison items are invalid. Clear the comparison and add items again.';
      validationReason = 'invalid_items';
    } else if (parsed.references.length > MAX_COMPARE_ITEMS) {
      validationError =
        `A comparison can contain up to ${MAX_COMPARE_ITEMS} items. Clear or remove items before continuing.`;
      validationReason = 'limit_reached';
    } else if (entityTypes.length > 1) {
      validationError =
        'This comparison contains different entity types. Clear it before continuing.';
      validationReason = 'entity_type_mismatch';
    } else if (resolved.unavailableCount > 0) {
      validationError =
        'One or more items are no longer publicly available. Remove them or clear the comparison.';
      validationReason = 'entity_unavailable';
    } else if (entityType === 'property') {
      const intentValidation = validatePropertyListingIntents(
        parsed.references,
        resolved,
      );

      if (!intentValidation.valid) {
        validationError = intentValidation.message ?? null;
        validationReason = intentValidation.reason ?? null;
      }
    }

    const expiresAt = toCompareDate(comparisonRecord.expiresAt);
    const isShared =
      comparisonRecord.isShared === true &&
      expiresAt !== null &&
      expiresAt.getTime() > Date.now();
    const shareId =
      isShared && typeof comparisonRecord.shareId === 'string'
        ? comparisonRecord.shareId
        : null;

    res.status(200).json({
      success: true,
      data: {
        _id: String(comparisonRecord._id ?? ''),
        entityType,
        properties: resolved.properties,
        projects: resolved.projects,
        societies: resolved.societies,
        entities: resolved.entities,
        shareId,
        isShared,
        count: resolved.entities.length,
        limit: MAX_COMPARE_ITEMS,
        createdAt: toCompareIsoDate(comparisonRecord.createdAt),
        expiresAt: toCompareIsoDate(comparisonRecord.expiresAt),
        validationError,
        validationReason,
        unavailableCount: resolved.unavailableCount,
        invalidItemCount: parsed.invalidCount,
      },
    });
  } catch {
    await safelyLogCompareEvent({
      type: 'api_unhandled_error',
      userId,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
      req,
      metadata: {
        action: 'compare_list_fetch_failed',
        endpoint: '/api/compare',
      },
    });

    res.status(500).json({
      success: false,
      message: 'Server error while fetching comparison.',
      data: {
        entityType: null,
        properties: [],
        projects: [],
        societies: [],
        entities: [],
        count: 0,
        limit: MAX_COMPARE_ITEMS,
      },
    });
  }
}