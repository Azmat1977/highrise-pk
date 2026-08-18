// C:\dev\highrise-pk\pages\api\compare\remove.ts
// V2 — Multi-entity remove (property + project)
// Backward compatible: legacy propertyId still works

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOptionalAuth } from '@/lib/optionalAuth';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import mongoose from 'mongoose';
import { rateLimitApiWrite, sendRateLimitResponse } from '@/lib/rateLimit';
import { z } from 'zod';

const MAX_ITEMS = 4;

const removeCompareSchema = z.object({
  entityType: z.enum(['property', 'project']).optional().nullable(),
  entityId:   z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid entity ID").optional().nullable(),
  propertyId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid property ID").optional().nullable(),
  sessionId:  z.string().max(100, "Session ID too long").optional().nullable(),
}).refine(
  data => (data.entityType && data.entityId) || data.propertyId,
  { message: 'Provide either (entityType + entityId) or propertyId' },
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const rateLimitResult = await rateLimitApiWrite(req);
    if (!rateLimitResult.ok) {
      return sendRateLimitResponse(res, rateLimitResult);
    }

    // Support body + query params
    const payload = {
      entityType: req.body?.entityType ?? req.query?.entityType,
      entityId:   req.body?.entityId   ?? req.query?.entityId,
      propertyId: req.body?.propertyId ?? req.query?.propertyId,
      sessionId:  req.body?.sessionId  ?? req.query?.sessionId,
    };

    const validation = removeCompareSchema.safeParse(payload);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error:   validation.error.issues[0].message,
      });
    }

    // Normalize
    const entityType: 'property' | 'project' =
      validation.data.entityType
      ?? (validation.data.propertyId ? 'property' : 'property');

    const entityId: string =
      validation.data.entityId
      ?? validation.data.propertyId
      ?? '';

    const { sessionId } = validation.data;

    await dbConnect();

    // Canonical optional auth (guests allowed for comparison)
    const auth = await getOptionalAuth(req);
    const userId = auth?.id;
    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error:   'Session identification required',
      });
    }

    const query = userId
      ? { userId: new mongoose.Types.ObjectId(userId) }
      : { sessionId };

    // ─── Atomic pull from BOTH items[] and legacy properties[] ─
    const updateOps: Record<string, unknown> = {
      $pull: {
        items: {
          entityType,
          entityId: new mongoose.Types.ObjectId(entityId),
        },
      },
    };

    // Legacy: also pull from properties[] if property
    if (entityType === 'property') {
      (updateOps.$pull as Record<string, unknown>).properties =
        new mongoose.Types.ObjectId(entityId);
    }

    const updatedComparison = await Comparison.findOneAndUpdate(
      query,
      updateOps,
      { new: true },
    );

    if (!updatedComparison) {
      return res.status(404).json({
        success: false,
        error:   'Comparison list not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `${entityType === 'property' ? 'Property' : 'Project'} removed from comparison`,
      data: {
        count: updatedComparison.items?.length ?? 0,
        limit: MAX_ITEMS,
      },
    });
  } catch (error) {
    console.error('[api/compare/remove] Error:', error);
    return res.status(500).json({
      success: false,
      error:   'Server error while removing from comparison',
    });
  }
}