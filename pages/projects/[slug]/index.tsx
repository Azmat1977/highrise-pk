// pages/projects/[slug]/index.tsx
// Highrise.pk â€” Public Project Detail Page (V2.0 Complete Redesign)
// Design: Clean white, enterprise gallery + sidebar lead card, PKR-first context

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import UniversalInquiryModal from '@/components/UniversalInquiryModal';
import {
  Building2, MapPin, CheckCircle, Shield, BarChart3,
  Phone, MessageCircle, Download, ChevronRight, Home,
  Layers, CreditCard, ExternalLink, Clock, Award,
  X, ChevronLeft, ChevronDown, ChevronUp,
  Calendar, Star, Briefcase, Car,
  Heart, Coffee, Lock, Droplets, TreePine,
  School, Hospital, ShoppingBag, UtensilsCrossed,
  FileText,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
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
  import SafeDealSidebarCard      from '@/components/shared/SafeDealSidebarCard';
  import SafetyWarningCard         from '@/components/shared/SafetyWarningCard';
  import ReportListingModal        from '@/components/property/ReportListingModal';
  import type { NearbyPlacesExplorerProps } from '@/components/shared/NearbyPlacesExplorer';

// Leaflet requires browser APIs (window) — dynamic import skips SSR
const NearbyPlacesExplorer = dynamic<NearbyPlacesExplorerProps>(
  () => import('@/components/shared/NearbyPlacesExplorer'),
  { ssr: false, loading: () => (
    <div className="h-[420px] rounded-2xl border border-gray-200 bg-gray-50
                    flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent
                        rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400 mt-2">Loading map...</p>
      </div>
    </div>
  ) }
);
import { PaymentPlanList }       from '@/components/projects/PaymentPlanCard';
import RiskAlertsSection         from '@/components/project-detail/RiskAlertsSection';
import AvailableUnitsTable       from '@/components/project-detail/AvailableUnitsTable';
import FloorPlansGrid            from '@/components/project-detail/FloorPlansGrid';
import DocumentsLegalVault       from '@/components/project-detail/DocumentsLegalVault';
// Trust calculator imports removed — Trust Index, Passport, and AI Risk sections removed per client request
import type {
  ProjectDetailData,
  InquiryType,
  UnitTypeOffering,
  FloorPlan,
  InstallmentPlan,
  AmenityItem,
  NearbyPlace,
  ProjectImage,
} from '@/types/projectDetail';
import {
  formatDetailPrice,
  formatDetailDate,
  formatCoordinate,
  getProjectAreaDisplay,
  getDeveloperDisplayName,
  getPrimaryImageUrl,
  DETAIL_SECTION_TABS,
} from '@/types/projectDetail';
import DOMPurify from 'isomorphic-dompurify';

// ============================================
// TYPES
// All shared types imported from @/types/projectDetail (Wave 4 cleanup)
// ============================================

// Local alias — kept only to minimize downstream renames
type ProjectData = ProjectDetailData;

interface PageProps {
  project: ProjectData;
}

// ============================================
// CONSTANTS
// ============================================

const NEARBY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hospital:   Hospital,
  school:     School,
  restaurant: UtensilsCrossed,
  park:       TreePine,
  mall:       ShoppingBag,
  mosque:     Star,
  bank:       Briefcase,
  transport:  Car,
  other:      MapPin,
};

// ============================================
// HELPERS
// ============================================

// formatDetailPrice is imported from '@/types/projectDetail'

