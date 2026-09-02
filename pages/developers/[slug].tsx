// pages/developers/[slug].tsx

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import type { GetStaticPaths, GetStaticProps } from 'next';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  Calendar,
  ArrowRight,
  Layers,
  Shield,
  Star,
  Home,
  Loader2,
} from 'lucide-react';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ProjectImage {
  url:      string;
  publicId?: string;
}

interface Project {
  _id:             string;
  slug?:           string;
  projectName:     string;
  city:            string;
  area:            string;
  projectStatus:   string;
  projectCategory: string;
  primaryImage?:   string;
  images?:         ProjectImage[];
  minPrice?:       number;
  maxPrice?:       number;
}

interface SocialLinks {
  facebook?:  string;
  linkedin?:  string;
  instagram?: string;
  twitter?:   string;
  youtube?:   string;
}

interface DeveloperProfile {
  _id:                 string;
  companyName:         string;
  slug:                string;
  badges?:             string[];
  logo?:               { url: string };
  coverImage?:         { url: string };
  description?:        string;
  establishedYear?:    number;
  officeAddress?:      string;
  city?:               string;
  phone?:              string;
  email?:              string;
  website?:            string;
  socialLinks?:        SocialLinks;
  isVerified:          boolean;
  status:              string;
  highriseScore?:      number;
  onTimeDeliveryRate?: number;
  riskLevel?:          'low' | 'medium' | 'high';
  verificationLevel?:  'not_verified' | 'docs_verified' | 'site_verified' | 'fully_verified';
  lastVerifiedAt?:     string;
}

interface PageProps {
  developer: DeveloperProfile;
  projects:  Project[];
  slug:      string;
}

type ActiveTab = 'all' | 'ongoing' | 'completed';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Constants
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SITE_URL        = 'https://highrise.pk';
const ISR_REVALIDATE  = 60;

// Admin-awarded trust badges (assign-badge API → badges[] → public display)
const PUBLIC_BADGE_LABELS: Record<string, string> = {
  highrise_verified: 'Highrise Verified',
  top_developer:     'Top Developer',
  trusted_builder:   'Trusted Builder',
  on_time_delivery:  'On-Time Delivery',
  premium_partner:   'Premium Partner',
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getPriceRange(min?: number, max?: number): string {
  if (min === undefined && max === undefined) return 'Contact for Price';
  const fmt = (n: number): string => {
    if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000)    return `${(n / 100_000).toFixed(2)} Lac`;
    return n.toLocaleString('en-PK');
  };
  if (min !== undefined && max !== undefined) return `${fmt(min)} â€“ ${fmt(max)}`;
  if (min !== undefined) return `From ${fmt(min)}`;
  if (max !== undefined) return `Up to ${fmt(max)}`;
  return 'Contact for Price';
}

function getProjectImage(p: Project): string | null {
  if (p.primaryImage) return p.primaryImage;
  if (p.images && p.images.length > 0) return p.images[0].url;
  return null;
}

function getScoreColorClass(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// JSON-LD builders
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildOrganizationLd(
  developer: DeveloperProfile,
  projects:  Project[],
  slug:      string
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
    '@context':    'https://schema.org',
    '@type':       'Organization',
    name:          developer.companyName,
    url:           `${SITE_URL}/developers/${slug}`,
    logo:          developer.logo?.url,
    image:         developer.coverImage?.url ?? developer.logo?.url,
    description:   developer.description,
    foundingDate:  developer.establishedYear
      ? `${developer.establishedYear}-01-01`
      : undefined,
    address: {
      '@type':          'PostalAddress',
      streetAddress:    developer.officeAddress,
      addressLocality:  developer.city,
      addressCountry:   'PK',
    },
    // PII fields are not in the public API payload (contact gating) —
    // removed from structured data to keep the contract consistent.
    sameAs:    sameAs.length > 0 ? sameAs : undefined,
  };

  if (developer.highriseScore !== undefined) {
    schema['aggregateRating'] = {
      '@type':       'AggregateRating',
      ratingValue:   (developer.highriseScore / 20).toFixed(1),
      bestRating:    5,
      worstRating:   1,
      ratingCount:   projects.length > 0 ? projects.length : 1,
    };
  }

  return JSON.stringify(schema);
}

