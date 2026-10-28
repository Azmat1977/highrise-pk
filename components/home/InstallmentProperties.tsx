import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Banknote, Calculator, ShieldCheck, Award, 
  BadgeCheck, ArrowRight, Heart, MapPin, Loader2, Home 
} from 'lucide-react';

interface PropertyItem {
  _id: string;
  id?: string;
  title: string;
  slug?: string;
  listingType: string;
  propertyType: string;
  price: number;
  images?: { url: string }[];
  city?: string;
  society?: string;
  area?: string;
  monthlyInstallment?: number;
  installmentYears?: number;
  downPaymentPercentage?: number;
}

interface InstallmentPropertiesProps {
  properties: PropertyItem[];
  loading: boolean;
  favorites: Record<string, boolean>;
  favoritesLoading: Record<string, boolean>;
  onFavoriteToggle: (type: 'property' | 'project', id: string, e?: React.MouseEvent) => void;
}

function formatPKR(price: number, listingType?: string): string {
  const suffix = listingType === 'rent' ? '/mo' : '';
  if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(2)} Crore${suffix}`;
  if (price >= 100_000) return `PKR ${(price / 100_000).toFixed(2)} Lac${suffix}`;
  return `PKR ${price.toLocaleString()}${suffix}`;
}

function toIdString(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v._id) return v._id.toString();
  if (v.id) return v.id.toString();
  return '';
}

export default function InstallmentProperties({
  properties, loading, favorites, favoritesLoading, onFavoriteToggle
}: InstallmentPropertiesProps) {
  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-br from-[#f8fcfd] via-[#eef7fa] to-[#e6f4f8]">
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#029bba]/20 shadow-sm mb-5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#004063]">Smart Financing</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#001f2b] mb-4 tracking-tight">
            Own Your <span className="text-[#029bba]">Dream Property</span><br />
            With Flexible <span className="text-[#029bba]">Installments</span>
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            No need to pay 100% upfront. Choose properties with <strong className="text-[#004063]">3-20 year payment plans</strong> from trusted developers.
          </p>
        </div>

        {/* EMI Calculator Banner */}
        <div className="max-w-5xl mx-auto mb-12">
          <Link href="/tools/home-loan-calculator">
            <div className="group relative bg-white rounded-2xl border-2 border-[#029bba]/20 hover:border-[#029bba] shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col md:flex-row items-center gap-4 p-5 md:p-6 cursor-pointer">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#029bba] to-[#004063]" />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center shadow-lg flex-shrink-0">
                <Calculator className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-bold text-[#001f2b]">Calculate Your EMI Before You Buy</h3>
                <p className="text-xs md:text-sm text-gray-600">Compare home loan rates from <strong className="text-[#004063]">10 Pakistani banks</strong>.</p>
              </div>
              <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-semibold text-sm shadow-md group-hover:shadow-lg transition-all whitespace-nowrap flex items-center gap-2">
                Open Calculator <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Link>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white/50 rounded-3xl max-w-md mx-auto">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
            <span className="ml-3 text-gray-600 font-medium">Loading properties...</span>
          </div>
        ) : properties.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {properties.slice(0, 6).map((property, idx) => {
              const propId = toIdString(property._id) || toIdString(property.id);
              const fKey = `property:${propId}`;
              const isFeatured = idx === 0;

              return (
                <Link key={propId} href={`/property/${property.slug || propId}`}>
                  <div className="group relative bg-white border-2 border-gray-100 hover:border-[#029bba]/40 rounded-3xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                    {isFeatured && (
                      <div className="absolute top-3 left-3 z-20">
                        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#029bba] to-[#004063] text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          Best Deal
                        </span>
                      </div>
                    )}
                    
                    {/* Image */}
                    <div className="aspect-[16/10] overflow-hidden relative bg-gray-100">
                      <Image
                        src={property.images?.[0]?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      
                      <div className="absolute top-3 right-3">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); onFavoriteToggle('property', propId, e); }}
                          disabled={Boolean(favoritesLoading[fKey])}
                          className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center shadow-md transition-all ${
                            favorites[fKey] ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
                          }`}
                        >
                          <Heart className="w-4 h-4" fill={favorites[fKey] ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <div className="px-3 py-1.5 bg-white rounded-lg shadow-md">
                          <p className="text-[#004063] font-bold text-sm">{formatPKR(property.price)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-grow flex flex-col">
                      <h3 className="font-bold text-[#001f2b] mb-1.5 line-clamp-1 group-hover:text-[#029bba] transition-colors">
                        {property.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
                        <span className="line-clamp-1">{property.society || property.area}, {property.city}</span>
                      </p>

                      {/* Progress Bar (Branded) */}
                      <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-[#f8fcfd] to-[#eef7fa] border border-[#029bba]/10">
                        <div className="flex justify-between mb-2 text-[10px] font-bold uppercase">
                          <span className="text-gray-500">Payment Plan</span>
                          <span className="text-[#029bba]">{property.installmentYears || '3'} Years</span>
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-gradient-to-r from-[#029bba] to-[#06b6d4]" style={{ width: `${property.downPaymentPercentage || 20}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span><strong className="text-[#004063]">{property.downPaymentPercentage || '20'}%</strong> Down</span>
                          <span><strong className="text-[#004063]">{100 - Number(property.downPaymentPercentage || 20)}%</strong> EMI</span>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Monthly</p>
                          <p className="text-[#029bba] font-extrabold text-lg mt-0.5">
                            {formatPKR(property.monthlyInstallment || 0, 'rent')}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[#004063] font-bold text-sm group-hover:text-[#029bba] transition-all">
                          View Plan <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}

        <div className="text-center mt-12">
          <Link href="/properties?listingType=installment">
            <button className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#004063] hover:to-[#029bba] text-white font-bold shadow-xl transition-all hover:-translate-y-0.5">
              <Banknote className="w-5 h-5" /> Explore All Installment Properties <ArrowRight className="w-5 h-5 group-hover:translate-x-1" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}