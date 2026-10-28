/**
 * lib/auth/guards.ts
 *
 * HTTP-layer authorization guards for Highrise.pk API routes.
 *
 * RULES:
 *   → Every protected API route calls one of these guards
 *   → Guards load Actor from DB on every request (no JWT-only trust)
 *   → Deny by default — unknown permission → 403, not pass-through
 *   → All decisions go through assertAuthorized() → ONE code path
 *   → Never trust client-supplied role or permission claims
 *
 * GAP-S01: requirePermission() was a no-op — this file ensures it never is.
 *
 * USAGE:
 *   import { guardPermission, guardAdmin } from "@/lib/auth/guards";
 *
 *   export default async function handler(req, res) {
 *     const actor = await guardPermission(req, res, "property_approve");
 *     if (!actor) return; // response already sent
 *     // ... handler logic
 *   }
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth, requirePermission } from "@/lib/requireAuth";
import type { AuthToken } from "@/lib/requireAuth";
import type { Permission } from "@/lib/auth/permissions";
import type { Capability } from "@/lib/auth/capabilities";
import { assertAuthorized, AuthorizationError } from "@/lib/auth/authorization";
import { normalizePermission } from "@/lib/auth/permissions";

// ─── Re-export core types for convenience ────────────────────

export type { AuthToken };

// ─── Primary Guards ───────────────────────────────────────────

/**
 * Require authentication only.
 * Loads Actor from DB, validates tokenVersion, checks account status.
 * Returns AuthToken or null (response already sent on null).
 */
export async function guardAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthToken | null> {
  return requireAuth(req, res);
}

/**
 * Require a specific permission.
 * Resolves permission string → normalized Permission enum value.
 * Returns 403 for unknown permission strings (deny by default).
 * Returns AuthToken or null (response already sent on null).
 *
 * @example
 *   const token = await guardPermission(req, res, "property_approve");
 *   if (!token) return;
 */
export async function guardPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  permission: Permission | string
): Promise<AuthToken | null> {
  return requirePermission(req, res, permission);
}

/**
 * Require admin or superadmin authority role.
 * Uses authority role (canonical Role) — not the legacy marketplace role.
 */
export async function guardAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) return null;

  if (
    token.authorityRole !== "admin" &&
    token.authorityRole !== "superadmin"
  ) {
    res.status(403).json({
      success: false,
      error: "Admin access required",
      code: "ADMIN_REQUIRED",
    });
    return null;
  }

  return token;
}

/**
 * Require superadmin authority role exclusively.
 */
export async function guardSuperAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) return null;

  if (token.authorityRole !== "superadmin") {
    res.status(403).json({
      success: false,
      error: "Superadmin access required",
      code: "SUPERADMIN_REQUIRED",
    });
    return null;
  }

  return token;
}

// ─── Capability Guards ────────────────────────────────────────

/**
 * Require a specific capability OR admin authority.
 * Admins and superadmins always pass capability checks.
 *
 * @example
 *   const token = await guardCapability(req, res, "property_developer");
 *   if (!token) return;
 */
export async function guardCapability(
  req: NextApiRequest,
  res: NextApiResponse,
  capability: Capability
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) return null;

  const isAdmin =
    token.authorityRole === "admin" || token.authorityRole === "superadmin";

  if (!isAdmin && !token.capabilities.includes(capability)) {
    res.status(403).json({
      success: false,
      error: "You do not have the required capability to perform this action",
      code: "CAPABILITY_REQUIRED",
      required: capability,
    });
    return null;
  }

  return token;
}

/**
 * Require ANY of the listed capabilities OR admin authority.
 *
 * @example
 *   const token = await guardAnyCapability(req, res, [
 *     "real_estate_agent",
 *     "property_developer",
 *   ]);
 */
export async function guardAnyCapability(
  req: NextApiRequest,
  res: NextApiResponse,
  capabilities: readonly Capability[]
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) return null;

  const isAdmin =
    token.authorityRole === "admin" || token.authorityRole === "superadmin";

  const hasAny = capabilities.some((cap) => token.capabilities.includes(cap));

  if (!isAdmin && !hasAny) {
    res.status(403).json({
      success: false,
      error: "You do not have the required capability to perform this action",
      code: "CAPABILITY_REQUIRED",
      required: capabilities,
    });
    return null;
  }

  return token;
}

// ─── Ownership Guards ─────────────────────────────────────────

/**
 * Require ownership of a resource OR admin authority.
 * Admins and superadmins always pass ownership checks.
 *
 * @example
 *   const token = await guardOwnership(req, res, property.ownerId.toString());
 *   if (!token) return;
 */
export async function guardOwnership(
  req: NextApiRequest,
  res: NextApiResponse,
  resourceOwnerId: string
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) return null;

  const isAdmin =
    token.authorityRole === "admin" || token.authorityRole === "superadmin";

  if (!isAdmin && token.id !== resourceOwnerId) {
    res.status(403).json({
      success: false,
      error: "You do not have permission to access this resource",
      code: "NOT_OWNER",
    });
    return null;
  }

  return token;
}

/**
 * Require ownership OR a specific permission.
 * Useful for resources where both the owner and moderators need access.
 *
 * @example
 *   const token = await guardOwnershipOrPermission(
 *     req, res,
 *     property.ownerId.toString(),
 *     "property_edit"
 *   );
 */
export async function guardOwnershipOrPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  resourceOwnerId: string,
  permission: Permission | string
): Promise<AuthToken | null> {
  const token = await requireAuth(req, res);
  if (!token) return null;

  const isOwner = token.id === resourceOwnerId;

  if (isOwner) return token;

  const normalized = normalizePermission(permission);
  if (!normalized) {
    res.status(403).json({
      success: false,
      error: "Permission denied",
      code: "UNKNOWN_PERMISSION",
    });
    return null;
  }

  try {
    assertAuthorized(token.actor, normalized);
    return token;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
      return null;
    }
    throw error;
  }
}

// ─── Combined Guards ──────────────────────────────────────────

/**
 * Require both a capability AND a permission.
 * Use for actions that need both business capability and explicit permission.
 *
 * @example
 *   const token = await guardCapabilityAndPermission(
 *     req, res,
 *     "property_developer",
 *     "project_create"
 *   );
 */
export async function guardCapabilityAndPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  capability: Capability,
  permission: Permission | string
): Promise<AuthToken | null> {
  const token = await guardCapability(req, res, capability);
  if (!token) return null;

  return guardPermission(req, res, permission);
}

// ─── Method Guard ─────────────────────────────────────────────

/**
 * Reject requests with disallowed HTTP methods.
 * Call BEFORE auth guards to avoid wasting DB calls on bad-method requests.
 *
 * @returns true if method is allowed, false if response already sent
 *
 * @example
 *   if (!allowMethods(req, res, ["GET", "POST"])) return;
 *   const token = await guardAuth(req, res);
 */
export function allowMethods(
  req: NextApiRequest,
  res: NextApiResponse,
  methods: readonly string[]
): boolean {
  const method = (req.method || "").toUpperCase();
  const allowed = methods.map((m) => m.toUpperCase());

  if (!allowed.includes(method)) {
    res.setHeader("Allow", allowed.join(", "));
    res.status(405).json({
      success: false,
      error: `Method ${method} is not allowed`,
      code: "METHOD_NOT_ALLOWED",
      allowed,
    });
    return false;
  }

  return true;
}