import { computePropertyRisk, type RiskResult } from "@/lib/riskEngine";

export type PropertyProtectionAction = "none" | "queue_review" | "urgent_review";

export type PropertyProtectionAssessment = {
  action: PropertyProtectionAction;
  risk: RiskResult;
  uniqueIpCount24h: number;
  independentReporterCount24h: number;
};

/**
 * Assessment only. This function intentionally does NOT import or mutate the
 * Property model. Reports and risk scores are moderation signals, not a verdict.
 */
export async function assessPropertyRisk(
  propertyId: string,
  developerId?: string | null,
): Promise<PropertyProtectionAssessment> {
  const risk = await computePropertyRisk(propertyId, developerId);

  let action: PropertyProtectionAction = "none";
  if (risk.level === "CRITICAL") action = "urgent_review";
  else if (risk.level === "HIGH" || risk.breakdown.independentReporterCount24h >= 3) {
    action = "queue_review";
  }

  return {
    action,
    risk,
    uniqueIpCount24h: risk.breakdown.uniqueIpCount24h,
    independentReporterCount24h: risk.breakdown.independentReporterCount24h,
  };
}

// Compatibility name for existing callers. Semantics are now assessment-only.
export const applyAutoProtectionForProperty = assessPropertyRisk;
