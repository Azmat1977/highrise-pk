import {
  capabilityFromLegacyRole,
  normalizeCapabilities,
  type Capability,
} from "./capabilities";
import {
  normalizePermissions,
  type Permission,
} from "./permissions";
import {
  isLegacyMarketplaceRole,
  isRole,
  normalizeRole,
  type LegacyMarketplaceRole,
  type Role,
} from "./roles";

export type SessionRole = Role | LegacyMarketplaceRole;

export interface TrustedSessionClaimSource {
  role?: unknown;
  capabilities?: unknown;
  permissions?: unknown;
}

export interface TrustedSessionClaims {
  role: SessionRole;
  authorityRole: Role;
  capabilities: Capability[];
  permissions: Permission[];
}

function normalizeSessionRole(value: unknown): SessionRole {
  if (isRole(value) || isLegacyMarketplaceRole(value)) {
    return value;
  }

  return "user";
}

export function buildTrustedSessionClaims(
  source: TrustedSessionClaimSource,
): TrustedSessionClaims {
  const role = normalizeSessionRole(source.role);
  const capabilities = normalizeCapabilities(source.capabilities);

  if (isLegacyMarketplaceRole(role)) {
    const legacyCapability = capabilityFromLegacyRole(role);

    if (legacyCapability && !capabilities.includes(legacyCapability)) {
      capabilities.push(legacyCapability);
    }
  }

  return {
    role,
    authorityRole: normalizeRole(role),
    capabilities,
    permissions: normalizePermissions(source.permissions),
  };
}
