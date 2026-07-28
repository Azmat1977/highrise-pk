import type { Actor } from "./actor";
import { isUsableActor } from "./actor";
import {
  CAPABILITY_PERMISSIONS,
  ROLE_PERMISSIONS,
  type Permission,
} from "./permissions";

export type AuthorizationFailureReason =
  | "unauthenticated"
  | "inactive_account"
  | "permission_denied";

export type AuthorizationDecision =
  | {
      allowed: true;
      permission: Permission;
    }
  | {
      allowed: false;
      permission: Permission;
      reason: AuthorizationFailureReason;
    };

export class AuthorizationError extends Error {
  readonly code: "UNAUTHENTICATED" | "FORBIDDEN";
  readonly statusCode: 401 | 403;
  readonly permission: Permission;

  constructor(
    code: "UNAUTHENTICATED" | "FORBIDDEN",
    permission: Permission,
  ) {
    super(
      code === "UNAUTHENTICATED"
        ? "Authentication is required."
        : "You do not have permission to perform this action.",
    );

    this.name = "AuthorizationError";
    this.code = code;
    this.statusCode = code === "UNAUTHENTICATED" ? 401 : 403;
    this.permission = permission;
  }
}

export function getEffectivePermissions(
  actor: Actor,
): ReadonlySet<Permission> {
  const permissions = new Set<Permission>();

  for (const permission of ROLE_PERMISSIONS[actor.role]) {
    permissions.add(permission);
  }

  for (const capability of actor.capabilities) {
    for (const permission of CAPABILITY_PERMISSIONS[capability]) {
      permissions.add(permission);
    }
  }

  for (const permission of actor.directPermissions) {
    permissions.add(permission);
  }

  return permissions;
}

export function hasPermission(
  actor: Actor | null | undefined,
  permission: Permission,
): boolean {
  if (!isUsableActor(actor)) {
    return false;
  }

  if (actor.role === "superadmin") {
    return true;
  }

  return getEffectivePermissions(actor).has(permission);
}

export function authorize(
  actor: Actor | null | undefined,
  permission: Permission,
): AuthorizationDecision {
  if (!actor) {
    return {
      allowed: false,
      permission,
      reason: "unauthenticated",
    };
  }

  if (!isUsableActor(actor)) {
    return {
      allowed: false,
      permission,
      reason: "inactive_account",
    };
  }

  if (!hasPermission(actor, permission)) {
    return {
      allowed: false,
      permission,
      reason: "permission_denied",
    };
  }

  return {
    allowed: true,
    permission,
  };
}

export function assertAuthorized(
  actor: Actor | null | undefined,
  permission: Permission,
): asserts actor is Actor {
  const decision = authorize(actor, permission);

  if (decision.allowed) {
    return;
  }

  if (decision.reason === "unauthenticated") {
    throw new AuthorizationError("UNAUTHENTICATED", permission);
  }

  throw new AuthorizationError("FORBIDDEN", permission);
}
