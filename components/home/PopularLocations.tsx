import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, BadgeCheck, Building2, ArrowRight, Loader2 } from 'lucide-react';

interface CityItem {
  name: string;
  propertyCount?: number;
  imageUrl?: string;
  image?: string;
  isActive?: boolean;
  isFeaturedOnHomepage?: boolean;
  displayOrder?: number;
}

const DEFAULT_CITY_IMG = 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80';

const isBadString = (v: unknown): boolean => {
  if (typeof v !== 'string') return true;
  const s = v.trim().toLowerCase();
  return !s || s === 'undefined' || s === 'null' || s === 'n/a';
};

const getCityImage = (c: CityItem): string => {
  const raw = c.imageUrl ?? c.image;
  return typeof raw === 'string' && !isBadString(raw) ? raw : DEFAULT_CITY_IMG;
};

export default function PopularLocations({
  cities, loading
}: {
  cities: CityItem[]; loading: boolean;
}) {
  // Processing logic moved inside the component
  const getPickedCities = (): CityItem[] => {
    const allActive = cities.filter((c) => c.isActive !== false);
    const featured = allActive
      .filter((c) => c.isFeaturedOnHomepage)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || (b.propertyCount ?? 0) - (a.propertyCount ?? 0));
    const nonFeatured = allActive
      .filter((c) => !c.isFeaturedOnHomepage)
      .sort((a, b) => (b.propertyCount ?? 0) - (a.propertyCount ?? 0));

    const picked: CityItem[] = [];
    const used = new Set<string>();
    for (const c of [...featured, ...nonFeatured]) {
      const k = (c.name || '').trim().toLowerCase();
      if (!k || used.has(k)) continue;
      used.add(k);
      picked.push(c);
      if (picked.length >= 4) break;
    }
    return picked;
  };

  const picked = getPickedCities();

  return (
    <section className="py-20 bg-gray-50 relative overflow-hidden border-t border-gray-200">
      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-bold tracking-wide mb-4 border border-[#029bba]/20">
            <MapPin className="w-4 h-4" />
            Popular Locations
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#001f2b] mb-4 tracking-tight">
            Explore Properties <span className="text-[#029bba]">by City</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Discover your perfect property in Pakistan&apos;s most sought-after locations.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
          </div>
        ) : picked.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {picked.map((city, index) => (
                <Link key={city.name || index} href={`/properties?city=${encodeURIComponent(city.name || '')}`}>
                  <div className="group relative aspect-[4/5] rounded-3xl overflow-hidden cursor-pointer bg-gray-200 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 border border-black/5">
                    <Image
                      src={getCityImage(city)}
                      alt={city.name || 'City'}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    {/* Enterprise elegant gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#001f2b]/95 via-[#001f2b]/40 to-transparent transition-opacity duration-500 group-hover:from-[#029bba]/90" />
                    
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/20 shadow-sm">
                        <BadgeCheck className="w-3 h-3" /> {city.isFeaturedOnHomepage ? 'Featured' : 'Popular'}
                      </span>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-extrabold text-white mb-1 truncate drop-shadow-md">
                        {city.name}
                      </h3>
                      <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-4">
                        <Building2 className="w-4 h-4 text-[#06b6d4]" />
                        <span>{(city.propertyCount || 0).toLocaleString()}+ Verified Listings</span>
                      </div>
                      
                      {/* Hidden button that slides up on hover */}
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2 text-[#06b6d4] font-bold text-sm translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          Explore City <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-14">
              <Link href="/properties">
                <button className="px-8 py-4 rounded-xl bg-white border-2 border-[#029bba] text-[#029bba] font-bold inline-flex items-center gap-2 hover:bg-[#029bba] hover:text-white transition-all shadow-sm hover:shadow-lg">
                  <MapPin className="w-5 h-5" /> Explore All Locations <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#001f2b]">No cities configured</h3>
            <p className="text-sm text-gray-500 mt-1">Add cities in the admin panel.</p>
          </div>
        )}
      </div>
    </section>
  );
}