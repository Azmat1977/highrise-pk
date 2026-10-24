import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Project } from '../types/index.ts';

interface ProjectCardProps {
  project: Project;
  variant?: 'standard' | 'highlighted';
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  variant = 'standard',
}) => {
  const isHighlighted = variant === 'highlighted';

  return (
    <article
      className={`group bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-[#029bba]/40 transition-all duration-300 flex flex-col justify-between ${
        isHighlighted ? 'ring-1 ring-[#029bba]/30' : ''
      }`}
    >
      <div>
        {/* Project Image */}
        <div className={`relative overflow-hidden ${isHighlighted ? 'h-64' : 'h-52'} w-full`}>
          <img
            src={project.images[0]}
            alt={project.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Badges on image */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#004063]/90 backdrop-blur-xs text-white">
              {project.statusLabel}
            </span>
            <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-[#029bba]/90 backdrop-blur-xs text-white">
              {project.categoryLabel}
            </span>
          </div>

          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-600/90 text-white backdrop-blur-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {project.nocStatus.split(' ')[0]}
            </span>
          </div>

          {/* Price Range */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <p className="text-xs uppercase tracking-wider text-slate-200 font-medium">Starting From</p>
            <p className="text-lg sm:text-xl font-bold font-heading drop-shadow-md text-white">
              {project.priceRange.formatted}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
            <Building2 className="w-3.5 h-3.5 text-[#029bba]" />
            <span className="font-medium text-[#007196]">{project.developerName}</span>
          </div>

          <h3 className="font-heading font-semibold text-slate-900 text-lg group-hover:text-[#007196] transition-colors mb-1 line-clamp-1">
            <Link to={`/projects/${project.slug}`}>
              {project.title}
            </Link>
          </h3>

          <p className="text-xs text-slate-600 flex items-center gap-1 mb-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{project.location}, {project.city}</span>
          </p>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
            {project.overview}
          </p>

          {/* Quick units overview */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {project.unitTypes.slice(0, 3).map((u, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
              >
                {u.title.split(' ')[0]} {u.category}
              </span>
            ))}
            {project.unitTypes.length > 3 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                +{project.unitTypes.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer link */}
      <div className="px-5 pb-5 pt-0">
        <Link
          to={`/projects/${project.slug}`}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#004063]/5 hover:bg-[#029bba] text-[#004063] hover:text-white transition-all duration-200 border border-[#004063]/10 hover:border-transparent"
        >
          <span>View Project Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
};
