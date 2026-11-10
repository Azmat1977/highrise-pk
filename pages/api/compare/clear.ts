// C:\dev\highrise-pk\pages\api\compare\clear.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import {
  createCompareRequestContext,
  safelyLogCompareEvent,
  setCompareSecurityHeaders,
} from '@/lib/compareApi';
import { rateLimitApiWrite, sendRateLimitResponse } from '@/lib/rateLimit';

const emptySchema = z.object({}).strict();

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
          action: 'compare_clear_rate_limited',
          endpoint: '/api/compare/clear',
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
        error: 'Invalid clear-comparison request.',
      });
      return;
    }

    await dbConnect();

    const result = await Comparison.updateMany(
      { userId: new mongoose.Types.ObjectId(auth.id) },
      {
        $set: {
          properties: [],
          items: [],
          isShared: false,
        },
        $inc: { __v: 1 },
      },
    );

    res.status(200).json({
      success: true,
      message: result.matchedCount
        ? 'Comparison cleared successfully.'
        : 'There was no comparison to clear.',
      data: {
        count: 0,
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
        action: 'compare_clear_failed',
        endpoint: '/api/compare/clear',
      },
    });

    res.status(500).json({
      success: false,
      error: 'Server error while clearing comparison.',
    });
  }
}