import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import HeroBanner from '@/models/HeroBanner';
import { rateLimitApi } from '@/lib/rateLimit';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`,
    });
  }

  // Rate limiting to prevent abuse
  try {
    await rateLimitApi(req);
  } catch {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  }

  const { id } = req.query;

  // Validate ID format
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Banner ID is required',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid banner ID format',
    });
  }

  try {
    await dbConnect();

    // Increment clicks atomically
    const result = await HeroBanner.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } },
      { new: false } // Don't need to return updated doc
    );

    if (!result) {
      // Banner not found - still return success to not leak info
      // and not break user navigation
      return res.status(200).json({
        success: true,
        message: 'Click recorded',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Click recorded',
    });
  } catch {

    // Return success anyway to not block user navigation
    return res.status(200).json({
      success: true,
      message: 'Click recorded',
    });
  }
}