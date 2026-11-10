//C:\dev\highrise-pk\lib\compareApi.ts
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import Property from '@/models/Property';
import Project from '@/models/Projects';
import Society from '@/models/Society';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';
import { getClientIp } from '@/lib/requireAuth';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

export const MAX_COMPARE_ITEMS = 4;
export const COMPARE_TTL_MS = 24 * 60 * 60 * 1000;

export type CompareEntityType = 'property' | 'project' | 'society';

export type PropertyListingIntent = 'sale' | 'rent' | 'pre_launch';

export interface CompareReference {
  entityType: CompareEntityType;
  entityId: string;
}

export interface ParsedCompareReferences {
  references: CompareReference[];
  invalidCount: number;
  usedLegacyProperties: boolean;
}

export interface CompareRequestContext {
  requestId: string;
  ip: string;
  userAgent?: string;
}

export interface SafeCompareImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface SafeCompareLocation {
  city: string | null;
  area: string | null;
  locality: string | null;
}

export interface SafeCompareProperty {
  _id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  area: string | number | null;
  areaUnit: string | null;
  images: Array<string | SafeCompareImage>;
  propertyType: string | string[] | null;
  slug: string | null;
  bedrooms: string | number | null;
  bathrooms: string | number | null;
  listingType: string | null;
  location: SafeCompareLocation | null;
  previousPrice: number | null;
  priceDropPercent: number | null;
  verification: {
    status: string | null;
  };
  ownershipProof: {
    reviewStatus: string | null;
  };
}

export interface SafeCompareProject {
  _id: string;
  slug: string | null;
  projectName: string | null;
  tagline: string | null;
  city: string | null;
  area: string | null;
  projectCategory: string | null;
  projectNature: string | null;
  projectStatus: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  isVerified: boolean | null;
  isFeatured: boolean | null;
  isTrustedBuilder: boolean | null;
  developerBadge: string | null;
  highriseScore: number | null;
  nocStatus: string | null;
  approvalAuthority: string | null;
  primaryImage: string | null;
  developerName: string | null;
  developerLogoUrl: string | null;
}

export interface SafeCompareSociety {
  _id: string;
  slug: string | null;
  name: string | null;
  city: string | null;
  areaName: string | null;
  category: string | null;
  nocStatus: string | null;
  approvalAuthority: string | null;
  overallRiskLevel: string | null;
  overallScore: number | null;
  featuredImage: string | null;
  isVerifiedByHighrise: boolean | null;
  isFeatured: boolean | null;
}

export type SafeCompareEntity =
  | { entityType: 'property'; data: SafeCompareProperty }
  | { entityType: 'project'; data: SafeCompareProject }
  | { entityType: 'society'; data: SafeCompareSociety };

export interface ResolvedCompareReferences {
  properties: SafeCompareProperty[];
  projects: SafeCompareProject[];
  societies: SafeCompareSociety[];
  entities: SafeCompareEntity[];
  unavailableCount: number;
}

export interface ListingIntentValidation {
  valid: boolean;
  reason?: 'listing_type_unavailable' | 'listing_intent_mismatch';
  message?: string;
}

export function setCompareSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, private',
  );
  res.setHeader('Pragma', 'no-cache');
}

export function createCompareRequestContext(
  req: NextApiRequest,
  res: NextApiResponse,
): CompareRequestContext {
  const rawRequestId = req.headers['x-request-id'];
  const candidate = Array.isArray(rawRequestId)
    ? rawRequestId[0]
    : rawRequestId;
  const normalizedCandidate =
    typeof candidate === 'string' ? candidate.trim() : '';
  const requestId = /^[A-Za-z0-9._-]{1,100}$/.test(normalizedCandidate)
    ? normalizedCandidate
    : crypto.randomBytes(16).toString('hex');

  const rawUserAgent = req.headers['user-agent'];
  const userAgent = Array.isArray(rawUserAgent)
    ? rawUserAgent[0]
    : rawUserAgent;

  res.setHeader('X-Request-Id', requestId);

  return {
    requestId,
    ip: getClientIp(req),
    userAgent,
  };
}

