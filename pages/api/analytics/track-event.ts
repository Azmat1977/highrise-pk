// pages/api/analytics/track-event.ts
// --- ENTERPRISE SPONSORED ADS TELEMETRY INGESTION ---
// Security Hardened | Bot Filtering | Rate Limited | NoSQL Injection Protected

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Project from '@/models/Projects';
import {
  rateLimitTelemetry,
  sendRateLimitResponse,
  getClientIp,
} from '@/lib/rateLimit';

// Strict validation contract for analytic ingestion
const IngestionSchema = z.object({
  projectId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Project identifier shape',
  }),
  eventType: z.enum(['impression', 'click']),
});

// Basic, high-efficiency list of typical web crawlers to discard
const BOT_SIGNATURES = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  'slurp',
  'ia_archiver',
  'headless',
  'lighthouse',
  'puppeteer',
  'python-requests',
  'wget',
  'curl',
  'semrushbot',
  'ahrefsbot',
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_SIGNATURES.some((bot) => ua.includes(bot));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. Strict Protocol Guard
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // 2. High Capacity Telemetry Rate Limiting
    const limitCheck = await rateLimitTelemetry(req);
    if (!limitCheck.ok) {
      return sendRateLimitResponse(res, limitCheck);
    }

    // 3. Crawler & Bot Filtering (Silent Discard to avoid skewing telemetry)
    const userAgent = req.headers['user-agent'] || '';
    if (isBot(userAgent)) {
      return res.status(200).json({
        success: true,
        message: 'Telemetry ignored for automated crawlers',
      });
    }

    // 4. Schema Verification
    const bodyValidation = IngestionSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: bodyValidation.error.format(),
      });
    }

    const { projectId, eventType } = bodyValidation.data;

    // 5. Database Connection
    await dbConnect();

    // 6. Atomic Field Value Increment Operation
    const updateField =
      eventType === 'impression' ? 'promotionImpressions' : 'promotionClicks';

    const result = await Project.updateOne(
      {
        _id: new mongoose.Types.ObjectId(projectId),
        isDeleted: false,
      },
      {
        $inc: { [updateField]: 1 },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'PROJECT_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Event logged successfully',
    });
  } catch (err: any) {
    console.error('[Telemetry API Error]:', err.message || err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
    });
  }
}