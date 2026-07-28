// lib/autoProtection.ts
import Property from "@/models/Property";
import Report from "@/models/Report";
import { computePropertyRisk } from "@/lib/riskEngine";

/**
 * Auto protection rules (existing):
 * - 3+ unique IPs (24h) => auto reviewing
 * - 5+ unique IPs (24h) => auto soft delete + flagged
 *
 * Phase 3.5 add-on:
 * - If RiskScore >= 8 => mark as flagged (trust-first) even if thresholds not hit
 *   (does NOT hard delete; preserves soft delete architecture)
 */

export async function applyAutoProtectionForProperty(propertyId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Count unique ipHash for this property in last 24h
  const rows = await Report.aggregate([
    { $match: { propertyId: (Report as any).db.base.Types.ObjectId(propertyId), createdAt: { $gte: since } } },
  ]).catch(async () => {
    // fallback if aggregation ObjectId path fails in some envs
    // we'll do a safer route below
    return null;
  });

  // Safe count unique ipHash (works in all cases)
  const agg = await Report.aggregate([
    { $match: { propertyId: new (require("mongoose").Types.ObjectId)(propertyId), createdAt: { $gte: since } } },
    { $group: { _id: "$ipHash" } },
    { $count: "count" },
  ]);

  const uniqueIpCount24h = agg?.[0]?.count ?? 0;

  const property = await Property.findById(propertyId);
  if (!property) return { uniqueIpCount24h, action: "none" as const };

  // IMPORTANT: never do anything if already soft-deleted (respect prior protections)
  if ((property as any).isDeleted || (property as any).deletedAt) {
    return { uniqueIpCount24h, action: "none" as const };
  }

  // Identify developer id best-effort
  const developerId =
    (property as any).createdBy?.toString?.() ||
    (property as any).userId?.toString?.() ||
    (property as any).ownerId?.toString?.() ||
    (property as any).developerId?.toString?.() ||
    null;

  // Phase 3.5: compute risk
  const risk = await computePropertyRisk(propertyId, developerId);

  // Existing threshold logic
  if (uniqueIpCount24h >= 5) {
    // Auto: soft delete + flag
    (property as any).isFlagged = true;
    (property as any).flagReason = "AUTO: 5+ unique IP reports in 24h";
    (property as any).flaggedAt = new Date();

    // Soft delete fields (existing architecture)
    (property as any).isDeleted = true;
    (property as any).deletedAt = new Date();
    (property as any).deletedReason = "AUTO_FRAUD_THRESHOLD";

    await property.save();
    return { uniqueIpCount24h, risk, action: "auto_soft_delete_flag" as const };
  }

  if (uniqueIpCount24h >= 3) {
    // Auto: mark under review (flag)
    (property as any).isFlagged = true;
    (property as any).flagReason = "AUTO: 3+ unique IP reports in 24h";
    (property as any).flaggedAt = new Date();

    await property.save();
    return { uniqueIpCount24h, risk, action: "auto_flag_review" as const };
  }

  // Phase 3.5: high-risk flag even if IP threshold not met
  if (risk.score >= 8) {
    (property as any).isFlagged = true;
    (property as any).flagReason = "AUTO: RiskScore ≥ 8 (Critical)";
    (property as any).flaggedAt = new Date();
    await property.save();
    return { uniqueIpCount24h, risk, action: "auto_flag_risk_critical" as const };
  }

  return { uniqueIpCount24h, risk, action: "none" as const };
}
