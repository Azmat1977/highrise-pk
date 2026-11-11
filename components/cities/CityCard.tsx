import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowRight } from 'lucide-react';
import { icons } from '@/lib/design-system/icons';
import { cities as staticCities } from '@/data/cities';
import { useThemeColors } from '@/lib/design-system/hooks';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';

interface CityCardProps {
  city: typeof staticCities[0];
  className?: string;
  isCarousel?: boolean;
}

export default function CityCard({ city, className = '', isCarousel = false }: CityCardProps) {
  const colors = useThemeColors();

  // Ensure image URL is properly optimized through Cloudinary pipeline with watermark
  // The pipeline handles both Cloudinary URLs and local URLs transparently
  const imageUrl = getOptimizedImageUrl(city.imageUrl, {
    width: isCarousel ? 670 : 320,
    height: isCarousel ? 419 : 256,
    crop: 'fill',
    gravity: 'auto',
    watermark: true,
    watermarkScale: 0.16,
    watermarkOpacity: 75,
    watermarkOffsetX: 36,
    watermarkOffsetY: 28,
  });

  // Format price from count (e.g., "1,420+" -> 1420000)
  const parseCount = (count: string): number => {
    const match = count.match(/(\d+)\+/);
    return match ? parseInt(match[1]) * 1000 : 0;
  };

  // Format price for display
  const formatPrice = (price: number): string => {
    if (price >= 10000000) {
      return `${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `${(price / 100000).toFixed(1)} Lakh`;
    }
    return `PKR ${price.toLocaleString()}`;
  };

  return (
    <article
      className={`group relative w-full overflow-hidden rounded-2xl bg-white border border-navy-100 shadow-sm hover:-translate-y-1 hover:border-[#029bba]/40 hover:shadow-xl transition-all duration-300 ${className}`}
      style={{
        backgroundColor: colors.cardBg,
        borderColor: colors.borderDefault,
      }}
    >
      <Link
        href={`/properties?city=${city.slug}`}
        className="block h-full"
        aria-label={`Explore ${city.name} properties`}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src={imageUrl}
              alt={`${city.landmark} landmark, ${city.name}, Pakistan`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority={isCarousel}
            />
          </div>
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#00293a]/90 via-[#00293a]/40 to-transparent" />
          <div className="absolute left-3 top-3 z-20">
            <span className="rounded-lg bg-[#004063]/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-sm">
              {city.name}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 z-20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#38aec7] truncate drop-shadow">
              {city.kicker}
            </p>
            <h3 className="text-xs font-bold text-white sm:text-sm truncate">
              {city.landmark}
            </h3>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-[#004063]">
              <MapPin className="h-4 w-4 shrink-0 text-[#029bba]" />
              <span className="truncate">{city.name}</span>
            </h4>
            <span className="inline-flex shrink-0 items-center rounded-full bg-[#029bba]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#007196]">
              {city.count && city.count !== "0"
                ? `${city.count.replace(/\++$/, '')}+ Properties`
                : "Ready to explore"}
            </span>
          </div>

          <p
            className="mt-2 line-clamp-2 text-[13px] leading-5"
            style={{ color: colors.textMuted }}
          >
            {city.description}
          </p>

          <div className="mt-auto pt-4">
            <div
              className="mb-3 h-px"
              style={{ backgroundColor: colors.borderLight }}
            />
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold"
              style={{ color: colors.primary }}
            >
              View {city.name} Properties
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}