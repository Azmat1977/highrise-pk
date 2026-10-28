// pages/api/admin/moderation/developer-heat.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Property from "@/models/Property";
import { requireAdmin } from "@/lib/requireAdmin";
import { computePropertyRisk } from "@/lib/riskEngine";
import { getCachedHeat, setCachedHeat } from "@/lib/riskCache";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req, res);

    // ✅ Cache first (15 min)
    const heatKey = "developerHeat:30d";
    const cachedHeat = getCachedHeat<any[]>(heatKey);
    if (cachedHeat) {
      return res.status(200).json({
        ok: true,
        sinceDays: 30,
        results: cachedHeat,
        cached: true,
      });
    }

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ✅ Recent non-deleted properties
    const properties = await Property.find({
      createdAt: { $gte: since30 },
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    })
      .select("_id developerId isFlagged verification.status")
      .lean();

    // Group by developer
    const buckets = new Map<
      string,
      { developerId: string; propertyIds: string[]; flaggedOrHiddenCount: number }
    >();

    for (const p of properties as any[]) {
      const developerId = p.developerId?.toString?.();

      if (!developerId) continue;

      if (!buckets.has(developerId)) {
        buckets.set(developerId, {
          developerId,
          propertyIds: [],
          flaggedOrHiddenCount: 0,
        });
      }

      const b = buckets.get(developerId)!;
      b.propertyIds.push(String(p._id));

      const flagged = p.isFlagged === true || p.verification?.status === "flagged";
      if (flagged) b.flaggedOrHiddenCount += 1;
    }

    const results: any[] = [];

    for (const b of buckets.values()) {
      // Performance safety: cap per developer scoring
      const sample = b.propertyIds.slice(0, 30);

      const risks = await Promise.all(
        sample.map((pid) => computePropertyRisk(pid, b.developerId).catch(() => null))
      );

      const valid = risks.filter(Boolean) as any[];

      const avgRisk = valid.length
        ? valid.reduce((sum, r) => sum + Number(r.score || 0), 0) / valid.length
        : 0;

      const maxRisk = valid.length ? Math.max(...valid.map((r) => Number(r.score || 0))) : 0;

      results.push({
        developerId: b.developerId,
        properties30d: b.propertyIds.length,
        flaggedOrHidden30d: b.flaggedOrHiddenCount,
        avgRisk: Math.round(avgRisk * 10) / 10,
        maxRisk: Math.round(maxRisk * 10) / 10,
        // ✅ Future rule (admin review): threshold indicator only
        suggestedReviewPriority: b.flaggedOrHiddenCount >= 3 ? "high" : "normal",
      });
    }

    // Worst first
    results.sort(
      (a, b) => b.avgRisk - a.avgRisk || b.flaggedOrHidden30d - a.flaggedOrHidden30d
    );

    // ✅ Save cache
    setCachedHeat(heatKey, results, 15 * 60 * 1000);

    return res.status(200).json({
      ok: true,
      sinceDays: 30,
      results,
      cached: false,
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
