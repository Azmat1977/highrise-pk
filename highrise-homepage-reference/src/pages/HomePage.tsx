import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Search, 
  MapPin, 
  FileCheck2, 
  Compass, 
  BarChart3, 
  Sparkles,
  Calculator,
  ArrowRightLeft,
  Landmark,
  Home,
  Layers,
  ChevronRight,
  Send,
  CheckCircle2
} from 'lucide-react';
import { SAMPLE_PROPERTIES, SAMPLE_PROJECTS, SAMPLE_DEVELOPERS, SAMPLE_AGENCIES } from '../data/mockData.ts';
import { PropertyCard } from '../components/PropertyCard.tsx';
import { ProjectCard } from '../components/ProjectCard.tsx';
import { SearchTabs } from '../components/SearchTabs.tsx';
import { CitiesLandmarksCarousel } from '../components/CitiesLandmarksCarousel.tsx';
import { BrowseCategories } from '../components/BrowseCategories.tsx';
import { PropertyResearchToolsBar } from '../components/PropertyResearchToolsBar.tsx';
import { TopDevelopersAndAgents } from '../components/TopDevelopersAndAgents.tsx';
import { PropertyResearchTool } from '../types/index.ts';

interface HomePageProps {
  onOpenTool: (tool: PropertyResearchTool) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenTool }) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setNewsletterSubscribed(true);
      setTimeout(() => setNewsletterSubscribed(false), 5000);
      setNewsletterEmail('');
    }
  };

  const directOwnerProperties = SAMPLE_PROPERTIES.filter((p) => p.isDirectOwner);
  const featuredProperties = SAMPLE_PROPERTIES.filter((p) => !p.isDirectOwner);

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* SECTION A: PREMIUM HERO */}
      <section className="relative min-h-[500px] sm:min-h-[540px] flex items-center pt-8 pb-14 bg-gradient-to-b from-[#002b42] to-[#004063] text-white overflow-hidden">
        {/* Background Architectural Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80"
            alt="Luxury Architecture in Pakistan"
            className="w-full h-full object-cover opacity-25 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#002236]/95 via-[#004063]/85 to-[#002236]/90" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          {/* Trust Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#029bba]/20 border border-[#029bba]/40 text-[#8fc2d0] text-xs font-semibold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <ShieldCheck className="w-4 h-4 text-[#38aec7]" />
            <span>Elevating Real Estate in Pakistan</span>
          </div>

          {/* Headline */}
          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight mb-4">
            Find Your Place. <br className="hidden sm:inline" />
            <span className="text-[#38aec7]">Invest With Confidence.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
            Explore verified properties, discover trusted developments, compare builders, and calculate market valuations across Pakistan.
          </p>

          {/* Elevated Master Search Console */}
          <div className="mt-4">
            <SearchTabs />
          </div>
        </div>
      </section>

      {/* SECTION B: BROWSE PROPERTY CATEGORIES WITH ICONS (Zameen reference inspired, modern & elegant) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BrowseCategories />
      </section>

      {/* REGIONAL CITIES WITH ARCHAEOLOGICAL LANDMARKS CAROUSEL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CitiesLandmarksCarousel />
      </section>

      {/* SECTION C: FEATURED PROPERTIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#029bba] mb-1">
              Curated Opportunities
            </p>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900">
              Featured Properties
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Handpicked residential homes, luxury apartments, and commercial investments.
            </p>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#004063]/5 hover:bg-[#029bba] text-[#004063] hover:text-white transition-colors"
          >
            <span>View All Properties ({SAMPLE_PROPERTIES.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProperties.slice(0, 6).map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              isFavorite={favorites.includes(property.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>

      {/* SECTION: EXPLORE DIRECT OWNER LISTINGS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>0% Brokerage • 100% Direct Owner Contact</span>
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Explore Direct Owner Listings
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Deal directly with verified individual property owners without paying any broker commissions. Authenticated title documents and direct negotiation.
            </p>
          </div>
          <Link
            to="/properties?ownerOnly=true"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <span>View All Owner Listings ({directOwnerProperties.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {directOwnerProperties.slice(0, 3).map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              isFavorite={favorites.includes(property.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>

      {/* SECTION: USER PROPERTY RESEARCH TOOLS (Housing.com inspired with Primary Color #004063 branding) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PropertyResearchToolsBar onOpenTool={onOpenTool} />
      </section>

      {/* SECTION D: DISCOVER PROJECTS */}
      <section className="bg-slate-100/70 py-16 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#029bba] mb-1">
                Development Landmarks
              </p>
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900">
                Discover Leading Projects
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Approved master developments with milestone tracking and installment options.
              </p>
            </div>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#004063] text-white hover:bg-[#029bba] transition-colors shadow-xs"
            >
              <span>Explore All Projects ({SAMPLE_PROJECTS.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_PROJECTS.slice(0, 3).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION E: TRUST AND TRANSPARENCY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#029bba]/10 text-[#007196] text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-[#029bba]" />
            <span>The Highrise Advantage</span>
          </div>
          <h2 className="font-heading font-bold text-2xl sm:text-4xl text-slate-900 mb-3">
            More Clarity. More Confidence. Better Decisions.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Real estate in Pakistan has traditionally suffered from opaque documents, misleading commitments, and delayed delivery. Highrise.pk is structured around verified documentation scope and developer delivery records.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Block 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center mb-4">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-base mb-2">
              Verification-Focused Discovery
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every listing explicitly shows the scope of checks completed—from registry and mutation review to developer NOC status.
            </p>
          </div>

          {/* Block 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#004063]/10 text-[#004063] flex items-center justify-center mb-4">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-base mb-2">
              Transparent Property Info
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standardized Pakistani size conversions (Marla, Kanal, Gaz) alongside exact covered area and verified floor plans.
            </p>
          </div>

          {/* Block 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#007196]/10 text-[#007196] flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-base mb-2">
              Developer & Project Insights
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Track project milestones from raft foundation to possession without fabricated construction claims or hidden timelines.
            </p>
          </div>

          {/* Block 4 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-base mb-2">
              Informed Financial Decisions
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Realistic construction benchmark calculators and transparent installment schedules before you make down payments.
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center max-w-3xl mx-auto">
          <p className="text-[11px] text-slate-600">
            * Verification labels indicate the documented scope of checks performed in the prototype dataset. Verification does not constitute a financial guarantee or legal underwriting.
          </p>
        </div>
      </section>

      {/* SECTION F: TOP DEVELOPERS & AGENTS (with ratings, logos, and count of active projects) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TopDevelopersAndAgents 
          developers={SAMPLE_DEVELOPERS}
          agencies={SAMPLE_AGENCIES}
          projects={SAMPLE_PROJECTS}
        />
      </section>

      {/* NEWSLETTER SUBSCRIPTION & POPULAR SEARCHES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#002b42] to-[#004063] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#029bba]/20 text-[#8fc2d0] border border-[#029bba]/30 inline-flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#38aec7]" />
              Exclusive Real Estate Insights
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white mb-2 tracking-tight">
              Stay Ahead with Pakistan Property Market Updates
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-6">
              Subscribe to receive weekly intelligence on verified high-rise launches, CDA / RDA / LDA balloting alerts, and benchmark price indices.
            </p>

            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#38aec7]"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#029bba] hover:bg-[#007196] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
              >
                <span>Subscribe</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {newsletterSubscribed && (
              <div className="mt-3 text-xs text-emerald-300 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Thank you for subscribing! You will receive verified market reports.</span>
              </div>
            )}
          </div>

          <div className="absolute right-0 bottom-0 top-0 w-1/3 hidden lg:block opacity-10 pointer-events-none">
            <Building2 className="w-full h-full text-white" />
          </div>
        </div>
      </section>

      {/* POPULAR SEARCHES DIRECTORY BEFORE FOOTER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 pt-10">
        <h3 className="font-heading font-bold text-slate-900 text-base mb-4">
          Popular Real Estate Searches in Pakistan
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-900 block mb-2 text-xs">Houses for Sale</span>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link to="/properties?city=Islamabad&category=house" className="hover:text-[#004063]">Islamabad Houses</Link></li>
              <li><Link to="/properties?city=Lahore&category=house" className="hover:text-[#004063]">Lahore Houses</Link></li>
              <li><Link to="/properties?city=Karachi&category=house" className="hover:text-[#004063]">Karachi Houses</Link></li>
              <li><Link to="/properties?city=Rawalpindi&category=house" className="hover:text-[#004063]">Rawalpindi Houses</Link></li>
            </ul>
          </div>
          <div>
            <span className="font-semibold text-slate-900 block mb-2 text-xs">Luxury Apartments</span>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link to="/properties?category=apartment" className="hover:text-[#004063]">Centaurus Apartments</Link></li>
              <li><Link to="/properties?city=Lahore&category=apartment" className="hover:text-[#004063]">Gulberg Flats</Link></li>
              <li><Link to="/properties?city=Karachi&category=apartment" className="hover:text-[#004063]">Clifton Sea View</Link></li>
              <li><Link to="/projects?category=residential" className="hover:text-[#004063]">Installment Penthouses</Link></li>
            </ul>
          </div>
          <div>
            <span className="font-semibold text-slate-900 block mb-2 text-xs">Plots & Land</span>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link to="/properties?category=residential-plot&minSize=5-marla" className="hover:text-[#004063]">5 Marla Plots</Link></li>
              <li><Link to="/properties?category=residential-plot&minSize=10-marla" className="hover:text-[#004063]">10 Marla Plots</Link></li>
              <li><Link to="/properties?category=residential-plot&minSize=1-kanal" className="hover:text-[#004063]">1 Kanal Prime Plots</Link></li>
              <li><Link to="/properties?category=commercial-plot" className="hover:text-[#004063]">Commercial Plots</Link></li>
            </ul>
          </div>
          <div>
            <span className="font-semibold text-slate-900 block mb-2 text-xs">High-Rise Projects</span>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link to="/projects?category=commercial" className="hover:text-[#004063]">Shopping Malls</Link></li>
              <li><Link to="/projects?category=mixed-use" className="hover:text-[#004063]">Mixed-Use Towers</Link></li>
              <li><Link to="/projects?status=ready-to-move" className="hover:text-[#004063]">Ready to Move</Link></li>
              <li><Link to="/projects?status=under-construction" className="hover:text-[#004063]">On Installments</Link></li>
            </ul>
          </div>
          <div>
            <span className="font-semibold text-slate-900 block mb-2 text-xs">Direct Owner</span>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link to="/properties?ownerOnly=true" className="hover:text-[#004063]">0% Brokerage Deals</Link></li>
              <li><Link to="/properties?ownerOnly=true&city=Lahore" className="hover:text-[#004063]">Lahore Owner Houses</Link></li>
              <li><Link to="/properties?ownerOnly=true&city=Islamabad" className="hover:text-[#004063]">Islamabad Owner Villas</Link></li>
              <li><Link to="/properties?ownerOnly=true&city=Karachi" className="hover:text-[#004063]">Karachi Owner Flats</Link></li>
            </ul>
          </div>
          <div>
            <span className="font-semibold text-slate-900 block mb-2 text-xs">Research Tools</span>
            <ul className="space-y-1.5 text-[11px]">
              <li><button type="button" onClick={() => onOpenTool('emi')} className="hover:text-[#004063] text-left">EMI Calculator</button></li>
              <li><button type="button" onClick={() => onOpenTool('eligibility')} className="hover:text-[#004063] text-left">Loan Eligibility</button></li>
              <li><button type="button" onClick={() => onOpenTool('converter')} className="hover:text-[#004063] text-left">Marla & Kanal Converter</button></li>
              <li><button type="button" onClick={() => onOpenTool('construction')} className="hover:text-[#004063] text-left">Construction Estimator</button></li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION H: FINAL DISCOVERY CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900 mb-2">
            Ready to find your ideal property?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mb-6">
            Explore verified developments, compare floor plans, and connect with trusted representatives on Highrise.pk.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/properties"
              className="px-6 py-3 rounded-xl bg-[#004063] hover:bg-[#007196] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Search Properties
            </Link>
            <Link
              to="/projects"
              className="px-6 py-3 rounded-xl bg-[#029bba] hover:bg-[#007196] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Explore Projects
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
