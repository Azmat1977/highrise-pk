// pages/societies/[slug].tsx
// Highrise.pk - Society Public Intelligence Report
// Design System Locked: tokens from @/lib/design-system/tokens | icons from @/lib/design-system/icons
// Pattern C Compliant: 2-column fluid left + natural scroll 3-card sidebar stack | Pure ASCII comments

import type { GetStaticPaths, GetStaticProps } from 'next';
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import AleemWidget from '@/components/aleem/AleemWidget';
import { icons } from '@/lib/design-system/icons';
import { colors, containers, grids, radii, shadows } from '@/lib/design-system/tokens';
import { typography } from '@/lib/design-system/typography';
import { card, button, badge, safety } from '@/lib/design-system/components';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';
import AuthGateModal from '@/components/auth/AuthGateModal';
import { useFavorites } from '@/hooks/useFavorites';
import { useCompare } from '@/hooks/useCompare';

import UniversalContactCard from '@/components/shared/UniversalContactCard';
import SafeDealSidebarCard from '@/components/shared/SafeDealSidebarCard';
import SafetyWarningCard from '@/components/shared/SafetyWarningCard';
import ReportListingModal from '@/components/property/ReportListingModal';

// ============================================================================
// TYPES
// ============================================================================

interface RiskAlert {
  _id: string;
  severity: string;
  title: string;
  message: string;
  issuedBy?: string;
  referenceNo?: string;
  date: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedNote?: string;
}

interface BlockRate {
  blockName: string;
  plotSize: string;
  minPrice: number;
  maxPrice: number;
  pricePerMarla?: number;
  lastUpdated: string;
}

interface SocietyDocument {
  _id: string;
  title: string;
  url: string;
  type: string;
  uploadedAt: string;
}

interface SocietyDetail {
  _id: string;
  name: string;
  slug: string;
  alternateNames: string[];
  category: string;
  description?: string;
  city: string;
  areaName: string;
  fullAddress?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
  nocStatus: string;
  nocNumber?: string;
  nocDate?: string;
  nocExpiryDate?: string;
  approvalAuthority: string;
  developmentAuthority?: string;
  registrationNo?: string;
  litigationStatus: string;
  litigationNote?: string;
  isNOCValid: boolean;
  overallRiskLevel: string;
  riskAlerts: RiskAlert[];
  activeAlertCount: number;
  scores: {
    legal: number;
    growth: number;
    possession: number;
    infrastructure: number;
    livability: number;
    overall: number;
  };
  infrastructureDetails: {
    electricity: number;
    gas: number;
    water: number;
    sewerage: number;
    internet: number;
    roads: number;
  };
  livabilityDetails: {
    schools: number;
    hospitals: number;
    markets: number;
    transport: number;
    security: number;
    parks: number;
  };
  blockRates: BlockRate[];
  priceChangeYoY?: number;
  rentalYield?: number;
  featuredImage?: string;
  images: string[];
  documents: SocietyDocument[];
  developerName?: string;
  developerWebsite?: string;
  totalPlots?: number;
  totalPhases?: number;
  launchYear?: number;
  expectedCompletionYear?: number;
  possessionPercentage?: number;
  isVerifiedByHighrise: boolean;
  isFeatured: boolean;
  viewCount: number;
  lastVerifiedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

interface RelatedSociety {
  _id: string;
  name: string;
  slug: string;
  city: string;
  areaName: string;
  overallScore: number;
  overallRiskLevel: string;
  featuredImage?: string;
}

interface PageProps {
  society: SocietyDetail;
  relatedCounts: { properties: number; projects: number };
  relatedSocieties: RelatedSociety[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NOC_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactElement;
}> = {
  approved: {
    label: 'NOC Approved',
    color: 'text-[#10b981]',
    bg: 'bg-[#f0fdf4]',
    border: 'border-emerald-200',
    icon: <icons.ShieldCheck className="w-4 h-4" />,
  },
  pending: {
    label: 'NOC Pending',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fef3c7]',
    border: 'border-amber-200',
    icon: <icons.Clock className="w-4 h-4" />,
  },
  under_review: {
    label: 'Under Review',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fef3c7]',
    border: 'border-amber-200',
    icon: <icons.Clock className="w-4 h-4" />,
  },
  illegal: {
    label: 'Declared Illegal',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-red-200',
    icon: <icons.XCircle className="w-4 h-4" />,
  },
  disputed: {
    label: 'Disputed',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-red-200',
    icon: <icons.AlertTriangle className="w-4 h-4" />,
  },
  cancelled: {
    label: 'NOC Cancelled',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-red-200',
    icon: <icons.XCircle className="w-4 h-4" />,
  },
  expired: {
    label: 'NOC Expired',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fef3c7]',
    border: 'border-amber-200',
    icon: <icons.AlertTriangle className="w-4 h-4" />,
  },
};

