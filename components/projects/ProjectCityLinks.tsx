import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import type { CityCount } from '@/types/projects';

interface ProjectCityLinksProps {
  city?: string;
  cities: CityCount[];
}

export default function ProjectCityLinks({ city, cities }: ProjectCityLinksProps): React.ReactElement | null {
  const activeCities = cities
    .filter((cityCount) => cityCount.city && cityCount.count > 0)
    .sort((first, second) => second.count - first.count)
    .slice(0, 12);

  if (activeCities.length === 0) return null;

  return (
    <section aria-labelledby="project-city-links-heading" className="border-t border-gray-200 pt-8">
      <div className="mb-4">
        <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba]">
          <MapPin className="h-3.5 w-3.5" />
          EXPLORE BY LOCATION
        </p>
        <h2 id="project-city-links-heading" className="text-xl font-black text-[#004063] md:text-2xl">
          {city ? `Projects in ${city} and across Pakistan` : 'Browse Projects by City'}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Open a city directory to compare project locations, prices, approvals, and developers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeCities.map(({ city: cityName, count }) => (
          <Link
            key={cityName}
            href={`/projects/in/${encodeURIComponent(cityName.toLowerCase())}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#029bba] hover:text-[#029bba]"
          >
            {cityName}
            <span className="text-gray-400">{count}</span>
            <ArrowRight className="h-3 w-3 text-[#029bba]" />
          </Link>
        ))}
      </div>
    </section>
  );
}