//C:\dev\highrise-pk\pages\compare\[shareId].tsx
/**
 * Public shared comparison view.
 * The SSR path applies the same share, expiry, visibility, entity-type,
 * listing-intent, and safe-DTO checks as the public compare API.
 */

import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import {
  MAX_COMPARE_ITEMS,
  parseComparisonReferences,
  resolveCompareReferences,
  validatePropertyListingIntents,
} from '@/lib/compareApi';
import { icons } from '@/lib/design-system/icons';
import CompareTable from '@/components/compare/CompareTable';
import type { CompareEntity } from '@/components/compare/CompareTable';
import type { CompareEntityType } from '@/types/projects';

interface SharedComparisonProps {
  shareId: string;
  entityType: CompareEntityType | null;
  entities: CompareEntity[];
  error?: string;
}

function browseHref(entityType: CompareEntityType | null): string {
  if (entityType === 'project') {
    return '/projects';
  }
  if (entityType === 'society') {
    return '/societies';
  }
  return '/properties';
}

function browseLabel(entityType: CompareEntityType | null): string {
  if (entityType === 'project') {
    return 'Browse Projects';
  }
  if (entityType === 'society') {
    return 'Browse Societies';
  }
  return 'Browse Properties';
}

function typeLabel(entityType: CompareEntityType | null): string {
  if (entityType === 'project') {
    return 'projects';
  }
  if (entityType === 'society') {
    return 'societies';
  }
  return 'properties';
}

