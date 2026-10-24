import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Landmark, ArrowUpRight } from 'lucide-react';

import faisalMosqueImg from '../assets/images/faisal_mosque_islamabad_1792492185477.jpg';
import badshahiMosqueImg from '../assets/images/badshahi_mosque_lahore_1792492186093.jpg';
import mazarQuaidImg from '../assets/images/mazar_e_quaid_karachi_1792492186660.jpg';
import rawatFortImg from '../assets/images/rawat_fort_rawalpindi_1792492207915.jpg';
import babeKhyberImg from '../assets/images/babe_khyber_peshawar_1792492208783.jpg';
import ghantaGharImg from '../assets/images/ghanta_ghar_faisalabad_1792492210251.jpg';
import multanShrineImg from '../assets/images/multan_rukn_alam_shrine_1792492212093.jpg';

export interface CityLandmark {
  id: string;
  name: string;
  tagline: string;
  landmarkName: string;
  landmarkType: string;
  propertiesCount: string;
  image: string;
  description: string;
}

export const PAKISTANI_CITIES: CityLandmark[] = [
  {
    id: 'islamabad',
    name: 'Islamabad',
    tagline: 'Federal Capital & Margalla Foothills',
    landmarkName: 'Shah Faisal Mosque',
    landmarkType: 'National Architectural Icon',
    propertiesCount: '1,420+ Properties',
    image: faisalMosqueImg,
    description: 'Iconic triangular modern Islamic architecture nestled beneath the scenic Margalla Hills.',
  },
  {
    id: 'lahore',
    name: 'Lahore',
    tagline: 'Heart of Punjab & Mughal Heritage',
    landmarkName: 'Badshahi Mosque & Minar-e-Pakistan',
    landmarkType: 'Mughal Architectural Masterpiece',
    propertiesCount: '2,850+ Properties',
    image: badshahiMosqueImg,
    description: 'Centuries of grand Mughal red sandstone architecture, cultural boulevards, and premium developments.',
  },
  {
    id: 'karachi',
    name: 'Karachi',
    tagline: 'City of Lights & Arabian Sea Hub',
    landmarkName: 'Mazar-e-Quaid (Founder’s Shrine)',
    landmarkType: 'National Mausoleum & Monument',
    propertiesCount: '3,100+ Properties',
    image: mazarQuaidImg,
    description: 'Pakistan’s coastal metropolis featuring Quaid’s white marble shrine, Clifton towers, and seaside commerce.',
  },
  {
    id: 'rawalpindi',
    name: 'Rawalpindi',
    tagline: 'Garrison Heritage & Historic Twin City',
    landmarkName: 'Rawat Fort Archaeological Citadel',
    landmarkType: '15th-Century Gakhar Fortification',
    propertiesCount: '940+ Properties',
    image: rawatFortImg,
    description: 'Ancient stone fortifications on the Grand Trunk Road, bustling bazaars, and modern gated communities.',
  },
  {
    id: 'peshawar',
    name: 'Peshawar',
    tagline: 'City of Flowers & Frontier Gateway',
    landmarkName: 'Bab-e-Khyber & Bala Hissar Fort',
    landmarkType: 'Historic Gateway & Khyber Pass',
    propertiesCount: '620+ Properties',
    image: babeKhyberImg,
    description: 'Legendary stone gateway into the historic Khyber Pass steeped in centuries of frontier heritage.',
  },
  {
    id: 'faisalabad',
    name: 'Faisalabad',
    tagline: 'Manchester of Pakistan & Eight Bazaars',
    landmarkName: 'Ghanta Ghar (Historic Clock Tower)',
    landmarkType: 'Victorian 1903 Eight-Bazaar Landmark',
    propertiesCount: '510+ Properties',
    image: ghantaGharImg,
    description: 'Vibrant industrial center planned around the historic 1903 Victorian red brick clock tower.',
  },
  {
    id: 'multan',
    name: 'Multan',
    tagline: 'City of Saints & Turquoise Glaze',
    landmarkName: 'Shrine of Shah Rukn-e-Alam',
    landmarkType: '14th-Century Blue Glazed Octagonal Shrine',
    propertiesCount: '480+ Properties',
    image: multanShrineImg,
    description: 'Majestic octagonal Sufi shrine with turquoise Multani tilework and massive dome, surrounded by growing modern sectors.',
  },
];

export const CitiesLandmarksCarousel: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCityClick = (cityName: string) => {
    navigate(`/properties?city=${encodeURIComponent(cityName)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#029bba]/10 text-[#007196] mb-2">
            <Landmark className="w-3.5 h-3.5 text-[#029bba]" />
            <span>Regional Discovery</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Explore Properties by Major Cities
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Discover verified homes, towers, and plots across Pakistan's architectural capitals. Click any city to view active listings.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll left cities"
            className="p-2.5 rounded-xl border border-slate-200 hover:border-[#029bba] bg-white text-slate-700 hover:text-[#004063] shadow-xs transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll right cities"
            className="p-2.5 rounded-xl border border-slate-200 hover:border-[#029bba] bg-white text-slate-700 hover:text-[#004063] shadow-xs transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Carousel Track */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {PAKISTANI_CITIES.map((city) => (
          <article
            key={city.id}
            onClick={() => handleCityClick(city.name)}
            className="group shrink-0 w-72 sm:w-84 snap-start rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#029bba]/50 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Landmark Image */}
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
                <img
                  src={city.image}
                  alt={`${city.name} - ${city.landmarkName}`}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {/* City Tag on Image */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#004063]/90 text-white backdrop-blur-xs shadow-xs">
                    {city.name}
                  </span>
                </div>

                {/* Landmark Name Badge */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#38aec7]">
                    {city.landmarkType}
                  </p>
                  <p className="text-sm font-heading font-bold text-white drop-shadow-sm truncate">
                    {city.landmarkName}
                  </p>
                </div>
              </div>

              {/* City Details */}
              <div className="p-5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="font-heading font-bold text-lg text-slate-900 group-hover:text-[#007196] transition-colors flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#029bba]" />
                    <span>{city.name}</span>
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#029bba]/10 text-[#007196]">
                    {city.propertiesCount}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {city.description}
                </p>
              </div>
            </div>

            {/* Bottom Explore Action */}
            <div className="px-5 pb-5 pt-0">
              <div className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-50 group-hover:bg-[#004063] group-hover:text-white text-[#004063] border border-slate-200/80 group-hover:border-transparent transition-all duration-200 flex items-center justify-between">
                <span>View {city.name} Properties</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