function sanitizeHtml(input: string): string {
  if (!input) return '';
  if (typeof window === 'undefined') return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol',
                   'li', 'h3', 'h4', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

function stripTags(input: string): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function convertArea(value: number, fromUnit: string) {
  const toSqFt: Record<string, number> = {
    sqft: 1, 'sq.ft': 1, 'sq ft': 1,
    sqm: 10.764, 'sq.m': 10.764,
    marla: 272.25, kanal: 5445,
  };
  const factor = toSqFt[(fromUnit || '').trim().toLowerCase()] ?? 1;
  const sqft = value * factor;
  return {
    sqft: Math.round(sqft),
    marla: +(sqft / 272.25).toFixed(2),
  };
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

function maskPhone(phone?: string): string {
  if (!phone) return '****-*******';
  const c = phone.replace(/\D/g, '');
  if (c.length >= 10) return `${c.slice(0, 4)}-***-**${c.slice(-2)}`;
  return '****-*******';
}

// ============================================
// SUB-COMPONENTS
// ============================================

// Section wrapper
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
          <h2 className="text-lg font-semibold text-[#004063] flex items-center gap-2">
            {icon}{title}
          </h2>
          {headerExtra}
        </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// ── Floor plan media: universal format support ──
// Builders upload PDF / TIFF / JPG / PNG / … — every format gets a
// renderable card via Cloudinary on-the-fly conversion (image resources):
//   PDF → page-1 JPG (f_jpg,pg_1) · TIFF/SVG/exotic → JPG (f_jpg)
// Raw Cloudinary resources cannot transform → cover + fullscreen/download.
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
  if (idx === -1) return null; // raw resource — cannot transform
  let path = url.slice(idx + marker.length);
  // Drop existing transformations (keep from version segment onward)
  const vIdx = path.search(/\/v\d+\//);
  if (vIdx > 0) path = path.slice(vIdx + 1);
  // Swap extension to .jpg (Cloudinary converts on delivery)
  const lastSlash = path.lastIndexOf('/');
  const file = path.slice(lastSlash + 1);
  const dot = file.lastIndexOf('.');
  const stem = dot > 0 ? file.slice(0, dot) : file;
  path = `${path.slice(0, lastSlash + 1)}${stem}.jpg`;
  const transform = isPdf ? 'f_jpg,pg_1' : 'f_jpg';
  return `${url.slice(0, idx + marker.length)}${transform}/${path}`;
}

function getPlanPreviewUrl(url: string, kind: PlanMediaKind): string | null {
  if (kind === 'image' && !/\.svg$/i.test(url.split('?')[0])) return url;
  return buildCloudinaryJpg(url, kind === 'pdf');
}

// ── PDF cover content (shared: object fallback + mobile) ──
function FloorPlanPdfCover({ plan }: { plan: string }): React.ReactElement {
  return (
    <>
      <div className="w-20 h-24 rounded-xl bg-white border-2 border-dashed border-[#029bba]/30
                      flex flex-col items-center justify-center shadow-sm mb-4">
        <FileText className="w-8 h-8 text-[#029bba] mb-1" strokeWidth={1.5} />
        <span className="text-[9px] font-black uppercase tracking-widest text-[#029bba]">PDF</span>
      </div>
      <p className="text-sm font-bold text-gray-700 mb-1">{plan} — Floor Plan Document</p>
      <p className="text-xs text-gray-500">
        Tap Fullscreen or Download to view the complete layout.
      </p>
    </>
  );
}

// ── FloorPlanModal — fullscreen viewer (image zoom OR native PDF) ──
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
      {/* Header: plan name + zoom controls + close */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10">
        <p className="text-white font-bold text-sm sm:text-base truncate">
          {plan} — Floor Plan
        </p>
        <div className="flex items-center gap-1.5">
          {imageUrl && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))}
                aria-label="Zoom out"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-white/60 tabular-nums w-8 text-center">{zoom}x</span>
              <button
                onClick={() => setZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))}
                aria-label="Zoom in"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
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
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onClose}
            aria-label="Close viewer"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content: zoomable image (raw <img> for pan/scroll) OR native PDF */}
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

// GalleryModal removed — ProjectGallery component handles lightbox (Wave 4 cleanup)

// ShareMenu removed — Sprint 1 ShareMenu (components/projects/ShareMenu.tsx) handles it via ProjectDetailHero (Wave 4 cleanup)

// Banner removed — was only used by dead bookmark/share handlers (Wave 4 cleanup)

