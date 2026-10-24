import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Calendar,
  Layers
} from 'lucide-react';
import { Project } from '../types/index.ts';

interface ProjectSpotlightProps {
  projects: Project[];
}

export const ProjectSpotlight: React.FC<ProjectSpotlightProps> = ({ projects }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!projects || projects.length === 0) return null;

  const currentProject = projects[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? projects.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === projects.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Large Architectural Visual Side */}
        <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-auto overflow-hidden bg-slate-900">
          <img
            key={currentProject.id}
            src={currentProject.images[0]}
            alt={currentProject.title}
            className="w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in-95"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top badges on photo */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#004063]/90 text-white backdrop-blur-md">
              {currentProject.statusLabel}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#029bba]/90 text-white backdrop-blur-md">
              {currentProject.categoryLabel}
            </span>
          </div>

          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600/90 text-white backdrop-blur-md flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {currentProject.nocStatus}
            </span>
          </div>

          {/* Bottom stats inside image */}
          <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-300 font-medium">Indicative Price Range</p>
              <p className="text-2xl font-bold font-heading text-white drop-shadow-md">
                {currentProject.priceRange.formatted}
              </p>
            </div>
            <div className="hidden sm:block text-right text-xs text-slate-300">
              <p className="font-semibold text-white">{currentProject.unitTypes.length} Unit Types</p>
              <p>Available on Installments</p>
            </div>
          </div>
        </div>

        {/* Structured Information Panel */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-white via-white to-slate-50">
          <div>
            {/* Developer Bar */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#007196]">
                <Building2 className="w-4 h-4 text-[#029bba]" />
                <span>{currentProject.developerName}</span>
              </div>
              <span className="text-xs font-medium text-slate-600">
                {currentIndex + 1} of {projects.length} Spotlight Developments
              </span>
            </div>

            {/* Title */}
            <h3 className="font-heading font-extrabold text-2xl text-slate-900 mb-2 leading-tight">
              {currentProject.title}
            </h3>

            {/* Location */}
            <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-4">
              <MapPin className="w-4 h-4 text-[#029bba] shrink-0" />
              <span>{currentProject.location}, {currentProject.city}</span>
            </p>

            {/* Overview */}
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              {currentProject.overview}
            </p>

            {/* Timeline Visual of Milestones */}
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Sample Project Milestones</span>
              </p>
              <div className="space-y-2 border-l-2 border-[#029bba]/30 pl-3 ml-1.5">
                {currentProject.milestones.slice(0, 3).map((m, idx) => (
                  <div key={idx} className="relative text-xs">
                    <div
                      className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        m.completed ? 'bg-emerald-500' : m.current ? 'bg-[#029bba]' : 'bg-slate-300'
                      }`}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium ${m.current ? 'text-[#004063] font-semibold' : 'text-slate-700'}`}>
                        {m.title}
                      </span>
                      <span className="text-[11px] text-slate-600 shrink-0 font-medium">{m.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Controls & Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous development"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-[#004063] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next development"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-[#004063] transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <Link
              to={`/projects/${currentProject.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#004063] hover:bg-[#029bba] text-white shadow-md transition-all duration-200"
            >
              <span>Explore This Project</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
