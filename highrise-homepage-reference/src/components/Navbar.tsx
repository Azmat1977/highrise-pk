import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Menu, 
  X, 
  ChevronDown, 
  PlusCircle, 
  User, 
  Calculator, 
  ArrowRightLeft, 
  Landmark,
  Compass,
  Sparkles,
  Home,
  Key,
  Users,
  ShieldCheck,
  TrendingUp,
  Percent,
  Wallet,
  Building,
  Scale,
  MapPin,
  ArrowRight,
  ExternalLink,
  Tag,
  Search,
  BookOpen,
  HelpCircle,
  PhoneCall,
  Globe,
  DollarSign
} from 'lucide-react';
import { PropertyResearchTool } from '../types/index.ts';

interface NavbarProps {
  onOpenTool: (tool: PropertyResearchTool) => void;
  onOpenAuth: () => void;
  onOpenListProperty: () => void;
}

type MenuKey = 'buy' | 'rent' | 'projects' | 'agents' | 'developers' | 'societies' | 'more' | null;

const CITIES_LIST = [
  'All Cities',
  'Islamabad',
  'Lahore',
  'Karachi',
  'Rawalpindi',
  'Peshawar',
  'Multan',
  'Faisalabad'
];

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTool,
  onOpenAuth,
  onOpenListProperty,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [isClickLocked, setIsClickLocked] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Sticky Search Bar State (shown when scrolled)
  const [stickyPurpose, setStickyPurpose] = useState<'buy' | 'rent'>('buy');
  const [stickyCity, setStickyCity] = useState('All Cities');
  const [stickyQuery, setStickyQuery] = useState('');
  const [stickyCategory, setStickyCategory] = useState('all');

  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track window scroll to switch to search options bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 90) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = (menu: MenuKey) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    if (!isClickLocked) {
      setActiveMenu(menu);
    }
  };

  const handleMouseLeave = () => {
    if (!isClickLocked) {
      closeTimeoutRef.current = setTimeout(() => {
        setActiveMenu(null);
      }, 250);
    }
  };

  const handleToggleClick = (menu: MenuKey) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    if (activeMenu === menu && isClickLocked) {
      setActiveMenu(null);
      setIsClickLocked(false);
    } else {
      setActiveMenu(menu);
      setIsClickLocked(true);
    }
  };

  // Close dropdown on route change
  useEffect(() => {
    setActiveMenu(null);
    setIsClickLocked(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setIsClickLocked(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStickySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('purpose', stickyPurpose);
    if (stickyCity !== 'All Cities') params.set('city', stickyCity);
    if (stickyQuery.trim()) params.set('area', stickyQuery.trim());
    if (stickyCategory !== 'all') params.set('category', stickyCategory);
    navigate(`/properties?${params.toString()}`);
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* =========================================================================
            STATE A: STICKY SEARCH OPTIONS BAR (SHOWN ON SCROLL ON EACH PAGE)
            Disappears the main full navigation and displays clean, quick search controls
            ========================================================================= */}
        {isScrolled ? (
          <div className="flex items-center justify-between h-15 sm:h-16 gap-3 animate-in fade-in duration-200">
            {/* Left: Compact Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 group shrink-0 focus:outline-none"
              aria-label="Highrise.pk Home"
            >
              <img
                src="/assets/aistudio/Highrise_824d53ac.png"
                alt="Highrise.pk"
                className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Middle: Minimalist Sticky Search Omnibar */}
            <form 
              onSubmit={handleStickySearchSubmit}
              className="flex-1 max-w-3xl hidden md:flex items-center bg-slate-100/90 hover:bg-slate-100 border border-slate-200/90 rounded-2xl p-1 shadow-2xs focus-within:ring-2 focus-within:ring-[#004063]/15 focus-within:border-[#004063] transition-all"
            >
              {/* Purpose Switcher */}
              <div className="flex items-center bg-white rounded-xl p-0.5 border border-slate-200/80 shadow-2xs shrink-0 mr-1.5">
                <button
                  type="button"
                  onClick={() => setStickyPurpose('buy')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    stickyPurpose === 'buy'
                      ? 'bg-[#004063] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setStickyPurpose('rent')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    stickyPurpose === 'rent'
                      ? 'bg-[#004063] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rent
                </button>
              </div>

              {/* City Dropdown */}
              <div className="relative shrink-0 pr-2 border-r border-slate-200/90 flex items-center">
                <MapPin className="w-3.5 h-3.5 text-[#029bba] ml-1 mr-1" />
                <select
                  value={stickyCity}
                  onChange={(e) => setStickyCity(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-4 appearance-none"
                >
                  {CITIES_LIST.map((c) => (
                    <option key={c} value={c}>{c === 'All Cities' ? 'All Cities' : c}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none -ml-3" />
              </div>

              {/* Keyword / Society Search Input */}
              <div className="flex-1 px-3">
                <input
                  type="text"
                  value={stickyQuery}
                  onChange={(e) => setStickyQuery(e.target.value)}
                  placeholder="Search society, sector, or area (e.g. DHA, Bahria, F-11)..."
                  className="w-full bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Category Picker */}
              <div className="relative shrink-0 px-2 border-l border-slate-200/90 flex items-center">
                <select
                  value={stickyCategory}
                  onChange={(e) => setStickyCategory(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-4 appearance-none"
                >
                  <option value="all">All Types</option>
                  <option value="house">Houses</option>
                  <option value="apartment">Flats</option>
                  <option value="residential-plot">Plots</option>
                  <option value="commercial-plot">Commercial</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none -ml-3" />
              </div>

              {/* Search Action Button */}
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ml-1.5 shadow-xs"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Search</span>
              </button>
            </form>

            {/* Mobile Search Quick Action (when scrolled on phone) */}
            <div className="md:hidden flex-1 max-w-xs">
              <Link
                to="/properties"
                className="w-full py-1.5 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-[#029bba]" />
                <span className="truncate">Search properties across Pakistan...</span>
              </Link>
            </div>

            {/* Right Side in Sticky Mode: List Property + Menu Drawer toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenListProperty}
                className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#029bba]/10 text-[#007196] hover:bg-[#029bba] hover:text-white transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>List Property</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                aria-label="Open Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             STATE B: STANDARD CLEAN HEADER (COMPACT HEIGHT ~68-72px, PROPORTIONAL LOGO)
             Shown at the top of the page. Contains large logo & 7 main dropdown menus
             ========================================================================= */
          <div className="flex items-center justify-between h-16 sm:h-18 lg:h-20" ref={navRef}>
            {/* 1. Large Brand Logo (Proportional & Sharp) */}
            <Link
              to="/"
              className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba] rounded-2xl py-1 shrink-0"
              aria-label="Highrise.pk Home"
            >
              <img
                src="/assets/aistudio/Highrise_824d53ac.png"
                alt="Highrise.pk - Elevating Real Estate in Pakistan"
                className="h-11 sm:h-12 lg:h-13 w-auto object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-xs"
              />
            </Link>

            {/* 2. Desktop Navigation: Buy, Rent, New Projects, Agents, Developers, Societies, More */}
            <nav 
              aria-label="Main Navigation" 
              className="hidden xl:flex items-center gap-1 lg:gap-2 text-[15px] font-semibold text-slate-800"
            >
              {/* 1. BUY MENU */}
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('buy')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => handleToggleClick('buy')}
                  className={`px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer ${
                    activeMenu === 'buy' || location.search.includes('purpose=buy')
                      ? 'text-[#004063] bg-[#004063]/10 font-bold'
                      : 'text-slate-800 hover:text-[#004063] hover:bg-slate-100'
                  }`}
                >
                  <span>Buy</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${activeMenu === 'buy' ? 'rotate-180 text-[#004063]' : ''}`} />
                </button>

                {activeMenu === 'buy' && (
                  <div 
                    className="absolute top-full -left-12 mt-2 w-[760px] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseEnter={() => handleMouseEnter('buy')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Home className="w-4 h-4 text-[#029bba]" />
                          <span>Property Types</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { label: 'Houses & Luxury Villas', path: '/properties?purpose=buy&category=house', badge: 'Top Choice' },
                            { label: 'Modern Apartments & Flats', path: '/properties?purpose=buy&category=apartment' },
                            { label: 'Residential Plots', path: '/properties?purpose=buy&category=residential-plot', badge: 'High ROI' },
                            { label: 'Commercial Plots', path: '/properties?purpose=buy&category=commercial-plot' },
                            { label: 'Offices & Corporate Floors', path: '/properties?purpose=buy&category=shop-office' },
                            { label: 'Country Farmhouses', path: '/properties?purpose=buy&category=farmhouse' },
                          ].map((item) => (
                            <Link
                              key={item.label}
                              to={item.path}
                              className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors group"
                            >
                              <span className="font-medium group-hover:font-semibold">{item.label}</span>
                              {item.badge && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#029bba]/10 text-[#007196]">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <MapPin className="w-4 h-4 text-[#029bba]" />
                          <span>Major Cities</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { city: 'Islamabad', note: 'DHA, F-Sectors & Gulberg', path: '/properties?purpose=buy&city=Islamabad' },
                            { city: 'Lahore', note: 'DHA Phase 5 & 6, Gulberg III', path: '/properties?purpose=buy&city=Lahore' },
                            { city: 'Karachi', note: 'Clifton Beach, DHA Phase 8', path: '/properties?purpose=buy&city=Karachi' },
                            { city: 'Rawalpindi', note: 'Bahria Town, DHA Phase 1', path: '/properties?purpose=buy&city=Rawalpindi' },
                          ].map((metro) => (
                            <Link
                              key={metro.city}
                              to={metro.path}
                              className="block px-3 py-1.5 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors group"
                            >
                              <span className="text-sm font-semibold text-slate-900 group-hover:text-[#004063] block">
                                {metro.city}
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                {metro.note}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-[#00314d] to-[#004063] text-white rounded-2xl p-4.5 flex flex-col justify-between shadow-md">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#029bba]/20 text-[#8fc2d0] text-[11px] font-bold uppercase tracking-wider mb-2.5">
                            <Sparkles className="w-3 h-3 text-[#38aec7]" />
                            <span>AI Intelligence</span>
                          </div>
                          <h4 className="font-heading font-extrabold text-base text-white leading-tight">
                            Instant Property Valuation
                          </h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            Find out what any house, flat, or plot is worth based on live active listings.
                          </p>
                        </div>

                        <div className="pt-4 space-y-2">
                          <Link
                            to="/valuation"
                            className="w-full py-2 px-3 rounded-xl bg-[#029bba] hover:bg-[#38aec7] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                          >
                            <span>Calculate Fair Value</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to="/properties?ownerOnly=true"
                            className="text-[11px] text-[#8fc2d0] hover:text-white flex items-center justify-center gap-1 transition-colors text-center"
                          >
                            <Tag className="w-3 h-3" />
                            <span>Browse 0% Broker Fee Listings</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. RENT MENU */}
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('rent')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => handleToggleClick('rent')}
                  className={`px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer ${
                    activeMenu === 'rent' || location.search.includes('purpose=rent')
                      ? 'text-[#004063] bg-[#004063]/10 font-bold'
                      : 'text-slate-800 hover:text-[#004063] hover:bg-slate-100'
                  }`}
                >
                  <span>Rent</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${activeMenu === 'rent' ? 'rotate-180 text-[#004063]' : ''}`} />
                </button>

                {activeMenu === 'rent' && (
                  <div 
                    className="absolute top-full -left-16 mt-2 w-[720px] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseEnter={() => handleMouseEnter('rent')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Key className="w-4 h-4 text-[#029bba]" />
                          <span>Rental Types</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { label: 'Houses for Rent', path: '/properties?purpose=rent&category=house' },
                            { label: 'Flats & Apartments', path: '/properties?purpose=rent&category=apartment', badge: 'Popular' },
                            { label: 'Portions & Floors', path: '/properties?purpose=rent&category=house' },
                            { label: 'Furnished Apartments', path: '/properties?purpose=rent&category=apartment' },
                            { label: 'Commercial Offices', path: '/properties?purpose=rent&category=shop-office' },
                            { label: 'Retail Shops & Plazas', path: '/properties?purpose=rent&category=commercial-plot' },
                          ].map((item) => (
                            <Link
                              key={item.label}
                              to={item.path}
                              className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors group"
                            >
                              <span className="font-medium group-hover:font-semibold">{item.label}</span>
                              {item.badge && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <MapPin className="w-4 h-4 text-[#029bba]" />
                          <span>Rental Metros</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { city: 'Islamabad', note: 'Diplomatic Enclave, F-Sectors', path: '/properties?purpose=rent&city=Islamabad' },
                            { city: 'Lahore', note: 'Gulberg III, DHA Phase 5', path: '/properties?purpose=rent&city=Lahore' },
                            { city: 'Karachi', note: 'Clifton & Defence Phase 6', path: '/properties?purpose=rent&city=Karachi' },
                            { city: 'Rawalpindi', note: 'Bahria Town Safari Villas', path: '/properties?purpose=rent&city=Rawalpindi' },
                          ].map((metro) => (
                            <Link
                              key={metro.city}
                              to={metro.path}
                              className="block px-3 py-1.5 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors group"
                            >
                              <span className="text-sm font-semibold text-slate-900 group-hover:text-[#004063] block">
                                {metro.city}
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                {metro.note}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[#004063] block">
                            Direct Owner Rentals
                          </span>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Rent directly from verified property owners with 0% brokerage fee and transparent terms.
                          </p>
                        </div>
                        <Link
                          to="/properties?purpose=rent&ownerOnly=true"
                          className="mt-4 w-full py-2 px-3 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Browse 0% Fee Rentals</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. NEW PROJECTS MENU (MATCHING ZAMEEN.COM STRUCTURE) */}
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('projects')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => handleToggleClick('projects')}
                  className={`px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer ${
                    activeMenu === 'projects' || isActive('/projects')
                      ? 'text-[#004063] bg-[#004063]/10 font-bold'
                      : 'text-slate-800 hover:text-[#004063] hover:bg-slate-100'
                  }`}
                >
                  <span>New Projects</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${activeMenu === 'projects' ? 'rotate-180 text-[#004063]' : ''}`} />
                </button>

                {activeMenu === 'projects' && (
                  <div 
                    className="absolute top-full -left-28 mt-2 w-[940px] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseEnter={() => handleMouseEnter('projects')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="grid grid-cols-5 gap-5">
                      {/* Column 1: Browse */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Building2 className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Browse</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'All Projects', path: '/projects', isBold: true },
                            { name: 'Highrise Developments', path: '/projects?category=mixed-use' },
                            { name: 'Marketed by Highrise', path: '/projects' },
                            { name: 'Under Construction', path: '/projects?status=under-construction' },
                            { name: 'Ready to Move', path: '/projects?status=ready-to-move' },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className={`block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors ${
                                item.isBold ? 'font-bold text-[#004063]' : 'font-medium'
                              }`}
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: By City */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>By City</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'Lahore', path: '/projects?city=Lahore' },
                            { name: 'Karachi', path: '/projects?city=Karachi' },
                            { name: 'Islamabad', path: '/projects?city=Islamabad' },
                            { name: 'Rawalpindi', path: '/projects?city=Rawalpindi' },
                            { name: 'Peshawar', path: '/projects?city=Peshawar' },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: By Property Type */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Building className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>By Property Type</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'Apartments & Flats', path: '/projects?category=apartment' },
                            { name: 'Shops & Retail Arcades', path: '/projects?category=shop-office' },
                            { name: 'Corporate Offices', path: '/projects?category=shop-office' },
                            { name: 'Commercial Plazas', path: '/projects?category=commercial' },
                            { name: 'Penthouses & Sky Villas', path: '/projects?category=mixed-use' },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 4: By Budget */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <DollarSign className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>By Budget</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'Under 1 Crore', path: '/projects?maxPrice=10000000' },
                            { name: 'Under 5 Crore', path: '/projects?maxPrice=50000000' },
                            { name: 'Under 10 Crore', path: '/projects?maxPrice=100000000' },
                            { name: 'Under 20 Crore', path: '/projects?maxPrice=200000000' },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 5: Featured Development Showcase Card (Campaign Spotlight) */}
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 flex flex-col justify-between shadow-2xs">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              Featured Campaign
                            </span>
                          </div>

                          <div className="relative h-24 rounded-xl overflow-hidden mb-2">
                            <img
                              src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80"
                              alt="The Centaurus II Towers"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-[#004063] text-white">
                              CDA Approved
                            </span>
                          </div>

                          <h5 className="font-heading font-extrabold text-xs text-slate-900 leading-tight">
                            The Centaurus II Towers
                          </h5>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Islamabad • From PKR 1.95 Crore
                          </p>
                        </div>

                        <div className="pt-2">
                          <Link
                            to="/projects/the-centaurus-residences-ii"
                            className="w-full py-1.5 px-2 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>Payment Plan &rarr;</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. AGENTS MENU (REDESIGNED BY CATEGORY, TYPE & CITY LIKE ZAMEEN SCREENSHOT) */}
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('agents')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => handleToggleClick('agents')}
                  className={`px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer ${
                    activeMenu === 'agents'
                      ? 'text-[#004063] bg-[#004063]/10 font-bold'
                      : 'text-slate-800 hover:text-[#004063] hover:bg-slate-100'
                  }`}
                >
                  <span>Agents</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${activeMenu === 'agents' ? 'rotate-180 text-[#004063]' : ''}`} />
                </button>

                {activeMenu === 'agents' && (
                  <div 
                    className="absolute top-full -left-28 mt-2 w-[860px] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseEnter={() => handleMouseEnter('agents')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="grid grid-cols-4 gap-6">
                      {/* Column 1: Find an Agent (Cities) */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Find an Agent</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'Agents in Lahore', path: '/properties?purpose=buy&city=Lahore' },
                            { name: 'Agents in Karachi', path: '/properties?purpose=buy&city=Karachi' },
                            { name: 'Agents in Islamabad', path: '/properties?purpose=buy&city=Islamabad' },
                            { name: 'Agents in Rawalpindi', path: '/properties?purpose=buy&city=Rawalpindi' },
                            { name: 'All Verified Agents', path: '/properties?purpose=buy', isBold: true },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className={`block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors ${
                                item.isBold ? 'font-bold text-[#004063]' : 'font-medium'
                              }`}
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: Agencies by Category & Type */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Building className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Agencies by Type</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'Agencies for Houses', path: '/properties?purpose=buy&category=house' },
                            { name: 'Agencies for Residential Plots', path: '/properties?purpose=buy&category=residential-plot' },
                            { name: 'Agencies for Commercial Plazas', path: '/properties?purpose=buy&category=shop-office' },
                            { name: 'Agencies for High-Rise Flats', path: '/properties?purpose=buy&category=apartment' },
                            { name: 'Agencies for Farmhouses', path: '/properties?purpose=buy&category=farmhouse' },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: For Sellers & Brokers */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Users className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>For Sellers & Brokers</span>
                        </div>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenListProperty();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Go to Agent Profolio
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenListProperty();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Join Agent Network
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenListProperty();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Advertise on Highrise
                          </button>
                          <Link
                            to="/properties?ownerOnly=true"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-emerald-700 hover:bg-emerald-50 transition-colors font-semibold"
                          >
                            Direct Owner Marketplace
                          </Link>
                        </div>
                      </div>

                      {/* Column 4: Highrise Agent Hub Visual Card */}
                      <div className="bg-gradient-to-br from-[#002236] to-[#004063] rounded-2xl p-4 text-white flex flex-col justify-between shadow-md">
                        <div>
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#029bba]/30 text-[#8fc2d0] text-[10px] font-bold uppercase tracking-wider mb-2">
                            <span>Highrise Hub</span>
                          </div>
                          <h5 className="font-heading font-extrabold text-sm text-white leading-snug">
                            One Tool for All Your Brokerage Needs
                          </h5>
                          <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                            Manage properties, client leads, and verified deal closures in one high-performance dashboard.
                          </p>
                        </div>

                        <div className="pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenListProperty();
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-white text-[#004063] hover:bg-[#029bba] hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                          >
                            <span>Go to Profolio &rarr;</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. DEVELOPERS MENU (REDESIGNED WITH CITIES, CATEGORIES & TYPES) */}
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('developers')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => handleToggleClick('developers')}
                  className={`px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer ${
                    activeMenu === 'developers'
                      ? 'text-[#004063] bg-[#004063]/10 font-bold'
                      : 'text-slate-800 hover:text-[#004063] hover:bg-slate-100'
                  }`}
                >
                  <span>Developers</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${activeMenu === 'developers' ? 'rotate-180 text-[#004063]' : ''}`} />
                </button>

                {activeMenu === 'developers' && (
                  <div 
                    className="absolute top-full -left-36 mt-2 w-[860px] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseEnter={() => handleMouseEnter('developers')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="grid grid-cols-4 gap-6">
                      {/* Column 1: Developers by City */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Developers by City</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'Developers in Islamabad', path: '/projects?city=Islamabad' },
                            { name: 'Developers in Lahore', path: '/projects?city=Lahore' },
                            { name: 'Developers in Karachi', path: '/projects?city=Karachi' },
                            { name: 'Developers in Rawalpindi', path: '/projects?city=Rawalpindi' },
                            { name: 'All Master Developers', path: '/projects#developers', isBold: true },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className={`block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors ${
                                item.isBold ? 'font-bold text-[#004063]' : 'font-medium'
                              }`}
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: Categories & Specializations */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Building2 className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Developer Categories</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'High-Rise Commercial Towers', path: '/projects?category=commercial' },
                            { name: 'Luxury Residential Planners', path: '/projects?category=residential' },
                            { name: 'Gated Society Masterminds', path: '/projects?category=mixed-use' },
                            { name: 'Shopping Malls & Sky Villas', path: '/projects?category=commercial' },
                            { name: 'NOC Approved Builders', path: '/projects' },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: For Builders & Corporate Partners */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>For Builders & Partners</span>
                        </div>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenListProperty();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Register as Master Builder
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenListProperty();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Submit Project for NOC Audit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenListProperty();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Builder Accreditation Desk
                          </button>
                          <Link
                            to="/projects"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-[#007196] hover:bg-slate-50 transition-colors font-semibold"
                          >
                            Compare Delivered Projects
                          </Link>
                        </div>
                      </div>

                      {/* Column 4: Featured Developer Spotlight */}
                      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              Featured Developer
                            </span>
                          </div>
                          <h5 className="font-heading font-extrabold text-sm text-slate-900">
                            Apex Horizon Developers
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Blue Area, Islamabad • 14 Delivered Landmark Projects with complete CDA approvals.
                          </p>
                        </div>
                        <div className="pt-3">
                          <Link
                            to="/projects#developers"
                            className="w-full py-2 px-3 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>Explore Builders</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. SOCIETIES MENU (ORGANIZED BY CITY, APPROVAL AUTHORITIES & FEATURED SOCIETY) */}
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('societies')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => handleToggleClick('societies')}
                  className={`px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer ${
                    activeMenu === 'societies'
                      ? 'text-[#004063] bg-[#004063]/10 font-bold'
                      : 'text-slate-800 hover:text-[#004063] hover:bg-slate-100'
                  }`}
                >
                  <span>Societies</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${activeMenu === 'societies' ? 'rotate-180 text-[#004063]' : ''}`} />
                </button>

                {activeMenu === 'societies' && (
                  <div 
                    className="absolute top-full -right-60 mt-2 w-[920px] max-w-[92vw] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-5 sm:p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseEnter={() => handleMouseEnter('societies')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="grid grid-cols-5 gap-5">
                      {/* Column 1: Societies by City */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Societies by City</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'Societies in Islamabad', path: '/properties?city=Islamabad', note: 'CDA Approved' },
                            { name: 'Societies in Lahore', path: '/properties?city=Lahore', note: 'LDA Approved' },
                            { name: 'Societies in Karachi', path: '/properties?city=Karachi', note: 'SBCA Approved' },
                            { name: 'Societies in Rawalpindi', path: '/properties?city=Rawalpindi', note: 'RDA Approved' },
                            { name: 'All Masterplans', path: '/properties?area=DHA', isBold: true },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className={`block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors ${
                                item.isBold ? 'font-bold text-[#004063]' : 'font-medium'
                              }`}
                            >
                              <div>{item.name}</div>
                              {item.note && (
                                <span className="text-[10px] text-slate-400 block font-normal">{item.note}</span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: Islamabad & Rawalpindi Enclaves */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Compass className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Islamabad & Pindi</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'DHA Islamabad', sub: 'Phase 1, 2 & 5', path: '/properties?city=Islamabad&area=DHA+Phase+2' },
                            { name: 'Bahria Town', sub: 'Phase 7 & 8, Rawalpindi', path: '/properties?city=Rawalpindi&area=Bahria+Town' },
                            { name: 'CDA F-Sectors', sub: 'F-7, F-8, F-10, F-11', path: '/properties?city=Islamabad&area=Sector+F-11' },
                            { name: 'Gulberg Greens', sub: 'Executive Farmhouses', path: '/properties?city=Islamabad&area=Gulberg+Greens' },
                            { name: 'Park View City', sub: 'Zone IV, Malot Road', path: '/properties?city=Islamabad&area=Park+View+City' },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors"
                            >
                              <span className="font-semibold text-slate-800 block text-xs sm:text-sm">{item.name}</span>
                              <span className="text-[10px] text-slate-400 block">{item.sub}</span>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: Lahore & Karachi Enclaves */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Building className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Lahore & Karachi</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'DHA Lahore', sub: 'Phase 5, 6, 7 & 8', path: '/properties?city=Lahore&area=DHA+Phase+6' },
                            { name: 'Bahria Town Lahore', sub: 'Sector C & Golf View', path: '/properties?city=Lahore&area=Bahria+Town' },
                            { name: 'Gulberg Lahore', sub: 'Gulberg III Main Blvd', path: '/properties?city=Lahore&area=Gulberg+III' },
                            { name: 'DHA Karachi', sub: 'Phase 5, 6 & 8', path: '/properties?city=Karachi&area=DHA+Phase+8' },
                            { name: 'Clifton Beach', sub: 'Block 2, 4 & Marine Prom.', path: '/properties?city=Karachi&area=Clifton+Block+4' },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors"
                            >
                              <span className="font-semibold text-slate-800 block text-xs sm:text-sm">{item.name}</span>
                              <span className="text-[10px] text-slate-400 block">{item.sub}</span>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 4: Regulatory Authorities & NOCs */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Regulatory Authorities</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'CDA Approved (Islamabad)', path: '/properties?city=Islamabad' },
                            { name: 'LDA Approved (Lahore)', path: '/properties?city=Lahore' },
                            { name: 'SBCA / KDA (Karachi)', path: '/properties?city=Karachi' },
                            { name: 'RDA Approved (Rawalpindi)', path: '/properties?city=Rawalpindi' },
                            { name: 'Check Society NOC Status', path: '/properties', isSpecial: true },
                          ].map((item) => (
                            <Link
                              key={item.name}
                              to={item.path}
                              className={`block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm transition-colors ${
                                item.isSpecial
                                  ? 'text-[#007196] font-bold hover:bg-slate-50'
                                  : 'text-slate-700 hover:text-[#004063] hover:bg-slate-50 font-medium'
                              }`}
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Column 5: Featured Approved Society Showcase (Paid Campaign Spotlight) */}
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 flex flex-col justify-between shadow-2xs">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              Featured Society
                            </span>
                          </div>

                          <div className="relative h-24 rounded-xl overflow-hidden mb-2">
                            <img
                              src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80"
                              alt="DHA Phase 6, Lahore"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-[#004063] text-white">
                              LDA / DHA Approved
                            </span>
                          </div>

                          <h5 className="font-heading font-extrabold text-xs text-slate-900 leading-tight">
                            DHA Phase 6, Lahore
                          </h5>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            100% Cleared Masterplan • Underground Utilities & Prime Boulevards.
                          </p>
                        </div>

                        <div className="pt-2">
                          <Link
                            to="/properties?city=Lahore&area=DHA+Phase+6"
                            className="w-full py-1.5 px-2 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>Explore Plots &rarr;</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 7. MORE MENU (REDESIGNED WITH WEBSITE SECTIONS + TOOLS + SETTINGS LIKE ZAMEEN SCREENSHOT) */}
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('more')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => handleToggleClick('more')}
                  className={`px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                    activeMenu === 'more'
                      ? 'text-[#004063] bg-[#004063]/10 font-bold'
                      : 'text-slate-800 hover:text-[#004063] hover:bg-slate-100'
                  }`}
                >
                  <span>More</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${activeMenu === 'more' ? 'rotate-180 text-[#004063]' : ''}`} />
                </button>

                {activeMenu === 'more' && (
                  <div 
                    className="absolute top-full -right-16 mt-2 w-[980px] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseEnter={() => handleMouseEnter('more')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="grid grid-cols-5 gap-5">
                      {/* Section 1: Explore (Website Sections) */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Compass className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Explore</span>
                        </div>
                        <div className="space-y-1">
                          <Link
                            to="/properties"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            Area Guides
                          </Link>
                          <Link
                            to="/valuation"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            Property Price Index
                          </Link>
                          <Link
                            to="/projects"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            Property Trends
                          </Link>
                          <Link
                            to="/properties?area=DHA"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            Society Master Maps
                          </Link>
                          <Link
                            to="/properties?ownerOnly=true"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-emerald-700 hover:bg-emerald-50 transition-colors font-bold"
                          >
                            0% Broker Fee Deals
                          </Link>
                        </div>
                      </div>

                      {/* Section 2: Highrise Intelligence & Financial Tools */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Calculator className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Tools</span>
                        </div>
                        <div className="space-y-1">
                          <Link
                            to="/valuation"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-bold flex items-center justify-between"
                          >
                            <span>Property Valuation</span>
                            <span className="text-[10px] bg-[#029bba] text-white px-1.5 py-0.2 rounded font-bold">New</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenTool('emi');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Home Loan Calculator
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenTool('converter');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Area Unit Converter
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenTool('construction');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Construction Cost 2026
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenTool('roi');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Rental Yield & ROI
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenTool('installment');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Installment Planner
                          </button>
                        </div>
                      </div>

                      {/* Section 3: Community & Insights */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <BookOpen className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Community</span>
                        </div>
                        <div className="space-y-1">
                          <Link
                            to="/properties"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            Market News
                          </Link>
                          <Link
                            to="/properties"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            Highrise Blog
                          </Link>
                          <Link
                            to="/projects"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            Overseas Pakistani Guide
                          </Link>
                          <Link
                            to="/properties"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            NOC Verification FAQ
                          </Link>
                        </div>
                      </div>

                      {/* Section 4: Support & Company */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <HelpCircle className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Support</span>
                        </div>
                        <div className="space-y-1">
                          <a
                            href="mailto:support@highrise.pk"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            Help & Support
                          </a>
                          <a
                            href="https://wa.me/923001234567"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            Contact Us
                          </a>
                          <Link
                            to="/"
                            className="block px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium"
                          >
                            About Highrise.pk
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              onOpenAuth();
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-slate-700 hover:text-[#004063] hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                          >
                            Terms & Privacy
                          </button>
                        </div>
                      </div>

                      {/* Section 5: Site Settings */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#004063]">
                          <Globe className="w-3.5 h-3.5 text-[#029bba]" />
                          <span>Site Settings</span>
                        </div>
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Currency</span>
                            <span className="text-xs font-bold text-slate-800">PKR (Pakistani Rupee)</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Language</span>
                            <span className="text-xs font-bold text-slate-800">English</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Area Unit</span>
                            <span className="text-xs font-bold text-slate-800">Marla / Sq. Ft.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* 3. Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenListProperty}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#029bba]/10 text-[#007196] hover:bg-[#029bba] hover:text-white transition-all duration-200 border border-[#029bba]/20 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>List Property</span>
              </button>

              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#004063] hover:bg-[#007196] text-white shadow-xs transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </div>

            {/* 4. Mobile Hamburger Button */}
            <div className="xl:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenListProperty}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#029bba]/10 text-[#007196]"
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Mobile Navigation Drawer (Updated with all categories, cities & sections) */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-8 space-y-4 animate-in slide-in-from-top-4 duration-200 max-h-[85vh] overflow-y-auto">
          {/* Main Links */}
          <div className="space-y-1 text-base font-semibold">
            <Link
              to="/properties?purpose=buy"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Buy Properties</span>
              <Home className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/properties?purpose=rent"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Rent Properties</span>
              <Key className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/projects"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>New Projects</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/properties"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Agents & Real Estate Agencies</span>
              <Users className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/projects#developers"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Developers & Master Planners</span>
              <Building className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/properties?area=DHA"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Societies & Masterplans</span>
              <Compass className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/valuation"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl bg-[#004063]/5 text-[#004063] font-bold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#029bba]" />
                <span>AI Property Valuation Tool</span>
              </div>
              <span className="text-[10px] bg-[#029bba] text-white px-2 py-0.5 rounded-full">Free</span>
            </Link>
          </div>

          {/* Highrise Platform Features Quick Grid */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Highrise Tools & Intelligence
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  onOpenTool('valuation');
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-700 text-left font-semibold hover:bg-slate-100"
              >
                ⚡ Live Valuation
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTool('converter');
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-700 text-left font-semibold hover:bg-slate-100"
              >
                📐 Area Converter
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTool('construction');
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-700 text-left font-semibold hover:bg-slate-100"
              >
                🏗️ Construction Cost
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTool('emi');
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-700 text-left font-semibold hover:bg-slate-100"
              >
                💳 Home Loan EMI
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTool('roi');
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-700 text-left font-semibold hover:bg-slate-100"
              >
                📈 Rental ROI
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTool('installment');
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-700 text-left font-semibold hover:bg-slate-100"
              >
                🏛️ Installment Plan
              </button>
            </div>
          </div>

          {/* User Actions */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => {
                onOpenListProperty();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#029bba] text-white flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List Your Property</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenAuth();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#004063] text-white flex items-center justify-center gap-1.5"
            >
              <User className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