export default function SharedComparisonPage({
  shareId,
  entityType,
  entities,
  error,
}: SharedComparisonProps): React.ReactElement {
  const isUnavailable = Boolean(error) || entities.length === 0;
  const primaryBrowseHref = browseHref(entityType);
  const primaryBrowseLabel = browseLabel(entityType);

  if (isUnavailable) {
    return (
      <>
        <Head>
          <title>Comparison Not Found | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <main className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4">
          <div className="max-w-md text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50">
              <icons.BarChart3 className="h-10 w-10 text-[#ef4444]" />
            </div>

            <h1 className="mb-3 text-2xl font-black tracking-tight text-[#004063]">
              Comparison Not Found
            </h1>

            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              {error ??
                'This comparison link may have expired or the items may no longer be publicly available.'}
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={primaryBrowseHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#029bba] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#017a94]"
              >
                {entityType === 'project' ? (
                  <icons.Building2 className="h-4 w-4" />
                ) : entityType === 'society' ? (
                  <icons.MapPin className="h-4 w-4" />
                ) : (
                  <icons.Home className="h-4 w-4" />
                )}
                {primaryBrowseLabel}
              </Link>

              {entityType !== 'property' && (
                <Link
                  href="/properties"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition hover:border-[#029bba]/40 hover:text-[#029bba]"
                >
                  <icons.Home className="h-4 w-4" />
                  Browse Properties
                </Link>
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

  const label = typeLabel(entityType);

  return (
    <>
      <Head>
        <title>
          Shared {entityType === 'project' ? 'Project' : entityType === 'society' ? 'Society' : 'Property'} Comparison ({entities.length} items) | Highrise.pk
        </title>
        <meta
          name="description"
          content={`View a shared comparison of ${entities.length} ${label} on Highrise.pk.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content={`Compare ${entities.length} ${label} on Highrise.pk`}
        />
        <meta
          property="og:description"
          content={`A side-by-side comparison of ${label} shared on Highrise.pk.`}
        />
        <meta
          property="og:url"
          content={`https://highrise.pk/compare/${encodeURIComponent(shareId)}`}
        />
        <link
          rel="canonical"
          href={`https://highrise.pk/compare/${encodeURIComponent(shareId)}`}
        />
      </Head>

      <main className="min-h-screen bg-[#f8f9fa]">
        <div className="border-b border-gray-100 bg-white shadow-sm">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <Link
                href={primaryBrowseHref}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-[#029bba]"
              >
                {primaryBrowseLabel}
                <icons.ArrowRight className="h-4 w-4" />
              </Link>

              <span className="h-4 w-px bg-gray-200" />

              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-[#029bba]"
              >
                <icons.Home className="h-4 w-4" />
                Home
              </Link>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-[#029bba]/10 px-3 py-1.5 text-xs font-bold text-[#029bba]">
              <icons.BarChart3 className="h-3.5 w-3.5" />
              Shared View
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-4 md:py-5 lg:px-6">
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex items-center gap-2 text-xs text-gray-500"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-semibold transition hover:text-[#029bba]"
            >
              <icons.Home className="h-3.5 w-3.5" />
              Home
            </Link>
            <icons.ChevronRight className="h-3 w-3 text-gray-300" />
            <Link
              href="/compare"
              className="font-semibold transition hover:text-[#029bba]"
            >
              Compare
            </Link>
            <icons.ChevronRight className="h-3 w-3 text-gray-300" />
            <span className="font-bold text-[#004063]">Shared</span>
          </nav>

          <h1 className="text-xl font-black leading-tight tracking-tight text-[#004063] md:text-2xl lg:text-3xl">
            Shared Comparison
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
            <span>
              Viewing {entities.length} {label} shared with you.
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-[#029bba]">Highrise.pk</span>
          </p>
        </div>

        <section className="mx-auto max-w-[1440px] px-3 py-6 sm:px-4 lg:px-6">
          <CompareTable
            entities={entities}
            onRemove={async () => Promise.resolve()}
            removingId={null}
          />

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#029bba]/20 bg-[#029bba]/5 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#029bba]/10">
              <icons.BarChart3 className="h-4 w-4 text-[#029bba]" />
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-[#004063]">
                Read-only shared view
              </p>
              <p className="text-xs leading-relaxed text-gray-600">
                This comparison is read-only. To create your own comparison,
                browse publicly available listings and add items to your
                comparison list.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <p className="text-sm font-semibold text-gray-600">
              Want to create your own comparison?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={primaryBrowseHref}
                className="inline-flex items-center gap-2 rounded-xl bg-[#029bba] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#017a94]"
              >
                {primaryBrowseLabel}
                <icons.ArrowRight className="h-4 w-4" />
              </Link>
              {entityType !== 'society' && (
                <Link
                  href="/societies"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition hover:border-[#029bba]/40 hover:text-[#029bba]"
                >
                  Browse Societies
                  <icons.ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<
  SharedComparisonProps
> = async context => {
  const rawShareId = context.params?.shareId;
  const shareId = typeof rawShareId === 'string' ? rawShareId : '';

  if (!/^[A-Za-z0-9_-]{1,100}$/.test(shareId)) {
    return {
      props: {
        shareId: '',
        entityType: null,
        entities: [],
        error: 'Invalid comparison link.',
      },
    };
  }

  try {
    await dbConnect();

    const now = new Date();
    const comparison = await Comparison.findOne({
      shareId,
      isShared: true,
      expiresAt: { $gt: now },
    })
      .maxTimeMS(3000)
      .lean();

    if (!comparison) {
      return {
        props: {
          shareId,
          entityType: null,
          entities: [],
          error: 'This comparison link is not available or has expired.',
        },
      };
    }

    const parsed = parseComparisonReferences(comparison);
    const entityTypes = new Set(
      parsed.references.map(reference => reference.entityType),
    );

    if (
      parsed.invalidCount > 0 ||
      parsed.references.length === 0 ||
      parsed.references.length > MAX_COMPARE_ITEMS ||
      entityTypes.size !== 1
    ) {
      return {
        props: {
          shareId,
          entityType: null,
          entities: [],
          error: 'This comparison link is not available or has expired.',
        },
      };
    }

    const resolved = await resolveCompareReferences(parsed.references);

    if (resolved.unavailableCount > 0) {
      return {
        props: {
          shareId,
          entityType: null,
          entities: [],
          error: 'One or more items are no longer publicly available.',
        },
      };
    }

    const intentValidation = validatePropertyListingIntents(
      parsed.references,
      resolved,
    );

    if (!intentValidation.valid) {
      return {
        props: {
          shareId,
          entityType: null,
          entities: [],
          error: 'This comparison is no longer available.',
        },
      };
    }

    const activeEntityType = Array.from(entityTypes)[0];

    return {
      props: {
        shareId,
        entityType: activeEntityType,
        entities: resolved.entities as unknown as CompareEntity[],
      },
    };
  } catch {
    return {
      props: {
        shareId,
        entityType: null,
        entities: [],
        error: 'Unable to load this comparison right now.',
      },
    };
  }
};