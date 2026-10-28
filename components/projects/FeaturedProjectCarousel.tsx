import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import ProjectListingCard from '@/components/projects/ProjectListingCard';
import type { ProjectListing } from '@/types/projects';

interface FeaturedProjectCarouselProps {
  projects: ProjectListing[];
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
}

export default function FeaturedProjectCarousel({
  projects,
  id = 'top-projects-heading',
  eyebrow = 'FEATURED PROJECTS',
  title = 'Highrise Top Picks',
  description = 'Active featured projects from verified developers.',
}: FeaturedProjectCarouselProps): React.ReactElement | null {
  const carouselRef = useRef<HTMLDivElement>(null);

  if (projects.length === 0) return null;

  const scroll = (direction: -1 | 1) => {
    carouselRef.current?.scrollBy({
      left: direction * 340,
      behavior: 'smooth',
    });
  };

  return (
    <section aria-labelledby={id} className="min-w-0 py-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba]">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </p>
          <h2 id={id} className="text-xl font-black leading-tight text-[#004063] md:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {description}
          </p>
        </div>

        {projects.length > 1 && (
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Scroll top picks left"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#029bba] transition hover:border-[#029bba] hover:bg-[#029bba]/5 focus:outline-none focus:ring-2 focus:ring-[#029bba]/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Scroll top picks right"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#029bba] transition hover:border-[#029bba] hover:bg-[#029bba]/5 focus:outline-none focus:ring-2 focus:ring-[#029bba]/30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={carouselRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Featured verified projects"
      >
        {projects.map((project) => (
          <div key={project._id} role="listitem" className="w-[280px] shrink-0 snap-start sm:w-[320px]">
            <ProjectListingCard
              project={project}
              variant="grid"
              className="h-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}