// components/home/DirectOwnerListings.tsx
// Homepage "Direct Owner Listings" block — properties posted directly by
// verified owners (no agent/developer). Server-filtered via listingSource=owner.
// Reuses HomeListingCard with ownerListed badge. No changes to property-card.

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { icons } from '@/lib/design-system/icons';
import HomeListingCard, { HomeListingCardSkeleton } from '@/components/home/HomeListingCard';
import type { HomeListingInput } from '@/components/home/HomeListingCard';

interface DirectOwnerListingsProps {
  properties: HomeListingInput[];
  total: number | null;
  loading: boolean;
}

// Three columns on desktop, two on tablet, one on mobile (same slot system
// as FeaturedProperties).
const SLOT_CLASS = 'flex w-full md:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)]';
const SKELETON_COUNT = 3;

/** Demo preview until real owner listings exist. Set to false in production. */
const SHOW_SAMPLES_WHEN_EMPTY = true;

const SAMPLE_OWNER_LISTINGS: HomeListingInput[] = [
  {
    _id: 'sample-owner-1',
    slug: 'sample-direct-owner-villa-islamabad',
    title: '10 Marla Brand New Modern Villa in Sector G-13',
    price: 42500000,
    listingType: 'full_payment',
    propertyType: 'House',
    city: 'Islamabad',
    society: 'Sector G-13/2',
    area: 10,
    unit: 'Marla',
    bedrooms: 5,
    bathrooms: 6,
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
    ownerName: 'Chaudhry Nadeem Akhtar',
    ownerRole: 'owner',
  },
  {
    _id: 'sample-owner-2',
    slug: 'sample-direct-owner-apartment-lahore',
    title: '3-Bed Corner Luxury Apartment in DHA Phase 5',
    price: 31500000,
    listingType: 'full_payment',
    propertyType: 'Apartment',
    city: 'Lahore',
    society: 'DHA Phase 5',
    area: 1950,
    unit: 'Sq. Ft.',
    bedrooms: 3,
    bathrooms: 3,
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80'],
    ownerName: 'Engr. Tariq Mehmood',
    ownerRole: 'owner',
  },
  {
    _id: 'sample-owner-3',
    slug: 'sample-direct-owner-villa-karachi',
    title: '200 Sq. Yds. Architect-Designed Villa in DHA Phase 6',
    price: 68000000,
    listingType: 'full_payment',
    propertyType: 'House',
    city: 'Karachi',
    society: 'DHA Phase 6',
    area: 200,
    unit: 'Sq. Yd.',
    bedrooms: 4,
    bathrooms: 4,
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80'],
    ownerName: 'Dr. Shahida Parveen',
    ownerRole: 'owner',
  },
];

export default function DirectOwnerListings({ properties, total, loading }: DirectOwnerListingsProps) {
  const hasListings = properties.length > 0;
  const displayListings: HomeListingInput[] =
    hasListings ? properties : SHOW_SAMPLES_WHEN_EMPTY ? SAMPLE_OWNER_LISTINGS : [];
  const viewAllLabel =
    total !== null ? `View All Owner Listings (${total.toLocaleString('en-PK')})` : 'View All Owner Listings';

  // Hide the whole section in production when there is nothing to show.
  if (!loading && !hasListings && !SHOW_SAMPLES_WHEN_EMPTY) return null;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-center gap-5 text-center">
          <div className="max-w-3xl">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>0% Brokerage • 100% Direct Owner Contact</span>
            </span>
            <h2 className="text-3xl font-black tracking-tight text-[#004063] sm:text-4xl">
              Explore Direct <span className="text-emerald-600">Owner Listings</span>
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
              Deal directly with verified property owners — no broker commissions, authenticated title
              documents, and direct negotiation.
            </p>
          </div>
        </div>

        {loading ? (
          <div aria-busy="true" className="flex flex-wrap justify-center gap-6">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <div key={index} className={SLOT_CLASS}>
                <HomeListingCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-6">
              {displayListings.map((property, index) => (
                <div
                  key={String(property._id ?? property.id ?? index)}
                  className={SLOT_CLASS}
                >
                  <HomeListingCard property={property} ownerListed />
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                href="/properties?listingSource=owner&sort=newest"
                className="inline-flex items-center gap-2 rounded-full bg-[#10b981] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#004063] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2"
              >
                <span>{viewAllLabel}</span>
                <icons.ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}