import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, MapPin, ArrowRight, Calendar, Layers } from 'lucide-react';
import { Developer, Project } from '../types/index.ts';

interface DeveloperCardProps {
  developer: Developer;
  allProjects: Project[];
}

export const DeveloperCard: React.FC<DeveloperCardProps> = ({
  developer,
  allProjects,
}) => {
  // Find projects belonging to this developer
  const devProjects = allProjects.filter((p) => p.developerId === developer.id);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    devProjects[0]?.id || ''
  );

  const activeProject = devProjects.find((p) => p.id === selectedProjectId) || devProjects[0];

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 p-6 flex flex-col justify-between">
      <div>
        {/* Header: Initials + Info */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#004063] to-[#029bba] flex items-center justify-center text-white font-heading font-bold text-base shadow-xs shrink-0">
              {developer.logoInitials}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-heading font-bold text-slate-900 text-base">
                  {developer.name}
                </h4>
                {developer.isVerified && (
                  <span
                    title="Verified Developer Profile (Sample)"
                    className="inline-flex items-center text-[#029bba]"
                  >
                    <ShieldCheck className="w-4 h-4 fill-[#029bba]/15 text-[#029bba]" />
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {developer.headquarters}
              </p>
            </div>
          </div>

          {developer.editorialFeatured && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#029bba]/10 text-[#007196] border border-[#029bba]/20 shrink-0">
              Featured Partner
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl mb-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Est. <strong>{developer.establishedYear}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span><strong>{developer.totalProjects}</strong> Projects ({developer.activeProjects} Active)</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          {developer.description}
        </p>

        {/* Interactive Associated Projects Section */}
        {devProjects.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2.5">
              Select Project to Preview:
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3" role="tablist">
              {devProjects.map((p) => {
                const isSelected = p.id === activeProject?.id;
                return (
                  <button
                    key={p.id}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 text-left ${
                      isSelected
                        ? 'bg-[#004063] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>

            {/* Active Project Mini-Preview */}
            {activeProject && (
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 flex items-center gap-3">
                <img
                  src={activeProject.images[0]}
                  alt={activeProject.title}
                  className="w-16 h-14 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {activeProject.title}
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    {activeProject.location}, {activeProject.city}
                  </p>
                  <p className="text-xs font-bold text-[#007196]">
                    {activeProject.priceRange.formatted}
                  </p>
                </div>
                <Link
                  to={`/projects/${activeProject.slug}`}
                  aria-label={`View ${activeProject.title}`}
                  className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-[#029bba] hover:text-white hover:border-[#029bba] text-[#004063] transition-colors shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Explore Link */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-600">Sample developer dataset</span>
        <Link
          to={`/projects?developer=${encodeURIComponent(developer.name)}`}
          className="text-[#007196] font-semibold hover:text-[#029bba] inline-flex items-center gap-1"
        >
          <span>View All Projects</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
