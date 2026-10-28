import mongoose from "mongoose";
import Property from "@/models/Property";
import Report from "@/models/Report";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskBreakdown = {
  independentReporterCount24h: number;
  uniqueIpCount24h: number;
  activeReports: number;
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
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : null;
}

export function severityWeight(reason: string) {
  const r = String(reason || "").toLowerCase();
  if (r.includes("scam") || r.includes("fraud") || r.includes("fake")) return 3;
  if (r.includes("agent") || r.includes("imperson")) return 2.2;
  if (r.includes("wrong_location") || r.includes("incorrect_price")) return 1.5;
  if (r.includes("spam") || r.includes("duplicate")) return 1.2;
  return 1;
}

export function timeDecayFactor(createdAt: Date, halfLifeDays = 7) {
  const ageMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const ageDays = ageMs / 86_400_000;
  const lambda = Math.log(2) / halfLifeDays;
  return clamp(Math.exp(-lambda * ageDays), 0.05, 1);
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 8) return "CRITICAL";
  if (score >= 5) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

/**
 * Independent reporter signals are stronger than network/IP diversity.
 * Authenticated reporters are grouped by reporterUserId. Anonymous reports
 * use ipHash only as a weak anti-abuse approximation. Rejected reports never
 * contribute to active risk.
 */
export async function getIndependentReporterStats24h(propertyId: string) {
  const pid = toObjectId(propertyId);
  if (!pid) return { independentReporterCount24h: 0, uniqueIpCount24h: 0 };

  const since = new Date(Date.now() - 86_400_000);
  const reports = await Report.find({
    entityType: "property",
    entityId: pid,
    status: { $ne: "rejected" },
    createdAt: { $gte: since },
  })
    .select("reporterUserId ipHash")
    .lean();

  const reporters = new Set<string>();
  const ips = new Set<string>();

  for (const report of reports) {
    const userId = report.reporterUserId?.toString?.();
    const ipHash = typeof report.ipHash === "string" ? report.ipHash : "";
    if (userId) reporters.add(`u:${userId}`);
    else if (ipHash) reporters.add(`n:${ipHash}`);
    if (ipHash) ips.add(ipHash);
  }

  return {
    independentReporterCount24h: reporters.size,
    uniqueIpCount24h: ips.size,
  };
}

export async function getReportStats(propertyId: string) {
  const pid = toObjectId(propertyId);
  if (!pid) return { activeReports: 0, severityWeighted: 0, timeDecayWeighted: 0 };

  const reports = await Report.find({
    entityType: "property",
    entityId: pid,
    status: { $ne: "rejected" },
  })
    .select("reason createdAt")
    .lean();

  let severityWeighted = 0;
  let timeDecayWeighted = 0;
  for (const report of reports) {
    const weight = severityWeight(String(report.reason || ""));
    severityWeighted += weight;
    timeDecayWeighted += weight * timeDecayFactor(report.createdAt as Date);
  }

  return {
    activeReports: reports.length,
    severityWeighted,
    timeDecayWeighted,
  };
}

/**
 * Developer history is contextual only and is based solely on a real
 * developerId relationship. Owner/creator IDs are never relabelled as a
 * developer. Historical hidden/isHidden fields are intentionally ignored.
 */
export async function getDeveloperHistoryFactor(developerId?: string | null) {
  const did = developerId ? toObjectId(developerId) : null;
  if (!did) return 0;

  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const count = await Property.countDocuments({
    developerId: did,
    createdAt: { $gte: since30 },
    $or: [
      { isFlagged: true },
      { "verification.status": "flagged" },
      { "verification.status": "rejected" },
    ],
  });

  if (count <= 0) return 0;
  if (count === 1) return 0.5;
  if (count === 2) return 0.9;
  if (count === 3) return 1.2;
  return 1.6;
}

export async function computePropertyRisk(
  propertyId: string,
  developerId?: string | null,
): Promise<RiskResult> {
  const [reporterStats, reportStats, developerHistoryFactor] = await Promise.all([
    getIndependentReporterStats24h(propertyId),
    getReportStats(propertyId),
    getDeveloperHistoryFactor(developerId),
  ]);

  // Independent reporters are the main triage signal; IP diversity is weak
  // context only. Scores prioritize human review and never mutate a Property.
  const reporterScore = clamp(reporterStats.independentReporterCount24h * 1.25, 0, 5);
  const ipContextScore = clamp(reporterStats.uniqueIpCount24h * 0.2, 0, 1);
  const reportVolumeScore = clamp(reportStats.activeReports * 0.25, 0, 2);
  const severityScore = clamp(reportStats.timeDecayWeighted * 0.65, 0, 5);
  const devScore = clamp(developerHistoryFactor, 0, 1.6);

  const score = Math.round(
    (reporterScore + ipContextScore + reportVolumeScore + severityScore + devScore) * 10,
  ) / 10;

  return {
    score,
    level: riskLevelFromScore(score),
    breakdown: {
      independentReporterCount24h: reporterStats.independentReporterCount24h,
      uniqueIpCount24h: reporterStats.uniqueIpCount24h,
      activeReports: reportStats.activeReports,
      severityWeighted: Math.round(reportStats.severityWeighted * 10) / 10,
      developerHistoryFactor: Math.round(developerHistoryFactor * 10) / 10,
      timeDecayWeighted: Math.round(reportStats.timeDecayWeighted * 10) / 10,
    },
  };
}
