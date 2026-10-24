import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Star,
  Compass,
  AlertCircle,
  ArrowRight,
  Filter,
  Layers,
  MapPin,
  Clock,
  Landmark,
  UtensilsCrossed,
  Briefcase,
  Store,
  Home as HomeIcon,
  Crown,
  ChevronRight
} from 'lucide-react';
import { SAMPLE_PROJECTS, SAMPLE_DEVELOPERS } from '../data/mockData.ts';
import { Project, ProjectFilterState } from '../types/index.ts';
import { filterProjects } from '../utils/filterLogic.ts';
import { ProjectCard } from '../components/ProjectCard.tsx';
import { ProjectSpotlight } from '../components/ProjectSpotlight.tsx';
import { DeveloperCard } from '../components/DeveloperCard.tsx';
import { Breadcrumbs } from '../components/Breadcrumbs.tsx';

export const ProjectsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialCity = searchParams.get('city') || 'All Cities';
  const initialCategory = searchParams.get('category') || 'all';
  const initialStatus = searchParams.get('status') || 'all';
  const initialBudget = searchParams.get('budget') || 'all';
  const initialNoc = searchParams.get('noc') || 'all';

  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState(initialStatus);
  const [budget, setBudget] = useState(initialBudget);
  const [noc, setNoc] = useState(initialNoc);

  // Sync external search params
  useEffect(() => {
    const c = searchParams.get('city');
    if (c) setCity(c);
    const cat = searchParams.get('category');
    if (cat) setCategory(cat);
    const s = searchParams.get('status');
    if (s) setStatus(s);
  }, [searchParams]);

  const updateFilters = (newFilters: Partial<ProjectFilterState>) => {
    const params = new URLSearchParams(searchParams);
    if (newFilters.city) {
      if (newFilters.city === 'All Cities') params.delete('city');
      else params.set('city', newFilters.city);
    }
    if (newFilters.category !== undefined) {
      if (newFilters.category === 'all') params.delete('category');
      else params.set('category', newFilters.category);
    }
    if (newFilters.status !== undefined) {
      if (newFilters.status === 'all') params.delete('status');
      else params.set('status', newFilters.status);
    }
    if (newFilters.budget !== undefined) {
      if (newFilters.budget === 'all') params.delete('budget');
      else params.set('budget', newFilters.budget);
    }
    if (newFilters.noc !== undefined) {
      if (newFilters.noc === 'all') params.delete('noc');
      else params.set('noc', newFilters.noc);
    }

    setSearchParams(params);
  };

  const handleReset = () => {
    setCity('All Cities');
    setCategory('all');
    setStatus('all');
    setBudget('all');
    setNoc('all');
    setSearchParams(new URLSearchParams());
  };

  const filteredProjects = useMemo(() => {
    return filterProjects(SAMPLE_PROJECTS, {
      city,
      category,
      status,
      budget,
      noc,
    });
  }, [city, category, status, budget, noc]);

  const spotlightProjects = SAMPLE_PROJECTS.filter((p) => p.featured);
  const trendingProjects = filteredProjects.filter((p) => p.trending);
  const highlightedProjects = filteredProjects.filter((p) => p.highlighted);

  const activeFilterCount = [
    city !== 'All Cities',
    category !== 'all',
    status !== 'all',
    budget !== 'all',
    noc !== 'all',
  ].filter(Boolean).length;

  // Highrise Unit Types showcase (exclusively vertical highrise units, NO plots or independent houses)
  const highriseUnits = [
    {
      id: 'apartments',
      name: 'Luxury Apartments',
      count: '1, 2 & 3 Bed Suites',
      icon: <HomeIcon className="w-5 h-5 text-[#029bba]" />,
      queryCategory: 'apartment',
      description: 'High-rise residential units with panoramic Margalla & skyline vistas.',
    },
    {
      id: 'penthouses',
      name: 'Sky Penthouses',
      count: 'Duplex & Full Floor',
      icon: <Crown className="w-5 h-5 text-amber-500" />,
      queryCategory: 'apartment',
      description: 'Exclusive top-floor residences with private infinity splash pools.',
    },
    {
      id: 'shops',
      name: 'Commercial Retail Shops',
      count: 'Ground & Atrium Frontage',
      icon: <Store className="w-5 h-5 text-[#007196]" />,
      queryCategory: 'shop-office',
      description: 'High-footfall retail boutiques inside master shopping malls.',
    },
    {
      id: 'offices',
      name: 'Corporate Offices',
      count: 'Grade-A Business Floors',
      icon: <Briefcase className="w-5 h-5 text-[#004063]" />,
      queryCategory: 'shop-office',
      description: 'Turnkey IT, multinational, and consulting corporate executive suites.',
    },
    {
      id: 'food-court',
      name: 'Food Court Outlets',
      count: 'Turnkey Kiosks & Cafes',
      icon: <UtensilsCrossed className="w-5 h-5 text-rose-500" />,
      queryCategory: 'shop-office',
      description: 'High-yield culinary spaces inside shopping mall atrium floors.',
    },
    {
      id: 'halls',
      name: 'Banquet & Event Halls',
      count: 'Large-Format Spaces',
      icon: <Landmark className="w-5 h-5 text-indigo-600" />,
      queryCategory: 'shop-office',
      description: 'Convention halls, exhibition chambers, and private celebration spaces.',
    },
  ];

  // Project Categories
  const projectCategories = [
    {
      id: 'mixed-use',
      name: 'Mixed-Use Towers',
      count: 'Flagship Developments',
      desc: 'Combining luxury residences, retail shopping atriums, and corporate floors.',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'residential',
      name: 'Residential Enclaves',
      count: 'Gated Luxury Living',
      desc: 'Dedicated vertical condominiums and smart designer residential towers.',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'commercial',
      name: 'Commercial Malls & Centers',
      count: 'Business & Retail Hubs',
      desc: 'High-traffic commercial shopping malls and corporate executive towers.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    },
  ];

  // Project Types / Investment Modes
  const projectTypes = [
    {
      status: 'ready-to-move',
      title: 'Ready to Move',
      badge: 'Immediate Possession',
      desc: 'Completed structural projects with operational utilities and fast handover.',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      status: 'under-construction',
      title: 'On Easy Installments',
      badge: 'Flexible 2-4 Years',
      desc: 'Milestone-linked quarterly schedules with booking starting at 15-20%.',
      color: 'bg-cyan-50 text-[#007196] border-cyan-200',
    },
    {
      status: 'under-construction',
      title: 'Under Construction',
      badge: 'High Appreciation',
      desc: 'Early to mid-stage developments offering prime floor selection at launch rates.',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      status: 'launching-soon',
      title: 'New Launches',
      badge: 'Pre-Launch Pricing',
      desc: 'Newly announced developments open for advance priority allocation.',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ];

  const cityShortcuts = [
    { name: 'Islamabad', count: '14 Developments', active: city === 'Islamabad' },
    { name: 'Lahore', count: '18 Developments', active: city === 'Lahore' },
    { name: 'Karachi', count: '12 Developments', active: city === 'Karachi' },
    { name: 'Rawalpindi', count: '9 Developments', active: city === 'Rawalpindi' },
    { name: 'Peshawar', count: '5 Developments', active: city === 'Peshawar' },
    { name: 'Faisalabad', count: '4 Developments', active: city === 'Faisalabad' },
    { name: 'Multan', count: '4 Developments', active: city === 'Multan' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Projects & Developments' }]} />

      {/* SECTION A: PAGE HEADER & PROMINENT FILTERS */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#029bba]/10 text-[#007196] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#029bba]" />
              <span>Development Intelligence & High-Rise Discovery</span>
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-4xl text-slate-900 tracking-tight">
              Discover Real Estate Projects
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Explore residential and commercial developments, compare project milestones, and evaluate verified developers across Pakistan.
            </p>
          </div>

          <div className="text-xs text-slate-500 text-left sm:text-right">
            <span>Showing <strong>{filteredProjects.length}</strong> vetted developments</span>
          </div>
        </div>

        {/* Primary-Styled Filters Panel matching Home search bar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* All Cities */}
            <div className="rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs focus-within:ring-2 focus-within:ring-[#029bba] transition-all bg-white">
              <div className="bg-[#004063] px-3 py-1.5 flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white">
                  City
                </label>
                <MapPin className="w-3 h-3 text-[#38aec7]" />
              </div>
              <div className="p-1.5 bg-white">
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    updateFilters({ city: e.target.value });
                  }}
                  className="w-full bg-white text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer py-1 px-1"
                >
                  <option value="All Cities">All Pakistan</option>
                  <option value="Islamabad">Islamabad</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Rawalpindi">Rawalpindi</option>
                  <option value="Peshawar">Peshawar</option>
                  <option value="Faisalabad">Faisalabad</option>
                  <option value="Multan">Multan</option>
                </select>
              </div>
            </div>

            {/* Category */}
            <div className="rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs focus-within:ring-2 focus-within:ring-[#029bba] transition-all bg-white">
              <div className="bg-[#004063] px-3 py-1.5 flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white">
                  Category
                </label>
                <Building2 className="w-3 h-3 text-[#38aec7]" />
              </div>
              <div className="p-1.5 bg-white">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    updateFilters({ category: e.target.value });
                  }}
                  className="w-full bg-white text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer py-1 px-1"
                >
                  <option value="all">All Categories</option>
                  <option value="mixed-use">Mixed-Use Towers</option>
                  <option value="residential">Residential Enclaves</option>
                  <option value="commercial">Commercial Centers</option>
                </select>
              </div>
            </div>

            {/* Development Status */}
            <div className="rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs focus-within:ring-2 focus-within:ring-[#029bba] transition-all bg-white">
              <div className="bg-[#004063] px-3 py-1.5 flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white">
                  Development Status
                </label>
                <Clock className="w-3 h-3 text-[#38aec7]" />
              </div>
              <div className="p-1.5 bg-white">
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    updateFilters({ status: e.target.value });
                  }}
                  className="w-full bg-white text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer py-1 px-1"
                >
                  <option value="all">All Statuses</option>
                  <option value="under-construction">Under Construction</option>
                  <option value="ready-to-move">Ready to Move</option>
                  <option value="launching-soon">New Launch</option>
                </select>
              </div>
            </div>

            {/* Budget Range */}
            <div className="rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs focus-within:ring-2 focus-within:ring-[#029bba] transition-all bg-white">
              <div className="bg-[#004063] px-3 py-1.5 flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white">
                  Starting Budget
                </label>
                <TrendingUp className="w-3 h-3 text-[#38aec7]" />
              </div>
              <div className="p-1.5 bg-white">
                <select
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    updateFilters({ budget: e.target.value });
                  }}
                  className="w-full bg-white text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer py-1 px-1"
                >
                  <option value="all">Any Budget</option>
                  <option value="15000000">Up to 1.5 Crore</option>
                  <option value="25000000">Up to 2.5 Crore</option>
                  <option value="40000000">Up to 4 Crore</option>
                  <option value="80000000">Up to 8 Crore</option>
                </select>
              </div>
            </div>

            {/* NOC / Approval info */}
            <div className="rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs focus-within:ring-2 focus-within:ring-[#029bba] transition-all bg-white">
              <div className="bg-[#004063] px-3 py-1.5 flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white">
                  NOC Authority
                </label>
                <ShieldCheck className="w-3 h-3 text-[#38aec7]" />
              </div>
              <div className="p-1.5 bg-white">
                <select
                  value={noc}
                  onChange={(e) => {
                    setNoc(e.target.value);
                    updateFilters({ noc: e.target.value });
                  }}
                  className="w-full bg-white text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer py-1 px-1"
                >
                  <option value="all">All Authorities</option>
                  <option value="CDA">CDA Approved (Islamabad)</option>
                  <option value="LDA">LDA Approved (Lahore)</option>
                  <option value="SBCA">SBCA Approved (Karachi)</option>
                  <option value="RDA">RDA Approved (Rawalpindi)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              {activeFilterCount > 0 ? `${activeFilterCount} active filter criteria` : 'Showing all verified development records'}
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EXPLORE PROJECTS BY CATEGORY (Requested by user) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#029bba] mb-1">
              Architecture Types
            </p>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">
              Explore Projects by Category
            </h2>
          </div>
          {category !== 'all' && (
            <button
              type="button"
              onClick={() => { setCategory('all'); updateFilters({ category: 'all' }); }}
              className="text-xs font-semibold text-[#007196] hover:underline"
            >
              Clear Category Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {projectCategories.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => {
                  const nextVal = isSelected ? 'all' : cat.id;
                  setCategory(nextVal);
                  updateFilters({ category: nextVal });
                }}
                className={`group relative rounded-3xl overflow-hidden cursor-pointer border-2 transition-all duration-300 p-6 flex flex-col justify-end min-h-[220px] ${
                  isSelected
                    ? 'border-[#029bba] ring-4 ring-[#029bba]/20 shadow-xl'
                    : 'border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#029bba]/50'
                }`}
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#002236]/95 via-black/40 to-transparent" />
                
                <div className="relative z-10 text-white space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#029bba] text-white">
                    {cat.count}
                  </span>
                  <h3 className="font-heading font-bold text-lg text-white group-hover:text-[#38aec7] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-200 leading-snug">
                    {cat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* EXPLORE PROJECTS BY TYPE / INVESTMENT MODE (Requested by user) */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#029bba] mb-1">
            Investment Timeline
          </p>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">
            Explore Projects by Development Type
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projectTypes.map((pt, idx) => {
            const isSelected = status === pt.status;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const nextVal = isSelected ? 'all' : pt.status;
                  setStatus(nextVal);
                  updateFilters({ status: nextVal });
                }}
                className={`text-left p-5 rounded-2xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-[#029bba] bg-[#004063] text-white shadow-md'
                    : 'bg-white border-slate-200/90 hover:border-[#029bba]/50 shadow-xs'
                }`}
              >
                <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold mb-2.5 border ${
                  isSelected ? 'bg-white/20 text-white border-white/30' : pt.color
                }`}>
                  {pt.badge}
                </span>
                <h3 className={`font-heading font-bold text-base mb-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {pt.title}
                </h3>
                <p className={`text-xs leading-relaxed ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                  {pt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* EXPLORE PROJECTS BY CITY SHORTCUTS (Requested by user) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#029bba] mb-1">
              Metropolitan Hubs
            </p>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">
              Explore Projects by City
            </h2>
          </div>
          {city !== 'All Cities' && (
            <button
              type="button"
              onClick={() => { setCity('All Cities'); updateFilters({ city: 'All Cities' }); }}
              className="text-xs font-semibold text-[#007196] hover:underline"
            >
              Show All Cities
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          {cityShortcuts.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                const nextVal = city === c.name ? 'All Cities' : c.name;
                setCity(nextVal);
                updateFilters({ city: nextVal });
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                city === c.name
                  ? 'bg-[#004063] text-white border-[#004063] shadow-xs'
                  : 'bg-white border-slate-200/90 text-slate-700 hover:border-[#029bba] hover:text-[#007196]'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${city === c.name ? 'text-[#38aec7]' : 'text-slate-400'}`} />
              <span>{c.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                city === c.name ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {c.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* EXPLORE HIGHRISE PROJECT UNITS (Strictly vertical highrise units: Apartments, Penthouses, Shops, Offices, Food Courts, Halls) */}
      <section className="bg-gradient-to-br from-slate-900 to-[#004063] rounded-3xl p-6 sm:p-10 text-white shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#029bba]/30 text-[#8fc2d0] text-xs font-semibold mb-2">
              <Building2 className="w-4 h-4 text-[#38aec7]" />
              <span>High-Rise Vertical Inventory Only</span>
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
              Explore High-Rise Project Units
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Exclusively dedicated to vertical high-rise developments. Plots, raw land, and standalone houses are excluded here and listed in the general properties catalog.
            </p>
          </div>

          <Link
            to="/properties?purpose=buy"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white text-white hover:text-[#004063] text-xs font-semibold border border-white/20 transition-all duration-200 inline-flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>View All in Properties Catalog</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {highriseUnits.map((u) => (
            <div
              key={u.id}
              onClick={() => navigate(`/properties?category=${u.queryCategory}&purpose=buy`)}
              className="p-5 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-slate-900 border border-white/15 hover:border-transparent transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 group-hover:bg-[#029bba]/10 flex items-center justify-center transition-colors">
                    {u.icon}
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20 group-hover:bg-[#004063]/10 text-white group-hover:text-[#004063] transition-colors">
                    {u.count}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-base mb-1 group-hover:text-[#004063] transition-colors">
                  {u.name}
                </h3>
                <p className="text-xs text-slate-300 group-hover:text-slate-600 leading-relaxed mb-4">
                  {u.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 group-hover:border-slate-100 flex items-center justify-between text-xs font-semibold text-[#8fc2d0] group-hover:text-[#029bba]">
                <span>Discover {u.name}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION B: FEATURED PROJECT SPOTLIGHT */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#029bba]" />
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">
            Featured Project Spotlight
          </h2>
        </div>
        <ProjectSpotlight projects={spotlightProjects} />
      </section>

      {/* SECTION C: TRENDING PROJECTS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#029bba]" />
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">
              Trending Projects
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            High investor engagement
          </span>
        </div>

        {trendingProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingProjects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            No trending developments match the current filter selection.
          </div>
        )}
      </section>

      {/* SECTION D: HIGHLIGHTED PROJECTS */}
      {highlightedProjects.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">
                Highlighted Developments
              </h2>
              <p className="text-xs text-slate-500">
                Commercial and residential masterplans with milestone verified progress.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {highlightedProjects.map((p) => (
              <ProjectCard key={p.id} project={p} variant="highlighted" />
            ))}
          </div>
        </section>
      )}

      {/* SECTION E & F: FEATURED & TRUSTED DEVELOPERS */}
      <section id="developers" className="space-y-6 pt-6 border-t border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#004063]/10 text-[#004063] mb-2">
            <Building2 className="w-3.5 h-3.5 text-[#029bba]" />
            <span>Developer Network</span>
          </div>
          <h2 className="font-heading font-bold text-xl sm:text-3xl text-slate-900">
            Featured & Trusted Developers
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Review delivery histories, active project portfolios, and verified corporate information. Click any project inside a card to preview its specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SAMPLE_DEVELOPERS.map((dev) => (
            <DeveloperCard
              key={dev.id}
              developer={dev}
              allProjects={SAMPLE_PROJECTS}
            />
          ))}
        </div>
      </section>

      {/* SECTION H: EMPTY STATES */}
      {filteredProjects.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-heading font-bold text-slate-900 text-xl">
            No Projects Match the Filter Criteria
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Try resetting your authority selection or adjusting the budget filter to discover more developments.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2.5 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Reset Project Filters
          </button>
        </div>
      )}
    </div>
  );
};
