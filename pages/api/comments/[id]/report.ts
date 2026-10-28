// C:\dev\highrise-pk\pages\api\comments\[id]\report.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Comment from '@/models/Comment';
import mongoose from 'mongoose';
import { rateLimitReport, sendRateLimitResponse, getClientIp, hashValue } from '@/lib/rateLimit';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { z } from 'zod';

// ----------------------------------------------------------------------
// 🛡️ 1. SECURITY CONFIGURATION
// ----------------------------------------------------------------------

// ✅ FIX 1: Simplified Zod Enum to fix TS overload error
const reportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'misinformation', 'other']),
});

// ----------------------------------------------------------------------
// 🚀 2. API HANDLER
// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { id } = req.query;

  // Validate ID format
  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ success: false, message: 'Invalid comment ID' });
  }

  try {
    // 🛡️ 1. Rate Limiting (Strict Limit for Reports)
    const rateLimitResult = await rateLimitReport(req);
    if (!rateLimitResult.ok) {
      return sendRateLimitResponse(res, rateLimitResult);
    }

    // 🛡️ 2. Zod Input Validation
    const validation = reportSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid report reason provided' 
      });
    }

    const { reason } = validation.data;

    // 🛡️ 3. Smart User Identification
    const auth = await getOptionalAuth(req);
    let userIdentifier: string;

    if (auth?.id) {
      userIdentifier = auth.id;
    } else {
      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      userIdentifier = `guest_${hashValue(ip + userAgent)}`;
    }

    // 🗄️ 4. Connect to Database
    await dbConnect();
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // ✅ FIX 2: Bypassed TS Type Error by using (comment as any)
    // Ensures reportedBy array exists safely
    const reportedByArray = (comment as any).reportedBy || [];
    
    if (reportedByArray.includes(userIdentifier)) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reported this comment.' 
      });
    }

    // ⚡ 5. Atomic Update (Thread-safe)
    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      {
        $set: { isReported: true },
        $inc: { reportCount: 1 },
        $addToSet: { 
          reportReasons: reason,
          reportedBy: userIdentifier 
        }
      },
      { new: true }
    );

    if (!updatedComment) {
      return res.status(404).json({ success: false, message: 'Comment was removed before updating' });
    }

    // 🛑 6. Auto-Moderation (Hide if 3+ unique users reported it)
    if (updatedComment.reportCount >= 3 && updatedComment.status === 'approved') {
      await Comment.findByIdAndUpdate(id, { $set: { status: 'spam' } });
    }

    // 📤 7. Send Response
    return res.status(200).json({
      success: true,
      message: 'Thank you for reporting. We will review this comment.',
    });

  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: 'Server Error while reporting comment',
    });
  }
}