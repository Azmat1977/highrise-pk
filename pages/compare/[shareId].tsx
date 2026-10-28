/**
 * pages/compare/[shareId].tsx
 *
 * Public shared comparison view.
 * Anyone with the URL can view (no auth required).
 * SSR-rendered for SEO + instant load.
 *
 * SUPPORTS BOTH:
 *   ✅ Legacy property-only shared comparisons (backward compatible)
 *   ✅ New multi-entity comparisons (projects + properties)
 *
 * REUSES:
 *   → CompareTable component from /compare page (consistent UX)
 *   → CompareEntity type from same table
 */

import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  Home as HomeIcon,
  ExternalLink,
  BarChart3,
  Building2,
  ChevronRight,
} from 'lucide-react';

import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import Property from '@/models/Property';
import Project from '@/models/Projects';
import mongoose from 'mongoose';

import CompareTable    from '@/components/compare/CompareTable';
import type { CompareEntity } from '@/components/compare/CompareTable';

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface SharedComparisonProps {
  shareId:  string;
  entities: CompareEntity[];
  error?:   string;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function SharedComparisonPage({
  shareId,
  entities,
  error,
}: SharedComparisonProps) {

  // ── Error / Not Found State ──
  if (error || entities.length === 0) {
    return (
      <>
        <Head>
          <title>Comparison Not Found | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <div className="min-h-screen bg-gray-50 flex items-center
                        justify-center px-4">
          <div className="max-w-md text-center">
            <div className="inline-flex items-center justify-center
                            w-20 h-20 rounded-full bg-red-50
                            border-2 border-red-100 mb-6">
              <BarChart3 className="w-10 h-10 text-red-400" />
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-gray-900
                           mb-3 tracking-tight">
              Comparison Not Found
            </h1>

            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {error || 'This comparison link may have expired or been deleted. Shared comparisons are kept for 7 days.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center
                            justify-center gap-3">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-6 py-3
                           rounded-xl bg-[#029bba] text-white
                           text-sm font-black hover:bg-[#017a94]
                           shadow-lg transition-all"
              >
                <Building2 className="w-4 h-4" />
                Browse Projects
              </Link>

              <Link
                href="/properties"
                className="inline-flex items-center gap-2 px-6 py-3
                           rounded-xl bg-white border-2 border-gray-200
                           text-gray-700 text-sm font-black
                           hover:border-[#029bba]/30 hover:text-[#029bba]
                           transition-all"
              >
                <HomeIcon className="w-4 h-4" />
                Browse Properties
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Count breakdown
  const projectCount  = entities.filter(e => e.entityType === 'project').length;
  const propertyCount = entities.filter(e => e.entityType === 'property').length;

  return (
    <>
      <Head>
        <title>Shared Comparison ({entities.length} items) | Highrise.pk</title>
        <meta name="description"
          content={`View a shared comparison of ${entities.length} ${entities.length === 1 ? 'item' : 'items'} on Highrise.pk`} />
        {/* Public share URL — allow indexing for SEO */}
        <meta property="og:type" content="website" />
        <meta property="og:title"
          content={`Compare ${entities.length} items on Highrise.pk`} />
        <meta property="og:description"
          content="Side-by-side comparison of properties and projects" />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ═══════════════════════════════════════════════════════
            TOP BAR
        ═══════════════════════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-3
                          flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 text-sm
                           text-gray-600 hover:text-[#029bba]
                           transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5
                                      transition-transform" />
                Browse Projects
              </Link>
              <span className="h-4 w-px bg-gray-200" />
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm
                           text-gray-500 hover:text-gray-800"
              >
                <HomeIcon className="w-4 h-4" />
                Home
              </Link>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5
                             rounded-full bg-[#029bba]/10 text-[#029bba]
                             text-xs font-black">
              <ExternalLink className="w-3.5 h-3.5" />
              Shared View
            </span>
          </div>
        </div>

        {/* ── COMPACT PAGE HEADER ── */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <Link href="/compare" className="hover:text-[#029bba] font-medium transition-colors">
              Compare
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-[#004063] font-bold">Shared</span>
          </nav>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
            Shared Comparison
          </h1>
          <p className="text-xs text-gray-600 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
            <span>
              Viewing {entities.length} item{entities.length > 1 ? 's' : ''} shared with you.
            </span>
            {projectCount > 0 && propertyCount > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <span>
                  {projectCount} project{projectCount > 1 ? 's' : ''} + {propertyCount} propert{propertyCount > 1 ? 'ies' : 'y'}
                </span>
              </>
            )}
            <span className="text-gray-300">•</span>
            <span className="text-[#029bba]">Powered by Highrise.pk</span>
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════
            COMPARISON TABLE
        ═══════════════════════════════════════════════════════ */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-8">

          {/* Reuse the same CompareTable component from /compare page */}
          {/* Pass no-op onRemove since shared view is read-only */}
          <CompareTable
            entities={entities}
            onRemove={async () => Promise.resolve()}
            removingId={null}
          />

          {/* Info banner */}
          <div className="mt-6 p-4 rounded-2xl bg-[#029bba]/5
                          border border-[#029bba]/20
                          flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#029bba]/10
                            flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-[#029bba]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-gray-900 mb-1">
                💡 Read-Only Shared View
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                This is a read-only comparison shared with you. To save these items
                to your own list or add more, visit any project/property and click
                &quot;Add to Compare&quot;.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-4 font-semibold">
              Want to create your own comparison?
            </p>
            <div className="flex flex-col sm:flex-row items-center
                            justify-center gap-3">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-6 py-3
                           rounded-xl bg-gradient-to-r from-[#029bba] to-[#017a94]
                           text-white text-sm font-black
                           hover:shadow-lg hover:-translate-y-0.5
                           transition-all"
              >
                Explore Projects
                <ExternalLink className="w-4 h-4" />
              </Link>

              <Link
                href="/properties"
                className="inline-flex items-center gap-2 px-6 py-3
                           rounded-xl bg-white border-2 border-gray-200
                           text-gray-700 text-sm font-black
                           hover:border-[#029bba]/30 hover:text-[#029bba]
                           transition-all"
              >
                Explore Properties
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SSR ─────────────────────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps<
  SharedComparisonProps
> = async (context) => {
  const { shareId } = context.params as { shareId: string };

  // Validate shareId format (16 hex chars)
  if (!shareId || !/^[a-zA-Z0-9_-]+$/.test(shareId) || shareId.length > 50) {
    return {
      props: {
        shareId: '',
        entities: [],
        error: 'Invalid share link format',
      },
    };
  }

  try {
    await dbConnect();

    const comparison = await Comparison.findOne({ shareId })
      .maxTimeMS(3000)
      .lean();

    if (!comparison) {
      return {
        props: {
          shareId,
          entities: [],
          error: 'Comparison not found or has expired',
        },
      };
    }

    // ── Get items list (V2 items[] with fallback to legacy properties[]) ──
    let items = comparison.items ?? [];

    if (items.length === 0 && comparison.properties && comparison.properties.length > 0) {
      // Legacy fallback — convert properties[] to items[]
      items = comparison.properties.map((pid: mongoose.Types.ObjectId) => ({
        entityType: 'property' as const,
        entityId:   pid,
        addedAt:    comparison!.createdAt,
      }));
    }

    if (items.length === 0) {
      return {
        props: {
          shareId,
          entities: [],
          error: 'This comparison is empty',
        },
      };
    }

    // ── Separate IDs by entity type ──
    const propertyIds = items
      .filter(i => i.entityType === 'property')
      .map(i => i.entityId);

    const projectIds = items
      .filter(i => i.entityType === 'project')
      .map(i => i.entityId);

    // ── Parallel populate ──
    const [properties, projects] = await Promise.all([
      propertyIds.length > 0
        ? Property.find({
            _id:    { $in: propertyIds },
            'verification.status': 'verified',
          })
            // Note: select both `areaUnit` and `unit` — schema uses one or the other
            // depending on data source (legacy vs new listings)
            .select('title price city area areaUnit unit images propertyType slug bedrooms bathrooms listingType location')
            .maxTimeMS(3000)
            .lean()
        : [],

      projectIds.length > 0
        ? Project.find({
            _id:       { $in: projectIds },
            isDeleted: { $ne: true },
          })
            .select({
              _id: 1, slug: 1, projectName: 1, tagline: 1,
              city: 1, area: 1, projectCategory: 1,
              projectNature: 1, projectStatus: 1,
              isVerified: 1, isFeatured: 1, isTrustedBuilder: 1,
              developerBadge: 1, minPrice: 1, maxPrice: 1,
              highriseScore: 1, nocStatus: 1, approvalAuthority: 1,
              featureImageUrl: 1, 'images.url': 1, 'images.isPrimary': 1,
              'developerProfile.name': 1,
              'developerProfile.logoUrl': 1,
              createdAt: 1,
            })
            .maxTimeMS(3000)
            .lean()
        : [],
    ]);

    // ── Update isShared flag (fire and forget) ──
    if (!comparison.isShared) {
      Comparison.findByIdAndUpdate(comparison._id, {
        $set: { isShared: true },
      }).catch(() => undefined);
    }

    // ── Build ordered entities array ──
    const entities: CompareEntity[] = items
      .map(item => {
        if (item.entityType === 'property') {
          const found = properties.find(
            p => String(p._id) === String(item.entityId),
          );
          if (!found) return null;

          // Serialize (ObjectIds → strings, Dates → ISO)
          // Cast to unknown record for safe optional field access
          // (Property schema fields vary across versions — unit vs areaUnit)
          const propRaw = found as unknown as Record<string, unknown>;

          return {
            entityType: 'property' as const,
            data: {
              _id:          String(found._id),
              title:        found.title,
              price:        found.price,
              city:         found.city,
              area:         found.area,
              areaUnit:     propRaw.areaUnit ?? propRaw.unit ?? null,
              images:       found.images,
              propertyType: found.propertyType,
              slug:         found.slug,
              bedrooms:     found.bedrooms,
              bathrooms:    found.bathrooms,
              listingType:  found.listingType,
            } as Record<string, unknown>,
          };
        } else {
          const found = projects.find(
            p => String(p._id) === String(item.entityId),
          );
          if (!found) return null;

          // Extract image
          let primaryImage: string | null = null;
          if (typeof found.featureImageUrl === 'string') {
            primaryImage = found.featureImageUrl;
          } else if (Array.isArray(found.images) && found.images.length > 0) {
            const imgs = found.images as Array<{ url?: string; isPrimary?: boolean }>;
            primaryImage = imgs.find(i => i?.isPrimary)?.url ?? imgs[0]?.url ?? null;
          }

          const dev = found.developerProfile as { name?: string; logoUrl?: string } | undefined;

          return {
            entityType: 'project' as const,
            data: {
              _id:              String(found._id),
              slug:             found.slug,
              projectName:      found.projectName,
              tagline:          found.tagline,
              city:             found.city,
              area:             found.area,
              projectCategory:  found.projectCategory,
              projectNature:    found.projectNature,
              projectStatus:    found.projectStatus,
              minPrice:         typeof found.minPrice === 'number' ? found.minPrice : null,
              maxPrice:         typeof found.maxPrice === 'number' ? found.maxPrice : null,
              isVerified:       Boolean(found.isVerified),
              isFeatured:       Boolean(found.isFeatured),
              isTrustedBuilder: Boolean(found.isTrustedBuilder),
              developerBadge:   found.developerBadge,
              highriseScore:    typeof found.highriseScore === 'number' ? found.highriseScore : 0,
              nocStatus:        found.nocStatus,
              approvalAuthority: found.approvalAuthority,
              primaryImage,
              developerName:    dev?.name ?? '',
              developerLogoUrl: dev?.logoUrl ?? null,
              createdAt:        found.createdAt instanceof Date
                                ? found.createdAt.toISOString()
                                : String(found.createdAt ?? ''),
            } as Record<string, unknown>,
          };
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    if (entities.length === 0) {
      return {
        props: {
          shareId,
          entities: [],
          error: 'The items in this comparison are no longer available',
        },
      };
    }

    return {
      props: {
        shareId,
        entities,
      },
    };
  } catch (error) {
    console.error('[compare/[shareId]] SSR error:', error);
    return {
      props: {
        shareId: shareId || '',
        entities: [],
        error: 'Failed to load comparison. Please try again.',
      },
    };
  }
};