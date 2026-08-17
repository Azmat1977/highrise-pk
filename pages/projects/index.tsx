/**
 * pages/projects/_new.tsx
 * New Projects Listing Page — V2 Master Build
 * All types → @/types/projects
 * All section components → @/components/projects/
 */

import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useCallback } from 'react';
import { Building2 } from 'lucide-react';

import {
  type FilterState,
  type ProjectsPageProps,
  type SortOption,
  type DeveloperBadge,
  type PropertyType,
  type ProjectListing,
  type CityCount,
  type BudgetBand,
  type TabCount,
  DEFAULT_FILTERS,
  buildQueryString,
  parseFiltersFromQuery,
  escapeRegExp,
  computeStubShield,
} from '@/types/projects';

import { HeroSection }       from '@/components/projects/HeroSection';
import { BrowseByCategory }  from '@/components/projects/BrowseByCategory';
import { ShieldTrustRow }    from '@/components/projects/ShieldTrustRow';
import { DiscoveryTabs }     from '@/components/projects/DiscoveryTabs';
import { FeaturedShowcase }  from '@/components/projects/FeaturedShowcase';
import { BrowseByCity }      from '@/components/projects/BrowseByCity';
import { HotspotAreas }      from '@/components/projects/HotspotAreas';
import { MainProjectGrid }   from '@/components/projects/MainProjectGrid';

import dbConnect from '@/lib/dbConnect';
import Project   from '@/models/Projects';
import { logSecurityEvent }          from '@/lib/security/logSecurityEvent';
import {
  getCityCounts,
  getProjectCategoryCounts,
  getProjectNatureCounts,
  getHotspotAreas,
} from '@/lib/cache/projectAggregations';
  

// ─────────────────────────────────────────────────────────────────────────────

