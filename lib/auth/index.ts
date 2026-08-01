//C:\dev\highrise-pk\lib\auth\index.ts
export {
  type Actor,
  isUsableActor,
} from "./actor";

export {
  CAPABILITY_VALUES,
  LEGACY_ROLE_CAPABILITY_MAP,
  capabilityFromLegacyRole,
  isCapability,
  normalizeCapabilities,
  type Capability,
} from "./capabilities";

export {
  CAPABILITY_PERMISSIONS,
  LEGACY_PERMISSION_ALIASES,
  PERMISSION_VALUES,
  ROLE_PERMISSIONS,
  isPermission,
  normalizePermission,
  normalizePermissions,
  type Permission,
} from "./permissions";

export {
  DEFAULT_ROLE,
  LEGACY_MARKETPLACE_ROLE_VALUES,
  ROLE_VALUES,
  STAFF_ROLES,
  isLegacyMarketplaceRole,
  isRole,
  isStaffRole,
  normalizeRole,
  type LegacyMarketplaceRole,
  type Role,
} from "./roles";

export {
  AuthorizationError,
  assertAuthorized,
  authorize,
  getEffectivePermissions,
  hasPermission,
  type AuthorizationDecision,
  type AuthorizationFailureReason,
} from "./authorization";

export {
  applySafeSessionUpdate,
  buildTrustedSessionClaims,
  isPrivilegeEscalationAttempt,
  SAFE_SESSION_UPDATE_FIELDS,
  type SafeSessionUpdateField,
  type SafeSessionUpdatePayload,
  type SafeSessionUpdateResult,
  type SessionRole,
  type TrustedSessionClaimSource,
  type TrustedSessionClaims,
} from "./sessionClaims";
