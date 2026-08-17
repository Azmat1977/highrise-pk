//C:\dev\highrise-pk\lib\property\propertyLifecycle.ts
export type PropertyVerificationStatus =
  | 'draft'
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'flagged';

export const PROPERTY_VERIFICATION_STATUSES: readonly PropertyVerificationStatus[] = [
  'draft',
  'pending',
  'under_review',
  'verified',
  'rejected',
  'flagged',
] as const;

export const PROPERTY_ALLOWED_TRANSITIONS: Readonly<Record<PropertyVerificationStatus, readonly PropertyVerificationStatus[]>> = {
  draft: ['pending'],
  pending: ['draft', 'under_review', 'rejected'],
  under_review: ['verified', 'rejected', 'flagged'],
  verified: ['draft', 'flagged'],
  rejected: ['draft', 'under_review'],
  flagged: ['under_review'],
};

/**
 * Fields that materially change the market/legal representation of a Property.
 * Owner changes to these fields must never silently preserve an old verification decision.
 */
export const PROPERTY_MATERIAL_EDIT_FIELDS = new Set<string>([
  'title',
  'description',
  'listingType',
  'listingPurpose',
  'propertyCategory',
  'propertyType',
  'propertySubtype',
  'price',
  'area',
  'unit',
  'coveredArea',
  'city',
  'locality',
  'society',
  'phase',
  'block',
  'streetNumber',
  'plotNumber',
  'completeAddress',
  'coordinates',
  'projectId',
  'legal',
  'ownershipType',
  'possessionStatus',
  'ownershipProof',
]);

export function isPropertyVerificationStatus(value: unknown): value is PropertyVerificationStatus {
  return typeof value === 'string' && (PROPERTY_VERIFICATION_STATUSES as readonly string[]).includes(value);
}

export function canTransitionPropertyVerification(
  from: PropertyVerificationStatus,
  to: PropertyVerificationStatus,
): boolean {
  return PROPERTY_ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertPropertyVerificationTransition(
  from: PropertyVerificationStatus,
  to: PropertyVerificationStatus,
): void {
  if (!canTransitionPropertyVerification(from, to)) {
    throw new Error(`Invalid Property verification transition: ${from} -> ${to}`);
  }
}

export function hasMaterialPropertyEdits(changedFields: Iterable<string>): boolean {
  for (const field of changedFields) {
    if (PROPERTY_MATERIAL_EDIT_FIELDS.has(field)) return true;
  }
  return false;
}

/**
 * Canonical owner edit policy.
 *
 * - under_review / flagged: edit locked (review/admin resolution required)
 * - rejected: correcting content returns to draft, then owner explicitly resubmits
 * - verified: material edits return to draft; non-material edits may remain verified
 * - pending: material edits return to draft; minor presentation-only edits can remain pending
 * - draft remains draft
 */
export function ownerEditTargetStatus(
  current: PropertyVerificationStatus,
  changedFields: Iterable<string>,
): PropertyVerificationStatus {
  if (current === 'under_review') {
    throw new Error('Property is under review and cannot be edited by the owner.');
  }
  if (current === 'flagged') {
    throw new Error('Flagged Property must be resolved by moderation before owner edits.');
  }

  const material = hasMaterialPropertyEdits(changedFields);

  if (current === 'verified') return material ? 'draft' : 'verified';
  if (current === 'pending') return material ? 'draft' : 'pending';
  if (current === 'rejected') return 'draft';
  return 'draft';
}

export function ownerCanSubmitProperty(current: PropertyVerificationStatus): boolean {
  return current === 'draft';
}

export function ownerRestoreTargetStatus(current: PropertyVerificationStatus): PropertyVerificationStatus {
  if (current === 'flagged') {
    throw new Error('Flagged Property requires an admin moderation decision before restore.');
  }
  // Restoration must never republish stale verification.
  return 'draft';
}

export function legacyStatusForVerification(status: PropertyVerificationStatus): {
  status: 'pending' | 'approved' | 'rejected' | 'available';
  isVerified: boolean;
  isFlagged: boolean;
} {
  switch (status) {
    case 'verified':
      return { status: 'approved', isVerified: true, isFlagged: false };
    case 'rejected':
      return { status: 'rejected', isVerified: false, isFlagged: false };
    case 'flagged':
      return { status: 'pending', isVerified: false, isFlagged: true };
    default:
      return { status: 'pending', isVerified: false, isFlagged: false };
  }
}