export async function safelyLogCompareEvent(
  event: Parameters<typeof logSecurityEvent>[0],
): Promise<void> {
  try {
    await logSecurityEvent(event);
  } catch {
    // Logging failures must not replace the API response.
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function objectIdString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  let candidate = '';

  try {
    candidate = String(value);
  } catch {
    return null;
  }

  return /^[0-9a-fA-F]{24}$/.test(candidate)
    ? candidate.toLowerCase()
    : null;
}

function isCompareEntityType(value: unknown): value is CompareEntityType {
  return value === 'property' || value === 'project' || value === 'society';
}

export function parseComparisonReferences(
  value: unknown,
): ParsedCompareReferences {
  const comparison = asRecord(value);
  const references: CompareReference[] = [];
  const seen = new Set<string>();
  let invalidCount = 0;
  let usedLegacyProperties = false;

  const rawItemsValue = comparison.items;
  const rawItems = Array.isArray(rawItemsValue)
    ? (rawItemsValue as unknown[])
    : [];

  if (
    rawItemsValue !== undefined &&
    rawItemsValue !== null &&
    !Array.isArray(rawItemsValue)
  ) {
    invalidCount += 1;
  }

  const useV2Items = rawItems.length > 0;

  const addReference = (
    entityTypeValue: unknown,
    entityIdValue: unknown,
  ): void => {
    if (!isCompareEntityType(entityTypeValue)) {
      invalidCount += 1;
      return;
    }

    const entityId = objectIdString(entityIdValue);
    if (!entityId) {
      invalidCount += 1;
      return;
    }

    const key = `${entityTypeValue}:${entityId}`;
    if (seen.has(key)) {
      invalidCount += 1;
      return;
    }

    seen.add(key);
    references.push({
      entityType: entityTypeValue,
      entityId,
    });
  };

  if (useV2Items) {
    for (const rawItem of rawItems) {
      const item = asRecord(rawItem);
      addReference(item.entityType, item.entityId);
    }
  } else {
    const rawPropertiesValue = comparison.properties;
    const rawProperties = Array.isArray(rawPropertiesValue)
      ? (rawPropertiesValue as unknown[])
      : [];

    if (
      rawPropertiesValue !== undefined &&
      rawPropertiesValue !== null &&
      !Array.isArray(rawPropertiesValue)
    ) {
      invalidCount += 1;
    }

    usedLegacyProperties = rawProperties.length > 0;

    for (const propertyId of rawProperties) {
      addReference('property', propertyId);
    }
  }

  return {
    references,
    invalidCount,
    usedLegacyProperties,
  };
}

export function getPropertyListingIntent(
  listingType: unknown,
): PropertyListingIntent | null {
  if (listingType === 'rent') {
    return 'rent';
  }

  if (listingType === 'full_payment' || listingType === 'installment') {
    return 'sale';
  }

  if (listingType === 'pre_launch') {
    return 'pre_launch';
  }

  return null;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function stringOrNumber(value: unknown): string | number | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  return numberOrNull(value);
}

function stringOrStringArray(value: unknown): string | string[] | null {
  if (typeof value === 'string') {
    return stringOrNull(value);
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const strings = (value as unknown[])
    .map(item => stringOrNull(item))
    .filter((item): item is string => item !== null);

  return strings.length > 0 ? strings.slice(0, 10) : null;
}

function safePublicImageUrl(value: unknown): string | null {
  const candidate = stringOrNull(value);
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate);
    if (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      parsed.username.length === 0 &&
      parsed.password.length === 0
    ) {
      return candidate;
    }
  } catch {
    return null;
  }

  return null;
}

function safeImages(value: unknown): Array<string | SafeCompareImage> {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: Array<string | SafeCompareImage> = [];

  for (const rawImage of (value as unknown[]).slice(0, 8)) {
    if (typeof rawImage === 'string') {
      const url = safePublicImageUrl(rawImage);
      if (url) {
        result.push(url);
      }
      continue;
    }

    const image = asRecord(rawImage);
    const url =
      safePublicImageUrl(image.url) ??
      safePublicImageUrl(image.secure_url) ??
      safePublicImageUrl(image.src) ??
      safePublicImageUrl(image.imageUrl);

    if (!url) {
      continue;
    }

    const safeImage: SafeCompareImage = { url };
    const alt = stringOrNull(image.alt);
    const isPrimary = booleanOrNull(image.isPrimary);

    if (alt) {
      safeImage.alt = alt;
    }
    if (isPrimary !== null) {
      safeImage.isPrimary = isPrimary;
    }

    result.push(safeImage);
  }

  return result;
}

function safeLocation(value: unknown): SafeCompareLocation | null {
  const location = asRecord(value);
  const safe: SafeCompareLocation = {
    city: stringOrNull(location.city),
    area: stringOrNull(location.area) ?? stringOrNull(location.areaName),
    locality: stringOrNull(location.locality),
  };

  return safe.city || safe.area || safe.locality ? safe : null;
}

function imageUrl(image: string | SafeCompareImage | undefined): string | null {
  if (typeof image === 'string') {
    return image;
  }

  return image?.url ?? null;
}

function primaryImage(
  directImage: unknown,
  images: Array<string | SafeCompareImage>,
): string | null {
  const direct = safePublicImageUrl(directImage);
  if (direct) {
    return direct;
  }

  const primary = images.find(
    image => typeof image !== 'string' && image.isPrimary === true,
  );
  return imageUrl(primary) ?? imageUrl(images[0]);
}

