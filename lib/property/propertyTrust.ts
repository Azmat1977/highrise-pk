// FILE: lib/property/propertyTrust.ts
// COMPLETE FILE REPLACEMENT

export interface PropertyTrustSummary {
  listingVerified: boolean;
  sellerVerified: boolean;
  ownershipEvidenceReviewed: boolean;
  nocStatus?: string;
  lastReviewedAt?: string;
  disclaimer: string;
}

function safeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function safeDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function buildPropertyTrustSummary(
  property: Record<string, unknown>,
  sellerVerified = false,
): PropertyTrustSummary {
  const verification = property.verification instanceof Object
    ? (property.verification as Record<string, unknown>)
    : {};

  const ownershipProof = property.ownershipProof instanceof Object
    ? (property.ownershipProof as Record<string, unknown>)
    : {};

  const approvals = property.approvals instanceof Object
    ? (property.approvals as Record<string, unknown>)
    : {};

  const ownershipEvidenceReviewed =
    ownershipProof.reviewStatus === 'verified' ||
    ownershipProof.verifiedByAdmin === true;

  return {
    listingVerified: verification.status === 'verified',
    sellerVerified,
    ownershipEvidenceReviewed,
    nocStatus: safeString(approvals.nocStatus),
    lastReviewedAt: safeDate(verification.lastReviewedAt),
    disclaimer:
      'Highrise verification records the checks completed by the platform; ' +
      'it is not a legal guarantee of title or authority approval.',
  };
}