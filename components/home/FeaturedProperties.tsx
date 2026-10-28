import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SectionHeading from '@/components/ui/SectionHeading';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bath,
  BedDouble,
  Check,
  Heart,
  Loader2,
  MapPin,
  Maximize,
} from 'lucide-react';

interface PropertyItem {
  _id: string;
  id?: string;
  title: string;
  slug?: string;
  listingType: string;
  propertyType: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  images?: { url: string }[];
  city?: string;
  society?: string;
  area?: string;
  areaUnit?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
  monthlyInstallment?: number;
  installmentYears?: number;
}

interface FeaturedPropertiesProps {
  properties: PropertyItem[];
  installmentProperties: PropertyItem[];
  loading: boolean;
  loadingInstallments: boolean;
  favorites: Record<string, boolean>;
  favoritesLoading: Record<string, boolean>;
  onFavoriteToggle: (type: 'property' | 'project', id: string, e?: React.MouseEvent) => void;
  compareHelpers: {
    isInCompare: (id: string, type: 'property' | 'project') => boolean;
    toggleCompare: (id: string, type: 'property' | 'project') => Promise<boolean>;
    isMaxReached: boolean;
  };
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';

function formatPKR(price: number, listingType?: string): string {
  const suffix = listingType === 'rent' ? ' / mo' : '';
  if (!Number.isFinite(price) || price <= 0) return 'Price on request';
  if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(2)} Crore${suffix}`;
  if (price >= 100_000) return `PKR ${(price / 100_000).toFixed(2)} Lac${suffix}`;
  return `PKR ${price.toLocaleString('en-PK')}${suffix}`;
}

function toId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as { _id?: unknown; id?: unknown };
    if (typeof record._id === 'string') return record._id;
    if (typeof record.id === 'string') return record.id;
  }
  return '';
}

function listingLabel(listingType: string): string {
  if (listingType === 'rent') return 'For Rent';
  if (listingType === 'installment') return 'Installment';
  return 'For Sale';
}

function listingBadgeClass(listingType: string): string {
  if (listingType === 'rent') return 'bg-[#029bba]';
  if (listingType === 'installment') return 'bg-[#007196]';
  return 'bg-[#004063]';
}

function locationLabel(property: PropertyItem): string {
  return [property.society, property.area, property.city].filter(Boolean).join(', ');
}

function areaLabel(property: PropertyItem): string {
  if (!property.area) return 'Area on request';
  return `${property.area} ${property.areaUnit || 'Marla'}`;
}

export default function FeaturedProperties({
  properties,
  installmentProperties,
  loading,
  loadingInstallments,
  favorites,
  favoritesLoading,
  onFavoriteToggle,
  compareHelpers,
  showToast,
}: FeaturedPropertiesProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'installment'>('new');
  const { isInCompare, toggleCompare, isMaxReached } = compareHelpers;

  const activeProperties = useMemo(() => {
    const source = activeTab === 'installment' ? installmentProperties : properties;
    return source.slice(0, 6);
  }, [activeTab, installmentProperties, properties]);

  const isLoading = activeTab === 'installment' ? loadingInstallments : loading;
  const viewAllHref =
    activeTab === 'installment' ? '/properties?listingType=installment' : '/properties?sort=newest';

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-center gap-5 text-center">
          <SectionHeading
            eyebrow="Curated Opportunities"
            title="Featured Properties"
            subtitle="Handpicked homes, apartments and investment listings from our verified inventory."
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <div
              role="tablist"
              aria-label="Featured property collections"
              className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'new'}
                onClick={() => setActiveTab('new')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'new' ? 'bg-white text-[#004063] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                New Listings
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'installment'}
                onClick={() => setActiveTab('installment')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'installment'
                    ? 'bg-white text-[#004063] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Installments
              </button>
            </div>

            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#004063]/5 px-4 py-2 text-xs font-semibold text-[#004063] transition-colors hover:bg-[#029bba] hover:text-white"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#029bba]" />
            <span className="ml-3 text-sm text-slate-600">Loading properties&hellip;</span>
          </div>
        ) : activeProperties.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeProperties.map((property) => {
              const propertyId = toId(property._id) || toId(property.id);
              const favoriteKey = `property:${propertyId}`;
              const href = `/property/${property.slug || propertyId}`;
              const inCompare = isInCompare(propertyId, 'property');
              const price = formatPKR(property.price, property.listingType);

              return (
                <article
                  key={propertyId}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:border-[#029bba]/40 hover:shadow-xl"
                >
                  <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                    <Link href={href} className="relative block h-full w-full">
                      <Image
                        src={property.images?.[0]?.url || FALLBACK_PROPERTY_IMAGE}
                        alt={property.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {!property.images?.[0]?.url && <span className="sr-only">No property image available</span>}
                    </Link>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-70" />

                    <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm ${listingBadgeClass(
                          property.listingType
                        )}`}
                      >
                        {listingLabel(property.listingType)}
                      </span>
                      <span className="rounded-md bg-black/40 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                        {property.propertyType}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => onFavoriteToggle('property', propertyId, event)}
                      disabled={Boolean(favoritesLoading[favoriteKey])}
                      aria-label={
                        favorites[favoriteKey]
                          ? `Remove ${property.title} from favourites`
                          : `Add ${property.title} to favourites`
                      }
                      className={`absolute right-3 top-3 flex items-center justify-center rounded-full p-2 backdrop-blur-md transition-all ${
                        favorites[favoriteKey]
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-white/85 text-slate-700 hover:bg-white hover:text-rose-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${favorites[favoriteKey] ? 'fill-current' : ''}`} />
                    </button>

                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="text-xl font-bold drop-shadow-md">{price}</p>
                      {property.listingType === 'installment' && property.monthlyInstallment ? (
                        <p className="text-[11px] font-medium text-white/85">
                          From PKR {property.monthlyInstallment.toLocaleString('en-PK')} / mo
                          {property.installmentYears ? ` · ${property.installmentYears} yrs` : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        {property.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            <BadgeCheck className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Listed
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-[#029bba]" />
                          {property.city || 'Pakistan'}
                        </span>
                      </div>

                      <h3 className="mb-1 line-clamp-1 text-base font-semibold text-slate-900 transition-colors group-hover:text-[#007196] sm:text-lg">
                        <Link href={href}>{property.title}</Link>
                      </h3>

                      <p className="mb-3 line-clamp-1 text-xs text-slate-600">
                        {locationLabel(property) || 'Location available on listing'}
                      </p>

                      <div className="flex items-center gap-4 border-y border-slate-100 py-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Maximize className="h-4 w-4 text-slate-400" />
                          {areaLabel(property)}
                        </span>
                        {property.bedrooms ? (
                          <span className="flex items-center gap-1.5">
                            <BedDouble className="h-4 w-4 text-slate-400" />
                            {property.bedrooms} Beds
                          </span>
                        ) : null}
                        {property.bathrooms ? (
                          <span className="flex items-center gap-1.5">
                            <Bath className="h-4 w-4 text-slate-400" />
                            {property.bathrooms} Baths
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!inCompare && isMaxReached) {
                            showToast('Maximum 4 items can be compared', 'error');
                            return;
                          }
                          await toggleCompare(propertyId, 'property');
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                          inCompare
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-[#029bba] hover:text-[#029bba]'
                        }`}
                      >
                        {inCompare ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> In Compare
                          </>
                        ) : (
                          <>
                            <BarChart3 className="h-3.5 w-3.5" /> Compare
                          </>
                        )}
                      </button>

                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-[#004063] transition-colors group-hover:bg-[#029bba] group-hover:text-white"
                      >
                        <span>View Details</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <Banknote className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">
              {activeTab === 'installment' ? 'No installment listings yet' : 'No properties published yet'}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              {activeTab === 'installment'
                ? 'Installment listings will appear here as sellers publish payment-plan inventory.'
                : 'Approved property listings will appear here as soon as they are published.'}
            </p>
            <Link
              href={viewAllHref}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#004063] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#029bba]"
            >
              Browse All Properties
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
