//C:\dev\highrise-pk\lib\property\propertyNormalization.ts
import {
  discoveryGroupForType,
  normalizePropertySubtype,
  normalizePropertyType,
} from '@/lib/property/propertyTaxonomy';

const SERVER_CONTROLLED_KEYS = new Set([
  '_id',
  'owner',
  'agentId',
  'developerId',
  'createdBy',
  'updatedBy',
  'verification',
  'ownershipProof',
  'fraudDetection',
  'qualityMetrics',
  'trustScore',
  'marketIntelligence',
  'auditTrail',
  'status',
  'isVerified',
  'isDeleted',
  'deletedAt',
  'deletedBy',
  'isFlagged',
  'flagReason',
  'flaggedAt',
  'views',
  'favoriteCount',
  'inquiryCount',
  'compareCount',
  'shareCount',
  'ownershipProofUrl',
  'ownershipProofPublicId',
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string | undefined {
  const s = String(value ?? '').trim();
  return s || undefined;
}

function finiteNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function boolValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function compactObject(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function normalizeContact(input: unknown): Record<string, unknown> | undefined {
  const contact = asRecord(input);
  if (Object.keys(contact).length === 0) return undefined;
  const normalized = compactObject({
    personName: stringValue(contact.personName ?? contact.name),
    primaryPhone: stringValue(contact.primaryPhone ?? contact.phone),
    secondaryPhone: stringValue(contact.secondaryPhone),
    whatsappNumber: stringValue(contact.whatsappNumber ?? contact.whatsapp),
    email: stringValue(contact.email)?.toLowerCase(),
    preferredMethod: stringValue(contact.preferredMethod),
    contactTime: stringValue(contact.contactTime),
    showPhoneOnListing: boolValue(contact.showPhoneOnListing),
    allowWhatsappMessages: boolValue(contact.allowWhatsappMessages),
  });
  return Object.keys(normalized).length ? normalized : undefined;
}

function normalizeFloorPlans(input: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out = input.slice(0, 20).map((item, index) => {
    const row = asRecord(item);
    const url = stringValue(row.url ?? row.imageUrl ?? row.pdfUrl);
    const publicId = stringValue(row.publicId ?? row.public_id ?? row.imagePublicId ?? row.pdfPublicId);
    const resourceType = stringValue(row.resourceType);
    const mimeType = stringValue(row.mimeType);
    const pdf = resourceType === 'raw' || mimeType === 'application/pdf' || String(url ?? '').toLowerCase().includes('.pdf');
    return compactObject({
      floorName: stringValue(row.floorName ?? row.name) ?? `Floor Plan ${index + 1}`,
      floorNumber: finiteNumber(row.floorNumber),
      imageUrl: pdf ? undefined : url,
      imagePublicId: pdf ? undefined : publicId,
      pdfUrl: pdf ? url : undefined,
      pdfPublicId: pdf ? publicId : undefined,
      resourceType: resourceType ?? (pdf ? 'raw' : 'image'),
      mimeType,
      description: stringValue(row.description),
    });
  }).filter((row) => row.imageUrl || row.pdfUrl);
  return out.length ? out : undefined;
}

export interface NormalizedPropertyMutation {
  data: Record<string, unknown>;
  changedFields: string[];
}

/**
 * Server-owned normalization for both Unified nested form payloads and older flat clients.
 * It intentionally strips trust/publication/actor/private-evidence state supplied by the browser.
 */
export function normalizePropertyMutationInput(input: unknown): NormalizedPropertyMutation {
  const source = asRecord(input);
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (!SERVER_CONTROLLED_KEYS.has(key)) data[key] = value;
  }

  const type = normalizePropertyType(source.propertyType ?? data.propertyType);
  if (type) data.propertyType = type;
  const subtype = normalizePropertySubtype(type, source.propertySubtype ?? source.subType ?? data.propertySubtype);
  if (subtype) data.propertySubtype = subtype;
  else delete data.propertySubtype;

  const group = discoveryGroupForType(type);
  // The persistent model currently stores residential/commercial only.
  // Plots are represented by propertyType=plot while category stays residential/commercial compatible.
  if (group === 'commercial') data.propertyCategory = 'commercial';
  else if (group) data.propertyCategory = 'residential';

  const location = asRecord(source.location);
  if (Object.keys(location).length) {
    data.province = stringValue(location.province ?? source.province);
    data.city = stringValue(location.city ?? source.city);
    data.locality = stringValue(location.area ?? location.locality ?? location.sector ?? source.locality);
    data.society = stringValue(location.societyName ?? location.society ?? source.society ?? source.customSociety);
    data.phase = stringValue(location.phase ?? source.phase);
    data.block = stringValue(location.block ?? source.block);
    data.streetNumber = stringValue(location.street ?? location.streetNumber ?? source.streetNumber);
    data.completeAddress = stringValue(location.address ?? location.completeAddress ?? source.completeAddress);
    data.nearbyLandmark = stringValue(
      Array.isArray(location.nearbyLandmarks)
        ? location.nearbyLandmarks.filter(Boolean).join(', ')
        : location.nearbyLandmark ?? source.nearbyLandmark,
    );
    const coordinates = asRecord(location.coordinates);
    const lat = finiteNumber(coordinates.lat ?? source.latitude ?? asRecord(source.coordinates).lat);
    const lng = finiteNumber(coordinates.lng ?? source.longitude ?? asRecord(source.coordinates).lng);
    if (lat !== undefined && lng !== undefined) data.coordinates = { lat, lng };
  }

  const area = asRecord(source.area);
  if (Object.keys(area).length) {
    const size = finiteNumber(area.size);
    const unit = stringValue(area.unit ?? area.sizeUnit);
    if (size !== undefined) data.area = size;
    if (unit) data.unit = unit;
    const coveredArea = finiteNumber(area.coveredArea);
    if (coveredArea !== undefined) data.coveredArea = coveredArea;
    const coveredAreaUnit = stringValue(area.coveredAreaUnit);
    if (coveredAreaUnit) data.coveredAreaUnit = coveredAreaUnit;
    const plotWidth = finiteNumber(area.plotWidth);
    const plotDepth = finiteNumber(area.plotLength ?? area.plotDepth);
    if (plotWidth !== undefined) data.plotWidth = plotWidth;
    if (plotDepth !== undefined) data.plotDepth = plotDepth;
  }

  const listingType = stringValue(source.listingType);
  if (listingType) data.listingType = listingType;

  let price = finiteNumber(source.price);
  if (price === undefined && listingType === 'rent') {
    price = finiteNumber(asRecord(source.rentalDetails).monthlyRent);
  }
  if (price === undefined && listingType === 'installment') {
    price = finiteNumber(asRecord(source.installmentPlan).totalPrice);
  }
  if (price !== undefined) data.price = price;

  const contact = normalizeContact(source.contactDetails);
  if (contact) data.contactDetails = contact;

  const floorPlans = normalizeFloorPlans(source.floorPlanImages ?? source.floorPlans);
  if (floorPlans) data.floorPlans = floorPlans;

  if (Array.isArray(source.images)) data.images = source.images;
  if (Array.isArray(source.gallery)) data.gallery = source.gallery;

  // Keep category-specific details deliberately flexible, but do not let it smuggle protected state.
  if (source.details && typeof source.details === 'object' && !Array.isArray(source.details)) {
    data.details = source.details;
  }

  // Strip undefined values generated by normalization.
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) delete data[key];
  }

  return { data, changedFields: Object.keys(data) };
}

export function hasUsablePropertyLocation(input: Record<string, unknown>): boolean {
  return Boolean(
    stringValue(input.society) ||
    stringValue(input.locality) ||
    stringValue(input.completeAddress),
  );
}
