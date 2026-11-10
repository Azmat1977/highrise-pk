// C:\dev\highrise-pk\pages\api\compare\remove.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import {
  MAX_COMPARE_ITEMS,
  createCompareRequestContext,
  parseComparisonReferences,
  safelyLogCompareEvent,
  setCompareSecurityHeaders,
} from '@/lib/compareApi';

const entityIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid entity ID');

const removeCompareSchema = z
  .object({
    entityType: z.enum(['property', 'project', 'society']).optional(),
    entityId: entityIdSchema.optional(),
    propertyId: entityIdSchema.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const hasEntityType = data.entityType !== undefined;
    const hasEntityId = data.entityId !== undefined;
    const hasPropertyId = data.propertyId !== undefined;

    if (
      hasEntityType !== hasEntityId ||
      (hasEntityType && hasPropertyId) ||
      (!hasEntityType && !hasPropertyId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either (entityType + entityId) or propertyId.',
      });
    }
  });

function isEmptyObject(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

function entityLabel(entityType: string): string {
  if (entityType === 'property') {
    return 'Property';
  }
  if (entityType === 'society') {
    return 'Society';
  }
  return 'Project';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  setCompareSecurityHeaders(res);
  const context = createCompareRequestContext(req, res);
  let userId: string | undefined;

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const { rateLimitApiWrite, sendRateLimitResponse } = await import(
      '@/lib/rateLimit'
    );
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
          action: 'compare_remove_rate_limited',
          endpoint: '/api/compare/remove',
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

    const bodyIsEmpty =
      req.body === undefined || req.body === null || isEmptyObject(req.body);
    const queryIsEmpty = Object.keys(req.query).length === 0;

    if (!bodyIsEmpty && !queryIsEmpty) {
      res.status(400).json({
        success: false,
        error: 'Provide removal parameters in either the body or query, not both.',
      });
      return;
    }

    const source = bodyIsEmpty ? req.query : req.body;
    const validation = removeCompareSchema.safeParse(source);

    if (!validation.success) {
      await safelyLogCompareEvent({
        type: 'suspicious_activity',
        severity: 'low',
        userId,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
        req,
        metadata: {
          action: 'compare_remove_invalid_request',
          endpoint: '/api/compare/remove',
        },
      });

      res.status(400).json({
        success: false,
        error: 'Invalid comparison removal request.',
      });
      return;
    }

    await dbConnect();

    const entityType = validation.data.entityType ?? 'property';
    const entityId = (
      validation.data.entityId ??
      validation.data.propertyId ??
      ''
    ).toLowerCase();
    const entityObjectId = new mongoose.Types.ObjectId(entityId);
    const userObjectId = new mongoose.Types.ObjectId(auth.id);

    const matchConditions: Record<string, unknown>[] = [
      {
        items: {
          $elemMatch: {
            entityType,
            entityId: entityObjectId,
          },
        },
      },
    ];

    if (entityType === 'property') {
      matchConditions.push({ properties: entityObjectId });
    }

    const pull: Record<string, unknown> = {
      items: {
        entityType,
        entityId: entityObjectId,
      },
    };

    if (entityType === 'property') {
      pull.properties = entityObjectId;
    }

    await Comparison.updateMany(
      {
        userId: userObjectId,
        $or: matchConditions,
      },
      {
        $pull: pull,
        $set: { isShared: false },
        $inc: { __v: 1 },
      },
    );

    const latest = await Comparison.findOne({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .lean();

    const remaining = latest
      ? parseComparisonReferences(latest).references.length
      : 0;

    res.status(200).json({
      success: true,
      message: `${entityLabel(entityType)} removed from comparison.`,
      data: {
        count: remaining,
        limit: MAX_COMPARE_ITEMS,
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
        action: 'compare_remove_failed',
        endpoint: '/api/compare/remove',
      },
    });

    res.status(500).json({
      success: false,
      error: 'Server error while removing comparison item.',
    });
  }
}