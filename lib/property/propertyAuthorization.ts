// FILE: lib/property/propertyAuthorization.ts
// COMPLETE REPLACEMENT

/**
 * Canonical resource-level authorization helpers for Property mutations.
 *
 * These are PURE helpers — no HTTP, no DB access, no session calls.
 *
 * ARCHITECTURE:
 *   API routes authenticate via guardAuth() / guardOwnershipOrPermission()
 *   from lib/auth/guards.ts first. They then pass token.actor or token
 *   into these helpers for resource-level checks.
 *
 *   ALL field names match lib/auth/actor.ts exactly:
 *     actor.id        (not actor.userId)
 *     actor.isActive  (not actor.active)
 *
 *   ALL permission checks use assertAuthorized() from lib/auth/authorization.ts
 *   which routes through our canonical ROLE_PERMISSIONS map.
 *
 *   superadmin is handled automatically by hasPermission() — no special
 *   casing needed here.
 */

import type { Actor } from "@/lib/auth/actor";
import { isUsableActor } from "@/lib/auth/actor";
import { assertAuthorized, hasPermission } from "@/lib/auth/authorization";
import type { Permission } from "@/lib/auth/permissions";

// ─── Resource Reference ───────────────────────────────────────

/**
 * Minimal property reference needed for ownership/authorization checks.
 * Pass DB-current values — never trust client-supplied IDs.
 */
export interface PropertyResourceRef {
  ownerId?: string | null;
  agentUserId?: string | null;
  developerUserId?: string | null;
}

// ─── Action → Permission Mapping ─────────────────────────────

/**
 * Property actions mapped to canonical Permission values.
 *
 * Ownership actions ('edit', 'submit', 'trash', 'restore', 'read_private')
 * are allowed for property owners WITHOUT requiring a permission.
 * The permission is used as the ADMIN/MODERATOR fallback path.
 *
 * Privileged actions ('moderate', 'purge') require the permission
 * explicitly — ownership alone is NOT sufficient.
 */
export type PropertyResourceAction =
  | "read_private"
  | "edit"
  | "submit"
  | "trash"
  | "restore"
  | "moderate"
  | "purge";

/**
 * Maps each action to the Permission an admin/moderator needs.
 * Owners bypass this map for non-privileged actions.
 */
const ACTION_PERMISSION: Record<PropertyResourceAction, Permission> = {
  read_private: "property_view_list",
  edit:         "property_edit",
  submit:       "property_create",
  trash:        "property_delete",
  restore:      "property_approve",
  moderate:     "property_approve",
  purge:        "property_permanent_delete",
};

/**
 * Actions that require explicit admin permission regardless of ownership.
 * An owner CANNOT moderate or purge their own property.
 */
const PRIVILEGED_ACTIONS = new Set<PropertyResourceAction>([
  "moderate",
  "purge",
]);

// ─── Pure Helper Functions ────────────────────────────────────

/**
 * Returns true if the actor has admin-level property authority.
 * Uses our canonical hasPermission() — superadmin always returns true.
 */
export function isPrivilegedPropertyAdmin(
  actor: Actor | null | undefined,
): boolean {
  if (!isUsableActor(actor)) return false;
  return hasPermission(actor, "property_approve");
}

/**
 * Returns true if the actor is the verified owner of this property.
 * Compares actor.id (canonical) against DB-current property.ownerId.
 */
export function isPropertyOwnerActor(
  actor: Actor | null | undefined,
  property: PropertyResourceRef | null | undefined,
): boolean {
  if (!isUsableActor(actor)) return false;
  if (!property?.ownerId) return false;
  return property.ownerId === actor.id;  // actor.id — canonical field
}

/**
 * Returns true if the actor can perform the action on this property.
 *
 * Logic:
 *   1. Privileged actions (moderate/purge) → admin permission required
 *   2. All other actions → owner OR admin with matching permission
 */
export function canManagePropertyResource(
  actor: Actor | null | undefined,
  property: PropertyResourceRef | null | undefined,
  action: PropertyResourceAction,
): boolean {
  if (!isUsableActor(actor) || !property) return false;

  const requiredPermission = ACTION_PERMISSION[action];

  // Privileged actions: admin permission required, ownership is not enough
  if (PRIVILEGED_ACTIONS.has(action)) {
    return hasPermission(actor, requiredPermission);
  }

  // Non-privileged: owner can always act on their own property
  if (isPropertyOwnerActor(actor, property)) return true;

  // Non-owner fallback: must have admin/moderator permission
  return hasPermission(actor, requiredPermission);
}

/**
 * Throws AuthorizationError if the actor cannot perform the action.
 * Use this in server-side service functions after guards have run.
 *
 * @throws AuthorizationError (401 if not usable, 403 if forbidden)
 */
export function assertPropertyResourceAccess(
  actor: Actor | null | undefined,
  property: PropertyResourceRef | null | undefined,
  action: PropertyResourceAction,
): void {
  if (!isUsableActor(actor)) {
    // Use assertAuthorized to throw the canonical AuthorizationError
    assertAuthorized(actor, ACTION_PERMISSION[action]);
    return; // unreachable — assertAuthorized throws
  }

  if (!canManagePropertyResource(actor, property, action)) {
    assertAuthorized(null, ACTION_PERMISSION[action]); // throws FORBIDDEN
  }
}