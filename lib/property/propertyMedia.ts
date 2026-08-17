import { verifyUploadAssetToken, type UploadAssetResourceType } from '@/lib/uploadAssetToken';

export interface PropertyMediaInput {
  url?: unknown;
  publicId?: unknown;
  public_id?: unknown;
  assetToken?: unknown;
  resourceType?: unknown;
  mimeType?: unknown;
  isPrimary?: unknown;
  caption?: unknown;
  category?: unknown;
  isExisting?: unknown;
}

export interface CanonicalPropertyMedia {
  url: string;
  public_id: string;
  resourceType: UploadAssetResourceType;
  mimeType?: string;
  isPrimary?: boolean;
  caption?: string;
  category?: string;
}

function safe(value: unknown, max = 2048): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function existingIds(existing: unknown): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(existing)) return ids;
  for (const item of existing) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = safe(row.public_id ?? row.publicId, 512);
    if (id) ids.add(id);
  }
  return ids;
}

export function validatePropertyMediaInput(options: {
  userId: string;
  folder: 'properties' | 'property-floorplans';
  incoming: unknown;
  existing?: unknown;
  maxItems?: number;
}): CanonicalPropertyMedia[] {
  if (!Array.isArray(options.incoming)) return [];
  const existingSet = existingIds(options.existing);
  const out: CanonicalPropertyMedia[] = [];

  for (const raw of options.incoming.slice(0, options.maxItems ?? 30)) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as PropertyMediaInput;
    const url = safe(row.url);
    const publicId = safe(row.publicId ?? row.public_id, 512);
    if (!url.startsWith('https://res.cloudinary.com/') || !publicId) continue;

    const claimedResource = safe(row.resourceType, 16) as UploadAssetResourceType;
    const resourceType: UploadAssetResourceType = claimedResource === 'raw' || claimedResource === 'video' ? claimedResource : 'image';

    if (!existingSet.has(publicId)) {
      const token = verifyUploadAssetToken(row.assetToken, {
        userId: options.userId,
        publicId,
        folder: options.folder,
        resourceType,
      });
      if (!token) continue;
    }

    out.push({
      url,
      public_id: publicId,
      resourceType,
      mimeType: safe(row.mimeType, 120) || undefined,
      isPrimary: row.isPrimary === true,
      caption: safe(row.caption, 140) || undefined,
      category: safe(row.category, 40) || undefined,
    });
  }
  return out;
}

export function retiredPropertyMediaPublicIds(existing: unknown, next: CanonicalPropertyMedia[]): string[] {
  const old = existingIds(existing);
  const keep = new Set(next.map((item) => item.public_id));
  return [...old].filter((id) => !keep.has(id));
}

export interface CanonicalFloorPlanMedia {
  floorName: string;
  imageUrl?: string;
  imagePublicId?: string;
  pdfUrl?: string;
  pdfPublicId?: string;
  resourceType: 'image' | 'raw';
  mimeType?: string;
  description?: string;
}

function existingFloorPlanIds(existing: unknown): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(existing)) return ids;
  for (const item of existing) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = safe(row.imagePublicId ?? row.pdfPublicId ?? row.publicId ?? row.public_id, 512);
    if (id) ids.add(id);
  }
  return ids;
}

export function validatePropertyFloorPlanInput(options: {
  userId: string;
  incoming: unknown;
  existing?: unknown;
  maxItems?: number;
}): CanonicalFloorPlanMedia[] {
  if (!Array.isArray(options.incoming)) return [];
  const existingSet = existingFloorPlanIds(options.existing);
  const out: CanonicalFloorPlanMedia[] = [];

  for (const [index, raw] of options.incoming.slice(0, options.maxItems ?? 5).entries()) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const url = safe(row.url ?? row.imageUrl ?? row.pdfUrl);
    const publicId = safe(row.publicId ?? row.public_id ?? row.imagePublicId ?? row.pdfPublicId, 512);
    if (!url.startsWith('https://res.cloudinary.com/') || !publicId) continue;
    const claimed = safe(row.resourceType, 16);
    const mimeType = safe(row.mimeType, 120);
    const resourceType: 'image' | 'raw' = claimed === 'raw' || mimeType === 'application/pdf' ? 'raw' : 'image';
    if (!existingSet.has(publicId)) {
      const token = verifyUploadAssetToken(row.assetToken, {
        userId: options.userId,
        publicId,
        folder: 'property-floorplans',
        resourceType,
      });
      if (!token) continue;
    }
    const name = safe(row.floorName ?? row.name, 80) || `Floor Plan ${index + 1}`;
    out.push({
      floorName: name,
      ...(resourceType === 'raw' ? { pdfUrl: url, pdfPublicId: publicId } : { imageUrl: url, imagePublicId: publicId }),
      resourceType,
      mimeType: mimeType || undefined,
      description: safe(row.description, 300) || undefined,
    });
  }
  return out;
}

export function retiredFloorPlanPublicIds(existing: unknown, next: CanonicalFloorPlanMedia[]): Array<{ publicId: string; resourceType: 'image' | 'raw' }> {
  const nextIds = new Set(next.map((row) => row.imagePublicId ?? row.pdfPublicId).filter(Boolean) as string[]);
  const out: Array<{ publicId: string; resourceType: 'image' | 'raw' }> = [];
  if (!Array.isArray(existing)) return out;
  for (const item of existing) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const publicId = safe(row.imagePublicId ?? row.pdfPublicId, 512);
    if (!publicId || nextIds.has(publicId)) continue;
    const resourceType: 'image' | 'raw' = row.resourceType === 'raw' || Boolean(row.pdfPublicId) ? 'raw' : 'image';
    out.push({ publicId, resourceType });
  }
  return out;
}
