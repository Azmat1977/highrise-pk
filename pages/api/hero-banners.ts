import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import HeroBanner from "@/models/HeroBanner";
import { rateLimitApi } from "@/lib/rateLimit";

const MAX_TIME_MS = 5000;
const MAX_BANNERS = 10;

function setSecurityHeaders(res: NextApiResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setSecurityHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const rl = await rateLimitApi(req);
    if (!rl.ok) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again shortly.",
        code: "RATE_LIMITED",
      });
    }

    await dbConnect();

    const now = new Date();

    const banners = await HeroBanner.find({
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: null },
            { startDate: { $exists: false } },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: null },
            { endDate: { $exists: false } },
            { endDate: { $gte: now } },
          ],
        },
      ],
    })
      .select("title subtitle imageUrl mobileImageUrl ctaText ctaLink sponsorName isPaidPromotion displayOrder")
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(MAX_BANNERS)
      .lean()
      .maxTimeMS(MAX_TIME_MS);

    return res.status(200).json({
      success: true,
      banners,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load hero banners",
      code: "SERVER_ERROR",
    });
  }
}
