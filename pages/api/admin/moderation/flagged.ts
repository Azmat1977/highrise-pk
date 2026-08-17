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
      isDeleted: { $ne: true },
      $or: [{ isFlagged: true }, { "verification.status": "flagged" }],
    };

    // Only the canonical flagged moderation state is supported. "both" is
    // retained as a harmless UI compatibility value and resolves to flagged.
    if (!["flagged", "both"].includes(String(filter))) {
      return res.status(400).json({ ok: false, error: "Invalid filter" });
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
        const developerId = p.developerId?.toString?.() || null;

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
          reportsTotal: risk.breakdown.activeReports,
        };
      })
    );

    return res.status(200).json({
      ok: true,
      filter: "flagged",
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
