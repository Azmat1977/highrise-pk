//pages/api/compare/share.ts
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import { rateLimitApiWrite, sendRateLimitResponse } from '@/lib/rateLimit';
import {
  COMPARE_TTL_MS,
  MAX_COMPARE_ITEMS,
  asRecord,
  compareVersionFilter,
  createCompareRequestContext,
  isDuplicateKeyError,
  parseComparisonReferences,
  resolveCompareReferences,
  safelyLogCompareEvent,
  setCompareSecurityHeaders,
  toCompareDate,
  validatePropertyListingIntents,
} from '@/lib/compareApi';

const emptySchema = z.object({}).strict();

function entityModel(entityType: string): string {
  if (entityType === 'property') {
    return 'Property';
  }
  if (entityType === 'project') {
    return 'Project';
  }
  return 'Society';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  setCompareSecurityHeaders(res);
  const context = createCompareRequestContext(req, res);
  let userId: string | undefined;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const rateLimitResult = await rateLimitApiWrite(req);

    if (!rateLimitResult.ok) {
      await safelyLogCompareEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
        req,
        metadata: {
          action: 'compare_share_rate_limited',
          endpoint: '/api/compare/share',
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
        error: 'Authentication required.',
      });
      return;
    }

    const bodyValidation = emptySchema.safeParse(req.body ?? {});
    const queryValidation = emptySchema.safeParse(req.query);

    if (!bodyValidation.success || !queryValidation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid share-comparison request.',
      });
      return;
    }

    await dbConnect();

    const userObjectId = new mongoose.Types.ObjectId(auth.id);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const comparison = await Comparison.findOne({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .lean();

      if (!comparison) {
        res.status(409).json({
          success: false,
          error: 'Add at least one item before sharing a comparison.',
          reason: 'empty_comparison',
        });
        return;
      }

      const comparisonRecord = asRecord(comparison);
      const expiry = toCompareDate(comparisonRecord.expiresAt);

      if (expiry !== null && expiry.getTime() <= Date.now()) {
        res.status(409).json({
          success: false,
          error: 'This comparison has expired. Add items again before sharing.',
          reason: 'comparison_expired',
        });
        return;
      }

      const parsed = parseComparisonReferences(comparison);

      if (parsed.invalidCount > 0) {
        res.status(409).json({
          success: false,
          error:
            'This comparison contains invalid items. Clear it and add items again before sharing.',
          reason: 'invalid_items',
        });
        return;
      }

      if (parsed.references.length === 0) {
        res.status(409).json({
          success: false,
          error: 'Add at least one item before sharing a comparison.',
          reason: 'empty_comparison',
        });
        return;
      }

      if (parsed.references.length > MAX_COMPARE_ITEMS) {
        res.status(409).json({
          success: false,
          error: `A comparison can contain up to ${MAX_COMPARE_ITEMS} items.`,
          reason: 'limit_reached',
        });
        return;
      }

      const entityTypes = new Set(
        parsed.references.map(reference => reference.entityType),
      );

      if (entityTypes.size !== 1) {
        res.status(409).json({
          success: false,
          error:
            'This comparison contains different entity types. Clear it and compare one type before sharing.',
          reason: 'entity_type_mismatch',
        });
        return;
      }

      const resolved = await resolveCompareReferences(parsed.references);

      if (resolved.unavailableCount > 0) {
        res.status(409).json({
          success: false,
          error:
            'One or more items are no longer publicly available. Remove them or clear the comparison before sharing.',
          reason: 'entity_unavailable',
        });
        return;
      }

      const intentValidation = validatePropertyListingIntents(
        parsed.references,
        resolved,
      );

      if (!intentValidation.valid) {
        res.status(409).json({
          success: false,
          error: intentValidation.message,
          reason: intentValidation.reason,
        });
        return;
      }

      let updated = false;

      for (let tokenAttempt = 0; tokenAttempt < 3; tokenAttempt += 1) {
        const shareId = crypto.randomBytes(24).toString('hex');
        const collision = await Comparison.exists({ shareId });

        if (collision) {
          continue;
        }

        const expiresAt = new Date(Date.now() + COMPARE_TTL_MS);
        const now = new Date();
        const normalizedItems = parsed.references.map(reference => ({
          entityType: reference.entityType,
          entityId: new mongoose.Types.ObjectId(reference.entityId),
          entityModel: entityModel(reference.entityType),
          addedAt: now,
        }));
        const normalizedProperties = parsed.references
          .filter(reference => reference.entityType === 'property')
          .map(reference => new mongoose.Types.ObjectId(reference.entityId));

        const optimisticFilter: Record<string, unknown> = {
          _id: comparison._id,
          userId: userObjectId,
          ...compareVersionFilter(comparisonRecord.__v),
        };

        try {
          const result = await Comparison.updateOne(
            optimisticFilter,
            {
              $set: {
                items: normalizedItems,
                properties: normalizedProperties,
                isShared: true,
                shareId,
                expiresAt,
              },
              $inc: { __v: 1 },
            },
          );

          if (result.matchedCount === 1) {
            res.status(200).json({
              success: true,
              data: {
                shareId,
                expiresAt: expiresAt.toISOString(),
                count: parsed.references.length,
                limit: MAX_COMPARE_ITEMS,
              },
            });
            return;
          }

          updated = false;
          break;
        } catch (error) {
          if (isDuplicateKeyError(error)) {
            continue;
          }
          throw error;
        }
      }

      if (updated) {
        return;
      }
    }

    res.status(409).json({
      success: false,
      error:
        'Your comparison changed while the share link was being created. Refresh and try again.',
      reason: 'comparison_changed',
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
        action: 'compare_share_create_failed',
        endpoint: '/api/compare/share',
      },
    });

    res.status(500).json({
      success: false,
      error: 'Server error while creating a comparison share link.',
    });
  }
}