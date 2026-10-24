import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  MapPin, 
  Flame, 
  Award, 
  PhoneCall, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { RealEstateAgency } from '../types/index.ts';
import { SAMPLE_AGENCIES } from '../data/mockData.ts';

interface TrendingAgenciesCarouselProps {
  agencies?: RealEstateAgency[];
}

export const TrendingAgenciesCarousel: React.FC<TrendingAgenciesCarouselProps> = ({
  agencies = SAMPLE_AGENCIES,
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getBadgeStyle = (badge: RealEstateAgency['badge']) => {
    switch (badge) {
      case 'Trending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Top Performer':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Super Agent':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Elite Partner':
      default:
        return 'bg-cyan-50 text-[#007196] border-cyan-200';
    }
  };

  const getBadgeIcon = (badge: RealEstateAgency['badge']) => {
    switch (badge) {
      case 'Trending':
        return <Flame className="w-3.5 h-3.5 text-amber-600" />;
      case 'Top Performer':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Super Agent':
        return <Award className="w-3.5 h-3.5 text-purple-600" />;
      case 'Elite Partner':
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-[#029bba]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#029bba]/10 text-[#007196] mb-2">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Marketplace Authority</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Trending Real Estate Agencies
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Verified corporate agencies and certified advisory teams with top transaction velocity and client reviews across Pakistan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll left agencies"
            className="p-2.5 rounded-xl border border-slate-200 hover:border-[#029bba] bg-white text-slate-700 hover:text-[#004063] shadow-xs transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll right agencies"
            className="p-2.5 rounded-xl border border-slate-200 hover:border-[#029bba] bg-white text-slate-700 hover:text-[#004063] shadow-xs transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Carousel Track */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {agencies.map((agency) => (
          <article
            key={agency.id}
            className="group shrink-0 w-80 sm:w-92 snap-start rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#029bba]/50 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Top Banner with Agency Identity */}
              <div className="bg-gradient-to-r from-[#002b42] to-[#004063] p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-13 h-13 rounded-2xl bg-white text-[#004063] font-heading font-black text-base flex items-center justify-center shadow-md border-2 border-[#029bba]">
                    {agency.logoInitials}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-white group-hover:text-[#38aec7] transition-colors leading-tight">
                      {agency.name}
                    </h3>
                    <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                      {agency.tagline}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-xs ${getBadgeStyle(agency.badge)}`}>
                    {getBadgeIcon(agency.badge)}
                    <span>{agency.badge}</span>
                  </span>
                </div>
              </div>

              {/* Agency Metrics & Info */}
              <div className="p-5 space-y-4">
                {/* Rating & Deals */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-amber-500 font-bold text-xs sm:text-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{agency.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{agency.reviewCount} Reviews</span>
                  </div>

                  <div className="border-x border-slate-200">
                    <div className="font-bold text-xs sm:text-sm text-slate-900">
                      {agency.listingsCount}+
                    </div>
                    <span className="text-[10px] text-slate-500">Live Listings</span>
                  </div>

                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#007196]">
                      {agency.verifiedDeals}+
                    </div>
                    <span className="text-[10px] text-slate-500">Deals Closed</span>
                  </div>
                </div>

                {/* Specialty */}
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                    Core Specialization
                  </p>
                  <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-150">
                    {agency.specialty}
                  </p>
                </div>

                {/* Operating Cities */}
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-[#029bba] shrink-0" />
                  <span className="font-medium truncate">
                    {agency.operatingCities.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 pt-0 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigate(`/properties?city=${encodeURIComponent(agency.operatingCities[0])}`)}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#004063] hover:bg-[#029bba] text-white transition-colors flex items-center justify-center gap-1 shadow-xs"
              >
                <span>View Listings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <a
                href={`tel:${agency.phone}`}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center gap-1 border border-slate-200"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#029bba]" />
                <span>Call Agency</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
