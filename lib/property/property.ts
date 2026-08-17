// FILE: lib/property/property.ts
// COMPLETE FILE REPLACEMENT

export type ListingType = 'full_payment' | 'rent' | 'installment' | '';

export type AreaUnit =
  | 'Marla'
  | 'Kanal'
  | 'Sq Ft'
  | 'Sq Yd'
  | 'Sq M'
  | string;

export type PropertyImage = { url: string } | string;

export interface PropertyDTO {
  _id: string;
  slug?: string;
  title: string;
  city: string;
  society?: string;
  area?: string;
  location?: string;
  propertyType?: string;
  propertyCategory?: string;
  listingType?: ListingType;
  purpose?: string;
  status?: string;
  price: number;
  areaSize?: number;
  areaUnit?: AreaUnit;
  areaValue?: number;
  unit?: AreaUnit;
  bedrooms?: number;
  bathrooms?: number;
  images?: PropertyImage[];
  isFeatured?: boolean;
  createdAt?: string;
}

function safeStr(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined;
  return undefined;
}

function safeNum(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeProperty(raw: unknown): PropertyDTO {
  const r = raw as Record<string, unknown>;
  const city = safeStr(r?.city) || 'Pakistan';

  const imagesRaw: unknown[] = Array.isArray(r?.images) ? r.images : [];

  const images = imagesRaw
    .map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object') {
        const imgObj = img as Record<string, unknown>;
        if (typeof imgObj.url === 'string') return { url: imgObj.url };
      }
      return null;
    })
    .filter((x): x is PropertyImage => x !== null);

  const areaSize =
    safeNum(r?.areaSize) ??
    safeNum(typeof r?.area === 'number' ? r.area : undefined) ??
    safeNum(r?.areaValue);

  const areaUnit =
    safeStr(r?.areaUnit) ??
    safeStr(r?.unit) ??
    undefined;

  const rawListingType = safeStr(r?.listingType);
  const listingType: ListingType =
    rawListingType === 'full_payment' ||
    rawListingType === 'rent' ||
    rawListingType === 'installment'
      ? rawListingType
      : '';

  return {
    _id: String(r?._id ?? r?.id ?? ''),
    slug: safeStr(r?.slug),
    title: safeStr(r?.title) || 'Untitled Property',
    city,
    society: safeStr(r?.society),
    area: typeof r?.area === 'string' ? safeStr(r.area) : undefined,
    location: safeStr(r?.location),
    propertyType: safeStr(r?.propertyType) || safeStr(r?.type),
    propertyCategory: safeStr(r?.propertyCategory),
    listingType,
    purpose: safeStr(r?.purpose),
    status: safeStr(r?.status),
    price: safeNum(r?.price) ?? 0,
    areaSize,
    areaUnit,
    bedrooms: safeNum(r?.bedrooms),
    bathrooms: safeNum(r?.bathrooms),
    images: images.length ? images : undefined,
    isFeatured: Boolean(r?.isFeatured),
    createdAt: safeStr(r?.createdAt),
  };
}

export function getPrimaryImageUrl(p: PropertyDTO): string {
  const first = p.images?.[0];
  if (!first) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80';
  if (typeof first === 'string') return first;
  if (typeof first.url === 'string') return first.url;
  return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80';
}

export function getLocationLabel(p: PropertyDTO): string {
  const parts = [p.society, p.area, p.city].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return p.location || p.city || 'Pakistan';
}

export function getAreaLabel(p: PropertyDTO): string {
  const size = p.areaSize;
  const unit = p.areaUnit;
  if (!size || !unit) return '';
  const nice = Number.isInteger(size) ? String(size) : size.toFixed(2);
  return `${nice} ${unit}`;
}

export function listingTypeLabel(listingType?: ListingType): string {
  if (listingType === 'rent') return 'For Rent';
  if (listingType === 'installment') return 'Installments';
  return 'For Sale';
}

export function formatPKR(price: number, listingType?: ListingType): string {
  const suffix = listingType === 'rent' ? '/mo' : '';
  if (!Number.isFinite(price) || price <= 0) return `PKR 0${suffix}`;
  if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(2)} Crore${suffix}`;
  if (price >= 100_000) return `PKR ${(price / 100_000).toFixed(2)} Lac${suffix}`;
  return `PKR ${price.toLocaleString()}${suffix}`;
}

export function normalizePropertiesList(rawList: unknown[]): PropertyDTO[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(normalizeProperty).filter((p) => p._id);
}