function buildBreadcrumbLd(
  companyName: string,
  slug:        string
): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      {
        '@type':    'ListItem',
        position:   1,
        name:       'Home',
        item:       SITE_URL,
      },
      {
        '@type':    'ListItem',
        position:   2,
        name:       'Developers',
        item:       `${SITE_URL}/developers`,
      },
      {
        '@type':    'ListItem',
        position:   3,
        name:       companyName,
        item:       `${SITE_URL}/developers/${slug}`,
      },
    ],
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sub-components
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  bg:    string;
}

function StatCard({
  label,
  value,
  color,
  bg,
}: StatCardProps): React.ReactElement {
  return (
    <div className={`rounded-3xl p-6 text-center transition-transform hover:scale-105 ${bg}`}>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </div>
    </div>
  );
}

interface ContactItemProps {
  icon:   React.ReactElement;
  label:  string;
  value?: string;
  href?:  string;
}

function ContactItem({
  icon,
  label,
  value,
  href,
}: ContactItemProps): React.ReactElement | null {
  if (!value) return null;
  return (
    <div className="group flex gap-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white text-[#029bba] shadow-sm transition-all group-hover:bg-[#029bba] group-hover:text-white">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="mt-1 block truncate text-sm font-bold text-slate-800 transition-colors hover:text-[#029bba]"
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {value}
          </a>
        ) : (
          <p className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-slate-800">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function HighriseInsightCard({
  developer,
}: {
  developer: DeveloperProfile;
}): React.ReactElement {
  const hasInsight =
    developer.highriseScore      !== undefined ||
    developer.onTimeDeliveryRate !== undefined ||
    Boolean(developer.riskLevel) ||
    Boolean(developer.verificationLevel);

  const riskConfig: Record<string, { bg: string; text: string; label: string }> = {
    low:    { bg: 'bg-green-100', text: 'text-green-700',  label: 'Low Risk'    },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700',  label: 'Medium Risk' },
    high:   { bg: 'bg-red-100',   text: 'text-red-700',    label: 'High Risk'   },
  };

  const verifyConfig: Record<string, { bg: string; text: string; label: string }> = {
    not_verified:  { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Not Verified'  },
    docs_verified: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Docs Verified' },
    site_verified: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Site Verified' },
    fully_verified:{ bg: 'bg-green-100',  text: 'text-green-700',  label: 'Fully Verified'},
  };

  const risk   = developer.riskLevel         ? riskConfig[developer.riskLevel]           : null;
  const verify = developer.verificationLevel ? verifyConfig[developer.verificationLevel] : null;

  const formatDate = (d?: string): string | null => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-PK', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#029bba]">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">
            Highrise Insight
          </h3>
          <p className="text-[10px] text-slate-500">Verified by Highrise.pk Team</p>
        </div>
      </div>

      {hasInsight ? (
        <div className="space-y-5">
          {/* Trust Score */}
          {developer.highriseScore !== undefined && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Trust Score</span>
                <span className="text-lg font-black text-slate-900">
                  {developer.highriseScore}/100
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreColorClass(developer.highriseScore)}`}
                  style={{ width: `${developer.highriseScore}%` }}
                />
              </div>
            </div>
          )}

          {/* On-Time Delivery */}
          {developer.onTimeDeliveryRate !== undefined && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  On-Time Delivery
                </span>
                <span className="text-lg font-black text-slate-900">
                  {developer.onTimeDeliveryRate}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreColorClass(developer.onTimeDeliveryRate)}`}
                  style={{ width: `${developer.onTimeDeliveryRate}%` }}
                />
              </div>
            </div>
          )}

          {/* Risk + Verification badges */}
          {(risk ?? verify) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {risk && (
                <span className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase ${risk.bg} ${risk.text}`}>
                  {risk.label}
                </span>
              )}
              {verify && (
                <span className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase ${verify.bg} ${verify.text}`}>
                  {verify.label}
                </span>
              )}
            </div>
          )}

          {/* Last verified */}
          {developer.lastVerifiedAt && (
            <p className="border-t border-slate-200 pt-2 text-[10px] text-slate-400">
              Last verified on {formatDate(developer.lastVerifiedAt)}
            </p>
          )}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-slate-500">
          Verification in progress. Our team is reviewing documents.
        </p>
      )}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// getStaticPaths
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const res  = await fetch(
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
      paths:    slugs.map((s) => ({ params: { slug: s } })),
      fallback: 'blocking',
    };
  } catch {
    return { paths: [], fallback: 'blocking' };
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// getStaticProps
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  if (!slug) return { notFound: true };

  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const res  = await fetch(
      `${base}/api/developers/${encodeURIComponent(slug)}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    // NOTE: base env (NEXT_PUBLIC_SITE_URL) must point to the running dev
    // server (http://localhost:3000) in local dev — production build uses
    // the real domain. If 404 persists locally, verify this env value.

    if (res.status === 404) return { notFound: true };
    if (!res.ok)            return { notFound: true };

    const data = await res.json().catch(() => ({}));

    // API contract: { success: true, data: { ...profile } } — NOT a
    // `developer` key (the old mismatch caused 404 on every profile).
    if (!data.success || !data.data) return { notFound: true };

    return {
      props: {
        developer: data.data as DeveloperProfile,
        projects:  (data.projects ?? [])  as Project[],
        slug,
      },
      revalidate: ISR_REVALIDATE,
    };
  } catch {
    return { notFound: true };
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Page Component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function DeveloperProfilePage({
  developer,
  projects,
  slug,
}: PageProps): React.ReactElement {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>('all');


  // â”€â”€ Derived â”€â”€
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
    if (activeTab === 'ongoing')   return ongoingProjects;
    return projects;
  }, [activeTab, projects, completedProjects, ongoingProjects]);
  // ISR fallback skeleton
  if (router.isFallback) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#029bba]" />
      </div>
    );
  }

  const experienceYears = developer.establishedYear
    ? new Date().getFullYear() - developer.establishedYear
    : null;

  // â”€â”€ JSON-LD â”€â”€
  const orgLd        = buildOrganizationLd(developer, projects, slug);
  const breadcrumbLd = buildBreadcrumbLd(developer.companyName, slug);

  const canonicalUrl  = `${SITE_URL}/developers/${slug}`;
  const ogImage       = developer.coverImage?.url ?? developer.logo?.url ?? `${SITE_URL}/og/developers.jpg`;
  const metaDesc      = developer.description
    ? developer.description.slice(0, 160)
    : `${developer.companyName} is a ${developer.isVerified ? 'verified ' : ''}real estate developer in ${developer.city ?? 'Pakistan'}. ${projects.length} projects, ${completedProjects.length} completed.`;

  return (
    <>
      <Head>
        <title>
          {developer.companyName} â€” Real Estate Developer in {developer.city ?? 'Pakistan'} | Highrise.pk
        </title>
        <meta name="description"  content={metaDesc} />
        <meta name="robots"       content="index, follow" />
        <link rel="canonical"     href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type"        content="profile" />
        <meta property="og:url"         content={canonicalUrl} />
        <meta property="og:title"       content={`${developer.companyName} | Real Estate Developer | Highrise.pk`} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:image"       content={ogImage} />
        <meta property="og:site_name"   content="Highrise.pk" />

        {/* Twitter */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={`${developer.companyName} | Highrise.pk`} />
        <meta name="twitter:description" content={metaDesc} />
        <meta name="twitter:image"       content={ogImage} />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: orgLd.replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: breadcrumbLd.replace(/</g, '\\u003c') }}
        />
      </Head>

      {/* TODO: Wrap with <Layout> when Header/Footer built (Section 9) */}
      <div className="min-h-screen bg-gray-50 pb-20">

        {/* â”€â”€ Hero Banner â”€â”€ */}
        <div className="relative h-[250px] w-full overflow-hidden bg-[#029bba]">
          {developer.coverImage?.url && (
            <Image
              src={developer.coverImage.url}
              alt={`${developer.companyName} cover`}
              fill
              className="object-cover opacity-30"
              priority
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-black/10" />

          {/* Breadcrumb overlay */}
          <div className="absolute left-0 right-0 top-6 z-10 mx-auto max-w-7xl px-4">
            <nav className="w-fit rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
              <Link href="/" className="transition-colors hover:text-white/80">
                <Home className="mr-1 inline h-3 w-3" />
                Home
              </Link>
              <span className="mx-2 opacity-50">/</span>
              <Link href="/developers" className="transition-colors hover:text-white/80">
                Developers
              </Link>
              <span className="mx-2 opacity-50">/</span>
              <span>{developer.companyName}</span>
            </nav>
          </div>
        </div>

        {/* â”€â”€ Profile Card â”€â”€ */}
        <div className="relative z-20 mx-auto -mt-24 max-w-7xl px-4">
          <div className="overflow-visible rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl">
            <div className="flex flex-col lg:flex-row">

              {/* Left â€” Main Info */}
              <div className="flex-1 p-8 lg:p-12">
                <div className="flex flex-col items-start gap-8 md:flex-row">

                  {/* Logo */}
                  <div className="relative z-50 -mt-32 flex h-auto min-h-[120px] w-52 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl">
                    {developer.logo?.url ? (
                      <Image
                        src={developer.logo.url}
                        alt={`${developer.companyName} logo`}
                        width={180}
                        height={120}
                        className="h-auto max-h-32 w-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-16 w-16 text-gray-100" />
                    )}
                  </div>

                  {/* Name + Details */}
                  <div className="flex-1 pt-2">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        {developer.companyName}
                      </h1>
                      {developer.isVerified && (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase text-blue-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Admin-awarded trust badges — public trust display */}
                    {(developer.badges ?? []).some((b) => PUBLIC_BADGE_LABELS[b]) && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {(developer.badges ?? [])
                          .filter((b) => PUBLIC_BADGE_LABELS[b])
                          .map((b) => (
                            <span
                              key={b}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#029bba]/20 bg-[#029bba]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#004063]"
                            >
                              <Shield className="h-3 w-3" />
                              {PUBLIC_BADGE_LABELS[b]}
                            </span>
                          ))}
                      </div>
                    )}

                    <div className="mb-6 flex flex-wrap gap-5 text-sm font-semibold text-slate-500">
                      {developer.city && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-[#029bba]" />
                          {developer.city}, Pakistan
                        </span>
                      )}
                      {developer.establishedYear && (
                        <span className="flex items-center gap-1.5 border-l border-gray-200 pl-5">
                          <Calendar className="h-4 w-4 text-[#029bba]" />
                          Since {developer.establishedYear}
                        </span>
                      )}
                    </div>

                    <div className="mt-6">
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-900">
                        About Developer
                      </h3>
                      <p className="text-base leading-relaxed text-slate-600">
                        {developer.description ??
                          `Leading real estate developer based in ${developer.city ?? 'Pakistan'}.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-10 grid grid-cols-2 gap-4 border-t border-gray-100 pt-10 md:grid-cols-4">
                  <StatCard
                    label="Total Projects"
                    value={projects.length}
                    color="text-slate-900"
                    bg="bg-slate-50"
                  />
                  <StatCard
                    label="Completed"
                    value={completedProjects.length}
                    color="text-green-600"
                    bg="bg-green-50"
                  />
                  <StatCard
                    label="Ongoing"
                    value={ongoingProjects.length}
                    color="text-[#029bba]"
                    bg="bg-blue-50"
                  />
                  <StatCard
                    label="Experience"
                    value={experienceYears ? `${experienceYears}+ Yrs` : 'Est.'}
                    color="text-purple-600"
                    bg="bg-purple-50"
                  />
                </div>
              </div>

              {/* Right â€” Sidebar */}
              <div className="w-full border-t border-gray-100 bg-slate-50/50 p-8 lg:w-80 lg:border-l lg:border-t-0 lg:p-12">
                <div className="mb-10">
                  <HighriseInsightCard developer={developer} />
                </div>

                <h3 className="mb-8 text-sm font-bold uppercase tracking-widest text-gray-900">
                  Contact Information
                </h3>
                <div className="space-y-8">
                  {/* Contact gating: phone/email are NEVER in the public API
                      payload (verified — toPublicProfile excludes PII).
                      Office address + website remain public by design. */}
                  <ContactItem
                    icon={<MapPin className="h-5 w-5" />}
                    label="Office Address"
                    value={developer.officeAddress}
                  />
                  {developer.website && (
                    <ContactItem
                      icon={<Globe className="h-5 w-5" />}
                      label="Website"
                      value={developer.website}
                      href={developer.website}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€ Reviews Placeholder â”€â”€ */}
        {/* TODO: Wire ReviewsList when Section 7 (Reviews System) is built */}
        <div className="mx-auto mt-20 max-w-5xl px-4">
          <div className="mb-12 flex flex-col items-center text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-600">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              Verified Reviews
            </span>
            <h2 className="mb-4 text-3xl font-black text-slate-900">
              What People Say About {developer.companyName}
            </h2>
            <p className="mx-auto max-w-2xl text-slate-500">
              Verified client reviews are coming soon. Every review will be
              manually verified by our team to ensure authenticity.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-8 text-center">
            <Star className="mx-auto mb-3 h-10 w-10 text-amber-300" />
            <p className="font-semibold text-amber-800">Reviews System Coming Soon</p>
            <p className="mt-1 text-sm text-amber-600">
              We are building Pakistan's first verified review system for
              real estate developers.
            </p>
          </div>
        </div>

        {/* â”€â”€ Portfolio â”€â”€ */}
        <div className="mx-auto mt-20 max-w-7xl px-4">
          <div className="mb-10 flex flex-col items-center justify-between gap-6 border-b border-gray-200 pb-8 md:flex-row">
            <div>
              <h2 className="flex items-center gap-3 text-3xl font-black text-slate-900">
                <Layers className="h-8 w-8 text-[#029bba]" />
                Our Portfolio
              </h2>
              <p className="mt-1 font-medium text-slate-500">
                Discover our latest architectural developments.
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
              {(
                [
                  { value: 'all',       label: 'All'       },
                  { value: 'ongoing',   label: 'Ongoing'   },
                  { value: 'completed', label: 'Completed' },
                ] as Array<{ value: ActiveTab; label: string }>
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`rounded-xl px-8 py-2.5 text-xs font-bold capitalize transition-all ${
                    activeTab === tab.value
                      ? 'bg-[#029bba] text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((p) => {
                const img = getProjectImage(p);
                return (
                  <Link
                    key={p._id}
                    href={`/projects/${p.slug ?? p._id}`}
                    className="group"
                  >
                    <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">

                      {/* Project image */}
                      <div className="relative h-64 overflow-hidden bg-slate-100">
                        {img ? (
                          <Image
                            src={img}
                            alt={p.projectName}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-200">
                            <Building2 className="mb-2 h-12 w-12" />
                            No Image Available
                          </div>
                        )}

                        {/* Category badge */}
                        <div className="absolute left-4 top-4">
                          <span className="rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-bold uppercase text-white backdrop-blur-md">
                            {p.projectCategory}
                          </span>
                        </div>

                        {/* Status badge */}
                        <div className="absolute bottom-4 right-4">
                          <span
                            className={`rounded-xl px-4 py-2 text-[10px] font-bold uppercase shadow-2xl ${
                              p.projectStatus === 'Completed'
                                ? 'bg-green-600 text-white'
                                : 'bg-[#029bba] text-white'
                            }`}
                          >
                            {p.projectStatus ?? 'Ongoing'}
                          </span>
                        </div>
                      </div>

                      {/* Project info */}
                      <div className="flex flex-1 flex-col p-8">
                        <h3 className="mb-2 line-clamp-1 text-xl font-bold text-slate-900 transition-colors group-hover:text-[#029bba]">
                          {p.projectName}
                        </h3>
                        <div className="mb-6 flex items-center text-sm text-slate-500">
                          <MapPin className="mr-2 h-4 w-4 text-[#029bba]" />
                          <span className="truncate">
                            {p.area}, {p.city}
                          </span>
                        </div>

                        <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-6">
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Price Start From
                            </p>
                            <p className="text-xl font-black text-[#029bba]">
                              {getPriceRange(p.minPrice, p.maxPrice)}
                            </p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 shadow-sm transition-all group-hover:bg-[#029bba] group-hover:text-white">
                            <ArrowRight className="h-6 w-6" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[3rem] border-2 border-dashed border-slate-100 bg-white py-24 text-center">
              <Building2 className="mx-auto mb-4 h-16 w-16 text-slate-100" />
              <h3 className="text-xl font-bold text-slate-900">
                Portfolio Under Construction
              </h3>
              <p className="text-slate-500">
                No projects found in this category.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
