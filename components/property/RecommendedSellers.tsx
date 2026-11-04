import Link from 'next/link';
import { ArrowRight, Building2, Users } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

interface SellerProperty {
  slug?: string;
  title?: string;
  city?: string;
  ownerName?: string;
  ownerRole?: string;
  ownerSlug?: string;
}

interface SellerGroup {
  slug: string;
  name: string;
  role: string;
  listingCount: number;
  propertySlug: string;
  propertyTitle: string;
  city: string;
}

interface RecommendedSellersProps {
  properties: SellerProperty[];
}

export default function RecommendedSellers({
  properties,
}: RecommendedSellersProps): React.ReactElement | null {
  const sellers = new Map<string, SellerGroup>();

  for (const property of properties) {
    const slug = property.ownerSlug?.trim();
    const name = property.ownerName?.trim();
    if (!slug || !name || name === 'Verified Member' || !property.slug) continue;

    const key = `${property.ownerRole || 'owner'}:${slug.toLowerCase()}`;
    const existing = sellers.get(key);
    if (existing) {
      existing.listingCount += 1;
      continue;
    }

    sellers.set(key, {
      slug,
      name,
      role: property.ownerRole || 'owner',
      listingCount: 1,
      propertySlug: property.slug,
      propertyTitle: property.title || 'Property listing',
      city: property.city || 'Pakistan',
    });
  }

  const recommended = Array.from(sellers.values())
    .sort((first, second) => second.listingCount - first.listingCount || first.name.localeCompare(second.name))
    .slice(0, 4);

  if (recommended.length === 0) return null;

  return (
    <section aria-labelledby="recommended-sellers-heading" className="mt-16 border-t border-gray-200 pt-16">
      <SectionHeading
        id="recommended-sellers-heading"
        eyebrow="Active Listing Contacts"
        eyebrowIcon={<Users className="h-3.5 w-3.5 text-[#029bba]" />}
        title={
          <>
            Recommended <span className="text-[#029bba]">Sellers</span>
          </>
        }
        subtitle="Based on approved public listings matching your current results."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recommended.map((seller) => (
          <article key={`${seller.role}:${seller.slug}`} className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#029bba]/10 text-[#029bba]">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-[#004063]">{seller.name}</h3>
                <p className="text-xs capitalize text-gray-500">{seller.role}</p>
              </div>
            </div>
            <p className="mb-3 text-xs text-gray-600">
              {seller.listingCount} matching listing{seller.listingCount === 1 ? '' : 's'} in {seller.city || 'Pakistan'}
            </p>
            <Link
              href={`/property/${encodeURIComponent(seller.propertySlug)}`}
              aria-label={`View ${seller.propertyTitle} from ${seller.name}`}
              className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-[#029bba] hover:text-[#004063]"
            >
              View listing <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}