//C:\dev\highrise-pk\lib\property\propertyPublicDto.ts
import type { PublicPropertyActor } from '@/lib/property/propertyActor';
import type { PropertyTrustSummary } from '@/lib/property/propertyTrust';

const PRIVATE_KEYS = new Set([
  'owner','createdBy','updatedBy','deletedBy','ownershipProof','fraudDetection','auditTrail',
  'internalNotes','public_id','publicId','signature','assetToken','apiKey','apiSecret','etag','asset_id','assetId',
  'titleDeedEncrypted','authorityLetterEncrypted','cnicCopyEncrypted','titleDeedPublicIdEncrypted',
  'authorityLetterPublicIdEncrypted','cnicCopyPublicIdEncrypted','primaryPhone','secondaryPhone','whatsappNumber','email',
]);

function scrub(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(scrub);
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PRIVATE_KEYS.has(key)) continue;
    out[key] = scrub(child);
  }
  return out;
}

export function toPublicPropertyDto(property: Record<string, unknown>, actor: PublicPropertyActor | null, trust: PropertyTrustSummary): Record<string, unknown> {
  const dto = scrub(property) as Record<string, unknown>;
  // Seller privacy is categorical: public HTML/API receives no direct contact object.
  delete dto.contactDetails;
  delete dto.whatsappNumber;
  delete dto.contactTime;
  dto.listingActor = actor;
  dto.trustSummary = trust;
  return dto;
}
