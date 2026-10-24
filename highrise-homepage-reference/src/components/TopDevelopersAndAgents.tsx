import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  Star, 
  MapPin, 
  Layers, 
  PhoneCall, 
  ArrowRight, 
  CheckCircle2,
  Award,
  ChevronRight,
  TrendingUp,
  Briefcase
} from 'lucide-react';
import { Developer, RealEstateAgency, Project } from '../types/index.ts';
import { SAMPLE_DEVELOPERS, SAMPLE_AGENCIES, SAMPLE_PROJECTS } from '../data/mockData.ts';

interface TopDevelopersAndAgentsProps {
  developers?: Developer[];
  agencies?: RealEstateAgency[];
  projects?: Project[];
}

export const TopDevelopersAndAgents: React.FC<TopDevelopersAndAgentsProps> = ({
  developers = SAMPLE_DEVELOPERS,
  agencies = SAMPLE_AGENCIES,
  projects = SAMPLE_PROJECTS,
}) => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'all' | 'developers' | 'agents'>('all');

  // Combined list or filtered list
  const devItems = developers.map((dev) => ({
    type: 'developer' as const,
    id: dev.id,
    name: dev.name,
    tagline: dev.description,
    logoInitials: dev.logoInitials,
    rating: dev.rating || 4.9,
    reviewCount: dev.reviewCount || 150,
    activeProjects: dev.activeProjects,
    totalProjects: dev.totalProjects,
    headquarters: dev.headquarters,
    isVerified: dev.isVerified,
    badge: dev.editorialFeatured ? 'Featured Developer' : 'Accredited Developer',
    link: `/projects`,
    specialty: 'High-Rise Towers & Master Gated Communities',
    actionText: 'Explore Projects',
  }));

  const agencyItems = agencies.map((agency) => ({
    type: 'agency' as const,
    id: agency.id,
    name: agency.name,
    tagline: agency.tagline,
    logoInitials: agency.logoInitials,
    rating: agency.rating,
    reviewCount: agency.reviewCount,
    activeProjects: agency.activeProjects || 3,
    totalProjects: agency.listingsCount,
    headquarters: agency.operatingCities.join(', '),
    isVerified: true,
    badge: agency.badge,
    link: `/properties?city=${agency.operatingCities[0] || 'Islamabad'}`,
    specialty: agency.specialty,
    actionText: 'Browse Listings',
  }));

  const allItems = [...devItems, ...agencyItems];
  const displayedItems = 
    filterType === 'developers' 
      ? devItems 
      : filterType === 'agents' 
      ? agencyItems 
      : allItems.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#004063]/5 text-[#004063] border border-[#004063]/10 mb-2">
            <Award className="w-3.5 h-3.5 text-[#029bba]" />
            <span>Accredited Industry Partners</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Top Developers & Agents
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Discover Pakistan's premier builders and certified corporate agencies with authenticated ratings, verified NOC credentials, and active project counts.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-end border border-slate-200">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-[#004063] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Partners ({allItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('developers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'developers'
                ? 'bg-[#004063] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Top Developers ({devItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('agents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'agents'
                ? 'bg-[#004063] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Certified Agents ({agencyItems.length})
          </button>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#004063] shadow-xs hover:shadow-lg transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between group"
          >
            <div>
              {/* Top Row: Logo + Info + Verified Shield */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  {/* Distinctive Logo Badge */}
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#004063] to-[#007196] text-white flex items-center justify-center font-heading font-black text-base shadow-sm ring-2 ring-[#029bba]/30 shrink-0">
                    {item.logoInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-heading font-bold text-slate-900 text-base group-hover:text-[#004063] transition-colors">
                        {item.name}
                      </h3>
                      {item.isVerified && (
                        <span title="Verified Credentials & Registered License">
                          <ShieldCheck className="w-4 h-4 text-[#029bba] fill-[#029bba]/10" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{item.headquarters}</span>
                    </p>
                  </div>
                </div>

                {/* Partner Type Badge */}
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                  item.type === 'developer'
                    ? 'bg-[#004063]/10 text-[#004063] border border-[#004063]/20'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {item.badge}
                </span>
              </div>

              {/* Rating & Active Projects Count Bar */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/80 rounded-xl mb-4 border border-slate-100">
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shrink-0">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                      <span>{item.rating.toFixed(1)}</span>
                      <span className="text-[10px] font-normal text-slate-500">/ 5.0</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block leading-none">
                      {item.reviewCount} reviews
                    </span>
                  </div>
                </div>

                {/* Count of Active Projects Prominently Displayed */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-[#004063]/10 text-[#004063] flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#004063]">
                      {item.activeProjects} Active
                    </div>
                    <span className="text-[10px] text-slate-500 block leading-none">
                      {item.type === 'developer' ? 'Projects under dev' : 'Active mandates'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description / Specialty */}
              <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                {item.tagline}
              </p>

              {/* Specialty Tag */}
              <div className="mb-4">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Primary Focus:
                </span>
                <span className="text-[11px] font-medium text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-md inline-block line-clamp-1 border border-slate-200/50">
                  {item.specialty}
                </span>
              </div>
            </div>

            {/* Action Row */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate(item.link)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>{item.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = `tel:+923005551234`;
                }}
                title="Direct Phone Inquiry"
                className="w-9 h-9 rounded-xl border border-slate-200 hover:border-[#004063] text-slate-600 hover:text-[#004063] hover:bg-slate-50 flex items-center justify-center transition-colors shrink-0"
              >
                <PhoneCall className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
