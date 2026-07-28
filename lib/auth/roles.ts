export const ROLE_VALUES = [
  "user",
  "reader",
  "writer",
  "editor",
  "moderator",
  "finance",
  "admin",
  "superadmin",
] as const;

export type Role = (typeof ROLE_VALUES)[number];

export const DEFAULT_ROLE: Role = "user";

export const LEGACY_MARKETPLACE_ROLE_VALUES = [
  "agent",
  "developer",
  "society",
] as const;

export type LegacyMarketplaceRole =
  (typeof LEGACY_MARKETPLACE_ROLE_VALUES)[number];

const ROLE_SET = new Set<string>(ROLE_VALUES);
const LEGACY_MARKETPLACE_ROLE_SET = new Set<string>(
  LEGACY_MARKETPLACE_ROLE_VALUES,
);

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLE_SET.has(value);
}

export function isLegacyMarketplaceRole(
  value: unknown,
): value is LegacyMarketplaceRole {
  return (
    typeof value === "string" &&
    LEGACY_MARKETPLACE_ROLE_SET.has(value)
  );
}

export function normalizeRole(value: unknown): Role {
  return isRole(value) ? value : DEFAULT_ROLE;
}

export const STAFF_ROLES = [
  "reader",
  "writer",
  "editor",
  "moderator",
  "finance",
  "admin",
  "superadmin",
] as const satisfies readonly Role[];

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.some((staffRole) => staffRole === role);
}
