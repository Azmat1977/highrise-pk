import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, Star, Heart, Eye, BadgeCheck, BedDouble, Bath, 
  Maximize, Check, BarChart3, Home, ArrowRight, Loader2
} from 'lucide-react';

// Interfaces matching your index.tsx
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
}

interface FeaturedPropertiesProps {
  properties: PropertyItem[];
  loading: boolean;
  favorites: Record<string, boolean>;
  favoritesLoading: Record<string, boolean>;
  onFavoriteToggle: (type: 'property' | 'project', id: string, e?: React.MouseEvent) => void;
  compareHelpers: {
    isInCompare: (id: string, type: 'property' | 'project') => boolean;
    toggleCompare: (id: string, type: 'property' | 'project') => Promise<boolean>;
    isMaxReached: boolean;
  };
  showToast: (msg: string, type: 'success'|'error'|'info') => void;
}

// Helpers
function formatPKR(price: number, listingType?: string): string {
  const suffix = listingType === 'rent' ? '/mo' : '';
  if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(2)} Crore${suffix}`;
  if (price >= 100_000) return `PKR ${(price / 100_000).toFixed(2)} Lac${suffix}`;
  return `PKR ${price.toLocaleString()}${suffix}`;
}

function getLocationLabel(p: PropertyItem): string {
  return [p.society, p.area, p.city].filter(Boolean).join(', ');
}

function getAreaLabel(p: PropertyItem): string {
  if (!p.area) return 'N/A';
  return `${p.area} ${p.areaUnit || 'Marla'}`;
}

function getPrimaryImageUrl(p: PropertyItem): string | null {
  return p.images?.[0]?.url || null;
}

function listingTypeLabel(type: string): string {
  const map: Record<string, string> = { full_payment: 'For Sale', installment: 'Installment', rent: 'For Rent' };
  return map[type] || type;
}

function toIdString(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v._id) return v._id.toString();
  if (v.id) return v.id.toString();
  return '';
}

export default function FeaturedProperties({
  properties, loading, favorites, favoritesLoading, onFavoriteToggle, compareHelpers, showToast
}: FeaturedPropertiesProps) {

  const { isInCompare, toggleCompare, isMaxReached } = compareHelpers;

  return (
    <section className="py-16 bg-gray-50 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-medium mb-4">
            <Star className="w-4 h-4 inline mr-1" />
            New Listings
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            <span className="text-[#029bba]">Newly Added</span> Properties
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Recently added approved listings from across Pakistan.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
            <span className="ml-2 text-gray-600">Loading properties...</span>
          </div>
        ) : properties.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {properties.slice(0, 6).map((property) => {
                const propId = toIdString(property._id) || toIdString(property.id);
                const fKey = `property:${propId}`;
                const cardHref = `/property/${property.slug || propId}`;

                return (
                  <div key={propId} className="overflow-hidden bg-white border border-gray-100 hover:border-[#029bba]/30 rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(2,155,186,0.15)] flex flex-col justify-between">
                    <div>
                      <Link href={cardHref} className="block aspect-[16/10] overflow-hidden relative">
                        {getPrimaryImageUrl(property) ? (
                          <Image
                            src={getPrimaryImageUrl(property)!}
                            alt={property.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400" aria-label="No property image available">
                            <Home className="h-10 w-10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                        {/* Top Left Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-lg backdrop-blur-sm ${
                            property.listingType === 'rent' ? 'bg-orange-500/90 text-white'
                            : property.listingType === 'installment' ? 'bg-purple-500/90 text-white'
                            : 'bg-[#029bba]/90 text-white'
                          }`}>
                            {listingTypeLabel(property.listingType)}
                          </span>
                          {property.isFeatured && (
                            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-lg">
                              <Star className="w-3 h-3 fill-white" /> Featured
                            </span>
                          )}
                        </div>

                        {/* Top Right Buttons */}
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                          {(property.images?.length ?? 0) > 1 && (
                            <span className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-lg flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {property.images!.length}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => onFavoriteToggle('property', propId, e)}
                            disabled={Boolean(favoritesLoading[fKey])}
                            className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all shadow-lg ${
                              favorites[fKey] ? 'bg-red-50 hover:bg-red-100' : 'bg-white/90 hover:bg-white'
                            }`}
                          >
                            <Heart className={`w-4 h-4 transition-colors ${favorites[fKey] ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`} fill={favorites[fKey] ? 'currentColor' : 'none'} />
                          </button>
                        </div>

                        {/* Bottom Tags */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-semibold rounded-lg shadow-sm">
                            {property.propertyType}
                          </span>
                          {property.isVerified && (
                            <span className="px-2 py-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                              <BadgeCheck className="w-3 h-3" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-3 right-3">
                          <div className="px-3 py-1.5 bg-white rounded-lg shadow-lg">
                            <p className="text-[#029bba] font-bold text-sm">{formatPKR(property.price, property.listingType)}</p>
                          </div>
                        </div>
                      </Link>

                      {/* Content */}
                      <div className="p-4">
                        <Link href={cardHref}>
                          <h3 className="font-bold text-gray-900 mb-1.5 line-clamp-1 group-hover:text-[#029bba] transition-colors text-base">
                            {property.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
                          <span className="line-clamp-1">{getLocationLabel(property)}</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          {(property.bedrooms ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg text-xs font-medium text-gray-700">
                              <BedDouble className="w-3.5 h-3.5 text-gray-500" /> {property.bedrooms} Beds
                            </span>
                          )}
                          {(property.bathrooms ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg text-xs font-medium text-gray-700">
                              <Bath className="w-3.5 h-3.5 text-gray-500" /> {property.bathrooms} Baths
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg text-xs font-medium text-gray-700">
                            <Maximize className="w-3.5 h-3.5 text-gray-500" /> {getAreaLabel(property)}
                          </span>
                        </div>

                        {/* Compare Button */}
                        <div className="mt-3 relative z-30" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (!isInCompare(propId, 'property') && isMaxReached) {
                                showToast('Maximum 4 items can be compared', 'error'); return;
                              }
                              await toggleCompare(propId, 'property');
                            }}
                            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                              isInCompare(propId, 'property')
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-sm'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-[#029bba] hover:text-[#029bba] hover:bg-[#029bba]/5 shadow-sm'
                            }`}
                          >
                            {isInCompare(propId, 'property') ? (
                              <><Check className="w-3.5 h-3.5 text-emerald-600" /><span>Added to Compare</span></>
                            ) : (
                              <><BarChart3 className="w-3.5 h-3.5 text-[#029bba]" /><span>Add to Compare</span></>
                            )}
                          </button>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                              <Home className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs text-gray-500">Highrise Listing</span>
                          </div>
                          <Link href={cardHref} className="text-[#029bba] font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                            View Details <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-12">
              <Link href="/properties?sort=newest">
                <button className="px-8 py-4 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold transition-colors inline-flex items-center gap-2 shadow-lg hover:shadow-xl">
                  Browse Recent Properties <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <h3 className="text-xl font-semibold text-gray-900">No Recent Properties Yet</h3>
          </div>
        )}
      </div>
    </section>
  );
}