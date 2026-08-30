// pages/projects/[slug]/index.tsx
// Highrise.pk — Public Project Detail Page (V2.0 Complete Redesign)
// Design: Clean white, MagicBricks gallery, Realtor sidebar, Zameen PKR context

import React, { useEffect, useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';
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
} from 'lucide-react';
import ProjectDetailHero   from '@/components/project-detail/ProjectDetailHero';
import QuickActionsBar     from '@/components/project-detail/QuickActionsBar';
import DeveloperTrustCard      from '@/components/project-detail/DeveloperTrustCard';
import FAQSection                from '@/components/project-detail/FAQSection';
import HomeLoanCalculator        from '@/components/project-detail/HomeLoanCalculator';
import SimilarProjectsSection    from '@/components/project-detail/SimilarProjectsSection';
import ProjectHighlights         from '@/components/project-detail/ProjectHighlights';
import ProjectAbout              from '@/components/project-detail/ProjectAbout';
import ChooseYourSpace           from '@/components/project-detail/ChooseYourSpace';
// Trust calculator imports removed — Trust Index, Passport, and AI Risk sections removed per client request
import type {
  ProjectDetailData,
  InquiryType,
  UnitRow,
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
  getProjectAreaDisplay,
  getDeveloperDisplayName,
  getPrimaryImageUrl,
  DETAIL_SECTION_TABS,
  UNIT_STATUS_STYLES,
} from '@/types/projectDetail';
import DOMPurify from 'isomorphic-dompurify';

// ============================================
// TYPES
// All shared types imported from @/types/projectDetail (Wave 4 cleanup)
// ============================================

// Local alias — kept only to minimize downstream renames
type ProjectData = ProjectDetailData;

