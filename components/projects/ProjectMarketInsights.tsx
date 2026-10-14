import Link from 'next/link';
import { ArrowRight, Building2, Calculator, MapPin, ShieldCheck, TrendingUp } from 'lucide-react';
import type { CityCount, HotspotArea } from '@/types/projects';

interface ProjectMarketInsightsProps {
  city?: string;
  totalProjects: number;
  hotspots: HotspotArea[];
  cityCounts: CityCount[];
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ProjectMarketInsights({
  city,
  totalProjects,
  hotspots,
  cityCounts,
}: ProjectMarketInsightsProps): React.ReactElement | null {
  const visibleHotspots = hotspots.filter((area) => area.area && area.city && area.projectCount > 0).slice(0, 8);
  const visibleCities = [...cityCounts]
    .filter((item) => item.city && item.count > 0)
    .sort((first, second) => second.count - first.count)
    .slice(0, 8);

  if (totalProjects === 0 && visibleHotspots.length === 0 && visibleCities.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="project-insights-heading" className="space-y-6 border-t border-gray-200 pt-8">
      <div>
        <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba]">
          <TrendingUp className="h-3.5 w-3.5" />
          LIVE DIRECTORY DATA
        </p>
        <h2 id="project-insights-heading" className="text-xl font-black leading-tight text-[#004063] md:text-2xl">
          {city ? `Research & Insights for ${city}` : 'Research & Insights'}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Explore approved project listings and high-demand localities from the Highrise directory. Counts reflect current listings, not completed property sales.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <Building2 className="mb-3 h-4 w-4 text-[#029bba]" />
          <p className="text-2xl font-black text-[#004063]">{totalProjects.toLocaleString()}</p>
          <p className="mt-1 text-xs font-semibold text-gray-600">
            {city ? `Approved projects in ${city}` : 'Projects matching this view'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <MapPin className="mb-3 h-4 w-4 text-[#029bba]" />
          <p className="text-2xl font-black text-[#004063]">{visibleHotspots.length}</p>
          <p className="mt-1 text-xs font-semibold text-gray-600">High-demand localities with active projects</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <ShieldCheck className="mb-3 h-4 w-4 text-emerald-600" />
          <p className="text-2xl font-black text-[#004063]">{visibleCities.length}</p>
          <p className="mt-1 text-xs font-semibold text-gray-600">Cities with approved project listings</p>
        </div>
      </div>

      {visibleHotspots.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-[#004063]">Prominent projects to explore</h3>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleHotspots.map((area) => (
              <Link
                key={`${area.city}-${area.area}`}
                href={`/projects/in/${encodeURIComponent(toSlug(area.city))}/${encodeURIComponent(toSlug(area.area))}`}
                className="group w-64 shrink-0 snap-start rounded-xl border border-gray-200 bg-white p-4 transition hover:border-[#029bba]/50 hover:shadow-sm"
              >
                <span className="text-[10px] font-bold uppercase text-gray-500">{area.city}</span>
                <span className="mt-1 block truncate text-base font-black text-[#004063] group-hover:text-[#029bba]">
                  {area.area}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                  {area.projectCount} approved project{area.projectCount === 1 ? '' : 's'}
                  <ArrowRight className="h-3 w-3 text-[#029bba]" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#004063]">Project research tools</h3>
          <p className="mt-1 text-xs text-gray-600">Check affordability, compare options, and review society approvals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tools/home-loan-calculator" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#029bba] hover:text-[#029bba]">
            <Calculator className="h-3.5 w-3.5" />
            Loan calculator
          </Link>
          <Link href="/tools/price-estimator" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#029bba] hover:text-[#029bba]">
            <TrendingUp className="h-3.5 w-3.5" />
            Price estimator
          </Link>
          <Link href="/tools/verify-society" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#029bba] hover:text-[#029bba]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verify society
          </Link>
        </div>
      </div>

      {visibleCities.length > 0 && (
        <div className="border-t border-gray-100 pt-5">
          <h3 className="mb-3 text-sm font-bold text-[#004063]">Browse projects by city</h3>
          <div className="flex flex-wrap gap-2">
            {visibleCities.map((item) => (
              <Link
                key={item.city}
                href={`/projects/in/${encodeURIComponent(toSlug(item.city))}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#029bba] hover:text-[#029bba]"
              >
                {item.city}
                <span className="text-gray-400">{item.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}