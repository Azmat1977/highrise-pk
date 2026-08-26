// pages/societies/[slug].tsx
// Highrise.pk — Society Public Intelligence Report
// ISR: revalidate every 60 seconds
// Full intelligence report: scores, NOC, risk alerts, block rates,
// infrastructure, livability, related societies
// NO framer-motion | NO as any | NO ui/* imports

import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
} from 'next';
import type { ReactElement } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import AleemWidget from '@/components/aleem/AleemWidget';
import {
  MapPin,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  TrendingUp,
  Award,
  FileText,
  ChevronRight,
  Eye,
  BadgeCheck,
  Activity,
  ExternalLink,
  Banknote,
  Home,
  Info,
  Star,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Navigation,
  Trees,
  GraduationCap,
  HeartPulse,
  ShoppingBag,
  Bus,
  Lock,
  CalendarDays,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';

// ─── Types (mirrors API response shape) ──────────────────────────────────────

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
    coordinates: [number, number];   // [lng, lat]
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

// ─── Constants ────────────────────────────────────────────────────────────────

const NOC_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: ReactElement;
}> = {
  approved: {
    label: 'NOC Approved',
    color: 'text-[#10b981]',
    bg: 'bg-[#f0fdf4]',
    border: 'border-[#10b981]',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  pending: {
    label: 'NOC Pending',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fef3c7]',
    border: 'border-[#f59e0b]',
    icon: <Clock className="w-5 h-5" />,
  },
  under_review: {
    label: 'Under Review',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fef3c7]',
    border: 'border-[#f59e0b]',
    icon: <Clock className="w-5 h-5" />,
  },
  illegal: {
    label: 'Declared Illegal',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-[#ef4444]',
    icon: <ShieldX className="w-5 h-5" />,
  },
  disputed: {
    label: 'Disputed',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-[#ef4444]',
    icon: <ShieldAlert className="w-5 h-5" />,
  },
  cancelled: {
    label: 'NOC Cancelled',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-[#ef4444]',
    icon: <XCircle className="w-5 h-5" />,
  },
  expired: {
    label: 'NOC Expired',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fef3c7]',
    border: 'border-[#f59e0b]',
    icon: <AlertTriangle className="w-5 h-5" />,
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
    border: 'border-[#10b981]',
  },
  caution: {
    label: 'Proceed with Caution',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fef3c7]',
    border: 'border-[#f59e0b]',
  },
  high_risk: {
    label: 'High Risk',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-[#ef4444]',
  },
  avoid: {
    label: 'Avoid',
    color: 'text-white',
    bg: 'bg-[#ef4444]',
    border: 'border-[#ef4444]',
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
    border: 'border-[#f59e0b]',
  },
  medium: {
    label: 'Medium',
    color: 'text-[#f97316]',
    bg: 'bg-orange-50',
    border: 'border-orange-400',
  },
  high: {
    label: 'High',
    color: 'text-[#ef4444]',
    bg: 'bg-[#fef2f2]',
    border: 'border-[#ef4444]',
  },
  critical: {
    label: 'Critical',
    color: 'text-white',
    bg: 'bg-[#ef4444]',
    border: 'border-[#ef4444]',
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
  none: { label: 'No Litigation', color: 'text-[#10b981]' },
  minor: { label: 'Minor Dispute', color: 'text-[#f59e0b]' },
  major: { label: 'Major Litigation', color: 'text-[#ef4444]' },
  court_ordered_stop: { label: 'Court-Ordered Stop', color: 'text-[#ef4444]' },
  resolved: { label: 'Resolved', color: 'text-[#10b981]' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)} L`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ScoreBarProps {
  label: string;
  score: number;
  icon?: ReactElement;
}

function ScoreBar({ label, score, icon }: ScoreBarProps): ReactElement {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-500">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          <span className={`text-xs font-bold ${getScoreColor(score)}`}>{score}/100</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreBg(score)} rounded-full transition-all duration-700`}
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

function RelatedSocietyCard({ society }: RelatedSocietyCardProps): ReactElement {
  const risk = RISK_CONFIG[society.overallRiskLevel] ?? RISK_CONFIG.caution;
  return (
    <Link href={`/societies/${society.slug}`}>
      <div className="group flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-[#029bba]/5 hover:border-[#029bba]/20 border border-transparent transition-all cursor-pointer">
        <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0 relative">
          {society.featuredImage ? (
            <Image
              src={society.featuredImage}
              alt={society.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 group-hover:text-[#029bba] transition-colors truncate">
            {society.name}
          </p>
          <p className="text-xs text-gray-500 truncate">{society.areaName}, {society.city}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={`text-lg font-extrabold ${getScoreColor(society.overallScore)}`}>
            {society.overallScore}
          </div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wide">/100</div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SocietyDetailPage({
  society,
  relatedCounts,
  relatedSocieties,
}: InferGetStaticPropsType<typeof getStaticProps>): ReactElement {
  const router = useRouter();

  // ISR fallback — show skeleton while page generates
  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading society report...</p>
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

  const canonicalUrl = `https://highrise.pk/societies/${society.slug}`;
  const pageTitle = society.seoTitle || `${society.name} — NOC Status, Scores & Intelligence Report | Highrise.pk`;
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

      <div className="min-h-screen bg-gray-50">

        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] pt-10 pb-0 overflow-hidden">
          {/* BG decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#029bba]/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-white/40 mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/societies" className="hover:text-white/70 transition-colors">Societies</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/70 truncate max-w-[200px]">{society.name}</span>
            </nav>

            {/* Back button */}
            <Link
              href="/societies"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Societies
            </Link>

            <div className="max-w-4xl">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {society.isVerifiedByHighrise && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#029bba] text-white text-xs font-bold">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Highrise Verified
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                  {categoryLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                  {society.approvalAuthority}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
                {society.name}
              </h1>

              {/* Location + meta */}
              <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm mb-6">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {society.areaName}, {society.city}
                </span>
                {society.launchYear && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 flex-shrink-0" />
                    Est. {society.launchYear}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 flex-shrink-0" />
                  {society.viewCount.toLocaleString()} views
                </span>
              </div>

              {/* NOC + Risk status row */}
              <div className="flex flex-wrap items-center gap-3 mb-8">
                {/* NOC badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${noc.bg} ${noc.border} ${noc.color} text-sm font-bold`}>
                  {noc.icon}
                  {noc.label}
                </div>

                {/* Risk badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${risk.bg} ${risk.border} ${risk.color} text-sm font-bold`}>
                  <Shield className="w-4 h-4" />
                  {risk.label}
                </div>

                {/* Active alerts warning */}
                {activeAlerts.length > 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ef4444] text-sm font-bold animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                    {activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Hero image strip */}
            {society.featuredImage && (
              <div className="relative h-64 md:h-80 rounded-t-3xl overflow-hidden mt-4">
                <Image
                  src={society.featuredImage}
                  alt={society.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 1200px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001f2b]/60 to-transparent" />

                {/* Overall score overlay */}
                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-xl">
                  <div className={`text-4xl font-extrabold ${getScoreColor(society.scores.overall)}`}>
                    {society.scores.overall}
                  </div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">/100 Overall</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Main content ── */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* ── Left column (main) ── */}
            <div className="lg:col-span-2 space-y-8">

              {/* ── Active Risk Alerts ── */}
              {activeAlerts.length > 0 && (
                <div className="bg-[#fef2f2] border border-[#ef4444]/30 rounded-2xl overflow-hidden">
                  <div className="bg-[#ef4444] px-6 py-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-white" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                      Active Risk Alerts ({activeAlerts.length})
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
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <p className={`text-sm font-bold ${sev.color}`}>{alert.title}</p>
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.border} ${sev.color} ${sev.bg}`}>
                              {sev.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            {alert.issuedBy && <span>Issued by: <strong>{alert.issuedBy}</strong></span>}
                            {alert.referenceNo && <span>Ref: <strong>{alert.referenceNo}</strong></span>}
                            <span>{formatDate(alert.date)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Description ── */}
              {society.description && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-[#029bba]" />
                    About {society.name}
                  </h2>
                  <p className="text-gray-600 leading-relaxed text-sm">{society.description}</p>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
                    {society.totalPlots && (
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-800">{society.totalPlots.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Total Plots</p>
                      </div>
                    )}
                    {society.totalPhases && (
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-800">{society.totalPhases}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Phases</p>
                      </div>
                    )}
                    {society.possessionPercentage !== undefined && (
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-800">{society.possessionPercentage}%</p>
                        <p className="text-xs text-gray-400 mt-0.5">Possession</p>
                      </div>
                    )}
                    {society.expectedCompletionYear && (
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-800">{society.expectedCompletionYear}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Expected Completion</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Intelligence Scores ── */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-gray-900">Intelligence Scores</h2>
                </div>
                <div className="p-6">
                  {/* Overall score hero */}
                  <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-100">
                    <div className="relative w-20 h-20 flex-shrink-0">
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
                      <p className="text-sm text-gray-500 mb-1">Overall Score</p>
                      <p className={`text-xl font-bold ${risk.color}`}>{risk.label}</p>
                      {society.lastVerifiedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last verified: {formatDate(society.lastVerifiedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Individual scores */}
                  <div className="space-y-4">
                    <ScoreBar label="Legal Score" score={society.scores.legal} icon={<Shield className="w-4 h-4" />} />
                    <ScoreBar label="Growth Score" score={society.scores.growth} icon={<TrendingUp className="w-4 h-4" />} />
                    <ScoreBar label="Infrastructure Score" score={society.scores.infrastructure} icon={<Building2 className="w-4 h-4" />} />
                    <ScoreBar label="Possession Score" score={society.scores.possession} icon={<CheckCircle className="w-4 h-4" />} />
                    <ScoreBar label="Livability Score" score={society.scores.livability} icon={<Home className="w-4 h-4" />} />
                  </div>
                </div>
              </div>

              {/* ── Infrastructure Details ── */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-gray-900">Infrastructure Breakdown</h2>
                </div>
                <div className="p-6 space-y-4">
                  <ScoreBar label="Electricity" score={society.infrastructureDetails.electricity} icon={<Zap className="w-4 h-4" />} />
                  <ScoreBar label="Gas" score={society.infrastructureDetails.gas} icon={<Flame className="w-4 h-4" />} />
                  <ScoreBar label="Water Supply" score={society.infrastructureDetails.water} icon={<Droplets className="w-4 h-4" />} />
                  <ScoreBar label="Sewerage" score={society.infrastructureDetails.sewerage} icon={<Navigation className="w-4 h-4" />} />
                  <ScoreBar label="Internet / Fibre" score={society.infrastructureDetails.internet} icon={<Wifi className="w-4 h-4" />} />
                  <ScoreBar label="Roads" score={society.infrastructureDetails.roads} icon={<Navigation className="w-4 h-4" />} />
                </div>
              </div>

              {/* ── Livability Details ── */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                  <Home className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-base font-bold text-gray-900">Livability Breakdown</h2>
                </div>
                <div className="p-6 space-y-4">
                  <ScoreBar label="Schools & Education" score={society.livabilityDetails.schools} icon={<GraduationCap className="w-4 h-4" />} />
                  <ScoreBar label="Hospitals & Healthcare" score={society.livabilityDetails.hospitals} icon={<HeartPulse className="w-4 h-4" />} />
                  <ScoreBar label="Markets & Shopping" score={society.livabilityDetails.markets} icon={<ShoppingBag className="w-4 h-4" />} />
                  <ScoreBar label="Transport Access" score={society.livabilityDetails.transport} icon={<Bus className="w-4 h-4" />} />
                  <ScoreBar label="Security" score={society.livabilityDetails.security} icon={<Shield className="w-4 h-4" />} />
                  <ScoreBar label="Parks & Recreation" score={society.livabilityDetails.parks} icon={<Trees className="w-4 h-4" />} />
                </div>
              </div>

              {/* ── Block / Phase Pricing ── */}
              {society.blockRates.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-[#029bba]" />
                      <h2 className="text-base font-bold text-gray-900">Block-wise Pricing</h2>
                    </div>
                    {(society.priceChangeYoY !== undefined || society.rentalYield !== undefined) && (
                      <div className="flex items-center gap-4 text-xs">
                        {society.priceChangeYoY !== undefined && (
                          <span className={`font-semibold ${society.priceChangeYoY >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {society.priceChangeYoY >= 0 ? '+' : ''}{society.priceChangeYoY}% YoY
                          </span>
                        )}
                        {society.rentalYield !== undefined && (
                          <span className="font-semibold text-[#029bba]">
                            {society.rentalYield}% Yield
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Block</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plot Size</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Price</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Price</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Per Marla</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {society.blockRates.map((rate, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3 font-semibold text-gray-800">{rate.blockName}</td>
                            <td className="px-4 py-3 text-gray-600">{rate.plotSize}</td>
                            <td className="px-4 py-3 text-right text-gray-700">PKR {formatPKR(rate.minPrice)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">PKR {formatPKR(rate.maxPrice)}</td>
                            <td className="px-4 py-3 text-right text-[#029bba] font-semibold">
                              {rate.pricePerMarla ? `PKR ${formatPKR(rate.pricePerMarla)}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400">
                      Prices are indicative market rates. Verify directly before any transaction.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Resolved Alerts (collapsed) ── */}
              {resolvedAlerts.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#10b981]" />
                    <h2 className="text-base font-bold text-gray-900">
                      Resolved Alerts ({resolvedAlerts.length})
                    </h2>
                  </div>
                  <div className="p-6 space-y-3">
                    {resolvedAlerts.map((alert) => (
                      <div key={alert._id} className="p-3 bg-gray-50 rounded-xl opacity-70">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-700">{alert.title}</p>
                          <span className="text-[10px] font-semibold text-[#10b981] bg-green-50 px-2 py-0.5 rounded-full">
                            Resolved
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{alert.message}</p>
                        {alert.resolvedNote && (
                          <p className="text-xs text-[#10b981] mt-1">✓ {alert.resolvedNote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Documents ── */}
              {society.documents.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#029bba]" />
                    <h2 className="text-base font-bold text-gray-900">
                      Official Documents ({society.documents.length})
                    </h2>
                  </div>
                  <div className="p-6 grid sm:grid-cols-2 gap-3">
                    {society.documents.map((doc) => (
                      <a
                        key={doc._id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-[#029bba]/5 hover:border-[#029bba]/20 border border-transparent transition-all group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#029bba] transition-colors">
                          <FileText className="w-4 h-4 text-[#029bba] group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#029bba] transition-colors">
                            {doc.title}
                          </p>
                          <p className="text-[10px] text-gray-400 capitalize">
                            {doc.type.replace('_', ' ')}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] flex-shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ── Right column (sidebar) ── */}
            <div className="space-y-6">

              {/* ── Legal Summary Card ── */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#029bba]" />
                  <h2 className="text-sm font-bold text-gray-700">Legal Status</h2>
                </div>
                <div className="p-5 space-y-4">
                  {/* NOC */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">NOC Status</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${noc.bg} ${noc.border} ${noc.color} text-xs font-bold`}>
                      {noc.icon}
                      {noc.label}
                    </div>
                  </div>

                  {/* NOC details */}
                  {society.nocNumber && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">NOC Number</p>
                      <p className="text-sm font-mono font-semibold text-gray-800">{society.nocNumber}</p>
                    </div>
                  )}
                  {society.nocDate && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">NOC Date</p>
                      <p className="text-sm font-semibold text-gray-800">{formatDate(society.nocDate)}</p>
                    </div>
                  )}
                  {society.nocExpiryDate && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">NOC Expiry</p>
                      <p className={`text-sm font-semibold ${society.isNOCValid ? 'text-gray-800' : 'text-[#ef4444]'}`}>
                        {formatDate(society.nocExpiryDate)}
                        {!society.isNOCValid && ' ⚠️ Expired'}
                      </p>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Authority</span>
                      <span className="text-xs font-semibold text-[#029bba]">{society.approvalAuthority}</span>
                    </div>
                    {society.developmentAuthority && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Dev. Authority</span>
                        <span className="text-xs font-semibold text-gray-700">{society.developmentAuthority}</span>
                      </div>
                    )}
                    {society.registrationNo && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Reg. No.</span>
                        <span className="text-xs font-mono font-semibold text-gray-700">{society.registrationNo}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Litigation</span>
                      <span className={`text-xs font-semibold ${litigation.color}`}>{litigation.label}</span>
                    </div>
                  </div>

                  {society.litigationNote && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-800">{society.litigationNote}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Developer Info ── */}
              {society.developerName && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#029bba]" />
                    <h2 className="text-sm font-bold text-gray-700">Developer</h2>
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-semibold text-gray-800 mb-2">{society.developerName}</p>
                    {society.developerWebsite && (
                      <a
                        href={society.developerWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#029bba] hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* ── Related listings count ── */}
              {(relatedCounts.properties > 0 || relatedCounts.projects > 0) && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center gap-2">
                    <Home className="w-4 h-4 text-[#029bba]" />
                    <h2 className="text-sm font-bold text-gray-700">Available Listings</h2>
                  </div>
                  <div className="p-5 space-y-3">
                    {relatedCounts.properties > 0 && (
                      <Link href={`/properties?society=${encodeURIComponent(society.name)}`}>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-[#029bba]/5 transition-colors cursor-pointer group">
                          <span className="text-sm font-medium text-gray-700 group-hover:text-[#029bba]">
                            Properties
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#029bba]">
                              {relatedCounts.properties}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba]" />
                          </div>
                        </div>
                      </Link>
                    )}
                    {relatedCounts.projects > 0 && (
                      <Link href={`/projects?area=${encodeURIComponent(society.areaName)}`}>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-[#029bba]/5 transition-colors cursor-pointer group">
                          <span className="text-sm font-medium text-gray-700 group-hover:text-[#029bba]">
                            Projects
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#029bba]">
                              {relatedCounts.projects}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba]" />
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* ── Contact CTA ── */}
              <div className="bg-gradient-to-br from-[#029bba] to-[#004063] rounded-2xl p-6 text-white">
                <MessageCircle className="w-8 h-8 text-white/80 mb-3" />
                <h3 className="font-bold text-lg mb-2">Interested in {society.name}?</h3>
                <p className="text-white/80 text-sm mb-4">
                  Our property experts can help you find the right plot or property in this society.
                </p>
                <Link href="/contact">
                  <button className="w-full py-2.5 rounded-xl bg-white text-[#004063] font-bold text-sm hover:bg-gray-100 transition-colors">
                    Contact Our Team
                  </button>
                </Link>
                <p className="text-center text-white/50 text-[10px] mt-3 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  No spam · Free consultation
                </p>
              </div>

              {/* ── Disclaimer ── */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Always verify independently.</strong> Data is aggregated from public sources and may not reflect the latest developments. Consult {society.approvalAuthority} directly before any investment decision.
                  </p>
                </div>
              </div>

              {/* ── Related Societies ── */}
              {relatedSocieties.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#029bba]" />
                      <h2 className="text-sm font-bold text-gray-700">Similar in {society.city}</h2>
                    </div>
                    <Link href={`/societies?city=${encodeURIComponent(society.city)}`}>
                      <span className="text-xs text-[#029bba] font-medium hover:underline">See all</span>
                    </Link>
                  </div>
                  <div className="p-4 space-y-2">
                    {relatedSocieties.map((s) => (
                      <RelatedSocietyCard key={s._id} society={s} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <section className="bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] py-14">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Want to invest in <span className="text-[#06b6d4]">{society.city}</span>?
            </h2>
            <p className="text-white/70 mb-6 max-w-xl mx-auto text-sm">
              Browse all verified societies, check risk alerts, and compare prices before making any decision.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/societies">
                <button className="px-5 py-2.5 rounded-xl bg-white text-[#004063] font-bold text-sm hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  All Societies
                </button>
              </Link>
              <Link href="/risk-alerts">
                <button className="px-5 py-2.5 rounded-xl bg-white/15 border-2 border-white/30 text-white font-bold text-sm hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Alert Board
                </button>
              </Link>
              <Link href="/tools/price-estimator">
                <button className="px-5 py-2.5 rounded-xl bg-white/15 border-2 border-white/30 text-white font-bold text-sm hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Fair Price Check
                </button>
              </Link>
            </div>
          </div>
        </section>

      </div>
      {/* Aria AI — society context */}
      <AleemWidget
        context={{
          type:             'society',
          id:               society._id,
          slug:             society.slug,
          title:            society.name,
          city:             society.city,
          nocStatus:        society.nocStatus,
          overallScore:     society.scores.overall,
          overallRiskLevel: society.overallRiskLevel,
          canonicalUrl:     canonicalUrl,
        }}
      />
    </>
  );
}

// ─── ISR: getStaticPaths ──────────────────────────────────────────────────────

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    // Only pre-render verified + published societies at build time
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
      fallback: 'blocking', // Other slugs generate on first request
    };
  } catch {
    return { paths: [], fallback: 'blocking' };
  }
};

// ─── ISR: getStaticProps ──────────────────────────────────────────────────────

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  if (!slug) {
    return { notFound: true };
  }

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
      revalidate: 60, // ISR: regenerate every 60 seconds
    };
  } catch {
    return { notFound: true };
  }
};