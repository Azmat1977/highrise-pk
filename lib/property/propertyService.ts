//C:\dev\highrise-pk\lib\property\propertyService.ts
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';
import { resolvePropertyActor, publicPropertyActor } from '@/lib/property/propertyActor';
import { buildPropertyTrustSummary } from '@/lib/property/propertyTrust';
import { toPublicPropertyDto } from '@/lib/property/propertyPublicDto';

export interface PropertyPublicResult {
  property: Record<string, unknown>;
  actorUserId?: string;
}

export async function getPublicPropertyBySlug(slugOrId: string): Promise<PropertyPublicResult | null> {
  await dbConnect();
  const key = String(slugOrId || '').trim();
  if (!key) return null;
  
  const identity = mongoose.isValidObjectId(key) ? { _id: key } : { slug: key };
  
  // 1. Try public query
  let raw = await Property.findOne({ ...identity, ...PUBLIC_PROPERTY_FILTER }).lean<Record<string, unknown>>();
  let isPreview = false;

  // 2. Fallback for Owner/Admin preview (listing exists but pending/draft)
  if (!raw) {
    raw = await Property.findOne({ ...identity, isDeleted: { $ne: true } }).lean<Record<string, unknown>>();
    if (!raw) return null;
    isPreview = true;
  }

  const actor = await resolvePropertyActor({
    owner: raw.owner as string | undefined,
    agentId: raw.agentId as string | undefined,
    developerId: raw.developerId as string | undefined,
  });
  const publicActor = publicPropertyActor(actor);
  const trust = buildPropertyTrustSummary(raw, publicActor?.verified === true);
  const dto = toPublicPropertyDto(raw, publicActor, trust);
  
  // Attach preview flag so the UI can render a warning banner
  if (isPreview) {
    dto.isPendingPreview = true;
  }
  
  return { property: dto, actorUserId: actor?.userId };
}

export async function getPublicPropertyById(id: string): Promise<PropertyPublicResult | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  return getPublicPropertyBySlug(id);
}
