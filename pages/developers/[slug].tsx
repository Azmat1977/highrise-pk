// pages/developers/[slug].tsx
// Highrise.pk - Public Developer Profile Page
// Design System Locked: tokens from @/lib/design-system/tokens | icons from @/lib/design-system/icons
// Pattern C Compliant: 2-column fluid left + natural scroll 3-card sidebar stack | Pure ASCII comments

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { icons } from '@/lib/design-system/icons';
import { colors, containers, grids, radii, shadows } from '@/lib/design-system/tokens';
import { typography } from '@/lib/design-system/typography';
import { card, button, badge, safety } from '@/lib/design-system/components';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';

import UniversalContactCard from '@/components/shared/UniversalContactCard';
import SafeDealSidebarCard from '@/components/shared/SafeDealSidebarCard';
import SafetyWarningCard from '@/components/shared/SafetyWarningCard';
import ReportListingModal from '@/components/property/ReportListingModal';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectImage {
  url: string;
  publicId?: string;
}

interface Project {
  _id: string;
  slug?: string;
  projectName: string;
  city: string;
  area: string;
  projectStatus: string;
  projectCategory: string;
  primaryImage?: string;
  images?: ProjectImage[];
  minPrice?: number;
  maxPrice?: number;
}

interface SocialLinks {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
}

interface DeveloperProfile {
  _id: string;
  companyName: string;
  slug: string;
  badges?: string[];
  logo?: { url: string };
  coverImage?: { url: string; focalY?: number };
  description?: string;
  establishedYear?: number;
  officeAddress?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  socialLinks?: SocialLinks;
  isVerified: boolean;
  status: string;
  highriseScore?: number;
  onTimeDeliveryRate?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  verificationLevel?: 'not_verified' | 'docs_verified' | 'site_verified' | 'fully_verified';
  lastVerifiedAt?: string;
}

interface PageProps {
  developer: DeveloperProfile;
  projects: Project[];
  slug: string;
}

type ActiveTab = 'all' | 'ongoing' | 'completed';

// ============================================================================
// CONSTANTS
// ============================================================================

const SITE_URL = 'https://highrise.pk';
const ISR_REVALIDATE = 60;

const PUBLIC_BADGE_LABELS: Record<string, string> = {
  highrise_verified: 'Highrise Verified',
  top_developer: 'Top Developer',
  trusted_builder: 'Trusted Builder',
  on_time_delivery: 'On-Time Delivery',
  premium_partner: 'Premium Partner',
};

// ============================================================================
// HELPERS
// ============================================================================

function getPriceRange(min?: number, max?: number): string {
  if (min === undefined && max === undefined) return 'Contact for Price';
  const fmt = (n: number): string => {
    if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000) return `${(n / 100_000).toFixed(2)} Lac`;
    return n.toLocaleString('en-PK');
  };
  if (min !== undefined && max !== undefined) return `PKR ${fmt(min)} - ${fmt(max)}`;
  if (min !== undefined) return `From PKR ${fmt(min)}`;
  if (max !== undefined) return `Up to PKR ${fmt(max)}`;
  return 'Contact for Price';
}

function getProjectImage(p: Project): string | null {
  if (p.primaryImage) return p.primaryImage;
  if (p.images && p.images.length > 0) return p.images[0].url;
  return null;
}

function getScoreColorClass(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

// ============================================================================
// JSON-LD BUILDERS
// ============================================================================

function buildOrganizationLd(
  developer: DeveloperProfile,
  projects: Project[],
  slug: string
): string {
  const sameAs = [
    developer.socialLinks?.facebook,
    developer.socialLinks?.linkedin,
    developer.socialLinks?.instagram,
    developer.socialLinks?.twitter,
    developer.socialLinks?.youtube,
    developer.website,
  ].filter((v): v is string => Boolean(v));

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: developer.companyName,
    url: `${SITE_URL}/developers/${slug}`,
    logo: developer.logo?.url,
    image: developer.coverImage?.url ?? developer.logo?.url,
    description: developer.description,
    foundingDate: developer.establishedYear
      ? `${developer.establishedYear}-01-01`
      : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: developer.officeAddress,
      addressLocality: developer.city,
      addressCountry: 'PK',
    },
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };

  if (developer.highriseScore !== undefined) {
    schema['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: (developer.highriseScore / 20).toFixed(1),
      bestRating: 5,
      worstRating: 1,
      ratingCount: projects.length > 0 ? projects.length : 1,
    };
  }

  return JSON.stringify(schema);
}

