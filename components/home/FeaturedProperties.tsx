// components/home/FeaturedProperties.tsx
// Homepage "Featured Properties" block. Shows the newest approved listings
// exactly as the API returns them (sort=newest, limit=6). No tabs, no mock data.

import Link from 'next/link';
import SectionHeading from '@/components/ui/SectionHeading';
import { icons } from '@/lib/design-system/icons';
import HomeListingCard, { HomeListingCardSkeleton } from '@/components/home/HomeListingCard';
import type { HomeListingInput } from '@/components/home/HomeListingCard';

interface FeaturedPropertiesProps {
  properties: HomeListingInput[];
  total: number | null;
  loading: boolean;
}

// Three columns on desktop, two on tablet, one on mobile.
// flex-wrap with justify-center keeps a short last row centered.
const SLOT_CLASS = 'flex w-full md:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)]';
const SKELETON_COUNT = 6;

export default function FeaturedProperties({ properties, total, loading }: FeaturedPropertiesProps) {
  const hasListings = properties.length > 0;
  const viewAllLabel =
    total !== null ? `View all properties (${total.toLocaleString('en-PK')})` : 'View all properties';

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-center gap-5 text-center">
          <SectionHeading
            eyebrow="Latest Listings"
            title={
              <>
                Featured <span className="text-[#029bba]">Properties</span>
              </>
            }
            subtitle="The newest approved listings from our verified inventory."
          />
        </div>

        {loading ? (
          <div aria-busy="true" className="flex flex-wrap justify-center gap-6">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <div key={index} className={SLOT_CLASS}>
                <HomeListingCardSkeleton />
              </div>
            ))}
          </div>
        ) : hasListings ? (
          <>
            <div className="flex flex-wrap justify-center gap-6">
              {properties.map((property, index) => (
                <div key={String(property._id ?? property.id ?? index)} className={SLOT_CLASS}>
                  <HomeListingCard property={property} />
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                href="/properties?sort=newest"
                className="inline-flex items-center gap-2 rounded-full border border-[#004063]/15 bg-white px-6 py-2.5 text-xs font-bold text-[#004063] transition-all hover:-translate-y-0.5 hover:border-[#029bba] hover:bg-[#029bba] hover:text-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50 focus-visible:ring-offset-2"
              >
                <span>{viewAllLabel}</span>
                <icons.ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <icons.Building className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">No properties published yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Approved listings will appear here as soon as they are published.
            </p>
            <Link
              href="/properties"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#004063] px-5 py-2.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#029bba] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50 focus-visible:ring-offset-2"
            >
              Browse all properties
              <icons.ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}