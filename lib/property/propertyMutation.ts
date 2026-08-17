//C:\dev\highrise-pk\lib\property\propertyMutation.ts
import type { IProperty } from '@/models/Property';

const STRING_FIELDS = [
  'title','description','shortDescription','unit','province','city','locality','society','phase','block',
  'streetNumber','plotNumber','completeAddress','nearbyLandmark','propertyType','propertySubtype','listingType',
  'listingPurpose','propertyCondition','furnished','condition','facing','parking','possessionStatus','ownershipType',
  'whatsappNumber','contactTime','videoUrl','virtualTourUrl','constructionVideoUrl','droneVideoUrl',
] as const;

const NUMBER_FIELDS = [
  'price','area','coveredArea','plotWidth','plotDepth','grossArea','netArea','balconyArea','bedrooms','bathrooms',
  'kitchens','storeRooms','floorNumber','totalFloors','floors','numberOfFloors','constructionYear','renovationYear',
  'pricePerUnit','tokenAmount',
] as const;

const BOOLEAN_FIELDS = [
  'priceNegotiable','isCornerPlot','drawingRoom','diningRoom','livingRoom','servantQuarter','basement','rooftopAccess',
  'porch','isCornerUnit','hasAttachedBath','hasMezzanine','hasWashroom','hasSignage',
] as const;

const OBJECT_FIELDS = [
  'details','booking','downPayment','installmentPlan','possession','ballot','resaleTracking','otherPaymentCharges',
  'parkingDetails','projectDetails','approvals','utilities','infrastructure','extraCharges','possessionCharges',
  'maintenance','governmentTaxes','transferCharges','hiddenChargesDisclosure','legal','rentalDetails','contactDetails',
] as const;

const ARRAY_FIELDS = [
  'amenities','specialFacing','interiorFeatures','exteriorFeatures','buildingAmenities','societyAmenities','securityFeatures',
  'floorPlans',
] as const;

export interface ApplyPropertyMutationResult {
  changedFields: string[];
}

function finiteNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function applyNormalizedPropertyMutation(
  property: IProperty & Record<string, unknown>,
  input: Record<string, unknown>,
  options?: { allowContact?: boolean; allowMedia?: boolean },
): ApplyPropertyMutationResult {
  const changed = new Set<string>();
  const mutable = property as unknown as Record<string, unknown>;

  for (const field of STRING_FIELDS) {
    if (!(field in input)) continue;
    const raw = input[field];
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (String(mutable[field] ?? '') !== value) changed.add(field);
    mutable[field] = value;
  }

  for (const field of NUMBER_FIELDS) {
    if (!(field in input)) continue;
    const value = finiteNumber(input[field]);
    if (value === undefined) continue;
    if (field === 'price' && Number(property.price) !== value) {
      property.previousPrice = property.price;
    }
    if (Number(mutable[field] ?? NaN) !== value) changed.add(field);
    mutable[field] = value;
  }

  for (const field of BOOLEAN_FIELDS) {
    if (!(field in input) || typeof input[field] !== 'boolean') continue;
    const value = input[field] as boolean;
    if (Boolean(mutable[field]) !== value) changed.add(field);
    mutable[field] = value;
  }

  for (const field of OBJECT_FIELDS) {
    if (!(field in input)) continue;
    if (field === 'contactDetails' && !options?.allowContact) continue;
    const value = input[field];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    changed.add(field);
    mutable[field] = value;
  }

  for (const field of ARRAY_FIELDS) {
    if (!(field in input) || !Array.isArray(input[field])) continue;
    changed.add(field);
    (property as unknown as Record<string, unknown>)[field] = input[field];
  }
  if (input.coordinates && typeof input.coordinates === 'object' && !Array.isArray(input.coordinates)) {
    const c = input.coordinates as Record<string, unknown>;
    const lat = finiteNumber(c.lat);
    const lng = finiteNumber(c.lng);
    if (lat !== undefined && lng !== undefined) {
      changed.add('coordinates');
      property.coordinates = { lat, lng };
    }
  }

  if (options?.allowMedia && Array.isArray(input.images)) {
    changed.add('images');
    property.images = input.images as IProperty['images'];
  }
  if (options?.allowMedia && Array.isArray(input.gallery)) {
    changed.add('gallery');
    property.gallery = input.gallery as IProperty['gallery'];
  }

  return { changedFields: [...changed] };
}
