//C:\dev\highrise-pk\lib\property\propertyLeadAccess.ts
/**
 * Highrise.pk — Property lead dashboard access policy.
 *
 * UI filtering is not authorization. Every dashboard/API read must include the
 * server-authenticated account ID plus the canonical recipient role.
 */

import type { PropertyRecipientRole } from './propertyLeadRecipient';

export interface PropertyLeadViewer {
  id: string;
  role: PropertyRecipientRole | 'admin' | 'superadmin';
  isActive: boolean;
}

export interface PropertyLeadFilter {
  entityType: 'property';
  isArchived?: boolean;
  assignedToUserId?: string;
  assignedToRole?: PropertyRecipientRole;
}

export type PropertyLeadAccessResult =
  | { ok: true; filter: PropertyLeadFilter; privileged: boolean }
  | { ok: false; code: 'INACTIVE_ACCOUNT' | 'UNSUPPORTED_ROLE' };

export function buildPropertyLeadDashboardFilter(
  viewer: PropertyLeadViewer,
  options: { includeArchived?: boolean } = {},
): PropertyLeadAccessResult {
  if (!viewer.isActive) {
    return { ok: false, code: 'INACTIVE_ACCOUNT' };
  }

  const base: PropertyLeadFilter = {
    entityType: 'property',
  };

  if (!options.includeArchived) {
    base.isArchived = false;
  }

  if (viewer.role === 'admin' || viewer.role === 'superadmin') {
    return { ok: true, filter: base, privileged: true };
  }

  if (!['owner', 'agent', 'developer'].includes(viewer.role)) {
    return { ok: false, code: 'UNSUPPORTED_ROLE' };
  }

  return {
    ok: true,
    privileged: false,
    filter: {
      ...base,
      assignedToUserId: viewer.id,
      assignedToRole: viewer.role,
    },
  };
}

export function canOpenPropertyLead(
  viewer: PropertyLeadViewer,
  lead: {
    assignedToUserId?: string | null;
    assignedToRole?: string | null;
    entityType?: string | null;
  },
): boolean {
  if (!viewer.isActive || lead.entityType !== 'property') return false;


  if (viewer.role === 'admin' || viewer.role === 'superadmin') return true;

  return (
    lead.assignedToUserId === viewer.id &&
    lead.assignedToRole === viewer.role
  );
}
