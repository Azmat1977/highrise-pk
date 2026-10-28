// pages/tools/verify-society/[slug].tsx
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import type { GetServerSideProps } from 'next';
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  CheckCircle, XCircle, Clock, Building2, MapPin, Calendar,
  TrendingUp, FileText, Download, ExternalLink, Award,
  BadgeCheck, Eye, Search, Activity, Banknote, Info,
  ChevronRight, ArrowRight, Home, Zap, Droplet, Wifi,
  Flame, Construction, School, Hospital, ShoppingBag,
  Bus, Lock, Trees, Building, AlertCircle, Globe,
  ChevronLeft,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  coordinates?: { type: 'Point'; coordinates: [number, number] };
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
  searchCount: number;
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
  society: SocietyDetail | null;
  relatedCounts: { properties: number; projects: number };
  relatedSocieties: RelatedSociety[];
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOC_CONFIG: Record<
  string,
  { label: string; description: string; bg: string; text: string; icon: React.ReactElement }
> = {
  approved: {
    label: 'NOC Approved',
    description: 'This society has a valid No Objection Certificate from the relevant authority.',
    bg: 'bg-[#10b981]',
    text: 'text-white',
    icon: <ShieldCheck className="w-7 h-7" />,
  },
  pending: {
    label: 'NOC Pending',
    description: 'NOC application is under process. Exercise caution before investing.',
    bg: 'bg-[#f59e0b]',
    text: 'text-white',
    icon: <Clock className="w-7 h-7" />,
  },
  under_review: {
    label: 'Under Review',
    description: 'Authority is currently reviewing this society. Status may change.',
    bg: 'bg-[#f59e0b]',
    text: 'text-white',
    icon: <Clock className="w-7 h-7" />,
  },
  illegal: {
    label: 'Declared Illegal',
    description: 'This society has been declared illegal. AVOID all transactions.',
    bg: 'bg-[#ef4444]',
    text: 'text-white',
    icon: <ShieldX className="w-7 h-7" />,
  },
  disputed: {
    label: 'Under Dispute',
    description: 'This society is under litigation or legal dispute.',
    bg: 'bg-[#ef4444]',
    text: 'text-white',
    icon: <ShieldAlert className="w-7 h-7" />,
  },
  cancelled: {
    label: 'NOC Cancelled',
    description: 'NOC has been cancelled by the authority. Do not invest.',
    bg: 'bg-[#ef4444]',
    text: 'text-white',
    icon: <XCircle className="w-7 h-7" />,
  },
  expired: {
    label: 'NOC Expired',
    description: 'NOC validity period has expired. Pending renewal.',
    bg: 'bg-[#f59e0b]',
    text: 'text-white',
    icon: <AlertTriangle className="w-7 h-7" />,
  },
};