// SimilarProjectsSection extracted to components/project-detail/SimilarProjectsSection.tsx (Wave 4)
// FAQSection extracted to components/project-detail/FAQSection.tsx (Wave 4)
// HomeLoanCalculator extracted to components/project-detail/HomeLoanCalculator.tsx (Wave 4)
// SimilarProjectsSection extracted to components/project-detail/SimilarProjectsSection.tsx (Wave 4)

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ProjectDetailPage({ project }: PageProps) {
  const router = useRouter();

  // Units table + client refetch removed — Choose Your Space owns inventory

  // UI state
  const [activeSection,     setActiveSection]     = useState('overview');
  const [showFullDesc,      setShowFullDesc]      = useState(false);
  const [activeOfferingTab, setActiveOfferingTab] = useState<'all' | 'residential' | 'commercial'>('all');
  const [activeOfferingIdx, setActiveOfferingIdx] = useState(0);
  const [activeFloorPlanIdx, setActiveFloorPlanIdx] = useState(0);
  const [activeNearbyTab, setActiveNearbyTab] = useState<string>('all');
  const [nearbyUnit, setNearbyUnit] = useState<'m' | 'km'>('km');
  const [floorPlanViewer, setFloorPlanViewer] = useState<{
    plan: string;
    imageUrl?: string;
    pdfUrl?: string;
  } | null>(null);

  // VideoModal removed — ProjectMediaExplorer owns media viewing

    // Inquiry & Report modal state
    const [showInquiry, setShowInquiry] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
  const [inquiryType, setInquiryType] = useState<
    'project_interest' | 'call_back' | 'site_visit' | 'general_inquiry'
  >('project_interest');

  // ── Derived data ──
  const areaDisplay = project.areaName || project.area || '';
  const developerName = project.developerProfile?.companyName || project.developerProfile?.name || '';
  const allImages = Array.isArray(project.images) ? project.images : [];
    // ── Cast for component props ──
  const projectAsDetail = project as unknown as ProjectDetailData;
  const primaryImage = project.featureImageUrl || allImages.find(i => i.isPrimary)?.url || allImages[0]?.url || '';
  const totalPhotos = allImages.length;
  const safeDesc = sanitizeHtml(project.description || '');
  const plainDesc = stripTags(safeDesc);
  const shouldTruncate = plainDesc.length > 800;
  // Availability from unit type breakdown (units table removed)
  const breakdownAvailable = (project.unitTypeBreakdown ?? []).reduce(
    (s, ut) => s + (ut.availableUnits ?? 0), 0
  );
  const breakdownTotal = (project.unitTypeBreakdown ?? []).reduce(
    (s, ut) => s + (ut.totalUnits ?? 0), 0
  );

  // Active payment plans (model paymentPlans[] — validity filtered)
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
  const filteredOfferings = activeOfferingTab === 'residential'
    ? residentialTypes
    : activeOfferingTab === 'commercial'
    ? commercialTypes
    : project.unitTypeBreakdown ?? [];

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

  // ── Effects ──

  // Bookmark logic removed — useFavorites (Sprint 2) handles this in ProjectDetailHero (Wave 4 cleanup)

  // Scroll spy — scroll-position based. IO threshold approach never
  // activated sections taller than ~2x viewport (tab stuck on Overview).
  // This is deterministic for any section height: active = last section
  // whose top has passed the nav line.
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

  // Handlers ──
  // Bookmark + share handlers removed (Wave 4 cleanup):
  //   → useFavorites hook (Sprint 2) handles save/unsave in ProjectDetailHero
  //   → Sprint 1 ShareMenu handles all sharing in ProjectDetailHero + QuickActionsBar

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

  // Fallback (ISR)
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

  // ═══════════════════════════════════════════════════════════
  // JSON-LD Schema Suite (Wave 4 Task 4)
  // ═══════════════════════════════════════════════════════════

  // ── 1. RealEstateListing — enhanced ──
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

  // ── 2. BreadcrumbList ──
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

  // ── 3. Organization (Developer) ──
  const developerId = project.developer || project.developerId || '';
  const organizationLd = developerName ? {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/developers/${developerId}#org`,
    name: developerName,
    url: `${siteUrl}/developers/${developerId}`,
    ...(project.developerProfile?.logoUrl ? { logo: project.developerProfile.logoUrl } : {}),
    ...(project.developerProfile?.description ? { description: project.developerProfile.description } : {}),
    ...(project.developerProfile?.website ? { sameAs: [project.developerProfile.website] } : {}),
    ...(project.developerProfile?.establishedYear ? { foundingDate: String(project.developerProfile.establishedYear) } : {}),
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'PK',
    },
  } : null;

  // ── SEO Meta helpers ──
  // Rule Set C: title 50-60 chars, description 140-160 chars
  const seoTitle = `${project.projectName} | ${project.city} | Highrise.pk`;
  const seoDescription = project.shortDescription
    ? project.shortDescription.slice(0, 155)
    : `${project.projectName} in ${areaDisplay}, ${project.city}.${
        overallMinPrice ? ` Prices from PKR ${formatDetailPrice(overallMinPrice)}.` : ''
      } Verified project details, floor plans, and payment plans on Highrise.pk.`.slice(0, 155);

  // ═══ RENDER ═══
  // ══════════════

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
        <Head>
          {/* Primary SEO tags */}
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph — Facebook, WhatsApp, LinkedIn */}
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

        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@highrisepk" />
        <meta name="twitter:title"       content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {primaryImage && <meta name="twitter:image" content={primaryImage} />}
        {primaryImage && (
          <meta name="twitter:image:alt" content={`${project.projectName} in ${project.city}`} />
        )}

        {/* Robots — index verified projects only */}
        <meta name="robots" content={project.isVerified ? 'index, follow' : 'noindex, follow'} />

        {/* Geo tags for local SEO */}
        {project.coordinates?.lat && project.coordinates?.lng && (
          <>
            <meta name="geo.position" content={`${project.coordinates.lat};${project.coordinates.lng}`} />
            <meta name="geo.placename" content={`${areaDisplay}, ${project.city}`} />
            <meta name="geo.region" content="PK" />
          </>
        )}

        {/* ═══ JSON-LD Structured Data Suite ═══ */}

        {/* 1. RealEstateListing */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(realEstateListingLd).replace(/</g, '\\u003c') }}
        />

        {/* 2. BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }}
        />

        {/* 3. Organization (Developer) */}
        {organizationLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd).replace(/</g, '\\u003c') }}
          />
        )}
      </Head>

      {/* Banner removed — Sprint 1 & Sprint 2 provide their own toast feedback (Wave 4 cleanup) */}

      {/* ══════════════════════════════════════
          HERO — ProjectDetailHero component
          Includes: breadcrumb, gallery, title,
          actions, price stats, trust badges
      ══════════════════════════════════════ */}
      <ProjectDetailHero
        project={project}
        canonicalUrl={canonicalUrl}
      />

      {/* ══════════════════════════════════════
          QUICK ACTIONS BAR — sticky bottom
      ══════════════════════════════════════ */}
      <QuickActionsBar
        project={projectAsDetail}
        overallMinPrice={overallMinPrice}
        scrollThreshold={380}
      />

        {/*
═════════════════════════════════════════════════════════════════════════════════════════════════
            MAIN CONTENT — TWO COLUMN LAYOUT (Grid)
═════════════════════════════════════════════════════════════════════════════════════════════════ */}
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 pb-6 lg:pb-8">
          {/* minmax(0,1fr) prevents grid blowout so CTA right-edge = hero right-edge */}
          {/* gap-6 + space-y-6 match property detail Pattern C rhythm */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">

            {/* --- LEFT COLUMN (Content) --- */}
            <div className="space-y-6 min-w-0">

            {/* PROJECT AT A GLANCE HEADER */}
            <ProjectMetaHeader
              project={project}
              minPrice={overallMinPrice}
              maxPrice={overallMaxPrice}
              minAreaSqft={minAreaSqft}
              maxAreaSqft={maxAreaSqft}
            />

            {/* OVERVIEW / HOME HIGHLIGHTS */}
            <ProjectOverview project={project} />

            {/* ABOUT / DESCRIPTION */}
            <ProjectAbout project={project} />

            {/* INFRASTRUCTURE & HARD SPECS */}
            <EnterprisePropertySpecs project={projectAsDetail} />

            {/* LIFESTYLE AMENITIES */}
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

              const merged =
                detailed.length > 0
                  ? detailed
                  : legacyUnique.map((name) => ({ name, category: 'General' }));

              return (
                <BuildingHighlights amenities={merged} />
              );
            })()}

            {/* ══════════════════════════════════════
                VERIFICATION PANEL (Fact-Based Regulatory Evidence)
            ══════════════════════════════════════ */}
            {project.verificationPanel?.verifiedAt && (
              <section id="verification" className="bg-white rounded-2xl border border-[#029bba]/20 shadow-sm p-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#029bba]" />
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-[#029bba]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                      Verified Legal & Regulatory Status
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

            {/* ══════════════════════════════════════
                DEVELOPER TRUST CARD (Wave 3)
                Moved up — buyers see developer trust
                BEFORE pricing details
            ══════════════════════════════════════ */}
            {/* ══════════════════════════════════════
                RISK ALERTS — Important Information
                (after positive evidence — balanced context)
            ══════════════════════════════════════ */}
            <RiskAlertsSection project={project} />

          </div>{/* end left column */}

            {/* ── RIGHT SIDEBAR (Unified 3-Card Stack) ── */}
            <div className="relative min-w-0 w-full max-w-[340px] justify-self-end">
              <div className="space-y-6 w-full sticky top-24">
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

        </div>{/* end 2-col grid */}

        {/* ── FULL WIDTH SECTIONS (Hero-size: 1120px) ── */}
        <div className="mt-8 lg:mt-16 space-y-10 lg:space-y-16">

            <DeveloperTrustCard
              developerProfile={project.developerProfile}
              developerObjectId={project.developer || project.developerId || ''}
              developerName={developerName}
              completedProjects={project.completedProjects}
              relatedProjects={project.relatedProjects}
            />

            {/* ══════════════════════════════════════════════════
                AVAILABLE UNITS TABLE — Highrise Inventory Grid
                Segmented filters · size conversion · unit inquiry
            ══════════════════════════════════════════════════ */}
            <AvailableUnitsTable project={project} />

            {/* Legacy "Units & Pricing" section completely removed.
                Replaced by <AvailableUnitsTable /> above (Highrise V3.0). */}

            {/* About section extracted to ProjectAbout.tsx (Wave 5B) */}

            {/* ══════════════════════════════════════
                FEATURES & AMENITIES
            ══════════════════════════════════════ */}
                {/* Features & Amenities are rendered via <BuildingHighlights /> above */}
              {false && (
              <Section id="features-legacy" title="Features & Amenities"
                icon={<Award className="w-5 h-5 text-[#029bba]" />}
                headerExtra={<span className="text-sm text-gray-500">{project.amenitiesDetailed!.length} amenities</span>}>
                {(() => {
                  const grouped = project.amenitiesDetailed!.reduce<Record<string, typeof project.amenitiesDetailed>>(
                    (acc, item) => {
                      const key = item.category || 'general';
                      if (!acc[key]) acc[key] = [];
                      acc[key]!.push(item);
                      return acc;
                    }, {}
                  );

                  const catMeta: Record<string, { label: string; icon: React.ReactNode }> = {
                    security:    { label: 'Security',    icon: <Lock className="w-4 h-4 text-[#029bba]" /> },
                    lifestyle:   { label: 'Lifestyle',   icon: <Heart className="w-4 h-4 text-[#029bba]" /> },
                    convenience: { label: 'Convenience', icon: <Coffee className="w-4 h-4 text-[#029bba]" /> },
                    recreation:  { label: 'Recreation',  icon: <TreePine className="w-4 h-4 text-[#029bba]" /> },
                    business:    { label: 'Business',    icon: <Briefcase className="w-4 h-4 text-[#029bba]" /> },
                    spiritual:   { label: 'Spiritual',   icon: <Star className="w-4 h-4 text-[#029bba]" /> },
                    general:     { label: 'General',     icon: <Star className="w-4 h-4 text-[#029bba]" /> },
                  };

                  return (
                    <div className="space-y-6">
                      {Object.entries(grouped).map(([category, items], i) => {
                        const meta = catMeta[category] ?? { label: category.charAt(0).toUpperCase() + category.slice(1), icon: <Star className="w-4 h-4 text-[#029bba]" /> };
                        return (
                          <div key={i}>
                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 capitalize">
                              <span className="w-7 h-7 rounded-lg bg-[#029bba]/10 flex items-center justify-center">
                                {meta.icon}
                              </span>
                              {meta.label}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {items!.map((amenity, j) => (
                                <div key={j} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                  <CheckCircle className="w-4 h-4 text-[#029bba] flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-gray-700 font-medium text-sm">{amenity.name}</span>
                                    {amenity.description && (
                                      <p className="text-xs text-gray-500 mt-0.5">{amenity.description}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </Section>
            )}

            <ConstructionTracker project={project} />

            {/* ══════════════════════════════════════
                LOCATION
            ══════════════════════════════════════ */}
             <Section id="location" title="Location & Neighborhood" icon={<MapPin className="w-5 h-5 text-[#029bba]" />} headerExtra={
              <a href={getMapsLink(project)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-[#029bba] hover:underline bg-[#029bba]/10 px-3 py-1.5 rounded-full">
                <ExternalLink className="w-3.5 h-3.5" /> Google Maps
              </a>
            }>
              
              {/* Address Banner */}
              <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <MapPin className="w-5 h-5 text-[#029bba] mt-0.5 flex-shrink-0" />
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

              {/* 1. Interactive Map Explorer FIRST */}
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
                    <iframe src={getMapEmbedUrl(project)} width="100%" height="100%"
                      style={{ border: 0 }} allowFullScreen loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade" title="Project Location" />
                  </div>
                )}
              </div>

              {/* 2. Neighborhood Snapshot & Vibe SECOND */}
              <NeighborhoodInsights places={project.nearbyFacilities ?? []} />

              {/* 3. Location Advantages THIRD */}
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
                              <CheckCircle className="w-4 h-4 text-[#10b981] mt-0.5 flex-shrink-0" />
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

            {/* ══════════════════════════════════════════════════
                ENHANCED FLOOR PLANS GRID — Highrise Showcase
            ══════════════════════════════════════════════════ */}
              <FloorPlansGrid 
              project={project} 
              onInquire={(planTitle) => {
                setInquiryType('general_inquiry');
                setShowInquiry(true);
                // Pre-fill context if needed via global state, but modal picks up project context automatically
              }} 
            />

            {/* ══════════════════════════════════════
                PAYMENT PLANS (multi-plan) — falls back
                to single installmentPlan below when empty
            ══════════════════════════════════════ */}
            {((project.paymentPlanImages?.length ?? 0) > 0 || (project.floorWisePriceImages?.length ?? 0) > 0) && (
              <section id="payment" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#029bba]" />
                    Payment Plans
                  </h2>
                  {project.projectDocuments?.paymentPlanUrl && (
                    <a
                      href={project.projectDocuments.paymentPlanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#029bba] hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
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
                      className="group rounded-2xl border border-gray-200 overflow-hidden text-left
                                 hover:border-[#029bba]/30 hover:shadow-lg transition-all bg-white"
                    >
                      <div className="relative bg-[#f8fafc] h-64 sm:h-72 flex items-center justify-center p-4">
                        <img
                          src={img.url}
                          alt={img.caption || 'Payment plan'}
                          className="max-h-full max-w-full object-contain transition-transform duration-300
                                     group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0
                                        group-hover:opacity-100 transition-opacity">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                           bg-black/60 backdrop-blur-sm text-white text-xs font-bold">
                            <Maximize2 className="w-3.5 h-3.5" />
                            Click to expand
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
                        <p className="text-sm font-bold text-gray-900 truncate text-center">
                          {img.caption || `Payment Plan ${i + 1}`}
                        </p>
                        <Maximize2 className="w-4 h-4 text-gray-400 shrink-0" />
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
                    <CreditCard className="w-5 h-5 text-[#029bba]" />
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

            {/* ══════════════════════════════════════
                PAYMENT PLAN (single — legacy fallback)
            ══════════════════════════════════════ */}
            {activePaymentPlans.length === 0 && (project.paymentPlanImages?.length ?? 0) === 0 && project.installmentPlan && project.saleMode === 'Installment' && (
              <Section id="payment" title="Payment Plan" icon={<CreditCard className="w-5 h-5 text-[#029bba]" />}>
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
                        <p className="text-xs text-gray-500 mt-1">× {project.installmentPlan.monthlyDuration} months</p>
                      )}
                    </div>
                  )}
                  {project.installmentPlan.quarterlyAmount && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Quarterly</p>
                      <p className="text-xl font-bold text-gray-900">{formatDetailPrice(project.installmentPlan.quarterlyAmount)}</p>
                      {project.installmentPlan.quarterlyDuration && (
                        <p className="text-xs text-gray-500 mt-1">× {project.installmentPlan.quarterlyDuration} qtrs</p>
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
                      <Download className="w-4 h-4" />Download Complete Payment Plan
                    </button>
                  </div>
                )}
              </Section>
            )}

            {/* ══════════════════════════════════════
                DOCUMENTS / LEGAL VAULT
            ══════════════════════════════════════ */}
            <DocumentsLegalVault 
              project={project} 
              onInquire={(docName) => {
                setInquiryType('general_inquiry');
                setShowInquiry(true);
              }}
            />

            {/* ══════════════════════════════════════
                PROJECT REVIEWS & COMMUNITY RATINGS
            ══════════════════════════════════════ */}
            <ProjectReviewsSection project={projectAsDetail} />

          {/* DeveloperTrustCard moved higher — see after AI Risk Summary */}

        </div>{/* end FULL WIDTH SECTIONS */}
      </div>{/* end max-w-[1120px] */}

      {/* ══════════════════════════════════════
          SIMILAR PROJECTS (Discovery Exit Ramp)
      ══════════════════════════════════════ */}
      <SimilarProjectsSection
        currentProjectId={project._id}
        currentCity={project.city}
        currentCategory={project.projectCategory}
        currentMinPrice={overallMinPrice}
        currentMaxPrice={overallMaxPrice}
        currentDeveloperId={project.developer || project.developerId}
      />

      {/* ══════════════════════════════════════
          DISCLAIMER
      ══════════════════════════════════════ */}
      <div className="bg-amber-50 border-t border-amber-100">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              <strong className="text-amber-800">Disclaimer:</strong>{' '}
              Highrise.pk verifies project details to the best of our ability. We strongly recommend
              visiting the project site, verifying documents independently, and consulting legal counsel
              before any financial commitment.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MODALS — Wave 4 cleanup:
          → GalleryModal removed (ProjectGallery handles it)
          → VideoModal kept for developer video previews
          → UniversalInquiryModal for contact gating
      ══════════════════════════════════════ */}
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

      {/* Floor plan fullscreen viewer */}
        {/* Floor plan fullscreen viewer */}
        {floorPlanViewer && (
          <FloorPlanModal
            plan={floorPlanViewer.plan}
            imageUrl={floorPlanViewer.imageUrl}
            pdfUrl={floorPlanViewer.pdfUrl}
            onClose={() => setFloorPlanViewer(null)}
          />
        )}

        {/* Report Project Modal */}
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

// ============================================
// ISR DATA FETCHING
// ============================================

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

    // Visibility gate
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