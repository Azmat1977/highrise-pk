//C:\dev\highrise-pk\lib\auth\sessionClaims.ts
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

// ═══════════════════════════════════════════════════════════════
// 🔐 CLIENT-INITIATED SESSION UPDATE ALLOWLIST (Sprint 2 Batch B)
// ═══════════════════════════════════════════════════════════════
//
// PURPOSE:
//   Enforce which session fields a client is allowed to mutate via
//   useSession().update({ ... }).
//
// SECURITY MODEL:
//   → ALLOWLIST ONLY — every allowed field must be explicitly listed
//   → NO PRIVILEGED FIELDS — role, permissions, capabilities, kycVerified,
//     verification flags, tokenVersion, and all other authority-sensitive
//     fields MUST come from the database only
//   → RUNTIME + TYPE-LEVEL ENFORCEMENT — the type system prevents callers
//     from passing privileged fields, and runtime filters ignore any that
//     slip through
//
// TO ADD A NEW SAFE FIELD:
//   1. Confirm the field cannot grant privileges or bypass verification
//   2. Confirm the field is user-owned data (name, picture, preferences)
//   3. Add it to SAFE_SESSION_UPDATE_FIELDS below
//   4. Add it to SafeSessionUpdatePayload type
//   5. Add the copy logic to applySafeSessionUpdate()
//   6. Document the reason in a comment
//
// FIELDS THAT MUST NEVER BE ADDED HERE:
//   role, authorityRole, permissions, capabilities,
//   kycVerified, isVerified, isEmailVerified,
//   isVerifiedOwner, ownerVerificationStatus,
//   isVerifiedAgent, agentVerificationStatus,
//   onboardingStatus, onboardingRole,
//   tokenVersion, isInvalid, id, email
// ═══════════════════════════════════════════════════════════════

export const SAFE_SESSION_UPDATE_FIELDS = [
  "displayName",
  "profilePicture",
] as const;

export type SafeSessionUpdateField =
  (typeof SAFE_SESSION_UPDATE_FIELDS)[number];

/**
 * The ONLY shape a client is allowed to pass to session update.
 * Type system prevents attempting to pass privileged fields.
 */
export interface SafeSessionUpdatePayload {
  displayName?: string;
  profilePicture?: string | null;
}

/**
 * Result of a safe session update filter.
 * - `updates`: fields that were accepted and should be applied
 * - `rejectedFields`: privileged/unknown fields the client tried to mutate
 *   (used for SecurityEvent logging)
 */
export interface SafeSessionUpdateResult {
  updates: SafeSessionUpdatePayload;
  rejectedFields: string[];
}

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

// ═══════════════════════════════════════════════════════════════
// 🔐 SAFE SESSION UPDATE FILTER (Sprint 2 Batch B — GAP-S02 hardening)
// ═══════════════════════════════════════════════════════════════

const SAFE_FIELD_SET = new Set<string>(SAFE_SESSION_UPDATE_FIELDS);

/**
 * Sanitize a raw session update payload from the client.
 *
 * Extracts only fields listed in SAFE_SESSION_UPDATE_FIELDS.
 * Any other field is treated as a privilege escalation attempt
 * and returned in rejectedFields for SecurityEvent logging.
 *
 * This function is the SINGLE authoritative filter for client-initiated
 * session mutations. Never bypass it.
 *
 * @param raw The unvalidated update payload from useSession().update()
 * @returns Sanitized updates + list of rejected field names
 */
export function applySafeSessionUpdate(
  raw: unknown,
): SafeSessionUpdateResult {
  const result: SafeSessionUpdateResult = {
    updates: {},
    rejectedFields: [],
  };

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return result;
  }

  const payload = raw as Record<string, unknown>;

  for (const key of Object.keys(payload)) {
    if (!SAFE_FIELD_SET.has(key)) {
      result.rejectedFields.push(key);
      continue;
    }

    const value = payload[key];

    switch (key as SafeSessionUpdateField) {
      case "displayName": {
        if (typeof value === "string") {
          const trimmed = value.trim().slice(0, 50);
          if (trimmed.length >= 1 && trimmed.length <= 50) {
            result.updates.displayName = trimmed;
          }
        }
        break;
      }

      case "profilePicture": {
        if (value === null) {
          result.updates.profilePicture = null;
        } else if (typeof value === "string") {
          const trimmed = value.trim().slice(0, 2048);
          if (
            trimmed.length === 0 ||
            trimmed.startsWith("https://") ||
            trimmed.startsWith("/")
          ) {
            result.updates.profilePicture = trimmed || null;
          }
        }
        break;
      }
    }
  }

  return result;
}

/**
 * True if the caller attempted to mutate any privileged field.
 * Use this to decide whether to emit a SecurityEvent.
 */
export function isPrivilegeEscalationAttempt(
  result: SafeSessionUpdateResult,
): boolean {
  return result.rejectedFields.length > 0;
}