export async function resolveCompareReferences(
  references: CompareReference[],
): Promise<ResolvedCompareReferences> {
  const propertyIds = references
    .filter(reference => reference.entityType === 'property')
    .map(reference => new mongoose.Types.ObjectId(reference.entityId));
  const projectIds = references
    .filter(reference => reference.entityType === 'project')
    .map(reference => new mongoose.Types.ObjectId(reference.entityId));
  const societyIds = references
    .filter(reference => reference.entityType === 'society')
    .map(reference => new mongoose.Types.ObjectId(reference.entityId));

  const [propertyDocuments, projectDocuments, societyDocuments] =
    await Promise.all([
      propertyIds.length > 0
        ? Property.find({
            ...PUBLIC_PROPERTY_FILTER,
            _id: { $in: propertyIds },
          })
            .select({
              title: 1,
              price: 1,
              city: 1,
              area: 1,
              areaUnit: 1,
              images: 1,
              propertyType: 1,
              slug: 1,
              bedrooms: 1,
              bathrooms: 1,
              listingType: 1,
              location: 1,
              previousPrice: 1,
              priceDropPercent: 1,
              'verification.status': 1,
              'ownershipProof.reviewStatus': 1,
            })
            .lean()
        : Promise.resolve([]),

      projectIds.length > 0
        ? Project.find({
            _id: { $in: projectIds },
            isDeleted: { $ne: true },
            status: 'verified',
            verificationStatus: 'verified',
            developerApprovalStatus: 'approved',
          })
            .select({
              slug: 1,
              projectName: 1,
              tagline: 1,
              city: 1,
              area: 1,
              projectCategory: 1,
              projectNature: 1,
              projectStatus: 1,
              isVerified: 1,
              isFeatured: 1,
              isTrustedBuilder: 1,
              developerBadge: 1,
              minPrice: 1,
              maxPrice: 1,
              highriseScore: 1,
              nocStatus: 1,
              approvalAuthority: 1,
              featureImageUrl: 1,
              'images.url': 1,
              'images.isPrimary': 1,
              'developerProfile.name': 1,
              'developerProfile.logoUrl': 1,
            })
            .lean()
        : Promise.resolve([]),

      societyIds.length > 0
        ? Society.find({
            _id: { $in: societyIds },
            isPublished: true,
          })
            .select({
              slug: 1,
              name: 1,
              city: 1,
              areaName: 1,
              category: 1,
              nocStatus: 1,
              approvalAuthority: 1,
              overallRiskLevel: 1,
              'scores.overall': 1,
              featuredImage: 1,
              isVerifiedByHighrise: 1,
              isFeatured: 1,
            })
            .lean()
        : Promise.resolve([]),
    ]);

  const propertyById = new Map<string, SafeCompareProperty>();
  const projectById = new Map<string, SafeCompareProject>();
  const societyById = new Map<string, SafeCompareSociety>();

  const propertyRows = propertyDocuments as unknown as Array<
    Record<string, unknown>
  >;

  for (const row of propertyRows) {
    const id = objectIdString(row._id);
    if (!id) {
      continue;
    }

    const verification = asRecord(row.verification);
    const ownershipProof = asRecord(row.ownershipProof);

    propertyById.set(id, {
      _id: id,
      title: stringOrNull(row.title),
      price: numberOrNull(row.price),
      city: stringOrNull(row.city),
      area: stringOrNumber(row.area),
      areaUnit: stringOrNull(row.areaUnit),
      images: safeImages(row.images),
      propertyType: stringOrStringArray(row.propertyType),
      slug: stringOrNull(row.slug),
      bedrooms: stringOrNumber(row.bedrooms),
      bathrooms: stringOrNumber(row.bathrooms),
      listingType: stringOrNull(row.listingType),
      location: safeLocation(row.location),
      previousPrice: numberOrNull(row.previousPrice),
      priceDropPercent: numberOrNull(row.priceDropPercent),
      verification: {
        status: stringOrNull(verification.status),
      },
      ownershipProof: {
        reviewStatus: stringOrNull(ownershipProof.reviewStatus),
      },
    });
  }

  const projectRows = projectDocuments as unknown as Array<
    Record<string, unknown>
  >;

  for (const row of projectRows) {
    const id = objectIdString(row._id);
    if (!id) {
      continue;
    }

    const developerProfile = asRecord(row.developerProfile);
    const images = safeImages(row.images);

    projectById.set(id, {
      _id: id,
      slug: stringOrNull(row.slug),
      projectName: stringOrNull(row.projectName),
      tagline: stringOrNull(row.tagline),
      city: stringOrNull(row.city),
      area: stringOrNull(row.area),
      projectCategory: stringOrNull(row.projectCategory),
      projectNature: stringOrNull(row.projectNature),
      projectStatus: stringOrNull(row.projectStatus),
      minPrice: numberOrNull(row.minPrice),
      maxPrice: numberOrNull(row.maxPrice),
      isVerified: booleanOrNull(row.isVerified),
      isFeatured: booleanOrNull(row.isFeatured),
      isTrustedBuilder: booleanOrNull(row.isTrustedBuilder),
      developerBadge: stringOrNull(row.developerBadge),
      highriseScore: numberOrNull(row.highriseScore),
      nocStatus: stringOrNull(row.nocStatus),
      approvalAuthority: stringOrNull(row.approvalAuthority),
      primaryImage: primaryImage(row.featureImageUrl, images),
      developerName: stringOrNull(developerProfile.name),
      developerLogoUrl: safePublicImageUrl(developerProfile.logoUrl),
    });
  }

  const societyRows = societyDocuments as unknown as Array<
    Record<string, unknown>
  >;

  for (const row of societyRows) {
    const id = objectIdString(row._id);
    if (!id) {
      continue;
    }

    const scores = asRecord(row.scores);

    societyById.set(id, {
      _id: id,
      slug: stringOrNull(row.slug),
      name: stringOrNull(row.name),
      city: stringOrNull(row.city),
      areaName: stringOrNull(row.areaName),
      category: stringOrNull(row.category),
      nocStatus: stringOrNull(row.nocStatus),
      approvalAuthority: stringOrNull(row.approvalAuthority),
      overallRiskLevel: stringOrNull(row.overallRiskLevel),
      overallScore: numberOrNull(scores.overall),
      featuredImage: safePublicImageUrl(row.featuredImage),
      isVerifiedByHighrise: booleanOrNull(row.isVerifiedByHighrise),
      isFeatured: booleanOrNull(row.isFeatured),
    });
  }

  const entities: SafeCompareEntity[] = [];

  for (const reference of references) {
    if (reference.entityType === 'property') {
      const data = propertyById.get(reference.entityId);
      if (data) {
        entities.push({ entityType: 'property', data });
      }
      continue;
    }

    if (reference.entityType === 'project') {
      const data = projectById.get(reference.entityId);
      if (data) {
        entities.push({ entityType: 'project', data });
      }
      continue;
    }

    const data = societyById.get(reference.entityId);
    if (data) {
      entities.push({ entityType: 'society', data });
    }
  }

  const properties = entities
    .filter(
      (
        entity,
      ): entity is {
        entityType: 'property';
        data: SafeCompareProperty;
      } => entity.entityType === 'property',
    )
    .map(entity => entity.data);

  const projects = entities
    .filter(
      (
        entity,
      ): entity is {
        entityType: 'project';
        data: SafeCompareProject;
      } => entity.entityType === 'project',
    )
    .map(entity => entity.data);

  const societies = entities
    .filter(
      (
        entity,
      ): entity is {
        entityType: 'society';
        data: SafeCompareSociety;
      } => entity.entityType === 'society',
    )
    .map(entity => entity.data);

  return {
    properties,
    projects,
    societies,
    entities,
    unavailableCount: references.length - entities.length,
  };
}

