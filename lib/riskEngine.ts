// lib/riskEngine.ts
import mongoose from "mongoose";
import Property from "@/models/Property";
import Report from "@/models/Report";

/**
 * Risk score is computed (not stored) to keep schema safe + avoid migrations.
 * Score components (rough weights):
 * - Unique IPs (24h) -> strong signal
 * - Total reports -> moderate
 * - Severity weighting -> strong
 * - Developer history -> moderate
 * - Time decay -> reduces old report impact
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskBreakdown = {
  uniqueIpCount24h: number;
  totalReports: number;
  severityWeighted: number;
  developerHistoryFactor: number;
  timeDecayWeighted: number;
};

export type RiskResult = {
  score: number;
  level: RiskLevel;
  breakdown: RiskBreakdown;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

// Severity weights — adjust as your Report Reason enum grows
export function severityWeight(reason: string) {
  const r = String(reason || "").toLowerCase();
  if (r.includes("scam") || r.includes("fraud") || r.includes("fake")) return 3.0;
  if (r.includes("agent") || r.includes("decept") || r.includes("imperson")) return 2.2;
  if (r.includes("spam") || r.includes("duplicate")) return 1.2;
  if (r.includes("other")) return 1.0;
  return 1.0;
}

// Exponential decay by age (half-life ~ 7 days)
export function timeDecayFactor(createdAt: Date, halfLifeDays = 7) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const lambda = Math.log(2) / halfLifeDays;
  const factor = Math.exp(-lambda * ageDays);
  return clamp(factor, 0.05, 1);
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 8) return "CRITICAL";
  if (score >= 5) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

export async function getUniqueIpCount24h(propertyId: string) {
  const pid = toObjectId(propertyId);
  if (!pid) return 0;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await Report.aggregate([
    { $match: { propertyId: pid, createdAt: { $gte: since } } },
    { $group: { _id: "$ipHash" } },
    { $count: "count" },
  ]);

  return rows?.[0]?.count ?? 0;
}

export async function getReportStats(propertyId: string) {
  const pid = toObjectId(propertyId);
  if (!pid) {
    return {
      totalReports: 0,
      severityWeighted: 0,
      timeDecayWeighted: 0,
    };
  }

  // Pull only needed fields for scoring
  const reports = await Report.find({ propertyId: pid })
    .select("reason createdAt")
    .lean();

  const totalReports = reports.length;

  let severityWeighted = 0;
  let timeDecayWeighted = 0;

  for (const rep of reports) {
    const sev = severityWeight((rep as any).reason);
    severityWeighted += sev;
    timeDecayWeighted += sev * timeDecayFactor((rep as any).createdAt);
  }

  return { totalReports, severityWeighted, timeDecayWeighted };
}

/**
 * Developer history factor:
 * - counts flagged/hidden properties in last 30 days (strong)
 * - counts auto-hidden/soft-deleted in last 7 days (future)
 *
 * NOTE: Property schema may store developer as `createdBy` or `userId` or `ownerId`.
 * We try best-effort keys without breaking if your schema differs.
 */
export async function getDeveloperHistoryFactor(developerId: string | null | undefined) {
  const did = developerId ? toObjectId(developerId) : null;
  if (!did) return 0;

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const match: any = {
    createdAt: { $gte: since30 },
    $or: [{ createdBy: did }, { userId: did }, { ownerId: did }, { developerId: did }],
  };

  // Flagged/hidden are moderation indicators (soft-delete already exists separately)
  const flaggedHiddenCount = await Property.countDocuments({
    ...match,
    $or: [
      ...(match.$or || []),
    ],
    $and: [
      {
        $or: [
          { isFlagged: true },
          { status: "hidden" }, // if you have status
          { isHidden: true },   // if you have isHidden
        ],
      },
    ],
  });

  // Normalize into small factor (0..3)
  // 0 -> 0, 1 -> 0.7, 2 -> 1.2, 3 -> 1.6, 4+ -> 2.2
  if (flaggedHiddenCount <= 0) return 0;
  if (flaggedHiddenCount === 1) return 0.7;
  if (flaggedHiddenCount === 2) return 1.2;
  if (flaggedHiddenCount === 3) return 1.6;
  return 2.2;
}

export async function computePropertyRisk(propertyId: string, developerId?: string | null): Promise<RiskResult> {
  const [uniqueIpCount24h, reportStats, developerHistoryFactor] = await Promise.all([
    getUniqueIpCount24h(propertyId),
    getReportStats(propertyId),
    getDeveloperHistoryFactor(developerId),
  ]);

  // Core scoring
  // IPs (24h) -> 0..6
  const ipScore = clamp(uniqueIpCount24h * 1.1, 0, 6);

  // Total reports -> 0..3
  const reportScore = clamp(reportStats.totalReports * 0.35, 0, 3);

  // Severity/time decay -> 0..6 (but decays old reports)
  const severityScore = clamp(reportStats.timeDecayWeighted * 0.9, 0, 6);

  // Developer history -> 0..2.5
  const devScore = clamp(developerHistoryFactor, 0, 2.5);

  // Combined
  const raw = ipScore + reportScore + severityScore + devScore;

  // Keep score compact
  const score = Math.round(raw * 10) / 10;
  const level = riskLevelFromScore(score);

  return {
    score,
    level,
    breakdown: {
      uniqueIpCount24h,
      totalReports: reportStats.totalReports,
      severityWeighted: Math.round(reportStats.severityWeighted * 10) / 10,
      developerHistoryFactor: Math.round(developerHistoryFactor * 10) / 10,
      timeDecayWeighted: Math.round(reportStats.timeDecayWeighted * 10) / 10,
    },
  };
}
