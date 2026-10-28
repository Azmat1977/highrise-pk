// pages/api/owner/dashboard.ts
// GET → owner dashboard stats + recent listings + recent leads

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect            from "@/lib/dbConnect";
import Property             from "@/models/Property";
import OwnerProfile         from "@/models/OwnerProfile";
import { requireAuth }      from "@/lib/requireAuth";
import { rateLimitApi, sendRateLimitResponse }        from "@/lib/rateLimit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    await dbConnect();

    const isAdmin =
      auth.authorityRole === "admin" || auth.role === "admin";

    if (!isAdmin) {
      const verified = await OwnerProfile.findOne({
        userId: auth.id,
        status: "approved",
        isDeleted: { $ne: true },
      })
        .select("_id")
        .lean();

      if (!verified) {
        res.status(403).json({
          error: "Verified owner access required. Please complete owner verification.",
          code:  "OWNER_NOT_VERIFIED",
        });
        return;
      }
    }

    const LISTING_LIMIT = 10;

    // Run all queries in parallel
    const [
      ownerProfile,
      listingStats,
      recentListings,
    ] = await Promise.all([
      // Owner verification status
      OwnerProfile.findOne({ userId: auth.id })
        .select("status fullName")
        .lean<{ status: string; fullName?: string }>(),

      // Listing counts by verification status
      Property.aggregate([
        {
          $match: {
            // Must cast to ObjectId in aggregation pipeline
            owner:     { $eq: new (require('mongoose').Types.ObjectId)(auth.id) },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id:        "$verification.status",
            count:      { $sum: 1 },
            totalViews: { $sum: "$views" },
            totalInquiries: { $sum: "$inquiryCount" },
          },
        },
      ]),

      // Recent 5 listings
      Property.find({ owner: auth.id, isDeleted: false })
        .select([
          "_id", "title", "slug", "price", "area", "unit",
          "city", "society", "propertyType", "listingType",
          "verification", "images", "featureImageUrl",
          "views", "inquiryCount", "createdAt",
        ].join(" "))
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Aggregate listing stats
    type AggResult = { _id: string; count: number; totalViews: number; totalInquiries: number };
    const statsMap = (listingStats as AggResult[]).reduce<Record<string, AggResult>>(
      (acc, item) => ({ ...acc, [item._id ?? "unknown"]: item }),
      {}
    );

    const totalListings    = (listingStats as AggResult[]).reduce((s, i) => s + i.count, 0);
    const totalViews       = (listingStats as AggResult[]).reduce((s, i) => s + i.totalViews, 0);
    const totalInquiries   = (listingStats as AggResult[]).reduce((s, i) => s + i.totalInquiries, 0);

    res.status(200).json({
      success: true,
      owner: {
        status:       ownerProfile?.status       ?? "pending",
        fullName:     ownerProfile?.fullName,
      },
      stats: {
        totalListings,
        listingLimit:   LISTING_LIMIT,
        listingsUsed:   totalListings,
        listingsRemaining: Math.max(0, LISTING_LIMIT - totalListings),
        totalViews,
        totalInquiries,
        byStatus: {
          draft:        statsMap["draft"]?.count        ?? 0,
          pending:      statsMap["pending"]?.count      ?? 0,
          under_review: statsMap["under_review"]?.count ?? 0,
          verified:     statsMap["verified"]?.count     ?? 0,
          rejected:     statsMap["rejected"]?.count     ?? 0,
        },
      },
      recentListings,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: "Internal server error" });
  }
}