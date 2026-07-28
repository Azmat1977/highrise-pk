import {
  PERMISSION_VALUES,
  ROLE_PERMISSIONS,
  capabilityFromLegacyRole,
  getEffectivePermissions,
  hasPermission as hasCanonicalPermission,
  isLegacyMarketplaceRole,
  normalizeCapabilities,
  normalizePermission,
  normalizePermissions,
  normalizeRole,
  type Actor,
  type Permission as CanonicalPermission,
} from "@/lib/auth";

export type Permission = CanonicalPermission;

export interface UserLike {
  id?: string;
  _id?: string | { toString(): string };
  role?: string;
  authorityRole?: string;
  capabilities?: unknown[] | null;
  permissions?: unknown[] | null;
  actor?: Actor | null;
  tokenVersion?: number;
  status?: string;
  isDeleted?: boolean;
}

export interface ResourceLike {
  user?: string | { id?: string; _id?: string | { toString(): string } };
  developer?: string | { id?: string; _id?: string | { toString(): string } };
  agent?: string | { id?: string; _id?: string | { toString(): string } };
  createdBy?: string | { id?: string; _id?: string | { toString(): string } };
}

function getIdentifier(
  value: string | { toString(): string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  const identifier = value.toString();
  return identifier && identifier !== "[object Object]"
    ? identifier
    : null;
}

function toActor(
  user: UserLike | null | undefined,
): Actor | null {
  if (!user) {
    return null;
  }

  if (user.actor) {
    return user.actor;
  }

  const id = getIdentifier(user.id ?? user._id);

  if (!id) {
    return null;
  }

  const capabilities = normalizeCapabilities(user.capabilities);

  if (isLegacyMarketplaceRole(user.role)) {
    capabilities.push(capabilityFromLegacyRole(user.role));
  }

  return {
    id,
    role: normalizeRole(user.authorityRole ?? user.role),
    capabilities: [...new Set(capabilities)],
    directPermissions: normalizePermissions(user.permissions),
    tokenVersion:
      typeof user.tokenVersion === "number"
        ? user.tokenVersion
        : 0,
    isActive:
      user.isDeleted !== true &&
      (user.status === undefined || user.status === "active"),
  };
}

export function hasPermission(
  user: UserLike | null | undefined,
  permission: string,
): boolean {
  const canonicalPermission = normalizePermission(permission);

  if (!canonicalPermission) {
    return false;
  }

  return hasCanonicalPermission(toActor(user), canonicalPermission);
}

export const checkPermission = hasPermission;

export function hasAllPermissions(
  user: UserLike | null | undefined,
  permissions: readonly string[],
): boolean {
  return permissions.every((permission) =>
    hasPermission(user, permission),
  );
}

export function hasAnyPermission(
  user: UserLike | null | undefined,
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) =>
    hasPermission(user, permission),
  );
}

export function getUserPermissions(
  user: UserLike | null | undefined,
): CanonicalPermission[] {
  const actor = toActor(user);

  if (!actor) {
    return [];
  }

  if (actor.role === "superadmin") {
    return [...PERMISSION_VALUES];
  }

  return [...getEffectivePermissions(actor)];
}

function getResourceId(
  field:
    | string
    | {
        id?: string;
        _id?: string | { toString(): string };
      }
    | null
    | undefined,
): string | null {
  if (!field) {
    return null;
  }

  if (typeof field === "string") {
    return field;
  }

  return getIdentifier(field.id ?? field._id);
}

export function canManageResource(
  user: UserLike | null | undefined,
  resource: ResourceLike | null | undefined,
  adminPermission: string = "property_edit",
): boolean {
  if (!user || !resource) {
    return false;
  }

  if (hasPermission(user, adminPermission)) {
    return true;
  }

  const userId = getIdentifier(user.id ?? user._id);

  if (!userId) {
    return false;
  }

  const ownerId =
    getResourceId(resource.user) ??
    getResourceId(resource.developer) ??
    getResourceId(resource.agent) ??
    getResourceId(resource.createdBy);

  return ownerId === userId;
}

export const rolePermissions = ROLE_PERMISSIONS;
