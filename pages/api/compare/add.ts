// C:\dev\highrise-pk\pages\api\compare\add.ts
// V2 — Multi-entity support (property + project)
// Backward compatible: legacy propertyId still works

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOptionalAuth } from '@/lib/optionalAuth';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import Property from '@/models/Property';
import Project  from '@/models/Projects';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { rateLimitApiWrite, sendRateLimitResponse } from '@/lib/rateLimit';
import { z } from 'zod';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

const MAX_ITEMS = 4;

// ----------------------------------------------------------------------
// 🛡️ VALIDATION SCHEMA — supports both new and legacy formats
// ----------------------------------------------------------------------

const addCompareSchema = z.object({
  // NEW V2 format:
  entityType: z.enum(['property', 'project']).optional().nullable(),
  entityId:   z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid entity ID").optional().nullable(),

  // LEGACY format (property-only):
  propertyId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid property ID").optional().nullable(),

  sessionId:  z.string().max(100, "Session ID too long").optional().nullable(),
}).refine(
  data => (data.entityType && data.entityId) || data.propertyId,
  { message: 'Provide either (entityType + entityId) or propertyId' },
);

// ----------------------------------------------------------------------
// 🚀 HANDLER
// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Rate limit
    const rateLimitResult = await rateLimitApiWrite(req);
    if (!rateLimitResult.ok) {
      return sendRateLimitResponse(res, rateLimitResult);
    }

    // Validate
    const validation = addCompareSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error:   validation.error.issues[0].message,
      });
    }

    // Normalize: accept both V2 and legacy input
    const entityType: 'property' | 'project' =
      validation.data.entityType
      ?? (validation.data.propertyId ? 'property' : 'property');

    const entityId: string =
      validation.data.entityId
      ?? validation.data.propertyId
      ?? '';

    if (!entityId) {
      return res.status(400).json({ success: false, error: 'Entity ID required' });
    }

    let { sessionId } = validation.data;

    await dbConnect();

    // ─── Verify entity exists ─────────────────────────────────
    let entityExists = false;

    if (entityType === 'property') {
      entityExists = Boolean(
        await Property.exists({
          _id:    entityId,
          ...PUBLIC_PROPERTY_FILTER,
        }),
      );
    } else if (entityType === 'project') {
      entityExists = Boolean(
        await Project.exists({
          _id:       entityId,
          isDeleted: { $ne: true },
        }),
      );
    }

    if (!entityExists) {
      return res.status(404).json({
        success: false,
        error:   `${entityType === 'property' ? 'Property' : 'Project'} not found or not available`,
        reason:  'not_found',
      });
    }

    // ─── Identify user (auth vs guest) — canonical guard ────
    // getOptionalAuth validates tokenVersion + account status
    // Returns null for guests (allowed for comparison)
    const auth = await getOptionalAuth(req);
    const userId = auth?.id;

    const query = userId
      ? { userId: new mongoose.Types.ObjectId(userId) }
      : { sessionId: sessionId || crypto.randomBytes(16).toString('hex') };

    let comparison = await Comparison.findOne(query).sort({ createdAt: -1 });

    // ─── New comparison ───────────────────────────────────────
    if (!comparison) {
      const newItem = {
        entityType,
        entityId:    new mongoose.Types.ObjectId(entityId),
        entityModel: entityType === 'property' ? 'Property' : 'Project',
        addedAt:     new Date(),
      };

      // Backward compat: also populate legacy `properties[]` if property
      const legacyProperties = entityType === 'property'
        ? [new mongoose.Types.ObjectId(entityId)]
        : [];

      comparison = await Comparison.create({
        ...query,
        properties: legacyProperties,
        items:      [newItem],
        expiresAt:  new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      return res.status(200).json({
        success: true,
        message: `${entityType === 'property' ? 'Property' : 'Project'} added to comparison`,
        data: {
          _id:       comparison._id,
          count:     1,
          limit:     MAX_ITEMS,
          shareId:   comparison.shareId,
          sessionId: comparison.sessionId || null,
        },
      });
    }

    // ─── Merge legacy properties into items on first read ─────
    // Self-heal: if items[] is empty but properties[] exists,
    // migrate them silently (backward compat).
    if ((!comparison.items || comparison.items.length === 0)
        && comparison.properties?.length > 0) {
      comparison.items = comparison.properties.map(pid => ({
        entityType:  'property' as const,
        entityId:    pid,
        entityModel: 'Property' as const,
        addedAt:     comparison!.createdAt,
      }));
      await comparison.save();
    }

    // ─── Check duplicate ──────────────────────────────────────
    const alreadyExists = (comparison.items ?? []).some(
      item =>
        item.entityType === entityType
        && item.entityId.toString() === entityId,
    );

    if (alreadyExists) {
      return res.status(200).json({
        success: true,
        message: `${entityType === 'property' ? 'Property' : 'Project'} already in comparison`,
        reason:  'duplicate',
        data: {
          count:     comparison.items?.length ?? 0,
          limit:     MAX_ITEMS,
          shareId:   comparison.shareId,
          sessionId: comparison.sessionId ?? null,
        },
      });
    }

    // ─── Check limit ──────────────────────────────────────────
    if ((comparison.items?.length ?? 0) >= MAX_ITEMS) {
      return res.status(400).json({
        success: false,
        error:   `Maximum ${MAX_ITEMS} items allowed in comparison`,
        reason:  'limit_reached',
        data: {
          count: comparison.items?.length ?? 0,
          limit: MAX_ITEMS,
        },
      });
    }

    // ─── Atomic push ──────────────────────────────────────────
    const updateOps: Record<string, unknown> = {
      $push: {
        items: {
          entityType,
          entityId:    new mongoose.Types.ObjectId(entityId),
          entityModel: entityType === 'property' ? 'Property' : 'Project',
          addedAt:     new Date(),
        },
      },
    };

    // Also push to legacy properties[] if property (backward compat)
    if (entityType === 'property') {
      (updateOps.$push as Record<string, unknown>).properties = new mongoose.Types.ObjectId(entityId);
    }

    comparison = await Comparison.findOneAndUpdate(
      { _id: comparison._id },
      updateOps,
      { new: true },
    );

    if (!comparison) {
      return res.status(500).json({
        success: false,
        error:   'Failed to update comparison list',
      });
    }

    return res.status(200).json({
      success: true,
      message: `${entityType === 'property' ? 'Property' : 'Project'} added to comparison`,
      data: {
        _id:       comparison._id,
        count:     comparison.items?.length ?? 0,
        limit:     MAX_ITEMS,
        shareId:   comparison.shareId,
        sessionId: comparison.sessionId ?? null,
      },
    });
  } catch (error) {
    console.error('[api/compare/add] Error:', error);
    return res.status(500).json({
      success: false,
      error:   'Server error while adding to comparison',
    });
  }
}
