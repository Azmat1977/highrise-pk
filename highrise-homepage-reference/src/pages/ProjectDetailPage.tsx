import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Share2, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  Check, 
  ArrowRight,
  Landmark,
  FileText,
  Compass,
  Zap,
  Waves,
  Dumbbell,
  Car,
  TreePine,
  Coffee,
  Film
} from 'lucide-react';
import { SAMPLE_PROJECTS, SAMPLE_DEVELOPERS, SAMPLE_PROPERTIES } from '../data/mockData.ts';
import { Breadcrumbs } from '../components/Breadcrumbs.tsx';
import { PropertyGallery } from '../components/PropertyGallery.tsx';
import { EnquiryForm } from '../components/EnquiryForm.tsx';
import { PropertyCard } from '../components/PropertyCard.tsx';
import { ProjectCard } from '../components/ProjectCard.tsx';

// Icon map helper for amenities
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-5 h-5 text-[#029bba]" />,
  Zap: <Zap className="w-5 h-5 text-[#029bba]" />,
  Waves: <Waves className="w-5 h-5 text-[#029bba]" />,
  Dumbbell: <Dumbbell className="w-5 h-5 text-[#029bba]" />,
  Car: <Car className="w-5 h-5 text-[#029bba]" />,
  TreePine: <TreePine className="w-5 h-5 text-[#029bba]" />,
  Sparkles: <Sparkles className="w-5 h-5 text-[#029bba]" />,
  Coffee: <Coffee className="w-5 h-5 text-[#029bba]" />,
  Film: <Film className="w-5 h-5 text-[#029bba]" />,
};

