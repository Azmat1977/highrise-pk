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

    // Increment impressions atomically
    const result = await HeroBanner.findByIdAndUpdate(
      id,
      { $inc: { impressions: 1 } },
      { new: false } // Don't need to return updated doc
    );

    if (!result) {
      // Banner not found - still return success to not affect UX
      return res.status(200).json({
        success: true,
        message: 'Impression recorded',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Impression recorded',
    });
  } catch (error) {
    console.error('Error recording banner impression:', error);
    
    // Return success anyway to not affect homepage UX
    return res.status(200).json({
      success: true,
      message: 'Impression recorded',
    });
  }
}