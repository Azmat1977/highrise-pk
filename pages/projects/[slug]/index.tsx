// pages/projects/[slug]/index.tsx
// Highrise.pk - Public Project Detail Page (V2.0 Complete Redesign)
// Strict Design System Lock: icons from @/lib/design-system/icons | tokens from @/lib/design-system/tokens
// Enforces Pattern C detail page layouts with natural scroll sidebars and pure ASCII comments

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import UniversalInquiryModal from '@/components/UniversalInquiryModal';
import { icons, nearbyIcons } from '@/lib/design-system/icons';
import { colors, containers, grids } from '@/lib/design-system/tokens';
import { typography } from '@/lib/design-system/typography';
import { card, button, input, safety } from '@/lib/design-system/components';

import ProjectDetailHero         from '@/components/project-detail/ProjectDetailHero';
import QuickActionsBar           from '@/components/project-detail/QuickActionsBar';
import DeveloperTrustCard        from '@/components/project-detail/DeveloperTrustCard';
import ProjectReviewsSection     from '@/components/project-detail/ProjectReviewsSection';
import SimilarProjectsSection    from '@/components/project-detail/SimilarProjectsSection';
import ProjectAbout              from '@/components/project-detail/ProjectAbout';
import ProjectOverview           from '@/components/project-detail/ProjectOverview';
import EnterprisePropertySpecs   from '@/components/project-detail/EnterprisePropertySpecs';
import BuildingHighlights        from '@/components/project-detail/BuildingHighlights';
import NeighborhoodInsights      from '@/components/project-detail/NeighborhoodInsights';
import ConstructionTracker       from '@/components/project-detail/ConstructionTracker';
import ProjectMetaHeader         from '@/components/project-detail/ProjectMetaHeader';
import UniversalContactCard      from '@/components/shared/UniversalContactCard';
import SafeDealSidebarCard       from '@/components/shared/SafeDealSidebarCard';
import SafetyWarningCard         from '@/components/shared/SafetyWarningCard';
import ReportListingModal        from '@/components/property/ReportListingModal';
import type { NearbyPlacesExplorerProps } from '@/components/shared/NearbyPlacesExplorer';

// Leaflet requires browser APIs (window) - dynamic import skips SSR
const NearbyPlacesExplorer = dynamic<NearbyPlacesExplorerProps>(
  () => import('@/components/shared/NearbyPlacesExplorer'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading map...</p>
        </div>
      </div>
    )
  }
);
import { PaymentPlanList }       from '@/components/projects/PaymentPlanCard';
import RiskAlertsSection         from '@/components/project-detail/RiskAlertsSection';
import AvailableUnitsTable       from '@/components/project-detail/AvailableUnitsTable';
import FloorPlansGrid            from '@/components/project-detail/FloorPlansGrid';
import DocumentsLegalVault       from '@/components/project-detail/DocumentsLegalVault';

import type {
  ProjectDetailData,
  ProjectImage,
} from '@/types/projectDetail';
import {
  formatDetailPrice,
  formatCoordinate,
  getProjectAreaDisplay,
  toProjectListing,
  DETAIL_SECTION_TABS,
} from '@/types/projectDetail';
import DOMPurify from 'isomorphic-dompurify';

type ProjectData = ProjectDetailData;

