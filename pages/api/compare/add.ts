//C:\dev\highrise-pk\pages\api\compare\add.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import {
  rateLimitApiWrite,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
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
  type CompareEntityType,
  type CompareReference,
} from '@/lib/compareApi';

const emptyQuerySchema = z.object({}).strict();

const addCompareSchema = z
  .object({
    entityType: z.enum(['property', 'project', 'society']).optional(),
    entityId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid entity ID')
      .optional(),
    propertyId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid property ID')
      .optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const isV2 =
      data.entityType !== undefined &&
      data.entityId !== undefined &&
      data.propertyId === undefined;
    const isLegacy =
      data.entityType === undefined &&
      data.entityId === undefined &&
      data.propertyId !== undefined;

    if (!isV2 && !isLegacy) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either (entityType + entityId) or propertyId.',
      });
    }
  });

function entityLabel(entityType: CompareEntityType): string {
  if (entityType === 'property') {
    return 'Property';
  }
  if (entityType === 'project') {
    return 'Project';
  }
  return 'Society';
}

function entityModel(entityType: CompareEntityType): string {
  if (entityType === 'property') {
    return 'Property';
  }
  if (entityType === 'project') {
    return 'Project';
  }
  return 'Society';
}

function respondAdded(
  res: NextApiResponse,
  entityType: CompareEntityType,
  count: number,
  reason?: string,
): void {
  res.status(200).json({
    success: true,
    message:
      reason === 'duplicate'
        ? `${entityLabel(entityType)} is already in comparison.`
        : `${entityLabel(entityType)} added to comparison.`,
    reason,
    data: {
      count,
      limit: MAX_COMPARE_ITEMS,
      shareId: null,
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
          action: 'compare_add_rate_limited',
          endpoint: '/api/compare/add',
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

    const queryValidation = emptyQuerySchema.safeParse(req.query);
    const bodyValidation = addCompareSchema.safeParse(req.body);

    if (!queryValidation.success || !bodyValidation.success) {
      await safelyLogCompareEvent({
        type: 'suspicious_activity',
        severity: 'low',
        userId,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
        req,
        metadata: {
          action: 'compare_add_invalid_request',
          endpoint: '/api/compare/add',
        },
      });

      res.status(400).json({
        success: false,
        error: 'Invalid comparison request.',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    const entityType: CompareEntityType =
      bodyValidation.data.entityType ?? 'property';
    const entityId = (
      bodyValidation.data.entityId ??
      bodyValidation.data.propertyId ??
      ''
    ).toLowerCase();

    const target: CompareReference = {
      entityType,
      entityId,
    };

    // Connect before any helper performs Mongoose queries.
    await dbConnect();

    const targetResolution = await resolveCompareReferences([target]);

    if (targetResolution.unavailableCount > 0) {
      res.status(404).json({
        success: false,
        error: 'This item is not publicly available for comparison.',
        reason: 'not_found',
      });
      return;
    }

    const targetIntent = validatePropertyListingIntents(
      [target],
      targetResolution,
    );

    if (!targetIntent.valid) {
      res.status(409).json({
        success: false,
        error: targetIntent.message,
        reason: targetIntent.reason,
      });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(auth.id);
    const nextExpiry = (): Date => new Date(Date.now() + COMPARE_TTL_MS);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const comparison = await Comparison.findOne({
        userId: userObjectId,
      })
        .sort({ createdAt: -1 })
        .lean();

      if (!comparison) {
        const now = new Date();
        const newItem = {
          entityType,
          entityId: new mongoose.Types.ObjectId(entityId),
          entityModel: entityModel(entityType),
          addedAt: now,
        };

        try {
          await Comparison.create({
            // A deterministic initial _id prevents two simultaneous first
            // adds for the same user from creating two new comparison docs.
            _id: userObjectId,
            userId: userObjectId,
            properties:
              entityType === 'property'
                ? [new mongoose.Types.ObjectId(entityId)]
                : [],
            items: [newItem],
            isShared: false,
            expiresAt: nextExpiry(),
          });

          respondAdded(res, entityType, 1);
          return;
        } catch (error) {
          if (isDuplicateKeyError(error)) {
            continue;
          }
          throw error;
        }
      }

      const comparisonRecord = asRecord(comparison);
      const rawExpiry = comparisonRecord.expiresAt;
      const hasExpiry = rawExpiry !== undefined && rawExpiry !== null;
      const expiry = toCompareDate(rawExpiry);
      const comparisonExpired =
        hasExpiry && (!expiry || expiry.getTime() <= Date.now());

      const parsed = parseComparisonReferences(comparison);
      const existingReferences = comparisonExpired ? [] : parsed.references;

      if (!comparisonExpired && parsed.invalidCount > 0) {
        res.status(409).json({
          success: false,
          error:
            'This comparison contains invalid saved items. Clear it before adding another item.',
          reason: 'invalid_existing_items',
        });
        return;
      }

      const existingTypes = new Set(
        existingReferences.map(reference => reference.entityType),
      );

      if (existingTypes.size > 1) {
        res.status(409).json({
          success: false,
          error:
            'This comparison contains different entity types. Clear it before adding another item.',
          reason: 'entity_type_mismatch',
        });
        return;
      }

      if (
        existingTypes.size === 1 &&
        !existingTypes.has(entityType)
      ) {
        const existingType = Array.from(existingTypes)[0];
        res.status(409).json({
          success: false,
          error: `This comparison is for ${existingType}s. Clear it before comparing a ${entityType}.`,
          reason: 'entity_type_mismatch',
        });
        return;
      }

      const alreadyExists = existingReferences.some(
        reference =>
          reference.entityType === entityType &&
          reference.entityId === entityId,
      );

      if (alreadyExists) {
        respondAdded(
          res,
          entityType,
          existingReferences.length,
          'duplicate',
        );
        return;
      }

      if (existingReferences.length >= MAX_COMPARE_ITEMS) {
        res.status(409).json({
          success: false,
          error: `A comparison can contain up to ${MAX_COMPARE_ITEMS} items. Remove an item before adding another.`,
          reason: 'limit_reached',
          data: {
            count: existingReferences.length,
            limit: MAX_COMPARE_ITEMS,
          },
        });
        return;
      }

      const nextReferences = [...existingReferences, target];
      const resolved = await resolveCompareReferences(nextReferences);

      if (resolved.unavailableCount > 0) {
        res.status(409).json({
          success: false,
          error:
            'An item already in this comparison is no longer publicly available. Remove it or clear the comparison before continuing.',
          reason: 'existing_entity_unavailable',
        });
        return;
      }

      const intentValidation = validatePropertyListingIntents(
        nextReferences,
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

      const now = new Date();
      const nextItems = nextReferences.map(reference => ({
        entityType: reference.entityType,
        entityId: new mongoose.Types.ObjectId(reference.entityId),
        entityModel: entityModel(reference.entityType),
        addedAt: now,
      }));
      const nextProperties = nextReferences
        .filter(reference => reference.entityType === 'property')
        .map(reference => new mongoose.Types.ObjectId(reference.entityId));

      const optimisticFilter: Record<string, unknown> = {
        _id: comparison._id,
        userId: userObjectId,
        ...compareVersionFilter(comparisonRecord.__v),
      };

      const updateResult = await Comparison.updateOne(
        optimisticFilter,
        {
          $set: {
            items: nextItems,
            properties: nextProperties,
            isShared: false,
            expiresAt: nextExpiry(),
          },
          $inc: { __v: 1 },
        },
      );

      if (updateResult.matchedCount !== 1) {
        continue;
      }

      respondAdded(res, entityType, nextReferences.length);
      return;
    }

    res.status(409).json({
      success: false,
      error:
        'Your comparison changed in another request. Refresh the page and try again.',
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
        action: 'compare_add_failed',
        endpoint: '/api/compare/add',
      },
    });

    res.status(500).json({
      success: false,
      error: 'Server error while updating comparison.',
    });
  }
}