export function validatePropertyListingIntents(
  references: CompareReference[],
  resolved: ResolvedCompareReferences,
): ListingIntentValidation {
  if (
    references.length === 0 ||
    references.some(reference => reference.entityType !== 'property')
  ) {
    return { valid: true };
  }

  const propertiesById = new Map(
    resolved.properties.map(property => [property._id, property]),
  );
  const intents = new Set<PropertyListingIntent>();

  for (const reference of references) {
    const property = propertiesById.get(reference.entityId);
    const intent = getPropertyListingIntent(property?.listingType);

    if (!intent) {
      return {
        valid: false,
        reason: 'listing_type_unavailable',
        message:
          'A property in this comparison has an unsupported listing type. Remove it or clear the comparison before continuing.',
      };
    }

    intents.add(intent);
  }

  if (intents.size <= 1) {
    return { valid: true };
  }

  const message = intents.has('rent')
    ? 'Rental properties can only be compared with other rentals. Remove the rental or for-sale listings, then try again.'
    : 'Pre-launch properties can only be compared with other pre-launch properties. Remove the other listings, then try again.';

  return {
    valid: false,
    reason: 'listing_intent_mismatch',
    message,
  };
}

export function compareVersionFilter(value: unknown): Record<string, unknown> {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0
  ) {
    return { __v: value };
  }

  return {
    $or: [{ __v: { $exists: false } }, { __v: 0 }],
  };
}

export function toCompareDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function toCompareIsoDate(value: unknown): string | null {
  return toCompareDate(value)?.toISOString() ?? null;
}

export function isDuplicateKeyError(error: unknown): boolean {
  return asRecord(error).code === 11000;
}