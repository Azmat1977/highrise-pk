// lib/aleem/searchProperties.ts
// ALEEM — grounded property search.
//
// Queries Highrise.pk inventory using ONLY the canonical public-visibility
// filter. Never uses status: 'active'. Never returns unverified / flagged /
// deleted listings. Caps results and bounds query time. The model never
// receives a Mongo URI — it only ever sees the card array this returns.

import type { FilterQuery } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import type { IProperty } from '@/models/Property';
import {
  PUBLIC_PROPERTY_FILTER,
  withPublicPropertyFilter,
} from '@/lib/property/publicProperty';
import type { PropertySearchSlots } from '@/lib/aleem/slots';

const MAX_RESULTS = 8;
const MAX_TIME_MS = 2500;

const MARLA_TO_SQYD = 30.25;
const MARLA_TO_SQFT = 272.25;
const AREA_TOLERANCE = 0.15;

function escapeRegex(input: string): string {
  // Prevent ReDoS / regex injection from user or model text.
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface PropertyCard {
  slug: string;
  title: string;
  city: string;
  society: string;
  propertyType: string;
  listingType: string;
  price: number;
  area: number;
  unit: string;
  imageUrl: string | null;
  isFeatured: boolean;
}

export interface SearchPropertiesResult {
  matches: PropertyCard[];
  total: number;
  filters: {
    type?: string;
    listingType?: string;
    location?: string;
    marla?: number;
    budgetMinPKR?: number;
    budgetMaxPKR?: number;
  };
}

// Lean doc shape after .lean(). Only public, non-PII fields are selected.
interface LeanPropertyDoc {
  slug?: string;
  title?: string;
  city?: string;
  society?: string;
  propertyType?: string;
  listingType?: string;
  price?: number;
  area?: number;
  unit?: string;
  isFeatured?: boolean;
  images?: Array<string | { url?: string; secure_url?: string }> | null;
  coverImage?: string | { url?: string } | null;
  primaryImage?: string | null;
  verification?: { status?: string } | null;
}

function resolveImageUrl(doc: LeanPropertyDoc): string | null {
  const first = doc.images?.[0];
  if (typeof first === 'string' && first) return first;
  if (first && typeof first === 'object' && (first.url || first.secure_url)) {
    return first.secure_url ?? first.url ?? null;
  }
  if (typeof doc.coverImage === 'string' && doc.coverImage) return doc.coverImage;
  if (doc.coverImage && typeof doc.coverImage === 'object' && doc.coverImage.url) {
    return doc.coverImage.url;
  }
  if (typeof doc.primaryImage === 'string' && doc.primaryImage) return doc.primaryImage;
  return null;
}

function buildTypeFilter(
  type: NonNullable<PropertySearchSlots['type']>,
): FilterQuery<IProperty> {
  const residentialTypes = ['plot', 'house', 'apartment'] as const;
  const commercialTypes = ['shop', 'office', 'warehouse', 'building'] as const;

  const or: FilterQuery<IProperty>[] = [];

  if ((residentialTypes as readonly string[]).includes(type)) {
    or.push({ residentialType: type as 'plot' | 'house' | 'apartment' });
  }
  if ((commercialTypes as readonly string[]).includes(type)) {
    or.push({ commercialType: type as 'shop' | 'office' | 'warehouse' | 'building' });
  }
  // Fallback: free-text propertyType field (anchored, escaped).
  or.push({ propertyType: { $regex: `^${escapeRegex(type)}$`, $options: 'i' } });

  return { $or: or };
}

export async function searchProperties(
  slots: PropertySearchSlots,
): Promise<SearchPropertiesResult> {
  await dbConnect();

  const clauses: FilterQuery<IProperty>[] = [];

  // ── Type ────────────────────────────────────────────────
  if (slots.type) {
    clauses.push(buildTypeFilter(slots.type));
  }
  // Rent vs sale. Without this clause a "for rent" search silently returns
  // sale listings, which breaks the verified promise.
  if (slots.listingType) {
    const lt = escapeRegex(slots.listingType);
    clauses.push({ listingType: { $regex: `^${lt}$`, $options: 'i' } });
  }
  // ── Location (city / society / locality) ────────────────
  if (slots.location) {
    const safe = escapeRegex(slots.location);
    const regex = { $regex: safe, $options: 'i' };
    clauses.push({ $or: [{ city: regex }, { society: regex }, { locality: regex }] });
  }

  // ── Budget (PKR) ────────────────────────────────────────
  if (slots.budgetMaxPKR !== undefined || slots.budgetMinPKR !== undefined) {
    const price: Record<string, number> = {};
    if (slots.budgetMinPKR !== undefined) price.$gte = slots.budgetMinPKR;
    if (slots.budgetMaxPKR !== undefined) price.$lte = slots.budgetMaxPKR;
    clauses.push({ price });
  }

  // ── Plot size (marla) ───────────────────────────────────
  // `area` stores a number in a free-text `unit` field. For plots we match a
  // tolerance band across the three common units so a "5 marla" query finds
  // real listings regardless of how the owner entered the size.
  if (slots.marla !== undefined && slots.type === 'plot') {
    const lo = slots.marla * (1 - AREA_TOLERANCE);
    const hi = slots.marla * (1 + AREA_TOLERANCE);
    clauses.push({
      $or: [
        { area: { $gte: lo, $lte: hi } },
        { area: { $gte: lo * MARLA_TO_SQYD, $lte: hi * MARLA_TO_SQYD } },
        { area: { $gte: lo * MARLA_TO_SQFT, $lte: hi * MARLA_TO_SQFT } },
      ],
    });
  }

  // ALWAYS wrap in the canonical public filter.
  const query: FilterQuery<IProperty> =
    clauses.length > 0 ? withPublicPropertyFilter({ $and: clauses }) : { ...PUBLIC_PROPERTY_FILTER };

  const docs = await Property.find(query)
    .select(
      'slug title city society propertyType listingType price area unit isFeatured images coverImage primaryImage verification.status',
    )
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(MAX_RESULTS)
    .maxTimeMS(MAX_TIME_MS)
    .lean();

  const matches: PropertyCard[] = (docs as unknown as LeanPropertyDoc[]).map((doc) => ({
    slug: doc.slug ?? '',
    title: doc.title ?? '',
    city: doc.city ?? '',
    society: doc.society ?? '',
    propertyType: doc.propertyType ?? '',
    listingType: doc.listingType ?? '',
    price: doc.price ?? 0,
    area: doc.area ?? 0,
    unit: doc.unit ?? '',
    imageUrl: resolveImageUrl(doc),
    isFeatured: doc.isFeatured ?? false,
  }));

  return {
    matches,
    total: matches.length,
    filters: {
      type: slots.type,
      listingType: slots.listingType,
      location: slots.location,
      marla: slots.marla,
      budgetMinPKR: slots.budgetMinPKR,
      budgetMaxPKR: slots.budgetMaxPKR,
    },
  };
}
