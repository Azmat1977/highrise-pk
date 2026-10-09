//C:\dev\highrise-pk\components\property\property-grid.tsx
import React from 'react';
import { PropertyCard } from './property-card';

// Enterprise: defense-in-depth on client too (never allow media public_id etc to leak into UI via props)
const SENSITIVE_MEDIA_KEYS = new Set([
  'public_id',
  'publicId',
  'cloudinaryPublicId',
  'asset_id',
  'assetId',
  'signature',
  'etag',
  'api_key',
  'apiSecret',
  'access_token',
  'accessToken',
]);

function normalizePropertyId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    for (const key of ['$oid', '_id', 'id']) {
      const nested = obj[key];
      if (nested != null && nested !== value) {
        const resolved = normalizePropertyId(nested);
        if (resolved) return resolved;
      }
    }

    const toHexString = (value as { toHexString?: () => unknown }).toHexString;
    if (typeof toHexString === 'function') {
      try {
        const resolved = toHexString.call(value);
        if (typeof resolved === 'string' && resolved.trim()) {
          return resolved.trim();
        }
      } catch {}
    }

    const toStringFn = (value as { toString?: () => unknown }).toString;
    if (typeof toStringFn === 'function') {
      try {
        const resolved = toStringFn.call(value);
        if (
          typeof resolved === 'string' &&
          resolved.trim() &&
          resolved.trim() !== '[object Object]'
        ) {
          return resolved.trim();
        }
      } catch {}
    }
  }

  return '';
}
function scrubSensitive(val: any): any {
  if (!val) return val;
  if (Array.isArray(val)) return val.map(scrubSensitive);
  if (typeof val !== 'object') return val;

  for (const k of Object.keys(val)) {
    if (SENSITIVE_MEDIA_KEYS.has(k)) {
      delete (val as any)[k];
      continue;
    }
    (val as any)[k] = scrubSensitive((val as any)[k]);
  }
  return val;
}

// Client least-privilege: only pass what cards typically need (prevents accidental PII/large payload props)
function pickCardSafeProperty(input: any): any {
  const p = input && typeof input === 'object' ? input : {};

  const out: any = {
    _id: p?._id,
    id: p?.id,
    slug: p?.slug,

    title: p?.title,
    city: p?.city,
    price: p?.price,

    // common fields used in cards
    location: p?.location,
    society: p?.society,
    developer: p?.developer,
    propertyType: p?.propertyType,
    purpose: p?.purpose,
    listingType: p?.listingType,
    bedrooms: p?.bedrooms,
    bathrooms: p?.bathrooms,
    area: p?.area,
    areaSize: p?.areaSize,
    areaUnit: p?.areaUnit,
    unit: p?.unit,
    isFeatured: p?.isFeatured,
    isPromoted: p?.isPromoted,
    promotedUntil: p?.promotedUntil,
    createdAt: p?.createdAt,
    
    // Resolved owner attributes passed safely
    ownerName: p?.ownerName,
    ownerRole: p?.ownerRole,
    ownerSlug: p?.ownerSlug,
    ownerListingCount: p?.ownerListingCount,
    previousPrice: p?.previousPrice,

    // media (urls only; scrub in depth)
    coverImage: p?.coverImage,
    thumbnail: p?.thumbnail,
    images: p?.images,
  };

  return scrubSensitive(out);
}

export interface PropertyListItem {
  // ✅ match PropertyCard expectation: _id must be string
  _id?: string;
  id?: string | number;
  slug?: string;

  // Optional-but-common listing fields (defensive)
  title?: string;
  city?: string;
  price?: number | string;

  // allow additional fields without losing type-safety completely
  [key: string]: any;
}

interface PropertyGridProps {
  properties?: PropertyListItem[];
  loading?: boolean;

  // enterprise: configurable
  skeletonCount?: number;

  // empty-state customization
  emptyTitle?: string;
  emptyHint?: string;

  // enterprise: allow passing an explicit grid id for testing/a11y hooks
  gridId?: string;
}

function resolvePropertyKey(property: PropertyListItem, index: number): string {
  // Enterprise priority: Mongo _id -> id -> slug -> stable fallback
  const mongoId = typeof property?._id === 'string' ? property._id : '';

  const id =
    typeof property?.id === 'string' || typeof property?.id === 'number'
      ? String(property.id)
      : '';

  const slug = typeof property?.slug === 'string' ? property.slug : '';

  if (mongoId) return mongoId;
  if (id) return id;
  if (slug) return slug;

  // last-resort fallback (reduce collision risk)
  const title = typeof property?.title === 'string' ? property.title : 'property';
  const city = typeof property?.city === 'string' ? property.city : '';
  const price = property?.price != null ? String(property.price) : '';

  return `${title}-${city}-${price}-${index}`;
}

export const PropertyGrid: React.FC<PropertyGridProps> = React.memo(
  ({
    properties,
    loading = false,
    skeletonCount = 6,
    emptyTitle = 'No properties found',
    emptyHint = 'Try adjusting your filters or search again.',
    gridId = 'property-grid',
  }) => {
    const safeProperties: PropertyListItem[] = Array.isArray(properties) ? properties : [];

    if (loading) {
      const count = Math.max(1, Number.isFinite(skeletonCount) ? skeletonCount : 6);

      return (
        <div
          id={gridId}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-busy="true"
          aria-live="polite"
          aria-label="Loading properties"
          role="list"
        >
          {Array.from({ length: count }).map((_, index) => (
             <div key={`skeleton-${index}`} className="bg-white rounded-2xl shadow-md p-6" role="listitem" aria-hidden="true">
              <div className="skeleton h-48 rounded-lg mb-4" />
              <div className="skeleton h-6 w-3/4 mb-2" />
              <div className="skeleton h-4 w-1/2 mb-4" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-6 w-1/3 mt-4" />
            </div>
          ))}
        </div>
      );
    }

    if (safeProperties.length === 0) {
      return (
        <div
          id={gridId}
          className="bg-white rounded-2xl shadow-md p-8 text-center"
          role="status"
          aria-live="polite"
        >
          <h3 className="text-lg font-semibold text-gray-900">{emptyTitle}</h3>
          <p className="text-sm text-gray-600 mt-2">{emptyHint}</p>
        </div>
      );
    }

    return (
      <div
        id={gridId}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        aria-label="Properties grid"
        role="list"
      >
        {safeProperties.map((property, index) => {
          // ✅ normalize _id for strict typing + client least-privilege + scrub sensitive keys
          const normalizedProperty = {
            ...property,
            _id:
              normalizePropertyId((property as any)?._id) ||
              normalizePropertyId((property as any)?.id) ||
              undefined,
          };

          const safeForCard = pickCardSafeProperty(normalizedProperty);

          return (
            <div key={resolvePropertyKey(safeForCard, index)} role="listitem" className="min-w-0">
              <PropertyCard property={safeForCard as any} />
            </div>
          );
        })}
      </div>
    );
  }
);

PropertyGrid.displayName = 'PropertyGrid';
