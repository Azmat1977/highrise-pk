//C:\dev\highrise-pk\lib\auth\capabilities.ts
import type { LegacyMarketplaceRole } from "./roles";

export const CAPABILITY_VALUES = [
  "property_owner",
  "real_estate_agent",
  "property_developer",
  "housing_society",
  "material_supplier",
  "construction_contractor",
  "professional_service_provider",
  "skilled_worker",
  "maintenance_service_provider",
  "home_visit_inspector",
] as const;

export type Capability = (typeof CAPABILITY_VALUES)[number];

const CAPABILITY_SET = new Set<string>(CAPABILITY_VALUES);

export function isCapability(value: unknown): value is Capability {
  return typeof value === "string" && CAPABILITY_SET.has(value);
}

export function normalizeCapabilities(value: unknown): Capability[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter(isCapability))];
}

export const LEGACY_ROLE_CAPABILITY_MAP: Readonly<
  Record<LegacyMarketplaceRole, Capability>
> = {
  agent: "real_estate_agent",
  developer: "property_developer",
  society: "housing_society",
};

export function capabilityFromLegacyRole(
  role: LegacyMarketplaceRole,
): Capability {
  return LEGACY_ROLE_CAPABILITY_MAP[role];
}