const RISK_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  safe: {
    label: 'Safe Investment',
    color: 'text-[#10b981]',
    bg: 'bg-[#f0fdf4]',
    border: 'border-emerald-200',
  },
  caution: {
    label: 'Proceed with Caution',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fef3c7]',
    border: 'border-amber-200',
  },
  high_risk: {
    label: 'High Risk Alert',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-red-200',
  },
  avoid: {
    label: 'Avoid Investment',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-300',
  },
};

const SEVERITY_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  low: {
    label: 'Low',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fef3c7]',
    border: 'border-amber-200',
  },
  medium: {
    label: 'Medium',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  high: {
    label: 'High',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-red-200',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-300',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  housing_scheme: 'Housing Scheme',
  gated_community: 'Gated Community',
  apartment_complex: 'Apartment Complex',
  commercial_zone: 'Commercial Zone',
  mixed_use: 'Mixed Use',
  industrial_zone: 'Industrial Zone',
  township: 'Township',
};

const LITIGATION_LABELS: Record<string, { label: string; color: string }> = {
  none: { label: 'No Litigation Record', color: 'text-[#10b981]' },
  minor: { label: 'Minor Boundary Dispute', color: 'text-[#f59e0b]' },
  major: { label: 'Active Major Litigation', color: 'text-[#ef4444]' },
  court_ordered_stop: { label: 'Court-Ordered Stop Work', color: 'text-[#ef4444]' },
  resolved: { label: 'Resolved Case', color: 'text-[#10b981]' },
};

// ============================================================================
// HELPERS
// ============================================================================

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-[#10b981]';
  if (score >= 50) return 'text-[#f59e0b]';
  return 'text-[#ef4444]';
}

function getScoreBg(score: number): string {
  if (score >= 75) return 'bg-[#10b981]';
  if (score >= 50) return 'bg-[#f59e0b]';
  return 'bg-[#ef4444]';
}

function formatPKR(value: number): string {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)} Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)} Lakh`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return 'Not recorded';
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ScoreBarProps {
  label: string;
  score: number;
  icon?: React.ReactElement;
}

function ScoreBar({ label, score, icon }: ScoreBarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-[#029bba]">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-gray-700">{label}</span>
          <span className={`text-xs font-black ${getScoreColor(score)}`}>{score}/100</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreBg(score)} rounded-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface RelatedSocietyCardProps {
  society: RelatedSociety;
}

function RelatedSocietyCard({ society }: RelatedSocietyCardProps): React.ReactElement {
  return (
    <Link href={`/societies/${society.slug}`} className="block">
      <div className="group flex items-center gap-3 p-3 bg-gray-50 hover:bg-[#029bba]/5 rounded-xl border border-gray-150 hover:border-[#029bba]/30 transition-all cursor-pointer">
        <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0 relative">
          {society.featuredImage ? (
            <Image
              src={getOptimizedImageUrl(society.featuredImage, { width: 150 })}
              alt={society.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <icons.Building2 className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 group-hover:text-[#029bba] transition-colors truncate">
            {society.name}
          </p>
          <p className="text-[11px] text-gray-400 truncate">{society.areaName}, {society.city}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-base font-black ${getScoreColor(society.overallScore)}`}>
            {society.overallScore}
          </div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">/100</div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function SocietyDetailPage({
  society,
  relatedCounts,
  relatedSocieties,
}: PageProps): React.ReactElement {
  const router = useRouter();
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Gated favorites and compare: signed-out clicks open the auth gate modal
  // before any API call. Both hooks return empty state when signed out.
  // Hooks are declared before the fallback return so they run unconditionally.
  const favorites = useFavorites({ defaultEntityType: 'society' });
  const compare = useCompare({ defaultEntityType: 'society' });

  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center space-y-3">
          <icons.Loader2 className="w-10 h-10 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-500">Loading society intelligence report...</p>
        </div>
      </div>
    );
  }

  const noc = NOC_CONFIG[society.nocStatus] ?? NOC_CONFIG.pending;
  const risk = RISK_CONFIG[society.overallRiskLevel] ?? RISK_CONFIG.caution;
  const litigation = LITIGATION_LABELS[society.litigationStatus] ?? { label: society.litigationStatus, color: 'text-gray-600' };
  const categoryLabel = CATEGORY_LABELS[society.category] ?? society.category;

  const activeAlerts = society.riskAlerts.filter((a) => !a.isResolved);
  const resolvedAlerts = society.riskAlerts.filter((a) => a.isResolved);

  const favoriteBusy = favorites.actionState === 'pending';
  const compareBusy = compare.actionState === 'pending';
  const isFavorite = favorites.isFavorite(society._id, 'society');
  const isCompared = compare.isInCompare(society._id, 'society');
  const compareFull = compare.isMaxReached;

  const handleToggleFavorite = (): void => {
    if (!favorites.isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    void favorites.toggle(society._id, 'society');
  };

  const handleToggleCompare = (): void => {
    if (!compare.isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    void compare.toggle(society._id, 'society');
  };

  const canonicalUrl = `https://highrise.pk/societies/${society.slug}`;
  const pageTitle = society.seoTitle || `${society.name} - NOC Status, Scores & Intelligence Report | Highrise.pk`;
  const pageDescription = society.seoDescription ||
    `${society.name} in ${society.areaName}, ${society.city}. NOC ${society.nocStatus}. Overall score: ${society.scores.overall}/100. Check legal status, risk alerts, pricing, and infrastructure.`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        {society.featuredImage && (
          <meta property="og:image" content={society.featuredImage} />
        )}

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Place',
              name: society.name,
              description: society.description ?? pageDescription,
              url: canonicalUrl,
              address: {
                '@type': 'PostalAddress',
                addressLocality: society.city,
                addressRegion: society.areaName,
                addressCountry: 'PK',
              },
              ...(society.coordinates && {
                geo: {
                  '@type': 'GeoCoordinates',
                  longitude: society.coordinates.coordinates[0],
                  latitude: society.coordinates.coordinates[1],
                },
              }),
              breadcrumb: {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://highrise.pk' },
                  { '@type': 'ListItem', position: 2, name: 'Societies', item: 'https://highrise.pk/societies' },
                  { '@type': 'ListItem', position: 3, name: society.name, item: canonicalUrl },
                ],
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">

        {/* Cover Hero Block */}
        <section className="relative bg-gradient-to-r from-[#004063] to-[#002842] pt-10 pb-0 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
          </div>

          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 relative z-10">
            {/* Breadcrumb */}
            <nav className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider mb-6 border border-white/10" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
              <icons.ChevronRight className="w-3 h-3 opacity-50" />
              <Link href="/societies" className="hover:text-white/80 transition-colors">Societies</Link>
              <icons.ChevronRight className="w-3 h-3 opacity-50" />
              <span className="text-white/90 truncate max-w-[200px]">{society.name}</span>
            </nav>

            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {society.isVerifiedByHighrise && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#029bba] text-white text-xs font-bold shadow-sm">
                    <icons.BadgeCheck className="w-3.5 h-3.5" />
                    Highrise Verified
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold border border-white/10">
                  {categoryLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold border border-white/10">
                  {society.approvalAuthority}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
                {society.name}
              </h1>

              <div className="flex flex-wrap items-center gap-5 text-white/70 text-xs font-semibold mb-6">
                <span className="flex items-center gap-1">
                  <icons.MapPin className="w-4 h-4 text-[#029bba]" />
                  {society.areaName}, {society.city}
                </span>
                {society.launchYear && (
                  <span className="flex items-center gap-1">
                    <icons.Calendar className="w-4 h-4 text-[#029bba]" />
                    Established {society.launchYear}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <icons.Eye className="w-4 h-4 text-[#029bba]" />
                  {society.viewCount.toLocaleString()} Views
                </span>
              </div>

              {/* NOC / Status badges + gated save and compare actions */}
              <div className="flex flex-wrap items-center gap-3 pb-8">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${noc.bg} ${noc.border} ${noc.color} text-xs font-bold shadow-sm`}>
                  {noc.icon}
                  {noc.label}
                </div>

                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${risk.bg} ${risk.border} ${risk.color} text-xs font-bold shadow-sm`}>
                  <icons.Shield className="w-4 h-4" />
                  {risk.label}
                </div>

                {activeAlerts.length > 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-pulse">
                    <icons.AlertTriangle className="w-4 h-4" />
                    {activeAlerts.length} Active Compliance Risk Alert{activeAlerts.length > 1 ? 's' : ''}
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={favoriteBusy}
                    aria-pressed={isFavorite}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60 ${
                      isFavorite
                        ? 'bg-[#ef4444] text-white'
                        : 'border border-white/20 bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    <icons.Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                    {isFavorite ? 'Saved' : 'Save Society'}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleCompare}
                    disabled={compareBusy || (!isCompared && compareFull)}
                    aria-pressed={isCompared}
                    title={!isCompared && compareFull ? 'Compare list is full (4 maximum)' : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60 ${
                      isCompared
                        ? 'bg-[#10b981] text-white'
                        : 'border border-white/20 bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    {isCompared ? <icons.Check className="w-4 h-4" /> : <icons.BarChart3 className="w-4 h-4" />}
                    {isCompared ? 'Added to Compare' : 'Compare'}
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Hero Banner Image */}
            {society.featuredImage && (
              <div className="relative h-64 md:h-80 rounded-t-2xl overflow-hidden border-t border-x border-white/10">
                <Image
                  src={getOptimizedImageUrl(society.featuredImage, { width: 1200 })}
                  alt={society.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 1120px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-md text-center">
                  <div className={`text-4xl font-black ${getScoreColor(society.scores.overall)}`}>
                    {society.scores.overall}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Overall Score</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Two-Column Pattern C Detail Page Structure */}
        <div className={containers.detail}>
          <div className={grids.detailTwoCol}>

            {/* LEFT COLUMN: Main Intelligence Content */}
            <div className="space-y-6 min-w-0">

              {/* Risk Alerts Panel */}
              {activeAlerts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
                  <div className="bg-[#ef4444] px-6 py-3.5 flex items-center gap-2">
                    <icons.AlertTriangle className="w-5 h-5 text-white" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Active Compliance Risk Alerts ({activeAlerts.length})
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    {activeAlerts.map((alert) => {
                      const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.medium;
                      return (
                        <div
                          key={alert._id}
                          className={`p-4 rounded-xl border-l-4 ${sev.border} ${sev.bg}`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <p className="text-sm font-bold text-gray-900 leading-snug">{alert.title}</p>
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.border} ${sev.color} ${sev.bg} uppercase tracking-wider`}>
                              {sev.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed mb-2">{alert.message}</p>
                          <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            {alert.issuedBy && <span>Authority: {alert.issuedBy}</span>}
                            {alert.referenceNo && <span>Ref #: {alert.referenceNo}</span>}
                            <span>Date: {formatDate(alert.date)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* About / Description */}
              {society.description && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
                  <h2 className={typography.sectionTitlePlain}>Intelligence Profile</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{society.description}</p>

                  {/* Fact Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-gray-100">
                    {society.totalPlots && (
                      <div>
                        <p className="text-xl font-black text-[#004063]">{society.totalPlots.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 font-medium">Total Plots</p>
                      </div>
                    )}
                    {society.totalPhases && (
                      <div>
                        <p className="text-xl font-black text-[#004063]">{society.totalPhases}</p>
                        <p className="text-xs text-gray-400 font-medium">Phases</p>
                      </div>
                    )}
                    {society.possessionPercentage !== undefined && (
                      <div>
                        <p className="text-xl font-black text-[#004063]">{society.possessionPercentage}%</p>
                        <p className="text-xs text-gray-400 font-medium">Possession Delivery</p>
                      </div>
                    )}
                    {society.expectedCompletionYear && (
                      <div>
                        <p className="text-xl font-black text-[#004063]">{society.expectedCompletionYear}</p>
                        <p className="text-xs text-gray-400 font-medium">Expected Completion</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* NOC & Authority Framework Section */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
                <h2 className={typography.sectionTitlePlain}>Legal &amp; Regulatory Framework</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs font-semibold text-gray-600">
                  <div className="space-y-1">
                    <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">NOC Status</p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${noc.bg} ${noc.border} ${noc.color}`}>
                        {noc.icon} {noc.label}
                      </span>
                    </div>
                  </div>

                  {society.nocNumber && (
                    <div className="space-y-1">
                      <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">NOC reference number</p>
                      <p className="font-mono text-sm text-gray-800 pt-0.5">{society.nocNumber}</p>
                    </div>
                  )}

                  {society.nocDate && (
                    <div className="space-y-1">
                      <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">NOC approval date</p>
                      <p className="text-sm text-gray-800 pt-0.5">{formatDate(society.nocDate)}</p>
                    </div>
                  )}

                  {society.nocExpiryDate && (
                    <div className="space-y-1">
                      <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">NOC expiry date</p>
                      <p className={`text-sm ${society.isNOCValid ? 'text-gray-800' : 'text-red-600 font-black'} pt-0.5`}>
                        {formatDate(society.nocExpiryDate)}
                        {!society.isNOCValid && ' (Expired)'}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Statutory Authority</p>
                    <p className="text-sm text-[#029bba] pt-0.5">{society.approvalAuthority}</p>
                  </div>

                  {society.developmentAuthority && (
                    <div className="space-y-1">
                      <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Development Body</p>
                      <p className="text-sm text-gray-800 pt-0.5">{society.developmentAuthority}</p>
                    </div>
                  )}

                  {society.registrationNo && (
                    <div className="space-y-1">
                      <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Registration CUIN/No.</p>
                      <p className="font-mono text-sm text-gray-800 pt-0.5">{society.registrationNo}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Litigation Status</p>
                    <p className={`text-sm ${litigation.color} pt-0.5`}>{litigation.label}</p>
                  </div>
                </div>

                {society.litigationNote && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                    <icons.AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 leading-relaxed font-semibold">{society.litigationNote}</p>
                  </div>
                )}
              </div>

              {/* Developer Credentials */}
              {society.developerName && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-3">
                  <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wider leading-none">Housing Society Developer</p>
                  <h3 className="text-base font-black text-[#004063] leading-none">{society.developerName}</h3>
                  {society.developerWebsite && (
                    <a
                      href={society.developerWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#029bba] font-bold hover:underline"
                    >
                      <icons.ExternalLink className="w-4 h-4" />
                      Visit Developer Website
                    </a>
                  )}
                </div>
              )}

              {/* Overall Intelligence Metrics */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                  <icons.Activity className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-gray-900">Highrise Intelligence Ratings</h2>
                </div>
                <div className="p-6">
                  {/* Circle score hero */}
                  <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-100">
                    <div className="relative w-20 h-20 shrink-0">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                        <circle
                          cx="40" cy="40" r="34" fill="none"
                          stroke={society.scores.overall >= 75 ? '#10b981' : society.scores.overall >= 50 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="10"
                          strokeDasharray={`${(society.scores.overall / 100) * 213.6} 213.6`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xl font-extrabold ${getScoreColor(society.scores.overall)}`}>
                          {society.scores.overall}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Overall Delivery Score</p>
                      <p className={`text-lg font-black ${risk.color}`}>{risk.label}</p>
                      {society.lastVerifiedAt && (
                        <p className="text-xs text-gray-400 mt-1 font-semibold">
                          Last audited: {formatDate(society.lastVerifiedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Individual scores */}
                  <div className="space-y-4">
                    <ScoreBar label="Legal Integrity Score" score={society.scores.legal} icon={<icons.Shield className="w-4 h-4" />} />
                    <ScoreBar label="Capital Growth Potential" score={society.scores.growth} icon={<icons.TrendingUp className="w-4 h-4" />} />
                    <ScoreBar label="Development Infrastructure" score={society.scores.infrastructure} icon={<icons.Building className="w-4 h-4" />} />
                    <ScoreBar label="Possession Delivery Track" score={society.scores.possession} icon={<icons.CheckCircle className="w-4 h-4" />} />
                    <ScoreBar label="Social Livability Quotient" score={society.scores.livability} icon={<icons.Home className="w-4 h-4" />} />
                  </div>
                </div>
              </div>

              {/* Infrastructure details */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                  <icons.Zap className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-gray-900">Infrastructure Matrix</h2>
                </div>
                <div className="p-6 space-y-4">
                  <ScoreBar label="Electricity Grid Delivery" score={society.infrastructureDetails.electricity} icon={<icons.Zap className="w-4 h-4" />} />
                  <ScoreBar label="Sui Gas Network" score={society.infrastructureDetails.gas} icon={<icons.Flame className="w-4 h-4" />} />
                  <ScoreBar label="Potable Water Supply" score={society.infrastructureDetails.water} icon={<icons.Droplets className="w-4 h-4" />} />
                  <ScoreBar label="Underground Sewerage System" score={society.infrastructureDetails.sewerage} icon={<icons.Navigation className="w-4 h-4" />} />
                  <ScoreBar label="Fiber Broadband / Internet" score={society.infrastructureDetails.internet} icon={<icons.Globe className="w-4 h-4" />} />
                  <ScoreBar label="Paved Carpeted Road Infrastructure" score={society.infrastructureDetails.roads} icon={<icons.Navigation className="w-4 h-4" />} />
                </div>
              </div>

              {/* Livability details */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                  <icons.Home className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-gray-900">Livability Matrix</h2>
                </div>
                <div className="p-6 space-y-4">
                  <ScoreBar label="Accredited Schools &amp; Education" score={society.livabilityDetails.schools} icon={<icons.GraduationCap className="w-4 h-4" />} />
                  <ScoreBar label="Hospitals &amp; Clinical Facilities" score={society.livabilityDetails.hospitals} icon={<icons.HeartPulse className="w-4 h-4" />} />
                  <ScoreBar label="Shopping Plazas &amp; Markets" score={society.livabilityDetails.markets} icon={<icons.ShoppingBag className="w-4 h-4" />} />
                  <ScoreBar label="Public Transit &amp; Road Access" score={society.livabilityDetails.transport} icon={<icons.Bus className="w-4 h-4" />} />
                  <ScoreBar label="Security Personnel &amp; CCTV Guarding" score={society.livabilityDetails.security} icon={<icons.Shield className="w-4 h-4" />} />
                  <ScoreBar label="Public Parks &amp; Green Belts" score={society.livabilityDetails.parks} icon={<icons.Trees className="w-4 h-4" />} />
                </div>
              </div>

              {/* Pricing breakdown */}
              {society.blockRates.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <icons.Banknote className="w-5 h-5 text-[#029bba]" />
                      <h2 className="text-base font-bold text-gray-900">Sector / Block Indicative Pricing</h2>
                    </div>
                    {(society.priceChangeYoY !== undefined || society.rentalYield !== undefined) && (
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        {society.priceChangeYoY !== undefined && (
                          <span className={society.priceChangeYoY >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {society.priceChangeYoY >= 0 ? '+' : ''}{society.priceChangeYoY}% YoY Growth
                          </span>
                        )}
                        {society.rentalYield !== undefined && (
                          <span className="text-[#029bba]">
                            {society.rentalYield}% Rental Yield
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 font-bold uppercase tracking-wider">
                          <th className="text-left px-5 py-3 font-bold">Sector/Block</th>
                          <th className="text-left px-4 py-3 font-bold">Plot Category</th>
                          <th className="text-right px-4 py-3 font-bold">Min Value</th>
                          <th className="text-right px-4 py-3 font-bold">Max Value</th>
                          <th className="text-right px-4 py-3 font-bold">Per Marla Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs">
                        {society.blockRates.map((rate, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3 font-bold text-gray-800">{rate.blockName}</td>
                            <td className="px-4 py-3 text-gray-600 font-semibold">{rate.plotSize}</td>
                            <td className="px-4 py-3 text-right text-gray-700 font-bold">PKR {formatPKR(rate.minPrice)}</td>
                            <td className="px-4 py-3 text-right text-gray-700 font-bold">PKR {formatPKR(rate.maxPrice)}</td>
                            <td className="px-4 py-3 text-right text-[#029bba] font-bold">
                              {rate.pricePerMarla ? `PKR ${formatPKR(rate.pricePerMarla)}` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Resolved Alerts */}
              {resolvedAlerts.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                    <icons.CheckCircle className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-base font-bold text-gray-900">
                      Resolved Compliance Alerts ({resolvedAlerts.length})
                    </h2>
                  </div>
                  <div className="p-6 space-y-3">
                    {resolvedAlerts.map((alert) => (
                      <div key={alert._id} className="p-4 bg-gray-50 rounded-xl border border-gray-150">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-sm font-bold text-gray-800">{alert.title}</p>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 border border-emerald-200 rounded-full uppercase">
                            Resolved
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{alert.message}</p>
                        {alert.resolvedNote && (
                          <p className="text-xs text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1">
                            <icons.Check className="w-3 h-3" />
                            Resolution update: {alert.resolvedNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Official legal documents */}
              {society.documents.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                    <icons.FileText className="w-5 h-5 text-[#029bba]" />
                    <h2 className="text-base font-bold text-gray-900">
                      Official Authority Postings ({society.documents.length})
                    </h2>
                  </div>
                  <div className="p-6 grid sm:grid-cols-2 gap-3">
                    {society.documents.map((doc) => (
                      <a
                        key={doc._id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-[#029bba]/5 hover:border-[#029bba]/30 border border-transparent hover:border-gray-100 transition-all group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 flex items-center justify-center shrink-0 group-hover:bg-[#029bba] transition-colors">
                          <icons.FileText className="w-4 h-4 text-[#029bba] group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate group-hover:text-[#029bba] transition-colors">
                            {doc.title}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            {doc.type.replace('_', ' ')}
                          </p>
                        </div>
                        <icons.ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: Standardized 3-Card Sidebar Stack */}
            <div className="relative min-w-0 w-full max-w-[340px] justify-self-end">
              <div className="space-y-6 w-full">
                <UniversalContactCard
                  entityType="project"
                  entityId={society._id}
                  entityTitle={society.name}
                  actorName="Highrise Society Desk"
                  actorRole="Compliance &amp; Advisory Desk"
                  brandLogo="/images/logo.png"
                  isVerified={society.isVerifiedByHighrise}
                />

                <SafeDealSidebarCard />

                <SafetyWarningCard onReport={() => setShowReportModal(true)} />

                {/* Available Listings Quick Navigation Card */}
                {(relatedCounts.properties > 0 || relatedCounts.projects > 0) && (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center gap-2">
                      <icons.Home className="w-4 h-4 text-[#029bba]" />
                      <h2 className="text-sm font-bold text-gray-700">Available Listings</h2>
                    </div>
                    <div className="p-5 space-y-3">
                      {relatedCounts.properties > 0 && (
                        <Link href={`/properties?society=${encodeURIComponent(society.name)}`}>
                          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl hover:bg-[#029bba]/5 border border-transparent hover:border-gray-100 transition-all cursor-pointer group">
                            <span className="text-xs font-bold text-gray-700 group-hover:text-[#029bba]">
                              Active Properties
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-[#029bba]">
                                {relatedCounts.properties} Listings
                              </span>
                              <icons.ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] transition-colors" />
                            </div>
                          </div>
                        </Link>
                      )}
                      {relatedCounts.projects > 0 && (
                        <Link href={`/projects?area=${encodeURIComponent(society.areaName)}`}>
                          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl hover:bg-[#029bba]/5 border border-transparent hover:border-gray-100 transition-all cursor-pointer group">
                            <span className="text-xs font-bold text-gray-700 group-hover:text-[#029bba]">
                              Underway Projects
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-[#029bba]">
                                {relatedCounts.projects} Projects
                              </span>
                              <icons.ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] transition-colors" />
                            </div>
                          </div>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Similar Societies inside same City */}
          {relatedSocieties.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={typography.sectionTitlePlain}>Similar Societies in {society.city}</h2>
                  <p className={typography.caption}>Explore alternative investment prospects</p>
                </div>
                <Link href={`/societies?city=${encodeURIComponent(society.city)}`}>
                  <span className="text-xs text-[#029bba] font-bold hover:underline">View All Societies</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {relatedSocieties.map((s) => (
                  <RelatedSocietyCard key={s._id} society={s} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global bottom Call-To-Action */}
        <section className="bg-gradient-to-r from-[#004063] to-[#002842] py-14 mt-12">
          <div className="container mx-auto px-4 text-center max-w-2xl space-y-5">
            <h2 className="text-2xl font-black text-white leading-tight">
              Investigating property options in {society.city}?
            </h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-lg mx-auto">
              Inspect verified master-plans, risk reports, and block pricing trends across all societies on Pakistan's smartest real estate index.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/societies"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-[#004063] transition-colors hover:bg-gray-100"
              >
                <icons.Building2 className="w-4 h-4 text-[#029bba]" />
                All Housing Schemes
              </Link>
              <Link
                href="/risk-alerts"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
              >
                <icons.AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                Risk Alert Board
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom Safety Disclaimer Banner */}
        <div className={safety.disclaimer}>
          <div className={safety.disclaimerInner}>
            <icons.Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className={safety.disclaimerText}>
              <strong className="text-amber-800">Legal Notice:</strong>{' '}
              All housing society metrics, litigation records, and NOC statuses are collected from statutory public notices (CDA, LDA, RDA, KDA, etc.). Investors must execute comprehensive legal due diligence before making advance deposits or financial commitments.
            </p>
          </div>
        </div>

      </div>

      <AleemWidget
        context={{
          type: 'society',
          id: society._id,
          slug: society.slug,
          title: society.name,
          city: society.city,
          nocStatus: society.nocStatus,
          overallScore: society.scores.overall,
          overallRiskLevel: society.overallRiskLevel,
          canonicalUrl: canonicalUrl,
        }}
      />

      <ReportListingModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        propertyId={society._id}
        reporterUserId=""
        reporterEmail=""
        reporterPhone=""
      />

      <AuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        context="save"
        actionDescription="save this society"
      />
    </>
  );
}

// ============================================================================
// DATA FETCHING (ISR)
// ============================================================================

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/societies?limit=100&nocStatus=approved&sortBy=overallScore`);

    if (!res.ok) {
      return { paths: [], fallback: 'blocking' };
    }

    const data = await res.json() as {
      success: boolean;
      data?: { societies?: Array<{ slug: string }> };
    };

    const paths = (data.data?.societies ?? []).map((s) => ({
      params: { slug: s.slug },
    }));

    return {
      paths,
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/societies/${slug}`);

    if (!res.ok) {
      if (res.status === 404) return { notFound: true };
      return { notFound: true };
    }

    const data = await res.json() as {
      success: boolean;
      data?: {
        society: SocietyDetail;
        relatedCounts: { properties: number; projects: number };
        relatedSocieties: RelatedSociety[];
      };
    };

    if (!data.success || !data.data) {
      return { notFound: true };
    }

    return {
      props: {
        society: data.data.society,
        relatedCounts: data.data.relatedCounts,
        relatedSocieties: data.data.relatedSocieties,
      },
      revalidate: 60,
    };
  } catch {
    return { notFound: true };
  }
};