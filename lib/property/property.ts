// C:\dev\highrise-pk\lib\property\property.ts

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

  // PK location model (practical + scalable)
  city: string;
  society?: string;
  area?: string;   // sector / neighborhood / locality
  location?: string; // free-text fallback

  // Types
  propertyType?: string;      // "House", "Apartment", ...
  propertyCategory?: string;  // "residential" | "commercial" | "plots" (optional)

  // Listing
  listingType?: ListingType;  // full_payment / rent / installment
  purpose?: string;           // optional legacy
  status?: string;            // "active" "pending" etc.

  // Price
  price: number;

  // Size
  areaSize?: number;  // canonical numeric size
  areaUnit?: AreaUnit;

  // Legacy fallback (some APIs send these)
  areaValue?: number; // maps from "area"
  unit?: AreaUnit;

  // Beds/baths
  bedrooms?: number;
  bathrooms?: number;

  // Media
  images?: PropertyImage[];

  // Flags
  isFeatured?: boolean;

  // Dates
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

export function normalizeProperty(raw: any): PropertyDTO {
  const city = safeStr(raw?.city) || 'Pakistan';

  // images may be [{url}] or string[]
  const imagesRaw: any[] = Array.isArray(raw?.images) ? raw.images : [];

  const images = imagesRaw
    .map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && typeof img.url === 'string') return { url: img.url };
      return null;
    })
    .filter(Boolean) as PropertyImage[];

  // size normalization
  const areaSize =
    safeNum(raw?.areaSize) ??
    safeNum(raw?.area) ?? // legacy numeric
    safeNum(raw?.areaValue);

  const areaUnit =
    safeStr(raw?.areaUnit) ??
    safeStr(raw?.unit) ??
    undefined;

  return {
    _id: String(raw?._id || raw?.id || ''),
    slug: safeStr(raw?.slug),

    title: safeStr(raw?.title) || 'Untitled Property',

    city,
    society: safeStr(raw?.society),
    area: safeStr(raw?.area) && typeof raw?.area === 'string' ? safeStr(raw?.area) : safeStr(raw?.location) ? undefined : safeStr(raw?.area),
    location: safeStr(raw?.location),

    propertyType: safeStr(raw?.propertyType) || safeStr(raw?.type),
    propertyCategory: safeStr(raw?.propertyCategory),

    listingType: (safeStr(raw?.listingType) as any) || '',
    purpose: safeStr(raw?.purpose),
    status: safeStr(raw?.status),

    price: safeNum(raw?.price) ?? 0,

    areaSize,
    areaUnit,

    bedrooms: safeNum(raw?.bedrooms),
    bathrooms: safeNum(raw?.bathrooms),

    images: images.length ? images : undefined,

    isFeatured: Boolean(raw?.isFeatured),

    createdAt: safeStr(raw?.createdAt),
  };
}

export function getPrimaryImageUrl(p: PropertyDTO): string {
  const first = p.images?.[0];
  if (!first) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80';
  if (typeof first === 'string') return first;
  if (first && typeof first.url === 'string') return first.url;
  return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80';
}

export function getLocationLabel(p: PropertyDTO): string {
  // PK best practice: Society + Area/Sector + City
  const parts = [p.society, p.area, p.city].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return p.location || p.city || 'Pakistan';
}

export function getAreaLabel(p: PropertyDTO): string {
  const size = p.areaSize;
  const unit = p.areaUnit;

  if (!size || !unit) return '';
  // avoid ugly decimals for marla/kanal etc
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

  if (price >= 10000000) return `PKR ${(price / 10000000).toFixed(2)} Crore${suffix}`;
  if (price >= 100000) return `PKR ${(price / 100000).toFixed(2)} Lac${suffix}`;
  return `PKR ${price.toLocaleString()}${suffix}`;
}

export function normalizePropertiesList(rawList: any[]): PropertyDTO[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(normalizeProperty).filter((p) => p._id);
}