interface PageProps {
  project: ProjectData;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NEARBY_ICONS = nearbyIcons;

// ============================================================================
// HELPERS
// ============================================================================

function sanitizeHtml(input: string): string {
  if (!input) return '';
  if (typeof window === 'undefined') return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

function stripTags(input: string): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getMapEmbedUrl(project: ProjectData): string {
  if (project.coordinates?.lat && project.coordinates?.lng) {
    return `https://maps.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}&z=15&output=embed`;
  }
  if (project.googleMapLink) {
    const m = project.googleMapLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (m) return `https://maps.google.com/maps?q=${m[1]},${m[2]}&z=15&output=embed`;
  }
  const areaDisplay = project.areaName || project.area || '';
  const q = encodeURIComponent(`${project.specificLocation ? project.specificLocation + ', ' : ''}${areaDisplay}, ${project.city}, Pakistan`);
  return `https://maps.google.com/maps?q=${q}&z=14&output=embed`;
}

function getMapsLink(project: ProjectData): string {
  if (project.coordinates?.lat && project.coordinates?.lng) {
    return `https://www.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}`;
  }
  if (project.googleMapLink) return project.googleMapLink;
  const areaDisplay = project.areaName || project.area || '';
  return `https://www.google.com/maps/search/${encodeURIComponent(areaDisplay + ', ' + project.city + ', Pakistan')}`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Section({ id, title, icon, children, headerExtra, className = '' }: {
  id?: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className={typography.sectionTitle}>
          {icon}
          {title}
        </h2>
        {headerExtra}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

type PlanMediaKind = 'pdf' | 'image' | 'tiff' | 'unknown';

function detectPlanMediaKind(url: string): PlanMediaKind {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|webp|gif|avif|bmp)$/.test(clean)) return 'image';
  if (/\.(tiff|tif)$/.test(clean)) return 'tiff';
  return 'unknown';
}

function buildCloudinaryJpg(url: string, isPdf: boolean): string | null {
  if (!url.startsWith('https://res.cloudinary.com')) return null;
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  let path = url.slice(idx + marker.length);
  const vIdx = path.search(/\/v\d+\//);
  if (vIdx > 0) path = path.slice(vIdx + 1);
  const lastSlash = path.lastIndexOf('/');
  const file = path.slice(lastSlash + 1);
  const dot = file.lastIndexOf('.');
  const stem = dot > 0 ? file.slice(0, dot) : file;
  path = `${path.slice(0, lastSlash + 1)}${stem}.jpg`;
  const transform = isPdf ? 'f_jpg,pg_1' : 'f_jpg';
  return `${url.slice(0, idx + marker.length)}${transform}/${path}`;
}

function FloorPlanPdfCover({ plan }: { plan: string }): React.ReactElement {
  return (
    <>
      <div className="w-20 h-24 rounded-xl bg-white border-2 border-dashed border-[#029bba]/30 flex flex-col items-center justify-center shadow-sm mb-4">
        <icons.FileText className="w-8 h-8 text-[#029bba] mb-1" strokeWidth={1.5} />
        <span className="text-[9px] font-black uppercase tracking-widest text-[#029bba]">PDF</span>
      </div>
      <p className="text-sm font-bold text-gray-700 mb-1">{plan} - Floor Plan Document</p>
      <p className="text-xs text-gray-500">
        Tap Fullscreen or Download to view the complete layout.
      </p>
    </>
  );
}

function FloorPlanModal({ plan, imageUrl, pdfUrl, onClose }: {
  plan: string;
  imageUrl?: string;
  pdfUrl?: string;
  onClose: () => void;
}): React.ReactElement {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${plan} floor plan viewer`}
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10">
        <p className="text-white font-bold text-sm sm:text-base truncate">
          {plan} - Floor Plan
        </p>
        <div className="flex items-center gap-1.5">
          {imageUrl && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))}
                aria-label="Zoom out"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <icons.ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-white/60 tabular-nums w-8 text-center">{zoom}x</span>
              <button
                onClick={() => setZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))}
                aria-label="Zoom in"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <icons.ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open PDF in new tab"
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <icons.ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onClose}
            aria-label="Close viewer"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <icons.X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {imageUrl ? (
          <div className="min-h-full flex items-start justify-center p-4">
            <img
              src={imageUrl}
              alt={`${plan} floor plan`}
              style={{ transform: `scale(${zoom})` }}
              className={`transition-transform duration-200 object-contain ${
                zoom > 1 ? 'max-w-none' : 'max-w-full max-h-[75vh]'
              }`}
            />
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full bg-white"
            title={`${plan} floor plan PDF`}
          />
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ProjectDetailPage({ project }: PageProps) {
  const router = useRouter();

  // UI state
  const [activeSection,      setActiveSection]     = useState('overview');
  const [activeOfferingTab,  setActiveOfferingTab] = useState<'all' | 'residential' | 'commercial'>('all');
  const [floorPlanViewer,    setFloorPlanViewer]   = useState<{
    plan: string;
    imageUrl?: string;
    pdfUrl?: string;
  } | null>(null);

  // Inquiry & Report modal state
  const [showInquiry, setShowInquiry] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [inquiryType, setInquiryType] = useState<
    'project_interest' | 'call_back' | 'site_visit' | 'general_inquiry'
  >('project_interest');

  // Derived data
  const areaDisplay = project.areaName || project.area || '';
  const developerName = project.developerProfile?.companyName || project.developerProfile?.name || '';
  const allImages = Array.isArray(project.images) ? project.images : [];
  const projectAsDetail = project as unknown as ProjectDetailData;
  const primaryImage = project.featureImageUrl || allImages.find(i => i.isPrimary)?.url || allImages[0]?.url || '';
  const safeDesc = sanitizeHtml(project.description || '');
  const plainDesc = stripTags(safeDesc);
  const breakdownAvailable = (project.unitTypeBreakdown ?? []).reduce(
    (s, ut) => s + (ut.availableUnits ?? 0), 0
  );
  const breakdownTotal = (project.unitTypeBreakdown ?? []).reduce(
    (s, ut) => s + (ut.totalUnits ?? 0), 0
  );

  // Active payment plans
  const activePaymentPlans = (project.paymentPlans ?? []).filter((p) => {
    if (p.isActive === false) return false;
    const now = Date.now();
    if (p.validFrom && new Date(p.validFrom).getTime() > now) return false;
    if (p.validUntil && new Date(p.validUntil).getTime() < now) return false;
    return true;
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';
  const canonicalUrl = `${siteUrl}/projects/${project.slug}`;

  // Unit type categorization
  const residentialTypes = (project.unitTypeBreakdown ?? []).filter(
    ut => (ut.category === 'residential') || (!ut.category && ['apartment', 'flat', 'studio', 'penthouse', 'duplex'].some(t => (ut.type || ut.name || '').toLowerCase().includes(t)))
  );
  const commercialTypes = (project.unitTypeBreakdown ?? []).filter(
    ut => (ut.category === 'commercial') || (!ut.category && ['shop', 'office', 'food', 'commercial', 'showroom', 'warehouse'].some(t => (ut.type || ut.name || '').toLowerCase().includes(t)))
  );

  // Price + size summaries
  const allPrices = (project.unitTypeBreakdown ?? []).flatMap(ut => {
    const prices: number[] = [];
    if (ut.priceRange?.min && ut.priceRange.min > 0) prices.push(ut.priceRange.min);
    if (ut.priceRange?.max && ut.priceRange.max > 0) prices.push(ut.priceRange.max);
    if (ut.minPrice && ut.minPrice > 0) prices.push(ut.minPrice);
    if (ut.maxPrice && ut.maxPrice > 0) prices.push(ut.maxPrice);
    return prices;
  });
  const overallMinPrice = allPrices.length > 0 ? Math.min(...allPrices) : project.minPrice;
  const overallMaxPrice = allPrices.length > 0 ? Math.max(...allPrices) : project.maxPrice;

  const allAreas = (project.unitTypeBreakdown ?? []).flatMap(ut => {
    const areas: number[] = [];
    const aMin = ut.areaRange?.min ?? ut.minArea;
    const aMax = ut.areaRange?.max ?? ut.maxArea;
    if (aMin && aMin > 0) areas.push(aMin);
    if (aMax && aMax > 0) areas.push(aMax);
    return areas;
  });
  const minAreaSqft = allAreas.length > 0 ? Math.min(...allAreas) : 0;
  const maxAreaSqft = allAreas.length > 0 ? Math.max(...allAreas) : 0;

  // Scroll spy
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ticking = false;
    const update = () => {
      let current: string | null = null;
      DETAIL_SECTION_TABS.forEach(s => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 180) current = s.id;
      });
      setActiveSection(current ?? DETAIL_SECTION_TABS[0]?.id ?? 'overview');
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function downloadFile(url: string, filename: string) {
    if (typeof window === 'undefined' || !url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('download_failed');
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  if (router.isFallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#029bba] mx-auto" />
          <p className="mt-4 text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // JSON-LD SCHEMA SUITE
  // ============================================================================

  const realEstateListingLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${canonicalUrl}#listing`,
    name: project.projectName,
    description: project.shortDescription || plainDesc.slice(0, 250),
    url: canonicalUrl,
    image: primaryImage ? [primaryImage] : undefined,
    datePosted: project.createdAt || new Date().toISOString(),
    dateModified: project.updatedAt || project.createdAt || new Date().toISOString(),
    address: {
      '@type': 'PostalAddress',
      addressLocality: areaDisplay,
      addressRegion: project.city,
      addressCountry: 'PK',
    },
    geo: project.coordinates?.lat && project.coordinates?.lng ? {
      '@type': 'GeoCoordinates',
      latitude: project.coordinates.lat,
      longitude: project.coordinates.lng,
    } : undefined,
    offers: overallMinPrice ? {
      '@type': overallMaxPrice && overallMaxPrice > overallMinPrice ? 'AggregateOffer' : 'Offer',
      priceCurrency: 'PKR',
      ...(overallMaxPrice && overallMaxPrice > overallMinPrice
        ? { lowPrice: overallMinPrice, highPrice: overallMaxPrice }
        : { price: overallMinPrice }),
      availability: breakdownAvailable > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      ...(breakdownTotal > 0 ? { offerCount: breakdownTotal } : {}),
    } : undefined,
    ...(project.averageRating && project.totalReviews ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: project.averageRating,
        reviewCount: project.totalReviews,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    seller: {
      '@type': 'Organization',
      '@id': `${siteUrl}/developers/${project.developer || project.developerId || ''}#org`,
      name: developerName || 'Developer',
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Projects',
        item: `${siteUrl}/projects`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: project.city,
        item: `${siteUrl}/projects?city=${encodeURIComponent(project.city)}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: project.projectName,
        item: canonicalUrl,
      },
    ],
  };

  const orgId = project.developer || project.developerId || '';
  const organizationLd = developerName ? {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/developers/${orgId}#org`,
    name: developerName,
    url: `${siteUrl}/developers/${orgId}`,
    ...(project.developerProfile?.logoUrl ? { logo: project.developerProfile.logoUrl } : {}),
    ...(project.developerProfile?.description ? { description: project.developerProfile.description } : {}),
    ...(project.developerProfile?.website ? { sameAs: [project.developerProfile.website] } : {}),
    ...(project.developerProfile?.establishedYear ? { foundingDate: String(project.developerProfile.establishedYear) } : {}),
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'PK',
    },
  } : null;

  const seoTitle = `${project.projectName} | ${project.city} | Highrise.pk`;
  const seoDescription = project.shortDescription
    ? project.shortDescription.slice(0, 155)
    : `${project.projectName} in ${areaDisplay}, ${project.city}.${
        overallMinPrice ? ` Prices from PKR ${formatDetailPrice(overallMinPrice)}.` : ''
      } Verified project details, floor plans, and payment plans on Highrise.pk.`.slice(0, 155);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content="Highrise.pk" />
        <meta property="og:title"       content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url"         content={canonicalUrl} />
        <meta property="og:locale"      content="en_PK" />
        {primaryImage && (
          <>
            <meta property="og:image"        content={primaryImage} />
            <meta property="og:image:width"  content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt"    content={`${project.projectName} in ${project.city}`} />
          </>
        )}

        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@highrisepk" />
        <meta name="twitter:title"       content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {primaryImage && <meta name="twitter:image" content={primaryImage} />}
        {primaryImage && (
          <meta name="twitter:image:alt" content={`${project.projectName} in ${project.city}`} />
        )}

        <meta name="robots" content={project.isVerified ? 'index, follow' : 'noindex, follow'} />

        {project.coordinates?.lat && project.coordinates?.lng && (
          <>
            <meta name="geo.position" content={`${project.coordinates.lat};${project.coordinates.lng}`} />
            <meta name="geo.placename" content={`${areaDisplay}, ${project.city}`} />
            <meta name="geo.region" content="PK" />
          </>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(realEstateListingLd).replace(/</g, '\\u003c') }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }}
        />

        {organizationLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd).replace(/</g, '\\u003c') }}
          />
        )}
      </Head>

      <ProjectDetailHero
        project={project}
        canonicalUrl={canonicalUrl}
      />

      <QuickActionsBar
        project={projectAsDetail}
        overallMinPrice={overallMinPrice}
        scrollThreshold={380}
      />

      <div className={containers.detail}>
        <div className={grids.detailTwoCol}>

          {/* Left Column */}
          <div className="space-y-6 min-w-0">
            <ProjectMetaHeader
              project={project}
              minPrice={overallMinPrice}
              maxPrice={overallMaxPrice}
              minAreaSqft={minAreaSqft}
              maxAreaSqft={maxAreaSqft}
            />

            <ProjectOverview project={project} />

            <ProjectAbout project={project} />

            <EnterprisePropertySpecs project={projectAsDetail} />

            {(() => {
              const detailed = Array.isArray(project.amenitiesDetailed)
                ? project.amenitiesDetailed
                : [];

              const toStrArr = (v: unknown): string[] =>
                Array.isArray(v)
                  ? (v as unknown[]).filter(
                      (x): x is string => typeof x === 'string' && x.trim().length > 0
                    )
                  : [];

              const legacy = [
                ...toStrArr((project as any).features),
                ...toStrArr((project as any).buildingAmenities),
                ...toStrArr((project as any).communityAmenities),
                ...toStrArr((project as any).securityFeatures),
                ...toStrArr((project as any).sustainabilityFeatures),
              ];

              const legacyUnique = Array.from(new Set(legacy));
              const merged = detailed.length > 0
                ? detailed
                : legacyUnique.map((name) => ({ name, category: 'General' }));

              return <BuildingHighlights amenities={merged} />;
            })()}

            {project.verificationPanel?.verifiedAt && (
              <section id="verification" className="bg-white rounded-2xl border border-[#029bba]/20 shadow-sm p-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#029bba]" />
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
                    <icons.Shield className="w-5 h-5 text-[#029bba]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                      Verified Legal and Regulatory Status
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">
                        NOC Verified
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      This project was audited by our compliance intelligence team on{' '}
                      <strong className="text-gray-700">{new Date(project.verificationPanel.verifiedAt).toLocaleDateString()}</strong>.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-y border-gray-100 my-2 text-xs">
                      <div>
                        <p className="text-gray-400 font-bold uppercase text-[9px]">Authority Source</p>
                        <p className="font-bold text-gray-800 mt-0.5">{project.verificationPanel.source || 'Verified Authority Record'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase text-[9px]">Verified By</p>
                        <p className="font-bold text-[#029bba] mt-0.5">{project.verificationPanel.verifiedBy || 'Highrise Compliance Team'}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-700 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 leading-relaxed">
                      Disclaimer: {project.verificationPanel.legalDisclaimer || 'Verification is based on public notices from statutory bodies and developer-provided submittals. Investors are strongly advised to perform independent physical site and title checkups.'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <RiskAlertsSection project={project} />
          </div>

          {/* Right Sidebar Stack */}
          <div className="relative min-w-0 w-full max-w-[340px] justify-self-end">
            <div className="space-y-6 w-full">
              <UniversalContactCard
                entityType="project"
                entityId={project._id}
                entityTitle={project.projectName}
                actorName={developerName || "Verified Developer"}
                actorRole="Project Developer"
                actorImage={project.developerProfile?.logoUrl || null}
                brandLogo="/images/logo.png"
                isVerified={Boolean(project.isVerified || project.verificationPanel?.verifiedAt)}
                initialPhone={
                  (project as any)?.contactDetails?.primaryPhone
                  || (project as any)?.developerProfile?.contactNumber
                  || undefined
                }
                initialWhatsapp={
                  (project as any)?.contactDetails?.whatsappNumber
                  || (project as any)?.developerProfile?.whatsappNumber
                  || undefined
                }
                developerId={project.developer}
              />

              <SafeDealSidebarCard />

              <SafetyWarningCard onReport={() => setShowReportModal(true)} />
            </div>
          </div>

        </div>

        {/* Full-Width Subsections */}
        <div className="mt-8 lg:mt-16 space-y-10 lg:space-y-16">
          <DeveloperTrustCard
            developerProfile={project.developerProfile}
            developerObjectId={project.developer || project.developerId || ''}
            developerName={developerName}
            completedProjects={project.completedProjects}
            relatedProjects={project.relatedProjects}
          />

          <AvailableUnitsTable project={project} />

          <ConstructionTracker project={project} />

          {/* Location Block */}
          <Section
            id="location"
            title="Location & Neighborhood"
            icon={<icons.MapPin className="w-5 h-5 text-[#029bba]" />}
            headerExtra={
              <a href={getMapsLink(project)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-[#029bba] hover:underline bg-[#029bba]/10 px-3 py-1.5 rounded-full">
                <icons.ExternalLink className="w-3.5 h-3.5" /> Google Maps
              </a>
            }
          >
            <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <icons.MapPin className="w-5 h-5 text-[#029bba] mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-gray-900">
                  {project.specificLocation ? `${project.specificLocation}, ` : ''}{areaDisplay}, {project.city}
                </p>
                {project.coordinates?.lat && project.coordinates?.lng && (
                  <p className="text-sm text-gray-500 mt-0.5 font-mono">
                    {formatCoordinate(project.coordinates.lat)}, {formatCoordinate(project.coordinates.lng)}
                  </p>
                )}
              </div>
            </div>

            <div className="-mx-6 mb-8 border-y border-gray-200 bg-gray-50">
              {project.coordinates?.lat && project.coordinates?.lng ? (
                <NearbyPlacesExplorer
                  projectLat={project.coordinates.lat}
                  projectLng={project.coordinates.lng}
                  projectName={project.projectName}
                  initialRadius={3000}
                  verifiedPlaces={(project.nearbyFacilities ?? []).map((p) => ({
                    name: p.name,
                    category: String(p.category),
                    distance: p.distance,
                  }))}
                />
              ) : (
                <div className="aspect-video">
                  <iframe
                    src={getMapEmbedUrl(project)}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Project Location"
                  />
                </div>
              )}
            </div>

            <NeighborhoodInsights places={project.nearbyFacilities ?? []} />

            {(project.locationAdvantages?.length ?? 0) > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-black text-gray-900 uppercase tracking-wider text-sm mb-4">Location Highlights</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {project.locationAdvantages!.map((adv, i) => (
                    <div key={i}>
                      <h5 className="font-bold text-[#004063] mb-1.5 text-sm">{adv.title}</h5>
                      <ul className="space-y-1.5">
                        {adv.points.map((pt, j) => (
                          <li key={j} className="flex items-start gap-2 text-[13px] text-gray-600 font-medium">
                            <icons.CheckCircle className="w-4 h-4 text-[#10b981] mt-0.5 shrink-0" />
                            <span className="leading-snug">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <FloorPlansGrid 
            project={project} 
            onInquire={() => {
              setInquiryType('general_inquiry');
              setShowInquiry(true);
            }} 
          />

          {/* Payment Block */}
          {((project.paymentPlanImages?.length ?? 0) > 0 || (project.floorWisePriceImages?.length ?? 0) > 0) && (
            <section id="payment" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <icons.CreditCard className="w-5 h-5 text-[#029bba]" />
                  Payment Plans
                </h2>
                {project.projectDocuments?.paymentPlanUrl && (
                  <a
                    href={project.projectDocuments.paymentPlanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#029bba] hover:underline"
                  >
                    <icons.Download className="w-3.5 h-3.5" />
                    Download PDF
                  </a>
                )}
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  ...(project.paymentPlanImages ?? []),
                  ...(project.floorWisePriceImages ?? []),
                ].map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFloorPlanViewer({
                      plan: img.caption || 'Payment Plan',
                      imageUrl: img.url,
                    })}
                    className="group rounded-2xl border border-gray-200 overflow-hidden text-left hover:border-[#029bba]/30 hover:shadow-lg transition-all bg-white"
                  >
                    <div className="relative bg-[#f8fafc] h-64 sm:h-72 flex items-center justify-center p-4">
                      <img
                        src={img.url}
                        alt={img.caption || 'Payment plan'}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-bold">
                          <icons.Maximize2 className="w-3.5 h-3.5" />
                          Click to expand
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate text-center">
                        {img.caption || `Payment Plan ${i + 1}`}
                      </p>
                      <icons.Maximize2 className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(project.paymentPlanImages?.length ?? 0) === 0 && activePaymentPlans.length > 0 && (
            <section id="payment" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <icons.CreditCard className="w-5 h-5 text-[#029bba]" />
                  Payment Plans
                </h2>
                {activePaymentPlans.length > 1 && (
                  <span className="text-sm text-gray-500">
                    {activePaymentPlans.length} plans available
                  </span>
                )}
              </div>
              <div className="p-6">
                <PaymentPlanList plans={activePaymentPlans} />
              </div>
            </section>
          )}

          {activePaymentPlans.length === 0 && (project.paymentPlanImages?.length ?? 0) === 0 && project.installmentPlan && project.saleMode === 'Installment' && (
            <Section id="payment" title="Payment Plan" icon={<icons.CreditCard className="w-5 h-5 text-[#029bba]" />}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {project.installmentPlan.bookingAmount && (
                  <div className="bg-[#029bba] text-white rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase opacity-80 font-bold mb-1">Booking</p>
                    <p className="text-xl font-bold">{formatDetailPrice(project.installmentPlan.bookingAmount)}</p>
                    {project.installmentPlan.bookingPercent && (
                      <p className="text-xs opacity-80 mt-1">{project.installmentPlan.bookingPercent}%</p>
                    )}
                  </div>
                )}
                {project.installmentPlan.downPayment && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Down Payment</p>
                    <p className="text-xl font-bold text-gray-900">{formatDetailPrice(project.installmentPlan.downPayment)}</p>
                    {project.installmentPlan.downPaymentPercent && (
                      <p className="text-xs text-gray-500 mt-1">{project.installmentPlan.downPaymentPercent}%</p>
                    )}
                  </div>
                )}
                {project.installmentPlan.monthlyAmount && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Monthly</p>
                    <p className="text-xl font-bold text-gray-900">{formatDetailPrice(project.installmentPlan.monthlyAmount)}</p>
                    {project.installmentPlan.monthlyDuration && (
                      <p className="text-xs text-gray-500 mt-1">x {project.installmentPlan.monthlyDuration} months</p>
                    )}
                  </div>
                )}
                {project.installmentPlan.quarterlyAmount && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Quarterly</p>
                    <p className="text-xl font-bold text-gray-900">{formatDetailPrice(project.installmentPlan.quarterlyAmount)}</p>
                    {project.installmentPlan.quarterlyDuration && (
                      <p className="text-xs text-gray-500 mt-1">x {project.installmentPlan.quarterlyDuration} qtrs</p>
                    )}
                  </div>
                )}
                {project.installmentPlan.possessionAmount && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase text-green-600 font-bold mb-1">On Possession</p>
                    <p className="text-xl font-bold text-green-700">{formatDetailPrice(project.installmentPlan.possessionAmount)}</p>
                    {project.installmentPlan.possessionPercent && (
                      <p className="text-xs text-green-600 mt-1">{project.installmentPlan.possessionPercent}%</p>
                    )}
                  </div>
                )}
              </div>
              {project.installmentPlan.totalPrice && (
                <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Total Price</span>
                  <span className="text-2xl font-bold text-[#029bba]">
                    PKR {formatDetailPrice(project.installmentPlan.totalPrice)}
                  </span>
                </div>
              )}
              {project.projectDocuments?.paymentPlanUrl && (
                <div className="mt-4 text-center">
                  <button onClick={() => downloadFile(project.projectDocuments!.paymentPlanUrl!, `${project.slug}-payment-plan.pdf`)}
                    className="inline-flex items-center gap-2 text-[#029bba] hover:underline font-medium text-sm">
                    <icons.Download className="w-4 h-4" />Download Complete Payment Plan
                  </button>
                </div>
              )}
            </Section>
          )}

          <DocumentsLegalVault 
            project={project} 
            onInquire={() => {
              setInquiryType('general_inquiry');
              setShowInquiry(true);
            }}
          />

          <ProjectReviewsSection project={projectAsDetail} />
        </div>
      </div>

      <SimilarProjectsSection
        currentProjectId={project._id}
        currentCity={project.city}
        currentCategory={project.projectCategory}
        currentMinPrice={overallMinPrice}
        currentMaxPrice={overallMaxPrice}
        currentDeveloperId={project.developer || project.developerId}
      />

      <div className={safety.disclaimer}>
        <div className={safety.disclaimerInner}>
          <icons.Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className={safety.disclaimerText}>
            <strong className="text-amber-800">Disclaimer:</strong>{' '}
            Highrise.pk verifies project details to the best of our ability. We strongly recommend
            visiting the project site, verifying documents independently, and consulting legal counsel
            before any financial commitment.
          </p>
        </div>
      </div>

      <UniversalInquiryModal
        isOpen={showInquiry}
        onClose={() => setShowInquiry(false)}
        entityType="project"
        entityId={project._id}
        entityCode={project.projectId}
        entityTitle={project.projectName}
        entityPrice={overallMinPrice}
        entityLocation={`${areaDisplay}, ${project.city}`}
        entityImage={primaryImage}
        developerId={project.developer}
        developerName={developerName || undefined}
        leadType={inquiryType}
        buttonText={
          inquiryType === 'site_visit' ? 'Schedule Visit'
          : inquiryType === 'call_back' ? 'Request Callback'
          : 'Send Inquiry'
        }
      />

      {floorPlanViewer && (
        <FloorPlanModal
          plan={floorPlanViewer.plan}
          imageUrl={floorPlanViewer.imageUrl}
          pdfUrl={floorPlanViewer.pdfUrl}
          onClose={() => setFloorPlanViewer(null)}
        />
      )}

      <ReportListingModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        propertyId={project._id}
        reporterUserId=""
        reporterEmail=""
        reporterPhone=""
      />
    </div>
  );
}

// ============================================================================
// ISR DATA FETCHING
// ============================================================================

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    await dbConnect();
    const projects = await Project.find({
      isVerified: true,
      isDeleted: { $ne: true },
    })
      .select('slug')
      .limit(100)
      .maxTimeMS(5000)
      .lean();

    const paths = (projects as Array<{ slug?: string }>)
      .filter(p => p.slug)
      .map(p => ({ params: { slug: p.slug as string } }));

    return { paths, fallback: 'blocking' };
  } catch {
    return { paths: [], fallback: 'blocking' };
  }
};

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const slug = params?.slug as string;
  if (!slug) return { notFound: true };

  try {
    await dbConnect();

    const isObjectId = /^[a-f\d]{24}$/i.test(slug);
    const query = isObjectId
      ? { $or: [{ slug }, { _id: slug }], isDeleted: { $ne: true } }
      : { slug, isDeleted: { $ne: true } };

    const rawDoc = await Project.findOne(query)
      .maxTimeMS(5000)
      .lean() as Record<string, unknown> | null;

    if (!rawDoc) return { notFound: true };

    if (!rawDoc.isVerified && rawDoc.status !== 'verified') {
      return { notFound: true };
    }

    const project = JSON.parse(JSON.stringify(rawDoc)) as ProjectData;

    return {
      props: { project },
      revalidate: 30,
    };
  } catch {
    return { notFound: true };
  }
};