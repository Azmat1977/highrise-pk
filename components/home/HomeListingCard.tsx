// components/home/HomeListingCard.tsx
// Homepage listing card for the Featured, Installments, and Direct Owner sections.
// components/property/property-card.tsx is NOT changed. /properties, property-grid,
// and SimilarProperties keep using PropertyCard.
//
// Favorites and compare call the same endpoints and dispatch the same sync events
// as PropertyCard. The Favorites feature itself is not modified.
// Heart and compare sit on the image, outside the title link, so no interactive
// element is nested inside an anchor. The title link stretches over the whole card.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { icons } from '@/lib/design-system/icons';
import { useCompare } from '@/hooks/useCompare';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';
import ListingTypeBadge from '@/components/property/ListingTypeBadge';
import type { PropertyCardInput } from '@/components/property/property-card';

export type HomeListingInput = PropertyCardInput & {
  locality?: string;
  society?: string;
  phase?: string;
  block?: string;
};

export interface HomeListingCardProps {
  property: HomeListingInput;
  // Set only by a section whose API read gate has already confirmed an approved owner.
  ownerListed?: boolean;
}

function formatPrice(price: number, listingType: string): string {
  if (!Number.isFinite(price) || price <= 0) return 'Price on request';
  const suffix = listingType === 'rent' ? '/mo' : '';
  if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(2)} Crore${suffix}`;
  if (price >= 100_000) return `PKR ${(price / 100_000).toFixed(2)} Lac${suffix}`;
  return `PKR ${price.toLocaleString('en-PK')}${suffix}`;
}

function formatArea(area: PropertyCardInput['area'], unit?: string): string {
  const n = typeof area === 'number' ? area : typeof area === 'string' ? Number(area) : Number.NaN;
  const u = (unit || '').trim();
  if (!Number.isFinite(n) || n <= 0 || !u) return '';
  return `${n.toLocaleString('en-PK')} ${u}`;
}

function formatPropertyType(raw?: string): string {
  return (raw || '').replace(/_/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function localityLine(p: HomeListingInput): string {
  return [p.locality, p.society, p.phase, p.block]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s, i, all) => s !== '' && all.indexOf(s) === i)
    .join(', ');
}

function firstImageUrl(p: HomeListingInput): string | null {
  const first = p.images?.[0];
  const url = typeof first === 'string' ? first : first?.url ?? null;
  const t = (url || '').trim();
  return t.startsWith('https://') || t.startsWith('http://') ? t : null;
}

const ICON_BUTTON_BASE =
  'flex h-9 w-9 items-center justify-center rounded-full shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba] disabled:cursor-not-allowed disabled:opacity-50';

export default function HomeListingCard({ property, ownerListed = false }: HomeListingCardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isSignedIn = status === 'authenticated' && Boolean(session?.user);

  const rawId = property._id ?? property.id;
  const propertyId = typeof rawId === 'string' ? rawId.trim() : '';

  const title = property.title || property.name || 'Untitled property';
  const price = typeof property.price === 'number' ? property.price : 0;
  const listingType = (property.listingType || property.purpose || '').toString();
  const typeText = formatPropertyType(property.propertyType || property.type);
  const city = property.city || property.location || '';
  const area = formatArea(property.area, property.unit || property.areaUnit);
  const beds = typeof property.bedrooms === 'number' ? property.bedrooms : 0;
  const baths = typeof property.bathrooms === 'number' ? property.bathrooms : 0;
  const locality = localityLine(property);
  const poster = (property.ownerName || '').trim();
  const image = firstImageUrl(property);
  const href = property.slug
    ? `/property/${property.slug}`
    : propertyId
      ? `/property/${propertyId}`
      : '#';

  const [imageFailed, setImageFailed] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const {
    isInCompare,
    toggle: toggleCompare,
    actionState: compareState,
    isMaxReached,
  } = useCompare({ defaultEntityType: 'property' });
  const isCompared = propertyId ? isInCompare(propertyId, 'property') : false;
  const comparePending = compareState === 'pending';

  // Load saved state for signed-in users and stay in sync with other pages.
  useEffect(() => {
    if (!isSignedIn || !propertyId) {
      setIsFavorite(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/favorites?mode=ids', {
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        const ids: unknown[] = Array.isArray(data?.data?.propertyIds) ? data.data.propertyIds : [];
        if (!cancelled) setIsFavorite(ids.map((id) => String(id)).includes(propertyId));
      } catch {
        // Keep the last known state.
      }
    };

    load();

    const onSync = () => {
      load();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'highrise_favorite_toggle') load();
    };

    window.addEventListener('highrise_favorite_updated', onSync);
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('highrise_favorite_updated', onSync);
      window.removeEventListener('storage', onStorage);
    };
  }, [isSignedIn, propertyId]);

  const handleFavorite = async () => {
    if (!propertyId || favoriteBusy) return;

    if (!isSignedIn) {
      router.push('/login');
      return;
    }

    const previous = isFavorite;
    setIsFavorite(!previous);
    setFavoriteBusy(true);

    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ entityType: 'property', entityId: propertyId }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setIsFavorite(previous);
        return;
      }

      const saved = Boolean(data?.data?.isFavorited);
      setIsFavorite(saved);

      try {
        localStorage.setItem(
          'highrise_favorite_toggle',
          JSON.stringify({
            entityType: 'property',
            entityId: propertyId,
            action: data?.data?.action || (saved ? 'added' : 'removed'),
            timestamp: Date.now(),
          })
        );
      } catch {
        // Storage can be unavailable; the server state is already saved.
      }
      window.dispatchEvent(new CustomEvent('highrise_favorite_updated'));
      window.dispatchEvent(new CustomEvent('highrise:favorites-changed'));
    } catch {
      setIsFavorite(previous);
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleCompare = async () => {
    if (!propertyId || comparePending) return;
    await toggleCompare(propertyId, 'property', {
      title,
      imageUrl: image,
      price,
      slug: property.slug,
    });
  };

  return (
    <article className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {image && !imageFailed ? (
          <img
            src={getOptimizedImageUrl(image, { width: 800, watermark: true })}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
            <icons.ImageOff className="h-10 w-10" />
            <span className="text-xs font-semibold">No image available</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Top left: listing type, property type, owner gate */}
        <div className="absolute left-3 top-3 flex max-w-[65%] flex-wrap gap-1.5">
          {listingType && (
            <ListingTypeBadge
              listingType={listingType}
              size="sm"
              className="px-2 py-0.5 text-[10px] font-bold rounded-md shadow-md uppercase tracking-wide w-auto"
            />
          )}
          {typeText && (
            <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#004063] shadow-md">
              {typeText}
            </span>
          )}
          {ownerListed && (
            <span className="rounded-md bg-[#10b981] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
              Owner Listed
            </span>
          )}
        </div>

        {/* Top right: save and compare (labeled, keyboard focusable) */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleFavorite}
            disabled={favoriteBusy || !propertyId}
            aria-pressed={isFavorite}
            aria-label="Save property"
            title="Save property"
            className={`${ICON_BUTTON_BASE} ${
              isFavorite ? 'bg-[#ef4444] text-white' : 'bg-white/95 text-gray-600 hover:text-[#ef4444]'
            }`}
          >
            <icons.Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleCompare}
            disabled={comparePending || !propertyId || (!isCompared && isMaxReached)}
            aria-pressed={isCompared}
            aria-label="Compare property"
            title={!isCompared && isMaxReached ? 'Compare list is full (4 maximum)' : 'Compare property'}
            className={`${ICON_BUTTON_BASE} ${
              isCompared ? 'bg-[#10b981] text-white' : 'bg-white/95 text-gray-600 hover:text-[#029bba]'
            }`}
          >
            {isCompared ? <icons.Check className="h-4 w-4" /> : <icons.BarChart3 className="h-4 w-4" />}
          </button>
        </div>

        {/* Bottom left: price over the image */}
        <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-1.5 shadow-md">
          <p className="text-base font-black tracking-tight text-[#004063]">{formatPrice(price, listingType)}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {city && <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{city}</p>}

        <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] text-base font-bold leading-snug text-[#004063]">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:underline"
          >
            {title}
          </Link>
        </h3>

        {locality && (
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
            <icons.MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="line-clamp-1">{locality}</span>
          </p>
        )}

        {(area || beds > 0 || baths > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {area && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                <icons.Maximize className="h-3.5 w-3.5 text-[#029bba]" />
                {area}
              </span>
            )}
            {beds > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                <icons.BedDouble className="h-3.5 w-3.5 text-[#029bba]" />
                {beds} {beds === 1 ? 'Bed' : 'Beds'}
              </span>
            )}
            {baths > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                <icons.Bath className="h-3.5 w-3.5 text-[#029bba]" />
                {baths} {baths === 1 ? 'Bath' : 'Baths'}
              </span>
            )}
          </div>
        )}

        {/* Footer: poster name (agency name arrives in Phase 2b), then View Details */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <div className="min-w-0">
            {poster && <p className="truncate text-xs font-bold text-gray-800">{poster}</p>}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#004063] px-3.5 py-2 text-xs font-bold text-white transition-colors group-hover:bg-[#029bba]">
            View Details
            <icons.ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

export function HomeListingCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full animate-pulse flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="aspect-[16/10] bg-gray-200" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-3 w-1/3 rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
        <div className="mt-auto h-8 w-full rounded bg-gray-100" />
      </div>
    </div>
  );
}