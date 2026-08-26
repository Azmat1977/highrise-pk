// C:\dev\highrise-pk\pages\api\compare\clear.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getOptionalAuth } from '@/lib/optionalAuth';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import mongoose from 'mongoose';
import { rateLimitApiWrite, sendRateLimitResponse } from '@/lib/rateLimit';
import { z } from 'zod';

// ----------------------------------------------------------------------
// 🛡️ 1. SECURITY & VALIDATION SCHEMA
// ----------------------------------------------------------------------

const clearCompareSchema = z.object({
  sessionId: z.string().max(100, "Session ID too long").optional().nullable(),
});

// ----------------------------------------------------------------------
// 🚀 2. API HANDLER
// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🛡️ 1. Apply Rate Limiting (Prevent API Abuse)
    const rateLimitResult = await rateLimitApiWrite(req);
    if (!rateLimitResult.ok) {
      return sendRateLimitResponse(res, rateLimitResult);
    }

    // 🛡️ 2. Smart Payload Extraction (Supports both req.body and req.query)
    const payload = {
      sessionId: req.body?.sessionId || req.query?.sessionId,
    };

    // 🛡️ 3. Zod Input Validation
    const validation = clearCompareSchema.safeParse(payload);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0].message,
      });
    }

    const { sessionId } = validation.data;

    // 🗄️ 4. Connect to Database
    await dbConnect();

    // ─────────────────────────────────────────────────────────────
    // 5. Identify User (Auth vs Guest) — canonical guard
    // ─────────────────────────────────────────────────────────────
    const auth = await getOptionalAuth(req);
    const userId = auth?.id;
    if (!userId && !sessionId) {
      return res.status(200).json({
        success: true,
        message: 'No active session to clear',
      });
    }

    // Build Query
    const query = userId 
      ? { userId: new mongoose.Types.ObjectId(userId) } 
      : { sessionId };

    // ─────────────────────────────────────────────────────────────
    // ⚡ 6. Atomic Database Update (1-Step Fast Execution)
    // ─────────────────────────────────────────────────────────────
    // Clear ALL matching comparison docs (multi-doc ghost fix)
    const result = await Comparison.updateMany(
      query,
      { $set: { properties: [], items: [] } },
    );

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private',
    );
    res.setHeader('Pragma', 'no-cache');

    if (!result.matchedCount) {
      return res.status(200).json({
        success: true,
        message: 'No comparison to clear',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Comparison cleared successfully',
    });

  } catch {
    return res.status(500).json({
      success: false,
      error: 'Server error while clearing comparison',
    });
  }
}
