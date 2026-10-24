import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Bed, Bath, Maximize, ArrowUpRight } from 'lucide-react';
import { Property } from '../types/index.ts';
import { VerificationBadge } from './VerificationBadge.tsx';

interface PropertyCardProps {
  property: Property;
  layout?: 'grid' | 'list';
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  layout = 'grid',
  isFavorite = false,
  onToggleFavorite,
}) => {
  const isList = layout === 'list';

  return (
    <article
      className={`group bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-[#029bba]/40 transition-all duration-300 flex ${
        isList ? 'flex-col sm:flex-row' : 'flex-col'
      }`}
    >
      {/* Thumbnail */}
      <div className={`relative overflow-hidden ${isList ? 'sm:w-80 shrink-0 h-60 sm:h-auto' : 'h-56 w-full'}`}>
        <img
          src={property.images[0]}
          alt={property.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Graceful fallback image
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

        {/* Purpose Badge (Buy/Rent) & Direct Owner Indicator */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider text-white shadow-xs ${
              property.purpose === 'buy' ? 'bg-[#004063]' : 'bg-[#029bba]'
            }`}
          >
            For {property.purpose === 'buy' ? 'Sale' : 'Rent'}
          </span>
          {property.isDirectOwner && (
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white shadow-sm flex items-center gap-1">
              <span>Owner Listed</span>
              <span className="text-[10px] bg-emerald-700/80 px-1 py-0.2 rounded font-normal">0% Fee</span>
            </span>
          )}
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-black/40 backdrop-blur-xs text-white">
            {property.categoryLabel}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          aria-label={isFavorite ? `Remove ${property.title} from favorites` : `Add ${property.title} to favorites`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite?.(property.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
            isFavorite
              ? 'bg-rose-500 text-white shadow-md'
              : 'bg-white/80 text-slate-700 hover:bg-white hover:text-rose-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Price overlay on image for quick scan */}
        <div className="absolute bottom-3 left-3 text-white">
          <p className="text-xl font-bold font-heading drop-shadow-md">
            {property.priceFormatted}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col justify-between flex-1">
        <div>
          {/* Top meta: Verification & City */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <VerificationBadge
              status={property.verificationStatus}
              label={property.verificationLabel}
            />
            <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
              {property.city}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-heading font-semibold text-slate-900 group-hover:text-[#007196] transition-colors line-clamp-1 text-base sm:text-lg mb-1">
            <Link to={`/properties/${property.slug}`}>
              {property.title}
            </Link>
          </h3>

          {/* Location line */}
          <p className="text-xs text-slate-600 line-clamp-1 mb-3">
            {property.address}
          </p>

          {/* Specs Bar (Size, Beds, Baths) */}
          <div className="flex items-center gap-4 py-3 border-y border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <Maximize className="w-4 h-4 text-slate-400" />
              <span>{property.size} {property.sizeUnit}</span>
            </div>
            {property.bedrooms !== undefined && (
              <div className="flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-slate-400" />
                <span>{property.bedrooms} Beds</span>
              </div>
            )}
            {property.bathrooms !== undefined && (
              <div className="flex items-center gap-1.5">
                <Bath className="w-4 h-4 text-slate-400" />
                <span>{property.bathrooms} Baths</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar: Agent & Action */}
        <div className="mt-4 pt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src={property.agent.avatar}
              alt={property.agent.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-200"
            />
            <div className="leading-tight">
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                {property.isDirectOwner && property.ownerContactName ? property.ownerContactName : property.agent.name}
              </p>
              <p className={`text-[10px] truncate max-w-[130px] ${property.isDirectOwner ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                {property.isDirectOwner ? 'Direct Owner • 0% Fee' : property.agent.agency}
              </p>
            </div>
          </div>

          <Link
            to={`/properties/${property.slug}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-[#004063] group-hover:bg-[#029bba] group-hover:text-white transition-all duration-200"
          >
            <span>View Details</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