function buildBreadcrumbLd(companyName: string, slug: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Developers',
        item: `${SITE_URL}/developers`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: companyName,
        item: `${SITE_URL}/developers/${slug}`,
      },
    ],
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  colorClass: string;
}

function StatCard({ label, value, colorClass }: StatCardProps): React.ReactElement {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center">
      <div className={`text-2xl font-black ${colorClass}`}>{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </div>
    </div>
  );
}

function HighriseInsightCard({ developer }: { developer: DeveloperProfile }): React.ReactElement {
  const hasInsight =
    developer.highriseScore !== undefined ||
    developer.onTimeDeliveryRate !== undefined ||
    Boolean(developer.riskLevel) ||
    Boolean(developer.verificationLevel);

  const riskConfig: Record<string, { bg: string; text: string; label: string }> = {
    low: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Low Risk' },
    medium: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Medium Risk' },
    high: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'High Risk' },
  };

  const verifyConfig: Record<string, { bg: string; text: string; label: string }> = {
    not_verified: { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-600', label: 'Not Verified' },
    docs_verified: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Docs Verified' },
    site_verified: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', label: 'Site Verified' },
    fully_verified: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Fully Verified' },
  };

  const risk = developer.riskLevel ? riskConfig[developer.riskLevel] : null;
  const verify = developer.verificationLevel ? verifyConfig[developer.verificationLevel] : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
          <icons.ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#004063]">
            Highrise Compliance Intelligence
          </h3>
          <p className="text-xs text-gray-500">Verified platform audit credentials</p>
        </div>
      </div>

      {hasInsight ? (
        <div className="space-y-5">
          {developer.highriseScore !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-700">Platform Trust Score</span>
                <span className="text-base font-black text-[#004063]">
                  {developer.highriseScore}/100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreColorClass(developer.highriseScore)}`}
                  style={{ width: `${developer.highriseScore}%` }}
                />
              </div>
            </div>
          )}

          {developer.onTimeDeliveryRate !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-700">On-Time Project Delivery</span>
                <span className="text-base font-black text-[#004063]">
                  {developer.onTimeDeliveryRate}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreColorClass(developer.onTimeDeliveryRate)}`}
                  style={{ width: `${developer.onTimeDeliveryRate}%` }}
                />
              </div>
            </div>
          )}

          {(risk || verify) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {risk && (
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${risk.bg} ${risk.text}`}>
                  {risk.label}
                </span>
              )}
              {verify && (
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${verify.bg} ${verify.text}`}>
                  {verify.label}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-4">
          Verification documentation currently under review by compliance team.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function DeveloperProfilePage({
  developer,
  projects,
  slug,
}: PageProps): React.ReactElement {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const completedProjects = useMemo(
    () => projects.filter((p) => p.projectStatus === 'Completed'),
    [projects]
  );
  const ongoingProjects = useMemo(
    () => projects.filter((p) => p.projectStatus !== 'Completed'),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    if (activeTab === 'completed') return completedProjects;
    if (activeTab === 'ongoing') return ongoingProjects;
    return projects;
  }, [activeTab, projects, completedProjects, ongoingProjects]);

  if (router.isFallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-center space-y-3">
          <icons.Loader2 className="w-10 h-10 animate-spin text-[#029bba] mx-auto" />
          <p className="text-sm font-semibold text-gray-500">Loading Developer Profile...</p>
        </div>
      </div>
    );
  }

  const experienceYears = developer.establishedYear
    ? new Date().getFullYear() - developer.establishedYear
    : null;

  const orgLd = buildOrganizationLd(developer, projects, slug);
  const breadcrumbLd = buildBreadcrumbLd(developer.companyName, slug);

  const canonicalUrl = `${SITE_URL}/developers/${slug}`;
  const ogImage = developer.coverImage?.url ?? developer.logo?.url ?? `${SITE_URL}/og/developers.jpg`;
  const metaDesc = developer.description
    ? developer.description.slice(0, 160)
    : `${developer.companyName} is a ${developer.isVerified ? 'verified ' : ''}real estate developer in ${developer.city ?? 'Pakistan'}. ${projects.length} projects listed on Highrise.pk.`;

  return (
    <>
      <Head>
        <title>{`${developer.companyName} - Real Estate Developer | Highrise.pk`}</title>
        <meta name="description" content={metaDesc} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${developer.companyName} | Highrise.pk`} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Highrise.pk" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${developer.companyName} | Highrise.pk`} />
        <meta name="twitter:description" content={metaDesc} />
        <meta name="twitter:image" content={ogImage} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: orgLd.replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: breadcrumbLd.replace(/</g, '\\u003c') }}
        />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">

        {/* Cover Hero Banner */}
        <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden bg-[#004063]">
          {developer.coverImage?.url ? (
            <Image
              src={getOptimizedImageUrl(developer.coverImage.url, { width: 1440 })}
              alt={`${developer.companyName} banner`}
              fill
              className="object-cover"
              style={{ objectPosition: `center ${developer.coverImage.focalY ?? 50}%` }}
              priority
              sizes="100vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-[#004063] to-[#029bba]" />
          )}

          {/* Breadcrumb Overlay */}
          <div className="absolute top-4 left-4 sm:left-6 z-10">
            <nav className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold">
              <Link href="/" className="hover:text-[#029bba] transition-colors flex items-center gap-1">
                <icons.Home className="w-3.5 h-3.5" />
                Home
              </Link>
              <span className="opacity-40">/</span>
              <Link href="/developers" className="hover:text-[#029bba] transition-colors">
                Developers
              </Link>
              <span className="opacity-40">/</span>
              <span className="truncate max-w-[160px] text-white/90">{developer.companyName}</span>
            </nav>
          </div>
        </div>

        {/* Profile Card Header Container */}
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 relative -mt-16 z-20 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-start gap-6">

              {/* Company Logo */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border border-gray-100 bg-white p-3 shadow-md flex items-center justify-center shrink-0 -mt-12 md:-mt-16 relative z-10">
                {developer.logo?.url ? (
                  <img
                    src={getOptimizedImageUrl(developer.logo.url, { width: 250 })}
                    alt={developer.companyName}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <icons.Building2 className="w-12 h-12 text-[#029bba]" />
                )}
              </div>

              {/* Identity & Badges */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className={typography.pageTitle}>{developer.companyName}</h1>
                  {developer.isVerified && (
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      <icons.CheckCircle className="w-3.5 h-3.5" />
                      Verified Developer
                    </span>
                  )}
                </div>

                {/* Trust Badges */}
                {(developer.badges ?? []).some((b) => PUBLIC_BADGE_LABELS[b]) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(developer.badges ?? [])
                      .filter((b) => PUBLIC_BADGE_LABELS[b])
                      .map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#029bba]/10 text-[#004063] text-xs font-bold"
                        >
                          <icons.ShieldCheck className="w-3.5 h-3.5 text-[#029bba]" />
                          {PUBLIC_BADGE_LABELS[b]}
                        </span>
                      ))}
                  </div>
                )}

                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500">
                  {developer.city && (
                    <span className="flex items-center gap-1">
                      <icons.MapPin className="w-4 h-4 text-[#029bba]" />
                      {developer.city}, Pakistan
                    </span>
                  )}
                  {developer.establishedYear && (
                    <span className="flex items-center gap-1">
                      <icons.Calendar className="w-4 h-4 text-[#029bba]" />
                      Operating Since {developer.establishedYear}
                    </span>
                  )}
                  {developer.website && (
                    <a
                      href={developer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#029bba] hover:underline"
                    >
                      <icons.Globe className="w-4 h-4" />
                      Official Website
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* Quick Stats Grid */}
            <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Projects" value={projects.length} colorClass="text-[#004063]" />
              <StatCard label="Completed" value={completedProjects.length} colorClass="text-emerald-600" />
              <StatCard label="Under Construction" value={ongoingProjects.length} colorClass="text-[#029bba]" />
              <StatCard
                label="Industry Experience"
                value={experienceYears ? `${experienceYears}+ Yrs` : 'Established'}
                colorClass="text-[#7c3aed]"
              />
            </div>
          </div>
        </div>

        {/* Main Pattern C Grid Layout */}
        <div className={containers.detail}>
          <div className={grids.detailTwoCol}>

            {/* LEFT COLUMN: Content */}
            <div className="space-y-6 min-w-0">

              {/* About Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                <h2 className={typography.sectionTitlePlain}>About {developer.companyName}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {developer.description ??
                    `Leading real estate development and construction firm active in ${developer.city ?? 'Pakistan'}, delivering high-rise residential and commercial landmarks.`}
                </p>
                {developer.officeAddress && (
                  <div className="pt-3 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500">
                    <icons.MapPin className="w-4 h-4 text-[#029bba] shrink-0 mt-0.5" />
                    <span>Head Office: {developer.officeAddress}</span>
                  </div>
                )}
              </div>

              {/* Compliance & Highrise Insights */}
              <HighriseInsightCard developer={developer} />

              {/* Portfolio Grid */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className={typography.sectionTitlePlain}>Project Portfolio</h2>
                    <p className={typography.caption}>Developments by {developer.companyName}</p>
                  </div>

                  {/* Tabs */}
                  <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 self-start sm:self-auto">
                    {(
                      [
                        { value: 'all', label: `All (${projects.length})` },
                        { value: 'ongoing', label: `Ongoing (${ongoingProjects.length})` },
                        { value: 'completed', label: `Completed (${completedProjects.length})` },
                      ] as Array<{ value: ActiveTab; label: string }>
                    ).map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setActiveTab(t.value)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeTab === t.value
                            ? 'bg-white text-[#004063] shadow-xs'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredProjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredProjects.map((p) => {
                      const img = getProjectImage(p);
                      return (
                        <Link
                          key={p._id}
                          href={`/projects/${p.slug ?? p._id}`}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all overflow-hidden group flex flex-col justify-between"
                        >
                          <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                            {img ? (
                              <Image
                                src={getOptimizedImageUrl(img, { width: 600 })}
                                alt={p.projectName}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-300">
                                <icons.Building2 className="w-10 h-10" />
                              </div>
                            )}
                            <div className="absolute top-3 left-3">
                              <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase">
                                {p.projectCategory}
                              </span>
                            </div>
                            <div className="absolute bottom-3 right-3">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                                  p.projectStatus === 'Completed'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#029bba] text-white'
                                }`}
                              >
                                {p.projectStatus || 'Ongoing'}
                              </span>
                            </div>
                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="text-base font-bold text-[#004063] group-hover:text-[#029bba] transition-colors line-clamp-1">
                                {p.projectName}
                              </h3>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <icons.MapPin className="w-3.5 h-3.5 text-[#029bba]" />
                                {p.area}, {p.city}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  Starting Price
                                </p>
                                <p className="text-sm font-black text-[#004063]">
                                  {getPriceRange(p.minPrice, p.maxPrice)}
                                </p>
                              </div>
                              <span className="p-2 rounded-xl bg-gray-50 text-gray-600 group-hover:bg-[#029bba] group-hover:text-white transition-colors">
                                <icons.ArrowRight className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <icons.Building2 className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                    <h3 className="text-base font-bold text-gray-800">No Projects Found</h3>
                    <p className="text-xs text-gray-400 mt-1">No developments listed under this filter.</p>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Natural Scroll Unified 3-Card Stack */}
            <div className="relative min-w-0 w-full max-w-[340px] justify-self-end">
              <div className="space-y-6 w-full">
                <UniversalContactCard
                  entityType="project"
                  entityId={developer._id}
                  entityTitle={developer.companyName}
                  actorName={developer.companyName}
                  actorRole="Verified Real Estate Developer"
                  actorImage={developer.logo?.url || null}
                  brandLogo="/images/logo.png"
                  isVerified={developer.isVerified}
                  initialPhone={developer.phone}
                  developerId={developer._id}
                />

                <SafeDealSidebarCard />

                <SafetyWarningCard onReport={() => setShowReportModal(true)} />
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Safety Disclaimer */}
        <div className={safety.disclaimer}>
          <div className={safety.disclaimerInner}>
            <icons.Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className={safety.disclaimerText}>
              <strong className="text-amber-800">Legal Disclaimer:</strong>{' '}
              Developer profiles and regulatory credentials are verified against statutory public records (SECP, FBR). Highrise.pk strongly recommends physical site visits and title verification before executing agreements.
            </p>
          </div>
        </div>

      </div>

      {/* Report Listing Modal */}
      <ReportListingModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        propertyId={developer._id}
        reporterUserId=""
        reporterEmail=""
        reporterPhone=""
      />
    </>
  );
}

// ============================================================================
// ISR DATA FETCHING
// ============================================================================

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/developers?limit=200&fields=slug`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    const data = await res.json().catch(() => ({}));

    const slugs: string[] = Array.isArray(data.developers)
      ? data.developers
          .map((d: { slug?: string }) => d.slug)
          .filter((s: unknown): s is string => typeof s === 'string' && s.length > 0)
      : [];

    return {
      paths: slugs.map((s) => ({ params: { slug: s } })),
      fallback: 'blocking',
    };
  } catch {
    return { paths: [], fallback: 'blocking' };
  }
};

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  if (!slug) return { notFound: true };

  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const res = await fetch(
      `${base}/api/developers/${encodeURIComponent(slug)}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (res.status === 404 || !res.ok) return { notFound: true };

    const data = await res.json().catch(() => ({}));

    if (!data.success || !data.data) return { notFound: true };

    return {
      props: {
        developer: data.data as DeveloperProfile,
        projects: (data.projects ?? []) as Project[],
        slug,
      },
      revalidate: ISR_REVALIDATE,
    };
  } catch {
    return { notFound: true };
  }
};