interface PageProps {
  project:      ProjectData;
  initialUnits: UnitRow[];
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

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

function getYouTubeEmbed(url: string): string {
  if (!url) return '';
  const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11
    ? `https://www.youtube.com/embed/${m[2]}`
    : url;
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
    <section id={id} className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          {icon}{title}
        </h2>
        {headerExtra}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// GalleryModal removed — ProjectGallery component handles lightbox (Wave 4 cleanup)

// Video Modal
function VideoModal({ isOpen, onClose, videoUrl, title }: {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        <button onClick={onClose} aria-label="Close video"
          className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300">
          <X className="w-8 h-8" />
        </button>
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          <iframe src={getYouTubeEmbed(videoUrl)} className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen title={title || 'Video'} />
        </div>
      </div>
    </div>
  );
}

// ShareMenu removed — Sprint 1 ShareMenu (components/projects/ShareMenu.tsx) handles it via ProjectDetailHero (Wave 4 cleanup)

// Banner removed — was only used by dead bookmark/share handlers (Wave 4 cleanup)

// SimilarProjectsSection extracted to components/project-detail/SimilarProjectsSection.tsx (Wave 4)
// FAQSection extracted to components/project-detail/FAQSection.tsx (Wave 4)
// HomeLoanCalculator extracted to components/project-detail/HomeLoanCalculator.tsx (Wave 4)
// SimilarProjectsSection extracted to components/project-detail/SimilarProjectsSection.tsx (Wave 4)

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ProjectDetailPage({ project, initialUnits }: PageProps) {
  const router = useRouter();

  // Units
  const [units, setUnits]               = useState<UnitRow[]>(initialUnits);
  const [unitsLoading, setUnitsLoading] = useState(false);

  // UI state
  const [activeSection,     setActiveSection]     = useState('overview');
  const [showFullDesc,      setShowFullDesc]      = useState(false);
  const [activeOfferingTab, setActiveOfferingTab] = useState<'all' | 'residential' | 'commercial'>('all');
  const [activeOfferingIdx, setActiveOfferingIdx] = useState(0);
  const [activeFloorPlanIdx, setActiveFloorPlanIdx] = useState(0);

  // Video modal (still used for developer videos)
  const [videoOpen, setVideoOpen]           = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');

  // Inquiry modal (contact gating)
  const [showInquiry, setShowInquiry] = useState(false);
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
  const primaryVideoUrl = project.droneVideoUrl || project.videos?.[0]?.url || '';
  const safeDesc = sanitizeHtml(project.description || '');
  const plainDesc = stripTags(safeDesc);
  const shouldTruncate = plainDesc.length > 800;
  const availableUnits = units.filter(u => u.status === 'available');
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

  // Refresh units client-side
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      setUnitsLoading(true);
      try {
        const res = await fetch(`/api/projects/${project._id}/units?limit=100`, {
          credentials: 'include',
        });
        const data = await res.json() as { success: boolean; units?: UnitRow[] };
        if (!cancelled && data.success && data.units) setUnits(data.units);
      } catch { /* keep initial units */ }
      finally { if (!cancelled) setUnitsLoading(false); }
    };
    void refresh();
    return () => { cancelled = true; };
  }, [project._id]);

  // Scroll spy
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target.id) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-130px 0px -50% 0px', threshold: 0.2 }
    );
    DETAIL_SECTION_TABS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Handlers ──
  // Bookmark + share handlers removed (Wave 4 cleanup):
  //   → useFavorites hook (Sprint 2) handles save/unsave in ProjectDetailHero
  //   → Sprint 1 ShareMenu handles all sharing in ProjectDetailHero + QuickActionsBar

  function openVideo(url: string) {
    setActiveVideoUrl(url);
    setVideoOpen(true);
  }

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
      availability: availableUnits.length > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      ...(units.length > 0 ? { offerCount: units.length } : {}),
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

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50">
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(realEstateListingLd) }}
        />

        {/* 2. BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />

        {/* 3. Organization (Developer) */}
        {organizationLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
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
        project={projectAsDetail}
        overallMinPrice={overallMinPrice}
        overallMaxPrice={overallMaxPrice}
        minAreaSqft={minAreaSqft}
        maxAreaSqft={maxAreaSqft}
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

      {/* ══════════════════════════════════════
          STICKY TAB NAVIGATION
      ══════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 py-1">
            {DETAIL_SECTION_TABS.map(s => (
              <button key={s.id}
                onClick={() => {
                  const el = document.getElementById(s.id);
                  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' });
                }}
                className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
                  activeSection === s.id
                    ? 'text-[#029bba] bg-[#029bba]/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

            {/* ══════════════════════════════════════
          ABOUT + HIGHLIGHTS (Wave 5B)
          Order: Description first → Then quick-scan highlights
          Rationale: Buyer reads context → then scans key features
      ══════════════════════════════════════ */}
      <ProjectAbout      project={project} />
      <ProjectHighlights project={project} />

      {/* ══════════════════════════════════════
          MAIN CONTENT — TWO COLUMN LAYOUT (3:1 ratio for wider content)
      ══════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── LEFT COLUMN (Content) — 75% width ── */}
          <div className="lg:col-span-3 space-y-8">

            {/* ══════════════════════════════════════
                VERIFICATION PANEL (Fact-Based Regulatory Evidence)
            ══════════════════════════════════════ */}
            {project.verificationPanel?.verifiedAt && (
              <section className="bg-white rounded-2xl border border-[#029bba]/20 shadow-sm p-6 overflow-hidden relative">
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
            <DeveloperTrustCard
              developerProfile={project.developerProfile}
              developerObjectId={project.developer || project.developerId || ''}
              developerName={developerName}
              completedProjects={project.completedProjects}
              relatedProjects={project.relatedProjects}
            />

            {/* OVERVIEW CARDS */}
            <section id="overview">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Category */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all">
                  <div className="w-11 h-11 rounded-xl bg-[#029bba]/10 flex items-center justify-center mb-3">
                    <Building2 className="w-5 h-5 text-[#029bba]" />
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Category</p>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.projectCategory === 'highrise' ? 'High-Rise' : project.projectCategory === 'society' ? 'Society' : project.projectCategory.replace(/_/g, ' ')}
                  </p>
                  <span className="mt-2 inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-full capitalize">
                    {project.projectNature}
                  </span>
                </div>

                {/* Developer */}
                <Link href={`/developers/${project.developer || project.developerId || ''}`}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-[#029bba]/30 transition-all group">
                  <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center mb-3 overflow-hidden relative">
                    {project.developerProfile?.logoUrl ? (
                      <Image src={project.developerProfile.logoUrl} alt={project.developerProfile?.companyName ?? ''}
                        fill className="object-contain p-1" sizes="44px" />
                    ) : (
                      <Building2 className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Developer</p>
                  <p className="font-bold text-[#029bba] text-sm group-hover:underline">
                    {project.developerProfile?.companyName || 'View Developer'}
                  </p>
                </Link>

                {/* Available */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all">
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Available</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-green-600">{availableUnits.length}</span>
                    <span className="text-gray-400 text-sm">/ {units.length}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full"
                      style={{ width: `${units.length ? Math.round((availableUnits.length / units.length) * 100) : 0}%` }} />
                  </div>
                </div>

                {/* Status */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Status</p>
                  <p className="font-bold text-gray-900 text-sm capitalize">{project.projectStatus || project.status}</p>
                  {project.developmentProgress !== undefined && (
                    <>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${project.developmentProgress}%` }} />
                      </div>
                      <p className="text-[10px] text-purple-600 font-bold mt-1">{project.developmentProgress}% Complete</p>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════
                CHOOSE YOUR SPACE — Highrise Signature (V2.0)
                Positioned right after Overview for maximum impact
            ══════════════════════════════════════ */}
            <ChooseYourSpace
              project={project}
              onInquire={(unitTypeName) => {
                setInquiryType('project_interest');
                setShowInquiry(true);
                void unitTypeName;
              }}
            />

            {/* Legacy "Units & Pricing" section completely removed.
                Replaced by <ChooseYourSpace /> above (Highrise V2.0). */}

            {/* About section extracted to ProjectAbout.tsx (Wave 5B) */}

            {/* ══════════════════════════════════════
                FEATURES & AMENITIES
            ══════════════════════════════════════ */}
            {(project.amenitiesDetailed?.length ?? 0) > 0 && (
              <Section id="features" title="Features & Amenities"
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

            {/* ══════════════════════════════════════
                CONSTRUCTION UPDATES
            ══════════════════════════════════════ */}
            {(project.developmentUpdates?.length ?? 0) > 0 && (
              <Section title="Construction Updates" icon={<Calendar className="w-5 h-5 text-[#029bba]" />}>
                <div className="space-y-6">
                  {[...(project.developmentUpdates || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((upd, idx, arr) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-[#029bba] ring-4 ring-[#029bba]/10" />
                        {idx < arr.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-2" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#029bba] bg-[#029bba]/5 px-2 py-1 rounded-md">
                            {formatDate(upd.date)}
                          </span>
                          {((upd.progress ?? upd.progressPercent ?? 0) > 0) && (
                            <span className="text-xs font-bold text-gray-400">{upd.progress ?? upd.progressPercent}%</span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">{upd.title}</h4>
                        {upd.description && (
                          <p className="text-gray-600 text-sm mb-3">{upd.description}</p>
                        )}
                        {(upd.images?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {upd.images!.map((img, imgIdx) => {
                              // Handle both string URLs (legacy) and object format {url, publicId, caption}
                              const imgUrl = typeof img === 'string' ? img : (img as { url?: string })?.url;
                              if (!imgUrl) return null;
                              return (
                                <div key={imgIdx} className="relative w-28 h-20 rounded-lg overflow-hidden border border-gray-200">
                                  <Image src={imgUrl} alt={`Update photo ${imgIdx + 1}`} fill className="object-cover" sizes="112px" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {((upd.progress ?? upd.progressPercent ?? 0) > 0) && (
                          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#029bba] rounded-full" style={{ width: `${upd.progress ?? upd.progressPercent}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ══════════════════════════════════════
                LOCATION
            ══════════════════════════════════════ */}
            <Section id="location" title="Location" icon={<MapPin className="w-5 h-5 text-[#029bba]" />}>
              <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <MapPin className="w-5 h-5 text-[#029bba] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {project.specificLocation ? `${project.specificLocation}, ` : ''}{areaDisplay}, {project.city}
                  </p>
                  {project.coordinates?.lat && project.coordinates?.lng && (
                    <p className="text-sm text-gray-500 mt-1">{project.coordinates.lat}, {project.coordinates.lng}</p>
                  )}
                </div>
              </div>

              {/* Nearby places */}
              {(project.nearbyFacilities?.length ?? 0) > 0 && (
                <>
                  <h4 className="font-semibold text-gray-900 mb-3">Nearby Places</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                    {project.nearbyFacilities!.map((place, idx) => {
                      const PlaceIcon = NEARBY_ICONS[place.category] ?? MapPin;
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                            <PlaceIcon className="w-4 h-4 text-[#029bba]" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{place.name}</p>
                            {place.distance && <p className="text-xs text-gray-500">{place.distance}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Map */}
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <div className="aspect-video">
                  <iframe src={getMapEmbedUrl(project)} width="100%" height="100%"
                    style={{ border: 0 }} allowFullScreen loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade" title="Project Location" />
                </div>
                <a href={getMapsLink(project)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-gray-50
                             hover:bg-gray-100 transition-colors text-[#029bba] font-medium text-sm">
                  <ExternalLink className="w-4 h-4" />Open in Google Maps
                </a>
              </div>

              {/* Location advantages */}
              {(project.locationAdvantages?.length ?? 0) > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Location Advantages</h4>
                  <div className="space-y-4">
                    {project.locationAdvantages!.map((adv, i) => (
                      <div key={i}>
                        <h5 className="font-medium text-gray-800 mb-2">{adv.title}</h5>
                        <ul className="space-y-1">
                          {adv.points.map((pt, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />{pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

                        {/* ══════════════════════════════════════
                FLOOR PLANS
            ══════════════════════════════════════ */}
            {(project.buildingFloorPlans?.length ?? 0) > 0 && (
              <Section title="Floor Plans" icon={<Layers className="w-5 h-5 text-[#029bba]" />}>
                <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-100">
                  {project.buildingFloorPlans!.map((fp, idx) => (
                    <button key={idx} onClick={() => setActiveFloorPlanIdx(idx)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeFloorPlanIdx === idx
                          ? 'bg-[#029bba] text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {fp.floorName}
                    </button>
                  ))}
                </div>
                {project.buildingFloorPlans![activeFloorPlanIdx] && (() => {
                  const fp = project.buildingFloorPlans![activeFloorPlanIdx];
                  return (
                    <div className="bg-gray-50 rounded-xl p-6 text-center">
                      {fp.imageUrl ? (
                        <div className="relative w-full h-48 md:h-80 mb-4">
                          <Image src={fp.imageUrl} alt={`Floor plan: ${fp.floorName}`}
                            fill className="object-contain" sizes="(max-width: 768px) 100vw, 66vw" />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gray-200 rounded-xl flex items-center justify-center mb-4">
                          <FileText className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      <h4 className="font-bold text-gray-900 mb-2">{fp.floorName}</h4>
                      {fp.description && <p className="text-sm text-gray-600 mb-4">{fp.description}</p>}
                      {fp.pdfUrl && (
                        <button onClick={() => downloadFile(fp.pdfUrl!, `${project.slug}-${fp.floorName}.pdf`)}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] hover:bg-[#027a94]
                                     text-white rounded-xl font-medium transition-colors">
                          <Download className="w-5 h-5" />Download PDF
                        </button>
                      )}
                    </div>
                  );
                })()}
              </Section>
            )}

            {/* ══════════════════════════════════════
                PAYMENT PLAN
            ══════════════════════════════════════ */}
            {project.installmentPlan && project.saleMode === 'Installment' && (
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
            {(project.legalDocs || project.projectDocuments) && (
              <Section id="legal" title="Documents & Legal" icon={<FileText className="w-5 h-5 text-[#029bba]" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { url: project.projectDocuments?.brochureUrl,   name: 'Project Brochure',   color: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-600', suffix: '-brochure.pdf' },
                    { url: project.projectDocuments?.priceListUrl,   name: 'Price List',         color: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-600', suffix: '-price-list.pdf' },
                    { url: project.projectDocuments?.masterPlanUrl,  name: 'Master Plan',        color: 'bg-blue-50 border-blue-200',     iconColor: 'text-blue-600',   suffix: '-master-plan.pdf' },
                    { url: project.projectDocuments?.paymentPlanUrl, name: 'Payment Plan',       color: 'bg-slate-50 border-slate-200',   iconColor: 'text-slate-700',  suffix: '-payment-plan.pdf' },
                    { url: project.legalDocs?.nocUrl,               name: 'NOC Certificate',    color: 'bg-green-50 border-green-200',   iconColor: 'text-green-600',  suffix: '-noc.pdf' },
                    { url: project.legalDocs?.layoutMapUrl,         name: 'Layout Map',         color: 'bg-cyan-50 border-cyan-200',     iconColor: 'text-cyan-600',   suffix: '-layout.pdf' },
                    { url: project.legalDocs?.environmentCertUrl,   name: 'Environment Cert',   color: 'bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-600', suffix: '-env-cert.pdf' },
                    { url: project.legalDocs?.authorityLicenseUrl,  name: 'Authority License',  color: 'bg-indigo-50 border-indigo-200', iconColor: 'text-indigo-600', suffix: '-license.pdf' },
                  ].filter(d => d.url).map(doc => (
                    <button key={doc.name} type="button"
                      onClick={() => downloadFile(doc.url!, `${project.slug}${doc.suffix}`)}
                      className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border
                                  transition-colors hover:opacity-90 ${doc.color}`}>
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Download className={`w-5 h-5 ${doc.iconColor}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{doc.name}</p>
                        <p className="text-xs text-gray-500">PDF Download</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {/* ══════════════════════════════════════
                UNIT INVENTORY TABLE
            ══════════════════════════════════════ */}
            {units.length > 0 && (
              <Section title="Available Units" icon={<Building2 className="w-5 h-5 text-[#029bba]" />}
                headerExtra={
                  <div className="flex items-center gap-2">
                    {unitsLoading && (
                      <div className="w-3 h-3 border-2 border-[#029bba] border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className="text-sm text-gray-500">
                      {availableUnits.length} available of {units.length}
                    </span>
                  </div>
                }>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full min-w-[650px]">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        {['Unit', 'Type', 'Floor', 'Size', 'Price', 'Status'].map(h => (
                          <th key={h} className={`px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider ${h === 'Status' ? 'text-right' : ''}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {units.slice(0, 20).map(unit => (
                        <tr key={unit._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-900 text-sm">{unit.unitNumber}</td>
                          <td className="px-6 py-4 text-gray-600 text-sm capitalize">{unit.unitType?.replace(/_/g, ' ')}</td>
                          <td className="px-6 py-4 text-gray-600 text-sm">{unit.floorName || `Floor ${unit.floorNumber}`}</td>
                          <td className="px-6 py-4 text-gray-600 text-sm">
                            {unit.area ? `${unit.area} ${unit.areaUnit || 'Sq.Ft'}` : '—'}
                          </td>
                          <td className="px-6 py-4 font-semibold text-[#029bba] text-sm">{formatDetailPrice(unit.price)}</td>
                          <td className="px-6 py-4 text-right">
                            {unit.status === 'available' ? (
                              <button onClick={() => { setInquiryType('project_interest'); setShowInquiry(true); }}
                                className="px-4 py-1.5 bg-[#029bba] hover:bg-[#027a94] text-white text-xs
                                           font-semibold rounded-lg transition-colors">
                                Book Now
                              </button>
                            ) : (
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${UNIT_STATUS_STYLES[unit.status as keyof typeof UNIT_STATUS_STYLES] || ''}`}>
                                {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {units.length > 20 && (
                  <div className="text-center pt-4 border-t border-gray-100 mt-4">
                    <p className="text-sm text-gray-500">
                      Showing 20 of {units.length} units.{' '}
                      <button onClick={() => { setInquiryType('project_interest'); setShowInquiry(true); }}
                        className="text-[#029bba] font-semibold hover:underline">
                        Contact for full inventory
                      </button>
                    </p>
                  </div>
                )}
              </Section>
            )}

            {/* DeveloperTrustCard moved higher — see after AI Risk Summary */}

          </div>{/* end left column */}

          {/* ── RIGHT SIDEBAR (Sticky) — 25% width, compact ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">

              {/* Contact Form — COMPACT VERSION */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                {/* Compact gradient header */}
                <div className="bg-gradient-to-r from-[#029bba] to-[#004063] px-4 py-3">
                  <h3 className="text-white font-bold text-sm leading-tight">
                    Get in Touch
                  </h3>
                  <p className="text-white/70 text-[11px] mt-0.5">
                    Response in 15 min
                  </p>
                </div>

                {/* Compact button stack */}
                <div className="p-3 space-y-2">
                  <button
                    onClick={() => { setInquiryType('project_interest'); setShowInquiry(true); }}
                    className="w-full bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#02a8c9] hover:to-[#00507a]
                               text-white font-bold py-2.5 rounded-lg transition-all shadow-sm
                               flex items-center justify-center gap-1.5 text-sm">
                    <MessageCircle className="w-4 h-4" />
                    Send Inquiry
                  </button>

                  <button
                    onClick={() => { setInquiryType('call_back'); setShowInquiry(true); }}
                    className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700
                               font-semibold py-2 rounded-lg transition-colors
                               flex items-center justify-center gap-1.5 text-xs">
                    <Phone className="w-3.5 h-3.5" />
                    Callback
                  </button>

                  <button
                    onClick={() => { setInquiryType('site_visit'); setShowInquiry(true); }}
                    className="w-full bg-green-50 border border-green-200 hover:bg-green-100 text-green-700
                               font-semibold py-2 rounded-lg transition-colors
                               flex items-center justify-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    Site Visit
                  </button>

                  {/* Compact trust badges */}
                  <div className="flex items-center justify-center gap-3 pt-2 border-t border-gray-100 mt-2">
                    <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      Secure
                    </span>
                    <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      15 min
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4 text-sm">Quick Info</h3>
                <div className="space-y-3 text-sm">
                  {project.launchDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Launch</span>
                      <span className="font-medium text-gray-900">{formatDate(project.launchDate)}</span>
                    </div>
                  )}
                  {project.expectedCompletionDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Completion</span>
                      <span className="font-medium text-gray-900">{formatDate(project.expectedCompletionDate)}</span>
                    </div>
                  )}
                  {project.possessionStartDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Possession</span>
                      <span className="font-medium text-gray-900">{formatDate(project.possessionStartDate)}</span>
                    </div>
                  )}
                  {project.approvalAuthority && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Approved By</span>
                      <span className="font-medium text-gray-900">{project.approvalAuthority}</span>
                    </div>
                  )}
                  {project.saleMode && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sale Mode</span>
                      <span className="font-medium text-gray-900">{project.saleMode}</span>
                    </div>
                  )}
                  {project.floorDetails?.totalFloors && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Floors</span>
                      <span className="font-medium text-gray-900">{project.floorDetails.totalFloors}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Safety note */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium mb-1">Safety First</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Always visit the project site before making any payment.
                      Verify all documents independently. Verification on Highrise.pk
                      does not constitute a guarantee.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>{/* end sidebar */}

        </div>{/* end grid */}
      </div>{/* end max-w-7xl */}

      {/* ══════════════════════════════════════
          SIMILAR PROJECTS (4 Categories)
      ══════════════════════════════════════ */}
      <SimilarProjectsSection
        currentProjectId={project._id}
        currentCity={project.city}
        currentCategory={project.projectCategory}
        currentMinPrice={overallMinPrice}
        currentMaxPrice={overallMaxPrice}
      />

      {/* ══════════════════════════════════════
          HOME LOAN CALCULATOR
      ══════════════════════════════════════ */}
      <HomeLoanCalculator
        propertyPrice={overallMinPrice || project.minPrice || 0}
        projectName={project.projectName}
        projectSlug={project.slug}
      />

      {/* ══════════════════════════════════════
          FAQ SECTION
      ══════════════════════════════════════ */}
      <FAQSection
        projectName={project.projectName}
        city={project.city}
        area={areaDisplay}
        minPrice={overallMinPrice}
        maxPrice={overallMaxPrice}
        possessionDate={project.possessionStartDate}
        saleMode={project.saleMode}
        developerName={developerName}
        approvalAuthority={project.approvalAuthority}
        nocStatus={project.nocStatus}
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
      <VideoModal
        isOpen={videoOpen}
        onClose={() => setVideoOpen(false)}
        videoUrl={activeVideoUrl}
      />

      <UniversalInquiryModal
        isOpen={showInquiry}
        onClose={() => setShowInquiry(false)}
        entityType="project"
        entityId={project._id}
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

    // Fetch units
    const projectId = rawDoc._id as import('mongoose').Types.ObjectId;
    const rawUnits = await Unit.find({
      projectId: projectId,
      status: { $ne: 'cancelled' },
    })
      .select('unitNumber floorNumber floorName unitType price areaSqft areaMarla status bedrooms bathrooms listingType facing')
      .sort({ floorNumber: 1, unitNumber: 1 })
      .limit(50)
      .maxTimeMS(3000)
      .lean();

    const initialUnits = JSON.parse(JSON.stringify(rawUnits)) as UnitRow[];

    return {
      props: { project, initialUnits },
      revalidate: 30,
    };
  } catch {
    return { notFound: true };
  }
};