const RISK_CONFIG: Record<string, { label: string; bg: string; text: string; description: string }> = {
  safe: {
    label: 'Safe to Invest',
    bg: 'bg-[#f0fdf4]',
    text: 'text-[#10b981]',
    description: 'Strong legal status and overall profile.',
  },
  caution: {
    label: 'Proceed with Caution',
    bg: 'bg-[#fef3c7]',
    text: 'text-[#92400e]',
    description: 'Some concerns exist. Consult legal advisor.',
  },
  high_risk: {
    label: 'High Risk',
    bg: 'bg-[#fef2f2]',
    text: 'text-[#ef4444]',
    description: 'Multiple risk factors. Strong caution advised.',
  },
  avoid: {
    label: 'Avoid Investment',
    bg: 'bg-[#ef4444]',
    text: 'text-white',
    description: 'Serious legal/structural issues. Do not invest.',
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

const DOC_TYPE_LABELS: Record<string, string> = {
  noc: 'NOC Certificate',
  map: 'Society Map',
  master_plan: 'Master Plan',
  court_order: 'Court Order',
  approval_letter: 'Approval Letter',
  other: 'Document',
};

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

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Average';
  if (score >= 30) return 'Below Average';
  return 'Poor';
}

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs ${(amount / 100_000).toFixed(2)} Lac`;
  return `Rs ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

// ─── Server-side data fetching ────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps<PageProps> = async (context) => {
  const slug = context.params?.slug;

  if (!slug || typeof slug !== 'string') {
    return { notFound: true };
  }

  const protocol = context.req.headers['x-forwarded-proto'] || 'http';
  const host = context.req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    const res = await fetch(`${baseUrl}/api/societies/${slug}`, {
      headers: { 'x-forwarded-for': (context.req.socket.remoteAddress as string) || '' },
    });

    if (res.status === 404) {
      return { notFound: true };
    }

    if (!res.ok) {
      return {
        props: {
          society: null,
          relatedCounts: { properties: 0, projects: 0 },
          relatedSocieties: [],
          error: 'Failed to load society details',
        },
      };
    }

    const data = await res.json();

    if (!data.success || !data.data?.society) {
      return { notFound: true };
    }

    return {
      props: {
        society: data.data.society,
        relatedCounts: data.data.relatedCounts || { properties: 0, projects: 0 },
        relatedSocieties: data.data.relatedSocieties || [],
      },
    };
  } catch {
    return {
      props: {
        society: null,
        relatedCounts: { properties: 0, projects: 0 },
        relatedSocieties: [],
        error: 'Network error loading society',
      },
    };
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SocietyDetailPage({
  society,
  relatedCounts,
  relatedSocieties,
  error,
}: PageProps): React.ReactElement {
  // Error state
  if (error || !society) {
    return (
      <>
        <Head>
          <title>Society Not Found | Highrise.pk</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-md p-8 max-w-md text-center">
            <XCircle className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {error || 'Society Not Found'}
            </h1>
            <p className="text-gray-600 mb-6">The society you&apos;re looking for is not available.</p>
            <Link href="/tools/verify-society">
              <button className="px-6 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back to Verifier
              </button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const noc = NOC_CONFIG[society.nocStatus] || NOC_CONFIG.pending;
  const risk = RISK_CONFIG[society.overallRiskLevel] || RISK_CONFIG.caution;
  const category = CATEGORY_LABELS[society.category] || society.category;

  const activeAlerts = society.riskAlerts.filter((a) => !a.isResolved);
  const resolvedAlerts = society.riskAlerts.filter((a) => a.isResolved);

  const seoTitle =
    society.seoTitle ||
    `${society.name} – NOC Status, Reviews & Investment Score | Highrise.pk`;
  const seoDescription =
    society.seoDescription ||
    `Check NOC status, legal score, risk alerts and pricing for ${society.name} in ${society.city}. Verified intelligence by Highrise.pk.`;

  return (
    <>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={`${society.name} NOC, ${society.name} ${society.city}, ${society.approvalAuthority} approved, ${society.areaName} society`} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={`https://highrise.pk/tools/verify-society/${society.slug}`} />
        {society.featuredImage && <meta property="og:image" content={society.featuredImage} />}
        <link rel="canonical" href={`https://highrise.pk/tools/verify-society/${society.slug}`} />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Place',
              name: society.name,
              description: society.description || seoDescription,
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
              ...(society.featuredImage && { image: society.featuredImage }),
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: (society.scores.overall / 20).toFixed(1),
                bestRating: 5,
                worstRating: 1,
                ratingCount: society.viewCount || 1,
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── BREADCRUMB ── */}
        <nav aria-label="Breadcrumb" className="bg-white border-b border-gray-200">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-3">
            <ol className="flex items-center gap-2 text-sm text-gray-600 overflow-x-auto">
              <li><Link href="/" className="hover:text-[#029bba] transition-colors">Home</Link></li>
              <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <li><Link href="/tools/verify-society" className="hover:text-[#029bba] transition-colors whitespace-nowrap">Verify Society</Link></li>
              <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <li className="text-gray-900 font-medium truncate">{society.name}</li>
            </ol>
          </div>
        </nav>

        {/* ── COMPACT PAGE HEADER ── */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5">
          <div className="grid lg:grid-cols-3 gap-4 items-start">

            {/* LEFT: Title + Meta */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {society.isVerifiedByHighrise && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#029bba] text-white text-[11px] font-bold">
                    <BadgeCheck className="w-3 h-3" />
                    Highrise Verified
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-semibold border border-gray-200">
                  {category}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-bold border border-gray-200">
                  <Award className="w-3 h-3 text-gray-500" />
                  {society.approvalAuthority}
                </span>
              </div>

              <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
                {society.name}
              </h1>

              <p className="text-xs text-gray-600 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
                  {society.areaName}, {society.city}
                </span>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                  {society.viewCount.toLocaleString()} views
                </span>
                {society.launchYear && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Launched {society.launchYear}
                    </span>
                  </>
                )}
                {society.lastVerifiedAt && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
                      Verified {formatDate(society.lastVerifiedAt)}
                    </span>
                  </>
                )}
              </p>

              {society.alternateNames && society.alternateNames.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Also known as: {society.alternateNames.join(', ')}
                </p>
              )}
            </div>

            {/* RIGHT: Overall Score Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="text-center mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Overall Score
                </div>
                <div className={`text-5xl font-extrabold ${getScoreColor(society.scores.overall)}`}>
                  {society.scores.overall}
                  <span className="text-2xl text-gray-400">/100</span>
                </div>
                <div className="text-sm font-semibold text-gray-700 mt-1">
                  {getScoreLabel(society.scores.overall)}
                </div>
              </div>

              <div className={`rounded-xl p-3 text-center ${risk.bg}`}>
                <div className={`text-sm font-bold ${risk.text}`}>{risk.label}</div>
                <div className={`text-xs mt-1 ${risk.text} opacity-80`}>{risk.description}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MASSIVE NOC STATUS BANNER ── */}
        <section className={`${noc.bg} ${noc.text}`}>
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                {noc.icon}
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="text-xl md:text-2xl font-bold mb-1">{noc.label}</div>
                <div className="text-sm opacity-90">{noc.description}</div>
                {society.nocNumber && (
                  <div className="mt-2 text-xs opacity-80">
                    NOC #: <strong>{society.nocNumber}</strong>
                    {society.nocDate && <> · Issued: {formatDate(society.nocDate)}</>}
                    {society.nocExpiryDate && <> · Expires: {formatDate(society.nocExpiryDate)}</>}
                  </div>
                )}
              </div>
              {society.isNOCValid && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 text-xs font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Currently Valid
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── ACTIVE RISK ALERTS ── */}
        {activeAlerts.length > 0 && (
          <section className="bg-[#fef2f2] border-y-2 border-[#ef4444]/30">
            <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#ef4444] flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-700">
                    {activeAlerts.length} Active Risk Alert{activeAlerts.length > 1 ? 's' : ''}
                  </h2>
                  <p className="text-sm text-red-600">Important warnings from authorities</p>
                </div>
              </div>

              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="bg-white rounded-xl p-4 border-l-4 border-[#ef4444] shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          alert.severity === 'critical' ? 'bg-[#ef4444] text-white' :
                          alert.severity === 'high' ? 'bg-[#ef4444]/15 text-[#ef4444]' :
                          alert.severity === 'medium' ? 'bg-[#f59e0b]/15 text-[#f59e0b]' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="font-bold text-gray-900">{alert.title}</span>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(alert.date)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{alert.message}</p>
                    {(alert.issuedBy || alert.referenceNo) && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                        {alert.issuedBy && <span>Issued by: <strong>{alert.issuedBy}</strong></span>}
                        {alert.issuedBy && alert.referenceNo && <span> · </span>}
                        {alert.referenceNo && <span>Ref: <strong>{alert.referenceNo}</strong></span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── MAIN CONTENT GRID ── */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-10">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* ─── LEFT: Main Content (2 cols) ─── */}
            <div className="lg:col-span-2 space-y-8">

              {/* Image Gallery */}
              {(society.featuredImage || society.images.length > 0) && (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  {society.featuredImage && (
                    <div className="relative aspect-video bg-gray-100">
                      <Image
                        src={society.featuredImage}
                        alt={society.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 66vw"
                        priority
                      />
                    </div>
                  )}
                  {society.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-1 p-1">
                      {society.images.slice(0, 6).map((img, i) => (
                        <div key={i} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                          <Image
                            src={img}
                            alt={`${society.name} - Image ${i + 1}`}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {society.description && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-[#029bba]" />
                    About {society.name}
                  </h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {society.description}
                  </p>
                </div>
              )}

              {/* Score Breakdown */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#029bba]" />
                  Intelligence Score Breakdown
                </h2>
                <p className="text-sm text-gray-500 mb-6">Composite analysis across 5 key dimensions</p>

                <div className="space-y-4">
                  <ScoreBar label="Legal Score" description="NOC status + litigation" score={society.scores.legal} />
                  <ScoreBar label="Growth Score" description="Investment potential" score={society.scores.growth} />
                  <ScoreBar label="Possession Score" description="On-ground development" score={society.scores.possession} />
                  <ScoreBar label="Infrastructure" description="Utilities & roads" score={society.scores.infrastructure} />
                  <ScoreBar label="Livability" description="Schools, hospitals, security" score={society.scores.livability} />
                </div>
              </div>

              {/* Infrastructure Details */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#029bba]" />
                  Infrastructure Details
                </h2>
                <p className="text-sm text-gray-500 mb-6">Utility availability and quality</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfraItem icon={<Zap />} label="Electricity" score={society.infrastructureDetails.electricity} />
                  <InfraItem icon={<Flame />} label="Gas" score={society.infrastructureDetails.gas} />
                  <InfraItem icon={<Droplet />} label="Water" score={society.infrastructureDetails.water} />
                  <InfraItem icon={<Droplet />} label="Sewerage" score={society.infrastructureDetails.sewerage} />
                  <InfraItem icon={<Wifi />} label="Internet" score={society.infrastructureDetails.internet} />
                  <InfraItem icon={<Construction />} label="Roads" score={society.infrastructureDetails.roads} />
                </div>
              </div>

              {/* Livability Details */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Home className="w-5 h-5 text-[#029bba]" />
                  Livability Details
                </h2>
                <p className="text-sm text-gray-500 mb-6">Family suitability and amenities</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfraItem icon={<School />} label="Schools" score={society.livabilityDetails.schools} />
                  <InfraItem icon={<Hospital />} label="Hospitals" score={society.livabilityDetails.hospitals} />
                  <InfraItem icon={<ShoppingBag />} label="Markets" score={society.livabilityDetails.markets} />
                  <InfraItem icon={<Bus />} label="Transport" score={society.livabilityDetails.transport} />
                  <InfraItem icon={<Lock />} label="Security" score={society.livabilityDetails.security} />
                  <InfraItem icon={<Trees />} label="Parks" score={society.livabilityDetails.parks} />
                </div>
              </div>

              {/* Block-wise Pricing */}
              {society.blockRates && society.blockRates.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-[#029bba]" />
                    Block-wise Pricing
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">Latest market rates by block</p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 font-semibold text-gray-700">Block</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-700">Plot Size</th>
                          <th className="text-right py-3 px-2 font-semibold text-gray-700">Min Price</th>
                          <th className="text-right py-3 px-2 font-semibold text-gray-700">Max Price</th>
                          <th className="text-right py-3 px-2 font-semibold text-gray-700">Per Marla</th>
                        </tr>
                      </thead>
                      <tbody>
                        {society.blockRates.map((b, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-2 font-bold text-gray-900">{b.blockName}</td>
                            <td className="py-3 px-2 text-gray-700">{b.plotSize}</td>
                            <td className="py-3 px-2 text-right text-gray-700">{formatPKR(b.minPrice)}</td>
                            <td className="py-3 px-2 text-right text-gray-700">{formatPKR(b.maxPrice)}</td>
                            <td className="py-3 px-2 text-right font-semibold text-[#029bba]">
                              {b.pricePerMarla ? formatPKR(b.pricePerMarla) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(society.priceChangeYoY !== undefined || society.rentalYield !== undefined) && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
                      {society.priceChangeYoY !== undefined && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className={`w-4 h-4 ${society.priceChangeYoY >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`} />
                          <span className="text-gray-600">YoY Change:</span>
                          <span className={`font-bold ${society.priceChangeYoY >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {society.priceChangeYoY >= 0 ? '+' : ''}{society.priceChangeYoY}%
                          </span>
                        </div>
                      )}
                      {society.rentalYield !== undefined && (
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-[#029bba]" />
                          <span className="text-gray-600">Rental Yield:</span>
                          <span className="font-bold text-[#029bba]">{society.rentalYield}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Documents */}
              {society.documents && society.documents.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#029bba]" />
                    Verified Documents
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">Official documents on file</p>

                  <div className="space-y-2">
                    {society.documents.map((doc) => (
                      <a
                        key={doc._id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#029bba]/5 hover:border-[#029bba]/30 border border-transparent transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 group-hover:text-[#029bba] transition-colors truncate">
                            {doc.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {DOC_TYPE_LABELS[doc.type] || doc.type} · Uploaded {formatDate(doc.uploadedAt)}
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-gray-400 group-hover:text-[#029bba] transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved Alerts (collapsed) */}
              {resolvedAlerts.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#10b981]" />
                    Resolved Alerts ({resolvedAlerts.length})
                  </h2>
                  <div className="space-y-2">
                    {resolvedAlerts.map((alert) => (
                      <div
                        key={alert._id}
                        className="bg-gray-50 rounded-lg p-3 border-l-4 border-[#10b981]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-700 text-sm">{alert.title}</span>
                          <span className="text-xs text-gray-500">Resolved {formatDate(alert.resolvedAt)}</span>
                        </div>
                        <p className="text-xs text-gray-600">{alert.message}</p>
                        {alert.resolvedNote && (
                          <p className="text-xs text-[#10b981] mt-1 italic">Note: {alert.resolvedNote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ─── RIGHT: Sidebar ─── */}
            <div className="space-y-6">

              {/* Quick Info Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-4">
                <h3 className="font-bold text-gray-900 mb-4">Quick Information</h3>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Category" value={category} />
                  <InfoRow label="Authority" value={society.approvalAuthority} highlight />
                  {society.developmentAuthority && (
                    <InfoRow label="Dev Authority" value={society.developmentAuthority} />
                  )}
                  {society.registrationNo && (
                    <InfoRow label="Registration #" value={society.registrationNo} />
                  )}
                  {society.developerName && (
                    <InfoRow label="Developer" value={society.developerName} />
                  )}
                  {society.totalPlots && (
                    <InfoRow label="Total Plots" value={society.totalPlots.toLocaleString()} />
                  )}
                  {society.totalPhases && (
                    <InfoRow label="Phases" value={String(society.totalPhases)} />
                  )}
                  {society.launchYear && (
                    <InfoRow label="Launch Year" value={String(society.launchYear)} />
                  )}
                  {society.expectedCompletionYear && (
                    <InfoRow label="Expected Completion" value={String(society.expectedCompletionYear)} />
                  )}
                  {society.possessionPercentage !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Development Progress</span>
                        <span className="font-bold text-[#029bba]">{society.possessionPercentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#029bba] to-[#10b981] transition-all"
                          style={{ width: `${society.possessionPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {society.developerWebsite && (
                    <a
                      href={society.developerWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#029bba] text-sm font-semibold hover:underline pt-2"
                    >
                      <Globe className="w-4 h-4" />
                      Developer Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Related counts */}
                {(relatedCounts.properties > 0 || relatedCounts.projects > 0) && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                      Available on Highrise
                    </div>
                    <div className="space-y-2">
                      {relatedCounts.properties > 0 && (
                        <Link href={`/properties?society=${encodeURIComponent(society.name)}`}>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-[#029bba]/5 hover:bg-[#029bba]/10 transition-colors cursor-pointer">
                            <span className="text-sm font-semibold text-gray-700">
                              <Home className="w-4 h-4 inline mr-1 text-[#029bba]" />
                              Properties for Sale
                            </span>
                            <span className="font-bold text-[#029bba]">{relatedCounts.properties}+</span>
                          </div>
                        </Link>
                      )}
                      {relatedCounts.projects > 0 && (
                        <Link href={`/projects?city=${encodeURIComponent(society.city)}`}>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-[#029bba]/5 hover:bg-[#029bba]/10 transition-colors cursor-pointer">
                            <span className="text-sm font-semibold text-gray-700">
                              <Building className="w-4 h-4 inline mr-1 text-[#029bba]" />
                              Active Projects
                            </span>
                            <span className="font-bold text-[#029bba]">{relatedCounts.projects}+</span>
                          </div>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-[#fef3c7] text-[#92400e] text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Always verify with official authority before any transaction.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── RELATED SOCIETIES ── */}
        {relatedSocieties.length > 0 && (
          <section className="bg-white py-12 border-t border-gray-200">
            <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Other Societies in {society.city}
                </h2>
                <Link href={`/tools/verify-society?city=${encodeURIComponent(society.city)}`} className="text-sm font-semibold text-[#029bba] hover:underline flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedSocieties.map((r) => {
                  const rRisk = RISK_CONFIG[r.overallRiskLevel] || RISK_CONFIG.caution;
                  return (
                    <Link key={r._id} href={`/tools/verify-society/${r.slug}`}>
                      <div className="bg-white rounded-xl border border-gray-200 hover:border-[#029bba]/30 hover:shadow-md transition-all p-4 cursor-pointer h-full">
                        <div className="relative h-32 bg-gray-100 rounded-lg overflow-hidden mb-3">
                          {r.featuredImage ? (
                            <Image
                              src={r.featuredImage}
                              alt={r.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Building2 className="w-10 h-10 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{r.name}</h3>
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {r.areaName}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${getScoreColor(r.overallScore)}`}>
                            Score: {r.overallScore}/100
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rRisk.bg} ${rRisk.text}`}>
                            {rRisk.label}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        <section className="bg-gradient-to-br from-[#001f2b] to-[#003553] py-12">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
              Need More Intelligence?
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Continue your due diligence with our other property intelligence tools.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/tools/verify-society">
                <button className="px-5 py-3 rounded-xl bg-white text-[#004063] font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Verify Another Society
                </button>
              </Link>
              <Link href="/tools/price-estimator">
                <button className="px-5 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Check Fair Price
                </button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface ScoreBarProps {
  label: string;
  description: string;
  score: number;
}

function ScoreBar({ label, description, score }: ScoreBarProps): React.ReactElement {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold text-gray-900 text-sm">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${getScoreColor(score)}`}>{score}/100</div>
          <div className="text-xs text-gray-500">{getScoreLabel(score)}</div>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${getScoreBg(score)} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

interface InfraItemProps {
  icon: React.ReactElement;
  label: string;
  score: number;
}

function InfraItem({ icon, label, score }: InfraItemProps): React.ReactElement {
  return (
    <div className="text-center p-4 rounded-xl bg-gray-50">
      <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 ${
        score >= 75 ? 'bg-[#10b981]/10 text-[#10b981]' :
        score >= 50 ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
        'bg-gray-200 text-gray-400'
      }`}>
        {icon}
      </div>
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      <div className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function InfoRow({ label, value, highlight }: InfoRowProps): React.ReactElement {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-[#029bba]' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}