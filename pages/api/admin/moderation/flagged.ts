// pages/api/admin/moderation/flagged.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import Property from "@/models/Property";
import { requireAdmin } from "@/lib/requireAdmin";
import { computePropertyRisk } from "@/lib/riskEngine";
import { getCachedRisk, setCachedRisk } from "@/lib/riskCache";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req, res);

    const { filter = "both", page = "1", limit = "20" } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(5, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query: any = {
      // Respect soft delete architecture: show flagged/hidden even if not deleted,
      // but never show deleted unless you intentionally want it in this queue.
      $and: [{ $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }] }],
    };

    if (filter === "flagged") query.isFlagged = true;
    if (filter === "hidden") {
      // if your project uses status or isHidden; we support both
      query.$or = [{ status: "hidden" }, { isHidden: true }];
    }
    if (filter === "both") {
      query.$or = [{ isFlagged: true }, { status: "hidden" }, { isHidden: true }];
    }

    const [total, properties] = await Promise.all([
      Property.countDocuments(query),
      Property.find(query)
        .sort({ flaggedAt: -1, updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    const items = await Promise.all(
      properties.map(async (p: any) => {
        const developerId =
          p.createdBy?.toString?.() ||
          p.userId?.toString?.() ||
          p.ownerId?.toString?.() ||
          p.developerId?.toString?.() ||
          null;

        const cacheKey = `risk:${String(p._id)}:${developerId || "na"}`;
const cached = getCachedRisk<any>(cacheKey);

const risk = cached
  ? cached
  : await computePropertyRisk(String(p._id), developerId);

if (!cached) setCachedRisk(cacheKey, risk, 10 * 60 * 1000);


        return {
          ...p,
          riskScore: risk.score,
          riskLevel: risk.level,
          uniqueIpCount24h: risk.breakdown.uniqueIpCount24h,
          reportsTotal: risk.breakdown.totalReports,
        };
      })
    );

    return res.status(200).json({
      ok: true,
      filter,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      items,
    });
  } catch (err: any) {
    console.error("admin moderation flagged error", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
