import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, Loader2, MapPin, Maximize } from 'lucide-react';

interface ProjectItem {
  _id: string;
  projectName: string;
  slug?: string;
  city?: string;
  areaName?: string;
  area?: string;
  projectStatus?: string;
  projectCategory?: string;
  marketingBadge?: string;
  minPrice?: number;
  maxPrice?: number;
  priceRangeText?: string;
  startingPriceFormatted?: string;
  totalArea?: string;
  areaUnit?: string;
  coverImage?: { url: string };
  images?: { url: string }[];
  primaryImage?: string | null;
  featureImageUrl?: string;
  unitTypeBreakdown?: Array<{ type?: string; category?: string; minArea?: number; maxArea?: number }>;
}

const FALLBACK_PROJECT_IMAGE =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';

function formatPKR(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(2)} Crore`;
  if (price >= 100_000) return `${(price / 100_000).toFixed(2)} Lac`;
  return price.toLocaleString('en-PK');
}

function getProjectImage(project: ProjectItem): string {
  return (
    project.primaryImage ||
    project.featureImageUrl ||
    project.images?.[0]?.url ||
    project.coverImage?.url ||
    FALLBACK_PROJECT_IMAGE
  );
}

function getPriceText(project: ProjectItem): string {
  if (project.priceRangeText) return project.priceRangeText;
  if (project.minPrice && project.maxPrice && project.minPrice !== project.maxPrice) {
    return `PKR ${formatPKR(project.minPrice)} - ${formatPKR(project.maxPrice)}`;
  }
  if (project.minPrice) return `From PKR ${formatPKR(project.minPrice)}`;
  if (project.startingPriceFormatted) return project.startingPriceFormatted;
  return 'Price on request';
}

function getUnitTypes(project: ProjectItem): string {
  const types = (project.unitTypeBreakdown ?? [])
    .map((unit) => unit.type || unit.category)
    .filter((value): value is string => Boolean(value));
  const unique = Array.from(new Set(types));
  if (unique.length === 0) return 'Residential & commercial units';
  return unique.slice(0, 3).join(' · ');
}

function getAreaRange(project: ProjectItem): string {
  const areas: number[] = [];
  for (const unit of project.unitTypeBreakdown ?? []) {
    if (typeof unit.minArea === 'number' && unit.minArea > 0) areas.push(unit.minArea);
    if (typeof unit.maxArea === 'number' && unit.maxArea > 0) areas.push(unit.maxArea);
  }
  if (areas.length === 0) return project.totalArea || 'Sizes on request';
  const min = Math.min(...areas);
  const max = Math.max(...areas);
  const unit = project.areaUnit || 'Sq. Ft.';
  return min === max ? `${min.toLocaleString()} ${unit}` : `${min.toLocaleString()} - ${max.toLocaleString()} ${unit}`;
}

export default function ProjectShowcase({
  projects,
  loading,
}: {
  projects: ProjectItem[];
  loading: boolean;
}) {
  return (
    <section className="border-y border-slate-200/60 bg-slate-100/70 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#029bba]">
              Development Landmarks
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Discover Leading Projects
            </h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Verified master developments with live pricing and unit information.
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#004063] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#029bba]"
          >
            <span>Explore All Projects</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#029bba]" />
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project) => {
              const href = `/projects/${project.slug || project._id}`;
              return (
                <article
                  key={project._id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:border-[#029bba]/40 hover:shadow-xl"
                >
                  <div>
                    <Link href={href} className="relative block h-52 w-full overflow-hidden bg-slate-200">
                      <Image
                        src={getProjectImage(project)}
                        alt={project.projectName}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#004063]/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                          {project.projectStatus || 'Launched'}
                        </span>
                        {project.projectCategory ? (
                          <span className="rounded-md bg-[#029bba]/90 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                            {project.projectCategory}
                          </span>
                        ) : null}
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-200">
                          Starting from
                        </p>
                        <p className="font-heading text-lg font-bold drop-shadow-md">
                          {getPriceText(project)}
                        </p>
                      </div>
                    </Link>

                    <div className="p-5">
                      <p className="mb-1 flex items-center gap-1.5 text-xs text-slate-600">
                        <Building2 className="h-3.5 w-3.5 text-[#029bba]" />
                        <span className="truncate font-medium text-[#007196]">
                          {project.projectCategory || 'Real estate development'}
                        </span>
                      </p>

                      <h3 className="mb-1 line-clamp-1 text-lg font-semibold text-slate-900 transition-colors group-hover:text-[#007196]">
                        <Link href={href}>{project.projectName}</Link>
                      </h3>

                      <p className="mb-3 flex items-center gap-1 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {[project.area || project.areaName, project.city].filter(Boolean).join(', ') ||
                            'Location on project page'}
                        </span>
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {getUnitTypes(project)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          <Maximize className="h-3 w-3" />
                          {getAreaRange(project)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-0">
                    <Link
                      href={href}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#004063]/10 bg-[#004063]/5 px-4 py-2.5 text-xs font-semibold text-[#004063] transition-all hover:border-transparent hover:bg-[#029bba] hover:text-white"
                    >
                      <span>View Project Details</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">No verified projects published yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Approved developments will appear here once they complete verification.
            </p>
            <Link
              href="/projects"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#004063] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#029bba]"
            >
              Browse Projects
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