export const ProjectDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Find project by slug or id, fallback to first project
  const project =
    SAMPLE_PROJECTS.find((p) => p.slug === slug || p.id === slug) ||
    SAMPLE_PROJECTS[0];

  const developer = SAMPLE_DEVELOPERS.find((d) => d.id === project.developerId);

  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedUnitCategory, setSelectedUnitCategory] = useState<string>('All');

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  // Unit categories available in this project
  const availableUnitCategories = [
    'All',
    ...Array.from(new Set(project.unitTypes.map((u) => u.category))),
  ];

  const filteredUnits =
    selectedUnitCategory === 'All'
      ? project.unitTypes
      : project.unitTypes.filter((u) => u.category === selectedUnitCategory);

  // Associated resale units in this project
  const associatedProperties = SAMPLE_PROPERTIES.filter(
    (prop) => prop.projectId === project.id || prop.developerId === project.developerId
  );

  // Related projects
  const relatedProjects = SAMPLE_PROJECTS.filter(
    (p) => p.id !== project.id && (p.developerId === project.developerId || p.city === project.city)
  ).slice(0, 2);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      {/* SECTION A: PROJECT IDENTITY & HEADER */}
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Projects', path: '/projects' },
            { label: project.city, path: `/projects?city=${project.city}` },
            { label: project.title },
          ]}
        />

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-md text-xs font-semibold bg-[#004063] text-white">
                {project.statusLabel}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#029bba]/10 text-[#007196]">
                {project.categoryLabel}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {project.nocStatus}
              </span>
            </div>

            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight leading-tight">
              {project.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-1 text-[#007196] font-semibold">
                <Building2 className="w-4 h-4 text-[#029bba]" />
                <span>Developer: {project.developerName}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{project.location}, {project.city}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                Indicative Price Range
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold font-heading text-[#004063]">
                {project.priceRange.formatted}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>Share Project</span>
                  </>
                )}
              </button>

              <a
                href="#enquiry"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Request Site Visit</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: PROJECT GALLERY */}
      <PropertyGallery images={project.images} title={project.title} />

      {/* TWO-COLUMN LAYOUT: MAIN CONTENT + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-10">
          {/* SECTION C: PROJECT OVERVIEW & MILESTONES */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="font-heading font-bold text-slate-900 text-xl mb-3">
                Project Overview
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Milestones Timeline */}
            <div className="pt-6 border-t border-slate-100">
              <h3 className="font-heading font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#029bba]" />
                <span>Development Milestones & Progress</span>
              </h3>
              <div className="space-y-3">
                {project.milestones.map((milestone, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          milestone.completed
                            ? 'bg-emerald-100 text-emerald-700'
                            : milestone.current
                            ? 'bg-[#029bba] text-white ring-4 ring-[#029bba]/20'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {milestone.completed ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-[10px] font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div>
                        <span className={`font-semibold block ${milestone.current ? 'text-[#004063]' : 'text-slate-800'}`}>
                          {milestone.title}
                        </span>
                        {milestone.current && (
                          <span className="text-[10px] text-[#029bba] font-bold">
                            Active Phase (Inspection Confirmed)
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shrink-0">
                      {milestone.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION D: DEVELOPER PROFILE PANEL */}
          {developer && (
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#004063] text-white flex items-center justify-center font-heading font-extrabold text-xl shadow-xs">
                    {developer.logoInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-heading font-bold text-slate-900 text-lg">
                        {developer.name}
                      </h3>
                      {developer.isVerified && (
                        <ShieldCheck className="w-4 h-4 text-[#029bba]" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Established {developer.establishedYear} • {developer.headquarters}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/projects?developer=${encodeURIComponent(developer.name)}`}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#029bba] text-[#007196] text-xs font-semibold shadow-xs transition-colors"
                >
                  View Developer Portfolio ({developer.totalProjects} Projects)
                </Link>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {developer.description}
              </p>
            </div>
          )}

          {/* SECTION E: AMENITIES AND FACILITIES */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
            <h2 className="font-heading font-bold text-slate-900 text-xl">
              Amenities & Master Facilities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {project.amenities.map((amenity, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-800"
                >
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                    {AMENITY_ICONS[amenity.icon] || <ShieldCheck className="w-4 h-4 text-[#029bba]" />}
                  </div>
                  <span>{amenity.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION F: FLOOR PLANS & AVAILABLE UNITS */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-bold text-slate-900 text-xl">
                  Available Units & Floor Types
                </h2>
                <p className="text-xs text-slate-500">
                  Select a category to filter indicative unit specifications.
                </p>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl" role="tablist">
                {availableUnitCategories.map((cat) => (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={selectedUnitCategory === cat}
                    onClick={() => setSelectedUnitCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedUnitCategory === cat
                        ? 'bg-[#004063] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Units Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-[#029bba]/50 transition-all bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#029bba]/10 text-[#007196]">
                        {unit.category}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          unit.available
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {unit.available ? 'Sample Available' : 'Waitlist / Sold'}
                      </span>
                    </div>

                    <h4 className="font-heading font-bold text-slate-900 text-sm mb-1">
                      {unit.title}
                    </h4>

                    <div className="text-xs text-slate-600 space-y-1 mb-3">
                      <p>Covered Area: <strong>{unit.size}</strong></p>
                      {unit.bedrooms && (
                        <p>{unit.bedrooms} Bedrooms • {unit.bathrooms} Bathrooms</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Indicative Price</span>
                      <span className="text-sm font-bold font-heading text-[#007196]">
                        {unit.price}
                      </span>
                    </div>

                    <a
                      href="#enquiry"
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-[#029bba] hover:text-white text-xs font-semibold text-slate-700 transition-colors"
                    >
                      Enquire Unit
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION G: PAYMENT PLANS */}
          {project.paymentPlan && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#029bba]" />
                <h2 className="font-heading font-bold text-slate-900 text-xl">
                  Sample Payment Plan Breakdown
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Down Payment</span>
                  <span className="font-bold text-slate-900 text-base mt-1 block">
                    {project.paymentPlan.downPayment}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {project.paymentPlan.bookingPercent}% at contract signing
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Installment Schedule</span>
                  <span className="font-bold text-slate-900 text-base mt-1 block">
                    {project.paymentPlan.installmentFrequency}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {project.paymentPlan.installmentAmount}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Plan Duration</span>
                  <span className="font-bold text-slate-900 text-base mt-1 block">
                    {project.paymentPlan.durationMonths} Months
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {project.paymentPlan.possessionPercent}% on Key Handover
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                * Note: {project.paymentPlan.sampleNotes} Payment schedules vary according to specific floor and unit orientation.
              </p>
            </div>
          )}

          {/* SECTION H: LOCATION AND NEARBY FACILITIES */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="font-heading font-bold text-slate-900 text-xl">
                Location & Accessibility
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {project.location}, {project.city}
              </p>
            </div>

            {/* Nearby facilities */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {project.nearbyFacilities.map((fac, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#029bba] block">
                    {fac.type}
                  </span>
                  <span className="font-semibold text-slate-900 block mt-1 line-clamp-1">
                    {fac.name}
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    {fac.distance} away
                  </span>
                </div>
              ))}
            </div>

            {/* Illustrative map preview */}
            <div className="relative h-56 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center text-center p-6">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#007196_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="relative z-10 space-y-2 max-w-sm">
                <div className="w-10 h-10 rounded-full bg-[#004063] text-white flex items-center justify-center mx-auto shadow-md">
                  <MapPin className="w-5 h-5 text-[#38aec7]" />
                </div>
                <h4 className="font-heading font-bold text-slate-900 text-sm">
                  {project.location}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Illustrative project boundary and access roadmap representation for prototype demonstration.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar (4 cols): Project Enquiry & Site Visit Form */}
        <div id="enquiry" className="lg:col-span-4">
          <EnquiryForm
            title="Request Project Brochure & Site Visit"
            itemTitle={project.title}
            agentName={`${project.developerName} Desk`}
            agentAgency="Authorized Project Desk"
            agentPhone="+92 51 222 3344"
            type="site-visit"
          />
        </div>
      </div>

      {/* SECTION J: RELATED DEVELOPMENTS & RESALE UNITS */}
      <div className="pt-10 border-t border-slate-200 space-y-10">
        {/* Resale units in this development */}
        {associatedProperties.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-xl text-slate-900">
                  Individual Resale Units in {project.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Verified owner listings available for direct transfer.
                </p>
              </div>
              <Link
                to="/properties"
                className="text-xs font-semibold text-[#007196] hover:text-[#029bba] inline-flex items-center gap-1"
              >
                <span>View All Properties</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {associatedProperties.map((prop) => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          </div>
        )}

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-xl text-slate-900">
                  Related Projects in {project.city}
                </h3>
                <p className="text-xs text-slate-500">
                  Compare other notable developments in similar price categories.
                </p>
              </div>
              <Link
                to="/projects"
                className="text-xs font-semibold text-[#007196] hover:text-[#029bba] inline-flex items-center gap-1"
              >
                <span>Discover All Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedProjects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