const NewProjectsPage: NextPage<ProjectsPageProps> = ({
  initialFilters,
  initialProjects,
  totalCount,
  cityCounts,
  categoryCounts,
  natureCounts,
  budgetBands,
  hotspots,
  platformStats,
  tabCounts,
  featuredProjects,
}) => {
  const router  = useRouter();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [loading, setLoading] = useState(false);

  // ── Enterprise UX: Results-First Layout ───────────────────
  // When user has ANY filter applied, reorder sections to show
  // results FIRST (tabs → featured → hotspots) and push discovery
  // sections BELOW (categories → trust tools → browse cities).
  //
  // Matches Zameen/MagicBricks/Zillow pattern: users who narrowed
  // their intent should see what they asked for immediately, not
  // scroll past 6 exploration sections to find results.
  const hasActiveFilter = Boolean(
    filters.city
    || filters.category
    || filters.nature
    || filters.type
    || filters.minBudget
    || filters.maxBudget
    || filters.possession
    || filters.noc
    || filters.installments
    || filters.locality
    || filters.builder
  );

  // Sync filters → URL
  // ENTERPRISE PATTERN: Full navigation (shallow: false) forces SSR to
  // re-run with new query params. This means:
  //   - All sections get city-scoped data
  //   - No stale Pakistan-wide data leaks into filtered views
  //   - Every count, card, hotspot respects the selected city
  //   - Matches Zameen/MagicBricks/Zillow behavior
  //
  // Trade-off: 500ms-1s delay on filter change (SSR re-run + hydrate)
  // This is acceptable — enterprise correctness > instant illusion.
  const updateFilters = useCallback(
    (patch: Partial<FilterState>) => {
      const next = { ...filters, ...patch, page: 1 };
      setFilters(next);
      setLoading(true);  // Show loading state during SSR re-run
      const qs = buildQueryString(next);
      void router.push(
        `/projects${qs ? `?${qs}` : ''}`,
        undefined,
        { shallow: false, scroll: false }  // ← FULL SSR RE-RUN
      );
    },
    [filters, router]
  );

  const pageTitle = filters.city
    ? `New Projects in ${filters.city} | Highrise.pk`
    : 'New Projects in Pakistan | Verified Real Estate | Highrise.pk';

  const pageDesc = filters.city
    ? `Browse ${totalCount}+ verified new projects in ${filters.city}. NOC approved, trusted developers. Highrise.pk.`
    : `Discover ${totalCount}+ verified new projects across Pakistan. Highrise.pk — Pehli Eent Se Aakhri Mirror Tak.`;

  const canonical = filters.city
    ? `https://highrise.pk/projects?city=${encodeURIComponent(filters.city)}`
    : 'https://highrise.pk/projects';

  const activeFilterCount = [
    filters.city, filters.type,
    filters.minBudget, filters.maxBudget,
    filters.minArea, filters.maxArea,
    filters.possession,
    filters.noc ? 'noc' : '',
    filters.builder, filters.locality,
  ].filter(Boolean).length;

  const noindex = activeFilterCount >= 3 || filters.page > 1;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description"  content={pageDesc} />
        <link rel="canonical"     href={canonical} />
        {noindex && <meta name="robots" content="noindex, follow" />}
        <meta property="og:type"        content="website" />
        <meta property="og:url"         content={canonical} />
        <meta property="og:title"       content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image"
          content="https://highrise.pk/og-projects.jpg" />
        <meta name="twitter:card"
          content="summary_large_image" />
        <meta name="twitter:title"       content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
      </Head>

      <div className="bg-gray-50 min-h-screen">

        {/* Tools bar moved to a dedicated mid-page section (built later
            as "Smart Tools" — positioned between Browse by City and
            Browse by Budget sections for contextual relevance).
            Tools remain globally accessible via header "Tools ▾" menu. */}

        {/* ════════════════════════════════════════════════════
            UNIFIED HERO — Breadcrumb + H1 + Trust Chips +
            Search Panel + Filters + Stats Bar
            All in ONE cohesive centered dark section.
            Replaces old Breadcrumb + PageHeader + HeroSearch trio.
        ════════════════════════════════════════════════════ */}
        <HeroSection
          filters={filters}
          updateFilters={updateFilters}
          cityCounts={cityCounts}
          categoryCounts={categoryCounts}
          totalCount={totalCount}
          platformStats={platformStats}
          loading={loading}
        />

        {/* ══════════════════════════════════════════════════════
            ENTERPRISE RESULTS-FIRST LAYOUT
            When a filter is active, results appear IMMEDIATELY
            below the hero. When no filter, discovery sections
            lead (users are exploring).
            Matches Zameen/MagicBricks/Zillow behavior.
        ══════════════════════════════════════════════════════ */}

        {hasActiveFilter ? (
          /* ══════════════════════════════════════════════════
              RESULTS MODE — user has narrowed intent
              Order: Tabs → Featured → Hotspots → Divider → Discovery
          ══════════════════════════════════════════════════ */
          <>
            {/* SECTION 5 — Discovery Tabs (MOVED UP for instant refinement) */}
            <DiscoveryTabs
              filters={filters}
              updateFilters={updateFilters}
              tabCounts={tabCounts}
            />

            {/* Grid anchor — DiscoveryTabs auto-scrolls here on click */}
            <div id="project-grid" />

            {/* SECTION 6 — Featured Showcase (RESULTS — main event) */}
            <FeaturedShowcase
              featuredProjects={featuredProjects}
              selectedCity={filters.city || null}
              onClearCity={() => updateFilters({ city: '', locality: '' })}
              onShortlist={undefined}
            />

            {/* SECTION 7 — Hotspot Areas (narrow to neighborhood) */}
            <HotspotAreas
              filters={filters}
              updateFilters={updateFilters}
              hotspots={hotspots}
            />

            {/* ════════════════════════════════════════════════
                SECTION 10 — Main Project Grid (RESULTS MODE)
                The MAIN event — all matching projects.
                Load More (3x) → Pagination hybrid.
                Uses ProjectListingCard 'grid' variant.
            ════════════════════════════════════════════════ */}
            <MainProjectGrid
              filters={filters}
              updateFilters={updateFilters}
              initialProjects={initialProjects}
              totalCount={totalCount}
            />

            {/* ═══════ VISUAL DIVIDER — "Discover More" ═══════
                Clear separation between "your results" and
                "explore other options" — enterprise UX cue */}
            <section
              className="relative bg-gradient-to-b from-white
                         to-gray-50 py-12 md:py-16"
              aria-label="Discover more sections divider"
            >
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r
                                  from-transparent to-gray-200" />
                  <div className="inline-flex items-center gap-3 px-6 py-3
                                  rounded-full bg-white border-2
                                  border-gray-100 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-[#029bba]
                                    animate-pulse" />
                    <span className="text-xs font-black text-gray-700
                                     uppercase tracking-[0.2em]">
                      Discover More
                    </span>
                    <div className="w-2 h-2 rounded-full bg-[#029bba]
                                    animate-pulse" />
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-l
                                  from-transparent to-gray-200" />
                </div>

                <p className="text-center text-sm text-gray-500 mt-4
                              font-semibold">
                  Explore more ways to find your perfect property
                </p>
              </div>
            </section>

            {/* SECTION 3 — Browse by Category (MOVED DOWN — exploration) */}
            <BrowseByCategory
              filters={filters}
              updateFilters={updateFilters}
              categoryCounts={categoryCounts}
              natureCounts={natureCounts}
            />

            {/* SECTION 4 — Trust Tools (MOVED DOWN — trust reinforcement) */}
            <ShieldTrustRow
              platformStats={platformStats}
              selectedCity={filters.city || null}
            />

            {/* SECTION 8 — Browse by City (MOVED DOWN — change city) */}
            <BrowseByCity
              filters={filters}
              updateFilters={updateFilters}
              cityCounts={cityCounts}
            />
          </>
        ) : (
          /* ══════════════════════════════════════════════════
              DISCOVERY MODE — no filter, user is browsing
              Order: Categories → Trust → Tabs → Featured → City → Hotspots
              (original layout for exploration)
          ══════════════════════════════════════════════════ */
          <>
            {/* SECTION 3 — Browse by Project Type */}
            <BrowseByCategory
              filters={filters}
              updateFilters={updateFilters}
              categoryCounts={categoryCounts}
              natureCounts={natureCounts}
            />

            {/* SECTION 4 — Trust Tools */}
            <ShieldTrustRow
              platformStats={platformStats}
              selectedCity={filters.city || null}
            />

            {/* SECTION 5 — Discovery Tabs */}
            <DiscoveryTabs
              filters={filters}
              updateFilters={updateFilters}
              tabCounts={tabCounts}
            />

            {/* Grid anchor — DiscoveryTabs auto-scrolls here on click */}
            <div id="project-grid" />

            {/* SECTION 6 — Featured Showcase */}
            <FeaturedShowcase
              featuredProjects={featuredProjects}
              selectedCity={filters.city || null}
              onClearCity={() => updateFilters({ city: '', locality: '' })}
              onShortlist={undefined}
            />

            {/* SECTION 8 — Browse by City (before Section 7 in funnel) */}
            <BrowseByCity
              filters={filters}
              updateFilters={updateFilters}
              cityCounts={cityCounts}
            />

            {/* SECTION 7 — Hotspot Areas */}
            <HotspotAreas
              filters={filters}
              updateFilters={updateFilters}
              hotspots={hotspots}
            />

            {/* ════════════════════════════════════════════════
                SECTION 10 — Main Project Grid (DISCOVERY MODE)
                Even in browse mode, users can scroll to see all
                projects. Placed at end so discovery sections
                lead the exploration flow.
            ════════════════════════════════════════════════ */}
            <MainProjectGrid
              filters={filters}
              updateFilters={updateFilters}
              initialProjects={initialProjects}
              totalCount={totalCount}
            />
          </>
        )}

        {/* Sections 11–18: inserted below as components */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl border-2 border-dashed
                          border-gray-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold mb-1">
              Section 10 complete ✅ · Main Project Grid live
            </p>
            <p className="text-xs text-gray-400">
              Next up: Section 9 — Browse by Budget &amp; Possession Timeline
            </p>
          </div>
        </div>

      </div>
    </>
  );
};

// ─── SSR ─────────────────────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps<
  ProjectsPageProps
> = async ({ query, req }) => {
  try {
    // ── Lightweight IP-based rate limit for SSR ───────────
    // rateLimitApi expects NextApiRequest (API routes only).
    // In SSR context we use Upstash Redis directly with the
    // client IP extracted from headers.
    const clientIp =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req.socket?.remoteAddress ??
      'unknown';

    // ── Rate limit check (fail-open on Redis outage) ──────
    // If Upstash Redis is unreachable, we ALLOW the request
    // rather than block legitimate users. Rate limiting is a
    // performance/abuse safeguard, not a critical dependency.
    let rateLimitOk = true;
    try {
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis }     = await import('@upstash/redis');

      const ratelimit = new Ratelimit({
        redis:   Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 req/min per IP
        prefix:  'rl:projects:ssr',
      });

      const result = await ratelimit.limit(clientIp);
      rateLimitOk = result.success;
    } catch (rlErr) {
      // eslint-disable-next-line no-console
      console.warn(
        '[projects-ssr] Rate limit check failed — allowing request:',
        rlErr instanceof Error ? rlErr.message : 'unknown error'
      );
      // Fail-open: continue serving the page
      rateLimitOk = true;
    }

    if (!rateLimitOk) {
      // Genuine rate limit hit — soft degradation with empty props
      return {
        props: {
          initialFilters:   DEFAULT_FILTERS,
          initialProjects:  [],
          totalCount:       0,
          cityCounts:       [],
          categoryCounts:   [],
          natureCounts:     [],
          budgetBands:      [],
          hotspots:         [],
          platformStats: {
            totalProjects:   0,
            totalDevelopers: 0,
            totalVerified:   0,
            totalCities:     0,
          },
          tabCounts:        [],
          featuredProjects: [],
        },
      };
    }

    await dbConnect();

    const filters = parseFiltersFromQuery(
      query as Record<string, string | string[] | undefined>
    );

    const base: Record<string, unknown> = {
      isDeleted:               { $ne: true },
      status:                  'verified',
      verificationStatus:      'verified',
      developerApprovalStatus: 'approved',
    };

    if (filters.city) {
      base.city = {
        $regex: new RegExp(`^${escapeRegExp(filters.city)}$`, 'i'),
      };
    }

    // NOTE: filters.type is a PropertyType (Flats/Plots/Shops etc.)
    // Not applied at project level — property types describe
    // individual units inside projects, not the project itself.

    if (filters.category) {
      base.projectCategory = {
        $regex: new RegExp(escapeRegExp(filters.category), 'i'),
      };
    }

    if (filters.nature) {
      base.projectNature = {
        $regex: new RegExp(escapeRegExp(filters.nature), 'i'),
      };
    }

    if (filters.noc)          base.nocStatus = 'approved';
    if (filters.installments) base.saleMode  = { $in: ['Installment', 'Both'] };
    if (filters.possession) {
      const map: Record<string, string> = {
        ready_to_move:      'Completed',
        under_construction: 'Under Construction',
        new_launch:         'Launched',
        pre_launch:         'Pre-Launch',
      };
      if (map[filters.possession]) {
        base.projectStatus = map[filters.possession];
      }
    }
    if (filters.minBudget || filters.maxBudget) {
      const pf: Record<string, number> = {};
      if (filters.minBudget) pf.$gte = filters.minBudget;
      if (filters.maxBudget) pf.$lte = filters.maxBudget;
      base.minPrice = pf;
    }

    const sortMap: Record<SortOption, Record<string, 1 | -1>> = {
      relevance:  { highriseScore: -1, createdAt: -1 },
      price_asc:  { minPrice: 1,       createdAt: -1 },
      price_desc: { minPrice: -1,      createdAt: -1 },
      possession: { possessionStartDate: 1, createdAt: -1 },
      newest:     { createdAt: -1,     _id: -1 },
    };

    const PAGE_SIZE = 12;
    const skip      = (filters.page - 1) * PAGE_SIZE;

    // ── Parallel: projects + count + cached aggregations ──
    const [
      rawProjects,
      total,
      cityCounts,
      categoryCounts,
      natureCounts,
      hotspots,
    ] = await Promise.all([
      Project.find(base)
        .sort(sortMap[filters.sort] ?? sortMap.relevance)
        .skip(skip)
        .limit(PAGE_SIZE)
        .select({
          _id: 1, slug: 1, projectName: 1, tagline: 1,
          city: 1, area: 1, projectCategory: 1,
          projectNature: 1, projectStatus: 1,
          isVerified: 1, isFeatured: 1, isTrustedBuilder: 1,
          developerBadge: 1, minPrice: 1, maxPrice: 1,
          highriseScore: 1, nocStatus: 1,
          featureImageUrl: 1, 'images.url': 1,
          'images.isPrimary': 1,
          developerId: 1,
          'developerProfile.name': 1,
          'developerProfile.logoUrl': 1,
          createdAt: 1,
        })
        .maxTimeMS(5000)
        .lean(),

      Project.countDocuments(base).maxTimeMS(3000),

      getCityCounts(),                        // cached — city counts
      getProjectCategoryCounts(base),         // cached — project categories
      getProjectNatureCounts(base),           // cached — project nature
      getHotspotAreas(filters.city || undefined), // cached — hotspot areas
    ]);

    // ── Platform stats + Tab counts (parallel) ────────────
    // verifiedBase: Pakistan-wide baseline (for platform totals)
    const verifiedBase = {
      isDeleted:               { $ne: true },
      status:                  'verified',
      verificationStatus:      'verified',
      developerApprovalStatus: 'approved',
    };

    // cityAwareBase: same as verifiedBase but includes city filter.
    // Used for ALL tab counts + featured projects so they respect
    // the user's selected city (enterprise cascading filter pattern).
    // If no city selected → identical to verifiedBase.
    const cityAwareBase: Record<string, unknown> = { ...verifiedBase };
    if (filters.city) {
      cityAwareBase.city = {
        $regex: new RegExp(`^${escapeRegExp(filters.city)}$`, 'i'),
      };
    }

    const [
      totalProjects,       // Pakistan-wide (hero stats bar bottom)
      totalVerified,       // Pakistan-wide (hero stats bar bottom)
      cityScopedTotal,     // City-scoped (Section 4 Card 1)
      cityScopedVerified,  // City-scoped (Section 4 Card 2 fallback)
      cityScopedNoc,       // City-scoped (Section 4 Card 3)
      countAll,
      countReady,
      countInstallments,
      countNewLaunch,
      countTopRated,
      countGovtApproved,
    ] = await Promise.all([
      // Platform stats — INTENTIONALLY Pakistan-wide (hero stats bar
      // shows total platform reach, not filtered subset)
      Project.countDocuments({
        isDeleted: { $ne: true }, status: 'verified',
      }).maxTimeMS(2000),
      Project.countDocuments({
        isDeleted: { $ne: true }, isVerified: true,
      }).maxTimeMS(2000),

      // City-scoped stats for Section 4 (Shield Trust Row cards)
      // If no city selected → same as Pakistan-wide
      // If city selected → only that city's counts
      Project.countDocuments(cityAwareBase).maxTimeMS(2000),
      Project.countDocuments({
        ...cityAwareBase, isVerified: true,
      }).maxTimeMS(2000),
      Project.countDocuments({
        ...cityAwareBase, nocStatus: 'approved',
      }).maxTimeMS(2000),

      // Tab counts — CITY-AWARE
      Project.countDocuments(cityAwareBase).maxTimeMS(2000),

      // Tab: Ready to Move
      Project.countDocuments({
        ...cityAwareBase, projectStatus: 'Completed',
      }).maxTimeMS(2000),

      // Tab: On Installments (saleMode = Installment or Both)
      Project.countDocuments({
        ...cityAwareBase, saleMode: { $in: ['Installment', 'Both'] },
      }).maxTimeMS(2000),

      // Tab: New Launches
      Project.countDocuments({
        ...cityAwareBase,
        projectStatus: { $in: ['Launched', 'Pre-Launch'] },
      }).maxTimeMS(2000),

      // Tab: Top Rated (highriseScore ≥ 70)
      Project.countDocuments({
        ...cityAwareBase, highriseScore: { $gte: 70 },
      }).maxTimeMS(2000),

      // Tab: Govt Approved (NOC approved)
      Project.countDocuments({
        ...cityAwareBase, nocStatus: 'approved',
      }).maxTimeMS(2000),
    ]);

    const tabCounts: TabCount[] = [
      { key: 'all_projects',  count: countAll           },
      { key: 'ready_to_move', count: countReady         },
      { key: 'installments',  count: countInstallments  },
      { key: 'new_launch',    count: countNewLaunch     },
      { key: 'top_rated',     count: countTopRated      },
      { key: 'govt_approved', count: countGovtApproved  },
    ];

    const projects: ProjectListing[] = (
      rawProjects as Array<Record<string, unknown>>
    ).map(p => {
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') {
        primaryImage = p.featureImageUrl;
      } else if (Array.isArray(p.images) && p.images.length > 0) {
        const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
        primaryImage =
          imgs.find(i => i?.isPrimary)?.url ?? imgs[0]?.url ?? null;
      }

      const dev  = p.developerProfile as
        { name?: string; logoUrl?: string } | undefined;
      const score = typeof p.highriseScore === 'number'
        ? p.highriseScore : 0;
      const noc   = (p.nocStatus as string | undefined) ?? 'not_applied';

      return {
        _id:              String(p._id ?? ''),
        slug:             String(p.slug ?? ''),
        projectName:      String(p.projectName ?? ''),
        tagline:          typeof p.tagline === 'string' ? p.tagline : null,
        city:             String(p.city ?? ''),
        area:             String(p.area ?? ''),
        locality:         null,
        propertyType:     ['flats'] as PropertyType[],
        projectCategory:  String(p.projectCategory ?? ''),
        projectNature:    String(p.projectNature ?? ''),
        projectStatus:    'under_construction' as const,
        minPrice:         typeof p.minPrice === 'number' ? p.minPrice : null,
        maxPrice:         typeof p.maxPrice === 'number' ? p.maxPrice : null,
        priceOnRequest:   typeof p.minPrice !== 'number',
        minAreaMarla:     null,
        maxAreaMarla:     null,
        minBedrooms:      null,
        maxBedrooms:      null,
        possessionDate:   null,
        possessionQuarter:null,
        isVerified:       Boolean(p.isVerified),
        nocStatus:        noc as 'approved' | 'pending' | 'not_applied',
        nocAuthority:     null,
        nocNumber:        null,
        legalDocumentUrl: null,
        shield:           computeStubShield({
          nocStatus:      noc as 'approved' | 'pending' | 'not_applied',
          isVerified:     Boolean(p.isVerified),
          developerBadge: typeof p.developerBadge === 'string'
                          ? p.developerBadge : null,
          highriseScore:  score,
        }),
        developerId:      p.developerId ? String(p.developerId) : null,
        developerName:    dev?.name ?? '',
        developerSlug:    '',
        developerLogoUrl: dev?.logoUrl ?? null,
        developerBadge:   typeof p.developerBadge === 'string'
                          ? p.developerBadge as DeveloperBadge
                          : null,
        isTrustedBuilder: Boolean(p.isTrustedBuilder),
        marketedBy:       null,
        primaryImage,
        imageCount:       Array.isArray(p.images) ? p.images.length : 0,
        isShortlisted:    false,
        inquiryCount:     null,
        amenities:        [],
        fairPriceUrl:     String(p.slug ?? '')
                          ? `/tools/fair-price?project=${String(p.slug)}`
                          : null,
        isFeatured:       Boolean(p.isFeatured),
        highriseScore:    score,
        createdAt:        p.createdAt instanceof Date
                          ? p.createdAt.toISOString()
                          : String(p.createdAt ?? ''),
      };
    });

    const budgetBands: BudgetBand[] = [
      { key: 'under_50L', label: 'Under 50 Lakh',  minPKR: null,       maxPKR: 5_000_000,  count: 0 },
      { key: '50L_1Cr',   label: '50L – 1 Crore',  minPKR: 5_000_000,  maxPKR: 10_000_000, count: 0 },
      { key: '1Cr_2Cr',   label: '1 Cr – 2 Crore', minPKR: 10_000_000, maxPKR: 20_000_000, count: 0 },
      { key: 'above_2Cr', label: 'Above 2 Crore',  minPKR: 20_000_000, maxPKR: null,       count: 0 },
    ];

    // ── Section 6: 3-tier featured project selection ──────────
    // Shared select projection for all 3 tiers
    const featuredSelect = {
      _id: 1, slug: 1, projectName: 1, tagline: 1,
      city: 1, area: 1, projectCategory: 1,
      projectNature: 1, projectStatus: 1,
      isVerified: 1, isFeatured: 1, isTrustedBuilder: 1,
      developerBadge: 1, minPrice: 1, maxPrice: 1,
      highriseScore: 1, nocStatus: 1, approvalAuthority: 1,
      featureImageUrl: 1, 'images.url': 1,
      'images.isPrimary': 1,
      developerId: 1,
      'developerProfile.name': 1,
      'developerProfile.logoUrl': 1,
      saleMode: 1, inquiries: 1, createdAt: 1,
      // Area + bedroom data from unit breakdown
      'unitTypeBreakdown.areaRangeMarla': 1,
      'unitTypeBreakdown.bedrooms': 1,
    };

    // ── Section 6 featured tiers — ALL CITY-AWARE ─────────
    // Enterprise pattern: If Rawalpindi selected but has 0 featured
    // projects → featuredRaw = [] → FeaturedShowcase shows empty state
    // with "No featured in Rawalpindi yet" message.
    // Never mix cities (misleading user trust).

    // Tier 1 — explicitly featured in current city
    const featTier1Raw = await Project.find({
      ...cityAwareBase,
      isFeatured: true,
    })
      .sort({ highriseScore: -1, createdAt: -1 })
      .limit(8)
      .select(featuredSelect)
      .maxTimeMS(3000)
      .lean();

    // Tier 2 — high shield score in current city
    const needed2      = 8 - featTier1Raw.length;
    const tier1Ids     = featTier1Raw.map(p => p._id);
    const featTier2Raw = needed2 > 0
      ? await Project.find({
          ...cityAwareBase,
          highriseScore: { $gte: 70 },
          _id: { $nin: tier1Ids },
        })
          .sort({ highriseScore: -1 })
          .limit(needed2)
          .select(featuredSelect)
          .maxTimeMS(3000)
          .lean()
      : [];

    // Tier 3 — latest verified in current city
    const needed3      = 8 - featTier1Raw.length - featTier2Raw.length;
    const tier2Ids     = featTier2Raw.map(p => p._id);
    const featTier3Raw = needed3 > 0
      ? await Project.find({
          ...cityAwareBase,
          isVerified: true,
          _id: { $nin: [...tier1Ids, ...tier2Ids] },
        })
          .sort({ createdAt: -1 })
          .limit(needed3)
          .select(featuredSelect)
          .maxTimeMS(3000)
          .lean()
      : [];

    // Combine all tiers — Tier 1 always first
    const featuredRaw = [
      ...featTier1Raw,
      ...featTier2Raw,
      ...featTier3Raw,
    ] as Array<Record<string, unknown>>;

    // Reuse same mapper pattern as initialProjects
    // Extracts min/max Marla + bedrooms from unitTypeBreakdown
    const featuredProjects: ProjectListing[] = featuredRaw.map(p => {
      // ── Image resolution (virtual stripped by .lean()) ──
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') {
        primaryImage = p.featureImageUrl;
      } else if (Array.isArray(p.images) && p.images.length > 0) {
        const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
        primaryImage =
          imgs.find(i => i?.isPrimary)?.url ?? imgs[0]?.url ?? null;
      }

      // ── Developer snapshot ──
      const dev  = p.developerProfile as
        { name?: string; logoUrl?: string } | undefined;

      // ── Trust fields ──
      const score = typeof p.highriseScore === 'number'
        ? p.highriseScore : 0;
      const noc   = (p.nocStatus as string | undefined) ?? 'not_applied';

      // ── Area from unitTypeBreakdown ──
      // Aggregate min/max across all unit types
      let minAreaMarla: number | null = null;
      let maxAreaMarla: number | null = null;
      let minBedrooms:  number | null = null;
      let maxBedrooms:  number | null = null;

      if (Array.isArray(p.unitTypeBreakdown)) {
        const units = p.unitTypeBreakdown as Array<{
          areaRangeMarla?: { min?: number; max?: number };
          bedrooms?:       number;
        }>;

        for (const u of units) {
          const uMin = u.areaRangeMarla?.min;
          const uMax = u.areaRangeMarla?.max;
          const uBed = u.bedrooms;

          if (typeof uMin === 'number') {
            minAreaMarla = minAreaMarla === null
              ? uMin : Math.min(minAreaMarla, uMin);
          }
          if (typeof uMax === 'number') {
            maxAreaMarla = maxAreaMarla === null
              ? uMax : Math.max(maxAreaMarla, uMax);
          }
          if (typeof uBed === 'number') {
            minBedrooms = minBedrooms === null
              ? uBed : Math.min(minBedrooms, uBed);
            maxBedrooms = maxBedrooms === null
              ? uBed : Math.max(maxBedrooms, uBed);
          }
        }
      }

      return {
        _id:              String(p._id ?? ''),
        slug:             String(p.slug ?? ''),
        projectName:      String(p.projectName ?? ''),
        tagline:          typeof p.tagline === 'string' ? p.tagline : null,
        city:             String(p.city ?? ''),
        area:             String(p.area ?? ''),
        locality:         null,
        propertyType:     ['flats'] as PropertyType[],
        projectCategory:  String(p.projectCategory ?? ''),
        projectNature:    String(p.projectNature ?? ''),
        projectStatus:    'under_construction' as const,
        minPrice:         typeof p.minPrice === 'number' ? p.minPrice : null,
        maxPrice:         typeof p.maxPrice === 'number' ? p.maxPrice : null,
        priceOnRequest:   typeof p.minPrice !== 'number',
        minAreaMarla,
        maxAreaMarla,
        minBedrooms,
        maxBedrooms,
        possessionDate:   null,
        possessionQuarter:null,
        isVerified:       Boolean(p.isVerified),
        nocStatus:        noc as 'approved' | 'pending' | 'not_applied',
        nocAuthority:     typeof p.approvalAuthority === 'string'
                          ? p.approvalAuthority : null,
        nocNumber:        null,
        legalDocumentUrl: null,
        shield:           computeStubShield({
          nocStatus:      noc as 'approved' | 'pending' | 'not_applied',
          isVerified:     Boolean(p.isVerified),
          developerBadge: typeof p.developerBadge === 'string'
                          ? p.developerBadge : null,
          highriseScore:  score,
        }),
        developerId:      p.developerId ? String(p.developerId) : null,
        developerName:    dev?.name ?? '',
        developerSlug:    '',
        developerLogoUrl: dev?.logoUrl ?? null,
        developerBadge:   typeof p.developerBadge === 'string'
                          ? p.developerBadge as DeveloperBadge
                          : null,
        isTrustedBuilder: Boolean(p.isTrustedBuilder),
        marketedBy:       null,
        primaryImage,
        imageCount:       Array.isArray(p.images) ? p.images.length : 0,
        isShortlisted:    false,
        inquiryCount:     typeof p.inquiries === 'number'
                          ? p.inquiries : null,
        amenities:        [],
        fairPriceUrl:     String(p.slug ?? '')
                          ? `/tools/fair-price?project=${String(p.slug)}`
                          : null,
        isFeatured:       Boolean(p.isFeatured),
        highriseScore:    score,
        createdAt:        p.createdAt instanceof Date
                          ? p.createdAt.toISOString()
                          : String(p.createdAt ?? ''),
      };
    });

    return {
      props: {
        initialFilters:  filters,
        initialProjects: projects,
        totalCount:      total,
        cityCounts,
        categoryCounts,
        natureCounts,
        budgetBands,
        hotspots,
        platformStats: {
          // Pakistan-wide (hero stats bar at bottom)
          totalProjects,
          totalDevelopers: 0,
          totalVerified,
          totalCities:     cityCounts.length,
          // City-scoped (Section 4 Shield Trust Row)
          // When city selected: reflects that city only
          // When no city: same as Pakistan-wide numbers
          cityScopedTotal,
          cityScopedVerified,
          cityScopedNoc,
        },
        tabCounts,
        featuredProjects,
      },
    };

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';

    // Extract IP directly from headers — getClientIp() expects
    // NextApiRequest (API routes only), not SSR IncomingMessage.
    const errorIp =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req.socket?.remoteAddress ??
      'unknown';

    await logSecurityEvent({
      type:      'system_error',
      severity:  'high',
      ip:        errorIp,
      userAgent: req.headers['user-agent'] ?? 'SSR',
      metadata: {
        action:   'projects_ssr_failed',
        endpoint: '/projects',
        reason:   errMsg,
      },
    }).catch(() => undefined);

    return {
      props: {
        initialFilters:   DEFAULT_FILTERS,
        initialProjects:  [],
        totalCount:       0,
        cityCounts:       [],
        categoryCounts:   [],
        natureCounts:     [],
        budgetBands:      [],
        hotspots:         [],
        platformStats: {
          totalProjects:   0,
          totalDevelopers: 0,
          totalVerified:   0,
          totalCities:     0,
        },
        tabCounts:        [],
        featuredProjects: [],
      },
    };
  }
};

export default NewProjectsPage;